# Comprehensive UI & Logic Checklist (Round 3)

Tracking all fixes and enhancements requested by the user:

- [x] **1. Saveable Custom Setups & Persistence**:
  - Allow user to name and save custom role configurations (persisted in `localStorage`).
  - Display saved custom preset name in the deck box / preset selector.
  - Persist last-selected preset / setup so new rooms automatically load with it.
- [x] **2. Play Again Button Text**:
  - In `End.tsx`, change text from "Play again keep room" to "Play again".
- [x] **3. Exit / Leave Room Modal Redesign**:
  - Update all exit/leave room modals to the new noir design (`#101216` / `#171A20`, gold border, `Big Shoulders Display`, `Instrument Sans`, no blue tint, no shortcut hints).
- [x] **4. Center Confirmation for Every Role & Voting**:
  - When tapping an operative during Day/Voting or Night, always show the big confirmation button in the center of the table with cancel option before submitting action/vote.
- [x] **5. Blue Tint Removal Across All Screens & Modals**:
  - Remove all blue/navy tints (`#13202e`, `rgb(19, 32, 46)`, slate blue backdrops) from modals and backgrounds.
  - Standardize to deep warm noir charcoal / black shades (`#0A0B0E`, `#101216`, `#171A20`, `bg-black/90`).
- [x] **6. Host Selects Any Player as Narrator (Moderator)**:
  - Host can designate any connected player (not only self) as Narrator / God.
  - Transfer narrator authority cleanly in lobby.
- [x] **7. Narrator Role Assignment Workflow & Rules**:
  - Narrator manually assigns roles before match starts when live narrator mode is active.
  - Narrator can ONLY assign the exact roles configured in the match setup (e.g. if 2 Mafia configured, exactly 2 Mafia must be assigned).
  - Validation modal if config is invalid (e.g., syndicate >= town or count mismatch).
  - Remove time limits during narrator assignment.
  - Show waiting screen to regular players: *"Narrator is assigning classified dossiers..."* in new noir design.
  - On narrator confirmation, transition all players to Role Reveal.
- [x] **8. Narrator (God Mode) Screen Redesign**:
  - Overhaul `God.tsx` to the new noir case-file aesthetic (`Big Shoulders Display`, `#101216`, `#D9A441`).
  - Narrator and eliminated players act as full spectators who can see circle table events without transmitting town audio.
- [x] **9. Role Reveal Screen Redesign (Attached Screenshot)**:
  - Redesign `RoleReveal.tsx` from old serif/courier/blue-tinted styling into the approved noir case-file design:
    - Typography: `Big Shoulders Display` for headers, `Instrument Sans` / `Special Elite` for subtitles.
    - Colors: `#0A0B0E` background (no blue tint), manila folder dossier with classified stamps.
    - High contrast text and bright electric yellow hover button.
- [x] **10. Verification & Build**:
  - Run test runner (`node scripts/test-runner.js`), TypeScript check (`npx tsc --noEmit`), and Next.js build (`npm run build`).
