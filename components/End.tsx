'use client';

import React, { useState } from 'react';
import { Trophy, RotateCcw, LogOut, Skull, MessageSquare, Send, Eye, ShieldAlert } from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { Button, Avatar, Badge } from './ui';

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

  const { winner, players, secretLog, phase, me, chat, settings } = gameView;
  const isDead = me && !me.alive && !me.isGod;
  const isGameOver = phase === 'gameOver' || Boolean(winner);

  const handleSendGhostChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghostChatInput.trim()) return;
    onSendChat('dead', ghostChatInput.trim());
    setGhostChatInput('');
  };

  if (isGameOver) {
    const winnerColor =
      winner === 'town' ? 'text-doctor' : winner === 'mafia' ? 'text-mafia' : 'text-jester';

    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Victory Headline Banner */}
        <div className="bg-surface border-2 border-border rounded-2xl p-6 md:p-10 text-center space-y-4 shadow-2xl">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-surface-2 text-day-amber">
            <Trophy className="w-12 h-12" />
          </div>
          <h2 className={`text-3xl md:text-5xl font-heading font-black tracking-wide uppercase ${winnerColor}`}>
            {winner === 'town'
              ? 'Town Prevails!'
              : winner === 'mafia'
              ? 'Mafia Syndicate Triumphs!'
              : 'Jester Deceived All!'}
          </h2>
          <p className="text-xs md:text-sm text-muted max-w-lg mx-auto">
            {winner === 'town'
              ? 'Every member of the secret syndicate has been eliminated. Peace returns to the city.'
              : winner === 'mafia'
              ? 'The syndicate has equaled or outnumbered the townspeople. Darkness claims the city.'
              : 'The Jester was successfully eliminated by town vote and claims exclusive victory!'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            {isHost && (
              <Button variant="accent" onClick={onRematch}>
                <RotateCcw className="w-4 h-4 mr-2" />
                <span>Play Again (Keep Room)</span>
              </Button>
            )}
            <Button variant="secondary" onClick={onLeave}>
              <LogOut className="w-4 h-4 mr-2" />
              <span>Leave Room</span>
            </Button>
          </div>
        </div>

        {/* Full Player Roles Reveal Roster */}
        <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-4 shadow-xl">
          <h3 className="font-heading text-base font-bold text-text">True Identities Revealed:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {players.map((p) => {
              const rDef = p.role ? ROLES[p.role] : null;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-border"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Avatar avatarId={p.avatar} size={36} />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-text truncate">{p.name}</div>
                      <div className="text-[11px] text-muted font-mono">
                        {p.alive ? 'Survived' : `Eliminated R${p.diedInRound || 1}`}
                      </div>
                    </div>
                  </div>
                  {rDef && (
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border"
                      style={{
                        backgroundColor: `${rDef.colour}15`,
                        borderColor: `${rDef.colour}40`,
                        color: rDef.colour,
                      }}
                    >
                      {rDef.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Event Ledger from SecretLog */}
        {secretLog && secretLog.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-4 shadow-xl">
            <h3 className="font-heading text-base font-bold text-text">Match Timeline Ledger:</h3>
            <div className="space-y-3">
              {secretLog.map((entry) => (
                <div key={entry.round} className="p-3 bg-surface-2/60 border border-border rounded-xl space-y-1.5 text-xs">
                  <div className="font-mono font-bold text-day-amber text-[11px]">ROUND {entry.round} SECRETS</div>
                  {entry.mafiaTarget && (
                    <div className="text-muted">
                      <span className="text-mafia font-semibold">Mafia Target: </span>
                      {players.find((p) => p.id === entry.mafiaTarget)?.name || 'None'}
                    </div>
                  )}
                  {entry.doctorSaves.length > 0 && (
                    <div className="text-muted">
                      <span className="text-text font-semibold">Doctor Saves: </span>
                      {entry.doctorSaves.map((id) => players.find((p) => p.id === id)?.name).join(', ')}
                    </div>
                  )}
                  {entry.policeInvestigations.length > 0 && (
                    <div className="text-muted">
                      <span className="text-police font-semibold">Investigations: </span>
                      {entry.policeInvestigations
                        .map(
                          (inv) =>
                            `${players.find((p) => p.id === inv.targetId)?.name || 'Player'} (${inv.result})`
                        )
                        .join('; ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* Mid-Game Graveyard Lounge for Eliminated Dead Players */
  if (isDead) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="bg-surface border-2 border-border/80 rounded-2xl p-6 text-center space-y-3 shadow-xl">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-surface-2 text-muted">
            <Skull className="w-8 h-8 text-muted" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-text">The Graveyard Lounge</h2>
          <p className="text-xs text-muted max-w-md mx-auto">
            You have fallen in the battle for the city. You may now observe the remaining suspects from beyond the veil.
          </p>

          {settings.deadSeeRoles && (
            <div className="pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSpectatorShowAll(!spectatorShowAll)}
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                <span>{spectatorShowAll ? 'Hide True Roles' : 'Peek All True Roles'}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Peek True Roles Overlay if Enabled */}
        {spectatorShowAll && settings.deadSeeRoles && (
          <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-text">
              <ShieldAlert className="w-4 h-4 text-day-amber" />
              <span>Ghost Omniscience (All Roles)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {players.map((p) => (
                <div key={p.id} className="p-2 bg-surface-2 rounded-lg border border-border flex items-center justify-between">
                  <span className="text-text font-medium truncate">{p.name}</span>
                  <span className="text-[10px] font-bold uppercase text-day-amber">{p.role || 'Civilian'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ghost Chat Channel */}
        <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col h-[360px]">
          <div className="flex items-center gap-2 text-xs font-semibold text-text pb-3 border-b border-border">
            <MessageSquare className="w-4 h-4 text-muted" />
            <span>Graveyard Whispers (Dead Player Chat)</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
            {chat
              .filter((m) => m.channel === 'dead')
              .map((m) => (
                <div key={m.id} className="leading-snug">
                  <span className="font-bold text-muted mr-1.5">{m.senderName}:</span>
                  <span className="text-text">{m.text}</span>
                </div>
              ))}
          </div>

          <form onSubmit={handleSendGhostChat} className="flex gap-2 pt-3 border-t border-border">
            <input
              type="text"
              value={ghostChatInput}
              onChange={(e) => setGhostChatInput(e.target.value)}
              placeholder="Speak with fellow ghosts..."
              maxLength={300}
              className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-text placeholder-muted/60 focus:outline-none focus:ring-1 focus:ring-border"
            />
            <Button type="submit" variant="secondary" size="sm">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}
