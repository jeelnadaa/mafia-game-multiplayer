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
  Radio,
  Flame,
  Sun,
  Gavel,
  Search,
  Trophy,
  Layers,
} from 'lucide-react';
import { ClientGameView, PlayerView, ChatChannel, QuickReaction } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { Avatar, Button, Modal, CenterTimer, Kbd, RubberStamp } from './ui';
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
  const [is3DView, setIs3DView] = useState(true);

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
    <div className="w-full flex-1 flex flex-col min-h-0 bg-transparent text-bone">
      {/* 3-Column Round Table Layout on Desktop, Stacks on Mobile */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-3 md:p-6 lg:p-8 max-w-[1920px] mx-auto w-full items-stretch">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: MULTI-CHANNEL CHAT WIRE (3 cols)           */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 bg-ink-900 border border-line flex flex-col h-[680px] lg:h-[820px] order-2 lg:order-1 shadow-md">
          {/* Channel Tabs */}
          <div className="flex items-center border-b border-line bg-ink-950 p-1.5 gap-1 text-xs font-mono">
            {/* Town Assembly Channel */}
            <button
              type="button"
              onClick={() => setActiveChannel('public')}
              disabled={isDead && !isGod}
              className={`flex-1 py-1.5 px-2 text-center font-semibold rounded-none transition-colors flex items-center justify-center gap-1.5 uppercase ${
                activeChannel === 'public'
                  ? 'bg-bone text-ink-950 font-bold'
                  : 'text-bone-dim hover:text-bone disabled:opacity-30'
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
                className={`flex-1 py-1.5 px-2 text-center font-semibold rounded-none transition-colors flex items-center justify-center gap-1.5 uppercase ${
                  activeChannel === 'dead'
                    ? 'bg-plum text-white font-bold'
                    : 'text-bone-dim hover:text-bone'
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
                className={`flex-1 py-1.5 px-2 text-center font-semibold rounded-none transition-colors flex items-center justify-center gap-1.5 uppercase ${
                  activeChannel === 'mafia'
                    ? 'bg-blood text-white font-bold'
                    : 'text-bone-dim hover:text-bone'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-red-200" />
                <span>Syndicate</span>
              </button>
            )}
          </div>

          {/* Active Channel Header Info */}
          <div className="px-4 py-2 border-b border-line bg-ink-950/80 flex items-center justify-between text-xs text-bone-dim font-mono">
            <span className="flex items-center gap-1.5 font-medium">
              {activeChannel === 'public' && 'Public Town Wire'}
              {activeChannel === 'dead' && 'Underworld Ghost Wire'}
              {activeChannel === 'mafia' && 'Encrypted Syndicate Wire'}
            </span>
            <span className="text-[10px]">{tabMessages.length} msgs</span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
            {tabMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-bone-dim/60 p-4 space-y-2 font-mono">
                <MessageSquare className="w-7 h-7 opacity-20" />
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
                      className="p-2 bg-ink-950 border border-line text-xs text-lamp font-mono flex items-start gap-2 shadow-sm"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-lamp shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[9px] text-bone-dim font-bold uppercase tracking-wider mb-0.5">
                          <span>SYSTEM TRANSMISSION</span>
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="leading-relaxed break-words text-bone font-medium">{msg.text}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`p-2 border ${
                      isMe
                        ? 'bg-lamp/10 border-lamp/40 ml-3'
                        : msg.channel === 'mafia'
                        ? 'bg-blood/10 border-blood/30 mr-3'
                        : msg.channel === 'dead'
                        ? 'bg-plum/15 border-plum/30 mr-3'
                        : 'bg-ink-950 border-line mr-3'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <Avatar avatarId={senderPlayer?.avatar || 1} size={16} />
                        <span className="font-bold text-bone text-xs">{msg.senderName}</span>
                      </div>
                      <span className="text-[9px] text-bone-dim font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-bone-dim leading-relaxed break-words">{msg.text}</p>
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
            <form onSubmit={handleSendChat} className="p-2.5 border-t border-line bg-ink-950 flex items-center gap-2">
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
                className="flex-1 bg-ink-900 border border-line px-3 py-1.5 text-xs text-bone placeholder:text-bone-dim/50 focus:outline-none focus:border-lamp font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-lamp text-ink-950 hover:bg-lamp-soft font-bold text-xs uppercase"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="p-2.5 border-t border-line bg-ink-950 text-center text-xs text-bone-dim font-mono">
              {activeChannel === 'public'
                ? 'Town public chat is disabled by room rules.'
                : activeChannel === 'mafia'
                ? 'Syndicate night chat is disabled by room rules.'
                : 'Graveyard chat is disabled by room rules.'}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* CENTER COLUMN: LIVING ROUND TABLE ARENA (6 cols)          */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 bg-ink-900 border border-line p-4 md:p-6 flex flex-col justify-between items-center h-[680px] lg:h-[820px] relative overflow-hidden order-1 lg:order-2 shadow-xl">
          
          {/* Subtle Chiaroscuro Overhead Lamp Glow */}
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-50"
            style={{
              background: phase === 'night'
                ? 'radial-gradient(circle 420px at 50% 50%, rgba(62, 90, 120, 0.18), transparent 75%)'
                : 'radial-gradient(circle 450px at 50% 50%, rgba(217, 164, 65, 0.16), transparent 75%)',
            }}
            aria-hidden="true"
          />

          {/* Arena Top Status Bar with Prominent Centered Timer */}
          <div className="w-full flex items-center justify-between border-b border-line pb-2.5 z-10 bg-ink-900/90 backdrop-blur-sm gap-2">
            {/* Left HUD Module: Round & Phase */}
            <div className="flex items-center gap-2 px-2.5 py-1 bg-ink-950 border border-line select-none font-mono">
              <span className="px-1.5 py-0.5 bg-bone text-ink-950 text-xs font-bold tracking-tight">
                R{round}
              </span>
              <span className="w-px h-3.5 bg-line" />
              <span className="text-xs font-bold text-bone uppercase tracking-wider flex items-center gap-1.5">
                {phase === 'discussion' && <MessageSquare className="w-3.5 h-3.5 text-bone-dim" />}
                {phase === 'voting' && <Gavel className="w-3.5 h-3.5 text-lamp" />}
                {phase === 'night' && <Clock className="w-3.5 h-3.5 text-blue-300" />}
                <span>{phase === 'night' ? `Night · ${nightSubPhase || 'Action'}` : phase}</span>
              </span>
            </div>

            {/* Center HUD Module: Prominent Countdown Timer */}
            <CenterTimer
              phaseEndsAt={gameView.phaseEndsAt}
              serverNow={gameView.serverNow}
              label={phase === 'night' ? 'Night Timer' : phase === 'voting' ? 'Ballot Timer' : 'Discussion Timer'}
              size="sm"
            />

            {/* Right HUD Module: Table Seating Roster & Perspective Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIs3DView((prev) => !prev)}
                className="px-2 py-1 bg-ink-950 border border-line text-[10px] font-mono text-bone-dim hover:text-bone hover:border-bone-dim flex items-center gap-1"
                title="Toggle 2.5D tilt perspective"
              >
                <Layers className="w-3 h-3" />
                <span>{is3DView ? '3D Table' : '2D View'}</span>
              </button>

              <div className="flex items-center gap-2 px-2.5 py-1 bg-ink-950 border border-line select-none font-mono text-xs">
                <Users className="w-3.5 h-3.5 text-lamp" />
                <span className="font-bold text-bone">{livingPlayers.length} Seated</span>
              </div>
            </div>
          </div>

          {/* Interactive Phase Guidance Banner */}
          <div className="w-full text-center py-1.5 px-3 bg-ink-950 border-y border-line text-xs font-mono z-10 my-1">
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
              <span className="text-bone-dim flex items-center justify-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                Night shadows envelop the room. Awaiting syndicate and specialist actions...
              </span>
            )}
            {phase === 'discussion' && (
              <span className="text-bone-dim flex items-center justify-center gap-2">
                Deliberate with fellow operatives. Press [V] or button below when ready to vote.
              </span>
            )}
            {phase === 'voting' && canVoteAtDay && (
              <span className="text-lamp font-semibold flex items-center justify-center gap-2">
                <Gavel className="w-4 h-4 text-lamp" />
                Tap a seated operative to cast your elimination ballot today.
              </span>
            )}
            {phase === 'voting' && !canVoteAtDay && (
              <span className="text-bone-dim">Town voting in progress...</span>
            )}
          </div>

          {/* Detective Intel Banner: Display latest investigation report for Police */}
          {role === 'police' && me?.policeInbox && me.policeInbox.length > 0 && (
            <div className="w-full text-center py-1.5 px-3 bg-night/20 border-b border-night/40 text-xs text-blue-200 flex items-center justify-center gap-2 z-10 font-mono">
              <Search className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>
                Detective Intelligence: Latest investigation on{' '}
                <strong className="text-bone">
                  {players.find((p) => p.id === me.policeInbox![me.policeInbox!.length - 1].targetId)?.name || 'Subject'}
                </strong>{' '}
                revealed:{' '}
                <span
                  className={`font-mono font-bold px-1.5 py-0.2 border ml-1 ${
                    me.policeInbox[me.policeInbox.length - 1].result === 'Mafia'
                      ? 'bg-blood/20 text-red-300 border-blood/60'
                      : 'bg-verdigris/20 text-emerald-300 border-verdigris/60'
                  }`}
                >
                  {me.policeInbox[me.policeInbox.length - 1].result}
                </span>
              </span>
            </div>
          )}

          {/* ========================================================= */}
          {/* THE LIVING ROUND TABLE & SEATING ARENA                    */}
          {/* ========================================================= */}
          <div
            className={`flex-1 w-full relative flex items-center justify-center my-auto min-h-0 transition-transform duration-500 ${
              is3DView ? '[perspective:1000px]' : ''
            }`}
          >
            {/* The Stylized Felt Round Table at Center */}
            <div
              className={`w-[290px] h-[290px] sm:w-[370px] sm:h-[370px] lg:w-[430px] lg:h-[430px] rounded-full border-4 border-[#2b2118] bg-gradient-to-b from-[#141b16] via-[#0e1410] to-[#070b08] shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_0_80px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center relative select-none transition-transform duration-500 ${
                is3DView ? '[transform:rotateX(22deg)]' : ''
              }`}
            >
              {/* Inner Inlaid Wood Compass Ring */}
              <div className="w-[190px] h-[190px] sm:w-[250px] sm:h-[250px] lg:w-[280px] lg:h-[280px] rounded-full border border-line/60 bg-ink-950/70 flex flex-col items-center justify-center shadow-inner relative">
                
                {/* Center Phase Announcements & Case Verdict */}
                {gameView.winner ? (
                  <div className="text-center p-3 space-y-1 z-10 animate-in fade-in zoom-in duration-300 font-mono">
                    <Trophy className="w-7 h-7 text-lamp mx-auto animate-bounce" />
                    <div className="text-[10px] tracking-widest text-lamp uppercase font-bold">
                      {gameView.winner === 'mafia'
                        ? 'MAFIA SYNDICATE WINS'
                        : gameView.winner === 'town'
                        ? 'TOWN PREVAILS'
                        : 'JESTER WINS'}
                    </div>
                    <div className="text-xs font-bold text-bone max-w-[210px]">
                      {gameView.winner === 'mafia'
                        ? 'Syndicate achieved parity over the town!'
                        : gameView.winner === 'town'
                        ? 'All mafia syndicate members eliminated!'
                        : 'The Jester tricked town into execution!'}
                    </div>
                  </div>
                ) : phase === 'morning' ? (
                  <div className="text-center p-3 space-y-1 z-10 animate-in fade-in zoom-in duration-300 font-mono">
                    <Sun className="w-6 h-6 text-lamp mx-auto animate-pulse" />
                    <div className="text-[10px] tracking-widest text-lamp uppercase font-bold">
                      DAWN IN THE CITY
                    </div>
                    <div className="text-xs font-semibold text-bone line-clamp-3 max-w-[200px]">
                      {gameView.log.filter((l) => l.round === round && l.phase === 'morning').length > 0
                        ? gameView.log.filter((l) => l.round === round && l.phase === 'morning').slice(-1)[0].text
                        : 'Nobody was harmed tonight.'}
                    </div>
                  </div>
                ) : phase === 'voteResult' ? (
                  <div className="text-center p-3 space-y-1 z-10 animate-in fade-in zoom-in duration-300 font-mono">
                    <Gavel className="w-6 h-6 text-blood mx-auto" />
                    <div className="text-[10px] tracking-widest text-red-400 uppercase font-bold">
                      TOWN VERDICT
                    </div>
                    <div className="text-xs font-semibold text-bone line-clamp-3 max-w-[200px]">
                      {gameView.log.filter((l) => l.round === round && l.phase === 'voting').length > 0
                        ? gameView.log.filter((l) => l.round === round && l.phase === 'voting').slice(-1)[0].text
                        : 'The town votes have concluded.'}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-3 space-y-1 font-mono">
                    <div className="text-[11px] tracking-widest text-bone-dim uppercase">
                      BRIEFING TABLE
                    </div>
                    <div className="text-sm sm:text-base font-black tracking-wider text-bone">
                      ROUND {round}
                    </div>
                    <div className="text-[10px] text-bone-dim/80">
                      {livingPlayers.length} OF {players.length} SURVIVING
                    </div>
                  </div>
                )}

                {/* Subtle Ambient Overhead Light Pool on Felt */}
                <div className="absolute inset-0 rounded-full bg-radial from-lamp/10 to-transparent pointer-events-none" />
              </div>
            </div>

            {/* ========================================================= */}
            {/* SEATED OPERATIVES AROUND TABLE PERIMETER                  */}
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
                              ? 'bg-blood/20 text-red-300 border-blood animate-pulse'
                              : 'bg-verdigris/20 text-emerald-300 border-verdigris'
                          }`}
                        >
                          <Search className="w-2.5 h-2.5" />
                          <span>{isMafia ? 'MAFIA' : 'NOT MAFIA'}</span>
                        </div>
                      );
                    })()}

                    {/* Targeted by Mafia Teammate Reticle Badge */}
                    {isObserverMafia && teammatePlayer && (
                      <div className="px-1.5 py-0.5 bg-blood text-white font-mono text-[9px] font-bold border border-blood flex items-center gap-1 shadow-md animate-bounce">
                        <Crosshair className="w-3 h-3 text-white" />
                        <span>{teammatePlayer.name}&apos;s Pick</span>
                      </div>
                    )}

                    {/* Selected by Observer Highlight Badge */}
                    {isSelectedByMe && (
                      <div className="px-1.5 py-0.5 bg-lamp text-ink-950 font-mono text-[9px] font-bold shadow-md">
                        Your Target
                      </div>
                    )}

                    {/* Speaking Indicator Badge */}
                    {isSpeaking && (
                      <div className="px-1.5 py-0.2 bg-lamp/15 text-lamp border border-lamp font-mono text-[9px] font-bold flex items-center gap-1 shadow-sm animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-lamp inline-block animate-ping" />
                        <span>Speaking</span>
                      </div>
                    )}

                    {/* Quick Reaction Emote Floating Badge */}
                    {playerReaction && (
                      <div className="px-2 py-0.5 bg-ink-950 text-lamp border border-lamp font-mono text-[10px] font-bold shadow-xl animate-bounce">
                        {REACTION_GLYPHS[playerReaction.reaction as QuickReaction] || playerReaction.reaction}
                      </div>
                    )}

                    {/* Suspicion Markers */}
                    {playerSuspicionCount > 0 && (
                      <div className="px-1.5 py-0.2 bg-lamp/10 text-lamp font-mono text-[9px] font-bold border border-lamp/40 shadow-md">
                        ⚠️ {playerSuspicionCount} Suspect
                      </div>
                    )}
                    {isSuspectedByMe && (
                      <div className="px-1.5 py-0.2 bg-lamp text-ink-950 font-mono text-[9px] font-bold shadow-md">
                        You Suspect
                      </div>
                    )}

                    {/* Voting Ballot Count Badge */}
                    {phase === 'voting' && playerVoteCount > 0 && (
                      <div className="px-1.5 py-0.5 bg-lamp text-ink-950 font-bold font-mono text-[10px] shadow-md">
                        {playerVoteCount} {playerVoteCount === 1 ? 'vote' : 'votes'}
                      </div>
                    )}

                    {/* Discussion Ready Badge */}
                    {phase === 'discussion' && isReady && (
                      <div className="px-1.5 py-0.2 bg-bone text-ink-950 font-bold font-mono text-[9px] shadow-sm">
                        Ready ✓
                      </div>
                    )}

                    {/* Disconnected / Away Status Badge */}
                    {!player.connected && (
                      <div className="px-1 py-0.2 bg-ink-950 text-bone-dim font-mono text-[8px] font-bold border border-line">
                        Away
                      </div>
                    )}
                  </div>

                  {/* Seated Operative Dossier Chair Visual */}
                  <div className="relative flex flex-col items-center">
                    
                    {/* Selection Ring Glow on Floor */}
                    {isSelectedByMe && (
                      <div className="absolute -inset-3 rounded-full bg-lamp/20 border-2 border-lamp animate-pulse -z-10" />
                    )}

                    {/* Chair Backing (Dossier Matte Finish with Player Color Border) */}
                    <div
                      className={`relative w-14 h-16 sm:w-16 sm:h-18 border-2 flex flex-col items-center justify-between p-1.5 shadow-2xl transition-all ${
                        !player.alive
                          ? 'bg-ink-950/90 border-line/60 opacity-60 rotate-6'
                          : isSelectedByMe
                          ? 'bg-ink-900 border-lamp shadow-[0_0_20px_rgba(217,164,65,0.4)]'
                          : isMe
                          ? 'bg-ink-900 border-bone'
                          : 'bg-ink-950 border-line hover:border-bone-dim'
                      }`}
                      style={{
                        borderTopColor: player.color || undefined,
                        borderTopWidth: player.color ? '3px' : undefined,
                      }}
                    >
                      {/* Chair Top Studs / Seat Number */}
                      <div className="w-full flex items-center justify-between px-1">
                        <span className="w-1 h-1 bg-bone-dim/40 inline-block" />
                        <span className="text-[9px] font-mono font-bold text-bone-dim">
                          #{idx + 1}
                        </span>
                        <span className="w-1 h-1 bg-bone-dim/40 inline-block" />
                      </div>

                      {/* Seated Head (Selected Avatar with Full Colors & Voice Indicator) */}
                      <div className="relative my-0.5">
                        <Avatar
                          avatarId={player.avatar}
                          size={44}
                          className={`rounded-none ${
                            !player.alive ? 'grayscale opacity-30' : ''
                          }`}
                        />
                        
                        {/* Speaking Glow Ring on Avatar */}
                        {isSpeaking && (
                          <div className="absolute -inset-1 rounded-full border-2 border-lamp animate-pulse pointer-events-none" />
                        )}

                        {/* Eliminated Stamp Overlay */}
                        {!player.alive && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <RubberStamp status="eliminated" className="text-[8px] px-1 py-0.5 rotate-[-12deg]" />
                          </div>
                        )}
                      </div>

                      {/* Seated Torso / Shadow Depth */}
                      <div className="w-full h-2 bg-ink-950 border-t border-line flex items-center justify-center">
                        <span className="w-8 h-0.5 bg-line inline-block" />
                      </div>
                    </div>
                  </div>

                  {/* Player Name Plaque with Unique Color Pip */}
                  <div
                    className={`mt-1 px-1.5 py-0.5 max-w-[85px] sm:max-w-[105px] text-center border truncate text-[11px] font-mono transition-colors flex items-center justify-center ${
                      !player.alive
                        ? 'bg-ink-950 text-bone-dim/50 border-line/40 line-through'
                        : isMe
                        ? 'bg-bone text-ink-950 border-bone font-bold'
                        : 'bg-ink-950 text-bone border-line'
                    }`}
                    title={player.name}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block shrink-0 mr-1"
                      style={{ backgroundColor: player.color || '#D9A441' }}
                    />
                    <span className="truncate block">
                      {isMe ? `${player.name} (You)` : player.name}
                    </span>
                  </div>

                  {/* Host Crown Indicator */}
                  {player.isHost && (
                    <Crown className="w-3 h-3 text-lamp mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Arena Bottom Auxiliary Control Toolbar */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between border-t border-line pt-3 z-10 gap-2 bg-ink-900/90 font-mono">
            {/* Left: Quick Special Actions & Reactions */}
            <div className="flex flex-wrap items-center gap-2">
              {phase === 'voting' && me?.alive && !isGod && gameView.settings.allowSkipVote && (
                <button
                  type="button"
                  onClick={() => setPendingSpecialAction('skip')}
                  className={`px-3 py-1 text-xs uppercase tracking-wider font-semibold border flex items-center gap-1.5 transition-colors ${
                    currentSelectionId === 'skip'
                      ? 'bg-lamp text-ink-950 border-lamp font-bold'
                      : 'bg-ink-950 text-bone border-line hover:border-bone-dim'
                  }`}
                >
                  <Ban className="w-3 h-3" />
                  <span>Skip Vote</span>
                  <Kbd className="border-line/60 bg-ink-900 text-bone-dim">S</Kbd>
                </button>
              )}

              {phase === 'night' && me?.role === 'vigilante' && canActAtNight && (
                <button
                  type="button"
                  onClick={() => setPendingSpecialAction('hold')}
                  className={`px-3 py-1 text-xs uppercase tracking-wider font-semibold border flex items-center gap-1.5 transition-colors ${
                    currentSelectionId === 'hold'
                      ? 'bg-lamp text-ink-950 border-lamp font-bold'
                      : 'bg-ink-950 text-bone border-line hover:border-bone-dim'
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  <span>Hold Fire</span>
                  <Kbd className="border-line/60 bg-ink-900 text-bone-dim">X</Kbd>
                </button>
              )}

              {phase === 'discussion' && me?.alive && !isGod && (
                <button
                  type="button"
                  onClick={onReadyToVote}
                  className={`px-3 py-1 text-xs uppercase tracking-wider font-semibold border flex items-center gap-1.5 transition-colors ${
                    readyToVoteList.includes(me?.id || '')
                      ? 'bg-bone text-ink-950 border-bone font-bold'
                      : 'bg-ink-950 text-bone border-line hover:border-bone-dim'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>{readyToVoteList.includes(me?.id || '') ? 'Ready ✓' : 'Ready to Vote'}</span>
                  <Kbd className="border-line/60 bg-ink-900 text-bone-dim">V</Kbd>
                </button>
              )}

              {/* Quick Reactions Bar for Living Players */}
              {me?.alive && !isGod && (phase === 'discussion' || phase === 'voting') && (
                <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                  {(['suspicious', 'agree', 'nope', 'same', 'trust', 'question'] as QuickReaction[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => onSendReaction?.(r)}
                      className="px-2 py-1 bg-ink-950 border border-line text-[11px] font-mono text-bone-dim hover:text-bone hover:border-lamp transition-colors shrink-0"
                    >
                      {REACTION_GLYPHS[r]}
                    </button>
                  ))}
                  {gameView.suspicions && gameView.suspicions[me?.id || ''] && (
                    <button
                      type="button"
                      onClick={onClearSuspicion}
                      className="px-2 py-1 bg-blood/20 border border-blood text-[11px] font-mono text-red-300 hover:bg-blood hover:text-white transition-colors shrink-0"
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
              className="flex items-center gap-2 px-2.5 py-1 bg-ink-950 border border-line text-xs text-bone-dim hover:text-bone transition-colors font-mono"
            >
              <span>Role:</span>
              <strong className="text-bone">{roleDef?.name || 'Observer'}</strong>
              <Kbd className="border-line/60 bg-ink-900 text-bone-dim">I</Kbd>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: INTELLIGENCE, ROLE & EVENT LOG (3 cols)    */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 bg-ink-900 border border-line p-4 md:p-6 flex flex-col justify-between h-[680px] lg:h-[820px] space-y-4 order-3 shadow-md font-mono">
          
          {/* Top: Your Identity Card */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-line text-xs">
              <span className="font-bold text-bone-dim uppercase tracking-wider">
                Your Secret Dossier
              </span>
              <span className="px-2 py-0.5 border border-line text-[10px] font-bold bg-ink-950 text-lamp uppercase">
                {roleDef?.team || 'CIVILIAN'}
              </span>
            </div>

            <div className="p-3 bg-ink-950 border border-line flex items-start gap-3">
              <Avatar avatarId={me?.avatar || 1} size={46} className="shrink-0 border border-line" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-bone truncate">{me?.name}</div>
                <div className="text-xs font-semibold text-lamp mt-0.5">{roleDef?.name || 'Spectator'}</div>
                <div className="text-[11px] text-bone-dim mt-1 leading-snug">
                  {roleDef?.summary || 'Observe the town proceedings and assist justice.'}
                </div>
              </div>
            </div>

            {/* Mafia Teammates Display */}
            {isObserverMafia && me?.teammates && me.teammates.length > 0 && (
              <div className="p-2.5 bg-blood/10 border border-blood/40 text-xs space-y-1">
                <div className="text-red-300 font-bold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span>Syndicate Partners:</span>
                </div>
                {me.teammates.map((tId) => {
                  const teammate = players.find((p) => p.id === tId);
                  const pickId = teammatePicks[tId];
                  const targetPlayer = pickId ? players.find((p) => p.id === pickId) : null;
                  return (
                    <div key={tId} className="flex items-center justify-between text-bone-dim pt-0.5 text-[11px]">
                      <span className="text-bone font-medium">{teammate?.name}</span>
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
              <div className="p-2.5 bg-night/20 border border-night/40 text-xs space-y-2">
                <div className="text-blue-300 font-bold flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-blue-400" />
                    <span>Detective Dossier</span>
                  </div>
                  <span className="font-mono text-[10px] text-blue-300 bg-ink-950 px-1.5 py-0.2 border border-night">
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
                          className="flex items-center justify-between p-2 bg-ink-950 border border-line text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-bone truncate">{target?.name || 'Subject'}</div>
                            <div className="text-[10px] text-bone-dim">Round {entry.round} Investigation</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 font-bold font-mono text-[10px] border shrink-0 ${
                              isSuspect
                                ? 'bg-blood/20 border-blood text-red-300'
                                : 'bg-verdigris/20 border-verdigris text-emerald-300'
                            }`}
                          >
                            {entry.result}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-2 bg-ink-950 border border-line text-[11px] text-bone-dim text-center">
                    No suspects investigated yet. During your night turn, tap any seated player to uncover their allegiance.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Middle: Game Event Wire Feed */}
          <div className="flex-1 min-h-0 flex flex-col space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-line text-xs">
              <span className="font-bold text-bone-dim uppercase tracking-wider">
                Event Wire
              </span>
              <span className="text-[10px] text-bone-dim">{logList.length} records</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {logList.slice(-15).reverse().map((entry) => (
                <div
                  key={entry.id}
                  className={`p-2 border leading-relaxed ${
                    entry.type === 'death'
                      ? 'bg-blood/10 border-blood/30 text-red-200'
                      : entry.type === 'vote'
                      ? 'bg-lamp/10 border-lamp/30 text-lamp'
                      : 'bg-ink-950 border-line text-bone-dim'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] text-bone-dim mb-0.5 font-mono">
                    <span>Round {entry.round} · {entry.phase}</span>
                    <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="leading-relaxed text-bone">{entry.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Roster Quick Tally */}
          <div className="p-2.5 bg-ink-950 border border-line text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-bone-dim">Living Suspects:</span>
              <span className="font-bold text-bone">{livingPlayers.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-bone-dim">Eliminated:</span>
              <span className="font-bold text-bone-dim/70">
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
            ? 'CONFIRM BALLOT'
            : phase === 'night'
            ? role === 'police'
              ? 'CONFIRM INVESTIGATION'
              : role === 'doctor'
              ? 'CONFIRM PROTECTION'
              : 'CONFIRM NIGHT TARGET'
            : 'CONFIRM ACTION'
        }
      >
        <div className="space-y-4 text-bone font-mono">
          <div className="p-3 bg-ink-950 border border-line flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-lamp shrink-0" />
            <div className="text-xs leading-relaxed">
              {pendingSpecialAction === 'skip' ? (
                <span>Are you sure you want to <strong>skip voting</strong> today?</span>
              ) : pendingSpecialAction === 'hold' ? (
                <span>Are you sure you want to <strong>hold fire</strong> tonight?</span>
              ) : phase === 'voting' ? (
                <span>
                  Cast your elimination ballot against{' '}
                  <strong className="text-lamp font-bold">{pendingTarget?.name}</strong> today?
                </span>
              ) : role === 'police' ? (
                <span>
                  Secretly investigate{' '}
                  <strong className="text-lamp font-bold">{pendingTarget?.name}</strong> to uncover their allegiance tonight?
                </span>
              ) : role === 'doctor' ? (
                <span>
                  Protect{' '}
                  <strong className="text-lamp font-bold">{pendingTarget?.name}</strong> from harm tonight?
                </span>
              ) : (
                <span>
                  Target{' '}
                  <strong className="text-lamp font-bold">{pendingTarget?.name}</strong> for tonight&apos;s action?
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setPendingTarget(null);
                setPendingSpecialAction(null);
              }}
              className="px-3 py-1.5 bg-ink-900 border border-line text-bone-dim hover:text-bone text-xs uppercase"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAction}
              className="px-4 py-1.5 bg-lamp text-ink-950 font-bold text-xs uppercase hover:bg-lamp-soft"
            >
              Confirm Action
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
