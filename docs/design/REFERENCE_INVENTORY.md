# Reference Inventory: Mafia Mockups & Screen Mappings

*Catalog of approved artboards in `Examples/` per Part 1 of Design Replication Specification.*

## 1. Inventory Summary

| Artboard ID | Folder in `Examples/` | Source File | Native Size | Target Screen & Component | Key Elements & Mood |
|---|---|---|---|---|---|
| **REF-01** | `Landing-html` | `Main.dc.html` | 1280 × 760 (Desktop) | `app/page.tsx` (Landing / Home) | Hanging brass pendant lamp, amber cone, slit `MAFIA` wordmark, alias input, 6-pin avatar row, Create / Join room inputs. |
| **REF-02** | `Lobby the back room-html` | `Lobby.dc.html` | 1280 × 760 (Desktop) | `components/Lobby.tsx` (Briefing Room) | "THE BACK ROOM", mono room code card (`55WG6`), Deck summary card, center felt table with 6 pawn figures, ready lamps, dashed empty seats, start status. |
| **REF-03** | `Role reveal (mobile)-html` | `Reveal.dc.html` | 390 × 844 (Mobile) | `components/RoleReveal.tsx` (Role Reveal) | Tilted paper dossier card (-1.5°), `CLASSIFIED` stamp, Fedora emblem SVG, giant role title, syndicate associates pips, `I understand my role` CTA, ready pips. |
| **REF-04** | `Night the table-html` | `Night.dc.html` | 1280 × 760 (Desktop) | `components/Night.tsx`, `components/CircleSittingArena.tsx` (Night Phase) | Cool `#13202e` vignette, dashed target line to `Nova · target`, teammate indicator dot, typewriter narrator line, top HUD with timer ring, bottom action bar with `Confirm · Nova`. |
| **REF-05** | `Day vote the accusation-html` | `Vote.dc.html` | 1280 × 760 (Desktop) | `components/Day.tsx`, `components/CircleSittingArena.tsx` (Day Discussion & Vote) | Spotlight light cone polygon on accused (`Cipher`), fallen player (`Raven`) tilted 78° with `ELIMINATED · N2` stamp, stacked colored vote tokens, big vote tally `3`, bottom vote bar. |
| **REF-06** | `Rulebook your role-html` | `Rulebook.dc.html` | 1280 × 760 (Desktop) | `components/HelpSheet.tsx` (Rulebook Drawer) | 540px right drawer, header live timer chip `Now: Night 1 · 0:34`, 5 tabs (`Basics`, `Your Role 2`, `All Roles`, `House Rules`, `Case Log`), paper card with black redaction ink bars, 3 rotated paper tactical notes. |
| **REF-07** | `Voice and sound (mobile)-html` | `Audio.dc.html` | 390 × 844 (Mobile) | `components/VoiceOverlay.tsx` (Audio Console) | Bottom sheet with handle, phase status line, big `LIVE` mic button with segmented VU meter, push-to-talk toggle, table participant status (speaking/muted/asleep/ghost), Effects & Ambience sliders. |
| **REF-08** | `Game over case closed-html` | `Over.dc.html` | 1280 × 760 (Desktop) | `components/End.tsx` (Case Closed Ceremony) | Crimson victory glow, `CASE CLOSED · ROUND 2`, giant `THE SYNDICATE WINS`, 4 revealed paper cards (220×260px) with stamps (`SURVIVED`, `ELIMINATED · R1/R2`), stamped citations line, dominant `Play again · keep room` CTA. |

---

## 2. Shared Stylistic Foundation Extracted from Source Files

All 8 artboards share a uniform set of design tokens:
- **Display Typography**: `"Big Shoulders Display", Impact, sans-serif` (`.d`)
- **Body & Controls**: `"Instrument Sans", system-ui, sans-serif` (`.b`)
- **Typewriter Labels & Notes**: `"Special Elite", monospace` (`.t`)
- **Code & Numbers**: `ui-monospace, Menlo, monospace`
- **Pawn Figures**:
  - Head: `.hd { width: 30px; height: 30px; border-radius: 50%; background: var(--c); }`
  - Body: `.bd { width: 54px; height: 62px; margin: -4px auto 0; border-radius: 50% 50% 8px 8px/60% 60% 8px 8px; background: linear-gradient(90deg, var(--c), #0d0f13 130%); }`
  - Name Plate: `.nm { display: inline-block; margin-top: 6px; padding: 2px 9px; background: rgba(10,11,14,.78); border-radius: 3px; font-size: 14px; color: #ECE6D8; white-space: nowrap; }`
- **Billiard Felt Table**:
  - `border-radius: 50%; border: 6px solid #6b5426; background: radial-gradient(ellipse at 50% 25%, #1d2c26, #0b1210 72%);`
- **Hanging Pendant Lamp**:
  - Cord: `width: 2px; background: #2a2d35;`
  - Lamp Shade: `width: 80px; height: 36px; background: #D9A441; clip-path: polygon(22% 0, 78% 0, 100% 100%, 0 100%);`
  - Light Cone: `background: radial-gradient(ellipse 60% 70% at 50% 0%, rgba(217,164,65,.24), transparent 70%);`
