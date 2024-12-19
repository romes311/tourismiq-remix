"use client";

import { useState, useEffect } from "react";
import { Link } from "@remix-run/react";
import { ClientOnly } from "remix-utils/client-only";

interface Notification {
  type: "LIKE" | "COMMENT" | "FOLLOW" | "MENTION" | "REPLY";
  message: string;
  postId?: string;
  commentId?: string;
  timestamp: string;
  actor: {
    name: string;
    avatar: string | null;
  };
}

export function NotificationBell() {
  return (
    <ClientOnly fallback={<NotificationBellFallback />}>
      {() => <NotificationBellContent />}
    </ClientOnly>
  );
}

function NotificationBellFallback() {
  return (
    <div className="relative">
      <button
        className="relative p-2 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
        aria-label="Notifications"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      </button>
    </div>
  );
}

function NotificationBellContent() {
  const [notifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const unreadCount = notifications.length;

  if (!mounted) {
    return <NotificationBellFallback />;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1">
            {notifications.length > 0 ? (
              notifications.map((notification: Notification, index: number) => (
                <div
                  key={index}
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Link
                    to={
                      notification.postId
                        ? `/posts/${notification.postId}`
                        : "/notifications"
                    }
                    className="block"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {notification.actor && (
                          <img
                            src={
                              notification.actor.avatar ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.actor.name}`
                            }
                            alt={notification.actor.name}
                            className="h-8 w-8 rounded-full"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {notification.timestamp
                            ? new Date(notification.timestamp).toLocaleString(
                                undefined,
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "Just now"}
                        </p>
                      </div>
                    </div>
                  </Link>
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                No new notifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
