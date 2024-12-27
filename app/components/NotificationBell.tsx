import { useEffect, useState } from "react";
import { socket } from "~/utils/socket"
import type { User } from "~/utils/auth.server";
import { Link, useFetcher } from "@remix-run/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

interface NotificationBellProps {
  user: User;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata: {
    connectionId?: string;
    [key: string]: unknown;
  };
}

interface ClearNotificationsResponse {
  success: boolean;
}

export function NotificationBell({ user }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const clearFetcher = useFetcher<ClearNotificationsResponse>();

  useEffect(() => {
    // Initial fetch of notifications
    fetchNotifications();

    // Connect to WebSocket
    socket.connect();
    socket.emit("join", user.id);

    // Set up periodic check every minute
    const intervalId = setInterval(fetchNotifications, 60000);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
      socket.disconnect();
    };
  }, [user.id]);

  const fetchNotifications = async () => {
    try {
      const [unreadResponse, notificationsResponse] = await Promise.all([
        fetch("/api/notifications/unread"),
        fetch("/api/notifications"),
      ]);

      if (!unreadResponse.ok || !notificationsResponse.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const [unreadData, notificationsData] = await Promise.all([
        unreadResponse.json(),
        notificationsResponse.json(),
      ]);

      if (unreadData.error || notificationsData.error) {
        throw new Error(unreadData.error || notificationsData.error);
      }

      setUnreadCount(unreadData.count);
      setNotifications(notificationsData.notifications);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setUnreadCount(0);
      setNotifications([]);
    }
  };

  // Listen for real-time notifications
  useEffect(() => {
    const handleNewNotification = (data: Notification) => {
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on("notification", handleNewNotification);

    return () => {
      socket.off("notification", handleNewNotification);
    };
  }, []);

  // Handle successful clear
  useEffect(() => {
    if (clearFetcher.state === "idle" && clearFetcher.data?.success) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [clearFetcher.state, clearFetcher.data]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between w-full">
            <h2 className="text-lg font-semibold">Notifications</h2>
            <div className="flex items-center gap-4">
              {notifications.length > 0 && (
                <clearFetcher.Form
                  action="/api/notifications"
                  method="post"
                  className="flex items-center"
                >
                  <input type="hidden" name="action" value="clear" />
                  <button
                    type="submit"
                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                    disabled={clearFetcher.state !== "idle"}
                  >
                    Clear All
                  </button>
                </clearFetcher.Form>
              )}
              <Link
                to="/notifications"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                onClick={() => setIsOpen(false)}
              >
                View All
              </Link>
            </div>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 ${
                    !notification.read
                      ? "bg-blue-50 dark:bg-blue-900/10"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(notification.createdAt).toLocaleDateString()} at{" "}
                    {new Date(notification.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No notifications
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
