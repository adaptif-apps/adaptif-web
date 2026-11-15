import type { APIRoute } from "astro";
import { getBookCallConfig, saveBookCallConfig, type FormField } from "../../../lib/bookCallDb";
import {
  createActiveCampaignCustomField,
  getActiveCampaignConfig,
  listActiveCampaignCustomFieldsWithOptions,
} from "../../../lib/activeCampaignDb";
import { getActiveCrmProvider } from "../../../lib/klaviyoDb";

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
    let config = await saveBookCallConfig(body || {});

    // Auto-push any newly added custom fields to ActiveCampaign when AC is active
    try {
      const provider = await getActiveCrmProvider();
      if ((provider === "activecampaign" || provider === "both") && Array.isArray(config.fields)) {
        const acConfig = await getActiveCampaignConfig();
        if (acConfig.enabled && acConfig.apiUrl && acConfig.apiKey) {
          const coreIds = new Set([
            "fullName",
            "workEmail",
            "helpTopic",
            "projectGoal",
            "referenceLink",
            "timeline",
            "budgetRange",
            "notes",
          ]);
          const needsPush = config.fields.some((f) => !coreIds.has(f.id) && !f.acFieldId);
          if (needsPush) {
            const existingAc = await listActiveCampaignCustomFieldsWithOptions(acConfig).catch(() => []);
            const byTitle = new Map(existingAc.map((f) => [f.title.toLowerCase(), f.id]));
            let changed = false;
            const nextFields: FormField[] = [];
            for (const f of config.fields) {
              if (coreIds.has(f.id) || f.acFieldId) {
                nextFields.push(f);
                continue;
              }
              const matchedId = byTitle.get(f.label.toLowerCase());
              if (matchedId) {
                nextFields.push({ ...f, acFieldId: matchedId });
                changed = true;
                continue;
              }
              try {
                const created = await createActiveCampaignCustomField(acConfig, f);
                nextFields.push({ ...f, acFieldId: created.id });
                changed = true;
              } catch {
                nextFields.push(f);
              }
            }
            if (changed) {
              config = await saveBookCallConfig({ fields: nextFields });
            }
          }
        }
      }
    } catch (syncErr) {
      console.error("[book-call/config] Auto-push to ActiveCampaign failed:", syncErr);
    }

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
