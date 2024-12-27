import { json, unstable_parseMultipartFormData, type ActionFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/utils/auth.server";
import { writeAsyncIterableToFile, uploadHandler } from "~/utils/upload.server";
import path from "path";
import { mkdir } from "fs/promises";

export async function action({ request }: ActionFunctionArgs) {
  // Ensure user is authenticated
  await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Parse the multipart form data
    const formData = await unstable_parseMultipartFormData(request, uploadHandler);
    const file = formData.get("image");

    if (!file || typeof file === "string") {
      return json({ error: "No file uploaded" }, { status: 400 });
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const filePath = path.join(uploadsDir, filename);

    // Write the file
    await writeAsyncIterableToFile(file.stream(), filePath);

    // Return the URL
    return json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error("Failed to upload file:", error);
    return json({ error: "Failed to upload file" }, { status: 500 });
  }
}