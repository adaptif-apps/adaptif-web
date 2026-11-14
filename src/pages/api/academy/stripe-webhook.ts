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
    const reqUrl = new URL(request.url);
    const origin = `${reqUrl.protocol}//${reqUrl.host}`;
    const slidesAccessUrl = `${origin}/academy/courses/${item.slug}/slides?access=${encodeURIComponent(token)}`;
    const courseAccessUrl = `${origin}/academy/courses/${item.slug}?access=${encodeURIComponent(token)}`;

    let emailSent = false;
    let emailError: string | undefined;

    const resendKey =
      (import.meta.env.RESEND_API_KEY as string | undefined) || process.env.RESEND_API_KEY || "";
    const fromEmail =
      (import.meta.env.ACADEMY_FROM_EMAIL as string | undefined) ||
      process.env.ACADEMY_FROM_EMAIL ||
      "Adaptif Academy <onboarding@resend.dev>";

    if (resendKey && customerEmail) {
      try {
        const toolBlock = item.toolUrl
          ? `<p style="margin:18px 0 0;font-size:14px;color:#cbd5e1;">
               Companion Tool (${item.toolName || item.toolType || "Included Asset"}):
               <a href="${item.toolUrl}" style="color:#48c8ff;text-decoration:underline;">Open Tool ↗</a>
             </p>`
          : "";

        const html = `
          <div style="background:#010307;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:36px 24px;">
            <div style="max-width:560px;margin:0 auto;background:#071324;border:1px solid rgba(72,200,255,0.28);border-radius:18px;padding:32px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#48c8ff;">Adaptif Academy · Course Access</p>
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#ffffff;">${item.title}</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#cbd5e1;">
                Thank you for your purchase! Your course slides, downloadable vector PDF, and included resources are ready below.
              </p>
              <a href="${slidesAccessUrl}" style="display:inline-block;background:#48c8ff;color:#03121e;font-weight:700;font-size:14px;text-decoration:none;padding:13px 24px;border-radius:999px;">
                Open Slides &amp; Download PDF →
              </a>
              ${toolBlock}
              <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">
                You can also revisit the course page anytime: <a href="${courseAccessUrl}" style="color:#48c8ff;">${courseAccessUrl}</a>
              </p>
            </div>
          </div>
        `;

        const mailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [String(customerEmail)],
            subject: `Your access to ${item.title} — Adaptif Academy`,
            html
          })
        });

        if (mailRes.ok) {
          emailSent = true;
        } else {
          emailError = await mailRes.text();
        }
      } catch (mailErr: any) {
        emailError = mailErr?.message || "Resend request failed";
      }
    }

    return new Response(
      JSON.stringify({
        received: true,
        courseSlug: item.slug,
        accessUrl: `/academy/courses/${item.slug}/slides?access=${token}`,
        emailSent,
        ...(emailError ? { emailError } : {})
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
