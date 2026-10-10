'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Users, HelpCircle, Sparkles, ChevronRight, Moon } from 'lucide-react';
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
    <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-noise relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-mafia/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-8 text-center">
        {/* Brand Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-2 border border-border text-mafia shadow-2xl mx-auto">
            <Moon className="w-8 h-8 fill-current" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-black tracking-widest uppercase text-text">
              M A F I A
            </h1>
            <p className="text-xs text-muted tracking-wider uppercase mt-1">
              Shadows of the City · Multiplayer WebRTC
            </p>
          </div>
        </div>

        {/* Identity Setup Card */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-6 shadow-2xl text-left">
          {/* Avatar Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text">Choose Your Identity Avatar</label>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => saveProfile(name, id)}
                  className={`p-1 rounded-xl border transition-all flex items-center justify-center ${
                    avatar === id
                      ? 'border-day-amber bg-surface-2 ring-2 ring-day-amber/30 scale-105'
                      : 'border-border/60 hover:border-muted bg-surface-2/40'
                  }`}
                >
                  <Avatar avatarId={id} size={36} />
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text">Player Codename</label>
            <input
              type="text"
              value={name}
              onChange={(e) => saveProfile(e.target.value, avatar)}
              placeholder="e.g. Inspector Vance"
              maxLength={20}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-day-amber"
            />
          </div>

          {/* Create Game Button */}
          <Button variant="accent" size="lg" onClick={handleCreateGame} className="w-full">
            <Play className="w-4 h-4 mr-2 fill-current" />
            <span>Create New Game</span>
          </Button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-border w-full" />
            <span className="bg-surface px-3 text-[11px] font-mono uppercase text-muted tracking-wider">
              OR JOIN WITH CODE
            </span>
          </div>

          {/* Join Game Form */}
          <form onSubmit={handleJoinGame} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="5-LETTER CODE"
                maxLength={5}
                className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-center font-mono text-sm tracking-widest text-text placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-day-amber uppercase"
              />
              <Button type="submit" variant="secondary" size="md">
                <span>Join</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </form>
        </div>

        {/* Footer Links & Shortcuts */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-1.5 hover:text-text transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-day-amber" />
            <span>How to Play & Roles</span>
            <Kbd>H</Kbd>
          </button>
        </div>
      </div>

      {/* Guide & Rules Sheet Modal */}
      <HelpSheet isOpen={helpOpen} onClose={() => setHelpOpen(false)} initialTab="basics" />
    </main>
  );
}
