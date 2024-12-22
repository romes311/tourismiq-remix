import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import {
  Form,
  useLoaderData,
  useFetcher,
  useSearchParams,
} from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import { authenticator } from "~/utils/auth.server";
import { CreatePostForm } from "~/components/CreatePostForm";
import { Post } from "~/components/Post";
import { uploadImage } from "~/utils/upload.server";
import { useState, useEffect } from "react";
import { SidebarNav } from "~/components/SidebarNav";

interface PostWithUser {
  id: string;
  content: string;
  category: string;
  imageUrl: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
    organization: string | null;
  };
  likes: number;
  comments: number;
  shares: number;
}

interface DbPost {
  id: string;
  content: string;
  category: string;
  imageUrl: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    avatar: string | null;
    organization: string | null;
  };
  _count: {
    likes: number;
    comments: number;
  };
}

interface DbConnection {
  id: string;
  name: string;
  organization: string | null;
  avatar: string | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
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
    connections: connections as DbConnection[],
    posts: posts.map(
      (post: DbPost): PostWithUser => ({
        id: post.id,
        content: post.content,
        category: post.category,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt.toISOString(),
        user: {
          id: post.user.id,
          name: post.user.name,
          avatar: post.user.avatar,
          organization: post.user.organization,
        },
        likes: post._count.likes,
        comments: post._count.comments,
        shares: 0,
      })
    ),
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

    if (!categoryValue || typeof categoryValue !== "string") {
      return json({ error: "Valid category is required" }, { status: 400 });
    }

    let imageUrl: string | null = null;
    if (imageFile && imageFile instanceof Blob && imageFile.size > 0) {
      try {
        imageUrl = await uploadImage(imageFile);
      } catch (error) {
        console.error("Failed to save image:", error);
        return json({ error: "Failed to upload image" }, { status: 400 });
      }
    }

    // Create the post with user association
    const post = await prisma.post.create({
      data: {
        content,
        category: categoryValue,
        imageUrl,
        userId: user.id, // Associate the post with the user
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
        id: post.id,
        content: post.content,
        category: post.category,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt.toISOString(),
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
  const { user, posts, connections } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<
    PostCategory | PostCategory[] | null
  >(null);
  const fetcher = useFetcher();

  // Handle category from URL parameters
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      if (categoryParam.includes(",")) {
        // Handle multiple categories (Resources)
        const categories = categoryParam.split(",") as PostCategory[];
        setSelectedCategory(categories);
      } else {
        // Handle single category
        setSelectedCategory(categoryParam as PostCategory);
      }
    } else {
      setSelectedCategory(null);
    }
  }, [searchParams]);

  const filteredPosts = selectedCategory
    ? Array.isArray(selectedCategory)
      ? posts.filter((post) => selectedCategory.includes(post.category))
      : posts.filter((post) => post.category === selectedCategory)
    : posts;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 mt-16">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Sidebar */}
        <aside className="lg:col-span-3">
          <div className="sticky top-24">
            <SidebarNav
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
            />
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-6">
          <CreatePostForm user={user} fetcher={fetcher} />
          <div className="space-y-6">
            {filteredPosts.map((post) => (
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
                shares={post.shares}
                currentUser={user}
              />
            ))}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="lg:col-span-3">
          <div className="sticky top-24 space-y-8">
            <div className="bg-white dark:bg-gray-950 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Connections
                </h3>
                <a
                  href="/members"
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  View All
                </a>
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
                <a href="/privacy" className="hover:text-blue-600">
                  Privacy
                </a>
                <a href="/terms" className="hover:text-blue-600">
                  Terms
                </a>
              </div>
            </footer>
          </div>
        </aside>
      </div>
    </div>
  );
}
