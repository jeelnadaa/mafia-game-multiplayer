'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { Button, Avatar, Kbd } from '@/components/ui';
import { HelpSheet } from '@/components/HelpSheet';
import { generateRoomCode } from '@/lib/net';
import { useShortcut } from '@/lib/shortcuts';

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(1);
  const [joinCode, setJoinCode] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);

  // Restore saved player profile
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
    router.push(`/room/${code}`);
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) return;
    const finalName = name.trim() || 'Player';
    saveProfile(finalName, avatar);
    router.push(`/room/${cleanCode}?join=true`);
  };

  return (
    <main className="flex-1 flex flex-col justify-center min-h-screen p-4 md:p-8 lg:p-12 bg-noise">
      <div className="w-full max-w-[1650px] 2xl:max-w-[1850px] mx-auto flex-1 flex flex-col justify-center">
        {/* Full 16:9 Widescreen Two-Column Layout on PC, stacked on Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Left Column: Technical Hero & Overview (7 cols on Desktop) */}
          <div className="lg:col-span-7 bg-surface border border-border p-6 md:p-10 lg:p-12 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              {/* Header Status Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-border text-xs text-muted">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-white inline-block" />
                  <span>Peer-to-Peer Mesh</span>
                </div>
                <span>Zero Server · Encrypted</span>
              </div>

              {/* Title & Brand */}
              <div className="space-y-3">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-sans font-black tracking-tight text-text leading-none">
                  Mafia
                </h1>
                <div className="text-sm md:text-base text-muted font-medium">
                  Shadows of the City · Social Deduction Protocol
                </div>
                <p className="text-sm text-muted/80 max-w-xl leading-relaxed pt-1">
                  A high-stakes multiplayer party game running directly in browser memory via WebRTC data channels. 
                  Zero centralized servers, zero tracking. Deceive, investigate, and eliminate.
                </p>
              </div>

              {/* Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border">
                <div className="p-3 bg-surface-2 border border-border">
                  <div className="text-xs text-muted">Roster</div>
                  <div className="text-sm font-semibold text-text mt-0.5">4 to 12 Players</div>
                  <div className="text-[11px] text-muted/70 mt-1">Balanced presets and custom distribution</div>
                </div>
                <div className="p-3 bg-surface-2 border border-border">
                  <div className="text-xs text-muted">Networking</div>
                  <div className="text-sm font-semibold text-text mt-0.5">Pure WebRTC Mesh</div>
                  <div className="text-[11px] text-muted/70 mt-1">Direct device-to-device synchronization</div>
                </div>
                <div className="p-3 bg-surface-2 border border-border">
                  <div className="text-xs text-muted">Privacy</div>
                  <div className="text-sm font-semibold text-text mt-0.5">End-to-End Private</div>
                  <div className="text-[11px] text-muted/70 mt-1">Syndicate secret night channels</div>
                </div>
              </div>
            </div>

            {/* Bottom Actions & Shortcuts */}
            <div className="pt-6 border-t border-border flex items-center justify-between">
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="inline-flex items-center gap-2 text-xs text-muted hover:text-white transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                <span>How to Play & Role Guide</span>
                <Kbd>H</Kbd>
              </button>

              <div className="text-xs text-muted hidden sm:block">
                Press [H] for manual
              </div>
            </div>
          </div>

          {/* Right Column: Identity Configuration & Lobby Access (5 cols on Desktop) */}
          <div className="lg:col-span-5 bg-surface border border-border p-6 md:p-10 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="text-sm font-bold text-text">
                  Player Profile
                </div>
                <span className="text-xs text-muted">Local profile</span>
              </div>

              {/* Avatar Selector (12 avatars in square grid with full vibrant colors) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted">
                    Choose Your Avatar
                  </label>
                  <span className="text-xs text-muted">Avatar #{avatar}</span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => saveProfile(name, id)}
                      className={`p-1 border transition-colors flex items-center justify-center rounded-none ${
                        avatar === id
                          ? 'border-white bg-white/10 ring-1 ring-white'
                          : 'border-border hover:border-zinc-500 bg-surface-2'
                      }`}
                    >
                      <Avatar avatarId={id} size={38} className="rounded-none" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted">
                  Player Codename
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => saveProfile(e.target.value, avatar)}
                  placeholder="e.g. Inspector Vance"
                  maxLength={20}
                  className="w-full bg-surface-2 border border-border rounded-none px-4 py-2.5 text-sm text-text placeholder-muted/50 focus:outline-none focus:border-white focus:bg-zinc-900 transition-colors"
                />
              </div>

              {/* Create Game Button */}
              <Button
                variant="primary"
                size="lg"
                onClick={handleCreateGame}
                className="w-full font-semibold justify-center text-center"
              >
                Create New Game
              </Button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-border w-full" />
                <span className="bg-surface px-3 text-xs text-muted">
                  or join with code
                </span>
              </div>

              {/* Join Game Form */}
              <form onSubmit={handleJoinGame} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ROOM CODE"
                    maxLength={5}
                    className="flex-1 bg-surface-2 border border-border rounded-none px-4 py-2.5 text-center font-mono text-sm tracking-widest text-text placeholder-muted/50 focus:outline-none focus:border-white uppercase"
                  />
                  <Button type="submit" variant="secondary" size="md" className="px-5">
                    <span>Join</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </form>
            </div>

            {/* Micro status info */}
            <div className="pt-4 border-t border-border text-xs text-muted text-center lg:text-left">
              Compatible with all modern browsers · No signup required
            </div>
          </div>
        </div>
      </div>

      {/* Guide & Rules Sheet Modal */}
      <HelpSheet isOpen={helpOpen} onClose={() => setHelpOpen(false)} initialTab="basics" />
    </main>
  );
}
