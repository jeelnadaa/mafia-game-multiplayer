'use client';

import React, { useState } from 'react';
import { Trophy, RotateCcw, LogOut, Skull, MessageSquare, Send, Eye, Award, Share2, ChevronDown, ChevronUp, FileText, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { ClientGameView } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { Button, Avatar, Modal, RubberStamp } from './ui';
import { clearRoomData } from '@/lib/storage';
import {
  recordMatchCompletion,
  computeMatchAwards,
  renderShareCardToBlob,
  getPlayerStats,
  getPlayerAchievements,
  resetPlayerStats,
} from '@/lib/stats';

interface EndProps {
  gameView: ClientGameView;
  isHost: boolean;
  onRematch: () => void;
  onLeave: () => void;
  onSendChat: (channel: 'dead', text: string) => void;
}

export function End({ gameView, isHost, onRematch, onLeave, onSendChat }: EndProps) {
  const [ghostChatInput, setGhostChatInput] = useState('');
  const [spectatorShowAll, setSpectatorShowAll] = useState(false);
  const [rematchConfirmOpen, setRematchConfirmOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const { winner, players, secretLog, phase, me, chat, settings } = gameView;
  const isDead = me && !me.alive && !me.isGod;
  const isGameOver = phase === 'gameOver' || Boolean(winner);

  const handleSendGhostChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghostChatInput.trim()) return;
    onSendChat('dead', ghostChatInput.trim());
    setGhostChatInput('');
  };

  const handleConfirmRematch = () => {
    setRematchConfirmOpen(false);
    onRematch();
  };

  const handleConfirmLeave = () => {
    setLeaveConfirmOpen(false);
    clearRoomData(gameView.code);
    onLeave();
  };

  // Automatically record local stats once when game concludes
  React.useEffect(() => {
    if (isGameOver && winner && me?.role) {
      const matchKey = `${gameView.code}_${gameView.round}_${winner}`;
      recordMatchCompletion(matchKey, winner, me.role, Boolean(me.alive));
    }
  }, [isGameOver, winner, me?.role, me?.alive, gameView.code, gameView.round]);

  const awards = React.useMemo(() => {
    return computeMatchAwards(players, gameView.log || [], secretLog, winner);
  }, [players, gameView.log, secretLog, winner]);

  const [isSharing, setIsSharing] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);

  const handleShareCard = async () => {
    setIsSharing(true);
    try {
      const blob = await renderShareCardToBlob(gameView, me?.name || 'Player', me?.role);
      if (!blob) return;

      const file = new File([blob], `mafia-dossier-${gameView.code}.png`, { type: 'image/png' });
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Mafia: Shadows of the City — Match Docket',
          text: `We just completed an operation in Mafia: Shadows of the City!`,
          files: [file],
        });
      } else {
        // Fallback: download the file
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mafia-dossier-${gameView.code}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (_) {} finally {
      setIsSharing(false);
    }
  };

  if (isGameOver) {
    const playerStats = getPlayerStats();
    const achievements = getPlayerAchievements();

    const myRole = me?.role;
    const isTownRole = myRole === 'doctor' || myRole === 'police' || myRole === 'vigilante' || myRole === 'civilian';
    const isMafiaRole = myRole === 'mafia' || myRole === 'godfather';
    const didIWin =
      (winner === 'town' && isTownRole) ||
      (winner === 'mafia' && isMafiaRole) ||
      (winner === 'jester' && myRole === 'jester');

    return (
      <div className="w-full max-w-[1650px] 2xl:max-w-[1850px] mx-auto p-3 sm:p-5 lg:p-8 space-y-6 select-none animate-in fade-in duration-700">
        {/* BEAT 1: Verdict Banner Lit in Winner's Color */}
        <div
          className={`relative overflow-hidden p-6 sm:p-10 border shadow-2xl text-center space-y-3 ${
            winner === 'mafia'
              ? 'bg-[#101216] border-[#7E2327]'
              : winner === 'town'
              ? 'bg-[#101216] border-[#5E8C7B]/60'
              : 'bg-[#101216] border-[#7A5C86]'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D9A441]/50 to-transparent" />
          
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-[10px] tracking-widest uppercase font-bold px-3 py-1 bg-[#171A20] border border-[#262A33] text-[#A39D90]">
              CASE #{gameView.code} · CASE CLOSED
            </span>
            <span
              className={`font-mono text-[10px] uppercase font-bold px-2.5 py-0.5 border ${
                didIWin
                  ? 'bg-[#16222F] text-[#86efac] border-[#5E8C7B]'
                  : 'bg-[#7E2327]/60 text-[#fca5a5] border-[#B3363B]'
              }`}
            >
              {didIWin ? '★ YOU WON' : 'DEFEATED'}
            </span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-[#ECE6D8]">
            {winner === 'town'
              ? 'Town Prevails!'
              : winner === 'mafia'
              ? 'Mafia Syndicate Wins!'
              : 'Jester Claims Victory!'}
          </h2>

          <p className="text-xs sm:text-sm font-mono text-[#A39D90] max-w-xl mx-auto leading-relaxed">
            {winner === 'town'
              ? 'All members of the covert syndicate have been purged from the city. Order restored.'
              : winner === 'mafia'
              ? 'The syndicate has achieved parity or majority over the townspeople. Darkness reigns.'
              : 'The Jester successfully deceived the town into a daytime execution, securing victory.'}
          </p>
        </div>

        {/* BEAT 2: Revealed Roster with Cards & Stamped Status */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Stage: True Identities Revealed (8 cols on Desktop) */}
          <div className="lg:col-span-8 bg-[#101216] border border-[#262A33] p-5 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#262A33]">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#ECE6D8] uppercase tracking-wider">
                  True Identities Revealed
                </h3>
                <span className="text-[11px] font-mono text-[#A39D90]">
                  Verified match attrition record · {players.length} operatives
                </span>
              </div>
              <RubberStamp variant="confidential" size="sm" text="DECLASSIFIED" />
            </div>

            {/* Roster Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {players.map((p, idx) => {
                const rDef = p.role ? ROLES[p.role] : null;
                const isSurvivor = p.alive;
                const playerAward = awards.find((a) => a.recipientName === p.name);

                return (
                  <div
                    key={p.id}
                    className="relative overflow-hidden p-4 bg-[#171A20] border border-[#262A33] flex flex-col justify-between space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 truncate">
                        <Avatar avatarId={p.avatar} size={40} className="border border-[#262A33] shrink-0" />
                        <div className="truncate">
                          <span className="font-serif font-bold text-sm text-[#ECE6D8] truncate block">
                            {p.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#A39D90]">
                            {isSurvivor ? 'Survived' : `Eliminated Round ${p.diedInRound || 1}`}
                          </span>
                        </div>
                      </div>

                      {/* Rubber stamp */}
                      <div className="shrink-0">
                        {isSurvivor ? (
                          <RubberStamp variant="saved" size="sm" text="SURVIVED" />
                        ) : (
                          <RubberStamp variant="eliminated" size="sm" text={`ELIMINATED · R${p.diedInRound || 1}`} />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#262A33]/60">
                      {rDef && (
                        <span className="px-2 py-0.5 text-xs font-serif font-bold border border-[#262A33] bg-[#0A0B0E] text-[#ECE6D8]">
                          {rDef.name}
                        </span>
                      )}
                      <span className="text-[10px] font-mono uppercase text-[#A39D90]">
                        Slot #{idx + 1}
                      </span>
                    </div>

                    {/* Stamped Citation Tag if player earned award */}
                    {playerAward && (
                      <div className="p-2 bg-[#0A0B0E] border-l-2 border-[#D9A441] border border-[#262A33] text-[10px] font-mono">
                        <div className="font-bold text-[#D9A441] flex items-center gap-1">
                          <span>★ {playerAward.title}</span>
                        </div>
                        <p className="text-[#A39D90] leading-tight line-clamp-2 mt-0.5">
                          {playerAward.description}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Official Citations & Awards List */}
            {awards.length > 0 && (
              <div className="pt-4 border-t border-[#262A33] space-y-2.5">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#D9A441]" />
                  <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#ECE6D8]">
                    Official Citations & Awards
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {awards.map((award) => (
                    <div
                      key={award.id}
                      className="p-3 bg-[#171A20] border border-[#262A33] flex items-center justify-between gap-3 text-xs font-mono"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-[#D9A441] flex items-center gap-1.5">
                          <span>★</span>
                          <span>{award.title}:</span>
                          <span className="text-[#ECE6D8] truncate">{award.recipientName}</span>
                        </div>
                        <p className="text-[11px] text-[#A39D90] leading-snug mt-0.5">
                          {award.description}
                        </p>
                      </div>
                      <Avatar avatarId={award.recipientAvatar} size={30} className="border border-[#262A33] shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Rail: Action Dock & Collapsible Case File Timeline (4 cols on Desktop) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Action Bar */}
            <div className="bg-[#101216] border border-[#262A33] p-5 sm:p-6 space-y-3.5 shadow-2xl">
              <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#ECE6D8] block pb-2 border-b border-[#262A33]">
                Post-Operation Directives
              </span>

              {isHost && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setRematchConfirmOpen(true)}
                  className="w-full font-serif font-black tracking-wider uppercase text-xs py-3 shadow-xl"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  <span>Play Again (Keep Room)</span>
                </Button>
              )}

              <Button
                variant="secondary"
                size="md"
                onClick={handleShareCard}
                disabled={isSharing}
                className="w-full font-serif text-xs font-bold uppercase tracking-wider"
              >
                <Share2 className="w-3.5 h-3.5 mr-2 text-[#D9A441]" />
                <span>{isSharing ? 'Generating Card...' : 'Share Match Docket (PNG)'}</span>
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={() => setStatsModalOpen(true)}
                className="w-full font-serif text-xs font-bold uppercase tracking-wider"
              >
                <span>Career Dossier & Stats</span>
              </Button>

              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLeaveConfirmOpen(true)}
                  className="w-full text-xs font-mono text-[#A39D90] hover:text-[#ECE6D8] hover:bg-transparent"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  <span>Leave Room</span>
                </Button>
              </div>
            </div>

            {/* Collapsible Timeline Case Ledger */}
            <div className="bg-[#101216] border border-[#262A33] p-5 shadow-2xl space-y-3">
              <button
                type="button"
                onClick={() => setShowTimeline(!showTimeline)}
                className="w-full flex items-center justify-between text-xs font-serif font-bold uppercase tracking-wider text-[#ECE6D8]"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#D9A441]" />
                  <span>Timeline Ledger</span>
                </div>
                {showTimeline ? <ChevronUp className="w-4 h-4 text-[#A39D90]" /> : <ChevronDown className="w-4 h-4 text-[#A39D90]" />}
              </button>
              <div className="text-[11px] font-mono text-[#A39D90]">Secrets audit & chronological findings</div>

              <AnimatePresence>
                {showTimeline && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 pt-2 overflow-hidden"
                  >
                    <div className="space-y-2.5 max-h-72 overflow-y-auto">
                      {secretLog && secretLog.length > 0 ? (
                        secretLog.map((entry, idx) => (
                          <div key={`secret-${entry.round}-${idx}`} className="p-3 bg-[#171A20] border border-[#262A33] space-y-1 text-xs font-mono">
                            <div className="font-bold text-[#D9A441]">
                              Round {entry.round} Secrets:
                            </div>
                            {entry.mafiaTarget && (
                              <div className="text-[#A39D90]">
                                <span className="text-[#ECE6D8] font-bold">Mafia Target: </span>
                                {players.find((p) => p.id === entry.mafiaTarget)?.name || 'None'}
                              </div>
                            )}
                            {entry.doctorSaves.length > 0 && (
                              <div className="text-[#A39D90]">
                                <span className="text-[#ECE6D8] font-bold">Doctor Saves: </span>
                                {entry.doctorSaves.map((id) => players.find((p) => p.id === id)?.name).join(', ')}
                              </div>
                            )}
                            {entry.policeInvestigations.length > 0 && (
                              <div className="text-[#A39D90]">
                                <span className="text-[#ECE6D8] font-bold">Police Dossier: </span>
                                {entry.policeInvestigations
                                  .map(
                                    (inv) =>
                                      `${players.find((p) => p.id === inv.targetId)?.name || 'Player'} (${inv.result})`
                                  )
                                  .join('; ')}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs font-mono text-[#A39D90] text-center py-4">
                          No secret timeline entries
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Rematch Confirmation Modal */}
        <Modal
          isOpen={rematchConfirmOpen}
          onClose={() => setRematchConfirmOpen(false)}
          title="Start Rematch"
        >
          <div className="space-y-4">
            <p className="text-xs sm:text-sm font-mono text-[#ECE6D8] leading-relaxed">
              Are you sure you want to begin a new match with the current players and settings?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setRematchConfirmOpen(false)} kbd="Esc">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirmRematch} kbd="Enter">
                Start Rematch
              </Button>
            </div>
          </div>
        </Modal>

        {/* Leave Room Confirmation Modal */}
        <Modal
          isOpen={leaveConfirmOpen}
          onClose={() => setLeaveConfirmOpen(false)}
          title="Leave Room"
        >
          <div className="space-y-4">
            <p className="text-xs sm:text-sm font-mono text-[#ECE6D8] leading-relaxed">
              Are you sure you want to exit to the main menu?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setLeaveConfirmOpen(false)} kbd="Esc">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirmLeave} kbd="Enter">
                Leave Room
              </Button>
            </div>
          </div>
        </Modal>

        {/* Career Dossier & Stats Modal */}
        <Modal
          isOpen={statsModalOpen}
          onClose={() => setStatsModalOpen(false)}
          title="Operative Career Dossier"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#171A20] border border-[#262A33] text-center">
                <span className="text-[10px] font-mono text-[#A39D90] uppercase block">Games</span>
                <span className="text-xl font-bold font-mono text-[#ECE6D8]">{playerStats.gamesPlayed}</span>
              </div>
              <div className="p-3 bg-[#171A20] border border-[#262A33] text-center">
                <span className="text-[10px] font-mono text-[#A39D90] uppercase block">Win Rate</span>
                <span className="text-xl font-bold font-mono text-[#5E8C7B]">
                  {playerStats.gamesPlayed > 0 ? Math.round((playerStats.wins / playerStats.gamesPlayed) * 100) : 0}%
                </span>
              </div>
              <div className="p-3 bg-[#171A20] border border-[#262A33] text-center">
                <span className="text-[10px] font-mono text-[#A39D90] uppercase block">Current Streak</span>
                <span className="text-xl font-bold font-mono text-[#ECE6D8]">{playerStats.currentStreak}</span>
              </div>
              <div className="p-3 bg-[#171A20] border border-[#262A33] text-center">
                <span className="text-[10px] font-mono text-[#A39D90] uppercase block">Best Streak</span>
                <span className="text-xl font-bold font-mono text-[#D9A441]">{playerStats.bestStreak}</span>
              </div>
            </div>

            {/* Achievements List */}
            <div className="space-y-2">
              <span className="text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider">Decorations & Achievements</span>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className={`p-2.5 border text-xs font-mono flex items-center justify-between ${
                      ach.unlocked ? 'bg-[#171A20] border-[#D9A441]/60 text-[#ECE6D8]' : 'bg-[#101216] border-[#262A33] text-[#A39D90] opacity-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5 font-serif">
                        <span className="text-[#D9A441]">{ach.unlocked ? '★' : '☆'}</span>
                        <span>{ach.title}</span>
                      </div>
                      <p className="text-[10px] text-[#A39D90] mt-0.5">{ach.description}</p>
                    </div>
                    {ach.unlocked && <span className="text-[10px] font-mono text-[#5E8C7B] font-bold">UNLOCKED</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#262A33]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Reset your local player career stats?')) {
                    resetPlayerStats();
                    window.location.reload();
                  }
                }}
                className="text-xs font-mono text-[#B3363B] hover:text-[#fca5a5]"
              >
                Reset Stats
              </Button>
              <Button variant="secondary" onClick={() => setStatsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  /* Mid-Game Graveyard Lounge for Eliminated Dead Players */
  if (isDead) {
    return (
      <div className="w-full max-w-[1650px] 2xl:max-w-[1850px] mx-auto p-4 md:p-8 lg:p-10 space-y-6 select-none">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-5 bg-[#101216] border border-[#262A33] p-6 space-y-4 flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="w-14 h-14 border border-[#262A33] bg-[#171A20] flex items-center justify-center text-[#B3363B] shadow-inner">
                <Skull className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-mono text-[#A39D90]">Observer Status</span>
                <h2 className="text-xl md:text-2xl font-serif font-black text-[#ECE6D8] mt-1">
                  The Graveyard Lounge
                </h2>
              </div>
              <p className="text-xs sm:text-sm font-mono text-[#A39D90] leading-relaxed">
                You have been eliminated from active play. You may observe ongoing operations from the spectral gallery.
              </p>

              {settings.deadSeeRoles && (
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setSpectatorShowAll(!spectatorShowAll)}
                    className="w-full font-serif font-bold text-xs uppercase tracking-wider"
                  >
                    <Eye className="w-4 h-4 mr-2 text-[#D9A441]" />
                    <span>{spectatorShowAll ? 'Hide All True Roles' : 'Peek All True Roles'}</span>
                  </Button>
                </div>
              )}
            </div>

            {spectatorShowAll && settings.deadSeeRoles && (
              <div className="p-3.5 bg-[#171A20] border border-[#262A33] space-y-2.5 text-xs font-mono">
                <div className="text-xs font-serif font-bold text-[#ECE6D8]">All Roles Revealed:</div>
                <div className="grid grid-cols-2 gap-2">
                  {players.map((p) => (
                    <div key={p.id} className="p-2 bg-[#0A0B0E] border border-[#262A33] flex items-center justify-between">
                      <span className="truncate text-[#ECE6D8] font-serif font-bold">{p.name}</span>
                      <span className="text-[10px] font-mono font-bold text-[#D9A441] ml-1">
                        {p.role || 'Civilian'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-[#101216] border border-[#262A33] p-6 flex flex-col h-[480px] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#262A33]">
              <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider">
                <MessageSquare className="w-4 h-4 text-[#A39D90]" />
                <span>Graveyard Spirits Chat</span>
              </div>
              <span className="text-[11px] font-mono text-[#A39D90]">Spectators</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs font-mono">
              {chat
                .filter((m) => m.channel === 'dead')
                .map((m) => (
                  <div key={m.id} className="leading-relaxed">
                    <span className="font-bold text-[#A39D90] mr-1.5">[{m.senderName}]:</span>
                    <span className="text-[#ECE6D8]">{m.text}</span>
                  </div>
                ))}
            </div>

            {settings.deadChat ? (
              <form onSubmit={handleSendGhostChat} className="flex gap-2.5 pt-3 border-t border-[#262A33]">
                <input
                  type="text"
                  value={ghostChatInput}
                  onChange={(e) => setGhostChatInput(e.target.value)}
                  placeholder="Whisper among the dead..."
                  maxLength={300}
                  className="flex-1 bg-[#171A20] border border-[#262A33] px-3.5 py-2 text-xs font-mono text-[#ECE6D8] placeholder-[#A39D90]/50 focus:outline-none focus:border-[#D9A441]"
                />
                <Button type="submit" variant="primary" size="md">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            ) : (
              <div className="p-3 border-t border-[#262A33] bg-[#171A20] text-xs font-mono text-[#A39D90] text-center">
                Graveyard spirits chat is disabled by room rules.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

