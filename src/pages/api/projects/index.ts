import type { APIRoute } from "astro";
import { createProject, listProjects } from "../../../lib/portfolioDb";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const includeHidden = url.searchParams.get("all") === "true";
    const projects = await listProjects({ includeHidden });
    return new Response(JSON.stringify({ projects }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to load projects" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body?.title || !body?.image) {
      return new Response(
        JSON.stringify({ error: "Both title and thumbnail image are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const project = await createProject({
      id: body.id,
      title: String(body.title),
      description: String(body.description ?? ""),
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      image: String(body.image),
      gallery: Array.isArray(body.gallery) ? body.gallery.map(String) : [],
      isPublished: body.isPublished !== false,
      showOnHome: Boolean(body.showOnHome ?? false),
    });

    return new Response(JSON.stringify({ project }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to create project" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
