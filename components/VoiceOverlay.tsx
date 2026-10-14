'use client';

import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  PhoneOff,
  Sliders,
  X,
  Users,
  Music,
  Check,
  MessageSquare,
} from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { Avatar, Button, Switch, Kbd } from './ui';
import { voiceEngine, getVoiceGlowStyle } from '@/lib/voice';
import { toggleMute, getIsMuted, getAmbienceVolume, setAmbienceVolume } from '@/lib/sfx';

interface VoiceOverlayProps {
  gameView: ClientGameView;
  isVoiceActive: boolean;
  isVoiceMuted: boolean;
  onToggleVoice: () => void;
  onToggleVoiceMute: () => void;
  speakingPeers?: Record<string, boolean>;
  speakingLevels?: Record<string, number>;
  onOpenChat?: (channel: 'mafia' | 'dead') => void;
}

export function VoiceOverlay({
  gameView,
  isVoiceActive,
  isVoiceMuted,
  onToggleVoice,
  onToggleVoiceMute,
  speakingPeers = {},
  speakingLevels = {},
  onOpenChat,
}: VoiceOverlayProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [overlayExpanded, setOverlayExpanded] = useState(true);
  const [pttEnabled, setPttEnabled] = useState(() => voiceEngine.getPushToTalk());
  const [isPttActive, setIsPttActive] = useState(() => voiceEngine.getPttActive());
  const [soundMuted, setSoundMuted] = useState(getIsMuted());
  const [micSensitivity, setMicSensitivity] = useState(() => voiceEngine.getSensitivity());
  const [ambienceVol, setAmbienceVol] = useState(() => Math.round(getAmbienceVolume() * 100));
  const { players, me } = gameView;
  const voiceMuted = gameView.voiceMuted || {};

  // Real-time engine subscription for speaking state and voice levels
  const [internalSpeaking, setInternalSpeaking] = useState<Record<string, boolean>>({});
  const [internalLevels, setInternalLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    return voiceEngine.subscribe((map, levels) => {
      setInternalSpeaking(map);
      if (levels) setInternalLevels(levels);
    });
  }, []);

  const activeSpeaking = { ...speakingPeers, ...internalSpeaking };
  const activeLevels = { ...speakingLevels, ...internalLevels };

  // Connected players
  const participants = players.filter((p) => p.connected && !p.isGod);

  const isNight = gameView.phase === 'night';
  const isDead = me ? !me.alive : false;

  // Phase gating status line
  const phaseStatusLine = isNight
    ? 'Night operations: town radio is muted to protect agent secrecy'
    : isDead
    ? 'Ghost frequency: eliminated operatives can confer in shadows'
    : isVoiceActive
    ? 'Table Talk: peer-to-peer audio mesh is active'
    : 'Voice mesh disconnected';

  // Push-to-Talk activation handlers with ref guard to prevent listener flapping
  const isPttActiveRef = React.useRef(false);

  const startPtt = React.useCallback(() => {
    if (!isPttActiveRef.current) {
      isPttActiveRef.current = true;
      setIsPttActive(true);
      voiceEngine.setPttActive(true);
    }
  }, []);

  const stopPtt = React.useCallback(() => {
    if (isPttActiveRef.current) {
      isPttActiveRef.current = false;
      setIsPttActive(false);
      voiceEngine.setPttActive(false);
    }
  }, []);

  const handleTogglePtt = (enabled: boolean) => {
    setPttEnabled(enabled);
    voiceEngine.setPushToTalk(enabled);
    if (!enabled) {
      stopPtt();
    }
  };

  // Keyboard Push-to-Talk Listener: Space or T key (stable callback references)
  useEffect(() => {
    if (!isVoiceActive || !pttEnabled) {
      stopPtt();
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ' || e.code === 'KeyT' || e.key === 't' || e.key === 'T') {
        if (!e.repeat) {
          if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
          }
          startPtt();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ' || e.code === 'KeyT' || e.key === 't' || e.key === 'T') {
        stopPtt();
      }
    };

    const handleWindowBlur = () => {
      stopPtt();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      stopPtt();
    };
  }, [isVoiceActive, pttEnabled, startPtt, stopPtt]);

  const handleSoundToggle = () => {
    const unmuted = toggleMute();
    setSoundMuted(!unmuted);
  };

  const isObserverMafia = me?.role === 'mafia' || me?.role === 'godfather';
  const availableChannel: 'mafia' | 'dead' | null = isDead
    ? 'dead'
    : isObserverMafia && (gameView.phase === 'night' ? gameView.settings.mafiaNightChat : true)
    ? 'mafia'
    : null;

  const handleSensitivityChange = (level: number) => {
    setMicSensitivity(level);
    voiceEngine.setSensitivity(level);
  };

  const handleAmbienceChange = (val: number) => {
    setAmbienceVol(val);
    setAmbienceVolume(val / 100);
  };

  // Wire participants only (people who joined the wire)
  const wireParticipants = participants.filter((p) => {
    if (p.id === me?.id) return isVoiceActive;
    return (
      voiceEngine.hasPeer(p.id) ||
      (voiceMuted && voiceMuted[p.id] !== undefined) ||
      (activeSpeaking && activeSpeaking[p.id] !== undefined)
    );
  });

  return (
    <>
      {/* ============================================================ */}
      {/* LAYER 0: On-Screen Voice Overlay HUD Widget (Discord Style)  */}
      {/* ============================================================ */}
      {(isVoiceActive || wireParticipants.length > 0) && (
        <div className="fixed top-20 left-4 z-30 pointer-events-auto flex flex-col gap-1.5 select-none font-['Instrument_Sans'] max-w-[220px]">
          {/* Header pill: click to expand / minimize */}
          <button
            type="button"
            onClick={() => setOverlayExpanded(!overlayExpanded)}
            className="px-2.5 py-1.5 bg-[#101216]/90 backdrop-blur-md border border-[#262A33] rounded-[4px] shadow-xl flex items-center justify-between gap-2 cursor-pointer hover:border-[#D9A441] transition-colors w-full"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Radio
                className={`w-3.5 h-3.5 shrink-0 ${
                  isDead
                    ? 'text-[#38BDF8] animate-pulse'
                    : isVoiceActive
                    ? 'text-[#2ED573] animate-pulse'
                    : 'text-[#D9A441]'
                }`}
              />
              <span className={`text-[11px] font-mono font-bold tracking-wider uppercase truncate ${isDead ? 'text-[#38BDF8]' : 'text-[#ECE6D8]'}`}>
                {isDead ? `GHOST WIRE (${wireParticipants.length})` : `WIRE (${wireParticipants.length})`}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#A39D90] shrink-0">
              {overlayExpanded ? '▲' : '▼'}
            </span>
          </button>

          {/* Connected Peers Voice Overlay Rows */}
          {overlayExpanded && (
            <div className="flex flex-col gap-1 p-1 bg-[#101216]/85 backdrop-blur-md border border-[#262A33]/80 rounded-[6px] shadow-2xl max-h-[40vh] overflow-y-auto no-scrollbar">
              {wireParticipants.length === 0 ? (
                <div className="p-2 text-center text-[10px] font-mono text-[#A39D90]">
                  No operatives on wire
                </div>
              ) : (
                wireParticipants.map((p) => {
                  const isLocal = p.id === me?.id;
                  const isSpeaking = isLocal
                    ? Boolean(activeSpeaking['local'] || activeSpeaking[p.id])
                    : Boolean(activeSpeaking[p.id]);
                  const voiceLevel = isLocal
                    ? Math.max(activeLevels['local'] || 0, activeLevels[p.id] || 0)
                    : (activeLevels[p.id] || 0);
                  const isMuted = isLocal ? isVoiceMuted : Boolean(voiceMuted?.[p.id]);
                  const isPeerDead = !p.alive;
                  const glow = getVoiceGlowStyle(voiceLevel, isSpeaking, isPeerDead && (!me?.alive || isLocal));

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-[4px] transition-all duration-150 ${glow.bgTint}`}
                    >
                      {/* Avatar Pip with Glowing Aura based on voice level & sensitivity */}
                      <div className="relative shrink-0 flex items-center justify-center">
                        <div
                          className="w-6 h-6 rounded-full border transition-all duration-150"
                          style={{
                            backgroundColor: p.color || (isPeerDead ? '#38BDF8' : '#D9A441'),
                            borderColor: glow.tier !== 'none' ? glow.borderColor : 'rgba(255, 255, 255, 0.15)',
                            borderWidth: glow.borderWidth,
                            boxShadow: glow.boxShadow,
                          }}
                        />
                        {glow.tier !== 'none' && (
                          <div
                            className="absolute -inset-1 rounded-full pointer-events-none animate-ping opacity-60"
                            style={{ border: `1.5px solid ${glow.borderColor}` }}
                          />
                        )}
                      </div>

                      {/* Player Name */}
                      <div className="flex-1 min-w-0 truncate">
                        <div
                          className="text-xs truncate transition-colors flex items-center gap-1.5"
                          style={{
                            color: glow.tier !== 'none' ? glow.textColor : isPeerDead ? '#94A3B8' : '#ECE6D8',
                            fontWeight: glow.tier === 'hard' ? 700 : 500,
                          }}
                        >
                          <span className="truncate">{p.name}{isLocal && ' (You)'}</span>
                          {isPeerDead && (
                            <span className="text-[9px] font-mono px-1 py-0.2 bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 rounded shrink-0">
                              GHOST
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Speaking Soundwave or Mute Icon */}
                      <div className="shrink-0 flex items-center">
                        {glow.tier !== 'none' ? (
                          <div className="flex items-center gap-0.5 h-3" title={glow.label}>
                            <span
                              className="w-0.5 rounded-full animate-bounce"
                              style={{
                                backgroundColor: glow.dotColor,
                                height: glow.tier === 'light' ? '6px' : glow.tier === 'medium' ? '8px' : '11px',
                                animationDelay: '0ms',
                              }}
                            />
                            <span
                              className="w-0.5 rounded-full animate-bounce"
                              style={{
                                backgroundColor: glow.dotColor,
                                height: glow.tier === 'light' ? '9px' : glow.tier === 'medium' ? '12px' : '14px',
                                animationDelay: '150ms',
                              }}
                            />
                            <span
                              className="w-0.5 rounded-full animate-bounce"
                              style={{
                                backgroundColor: glow.dotColor,
                                height: glow.tier === 'light' ? '5px' : glow.tier === 'medium' ? '7px' : '9px',
                                animationDelay: '300ms',
                              }}
                            />
                          </div>
                        ) : isMuted ? (
                          <span title="Muted">
                            <MicOff className="w-3.5 h-3.5 text-[#B3363B]" />
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* LAYER 1: Always-visible Mic Dock (Bottom Left)               */}
      {/* ============================================================ */}
      <div className="fixed bottom-4 left-4 z-40 select-none flex items-center gap-2 pointer-events-auto">
        {/* Main Mic Button: Three Distinct States */}
        {!isVoiceActive ? (
          // STATE 1: OFF -> Join Wire
          <button
            type="button"
            onClick={onToggleVoice}
            title="Connect to Voice Wire"
            className="ob flex items-center gap-2 h-11 px-4 bg-[#101216] border border-[#262A33] text-[#ECE6D8] rounded hover:border-[#D9A441] transition-all shadow-xl font-['Instrument_Sans'] text-sm font-semibold"
          >
            <Radio className="w-4 h-4 text-[#D9A441]" />
            <span>Join Wire</span>
          </button>
        ) : isVoiceMuted ? (
          // STATE 2: MUTED
          <button
            type="button"
            onClick={onToggleVoiceMute}
            aria-label="Microphone muted"
            title="Microphone Muted (Click to Unmute, or Shift+M)"
            className="w-11 h-11 bg-[#101216] border border-[#262A33] text-[#A39D90] hover:border-[#D9A441] hover:text-[#ECE6D8] rounded-full flex items-center justify-center transition-all shadow-xl text-lg font-mono font-bold"
          >
            ⌀
          </button>
        ) : pttEnabled ? (
          // STATE 3A: PUSH-TO-TALK ENABLED
          (() => {
            const localLevel = activeLevels['local'] || 0;
            const localSpeaking = Boolean(activeSpeaking['local']);
            const localGlow = getVoiceGlowStyle(localLevel, localSpeaking);

            return (
              <button
                type="button"
                onPointerDown={startPtt}
                onPointerUp={stopPtt}
                onPointerLeave={stopPtt}
                onTouchStart={startPtt}
                onTouchEnd={stopPtt}
                onTouchCancel={stopPtt}
                title="Push-to-Talk active: Hold Space or T (or hold this button) to talk"
                style={{
                  borderColor: isPttActive && localGlow.tier !== 'none' ? localGlow.borderColor : undefined,
                  boxShadow: isPttActive && localGlow.tier !== 'none' ? localGlow.boxShadow : undefined,
                }}
                className={`flex items-center gap-2 h-11 px-4 rounded border transition-all shadow-xl font-['Instrument_Sans'] text-xs font-bold uppercase tracking-wider ${
                  isPttActive
                    ? localGlow.tier !== 'none'
                      ? 'bg-[#101216]'
                      : 'bg-[#101216] border-[#D9A441] text-[#D9A441] shadow-[0_0_20px_rgba(217,164,65,0.4)]'
                    : 'bg-[#101216] border-[#262A33] text-[#A39D90] hover:border-[#6b6455]'
                }`}
              >
                <Mic
                  className={`w-3.5 h-3.5 shrink-0 ${isPttActive ? 'animate-pulse' : 'text-[#A39D90]'}`}
                  style={{
                    color: isPttActive && localGlow.tier !== 'none' ? localGlow.dotColor : isPttActive ? '#D9A441' : undefined,
                  }}
                />
                <span
                  style={{
                    color: isPttActive && localGlow.tier !== 'none' ? localGlow.textColor : isPttActive ? '#D9A441' : undefined,
                  }}
                >
                  {isPttActive
                    ? localGlow.tier !== 'none'
                      ? localGlow.label
                      : 'TRANSMITTING'
                    : 'PTT READY'}
                </span>
              </button>
            );
          })()
        ) : (
          // STATE 3B: VOICE LIVE (OPEN MIC)
          <button
            type="button"
            onClick={onToggleVoiceMute}
            aria-label="Microphone live"
            title="Microphone Live (Click to Mute, or Shift+M)"
            className="w-11 h-11 bg-[#101216] border-2 border-[#D9A441] text-[#D9A441] rounded-full flex items-center justify-center transition-all shadow-[0_0_15px_rgba(217,164,65,0.4)] text-base font-bold"
          >
            ●
          </button>
        )}

        {/* Audio Console Drawer Toggle */}
        <button
          type="button"
          onClick={() => setSheetOpen(!sheetOpen)}
          title="Audio & Voice Console"
          aria-label="Open Audio Drawer"
          className="hb w-11 h-11 flex items-center justify-center bg-[#101216] border border-[#262A33] text-[#ECE6D8] hover:border-[#D9A441] transition-colors rounded shadow-xl"
        >
          <Sliders className="w-4 h-4 text-[#ECE6D8]" />
        </button>

        {/* Chat Drawer Toggle (Syndicate or Ghost) positioned next to console */}
        {availableChannel && (
          <button
            type="button"
            onClick={() => {
              if (onOpenChat) onOpenChat(availableChannel);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('mafia:open-chat', { detail: { channel: availableChannel } })
                );
              }
            }}
            title={
              availableChannel === 'mafia'
                ? 'Encrypted Syndicate Frequency'
                : 'Graveyard Ghost Frequency'
            }
            aria-label="Open Encrypted Chat"
            className="hb relative w-11 h-11 flex items-center justify-center bg-[#101216] border border-[#262A33] text-[#ECE6D8] hover:border-[#D9A441] transition-colors rounded shadow-xl"
          >
            <MessageSquare className="w-4 h-4 text-[#ECE6D8]" />
            <span
              className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                availableChannel === 'mafia' ? 'bg-[#B3363B]' : 'bg-[#8C6FA0]'
              }`}
            />
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* LAYER 2: Audio & Voice Console Modal (Audio.dc.html design)  */}
      {/* ============================================================ */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-[#101216] border border-[#262A33] p-6 shadow-2xl rounded-xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar font-['Instrument_Sans'] text-[#ECE6D8]"
          >
            {/* Grab handle indicator */}
            <div className="w-11 h-1 rounded bg-[#3a3f48] mx-auto mb-2" />

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="d text-3xl sm:text-4xl font-extrabold tracking-wider text-[#ECE6D8] leading-none">
                  VOICE & SOUND
                </div>
                <div className="t text-xs sm:text-sm text-[#A39D90] mt-1.5">
                  {phaseStatusLine}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="p-1 text-[#A39D90] hover:text-[#ECE6D8] transition-colors"
                aria-label="Close Audio Console"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ghost Frequency Active Notification Banner */}
            {isDead && (
              <div className="p-3.5 bg-[#081B26] border border-[#38BDF8]/60 rounded-[6px] flex items-start gap-3 shadow-[0_0_15px_rgba(56,189,248,0.2)] animate-in fade-in">
                <Radio className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-[#38BDF8] uppercase tracking-wider flex items-center gap-2">
                    <span>GHOST FREQUENCY · 404.0 MHz</span>
                    <span className="px-1.5 py-0.5 bg-[#38BDF8]/20 text-[#38BDF8] text-[9px] font-mono rounded">
                      DEAD-ONLY
                    </span>
                  </div>
                  <p className="text-[#BAE6FD] leading-relaxed text-[11px]">
                    You are tuned to the dead-only radio channel with subtle radio reverb. Fallen operatives can confer live without living players hearing them.
                  </p>
                </div>
              </div>
            )}

            {/* Your Microphone Box with Interactive Sensitivity Meter */}
            <div className="flex items-center gap-4 p-4 bg-[#171A20] border border-[#262A33] rounded-[4px]">
              {/* 64px Circular Status Button */}
              {!isVoiceActive ? (
                <button
                  type="button"
                  onClick={onToggleVoice}
                  className="w-16 h-16 rounded-full border-2 border-[#262A33] text-[#ECE6D8] hover:border-[#D9A441] hover:text-[#D9A441] text-xs font-semibold uppercase tracking-wider flex items-center justify-center transition-all shrink-0"
                >
                  JOIN
                </button>
              ) : isVoiceMuted ? (
                <button
                  type="button"
                  onClick={onToggleVoiceMute}
                  className="w-16 h-16 rounded-full border-2 border-[#6b6455] text-[#A39D90] hover:border-[#D9A441] hover:text-[#ECE6D8] text-xs font-semibold uppercase tracking-wider flex items-center justify-center transition-all shrink-0"
                >
                  MUTED
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onToggleVoiceMute}
                  className="w-16 h-16 rounded-full border-[3px] border-[#D9A441] text-[#D9A441] text-xs font-semibold uppercase tracking-wider flex items-center justify-center shadow-[0_0_15px_rgba(217,164,65,0.4)] transition-all shrink-0 animate-pulse"
                >
                  LIVE
                </button>
              )}

              {/* Sensitivity Selector & Label */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-[#ECE6D8]">Microphone Sensitivity</span>
                  <span className="t text-xs text-[#D9A441] font-mono font-bold">
                    Gate: {micSensitivity} / 8
                  </span>
                </div>
                <div className="flex items-center gap-1.5 py-1">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const barLevel = i + 1;
                    const isSelected = barLevel <= micSensitivity;
                    const isLive =
                      isVoiceActive && !isVoiceMuted && (isPttActive || speakingPeers['local']);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSensitivityChange(barLevel)}
                        title={`Click to set gate sensitivity to level ${barLevel} of 8`}
                        className={`flex-1 h-3 rounded-[1px] transition-all cursor-pointer hover:opacity-100 ${
                          isSelected
                            ? isLive
                              ? 'bg-[#FFEA00] shadow-[0_0_8px_rgba(255,234,0,0.85)]'
                              : 'bg-[#D9A441]'
                            : 'bg-[#262A33] hover:bg-[#3a3f48]'
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="t text-[11px] text-[#A39D90] mt-1.5 leading-snug">
                  Input Sensitivity Gate: Bars control speech detection threshold. Lower levels (1-3) pick up quiet whispers; higher levels (6-8) block background ambient noise.
                </p>
              </div>

              {/* Push to talk Toggle */}
              <div className="text-right text-xs text-[#A39D90] shrink-0">
                <span className="t font-bold uppercase tracking-wider">PTT Mode</span>
                <div className="mt-1 flex justify-end">
                  <Switch checked={pttEnabled} onChange={handleTogglePtt} />
                </div>
              </div>
            </div>

            {/* Push-to-Talk Hold Strip in New Noir Aesthetic */}
            {isVoiceActive && pttEnabled && (
              <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[4px] space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-xs">
                  <span className="t text-[11px] uppercase tracking-[2px] text-[#A39D90] font-bold">
                    TRANSMISSION PROTOCOL
                  </span>
                  <span
                    className={`t text-[11px] font-bold px-2 py-0.5 rounded-[2px] border ${
                      isPttActive
                        ? 'bg-[#D9A441] text-[#0A0B0E] border-[#D9A441]'
                        : 'bg-[#101216] text-[#A39D90] border-[#262A33]'
                    }`}
                  >
                    {isPttActive ? 'TRANSMITTING ON WIRE' : 'WIRE MUTED (HOLD KEY)'}
                  </span>
                </div>
                <button
                  type="button"
                  onPointerDown={startPtt}
                  onPointerUp={stopPtt}
                  onPointerLeave={stopPtt}
                  onTouchStart={startPtt}
                  onTouchEnd={stopPtt}
                  onTouchCancel={stopPtt}
                  className={`w-full py-3.5 px-4 rounded-[2px] border transition-all text-center select-none shadow-md ${
                    isPttActive
                      ? 'bg-[#D9A441] text-[#0A0B0E] border-[#FFEA00] font-black shadow-[0_0_20px_rgba(217,164,65,0.6)] scale-[0.99]'
                      : 'bg-[#101216] text-[#ECE6D8] border-[#262A33] hover:border-[#D9A441] font-bold'
                  }`}
                >
                  <div className="d text-xl tracking-wider uppercase">
                    {isPttActive ? '● TRANSMITTING (RELEASE TO MUTE)' : 'HOLD TO TALK'}
                  </div>
                  <div className="t text-[11px] tracking-wide text-[#A39D90] mt-0.5">
                    CLICK & HOLD OR PRESS SPACE / T
                  </div>
                </button>
              </div>
            )}

            {/* Connection Actions: Join Wire, Unmute, Leave */}
            <div className="flex items-center gap-3 pt-1">
              {!isVoiceActive ? (
                <button
                  type="button"
                  onClick={onToggleVoice}
                  className="flex-1 h-11 bg-[#D9A441] text-[#0A0B0E] font-semibold text-sm rounded hover:bg-[#c49233] transition-all flex items-center justify-center gap-2"
                >
                  <Radio className="w-4 h-4" />
                  <span>Join Wire</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onToggleVoiceMute}
                    className="ob flex-1 h-11 flex items-center justify-center gap-2 bg-[#171A20] border border-[#6b6455] text-[#ECE6D8] rounded hover:border-[#D9A441] text-sm font-semibold"
                  >
                    {isVoiceMuted ? <MicOff className="w-4 h-4 text-[#D9A441]" /> : <Mic className="w-4 h-4" />}
                    <span>{isVoiceMuted ? 'Unmute' : 'Mute'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onToggleVoice}
                    className="flex-1 h-11 flex items-center justify-center gap-2 bg-transparent border border-[#B3363B] text-[#B3363B] hover:bg-[#B3363B]/10 rounded transition-all text-sm font-semibold"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Leave Wire</span>
                  </button>
                </>
              )}
            </div>

            {/* AT WIRE (Filtered to people who have joined the wire, with numbers) */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="t text-xs tracking-[3px] text-[#D9A441] uppercase font-bold">
                  AT WIRE ({wireParticipants.length})
                </div>
                <div className="t text-[11px] text-[#A39D90]">
                  Operatives plugged into frequency
                </div>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
                {wireParticipants.length === 0 ? (
                  <div className="py-4 text-center border border-dashed border-[#262A33] rounded-[4px] text-xs font-mono text-[#A39D90]">
                    No operatives currently connected to the wire frequency.
                  </div>
                ) : (
                  wireParticipants.map((p, idx) => {
                    const isLocal = p.id === me?.id;
                    const isSpeaking = isLocal
                      ? Boolean(activeSpeaking['local'] || activeSpeaking[p.id])
                      : Boolean(activeSpeaking[p.id]);
                    const voiceLevel = isLocal
                      ? Math.max(activeLevels['local'] || 0, activeLevels[p.id] || 0)
                      : (activeLevels[p.id] || 0);
                    const isMuted = isLocal ? isVoiceMuted : Boolean(voiceMuted?.[p.id]);
                    const glow = getVoiceGlowStyle(voiceLevel, isSpeaking);

                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 py-2 border-b border-[#262A33]/50"
                      >
                        {/* Number Pip */}
                        <span className="t text-xs font-mono text-[#D9A441] font-bold w-6 shrink-0">
                          #{idx + 1}
                        </span>

                        {/* Stylized Avatar with Voice Glow */}
                        <div
                          className="av shrink-0 transition-all duration-150"
                          style={{
                            ['--c' as any]: p.color || '#D9A441',
                            width: '34px',
                            height: '34px',
                            boxShadow: glow.boxShadow !== 'none' ? glow.boxShadow : undefined,
                            border: glow.tier !== 'none' ? `${glow.borderWidth} solid ${glow.borderColor}` : undefined,
                          }}
                        />

                        <div className="flex-1 text-sm text-[#ECE6D8] truncate font-medium">
                          {p.name}{' '}
                          {isLocal && (
                            <span className="text-[#D9A441] text-xs font-mono font-bold">(You)</span>
                          )}
                        </div>

                        <div>
                          {glow.tier !== 'none' ? (
                            <span
                              className="text-xs font-bold flex items-center gap-1.5 transition-colors"
                              style={{ color: glow.textColor }}
                            >
                              <span
                                className="w-2 h-2 rounded-full inline-block animate-ping"
                                style={{ backgroundColor: glow.dotColor }}
                              />
                              {glow.label}
                            </span>
                          ) : isMuted ? (
                            <span className="text-xs text-[#A39D90] font-mono">Muted</span>
                          ) : !p.alive ? (
                            <span className="t text-[10px] text-[#B3363B] border border-[#B3363B] px-1.5 py-0.5">
                              GHOST
                            </span>
                          ) : isNight ? (
                            <span className="text-[11px] text-[#A39D90]/70 font-mono">Asleep</span>
                          ) : (
                            <span className="text-xs text-[#5E8C7B] font-mono">Live</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* SOUND & AMBIENCE (With Volume Slider) */}
            <div className="pt-2 border-t border-[#262A33]">
              <div className="t text-xs tracking-[3px] text-[#A39D90] mb-3 uppercase font-bold">
                SOUND & AMBIENCE
              </div>
              <div className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[4px] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-[#ECE6D8] block font-medium">
                      Atmospheric Ambience
                    </span>
                    <span className="text-xs text-[#A39D90]">
                      Vinyl warmth, lo-fi score & suspense
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSoundToggle}
                    className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-[2px] border transition-colors ${
                      soundMuted
                        ? 'bg-[#B3363B]/20 text-[#fca5a5] border-[#B3363B]'
                        : 'bg-[#101216] text-[#ECE6D8] border-[#262A33] hover:border-[#D9A441]'
                    }`}
                  >
                    {soundMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}
                  </button>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[#262A33]/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="t text-[#A39D90] uppercase tracking-wider">
                      Background Ambient Volume
                    </span>
                    <span className="t text-[#D9A441] font-mono font-bold">{ambienceVol}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={ambienceVol}
                    onChange={(e) => handleAmbienceChange(Number(e.target.value))}
                    className="w-full accent-[#D9A441] cursor-pointer h-1.5 bg-[#101216] rounded appearance-none"
                  />
                </div>
              </div>
            </div>

            {/* Close Console Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="w-full h-11 text-sm font-semibold rounded-[2px] bg-[#171A20] border border-[#262A33] text-[#ECE6D8] hover:border-[#D9A441] hover:text-[#D9A441] transition-colors uppercase tracking-wider font-mono"
              >
                CLOSE CONSOLE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
