import type { APIRoute } from "astro";
import { getKlaviyoConfig, saveKlaviyoConfig } from "../../../lib/klaviyoDb";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const cfg = await getKlaviyoConfig();
    return new Response(
      JSON.stringify({
        enabled: cfg.enabled,
        syncedForms: cfg.syncedForms,
        hasApiKey: Boolean(cfg.apiKey),
        listId: cfg.listId,
        cachedLists: cfg.cachedLists,
        cachedProperties: cfg.cachedProperties,
        lastSyncedAt: cfg.lastSyncedAt,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to load Klaviyo configuration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const saved = await saveKlaviyoConfig({
      enabled: Boolean(body?.enabled),
      syncedForms: Array.isArray(body?.syncedForms) ? body.syncedForms : undefined,
      apiKey: typeof body?.apiKey === "string" ? body.apiKey : undefined,
      listId: typeof body?.listId === "string" ? body.listId : undefined,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        enabled: saved.enabled,
        syncedForms: saved.syncedForms,
        hasApiKey: Boolean(saved.apiKey),
        listId: saved.listId,
        cachedLists: saved.cachedLists,
        cachedProperties: saved.cachedProperties,
        lastSyncedAt: saved.lastSyncedAt,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to save Klaviyo configuration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
