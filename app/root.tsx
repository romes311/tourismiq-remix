import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticator } from "./utils/auth.server";
import type { User } from "./utils/auth.server";
import { Header } from "./components/Header";
import { sessionStorage } from "./utils/session.server";
import { ThemeProvider } from "./components/ThemeProvider";

import "./tailwind.css";

// Add this function to get the theme script
function getThemeScript() {
  return `
    (function() {
      let theme = window.localStorage.getItem('theme');
      if (!theme) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.classList.add(theme);
    })();
  `;
}

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
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const error = session.get("auth:error");
  const user = await authenticator.isAuthenticated(request);

  return json<LoaderData>({ user, error });
}

export function ErrorBoundary() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <title>Error!</title>
        <Links />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
          <h1 className="text-4xl font-bold">There was an error</h1>
          <p className="mt-4">Please try again later</p>
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { user, error } = useLoaderData<LoaderData>();

  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <title>TourismIQ - Connect with DMOs</title>
        <Links />
        <script dangerouslySetInnerHTML={{ __html: getThemeScript() }} />
      </head>
      <body className="h-full">
        <ThemeProvider>
          <div className="min-h-full">
            <Header user={user} />
            {error ? (
              <div className="m-2 rounded-md bg-red-100 p-2 text-red-700">
                {error}
              </div>
            ) : null}
            <Outlet />
          </div>
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
