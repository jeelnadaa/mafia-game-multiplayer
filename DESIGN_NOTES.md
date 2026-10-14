# Mafia: Shadows of the City — Design Tokens & Art Direction

## 1. Aesthetic Direction: "Noir, Lit by One Lamp"

The aesthetic is built around a smoky back room in a 1930s city under a single hanging brass lamp. The entire experience adopts the unifying metaphor of **"The Case File"** — every game is an active investigation docket with classified dossiers, ink redaction bars, rubber stamps, and typewriter margin notes.

### 1.1 Color Palette & CSS Variables

| Token | CSS Variable | Hex | Semantic Role |
|---|---|---|---|
| Deep Obsidian | `--ink-950` | `#0A0B0E` | Base canvas background, shadows |
| Case Surface | `--ink-900` | `#101216` | Card surfaces, dossier folder covers |
| Charcoal Slate | `--ink-800` | `#171A20` | Raised drawer sheets, table rim |
| Hairline Border | `--line` | `#262A33` | Delicate card edges, structural dividers |
| Warm Bone | `--bone` | `#ECE6D8` | High-contrast primary typography (WCAG AAA) |
| Muted Bone | `--bone-dim` | `#A39D90` | Secondary copy, metadata, timestamps |
| Lamplight Brass | `--lamp` | `#D9A441` | Primary CTA, "Your Turn", day discussion pool |
| Lamp Glow | `--lamp-soft` | `#F0D79A` | Highlights, focus rings, subtle halos |
| Syndicate Blood | `--blood` | `#B3363B` | Mafia affiliation, elimination stamps (deep `#7E2327`) |
| Midnight Fog | `--night` | `#3E5A78` | Night operations, police intel (deep `#16222F`) |
| Town Verdigris | `--verdigris` | `#5E8C7B` | Town allegiance, Doctor medical shield |
| Jester Plum | `--plum` | `#7A5C86` | Jester affiliation (used sparingly) |

### 1.2 Phase-Driven Atmosphere Tokens

The entire application shifts mood via `document.documentElement.dataset.phase`:

```css
/* Lobby: Warm dim anticipation */
html[data-phase="lobby"] {
  --bg: #0A0B0E;
  --surface: #101216;
  --surface-2: #171A20;
  --border: #262A33;
  --accent-phase: #D9A441;
}

/* Night Operations: Cold steel-blue & deep shadows */
html[data-phase="night"] {
  --bg: #07090E;
  --surface: #0C0F17;
  --surface-2: #121824;
  --border: #1E293B;
  --accent-phase: #38BDF8;
}

/* Dawn & Day Discussion: Warm parchment & amber lamplight */
html[data-phase="day"], html[data-phase="discussion"] {
  --bg: #0C0A09;
  --surface: #141210;
  --surface-2: #1C1917;
  --border: #292524;
  --accent-phase: #F59E0B;
}

/* Town Voting: High tension amber-red */
html[data-phase="voting"] {
  --bg: #0D0707;
  --surface: #170D0D;
  --surface-2: #241414;
  --border: #3D1C1C;
  --accent-phase: #EF4444;
}

/* Game Over: Resolution docket */
html[data-phase="gameover"] {
  --bg: #0A0B0E;
  --surface: #101216;
  --surface-2: #171A20;
  --border: #262A33;
  --accent-phase: #ECE6D8;
}
```

### 1.3 Typography Pairing

1. **Custom Handcrafted Wordmark**: Inline SVG with slit-light highlight slicing horizontally through the letters, symbolizing light through Venetian blinds.
2. **Display Heading**: *Fraunces / Big Shoulders / Satoshi* (`font-bold`, uppercase, tracking-wider).
3. **Body & UI**: Clean neutral sans (*Instrument Sans / Satoshi*) with tabular figures for countdowns.
4. **Typewriter Accent**: Monospace / Typewriter (*Special Elite / JetBrains Mono*) for docket labels, case files, and tactical tips.

### 1.4 Spacing & Geometry Scale

- **Radius**: Utilitarian geometry (`rounded-none` to `rounded-sm`, 0px–2px). Cards and buttons resemble stamped paper documents and physical tokens.
- **Elevation / Shadows**: Deep, directional shadows simulating single overhead desk lamp lighting.
- **Touch Targets**: Minimum 44×44px interactive bounds on all mobile touch surfaces with `touch-action: manipulation`.

### 1.5 Motion Rules

- **Micro-interactions (UI)**: 150ms–250ms with `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out).
- **Set-piece Moments**:
  - Ink-stamp placement: 200ms scale-down with slight rotation (-4° to +4°).
  - 3D Role Card flip: 450ms `rotateY(180deg)` with `perspective: 1000px`.
  - Phase change banner: 1.5s announcement banner, then transition to persistent header indicator.
- **Reduced Motion**: Full support for `prefers-reduced-motion: reduce`. Instant state swaps, no 3D rotation, no translation overlays.
