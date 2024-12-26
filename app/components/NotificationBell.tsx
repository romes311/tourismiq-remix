"use client";

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

interface ClearResponse {
  success?: boolean;
  error?: string;
}

export function NotificationBell({ user }: NotificationBellProps) {
  const fetcher = useFetcher<{ notifications: Notification[] }>();
  const clearFetcher = useFetcher<ClearResponse>();
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
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

  useEffect(() => {
    // Connect to WebSocket server with the new configuration
    const socket = io(window.location.origin, {
      auth: { userId: user.id },
      path: "/ws",
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Connected to WebSocket server");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
      setConnected(false);
    });

    // Listen for new notifications
    socket.on("notification", (data) => {
      console.log("Received notification:", data);
      fetcher.load("/api/notifications");
    });

    // Initial load
    fetcher.load("/api/notifications");

    return () => {
      socket.disconnect();
    };
  }, [user.id]);

  useEffect(() => {
    if (fetcher.data) {
      const count = fetcher.data.notifications.filter(n => !n.read).length;
      setUnreadCount(count);
    }
  }, [fetcher.data]);

  const handleClearNotifications = () => {
    clearFetcher.submit(
      { action: "clear" },
      { method: "post", action: "/api/notifications" }
    );
  };

  // Add effect to handle successful clear
  useEffect(() => {
    if (clearFetcher.state === "idle" && clearFetcher.data?.success) {
      fetcher.load("/api/notifications");
    }
  }, [clearFetcher.state, clearFetcher.data]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full relative"
      >
        <Bell className={`w-6 h-6 ${connected ? 'text-current' : 'text-gray-400'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {fetcher.data?.notifications && fetcher.data.notifications.length > 0 && (
              <button
                onClick={handleClearNotifications}
                disabled={clearFetcher.state !== "idle"}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {fetcher.data?.notifications && fetcher.data.notifications.length > 0 ? (
              <div className="py-2">
                {fetcher.data.notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <p className="text-sm text-gray-900 dark:text-gray-100">{notification.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {format(new Date(notification.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                No notifications yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
