import type { APIRoute } from "astro";
import { put } from "@vercel/blob";

export const prerender = false;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

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

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No image file provided." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!file.type.startsWith("image/")) {
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

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`portfolio/${Date.now()}-${safeName}`, file, {
      access: "public",
      addRandomSuffix: true,
      token,
    });

    return new Response(JSON.stringify({ url: blob.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to upload image" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
