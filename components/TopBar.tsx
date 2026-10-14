'use client';

import React, { useState, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  Copy,
  Check,
  ArrowLeft,
  LogOut,
  FastForward,
  Lock,
  Unlock,
  QrCode,
  FileText,
  Menu,
  X,
  Radio,
  Clock,
  Shield,
  Layers,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ClientGameView } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { TimerRing, Kbd, Modal, Button } from './ui';
import { toggleMute, getIsMuted } from '@/lib/sfx';
import { getRoomShareUrl } from '@/lib/net';
import { clearRoomData } from '@/lib/storage';
import { useShortcut } from '@/lib/shortcuts';

interface TopBarProps {
  gameView: ClientGameView;
  onOpenHelp: (tab?: 'basics' | 'my-role' | 'roles' | 'rules' | 'log' | 'notes' | 'keys') => void;
  rtt?: number;
  isReconnecting?: boolean;
  isHost?: boolean;
  onGodAction?: (action: 'next' | 'pause' | 'extend' | 'skip') => void;
  onLeave?: () => void;
  onToggleLockRoom?: () => void;
  isVoiceActive?: boolean;
  isVoiceMuted?: boolean;
  onToggleVoice?: () => void;
  onToggleVoiceMute?: () => void;
}

export function TopBar({
  gameView,
  onOpenHelp,
  rtt = 18,
  isReconnecting = false,
  isHost = false,
  onGodAction,
  onLeave,
  onToggleLockRoom,
  isVoiceActive = false,
  isVoiceMuted = false,
  onToggleVoice,
  onToggleVoiceMute,
}: TopBarProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [muted, setMuted] = useState(getIsMuted());
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [caseMenuOpen, setCaseMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Back button long-press detection
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<any>(null);
  const holdIntervalRef = useRef<any>(null);

  const startHold = () => {
    let progress = 0;
    holdIntervalRef.current = setInterval(() => {
      progress += 10;
      setHoldProgress(Math.min(100, progress));
    }, 50);

    holdTimerRef.current = setTimeout(() => {
      clearInterval(holdIntervalRef.current);
      setHoldProgress(0);
      setHistoryOpen(true);
    }, 500);
  };

  const cancelHold = (wasClick: boolean = false) => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    if (holdProgress < 100 && wasClick) {
      setLeaveModalOpen(true);
    }
    setHoldProgress(0);
  };

  // Host-only shortcuts to fast-forward or control phases
  const isPlayingActivePhase = gameView.phase !== 'lobby' && gameView.phase !== 'gameOver';
  useShortcut('Shift+N', () => setAdvanceModalOpen(true), {
    enabled: Boolean(isHost && isPlayingActivePhase),
    scope: 'screen',
  });
  useShortcut('Shift+P', () => onGodAction?.('pause'), {
    enabled: Boolean(isHost && isPlayingActivePhase),
    scope: 'screen',
  });
  useShortcut('Shift+X', () => onGodAction?.('extend'), {
    enabled: Boolean(isHost && isPlayingActivePhase),
    scope: 'screen',
  });
  useShortcut('Shift+M', () => {
    if (isVoiceActive) onToggleVoiceMute?.();
    else onToggleVoice?.();
  }, { scope: 'screen' });

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(gameView.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = () => {
    const url = getRoomShareUrl(gameView.code);
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleToggleSound = () => {
    const unmuted = toggleMute();
    setMuted(!unmuted);
  };

  const handleConfirmLeave = () => {
    setLeaveModalOpen(false);
    if (onLeave) {
      onLeave();
    } else {
      clearRoomData(gameView.code);
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const role = gameView.me?.role;
  const roleDef = role ? ROLES[role] : null;

  const getPhaseDisplay = (phase: string) => {
    switch (phase) {
      case 'lobby': return 'Lobby';
      case 'narratorAssign': return 'Assigning Roles';
      case 'roleReveal': return 'Briefing';
      case 'night': return `Night · ${gameView.round}`;
      case 'morning': return `Day ${gameView.round} · Dawn`;
      case 'discussion': return `Day ${gameView.round} · Inquiry`;
      case 'voting': return 'Town Ballot';
      case 'voteResult': return 'Verdict';
      case 'gameOver': return 'Case Closed';
      default: return phase;
    }
  };

  // Timer calculation
  const remainingSeconds = gameView.phaseEndsAt
    ? Math.max(0, Math.ceil((gameView.phaseEndsAt - (gameView.serverNow || Date.now())) / 1000))
    : 0;

  return (
    <>
      {/* Sleek Noir HUD Header matching Examples/Night the table-html and Vote.dc.html */}
      <header className="sticky top-0 z-30 w-full bg-[#0A0B0E]/90 backdrop-blur-md border-b border-[#262A33] px-4 md:px-10 py-3 select-none">
        <div className="w-full max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Back (click/hold) & Case Menu Drawer */}
          <div className="flex items-center gap-2.5">
            {/* Back Button with Long-press affordance */}
            <div className="relative inline-flex items-center">
              <button
                type="button"
                onPointerDown={startHold}
                onPointerUp={() => cancelHold(true)}
                onPointerLeave={() => cancelHold(false)}
                title="Click to leave, hold to view history"
                className="hb flex items-center justify-center hover:border-bone transition-colors"
                aria-label="Back"
              >
                ‹
                {/* Hold Progress Ring */}
                {holdProgress > 0 && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      stroke="#D9A441"
                      strokeWidth="2.5"
                      fill="none"
                      strokeDasharray={100}
                      strokeDashoffset={100 - holdProgress}
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Case File Menu Button */}
            <button
              type="button"
              onClick={() => setCaseMenuOpen(true)}
              title="Open Case Docket & Settings"
              className="hb flex items-center justify-center hover:border-bone transition-colors"
              aria-label="Menu"
            >
              ≡
            </button>
          </div>

          {/* Center: Phase Display & Timer Ring (matching mockup 40x40 SVG ring + Big Shoulders Display title) */}
          <div className="flex items-center gap-3.5">
            {gameView.settings.noTimer ? (
              <div
                className="w-10 h-10 rounded-full border-2 border-[#D9A441] flex items-center justify-center text-[#D9A441] font-bold text-xl shrink-0 shadow-[0_0_12px_rgba(217,164,65,0.3)] select-none"
                title="Untimed Play (No Timer)"
              >
                ∞
              </div>
            ) : (
              <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#262A33" strokeWidth="3" />
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke={
                  remainingSeconds <= 10
                    ? '#B3363B'
                    : gameView.phase === 'night'
                    ? '#5B7A99'
                    : '#D9A441'
                }
                strokeWidth="3"
                strokeDasharray={`${Math.min(100, Math.max(5, (remainingSeconds / (gameView.phase === 'night' ? (gameView.settings.nightDuration || 35) : (gameView.settings.discussionDuration || 60))) * 100))} 100`}
                transform="rotate(-90 20 20)"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            )}
            <div className="d text-3xl sm:text-[42px] font-extrabold tracking-[4px] uppercase text-[#ECE6D8] leading-none flex items-center gap-3">
              <span>
                {gameView.phase === 'night'
                  ? `NIGHT · ${gameView.round}`
                  : gameView.phase === 'voting'
                  ? `VOTE · DAY ${gameView.round}`
                  : gameView.phase === 'discussion'
                  ? `DAY · ${gameView.round}`
                  : gameView.phase === 'morning'
                  ? `DAWN · ${gameView.round}`
                  : getPhaseDisplay(gameView.phase)}
              </span>
              {gameView.settings.noTimer && (isHost || gameView.me?.isGod) && isPlayingActivePhase && (
                <button
                  type="button"
                  onClick={() => onGodAction?.('next')}
                  className="px-3 py-1 bg-[#D9A441] text-[#0A0B0E] font-bold text-xs uppercase tracking-wider rounded hover:bg-[#FFEA00] transition-all cursor-pointer font-['Instrument_Sans'] shadow-md flex items-center gap-1"
                  title="Force Advance to Next Phase (Untimed Mode)"
                >
                  <span>Advance ❯</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Role Chip (pill with role color dot) + Sound Toggle */}
          <div className="flex items-center gap-3">
            {/* Connection dot (only shown if degraded) */}
            {(isReconnecting || rtt > 300) && (
              <span
                className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"
                title={isReconnecting ? 'Reconnecting to peer mesh...' : `High Latency: ${rtt}ms`}
              />
            )}

            {/* Role Chip: matching mockup (border 1px solid #262A33; border-radius: 999px; padding: 8px 18px; font-size: 16px) */}
            {roleDef && (
              <button
                type="button"
                onClick={() => onOpenHelp('my-role')}
                title="Classified Role Dossier (Press I)"
                className="flex items-center gap-2.5 px-4 py-2 border border-[#262A33] hover:border-bone rounded-full bg-transparent transition-colors text-[15px] text-[#ECE6D8]"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      roleDef.id === 'mafia' || roleDef.id === 'godfather'
                        ? '#B3363B'
                        : roleDef.id === 'doctor'
                        ? '#5E8C7B'
                        : roleDef.id === 'police'
                        ? '#5B7A99'
                        : roleDef.id === 'vigilante'
                        ? '#D9A441'
                        : roleDef.id === 'jester'
                        ? '#8C6FA0'
                        : '#ECE6D8',
                  }}
                />
                <span className="font-sans font-medium">{roleDef.name}</span>
              </button>
            )}

            {/* Quick Rulebook Button */}
            <button
              type="button"
              onClick={() => onOpenHelp('basics')}
              title="Rulebook (Press H)"
              className="hb hidden sm:flex items-center justify-center hover:border-bone transition-colors text-xs font-mono"
            >
              ?
            </button>
          </div>
        </div>
      </header>

      {/* Case File Menu Drawer (Slide-out) */}
      <Modal
        isOpen={caseMenuOpen}
        onClose={() => setCaseMenuOpen(false)}
        title={`CASE FILE DOCKET #${gameView.code}`}
      >
        <div className="space-y-4">
          {/* Room Code & Quick Actions */}
          <div className="p-3 bg-surface-2 border border-line space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-bone-dim uppercase font-mono block">Secret Room Code</span>
                <span className="font-mono text-xl font-extrabold text-bone tracking-widest">{gameView.code}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyCode}
                  className="text-xs h-8 px-2.5"
                  title="Copy 5-character code"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Code'}</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyLink}
                  className="text-xs h-8 px-2.5"
                  title="Copy shareable room link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Link'}</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowQr(true)}
                  className="text-xs h-8 px-2.5"
                  title="Display room QR"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Sound & Audio Preferences */}
          <div className="p-3 bg-surface-2 border border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              {muted ? <VolumeX className="w-4 h-4 text-bone-dim" /> : <Volume2 className="w-4 h-4 text-lamp" />}
              <div>
                <div className="text-xs font-bold text-bone">Lo-Fi Ambience & SFX</div>
                <div className="text-[10px] text-bone-dim">{muted ? 'Audio muted' : 'Soft procedural jazz playing'}</div>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleToggleSound} className="text-xs h-8">
              {muted ? 'Unmute (M)' : 'Mute (M)'}
            </Button>
          </div>

          {/* Host Exclusive Controls */}
          {isHost && (
            <div className="p-3 bg-surface-2 border border-lamp/40 space-y-2">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-lamp flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-lamp" />
                <span>Host Authority</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {onToggleLockRoom && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onToggleLockRoom}
                    className="flex-1 text-xs h-8 gap-1.5"
                  >
                    {gameView.isLocked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Unlock Room</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Lock Room</span>
                      </>
                    )}
                  </Button>
                )}

                {isPlayingActivePhase && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setCaseMenuOpen(false);
                      setAdvanceModalOpen(true);
                    }}
                    className="flex-1 text-xs h-8 gap-1.5"
                    title="Advance to next phase immediately"
                  >
                    <FastForward className="w-3.5 h-3.5 text-bone" />
                    <span>Fast-Forward (Shift+N)</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Leave Match Button */}
          <div className="pt-2">
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setCaseMenuOpen(false);
                setLeaveModalOpen(true);
              }}
              className="w-full text-xs"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              <span>Leave Game Session</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* History Modal (Shown on Back button Long-Press) */}
      <Modal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title="Match Event Wire & Case Log">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
          {gameView.log.length === 0 ? (
            <div className="p-4 text-center text-xs text-bone-dim">No historical events recorded in this case yet.</div>
          ) : (
            gameView.log.map((entry, idx) => (
              <div key={idx} className="p-2.5 bg-surface-2 border border-line text-xs font-mono">
                <span className="text-lamp font-bold mr-2">[{entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `R${entry.round || 1}`}]</span>
                <span className="text-bone">{entry.text}</span>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Leave Room Confirmation Modal */}
      <Modal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        title="EXIT ROOM"
        subtitle={`CASE #${gameView.code} · DISCONNECT`}
      >
        <div className="space-y-4 text-[#ECE6D8] font-['Instrument_Sans']">
          <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[6px] space-y-2">
            <div className="flex items-center gap-2.5 text-sm font-bold text-[#ECE6D8]">
              <span className="w-2 h-2 rounded-full bg-[#D9A441]" />
              <span>Leave Match Session?</span>
            </div>
            <p className="text-xs text-[#A39D90] leading-relaxed">
              Are you sure you want to exit room <strong className="text-[#D9A441] font-mono">{gameView.code}</strong>? You will be disconnected from the table and returned to headquarters.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#262A33]">
            <Button variant="secondary" onClick={() => setLeaveModalOpen(false)}>
              Stay in Room
            </Button>
            <Button variant="danger" onClick={handleConfirmLeave}>
              Exit Room
            </Button>
          </div>
        </div>
      </Modal>

      {/* Fast-Forward Custom Confirmation Modal (Host Only) */}
      <Modal
        isOpen={advanceModalOpen}
        onClose={() => setAdvanceModalOpen(false)}
        title="ADVANCE PHASE"
        subtitle="HOST DISCRETION"
      >
        <div className="space-y-4 text-[#ECE6D8] font-['Instrument_Sans']">
          <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[4px] flex items-start gap-3">
            <FastForward className="w-5 h-5 text-[#D9A441] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[#ECE6D8]">Fast-Forward to Next Phase</div>
              <p className="text-xs text-[#A39D90] leading-relaxed">
                Advance directly to the next phase without waiting for the timer to finish.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#262A33]">
            <Button variant="secondary" onClick={() => setAdvanceModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setAdvanceModalOpen(false);
                onGodAction?.('next');
              }}
            >
              Confirm Fast-Forward
            </Button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <Modal isOpen={showQr} onClose={() => setShowQr(false)} title="Join via QR Code">
        <div className="flex flex-col items-center justify-center p-4 space-y-4">
          <div className="p-4 bg-white border border-line">
            <QRCodeSVG value={getRoomShareUrl(gameView.code)} size={220} />
          </div>
          <div className="text-center space-y-1">
            <div className="font-mono text-2xl font-bold tracking-widest text-bone">{gameView.code}</div>
            <div className="text-xs text-bone-dim">Scan to join on any phone or browser</div>
          </div>
        </div>
      </Modal>
    </>
  );
}
