import { neon } from "@neondatabase/serverless";

export interface TurnstileConfig {
  enabled: boolean;
  siteKey: string;
  secretKey: string;
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
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS studio_turnstile_config (
      id TEXT PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      site_key TEXT NOT NULL DEFAULT '',
      secret_key TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  tableReady = true;
}

function getEnvFallback(): { siteKey: string; secretKey: string } {
  const siteKey =
    process.env.PUBLIC_TURNSTILE_SITE_KEY ||
    import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ||
    "";
  const secretKey =
    process.env.TURNSTILE_SECRET_KEY ||
    import.meta.env.TURNSTILE_SECRET_KEY ||
    "";
  return { siteKey: siteKey.trim(), secretKey: secretKey.trim() };
}

export async function getTurnstileConfig(): Promise<TurnstileConfig> {
  const env = getEnvFallback();
  try {
    await ensureTable();
    const sql = getSql();
    const rows = await sql`
      SELECT enabled, site_key, secret_key, updated_at
      FROM studio_turnstile_config
      WHERE id = 'default'
      LIMIT 1
    `;
    if (rows.length > 0) {
      const row = rows[0];
      const siteKey = String(row.site_key || "").trim() || env.siteKey;
      const secretKey = String(row.secret_key || "").trim() || env.secretKey;
      return {
        enabled: Boolean(row.enabled),
        siteKey,
        secretKey,
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error("[turnstile] Failed to read config:", err);
  }

  return {
    enabled: Boolean(env.siteKey && env.secretKey),
    siteKey: env.siteKey,
    secretKey: env.secretKey,
    updatedAt: new Date().toISOString(),
  };
}

export async function saveTurnstileConfig(input: {
  enabled?: boolean;
  siteKey?: string;
  secretKey?: string;
}): Promise<TurnstileConfig> {
  await ensureTable();
  const current = await getTurnstileConfig();
  const nextEnabled = typeof input.enabled === "boolean" ? input.enabled : current.enabled;
  const nextSiteKey = typeof input.siteKey === "string" ? input.siteKey.trim() : current.siteKey;
  const nextSecretKey =
    typeof input.secretKey === "string" && input.secretKey.trim() !== ""
      ? input.secretKey.trim()
      : current.secretKey;

  const sql = getSql();
  const rows = await sql`
    INSERT INTO studio_turnstile_config (id, enabled, site_key, secret_key, updated_at)
    VALUES ('default', ${nextEnabled}, ${nextSiteKey}, ${nextSecretKey}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      site_key = EXCLUDED.site_key,
      secret_key = EXCLUDED.secret_key,
      updated_at = NOW()
    RETURNING enabled, site_key, secret_key, updated_at
  `;
  const row = rows[0];
  return {
    enabled: Boolean(row.enabled),
    siteKey: String(row.site_key || ""),
    secretKey: String(row.secret_key || ""),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string | null
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const cfg = await getTurnstileConfig();
  if (!cfg.enabled || !cfg.siteKey || !cfg.secretKey) {
    return { ok: true, skipped: true };
  }

  const cleanToken = (token || "").trim();
  if (!cleanToken) {
    return { ok: false, error: "Security verification required. Please refresh and try again." };
  }

  try {
    const body = new URLSearchParams();
    body.append("secret", cfg.secretKey);
    body.append("response", cleanToken);
    if (remoteIp) body.append("remoteip", remoteIp);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = await res.json();
    if (data?.success) {
      return { ok: true };
    }
    return { ok: false, error: "Security verification failed. Please try again." };
  } catch (err) {
    console.error("[turnstile] siteverify error:", err);
    return { ok: false, error: "Could not verify security challenge. Please try again." };
  }
}
