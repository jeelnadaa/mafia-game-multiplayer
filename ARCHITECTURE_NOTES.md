# Architecture Notes: Mafia — Shadows of the City

*Audited & documented on October 14, 2026 as mandated by Implementation & Audit Spec Section 0.2.*

---

## 1. Stack & Environment
- **Framework**: Next.js 16.4.0 (App Router: `app/page.tsx`, `app/room/[code]/page.tsx`, `app/layout.tsx`).
- **Bundler**: Webpack (invoked via `node ./scripts/run-next.js build --webpack` to handle exFAT filesystem locks on Windows D: drive).
- **Language**: TypeScript 5.7.3 (`tsconfig.json`), React 18.3.1 (`package.json`).
- **Package Manager**: npm with `package-lock.json`.
- **Node Version**: v24.21.0.

---

## 2. WebRTC Establishment, Signaling & ICE Configuration
- **Library**: [PeerJS](https://peerjs.com/) (`peerjs: ^1.5.4`), loaded dynamically on client via `import('peerjs')` in `lib/useRoom.ts`.
- **Signaling Mechanism**:
  - PeerJS default cloud signaling broker (`0.peerjs.com`, port 443, secure WSS/HTTPS).
  - Host peer registers with deterministic peer ID `mafia-v1-${roomCode}` (`lib/useRoom.ts:703`).
  - Connecting clients connect to `mafia-v1-${roomCode}` with `{ reliable: true }` data channel options (`lib/useRoom.ts:903`).
- **ICE Server Configuration (STUN / TURN)**:
  - Currently uses PeerJS defaults: Google Public STUN (`stun:stun.l.google.com:19302`).
  - **Identified Gap (Issue 1.3)**: No TURN servers currently configured. Symmetric NAT / mobile carrier CGNAT (common across Indian mobile operators like Jio/Airtel) causes silent connection hang without relay fallback.

---

## 3. Network Topology & State Authority
- **Topology**: Host-as-Hub (Star topology).
  - Every client connects strictly to the host peer.
  - Clients do not mesh with one another directly.
- **Authority**:
  - The Host's browser is 100% authoritative for game state (phase transitions, timer ticks, vote tallying, night resolutions, role assignments, and win conditions).
  - Host runs an inline Web Worker tick (`createTickWorker` in `lib/net.ts`) firing every 250ms, driving `maybeAdvance(state, now)` in `lib/engine/phases.ts`.
- **Role Storage & Information Hiding**:
  - True roles reside solely in the host's `hostStateRef.current` (`GameState`).
  - Non-host peers **never** receive the full `GameState`. The host executes `buildViewFor(state, observerId, now)` (`lib/engine/view.ts`) per client connection before transmitting.
  - In `buildViewFor`, `p.role` is stripped (`undefined`) unless:
    1. The observer is viewing their own player card (`p.id === observerId`).
    2. The observer is God/Narrator mode (`isGod`).
    3. Game is over (`state.phase === 'gameOver'` or `Boolean(state.winner)`).
    4. The observer is Mafia and `p` is a fellow Mafia member (`p.role === 'mafia' || p.role === 'godfather'`).
    5. The observer is dead and `deadSeeRoles` is enabled.
    6. The target is dead and `revealRoleOnDeath === 'full'`.
  - **Verification**: Non-host peers cannot see other players' roles in memory or network traffic. However, the Host player has access to the full `GameState` in memory on their device.

---

## 4. State Management, Serialization & Message Validation
- **State Storage**:
  - Host: `hostStateRef.current` (`GameState` defined in `lib/types.ts`). Also persisted to `localStorage` under `mafia-host-state:${code}` (`lib/storage.ts`).
  - Client: React state `useState<ClientGameView | null>(null)` (`lib/useRoom.ts`).
- **Serialization**:
  - PeerJS DataConnection transfers objects using BinaryPack (`peerjs-js-binarypack`) over WebRTC SCTP data channels.
- **Typing & Validation**:
  - `lib/types.ts` defines all state contracts (`GameState`, `ClientGameView`, `PlayerView`, `Settings`, `Player`).
  - `lib/net.ts` defines Zod validation schemas:
    - `ClientHelloSchema`: `{ type: 'hello', code, name, avatar, token }`
    - `ClientIntentSchema`: `{ type: 'intent', reqId, intentType, payload }`
    - `ClientChatSchema`: `{ type: 'chat', channel, text }`
    - `ClientPingSchema`: `{ type: 'ping', t }`

---

## 5. Settings Data Flow: From UI to Game Logic to UI
```
[Host UI: Lobby.tsx / Settings Panel]
                  │
                  ▼
   Host calls updateSettings(partial) in useRoom.ts
                  │
                  ▼
   Host validates & applies partial to hostStateRef.current.settings
   (increments state.version)
                  │
                  ▼
   Host saves to localStorage (mafia-host-state:${code})
                  │
                  ▼
   Host calls pushViews(state):
      ├─► For Host: buildViewFor(state, hostId, now) ──► setGameView(hostView)
      └─► For Each Client: buildViewFor(state, clientId, now) ──► conn.send({ type: 'view', view: clientView })
                  │
                  ▼
[Client WebRTC DataChannel: conn.on('data')]
                  │
                  ▼
   Client setGameView(msg.view)
                  │
                  ▼
[Frontend UI Components: Lobby.tsx, Day.tsx, Night.tsx, CircleSittingArena.tsx, TargetPicker.tsx, HelpSheet.tsx]
   - All read exclusively from gameView.settings (single source of truth).
   - Engine functions (phases.ts, rules.ts) execute on host reading state.settings.
```

---

## 6. Per-Player Identity: Codename, Avatar & Color
- **Identity Storage**:
  - Local persistence: `localStorage.getItem('mafia-token:${roomCode}')` stores persistent player UUID token (`generateToken()`).
  - `localStorage.getItem('mafia-profile')` stores player's chosen name and avatar ID.
- **Color Storage & Historical Bug Root Cause**:
  - *Root Cause Analysis*: Previously, `color` was not a first-class field in `Player` or `PlayerView`. UI components fell back to local avatar indexing or a hardcoded default color (`#E5383B`), causing the notorious "everyone gets the same color" bug.
  - *Architectural Fix*: A dedicated 12-color high-contrast noir palette is assigned deterministically by the host upon connection (`color = PALETTE[assignedSlot % PALETTE.length]`), stored in `Player.color`, broadcast in `PlayerView.color`, and reflected uniformly across all peer views.

---

## 7. Existing Tests, Test Runner & CI Config
- **Runner**: Node.js custom test harness (`scripts/test-runner.js`) with on-the-fly TypeScript compilation (`ts.transpileModule`).
- **Suites**:
  1. `lib/engine/engine.test.ts` (Rules, validation, role assignment, win states, night resolution).
  2. `lib/engine/settings-sync.test.ts` (Settings reflection, God mode, public/anonymous voting, doctor rules, timers).
  3. `lib/net.test.ts` (Zod validation, room codes, token generators).
  4. `lib/storage.test.ts` (Auto-expiration, localStorage purging).
  5. `components/ui.test.tsx` (Component rendering, Timer, Lobby, CircleSittingArena, Day/Night reflection).
- **CI**: No GitHub Actions workflow currently configured. Will be added per Section 8.6.

---

## 8. Deployment Architecture
- **Platform**: Vercel Static deployment.
- **Production URL**: `https://the-apes.vercel.app/`
- **Serverless Functions**: Currently none. (A `/api/turn-credentials` endpoint will be added for dynamic TURN credential generation per Section 1.3).
- **Environment Variables**:
  - `NEXT_PUBLIC_APP_URL`: Canonical site URL (defaults to `http://localhost:3000` in dev).
