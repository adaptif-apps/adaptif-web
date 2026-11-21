import type { APIRoute } from "astro";
import {
  getAcademyItemById,
  getAcademyItemBySlug,
  listAcademyItems
} from "../../../lib/academyDb";
import { recordStripePurchase } from "../../../lib/activityDb";
import { grantCourseAccessAndNotify } from "../../../lib/courseAccessEmail";
import { getPaymentSettings, getShopifyCredentials } from "../../../lib/paymentDb";
import { extractNumericShopifyId, verifyShopifyWebhookHmac } from "../../../lib/shopify";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const { webhookSecret } = await getShopifyCredentials();

    if (webhookSecret) {
      const hmacHeader = request.headers.get("x-shopify-hmac-sha256") || "";
      if (!verifyShopifyWebhookHmac(rawBody, hmacHeader, webhookSecret)) {
        return new Response(JSON.stringify({ error: "Invalid Shopify webhook HMAC" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    const topic = (request.headers.get("x-shopify-topic") || "").toLowerCase();
    if (topic && topic !== "orders/paid" && topic !== "orders/create") {
      return new Response(JSON.stringify({ received: true, ignored: topic }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const order = JSON.parse(rawBody);
    const financialStatus = String(order?.financial_status || "").toLowerCase();
    if (topic === "orders/create" && financialStatus !== "paid") {
      return new Response(JSON.stringify({ received: true, ignored: "unpaid_order" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const orderId = String(order?.id || order?.order_number || Date.now());
    const shopifySessionId = `shopify_${orderId}`;
    const customerEmail = String(
      order?.email || order?.customer?.email || order?.contact_email || ""
    ).trim();
    const customerName = String(
      [order?.customer?.first_name, order?.customer?.last_name].filter(Boolean).join(" ") ||
        order?.billing_address?.name ||
        ""
    ).trim();
    const currency = String(order?.currency || "usd").toLowerCase();
    const totalPrice = Number(order?.total_price ?? 0);
    const amountCents = Number.isFinite(totalPrice) ? Math.round(totalPrice * 100) : 0;
    const livemode = !Boolean(order?.test);

    const noteAttrs = Array.isArray(order?.note_attributes) ? order.note_attributes : [];
    const attrMap = new Map<string, string>();
    for (const attr of noteAttrs) {
      if (attr?.name) attrMap.set(String(attr.name), String(attr.value ?? ""));
    }

    const attrKind = attrMap.get("_adaptif_kind") || "";
    const attrId = attrMap.get("_adaptif_id") || "";
    const lineItems = Array.isArray(order?.line_items) ? order.line_items : [];
    const lineVariantIds = lineItems
      .map((li: any) => extractNumericShopifyId(String(li?.variant_id || "")))
      .filter(Boolean);

    // 1. Try matching an Academy Course
    let matchedCourse =
      attrKind === "course" && attrId
        ? (await getAcademyItemById(attrId)) ||
          (await getAcademyItemBySlug(attrId, "course", true))
        : null;

    if (!matchedCourse && lineVariantIds.length > 0) {
      const courses = await listAcademyItems({ kind: "course", includeUnpublished: true });
      matchedCourse =
        courses.find((c) => {
          const vId = extractNumericShopifyId(c.shopifyVariantId);
          return vId && lineVariantIds.includes(vId);
        }) || null;
    }

    if (matchedCourse) {
      await recordStripePurchase({
        stripeSessionId: shopifySessionId,
        purchaseType: "course",
        itemName: matchedCourse.title,
        itemSlug: matchedCourse.slug,
        customerName,
        customerEmail,
        amountCents,
        currency,
        paymentStatus: "paid",
        livemode
      });

      const reqUrl = new URL(request.url);
      const origin = `${reqUrl.protocol}//${reqUrl.host}`;
      const access = await grantCourseAccessAndNotify({
        item: matchedCourse,
        customerEmail,
        origin,
        source: "shopify_webhook"
      });

      return new Response(
        JSON.stringify({
          received: true,
          provider: "shopify",
          kind: "course",
          courseSlug: matchedCourse.slug,
          accessUrl: access.accessUrl,
          emailSent: access.emailSent
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Try matching a Plan or Audit from Payment Catalog
    const paymentSettings = await getPaymentSettings();
    let matchedEntry =
      (attrKind === "plan" || attrKind === "audit") && attrId
        ? paymentSettings.catalog.find((e) => e.key === attrId) || null
        : null;

    if (!matchedEntry && lineVariantIds.length > 0) {
      matchedEntry =
        paymentSettings.catalog.find((e) => {
          const vId = extractNumericShopifyId(e.shopifyVariantId);
          return vId && lineVariantIds.includes(vId);
        }) || null;
    }

    const itemName =
      matchedEntry?.label ||
      String(lineItems[0]?.title || attrMap.get("_adaptif_label") || "Shopify Order");

    await recordStripePurchase({
      stripeSessionId: shopifySessionId,
      purchaseType: "plan",
      itemName,
      itemSlug: matchedEntry?.key || "",
      customerName,
      customerEmail,
      amountCents,
      currency,
      paymentStatus: "paid",
      livemode
    });

    return new Response(
      JSON.stringify({
        received: true,
        provider: "shopify",
        kind: matchedEntry?.kind || "order",
        itemName
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Shopify webhook processing failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
