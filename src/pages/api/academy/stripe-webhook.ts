import type { APIRoute } from "astro";
import crypto from "node:crypto";
import {
  getAcademyItemById,
  getAcademyItemBySlug,
  getAcademyWebhookSecret
} from "../../../lib/academyDb";
import { grantCourseAccessAndNotify } from "../../../lib/courseAccessEmail";
import { recordStripePurchase } from "../../../lib/activityDb";

export const prerender = false;

function verifyStripeSignature(payload: string, sigHeader: string, secret: string): boolean {
  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k?.trim(), v?.trim()];
    })
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(v1, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const webhookSecret = await getAcademyWebhookSecret();

    if (webhookSecret) {
      const sigHeader = request.headers.get("stripe-signature") || "";
      if (!verifyStripeSignature(rawBody, sigHeader, webhookSecret)) {
        return new Response(JSON.stringify({ error: "Invalid Stripe signature" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    const event = JSON.parse(rawBody);
    if (event?.type !== "checkout.session.completed") {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const session = event?.data?.object || {};
    const stripeSessionId = String(session?.id || event?.id || `evt_${Date.now()}`);
    const clientRef = String(session?.client_reference_id || "");
    const courseId =
      session?.metadata?.course_id || (!clientRef.startsWith("plan:") ? clientRef : "");
    const courseSlug = session?.metadata?.course_slug || "";
    const customerName = String(session?.customer_details?.name || "");
    const customerEmail = String(session?.customer_details?.email || session?.customer_email || "");
    const amountCents = Number(session?.amount_total ?? 0);
    const currency = String(session?.currency || "usd");
    const paymentStatus = String(session?.payment_status || "paid");
    const livemode = Boolean(event?.livemode);

    const item = courseId
      ? await getAcademyItemById(String(courseId))
      : courseSlug
        ? await getAcademyItemBySlug(String(courseSlug), "course", true)
        : null;

    if (!item) {
      const explicitPlanName =
        session?.metadata?.plan_name ||
        session?.metadata?.plan ||
        (clientRef.startsWith("plan:") ? clientRef.slice(5) : "");
      const isPlan =
        Boolean(explicitPlanName) ||
        session?.metadata?.purchase_type === "plan" ||
        session?.mode === "subscription";

      if (isPlan) {
        const planName = String(explicitPlanName || "Subscription Plan").trim();
        await recordStripePurchase({
          stripeSessionId,
          purchaseType: "plan",
          itemName: planName,
          customerName,
          customerEmail,
          amountCents,
          currency,
          paymentStatus,
          livemode
        });
        return new Response(
          JSON.stringify({ received: true, recorded: "plan", planName }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ received: true, warning: "No matching course or plan found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    await recordStripePurchase({
      stripeSessionId,
      purchaseType: "course",
      itemName: item.title,
      itemSlug: item.slug,
      customerName,
      customerEmail,
      amountCents,
      currency,
      paymentStatus,
      livemode
    });

    const reqUrl = new URL(request.url);
    const origin = `${reqUrl.protocol}//${reqUrl.host}`;
    const result = await grantCourseAccessAndNotify({
      item,
      customerEmail: String(customerEmail),
      origin,
      source: "stripe_webhook"
    });

    return new Response(
      JSON.stringify({
        received: true,
        courseSlug: item.slug,
        accessUrl: result.accessUrl,
        emailSent: result.emailSent,
        ...(result.emailError ? { emailError: result.emailError } : {})
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Webhook processing failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
