import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticator } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  console.log("Dashboard route hit");
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
  console.log("User authenticated in dashboard:", user);
  return json({ user });
}

export default function Dashboard() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Welcome, {user.name}!
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {user.organization
              ? `From ${user.organization}`
              : "Please complete your organization profile"}
          </p>
        </div>
      </div>
    </main>
  );
}
