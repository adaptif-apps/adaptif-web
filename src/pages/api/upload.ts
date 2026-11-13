import type { APIRoute } from "astro";
import { put } from "@vercel/blob";
import sharp from "sharp";

export const prerender = false;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|svg|avif|tiff?|bmp|heic|heif)$/i;

/**
 * Converts any supported image buffer to WebP (preserving animation for GIFs/animated images)
 * while avoiding double lossy compression when the input is already a valid WebP.
 */
async function ensureWebpBuffer(inputBuffer: Buffer): Promise<Buffer> {
  const image = sharp(inputBuffer, { animated: true });
  const meta = await image.metadata();
  if (meta.format === "webp") {
    return inputBuffer;
  }
  return sharp(inputBuffer, { animated: true })
    .rotate()
    .webp({ quality: 86, effort: 4 })
    .toBuffer();
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const token =
      process.env.BLOB_READ_WRITE_TOKEN || import.meta.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing BLOB_READ_WRITE_TOKEN configuration." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const rawFolder = formData.get("folder");
    const folder =
      typeof rawFolder === "string" && rawFolder.trim()
        ? rawFolder.trim().replace(/[^a-zA-Z0-9_-]/g, "") || "portfolio"
        : "portfolio";

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No image file provided." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isImage =
      file.type.startsWith("image/") || IMAGE_EXT_RE.test(file.name);
    if (!isImage) {
      return new Response(
        JSON.stringify({ error: "Only image files are supported." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (file.size > MAX_BYTES) {
      return new Response(
        JSON.stringify({ error: "Image exceeds 10 MB limit." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const webpBuffer = await ensureWebpBuffer(inputBuffer);

    const safeBaseName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_") || "image";
    const blob = await put(
      `${folder}/${Date.now()}-${safeBaseName}.webp`,
      webpBuffer,
      {
        access: "public",
        addRandomSuffix: true,
        contentType: "image/webp",
        token,
      }
    );

    return new Response(
      JSON.stringify({ url: blob.url, format: "webp", size: webpBuffer.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to upload image" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
