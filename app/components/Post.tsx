import { useState } from "react";
import type { User } from "~/utils/auth.server";
import type { PostCategory } from "@prisma/client";

export interface PostProps {
  id: string;
  content: string;
  category: PostCategory;
  imageUrl: string | null;
  timestamp: string;
  author: {
    name: string;
    organization: string;
    avatar: string | null;
  };
  upvotes: number;
  comments: number;
  shares: number;
  currentUser: User;
  isLiked?: boolean;
}

export function Post({
  content,
  category,
  imageUrl,
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
    setUpvotes(upvotes + (isLiked ? -1 : 1));
  };

  return (
    <article className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
      {/* Author info */}
      <div className="flex items-center space-x-3 mb-4">
        <img
          src={
            author.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.name}`
          }
          alt={author.name}
          className="h-10 w-10 rounded-full"
        />
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {author.name}
          </div>
          {author.organization && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {author.organization}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="prose dark:prose-invert max-w-none mb-4">
        <p>{content}</p>
      </div>

      {/* Image */}
      {imageUrl && (
        <div className="mb-4">
          <img
            src={imageUrl}
            alt="Post attachment"
            className="rounded-lg max-h-[500px] w-full object-cover"
          />
        </div>
      )}

      {/* Category */}
      <div className="mb-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {category.replace(/_/g, " ").toLowerCase()}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLike}
            disabled={!currentUser}
            className={`flex items-center space-x-1 ${
              isLiked ? "text-blue-600 dark:text-blue-400" : ""
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={currentUser ? "Like this post" : "Sign in to like"}
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
                strokeWidth={1.5}
                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
              />
            </svg>
            <span>{upvotes}</span>
          </button>
          <button className="flex items-center space-x-1">
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
        </div>
        <time
          dateTime={timestamp}
          className="text-sm text-gray-500 dark:text-gray-400"
        >
          {new Date(timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </time>
      </div>
    </article>
  );
}
