# UI Architecture Map: Mafia — Shadows of the City

*Maintained per Section 1.1 of `UI_OVERHAUL_PROMPT.md`. Defines the boundaries between the Protected Engine/Backend Set and the Editable Presentation Layer.*

---

## 1. Protected Set (Read-Only Engine & Logic)

The following files contain core game rules, message schemas, WebRTC networking, peer synchronization, timers, and storage persistence. **These files are protected and must remain 100% intact.**

| File Path | Responsibility | Core Exports & Public API |
|---|---|---|
| `lib/types.ts` | Complete game state schemas, player views, intents, message contracts | `ClientGameView`, `PlayerView`, `Role`, `Phase`, `ClientIntent`, `Settings`, etc. |
| `lib/settings.ts` | Room settings schemas, presets, validation rules, descriptions | `DEFAULT_SETTINGS`, `SETTINGS_SCHEMA`, `ROLE_PRESETS`, `RULE_PRESETS`, `PLAYER_COLORS` |
| `lib/net.ts` | STUN/TURN ICE config, PeerJS IDs, share URLs, candidate logger | `getIceConfig`, `getRoomShareUrl`, `generateRoomCode`, `generatePlayerToken` |
| `lib/storage.ts` | Auto-expiration, localStorage keys, room cache purging | `saveGameData`, `getSavedGame`, `clearRoomData`, `cleanExpiredGameData` |
| `lib/shortcuts.ts` | Keyboard event registry and input exclusions | `useShortcut`, `SHORTCUTS` |
| `lib/haptics.ts` | Tactical tactile vibration feedback | `haptics.peek()`, `haptics.vote()`, `haptics.eliminate()`, `haptics.toggle()` |
| `lib/stats.ts` | Career records, win computations, match awards calculation | `recordMatch()`, `getCareerStats()`, `computeAwards()` |
| `lib/sfx.ts` | Procedural Web Audio engine, Lo-Fi jazz synthesizer, sound effects | `playNightBell()`, `playDayChime()`, `setPhaseAmbience()`, `toggleMute()`, `getIsMuted()` |
| `lib/voice.ts` | WebRTC audio mesh, track state manager, speech activity detection | `voiceEngine` (`enableVoice`, `disableVoice`, `toggleSelfMute`, `subscribe`, etc.) |
| `lib/useRoom.ts` | Authoritative room coordinator, PeerJS mesh, intent dispatcher, state hook | `useRoom` hook (`gameView`, `isHost`, `sendIntent`, `sendChat`, `toggleVoice`, etc.) |
| `lib/engine/rules.ts` | Role validation, team win calculation, role assignment logic | `validateSettings()`, `checkWinCondition()`, `assignRoles()` |
| `lib/engine/phases.ts` | Night resolution, day voting tallies, tie runoff rules, morning report | `resolveNight()`, `tallyVotes()`, `createMorningReport()`, `advancePhase()` |
| `lib/engine/view.ts` | Information masking, secret role sanitization, player views | `maskStateForPlayer()`, `createClientGameView()` |
| `lib/engine/peer-simulator.ts`| In-memory multi-peer test harness for peer integration | `createMockPeerMesh()` |

---

## 2. Editable Presentation Layer (UI & Rendering)

The following components and styles render the game presentation and are being overhauled to achieve the "Noir, lit by one lamp" Case File aesthetic.

| File Path | Role in Overhaul |
|---|---|
| `app/globals.css` | Design tokens (`--ink-950`, `--bone`, `--lamp`, etc.), font definitions, phase theming (`data-phase`), rubber stamps, redactions |
| `tailwind.config.ts` | Tailwind color mappings, font families, custom utilities |
| `components/ui.tsx` | Base UI primitives: `Button`, `Badge`, `Card`, `Modal`, `CenterTimer`, `Avatar`, `Kbd`, `TimerRing`, `RubberStamp`, `RedactionShield`, `MafiaWordmark` |
| `components/TopBar.tsx` | Minimalist HUD: Case Menu drawer, Display phase type + circular timer ring, Role chip with hold-to-peek |
| `components/VoiceOverlay.tsx`| Bottom dock mic button (Off/Muted/Live with breathing ring) + slide-up Audio Sheet with speaking waves and sliders |
| `components/HelpSheet.tsx` | Slide-out "Rulebook": Basics, Your Role with classified redactions, All Roles, House Rules, Case Log with live timer chip |
| `components/Lobby.tsx` | Hero room code with single Invite sheet, living round table preview, host Game Setup side sheet, relocated Test Bots |
| `components/RoleReveal.tsx` | Single lamp pool, 3D tilt flip card, engraved card back, display emblem, team accent, teammates reveal |
| `components/CircleSittingArena.tsx`| Centerpiece living round table under hanging lamp, seated figurines, phase lighting, accessible DOM overlay buttons |
| `components/Night.tsx` | Cool night fog atmosphere, tap seat to target, thumb-reachable action bar, Mafia chat drawer |
| `components/Day.tsx` | Warm amber lamplight pool, speaking waves, suspicion markers, voting action bar |
| `components/DawnAnnouncement.tsx`| Staggered narrative sequence with lamp flicker and rubber stamp landing |
| `components/End.tsx` | "Case Closed" 3-beat ceremony: huge display verdict, sequential table card flips, citation tags, docket PNG export, career dossier |
| `app/page.tsx` | Landing page noir backroom vignette, handcrafted MAFIA wordmark, avatar reel, fixed divider join-by-code |

---

## 3. View-Model Adapter Layer (`lib/view-model.ts`)

To strictly decouple UI components from the underlying peer networking and state structures, the UI consumes pure derivation hooks from `lib/view-model.ts`:

- `useRoomView(gameView)`: General room metadata, code, version, pause state.
- `usePhaseView(gameView)`: Human-friendly phase name, round number, remaining seconds, urgency level.
- `useSeatsView(gameView)`: Seated player list with positions, status (alive, eliminated, away), pin colors, avatars.
- `useMyRoleView(gameView)`: Local player's role, objective, night action capability, teammates, investigation results.
- `useActionsView(gameView)`: The current primary and secondary actions available to the player in this phase.
- `useAudioView(gameView)`: Local and remote voice speaking states, mute states, and active channels.

This guarantees that UI components **only read** derived data and **only call** existing actions (`sendIntent`, `toggleVoice`, etc.).
