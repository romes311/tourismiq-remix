import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams, useFetcher, Link } from "@remix-run/react";
import { Input } from "~/components/ui/input";
import { prisma } from "~/utils/db.server";
import { authenticator } from "~/utils/auth.server";
import type { User } from "~/utils/auth.server";
import { SidebarConnections } from "~/components/SidebarConnections";
import { emitNotification } from "~/utils/socket.server";
import { useEffect } from "react";
import { useToast } from "~/hooks/use-toast";
import { Toaster } from "~/components/ui/toaster";

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

interface ActionData {
  error?: string;
  success?: boolean;
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
            status: { not: "rejected" },
          },
          select: {
            id: true,
            status: true,
          },
          take: 1,
        },
        sentConnections: {
          where: {
            receiverId: user.id,
            status: { not: "rejected" },
          },
          select: {
            id: true,
            status: true,
          },
          take: 1,
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
  const membersWithStatus: Member[] = members.map((member) => {
    const receivedConnection = member.receivedConnections[0];
    const sentConnection = member.sentConnections[0];
    let connectionStatus: "pending" | "accepted" | null = null;

    // Only consider non-rejected connections
    if (receivedConnection?.status === "accepted" || sentConnection?.status === "accepted") {
      connectionStatus = "accepted";
    } else if (receivedConnection?.status === "pending" || sentConnection?.status === "pending") {
      connectionStatus = "pending";
    }

    // If the connection exists but is rejected, treat as no connection
    if (
      (receivedConnection?.status === "rejected" && !sentConnection) ||
      (sentConnection?.status === "rejected" && !receivedConnection)
    ) {
      connectionStatus = null;
    }

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
    // Check if connection already exists
    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          {
            AND: [
              { senderId: user.id, receiverId },
              { status: { not: "rejected" } }
            ]
          },
          {
            AND: [
              { senderId: receiverId, receiverId: user.id },
              { status: { not: "rejected" } }
            ]
          }
        ],
      },
    });

    if (existingConnection) {
      return json({ error: "Connection request already exists" }, { status: 400 });
    }

    // Create connection request
    const connection = await prisma.connection.create({
      data: {
        senderId: user.id,
        receiverId,
      },
    });

    // Create notification for receiver
    const notification = await prisma.notification.create({
      data: {
        userId: receiverId,
        type: "connection_request",
        message: `${user.name} sent you a connection request`,
        metadata: { connectionId: connection.id },
      },
    });

    // Emit real-time notification
    emitNotification({
      type: "connection_request",
      userId: receiverId,
      data: {
        id: notification.id,
        message: notification.message,
        metadata: notification.metadata as { connectionId?: string },
      },
    });

    return json({ success: true });
  } catch (error) {
    console.error("[Members Action] Failed to create connection:", error);
    return json({ error: "Failed to create connection" }, { status: 500 });
  }
}

export default function Members() {
  const { members, connections } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher<ActionData>();
  const { toast } = useToast();

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const search = event.target.value;
    if (search) {
      setSearchParams({ search });
    } else {
      setSearchParams({});
    }
  };

  // Show error message if connection request fails
  useEffect(() => {
    if (fetcher.data?.error) {
      toast({
        title: "Error",
        description: fetcher.data.error,
        variant: "destructive",
      });
    }
  }, [fetcher.data, toast]);

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
                  {member.connectionStatus === null && (
                    <fetcher.Form method="post">
                      <input type="hidden" name="receiverId" value={member.id} />
                      <button
                        type="submit"
                        disabled={fetcher.state !== "idle"}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        Connect
                      </button>
                    </fetcher.Form>
                  )}
                  {member.connectionStatus === "pending" && (
                    <span className="text-gray-500 dark:text-gray-400">
                      Request Pending
                    </span>
                  )}
                  {member.connectionStatus === "accepted" && (
                    <span className="text-green-500 dark:text-green-400">
                      Connected
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="lg:col-span-3">
          <div className="sticky top-24">
            <SidebarConnections connections={connections} />
          </div>
        </aside>
      </div>
      <Toaster />
    </div>
  );
}