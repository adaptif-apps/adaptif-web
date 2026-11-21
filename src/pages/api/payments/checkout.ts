import type { APIRoute } from "astro";
import { getAcademyItemById, getAcademyItemBySlug } from "../../../lib/academyDb";
import {
  getCatalogEntryByKey,
  getPaymentSettings,
  getShopifyCredentials
} from "../../../lib/paymentDb";
import { createShopifyCheckoutUrl } from "../../../lib/shopify";

export const prerender = false;

function withStripeClientRef(rawUrl: string, refId: string): string {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("stripe.com") && !parsed.searchParams.has("client_reference_id")) {
      parsed.searchParams.set("client_reference_id", refId);
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

async function resolveCheckout(params: {
  kind: string;
  id?: string;
  key?: string;
}): Promise<{ checkoutUrl: string; provider: "stripe" | "shopify" }> {
  const settings = await getPaymentSettings();
  const provider = settings.activeProvider;
  const kind = params.kind;
  const idOrKey = (params.id || params.key || "").trim();

  if (!idOrKey) {
    throw new Error("Missing course id or plan/audit key.");
  }

  let label = "";
  let stripeUrl = "";
  let shopifyVariantId = "";
  let shopifySellingPlanId = "";
  let stripeRef = idOrKey;

  if (kind === "course") {
    const item =
      (await getAcademyItemById(idOrKey)) || (await getAcademyItemBySlug(idOrKey, "course", true));
    if (!item) throw new Error("Course not found.");
    label = item.title;
    stripeUrl = item.stripeCheckoutUrl;
    shopifyVariantId = item.shopifyVariantId;
    stripeRef = item.id;
  } else if (kind === "plan" || kind === "audit") {
    const entry = await getCatalogEntryByKey(idOrKey);
    if (!entry) throw new Error(`Catalog item '${idOrKey}' not found.`);
    label = entry.label;
    stripeUrl = entry.stripeCheckoutUrl;
    shopifyVariantId = entry.shopifyVariantId;
    shopifySellingPlanId = entry.shopifySellingPlanId;
    stripeRef = `${entry.kind}:${entry.key}`;
  } else {
    throw new Error("Invalid checkout kind. Expected 'course', 'plan', or 'audit'.");
  }

  if (provider === "stripe") {
    const url = withStripeClientRef(stripeUrl, stripeRef);
    if (!url) {
      throw new Error(`Stripe Payment Link is not configured for ${label}.`);
    }
    return { checkoutUrl: url, provider: "stripe" };
  }

  const creds = await getShopifyCredentials();
  const { checkoutUrl } = await createShopifyCheckoutUrl({
    storeDomain: creds.storeDomain,
    storefrontToken: creds.storefrontToken,
    variantId: shopifyVariantId,
    sellingPlanId: shopifySellingPlanId,
    quantity: 1,
    attributes: [
      { key: "_adaptif_kind", value: kind },
      { key: "_adaptif_id", value: idOrKey },
      { key: "_adaptif_label", value: label }
    ]
  });

  return { checkoutUrl, provider: "shopify" };
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") || "";
    const id = url.searchParams.get("id") || "";
    const key = url.searchParams.get("key") || "";

    const { checkoutUrl } = await resolveCheckout({ kind, id, key });
    return Response.redirect(checkoutUrl, 302);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to start checkout" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const result = await resolveCheckout({
      kind: String(body?.kind || ""),
      id: typeof body?.id === "string" ? body.id : undefined,
      key: typeof body?.key === "string" ? body.key : undefined
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to create checkout" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
};
