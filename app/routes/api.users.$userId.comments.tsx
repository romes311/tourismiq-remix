import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { prisma } from "~/utils/db.server";
import { authenticator } from "~/utils/auth.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const { userId } = params;

  if (!userId) {
    return json({ error: "User ID is required" }, { status: 400 });
  }

  // Ensure user can only access their own comments
  if (userId !== user.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const comments = await prisma.comment.findMany({
      where: {
        post: {
          userId: userId,
        },
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

    return json({ comments });
  } catch (error) {
    console.error("Failed to fetch user comments:", error);
    return json({ error: "Failed to fetch user comments" }, { status: 500 });
  }
}
