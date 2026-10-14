# UI Overhaul Prompt v2 — "Mafia: Shadows of the City"

**Role.** You are a senior product designer + front-end engineer. Redesign the **presentation layer only** of this peer-to-peer Mafia game so it feels like a premium, atmospheric, hand-crafted game, not a developer console and not a generic AI-generated template.

**Status of the game: the gameplay, networking and settings are verified working perfectly. The ONLY thing being changed is how it looks, feels and is laid out.** Treat every behavior you see today (including small ones like Back being click-to-go-back / hold-to-see-history, the hold-to-view privacy shield, Shift+N fast-forward, awards, the PNG match docket, career stats, voice chat) as a requirement to preserve, not a suggestion to redesign away.

**Ambition level.** The target is not "cleaner". It is *"I want to open this and immediately want to play"*: a game with a point of view, memorable moments and real craft, at the level of a well-made indie game or a premium board-game adaptation. Be bold in art direction, strict in restraint, and zero-tolerance for generic template looks.

**Hard constraint, read twice.** The backend / game engine / networking must remain **100% intact**. This is a re-skin and re-layout of what the player sees and touches. If you break a rule, message, state transition, or setting, you have failed, no matter how pretty the result is.

> If this file is used alongside `MAFIA_IMPLEMENTATION_SPEC.md`: **this document wins on look, feel, layout, typography, color, 3D and information density.** The spec still wins on networking, reconnect, security, settings propagation, testing and audit rules. Do not skip the spec's testing mandate (Section 8 of that file).

---

## 0A. PRESERVATION MANDATE: change the UI, keep EVERYTHING else (read before anything)

**The person who owns this game has told you plainly: the game works perfectly. Redesign how it looks and is laid out. Do not remove, break, rename, simplify or "improve" any feature.**

Important: the author of this brief has only seen a handful of screenshots. **This document does NOT list every feature the game has.** Treat every feature name in this document as an *example*, not the full list. There are certainly features, settings, shortcuts, roles, dialogs, edge-case behaviors and hidden panels that nobody mentioned here. **All of them must survive.** If you find something that is not described in this document, the default is: **keep it, keep it working exactly as before, and give it a well-designed home in the new UI.**

**The golden rule: "show less" means RELOCATE, never DELETE.**
Whenever this document says remove, hide, cut, collapse, move to a drawer, or "show only what's needed", it means: take it off the default surface and put it one tap away (menu, sheet, drawer, long-press, host-only section, debug section). The feature, its logic, its state and its keyboard shortcut must continue to exist and work identically. A control may disappear from the default screen only if it has a documented new location in the Feature Parity Matrix (below).

**Step 1 (mandatory, before designing anything): build the Feature Parity Matrix.**
Create `FEATURE_PARITY_MATRIX.md`. Discover features from the **code and the running app**, not from this document:
- Read the router/pages, every component, every event handler, every store action, every message type, every settings key, every keyboard shortcut (`keydown` handlers), every `localStorage`/IndexedDB key, every feature flag/env var, every tooltip and `title`/`aria-label`.
- Run `git log` and skim past commits/PRs to find features added over time.
- **Click every button, open every menu, panel, modal, tab and sheet on every screen, as host and as non-host, in every phase, with every role,** at 4, 8 and 12 players; try long-press and hover behaviors, keyboard shortcuts, and right-click/context behaviors if any.
- Include non-visual behaviors too: reconnect, rejoin tokens, host migration, lock room, kick/ban, ready checks, timers and fast-forward, persistence, sound preferences, voice gating, QR join, link join, play-again, share PNG, stats, achievements, narrator/God mode, circle sitting, bot/test tools, any admin/debug features.
- For each feature record: **ID, name, where it lives today (screen/component/file), how to trigger it, who can use it (host/all/role/phase), what state/messages it touches, its test coverage, and where it will live in the new UI.**
- Features seen in screenshots that are **not** in this document's examples include, among others: **Circle Sitting** toggle, **Narrator (God) Mode** toggle, **Test Bots**, **Suggest Balanced**, role **presets** (Classic, Bare Bones, Detective's Game, Medic Only, Chaos), per-role counters/toggles (Mafia, Godfather, Doctor, Police, Vigilante, Jester, Civilian auto), **Lock Room**, **QR**, **Copy Link**, **Fast-Forward (Shift+N)**, **Role info (I)**, **Guide (H)**, hold-to-reveal with **Spacebar**, the **peek guard**, **Hold to View** shield, **Voice Chat**, sound toggle, **Back (click / hold for history)**, **Share Match Docket (PNG)**, **Career Dossier & Stats**, **Play Again (Keep Room)**, **Leave Room**, awards, **Timeline Ledger**. Assume there are more.

**Step 2: no feature without a destination.** Before writing UI code, every row in the matrix must have a "new location" and a "test that proves it still works". A row with an empty destination is a blocker: stop and fix the plan.

**Step 3: parity gate at the end.** Re-walk the matrix against the finished UI. For each row, record (a) screenshot or video of it working in the new UI, (b) the automated test or manual check that proves it, (c) pass/fail. **Any row that fails or is missing is a defect; the work is not done until the matrix is 100% green.** Include the matrix with evidence in `AUDIT_LOG.md`.

**Rules of thumb when in doubt:**
- Unsure whether something is a "real" feature? It is. Keep it.
- Unsure where it should go? Put it in the menu/sheet (host tools go in a host-only section, developer tools in a debug section), do not drop it.
- Dev-only or testing features (Test Bots, Fast-Forward, ping readout, debug panels) are **not deleted**: they are moved out of the player's default view into a clearly labeled secondary place (host menu or `?debug=1` / dev-environment flag), and remain fully functional so the owner can keep testing the way they do today. Do not decide on your own to strip them from the codebase.
- Unsure whether a behavior (timing, order, wording of a rule, shortcut key) matters? It does. Do not change it.
- Copy changes are allowed only for presentation text (labels, headings, marketing lines). **Never change rule text, role descriptions' meaning, setting names that tests rely on, or any text that the game logic or tests read.** If you rename a label, keep the underlying key/id/test-id unchanged.
- Never change defaults, ranges, or the meaning of any setting.
- If a design idea in this document conflicts with preserving a feature, **preserving the feature wins**, and you note the conflict in `UI_CHANGE_REQUESTS.md`.

---

## 0. What exists today (observed from screenshots) and what is wrong with it

Current screens (all must be redesigned; discover any others in the code, e.g. the Career Dossier & Stats screen, kick/ban dialogs, QR modal, history sheet): Landing, Lobby (tabs: Roles Setup / Rules & Timers / Comms & Logs), Role Reveal (press-and-hold card, which is good), Night (square "seated arena" with avatars, left chat panel, right "dossier" and "event wire"), **Documentation & Rules Manual side panel** (tabs: Basics 1 / My Role 2 / Roles 3 / Rules 4 / Log 5, with a "Hold to View" shoulder-surf privacy shield and "Tactical Tips"; this is a **good feature, keep and elevate it**), the **audio overlay** (voice chat and sound controls; see 4.6), and **Game Over** (three columns: result + awards + actions / "True Identities Revealed" / "Timeline Ledger").

The look is a monochrome near-black UI with thin boxy panels, monospace micro-labels and dev-console copy ("DTLS Encrypted", "Social Deduction Protocol", "Encrypted Syndicate Wire", "Event Wire", "18ms"). It is clean but reads as a **tool**, not a **game**.

Specific problems to fix:

1. **Too much information at once.** Night screen shows: 8 header buttons (Back, Room, Lock Room, Copy Link, QR, Muted, ping, Fast-Forward, Role, Guide, sound), a chat panel, a dossier, an event wire, living/eliminated counters, a phase pill, a timer pill, an instruction banner, and the table. A player only needs: *what phase is it, how long is left, what can I do right now, who am I.*
2. **Lobby clutter.** Room code appears 3 times (header, card, URL), Copy Link and QR appear twice each, avatar picker is repeated from the landing page, and role setup is a long wall of toggles and steppers.
3. **The seating area is flat and dull.** A bordered square with small avatar boxes. It is the centerpiece of the game and has no atmosphere, depth, or life.
4. **Developer features leaking into the player UI.** "+ Test Bots (+3)", "[BOT]" name prefixes, "Fast-Forward Shift+N", ping in ms, "Direct P2P Mesh", "Peek guard ready", the Next.js dev badge. **Do NOT delete any of them.** Move them out of the default player view into a clearly labeled secondary place (a host-only menu section, or behind `?debug=1` / a dev-environment flag) where they keep working exactly as before, so the owner can keep testing the way they do today. (The Next.js dev badge is a framework dev indicator and disappears in production builds by itself.) (Also: the lobby shows `http://localhost:3000/room/…`. Build the join URL from the real origin, `window.location.origin` or a `SITE_URL` env var.)
5. **Layout bugs visible in the screenshots.** On the landing page the "or join with code" divider line and label are broken (the label wraps to two lines and the line sits misaligned). On the night screen the bottom of the page is cut off (chat input and role bar are clipped under the fold at ~1300 px height). Fix these.
6. **Color is absent, not designed.** Monochrome is fine as a base; it needs a deliberate, restrained palette to create mood and meaning (see Section 2).
7. **Header is overloaded on every screen**, including Game Over (Back, Room, Lock Room, Copy Link, QR, Voice Chat, ping, phase pill, Role, Guide, sound; the voice/sound controls belong in a proper audio control, see 4.6). Once the game has ended, room-management controls are noise.
8. **The Guide panel is useful but looks like documentation.** Title "Documentation & Rules Manual", plain tab strip with boxed number hints, a plain white "Hold to View" button, blurred text for the privacy shield, bullet-list tips. The idea is excellent; the presentation is a settings drawer, not a game's rulebook. The phase pill ("Night") floats in its header without explaining why.
9. **Game Over is three equal text-heavy columns** with a large empty middle and right column, tiny monospace labels ("OFFICIAL CITATIONS & AWARDS"), and a flat list for the reveal. The most emotional moment of the game (everyone finds out who was who) is presented as a spreadsheet. Also `[BOT]` prefixes appear in the recap.
10. **Type is default.** Everything is a neutral sans plus mono labels. It needs a real typographic identity (see Section 3).

Keep what already works: the **press-and-hold role card** concept, the minimal confidence of the dark base, the role-gated chat tabs, the clear one-line instruction pattern ("Tap any living player… to select your secret night target"). Evolve them, don't discard them.

---

## 1. Non-negotiable rules for keeping the backend intact

### 1.1 Architecture rule: UI reads, UI dispatches, nothing else
1. **Discover first.** Before changing anything, write `UI_ARCHITECTURE_MAP.md`: list every file that is *game logic / networking / state / message types / settings schema / persistence* (the "protected set") and every file that is *rendering / styling* (the "editable set"). Include the exact exported functions/hooks/stores the UI uses today to read state and perform actions.
2. **Protected set is read-only.** Do not edit protected files except for the explicit exception in 1.3. That includes: WebRTC/PeerJS/signaling code, message schemas and validators, reducers/state machines, role logic, vote/night resolution, timers, settings schema, reconnect, host migration, persistence/storage schemas.
3. **Add an adapter layer.** Create `src/ui/view-model/` (or the project's equivalent) with selector hooks like `useRoomView()`, `usePhaseView()`, `useSeatsView()`, `useMyRoleView()`, `useActionsView()` that **only read** from the existing store and **only call** existing actions. New components consume these hooks. This keeps the new UI decoupled and makes it obvious if you ever reach into the backend.
4. **No changes to wire format.** Message types, payload shapes, field names, ordering and timing of messages must be identical before and after.
5. **Preserve selectors and test hooks.** Keep every existing `data-testid`, `aria-label` that tests depend on, element ids used by tests, and keyboard shortcuts (`H` guide, `I` role info, `Shift+N` fast-forward, `Space` hold-to-reveal). If you restructure the DOM, re-attach the same test ids to the equivalent new elements.

### 1.2 Prove it with a contract test (mandatory)
- **Before** starting the redesign: run the full existing test suite and record results. Then record a **message transcript** of a scripted 4-player game (create, join, ready, start, role reveal, night actions, day, vote, game over) and a scripted 8-player game. Save as JSON fixtures (`tests/fixtures/transcript-before-*.json`), with timestamps and random ids normalized.
- **After** the redesign: replay the same scripted games (same seed, same inputs) and diff the transcripts. They must be **identical** (after normalization). Add this as an automated test (`contract-transcript.spec`) that stays in CI.
- Also snapshot the **store state shape** (keys and types) before/after. Identical.
- If you cannot make the game deterministic enough to diff, add a seeded RNG hook **in test mode only** (see 1.3) or compare the structural shape and ordering of messages instead, and document precisely what you compared.

### 1.3 The only allowed exception
If a UI need truly cannot be met without a backend change (e.g. a field the view needs is not exposed), do **not** edit the protected code freely. Instead:
1. Write the need in `UI_CHANGE_REQUESTS.md` (what, why, minimal additive change).
2. Implement a **UI-only workaround** first (derive it from existing state).
3. Only if a workaround is impossible, make a **minimal, additive, backward-compatible** change (new optional field/selector; never rename, remove or reinterpret existing ones), cover it with tests, and list it prominently in the final report.

### 1.4 Do-not-break checklist (run at the end, record in `AUDIT_LOG.md`)
Back (click vs. hold-for-history), Guide/Rulebook tabs and number shortcuts and Hold-to-View shield, awards, Share Match Docket PNG, Career Dossier & Stats, Play Again / Leave Room, voice chat states (off/muted/live, push-to-talk, per-player mute/volume, phase gating), sound/ambience/master volume and mute persistence, Fast-Forward (Shift+N), host/non-host flows, room create/join by code and by link, lock room, ready states, role presets and custom distribution, every role's night action, vote tally (open/secret), win conditions, timers (including fast-forward), chat channels and gating, per-player color/avatar uniqueness, every setting actually affecting gameplay (settings-reflection matrix), reconnect, play-again, 4 / 8 / 12 players.

---

## 2. Visual direction: "Noir, lit by one lamp"

**Concept.** A smoky back room in a 1930s city. Almost everything is in shadow; a few warm pools of light tell you where to look. Premium, tactile, quiet confidence, like a good board game box or a film title sequence, not a SaaS dashboard, not a neon cyberpunk site.

**Reference.** The reference site is `https://mafia-5zh.pages.dev/`. Open it in a real browser first and study: its color temperature (its `theme-color` is a pale warm yellow `#fef08a`, which suggests warm, light accents), its spacing, hierarchy and how little it shows at once. **Take inspiration, do not copy**: no identical layout, copy, shapes or assets. Our identity must be our own.

### 2.1 Palette (restrained; color only ever *means* something)
Keep a near-black base and add a small warm/cool system. Define as CSS variables / design tokens; **no raw hex values in components.**

| Token | Hex (starting point; tune by eye on real screens) | Use |
|---|---|---|
| `--ink-950` | `#0A0B0E` | page background |
| `--ink-900` | `#101216` | surfaces |
| `--ink-800` | `#171A20` | raised surfaces |
| `--line` | `#262A33` | hairlines |
| `--bone` | `#ECE6D8` | primary text (warm off-white, not pure white) |
| `--bone-dim` | `#A39D90` | secondary text |
| `--lamp` | `#D9A441` | brass/amber: primary accent, CTA, day light, "your turn" |
| `--lamp-soft` | `#F0D79A` | highlights, pale lamp glow, focus rings |
| `--blood` | `#B3363B` (deep `#7E2327`) | Mafia, danger, elimination, votes against |
| `--night` | `#3E5A78` (deep `#16222F`) | night ambience, Police/investigation |
| `--verdigris` | `#5E8C7B` | Town, safe, Doctor, protection |
| `--plum` | `#7A5C86` | Jester only, used very sparingly |

Rules:
- **60/30/10.** Roughly 60% ink neutrals, 30% bone/dim text and lines, 10% accent. At most **two accent colors visible on any one screen** besides neutrals.
- **No gradients as decoration.** The only gradients allowed are *light*: lamp cones, vignettes, fog, glow falloff. No purple-to-blue gradients, no rainbow borders, no glow-on-everything, no glassmorphism.
- **Never rely on color alone.** Pair every color meaning with an icon/label/pattern (colorblind safe).
- **Contrast:** body text ≥ 4.5:1, large text ≥ 3:1 against its actual background, including over the 3D scene.
- **Phase moods** (drive via one `data-phase` attribute on `<html>` and CSS variables): *Lobby* warm dim; *Role Reveal* near-black with a single lamp pool; *Night* cool `--night` tint, lamp dimmed to a candle; *Day* warmer, lamp brighter, bone tones lift slightly; *Vote* lamp tight and hard on the accused, rest of room darker; *Game over* winner-colored light (blood for Mafia win, verdigris for Town win).
- **Per-player identity colors**: 12 muted "pin" colors, distinct in hue *and* lightness, **never** neon, used only as small rings/tokens/name pips, always paired with the seat number. Assigned uniquely per player (this was a previous bug area: see 7). Verify with a colorblind simulation.

### 2.2 Texture and surface language
- Surfaces are **matte**: hairline borders, tiny radius (2–6 px, one radius scale), generous padding. Think printed card stock and brass fittings, not frosted glass.
- Optional subtle paper/film grain (a tiny tiled PNG/SVG noise at ~3–5% opacity) on large background areas only, never behind body text, disabled under reduced-motion/low-power.
- A thin double-rule or "ticket stub" motif for dossier-style cards. Use rubber-stamp marks (e.g. "ELIMINATED", "SAVED") as the one recurring illustrative motif: rotated -4° to -8°, ink texture, slight misregistration. Make them SVG, not emoji.
- Iconography: one custom or single-source line-icon set at one stroke weight. **No emoji as icons.**

### 2.3 Banned (AI-slop) list
Neon glows and blobs, purple/blue/pink gradients, glassmorphism, emoji icons, identical rounded-xl shadowed cards everywhere, centered-everything layouts, floating/pulsing decoration with no meaning, generic copy ("Unleash your inner detective"), stock sparkle particles, three-feature-card marketing rows, tech jargon as decoration ("DTLS", "Protocol", "Mesh", "Wire"). If a design decision exists only to "look cool" and communicates nothing, delete it.

### 2.4 Generated assets with Nano Banana (use when a custom asset is genuinely needed)
When the design needs an image asset that cannot be done well in CSS/SVG/code, **generate it with Nano Banana** (Google's Gemini image-generation model) instead of using stock images or leaving a placeholder. Check the current Gemini image-generation documentation for the up-to-date model id and SDK usage (at the time of writing the original is `gemini-2.5-flash-image`; newer "Nano Banana Pro" variants may exist and are preferable for higher fidelity and better consistency). Do not hardcode an outdated id from memory.

**Ready-made prompts:** use `ASSET_GENERATION_PROMPTS.md` (included alongside this file). It contains the style preamble, the style-anchor workflow and exact prompts for textures, role emblems, backdrops, empty states, stamp textures, the 12-avatar set and 3D concept references. Follow its workflow rules and acceptance checklist.

**Access and secrets**
- The API key comes from an environment variable (e.g. `GEMINI_API_KEY`) that the person running you provides. **Never commit it, never put it in client code or the browser bundle, never log it.** Generation runs only in a local/CI **build-time script** (`scripts/generate-assets.mjs`), never at runtime in the shipped app.
- If no key or access is available, **do not stall**: build the best procedural/CSS/SVG version, then list every missing asset in `ASSET_REQUESTS.md` with its exact prompt, size, format and where it plugs in, so it can be generated later without rework. The app must work with the fallback.

**Good uses (generate these)**
- **Textures/plates:** dark felt for the table top, subtle paper stock, aged card-back engraving pattern, film grain tile, wood/brass surface plates used as 3D textures or CSS backgrounds.
- **Illustrations:** role emblem art for the role cards (Mafia, Godfather, Doctor, Police, Vigilante, Jester, Civilian), a noir "back room" backdrop for the landing page and OG image, a winner/loser result backdrop for Game Over and the share docket, empty-state illustrations (no stats yet, no players yet).
- **Avatar set (optional upgrade):** a cohesive set of 12 stylized noir character portraits to replace the plain silhouettes, **keeping the same 12 avatar ids/indexes and file contract** so no stored profile or message changes. Fictional characters only: no real people, no celebrity likeness.
- **Concept/reference frames** for the 3D table (lamp, chairs, figurine design) to guide the procedural models. These are references, not shipped files.
- **Stamp and ink textures** (rubber-stamp edge, ink bleed, redaction bar texture) as alpha-ready PNG/WebP after cleanup.

**Do NOT generate (use code/SVG instead)**
- **Text of any kind**, including the MAFIA wordmark, phase banners and labels. Generated lettering is unreliable. The wordmark stays a hand-modified SVG (Section 3).
- **UI icons** (single consistent SVG icon set), **3D models** (build procedurally, or use CC0 GLBs), and anything that must be pixel-exact.
- Anything depicting real people, real brands, copyrighted characters, or other people's artwork.

**Consistency and quality bar (this is where AI assets usually become slop)**
1. Before generating anything, write `ART_BIBLE.md`: palette tokens (use the actual hex values), lighting rule ("single warm lamp from above, deep shadow, matte materials"), grain/texture rule, camera/composition rule, what to avoid (neon, purple glow, glossy plastic look, extra fingers/odd anatomy, random text, watermarks). Every generation prompt begins with the same **style preamble** derived from it.
2. Generate in **small batches** and review each against the art bible. Keep a **style anchor**: feed an approved image back in as a reference for later generations (multi-image prompting / editing) so the whole set looks like one hand made it. Reject and regenerate anything generic, plasticky, off-palette or inconsistent. Expect to iterate several times; a first output is rarely final.
3. **Post-process every asset** before it ships: color-grade to the palette (so it sits inside the tokens, not fighting them), crop to the exact aspect ratio, downscale to the real display size at 2x, strip metadata, and compress (WebP or AVIF, with PNG only where lossless alpha is required). Remember generated images generally have **no true transparency**: for cutouts, generate on a flat contrasting background and remove it with a proper matte/segmentation step, then verify clean edges on both light and dark backgrounds. Textures meant to tile must be checked for visible seams and fixed (offset/clone or regenerate).
4. **Budgets:** each illustration ≤ 150 KB, each texture ≤ 80 KB, the whole generated set ≤ 1.2 MB transferred; lazy-load below-the-fold and non-critical art; give every `<img>` explicit width/height and meaningful `alt` (decorative = empty alt).
5. **Provenance:** for each asset keep, in `assets/generated/MANIFEST.json`, the model id, date, final prompt, reference images used, seed if available, post-processing steps and output path; and list them in `CREDITS.md` as AI-generated (plus any third-party CC0 assets used). The generation script must be re-runnable so any asset can be reproduced or tweaked.
6. **Legal/safety check:** no text or logos baked in, no resemblance to real individuals or known characters, nothing that implies sexual or graphic violent content (stamps/figures stay stylized and tasteful), no embedded private data.
7. **Fallback:** every generated asset has a CSS/SVG fallback so the UI never shows a broken image or layout shift if the file fails to load.

---

## 3. Typography: give it a voice

Pick **one display face with real character**, **one highly readable UI/body face**, and **one mono** for codes only. Self-host via the framework's font loader (this looks like Next.js: use `next/font/local` or `next/font/google`), `font-display: swap`, subset to needed glyphs, preload only the display + body weights actually used. Verify licenses (SIL OFL / Fontshare free-commercial) and record in `CREDITS.md`.

**Do not just pick the first font you know.** Build a `/dev/type-specimen` page (dev only) that renders the wordmark, a phase banner, a role name, a player name, body copy, the room code and a timer in each candidate pairing, screenshot them, and choose by eye. Candidates (all freely licensed):

- **Option A, industrial Chicago-era:** Display: *Big Shoulders Display* (heavy weights, condensed, very city/noir). Body: *Instrument Sans* or *General Sans*. Accent/typewriter for dossier labels: *Special Elite*. Mono: *JetBrains Mono*.
- **Option B, editorial noir:** Display: *Fraunces* (variable, use the "soft"/"wonk" axes at high optical size for a distinctive, slightly strange serif) or Fontshare's *Gambetta* / *Zodiak* / *Erode*. Body: *Satoshi* or *Instrument Sans*. Mono: *IBM Plex Mono*.
- **Option C, art-deco marquee (use for the wordmark only, not body text):** *Limelight*, *Poiret One*, or *Bodoni Moda* in a heavy weight with tight tracking.

Rules:
- The **"MAFIA" wordmark should be custom**: start from the chosen display face, then convert to SVG outlines and **hand-modify** it (e.g. cut a slit highlight through the letters like light through blinds, give the "A" a pinstripe, tighten ligatures). Ship it as an inline SVG with `role="img"` and `aria-label="Mafia"`. It should be recognizable as *this* game.
- Type scale: define 6–7 steps (e.g. 12/14/16/20/28/44/72 px, fluid with `clamp()`). Display type is for: wordmark, phase banners ("NIGHT 2"), role names, verdict lines. **Everything else is body type.** Mono is for room codes, timers and seat numbers only.
- Small-caps / letterspaced micro-labels are allowed but **rare**; the current UI overuses tiny uppercase mono labels. Cut them by at least 70%.
- Minimum sizes: body 16 px on mobile; nothing readable under 12 px; inputs 16 px (prevents iOS zoom).
- Do **not** disable pinch-zoom.

---

## 4. Information design: show only what the moment needs

**Principle.** At any instant the player must answer in one second: **(1) What phase is it and how long is left? (2) What can I do right now? (3) Who am I?** Everything else is one tap away, not on screen.

### 4.1 Global in-game HUD (replaces the current 10-button header)
- **Top left:** a single menu button (hamburger or room-code chip). Opens a sheet containing: Room code + Copy link + QR, Lock room (host), Mute/Sound, Guide, Leave, host tools (Fast-Forward, kick) and, in debug only, ping and test tools.
- **Top center:** phase + round as display type ("Night · 2") with a slim circular or linear timer ring. Timer text appears only in the last 10 seconds or on tap/hover (the ring conveys the rest).
- **Top right:** a small **role chip** (icon + role name) showing your role. Tap/hold to peek the full dossier. Hold-to-peek, same safe pattern as the reveal card.
- **Back button behavior must be preserved exactly**: today it is click = go back, hold = see history (shown via a hover tooltip "Click to go back, hold to see history"). Hover tooltips do not exist on touch, so keep a small back chevron at top-left next to the menu, keep click vs. long-press semantics identical, and surface the long-press with a visible affordance (e.g. a brief progress ring while holding, then a history sheet). Do not change what the history shows or what back does.
- **Voice chat and sound** (already exist) become a single mic control plus an audio sheet, fully specified in **4.6**. Speaking is shown at the seat (a light ring), not as a header button. Behavior unchanged.
- Connection quality: hidden unless degraded. Then a small amber/red dot appears with tooltip. No "18ms".
- A **bottom action bar** that changes per phase and role (the *one* thing you can do): e.g. "Choose your target", "Confirm", "Cast vote", "Skip". Large, thumb-reachable on mobile.

### 4.2 Chat and logs become drawers
- Chat (Town / Mafia / Ghost) lives in a **slide-up drawer** (mobile) or a **collapsible side rail** (desktop) with an unread dot on its handle. It is closed by default at night for non-Mafia, and during voice-heavy play.
- Replace the permanent "Event Wire" list with a **single narrator caption line** at the top of the stage that fades in/out: "The town goes to sleep." / "A shot rings out." / "Raven was found dead." Full history is in a "Case file" drawer.
- Take the permanent "Living Suspects / Eliminated Players" counters off the stage and show **small pips** around the table instead (alive vs fallen). The exact counts remain available (e.g. in the Case Log or on tap).
- Replace the permanent dossier panel with the role chip + peek (and the Rulebook "Your Role" tab). All the same information remains reachable.

### 4.3 Screen-by-screen brief

**Landing**
- Remove the three marketing/feature cards and the technical subtitle text from the landing page (these are decorative copy, not game functionality). If any claim is kept elsewhere, make sure it is accurate.
- Keep: custom wordmark, one human sentence ("Lies, alibis, and one very long night. Play with friends, no signup."), avatar picker (compact, one row that scrolls on mobile), codename field, **Create New Game** (primary, lamp color), join-by-code (single inline field + button, fix the broken divider).
- Atmosphere: a quiet, slowly drifting 3D/2.5D scene behind: the table seen from above under a swaying lamp (reuse the game scene, low quality tier). Not a video, not a particle effect.
- Footer: tiny "How to play" link + `H` hint on desktop only.

**Lobby**
- Hero: the **room code** large (mono), with one **Invite** button (copy/share/QR in one sheet). Show the code once. Fix the localhost URL.
- Center: the **table with seats filling in** as players join (3D scene, empty chairs → occupied). Avatars arrive with a short settle animation. Ready state shown as a small lamp-lit/unlit indicator per seat.
- Host-only setup is a **"Game setup" side sheet** with three clean sections (Roles, Rules & Timers, Chat & Logs → rename to something human like "Table talk"). Roles as a compact "deck" of role cards with counters (tap to add/remove), the composition bar becomes a simple row of tiny role icons; presets as a segmented control. Non-hosts see a read-only one-line summary ("Classic · 1 Mafia, 1 Doctor, 1 Police · 60s nights") with a "View rules" link.
- Move "Test Bots" out of the main lobby flow into a host-only / debug section. **Do not delete the feature**; it must keep working exactly as today. Bot name prefixes are display-only: the stored/sent names stay unchanged.
- Start button: one large CTA at the bottom, disabled with a **human reason** ("Need 4 players, 3 ready.").

**Role reveal** (keep the concept; make it gorgeous)
- Full-screen dark stage with a single lamp pool on the card. Press-and-hold keeps working exactly as today (finger and `Space`). Card backs: engraved pattern in `--ink-800`/`--line`. Reveal: card tilts toward the viewer and flips (CSS 3D or in-scene), emblem + role name in display type, one-line objective, team color accent. For Mafia: teammates appear as small seat tokens after a beat.
- "I Understand My Role" becomes a single clear button; show who has confirmed as small lit pips around the table, not "Confirmed 1 / 4 Players" text.
- Remove the scrolling diagonal ribbons of text or make them extremely faint and static; they currently compete with the card.

**Night**
- Camera pulled to a moody top-down/three-quarter view; lamp dimmed, fog, cool light. One instruction line near the bottom ("Choose who to eliminate"). Players act by **tapping a seat figure**; a selection ring and a thin line/arrow from your token to the target; a Confirm button appears in the action bar.
- Non-acting roles see a calm waiting state ("The night is quiet…") with ambient motion only. Never reveal who is acting.
- Mafia chat is a drawer, not a permanent panel.

**Day / discussion**
- Lamp brightens, warm tone. Seats show tiny reaction/speaking indicators. Suspicion markers (if implemented) as small tokens. Timer ring only.

**Vote**
- Spotlight (lamp cone) swings toward the leading accused. Votes appear as small ink-stamp or token marks near the accused's seat. Your vote is a clear selected state. Tally as number + marks (not color-only). Open vs. secret ballot respected (never leak early).

**Dawn announcement / elimination**
- Short cinematic sequence: lamp flicker, narrator lines one by one, the fallen figure tips over / token turns face-down and a "ELIMINATED" stamp lands; role card flips face-up if the settings reveal roles on death. Keep total under ~6 s and skippable (tap).

**Game over** (existing data and actions stay: winner + flavor text, awards such as Lone Wolf / Silver Tongue, True Identities with survived/eliminated-round info, Timeline Ledger of secrets per round, Share Match Docket (PNG), Career Dossier & Stats, Play Again (Keep Room), Leave Room)
- **Make it a ceremony, not a spreadsheet.** Sequence (skippable by tap, ~8 s total, reduced-motion = instant final state):
  1. **Verdict beat:** the room goes nearly dark; the winner line lands in huge display type ("THE SYNDICATE WINS" / "THE TOWN SURVIVES") lit in the winner's color (blood vs. verdigris), with the one-sentence flavor line beneath it ("The syndicate has parity. Darkness reigns.").
  2. **The reveal:** the player cards/figures around the table **flip one by one** (eliminated first, survivors last) showing true roles, with a rubber-stamp status ("SURVIVED", "ELIMINATED · R2"). On desktop this happens on/around the 3D table; on mobile as a vertical stack of flipping cards. This replaces the flat "True Identities Revealed" list.
  3. **Settle into a calm results view** with only three things above the fold: the verdict, the revealed roster, and the **primary action**.
- **Awards** ("Lone Wolf", "Silver Tongue", etc.): shown as at most 2–3 **stamped citation tags** attached to the honored player's card, each with a one-line reason; a "See all awards" link if there are more. Keep the exact award logic/data.
- **Timeline Ledger** becomes a **vertical case-file timeline** in a drawer or a collapsed section ("Case file: what really happened"), one block per round with a night icon and a day icon, entries written as plain sentences using the same underlying data ("Night 1 — The Doctor protected hehee. The Police investigated hehee: Mafia."). Do not show it expanded by default; it is the "read it after" content.
- **Actions:** one dominant **Play Again (Keep Room)** button (lamp color; host/non-host behavior unchanged), then two quiet secondary buttons (**Share match docket**, **Career dossier**), then a text-only **Leave room**. Never show four equal-weight buttons.
- **Header at game over:** move room-management controls (Lock room, Copy link, QR, voice, ping) into the menu so the header is calm. They stay available and working.
- **Share Match Docket (PNG):** redesign the generated image as a poster-quality "case file": wordmark, winner verdict, roster tokens with roles, 1–2 awards, date, room code, site URL. Export both 1080×1350 and 1200×630. Ensure web fonts are loaded (`document.fonts.ready`) before drawing to canvas; handle long names; no private data that the game hasn't already revealed. The share logic/data stays; only the drawing code is restyled.
- **Career Dossier & Stats:** restyle as a personal **ID dossier**: avatar, codename, win rate, favorite role, streak, achievements as stamped badges. Local-only data, same sources, same numbers. Provide an empty state that looks intentional.

**Guide / Rulebook panel** (existing "Documentation & Rules Manual"; keep every tab and its content/logic, redo the presentation)
- **Keep:** the five tabs (Basics 1, My Role 2, Roles 3, Rules 4, Log 5), the number-key tab shortcuts, the `H` open shortcut, the phase indicator, the **Hold-to-View privacy shield** on My Role, the Tactical Tips, and the fact that the game keeps running behind the panel.
- **Rename for humans** (copy only, via the UI layer): "Documentation & Rules Manual" becomes **"Rulebook"**; tabs become **Basics, Your Role, All Roles, House Rules, Case Log**. Keep number hints as tiny keys visible on desktop only.
- **Form:** a right-side sheet on desktop (about 480–560 px wide, full height, with the table still visible and dimmed, not blacked out) and a full-height bottom sheet on mobile with a drag handle. Swipe left/right to change tabs on mobile. Focus-trapped, `Esc` closes, scrim click closes.
- **Context awareness:** the header shows a small **"Now: Night 1 · 0:34"** chip with the live timer (since the HUD timer is dimmed behind the scrim), and the tab opens by default to the most relevant page (Your Role during night/action phases, Basics in lobby). The panel must never hide a countdown the player needs.
- **Basics:** the three-beat loop (Night / Day / Vote) as a clean illustrated strip using the stage's lamp language (moon/candle, sun/lamp, stamp/gavel). One sentence each. No walls of text.
- **Your Role:** a **dossier card**: role emblem (custom SVG), role name in display type, team accent, then three short labeled rows (Night action, Victory goal, What you know). **Hold-to-View privacy shield redesigned**: instead of blurred text, show the content **redacted with black ink bars** (like a classified document) with a lamp-lit "Hold to read" tab; while held, the bars slide away; on release (or if the tab loses focus / pointer leaves) they snap back. Same behavior, much more on-theme. Keep Space/keyboard hold support and an accessibility "tap to toggle" option.
- **Tactical Tips:** presented as handwritten-style **margin notes** (typewriter or script accent face, slightly rotated, paper-tone card), max 3 tips, role-specific. Not a bullet list.
- **All Roles:** a swipeable/gridded deck of role cards; roles present in *this game's* composition first and highlighted, others dimmed with "Not in this game". Tapping flips a card to its description.
- **House Rules:** the *effective* settings of this room rendered as short human sentences with icons ("Night lasts 60s", "Votes are secret", "Dead players can read town chat"). Must reflect the actual live settings, not static copy.
- **Case Log:** a public event timeline (what everyone is allowed to know), styled as typed case-file entries; secret entries only appear when the existing logic reveals them (game over). Keep ordering and content identical.

### 4.4 One unifying idea: "the Case File"
Give the whole product a single, coherent conceptual thread so it doesn't feel like separate screens: **every game is a case file.** The Rulebook is the case file's manual, Your Role is your classified dossier, the Case Log is the evidence list, Game Over is "Case Closed" with a ledger, the Share image is the match docket, and Career Stats is your personnel file. Visual vocabulary that repeats across them: typewriter accent type for labels, paper-tone cards on dark felt, rubber stamps, redaction bars, paper-clip/tab details, one lamp. Use it consistently but sparingly. It is a *language*, not wallpaper: no fake coffee stains or random torn-paper everywhere.

### 4.5 Signature moments (the "insane" part, with restraint)
Design these **seven** moments with real care; everything else stays calm. Each has a reduced-motion version, is skippable where longer than 2 s, and never delays real game timers or logic:
1. **Opening:** landing page, a lamp clicks on over the table and lights the wordmark.
2. **Ready-up:** each joining player's figure sits down; when everyone is ready the lamp hums brighter, then the Start button becomes available.
3. **Role card ceremony:** the hold-to-reveal card (keep), upgraded with tilt, engraved back, emblem reveal and teammates appearing for Mafia.
4. **Lights out:** night begins, the lamp gutters to a candle, fog drifts in, figures lower their heads.
5. **Dawn:** the narrator speaks line by line, the fallen figure tips, an ELIMINATED stamp lands; or a quiet "no one died" with the lamp returning.
6. **The accusation:** the lamp swings onto the accused; vote tokens clack down.
7. **Case closed:** the verdict beat and card-flip reveal described in Game Over.
Rule: **at most one big moment per phase.** If it doesn't make the player feel something or understand something, cut it.

### 4.6 Audio overlay (voice chat + sound controls)
The app already has an **audio overlay** (reached from the "Voice Chat" button and the speaker icon in the header). I have not seen it, so **discover it first**: find every component, hook and state it uses (mic permission flow, mute/unmute, push-to-talk, per-player volume/mute, speaking detection, sound/music/volume toggles, host mute-for-all if present, connection states) and list it in `UI_ARCHITECTURE_MAP.md`. **All audio behavior, WebRTC audio wiring, permissions logic, gating rules (who can talk/hear in which phase) and persisted preferences stay exactly as they are.** Only the presentation changes.

**Goals.** Make audio feel like a built-in part of the table, not a floating debug panel: quick to reach, impossible to misread ("am I live right now?"), and out of the way the rest of the time.

**Design.**
1. **Two layers, never mixed:**
   - **Always-visible mic control** (a single round button in the bottom dock on mobile / near the table on desktop) with three unmistakable states: **Off** (not joined to voice), **Muted**, **Live**. Live state = lamp-colored ring that gently breathes with your input level; muted = struck-through mic in neutral tone; off = hollow. State is conveyed by icon + label + ring, never color alone. Tap toggles mute; long-press or a small chevron opens the audio sheet.
   - **Audio sheet** (the "overlay"): a compact bottom sheet on mobile / popover anchored to the mic button on desktop. Opens fast, closes on outside tap or `Esc`, focus-trapped, never covers the timer or the action bar permanently.
2. **Audio sheet contents (show only what exists today; group and simplify):**
   - **Top:** big mic toggle with live input meter (a thin level bar), plus **Push-to-talk** switch if supported (with the key shown on desktop).
   - **People:** a clean list of players with avatar, name, **speaking indicator**, and per-player mute/volume where it exists today (slider hidden behind a tap on the row, to keep the list calm). Dead/ghost status shown with the same stamp language. Players who cannot be heard in the current phase (e.g. night rules) appear dimmed with a short reason ("Asleep", "Ghost").
   - **Sound section:** master mute plus **Effects** and **Ambience** (and music if it exists) as simple sliders with a single speaker icon each. Persisted exactly as today.
   - **Help line (only when relevant):** headphones hint when playing in the same room, mic-permission-denied explanation with a clear "how to fix" step, "voice unavailable on this connection" message. Never show these when everything is fine.
3. **At the table (replaces header clutter):**
   - The **speaking indicator lives on the seat** (a soft light ring/halo on the figure and a tiny waveform under the name), driven by the existing audio-level data, throttled to ~10 Hz, with a hysteresis so it doesn't flicker.
   - A **phase-aware status line** near the mic button, e.g. "Night: voice is off for town" / "Syndicate channel: live" / "You are a ghost: only ghosts can hear you". Text must come from the real gating state, never hard-coded assumptions.
   - Ambient sound ducks visually too: a tiny "ducked" glyph on the sound control while someone speaks (only if ducking already exists).
4. **Style:** same Case File language as everything else (matte dark sheet, hairline rules, brass accent for live, oxblood only for errors/denied). A subtle **brass VU strip** instead of generic neon bars. No glowing equalizer blobs. Reduced-motion: meters become static steps; no breathing ring.
5. **States to design explicitly (no blank or default-browser looks):** permission prompt pending, permission denied, no microphone found, mic in use by another app, connecting, connected, reconnecting, failed with Retry, muted by host, voice disabled by room settings, too many players for voice (if there is a cap), and spectators/ghosts.
6. **Mobile specifics:** large 56 px mic button within thumb reach; safe-area padding; the sheet doesn't trigger the on-screen keyboard; screen never sleeps while live if the existing code requests a wake lock (don't add new behavior, just don't break it).
7. **Accessibility:** mic button has `aria-pressed` and a live-region announcement on state changes ("Microphone live", "Muted"); per-player controls reachable by keyboard; speaking state also available as text for screen readers (visually hidden "Raven is speaking", throttled).
8. **Header cleanup consequence:** relocate the standalone "Voice Chat" header button and the loose speaker icon from the HUD into the mic control and audio sheet (and the main menu has a link to it). Keep any keyboard shortcut that exists for mute/PTT.

**Verification specific to audio (add to the test plan):**
- Mic states and transitions: off → live → muted → live; permission denied path; no-device path (Chromium fake devices: `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`; for denied/no-device, override permissions/stub `getUserMedia` in the test).
- Per-phase gating matches the pre-redesign behavior exactly (night/day/ghost/Mafia channel): assert from inbound audio stats and from what the UI says; the status line must equal the real state.
- Speaking indicators map to the right seat for the right player in every peer's view; no flicker; no leaks (AudioContext/analyser count stable after 20 join/leave cycles).
- Sound preferences (master/effects/ambience) persist after reload and take effect immediately mid-game; mute really stops audio (spy on `play()`).
- Visual: screenshots of every state listed in point 5 at 390×844 and 1440×900, with and without 3D.
- Contract test (Section 1.2) must still pass: the audio redesign must not change any message or signaling traffic.

---

## 5. The 3D table (centerpiece)

**Goal.** Replace the flat square arena with a living scene that reacts to game state: a round table under a hanging lamp, figures seated around it, light and camera responding to phase. **It must be an enhancement**: the game must be fully playable without it.

### 5.1 Tech
- Stack: `three` + `@react-three/fiber` + `@react-three/drei` (the project looks like Next.js/React). Load the scene via `next/dynamic(..., { ssr: false })`, code-split, **lazy-loaded** after the page is interactive. Pin exact versions; justify bundle impact in `UI_ARCHITECTURE_MAP.md`.
- **Asset strategy, in order of preference:**
  1. **Procedural/primitive geometry** authored in code (table = lathe/cylinder with felt top and brass rim; chairs = simple extruded/curved shapes; figures = stylized "chess-piece/pawn" silhouettes built from capsule + sphere + cone with a hat/collar variation per player). This is license-free, tiny, and gives a cohesive, intentional look.
  2. **Textures generated with Nano Banana** (felt, wood, brass, paper; see 2.4) applied to the procedural geometry, then compressed (KTX2/WebP) and tiled without seams. Concept frames from Nano Banana may guide the *shape* of the lamp, chairs and figurines, but the shipped geometry is built in code.
  3. **GLB models** only if they clearly improve quality: CC0 sources (Quaternius, Kenney, Poly Haven). Compress (Draco/Meshopt, KTX2 textures). **Total 3D asset budget: ≤ 1.5 MB transferred.** Record every asset's license in `CREDITS.md`.
- Lighting: one warm point/spot "lamp" above the table (casts the pool of light), a very low ambient, optional cool rim light at night. Baked or soft shadows only. Optional lightweight post-processing (vignette; subtle bloom on the lamp only) **only if** the performance budget holds.
- Materials: stylized, matte, slightly rough. Avoid photoreal PBR overkill.

### 5.2 The scene reacts to the game (all driven by existing state via the view-model hooks)
| Game state | Scene response |
|---|---|
| Lobby | Empty chairs; each joining player's figure settles into a seat; ready = figure straightens / small lamp lights at seat |
| Role reveal | Lamp pool narrows; camera eases closer; other seats dim |
| Night | Lamp dims to candle level, cool rim light, light fog; figures slump/lower heads; camera slow drift |
| Night action (yours) | Seat figures become tappable; hover/selected ring; thin line from you to target |
| Day | Lamp swings brighter, warm; figures sit upright; subtle idle sway |
| Speaking (voice, if enabled) | Small light ring at that seat tied to audio level |
| Vote | Lamp swings to the accused; vote tokens stack on their side of the table |
| Elimination | Figure tips over or token turns face-down; seat dims; stamp overlay |
| Game over | Table lit in winner color; figures reveal role emblems |
| Player disconnected | Seat figure becomes desaturated/ghosted with a small "away" mark |

- **Player identity in 3D:** each figure carries the player's avatar (as a small flat badge/billboard or face-plane texture), a number plate matching the seat number, and the player's pin color on its base ring. Names are DOM labels projected to screen position (crisp text, accessible), not 3D text.
- **Seat layout:** reuse the project's seat-position logic or a pure function (`getSeatPositions(n)`) for 4–12 seats around a circle/ellipse. The local player is always at the bottom/front. Camera framing adapts for portrait phones (higher, more top-down) vs. desktop (three-quarter).
- **Camera:** gentle damped parallax from pointer (desktop) or device tilt (mobile, only after permission; optional). **No user orbit controls** during play (prevents confusion and cheating by looking away from the table). Dev-only orbit for debugging.

### 5.3 Accessibility and testability of a canvas
- The canvas is `aria-hidden="true"`. **Overlay real DOM controls** for every interactive seat: absolutely positioned transparent `<button>`s synced to each seat's projected screen position (or a visually-hidden ordered list), each with an accessible name ("Seat 3, Raven, alive, select as target"). This gives keyboard/screen-reader access **and** keeps Playwright tests able to click seats with the existing `data-testid`s.
- Keyboard: arrow keys/Tab move between seats; Enter selects; Esc cancels.

### 5.4 Performance and fallbacks (mandatory)
- **Quality tiers** (auto-detected, user-overridable in settings): *High* (shadows, post-fx), *Medium* (no post-fx, simpler shadows), *Low* (flat lighting, fewer details), *Off* (2D fallback).
- Auto-fallback to the **2D CSS table** (a well-designed top-down illustration with the same seat layout, lamp pool via radial gradient, same state reactions via CSS) when: WebGL unavailable, `prefers-reduced-motion`, "Low power/data saver", `deviceMemory`/core count below a threshold, frame rate stays under ~30 fps for 3 s, or the user picks Off. The 2D fallback must look intentional, not like a degraded afterthought.
- Cap device pixel ratio (≤ 1.5 on mobile), use `frameloop="demand"` / throttle when idle or tab hidden, pause rendering when the canvas is offscreen or the menu sheet fully covers it, dispose geometries/materials/textures on unmount (no leaks across games).
- Budgets: **60 fps target on a mid-range phone**, minimum 30 fps; main-thread long tasks ≤ 50 ms; first interactive UI **never blocked** by the 3D load (show the 2D table instantly, then crossfade to 3D when ready); LCP not worse than baseline by more than 10%.
- Context-loss handling: on WebGL context loss, switch to the 2D fallback and keep the game running.

---

## 6. Motion, sound and feel

- **Motion has meaning**: phase change (light shift + banner), selection (ring), vote (stamp), death (tip/flip), reveal (card flip). Durations: UI 150–300 ms; set pieces ≤ 1.5 s; whole dawn sequence ≤ 6 s and skippable. Animate `transform`/`opacity`; ease-out in, ease-in out.
- **Reduced motion**: replace camera drift, flips, flicker and stamps with instant states + brief outline highlights. Information is never lost. No logic waits on `animationend` (use timeouts/state so reduced-motion can't deadlock).
- **Sound (optional layer)**: if sound is added, route through a single manager, small assets, user-gesture start, mute toggle persisted, duck under voice chat. Licenses recorded. A phase-change cue, vote stamp, card flip and elimination knell are enough.
- **Micro-interactions**: buttons have real pressed states; seat hover/focus is obvious; tap targets ≥ 44 px; haptic ticks (where supported) on reveal and "your turn".

---

## 7. Known bug classes to guard against while restyling

Previous issues in this app: **all players showing the same color**, and **settings not reflected in actual gameplay**. A redesign touches exactly the code that renders these, so:
1. Per-player color/avatar/name/seat number must be read **per player from the roster**, never from a "local player" variable or a shared default. Add tests asserting uniqueness for 4, 8, 12 players **in every peer's view**.
2. Every host setting must still change real behavior. Re-run a settings matrix (each setting: default applied, change propagates to all peers, late joiner and reconnecting player get current value, and game behavior actually changes).
3. UI-only toggles (graphics quality, motion, sound, haptics) are **local preferences**, never broadcast, and must truly take effect immediately and persist.

---

## 8. Responsive and device targets

Design **mobile first**, then scale up. Test at: 360×640, 390×844, 768×1024, 1280×800, 1440×900, **2560×1300** (the screenshots were taken at roughly this width, so wide layouts must not stretch awkwardly; cap content width and let the 3D stage fill).
- Safe-area insets respected; no clipped bottom content (the current night screen clips the chat input and role bar).
- Landscape phones: HUD collapses to icons, table stays visible.
- No horizontal scroll anywhere. Long codenames truncate with ellipsis + accessible full name.
- Keep browser pinch-zoom enabled.

---

## 9. Implementation plan (in this order)

1. **Discover and baseline.** Build `FEATURE_PARITY_MATRIX.md` first (Section 0A): every feature, where it lives, where it will live, how it is tested. `UI_ARCHITECTURE_MAP.md` (protected vs editable files, store/actions used by UI). Run existing tests. Record **before** transcripts (1.2) and **before** screenshots of every screen at 390×844 and 1440×900.
2. **Design foundations.** Tokens (color, type, spacing, radius, shadow, motion), font loading, `data-phase` theming, icon set, base components (Button, Chip, Sheet/Drawer, Stamp, Seat badge, Timer ring). Write `DESIGN_NOTES.md` (palette with final hex values, font choice and why, motion rules). Build the dev-only type specimen and component gallery pages; pick fonts by eye. Then write `ART_BIBLE.md` and, where assets are needed, set up the Nano Banana generation script (2.4) with the style preamble; generate textures/illustrations in reviewed batches, post-process, and wire them in with CSS/SVG fallbacks.
3. **View-model adapter layer** (1.1.3) with unit tests.
4. **HUD + sheets + drawers** (4.1, 4.2); move dev features (kept fully working) into the host/debug section; fix the localhost URL; fix the clipped layouts.
5. **Landing and Lobby** (4.3), 2D table version first.
6. **Rulebook panel (4.3), Role reveal, Night, Day, Vote, Dawn, Game over ceremony, Share docket, Career dossier and the Audio overlay (4.6)** screens with the **2D table** fully working, with every state reaction. Ship-quality without 3D.
7. **3D scene** (Section 5) behind the lazy-loaded layer with tiers and fallbacks; connect to the same state reactions; DOM overlay controls.
8. **Polish pass**: motion, sound (optional), copy rewrite (human, dry, in-world, short), wordmark, OG image redesign to match.
9. **Full verification** (Section 10).

Commit in small steps (one screen or one system per commit), each commit leaving the game playable.

---

## 10. Verification: test everything, old and new

Do not claim anything is done without running it. Record evidence in `AUDIT_LOG.md` (commands, results, screenshots/video paths, bugs found and fixed, anything not verified).

0. **Feature Parity gate (Section 0A):** every row of `FEATURE_PARITY_MATRIX.md` re-verified in the new UI with evidence. 100% green is required.
1. **Contract test** (1.2): before/after transcripts identical for the scripted 4- and 8-player games; store shape identical. This is the proof the backend is intact.
2. **Entire existing test suite** passes (unit, integration, e2e). Do not delete or weaken tests; update only selectors, and only when a DOM change forces it, keeping `data-testid`s stable wherever possible.
3. **Multi-context Playwright e2e** (each context = one player), full game at 4 and 8 players: create → join via code and link → ready → start → role reveal (press-and-hold) → night actions for **every role** → dawn → day → vote (open and secret) → elimination → game over → recap → play again. Assert each player sees only what they should (role privacy, Mafia chat privacy).
4. **Settings reflection matrix** (every host setting and every local preference), per-player identity matrix (color/avatar/name/seat unique per peer view), reconnect mid-phase, host leaving, late join, lock room.
5. **3D and fallback testing**: run headless Chromium with software GL flags (e.g. `--use-gl=swiftshader --enable-unsafe-swiftshader`) to exercise the 3D path; run again with WebGL disabled to prove the 2D fallback works; force context loss; toggle quality tiers; toggle reduced motion. Confirm seats are clickable via DOM overlays in both modes.
6. **Visual regression**: screenshots of every screen × phase × viewport (list in Section 8) in both 3D and 2D modes. Review them yourself, and write down every ugly, confusing or janky thing you see and fix it (including inconsistencies between redesigned and untouched screens).
7. **Accessibility**: axe on every screen with zero serious/critical issues; keyboard-only full game; screen-reader labels on seat controls; contrast checks over the 3D background; colorblind simulation of player pin colors and role colors; reduced-motion run.
8. **Performance**: Lighthouse mobile before vs. after (no accessibility regression; performance within 5 points of baseline for non-3D screens); frame-rate sampling in the 3D scene on 4× CPU throttle; memory/GPU resource counts stable over 10 consecutive games (no leaks); bundle size report with the 3D chunk lazy-loaded.
9a. **Asset checks:** grep the repo and the production bundle for the API key and for `generativelanguage`/Gemini calls in client code (must be none); confirm every generated asset is within budget, seamless where tiled, clean-edged where cut out, has alt text/dimensions, and loads lazily; test with the images blocked to prove CSS/SVG fallbacks look intentional; view each asset on the real screen it ships in (not just in isolation) to confirm it matches the art bible.
9. **New-surface checks:** open the Rulebook in every phase (lobby, role reveal, night, day, vote, game over) and verify each tab's content matches the live game (effective House Rules vs. actual settings; Your Role matches the real role; Case Log shows only what is allowed), number-key shortcuts 1–5, `H`, `Esc`, focus trap, and that the live timer chip is correct. Verify the Hold-to-View shield on pointer, touch and keyboard, and that it re-redacts on release/blur/tab switch (and that another player's role never appears in the DOM). On Game Over verify awards, roster reveal, ledger content, Share PNG (both sizes, long names, fonts loaded), Career Dossier numbers match stored stats, Play Again resets state, Leave Room works, and non-host sees the same waiting behavior as before.
10. **Real-browser manual play** (do not skip, even if automation passes): open the app in a real browser at phone-size and desktop-size, play a full game with at least 4 browser contexts or devices, and write down what you *felt*: Is the next action always obvious? Is anything on screen that the player does not need right now? Does the table feel alive? Does it feel premium or generic?
11. **Information audit**: for each screen, list every element visible by default and justify it against "what phase / what can I do / who am I". **Move (never delete) anything that fails**, and make sure each moved item is recorded in the Feature Parity Matrix with its new location. Record the list.
12. **Final regression** (old features and new features together, and their interactions) on a **clean production build** and on the deployed preview URL.

### Definition of done
- **Feature Parity Matrix is complete and 100% green: every feature that existed before still exists, behaves identically, and has a documented place in the new UI.**
- Contract transcripts identical; all prior tests green; new tests green in CI.
- Every screen redesigned per Section 4, **including the Rulebook panel, the Audio overlay and the Game Over ceremony**, with the Case File language applied consistently, consistent tokens, custom wordmark, chosen fonts documented.
- Default screens show only what the moment needs; dev tools relocated out of the default player view but still working; localhost URL fixed; clipped layouts fixed.
- 3D table works with tiers and an intentional 2D fallback; game fully playable without WebGL.
- No axe serious/critical issues; reduced-motion respected; pinch-zoom works.
- Any generated assets follow 2.4 (art bible, consistent style, post-processed, within budgets, manifest and credits, no secrets in the repo or bundle, fallbacks in place).
- `AUDIT_LOG.md`, `DESIGN_NOTES.md`, `UI_ARCHITECTURE_MAP.md`, `UI_CHANGE_REQUESTS.md` (even if empty), `ART_BIBLE.md`, `ASSET_REQUESTS.md` (if any assets could not be generated), `assets/generated/MANIFEST.json`, `CREDITS.md` complete and honest ("not verified" is acceptable; false "verified" is not).

### Final report (the last thing you output)
Summarize: what changed visually, the font and palette chosen and why, how the backend was proven intact (contract test result), any approved backend exceptions (ideally none), performance numbers before/after, known limitations, and anything you would do next.
