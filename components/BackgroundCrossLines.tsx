'use client';

import React from 'react';

export function BackgroundCrossLines() {
  const lineText1 =
    'MAFIA · SHADOWS OF THE CITY · PEER TO PEER MESH · TRUST NO ONE · COVERT SYNDICATE · TOWN ASSEMBLY · DECEIVE & SURVIVE · ';
  const lineText2 =
    'VERIFIED ZERO-SERVER PROTOCOL · SECRET NIGHT FREQUENCY · INVESTIGATE OR BE ELIMINATED · TRUTH IN THE SHADOWS · ';

  // Repeat text just enough for seamless continuous looping across 250vw
  const textStream1 = lineText1.repeat(4);
  const textStream2 = lineText2.repeat(4);

  return (
    <div
      aria-hidden="true"
      style={{ contain: 'strict' }}
      className="fixed inset-0 pointer-events-none overflow-hidden select-none -z-10 flex items-center justify-center opacity-25 md:opacity-35"
    >
      {/* Diagonal Line 1 (descending) */}
      <div
        style={{ transform: 'rotate(-12deg) translate3d(0, 0, 0)', backfaceVisibility: 'hidden' }}
        className="absolute w-[240vw] py-2 border-y border-white/20 bg-black/40 flex whitespace-nowrap overflow-hidden"
      >
        <div className="animate-cross-marquee font-mono text-xs md:text-sm font-semibold tracking-widest text-white/70">
          <span>{textStream1}</span>
          <span>{textStream1}</span>
        </div>
      </div>

      {/* Diagonal Line 2 (ascending, crossing line 1) */}
      <div
        style={{ transform: 'rotate(12deg) translate3d(0, 0, 0)', backfaceVisibility: 'hidden' }}
        className="absolute w-[240vw] py-2 border-y border-white/20 bg-black/40 flex whitespace-nowrap overflow-hidden"
      >
        <div className="animate-cross-marquee-reverse font-mono text-xs md:text-sm font-semibold tracking-widest text-white/70">
          <span>{textStream2}</span>
          <span>{textStream2}</span>
        </div>
      </div>
    </div>
  );
}
