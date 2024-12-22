import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = "public/uploads";

export async function saveImage(file: Blob): Promise<string> {
  // Ensure upload directory exists
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating upload directory:", error);
    throw new Error("Failed to create upload directory");
  }

  // Get the file extension from the content type
  const type = file.type.split("/")[1];
  const extension = type ? `.${type}` : ".jpg"; // Default to .jpg if no extension found

  const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  if (!allowedExtensions.includes(extension)) {
    throw new Error("Invalid file type. Only images are allowed.");
  }

  // Generate unique filename
  const filename = `${uuidv4()}${extension}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filepath, buffer);
    return `/uploads/${filename}`; // Return the public URL path
  } catch (error) {
    console.error("Error saving file:", error);
    throw new Error("Failed to save file");
  }
}

export async function uploadHandler(part: Blob) {
  const filename = await saveImage(part);
  return filename;
}
