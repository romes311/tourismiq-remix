import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams, Form, useFetcher } from "@remix-run/react";
import { Input } from "~/components/ui/input";
import { prisma } from "~/utils/db.server";
import { authenticator } from "~/utils/auth.server";
import { SidebarNav } from "~/components/SidebarNav";

interface LoaderData {
  members: Array<{
    id: string;
    name: string;
    avatar: string | null;
    organization: string | null;
    jobTitle: string | null;
    location: string | null;
    connectionStatus?: {
      status: string;
      id: string;
    } | null;
  }>;
  connections: Array<{
    id: string;
    name: string;
    organization: string | null;
    avatar: string | null;
  }>;
  user: Awaited<ReturnType<typeof authenticator.isAuthenticated>>;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/auth/google",
  });

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.toLowerCase() || "";

  const members = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { organization: { contains: search, mode: "insensitive" } },
        { jobTitle: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ],
      NOT: { id: user?.id },
    },
    select: {
      id: true,
      name: true,
      avatar: true,
      organization: true,
      jobTitle: true,
      location: true,
      receivedConnections: {
        where: { senderId: user?.id },
        select: { id: true, status: true },
      },
      sentConnections: {
        where: { receiverId: user?.id },
        select: { id: true, status: true },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Get user connections for right sidebar
  const connections = await prisma.user.findMany({
    where: {
      OR: [
        {
          receivedConnections: {
            some: {
              senderId: user?.id,
              status: "accepted",
            },
          },
        },
        {
          sentConnections: {
            some: {
              receiverId: user?.id,
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
  });

  return json<LoaderData>({
    members: members.map((member) => ({
      ...member,
      connectionStatus: member.receivedConnections[0] || member.sentConnections[0],
    })),
    connections,
    user,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/auth/google",
  });

  const formData = await request.formData();
  const receiverId = formData.get("receiverId");

  if (!receiverId || typeof receiverId !== "string") {
    return json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    // Create connection request
    const connection = await prisma.connection.create({
      data: {
        senderId: user.id,
        receiverId,
      },
    });

    // Create notification for receiver
    await prisma.notification.create({
      data: {
        type: "connection_request",
        message: `${user.name} sent you a connection request`,
        userId: receiverId,
        metadata: { connectionId: connection.id },
      },
    });

    return json({ success: true });
  } catch (error) {
    console.error("Failed to create connection:", error);
    return json({ error: "Failed to create connection" }, { status: 500 });
  }
}

export default function Members() {
  const { members, connections, user } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") || "";

  const connectionFetcher = useFetcher();

  function getConnectionButton(member: LoaderData["members"][0]) {
    if (!member.connectionStatus) {
      return (
        <connectionFetcher.Form method="post" className="mt-4">
          <input type="hidden" name="receiverId" value={member.id} />
          <button
            type="submit"
            disabled={connectionFetcher.state !== "idle"}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {connectionFetcher.state !== "idle" ? "Sending..." : "Add Connection"}
          </button>
        </connectionFetcher.Form>
      );
    }

    switch (member.connectionStatus.status) {
      case "pending":
        return (
          <button
            disabled
            className="mt-4 bg-gray-100 text-gray-600 px-4 py-2 rounded-md cursor-not-allowed"
          >
            Pending
          </button>
        );
      case "accepted":
        return (
          <button
            disabled
            className="mt-4 bg-green-100 text-green-600 px-4 py-2 rounded-md cursor-not-allowed"
          >
            Connected
          </button>
        );
      default:
        return null;
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 mt-16">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Sidebar */}
        <aside className="lg:col-span-3">
          <div className="sticky top-24 w-full max-w-[260px]">
            <SidebarNav selectedCategory={null} onCategorySelect={() => {}} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Members Directory</h1>
            <Input
              type="search"
              placeholder="Search members by name, organization, job title, or location..."
              className="max-w-xl"
              value={search}
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  setSearchParams({ search: value });
                } else {
                  setSearchParams({});
                }
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center"
              >
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-24 h-24 rounded-full object-cover mb-4"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
                    <span className="text-4xl text-gray-500 dark:text-gray-400">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">{member.name}</h3>
                  {member.jobTitle && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {member.jobTitle}
                    </p>
                  )}
                </div>

                <div className="mt-4 space-y-1">
                  {member.organization && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      🏢 {member.organization}
                    </p>
                  )}
                  {member.location && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      📍 {member.location}
                    </p>
                  )}
                </div>
                {getConnectionButton(member)}
              </div>
            ))}
          </div>

          {members.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No members found matching your search criteria.
              </p>
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="lg:col-span-3">
          <div className="sticky top-24">
            <div className="bg-white dark:bg-gray-950 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Connections
                </h3>
              </div>
              {user ? (
                <div className="space-y-4">
                  {connections.map((connection) => (
                    <div
                      key={connection.id}
                      className="flex items-center space-x-3"
                    >
                      <img
                        src={
                          connection.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${connection.name}`
                        }
                        alt={connection.name}
                        className="h-8 w-8 rounded-full"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {connection.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {connection.organization}
                        </p>
                      </div>
                    </div>
                  ))}
                  {connections.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      You haven't connected with any members yet.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center p-4 space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Sign in to connect with other DMO professionals
                  </p>
                  <Form action="/auth/google" method="get">
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Sign in with Google
                    </button>
                  </Form>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}