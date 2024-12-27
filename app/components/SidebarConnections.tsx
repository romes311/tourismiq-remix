import { Link } from "@remix-run/react";
import { Button } from "./ui/button";

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
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Connections
      </h2>
      {connections.length > 0 ? (
        <div className="space-y-4">
          {connections.map((connection) => (
            <Link
              key={connection.id}
              to={`/profile/${connection.id}`}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <img
                src={
                  connection.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${connection.name}`
                }
                alt={connection.name}
                className="h-8 w-8 rounded-full"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {connection.name}
                </p>
                {connection.organization && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {connection.organization}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sign in to connect with other members
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild variant="default" size="sm">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/signup">Create Account</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}