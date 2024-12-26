import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useFetcher } from "@remix-run/react";
import { authenticator } from "~/utils/auth.server";
import { SidebarNav } from "~/components/SidebarNav";
import { UserAboutTab } from "~/components/UserAboutTab";
import { useState, useEffect } from "react";
import type { User } from "~/utils/auth.server";
import { ProfileImage } from "~/components/ProfileImage";
import { UserPosts } from "~/components/UserPosts";
import { UserComments } from "~/components/UserComments";
import { prisma } from "~/utils/db.server";
import { emitNotification } from "~/utils/socket.server";
import { useToast } from "~/hooks/use-toast";
import { Toaster } from "~/components/ui/toaster";

type Tab =
  | "about"
  | "posts"
  | "connections"
  | "messages"
  | "comments"
  | "bookmarks"
  | "qa"
  | "score";

interface LoaderData {
  user: User;
  pendingConnections: Array<{
    id: string;
    status: string;
    sender: {
      id: string;
      name: string;
      avatar: string | null;
      organization: string | null;
    };
  }>;
  acceptedConnections: Array<{
    id: string;
    name: string;
    avatar: string | null;
    organization: string | null;
  }>;
}

interface ActionData {
  success?: boolean;
  error?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const [pendingConnections, acceptedConnections] = await Promise.all([
    // Get pending connection requests
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
    // Get accepted connections
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
      select: {
        id: true,
        name: true,
        avatar: true,
        organization: true,
      },
    }),
  ]);

  return json<LoaderData>({ user, pendingConnections, acceptedConnections });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const formData = await request.formData();
  const connectionId = formData.get("connectionId");
  const action = formData.get("action");

  if (!connectionId || typeof connectionId !== "string" || !action || typeof action !== "string") {
    return json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    if (action === "disconnect") {
      // Find both possible connection directions (as sender or receiver)
      const connections = await prisma.connection.findMany({
        where: {
          OR: [
            { senderId: user.id, receiverId: connectionId },
            { senderId: connectionId, receiverId: user.id }
          ],
          status: "accepted"
        }
      });

      if (connections.length === 0) {
        return json({ error: "Connection not found" }, { status: 404 });
      }

      // Delete all matching connections
      await prisma.connection.deleteMany({
        where: {
          OR: [
            { senderId: user.id, receiverId: connectionId },
            { senderId: connectionId, receiverId: user.id }
          ],
          status: "accepted"
        }
      });

      return json({ success: true });
    }

    // Existing accept/reject logic
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

export default function Dashboard() {
  const { user: initialUser, pendingConnections, acceptedConnections } = useLoaderData<typeof loader>();
  const [user, setUser] = useState<User>(initialUser);
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const connectionFetcher = useFetcher<ActionData>();
  const { toast } = useToast();

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  // Handle fetcher states for toasts
  useEffect(() => {
    if (connectionFetcher.state === "idle" && connectionFetcher.data) {
      if (connectionFetcher.data.success) {
        toast({
          variant: "success",
          title: "Success",
          description: "Connection request handled successfully",
        });
      } else if (connectionFetcher.data.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: connectionFetcher.data.error,
        });
      }
    }
  }, [connectionFetcher.state, connectionFetcher.data, toast]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "about", label: "About" },
    { id: "posts", label: "Posts" },
    { id: "connections", label: "Connections" },
    { id: "messages", label: "Messages" },
    { id: "comments", label: "Comments" },
    { id: "bookmarks", label: "Bookmarks" },
    { id: "qa", label: "Q&A" },
    { id: "score", label: "Score" },
  ];

  return (
    <div className="mt-16 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 mt-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Sidebar */}
          <aside className="lg:col-span-3">
            <div className="sticky top-24">
              <SidebarNav isDashboard />
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-9">
            {/* Profile Header */}
            <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <ProfileImage
                      src={
                        user.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`
                      }
                      alt={user.name}
                      className="h-24 w-24 rounded-full ring-4 ring-blue-100 dark:ring-blue-900"
                      isEditing={activeTab === "about"}
                      onImageUpdate={handleUserUpdate}
                    />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                      {user.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-gray-600 dark:text-gray-400">
                        {user.jobTitle}
                        {user.organization && ` at ${user.organization}`}
                      </p>
                      {user.linkedIn && (
                        <Link
                          to={user.linkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600"
                        >
                          <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
              <div className="border-b border-gray-200 dark:border-gray-800">
                <nav className="flex -mb-px">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${
                        activeTab === tab.id
                          ? "border-blue-500 text-blue-600 dark:text-blue-400"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                      } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "about" && (
                  <UserAboutTab
                    user={user}
                    isOwnProfile={true}
                    onUserUpdate={handleUserUpdate}
                  />
                )}
                {activeTab === "posts" && <UserPosts user={user} />}
                {activeTab === "comments" && <UserComments user={user} />}
                {activeTab === "connections" && (
                  <div className="space-y-8">
                    {/* Pending Connections */}
                    {pendingConnections.length > 0 && (
                      <div>
                        <h2 className="text-xl font-semibold mb-4">Pending Connections</h2>
                        <div className="space-y-4">
                          {pendingConnections.map((connection) => (
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
                                  <connectionFetcher.Form method="post">
                                    <input type="hidden" name="connectionId" value={connection.id} />
                                    <input type="hidden" name="action" value="accept" />
                                    <button
                                      type="submit"
                                      disabled={connectionFetcher.state !== "idle"}
                                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                      {connectionFetcher.state !== "idle" ? "Accepting..." : "Accept"}
                                    </button>
                                  </connectionFetcher.Form>
                                  <connectionFetcher.Form method="post">
                                    <input type="hidden" name="connectionId" value={connection.id} />
                                    <input type="hidden" name="action" value="reject" />
                                    <button
                                      type="submit"
                                      disabled={connectionFetcher.state !== "idle"}
                                      className="bg-gray-100 text-gray-600 px-4 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                                    >
                                      {connectionFetcher.state !== "idle" ? "Rejecting..." : "Reject"}
                                    </button>
                                  </connectionFetcher.Form>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Accepted Connections */}
                    <div>
                      <h2 className="text-xl font-semibold mb-4">Connections</h2>
                      {acceptedConnections.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {acceptedConnections.map((connection) => (
                            <div
                              key={connection.id}
                              className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <img
                                    src={
                                      connection.avatar ||
                                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${connection.name}`
                                    }
                                    alt={connection.name}
                                    className="w-12 h-12 rounded-full"
                                  />
                                  <div>
                                    <h3 className="font-semibold">{connection.name}</h3>
                                    {connection.organization && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {connection.organization}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <connectionFetcher.Form method="post">
                                  <input type="hidden" name="connectionId" value={connection.id} />
                                  <input type="hidden" name="action" value="disconnect" />
                                  <button
                                    type="submit"
                                    disabled={connectionFetcher.state !== "idle"}
                                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                                  >
                                    {connectionFetcher.state !== "idle" ? "Disconnecting..." : "Disconnect"}
                                  </button>
                                </connectionFetcher.Form>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                          No connections yet
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
