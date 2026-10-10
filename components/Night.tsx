'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Eye, X, Shield, Users, MessageSquare, Send, Check, AlertTriangle, FileText, Skull } from 'lucide-react';
import { ClientGameView, Role } from '@/lib/types';
import { ROLES, RoleDef } from '@/lib/content';
import { TargetPicker } from './TargetPicker';
import { Button, Badge, Kbd } from './ui';
import { briefingCardVariants, peekHudVariants } from '@/lib/motion';
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

  const handleConfirmAction = () => {
    if (!canActNow || isConfirmed) return;
    onConfirmNightAction?.(me?.nightPick || undefined);
  };

  const selectedTargetPlayer = gameView.players.find((p) => p.id === me?.nightPick);

  // Check Mafia agreement in unanimous mode
  const teammatePicks = me?.teammatePicks || {};
  const mafiaPicksArray = Object.values(teammatePicks).filter(Boolean);
  const mafiaAgreed =
    mafiaPicksArray.length > 0 && mafiaPicksArray.every((pick) => pick === mafiaPicksArray[0]);

  return (
    <div className="relative min-h-[calc(100vh-60px)] flex flex-col p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Night Header */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <Moon className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl md:text-2xl font-heading font-bold text-text">
            Night {gameView.round}
          </h2>
        </div>
        <p className="text-xs text-muted">
          {canActNow
            ? roleDef?.howToPlay || 'Make your secret move and confirm to advance.'
            : isDead
            ? 'You have fallen. Observe the night and converse with other spirits.'
            : 'The city sleeps in darkness. Secret actions unfold silently in the shadows.'}
        </p>
      </div>

      {/* Main Night Action or Decoy / Graveyard Screen */}
      {!canActNow ? (
        isDead ? (
          /* Graveyard Screen for Dead Players */
          <div className="flex-1 flex flex-col bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-muted pb-3 border-b border-border">
              <Skull className="w-5 h-5 text-zinc-400" />
              <div>
                <h3 className="font-heading text-sm font-semibold text-text">The Graveyard</h3>
                <p className="text-[11px] text-muted">Spirits of eliminated citizens may converse freely.</p>
              </div>
            </div>

            {/* Dead Chat Messages */}
            <div className="flex-1 min-h-[250px] overflow-y-auto bg-surface-2/60 border border-border rounded-xl p-3 space-y-2 text-xs">
              {gameView.chat
                .filter((m) => m.channel === 'dead')
                .map((msg) => (
                  <div key={msg.id} className="leading-snug">
                    <span className="font-bold text-zinc-400 mr-1.5">{msg.senderName}:</span>
                    <span className="text-text">{msg.text}</span>
                  </div>
                ))}
            </div>

            {/* Dead Chat Input */}
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Whisper among the fallen..."
                maxLength={300}
                className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-text placeholder-muted/60 focus:outline-none focus:ring-1 focus:ring-muted"
              />
              <Button type="submit" variant="secondary" size="sm">
                <Send className="w-3.5 h-3.5 mr-1" />
                <span>Send</span>
              </Button>
            </form>
          </div>
        ) : (
          /* Atmospheric Sleeping Decoy View for Living Players whose turn it isn't */
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-surface-2/60 border border-border flex items-center justify-center relative animate-pulse">
              <Moon className="w-10 h-10 text-indigo-400" />
            </div>

            <div className="max-w-md space-y-2">
              <h3 className="font-heading text-lg font-semibold text-text">Close your eyes...</h3>
              <p className="text-xs text-muted leading-relaxed">
                The city sleeps under quiet skies. Keep your device face down or tap freely to disguise activity
                from watchful eyes nearby.
              </p>
            </div>

            {/* Harmless fake interactive tapping zone */}
            <button
              type="button"
              onClick={() => setDecoyTaps((t) => t + 1)}
              className="w-full max-w-sm h-32 rounded-2xl border border-dashed border-border/80 bg-surface/40 hover:bg-surface-2/40 active:scale-[0.99] transition-all flex flex-col items-center justify-center text-xs text-muted select-none gap-1"
            >
              <span>Harmless decoy touch pad (Tap freely)</span>
              {decoyTaps > 0 && <span className="text-[10px] opacity-60">Taps: {decoyTaps}</span>}
            </button>
          </div>
        )
      ) : (
        /* Active Role Dashboard */
        <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-5 shadow-xl">
          {/* Role Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-semibold text-text">
                {isMafia
                  ? 'Mafia Syndicate Kill Order'
                  : role === 'doctor'
                  ? "Doctor's Clinic Protection"
                  : role === 'police'
                  ? 'Police Department Investigation'
                  : 'Vigilante Night Watch'}
              </span>
              {roleDef && (
                <Badge
                  color={
                    roleDef.team === 'mafia'
                      ? 'mafia'
                      : roleDef.team === 'town'
                      ? 'doctor'
                      : 'jester'
                  }
                >
                  {roleDef.nightVerb?.toUpperCase() || 'ACTION'}
                </Badge>
              )}
            </div>

            {me?.shotsRemaining !== undefined && (
              <span className="text-xs font-mono font-semibold text-day-amber">
                Ammo: {me.shotsRemaining} remaining
              </span>
            )}
          </div>

          {/* Mafia Teammates & Agreement Status */}
          {isMafia && me?.teammates && me.teammates.length > 0 && (
            <div className="p-3 rounded-xl bg-surface-2/60 border border-border text-xs space-y-2">
              <div className="font-semibold text-mafia flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Syndicate Alignment:</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.entries(teammatePicks).map(([mateId, pickId]) => {
                  const mate = gameView.players.find((p) => p.id === mateId);
                  const pickedPlayer = gameView.players.find((p) => p.id === pickId);
                  const isMe = mateId === me.id;
                  return (
                    <div
                      key={mateId}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px]"
                    >
                      <span className="font-bold text-text">{isMe ? 'You' : mate?.name}:</span>
                      <span className={pickedPlayer ? 'text-mafia font-semibold' : 'text-muted'}>
                        {pickedPlayer ? pickedPlayer.name : 'Choosing...'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {gameView.settings.mafiaKillMode === 'unanimous' && !mafiaAgreed && (
                <div className="flex items-center gap-1.5 text-amber-400 text-[11px] pt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Unanimous kill required: both Mafia must select the same target!</span>
                </div>
              )}
            </div>
          )}

          {/* Target Picker */}
          <TargetPicker
            players={gameView.players}
            myPlayerId={me?.id || ''}
            roleDef={roleDef}
            selectedId={me?.nightPick || null}
            onSelect={(targetId) => onNightAction(targetId)}
            mode="night"
            allowHoldFire={role === 'vigilante'}
            disabled={isConfirmed}
          />

          {/* Confirm Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-muted">
              {isConfirmed ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Action confirmed. Advancing once all ready...
                </span>
              ) : selectedTargetPlayer ? (
                <span>
                  Selected:{' '}
                  <strong className="text-text font-semibold">{selectedTargetPlayer.name}</strong>
                </span>
              ) : me?.nightPick === 'hold' ? (
                <span>Holding fire tonight</span>
              ) : (
                <span>Select a target above to confirm</span>
              )}
            </div>

            <Button
              variant={isMafia ? 'danger' : 'accent'}
              size="md"
              disabled={(!me?.nightPick && me?.nightPick !== 'hold') || isConfirmed}
              onClick={handleConfirmAction}
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

          {/* Police Confidential Dossier */}
          {role === 'police' && me?.policeInbox && me.policeInbox.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                <FileText className="w-3.5 h-3.5 text-day-amber" />
                <span>Your Investigation Records (Strictly Confidential):</span>
              </div>
              <div className="space-y-1.5">
                {me.policeInbox.map((entry, idx) => {
                  const target = gameView.players.find((p) => p.id === entry.targetId);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-surface-2 border border-border text-xs"
                    >
                      <span className="font-semibold text-text">{target?.name || 'Subject'}:</span>
                      <span
                        className={
                          entry.result.toLowerCase().includes('mafia')
                            ? 'font-bold text-mafia'
                            : 'font-semibold text-emerald-400'
                        }
                      >
                        {entry.result}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mafia Syndicate Secret Night Chat */}
          {isMafia && (
            <div className="mt-6 pt-4 border-t border-border space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-mafia">
                <MessageSquare className="w-4 h-4" />
                <span>Syndicate Secret Night Frequency (Private)</span>
              </div>

              {/* Chat Messages Log */}
              <div className="h-32 overflow-y-auto bg-surface-2/60 border border-border rounded-xl p-3 space-y-2 text-xs">
                {gameView.chat
                  .filter((m) => m.channel === 'mafia')
                  .map((msg) => (
                    <div key={msg.id} className="leading-snug">
                      <span className="font-bold text-mafia mr-1.5">{msg.senderName}:</span>
                      <span className="text-text">{msg.text}</span>
                    </div>
                  ))}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Coordinate target with partner..."
                  maxLength={300}
                  className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-text placeholder-muted/60 focus:outline-none focus:ring-1 focus:ring-mafia"
                />
                <Button type="submit" variant="danger" size="sm">
                  <Send className="w-3.5 h-3.5 mr-1" />
                  <span>Send</span>
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Post-Reveal Briefing Card (Dismissible) */}
      <AnimatePresence>
        {showBriefing && roleDef && (
          <motion.div
            variants={briefingCardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-[400px] z-40 bg-surface border-2 rounded-2xl p-4 shadow-2xl space-y-3"
            style={{ borderColor: `${roleDef.colour}70` }}
          >
            {/* Header with Close X */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm font-bold" style={{ color: roleDef.colour }}>
                  {roleDef.name}
                </span>
                <Badge color={roleDef.team === 'mafia' ? 'mafia' : roleDef.team === 'town' ? 'doctor' : 'jester'}>
                  {roleDef.team.toUpperCase()}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => setShowBriefing(false)}
                className="p-1 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors"
                aria-label="Close role briefing"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text leading-relaxed">{roleDef.summary}</p>

            <div className="space-y-1.5 text-xs bg-surface-2/60 p-2.5 rounded-xl border border-border">
              <div>
                <span className="font-semibold text-text">Tonight: </span>
                <span className="text-muted">{roleDef.howToPlay}</span>
              </div>
              <div>
                <span className="font-semibold text-text">Victory Goal: </span>
                <span className="text-muted">{roleDef.winCondition}</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowBriefing(false);
                  onOpenHelp('my-role');
                }}
                className="text-xs text-day-amber hover:underline"
              >
                Detailed Role Guide →
              </button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowBriefing(false)}
                kbd="Esc"
              >
                Got It
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role Peek HUD (Triggered when holding R) */}
      <AnimatePresence>
        {isPeeking && roleDef && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              variants={peekHudVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="max-w-sm w-full bg-surface border-2 rounded-2xl p-6 text-center space-y-4 shadow-2xl"
              style={{ borderColor: roleDef.colour }}
            >
              <Badge color={roleDef.team === 'mafia' ? 'mafia' : roleDef.team === 'town' ? 'doctor' : 'jester'}>
                {roleDef.team.toUpperCase()}
              </Badge>
              <h3 className="font-heading text-2xl font-bold" style={{ color: roleDef.colour }}>
                {roleDef.name}
              </h3>
              <p className="text-xs text-text leading-relaxed">{roleDef.summary}</p>
              <div className="p-3 bg-surface-2 rounded-xl text-xs text-muted">
                {roleDef.howToPlay}
              </div>
              <div className="text-[11px] text-muted italic">
                Release [R] key to hide role HUD
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
