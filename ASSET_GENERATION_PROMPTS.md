# Asset Generation Prompts (Nano Banana) — "Mafia: Shadows of the City"

Companion to `UI_OVERHAUL_PROMPT.md` (Section 2.4). Use these prompts to generate the image assets the redesign needs. Read **Part 0** before running anything: the workflow matters as much as the prompts.

> **Check the current model id** in the Gemini image-generation docs before scripting (e.g. `gemini-2.5-flash-image` at time of writing, or a newer "Nano Banana Pro" variant, which is preferred for fidelity and consistency). Prompts below are model-agnostic natural language. Nano Banana is conversational: it has no separate "negative prompt" field, so constraints are written as plain sentences ("Do not include…").

---

## Part 0 — Workflow rules

1. **Always prepend the Style Preamble (Part 1)** to every prompt. This is what keeps 30+ assets looking like one art direction.
2. **Anchor first, then expand.** Generate the *Style Anchor* (Part 2) and get it approved. For every later asset, attach the approved anchor image as a reference and add: *"Match the lighting, palette, grain and material feel of the reference image exactly."*
3. **Edit, don't re-roll.** When an output is 80% right, ask for a targeted edit ("keep everything, make the shadows deeper and remove the highlight on the left") instead of regenerating from scratch. Consistency lives in edits.
4. **Generate 3–4 variants per asset**, pick the best, discard the rest. Never ship a first output without comparing.
5. **No text in generated images, ever.** All lettering (wordmark, "ELIMINATED", phase banners) is added later in SVG/CSS/canvas with real fonts.
6. **Transparency strategy (generated images have no true alpha):**
   - *Emblems, stamps, redaction textures:* generate **light-on-pure-black** (or black-on-white for stamps), then convert luminance to alpha in post (`luminance → alpha`), and tint with CSS so the same asset works in any accent color.
   - *Characters/objects needing a cutout:* generate on a **flat, evenly lit neutral grey (#808080) background**, then matte with a proper segmentation/matte tool and verify edges on dark and light backgrounds.
7. **Tileables** must say "seamless, tileable" and then be checked: offset the image by 50% in both axes, look for seams, fix with clone/heal or regenerate.
8. **Aspect ratio and size** are set via the API's image config (not only the prompt). Generate at the largest practical size, then downscale to **2× the real display size** and compress (WebP/AVIF).
9. **Save provenance** for every final asset in `assets/generated/MANIFEST.json`: model id, date, full final prompt, reference images used, post-processing steps, output path.
10. **Reject on sight:** neon or purple glow, glossy plastic look, unreadable fake text/gibberish letters, distorted hands/faces, real-person likeness, logos/brands/copyrighted characters, watermarks, cluttered compositions, anything that clashes with the palette.

### Minimal generation script (verify against current SDK docs)
```js
// scripts/generate-assets.mjs  (build-time only; never ship this or the key)
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function gen({ prompt, refs = [], aspectRatio = "1:1", out }) {
  const parts = [
    ...refs.map(p => ({ inlineData: { mimeType: "image/png", data: fs.readFileSync(p).toString("base64") } })),
    { text: prompt },
  ];
  const res = await ai.models.generateContent({
    model: process.env.IMAGE_MODEL,            // set from current docs
    contents: [{ role: "user", parts }],
    config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio } },
  });
  const img = res.candidates[0].content.parts.find(p => p.inlineData);
  fs.writeFileSync(out, Buffer.from(img.inlineData.data, "base64"));
}
```
Post-process with `sharp` (resize, convert to WebP/AVIF, luminance-to-alpha for emblems) and record each step in the manifest.

---

## Part 1 — Style Preamble (prepend to EVERY prompt)

```
ART DIRECTION: 1930s film-noir back room, lit by a single warm brass lamp from above.
Deep shadows, matte materials, restrained and premium, like a high-end board game or a
film title sequence. Color palette strictly limited to: near-black ink (#0A0B0E, #101216),
warm bone off-white (#ECE6D8), muted brass/amber lamplight (#D9A441), deep oxblood red
(#7E2327 to #B3363B), cold night steel-blue (#16222F to #3E5A78), and muted verdigris
green (#5E8C7B). Subtle fine film grain. Soft, believable light falloff. Hand-crafted,
slightly imperfect, tactile surfaces (printed card stock, brass, aged felt, worn wood).
Do NOT include: neon, glowing blobs, purple or pink gradients, glossy plastic or 3D-render
look, lens flares, sparkles, emoji, any text, letters, numbers, logos, watermarks, signatures,
real people, famous characters, or brand marks. No cluttered background.
```

---

## Part 2 — Style Anchor (generate this first; approve before anything else)

**A1. Anchor still-life (1:1, 2048 px)**
```
[STYLE PREAMBLE]
Create the master style reference for the game: a top-down view of a round card-table in a
dark room. Worn dark green-black felt surface, thin brass rim, a single warm pool of lamplight
in the center falling off into deep shadow at the edges. On the felt: three face-down playing
cards with an engraved geometric back pattern, a small brass bell, and an old fountain pen.
Fine film grain. Calm, elegant, premium. No text.
```
Review checklist: Is the light warm and single-sourced? Are the blacks truly dark but not crushed? Is the palette on-token? Does it feel *premium* rather than generic? If not, iterate until yes. This image becomes the reference attached to every later generation.

---

## Part 3 — Textures (tileable)

**T1. Table felt (1:1, 1024 px, seamless)**
```
[STYLE PREAMBLE] Reference: attach style anchor.
A seamless, tileable texture of dark green-black card-table felt, extremely subtle fiber
detail, very even lighting, no lamp pool, no vignette, no stains, no objects. Top-down,
flat orthographic. Low contrast so UI can sit on top. Must tile perfectly with no visible
seams or repeated blotches.
```
**T2. Aged paper stock (1:1, 1024 px, seamless)**
```
[STYLE PREAMBLE] A seamless, tileable texture of warm bone off-white card stock with very
fine paper fiber and faint age toning. Even lighting, no creases, no stains, no ink, no
text, no shadows. Flat, top-down, low contrast. Perfectly tileable.
```
**T3. Card-back engraving (3:4, 1536 px; luminance→alpha)**
```
[STYLE PREAMBLE] A symmetrical, engraved geometric pattern for the back of a playing card:
fine interlocking lines, art-deco diamond lattice with a plain empty circular medallion in
the center (leave the medallion EMPTY, no emblem). Light bone-colored lines on pure black
background, crisp, high contrast, centered, with a thin border frame. No text.
```
**T4. Brass surface (1:1, 1024 px, seamless)**
```
[STYLE PREAMBLE] A seamless, tileable close-up texture of brushed, slightly tarnished brass
with fine horizontal micro-scratches, matte not shiny, soft even lighting, no reflections of
objects, no text, low contrast. Perfectly tileable.
```
**T5. Dark wood rim (2:1, 2048×1024, seamless horizontally)**
```
[STYLE PREAMBLE] A seamless horizontal strip of dark, matte, aged walnut wood grain with
subtle varnish wear, even light, no knots drawing attention, no text. Tiles seamlessly left
to right.
```
**T6. Film grain/dust overlay (1:1, 1024 px; used at ~3–5% opacity)**
```
Fine monochrome film grain with very sparse tiny dust specks on a mid-grey field, evenly
distributed, seamless, no gradient, no scratches larger than a few pixels, no text.
```
(Consider generating grain procedurally instead if the result has visible patterns.)

---

## Part 4 — Role emblems (7 images; 1:1, 1024 px; light-on-black → luminance→alpha)

Shared suffix for every emblem prompt:
```
Single bold emblem, centered, light bone-colored engraved line art with fine hatching on a
PURE BLACK background, high contrast, crisp edges, generous empty margin around it, strictly
symmetrical or balanced composition, readable at 64 px. No text, no letters, no border box,
no color other than light bone on black.
```
- **E1 Mafia:** `[STYLE PREAMBLE] Emblem of a pinstripe fedora hat above a single crossed pair of dice-like cufflinks, hat brim casting a sharp shadow line. [EMBLEM SUFFIX]`
- **E2 Godfather:** `[STYLE PREAMBLE] Emblem of a single rose lying across a signet ring, elegant and ominous. [EMBLEM SUFFIX]`
- **E3 Doctor:** `[STYLE PREAMBLE] Emblem of an old doctor's leather bag with a small clasp and a simple serpent-and-staff mark engraved on it. [EMBLEM SUFFIX]`
- **E4 Police / Detective:** `[STYLE PREAMBLE] Emblem of a vintage magnifying glass over a flat-cap silhouette, with a subtle keyhole in the lens. [EMBLEM SUFFIX]`
- **E5 Vigilante:** `[STYLE PREAMBLE] Emblem of a single revolver cartridge standing upright in front of a cracked half-mask. [EMBLEM SUFFIX]`
- **E6 Jester:** `[STYLE PREAMBLE] Emblem of a jester's three-pointed cap with small bells, one bell slightly cracked. [EMBLEM SUFFIX]`
- **E7 Civilian:** `[STYLE PREAMBLE] Emblem of an old street lamp with a simple house window glowing beneath it, humble and warm. [EMBLEM SUFFIX]`

Post-process: luminance→alpha, trim, export SVG-tracing only if clean, otherwise WebP with alpha at 256 and 512 px. Verify all seven share line weight and level of detail; regenerate outliers via edit prompts ("reduce detail and thicken lines to match the reference emblem").

---

## Part 5 — Backdrops and key art

**B1. Landing backdrop (16:9, 2560×1440)**
```
[STYLE PREAMBLE] Reference: style anchor.
A wide, moody view of an empty back room: a round table with a few empty chairs, a single
hanging lamp over it casting a warm cone of light, thick cigar-smoke haze drifting through the
beam, venetian-blind shadows on the far wall, deep darkness at the left and right edges. The
center-left of the frame must be calm and dark so interface text can sit on it. No people,
no text, no signs, no windows with readable lettering.
```
Deliver also a **mobile crop (9:16, 1440×2560)** by re-prompting: "Same scene, recomposed vertically, lamp in the upper third, table lower, large dark area in the middle."

**B2. OG / share plate (1200×630, 1.91:1)**
```
[STYLE PREAMBLE] Reference: style anchor.
Cinematic wide plate for a title card: a single hanging brass lamp over a dark round table
with a few face-down cards, the right two-thirds of the frame is calm deep shadow with soft
smoke so a title can be added later. No text of any kind.
```
(The wordmark and tagline are added in SVG/canvas afterwards.)

**B3. Game Over — Mafia wins (16:9)**
```
[STYLE PREAMBLE] Reference: style anchor.
The same round table seen from a low angle after the game: the lamp now swings low and glows
a deep oxblood red-amber, long hard shadows, a single overturned chair, cards scattered face
down, mood of quiet menace. Calm dark region in the lower third for interface. No people, no text.
```
**B4. Game Over — Town wins (16:9)**
```
[STYLE PREAMBLE] Reference: style anchor.
The same round table at first light: cool dawn from a high window mixing with a soft verdigris
and warm bone glow, chairs neatly pushed in, cards face down, mood of relief and calm. Calm
dark region in the lower third for interface. No people, no text.
```
**B5. Share docket background (4:5, 1080×1350)**
```
[STYLE PREAMBLE] A dark paper-and-felt background plate for a "case file" poster: aged bone
paper card centered with soft shadow on dark felt, brass corner details, a subtle paper clip
at the top edge, the paper area completely EMPTY (no text, lines or stamps) so content can be
drawn on top later.
```

---

## Part 6 — Empty states and small illustrations (1:1, 1024 px; light-on-black → alpha)

Use the same line-art suffix as the emblems.
- **S1 No stats yet:** `[STYLE PREAMBLE] A closed empty manila case folder with a single blank tab, a pen resting on it. [EMBLEM SUFFIX]`
- **S2 Waiting for players:** `[STYLE PREAMBLE] A row of empty chairs around a small round table under a hanging lamp. [EMBLEM SUFFIX]`
- **S3 Voice unavailable / mic denied:** `[STYLE PREAMBLE] An old standing microphone with a folded cloth draped over it. [EMBLEM SUFFIX]`
- **S4 Connection lost:** `[STYLE PREAMBLE] A rotary telephone with its handset off the hook and cord dangling. [EMBLEM SUFFIX]`
- **S5 Room locked:** `[STYLE PREAMBLE] A heavy brass padlock on a plain door. [EMBLEM SUFFIX]`

---

## Part 7 — Stamp and ink textures (no text; black-on-white → multiply/alpha)

**ST1. Stamp border (1:1, 1024 px)**
```
A rubber-stamp rectangular double-border frame, uneven ink coverage, slight misregistration,
worn broken edges, black ink on a pure white background, EMPTY inside (no text, no letters, no
symbols). High contrast, centered, generous margin.
```
**ST2. Stamp border, circular (1:1)** — same as ST1 but "circular double-ring frame".
**ST3. Ink bleed / smudge set (2:1, 2048×1024)**
```
A sheet of assorted ink smudges, splatters and dry-brush streaks as black ink on pure white,
varied sizes, organic, no text, no recognizable shapes.
```
**ST4. Redaction bar (4:1, 2048×512)**
```
A single thick black marker/ink redaction bar painted over paper, slightly uneven edges and
faint streaks, black on pure white, horizontal, no text.
```
Use in code: stamp text ("ELIMINATED", "SURVIVED") is rendered with the display font and masked/multiplied with ST1/ST3 for realistic ink wear.

---

## Part 8 — Avatar set (12 portraits; keep the same 12 ids and file contract)

**Process:** (1) generate **Avatar 1** and approve it; (2) for avatars 2–12 attach Avatar 1 and say *"Same illustration style, framing, lighting and background treatment as the reference. Only change the character as described."* (3) check the grid as a whole for consistency of style, scale and background; (4) export each at 128, 256 and 512 px WebP with the same filenames/indexes as the current avatars so stored profiles and messages are unaffected.

**Base prompt (each avatar, 1:1, 1024 px):**
```
[STYLE PREAMBLE]
Stylized noir character portrait, head and shoulders, facing slightly off-center, painted
illustration with visible brush texture and grain, strong single-source warm lamp light from
above-left, deep shadow on the opposite side, plain dark ink background with a subtle
vignette, a thin colored rim light in the accent color specified below. Fictional character,
not a real person. Face clearly readable at 64 px, simple shapes, distinctive silhouette.
No text, no frame, no logos.
CHARACTER: {description}
ACCENT RIM LIGHT COLOR: {accent}
```
Per-avatar `{description}` and `{accent}` (accents match the muted player pin colors; never neon):
1. `Woman in her 30s, sharp bob haircut, red lipstick, pearl earrings` — oxblood red
2. `Man in his 40s, round glasses, neat mustache, tweed flat cap` — steel blue
3. `Androgynous person, short cropped hair, high collar coat, calm stare` — bone white
4. `Older man, deep wrinkles, white stubble, wool scarf` — warm sand
5. `Young woman, long braided hair, silk scarf, curious eyes` — soft violet
6. `Man in his 30s, shaved head, scar over one eyebrow, dark turtleneck` — slate blue-grey
7. `Woman in her 50s, silver hair in a bun, cat-eye glasses` — brass amber
8. `Young man, slicked hair, thin tie, confident half-smile` — brass amber (lighter)
9. `Woman with a wide-brim hat tilted low, shadow across eyes` — verdigris teal
10. `Heavyset man, bowler hat, thick eyebrows, cigar unlit in mouth` — rose red
11. `Person with a veil-style half mask and dark curly hair` — deep indigo
12. `Man in his 20s, tousled hair, ink-stained collar, tired eyes` — verdigris green

Quality bar: no uncanny faces or malformed hands/ears; consistent framing; readable when shrunk to a small ring on a seat. Reject any that resembles a known real person or celebrity.

---

## Part 9 — 3D concept references (not shipped; guide the procedural models)

Generate these as references for the 3D artist/agent building geometry in code. Aspect 1:1 or 4:3.
- **C1 Hanging lamp:** `[STYLE PREAMBLE] Product-style study of a vintage brass pendant lamp with a wide conical shade, shown from three angles on a flat grey background, matte brass, simple geometry. No text.`
- **C2 Chair:** `[STYLE PREAMBLE] Orthographic-style study of a simple dark-wood bentwood chair with a curved back, front, side and top views on a flat grey background, simplified to clean low-poly-friendly shapes.`
- **C3 Seated figurine:** `[STYLE PREAMBLE] A stylized chess-pawn-like figurine character for a board game: rounded head, small hat variation, tapered body, matte painted wood finish, a colored base ring, shown from front, side and three-quarter views on a flat grey background. Simple shapes suited to being modeled with capsules and spheres.`
- **C4 Table:** `[STYLE PREAMBLE] A round card-table with a thin brass rim and dark felt top, turned dark-wood pedestal, shown from side and top-down on a flat grey background.`
- **C5 Vote token & stamp block:** `[STYLE PREAMBLE] A small brass vote token coin with a blank face and a wooden rubber-stamp handle, shown from several angles on flat grey.`

---

## Part 10 — Final acceptance checklist for assets

- [ ] Style anchor approved and attached as reference for all later assets.
- [ ] Every asset: no text, no watermark, no real-person likeness, on-palette after color grading.
- [ ] Tileables verified seamless (50% offset test); emblems/stamps converted via luminance→alpha with clean edges on dark **and** light backgrounds.
- [ ] Avatar set has exactly 12 images, same ids/filenames/aspect as before, consistent as a set, readable at 64 px.
- [ ] Sizes/budgets met (illustration ≤ 150 KB, texture ≤ 80 KB, total ≤ 1.2 MB), WebP/AVIF, explicit width/height, meaningful `alt` (or empty alt if decorative), lazy-loaded where possible.
- [ ] CSS/SVG fallback exists for every asset; UI looks intentional with images blocked.
- [ ] `assets/generated/MANIFEST.json` and `CREDITS.md` updated; API key absent from repo, bundle and logs.
- [ ] Each asset was viewed in context on the actual screen (mobile and desktop) and matches the art direction. Anything generic, plasticky or inconsistent was regenerated or removed.
