import { json, redirect, type ActionFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/utils/auth.server";
import { db } from "~/utils/db.server";
import { PostCategory } from "@prisma/client";

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const formData = await request.formData();
  const content = formData.get("content");
  const category = formData.get("category");

  if (
    !content ||
    typeof content !== "string" ||
    !category ||
    typeof category !== "string"
  ) {
    return json({ error: "Invalid form submission" }, { status: 400 });
  }

  // Validate category
  const isValidCategory = Object.values(PostCategory).includes(
    category as PostCategory
  );
  if (!isValidCategory) {
    return json({ error: "Invalid category" }, { status: 400 });
  }

  await db.post.create({
    data: {
      content,
      category: category as PostCategory,
      authorId: user.id,
      hashtags: [],
    },
  });

  return redirect("/");
}
