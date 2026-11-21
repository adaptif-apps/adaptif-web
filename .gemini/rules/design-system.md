# Global Design System & Style Registry Rule

Before creating any new component, page, or UI element (on both the public website and `/studio-adaptif-9x4k` Preferences):

1. **Check the Global Style Registry first:**
   - Read `src/styles/STYLE_REGISTRY.md` (and `src/styles/global.css` / `src/styles/tokens.css` when inspecting exact values) before writing any CSS or markup.
2. **Reuse existing global classes and tokens:**
   - NEVER invent local/duplicate button, eyebrow, badge, or surface classes (e.g. `.my-btn`, `.wa-btn-primary`, `.acd-btn-cyan`, `.dt-hero__eyebrow`) when a global class already exists.
   - Always use `.adaptif-btn` (plus `.adaptif-btn--dark`, `.adaptif-btn--danger`, `.adaptif-btn--sm` as needed), `.adaptif-eyebrow`, `.adaptif-tag`, `.glass-panel`, and CSS variables from `src/styles/tokens.css`.
   - **Eyebrows:** Section and hero eyebrows MUST use `.adaptif-eyebrow` directly (clean uppercase cyan typography, no pill containers, borders, backdrop blur, or glowing dots).
   - Both the public site (`src/layouts/Layout.astro`) and Studio Preferences (`src/pages/studio-adaptif-9x4k.astro`) import `src/styles/global.css` so global style updates propagate everywhere automatically.
3. **Promote missing reusable patterns to the global registry:**
   - If a requested UI element or variant does not exist in `src/styles/STYLE_REGISTRY.md` / `src/styles/global.css` and is reusable (e.g. a new button variant, form control, card surface, or badge), add it to `src/styles/global.css` first, document it in `src/styles/STYLE_REGISTRY.md`, and then use the global class in the component.

4. **Studio Preferences (`/studio-adaptif-9x4k`) Shared Components & Classes:**
   - **Headers:** Always use `<StudioHeader eyebrow="..." title="..." />` (`src/components/StudioHeader.astro`) instead of duplicating `<header class="studio-header">`. `eyebrow` MUST match the parent sidebar dropdown name (`CMS`, `CRM`, `FORMS`, `INTEGRATIONS`, `CONFIGURATION`) and `title` MUST match the exact sidebar item label.
   - **Action & Header Buttons:** Use `.cms-btn` (neutral translucent outline), `.cms-btn--danger`, and `.cms-btn--save` for secondary/item header actions, reserving `.adaptif-btn.adaptif-btn--sm` for primary creation/save CTAs (`+ New ...`, `Save ...`). Use `.studio-actions-divider` between item actions and global `+ New` actions.
   - **External / Preview Links (`↗`):** Always use `.studio-link` (never `.adaptif-btn--dark`) for header/inline navigation links like `View Sitemap ↗`, `View robots.txt ↗`, or `Test WhatsApp Link ↗`.
   - **Dropdowns (`<select>`):** Every `<select>` inside `.studio-main` is automatically enhanced into the custom `.studio-dropdown` UI (unless `data-native-select` is explicitly set). Whenever updating a `<select>` value programmatically in JS, always call `window.__STUDIO_SYNC_SELECT__?.(selectEl)`.
   - **CMS Item Title Bar & Tabs:** Reuse `.cms-item-title-bar`, `.cms-item-title-input`, `.cms-status-badge` (`.is-published` / `.is-scheduled`), and `.cms-tabs-bar` / `.cms-tab-btn`.

5. **Typography — No Instrument Serif at or Under 24px:**
   - Headings and titles with a computed `font-size` of `24px` (`1.5rem`) or smaller (`<= 24px`) MUST NOT use `--font-family-display` (`Instrument Serif`), because its narrow condensed proportions hurt legibility at small sizes.
   - Use `--font-family-body` (`Roboto`) with an appropriate font weight (`500`–`600`) for any heading or sub-title `<= 24px` (including responsive `clamp(...)` minimums if the minimum is `<= 24px`).

6. **Layout Rhythm — Minimize Cards & Bento Grids:**
   - Avoid defaulting to boxed cards (`.glass-panel`, bordered rectangles) or Bento-style grids for every section or item.
   - Prefer **open editorial layouts**: strong typographic hierarchy, hairline dividers (`1px solid rgba(255, 255, 255, 0.08)`), asymmetric splits, unboxed metric strips, and generous whitespace directly over `--color-void` / `--color-obsidian-950`.
   - Reserve bordered/glass card containers strictly for primary focal panels, interactive selectors, or modals—never wrap secondary stats, lists, or pillars in cards when open typography and subtle dividers look cleaner and more editorial.
