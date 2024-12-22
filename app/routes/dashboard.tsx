import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { authenticator } from "~/utils/auth.server";
import { SidebarNav } from "~/components/SidebarNav";
import { UserAboutTab } from "~/components/UserAboutTab";
import { useState } from "react";
import type { User } from "~/utils/auth.server";
import { ProfileImage } from "~/components/ProfileImage";

type Tab =
  | "about"
  | "posts"
  | "connections"
  | "messages"
  | "comments"
  | "bookmarks"
  | "qa"
  | "score";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  return json({ user });
}

export default function Dashboard() {
  const { user: initialUser } = useLoaderData<typeof loader>();
  const [user, setUser] = useState<User>(initialUser);
  const [activeTab, setActiveTab] = useState<Tab>("about");

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
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
    <div className="mt-16 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
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
                {/* Add other tab content components here */}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
