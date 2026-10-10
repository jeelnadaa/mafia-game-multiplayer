# MAFIA GAME: MASTER PROMPT v2.1 (host-as-server, WebRTC, lean codebase, role info anywhere, keyboard shortcuts)

> Paste everything below the line into your coding agent (Antigravity). Then say **"Do Milestone 0"**, test it, say **"continue"**, and so on.

---

You are a senior full-stack engineer AND art director. Build a real-time multiplayer MAFIA party game as a web app that I deploy on Vercel. Friends join from their own phones/laptops using a private room code.

THERE IS NO BACKEND, NO DATABASE, NO REDIS, NO PUSHER, NO SOCKET SERVER. The HOST'S BROWSER IS THE GAME SERVER. Players connect directly to the host's browser with WebRTC data channels (PeerJS). The host's browser keeps the authoritative game state in memory and mirrors it to the host's own localStorage so a host refresh can resume the game. Vercel only serves static files.

You will also GENERATE ALL IMAGE ASSETS YOURSELF with your built-in image generation ability (Nano Banana / Gemini image model). I will not create or download anything manually.

I am a beginner. Rules for how you work:
- Work ONE MILESTONE AT A TIME (section 16). After a milestone, STOP, tell me the exact commands to run and exactly what to click to test it, then wait for me to say "continue".
- Do not ask me questions. If something is unclear, choose a sensible default and write the assumption in DECISIONS.md.
- Never leave TODO placeholders or fake/mock logic. Everything must really work.

==================================================
0. LEAN CODEBASE RULES (read first, obey always)
==================================================
I do NOT want a large codebase. Hard budget:
- At most ~28 source files and ~4,200 lines of TypeScript/TSX in total (tests, scripts and generated assets not counted). No single file over ~350 lines.
- DATA-DRIVEN, NOT COPY-PASTE. Three tables drive almost everything. Never hand-write per-role or per-setting UI that a table can render:
  1. `ROLES` table in `lib/content.ts`: id, name, team, colour, icon, one-line summary, night verb ("Kill", "Protect", "Investigate", "Shoot"), whether it needs a target, whether self-target is allowed, whether it needs confirm, how-to-play text, tips, win condition. Used by: lobby Roles panel, role reveal, night screen, help sheet, recap, colours.
  2. `SETTINGS` schema in `lib/settings.ts`: an array of { key, group, label, tooltip, type: 'toggle'|'number'|'select', options/min/max/step, default, showIf(settings), plain(value) }. Used by: defaults, validation of incoming values, the lobby settings panel (rendered automatically, no hand-written form per setting), and the "Rules in plain words" tab of the help sheet.
  3. `SHORTCUTS` registry in `lib/shortcuts.ts` (section 9). Used by the keyboard handler AND the Keys tab, so docs never drift from behaviour.
- ONE generic `TargetPicker` component handles every night action (mafia, godfather, doctor, police, vigilante) and the voting screen, configured by the `ROLES` table. Do NOT write a separate screen per role.
- ONE generic `HelpSheet` component handles all Role Info, How-to-Play guides, match rules, notes, shortcuts, and log across all game screens and phases. Do NOT create separate modals or help pages.
- Reuse small primitives from ONE file `components/ui.tsx` (Button, Card, Chip, Switch, Stepper, Sheet, Modal, Ring, Toast, Kbd, Avatar). No component library, no state library (React context + one `useRoom` hook), no CSS files other than `globals.css`, no extra dependencies beyond section 1.
- Tests: ONE `engine.test.ts` and ONE `net.test.ts`.
- After EVERY milestone run `find app components lib -name '*.ts*' | grep -v test | xargs wc -l | sort -n | tail -40` and print the result. If over budget, refactor/merge BEFORE saying the milestone is done.
- Prefer deleting code to adding code. No dead code, no unused exports, no commented-out blocks.

==================================================
1. FIXED TECH STACK (do not substitute, do not add)
==================================================
- Next.js 14 (App Router) + TypeScript (strict) + Tailwind CSS. ALL pages are client components. NO API routes.
- framer-motion, lucide-react, zod (validate every incoming network message), qrcode.react, peerjs, vitest. Dev-only: sharp (asset script).
- Random ids/codes: tiny helper using `crypto.getRandomValues` (no nanoid).
- Optional env vars (app must work with none set; create .env.example):
  NEXT_PUBLIC_PEER_HOST / _PORT / _PATH / _SECURE (custom PeerJS signalling server; default = PeerJS public cloud)
  NEXT_PUBLIC_TURN_URLS (comma separated), NEXT_PUBLIC_TURN_USERNAME, NEXT_PUBLIC_TURN_CREDENTIAL (optional relay for strict networks)
- PWA: `app/manifest.ts` (name, short_name, standalone display, theme colour #08090D, icons from app/icon.png). No service worker.

==================================================
2. NETWORK ARCHITECTURE (all in `lib/net.ts`, ~300 lines)
==================================================
A) HOST = server, CLIENT = remote. HOST runs `HostServer` in its browser, holds the single `GameState`, runs the engine. The host's own UI reads `buildViewFor(state, hostPlayerId)` DIRECTLY (no network hop). CLIENTS send INTENTIONS only and receive personalised VIEWS; they never compute outcomes.

B) ROOM CODE = PEER ID. Code: 5 chars from "ABCDEFGHJKLMNPQRSTUVWXYZ23456789". Host registers peer id `mafia-v1-{CODE}` (if taken, silently pick a new code, retry up to 5 times). Client: `new Peer()` then `connect('mafia-v1-{CODE}', { reliable: true, serialization: 'json' })`. If unreachable within 10s -> "Room not found or host offline" + Retry. Codes are uppercased on input. INVITE LINK = `/room/{CODE}`. There is NO separate join page: if a visitor opens `/room/{CODE}` without a saved identity for that code, the room page first shows an inline name + avatar form, then joins.

C) ICE: stun:stun.l.google.com:19302, stun:stun1.l.google.com:19302, stun:global.stun.twilio.com:3478 + TURN from env if present. `debug: 0`.

D) PROTOCOL (validate with zod; drop invalid; never trust a client):
   Client->Host: `hello {code,name,avatar,token?}` | `intent {reqId,type,payload}` | `chat {channel,text<=300}` | `ping {t}`
   Host->Client: `welcome {playerId,token}` | `reject {reason: full|started|duplicate_name|bad_code|kicked}` | `view {version,serverNow,view}` | `ack {reqId,ok,error?}` | `chatmsg {message}` | `pong {t,serverNow}` | `kicked`
   Send `view` only to players whose view changed (cheap JSON hash per player) and coalesce changes within 16ms into one send.

E) SYNC & LATENCY (the heart of "in sync with minimal delay")
   1. After EVERY state change the host pushes views immediately. No polling.
   2. CLOCK SYNC: each `view` carries `serverNow`; client keeps `clockOffset = serverNow - (Date.now() + rtt/2)` (EMA 0.3), refined by ping every 3s. All countdowns use `phaseEndsAt - (Date.now() + clockOffset)`. Show rtt in a small connection chip.
   3. HEARTBEAT: client pings every 3s; host marks `connected=false` after 9s of silence, true on any message.
   4. CLIENT AUTO-RECONNECT: on close/error retry every 1.5s (backoff max 5s) for 5 minutes, sending `hello` with the stored token to get the SAME seat. Show a non-blocking "Reconnecting..." chip. Never dump the player to the home page.
   5. HOST AUTO-RECOVERY: if signalling drops call `peer.reconnect()`; if the peer is destroyed re-create it with the SAME id, retrying every 1.5s for 30s.
   6. OPTIMISTIC UI: show a tapped selection instantly, reconcile on next `view`, revert + toast if `ack.ok=false`.
   7. Every intent has a `reqId`; handlers are idempotent where possible.

F) HOST PERSISTENCE (host's browser storage)
   - Save full `GameState` to host localStorage `mafia-host:{CODE}` (debounced 300ms + on `pagehide`). On loading `/room/{CODE}`: if a saved host state exists -> HOST mode: restore, re-register peer id, resume timers from `phaseEndsAt`. Otherwise CLIENT mode.
   - While the host is away, players see "Host disconnected. Waiting..." and keep retrying. On return EXTEND `phaseEndsAt` by the time the host was away.
   - Delete saved states older than 24h. Use `BroadcastChannel('mafia-host-{CODE}')` so only ONE host tab exists per room ("This room is already open in another tab").

G) KEEPING THE HOST ALIVE
   - Game timer = a tiny inline Web Worker (Blob) posting `tick` every 250ms (not throttled like page timers) that calls `maybeAdvance`. Request Screen Wake Lock while hosting and re-request on `visibilitychange`. `beforeunload` confirm: "Closing this pauses the game for everyone."
   - Host banner: "You are the host. Keep this tab open." + "5 / 6 connected".

H) HOST INTENT HANDLER: ONE function `handleIntent(playerId, type, payload)`: zod-validate -> check phase/role/alive/permission -> pure engine call -> new state -> `version++` -> persist -> push views -> ack. The host's own UI calls the SAME function directly. Intents: `updateSettings`, `applyPreset`, `suggestBalanced`, `setReady`, `kick`, `setGod`, `start`, `assignRole`, `nightAction`, `policeConfirm`, `readyToVote`, `vote`, `godAction`, `rematch`, `leave`.

I) SECURITY HONESTY: other players never see secrets (they only get their own view). The host's browser holds everything, so a host COULD peek in dev tools; say so in README and show "As host, your browser runs the game. Don't peek!" on the Create screen. Never send other players' tokens. Drop >30 msgs/sec per connection. Max 20 connections.

J) PURE ENGINE (`lib/engine/*.ts`, 3 files: `rules.ts` = validate/assign/win, `phases.ts` = night/vote/advance, `view.ts` = buildViewFor): no network, no localStorage, no Date.now(), no Math.random inside; inject `now` and `rng`.

==================================================
3. DATA MODEL (lib/types.ts)
==================================================
```ts
type Role = 'mafia'|'godfather'|'doctor'|'police'|'vigilante'|'jester'|'civilian';
type Team = 'mafia'|'town'|'jester';
type Phase = 'lobby'|'roleReveal'|'night'|'morning'|'discussion'|'voting'|'voteResult'|'gameOver';

interface Player { id; token; name; avatar /*1..12*/; isHost; isGod /*God does NOT play*/;
  ready; connected; lastSeen; role?: Role; alive; diedInRound?; diedBy?: 'mafia'|'vote'|'vigilante'|'god'|'left' }

interface GameState {
  code; version; phase; round /*1 = first night*/; phaseEndsAt: number|null; paused: boolean; hostAwayAt?: number;
  settings: Settings; players: Player[];
  night: { picks: Record<playerId, string|null|'hold'>;   // ONE map for all roles (key = actor id)
           locked: Record<playerId, boolean>; earlyEndAt?: number|null };
  doctorHistory: Record<playerId,{lastSavedId:string|null; selfSavesUsed:number}>;
  shotsUsed: Record<playerId, number>;
  policeInbox: {policeId; fromRound; revealRound; targetId; result; delivered}[];
  votes: Record<playerId, string|'skip'|null>; revotePending: boolean; readyToVote: string[];
  log: LogEntry[]; secretLog: SecretLogEntry[]; chat: ChatMessage[] /*last 150*/;
  winner?: 'town'|'mafia'|'jester';
}
```
Chat channels: 'public' | 'mafia' | 'dead' | 'god'. The host sends each message only to players allowed to read that channel; joiners get readable history inside their first `view`.

==================================================
4. ROLES (fully configurable)
==================================================
The host can turn ANY optional role on/off and set counts:
```ts
roles: { mafia:{count}, godfather:{enabled,count 0-1}, doctor:{enabled,count}, police:{enabled,count},
         vigilante:{enabled,count}, jester:{enabled,count 0-1} }   // civilian = automatic remainder
```
Effective count = enabled ? count : 0. A disabled role must not exist ANYWHERE in that game (no UI, no night step, no help entry, no recap line). Must work for ALL combinations: Mafia+Civilians only; Classic; no Doctor; no Police; neither; any subset of extras; everything on with several doctors/police. Test several combinations.

Role rules (the ROLES table holds the text; engine holds the logic):
- MAFIA (mafia team): wakes at night, picks 1 alive player to kill, knows teammates, private night chat.
- GODFATHER (mafia team): like Mafia, but police in 'alignment' mode see "Not mafia"; in 'exact_role' mode see "Godfather".
- DOCTOR (town): protects 1 alive player per night. Obeys doctorSelfSave and doctorSameTargetTwice PER doctor. Target saved if ANY alive doctor chose them.
- POLICE (town): investigates 1 alive player per night (not self). Confirm is final (confirm dialog). Result timing per policeResultDelay. Each police gets their own results.
- VIGILANTE (town): may shoot 1 alive player at night, up to vigilanteShots times per game. "Hold fire" button. A doctor save blocks the shot. No guilt penalty.
- JESTER (own team): no night power. Wins ONLY if voted out in a day vote; game ends at once with Jester winning. Counts as non-mafia for the parity check.
- CIVILIAN (town): no night power. Night shows a DECOY ("Close your eyes... the city sleeps") with a harmless fake tap area so screens reveal nothing. Jester gets the decoy too.

Lobby Roles panel (host edits, others see read-only live), rendered from the ROLES table: grid of role cards (art, name, team badge, one-liner, ON/OFF switch (Mafia none, Civilian "auto"), count stepper when ON); live summary bar "12 players = 3 Mafia · 1 Doctor · 1 Police · 7 Civilians" as an animated stacked colour bar.
ROLE PRESETS: "Classic", "Bare bones" (Mafia+Civilians), "Detective's game" (no doctor), "Medic only" (no police), "Chaos" (all on). "Suggest balanced": mafia = max(1, round(players/4)); doctor = 1 if enabled and players>=5; police = 1 if enabled and players>=5; others 1 if enabled.
VALIDATION (red inline text; Start disabled with reason): non-civilian total <= players; mafia team (mafia+godfather) >= 1 and strictly LESS than half the players; players >= 4 (excluding God); every enabled role count >= 1.
`revealRoleList` (default true): everyone sees which roles exist and how many (not who holds them).

==================================================
5. SETTINGS (all live in the SETTINGS schema; host edits; locked after start; each has default + tooltip)
==================================================
GENERAL: maxPlayers 4-20 (12) | moderatorMode 'god'|'auto' (auto) ['god' = one human, host by default, reassignable, narrates and does NOT play; 'auto' = host's browser narrates, everyone plays] | roleAssignment 'random'|'manual' (manual only in god mode; God assigns from the enabled pool; leftovers random).
MAFIA: mafiaKillMode 'unanimous'|'random_pick'|'majority' (unanimous) [unanimous = all alive mafia-team must pick the same person; random_pick = server randomly chooses one mafia member's pick; majority = most-picked wins, ties random] | mafiaDisagreeFallback 'no_kill'|'random_pick' (random_pick) | mafiaNightChat (true) | noKillFirstNight (false).
DOCTOR (showIf doctor on): doctorSelfSave 'always'|'once'|'never' (once) | doctorSameTargetTwice (false) | announceSave (true: "X was attacked but saved!"; false: "Nobody died tonight").
POLICE (showIf police on): policeResultDelay 0..5 (0) [0 = result immediately on confirm; 1 = start of NEXT round's night; N = start of round (current+N)'s night] | policeResultDetail 'alignment'|'exact_role' (alignment: "Mafia"/"Not mafia"). Result is computed at investigation time; lost if that police dies before delivery.
VIGILANTE (showIf on): vigilanteShots 1-3 (1).
TIMING: nightDuration 15-180 (45) | discussionDuration 0-600 (120; 0 skips) | votingDuration 15-180 (45) | endNightEarly (true: end once all living night-action holders acted + RANDOM 3-6s wait; if an enabled role's holders are all dead still enforce a random 8-15s minimum so timing leaks nothing) | godAutoAdvance (false).
DAY/VOTING: voteVisibility 'public'|'anonymous' (public) | allowSkipVote (true) | tieRule 'no_elimination'|'revote_then_none'|'random' (revote_then_none: one revote among only the tied; tied again = nobody) | revealRoleOnDeath 'full'|'alignment'|'none' (full) | dayChat (true) | deadChat (true; dead chat only among the dead) | deadSeeRoles (true).
RULE PRESETS (one tap): "Classic" (defaults), "Quick Game" (short timers, no discussion), "Paranoid" (anonymous votes, no role reveal, police delay 1, doctor no self-save).

==================================================
6. HIDDEN INFORMATION (buildViewFor)
==================================================
A player's role appears in P's view only if: it is P's own | P is God | both are mafia team | the other is dead AND revealRoleOnDeath allows (full = exact, alignment = Mafia/Town, none = hidden) | P is dead AND deadSeeRoles | game over. Police results go only to that police player. Picks visible only to the actor (+ mafia team for mafia picks) + God. Tokens of others NEVER appear. The host's own UI also goes through `buildViewFor` so UI code cannot leak secrets unless the host is God. The view includes: phase, round, phaseEndsAt, paused, settings, public player list, my private data (role, night options, police inbox), public log, readable chat, `serverNow`.

==================================================
7. GAME FLOW & EDGE CASES (engine)
==================================================
START: Host presses Start (valid settings). Roles assigned (random via deterministic rng, or manual by God in god mode). Phase 'roleReveal' (10s countdown or until flipped; in God mode: until God presses Next). Then round=1, 'night'.

NIGHT:
1. Deliver pending police results where `revealRound <= round` (if police player is still alive).
2. Living role holders receive their private night action UI (`TargetPicker`):
   - Mafia & Godfather: select 1 target to kill + live mafia teammate chat channel.
   - Doctor: select 1 target to protect (respects `doctorSelfSave` history and `doctorSameTargetTwice`).
   - Police: select 1 target to investigate (not self) -> Confirm dialog locks investigation.
   - Vigilante: select 1 target to shoot or tap "Hold Fire" (`X` shortcut).
   - Civilians & Jester: see the atmospheric DECOY screen ("Close your eyes... the city sleeps") with a harmless fake interactive area so screen peeking reveals nothing.
3. Night ends when timer expires, OR `endNightEarly` triggers (all living action-holders acted + random 3-6s jitter; if all holders of an active role are dead, enforce an 8-15s minimum delay so timing leaks no info), OR God forces "End night".
4. `resolveNight` execution order:
   a) Determine Mafia target based on `mafiaKillMode` ('unanimous' | 'majority' | 'random_pick') + fallback. (Null on round 1 if `noKillFirstNight` is enabled).
   b) Compile `savedSet` from alive Doctors' picks.
   c) Compile kill list from Mafia target + Vigilante shots (deduplicated). Any player in `savedSet` survives (logged as saved).
   d) Police investigation: if delay = 0, delivered immediately to inbox; if delay > 0, queued for `round + delay`. If investigating Godfather, returns "Not mafia" (alignment mode) or "Godfather" (exact role mode).
   e) Missing/unselected picks default to no action.
5. 'morning' (~7s): Dramatic morning sunrise headline. Reveals deaths with role according to `revealRoleOnDeath` ('full' | 'alignment' | 'none') or "Nobody died tonight" or "X was attacked but saved!" (if `announceSave` is true). Check win conditions. Transition to 'discussion' (or skip to 'voting' if `discussionDuration = 0`).

DISCUSSION:
- Countdown timer, public chat channel, alive player grid, and "Ready to vote" button (`V` shortcut).
- If all living players toggle "Ready to vote", phase advances to 'voting' early.

VOTING:
- Each alive player selects one other alive player (cannot self-vote) or "Skip" (if `allowSkipVote` is true) via `TargetPicker`. Selections can be changed until phase ends.
- Phase ends on timer expiry, OR when all alive players cast votes (+2s grace), OR God forces "End vote".
- Visibility: Public mode shows live who-voted-whom indicators; Anonymous mode reveals total counts only at conclusion.
- Tally: Candidate with the highest vote count is eliminated. Skip votes form their own tally bucket; if Skip wins, nobody is eliminated.
- Tie Breaking (`tieRule`):
  - `no_elimination`: Tie leads to nobody eliminated.
  - `revote_then_none`: One revote among tied candidates; if tied again, nobody is eliminated.
  - `random`: Random selection between tied players.
- Elimination: Eliminated player dies; role revealed per `revealRoleOnDeath`.
- JESTER WIN CHECK: If Jester is eliminated in a day vote, JESTER WINS IMMEDIATELY! Game terminates instantly into `gameOver` with a special Jester Victory screen and celebration sound.
- 'voteResult' (~6s): Shows elimination announcement, checks win conditions, increments round, transitions to next 'night'.

GRAVEYARD SPECTATOR LOUNGE (Dead Players):
- Eliminated players transition to Spectator mode ("The Graveyard Lounge").
- Dedicated private 'dead' chat channel ("Ghost Chat") where dead players communicate without disturbing alive players.
- Real-time live spectator view of voting and morning results.
- If `deadSeeRoles` is true in host settings, dead players can toggle an overlay to reveal the secret true roles of all players.

WIN CONDITIONS:
- TOWN WINS: When all Mafia-team players (Mafia + Godfather) are eliminated.
- MAFIA WINS: When alive Mafia-team members equal or outnumber alive non-mafia players.
- JESTER WINS: When Jester is successfully voted out during day voting.
- GAME OVER: Full reveal of all players' original roles. Secret timeline recap from `secretLog` (every night kill attempt, doctor save, police investigation, vigilante shot, and voting tally per round). "Play Again" button (Host resets to lobby keeping players and settings) and "Leave Room".

TIMERS & ENGINE RESILIENCE:
- Authoritative clock runs on host via an inline Web Worker tick (250ms interval) calling pure `maybeAdvance(state, now, rng)`.
- Client timers calculate remaining time via clock offset (`phaseEndsAt - (Date.now() + clockOffset)`).
- Paused state freezes remaining duration.
- Player disconnect mid-game: missing night/vote actions default to pass/abstain; if player leaves permanently, marked as `diedBy: 'left'` and win check executes immediately.

==================================================
8. ROLE INFORMATION & HOW TO PLAY (ALWAYS ACCESSIBLE + POST-REVEAL ONBOARDING)
==================================================
Players must be able to view their role information and game rules AT ANY TIME, across EVERY phase and screen, and immediately upon receiving their role. It must be effortless to dismiss and reopen.

8.1 ALWAYS-ACCESSIBLE ENTRY POINTS:
- Persistent Top Bar Header:
  - Tapping the Role Chip (e.g. `[🎭 Doctor (I)]`) instantly opens the Help Sheet directly to the "My Role" tab.
  - Persistent `[❓ How to Play (H)]` button present on EVERY screen (Home, Lobby, Role Reveal, Night, Morning, Discussion, Voting, Vote Result, Spectator, God Control, Game Over).
- Keyboard Shortcuts (Instant Access):
  - `?` or `H`: Toggle the full How to Play & Role Guide.
  - `I`: Open directly to the "My Role" guide tab.
  - Hold `R`: Quick Role Peek HUD (press-and-hold displays your secret role card and action instructions; releasing immediately blurs/hides it for shoulder-surfing protection).
  - `Esc`: Instantly closes the role guide, modal, briefing card, or peek overlay.

8.2 POST-ROLE-REVEAL ONBOARDING BRIEFING:
- As soon as roles are assigned and revealed (when the role reveal card is flipped or phase leaves 'roleReveal'), a sleek, high-contrast "Role Briefing Card" slides up automatically.
- Card Contents:
  - Role Portrait & Title, Team Badge (e.g., "TOWN DEFENDER" or "MAFIA SYNDICATE"), Accent Glow.
  - Clear Night Action: Plain English directive on what this role does (e.g., Doctor: "Tonight: Protect 1 alive player from harm").
  - Win Condition: "Eliminate all Mafia members."
  - 2-3 Actionable Strategic Tips for gameplay.
  - For Mafia: Names of fellow mafia teammates and night kill protocol.
- Effortless Dismissal (Player MUST be able to easily close it):
  - Prominent "✕" close button in the top-right corner.
  - Primary "Got It / Let's Play" button at the bottom (also bound to `Enter` or `Space`).
  - `Esc` key immediately dismisses it.
  - Tap anywhere outside on the backdrop.
  - Swipe-down gesture on mobile touch screens.
  - Non-blocking auto-dismiss progress bar (12 seconds) so it NEVER traps an idle player or covers night actions.
  - Subtle reassurance hint below: "Reopen anytime by pressing [H] or tapping your role chip in the top bar."
  - Player preference toggle: "Show role tips at the start of each game" (default ON, saved in localStorage, with "Don't show again" checkbox).

8.3 UNIFIED HELP & ROLE SHEET (`components/HelpSheet.tsx`, ~220 lines):
- ONE generic component handles all help, role details, rules, notes, shortcuts, and logs.
- Responsive Layout:
  - Mobile: Bottom sheet (up to 85% screen height) with drag handle and swipe-to-dismiss.
  - Desktop: Slide-out right drawer (420px) that is NON-MODAL (the underlying game interface remains visible and fully clickable, so players can reference rules while selecting targets!).
- Header:
  - Title, live game countdown chip ("Night 1 · 0:24"), and explicit close "✕" button (`Esc`).
- Scrollable Tab Bar:
  1. Basics: 6-step Mafia primer (Night secret actions -> Morning revelations -> Day discussion -> Voting elimination -> Win conditions) with phase icons.
  2. My Role: Personal role deep dive, night ability details, teammates (if mafia), win condition, strategic tips, and shoulder-surf blur toggle ("Hold to reveal").
  3. Roles: All ENABLED roles in this match with player counts (e.g., "Doctor ×1", "Mafia ×2"), summaries, and abilities (respects `revealRoleList`).
  4. Rules: Active room settings rendered in plain English from `SETTINGS.plain()` (e.g., "Doctor cannot protect the same person twice").
  5. Log: Chronological game event feed (deaths, saves, vote results).
  6. Notes: Private detective scratchpad + per-player suspicion tagging (Trust / Suspect / Neutral), stored locally in `localStorage` (`mafia-notes:{CODE}`).
  7. Keys: Full interactive keyboard shortcut cheatsheet from the `SHORTCUTS` registry.

8.4 CONTENT SPECIFICATION (`lib/content.ts`):
All descriptions, night instructions, tips, and win conditions live in `lib/content.ts`. Zero prose hardcoded inside UI components:
- mafia: summary "You work with the Mafia to eliminate the town." Night: "Pick one person to kill. Talk privately with your team." Win: "Mafia equal or outnumber everyone else." Tips: "Don't vote together every time", "Defend a teammate carefully", "Blend in during the day".
- godfather: summary "Mafia boss. Looks innocent to the police." Night: same as Mafia. Win: same as Mafia. Tips: "Police see you as 'Not mafia' in alignment mode; use that, but don't over-claim."
- doctor: summary "Protect someone from the Mafia." Night: "Pick one person to protect. If the Mafia target them, they survive." Win: "All Mafia are eliminated." Tips: "Protect likely targets, not only yourself", "Self-save and repeat-protect follow the host's rules".
- police: summary "Investigate one person each night." Night: "Pick someone, confirm, and learn their side." Win: "All Mafia are eliminated." Tips: "Reveal your findings at the right moment", "Mafia will target you if you reveal too early".
- vigilante: summary "Town's one-shot gun." Night: "Shoot one person or hold fire." Win: "All Mafia are eliminated." Tips: "Be sure before you shoot", "A doctor can accidentally block your shot".
- jester: summary "You want to be voted out." Night: "Nothing to do. Stay quiet." Win: "Get the town to vote YOU out during day voting." Tips: "Act suspicious, but not too obviously".
- civilian: summary "Ordinary townsperson." Night: "Sleep. Tap the fake area if you like; nobody can tell." Win: "All Mafia are eliminated." Tips: "Listen, question, vote carefully".
- god: "You narrate. You see everything but do not play." with Control Room action guide.
- phases: 1 short line per phase (used by Basics tab and top bar tooltips).

==================================================
9. KEYBOARD SHORTCUTS (UNIVERSAL & FULLY WIRED)
==================================================
ONE file `lib/shortcuts.ts` (~120 lines): central `SHORTCUTS` registry + `useShortcut` hook + global event dispatcher.

9.1 SHORTCUT MATRIX:
- Global / Universal:
  - `?` or `H`: Toggle How to Play & Role Guide
  - `I`: Open directly to "My Role" guide tab
  - Hold `R`: Quick Role Peek HUD (release hides)
  - `Esc`: Close any open Sheet, Modal, Briefing Card, or blur inputs
  - `M`: Toggle Sound (Mute / Unmute)
  - `C` or `/`: Focus chat input (press `Esc` to unfocus)
  - `Enter`: Send chat message (while chat input is focused)
- In Role Guide / Help Sheet:
  - `1`-`7`: Switch directly to tab (1: Basics, 2: My Role, 3: Roles, 4: Rules, 5: Log, 6: Notes, 7: Keys)
  - `←` / `→`: Switch to previous / next tab
  - `Esc` or `?` or `H`: Close sheet
- Night Action & Voting Grids (`components/TargetPicker.tsx`):
  - `1`-`9`, `0`: Select player by grid slot (1st through 10th player)
  - `Arrow Keys`: Move focus between player cards
  - `Enter` or `Space`: Select highlighted target
  - `Y` or `Enter`: Confirm selection (when confirmation prompt is active)
  - `N` or `Esc`: Cancel selection / dismiss confirmation
  - `S`: Select "Skip Vote" (during day voting)
  - `X`: Hold fire (Vigilante night action)
- Day & Discussion:
  - `V`: Toggle "Ready to Vote" status
- Lobby & Room Controls:
  - `Shift+Enter`: Toggle Ready state
  - `Shift+C`: Copy room invite link to clipboard (with toast notification)
  - `Ctrl+Enter` / `Cmd+Enter`: Start Game (Host only, when room is valid)
- God Control Room:
  - `Shift+N`: Advance to next phase
  - `Shift+E`: Force end night / end vote
  - `Shift+P`: Pause / resume game timer
  - `Shift+X`: Extend timer (+30 seconds)
  - `Shift+S`: Skip current phase

9.2 DESKTOP VISUAL KEY CUES:
- Buttons display small, tasteful `<Kbd>` badges on non-touch screens (e.g. "[H]", "[Esc]", "[V]", "[S]", "[Enter]").
- Automatically hidden on touch devices via `@media (pointer: coarse)` CSS.

9.3 INPUT & FOCUS SAFEGUARDS:
- When typing in any `<input>` or `<textarea>`, general character shortcuts are suppressed so player typing is uninterrupted.
- `Esc` always blurs active inputs.
- Active dialogs trap keyboard focus; closing restores focus to the triggering element.
- ARIA live region (`aria-live="polite"`) mirrors all announcements and phase changes for accessibility.

==================================================
10. LOBBY, ROOM & SPECTATOR EXPERIENCE
==================================================
- Home: "Create Game", "Join Game" (code input), "How to Play" link (opens HelpSheet). Name + avatar picker (12 avatars) remembered in `localStorage`.
- Lobby: Player grid (avatar, name, ready status, host crown, God badge, connection dot), host can kick and toggle "I will be God". Settings: Roles panel first, then collapsible groups rendered from `SETTINGS` schema. Role presets + rule presets. Share box: code, link, Copy button, `navigator.share`, QR code. Inline validation; Start button disabled with the reason shown.
- Top Bar (Persistent Across ALL In-Game Screens):
  - Room code (click to copy)
  - Phase indicator + Round badge
  - Synced countdown ring (smooth depletion, pulses red at <= 5s)
  - Role Chip (e.g., `[🎭 Doctor (I)]` - click/tap opens My Role tab in HelpSheet)
  - Connection chip (RTT ping in ms / "Reconnecting...")
  - `[❓ Guide (H)]` button
  - `[🔊 Mute (M)]` toggle button
- Connection State Screens:
  - Connecting (animated noir pulse)
  - Reconnecting ("Connection interrupted. Resuming your seat in 3s...")
  - Room not found / host offline (Retry button)
  - Strict NAT warning ("Direct P2P blocked by your network. Try switching Wi-Fi / mobile data.")
  - Kicked / Room Full / Game Already Started
- Phase Screens (`/room/[code]`):
  - Lobby: Player grid + Roles configuration + Room settings.
  - RoleReveal: Hold-to-flip 3D card + auto-trigger Role Briefing Card.
  - Night: Atmospheric dark mode tinted with player role color, generic `TargetPicker` for active roles, Decoy for Civilians/Jester.
  - Morning: Sunrise gradient, death headlines, save announcements.
  - Discussion: Chat channels, player grid, "Ready to vote" toggle.
  - Voting: Generic `TargetPicker`, live tally bars, candidate avatars.
  - VoteResult: Elimination announcement, dramatic slash animation.
  - GameOver: Victory banner, full role reveal flip, secret timeline recap, Play Again button.
  - Graveyard Lounge (Spectator): Ghost chat, live voting spectator, optional full role reveal overlay.
  - God Control Room: Full game oversight, manual role assignment, force controls.

==================================================
11. GOD MODE
==================================================
In moderatorMode='god' God gets a Control Room instead of a player screen: every player's role + alive state, LIVE night actions (each pick/result), vote counts, timers. Buttons: Start, Next, End night, Reveal morning, Start voting, End voting, Pause/Resume, Skip phase, Extend +30s, Force kill / Revive (logged), Reassign God (all with shortcuts from section 9). Manual role assignment UI (when roleAssignment='manual'): each player with a role dropdown (enabled roles only), count chips ("Mafia 1/2"), "Randomize the rest", Start disabled until valid. God can read/post in all chat channels ("God"). Night actions are still done by players on their own devices.

==================================================
12. DESIGN SYSTEM (minimalist, dark, mobile-first)
==================================================
CSS variables + Tailwind theme:
 --bg #08090D | --surface #11131A | --surface-2 #181B25 | --border #232736 | --text #ECEEF4 | --muted #8A90A2
 MAFIA/Godfather = RED accent #E5383B, deep #7A1418, glow rgba(229,56,59,.35)
 DOCTOR = WHITE accent #F4F6FA (dark text #0B0D12 on white surfaces), glow rgba(244,246,250,.30)
 POLICE = BLUISH BLACK surface #0E1A2B, border #1F3556, accent #5B8CFF, glow rgba(91,140,255,.30)
 VIGILANTE steel #7C8CA6 | JESTER gold-violet #B58AD6 | CIVILIAN sand #C9B79C | GOD gold #D6B15E
 DAY accent amber #F2B84B (day bg gradient #14161F -> #1B1A22); NIGHT = deep bg.
Fonts via next/font: Space Grotesk (headings), Inter (body). Radius 16px, 1px borders, almost no shadows (soft glow only for the active role). Buttons min 48px, big tap targets, safe-area padding. The night screen tints to MY role colour. Card back = pure CSS (dark surface + thin off-white geometric lines + small red diamond); film grain = CSS (SVG noise filter). No image files for these.

==================================================
13. ANIMATIONS (framer-motion, fluid, 60fps) & PROCEDURAL SOUNDS
==================================================
Define variants once and reuse in `lib/motion.ts`: spring {stiffness:260, damping:24}; page transition (AnimatePresence mode="wait", fade + 12px y, 250ms); stagger list (40ms); pop/ring; shake; slash-draw; blur-to-sharp text. Then:
- Role reveal: hold-to-flip 3D card (rotateY 180deg, 600ms), coloured glow pulse; release flips back.
- Post-reveal Role Briefing Card: slides up smoothly with spring, clear dismiss animation, 12s non-blocking timer bar.
- Role Peek HUD: instant spring in while `R` is pressed; instant blur/fade out on release.
- Night start: darken + moon slide-in + vignette (600ms). Day start: sun rises, background warms.
- Selection ring springs in; mafia = red crosshair lock; doctor = white pulsing halo; police = blue radar ring then result card slides up ("Not mafia" neutral / "Mafia" red flash); vigilante = red muzzle-flash ring. (One ring component, coloured by the ROLES table.)
- Roles panel toggles scale + colour-fill; summary bar segments spring in width.
- Morning: blur-to-sharp headline. Death: grayscale, shrink, red slash path-draw (SVG in code), dim. Saved: white shield pulse.
- Voting: tally bars spring; voter avatars fly via layoutId to the chosen card (public mode); eliminated card shakes and dims.
- Timer ring: smooth SVG depletion via requestAnimationFrame on the synced clock; last 5s red + pulse.
- Game over: banner scales in; roles flip face-up staggered 150ms; recap items slide in.
- Help sheet: spring slide up/in (bottom sheet on mobile, right drawer on desktop); tab content cross-fade.
- Buttons whileTap 0.97. Respect prefers-reduced-motion (`useReducedMotion` -> simple fades).
- PROCEDURAL SOUNDS (ZERO EXTERNAL FILES): `lib/sfx.ts` (~65 lines) synthesises with Web Audio API:
  - Night bell (low 220Hz resonant chime)
  - Day sunrise chime (two-tone bright major bell 520Hz -> 660Hz)
  - Elimination gavel (sharp low-frequency wooden impact)
  - Attack / shot (filtered noise burst with sharp transient)
  - Countdown tick (subtle woodblock tick during last 5 seconds)
  - Victory fanfare (ascending harmonic chords; distinct for Town, Mafia, and Jester)
  - Audio mute state toggled via `M` shortcut and top-bar button, stored in localStorage.

==================================================
14. ASSETS: YOU GENERATE THEM (Milestone MA); intentionally only ~23 small files
==================================================
Create every image yourself with your image generation tool. Do not ask me for images.

14.1 WORKFLOW
 1. Raw PNGs go in `assets-raw/<name>.png` (git-ignored).
 2. ONE script `scripts/process-assets.mjs` (Node + sharp), `npm run assets`:
    - KEY mode (logo-mark only): remove the flat magenta #FF00FF background (soft-edge threshold + fringe removal), trim, resize, keep alpha.
    - FIT mode: resize/cover-crop to target size, webp quality 80.
    - AVATAR mode: slice the 4x3 sheet into 12 equal cells, centred square crop, 256x256, save avatars/1..12.webp; then VIEW the results and fix crop offsets if any face is cut.
    - ICONS: `app/icon.png` (256) and `app/apple-icon.png` (180) from logo-mark.
    - Finally write `assets-raw/contact-sheet.png` (a montage of all finals) and VIEW it yourself to self-check. No /dev page.
 3. QUALITY LOOP: look at every image; REJECT and regenerate (max 3 tries) if it has text/letters/numbers/watermarks, wrong aspect ratio, off-palette colours, photorealism, is too busy, or (logo) has a non-flat-magenta background.
 4. CONSISTENCY: generate role-mafia first, then pass it as a STYLE REFERENCE IMAGE ("match the style of the attached image") for all other role cards and backgrounds. All 12 avatars come from ONE sheet.
 5. FALLBACK: if generation is unavailable or fails 3 times for an asset, draw a clean procedural SVG in code with the same palette, convert it, note it in DECISIONS.md. Never stop to ask me.
 6. Size budget: every final file under 150 KB (backgrounds under 300 KB). Do all of MA in one go and stop only at the end.

14.2 STYLE BLOCK (prepend verbatim to EVERY image prompt)
"STYLE: minimalist noir vector-style illustration, flat clean shapes, subtle film grain, high contrast, strong silhouettes, limited palette: near-black #08090D, blood red #E5383B, off-white #F4F6FA, bluish-black navy #0E1A2B with electric blue accent #5B8CFF, warm sand #C9B79C, muted gold #D6B15E. No text, no letters, no numbers, no watermark, no photorealism, no busy details."

14.3 PROMPTS (each = STYLE BLOCK + text)
 logo-mark (1:1): "A square app logo mark: a minimalist half-face silhouette wearing a fedora hat, one eye slit glowing blood red, rest near-black with off-white outline, centered, lots of padding, on a solid flat #FF00FF background."
 role-mafia (3:4): "Portrait role card illustration, MAFIA: a shadowy figure in a long coat and fedora, face hidden in shadow, holding a single red rose behind the back, dominant colors blood red and near-black, centered, plain dark background with a faint red glow."
 role-doctor (3:4): "Portrait role card illustration, DOCTOR: a calm figure in a long off-white coat with a round head mirror, holding a small medical bag, dominant colors off-white and near-black, soft white glow behind, centered, minimal."
 role-police (3:4): "Portrait role card illustration, POLICE DETECTIVE: a figure in a trench coat and flat cap holding a magnifying glass, dominant colors bluish-black navy and electric blue highlights, subtle blue glow behind, centered, minimal."
 role-civilian (3:4): "Portrait role card illustration, CIVILIAN: an ordinary townsperson in a simple coat holding a lantern, warm sand tones on near-black, centered, minimal, peaceful."
 role-godfather (3:4): "Portrait role card illustration, GODFATHER: a heavy-set silhouette in a pinstripe suit seated in an armchair, a cigar glowing red, red and near-black, minimal."
 role-vigilante (3:4): "Portrait role card illustration, VIGILANTE: a masked figure with a hat pulled low holding a single revolver, desaturated blue-gray with one red accent, minimal."
 role-jester (3:4): "Portrait role card illustration, JESTER: a three-pointed jester hat and half mask, muted gold and violet on near-black, playful but minimal."
 role-god (3:4): "Portrait role card illustration, GOD / NARRATOR: a giant open eye above a tiny town at night, muted gold lines on near-black, minimal and mystical."
 bg-night (3:4 portrait, works on desktop with object-cover + dark gradient): "Background: a small sleeping noir town at night seen from a distance, a full moon at the top, dark rooftops in the bottom third, a few tiny warm lit windows, deep near-black navy sky, very low detail, large empty dark area in the middle for UI overlay, no characters."
 bg-day (3:4 portrait): "Background: the same noir town at dawn, soft amber sun rising at the top, rooftops in the bottom third, muted desaturated warm-gray and amber palette, large empty area in the middle for UI overlay, no characters."
 avatar-sheet (4:3): "A 4 columns x 3 rows grid sheet of 12 different anonymous noir character avatars, bust portraits, each with a different hat/hair/accessory (fedora, beret, bowler, round glasses, scarf, flat cap, cloche hat, bandana, eyepatch, top hat, headscarf, bald with mustache), faces simplified with no detailed features, each on its own solid dark-gray circle, perfectly even spacing, identical style and size, no borders between cells, no text."
 og (1.91:1): "Social share banner: fedora silhouette with a glowing red eye on the left, large empty near-black space on the right for text, minimal."

14.4 FINAL FILES (exact paths; use next/image)
 public/assets/logo-mark.png (512, alpha) | app/icon.png | app/apple-icon.png
 public/assets/roles/{mafia,doctor,police,civilian,godfather,vigilante,jester,god}.webp (480x640)
 public/assets/bg/{night,day}.webp (1080x1440)
 public/assets/avatars/1..12.webp (256x256)
 public/assets/og.png (1200x630), wired into Next.js metadata (openGraph + twitter)
Win banners, eliminated slash and card back are drawn in code (section 12-13); no images. UI icons: lucide-react only. Every <Image> has a graceful fallback (coloured circle + lucide icon) if the file fails.

==================================================
15. FILE MAP (target; merge rather than add)
==================================================
```
app/ layout.tsx, globals.css, page.tsx (home), room/[code]/page.tsx (host/client bootstrap + phase switch), manifest.ts, icon.png, apple-icon.png
components/ ui.tsx (primitives: Button, Card, Modal, Sheet, Chip, Badge, Switch, Stepper, Kbd, Toast, Avatar) | HelpSheet.tsx (unified Role Info, Rules, Log, Notes, Keys) | TopBar.tsx (role chip, guide button, timers, connection) | TargetPicker.tsx (universal targeting & voting) | Lobby.tsx | Night.tsx | Day.tsx | End.tsx | God.tsx
lib/ types.ts | content.ts (ROLES table + help text + shortcuts) | settings.ts (SETTINGS schema, presets) | shortcuts.ts (keyboard hook + registry) | motion.ts | sfx.ts (Web Audio synth) | net.ts (PeerJS WebRTC) | useRoom.ts | engine/rules.ts | engine/phases.ts | engine/view.ts
tests: lib/engine/engine.test.ts, lib/net.test.ts
scripts/process-assets.mjs | public/assets/... | DECISIONS.md | README.md
```
That is ~25 source files; strictly stay inside the section 0 budget (< 28 files, < 4,200 lines).

==================================================
16. MILESTONES (stop after each one; print the line-count check from section 0)
==================================================
M0. Scaffold Next.js + Tailwind + framer-motion, design tokens, fonts, `components/ui.tsx` (primitives incl. Kbd, Sheet, Modal), `lib/content.ts` (all role & help text), `lib/shortcuts.ts` (keyboard registry and hook), `HelpSheet.tsx` (Basics, Roles, Keys tabs working; quick dismiss via ✕, Esc, backdrop, swipe; desktop drawer & mobile sheet), styled Home page with Create/Join, `?` / `H` button + `Esc` working, .env.example, README skeleton. `npm run build` passes.
MA. ASSET GENERATION (section 14): generate, process, check contact sheet yourself, wire og + icons + manifest. `npm run build` passes.
M1. Pure ENGINE + `engine.test.ts`. All 7 roles and ALL on/off combinations: settings validation, role assignment (random + manual), `resolveNight` (kill modes, fallback, doctor saves, vigilante shots, police delays), vote tallying (all tieRules), instant Jester win check, win detection, `buildViewFor` secret filtering. `npm test` passes.
M2. NETWORK & LOBBY. `lib/net.ts`, `useRoom.ts`, host store, tick worker, wake lock, single-host guard + `net.test.ts`. Full Lobby: Roles panel, settings schema rendering, presets, validation, share link + QR, kick, God toggle, persistent top bar with role chip placeholder and connection chip, all connection screens, lobby shortcuts (`Shift+Enter`, `Shift+C`, `Ctrl+Enter`), help sheet tabs (Roles, Rules, Notes, Log) live.
M3. GAME ONBOARDING & NIGHT. Start game, role assignment, RoleReveal hold-to-flip 3D card + automatic Role Briefing Card ("What you do tonight", "How to win", tips, dismiss via ✕ / Got It / Esc / swipe / 12s auto-dismiss), persistent header role chip for instant 1-tap role info at any time, hold `R` quick role peek HUD, Night screens via generic `TargetPicker` for all active roles + Decoy for Civilians/Jester, intent handling with optimistic UI, tick/advance, Morning announcements, night shortcuts.
M4. DAY, VOTING & SPECTATOR LOUNGE. Discussion, chat channels, Voting via `TargetPicker`, live tally bars, VoteResult elimination, Graveyard Lounge for dead players with Dead Chat and optional role reveals (`deadSeeRoles`), win detection (Town, Mafia, Jester celebration), GameOver recap timeline, Play Again button, voting & discussion shortcuts (`V`, `S`, `C`, `1-9`).
M5. GOD CONTROL ROOM. All control buttons + shortcuts (`Shift+N`, `Shift+E`, `Shift+P`, etc.), live action view, manual assignment UI, force controls, pause/extend.
M6. POLISH, PROCEDURAL SFX & ACCESSIBILITY. Framer Motion transitions, Web Audio procedural sounds (`lib/sfx.ts`), desktop `<Kbd>` badges, accessibility pass (focus trapping, ARIA live region, reduced motion), mobile QA, host-away pause/resume polish, final line-count check.
M7. DEPLOYMENT READINESS. README (Vercel deployment instructions), optional TURN setup, self-test verification checklist across all roles and reconnect scenarios.

==================================================
17. DO NOT
==================================================
- Do NOT add any database, Redis, Pusher, Socket.io, API routes, serverless functions, or the Edge runtime.
- Do NOT add libraries beyond section 1, or any state-management/UI/form library.
- Do NOT hand-write per-role screens or per-setting form fields; use the tables (section 0).
- Do NOT put prose text inside components; text lives in `lib/content.ts` and `lib/settings.ts`.
- Do NOT send secrets (roles, picks, other players' tokens) to a client, in a URL, or to console.log.
- Do NOT trust any client message for role, phase or alive status; validate on the host. Clients never advance phases.
- Do NOT use Math.random or Date.now inside lib/engine.
- Do NOT store game state in client localStorage (only playerId/token/name/avatar/sound/notes/help prefs). Only the HOST stores full state.
- Do NOT use main-thread setInterval as the host's only timer (use the Web Worker tick).
- Do NOT show UI, steps, help entries or log lines for a role that is disabled in this game.
- Do NOT add features outside this spec without writing them in DECISIONS.md first.

START NOW with Milestone 0 only.
