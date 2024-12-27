import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  try {
    const count = await prisma.notification.count({
      where: {
        userId: user.id,
        read: false,
      },
    });

    return json({ count });
  } catch (error) {
    console.error("Failed to fetch unread notifications count:", error);
    return json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}