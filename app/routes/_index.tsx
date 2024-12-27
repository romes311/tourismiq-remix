import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useLocation, useNavigate } from "@remix-run/react";
import { SidebarNav } from "~/components/SidebarNav";
import { SidebarConnections } from "~/components/SidebarConnections";
import { CreatePostForm } from "~/components/CreatePostForm";
import { Feed } from "~/components/Feed";
import { prisma } from "~/utils/db.server";
import { authenticator } from "~/utils/auth.server";
import type { User } from "~/utils/auth.server";
import { PostCategory } from "~/types/post";

const POSTS_PER_PAGE = 15;

interface LoaderData {
  user: User | null;
  error: string | null;
  posts: Array<{
    id: string;
    content: string;
    category: PostCategory;
    imageUrl: string | null;
    timestamp: string;
    upvotes: number;
    comments: number;
    shares: number;
    isUpvoted: boolean;
    author: {
      id: string;
      name: string;
      avatar: string | null;
      organization: string | null;
    };
  }>;
  connections: Array<{
    id: string;
    name: string;
    avatar: string | null;
    organization: string | null;
  }>;
  hasMore: boolean;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  const searchParams = new URL(request.url).searchParams;
  const categoryParam = searchParams.get("category");
  const cursor = searchParams.get("cursor");

  // If it's a paginated request (has cursor), we can cache it longer
  const headers = new Headers({
    "Cache-Control": cursor
      ? "private, max-age=60, stale-while-revalidate=300" // Cache paginated requests for 1 minute, allow stale for 5 minutes
      : "private, max-age=15, stale-while-revalidate=60"  // Cache initial feed for 15 seconds, allow stale for 1 minute
  });

  let categoryFilter = {};
  if (categoryParam) {
    const categories = categoryParam.split(",");
    categoryFilter = {
      category: {
        in: categories,
      },
    };
  }

  // Add cursor-based pagination
  let cursorFilter = {};
  if (cursor) {
    const post = await prisma.post.findUnique({
      where: { id: cursor },
      select: { createdAt: true }
    });
    if (post) {
      cursorFilter = {
        createdAt: {
          lt: post.createdAt
        }
      };
    }
  }

  const [posts, connections] = await Promise.all([
    prisma.post.findMany({
      where: {
        ...categoryFilter,
        ...cursorFilter,
        user: {
          name: {
            not: null
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
      take: POSTS_PER_PAGE + 1,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            organization: true,
          },
        },
        upvotes: user ? {
          where: {
            userId: user.id,
          },
        } : false,
        _count: {
          select: {
            comments: true,
          },
        },
      },
    }) as unknown as Array<{
      id: string;
      content: string;
      category: string;
      imageUrl: string | null;
      createdAt: Date;
      upvoteCount: number;
      user: {
        id: string;
        name: string;
        avatar: string | null;
        organization: string | null;
      };
      upvotes: Array<{ id: string }>;
      _count: {
        comments: number;
      };
    }>,
    user
      ? prisma.user.findMany({
          where: {
            OR: [
              {
                receivedConnections: {
                  some: {
                    senderId: user.id,
                    status: "accepted",
                  },
                },
              },
              {
                sentConnections: {
                  some: {
                    receiverId: user.id,
                    status: "accepted",
                  },
                },
              },
            ],
            name: {
              not: null
            }
          },
          select: {
            id: true,
            name: true,
            avatar: true,
            organization: true,
          },
        }) as Promise<Array<{
          id: string;
          name: string;
          avatar: string | null;
          organization: string | null;
        }>>
      : Promise.resolve([]),
  ]);

  // Check if there are more posts
  const hasMore = posts.length > POSTS_PER_PAGE;
  const postsToReturn = hasMore ? posts.slice(0, -1) : posts;

  return json<LoaderData>(
    {
      user,
      error: null,
      posts: postsToReturn.map((post) => ({
        id: post.id,
        content: post.content,
        category: post.category as PostCategory,
        imageUrl: post.imageUrl,
        timestamp: post.createdAt.toISOString(),
        upvotes: post.upvoteCount,
        comments: post._count.comments,
        shares: 0,
        isUpvoted: post.upvotes?.length > 0,
        author: post.user,
      })),
      connections,
      hasMore,
    },
    {
      headers
    }
  );
}

export default function Index() {
  const { user, posts, connections, hasMore } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const categoryParam = searchParams.get("category");

  // Parse category parameter
  let selectedCategory: PostCategory | PostCategory[] | null = null;
  if (categoryParam) {
    const categories = categoryParam.split(",") as PostCategory[];
    selectedCategory = categories.length === 1 ? categories[0] : categories;
  }

  const handleCategorySelect = (category: PostCategory | PostCategory[] | null) => {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-12 mt-[90px]">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <div className="sticky top-[140px]">
              <SidebarNav
                selectedCategory={selectedCategory}
                onCategorySelect={handleCategorySelect}
              />
            </div>
          </aside>
          <main className="lg:col-span-6 space-y-6">
            {user && <CreatePostForm user={user} />}
            <Feed
              posts={posts}
              currentUser={user}
              selectedCategory={selectedCategory}
              hasMore={hasMore}
            />
          </main>
          <aside className="lg:col-span-3">
            <div className="sticky top-[140px]">
              <SidebarConnections connections={connections} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
