import { useState } from "react";
import type { User } from "~/utils/auth.server";
import { PostCategory } from "~/types/post";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    name: string;
    avatar: string | null;
    organization: string | null;
  };
}

export interface PostProps {
  id: string;
  content: string;
  category: PostCategory;
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
  currentUser: User | null;
  isLiked?: boolean;
}

function CommentForm({
  postId,
  currentUser,
  onCommentAdded,
}: {
  postId: string;
  currentUser: User | null;
  onCommentAdded: (comment: Comment) => void;
}) {
  if (!currentUser) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to submit comment");
      }

      const data = await response.json();
      onCommentAdded(data.comment);
      form.reset();
    } catch (error) {
      console.error("Failed to submit comment:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="flex gap-3">
        <img
          src={
            currentUser.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.name}`
          }
          alt={currentUser.name}
          className="h-8 w-8 rounded-full"
        />
        <div className="flex-1">
          <textarea
            name="content"
            rows={2}
            className="block w-full rounded-md border-0 px-3 py-2 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-gray-900 dark:focus:ring-blue-500 sm:text-sm sm:leading-6"
            placeholder="Write a comment..."
            required
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Comment
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function CommentList({ comments }: { comments: Comment[] }) {
  return (
    <div className="space-y-4 mt-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <img
            src={
              comment.user.avatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user.name}`
            }
            alt={comment.user.name}
            className="h-8 w-8 rounded-full"
          />
          <div className="flex-1">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {comment.user.name}
                  </span>
                  {comment.user.organization && (
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      {comment.user.organization}
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(comment.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <p className="mt-1 text-gray-900 dark:text-white">
                {comment.content}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Post({
  id,
  content,
  category,
  imageUrl,
  timestamp,
  author,
  upvotes,
  comments: commentCount,
  shares,
  currentUser,
  isLiked = false,
}: PostProps) {
  const [isLikedState, setIsLikedState] = useState(isLiked);
  const [upvotesCount, setUpvotesCount] = useState(upvotes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(commentCount);

  const handleLike = () => {
    if (!currentUser) return;
    setIsLikedState(!isLikedState);
    setUpvotesCount(isLikedState ? upvotesCount - 1 : upvotesCount + 1);

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

  const handleToggleComments = async () => {
    setShowComments(!showComments);

    // Only fetch comments if they haven't been loaded yet
    if (!showComments && comments.length === 0 && !isLoadingComments) {
      setIsLoadingComments(true);
      try {
        const response = await fetch(`/api/posts/${id}/comments`);
        if (response.ok) {
          const data = await response.json();
          setComments(data.comments);
          // Update local comment count to match server
          setLocalCommentCount(data.comments.length);
        }
      } catch (error) {
        console.error("Failed to fetch comments:", error);
      } finally {
        setIsLoadingComments(false);
      }
    }
  };

  const handleCommentAdded = (newComment: Comment) => {
    setComments((prevComments) => [newComment, ...prevComments]);
    setLocalCommentCount((prev) => prev + 1);
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
          <button
            onClick={handleToggleComments}
            className={`flex items-center space-x-1.5 ${
              showComments
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
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
            <span>{localCommentCount}</span>
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

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 border-t dark:border-gray-800 pt-4">
          {isLoadingComments ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <CommentForm
                postId={id}
                currentUser={currentUser}
                onCommentAdded={handleCommentAdded}
              />
              <CommentList comments={comments} />
              {comments.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No comments yet. Be the first to comment!
                </p>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}
