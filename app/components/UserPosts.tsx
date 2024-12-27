import { useFetcher } from "@remix-run/react";
import { useEffect, useState, useRef, useCallback } from "react";
import type { User } from "~/utils/auth.server";
import { Post } from "./Post";
import { PostCategory } from "~/types/post";

interface PostData {
  id: string;
  content: string;
  category: PostCategory;
  imageUrl: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
    organization: string | null;
  };
  _count: {
    upvotes: number;
    comments: number;
  };
}

interface UserPostsProps {
  user: User;
  isVisible?: boolean;
}

export function UserPosts({ user, isVisible = true }: UserPostsProps) {
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const fetcher = useFetcher<{ posts: PostData[]; error?: string; details?: string }>();
  const hasInitialFetch = useRef(false);

  useEffect(() => {
    if (isVisible && !hasInitialFetch.current) {
      setError(null);
      try {
        fetcher.load(`/api/user/${user.id}/posts`);
      } catch (e) {
        console.error("[UserPosts] Error initiating fetch:", e);
        setError("Failed to load posts. Please try again.");
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
        fetcher.load(`/api/user/${user.id}/posts`);
      } catch (e) {
        console.error("[UserPosts] Error initiating retry fetch:", e);
        setError("Failed to load posts. Please try again.");
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

  if (!fetcher.data?.posts?.length) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No posts yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          When you create posts, they will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fetcher.data.posts.map((post) => (
        <Post
          key={post.id}
          id={post.id}
          content={post.content}
          category={post.category}
          imageUrl={post.imageUrl}
          timestamp={post.createdAt}
          author={{
            id: post.user.id,
            name: post.user.name,
            organization: post.user.organization,
            avatar: post.user.avatar,
          }}
          upvotes={post._count.upvotes}
          comments={post._count.comments}
          shares={0}
          currentUser={user}
        />
      ))}
    </div>
  );
}
