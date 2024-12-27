import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";
import type { User } from "~/utils/auth.server";
import type { PostCategory } from "~/types/post";
import { Post } from "~/components/Post";
import { SidebarNav } from "~/components/SidebarNav";
import { SidebarConnections } from "~/components/SidebarConnections";

interface RawPost {
  id: string;
  content: string;
  category: string;
  imageUrl: string | null;
  createdAt: Date;
  userId: string;
  userName: string;
  userAvatar: string | null;
  userOrganization: string | null;
  commentCount: string;
  upvoteCount: string;
  hasUpvoted: boolean;
}

interface LoaderData {
  post: {
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
    shares: number;
    isUpvoted: boolean;
  };
  currentUser: User | null;
  connections: Array<{
    id: string;
    name: string;
    organization: string | null;
    avatar: string | null;
  }>;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  const postId = params.postId;

  if (!postId) {
    throw new Error("Post ID is required");
  }

  const [posts, connections] = await Promise.all([
    prisma.$queryRaw<RawPost[]>`
      SELECT
        p.id,
        p.content,
        p.category,
        p."imageUrl",
        p."createdAt",
        u.id as "userId",
        u.name as "userName",
        u.avatar as "userAvatar",
        u.organization as "userOrganization",
        COUNT(DISTINCT c.id) as "commentCount",
        COUNT(DISTINCT up.id) as "upvoteCount",
        EXISTS (
          SELECT 1 FROM "Upvote" uv
          WHERE uv."postId" = p.id
          AND uv."userId" = ${user?.id || null}
        ) as "hasUpvoted"
      FROM "Post" p
      LEFT JOIN "User" u ON p."userId" = u.id
      LEFT JOIN "Comment" c ON c."postId" = p.id
      LEFT JOIN "Upvote" up ON up."postId" = p.id
      WHERE p.id = ${postId}
      GROUP BY p.id, u.id
    `,
    user ? prisma.user.findMany({
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
    }) : Promise.resolve([])
  ]);

  if (!posts.length) {
    throw new Error("Post not found");
  }

  const post = posts[0];

  return json<LoaderData>({
    currentUser: user,
    post: {
      id: post.id,
      content: post.content,
      category: post.category as PostCategory,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt.toISOString(),
      user: {
        id: post.userId,
        name: post.userName,
        avatar: post.userAvatar,
        organization: post.userOrganization,
      },
      upvotes: Number(post.upvoteCount),
      comments: Number(post.commentCount),
      shares: 0,
      isUpvoted: post.hasUpvoted,
    },
    connections
  });
}

export default function PostPage() {
  const { post, currentUser, connections } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

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
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-12 mt-[90px]">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Sidebar */}
        <aside className="lg:col-span-3">
          <div className="sticky top-[140px] w-full max-w-[260px]">
            <SidebarNav
              selectedCategory={post.category}
              onCategorySelect={handleCategorySelect}
            />
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-6">
          <Post
            id={post.id}
            content={post.content}
            category={post.category}
            imageUrl={post.imageUrl}
            timestamp={post.createdAt}
            author={post.user}
            upvotes={post.upvotes}
            comments={post.comments}
            shares={post.shares}
            currentUser={currentUser}
            isUpvoted={post.isUpvoted}
            expandComments={true}
          />
        </main>

        {/* Right Sidebar */}
        <aside className="lg:col-span-3">
          <SidebarConnections connections={connections} isLoggedIn={!!currentUser} />
        </aside>
      </div>
    </div>
  );
}