import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const result = await authenticator.authenticate("google", request);
    return result;
  } catch (error) {
    console.error("Error in Google auth loader:", error);
    throw error;
  }
}

export async function action({ request }: ActionFunctionArgs) {
  console.log("Initial Google auth route hit (POST)");
  try {
    const result = await authenticator.authenticate("google", request);
    return result;
  } catch (error) {
    console.error("Error in Google auth action:", error);
    throw error;
  }
}
