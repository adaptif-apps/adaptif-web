import type { APIRoute } from "astro";
import { getAcademySettings } from "../../../lib/academyDb";
import { createBlogPost, type BlogSection } from "../../../lib/blogDb";
import { hasValidStudioSession } from "../../../lib/studioAuth";

export const prerender = false;

function extractJson(text: string): any {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const slice = firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;
  return JSON.parse(slice);
}

async function fetchWebContext(urlStr: string): Promise<string> {
  try {
    const res = await fetch(urlStr, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AdaptifBot/1.0)" },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const bodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);
    return `URL: ${urlStr}\nTitle: ${titleMatch?.[1]?.trim() || ""}\nContent: ${bodyText}`;
  } catch {
    return `URL: ${urlStr}`;
  }
}

function buildBlogPrompt(): string {
  return `You are the Adaptif Editorial & Growth Strategist.
Synthesize the provided notes, links, transcripts, and documents into a high-converting, authoritative editorial blog post for Adaptif (an AI-driven creative department subscription for design, dev, and marketing).

Return ONLY valid JSON matching this exact schema:
{
  "eyebrow": "SHORT UPPERCASE KICKER (e.g. CREATIVE OPERATIONS)",
  "title": "Compelling editorial headline (max 75 chars)",
  "subtitle": "Crisp 1-2 sentence lead summary",
  "excerpt": "2 sentence card summary for the /blog index",
  "category": "AI Workflows | Brand Systems | Creative Automation | Growth Design",
  "readTime": "5 min read",
  "sections": [
    {
      "columnsCount": 1,
      "columns": [
        {
          "type": "text",
          "blocks": [
            { "format": "eyebrow", "text": "SECTION KICKER" },
            { "format": "title", "text": "Main white heading part" },
            { "format": "title_highlight", "text": "highlighted cyan ending." },
            { "format": "paragraph", "text": "Clear, insightful paragraph." },
            { "format": "quote", "text": "Memorable pull-quote takeaway." }
          ]
        }
      ]
    },
    {
      "columnsCount": 2,
      "columns": [
        {
          "type": "text",
          "blocks": [
            { "format": "subtitle", "text": "Subheading for left column" },
            { "format": "paragraph", "text": "Supporting explanation." }
          ]
        },
        {
          "type": "image",
          "imageUrl": "",
          "caption": "Suggested visual description for this slot"
        }
      ]
    }
  ],
  "upsell": {
    "enabled": true,
    "kind": "plan",
    "planName": "Creative Plan",
    "eyebrow": "READY TO SCALE?",
    "title": "Plug an AI-driven creative team into your workflow",
    "description": "Get unlimited design, dev, and marketing requests with 48-hour turnarounds.",
    "ctaLabel": "Explore Plans",
    "ctaHref": "/pricing"
  }
}

Rules:
- Generate 4 to 6 rich sections mixing 1-column, 2-column, and 3-column layouts.
- Valid block formats inside "text" columns: "eyebrow", "title", "title_highlight", "subtitle", "paragraph", "quote".
- Column "type" can be "text", "image", or "video".
- Always include an engaging "upsell" object designed to convert readers into checking a Guide, Course, or Plan.`;
}

async function callGemini(apiKey: string, systemPrompt: string, userText: string) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nSOURCE MATERIAL:\n${userText}` }] }],
      generationConfig: { temperature: 0.45, responseMimeType: "application/json" },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Gemini API error (${res.status})`);
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return extractJson(raw);
}

async function callOpenAI(apiKey: string, systemPrompt: string, userText: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.45,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `SOURCE MATERIAL:\n${userText}` },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI API error (${res.status})`);
  const raw = data?.choices?.[0]?.message?.content || "";
  return extractJson(raw);
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!hasValidStudioSession(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, payload: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        const body = await request.json().catch(() => ({}));
        const settings = await getAcademySettings();
        const apiKey = (settings.aiApiKey || "").trim();
        if (!apiKey) {
          throw new Error("No AI API Key configured. Add it in Configuration → AI Engine first.");
        }

        send("progress", { percent: 15, label: "Gathering source context..." });

        const parts: string[] = [];
        if (typeof body.prompt === "string" && body.prompt.trim()) {
          parts.push(`Topic / Notes:\n${body.prompt.trim()}`);
        }
        const links: string[] = Array.isArray(body.links)
          ? body.links.map((s: any) => String(s).trim()).filter(Boolean)
          : [];
        for (const link of links.slice(0, 4)) {
          const ctx = await fetchWebContext(link);
          if (ctx) parts.push(ctx);
        }
        if (typeof body.docText === "string" && body.docText.trim()) {
          parts.push(`Document Text:\n${body.docText.trim().slice(0, 12000)}`);
        }

        const sourceText = parts.join("\n\n---\n\n");
        if (!sourceText.trim()) {
          throw new Error("Provide a topic, notes, link, or document to generate a blog post.");
        }

        send("progress", { percent: 45, label: "Drafting editorial layout & sections with AI..." });
        const sysPrompt = buildBlogPrompt();
        const generated =
          settings.aiProvider === "openai"
            ? await callOpenAI(apiKey, sysPrompt, sourceText)
            : await callGemini(apiKey, sysPrompt, sourceText);

        send("progress", { percent: 82, label: "Saving blog post to Postgres..." });
        const sections: BlogSection[] = Array.isArray(generated?.sections) ? generated.sections : [];
        const post = await createBlogPost({
          title: String(generated?.title || "Untitled Blog Post"),
          subtitle: String(generated?.subtitle || ""),
          eyebrow: String(generated?.eyebrow || "INSIGHTS"),
          excerpt: String(generated?.excerpt || generated?.subtitle || ""),
          category: String(generated?.category || "AI Workflows"),
          readTime: String(generated?.readTime || "5 min read"),
          status: body?.status === "published" ? "published" : "draft",
          sections,
          upsell: generated?.upsell || { enabled: true, kind: "plan", planName: "Creative Plan" },
        });

        send("progress", { percent: 100, label: "Done!" });
        send("done", { post });
      } catch (err: any) {
        send("error", { error: err?.message || "Blog generation failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
