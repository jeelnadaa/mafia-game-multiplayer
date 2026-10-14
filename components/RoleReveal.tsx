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
    if (localPrefs.tapToToggleRole) {
      setIsRevealed((prev) => {
        const next = !prev;
        if (next) hapticTick();
        return next;
      });
      return;
    }

    setIsRevealed(true);
    hapticTick();

    // Attach global window release listeners to guarantee immediate concealment on mouse/touch release
    const onRelease = () => {
      setIsRevealed(false);
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('mouseup', onRelease);
      window.removeEventListener('touchend', onRelease);
      window.removeEventListener('touchcancel', onRelease);
    };

    window.addEventListener('pointerup', onRelease);
    window.addEventListener('mouseup', onRelease);
    window.addEventListener('touchend', onRelease);
    window.addEventListener('touchcancel', onRelease);
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
    <div className="w-full max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[70vh] text-bone relative">
      {/* Warm Ambient Spotlight Glow Pool */}
      <div
        className="absolute pointer-events-none z-0"
        style={{
          width: 'min(680px, 92vw)',
          height: 'min(680px, 92vw)',
          background: 'radial-gradient(circle at 50% 48%, rgba(217,164,65,0.22) 0%, rgba(91,122,153,0.12) 40%, transparent 70%)',
          filter: 'blur(35px)',
        }}
      />

      {/* Dossier Header */}
      <div className="relative z-10 text-center space-y-2.5 mb-6 max-w-md">
        <span className="t text-[11px] tracking-[3px] text-[#D9A441] uppercase font-bold px-3 py-1 bg-[#171A20] border border-[#D9A441]/50 rounded-[2px] inline-block shadow-md">
          CLASSIFIED DOSSIER · EYES ONLY
        </span>
        <h1 className="d text-3xl md:text-5xl font-black text-[#ECE6D8] tracking-[2px] uppercase leading-tight">
          Your Secret Assignment
        </h1>
        <p className="font-sans text-xs sm:text-sm text-[#C5BFB2] leading-relaxed max-w-sm mx-auto">
          {localPrefs.tapToToggleRole
            ? 'Tap the dossier folder below to inspect your assigned identity.'
            : 'Hold down the dossier folder below to inspect your orders. Releasing will immediately conceal your identity.'}
        </p>
      </div>

      {/* 3D Flip Card Container */}
      <div className="relative z-10 perspective-1000 w-[300px] sm:w-[360px] h-[450px] sm:h-[490px] select-none touch-none">
        <div
          ref={cardRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className={`w-full h-full relative transform-style-preserve-3d transition-transform duration-500 cursor-pointer shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(217,164,65,0.18)] ${
            isRevealed ? 'rotate-y-180' : ''
          } ${isGuarded ? 'filter blur-md' : ''}`}
        >
          {/* ========================================================= */}
          {/* CARD BACK: Physical Case-File Manila Folder Dossier       */}
          {/* ========================================================= */}
          <div className="absolute inset-0 backface-hidden bg-[#181C24] border-2 border-[#3E4656] rounded-[8px] flex flex-col items-center justify-between p-6 font-sans shadow-2xl">
            {/* Top Manila Tab / Classified Stamp */}
            <div className="w-full flex items-center justify-between border-b border-[#3E4656] pb-3">
              <span className="t text-[10px] tracking-[2px] text-[#fca5a5] font-bold border border-[#B3363B] bg-[#B3363B]/25 px-2.5 py-0.5 rounded-[2px] shadow-sm">
                TOP SECRET · CONFIDENTIAL
              </span>
              <Lock className="w-4 h-4 text-[#D9A441]" />
            </div>

            {/* Center Call-to-Action Seal */}
            <div className="text-center space-y-2.5 p-6 bg-[#202530] border border-[#3E4656] rounded-[4px] shadow-2xl w-full">
              <Eye className="w-9 h-9 text-[#D9A441] mx-auto animate-pulse" />
              <div className="d text-2xl font-black tracking-[2px] text-[#ECE6D8] uppercase">
                {localPrefs.tapToToggleRole ? 'TAP TO UNSEAL' : 'HOLD TO REVEAL'}
              </div>
              <p className="font-sans text-xs text-[#C5BFB2] leading-snug">
                Hold with finger or press Spacebar. Guard against prying eyes.
              </p>
            </div>

            {/* Bottom Warning Badge */}
            <div className="w-full text-center font-sans text-[10px] sm:text-[11px] font-semibold tracking-wider text-[#A39D90] uppercase border-t border-[#3E4656] pt-3">
              DEVICE PROTECTION ACTIVE · PEEK GUARD READY
            </div>
          </div>

          {/* ========================================================= */}
          {/* CARD FRONT: High-Contrast Inked Role File                 */}
          {/* ========================================================= */}
          {/* ========================================================= */}
          {/* CARD FRONT: Physical Cream Paper Classified Dossier Card  */}
          {/* ========================================================= */}
          <div
            className="absolute inset-0 backface-hidden rotate-y-180 rounded-[8px] bg-[#ECE6D8] text-[#15130f] p-[18px] shadow-[0_30px_80px_rgba(0,0,0,.65)] select-none flex flex-col justify-between"
            style={{ transform: 'rotateY(180deg) rotate(-1.5deg)' }}
          >
            {/* Inner Hairline */}
            <div className="absolute inset-[10px] border border-[#b9b2a2] rounded-[4px] pointer-events-none" />

            <div>
              {/* Classified Stamp */}
              <div className="t relative inline-block border-2 border-[#7E2327] text-[#7E2327] px-[10px] py-[2px] text-[13px] tracking-[2px] -rotate-4 mt-[6px] ml-[6px]">
                CLASSIFIED
              </div>

              {/* Role Vector Emblem */}
              <div className="flex justify-center mt-3">
                {role === 'mafia' || role === 'godfather' ? (
                  <svg viewBox="0 0 120 90" width="120" height="90" role="img" aria-label="Fedora emblem">
                    <ellipse cx="60" cy="64" rx="54" ry="14" fill="#15130f" />
                    <path d="M30 64C30 30 40 12 60 12s30 18 30 52z" fill="#15130f" />
                    <rect x="31" y="46" width="58" height="11" fill="#7E2327" />
                    <path d="M52 14c4 8 12 8 16 0" stroke="#ECE6D8" strokeWidth="2" fill="none" />
                  </svg>
                ) : role === 'doctor' ? (
                  <svg viewBox="0 0 120 90" width="120" height="90" role="img" aria-label="Medical emblem">
                    <circle cx="60" cy="45" r="36" fill="#15130f" />
                    <rect x="54" y="25" width="12" height="40" fill="#5E8C7B" />
                    <rect x="40" y="39" width="40" height="12" fill="#5E8C7B" />
                  </svg>
                ) : role === 'police' ? (
                  <svg viewBox="0 0 120 90" width="120" height="90" role="img" aria-label="Police star shield">
                    <path d="M60 15L85 30V55C85 70 60 82 60 82C60 82 35 70 35 55V30L60 15Z" fill="#15130f" />
                    <circle cx="60" cy="48" r="14" fill="#3E5A78" />
                    <polygon points="60,39 63,46 70,47 65,51 67,58 60,54 53,58 55,51 50,47 57,46" fill="#ECE6D8" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 120 90" width="120" height="90" role="img" aria-label="Town Scales emblem">
                    <circle cx="60" cy="45" r="32" fill="#15130f" />
                    <path d="M42 45h36M60 25v38" stroke="#ECE6D8" strokeWidth="3" />
                    <circle cx="42" cy="52" r="8" fill="#5E8C7B" />
                    <circle cx="78" cy="52" r="8" fill="#5E8C7B" />
                  </svg>
                )}
              </div>

              {/* Big Role Title in Big Shoulders Display */}
              <div
                className={`d text-center text-[68px] sm:text-[78px] font-[900] leading-[0.92] tracking-[3px] mt-2 ${
                  roleDef.team === 'mafia' ? 'text-[#7E2327]' : roleDef.team === 'jester' ? 'text-[#7A5C86]' : 'text-[#3d6657]'
                }`}
              >
                {roleDef.name.toUpperCase()}
              </div>

              {/* Role Summary */}
              <div className="text-center text-[15px] sm:text-[16px] my-2 px-2 text-[#15130f] font-sans font-medium">
                {roleDef.summary}
              </div>

              {/* Rules in Special Elite */}
              <div className="t text-[12px] sm:text-[13px] leading-[1.5] border-t border-[#b9b2a2] pt-2 px-2 text-[#15130f]">
                <div>NIGHT — {roleDef.howToPlay}</div>
                <div className="mt-1">WIN — {roleDef.winCondition || 'The syndicate reaches parity.'}</div>
              </div>
            </div>

            {/* Syndicate Teammates Row */}
            {isSyndicate && teammates.length > 0 && (
              <div className="relative border-t border-[#b9b2a2] pt-2 flex items-center justify-between text-[13px] px-2">
                <span className="t text-[12px] tracking-[1px] text-[#15130f]">YOUR SYNDICATE</span>
                <div className="flex items-center gap-1.5">
                  {teammates.map((tm) => (
                    <div key={tm.id} className="w-[32px] h-[32px] rounded-full border-2 border-[#B3363B] overflow-hidden" title={`${tm.name} (Mafia)`}>
                      <Avatar avatarId={tm.avatar} size={28} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Release to Hide */}
      <div className="font-sans text-xs tracking-wider uppercase text-[#A39D90]/70 mt-3">
        Release to hide
      </div>

      {/* ========================================================= */}
      {/* ACTION BAR: Ready Confirmation & Host Status Tracker       */}
      {/* ========================================================= */}
      <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-[340px]">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={hasConfirmed}
          className={`w-full h-[54px] text-[16px] font-bold tracking-wider uppercase rounded-[4px] cursor-pointer transition-all font-sans ${
            hasConfirmed
              ? 'bg-[#101216] text-[#5E8C7B] border border-[#262A33]'
              : 'bg-[#D9A441] hover:bg-[#FFEA00] text-[#0A0B0E] border-2 border-transparent hover:border-[#FFEA00] hover:shadow-[0_0_35px_rgba(255,234,0,0.9)] hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {hasConfirmed ? (
            <span className="flex items-center justify-center gap-2">
              <Check className="w-5 h-5 text-[#5E8C7B]" /> Ready for Night 1
            </span>
          ) : (
            'I understand my role'
          )}
        </button>

        {/* Ready Dots Counter */}
        <div className="flex items-center justify-center gap-2 text-[14px] text-[#A39D90] font-sans">
          {Array.from({ length: totalPlayers }).map((_, i) => (
            <span
              key={i}
              className={`w-[10px] h-[10px] rounded-full ${
                i < confirmedCount
                  ? 'bg-[#D9A441]'
                  : 'border border-[#6b6455] bg-transparent'
              }`}
            />
          ))}
          <span className="ml-1">{confirmedCount} of {totalPlayers} ready</span>
        </div>
      </div>
    </div>
  );
}

