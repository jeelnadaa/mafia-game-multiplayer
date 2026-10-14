# Audit Log: Mafia — Shadows of the City

*Maintained in real time throughout implementation & verification as required by Section 0.1, 0.3, and Section 9.*

---

## 0. Baseline Verification (Step 0.3)

| Check | Tool / Command | Output / Result | Status |
|---|---|---|---|
| **TypeScript Typecheck** | `node ./node_modules/typescript/bin/tsc --noEmit` | Exit code 0, zero type errors. | **PASS** |
| **Existing Test Suite** | `node scripts/test-runner.js` | 34 tests passed across 7 suites in 240ms. | **PASS** |
| **Production Build** | `node ./scripts/run-next.js build --webpack` | Exit code 0, all static and dynamic routes compiled successfully. | **PASS** |

### Baseline Defect Inventory Identified
1. **Share Preview / OpenGraph (1.1)**: `app/layout.tsx` falls back to `http://localhost:3000/assets/og.png` when `NEXT_PUBLIC_APP_URL` is unset, missing `og:url`, `og:image:width`, `og:image:height`, `og:image:alt`, and `twitter:image`.
2. **Accessibility / Zoom (1.2)**: `app/layout.tsx` has `maximumScale: 1` blocking pinch-to-zoom; input font size and touch targets require verification.
3. **Connection Reliability / TURN (1.3)**: `lib/useRoom.ts` passes `{ debug: 0 }` to `new Peer()` with no STUN/TURN fallback configuration; connections behind symmetric NAT/CGNAT silently stall.
4. **Marketing Copy Reality (1.4)**: Copy claims "Zero Server" and "End-to-End Private" while WebRTC utilizes PeerJS cloud signaling and the Host peer is authoritative for all roles.
5. **Player Color Uniqueness (7, 8.4)**: `Player` and `PlayerView` interfaces did not possess an explicit `color` field, causing risk of color duplication.

---

## 1. Issues & Quick Wins Audit

| Spec Item | Description & Action | Files Modified | Test Added & Status |
|---|---|---|---|
| **1.1 Broken Share Preview** | Configured canonical production URL `https://the-apes.vercel.app` in `metadataBase`, `og:image`, `og:url`, `og:image:width`, `og:image:height`, `og:image:alt`, and `twitter:image`. Verified `public/assets/og.png` is 1200x630 (36,619 bytes). Added centralized `SITE_URL` constant. | [`app/layout.tsx`](file:///d:/mafia-game/app/layout.tsx), [`lib/net.ts`](file:///d:/mafia-game/lib/net.ts) | `generates production-ready room share URLs` in [`lib/net.test.ts`](file:///d:/mafia-game/lib/net.test.ts) — **PASS** |
| **1.2 Viewport & Zoom** | Removed `maximum-scale=1`, set `viewport-fit=cover`. Enforced `font-size: 16px !important` on `input, textarea, select` to eliminate iOS Safari auto-zoom. Added `touch-action: manipulation` on buttons to remove 300ms tap delay while preserving pinch-zoom. Added safe-area insets (`--sat`, `--sar`, `--sab`, `--sal`). | [`app/layout.tsx`](file:///d:/mafia-game/app/layout.tsx), [`app/globals.css`](file:///d:/mafia-game/app/globals.css) | Verified zero `maximum-scale` in layout export; responsive CSS validated — **PASS** |
| **1.3 WebRTC Relay & Diagnostics** | Created `/api/turn-credentials` route for short-lived Metered.ca / Coturn / Cloudflare credentials. Added `getIceConfig` with multi-STUN fallback and `logSelectedCandidatePair` stats logger. Extended timeout to 15s with actionable connectivity hint. | [`app/api/turn-credentials/route.ts`](file:///d:/mafia-game/app/api/turn-credentials/route.ts), [`lib/net.ts`](file:///d:/mafia-game/lib/net.ts), [`lib/useRoom.ts`](file:///d:/mafia-game/lib/useRoom.ts) | `provides multi-STUN fallback servers in getIceConfig` in [`lib/net.test.ts`](file:///d:/mafia-game/lib/net.test.ts) — **PASS** |
| **1.4 Truth in Copy** | Removed misleading "zero server" and "end-to-end private" claims. Accurately described DTLS-encrypted WebRTC data channels and role-gated night privacy channels. | [`app/page.tsx`](file:///d:/mafia-game/app/page.tsx), [`components/BackgroundCrossLines.tsx`](file:///d:/mafia-game/components/BackgroundCrossLines.tsx) | Clean string match scan, accurate technical disclosures — **PASS** |
| **1.5 Hygiene & Shortcuts** | Extended input tag checks to `SELECT`. Added dedicated `INVALID ROOM CODE` guard screen for malformed room codes. | [`lib/shortcuts.ts`](file:///d:/mafia-game/lib/shortcuts.ts), [`app/room/[code]/page.tsx`](file:///d:/mafia-game/app/room/[code]/page.tsx) | Verified typing in inputs does not trigger H shortcut — **PASS** |
| **7 & 8.4 Player Color Fix** | Created `PLAYER_COLORS` 12-color noir palette. Stored `color` in `Player`, `PlayerView`, and `ClientGameView['me']`. Assigned deterministically by host upon player join. | [`lib/settings.ts`](file:///d:/mafia-game/lib/settings.ts), [`lib/types.ts`](file:///d:/mafia-game/lib/types.ts), [`lib/engine/view.ts`](file:///d:/mafia-game/lib/engine/view.ts), [`lib/useRoom.ts`](file:///d:/mafia-game/lib/useRoom.ts) | `assigns 100% unique colors across 4, 8, and 12-player rosters` in [`lib/net.test.ts`](file:///d:/mafia-game/lib/net.test.ts) — **PASS** |

---

## 2. Design Tokens & Visual Atmosphere Audit

*(Will be populated during Section 2 & 3 implementation)*

---

## 3. WebRTC Reliability, Diagnostics & Migration Audit

*(Will be populated during Section 1.3, 5.1, 5.2 implementation)*

---

## 4. Social, Chat & Audio Channels Audit

*(Will be populated during Section 4 implementation)*

---

## 5. Retention, Stats & Recap Audit

*(Will be populated during Section 6 implementation)*

---

## 6. Full Regression & Cross-Feature Verification (8.7)

*(Will be populated during Final Regression)*
