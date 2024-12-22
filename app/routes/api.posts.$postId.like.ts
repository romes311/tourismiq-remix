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
    const { liked } = await request.json();

    // Start a transaction to ensure like count stays in sync
    const result = await prisma.$transaction(async (tx) => {
      if (liked) {
        // Check if like already exists
        const existingLike = await tx.like.findUnique({
          where: {
            postId_userId: {
              postId,
              userId: user.id,
            },
          },
        });

        if (existingLike) {
          return null; // Like already exists
        }

        // Add like and increment count
        await tx.like.create({
          data: {
            postId,
            userId: user.id,
          },
        });

        return await tx.post.update({
          where: { id: postId },
          data: {
            likeCount: {
              increment: 1,
            },
          },
          select: {
            likeCount: true,
          },
        });
      } else {
        // Remove like and decrement count
        const like = await tx.like.deleteMany({
          where: {
            postId,
            userId: user.id,
          },
        });

        if (like.count === 0) {
          return null; // Like didn't exist
        }

        return await tx.post.update({
          where: { id: postId },
          data: {
            likeCount: {
              decrement: 1,
            },
          },
          select: {
            likeCount: true,
          },
        });
      }
    });

    if (!result) {
      return json({ error: "Like operation failed" }, { status: 400 });
    }

    return json({ success: true, likes: result.likeCount });
  } catch (error) {
    console.error("Failed to update like:", error);
    return json({ error: "Failed to update like" }, { status: 500 });
  }
}
