'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Skull, ShieldCheck, CheckCircle2, Newspaper } from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { Avatar, Badge, Button, RubberStamp } from './ui';
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
    }, 2600);
    const t3 = setTimeout(() => setStep(3), 3800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [round, casualties.length]);

  return (
    <div className="w-full max-w-[850px] mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[70vh] text-center select-none">
      {/* 1930s Gazette Extra Bulletin Header */}
      <div className="w-16 h-16 rounded border border-[#D9A441]/50 bg-[#16222F]/40 flex items-center justify-center text-[#D9A441] mx-auto mb-6 shadow-2xl animate-pulse">
        <Sun className="w-8 h-8" />
      </div>

      <div className="space-y-6 w-full max-w-lg">
        {/* Step 0: Town wakes */}
        <div className="space-y-2 animate-in fade-in duration-500">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#101216] border border-[#262A33]">
            <Newspaper className="w-3.5 h-3.5 text-[#D9A441]" />
            <span className="text-[10px] font-mono tracking-widest text-[#D9A441] uppercase font-bold">
              CITY DISPATCH · EXTRA EDITION · ROUND {round}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#ECE6D8] tracking-tight">
            The Town Wakes
          </h2>
          <p className="text-xs sm:text-sm text-[#A39D90] font-mono">
            The shadows of night disperse across the city streets.
          </p>
        </div>

        {/* Step 1: Casualties and Saves Announcements */}
        {step >= 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
                    className="relative overflow-hidden p-6 bg-[#101216] border-2 border-[#7E2327] shadow-2xl space-y-4 text-center"
                  >
                    {/* Elimination Rubber Stamp */}
                    <div className="absolute top-3 right-3 pointer-events-none">
                      <RubberStamp variant="eliminated" size="md" text="ELIMINATED" />
                    </div>

                    <div className="flex items-center justify-center gap-2 text-[#fca5a5] text-xs font-mono font-bold uppercase tracking-widest">
                      <Skull className="w-4 h-4 text-[#B3363B]" />
                      <span>Casualty Discovered</span>
                    </div>

                    <div className="flex items-center justify-center gap-4 py-1">
                      <Avatar avatarId={victim.avatar} size={56} className="border border-[#7E2327] grayscale" />
                      <div className="text-left">
                        <div className="text-xl font-serif font-black text-[#ECE6D8] line-through decoration-[#B3363B] decoration-2">
                          {victim.name}
                        </div>
                        <div className="text-xs font-mono text-[#fca5a5]">
                          Found fallen in the night
                        </div>
                      </div>
                    </div>

                    {/* Step 2+: Role Reveal if settings permit */}
                    {step >= 2 && canRevealRole && roleDef && (
                      <div className="pt-3 border-t border-[#262A33] flex items-center justify-center gap-2 text-xs font-mono text-[#A39D90]">
                        <span>Their true assignment was:</span>
                        <Badge color={roleDef.team === 'mafia' ? 'mafia' : 'civilian'} className="font-serif">
                          {roleDef.name}
                        </Badge>
                      </div>
                    )}

                    {step >= 2 && canRevealAlignment && !canRevealRole && (
                      <div className="pt-3 border-t border-[#262A33] flex items-center justify-center gap-2 text-xs font-mono text-[#A39D90]">
                        <span>Their true allegiance was:</span>
                        <Badge color={victim.role === 'mafia' || victim.role === 'godfather' ? 'mafia' : 'civilian'} className="font-serif">
                          {victim.role === 'mafia' || victim.role === 'godfather' ? 'MAFIA' : 'TOWN'}
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="relative overflow-hidden p-6 bg-[#101216] border border-[#262A33] shadow-2xl space-y-2.5">
                <div className="absolute top-3 right-3 pointer-events-none">
                  <RubberStamp variant="saved" size="sm" text="ALL SAFE" />
                </div>
                <CheckCircle2 className="w-9 h-9 text-[#5E8C7B] mx-auto" />
                <div className="text-lg font-serif font-bold text-[#ECE6D8]">
                  Nobody Was Harmed Tonight
                </div>
                <p className="text-xs sm:text-sm font-mono text-[#A39D90]">
                  The morning sirens remain quiet. All citizens survived the darkness.
                </p>
              </div>
            )}

            {/* Doctor Save Notice if Announce Save Setting is Enabled */}
            {settings.announceSave && saveLogs.length > 0 && (
              <div className="p-3.5 bg-[#171A20] border border-[#5E8C7B]/60 text-[#86efac] text-xs font-mono flex items-center justify-center gap-2 shadow-lg">
                <ShieldCheck className="w-4 h-4 text-[#5E8C7B] shrink-0" />
                <span>The doctor intervened in time! A victim was shielded from fatal injury.</span>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Button to proceed */}
        {step >= 2 && onProceed && (
          <div className="pt-4 animate-in fade-in duration-300">
            <Button
              variant="primary"
              size="lg"
              onClick={onProceed}
              className="font-serif font-black text-xs uppercase tracking-widest px-8 shadow-xl"
            >
              Proceed to Discussion
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

