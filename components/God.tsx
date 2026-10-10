'use client';

import React, { useState } from 'react';
import { Shield, Play, Pause, FastForward, Clock } from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { Button, Badge, Avatar, Modal } from './ui';
import { useShortcut } from '@/lib/shortcuts';

interface GodProps {
  gameView: ClientGameView;
  onGodAction: (action: 'next' | 'pause' | 'extend' | 'skip') => void;
}

export function God({ gameView, onGodAction }: GodProps) {
  const { phase, round, players, paused } = gameView;
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);

  // Shortcuts: Shift+N, Shift+E, Shift+P, Shift+X, Shift+S
  useShortcut('Shift+N', () => setAdvanceModalOpen(true), { scope: 'screen' });
  useShortcut('Shift+E', () => setAdvanceModalOpen(true), { scope: 'screen' });
  useShortcut('Shift+P', () => onGodAction('pause'), { scope: 'screen' });
  useShortcut('Shift+X', () => onGodAction('extend'), { scope: 'screen' });
  useShortcut('Shift+S', () => setAdvanceModalOpen(true), { scope: 'screen' });

  const handleConfirmAdvance = () => {
    setAdvanceModalOpen(false);
    onGodAction('next');
  };

  return (
    <div className="w-full max-w-[1650px] 2xl:max-w-[1850px] mx-auto p-4 md:p-8 lg:p-10 space-y-6">
      {/* Control Room Header Banner */}
      <div className="bg-surface border border-border p-6 md:p-7 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 bg-surface-2 border border-border text-white">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg md:text-xl font-bold text-white">
                Narrator Control Console
              </h2>
              <Badge color="god">Omniscient</Badge>
            </div>
            <p className="text-xs md:text-sm text-muted mt-1">
              Current phase: <strong className="text-white capitalize">{phase}</strong> · Round {round} · {paused ? 'Paused' : 'Active'}
            </p>
          </div>
        </div>

        {/* Phase Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <Button variant="secondary" size="md" onClick={() => onGodAction('pause')} kbd="Shift+P">
            {paused ? <Play className="w-4 h-4 mr-1.5" /> : <Pause className="w-4 h-4 mr-1.5" />}
            <span>{paused ? 'Resume' : 'Pause'}</span>
          </Button>

          <Button variant="secondary" size="md" onClick={() => onGodAction('extend')} kbd="Shift+X">
            <Clock className="w-4 h-4 mr-1.5" />
            <span>+30 Seconds</span>
          </Button>

          <Button variant="primary" size="md" onClick={() => setAdvanceModalOpen(true)} kbd="Shift+N" className="font-bold">
            <FastForward className="w-4 h-4 mr-1.5" />
            <span>Next Phase</span>
          </Button>
        </div>
      </div>

      {/* Omniscient Player Status Matrix */}
      <div className="bg-surface border border-border p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="text-sm font-bold text-text">
            Surveillance Matrix · All Operatives & True Roles
          </h3>
          <span className="text-xs text-muted">
            {players.filter((p) => !p.isGod).length} subjects
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {players.filter((p) => !p.isGod).map((p) => {
            const rDef = p.role ? ROLES[p.role] : null;
            return (
              <div
                key={p.id}
                className={`p-3.5 border flex items-center justify-between transition-colors ${
                  p.alive ? 'bg-surface-2 border-border' : 'bg-surface-2/30 border-border/40 opacity-40'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Avatar avatarId={p.avatar} size={38} className="rounded-none" />
                  <div className="truncate">
                    <div className="text-sm font-semibold text-text truncate">{p.name}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {p.alive ? (p.ready ? 'Ready' : 'Alive') : 'Deceased'}
                    </div>
                  </div>
                </div>

                {rDef && (
                  <span className="text-xs font-medium px-2.5 py-0.5 border border-border bg-black text-white ml-2 shrink-0">
                    {rDef.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Advance Phase Confirmation Modal */}
      <Modal
        isOpen={advanceModalOpen}
        onClose={() => setAdvanceModalOpen(false)}
        title="Advance Phase"
      >
        <div className="space-y-4">
          <p className="text-sm text-text leading-relaxed">
            Are you sure you want to advance to the next phase immediately? Any remaining countdown timer will be bypassed.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAdvanceModalOpen(false)} kbd="Esc">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmAdvance} kbd="Enter">
              Advance Phase
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
