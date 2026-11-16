# Global Design System & Style Registry Rule

Before creating any new component, page, or UI element (on both the public website and `/studio-adaptif-9x4k` Preferences):

1. **Check the Global Style Registry first:**
   - Read `src/styles/STYLE_REGISTRY.md` (and `src/styles/global.css` / `src/styles/tokens.css` when inspecting exact values) before writing any CSS or markup.
2. **Reuse existing global classes and tokens:**
   - NEVER invent local/duplicate button, eyebrow, badge, or surface classes (e.g. `.my-btn`, `.wa-btn-primary`, `.acd-btn-cyan`) when a global class already exists.
   - Always use `.adaptif-btn` (plus `.adaptif-btn--dark`, `.adaptif-btn--danger`, `.adaptif-btn--sm` as needed), `.adaptif-eyebrow`, `.adaptif-tag`, `.glass-panel`, and CSS variables from `src/styles/tokens.css`.
   - Both the public site (`src/layouts/Layout.astro`) and Studio Preferences (`src/pages/studio-adaptif-9x4k.astro`) import `src/styles/global.css` so global style updates propagate everywhere automatically.
3. **Promote missing reusable patterns to the global registry:**
   - If a requested UI element or variant does not exist in `src/styles/STYLE_REGISTRY.md` / `src/styles/global.css` and is reusable (e.g. a new button variant, form control, card surface, or badge), add it to `src/styles/global.css` first, document it in `src/styles/STYLE_REGISTRY.md`, and then use the global class in the component.

4. **Studio Preferences (`/studio-adaptif-9x4k`) Shared Components & Classes:**
   - **Headers:** Always use `<StudioHeader eyebrow="..." title="..." />` (`src/components/StudioHeader.astro`) instead of duplicating `<header class="studio-header">`. `eyebrow` MUST match the parent sidebar dropdown name (`CMS`, `CRM`, `FORMS`, `INTEGRATIONS`, `CONFIGURATION`) and `title` MUST match the exact sidebar item label.
   - **Action & Header Buttons:** Use `.cms-btn` (neutral translucent outline), `.cms-btn--danger`, and `.cms-btn--save` for secondary/item header actions, reserving `.adaptif-btn.adaptif-btn--sm` for primary creation/save CTAs (`+ New ...`, `Save ...`). Use `.studio-actions-divider` between item actions and global `+ New` actions.
   - **External / Preview Links (`↗`):** Always use `.studio-link` (never `.adaptif-btn--dark`) for header/inline navigation links like `View Sitemap ↗`, `View robots.txt ↗`, or `Test WhatsApp Link ↗`.
   - **Dropdowns (`<select>`):** Every `<select>` inside `.studio-main` is automatically enhanced into the custom `.studio-dropdown` UI (unless `data-native-select` is explicitly set). Whenever updating a `<select>` value programmatically in JS, always call `window.__STUDIO_SYNC_SELECT__?.(selectEl)`.
   - **CMS Item Title Bar & Tabs:** Reuse `.cms-item-title-bar`, `.cms-item-title-input`, `.cms-status-badge` (`.is-published` / `.is-scheduled`), and `.cms-tabs-bar` / `.cms-tab-btn`.
