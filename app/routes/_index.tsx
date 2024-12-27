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
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  const searchParams = new URL(request.url).searchParams;
  const categoryParam = searchParams.get("category");

  let categoryFilter = {};
  if (categoryParam) {
    const categories = categoryParam.split(",");
    categoryFilter = {
      category: {
        in: categories,
      },
    };
  }

  const [posts, connections] = await Promise.all([
    prisma.post.findMany({
      where: categoryFilter,
      orderBy: {
        createdAt: "desc",
      },
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
    }),
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
          },
          select: {
            id: true,
            name: true,
            avatar: true,
            organization: true,
          },
        })
      : Promise.resolve([]),
  ]);

  return json<LoaderData>({
    user,
    error: null,
    posts: posts.map((post) => ({
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
  });
}

export default function Index() {
  const { user, posts, connections } = useLoaderData<LoaderData>();
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
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 mt-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <div className="sticky top-24">
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
            />
          </main>
          <aside className="lg:col-span-3">
            <div className="sticky top-24">
              <SidebarConnections connections={connections} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
