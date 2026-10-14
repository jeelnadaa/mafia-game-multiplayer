'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Eye, EyeOff, Lock, Users, Check, AlertTriangle, Crosshair, Search, Heart, Award } from 'lucide-react';
import { ClientGameView, PlayerView, Role } from '@/lib/types';
import { ROLES, RoleDef } from '@/lib/content';
import { Avatar, Button, Badge } from './ui';
import { hapticTick, hapticConfirm } from '@/lib/haptics';
import { getLocalPreferences } from '@/lib/settings';

interface RoleRevealProps {
  gameView: ClientGameView;
  onConfirmReady?: () => void;
}

export function RoleReveal({ gameView, onConfirmReady }: RoleRevealProps) {
  const me = gameView.me;
  const role: Role = me?.role || 'civilian';
  const roleDef: RoleDef = ROLES[role] || ROLES.civilian;

  const [isRevealed, setIsRevealed] = useState(false);
  const [isGuarded, setIsGuarded] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [localPrefs, setLocalPrefs] = useState(() => getLocalPreferences());

  const cardRef = useRef<HTMLDivElement>(null);

  // Synchronize local preferences
  useEffect(() => {
    setLocalPrefs(getLocalPreferences());
  }, []);

  // Peek Guard: Automatically blur and mask if window loses focus or device orientation changes
  useEffect(() => {
    if (!localPrefs.peekGuard) return;

    const handleBlur = () => {
      setIsGuarded(true);
      setIsRevealed(false);
    };
    const handleFocus = () => {
      setIsGuarded(false);
    };
    const handleOrientation = () => {
      setIsGuarded(true);
      setIsRevealed(false);
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('orientationchange', handleOrientation);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, [localPrefs.peekGuard]);

  // Keyboard alternative: Space or Enter held down reveals the card
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && !isRevealed) {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        setIsRevealed(true);
        hapticTick();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!localPrefs.tapToToggleRole) {
          setIsRevealed(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRevealed, localPrefs.tapToToggleRole]);

  // Interaction handlers for press-and-hold (pointer events)
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (localPrefs.tapToToggleRole) {
      setIsRevealed((prev) => {
        const next = !prev;
        if (next) hapticTick();
        return next;
      });
    } else {
      setIsRevealed(true);
      hapticTick();
    }
  };

  const handlePointerUp = () => {
    if (!localPrefs.tapToToggleRole) {
      setIsRevealed(false);
    }
  };

  const handlePointerLeave = () => {
    if (!localPrefs.tapToToggleRole) {
      setIsRevealed(false);
    }
  };

  const handleConfirm = () => {
    setHasConfirmed(true);
    hapticConfirm();
    onConfirmReady?.();
  };

  // Find syndicate teammates if player is Mafia or Godfather
  const isSyndicate = role === 'mafia' || role === 'godfather';
  const teammates = isSyndicate
    ? gameView.players.filter(
        (p) => p.id !== me?.id && (p.role === 'mafia' || p.role === 'godfather')
      )
    : [];

  // Ready count calculation for host & players
  const confirmedCount = gameView.players.filter((p) => p.ready || p.isHost).length;
  const totalPlayers = gameView.players.length;


  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[70vh]">
      {/* Dossier Header */}
      <div className="text-center space-y-2 mb-6 max-w-md">
        <span className="text-[11px] font-mono tracking-widest text-muted uppercase font-bold px-2 py-0.5 bg-surface-2 border border-border">
          CONFIDENTIAL ASSIGNMENT · ROUND 1
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-text tracking-wide">
          Your Secret Allegiance
        </h1>
        <p className="text-xs text-muted leading-relaxed">
          {localPrefs.tapToToggleRole
            ? 'Tap the dossier card below to flip and inspect your assigned role.'
            : 'Press and hold the dossier card below to inspect your assigned role. Releasing will immediately conceal your identity.'}
        </p>
      </div>

      {/* 3D Flip Card Container */}
      <div className="perspective-1000 w-[300px] sm:w-[360px] h-[440px] sm:h-[480px] relative select-none touch-none">
        <div
          ref={cardRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className={`w-full h-full relative transform-style-preserve-3d transition-transform duration-500 cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.8)] ${
            isRevealed ? 'rotate-y-180' : ''
          } ${isGuarded ? 'filter blur-md' : ''}`}
        >
          {/* ========================================================= */}
          {/* CARD BACK: Physical Case-File Diagonal Hatching Dossier    */}
          {/* ========================================================= */}
          <div className="absolute inset-0 backface-hidden bg-[#111113] border-2 border-zinc-700 flex flex-col items-center justify-between p-6 card-back-pattern">
            {/* Top Classified Stamp */}
            <div className="w-full flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-[10px] font-mono tracking-widest text-red-500 font-bold border border-red-900/60 bg-red-950/40 px-2 py-0.5">
                TOP SECRET
              </span>
              <Lock className="w-4 h-4 text-zinc-500" />
            </div>

            {/* Center Call-to-Action Seal */}
            <div className="text-center space-y-3 p-4 bg-zinc-950/90 border border-zinc-800 shadow-2xl">
              <Eye className="w-8 h-8 text-zinc-400 mx-auto animate-pulse" />
              <div className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                {localPrefs.tapToToggleRole ? 'TAP TO REVEAL' : 'HOLD TO REVEAL'}
              </div>
              <p className="text-[11px] text-zinc-400 font-sans leading-tight">
                Hold with finger or press Spacebar. Guard against shoulder surfing.
              </p>
            </div>

            {/* Bottom Warning Badge */}
            <div className="w-full text-center text-[10px] font-mono text-zinc-600 border-t border-zinc-800 pt-3">
              DEVICE PROTECTION ACTIVE · PEEK GUARD READY
            </div>
          </div>

          {/* ========================================================= */}
          {/* CARD FRONT: High-Contrast Inked Role File                 */}
          {/* ========================================================= */}
          <div
            className={`absolute inset-0 backface-hidden rotate-y-180 bg-surface border-2 p-6 flex flex-col justify-between ${
              roleDef.team === 'mafia'
                ? 'border-red-600/80'
                : roleDef.team === 'jester'
                ? 'border-amber-500/80'
                : 'border-zinc-300'
            }`}
          >
            {/* Top Affiliation Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 inline-block ${
                    roleDef.team === 'mafia'
                      ? 'bg-red-500'
                      : roleDef.team === 'jester'
                      ? 'bg-amber-400'
                      : 'bg-white'
                  }`}
                />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
                  TEAM {roleDef.team.toUpperCase()}
                </span>
              </div>
              <Badge color={roleDef.team === 'mafia' ? 'mafia' : 'civilian'}>
                {roleDef.name}
              </Badge>
            </div>

            {/* Role Title & Emblem */}
            <div className="text-center space-y-3 my-auto">
              <div className="w-16 h-16 mx-auto border-2 border-border bg-surface-2 flex items-center justify-center text-white shadow-inner">
                {role === 'mafia' || role === 'godfather' ? (
                  <Crosshair className="w-8 h-8 text-red-500" />
                ) : role === 'doctor' ? (
                  <Heart className="w-8 h-8 text-emerald-400" />
                ) : role === 'police' ? (
                  <Search className="w-8 h-8 text-blue-400" />
                ) : role === 'vigilante' ? (
                  <Crosshair className="w-8 h-8 text-zinc-400" />
                ) : (
                  <Users className="w-8 h-8 text-zinc-300" />
                )}
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-wider text-text uppercase">
                  {roleDef.name}
                </h2>
                <div className="text-xs font-semibold text-muted mt-1 px-4">
                  {roleDef.summary}
                </div>

              </div>

              {/* Ability Description */}
              <div className="p-3 bg-surface-2 border border-border text-left text-xs text-text space-y-1">
                <span className="text-[10px] font-mono uppercase text-muted font-bold block">
                  Night Operations Directive:
                </span>
                <p className="leading-relaxed text-zinc-300">
                  {roleDef.howToPlay}
                </p>
              </div>
            </div>

            {/* Release Instruction Footer */}
            <div className="text-center pt-2 border-t border-border text-[11px] font-mono text-muted">
              {localPrefs.tapToToggleRole ? 'Tap card again to conceal' : 'Release touch to conceal role'}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SYNDICATE INTEL PANEL (For Mafia & Godfather only)         */}
      {/* ========================================================= */}
      {isSyndicate && isRevealed && (
        <div className="w-full max-w-md mt-6 p-4 bg-red-950/40 border border-red-900/80 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-900/60">
            <Crosshair className="w-4 h-4 text-red-400" />
            <span className="text-xs font-mono font-bold text-red-200 uppercase tracking-wider">
              Syndicate Intelligence: Teammates
            </span>
          </div>
          {teammates.length > 0 ? (
            <div className="space-y-2">
              {teammates.map((tm) => (
                <div
                  key={tm.id}
                  className="flex items-center justify-between p-2 bg-black/60 border border-red-900/40 text-xs text-text"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar avatarId={tm.avatar} size={28} className="rounded-none border-red-800" />
                    <span className="font-semibold text-white">{tm.name}</span>
                  </div>
                  <Badge color="mafia">{tm.role?.toUpperCase() || 'MAFIA'}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-red-300/80 italic">
              You are the lone Syndicate operative in this room tonight. Operate silently.
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ACTION BAR: Ready Confirmation & Host Status Tracker       */}
      {/* ========================================================= */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 text-center">
        <Button
          variant={hasConfirmed ? 'secondary' : 'primary'}
          size="lg"
          onClick={handleConfirm}
          disabled={hasConfirmed}
          className="font-bold text-sm px-8"
        >
          {hasConfirmed ? (
            <span className="flex items-center gap-2 text-emerald-400">
              <Check className="w-4 h-4" /> Ready for Night 1
            </span>
          ) : (
            'I Understand My Role (Confirm Ready)'
          )}
        </Button>

        <div className="text-xs font-mono text-muted">
          Confirmed: <strong className="text-white">{confirmedCount}</strong> / {totalPlayers} Players
        </div>
      </div>
    </div>
  );
}
