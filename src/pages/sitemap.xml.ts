import type { APIRoute } from "astro";
import { getSeoConfig, SEO_MANAGED_PAGES } from "../lib/seoDb";
import { listAcademyItems } from "../lib/academyDb";
import { listBlogPosts } from "../lib/blogDb";

export const prerender = false;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const GET: APIRoute = async () => {
  const config = await getSeoConfig();
  const baseUrl = config.canonicalBaseUrl.replace(/\/+$/, "");

  const urls: { loc: string; priority: string; changefreq: string }[] = [];

  if (config.allowIndexing && config.sitemapIncludePages) {
    for (const page of SEO_MANAGED_PAGES) {
      const override = config.pageOverrides[page.path];
      if (override?.noIndex) continue;
      const loc = page.path === "/" ? `${baseUrl}/` : `${baseUrl}${page.path}`;
      urls.push({
        loc,
        priority: page.path === "/" ? "1.0" : "0.8",
        changefreq: page.path === "/" ? "weekly" : "monthly",
      });
    }
  }

  if (config.allowIndexing && config.sitemapIncludeAcademy) {
    try {
      const [items, posts] = await Promise.all([
        listAcademyItems({ includeUnpublished: false }),
        listBlogPosts({ includeDrafts: false }),
      ]);
      for (const item of items) {
        const prefix = item.kind === "guide" ? "/academy/guides" : "/academy/courses";
        urls.push({
          loc: `${baseUrl}${prefix}/${item.slug}`,
          priority: "0.7",
          changefreq: "weekly",
        });
      }
      urls.push({ loc: `${baseUrl}/blog`, priority: "0.8", changefreq: "weekly" });
      for (const post of posts) {
        urls.push({
          loc: `${baseUrl}/blog/${post.slug}`,
          priority: "0.7",
          changefreq: "weekly",
        });
      }
    } catch (err) {
      console.error("[sitemap.xml] Failed to list academy/blog items:", err);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
};
