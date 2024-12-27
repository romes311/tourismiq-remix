import { Link } from "@remix-run/react";

interface SidebarConnectionsProps {
  connections: Array<{
    id: string;
    name: string;
    organization: string | null;
    avatar: string | null;
  }>;
}

export function SidebarConnections({ connections }: SidebarConnectionsProps) {
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
              You haven&apos;t connected with any members yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}