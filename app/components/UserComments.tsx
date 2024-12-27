import { useState, useEffect } from "react";
import type { User } from "~/utils/auth.server";
import { useFetcher, Link } from "@remix-run/react";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  post: {
    id: string;
    content: string;
    category: string;
  };
  user: {
    name: string;
    avatar: string | null;
    organization: string | null;
  };
}

interface UserCommentsProps {
  user: User;
}

export function UserComments({ user }: UserCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetcher = useFetcher<{ comments: Comment[] }>();

  // Fetch comments when component mounts
  useEffect(() => {
    fetcher.load(`/api/users/${user.id}/comments`);
  }, [user.id]);

  // Update comments when data is loaded
  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      setComments(fetcher.data.comments || []);
      setIsLoading(false);
    }
  }, [fetcher.data, fetcher.state]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
          <svg
            className="h-10 w-10 text-gray-500 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No comments yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          When people comment on your posts, they&apos;ll appear here.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          View Feed
        </Link>
      </div>
    );
  }

  // Group comments by date
  const groupedComments = comments.reduce((groups, comment) => {
    const date = new Date(comment.createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(comment);
    return groups;
  }, {} as Record<string, Comment[]>);

  return (
    <div>
      {/* Comments */}
      <div className="space-y-8">
        {Object.entries(groupedComments).map(([date, dateComments]) => (
          <div key={date}>
            {/* Date Label */}
            <div className="sticky top-0 z-10 -mx-6 px-6 py-2 mb-4 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {date}
              </h2>
            </div>

            {/* Comments for this date */}
            <div className="space-y-4">
              {dateComments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden"
                >
                  {/* Post Preview */}
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between gap-x-4">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Original Post
                      </span>
                      <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/50 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-700/30">
                        {comment.post.category}
                      </span>
                    </div>
                    <Link
                      to={`/posts/${comment.post.id}`}
                      className="mt-1 text-sm text-gray-900 dark:text-white line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {comment.post.content}
                    </Link>
                  </div>

                  {/* Comment Content */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={
                          comment.user.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user.name}`
                        }
                        alt={comment.user.name}
                        className="h-8 w-8 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-gray-900 dark:text-white truncate">
                            {comment.user.name}
                          </span>
                          {comment.user.organization && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {comment.user.organization}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-gray-900 dark:text-white">
                          {comment.content}
                        </p>
                        <div className="mt-2 flex items-center gap-4">
                          <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                            Reply
                          </button>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(comment.createdAt).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "numeric",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
