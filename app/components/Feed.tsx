import { Post, type PostProps } from "./Post";
import { PostCategory } from "~/types/post";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "@remix-run/react";

interface FeedProps {
  posts: Array<Omit<PostProps, 'currentUser'> & { id: string }>;
  currentUser: PostProps['currentUser'];
  selectedCategory?: PostCategory | PostCategory[] | null;
  hasMore: boolean;
}

interface LoaderData {
  posts: Array<Omit<PostProps, 'currentUser'> & { id: string }>;
  hasMore: boolean;
}

export function Feed({ posts: initialPosts, currentUser, selectedCategory, hasMore: initialHasMore }: FeedProps) {
  const fetcher = useFetcher<LoaderData>();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [allPosts, setAllPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const isLoading = fetcher.state !== "idle";

  // Reset posts when initial posts or category changes
  useEffect(() => {
    setAllPosts(initialPosts);
    setHasMore(initialHasMore);
  }, [initialPosts, selectedCategory]);

  // Update posts when new data arrives
  useEffect(() => {
    if (fetcher.data?.posts) {
      setAllPosts(prev => [...prev, ...fetcher.data!.posts]);
      setHasMore(fetcher.data.hasMore);
    }
  }, [fetcher.data]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoading) {
          const searchParams = new URLSearchParams();
          searchParams.set("cursor", allPosts[allPosts.length - 1].id);
          if (selectedCategory) {
            if (Array.isArray(selectedCategory)) {
              searchParams.set("category", selectedCategory.join(","));
            } else {
              searchParams.set("category", selectedCategory);
            }
          }
          fetcher.load(`/?index&${searchParams.toString()}`);
        }
      },
      { threshold: 1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [allPosts, hasMore, selectedCategory, isLoading]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
        {selectedCategory ? (
          Array.isArray(selectedCategory) ? (
            "Resources"
          ) : (
            selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)
          )
        ) : (
          "All Posts"
        )}
      </h2>
      {allPosts.map((post) => (
        <Post key={post.id} {...post} currentUser={currentUser} />
      ))}
      {allPosts.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No posts found.</p>
        </div>
      )}
      {hasMore && (
        <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
          {isLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
          ) : (
            <div className="h-10" /> // Invisible element for intersection observer
          )}
        </div>
      )}
    </div>
  );
}