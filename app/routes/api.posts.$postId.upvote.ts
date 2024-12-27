import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const postId = params.postId;
  if (!postId) {
    return json({ error: "Post ID is required" }, { status: 400 });
  }

  try {
    const { upvoted } = await request.json();

    // Start a transaction to ensure upvote count stays in sync
    const result = await prisma.$transaction(async (tx) => {
      if (upvoted) {
        // Check if upvote already exists
        const existingUpvote = await tx.upvote.findUnique({
          where: {
            postId_userId: {
              postId,
              userId: user.id,
            },
          },
        });

        if (existingUpvote) {
          return null; // Upvote already exists
        }

        // Add upvote and increment count
        await tx.upvote.create({
          data: {
            postId,
            userId: user.id,
          },
        });

        return await tx.post.update({
          where: { id: postId },
          data: {
            upvoteCount: {
              increment: 1,
            },
          },
          select: {
            upvoteCount: true,
          },
        });
      } else {
        // Remove upvote and decrement count
        const upvote = await tx.upvote.deleteMany({
          where: {
            postId,
            userId: user.id,
          },
        });

        if (upvote.count === 0) {
          return null; // Upvote didn't exist
        }

        return await tx.post.update({
          where: { id: postId },
          data: {
            upvoteCount: {
              decrement: 1,
            },
          },
          select: {
            upvoteCount: true,
          },
        });
      }
    });

    if (!result) {
      return json({ error: "Upvote operation failed" }, { status: 400 });
    }

    return json({ success: true, upvotes: result.upvoteCount });
  } catch (error) {
    console.error("Failed to update upvote:", error);
    return json({ error: "Failed to update upvote" }, { status: 500 });
  }
}