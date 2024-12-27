import { useState, useEffect, useRef } from "react";
import { useFetcher } from "@remix-run/react";
import type { User } from "~/utils/auth.server";

interface UserAboutTabProps {
  user: User;
  isOwnProfile?: boolean;
  onUserUpdate?: (user: User) => void;
}

interface FetcherData {
  error?: string;
  success?: boolean;
  user?: User;
}

export function UserAboutTab({
  user,
  isOwnProfile = false,
  onUserUpdate,
}: UserAboutTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const fetcher = useFetcher<FetcherData>();
  const formRef = useRef<HTMLFormElement>(null);

  // Update parent when user data changes
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data.user) {
      onUserUpdate?.(fetcher.data.user);
    }
  }, [fetcher.data, onUserUpdate]);

  const handleSave = () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      fetcher.submit(formData, {
        method: "post",
        action: "/api/user/update",
      });
      setIsEditing(false);
    }
  };

  const Field = ({
    label,
    name,
    defaultValue,
    type = "text",
  }: {
    label: string;
    name: string;
    defaultValue: string;
    type?: string;
  }) => {
    return (
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </h3>
          {name === "linkedIn" && (
            <a
              href={defaultValue}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              Visit Profile
            </a>
          )}
        </div>
        {isEditing ? (
          <input
            type={type}
            name={name}
            defaultValue={defaultValue}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <p className="mt-1 text-sm text-gray-900 dark:text-white">
            {defaultValue}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <fetcher.Form ref={formRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h2>
            <div className="space-y-4">
              <Field
                label="First Name"
                name="firstName"
                defaultValue={user.name.split(" ")[0]}
              />
              <Field
                label="Last Name"
                name="lastName"
                defaultValue={user.name.split(" ")[1] || ""}
              />
              <Field
                label="Location"
                name="location"
                defaultValue={user.location || ""}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Professional Information</h2>
            <div className="space-y-4">
              <Field
                label="Job Title"
                name="jobTitle"
                defaultValue={user.jobTitle || ""}
              />
              <Field
                label="Company/Organization"
                name="organization"
                defaultValue={user.organization || ""}
              />
              <Field
                label="LinkedIn"
                name="linkedIn"
                defaultValue={user.linkedIn || ""}
              />
            </div>
          </div>
        </div>
      </fetcher.Form>

      {isOwnProfile && (
        <div className="flex justify-end pt-4">
          {isEditing ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  formRef.current?.reset();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Edit Profile
            </button>
          )}
        </div>
      )}

      {fetcher.state === "submitting" && (
        <div className="text-sm text-blue-600 dark:text-blue-400">
          Saving changes...
        </div>
      )}
      {fetcher.state === "idle" && fetcher.data?.error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {fetcher.data.error}
        </div>
      )}
    </div>
  );
}
