import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";

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
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  // Ensure user is authenticated
  await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const userId = params.userId;
  if (!userId) {
    return json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const posts = await prisma.$queryRaw<RawPost[]>`
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
        COUNT(DISTINCT up.id) as "upvoteCount"
      FROM "Post" p
      LEFT JOIN "User" u ON p."userId" = u.id
      LEFT JOIN "Comment" c ON c."postId" = p.id
      LEFT JOIN "Upvote" up ON up."postId" = p.id
      WHERE p."userId" = ${userId}
      GROUP BY p.id, u.id
      ORDER BY p."createdAt" DESC
    `;

    // Transform the raw query results to match the expected format
    const transformedPosts = posts.map(post => ({
      id: post.id,
      content: post.content,
      category: post.category,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt,
      user: {
        id: post.userId,
        name: post.userName,
        avatar: post.userAvatar,
        organization: post.userOrganization,
      },
      _count: {
        comments: Number(post.commentCount),
        upvotes: Number(post.upvoteCount),
      },
    }));

    return json({ posts: transformedPosts });
  } catch (error) {
    console.error("Failed to fetch user posts:", error);
    return json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
