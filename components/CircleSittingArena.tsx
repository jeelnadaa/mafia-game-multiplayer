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
  Lock,
  Eye,
  Radio,
  Flame,
  Sun,
  Gavel,
  Search,
  FileText,
} from 'lucide-react';
import { ClientGameView, PlayerView, ChatChannel, ChatMessage, QuickReaction } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { Avatar, Button, Modal, CenterTimer, Kbd, Badge } from './ui';
import { useShortcut } from '@/lib/shortcuts';
import { getSeatPositions } from '@/lib/layout';
import { voiceEngine } from '@/lib/voice';

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
  onNightAction: (targetId: string) => void;
  onConfirmNightAction: (targetId: string) => void;
  onVote: (targetId: string) => void;
  onReadyToVote: () => void;
  onSendChat: (channel: ChatChannel, text: string) => void;
  onOpenHelp: (tab?: any) => void;
  onSetSuspicion?: (targetId: string) => void;
  onClearSuspicion?: () => void;
  onSendReaction?: (reaction: QuickReaction) => void;
}

export function CircleSittingArena({
  gameView,
  onNightAction,
  onConfirmNightAction,
  onVote,
  onReadyToVote,
  onSendChat,
  onOpenHelp,
  onSetSuspicion,
  onClearSuspicion,
  onSendReaction,
}: CircleSittingArenaProps) {
  const { phase, round, me, voteCounts, nightSubPhase } = gameView;
  const players = gameView.players || [];
  const readyToVoteList = gameView.readyToVote || [];
  const logList = gameView.log || [];
  const chatList = gameView.chat || [];

  const [speakingPeers, setSpeakingPeers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    return voiceEngine.subscribe((map) => setSpeakingPeers(map));
  }, []);

  const myIndex = Math.max(0, players.findIndex((p) => p.id === me?.id));
  const seatPositions = useMemo(() => {
    return getSeatPositions(players.length, 100, 100, myIndex, 8);
  }, [players.length, myIndex]);


  // Active Chat Channel Tab
  const [activeChannel, setActiveChannel] = useState<ChatChannel>('public');
  const [chatInput, setChatInput] = useState('');

  // Confirmation Modals State
  const [pendingTarget, setPendingTarget] = useState<PlayerView | null>(null);
  const [pendingSpecialAction, setPendingSpecialAction] = useState<'skip' | 'hold' | null>(null);

  const role = me?.role;
  const roleDef = role ? ROLES[role] : null;
  const isDead = !me?.alive;
  const isGod = Boolean(me?.isGod);
  const isObserverMafia = role === 'mafia' || role === 'godfather';

  // Automatically default chat tab to active channel
  useEffect(() => {
    if (phase === 'night' && isObserverMafia) {
      setActiveChannel('mafia');
    } else if (isDead) {
      setActiveChannel('dead');
    } else {
      setActiveChannel('public');
    }
  }, [phase, isDead, isObserverMafia]);

  // Teammate picks for Mafias
  const teammatePicks = me?.teammatePicks || {};

  // Current selection for observer
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
    // Cannot click dead players or god
    if (!player.alive || player.isGod) return;

    if (phase === 'night' && canActAtNight) {
      // Cannot target self for Mafia kill, Vigilante, or Police investigation
      if ((nightSubPhase === 'mafia' || nightSubPhase === 'vigilante' || nightSubPhase === 'police') && player.id === me?.id) return;
      // Doctor rules: cannot self-save if none remaining, cannot repeat target if doctorSameTargetTwice is false
      if (nightSubPhase === 'doctor' && player.id === me?.id && me?.doctorSelfSavesRemaining === 0) return;
      if (nightSubPhase === 'doctor' && !gameView.settings.doctorSameTargetTwice && me?.doctorLastSavedId === player.id) return;

      // Immediately notify host & teammates of this tap so other mafias see the reticle live!
      onNightAction(player.id);
      setPendingTarget(player);
    } else if (phase === 'voting' && canVoteAtDay) {
      // Cannot vote for self
      if (player.id === me?.id) return;
      onVote(player.id);
      setPendingTarget(player);
    } else if (phase === 'discussion' && me?.alive && !isGod && player.id !== me?.id) {
      if (gameView.suspicions?.[me.id] === player.id) {
        onClearSuspicion?.();
      } else {
        onSetSuspicion?.(player.id);
      }
    }
  };

  const handleConfirmAction = () => {
    if (pendingTarget) {
      if (phase === 'night') {
        onConfirmNightAction(pendingTarget.id);
      } else if (phase === 'voting') {
        onVote(pendingTarget.id);
      }
      setPendingTarget(null);
    } else if (pendingSpecialAction) {
      if (pendingSpecialAction === 'skip') {
        onVote('skip');
      } else if (pendingSpecialAction === 'hold') {
        onNightAction('hold');
        onConfirmNightAction('hold');
      }
      setPendingSpecialAction(null);
    }
  };

  // Keyboard shortcut V for ready to vote
  useShortcut(['v', 'V'], () => {
    if (phase === 'discussion' && me?.alive && !isGod) {
      onReadyToVote();
    }
  }, { scope: 'screen' });

  // Keyboard shortcut S for skip vote
  useShortcut(['s', 'S'], () => {
    if (phase === 'voting' && me?.alive && !isGod && gameView.settings.allowSkipVote) {
      setPendingSpecialAction('skip');
    }
  }, { scope: 'screen' });

  // Keyboard shortcut X for Vigilante hold fire
  useShortcut(['x', 'X'], () => {
    if (phase === 'night' && role === 'vigilante' && canActAtNight) {
      setPendingSpecialAction('hold');
    }
  }, { scope: 'screen' });

  // Filter chat messages for active tab
  const tabMessages = useMemo(() => {
    return chatList.filter((msg) => msg.channel === activeChannel);
  }, [chatList, activeChannel]);

  // Total living players
  const livingPlayers = players.filter((p) => p.alive && !p.isGod);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-transparent">
      {/* 3-Column Round Table Layout on Desktop, Stacks on Mobile */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-3 md:p-6 lg:p-8 max-w-[1920px] mx-auto w-full items-stretch">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: MULTI-CHANNEL CHAT WIRE (3 cols)           */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 bg-surface border border-border flex flex-col h-[680px] lg:h-[820px] order-2 lg:order-1">
          {/* Channel Tabs */}
          <div className="flex items-center border-b border-border bg-surface-2 p-1.5 gap-1 text-xs">
            {/* Town Assembly Channel */}
            <button
              type="button"
              onClick={() => setActiveChannel('public')}
              disabled={isDead && !isGod}
              className={`flex-1 py-1.5 px-2 text-center font-semibold rounded-none transition-colors flex items-center justify-center gap-1.5 ${
                activeChannel === 'public'
                  ? 'bg-white text-black'
                  : 'text-muted hover:text-text disabled:opacity-30'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Town</span>
            </button>

            {/* Ghost Underworld Channel (Dead only or God) */}
            {(isDead || isGod) && (
              <button
                type="button"
                onClick={() => setActiveChannel('dead')}
                className={`flex-1 py-1.5 px-2 text-center font-semibold rounded-none transition-colors flex items-center justify-center gap-1.5 ${
                  activeChannel === 'dead'
                    ? 'bg-purple-600 text-white'
                    : 'text-muted hover:text-text'
                }`}
              >
                <Ghost className="w-3.5 h-3.5 text-purple-300" />
                <span>Ghost</span>
              </button>
            )}

            {/* Mafia Secret Wire (Mafia only or God) */}
            {(isObserverMafia || isGod) && (
              <button
                type="button"
                onClick={() => setActiveChannel('mafia')}
                className={`flex-1 py-1.5 px-2 text-center font-semibold rounded-none transition-colors flex items-center justify-center gap-1.5 ${
                  activeChannel === 'mafia'
                    ? 'bg-red-600 text-white'
                    : 'text-muted hover:text-text'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-red-200" />
                <span>Syndicate</span>
              </button>
            )}
          </div>

          {/* Active Channel Header Info */}
          <div className="px-4 py-2 border-b border-border bg-black/40 flex items-center justify-between text-xs text-muted">
            <span className="flex items-center gap-1.5 font-medium">
              {activeChannel === 'public' && 'Public Town Square'}
              {activeChannel === 'dead' && 'Underworld Ghost Convo'}
              {activeChannel === 'mafia' && 'Encrypted Syndicate Wire'}
            </span>
            <span className="font-mono text-[11px]">{tabMessages.length} msgs</span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs md:text-sm">
            {tabMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted p-4 space-y-2">
                <MessageSquare className="w-8 h-8 opacity-20" />
                <p className="text-xs">
                  {activeChannel === 'public' && 'No public messages yet. Deliberate with the town.'}
                  {activeChannel === 'dead' && 'Silence in the graveyard. The spirits have not spoken.'}
                  {activeChannel === 'mafia' && 'Encrypted channel active. Coordinate secret night strikes.'}
                </p>
              </div>
            ) : (
              tabMessages.map((msg) => {
                const isMe = msg.senderId === me?.id;
                const isSystem = msg.senderId === 'system';
                const senderPlayer = players.find((p) => p.id === msg.senderId);

                if (isSystem) {
                  return (
                    <div
                      key={msg.id}
                      className="p-2.5 bg-zinc-950 border border-zinc-700 text-xs text-amber-300 font-mono flex items-start gap-2 shadow-sm rounded-none"
                    >
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">
                          <span>SYSTEM TRANSMISSION</span>
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="leading-relaxed break-words text-white font-medium">{msg.text}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`p-2.5 border rounded-none ${
                      isMe
                        ? 'bg-white/5 border-white/30 ml-4'
                        : msg.channel === 'mafia'
                        ? 'bg-red-950/30 border-red-900/50 mr-4'
                        : msg.channel === 'dead'
                        ? 'bg-purple-950/20 border-purple-900/40 mr-4'
                        : 'bg-surface-2 border-border mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <Avatar avatarId={senderPlayer?.avatar || 1} size={18} className="rounded-none" />
                        <span className="font-bold text-white text-xs">{msg.senderName}</span>
                      </div>
                      <span className="text-[10px] text-muted font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-text leading-relaxed break-words">{msg.text}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Composer */}
          {((activeChannel === 'public' && gameView.settings.dayChat) ||
            (activeChannel === 'mafia' && gameView.settings.mafiaNightChat) ||
            (activeChannel === 'dead' && gameView.settings.deadChat) ||
            isGod) ? (
            <form onSubmit={handleSendChat} className="p-3 border-t border-border bg-surface-2 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  activeChannel === 'mafia'
                    ? 'Whisper to syndicate...'
                    : activeChannel === 'dead'
                    ? 'Speak from the afterlife...'
                    : 'Type public assembly message...'
                }
                maxLength={300}
                className="flex-1 bg-black border border-border px-3 py-2 text-xs md:text-sm text-text placeholder-muted/60 focus:outline-none focus:border-white rounded-none"
              />
              <Button type="submit" variant="primary" size="sm" className="px-3 shrink-0">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          ) : (
            <div className="p-3 border-t border-border bg-surface-2 text-center text-xs text-muted">
              {activeChannel === 'public'
                ? 'Town public chat is disabled by room rules.'
                : activeChannel === 'mafia'
                ? 'Syndicate night chat is disabled by room rules.'
                : 'Graveyard chat is disabled by room rules.'}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* CENTER COLUMN: 3D ROUND TABLE CIRCLE SITTING ARENA (6 cols)*/}
        {/* ========================================================= */}
        <div className="lg:col-span-6 bg-surface border border-border p-4 md:p-6 flex flex-col justify-between items-center h-[680px] lg:h-[820px] relative overflow-hidden order-1 lg:order-2">
          
          {/* Arena Top Status Bar with Prominent Centered Timer */}
          <div className="w-full flex items-center justify-between border-b border-border pb-3 z-10 bg-surface/90 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-white text-black text-xs font-mono font-bold">
                Round {round}
              </span>
              <span className="text-xs md:text-sm font-bold text-text capitalize">
                {phase === 'night' ? `Night · ${nightSubPhase || 'Operations'}` : phase}
              </span>
            </div>

            {/* Compact Center Countdown Timer */}
            <CenterTimer
              phaseEndsAt={gameView.phaseEndsAt}
              serverNow={gameView.serverNow}
              label={phase === 'night' ? 'Night' : phase === 'voting' ? 'Ballot' : 'Discussion'}
              size="sm"
            />

            <div className="text-right">
              <span className="text-xs text-muted block">Round Table</span>
              <span className="text-xs font-bold text-white">{livingPlayers.length} Seated</span>
            </div>
          </div>

          {/* Interactive Phase Guidance Banner */}
          <div className="w-full text-center py-1.5 px-3 bg-surface-2 border-y border-border text-xs z-10 my-1">
            {phase === 'night' && canActAtNight && (
              <span className="text-red-300 font-semibold flex items-center justify-center gap-2">
                <Crosshair className="w-4 h-4 animate-pulse text-red-400" />
                {role === 'police'
                  ? 'Tap any living suspect seated at the table to secretly investigate their allegiance tonight.'
                  : role === 'doctor'
                  ? 'Tap any living player seated at the table to protect them from harm tonight.'
                  : 'Tap any living player sitting at the table to select your secret night target.'}
              </span>
            )}
            {phase === 'night' && !canActAtNight && (
              <span className="text-muted flex items-center justify-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                Night shadows envelop the room. Awaiting syndicate and specialist actions...
              </span>
            )}
            {phase === 'discussion' && (
              <span className="text-zinc-300 flex items-center justify-center gap-2">
                Deliberate with fellow town members. Press [V] or button below when ready to vote.
              </span>
            )}
            {phase === 'voting' && canVoteAtDay && (
              <span className="text-amber-300 font-semibold flex items-center justify-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Tap a seated player to cast your elimination ballot today.
              </span>
            )}
            {phase === 'voting' && !canVoteAtDay && (
              <span className="text-muted">Town voting in progress...</span>
            )}
          </div>

          {/* Detective Intel Banner: Display latest investigation report for Police */}
          {role === 'police' && me?.policeInbox && me.policeInbox.length > 0 && (
            <div className="w-full text-center py-1.5 px-3 bg-blue-950/40 border-b border-blue-900/60 text-xs text-blue-200 flex items-center justify-center gap-2 z-10">
              <Search className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>
                Detective Intelligence: Latest investigation on{' '}
                <strong className="text-white">
                  {players.find((p) => p.id === me.policeInbox![me.policeInbox!.length - 1].targetId)?.name || 'Subject'}
                </strong>{' '}
                revealed:{' '}
                <span
                  className={`font-mono font-bold px-1.5 py-0.2 border ml-1 ${
                    me.policeInbox[me.policeInbox.length - 1].result === 'Mafia'
                      ? 'bg-red-950 text-red-300 border-red-500'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-500'
                  }`}
                >
                  {me.policeInbox[me.policeInbox.length - 1].result}
                </span>
              </span>
            </div>
          )}

          {/* ========================================================= */}
          {/* ROUND TABLE & CIRCULAR SEATING ARENA CONTAINER          */}
          {/* ========================================================= */}
          <div className="flex-1 w-full relative flex items-center justify-center my-auto min-h-0">
            
            {/* The Stylized 3D Mahogany Round Table at Center */}
            <div className="w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] lg:w-[420px] lg:h-[420px] rounded-full border-4 border-zinc-700 bg-gradient-to-b from-[#181a20] via-[#101217] to-[#0a0b0e] shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_0_80px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center relative select-none">
              
              {/* Inner Inlaid Wood Compass Ring */}
              <div className="w-[180px] h-[180px] sm:w-[240px] sm:h-[240px] lg:w-[270px] lg:h-[270px] rounded-full border border-zinc-800/80 bg-zinc-950/60 flex flex-col items-center justify-center shadow-inner relative">
                
                {/* Center Mafia Seal / Phase Announcements */}
                {phase === 'morning' ? (
                  <div className="text-center p-3 space-y-1 z-10 animate-in fade-in zoom-in duration-300">
                    <Sun className="w-6 h-6 text-amber-400 mx-auto animate-pulse" />
                    <div className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-bold">
                      DAWN IN THE CITY
                    </div>
                    <div className="text-xs font-semibold text-white line-clamp-3 max-w-[200px]">
                      {gameView.log.filter((l) => l.round === round && l.phase === 'morning').length > 0
                        ? gameView.log.filter((l) => l.round === round && l.phase === 'morning').slice(-1)[0].text
                        : 'Nobody was harmed tonight.'}
                    </div>
                  </div>
                ) : phase === 'voteResult' ? (
                  <div className="text-center p-3 space-y-1 z-10 animate-in fade-in zoom-in duration-300">
                    <Gavel className="w-6 h-6 text-red-500 mx-auto" />
                    <div className="text-[10px] font-mono tracking-widest text-red-400 uppercase font-bold">
                      TOWN VERDICT
                    </div>
                    <div className="text-xs font-semibold text-white line-clamp-3 max-w-[200px]">
                      {gameView.log.filter((l) => l.round === round && l.phase === 'voting').length > 0
                        ? gameView.log.filter((l) => l.round === round && l.phase === 'voting').slice(-1)[0].text
                        : 'The town votes have concluded.'}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-3 space-y-1">
                    <div className="text-[11px] font-mono tracking-widest text-zinc-500 uppercase">
                      SEATED ARENA
                    </div>
                    <div className="text-sm sm:text-base font-black tracking-wider text-white">
                      ROUND {round}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {livingPlayers.length} OF {players.length} SURVIVING
                    </div>
                  </div>
                )}

                {/* Subtle Ambient Light Glow on Table */}
                <div className="absolute inset-0 rounded-full bg-radial from-white/5 to-transparent pointer-events-none" />
              </div>
            </div>

            {/* ========================================================= */}
            {/* PLAYERS SITTING IN THE CIRCLE IN DETERMINISTIC ELLIPSE     */}
            {/* ========================================================= */}
            {players.map((player, idx) => {
              const seatPos = seatPositions[idx] || { x: 50, y: 50, leftPercent: 50, topPercent: 50 };
              const posX = seatPos.leftPercent;
              const posY = seatPos.topPercent;

              const isMe = player.id === me?.id;
              const isSelectedByMe = currentSelectionId === player.id;

              // Find if another mafia teammate has targeted this player
              const teammateWhoTargeted = Object.entries(teammatePicks).find(
                ([mId, targetId]) => targetId === player.id && mId !== me?.id
              );
              const teammatePlayer = teammateWhoTargeted
                ? players.find((p) => p.id === teammateWhoTargeted[0])
                : null;

              const isReady = readyToVoteList.includes(player.id);
              const playerVoteCount = voteCounts?.[player.id] || 0;
              const isSpeaking = Boolean(speakingPeers[player.id]);
              const playerReaction = gameView.reactions?.[player.id];
              const playerSuspicionCount = gameView.suspicionCounts?.[player.id] || 0;
              const isSuspectedByMe = gameView.suspicions?.[me?.id || ''] === player.id;

              return (
                <div
                  key={player.id}
                  style={{
                    left: `${posX}%`,
                    top: `${posY}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => handleSeatClick(player)}
                  className={`absolute flex flex-col items-center transition-all duration-300 z-20 ${
                    player.alive && (canActAtNight || canVoteAtDay || (phase === 'discussion' && !isMe))
                      ? 'cursor-pointer hover:scale-110'
                      : 'cursor-default'
                  }`}
                >
                  {/* Status Indicator Badges above Chair */}
                  <div className="flex flex-col items-center gap-0.5 mb-1 z-30 pointer-events-none">
                    {/* Detective Investigation Verdict Badge (Visible only to Police) */}
                    {role === 'police' && me?.policeInbox && (() => {
                      const inv = me.policeInbox.find((e) => e.targetId === player.id);
                      if (!inv) return null;
                      const isMafia = inv.result === 'Mafia';
                      return (
                        <div
                          className={`px-1.5 py-0.5 font-mono text-[9px] font-bold border flex items-center gap-1 shadow-md ${
                            isMafia
                              ? 'bg-red-950 text-red-300 border-red-500 animate-pulse'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-500'
                          }`}
                        >
                          <Search className="w-2.5 h-2.5" />
                          <span>{isMafia ? 'MAFIA' : 'NOT MAFIA'}</span>
                        </div>
                      );
                    })()}

                    {/* Targeted by Mafia Teammate Reticle Badge */}
                    {isObserverMafia && teammatePlayer && (
                      <div className="px-1.5 py-0.5 bg-red-600 text-white font-mono text-[9px] font-bold border border-red-400 flex items-center gap-1 shadow-md animate-bounce">
                        <Crosshair className="w-3 h-3 text-white" />
                        <span>{teammatePlayer.name}&apos;s Pick</span>
                      </div>
                    )}

                    {/* Selected by Observer Highlight Badge */}
                    {isSelectedByMe && (
                      <div className="px-1.5 py-0.5 bg-white text-black font-mono text-[9px] font-bold border border-zinc-300 shadow-md">
                        Your Target
                      </div>
                    )}

                    {/* Speaking Indicator Badge */}
                    {isSpeaking && (
                      <div className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-400 font-mono text-[9px] font-bold flex items-center gap-1 shadow-sm animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                        <span>Speaking</span>
                      </div>
                    )}

                    {/* Quick Reaction Emote Floating Badge */}
                    {playerReaction && (
                      <div className="px-2 py-0.5 bg-zinc-950 text-amber-300 border border-amber-400 font-mono text-[10px] font-bold shadow-xl animate-bounce">
                        {REACTION_GLYPHS[playerReaction.reaction as QuickReaction] || playerReaction.reaction}
                      </div>
                    )}

                    {/* Suspicion Markers */}
                    {playerSuspicionCount > 0 && (
                      <div className="px-1.5 py-0.2 bg-amber-950/90 text-amber-300 font-mono text-[9px] font-bold border border-amber-600 shadow-md">
                        ⚠️ {playerSuspicionCount} Suspect
                      </div>
                    )}
                    {isSuspectedByMe && (
                      <div className="px-1.5 py-0.2 bg-amber-500 text-black font-mono text-[9px] font-bold shadow-md">
                        You Suspect
                      </div>
                    )}

                    {/* Voting Ballot Count Badge */}
                    {phase === 'voting' && playerVoteCount > 0 && (
                      <div className="px-1.5 py-0.5 bg-amber-500 text-black font-bold text-[10px] shadow-md">
                        {playerVoteCount} {playerVoteCount === 1 ? 'vote' : 'votes'}
                      </div>
                    )}

                    {/* Discussion Ready Badge */}
                    {phase === 'discussion' && isReady && (
                      <div className="px-1.5 py-0.2 bg-emerald-500 text-black font-bold text-[9px] shadow-sm">
                        Ready ✓
                      </div>
                    )}

                    {/* Disconnected / Away Status Badge */}
                    {!player.connected && (
                      <div className="px-1 py-0.2 bg-zinc-900 text-zinc-400 font-mono text-[8px] font-bold border border-zinc-700">
                        Away
                      </div>
                    )}
                  </div>

                  {/* 3D / Semi-3D Seated Character Visual */}
                  <div className="relative flex flex-col items-center">
                    
                    {/* Selection Ring Glow on Floor */}
                    {isSelectedByMe && (
                      <div className="absolute -inset-3 rounded-full bg-white/20 border-2 border-white animate-pulse -z-10" />
                    )}

                    {/* Chair Backing (Semi-3D Noir Chair with Player Color Header) */}
                    <div
                      className={`relative w-14 h-16 sm:w-16 sm:h-18 border-2 flex flex-col items-center justify-between p-1.5 shadow-2xl transition-all ${
                        !player.alive
                          ? 'bg-zinc-950/80 border-zinc-800 opacity-60 rotate-6'
                          : isSelectedByMe
                          ? 'bg-surface border-white shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                          : isMe
                          ? 'bg-surface border-zinc-300'
                          : 'bg-surface-2 border-border hover:border-zinc-500'
                      }`}
                      style={{
                        borderTopColor: player.color || undefined,
                        borderTopWidth: player.color ? '3px' : undefined,
                      }}
                    >
                      {/* Chair Top Studs / Rail */}
                      <div className="w-full flex items-center justify-between px-1">
                        <span className="w-1 h-1 bg-zinc-600 inline-block" />
                        <span className="text-[9px] font-mono font-bold text-muted">
                          #{idx + 1}
                        </span>
                        <span className="w-1 h-1 bg-zinc-600 inline-block" />
                      </div>

                      {/* Seated Head (Selected Avatar with Full Colors & Voice Indicator) */}
                      <div className="relative my-0.5">
                        <Avatar
                          avatarId={player.avatar}
                          size={44}
                          className={`rounded-none ${
                            !player.alive ? 'grayscale opacity-40' : ''
                          }`}
                        />
                        
                        {/* Speaking Glow Ring on Avatar */}
                        {isSpeaking && (
                          <div className="absolute -inset-1 rounded-full border-2 border-emerald-400 animate-pulse pointer-events-none" />
                        )}

                        {/* Dead Skull Overlay */}
                        {!player.alive && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <Skull className="w-5 h-5 text-red-500" />
                          </div>
                        )}
                      </div>

                      {/* Seated Torso / Shadow Depth */}
                      <div className="w-full h-2.5 bg-black/60 border-t border-zinc-800 flex items-center justify-center">
                        <span className="w-8 h-1 bg-zinc-800 rounded-none inline-block" />
                      </div>
                    </div>
                  </div>

                  {/* Player Name Plaque with Unique Color Pip */}
                  <div
                    className={`mt-1 px-1.5 py-0.5 max-w-[85px] sm:max-w-[105px] text-center border truncate text-[11px] font-semibold transition-colors flex items-center justify-center ${
                      !player.alive
                        ? 'bg-black text-zinc-500 border-zinc-900 line-through'
                        : isMe
                        ? 'bg-white text-black border-white font-bold'
                        : 'bg-black/90 text-text border-border'
                    }`}
                    title={player.name}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block shrink-0 mr-1"
                      style={{ backgroundColor: player.color || '#a1a1aa' }}
                    />
                    <span className="truncate block">
                      {isMe ? `${player.name} (You)` : player.name}
                    </span>
                  </div>

                  {/* Host Crown Indicator */}
                  {player.isHost && (
                    <Crown className="w-3 h-3 text-amber-400 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Arena Bottom Auxiliary Control Toolbar */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between border-t border-border pt-3 z-10 gap-2 bg-surface/90">
            {/* Left: Quick Special Actions & Reactions */}
            <div className="flex flex-wrap items-center gap-2">
              {phase === 'voting' && me?.alive && !isGod && gameView.settings.allowSkipVote && (
                <Button
                  variant={currentSelectionId === 'skip' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setPendingSpecialAction('skip')}
                  kbd="S"
                >
                  <Ban className="w-3.5 h-3.5 mr-1" />
                  <span>Skip Vote</span>
                </Button>
              )}

              {phase === 'night' && me?.role === 'vigilante' && canActAtNight && (
                <Button
                  variant={currentSelectionId === 'hold' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setPendingSpecialAction('hold')}
                  kbd="X"
                >
                  <Shield className="w-3.5 h-3.5 mr-1" />
                  <span>Hold Fire</span>
                </Button>
              )}

              {phase === 'discussion' && me?.alive && !isGod && (
                <Button
                  variant={readyToVoteList.includes(me?.id || '') ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={onReadyToVote}
                  kbd="V"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  <span>{readyToVoteList.includes(me?.id || '') ? 'Ready ✓' : 'Ready to Vote'}</span>
                </Button>
              )}

              {/* Quick Reactions Bar for Living Players */}
              {me?.alive && !isGod && (phase === 'discussion' || phase === 'voting') && (
                <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                  {(['suspicious', 'agree', 'nope', 'same', 'trust', 'question'] as QuickReaction[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => onSendReaction?.(r)}
                      className="px-2 py-1 bg-surface-2 border border-border text-[11px] font-mono text-muted hover:text-white hover:border-zinc-400 transition-colors shrink-0"
                    >
                      {REACTION_GLYPHS[r]}
                    </button>
                  ))}
                  {gameView.suspicions && gameView.suspicions[me?.id || ''] && (
                    <button
                      type="button"
                      onClick={onClearSuspicion}
                      className="px-2 py-1 bg-amber-950/70 border border-amber-600 text-[11px] font-mono text-amber-300 hover:bg-amber-900 transition-colors shrink-0"
                    >
                      Clear Suspect
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: Quick Role Reference Chip */}
            <button
              type="button"
              onClick={() => onOpenHelp('my-role')}
              className="flex items-center gap-2 px-2.5 py-1 bg-surface-2 border border-border text-xs text-muted hover:text-white transition-colors"
            >
              <span>Role:</span>
              <strong className="text-white">{roleDef?.name || 'Observer'}</strong>
              <Kbd>I</Kbd>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: INTELLIGENCE, ROLE & EVENT LOG (3 cols)    */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 bg-surface border border-border p-4 md:p-6 flex flex-col justify-between h-[680px] lg:h-[820px] space-y-4 order-3">
          
          {/* Top: Your Identity Card */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">
                Your Secret Dossier
              </span>
              <span className="px-2 py-0.5 border border-border text-[11px] font-mono font-bold bg-surface-2 text-white uppercase">
                {roleDef?.team || 'CIVILIAN'}
              </span>
            </div>

            <div className="p-3 bg-surface-2 border border-border flex items-start gap-3">
              <Avatar avatarId={me?.avatar || 1} size={48} className="rounded-none shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">{me?.name}</div>
                <div className="text-xs font-semibold text-text mt-0.5">{roleDef?.name || 'Spectator'}</div>
                <div className="text-[11px] text-muted mt-1 leading-snug">
                  {roleDef?.summary || 'Observe the town proceedings and assist justice.'}
                </div>
              </div>
            </div>

            {/* Mafia Teammates Display */}
            {isObserverMafia && me?.teammates && me.teammates.length > 0 && (
              <div className="p-2.5 bg-red-950/30 border border-red-900/60 text-xs space-y-1">
                <div className="text-red-300 font-bold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span>Syndicate Partners:</span>
                </div>
                {me.teammates.map((tId) => {
                  const teammate = players.find((p) => p.id === tId);
                  const pickId = teammatePicks[tId];
                  const targetPlayer = pickId ? players.find((p) => p.id === pickId) : null;
                  return (
                    <div key={tId} className="flex items-center justify-between text-muted pt-0.5">
                      <span className="text-text font-medium">{teammate?.name}</span>
                      <span className="text-[10px] text-red-400 font-mono">
                        {targetPlayer ? `Targeting: ${targetPlayer.name}` : 'Deciding...'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Detective Confidential Dossier */}
            {role === 'police' && (
              <div className="p-2.5 bg-blue-950/25 border border-blue-900/60 text-xs space-y-2">
                <div className="text-blue-300 font-bold flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-blue-400" />
                    <span>Detective Dossier</span>
                  </div>
                  <span className="font-mono text-[10px] text-blue-400 bg-blue-950/60 px-1.5 py-0.2 border border-blue-800">
                    {me?.policeInbox?.length || 0} Records
                  </span>
                </div>

                {me?.policeInbox && me.policeInbox.length > 0 ? (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                    {me.policeInbox.map((entry, idx) => {
                      const target = players.find((p) => p.id === entry.targetId);
                      const isSuspect = entry.result === 'Mafia';
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-surface-2/90 border border-border text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-white truncate">{target?.name || 'Subject'}</div>
                            <div className="text-[10px] text-muted">Round {entry.round} Investigation</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 font-bold font-mono text-[10px] border shrink-0 ${
                              isSuspect
                                ? 'bg-red-950/80 border-red-500 text-red-300'
                                : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                            }`}
                          >
                            {entry.result}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-2 bg-surface-2/40 border border-border/60 text-[11px] text-muted text-center">
                    No suspects investigated yet. During your night turn, tap any seated player to uncover their allegiance.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Middle: Game Event Log Feed */}
          <div className="flex-1 min-h-0 flex flex-col space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-border">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">
                Event Wire
              </span>
              <span className="text-[11px] text-muted">{logList.length} records</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {logList.slice(-15).reverse().map((entry) => (
                <div
                  key={entry.id}
                  className={`p-2 border rounded-none ${
                    entry.type === 'death'
                      ? 'bg-red-950/20 border-red-900/40 text-red-200'
                      : entry.type === 'vote'
                      ? 'bg-surface-2 border-border text-zinc-300'
                      : 'bg-black/40 border-border text-muted'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-muted mb-0.5">
                    <span className="font-mono">Round {entry.round} · {entry.phase}</span>
                    <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="leading-relaxed">{entry.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Roster Quick Tally */}
          <div className="p-3 bg-surface-2 border border-border text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted">Living Suspects:</span>
              <span className="font-bold text-white font-mono">{livingPlayers.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Eliminated Players:</span>
              <span className="font-bold text-zinc-400 font-mono">
                {players.length - livingPlayers.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TARGET CONFIRMATION CUSTOM MODAL                         */}
      {/* ========================================================= */}
      <Modal
        isOpen={Boolean(pendingTarget || pendingSpecialAction)}
        onClose={() => {
          setPendingTarget(null);
          setPendingSpecialAction(null);
        }}
        title={
          phase === 'voting'
            ? 'Confirm Elimination Ballot'
            : phase === 'night'
            ? role === 'police'
              ? 'Confirm Detective Investigation'
              : role === 'doctor'
              ? 'Confirm Medical Protection'
              : 'Confirm Night Target'
            : 'Confirm Action'
        }
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-surface-2 border border-border flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-white shrink-0" />
            <div className="text-sm text-text leading-relaxed">
              {pendingSpecialAction === 'skip' ? (
                <span>Are you sure you want to <strong>skip voting</strong> today?</span>
              ) : pendingSpecialAction === 'hold' ? (
                <span>Are you sure you want to <strong>hold fire</strong> tonight?</span>
              ) : phase === 'voting' ? (
                <span>
                  Are you sure you want to cast your ballot to eliminate{' '}
                  <strong className="text-white underline font-bold">{pendingTarget?.name}</strong> today?
                </span>
              ) : role === 'police' ? (
                <span>
                  Are you sure you want to secretly investigate{' '}
                  <strong className="text-white underline font-bold">{pendingTarget?.name}</strong> to uncover their allegiance tonight?
                </span>
              ) : role === 'doctor' ? (
                <span>
                  Are you sure you want to protect{' '}
                  <strong className="text-white underline font-bold">{pendingTarget?.name}</strong> from harm tonight?
                </span>
              ) : (
                <span>
                  Are you sure you want to target{' '}
                  <strong className="text-white underline font-bold">{pendingTarget?.name}</strong> for tonight&apos;s action?
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setPendingTarget(null);
                setPendingSpecialAction(null);
              }}
              kbd="Esc"
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmAction} kbd="Enter">
              Confirm Action
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
