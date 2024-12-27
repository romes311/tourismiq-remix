import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import { authenticator } from "~/utils/auth.server";
import { SidebarNav } from "~/components/SidebarNav";
import { SidebarConnections } from "~/components/SidebarConnections";
import type { PostCategory } from "~/types/post";
import { Input } from "~/components/ui/input";
import { MemberCard } from "~/components/MemberCard";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search");
  const category = url.searchParams.get("category") as PostCategory | null;

  const user = await authenticator.isAuthenticated(request);

  // Get all members except the current user
  const members = await prisma.user.findMany({
    where: {
      id: { not: user?.id },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { jobTitle: { contains: search, mode: "insensitive" } },
              { organization: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      jobTitle: true,
      organization: true,
      location: true,
      linkedIn: true,
      receivedConnections: {
        select: {
          id: true,
          status: true,
          senderId: true,
          receiverId: true,
        },
        where: {
          senderId: user?.id,
        },
      },
      sentConnections: {
        select: {
          id: true,
          status: true,
          senderId: true,
          receiverId: true,
        },
        where: {
          receiverId: user?.id,
        },
      },
    },
  });

  // Get user's connections if logged in
  const connections = user
    ? await prisma.connection.findMany({
        where: {
          OR: [
            { senderId: user.id, status: "accepted" },
            { receiverId: user.id, status: "accepted" },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
              jobTitle: true,
              organization: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              avatar: true,
              jobTitle: true,
              organization: true,
            },
          },
        },
      })
    : [];

  // Transform connections data for the sidebar
  const transformedConnections = connections.map((conn) =>
    conn.senderId === user?.id ? conn.receiver : conn.sender
  );

  return json({
    members,
    connections: transformedConnections,
    category,
    user,
  });
}

export default function Members() {
  const { members, connections, category, user } = useLoaderData<typeof loader>();
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
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-12 mt-[90px]">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Sidebar */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-[140px]">
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
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-[140px]">
            <SidebarConnections connections={connections} isLoggedIn={!!user} />
          </div>
        </aside>
      </div>
    </div>
  );
}