# 🎭 MAFIA: Shadows of the City

> **Real-time multiplayer WebRTC Mafia party game with Host-as-Server architecture, zero backend database, turn-by-turn nocturnal role progression, private role chats, and sleek noir aesthetics.**

---

## 🌟 Overview & Key Highlights

**MAFIA: Shadows of the City** brings the classic social deduction party game to modern browsers without requiring any backend database, cloud servers, or player logins.

- **Zero-Backend WebRTC Architecture**: One player hosts the game directly in their browser using PeerJS data channels. Fellow players join from phones, tablets, or laptops using a simple 5-letter room code or QR code.
- **Turn-by-Turn Sequential Night Turns**: Night phases advance systematically from role to role (**Mafia** ➔ **Doctor** ➔ **Police** ➔ **Vigilante**).
- **Fast-Advance Confirmation**: When all active players of a role confirm their action (e.g., both Mafia agree and confirm the kill), the timer immediately stops and advances to the next role!
- **Strict Role Privacy**: Doctor and Police identities and their nightly targets/suspicions are **100% confidential**. Sleeping players see a calm decoy screen with interactive touch pads to prevent screen peeking.
- **Private Role Channels & Public Town Hall**:
  - 🕶️ **Syndicate Chat**: Private frequency for Mafia during their nocturnal kill turn.
  - 🏛️ **Town Assembly Chat**: Unified common chat for all living players during Day Discussion and Town Voting.
  - 👻 **Graveyard Spirits Chat**: Private chat for eliminated players in the spirit lounge.
- **Full "Skip Vote" Support**: Players can vote to skip daytime elimination at any time (`S` key or UI button). If the town agrees, nobody is eliminated. Early vote conclusion triggers when all alive players cast their ballot.
- **Universal Role Guide & Keyboard Shortcuts**: Instant role peek (`Hold R`), role guide sheet (`H` or `I`), and complete desktop keyboard navigation (`1-9`, `0`, `S`, `X`, `V`, `C`, `Esc`, `Enter`).

---

## 🚀 How to Run the Website Locally

### Prerequisites
- **Node.js**: v18.17.0 or higher
- **npm**: v9.0.0 or higher

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

> 💡 **Windows exFAT Compatibility Note**:
> If running on Windows with an `exFAT` formatted drive (where Node's `fs.readlink` can throw `EISDIR` instead of `EINVAL`), all npm scripts automatically include our lightweight patch (`scripts/patch-exfat.js`). You can run `npm run dev`, `npm run build`, and `npm test` without any special flags!

### 3. Run Automated Tests
```bash
npm test
```
Runs the automated test suite verifying game rules, win conditions, role masking, private logs, turn progression, and protocol schema validation.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 🕹️ Step-by-Step Guide: How to Play

### Step 1: Create or Join a Room
1. **Host**: Click **"Create Game"** on the home screen. A unique 5-letter Room Code (e.g., `DARK1`) will be generated.
2. **Friends**: Open the site on mobile or desktop, click **"Join Game"**, enter the 5-letter Room Code, choose an avatar and name.
3. Friends can also scan the QR code or click the share link directly.

### Step 2: Customize Settings in the Lobby
The host can configure the room before launching:
- **Role Roster**: Enable/disable Godfather, Doctor, Police Detective, Vigilante, Jester, and configure Mafia count.
- **Presets**: 1-click presets: *Classic 6*, *Syndicate 8*, *Chaos 10*, *Speed 5*.
- **Timer Durations**: Night duration, Day Discussion duration, Voting duration.
- **Voting Rules**: Public vs Secret ballots, Tie-breaker rules (Revote, Random, No Elimination), Skip Vote toggle.
- **Moderator Mode**: Auto-moderator or manual God/Host control.

### Step 3: Role Reveal
- Every player receives a confidential role card.
- A non-blocking **Role Briefing Card** appears explaining victory goals and nighttime duties.
- Players can dismiss the card anytime (`Esc`, `✕`, or `Got It`), or press `I` to view the full interactive guidebook.

### Step 4: Nocturnal Phase (Sequential Turns)
Night falls on the city. The game progresses through secret role turns:
1. **Mafia Syndicate Turn ("Kill Mode")**:
   - Living Mafia players coordinate via their **Syndicate Secret Chat**.
   - Teammate picks update in real time on each Mafia member's screen.
   - When all alive Mafia select the agreed target and click **"Confirm Kill"**, the night timer immediately stops and advances to the next role!
2. **Doctor's Clinic Turn**:
   - The Doctor secretly selects one player to shield from harm tonight and clicks **"Confirm Protection"**.
   - Timer stops immediately upon confirmation and advances.
3. **Police Department Turn**:
   - The Police Detective selects a suspect to investigate and clicks **"Confirm Investigation"**.
   - The investigation result is delivered exclusively to the detective's confidential dossier.
4. **Vigilante Turn** (if enabled & has ammo):
   - The Vigilante can aim at a suspect or click **"Hold Fire"** (`X` key) and confirms.
5. **Decoy Sleeping Screen**:
   - Any player whose role is not currently active (Civilians, Jesters, or sleeping roles) sees a tranquil moonlit screen with a harmless decoy touch pad.
   - Identities, choices, and investigations are **100% invisible** to everyone else.

### Step 5: Dawn & Day Discussion
- Morning news announces if anyone was eliminated during the night.
- If the Doctor saved a victim, the news reports: *"A citizen was attacked in the dark, but was shielded by a Doctor!"* (The identities of both the doctor and the target remain completely secret).
- Living players enter the **Town Assembly Chat** to share clues, accusations, and alibis.
- Players can click **"Ready to Vote"** (`V` key). Once all alive players are ready, the discussion phase skips directly to voting!

### Step 6: Town Vote & Skip Vote
- Each living citizen votes for a prime suspect or chooses **"Skip Vote"** (`S` key).
- A live progress tally displays vote distribution including the Skip Vote count.
- **Early Conclusion**: When all alive players have voted or chosen skip, the vote concludes early (1.5s grace period).
- If "Skip Vote" receives the plurality, the town spares everyone and advances to the next night.

### Step 7: Verdict & Rematch
- The elimination verdict is revealed with dramatic gavels.
- Win conditions are evaluated:
  - **Town Wins**: When all Mafia are eliminated.
  - **Mafia Wins**: When Mafia equal or outnumber Town.
  - **Jester Wins**: If the town votes out the Jester during the day.
- The host can click **Rematch** to return everyone to the lobby with the same players!

---

## 🔒 Confidentiality & Private Chat Architecture

| Channel | Who Can Read | Who Can Post | When Active |
| :--- | :--- | :--- | :--- |
| **`mafia`** (Syndicate) | Living Mafia + God | Living Mafia + God | Night Phase (Kill Mode) |
| **`public`** (Town Assembly) | All players | Living players + God | Daytime (Discussion & Voting) |
| **`dead`** (Graveyard) | Eliminated players + God | Eliminated players + God | Any time |
| **`god`** (Narrator) | God + Host | God + Host | Any time |

- **Zero Data Leakage**: Player state views are strictly projected through `buildViewFor()`. Secret roles, tokens, police inboxes, and doctor logs are never transmitted over the network to unauthorized peers.

---

## 🎭 Roles Overview

| Role | Team | Night Action | Victory Condition |
| :--- | :---: | :--- | :--- |
| **Mafia** | 🔴 Mafia | Conspire and confirm nocturnal kill | Equal or outnumber Town |
| **Godfather** | 🔴 Mafia | Leads kill vote; appears as innocent to Police | Equal or outnumber Town |
| **Doctor** | 🟢 Town | Shields one citizen from elimination tonight | Eliminate all Mafia |
| **Police Detective** | 🟢 Town | Investigates suspect alignment (confidential dossier) | Eliminate all Mafia |
| **Vigilante** | 🟢 Town | Armed citizen with limited bullets (or Hold Fire) | Eliminate all Mafia |
| **Civilian** | 🟢 Town | Sleeper at night; deduces and votes by day | Eliminate all Mafia |
| **Jester** | 🟣 Neutral | Traces suspicion onto themselves | Get voted out by the Town |

---

## ⌨️ Universal Keyboard Shortcuts

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `1` – `9`, `0` | Night / Voting | Select target player on grid |
| `S` | Town Voting | Cast **Skip Vote** |
| `X` | Vigilante Turn | **Hold Fire** tonight |
| `Enter` / `Y` | Action Confirmation | Confirm selected action / dialog |
| `V` | Day Discussion | Toggle **Ready to Vote** |
| `Hold R` | Any time | **Peek Role HUD** (release to hide) |
| `H` or `?` | Any time | Open **Interactive Game Guide** |
| `I` | Any time | Jump directly to **"My Role"** guide |
| `M` | Any time | Toggle Audio Mute / Unmute |
| `C` or `/` | Day / Mafia Night | Focus Chat Input |
| `Esc` | Any time | Dismiss dialogs, briefings, or cancel target |
| `Shift + Enter` | Lobby | Toggle Player Ready |
| `Ctrl + Enter` | Host Lobby | Start Match |
| `Shift + N` | God Mode | Advance to Next Phase immediately |
| `Shift + Space` | God Mode | Pause / Resume Timer |

---

## 🛠️ Tech Stack & Philosophy

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React 18, TypeScript)
- **Styling**: Vanilla Tailwind CSS with customized Noir dark palette, glassmorphism, and HSL tokens.
- **P2P Networking**: [PeerJS](https://peerjs.com/) WebRTC data channels with authoritative host tick.
- **Animations**: [Framer Motion](https://www.framer.com/motion/) spring physics and layout transitions.
- **Audio**: Web Audio API oscillator synthesis (pure code, zero audio asset downloads).
- **Icons**: [Lucide React](https://lucide.dev/).
- **Testing**: [Vitest](https://vitest.dev/).

---

## 🌐 Deploying to Vercel or Self-Hosting

Because **MAFIA: Shadows of the City** operates peer-to-peer using WebRTC data and media channels, deployment is zero-maintenance with no stateful database:

1. Push your code to GitHub.
2. Import the repository in [Vercel](https://vercel.com) (or deploy via Next.js standalone).
3. (Optional, recommended for mobile networks): Add TURN Relay environment variables below.
4. Click **Deploy**.

### Environment Variables (Optional TURN Relay)

For mobile networks and carrier-grade NATs (CGNAT), configuring a TURN relay ensures 100% peer connectivity across restrictive networks:

| Variable | Description |
|---|---|
| `METERED_API_KEY` | Metered.ca API Key for on-demand short-lived TURN credentials via `/api/turn-credentials`. |
| `NEXT_PUBLIC_APP_URL` | Canonical deployment URL for OpenGraph and room share generation (default: `https://the-apes.vercel.app`). |
| `CLOUDFLARE_CALLS_TOKEN` | (Optional) Cloudflare Calls TURN token. |

If no TURN key is provided, the application automatically falls back to 4 globally distributed STUN servers (`stun.l.google.com:19302`, `stun1.l.google.com:19302`, `global.stun.twilio.com:3478`, `stun.cloudflare.com:3478`).

---

## 🔐 Trust Model & Known Limitations

- **Peer-to-Peer Hub Architecture**: One player acts as the room host and authoritative state machine. All peer traffic is encrypted in transit over WebRTC DTLS data channels.
- **Role Isolation**: The host selectively projects private data slices using `buildViewFor()`. Non-host peers receive only their own role and authorized intel. Because the host runs the engine, the hosting browser technically holds match state; for casual party games with friends, this eliminates server hosting costs entirely.
- **Zero Signup & Privacy**: All career dossiers, wins/losses, and preferences are stored exclusively on your device in `localStorage`. Zero analytics, zero trackers.

---

## 🧪 Testing & Verification

```bash
# Run unit & integration test suites
node scripts/test-runner.js

# TypeScript validation
node ./node_modules/typescript/bin/tsc --noEmit

# Production build check
node ./scripts/run-next.js build --webpack
```

