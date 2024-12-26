import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { prisma } from "~/utils/db.server";
import { authenticator } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/auth/google",
  });

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return json({ notifications });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/auth/google",
  });

  const formData = await request.formData();
  const action = formData.get("action");

  if (!action) {
    return json({ error: "Missing action parameter" }, { status: 400 });
  }

  if (action === "clear") {
    await prisma.notification.deleteMany({
      where: {
        userId: user.id,
      },
    });
    return json({ success: true });
  }

  return json({ error: `Invalid action: ${action}` }, { status: 400 });
}