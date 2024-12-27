import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { socket } from "~/utils/socket";

interface LoaderData {
  conversations: Array<{
    id: string;
    lastMessageAt: string;
    participants: Array<{
      user: {
        id: string;
        name: string;
        avatar: string | null;
      };
    }>;
    messages: Array<{
      id: string;
      content: string;
      createdAt: string;
      sender: {
        id: string;
        name: string;
      };
    }>;
  }>;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const conversations = await prisma.conversation.findMany({
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
            },
          },
        },
      },
    },
    orderBy: {
      lastMessageAt: "desc",
    },
  });

  return json<LoaderData>({
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

export default function Messages() {
  const { conversations } = useLoaderData<typeof loader>();
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  useEffect(() => {
    // Connect to socket when component mounts
    socket.connect();

    return () => {
      // Disconnect when component unmounts
      socket.disconnect();
    };
  }, []);

  const getOtherParticipant = (conversation: LoaderData["conversations"][0]) => {
    return conversation.participants[0].user;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-12 mt-[90px]">
        <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="p-4">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Messages</h1>

            {conversations.length > 0 ? (
              <div className="space-y-4">
                {conversations.map((conversation) => {
                  const otherUser = getOtherParticipant(conversation);
                  const lastMessage = conversation.messages[0];

                  return (
                    <Link
                      key={conversation.id}
                      to={`/messages/${conversation.id}`}
                      className={`block p-4 rounded-lg border ${
                        activeConversation === conversation.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <img
                          src={
                            otherUser.avatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.name}`
                          }
                          alt={otherUser.name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {otherUser.name}
                            </p>
                            {lastMessage && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {format(new Date(lastMessage.createdAt), "MMM d, h:mm a")}
                              </p>
                            )}
                          </div>
                          {lastMessage && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {lastMessage.sender.name}: {lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No conversations yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}