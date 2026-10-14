'use client';

import React, { useState } from 'react';
import { Trophy, RotateCcw, LogOut, Skull, MessageSquare, Send, Eye } from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { Button, Avatar, Modal } from './ui';
import { clearRoomData } from '@/lib/storage';

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

  if (isGameOver) {
    return (
      <div className="w-full max-w-[1650px] 2xl:max-w-[1850px] mx-auto p-4 md:p-8 lg:p-10 space-y-6">
        {/* 16:9 Widescreen Grid on PC */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Victory Headline Banner (4 cols on Desktop) */}
          <div className="lg:col-span-4 bg-surface border border-border p-6 md:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center p-3.5 border border-border bg-surface-2 text-white">
                <Trophy className="w-9 h-9" />
              </div>
              <div>
                <span className="text-xs text-muted">
                  Match Concluded
                </span>
                <h2 className="text-2xl md:text-3xl font-sans font-bold text-white mt-1 tracking-tight">
                  {winner === 'town'
                    ? 'Town Prevails!'
                    : winner === 'mafia'
                    ? 'Mafia Syndicate Wins!'
                    : 'Jester Claims Victory!'}
                </h2>
              </div>
              <p className="text-sm text-muted leading-relaxed">
                {winner === 'town'
                  ? 'All members of the covert syndicate have been purged from the city. Order restored.'
                  : winner === 'mafia'
                  ? 'The syndicate has achieved parity or majority over the townspeople. Darkness reigns.'
                  : 'The Jester successfully deceived the town into a daytime execution, securing victory.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-border flex flex-col gap-3">
              {isHost && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setRematchConfirmOpen(true)}
                  className="w-full font-bold text-sm"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  <span>Play Again (Keep Room)</span>
                </Button>
              )}
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setLeaveConfirmOpen(true)}
                className="w-full text-sm font-medium"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Leave Room</span>
              </Button>
            </div>
          </div>

          {/* Full Player Roles Reveal Roster (4 cols on Desktop) */}
          <div className="lg:col-span-4 bg-surface border border-border p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-bold text-text">
                  True Identities Revealed
                </h3>
                <span className="text-xs text-muted">{players.length} players</span>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-[480px]">
                {players.map((p) => {
                  const rDef = p.role ? ROLES[p.role] : null;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 bg-surface-2 border border-border"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Avatar avatarId={p.avatar} size={36} className="rounded-none" />
                        <div className="truncate">
                          <div className="text-sm font-semibold text-text truncate">{p.name}</div>
                          <div className="text-xs text-muted">
                            {p.alive ? 'Survived' : `Eliminated Round ${p.diedInRound || 1}`}
                          </div>
                        </div>
                      </div>
                      {rDef && (
                        <span className="px-2.5 py-0.5 text-xs font-medium border border-border bg-black text-white">
                          {rDef.name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-xs text-muted text-center pt-2 border-t border-border">
              Verified match attrition record
            </div>
          </div>

          {/* Match Timeline Event Ledger (4 cols on Desktop) */}
          <div className="lg:col-span-4 bg-surface border border-border p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-bold text-text">
                  Timeline Ledger
                </h3>
                <span className="text-xs text-muted">Secrets audit</span>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[480px]">
                {secretLog && secretLog.length > 0 ? (
                  secretLog.map((entry) => (
                    <div key={entry.round} className="p-3.5 bg-surface-2 border border-border space-y-1.5 text-xs">
                      <div className="text-xs font-bold text-white">
                        Round {entry.round} Secrets:
                      </div>
                      {entry.mafiaTarget && (
                        <div className="text-muted">
                          <span className="text-white font-medium">Mafia Target: </span>
                          {players.find((p) => p.id === entry.mafiaTarget)?.name || 'None'}
                        </div>
                      )}
                      {entry.doctorSaves.length > 0 && (
                        <div className="text-muted">
                          <span className="text-white font-medium">Doctor Saves: </span>
                          {entry.doctorSaves.map((id) => players.find((p) => p.id === id)?.name).join(', ')}
                        </div>
                      )}
                      {entry.policeInvestigations.length > 0 && (
                        <div className="text-muted">
                          <span className="text-white font-medium">Police Dossier: </span>
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
                  <div className="text-sm text-muted text-center py-8">
                    No secret timeline entries
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-muted text-center pt-2 border-t border-border">
              Match concluded
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
            <p className="text-sm text-text leading-relaxed">
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
            <p className="text-sm text-text leading-relaxed">
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
      </div>
    );
  }

  /* Mid-Game Graveyard Lounge for Eliminated Dead Players */
  if (isDead) {
    return (
      <div className="w-full max-w-[1650px] 2xl:max-w-[1850px] mx-auto p-4 md:p-8 lg:p-10 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-5 bg-surface border border-border p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center p-3.5 border border-border bg-surface-2 text-white">
                <Skull className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs text-muted">Observer Status</span>
                <h2 className="text-xl md:text-2xl font-sans font-bold text-text mt-1">
                  The Graveyard Lounge
                </h2>
              </div>
              <p className="text-sm text-muted leading-relaxed">
                You have been eliminated from active play. You may observe ongoing operations from the spectral gallery.
              </p>

              {settings.deadSeeRoles && (
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setSpectatorShowAll(!spectatorShowAll)}
                    className="w-full font-medium"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    <span>{spectatorShowAll ? 'Hide All True Roles' : 'Peek All True Roles'}</span>
                  </Button>
                </div>
              )}
            </div>

            {spectatorShowAll && settings.deadSeeRoles && (
              <div className="p-3.5 bg-surface-2 border border-border space-y-2.5 text-xs">
                <div className="text-xs font-bold text-white">All Roles Revealed:</div>
                <div className="grid grid-cols-2 gap-2">
                  {players.map((p) => (
                    <div key={p.id} className="p-2 bg-black border border-border flex items-center justify-between">
                      <span className="truncate text-text font-medium">{p.name}</span>
                      <span className="text-[11px] font-semibold text-white ml-1">
                        {p.role || 'Civilian'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-surface border border-border p-6 flex flex-col h-[460px]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-sm font-bold text-text">
                <MessageSquare className="w-4 h-4" />
                <span>Graveyard Spirits Chat</span>
              </div>
              <span className="text-xs text-muted">Spectators</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-sm">
              {chat
                .filter((m) => m.channel === 'dead')
                .map((m) => (
                  <div key={m.id} className="leading-snug">
                    <span className="font-semibold text-white mr-1.5">[{m.senderName}]:</span>
                    <span className="text-muted">{m.text}</span>
                  </div>
                ))}
            </div>

            {settings.deadChat ? (
              <form onSubmit={handleSendGhostChat} className="flex gap-2.5 pt-3 border-t border-border">
                <input
                  type="text"
                  value={ghostChatInput}
                  onChange={(e) => setGhostChatInput(e.target.value)}
                  placeholder="Whisper among the dead..."
                  maxLength={300}
                  className="flex-1 bg-surface-2 border border-border rounded-none px-3.5 py-2 text-sm text-text placeholder-muted/50 focus:outline-none focus:border-white"
                />
                <Button type="submit" variant="primary" size="md">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            ) : (
              <div className="p-3 border-t border-border bg-surface-2 text-xs text-muted text-center">
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
