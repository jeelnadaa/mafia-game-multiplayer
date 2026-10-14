'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Moon,
  Sun,
  Gavel,
  BookOpen,
  Clock,
  FileText,
  Check,
  Lock,
  Key,
  Shield,
  Search,
  Crosshair,
  Sparkles,
} from 'lucide-react';
import { ROLES, BASICS_STEPS, RoleDef } from '@/lib/content';
import { SHORTCUTS, useShortcut, pushScope, popScope } from '@/lib/shortcuts';
import { ClientGameView } from '@/lib/types';
import { Kbd, Badge, Modal } from './ui';

export type HelpTab = 'basics' | 'my-role' | 'roles' | 'rules' | 'log' | 'notes' | 'keys';

const VALID_TABS: HelpTab[] = ['basics', 'my-role', 'roles', 'rules', 'log', 'notes', 'keys'];

function normalizeHelpTab(tab: any, fallback: HelpTab = 'basics'): HelpTab {
  if (tab && VALID_TABS.includes(tab as HelpTab)) {
    return tab as HelpTab;
  }
  return fallback;
}

interface HelpSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: HelpTab;
  gameView?: ClientGameView | null;
}

export function HelpSheet({ isOpen, onClose, initialTab = 'basics', gameView }: HelpSheetProps) {
  const [activeTab, setActiveTab] = useState<HelpTab>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mafia_last_help_tab');
        if (saved && VALID_TABS.includes(saved as HelpTab)) return saved as HelpTab;
      } catch (_) {}
    }
    return normalizeHelpTab(initialTab);
  });
  const [previewRole, setPreviewRole] = useState<RoleDef | null>(null);
  const [showRoleSecret, setShowRoleSecret] = useState(false);
  const [privateNotes, setPrivateNotes] = useState('');
  const [playerTags, setPlayerTags] = useState<Record<string, 'trust' | 'suspect' | 'neutral'>>({});
  const [timeLeft, setTimeLeft] = useState<string>('');

  const currentTab = normalizeHelpTab(activeTab);

  const handleTabChange = (tab: HelpTab) => {
    const valid = normalizeHelpTab(tab);
    setActiveTab(valid);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mafia_last_help_tab', valid);
      } catch (_) {}
    }
  };

  // Restore persisted tab on open (prioritize explicit initialTab if provided)
  useEffect(() => {
    if (isOpen) {
      if (initialTab && initialTab !== 'basics') {
        setActiveTab(initialTab);
        if (initialTab === 'my-role') {
          setShowRoleSecret(true);
        }
        return;
      }
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('mafia_last_help_tab');
          if (saved && VALID_TABS.includes(saved as HelpTab)) {
            setActiveTab(saved as HelpTab);
            return;
          }
        } catch (_) {}
      }
      setActiveTab(normalizeHelpTab(initialTab));
    }
  }, [isOpen, initialTab]);

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
  useShortcut(
    ['1', '2', '3', '4', '5', '6', '7'],
    (e) => {
      const tabs: HelpTab[] = ['basics', 'my-role', 'roles', 'rules', 'log', 'notes', 'keys'];
      const idx = parseInt(e.key, 10) - 1;
      if (tabs[idx]) handleTabChange(tabs[idx]);
    },
    { scope: 'sheet', enabled: isOpen }
  );

  useShortcut(
    'ArrowRight',
    () => {
      const tabs: HelpTab[] = ['basics', 'my-role', 'roles', 'rules', 'log', 'notes', 'keys'];
      const curr = tabs.indexOf(activeTab);
      handleTabChange(tabs[(curr + 1) % tabs.length]);
    },
    { scope: 'sheet', enabled: isOpen }
  );

  useShortcut(
    'ArrowLeft',
    () => {
      const tabs: HelpTab[] = ['basics', 'my-role', 'roles', 'rules', 'log', 'notes', 'keys'];
      const curr = tabs.indexOf(activeTab);
      handleTabChange(tabs[(curr - 1 + tabs.length) % tabs.length]);
    },
    { scope: 'sheet', enabled: isOpen }
  );

  useShortcut(
    'Escape',
    () => {
      onClose();
    },
    { scope: 'sheet', enabled: isOpen }
  );

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

  // Helper for role emblem icon
  const renderRoleIcon = (roleName?: string) => {
    if (roleName === 'mafia' || roleName === 'godfather') {
      return (
        <svg viewBox="0 0 120 90" width="34" height="26" aria-hidden="true">
          <ellipse cx="60" cy="64" rx="54" ry="14" fill="#ECE6D8" />
          <path d="M30 64C30 30 40 12 60 12s30 18 30 52z" fill="#ECE6D8" />
          <rect x="31" y="46" width="58" height="11" fill="#B3363B" />
        </svg>
      );
    }
    if (roleName === 'doctor') {
      return <Shield className="w-6 h-6 text-[#5E8C7B]" />;
    }
    if (roleName === 'police') {
      return <Search className="w-6 h-6 text-[#5B7A99]" />;
    }
    if (roleName === 'vigilante') {
      return <Crosshair className="w-6 h-6 text-[#D9A441]" />;
    }
    if (roleName === 'jester') {
      return <Sparkles className="w-6 h-6 text-[#8C6FA0]" />;
    }
    return <BookOpen className="w-6 h-6 text-[#ECE6D8]" />;
  };

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

          {/* Drawer Container (Desktop right drawer 540px matching mockup, Mobile bottom sheet) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed z-50 bottom-0 md:top-0 right-0 w-full md:w-[540px] max-h-[94vh] md:max-h-full h-full bg-[#101216] border-t md:border-t-0 md:border-l border-[#262A33] flex flex-col shadow-[-30px_0_80px_rgba(0,0,0,.6)] overflow-hidden select-none text-[#ECE6D8]"
            aria-label="Rulebook Manual"
          >
            {/* Header matching Examples/Rulebook your role-html/Rulebook.dc.html */}
            <div className="flex items-center justify-between px-7 pt-6 pb-3.5">
              <h2 className="d text-4xl sm:text-[44px] font-extrabold tracking-[2px] uppercase text-[#ECE6D8] m-0">
                RULEBOOK
              </h2>

              <div className="flex items-center gap-3">
                {/* Live Context Timer Chip */}
                {gameView?.phase && gameView.phase !== 'lobby' ? (
                  <span className="t text-[13px] border border-[#D9A441] text-[#D9A441] rounded-full px-3 py-1 font-mono">
                    Now: {gameView.phase.charAt(0).toUpperCase() + gameView.phase.slice(1)} {gameView.round}{' '}
                    {timeLeft ? `· ${timeLeft}` : ''}
                  </span>
                ) : (
                  <span className="t text-[13px] border border-[#D9A441] text-[#D9A441] rounded-full px-3 py-1 font-mono">
                    Case #{gameView?.code || 'OFFICIAL'}
                  </span>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center bg-transparent border border-[#262A33] text-[#ECE6D8] rounded-[4px] text-xl hover:border-bone transition-colors"
                  aria-label="Close rulebook"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Tab Navigation Strip */}
            <div className="flex items-center gap-1 px-7 border-b border-[#262A33] text-[15px] overflow-x-auto no-scrollbar bg-[#101216]">
              {tabList.map((tab) => {
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`py-2.5 px-3 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#171A20] border-b-2 border-[#D9A441] text-[#ECE6D8] font-bold shadow-sm'
                        : 'text-[#A39D90] hover:text-[#ECE6D8] hover:bg-[#171A20]/50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <i className="t not-italic text-[11px] text-[#A39D90] ml-0.5">
                      {tab.num}
                    </i>
                  </button>
                );
              })}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Tab 1: Basics */}
              {currentTab === 'basics' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[4px] space-y-2">
                    <h3 className="t text-[13px] tracking-[3px] font-bold uppercase text-[#D9A441]">
                      Rules of Engagement
                    </h3>
                    <p className="text-sm font-sans text-[#ECE6D8] leading-relaxed">
                      Two factions clash in the city shadows: the uninformed majority (Town) versus the informed syndicate (Mafia). Town wins by purging all syndicate operatives. The Mafia wins by achieving parity.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[4px] flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-[4px] border border-[#5B7FA6]/50 bg-[#16222F] flex items-center justify-center text-[#93c5fd] shrink-0 mt-0.5">
                        <Moon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="d text-2xl font-extrabold text-[#ECE6D8] uppercase tracking-wide">
                          1. Night Phase · Silent Strikes
                        </div>
                        <div className="t text-[11px] tracking-[1px] text-[#5B7FA6] uppercase mt-0.5">
                          Secret Elimination Orders
                        </div>
                        <p className="text-xs font-mono text-[#A39D90] mt-1 leading-relaxed">
                          The town sleeps. Mafia coordinate secret elimination orders, the Doctor shields one targeted life, and Police cross-examine confidential suspect records.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[4px] flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-[4px] border border-[#D9A441]/50 bg-[#0A0B0E] flex items-center justify-center text-[#D9A441] shrink-0 mt-0.5">
                        <Sun className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="d text-2xl font-extrabold text-[#ECE6D8] uppercase tracking-wide">
                          2. Day Phase · Public Deliberation
                        </div>
                        <div className="t text-[11px] tracking-[1px] text-[#D9A441] uppercase mt-0.5">
                          Evidence & Accusation
                        </div>
                        <p className="text-xs font-mono text-[#A39D90] mt-1 leading-relaxed">
                          Dawn sirens break the silence. Night casualties are announced, alibis are probed, contradictions are uncovered, and suspects are nominated.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[4px] flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-[4px] border border-[#B3363B]/50 bg-[#7E2327]/30 flex items-center justify-center text-[#fca5a5] shrink-0 mt-0.5">
                        <Gavel className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="d text-2xl font-extrabold text-[#ECE6D8] uppercase tracking-wide">
                          3. Vote Phase · Town Verdict
                        </div>
                        <div className="t text-[11px] tracking-[1px] text-[#B3363B] uppercase mt-0.5">
                          Courtroom Execution Ballot
                        </div>
                        <p className="text-xs font-mono text-[#A39D90] mt-1 leading-relaxed">
                          Citizens cast official ballots. The suspect receiving majority condemnation is eliminated from the table, or the town votes to skip.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Your Role (Matching Mockup with Classified Card & Redaction Bars) */}
              {currentTab === 'my-role' && (
                <div className="space-y-6">
                  {!roleDef ? (
                    <div className="p-8 text-center border border-dashed border-[#262A33] space-y-2">
                      <Moon className="w-8 h-8 text-[#A39D90] mx-auto" />
                      <div className="text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider">
                        No Role Assigned Yet
                      </div>
                      <p className="text-xs font-mono text-[#A39D90]">
                        Roles are distributed secretly once the host starts the match.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Bone Paper Card matching Rulebook.dc.html */}
                      <div
                        className="rounded-[6px] relative shadow-[0_14px_40px_rgba(0,0,0,.5)] p-[22px] select-none"
                        style={{
                          background: '#ECE6D8',
                          color: '#15130f',
                        }}
                      >
                        {/* Header: Circle Emblem + Title + Allegiance */}
                        <div className="flex items-center gap-3.5">
                          <div className="w-[52px] h-[52px] rounded-full bg-[#15130f] flex items-center justify-center shrink-0">
                            {renderRoleIcon(roleDef.id)}
                          </div>
                          <div>
                            <div
                              className="d text-[44px] font-black leading-none uppercase"
                              style={{
                                color:
                                  roleDef.id === 'mafia' || roleDef.id === 'godfather'
                                    ? '#7E2327'
                                    : roleDef.id === 'police'
                                    ? '#2f4a66'
                                    : '#3d6657',
                              }}
                            >
                              {roleDef.name}
                            </div>
                            <div className="t text-[12px] tracking-[2px] uppercase">
                              {roleDef.team.toUpperCase()} · SECRET
                            </div>
                          </div>
                        </div>

                        {/* Night Action Section */}
                        <div className="mt-[18px]">
                          <div className="t text-[12px] tracking-[2px] font-bold uppercase">
                            NIGHT ACTION
                          </div>
                          {showRoleSecret ? (
                            <div className="text-sm font-sans mt-1 leading-relaxed text-[#15130f]">
                              {roleDef.howToPlay}
                            </div>
                          ) : (
                            <div className="space-y-1 mt-1.5" aria-hidden="true">
                              <div className="h-4 w-[88%] bg-[#0A0B0E]" />
                              <div className="h-4 w-[52%] bg-[#0A0B0E]" />
                            </div>
                          )}
                        </div>

                        {/* Victory Goal Section */}
                        <div className="mt-4">
                          <div className="t text-[12px] tracking-[2px] font-bold uppercase">
                            VICTORY GOAL
                          </div>
                          {showRoleSecret ? (
                            <div className="text-sm font-sans mt-1 leading-relaxed text-[#15130f]">
                              {roleDef.winCondition}
                            </div>
                          ) : (
                            <div className="mt-1.5" aria-hidden="true">
                              <div className="h-4 w-[70%] bg-[#0A0B0E]" />
                            </div>
                          )}
                        </div>

                        {/* What You Know Section */}
                        <div className="mt-4">
                          <div className="t text-[12px] tracking-[2px] font-bold uppercase">
                            WHAT YOU KNOW
                          </div>
                          {showRoleSecret ? (
                            <div className="text-sm font-sans mt-1 leading-relaxed text-[#15130f]">
                              {roleDef.summary}
                              {gameView?.me?.teammates && gameView.me.teammates.length > 0 && (
                                <div className="mt-2 font-mono text-xs font-bold text-blood">
                                  Teammates:{' '}
                                  {gameView.me.teammates
                                    .map((id) => gameView.players.find((p) => p.id === id)?.name || id)
                                    .join(', ')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1 mt-1.5" aria-hidden="true">
                              <div className="h-4 w-[80%] bg-[#0A0B0E]" />
                              <div className="h-4 w-[40%] bg-[#0A0B0E]" />
                            </div>
                          )}
                        </div>

                        {/* Hold To Read Dominant Button */}
                        <button
                          type="button"
                          onPointerDown={() => {
                            setShowRoleSecret(true);
                            const onRel = () => {
                              setShowRoleSecret(false);
                              window.removeEventListener('pointerup', onRel);
                              window.removeEventListener('mouseup', onRel);
                              window.removeEventListener('touchend', onRel);
                              window.removeEventListener('touchcancel', onRel);
                            };
                            window.addEventListener('pointerup', onRel);
                            window.addEventListener('mouseup', onRel);
                            window.addEventListener('touchend', onRel);
                            window.addEventListener('touchcancel', onRel);
                          }}
                          onPointerUp={() => setShowRoleSecret(false)}
                          onPointerLeave={() => setShowRoleSecret(false)}
                          onTouchStart={() => setShowRoleSecret(true)}
                          onTouchEnd={() => setShowRoleSecret(false)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') setShowRoleSecret(true);
                          }}
                          onKeyUp={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') setShowRoleSecret(false);
                          }}
                          className="w-full h-[50px] mt-5 bg-[#D9A441] hover:bg-[#F0D79A] text-[#0A0B0E] font-semibold text-[16px] rounded-[4px] border-0 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer select-none active:scale-[0.98]"
                        >
                          <Lock className="w-4 h-4" />
                          <span>{showRoleSecret ? 'Release to conceal' : 'Hold to read'}</span>
                        </button>
                      </div>

                      {/* Tactical Notes (Matching Mockup with 3 aged paper notes) */}
                      <div className="space-y-2.5 pt-2">
                        <div className="t text-[13px] tracking-[3px] text-[#A39D90] uppercase">
                          TACTICAL NOTES
                        </div>
                        <div className="flex flex-col gap-2.5">
                          <div
                            className="t p-3 text-[15px] rounded-[2px]"
                            style={{
                              background: '#E4DCC4',
                              color: '#15130f',
                              transform: 'rotate(-1deg)',
                            }}
                          >
                            Don&apos;t vote together every single time.
                          </div>
                          <div
                            className="t p-3 text-[15px] rounded-[2px] ml-3.5"
                            style={{
                              background: '#E4DCC4',
                              color: '#15130f',
                              transform: 'rotate(.8deg)',
                            }}
                          >
                            Keep night chat short. Plan, then go quiet.
                          </div>
                          <div
                            className="t p-3 text-[15px] rounded-[2px]"
                            style={{
                              background: '#E4DCC4',
                              color: '#15130f',
                              transform: 'rotate(-.6deg)',
                            }}
                          >
                            By day, be the helpful townsperson.
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tab 3: All Roles */}
              {currentTab === 'roles' && (
                <div className="space-y-3">
                  {gameView?.settings?.revealRoleList === false ? (
                    <div className="p-8 text-center border border-dashed border-[#262A33] space-y-2">
                      <div className="text-xs font-serif font-bold text-[#ECE6D8] uppercase tracking-wider">
                        Role Pool is Secret
                      </div>
                      <p className="text-xs font-mono text-[#A39D90]">
                        Room settings have concealed the active role roster. Use discussion and deduction to uncover roles!
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="t text-[13px] tracking-[3px] text-[#A39D90] uppercase mb-1">
                        ACTIVE ROSTER & CLASSIFIED DIRECTIVES
                      </div>
                      {Object.values(ROLES)
                        .filter((r) => r.id !== 'god')
                        .map((r) => {
                          const rolesConfig = (gameView?.settings?.roles || {}) as Record<string, number>;
                          const hasConfig = r.id in rolesConfig;
                          const roleCount = hasConfig
                            ? rolesConfig[r.id]
                            : gameView?.players?.filter((p) => p.role === r.id).length ?? 0;
                          const isInMatch = (roleCount ?? 0) > 0;
                          const teamColor =
                            r.team === 'mafia' ? '#B3363B' : r.team === 'jester' ? '#8C6FA0' : '#5E8C7B';
                          return (
                            <div
                              key={r.id}
                              onClick={() => setPreviewRole(r)}
                              className={`p-4 rounded-[4px] border transition-all cursor-pointer hover:border-[#D9A441] group ${
                                isInMatch
                                  ? 'bg-[#171A20] border-[#262A33] shadow-md'
                                  : 'bg-[#101216] border-[#262A33]/40 opacity-70 hover:opacity-100'
                              }`}
                            >
                              <div className="flex items-center justify-between pb-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="d text-2xl font-extrabold tracking-wide uppercase text-[#ECE6D8] group-hover:text-[#D9A441] transition-colors">
                                    {r.name}
                                  </span>
                                  {isInMatch && (
                                    <span className="t text-[10px] font-bold text-[#0A0B0E] px-2 py-0.5 bg-[#D9A441] rounded-[2px]">
                                      x{roleCount} IN PLAY
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="t text-[11px] uppercase tracking-wider px-2 py-0.5 border rounded-[2px]"
                                    style={{
                                      borderColor: teamColor,
                                      color: teamColor,
                                      background: 'rgba(10,11,14,0.6)',
                                    }}
                                  >
                                    {r.team}
                                  </span>
                                  <span className="t text-[10px] text-[#A39D90] uppercase tracking-wider border border-[#262A33] px-1.5 py-0.5 rounded-[2px] bg-[#101216] group-hover:border-[#D9A441] group-hover:text-[#D9A441] transition-colors">
                                    DOSSIER ↗
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm font-sans text-[#ECE6D8]/90 leading-relaxed">
                                {r.summary}
                              </p>
                              <div className="t text-[11px] text-[#A39D90] mt-2 pt-2 border-t border-[#262A33]/60 flex items-center justify-between">
                                <span>GOAL: {r.winCondition}</span>
                              </div>
                            </div>
                          );
                        })}
                    </>
                  )}
                </div>
              )}

              {/* Tab 4: House Rules */}
              {currentTab === 'rules' && (
                <div className="space-y-3">
                  <div className="t text-[13px] tracking-[3px] text-[#A39D90] uppercase mb-1">
                    CLASSIFIED HOUSE PARAMETERS
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[4px] flex items-center justify-between">
                      <span className="t text-[12px] uppercase text-[#A39D90]">Voting Tie Rule</span>
                      <span className="text-sm font-sans font-semibold text-[#D9A441]">
                        {gameView?.settings?.tieRule === 'revote_then_none'
                          ? 'Runoff revote, then nobody'
                          : gameView?.settings?.tieRule === 'random'
                          ? 'Randomly picks one candidate'
                          : 'Nobody eliminated on tie'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[4px] flex items-center justify-between">
                      <span className="t text-[12px] uppercase text-[#A39D90]">Role Reveal on Death</span>
                      <span className="text-sm font-sans font-semibold text-[#D9A441]">
                        {gameView?.settings?.revealRoleOnDeath === 'full'
                          ? 'Exact role revealed upon death'
                          : gameView?.settings?.revealRoleOnDeath === 'alignment'
                          ? 'Only team alignment revealed'
                          : 'Concealed until match ends'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[4px] flex items-center justify-between">
                      <span className="t text-[12px] uppercase text-[#A39D90]">Doctor Self-Save</span>
                      <span className="text-sm font-sans font-semibold text-[#D9A441] capitalize">
                        {gameView?.settings?.doctorSelfSave || 'once'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[4px] flex items-center justify-between">
                      <span className="t text-[12px] uppercase text-[#A39D90]">Police Findings</span>
                      <span className="text-sm font-sans font-semibold text-[#D9A441]">
                        {gameView?.settings?.policeResultDelay === 0
                          ? 'Immediate report upon confirm'
                          : `${gameView?.settings?.policeResultDelay} round(s) delay`}
                      </span>
                    </div>

                    <div className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[4px] flex items-center justify-between">
                      <span className="t text-[12px] uppercase text-[#A39D90]">Ballot Visibility</span>
                      <span className="text-sm font-sans font-semibold text-[#D9A441] capitalize">
                        {gameView?.settings?.voteVisibility || 'public'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[4px] flex items-center justify-between">
                      <span className="t text-[12px] uppercase text-[#A39D90]">Phase Clocks</span>
                      <span className="text-sm font-sans font-semibold text-[#D9A441]">
                        Night {gameView?.settings?.nightDuration || 35}s · Discussion{' '}
                        {gameView?.settings?.discussionDuration || 60}s · Vote{' '}
                        {gameView?.settings?.votingDuration || 30}s
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Case Log */}
              {currentTab === 'log' && (
                <div className="space-y-2.5">
                  <div className="t text-[13px] tracking-[3px] text-[#A39D90] uppercase mb-1">
                    TELEGRAM EVENT DISPATCHES
                  </div>
                  {!gameView?.log || gameView.log.length === 0 ? (
                    <div className="text-center py-10 t text-sm text-[#A39D90]">
                      No recorded telegraph dispatches yet.
                    </div>
                  ) : (
                    gameView.log.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[4px] space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] t text-[#D9A441]">
                          <span className="uppercase">
                            Round {entry.round} · {entry.phase}
                          </span>
                        </div>
                        <div className="t text-[13px] text-[#ECE6D8] leading-relaxed">{entry.text}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 6: Notes */}
              {currentTab === 'notes' && (
                <div className="space-y-5">
                  <div>
                    <div className="t text-[13px] tracking-[3px] text-[#A39D90] uppercase mb-2">
                      OPERATIVE TRUST & SUSPICION
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {gameView?.players?.map((p) => {
                        const tag = playerTags[p.id] || 'neutral';
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-3 bg-[#171A20] border border-[#262A33] rounded-[4px]"
                          >
                            <span className="font-sans font-semibold text-sm text-[#ECE6D8]">{p.name}</span>
                            <button
                              type="button"
                              onClick={() => toggleTag(p.id)}
                              className={`px-3 py-1 rounded-[3px] t text-xs uppercase transition-colors cursor-pointer ${
                                tag === 'trust'
                                  ? 'bg-[#16222F] text-[#86efac] border border-[#5E8C7B] font-bold'
                                  : tag === 'suspect'
                                  ? 'bg-[#7E2327]/60 text-[#fca5a5] border border-[#B3363B] font-bold'
                                  : 'bg-[#0A0B0E] text-[#A39D90] border border-[#262A33]'
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
                    <div className="t text-[13px] tracking-[3px] text-[#A39D90] uppercase mb-2">
                      DETECTIVE FIELD SCRATCHPAD
                    </div>
                    <textarea
                      value={privateNotes}
                      onChange={(e) => saveNotes(e.target.value)}
                      placeholder="Record alibis, voting contradictions, night suspicions..."
                      rows={5}
                      className="w-full bg-[#0A0B0E] border border-[#262A33] rounded-[4px] p-3 text-sm font-sans text-[#ECE6D8] placeholder-[#A39D90]/50 focus:outline-none focus:border-[#D9A441]"
                    />
                    <span className="t text-[11px] text-[#A39D90] block mt-1">
                      Stored in local memory only. Zero network leakage.
                    </span>
                  </div>
                </div>
              )}

              {/* Tab 7: Keyboard Keys */}
              {currentTab === 'keys' && (
                <div className="space-y-3">
                  <div className="t text-[13px] tracking-[3px] text-[#A39D90] uppercase mb-2">
                    TACTICAL CONSOLE SHORTCUTS
                  </div>
                  <div className="space-y-2">
                    {SHORTCUTS.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 bg-[#171A20] border border-[#262A33] rounded-[4px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-sans text-[#ECE6D8]">{s.description}</span>
                          {s.hostOnly && (
                            <span className="t px-2 py-0.5 bg-[#7E2327]/40 border border-[#B3363B] text-[9px] text-[#fca5a5] uppercase">
                              Host
                            </span>
                          )}
                        </div>
                        <Kbd className="text-[#D9A441] border-[#262A33] bg-[#0A0B0E] font-bold text-xs px-2 py-1">
                          {s.label}
                        </Kbd>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Dossier Card Modal when viewing a role */}
          {previewRole && (
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
              onClick={() => setPreviewRole(null)}
            >
              <div
                className="bg-[#101216] border border-[#D9A441]/50 rounded-[4px] p-6 max-w-lg w-full shadow-[0_20px_50px_rgba(0,0,0,0.9)] space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between border-b border-[#262A33] pb-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-[#171A20] border border-[#262A33] flex items-center justify-center text-2xl text-[#D9A441]">
                      {renderRoleIcon(previewRole.id)}
                    </div>
                    <div>
                      <div className="d text-3xl font-extrabold uppercase text-[#ECE6D8] leading-none">
                        {previewRole.name}
                      </div>
                      <div className="t text-[12px] tracking-[2px] uppercase text-[#A39D90] mt-1">
                        FACTION:{' '}
                        <span
                          style={{
                            color:
                              previewRole.team === 'mafia'
                                ? '#B3363B'
                                : previewRole.team === 'jester'
                                ? '#8C6FA0'
                                : '#5E8C7B',
                          }}
                        >
                          {previewRole.team.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewRole(null)}
                    className="w-9 h-9 flex items-center justify-center bg-[#171A20] border border-[#262A33] text-[#ECE6D8] rounded-[2px] text-lg hover:border-[#D9A441] transition-colors"
                    aria-label="Close dossier"
                  >
                    ×
                  </button>
                </div>

                <div className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[2px] space-y-1">
                  <div className="t text-[11px] tracking-[2px] text-[#D9A441] uppercase font-bold">
                    ROLE PROFILE & SYNOPSIS
                  </div>
                  <p className="text-sm font-sans text-[#ECE6D8] leading-relaxed">
                    {previewRole.summary}
                  </p>
                </div>

                <div className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[2px] space-y-1">
                  <div className="t text-[11px] tracking-[2px] text-[#A39D90] uppercase font-bold">
                    NIGHT ACTION DIRECTIVE
                  </div>
                  <p className="text-sm font-sans text-[#ECE6D8] leading-relaxed">
                    {previewRole.howToPlay}
                  </p>
                </div>

                <div className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[2px] space-y-1">
                  <div className="t text-[11px] tracking-[2px] text-[#A39D90] uppercase font-bold">
                    VICTORY CONDITIONS
                  </div>
                  <p className="text-sm font-sans text-[#ECE6D8] leading-relaxed">
                    {previewRole.winCondition}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setPreviewRole(null)}
                    className="w-full py-3 bg-[#D9A441] text-[#0A0B0E] d text-lg font-bold tracking-wider uppercase rounded-[2px] hover:bg-[#FFEA00] transition-colors shadow-md"
                  >
                    CLOSE DOSSIER
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
