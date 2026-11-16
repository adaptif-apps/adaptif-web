import type { APIRoute } from "astro";
import { createBlogPost, listBlogPosts } from "../../../../lib/blogDb";
import { hasValidStudioSession } from "../../../../lib/studioAuth";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const includeDrafts =
      url.searchParams.get("includeDrafts") === "1" && hasValidStudioSession(cookies);
    const posts = await listBlogPosts({ includeDrafts });
    return new Response(JSON.stringify({ posts }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to list blog posts" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!hasValidStudioSession(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const body = await request.json().catch(() => ({}));
    if (!body?.title || typeof body.title !== "string") {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const post = await createBlogPost(body);
    return new Response(JSON.stringify({ ok: true, post }), {
      status: 201,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to create blog post" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
