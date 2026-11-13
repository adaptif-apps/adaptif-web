import type { APIRoute } from "astro";
import { deleteProject, updateProject } from "../../../lib/portfolioDb";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing project ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const updated = await updateProject(id, {
      title: body.title !== undefined ? String(body.title) : undefined,
      description: body.description !== undefined ? String(body.description) : undefined,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
      image: body.image !== undefined ? String(body.image) : undefined,
      gallery: Array.isArray(body.gallery) ? body.gallery.map(String) : undefined,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
      isPublished: body.isPublished !== undefined ? Boolean(body.isPublished) : undefined,
    });

    if (!updated) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ project: updated }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to update project" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing project ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const deleted = await deleteProject(id);
    if (!deleted) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to delete project" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
