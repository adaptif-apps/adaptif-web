import type { APIRoute } from "astro";
import {
  getPageContent,
  listSitePagesForEditor,
  normalizeCmsPath,
  resetPageContent,
  savePageContent,
} from "../../../lib/cmsContentDb";
import { hasValidStudioSession } from "../../../lib/studioAuth";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  if (!hasValidStudioSession(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const path = normalizeCmsPath(url.searchParams.get("path") || "/");
    const [overrides, pages] = await Promise.all([
      getPageContent(path),
      listSitePagesForEditor(),
    ]);
    return new Response(JSON.stringify({ path, overrides, pages }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to load page content" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!hasValidStudioSession(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const path = normalizeCmsPath(String(body.path || "/"));
    const overrides = await savePageContent(path, body.overrides || {});
    return new Response(JSON.stringify({ ok: true, path, overrides }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to save page content" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const DELETE: APIRoute = async ({ url, cookies }) => {
  if (!hasValidStudioSession(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const path = normalizeCmsPath(url.searchParams.get("path") || "/");
    await resetPageContent(path);
    return new Response(JSON.stringify({ ok: true, path }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to reset page content" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
