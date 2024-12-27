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
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[API:Posts:${requestId}] Request received:`, {
    url: request.url,
    method: request.method,
    userId: params.userId,
    headers: Object.fromEntries(request.headers)
  });

  try {
    // Ensure user is authenticated
    console.log(`[API:Posts:${requestId}] Authenticating user...`);
    const authenticatedUser = await authenticator.isAuthenticated(request, {
      failureRedirect: "/login",
    });
    console.log(`[API:Posts:${requestId}] User authenticated:`, authenticatedUser.id);

    const userId = params.userId;
    if (!userId) {
      console.log(`[API:Posts:${requestId}] Missing user ID`);
      return json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if user exists
    console.log(`[API:Posts:${requestId}] Checking if user exists:`, userId);
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      console.log(`[API:Posts:${requestId}] User not found:`, userId);
      return json({ error: "User not found" }, { status: 404 });
    }

    console.log(`[API:Posts:${requestId}] Fetching posts for user:`, userId);
    const startTime = Date.now();
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
    const queryTime = Date.now() - startTime;

    console.log(`[API:Posts:${requestId}] Query completed:`, {
      duration: queryTime + 'ms',
      count: posts.length,
      postIds: posts.map(p => p.id)
    });

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

    console.log(`[API:Posts:${requestId}] Response ready:`, {
      postCount: transformedPosts.length,
      totalDuration: Date.now() - startTime + 'ms'
    });

    return json({ posts: transformedPosts });
  } catch (error) {
    console.error(`[API:Posts:${requestId}] Error:`, {
      error,
      userId: params.userId,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
      context: "Detailed error context for debugging",
      url: request.url,
      headers: Object.fromEntries(request.headers)
    });
    return json({
      error: "An error occurred while fetching posts. Please try again.",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
