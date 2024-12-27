import { Link } from "@remix-run/react";
import { Button } from "./ui/button";
import { UserPlus } from "lucide-react";

interface SidebarConnectionsProps {
  connections: Array<{
    id: string;
    name: string | null;
    organization: string | null;
    avatar: string | null;
  }>;
  isLoggedIn?: boolean;
}

export function SidebarConnections({ connections, isLoggedIn }: SidebarConnectionsProps) {
  // Filter out connections with null names
  const validConnections = connections.filter((conn): conn is {
    id: string;
    name: string;
    organization: string | null;
    avatar: string | null;
  } => conn.name !== null);

  if (!isLoggedIn) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Connections
        </h2>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sign in to connect with other members
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild variant="default" size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full text-gray-900 dark:text-gray-200">
              <Link to="/signup">Create Account</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Connections
        </h2>
        <Button asChild variant="outline" size="sm" className="w-full text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
          <Link to="/members" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Find More Connections
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        {validConnections.map((connection) => (
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
        {validConnections.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You haven&apos;t connected with anyone yet. Find members to connect with!
          </p>
        )}
      </div>
    </div>
  );
}