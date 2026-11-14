import type { APIRoute } from "astro";
import { createBookCallSubmission } from "../../../lib/bookCallDb";
import { getActiveCampaignConfig, syncLeadToActiveCampaign } from "../../../lib/activeCampaignDb";

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

    const submission = {
      fullName,
      workEmail,
      helpTopic: String(body?.helpTopic ?? ""),
      projectGoal: String(body?.projectGoal ?? ""),
      referenceLink: String(body?.referenceLink ?? ""),
      timeline: String(body?.timeline ?? ""),
      budgetRange: String(body?.budgetRange ?? ""),
      notes: String(body?.notes ?? ""),
    };

    const result = await createBookCallSubmission(submission);

    // Sync to ActiveCampaign if enabled (non-blocking for lead capture)
    try {
      const acConfig = await getActiveCampaignConfig();
      if (acConfig.enabled && acConfig.apiUrl && acConfig.apiKey) {
        await syncLeadToActiveCampaign(submission, acConfig);
      }
    } catch (acErr) {
      console.error("[book-call/submit] ActiveCampaign sync failed:", acErr);
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
