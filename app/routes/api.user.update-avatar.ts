import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";
import { uploadImage } from "~/utils/upload.server";
import { sessionStorage } from "~/utils/session.server";

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  if (!user || !user.id) {
    return json({ error: "User not authenticated" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const avatarFile = formData.get("avatar");

    if (!avatarFile || !(avatarFile instanceof Blob)) {
      return json({ error: "No avatar file provided" }, { status: 400 });
    }

    // Upload the image and get the URL
    const avatarUrl = await uploadImage(avatarFile);

    // Update user with new avatar URL
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { avatar: avatarUrl },
    });

    // Update the session with the new user data
    const session = await sessionStorage.getSession(
      request.headers.get("Cookie")
    );
    session.set(authenticator.sessionKey, updatedUser);

    return json(
      { success: true, user: updatedUser },
      {
        headers: {
          "Set-Cookie": await sessionStorage.commitSession(session),
        },
      }
    );
  } catch (error) {
    console.error("Failed to update avatar:", error);
    return json({ error: "Failed to update avatar" }, { status: 400 });
  }
}
