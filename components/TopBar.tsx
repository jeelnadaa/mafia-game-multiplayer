'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX, HelpCircle, Shield, Copy, Check } from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { CountdownRing, Kbd } from './ui';
import { toggleMute, getIsMuted } from '@/lib/sfx';

interface TopBarProps {
  gameView: ClientGameView;
  onOpenHelp: (tab?: 'basics' | 'my-role' | 'roles' | 'rules' | 'log' | 'notes' | 'keys') => void;
  rtt?: number;
  isReconnecting?: boolean;
}

export function TopBar({ gameView, onOpenHelp, rtt = 18, isReconnecting = false }: TopBarProps) {
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(getIsMuted());

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(gameView.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleSound = () => {
    const unmuted = toggleMute();
    setMuted(!unmuted);
  };

  const role = gameView.me?.role;
  const roleDef = role ? ROLES[role] : null;

  // Remaining phase duration calculation
  const remainingSeconds =
    gameView.phaseEndsAt && gameView.serverNow
      ? Math.max(0, (gameView.phaseEndsAt - gameView.serverNow) / 1000)
      : 0;

  return (
    <header className="sticky top-0 z-30 w-full bg-surface/90 backdrop-blur-md border-b border-border px-3 py-2 md:px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Room Code & Connection */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            title="Click to copy Room Code"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-border border border-border text-xs font-mono font-bold text-text transition-colors"
          >
            <span>{gameView.code}</span>
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
          </button>

          {/* Connection Chip */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-2/60 border border-border text-[11px] font-mono text-muted">
            <span
              className={`w-2 h-2 rounded-full ${
                isReconnecting ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
              }`}
            />
            <span>{isReconnecting ? 'Reconnecting' : `${rtt}ms`}</span>
          </div>
        </div>

        {/* Center: Phase & Round / Countdown Ring */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold font-heading text-text uppercase tracking-wider">
              {gameView.phase === 'roleReveal' ? 'REVEAL' : gameView.phase.toUpperCase()}
            </span>
            {gameView.round > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-surface-2 text-day-amber border border-border">
                R{gameView.round}
              </span>
            )}
          </div>

          {remainingSeconds > 0 && (
            <CountdownRing remainingSeconds={remainingSeconds} totalSeconds={45} size={32} strokeWidth={2.5} />
          )}
        </div>

        {/* Right: Role Chip, Help Button, Sound Mute */}
        <div className="flex items-center gap-2">
          {/* Role Chip: Tapping opens "My Role" */}
          {roleDef && (
            <button
              type="button"
              onClick={() => onOpenHelp('my-role')}
              style={{
                borderColor: `${roleDef.colour}50`,
                backgroundColor: `${roleDef.colour}15`,
                color: roleDef.colour,
              }}
              title="Click to view your role instructions"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <span>{roleDef.name}</span>
              <Kbd className="bg-transparent border-current text-current opacity-70">I</Kbd>
            </button>
          )}

          {/* Guide Button */}
          <button
            type="button"
            onClick={() => onOpenHelp('basics')}
            title="How to Play & Game Guide"
            className="flex items-center gap-1 p-1.5 md:px-2.5 md:py-1 rounded-lg bg-surface-2 hover:bg-border border border-border text-xs text-text transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-day-amber" />
            <span className="hidden md:inline">Guide</span>
            <Kbd>H</Kbd>
          </button>

          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={handleToggleSound}
            title={muted ? 'Unmute Sound (M)' : 'Mute Sound (M)'}
            className="p-1.5 rounded-lg bg-surface-2 hover:bg-border border border-border text-muted hover:text-text transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4 text-muted" /> : <Volume2 className="w-4 h-4 text-day-amber" />}
          </button>
        </div>
      </div>
    </header>
  );
}
