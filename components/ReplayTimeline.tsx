'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Crosshair,
  Search,
  Vote,
  Award,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Moon,
  Sun,
  Gavel,
  X,
  CheckCircle2,
  AlertTriangle,
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

function getRoleTopBorder(role?: string): string {
  if (!role) return '#262A33';
  if (role === 'mafia' || role === 'godfather') return '#B3363B';
  if (role === 'doctor') return '#5E8C7B';
  if (role === 'police') return '#3E5A78';
  if (role === 'vigilante') return '#D9A441';
  if (role === 'jester') return '#8C6FA0';
  return '#6b6455';
}

function getRoleInkColor(role?: string): string {
  if (!role) return '#15130f';
  if (role === 'mafia' || role === 'godfather') return '#7E2327';
  if (role === 'doctor') return '#2C5E4E';
  if (role === 'police') return '#27425F';
  if (role === 'vigilante') return '#876426';
  if (role === 'jester') return '#5C3E75';
  return '#4D4637';
}

export function ReplayTimeline({ gameView, className = '', onClose }: ReplayTimelineProps) {
  const { players = [], secretLog = [], log = [], winner } = gameView;

  // Build sequential list of replay stages from match history
  const stages = useMemo<TimelineStage[]>(() => {
    const list: TimelineStage[] = [];

    // Stage 0: Initial Match Setup / Briefing
    list.push({
      id: 'stage-briefing',
      round: 0,
      phase: 'briefing',
      title: 'OPERATION BRIEFING',
      subtitle: `${players.length} Operatives Seated at the Round Table`,
    });

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
        subtitle: 'Covert Directives, Medical Shields & Inquests',
        secretEntry: secret,
      });

      // 2. Day Stage
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
          subtitle: 'Town Hall Deliberations & Execution Verdict',
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
  const activeStage = stages[currentStageIdx] || stages[0];

  const handleNext = () => {
    setCurrentStageIdx((prev) => Math.min(stages.length - 1, prev + 1));
  };

  const handlePrev = () => {
    setCurrentStageIdx((prev) => Math.max(0, prev - 1));
  };

  const getPlayer = (id?: string | null): PlayerView | undefined => {
    if (!id) return undefined;
    return players.find((p) => p.id === id);
  };

  return (
    <div
      className={`w-full bg-[#101216] border border-[#262A33] rounded-[8px] p-4 sm:p-6 shadow-2xl text-[#ECE6D8] font-['Instrument_Sans'] select-none space-y-4 ${className}`}
    >
      {/* 1. Header Bar: Noir Title, Stage Counter, and Modal Close */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262A33] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D9A441] shadow-[0_0_8px_#D9A441]" />
            <h3 className="d text-2xl sm:text-3xl font-extrabold tracking-wider text-[#ECE6D8] leading-none uppercase">
              POST-MATCH REPLAY TIMELINE
            </h3>
          </div>
          <p className="t text-xs text-[#A39D90] mt-1 tracking-wide">
            CONFIDENTIAL CASE DOSSIER · SELECT ANY STAGE IN THE CHRONOLOGY TO INSPECT INCIDENTS & EVIDENCE
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Stage Counter Badge */}
          <div className="px-3 py-1 bg-[#171A20] border border-[#262A33] rounded-[4px] font-mono text-xs text-[#D9A441] font-bold uppercase tracking-wider">
            STAGE {currentStageIdx + 1} OF {stages.length}
          </div>

          {/* Stepper Chevron Buttons */}
          <div className="flex items-center gap-1 bg-[#171A20] p-1 border border-[#262A33] rounded-[4px]">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStageIdx === 0}
              title="Previous Stage"
              className="p-1 text-[#A39D90] hover:text-[#ECE6D8] disabled:opacity-25 disabled:pointer-events-none transition-colors rounded hover:bg-[#262A33] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={currentStageIdx === stages.length - 1}
              title="Next Stage"
              className="p-1 text-[#A39D90] hover:text-[#ECE6D8] disabled:opacity-25 disabled:pointer-events-none transition-colors rounded hover:bg-[#262A33] cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#A39D90] hover:text-[#ECE6D8] rounded hover:bg-[#262A33] transition-colors cursor-pointer"
              title="Close Replay Timeline"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Two-Column Layout: Left Vertical Timeline + Right Stage Events */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#0A0B0E] border border-[#262A33] rounded-[6px] overflow-hidden min-h-[500px]">
        {/* ============================================================== */}
        {/* LEFT COLUMN: Vertical Days & Nights Timeline List             */}
        {/* ============================================================== */}
        <div className="md:col-span-4 lg:col-span-3 bg-[#0F1115] border-b md:border-b-0 md:border-r border-[#262A33] p-3 flex flex-col">
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#262A33] px-1">
            <span className="t text-xs font-bold uppercase tracking-wider text-[#D9A441]">
              CHRONOLOGY
            </span>
            <span className="font-mono text-[10px] text-[#A39D90] uppercase">
              {stages.length} Dockets
            </span>
          </div>

          <div className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto no-scrollbar max-h-[520px] pr-0 md:pr-1">
            {stages.map((stage, idx) => {
              const isActive = idx === currentStageIdx;
              const isBriefing = stage.phase === 'briefing';
              const isNight = stage.phase === 'night';
              const isDay = stage.phase === 'day';
              const isEnd = stage.phase === 'end';

              const casualtyCount = isNight
                ? stage.secretEntry?.mafiaTarget
                  ? stage.secretEntry?.doctorSaves?.includes(stage.secretEntry.mafiaTarget)
                    ? 0
                    : 1
                  : 0
                : 0;

              const hasExecution = isDay && Boolean(stage.secretEntry?.eliminatedByVote);

              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setCurrentStageIdx(idx)}
                  className={`w-full shrink-0 text-left p-2.5 rounded-[4px] border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                    isActive
                      ? 'bg-[#171A20] border-[#D9A441] border-l-4 shadow-[inset_0_0_12px_rgba(217,164,65,0.12)] text-[#ECE6D8]'
                      : 'bg-[#121419] border-[#222630] text-[#A39D90] hover:bg-[#161920] hover:text-[#ECE6D8]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Stage Type Icon */}
                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center shrink-0 text-xs font-mono font-bold ${
                        isActive
                          ? 'bg-[#D9A441] text-[#0A0B0E]'
                          : isNight
                          ? 'bg-[#1E2533] text-[#5B7A99]'
                          : isDay
                          ? 'bg-[#261E14] text-[#D9A441]'
                          : isBriefing
                          ? 'bg-[#1E2024] text-[#A39D90]'
                          : 'bg-[#291717] text-[#B3363B]'
                      }`}
                    >
                      {isBriefing && <FolderOpen className="w-3.5 h-3.5" />}
                      {isNight && <Moon className="w-3.5 h-3.5" />}
                      {isDay && <Sun className="w-3.5 h-3.5" />}
                      {isEnd && <Award className="w-3.5 h-3.5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="d text-base sm:text-lg font-bold tracking-wider uppercase leading-none truncate">
                        {isBriefing
                          ? 'Briefing'
                          : isNight
                          ? `Night ${stage.round}`
                          : isDay
                          ? `Day ${stage.round}`
                          : 'Verdict'}
                      </div>
                      <div className="t text-[10px] text-[#A39D90] truncate mt-0.5">
                        {isBriefing
                          ? 'Initial Roles'
                          : isNight
                          ? casualtyCount > 0
                            ? '1 Casualty'
                            : 'Covert Directives'
                          : isDay
                          ? hasExecution
                            ? 'Tribunal Executed'
                            : 'Deliberation'
                          : 'Case Verdict'}
                      </div>
                    </div>
                  </div>

                  {/* Active Indicator Chevron / Pip */}
                  {isActive ? (
                    <div className="w-2 h-2 rounded-full bg-[#D9A441] shrink-0 shadow-[0_0_6px_#D9A441]" />
                  ) : casualtyCount > 0 || hasExecution ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#B3363B] shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: The Things Which Happened in the Selected Stage   */}
        {/* ============================================================== */}
        <div className="md:col-span-8 lg:col-span-9 bg-[#13161C] p-4 sm:p-6 overflow-y-auto max-h-[580px] no-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStage.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Stage Sub-Header with Noir Typography */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262A33] pb-3">
                <div>
                  <div className="d text-2xl sm:text-3xl font-extrabold uppercase text-[#ECE6D8] tracking-wider leading-none">
                    {activeStage.title}
                  </div>
                  <div className="t text-xs text-[#D9A441] tracking-wide mt-1">
                    {activeStage.subtitle}
                  </div>
                </div>
                <div className="font-mono text-xs text-[#A39D90] uppercase">
                  CASE DOSSIER #{gameView.code}
                </div>
              </div>

              {/* ---------------- STAGE: BRIEFING (SEATED OPERATIVES) ---------------- */}
              {activeStage.phase === 'briefing' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="t text-xs font-bold text-[#A39D90] uppercase tracking-wider">
                      PERSONNEL MANIFEST & CONFIDENTIAL ROLES
                    </span>
                    <span className="t text-xs text-[#6b6455] italic">
                      Archive recorded at match commencement
                    </span>
                  </div>

                  {/* 1930s Manila Evidence Card Grid with Noir Typography */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {players.map((p, pIdx) => {
                      const topBorderColor = getRoleTopBorder(p.role);
                      const inkColor = getRoleInkColor(p.role);
                      const roleDef = p.role ? ROLES[p.role] : null;
                      const roleName = roleDef ? roleDef.name.toUpperCase() : 'UNKNOWN';

                      return (
                        <div
                          key={p.id}
                          className="relative rounded-[4px] p-3.5 shadow-md flex flex-col justify-between transition-transform hover:-translate-y-0.5 duration-150"
                          style={{
                            background: '#ECE6D8',
                            color: '#15130f',
                            borderTop: `5px solid ${topBorderColor}`,
                          }}
                        >
                          {/* Top Docket Tag */}
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-wider uppercase text-[#6b6455] border-b border-[#cfc8b8] pb-1.5 mb-2">
                            <span>DOSSIER #{pIdx + 1 < 10 ? `0${pIdx + 1}` : pIdx + 1}</span>
                            <span
                              className="font-bold uppercase"
                              style={{ color: topBorderColor }}
                            >
                              {roleDef?.team === 'mafia' ? 'SYNDICATE' : 'CITIZEN'}
                            </span>
                          </div>

                          {/* Operative Identity & Big Shoulders Role Title */}
                          <div className="flex items-center gap-3 my-1">
                            <Avatar avatarId={p.avatar} size={40} />
                            <div className="min-w-0">
                              <div className="font-sans font-bold text-sm text-[#15130f] truncate leading-tight">
                                {p.name}
                              </div>
                              <div
                                className="d text-2xl font-extrabold uppercase tracking-wide leading-none truncate mt-0.5"
                                style={{ color: inkColor }}
                              >
                                {roleName}
                              </div>
                            </div>
                          </div>

                          {/* Bottom Paper Docket Note */}
                          <div className="t text-[10px] text-[#555044] border-t border-[#cfc8b8] pt-1.5 mt-2 flex items-center justify-between">
                            <span>SEAT {pIdx + 1}</span>
                            <span className="font-bold">
                              {p.alive ? 'SURVIVOR' : `FALLEN (R${p.diedInRound || 1})`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ---------------- STAGE: NIGHT OPERATIONS ---------------- */}
              {activeStage.phase === 'night' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Syndicate Hit Order */}
                    {(() => {
                      const target = getPlayer(activeStage.secretEntry?.mafiaTarget);
                      const isDiscord = !activeStage.secretEntry?.mafiaTarget;
                      const wasSaved =
                        Boolean(target) &&
                        Boolean(
                          activeStage.secretEntry?.doctorSaves?.includes(target!.id)
                        );

                      return (
                        <div className="p-4 bg-[#171A20] border-t-4 border-t-[#B3363B] border border-[#262A33] rounded-[4px] space-y-3 shadow-md">
                          <div className="flex items-center justify-between border-b border-[#262A33] pb-2">
                            <div className="flex items-center gap-2">
                              <Crosshair className="w-4 h-4 text-[#B3363B]" />
                              <span className="d text-xl font-bold uppercase tracking-wider text-[#B3363B]">
                                SYNDICATE HIT ORDER
                              </span>
                            </div>
                            <span className="t text-[10px] px-2 py-0.5 bg-[#B3363B]/10 text-[#B3363B] border border-[#B3363B]/30 rounded">
                              EXHIBIT A
                            </span>
                          </div>

                          {target ? (
                            <div className="flex items-center justify-between gap-3 pt-1">
                              <div className="flex items-center gap-3">
                                <Avatar avatarId={target.avatar} size={42} />
                                <div>
                                  <div className="font-sans font-bold text-sm text-[#ECE6D8]">
                                    {target.name}
                                  </div>
                                  <div className="t text-xs text-[#A39D90]">
                                    Selected for midnight assassination
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 rotate-3">
                                {wasSaved ? (
                                  <span className="t text-[11px] font-bold px-2 py-1 rounded bg-[#5E8C7B]/20 text-emerald-300 border border-[#5E8C7B] uppercase">
                                    AMBUSH THWARTED
                                  </span>
                                ) : (
                                  <span className="t text-[11px] font-bold px-2 py-1 rounded bg-[#B3363B]/20 text-[#B3363B] border border-[#B3363B] uppercase">
                                    HIT EXECUTED
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="t text-xs text-[#D9A441] italic py-2">
                              {isDiscord
                                ? 'Syndicate discord: Operatives failed to agree on a unanimous contract.'
                                : 'No contract issued tonight.'}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* 2. Doctor Medical Shield */}
                    {(() => {
                      const saveIds = activeStage.secretEntry?.doctorSaves || [];
                      const isSaved =
                        activeStage.secretEntry?.mafiaTarget &&
                        saveIds.includes(activeStage.secretEntry.mafiaTarget);

                      return (
                        <div className="p-4 bg-[#171A20] border-t-4 border-t-[#5E8C7B] border border-[#262A33] rounded-[4px] space-y-3 shadow-md">
                          <div className="flex items-center justify-between border-b border-[#262A33] pb-2">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-[#5E8C7B]" />
                              <span className="d text-xl font-bold uppercase tracking-wider text-[#5E8C7B]">
                                MEDICAL SHIELD DOCKET
                              </span>
                            </div>
                            <span className="t text-[10px] px-2 py-0.5 bg-[#5E8C7B]/10 text-[#5E8C7B] border border-[#5E8C7B]/30 rounded">
                              EXHIBIT B
                            </span>
                          </div>

                          {saveIds.length > 0 ? (
                            <div className="space-y-2 pt-1">
                              {saveIds.map((id) => {
                                const p = getPlayer(id);
                                return (
                                  <div
                                    key={id}
                                    className="flex items-center justify-between gap-3"
                                  >
                                    <div className="flex items-center gap-3">
                                      {p && <Avatar avatarId={p.avatar} size={42} />}
                                      <div>
                                        <div className="font-sans font-bold text-sm text-[#ECE6D8]">
                                          {p?.name || id}
                                        </div>
                                        <div className="t text-xs text-[#5E8C7B]">
                                          House call protection dispatched
                                        </div>
                                      </div>
                                    </div>

                                    {isSaved && (
                                      <div className="shrink-0 -rotate-3">
                                        <span className="t text-[11px] font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500 uppercase">
                                          LIFE SAVED!
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="t text-xs text-[#A39D90] italic py-2">
                              No doctor emergency intervention dispatched tonight.
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* 3. Detective Surveillance Inquests */}
                    {(() => {
                      const investigations =
                        activeStage.secretEntry?.policeInvestigations || [];

                      return (
                        <div className="p-4 bg-[#171A20] border-t-4 border-t-[#5B7A99] border border-[#262A33] rounded-[4px] space-y-3 shadow-md">
                          <div className="flex items-center justify-between border-b border-[#262A33] pb-2">
                            <div className="flex items-center gap-2">
                              <Search className="w-4 h-4 text-[#5B7A99]" />
                              <span className="d text-xl font-bold uppercase tracking-wider text-[#5B7A99]">
                                DETECTIVE INQUEST DOCKET
                              </span>
                            </div>
                            <span className="t text-[10px] px-2 py-0.5 bg-[#5B7A99]/10 text-[#5B7A99] border border-[#5B7A99]/30 rounded">
                              EXHIBIT C
                            </span>
                          </div>

                          {investigations.length > 0 ? (
                            <div className="space-y-2 pt-1">
                              {investigations.map((inv, iIdx) => {
                                const target = getPlayer(inv.targetId);
                                const isGuilty =
                                  inv.result.toLowerCase().includes('mafia') ||
                                  inv.result.toLowerCase().includes('guilty');

                                return (
                                  <div
                                    key={iIdx}
                                    className="p-2.5 bg-[#101216] border border-[#262A33] rounded flex items-center justify-between gap-3"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      {target && <Avatar avatarId={target.avatar} size={32} />}
                                      <div>
                                        <div className="font-sans font-bold text-xs text-[#ECE6D8]">
                                          {target?.name}
                                        </div>
                                        <div className="t text-[10px] text-[#A39D90]">
                                          Undercover Background Search
                                        </div>
                                      </div>
                                    </div>

                                    <span
                                      className={`t text-[10px] font-bold px-2 py-1 rounded border uppercase ${
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
                            <div className="t text-xs text-[#A39D90] italic py-2">
                              No undercover surveillance logged tonight.
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* 4. Vigilante Marksman Action */}
                    {(() => {
                      const vigShots = activeStage.secretEntry?.vigilanteShots || [];

                      return (
                        <div className="p-4 bg-[#171A20] border-t-4 border-t-[#D9A441] border border-[#262A33] rounded-[4px] space-y-3 shadow-md">
                          <div className="flex items-center justify-between border-b border-[#262A33] pb-2">
                            <div className="flex items-center gap-2">
                              <Crosshair className="w-4 h-4 text-[#D9A441]" />
                              <span className="d text-xl font-bold uppercase tracking-wider text-[#D9A441]">
                                VIGILANTE BALLISTICS
                              </span>
                            </div>
                            <span className="t text-[10px] px-2 py-0.5 bg-[#D9A441]/10 text-[#D9A441] border border-[#D9A441]/30 rounded">
                              EXHIBIT D
                            </span>
                          </div>

                          {vigShots.length > 0 ? (
                            <div className="space-y-2 pt-1">
                              {vigShots.map((vig, vIdx) => {
                                const target = getPlayer(vig.targetId);
                                return (
                                  <div
                                    key={vIdx}
                                    className="p-2.5 bg-[#101216] border border-[#262A33] rounded flex items-center justify-between text-xs"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      {target && <Avatar avatarId={target.avatar} size={32} />}
                                      <div>
                                        <div className="font-sans font-bold text-[#ECE6D8]">
                                          {target?.name}
                                        </div>
                                        <div className="t text-[10px] text-[#D9A441]">
                                          Direct Marksman Fire
                                        </div>
                                      </div>
                                    </div>
                                    <span className="t text-[10px] font-bold px-2 py-1 bg-[#D9A441]/15 text-[#D9A441] border border-[#D9A441] rounded uppercase">
                                      ROUND FIRED
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="t text-xs text-[#A39D90] italic py-2">
                              Marksman held fire during the midnight hour.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* ---------------- STAGE: DAY TRIBUNAL (VOTING & VERDICT) ---------------- */}
              {activeStage.phase === 'day' && (
                <div className="space-y-4">
                  {/* Day Elimination Evidence Header */}
                  {activeStage.secretEntry?.eliminatedByVote ? (
                    (() => {
                      const victim = getPlayer(activeStage.secretEntry.eliminatedByVote);
                      return (
                        <div
                          className="p-4 rounded-[6px] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          style={{
                            background: '#ECE6D8',
                            color: '#15130f',
                            borderLeft: '6px solid #B3363B',
                          }}
                        >
                          <div className="flex items-center gap-3.5">
                            {victim && <Avatar avatarId={victim.avatar} size={50} />}
                            <div>
                              <div className="t text-[11px] font-bold text-[#7E2327] uppercase tracking-wider">
                                TRIBUNAL EXECUTION WARRANT · ROUND {activeStage.round}
                              </div>
                              <div className="d text-3xl sm:text-4xl font-black uppercase text-[#15130f] leading-tight">
                                {victim?.name}
                              </div>
                              {activeStage.secretEntry.dayEliminatedRole && (
                                <div className="t text-xs text-[#4D4637] mt-0.5">
                                  TRUE ALLEGIANCE:{' '}
                                  <span className="font-bold uppercase text-[#7E2327]">
                                    {activeStage.secretEntry.dayEliminatedRole}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="rotate-3 shrink-0 self-start sm:self-auto">
                            <RubberStamp variant="eliminated" size="sm" text="HANGED BY TOWN" />
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="p-3.5 bg-[#171A20] border border-[#5E8C7B]/50 rounded-[4px] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[#5E8C7B]" />
                        <div className="t text-xs text-[#ECE6D8]">
                          <strong>NO EXECUTION TODAY:</strong> The town tribunal deadlocked or
                          voted to skip capital punishment.
                        </div>
                      </div>
                      <span className="t text-[10px] font-bold px-2 py-0.5 bg-[#5E8C7B]/20 text-[#5E8C7B] border border-[#5E8C7B] rounded uppercase">
                        ACQUITTAL
                      </span>
                    </div>
                  )}

                  {/* Who Voted for Whom Ballot Ledger */}
                  {activeStage.secretEntry?.dayVotes &&
                  Object.keys(activeStage.secretEntry.dayVotes).length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-[#262A33] pb-1.5">
                        <span className="t text-xs font-bold text-[#D9A441] uppercase tracking-wider">
                          OFFICIAL BALLOT REGISTER
                        </span>
                        <span className="t text-[10px] text-[#A39D90]">
                          Individual Recorded Votes
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {Object.entries(activeStage.secretEntry.dayVotes).map(
                          ([voterId, targetId]) => {
                            const voter = getPlayer(voterId);
                            const target = targetId === 'skip' ? null : getPlayer(targetId);

                            return (
                              <div
                                key={voterId}
                                className="p-2.5 bg-[#171A20] border border-[#262A33] rounded-[4px] flex items-center justify-between text-xs"
                              >
                                <span className="font-sans font-bold text-[#ECE6D8] truncate max-w-[100px]">
                                  {voter?.name || voterId}
                                </span>
                                <span className="text-[#A39D90] px-1 font-mono">➔</span>
                                <span
                                  className={`t font-bold px-2 py-0.5 rounded text-[11px] truncate uppercase ${
                                    targetId === 'skip'
                                      ? 'bg-[#101216] text-[#A39D90] border border-[#262A33]'
                                      : 'bg-[#B3363B]/15 text-[#ECE6D8] border border-[#B3363B]/40'
                                  }`}
                                >
                                  {target ? target.name : 'SKIP VOTE'}
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="t text-xs text-[#A39D90] italic py-3 text-center border border-dashed border-[#262A33] rounded">
                      Ballot records for this day are retained in the courtroom archive.
                    </div>
                  )}
                </div>
              )}

              {/* ---------------- STAGE: CONCLUSION (VERDICT) ---------------- */}
              {activeStage.phase === 'end' && (
                <div className="space-y-5 text-center py-8">
                  <div className="w-16 h-16 rounded-full border-2 border-[#D9A441] bg-[#16222F]/40 flex items-center justify-center text-[#D9A441] mx-auto shadow-[0_0_30px_rgba(217,164,65,0.3)]">
                    <Award className="w-8 h-8" />
                  </div>

                  <div>
                    <h4
                      className="d text-5xl sm:text-6xl font-black uppercase tracking-wider leading-none"
                      style={{
                        color:
                          winner === 'mafia'
                            ? '#C2373D'
                            : winner === 'town'
                            ? '#5E8C7B'
                            : '#8C6FA0',
                      }}
                    >
                      {winner ? `${winner.toUpperCase()} VICTORIOUS` : 'CASE CONCLUDED'}
                    </h4>
                    <p className="t text-sm sm:text-base text-[#D9A441] mt-2 max-w-lg mx-auto">
                      {winner === 'town'
                        ? 'All syndicate operatives eliminated. Peace restored to the city streets.'
                        : winner === 'mafia'
                        ? 'The underworld syndicate gained undisputed control over the metropolis.'
                        : 'The eccentric jester tricked the town tribunal into an untimely execution!'}
                    </p>
                  </div>

                  <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[6px] max-w-md mx-auto flex items-center justify-around text-center">
                    <div>
                      <div className="t text-[10px] text-[#A39D90] uppercase">Total Rounds</div>
                      <div className="d text-2xl font-bold text-[#ECE6D8]">{gameView.round}</div>
                    </div>
                    <div className="w-px h-8 bg-[#262A33]" />
                    <div>
                      <div className="t text-[10px] text-[#A39D90] uppercase">Survivors</div>
                      <div className="d text-2xl font-bold text-[#5E8C7B]">
                        {players.filter((p) => p.alive).length}
                      </div>
                    </div>
                    <div className="w-px h-8 bg-[#262A33]" />
                    <div>
                      <div className="t text-[10px] text-[#A39D90] uppercase">Casualties</div>
                      <div className="d text-2xl font-bold text-[#B3363B]">
                        {players.filter((p) => !p.alive).length}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
