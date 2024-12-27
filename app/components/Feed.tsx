import { Post, type PostProps } from "./Post";
import { PostCategory } from "~/types/post";

interface FeedProps {
  posts: Array<Omit<PostProps, 'currentUser'> & { id: string }>;
  currentUser: PostProps['currentUser'];
  selectedCategory?: PostCategory | PostCategory[] | null;
}

function getFeedTitle(category: PostCategory | PostCategory[] | null | undefined): string {
  if (!category) return "The Latest";
  if (Array.isArray(category)) {
    if (category.every(c => [
      PostCategory.BLOG_POST,
      PostCategory.BOOKS,
      PostCategory.COURSES,
      PostCategory.PODCASTS,
      PostCategory.PRESENTATIONS,
      PostCategory.PRESS_RELEASES,
      PostCategory.TEMPLATES,
      PostCategory.VIDEOS,
      PostCategory.WEBINARS,
      PostCategory.CASE_STUDIES,
      PostCategory.WHITEPAPERS,
    ].includes(c))) {
      return "Resources";
    }
    return category.join(", ");
  }
  return category.split("_").map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(" ");
}

export function Feed({ posts, currentUser, selectedCategory }: FeedProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {getFeedTitle(selectedCategory)}
      </h2>
      {posts.map((post) => (
        <Post
          key={post.id}
          {...post}
          currentUser={currentUser}
        />
      ))}
      {posts.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No posts found.</p>
        </div>
      )}
    </div>
  );
}