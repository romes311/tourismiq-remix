import { Authenticator } from "remix-auth";
import { GoogleStrategy } from "remix-auth-google";
import { sessionStorage } from "./session.server";
import { db } from "./db.server";

// Define the user type
export interface User {
  id: string;
  email: string;
  name: string;
  organization?: string;
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
    async ({ profile, accessToken }) => {
      console.log("Google auth callback received:", {
        profile: {
          email: profile.emails[0].value,
          name: profile.displayName,
        },
        accessTokenPresent: !!accessToken,
      });

      try {
        // Get or create the user in the database
        const user = await db.user.upsert({
          where: { email: profile.emails[0].value },
          update: {
            name: profile.displayName,
          },
          create: {
            email: profile.emails[0].value,
            name: profile.displayName,
            organization: "", // Will be updated in onboarding
          },
        });

        console.log("User upserted successfully:", {
          id: user.id,
          email: user.email,
          name: user.name,
          hasOrganization: !!user.organization,
        });

        const sessionUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          organization: user.organization,
        };

        console.log("Returning session user:", sessionUser);
        return sessionUser;
      } catch (error) {
        console.error("Error in Google strategy callback:", error);
        throw error;
      }
    }
  )
);
