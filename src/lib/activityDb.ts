import { neon } from "@neondatabase/serverless";
import { ensureBookCallSchema } from "./bookCallDb";

export type ActivityType = "book_call" | "plan" | "course";

export interface UnifiedActivityItem {
  uid: string;
  id: number;
  type: ActivityType;
  contactName: string;
  contactEmail: string;
  itemName: string;
  detail: string;
  amountCents: number | null;
  currency: string;
  status: string;
  livemode: boolean;
  createdAt: string;
  meta: Record<string, string>;
}

export interface StripePurchaseInput {
  stripeSessionId: string;
  purchaseType: "plan" | "course";
  itemName: string;
  itemSlug?: string;
  customerName?: string;
  customerEmail?: string;
  amountCents?: number;
  currency?: string;
  paymentStatus?: string;
  livemode?: boolean;
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

let activitySchemaPromise: Promise<void> | null = null;

export async function ensureActivitySchema(): Promise<void> {
  if (activitySchemaPromise) return activitySchemaPromise;

  activitySchemaPromise = (async () => {
    await ensureBookCallSchema();
    const sql = getSql();

    await sql`
      ALTER TABLE book_call_submissions
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS stripe_purchases (
        id SERIAL PRIMARY KEY,
        stripe_session_id TEXT UNIQUE NOT NULL,
        purchase_type TEXT NOT NULL,
        item_name TEXT NOT NULL,
        item_slug TEXT NOT NULL DEFAULT '',
        customer_name TEXT NOT NULL DEFAULT '',
        customer_email TEXT NOT NULL DEFAULT '',
        amount_cents INTEGER NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'usd',
        payment_status TEXT NOT NULL DEFAULT 'paid',
        livemode BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  })().catch((err) => {
    activitySchemaPromise = null;
    throw err;
  });

  return activitySchemaPromise;
}

export async function recordStripePurchase(input: StripePurchaseInput): Promise<void> {
  await ensureActivitySchema();
  const sql = getSql();

  await sql`
    INSERT INTO stripe_purchases (
      stripe_session_id,
      purchase_type,
      item_name,
      item_slug,
      customer_name,
      customer_email,
      amount_cents,
      currency,
      payment_status,
      livemode
    ) VALUES (
      ${input.stripeSessionId},
      ${input.purchaseType},
      ${input.itemName},
      ${input.itemSlug ?? ""},
      ${input.customerName ?? ""},
      ${input.customerEmail ?? ""},
      ${Math.round(Number(input.amountCents ?? 0))},
      ${(input.currency ?? "usd").toLowerCase()},
      ${input.paymentStatus ?? "paid"},
      ${Boolean(input.livemode)}
    )
    ON CONFLICT (stripe_session_id) DO UPDATE SET
      purchase_type = EXCLUDED.purchase_type,
      item_name = EXCLUDED.item_name,
      item_slug = EXCLUDED.item_slug,
      customer_name = COALESCE(NULLIF(EXCLUDED.customer_name, ''), stripe_purchases.customer_name),
      customer_email = COALESCE(NULLIF(EXCLUDED.customer_email, ''), stripe_purchases.customer_email),
      amount_cents = EXCLUDED.amount_cents,
      payment_status = EXCLUDED.payment_status
  `;
}

export async function listUnifiedActivity(): Promise<UnifiedActivityItem[]> {
  await ensureActivitySchema();
  const sql = getSql();

  const [callRows, purchaseRows] = await Promise.all([
    sql`
      SELECT id, full_name, work_email, help_topic, project_goal, reference_link, timeline, budget_range, notes, status, created_at
      FROM book_call_submissions
      ORDER BY created_at DESC
      LIMIT 300
    `,
    sql`
      SELECT id, stripe_session_id, purchase_type, item_name, item_slug, customer_name, customer_email, amount_cents, currency, payment_status, livemode, created_at
      FROM stripe_purchases
      ORDER BY created_at DESC
      LIMIT 300
    `,
  ]);

  const callItems: UnifiedActivityItem[] = callRows.map((row: any) => {
    const parts = [row.help_topic, row.timeline, row.budget_range].filter(Boolean);
    return {
      uid: `book_call:${row.id}`,
      id: Number(row.id),
      type: "book_call",
      contactName: String(row.full_name ?? ""),
      contactEmail: String(row.work_email ?? ""),
      itemName: String(row.help_topic || "Strategy Call"),
      detail: parts.join(" · ") || String(row.project_goal || row.notes || "Book a Call submission"),
      amountCents: null,
      currency: "usd",
      status: String(row.status || "new"),
      livemode: true,
      createdAt: new Date(row.created_at).toISOString(),
      meta: {
        helpTopic: String(row.help_topic ?? ""),
        projectGoal: String(row.project_goal ?? ""),
        referenceLink: String(row.reference_link ?? ""),
        timeline: String(row.timeline ?? ""),
        budgetRange: String(row.budget_range ?? ""),
        notes: String(row.notes ?? ""),
      },
    };
  });

  const purchaseItems: UnifiedActivityItem[] = purchaseRows.map((row: any) => {
    const pType = row.purchase_type === "plan" ? "plan" : "course";
    return {
      uid: `${pType}:${row.id}`,
      id: Number(row.id),
      type: pType,
      contactName: String(row.customer_name || ""),
      contactEmail: String(row.customer_email || ""),
      itemName: String(row.item_name || (pType === "plan" ? "Subscription Plan" : "Course")),
      detail: pType === "plan" ? "Plan Purchase" : "Course Purchase",
      amountCents: Number(row.amount_cents ?? 0),
      currency: String(row.currency || "usd"),
      status: String(row.payment_status || "paid"),
      livemode: Boolean(row.livemode),
      createdAt: new Date(row.created_at).toISOString(),
      meta: {
        stripeSessionId: String(row.stripe_session_id ?? ""),
        itemSlug: String(row.item_slug ?? ""),
      },
    };
  });

  return [...callItems, ...purchaseItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateBookCallStatus(id: number, status: string): Promise<void> {
  await ensureActivitySchema();
  const sql = getSql();
  const allowed = new Set(["new", "contacted", "closed"]);
  const nextStatus = allowed.has(status) ? status : "new";
  await sql`
    UPDATE book_call_submissions
    SET status = ${nextStatus}
    WHERE id = ${id}
  `;
}

export async function deleteActivityItem(type: ActivityType, id: number): Promise<void> {
  await ensureActivitySchema();
  const sql = getSql();
  if (type === "book_call") {
    await sql`DELETE FROM book_call_submissions WHERE id = ${id}`;
  } else {
    await sql`DELETE FROM stripe_purchases WHERE id = ${id}`;
  }
}
