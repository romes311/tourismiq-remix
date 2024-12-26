import { Link } from "@remix-run/react";
import type { User } from "~/utils/auth.server";

interface Connection {
  id: string;
  name: string;
  organization: string | null;
  avatar: string | null;
}

interface SidebarConnectionsProps {
  user: User | null;
  connections: Connection[];
}

export function SidebarConnections({ user, connections }: SidebarConnectionsProps) {
  return (
    <div className="sticky top-24">
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
              <Link
                key={connection.id}
                to={`/profile/${connection.id}`}
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
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
              </Link>
            ))}
            {connections.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You haven't connected with any members yet.
              </p>
            )}
          </div>
        ) : (
          <div className="text-center p-4 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sign in to connect with other DMO professionals
            </p>
            <Link
              to="/auth/google"
              className="block w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in with Google
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}