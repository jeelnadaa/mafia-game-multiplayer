'use client';

import React, { useState, useMemo } from 'react';
import { Shield, Play, Pause, FastForward, Clock, Check, AlertTriangle, Users, Lock, X } from 'lucide-react';
import { ClientGameView, Role, PlayerView } from '@/lib/types';
import { ROLES, RoleDef } from '@/lib/content';
import { Button, Avatar, Modal } from './ui';
import { useShortcut } from '@/lib/shortcuts';

interface GodProps {
  gameView: ClientGameView;
  onGodAction: (action: 'next' | 'pause' | 'extend' | 'skip') => void;
  onAssignRoles?: (assignments: Record<string, Role>) => void;
}

export function God({ gameView, onGodAction, onAssignRoles }: GodProps) {
  const { phase, round, players, paused, settings } = gameView;
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Calculate non-god playing operatives
  const playablePlayers = useMemo(() => {
    return players.filter((p) => !p.isGod);
  }, [players]);

  // Exact target role counts configured in settings before match start
  const targetDeck = useMemo(() => {
    const mafiaCount = settings.roles.mafia.count || 1;
    const godfatherCount = settings.roles.godfather?.enabled ? (settings.roles.godfather.count || 1) : 0;
    const doctorCount = settings.roles.doctor.enabled ? (settings.roles.doctor.count || 1) : 0;
    const policeCount = settings.roles.police.enabled ? (settings.roles.police.count || 1) : 0;
    const vigilanteCount = settings.roles.vigilante?.enabled ? (settings.roles.vigilante.count || 1) : 0;
    const jesterCount = settings.roles.jester?.enabled ? (settings.roles.jester.count || 1) : 0;
    const specialTotal = mafiaCount + godfatherCount + doctorCount + policeCount + vigilanteCount + jesterCount;
    const civilianCount = Math.max(0, playablePlayers.length - specialTotal);

    return {
      mafia: mafiaCount,
      godfather: godfatherCount,
      doctor: doctorCount,
      police: policeCount,
      vigilante: vigilanteCount,
      jester: jesterCount,
      civilian: civilianCount,
      specialTotal,
      totalPlayers: playablePlayers.length,
    };
  }, [settings.roles, playablePlayers.length]);

  // Available roles for narrator assignment (only roles with count > 0 in configured settings, plus civilian)
  const allowedRoles = useMemo<Role[]>(() => {
    const list: Role[] = [];
    if (targetDeck.mafia > 0) list.push('mafia');
    if (targetDeck.godfather > 0) list.push('godfather');
    if (targetDeck.doctor > 0) list.push('doctor');
    if (targetDeck.police > 0) list.push('police');
    if (targetDeck.vigilante > 0) list.push('vigilante');
    if (targetDeck.jester > 0) list.push('jester');
    list.push('civilian');
    return list;
  }, [targetDeck]);

  // Local draft of role assignments by player ID
  const [assignments, setAssignments] = useState<Record<string, Role>>(() => {
    const initial: Record<string, Role> = {};
    playablePlayers.forEach((p) => {
      initial[p.id] = p.role || 'civilian';
    });
    return initial;
  });

  // Current assigned counts
  const currentAssignedCounts = useMemo(() => {
    const counts: Record<Role, number> = {
      mafia: 0,
      godfather: 0,
      doctor: 0,
      police: 0,
      vigilante: 0,
      jester: 0,
      civilian: 0,
    };
    playablePlayers.forEach((p) => {
      const assigned = assignments[p.id];
      if (assigned && counts[assigned] !== undefined) {
        counts[assigned]++;
      }
    });
    return counts;
  }, [assignments, playablePlayers]);

  const handleRoleSelect = (playerId: string, role: Role) => {
    setAssignments((prev) => ({
      ...prev,
      [playerId]: role,
    }));
  };

  const handleValidateAndLaunch = () => {
    const errors: string[] = [];

    // 1. Check all playable players have an assigned role
    const unassigned = playablePlayers.filter((p) => !assignments[p.id]);
    if (unassigned.length > 0) {
      errors.push(`Unassigned operatives: ${unassigned.map((p) => p.name).join(', ')}. Every operative must receive a dossier.`);
    }

    // 2. Exact role count checks
    if (currentAssignedCounts.mafia !== targetDeck.mafia) {
      errors.push(
        `Mafia count mismatch: Configured for exactly ${targetDeck.mafia} Mafia, but ${currentAssignedCounts.mafia} assigned.`
      );
    }
    if (targetDeck.godfather > 0 && currentAssignedCounts.godfather !== targetDeck.godfather) {
      errors.push(
        `Godfather mismatch: Configured for exactly ${targetDeck.godfather} Godfather, but ${currentAssignedCounts.godfather} assigned.`
      );
    }
    if (targetDeck.doctor > 0 && currentAssignedCounts.doctor !== targetDeck.doctor) {
      errors.push(
        `Doctor mismatch: Configured for exactly ${targetDeck.doctor} Doctor, but ${currentAssignedCounts.doctor} assigned.`
      );
    }
    if (targetDeck.police > 0 && currentAssignedCounts.police !== targetDeck.police) {
      errors.push(
        `Police mismatch: Configured for exactly ${targetDeck.police} Police, but ${currentAssignedCounts.police} assigned.`
      );
    }
    if (targetDeck.vigilante > 0 && currentAssignedCounts.vigilante !== targetDeck.vigilante) {
      errors.push(
        `Vigilante mismatch: Configured for exactly ${targetDeck.vigilante} Vigilante, but ${currentAssignedCounts.vigilante} assigned.`
      );
    }
    if (targetDeck.jester > 0 && currentAssignedCounts.jester !== targetDeck.jester) {
      errors.push(
        `Jester mismatch: Configured for exactly ${targetDeck.jester} Jester, but ${currentAssignedCounts.jester} assigned.`
      );
    }
    if (currentAssignedCounts.civilian !== targetDeck.civilian) {
      errors.push(
        `Civilian count mismatch: Configured for exactly ${targetDeck.civilian} Civilians, but ${currentAssignedCounts.civilian} assigned.`
      );
    }

    // 3. Syndicate parity rule: Total syndicate cannot equal or exceed town
    const syndicateTotal = currentAssignedCounts.mafia + currentAssignedCounts.godfather;
    const townTotal = playablePlayers.length - syndicateTotal;
    if (syndicateTotal >= townTotal) {
      errors.push(
        `Invalid balance: Total syndicate members (${syndicateTotal}) cannot equal or exceed remaining townspeople (${townTotal}). Syndicate must be a strict minority at start.`
      );
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setValidationModalOpen(true);
      return;
    }

    onAssignRoles?.(assignments);
  };

  // Shortcuts: Shift+N, Shift+E, Shift+P, Shift+X
  useShortcut('Shift+N', () => setAdvanceModalOpen(true), { scope: 'screen' });
  useShortcut('Shift+E', () => setAdvanceModalOpen(true), { scope: 'screen' });
  useShortcut('Shift+P', () => onGodAction('pause'), { scope: 'screen' });
  useShortcut('Shift+X', () => onGodAction('extend'), { scope: 'screen' });

  const handleConfirmAdvance = () => {
    setAdvanceModalOpen(false);
    onGodAction('next');
  };

  // =========================================================================
  // VIEW A: NARRATOR ROLE ASSIGNMENT SCREEN (phase === 'narratorAssign')
  // =========================================================================
  if (phase === 'narratorAssign') {
    return (
      <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 select-none font-['Instrument_Sans'] text-[#ECE6D8]">
        {/* Header Banner */}
        <div className="relative overflow-hidden bg-[#101216] border border-[#262A33] p-5 sm:p-7 rounded-[8px] flex flex-col md:flex-row items-center justify-between gap-5 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[6px] border border-[#D9A441]/50 bg-[#171A20] flex items-center justify-center text-[#D9A441] shadow-inner shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="t text-[11px] tracking-[3px] text-[#D9A441] uppercase font-bold px-2.5 py-0.5 bg-[#0A0B0E] border border-[#262A33] rounded-[2px] inline-block mb-1">
                CLASSIFIED DOSSIER ALLOCATION · NARRATOR CONSOLE
              </span>
              <h1 className="d text-2xl sm:text-4xl font-black text-[#ECE6D8] tracking-[2px] uppercase leading-tight m-0">
                Assign Operative Roles
              </h1>
              <p className="text-xs sm:text-sm text-[#A39D90] mt-1 leading-relaxed">
                Manually distribute dossiers to all seated operatives according to the match configuration. No timer is active.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleValidateAndLaunch}
            className="w-full md:w-auto h-[50px] px-8 bg-[#D9A441] hover:bg-[#FFEA00] text-[#0A0B0E] font-bold text-sm tracking-wider uppercase rounded-[4px] shadow-[0_0_25px_rgba(217,164,65,0.4)] hover:shadow-[0_0_35px_rgba(255,234,0,0.8)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 text-[#0A0B0E]" />
            <span>Confirm & Launch Briefing</span>
          </button>
        </div>

        {/* Configured Role Deck Target Requirements */}
        <div className="bg-[#101216] border border-[#262A33] rounded-[8px] p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#262A33] pb-2">
            <span className="t text-xs uppercase tracking-[2px] text-[#A39D90] font-bold">
              Configured Match Deck Requirements
            </span>
            <span className="text-xs font-mono text-[#D9A441]">
              {playablePlayers.length} Operatives Seated
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
            {/* Mafia */}
            <div className={`p-3 rounded-[4px] border ${currentAssignedCounts.mafia === targetDeck.mafia ? 'bg-[#171A20] border-[#B3363B]/60 text-red-300' : 'bg-[#171A20]/40 border-[#262A33] text-[#A39D90]'}`}>
              <div className="font-bold uppercase tracking-wider text-xs">Mafia</div>
              <div className="font-mono text-lg font-bold text-[#ECE6D8] mt-1">
                {currentAssignedCounts.mafia} / {targetDeck.mafia}
              </div>
            </div>

            {/* Godfather */}
            {targetDeck.godfather > 0 && (
              <div className={`p-3 rounded-[4px] border ${currentAssignedCounts.godfather === targetDeck.godfather ? 'bg-[#171A20] border-[#B3363B]/60 text-red-300' : 'bg-[#171A20]/40 border-[#262A33] text-[#A39D90]'}`}>
                <div className="font-bold uppercase tracking-wider text-xs">Godfather</div>
                <div className="font-mono text-lg font-bold text-[#ECE6D8] mt-1">
                  {currentAssignedCounts.godfather} / {targetDeck.godfather}
                </div>
              </div>
            )}

            {/* Doctor */}
            {targetDeck.doctor > 0 && (
              <div className={`p-3 rounded-[4px] border ${currentAssignedCounts.doctor === targetDeck.doctor ? 'bg-[#171A20] border-[#5E8C7B]/60 text-emerald-300' : 'bg-[#171A20]/40 border-[#262A33] text-[#A39D90]'}`}>
                <div className="font-bold uppercase tracking-wider text-xs">Doctor</div>
                <div className="font-mono text-lg font-bold text-[#ECE6D8] mt-1">
                  {currentAssignedCounts.doctor} / {targetDeck.doctor}
                </div>
              </div>
            )}

            {/* Police */}
            {targetDeck.police > 0 && (
              <div className={`p-3 rounded-[4px] border ${currentAssignedCounts.police === targetDeck.police ? 'bg-[#171A20] border-[#5B7A99]/60 text-blue-300' : 'bg-[#171A20]/40 border-[#262A33] text-[#A39D90]'}`}>
                <div className="font-bold uppercase tracking-wider text-xs">Police</div>
                <div className="font-mono text-lg font-bold text-[#ECE6D8] mt-1">
                  {currentAssignedCounts.police} / {targetDeck.police}
                </div>
              </div>
            )}

            {/* Vigilante */}
            {targetDeck.vigilante > 0 && (
              <div className={`p-3 rounded-[4px] border ${currentAssignedCounts.vigilante === targetDeck.vigilante ? 'bg-[#171A20] border-[#D9A441]/60 text-amber-300' : 'bg-[#171A20]/40 border-[#262A33] text-[#A39D90]'}`}>
                <div className="font-bold uppercase tracking-wider text-xs">Vigilante</div>
                <div className="font-mono text-lg font-bold text-[#ECE6D8] mt-1">
                  {currentAssignedCounts.vigilante} / {targetDeck.vigilante}
                </div>
              </div>
            )}

            {/* Jester */}
            {targetDeck.jester > 0 && (
              <div className={`p-3 rounded-[4px] border ${currentAssignedCounts.jester === targetDeck.jester ? 'bg-[#171A20] border-[#8C6FA0]/60 text-purple-300' : 'bg-[#171A20]/40 border-[#262A33] text-[#A39D90]'}`}>
                <div className="font-bold uppercase tracking-wider text-xs">Jester</div>
                <div className="font-mono text-lg font-bold text-[#ECE6D8] mt-1">
                  {currentAssignedCounts.jester} / {targetDeck.jester}
                </div>
              </div>
            )}

            {/* Civilians */}
            <div className={`p-3 rounded-[4px] border ${currentAssignedCounts.civilian === targetDeck.civilian ? 'bg-[#171A20] border-[#262A33] text-[#ECE6D8]' : 'bg-[#171A20]/40 border-[#262A33] text-[#A39D90]'}`}>
              <div className="font-bold uppercase tracking-wider text-xs">Civilian</div>
              <div className="font-mono text-lg font-bold text-[#ECE6D8] mt-1">
                {currentAssignedCounts.civilian} / {targetDeck.civilian}
              </div>
            </div>
          </div>
        </div>

        {/* Operative Allocation Matrix */}
        <div className="bg-[#101216] border border-[#262A33] rounded-[8px] p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#262A33] pb-3">
            <span className="t text-xs uppercase tracking-[2px] text-[#A39D90] font-bold">
              Seated Operatives & Dossier Assignment
            </span>
            <span className="text-xs text-[#A39D90]">
              Click a role pill to allocate dossier to operative
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {playablePlayers.map((player) => {
              const currentRole = assignments[player.id] || 'civilian';
              const rDef = ROLES[currentRole] || ROLES.civilian;
              return (
                <div
                  key={player.id}
                  className="p-4 bg-[#171A20] border border-[#262A33] rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar avatarId={player.avatar} size={42} className="border border-[#262A33] rounded-full shrink-0" />
                    <div className="truncate">
                      <div className="text-sm font-bold text-[#ECE6D8] truncate">{player.name}</div>
                      <div className="text-[11px] font-mono text-[#D9A441] mt-0.5">
                        Assigned: {rDef.name.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Role Selection Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {allowedRoles.map((roleKey) => {
                      const isSelected = currentRole === roleKey;
                      const roleName = ROLES[roleKey]?.name || roleKey;
                      return (
                        <button
                          key={roleKey}
                          type="button"
                          onClick={() => handleRoleSelect(player.id, roleKey)}
                          className={`px-2.5 py-1 text-xs font-mono rounded-[3px] border transition-all cursor-pointer ${
                            isSelected
                              ? roleKey === 'mafia' || roleKey === 'godfather'
                                ? 'bg-[#B3363B] text-white border-[#B3363B] font-bold shadow-md'
                                : roleKey === 'doctor'
                                ? 'bg-[#5E8C7B] text-[#0A0B0E] border-[#5E8C7B] font-bold shadow-md'
                                : roleKey === 'police'
                                ? 'bg-[#5B7A99] text-white border-[#5B7A99] font-bold shadow-md'
                                : roleKey === 'vigilante'
                                ? 'bg-[#D9A441] text-[#0A0B0E] border-[#D9A441] font-bold shadow-md'
                                : roleKey === 'jester'
                                ? 'bg-[#8C6FA0] text-white border-[#8C6FA0] font-bold shadow-md'
                                : 'bg-[#D9A441] text-[#0A0B0E] border-[#D9A441] font-bold shadow-md'
                              : 'bg-[#101216] text-[#A39D90] border-[#262A33] hover:border-bone-dim hover:text-[#ECE6D8]'
                          }`}
                        >
                          {roleName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Validation Error Custom Modal */}
        <Modal
          isOpen={validationModalOpen}
          onClose={() => setValidationModalOpen(false)}
          title="INVALID DOSSIER ALLOCATION"
          subtitle="DECK CONFLICTS MUST BE RESOLVED"
        >
          <div className="space-y-4 text-[#ECE6D8] font-['Instrument_Sans']">
            <div className="p-4 bg-[#171A20] border border-[#B3363B]/60 rounded-[4px] space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#B3363B]">
                <AlertTriangle className="w-5 h-5 text-[#B3363B] shrink-0" />
                <span>The following deck rules were violated:</span>
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-[#ECE6D8] leading-relaxed">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-[#A39D90]">
              The match cannot launch until your role allocations match the configured deck counts exactly and syndicate members are a strict minority.
            </p>

            <div className="flex justify-end pt-2 border-t border-[#262A33]">
              <Button variant="primary" onClick={() => setValidationModalOpen(false)}>
                Dismiss & Rectify
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: ACTIVE NARRATOR CONTROL ROOM (In-Game Surveillance & Authority)
  // =========================================================================
  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 select-none font-['Instrument_Sans'] text-[#ECE6D8]">
      {/* Control Room Header Banner */}
      <div className="relative overflow-hidden bg-[#101216] border border-[#262A33] p-5 sm:p-7 rounded-[8px] flex flex-col md:flex-row items-center justify-between gap-5 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[6px] border border-[#D9A441]/50 bg-[#171A20] flex items-center justify-center text-[#D9A441] shadow-inner shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="t text-[11px] tracking-[3px] text-[#D9A441] uppercase font-bold px-2.5 py-0.5 bg-[#0A0B0E] border border-[#262A33] rounded-[2px] inline-block">
                CASE #{gameView.code} · OMNISCIENT OVERSEER
              </span>
            </div>
            <h2 className="d text-2xl sm:text-3xl font-extrabold uppercase text-[#ECE6D8] tracking-[2px] mt-1 m-0">
              Narrator Control Room
            </h2>
            <p className="text-xs sm:text-sm text-[#A39D90] mt-0.5 font-mono">
              Phase: <strong className="text-[#D9A441] uppercase">{phase}</strong> · Round {round} · {paused ? 'PAUSED' : 'ACTIVE'}
            </p>
          </div>
        </div>

        {/* Phase Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => onGodAction('pause')}
            className="h-11 px-4 bg-[#171A20] hover:bg-[#262A33] border border-[#262A33] rounded-[4px] text-xs font-bold uppercase tracking-wider text-[#ECE6D8] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{paused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            type="button"
            onClick={() => onGodAction('extend')}
            className="h-11 px-4 bg-[#171A20] hover:bg-[#262A33] border border-[#262A33] rounded-[4px] text-xs font-bold uppercase tracking-wider text-[#ECE6D8] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-[#D9A441]" />
            <span>+30 Seconds</span>
          </button>

          <button
            type="button"
            onClick={() => setAdvanceModalOpen(true)}
            className="h-11 px-5 bg-[#D9A441] hover:bg-[#FFEA00] text-[#0A0B0E] font-bold text-xs uppercase tracking-wider rounded-[4px] shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Advance Phase</span>
          </button>
        </div>
      </div>

      {/* Omniscient Player Status Matrix */}
      <div className="bg-[#101216] border border-[#262A33] rounded-[8px] p-5 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#262A33]">
          <h3 className="d text-xl font-bold text-[#ECE6D8] uppercase tracking-[2px] m-0">
            Surveillance Matrix · True Roles & Status
          </h3>
          <span className="text-xs font-mono text-[#A39D90]">
            {playablePlayers.length} Seated Subjects
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {playablePlayers.map((p) => {
            const rDef = p.role ? ROLES[p.role] : null;
            return (
              <div
                key={p.id}
                className={`p-3.5 rounded-[6px] border flex items-center justify-between transition-colors ${
                  p.alive ? 'bg-[#171A20] border-[#262A33]' : 'bg-[#171A20]/30 border-[#262A33]/40 opacity-40'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Avatar avatarId={p.avatar} size={38} className="border border-[#262A33] rounded-full shrink-0" />
                  <div className="truncate">
                    <div className="text-sm font-bold text-[#ECE6D8] truncate">{p.name}</div>
                    <div className="text-[10px] font-mono text-[#A39D90] mt-0.5">
                      {p.alive ? 'Alive' : 'Deceased'}
                    </div>
                  </div>
                </div>

                {rDef && (
                  <span
                    className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-[3px] border shrink-0 ${
                      rDef.team === 'mafia'
                        ? 'border-[#B3363B]/60 bg-[#B3363B]/10 text-red-300'
                        : rDef.id === 'doctor'
                        ? 'border-[#5E8C7B]/60 bg-[#5E8C7B]/10 text-emerald-300'
                        : rDef.id === 'police'
                        ? 'border-[#5B7A99]/60 bg-[#5B7A99]/10 text-blue-300'
                        : 'border-[#262A33] bg-[#0A0B0E] text-[#D9A441]'
                    }`}
                  >
                    {rDef.name.toUpperCase()}
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
        title="ADVANCE PHASE"
        subtitle="HOST & NARRATOR DISCRETION"
      >
        <div className="space-y-4 text-[#ECE6D8] font-['Instrument_Sans']">
          <p className="text-xs sm:text-sm text-[#ECE6D8] leading-relaxed">
            Are you sure you want to advance to the next phase immediately? Any remaining countdown timer will be bypassed.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#262A33]">
            <Button variant="secondary" onClick={() => setAdvanceModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmAdvance}>
              Advance Phase
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
