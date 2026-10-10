'use client';

import React, { useState, useEffect } from 'react';
import { Ban, Shield, AlertCircle, Crosshair } from 'lucide-react';
import { PlayerView } from '@/lib/types';
import { RoleDef } from '@/lib/content';
import { Avatar, Button, Kbd, Modal } from './ui';
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
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
              className={`relative flex flex-col items-center p-4 rounded-none border transition-colors cursor-pointer select-none text-center ${
                isSelected
                  ? 'bg-surface-2 border-white ring-2 ring-white text-white shadow-xl'
                  : teammatePlayer
                  ? 'bg-surface border-red-500/80 shadow-md'
                  : 'bg-surface hover:bg-zinc-900 border-border hover:border-zinc-500'
              } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {/* Keyboard Index Tag */}
              <div className="absolute top-2.5 left-2.5">
                <Kbd>{idx === 9 ? '0' : idx + 1}</Kbd>
              </div>

              {/* Status indicator on top right */}
              <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1">
                {isSelected && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-white text-black shadow-sm">
                    Selected
                  </span>
                )}
                {teammatePlayer && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-600 text-white border border-red-400 flex items-center gap-1 shadow-md animate-bounce">
                    <Crosshair className="w-3 h-3 text-white" />
                    <span>{teammatePlayer.name}&apos;s Pick</span>
                  </span>
                )}
              </div>

              {/* Square Avatar with Vibrant Full Colors */}
              <div className="relative my-3">
                <Avatar avatarId={p.avatar} size={60} className="rounded-none" />
              </div>

              <div className="text-sm md:text-base font-bold text-text truncate max-w-full">
                {p.name}
              </div>
              <div className="text-xs text-muted font-mono mt-0.5">Slot #{idx + 1}</div>
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
          <div className="p-3.5 bg-surface-2 border border-border flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-white shrink-0" />
            <div className="text-sm text-text leading-relaxed">
              {mode === 'voting' ? (
                <span>
                  Are you sure you want to cast your ballot to eliminate{' '}
                  <strong className="text-white underline font-bold">{pendingTarget?.name}</strong> today?
                </span>
              ) : (
                <span>
                  Are you sure you want to {roleDef?.nightVerb?.toLowerCase() || 'target'}{' '}
                  <strong className="text-white underline font-bold">{pendingTarget?.name}</strong> tonight?
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={handleCancelAction} kbd="N">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmAction} kbd="Y">
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
          <div className="p-3.5 bg-surface-2 border border-border flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-white shrink-0" />
            <div className="text-sm text-text leading-relaxed">
              {pendingSpecial === 'skip' ? (
                <span>
                  Are you sure you wish to <strong className="text-white">Skip elimination</strong> today? No player will receive your ballot.
                </span>
              ) : (
                <span>
                  Are you sure you wish to <strong className="text-white">Hold your fire</strong> tonight? Your ammunition will be preserved.
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={handleCancelAction} kbd="N">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmAction} kbd="Y">
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
