import type { APIRoute } from "astro";
import { createBookCallSubmission, getBookCallConfig } from "../../../lib/bookCallDb";
import { getActiveCampaignConfig, syncLeadToActiveCampaign } from "../../../lib/activeCampaignDb";
import { getKlaviyoConfig, syncLeadToKlaviyo } from "../../../lib/klaviyoDb";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const fullName = String(body?.fullName ?? "").trim();
    const workEmail = String(body?.workEmail ?? "").trim();

    if (!fullName || !workEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) {
      return new Response(
        JSON.stringify({ error: "Please provide your full name and a valid work email." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const rawExtra = body?.extraFields && typeof body.extraFields === "object" ? body.extraFields : {};
    const extraFields: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawExtra)) {
      if (v !== undefined && v !== null && String(v).trim()) {
        extraFields[String(k)] = String(v).trim();
      }
    }

    const submission = {
      fullName,
      workEmail,
      helpTopic: String(body?.helpTopic ?? ""),
      projectGoal: String(body?.projectGoal ?? ""),
      referenceLink: String(body?.referenceLink ?? ""),
      timeline: String(body?.timeline ?? ""),
      budgetRange: String(body?.budgetRange ?? ""),
      notes: String(body?.notes ?? ""),
      extraFields,
    };

    const result = await createBookCallSubmission(submission);

    // Sync to enabled CRM integrations (non-blocking for lead capture)
    try {
      const [acConfig, klaviyoConfig, formConfig] = await Promise.all([
        getActiveCampaignConfig(),
        getKlaviyoConfig(),
        getBookCallConfig(),
      ]);

      if (acConfig.enabled && acConfig.apiUrl && acConfig.apiKey) {
        await syncLeadToActiveCampaign(submission, acConfig, formConfig.fields).catch((err) => {
          console.error("[book-call/submit] ActiveCampaign sync failed:", err);
        });
      }

      if (klaviyoConfig.enabled && klaviyoConfig.apiKey) {
        await syncLeadToKlaviyo(submission, klaviyoConfig).catch((err) => {
          console.error("[book-call/submit] Klaviyo sync failed:", err);
        });
      }
    } catch (crmErr) {
      console.error("[book-call/submit] CRM sync failed:", crmErr);
    }

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to submit Book a Call request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
