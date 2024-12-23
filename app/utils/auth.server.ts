import { Authenticator } from "remix-auth";
import { GoogleStrategy } from "remix-auth-google";
import { sessionStorage } from "./session.server";
import { prisma } from "./db.server";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  organization: string | null;
  jobTitle: string | null;
  linkedIn: string | null;
  location: string | null;
}

// Create an instance of the authenticator
export const authenticator = new Authenticator<User>(sessionStorage, {
  sessionKey: "user",
  sessionErrorKey: "auth:error",
});

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Missing Google OAuth credentials");
}

// Configure Google OAuth2 strategy
authenticator.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async ({ profile }) => {
      // Find or create the user in the database
      const user = await prisma.user.upsert({
        where: { email: profile.emails[0].value },
        update: {
          name: profile.displayName,
          avatar: profile.photos?.[0]?.value || null,
        },
        create: {
          email: profile.emails[0].value,
          name: profile.displayName,
          avatar: profile.photos?.[0]?.value || null,
          organization: "",
        },
      });

      // Return the user object
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        organization: user.organization,
        jobTitle: user.jobTitle,
        linkedIn: user.linkedIn,
        location: user.location,
      };
    }
  )
);

export async function requireUserId(request: Request): Promise<string> {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
  return user.id;
}
