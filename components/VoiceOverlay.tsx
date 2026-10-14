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
} from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { Avatar, Button, Switch, Kbd } from './ui';
import { voiceEngine } from '@/lib/voice';
import { toggleMute, getIsMuted } from '@/lib/sfx';

interface VoiceOverlayProps {
  gameView: ClientGameView;
  isVoiceActive: boolean;
  isVoiceMuted: boolean;
  onToggleVoice: () => void;
  onToggleVoiceMute: () => void;
  speakingPeers?: Record<string, boolean>;
}

export function VoiceOverlay({
  gameView,
  isVoiceActive,
  isVoiceMuted,
  onToggleVoice,
  onToggleVoiceMute,
  speakingPeers = {},
}: VoiceOverlayProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pttEnabled, setPttEnabled] = useState(false);
  const [isPttActive, setIsPttActive] = useState(false);
  const [soundMuted, setSoundMuted] = useState(getIsMuted());
  const { players, me, voiceMuted = {} } = gameView;

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

  const handleTogglePtt = (enabled: boolean) => {
    setPttEnabled(enabled);
    voiceEngine.setPushToTalk(enabled);
    if (!enabled) {
      setIsPttActive(false);
      voiceEngine.setPttActive(false);
    }
  };

  // Keyboard Push-to-Talk Listener: Space or T key
  useEffect(() => {
    if (!isVoiceActive || !pttEnabled) {
      if (isPttActive) {
        setIsPttActive(false);
        voiceEngine.setPttActive(false);
      }
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
          setIsPttActive(true);
          voiceEngine.setPttActive(true);
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
        setIsPttActive(false);
        voiceEngine.setPttActive(false);
      }
    };

    const handleWindowBlur = () => {
      setIsPttActive(false);
      voiceEngine.setPttActive(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      voiceEngine.setPttActive(false);
    };
  }, [isVoiceActive, pttEnabled, isPttActive]);

  const handleSoundToggle = () => {
    const unmuted = toggleMute();
    setSoundMuted(!unmuted);
  };

  return (
    <>
      {/* ============================================================ */}
      {/* LAYER 1: Always-visible Mic Dock (Bottom Left)               */}
      {/* ============================================================ */}
      <div className="fixed bottom-4 left-4 z-40 select-none flex items-center gap-1.5 pointer-events-auto">
        {/* Main Mic Button: Three Distinct States */}
        {!isVoiceActive ? (
          // STATE 1: OFF
          <button
            type="button"
            onClick={onToggleVoice}
            title="Connect to Voice Mesh"
            className="flex items-center gap-2 px-3 py-2 bg-ink-900 hover:bg-ink-800 border border-line text-bone-dim hover:text-bone hover:border-bone-dim transition-all shadow-xl h-11"
          >
            <Radio className="w-4 h-4 text-bone-dim" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Join Voice</span>
          </button>
        ) : isVoiceMuted ? (
          // STATE 2: MUTED
          <button
            type="button"
            onClick={onToggleVoiceMute}
            title="Microphone Muted (Click to Unmute, or Shift+M)"
            className="flex items-center gap-2 px-3.5 py-2 bg-ink-900 hover:bg-ink-800 border border-amber-500/50 text-amber-400 transition-all shadow-xl h-11"
          >
            <MicOff className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-left">
              <span className="font-mono text-[11px] font-bold block leading-none">MIC MUTED</span>
              <span className="text-[9px] text-bone-dim font-mono">Shift+M</span>
            </div>
          </button>
        ) : pttEnabled ? (
          // STATE 3A: PUSH-TO-TALK ENABLED
          <button
            type="button"
            onPointerDown={() => {
              setIsPttActive(true);
              voiceEngine.setPttActive(true);
            }}
            onPointerUp={() => {
              setIsPttActive(false);
              voiceEngine.setPttActive(false);
            }}
            onPointerLeave={() => {
              setIsPttActive(false);
              voiceEngine.setPttActive(false);
            }}
            title="Push-to-Talk active: Hold Space or T (or hold this button) to talk"
            className={`flex items-center gap-2 px-3.5 py-2 bg-ink-900 hover:bg-ink-800 border transition-all shadow-xl h-11 ${
              isPttActive
                ? 'border-lamp text-lamp shadow-[0_0_20px_rgba(217,164,65,0.4)]'
                : 'border-line text-bone-dim hover:border-bone-dim'
            }`}
          >
            <Mic className={`w-4 h-4 shrink-0 ${isPttActive ? 'text-lamp animate-pulse' : 'text-bone-dim'}`} />
            <div className="text-left">
              <span className={`font-mono text-[11px] font-extrabold tracking-wider block leading-none ${
                isPttActive ? 'text-lamp' : 'text-bone-dim'
              }`}>
                {isPttActive ? 'PTT TRANSMITTING' : 'PTT READY'}
              </span>
              <span className="text-[9px] text-bone-dim font-mono">
                {isPttActive ? 'Transmitting' : 'Hold Space / T'}
              </span>
            </div>
          </button>
        ) : (
          // STATE 3B: VOICE LIVE (OPEN MIC)
          <button
            type="button"
            onClick={onToggleVoiceMute}
            title="Microphone Live (Click to Mute, or Shift+M)"
            className="flex items-center gap-2 px-3.5 py-2 bg-ink-900 hover:bg-ink-800 border border-lamp text-lamp transition-all shadow-[0_0_20px_rgba(217,164,65,0.2)] h-11 relative"
          >
            <Mic className="w-4 h-4 text-lamp animate-pulse shrink-0" />
            <div className="text-left">
              <span className="font-mono text-[11px] font-extrabold tracking-wider block leading-none">VOICE LIVE</span>
              {/* Animated VU Wave Bars */}
              <div className="flex items-center gap-0.5 mt-1">
                <span className="w-1 h-1.5 bg-lamp animate-pulse" />
                <span className="w-1 h-3 bg-lamp animate-pulse delay-75" />
                <span className="w-1 h-2 bg-lamp animate-pulse delay-150" />
                <span className="w-1 h-3.5 bg-lamp animate-pulse delay-100" />
              </div>
            </div>
          </button>
        )}

        {/* Audio Sheet Drawer Toggle */}
        <button
          type="button"
          onClick={() => setSheetOpen(!sheetOpen)}
          title="Audio Settings & Participants"
          aria-label="Open Audio Drawer"
          className="p-2.5 bg-ink-900 hover:bg-ink-800 border border-line hover:border-bone-dim text-bone-dim hover:text-bone transition-colors h-11 w-11 flex items-center justify-center shadow-xl"
        >
          <Sliders className="w-4 h-4 text-bone-dim" />
        </button>
      </div>

      {/* ============================================================ */}
      {/* LAYER 2: Slide-up Audio Sheet / Modal                        */}
      {/* ============================================================ */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm select-none">
          <div
            className="w-full max-w-md bg-ink-900 border border-line p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom-6 duration-200"
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-lamp" />
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-bone">
                  Audio & Voice Console
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="p-1 text-bone-dim hover:text-bone transition-colors"
                aria-label="Close Audio Console"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Phase Status Banner */}
            <div className="p-2.5 bg-ink-950 border border-line text-[11px] text-bone-dim font-mono flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isVoiceActive ? (isVoiceMuted ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-zinc-600'}`} />
              <span>{phaseStatusLine}</span>
            </div>

            {/* Voice Connection & Controls */}
            <div className="p-3.5 bg-ink-800 border border-line space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-bone block">Microphone Connection</span>
                  <span className="text-[11px] text-bone-dim font-mono">
                    {isVoiceActive ? (isVoiceMuted ? 'Connected · Muted' : 'Connected · Live') : 'Disconnected'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isVoiceActive ? (
                    <>
                      <Button
                        variant={isVoiceMuted ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={onToggleVoiceMute}
                        className="text-xs h-8"
                      >
                        {isVoiceMuted ? <MicOff className="w-3.5 h-3.5 mr-1 text-amber-400" /> : <Mic className="w-3.5 h-3.5 mr-1" />}
                        <span>{isVoiceMuted ? 'Unmute' : 'Mute'}</span>
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={onToggleVoice}
                        className="text-xs h-8 text-red-300 hover:text-white"
                        title="Disconnect from voice mesh"
                      >
                        <PhoneOff className="w-3.5 h-3.5 mr-1" />
                        <span>Leave</span>
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onToggleVoice}
                      className="text-xs h-8"
                    >
                      <Radio className="w-3.5 h-3.5 mr-1.5" />
                      <span>Connect Voice</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Push to Talk Toggle & Key Guidance */}
              {isVoiceActive && (
                <div className="pt-2 border-t border-line/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-bone block">Push-to-Talk (PTT)</span>
                      <span className="text-[10px] text-bone-dim font-mono">
                        Transmit only while holding key or button
                      </span>
                    </div>
                    <Switch checked={pttEnabled} onChange={handleTogglePtt} />
                  </div>

                  {pttEnabled && (
                    <div className="p-3 bg-ink-950 border border-line space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono text-bone-dim">PTT Keys:</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-lamp bg-ink-900 border border-line">
                            Space
                          </span>
                          <span className="text-[10px] text-bone-dim font-mono">or</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-lamp bg-ink-900 border border-line">
                            T
                          </span>
                        </div>
                        {isPttActive ? (
                          <span className="text-[10px] font-mono font-bold text-lamp animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-lamp" /> TRANSMITTING
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-bone-dim">Muted (Hold to Talk)</span>
                        )}
                      </div>

                      {/* Touch / Click PTT Hold Bar for mobile and desktop */}
                      <button
                        type="button"
                        onPointerDown={() => {
                          setIsPttActive(true);
                          voiceEngine.setPttActive(true);
                        }}
                        onPointerUp={() => {
                          setIsPttActive(false);
                          voiceEngine.setPttActive(false);
                        }}
                        onPointerLeave={() => {
                          setIsPttActive(false);
                          voiceEngine.setPttActive(false);
                        }}
                        className={`w-full py-2 px-3 text-xs font-mono font-bold uppercase tracking-wider border transition-all select-none ${
                          isPttActive
                            ? 'bg-lamp text-ink-950 border-lamp shadow-[0_0_15px_rgba(217,164,65,0.4)]'
                            : 'bg-ink-900 text-bone-dim hover:text-bone border-line hover:border-bone-dim'
                        }`}
                      >
                        {isPttActive ? '● Transmitting (Release to Mute)' : 'Hold to Talk (Click or Space / T)'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Participants Voice Stream List */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-bone-dim flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-lamp" />
                  <span>Participants ({participants.length})</span>
                </span>
                <span className="text-[10px] text-bone-dim">Active Mesh</span>
              </div>

              <div className="space-y-1.5 max-h-44 overflow-y-auto no-scrollbar">
                {participants.map((p) => {
                  const isLocal = p.id === me?.id;
                  const isSpeaking = isLocal ? Boolean(speakingPeers['local']) : Boolean(speakingPeers[p.id]);
                  const isMuted = isLocal ? isVoiceMuted : Boolean(voiceMuted[p.id]);

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-2 border transition-all ${
                        isSpeaking
                          ? 'bg-emerald-950/40 border-emerald-500/60'
                          : 'bg-ink-800 border-line'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar avatarId={p.avatar} size={28} className="rounded-none border-line" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-bone truncate flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {isLocal && <span className="text-[10px] text-lamp font-mono font-bold">(You)</span>}
                            {!p.alive && <span className="text-[9px] text-blood font-mono uppercase">Ghost</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSpeaking ? (
                          <span className="flex items-center gap-0.5 text-emerald-400 font-mono text-[10px]">
                            <span className="w-1 h-2 bg-emerald-400 animate-pulse" />
                            <span className="w-1 h-3.5 bg-emerald-400 animate-pulse delay-75" />
                            <span className="w-1 h-1.5 bg-emerald-400 animate-pulse delay-150" />
                          </span>
                        ) : isMuted ? (
                          <span className="text-[10px] font-mono text-amber-400 font-bold">MUTED</span>
                        ) : (
                          <span className="text-[10px] font-mono text-bone-dim">LIVE</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sound & Procedural Ambience Controls */}
            <div className="p-3.5 bg-ink-800 border border-line space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-lamp" />
                  <div>
                    <span className="text-xs font-bold text-bone block">Procedural Lo-Fi Ambience</span>
                    <span className="text-[10px] text-bone-dim font-mono">Endless soft jazz & vinyl warmth</span>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={handleSoundToggle} className="text-xs h-7">
                  {soundMuted ? 'Unmute' : 'Mute'}
                </Button>
              </div>
            </div>

            {/* Close Button */}
            <Button
              variant="secondary"
              size="md"
              onClick={() => setSheetOpen(false)}
              className="w-full text-xs font-mono"
            >
              Close Console
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
