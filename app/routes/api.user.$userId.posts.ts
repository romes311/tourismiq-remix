import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const userId = params.userId;
  if (!userId) {
    return json({ error: "User ID is required" }, { status: 400 });
  }

  if (user.id !== userId) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const posts = await prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        category: true,
        imageUrl: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            organization: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return json({ posts });
  } catch (error) {
    console.error("Failed to fetch user posts:", error);
    return json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
