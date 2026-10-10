# Architectural Decisions & Specifications

### 1. Host-as-Server WebRTC Peer-to-Peer
- **Choice**: The host's browser acts as the authoritative game server using WebRTC data channels via PeerJS.
- **Rationale**: Zero external backend infrastructure or subscriptions required (no Socket.io server, Redis, Pusher, or database). Deployable statically on Vercel.
- **Trade-off**: The host tab must stay open for the room to remain active. Documented transparently with Screen Wake Lock and `beforeunload` protections.

### 2. High-Performance Procedural Audio Synthesis
- **Choice**: Web Audio API oscillator synthesis in `lib/sfx.ts` (< 65 lines).
- **Rationale**: Zero external `.mp3` or `.wav` audio files to fetch or host. Sounds (night bell, dawn chime, gavel strike, gunshot, countdown tick, victory fanfare) are synthesized procedurally in real time.

### 3. Procedural Vector Noir Art Assets
- **Choice**: High-contrast noir vector illustrations generated via `sharp` in `scripts/process-assets.mjs`.
- **Rationale**: Extremely lightweight (all assets combined < 500 KB), crisp on 4K retina displays, zero external asset dependencies.

### 4. Consolidated Component & Architecture Budget
- **Choice**: Capped at < 28 source files and < 4,200 lines total.
- **Execution**:
  - `components/ui.tsx`: All primitives (`Button`, `Card`, `Modal`, `Sheet`, `Chip`, `Badge`, `Switch`, `Stepper`, `Kbd`, `Avatar`, `CountdownRing`).
  - `components/TargetPicker.tsx`: Handles all night targeting and day voting.
  - `components/HelpSheet.tsx`: Single component for all role info, game rules, log, private detective notes, and keyboard shortcuts.
  - `lib/content.ts` & `lib/settings.ts`: Single source of truth driving all text, roles, settings, and UI rendering.
