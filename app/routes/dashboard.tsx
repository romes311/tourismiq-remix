import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import { useState, useEffect } from "react";
import { authenticator } from "~/utils/auth.server";
import type { User } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";
import { emitNotification } from "~/utils/socket.server";
import { useToast } from "~/hooks/use-toast";
import { SidebarNav } from "~/components/SidebarNav";
import { UserAboutTab } from "~/components/UserAboutTab";
import { UserPosts } from "~/components/UserPosts";
import { UserComments } from "~/components/UserComments";
import { ProfileImage } from "~/components/ProfileImage";
import { Toaster } from "~/components/ui";
import type { PostCategory } from "~/types/post";

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
    connectionId: string;
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
    prisma.connection.findMany({
      where: {
        OR: [
          {
            senderId: user.id,
            status: "accepted",
          },
          {
            receiverId: user.id,
            status: "accepted",
          },
        ],
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
        receiver: {
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

  // Transform accepted connections to include the correct user info
  const transformedAcceptedConnections = acceptedConnections.map((connection) => {
    const otherUser = connection.senderId === user.id ? connection.receiver : connection.sender;
    return {
      ...otherUser,
      connectionId: connection.id,
    };
  });

  return json<LoaderData>({
    user,
    pendingConnections,
    acceptedConnections: transformedAcceptedConnections
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const formData = await request.formData();
  const connectionId = formData.get("connectionId")?.toString();
  const action = formData.get("action")?.toString();

  console.log("[Dashboard Action] Received request:", {
    userId: user.id,
    connectionId,
    action,
    formData: Object.fromEntries(formData),
  });

  if (!connectionId || !action) {
    console.log("[Dashboard Action] Invalid request: missing connectionId or action");
    return json<ActionData>({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      include: { sender: true, receiver: true },
    });

    console.log("[Dashboard Action] Found connection:", connection);

    if (!connection) {
      console.log("[Dashboard Action] Connection not found:", { connectionId });
      return json<ActionData>({ error: "Connection not found" }, { status: 404 });
    }

    // For accept/reject actions, only the receiver can perform them
    if (action === "accept" || action === "reject") {
      if (connection.receiverId !== user.id) {
        console.log("[Dashboard Action] Not authorized:", {
          userId: user.id,
          receiverId: connection.receiverId,
          action,
        });
        return json<ActionData>(
          { error: "Not authorized to perform this action" },
          { status: 403 }
        );
      }
    }

    // For disconnect action, either user can perform it
    if (action === "disconnect") {
      if (connection && connection.senderId !== user.id && connection.receiverId !== user.id) {
        console.log("[Dashboard Action] Not authorized to disconnect:", {
          userId: user.id,
          senderId: connection.senderId,
          receiverId: connection.receiverId,
        });
        return json<ActionData>(
          { error: "Not authorized to perform this action" },
          { status: 403 }
        );
      }

      try {
        await prisma.connection.delete({
          where: { id: connectionId },
        });

        console.log("[Dashboard Action] Deleted connection:", { connectionId });
        return json<ActionData>({ success: true });
      } catch (error) {
        // If the connection doesn't exist, consider it a success since that's the desired end state
        if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
          console.log("[Dashboard Action] Connection already deleted:", { connectionId });
          return json<ActionData>({ success: true });
        }
        throw error; // Re-throw other errors to be caught by the outer try-catch
      }
    }

    if (action === "accept") {
      const updatedConnection = await prisma.connection.update({
        where: { id: connectionId },
        data: { status: "accepted" },
      });

      console.log("[Dashboard Action] Updated connection:", updatedConnection);

      // Create notification for the sender
      const notification = await prisma.notification.create({
        data: {
          userId: connection.senderId,
          type: "connection_accepted",
          message: `${user.name} accepted your connection request`,
          metadata: { connectionId },
        },
      });

      console.log("[Dashboard Action] Created notification:", notification);

      // Emit real-time notification
      emitNotification({
        type: "connection_accepted",
        userId: connection.senderId,
        data: {
          id: notification.id,
          message: notification.message,
          metadata: notification.metadata as { connectionId?: string },
        },
      });

      console.log("[Dashboard Action] Emitted notification");

      return json<ActionData>({ success: true });
    } else if (action === "reject") {
      const updatedConnection = await prisma.connection.update({
        where: { id: connectionId },
        data: { status: "rejected" },
      });

      console.log("[Dashboard Action] Rejected connection:", updatedConnection);
      return json<ActionData>({ success: true });
    }

    console.log("[Dashboard Action] Invalid action:", { action });
    return json<ActionData>({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Dashboard Action] Error handling connection request:", error);
    return json<ActionData>(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

export default function Dashboard() {
  const { user: initialUser, pendingConnections, acceptedConnections } = useLoaderData<typeof loader>();
  const [user, setUser] = useState<User>(initialUser);
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const connectionFetcher = useFetcher<ActionData>();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleCategorySelect = (category: PostCategory | PostCategory[] | null) => {
    if (category) {
      const categoryParam = Array.isArray(category)
        ? category.join(",")
        : category;
      navigate(`/?category=${categoryParam}`);
    } else {
      navigate("/");
    }
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-12 mt-[90px]">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Sidebar */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-[140px]">
              <SidebarNav
                onCategorySelect={handleCategorySelect}
              />
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-9 space-y-4">
            {/* Profile Header */}
            <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <ProfileImage
                    src={
                      user.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`
                    }
                    alt={user.name}
                    className="h-20 w-20 rounded-full ring-4 ring-blue-100 dark:ring-blue-900"
                    isEditing={activeTab === "about"}
                    onImageUpdate={handleUserUpdate}
                  />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {user.name}
                  </h1>
                  {user.organization && (
                    <p className="text-gray-600 dark:text-gray-400">
                      {user.organization}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs Navigation */}
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
                      } whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
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
                <div className="space-y-6">
                  {/* Pending Connections */}
                  {pendingConnections.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Pending Connections</h2>
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
                                  <h3 className="font-semibold text-gray-900 dark:text-white">{connection.sender.name}</h3>
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
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Connections</h2>
                    {acceptedConnections.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {acceptedConnections.map((connection) => (
                          <div
                            key={connection.id}
                            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-center justify-between">
                              <Link
                                to={`/profile/${connection.id}`}
                                className="flex items-center space-x-4 hover:opacity-80 transition-opacity"
                              >
                                <img
                                  src={
                                    connection.avatar ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${connection.name}`
                                  }
                                  alt={connection.name}
                                  className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700"
                                  crossOrigin="anonymous"
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <h3 className="font-semibold text-gray-900 dark:text-white">{connection.name}</h3>
                                  {connection.organization && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {connection.organization}
                                    </p>
                                  )}
                                </div>
                              </Link>
                              <connectionFetcher.Form method="post">
                                <input type="hidden" name="connectionId" value={connection.connectionId} />
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
                      <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                        No connections yet
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
