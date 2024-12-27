import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";
import { UserAboutTab } from "~/components/UserAboutTab";
import { UserPosts } from "~/components/UserPosts";
import { UserComments } from "~/components/UserComments";
import { ProfileImage } from "~/components/ProfileImage";
import { SidebarNav } from "~/components/SidebarNav";
import { useState } from "react";
import type { PostCategory } from "~/types/post";
import { useToast } from "~/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "~/components/ui/dialog";

type Tab = "about" | "posts" | "comments" | "connections";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const currentUser = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const [user, connections] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        organization: true,
        jobTitle: true,
        linkedIn: true,
        location: true,
        receivedConnections: {
          where: { senderId: currentUser.id },
          select: { id: true, status: true },
        },
        sentConnections: {
          where: { receiverId: currentUser.id },
          select: { id: true, status: true },
        },
      },
    }),
    // Get user's connections
    prisma.user.findMany({
      where: {
        OR: [
          {
            receivedConnections: {
              some: {
                senderId: params.userId,
                status: "accepted",
              },
            },
          },
          {
            sentConnections: {
              some: {
                receiverId: params.userId,
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

  if (!user) {
    throw new Response("Not Found", { status: 404 });
  }

  // Get connection status
  const receivedConnection = user.receivedConnections[0];
  const sentConnection = user.sentConnections[0];
  const connectionStatus = receivedConnection?.status || sentConnection?.status || null;
  const connectionId = receivedConnection?.id || sentConnection?.id || null;

  return json({
    currentUser,
    user: {
      ...user,
      connectionStatus,
      connectionId,
    },
    connections,
  });
}

export default function UserProfile() {
  const { currentUser, user, connections } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");

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

  const handleStartConversation = async () => {
    if (!newMessage.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a message",
      });
      return;
    }

    try {
      // Create conversation
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId: user.id,
          message: newMessage.trim(),
        }),
      });

      if (!response.ok) throw new Error("Failed to create conversation");

      const { conversation } = await response.json();

      setIsMessageDialogOpen(false);
      setNewMessage("");
      navigate(`/dashboard?tab=messages&conversation=${conversation.id}`);
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start conversation. Please try again.",
      });
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "about", label: "About" },
    { id: "posts", label: "Posts" },
    { id: "comments", label: "Comments" },
    { id: "connections", label: "Connections" },
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <ProfileImage
                      src={
                        user.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`
                      }
                      alt={user.name}
                      className="h-20 w-20 rounded-full ring-4 ring-blue-100 dark:ring-blue-900"
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
                {currentUser.id !== user.id && user.connectionStatus === "accepted" && (
                  <>
                    <button
                      onClick={() => setIsMessageDialogOpen(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Message
                    </button>

                    <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Send Message to {user.name}</DialogTitle>
                          <DialogDescription>
                            Start a conversation by sending a message.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <textarea
                              id="message"
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Type your message here..."
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <button
                            onClick={() => setIsMessageDialogOpen(false)}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleStartConversation}
                            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Send Message
                          </button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
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
                  isOwnProfile={currentUser.id === user.id}
                />
              )}
              {activeTab === "posts" && <UserPosts user={user} />}
              {activeTab === "comments" && <UserComments user={user} />}
              {activeTab === "connections" && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Connections</h2>
                  {connections.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {connections.map((connection) => (
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
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}