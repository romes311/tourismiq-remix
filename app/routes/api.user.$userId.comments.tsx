import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { prisma } from "~/utils/db.server";
import { authenticator } from "~/utils/auth.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[API:Comments:${requestId}] Request received:`, {
    url: request.url,
    method: request.method,
    userId: params.userId,
    headers: Object.fromEntries(request.headers)
  });

  try {
    console.log(`[API:Comments:${requestId}] Authenticating user...`);
    const authenticatedUser = await authenticator.isAuthenticated(request, {
      failureRedirect: "/login",
    });
    console.log(`[API:Comments:${requestId}] User authenticated:`, authenticatedUser.id);

    const { userId } = params;

    if (!userId) {
      console.log(`[API:Comments:${requestId}] Missing user ID`);
      return json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if user exists
    console.log(`[API:Comments:${requestId}] Checking if user exists:`, userId);
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      console.log(`[API:Comments:${requestId}] User not found:`, userId);
      return json({ error: "User not found" }, { status: 404 });
    }

    console.log(`[API:Comments:${requestId}] Fetching comments for user:`, userId);
    const startTime = Date.now();
    const comments = await prisma.comment.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        post: {
          select: {
            id: true,
            content: true,
            category: true,
          },
        },
        user: {
          select: {
            name: true,
            avatar: true,
            organization: true,
          },
        },
      },
    });
    const queryTime = Date.now() - startTime;

    console.log(`[API:Comments:${requestId}] Query completed:`, {
      duration: queryTime + 'ms',
      count: comments.length,
      commentIds: comments.map(c => c.id)
    });

    const transformedComments = comments.map(comment => ({
      ...comment,
      createdAt: comment.createdAt.toISOString()
    }));

    console.log(`[API:Comments:${requestId}] Response ready:`, {
      commentCount: transformedComments.length,
      totalDuration: Date.now() - startTime + 'ms'
    });

    return json({ comments: transformedComments });
  } catch (error) {
    console.error(`[API:Comments:${requestId}] Error:`, {
      error,
      userId: params.userId,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
      context: "Detailed error context for debugging",
      url: request.url,
      headers: Object.fromEntries(request.headers)
    });
    return json({
      error: "An error occurred while fetching comments. Please try again.",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
