import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import {
  useLoaderData,
  useFetcher,
  useSearchParams,
  useNavigate,
} from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import { authenticator } from "~/utils/auth.server";
import { CreatePostForm } from "~/components/CreatePostForm";
import { Post } from "~/components/Post";
import { uploadImage } from "~/utils/upload.server";
import { useState, useEffect } from "react";
import { SidebarNav } from "~/components/SidebarNav";
import { PostCategory } from "~/types/post";
import { SidebarConnections } from "~/components/SidebarConnections";


export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  const url = new URL(request.url);
  const categoryParam = url.searchParams.get("category");

  // Parse category parameter
  const categories = categoryParam
    ? categoryParam.includes(",")
      ? categoryParam.split(",") as PostCategory[]
      : [categoryParam as PostCategory]
    : null;

  // Get basic post data first
  const posts = await prisma.post.findMany({
    where: categories ? {
      category: {
        in: categories
      }
    } : undefined,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
          organization: true,
        }
      },
      _count: {
        select: {
          upvotes: true
        }
      }
    }
  });

  // Get comment counts and upvote status in parallel
  const postsWithCounts = await Promise.all(
    posts.map(async (post) => {
      const [commentCount, hasUpvoted] = await Promise.all([
        prisma.comment.count({
          where: { postId: post.id }
        }),
        user ? prisma.upvote.findUnique({
          where: {
            postId_userId: {
              postId: post.id,
              userId: user.id
            }
          }
        }) : Promise.resolve(null)
      ]);

      return {
        id: post.id,
        content: post.content,
        category: post.category,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt,
        user: post.user,
        upvoteCount: post._count.upvotes,
        comments: commentCount,
        isUpvoted: !!hasUpvoted
      };
    })
  );

  // Get user connections if logged in
  const connections = user ? await prisma.user.findMany({
    where: {
      OR: [
        {
          receivedConnections: {
            some: {
              senderId: user.id,
              status: "pending"
            }
          }
        },
        {
          sentConnections: {
            some: {
              receiverId: user.id,
              status: "pending"
            }
          }
        }
      ]
    },
    select: {
      id: true,
      name: true,
      organization: true,
      avatar: true
    }
  }) : [];

  return json({
    user,
    posts: postsWithCounts.map(post => ({
      id: post.id,
      content: post.content,
      category: post.category as PostCategory,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt.toISOString(),
      user: post.user,
      upvotes: post.upvoteCount,
      comments: post.comments,
      shares: 0,
      isUpvoted: post.isUpvoted
    })),
    connections
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
        category: categoryValue as PostCategory,
        imageUrl,
        userId: user.id,
      },
      include: {
        user: true,
        _count: {
          select: {
            comments: true,
            upvotes: true,
          },
        },
      },
    });

    return json({
      success: true,
      post: {
        id: post.id,
        content: post.content,
        category: post.category as PostCategory,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt.toISOString(),
        user: {
          id: post.user.id,
          name: post.user.name,
          avatar: post.user.avatar,
          organization: post.user.organization,
        },
        upvotes: post._count.upvotes,
        comments: post._count.comments,
        shares: 0,
        isUpvoted: false,
      },
    });
  } catch (error) {
    console.error("Failed to create post:", error);
    return json({ error: "Failed to create post" }, { status: 400 });
  }
}

function getFeedTitle(category: PostCategory | PostCategory[] | undefined): string {
  if (!category) return "The Latest";

  if (Array.isArray(category)) {
    return "Resources";
  }

  switch (category) {
    case PostCategory.THOUGHT_LEADERSHIP:
      return "Thought Leadership";
    case PostCategory.NEWS:
      return "News";
    case PostCategory.EVENTS:
      return "Events";
    default:
      return category.split("_").map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(" ");
  }
}

export default function Index() {
  const { user, posts, connections } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | PostCategory[] | undefined>(undefined);
  const fetcher = useFetcher();
  const navigate = useNavigate();

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
      setSelectedCategory(undefined);
    }
  }, [searchParams]);

  const handleCategorySelect = (category: PostCategory | PostCategory[] | null) => {
    setSelectedCategory(category || undefined);
    if (category) {
      const categoryParam = Array.isArray(category)
        ? category.join(",")
        : category;
      navigate(`/?category=${categoryParam}`);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 mt-16">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Sidebar */}
        <aside className="lg:col-span-3">
          <div className="sticky top-24 w-full max-w-[260px]">
            <SidebarNav
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
            />
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-6">
          {user && <CreatePostForm user={user} fetcher={fetcher} />}
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 mt-8">
            {getFeedTitle(selectedCategory)}
          </h1>
          <div className="space-y-6">
            {posts.map((post) => (
              <Post
                key={post.id}
                id={post.id}
                content={post.content}
                category={post.category}
                imageUrl={post.imageUrl}
                timestamp={post.createdAt}
                author={{
                  id: post.user.id,
                  name: post.user.name,
                  organization: post.user.organization,
                  avatar: post.user.avatar,
                }}
                upvotes={post.upvotes}
                comments={post.comments}
                shares={post.shares}
                currentUser={user}
                isUpvoted={post.isUpvoted}
              />
            ))}
            {posts.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  No posts found in this category
                </p>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="lg:col-span-3">
          <SidebarConnections connections={connections} />
        </aside>
      </div>
    </div>
  );
}
