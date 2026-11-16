import type { APIRoute } from "astro";
import { deleteBlogPost, getBlogPostById, updateBlogPost } from "../../../../lib/blogDb";
import { hasValidStudioSession } from "../../../../lib/studioAuth";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  try {
    const post = await getBlogPostById(params.id || "");
    if (!post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ post }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to fetch blog post" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  if (!hasValidStudioSession(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const post = await updateBlogPost(params.id || "", body || {});
    if (!post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, post }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to update blog post" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  if (!hasValidStudioSession(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    await deleteBlogPost(params.id || "");
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to delete blog post" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
