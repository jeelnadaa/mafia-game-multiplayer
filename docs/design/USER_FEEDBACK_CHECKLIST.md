# Complete UI Redesign & Bug Fix Checklist

This document tracks all requested fixes and design overhauls based on the user prompt, screenshots in `fixes/`, and mockups in `Examples/`.

---

## 1. Landing Page (`app/page.tsx` & `fixes/1.png`, `fixes/2.jpg`)
- [x] **Badge/Headline update**: Changed "A GAME OF LIES · 4–12 PLAYERS" to "A GAME OF LIES · 4–20 PLAYERS" (`fixes/1.png`).
- [x] **Overhead Lamp & Table Centering**: Centered lamp cord (`w-[2px] bg-[#2a2d35]`), brass trapezoid shade (`clip-path: polygon(...)`), warm radial light cone (`rgba(217,164,65,.35)`), and green felt table onto the exact same central 990px vertical axis inside a clean `max-w-[1280px] mx-auto` container (`fixes/2.jpg`).
- [x] **Responsive Stage**: Ensured that on all desktop screen widths, the light cone and lamp are never offset from each other.

---

## 2. Lobby Screen (`components/Lobby.tsx`, `fixes/3.jpg`, `fixes/4.jpg`)
- [x] **Remove Duplicate Top Bar**: Suppressed the global `<TopBar>` when `phase === 'lobby'` in `app/room/[code]/page.tsx`, eliminating the duplicate header.
- [x] **Rulebook (?) Button**: Positioned the `?` (Rulebook) button directly next to `Invite friends` in the header bar (`fixes/3.jpg`).
- [x] **Dynamic Table Seating**: Seating strictly mirrors the joined players (`players.length`) dynamically positioned around the table ellipse; eliminated all hardcoded 7 seats and empty dashed seat placeholders.
- [x] **Dynamic Pawn Color Synchronization**:
  - `lib/useRoom.ts` fixed so host init, peer joins, and `updateProfile` synchronize `player.color` directly to the avatar persona swatch.
  - Pawn silhouette colors match `player.color` and re-render instantly on change.
- [x] **Start Game Button**: Removed "(Ctrl + Enter)" badge from the Start Game button; removed "(Shift + Enter)" from Ready button.
- [x] **Your Avatar Custom Modal**:
  - Replaced cramped horizontal avatar selector in bottom-left player card with a clean "Your avatar" trigger (`fixes/4.jpg`).
  - Clicking it opens `AvatarModal` with 12 avatar personas and matching color swatches in the approved case-file modal design.
- [x] **Fix Lock Room Button**:
  - Toggling Lock Room persists state via host action and toggles visual indicator between `LOCKED` (red border/text) and `LOCK` (neutral).

---

## 3. Universal Modal & Button Redesign (`components/ui.tsx`, `fixes/5.png`, `fixes/6.jpg`)
- [x] **Redesign `Modal` Component**:
  - Background `#101216`, border `1px solid #262A33`, shadow `0 24px 64px rgba(0,0,0,0.85)`.
  - Header with `Big Shoulders Display`, uppercase, tracked, `#ECE6D8` text with subtle gold accent.
  - Close button `.hb` (`44x44px`, border `#262A33`).
- [x] **Redesign `Button` Component**:
  - Implemented `.ob` (outline button: transparent, border `1px solid #6b6455`, color `#ECE6D8`, rounded `4px`, `Instrument Sans`).
  - Implemented primary CTA: gold `#D9A441`, dark text `#0A0B0E`, rounded `4px`, font-weight 600, hover `#F0D79A`.
  - Danger button: border `#B3363B`, text `#B3363B`, hover background `#B3363B/10`.
- [x] **Redesign Controls (`Switch`, `Stepper`, Sliders)**:
  - Noir switch with `#262A33` track and `#D9A441` thumb.
  - Steppers and cards updated with `#171A20` backgrounds and `#262A33` borders.

---

## 4. Audio & Voice Controls Redesign (`components/VoiceOverlay.tsx`, `fixes/5.png`, `fixes/6.jpg`, `Examples/Voice and sound (mobile)-html/Audio.dc.html`)
- [x] **Dock Mic Buttons**:
  - Replaced old gray buttons with clean noir buttons:
  - Join Wire: `.ob` style with `#D9A441` radio icon.
  - Muted Mic: 44px round button `⌀` in `#101216` with `#262A33` border and `#A39D90` text.
  - Live Mic: 44px round button `●` with 2px `#D9A441` border and glowing shadow.
  - Audio console launcher: `.hb` button (`44x44px`, border `#262A33`).
- [x] **Audio & Voice Console Modal (`fixes/6.jpg`)**:
  - Faithfully matched `Examples/Voice and sound (mobile)-html/Audio.dc.html`:
  - Title `VOICE & SOUND` in `Big Shoulders Display`.
  - Status banner in typewriter font `.t` (`#A39D90`).
  - 64px round live/mute status button with gold border.
  - 8-segment horizontal VU meter in `#D9A441`.
  - Push-to-talk toggle switch with key indicator and hold-to-talk strip.
  - `AT THE TABLE` participant list with circular avatar ring (`var(--c)`), name, status (`Speaking` in gold, `Muted`, `Asleep`, `GHOST` in red box).
  - `SOUND` section: Atmospheric lo-fi audio toggle with gold controls.
  - Join Wire, Unmute, and Leave buttons redesigned in `.ob` and gold CTA styles.

---

## 5. Active Game Seating Area & Phases (`CircleSittingArena.tsx`, `fixes/7.jpg`)
- [x] **Enforce Circle Sitting Always**:
  - Permanently removed linear card seating mode from game routing.
  - Removed circle sitting toggle from Lobby settings drawer and room views.
- [x] **Night Phase Table Redesign (`Examples/Night the table-html/Night.dc.html`)**:
  - Vignette background `radial-gradient(ellipse 70% 60% at 50% 45%, #13202e, #0A0D12 75%)`.
  - Elliptical poker table with `#3a3326` border and `#14201c` green felt.
  - Silhouette pawns (`.fg`, `.hd`, `.bd`) with player colors `var(--c)`.
  - Elliptical target gold ring on selected pawn + dashed SVG targeting line connecting actor to target.
  - Top header: timer ring + Big Shoulders Display phase title (`NIGHT · 2`) + role pill.
  - Narrator line: typewriter font `.t` in center ("The town goes to sleep.").
  - Bottom bar: Syndicate chat button (with red pip), Mic button, prompt ("Choose who to eliminate"), primary CTA (`Confirm · [Target]`), alive count dots.
- [x] **Day Vote Phase Table Redesign (`Examples/Day vote the accusation-html/Vote.dc.html`)**:
  - Warm vignette `radial-gradient(ellipse 70% 60% at 50% 45%, #1d1710, #0C0A08 78%)`.
  - Overhead spotlight cone angled down onto the accused player (`clip-path: polygon(...)`).
  - Eliminated player pawns tilted 78deg with red typewriter stamp: `ELIMINATED · [PHASE]`.
  - Accused player with gold target ring, stacked colored vote tokens, 64px Big Shoulders Display vote tally.
  - Bottom bar: Ghost/Syndicate chat button, mic button, vote status ("Your vote: [Target]", "Change vote", "Abstain"), alive & fallen count.
- [x] **Completely Remove Town Chat**:
  - Eliminated Town / Public chat tabs and inputs across the entire application.
  - Retained ONLY encrypted Syndicate chat (Mafia) and Ghost chat (Dead players).

---

## 6. Rulebook Overhaul (`components/HelpSheet.tsx`)
- [x] **Restyle All Tabs to Noir Dossier Aesthetic**:
  - Tab 1 (Basics): Noir cards `#171A20`, `#262A33` borders, Special Elite headers, gold icons.
  - Tab 2 (Your Role): Classified dossier card, tactical notes.
  - Tab 3 (All Roles): Case file dossiers with Big Shoulders Display role names, `#D9A441` badges, Special Elite team labels.
  - Tab 4 (House Rules): Monospace classified case file parameters.
  - Tab 5 (Investigation Log / Log): Telegram styled event transcripts.
  - Tab 6 (Field Notes): Sticky paper notes and operative suspect/trust tags.
  - Tab 7 (Keys & Etiquette): Terminal keyboard guide with typewriter captions.
- [x] **Fix Hold to Read / Release to Conceal**:
  - Removed rogue `onClick` toggle handler.
  - Bound global window release listeners so releasing pointer/mouse/touch immediately conceals secrets.

---

## 7. Role Reveal Screen (`components/RoleReveal.tsx`)
- [x] **Fix Release to Conceal**:
  - Bound global window release listeners (`pointerup`, `mouseup`, `touchend`) on press down so releasing always conceals immediately without needing to hover off.
- [x] **Hover Highlight on "I understand my role"**:
  - Added intense gold hover glow (`shadow-[0_0_30px_rgba(217,164,65,0.6)]`), border highlight, and scale transition.

---

## 8. General Polish & Verification
- [x] Harmonized color palette across all views (`#101216`, `#171A20`, `#262A33`, `#D9A441`, `#ECE6D8`).
- [x] Verified background procedural audio / ambience plays reliably.
- [x] 100% of test suites passing (`77/77 tests passed` via `node scripts/test-runner.js`).
- [x] TypeScript compiler check clean with 0 errors (`npx tsc --noEmit`).
- [x] Production build clean with 0 errors (`npm run build`).
