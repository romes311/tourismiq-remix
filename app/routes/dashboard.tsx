import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useFetcher, useNavigate, useLocation } from "@remix-run/react";
import { useState, useEffect, useRef , Suspense } from "react";
import { authenticator } from "~/utils/auth.server";
import type { User } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";
import { emitNotification } from "~/utils/socket.server";
import { socket } from "~/utils/socket";
import { useToast } from "~/hooks/use-toast";
import { SidebarNav } from "~/components/SidebarNav";
import { UserAboutTab } from "~/components/UserAboutTab";
import { UserPosts } from "~/components/UserPosts";
import { UserComments } from "~/components/UserComments";
import { ProfileImage } from "~/components/ProfileImage";
import { Toaster } from "~/components/ui";
import { ErrorBoundary } from "~/components/ErrorBoundary";
import type { PostCategory } from "~/types/post";
import { format } from "date-fns";

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
      name: string | null;
      avatar: string | null;
      organization: string | null;
    };
  }>;
  acceptedConnections: Array<{
    id: string;
    name: string | null;
    avatar: string | null;
    organization: string | null;
    connectionId: string;
  }>;
  conversations: Array<{
    id: string;
    lastMessageAt: string;
    participants: Array<{
      user: {
        id: string;
        name: string | null;
        avatar: string | null;
        organization: string | null;
      };
    }>;
    messages: Array<{
      id: string;
      content: string;
      createdAt: string;
      sender: {
        id: string;
        name: string | null;
        avatar: string | null;
        organization: string | null;
      };
    }>;
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

  const [pendingConnections, acceptedConnections, conversations] = await Promise.all([
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
    // Get conversations
    prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                organization: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
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
        },
      },
      orderBy: {
        lastMessageAt: "desc",
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
    acceptedConnections: transformedAcceptedConnections,
    conversations: conversations.map((conv) => ({
      ...conv,
      lastMessageAt: conv.lastMessageAt.toISOString(),
      messages: conv.messages.map((msg) => ({
        ...msg,
        createdAt: msg.createdAt.toISOString(),
      })),
    })),
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
  const { user: initialUser, pendingConnections, acceptedConnections, conversations } = useLoaderData<typeof loader>();
  const [user, setUser] = useState<User>(initialUser);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get("tab") as Tab | null;
  const conversationParam = searchParams.get("conversation");
  const [activeTab, setActiveTab] = useState<Tab>(tabParam || "about");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(conversationParam);
  const [newMessage, setNewMessage] = useState("");
  const connectionFetcher = useFetcher<ActionData>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Array<{
    id: string;
    content: string;
    createdAt: string;
    sender: {
      id: string;
      name: string;
      avatar: string | null;
    };
  }>>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Update URL when active tab changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const currentTab = params.get("tab");
    const currentConversation = params.get("conversation");

    // Only update URL if there's an actual change
    if (
      currentTab !== activeTab ||
      (activeTab === "messages" && currentConversation !== selectedConversation)
    ) {
      params.set("tab", activeTab);
      if (activeTab === "messages" && selectedConversation) {
        params.set("conversation", selectedConversation);
      } else {
        params.delete("conversation");
      }
      navigate(`?${params.toString()}`, { replace: true });
    }
  }, [activeTab, selectedConversation, location.search, navigate]);

  // Update active tab when URL changes
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Update selected conversation when URL changes
  useEffect(() => {
    if (conversationParam && conversationParam !== selectedConversation) {
      setSelectedConversation(conversationParam);
    }
  }, [conversationParam]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  // Update scroll behavior when messages change
  useEffect(() => {
    // Only scroll if the new message is from another user
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.sender.id !== user.id) {
      scrollToBottom();
    }
  }, [messages, user.id]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (activeTab === "messages") {
      // Connect to socket when messages tab is active
      socket.connect();

      // Listen for new messages
      socket.on("new_message", (data: {
        id: string;
        message: string;
        metadata: {
          conversationId: string;
          messageId: string;
        };
      }) => {
        if (data.metadata.conversationId === selectedConversation) {
          // Reload messages
          loadMessages(selectedConversation);
        }
      });

      return () => {
        socket.disconnect();
        socket.off("new_message");
      };
    }
  }, [activeTab, selectedConversation]);

  const loadMessages = async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/messages/${conversationId}`);
      if (!response.ok) throw new Error("Failed to load messages");

      const data = await response.json();
      setMessages(data.messages);
      // Scroll to bottom when initially loading messages
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error("Failed to load messages:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load messages. Please try again.",
      });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const getOtherParticipant = (conversation: LoaderData["conversations"][0]) => {
    const otherParticipant = conversation.participants.find(
      (p) => p.user.id !== user.id
    );
    return otherParticipant?.user;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !newMessage.trim()) return;

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: selectedConversation,
          content: newMessage,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const { message } = await response.json();

      // Add the new message to the messages list immediately
      setMessages((prevMessages) => [...prevMessages, {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        sender: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
        },
      }]);

      setNewMessage("");
      // Scroll to bottom after sending a message
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again.",
      });
    }
  };

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

  const handleStartConversation = async (userId: string) => {
    // First check if we already have a conversation with this user
    const existingConversation = conversations.find(conv =>
      conv.participants.some(p => p.user.id === userId)
    );

    if (existingConversation) {
      // If conversation exists, just switch to it
      setActiveTab("messages");
      setSelectedConversation(existingConversation.id);
      return;
    }

    // If no existing conversation, create a new one
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId: userId,
        }),
      });

      if (!response.ok) throw new Error("Failed to create conversation");

      const data = await response.json();
      setActiveTab("messages");
      setSelectedConversation(data.conversation.id);
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
    { id: "connections", label: "Connections" },
    { id: "messages", label: "Messages" },
    { id: "comments", label: "Comments" },
    { id: "bookmarks", label: "Bookmarks" },
    { id: "qa", label: "Q&A" },
    { id: "score", label: "Score" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-[90px]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-12">
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
            <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
              {activeTab === "messages" ? (
                <div className="h-[600px] flex">
                  {/* Conversations List */}
                  <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Messages</h2>
                    </div>
                    {conversations.length > 0 ? (
                      <div className="divide-y divide-gray-200 dark:divide-gray-800">
                        {conversations.map((conversation) => {
                          const otherUser = getOtherParticipant(conversation);
                          const lastMessage = conversation.messages[0];

                          if (!otherUser) return null;

                          return (
                            <button
                              key={conversation.id}
                              onClick={() => setSelectedConversation(conversation.id)}
                              className={`w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
                                selectedConversation === conversation.id
                                  ? "bg-blue-50 dark:bg-blue-900/20"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <img
                                  src={
                                    otherUser.avatar ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.name ?? 'unknown'}`
                                  }
                                  alt={otherUser.name ?? 'User'}
                                  className="w-10 h-10 rounded-full flex-shrink-0"
                                  crossOrigin="anonymous"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="flex-1 min-w-0 text-left">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                      {otherUser.name}
                                    </p>
                                    {lastMessage && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                        {format(new Date(lastMessage.createdAt), "h:mm a")}
                                      </p>
                                    )}
                                  </div>
                                  {lastMessage && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                                      {lastMessage.content}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">No conversations yet</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                          Start a conversation from your connections list
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Messages View */}
                  <div className="flex-1 pl-4 flex flex-col">
                    {selectedConversation ? (
                      <>
                        {/* Conversation Header */}
                        {conversations.map((conv) => {
                          if (conv.id === selectedConversation) {
                            const otherUser = getOtherParticipant(conv);
                            return otherUser && (
                              <div key={conv.id} className="flex items-center space-x-3 p-4 border-b border-gray-200 dark:border-gray-800">
                                <img
                                  src={
                                    otherUser.avatar ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.name ?? 'unknown'}`
                                  }
                                  alt={otherUser.name ?? 'User'}
                                  className="w-10 h-10 rounded-full"
                                  crossOrigin="anonymous"
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {otherUser.name}
                                  </h3>
                                  {otherUser.organization && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {otherUser.organization}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}

                        {/* Messages */}
                        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-4 p-4">
                          {isLoadingMessages ? (
                            <div className="flex items-center justify-center h-full">
                              <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
                            </div>
                          ) : messages.length > 0 ? (
                            messages.map((message) => (
                              <div
                                key={message.id}
                                className={`flex ${
                                  message.sender.id === user.id ? "justify-end" : "justify-start"
                                }`}
                              >
                                <div
                                  className={`flex items-start space-x-2 max-w-[70%] ${
                                    message.sender.id === user.id ? "flex-row-reverse space-x-reverse" : ""
                                  }`}
                                >
                                  <img
                                    src={
                                      message.sender.avatar ||
                                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.sender.name ?? 'unknown'}`
                                    }
                                    alt={message.sender.name ?? 'User'}
                                    className="w-8 h-8 rounded-full"
                                    crossOrigin="anonymous"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div>
                                    <div
                                      className={`rounded-lg p-3 ${
                                        message.sender.id === user.id
                                          ? "bg-blue-600 text-white"
                                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                                      }`}
                                    >
                                      <p className="text-sm">{message.content}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {format(new Date(message.createdAt), "MMM d, h:mm a")}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
                            </div>
                          )}
                        </div>

                        {/* Message Input */}
                        <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-4 px-4">
                          <form onSubmit={handleSendMessage} className="flex space-x-4">
                            <input
                              type="text"
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Type your message..."
                              className="flex-1 min-w-0 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="submit"
                              disabled={!newMessage.trim()}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                              Send
                            </button>
                          </form>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400">
                          Select a conversation to start messaging
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  {activeTab === "about" && (
                    <ErrorBoundary>
                      <UserAboutTab
                        user={user}
                        isOwnProfile={true}
                        onUserUpdate={handleUserUpdate}
                      />
                    </ErrorBoundary>
                  )}
                  {activeTab === "posts" && (
                    <ErrorBoundary>
                      <Suspense fallback={
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      }>
                        <UserPosts user={user} isVisible={activeTab === "posts"} />
                      </Suspense>
                    </ErrorBoundary>
                  )}
                  {activeTab === "comments" && (
                    <ErrorBoundary>
                      <Suspense fallback={
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      }>
                        <UserComments user={user} isVisible={activeTab === "comments"} />
                      </Suspense>
                    </ErrorBoundary>
                  )}
                  {activeTab === "connections" && (
                    <ErrorBoundary>
                      <div className="space-y-8">
                        {/* Pending Connections */}
                        {pendingConnections.length > 0 && (
                          <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                              Pending Requests
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                        alt={connection.sender.name || ""}
                                        className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700"
                                        crossOrigin="anonymous"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                          {connection.sender.name}
                                        </h3>
                                        {connection.sender.organization && (
                                          <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {connection.sender.organization}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <connectionFetcher.Form method="post">
                                        <input type="hidden" name="connectionId" value={connection.id} />
                                        <input type="hidden" name="action" value="accept" />
                                        <button
                                          type="submit"
                                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                          Accept
                                        </button>
                                      </connectionFetcher.Form>
                                      <connectionFetcher.Form method="post">
                                        <input type="hidden" name="connectionId" value={connection.id} />
                                        <input type="hidden" name="action" value="reject" />
                                        <button
                                          type="submit"
                                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-full shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                          Reject
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
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            Your Connections
                          </h2>
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
                                        alt={connection.name || ""}
                                        className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700"
                                        crossOrigin="anonymous"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                          {connection.name}
                                        </h3>
                                        {connection.organization && (
                                          <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {connection.organization}
                                          </p>
                                        )}
                                      </div>
                                    </Link>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleStartConversation(connection.id)}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                      >
                                        Message
                                      </button>
                                      <connectionFetcher.Form method="post">
                                        <input type="hidden" name="connectionId" value={connection.connectionId} />
                                        <input type="hidden" name="action" value="disconnect" />
                                        <button
                                          type="submit"
                                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-full shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                          Remove
                                        </button>
                                      </connectionFetcher.Form>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <p className="text-gray-500 dark:text-gray-400">
                                You haven't connected with anyone yet
                              </p>
                              <Link
                                to="/members"
                                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                Find Members
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </ErrorBoundary>
                  )}
                  {/* ... other tabs content ... */}
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
