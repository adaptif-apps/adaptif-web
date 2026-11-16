# Global Live Content Editor (`data-cms-key`) Rule

Whenever creating a new public page or section component (wrapped in `src/layouts/Layout.astro`):

1. **Tag editable content with `data-cms-key`:**
   - Add unique, descriptive `data-cms-key="<page>.<section>.<field>"` attributes to primary headings (`h1`-`h3`), eyebrows, lead paragraphs, CTA buttons/links (`<a>` / `<button>`), and editorial images (`<img>`).
   - Do NOT put `data-cms-key` on decorative SVGs, background canvases, or interactive UI chrome.
2. **Keep pages dynamic (`export const prerender = false;`):**
   - Public pages that use `Layout.astro` and `GlobalPageEditor.astro` should have `export const prerender = false;` so edits saved in `?edit=1` go live immediately without requiring a rebuild.
