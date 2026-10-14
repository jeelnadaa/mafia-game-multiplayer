# Third-Party Assets & Attribution

All audio, visual, and typographic elements in *Mafia: Shadows of the City* are built with zero bloated runtime dependencies and strict permissive licenses.

## 1. Typography

- **Satoshi**: Designed by Deni Anggara, published by Indian Type Foundry / Fontshare.
  - License: Free for personal and commercial use (Fontshare License).
  - Hosted via fontshare CDN with `font-display: swap`.

## 2. Audio & Sound Synthesis

- **Procedural Web Audio Engine (`lib/sfx.ts`)**:
  - 100% synthetically generated in real-time via the browser's native `AudioContext` and `OscillatorNode` / `BiquadFilterNode` / `GainNode`.
  - Zero external `.mp3`, `.wav`, or `.ogg` files required (0 KB download footprint).
  - Authored for this project under the MIT License.

## 3. Icons & Graphical Emblems

- **Lucide Icons**:
  - Community fork of Feather Icons.
  - License: ISC License.
  - Minimal inline SVG geometry with uniform stroke-width (2px / 1.5px).

- **Character Avatars (`public/assets/avatars/`)**:
  - Vector portraits optimized in WebP format.
  - Single stroke line work aligned with the film-noir aesthetic.

## 4. Software Libraries

- **React & Next.js**: MIT License (Facebook / Vercel).
- **Tailwind CSS**: MIT License.
- **Framer Motion**: MIT License.
- **Zod**: MIT License (Colin McDonnell).
- **PeerJS**: MIT License.
