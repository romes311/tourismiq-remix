import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = "public/uploads";

export async function uploadImage(file: Blob): Promise<string> {
  // Ensure upload directory exists
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating upload directory:", error);
    throw new Error("Failed to create upload directory");
  }

  // Generate unique filename with extension
  const filename = `${uuidv4()}.png`;
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

// Alias for backward compatibility
export const saveImage = uploadImage;
