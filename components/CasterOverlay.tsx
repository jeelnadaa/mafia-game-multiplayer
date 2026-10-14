'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tv,
  Eye,
  EyeOff,
  Shield,
  Users,
  Video,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { streamerManager, CasterMode } from '@/lib/streamer';

interface CasterOverlayProps {
  gameView: ClientGameView;
  className?: string;
}

export function CasterOverlay({ gameView, className = '' }: CasterOverlayProps) {
  const [streamerSafe, setStreamerSafe] = useState(() => streamerManager.isEnabled());
  const [casterMode, setCasterMode] = useState<CasterMode>(() => streamerManager.getCasterMode());
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    return streamerManager.subscribe(() => {
      setStreamerSafe(streamerManager.isEnabled());
      setCasterMode(streamerManager.getCasterMode());
    });
  }, []);

  if (!streamerSafe) return null;

  const { players = [], phase, round, winner } = gameView;
  const livingPlayers = players.filter((p) => p.alive && !p.isGod);
  const deadPlayers = players.filter((p) => !p.alive && !p.isGod);

  // Approximate or exact team counts depending on caster mode
  const mafiaLiving = livingPlayers.filter((p) => p.role === 'mafia' || p.role === 'godfather').length;
  const townLiving = livingPlayers.length - mafiaLiving;

  const handleToggleMode = () => {
    const nextMode: CasterMode = casterMode === 'blind' ? 'god' : 'blind';
    streamerManager.setCasterMode(nextMode);
  };

  return (
    <div className={`fixed top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none font-['Instrument_Sans'] ${className}`}>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-[#101216]/95 border border-[#818CF8]/50 shadow-[0_4px_24px_rgba(129,140,248,0.25)] backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3 text-xs font-mono text-[#ECE6D8]"
      >
        {/* Stream Safe Watermark */}
        <div className="flex items-center gap-1.5 text-[#818CF8] font-bold tracking-wider uppercase border-r border-[#262A33] pr-3 shrink-0">
          <Tv className="w-3.5 h-3.5 animate-pulse" />
          <span>CASTER HUD</span>
        </div>

        {/* Phase & Round Pill */}
        <div className="flex items-center gap-2 border-r border-[#262A33] pr-3 shrink-0">
          <span className="text-[#D9A441] font-bold uppercase">
            {phase === 'lobby'
              ? 'LOBBY'
              : phase === 'night'
              ? `NIGHT ${round}`
              : phase === 'discussion'
              ? `DAY ${round} DISCUSSION`
              : phase === 'voting'
              ? `DAY ${round} VOTE`
              : phase === 'gameOver'
              ? 'GAME OVER'
              : phase.toUpperCase()}
          </span>
        </div>

        {/* Caster Scoreboard: Living Counts */}
        <div className="flex items-center gap-2 border-r border-[#262A33] pr-3 shrink-0">
          <Users className="w-3.5 h-3.5 text-[#A39D90]" />
          <span>
            <strong className="text-emerald-400">{livingPlayers.length}</strong> living
          </span>
          {casterMode === 'god' && (
            <span className="text-[10px] text-[#A39D90]">
              (<span className="text-emerald-400 font-bold">{townLiving}T</span> /{' '}
              <span className="text-[#B3363B] font-bold">{mafiaLiving}M</span>)
            </span>
          )}
        </div>

        {/* Caster View Toggle: Blind (No Spoilers) vs Omniscient God */}
        <button
          type="button"
          onClick={handleToggleMode}
          title={
            casterMode === 'blind'
              ? 'Blind Mode Active (Secret roles hidden so you and viewers guess together). Click for God view.'
              : 'Omniscient God Mode Active (All roles visible to caster). Click for Blind view.'
          }
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
            casterMode === 'blind'
              ? 'bg-[#818CF8]/20 text-[#818CF8] border border-[#818CF8]/60 hover:bg-[#818CF8]/30'
              : 'bg-[#D9A441]/20 text-[#D9A441] border border-[#D9A441]/60 hover:bg-[#D9A441]/30'
          }`}
        >
          {casterMode === 'blind' ? (
            <>
              <EyeOff className="w-3 h-3" />
              <span>Blind Caster (Safe)</span>
            </>
          ) : (
            <>
              <Eye className="w-3 h-3" />
              <span>God Caster (All Roles)</span>
            </>
          )}
        </button>

        {/* Exit Streamer Mode */}
        <button
          type="button"
          onClick={() => streamerManager.setStreamerMode(false)}
          title="Exit Streamer Mode (Shift+S)"
          className="text-[#A39D90] hover:text-[#ECE6D8] pl-1 text-[11px] cursor-pointer"
        >
          ✕
        </button>
      </motion.div>
    </div>
  );
}

/**
 * Reusable Streamer Privacy Curtain component:
 * Wraps sensitive text (role name, detective result, room code, etc.)
 * in a frosted privacy curtain with a hover/click reveal so stream viewers never get spoiled.
 */
interface StreamerCurtainProps {
  children: React.ReactNode;
  fallbackText?: string;
  className?: string;
}

export function StreamerCurtain({
  children,
  fallbackText = 'CONFIDENTIAL [HOVER TO PEEK]',
  className = '',
}: StreamerCurtainProps) {
  const [streamerSafe, setStreamerSafe] = useState(() => streamerManager.isEnabled());
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    return streamerManager.subscribe(() => {
      setStreamerSafe(streamerManager.isEnabled());
    });
  }, []);

  if (!streamerSafe) {
    return <>{children}</>;
  }

  return (
    <span
      onMouseEnter={() => setIsRevealed(true)}
      onMouseLeave={() => setIsRevealed(false)}
      onClick={() => setIsRevealed(!isRevealed)}
      title="Streamer Safe Curtain (Hover or tap to reveal privately)"
      className={`relative inline-block cursor-pointer select-none transition-all ${className}`}
    >
      <span
        className={`transition-all duration-200 ${
          isRevealed ? 'blur-0 opacity-100' : 'blur-md opacity-20 pointer-events-none'
        }`}
      >
        {children}
      </span>

      {!isRevealed && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono tracking-wider text-[#D9A441] bg-[#101216]/95 border border-[#D9A441]/40 rounded px-1.5 py-0.5 whitespace-nowrap shadow-sm">
          <EyeOff className="w-2.5 h-2.5 mr-1 text-[#D9A441]" />
          <span>{fallbackText}</span>
        </span>
      )}
    </span>
  );
}
