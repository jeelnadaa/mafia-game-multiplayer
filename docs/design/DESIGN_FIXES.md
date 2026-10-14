# Design Fixes & Accessibility Audits (Examples/ Mockups -> Production)

*Record of all fixes applied to the `Examples/` mockups per Part 3 of the Design Replication Specification.*

## 1. Summary of Identified Issues & Production Fixes

| Issue ID | Area | Mockup Flaw | Production Fix | Rationale / Standard |
|---|---|---|---|---|
| **FIX-01** | Contrast | Muted color `#6b6455` on dark background falls below 3:1/4.5:1 WCAG AA. | Lightened to `#8c8473` (non-text) and `#A39D90` (text) on dark surfaces. | WCAG 2.1 AA compliance (≥ 4.5:1 text, ≥ 3:1 UI borders). |
| **FIX-02** | Text Size | 11px micro-text (`HOST` tag, tab numbers, typewriter captions). | Scaled all micro-text to a minimum of 12px (body text ≥ 16px on mobile, input 16px to prevent iOS auto-zoom). | Mobile readability and prevention of forced iOS browser viewport zoom. |
| **FIX-03** | Color-Only | Syndicate teammate red dot `●`, vote tokens, ready dots relied on color alone. | Added semantic text and icons: "Syndicate" tag, voter initials/names, and accessible "Ready"/"Not ready" announcements. | Accessibility for colorblind players (Deuteranopia, Protanopia). |
| **FIX-04** | Controls | Mockup controls built with generic `<div>`/`<span>` tags. | Replaced with semantic HTML: `<button>`, `<input type="range">`, `role="tablist"`/`tab`/`tabpanel`, `role="switch"`. | Keyboard navigation, screen-reader compatibility (`axe` audit). |
| **FIX-05** | Icons | Text-glyph placeholders (`‹`, `≡`, `×`, `●`, `⌀`). | Replaced with uniform 1.5px/2px stroke Lucide SVGs (ChevronLeft, Menu, X, Mic, MicOff, Radio). | Crisp high-DPI rendering, eliminates OS font glyph divergence. |
| **FIX-06** | States | Missing `:hover`, `:active`, `:focus-visible`, disabled-with-reason, and error states. | Created explicit states with lamp-colored focus rings (`outline: 2px solid var(--lamp)`), active scale, and hover glows. | Visual feedback for interactive controls. |
| **FIX-07** | Motion | Static mockups lacked transition/animation specifications. | Implemented 150-300ms micro-animations with full `@media (prefers-reduced-motion: reduce)` fallbacks. | Accessibility for motion sensitivity. |
| **FIX-08** | Fluidity | Fixed 1280px / 390px absolute coordinates. | Implemented fluid flex, grid, and `clamp()` typography scaling from 360px up to 2560px ultra-wide screens. | Cross-device responsiveness without horizontal scroll or clipping. |
| **FIX-09** | Wordmark | Separate overlapping div slit in mockup that did not align across screen sizes. | Built inline SVG `MafiaWordmark` with letterform mask and slit cut directly into the vector paths. | Scalable, pixel-perfect logo with `role="img"` and `aria-label`. |
| **FIX-10** | Light Math | Cones and spotlights hand-placed by eye for 6 static coordinates. | Computed spotlight polygons and dashed target lines dynamically from mathematical seat percentages `getSeatPositions(n)`. | Adapts light accurately for 4 to 12 players across any aspect ratio. |
| **FIX-11** | Redaction | Mockup redaction bars were visual-only CSS rectangles over text. | Redaction shield unmounts secret text from DOM until hold gesture is active; snap-redacts on blur/pointer leave. | Zero DOM leaks of classified roles to shoulder-surfers or inspector. |
| **FIX-12** | Emblems | Mockup only included Mafia fedora emblem. | Hand-crafted full custom vector SVG emblem set for Godfather, Doctor, Police, Vigilante, Jester, Civilian. | Stylistic consistency across all roles in the game. |
| **FIX-13** | Avatars | Generic CSS silhouettes with colored rings. | Enhanced 12-avatar collection with high-contrast noir portraits while preserving the colored ring and seat number pip. | Visual depth while retaining unique per-player identity. |
| **FIX-14** | Fallen State | Mockup rotated figure and floated stamp that could collide with adjacent seats. | Anchored fallen state within seat container: desaturated figure, strikethrough nameplate, stamped ELIMINATED overlay. | Clean visual hierarchy at high player counts (8-12 seats). |
| **FIX-15** | Magic Nums | Inline style blobs and hardcoded coordinates in mockups. | Refactored into CSS design tokens (`--ink-950`, `--lamp`, `--bone`, etc.) and reusable design-system components. | Maintainability and strict brand adherence. |
| **FIX-16** | Performance | Heavy multi-stop gradient blurs causing mobile frame drops. | Optimized lighting layers using CSS opacity/transform and radial gradients targeting 60 fps on throttled mobile CPUs. | Performance budgets and smooth animations. |
