import type { APIRoute } from "astro";
import { getTurnstileConfig, saveTurnstileConfig } from "../../../lib/turnstile";
import { hasValidStudioSession } from "../../../lib/studioAuth";

export const prerender = false;

export const GET: APIRoute = async () => {
  const cfg = await getTurnstileConfig();
  return new Response(
    JSON.stringify({
      enabled: cfg.enabled,
      siteKey: cfg.siteKey,
      hasSecretKey: Boolean(cfg.secretKey),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    }
  );
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!hasValidStudioSession(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const saved = await saveTurnstileConfig({
      enabled: typeof body?.enabled === "boolean" ? body.enabled : undefined,
      siteKey: typeof body?.siteKey === "string" ? body.siteKey : undefined,
      secretKey: typeof body?.secretKey === "string" ? body.secretKey : undefined,
    });
    return new Response(
      JSON.stringify({
        ok: true,
        enabled: saved.enabled,
        siteKey: saved.siteKey,
        hasSecretKey: Boolean(saved.secretKey),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to save Turnstile configuration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
