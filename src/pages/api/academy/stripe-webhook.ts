import type { APIRoute } from "astro";
import crypto from "node:crypto";
import {
  createAccessToken,
  getAcademyItemById,
  getAcademyItemBySlug,
  getAcademyWebhookSecret
} from "../../../lib/academyDb";

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
    const courseId = session?.metadata?.course_id || session?.client_reference_id || "";
    const courseSlug = session?.metadata?.course_slug || "";
    const customerEmail = session?.customer_details?.email || session?.customer_email || "";

    const item = courseId
      ? await getAcademyItemById(String(courseId))
      : courseSlug
        ? await getAcademyItemBySlug(String(courseSlug), "course", true)
        : null;

    if (!item) {
      return new Response(JSON.stringify({ received: true, warning: "No matching course found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const token = await createAccessToken(item.id, String(customerEmail), "stripe_webhook");

    return new Response(
      JSON.stringify({
        received: true,
        courseSlug: item.slug,
        accessUrl: `/academy/courses/${item.slug}/slides?access=${token}`
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
