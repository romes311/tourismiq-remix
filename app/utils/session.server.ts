import { createCookieSessionStorage } from "@remix-run/node";

// Export the whole sessionStorage object
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session", // use any name you want here
    sameSite: "lax", // this helps with CSRF
    path: "/", // remember to add this so the cookie will work in all routes
    httpOnly: true, // for security reasons, make this cookie http only
    secrets: [process.env.SESSION_SECRET || "default-secret"], // replace this with an actual secret from env
    secure: process.env.NODE_ENV === "production", // enable this in prod only
  },
});

// You can also export the methods individually for better naming
export const { getSession, commitSession, destroySession } = sessionStorage;
