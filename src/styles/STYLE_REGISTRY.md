# Adaptif Global Style Registry

This is the single source of truth for global design tokens and reusable UI classes shared across both the public website (`src/layouts/Layout.astro`) and Studio Preferences (`src/pages/studio-adaptif-9x4k.astro`).

- **Tokens:** `src/styles/tokens.css`
- **Global Stylesheet:** `src/styles/global.css`

---

## 1. Buttons (`.adaptif-btn` & `.cms-btn`)

Defined in `src/styles/global.css`.

### Primary & Bevel Buttons (`.adaptif-btn`)
Controlled via CSS custom properties (`--btn-bg-top`, `--btn-bg-mid`, `--btn-bg-bottom`, `--btn-color`, `--btn-specular`, `--btn-glow`, `--btn-shadow`, `--btn-shadow-hover`, `--btn-text-shadow`).

| Class | Purpose | Notes |
| --- | --- | --- |
| `.adaptif-btn` | Primary CTA button (cyan gradient, specular highlight, glow, spring hover) | Default size: `padding: 14px 32px` |
| `.adaptif-btn--dark` | Secondary / dark obsidian button (same bevel & glow mechanics) | Combine with `.adaptif-btn` |
| `.adaptif-btn--danger` | Destructive action button (red gradient, same bevel & glow mechanics) | Combine with `.adaptif-btn` |
| `.adaptif-btn--sm` | Compact size (`padding: 9px 18px; font-size: 0.84rem`) | Use for primary `+ New ...` and `Save ...` CTAs |

### Sober Outline Pill Buttons (`.cms-btn`)
Used for secondary/item header actions and utility controls across both public and Preferences UIs:

| Class | Purpose |
| --- | --- |
| `.cms-btn` | Neutral translucent dark pill (`border: 1px solid rgba(148, 163, 184, 0.26)`) |
| `.cms-btn--save` | Cyan-tinted outline pill for save/accent actions |
| `.cms-btn--danger` | Red-tinted outline pill for `Delete` / `Remove PDF` actions |

### Links (`.studio-link`)
| Class | Purpose |
| --- | --- |
| `.studio-link` | Clean cyan navigation/external link (`↗`) with subtle hover surface |
| `.studio-link--inline` | Compact inline link variant inside form labels or steps |

---

## 2. Typography & Eyebrows

| Class | Purpose |
| --- | --- |
| `.adaptif-eyebrow` / `.studio-eyebrow` | Canonical uppercase section eyebrow (`--color-brand-cyan`, `0.82rem`, `font-weight: 700`, `letter-spacing: 0.12em`) |
| `.studio-title` | Display serif section heading (`--font-serif`, `2.2rem`, with italic cyan `<span>` accent) |
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
| `.cms-status-badge` | Pill status badge (`.is-published`, `.is-scheduled`, default draft) |
| `.cms-tabs-bar` / `.cms-tab-btn` | Segmented pill tab bar (`.is-active` for selected tab) |

---

## 4. Surfaces & Layout

| Class | Purpose |
| --- | --- |
| `.container` | Centered max-width container (`--container-max`) with responsive horizontal padding |
| `.glass-panel` | Frosted dark glass surface (`--glass-bg-card`, `--glass-blur-md`, `--border-hairline`, `--shadow-bevel-card`) |
| `.adaptif-input` | Standard dark glass form input |
| `.cms-item-title-bar` / `.cms-item-title-input` | Inline editable serif title bar with status badge |

---

## 5. Key Design Tokens (`src/styles/tokens.css`)

- **Colors:** `--color-void`, `--color-obsidian-950`, `--color-brand-cyan`, `--color-blue-radiant`, `--color-text-primary`, `--color-text-secondary`, `--color-text-white`
- **Fonts:** `--font-family-display` (`Instrument Serif`), `--font-family-body` (`DM Sans`), `--font-sans`
- **Radii & Motion:** `--radius-pill`, `--duration-fast`, `--ease-spring`
- **Shadows:** `--shadow-button-primary`, `--shadow-button-hover`, `--shadow-bevel-card`
