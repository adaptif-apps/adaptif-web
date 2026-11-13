import type { APIRoute } from "astro";
import { reorderProjects } from "../../../lib/portfolioDb";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const orderedIds = Array.isArray(body?.orderedIds)
      ? body.orderedIds.map(String)
      : [];

    if (orderedIds.length === 0) {
      return new Response(JSON.stringify({ error: "orderedIds is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await reorderProjects(orderedIds);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to reorder projects" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
