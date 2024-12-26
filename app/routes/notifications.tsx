import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import { authenticator } from "~/utils/auth.server";
import { format } from "date-fns";
import { emitNotification } from "~/utils/socket.server";

interface LoaderData {
  notifications: Array<{
    id: string;
    type: string;
    message: string;
    read: boolean;
    createdAt: string;
    metadata: {
      connectionId?: string;
    } | null;
  }>;
  connections: Array<{
    id: string;
    status: string;
    sender: {
      id: string;
      name: string;
      avatar: string | null;
      organization: string | null;
    };
  }>;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/auth/google",
  });

  const [notifications, connections] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.connection.findMany({
      where: {
        receiverId: user.id,
        status: "pending",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            organization: true,
          },
        },
      },
    }),
  ]);

  // Mark all notifications as read
  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      read: false,
    },
    data: {
      read: true,
    },
  });

  return json<LoaderData>({
    notifications,
    connections,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/auth/google",
  });

  const formData = await request.formData();
  const connectionId = formData.get("connectionId");
  const action = formData.get("action");

  if (!connectionId || typeof connectionId !== "string" || !action || typeof action !== "string") {
    return json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      include: { sender: true },
    });

    if (!connection || connection.receiverId !== user.id) {
      return json({ error: "Connection not found" }, { status: 404 });
    }

    if (action === "accept") {
      await prisma.connection.update({
        where: { id: connectionId },
        data: { status: "accepted" },
      });

      // Create notification for sender
      const notification = await prisma.notification.create({
        data: {
          type: "connection_accepted",
          message: `${user.name} accepted your connection request`,
          userId: connection.senderId,
          metadata: { connectionId },
        },
      });

      // Emit real-time notification
      emitNotification({
        type: "connection_accepted",
        userId: connection.senderId,
        data: {
          id: notification.id,
          message: notification.message,
          metadata: notification.metadata,
        },
      });

    } else if (action === "reject") {
      await prisma.connection.update({
        where: { id: connectionId },
        data: { status: "rejected" },
      });
    }

    return json({ success: true });
  } catch (error) {
    console.error("Failed to handle connection request:", error);
    return json({ error: "Failed to handle connection request" }, { status: 500 });
  }
}

export default function Notifications() {
  const { notifications, connections } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 mt-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Notifications</h1>

        {/* Pending Connection Requests */}
        {connections.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Connection Requests</h2>
            <div className="space-y-4">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img
                        src={
                          connection.sender.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${connection.sender.name}`
                        }
                        alt={connection.sender.name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <h3 className="font-semibold">{connection.sender.name}</h3>
                        {connection.sender.organization && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {connection.sender.organization}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <fetcher.Form method="post">
                        <input type="hidden" name="connectionId" value={connection.id} />
                        <input type="hidden" name="action" value="accept" />
                        <button
                          type="submit"
                          disabled={fetcher.state !== "idle"}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          Accept
                        </button>
                      </fetcher.Form>
                      <fetcher.Form method="post">
                        <input type="hidden" name="connectionId" value={connection.id} />
                        <input type="hidden" name="action" value="reject" />
                        <button
                          type="submit"
                          disabled={fetcher.state !== "idle"}
                          className="bg-gray-100 text-gray-600 px-4 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </fetcher.Form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Notifications */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <p className="text-gray-900 dark:text-gray-100">{notification.message}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {format(new Date(notification.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No notifications yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}