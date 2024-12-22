import { useState } from "react";
import type { User } from "~/utils/auth.server";

export interface PostProps {
  id: string;
  content: string;
  category: string;
  imageUrl: string | null;
  timestamp: string | null;
  author: {
    name: string;
    organization: string | null;
    avatar: string | null;
  };
  upvotes: number;
  comments: number;
  shares: number;
  currentUser: User;
  isLiked?: boolean;
}

export function Post({
  id,
  content,
  category,
  imageUrl,
  timestamp,
  author,
  upvotes,
  comments,
  shares,
  currentUser,
  isLiked = false,
}: PostProps) {
  const [isLikedState, setIsLikedState] = useState(isLiked);
  const [upvotesCount, setUpvotesCount] = useState(upvotes);

  const handleLike = () => {
    if (!currentUser) return;
    setIsLikedState(!isLikedState);
    setUpvotesCount(isLikedState ? upvotesCount - 1 : upvotesCount + 1);

    // TODO: Implement API call to update like status
    fetch(`/api/posts/${id}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ liked: !isLikedState }),
    }).catch((error) => {
      console.error("Failed to update like status:", error);
      // Revert state on error
      setIsLikedState(isLikedState);
      setUpvotesCount(upvotesCount);
    });
  };

  return (
    <article className="bg-white dark:bg-gray-950 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      {/* Author Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <img
            src={
              author.avatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.name}`
            }
            alt={author.name}
            className="h-10 w-10 rounded-full"
          />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {author.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {author.organization}
              {timestamp && (
                <>
                  {" "}
                  ·{" "}
                  {new Date(timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/50 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-700/30">
            {category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
          {content}
        </p>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Post attachment"
            className="rounded-lg max-h-96 w-full object-cover"
          />
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between border-t dark:border-gray-800 pt-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLike}
            disabled={!currentUser}
            className={`flex items-center space-x-1.5 ${
              isLikedState
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={currentUser ? "Like this post" : "Sign in to like"}
          >
            <svg
              className="h-5 w-5"
              fill={isLikedState ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
              />
            </svg>
            <span>{upvotesCount}</span>
          </button>
          <button className="flex items-center space-x-1.5 text-gray-500 dark:text-gray-400">
            <svg
              className="h-5 w-5"
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
            <span>{comments}</span>
          </button>
          <button className="flex items-center space-x-1.5 text-gray-500 dark:text-gray-400">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span>{shares}</span>
          </button>
        </div>
        <button className="text-gray-500 dark:text-gray-400">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
            />
          </svg>
        </button>
      </div>
    </article>
  );
}
