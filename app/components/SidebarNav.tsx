import { Form, Link, useNavigate } from "@remix-run/react";
import { PostCategory } from "@prisma/client";

interface NavItem {
  label: string;
  value?: PostCategory | PostCategory[];
  href?: string;
}

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

const navItems: NavItem[] = [
  { label: "Thought Leadership", value: PostCategory.THOUGHT_LEADERSHIP },
  { label: "News", value: PostCategory.NEWS },
  { label: "People on the Move", href: "/people" },
  { label: "Jobs", href: "/jobs" },
  { label: "Resources", value: resourceCategories },
  { label: "Events", value: PostCategory.EVENTS },
  { label: "Vendor Directory", href: "/vendors" },
  { label: "Community Q&A", href: "/community" },
];

interface SidebarNavProps {
  selectedCategory?: PostCategory | PostCategory[] | null;
  onCategorySelect?: (category: PostCategory | PostCategory[] | null) => void;
  isDashboard?: boolean;
}

export function SidebarNav({
  selectedCategory,
  onCategorySelect,
  isDashboard = false,
}: SidebarNavProps) {
  const navigate = useNavigate();

  const handleCategoryClick = (
    category: PostCategory | PostCategory[] | null
  ) => {
    if (isDashboard) {
      // If we're on the dashboard, navigate to home with the category filter
      navigate(
        `/?category=${Array.isArray(category) ? category.join(",") : category}`
      );
    } else {
      // Normal filter behavior
      onCategorySelect?.(category);
    }
  };

  const isSelected = (value: PostCategory | PostCategory[]) => {
    if (Array.isArray(value) && Array.isArray(selectedCategory)) {
      return value.every((v) => selectedCategory.includes(v));
    }
    return value === selectedCategory;
  };

  return (
    <div className="flex flex-col h-full">
      <nav className="space-y-4">
        {navItems.map((item) => {
          if (item.href) {
            return (
              <Link
                key={item.label}
                to={item.href}
                className="block px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                {item.label}
              </Link>
            );
          }

          return (
            <button
              key={item.label}
              onClick={() => handleCategoryClick(item.value || null)}
              className={`w-full flex items-center px-3 py-2 text-base rounded-md ${
                item.value && isSelected(item.value)
                  ? "bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-medium"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
            >
              {item.label}
            </button>
          );
        })}

        {/* Education (Coming Soon) */}
        <div className="px-3 py-2 text-base font-medium text-gray-400 dark:text-gray-500">
          Education (Coming Soon)
        </div>

        {/* Bookmarks */}
        <Link
          to="/bookmarks"
          className="flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          <svg
            className="h-5 w-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          Bookmarks
        </Link>
      </nav>

      {/* Newsletter */}
      <div className="mt-8">
        <h3 className="px-3 mb-2 text-base font-medium text-gray-900 dark:text-white">
          Subscribe to our Newsletter
        </h3>
        <Form method="post" action="/newsletter" className="px-3">
          <input
            type="email"
            name="email"
            placeholder="Email Address*"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
          />
          <button
            type="submit"
            className="mt-2 w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm"
          >
            Sign Up
          </button>
        </Form>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-8 px-3">
        <div className="flex space-x-4 text-sm text-gray-500 dark:text-gray-400">
          <Link
            to="/sponsorships"
            className="hover:text-gray-700 dark:hover:text-gray-300"
          >
            Sponsorships
          </Link>
          <Link
            to="/terms"
            className="hover:text-gray-700 dark:hover:text-gray-300"
          >
            Terms & Use
          </Link>
          <Link
            to="/privacy"
            className="hover:text-gray-700 dark:hover:text-gray-300"
          >
            Privacy Policy
          </Link>
        </div>
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          © TourismIQ 2024. All rights reserved.
        </div>
      </div>
    </div>
  );
}
