import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  if (!user || !user.id) {
    return json({ error: "User not authenticated" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const jobTitle = formData.get("jobTitle");
    const linkedIn = formData.get("linkedIn");
    const organization = formData.get("organization");
    const location = formData.get("location");

    if (
      !firstName ||
      !lastName ||
      typeof firstName !== "string" ||
      typeof lastName !== "string"
    ) {
      return json(
        { error: "First and last name are required" },
        { status: 400 }
      );
    }

    const data = {
      name: `${firstName} ${lastName}`,
      ...(jobTitle && typeof jobTitle === "string" ? { jobTitle } : {}),
      ...(linkedIn && typeof linkedIn === "string" ? { linkedIn } : {}),
      ...(organization && typeof organization === "string"
        ? { organization }
        : {}),
      ...(location && typeof location === "string" ? { location } : {}),
    };

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    return json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Failed to update user:", error);
    return json({ error: "Failed to update user profile" }, { status: 400 });
  }
}
