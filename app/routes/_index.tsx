import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { authenticator } from "~/utils/auth.server";
import { CreatePostForm } from "~/components/CreatePostForm";

interface Connection {
  id: string;
  name: string;
  organization: string | null;
  avatar: string | null;
}

export const meta: MetaFunction = () => {
  return [
    { title: "TourismIQ - Connect with DMOs" },
    {
      name: "description",
      content: "A social platform for tourism DMO professionals",
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);

  const [posts, rawConnections] = await Promise.all([
    db.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      take: 20,
    }),
    user
      ? db.user.findMany({
          where: {
            NOT: { id: user.id },
          },
          take: 5,
          select: {
            id: true,
            name: true,
            organization: true,
            avatar: true,
          },
        })
      : [],
  ]);

  const connections = (rawConnections as Connection[]).filter(
    (connection): connection is Connection => connection !== null
  );

  return json({
    user,
    connections,
    posts: posts.map((post) => ({
      id: post.id,
      content: post.content,
      category: post.category,
      timestamp: post.createdAt.toISOString(),
      author: {
        name: post.author.name,
        organization: post.author.organization,
        avatar:
          post.author.avatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.name}`,
      },
      likes: post._count.likes,
      comments: post._count.comments,
      shares: 0,
    })),
  });
}

const categories = [
  { name: "All Posts", href: "/" },
  { name: "Events", href: "/?category=events" },
  { name: "Marketing", href: "/?category=marketing" },
  { name: "Research", href: "/?category=research" },
  { name: "Technology", href: "/?category=technology" },
  { name: "Best Practices", href: "/?category=best-practices" },
];

export default function Index() {
  const { posts, user, connections } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Sidebar */}
        <aside className="lg:col-span-3">
          <div className="sticky top-8 space-y-8">
            {/* Categories */}
            <nav className="space-y-1">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  to={category.href}
                  className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-md dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {category.name}
                </Link>
              ))}
            </nav>

            {/* Bookmarks */}
            <div>
              <Link
                to="/bookmarks"
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-md dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <svg
                  className="h-5 w-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                Bookmarks
              </Link>
            </div>

            {/* Newsletter */}
            <div className="bg-white dark:bg-gray-950 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Stay Updated
              </h3>
              <Form method="post" action="/newsletter" className="space-y-4">
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Subscribe
                </button>
              </Form>
            </div>

            {/* Footer */}
            <footer className="text-sm text-gray-500 dark:text-gray-400">
              <p>© 2024 TourismIQ. All rights reserved.</p>
              <div className="mt-2 space-x-4">
                <Link to="/privacy" className="hover:text-blue-600">
                  Privacy
                </Link>
                <Link to="/terms" className="hover:text-blue-600">
                  Terms
                </Link>
              </div>
            </footer>
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-6">
          {user && <CreatePostForm />}

          <div className="space-y-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950"
              >
                <div className="flex items-center space-x-4">
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    className="h-12 w-12 rounded-full"
                  />
                  <div className="flex-1">
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                      {post.author.name}
                    </h2>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>{post.author.organization}</span>
                      <span>•</span>
                      <span>{new Date(post.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {post.category
                      .split("_")
                      .map(
                        (word) => word.charAt(0) + word.slice(1).toLowerCase()
                      )
                      .join(" ")}
                  </div>
                </div>

                <p className="mt-4 text-gray-800 dark:text-gray-200">
                  {post.content}
                </p>

                <div className="mt-4 flex space-x-6 text-gray-500 dark:text-gray-400">
                  <button className="flex items-center space-x-2 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    <span>{post.likes}</span>
                  </button>
                  <button className="flex items-center space-x-2 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <span>{post.comments}</span>
                  </button>
                  <button className="flex items-center space-x-2 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                    <span>{post.shares}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="lg:col-span-3">
          <div className="sticky top-8 space-y-8">
            <div className="bg-white dark:bg-gray-950 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Connections
                </h3>
                <Link
                  to="/members"
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  View All
                </Link>
              </div>

              {user ? (
                <div className="space-y-4">
                  {connections.map((connection) => (
                    <div
                      key={connection.id}
                      className="flex items-center space-x-3"
                    >
                      <img
                        src={
                          connection.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${connection.name}`
                        }
                        alt={connection.name}
                        className="h-8 w-8 rounded-full"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {connection.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {connection.organization}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Sign in to connect with other DMO professionals
                  </p>
                  <Form action="/auth/google" method="get">
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Sign in with Google
                    </button>
                  </Form>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
