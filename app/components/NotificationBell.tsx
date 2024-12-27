import { useEffect, useState } from "react";
import { socket } from "~/utils/socket"
import type { User } from "~/utils/auth.server";

interface NotificationBellProps {
  user: User;
}

export function NotificationBell({ user }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);

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
      const response = await fetch(`/api/notifications/unread`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  // Listen for real-time notifications
  useEffect(() => {
    const handleNewNotification = () => {
      fetchNotifications();
    };

    socket.on("notification", handleNewNotification);

    return () => {
      socket.off("notification", handleNewNotification);
    };
  }, []);

  return (
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
  );
}
