'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Shield,
  Crosshair,
  Send,
  MessageSquare,
  Skull,
  Crown,
  Check,
  AlertCircle,
  Ban,
  Clock,
  Ghost,
  Radio,
  Flame,
  Sun,
  Gavel,
  Search,
  Trophy,
  X,
  Volume2,
  FileText,
} from 'lucide-react';
import { ClientGameView, PlayerView, ChatChannel, QuickReaction } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { Avatar, Button, Modal, CenterTimer, Kbd, RubberStamp } from './ui';
import { useShortcut } from '@/lib/shortcuts';
import { getSeatPositions } from '@/lib/layout';
import { voiceEngine, getVoiceGlowStyle } from '@/lib/voice';

export const REACTION_GLYPHS: Record<QuickReaction, string> = {
  suspicious: '⚠️ Suspect',
  agree: '✓ Agree',
  nope: '✗ Nope',
  same: '= Same',
  trust: '★ Trust',
  question: '? Inquiry',
};

interface CircleSittingArenaProps {
  gameView: ClientGameView;
  onNightAction: (targetId: string, confirm?: boolean) => void;
  onConfirmNightAction: (targetId: string) => void;
  onVote: (targetId: string) => void;
  onReadyToVote: () => void;
  onSendChat: (channel: ChatChannel, text: string) => void;
  onOpenHelp: (tab?: any) => void;
  onBack?: () => void;
  onSetSuspicion?: (targetId: string) => void;
  onClearSuspicion?: () => void;
  onSendReaction?: (reaction: QuickReaction) => void;
  onGodAction?: (action: 'next' | 'pause' | 'extend' | 'skip') => void;
}

export function CircleSittingArena({
  gameView,
  onNightAction,
  onConfirmNightAction,
  onVote,
  onReadyToVote,
  onSendChat,
  onOpenHelp,
  onBack,
  onSetSuspicion,
  onClearSuspicion,
  onSendReaction,
  onGodAction,
}: CircleSittingArenaProps) {
  const { phase, round, me, voteCounts, nightSubPhase } = gameView;
  const players = gameView.players || [];
  const readyToVoteList = gameView.readyToVote || [];
  const logList = gameView.log || [];
  const chatList = gameView.chat || [];

  const [speakingPeers, setSpeakingPeers] = useState<Record<string, boolean>>({});
  const [speakingLevels, setSpeakingLevels] = useState<Record<string, number>>({});
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [dossierDrawerOpen, setDossierDrawerOpen] = useState(false);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    return voiceEngine.subscribe((map, levels) => {
      setSpeakingPeers(map);
      if (levels) setSpeakingLevels(levels);
    });
  }, []);

  // Synchronized countdown timer ticker
  useEffect(() => {
    if (!gameView.phaseEndsAt) {
      setSecondsRemaining(null);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.ceil((gameView.phaseEndsAt! - Date.now()) / 1000));
      setSecondsRemaining(diff);
    };
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [gameView.phaseEndsAt]);

  const myIndex = Math.max(0, players.findIndex((p) => p.id === me?.id));
  const seatPositions = useMemo(() => {
    return getSeatPositions(players.length, 100, 100, myIndex, 12);
  }, [players.length, myIndex]);

  const role = me?.role;
  const roleDef = role ? ROLES[role] : null;
  const isDead = !me?.alive;
  const isGod = Boolean(me?.isGod);
  const isObserverMafia = role === 'mafia' || role === 'godfather';

  // Strictly eliminate Town (public) chat. Only mafia and ghost chat exist!
  const [activeChannel, setActiveChannel] = useState<ChatChannel>(() => {
    if (isObserverMafia) return 'mafia';
    if (isDead) return 'dead';
    return 'mafia'; // fallback if host
  });

  const [chatInput, setChatInput] = useState('');
  const [pendingTarget, setPendingTarget] = useState<PlayerView | null>(null);
  const [pendingSpecialAction, setPendingSpecialAction] = useState<'skip' | 'hold' | null>(null);

  useEffect(() => {
    if (isObserverMafia) {
      setActiveChannel('mafia');
    } else if (isDead) {
      setActiveChannel('dead');
    }
  }, [isObserverMafia, isDead]);

  // Listen for external chat trigger from bottom dock
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.channel) {
        setActiveChannel(e.detail.channel);
      }
      setChatDrawerOpen(true);
    };
    window.addEventListener('mafia:open-chat', handler);
    return () => window.removeEventListener('mafia:open-chat', handler);
  }, []);

  // Teammate picks for Mafias
  const teammatePicks = me?.teammatePicks || {};
  const currentSelectionId = phase === 'voting' ? me?.vote : me?.nightPick;

  // Action eligibility
  const canActAtNight = Boolean(me?.canActNow);
  const canVoteAtDay = phase === 'voting' && Boolean(me?.alive) && !isGod;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(activeChannel, chatInput);
    setChatInput('');
  };

  const handleSeatClick = (player: PlayerView) => {
    if (!player.alive || player.isGod) return;

    if (phase === 'night' && canActAtNight) {
      if ((nightSubPhase === 'mafia' || nightSubPhase === 'vigilante' || nightSubPhase === 'police') && player.id === me?.id) return;
      if (nightSubPhase === 'doctor' && player.id === me?.id && me?.doctorSelfSavesRemaining === 0) return;
      if (nightSubPhase === 'doctor' && !gameView.settings.doctorSameTargetTwice && me?.doctorLastSavedId === player.id) return;

      // Prepare target and broadcast staged choice without confirming, so teammates (e.g. syndicate family) coordinate in real-time
      setPendingTarget(player);
      onNightAction(player.id, false);
    } else if (phase === 'voting' && canVoteAtDay) {
      if (player.id === me?.id) return;
      // Strictly gate vote through center table confirmation
      setPendingTarget(player);
    } else if (phase === 'discussion' && me?.alive && !isGod && player.id !== me?.id) {
      // Gate suspicion through center confirmation as well
      setPendingTarget(player);
    }
  };

  const handleConfirmAction = () => {
    if (pendingTarget) {
      if (phase === 'night') {
        onNightAction(pendingTarget.id, true);
        onConfirmNightAction(pendingTarget.id);
      } else if (phase === 'voting') {
        onVote(pendingTarget.id);
      } else if (phase === 'discussion') {
        if (gameView.suspicions?.[me?.id || ''] === pendingTarget.id) {
          onClearSuspicion?.();
        } else {
          onSetSuspicion?.(pendingTarget.id);
        }
      }
      setPendingTarget(null);
    } else if (pendingSpecialAction) {
      if (pendingSpecialAction === 'skip') {
        onVote('skip');
      } else if (pendingSpecialAction === 'hold') {
        onNightAction('hold', true);
        onConfirmNightAction('hold');
      }
      setPendingSpecialAction(null);
    }
  };

  // Keyboard shortcuts
  useShortcut(['v', 'V'], () => {
    if (phase === 'discussion' && me?.alive && !isGod) {
      onReadyToVote();
    }
  }, { scope: 'screen' });

  useShortcut(['s', 'S'], () => {
    if (phase === 'voting' && me?.alive && !isGod && gameView.settings.allowSkipVote) {
      setPendingSpecialAction('skip');
    }
  }, { scope: 'screen' });

  useShortcut(['x', 'X'], () => {
    if (phase === 'night' && role === 'vigilante' && canActAtNight) {
      setPendingSpecialAction('hold');
    }
  }, { scope: 'screen' });

  // Filter messages for active channel (mafia or dead only)
  const tabMessages = useMemo(() => {
    return chatList.filter((msg) => msg.channel === activeChannel);
  }, [chatList, activeChannel]);

  const livingPlayers = players.filter((p) => p.alive && !p.isGod);
  const deadPlayers = players.filter((p) => !p.alive && !p.isGod);

  // Position for targeted player and actor for vector line
  const mySeatPos = seatPositions[myIndex] || { leftPercent: 50, topPercent: 80 };
  const targetIndex = players.findIndex((p) => p.id === (pendingTarget?.id || currentSelectionId));
  const targetSeatPos = targetIndex >= 0 ? seatPositions[targetIndex] : null;

  // Accused player in voting (player with highest vote count)
  const highestVotedPlayer = useMemo(() => {
    if (phase !== 'voting' || !voteCounts) return null;
    let maxVotes = 0;
    let maxId: string | null = null;
    Object.entries(voteCounts).forEach(([pId, count]) => {
      if (count > maxVotes && pId !== 'skip') {
        maxVotes = count;
        maxId = pId;
      }
    });
    return maxId ? players.find((p) => p.id === maxId) : null;
  }, [phase, voteCounts, players]);

  const accusedIndex = highestVotedPlayer ? players.findIndex((p) => p.id === highestVotedPlayer.id) : targetIndex;
  const accusedSeatPos = accusedIndex >= 0 ? seatPositions[accusedIndex] : null;

  // Subtitle text from mockups
  const subtitleText = useMemo(() => {
    if (phase === 'night') {
      if (canActAtNight) {
        if (role === 'mafia' || role === 'godfather') return 'Choose who to eliminate tonight.';
        if (role === 'doctor') return 'Select an operative to shield from harm tonight.';
        if (role === 'police') return 'Select a suspect to investigate their allegiance.';
        if (role === 'vigilante') return 'Take justice into your own hands or hold fire.';
      }
      return 'The town goes to sleep.';
    }
    if (phase === 'voting') {
      const recentDeath = logList.find((l) => l.type === 'death');
      if (recentDeath) {
        return `${recentDeath.text.split(' ')[0]} was found dead. The town must decide.`;
      }
      return 'The town gathers to cast their elimination ballots.';
    }
    if (phase === 'discussion') {
      return 'Deliberate with fellow operatives. Accuse suspects or ready up.';
    }
    return 'Round table proceedings.';
  }, [phase, canActAtNight, role, logList]);

  const selectedTargetPlayer = players.find((p) => p.id === (pendingTarget?.id || currentSelectionId));
  const currentSelectionPlayer = players.find((p) => p.id === currentSelectionId);

  return (
    <div
      className="b relative w-full h-screen min-h-[680px] overflow-hidden select-none flex flex-col justify-between"
      style={{
        background:
          phase === 'night'
            ? 'radial-gradient(ellipse 70% 60% at 50% 45%, #18191E, #0A0B0E 78%)'
            : 'radial-gradient(ellipse 70% 60% at 50% 45%, #1D1A16, #0A0B0E 78%)',
        color: '#ECE6D8',
      }}
    >
      {/* ============================================================ */}
      {/* 1. TOP HEADER BAR (Matches Night.dc.html & Vote.dc.html)     */}
      {/* ============================================================ */}
      <div className="relative z-30 px-6 sm:px-10 pt-5 flex items-center justify-between">
        {/* Left: Back (‹), Help (?), Table Roster, and Dossier / Case Log (≡) Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onBack ? onBack() : window.history.back()}
            className="hb hover:border-[#D9A441] transition-colors"
            aria-label="Back to landing"
            title="Leave / Back (‹)"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => onOpenHelp()}
            className="hb hover:border-[#D9A441] transition-colors"
            aria-label="Help & Rulebook"
            title="Classified Rulebook & Role Dossiers (?)"
          >
            ?
          </button>
          <button
            type="button"
            onClick={() => setRosterModalOpen(true)}
            className="hb hover:border-[#D9A441] transition-colors"
            aria-label="Table Roster"
            title="Table Roster (All Seated Operatives)"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDossierDrawerOpen(true)}
            className="hb hover:border-[#D9A441] transition-colors relative"
            aria-label="Case Log & Intel"
            title="Event Wire & Case Intelligence (≡)"
          >
            ≡
            {role === 'police' && (me?.policeInbox?.length || 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#5B7A99] animate-pulse" />
            )}
          </button>
        </div>

        {/* Center: Phase Title + Enlarged Circular Progress Timer on Right */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="d text-3xl sm:text-5xl font-extrabold tracking-[4px] leading-none uppercase">
            {phase === 'night'
              ? `NIGHT · ${round}`
              : phase === 'voting'
              ? `VOTE · DAY ${round}`
              : `DAY · ${round}`}
          </div>

          {secondsRemaining !== null && (
            <div className="relative w-13 h-13 sm:w-14 sm:h-14 flex items-center justify-center shrink-0">
              <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" className="shrink-0 -rotate-90">
                <circle cx="28" cy="28" r="23" fill="none" stroke="#262A33" strokeWidth="3.5" />
                <circle
                  cx="28"
                  cy="28"
                  r="23"
                  fill="none"
                  stroke={phase === 'night' ? '#5B7A99' : '#D9A441'}
                  strokeWidth="3.5"
                  strokeDasharray="144.5 144.5"
                  strokeDashoffset={`${Math.max(
                    0,
                    144.5 -
                      (secondsRemaining /
                        Math.max(
                          1,
                          phase === 'night'
                            ? gameView.settings.nightDuration
                            : phase === 'voting'
                            ? gameView.settings.votingDuration
                            : gameView.settings.discussionDuration
                        )) *
                        144.5
                  )}`}
                  className="transition-all duration-300"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center d text-lg sm:text-xl font-black tracking-tight text-[#D9A441] leading-none">
                {secondsRemaining}s
              </span>
            </div>
          )}
        </div>

        {/* Right: Secret Role Pill Badge */}
        <div
          onClick={() => onOpenHelp('my-role')}
          className="cursor-pointer flex items-center gap-2.5 px-4 py-2 border border-[#262A33] hover:border-[#D9A441] rounded-full text-sm sm:text-base font-['Instrument_Sans'] transition-colors"
        >
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{
              backgroundColor:
                roleDef?.team === 'mafia'
                  ? '#B3363B'
                  : roleDef?.team === 'neutral'
                  ? '#C9A86A'
                  : '#5B7A99',
            }}
          />
          <span>{roleDef?.name || 'Spectator'}</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. SUBTITLE BANNER (Special Elite font, matches mockups)     */}
      {/* ============================================================ */}
      <div className="t relative z-20 text-center text-lg sm:text-xl text-[#A39D90] px-4 pt-2">
        {subtitleText}
      </div>

      {/* ============================================================ */}
      {/* 3. CINEMATIC TABLE ARENA (Centerpiece)                      */}
      {/* ============================================================ */}
      <div className="relative flex-1 w-full flex items-center justify-center my-auto min-h-[420px]">
        {/* Angled Spotlight Cone on Accused in Day Vote (Matches Vote.dc.html) */}
        {phase === 'voting' && accusedSeatPos && (
          <div
            className="absolute pointer-events-none z-0 transition-all duration-700 ease-out"
            style={{
              left: `calc(${accusedSeatPos.leftPercent}% - 150px)`,
              top: 0,
              width: '300px',
              height: `calc(${accusedSeatPos.topPercent}% + 70px)`,
              background: 'linear-gradient(rgba(240,215,154,.34), rgba(240,215,154,.02))',
              clipPath: 'polygon(45% 0, 55% 0, 100% 100%, 0 100%)',
            }}
          />
        )}

        {/* Ambient Warm Glow Pool above table */}
        <div
          className="absolute pointer-events-none z-0"
          style={{
            left: '50%',
            top: '46%',
            transform: 'translate(-50%, -50%)',
            width: '420px',
            height: '320px',
            background:
              phase === 'night'
                ? 'radial-gradient(circle, rgba(91,122,153,.22), transparent 65%)'
                : 'radial-gradient(circle, rgba(217,164,65,.22), transparent 65%)',
          }}
        />

        {/* The Green Felt Elliptical Table (Matches Night.dc.html: 780x300, border: 5px solid #3a3326) */}
        <div
          className="absolute pointer-events-none z-0 transition-all duration-500"
          style={{
            left: '50%',
            top: '48%',
            transform: 'translate(-50%, -50%)',
            width: 'min(780px, 86vw)',
            height: 'min(300px, 38vh)',
            borderRadius: '50%',
            border: '5px solid #3a3326',
            background: 'radial-gradient(ellipse at 50% 30%, #14201c, #080c0b 75%)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.85), inset 0 0 70px rgba(0,0,0,0.8)',
          }}
        >
          {/* Winner Announcement or Round Centerpiece */}
          {gameView.winner ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-10 pointer-events-auto">
              <Trophy className="w-10 h-10 text-[#D9A441] mb-1 animate-bounce" />
              <div className="d text-4xl sm:text-5xl font-black text-[#D9A441] tracking-widest uppercase">
                {gameView.winner === 'mafia'
                  ? 'MAFIA SYNDICATE WINS'
                  : gameView.winner === 'town'
                  ? 'TOWN PREVAILS'
                  : 'JESTER WINS'}
              </div>
              <p className="t text-sm sm:text-base text-[#ECE6D8] mt-1 max-w-sm">
                {gameView.winner === 'mafia'
                  ? 'The Syndicate seized control of the city!'
                  : gameView.winner === 'town'
                  ? 'Justice triumphed and the town was cleansed!'
                  : 'The town fell for the ultimate deception!'}
              </p>
            </div>
          ) : phase === 'morning' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-10 pointer-events-auto">
              <Sun className="w-9 h-9 text-[#D9A441] mb-1 animate-pulse" />
              <div className="d text-3xl sm:text-4xl font-extrabold text-[#D9A441] tracking-wider uppercase">
                DAWN IN THE CITY
              </div>
              <p className="t text-xs sm:text-sm text-[#ECE6D8] mt-1 max-w-xs line-clamp-2">
                {gameView.log.filter((l) => l.round === round && l.phase === 'morning').length > 0
                  ? gameView.log.filter((l) => l.round === round && l.phase === 'morning').slice(-1)[0].text
                  : 'The morning mist clears over the silent town.'}
              </p>
            </div>
          ) : phase === 'voteResult' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-10 pointer-events-auto">
              <Gavel className="w-9 h-9 text-[#B3363B] mb-1" />
              <div className="d text-3xl sm:text-4xl font-extrabold text-[#B3363B] tracking-wider uppercase">
                TOWN VERDICT
              </div>
              <p className="t text-xs sm:text-sm text-[#ECE6D8] mt-1 max-w-xs line-clamp-2">
                {gameView.log.filter((l) => l.round === round && l.phase === 'voting').length > 0
                  ? gameView.log.filter((l) => l.round === round && l.phase === 'voting').slice(-1)[0].text
                  : 'The ballots have been tallied.'}
              </p>
            </div>
          ) : null}

          {/* Active Target Confirmation in Table Center */}
          {!gameView.winner && (pendingTarget || pendingSpecialAction) && (canActAtNight || canVoteAtDay || (phase === 'discussion' && Boolean(me?.alive) && !isGod)) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-20 pointer-events-auto animate-in zoom-in-95 duration-200">
              <div className="t text-xs sm:text-sm text-[#D9A441] uppercase tracking-widest mb-1.5 font-bold">
                {phase === 'night'
                  ? role === 'doctor'
                    ? 'CONFIRM PROTECTION'
                    : role === 'police'
                    ? 'CONFIRM INVESTIGATION'
                    : 'CONFIRM NIGHT TARGET'
                  : phase === 'voting'
                  ? 'CONFIRM TOWN VOTE'
                  : 'CONFIRM SUSPICION'}
              </div>
              {/* Syndicate Real-Time Coordination Status */}
              {isObserverMafia && phase === 'night' && nightSubPhase === 'mafia' && (
                <div className="mb-2 p-2.5 bg-[#101216]/95 border border-[#262A33] rounded-[4px] max-w-sm w-full mx-auto space-y-1.5 shadow-xl">
                  <div className="text-[10px] uppercase font-mono tracking-widest text-[#D9A441] font-bold flex items-center justify-between">
                    <span>Syndicate Family Ledger</span>
                    <span className="text-[9px] text-[#A39D90] font-normal">{gameView.settings.mafiaKillMode} kill mode</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {players
                      .filter((p) => (p.role === 'mafia' || p.role === 'godfather') && p.alive)
                      .map((m) => {
                        const isMe = m.id === me?.id;
                        const targetId = isMe
                          ? (pendingTarget?.id || me?.nightPick)
                          : teammatePicks[m.id];
                        const targetPl = players.find((p) => p.id === targetId);
                        const isMConfirmed = isMe
                          ? Boolean(me?.isConfirmed && !pendingTarget)
                          : Boolean(me?.teammateConfirmed?.[m.id]);
                        return (
                          <div
                            key={m.id}
                            className="text-[10px] font-mono px-2 py-0.5 bg-[#171A20] border border-[#262A33] rounded flex items-center gap-1.5 shadow-sm"
                          >
                            <span className="font-bold text-[#ECE6D8]">
                              {isMe ? 'You' : m.name}{' '}
                              <span className={m.role === 'godfather' ? 'text-[#D9A441] font-bold' : 'text-[#fca5a5]'}>
                                [{m.role === 'godfather' ? 'Godfather' : 'Mafia'}]
                              </span>:
                            </span>
                            {targetPl ? (
                              <span className="text-[#D9A441] font-bold">{targetPl.name}</span>
                            ) : (
                              <span className="text-[#A39D90] italic">Deciding...</span>
                            )}
                            <span
                              className={`text-[9px] font-bold px-1 rounded ${
                                isMConfirmed ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                              }`}
                            >
                              {isMConfirmed ? 'Locked ✓' : 'Staged ⋯'}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirmAction}
                className="h-13 sm:h-14 px-8 bg-[#D9A441] hover:bg-[#FFEA00] text-[#0A0B0E] font-bold text-base sm:text-lg rounded-[6px] transition-all shadow-[0_0_25px_rgba(217,164,65,0.6)] hover:shadow-[0_0_35px_rgba(255,234,0,0.9)] hover:scale-105 active:scale-95 flex items-center gap-2.5 font-['Instrument_Sans'] uppercase tracking-wider cursor-pointer"
              >
                {phase === 'voting' ? (
                  <Gavel className="w-5 h-5 text-[#0A0B0E]" />
                ) : (
                  <Check className="w-5 h-5 text-[#0A0B0E]" />
                )}
                <span>
                  {phase === 'voting'
                    ? `Cast Vote · ${pendingTarget?.name || (pendingSpecialAction === 'skip' ? 'Abstain' : '')}`
                    : phase === 'discussion'
                    ? gameView.suspicions?.[me?.id || ''] === pendingTarget?.id
                      ? `Clear Suspicion · ${pendingTarget?.name}`
                      : `Mark Suspect · ${pendingTarget?.name}`
                    : `Confirm Orders · ${pendingTarget?.name || (pendingSpecialAction === 'hold' ? 'Hold Action' : '')}`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingTarget(null);
                  setPendingSpecialAction(null);
                }}
                className="mt-2 text-xs text-[#A39D90] hover:text-[#ECE6D8] underline font-sans cursor-pointer"
              >
                Cancel selection
              </button>
            </div>
          )}

          {/* Confirmed Target Status in Table Center */}
          {!gameView.winner && !pendingTarget && !pendingSpecialAction && (currentSelectionPlayer || currentSelectionId) && (canActAtNight || canVoteAtDay) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-20 pointer-events-none animate-in fade-in duration-200">
              <div className="p-4 bg-[#101216]/95 border border-[#5E8C7B]/60 rounded-[6px] max-w-sm shadow-2xl space-y-1.5 pointer-events-auto">
                <div className="t text-[11px] uppercase tracking-[2px] text-[#5E8C7B] font-bold flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4 text-[#5E8C7B]" />
                  <span>{phase === 'voting' ? 'BALLOT RECORDED' : 'ORDERS LOCKED'}</span>
                </div>
                <div className="text-sm font-sans font-bold text-[#ECE6D8]">
                  Target: <span className="text-[#D9A441]">{currentSelectionPlayer?.name || currentSelectionId}</span>
                </div>
                <p className="text-[11px] font-sans text-[#A39D90]">
                  Tap another seated operative if you wish to change your target.
                </p>
              </div>
            </div>
          )}

          {/* Inaction Advisory Notice when no player is selected */}
          {!gameView.winner && !pendingTarget && !pendingSpecialAction && !currentSelectionId && (canActAtNight || canVoteAtDay) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-10 pointer-events-none">
              <div className="p-3.5 bg-[#101216]/95 border border-[#D9A441]/50 rounded-[4px] max-w-sm shadow-2xl space-y-1">
                <div className="t text-[11px] uppercase tracking-[2px] text-[#D9A441] font-bold">
                  NO OPERATIVE SELECTED
                </div>
                <p className="text-xs font-sans text-[#ECE6D8]/85 leading-relaxed">
                  {phase === 'voting'
                    ? 'Tap an operative seated at the table to choose your vote.'
                    : "You haven't selected an operative yet. Tap someone to prepare your night order."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Targeting Vector Line (SVG dashed line connecting actor to target) */}
        {targetSeatPos && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" aria-hidden="true">
            <line
              x1={`${mySeatPos.leftPercent}%`}
              y1={`${mySeatPos.topPercent}%`}
              x2={`${targetSeatPos.leftPercent}%`}
              y2={`${targetSeatPos.topPercent}%`}
              stroke="#D9A441"
              strokeWidth="2"
              strokeDasharray="4 7"
            />
          </svg>
        )}

        {/* Pawns around the elliptical table */}
        {players.map((player, idx) => {
          const seatPos = seatPositions[idx] || { leftPercent: 50, topPercent: 50 };
          const posX = seatPos.leftPercent;
          const posY = seatPos.topPercent;

          const isMe = player.id === me?.id;
          const isTargeted = (pendingTarget?.id || currentSelectionId) === player.id;
          const playerVoteCount = voteCounts?.[player.id] || 0;
          const isSpeaking = Boolean(speakingPeers[player.id]) || (isMe && Boolean(speakingPeers['local']));
          const voiceLevel = isMe
            ? Math.max(speakingLevels['local'] || 0, speakingLevels[player.id] || 0)
            : (speakingLevels[player.id] || 0);
          const glow = getVoiceGlowStyle(voiceLevel, isSpeaking);
          const playerReaction = gameView.reactions?.[player.id];
          const playerColor = player.color || '#D9A441';

          // Eliminated Pawn (rotate 78deg, opacity 0.45, red stamp)
          if (!player.alive) {
            return (
              <React.Fragment key={player.id}>
                <div
                  className="fg pointer-events-none select-none transition-all duration-500"
                  style={{
                    left: `${posX}%`,
                    top: `${posY}%`,
                    ['--c' as any]: playerColor,
                    opacity: 0.45,
                    transform: 'translate(-50%, -50%) rotate(78deg)',
                  }}
                >
                  <div className="hd" />
                  <div className="bd" />
                </div>
                <div
                  className="t absolute pointer-events-none select-none z-20 border-2 border-[#B3363B] text-[#B3363B] px-2 py-0.5 text-xs font-bold"
                  style={{
                    left: `calc(${posX}% - 42px)`,
                    top: `calc(${posY}% + 18px)`,
                    transform: 'rotate(-6deg)',
                  }}
                >
                  ELIMINATED · {player.diedInRound ? (player.diedBy === 'vote' ? `D${player.diedInRound}` : `N${player.diedInRound}`) : 'FALLEN'}
                </div>
              </React.Fragment>
            );
          }

          // Living Pawn
          return (
            <div
              key={player.id}
              className={`fg transition-all select-none z-20 ${
                canActAtNight || canVoteAtDay || (phase === 'discussion' && !isMe)
                  ? 'cursor-pointer hover:drop-shadow-[0_0_15px_rgba(217,164,65,0.7)] [&:hover_.nm]:border-[#D9A441] [&:hover_.nm]:text-[#D9A441]'
                  : 'cursor-default'
              }`}
              style={{
                left: `${posX}%`,
                top: `${posY}%`,
                ['--c' as any]: playerColor,
              }}
              onClick={() => handleSeatClick(player)}
            >
              {/* Elliptical Targeting Ring (Exact dimensions from Night.dc.html & Vote.dc.html) */}
              {isTargeted && (
                <div
                  style={{
                    position: 'absolute',
                    left: '5px',
                    top: '-10px',
                    width: '80px',
                    height: '104px',
                    border: '2px solid #D9A441',
                    borderRadius: '50%',
                    boxShadow: '0 0 15px rgba(217,164,65,0.4)',
                  }}
                />
              )}

              {/* Pawn Head (.hd) with Dynamic Voice Glow */}
              <div
                className="hd relative transition-all duration-150"
                style={{
                  boxShadow: glow.tier !== 'none' ? glow.boxShadow : undefined,
                  border: glow.tier !== 'none' ? `${glow.borderWidth} solid ${glow.borderColor}` : undefined,
                }}
              >
                {/* Detective Investigation Verdict Badge (Visible to Police) */}
                {role === 'police' && me?.policeInbox && (() => {
                  const inv = me.policeInbox.find((e) => e.targetId === player.id);
                  if (!inv) return null;
                  const isMafia = inv.result.toLowerCase() === 'mafia';
                  return (
                    <div
                      className={`absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-1 font-['Special_Elite'] text-[11px] sm:text-xs tracking-wider uppercase border flex items-center gap-1.5 shadow-xl whitespace-nowrap z-30 pointer-events-none rounded-[3px] ${
                        isMafia
                          ? 'bg-[#170D0D]/95 text-[#fca5a5] border-[#B3363B] shadow-[0_0_12px_rgba(179,54,59,0.5)]'
                          : 'bg-[#0A1410]/95 text-[#86efac] border-[#5E8C7B] shadow-[0_0_12px_rgba(94,140,123,0.4)]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isMafia ? 'bg-[#B3363B]' : 'bg-[#5E8C7B]'}`} />
                      <span className="font-bold">{isMafia ? 'MAFIA' : 'NOT MAFIA'}</span>
                    </div>
                  );
                })()}

                {/* Syndicate Family Tag on fellow operatives */}
                {isObserverMafia && (player.role === 'mafia' || player.role === 'godfather') && (
                  <div
                    className={`absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 font-['Instrument_Sans'] text-[10px] font-extrabold uppercase border flex items-center gap-1 shadow-lg whitespace-nowrap z-30 pointer-events-none rounded ${
                      player.role === 'godfather'
                        ? 'bg-[#1C150A] text-[#D9A441] border-[#D9A441]'
                        : 'bg-[#1C0D0E] text-[#fca5a5] border-[#B3363B]'
                    }`}
                  >
                    <span>{player.role === 'godfather' ? '👑 Godfather' : '🗡 Mafia'}</span>
                  </div>
                )}

                {isSpeaking && (
                  <div
                    className="absolute -inset-1.5 rounded-full pointer-events-none z-30 transition-all duration-150 animate-pulse"
                    style={{
                      border: '2px solid #2ED573',
                      boxShadow: '0 0 16px #2ED573, 0 0 30px rgba(46, 213, 115, 0.7), inset 0 0 8px rgba(46, 213, 115, 0.4)',
                    }}
                  />
                )}
                {player.isHost && (
                  <Crown className="w-3.5 h-3.5 text-[#D9A441] absolute -top-4 left-1/2 -translate-x-1/2" />
                )}
              </div>

              {/* Pawn Body (.bd) */}
              <div className="bd" />

              {/* Name Plaque (.nm) */}
              <span
                className="nm flex items-center justify-center gap-1"
                style={{
                  border: isTargeted ? '1px solid #D9A441' : undefined,
                }}
              >
                <span>{isMe ? `${player.name} (You)` : player.name}</span>
                {isObserverMafia && !isMe && (player.role === 'mafia' || player.role === 'godfather') && (
                  <span
                    className={`text-[9px] font-bold px-1 py-0.2 rounded font-mono uppercase ${
                      player.role === 'godfather'
                        ? 'bg-[#D9A441]/20 text-[#D9A441] border border-[#D9A441]/40'
                        : 'bg-[#B3363B]/20 text-[#fca5a5] border border-[#B3363B]/40'
                    }`}
                  >
                    {player.role === 'godfather' ? 'GF' : 'MAF'}
                  </span>
                )}
                {isTargeted && <span className="text-[#D9A441] text-[11px]">· target</span>}
                {playerReaction && (
                  <span className="text-[#D9A441] ml-0.5">
                    {REACTION_GLYPHS[playerReaction.reaction as QuickReaction] || playerReaction.reaction}
                  </span>
                )}
              </span>

              {/* Syndicate Teammate Target Indicators on Seated Pawns */}
              {isObserverMafia && phase === 'night' && nightSubPhase === 'mafia' && (() => {
                const teammateTargets = Object.entries(teammatePicks).filter(
                  ([tId, targetId]) => tId !== me?.id && targetId === player.id
                );
                if (teammateTargets.length === 0) return null;
                return (
                  <div className="mt-2 flex flex-col items-center gap-1.5 z-30 pointer-events-none whitespace-nowrap">
                    {teammateTargets.map(([tId]) => {
                      const tPlayer = players.find((p) => p.id === tId);
                      const isTConfirmed = Boolean(me?.teammateConfirmed?.[tId]);
                      return (
                        <div
                          key={tId}
                          className={`px-2.5 py-1 rounded-[3px] text-xs font-mono font-bold border flex items-center gap-1.5 shadow-2xl backdrop-blur-md transition-all ${
                            isTConfirmed
                              ? 'bg-[#0A1814]/95 border-[#5E8C7B] text-[#ECE6D8] shadow-[0_0_12px_rgba(94,140,123,0.4)]'
                              : 'bg-[#1C150A]/95 border-[#D9A441] text-[#ECE6D8] shadow-[0_0_12px_rgba(217,164,65,0.4)] animate-pulse'
                          }`}
                        >
                          <Crosshair
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isTConfirmed ? 'text-[#5E8C7B]' : 'text-[#D9A441]'
                            }`}
                          />
                          <span className="font-sans font-semibold text-[#ECE6D8]">
                            {tPlayer?.name || 'Partner'}:
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-black tracking-wider uppercase border ${
                              isTConfirmed
                                ? 'bg-[#5E8C7B]/25 text-[#86efac] border-[#5E8C7B]/60'
                                : 'bg-[#D9A441]/25 text-[#F0D79A] border-[#D9A441]/60'
                            }`}
                          >
                            {isTConfirmed ? 'LOCKED ✓' : 'STAGED ⋯'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Day Vote Tallies: Stacked circle tokens + 64px Big Shoulders count (Matches Vote.dc.html) */}
              {phase === 'voting' && playerVoteCount > 0 && (
                <div
                  className="absolute flex items-center gap-2 pointer-events-none z-30"
                  style={{
                    left: '96px',
                    top: '-10px',
                  }}
                >
                  <div className="flex flex-col gap-1">
                    {Array.from({ length: Math.min(6, playerVoteCount) }).map((_, i) => (
                      <span
                        key={i}
                        className="w-4 h-4 rounded-full bg-[#D9A441] border border-[#101216]"
                      />
                    ))}
                  </div>
                  <div className="d text-5xl font-black text-[#F0D79A] leading-none">
                    {playerVoteCount}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* 4. BOTTOM ACTION CONTROL BAR (Matches Night & Vote mockups)  */}
      {/* ============================================================ */}
      <div className="relative z-30 px-6 sm:px-10 pb-6 flex items-center justify-between">
        {/* Left spacer matching bottom dock width (chat now sits in bottom-left voice dock) */}
        <div className="w-[240px] sm:w-[280px] hidden sm:block pointer-events-none" />

        {/* Center: Phase Action Controls */}
        <div className="flex items-center gap-5">
          {phase === 'night' && canActAtNight && (
            <div className="flex items-center gap-4">
              <div className="text-base sm:text-lg text-[#ECE6D8]">
                {selectedTargetPlayer ? (
                  <span>Selected: <strong className="text-[#D9A441]">{selectedTargetPlayer.name}</strong> <span className="text-xs text-[#A39D90] font-mono">(Confirm in Table Center)</span></span>
                ) : (
                  <span>
                    {role === 'doctor'
                      ? 'Select an operative to shield'
                      : role === 'police'
                      ? 'Select a suspect to investigate'
                      : 'Select an operative to eliminate'}
                  </span>
                )}
              </div>
              {role === 'vigilante' && !selectedTargetPlayer && (
                <button
                  type="button"
                  onClick={() => setPendingSpecialAction('hold')}
                  className="ob h-11 px-4 text-xs font-semibold rounded hover:border-[#D9A441]"
                >
                  Hold Fire (X)
                </button>
              )}
            </div>
          )}

          {phase === 'voting' && canVoteAtDay && (
            <>
              <div className="text-lg sm:text-xl text-[#ECE6D8]">
                Your vote:{' '}
                <b className="text-[#F0D79A]">
                  {selectedTargetPlayer?.name || (currentSelectionId === 'skip' ? 'Abstain' : 'None')}
                </b>
              </div>
              {selectedTargetPlayer && (
                <button
                  type="button"
                  onClick={() => setPendingTarget(null)}
                  className="ob h-12 text-sm font-semibold rounded"
                >
                  Change vote
                </button>
              )}
              {gameView.settings.allowSkipVote && (
                <button
                  type="button"
                  onClick={() => {
                    onVote('skip');
                    setPendingTarget(null);
                  }}
                  className="text-[#A39D90] hover:text-[#ECE6D8] text-base transition-colors"
                >
                  Abstain
                </button>
              )}
            </>
          )}

          {phase === 'discussion' && me?.alive && !isGod && (
            <button
              type="button"
              onClick={onReadyToVote}
              className={`h-12 px-7 font-semibold text-base rounded transition-all font-['Instrument_Sans'] cursor-pointer shadow-lg ${
                readyToVoteList.includes(me?.id || '')
                  ? 'bg-[#101216] border-2 border-[#D9A441] text-[#D9A441]'
                  : 'bg-[#D9A441] text-[#0A0B0E] hover:bg-[#c49233]'
              }`}
            >
              {readyToVoteList.includes(me?.id || '') ? 'Ready ✓' : 'Ready to Vote (V)'}
            </button>
          )}

          {/* Host Fast Advance in No Timer Mode */}
          {gameView.settings.noTimer && (me?.isHost || me?.isGod) && phase !== 'gameOver' && (
            <button
              type="button"
              onClick={() => onGodAction?.('next')}
              className="h-11 px-4 font-semibold text-xs rounded border border-[#D9A441] text-[#D9A441] bg-[#171A20] hover:bg-[#D9A441] hover:text-[#0A0B0E] transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              title="Force advance to next section (Untimed Mode)"
            >
              <span>Next Phase ❯❯</span>
            </button>
          )}
        </div>

        {/* Right: Living Status Tally + Golden Dots */}
        <div className="w-[280px] flex items-center justify-end gap-2 text-sm text-[#A39D90] font-['Instrument_Sans']">
          <span>
            {livingPlayers.length} alive · {deadPlayers.length} fallen
          </span>
          <div className="flex items-center gap-1.5 ml-1">
            {livingPlayers.map((p) => (
              <span
                key={p.id}
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: '#D9A441' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. SLIDE-IN CHAT DRAWER (Encrypted Syndicate & Ghost ONLY)   */}
      {/* ============================================================ */}
      {chatDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-start bg-black/60 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm h-full bg-[#101216] border-r border-[#262A33] p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#262A33]">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#D9A441]" />
                <span className="d text-2xl font-bold tracking-wider text-[#ECE6D8]">
                  {activeChannel === 'mafia' ? 'ENCRYPTED SYNDICATE' : 'GHOST UNDERWORLD'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setChatDrawerOpen(false)}
                className="p-1 text-[#A39D90] hover:text-[#ECE6D8]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 no-scrollbar text-xs font-['Instrument_Sans']">
              {tabMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#A39D90] text-center p-4">
                  <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                  <p className="t text-sm">
                    {activeChannel === 'mafia'
                      ? 'Encrypted frequency ready. Coordinate strikes.'
                      : 'Silence in the graveyard.'}
                  </p>
                </div>
              ) : (
                tabMessages.map((msg) => {
                  const isLocal = msg.senderId === me?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded border ${
                        isLocal
                          ? 'bg-[#171A20] border-[#D9A441]/50 ml-3'
                          : msg.channel === 'mafia'
                          ? 'bg-[#171A20] border-[#B3363B]/50 mr-3'
                          : 'bg-[#171A20] border-[#8C6FA0]/50 mr-3'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#A39D90] mb-1">
                        <span className="font-bold text-[#ECE6D8]">{msg.senderName}</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm text-[#ECE6D8] break-words">{msg.text}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="pt-2 border-t border-[#262A33] flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={activeChannel === 'mafia' ? 'Whisper to Syndicate...' : 'Speak to spirits...'}
                maxLength={300}
                className="flex-1 bg-[#171A20] border border-[#262A33] px-3 py-2 text-sm text-[#ECE6D8] rounded placeholder:text-[#A39D90]/50 focus:outline-none focus:border-[#D9A441]"
              />
              <button
                type="submit"
                className="h-9 px-3 bg-[#D9A441] text-[#0A0B0E] font-bold text-xs uppercase rounded hover:bg-[#c49233]"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. SLIDE-IN DOSSIER & EVENT WIRE DRAWER                     */}
      {/* ============================================================ */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-start bg-black/60 backdrop-blur-sm select-none ${
          dossierDrawerOpen ? '' : 'hidden pointer-events-none'
        }`}
      >
        <div className="w-full max-w-md h-full bg-[#101216] border-r border-[#262A33] p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200 font-['Instrument_Sans']">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#262A33]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#D9A441]" />
              <span className="d text-2xl font-bold tracking-wider text-[#ECE6D8]">
                CASE INTELLIGENCE
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDossierDrawerOpen(false)}
              className="p-1 text-[#A39D90] hover:text-[#ECE6D8]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Dossier Body */}
          <div className="flex-1 overflow-y-auto py-3 space-y-4 no-scrollbar">
            {/* Secret Identity Card */}
            <div className="p-3 bg-[#171A20] border border-[#262A33] rounded space-y-1">
              <div className="flex items-center justify-between text-xs text-[#A39D90]">
                <span>OPERATIVE IDENTIFIER</span>
                <span className="font-bold text-[#D9A441] uppercase">{roleDef?.team}</span>
              </div>
              <div className="text-base font-bold text-[#ECE6D8]">{me?.name}</div>
              <div className="text-sm font-semibold text-[#D9A441]">{roleDef?.name}</div>
              <p className="t text-xs text-[#A39D90] mt-1">{roleDef?.summary}</p>
            </div>

            {/* Detective Intel Dossier (if Detective/Police) */}
            {role === 'police' && me?.policeInbox && me.policeInbox.length > 0 && (
              <div className="p-3 bg-[#171A20] border border-[#5B7A99]/50 rounded space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#5B7A99] uppercase">
                  <Search className="w-3.5 h-3.5" />
                  <span>Detective Dossier</span>
                </div>
                  <div className="space-y-1.5">
                    {me.policeInbox.map((entry, idx) => {
                      const target = players.find((p) => p.id === entry.targetId);
                      const isMafia = entry.result.toLowerCase() === 'mafia';
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 bg-[#101216] border border-[#262A33] rounded-[4px] text-xs shadow-inner"
                        >
                          <span className="font-bold text-[#ECE6D8] font-['Instrument_Sans']">{target?.name || 'Subject'}</span>
                          <span
                            className={`px-2.5 py-1 font-['Special_Elite'] text-xs uppercase tracking-wider font-bold rounded border shadow-md flex items-center gap-1.5 ${
                              isMafia
                                ? 'bg-[#1C0D0E] border-[#B3363B] text-[#fca5a5] shadow-[0_0_10px_rgba(179,54,59,0.4)]'
                                : 'bg-[#0A1410] border-[#5E8C7B] text-[#86efac] shadow-[0_0_10px_rgba(94,140,123,0.3)]'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isMafia ? 'bg-[#B3363B]' : 'bg-[#5E8C7B]'}`} />
                            <span>{isMafia ? 'MAFIA' : 'NOT MAFIA'}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Event Wire Log Feed */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#A39D90]">
                  EVENT WIRE ({logList.length})
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto no-scrollbar">
                  {logList.slice(-15).reverse().map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-2 rounded border text-xs ${
                        entry.type === 'death'
                          ? 'bg-[#171A20] border-[#B3363B]/40 text-red-300'
                          : entry.type === 'vote'
                          ? 'bg-[#171A20] border-[#D9A441]/40 text-[#F0D79A]'
                          : 'bg-[#171A20] border-[#262A33] text-[#ECE6D8]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#A39D90] mb-0.5 font-mono">
                        <span>Round {entry.round} · {entry.phase}</span>
                        <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p>{entry.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Close Dossier */}
            <button
              type="button"
              onClick={() => setDossierDrawerOpen(false)}
              className="ob w-full h-11 text-sm font-semibold rounded border border-[#262A33] text-[#ECE6D8] hover:border-[#D9A441]"
            >
              Close Dossier
            </button>
          </div>
        </div>

      {/* Target Confirmation Modal */}
      <Modal
        isOpen={Boolean(pendingSpecialAction)}
        onClose={() => setPendingSpecialAction(null)}
        title="CONFIRM ACTION"
      >
        <div className="space-y-4 text-[#ECE6D8] font-['Instrument_Sans']">
          <div className="p-3 bg-[#171A20] border border-[#262A33] rounded flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#D9A441] shrink-0" />
            <div className="text-sm">
              {pendingSpecialAction === 'skip' ? (
                <span>Are you sure you want to <strong>abstain from voting</strong> today?</span>
              ) : (
                <span>Are you sure you want to <strong>hold fire</strong> tonight?</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setPendingSpecialAction(null)}
              className="ob px-4 py-2 text-xs font-semibold rounded border border-[#262A33] text-[#A39D90] hover:text-[#ECE6D8]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAction}
              className="px-5 py-2 bg-[#D9A441] text-[#0A0B0E] font-bold text-xs uppercase rounded hover:bg-[#c49233]"
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      {/* Table Roster Modal (Numbered Player List) */}
      <Modal
        isOpen={rosterModalOpen}
        onClose={() => setRosterModalOpen(false)}
        title="TABLE ROSTER"
        subtitle={`ACTIVE OPERATIVES · ${players.length} SEATED`}
      >
        <div className="space-y-4 text-[#ECE6D8] font-['Instrument_Sans']">
          <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
            {players.map((p, index) => {
              const isLocal = p.id === me?.id;
              const isSpeaking = Boolean(speakingPeers[p.id]) || (isLocal && Boolean(speakingPeers['local']));
              const voiceLevel = isLocal
                ? Math.max(speakingLevels['local'] || 0, speakingLevels[p.id] || 0)
                : (speakingLevels[p.id] || 0);
              const glow = getVoiceGlowStyle(voiceLevel, isSpeaking);
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-[6px] border transition-all ${
                    !p.alive
                      ? 'bg-[#101216]/60 border-[#262A33]/40 opacity-50'
                      : glow.tier !== 'none'
                      ? 'bg-[#0B1A13]/90 border border-[#2ED573]/60'
                      : 'bg-[#171A20] border-[#262A33]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-[#D9A441] w-7 shrink-0">
                      #{index + 1}
                    </span>
                    <div
                      className="w-9 h-9 rounded-full border-2 overflow-hidden shrink-0 flex items-center justify-center transition-all"
                      style={{
                        borderColor: glow.tier !== 'none' ? glow.borderColor : (p.color || '#D9A441'),
                        boxShadow: glow.boxShadow !== 'none' ? glow.boxShadow : undefined,
                      }}
                    >
                      <Avatar avatarId={p.avatar} size={32} className="border-0" />
                    </div>
                    <div className="truncate">
                      <div className="text-sm font-semibold text-[#ECE6D8] truncate flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {isLocal && <span className="text-xs text-[#D9A441]">(You)</span>}
                        {p.isHost && <Crown className="w-3.5 h-3.5 text-[#D9A441]" />}
                      </div>
                      <div className="text-[11px] font-mono text-[#A39D90]">
                        {p.alive ? 'Active Operative' : `Fallen · ${p.diedBy === 'vote' ? 'Exiled' : 'Casualty'}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {glow.tier !== 'none' && (
                      <span
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-colors animate-pulse"
                        style={{
                          color: glow.textColor,
                          borderColor: glow.borderColor,
                          backgroundColor: 'rgba(10, 26, 18, 0.7)',
                        }}
                      >
                        {glow.label.toUpperCase()}
                      </span>
                    )}
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                        p.alive
                          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                          : 'border-[#B3363B]/40 text-red-400 bg-[#B3363B]/10'
                      }`}
                    >
                      {p.alive ? 'ALIVE' : 'ELIMINATED'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2 border-t border-[#262A33]">
            <button
              type="button"
              onClick={() => setRosterModalOpen(false)}
              className="ob px-5 py-2 text-xs font-semibold rounded"
            >
              Close Roster
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
