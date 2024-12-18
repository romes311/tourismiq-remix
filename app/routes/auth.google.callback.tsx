import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  console.log("Callback route hit (GET)", {
    url: request.url,
    method: request.method,
  });

  try {
    const result = await authenticator.authenticate("google", request, {
      successRedirect: "/dashboard",
      failureRedirect: "/login",
    });
    return result;
  } catch (error) {
    console.error("Error in callback authentication:", error);
    throw error;
  }
}

export async function action({ request }: LoaderFunctionArgs) {
  console.log("Callback route hit (POST)", {
    url: request.url,
    method: request.method,
  });

  try {
    const result = await authenticator.authenticate("google", request, {
      successRedirect: "/dashboard",
      failureRedirect: "/login",
    });
    return result;
  } catch (error) {
    console.error("Error in callback authentication:", error);
    throw error;
  }
}
