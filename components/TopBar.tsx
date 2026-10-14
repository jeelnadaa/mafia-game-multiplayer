'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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
    router.push('/');
  };

  const role = gameView.me?.role;
  const roleDef = role ? ROLES[role] : null;

  const getPhaseDisplay = (phase: string) => {
    switch (phase) {
      case 'lobby': return 'Lobby';
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
      {/* Sleek Noir HUD Header */}
      <header className="sticky top-0 z-30 w-full bg-ink-950/90 backdrop-blur-md border-b border-line px-3 md:px-8 py-2.5 select-none">
        <div className="w-full max-w-[1650px] mx-auto flex items-center justify-between gap-3">
          
          {/* Left: Back (click/hold) & Case Menu Drawer */}
          <div className="flex items-center gap-2">
            {/* Back Button with Long-press affordance */}
            <div className="relative inline-flex items-center">
              <button
                type="button"
                onPointerDown={startHold}
                onPointerUp={() => cancelHold(true)}
                onPointerLeave={() => cancelHold(false)}
                title="Click to leave, hold to view history"
                className="relative p-2 bg-surface hover:bg-surface-2 border border-line text-bone hover:border-lamp transition-colors flex items-center justify-center h-9 w-9"
              >
                <ArrowLeft className="w-4 h-4 text-bone-dim hover:text-bone" />
                {/* Hold Progress Ring */}
                {holdProgress > 0 && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      stroke="var(--lamp)"
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
              className="flex items-center gap-2 px-3 h-9 bg-surface hover:bg-surface-2 border border-line hover:border-bone-dim text-bone transition-colors"
            >
              <Menu className="w-3.5 h-3.5 text-lamp" />
              <span className="font-mono text-xs font-bold tracking-wider hidden sm:inline">CASE #{gameView.code}</span>
              <span className="font-mono text-xs font-bold tracking-wider sm:hidden">MENU</span>
            </button>
          </div>

          {/* Center: Phase Display & Timer Ring */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3.5 py-1 bg-surface-2 border border-line h-9 shadow-sm">
              <span className="font-heading font-extrabold uppercase tracking-widest text-xs md:text-sm text-bone">
                {getPhaseDisplay(gameView.phase)}
              </span>
              {Boolean(gameView.phaseEndsAt && remainingSeconds > 0) && (
                <div className="flex items-center gap-1.5 border-l border-line pl-2.5">
                  <TimerRing remainingSeconds={remainingSeconds} totalSeconds={60} size={24} strokeWidth={2} />
                  <span className={`font-mono text-xs font-bold ${remainingSeconds <= 10 ? 'text-blood animate-pulse' : 'text-bone'}`}>
                    {remainingSeconds}s
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Role Chip, Audio Quick Toggle, Connection */}
          <div className="flex items-center gap-2">
            {/* Connection dot (only shown if degraded) */}
            {(isReconnecting || rtt > 300) && (
              <span
                className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"
                title={isReconnecting ? 'Reconnecting to peer mesh...' : `High Latency: ${rtt}ms`}
              />
            )}

            {/* Role Chip: Tapping opens "Your Role" in Rulebook */}
            {roleDef && (
              <button
                type="button"
                onClick={() => onOpenHelp('my-role')}
                title="Classified Role Dossier (Press I)"
                className="flex items-center gap-2 px-3 h-9 border border-line bg-surface hover:border-lamp transition-colors text-xs"
              >
                <span className="text-bone-dim hidden md:inline">Role:</span>
                <span className="font-bold text-bone">{roleDef.name}</span>
                <Kbd className="bg-transparent border-line text-bone-dim hidden lg:inline">I</Kbd>
              </button>
            )}

            {/* Quick Rulebook Button */}
            <button
              type="button"
              onClick={() => onOpenHelp('basics')}
              title="Rulebook (Press H)"
              className="flex items-center gap-1.5 px-3 h-9 bg-surface hover:bg-surface-2 border border-line text-xs font-medium text-bone transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-lamp" />
              <span className="hidden md:inline">Rulebook</span>
              <Kbd className="hidden lg:inline">H</Kbd>
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
        title="Leave Room"
      >
        <div className="space-y-5">
          <div className="p-4 bg-surface-2 border border-line flex items-start gap-3">
            <LogOut className="w-5 h-5 text-bone shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-bone">Return to Main Menu?</div>
              <p className="text-xs text-bone-dim leading-relaxed">
                Are you sure you want to exit room <strong className="text-bone font-mono">{gameView.code}</strong>? You will be disconnected from the game session.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setLeaveModalOpen(false)} kbd="Esc">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmLeave} kbd="Enter">
              Leave Room
            </Button>
          </div>
        </div>
      </Modal>

      {/* Fast-Forward Custom Confirmation Modal (Host Only) */}
      <Modal
        isOpen={advanceModalOpen}
        onClose={() => setAdvanceModalOpen(false)}
        title="Fast-Forward to Next Phase?"
      >
        <div className="space-y-5">
          <div className="p-4 bg-surface-2 border border-line flex items-start gap-3">
            <FastForward className="w-5 h-5 text-bone shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-bone">Host Phase Fast-Forward</div>
              <p className="text-xs text-bone-dim leading-relaxed">
                Advance directly to the next phase without waiting for the timer to finish.
              </p>
              <div className="p-2 bg-ink-950 border border-line text-[11px] text-bone-dim mt-2">
                <strong>Automatic advancement:</strong> Normal matches progress on their own when the timer expires. Use this optional host shortcut only to finish phases fast.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAdvanceModalOpen(false)} kbd="Esc">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setAdvanceModalOpen(false);
                onGodAction?.('next');
              }}
              kbd="Enter"
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
