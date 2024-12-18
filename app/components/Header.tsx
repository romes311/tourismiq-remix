import { Form, Link } from "@remix-run/react";
import type { User } from "~/utils/auth.server";

interface HeaderProps {
  user?: User | null;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-950 shadow">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                TourismIQ
              </h1>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Signed in as
                  </span>{" "}
                  <span className="text-gray-900 dark:text-gray-200 font-medium">
                    {user.name}
                  </span>
                </div>
                <Form action="/logout" method="post">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Sign out
                  </button>
                </Form>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Form action="/auth/google" method="get">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Sign in
                  </button>
                </Form>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
