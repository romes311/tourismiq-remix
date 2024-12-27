import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";
import { PostCategory } from "~/types/post";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Number(url.searchParams.get("limit")) || 15;
  const category = url.searchParams.get("category");

  const whereClause: {
    user: {
      name: {
        not: null;
      };
    };
    category?: {
      in: string[];
    };
    createdAt?: {
      lt: Date;
    };
  } = {
    user: {
      name: {
        not: null
      }
    }
  };

  if (category) {
    whereClause.category = {
      in: category.split(",")
    };
  }

  if (cursor) {
    const post = await prisma.post.findUnique({
      where: { id: cursor },
      select: { createdAt: true }
    });
    if (post) {
      whereClause.createdAt = {
        lt: post.createdAt
      };
    }
  }

  const posts = await prisma.post.findMany({
    where: whereClause,
    take: limit + 1,
    orderBy: {
      createdAt: "desc"
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
          organization: true,
        },
      },
      upvotes: user ? {
        where: {
          userId: user.id,
        },
      } : false,
      _count: {
        select: {
          comments: true,
        },
      },
    },
  });

  const hasMore = posts.length > limit;
  const postsToReturn = hasMore ? posts.slice(0, -1) : posts;

  return json({
    posts: postsToReturn.map(post => ({
      id: post.id,
      content: post.content,
      category: post.category as PostCategory,
      imageUrl: post.imageUrl,
      timestamp: post.createdAt.toISOString(),
      upvotes: post.upvoteCount,
      comments: post._count.comments,
      shares: 0,
      isUpvoted: post.upvotes?.length > 0,
      author: post.user,
    })),
    hasMore
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const formData = await request.formData();
  const content = formData.get("content");
  const category = formData.get("category");
  const imageUrl = formData.get("imageUrl");

  if (!content || typeof content !== "string") {
    return json({ error: "Content is required" }, { status: 400 });
  }

  if (!category || typeof category !== "string" || !Object.values(PostCategory).includes(category as PostCategory)) {
    return json({ error: "Valid category is required" }, { status: 400 });
  }

  try {
    const post = await prisma.post.create({
      data: {
        content,
        category: category as PostCategory,
        imageUrl: typeof imageUrl === "string" ? imageUrl : null,
        userId: user.id,
      },
      include: {
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
            comments: true,
          },
        },
      },
    });

    return json({
      id: post.id,
      content: post.content,
      category: post.category,
      imageUrl: post.imageUrl,
      timestamp: post.createdAt.toISOString(),
      upvotes: 0,
      comments: post._count.comments,
      shares: 0,
      isUpvoted: false,
      author: post.user,
    });
  } catch (error) {
    console.error("Failed to create post:", error);
    return json({ error: "Failed to create post" }, { status: 500 });
  }
}