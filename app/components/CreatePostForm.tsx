import { useState, useRef } from "react";
import type { User } from "~/utils/auth.server";
import { PostCategory } from "~/types/post";
import { useFetcher } from "@remix-run/react";

const categories: { label: string; value: PostCategory }[] = [
  { label: "Thought Leadership", value: PostCategory.THOUGHT_LEADERSHIP },
  { label: "News", value: PostCategory.NEWS },
  { label: "Events", value: PostCategory.EVENTS },
  { label: "Blog Post", value: PostCategory.BLOG_POST },
  { label: "Books", value: PostCategory.BOOKS },
  { label: "Courses", value: PostCategory.COURSES },
  { label: "Podcasts", value: PostCategory.PODCASTS },
  { label: "Presentations", value: PostCategory.PRESENTATIONS },
  { label: "Press Releases", value: PostCategory.PRESS_RELEASES },
  { label: "Templates", value: PostCategory.TEMPLATES },
  { label: "Videos", value: PostCategory.VIDEOS },
  { label: "Webinars", value: PostCategory.WEBINARS },
  { label: "Case Studies", value: PostCategory.CASE_STUDIES },
  { label: "Whitepapers", value: PostCategory.WHITEPAPERS },
];

interface PostTriggerProps {
  user: User;
  onClick: () => void;
}

function PostTrigger({ user, onClick }: PostTriggerProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-6 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
    >
      <div className="flex items-center gap-3">
        <img
          src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
          alt={user.name}
          className="h-10 w-10 rounded-full"
          crossOrigin="anonymous"
        />
        <span className="text-gray-500 dark:text-gray-400">
          Start a post...
        </span>
      </div>
    </button>
  );
}

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  user: User;
}

function CreatePostModal({
  isOpen,
  onClose,
  onSubmit,
  user,
}: CreatePostModalProps) {
  const [step, setStep] = useState<"category" | "content">("category");
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | null>(null);
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("image", file);
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (response.ok) {
          const data = await response.json();
          setSelectedImage(data.url);
        }
      } catch (error) {
        console.error("Failed to upload image:", error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!selectedCategory || !content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("category", selectedCategory);
      formData.append("content", content);
      if (selectedImage) {
        formData.append("imageUrl", selectedImage);
      }
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep("category");
    setSelectedCategory(null);
    setContent("");
    setSelectedImage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex={-1}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-xl shadow-2xl"
        role="document"
      >
        {/* Modal header */}
        <div className="border-b border-gray-200 dark:border-gray-800 p-4 flex justify-between items-center">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900 dark:text-white">
            {step === "category" ? "Choose a category" : "Create a post"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            aria-label="Close modal"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal content */}
        <div className="p-4">
          {step === "category" ? (
            <>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                role="radiogroup"
                aria-label="Post category"
              >
                {categories.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => {
                      setSelectedCategory(category.value);
                      setStep("content");
                    }}
                    className={`p-3 rounded-lg border text-left hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors ${
                      selectedCategory === category.value
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:shadow-sm"
                    }`}
                    role="radio"
                    aria-checked={selectedCategory === category.value}
                  >
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {category.label}
                    </h3>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      user.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`
                    }
                    alt={user.name}
                    className="h-10 w-10 rounded-full"
                    crossOrigin="anonymous"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user.name}
                    </div>
                    {user.organization && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.organization}
                      </div>
                    )}
                  </div>
                </div>

                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What would you like to share?"
                  className="w-full min-h-[150px] p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  disabled={isSubmitting}
                />

                {/* Image Preview */}
                {selectedImage && (
                  <div className="relative">
                    <img
                      src={selectedImage}
                      alt="Preview"
                      className={`max-h-[300px] w-full object-contain rounded-lg ${
                        isUploading ? "opacity-50" : ""
                      }`}
                    />
                    {isUploading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white/90 dark:bg-gray-900/90 rounded-lg p-4 shadow-lg">
                          <div className="flex items-center space-x-3">
                            <svg
                              className="animate-spin h-5 w-5 text-blue-500"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              Preparing image...
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedImage(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        className="absolute top-2 right-2 p-1 bg-white/90 dark:bg-gray-900/90 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <svg
                          className="h-5 w-5 text-gray-500 dark:text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isSubmitting}
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("category")}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Back to category selection"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    aria-label="Add image"
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
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Add image
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!content.trim() || isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Posting..." : "Post"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function CreatePostForm({ user }: { user: User }) {
  const [isOpen, setIsOpen] = useState(false);
  const fetcher = useFetcher();

  const handleSubmit = async (formData: FormData) => {
    try {
      await fetcher.submit(formData, {
        method: "POST",
        action: "/api/posts",
        encType: "multipart/form-data",
      });
      setIsOpen(false);

      // Refresh the feed by revalidating the posts endpoint
      fetcher.load("/api/posts");
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  return (
    <>
      <PostTrigger user={user} onClick={() => setIsOpen(true)} />
      {isOpen && (
        <CreatePostModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSubmit={handleSubmit}
          user={user}
        />
      )}
    </>
  );
}
