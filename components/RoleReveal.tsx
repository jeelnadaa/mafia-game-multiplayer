'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Shield, Eye, Lock, Users, Check, Crosshair, Search, Heart, Flame } from 'lucide-react';
import { ClientGameView, Role } from '@/lib/types';
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
    <div className="w-full max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[70vh] text-bone">
      {/* Dossier Header */}
      <div className="text-center space-y-2 mb-6 max-w-md font-mono">
        <span className="text-[11px] tracking-widest text-lamp uppercase font-bold px-2.5 py-1 bg-ink-900 border border-line inline-block">
          CLASSIFIED DOSSIER · EYES ONLY
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-bone tracking-wide font-serif">
          Your Secret Assignment
        </h1>
        <p className="text-xs text-bone-dim leading-relaxed">
          {localPrefs.tapToToggleRole
            ? 'Tap the dossier folder below to inspect your assigned identity.'
            : 'Hold down the dossier folder below to inspect your orders. Releasing will immediately conceal your identity.'}
        </p>
      </div>

      {/* 3D Flip Card Container */}
      <div className="perspective-1000 w-[300px] sm:w-[360px] h-[450px] sm:h-[490px] relative select-none touch-none">
        <div
          ref={cardRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className={`w-full h-full relative transform-style-preserve-3d transition-transform duration-500 cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.9)] ${
            isRevealed ? 'rotate-y-180' : ''
          } ${isGuarded ? 'filter blur-md' : ''}`}
        >
          {/* ========================================================= */}
          {/* CARD BACK: Physical Case-File Manila Folder Dossier       */}
          {/* ========================================================= */}
          <div className="absolute inset-0 backface-hidden bg-ink-900 border-2 border-line flex flex-col items-center justify-between p-6 card-back-pattern font-mono shadow-2xl">
            {/* Top Manila Tab / Classified Stamp */}
            <div className="w-full flex items-center justify-between border-b border-line pb-3">
              <span className="text-[10px] tracking-widest text-blood font-bold border border-blood/60 bg-blood/10 px-2 py-0.5">
                TOP SECRET · CONFIDENTIAL
              </span>
              <Lock className="w-4 h-4 text-bone-dim" />
            </div>

            {/* Center Call-to-Action Seal */}
            <div className="text-center space-y-3 p-5 bg-ink-950 border border-line shadow-2xl w-full">
              <Eye className="w-8 h-8 text-lamp mx-auto animate-pulse" />
              <div className="text-xs font-bold tracking-wider text-bone uppercase">
                {localPrefs.tapToToggleRole ? 'TAP TO UNSEAL' : 'HOLD TO REVEAL'}
              </div>
              <p className="text-[11px] text-bone-dim leading-tight">
                Hold with finger or press Spacebar. Guard against prying eyes.
              </p>
            </div>

            {/* Bottom Warning Badge */}
            <div className="w-full text-center text-[10px] text-bone-dim/60 border-t border-line pt-3">
              DEVICE PROTECTION ACTIVE · PEEK GUARD READY
            </div>
          </div>

          {/* ========================================================= */}
          {/* CARD FRONT: High-Contrast Inked Role File                 */}
          {/* ========================================================= */}
          <div
            className={`absolute inset-0 backface-hidden rotate-y-180 bg-ink-900 border-2 p-6 flex flex-col justify-between shadow-2xl font-mono ${
              roleDef.team === 'mafia'
                ? 'border-blood'
                : roleDef.team === 'jester'
                ? 'border-plum'
                : 'border-lamp'
            }`}
          >
            {/* Top Affiliation Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 inline-block ${
                    roleDef.team === 'mafia'
                      ? 'bg-blood'
                      : roleDef.team === 'jester'
                      ? 'bg-plum'
                      : 'bg-verdigris'
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-bone-dim">
                  TEAM {roleDef.team.toUpperCase()}
                </span>
              </div>
              <Badge color={roleDef.team === 'mafia' ? 'mafia' : 'civilian'}>
                {roleDef.name}
              </Badge>
            </div>

            {/* Role Title & Emblem */}
            <div className="text-center space-y-3 my-auto">
              <div className="w-16 h-16 mx-auto border border-line bg-ink-950 flex items-center justify-center text-bone shadow-inner">
                {role === 'mafia' || role === 'godfather' ? (
                  <Crosshair className="w-8 h-8 text-blood" />
                ) : role === 'doctor' ? (
                  <Heart className="w-8 h-8 text-verdigris" />
                ) : role === 'police' ? (
                  <Search className="w-8 h-8 text-night" />
                ) : role === 'vigilante' ? (
                  <Crosshair className="w-8 h-8 text-lamp" />
                ) : (
                  <Users className="w-8 h-8 text-bone-dim" />
                )}
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-wider text-bone uppercase font-serif">
                  {roleDef.name}
                </h2>
                <div className="text-xs text-bone-dim mt-1 px-4 leading-relaxed font-sans">
                  {roleDef.summary}
                </div>
              </div>

              {/* Ability Description */}
              <div className="p-3 bg-ink-950 border border-line text-left text-xs space-y-1">
                <span className="text-[10px] uppercase text-bone-dim font-bold block">
                  Night Operations Directive:
                </span>
                <p className="leading-relaxed text-bone font-sans text-[11px]">
                  {roleDef.howToPlay}
                </p>
              </div>
            </div>

            {/* Release Instruction Footer */}
            <div className="text-center pt-2 border-t border-line text-[10px] text-bone-dim">
              {localPrefs.tapToToggleRole ? 'Tap card again to conceal' : 'Release touch to conceal role'}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SYNDICATE INTEL PANEL (For Mafia & Godfather only)         */}
      {/* ========================================================= */}
      {isSyndicate && isRevealed && (
        <div className="w-full max-w-md mt-6 p-4 bg-ink-900 border border-blood/60 font-mono animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-blood/40">
            <Flame className="w-4 h-4 text-blood" />
            <span className="text-xs font-bold text-red-300 uppercase tracking-wider">
              Known Syndicate Associates
            </span>
          </div>
          {teammates.length > 0 ? (
            <div className="space-y-2">
              {teammates.map((tm) => (
                <div
                  key={tm.id}
                  className="flex items-center justify-between p-2 bg-ink-950 border border-blood/30 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar avatarId={tm.avatar} size={28} className="border border-blood/40" />
                    <span className="font-semibold text-bone">{tm.name}</span>
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
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 text-center font-mono">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={hasConfirmed}
          className={`px-8 py-3 text-xs uppercase tracking-wider font-bold border transition-all ${
            hasConfirmed
              ? 'bg-ink-800 text-emerald-400 border-line cursor-default'
              : 'bg-lamp text-ink-950 border-lamp hover:bg-lamp-soft shadow-lg active:scale-[0.99]'
          }`}
        >
          {hasConfirmed ? (
            <span className="flex items-center gap-2 text-emerald-400">
              <Check className="w-4 h-4" /> Acknowledged · Ready for Night 1
            </span>
          ) : (
            'Acknowledge Orders & Mark Ready'
          )}
        </button>

        <div className="text-xs text-bone-dim">
          Confirmed: <strong className="text-bone font-bold">{confirmedCount}</strong> / {totalPlayers} Operatives
        </div>
      </div>
    </div>
  );
}

