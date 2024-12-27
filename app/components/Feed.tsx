import { Post, type PostProps } from "./Post";
import { PostCategory } from "~/types/post";

interface FeedProps {
  posts: Array<Omit<PostProps, 'currentUser'> & { id: string }>;
  currentUser: PostProps['currentUser'];
  selectedCategory?: PostCategory | PostCategory[] | null;
}

export function Feed({ posts, currentUser, selectedCategory }: FeedProps) {
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
      {posts.map((post) => (
        <Post key={post.id} {...post} currentUser={currentUser} />
      ))}
      {posts.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No posts found.</p>
        </div>
      )}
    </div>
  );
}