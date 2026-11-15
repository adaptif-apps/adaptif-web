import type { APIRoute } from "astro";
import {
  createActiveCampaignCustomField,
  getActiveCampaignConfig,
  listActiveCampaignCustomFieldsWithOptions,
} from "../../../lib/activeCampaignDb";
import { getBookCallConfig, saveBookCallConfig, type FormField, type FormFieldType } from "../../../lib/bookCallDb";
import {
  fetchKlaviyoProfileProperties,
  getActiveCrmProvider,
  getKlaviyoConfig,
  saveKlaviyoConfig,
} from "../../../lib/klaviyoDb";

export const prerender = false;

function toFieldId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || `field_${Date.now()}`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const direction = body?.direction === "push" ? "push" : "pull";
    const activeProvider = await getActiveCrmProvider();
    const targetProvider =
      body?.provider === "activecampaign" || body?.provider === "klaviyo"
        ? body.provider
        : activeProvider === "klaviyo"
          ? "klaviyo"
          : "activecampaign";

    const config = await getBookCallConfig();
    let fields = [...config.fields];

    if (direction === "push") {
      if (targetProvider === "activecampaign" || activeProvider === "both") {
        const acConfig = await getActiveCampaignConfig();
        if (acConfig.apiUrl && acConfig.apiKey) {
          const existingAc = await listActiveCampaignCustomFieldsWithOptions(acConfig).catch(() => []);
          const byTitle = new Map(existingAc.map((f) => [f.title.toLowerCase(), f.id]));

          const updated: FormField[] = [];
          for (const f of fields) {
            if (f.id === "fullName" || f.id === "workEmail" || f.acFieldId) {
              updated.push(f);
              continue;
            }
            const matchedId = byTitle.get(f.label.toLowerCase());
            if (matchedId) {
              updated.push({ ...f, acFieldId: matchedId });
              continue;
            }
            try {
              const created = await createActiveCampaignCustomField(acConfig, f);
              updated.push({ ...f, acFieldId: created.id });
            } catch {
              updated.push(f);
            }
          }
          fields = updated;
          await saveBookCallConfig({ fields });
        }
      }
      return new Response(JSON.stringify({ ok: true, fields, provider: targetProvider }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // direction === "pull"
    let addedCount = 0;

    if (targetProvider === "activecampaign") {
      const acConfig = await getActiveCampaignConfig();
      if (!acConfig.apiUrl || !acConfig.apiKey) {
        return new Response(
          JSON.stringify({ error: "ActiveCampaign API URL and API Key must be configured first." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const acFields = await listActiveCampaignCustomFieldsWithOptions(acConfig);
      const existingAcIds = new Set(fields.map((f) => f.acFieldId).filter(Boolean));
      const existingLabels = new Set(fields.map((f) => f.label.toLowerCase()));
      const existingIds = new Set(fields.map((f) => f.id));

      for (const acf of acFields) {
        if (existingAcIds.has(acf.id) || existingLabels.has(acf.title.toLowerCase())) {
          continue;
        }
        const fType: FormFieldType =
          acf.type === "textarea"
            ? "textarea"
            : acf.type === "dropdown" || acf.type === "listbox"
              ? "select"
              : "text";

        let fid = toFieldId(acf.perstag || acf.title);
        while (existingIds.has(fid)) fid = `${fid}_ac`;
        existingIds.add(fid);

        fields.push({
          id: fid,
          label: acf.title,
          type: fType,
          placeholder: fType === "select" ? "Select an option..." : `Enter ${acf.title.toLowerCase()}`,
          required: false,
          step: 2,
          options: acf.options,
          acFieldId: acf.id,
        });
        addedCount++;
      }
    } else {
      const klaviyoCfg = await getKlaviyoConfig();
      if (!klaviyoCfg.apiKey) {
        return new Response(
          JSON.stringify({ error: "Klaviyo Private API Key must be configured first." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const props = await fetchKlaviyoProfileProperties(klaviyoCfg.apiKey);
      await saveKlaviyoConfig({ cachedProperties: props });

      const standardKeys = new Set([
        "help_topic",
        "project_goal",
        "reference_link",
        "timeline",
        "budget_range",
        "notes",
      ]);
      const existingKeys = new Set(fields.map((f) => f.klaviyoKey || f.id));
      const existingIds = new Set(fields.map((f) => f.id));

      for (const prop of props) {
        if (standardKeys.has(prop) || existingKeys.has(prop)) continue;
        let fid = toFieldId(prop);
        while (existingIds.has(fid)) fid = `${fid}_kl`;
        existingIds.add(fid);

        const label = prop
          .replace(/[_-]+/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        fields.push({
          id: fid,
          label,
          type: "text",
          placeholder: `Enter ${label.toLowerCase()}`,
          required: false,
          step: 2,
          options: [],
          klaviyoKey: prop,
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      await saveBookCallConfig({ fields });
    }

    return new Response(
      JSON.stringify({ ok: true, addedCount, fields, provider: targetProvider }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to sync fields" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
