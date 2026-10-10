'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Shield, Search, Flame, Ban, Check, AlertCircle } from 'lucide-react';
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
}: TargetPickerProps) {
  const [pendingTarget, setPendingTarget] = useState<PlayerView | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
    if (mode === 'night' && roleDef?.needsConfirm) {
      setPendingTarget(p);
      setConfirmOpen(true);
    } else {
      onSelect(p.id);
    }
  };

  const handleConfirmAction = () => {
    if (pendingTarget) {
      onSelect(pendingTarget.id);
      setConfirmOpen(false);
      setPendingTarget(null);
    }
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
        onSelect('skip');
      }
    },
    { scope: 'screen', enabled: allowSkip && !disabled && !confirmOpen }
  );

  // 'X' for Hold Fire (Vigilante)
  useShortcut(
    ['x', 'X'],
    () => {
      if (allowHoldFire && !disabled && !confirmOpen) {
        onSelect('hold');
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
      if (confirmOpen) {
        setConfirmOpen(false);
        setPendingTarget(null);
      }
    },
    { scope: 'dialog', enabled: confirmOpen }
  );

  // Ring Icon & color by role
  const getActionRing = () => {
    if (mode === 'voting') return { color: '#F2B84B', icon: Check };
    if (!roleDef) return { color: '#ECEEF4', icon: Check };
    switch (roleDef.id) {
      case 'mafia':
      case 'godfather':
        return { color: '#E5383B', icon: Crosshair };
      case 'doctor':
        return { color: '#F4F6FA', icon: Shield };
      case 'police':
        return { color: '#5B8CFF', icon: Search };
      case 'vigilante':
        return { color: '#E5383B', icon: Flame };
      default:
        return { color: '#F2B84B', icon: Check };
    }
  };

  const actionStyle = getActionRing();
  const ActionIcon = actionStyle.icon;

  return (
    <div className="space-y-4">
      {/* Player Target Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {eligiblePlayers.map((p, idx) => {
          const isSelected = selectedId === p.id;
          return (
            <motion.div
              key={p.id}
              whileTap={disabled ? {} : { scale: 0.97 }}
              onClick={() => handleCardClick(p)}
              className={`relative flex flex-col items-center p-3.5 rounded-2xl border transition-all cursor-pointer select-none text-center ${
                isSelected
                  ? 'bg-surface-2 border-text shadow-lg'
                  : 'bg-surface hover:bg-surface-2/60 border-border hover:border-muted'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {/* Keyboard Index Tag */}
              <div className="absolute top-2 left-2">
                <Kbd>{idx === 9 ? '0' : idx + 1}</Kbd>
              </div>

              {/* Selection Halo / Ring */}
              <div className="relative my-2">
                <Avatar avatarId={p.avatar} size={56} />
                {isSelected && (
                  <motion.div
                    layoutId="selection-ring"
                    className="absolute -inset-1.5 rounded-full border-2 flex items-center justify-center animate-pulse"
                    style={{ borderColor: actionStyle.color }}
                  >
                    <div
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-bg shadow-md"
                      style={{ backgroundColor: actionStyle.color }}
                    >
                      <ActionIcon className="w-3 h-3" />
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="text-xs font-semibold text-text truncate max-w-full">{p.name}</div>
              <div className="text-[10px] text-muted font-mono mt-0.5">Player #{idx + 1}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Auxiliary Actions (Skip Vote, Hold Fire) */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {allowSkip && (
          <Button
            variant={selectedId === 'skip' ? 'accent' : 'secondary'}
            onClick={() => onSelect('skip')}
            disabled={disabled}
            kbd="S"
          >
            <Ban className="w-4 h-4 mr-1" />
            <span>Skip Vote</span>
          </Button>
        )}

        {allowHoldFire && (
          <Button
            variant={selectedId === 'hold' ? 'accent' : 'secondary'}
            onClick={() => onSelect('hold')}
            disabled={disabled}
            kbd="X"
          >
            <Shield className="w-4 h-4 mr-1" />
            <span>Hold Fire</span>
          </Button>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Action">
        <div className="p-2 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl border border-border">
            <AlertCircle className="w-5 h-5 text-day-amber shrink-0" />
            <div className="text-xs text-text leading-relaxed">
              Are you sure you wish to {roleDef?.nightVerb?.toLowerCase() || 'target'}{' '}
              <strong className="text-day-amber font-semibold">{pendingTarget?.name}</strong> tonight?
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} kbd="N">
              Cancel
            </Button>
            <Button variant="accent" onClick={handleConfirmAction} kbd="Y">
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
