'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Skull, ShieldCheck, CheckCircle2, Newspaper, AlertCircle } from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { Avatar, RubberStamp } from './ui';
import { playDayChime, playEliminationKnell } from '@/lib/sfx';
import { MorningNewspaper } from './MorningNewspaper';

interface DawnAnnouncementProps {
  gameView: ClientGameView;
  onProceed?: () => void;
  initialStep?: number;
}

export function DawnAnnouncement({ gameView, onProceed, initialStep = 0 }: DawnAnnouncementProps) {
  const { round, settings, log = [], players = [] } = gameView;

  const [step, setStep] = useState<number>(initialStep);
  const [viewMode, setViewMode] = useState<'newspaper' | 'bulletin'>('newspaper');

  // Find morning logs for this round
  const morningLogs = log.filter((l) => l.round === round && l.phase === 'morning');
  const isSyndicateDiscord = morningLogs.some(
    (l) =>
      l.text.toLowerCase().includes('syndicate discord') ||
      l.text.toLowerCase().includes('failed to reach unanimous') ||
      l.text.toLowerCase().includes('failed to reach agreement')
  );
  const saveLogs = morningLogs.filter((l) => l.type === 'save' && !isSyndicateDiscord);

  // Identify who died this morning
  const casualties = players.filter((p) => !p.alive && p.diedInRound === round && p.diedBy !== 'vote');

  useEffect(() => {
    playDayChime();
    const t1 = setTimeout(() => setStep(1), 800);
    const t2 = setTimeout(() => {
      setStep(2);
      if (casualties.length > 0) {
        playEliminationKnell();
      }
    }, 1800);
    const t3 = setTimeout(() => setStep(3), 2600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [round, casualties.length]);

  return (
    <div className="w-full max-w-[920px] mx-auto p-4 sm:p-6 flex flex-col items-center justify-center min-h-[75vh] select-none font-['Instrument_Sans']">
      {/* Mode Switcher: 1930s Broadsheet Newspaper vs Town Square Bulletin */}
      <div className="flex items-center justify-center gap-1.5 mb-4 bg-[#101216] p-1 border border-[#262A33] rounded-[4px] shadow-lg">
        <button
          type="button"
          onClick={() => setViewMode('newspaper')}
          className={`px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-[2px] transition-all flex items-center gap-1.5 cursor-pointer ${
            viewMode === 'newspaper'
              ? 'bg-[#D9A441] text-[#0A0B0E] shadow'
              : 'text-[#A39D90] hover:text-[#ECE6D8]'
          }`}
        >
          <Newspaper className="w-3.5 h-3.5" />
          <span>The Daily Observer (1930s Extra)</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('bulletin')}
          className={`px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-[2px] transition-all flex items-center gap-1.5 cursor-pointer ${
            viewMode === 'bulletin'
              ? 'bg-[#D9A441] text-[#0A0B0E] shadow'
              : 'text-[#A39D90] hover:text-[#ECE6D8]'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Town Bulletin</span>
        </button>
      </div>

      {viewMode === 'newspaper' ? (
        <MorningNewspaper gameView={gameView} onProceed={onProceed} />
      ) : (
        <>
          {/* Sun Ray Emblem */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: -30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-16 h-16 rounded-full border-2 border-[#D9A441] bg-[#16222F]/40 flex items-center justify-center text-[#D9A441] mx-auto mb-5 shadow-[0_0_30px_rgba(217,164,65,0.3)] animate-pulse"
          >
            <Sun className="w-8 h-8" />
          </motion.div>

          <div className="space-y-6 w-full max-w-lg text-center">
        {/* Step 0: Town wakes */}
        <motion.div
          initial={{ opacity: 0, y: -25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-2.5"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#101216] border border-[#262A33] rounded-[3px]">
            <Newspaper className="w-3.5 h-3.5 text-[#D9A441]" />
            <span className="text-[11px] font-mono tracking-widest text-[#D9A441] uppercase font-bold">
              CITY DISPATCH · EXTRA EDITION · ROUND {round}
            </span>
          </div>
          <h2 className="d text-5xl sm:text-6xl font-extrabold tracking-[4px] text-[#ECE6D8] uppercase leading-none">
            THE TOWN WAKES
          </h2>
          <p className="t text-base sm:text-lg text-[#A39D90]">
            The shadows of night disperse across the city streets.
          </p>
        </motion.div>

        {/* Step 1: Casualties and Saves Announcements */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              {casualties.length > 0 ? (
                casualties.map((victim, vIdx) => {
                  const roleDef = victim.role ? ROLES[victim.role] : null;
                  const canRevealRole =
                    settings.revealRoleOnDeath === 'full' && Boolean(roleDef);
                  const canRevealAlignment =
                    settings.revealRoleOnDeath === 'alignment' && Boolean(victim.role);

                  return (
                    <motion.div
                      key={victim.id}
                      initial={{ opacity: 0, y: -15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: vIdx * 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="relative overflow-hidden p-6 bg-[#101216] border-2 border-[#B3363B]/60 rounded-[8px] shadow-2xl space-y-4 text-center"
                    >
                      {/* Elimination Rubber Stamp */}
                      <div className="absolute top-4 right-4 pointer-events-none">
                        <RubberStamp variant="eliminated" size="md" text="ELIMINATED" />
                      </div>

                      <div className="flex items-center justify-center gap-2 text-red-400 text-xs font-mono font-bold uppercase tracking-widest">
                        <Skull className="w-4 h-4 text-[#B3363B]" />
                        <span>Casualty Discovered</span>
                      </div>

                      <div className="flex items-center justify-center gap-4 py-2">
                        <div className="w-16 h-16 rounded-full border-2 border-[#B3363B] overflow-hidden grayscale shrink-0">
                          <Avatar avatarId={victim.avatar} size={64} className="border-0" />
                        </div>
                        <div className="text-left">
                          <div className="d text-4xl sm:text-5xl font-extrabold text-[#ECE6D8] line-through decoration-[#B3363B] decoration-2 leading-none">
                            {victim.name}
                          </div>
                          <div className="t text-xs text-red-300 mt-1">
                            {victim.diedBy === 'vigilante' ? 'Eliminated by a marksman bullet' : 'Eliminated in the dark'}
                          </div>
                        </div>
                      </div>

                      {/* Step 2+: Role Reveal if settings permit */}
                      {step >= 2 && canRevealRole && roleDef && (
                        <div className="pt-3 border-t border-[#262A33] flex items-center justify-center gap-2 text-xs font-mono text-[#A39D90]">
                          <span>Assigned role:</span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded border text-[11px] uppercase ${
                              roleDef.team === 'mafia'
                                ? 'border-[#B3363B] text-[#B3363B] bg-[#B3363B]/10'
                                : 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                            }`}
                          >
                            {roleDef.name}
                          </span>
                        </div>
                      )}

                      {step >= 2 && canRevealAlignment && !canRevealRole && (
                        <div className="pt-3 border-t border-[#262A33] flex items-center justify-center gap-2 text-xs font-mono text-[#A39D90]">
                          <span>True allegiance:</span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded border text-[11px] uppercase ${
                              victim.role === 'mafia' || victim.role === 'godfather'
                                ? 'border-[#B3363B] text-[#B3363B] bg-[#B3363B]/10'
                                : 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                            }`}
                          >
                            {victim.role === 'mafia' || victim.role === 'godfather' ? 'MAFIA' : 'TOWN'}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              ) : isSyndicateDiscord ? (
                <motion.div
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="relative overflow-hidden p-6 bg-[#171A20] border-2 border-[#B3363B]/60 rounded-[8px] shadow-2xl space-y-3"
                >
                  <div className="absolute top-4 right-4 pointer-events-none">
                    <RubberStamp variant="eliminated" size="sm" text="DISCORD" />
                  </div>
                  <AlertCircle className="w-10 h-10 text-[#D9A441] mx-auto animate-pulse" />
                  <div className="d text-2xl sm:text-3xl font-extrabold text-[#ECE6D8] tracking-wider uppercase leading-tight">
                    SYNDICATE FAILED TO AGREE ON TARGET
                  </div>
                  <p className="t text-sm sm:text-base text-[#D9A441]">
                    Internal discord in the shadows prevented an assassination. Operatives failed to pick the same target unanimously, and nobody was harmed tonight!
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="relative overflow-hidden p-6 bg-[#171A20] border border-[#D9A441]/40 rounded-[8px] shadow-2xl space-y-3"
                >
                  <div className="absolute top-4 right-4 pointer-events-none">
                    <RubberStamp variant="saved" size="sm" text="ALL SAFE" />
                  </div>
                  <CheckCircle2 className="w-10 h-10 text-[#5E8C7B] mx-auto" />
                  <div className="d text-3xl sm:text-4xl font-extrabold text-[#D9A441] tracking-wider uppercase leading-none">
                    NOBODY WAS HARMED TONIGHT
                  </div>
                  <p className="t text-sm sm:text-base text-[#ECE6D8]">
                    The morning sirens remain quiet. All citizens survived the darkness.
                  </p>
                </motion.div>
              )}

              {/* Doctor Save Notice if Announce Save Setting is Enabled */}
              {settings.announceSave && saveLogs.length > 0 && !isSyndicateDiscord && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="p-4 bg-[#171A20] border border-[#5E8C7B]/60 text-emerald-300 text-sm font-sans flex items-center justify-center gap-3 shadow-lg rounded-[6px]"
                >
                  <ShieldCheck className="w-5 h-5 text-[#5E8C7B] shrink-0" />
                  <span>The doctor intervened in time! A victim was shielded from fatal injury.</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 3: Button to proceed */}
        <AnimatePresence>
          {step >= 2 && onProceed && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="pt-4"
            >
              <button
                type="button"
                onClick={onProceed}
                className="h-12 px-8 bg-[#D9A441] hover:bg-[#F0D79A] text-[#0A0B0E] font-bold text-sm sm:text-base uppercase tracking-wider rounded-[4px] shadow-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                Proceed to Discussion
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </>
      )}
    </div>
  );
}
