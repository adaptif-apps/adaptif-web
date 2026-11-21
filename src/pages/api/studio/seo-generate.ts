import type { APIRoute } from "astro";
import { getAcademySettings } from "../../../lib/academyDb";

export const prerender = false;

type SeoFieldKey =
  | "defaultTitle"
  | "defaultDescription"
  | "ogTitle"
  | "ogDescription"
  | "pageTitle"
  | "pageDescription"
  | "orgDescription";

function buildPrompt(params: {
  field: SeoFieldKey;
  currentValue: string;
  pagePath?: string;
  pageLabel?: string;
  brandName?: string;
  defaultTitle?: string;
  defaultDescription?: string;
}): { system: string; user: string } {
  const brand = params.brandName || "Adaptif";
  const system = `You are a senior SEO copywriter for ${brand} — an AI-driven creative department subscription that plugs world-class design, development, marketing, and strategic digital audits into growth brands with unlimited requests, 1–2 day turnarounds, and one predictable monthly subscription.
Return ONLY the requested copy as a single plain-text string. No quotes, no markdown, no explanations, no character count annotations.`;

  const avoid = params.currentValue
    ? `\nDo NOT repeat or closely paraphrase this previous version (create a fresh, distinct angle):\n"${params.currentValue}"`
    : "";

  let task = "";
  switch (params.field) {
    case "defaultTitle":
      task = `Write a high-converting global homepage SEO <title> for ${brand}. Strict max 58 characters.`;
      break;
    case "defaultDescription":
      task = `Write a clear, compelling global meta description for ${brand} summarizing its AI-driven creative department subscription. Must be between 120 and 155 characters.`;
      break;
    case "ogTitle":
      task = `Write an engaging social share title (WhatsApp, LinkedIn, X) for ${brand}. Punchy, clear, max 58 characters.${
        params.defaultTitle ? ` Current default title: "${params.defaultTitle}".` : ""
      }`;
      break;
    case "ogDescription":
      task = `Write a social share preview description (WhatsApp, LinkedIn, X) for ${brand} that sparks curiosity and clicks. 100–150 characters.${
        params.defaultDescription ? ` Current default description: "${params.defaultDescription}".` : ""
      }`;
      break;
    case "pageTitle":
      task = `Write a custom SEO <title> specifically for the page "${params.pageLabel || params.pagePath || "/"}" on ${brand}. Keep it under 58 characters (do not append "| ${brand}" unless natural, since the title template may add it).`;
      break;
    case "pageDescription":
      task = `Write a custom SEO meta description specifically for the page "${params.pageLabel || params.pagePath || "/"}" on ${brand}. Must be between 120 and 155 characters.`;
      break;
    case "orgDescription":
      task = `Write a crisp one-sentence company summary for ${brand} suitable for Schema.org structured data. Max 155 characters.`;
      break;
  }

  return {
    system,
    user: `${task}${avoid}`,
  };
}

async function callGeminiText(apiKey: string, system: string, user: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 1.05,
        maxOutputTokens: 220,
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini error (${res.status}): ${errText.slice(0, 180)}`);
  }
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return raw.trim().replace(/^["'“”]+|["'“”]+$/g, "");
}

async function callOpenAIText(apiKey: string, system: string, user: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 1.0,
      max_tokens: 180,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI error (${res.status}): ${errText.slice(0, 180)}`);
  }
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || "";
  return raw.trim().replace(/^["'“”]+|["'“”]+$/g, "");
}

const CURATED_SUGGESTIONS: Record<SeoFieldKey, string[]> = {
  defaultTitle: [
    "Adaptif — Your AI-Driven Creative Department",
    "Adaptif — Unlimited Design, Dev & Marketing",
    "Adaptif — Senior Creative Teams, Powered by AI",
    "Adaptif — The Fuel Behind Your Creative Engine",
    "Adaptif — Scale Creative Output in 1–2 Days",
  ],
  defaultDescription: [
    "Plug an AI-driven creative department into your team: design, web, dev, and marketing with unlimited requests and 1–2 day turnarounds.",
    "Get the top 1% of creative talent powered by AI. Unlimited design, development, and campaign execution for one predictable monthly fee.",
    "Replace slow agencies and fragmented freelancers with a dedicated AI-powered creative team delivering brand, web, and ad assets fast.",
    "Scale your brand with unlimited design, web development, and marketing execution—fast turnarounds and senior creative direction.",
  ],
  ogTitle: [
    "Your AI-Driven Creative Department, Ready on Day One",
    "Unlimited Design, Dev & Marketing — One Subscription",
    "Adaptif — Senior Creative Talent Powered by AI",
    "Ship Better Creative 10x Faster with Adaptif",
  ],
  ogDescription: [
    "Plug senior designers, AI workflows, and rapid execution straight into your team. Unlimited requests, one flat monthly plan.",
    "No agency retainers, no hiring delays. Get a dedicated AI-accelerated creative department delivering in 1–2 business days.",
    "Brand, web, ads, and product design at subscription speed. See how Adaptif powers modern growth teams.",
  ],
  pageTitle: [
    "Senior Creative Execution & Strategy",
    "Built for High-Growth Brands",
    "AI-Accelerated Creative & Growth Systems",
    "Explore How Adaptif Works",
  ],
  pageDescription: [
    "Discover how Adaptif combines senior creative direction with AI workflows to ship high-converting brand, web, and growth assets.",
    "Fast, predictable creative execution for ambitious teams. Explore deliverables, timelines, and transparent pricing.",
    "See how our dedicated creative specialists and strategic audits help brands convert more traffic and scale faster.",
  ],
  orgDescription: [
    "Adaptif is an AI-driven creative department subscription delivering design, development, marketing, and strategic digital audits.",
    "An AI-accelerated creative subscription giving growth brands dedicated senior design, web, and marketing execution.",
    "Adaptif plugs top creative talent and AI workflows directly into enterprise and growth teams for one monthly fee.",
  ],
};

const PAGE_SPECIFIC_SUGGESTIONS: Record<string, { title: string[]; desc: string[] }> = {
  "/pricing": {
    title: [
      "Pricing — Flexible Creative Subscriptions",
      "Transparent Monthly Creative Plans",
      "Your Full-Time Creative Team, For One Hire",
    ],
    desc: [
      "Compare Creative and Full Stack monthly plans. Unlimited requests, 1–2 day turnarounds, and zero long-term contracts.",
      "One predictable monthly subscription for senior design, development, and AI-powered creative production. Pause anytime.",
    ],
  },
  "/audit": {
    title: [
      "Strategic Digital Audit in 4–5 Days",
      "Async E-Commerce & Brand Audit",
      "Find What’s Limiting Your Growth",
    ],
    desc: [
      "Asynchronous strategic audit for e-commerce and growth brands. Get a private dashboard, 30/60/90 roadmap, and Loom in 4–5 days.",
      "Uncover conversion, retention, and brand clarity leaks in 4–5 business days. No recurring calls—just a clear, prioritized plan.",
    ],
  },
  "/our-work": {
    title: [
      "Our Work — Brand, Web & Campaign Portfolio",
      "Selected Creative & Digital Work",
      "Brands Powered by Adaptif",
    ],
    desc: [
      "Explore branding, high-converting websites, ad creative, and product design shipped by Adaptif for modern growth brands.",
      "See real case studies across branding, web design, social, and performance creative built at subscription speed.",
    ],
  },
  "/dedicated-team": {
    title: [
      "Dedicated Creative Team on Demand",
      "Meet Your Dedicated Creative Squad",
      "Embedded Senior Design & Dev Talent",
    ],
    desc: [
      "Work directly with a dedicated creative director, designers, and developers embedded into your Slack and project workflows.",
      "Skip recruiting and agency overhead. Plug a vetted, AI-enabled creative team directly into your daily operations.",
    ],
  },
  "/academy": {
    title: [
      "Adaptif Academy — Playbooks, Guides & Courses",
      "Practical AI & Creative Systems Academy",
      "Free Guides & Deep-Dive Courses",
    ],
    desc: [
      "Explore free tactical playbooks and deep-dive courses on AI workflows, creative operations, and brand growth systems.",
      "Learn the frameworks, templates, and AI systems we use to run high-velocity creative departments.",
    ],
  },
};

function pickRotating(options: string[], currentValue: string): string {
  const clean = currentValue.trim().toLowerCase();
  const filtered = options.filter((o) => o.trim().toLowerCase() !== clean);
  const pool = filtered.length > 0 ? filtered : options;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getCuratedFallback(field: SeoFieldKey, currentValue: string, pagePath?: string): string {
  if (pagePath && PAGE_SPECIFIC_SUGGESTIONS[pagePath]) {
    if (field === "pageTitle") return pickRotating(PAGE_SPECIFIC_SUGGESTIONS[pagePath].title, currentValue);
    if (field === "pageDescription") return pickRotating(PAGE_SPECIFIC_SUGGESTIONS[pagePath].desc, currentValue);
  }
  return pickRotating(CURATED_SUGGESTIONS[field], currentValue);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const field = body?.field as SeoFieldKey | undefined;
    const validFields: SeoFieldKey[] = [
      "defaultTitle",
      "defaultDescription",
      "ogTitle",
      "ogDescription",
      "pageTitle",
      "pageDescription",
      "orgDescription",
    ];
    if (!field || !validFields.includes(field)) {
      return new Response(JSON.stringify({ error: "Invalid field" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const currentValue = typeof body?.currentValue === "string" ? body.currentValue.trim() : "";
    const pagePath = typeof body?.pagePath === "string" ? body.pagePath : undefined;

    const settings = await getAcademySettings();
    const apiKey = (settings.aiApiKey || "").trim();
    if (!apiKey) {
      const text = getCuratedFallback(field, currentValue, pagePath);
      return new Response(JSON.stringify({ text, source: "curated" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { system, user } = buildPrompt({
      field,
      currentValue,
      pagePath,
      pageLabel: typeof body?.pageLabel === "string" ? body.pageLabel : undefined,
      brandName: typeof body?.brandName === "string" ? body.brandName : undefined,
      defaultTitle: typeof body?.defaultTitle === "string" ? body.defaultTitle : undefined,
      defaultDescription: typeof body?.defaultDescription === "string" ? body.defaultDescription : undefined,
    });

    const text =
      settings.aiProvider === "openai"
        ? await callOpenAIText(apiKey, system, user)
        : await callGeminiText(apiKey, system, user);

    return new Response(JSON.stringify({ text, source: "ai" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to generate SEO copy" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
