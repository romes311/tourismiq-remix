import { Form, Link } from "@remix-run/react";
import { useState, useRef, useEffect } from "react";
import type { User } from "~/utils/auth.server";

interface HeaderProps {
  user?: User | null;
}

export function Header({ user }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        buttonRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-950 shadow z-50">
      <nav className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
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
              <div className="relative">
                <button
                  ref={buttonRef}
                  onClick={() => setIsOpen(!isOpen)}
                  className="flex items-center gap-3 rounded-full hover:ring-2 hover:ring-gray-200 dark:hover:ring-gray-700 transition-all p-0.5"
                >
                  <img
                    src={
                      user.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`
                    }
                    alt={user.name}
                    className="h-8 w-8 rounded-full"
                  />
                </button>

                {isOpen && (
                  <div
                    ref={popoverRef}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg border border-gray-200 dark:border-gray-800 py-1 z-50"
                  >
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </p>
                      {user.organization && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user.organization}
                        </p>
                      )}
                    </div>
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => setIsOpen(false)}
                    >
                      My Profile
                    </Link>
                    <Form action="/logout" method="post">
                      <button
                        type="submit"
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        Sign out
                      </button>
                    </Form>
                  </div>
                )}
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
