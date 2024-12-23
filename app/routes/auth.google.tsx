import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/dashboard";

  await authenticator.authenticate("google", request, {
    successRedirect: returnTo,
    failureRedirect: "/login",
  });
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
