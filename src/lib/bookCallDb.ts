import { neon } from "@neondatabase/serverless";

export interface BookCallConfig {
  step1Eyebrow: string;
  step1Title: string;
  step1TitleHighlight: string;
  step1TitleSuffix: string;
  step1Subtitle: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  helpLabel: string;
  helpPlaceholder: string;
  helpOptions: string[];
  privacyNote: string;
  step1Cta: string;

  step2Eyebrow: string;
  step2Title: string;
  step2Subtitle: string;
  goalLabel: string;
  goalPlaceholder: string;
  linkLabel: string;
  linkPlaceholder: string;
  timelineLabel: string;
  timelinePlaceholder: string;
  timelineOptions: string[];
  budgetLabel: string;
  budgetPlaceholder: string;
  budgetOptions: string[];
  notesLabel: string;
  notesPlaceholder: string;
  step2Cta: string;

  successEyebrow: string;
  successTitle: string;
  successMessage: string;
}

export const defaultBookCallConfig: BookCallConfig = {
  step1Eyebrow: "FREE STRATEGY CALL",
  step1Title: "Let's see how",
  step1TitleHighlight: "Adaptif",
  step1TitleSuffix: "can help",
  step1Subtitle:
    "Designers, strategists, motion artists, web builders and producers, every creative role available under one subscription.",
  nameLabel: "What's your full name?",
  namePlaceholder: "Your full name",
  emailLabel: "What's your work email?",
  emailPlaceholder: "you@company.com",
  helpLabel: "What would you like help with?",
  helpPlaceholder: "Select an option...",
  helpOptions: [
    "Dedicated Creative Team",
    "Brand Identity & Visual System",
    "Web Design & Development",
    "Motion, Video & Ad Creative",
    "AI Production & Automation",
    "Full Stack Creative Subscription",
  ],
  privacyNote: "We'll only use your details to coordinate your call. No spam.",
  step1Cta: "Tell us about your project",

  step2Eyebrow: "THIS IS OPTIONAL",
  step2Title: "Help us prepare for your call",
  step2Subtitle:
    "Answer a few quick questions so we can make the most of our time together. This is optional.",
  goalLabel: "What is the main goal of your project?",
  goalPlaceholder: "e.g. New website, improve brand, email automation workflow",
  linkLabel: "Do you have a website or relevant link to share?",
  linkPlaceholder: "Paste a website, social profile, or reference link",
  timelineLabel: "What is your ideal timeline?",
  timelinePlaceholder: "Select a timeline",
  timelineOptions: [
    "Immediately / This week",
    "Within 2–4 weeks",
    "1–2 months",
    "Flexible / Exploring",
  ],
  budgetLabel: "What budget range are you considering?",
  budgetPlaceholder: "This helps us recommend the right approach",
  budgetOptions: [
    "$4,000 – $6,000 / mo",
    "$6,000 – $10,000 / mo",
    "$10,000+ / mo",
    "Not sure yet",
  ],
  notesLabel: "Is there anything else we should know before the call?",
  notesPlaceholder: "Share any context, questions, or requirements you'd like us to know...",
  step2Cta: "Book a Call",

  successEyebrow: "CALL REQUESTED",
  successTitle: "We've got your details",
  successMessage:
    "Thanks for sharing your project. Our team will reach out shortly to confirm your strategy call.",
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

let schemaReadyPromise: Promise<void> | null = null;

export async function ensureBookCallSchema(): Promise<void> {
  if (schemaReadyPromise) return schemaReadyPromise;

  schemaReadyPromise = (async () => {
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS book_call_submissions (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        work_email TEXT NOT NULL,
        help_topic TEXT NOT NULL DEFAULT '',
        project_goal TEXT NOT NULL DEFAULT '',
        reference_link TEXT NOT NULL DEFAULT '',
        timeline TEXT NOT NULL DEFAULT '',
        budget_range TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  })().catch((err) => {
    schemaReadyPromise = null;
    throw err;
  });

  return schemaReadyPromise;
}

function mergeConfig(raw: unknown): BookCallConfig {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const str = (k: keyof BookCallConfig, fallback: string) =>
    typeof obj[k] === "string" ? (obj[k] as string) : fallback;
  const arr = (k: keyof BookCallConfig, fallback: string[]) =>
    Array.isArray(obj[k])
      ? (obj[k] as unknown[]).map((v) => String(v).trim()).filter(Boolean)
      : fallback;

  return {
    step1Eyebrow: str("step1Eyebrow", defaultBookCallConfig.step1Eyebrow),
    step1Title: str("step1Title", defaultBookCallConfig.step1Title),
    step1TitleHighlight: str("step1TitleHighlight", defaultBookCallConfig.step1TitleHighlight),
    step1TitleSuffix: str("step1TitleSuffix", defaultBookCallConfig.step1TitleSuffix),
    step1Subtitle: str("step1Subtitle", defaultBookCallConfig.step1Subtitle),
    nameLabel: str("nameLabel", defaultBookCallConfig.nameLabel),
    namePlaceholder: str("namePlaceholder", defaultBookCallConfig.namePlaceholder),
    emailLabel: str("emailLabel", defaultBookCallConfig.emailLabel),
    emailPlaceholder: str("emailPlaceholder", defaultBookCallConfig.emailPlaceholder),
    helpLabel: str("helpLabel", defaultBookCallConfig.helpLabel),
    helpPlaceholder: str("helpPlaceholder", defaultBookCallConfig.helpPlaceholder),
    helpOptions: arr("helpOptions", defaultBookCallConfig.helpOptions),
    privacyNote: str("privacyNote", defaultBookCallConfig.privacyNote),
    step1Cta: str("step1Cta", defaultBookCallConfig.step1Cta),

    step2Eyebrow: str("step2Eyebrow", defaultBookCallConfig.step2Eyebrow),
    step2Title: str("step2Title", defaultBookCallConfig.step2Title),
    step2Subtitle: str("step2Subtitle", defaultBookCallConfig.step2Subtitle),
    goalLabel: str("goalLabel", defaultBookCallConfig.goalLabel),
    goalPlaceholder: str("goalPlaceholder", defaultBookCallConfig.goalPlaceholder),
    linkLabel: str("linkLabel", defaultBookCallConfig.linkLabel),
    linkPlaceholder: str("linkPlaceholder", defaultBookCallConfig.linkPlaceholder),
    timelineLabel: str("timelineLabel", defaultBookCallConfig.timelineLabel),
    timelinePlaceholder: str("timelinePlaceholder", defaultBookCallConfig.timelinePlaceholder),
    timelineOptions: arr("timelineOptions", defaultBookCallConfig.timelineOptions),
    budgetLabel: str("budgetLabel", defaultBookCallConfig.budgetLabel),
    budgetPlaceholder: str("budgetPlaceholder", defaultBookCallConfig.budgetPlaceholder),
    budgetOptions: arr("budgetOptions", defaultBookCallConfig.budgetOptions),
    notesLabel: str("notesLabel", defaultBookCallConfig.notesLabel),
    notesPlaceholder: str("notesPlaceholder", defaultBookCallConfig.notesPlaceholder),
    step2Cta: str("step2Cta", defaultBookCallConfig.step2Cta),

    successEyebrow: str("successEyebrow", defaultBookCallConfig.successEyebrow),
    successTitle: str("successTitle", defaultBookCallConfig.successTitle),
    successMessage: str("successMessage", defaultBookCallConfig.successMessage),
  };
}

export async function getBookCallConfig(): Promise<BookCallConfig> {
  try {
    await ensureBookCallSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT value FROM site_settings WHERE key = 'book_call_config' LIMIT 1
    `;
    if (rows.length === 0) return defaultBookCallConfig;
    return mergeConfig(rows[0].value);
  } catch (err) {
    console.error("[bookCallDb] Falling back to default config:", err);
    return defaultBookCallConfig;
  }
}

export async function saveBookCallConfig(patch: Partial<BookCallConfig>): Promise<BookCallConfig> {
  await ensureBookCallSchema();
  const current = await getBookCallConfig();
  const next = mergeConfig({ ...current, ...patch });
  const sql = getSql();

  await sql`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES ('book_call_config', ${JSON.stringify(next)}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = NOW()
  `;

  return next;
}

export interface BookCallSubmissionInput {
  fullName: string;
  workEmail: string;
  helpTopic?: string;
  projectGoal?: string;
  referenceLink?: string;
  timeline?: string;
  budgetRange?: string;
  notes?: string;
}

export async function createBookCallSubmission(input: BookCallSubmissionInput): Promise<{ id: number }> {
  await ensureBookCallSchema();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO book_call_submissions (
      full_name, work_email, help_topic, project_goal, reference_link, timeline, budget_range, notes
    ) VALUES (
      ${input.fullName.trim()},
      ${input.workEmail.trim()},
      ${(input.helpTopic ?? "").trim()},
      ${(input.projectGoal ?? "").trim()},
      ${(input.referenceLink ?? "").trim()},
      ${(input.timeline ?? "").trim()},
      ${(input.budgetRange ?? "").trim()},
      ${(input.notes ?? "").trim()}
    )
    RETURNING id
  `;
  return { id: Number(rows[0]?.id ?? 0) };
}
