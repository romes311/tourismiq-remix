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
      // Get the avatar URL from Google profile
      const googlePhotoUrl = profile.photos?.[0]?.value;

      // Extract the Google photo ID from the temporary URL
      // The URL format is like: https://lh3.googleusercontent.com/a/ACg8ocIlitj-3zCF3G4Tu8HyvaDa5aHL59S8bIjst3IyvODZvFEq8DGm=s96-c
      const photoId = googlePhotoUrl?.split('/a/')?.[1]?.split('=')?.[0];

      // Construct a permanent URL with the photo ID
      const permanentAvatarUrl = photoId
        ? `https://lh3.googleusercontent.com/a/${photoId}=s96-c`
        : null;

      // Find or create the user in the database
      const user = await prisma.user.upsert({
        where: { email: profile.emails[0].value },
        update: {
          name: profile.displayName,
          avatar: permanentAvatarUrl,
        },
        create: {
          email: profile.emails[0].value,
          name: profile.displayName,
          avatar: permanentAvatarUrl,
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
