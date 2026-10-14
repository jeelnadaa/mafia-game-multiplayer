# Mafia: Shadows of the City — Design Tokens & Art Direction

## 1. Aesthetic Direction: Film-Noir & Case-File

The aesthetic is built around mid-century case-files, stark shadows, warm lamplight, and cold interrogation steel. No neon glows, no random floating blobs, no decorative glassmorphism, and no emoji bullet points.

### 1.1 Color Palette & CSS Variables

| Token | CSS Variable | Hex | Semantic Meaning / Usage |
|---|---|---|---|
| Deep Obsidian | `--bg` | `#09090b` | Base background, deep shadows |
| Case Surface | `--surface` | `#111113` | Primary cards, dossier folders |
| Charcoal Slate | `--surface-2` | `#18181b` | Secondary controls, inactive buttons |
| Inked Border | `--border` | `#27272a` | Dividers, card edges, hairline borders |
| Signal Red | `--accent-danger` | `#dc2626` | Mafia affiliation, kill reticles, elimination |
| Lamplight Amber | `--accent-day` | `#d97706` | Day discussion, town notices, warm brass accents |
| Steel Blue | `--accent-night` | `#2563eb` | Night operations, police intel, cool moonlight |
| Paper White | `--text` | `#fafafa` | High-contrast primary typography (WCAG AAA) |
| Muted Typewriter | `--muted` | `#a1a1aa` | Labels, timestamps, secondary hints (WCAG AA) |

### 1.2 Phase-Driven Atmosphere Tokens

The entire application shifts mood via `document.documentElement.dataset.phase`:

```css
/* Night Operations: Cold steel-blue & deep shadows */
html[data-phase="night"] {
  --bg: #07090e;
  --surface: #0c0f17;
  --surface-2: #121824;
  --border: #1e293b;
  --theme-color: #07090e;
  --accent-phase: #38bdf8;
}

/* Dawn & Day Discussion: Warm parchment & amber lamplight */
html[data-phase="day"], html[data-phase="discussion"] {
  --bg: #0c0a09;
  --surface: #141210;
  --surface-2: #1c1917;
  --border: #292524;
  --theme-color: #0c0a09;
  --accent-phase: #f59e0b;
}

/* Town Voting: High tension amber-red */
html[data-phase="voting"] {
  --bg: #0d0707;
  --surface: #170d0d;
  --surface-2: #241414;
  --border: #3d1c1c;
  --theme-color: #0d0707;
  --accent-phase: #ef4444;
}

/* Game Over: Resolution docket */
html[data-phase="gameover"] {
  --bg: #09090b;
  --surface: #111113;
  --surface-2: #18181b;
  --border: #27272a;
  --theme-color: #09090b;
  --accent-phase: #fafafa;
}
```

### 1.3 Typography Pairing

1. **Display Heading**: *Satoshi / Monospace Grotesk* (`font-bold`, uppercase, tracking-wider, `font-display: swap`).
2. **Body & UI**: Clean neutral grotesk with tabular numbers for timers (`font-feature-settings: "tnum"`).
3. **Inputs & Form Controls**: Strict `16px` minimum font-size to prevent iOS Safari auto-zooming.

### 1.4 Spacing & Geometry Scale

- **Radius**: Minimal, utilitarian geometry (`rounded-none` to `rounded-sm`, 0px–2px). Cards and buttons resemble stamped paper documents and physical tokens.
- **Elevation / Shadows**: Deep, directional shadows (`shadow-[0_20px_50px_rgba(0,0,0,0.9)]`) simulating single overhead desk lamp lighting.
- **Touch Targets**: Minimum 44×44px interactive bounds on all mobile touch surfaces with `touch-action: manipulation`.

### 1.5 Motion Rules

- **Micro-interactions (UI)**: 150ms–250ms with `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out).
- **Set-piece Moments**:
  - Ink-stamp vote placement: 200ms scale-down with slight rotation (-4° to +4°).
  - 3D Role Card flip: 450ms `rotateY(180deg)` with `perspective: 1000px`.
  - Phase change banner: 1.5s announcement banner, then transition to persistent header indicator.
- **Hardware Acceleration**: Only animate `transform` and `opacity` to maintain 60 FPS on mobile chips.
- **Reduced Motion**: Full support for `prefers-reduced-motion: reduce`. Instant state swaps, no 3D rotation, no translation overlays.
