import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher, useLocation } from "@remix-run/react";
import { SidebarNav } from "~/components/SidebarNav";
import { SidebarConnections } from "~/components/SidebarConnections";
import { Feed } from "~/components/Feed";
import { CreatePostForm } from "~/components/CreatePostForm";
import { PostCategory } from "~/types/post";
import type { User } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";
import { authenticator } from "~/utils/auth.server";

interface LoaderData {
  user: User | null;
  posts: Array<{
    id: string;
    content: string;
    category: PostCategory;
    imageUrl: string | null;
    createdAt: string;
    user: {
      id: string;
      name: string;
      avatar: string | null;
      organization: string | null;
    };
    upvotes: number;
    comments: number;
    isUpvoted: boolean;
  }>;
  connections: Array<{
    id: string;
    name: string;
    avatar: string | null;
    organization: string | null;
  }>;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const sessionUser = await authenticator.isAuthenticated(request);
  const url = new URL(request.url);
  const categoryParam = url.searchParams.get("category");

  // Get fresh user data from the database
  const user = sessionUser ? await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      organization: true,
      jobTitle: true,
      linkedIn: true,
      location: true,
    },
  }) : null;

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
          upvotes: true,
          comments: true
        }
      }
    }
  });

  // Get upvote status if user is logged in
  const postsWithUpvotes = await Promise.all(
    posts.map(async (post) => {
      const isUpvoted = user ? await prisma.upvote.findUnique({
        where: {
          postId_userId: {
            postId: post.id,
            userId: user.id
          }
        }
      }) : null;

      return {
        id: post.id,
        content: post.content,
        category: post.category,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt.toISOString(),
        user: post.user,
        upvotes: post._count.upvotes,
        comments: post._count.comments,
        isUpvoted: !!isUpvoted
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

  return json({ user, posts: postsWithUpvotes, connections });
}

export default function Index() {
  const { user, posts, connections } = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const categoryParam = searchParams.get("category");

  // Parse category parameter
  const selectedCategory = categoryParam
    ? categoryParam.includes(",")
      ? categoryParam.split(",") as PostCategory[]
      : categoryParam as PostCategory
    : null;

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

  // Transform posts data to match Feed component props
  const feedPosts = posts.map(post => ({
    id: post.id,
    content: post.content,
    category: post.category,
    imageUrl: post.imageUrl,
    timestamp: post.createdAt,
    author: {
      id: post.user.id,
      name: post.user.name,
      organization: post.user.organization,
      avatar: post.user.avatar,
    },
    upvotes: post.upvotes,
    comments: post.comments,
    shares: 0, // Add default value if not in data
    isUpvoted: post.isUpvoted,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
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
            {user && <CreatePostForm user={user} fetcher={fetcher} />}
            <Feed
              posts={feedPosts}
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
