import type { APIRoute } from "astro";
import { getBookCallConfig, saveBookCallConfig } from "../../../lib/bookCallDb";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const config = await getBookCallConfig();
    return new Response(JSON.stringify({ config }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to load Book a Call configuration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const config = await saveBookCallConfig(body || {});
    return new Response(JSON.stringify({ config }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to save Book a Call configuration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
