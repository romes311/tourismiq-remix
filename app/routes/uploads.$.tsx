import type { LoaderFunctionArgs } from "@remix-run/node";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";

export async function loader({ params }: LoaderFunctionArgs) {
  const filePath = path.join(
    process.cwd(),
    "public",
    "uploads",
    params["*"] || ""
  );

  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      throw new Error("Not a file");
    }

    const stream = createReadStream(filePath);
    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "image/*",
        "Content-Length": stats.size.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    throw new Response("Not Found", { status: 404 });
  }
}
