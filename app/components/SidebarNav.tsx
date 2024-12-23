import { Link, useNavigate } from "@remix-run/react";
import { PostCategory } from "~/types/post";

interface NavItem {
  label: string;
  value?: PostCategory | PostCategory[];
  href?: string;
  disabled?: boolean;
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
  { label: "People on the Move", href: "/people", disabled: true },
  { label: "Jobs", href: "/jobs", disabled: true },
  { label: "Resources", value: resourceCategories },
  { label: "Events", value: PostCategory.EVENTS },
  { label: "Vendor Directory", href: "/vendors", disabled: true },
  { label: "Community Q&A", href: "/community", disabled: true },
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

  const isSelected = (value: PostCategory | PostCategory[]) => {
    if (Array.isArray(value) && Array.isArray(selectedCategory)) {
      // Check if arrays have the same values (order doesn't matter)
      return (
        value.length === selectedCategory.length &&
        value.every((v) => selectedCategory.includes(v))
      );
    }
    if (!Array.isArray(value) && !Array.isArray(selectedCategory)) {
      // Compare single categories
      return value === selectedCategory;
    }
    return false;
  };

  const handleCategorySelect = (value: PostCategory | PostCategory[]) => {
    // If we're on the dashboard, always navigate to home with the category
    if (isDashboard) {
      const categoryParam = Array.isArray(value) ? value.join(",") : value;
      navigate(`/?category=${categoryParam}`);
      return;
    }

    // Normal home page behavior
    if (onCategorySelect) {
      const isCurrentlySelected = isSelected(value);
      const newValue = isCurrentlySelected ? null : value;
      onCategorySelect(newValue);

      // Update URL
      if (newValue) {
        const categoryParam = Array.isArray(newValue)
          ? newValue.join(",")
          : newValue;
        navigate(`/?category=${categoryParam}`);
      } else {
        navigate("/");
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const selected =
            !isDashboard && item.value ? isSelected(item.value) : false;

          if (item.href) {
            return (
              <Link
                key={item.label}
                to={item.href}
                className={`${
                  item.disabled
                    ? "opacity-50 cursor-not-allowed pointer-events-none"
                    : "cursor-pointer"
                } group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md w-full text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-300`}
                aria-disabled={item.disabled}
              >
                <span className="truncate">{item.label}</span>
                {item.disabled && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Coming soon
                  </span>
                )}
              </Link>
            );
          }

          return (
            <button
              key={item.label}
              onClick={() => item.value && handleCategorySelect(item.value)}
              className={`${
                selected
                  ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-300"
              } group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md w-full`}
            >
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto px-3">
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
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
        </div>
      </div>
    </div>
  );
}
