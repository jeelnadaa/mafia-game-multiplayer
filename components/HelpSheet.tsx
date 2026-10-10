'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, HelpCircle } from 'lucide-react';
import { ROLES, BASICS_STEPS, RoleDef } from '@/lib/content';
import { SHORTCUTS, useShortcut, pushScope, popScope } from '@/lib/shortcuts';
import { ClientGameView } from '@/lib/types';
import { Kbd, Badge } from './ui';

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
    { id: 'my-role', label: 'My Role', num: '2' },
    { id: 'roles', label: 'Roles', num: '3' },
    { id: 'rules', label: 'Rules', num: '4' },
    { id: 'log', label: 'Log', num: '5' },
    { id: 'notes', label: 'Notes', num: '6' },
    { id: 'keys', label: 'Keys', num: '7' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/80"
          />

          {/* Drawer Container (Desktop right drawer, Mobile bottom sheet) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed z-50 bottom-0 md:top-0 right-0 w-full md:w-[480px] max-h-[90vh] md:max-h-full h-full bg-surface border-t md:border-t-0 md:border-l border-border rounded-none flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-white" />
                <h2 className="font-sans font-bold text-text text-sm">
                  Documentation & Rules Manual
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {gameView?.phase && (
                  <span className="px-2 py-0.5 rounded-none text-xs font-medium bg-black text-white border border-border capitalize">
                    {gameView.phase}
                  </span>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-none text-muted hover:text-white hover:bg-zinc-800 transition-colors"
                  aria-label="Close guide"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Tabs Header */}
            <div className="flex items-center gap-1 p-2 border-b border-border overflow-x-auto no-scrollbar bg-black">
              {tabList.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-none text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 border ${
                    activeTab === tab.id
                      ? 'bg-white text-black border-white font-semibold'
                      : 'text-muted hover:text-text border-transparent hover:border-border bg-surface-2'
                  }`}
                >
                  <span>{tab.label}</span>
                  <Kbd className="bg-transparent border-current text-current">{tab.num}</Kbd>
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Tab 1: Basics */}
              {activeTab === 'basics' && (
                <div className="space-y-4">
                  <div className="p-3 bg-surface-2 rounded-none border border-border">
                    <h3 className="text-xs font-semibold text-white mb-1">
                      How Mafia Works
                    </h3>
                    <p className="text-xs text-muted leading-relaxed">
                      Mafia is a social deduction game of deception and logic. Two teams clash: the uninformed majority
                      (Town) versus the informed minority (Mafia). The town wins by eliminating all Mafia, while the Mafia wins by reaching equal numbers.
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {BASICS_STEPS.map((s) => (
                      <div key={s.step} className="p-3 bg-surface-2 border border-border rounded-none flex gap-3">
                        <div className="w-6 h-6 border border-border bg-black flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {s.step}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-text">{s.title}</div>
                          <div className="text-xs text-muted mt-0.5 leading-relaxed">{s.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: My Role */}
              {activeTab === 'my-role' && (
                <div className="space-y-4">
                  {gameView?.me?.isGod ? (
                    <div className="p-4 bg-surface-2 border border-border rounded-none space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge color="god">The Narrator</Badge>
                      </div>
                      <h3 className="text-sm font-bold text-white">God Mode Active</h3>
                      <p className="text-xs text-muted leading-relaxed">
                        You oversee the entire game flow. Control phases, inspect secret logs, and advance rounds using the top control bar.
                      </p>
                    </div>
                  ) : !roleDef ? (
                    <div className="p-6 text-center border border-dashed border-border rounded-none space-y-2">
                      <Moon className="w-8 h-8 text-white mx-auto" />
                      <div className="text-xs font-semibold text-text">No Role Assigned Yet</div>
                      <p className="text-xs text-muted">
                        Roles are distributed secretly once the host starts the match.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Privacy Guard */}
                      <div className="p-3 bg-surface-2 border border-border rounded-none flex items-center justify-between">
                        <div className="text-xs text-muted">Shoulder-surf privacy shield</div>
                        <button
                          type="button"
                          onMouseDown={() => setShowRoleSecret(true)}
                          onMouseUp={() => setShowRoleSecret(false)}
                          onTouchStart={() => setShowRoleSecret(true)}
                          onTouchEnd={() => setShowRoleSecret(false)}
                          className="px-3 py-1 bg-white text-black rounded-none text-xs font-medium"
                        >
                          {showRoleSecret ? 'Revealed' : 'Hold to View'}
                        </button>
                      </div>

                      <div
                        className={`p-4 rounded-none border border-border transition-all duration-200 bg-surface-2 ${
                          showRoleSecret ? 'filter-none' : 'filter blur-sm select-none'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-base font-bold text-white tracking-tight">
                            {roleDef.name}
                          </h3>
                          <Badge color="mafia">{roleDef.team}</Badge>
                        </div>
                        <p className="text-xs text-text mb-3 leading-relaxed">{roleDef.summary}</p>
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="font-semibold text-white">Night Action: </span>
                            <span className="text-muted">{roleDef.howToPlay}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-white">Victory Goal: </span>
                            <span className="text-muted">{roleDef.winCondition}</span>
                          </div>
                        </div>

                        {/* Mafia Teammates */}
                        {gameView?.me?.teammates && gameView.me.teammates.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-border">
                            <div className="text-xs font-semibold text-white mb-1">Syndicate Partners:</div>
                            <div className="flex flex-wrap gap-1.5">
                              {gameView.me.teammates.map((tid) => {
                                const p = gameView.players.find((x) => x.id === tid);
                                return (
                                  <span key={tid} className="px-2 py-0.5 border border-border bg-black text-white text-xs">
                                    {p?.name || 'Teammate'}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Tips */}
                      <div className="p-3 bg-surface-2 border border-border rounded-none space-y-1.5">
                        <div className="text-xs font-semibold text-white">Tactical Tips:</div>
                        {roleDef.tips.map((tip, i) => (
                          <div key={i} className="text-xs text-muted flex gap-2">
                            <span className="text-white">·</span>
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Enabled Roles */}
              {activeTab === 'roles' && (
                <div className="space-y-3">
                  <div className="text-xs text-muted">
                    All game roles:
                  </div>
                  {Object.values(ROLES)
                    .filter((r) => r.id !== 'god')
                    .map((r) => (
                      <div key={r.id} className="p-3 bg-surface-2 border border-border rounded-none space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-text">{r.name}</span>
                          <span className="text-[11px] capitalize px-2 py-0.5 border border-border bg-black text-white">
                            {r.team}
                          </span>
                        </div>
                        <p className="text-xs text-muted leading-relaxed">{r.summary}</p>
                      </div>
                    ))}
                </div>
              )}

              {/* Tab 4: Room Rules */}
              {activeTab === 'rules' && (
                <div className="space-y-3">
                  <div className="text-xs text-muted">Active match rules:</div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-surface-2 border border-border">
                      <span className="font-semibold text-white">Voting Tie: </span>
                      <span className="text-muted">
                        {gameView?.settings?.tieRule === 'revote_then_none'
                          ? 'One revote between tied candidates, else nobody'
                          : gameView?.settings?.tieRule === 'random'
                          ? 'Randomly picks one of the tied candidates'
                          : 'Nobody eliminated on a tie'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-surface-2 border border-border">
                      <span className="font-semibold text-white">Role Reveal on Death: </span>
                      <span className="text-muted">
                        {gameView?.settings?.revealRoleOnDeath === 'full'
                          ? 'Exact role revealed upon death'
                          : gameView?.settings?.revealRoleOnDeath === 'alignment'
                          ? 'Only team alignment revealed'
                          : 'Concealed until match ends'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-surface-2 border border-border">
                      <span className="font-semibold text-white">Doctor Self-Save: </span>
                      <span className="text-muted capitalize">{gameView?.settings?.doctorSelfSave || 'once'}</span>
                    </div>
                    <div className="p-2.5 bg-surface-2 border border-border">
                      <span className="font-semibold text-white">Police Findings: </span>
                      <span className="text-muted">
                        {gameView?.settings?.policeResultDelay === 0
                          ? 'Immediate report upon confirm'
                          : `${gameView?.settings?.policeResultDelay} round(s) delay`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Game Log */}
              {activeTab === 'log' && (
                <div className="space-y-2">
                  <div className="text-xs text-muted mb-2">Public event archive:</div>
                  {(!gameView?.log || gameView.log.length === 0) ? (
                    <div className="text-center py-6 text-xs text-muted">No public events recorded yet.</div>
                  ) : (
                    gameView.log.map((entry) => (
                      <div key={entry.id} className="p-2.5 bg-surface-2 border border-border text-xs space-y-0.5">
                        <div className="flex items-center justify-between text-[11px] text-muted">
                          <span>Round {entry.round} · {entry.phase}</span>
                        </div>
                        <div className="text-text">{entry.text}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 6: Detective Notes */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-white mb-1">Suspect Tags (Private):</div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {gameView?.players?.map((p) => {
                        const tag = playerTags[p.id] || 'neutral';
                        return (
                          <div key={p.id} className="flex items-center justify-between p-2 bg-surface-2 border border-border text-xs">
                            <span className="text-text font-medium">{p.name}</span>
                            <button
                              type="button"
                              onClick={() => toggleTag(p.id)}
                              className={`px-2 py-0.5 border text-xs capitalize transition-colors rounded-none ${
                                tag === 'trust'
                                  ? 'bg-white text-black border-white font-medium'
                                  : tag === 'suspect'
                                  ? 'bg-zinc-800 text-white border-zinc-400 font-medium'
                                  : 'bg-black text-muted border-border'
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
                    <div className="text-xs font-semibold text-white mb-1">Private Detective Scratchpad:</div>
                    <textarea
                      value={privateNotes}
                      onChange={(e) => saveNotes(e.target.value)}
                      placeholder="Record observations, contradictions, deductions..."
                      rows={5}
                      className="w-full bg-surface-2 border border-border rounded-none p-3 text-xs text-text placeholder-muted/50 focus:outline-none focus:border-white"
                    />
                    <span className="text-[11px] text-muted">Stored locally in your browser. Never shared over peer network.</span>
                  </div>
                </div>
              )}

              {/* Tab 7: Keyboard Keys */}
              {activeTab === 'keys' && (
                <div className="space-y-3">
                  <div className="text-xs text-muted mb-2">Available keyboard shortcuts:</div>
                  <div className="space-y-1.5">
                    {SHORTCUTS.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-2 bg-surface-2 border border-border text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-muted">{s.description}</span>
                          {s.hostOnly && (
                            <span className="px-1.5 py-0.2 bg-zinc-800 border border-zinc-600 text-[10px] font-mono text-zinc-300">
                              Host Only
                            </span>
                          )}
                        </div>
                        <Kbd className="text-white">{s.label}</Kbd>
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
