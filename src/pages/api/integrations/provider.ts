import type { APIRoute } from "astro";
import {
  getActiveCrmProvider,
  saveActiveCrmProvider,
  type CrmProvider,
} from "../../../lib/klaviyoDb";

export const prerender = false;

export const GET: APIRoute = async () => {
  const provider = await getActiveCrmProvider();
  return new Response(JSON.stringify({ provider }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const p = String(body?.provider ?? "") as CrmProvider;
    if (!["activecampaign", "klaviyo", "both", "none"].includes(p)) {
      return new Response(JSON.stringify({ error: "Invalid CRM provider" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const provider = await saveActiveCrmProvider(p);
    return new Response(JSON.stringify({ ok: true, provider }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to update CRM provider" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
