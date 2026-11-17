import {
  normalizeUpsellConfig,
  resolveUpsellBanner,
  type UpsellCatalogItem,
  type UpsellConfig,
  type UpsellKind,
  type UpsellMode,
  type UpsellPlacement
} from "./upsell";

declare global {
  interface Window {
    __STUDIO_SYNC_SELECT__?: (el: HTMLSelectElement | null) => void;
  }
}

export interface UpsellPanelController {
  setCatalog: (courses: UpsellCatalogItem[], guides?: UpsellCatalogItem[]) => void;
  setContext: (sourceKind: "blog" | "guide" | "course", sourceSlug: string, config?: Partial<UpsellConfig>) => void;
  getConfig: () => UpsellConfig;
}

export function createUpsellPanelController(prefix: "blog" | "acd"): UpsellPanelController {
  const modeEl = document.getElementById(`${prefix}-upsell-mode`) as HTMLSelectElement | null;
  const placementWrap = document.getElementById(`${prefix}-upsell-placement-wrap`);
  const placementEl = document.getElementById(`${prefix}-upsell-placement`) as HTMLSelectElement | null;
  const customBox = document.getElementById(`${prefix}-upsell-custom-fields`);
  const kindEl = document.getElementById(`${prefix}-upsell-kind`) as HTMLSelectElement | null;
  const planWrap = document.getElementById(`${prefix}-upsell-plan-wrap`);
  const planEl = document.getElementById(`${prefix}-upsell-plan`) as HTMLSelectElement | null;
  const targetWrap = document.getElementById(`${prefix}-upsell-target-wrap`);
  const targetEl = document.getElementById(`${prefix}-upsell-target`) as HTMLSelectElement | null;

  const eyebrowEl = document.getElementById(`${prefix}-upsell-eyebrow`) as HTMLInputElement | null;
  const ctaEl = document.getElementById(`${prefix}-upsell-cta`) as HTMLInputElement | null;
  const titleEl = document.getElementById(`${prefix}-upsell-title`) as HTMLInputElement | null;
  const descEl = document.getElementById(`${prefix}-upsell-desc`) as HTMLTextAreaElement | null;

  const pvCard = document.getElementById(`${prefix}-upsell-preview-card`);
  const pvStatus = document.getElementById(`${prefix}-upsell-preview-status`);
  const pvEyebrow = document.getElementById(`${prefix}-upsell-pv-eyebrow`);
  const pvBadge = document.getElementById(`${prefix}-upsell-pv-badge`);
  const pvTitle = document.getElementById(`${prefix}-upsell-pv-title`);
  const pvDesc = document.getElementById(`${prefix}-upsell-pv-desc`);
  const pvCta = document.getElementById(`${prefix}-upsell-pv-cta`);

  let coursesCatalog: UpsellCatalogItem[] = [];
  let guidesCatalog: UpsellCatalogItem[] = [];
  let currentSourceKind: "blog" | "guide" | "course" = prefix === "blog" ? "blog" : "guide";
  let currentSourceSlug = "";
  let pendingTargetSlug = "";

  function syncSelect(el: HTMLSelectElement | null) {
    if (el) window.__STUDIO_SYNC_SELECT__?.(el);
  }

  function populateTargetOptions() {
    if (!targetEl || !kindEl) return;
    const kind = kindEl.value as UpsellKind;
    const list = kind === "guide" ? guidesCatalog : coursesCatalog;
    const filtered = list.filter((item) => item.slug !== currentSourceSlug);

    targetEl.innerHTML = "";
    if (filtered.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = kind === "guide" ? "No other guides available" : "No courses available yet";
      targetEl.appendChild(opt);
    } else {
      for (const item of filtered) {
        const opt = document.createElement("option");
        opt.value = item.slug;
        opt.textContent = item.priceLabel ? `${item.title} (${item.priceLabel})` : item.title;
        targetEl.appendChild(opt);
      }
      if (pendingTargetSlug && filtered.some((i) => i.slug === pendingTargetSlug)) {
        targetEl.value = pendingTargetSlug;
      } else {
        targetEl.value = filtered[0].slug;
      }
    }
    syncSelect(targetEl);
  }

  function getConfig(): UpsellConfig {
    const mode = (modeEl?.value || "auto") as UpsellMode;
    const kind = (kindEl?.value || "plan") as UpsellKind;
    const placement = (placementEl?.value || "end") as UpsellPlacement;
    return {
      mode,
      enabled: mode !== "off",
      kind,
      planName: kind === "plan" ? planEl?.value || "Creative Plan" : undefined,
      targetSlug: kind !== "plan" ? targetEl?.value || "" : undefined,
      placement,
      eyebrow: eyebrowEl?.value.trim() || "",
      title: titleEl?.value.trim() || "",
      description: descEl?.value.trim() || "",
      ctaLabel: ctaEl?.value.trim() || ""
    };
  }

  function refreshVisibilityAndPreview() {
    const mode = (modeEl?.value || "auto") as UpsellMode;
    const kind = (kindEl?.value || "plan") as UpsellKind;

    if (customBox) customBox.hidden = mode !== "custom";
    if (placementWrap) placementWrap.hidden = mode === "off";
    if (planWrap) planWrap.hidden = kind !== "plan";
    if (targetWrap) targetWrap.hidden = kind === "plan";

    const cfg = getConfig();
    const resolved = resolveUpsellBanner({
      upsell: cfg,
      sourceKind: currentSourceKind,
      sourceSlug: currentSourceSlug || "preview",
      courses: coursesCatalog,
      guides: guidesCatalog
    });

    if (pvCard) pvCard.classList.toggle("is-disabled-preview", !resolved.visible);
    if (pvStatus) {
      pvStatus.textContent = !resolved.visible
        ? "Hidden"
        : mode === "auto"
          ? "Auto Default"
          : "Custom";
    }

    if (resolved.visible) {
      if (pvEyebrow) pvEyebrow.textContent = resolved.eyebrow;
      if (pvBadge) {
        pvBadge.textContent = resolved.badge || "";
        pvBadge.hidden = !resolved.badge;
      }
      if (pvTitle) pvTitle.textContent = resolved.title;
      if (pvDesc) pvDesc.textContent = resolved.description;
      if (pvCta) pvCta.textContent = `${resolved.ctaLabel} →`;
    } else {
      if (pvEyebrow) pvEyebrow.textContent = "Upsell Disabled";
      if (pvBadge) pvBadge.hidden = true;
      if (pvTitle) pvTitle.textContent = "No upsell banner will be shown on this page";
      if (pvDesc) pvDesc.textContent = "Switch Upsell Mode to Auto or Custom to promote a Plan or Course.";
      if (pvCta) pvCta.textContent = "Hidden";
    }
  }

  modeEl?.addEventListener("change", refreshVisibilityAndPreview);
  placementEl?.addEventListener("change", refreshVisibilityAndPreview);
  kindEl?.addEventListener("change", () => {
    populateTargetOptions();
    refreshVisibilityAndPreview();
  });
  planEl?.addEventListener("change", refreshVisibilityAndPreview);
  targetEl?.addEventListener("change", () => {
    pendingTargetSlug = targetEl.value;
    refreshVisibilityAndPreview();
  });
  [eyebrowEl, ctaEl, titleEl, descEl].forEach((el) => {
    el?.addEventListener("input", refreshVisibilityAndPreview);
  });

  return {
    setCatalog(courses: UpsellCatalogItem[], guides: UpsellCatalogItem[] = []) {
      coursesCatalog = courses;
      guidesCatalog = guides;
      populateTargetOptions();
      refreshVisibilityAndPreview();
    },
    setContext(sourceKind, sourceSlug, rawConfig) {
      currentSourceKind = sourceKind;
      currentSourceSlug = sourceSlug;
      const cfg = normalizeUpsellConfig(rawConfig, sourceKind);
      pendingTargetSlug = cfg.targetSlug || "";

      if (modeEl) {
        modeEl.value = cfg.mode || "auto";
        syncSelect(modeEl);
      }
      if (placementEl) {
        placementEl.value = cfg.placement || "end";
        syncSelect(placementEl);
      }
      if (kindEl) {
        kindEl.value = cfg.kind || (sourceKind === "guide" ? "course" : "plan");
        syncSelect(kindEl);
      }
      if (planEl) {
        planEl.value = cfg.planName || (sourceKind === "course" ? "Full Stack Plan" : "Creative Plan");
        syncSelect(planEl);
      }
      if (eyebrowEl) eyebrowEl.value = cfg.eyebrow || "";
      if (titleEl) titleEl.value = cfg.title || "";
      if (descEl) descEl.value = cfg.description || "";
      if (ctaEl) ctaEl.value = cfg.ctaLabel || "";

      populateTargetOptions();
      refreshVisibilityAndPreview();
    },
    getConfig
  };
}
