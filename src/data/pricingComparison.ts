export type BillingCycle = "annual" | "monthly";

export interface PlanPricingTier {
  monthlyEquivalent: string;
  billingNote: string;
  saveBadge?: string;
}

export interface PlanConfig {
  id: "creative" | "full-stack";
  name: string;
  badge?: string;
  description: string;
  summaryLine: string;
  ctaLabel: string;
  ctaHref: string;
  pricing: Record<BillingCycle, PlanPricingTier>;
}

export type FeatureAvailability = boolean | string;

export interface ComparisonFeature {
  id: string;
  name: string;
  note?: string;
  creative: FeatureAvailability;
  fullStack: FeatureAvailability;
}

export interface ComparisonCategory {
  id: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  fullStackOnly?: boolean;
  footnote?: string;
  features: ComparisonFeature[];
}

/**
 * Centralized commercial pricing & plan metadata.
 * Update prices, billing notes, or checkout/booking URLs here.
 */
export const PLAN_CONFIGS: PlanConfig[] = [
  {
    id: "creative",
    name: "Creative",
    description:
      "For founders and marketing teams needing steady creative support without full-time hires.",
    summaryLine:
      "Design and creative production with 1 active ticket at a time.",
    ctaLabel: "Choose plan",
    ctaHref: "#contact",
    pricing: {
      annual: {
        monthlyEquivalent: "$1,750",
        billingNote: "Equivalent monthly rate · Billed annually",
        saveBadge: "Save 20%",
      },
      monthly: {
        monthlyEquivalent: "$2,190",
        billingNote: "Billed monthly",
      },
    },
  },
  {
    id: "full-stack",
    name: "Full Stack",
    badge: "Most popular",
    description:
      "For growing brands and internal teams managing multiple campaigns and web projects in parallel.",
    summaryLine:
      "Adds Development, Marketing, Maintenance & AI services, plus 2 active tickets and a weekly strategy call.",
    ctaLabel: "Choose plan",
    ctaHref: "#contact",
    pricing: {
      annual: {
        monthlyEquivalent: "$3,750",
        billingNote: "Equivalent monthly rate · Billed annually",
        saveBadge: "Save 20%",
      },
      monthly: {
        monthlyEquivalent: "$4,690",
        billingNote: "Billed monthly",
      },
    },
  },
];

export const COMPARISON_CATEGORIES: ComparisonCategory[] = [
  {
    id: "tickets-management",
    title: "Tickets Management",
    defaultOpen: true,
    footnote:
      "Turnaround depends on the scope and complexity of each request. Larger multi-part projects consume more capacity than quick standalone assets.",
    features: [
      {
        id: "active-tickets",
        name: "Active tickets at a time",
        creative: "1 active ticket",
        fullStack: "2 active tickets",
      },
      {
        id: "unlimited-revisions",
        name: "Unlimited revisions",
        creative: true,
        fullStack: true,
      },
      {
        id: "unlimited-brands",
        name: "Unlimited brands & projects",
        note: "Manage multiple brands in your queue; requests run within your active ticket capacity.",
        creative: true,
        fullStack: true,
      },
      {
        id: "turnaround-time",
        name: "Turnaround time",
        creative: "1–2 days",
        fullStack: "1–2 days",
      },
      {
        id: "pm-platform",
        name: "Project management platform",
        creative: true,
        fullStack: true,
      },
    ],
  },
  {
    id: "communication",
    title: "Communication",
    defaultOpen: true,
    features: [
      {
        id: "realtime-chat",
        name: "Real-time chat with PM",
        creative: true,
        fullStack: true,
      },
      {
        id: "email-support",
        name: "Email support",
        creative: true,
        fullStack: true,
      },
      {
        id: "weekly-strategy-call",
        name: "Weekly strategy call",
        creative: false,
        fullStack: true,
      },
    ],
  },
  {
    id: "branding",
    title: "Branding",
    defaultOpen: false,
    features: [
      { id: "brand-identity", name: "Brand identity", creative: true, fullStack: true },
      { id: "style-guidelines", name: "Style guidelines", creative: true, fullStack: true },
      { id: "rebranding", name: "Rebranding", creative: true, fullStack: true },
      { id: "logo-design", name: "Logo design", creative: true, fullStack: true },
      { id: "animated-assets", name: "Animated assets", creative: true, fullStack: true },
      { id: "presentations", name: "Presentations", creative: true, fullStack: true },
    ],
  },
  {
    id: "digital-media",
    title: "Digital Media",
    defaultOpen: false,
    features: [
      { id: "animations", name: "Animations", creative: true, fullStack: true },
      { id: "feed-concepts", name: "Feed concepts", creative: true, fullStack: true },
      { id: "social-media-creatives", name: "Social media creatives", creative: true, fullStack: true },
      { id: "ad-creatives", name: "Ad creatives", creative: true, fullStack: true },
      { id: "email-design", name: "Email design", creative: true, fullStack: true },
    ],
  },
  {
    id: "ui-ux",
    title: "UI/UX",
    defaultOpen: false,
    features: [
      { id: "web-design", name: "Web design", creative: true, fullStack: true },
      { id: "landing-pages", name: "Landing pages", creative: true, fullStack: true },
      { id: "app-design", name: "App design", creative: true, fullStack: true },
      { id: "app-prototyping", name: "App prototyping", creative: true, fullStack: true },
    ],
  },
  {
    id: "print-media",
    title: "Print Media",
    defaultOpen: false,
    features: [
      { id: "flyers", name: "Flyers", creative: true, fullStack: true },
      { id: "brochures", name: "Brochures", creative: true, fullStack: true },
      { id: "billboards", name: "Billboards", creative: true, fullStack: true },
      { id: "book-covers", name: "Book covers", creative: true, fullStack: true },
      { id: "packaging", name: "Packaging", creative: true, fullStack: true },
      { id: "wraps", name: "Wraps", creative: true, fullStack: true },
    ],
  },
  {
    id: "development",
    title: "Development",
    fullStackOnly: true,
    defaultOpen: false,
    features: [
      { id: "sitemaps", name: "Sitemaps", creative: false, fullStack: true },
      { id: "webflow-development", name: "Webflow development", creative: false, fullStack: true },
      { id: "web-animations", name: "Web animations", creative: false, fullStack: true },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    fullStackOnly: true,
    defaultOpen: false,
    features: [
      { id: "campaign-strategy", name: "Campaign strategy", creative: false, fullStack: true },
      { id: "copywriting", name: "Copywriting", creative: false, fullStack: true },
      { id: "website-audit", name: "Website audit", creative: false, fullStack: true },
    ],
  },
  {
    id: "maintenance",
    title: "Maintenance",
    fullStackOnly: true,
    defaultOpen: false,
    features: [
      { id: "blog-entries", name: "Blog entries", creative: false, fullStack: true },
      { id: "web-content-updates", name: "Web content updates", creative: false, fullStack: true },
      { id: "web-design-updates", name: "Web design updates", creative: false, fullStack: true },
      { id: "web-integrations", name: "Web integrations", creative: false, fullStack: true },
      { id: "seo-optimization", name: "SEO optimization", creative: false, fullStack: true },
    ],
  },
  {
    id: "ai",
    title: "AI",
    fullStackOnly: true,
    defaultOpen: false,
    features: [
      { id: "video-production", name: "Video production", creative: false, fullStack: true },
      { id: "product-visuals", name: "Product visuals", creative: false, fullStack: true },
      { id: "avatar-voice-cloning", name: "Avatar & voice cloning", creative: false, fullStack: true },
      { id: "product-mockups", name: "Product mockups", creative: false, fullStack: true },
      { id: "campaign-photoshoot", name: "Campaign photoshoot", creative: false, fullStack: true },
      { id: "ai-consulting", name: "AI consulting", creative: false, fullStack: true },
    ],
  },
];
