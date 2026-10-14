'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Volume2, VolumeX, HelpCircle, Copy, Check, ArrowLeft, LogOut, FastForward, Lock, QrCode, Mic, MicOff } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ClientGameView } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { CountdownRing, CenterTimer, Kbd, Modal, Button } from './ui';
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
      case 'roleReveal': return 'Role Reveal';
      case 'night': return 'Night';
      case 'morning': return 'Dawn Report';
      case 'discussion': return 'Discussion';
      case 'voting': return 'Town Vote';
      case 'voteResult': return 'Verdict';
      case 'gameOver': return 'Game Over';
      default: return phase;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-surface/90 backdrop-blur-md border-b border-border px-4 md:px-8 lg:px-12 py-2.5">
        <div className="w-full max-w-[1650px] 2xl:max-w-[1850px] mx-auto flex items-center justify-between gap-3">
          {/* Left: Back Button & Room Code / Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Back Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLeaveModalOpen(true)}
              title="Leave Room & Return Home"
              className="flex items-center gap-1 font-medium px-2.5 h-8 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            {/* Room Code Button (Copies ONLY the Room Code) */}
            <button
              type="button"
              onClick={handleCopyCode}
              title="Click to copy Room Code"
              className="flex items-center gap-1.5 px-3 py-1 rounded-none bg-surface-2 hover:bg-zinc-800 border border-border text-xs md:text-sm font-medium text-text transition-colors h-8"
            >
              <span className="text-muted text-xs">Room:</span>
              <span className="font-mono font-bold tracking-wide">{gameView.code}</span>
              {copiedCode ? (
                <span className="flex items-center gap-1 text-emerald-400 font-semibold text-xs ml-1">
                  <Check className="w-3.5 h-3.5" /> Code Copied!
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted ml-0.5" />
              )}
            </button>

            {/* Buttons from Picture 1 moved to Top Bar */}
            {isHost && onToggleLockRoom && (
              <Button
                variant={gameView.isLocked ? 'primary' : 'secondary'}
                size="sm"
                onClick={onToggleLockRoom}
                title={gameView.isLocked ? 'Unlock room for new players' : 'Lock room against new players'}
                className="hidden md:flex items-center gap-1.5 font-medium px-2.5 h-8 text-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{gameView.isLocked ? 'Locked' : 'Lock Room'}</span>
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyLink}
              title="Copy direct invitation URL"
              className="hidden md:flex items-center gap-1.5 font-medium px-2.5 h-8 text-xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowQr(true)}
              title="Display Room QR Code"
              className="hidden md:flex items-center gap-1.5 font-medium px-2.5 h-8 text-xs"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR</span>
            </Button>

            {/* Voice Chat Button */}
            {onToggleVoice && (
              <Button
                variant={isVoiceActive ? (isVoiceMuted ? 'secondary' : 'primary') : 'secondary'}
                size="sm"
                onClick={isVoiceActive ? onToggleVoiceMute : onToggleVoice}
                title={isVoiceActive ? (isVoiceMuted ? 'Unmute microphone' : 'Mute microphone') : 'Join voice chat mesh'}
                className="flex items-center gap-1.5 font-medium px-2.5 h-8 text-xs"
              >
                {isVoiceActive ? (
                  isVoiceMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  )
                ) : (
                  <MicOff className="w-3.5 h-3.5 text-muted" />
                )}
                <span className="hidden sm:inline">
                  {isVoiceActive ? (isVoiceMuted ? 'Muted' : 'Voice Live') : 'Voice Chat'}
                </span>
              </Button>
            )}

            {/* Connection Status Chip */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-none bg-surface-2/60 border border-border text-xs text-muted h-8">
              <span
                className={`w-2 h-2 rounded-none ${
                  isReconnecting ? 'bg-zinc-400 animate-ping' : 'bg-emerald-400'
                }`}
              />
              <span className="font-mono">{isReconnecting ? 'Reconnecting' : `${rtt}ms`}</span>
            </div>
          </div>

          {/* Center: Phase & Round / Center Timer & Fast-Forward */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-surface-2 border border-border h-9 min-h-[36px] select-none">
              <span className="text-xs md:text-sm font-bold text-text">
                {getPhaseDisplay(gameView.phase)}
              </span>
              {gameView.round > 0 && (
                <span className="px-1.5 py-0.5 rounded-none text-xs font-mono font-bold bg-white text-black">
                  R{gameView.round}
                </span>
              )}
            </div>

            <CenterTimer
              phaseEndsAt={gameView.phaseEndsAt}
              serverNow={gameView.serverNow}
              label="Timer"
              size="sm"
            />

            {/* Host-only Fast-Forward button */}
            {isHost && isPlayingActivePhase && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAdvanceModalOpen(true)}
                title="Host shortcut: Fast-forward phase immediately"
                kbd="Shift+N"
                className="hidden sm:flex items-center gap-1.5 text-xs px-3 h-9 min-h-[36px] border-zinc-600 hover:border-white font-medium"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Fast-Forward</span>
              </Button>
            )}
          </div>

          {/* Right: Role Chip, Help Button, Sound Mute */}
          <div className="flex items-center gap-2.5">
            {/* Role Chip: Tapping opens "My Role" */}
            {roleDef && (
              <button
                type="button"
                onClick={() => onOpenHelp('my-role')}
                title="Click to view your role instructions"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-none border border-border bg-surface-2 hover:border-zinc-500 text-xs md:text-sm font-medium text-text transition-colors"
              >
                <span className="text-muted">Role:</span>
                <span className="font-bold text-white">{roleDef.name}</span>
                <Kbd className="bg-transparent border-border text-muted">I</Kbd>
              </button>
            )}

            {/* Guide Button */}
            <button
              type="button"
              onClick={() => onOpenHelp('basics')}
              title="How to Play & Game Guide"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-none bg-surface-2 hover:bg-zinc-800 border border-border text-xs md:text-sm text-text transition-colors font-medium"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden md:inline">Guide</span>
              <Kbd>H</Kbd>
            </button>

            {/* Dedicated Quick Mic Toggle Button */}
            <button
              type="button"
              onClick={isVoiceActive ? onToggleVoiceMute : onToggleVoice}
              title={isVoiceActive ? (isVoiceMuted ? 'Unmute Mic (Shift+M)' : 'Mute Mic (Shift+M)') : 'Join Voice Chat (Shift+M)'}
              className={`p-2 rounded-none border transition-colors flex items-center justify-center ${
                isVoiceActive
                  ? isVoiceMuted
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-400 hover:text-amber-300'
                    : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 hover:text-emerald-300'
                  : 'bg-surface-2 hover:bg-zinc-800 border-border text-muted hover:text-text'
              }`}
            >
              {isVoiceActive ? (
                isVoiceMuted ? (
                  <MicOff className="w-4 h-4 text-amber-400" />
                ) : (
                  <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
                )
              ) : (
                <Mic className="w-4 h-4 text-muted" />
              )}
            </button>

            {/* Sound Toggle Button */}
            <button
              type="button"
              onClick={handleToggleSound}
              title={muted ? 'Unmute Sound (M)' : 'Mute Sound (M)'}
              className="p-2 rounded-none bg-surface-2 hover:bg-zinc-800 border border-border text-muted hover:text-text transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4 text-muted" /> : <Volume2 className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      </header>

      {/* Leave Room Custom Confirmation Modal */}
      <Modal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        title="Leave Room"
      >
        <div className="space-y-5">
          <div className="p-4 bg-surface-2 border border-border flex items-start gap-3">
            <LogOut className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-text">Return to Main Menu?</div>
              <p className="text-xs text-muted leading-relaxed">
                Are you sure you want to exit room <strong className="text-white font-mono">{gameView.code}</strong>? You will be disconnected from the game session.
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
          <div className="p-4 bg-surface-2 border border-border flex items-start gap-3">
            <FastForward className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-text">Host Phase Fast-Forward</div>
              <p className="text-xs text-muted leading-relaxed">
                Advance directly to the next phase without waiting for the timer to finish.
              </p>
              <div className="p-2 bg-black border border-border text-[11px] text-muted mt-2">
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
          <div className="p-4 bg-white rounded-none border border-border">
            <QRCodeSVG value={getRoomShareUrl(gameView.code)} size={220} />
          </div>
          <div className="text-center space-y-1">
            <div className="font-mono text-2xl font-bold tracking-widest text-text">{gameView.code}</div>
            <div className="text-xs text-muted">Scan to join on any phone or browser</div>
          </div>
        </div>
      </Modal>
    </>
  );
}
