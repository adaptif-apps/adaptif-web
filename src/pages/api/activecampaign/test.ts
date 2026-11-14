import type { APIRoute } from "astro";
import { getActiveCampaignConfig, syncLeadToActiveCampaign } from "../../../lib/activeCampaignDb";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const config = await getActiveCampaignConfig();

    const effectiveConfig = {
      ...config,
      apiUrl: String(body?.apiUrl || config.apiUrl || "").trim(),
      apiKey: String(body?.apiKey || config.apiKey || "").trim(),
      listId: body?.listId !== undefined ? String(body.listId) : config.listId,
      tagIds: Array.isArray(body?.tagIds) ? body.tagIds.map(String) : config.tagIds,
      tagFromHelpTopic:
        body?.tagFromHelpTopic !== undefined ? Boolean(body.tagFromHelpTopic) : config.tagFromHelpTopic,
      mapping: body?.mapping ? { ...config.mapping, ...body.mapping } : config.mapping,
    };

    const testEmail = String(body?.email || "test-lead@adaptif.studio").trim();
    const res = await syncLeadToActiveCampaign(
      {
        fullName: "Alex Rivera (Test)",
        workEmail: testEmail,
        helpTopic: "Dedicated Creative Team",
        projectGoal: "Test sync from Adaptif Studio Preferences",
        referenceLink: "https://adaptif-web.vercel.app",
        timeline: "Within 2–4 weeks",
        budgetRange: "$6,000 – $10,000 / mo",
        notes: "Automated test contact from Adaptif Book a Call mapping.",
      },
      effectiveConfig
    );

    return new Response(JSON.stringify({ ok: true, contactId: res.contactId, email: testEmail }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Test sync failed" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
};
