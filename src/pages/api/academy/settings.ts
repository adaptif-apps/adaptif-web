import type { APIRoute } from "astro";
import { getAcademySettings, saveAcademySettings, type CourseAccessMode } from "../../../lib/academyDb";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const settings = await getAcademySettings();
    const system = {
      hasResendKey: Boolean(
        (import.meta.env.RESEND_API_KEY as string | undefined) || process.env.RESEND_API_KEY
      ),
      fromEmail:
        (import.meta.env.ACADEMY_FROM_EMAIL as string | undefined) ||
        process.env.ACADEMY_FROM_EMAIL ||
        "Adaptif Academy <onboarding@resend.dev>",
      hasPostgres: Boolean(
        (import.meta.env.POSTGRES_URL as string | undefined) ||
          process.env.POSTGRES_URL ||
          process.env.DATABASE_URL
      ),
      isVercel: Boolean(process.env.VERCEL),
      vercelEnv: process.env.VERCEL_ENV || "local"
    };
    return new Response(JSON.stringify({ settings, system }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to load settings" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const mode: CourseAccessMode | undefined =
      body?.defaultCourseAccessMode === "checkout_redirect" ||
      body?.defaultCourseAccessMode === "open" ||
      body?.defaultCourseAccessMode === "stripe_webhook"
        ? body.defaultCourseAccessMode
        : undefined;

    const settings = await saveAcademySettings({
      defaultCourseAccessMode: mode,
      stripeWebhookSecret:
        typeof body?.stripeWebhookSecret === "string" ? body.stripeWebhookSecret : undefined,
      aiProvider:
        body?.aiProvider === "openai" || body?.aiProvider === "gemini"
          ? body.aiProvider
          : undefined,
      aiApiKey: typeof body?.aiApiKey === "string" ? body.aiApiKey : undefined
    });

    return new Response(JSON.stringify({ settings }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to save settings" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
