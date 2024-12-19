import { useState } from "react";
import type { User } from "~/utils/auth.server";
import type { PostCategory } from "@prisma/client";

interface PostProps {
  id: string;
  content: string;
  category: PostCategory;
  image: string | null;
  timestamp: string;
  author: {
    name: string;
    organization: string;
    avatar: string | null;
  };
  upvotes: number;
  comments: number;
  currentUser: User | null;
  isLiked?: boolean;
}

export function Post({
  id,
  content,
  category,
  image,
  timestamp,
  author,
  upvotes: initialUpvotes,
  comments,
  currentUser,
  isLiked: initialIsLiked = false,
}: PostProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [upvotes, setUpvotes] = useState(initialUpvotes);

  const handleLike = () => {
    if (!currentUser) return;

    setIsLiked(!isLiked);
    setUpvotes((prev) => prev + (isLiked ? -1 : 1));
  };

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center space-x-4">
        <img
          src={
            author.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.name}`
          }
          alt={author.name}
          className="h-12 w-12 rounded-full"
        />
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            {author.name}
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <span>{author.organization}</span>
            <span>•</span>
            <span>{new Date(timestamp).toLocaleString()}</span>
          </div>
        </div>
        <div className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {category
            .split("_")
            .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
            .join(" ")}
        </div>
      </div>

      <p className="mt-4 text-gray-800 dark:text-gray-200">{content}</p>

      {image && (
        <div className="mt-4">
          <img
            src={image}
            alt="Post attachment"
            className="rounded-lg max-h-96 w-full object-cover"
          />
        </div>
      )}

      <div className="mt-4 flex space-x-6 text-gray-500 dark:text-gray-400">
        <button
          onClick={handleLike}
          disabled={!currentUser}
          className={`flex items-center space-x-2 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed ${
            isLiked ? "text-blue-600 dark:text-blue-400" : ""
          }`}
          title={currentUser ? "Upvote this post" : "Sign in to upvote"}
        >
          <svg
            className="h-5 w-5"
            fill={isLiked ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
          <span>{upvotes}</span>
        </button>

        <button className="flex items-center space-x-2 hover:text-blue-600 dark:hover:text-blue-400">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>{comments}</span>
        </button>
      </div>
    </article>
  );
}
