import { neon } from "@neondatabase/serverless";
import { normalizeShopifyDomain } from "./shopify";

export type PaymentProvider = "stripe" | "shopify";

export interface PaymentCatalogEntry {
  key: string;
  kind: "plan" | "audit";
  label: string;
  stripeCheckoutUrl: string;
  shopifyVariantId: string;
  shopifySellingPlanId: string;
}

export interface PaymentSettings {
  activeProvider: PaymentProvider;
  shopifyStoreDomain: string;
  hasShopifyStorefrontToken: boolean;
  hasShopifyWebhookSecret: boolean;
  catalog: PaymentCatalogEntry[];
}

export const DEFAULT_PAYMENT_CATALOG: PaymentCatalogEntry[] = [
  {
    key: "plan-creative",
    kind: "plan",
    label: "Creative Plan",
    stripeCheckoutUrl: "",
    shopifyVariantId: "",
    shopifySellingPlanId: ""
  },
  {
    key: "plan-fullstack",
    kind: "plan",
    label: "Full Stack Plan",
    stripeCheckoutUrl: "",
    shopifyVariantId: "",
    shopifySellingPlanId: ""
  },
  {
    key: "audit-standard",
    kind: "audit",
    label: "Strategic Audit",
    stripeCheckoutUrl: "",
    shopifyVariantId: "",
    shopifySellingPlanId: ""
  }
];

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

let paymentSchemaReadyPromise: Promise<void> | null = null;

export async function ensurePaymentSchema(): Promise<void> {
  if (paymentSchemaReadyPromise) return paymentSchemaReadyPromise;

  paymentSchemaReadyPromise = (async () => {
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS payment_settings (
        id INT PRIMARY KEY DEFAULT 1,
        active_provider TEXT NOT NULL DEFAULT 'stripe',
        shopify_store_domain TEXT NOT NULL DEFAULT 'eqkk7t-qy.myshopify.com',
        shopify_storefront_token TEXT NOT NULL DEFAULT '',
        shopify_webhook_secret TEXT NOT NULL DEFAULT '',
        catalog JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      INSERT INTO payment_settings (
        id,
        active_provider,
        shopify_store_domain,
        catalog
      ) VALUES (
        1,
        'stripe',
        'eqkk7t-qy.myshopify.com',
        ${JSON.stringify(DEFAULT_PAYMENT_CATALOG)}::jsonb
      )
      ON CONFLICT (id) DO NOTHING
    `;
  })().catch((err) => {
    paymentSchemaReadyPromise = null;
    throw err;
  });

  return paymentSchemaReadyPromise;
}

function mergeCatalog(raw: unknown): PaymentCatalogEntry[] {
  const incoming = Array.isArray(raw) ? raw : [];
  const byKey = new Map<string, any>();
  for (const entry of incoming) {
    if (entry && typeof entry.key === "string") {
      byKey.set(entry.key, entry);
    }
  }

  return DEFAULT_PAYMENT_CATALOG.map((def) => {
    const found = byKey.get(def.key);
    return {
      key: def.key,
      kind: def.kind,
      label: typeof found?.label === "string" && found.label.trim() ? found.label.trim() : def.label,
      stripeCheckoutUrl: typeof found?.stripeCheckoutUrl === "string" ? found.stripeCheckoutUrl.trim() : "",
      shopifyVariantId: typeof found?.shopifyVariantId === "string" ? found.shopifyVariantId.trim() : "",
      shopifySellingPlanId:
        typeof found?.shopifySellingPlanId === "string" ? found.shopifySellingPlanId.trim() : ""
    };
  });
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  await ensurePaymentSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT
      active_provider,
      shopify_store_domain,
      shopify_storefront_token,
      shopify_webhook_secret,
      catalog
    FROM payment_settings
    WHERE id = 1
    LIMIT 1
  `;
  const row = rows[0] ?? {};
  const activeProvider: PaymentProvider = row.active_provider === "shopify" ? "shopify" : "stripe";
  const envToken = process.env.SHOPIFY_STOREFRONT_TOKEN || "";
  const envSecret = process.env.SHOPIFY_WEBHOOK_SECRET || "";

  return {
    activeProvider,
    shopifyStoreDomain: String(row.shopify_store_domain || "eqkk7t-qy.myshopify.com"),
    hasShopifyStorefrontToken: Boolean(String(row.shopify_storefront_token || "").trim() || envToken),
    hasShopifyWebhookSecret: Boolean(String(row.shopify_webhook_secret || "").trim() || envSecret),
    catalog: mergeCatalog(row.catalog)
  };
}

export async function getShopifyCredentials(): Promise<{
  storeDomain: string;
  storefrontToken: string;
  webhookSecret: string;
}> {
  await ensurePaymentSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT
      shopify_store_domain,
      shopify_storefront_token,
      shopify_webhook_secret
    FROM payment_settings
    WHERE id = 1
    LIMIT 1
  `;
  const row = rows[0] ?? {};
  return {
    storeDomain: normalizeShopifyDomain(
      String(row.shopify_store_domain || process.env.SHOPIFY_STORE_DOMAIN || "eqkk7t-qy.myshopify.com")
    ),
    storefrontToken: String(row.shopify_storefront_token || process.env.SHOPIFY_STOREFRONT_TOKEN || "").trim(),
    webhookSecret: String(row.shopify_webhook_secret || process.env.SHOPIFY_WEBHOOK_SECRET || "").trim()
  };
}

export function resolveCatalogCheckoutHref(
  settings: PaymentSettings | null,
  key: string,
  fallbackHref: string
): { href: string; isCheckout: boolean } {
  if (!settings) return { href: fallbackHref, isCheckout: false };
  const entry = settings.catalog.find((c) => c.key === key);
  if (!entry) return { href: fallbackHref, isCheckout: false };

  const configured =
    settings.activeProvider === "shopify"
      ? Boolean(entry.shopifyVariantId.trim())
      : Boolean(entry.stripeCheckoutUrl.trim());

  if (!configured) return { href: fallbackHref, isCheckout: false };
  return {
    href: `/api/payments/checkout?kind=${entry.kind}&key=${encodeURIComponent(entry.key)}`,
    isCheckout: true
  };
}

export async function getCatalogEntryByKey(key: string): Promise<PaymentCatalogEntry | null> {
  const settings = await getPaymentSettings();
  return settings.catalog.find((entry) => entry.key === key) ?? null;
}

export async function savePaymentSettings(input: {
  activeProvider?: PaymentProvider;
  shopifyStoreDomain?: string;
  shopifyStorefrontToken?: string;
  shopifyWebhookSecret?: string;
  catalog?: Partial<PaymentCatalogEntry>[];
}): Promise<PaymentSettings> {
  await ensurePaymentSchema();
  const sql = getSql();
  const current = await getPaymentSettings();

  const nextProvider: PaymentProvider =
    input.activeProvider === "shopify" || input.activeProvider === "stripe"
      ? input.activeProvider
      : current.activeProvider;

  const nextDomain =
    typeof input.shopifyStoreDomain === "string"
      ? normalizeShopifyDomain(input.shopifyStoreDomain)
      : current.shopifyStoreDomain;

  const nextCatalog = Array.isArray(input.catalog)
    ? mergeCatalog(
        current.catalog.map((existing) => {
          const patch = input.catalog!.find((c) => c?.key === existing.key);
          return patch
            ? {
                ...existing,
                stripeCheckoutUrl:
                  typeof patch.stripeCheckoutUrl === "string"
                    ? patch.stripeCheckoutUrl.trim()
                    : existing.stripeCheckoutUrl,
                shopifyVariantId:
                  typeof patch.shopifyVariantId === "string"
                    ? patch.shopifyVariantId.trim()
                    : existing.shopifyVariantId,
                shopifySellingPlanId:
                  typeof patch.shopifySellingPlanId === "string"
                    ? patch.shopifySellingPlanId.trim()
                    : existing.shopifySellingPlanId
              }
            : existing;
        })
      )
    : current.catalog;

  await sql`
    UPDATE payment_settings
    SET active_provider = ${nextProvider},
        shopify_store_domain = ${nextDomain},
        catalog = ${JSON.stringify(nextCatalog)}::jsonb,
        updated_at = NOW()
    WHERE id = 1
  `;

  if (typeof input.shopifyStorefrontToken === "string" && input.shopifyStorefrontToken.trim() !== "") {
    await sql`
      UPDATE payment_settings
      SET shopify_storefront_token = ${input.shopifyStorefrontToken.trim()}
      WHERE id = 1
    `;
  }

  if (typeof input.shopifyWebhookSecret === "string" && input.shopifyWebhookSecret.trim() !== "") {
    await sql`
      UPDATE payment_settings
      SET shopify_webhook_secret = ${input.shopifyWebhookSecret.trim()}
      WHERE id = 1
    `;
  }

  return getPaymentSettings();
}
