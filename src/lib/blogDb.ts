import { neon } from "@neondatabase/serverless";
import type { UpsellConfig } from "./upsell";

export type { UpsellConfig } from "./upsell";
export type BlogUpsellConfig = UpsellConfig;

export type BlogStatus = "draft" | "published" | "scheduled";
export type BlogTextFormat =
  | "eyebrow"
  | "title"
  | "title_highlight"
  | "subtitle"
  | "paragraph"
  | "quote";

export interface BlogTextBlock {
  id: string;
  format: BlogTextFormat;
  text: string;
}

export interface BlogColumn {
  id: string;
  type: "text" | "image" | "video";
  blocks?: BlogTextBlock[];
  imageUrl?: string;
  imageAlt?: string;
  videoUrl?: string;
  caption?: string;
}

export interface BlogSection {
  id: string;
  columnsCount: 1 | 2 | 3;
  columns: BlogColumn[];
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  excerpt: string;
  category: string;
  coverImage: string;
  readTime: string;
  authorName: string;
  status: BlogStatus;
  publishAt: string | null;
  sections: BlogSection[];
  upsell: BlogUpsellConfig;
  createdAt: string;
  updatedAt: string;
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

export function slugifyBlog(input: string): string {
  return (
    (input || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `post-${Date.now()}`
  );
}

const VALID_FORMATS: BlogTextFormat[] = [
  "eyebrow",
  "title",
  "title_highlight",
  "subtitle",
  "paragraph",
  "quote",
];

function sanitizeSections(raw: unknown): BlogSection[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((sec: any, sIdx: number) => {
    const countRaw = Number(sec?.columnsCount ?? (Array.isArray(sec?.columns) ? sec.columns.length : 1));
    const columnsCount: 1 | 2 | 3 = countRaw === 3 ? 3 : countRaw === 2 ? 2 : 1;
    const rawCols = Array.isArray(sec?.columns) ? sec.columns : [];
    const columns: BlogColumn[] = Array.from({ length: columnsCount }, (_, cIdx) => {
      const col = rawCols[cIdx] || {};
      const type: "text" | "image" | "video" =
        col.type === "image" ? "image" : col.type === "video" ? "video" : "text";
      const blocks: BlogTextBlock[] = Array.isArray(col.blocks)
        ? col.blocks.map((b: any, bIdx: number) => ({
            id: typeof b?.id === "string" && b.id ? b.id : `blk-${sIdx}-${cIdx}-${bIdx}`,
            format: VALID_FORMATS.includes(b?.format) ? b.format : "paragraph",
            text: String(b?.text ?? ""),
          }))
        : [
            {
              id: `blk-${sIdx}-${cIdx}-0`,
              format: "paragraph",
              text: "",
            },
          ];

      return {
        id: typeof col?.id === "string" && col.id ? col.id : `col-${sIdx}-${cIdx}`,
        type,
        blocks,
        imageUrl: typeof col?.imageUrl === "string" ? col.imageUrl.trim() : "",
        imageAlt: typeof col?.imageAlt === "string" ? col.imageAlt.trim() : "",
        videoUrl: typeof col?.videoUrl === "string" ? col.videoUrl.trim() : "",
        caption: typeof col?.caption === "string" ? col.caption.trim() : "",
      };
    });

    return {
      id: typeof sec?.id === "string" && sec.id ? sec.id : `sec-${sIdx}`,
      columnsCount,
      columns,
    };
  });
}

function sanitizeUpsell(raw: unknown): BlogUpsellConfig {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, any>) : {};
  const kind: "guide" | "course" | "plan" =
    obj.kind === "course" ? "course" : obj.kind === "plan" ? "plan" : "guide";
  return {
    enabled: Boolean(obj.enabled),
    kind,
    targetSlug: typeof obj.targetSlug === "string" ? obj.targetSlug.trim() : "",
    planName: typeof obj.planName === "string" ? obj.planName.trim() : "Creative Plan",
    eyebrow: typeof obj.eyebrow === "string" ? obj.eyebrow.trim() : "",
    title: typeof obj.title === "string" ? obj.title.trim() : "",
    description: typeof obj.description === "string" ? obj.description.trim() : "",
    ctaLabel: typeof obj.ctaLabel === "string" ? obj.ctaLabel.trim() : "",
    ctaHref: typeof obj.ctaHref === "string" ? obj.ctaHref.trim() : "",
  };
}

function mapRow(row: any): BlogPost {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title ?? ""),
    subtitle: String(row.subtitle ?? ""),
    eyebrow: String(row.eyebrow ?? "INSIGHTS"),
    excerpt: String(row.excerpt ?? ""),
    category: String(row.category ?? "AI Workflows"),
    coverImage: String(row.cover_image ?? ""),
    readTime: String(row.read_time ?? "5 min read"),
    authorName: String(row.author_name ?? "Adaptif Team"),
    status: row.status === "published" || row.status === "scheduled" ? row.status : "draft",
    publishAt: row.publish_at ? new Date(row.publish_at).toISOString() : null,
    sections: sanitizeSections(row.sections),
    upsell: sanitizeUpsell(row.upsell),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

const seedPost: Omit<BlogPost, "createdAt" | "updatedAt"> = {
  id: "blog-seed-creative-velocity",
  slug: "how-ai-creative-teams-ship-3x-faster",
  title: "How AI-Driven Creative Teams Ship 3x Faster Without Losing Craft",
  subtitle:
    "Why traditional agency bottlenecks break down—and how pairing senior creative directors with AI production loops transforms output.",
  eyebrow: "CREATIVE OPERATIONS",
  excerpt:
    "Discover the exact workflow architecture modern brand teams use to cut turnaround times from weeks to 48 hours.",
  category: "AI Workflows",
  coverImage: "/images/why-us/ai-excellence.jpg",
  readTime: "4 min read",
  authorName: "Adaptif Editorial",
  status: "published",
  publishAt: null,
  sections: [
    {
      id: "sec-1",
      columnsCount: 1,
      columns: [
        {
          id: "col-1-0",
          type: "text",
          blocks: [
            { id: "b1", format: "eyebrow", text: "THE BOTTLENECK" },
            { id: "b2", format: "title", text: "Speed means nothing if" },
            { id: "b3", format: "title_highlight", text: "brand consistency breaks." },
            {
              id: "b4",
              format: "paragraph",
              text: "Most teams try to solve creative bottlenecks by adding more freelancers or prompting generic AI tools in isolation. The result is fragmented typography, off-brand visuals, and endless revision cycles.",
            },
            {
              id: "b5",
              format: "quote",
              text: "AI shouldn't replace senior taste—it should multiply your team's execution speed around a locked creative system.",
            },
          ],
        },
      ],
    },
    {
      id: "sec-2",
      columnsCount: 2,
      columns: [
        {
          id: "col-2-0",
          type: "text",
          blocks: [
            { id: "b6", format: "eyebrow", text: "THE SYSTEM" },
            { id: "b7", format: "subtitle", text: "A repeatable 48-hour creative loop" },
            {
              id: "b8",
              format: "paragraph",
              text: "When your briefs, brand tokens, and AI generation pipelines live in one dedicated department, every campaign asset—from paid ads to landing pages—ships in 48 to 72 hours.",
            },
          ],
        },
        {
          id: "col-2-1",
          type: "image",
          imageUrl: "/images/why-us/our-technology.jpg",
          imageAlt: "Adaptif AI Creative Workflow",
          caption: "Senior creative direction paired with automated AI production.",
        },
      ],
    },
  ],
  upsell: {
    enabled: true,
    kind: "plan",
    planName: "Creative Plan",
    eyebrow: "SCALE YOUR OUTPUT",
    title: "Ready for a dedicated AI-driven creative department?",
    description:
      "Plug Adaptif into your team for unlimited design, dev, and marketing requests with 48-hour turnarounds.",
    ctaLabel: "Explore Plans",
    ctaHref: "/pricing",
  },
};

export async function ensureBlogTable() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      eyebrow TEXT NOT NULL DEFAULT 'INSIGHTS',
      excerpt TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'AI Workflows',
      cover_image TEXT NOT NULL DEFAULT '',
      read_time TEXT NOT NULL DEFAULT '5 min read',
      author_name TEXT NOT NULL DEFAULT 'Adaptif Team',
      status TEXT NOT NULL DEFAULT 'draft',
      publish_at TIMESTAMPTZ NULL,
      sections JSONB NOT NULL DEFAULT '[]'::jsonb,
      upsell JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ NULL`;

  const countRows = await sql`SELECT COUNT(*)::int AS cnt FROM blog_posts`;
  if ((countRows[0]?.cnt ?? 0) === 0) {
    await sql`
      INSERT INTO blog_posts (
        id, slug, title, subtitle, eyebrow, excerpt, category, cover_image,
        read_time, author_name, status, sections, upsell
      ) VALUES (
        ${seedPost.id}, ${seedPost.slug}, ${seedPost.title}, ${seedPost.subtitle},
        ${seedPost.eyebrow}, ${seedPost.excerpt}, ${seedPost.category}, ${seedPost.coverImage},
        ${seedPost.readTime}, ${seedPost.authorName}, ${seedPost.status},
        ${JSON.stringify(seedPost.sections)}::jsonb,
        ${JSON.stringify(seedPost.upsell)}::jsonb
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

export async function listBlogPosts(options?: { includeDrafts?: boolean }): Promise<BlogPost[]> {
  try {
    await ensureBlogTable();
    const sql = getSql();
    const rows = options?.includeDrafts
      ? await sql`SELECT * FROM blog_posts ORDER BY created_at DESC`
      : await sql`
          SELECT * FROM blog_posts
          WHERE status = 'published' OR (status = 'scheduled' AND publish_at <= NOW())
          ORDER BY created_at DESC
        `;
    return rows.map(mapRow);
  } catch (err) {
    console.error("[blogDb] Failed to list posts:", err);
    return options?.includeDrafts ? [] : [{ ...seedPost, createdAt: "", updatedAt: "" }];
  }
}

export async function getBlogPostBySlug(
  slug: string,
  includeDrafts = false
): Promise<BlogPost | null> {
  try {
    await ensureBlogTable();
    const sql = getSql();
    const rows = includeDrafts
      ? await sql`SELECT * FROM blog_posts WHERE slug = ${slug} LIMIT 1`
      : await sql`
          SELECT * FROM blog_posts
          WHERE slug = ${slug} AND (status = 'published' OR (status = 'scheduled' AND publish_at <= NOW()))
          LIMIT 1
        `;
    if (rows.length === 0) return null;
    return mapRow(rows[0]);
  } catch (err) {
    console.error("[blogDb] Failed to get post by slug:", err);
    return null;
  }
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  try {
    await ensureBlogTable();
    const sql = getSql();
    const rows = await sql`SELECT * FROM blog_posts WHERE id = ${id} LIMIT 1`;
    if (rows.length === 0) return null;
    return mapRow(rows[0]);
  } catch (err) {
    console.error("[blogDb] Failed to get post by id:", err);
    return null;
  }
}

export async function createBlogPost(
  input: Partial<BlogPost> & { title: string }
): Promise<BlogPost> {
  await ensureBlogTable();
  const sql = getSql();
  const id = input.id || `blog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const baseSlug = slugifyBlog(input.slug || input.title);
  const existing = await sql`SELECT id FROM blog_posts WHERE slug = ${baseSlug} LIMIT 1`;
  const slug = existing.length > 0 ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;

  const sections = sanitizeSections(input.sections);
  const upsell = sanitizeUpsell(input.upsell);
  const status: BlogStatus =
    input.status === "published" || input.status === "scheduled" ? input.status : "draft";
  const publishAt = status === "scheduled" && input.publishAt ? input.publishAt : null;

  const rows = await sql`
    INSERT INTO blog_posts (
      id, slug, title, subtitle, eyebrow, excerpt, category, cover_image,
      read_time, author_name, status, publish_at, sections, upsell
    ) VALUES (
      ${id},
      ${slug},
      ${input.title.trim()},
      ${(input.subtitle || "").trim()},
      ${(input.eyebrow || "INSIGHTS").trim()},
      ${(input.excerpt || "").trim()},
      ${(input.category || "AI Workflows").trim()},
      ${(input.coverImage || "").trim()},
      ${(input.readTime || "5 min read").trim()},
      ${(input.authorName || "Adaptif Team").trim()},
      ${status},
      ${publishAt},
      ${JSON.stringify(sections)}::jsonb,
      ${JSON.stringify(upsell)}::jsonb
    )
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function updateBlogPost(
  id: string,
  patch: Partial<BlogPost>
): Promise<BlogPost | null> {
  await ensureBlogTable();
  const existing = await getBlogPostById(id);
  if (!existing) return null;

  const nextSlug =
    typeof patch.slug === "string" && patch.slug.trim()
      ? slugifyBlog(patch.slug)
      : existing.slug;
  const sections = patch.sections !== undefined ? sanitizeSections(patch.sections) : existing.sections;
  const upsell = patch.upsell !== undefined ? sanitizeUpsell(patch.upsell) : existing.upsell;
  const status: BlogStatus =
    patch.status === "published" || patch.status === "draft" || patch.status === "scheduled"
      ? patch.status
      : existing.status;
  const publishAt =
    status === "scheduled"
      ? patch.publishAt !== undefined
        ? patch.publishAt
        : existing.publishAt
      : null;

  const sql = getSql();
  const rows = await sql`
    UPDATE blog_posts
    SET
      slug = ${nextSlug},
      title = ${typeof patch.title === "string" ? patch.title.trim() : existing.title},
      subtitle = ${typeof patch.subtitle === "string" ? patch.subtitle.trim() : existing.subtitle},
      eyebrow = ${typeof patch.eyebrow === "string" ? patch.eyebrow.trim() : existing.eyebrow},
      excerpt = ${typeof patch.excerpt === "string" ? patch.excerpt.trim() : existing.excerpt},
      category = ${typeof patch.category === "string" ? patch.category.trim() : existing.category},
      cover_image = ${typeof patch.coverImage === "string" ? patch.coverImage.trim() : existing.coverImage},
      read_time = ${typeof patch.readTime === "string" ? patch.readTime.trim() : existing.readTime},
      author_name = ${typeof patch.authorName === "string" ? patch.authorName.trim() : existing.authorName},
      status = ${status},
      publish_at = ${publishAt},
      sections = ${JSON.stringify(sections)}::jsonb,
      upsell = ${JSON.stringify(upsell)}::jsonb,
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function deleteBlogPost(id: string): Promise<boolean> {
  await ensureBlogTable();
  const sql = getSql();
  await sql`DELETE FROM blog_posts WHERE id = ${id}`;
  return true;
}
