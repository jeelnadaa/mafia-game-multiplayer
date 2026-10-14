'use client';

import React, { useState } from 'react';
import { Mic, MicOff, Volume2, ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import { ClientGameView } from '@/lib/types';
import { Avatar } from './ui';

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
  const [collapsed, setCollapsed] = useState(false);
  const { players, me, voiceMuted = {} } = gameView;

  // Active voice participants: include all living players or connected players
  const participants = players.filter((p) => p.connected && !p.isGod);

  return (
    <aside
      aria-label="Voice Chat Overlay"
      className="fixed left-3 top-20 z-40 flex flex-col items-start gap-1.5 select-none pointer-events-auto transition-all duration-200"
    >
      {/* Voice Status Pill / Quick Mic Toggle */}
      <div className="flex items-center gap-1 bg-surface/95 backdrop-blur-md border border-border px-2 py-1 shadow-lg text-xs">
        <button
          type="button"
          onClick={isVoiceActive ? onToggleVoiceMute : onToggleVoice}
          title={isVoiceActive ? (isVoiceMuted ? 'Unmute microphone (Click or press V)' : 'Mute microphone (Click or press V)') : 'Click to connect to voice chat mesh'}
          className={`flex items-center gap-1.5 px-1.5 py-0.5 font-mono text-[11px] font-bold transition-colors ${
            isVoiceActive
              ? isVoiceMuted
                ? 'text-amber-400 hover:text-amber-300'
                : 'text-emerald-400 hover:text-emerald-300'
              : 'text-muted hover:text-white'
          }`}
        >
          {isVoiceActive ? (
            isVoiceMuted ? (
              <MicOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
            )
          ) : (
            <Radio className="w-3.5 h-3.5 text-muted shrink-0" />
          )}
          <span>
            {isVoiceActive ? (isVoiceMuted ? 'MIC MUTED' : 'VOICE LIVE') : 'JOIN VOICE'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand voice roster' : 'Collapse voice roster'}
          className="p-1 text-muted hover:text-white transition-colors border-l border-border/80 ml-0.5"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>

      {/* Participants Voice Stream List */}
      {!collapsed && (
        <div className="flex flex-col gap-1 w-44 max-h-[50vh] overflow-y-auto no-scrollbar">
          {/* Local Player (You) */}
          {me && (
            <div
              key="local-user"
              onClick={isVoiceActive ? onToggleVoiceMute : onToggleVoice}
              title={isVoiceActive ? (isVoiceMuted ? 'Click to unmute' : 'Click to mute') : 'Click to connect'}
              className={`flex items-center gap-2 px-2 py-1 border transition-all cursor-pointer backdrop-blur-md ${
                isVoiceActive && !isVoiceMuted && speakingPeers['local']
                  ? 'bg-emerald-950/80 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                  : isVoiceActive && isVoiceMuted
                  ? 'bg-surface/90 border-amber-500/40 text-muted'
                  : 'bg-surface/85 border-border/70 text-text hover:border-zinc-500'
              }`}
            >
              <div className="relative shrink-0">
                <Avatar
                  avatarId={me.avatar}
                  size={24}
                  className={`rounded-none transition-all ${
                    isVoiceActive && !isVoiceMuted && speakingPeers['local']
                      ? 'ring-2 ring-emerald-400'
                      : isVoiceMuted
                      ? 'opacity-70'
                      : ''
                  }`}
                />
                {isVoiceActive && isVoiceMuted && (
                  <span className="absolute -bottom-1 -right-1 bg-black/90 p-0.5 rounded-none border border-amber-400/50">
                    <MicOff className="w-2.5 h-2.5 text-amber-400" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                <span className="text-[11px] font-semibold truncate text-text">
                  {me.name} <span className="text-[9px] text-muted">(You)</span>
                </span>

                {isVoiceActive ? (
                  isVoiceMuted ? (
                    <span className="text-[9px] font-mono text-amber-400/90 font-bold shrink-0">MUTED</span>
                  ) : speakingPeers['local'] ? (
                    <span className="flex items-center gap-0.5 shrink-0">
                      <span className="w-1 h-2.5 bg-emerald-400 animate-pulse" />
                      <span className="w-1 h-3.5 bg-emerald-400 animate-pulse delay-75" />
                      <span className="w-1 h-2 bg-emerald-400 animate-pulse delay-150" />
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-muted shrink-0">ON</span>
                  )
                ) : (
                  <span className="text-[9px] font-mono text-muted shrink-0">OFF</span>
                )}
              </div>
            </div>
          )}

          {/* Remote Peers */}
          {participants
            .filter((p) => p.id !== me?.id)
            .map((p) => {
              const isSpeaking = Boolean(speakingPeers[p.id]);
              const isMuted = Boolean(voiceMuted[p.id]);

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-2 py-1 border transition-all backdrop-blur-md ${
                    isSpeaking
                      ? 'bg-emerald-950/80 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                      : isMuted
                      ? 'bg-surface/90 border-border/70 text-muted'
                      : 'bg-surface/85 border-border/60 text-text'
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar
                      avatarId={p.avatar}
                      size={24}
                      className={`rounded-none transition-all ${
                        isSpeaking
                          ? 'ring-2 ring-emerald-400'
                          : isMuted
                          ? 'opacity-70'
                          : ''
                      }`}
                    />
                    {isMuted && (
                      <span className="absolute -bottom-1 -right-1 bg-black/90 p-0.5 rounded-none border border-amber-400/50">
                        <MicOff className="w-2.5 h-2.5 text-amber-400" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                    <span className="text-[11px] font-medium truncate text-text">
                      {p.name}
                    </span>

                    {isSpeaking ? (
                      <span className="flex items-center gap-0.5 shrink-0">
                        <span className="w-1 h-2.5 bg-emerald-400 animate-pulse" />
                        <span className="w-1 h-3.5 bg-emerald-400 animate-pulse delay-75" />
                        <span className="w-1 h-2 bg-emerald-400 animate-pulse delay-150" />
                      </span>
                    ) : isMuted ? (
                      <span className="text-[9px] font-mono text-amber-400/80 font-bold shrink-0">MUTED</span>
                    ) : (
                      <Mic className="w-3 h-3 text-muted/60 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </aside>
  );
}
