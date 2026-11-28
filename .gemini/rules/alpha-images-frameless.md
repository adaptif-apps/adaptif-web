# Alpha-Channel Images & Floating Graphics Rule

- **Never Frame Alpha-Channel Images:** Across the entire Adaptif website, images with an alpha channel (`.png`, `.webp`, `.svg`, or floating UI/glass graphics) MUST NOT be wrapped in a black frame, `glass-panel`, border, or opaque background (`background: transparent; border: none; box-shadow: none;`).
- **True Transparency Over Dark Surfaces:** Always ensure the image's alpha channel reveals whatever is behind it on the page. If a source asset is a `.jpg` with a solid black background, convert it to a true transparent `.png` (do not rely on `mix-blend-mode` inside transformed/revealed containers, because CSS stacking contexts block blending with the page background).
