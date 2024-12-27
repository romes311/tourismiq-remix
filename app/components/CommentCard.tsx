import { Link } from "@remix-run/react";

interface CommentCardProps {
  comment: {
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
  };
}

export function CommentCard({ comment }: CommentCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      <div className="flex items-center space-x-3">
        <img
          src={
            comment.user.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user.name}`
          }
          alt={comment.user.name}
          className="h-10 w-10 rounded-full"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {comment.user.name}
              </h3>
              {comment.user.organization && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {comment.user.organization}
                </p>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(comment.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="mt-2">
            <p className="text-gray-900 dark:text-white">{comment.content}</p>
          </div>
          <div className="mt-2">
            <Link
              to={`/posts/${comment.post.id}`}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              View Post: {comment.post.content.slice(0, 100)}
              {comment.post.content.length > 100 ? "..." : ""}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}