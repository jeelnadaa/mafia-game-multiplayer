'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, Sun, Gavel, Shield, Eye, HelpCircle, Key, FileText, ScrollText } from 'lucide-react';
import { ROLES, BASICS_STEPS, RoleDef } from '@/lib/content';
import { SHORTCUTS, useShortcut, pushScope, popScope } from '@/lib/shortcuts';
import { ClientGameView, Role } from '@/lib/types';
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
          {/* Mobile Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Container (Desktop right drawer, Mobile bottom sheet) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="fixed z-50 bottom-0 md:top-0 right-0 w-full md:w-[420px] max-h-[88vh] md:max-h-full h-full bg-surface border-t md:border-t-0 md:border-l border-border rounded-t-2xl md:rounded-none flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-2/40">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-day-amber" />
                <h2 className="font-heading font-semibold text-text text-base">Game Guide & Rules</h2>
              </div>
              <div className="flex items-center gap-2">
                {gameView?.phase && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-surface text-muted border border-border">
                    {gameView.phase.toUpperCase()}
                  </span>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors"
                  aria-label="Close guide"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Tabs Header */}
            <div className="flex items-center gap-1 p-2 border-b border-border overflow-x-auto no-scrollbar bg-bg/50">
              {tabList.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-border text-text font-semibold shadow-sm'
                      : 'text-muted hover:text-text hover:bg-surface-2'
                  }`}
                >
                  <span>{tab.label}</span>
                  <Kbd>{tab.num}</Kbd>
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Tab 1: Basics */}
              {activeTab === 'basics' && (
                <div className="space-y-4">
                  <div className="p-3 bg-surface-2 rounded-xl border border-border">
                    <h3 className="font-heading text-sm font-semibold text-day-amber mb-1">How Mafia Works</h3>
                    <p className="text-xs text-muted leading-relaxed">
                      Mafia is a social deduction game of deception and logic. Two teams clash: the uninformed majority
                      (Town) versus the informed minority (Mafia).
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {BASICS_STEPS.map((s) => (
                      <div key={s.step} className="p-3 bg-surface-2/60 border border-border rounded-xl flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-border flex items-center justify-center text-xs font-mono font-bold text-text shrink-0">
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
                    <div className="p-4 bg-god/10 border border-god/30 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge color="god">THE NARRATOR</Badge>
                      </div>
                      <h3 className="font-heading text-base font-bold text-god">God Mode Active</h3>
                      <p className="text-xs text-muted">
                        You hold the reins of the match. You oversee all secret picks, manual assignments, and phase controls.
                      </p>
                    </div>
                  ) : !roleDef ? (
                    <div className="p-6 text-center border border-dashed border-border rounded-xl space-y-2">
                      <Moon className="w-8 h-8 text-muted mx-auto" />
                      <div className="text-sm font-semibold text-text">No Role Assigned Yet</div>
                      <p className="text-xs text-muted">
                        Roles are distributed secretly once the host starts the match.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Shoulder Surfing Guard */}
                      <div className="p-3 bg-surface-2 border border-border rounded-xl flex items-center justify-between">
                        <div className="text-xs text-muted">Privacy Mode (Shoulder-surf guard)</div>
                        <button
                          type="button"
                          onMouseDown={() => setShowRoleSecret(true)}
                          onMouseUp={() => setShowRoleSecret(false)}
                          onTouchStart={() => setShowRoleSecret(true)}
                          onTouchEnd={() => setShowRoleSecret(false)}
                          className="px-3 py-1 bg-border hover:bg-border/80 text-text rounded-lg text-xs font-medium"
                        >
                          {showRoleSecret ? 'Revealed' : 'Hold to View'}
                        </button>
                      </div>

                      <div
                        className={`p-4 rounded-xl border border-border transition-all duration-300 ${
                          showRoleSecret ? 'filter-none' : 'filter blur-sm select-none'
                        }`}
                        style={{ backgroundColor: `${roleDef.colour}10`, borderColor: `${roleDef.colour}40` }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-heading text-lg font-bold" style={{ color: roleDef.colour }}>
                            {roleDef.name}
                          </h3>
                          <Badge color={roleDef.team === 'mafia' ? 'mafia' : roleDef.team === 'town' ? 'doctor' : 'jester'}>
                            {roleDef.team.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-text mb-3 leading-relaxed">{roleDef.summary}</p>
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="font-semibold text-text">Night Action: </span>
                            <span className="text-muted">{roleDef.howToPlay}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-text">Win Goal: </span>
                            <span className="text-muted">{roleDef.winCondition}</span>
                          </div>
                        </div>

                        {/* Mafia Teammates */}
                        {gameView?.me?.teammates && gameView.me.teammates.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-border/50">
                            <div className="text-xs font-semibold text-mafia mb-1">Syndicate Teammates:</div>
                            <div className="flex flex-wrap gap-1.5">
                              {gameView.me.teammates.map((tid) => {
                                const p = gameView.players.find((x) => x.id === tid);
                                return (
                                  <span key={tid} className="px-2 py-0.5 rounded bg-mafia/20 text-mafia text-xs">
                                    {p?.name || 'Teammate'}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Tips */}
                      <div className="p-3 bg-surface-2 border border-border rounded-xl space-y-1.5">
                        <div className="text-xs font-semibold text-text">Strategic Tips:</div>
                        {roleDef.tips.map((tip, i) => (
                          <div key={i} className="text-xs text-muted flex gap-1.5">
                            <span className="text-day-amber">▪</span>
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
                    Roles active in this room ({gameView?.settings?.roles ? 'configured by host' : 'defaults'}):
                  </div>
                  {Object.values(ROLES)
                    .filter((r) => r.id !== 'god')
                    .map((r) => (
                      <div key={r.id} className="p-3 bg-surface-2 border border-border rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-heading text-xs font-bold text-text">{r.name}</span>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-bg border border-border" style={{ color: r.colour }}>
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
                  <div className="text-xs text-muted">Active room configuration in plain words:</div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-surface-2 border border-border rounded-lg">
                      <span className="font-semibold text-text">Voting Tie: </span>
                      <span className="text-muted">
                        {gameView?.settings?.tieRule === 'revote_then_none'
                          ? 'One revote between tied candidates, else nobody'
                          : gameView?.settings?.tieRule === 'random'
                          ? 'Randomly picks one of the tied players'
                          : 'Nobody is eliminated on a tie'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-surface-2 border border-border rounded-lg">
                      <span className="font-semibold text-text">Role Reveal on Death: </span>
                      <span className="text-muted">
                        {gameView?.settings?.revealRoleOnDeath === 'full'
                          ? 'Exact role revealed upon death'
                          : gameView?.settings?.revealRoleOnDeath === 'alignment'
                          ? 'Only team alignment revealed'
                          : 'Hidden until game ends'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-surface-2 border border-border rounded-lg">
                      <span className="font-semibold text-text">Doctor Self-Save: </span>
                      <span className="text-muted">{gameView?.settings?.doctorSelfSave || 'once'}</span>
                    </div>
                    <div className="p-2.5 bg-surface-2 border border-border rounded-lg">
                      <span className="font-semibold text-text">Police Findings: </span>
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
                  <div className="text-xs text-muted mb-2">Chronological public event ledger:</div>
                  {(!gameView?.log || gameView.log.length === 0) ? (
                    <div className="text-center py-6 text-xs text-muted">No public events logged yet.</div>
                  ) : (
                    gameView.log.map((entry) => (
                      <div key={entry.id} className="p-2.5 bg-surface-2 border border-border rounded-lg text-xs space-y-0.5">
                        <div className="flex items-center justify-between text-[10px] text-muted font-mono">
                          <span>ROUND {entry.round} · {entry.phase.toUpperCase()}</span>
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
                    <div className="text-xs font-semibold text-text mb-1">Suspect Roster (Private):</div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {gameView?.players?.map((p) => {
                        const tag = playerTags[p.id] || 'neutral';
                        return (
                          <div key={p.id} className="flex items-center justify-between p-2 bg-surface-2 border border-border rounded-lg text-xs">
                            <span className="text-text font-medium">{p.name}</span>
                            <button
                              type="button"
                              onClick={() => toggleTag(p.id)}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase transition-colors ${
                                tag === 'trust'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : tag === 'suspect'
                                  ? 'bg-mafia/20 text-mafia border border-mafia/30'
                                  : 'bg-surface text-muted border border-border'
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
                    <div className="text-xs font-semibold text-text mb-1">Private Detective Scratchpad:</div>
                    <textarea
                      value={privateNotes}
                      onChange={(e) => saveNotes(e.target.value)}
                      placeholder="Record observations, suspect claims, contradictions..."
                      rows={5}
                      className="w-full bg-surface-2 border border-border rounded-xl p-3 text-xs text-text placeholder-muted/60 focus:outline-none focus:ring-1 focus:ring-day-amber"
                    />
                    <span className="text-[10px] text-muted">Stored locally in your browser only. Never transmitted.</span>
                  </div>
                </div>
              )}

              {/* Tab 7: Keyboard Keys */}
              {activeTab === 'keys' && (
                <div className="space-y-3">
                  <div className="text-xs text-muted mb-2">Available keyboard shortcuts:</div>
                  <div className="space-y-1.5">
                    {SHORTCUTS.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-2 bg-surface-2 border border-border rounded-lg text-xs">
                        <span className="text-muted">{s.description}</span>
                        <Kbd className="text-text">{s.label}</Kbd>
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
