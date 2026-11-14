import type { APIRoute } from "astro";
import {
  createAcademyItem,
  getAcademyAiCredentials,
  type AcademyKind,
  type AcademySlide,
  type AcademyStatus,
  type SlideLayout
} from "../../../lib/academyDb";

export const prerender = false;

interface UploadedFileInput {
  name: string;
  mimeType: string;
  textContent?: string;
  base64Data?: string;
}

function extractYoutubeId(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "").trim() || null;
    }
    if (u.hostname.includes("youtube.com")) {
      return u.searchParams.get("v") || u.pathname.split("/").pop() || null;
    }
  } catch {}
  return null;
}

async function fetchYoutubeContext(urlStr: string): Promise<string> {
  const videoId = extractYoutubeId(urlStr);
  if (!videoId) return "";

  const parts: string[] = [`YouTube URL: ${urlStr}`];
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (oembedRes.ok) {
      const meta = await oembedRes.json();
      if (meta?.title) parts.push(`Video Title: ${meta.title}`);
      if (meta?.author_name) parts.push(`Channel: ${meta.author_name}`);
    }
  } catch {}

  try {
    const htmlRes = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en;q=0.9" },
      signal: AbortSignal.timeout(7000)
    });
    if (htmlRes.ok) {
      const html = await htmlRes.text();
      const descMatch = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
      if (descMatch?.[1]) {
        const desc = descMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
        parts.push(`Description:\n${desc.slice(0, 2500)}`);
      }
      const capMatch = html.match(/"captionTracks":\[\{"baseUrl":"([^"]+)"/);
      if (capMatch?.[1]) {
        const capUrl = capMatch[1].replace(/\\u0026/g, "&");
        const capRes = await fetch(capUrl, { signal: AbortSignal.timeout(6000) });
        if (capRes.ok) {
          const xml = await capRes.text();
          const transcript = xml
            .replace(/<[^>]+>/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, " ")
            .trim();
          if (transcript) {
            parts.push(`Transcript:\n${transcript.slice(0, 12000)}`);
          }
        }
      }
    }
  } catch {}

  return parts.join("\n");
}

async function fetchWebContext(urlStr: string): Promise<string> {
  try {
    const res = await fetch(urlStr, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AdaptifBot/1.0)" },
      signal: AbortSignal.timeout(7000)
    });
    if (!res.ok) return `Link (${urlStr}): could not fetch (${res.status})`;
    const text = await res.text();
    const cleaned = text
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return `Web Source (${urlStr}):\n${cleaned.slice(0, 8000)}`;
  } catch {
    return `Link (${urlStr}): unreachable`;
  }
}

function buildSystemPrompt(kind: AcademyKind): string {
  const isCourse = kind === "course";
  return `You are the Adaptif Academy Curriculum Architect.
Synthesize all provided source files, images, YouTube transcripts, links, and manual notes into a structured JSON object for a ${isCourse ? "PRO COURSE (in-depth, specific, tactical execution system)" : "FREE GUIDE (concise, approachable, high-level playbook)"}.

Return ONLY valid JSON matching this exact schema:
{
  "title": "Compelling title (max 70 chars)",
  "subtitle": "Crisp 1-sentence value proposition (max 150 chars)",
  "description": "2-3 sentences summarizing what the reader gets",
  "category": "Short category like 'AI Workflows', 'Brand Systems', or 'Creative Automation'",
  "landingData": {
    "heroBadge": "${isCourse ? "Pro Course" : "Free Tactical Guide"}",
    "readTime": "${isCourse ? "40 min deep-dive · 8 slides" : "10 min read · 6 slides"}",
    "audience": "Specific target roles",
    "takeaways": ["4 to 5 concrete takeaways"],
    "faq": [{"q": "Question?", "a": "Clear answer."}]
  },
  "slides": [
    {
      "layout": "cover | split | bullets | grid | quote | cta",
      "eyebrow": "Short section label",
      "title": "Slide headline",
      "body": "1-2 concise sentences",
      "bullets": ["3-4 crisp points (leave empty array for quote)"],
      "callout": "Optional short takeaway tip"
    }
  ]
}

Rules:
- First slide MUST use layout "cover".
- Last slide MUST use layout "cta".
- Middle slides should alternate between "bullets", "grid", "split", and "quote" for visual rhythm.
- ${isCourse ? "Generate 7 to 9 detailed, actionable slides." : "Generate 5 to 6 clear, high-level slides."}
- Keep text punchy so every 16:9 slide fits cleanly without overflowing.`;
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userText: string,
  images: UploadedFileInput[]
): Promise<any> {
  const parts: any[] = [{ text: `${systemPrompt}\n\nSOURCE MATERIAL:\n${userText}` }];
  for (const img of images.slice(0, 4)) {
    if (img.base64Data) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType || "image/png",
          data: img.base64Data
        }
      });
    }
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.4
        }
      })
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Gemini API request failed");
  }
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Empty response from Gemini");
  return JSON.parse(raw);
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userText: string,
  images: UploadedFileInput[]
): Promise<any> {
  const userContent: any[] = [{ type: "text", text: `SOURCE MATERIAL:\n${userText}` }];
  for (const img of images.slice(0, 4)) {
    if (img.base64Data) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${img.mimeType || "image/png"};base64,${img.base64Data}` }
      });
    }
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ]
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "OpenAI API request failed");
  }
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty response from OpenAI");
  return JSON.parse(raw);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const kind: AcademyKind = body?.kind === "course" ? "course" : "guide";
    const { provider, apiKey } = await getAcademyAiCredentials();

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing AI API Key. Add your Gemini or OpenAI API key in the AI Engine settings inside this modal."
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const links: string[] = Array.isArray(body?.links)
      ? body.links.map(String).map((s: string) => s.trim()).filter(Boolean)
      : [];
    const files: UploadedFileInput[] = Array.isArray(body?.files) ? body.files : [];
    const manualNotes = String(body?.manualNotes ?? "").trim();

    const linkContexts = await Promise.all(
      links.slice(0, 6).map(async (link) => {
        if (link.includes("youtube.com") || link.includes("youtu.be")) {
          return fetchYoutubeContext(link);
        }
        return fetchWebContext(link);
      })
    );

    const fileTexts = files
      .filter((f) => f.textContent && f.textContent.trim().length > 0)
      .map((f) => `File (${f.name}):\n${f.textContent!.slice(0, 12000)}`);
    const images = files.filter((f) => f.mimeType?.startsWith("image/") && f.base64Data);

    const combinedSource = [
      manualNotes ? `Manual Notes / Brief:\n${manualNotes}` : "",
      ...linkContexts,
      ...fileTexts,
      kind === "course" && body?.toolName
        ? `Included Companion Tool: ${body.toolName} (${body.toolType || "Template"}) ${body.toolUrl || ""}`
        : ""
    ]
      .filter(Boolean)
      .join("\n\n---\n\n");

    if (!combinedSource && images.length === 0) {
      return new Response(
        JSON.stringify({ error: "Please provide at least one file, link, image, or manual note." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = buildSystemPrompt(kind);
    const generated =
      provider === "openai"
        ? await callOpenAI(apiKey, systemPrompt, combinedSource, images)
        : await callGemini(apiKey, systemPrompt, combinedSource, images);

    const validLayouts: SlideLayout[] = ["cover", "split", "bullets", "grid", "quote", "cta"];
    const slides: AcademySlide[] = Array.isArray(generated?.slides)
      ? generated.slides.map((s: any, idx: number) => ({
          id: `s-${idx + 1}`,
          layout: validLayouts.includes(s?.layout) ? s.layout : "bullets",
          eyebrow: String(s?.eyebrow ?? ""),
          title: String(s?.title ?? `Slide ${idx + 1}`),
          body: String(s?.body ?? ""),
          bullets: Array.isArray(s?.bullets) ? s.bullets.map(String) : [],
          callout: s?.callout ? String(s.callout) : undefined
        }))
      : [];

    const status: AcademyStatus =
      body?.status === "published" || body?.status === "scheduled" ? body.status : "draft";

    const item = await createAcademyItem({
      kind,
      title: String(generated?.title || (kind === "course" ? "Generated Course" : "Generated Guide")),
      subtitle: String(generated?.subtitle ?? ""),
      description: String(generated?.description ?? ""),
      category: String(generated?.category ?? "AI Workflows"),
      coverImage:
        kind === "course" ? "/images/why-us/our-technology.jpg" : "/images/why-us/ai-excellence.jpg",
      status,
      publishAt: status === "scheduled" && body?.publishAt ? String(body.publishAt) : null,
      priceLabel: kind === "course" ? String(body?.priceLabel || "$49") : "Free",
      stripeCheckoutUrl: kind === "course" ? String(body?.stripeCheckoutUrl || "") : "",
      accessMode: kind === "course" ? "stripe_webhook" : "open",
      toolName: kind === "course" ? String(body?.toolName || "") : "",
      toolType: kind === "course" ? String(body?.toolType || "") : "",
      toolUrl: kind === "course" ? String(body?.toolUrl || "") : "",
      landingData: {
        heroBadge: String(generated?.landingData?.heroBadge || (kind === "course" ? "Pro Course" : "Free Guide")),
        readTime: String(generated?.landingData?.readTime || `${slides.length} slides`),
        audience: String(generated?.landingData?.audience || ""),
        takeaways: Array.isArray(generated?.landingData?.takeaways)
          ? generated.landingData.takeaways.map(String)
          : [],
        faq: Array.isArray(generated?.landingData?.faq)
          ? generated.landingData.faq.map((f: any) => ({ q: String(f?.q ?? ""), a: String(f?.a ?? "") }))
          : []
      },
      slides
    });

    return new Response(JSON.stringify({ item }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "AI generation failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
