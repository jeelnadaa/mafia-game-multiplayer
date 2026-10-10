'use client';

import React, { useState } from 'react';
import { Sun, MessageSquare, Gavel, CheckCircle, Send, Users, AlertCircle } from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { TargetPicker } from './TargetPicker';
import { Button, Avatar, Kbd } from './ui';
import { useShortcut } from '@/lib/shortcuts';

interface DayProps {
  gameView: ClientGameView;
  onVote: (targetId: string | 'skip') => void;
  onReadyToVote: () => void;
  onSendChat: (channel: 'public' | 'dead', text: string) => void;
}

export function Day({ gameView, onVote, onReadyToVote, onSendChat }: DayProps) {
  const [chatInput, setChatInput] = useState('');
  const { phase, round, me, players, readyToVote, voteCounts, log } = gameView;
  const isDead = me ? !me.alive : false;

  // 'V' shortcut toggles ready to vote
  useShortcut(
    ['v', 'V'],
    () => {
      if (phase === 'discussion') onReadyToVote();
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

  // Latest morning news announcement from logs
  const morningLog = log.filter((l) => l.round === round && l.phase === 'morning');
  const voteLog = log.filter((l) => l.round === round && l.phase === 'voting');

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Morning News Announcement Banner */}
      {phase === 'morning' && (
        <div className="bg-gradient-to-r from-day-amber/20 to-surface-2 border border-day-amber/30 rounded-2xl p-6 text-center space-y-3 shadow-2xl animate-fade-in">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-day-amber/20 text-day-amber mb-1">
            <Sun className="w-8 h-8 animate-spin-slow" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-text">Dawn in the City</h2>
          <div className="space-y-1.5 max-w-lg mx-auto">
            {morningLog.length === 0 ? (
              <p className="text-sm text-muted">The city awakens to peaceful silence.</p>
            ) : (
              morningLog.map((l) => (
                <p key={l.id} className="text-sm text-text font-medium leading-relaxed">
                  {l.text}
                </p>
              ))
            )}
          </div>
        </div>
      )}

      {/* Discussion Phase */}
      {phase === 'discussion' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface border border-border rounded-2xl p-4 md:p-6">
            <div>
              <h2 className="text-xl font-heading font-bold text-text flex items-center gap-2">
                <Sun className="w-5 h-5 text-day-amber" />
                <span>Day Discussion · Round {round}</span>
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Debate suspect claims, present evidence, and determine who faces the town vote.
              </p>
            </div>

            <Button
              variant={me?.readyToVote ? 'secondary' : 'accent'}
              onClick={onReadyToVote}
              kbd="V"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              <span>{me?.readyToVote ? 'Waiting for others' : 'Ready to Vote'}</span>
              <span className="text-xs opacity-70 ml-1">
                ({readyToVote.length}/{players.filter((p) => p.alive && !p.isGod).length})
              </span>
            </Button>
          </div>

          {/* Discussion Chat & Alive Player Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Living Players */}
            <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-text">
                <Users className="w-4 h-4 text-day-amber" />
                <span>Living Suspects</span>
              </div>
              <div className="space-y-2">
                {players
                  .filter((p) => p.alive && !p.isGod)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-surface-2 border border-border text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Avatar avatarId={p.avatar} size={28} />
                        <span className="text-text font-medium truncate">{p.name}</span>
                      </div>
                      {readyToVote.includes(p.id) && (
                        <span className="text-[10px] font-semibold text-emerald-400">Ready</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Public Town Hall Chat */}
            <div className="md:col-span-2 bg-surface border border-border rounded-2xl p-4 flex flex-col h-[400px]">
              <div className="flex items-center gap-2 text-xs font-semibold text-text pb-3 border-b border-border">
                <MessageSquare className="w-4 h-4 text-day-amber" />
                <span>Town Assembly Chat</span>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2.5 text-xs">
                {gameView.chat
                  .filter((m) => m.channel === 'public')
                  .map((m) => (
                    <div key={m.id} className="leading-relaxed">
                      <span className="font-bold text-day-amber mr-1.5">{m.senderName}:</span>
                      <span className="text-text">{m.text}</span>
                    </div>
                  ))}
              </div>

              <form onSubmit={handleSendChat} className="flex gap-2 pt-3 border-t border-border">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Share accusations, defenses, deductions..."
                  maxLength={300}
                  className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-text placeholder-muted/60 focus:outline-none focus:ring-1 focus:ring-day-amber"
                />
                <Button type="submit" variant="accent" size="sm">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Voting Phase */}
      {phase === 'voting' && (
        <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-6 shadow-xl">
          <div className="text-center space-y-1">
            <h2 className="text-xl md:text-2xl font-heading font-bold text-text flex items-center justify-center gap-2">
              <Gavel className="w-6 h-6 text-day-amber" />
              <span>Town Vote</span>
            </h2>
            <p className="text-xs text-muted">
              Cast your ballot to eliminate one Prime Suspect, or choose to Skip.
            </p>
          </div>

          <TargetPicker
            players={players}
            myPlayerId={me?.id || ''}
            selectedId={me?.vote || null}
            onSelect={(targetId) => onVote(targetId as any)}
            mode="voting"
            allowSkip={gameView.settings.allowSkipVote}
          />

          {/* Live Vote Tally Bars */}
          {voteCounts && Object.keys(voteCounts).length > 0 && (
            <div className="pt-4 border-t border-border space-y-2">
              <div className="text-xs font-semibold text-text">Current Vote Tally:</div>
              <div className="space-y-1.5">
                {Object.entries(voteCounts).map(([targetId, count]) => {
                  const isSkip = targetId === 'skip';
                  const targetName = isSkip
                    ? 'Skip Vote'
                    : players.find((p) => p.id === targetId)?.name || 'Unknown';
                  return (
                    <div key={targetId} className="flex items-center gap-3 text-xs">
                      <span className={`w-24 truncate font-medium ${isSkip ? 'text-day-amber font-semibold' : 'text-muted'}`}>
                        {targetName}
                      </span>
                      <div className="flex-1 h-3 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${(count / Math.max(1, players.filter((p) => p.alive && !p.isGod).length)) * 100}%` }}
                          className={`h-full rounded-full ${isSkip ? 'bg-amber-400' : 'bg-day-amber'}`}
                        />
                      </div>
                      <span className="w-6 text-right font-mono font-bold text-text">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Common Assembly Chat During Voting */}
          <div className="pt-4 border-t border-border flex flex-col h-[280px]">
            <div className="flex items-center gap-2 text-xs font-semibold text-text pb-2">
              <MessageSquare className="w-4 h-4 text-day-amber" />
              <span>{isDead ? 'Graveyard Spirits (Dead Chat)' : 'Town Assembly Chat (Public)'}</span>
            </div>

            <div className="flex-1 overflow-y-auto bg-surface-2/60 border border-border rounded-xl p-2.5 space-y-2 text-xs">
              {gameView.chat
                .filter((m) => (isDead ? m.channel === 'dead' : m.channel === 'public'))
                .map((m) => (
                  <div key={m.id} className="leading-relaxed">
                    <span className="font-bold text-day-amber mr-1.5">{m.senderName}:</span>
                    <span className="text-text">{m.text}</span>
                  </div>
                ))}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2 pt-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isDead ? 'Whisper among the dead...' : 'Discuss votes and skips...'}
                maxLength={300}
                className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-text placeholder-muted/60 focus:outline-none focus:ring-1 focus:ring-day-amber"
              />
              <Button type="submit" variant="accent" size="sm">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Vote Result Phase */}
      {phase === 'voteResult' && (
        <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-mafia/20 text-mafia">
            <Gavel className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-text">Town Verdict</h2>
          <div className="max-w-md mx-auto space-y-2">
            {voteLog.map((l) => (
              <p key={l.id} className="text-sm text-text font-medium leading-relaxed">
                {l.text}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
