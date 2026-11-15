import type { APIRoute } from "astro";
import {
  deleteActivityItem,
  listUnifiedActivity,
  updateBookCallStatus,
  type ActivityType
} from "../../../lib/activityDb";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const items = await listUnifiedActivity();
    const counts = {
      all: items.length,
      book_call: items.filter((i) => i.type === "book_call").length,
      plan: items.filter((i) => i.type === "plan").length,
      course: items.filter((i) => i.type === "course").length
    };

    return new Response(JSON.stringify({ items, counts }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to load activity" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const id = Number(body?.id);
    const status = String(body?.status ?? "").trim();

    if (!Number.isFinite(id) || id <= 0) {
      return new Response(JSON.stringify({ error: "Invalid record id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    await updateBookCallStatus(id, status);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to update status" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const type = String(body?.type ?? "") as ActivityType;
    const id = Number(body?.id);

    if (!["book_call", "plan", "course"].includes(type) || !Number.isFinite(id) || id <= 0) {
      return new Response(JSON.stringify({ error: "Invalid type or id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    await deleteActivityItem(type, id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to delete activity record" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
