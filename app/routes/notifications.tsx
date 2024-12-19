import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { authenticator } from "~/utils/auth.server";
import { db } from "~/utils/db.server";
import { NotificationType } from "@prisma/client";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const notifications = await db.notification.findMany({
    where: {
      userId: user.id,
    },
    include: {
      actor: {
        select: {
          name: true,
          avatar: true,
          organization: true,
        },
      },
      post: {
        select: {
          content: true,
        },
      },
      comment: {
        select: {
          content: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return json({ notifications });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "mark_all_read") {
    await db.notification.updateMany({
      where: {
        userId: user.id,
        read: false,
      },
      data: {
        read: true,
      },
    });
  } else if (action === "mark_read") {
    const notificationId = formData.get("notificationId");
    if (typeof notificationId === "string") {
      await db.notification.update({
        where: {
          id: notificationId,
          userId: user.id,
        },
        data: {
          read: true,
        },
      });
    }
  }

  return json({ success: true });
}

function getNotificationText(type: NotificationType, actorName: string) {
  switch (type) {
    case "LIKE":
      return `${actorName} liked your post`;
    case "COMMENT":
      return `${actorName} commented on your post`;
    case "FOLLOW":
      return `${actorName} started following you`;
    case "MENTION":
      return `${actorName} mentioned you in a post`;
    case "REPLY":
      return `${actorName} replied to your comment`;
    default:
      return "New notification";
  }
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "LIKE":
      return "❤️";
    case "COMMENT":
      return "💬";
    case "FOLLOW":
      return "👥";
    case "MENTION":
      return "@";
    case "REPLY":
      return "↩️";
    default:
      return "🔔";
  }
}

export default function Notifications() {
  const { notifications } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Notifications
        </h1>
        <Form method="post">
          <input type="hidden" name="action" value="mark_all_read" />
          <button
            type="submit"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Mark all as read
          </button>
        </Form>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-white dark:bg-gray-900 rounded-lg shadow p-4 ${
              !notification.read ? "border-l-4 border-blue-500" : ""
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <span className="text-2xl">
                  {getNotificationIcon(notification.type)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {getNotificationText(
                      notification.type,
                      notification.actor.name
                    )}
                  </p>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                    {!notification.read && (
                      <Form method="post" className="inline">
                        <input type="hidden" name="action" value="mark_read" />
                        <input
                          type="hidden"
                          name="notificationId"
                          value={notification.id}
                        />
                        <button
                          type="submit"
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          Mark as read
                        </button>
                      </Form>
                    )}
                  </div>
                </div>
                {notification.post && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {notification.post.content}
                  </p>
                )}
                {notification.comment && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {notification.comment.content}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No notifications yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
