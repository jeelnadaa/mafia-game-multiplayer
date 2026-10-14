'use client';

import React from 'react';
import Link from 'next/link';

export default function ScenesIndexPage() {
  const scenes = [
    { id: 'landing', label: '1. Landing Page', size: '1280×760' },
    { id: 'lobby', label: '2. The Back Room (Lobby)', size: '1280×760' },
    { id: 'reveal', label: '3. Role Reveal (Classified Card)', size: '390×844' },
    { id: 'night', label: '4. Night (The Table & Target Line)', size: '1280×760' },
    { id: 'vote', label: '5. Day Vote (The Accusation & Spotlight)', size: '1280×760' },
    { id: 'rulebook', label: '6. Rulebook (Classified Dossier & Notes)', size: '1280×760' },
    { id: 'sound', label: '7. Voice & Sound (PTT Wire)', size: '390×844' },
    { id: 'gameover', label: '8. Game Over (Case Closed & Paper Cards)', size: '1280×760' },
  ];

  return (
    <div className="b min-h-screen bg-[#0A0B0E] text-[#ECE6D8] p-8 sm:p-14 space-y-8 select-none">
      <div className="pb-6 border-b border-[#262A33]">
        <span className="t text-xs tracking-[3px] text-[#D9A441] uppercase">DEV TEST SCENES</span>
        <h1 className="d text-5xl font-black uppercase tracking-wider text-[#ECE6D8] m-0">
          Deterministic Mockup Scenes
        </h1>
        <p className="text-sm font-sans text-[#A39D90] mt-1">
          Renders each real app screen with fixed state matching the 8 approved reference boards from Examples/
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {scenes.map((s) => (
          <Link
            key={s.id}
            href={`/dev/scenes/${s.id}`}
            className="p-5 bg-[#101216] border border-[#262A33] hover:border-[#D9A441] hover:bg-[#171A20] transition-colors rounded-[6px] flex flex-col justify-between h-[130px] group shadow-lg"
          >
            <div>
              <span className="text-[11px] font-mono text-[#A39D90] block">{s.size} native</span>
              <div className="font-semibold text-sm text-[#ECE6D8] group-hover:text-[#D9A441] transition-colors mt-1">
                {s.label}
              </div>
            </div>
            <span className="text-xs font-mono text-[#D9A441] self-end">View Scene →</span>
          </Link>
        ))}
      </div>

      <div className="pt-6 border-t border-[#262A33] flex items-center justify-between font-mono text-xs text-[#A39D90]">
        <Link href="/dev/gallery" className="hover:text-[#ECE6D8] underline">
          ← View Component Gallery
        </Link>
        <span>Deterministic Visual Diff Baseline</span>
      </div>
    </div>
  );
}
