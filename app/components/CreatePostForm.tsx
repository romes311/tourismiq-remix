import { useNavigation, type FetcherWithComponents } from "@remix-run/react";
import { useState, useRef, useEffect } from "react";
import type { User } from "~/utils/auth.server";
import { PostCategory } from "~/types/post";

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
      className="w-full bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-6 text-left hover:bg-gray-50 dark:hover:bg-gray-900"
    >
      <div className="flex items-center gap-3">
        <img
          src={
            user.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`
          }
          alt={user.name}
          className="h-10 w-10 rounded-full"
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
  onSubmit: () => void;
  user: User;
  fetcher: FetcherWithComponents<unknown>;
}

function CreatePostModal({
  isOpen,
  onClose,
  onSubmit,
  user,
  fetcher,
}: CreatePostModalProps) {
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" || fetcher.state === "submitting";
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | "">(
    ""
  );
  const [step, setStep] = useState<"category" | "content">("category");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const isUploading =
    fetcher.state === "submitting" && fetcher.formData?.get("image");

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const handleClose = () => {
    onClose();
    setSelectedCategory("");
    setStep("category");
    setSelectedImage(null);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }

      const url = URL.createObjectURL(file);
      setSelectedImage(url);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Cleanup object URLs when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    // If there's a selected image but no file input (because we're using a preview),
    // we need to get the file from the file input ref
    if (
      selectedImage &&
      !formData.get("image") &&
      fileInputRef.current?.files?.[0]
    ) {
      formData.set("image", fileInputRef.current.files[0]);
    }

    fetcher.submit(formData, {
      method: "post",
      action: "/?index",
      encType: "multipart/form-data",
    });
    onSubmit();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-white w-full max-w-2xl rounded-xl shadow-2xl"
        role="document"
      >
        {/* Modal header */}
        <div className="border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
            {step === "category" ? "Choose a category" : "Create a post"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded-full"
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
                    className={`p-3 rounded-lg border text-left hover:border-blue-500 hover:bg-blue-50/50 transition-colors ${
                      selectedCategory === category.value
                        ? "border-blue-500 bg-blue-50/50"
                        : "border-gray-200 hover:shadow-sm"
                    }`}
                    role="radio"
                    aria-checked={selectedCategory === category.value}
                  >
                    <h3 className="font-medium text-gray-900">
                      {category.label}
                    </h3>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <fetcher.Form
              ref={formRef}
              method="post"
              action="/?index"
              className="space-y-4"
              onSubmit={handleSubmit}
              encType="multipart/form-data"
              aria-label="Create post form"
            >
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={
                    user.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`
                  }
                  alt=""
                  aria-hidden="true"
                  className="h-12 w-12 rounded-full"
                />
                <div>
                  <div className="font-medium text-gray-900">{user.name}</div>
                  {user.organization && (
                    <div className="text-sm text-gray-500">
                      {user.organization}
                    </div>
                  )}
                </div>
              </div>

              <input type="hidden" name="category" value={selectedCategory} />
              <div>
                <label htmlFor="content" className="sr-only">
                  Post content
                </label>
                <textarea
                  name="content"
                  rows={4}
                  className="block w-full rounded-lg border-0 px-3 py-2 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:focus:ring-blue-500 dark:bg-gray-900 sm:text-sm sm:leading-6"
                  placeholder="What would you like to share?"
                  required
                  aria-label="Post content"
                />
              </div>

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
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Preparing image...
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full"
                      aria-label="Remove image"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                name="image"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
                aria-label="Upload image"
              />

              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("category")}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Back to category selection"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  aria-busy={isSubmitting}
                  aria-disabled={isSubmitting}
                >
                  {isUploading
                    ? "Uploading..."
                    : isSubmitting
                    ? "Posting..."
                    : "Post"}
                </button>
              </div>
            </fetcher.Form>
          )}
        </div>
      </div>
    </div>
  );
}

interface CreatePostFormProps {
  user: User;
  fetcher: FetcherWithComponents<unknown>;
}

export function CreatePostForm({ user, fetcher }: CreatePostFormProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = () => {
    setTimeout(() => {
      setIsModalOpen(false);
    }, 100);
  };

  return (
    <>
      <PostTrigger user={user} onClick={() => setIsModalOpen(true)} />
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        user={user}
        fetcher={fetcher}
      />
    </>
  );
}
