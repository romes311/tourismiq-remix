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
          select: { status: true },
        },
        sentConnections: {
          where: { receiverId: currentUser.id },
          select: { status: true },
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

  return json({
    currentUser,
    user: {
      ...user,
      connectionStatus,
    },
    connections,
  });
}

export default function UserProfile() {
  const { currentUser, user, connections } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const navigate = useNavigate();

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

  const tabs: { id: Tab; label: string }[] = [
    { id: "about", label: "About" },
    { id: "posts", label: "Posts" },
    { id: "comments", label: "Comments" },
    { id: "connections", label: "Connections" },
  ];

  return (
    <div className="mt-16 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 mt-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Sidebar */}
          <aside className="lg:col-span-3">
            <div className="sticky top-24">
              <SidebarNav
                onCategorySelect={handleCategorySelect}
              />
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
                        <a
                          href={user.linkedIn}
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
                        </a>
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
                    isOwnProfile={currentUser.id === user.id}
                  />
                )}
                {activeTab === "posts" && <UserPosts user={user} />}
                {activeTab === "comments" && <UserComments user={user} />}
                {activeTab === "connections" && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Connections</h2>
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
                              </Link>
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
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}