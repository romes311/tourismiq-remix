import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { prisma } from "~/utils/db.server";
import { authenticator } from "~/utils/auth.server";

export async function loader({ params }: LoaderFunctionArgs) {
  const { postId } = params;

  if (!postId) {
    return json({ error: "Post ID is required" }, { status: 400 });
  }

  try {
    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            avatar: true,
            organization: true,
          },
        },
      },
    });

    return json({ comments });
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    return json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const { postId } = params;

  if (!postId) {
    return json({ error: "Post ID is required" }, { status: 400 });
  }

  // Handle POST request to create a comment
  if (request.method === "POST") {
    try {
      const formData = await request.formData();
      const content = formData.get("content");

      if (!content || typeof content !== "string") {
        return json({ error: "Content is required" }, { status: 400 });
      }

      // Create the comment
      const comment = await prisma.comment.create({
        data: {
          content,
          postId,
          userId: user.id,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              avatar: true,
              organization: true,
            },
          },
        },
      });

      return json({ comment });
    } catch (error) {
      console.error("Failed to create comment:", error);
      return json({ error: "Failed to create comment" }, { status: 500 });
    }
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
