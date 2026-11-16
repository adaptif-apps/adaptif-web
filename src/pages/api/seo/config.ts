import type { APIRoute } from "astro";
import { getSeoConfig, saveSeoConfig } from "../../../lib/seoDb";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const config = await getSeoConfig({ bypassCache: true });
    return new Response(JSON.stringify({ config }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to load SEO configuration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const config = await saveSeoConfig(body || {});
    return new Response(JSON.stringify({ ok: true, config }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to save SEO configuration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
