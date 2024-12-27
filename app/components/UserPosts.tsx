import { useFetcher } from "@remix-run/react";
import { useEffect } from "react";
import type { User } from "~/utils/auth.server";
import { Post } from "./Post";
import type { PostCategory } from "~/types/post";

interface UserPost {
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
}

export function UserPosts({ user }: UserPostsProps) {
  const fetcher = useFetcher<{ posts: UserPost[] }>();

  useEffect(() => {
    if (fetcher.state === "idle" && !fetcher.data) {
      fetcher.load(`/api/user/${user.id}/posts`);
    }
  }, [fetcher, user.id]);

  if (fetcher.state === "loading") {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white dark:bg-gray-950 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 mb-4"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-1/4 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
                  <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
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
