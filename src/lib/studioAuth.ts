import { createHmac, timingSafeEqual } from "node:crypto";
import type { AstroCookies } from "astro";

const COOKIE_NAME = "adaptif_studio_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function getSigningSecret(): string {
  return (
    process.env.STUDIO_SESSION_SECRET ||
    process.env.DATABASE_URL ||
    import.meta.env.STUDIO_SESSION_SECRET ||
    import.meta.env.DATABASE_URL ||
    "adaptif-studio-session-secret"
  );
}

function signPayload(payloadB64: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(payloadB64)
    .digest("base64url");
}

export function createStudioSessionToken(): string {
  const now = Date.now();
  const payload = JSON.stringify({ iat: now, exp: now + SESSION_TTL_MS });
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  const sig = signPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyStudioSessionToken(token: string | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return false;

  const expectedSig = signPayload(payloadB64);
  const sigBuf = Buffer.from(sig, "utf8");
  const expBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    return typeof parsed?.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export function issueStudioSessionCookie(cookies: AstroCookies): void {
  cookies.set(COOKIE_NAME, createStudioSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: import.meta.env.PROD,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function hasValidStudioSession(cookies: AstroCookies): boolean {
  const token = cookies.get(COOKIE_NAME)?.value;
  return verifyStudioSessionToken(token);
}
