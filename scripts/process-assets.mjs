import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
const assetsDir = path.join(publicDir, 'assets');
const rolesDir = path.join(assetsDir, 'roles');
const bgDir = path.join(assetsDir, 'bg');
const avatarsDir = path.join(assetsDir, 'avatars');
const appDir = path.resolve('app');

[publicDir, assetsDir, rolesDir, bgDir, avatarsDir].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Helper to convert SVG string to WebP/PNG
async function svgToWebp(svgString, outputPath, width, height) {
  await sharp(Buffer.from(svgString))
    .resize(width, height)
    .webp({ quality: 85 })
    .toFile(outputPath);
}

async function svgToPng(svgString, outputPath, width, height) {
  await sharp(Buffer.from(svgString))
    .resize(width, height)
    .png()
    .toFile(outputPath);
}

// 1. Logo Mark
const logoSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#08090D"/>
  <circle cx="256" cy="256" r="210" fill="#11131A" stroke="#232736" stroke-width="4"/>
  <!-- Fedora Silhouette -->
  <path d="M120 230 C150 180, 220 130, 290 130 C360 130, 390 180, 392 230 C450 230, 460 250, 420 260 C370 270, 140 270, 92 260 C52 250, 70 230, 120 230 Z" fill="#ECEEF4"/>
  <!-- Face shadow -->
  <path d="M160 260 L352 260 C352 330, 300 400, 256 420 C212 400, 160 330, 160 260 Z" fill="#08090D" stroke="#232736" stroke-width="4"/>
  <!-- Glowing Blood Red Eye -->
  <path d="M200 310 Q230 300 245 315 Q230 325 200 310 Z" fill="#E5383B" filter="drop-shadow(0 0 12px #E5383B)"/>
</svg>
`;

// 2. Roles SVGs
const createRoleCardSvg = (title, accentColor, iconSvg, glowColor) => `
<svg width="480" height="640" viewBox="0 0 480 640" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="cardGlow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${glowColor}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#08090D" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="480" height="640" fill="#08090D"/>
  <rect width="480" height="640" fill="url(#cardGlow)"/>
  <rect x="20" y="20" width="440" height="600" rx="20" fill="none" stroke="${accentColor}" stroke-opacity="0.3" stroke-width="2"/>
  <g transform="translate(140, 180)">
    ${iconSvg}
  </g>
  <text x="240" y="520" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="28" fill="${accentColor}" letter-spacing="4">
    ${title.toUpperCase()}
  </text>
  <circle cx="240" cy="550" r="4" fill="${accentColor}"/>
</svg>
`;

const roles = {
  mafia: {
    color: '#E5383B',
    glow: '#E5383B',
    icon: `<path d="M100 20 C60 20 20 80 40 140 C60 190 140 190 160 140 C180 80 140 20 100 20 Z" fill="#E5383B"/><circle cx="100" cy="80" r="25" fill="#08090D"/><path d="M90 100 L110 160" stroke="#08090D" stroke-width="8"/>`,
  },
  doctor: {
    color: '#F4F6FA',
    glow: '#F4F6FA',
    icon: `<rect x="75" y="30" width="50" height="140" fill="#F4F6FA" rx="8"/><rect x="30" y="75" width="140" height="50" fill="#F4F6FA" rx="8"/>`,
  },
  police: {
    color: '#5B8CFF',
    glow: '#5B8CFF',
    icon: `<circle cx="90" cy="90" r="55" fill="none" stroke="#5B8CFF" stroke-width="14"/><line x1="130" y1="130" x2="175" y2="175" stroke="#5B8CFF" stroke-width="18" stroke-linecap="round"/>`,
  },
  civilian: {
    color: '#C9B79C',
    glow: '#C9B79C',
    icon: `<circle cx="100" cy="65" r="40" fill="#C9B79C"/><path d="M40 170 C40 120 70 110 100 110 C130 110 160 120 160 170 Z" fill="#C9B79C"/>`,
  },
  godfather: {
    color: '#E5383B',
    glow: '#E5383B',
    icon: `<path d="M100 10 L140 50 L115 65 L150 110 L50 110 L85 65 L60 50 Z" fill="#E5383B"/><rect x="60" y="120" width="80" height="40" fill="#08090D" stroke="#E5383B" stroke-width="4"/>`,
  },
  vigilante: {
    color: '#7C8CA6',
    glow: '#7C8CA6',
    icon: `<path d="M40 80 L140 80 L140 110 L110 110 L100 160 L70 150 L80 110 L40 110 Z" fill="#7C8CA6"/>`,
  },
  jester: {
    color: '#B58AD6',
    glow: '#B58AD6',
    icon: `<path d="M40 80 Q70 10 100 70 Q130 10 160 80 C150 140 50 140 40 80 Z" fill="#B58AD6"/><circle cx="70" cy="20" r="10" fill="#D6B15E"/><circle cx="130" cy="20" r="10" fill="#D6B15E"/>`,
  },
  god: {
    color: '#D6B15E',
    glow: '#D6B15E',
    icon: `<path d="M20 100 Q100 20 180 100 Q100 180 20 100 Z" fill="none" stroke="#D6B15E" stroke-width="12"/><circle cx="100" cy="100" r="30" fill="#D6B15E"/>`,
  },
};

// 3. Backgrounds
const bgNightSvg = `
<svg width="1080" height="1440" viewBox="0 0 1080 1440" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#050608"/>
      <stop offset="60%" stop-color="#08090D"/>
      <stop offset="100%" stop-color="#0E1A2B"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1440" fill="url(#skyGrad)"/>
  <circle cx="540" cy="240" r="120" fill="#F4F6FA" fill-opacity="0.85" filter="drop-shadow(0 0 60px rgba(244,246,250,0.3))"/>
  <!-- Skyline silhouettes -->
  <path d="M0 1200 L120 1120 L240 1200 L380 1080 L500 1180 L620 1100 L760 1220 L900 1140 L1080 1200 L1080 1440 L0 1440 Z" fill="#050608"/>
</svg>
`;

const bgDaySvg = `
<svg width="1080" height="1440" viewBox="0 0 1080 1440" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="daySky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1B1A22"/>
      <stop offset="60%" stop-color="#14161F"/>
      <stop offset="100%" stop-color="#241E1C"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1440" fill="url(#daySky)"/>
  <circle cx="540" cy="280" r="140" fill="#F2B84B" fill-opacity="0.9" filter="drop-shadow(0 0 80px rgba(242,184,75,0.4))"/>
  <path d="M0 1200 L120 1120 L240 1200 L380 1080 L500 1180 L620 1100 L760 1220 L900 1140 L1080 1200 L1080 1440 L0 1440 Z" fill="#0B0C10"/>
</svg>
`;

// 4. OpenGraph Share Banner
const ogSvg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#08090D"/>
  <circle cx="300" cy="315" r="200" fill="#11131A" stroke="#232736" stroke-width="4"/>
  <path d="M170 280 C200 230, 270 180, 340 180 C410 180, 440 230, 442 280 C500 280, 510 300, 470 310 C420 320, 190 320, 142 310 C102 300, 120 280, 170 280 Z" fill="#ECEEF4"/>
  <path d="M210 310 L402 310 C402 380, 350 450, 306 470 C262 450, 210 380, 210 310 Z" fill="#08090D" stroke="#232736" stroke-width="4"/>
  <path d="M250 360 Q280 350 295 365 Q280 375 250 360 Z" fill="#E5383B"/>
  <text x="600" y="290" font-family="sans-serif" font-weight="900" font-size="72" fill="#ECEEF4" letter-spacing="8">MAFIA</text>
  <text x="600" y="360" font-family="sans-serif" font-weight="500" font-size="26" fill="#F2B84B" letter-spacing="4">SHADOWS OF THE CITY</text>
  <text x="600" y="420" font-family="sans-serif" font-size="20" fill="#8A90A2">REAL-TIME MULTIPLAYER WEBRTC PARTY GAME</text>
</svg>
`;

// 5. 12 Avatars
const avatarColors = [
  '#E5383B', '#5B8CFF', '#F4F6FA', '#C9B79C',
  '#B58AD6', '#7C8CA6', '#D6B15E', '#F2B84B',
  '#2DD4BF', '#F43F5E', '#8B5CF6', '#10B981'
];

async function generateAll() {
  console.log('Generating noir vector assets...');

  // Logo mark and icons
  await svgToPng(logoSvg, path.join(assetsDir, 'logo-mark.png'), 512, 512);
  await svgToPng(logoSvg, path.join(appDir, 'icon.png'), 256, 256);
  await svgToPng(logoSvg, path.join(appDir, 'apple-icon.png'), 180, 180);
  await svgToPng(logoSvg, path.join(publicDir, 'icon.png'), 256, 256);

  // Roles
  for (const [rname, rcfg] of Object.entries(roles)) {
    const cardSvg = createRoleCardSvg(rname, rcfg.color, rcfg.icon, rcfg.glow);
    await svgToWebp(cardSvg, path.join(rolesDir, `${rname}.webp`), 480, 640);
  }

  // Backgrounds
  await svgToWebp(bgNightSvg, path.join(bgDir, 'night.webp'), 1080, 1440);
  await svgToWebp(bgDaySvg, path.join(bgDir, 'day.webp'), 1080, 1440);

  // OpenGraph banner
  await svgToPng(ogSvg, path.join(assetsDir, 'og.png'), 1200, 630);

  // 12 Avatars
  for (let i = 1; i <= 12; i++) {
    const color = avatarColors[i - 1];
    const avSvg = `
    <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <rect width="256" height="256" fill="#11131A"/>
      <circle cx="128" cy="128" r="100" fill="#181B25" stroke="#232736" stroke-width="4"/>
      <circle cx="128" cy="100" r="42" fill="${color}" fill-opacity="0.85"/>
      <path d="M60 210 C60 160 90 148 128 148 C166 148 196 160 196 210 Z" fill="${color}" fill-opacity="0.85"/>
      <circle cx="128" cy="128" r="110" fill="none" stroke="${color}" stroke-opacity="0.25" stroke-width="3"/>
    </svg>
    `;
    await svgToWebp(avSvg, path.join(avatarsDir, `${i}.webp`), 256, 256);
  }

  console.log('All noir assets generated successfully!');
}

generateAll().catch(console.error);
