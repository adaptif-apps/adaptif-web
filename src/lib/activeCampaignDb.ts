import { neon } from "@neondatabase/serverless";
import type { BookCallSubmissionInput } from "./bookCallDb";

export interface ActiveCampaignMapping {
  fullNameMode: "split" | "firstOnly" | "ignore";
  helpTopicFieldId: string;
  projectGoalFieldId: string;
  referenceLinkFieldId: string;
  timelineFieldId: string;
  budgetRangeFieldId: string;
  notesFieldId: string;
}

export interface AcListItem {
  id: string;
  name: string;
}

export interface AcTagItem {
  id: string;
  name: string;
}

export interface AcFieldItem {
  id: string;
  title: string;
  perstag: string;
}

export interface ActiveCampaignConfig {
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  listId: string;
  tagIds: string[];
  tagFromHelpTopic: boolean;
  mapping: ActiveCampaignMapping;
  cachedLists: AcListItem[];
  cachedTags: AcTagItem[];
  cachedFields: AcFieldItem[];
  lastSyncedAt: string;
}

export const defaultActiveCampaignConfig: ActiveCampaignConfig = {
  enabled: false,
  apiUrl: "",
  apiKey: "",
  listId: "",
  tagIds: [],
  tagFromHelpTopic: false,
  mapping: {
    fullNameMode: "split",
    helpTopicFieldId: "",
    projectGoalFieldId: "",
    referenceLinkFieldId: "",
    timelineFieldId: "",
    budgetRangeFieldId: "",
    notesFieldId: "",
  },
  cachedLists: [],
  cachedTags: [],
  cachedFields: [],
  lastSyncedAt: "",
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

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function mergeConfig(raw: unknown): ActiveCampaignConfig {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, any>) : {};
  const mapObj = obj.mapping && typeof obj.mapping === "object" ? obj.mapping : {};

  return {
    enabled: Boolean(obj.enabled ?? false),
    apiUrl: typeof obj.apiUrl === "string" ? normalizeUrl(obj.apiUrl) : "",
    apiKey: typeof obj.apiKey === "string" ? obj.apiKey.trim() : "",
    listId: typeof obj.listId === "string" ? obj.listId.trim() : "",
    tagIds: Array.isArray(obj.tagIds) ? obj.tagIds.map(String).filter(Boolean) : [],
    tagFromHelpTopic: Boolean(obj.tagFromHelpTopic ?? false),
    mapping: {
      fullNameMode:
        mapObj.fullNameMode === "firstOnly" || mapObj.fullNameMode === "ignore"
          ? mapObj.fullNameMode
          : "split",
      helpTopicFieldId: String(mapObj.helpTopicFieldId ?? ""),
      projectGoalFieldId: String(mapObj.projectGoalFieldId ?? ""),
      referenceLinkFieldId: String(mapObj.referenceLinkFieldId ?? ""),
      timelineFieldId: String(mapObj.timelineFieldId ?? ""),
      budgetRangeFieldId: String(mapObj.budgetRangeFieldId ?? ""),
      notesFieldId: String(mapObj.notesFieldId ?? ""),
    },
    cachedLists: Array.isArray(obj.cachedLists) ? obj.cachedLists : [],
    cachedTags: Array.isArray(obj.cachedTags) ? obj.cachedTags : [],
    cachedFields: Array.isArray(obj.cachedFields) ? obj.cachedFields : [],
    lastSyncedAt: typeof obj.lastSyncedAt === "string" ? obj.lastSyncedAt : "",
  };
}

export async function getActiveCampaignConfig(): Promise<ActiveCampaignConfig> {
  try {
    await ensureSettingsTable();
    const sql = getSql();
    const rows = await sql`
      SELECT value FROM site_settings WHERE key = 'activecampaign_config' LIMIT 1
    `;
    if (rows.length === 0) return defaultActiveCampaignConfig;
    return mergeConfig(rows[0].value);
  } catch (err) {
    console.error("[activeCampaignDb] Falling back to default config:", err);
    return defaultActiveCampaignConfig;
  }
}

export async function saveActiveCampaignConfig(
  patch: Partial<ActiveCampaignConfig> & { apiKey?: string }
): Promise<ActiveCampaignConfig> {
  await ensureSettingsTable();
  const current = await getActiveCampaignConfig();

  const nextApiKey =
    typeof patch.apiKey === "string" && patch.apiKey.trim().length > 0
      ? patch.apiKey.trim()
      : current.apiKey;

  const next = mergeConfig({
    ...current,
    ...patch,
    apiKey: nextApiKey,
    mapping: {
      ...current.mapping,
      ...(patch.mapping || {}),
    },
  });

  const sql = getSql();
  await sql`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES ('activecampaign_config', ${JSON.stringify(next)}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = NOW()
  `;

  return next;
}

async function acFetch(baseUrl: string, apiKey: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${normalizeUrl(baseUrl)}${path}`, {
    ...init,
    headers: {
      "Api-Token": apiKey.trim(),
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg = json?.message || json?.errors?.[0]?.title || `ActiveCampaign API error (${res.status})`;
    throw new Error(msg);
  }

  return json;
}

export async function fetchActiveCampaignMetadata(apiUrl: string, apiKey: string) {
  const base = normalizeUrl(apiUrl);
  if (!base || !apiKey.trim()) {
    throw new Error("Both Account API URL and API Key are required.");
  }

  const [listsRes, tagsRes, fieldsRes] = await Promise.all([
    acFetch(base, apiKey, "/api/3/lists?limit=100"),
    acFetch(base, apiKey, "/api/3/tags?limit=100"),
    acFetch(base, apiKey, "/api/3/fields?limit=100"),
  ]);

  const lists: AcListItem[] = Array.isArray(listsRes?.lists)
    ? listsRes.lists.map((l: any) => ({ id: String(l.id), name: String(l.name) }))
    : [];

  const tags: AcTagItem[] = Array.isArray(tagsRes?.tags)
    ? tagsRes.tags.map((t: any) => ({ id: String(t.id), name: String(t.tag) }))
    : [];

  const fields: AcFieldItem[] = Array.isArray(fieldsRes?.fields)
    ? fieldsRes.fields.map((f: any) => ({
        id: String(f.id),
        title: String(f.title),
        perstag: String(f.perstag || ""),
      }))
    : [];

  return {
    lists,
    tags,
    fields,
    lastSyncedAt: new Date().toISOString(),
  };
}

async function resolveOrCreateTagId(baseUrl: string, apiKey: string, tagName: string): Promise<string | null> {
  const clean = tagName.trim();
  if (!clean) return null;

  const searchRes = await acFetch(baseUrl, apiKey, `/api/3/tags?search=${encodeURIComponent(clean)}`);
  const existing = Array.isArray(searchRes?.tags)
    ? searchRes.tags.find((t: any) => String(t.tag).toLowerCase() === clean.toLowerCase())
    : null;

  if (existing?.id) return String(existing.id);

  const createRes = await acFetch(baseUrl, apiKey, "/api/3/tags", {
    method: "POST",
    body: JSON.stringify({
      tag: {
        tag: clean,
        tagType: "contact",
        description: "Auto-created by Adaptif Book a Call form",
      },
    }),
  });

  return createRes?.tag?.id ? String(createRes.tag.id) : null;
}

export async function syncLeadToActiveCampaign(
  lead: BookCallSubmissionInput,
  config: ActiveCampaignConfig
): Promise<{ contactId: string }> {
  const base = normalizeUrl(config.apiUrl);
  if (!base || !config.apiKey) {
    throw new Error("ActiveCampaign credentials are not configured.");
  }

  let firstName = "";
  let lastName = "";
  const rawName = lead.fullName.trim();

  if (config.mapping.fullNameMode === "split" && rawName) {
    const parts = rawName.split(/\s+/);
    firstName = parts[0] || "";
    lastName = parts.slice(1).join(" ");
  } else if (config.mapping.fullNameMode === "firstOnly" && rawName) {
    firstName = rawName;
  }

  const fieldPairs: [string, string | undefined][] = [
    [config.mapping.helpTopicFieldId, lead.helpTopic],
    [config.mapping.projectGoalFieldId, lead.projectGoal],
    [config.mapping.referenceLinkFieldId, lead.referenceLink],
    [config.mapping.timelineFieldId, lead.timeline],
    [config.mapping.budgetRangeFieldId, lead.budgetRange],
    [config.mapping.notesFieldId, lead.notes],
  ];

  const fieldValues = fieldPairs
    .filter(([fieldId, value]) => fieldId && value && value.trim().length > 0)
    .map(([field, value]) => ({ field, value: value!.trim() }));

  const contactPayload: Record<string, any> = {
    email: lead.workEmail.trim(),
  };
  if (firstName) contactPayload.firstName = firstName;
  if (lastName) contactPayload.lastName = lastName;
  if (fieldValues.length > 0) contactPayload.fieldValues = fieldValues;

  const syncRes = await acFetch(base, config.apiKey, "/api/3/contact/sync", {
    method: "POST",
    body: JSON.stringify({ contact: contactPayload }),
  });

  const contactId = String(syncRes?.contact?.id ?? "");
  if (!contactId) {
    throw new Error("ActiveCampaign did not return a contact ID.");
  }

  if (config.listId) {
    await acFetch(base, config.apiKey, "/api/3/contactLists", {
      method: "POST",
      body: JSON.stringify({
        contactList: {
          list: config.listId,
          contact: contactId,
          status: 1,
        },
      }),
    });
  }

  const tagsToApply = new Set<string>(config.tagIds.filter(Boolean));
  if (config.tagFromHelpTopic && lead.helpTopic?.trim()) {
    const dynamicTagId = await resolveOrCreateTagId(base, config.apiKey, lead.helpTopic);
    if (dynamicTagId) tagsToApply.add(dynamicTagId);
  }

  for (const tagId of tagsToApply) {
    await acFetch(base, config.apiKey, "/api/3/contactTags", {
      method: "POST",
      body: JSON.stringify({
        contactTag: {
          contact: contactId,
          tag: tagId,
        },
      }),
    });
  }

  return { contactId };
}
