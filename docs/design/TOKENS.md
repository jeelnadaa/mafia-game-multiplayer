# Design Tokens Specification

*Extracted directly from approved artboards in `Examples/` per Part 1 of Design Replication Specification.*

## 1. Palette Tokens

| Token | Value | Source in `Examples/` | Semantic Use |
|---|---|---|---|
| `--ink-950` | `#0A0B0E` | `Main.dc.html`, `Lobby.dc.html` | Page background, darkest shadows |
| `--ink-900` | `#101216` | `Lobby.dc.html`, `Rulebook.dc.html` | Panel surfaces, drawers, cards |
| `--ink-800` | `#171A20` | `Audio.dc.html`, `Main.dc.html` | Raised card surfaces, mic controls |
| `--line` | `#262A33` | All artboards | Hairline card borders and dividers |
| `--line-muted` | `#6b6455` | `Lobby.dc.html`, `Vote.dc.html` | Secondary outline button borders |
| `--bone` | `#ECE6D8` | All artboards | Primary readable text, paper card stock |
| `--bone-dim` | `#A39D90` | All artboards | Secondary labels, captions, unread pips |
| `--lamp` | `#D9A441` | All artboards | Primary brass CTA, overhead lamp shade, active accent |
| `--lamp-soft` | `#F0D79A` | `Vote.dc.html` | Accused spotlight polygon, leading vote count |
| `--blood` | `#B3363B` | `Vote.dc.html`, `Reveal.dc.html` | Elimination stamps, syndicate tags |
| `--blood-bright`| `#C2373D` | `Over.dc.html` | Headline syndicate red |
| `--blood-deep` | `#7E2327` | `Reveal.dc.html`, `Over.dc.html` | Mafia card title, classified stamp |
| `--night` | `#3E5A78` | `Night.dc.html` | Night phase timer arc, police identity |
| `--night-steel` | `#5B7A99` | `Night.dc.html`, `Over.dc.html` | Police card top border |
| `--night-deep` | `#13202e` | `Night.dc.html`, `Audio.dc.html` | Night vignette background center |
| `--verdigris` | `#5E8C7B` | `Over.dc.html`, `Reveal.dc.html` | Town victory, civilian/doctor identity |
| `--verdigris-deep`| `#3d6657` | `Over.dc.html` | Doctor & Civilian card titles |
| `--paper-dim` | `#E4DCC4` | `Rulebook.dc.html` | Tactical notes paper slips |
| `--paper-aged` | `#cfc8b8` | `Over.dc.html` | Eliminated player card stock |
| `--paper-ink` | `#15130f` | `Reveal.dc.html`, `Over.dc.html` | Ink text on paper dossier cards |

---

## 2. Typography Tokens

| Family Token | Value | Applied Classes | Use Case |
|---|---|---|---|
| `--font-display` | `"Big Shoulders Display", Impact, sans-serif` | `.d`, `.font-display` | MAFIA wordmark, Phase titles (`NIGHT · 2`, `VOTE · DAY 2`), giant verdicts, role names on cards |
| `--font-body` | `"Instrument Sans", system-ui, sans-serif` | `.b`, `.font-body`, `.font-sans` | Body text, buttons, dialogue options, inputs |
| `--font-typewriter`| `"Special Elite", monospace` | `.t`, `.font-typewriter` | Narrator caption line, rubber stamps, room subheads, tactical notes, dossier tags |
| `--font-mono` | `ui-monospace, Menlo, monospace` | `.font-mono` | Room codes, numerical timers |

---

## 3. Structural Geometry & Signature Components

1. **Hanging Brass Pendant Lamp**:
   - Cord: `width: 2px; height: 96px..118px; background: #2a2d35`
   - Shade: `width: 80px; height: 36px; background: #D9A441; clip-path: polygon(22% 0, 78% 0, 100% 100%, 0 100%)`
   - Light Cone: `radial-gradient(ellipse 60% 70% at 50% 0%, rgba(217,164,65,.24), transparent 70%)`

2. **Pawn Figures (`.fg`)**:
   - Head (`.hd`): `30px × 30px`, circular, colored with player's unique pin color (`var(--c)`)
   - Body (`.bd`): `54px × 62px`, tapered capsule `border-radius: 50% 50% 8px 8px / 60% 60% 8px 8px`, gradient `linear-gradient(90deg, var(--c), #0d0f13 130%)`
   - Nameplate (`.nm`): `padding: 2px 9px; font-size: 14px; background: rgba(10,11,14,.88); border-radius: 3px; color: #ECE6D8`
   - Ready Pip: `8px × 8px` circle, filled `#D9A441` with `box-shadow: 0 0 10px #D9A441` (unready = `border: 1px solid #6b6455`)

3. **Billiard Felt Table**:
   - Border: `5px..6px solid #6b5426` (Lobby) / `#3a3326` (Night) / `#4a3d22` (Day Vote)
   - Baize Fill: `radial-gradient(ellipse at 50% 25..30%, #1d2c26, #0b1210 72..75%)`

4. **Paper Case File Cards**:
   - Roster Card: `width: 220px; height: 260px; background: #ECE6D8; color: #15130f; border-top: 6px solid <role-color>; border-radius: 4px; box-shadow: 0 20px 50px rgba(0,0,0,.5)`
   - Classified Card: `width: 300px; height: 480px; transform: rotate(-1.5deg); box-shadow: 0 30px 80px rgba(0,0,0,.65)`
   - Rubber Stamp: `border: 2px solid; padding: 2px 8px; transform: rotate(-4deg..-6deg)`
