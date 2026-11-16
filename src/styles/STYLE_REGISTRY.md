# Adaptif Global Style Registry

This is the single source of truth for global design tokens and reusable UI classes shared across both the public website (`src/layouts/Layout.astro`) and Studio Preferences (`src/pages/studio-adaptif-9x4k.astro`).

- **Tokens:** `src/styles/tokens.css`
- **Global Stylesheet:** `src/styles/global.css`

---

## 1. Buttons (`.adaptif-btn`)

Defined in `src/styles/global.css`. Controlled via CSS custom properties (`--btn-bg-top`, `--btn-bg-mid`, `--btn-bg-bottom`, `--btn-color`, `--btn-specular`, `--btn-glow`, `--btn-shadow`, `--btn-shadow-hover`, `--btn-text-shadow`).

| Class | Purpose | Notes |
| --- | --- | --- |
| `.adaptif-btn` | Primary CTA button (cyan gradient, specular highlight, glow, spring hover) | Default size: `padding: 14px 32px` |
| `.adaptif-btn--dark` | Secondary / dark obsidian button (same bevel & glow mechanics) | Combine with `.adaptif-btn` |
| `.adaptif-btn--danger` | Destructive action button (red gradient, same bevel & glow mechanics) | Combine with `.adaptif-btn` |
| `.adaptif-btn--sm` | Compact size (`padding: 9px 18px; font-size: 0.84rem`) | Use in Studio headers, toolbars, and inline forms |

**Usage:**
```html
<button type="button" class="adaptif-btn adaptif-btn--sm">Save Changes</button>
<button type="button" class="adaptif-btn adaptif-btn--dark adaptif-btn--sm">Cancel</button>
<button type="button" class="adaptif-btn adaptif-btn--danger adaptif-btn--sm">Delete</button>
```

---

## 2. Typography & Eyebrows

| Class | Purpose |
| --- | --- |
| `.adaptif-eyebrow` | Canonical uppercase section eyebrow (`--color-brand-cyan`, `0.82rem`, `font-weight: 700`, `letter-spacing: 0.12em`) |
| `.adaptif-eyebrow--light` | Light-theme eyebrow variant (`#0284c7`) |
| `.title-highlight` | Celestial cyan gradient highlight for display headings |
| `.text-glow-blue` | White-to-blue gradient text |
| `.text-gradient-subtle` | Subtle white gradient text |

---

## 3. Tags & Badges (`.adaptif-tag`)

| Class | Purpose |
| --- | --- |
| `.adaptif-tag` | Base rectangular badge (`border-radius: 4px`, `0.62rem`, uppercase) |
| `.adaptif-tag--white` | High-contrast white badge |
| `.adaptif-tag--cyan` | Translucent cyan badge |
| `.adaptif-tag--muted` | Subtle muted badge |

---

## 4. Surfaces & Layout

| Class | Purpose |
| --- | --- |
| `.container` | Centered max-width container (`--container-max`) with responsive horizontal padding |
| `.glass-panel` | Frosted dark glass surface (`--glass-bg-card`, `--glass-blur-md`, `--border-hairline`, `--shadow-bevel-card`) |

---

## 5. Key Design Tokens (`src/styles/tokens.css`)

- **Colors:** `--color-void`, `--color-obsidian-950`, `--color-brand-cyan`, `--color-blue-radiant`, `--color-text-primary`, `--color-text-secondary`, `--color-text-white`
- **Fonts:** `--font-family-display` (`Instrument Serif`), `--font-family-body` (`DM Sans`), `--font-sans`
- **Radii & Motion:** `--radius-pill`, `--duration-fast`, `--ease-spring`
- **Shadows:** `--shadow-button-primary`, `--shadow-button-hover`, `--shadow-bevel-card`
