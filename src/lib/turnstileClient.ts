// Lightweight client-side helper for Cloudflare Turnstile Invisible (execution: "execute")

let scriptPromise: Promise<void> | null = null;
let configPromise: Promise<{ enabled: boolean; siteKey: string }> | null = null;

export async function getPublicTurnstileConfig(): Promise<{ enabled: boolean; siteKey: string }> {
  if (!configPromise) {
    configPromise = fetch("/api/studio/turnstile")
      .then((r) => (r.ok ? r.json() : { enabled: false, siteKey: "" }))
      .then((d) => ({
        enabled: Boolean(d?.enabled && d?.siteKey),
        siteKey: String(d?.siteKey || "").trim(),
      }))
      .catch(() => ({ enabled: false, siteKey: "" }));
  }
  return configPromise;
}

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile script failed")), {
        once: true,
      });
      return;
    }

    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Turnstile script failed to load"));
    document.head.appendChild(s);
  });

  return scriptPromise;
}

export async function executeInvisibleTurnstile(container: HTMLElement | null): Promise<string> {
  const cfg = await getPublicTurnstileConfig();
  if (!cfg.enabled || !cfg.siteKey || !container) return "";

  await loadTurnstileScript();
  const ts = (window as any).turnstile;
  if (!ts) throw new Error("Cloudflare Turnstile is unavailable.");

  return new Promise<string>((resolve, reject) => {
    container.innerHTML = "";
    const widgetId = ts.render(container, {
      sitekey: cfg.siteKey,
      execution: "execute",
      appearance: "execute",
      callback: (token: string) => {
        try {
          ts.remove(widgetId);
        } catch {}
        resolve(token);
      },
      "error-callback": () => {
        try {
          ts.remove(widgetId);
        } catch {}
        reject(new Error("Security verification failed. Please try again."));
      },
      "expired-callback": () => {
        try {
          ts.remove(widgetId);
        } catch {}
        reject(new Error("Security verification expired. Please try again."));
      },
    });
    ts.execute(widgetId);
  });
}
