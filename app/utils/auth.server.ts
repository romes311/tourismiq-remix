import { Authenticator } from "remix-auth";
import { GoogleStrategy } from "remix-auth-google";
import { sessionStorage } from "./session.server";
import { prisma } from "./db.server";

// Define the user type
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  organization?: string | null;
  jobTitle?: string | null;
  linkedIn?: string | null;
  location?: string | null;
}

// Create an authenticator
export const authenticator = new Authenticator<User>(sessionStorage);

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientID || !clientSecret) {
  console.warn(
    "Google OAuth credentials not found. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file."
  );
}

console.log("Configuring Google Strategy with:", {
  clientID: clientID ? "Set" : "Not Set",
  clientSecret: clientSecret ? "Set" : "Not Set",
  callbackURL: "http://localhost:3000/auth/google/callback",
});

// Configure Google Strategy
authenticator.use(
  new GoogleStrategy(
    {
      clientID: clientID || "",
      clientSecret: clientSecret || "",
      callbackURL: "http://localhost:3000/auth/google/callback",
    },
    async ({ profile }) => {
      try {
        // Get the avatar URL from Google profile
        const avatar = profile.photos?.[0]?.value || null;

        // Get or create the user in the database
        const user = await prisma.user.upsert({
          where: { email: profile.emails[0].value },
          update: {
            name: profile.displayName,
            avatar: avatar,
          },
          create: {
            email: profile.emails[0].value,
            name: profile.displayName,
            organization: "", // Will be updated in onboarding
            avatar: avatar,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organization: user.organization,
          avatar: user.avatar,
        };
      } catch (error) {
        console.error("Error in Google strategy callback:", error);
        throw error;
      }
    }
  )
);

export async function requireUserId(request: Request): Promise<string> {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
  return user.id;
}
