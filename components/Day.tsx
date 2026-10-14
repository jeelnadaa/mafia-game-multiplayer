'use client';

import React, { useState } from 'react';
import { Sun, MessageSquare, Gavel, CheckCircle, Send, Users, Search, AlertCircle, FileText } from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { TargetPicker } from './TargetPicker';
import { Button, Avatar, Kbd, Modal, CenterTimer, RubberStamp } from './ui';
import { useShortcut } from '@/lib/shortcuts';

interface DayProps {
  gameView: ClientGameView;
  onVote: (targetId: string | 'skip') => void;
  onReadyToVote: () => void;
  onSendChat: (channel: 'public' | 'dead', text: string) => void;
}

export function Day({ gameView, onVote, onReadyToVote, onSendChat }: DayProps) {
  const [chatInput, setChatInput] = useState('');
  const [readyConfirmOpen, setReadyConfirmOpen] = useState(false);
  const [pendingVoteId, setPendingVoteId] = useState<string | null>(null);

  const { phase, round, me, players, readyToVote, voteCounts, log } = gameView;
  const isDead = me ? !me.alive : false;

  // 'V' shortcut toggles ready to vote
  useShortcut(
    ['v', 'V'],
    () => {
      if (phase === 'discussion' && !readyConfirmOpen) {
        if (!me?.readyToVote) {
          setReadyConfirmOpen(true);
        } else {
          onReadyToVote();
        }
      }
    },
    { scope: 'screen', enabled: phase === 'discussion' }
  );

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const channel = isDead ? 'dead' : 'public';
    onSendChat(channel, chatInput.trim());
    setChatInput('');
  };

  const handleReadyClick = () => {
    if (!me?.readyToVote) {
      setReadyConfirmOpen(true);
    } else {
      onReadyToVote();
    }
  };

  const handleConfirmReady = () => {
    setReadyConfirmOpen(false);
    onReadyToVote();
  };

  // Latest morning news announcement from logs
  const morningLog = log.filter((l) => l.round === round && l.phase === 'morning');
  const voteLog = log.filter((l) => l.round === round && l.phase === 'voting');

  return (
    <div className="w-full max-w-[1650px] 2xl:max-w-[1850px] mx-auto p-3 sm:p-5 lg:p-8 space-y-6 select-none">
      {/* Morning Incident Report Announcement Banner */}
      {phase === 'morning' && (
        <div className="relative overflow-hidden bg-[#101216] border border-[#262A33] p-6 sm:p-10 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded border border-[#D9A441]/40 bg-[#171A20] flex items-center justify-center text-[#D9A441] mx-auto shadow-inner">
            <Sun className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-1">
            <span className="font-mono text-[10px] tracking-widest text-[#D9A441] uppercase font-bold px-2.5 py-0.5 bg-[#171A20] border border-[#D9A441]/40">
              GAZETTE BULLETIN · CASE #{gameView.code}
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-black text-[#ECE6D8] tracking-tight pt-1">
              Dawn in the City · Round {round}
            </h2>
            <div className="text-xs sm:text-sm text-[#A39D90] font-mono">Official morning incident log</div>
          </div>
          <div className="space-y-2.5 max-w-xl mx-auto pt-2">
            {morningLog.length === 0 ? (
              <p className="text-sm sm:text-base font-serif text-[#A39D90] italic">
                The night passed in complete silence. No casualties recorded.
              </p>
            ) : (
              morningLog.map((l) => (
                <div key={l.id} className="p-3.5 bg-[#171A20] border border-[#262A33] text-xs sm:text-sm font-mono text-[#ECE6D8]">
                  {l.text}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Discussion Phase */}
      {phase === 'discussion' && (
        <div className="space-y-6">
          {/* Discussion Header with Center Timer */}
          <div className="relative overflow-hidden bg-[#101216] border border-[#262A33] p-5 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-5 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D9A441]/50 to-transparent" />
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded border border-[#D9A441]/40 bg-[#171A20] flex items-center justify-center text-[#D9A441] shadow-inner">
                <Sun className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[10px] tracking-widest text-[#D9A441] uppercase font-bold px-2 py-0.5 bg-[#171A20] border border-[#D9A441]/40">
                    CASE #{gameView.code} · PRECINCT ASSEMBLY
                  </span>
                  <h2 className="text-xl md:text-2xl font-serif font-black text-[#ECE6D8] tracking-tight">
                    Day Discussion · Round {round}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#A39D90] font-mono mt-1">
                  Debate claims, share evidence, and decide who faces the town vote.
                </p>
              </div>
            </div>

            {/* Center Countdown Timer */}
            <div className="flex items-center justify-center">
              <CenterTimer
                phaseEndsAt={gameView.phaseEndsAt}
                serverNow={gameView.serverNow}
                label="Discussion Closes In"
                size="sm"
              />
            </div>

            <Button
              variant={me?.readyToVote ? 'secondary' : 'primary'}
              size="lg"
              onClick={handleReadyClick}
              kbd="V"
              className="font-serif font-bold text-xs uppercase tracking-wider px-6"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              <span>{me?.readyToVote ? 'Waiting for others' : 'Ready to Vote'}</span>
              <span className="text-xs opacity-75 ml-1">
                ({readyToVote.length}/{players.filter((p) => p.alive && !p.isGod).length})
              </span>
            </Button>
          </div>

          {/* Two-Column Deliberation Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Living Suspects Column (4 cols on Desktop) */}
            <div className="lg:col-span-4 bg-[#101216] border border-[#262A33] p-5 sm:p-6 space-y-4 flex flex-col justify-between shadow-2xl">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-[#262A33]">
                  <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider">
                    <Users className="w-4 h-4 text-[#D9A441]" />
                    <span>Living Suspects</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#A39D90]">
                    {players.filter((p) => p.alive && !p.isGod).length} remaining
                  </span>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto">
                  {players
                    .filter((p) => p.alive && !p.isGod)
                    .map((p) => {
                      const inv = me?.role === 'police' ? me?.policeInbox?.find((e) => e.targetId === p.id) : null;
                      const isMaf = inv && inv.result.toLowerCase().includes('mafia');
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 bg-[#171A20] border border-[#262A33] text-xs font-mono"
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className="relative">
                              <Avatar avatarId={p.avatar} size={36} className="border border-[#262A33]" />
                              <div
                                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0A0B0E]"
                                style={{ backgroundColor: p.color || '#D9A441' }}
                              />
                            </div>
                            <div className="truncate">
                              <span className="text-[#ECE6D8] font-serif font-bold truncate block">{p.name}</span>
                              {inv && (
                                <span
                                  className={`inline-block font-mono font-bold text-[9px] px-1.5 py-0.2 border mt-0.5 ${
                                    isMaf
                                      ? 'bg-[#7E2327]/80 text-[#fca5a5] border-[#B3363B]'
                                      : 'bg-[#16222F] text-[#86efac] border-[#5E8C7B]'
                                  }`}
                                >
                                  🕵️ {inv.result}
                                </span>
                              )}
                            </div>
                          </div>
                          {readyToVote.includes(p.id) ? (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#D9A441] text-[#0A0B0E] uppercase tracking-wider">
                              Ready ✓
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-[#A39D90]">
                              Thinking
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Detective Investigation Dossier for Police */}
                {me?.role === 'police' && (
                  <div className="pt-4 border-t border-[#262A33] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#93c5fd] uppercase tracking-wider">
                        <Search className="w-3.5 h-3.5 text-[#93c5fd]" />
                        <span>Detective Dossier</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#A39D90]">{me.policeInbox?.length || 0} Records</span>
                    </div>

                    {me.policeInbox && me.policeInbox.length > 0 ? (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {me.policeInbox.map((entry, idx) => {
                          const target = players.find((p) => p.id === entry.targetId);
                          const resLower = entry.result.toLowerCase();
                          const isNotMafia = resLower.includes('not');
                          const isSuspect = !isNotMafia && (resLower.includes('mafia') || resLower.includes('godfather'));
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2.5 bg-[#0A0B0E] border border-[#262A33] text-xs font-mono"
                            >
                              <div className="truncate pr-2">
                                <span className="font-serif font-bold text-[#ECE6D8] truncate block">{target?.name || 'Subject'}</span>
                                <span className="text-[10px] text-[#A39D90]">Round {entry.round} Investigation</span>
                              </div>
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-bold font-mono text-[11px] uppercase tracking-wider rounded-[2px] border shrink-0 ${
                                  isSuspect
                                    ? 'bg-[#1C0D0E] border-[#B3363B] text-[#FF8585] shadow-[0_0_8px_rgba(179,54,59,0.35)]'
                                    : 'bg-[#0A1814] border-[#5E8C7B] text-[#7CE4B5] shadow-[0_0_8px_rgba(94,140,123,0.35)]'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isSuspect ? 'bg-[#FF8585]' : 'bg-[#7CE4B5]'}`} />
                                <span>{isSuspect ? 'MAFIA' : 'NOT MAFIA'}</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 bg-[#0A0B0E] border border-[#262A33] text-[11px] font-mono text-[#A39D90] text-center">
                        No subjects investigated yet.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#262A33] text-[11px] font-mono text-[#A39D90] text-center">
                Press [V] to toggle ready status
              </div>
            </div>

            {/* Public Town Assembly Chat (8 cols on Desktop) */}
            <div className="lg:col-span-8 bg-[#101216] border border-[#262A33] p-5 sm:p-6 flex flex-col h-[520px] shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#262A33]">
                <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4 text-[#D9A441]" />
                  <span>Town Assembly Chat (Public)</span>
                </div>
                <span className="text-[11px] font-mono text-[#A39D90]">All living players</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs font-mono">
                {gameView.chat
                  .filter((m) => m.channel === 'public')
                  .map((m) =>
                    m.senderId === 'system' ? (
                      <div
                        key={m.id}
                        className="p-3 bg-[#171A20] border-l-2 border-l-[#D9A441] border border-[#262A33] text-xs font-mono flex items-start gap-2 shadow-sm"
                      >
                        <span className="font-bold text-[#D9A441] shrink-0">[SYSTEM]:</span>
                        <span className="leading-relaxed text-[#ECE6D8]">{m.text}</span>
                      </div>
                    ) : (
                      <div key={m.id} className="leading-relaxed">
                        <span className="font-bold font-serif text-[#D9A441] mr-2">[{m.senderName}]:</span>
                        <span className="text-[#ECE6D8]">{m.text}</span>
                      </div>
                    )
                  )}
                {gameView.chat.filter((m) => m.channel === 'public').length === 0 && (
                  <div className="text-[#A39D90] font-mono text-center pt-36">
                    The town hall is quiet. Present claims or defenses to begin discussion.
                  </div>
                )}
              </div>

              {gameView.settings.dayChat ? (
                <form onSubmit={handleSendChat} className="flex gap-2.5 pt-3 border-t border-[#262A33]">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Share accusations, defenses, deductions..."
                    maxLength={300}
                    className="flex-1 bg-[#171A20] border border-[#262A33] px-4 py-2 text-xs font-mono text-[#ECE6D8] placeholder-[#A39D90]/50 focus:outline-none focus:border-[#D9A441]"
                  />
                  <Button type="submit" variant="primary" size="md" className="px-5 font-serif font-bold uppercase text-xs">
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    <span>Send</span>
                  </Button>
                </form>
              ) : (
                <div className="p-3 border-t border-[#262A33] bg-[#171A20] text-xs font-mono text-[#A39D90] text-center">
                  Town public chat is disabled by room rules.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voting Phase */}
      {phase === 'voting' && (
        <div className="space-y-6">
          <div className="relative overflow-hidden bg-[#101216] border border-[#262A33] p-5 sm:p-7 text-center space-y-3 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#B3363B]/60 to-transparent" />
            
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#ECE6D8] flex items-center justify-center gap-3 tracking-tight">
              <Gavel className="w-7 h-7 text-[#D9A441]" />
              <span>Town Vote</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#A39D90] font-mono">
              Cast your ballot to eliminate one Prime Suspect, or choose to Skip.
            </p>

            {/* Countdown Timer */}
            <div className="pt-2 flex justify-center">
              <CenterTimer
                phaseEndsAt={gameView.phaseEndsAt}
                serverNow={gameView.serverNow}
                label="Voting Closes In"
                size="lg"
              />
            </div>
          </div>

          {/* Two-Column Voting Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Target Picker (7 cols on Desktop) */}
            <div className="lg:col-span-7 bg-[#101216] border border-[#262A33] p-5 sm:p-6 space-y-4 shadow-2xl">
              <div className="text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider pb-2.5 border-b border-[#262A33] flex items-center justify-between">
                <span>Select Prime Suspect:</span>
                <span className="font-mono text-[10px] text-[#A39D90] font-normal">
                  {gameView.settings.voteVisibility === 'public' ? 'Public Ballots' : 'Anonymous Secret Ballots'}
                </span>
              </div>
              <TargetPicker
                players={players}
                myPlayerId={me?.id || ''}
                selectedId={pendingVoteId || me?.vote || null}
                onSelect={(targetId) => setPendingVoteId(targetId as any)}
                mode="voting"
                allowSkip={gameView.settings.allowSkipVote}
                investigations={me?.policeInbox}
              />

              {pendingVoteId && pendingVoteId !== me?.vote && (
                <div className="p-3 bg-[#171A20] border border-[#D9A441] rounded flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="text-xs font-mono text-[#ECE6D8]">
                    Selected Candidate: <strong className="text-[#D9A441]">{pendingVoteId === 'skip' ? 'Abstain / Skip Vote' : players.find((p) => p.id === pendingVoteId)?.name}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setPendingVoteId(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        onVote(pendingVoteId as any);
                        setPendingVoteId(null);
                      }}
                      className="font-bold uppercase tracking-wider"
                    >
                      Confirm Vote
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Vote Tally & Assembly Chat (5 cols on Desktop) */}
            <div className="lg:col-span-5 bg-[#101216] border border-[#262A33] p-5 sm:p-6 space-y-5 flex flex-col justify-between shadow-2xl">
              {/* Live Vote Tally Bars */}
              <div className="space-y-3">
                <div className="text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider pb-2.5 border-b border-[#262A33] flex items-center justify-between">
                  <span>Current Vote Tally:</span>
                  <span className="text-[10px] text-[#A39D90] font-mono">
                    {gameView.settings.voteVisibility === 'public' ? 'Voters Public' : 'Ballots Anonymous'}
                  </span>
                </div>
                {voteCounts && Object.keys(voteCounts).length > 0 ? (
                  <div className="space-y-3 max-h-56 overflow-y-auto">
                    {Object.entries(voteCounts).map(([targetId, count]) => {
                      const isSkip = targetId === 'skip';
                      const targetName = isSkip
                        ? 'Skip Vote'
                        : players.find((p) => p.id === targetId)?.name || 'Unknown';

                      const voters = gameView.settings.voteVisibility === 'public'
                        ? players.filter((p) => p.voteTarget === targetId).map((p) => p.name)
                        : [];

                      return (
                        <div key={targetId} className="space-y-1">
                          <div className="flex items-center gap-3 text-xs font-mono">
                            <span className="w-32 truncate font-serif font-bold text-[#ECE6D8]">
                              {targetName}
                            </span>
                            <div className="flex-1 h-3 bg-[#0A0B0E] border border-[#262A33] overflow-hidden">
                              <div
                                style={{ width: `${(count / Math.max(1, players.filter((p) => p.alive && !p.isGod).length)) * 100}%` }}
                                className="h-full bg-[#D9A441]"
                              />
                            </div>
                            <span className="w-8 text-right font-mono font-bold text-[#D9A441]">[{count}]</span>
                          </div>

                          {gameView.settings.voteVisibility === 'public' && voters.length > 0 && (
                            <div className="text-[10px] text-[#A39D90] font-mono truncate pl-1">
                              Voted by: <span className="text-[#ECE6D8]">{voters.join(', ')}</span>
                            </div>
                          )}
                          {gameView.settings.voteVisibility === 'anonymous' && (
                            <div className="text-[10px] text-[#A39D90]/70 font-mono italic pl-1">
                              Secret vote
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs font-mono text-[#A39D90] text-center py-6">
                    No ballots cast yet
                  </div>
                )}
              </div>

              {/* Chat inside Voting */}
              <div className="pt-4 border-t border-[#262A33] flex flex-col h-[280px]">
                <div className="flex items-center justify-between pb-2.5">
                  <span className="text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider">
                    {isDead ? 'Graveyard Spirits (Dead Chat)' : 'Town Assembly Chat (Public)'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#0A0B0E] border border-[#262A33] p-3 space-y-2 text-xs font-mono">
                  {gameView.chat
                    .filter((m) => (isDead ? m.channel === 'dead' : m.channel === 'public'))
                    .map((m) => (
                      <div key={m.id} className="leading-relaxed">
                        <span className="font-bold text-[#D9A441] mr-1.5">[{m.senderName}]:</span>
                        <span className="text-[#ECE6D8]">{m.text}</span>
                      </div>
                    ))}
                </div>

                {(isDead ? gameView.settings.deadChat : gameView.settings.dayChat) ? (
                  <form onSubmit={handleSendChat} className="flex gap-2 pt-2.5">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Discuss vote rationale..."
                      maxLength={300}
                      className="flex-1 bg-[#171A20] border border-[#262A33] px-3 py-1.5 text-xs font-mono text-[#ECE6D8] placeholder-[#A39D90]/50 focus:outline-none focus:border-[#D9A441]"
                    />
                    <Button type="submit" variant="primary" size="sm">
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </form>
                ) : (
                  <div className="p-2 border-t border-[#262A33] bg-[#171A20] text-xs font-mono text-[#A39D90] text-center">
                    {isDead ? 'Graveyard chat is disabled by room rules.' : 'Town public chat is disabled by room rules.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vote Result Phase */}
      {phase === 'voteResult' && (
        <div className="relative overflow-hidden bg-[#101216] border border-[#262A33] p-8 sm:p-14 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded border border-[#D9A441]/40 bg-[#171A20] flex items-center justify-center text-[#D9A441] mx-auto shadow-inner">
            <Gavel className="w-9 h-9" />
          </div>
          <div className="space-y-1">
            <span className="font-mono text-[10px] tracking-widest text-[#D9A441] uppercase font-bold px-2.5 py-0.5 bg-[#171A20] border border-[#D9A441]/40">
              OFFICIAL COURT RECORD
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-black text-[#ECE6D8] tracking-tight pt-1">
              Town Verdict
            </h2>
          </div>
          <div className="max-w-md mx-auto space-y-2 pt-2">
            {voteLog.map((l) => (
              <div key={l.id} className="p-3.5 bg-[#171A20] border border-[#262A33] text-xs sm:text-sm font-mono text-[#ECE6D8]">
                {l.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ready to Vote Confirmation Modal */}
      <Modal
        isOpen={readyConfirmOpen}
        onClose={() => setReadyConfirmOpen(false)}
        title="Ready to Vote"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm font-mono text-[#ECE6D8] leading-relaxed">
            Are you ready to end discussion and cast your official vote now?
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setReadyConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmReady}>
              I am Ready
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

