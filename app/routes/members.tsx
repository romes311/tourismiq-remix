import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams, useFetcher, Link } from "@remix-run/react";
import { Input } from "~/components/ui/input";
import { prisma } from "~/utils/db.server";
import { authenticator } from "~/utils/auth.server";
import type { User } from "~/utils/auth.server";
import { SidebarConnections } from "~/components/SidebarConnections";

interface Member {
  id: string;
  name: string;
  avatar: string | null;
  organization: string | null;
  connectionStatus: "pending" | "accepted" | null;
}

interface LoaderData {
  user: User;
  members: Member[];
  connections: Array<{
    id: string;
    name: string;
    organization: string | null;
    avatar: string | null;
  }>;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/auth/google",
  });

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.toLowerCase() || "";

  const [members, connections] = await Promise.all([
    // Get all members except the current user
    prisma.user.findMany({
      where: {
        id: { not: user.id },
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { organization: { contains: search, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        organization: true,
        receivedConnections: {
          where: {
            senderId: user.id,
          },
          select: {
            status: true,
          },
        },
        sentConnections: {
          where: {
            receiverId: user.id,
          },
          select: {
            status: true,
          },
        },
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

  // Transform the data to include connection status
  const membersWithStatus = members.map((member) => {
    const receivedConnection = member.receivedConnections[0];
    const sentConnection = member.sentConnections[0];
    const connectionStatus = receivedConnection?.status || sentConnection?.status || null;

    return {
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      organization: member.organization,
      connectionStatus,
    };
  });

  return json<LoaderData>({ user, members: membersWithStatus, connections });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/auth/google",
  });

  const formData = await request.formData();
  const receiverId = formData.get("receiverId")?.toString();

  if (!receiverId) {
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
        userId: receiverId,
        type: "connection_request",
        message: `${user.name} sent you a connection request`,
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
  const { user, members, connections } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher();

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const search = event.target.value;
    if (search) {
      setSearchParams({ search });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 mt-16">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Main Content */}
        <main className="lg:col-span-9">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Members</h1>
            <div className="w-64">
              <Input
                type="search"
                placeholder="Search members..."
                value={searchParams.get("search") || ""}
                onChange={handleSearch}
              />
            </div>
          </div>

          <div className="grid gap-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <Link
                    to={`/profile/${member.id}`}
                    className="flex items-center space-x-4 hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={
                        member.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`
                      }
                      alt={member.name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <h3 className="font-semibold">{member.name}</h3>
                      {member.organization && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {member.organization}
                        </p>
                      )}
                    </div>
                  </Link>
                  <fetcher.Form method="post">
                    <input type="hidden" name="receiverId" value={member.id} />
                    <button
                      type="submit"
                      disabled={
                        fetcher.state !== "idle" ||
                        member.connectionStatus === "pending" ||
                        member.connectionStatus === "accepted"
                      }
                      className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        member.connectionStatus === "accepted"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : member.connectionStatus === "pending"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                          : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                      }`}
                    >
                      {member.connectionStatus === "accepted"
                        ? "Connected"
                        : member.connectionStatus === "pending"
                        ? "Pending"
                        : fetcher.state !== "idle"
                        ? "Connecting..."
                        : "Connect"}
                    </button>
                  </fetcher.Form>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="lg:col-span-3">
          <SidebarConnections user={user} connections={connections} />
        </aside>
      </div>
    </div>
  );
}