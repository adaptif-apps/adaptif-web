import { neon } from "@neondatabase/serverless";

export interface SeoPageOverride {
  path: string;
  title: string;
  description: string;
  ogImage: string;
  noIndex: boolean;
}

export interface SeoRedirect {
  id: string;
  from: string;
  to: string;
  permanent: boolean;
}

export interface SeoConfig {
  defaultTitle: string;
  titleTemplate: string;
  defaultDescription: string;
  canonicalBaseUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: "summary_large_image" | "summary";
  googleSiteVerification: string;
  ga4MeasurementId: string;
  orgName: string;
  orgLogo: string;
  orgDescription: string;
  orgSocialUrls: string[];
  allowIndexing: boolean;
  robotsExtra: string;
  sitemapIncludePages: boolean;
  sitemapIncludeAcademy: boolean;
  pageOverrides: Record<string, SeoPageOverride>;
  redirects: SeoRedirect[];
}

export const SEO_MANAGED_PAGES: { path: string; label: string }[] = [
  { path: "/", label: "Home (/)" },
  { path: "/pricing", label: "Pricing (/pricing)" },
  { path: "/our-work", label: "Our Work (/our-work)" },
  { path: "/dedicated-team", label: "Dedicated Team (/dedicated-team)" },
  { path: "/audit", label: "Audit (/audit)" },
  { path: "/academy", label: "Academy (/academy)" },
];

export const defaultSeoConfig: SeoConfig = {
  defaultTitle: "Adaptif — The Fuel Behind Your Creative Engine",
  titleTemplate: "%s | Adaptif",
  defaultDescription:
    "A subscription that plugs an AI-driven creative department into your team: design, dev and marketing, unlimited requests and revisions.",
  canonicalBaseUrl: "https://adaptif-web.vercel.app",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  twitterCard: "summary_large_image",
  googleSiteVerification: "",
  ga4MeasurementId: "",
  orgName: "Adaptif",
  orgLogo: "https://adaptif-web.vercel.app/logo.svg",
  orgDescription:
    "AI-driven creative department subscription for design, development, and marketing.",
  orgSocialUrls: [],
  allowIndexing: true,
  robotsExtra: "",
  sitemapIncludePages: true,
  sitemapIncludeAcademy: true,
  pageOverrides: {},
  redirects: [],
};

function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    import.meta.env.DATABASE_URL ||
    import.meta.env.POSTGRES_URL
  );
}

function getSql() {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("Missing DATABASE_URL / POSTGRES_URL environment variable.");
  }
  return neon(url);
}

async function ensureSettingsTable() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export function normalizeSeoPath(path: string): string {
  const trimmed = (path || "").trim();
  if (!trimmed || trimmed === "/") return "/";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+$/, "") || "/";
}

function normalizeBaseUrl(url: string): string {
  const trimmed = (url || "").trim().replace(/\/+$/, "");
  if (!trimmed) return defaultSeoConfig.canonicalBaseUrl;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function mergePageOverrides(raw: unknown): Record<string, SeoPageOverride> {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<string, SeoPageOverride> = {};
  for (const [key, val] of Object.entries(raw as Record<string, any>)) {
    if (!val || typeof val !== "object") continue;
    const normPath = normalizeSeoPath(val.path || key);
    result[normPath] = {
      path: normPath,
      title: typeof val.title === "string" ? val.title.trim() : "",
      description: typeof val.description === "string" ? val.description.trim() : "",
      ogImage: typeof val.ogImage === "string" ? val.ogImage.trim() : "",
      noIndex: Boolean(val.noIndex),
    };
  }
  return result;
}

function mergeRedirects(raw: unknown): SeoRedirect[] {
  if (!Array.isArray(raw)) return [];
  const list: SeoRedirect[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const from = normalizeSeoPath(String(item.from || ""));
    const toRaw = String(item.to || "").trim();
    if (!from || !toRaw || from === toRaw) continue;
    const to = /^https?:\/\//i.test(toRaw) ? toRaw : normalizeSeoPath(toRaw);
    list.push({
      id: typeof item.id === "string" && item.id ? item.id : `red-${list.length + 1}`,
      from,
      to,
      permanent: item.permanent !== false,
    });
  }
  return list;
}

function mergeSeoConfig(raw: unknown): SeoConfig {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, any>) : {};
  return {
    defaultTitle:
      typeof obj.defaultTitle === "string" && obj.defaultTitle.trim()
        ? obj.defaultTitle.trim()
        : defaultSeoConfig.defaultTitle,
    titleTemplate:
      typeof obj.titleTemplate === "string"
        ? obj.titleTemplate.trim()
        : defaultSeoConfig.titleTemplate,
    defaultDescription:
      typeof obj.defaultDescription === "string" && obj.defaultDescription.trim()
        ? obj.defaultDescription.trim()
        : defaultSeoConfig.defaultDescription,
    canonicalBaseUrl: normalizeBaseUrl(
      typeof obj.canonicalBaseUrl === "string"
        ? obj.canonicalBaseUrl
        : defaultSeoConfig.canonicalBaseUrl
    ),
    ogTitle: typeof obj.ogTitle === "string" ? obj.ogTitle.trim() : "",
    ogDescription: typeof obj.ogDescription === "string" ? obj.ogDescription.trim() : "",
    ogImage: typeof obj.ogImage === "string" ? obj.ogImage.trim() : "",
    twitterCard: obj.twitterCard === "summary" ? "summary" : "summary_large_image",
    googleSiteVerification:
      typeof obj.googleSiteVerification === "string" ? obj.googleSiteVerification.trim() : "",
    ga4MeasurementId:
      typeof obj.ga4MeasurementId === "string" ? obj.ga4MeasurementId.trim() : "",
    orgName:
      typeof obj.orgName === "string" && obj.orgName.trim()
        ? obj.orgName.trim()
        : defaultSeoConfig.orgName,
    orgLogo:
      typeof obj.orgLogo === "string" ? obj.orgLogo.trim() : defaultSeoConfig.orgLogo,
    orgDescription:
      typeof obj.orgDescription === "string"
        ? obj.orgDescription.trim()
        : defaultSeoConfig.orgDescription,
    orgSocialUrls: Array.isArray(obj.orgSocialUrls)
      ? obj.orgSocialUrls.map((s: any) => String(s).trim()).filter(Boolean)
      : [],
    allowIndexing:
      typeof obj.allowIndexing === "boolean" ? obj.allowIndexing : defaultSeoConfig.allowIndexing,
    robotsExtra: typeof obj.robotsExtra === "string" ? obj.robotsExtra.trim() : "",
    sitemapIncludePages:
      typeof obj.sitemapIncludePages === "boolean"
        ? obj.sitemapIncludePages
        : defaultSeoConfig.sitemapIncludePages,
    sitemapIncludeAcademy:
      typeof obj.sitemapIncludeAcademy === "boolean"
        ? obj.sitemapIncludeAcademy
        : defaultSeoConfig.sitemapIncludeAcademy,
    pageOverrides: mergePageOverrides(obj.pageOverrides),
    redirects: mergeRedirects(obj.redirects),
  };
}

let cachedConfig: { value: SeoConfig; expiresAt: number } | null = null;

export async function getSeoConfig(options?: { bypassCache?: boolean }): Promise<SeoConfig> {
  if (!options?.bypassCache && cachedConfig && Date.now() < cachedConfig.expiresAt) {
    return cachedConfig.value;
  }
  try {
    await ensureSettingsTable();
    const sql = getSql();
    const rows = await sql`
      SELECT value FROM site_settings WHERE key = 'seo_config' LIMIT 1
    `;
    const cfg = rows.length === 0 ? defaultSeoConfig : mergeSeoConfig(rows[0].value);
    cachedConfig = { value: cfg, expiresAt: Date.now() + 20_000 };
    return cfg;
  } catch (err) {
    console.error("[seoDb] Falling back to default config:", err);
    return defaultSeoConfig;
  }
}

export async function saveSeoConfig(patch: Partial<SeoConfig>): Promise<SeoConfig> {
  await ensureSettingsTable();
  const current = await getSeoConfig({ bypassCache: true });
  const next = mergeSeoConfig({
    ...current,
    ...patch,
  });

  const sql = getSql();
  await sql`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES ('seo_config', ${JSON.stringify(next)}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = NOW()
  `;
  cachedConfig = { value: next, expiresAt: Date.now() + 20_000 };
  return next;
}

export interface ResolvedPageSeo {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: "summary_large_image" | "summary";
  googleSiteVerification: string;
  ga4MeasurementId: string;
  jsonLd: Record<string, any>;
}

export function resolvePageSeo(
  config: SeoConfig,
  pathname: string,
  pageProps?: { title?: string; description?: string }
): ResolvedPageSeo {
  const normPath = normalizeSeoPath(pathname);
  const override = config.pageOverrides[normPath];

  const basePageTitle =
    override?.title ||
    (normPath === "/" ? config.defaultTitle : pageProps?.title) ||
    config.defaultTitle;

  let finalTitle = basePageTitle;
  if (
    normPath !== "/" &&
    config.titleTemplate &&
    config.titleTemplate.includes("%s") &&
    !basePageTitle.toLowerCase().includes(config.orgName.toLowerCase())
  ) {
    finalTitle = config.titleTemplate.replace("%s", basePageTitle);
  }

  const description =
    override?.description ||
    (normPath === "/" ? config.defaultDescription : pageProps?.description) ||
    config.defaultDescription;

  const ogTitle = override?.title || config.ogTitle || finalTitle;
  const ogDescription = override?.description || config.ogDescription || description;
  const ogImage = override?.ogImage || config.ogImage || "";

  const baseUrl = normalizeBaseUrl(config.canonicalBaseUrl);
  const canonicalUrl = normPath === "/" ? `${baseUrl}/` : `${baseUrl}${normPath}`;

  const shouldNoIndex = !config.allowIndexing || Boolean(override?.noIndex);
  const robots = shouldNoIndex ? "noindex, nofollow" : "index, follow";

  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: config.orgName || "Adaptif",
        url: baseUrl,
        ...(config.orgLogo ? { logo: config.orgLogo } : {}),
        ...(config.orgDescription ? { description: config.orgDescription } : {}),
        ...(config.orgSocialUrls.length > 0 ? { sameAs: config.orgSocialUrls } : {}),
      },
      {
        "@type": "WebSite",
        name: config.orgName || "Adaptif",
        url: baseUrl,
      },
    ],
  };

  return {
    title: finalTitle,
    description,
    canonicalUrl,
    robots,
    ogTitle,
    ogDescription,
    ogImage,
    twitterCard: config.twitterCard,
    googleSiteVerification: config.googleSiteVerification,
    ga4MeasurementId: config.ga4MeasurementId,
    jsonLd,
  };
}
