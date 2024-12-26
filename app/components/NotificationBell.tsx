import { useEffect, useState, useRef } from "react";
import { useFetcher } from "@remix-run/react";
import { Bell, Trash2 } from "lucide-react";
import { io } from "socket.io-client";
import type { User } from "~/utils/auth.server";
import { format } from "date-fns";

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata: {
    connectionId?: string;
  } | null;
}

interface NotificationBellProps {
  user: User;
}

interface NotificationResponse {
  notifications: Notification[];
}

export function NotificationBell({ user }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const fetcher = useFetcher<NotificationResponse>();
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle clicks outside popover
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch notifications periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetcher.load("/api/notifications");
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [fetcher]);

  // Update notifications when data changes
  useEffect(() => {
    if (fetcher.data) {
      setNotifications(fetcher.data.notifications);
      setUnreadCount(
        fetcher.data.notifications.filter((n: Notification) => !n.read).length
      );
    }
  }, [fetcher.data]);

  // Connect to WebSocket
  useEffect(() => {
    const socket = io({
      path: "/ws",
      auth: { userId: user.id },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    socket.on("notification", (notification: Notification) => {
      console.log("Received notification:", notification);
      setNotifications((prev) => [notification, ...prev]);
      if (!notification.read) {
        setUnreadCount((prev) => prev + 1);
      }
      // Trigger a re-fetch to ensure we have the latest data
      fetcher.load("/api/notifications");
    });

    return () => {
      socket.disconnect();
    };
  }, [user.id, fetcher]);

  // Handle clearing notifications
  const handleClearNotifications = () => {
    fetcher.submit(
      { _action: "clear" },
      { method: "POST", action: "/api/notifications" }
    );
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetcher.load("/api/notifications");
          }
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-blue-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-md shadow-lg border border-gray-200 dark:border-gray-800 z-50"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notifications
            </h3>
            {notifications.length > 0 && (
              <button
                onClick={handleClearNotifications}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 ${
                      !notification.read
                        ? "bg-blue-50 dark:bg-blue-900/10"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <p className="text-sm text-gray-900 dark:text-white">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(notification.createdAt), "PPp")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
