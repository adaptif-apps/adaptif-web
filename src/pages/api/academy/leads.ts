import type { APIRoute } from "astro";
import { getAcademyItemBySlug, recordGuideLeadAndCreateToken } from "../../../lib/academyDb";
import { syncLeadToActiveCampaign } from "../../../lib/activeCampaignDb";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const slug = String(body?.slug ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();

    if (!slug || !name || !email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Please enter your name and a valid email address." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const item = await getAcademyItemBySlug(slug, "guide", false);
    if (!item) {
      return new Response(JSON.stringify({ error: "Guide not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const token = await recordGuideLeadAndCreateToken({
      itemId: item.id,
      itemSlug: item.slug,
      name,
      email
    });

    cookies.set(`adaptif_academy_${item.slug}`, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30
    });

    // Best-effort ActiveCampaign sync without blocking unlock
    syncLeadToActiveCampaign("book-call", {
      name,
      email,
      notes: `Unlocked Guide: ${item.title}`
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        unlocked: true,
        token,
        slidesUrl: `/academy/guides/${item.slug}/slides?access=${token}`,
        pdfUrl: `/academy/guides/${item.slug}/slides?access=${token}&print=1`
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to unlock guide" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
