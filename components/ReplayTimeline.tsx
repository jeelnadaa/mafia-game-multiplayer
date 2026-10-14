'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Shield,
  Crosshair,
  Search,
  Skull,
  Vote,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { ClientGameView, SecretLogEntry, PlayerView } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { Avatar, RubberStamp } from './ui';

export interface TimelineStage {
  id: string;
  round: number;
  phase: 'briefing' | 'night' | 'day' | 'end';
  title: string;
  subtitle: string;
  secretEntry?: SecretLogEntry;
}

interface ReplayTimelineProps {
  gameView: ClientGameView;
  className?: string;
  onClose?: () => void;
}

export function ReplayTimeline({ gameView, className = '', onClose }: ReplayTimelineProps) {
  const { players = [], secretLog = [], log = [], winner } = gameView;

  // Build sequential list of replay stages from match history
  const stages = useMemo<TimelineStage[]>(() => {
    const list: TimelineStage[] = [];

    // Stage 0: Initial Match Setup
    list.push({
      id: 'stage-briefing',
      round: 0,
      phase: 'briefing',
      title: 'OPERATION BRIEFING',
      subtitle: `${players.length} Operatives Seated at the Round Table`,
    });

    // Build stages per round from secretLog
    // If secretLog has entries, use them; if not, construct from log
    const maxRound = Math.max(
      1,
      ...secretLog.map((s) => s.round),
      ...log.map((l) => l.round)
    );

    for (let r = 1; r <= maxRound; r++) {
      const secret = secretLog.find((s) => s.round === r);

      // 1. Night Stage
      list.push({
        id: `stage-r${r}-night`,
        round: r,
        phase: 'night',
        title: `NIGHT ${r} OPERATIONS`,
        subtitle: 'Covert Directives, Medical Shields & Investigations',
        secretEntry: secret,
      });

      // 2. Day Stage (if day votes or elimination occurred in round r)
      const hasDay =
        secret?.eliminatedByVote !== undefined ||
        Boolean(secret?.dayVotes) ||
        log.some((l) => l.round === r && (l.phase === 'voting' || l.type === 'vote'));

      if (hasDay || r < maxRound) {
        list.push({
          id: `stage-r${r}-day`,
          round: r,
          phase: 'day',
          title: `DAY ${r} TRIBUNAL`,
          subtitle: 'Town Hall Deliberations & Final Elimination Verdict',
          secretEntry: secret,
        });
      }
    }

    // Final Stage: Case Verdict
    list.push({
      id: 'stage-conclusion',
      round: maxRound,
      phase: 'end',
      title: 'CASE CONCLUDED',
      subtitle: winner ? `${winner.toUpperCase()} FACTION PREVAILED` : 'Operation Closed',
    });

    return list;
  }, [players.length, secretLog, log, winner]);

  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<any>(null);

  const activeStage = stages[currentStageIdx] || stages[0];

  // Auto-play stepper
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setCurrentStageIdx((prev) => {
          if (prev >= stages.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2400);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, stages.length]);

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentStageIdx((prev) => Math.min(stages.length - 1, prev + 1));
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentStageIdx((prev) => Math.max(0, prev - 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStageIdx(0);
  };

  // Helper player lookup
  const getPlayer = (id?: string | null): PlayerView | undefined => {
    if (!id) return undefined;
    return players.find((p) => p.id === id);
  };

  return (
    <div className={`w-full bg-[#101216] border border-[#262A33] rounded-[8px] p-4 sm:p-6 shadow-2xl text-[#ECE6D8] font-['Instrument_Sans'] select-none space-y-5 ${className}`}>
      {/* 1. Header with Scrubber Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262A33] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D9A441] animate-pulse" />
            <h3 className="d text-2xl sm:text-3xl font-extrabold tracking-wider text-[#ECE6D8] leading-none uppercase">
              POST-MATCH REPLAY TIMELINE
            </h3>
          </div>
          <p className="t text-xs text-[#A39D90] mt-1">
            Scrub through each night order, detective inquiry, doctor intervention, and day vote shift.
          </p>
        </div>

        {/* Playback Controls Dock */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-[#171A20] p-1.5 border border-[#262A33] rounded-[6px]">
          <button
            type="button"
            onClick={handleReset}
            title="Reset to Start"
            className="p-1.5 text-[#A39D90] hover:text-[#ECE6D8] transition-colors rounded hover:bg-[#262A33] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStageIdx === 0}
            title="Previous Stage"
            className="p-1.5 text-[#A39D90] hover:text-[#ECE6D8] disabled:opacity-30 disabled:pointer-events-none transition-colors rounded hover:bg-[#262A33] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause Replay' : 'Auto-Play Replay'}
            className="px-3 py-1 bg-[#D9A441] hover:bg-[#F0D79A] text-[#0A0B0E] font-bold text-xs uppercase rounded-[3px] transition-all flex items-center gap-1.5 shadow cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Replay</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={currentStageIdx === stages.length - 1}
            title="Next Stage"
            className="p-1.5 text-[#A39D90] hover:text-[#ECE6D8] disabled:opacity-30 disabled:pointer-events-none transition-colors rounded hover:bg-[#262A33] cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-2 px-2.5 py-1 text-xs text-[#A39D90] hover:text-[#ECE6D8] border-l border-[#262A33] cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* 2. Scrub Stepper Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-[#A39D90]">
          <span className="uppercase font-bold text-[#D9A441]">
            STAGE {currentStageIdx + 1} OF {stages.length}: {activeStage.title}
          </span>
          <span>{activeStage.subtitle}</span>
        </div>

        {/* Scrub Slider */}
        <input
          type="range"
          min={0}
          max={stages.length - 1}
          value={currentStageIdx}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentStageIdx(parseInt(e.target.value, 10));
          }}
          className="w-full h-2 bg-[#171A20] rounded-lg appearance-none cursor-pointer accent-[#D9A441] border border-[#262A33]"
        />

        {/* Stage Pills Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {stages.map((stage, idx) => {
            const isActive = idx === currentStageIdx;
            const isPast = idx < currentStageIdx;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStageIdx(idx);
                }}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-[3px] border uppercase transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#D9A441] text-[#0A0B0E] border-[#D9A441] font-bold shadow-[0_0_10px_rgba(217,164,65,0.4)]'
                    : isPast
                    ? 'bg-[#171A20] text-[#ECE6D8] border-[#38404E]'
                    : 'bg-[#101216] text-[#A39D90] border-[#262A33]'
                }`}
              >
                {stage.phase === 'briefing'
                  ? 'Briefing'
                  : stage.phase === 'night'
                  ? `Night ${stage.round}`
                  : stage.phase === 'day'
                  ? `Day ${stage.round}`
                  : 'Verdict'}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Stage Content Visualizer */}
      <div className="min-h-[260px] bg-[#14171E] border border-[#262A33] rounded-[6px] p-4 sm:p-6 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStage.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* ---------------- STAGE: BRIEFING ---------------- */}
            {activeStage.phase === 'briefing' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#262A33] pb-2">
                  <span className="text-xs font-mono font-bold text-[#D9A441] uppercase tracking-wider">
                    SEATED OPERATIVES & INITIAL ROLES
                  </span>
                  <span className="text-xs font-mono text-[#A39D90]">Room #{gameView.code}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {players.map((p) => {
                    const roleDef = p.role ? ROLES[p.role] : null;
                    return (
                      <div
                        key={p.id}
                        className="p-3 bg-[#171A20] border border-[#262A33] rounded-[4px] flex items-center gap-3"
                      >
                        <Avatar avatarId={p.avatar} size={36} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#ECE6D8] truncate">{p.name}</div>
                          {roleDef && (
                            <div
                              className="text-[10px] font-mono font-bold uppercase truncate"
                              style={{ color: roleDef.team === 'mafia' ? '#B3363B' : '#5E8C7B' }}
                            >
                              {roleDef.name}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ---------------- STAGE: NIGHT ---------------- */}
            {activeStage.phase === 'night' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#262A33] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#D9A441] uppercase tracking-wider">
                      ROUND {activeStage.round} · MIDNIGHT DIRECTIVES REVEALED
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#A39D90]">Secret Log Dossier</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mafia Target Card */}
                  {(() => {
                    const target = getPlayer(activeStage.secretEntry?.mafiaTarget);
                    const isDiscord = !activeStage.secretEntry?.mafiaTarget;
                    return (
                      <div className="p-4 bg-[#171A20] border border-[#B3363B]/50 rounded-[4px] space-y-2 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#B3363B] uppercase tracking-wider">
                            <Crosshair className="w-4 h-4 text-[#B3363B]" />
                            <span>Syndicate Assassination Hit</span>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#B3363B]/10 text-[#B3363B] border border-[#B3363B]/30">
                            CONFIDENTIAL
                          </span>
                        </div>

                        {target ? (
                          <div className="flex items-center gap-3 pt-1">
                            <Avatar avatarId={target.avatar} size={40} />
                            <div>
                              <div className="text-sm font-bold text-[#ECE6D8]">{target.name}</div>
                              <div className="text-xs font-mono text-[#A39D90]">Targeted for elimination</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs font-serif text-[#D9A441] italic pt-1">
                            {isDiscord
                              ? 'Syndicate discord: Operatives failed to agree on a unanimous target.'
                              : 'No assassination order executed.'}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Doctor Save Card */}
                  {(() => {
                    const saveIds = activeStage.secretEntry?.doctorSaves || [];
                    const isSaved =
                      activeStage.secretEntry?.mafiaTarget &&
                      saveIds.includes(activeStage.secretEntry.mafiaTarget);

                    return (
                      <div className="p-4 bg-[#171A20] border border-[#5E8C7B]/50 rounded-[4px] space-y-2 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#5E8C7B] uppercase tracking-wider">
                            <Shield className="w-4 h-4 text-[#5E8C7B]" />
                            <span>Doctor Emergency Shield</span>
                          </div>
                          {isSaved && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                              SUCCESSFUL SAVE!
                            </span>
                          )}
                        </div>

                        {saveIds.length > 0 ? (
                          <div className="space-y-1.5 pt-1">
                            {saveIds.map((id) => {
                              const p = getPlayer(id);
                              return (
                                <div key={id} className="flex items-center gap-3">
                                  {p && <Avatar avatarId={p.avatar} size={36} />}
                                  <div>
                                    <div className="text-sm font-bold text-[#ECE6D8]">
                                      {p?.name || id}
                                    </div>
                                    <div className="text-xs font-mono text-emerald-400">
                                      Shielded from midnight harm
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-xs font-serif text-[#A39D90] italic pt-1">
                            No medical shield deployed tonight.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Detective Investigations */}
                  {(() => {
                    const investigations = activeStage.secretEntry?.policeInvestigations || [];
                    return (
                      <div className="p-4 bg-[#171A20] border border-[#5B7A99]/50 rounded-[4px] space-y-2 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#5B7A99] uppercase tracking-wider">
                          <Search className="w-4 h-4 text-[#5B7A99]" />
                          <span>Police Detective Inquiries</span>
                        </div>

                        {investigations.length > 0 ? (
                          <div className="space-y-2 pt-1">
                            {investigations.map((inv, iIdx) => {
                              const detective = getPlayer(inv.policeId);
                              const target = getPlayer(inv.targetId);
                              const isGuilty =
                                inv.result.toLowerCase().includes('mafia') ||
                                inv.result.toLowerCase().includes('guilty');

                              return (
                                <div
                                  key={iIdx}
                                  className="p-2 bg-[#101216] border border-[#262A33] rounded flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    {target && <Avatar avatarId={target.avatar} size={28} />}
                                    <span className="font-bold text-[#ECE6D8]">{target?.name}</span>
                                  </div>
                                  <span
                                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                                      isGuilty
                                        ? 'bg-[#B3363B]/20 text-[#B3363B] border-[#B3363B]'
                                        : 'bg-[#5E8C7B]/20 text-emerald-400 border-[#5E8C7B]'
                                    }`}
                                  >
                                    Verdict: {inv.result}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-xs font-serif text-[#A39D90] italic pt-1">
                            No undercover surveillance filed.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Vigilante Marksman Shots */}
                  {(() => {
                    const vigShots = activeStage.secretEntry?.vigilanteShots || [];
                    return (
                      <div className="p-4 bg-[#171A20] border border-[#D9A441]/40 rounded-[4px] space-y-2 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#D9A441] uppercase tracking-wider">
                          <Crosshair className="w-4 h-4 text-[#D9A441]" />
                          <span>Vigilante Marksman Rounds</span>
                        </div>

                        {vigShots.length > 0 ? (
                          <div className="space-y-2 pt-1">
                            {vigShots.map((vig, vIdx) => {
                              const target = getPlayer(vig.targetId);
                              return (
                                <div
                                  key={vIdx}
                                  className="p-2 bg-[#101216] border border-[#262A33] rounded flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    {target && <Avatar avatarId={target.avatar} size={28} />}
                                    <span className="font-bold text-[#ECE6D8]">{target?.name}</span>
                                  </div>
                                  <span className="font-mono text-[10px] text-amber-300 font-bold uppercase">
                                    Shot Fired
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-xs font-serif text-[#A39D90] italic pt-1">
                            Marksman held fire tonight.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ---------------- STAGE: DAY (VOTES & VERDICT) ---------------- */}
            {activeStage.phase === 'day' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#262A33] pb-2">
                  <div className="flex items-center gap-2">
                    <Vote className="w-4 h-4 text-[#D9A441]" />
                    <span className="text-xs font-mono font-bold text-[#D9A441] uppercase tracking-wider">
                      ROUND {activeStage.round} · DAYTIME VOTING & TRIBUNAL VERDICT
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#A39D90]">Ballot Breakdown</span>
                </div>

                {/* Day Elimination Stamp Banner */}
                {activeStage.secretEntry?.eliminatedByVote ? (
                  (() => {
                    const victim = getPlayer(activeStage.secretEntry.eliminatedByVote);
                    return (
                      <div className="p-4 bg-[#171A20] border-2 border-[#B3363B]/60 rounded-[6px] flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {victim && <Avatar avatarId={victim.avatar} size={48} />}
                          <div>
                            <div className="text-xs font-mono text-[#B3363B] font-bold uppercase">
                              Eliminated by Majority Vote
                            </div>
                            <div className="text-lg font-black text-[#ECE6D8] font-['Big_Shoulders_Display']">
                              {victim?.name}
                            </div>
                            {activeStage.secretEntry.dayEliminatedRole && (
                              <div className="text-xs font-mono text-[#A39D90]">
                                True Allegiance:{' '}
                                <span className="text-[#D9A441] uppercase font-bold">
                                  {activeStage.secretEntry.dayEliminatedRole}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rotate-6 shrink-0">
                          <RubberStamp variant="eliminated" size="sm" text="EXECUTED" />
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-3 bg-[#171A20] border border-[#5E8C7B]/40 rounded-[4px] flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#5E8C7B]" />
                    <div className="text-xs font-serif text-[#ECE6D8]">
                      <strong>No Elimination:</strong> The town chose to skip voting or votes resulted in a tie.
                    </div>
                  </div>
                )}

                {/* Who Voted for Whom Mapping */}
                {activeStage.secretEntry?.dayVotes &&
                Object.keys(activeStage.secretEntry.dayVotes).length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-mono font-bold text-[#A39D90] uppercase tracking-wider">
                      Ballot Tally Matrix:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(activeStage.secretEntry.dayVotes).map(([voterId, targetId]) => {
                        const voter = getPlayer(voterId);
                        const target = targetId === 'skip' ? null : getPlayer(targetId);

                        return (
                          <div
                            key={voterId}
                            className="p-2.5 bg-[#101216] border border-[#262A33] rounded-[4px] flex items-center justify-between text-xs font-mono"
                          >
                            <span className="font-bold text-[#ECE6D8] truncate">{voter?.name || voterId}</span>
                            <span className="text-[#A39D90] px-1.5">➔</span>
                            <span
                              className={`font-bold px-2 py-0.5 rounded ${
                                targetId === 'skip'
                                  ? 'bg-[#171A20] text-[#A39D90]'
                                  : 'bg-[#D9A441]/10 text-[#D9A441] border border-[#D9A441]/30'
                              }`}
                            >
                              {target ? target.name : 'SKIP VOTE'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-[#A39D90] italic">
                    Individual ballot choices recorded in tribunal docket.
                  </div>
                )}
              </div>
            )}

            {/* ---------------- STAGE: CONCLUSION ---------------- */}
            {activeStage.phase === 'end' && (
              <div className="space-y-4 text-center py-6">
                <div className="w-16 h-16 rounded-full border-2 border-[#D9A441] bg-[#16222F]/40 flex items-center justify-center text-[#D9A441] mx-auto shadow-[0_0_30px_rgba(217,164,65,0.3)] animate-pulse">
                  <Award className="w-8 h-8" />
                </div>
                <h4 className="d text-4xl sm:text-5xl font-black text-[#ECE6D8] uppercase tracking-wider">
                  {winner ? `${winner.toUpperCase()} VICTORIOUS` : 'CASE CONCLUDED'}
                </h4>
                <p className="t text-sm text-[#A39D90] max-w-md mx-auto">
                  {winner === 'town'
                    ? 'All syndicate operatives eliminated. Peace restored to the city streets.'
                    : winner === 'mafia'
                    ? 'The underworld syndicate gained undisputed control over the metropolis.'
                    : 'The eccentric jester tricked the town tribunal into an untimely execution!'}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
