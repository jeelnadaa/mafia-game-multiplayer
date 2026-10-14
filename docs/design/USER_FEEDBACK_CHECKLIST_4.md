# Comprehensive UI & Logic Checklist (Round 4)

Tracking all fixes and enhancements requested by the user:

- [x] **1. Game Setup (Host Settings) Modal Redesign**:
  - Overhauled tabs ("ROLES DECK", "RULES & TIMERS", "COMMS WIRE", "HOST TOOLS") into new noir style (`Big Shoulders Display`, gold active indicator `#D9A441`).
  - Redesigned Composition breakdown bar and stats counter (`Special Elite`, red/gold meter).
  - Modernized preset pills (`Classic`, `Bare Bones`, `Detective's Game`, etc.) and `SUGGEST BALANCED` / `+ SAVE SETUP` buttons.
  - Redesigned role cards (Mafia, Godfather, Doctor, Police, Vigilante, Jester): dark noir `#101216` background, `#262A33` borders, custom gold toggle switches and steppers.
  - Eliminated all default system sans and blue tones.

- [x] **2. Center Confirmation for Every Role & Interaction**:
  - Ensured NO action or vote is submitted until the user explicitly clicks the center "Confirm" button.
  - Updated `CircleSittingArena.tsx`, `Day.tsx`, and `Night.tsx` so seat or candidate selection only stages a `pendingTargetId`, and only the center confirmation button dispatches the intent.

- [x] **3. Timer Consolidation & Restyling**:
  - Removed duplicate digital box timer (`0:13`).
  - Kept ONLY the circular progress ring timer.
  - Made the circle timer bigger (56px), styled it with the noir gold palette (`d text-xl text-[#D9A441]`), and positioned it to the right of the phase title (`NIGHT · 1`, `DAY · 1`, `VOTE · 1`).

- [x] **4. Fluid Animations Everywhere**:
  - Added smooth screen transitions with Framer Motion (`AnimatePresence mode="wait"` and `motion.div`).
  - In `DawnAnnouncement.tsx`, sequential staggered entrance animations (emblem -> title -> casualties -> doctors saves -> CTA button) running smoothly from top to bottom.
  - Added fluid animations to the center table and interactive elements.

- [x] **5. Move "Ready to Vote" Button**:
  - Shifted the "Ready to Vote" button to the right (`ml-6 sm:ml-12`) for optimal balance with table controls.

- [x] **6. "Case Closed" Badge Persistence & Typography**:
  - Replaced the small legacy hover toast with persisted on-screen typography matching "THE BACK ROOM" (`d text-2xl sm:text-4xl font-extrabold tracking-[6px] uppercase text-[#D9A441]`).
  - Persists visibly on screen during end/recap states.

- [x] **7. Remove Legacy Floating Popups**:
  - Removed the old floating hover popup (`phaseBanner` at `top-16`) entirely.
  - Replaced with on-screen headings and the cinematic transition overlay.

- [x] **8. Fix Rulebook Modal (Screenshot 3)**:
  - Fixed empty/black content area in `HelpSheet.tsx` by implementing `VALID_TABS`, `normalizeHelpTab`, and guaranteed fallback to `'basics'`.
  - Persisted the last opened rulebook tab in `localStorage` (`mafia_last_help_tab`).
  - Styled all tab sections in high-contrast noir case-docket design.

- [x] **9. Atmospheric Phase Transition Overlay**:
  - Added animated atmospheric transition overlay with title, classified dispatch badge, and pulsing gold line (e.g., "TRANSITIONING TO NIGHT 1...", "TRANSITIONING TO DAY 1 DELIBERATION...", "TRANSITIONING TO TOWN VOTING...").

- [x] **10. Rematch Narrator Re-Assignment**:
  - In `useRoom.ts` (`case 'rematch'`), when live Narrator mode is active, the game resets directly to `narratorAssign` with roles cleared so the Narrator immediately chooses roles again.

- [x] **11. Strictly Enforce Only 1 Narrator**:
  - Allowed only 1 player to be designated as Narrator in `setGod` and `rematch`.
  - Designating a new narrator immediately unsets narrator status for anyone else.

- [x] **12. Click-to-Copy Room Code**:
  - Clicking the large room code in the lobby copies it to clipboard with instant tactile feedback (`COPIED ✓` badge).

- [x] **13. Codebase Thorough Review & Suggestions**:
  - Comprehensive audit performed on architecture, state synchronization, voice mesh, and UX with concrete improvement roadmap provided.

- [x] **14. Verification & Build**:
  - Unit tests: 77/77 tests passed (`node scripts/test-runner.js`).
  - Typecheck: complete pass (`cmd /c npx tsc --noEmit`).
  - Production build: complete pass (`cmd /c npm run build`).
