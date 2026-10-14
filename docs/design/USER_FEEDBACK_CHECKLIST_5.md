# Comprehensive UI & Logic Checklist (Round 5)

Tracking all fixes and enhancements requested by the user:

- [x] **1. Lobby UI Layout: Strictly Two in One Row for All Groups**:
  - Replaced the 3-column desktop layout (`lg:grid-cols-3`) with strict two-per-row grid styling (`grid-cols-1 sm:grid-cols-2 gap-3.5`) in `Lobby.tsx`.
  - Balanced all group cards across **Town Defense & Law**, **Underworld Syndicate**, **Special Rogue**, **General Rules**, and **Timers**.

- [x] **2. Background Atmospheric Audio & Settings Available on Home Page**:
  - Initialized procedural Lo-Fi jazz ambience (`initSound()`, `setPhaseAmbience('lobby')`) on `app/page.tsx`.
  - Added a top-right audio toolbar dock containing a **Quick Mute/Unmute** toggle and an **Audio Settings** button.
  - Implemented the **Noir Audio & Ambience Console** modal on the home page with Master Sound toggle, Background Ambience Volume slider, Sound Effects (SFX) Volume slider, and interactive sound test cue.

- [x] **3. Room-Scoped Voice Channel Isolation**:
  - Added room lifecycle management in `VoiceEngine` (`currentRoomCode`, `setRoom()`, `leaveRoom()`, `clearAllPeers()`).
  - Added metadata `{ roomCode: roomCode.toUpperCase() }` to all outgoing WebRTC peer calls.
  - Reject incoming peer calls in `useRoom.ts` if caller's room code does not match the local room.
  - Filter incoming audio streams in `addPeerStream()` to drop any foreign room streams.
  - Purge and silence all peer audio streams immediately upon room exit or room switch.

- [x] **4. Disconnected Syndicate Members Excluded from Vote Consensus**:
  - In `lib/engine/phases.ts` (`resolveNight`), filtered `connectedMafia = aliveMafia.filter(p => p.connected !== false)`.
  - If a syndicate member disconnects, `votingMafia` automatically resolves over the remaining connected members.
  - In **unanimous** kill mode, unanimous agreement is computed over remaining active operatives, ensuring a disconnected player does not block or spoil the kill.
  - In **majority** and **random** kill modes, disconnected players are omitted from the target count.
  - `getActiveRolePlayers` and `tryAdvanceNightHelper` ignore disconnected operatives so early night progression is never blocked.

- [x] **5. Push-to-Talk (PTT) Key Overlay Indicator Fix**:
  - Resolved listener cleanup race condition where `isPttActive` in dependency array triggered immediate cleanup calling `voiceEngine.setPttActive(false)` while the key was pressed.
  - Ref-guarded `startPtt` and `stopPtt` callbacks with stable references.
  - Added mouse pointer down/up/leave and touch start/end/cancel handlers for mobile and desktop hold buttons.
  - Synchronized PTT state immediately with `voiceEngine.notify()` for zero-lag transmission.
  - Persisted user PTT preference in `localStorage` (`mafia_voice_ptt_enabled`).

- [x] **6. Voice-Level & Sensitivity-Calibrated Green Overlay Glow**:
  - Measured continuous vocal frequency energy (100 Hz - 3500 Hz) in `getSpeechMetrics()` relative to the microphone sensitivity gate (`thresholdValue`).
  - Implemented `getVoiceGlowStyle()` with 4 responsive visual tiers:
    - **No Voice**: No green (neutral subtle border, zero glow).
    - **Low Voice**: Light green (`#86EFAC` soft mint, subtle 6px aura).
    - **Normal Voice**: Medium green (`#2ED573` emerald, vibrant 12px aura).
    - **Loud / Strong Voice**: Hard neon green (`#00FF66` electric neon, intense 24px-30px aura).
  - Adjusting the microphone sensitivity slider shifts the gate threshold and recalculates the green hue response.
  - Applied across on-screen Discord-style HUD, Audio Console AT WIRE list, bottom dock mic PTT button, and circular arena pawn heads.

- [x] **7. Verification & Full Test Suite Pass**:
  - TypeScript validation: 100% pass (`node ./node_modules/typescript/bin/tsc --noEmit`).
  - Unit tests: 92/92 tests passed with zero failures (`node scripts/test-runner.js`).
