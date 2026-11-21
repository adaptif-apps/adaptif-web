import crypto from "node:crypto";

export function normalizeShopifyDomain(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  return trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

export function normalizeShopifyVariantGid(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("gid://shopify/ProductVariant/")) return trimmed;
  if (/^\d+$/.test(trimmed)) return `gid://shopify/ProductVariant/${trimmed}`;
  return trimmed;
}

export function normalizeShopifySellingPlanGid(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("gid://shopify/SellingPlan/")) return trimmed;
  if (/^\d+$/.test(trimmed)) return `gid://shopify/SellingPlan/${trimmed}`;
  return trimmed;
}

export function extractNumericShopifyId(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  const match = trimmed.match(/(\d+)$/);
  return match ? match[1] : trimmed;
}

export function verifyShopifyWebhookHmac(
  rawBody: string,
  hmacHeader: string,
  secret: string
): boolean {
  if (!hmacHeader || !secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(hmacHeader.trim(), "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export interface ShopifyCheckoutParams {
  storeDomain: string;
  storefrontToken: string;
  variantId: string;
  sellingPlanId?: string;
  quantity?: number;
  attributes?: { key: string; value: string }[];
  note?: string;
}

export async function createShopifyCheckoutUrl(
  params: ShopifyCheckoutParams
): Promise<{ checkoutUrl: string; cartId: string }> {
  const domain = normalizeShopifyDomain(params.storeDomain);
  const token = (params.storefrontToken || "").trim();
  const merchandiseId = normalizeShopifyVariantGid(params.variantId);
  const sellingPlanId = normalizeShopifySellingPlanGid(params.sellingPlanId || "");

  if (!domain) {
    throw new Error("Shopify Store Domain is not configured in Preferences → Payment.");
  }
  if (!token) {
    throw new Error("Shopify Storefront Access Token is not configured in Preferences → Payment.");
  }
  if (!merchandiseId) {
    throw new Error("Shopify Variant ID is not configured for this item.");
  }

  const line: Record<string, any> = {
    merchandiseId,
    quantity: params.quantity && params.quantity > 0 ? params.quantity : 1
  };
  if (sellingPlanId) {
    line.sellingPlanId = sellingPlanId;
  }

  const input: Record<string, any> = {
    lines: [line]
  };
  if (params.attributes && params.attributes.length > 0) {
    input.attributes = params.attributes;
  }
  if (params.note) {
    input.note = params.note;
  }

  const query = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const res = await fetch(`https://${domain}/api/2025-01/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token
    },
    body: JSON.stringify({ query, variables: { input } })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Shopify Storefront API error (${res.status}): ${errText || res.statusText}`);
  }

  const json = await res.json();
  if (Array.isArray(json?.errors) && json.errors.length > 0) {
    throw new Error(json.errors.map((e: any) => e?.message || "GraphQL error").join("; "));
  }

  const payload = json?.data?.cartCreate;
  const userErrors = Array.isArray(payload?.userErrors) ? payload.userErrors : [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((e: any) => e?.message || "Cart error").join("; "));
  }

  const checkoutUrl = String(payload?.cart?.checkoutUrl || "").trim();
  const cartId = String(payload?.cart?.id || "").trim();
  if (!checkoutUrl) {
    throw new Error("Shopify did not return a checkoutUrl.");
  }

  return { checkoutUrl, cartId };
}
