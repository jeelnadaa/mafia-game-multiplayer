'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button, Avatar, Kbd, MafiaWordmark } from '@/components/ui';
import { HelpSheet } from '@/components/HelpSheet';
import { generateRoomCode } from '@/lib/net';
import { useShortcut } from '@/lib/shortcuts';
import { cleanExpiredGameData } from '@/lib/storage';

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(1);
  const [joinCode, setJoinCode] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);

  // Restore saved player profile & purge expired/completed games
  useEffect(() => {
    if (typeof window !== 'undefined') {
      cleanExpiredGameData();
      const savedName = localStorage.getItem('mafia-name');
      const savedAvatar = localStorage.getItem('mafia-avatar');
      if (savedName) setName(savedName);
      if (savedAvatar) setAvatar(parseInt(savedAvatar, 10));
    }
  }, []);

  const saveProfile = (newName: string, newAvatar: number) => {
    setName(newName);
    setAvatar(newAvatar);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mafia-name', newName);
      localStorage.setItem('mafia-avatar', String(newAvatar));
    }
  };

  useShortcut(['?', 'h', 'H'], () => setHelpOpen((prev) => !prev), { scope: 'screen' });

  const handleCreateGame = () => {
    const finalName = name.trim() || 'Host';
    saveProfile(finalName, avatar);
    const code = generateRoomCode();
    if (typeof window !== 'undefined') {
      localStorage.setItem(`mafia-is-host:${code}`, 'true');
    }
    router.push(`/room/${code}?host=true`);
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) return;
    const finalName = name.trim() || 'Player';
    saveProfile(finalName, avatar);
    router.push(`/room/${cleanCode}`);
  };

  return (
    <main className="relative flex-1 flex flex-col justify-between min-h-screen p-4 sm:p-6 md:p-10 bg-ink-950 text-bone selection:bg-lamp selection:text-ink-950 overflow-x-hidden">
      {/* Overhead Lamp Cone Atmospheric Lighting */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 opacity-40"
        style={{
          background: 'radial-gradient(circle 600px at 50% 15%, rgba(217, 164, 65, 0.12), transparent 75%)',
        }}
        aria-hidden="true"
      />
      
      {/* Subtle Noise / Film Vignette Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 bg-noise opacity-20 mix-blend-overlay"
        aria-hidden="true"
      />

      {/* Top Bar / Brand Strip */}
      <header className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between pb-4 border-b border-line/50 text-xs">
        <div className="flex items-center gap-2 tracking-wider uppercase font-mono text-[11px] text-bone-dim">
          <span className="w-1.5 h-1.5 bg-lamp inline-block animate-pulse" />
          <span>Underground Precinct</span>
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="inline-flex items-center gap-1.5 text-bone-dim hover:text-lamp transition-colors group"
        >
          <HelpCircle className="w-3.5 h-3.5 group-hover:stroke-lamp" />
          <span>Case Files & Rules</span>
          <Kbd className="ml-1 border-line text-bone-dim bg-ink-900">H</Kbd>
        </button>
      </header>

      {/* Central Hero & Identity Console */}
      <div className="relative z-10 w-full max-w-4xl mx-auto my-auto py-8 flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center space-y-3 mb-8">
          <div className="flex justify-center mb-2">
            <MafiaWordmark className="h-10 sm:h-12 md:h-14 text-bone hover:text-lamp transition-colors duration-300" />
          </div>
          <p className="text-sm sm:text-base text-bone-dim font-serif italic max-w-md mx-auto leading-relaxed">
            &ldquo;Lies, alibis, and one very long night. Play with friends, no signup.&rdquo;
          </p>
        </div>

        {/* Player Identity Dossier Card */}
        <div className="w-full max-w-md bg-ink-900 border border-line p-6 sm:p-8 shadow-2xl relative backdrop-blur-sm">
          {/* Top Dossier Corner Stitch */}
          <div className="absolute top-0 left-0 border-t-2 border-l-2 border-lamp/40 w-3 h-3" />
          <div className="absolute top-0 right-0 border-t-2 border-r-2 border-lamp/40 w-3 h-3" />

          <div className="flex items-center justify-between pb-3 mb-5 border-b border-line/60">
            <span className="text-xs font-mono font-bold tracking-widest text-bone uppercase">
              Agent Identity File
            </span>
            <span className="text-[10px] font-mono text-lamp uppercase tracking-wider">
              Ready for Dispatch
            </span>
          </div>

          <div className="space-y-5">
            {/* Codename Input */}
            <div>
              <label htmlFor="codename-input" className="block text-[11px] font-mono uppercase tracking-wider text-bone-dim mb-1.5">
                Player Codename
              </label>
              <input
                id="codename-input"
                type="text"
                value={name}
                onChange={(e) => saveProfile(e.target.value, avatar)}
                placeholder="e.g. Inspector Vance"
                maxLength={20}
                className="w-full bg-ink-950 border border-line px-3.5 py-2 text-sm text-bone font-mono placeholder:text-bone-dim/40 focus:outline-none focus:border-lamp focus:ring-1 focus:ring-lamp transition-all"
              />
            </div>

            {/* Avatar Picker (2 rows of 6 portraits) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-bone-dim">
                  Select Alias Portrait
                </label>
                <span className="text-[10px] font-mono text-bone-dim">#{avatar} of 12</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5 p-1 bg-ink-950 border border-line">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((id) => {
                  const isSelected = avatar === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => saveProfile(name, id)}
                      className={`p-1 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-lamp/15 ring-2 ring-lamp shadow-sm scale-105 z-10'
                          : 'opacity-70 hover:opacity-100 hover:bg-ink-800'
                      }`}
                      aria-label={`Select portrait ${id}`}
                    >
                      <Avatar avatarId={id} size={32} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Host Game Button (Primary Brass CTA) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCreateGame}
                className="w-full py-3 px-4 bg-lamp text-ink-950 font-sans font-bold text-sm tracking-wide shadow-lg hover:bg-lamp-soft active:scale-[0.99] transition-all flex items-center justify-center gap-2 group"
              >
                <span>Host a Game</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Clean Divider */}
            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-line/60 w-full" />
              <span className="bg-ink-900 px-3 text-[11px] font-mono text-bone-dim uppercase tracking-wider shrink-0">
                — or join an existing case —
              </span>
              <div className="border-t border-line/60 w-full" />
            </div>

            {/* Join Game Form */}
            <form onSubmit={handleJoinGame} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  maxLength={5}
                  className="flex-1 bg-ink-950 border border-line px-3.5 py-2 text-center font-mono text-sm tracking-widest text-bone placeholder:text-bone-dim/40 focus:outline-none focus:border-lamp uppercase"
                />
                <button
                  type="submit"
                  disabled={!joinCode.trim()}
                  className="px-4 py-2 bg-ink-800 text-bone hover:bg-ink-800/80 hover:text-lamp border border-line text-xs font-mono font-semibold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <span>Enter Room</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Footer / Status Stamp */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto pt-4 border-t border-line/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-bone-dim">
        <div className="flex items-center gap-2 text-bone-dim/80">
          <ShieldCheck className="w-3.5 h-3.5 text-lamp" />
          <span>P2P ENCRYPTED · BROWSER NATIVE · NO ACCOUNTS</span>
        </div>
        <div>
          <span>Press <kbd className="bg-ink-900 border border-line px-1 text-bone">H</kbd> for manual & case rules</span>
        </div>
      </footer>

      {/* Rulebook Modal */}
      <HelpSheet isOpen={helpOpen} onClose={() => setHelpOpen(false)} initialTab="basics" />
    </main>
  );
}
