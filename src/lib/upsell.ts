export type UpsellMode = "auto" | "custom" | "off";
export type UpsellKind = "plan" | "course" | "guide";
export type UpsellPlacement = "end" | "mid" | "both";
export type UpsellPlanName = "Creative Plan" | "Full Stack Plan" | "Dedicated Team";

export interface UpsellConfig {
  mode?: UpsellMode;
  enabled: boolean;
  kind: UpsellKind;
  targetSlug?: string;
  planName?: string;
  placement?: UpsellPlacement;
  eyebrow?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface UpsellCatalogItem {
  slug: string;
  kind: "course" | "guide";
  title: string;
  subtitle?: string;
  description?: string;
  priceLabel?: string;
  coverImage?: string;
  status?: string;
}

export interface ResolvedUpsellBanner {
  visible: boolean;
  mode: UpsellMode;
  kind: UpsellKind;
  placement: UpsellPlacement;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  badge?: string;
  coverImage?: string;
}

export interface PlanCatalogEntry {
  name: UpsellPlanName;
  eyebrow: string;
  badge: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}

export const PLAN_CATALOG: Record<string, PlanCatalogEntry> = {
  "Creative Plan": {
    name: "Creative Plan",
    eyebrow: "Creative Subscription",
    badge: "Most Popular",
    title: "Scale your brand output with the Creative Plan",
    description:
      "Unlimited brand, social, and ad creative requests with senior design talent and 48-hour turnarounds.",
    ctaLabel: "Explore Creative Plan",
    href: "/pricing"
  },
  "Full Stack Plan": {
    name: "Full Stack Plan",
    eyebrow: "Full Stack Creative + AI",
    badge: "Complete Engine",
    title: "Unlock design, motion, web & AI workflows in one plan",
    description:
      "Everything in Creative plus high-converting landing pages, motion systems, and dedicated AI production.",
    ctaLabel: "Explore Full Stack Plan",
    href: "/pricing"
  },
  "Dedicated Team": {
    name: "Dedicated Team",
    eyebrow: "Dedicated Creative Pod",
    badge: "Enterprise",
    title: "Embed a dedicated Adaptif creative team",
    description:
      "A senior multidisciplinary pod integrated into your Slack, workflows, and weekly sprints.",
    ctaLabel: "Explore Dedicated Team",
    href: "/dedicated-team"
  }
};

export function appendRefParam(href: string, sourceKind: "blog" | "guide" | "course", sourceSlug: string): string {
  if (!href || href.startsWith("#")) return href;
  const sep = href.includes("?") ? "&" : "?";
  const ref = encodeURIComponent(`${sourceKind}:${sourceSlug}`);
  if (href.includes("ref=")) return href;
  return `${href}${sep}ref=${ref}`;
}

export function normalizeUpsellConfig(
  raw: Partial<UpsellConfig> | undefined,
  sourceKind: "blog" | "guide" | "course"
): UpsellConfig {
  const defaultKind: UpsellKind = sourceKind === "guide" ? "course" : "plan";
  const defaultPlan = sourceKind === "course" ? "Full Stack Plan" : "Creative Plan";

  if (!raw || typeof raw !== "object") {
    return {
      mode: "auto",
      enabled: true,
      kind: defaultKind,
      planName: defaultPlan,
      placement: "end"
    };
  }

  const inferredMode: UpsellMode =
    raw.mode === "auto" || raw.mode === "custom" || raw.mode === "off"
      ? raw.mode
      : raw.enabled === false
        ? "off"
        : raw.targetSlug || raw.planName || raw.title || raw.eyebrow || raw.description || raw.ctaLabel
          ? "custom"
          : "auto";

  return {
    mode: inferredMode,
    enabled: inferredMode !== "off",
    kind: raw.kind === "course" || raw.kind === "guide" || raw.kind === "plan" ? raw.kind : defaultKind,
    targetSlug: raw.targetSlug || "",
    planName: raw.planName || defaultPlan,
    placement: raw.placement === "mid" || raw.placement === "both" ? raw.placement : "end",
    eyebrow: raw.eyebrow || "",
    title: raw.title || "",
    description: raw.description || "",
    ctaLabel: raw.ctaLabel || "",
    ctaHref: raw.ctaHref || ""
  };
}

export function resolveUpsellBanner(params: {
  upsell?: Partial<UpsellConfig>;
  sourceKind: "blog" | "guide" | "course";
  sourceSlug: string;
  courses?: UpsellCatalogItem[];
  guides?: UpsellCatalogItem[];
}): ResolvedUpsellBanner {
  const { sourceKind, sourceSlug, courses = [], guides = [] } = params;
  const cfg = normalizeUpsellConfig(params.upsell, sourceKind);

  if (cfg.mode === "off" || !cfg.enabled) {
    return {
      visible: false,
      mode: "off",
      kind: cfg.kind,
      placement: cfg.placement || "end",
      eyebrow: "",
      title: "",
      description: "",
      ctaLabel: "",
      ctaHref: "/pricing"
    };
  }

  let effectiveKind: UpsellKind = cfg.kind;
  let effectivePlanName = cfg.planName || (sourceKind === "course" ? "Full Stack Plan" : "Creative Plan");
  let effectiveSlug = cfg.targetSlug || "";

  if (cfg.mode === "auto") {
    if (sourceKind === "blog") {
      effectiveKind = "plan";
      effectivePlanName = "Creative Plan";
    } else if (sourceKind === "guide") {
      const firstCourse = courses.find((c) => c.slug !== sourceSlug);
      if (firstCourse) {
        effectiveKind = "course";
        effectiveSlug = firstCourse.slug;
      } else {
        effectiveKind = "plan";
        effectivePlanName = "Creative Plan";
      }
    } else {
      effectiveKind = "plan";
      effectivePlanName = "Full Stack Plan";
    }
  }

  if (effectiveKind === "course") {
    const course =
      courses.find((c) => c.slug === effectiveSlug) ||
      courses.find((c) => c.slug !== sourceSlug);
    if (course) {
      const baseHref = `/academy/courses/${course.slug}`;
      return {
        visible: true,
        mode: cfg.mode || "custom",
        kind: "course",
        placement: cfg.placement || "end",
        eyebrow: cfg.eyebrow?.trim() || "Recommended Course",
        title: cfg.title?.trim() || course.title,
        description:
          cfg.description?.trim() ||
          course.subtitle ||
          course.description ||
          "Step-by-step system, templates, and AI workflows ready to apply.",
        ctaLabel: cfg.ctaLabel?.trim() || (course.priceLabel ? `Enroll · ${course.priceLabel}` : "View Course"),
        ctaHref: appendRefParam(cfg.ctaHref?.trim() || baseHref, sourceKind, sourceSlug),
        badge: course.priceLabel || "Pro Course",
        coverImage: course.coverImage || ""
      };
    }
  }

  if (effectiveKind === "guide") {
    const guide =
      guides.find((g) => g.slug === effectiveSlug) ||
      guides.find((g) => g.slug !== sourceSlug);
    if (guide) {
      const baseHref = `/academy/guides/${guide.slug}`;
      return {
        visible: true,
        mode: cfg.mode || "custom",
        kind: "guide",
        placement: cfg.placement || "end",
        eyebrow: cfg.eyebrow?.trim() || "Free Playbook",
        title: cfg.title?.trim() || guide.title,
        description:
          cfg.description?.trim() ||
          guide.subtitle ||
          guide.description ||
          "Unlock the interactive slide deck and downloadable PDF playbook.",
        ctaLabel: cfg.ctaLabel?.trim() || "Read Free Guide",
        ctaHref: appendRefParam(cfg.ctaHref?.trim() || baseHref, sourceKind, sourceSlug),
        badge: "Free Guide",
        coverImage: guide.coverImage || ""
      };
    }
  }

  const plan = PLAN_CATALOG[effectivePlanName] || PLAN_CATALOG["Creative Plan"];
  return {
    visible: true,
    mode: cfg.mode || "custom",
    kind: "plan",
    placement: cfg.placement || "end",
    eyebrow: cfg.eyebrow?.trim() || plan.eyebrow,
    title: cfg.title?.trim() || plan.title,
    description: cfg.description?.trim() || plan.description,
    ctaLabel: cfg.ctaLabel?.trim() || plan.ctaLabel,
    ctaHref: appendRefParam(cfg.ctaHref?.trim() || plan.href, sourceKind, sourceSlug),
    badge: plan.badge
  };
}
