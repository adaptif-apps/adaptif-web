import { neon } from "@neondatabase/serverless";

export type WhatsAppPosition = "bottom-right" | "bottom-left";

export interface WhatsAppConfig {
  enabled: boolean;
  phoneNumber: string;
  message: string;
  position: WhatsAppPosition;
}

export const defaultWhatsAppConfig: WhatsAppConfig = {
  enabled: true,
  phoneNumber: "",
  message: "Hi Adaptif! I'd like to learn more about your creative services.",
  position: "bottom-right",
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

export function sanitizeWhatsAppPhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  const digits = sanitizeWhatsAppPhone(phoneNumber);
  if (!digits) return "";
  const trimmedMsg = message.trim();
  if (!trimmedMsg) return `https://wa.me/${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(trimmedMsg)}`;
}

function mergeWhatsAppConfig(raw: unknown): WhatsAppConfig {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, any>) : {};
  const position: WhatsAppPosition =
    obj.position === "bottom-left" ? "bottom-left" : "bottom-right";

  return {
    enabled: typeof obj.enabled === "boolean" ? obj.enabled : defaultWhatsAppConfig.enabled,
    phoneNumber:
      typeof obj.phoneNumber === "string"
        ? obj.phoneNumber.trim()
        : defaultWhatsAppConfig.phoneNumber,
    message:
      typeof obj.message === "string"
        ? obj.message
        : defaultWhatsAppConfig.message,
    position,
  };
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  try {
    await ensureSettingsTable();
    const sql = getSql();
    const rows = await sql`
      SELECT value FROM site_settings WHERE key = 'whatsapp_config' LIMIT 1
    `;
    if (rows.length === 0) return defaultWhatsAppConfig;
    return mergeWhatsAppConfig(rows[0].value);
  } catch (err) {
    console.error("[whatsappDb] Falling back to default config:", err);
    return defaultWhatsAppConfig;
  }
}

export async function saveWhatsAppConfig(
  patch: Partial<WhatsAppConfig>
): Promise<WhatsAppConfig> {
  await ensureSettingsTable();
  const current = await getWhatsAppConfig();
  const next = mergeWhatsAppConfig({
    ...current,
    ...patch,
  });

  const sql = getSql();
  await sql`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES ('whatsapp_config', ${JSON.stringify(next)}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = NOW()
  `;
  return next;
}
