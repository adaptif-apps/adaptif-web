export type OutcomeIndicatorKind = "metric" | "milestone" | "plan";

export interface OutcomeIndicator {
  value: string;
  label: string;
  kind: OutcomeIndicatorKind;
}

export interface PendingOutcomeIndicator {
  rawValue: string;
  rawLabel: string;
  reason: string;
}

export interface BrandOutcomeCase {
  id: string;
  category: string;
  brand: string;
  headline: string;
  indicators: OutcomeIndicator[];
  pendingIndicators?: PendingOutcomeIndicator[];
  quote: string;
  author: string;
  role: string;
}

export const brandOutcomes: BrandOutcomeCase[] = [
  {
    id: "lumen-health",
    category: "Tech / SaaS",
    brand: "Lumen Health",
    headline: "Lumen raised Series A after a full brand overhaul with Adaptif",
    indicators: [
      { value: "6 wks", label: "brand to launch", kind: "metric" },
      { value: "Series A", label: "funding secured", kind: "milestone" },
      { value: "94%", label: "investor deck approval", kind: "metric" },
    ],
    quote:
      "We went into our Series A pitch with a brand that finally looked the part. The Adaptif team moved faster than any agency we'd worked with, and the output was better.",
    author: "Jordan M.",
    role: "CEO, Lumen Health",
  },
  {
    id: "kora",
    category: "D2C / Consumer",
    brand: "Kora",
    headline:
      "Kora grew social engagement 3× with a dedicated content team from Adaptif",
    indicators: [
      { value: "3×", label: "social engagement", kind: "metric" },
      { value: "Full Stack", label: "plan", kind: "plan" },
    ],
    pendingIndicators: [
      {
        rawValue: "5 days",
        rawLabel: "funding secured",
        reason:
          "Excluded from public view pending confirmation of what the 5-day metric measures for Kora.",
      },
    ],
    quote:
      "Having a motion designer and content strategist on tap changed everything for our social. We went from posting once a week to every day, and engagement followed.",
    author: "Amara T.",
    role: "Head of Marketing, Kora",
  },
];
