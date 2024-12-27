import { Link } from "@remix-run/react";
import { PostCategory } from "~/types/post";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { BookmarkIcon } from "lucide-react";

const resourceCategories = [
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
];

interface SidebarNavProps {
  selectedCategory?: PostCategory | PostCategory[] | null;
  onCategorySelect: (category: PostCategory | PostCategory[] | null) => void;
}

export function SidebarNav({ selectedCategory, onCategorySelect }: SidebarNavProps) {
  const isSelected = (value: PostCategory | PostCategory[]) => {
    if (Array.isArray(value) && Array.isArray(selectedCategory)) {
      return (
        value.length === selectedCategory.length &&
        value.every((v) => selectedCategory.includes(v))
      );
    }
    if (!Array.isArray(value) && !Array.isArray(selectedCategory)) {
      return value === selectedCategory;
    }
    return false;
  };

  return (
    <nav className="space-y-8">
      {/* Main Navigation */}
      <div className="space-y-2">
        <button
          onClick={() => onCategorySelect(PostCategory.THOUGHT_LEADERSHIP)}
          className={`w-full text-left px-2 py-2 text-lg font-medium transition-colors hover:text-blue-600 dark:hover:text-blue-400 ${
            isSelected(PostCategory.THOUGHT_LEADERSHIP)
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          Thought Leadership
        </button>
        <button
          onClick={() => onCategorySelect(PostCategory.NEWS)}
          className={`w-full text-left px-2 py-2 text-lg font-medium transition-colors hover:text-blue-600 dark:hover:text-blue-400 ${
            isSelected(PostCategory.NEWS)
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          News
        </button>
        <Link
          to="/people"
          className="block px-2 py-2 text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
        >
          People on the Move
        </Link>
        <div className="px-2 py-2 text-lg font-medium text-gray-400 dark:text-gray-500">
          Jobs
        </div>
        <button
          onClick={() => onCategorySelect(resourceCategories)}
          className={`w-full text-left px-2 py-2 text-lg font-medium transition-colors hover:text-blue-600 dark:hover:text-blue-400 ${
            isSelected(resourceCategories)
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          Resources
        </button>
        <button
          onClick={() => onCategorySelect(PostCategory.EVENTS)}
          className={`w-full text-left px-2 py-2 text-lg font-medium transition-colors hover:text-blue-600 dark:hover:text-blue-400 ${
            isSelected(PostCategory.EVENTS)
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          Events
        </button>
        <div className="px-2 py-2 text-lg font-medium text-gray-400 dark:text-gray-500">
          Vendor Directory
        </div>
        <div className="px-2 py-2 text-lg font-medium text-gray-400 dark:text-gray-500">
          Community Q&A
        </div>
        <div className="px-2 py-2 text-lg font-medium text-gray-400 dark:text-gray-500">
          Education (Coming Soon)
        </div>
      </div>

      {/* Bookmarks Section */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
        <Link
          to="/bookmarks"
          className="flex items-center px-2 py-2 text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <BookmarkIcon className="h-5 w-5 mr-2" />
          Bookmarks
        </Link>
      </div>

      {/* Newsletter Section */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Subscribe to our Newsletter
          </h3>
          <form className="space-y-2">
            <Input
              type="email"
              placeholder="Email Address*"
              className="bg-white dark:bg-gray-800"
            />
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Sign Up
            </Button>
          </form>
        </div>
      </div>

      {/* Footer Links */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-800 text-sm">
        <div className="flex gap-4 text-gray-600 dark:text-gray-400">
          <Link to="/sponsorships" className="hover:text-blue-600 dark:hover:text-blue-400">
            Sponsorships
          </Link>
          <span>|</span>
          <Link to="/terms" className="hover:text-blue-600 dark:hover:text-blue-400">
            Terms & Use
          </Link>
          <span>|</span>
          <Link to="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400">
            Privacy Policy
          </Link>
        </div>
        <div className="mt-4 text-gray-500 dark:text-gray-500">
          © TourismIQ 2024. All rights reserved.
        </div>
      </div>
    </nav>
  );
}
