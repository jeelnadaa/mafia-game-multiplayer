# Art Bible: Mafia — Shadows of the City

*Maintained per Section 2 & 2.4 of `UI_OVERHAUL_PROMPT.md`.*

---

## 1. Visual Identity & Mood

- **Core Concept**: "Noir, lit by one lamp" — A smoky back room in a 1930s city. Almost everything rests in deep shadow; pools of warm brass light tell the player where to look.
- **Unifying Metaphor**: "The Case File" — Every match is an unsolved crime folder: classified dossiers, black ink redaction bars, rubber stamps, typewriter margin notes, and brass fittings.
- **Tone**: Quiet confidence, atmospheric tension, tactile restraint. Like an indie classic or a mastercrafted board game box, never a SaaS developer dashboard and never a neon cyberpunk site.

---

## 2. Palette & Design Tokens

| Token | Hex | Semantic Role |
|---|---|---|
| `--ink-950` | `#0A0B0E` | Page background, obsidian void |
| `--ink-900` | `#101216` | Card surfaces, dossier folder covers |
| `--ink-800` | `#171A20` | Raised panels, drawer sheets, table borders |
| `--line` | `#262A33` | Hairlines, table rim, dividers |
| `--bone` | `#ECE6D8` | Primary warm off-white typography (WCAG AAA) |
| `--bone-dim` | `#A39D90` | Secondary copy, metadata, timestamps |
| `--lamp` | `#D9A441` | Warm brass lamplight: primary CTA, "Your Turn", day mood |
| `--lamp-soft` | `#F0D79A` | Highlights, focus rings, subtle lamp halo |
| `--blood` | `#B3363B` | Mafia affiliation, danger, elimination stamps (deep `#7E2327`) |
| `--night` | `#3E5A78` | Night ambience, Detective investigation (deep `#16222F`) |
| `--verdigris` | `#5E8C7B` | Town, protection, Doctor affiliation |
| `--plum` | `#7A5C86` | Jester affiliation (used very sparingly) |

### Color Balance (60 / 30 / 10 Rule)
- **60%**: Ink neutrals (`--ink-950`, `--ink-900`, `--ink-800`).
- **30%**: Bone typography and hairline boundaries (`--bone`, `--bone-dim`, `--line`).
- **10%**: Focused accent (`--lamp`, `--blood`, or `--night`). At most two accent hues visible simultaneously on any screen.

---

## 3. Lighting & Surface Rules

- **Single Light Source**: An overhead brass lamp illuminates the table. Surfaces fall off into deep darkness via soft radial gradients.
- **Matte Textures**: No glossy plastic, no high-specular glassmorphism. Surfaces emulate heavy cardstock, pressed leather, and vintage felt.
- **Rubber Stamp Motif**: Official statuses ("ELIMINATED", "SURVIVED", "SAVED") appear as inked stamps rotated slightly (-4° to -8°) with distressed borders.
- **Classified Redactions**: Private dossier elements are covered with solid black ink redaction bars that slide away while held.

---

## 4. Banned List (Zero Tolerance for AI Slop)

- NO neon cyan/magenta glows or rainbow borders.
- NO purple-to-blue gradient fills.
- NO emoji icons (only custom SVG line icons).
- NO generic tech jargon ("DTLS", "Mesh", "Wire", "Protocol") in player UI.
- NO floating decorative particles or sparkles without meaning.
- NO identical generic rounded-xl cards with drop-shadows.

---

## 5. Style Preamble for Asset Generation

```
Art style: 1930s film-noir aesthetic, high-contrast chiaroscuro, single overhead warm tungsten lamp lighting, deep shadows, matte paper and aged cardstock textures, muted restrained palette of obsidian #0A0B0E, warm off-white #ECE6D8, brass amber #D9A441, deep crimson #7E2327. No neon, no gradients, no modern plastic textures, no text.
```
