import type { UploadHandler } from "@remix-run/node";
import { writeFile } from "fs/promises";

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp"
];

export async function writeAsyncIterableToFile(asyncIterable: AsyncIterable<Uint8Array>, filePath: string) {
  const chunks: Uint8Array[] = [];
  for await (const chunk of asyncIterable) {
    chunks.push(chunk);
  }
  await writeFile(filePath, Buffer.concat(chunks));
}

export const uploadHandler: UploadHandler = async ({ name, contentType, data, filename }) => {
  if (name !== "image" || !filename) {
    return undefined;
  }

  if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
    throw new Error(`File type ${contentType} is not allowed`);
  }

  // Accumulate the file data and check size
  const chunks = [];
  let size = 0;

  for await (const chunk of data) {
    size += chunk.length;
    if (size > MAX_FILE_SIZE) {
      throw new Error("File is too large");
    }
    chunks.push(chunk);
  }

  // Create a new file object with the accumulated data
  return new File(chunks, filename, { type: contentType });
};
