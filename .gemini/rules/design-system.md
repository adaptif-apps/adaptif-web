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
