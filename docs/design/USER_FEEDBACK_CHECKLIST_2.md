# Comprehensive UI & Logic Checklist (Round 2)

Tracking all 25 specific fixes requested by the user:

- [x] **1. TopBar Complete Removal**: Removed `<TopBar>` completely from `app/room/[code]/page.tsx` across all phases.
- [x] **2. Three-Bar Menu in Lobby -> Case Docket**: The `≡` button in Lobby now opens the "Case Docket" modal (copy room code, copy link, native share, and voice console trigger) instead of game setup.
- [x] **3. Full-Screen Game Setup**: Converted Game Setup modal into a spacious full modal (`max-w-5xl h-[92vh] max-h-[92vh]`) with noir styling and scrollable container, fixing all spacing issues.
- [x] **4. Rulebook Section Persistence**: Added `localStorage` persistence (`mafia_last_help_tab`) in `HelpSheet.tsx`. When user clicks `?`, it re-opens on the section where the user left off.
- [x] **5. Remove Mic Widget from Room Code Block**: In Lobby Card 1 (room code block), removed the inline `Mic Muted | UNMUTE | LEAVE` widget; voice controls live exclusively in the bottom-left dock.
- [x] **6. Commence Operation Modal Redesign**: Redesigned the "Commence Operation" start confirmation modal in `Lobby.tsx` to the approved noir case-file design.
- [x] **7. Bright Yellow Hover on "I Understand My Role"**: Updated hover style in `RoleReveal.tsx` to electric bright yellow (`hover:bg-[#FFEA00] hover:border-[#FFEA00] hover:shadow-[0_0_35px_rgba(255,234,0,0.9)]`).
- [x] **8. Morning Screen (`The Town Wakes`) Redesign**: Redesigned `DawnAnnouncement.tsx` into a noir Gazette dispatch card with `RubberStamp` and primary gold button.
- [x] **9. Commence New Operation (Rematch) Modal Redesign**: Redesigned rematch modal in `End.tsx` ("COMMENCE NEW OPERATION") with noir case-file tokens and gold border.
- [x] **10. Role Reveal Card Opacity**: Boosted card contrast, background parchment (`#ECE6D8` / `#171A20`), and text opacity in `RoleReveal.tsx` and `DawnAnnouncement.tsx`.
- [x] **11. Syndicate Night Kill Bug**:
  - Mafia + Godfather are resolved as ONE collective syndicate kill in `lib/engine/resolution.ts`.
  - Added Syndicate-only notification if unanimous kill fails (`channel: 'mafia'`).
  - Added explicit death cause attribution (`eliminated by a marksman bullet` vs `found eliminated`).
  - Bot Vigilantes hold fire on Night 1 (`round === 1`) to eliminate accidental multi-kills.
- [x] **12. Table Confirmation Button in Center**: Moved the confirmation button (`Confirm · [Target]`) into the center of the circular felt table in `CircleSittingArena.tsx`, removed from bottom bar.
- [x] **13. Round Timer on Table**: Added live synchronized countdown ticker to the table center and header during all phases in `CircleSittingArena.tsx`.
- [x] **14. End Screen Text Cleanup**: In `End.tsx`, removed "GAME OVER", keeping only "CASE CLOSED".
- [x] **15. Chat Button Position & Design**: Moved Syndicate/Ghost chat button to the bottom-left voice dock right next to the audio/voice console button (`Sliders`), styled with matching `w-11 h-11` noir button and indicator pip.
- [x] **16. Pawn Hover Jumping Fix**: Removed `hover:scale-110` in `CircleSittingArena.tsx`; replaced with gold outline and drop-shadow (`hover:drop-shadow-[0_0_15px_rgba(217,164,65,0.7)] [&:hover_.nm]:border-[#D9A441]`), eliminating jump/pop artifact.
- [x] **17. Full-Screen Table Background Gradient**: Removed `max-w-[1440px] mx-auto` and `calc(100vh - 60px)`, making radial background gradient extend `w-full h-screen` edge-to-edge without letterboxing.
- [x] **18. Voice Console Microphone Sensitivity & Ambience Slider**:
  - Converted VU meter into interactive 8-level sensitivity selector with clear audio gate explanation.
  - Redesigned Hold-to-Talk box and container in noir case-file aesthetic.
  - Added background ambient audio volume slider connected to `setAmbienceVolume`.
  - Renamed "AT THE TABLE" to "AT WIRE", showing ONLY connected wire peers with `#1`, `#2` numbered pips.
- [x] **19. Seated Players Roster Modal**: Added `<Users />` button in `CircleSittingArena.tsx` header opening a Table Roster modal with `#1`, `#2` numbered pips and alive/dead badges.
- [x] **20. Leave Room Modal Redesign**: Redesigned Leave Room modals in `TopBar.tsx`, `End.tsx`, and `app/room/[code]/page.tsx` with noir styling, and removed all `kbd="Esc"` / `kbd="Enter"` shortcut brackets from buttons.
- [x] **21. Universal Modal Redesign**: Audited and converted all modals (`AdvanceModal`, `BanModal`, `KickModal`, `CaseDocketModal`, `AvatarModal`, `RolePreviewModal`) to noir design tokens.
- [x] **22. Handbook All Roles Interactivity**:
  - Removed arbitrary civilian default count in `HelpSheet.tsx`.
  - Made every role card in "All Roles" clickable to open a dedicated role dossier card with an explicit close button.
- [x] **23. Night Inaction Notification**: Added clear center advisory prompt in `CircleSittingArena.tsx` when no operative is selected, explaining that no action will take place if time runs out.
- [x] **24. Custom Confirmation on Back Operations**: Wired custom noir confirmation modal on `‹` back button and browser history popstate in `app/room/[code]/page.tsx`.
- [x] **25. Testing & Verification**: Full test suite passes (77/77 tests), TypeScript check (`npx tsc --noEmit`) passes with 0 errors, and Next.js production build (`npm run build`) builds cleanly.
