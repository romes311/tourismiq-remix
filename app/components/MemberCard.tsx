import { Link, useFetcher } from "@remix-run/react";
import { useEffect } from "react";
import { useToast } from "~/hooks/use-toast";
import type { Member } from "~/types/member";

interface ConnectionResponse {
  success?: boolean;
  error?: string;
}

function getConnectionStatus(member: Member) {
  const receivedConnection = member.receivedConnections[0];
  const sentConnection = member.sentConnections[0];

  if (receivedConnection) {
    return receivedConnection.status === "rejected" ? null : receivedConnection.status;
  }
  if (sentConnection) {
    return sentConnection.status === "rejected" ? null : sentConnection.status;
  }
  return null;
}

export function MemberCard({ member }: { member: Member }) {
  const memberFetcher = useFetcher<ConnectionResponse>();
  const { toast } = useToast();
  const connectionStatus = getConnectionStatus(member);

  // Handle connection response for this member
  useEffect(() => {
    if (memberFetcher.state === "idle" && memberFetcher.data) {
      if (memberFetcher.data.success) {
        toast({
          title: "Success",
          description: "Connection request sent successfully",
          variant: "success",
        });
      } else if (memberFetcher.data.error) {
        toast({
          title: "Error",
          description: memberFetcher.data.error,
          variant: "destructive",
        });
      }
    }
  }, [memberFetcher.state, memberFetcher.data, toast]);

  return (
    <div className="bg-white dark:bg-gray-950 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col items-center text-center">
      <img
        src={
          member.avatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name || ""}`
        }
        alt={member.name || "Member"}
        className="h-24 w-24 rounded-full mb-4"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        {member.name}
      </h2>
      {member.jobTitle && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {member.jobTitle}
        </p>
      )}
      {member.organization && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {member.organization}
        </p>
      )}
      {member.location && (
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          {member.location}
        </p>
      )}
      <div className="flex gap-3 mt-4">
        {connectionStatus ? (
          <button
            disabled
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-400 cursor-not-allowed"
          >
            {connectionStatus === "pending"
              ? "Connection Pending"
              : connectionStatus === "accepted"
              ? "Connected"
              : "Connection Rejected"}
          </button>
        ) : (
          <memberFetcher.Form
            method="post"
            action="/api/connections"
          >
            <input type="hidden" name="userId" value={member.id} />
            <button
              type="submit"
              disabled={memberFetcher.state !== "idle"}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {memberFetcher.state !== "idle" ? "Sending..." : "Connect"}
            </button>
          </memberFetcher.Form>
        )}
        <Link
          to={`/profile/${member.id}`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
}