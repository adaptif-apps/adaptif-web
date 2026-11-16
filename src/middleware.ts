import { defineMiddleware } from "astro:middleware";
import { getSeoConfig, normalizeSeoPath } from "./lib/seoDb";

const SKIP_PREFIXES = ["/api/", "/_astro/", "/studio-adaptif-9x4k"];
const STATIC_EXT_RE = /\.(css|js|mjs|svg|png|jpg|jpeg|webp|gif|ico|woff|woff2|ttf|map|xml|txt)$/i;

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (
    SKIP_PREFIXES.some((p) => pathname.startsWith(p)) ||
    STATIC_EXT_RE.test(pathname)
  ) {
    return next();
  }

  try {
    const config = await getSeoConfig();
    if (config.redirects.length > 0) {
      const norm = normalizeSeoPath(pathname);
      const match = config.redirects.find((r) => r.from === norm);
      if (match) {
        return context.redirect(match.to, match.permanent ? 301 : 302);
      }
    }
  } catch (err) {
    console.error("[middleware] SEO redirect check failed:", err);
  }

  const response = await next();
  if (context.url.searchParams.get("edit") === "1") {
    response.headers.set("Cache-Control", "no-store, private");
  }
  return response;
});
