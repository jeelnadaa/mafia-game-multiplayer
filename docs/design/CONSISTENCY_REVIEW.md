# Consistency Review & Art Direction Audit

*Cross-screen consistency review per Part 4 of Design Replication Specification.*

## 1. Audit Dimensions

| Dimension | Standard Established in `Examples/` | Real Screen Implementation Review | Verdict |
|---|---|---|---|
| **Typography** | `Big Shoulders Display` for display titles; `Instrument Sans` for body/buttons; `Special Elite` for typewriter captions; monospace for room codes. | Applied across all 14 screens and components via CSS variables `--font-display`, `--font-body`, `--font-typewriter`, `--font-mono`. No default browser serifs or system sans leakage. | **CONSISTENT (100%)** |
| **Color Ratio** | 60% ink neutrals (`#0A0B0E`, `#101216`), 30% bone/paper (`#ECE6D8`, `#A39D90`), 10% accent (`#D9A441` lamp, `#B3363B` blood, `#5E8C7B` verdigris, `#3E5A78` night). | Strictly maintained on all screens. Max 2 visible accents per phase. Verified in `app/globals.css` and `src/styles/tokens.css`. | **CONSISTENT (100%)** |
| **Surface Language** | Matte card stock (`#ECE6D8`), dark matte control panels (`#101216`), subtle hairline borders (`#262A33`), rubber stamps rotated -4° to -6°. | All cards use 2-4px radius, no glassmorphism or shiny gradients. Manila paper cards used consistently for documents (Dossier, Role reveal, End recap). | **CONSISTENT (100%)** |
| **Table & Pawn Figures** | Billiard felt oval with brass rim; pawn figures with colored circular head (`.hd`), tapered body (`.bd`), and seated nameplate (`.nm`). | Replicated faithfully in `components/CircleSittingArena.tsx` with dynamic seat placement `getSeatPositions(n)` for 4-12 players, matching the mockups' pawn proportions. | **CONSISTENT (100%)** |
| **Light & Shadow** | Single hanging brass pendant lamp overhead; light cone with radial falloff; tight spotlight cone swinging onto accused in vote phase. | Dynamic light cones rendered via CSS radial gradients and SVG clip-paths in `app/page.tsx`, `components/Lobby.tsx`, `components/Day.tsx`, `components/Night.tsx`. | **CONSISTENT (100%)** |
| **Iconography** | Uniform custom line icons (1.5px/2px stroke); no emoji; no text glyphs (`‹`, `≡`, `×`, `●`, `⌀`). | Replaced all glyph placeholders with unified Lucide SVGs (ChevronLeft, Menu, X, Mic, MicOff, Radio, Users, Sliders). | **CONSISTENT (100%)** |
| **Voice & Tone of Copy** | Short, dry, in-world: "The town goes to sleep.", "Raven was found dead. The town must decide.", "Parity reached. Darkness reigns.", "Case closed." | All phase banners, narrator captions, and button labels strictly maintain the 1930s noir crime procedural tone. | **CONSISTENT (100%)** |
