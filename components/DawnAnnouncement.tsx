'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Skull, ShieldCheck, CheckCircle2, AlertOctagon } from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { Avatar, Badge, Button } from './ui';
import { playDayChime, playEliminationKnell } from '@/lib/sfx';

interface DawnAnnouncementProps {
  gameView: ClientGameView;
  onProceed?: () => void;
}

export function DawnAnnouncement({ gameView, onProceed }: DawnAnnouncementProps) {
  const { round, settings, log = [], players = [] } = gameView;

  const [step, setStep] = useState<number>(0);

  // Find morning logs for this round
  const morningLogs = log.filter((l) => l.round === round && l.phase === 'morning');
  const deathLogs = morningLogs.filter((l) => l.type === 'death');
  const saveLogs = morningLogs.filter((l) => l.type === 'save');

  // Identify who died this morning
  const casualties = players.filter((p) => !p.alive && p.diedInRound === round && p.diedBy !== 'vote');

  useEffect(() => {
    playDayChime();
    const t1 = setTimeout(() => setStep(1), 1200);
    const t2 = setTimeout(() => {
      setStep(2);
      if (casualties.length > 0) {
        playEliminationKnell();
      }
    }, 2800);
    const t3 = setTimeout(() => setStep(3), 4200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [round, casualties.length]);

  return (
    <div className="w-full max-w-[900px] mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[65vh] text-center select-none">
      {/* Sun Icon Header */}
      <div className="w-16 h-16 rounded-none border border-amber-500/40 bg-amber-950/20 flex items-center justify-center text-amber-400 mx-auto mb-6 animate-pulse">
        <Sun className="w-8 h-8" />
      </div>

      <div className="space-y-6 w-full max-w-lg">
        {/* Step 0: Town wakes */}
        <div className="space-y-1 animate-in fade-in duration-500">
          <span className="text-[11px] font-mono tracking-widest text-amber-400 uppercase font-bold px-2.5 py-0.5 bg-amber-950/40 border border-amber-800">
            DAYBREAK · ROUND {round}
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-text tracking-wide pt-2">
            The Town Wakes
          </h2>
          <p className="text-xs text-muted">
            The shadows of night disperse across the city streets.
          </p>
        </div>

        {/* Step 1: Casualties and Saves Announcements */}
        {step >= 1 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {casualties.length > 0 ? (
              casualties.map((victim) => {
                const roleDef = victim.role ? ROLES[victim.role] : null;
                const canRevealRole =
                  settings.revealRoleOnDeath === 'full' && Boolean(roleDef);
                const canRevealAlignment =
                  settings.revealRoleOnDeath === 'alignment' && Boolean(victim.role);

                return (
                  <div
                    key={victim.id}
                    className="p-5 bg-red-950/40 border-2 border-red-700/80 shadow-2xl space-y-3"
                  >
                    <div className="flex items-center justify-center gap-2 text-red-400 text-xs font-mono font-bold uppercase tracking-wider">
                      <Skull className="w-4 h-4" />
                      <span>Casualty Discovered</span>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <Avatar avatarId={victim.avatar} size={48} className="rounded-none border-red-600 grayscale" />
                      <div className="text-left">
                        <div className="text-lg font-black text-white line-through decoration-red-500">
                          {victim.name}
                        </div>
                        <div className="text-xs font-mono text-red-300">
                          Found fallen in the night
                        </div>
                      </div>
                    </div>

                    {/* Step 2+: Role Reveal if settings permit */}
                    {step >= 2 && canRevealRole && roleDef && (
                      <div className="pt-2 border-t border-red-900/60 flex items-center justify-center gap-2 text-xs text-zinc-300">
                        <span>Their true assignment was:</span>
                        <Badge color={roleDef.team === 'mafia' ? 'mafia' : 'civilian'}>
                          {roleDef.name}
                        </Badge>
                      </div>
                    )}

                    {step >= 2 && canRevealAlignment && !canRevealRole && (
                      <div className="pt-2 border-t border-red-900/60 flex items-center justify-center gap-2 text-xs text-zinc-300">
                        <span>Their true allegiance was:</span>
                        <Badge color={victim.role === 'mafia' || victim.role === 'godfather' ? 'mafia' : 'civilian'}>
                          {victim.role === 'mafia' || victim.role === 'godfather' ? 'MAFIA' : 'TOWN'}
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-5 bg-surface-2 border border-border shadow-xl space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="text-base font-bold text-white">
                  Nobody Was Harmed Tonight
                </div>
                <p className="text-xs text-muted">
                  The morning sirens remain quiet. All citizens survived the darkness.
                </p>
              </div>
            )}

            {/* Doctor Save Notice if Announce Save Setting is Enabled */}
            {settings.announceSave && saveLogs.length > 0 && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>The doctor intervened in time! A victim was shielded from fatal injury.</span>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Button to proceed or timer countdown */}
        {step >= 2 && onProceed && (
          <div className="pt-4 animate-in fade-in duration-300">
            <Button variant="primary" size="lg" onClick={onProceed} className="font-bold text-xs uppercase px-8">
              Proceed to Discussion
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
