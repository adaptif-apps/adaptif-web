import type { APIRoute } from "astro";
import {
  getPaymentSettings,
  savePaymentSettings,
  type PaymentProvider
} from "../../../lib/paymentDb";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const settings = await getPaymentSettings();
    return new Response(JSON.stringify({ settings }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to load payment settings" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const activeProvider: PaymentProvider | undefined =
      body?.activeProvider === "shopify" || body?.activeProvider === "stripe"
        ? body.activeProvider
        : undefined;

    const settings = await savePaymentSettings({
      activeProvider,
      shopifyStoreDomain:
        typeof body?.shopifyStoreDomain === "string" ? body.shopifyStoreDomain : undefined,
      shopifyStorefrontToken:
        typeof body?.shopifyStorefrontToken === "string"
          ? body.shopifyStorefrontToken
          : undefined,
      shopifyWebhookSecret:
        typeof body?.shopifyWebhookSecret === "string" ? body.shopifyWebhookSecret : undefined,
      catalog: Array.isArray(body?.catalog) ? body.catalog : undefined
    });

    return new Response(JSON.stringify({ ok: true, settings }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to save payment settings" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
