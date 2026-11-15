import type { APIRoute } from "astro";
import { getKlaviyoConfig, saveKlaviyoConfig, testKlaviyoConnection } from "../../../lib/klaviyoDb";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const current = await getKlaviyoConfig();
    const apiKey =
      typeof body?.apiKey === "string" && body.apiKey.trim().length > 0
        ? body.apiKey.trim()
        : current.apiKey;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Please enter your Klaviyo Private API Key." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { lists, properties } = await testKlaviyoConnection(apiKey);
    const saved = await saveKlaviyoConfig({
      apiKey,
      cachedLists: lists,
      cachedProperties: properties,
      lastSyncedAt: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        lists: saved.cachedLists,
        properties: saved.cachedProperties,
        lastSyncedAt: saved.lastSyncedAt,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Klaviyo connection failed" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
};
