import type { APIRoute } from "astro";
import { createAcademyItem, listAcademyItems, type AcademyKind } from "../../../../lib/academyDb";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const includeUnpublished = url.searchParams.get("all") === "true";
    const kindParam = url.searchParams.get("kind");
    const kind: AcademyKind | undefined =
      kindParam === "guide" || kindParam === "course" ? kindParam : undefined;

    const items = await listAcademyItems({ kind, includeUnpublished });
    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to load academy items" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body?.title || (body?.kind !== "guide" && body?.kind !== "course")) {
      return new Response(
        JSON.stringify({ error: "Both title and valid kind ('guide' | 'course') are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const item = await createAcademyItem({
      slug: body.slug,
      kind: body.kind,
      title: String(body.title),
      subtitle: String(body.subtitle ?? ""),
      description: String(body.description ?? ""),
      category: String(body.category ?? "AI Workflows"),
      coverImage: String(body.coverImage ?? ""),
      status: body.status === "published" || body.status === "scheduled" ? body.status : "draft",
      publishAt: body.publishAt ? String(body.publishAt) : null,
      priceLabel: String(body.priceLabel ?? (body.kind === "guide" ? "Free" : "$49")),
      stripeCheckoutUrl: String(body.stripeCheckoutUrl ?? ""),
      accessMode:
        body.accessMode === "checkout_redirect" || body.accessMode === "open"
          ? body.accessMode
          : "stripe_webhook",
      toolName: String(body.toolName ?? ""),
      toolType: String(body.toolType ?? ""),
      toolUrl: String(body.toolUrl ?? ""),
      landingData: body.landingData,
      slides: Array.isArray(body.slides) ? body.slides : [],
      sortOrder: Number(body.sortOrder ?? 0)
    });

    return new Response(JSON.stringify({ item }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to create academy item" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
