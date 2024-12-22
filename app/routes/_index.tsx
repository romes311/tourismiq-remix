import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import { Form, Link, useLoaderData, useFetcher } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import { authenticator } from "~/utils/auth.server";
import { CreatePostForm } from "~/components/CreatePostForm";
import { Post } from "~/components/Post";
import { PostCategory } from "@prisma/client";
import { saveImage } from "~/utils/upload.server";
import { useEffect } from "react";
import {
  unstable_parseMultipartFormData,
  writeAsyncIterableToWritable,
} from "@remix-run/node";

interface OptimisticPost {
  id: string;
  content: string;
  category: PostCategory;
  imageUrl: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
    organization: string;
  };
  likes: number;
  comments: number;
  shares: number;
  isUploading?: boolean;
}

const categories = [
  { name: "All Posts", href: "/" },
  { name: "Events", href: "/?category=events" },
  { name: "Marketing", href: "/?category=marketing" },
  { name: "Research", href: "/?category=research" },
  { name: "Technology", href: "/?category=technology" },
  { name: "Best Practices", href: "/?category=best-practices" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const posts = await prisma.post.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: true,
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
    take: 20, // Limit to 20 most recent posts for performance
  });

  // Get connections (other users) for the right sidebar
  const connections = user
    ? await prisma.user.findMany({
        where: {
          NOT: { id: user.id },
        },
        take: 5,
        select: {
          id: true,
          name: true,
          organization: true,
          avatar: true,
        },
      })
    : [];

  return json({
    user,
    connections,
    posts: posts.map((post) => ({
      id: post.id,
      content: post.content,
      category: post.category,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt,
      user: {
        id: post.user.id,
        name: post.user.name,
        avatar: post.user.avatar,
        organization: post.user.organization,
      },
      likes: post._count.likes,
      comments: post._count.comments,
      shares: 0, // Placeholder for future implementation
    })),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  if (!user || !user.id) {
    return json({ error: "User not authenticated" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const content = formData.get("content");
    const categoryValue = formData.get("category");
    const imageFile = formData.get("image");

    if (!content || typeof content !== "string") {
      return json({ error: "Content is required" }, { status: 400 });
    }

    if (
      !categoryValue ||
      typeof categoryValue !== "string" ||
      !(categoryValue in PostCategory)
    ) {
      return json({ error: "Valid category is required" }, { status: 400 });
    }

    const category = categoryValue as PostCategory;

    let imageUrl: string | null = null;
    if (imageFile && imageFile instanceof Blob && imageFile.size > 0) {
      try {
        imageUrl = await saveImage(imageFile);
      } catch (error) {
        console.error("Failed to save image:", error);
        return json({ error: "Failed to upload image" }, { status: 400 });
      }
    }

    const post = await prisma.post.create({
      data: {
        content,
        category,
        imageUrl,
        userId: user.id,
      },
      include: {
        user: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return json({
      success: true,
      post: {
        ...post,
        user: {
          id: post.user.id,
          name: post.user.name,
          avatar: post.user.avatar,
          organization: post.user.organization,
        },
        likes: post._count.likes,
        comments: post._count.comments,
        shares: 0,
      },
    });
  } catch (error) {
    console.error("Failed to create post:", error);
    return json({ error: "Failed to create post" }, { status: 400 });
  }
}

export default function Index() {
  const { posts, user, connections } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  // Get optimistic posts by combining existing posts with optimistic ones
  const optimisticPosts: OptimisticPost[] = [...posts];
  let cleanupTempImageUrl: (() => void) | undefined;

  if (fetcher.formData) {
    const content = fetcher.formData.get("content");
    const category = fetcher.formData.get("category");
    const imageFile = fetcher.formData.get("image") as File | null;

    // Create temporary URL for image preview
    let tempImageUrl: string | null = null;
    if (imageFile && imageFile.size > 0) {
      tempImageUrl = URL.createObjectURL(imageFile);
      cleanupTempImageUrl = () => URL.revokeObjectURL(tempImageUrl!);
    }

    const optimisticPost: OptimisticPost = {
      id: "optimistic-" + Date.now(),
      content: content as string,
      category: category as PostCategory,
      imageUrl: tempImageUrl,
      createdAt: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar ?? null,
        organization: user.organization ?? "",
      },
      likes: 0,
      comments: 0,
      shares: 0,
      isUploading: Boolean(imageFile),
    };

    optimisticPosts.unshift(optimisticPost);
  }

  useEffect(() => {
    return () => {
      if (cleanupTempImageUrl) {
        cleanupTempImageUrl();
      }
    };
  }, [fetcher.formData]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Sidebar */}
        <aside className="lg:col-span-3">
          <div className="sticky top-8 space-y-8">
            {/* Categories */}
            <nav className="space-y-1">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  to={category.href}
                  className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-md dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {category.name}
                </Link>
              ))}
            </nav>

            {/* Bookmarks */}
            <div>
              <Link
                to="/bookmarks"
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-md dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <svg
                  className="h-5 w-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                Bookmarks
              </Link>
            </div>

            {/* Newsletter */}
            <div className="bg-white dark:bg-gray-950 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Stay Updated
              </h3>
              <Form method="post" action="/newsletter" className="space-y-4">
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Subscribe
                </button>
              </Form>
            </div>

            {/* Footer */}
            <footer className="text-sm text-gray-500 dark:text-gray-400">
              <p>© 2024 TourismIQ. All rights reserved.</p>
              <div className="mt-2 space-x-4">
                <Link to="/privacy" className="hover:text-blue-600">
                  Privacy
                </Link>
                <Link to="/terms" className="hover:text-blue-600">
                  Terms
                </Link>
              </div>
            </footer>
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-6">
          {user && <CreatePostForm user={user} fetcher={fetcher} />}

          <div className="space-y-6">
            {optimisticPosts.map((post) => (
              <Post
                key={post.id}
                id={post.id}
                content={post.content}
                category={post.category}
                imageUrl={post.imageUrl}
                timestamp={post.createdAt}
                author={{
                  name: post.user.name,
                  organization: post.user.organization,
                  avatar: post.user.avatar,
                }}
                upvotes={post.likes}
                comments={post.comments}
                currentUser={user}
              />
            ))}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="lg:col-span-3">
          <div className="sticky top-8 space-y-8">
            <div className="bg-white dark:bg-gray-950 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Connections
                </h3>
                <Link
                  to="/members"
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  View All
                </Link>
              </div>
              {user ? (
                <div className="space-y-4">
                  {connections.map((connection) => (
                    <div
                      key={connection.id}
                      className="flex items-center space-x-3"
                    >
                      <img
                        src={
                          connection.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${connection.name}`
                        }
                        alt={connection.name}
                        className="h-8 w-8 rounded-full"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {connection.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {connection.organization}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Sign in to connect with other DMO professionals
                  </p>
                  <Form action="/auth/google" method="get">
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Sign in with Google
                    </button>
                  </Form>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
