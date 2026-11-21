import { createAccessToken, type AcademyItem } from "./academyDb";

export async function grantCourseAccessAndNotify(params: {
  item: AcademyItem;
  customerEmail: string;
  origin: string;
  source?: string;
}): Promise<{
  token: string;
  accessUrl: string;
  emailSent: boolean;
  emailError?: string;
}> {
  const { item, customerEmail, origin, source = "stripe_webhook" } = params;
  const token = await createAccessToken(item.id, String(customerEmail), source);
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

  return {
    token,
    accessUrl: `/academy/courses/${item.slug}/slides?access=${token}`,
    emailSent,
    emailError
  };
}
