'use client';

import React, { useState, useEffect } from 'react';
import { Ban, Shield, AlertCircle, Crosshair } from 'lucide-react';
import { PlayerView } from '@/lib/types';
import { RoleDef } from '@/lib/content';
import { Avatar, Button, Kbd, Modal, RubberStamp } from './ui';
import { useShortcut, pushScope, popScope } from '@/lib/shortcuts';

interface TargetPickerProps {
  players: PlayerView[];
  myPlayerId: string;
  roleDef?: RoleDef | null;
  selectedId: string | null | 'hold';
  onSelect: (targetId: string | 'skip' | 'hold') => void;
  mode: 'night' | 'voting';
  allowSkip?: boolean;
  allowHoldFire?: boolean;
  disabled?: boolean;
  teammatePicks?: Record<string, string | null>;
  investigations?: { targetId: string; result: string }[];
  doctorSelfSavesRemaining?: number;
  doctorLastSavedId?: string | null;
  doctorSameTargetTwice?: boolean;
}

export function TargetPicker({
  players,
  myPlayerId,
  roleDef,
  selectedId,
  onSelect,
  mode,
  allowSkip = false,
  allowHoldFire = false,
  disabled = false,
  teammatePicks,
  investigations,
  doctorSelfSavesRemaining,
  doctorLastSavedId,
  doctorSameTargetTwice = false,
}: TargetPickerProps) {
  const [pendingTarget, setPendingTarget] = useState<PlayerView | null>(null);
  const [pendingSpecial, setPendingSpecial] = useState<'skip' | 'hold' | null>(null);

  const confirmOpen = Boolean(pendingTarget || pendingSpecial);

  // Manage scope when confirm dialog is open
  useEffect(() => {
    if (confirmOpen) {
      pushScope('dialog');
      return () => popScope('dialog');
    }
  }, [confirmOpen]);

  // Filter selectable targets
  const eligiblePlayers = players.filter((p) => {
    if (!p.alive || p.isGod) return false;
    if (mode === 'night' && roleDef) {
      if (!roleDef.allowSelfTarget && p.id === myPlayerId) return false;
      if (roleDef.id === 'doctor' && p.id === myPlayerId && doctorSelfSavesRemaining === 0) return false;
      if (roleDef.id === 'doctor' && !doctorSameTargetTwice && doctorLastSavedId === p.id) return false;
    }
    if (mode === 'voting' && p.id === myPlayerId) return false; // cannot vote for self
    return true;
  });

  const handleCardClick = (p: PlayerView) => {
    if (disabled) return;
    setPendingTarget(p);
  };

  const handleSpecialClick = (type: 'skip' | 'hold') => {
    if (disabled) return;
    setPendingSpecial(type);
  };

  const handleConfirmAction = () => {
    if (pendingTarget) {
      onSelect(pendingTarget.id);
      setPendingTarget(null);
    } else if (pendingSpecial) {
      onSelect(pendingSpecial);
      setPendingSpecial(null);
    }
  };

  const handleCancelAction = () => {
    setPendingTarget(null);
    setPendingSpecial(null);
  };

  // Keyboard shortcut handlers (1-9, 0)
  useShortcut(
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    (e) => {
      if (disabled || confirmOpen) return;
      const num = parseInt(e.key, 10);
      const index = num === 0 ? 9 : num - 1;
      if (eligiblePlayers[index]) {
        handleCardClick(eligiblePlayers[index]);
      }
    },
    { scope: 'screen', enabled: !confirmOpen && !disabled }
  );

  // 'S' for Skip Vote
  useShortcut(
    ['s', 'S'],
    () => {
      if (allowSkip && !disabled && !confirmOpen) {
        handleSpecialClick('skip');
      }
    },
    { scope: 'screen', enabled: allowSkip && !disabled && !confirmOpen }
  );

  // 'X' for Hold Fire (Vigilante)
  useShortcut(
    ['x', 'X'],
    () => {
      if (allowHoldFire && !disabled && !confirmOpen) {
        handleSpecialClick('hold');
      }
    },
    { scope: 'screen', enabled: allowHoldFire && !disabled && !confirmOpen }
  );

  // Dialog shortcuts (Y / Enter / N / Esc)
  useShortcut(
    ['y', 'Y', 'Enter'],
    () => {
      if (confirmOpen) handleConfirmAction();
    },
    { scope: 'dialog', enabled: confirmOpen }
  );

  useShortcut(
    ['n', 'N', 'Escape'],
    () => {
      if (confirmOpen) handleCancelAction();
    },
    { scope: 'dialog', enabled: confirmOpen }
  );

  return (
    <div className="space-y-5">
      {/* Player Target Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {eligiblePlayers.map((p, idx) => {
          const isSelected = selectedId === p.id;
          const teammateWhoTargeted = teammatePicks
            ? Object.entries(teammatePicks).find(([mId, targetId]) => targetId === p.id && mId !== myPlayerId)
            : null;
          const teammatePlayer = teammateWhoTargeted
            ? players.find((x) => x.id === teammateWhoTargeted[0])
            : null;

          return (
            <div
              key={p.id}
              onClick={() => handleCardClick(p)}
              className={`relative flex flex-col items-center p-3 sm:p-4 border transition-all cursor-pointer select-none text-center ${
                isSelected
                  ? 'bg-[#171A20] border-[#D9A441] ring-2 ring-[#D9A441]/80 text-[#ECE6D8] shadow-2xl scale-[1.02]'
                  : teammatePlayer
                  ? 'bg-[#101216] border-[#B3363B]/80 hover:border-[#B3363B] shadow-md'
                  : 'bg-[#101216] hover:bg-[#171A20] border-[#262A33] hover:border-[#D9A441]/60'
              } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {/* Keyboard Index Tag */}
              <div className="absolute top-2 left-2">
                <Kbd className="bg-[#0A0B0E] border-[#262A33] text-[#A39D90] text-[10px] px-1.5 py-0.5">
                  {idx === 9 ? '0' : idx + 1}
                </Kbd>
              </div>

              {/* Status indicator on top right */}
              <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                {(() => {
                  const inv = investigations?.find((i) => i.targetId === p.id);
                  if (!inv) return null;
                  const resLower = inv.result.toLowerCase();
                  const isNotMafia = resLower.includes('not');
                  const isMaf = !isNotMafia && (resLower.includes('mafia') || resLower.includes('godfather'));
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase rounded-[2px] border shadow-md ${
                        isMaf
                          ? 'bg-[#1C0D0E] text-[#FF8585] border-[#B3363B] shadow-[0_0_8px_rgba(179,54,59,0.35)]'
                          : 'bg-[#0A1814] text-[#7CE4B5] border-[#5E8C7B] shadow-[0_0_8px_rgba(94,140,123,0.35)]'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isMaf ? 'bg-[#FF8585]' : 'bg-[#7CE4B5]'}`} />
                      <span>{isMaf ? 'MAFIA' : 'NOT MAFIA'}</span>
                    </span>
                  );
                })()}
                {isSelected && (
                  <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-[#D9A441] text-[#0A0B0E] shadow-sm uppercase tracking-wider">
                    Selected
                  </span>
                )}
                {teammatePlayer && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#B3363B] text-white border border-[#7E2327] flex items-center gap-1 shadow-md animate-pulse">
                    <Crosshair className="w-3 h-3 text-white" />
                    <span>{teammatePlayer.name}&apos;s Pick</span>
                  </span>
                )}
              </div>

              {/* Avatar with pin color halo */}
              <div className="relative my-3">
                <Avatar avatarId={p.avatar} size={54} className="border border-[#262A33] shadow-md" />
                <div
                  className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-[#0A0B0E]"
                  style={{ backgroundColor: p.color || '#D9A441' }}
                  title={`Color Pin #${idx + 1}`}
                />
              </div>

              <div className="text-xs sm:text-sm font-serif font-bold text-[#ECE6D8] truncate max-w-full">
                {p.name}
              </div>
              <div className="text-[10px] text-[#A39D90] font-mono mt-0.5">Slot #{idx + 1}</div>
            </div>
          );
        })}
      </div>

      {/* Auxiliary Actions (Skip Vote, Hold Fire) */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {allowSkip && (
          <Button
            variant={selectedId === 'skip' ? 'primary' : 'secondary'}
            size="md"
            onClick={() => handleSpecialClick('skip')}
            disabled={disabled}
            kbd="S"
            className="font-serif text-xs font-bold uppercase tracking-wider"
          >
            <Ban className="w-4 h-4 mr-1.5" />
            <span>Skip Vote</span>
          </Button>
        )}

        {allowHoldFire && (
          <Button
            variant={selectedId === 'hold' ? 'primary' : 'secondary'}
            size="md"
            onClick={() => handleSpecialClick('hold')}
            disabled={disabled}
            kbd="X"
            className="font-serif text-xs font-bold uppercase tracking-wider"
          >
            <Shield className="w-4 h-4 mr-1.5" />
            <span>Hold Fire Tonight</span>
          </Button>
        )}
      </div>

      {/* Target Confirmation Modal */}
      <Modal
        isOpen={Boolean(pendingTarget)}
        onClose={handleCancelAction}
        title={mode === 'voting' ? 'Confirm Vote Ballot' : 'Confirm Night Target'}
      >
        <div className="space-y-4">
          <div className="p-4 bg-[#171A20] border border-[#262A33] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#D9A441] shrink-0" />
            <div className="text-xs sm:text-sm font-mono text-[#ECE6D8] leading-relaxed">
              {mode === 'voting' ? (
                <span>
                  Are you sure you want to cast your ballot to eliminate{' '}
                  <strong className="text-[#D9A441] underline font-serif font-bold">{pendingTarget?.name}</strong> today?
                </span>
              ) : (
                <span>
                  Are you sure you want to {roleDef?.nightVerb?.toLowerCase() || 'target'}{' '}
                  <strong className="text-[#D9A441] underline font-serif font-bold">{pendingTarget?.name}</strong> tonight?
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={handleCancelAction}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmAction}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Special Action Confirmation Modal (Skip Vote / Hold Fire) */}
      <Modal
        isOpen={Boolean(pendingSpecial)}
        onClose={handleCancelAction}
        title={pendingSpecial === 'skip' ? 'Confirm Skip Vote' : 'Confirm Hold Fire'}
      >
        <div className="space-y-4">
          <div className="p-4 bg-[#171A20] border border-[#262A33] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#D9A441] shrink-0" />
            <div className="text-xs sm:text-sm font-mono text-[#ECE6D8] leading-relaxed">
              {pendingSpecial === 'skip' ? (
                <span>
                  Are you sure you wish to <strong className="text-[#D9A441]">Skip elimination</strong> today? No player will receive your ballot.
                </span>
              ) : (
                <span>
                  Are you sure you wish to <strong className="text-[#D9A441]">Hold your fire</strong> tonight? Your ammunition will be preserved.
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={handleCancelAction}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmAction}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

