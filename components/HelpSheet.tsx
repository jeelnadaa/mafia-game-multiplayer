'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, Sun, Gavel, HelpCircle, Shield, BookOpen, Clock, FileText, Check, Lock, Key } from 'lucide-react';
import { ROLES, BASICS_STEPS, RoleDef } from '@/lib/content';
import { SHORTCUTS, useShortcut, pushScope, popScope } from '@/lib/shortcuts';
import { ClientGameView } from '@/lib/types';
import { Kbd, Badge, RedactionShield, RubberStamp } from './ui';

export type HelpTab = 'basics' | 'my-role' | 'roles' | 'rules' | 'log' | 'notes' | 'keys';

interface HelpSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: HelpTab;
  gameView?: ClientGameView | null;
}

export function HelpSheet({ isOpen, onClose, initialTab = 'basics', gameView }: HelpSheetProps) {
  const [activeTab, setActiveTab] = useState<HelpTab>(initialTab);
  const [showRoleSecret, setShowRoleSecret] = useState(false);
  const [privateNotes, setPrivateNotes] = useState('');
  const [playerTags, setPlayerTags] = useState<Record<string, 'trust' | 'suspect' | 'neutral'>>({});
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Sync initial tab when changed
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Scope management for keyboard shortcuts
  useEffect(() => {
    if (isOpen) {
      pushScope('sheet');
      return () => popScope('sheet');
    }
  }, [isOpen]);

  // Live countdown ticker inside rulebook header
  useEffect(() => {
    if (!isOpen || !gameView?.phaseEndsAt) {
      setTimeLeft('');
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((gameView.phaseEndsAt! - Date.now()) / 1000));
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isOpen, gameView?.phaseEndsAt]);

  // Tab switching shortcuts (1-7, Arrow keys, Esc)
  useShortcut(['1', '2', '3', '4', '5', '6', '7'], (e) => {
    const tabs: HelpTab[] = ['basics', 'my-role', 'roles', 'rules', 'log', 'notes', 'keys'];
    const idx = parseInt(e.key, 10) - 1;
    if (tabs[idx]) setActiveTab(tabs[idx]);
  }, { scope: 'sheet', enabled: isOpen });

  useShortcut('ArrowRight', () => {
    const tabs: HelpTab[] = ['basics', 'my-role', 'roles', 'rules', 'log', 'notes', 'keys'];
    const curr = tabs.indexOf(activeTab);
    setActiveTab(tabs[(curr + 1) % tabs.length]);
  }, { scope: 'sheet', enabled: isOpen });

  useShortcut('ArrowLeft', () => {
    const tabs: HelpTab[] = ['basics', 'my-role', 'roles', 'rules', 'log', 'notes', 'keys'];
    const curr = tabs.indexOf(activeTab);
    setActiveTab(tabs[(curr - 1 + tabs.length) % tabs.length]);
  }, { scope: 'sheet', enabled: isOpen });

  useShortcut('Escape', () => {
    onClose();
  }, { scope: 'sheet', enabled: isOpen });

  // Load private notes for this room code from localStorage
  const code = gameView?.code || 'default';
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`mafia-notes:${code}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPrivateNotes(parsed.text || '');
          setPlayerTags(parsed.tags || {});
        } catch {}
      }
    }
  }, [code]);

  const saveNotes = (text: string, tags = playerTags) => {
    setPrivateNotes(text);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`mafia-notes:${code}`, JSON.stringify({ text, tags }));
    }
  };

  const toggleTag = (playerId: string) => {
    const current = playerTags[playerId] || 'neutral';
    const next: 'trust' | 'suspect' | 'neutral' =
      current === 'neutral' ? 'suspect' : current === 'suspect' ? 'trust' : 'neutral';
    const updated = { ...playerTags, [playerId]: next };
    setPlayerTags(updated);
    saveNotes(privateNotes, updated);
  };

  const myRole = gameView?.me?.role;
  const roleDef: RoleDef | null = myRole ? ROLES[myRole] : null;

  const tabList: { id: HelpTab; label: string; num: string }[] = [
    { id: 'basics', label: 'Basics', num: '1' },
    { id: 'my-role', label: 'Your Role', num: '2' },
    { id: 'roles', label: 'All Roles', num: '3' },
    { id: 'rules', label: 'House Rules', num: '4' },
    { id: 'log', label: 'Case Log', num: '5' },
    { id: 'notes', label: 'Notes', num: '6' },
    { id: 'keys', label: 'Keys', num: '7' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Subtle Scrim that keeps the round table visible behind */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Container (Desktop right drawer ~520px, Mobile bottom sheet) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed z-50 bottom-0 md:top-0 right-0 w-full md:w-[520px] max-h-[92vh] md:max-h-full h-full bg-[#101216] border-t md:border-t-0 md:border-l border-[#262A33] flex flex-col shadow-2xl overflow-hidden select-none"
            aria-label="Documentation & Rules Manual"
          >
            {/* Header: Title + Context Timer Chip */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#262A33] bg-[#171A20]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded border border-[#D9A441]/40 bg-[#0A0B0E] flex items-center justify-center text-[#D9A441]">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-serif font-black text-[#ECE6D8] text-base tracking-wide flex items-center gap-2">
                    <span>The Rulebook</span>
                    <span className="font-mono text-[9px] px-1.5 py-0.2 bg-[#0A0B0E] border border-[#262A33] text-[#A39D90] font-normal uppercase">
                      CASE #{gameView?.code || 'MANUAL'}
                    </span>
                  </h2>
                  <div className="text-[11px] font-mono text-[#A39D90]">Confidential Field Manual</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Live Context Chip */}
                {gameView?.phase && gameView.phase !== 'lobby' && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0A0B0E] border border-[#D9A441]/50 text-xs font-mono text-[#D9A441]">
                    <Clock className="w-3 h-3 text-[#D9A441]" />
                    <span className="capitalize">{gameView.phase} {gameView.round}</span>
                    {timeLeft && <span className="font-bold">· {timeLeft}</span>}
                  </div>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-[#A39D90] hover:text-[#ECE6D8] hover:bg-[#262A33] transition-colors"
                  aria-label="Close guide"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Tabs Header */}
            <div className="flex items-center gap-1 p-2 border-b border-[#262A33] overflow-x-auto no-scrollbar bg-[#0A0B0E]">
              {tabList.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-serif font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 border uppercase tracking-wider ${
                    activeTab === tab.id
                      ? 'bg-[#D9A441] text-[#0A0B0E] border-[#D9A441]'
                      : 'text-[#A39D90] hover:text-[#ECE6D8] border-transparent hover:border-[#262A33] bg-[#171A20]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <Kbd className={`text-[9px] px-1 py-0.2 border ${activeTab === tab.id ? 'bg-[#0A0B0E]/20 text-[#0A0B0E] border-[#0A0B0E]/30' : 'bg-[#0A0B0E] text-[#A39D90] border-[#262A33]'}`}>
                    {tab.num}
                  </Kbd>
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Tab 1: Basics (Illustrated Strip) */}
              {activeTab === 'basics' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#171A20] border border-[#262A33] space-y-1.5">
                    <h3 className="text-xs font-serif font-bold uppercase tracking-wider text-[#D9A441]">
                      Rules of Engagement
                    </h3>
                    <p className="text-xs font-mono text-[#A39D90] leading-relaxed">
                      Two factions clash in the city shadows: the uninformed majority (Town) versus the informed syndicate (Mafia). Town wins by purging all syndicate operatives. The Mafia wins by achieving parity.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Three-Beat Loop Strip */}
                    <div className="p-4 bg-[#171A20] border border-[#262A33] flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded border border-[#3E5A78]/50 bg-[#16222F] flex items-center justify-center text-[#93c5fd] shrink-0 mt-0.5">
                        <Moon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-serif font-bold text-xs text-[#ECE6D8] uppercase tracking-wider">
                          1. Night Phase · Silent Strikes
                        </div>
                        <p className="text-xs font-mono text-[#A39D90] mt-0.5 leading-relaxed">
                          The town sleeps. Mafia coordinate secret elimination orders, the Doctor protects one life, and Police investigate suspect records.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#171A20] border border-[#262A33] flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded border border-[#D9A441]/50 bg-[#0A0B0E] flex items-center justify-center text-[#D9A441] shrink-0 mt-0.5">
                        <Sun className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-serif font-bold text-xs text-[#ECE6D8] uppercase tracking-wider">
                          2. Day Phase · Public Deliberation
                        </div>
                        <p className="text-xs font-mono text-[#A39D90] mt-0.5 leading-relaxed">
                          Dawn sirens break the silence. Casualties are announced, evidence is cross-examined, alibis are probed, and accusations are voiced.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#171A20] border border-[#262A33] flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded border border-[#B3363B]/50 bg-[#7E2327]/30 flex items-center justify-center text-[#fca5a5] shrink-0 mt-0.5">
                        <Gavel className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-serif font-bold text-xs text-[#ECE6D8] uppercase tracking-wider">
                          3. Vote Phase · Court Verdict
                        </div>
                        <p className="text-xs font-mono text-[#A39D90] mt-0.5 leading-relaxed">
                          Citizens cast official ballots. The candidate receiving the majority ballot is eliminated, or the town chooses to skip.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Your Role (Classified Dossier with RedactionShield) */}
              {activeTab === 'my-role' && (
                <div className="space-y-4">
                  {gameView?.me?.isGod ? (
                    <div className="p-5 bg-[#171A20] border border-[#D9A441]/60 space-y-2">
                      <Badge color="god" className="font-mono text-xs">The Narrator</Badge>
                      <h3 className="text-base font-serif font-black text-[#ECE6D8]">Omniscient Overseer Active</h3>
                      <p className="text-xs font-mono text-[#A39D90] leading-relaxed">
                        You oversee the entire game flow. Control phases, inspect secret logs, and advance rounds using the top control bar.
                      </p>
                    </div>
                  ) : !roleDef ? (
                    <div className="p-8 text-center border border-dashed border-[#262A33] space-y-2">
                      <Moon className="w-8 h-8 text-[#A39D90] mx-auto" />
                      <div className="text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider">No Role Assigned Yet</div>
                      <p className="text-xs font-mono text-[#A39D90]">
                        Roles are distributed secretly once the host starts the match.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Privacy Shield using RedactionShield */}
                      <RedactionShield
                        isRedacted={!showRoleSecret}
                        onToggle={() => setShowRoleSecret(!showRoleSecret)}
                        label="Hold to read classified dossier"
                      >
                        <div className="p-5 bg-[#171A20] border border-[#262A33] space-y-3.5 shadow-xl">
                          <div className="flex items-center justify-between pb-2 border-b border-[#262A33]">
                            <div>
                              <span className="text-[10px] font-mono text-[#D9A441] uppercase tracking-widest block font-bold">
                                CLASSIFIED ASSIGNMENT
                              </span>
                              <h3 className="text-xl font-serif font-black text-[#ECE6D8] tracking-tight">
                                {roleDef.name}
                              </h3>
                            </div>
                            <Badge color="mafia" className="font-serif">{roleDef.team}</Badge>
                          </div>

                          <p className="text-xs font-mono text-[#ECE6D8] leading-relaxed">{roleDef.summary}</p>

                          <div className="space-y-2 text-xs font-mono pt-1">
                            <div className="p-2.5 bg-[#0A0B0E] border border-[#262A33]">
                              <span className="font-bold text-[#D9A441]">Night Directive: </span>
                              <span className="text-[#A39D90]">{roleDef.howToPlay}</span>
                            </div>
                            <div className="p-2.5 bg-[#0A0B0E] border border-[#262A33]">
                              <span className="font-bold text-[#D9A441]">Victory Goal: </span>
                              <span className="text-[#A39D90]">{roleDef.winCondition}</span>
                            </div>
                          </div>

                          {/* Mafia Teammates */}
                          {gameView?.me?.teammates && gameView.me.teammates.length > 0 && (
                            <div className="pt-3 border-t border-[#262A33]">
                              <div className="text-[11px] font-serif font-bold text-[#ECE6D8] uppercase tracking-wider mb-1.5">
                                Syndicate Partners:
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {gameView.me.teammates.map((tid) => {
                                  const p = gameView.players.find((x) => x.id === tid);
                                  return (
                                    <span key={tid} className="px-2.5 py-1 border border-[#B3363B]/60 bg-[#7E2327]/30 text-[#fca5a5] text-xs font-mono font-bold">
                                      {p?.name || 'Teammate'}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </RedactionShield>

                      {/* Handwritten / Typewriter Margin Notes for Tactical Tips */}
                      <div className="p-4 bg-[#171A20] border-l-2 border-l-[#D9A441] border border-[#262A33] space-y-2">
                        <div className="text-xs font-serif font-bold text-[#D9A441] uppercase tracking-wider">
                          Tactical Advisory Notes:
                        </div>
                        <ul className="space-y-1.5 text-xs font-mono text-[#A39D90]">
                          {roleDef.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-[#D9A441]">▪</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: All Roles (Deck of Cards) */}
              {activeTab === 'roles' && (
                <div className="space-y-3">
                  {gameView?.settings?.revealRoleList === false ? (
                    <div className="p-8 text-center border border-dashed border-[#262A33] space-y-2">
                      <div className="text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider">Role Pool is Secret</div>
                      <p className="text-xs font-mono text-[#A39D90]">
                        Room settings have concealed the active role roster. Use discussion and deduction to uncover roles!
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="text-xs font-mono text-[#A39D90]">
                        Active match roles and directives:
                      </div>
                      {Object.values(ROLES)
                        .filter((r) => r.id !== 'god')
                        .map((r) => {
                          const roleCount = r.id in (gameView?.settings?.roles || {})
                            ? (gameView?.settings?.roles as unknown as Record<string, number>)[r.id]
                            : (r.id === 'civilian' ? 1 : 0);
                          const isInMatch = (roleCount ?? 0) > 0;
                          return (
                            <div
                              key={r.id}
                              className={`p-3.5 border transition-all ${
                                isInMatch
                                  ? 'bg-[#171A20] border-[#262A33]'
                                  : 'bg-[#101216] border-[#262A33]/40 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between pb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-serif font-bold text-[#ECE6D8]">{r.name}</span>
                                  {isInMatch && (
                                    <span className="text-[9px] font-mono font-bold text-[#D9A441] px-1.5 bg-[#0A0B0E] border border-[#262A33]">
                                      x{roleCount} Active
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] font-serif uppercase px-2 py-0.5 border border-[#262A33] bg-[#0A0B0E] text-[#A39D90]">
                                  {r.team}
                                </span>
                              </div>
                              <p className="text-xs font-mono text-[#A39D90] leading-relaxed">{r.summary}</p>
                            </div>
                          );
                        })}
                    </>
                  )}
                </div>
              )}

              {/* Tab 4: House Rules (Plain English Effective Settings) */}
              {activeTab === 'rules' && (
                <div className="space-y-3">
                  <div className="text-xs font-mono text-[#A39D90]">Effective house rules for this case file:</div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="p-3 bg-[#171A20] border border-[#262A33] flex items-center justify-between">
                      <span className="font-bold text-[#ECE6D8]">Voting Tie Rule:</span>
                      <span className="text-[#D9A441]">
                        {gameView?.settings?.tieRule === 'revote_then_none'
                          ? 'One revote between tied candidates, else nobody'
                          : gameView?.settings?.tieRule === 'random'
                          ? 'Randomly picks one candidate'
                          : 'Nobody eliminated on tie'}
                      </span>
                    </div>

                    <div className="p-3 bg-[#171A20] border border-[#262A33] flex items-center justify-between">
                      <span className="font-bold text-[#ECE6D8]">Role Reveal on Death:</span>
                      <span className="text-[#D9A441]">
                        {gameView?.settings?.revealRoleOnDeath === 'full'
                          ? 'Exact role revealed upon death'
                          : gameView?.settings?.revealRoleOnDeath === 'alignment'
                          ? 'Only team alignment revealed'
                          : 'Concealed until match ends'}
                      </span>
                    </div>

                    <div className="p-3 bg-[#171A20] border border-[#262A33] flex items-center justify-between">
                      <span className="font-bold text-[#ECE6D8]">Doctor Self-Save:</span>
                      <span className="text-[#D9A441] capitalize">{gameView?.settings?.doctorSelfSave || 'once'}</span>
                    </div>

                    <div className="p-3 bg-[#171A20] border border-[#262A33] flex items-center justify-between">
                      <span className="font-bold text-[#ECE6D8]">Police Findings:</span>
                      <span className="text-[#D9A441]">
                        {gameView?.settings?.policeResultDelay === 0
                          ? 'Immediate report upon confirm'
                          : `${gameView?.settings?.policeResultDelay} round(s) delay`}
                      </span>
                    </div>

                    <div className="p-3 bg-[#171A20] border border-[#262A33] flex items-center justify-between">
                      <span className="font-bold text-[#ECE6D8]">Ballot Visibility:</span>
                      <span className="text-[#D9A441] capitalize">{gameView?.settings?.voteVisibility || 'public'}</span>
                    </div>

                    <div className="p-3 bg-[#171A20] border border-[#262A33] flex items-center justify-between">
                      <span className="font-bold text-[#ECE6D8]">Timers:</span>
                      <span className="text-[#D9A441]">
                        Night {gameView?.settings?.nightDuration || 35}s · Discussion {gameView?.settings?.discussionDuration || 60}s · Vote {gameView?.settings?.votingDuration || 30}s
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Case Log (Typed Case-File Entries) */}
              {activeTab === 'log' && (
                <div className="space-y-2.5">
                  <div className="text-xs font-mono text-[#A39D90]">Public event archive:</div>
                  {(!gameView?.log || gameView.log.length === 0) ? (
                    <div className="text-center py-8 text-xs font-mono text-[#A39D90]">
                      No public events recorded yet.
                    </div>
                  ) : (
                    gameView.log.map((entry) => (
                      <div key={entry.id} className="p-3 bg-[#171A20] border border-[#262A33] text-xs font-mono space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-[#A39D90]">
                          <span className="uppercase text-[#D9A441]">Round {entry.round} · {entry.phase}</span>
                        </div>
                        <div className="text-[#ECE6D8] leading-relaxed">{entry.text}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 6: Notes (Private Detective Scratchpad) */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider mb-2">
                      Suspect Alignment Tags (Private):
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {gameView?.players?.map((p) => {
                        const tag = playerTags[p.id] || 'neutral';
                        return (
                          <div key={p.id} className="flex items-center justify-between p-2.5 bg-[#171A20] border border-[#262A33] text-xs font-mono">
                            <span className="font-serif font-bold text-[#ECE6D8]">{p.name}</span>
                            <button
                              type="button"
                              onClick={() => toggleTag(p.id)}
                              className={`px-2.5 py-0.5 border text-xs capitalize transition-colors ${
                                tag === 'trust'
                                  ? 'bg-[#16222F] text-[#86efac] border-[#5E8C7B] font-bold'
                                  : tag === 'suspect'
                                  ? 'bg-[#7E2327]/60 text-[#fca5a5] border-[#B3363B] font-bold'
                                  : 'bg-[#0A0B0E] text-[#A39D90] border-[#262A33]'
                              }`}
                            >
                              {tag}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider mb-1.5">
                      Private Detective Scratchpad:
                    </div>
                    <textarea
                      value={privateNotes}
                      onChange={(e) => saveNotes(e.target.value)}
                      placeholder="Record observations, contradictions, deductions..."
                      rows={5}
                      className="w-full bg-[#171A20] border border-[#262A33] p-3 text-xs font-mono text-[#ECE6D8] placeholder-[#A39D90]/50 focus:outline-none focus:border-[#D9A441]"
                    />
                    <span className="text-[10px] font-mono text-[#A39D90] block mt-1">
                      Stored locally in your browser. Never transmitted over peer mesh.
                    </span>
                  </div>
                </div>
              )}

              {/* Tab 7: Keyboard Keys */}
              {activeTab === 'keys' && (
                <div className="space-y-3">
                  <div className="text-xs font-mono text-[#A39D90] mb-2">Available tactical keyboard shortcuts:</div>
                  <div className="space-y-1.5">
                    {SHORTCUTS.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-2.5 bg-[#171A20] border border-[#262A33] text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-[#ECE6D8]">{s.description}</span>
                          {s.hostOnly && (
                            <span className="px-1.5 py-0.2 bg-[#7E2327]/40 border border-[#B3363B] text-[9px] font-mono text-[#fca5a5]">
                              Host Only
                            </span>
                          )}
                        </div>
                        <Kbd className="text-[#D9A441] border-[#262A33] bg-[#0A0B0E] font-bold">{s.label}</Kbd>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

