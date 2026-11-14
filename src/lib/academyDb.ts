import { neon } from "@neondatabase/serverless";
import crypto from "node:crypto";

export type AcademyKind = "guide" | "course";
export type AcademyStatus = "draft" | "published" | "scheduled";
export type CourseAccessMode = "stripe_webhook" | "checkout_redirect" | "open";
export type SlideLayout = "cover" | "split" | "bullets" | "grid" | "quote" | "cta";

export interface AcademySlide {
  id: string;
  layout: SlideLayout;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  image?: string;
  callout?: string;
}

export type FunnelBlockKey =
  | "valueStrip"
  | "beforeAfter"
  | "visualComparison"
  | "pillars"
  | "systemShowcase"
  | "explorer"
  | "toolSpotlight"
  | "curriculum"
  | "outcomes"
  | "deliverables"
  | "closingCta"
  | "faq";

export type FunnelVisibility = Record<FunnelBlockKey, boolean>;

export const FUNNEL_BLOCKS: { key: FunnelBlockKey; label: string; desc: string }[] = [
  { key: "valueStrip", label: "Value Strip", desc: "4–5 quick trust & format highlights" },
  { key: "beforeAfter", label: "Before / After Grid", desc: "6-card problem vs. solution contrast" },
  { key: "visualComparison", label: "Visual Split Proof", desc: "Side-by-side transformation visual" },
  { key: "pillars", label: "Core Method Pillars", desc: "6-card framework principles" },
  { key: "systemShowcase", label: "System Showcase", desc: "Full-width workflow or diagram frame" },
  { key: "explorer", label: "Interactive Explorer", desc: "Tabbed module & specs preview" },
  { key: "toolSpotlight", label: "Companion Tool", desc: "Included template or micro-app card" },
  { key: "curriculum", label: "Curriculum Grid", desc: "Micro-cards covering every topic" },
  { key: "outcomes", label: "Target Outcomes", desc: "Outcome bullets + vertical visual" },
  { key: "deliverables", label: "Deliverables Grid", desc: "4-card breakdown of included assets" },
  { key: "closingCta", label: "Closing Offer Banner", desc: "Final conversion card & checklist" },
  { key: "faq", label: "FAQ Accordion", desc: "Objection-handling Q&A section" }
];

export function defaultFunnelVisibility(overrides?: Partial<Record<FunnelBlockKey, boolean>>): FunnelVisibility {
  const base: FunnelVisibility = {
    valueStrip: true,
    beforeAfter: true,
    visualComparison: true,
    pillars: true,
    systemShowcase: true,
    explorer: true,
    toolSpotlight: true,
    curriculum: true,
    outcomes: true,
    deliverables: true,
    closingCta: true,
    faq: true
  };
  if (overrides && typeof overrides === "object") {
    for (const { key } of FUNNEL_BLOCKS) {
      if (typeof overrides[key] === "boolean") {
        base[key] = overrides[key] as boolean;
      }
    }
  }
  return base;
}

export interface CourseFunnelData {
  valueStrip: string[];
  beforeAfter: {
    eyebrow: string;
    title: string;
    subtitle: string;
    beforeItems: { title: string; body: string }[];
    afterItems: { title: string; body: string }[];
  };
  visualComparison: {
    eyebrow: string;
    title: string;
    body: string;
    beforeLabel: string;
    afterLabel: string;
    image: string;
  };
  pillars: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: { title: string; body: string }[];
  };
  systemShowcase: {
    eyebrow: string;
    title: string;
    subtitle: string;
    image: string;
    caption: string;
  };
  explorer: {
    eyebrow: string;
    title: string;
    subtitle: string;
    tabs: {
      label: string;
      title: string;
      body: string;
      image: string;
      specs: { label: string; value: string }[];
    }[];
  };
  curriculum: {
    eyebrow: string;
    title: string;
    subtitle: string;
    modules: { tag: string; title: string; body: string }[];
  };
  outcomes: {
    eyebrow: string;
    title: string;
    subtitle: string;
    image: string;
    bullets: { title: string; body: string }[];
  };
  deliverables: {
    eyebrow: string;
    title: string;
    items: { badge: string; title: string; body: string }[];
  };
  closingCta: {
    eyebrow: string;
    title: string;
    body: string;
    checklist: string[];
    image: string;
  };
}

export interface AcademyLandingData {
  heroBadge: string;
  readTime: string;
  audience: string;
  takeaways: string[];
  faq: { q: string; a: string }[];
  funnelVisibility?: FunnelVisibility;
  funnel?: Partial<CourseFunnelData>;
}

export interface AcademyItem {
  id: string;
  slug: string;
  kind: AcademyKind;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  coverImage: string;
  status: AcademyStatus;
  publishAt: string | null;
  priceLabel: string;
  stripeCheckoutUrl: string;
  accessMode: CourseAccessMode;
  toolName: string;
  toolType: string;
  toolUrl: string;
  landingData: AcademyLandingData;
  slides: AcademySlide[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AcademySettings {
  defaultCourseAccessMode: CourseAccessMode;
  hasStripeWebhookSecret: boolean;
  aiProvider: "gemini" | "openai";
  hasAiApiKey: boolean;
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

let schemaReadyPromise: Promise<void> | null = null;

const SEED_GUIDE: Omit<AcademyItem, "createdAt" | "updatedAt"> = {
  id: "guide-ai-creative-velocity",
  slug: "ai-creative-velocity-playbook",
  kind: "guide",
  title: "The AI Creative Velocity Playbook",
  subtitle: "How modern creative teams cut concept-to-launch time by 70% without sacrificing craft.",
  description:
    "A practical, no-fluff framework covering briefing, AI-assisted concepting, art direction guardrails, and rapid iteration loops.",
  category: "AI Workflows",
  coverImage: "/images/why-us/ai-excellence.jpg",
  status: "published",
  publishAt: null,
  priceLabel: "Free",
  stripeCheckoutUrl: "",
  accessMode: "open",
  toolName: "",
  toolType: "",
  toolUrl: "",
  landingData: {
    heroBadge: "Free Tactical Guide",
    readTime: "12 min read · 6 slides",
    audience: "Creative Directors, Founders & Marketing Leads",
    takeaways: [
      "Structure creative briefs so AI outputs stay 100% on-brand",
      "Build a 3-stage human-in-the-loop review pipeline",
      "Ship multi-channel ad variations in hours instead of weeks",
      "Avoid the most common visual consistency traps"
    ],
    faq: [
      {
        q: "Who is this guide for?",
        a: "Teams and founders who want repeatable, high-craft creative output using AI without generic results."
      },
      {
        q: "Can I download it as a PDF?",
        a: "Yes. Enter your name and email below to unlock the online slide viewer and instant PDF download."
      }
    ]
  },
  slides: [
    {
      id: "s1",
      layout: "cover",
      eyebrow: "Adaptif Academy · Free Guide",
      title: "The AI Creative Velocity Playbook",
      body: "How modern brand teams ship 3x more high-craft campaigns without bloating headcount.",
      bullets: ["Framework", "Guardrails", "Production Loop"]
    },
    {
      id: "s2",
      layout: "bullets",
      eyebrow: "01 · The Bottleneck",
      title: "Why most AI creative workflows stall",
      body: "Speed without direction just produces more revisions. The real leverage is upstream.",
      bullets: [
        "Vague briefs force endless prompt roulette",
        "Disconnected tools break brand typography and color",
        "No standardized QA gate before assets reach stakeholders"
      ],
      callout: "Fix the brief and the system — the prompts become 10x simpler."
    },
    {
      id: "s3",
      layout: "grid",
      eyebrow: "02 · The 3-Stage Engine",
      title: "Concept → System → Scale",
      body: "Separate exploration from production so every stage has clear ownership.",
      bullets: [
        "Stage 1: Human-led creative direction & moodboards",
        "Stage 2: AI-assisted layout & copy variations",
        "Stage 3: Automated resizing & channel adaptation",
        "Stage 4: Senior design polish before launch"
      ]
    },
    {
      id: "s4",
      layout: "quote",
      eyebrow: "Core Principle",
      title: "AI should multiply your taste, not replace it.",
      body: "Use AI to explore 20 directions in 15 minutes, then apply human judgment to refine the winning 10%.",
      bullets: []
    },
    {
      id: "s5",
      layout: "cta",
      eyebrow: "Ready to scale?",
      title: "Plug Adaptif into your creative workflow",
      body: "Get a dedicated creative team + AI velocity in one flat monthly subscription.",
      bullets: ["1–2 day turnarounds", "Unlimited requests & revisions", "Senior design + AI engineering"]
    }
  ],
  sortOrder: 1
};

const SEED_COURSE: Omit<AcademyItem, "createdAt" | "updatedAt"> = {
  id: "course-obsidian-brand-systems",
  slug: "high-converting-brand-systems-with-ai",
  kind: "course",
  title: "High-Converting Brand Systems with AI",
  subtitle: "Build cohesive visual identities, ad engines, and interactive web assets in 48 hours.",
  description:
    "An end-to-end production system including step-by-step slides, downloadable PDF handbook, and a ready-to-use Magnific & Figma prompt kit.",
  category: "Brand & Design Systems",
  coverImage: "/images/why-us/our-technology.jpg",
  status: "published",
  publishAt: null,
  priceLabel: "$49",
  stripeCheckoutUrl: "https://buy.stripe.com/test_example",
  accessMode: "stripe_webhook",
  toolName: "Adaptif Prompt & Token Kit",
  toolType: "Template + Micro-App",
  toolUrl: "https://adaptif-web.vercel.app",
  landingData: {
    heroBadge: "Pro Course + Companion Kit",
    readTime: "45 min deep-dive · PDF + Online Deck",
    audience: "Designers, Brand Builders & Studio Operators",
    takeaways: [
      "Complete token-first brand architecture for web & social",
      "Exact Magnific & image-gen recipes for studio-grade lighting",
      "Component checklist for high-converting SaaS landing pages",
      "Includes the Adaptif Prompt & Token Kit ready to duplicate"
    ],
    faq: [
      {
        q: "Are there modules or quizzes to complete?",
        a: "No fluff or locked modules. You get immediate access to the complete online slide deck, downloadable PDF, and companion tool."
      },
      {
        q: "What format is the PDF?",
        a: "High-resolution 16:9 vector PDF with selectable text, matching the online slide deck pixel-for-pixel."
      }
    ]
  },
  slides: [
    {
      id: "c1",
      layout: "cover",
      eyebrow: "Adaptif Academy · Pro Course",
      title: "High-Converting Brand Systems with AI",
      body: "From raw positioning to a luminous, cohesive visual system in 48 hours.",
      bullets: ["Token Architecture", "AI Art Direction", "Companion Kit"]
    },
    {
      id: "c2",
      layout: "split",
      eyebrow: "01 · Foundation",
      title: "Design tokens before pixels",
      body: "Locking your surface hierarchy, specular borders, and type scale first prevents AI drift across deliverables.",
      bullets: [
        "Define 1 void, 3 surface elevations, and 1 primary accent",
        "Pair a geometric sans with an editorial serif for contrast",
        "Standardize card radius, bevel highlights, and spacing"
      ],
      callout: "Included in your Companion Kit: copy-paste CSS & Figma variables."
    },
    {
      id: "c3",
      layout: "bullets",
      eyebrow: "02 · Visual Engine",
      title: "Consistent AI imagery at scale",
      body: "How to direct lighting, camera angle, and material finish across 50+ brand assets.",
      bullets: [
        "Use a fixed lighting & material suffix in every prompt",
        "Upscale & refine textures with Magnific presets",
        "Composite UI screenshots inside obsidian glass frames"
      ]
    },
    {
      id: "c4",
      layout: "cta",
      eyebrow: "Companion Tool Included",
      title: "Launch the Adaptif Prompt & Token Kit",
      body: "Use the included template & micro-app link from your course dashboard to generate your next brand system.",
      bullets: ["Full PDF Handbook", "Online Slide Deck", "Companion Template"]
    }
  ],
  sortOrder: 2
};

export async function ensureAcademySchema(): Promise<void> {
  if (schemaReadyPromise) return schemaReadyPromise;

  schemaReadyPromise = (async () => {
    const sql = getSql();

    await sql`
      CREATE TABLE IF NOT EXISTS academy_items (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        kind TEXT NOT NULL DEFAULT 'guide',
        title TEXT NOT NULL,
        subtitle TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'AI Workflows',
        cover_image TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft',
        publish_at TIMESTAMPTZ NULL,
        price_label TEXT NOT NULL DEFAULT '',
        stripe_checkout_url TEXT NOT NULL DEFAULT '',
        access_mode TEXT NOT NULL DEFAULT 'stripe_webhook',
        tool_name TEXT NOT NULL DEFAULT '',
        tool_type TEXT NOT NULL DEFAULT '',
        tool_url TEXT NOT NULL DEFAULT '',
        landing_data JSONB NOT NULL DEFAULT '{}'::jsonb,
        slides JSONB NOT NULL DEFAULT '[]'::jsonb,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS academy_leads (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        item_slug TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS academy_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        default_course_access_mode TEXT NOT NULL DEFAULT 'stripe_webhook',
        stripe_webhook_secret TEXT NOT NULL DEFAULT '',
        ai_provider TEXT NOT NULL DEFAULT 'gemini',
        ai_api_key TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      ALTER TABLE academy_settings
      ADD COLUMN IF NOT EXISTS ai_provider TEXT NOT NULL DEFAULT 'gemini'
    `;

    await sql`
      ALTER TABLE academy_settings
      ADD COLUMN IF NOT EXISTS ai_api_key TEXT NOT NULL DEFAULT ''
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS academy_access_tokens (
        token TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT 'guide_lead',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      INSERT INTO academy_settings (id, default_course_access_mode, stripe_webhook_secret)
      VALUES (1, 'stripe_webhook', '')
      ON CONFLICT (id) DO NOTHING
    `;

    const countRows = await sql`SELECT COUNT(*)::int AS count FROM academy_items`;
    if (Number(countRows[0]?.count ?? 0) === 0) {
      for (const item of [SEED_GUIDE, SEED_COURSE]) {
        await sql`
          INSERT INTO academy_items (
            id, slug, kind, title, subtitle, description, category, cover_image,
            status, publish_at, price_label, stripe_checkout_url, access_mode,
            tool_name, tool_type, tool_url, landing_data, slides, sort_order
          ) VALUES (
            ${item.id},
            ${item.slug},
            ${item.kind},
            ${item.title},
            ${item.subtitle},
            ${item.description},
            ${item.category},
            ${item.coverImage},
            ${item.status},
            ${item.publishAt},
            ${item.priceLabel},
            ${item.stripeCheckoutUrl},
            ${item.accessMode},
            ${item.toolName},
            ${item.toolType},
            ${item.toolUrl},
            ${JSON.stringify(item.landingData)}::jsonb,
            ${JSON.stringify(item.slides)}::jsonb,
            ${item.sortOrder}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }
  })().catch((err) => {
    schemaReadyPromise = null;
    throw err;
  });

  return schemaReadyPromise;
}

function mapItem(row: Record<string, any>): AcademyItem {
  const landingRaw = row.landing_data && typeof row.landing_data === "object" ? row.landing_data : {};
  const slidesRaw = Array.isArray(row.slides) ? row.slides : [];

  return {
    id: String(row.id),
    slug: String(row.slug),
    kind: row.kind === "course" ? "course" : "guide",
    title: String(row.title ?? ""),
    subtitle: String(row.subtitle ?? ""),
    description: String(row.description ?? ""),
    category: String(row.category ?? "AI Workflows"),
    coverImage: String(row.cover_image ?? ""),
    status:
      row.status === "published" || row.status === "scheduled" ? row.status : "draft",
    publishAt: row.publish_at ? new Date(row.publish_at).toISOString() : null,
    priceLabel: String(row.price_label ?? ""),
    stripeCheckoutUrl: String(row.stripe_checkout_url ?? ""),
    accessMode:
      row.access_mode === "checkout_redirect" || row.access_mode === "open"
        ? row.access_mode
        : "stripe_webhook",
    toolName: String(row.tool_name ?? ""),
    toolType: String(row.tool_type ?? ""),
    toolUrl: String(row.tool_url ?? ""),
    landingData: {
      heroBadge: String(landingRaw.heroBadge ?? (row.kind === "course" ? "Pro Course" : "Free Guide")),
      readTime: String(landingRaw.readTime ?? ""),
      audience: String(landingRaw.audience ?? ""),
      takeaways: Array.isArray(landingRaw.takeaways) ? landingRaw.takeaways.map(String) : [],
      faq: Array.isArray(landingRaw.faq)
        ? landingRaw.faq.map((f: any) => ({ q: String(f?.q ?? ""), a: String(f?.a ?? "") }))
        : [],
      funnelVisibility: defaultFunnelVisibility(landingRaw.funnelVisibility),
      funnel: landingRaw.funnel && typeof landingRaw.funnel === "object" ? landingRaw.funnel : undefined
    },
    slides: slidesRaw.map((s: any, idx: number) => ({
      id: String(s?.id ?? `slide-${idx + 1}`),
      layout: (["cover", "split", "bullets", "grid", "quote", "cta"].includes(s?.layout)
        ? s.layout
        : "bullets") as SlideLayout,
      eyebrow: String(s?.eyebrow ?? ""),
      title: String(s?.title ?? ""),
      body: String(s?.body ?? ""),
      bullets: Array.isArray(s?.bullets) ? s.bullets.map(String) : [],
      image: s?.image ? String(s.image) : undefined,
      callout: s?.callout ? String(s.callout) : undefined
    })),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `item-${Date.now()}`;
}

export async function listAcademyItems(options: {
  kind?: AcademyKind;
  includeUnpublished?: boolean;
} = {}): Promise<AcademyItem[]> {
  await ensureAcademySchema();
  const sql = getSql();

  const rows = options.includeUnpublished
    ? options.kind
      ? await sql`
          SELECT * FROM academy_items
          WHERE kind = ${options.kind}
          ORDER BY sort_order ASC, created_at DESC
        `
      : await sql`
          SELECT * FROM academy_items
          ORDER BY sort_order ASC, created_at DESC
        `
    : options.kind
      ? await sql`
          SELECT * FROM academy_items
          WHERE kind = ${options.kind}
            AND (status = 'published' OR (status = 'scheduled' AND publish_at <= NOW()))
          ORDER BY sort_order ASC, created_at DESC
        `
      : await sql`
          SELECT * FROM academy_items
          WHERE status = 'published' OR (status = 'scheduled' AND publish_at <= NOW())
          ORDER BY sort_order ASC, created_at DESC
        `;

  return rows.map(mapItem);
}

export async function getAcademyItemBySlug(
  slug: string,
  kind?: AcademyKind,
  includeUnpublished = false
): Promise<AcademyItem | null> {
  await ensureAcademySchema();
  const sql = getSql();

  const rows = includeUnpublished
    ? kind
      ? await sql`SELECT * FROM academy_items WHERE slug = ${slug} AND kind = ${kind} LIMIT 1`
      : await sql`SELECT * FROM academy_items WHERE slug = ${slug} LIMIT 1`
    : kind
      ? await sql`
          SELECT * FROM academy_items
          WHERE slug = ${slug} AND kind = ${kind}
            AND (status = 'published' OR (status = 'scheduled' AND publish_at <= NOW()))
          LIMIT 1
        `
      : await sql`
          SELECT * FROM academy_items
          WHERE slug = ${slug}
            AND (status = 'published' OR (status = 'scheduled' AND publish_at <= NOW()))
          LIMIT 1
        `;

  return rows[0] ? mapItem(rows[0]) : null;
}

export async function getAcademyItemById(id: string): Promise<AcademyItem | null> {
  await ensureAcademySchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM academy_items WHERE id = ${id} LIMIT 1`;
  return rows[0] ? mapItem(rows[0]) : null;
}

export async function createAcademyItem(
  input: Partial<AcademyItem> & { title: string; kind: AcademyKind }
): Promise<AcademyItem> {
  await ensureAcademySchema();
  const sql = getSql();

  const baseSlug = slugify(input.slug || input.title);
  const id = input.id || `${input.kind}-${baseSlug}-${crypto.randomBytes(2).toString("hex")}`;
  const existing = await sql`SELECT 1 FROM academy_items WHERE slug = ${baseSlug} LIMIT 1`;
  const slug = existing.length > 0 ? `${baseSlug}-${crypto.randomBytes(2).toString("hex")}` : baseSlug;

  const rows = await sql`
    INSERT INTO academy_items (
      id, slug, kind, title, subtitle, description, category, cover_image,
      status, publish_at, price_label, stripe_checkout_url, access_mode,
      tool_name, tool_type, tool_url, landing_data, slides, sort_order
    ) VALUES (
      ${id},
      ${slug},
      ${input.kind},
      ${input.title},
      ${input.subtitle ?? ""},
      ${input.description ?? ""},
      ${input.category ?? "AI Workflows"},
      ${input.coverImage ?? ""},
      ${input.status ?? "draft"},
      ${input.publishAt ?? null},
      ${input.priceLabel ?? (input.kind === "guide" ? "Free" : "$49")},
      ${input.stripeCheckoutUrl ?? ""},
      ${input.accessMode ?? (input.kind === "guide" ? "open" : "stripe_webhook")},
      ${input.toolName ?? ""},
      ${input.toolType ?? ""},
      ${input.toolUrl ?? ""},
      ${JSON.stringify(input.landingData ?? { heroBadge: input.kind === "course" ? "Pro Course" : "Free Guide", readTime: "", audience: "", takeaways: [], faq: [] })}::jsonb,
      ${JSON.stringify(input.slides ?? [])}::jsonb,
      ${input.sortOrder ?? 0}
    )
    RETURNING *
  `;

  return mapItem(rows[0]);
}

export async function updateAcademyItem(
  id: string,
  patch: Partial<AcademyItem>
): Promise<AcademyItem | null> {
  await ensureAcademySchema();
  const existing = await getAcademyItemById(id);
  if (!existing) return null;

  const sql = getSql();
  const nextSlug = patch.slug ? slugify(patch.slug) : existing.slug;

  const rows = await sql`
    UPDATE academy_items SET
      slug = ${nextSlug},
      kind = ${patch.kind ?? existing.kind},
      title = ${patch.title ?? existing.title},
      subtitle = ${patch.subtitle ?? existing.subtitle},
      description = ${patch.description ?? existing.description},
      category = ${patch.category ?? existing.category},
      cover_image = ${patch.coverImage ?? existing.coverImage},
      status = ${patch.status ?? existing.status},
      publish_at = ${patch.publishAt !== undefined ? patch.publishAt : existing.publishAt},
      price_label = ${patch.priceLabel ?? existing.priceLabel},
      stripe_checkout_url = ${patch.stripeCheckoutUrl ?? existing.stripeCheckoutUrl},
      access_mode = ${patch.accessMode ?? existing.accessMode},
      tool_name = ${patch.toolName ?? existing.toolName},
      tool_type = ${patch.toolType ?? existing.toolType},
      tool_url = ${patch.toolUrl ?? existing.toolUrl},
      landing_data = ${JSON.stringify(patch.landingData ?? existing.landingData)}::jsonb,
      slides = ${JSON.stringify(patch.slides ?? existing.slides)}::jsonb,
      sort_order = ${patch.sortOrder ?? existing.sortOrder},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  return rows[0] ? mapItem(rows[0]) : null;
}

export async function deleteAcademyItem(id: string): Promise<boolean> {
  await ensureAcademySchema();
  const sql = getSql();
  const rows = await sql`DELETE FROM academy_items WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function getAcademySettings(): Promise<AcademySettings> {
  await ensureAcademySchema();
  const sql = getSql();
  const rows = await sql`
    SELECT default_course_access_mode, stripe_webhook_secret, ai_provider, ai_api_key
    FROM academy_settings WHERE id = 1 LIMIT 1
  `;
  const row = rows[0] ?? {};
  const mode =
    row.default_course_access_mode === "checkout_redirect" || row.default_course_access_mode === "open"
      ? row.default_course_access_mode
      : "stripe_webhook";
  const envKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "";
  return {
    defaultCourseAccessMode: mode,
    hasStripeWebhookSecret: Boolean(row.stripe_webhook_secret),
    aiProvider: row.ai_provider === "openai" ? "openai" : "gemini",
    hasAiApiKey: Boolean(row.ai_api_key || envKey)
  };
}

export async function getAcademyAiCredentials(): Promise<{ provider: "gemini" | "openai"; apiKey: string }> {
  await ensureAcademySchema();
  const sql = getSql();
  const rows = await sql`SELECT ai_provider, ai_api_key FROM academy_settings WHERE id = 1 LIMIT 1`;
  const row = rows[0] ?? {};
  const provider: "gemini" | "openai" = row.ai_provider === "openai" ? "openai" : "gemini";
  const dbKey = String(row.ai_api_key ?? "").trim();
  const envKey =
    provider === "openai"
      ? process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || ""
      : process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "";
  return { provider, apiKey: dbKey || envKey };
}

export async function getAcademyWebhookSecret(): Promise<string> {
  await ensureAcademySchema();
  const sql = getSql();
  const rows = await sql`SELECT stripe_webhook_secret FROM academy_settings WHERE id = 1 LIMIT 1`;
  return String(rows[0]?.stripe_webhook_secret ?? "");
}

export async function saveAcademySettings(input: {
  defaultCourseAccessMode?: CourseAccessMode;
  stripeWebhookSecret?: string;
  aiProvider?: "gemini" | "openai";
  aiApiKey?: string;
}): Promise<AcademySettings> {
  await ensureAcademySchema();
  const sql = getSql();
  const current = await getAcademySettings();
  const nextMode = input.defaultCourseAccessMode ?? current.defaultCourseAccessMode;
  const nextProvider = input.aiProvider ?? current.aiProvider;

  await sql`
    UPDATE academy_settings
    SET default_course_access_mode = ${nextMode},
        ai_provider = ${nextProvider},
        updated_at = NOW()
    WHERE id = 1
  `;

  if (input.stripeWebhookSecret !== undefined && input.stripeWebhookSecret.trim() !== "") {
    await sql`
      UPDATE academy_settings
      SET stripe_webhook_secret = ${input.stripeWebhookSecret.trim()}
      WHERE id = 1
    `;
  }

  if (input.aiApiKey !== undefined && input.aiApiKey.trim() !== "") {
    await sql`
      UPDATE academy_settings
      SET ai_api_key = ${input.aiApiKey.trim()}
      WHERE id = 1
    `;
  }

  return getAcademySettings();
}

export async function recordGuideLeadAndCreateToken(input: {
  itemId: string;
  itemSlug: string;
  name: string;
  email: string;
}): Promise<string> {
  await ensureAcademySchema();
  const sql = getSql();

  const leadId = `lead-${crypto.randomUUID()}`;
  await sql`
    INSERT INTO academy_leads (id, item_id, item_slug, name, email)
    VALUES (${leadId}, ${input.itemId}, ${input.itemSlug}, ${input.name}, ${input.email})
  `;

  return createAccessToken(input.itemId, input.email, "guide_lead");
}

export async function createAccessToken(
  itemId: string,
  email: string,
  source: "guide_lead" | "stripe_webhook" | "manual"
): Promise<string> {
  await ensureAcademySchema();
  const sql = getSql();
  const token = crypto.randomBytes(18).toString("hex");
  await sql`
    INSERT INTO academy_access_tokens (token, item_id, email, source)
    VALUES (${token}, ${itemId}, ${email}, ${source})
  `;
  return token;
}

export async function verifyAccessToken(itemId: string, token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  await ensureAcademySchema();
  const sql = getSql();
  const rows = await sql`
    SELECT 1 FROM academy_access_tokens
    WHERE token = ${token} AND item_id = ${itemId}
    LIMIT 1
  `;
  return rows.length > 0;
}
