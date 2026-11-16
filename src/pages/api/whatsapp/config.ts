import type { APIRoute } from "astro";
import { getWhatsAppConfig, saveWhatsAppConfig } from "../../../lib/whatsappDb";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const config = await getWhatsAppConfig();
    return new Response(JSON.stringify({ config }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to load WhatsApp configuration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const config = await saveWhatsAppConfig({
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      phoneNumber: typeof body.phoneNumber === "string" ? body.phoneNumber : undefined,
      message: typeof body.message === "string" ? body.message : undefined,
      position:
        body.position === "bottom-left" || body.position === "bottom-right"
          ? body.position
          : undefined,
    });

    return new Response(JSON.stringify({ ok: true, config }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to save WhatsApp configuration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
