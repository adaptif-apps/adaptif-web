import type { APIRoute } from "astro";
import { getSeoConfig } from "../lib/seoDb";

export const prerender = false;

export const GET: APIRoute = async () => {
  const config = await getSeoConfig();
  const baseUrl = config.canonicalBaseUrl.replace(/\/+$/, "");

  const lines: string[] = [];
  if (!config.allowIndexing) {
    lines.push("User-agent: *", "Disallow: /");
  } else {
    lines.push(
      "User-agent: *",
      "Allow: /",
      "Disallow: /studio-adaptif-9x4k",
      "Disallow: /api/"
    );
    if (config.robotsExtra) {
      lines.push("", config.robotsExtra);
    }
    lines.push("", `Sitemap: ${baseUrl}/sitemap.xml`);
  }

  return new Response(lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
    },
  });
};
