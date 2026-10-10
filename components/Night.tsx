'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Shield, Users, MessageSquare, Send, Check, FileText, Skull, AlertCircle } from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { ROLES, RoleDef } from '@/lib/content';
import { TargetPicker } from './TargetPicker';
import { Button, Badge, Modal, CenterTimer } from './ui';
import { useShortcut } from '@/lib/shortcuts';

interface NightProps {
  gameView: ClientGameView;
  onNightAction: (targetId: string | 'hold') => void;
  onConfirmNightAction?: (targetId?: string) => void;
  onSendChat: (channel: 'mafia' | 'dead', text: string) => void;
  onOpenHelp: (tab?: 'basics' | 'my-role' | 'roles' | 'rules' | 'log' | 'notes' | 'keys') => void;
}

export function Night({
  gameView,
  onNightAction,
  onConfirmNightAction,
  onSendChat,
  onOpenHelp,
}: NightProps) {
  const [showBriefing, setShowBriefing] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [decoyTaps, setDecoyTaps] = useState(0);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const me = gameView.me;
  const role = me?.role;
  const roleDef: RoleDef | null = role ? ROLES[role] : null;

  const isDead = me ? !me.alive : false;
  const isMafia = role === 'mafia' || role === 'godfather';
  const canActNow = Boolean(me?.canActNow);
  const isConfirmed = Boolean(me?.isConfirmed);

  // Auto-show briefing card on first night if enabled
  useEffect(() => {
    if (gameView.round === 1) {
      const disabled = localStorage.getItem('mafia-hide-role-brief') === 'true';
      if (!disabled) {
        setShowBriefing(true);
        const t = setTimeout(() => setShowBriefing(false), 12000);
        return () => clearTimeout(t);
      }
    }
  }, [gameView.round]);

  // Hold 'R' shortcut to peek role HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'r' || e.key === 'R') && !isPeeking) {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        setIsPeeking(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setIsPeeking(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPeeking]);

  // Esc closes briefing card
  useShortcut('Escape', () => {
    if (showBriefing) setShowBriefing(false);
  });

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const channel = isDead ? 'dead' : 'mafia';
    onSendChat(channel, chatInput.trim());
    setChatInput('');
  };

  const handleConfirmActionClick = () => {
    if (!canActNow || isConfirmed) return;
    setConfirmModalOpen(true);
  };

  const handleFinalConfirm = () => {
    setConfirmModalOpen(false);
    onConfirmNightAction?.(me?.nightPick || undefined);
  };

  const selectedTargetPlayer = gameView.players.find((p) => p.id === me?.nightPick);

  // Check Mafia agreement in unanimous mode
  const teammatePicks = me?.teammatePicks || {};
  const mafiaPicksArray = Object.values(teammatePicks).filter(Boolean);
  const mafiaAgreed =
    mafiaPicksArray.length > 0 && mafiaPicksArray.every((pick) => pick === mafiaPicksArray[0]);

  return (
    <div className="w-full max-w-[1650px] 2xl:max-w-[1850px] mx-auto p-4 md:p-8 lg:p-10 space-y-6">
      {/* Night Header */}
      <div className="bg-surface border border-border p-5 md:p-7 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Moon className="w-6 h-6 text-white" />
          <div>
            <h2 className="text-xl md:text-2xl font-sans font-bold text-text">
              Night Operations · Round {gameView.round}
            </h2>
            <p className="text-sm text-muted mt-0.5">
              {canActNow
                ? roleDef?.howToPlay || 'Select your secret target and confirm action.'
                : isDead
                ? 'You have fallen. Observe the night and converse with other spirits.'
                : 'The city sleeps in darkness. Keep your device face down to disguise activity.'}
            </p>
          </div>
        </div>

        {/* Prominent Center Countdown Timer */}
        <div className="flex justify-center">
          <CenterTimer
            phaseEndsAt={gameView.phaseEndsAt}
            serverNow={gameView.serverNow}
            label={`${roleDef?.name || 'Night'} Ends In`}
            size="md"
          />
        </div>

        <div className="flex items-center gap-3">
          {roleDef && (
            <Badge color="mafia">{roleDef.name}</Badge>
          )}
          <span className="text-xs text-muted hidden md:inline">
            Hold [R] to peek role
          </span>
        </div>
      </div>

      {/* 16:9 Widescreen Two-Column Layout on PC */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: TargetPicker & Main Operation Stage (7 cols on Desktop) */}
        <div className="lg:col-span-7 bg-surface border border-border p-6 space-y-6 flex flex-col justify-between">
          {!canActNow ? (
            isDead ? (
              /* Dead Player Status */
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <Skull className="w-4 h-4 text-white" />
                  <span className="text-sm font-semibold text-text">
                    The Graveyard · Fallen Operatives
                  </span>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  You have been eliminated from active town governance. You may monitor remaining suspects and converse with spirits on the private right-hand frequency.
                </p>
              </div>
            ) : (
              /* Decoy Screen for Sleeping living players */
              <div className="py-12 text-center space-y-6 flex-1 flex flex-col items-center justify-center">
                <div className="w-18 h-18 border border-border bg-surface-2 flex items-center justify-center p-4">
                  <Moon className="w-10 h-10 text-white" />
                </div>
                <div className="max-w-md space-y-2">
                  <h3 className="text-lg font-bold text-text">
                    Close your eyes...
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    Keep your device level. Tap the decoy pad below to disguise night movements from neighboring players.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDecoyTaps((t) => t + 1)}
                  className="w-full max-w-sm h-32 border border-dashed border-border bg-surface-2 hover:bg-zinc-800 transition-colors flex flex-col items-center justify-center text-sm text-muted select-none gap-1.5"
                >
                  <span>Harmless decoy touch pad (Tap freely)</span>
                  {decoyTaps > 0 && <span className="text-xs text-white">Tap count: {decoyTaps}</span>}
                </button>
              </div>
            )
          ) : (
            /* Active Target Picker Stage */
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-sm font-bold text-text">
                  {isMafia
                    ? 'Syndicate Kill Order'
                    : role === 'doctor'
                    ? "Doctor's Clinic Protection"
                    : role === 'police'
                    ? 'Police Department Investigation'
                    : 'Vigilante Night Watch'}
                </span>

                <div className="flex items-center gap-3">
                  <CenterTimer
                    phaseEndsAt={gameView.phaseEndsAt}
                    serverNow={gameView.serverNow}
                    label="Action Timer"
                    size="sm"
                  />
                  {me?.shotsRemaining !== undefined && (
                    <span className="text-xs md:text-sm font-semibold text-white">
                      Ammo: {me.shotsRemaining} remaining
                    </span>
                  )}
                </div>
              </div>

              {/* Target Picker Grid */}
              <TargetPicker
                players={gameView.players}
                myPlayerId={me?.id || ''}
                roleDef={roleDef}
                selectedId={me?.nightPick || null}
                onSelect={(targetId) => {
                  onNightAction(targetId);
                  onConfirmNightAction?.(targetId);
                }}
                mode="night"
                allowHoldFire={role === 'vigilante'}
                disabled={isConfirmed}
                teammatePicks={me?.teammatePicks}
                investigations={me?.policeInbox}
              />

              {/* Confirm Action Button & Status Bar */}
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted">
                  {isConfirmed ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Order confirmed. Advancing once all players ready...
                    </span>
                  ) : selectedTargetPlayer ? (
                    <span>
                      Selected: <strong className="text-white underline font-semibold">{selectedTargetPlayer.name}</strong>
                    </span>
                  ) : me?.nightPick === 'hold' ? (
                    <span>Holding fire tonight</span>
                  ) : (
                    <span>Select a target above to confirm</span>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  disabled={(!me?.nightPick && me?.nightPick !== 'hold') || isConfirmed}
                  onClick={handleConfirmActionClick}
                  className="w-full sm:w-auto font-bold text-sm"
                >
                  {isConfirmed ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5" />
                      <span>Confirmed ✓</span>
                    </>
                  ) : (
                    <span>
                      Confirm{' '}
                      {isMafia
                        ? 'Kill'
                        : role === 'doctor'
                        ? 'Protection'
                        : role === 'police'
                        ? 'Investigation'
                        : 'Shot'}
                    </span>
                  )}
                </Button>
              </div>

              {/* Police Dossier */}
              {role === 'police' && me?.policeInbox && me.policeInbox.length > 0 && (
                <div className="pt-4 border-t border-border space-y-2.5">
                  <div className="flex items-center gap-2 text-sm font-bold text-text">
                    <FileText className="w-4 h-4 text-white" />
                    <span>Confidential Investigation Dossier:</span>
                  </div>
                  <div className="space-y-2">
                    {me.policeInbox.map((entry, idx) => {
                      const target = gameView.players.find((p) => p.id === entry.targetId);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-surface-2 border border-border text-sm"
                        >
                          <span className="font-semibold text-text">{target?.name || 'Subject'}:</span>
                          <span className="font-bold text-white border border-border px-2.5 py-1 bg-black">
                            {entry.result}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Syndicate Private Chat / Graveyard Chat / Quick Manual (5 cols on Desktop) */}
        <div className="lg:col-span-5 bg-surface border border-border p-6 space-y-5 flex flex-col justify-between">
          {isMafia ? (
            /* Mafia Syndicate Private Tactical Hub */
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2 text-sm font-bold text-text">
                    <Users className="w-4 h-4" />
                    <span>Syndicate Encrypted Night Frequency</span>
                  </div>
                  <Badge color="mafia">Private</Badge>
                </div>

                {/* Teammate Picks / Alignment */}
                {me?.teammates && me.teammates.length > 0 && (
                  <div className="p-3.5 bg-surface-2 border border-border space-y-2 text-sm">
                    <div className="text-xs text-muted font-medium">Syndicate alignment:</div>
                    <div className="space-y-1.5">
                      {Object.entries(teammatePicks).map(([mateId, pickId]) => {
                        const mate = gameView.players.find((p) => p.id === mateId);
                        const pickedPlayer = gameView.players.find((p) => p.id === pickId);
                        const isMe = mateId === me.id;
                        return (
                          <div key={mateId} className="flex items-center justify-between">
                            <span className="text-muted">{isMe ? 'You' : mate?.name}:</span>
                            <span className={pickedPlayer ? 'text-white font-semibold' : 'text-muted/60'}>
                              {pickedPlayer ? pickedPlayer.name : 'Choosing...'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {gameView.settings.mafiaKillMode === 'unanimous' && !mafiaAgreed && (
                      <div className="text-xs text-amber-300 pt-1.5 border-t border-border">
                        ⚠️ Unanimous kill required: both Mafia must select the same target!
                      </div>
                    )}
                  </div>
                )}

                {/* Secret Syndicate Chat Messages */}
                <div className="h-72 overflow-y-auto bg-surface-2 border border-border p-3.5 space-y-2.5 text-sm">
                  {gameView.chat
                    .filter((m) => m.channel === 'mafia')
                    .map((msg) => (
                      <div key={msg.id} className="leading-snug">
                        <span className="font-semibold text-white mr-1.5">{msg.senderName}:</span>
                        <span className="text-muted">{msg.text}</span>
                      </div>
                    ))}
                  {gameView.chat.filter((m) => m.channel === 'mafia').length === 0 && (
                    <div className="text-muted text-sm text-center pt-16">
                      No secret night transmissions yet. Coordinate target with partner here.
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="flex gap-2.5 pt-2 border-t border-border">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Whisper to syndicate partner..."
                  maxLength={300}
                  className="flex-1 bg-surface-2 border border-border rounded-none px-3.5 py-2 text-sm text-text placeholder-muted/50 focus:outline-none focus:border-white"
                />
                <Button type="submit" variant="primary" size="md">
                  <Send className="w-4 h-4 mr-1" />
                  <span>Send</span>
                </Button>
              </form>
            </div>
          ) : isDead ? (
            /* Graveyard Chat for Dead Players */
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2 text-sm font-bold text-text">
                    <MessageSquare className="w-4 h-4" />
                    <span>Graveyard Spirits Chat</span>
                  </div>
                  <Badge color="muted">Dead Only</Badge>
                </div>

                <div className="h-72 overflow-y-auto bg-surface-2 border border-border p-3.5 space-y-2.5 text-sm">
                  {gameView.chat
                    .filter((m) => m.channel === 'dead')
                    .map((msg) => (
                      <div key={msg.id} className="leading-snug">
                        <span className="font-semibold text-white mr-1.5">{msg.senderName}:</span>
                        <span className="text-muted">{msg.text}</span>
                      </div>
                    ))}
                </div>
              </div>

              <form onSubmit={handleSendChat} className="flex gap-2.5 pt-2 border-t border-border">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Whisper among the fallen..."
                  maxLength={300}
                  className="flex-1 bg-surface-2 border border-border rounded-none px-3.5 py-2 text-sm text-text placeholder-muted/50 focus:outline-none focus:border-white"
                />
                <Button type="submit" variant="secondary" size="md">
                  <Send className="w-4 h-4 mr-1" />
                  <span>Send</span>
                </Button>
              </form>
            </div>
          ) : (
            /* Night Guidance & Manual */
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-sm font-bold text-text">
                    Role Directives
                  </span>
                  <Badge color="muted">Night {gameView.round}</Badge>
                </div>

                <div className="p-4 bg-surface-2 border border-border space-y-3 text-sm">
                  <div className="font-bold text-white">{roleDef?.name} Directive:</div>
                  <p className="text-muted leading-relaxed">{roleDef?.howToPlay}</p>
                  <div className="pt-2 border-t border-border">
                    <span className="text-white font-semibold">Victory Goal: </span>
                    <span className="text-muted">{roleDef?.winCondition}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted font-medium">Tactical tips:</div>
                  <ul className="space-y-1.5 text-xs text-muted">
                    {roleDef?.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-white">·</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Button
                variant="secondary"
                size="md"
                onClick={() => onOpenHelp('my-role')}
                className="w-full text-sm font-semibold"
              >
                Open Full Role Dossier [I]
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Night Action"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-surface-2 border border-border flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm text-text leading-relaxed">
              {me?.nightPick === 'hold' ? (
                <div>Are you sure you want to hold fire tonight?</div>
              ) : (
                <div>
                  Are you sure you want to confirm action on <strong className="text-white underline">{selectedTargetPlayer?.name}</strong>?
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setConfirmModalOpen(false)} kbd="Esc">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleFinalConfirm} kbd="Enter">
              Confirm Action
            </Button>
          </div>
        </div>
      </Modal>

      {/* Role Peek HUD Modal (When holding R) */}
      <AnimatePresence>
        {isPeeking && roleDef && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
            <div className="max-w-md w-full bg-surface border border-white p-6 text-center space-y-4 rounded-none shadow-2xl">
              <Badge color="mafia">{roleDef.team}</Badge>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {roleDef.name}
              </h3>
              <p className="text-sm text-muted leading-relaxed">{roleDef.summary}</p>
              <div className="p-3.5 bg-surface-2 border border-border text-sm text-text">
                {roleDef.howToPlay}
              </div>
              <div className="text-xs text-muted">
                Release [R] key to hide role HUD
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
