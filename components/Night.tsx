'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Shield, Users, MessageSquare, Send, Check, FileText, Skull, AlertCircle, Eye, Crosshair } from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { ROLES, RoleDef } from '@/lib/content';
import { TargetPicker } from './TargetPicker';
import { Button, Badge, Modal, CenterTimer, RubberStamp } from './ui';
import { useShortcut } from '@/lib/shortcuts';

interface NightProps {
  gameView: ClientGameView;
  onNightAction: (targetId: string | 'hold', confirm?: boolean) => void;
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
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);

  const me = gameView.me;
  const role = me?.role;
  const roleDef: RoleDef | null = role ? ROLES[role] : null;

  const isDead = me ? !me.alive : false;
  const isMafia = role === 'mafia' || role === 'godfather';
  const canActNow = Boolean(me?.canActNow);
  const isConfirmed = Boolean(me?.isConfirmed);

  const effectivePick = pendingTargetId || me?.nightPick;
  const selectedTargetPlayer = gameView.players.find((p) => p.id === effectivePick);

  const handleConfirmActionClick = () => {
    if (!canActNow || isConfirmed || !effectivePick) return;
    onNightAction(effectivePick, true);
    onConfirmNightAction?.(effectivePick);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !onSendChat) return;
    const channel: 'mafia' | 'dead' = isMafia ? 'mafia' : 'dead';
    onSendChat(channel, chatInput.trim());
    setChatInput('');
  };

  // Check Mafia agreement in unanimous mode
  const teammatePicks = me?.teammatePicks || {};
  const mafiaPicksArray = Object.values(teammatePicks).filter(Boolean);
  const mafiaAgreed =
    mafiaPicksArray.length > 0 && mafiaPicksArray.every((pick) => pick === mafiaPicksArray[0]);

  return (
    <div className="w-full max-w-[1650px] 2xl:max-w-[1850px] mx-auto p-3 sm:p-5 lg:p-8 space-y-6 select-none">
      {/* 1930s Streetlamp Header */}
      <div className="relative overflow-hidden bg-[#101216] border border-[#262A33] p-5 sm:p-7 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#3E5A78]/50 to-transparent" />
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded border border-[#3E5A78]/40 bg-[#16222F]/40 flex items-center justify-center text-[#93c5fd] shadow-inner">
            <Moon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[10px] tracking-widest text-[#93c5fd] uppercase font-bold px-2 py-0.5 bg-[#16222F] border border-[#3E5A78]/50">
                CASE #{gameView.code} · NIGHT OPS
              </span>
              <h2 className="text-xl md:text-2xl font-serif font-black text-[#ECE6D8] tracking-tight">
                Night Operations · Round {gameView.round}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#A39D90] font-mono mt-1">
              {canActNow
                ? roleDef?.howToPlay || 'Select your secret target and confirm action.'
                : isDead
                ? 'You have fallen. Observe the night and converse with other spirits.'
                : 'The city sleeps in darkness. Keep your device face down to disguise activity.'}
            </p>
          </div>
        </div>

        {/* Center Countdown Timer */}
        {!gameView.settings.noTimer && (
          <div className="flex items-center gap-4">
            <CenterTimer
              phaseEndsAt={gameView.phaseEndsAt}
              serverNow={gameView.serverNow}
              label={`${roleDef?.name || 'Night'} Ends In`}
              size="md"
              noTimer={gameView.settings.noTimer}
            />
          </div>
        )}

        {/* Role Peek / Badge */}
        <div className="flex items-center gap-3">
          {roleDef && (
            <Badge color="mafia" className="font-serif tracking-wider">{roleDef.name}</Badge>
          )}
          <span className="text-xs font-mono text-[#A39D90] hidden md:inline bg-[#171A20] px-2.5 py-1 border border-[#262A33]">
            Hold [R] to peek role
          </span>
        </div>
      </div>

      {/* Two-Column Operation Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: TargetPicker & Main Operation Stage (7 cols on Desktop) */}
        <div className="lg:col-span-7 bg-[#101216] border border-[#262A33] p-5 sm:p-7 space-y-6 flex flex-col justify-between shadow-2xl">
          {!canActNow ? (
            isDead ? (
              /* Dead Player Status */
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#262A33]">
                  <Skull className="w-5 h-5 text-[#B3363B]" />
                  <span className="text-sm font-serif font-bold tracking-wide text-[#ECE6D8]">
                    The Graveyard · Fallen Operatives
                  </span>
                </div>
                <p className="text-sm text-[#A39D90] leading-relaxed font-mono">
                  You have been eliminated from active town governance. You may monitor remaining suspects and converse with spirits on the private right-hand frequency.
                </p>
                <div className="p-4 bg-[#171A20] border border-[#262A33] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-serif font-bold text-[#ECE6D8]">Spectral Wire Active</span>
                    <p className="text-[11px] text-[#A39D90]">Other deceased players can hear your whispers</p>
                  </div>
                  <RubberStamp variant="eliminated" size="sm" text="FALLEN" />
                </div>
              </div>
            ) : (
              /* Decoy Screen for Sleeping living players */
              <div className="py-12 text-center space-y-6 flex-1 flex flex-col items-center justify-center">
                <div className="w-20 h-20 border border-[#262A33] bg-[#171A20] flex items-center justify-center p-4 shadow-inner">
                  <Moon className="w-10 h-10 text-[#A39D90]" />
                </div>
                <div className="max-w-md space-y-2">
                  <h3 className="text-xl font-serif font-black text-[#ECE6D8] tracking-wide">
                    Close your eyes...
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A39D90] font-mono leading-relaxed">
                    Keep your device level. Tap the decoy pad below to disguise night movements from neighboring players.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDecoyTaps((t) => t + 1)}
                  className="w-full max-w-sm h-36 border border-dashed border-[#262A33] hover:border-[#D9A441] bg-[#171A20]/60 hover:bg-[#171A20] transition-colors flex flex-col items-center justify-center text-xs font-mono text-[#A39D90] hover:text-[#ECE6D8] select-none gap-2 shadow-inner"
                >
                  <span className="tracking-wide">Harmless decoy touch pad (Tap freely)</span>
                  {decoyTaps > 0 && (
                    <span className="text-xs font-bold text-[#D9A441] bg-[#0A0B0E] px-3 py-1 border border-[#262A33]">
                      Tap count: {decoyTaps}
                    </span>
                  )}
                </button>
              </div>
            )
          ) : (
            /* Active Target Picker Stage */
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#262A33]">
                <span className="text-sm font-serif font-bold text-[#ECE6D8] tracking-wide">
                  {isMafia
                    ? 'Syndicate Kill Order'
                    : role === 'doctor'
                    ? "Doctor's Clinic Protection"
                    : role === 'police'
                    ? 'Police Department Investigation'
                    : 'Vigilante Night Watch'}
                </span>

                <div className="flex items-center gap-3">
                  {!gameView.settings.noTimer && (
                    <CenterTimer
                      phaseEndsAt={gameView.phaseEndsAt}
                      serverNow={gameView.serverNow}
                      label="Action Timer"
                      size="sm"
                      noTimer={gameView.settings.noTimer}
                    />
                  )}
                  {me?.shotsRemaining !== undefined && (
                    <span className="text-xs md:text-sm font-mono font-bold text-[#D9A441] px-2.5 py-1 bg-[#171A20] border border-[#262A33]">
                      Ammo: {me.shotsRemaining} remaining
                    </span>
                  )}
                  {role === 'doctor' && (
                    <span className="text-xs text-[#A39D90] font-mono">
                      Self-saves: <strong className="text-[#ECE6D8]">{me?.doctorSelfSavesRemaining === 999 ? 'Unlimited' : (me?.doctorSelfSavesRemaining ?? 1)}</strong>
                      {!gameView.settings.doctorSameTargetTwice && me?.doctorLastSavedId && (
                        <span> · No repeat saves</span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Target Picker Grid */}
              <TargetPicker
                players={gameView.players}
                myPlayerId={me?.id || ''}
                roleDef={roleDef}
                selectedId={effectivePick || null}
                onSelect={(targetId) => {
                  setPendingTargetId(targetId);
                  onNightAction(targetId, false);
                }}
                mode="night"
                allowHoldFire={role === 'vigilante'}
                disabled={isConfirmed}
                teammatePicks={me?.teammatePicks}
                investigations={me?.policeInbox}
                doctorSelfSavesRemaining={me?.doctorSelfSavesRemaining}
                doctorLastSavedId={me?.doctorLastSavedId}
                doctorSameTargetTwice={gameView.settings.doctorSameTargetTwice}
              />

              {/* Confirm Action Button & Status Bar */}
              <div className="pt-4 border-t border-[#262A33] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs sm:text-sm font-mono text-[#A39D90]">
                  {isConfirmed ? (
                    <span className="text-[#5E8C7B] font-bold flex items-center gap-2">
                      <Check className="w-4 h-4" /> Order confirmed. Advancing once all players ready...
                    </span>
                  ) : selectedTargetPlayer ? (
                    <span>
                      Selected: <strong className="text-[#ECE6D8] underline font-bold font-serif">{selectedTargetPlayer.name}</strong>
                    </span>
                  ) : effectivePick === 'hold' ? (
                    <span className="text-[#D9A441] font-bold">Holding fire tonight</span>
                  ) : (
                    <span>Select a target above to confirm</span>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  disabled={(!effectivePick && effectivePick !== 'hold') || isConfirmed}
                  onClick={handleConfirmActionClick}
                  className="w-full sm:w-auto font-serif font-black tracking-wider text-xs uppercase"
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
                <div className="pt-4 border-t border-[#262A33] space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-[#D9A441]" />
                    <span>Confidential Investigation Dossier:</span>
                  </div>
                  <div className="space-y-2">
                    {me.policeInbox.map((entry, idx) => {
                      const target = gameView.players.find((p) => p.id === entry.targetId);
                      const resLower = entry.result.toLowerCase();
                      const isNotMafia = resLower.includes('not');
                      const isMaf = !isNotMafia && (resLower.includes('mafia') || resLower.includes('godfather'));
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-[#171A20] border border-[#262A33] text-xs font-mono"
                        >
                          <span className="font-bold text-[#ECE6D8] font-serif">{target?.name || 'Subject'}:</span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-bold font-mono text-[11px] uppercase tracking-wider rounded-[2px] border shrink-0 ${
                              isMaf
                                ? 'bg-[#1C0D0E] text-[#FF8585] border-[#B3363B] shadow-[0_0_8px_rgba(179,54,59,0.35)]'
                                : 'bg-[#0A1814] text-[#7CE4B5] border-[#5E8C7B] shadow-[0_0_8px_rgba(94,140,123,0.35)]'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isMaf ? 'bg-[#FF8585]' : 'bg-[#7CE4B5]'}`} />
                            <span>{isMaf ? 'MAFIA' : 'NOT MAFIA'}</span>
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
        <div className="lg:col-span-5 bg-[#101216] border border-[#262A33] p-5 sm:p-7 space-y-5 flex flex-col justify-between shadow-2xl">
          {isMafia ? (
            /* Mafia Syndicate Private Tactical Hub */
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#262A33]">
                  <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider">
                    <Users className="w-4 h-4 text-[#B3363B]" />
                    <span>Syndicate Encrypted Night Frequency</span>
                  </div>
                  <Badge color="mafia" className="font-mono text-[10px]">Private</Badge>
                </div>

                {/* Teammate Picks / Alignment */}
                {me?.teammates && me.teammates.length > 0 && (
                  <div className="p-3.5 bg-[#171A20] border border-[#262A33] space-y-2 text-xs font-mono">
                    <div className="text-[11px] text-[#A39D90] font-bold uppercase tracking-wider">Syndicate alignment:</div>
                    <div className="space-y-1.5">
                      {Object.entries(teammatePicks).map(([mateId, pickId]) => {
                        const mate = gameView.players.find((p) => p.id === mateId);
                        const pickedPlayer = gameView.players.find((p) => p.id === pickId);
                        const isMe = mateId === me.id;
                        const roleName = isMe ? (role === 'godfather' ? 'Godfather' : 'Mafia') : (mate?.role === 'godfather' ? 'Godfather' : 'Mafia');
                        return (
                          <div key={mateId} className="flex items-center justify-between">
                            <span className="text-[#A39D90] flex items-center gap-1.5">
                              <span>{isMe ? 'You' : mate?.name}</span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] font-bold uppercase ${
                                roleName === 'Godfather'
                                  ? 'bg-[#D9A441]/20 text-[#D9A441] border border-[#D9A441]/50'
                                  : 'bg-[#B3363B]/20 text-[#fca5a5] border border-[#B3363B]/50'
                              }`}>
                                {roleName === 'Godfather' ? '👑 Godfather' : '🔪 Mafia'}
                              </span>
                            </span>
                            <span className={pickedPlayer ? 'text-[#D9A441] font-bold' : 'text-[#A39D90]/50'}>
                              {pickedPlayer ? pickedPlayer.name : 'Choosing...'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {gameView.settings.mafiaKillMode === 'unanimous' && !mafiaAgreed && (
                      <div className="text-xs text-[#D9A441] pt-1.5 border-t border-[#262A33] font-bold">
                        ⚠️ Unanimous kill required: both Mafia must select the same target!
                      </div>
                    )}
                  </div>
                )}

                {/* Secret Syndicate Chat Messages */}
                <div className="h-64 sm:h-72 overflow-y-auto bg-[#0A0B0E] border border-[#262A33] p-3.5 space-y-2 text-xs font-mono">
                  {gameView.chat
                    .filter((m) => m.channel === 'mafia')
                    .map((msg) => (
                      <div key={msg.id} className="leading-relaxed">
                        <span className="font-bold text-[#D9A441] mr-1.5">{msg.senderName}:</span>
                        <span className="text-[#ECE6D8]">{msg.text}</span>
                      </div>
                    ))}
                  {gameView.chat.filter((m) => m.channel === 'mafia').length === 0 && (
                    <div className="text-[#A39D90] text-center pt-20">
                      No secret night transmissions yet. Coordinate target with partner here.
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Input */}
              {gameView.settings.mafiaNightChat ? (
                <form onSubmit={handleSendChat} className="flex gap-2.5 pt-2 border-t border-[#262A33]">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Whisper to syndicate partner..."
                    maxLength={300}
                    className="flex-1 bg-[#171A20] border border-[#262A33] px-3.5 py-2 text-xs font-mono text-[#ECE6D8] placeholder-[#A39D90]/50 focus:outline-none focus:border-[#D9A441]"
                  />
                  <Button type="submit" variant="primary" size="md">
                    <Send className="w-3.5 h-3.5 mr-1" />
                    <span>Send</span>
                  </Button>
                </form>
              ) : (
                <div className="p-3 border-t border-[#262A33] bg-[#171A20] text-xs font-mono text-[#A39D90] text-center">
                  Syndicate night chat is disabled by room rules.
                </div>
              )}
            </div>
          ) : isDead ? (
            /* Graveyard Chat for Dead Players */
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#262A33]">
                  <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider">
                    <MessageSquare className="w-4 h-4 text-[#A39D90]" />
                    <span>Graveyard Spirits Chat</span>
                  </div>
                  <Badge color="muted" className="font-mono text-[10px]">Dead Only</Badge>
                </div>

                <div className="h-64 sm:h-72 overflow-y-auto bg-[#0A0B0E] border border-[#262A33] p-3.5 space-y-2 text-xs font-mono">
                  {gameView.chat
                    .filter((m) => m.channel === 'dead')
                    .map((msg) => (
                      <div key={msg.id} className="leading-relaxed">
                        <span className="font-bold text-[#A39D90] mr-1.5">{msg.senderName}:</span>
                        <span className="text-[#ECE6D8]">{msg.text}</span>
                      </div>
                    ))}
                </div>
              </div>

              {gameView.settings.deadChat ? (
                <form onSubmit={handleSendChat} className="flex gap-2.5 pt-2 border-t border-[#262A33]">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Whisper among the fallen..."
                    maxLength={300}
                    className="flex-1 bg-[#171A20] border border-[#262A33] px-3.5 py-2 text-xs font-mono text-[#ECE6D8] placeholder-[#A39D90]/50 focus:outline-none focus:border-[#D9A441]"
                  />
                  <Button type="submit" variant="secondary" size="md">
                    <Send className="w-3.5 h-3.5 mr-1" />
                    <span>Send</span>
                  </Button>
                </form>
              ) : (
                <div className="p-3 border-t border-[#262A33] bg-[#171A20] text-xs font-mono text-[#A39D90] text-center">
                  Graveyard spirits chat is disabled by room rules.
                </div>
              )}
            </div>
          ) : (
            /* Night Guidance & Manual */
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#262A33]">
                  <span className="text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider">
                    Role Directives
                  </span>
                  <Badge color="muted" className="font-mono text-[10px]">Night {gameView.round}</Badge>
                </div>

                <div className="p-4 bg-[#171A20] border border-[#262A33] space-y-3 text-xs font-mono">
                  <div className="font-bold font-serif text-sm text-[#ECE6D8]">{roleDef?.name} Directive:</div>
                  <p className="text-[#A39D90] leading-relaxed">{roleDef?.howToPlay}</p>
                  <div className="pt-2 border-t border-[#262A33]">
                    <span className="text-[#ECE6D8] font-bold">Victory Goal: </span>
                    <span className="text-[#A39D90]">{roleDef?.winCondition}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase text-[#A39D90] font-bold tracking-wider">Tactical tips:</div>
                  <ul className="space-y-1.5 text-xs font-mono text-[#A39D90]">
                    {roleDef?.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#D9A441]">▪</span>
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
                className="w-full text-xs font-serif font-bold tracking-wider uppercase"
              >
                Open Full Role Dossier [I]
              </Button>
            </div>
          )}
        </div>
      </div>



      {/* Role Peek HUD Modal (When holding R) */}
      <AnimatePresence>
        {isPeeking && roleDef && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <div className="max-w-md w-full bg-[#101216] border border-[#D9A441]/60 p-6 text-center space-y-4 shadow-2xl">
              <Badge color="mafia" className="font-mono text-xs tracking-widest uppercase">{roleDef.team}</Badge>
              <h3 className="text-2xl font-serif font-black text-[#ECE6D8] tracking-tight">
                {roleDef.name}
              </h3>
              <p className="text-xs font-mono text-[#A39D90] leading-relaxed">{roleDef.summary}</p>
              <div className="p-3.5 bg-[#171A20] border border-[#262A33] text-xs font-mono text-[#ECE6D8]">
                {roleDef.howToPlay}
              </div>
              <div className="text-[11px] font-mono text-[#A39D90]">
                Release [R] key to hide role HUD
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

