# Asset Requests & Generation Catalog

This document catalogs generated asset requests, fallbacks, prompts, and pipeline integration points per Section 2.4 of `UI_OVERHAUL_PROMPT.md` and `ASSET_GENERATION_PROMPTS.md`.

## 1. Asset Status Overview

All visual elements currently render with pure CSS, SVG vectors, and procedural Web Audio synthesizers. If Nano Banana or Gemini Image Generation API credentials are supplied in build pipelines (`GEMINI_API_KEY`), the following batch assets can be generated and optimized using `scripts/process-assets.mjs`.

| Asset ID | Target Path | Dimensions | Target Format | CSS/SVG Fallback Status | Description |
|---|---|---|---|---|---|
| **TEX-01** | `public/assets/bg/felt-noise.webp` | 512x512 (tileable) | WebP (≤ 80 KB) | **Active**: SVG noise + CSS radial gradient | Smoky green baize / felt texture with subtle fiber texture |
| **TEX-02** | `public/assets/bg/paper-grain.webp` | 512x512 (tileable) | WebP (≤ 80 KB) | **Active**: CSS `--bone` matte card stock | Aged 1930s manila case file card stock with subtle paper grain |
| **ILL-01** | `public/assets/bg/noir-room.webp` | 1920x1080 | WebP (≤ 150 KB) | **Active**: Pure CSS chiaroscuro lamp cone + fog | Moody 1930s precinct interrogation room with overhead green-shaded pendant lamp |
| **ILL-02** | `public/assets/bg/case-closed-mafia.webp` | 1200x630 | WebP (≤ 150 KB) | **Active**: CSS Blood vignette + rubber stamp | Crime syndicate triumph backdrop with ominous shadow |
| **ILL-03** | `public/assets/bg/case-closed-town.webp` | 1200x630 | WebP (≤ 150 KB) | **Active**: CSS Verdigris / dawn horizon + stamp | Dawn breaking over art deco skyscraper silhouettes |
| **EMB-01..07** | `public/assets/roles/{role}.svg` | 256x256 | Vector SVG (≤ 10 KB) | **Active**: Pure inline SVG geometry | Role emblems for Mafia, Godfather, Doctor, Police, Vigilante, Jester, Civilian |
| **AVT-01..12** | `public/assets/avatars/{1..12}.webp` | 256x256 | WebP (≤ 25 KB each) | **Active**: High-contrast noir portrait icons | 12 distinct character silhouettes and archetypes with pin color rings |

---

## 2. Prompts & Style Preamble

All prompts use the style anchor defined in `ART_BIBLE.md`:
> *"1930s Film Noir, lit by one overhead lamp, deep cast shadows, chiaroscuro lighting, rich matte texture, muted sepia and charcoal tones, brass and bone accents. No neon, no modern elements, no digital lens flare, no plastic sheen."*

### TEX-01: Felt Table Texture
- **Prompt**: `Seamless tileable texture of dark billiard cloth green baize felt, heavy matte woven wool fibers, film noir atmosphere, low angle lighting, subtle vintage grain, 8k resolution, seamless pattern`
- **Output**: `public/assets/bg/felt-noise.webp`

### TEX-02: Manila Dossier Paper
- **Prompt**: `Seamless tileable texture of aged 1930s police report paper stock, bone-dim warm cream tone, subtle fiber inclusions, light tea-staining, matte surface, seamless pattern`
- **Output**: `public/assets/bg/paper-grain.webp`

### ILL-01: Landing Backdrop
- **Prompt**: `An empty 1930s precinct backroom interrogation table in deep shadow, a single hanging conical brass lamp casting a warm pool of amber light onto green felt, smoky air with subtle light shafts, cinematic film still, Leica 35mm, chiaroscuro`
- **Output**: `public/assets/bg/noir-room.webp`

### ILL-02 & 03: Match Outcome Backdrops
- **Syndicate Win**: `High contrast silhouette of a trenchcoat and fedora figure standing in rain under a flickering streetlamp, deep crimson shadows, vintage 1930s crime photography`
- **Town Win**: `Morning dawn light breaking through venetian blinds into a quiet precinct room, soft warm dust motes, newspaper on desk, peaceful resolution, film noir style`
