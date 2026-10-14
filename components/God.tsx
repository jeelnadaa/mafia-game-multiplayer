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
    <div className="w-full max-w-[1650px] 2xl:max-w-[1850px] mx-auto p-3 sm:p-5 lg:p-8 space-y-6 select-none">
      {/* Control Room Header Banner */}
      <div className="relative overflow-hidden bg-[#101216] border border-[#262A33] p-5 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-5 shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D9A441]/50 to-transparent" />

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded border border-[#D9A441]/40 bg-[#171A20] flex items-center justify-center text-[#D9A441] shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[10px] tracking-widest text-[#D9A441] uppercase font-bold px-2 py-0.5 bg-[#171A20] border border-[#D9A441]/40">
                CASE #{gameView.code} · OMNISCIENT OVERSEER
              </span>
              <h2 className="text-xl md:text-2xl font-serif font-black text-[#ECE6D8] tracking-tight">
                Narrator Control Console
              </h2>
            </div>
            <p className="text-xs sm:text-sm font-mono text-[#A39D90] mt-1">
              Current phase: <strong className="text-[#D9A441] capitalize">{phase}</strong> · Round {round} · {paused ? 'Paused' : 'Active'}
            </p>
          </div>
        </div>

        {/* Phase Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <Button variant="secondary" size="md" onClick={() => onGodAction('pause')} kbd="Shift+P" className="font-serif text-xs font-bold uppercase tracking-wider">
            {paused ? <Play className="w-3.5 h-3.5 mr-1.5" /> : <Pause className="w-3.5 h-3.5 mr-1.5" />}
            <span>{paused ? 'Resume' : 'Pause'}</span>
          </Button>

          <Button variant="secondary" size="md" onClick={() => onGodAction('extend')} kbd="Shift+X" className="font-serif text-xs font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            <span>+30 Seconds</span>
          </Button>

          <Button variant="primary" size="md" onClick={() => setAdvanceModalOpen(true)} kbd="Shift+N" className="font-serif text-xs font-black uppercase tracking-wider">
            <FastForward className="w-3.5 h-3.5 mr-1.5" />
            <span>Next Phase</span>
          </Button>
        </div>
      </div>

      {/* Omniscient Player Status Matrix */}
      <div className="bg-[#101216] border border-[#262A33] p-5 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#262A33]">
          <h3 className="text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider">
            Surveillance Matrix · All Operatives & True Roles
          </h3>
          <span className="text-[11px] font-mono text-[#A39D90]">
            {players.filter((p) => !p.isGod).length} subjects
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {players.filter((p) => !p.isGod).map((p) => {
            const rDef = p.role ? ROLES[p.role] : null;
            return (
              <div
                key={p.id}
                className={`p-3.5 border flex items-center justify-between transition-colors ${
                  p.alive ? 'bg-[#171A20] border-[#262A33]' : 'bg-[#171A20]/30 border-[#262A33]/40 opacity-40'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Avatar avatarId={p.avatar} size={38} className="border border-[#262A33]" />
                  <div className="truncate">
                    <div className="text-xs sm:text-sm font-serif font-bold text-[#ECE6D8] truncate">{p.name}</div>
                    <div className="text-[10px] font-mono text-[#A39D90] mt-0.5">
                      {p.alive ? (p.ready ? 'Ready' : 'Alive') : 'Deceased'}
                    </div>
                  </div>
                </div>

                {rDef && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-[#262A33] bg-[#0A0B0E] text-[#D9A441] ml-2 shrink-0">
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
          <p className="text-xs sm:text-sm font-mono text-[#ECE6D8] leading-relaxed">
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

