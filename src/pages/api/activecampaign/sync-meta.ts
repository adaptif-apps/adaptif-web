import type { APIRoute } from "astro";
import {
  fetchActiveCampaignMetadata,
  getActiveCampaignConfig,
  saveActiveCampaignConfig,
} from "../../../lib/activeCampaignDb";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const current = await getActiveCampaignConfig();

    const apiUrl = String(body?.apiUrl || current.apiUrl || "").trim();
    const apiKey = String(body?.apiKey || current.apiKey || "").trim();

    if (!apiUrl || !apiKey) {
      return new Response(
        JSON.stringify({ error: "Please enter both your ActiveCampaign Account URL and API Key." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const meta = await fetchActiveCampaignMetadata(apiUrl, apiKey);

    await saveActiveCampaignConfig({
      apiUrl,
      apiKey,
      cachedLists: meta.lists,
      cachedTags: meta.tags,
      cachedFields: meta.fields,
      lastSyncedAt: meta.lastSyncedAt,
    });

    return new Response(JSON.stringify(meta), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to connect to ActiveCampaign" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
};
