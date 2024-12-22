import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { authenticator } from "./utils/auth.server";
import type { User } from "./utils/auth.server";
import { prisma } from "./utils/db.server";
import { Header } from "./components/Header";
import { sessionStorage } from "./utils/session.server";

import "./tailwind.css";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

interface LoaderData {
  user: User | null;
  error: string | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  // Get the session from the cookie
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const error = session.get("auth:error");

  // First check if we have a session
  const sessionUser = await authenticator.isAuthenticated(request);

  // If no session user, return early with null user
  if (!sessionUser) {
    // If there was an error during auth, we want to clear it from the session
    if (error) {
      session.unset("auth:error");
      return json<LoaderData>(
        { user: null, error },
        {
          headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
          },
        }
      );
    }
    return json<LoaderData>({ user: null, error: null });
  }

  try {
    // Get fresh user data from the database
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        organization: true,
        jobTitle: true,
        linkedIn: true,
        location: true,
      },
    });

    if (!user) {
      // If user not found in database, destroy session and redirect to login
      return redirect("/login", {
        headers: {
          "Set-Cookie": await sessionStorage.destroySession(session),
        },
      });
    }

    // Update session with fresh user data
    session.set(authenticator.sessionKey, user);

    return json<LoaderData>(
      { user, error: null },
      {
        headers: {
          "Set-Cookie": await sessionStorage.commitSession(session),
        },
      }
    );
  } catch (error) {
    console.error("Error in root loader:", error);
    return json<LoaderData>(
      { user: null, error: "An error occurred. Please try again." },
      {
        headers: {
          "Set-Cookie": await sessionStorage.destroySession(session),
        },
      }
    );
  }
}

function Document({
  children,
  title = "TourismIQ - Connect with DMOs",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <title>{title}</title>
        <Links />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  return (
    <Document title="Error!">
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="text-4xl font-bold">There was an error</h1>
        <p className="mt-4">Please try again later</p>
      </div>
    </Document>
  );
}

export default function App() {
  const { user, error } = useLoaderData<typeof loader>();

  return (
    <Document>
      {error && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white p-2 text-center">
          {error}
        </div>
      )}
      <Header user={user} />
      <Outlet />
    </Document>
  );
}
