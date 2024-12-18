import { Form } from "@remix-run/react";
import type { PostCategory } from "@prisma/client";

const categories: { label: string; value: PostCategory }[] = [
  { label: "Thought Leadership", value: "THOUGHT_LEADERSHIP" },
  { label: "News", value: "NEWS" },
  { label: "Events", value: "EVENTS" },
  { label: "Blog Post", value: "BLOG_POST" },
  { label: "Books", value: "BOOKS" },
  { label: "Courses", value: "COURSES" },
  { label: "Podcasts", value: "PODCASTS" },
  { label: "Presentations", value: "PRESENTATIONS" },
  { label: "Press Releases", value: "PRESS_RELEASES" },
  { label: "Templates", value: "TEMPLATES" },
  { label: "Videos", value: "VIDEOS" },
  { label: "Webinars", value: "WEBINARS" },
  { label: "Case Studies", value: "CASE_STUDIES" },
  { label: "Whitepapers", value: "WHITEPAPERS" },
];

export function CreatePostForm() {
  return (
    <Form
      method="post"
      action="/posts"
      className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-6"
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Category
          </label>
          <select
            id="category"
            name="category"
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Content
          </label>
          <textarea
            id="content"
            name="content"
            rows={4}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="What would you like to share?"
            required
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Post
          </button>
        </div>
      </div>
    </Form>
  );
}
