import { useState, useEffect, useRef, useCallback } from "react";
import type { User } from "~/utils/auth.server";
import { useFetcher } from "@remix-run/react";
import { CommentCard } from "./CommentCard";

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
  isVisible?: boolean;
}

export function UserComments({ user, isVisible = true }: UserCommentsProps) {
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const fetcher = useFetcher<{ comments: Comment[]; error?: string; details?: string }>();
  const hasInitialFetch = useRef(false);

  useEffect(() => {
    if (isVisible && !hasInitialFetch.current) {
      setError(null);
      try {
        fetcher.load(`/api/user/${user.id}/comments`);
      } catch (e) {
        console.error("[UserComments] Error initiating fetch:", e);
        setError("Failed to load comments. Please try again.");
      }
      hasInitialFetch.current = true;
    }
  }, [user.id, fetcher, isVisible]);

  useEffect(() => {
    if (!isVisible) {
      hasInitialFetch.current = false;
      setRetryCount(0);
    }
  }, [isVisible]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.error) {
        const errorMessage = fetcher.data.details || fetcher.data.error;
        if (errorMessage.includes("User not authenticated") || errorMessage.includes("failureRedirect")) {
          // Handle authentication errors by redirecting to login
          window.location.href = "/login";
          return;
        }
        setError(errorMessage);
      } else {
        setRetryCount(0);
      }
    }
  }, [fetcher.data, fetcher.state]);

  const handleRetry = useCallback(() => {
    if (retryCount >= 3) {
      setError("Maximum retry attempts reached. Please refresh the page.");
      return;
    }

    setError(null);
    setRetryCount((prev) => prev + 1);

    const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);

    setTimeout(() => {
      try {
        fetcher.load(`/api/user/${user.id}/comments`);
      } catch (e) {
        console.error("[UserComments] Error initiating retry fetch:", e);
        setError("Failed to load comments. Please try again.");
      }
    }, delay);
  }, [fetcher, user.id, retryCount]);

  if (fetcher.state === "loading" && !error) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        {retryCount < 3 && (
          <button
            onClick={handleRetry}
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (!fetcher.data?.comments?.length) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No comments yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          When you comment on posts, they will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fetcher.data.comments.map((comment) => (
        <CommentCard key={comment.id} comment={comment} />
      ))}
    </div>
  );
}
