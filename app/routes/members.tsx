import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import { authenticator } from "~/utils/auth.server";
import { SidebarNav } from "~/components/SidebarNav";
import { SidebarConnections } from "~/components/SidebarConnections";
import type { PostCategory } from "~/types/post";
import { Input } from "~/components/ui/input";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const url = new URL(request.url);
  const category = (url.searchParams.get("category") as PostCategory) || undefined;
  const search = url.searchParams.get("search")?.toLowerCase() || "";

  const [members, connections] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: {
          not: user.id, // Exclude current user
        },
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { organization: { contains: search, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        organization: true,
        jobTitle: true,
        location: true,
        avatar: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    // Get user connections for sidebar
    prisma.user.findMany({
      where: {
        OR: [
          {
            receivedConnections: {
              some: {
                senderId: user.id,
                status: "accepted",
              },
            },
          },
          {
            sentConnections: {
              some: {
                receiverId: user.id,
                status: "accepted",
              },
            },
          },
        ],
      },
      take: 5,
      select: {
        id: true,
        name: true,
        organization: true,
        avatar: true,
      },
    }),
  ]);

  return json({ members, connections, category });
}

export default function Members() {
  const { members, connections, category } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const search = event.target.value;
    if (search) {
      setSearchParams({ ...Object.fromEntries(searchParams), search });
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("search");
      setSearchParams(newParams);
    }
  };

  const handleCategorySelect = (newCategory: PostCategory | PostCategory[] | null) => {
    if (newCategory && !Array.isArray(newCategory)) {
      setSearchParams({ ...Object.fromEntries(searchParams), category: newCategory });
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("category");
      setSearchParams(newParams);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 mt-16">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Sidebar */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-24">
            <SidebarNav
              selectedCategory={category}
              onCategorySelect={handleCategorySelect}
            />
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Members Directory
            </h1>
            <div className="w-64">
              <Input
                type="search"
                placeholder="Search members..."
                value={searchParams.get("search") || ""}
                onChange={handleSearch}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-white dark:bg-gray-950 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col items-center text-center"
              >
                <img
                  src={
                    member.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`
                  }
                  alt={member.name}
                  className="h-24 w-24 rounded-full mb-4"
                />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {member.name}
                </h2>
                {member.jobTitle && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {member.jobTitle}
                  </p>
                )}
                {member.organization && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {member.organization}
                  </p>
                )}
                {member.location && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    {member.location}
                  </p>
                )}
                <div className="flex gap-3 mt-4">
                  <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Connect
                  </button>
                  <Link
                    to={`/profile/${member.id}`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-24">
            <SidebarConnections connections={connections} />
          </div>
        </aside>
      </div>
    </div>
  );
}