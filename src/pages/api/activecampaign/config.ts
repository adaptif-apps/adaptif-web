import type { APIRoute } from "astro";
import { getActiveCampaignConfig, saveActiveCampaignConfig } from "../../../lib/activeCampaignDb";

export const prerender = false;

function sanitizeForClient(config: Awaited<ReturnType<typeof getActiveCampaignConfig>>) {
  const { apiKey, ...rest } = config;
  return {
    ...rest,
    hasApiKey: Boolean(apiKey),
  };
}

export const GET: APIRoute = async () => {
  try {
    const config = await getActiveCampaignConfig();
    return new Response(JSON.stringify({ config: sanitizeForClient(config) }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to load ActiveCampaign config" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const saved = await saveActiveCampaignConfig({
      enabled: body?.enabled,
      apiUrl: body?.apiUrl,
      apiKey: typeof body?.apiKey === "string" && body.apiKey.trim() ? body.apiKey.trim() : undefined,
      listId: body?.listId,
      tagIds: Array.isArray(body?.tagIds) ? body.tagIds : undefined,
      tagFromHelpTopic: body?.tagFromHelpTopic,
      mapping: body?.mapping,
    });

    return new Response(JSON.stringify({ config: sanitizeForClient(saved) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to save ActiveCampaign config" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
