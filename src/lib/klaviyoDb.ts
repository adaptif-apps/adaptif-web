import { neon } from "@neondatabase/serverless";
import type { BookCallSubmissionInput } from "./bookCallDb";

export type CrmProvider = "activecampaign" | "klaviyo" | "both" | "none";

export interface KlaviyoListItem {
  id: string;
  name: string;
}

export interface KlaviyoConfig {
  enabled: boolean;
  apiKey: string;
  listId: string;
  cachedLists: KlaviyoListItem[];
  cachedProperties: string[];
  lastSyncedAt: string;
}

export const defaultKlaviyoConfig: KlaviyoConfig = {
  enabled: false,
  apiKey: "",
  listId: "",
  cachedLists: [],
  cachedProperties: [],
  lastSyncedAt: "",
};

const KLAVIYO_REVISION = "2024-10-15";

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

function mergeKlaviyoConfig(raw: unknown): KlaviyoConfig {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, any>) : {};
  return {
    enabled: Boolean(obj.enabled ?? false),
    apiKey: typeof obj.apiKey === "string" ? obj.apiKey.trim() : "",
    listId: typeof obj.listId === "string" ? obj.listId.trim() : "",
    cachedLists: Array.isArray(obj.cachedLists) ? obj.cachedLists : [],
    cachedProperties: Array.isArray(obj.cachedProperties) ? obj.cachedProperties.map(String) : [],
    lastSyncedAt: typeof obj.lastSyncedAt === "string" ? obj.lastSyncedAt : "",
  };
}

export async function getKlaviyoConfig(): Promise<KlaviyoConfig> {
  try {
    await ensureSettingsTable();
    const sql = getSql();
    const rows = await sql`
      SELECT value FROM site_settings WHERE key = 'klaviyo_config' LIMIT 1
    `;
    if (rows.length === 0) return defaultKlaviyoConfig;
    return mergeKlaviyoConfig(rows[0].value);
  } catch (err) {
    console.error("[klaviyoDb] Falling back to default config:", err);
    return defaultKlaviyoConfig;
  }
}

export async function saveKlaviyoConfig(
  patch: Partial<KlaviyoConfig> & { apiKey?: string }
): Promise<KlaviyoConfig> {
  await ensureSettingsTable();
  const current = await getKlaviyoConfig();
  const nextApiKey =
    typeof patch.apiKey === "string" && patch.apiKey.trim().length > 0
      ? patch.apiKey.trim()
      : current.apiKey;

  const next = mergeKlaviyoConfig({
    ...current,
    ...patch,
    apiKey: nextApiKey,
  });

  const sql = getSql();
  await sql`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES ('klaviyo_config', ${JSON.stringify(next)}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = NOW()
  `;
  return next;
}

export async function getActiveCrmProvider(): Promise<CrmProvider> {
  try {
    await ensureSettingsTable();
    const sql = getSql();
    const rows = await sql`
      SELECT value FROM site_settings WHERE key = 'active_crm_provider' LIMIT 1
    `;
    const p = rows[0]?.value?.provider;
    if (p === "activecampaign" || p === "klaviyo" || p === "both" || p === "none") {
      return p;
    }
    return "activecampaign";
  } catch {
    return "activecampaign";
  }
}

export async function saveActiveCrmProvider(provider: CrmProvider): Promise<CrmProvider> {
  await ensureSettingsTable();
  const sql = getSql();
  await sql`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES ('active_crm_provider', ${JSON.stringify({ provider })}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = NOW()
  `;
  return provider;
}

async function klaviyoFetch(path: string, apiKey: string, init: RequestInit = {}) {
  const res = await fetch(`https://a.klaviyo.com/api${path}`, {
    ...init,
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey.trim()}`,
      revision: KLAVIYO_REVISION,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    const detail = json?.errors?.[0]?.detail || json?.errors?.[0]?.title || text || res.statusText;
    throw new Error(`Klaviyo API ${res.status}: ${detail}`);
  }
  return json;
}

export async function testKlaviyoConnection(apiKey: string): Promise<{
  lists: KlaviyoListItem[];
  properties: string[];
}> {
  const listsJson = await klaviyoFetch("/lists/", apiKey);
  const lists: KlaviyoListItem[] = (listsJson?.data ?? []).map((item: any) => ({
    id: String(item.id),
    name: String(item.attributes?.name || item.id),
  }));

  const properties = await fetchKlaviyoProfileProperties(apiKey).catch(() => []);
  return { lists, properties };
}

export async function fetchKlaviyoProfileProperties(apiKey: string): Promise<string[]> {
  const json = await klaviyoFetch("/profiles/?page[size]=25", apiKey);
  const keys = new Set<string>();
  for (const profile of json?.data ?? []) {
    const props = profile?.attributes?.properties;
    if (props && typeof props === "object") {
      for (const k of Object.keys(props)) {
        if (k && !k.startsWith("$")) keys.add(k);
      }
    }
  }
  return Array.from(keys).sort();
}

export async function syncLeadToKlaviyo(
  submission: BookCallSubmissionInput,
  config: KlaviyoConfig
): Promise<{ profileId: string }> {
  if (!config.apiKey) {
    throw new Error("Klaviyo Private API Key is missing.");
  }

  const parts = submission.fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ");

  const properties: Record<string, string> = {};
  if (submission.helpTopic) properties.help_topic = submission.helpTopic;
  if (submission.projectGoal) properties.project_goal = submission.projectGoal;
  if (submission.referenceLink) properties.reference_link = submission.referenceLink;
  if (submission.timeline) properties.timeline = submission.timeline;
  if (submission.budgetRange) properties.budget_range = submission.budgetRange;
  if (submission.notes) properties.notes = submission.notes;

  if (submission.extraFields) {
    for (const [key, val] of Object.entries(submission.extraFields)) {
      if (val && val.trim()) {
        properties[key] = val.trim();
      }
    }
  }

  const profileRes = await klaviyoFetch("/profile-import/", config.apiKey, {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "profile",
        attributes: {
          email: submission.workEmail.trim(),
          first_name: firstName,
          ...(lastName ? { last_name: lastName } : {}),
          properties,
        },
      },
    }),
  });

  const profileId = String(profileRes?.data?.id ?? "");
  if (profileId && config.listId) {
    await klaviyoFetch(`/lists/${encodeURIComponent(config.listId)}/relationships/profiles/`, config.apiKey, {
      method: "POST",
      body: JSON.stringify({
        data: [{ type: "profile", id: profileId }],
      }),
    });
  }

  return { profileId };
}
