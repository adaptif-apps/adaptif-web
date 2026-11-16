import { neon } from "@neondatabase/serverless";
import { listAcademyItems } from "./academyDb";

export interface CmsFieldValue {
  text?: string;
  html?: string;
  href?: string;
  src?: string;
  alt?: string;
}

export type CmsPageOverrides = Record<string, CmsFieldValue>;

export interface CmsNavNode {
  label: string;
  path: string;
  children?: CmsNavNode[];
}

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

async function ensurePageContentTable() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS page_content (
      path TEXT PRIMARY KEY,
      overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export function normalizeCmsPath(path: string): string {
  const clean = (path || "").split("?")[0].split("#")[0].trim();
  if (!clean || clean === "/") return "/";
  const withLeading = clean.startsWith("/") ? clean : `/${clean}`;
  return withLeading.replace(/\/+$/, "") || "/";
}

function sanitizeOverrides(raw: unknown): CmsPageOverrides {
  if (!raw || typeof raw !== "object") return {};
  const result: CmsPageOverrides = {};
  for (const [key, val] of Object.entries(raw as Record<string, any>)) {
    const k = key.trim();
    if (!k || !val || typeof val !== "object") continue;
    const entry: CmsFieldValue = {};
    if (typeof val.text === "string") entry.text = val.text;
    if (typeof val.html === "string") entry.html = val.html;
    if (typeof val.href === "string") entry.href = val.href.trim();
    if (typeof val.src === "string") entry.src = val.src.trim();
    if (typeof val.alt === "string") entry.alt = val.alt;
    if (Object.keys(entry).length > 0) {
      result[k] = entry;
    }
  }
  return result;
}

export async function getPageContent(path: string): Promise<CmsPageOverrides> {
  try {
    await ensurePageContentTable();
    const norm = normalizeCmsPath(path);
    const sql = getSql();
    const rows = await sql`
      SELECT overrides FROM page_content WHERE path = ${norm} LIMIT 1
    `;
    if (rows.length === 0) return {};
    return sanitizeOverrides(rows[0].overrides);
  } catch (err) {
    console.error("[cmsContentDb] Failed to load page content:", err);
    return {};
  }
}

export async function savePageContent(
  path: string,
  overrides: CmsPageOverrides
): Promise<CmsPageOverrides> {
  await ensurePageContentTable();
  const norm = normalizeCmsPath(path);
  const clean = sanitizeOverrides(overrides);
  const sql = getSql();
  await sql`
    INSERT INTO page_content (path, overrides, updated_at)
    VALUES (${norm}, ${JSON.stringify(clean)}::jsonb, NOW())
    ON CONFLICT (path) DO UPDATE
    SET overrides = EXCLUDED.overrides, updated_at = NOW()
  `;
  return clean;
}

export async function resetPageContent(path: string): Promise<void> {
  await ensurePageContentTable();
  const norm = normalizeCmsPath(path);
  const sql = getSql();
  await sql`DELETE FROM page_content WHERE path = ${norm}`;
}

export async function listSitePagesForEditor(): Promise<CmsNavNode[]> {
  let courseChildren: CmsNavNode[] = [];
  let guideChildren: CmsNavNode[] = [];

  try {
    const items = await listAcademyItems({ includeUnpublished: true });
    courseChildren = items
      .filter((i) => i.kind === "course")
      .map((i) => ({
        label: i.title,
        path: `/academy/courses/${i.slug}`,
      }));
    guideChildren = items
      .filter((i) => i.kind === "guide")
      .map((i) => ({
        label: i.title,
        path: `/academy/guides/${i.slug}`,
      }));
  } catch (err) {
    console.error("[cmsContentDb] Failed to load academy items for nav:", err);
  }

  return [
    { label: "Home", path: "/" },
    { label: "Pricing", path: "/pricing" },
    { label: "Our Work", path: "/our-work" },
    { label: "Dedicated Team", path: "/dedicated-team" },
    {
      label: "Academy",
      path: "/academy",
      children: [
        {
          label: "Courses",
          path: "/academy/courses",
          children: courseChildren,
        },
        {
          label: "Guides",
          path: "/academy/guides",
          children: guideChildren,
        },
      ],
    },
  ];
}
