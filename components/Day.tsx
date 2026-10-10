'use client';

import React, { useState } from 'react';
import { Sun, MessageSquare, Gavel, CheckCircle, Send, Users } from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { TargetPicker } from './TargetPicker';
import { Button, Avatar, Kbd, Modal, CenterTimer } from './ui';
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
    <div className="w-full max-w-[1650px] 2xl:max-w-[1850px] mx-auto p-4 md:p-8 lg:p-10 space-y-6">
      {/* Morning Incident Report Announcement Banner */}
      {phase === 'morning' && (
        <div className="bg-surface border border-border p-6 md:p-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3.5 border border-border bg-surface-2 text-white">
            <Sun className="w-9 h-9" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl md:text-4xl font-sans font-bold text-text">
              Dawn in the City · Round {round}
            </h2>
            <div className="text-sm text-muted">Official morning incident log</div>
          </div>
          <div className="space-y-2 max-w-xl mx-auto pt-2">
            {morningLog.length === 0 ? (
              <p className="text-base text-muted">The night passed in complete silence. No casualties recorded.</p>
            ) : (
              morningLog.map((l) => (
                <div key={l.id} className="p-3.5 bg-surface-2 border border-border text-sm md:text-base text-white">
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface border border-border p-5 md:p-7">
            <div className="flex items-center gap-3">
              <Sun className="w-6 h-6 text-white" />
              <div>
                <h2 className="text-xl md:text-2xl font-sans font-bold text-text">
                  Day Discussion · Round {round}
                </h2>
                <p className="text-sm text-muted mt-1">
                  Debate claims, share evidence, and decide who faces the town vote.
                </p>
              </div>
            </div>

            {/* Prominent Center Countdown Timer */}
            <div className="flex justify-center">
              <CenterTimer
                phaseEndsAt={gameView.phaseEndsAt}
                serverNow={gameView.serverNow}
                label="Discussion Closes In"
                size="md"
              />
            </div>

            <Button
              variant={me?.readyToVote ? 'secondary' : 'primary'}
              size="lg"
              onClick={handleReadyClick}
              kbd="V"
              className="font-bold text-sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              <span>{me?.readyToVote ? 'Waiting for others' : 'Ready to Vote'}</span>
              <span className="text-xs opacity-75 ml-1">
                ({readyToVote.length}/{players.filter((p) => p.alive && !p.isGod).length})
              </span>
            </Button>
          </div>

          {/* 16:9 Widescreen Two-Column Layout on PC */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Living Suspects Column (4 cols on Desktop) */}
            <div className="lg:col-span-4 bg-surface border border-border p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2 text-sm font-bold text-text">
                    <Users className="w-4 h-4 text-white" />
                    <span>Living Suspects</span>
                  </div>
                  <span className="text-xs text-muted">
                    {players.filter((p) => p.alive && !p.isGod).length} remaining
                  </span>
                </div>

                <div className="space-y-2.5">
                  {players
                    .filter((p) => p.alive && !p.isGod)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 bg-surface-2 border border-border text-sm"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <Avatar avatarId={p.avatar} size={36} className="rounded-none" />
                          <span className="text-text font-semibold truncate">{p.name}</span>
                        </div>
                        {readyToVote.includes(p.id) ? (
                          <span className="text-xs font-semibold px-2 py-0.5 bg-white text-black">
                            Ready ✓
                          </span>
                        ) : (
                          <span className="text-xs text-muted">
                            Thinking
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              <div className="pt-3 border-t border-border text-xs text-muted text-center">
                Press [V] to toggle ready status
              </div>
            </div>

            {/* Public Town Assembly Chat (8 cols on Desktop) */}
            <div className="lg:col-span-8 bg-surface border border-border p-6 flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2 text-sm font-bold text-text">
                  <MessageSquare className="w-4 h-4 text-white" />
                  <span>Town Assembly Chat (Public)</span>
                </div>
                <span className="text-xs text-muted">All living players</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
                {gameView.chat
                  .filter((m) => m.channel === 'public')
                  .map((m) =>
                    m.senderId === 'system' ? (
                      <div
                        key={m.id}
                        className="p-2.5 bg-zinc-900 border border-zinc-700 text-xs font-mono text-amber-300 flex items-start gap-2 shadow-sm rounded-none"
                      >
                        <span className="font-bold text-amber-400 shrink-0">[SYSTEM]:</span>
                        <span className="leading-relaxed text-white font-medium">{m.text}</span>
                      </div>
                    ) : (
                      <div key={m.id} className="leading-relaxed">
                        <span className="font-bold text-white mr-2">[{m.senderName}]:</span>
                        <span className="text-text">{m.text}</span>
                      </div>
                    )
                  )}
                {gameView.chat.filter((m) => m.channel === 'public').length === 0 && (
                  <div className="text-muted text-center pt-32 text-sm">
                    The town hall is quiet. Present claims or defenses to begin discussion.
                  </div>
                )}
              </div>

              <form onSubmit={handleSendChat} className="flex gap-2.5 pt-3 border-t border-border">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Share accusations, defenses, deductions..."
                  maxLength={300}
                  className="flex-1 bg-surface-2 border border-border rounded-none px-4 py-2.5 text-sm text-text placeholder-muted/50 focus:outline-none focus:border-white"
                />
                <Button type="submit" variant="primary" size="md" className="px-5">
                  <Send className="w-4 h-4 mr-1" />
                  <span>Send</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Voting Phase */}
      {phase === 'voting' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border p-5 md:p-7 text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-sans font-bold text-text flex items-center justify-center gap-2.5">
              <Gavel className="w-6 h-6 text-white" />
              <span>Town Vote</span>
            </h2>
            <p className="text-sm text-muted">
              Cast your ballot to eliminate one Prime Suspect, or choose to Skip.
            </p>

            {/* Prominent Center Countdown Timer */}
            <div className="pt-1 flex justify-center">
              <CenterTimer
                phaseEndsAt={gameView.phaseEndsAt}
                serverNow={gameView.serverNow}
                label="Voting Closes In"
                size="lg"
              />
            </div>
          </div>

          {/* 16:9 Widescreen Two-Column Layout on PC */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Target Picker (7 cols on Desktop) */}
            <div className="lg:col-span-7 bg-surface border border-border p-6 space-y-4">
              <div className="text-sm font-bold text-text pb-2.5 border-b border-border">
                Select Prime Suspect:
              </div>
              <TargetPicker
                players={players}
                myPlayerId={me?.id || ''}
                selectedId={me?.vote || null}
                onSelect={(targetId) => onVote(targetId as any)}
                mode="voting"
                allowSkip={gameView.settings.allowSkipVote}
              />
            </div>

            {/* Vote Tally & Assembly Chat (5 cols on Desktop) */}
            <div className="lg:col-span-5 bg-surface border border-border p-6 space-y-5 flex flex-col justify-between">
              {/* Live Vote Tally Bars */}
              <div className="space-y-3">
                <div className="text-sm font-bold text-text pb-2.5 border-b border-border">
                  Current Vote Tally:
                </div>
                {voteCounts && Object.keys(voteCounts).length > 0 ? (
                  <div className="space-y-2.5">
                    {Object.entries(voteCounts).map(([targetId, count]) => {
                      const isSkip = targetId === 'skip';
                      const targetName = isSkip
                        ? 'Skip Vote'
                        : players.find((p) => p.id === targetId)?.name || 'Unknown';
                      return (
                        <div key={targetId} className="flex items-center gap-3 text-sm">
                          <span className="w-32 truncate font-semibold text-text">
                            {targetName}
                          </span>
                          <div className="flex-1 h-3 bg-surface-2 border border-border overflow-hidden">
                            <div
                              style={{ width: `${(count / Math.max(1, players.filter((p) => p.alive && !p.isGod).length)) * 100}%` }}
                              className="h-full bg-white"
                            />
                          </div>
                          <span className="w-8 text-right font-mono font-bold text-white">[{count}]</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-muted text-center py-6">
                    No ballots cast yet
                  </div>
                )}
              </div>

              {/* Chat inside Voting */}
              <div className="pt-4 border-t border-border flex flex-col h-[300px]">
                <div className="flex items-center justify-between pb-2.5">
                  <span className="text-xs md:text-sm font-semibold text-text">
                    {isDead ? 'Graveyard Spirits (Dead Chat)' : 'Town Assembly Chat (Public)'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto bg-surface-2 border border-border p-3 space-y-2 text-xs md:text-sm">
                  {gameView.chat
                    .filter((m) => (isDead ? m.channel === 'dead' : m.channel === 'public'))
                    .map((m) => (
                      <div key={m.id} className="leading-relaxed">
                        <span className="font-semibold text-white mr-1.5">[{m.senderName}]:</span>
                        <span className="text-muted">{m.text}</span>
                      </div>
                    ))}
                </div>

                <form onSubmit={handleSendChat} className="flex gap-2 pt-2.5">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Discuss vote rationale..."
                    maxLength={300}
                    className="flex-1 bg-surface-2 border border-border rounded-none px-3.5 py-2 text-xs md:text-sm text-text placeholder-muted/50 focus:outline-none focus:border-white"
                  />
                  <Button type="submit" variant="primary" size="sm">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vote Result Phase */}
      {phase === 'voteResult' && (
        <div className="bg-surface border border-border p-8 md:p-14 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3.5 border border-border bg-surface-2 text-white">
            <Gavel className="w-9 h-9" />
          </div>
          <h2 className="text-2xl md:text-4xl font-sans font-bold text-text">
            Town Verdict
          </h2>
          <div className="max-w-md mx-auto space-y-2 pt-2">
            {voteLog.map((l) => (
              <div key={l.id} className="p-3.5 bg-surface-2 border border-border text-sm md:text-base text-white">
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
          <p className="text-sm text-text leading-relaxed">
            Are you ready to end discussion and cast your official vote now?
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setReadyConfirmOpen(false)} kbd="Esc">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmReady} kbd="Enter">
              I am Ready
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
