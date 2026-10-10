'use client';

import React from 'react';
import { Shield, Play, Pause, FastForward, Clock, Skull, HeartHandshake } from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { Button, Badge, Avatar, Kbd } from './ui';
import { useShortcut } from '@/lib/shortcuts';

interface GodProps {
  gameView: ClientGameView;
  onGodAction: (action: 'next' | 'pause' | 'extend' | 'skip') => void;
}

export function God({ gameView, onGodAction }: GodProps) {
  const { phase, round, players, settings, paused } = gameView;

  // Shortcuts: Shift+N, Shift+E, Shift+P, Shift+X, Shift+S
  useShortcut('Shift+N', () => onGodAction('next'), { scope: 'screen' });
  useShortcut('Shift+E', () => onGodAction('next'), { scope: 'screen' });
  useShortcut('Shift+P', () => onGodAction('pause'), { scope: 'screen' });
  useShortcut('Shift+X', () => onGodAction('extend'), { scope: 'screen' });
  useShortcut('Shift+S', () => onGodAction('skip'), { scope: 'screen' });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Control Room Header Banner */}
      <div className="bg-god/10 border-2 border-god/40 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-god/20 rounded-xl text-god">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg font-bold text-god">Narrator Control Room</h2>
              <Badge color="god">OMNISCIENT</Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Phase: <strong className="text-text uppercase">{phase}</strong> · Round {round} · {paused ? 'PAUSED' : 'ACTIVE'}
            </p>
          </div>
        </div>

        {/* Phase Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => onGodAction('pause')} kbd="Shift+P">
            {paused ? <Play className="w-3.5 h-3.5 mr-1" /> : <Pause className="w-3.5 h-3.5 mr-1" />}
            <span>{paused ? 'Resume' : 'Pause'}</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={() => onGodAction('extend')} kbd="Shift+X">
            <Clock className="w-3.5 h-3.5 mr-1" />
            <span>+30s</span>
          </Button>

          <Button variant="accent" size="sm" onClick={() => onGodAction('next')} kbd="Shift+N">
            <FastForward className="w-3.5 h-3.5 mr-1" />
            <span>Next Phase</span>
          </Button>
        </div>
      </div>

      {/* Omniscient Player Status Matrix */}
      <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-4 shadow-xl">
        <h3 className="font-heading text-sm font-semibold text-text">Player Status & True Roles:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {players.filter((p) => !p.isGod).map((p) => {
            const rDef = p.role ? ROLES[p.role] : null;
            return (
              <div
                key={p.id}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  p.alive ? 'bg-surface-2 border-border' : 'bg-surface-2/30 border-border/40 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Avatar avatarId={p.avatar} size={32} />
                  <div className="truncate">
                    <div className="text-xs font-semibold text-text truncate">{p.name}</div>
                    <div className="text-[10px] text-muted">
                      {p.alive ? (p.ready ? 'Ready' : 'Alive') : 'Deceased'}
                    </div>
                  </div>
                </div>

                {rDef && (
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: `${rDef.colour}15`,
                      borderColor: `${rDef.colour}40`,
                      color: rDef.colour,
                    }}
                  >
                    {rDef.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
