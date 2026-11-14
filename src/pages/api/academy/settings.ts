import type { APIRoute } from "astro";
import { getAcademySettings, saveAcademySettings, type CourseAccessMode } from "../../../lib/academyDb";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const settings = await getAcademySettings();
    return new Response(JSON.stringify({ settings }), {
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
        typeof body?.stripeWebhookSecret === "string" ? body.stripeWebhookSecret : undefined
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
