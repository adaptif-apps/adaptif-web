# Smart Image Scanning & Responsive Cropping Rule

Whenever the user provides or references raw images to be used as assets on the website (e.g., from `assets/`, uploaded files, or local folders), NEVER place the uncropped image blindly into a section. Follow this mandatory workflow:

1. **Scan & Inspect the Image:**
   - View the image (`read_file`) and check its original pixel dimensions.
   - Identify the **primary focal point(s)** (people, faces, key objects, architectural/visual anchors) and the **negative / quiet space** (empty sky, dark zones, low-detail backgrounds).

2. **Analyze the Target Section Container (Desktop & Mobile):**
   - Check the container's **aspect ratio** and **content overlay placement** on both Desktop (`> 768px`) and Mobile (`<= 768px`).
   - Align the crop so the **text, headlines, and CTAs sit over the negative space**, while the **primary focal subject remains cleanly framed and unobstructed** (e.g., if text/CTA is on the left, frame the subject toward the right and preserve quiet background on the left).

3. **Generate Purpose-Built Crops in `public/images/`:**
   - **Always trim outer edge artifacts:** Inspect and crop at least `6–10px` inward from any original outer edge that touches the raw image boundary (or auto-detect bright/white 1–8px export fringes) so no thin white borders or JPEG edge lines ever appear on dark backgrounds.
   - Crop and optimize the image(s) to match the section's exact proportions (e.g., using Python `PIL` / `sharp`), saving them under `public/images/<section-or-page>/`.
   - When Desktop and Mobile require different compositions or aspect ratios, generate both:
     - `*-desktop.jpg` (landscape / wide framing matching desktop container)
     - `*-mobile.jpg` (tighter vertical / square framing keeping the focal subject centered and legible on narrow viewports)
   - Never clip faces, heads, or key subjects at container edges.

4. **Connect Responsively with `<picture>`:**
   - Use `<picture>` with `<source media="(max-width: 768px)" srcset="/images/...-mobile.jpg" />` and `<img src="/images/...-desktop.jpg" ... />`.
   - Add `display: contents;` on the `<picture>` wrapper when the `<img>` is absolutely positioned or fills a flex/grid/aspect-ratio container.

5. **Verify:**
   - Run `npm run build` and verify in the local dev server that both Desktop and Mobile load their respective crops cleanly with zero horizontal overflow and clear text legibility.
