'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Crown, Shield, Users, Play, Copy, Check, QrCode, UserMinus, AlertTriangle, MessageSquare, Send, Activity, Lock, Ban, Bot, Mic, MicOff, PhoneOff, Share2, Sparkles, Settings2, Sliders } from 'lucide-react';
import { ClientGameView, Settings, PlayerView } from '@/lib/types';
import { SETTINGS_SCHEMA, ROLE_PRESETS, RULE_PRESETS } from '@/lib/settings';
import { validateSettings } from '@/lib/engine/rules';
import { Button, Badge, Switch, Stepper, Avatar, Modal, Kbd, RubberStamp } from './ui';
import { getRoomShareUrl } from '@/lib/net';
import { useShortcut } from '@/lib/shortcuts';

interface LobbyProps {
  gameView: ClientGameView;
  isHost: boolean;
  onStart: () => void;
  onToggleReady: () => void;
  onKick: (playerId: string) => void;
  onBan?: (playerId: string) => void;
  onToggleLockRoom?: () => void;
  onToggleGod: (isGod: boolean) => void;
  onUpdateSettings: (partial: Partial<Settings>) => void;
  onUpdateProfile?: (profile: { name?: string; avatar: number }) => void;
  onSendChat?: (channel: 'public', text: string) => void;
  onAddBots?: () => void;
  onClearBots?: () => void;
  isVoiceActive?: boolean;
  isVoiceMuted?: boolean;
  onToggleVoice?: () => void;
  onToggleVoiceMute?: () => void;
  speakingPeers?: Record<string, boolean>;
}

export function Lobby({
  gameView,
  isHost,
  onStart,
  onToggleReady,
  onKick,
  onBan,
  onToggleLockRoom,
  onToggleGod,
  onUpdateSettings,
  onUpdateProfile,
  onSendChat,
  onAddBots,
  onClearBots,
  isVoiceActive = false,
  isVoiceMuted = false,
  onToggleVoice,
  onToggleVoiceMute,
  speakingPeers = {},
}: LobbyProps) {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'roles' | 'settings' | 'comms' | 'tools'>('roles');
  const [lobbyChatInput, setLobbyChatInput] = useState('');

  // Confirmation Modals State
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const [pendingKickPlayer, setPendingKickPlayer] = useState<PlayerView | null>(null);
  const [pendingBanPlayer, setPendingBanPlayer] = useState<PlayerView | null>(null);

  const { settings, players, me } = gameView;
  const chatList = gameView.chat || [];
  const logList = gameView.log || [];
  const validation = validateSettings(settings, players.length);
  const unreadyPlayers = players.filter((p) => !p.isHost && !p.ready);

  const handleConfirmBan = () => {
    if (pendingBanPlayer) {
      onBan?.(pendingBanPlayer.id);
      setPendingBanPlayer(null);
    }
  };

  // Host only start shortcut
  useShortcut(
    ['Ctrl+Enter', 'Meta+Enter'],
    () => {
      if (isHost && validation.valid) {
        setStartConfirmOpen(true);
      }
    },
    { enabled: isHost, scope: 'screen' }
  );

  // Ready toggle shortcut
  useShortcut('Shift+Enter', () => onToggleReady(), { scope: 'screen' });

  const playingCount = players.filter((p) => !p.isGod).length;
  const mafiaTotal = settings.roles.mafia.count + (settings.roles.godfather.enabled ? settings.roles.godfather.count : 0);
  const docTotal = settings.roles.doctor.enabled ? settings.roles.doctor.count : 0;
  const copTotal = settings.roles.police.enabled ? settings.roles.police.count : 0;
  const vigTotal = settings.roles.vigilante.enabled ? settings.roles.vigilante.count : 0;
  const jesterTotal = settings.roles.jester.enabled ? settings.roles.jester.count : 0;
  const specialTotal = mafiaTotal + docTotal + copTotal + vigTotal + jesterTotal;
  const minPlayersNeeded = Math.max(4, specialTotal, 2 * mafiaTotal + 1);
  const displayTotal = Math.max(playingCount, minPlayersNeeded);
  const civTotal = Math.max(0, displayTotal - specialTotal);

  const maxRoomCapacity = settings.maxPlayers || 12;
  const godfatherCount = settings.roles.godfather?.enabled ? (settings.roles.godfather.count || 1) : 0;
  const vigCount = settings.roles.vigilante?.enabled ? (settings.roles.vigilante.count || 1) : 0;
  const jesterCount = settings.roles.jester?.enabled ? (settings.roles.jester.count || 1) : 0;

  // Compute maximum allowed limits per role so combined special roles strictly never exceed maxPlayers
  const otherRolesForMafia = godfatherCount + docTotal + copTotal + vigCount + jesterCount;
  const maxAllowedMafia = Math.max(1, maxRoomCapacity - otherRolesForMafia);

  const otherRolesForDoctor = mafiaTotal + copTotal + vigCount + jesterCount;
  const maxAllowedDoctor = Math.max(1, maxRoomCapacity - otherRolesForDoctor);

  const otherRolesForPolice = mafiaTotal + docTotal + vigCount + jesterCount;
  const maxAllowedPolice = Math.max(1, maxRoomCapacity - otherRolesForPolice);

  const shareUrl = getRoomShareUrl(gameView.code);

  const handleCopyRoomCode = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(gameView.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleSuggestBalanced = () => {
    const mafia = Math.max(1, Math.round(playingCount / 4));
    const doctor = playingCount >= 5 ? 1 : 0;
    const police = playingCount >= 5 ? 1 : 0;
    onUpdateSettings({
      roles: {
        ...settings.roles,
        mafia: { count: mafia },
        godfather: { enabled: false, count: 0 },
        doctor: { enabled: doctor > 0, count: doctor },
        police: { enabled: police > 0, count: police },
      },
    });
  };

  const applyRolePreset = (presetName: keyof typeof ROLE_PRESETS) => {
    const preset = ROLE_PRESETS[presetName];
    onUpdateSettings({
      roles: {
        mafia: { count: preset.mafia },
        godfather: { enabled: preset.godfather > 0, count: preset.godfather },
        doctor: { enabled: preset.doctor > 0, count: preset.doctor },
        police: { enabled: preset.police > 0, count: preset.police },
        vigilante: { enabled: preset.vigilante > 0, count: preset.vigilante },
        jester: { enabled: preset.jester > 0, count: preset.jester },
      },
    });
  };

  const handleConfirmStart = () => {
    setStartConfirmOpen(false);
    onStart();
  };

  const handleConfirmKick = () => {
    if (pendingKickPlayer) {
      onKick(pendingKickPlayer.id);
      setPendingKickPlayer(null);
    }
  };

  return (
    <div className="w-full max-w-[1650px] 2xl:max-w-[1850px] mx-auto p-3 sm:p-5 md:p-8 space-y-6 text-bone">
      {/* 16:9 Widescreen Two-Column Layout on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Briefing Table & Operatives Roster (5 cols on Desktop) */}
        <div className="lg:col-span-5 space-y-5 flex flex-col">
          {/* Hero Room Header Card */}
          <div className="bg-ink-900 border border-line p-5 space-y-4 relative shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-line text-xs font-mono">
              <span className="text-bone-dim uppercase tracking-wider">
                Case Briefing Room
              </span>
              <span className="text-lamp uppercase tracking-wider font-semibold">
                Direct P2P Mesh
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={handleCopyRoomCode}
                  title="Click to copy case code"
                  className="group text-left"
                >
                  <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-bone group-hover:text-lamp transition-colors flex items-center gap-2.5">
                    <span>CASE #{gameView.code}</span>
                    {copiedCode ? (
                      <Check className="w-5 h-5 text-lamp shrink-0" />
                    ) : (
                      <Copy className="w-4 h-4 text-bone-dim group-hover:text-lamp transition-colors shrink-0" />
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-bone-dim mt-1">
                    {copiedCode ? (
                      <span className="text-lamp font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> COPIED TO CLIPBOARD
                      </span>
                    ) : (
                      'Click to copy code · Share to invite'
                    )}
                  </div>
                </button>
              </div>

              {/* Single Consolidated Invite Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(true)}
                  className="px-3.5 py-2 bg-ink-800 hover:bg-ink-800/80 text-bone hover:text-lamp border border-line hover:border-lamp/50 text-xs font-mono font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Invite</span>
                </button>
              </div>
            </div>

            {/* In-Lobby Voice Communication Strip */}
            {onToggleVoice && (
              <div className="flex items-center justify-between gap-3 p-2.5 bg-ink-950 border border-line/80 text-xs font-mono">
                <div className="flex items-center gap-2 min-w-0">
                  {isVoiceActive ? (
                    isVoiceMuted ? (
                      <MicOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-lamp animate-pulse shrink-0" />
                    )
                  ) : (
                    <MicOff className="w-3.5 h-3.5 text-bone-dim shrink-0" />
                  )}
                  <span className="truncate text-bone">
                    {isVoiceActive
                      ? (isVoiceMuted ? 'Voice: Mic Muted' : 'Voice: Live in Briefing')
                      : 'Voice Wire Available'}
                  </span>
                </div>

                {isVoiceActive ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={onToggleVoiceMute}
                      className="px-2.5 py-1 bg-ink-800 hover:bg-ink-800/80 text-bone border border-line text-[11px] uppercase tracking-wider font-semibold"
                    >
                      {isVoiceMuted ? 'Unmute' : 'Mute'}
                    </button>
                    <button
                      type="button"
                      onClick={onToggleVoice}
                      className="px-2 py-1 bg-blood/10 text-blood hover:bg-blood hover:text-white border border-blood/40 text-[11px] uppercase tracking-wider font-semibold flex items-center gap-1"
                      title="Leave voice wire"
                    >
                      <PhoneOff className="w-3 h-3" />
                      <span>Leave</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onToggleVoice}
                    className="px-2.5 py-1 bg-ink-800 hover:bg-ink-800/80 text-lamp border border-line hover:border-lamp text-[11px] uppercase tracking-wider font-semibold"
                  >
                    Join Wire
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Player Identity Dossier Selector */}
          <div className="bg-ink-900 border border-line p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-line text-xs font-mono">
              <span className="text-bone font-semibold">Your Alias & Portrait</span>
              <span className="text-bone-dim">Alias #{me?.avatar || 1}</span>
            </div>
            <div className="flex items-center gap-3">
              <Avatar avatarId={me?.avatar || 1} size={44} className="border border-line" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-bone truncate">{me?.name || 'You'}</div>
                <div className="text-[11px] text-bone-dim font-mono">Tap any portrait to switch alias:</div>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-1.5 pt-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    if (typeof localStorage !== 'undefined') {
                      localStorage.setItem('mafia-avatar', String(id));
                    }
                    onUpdateProfile?.({ avatar: id });
                  }}
                  title={`Avatar #${id}`}
                  className={`p-1 border transition-all flex items-center justify-center ${
                    (me?.avatar || 1) === id
                      ? 'border-lamp bg-lamp/15 ring-1 ring-lamp'
                      : 'border-line hover:border-bone-dim bg-ink-950 opacity-70 hover:opacity-100'
                  }`}
                >
                  <Avatar avatarId={id} size={28} className="pointer-events-none" />
                </button>
              ))}
            </div>
          </div>

          {/* Seated Operatives Roster */}
          <div className="flex-1 bg-ink-900 border border-line p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header: Title & Circle Sitting Setting */}
              <div className="space-y-3 pb-3 border-b border-line">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-lamp shrink-0" />
                    <h3 className="text-sm font-mono font-bold tracking-wider text-bone uppercase">
                      Connected Operatives ({players.length}/{settings.maxPlayers})
                    </h3>
                  </div>

                  {/* Mode Toggles */}
                  <div className="flex items-center gap-2">
                    {isHost ? (
                      <label className="flex items-center gap-2 text-xs text-bone-dim cursor-pointer hover:text-bone select-none bg-ink-950 px-2.5 py-1 border border-line">
                        <span className="font-mono text-[11px]">Circle Sitting</span>
                        <Switch
                          checked={Boolean(settings.circleSitting ?? true)}
                          onChange={(val) => onUpdateSettings({ circleSitting: val })}
                        />
                      </label>
                    ) : (
                      <span className="text-[11px] px-2 py-1 bg-ink-950 border border-line text-bone-dim font-mono">
                        {settings.circleSitting ? 'Circle Seating: ON' : 'Circle Seating: OFF'}
                      </span>
                    )}

                    {isHost ? (
                      <label className="flex items-center gap-2 text-xs text-bone-dim cursor-pointer hover:text-bone select-none bg-ink-950 px-2.5 py-1 border border-line">
                        <span className="font-mono text-[11px]">Narrator Mode</span>
                        <Switch checked={Boolean(me?.isGod)} onChange={(val) => onToggleGod(val)} />
                      </label>
                    ) : me?.isGod ? (
                      <span className="text-[11px] px-2 py-1 bg-ink-950 border border-line text-lamp font-mono">
                        Narrator
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Seated Operative Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {players.map((p) => {
                  const isSpeaking = speakingPeers[p.id];
                  return (
                    <div
                      key={p.id}
                      className={`relative flex items-center gap-3 p-2.5 border transition-all ${
                        p.id === me?.id ? 'bg-ink-800/90 border-lamp/50' : 'bg-ink-950 border-line'
                      } ${isSpeaking ? 'ring-1 ring-lamp' : ''}`}
                    >
                      <Avatar avatarId={p.avatar} size={38} className="border border-line/60" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-bone truncate max-w-[120px]">{p.name}</span>
                          {p.isHost && <span title="Host Operative"><Crown className="w-3.5 h-3.5 text-lamp shrink-0" /></span>}
                          {p.isGod && <span title="Narrator"><Shield className="w-3.5 h-3.5 text-bone-dim shrink-0" /></span>}
                          {(p.isBot || p.id.startsWith('bot_')) && (
                            <span className="text-[9px] font-mono font-bold px-1 bg-lamp/10 text-lamp border border-lamp/30 uppercase tracking-wider shrink-0">
                              BOT
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono mt-0.5">
                          {p.isGod ? (
                            <span className="text-bone-dim">Narrator</span>
                          ) : p.ready ? (
                            <span className="text-lamp font-bold uppercase tracking-wider">Ready ✓</span>
                          ) : (
                            <span className="text-bone-dim">Waiting</span>
                          )}
                        </div>
                      </div>

                      {isHost && p.id !== me?.id && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPendingKickPlayer(p)}
                            title={`Kick ${p.name}`}
                            className="opacity-40 hover:opacity-100 p-1 text-bone-dim hover:text-bone transition-opacity"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                          {onBan && (
                            <button
                              type="button"
                              onClick={() => setPendingBanPlayer(p)}
                              title={`Ban ${p.name} from room`}
                              className="opacity-40 hover:opacity-100 p-1 text-blood/60 hover:text-blood transition-opacity"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Empty Chair Silhouettes */}
                {Array.from({ length: Math.max(0, minPlayersNeeded - players.length) }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="flex items-center gap-3 p-2.5 border border-dashed border-line/50 bg-ink-950/40 opacity-50"
                  >
                    <div className="w-[38px] h-[38px] border border-dashed border-line flex items-center justify-center text-bone-dim/40 font-mono text-xs">
                      ?
                    </div>
                    <div className="text-[11px] font-mono text-bone-dim/60 italic">
                      Waiting for operative...
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Activity Wire in Lobby */}
            <div className="pt-3 border-t border-line space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-bone-dim uppercase flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-lamp animate-pulse" />
                  <span>Case Activity Wire</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('comms')}
                  className="text-bone-dim hover:text-lamp transition-colors"
                >
                  Open Comms →
                </button>
              </div>

              <div className="space-y-1 max-h-[90px] overflow-y-auto font-mono text-[10px]">
                {gameView.log && gameView.log.length > 0 ? (
                  gameView.log.slice(-3).reverse().map((entry) => (
                    <div
                      key={entry.id}
                      className="p-1.5 bg-ink-950 border border-line/60 flex items-center justify-between text-bone-dim truncate"
                    >
                      <span className="truncate mr-2 text-bone">{entry.text}</span>
                      <span className="text-[9px] text-bone-dim/60 shrink-0">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-2 bg-ink-950 border border-line/40 text-[10px] text-bone-dim/60 text-center font-mono">
                    Waiting for operatives to take seats...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Case Configuration & Rulebook Setup (7 cols on Desktop) */}
        <div className="lg:col-span-7 bg-ink-900 border border-line p-5 sm:p-6 space-y-6 flex flex-col justify-between shadow-md">
          <div className="space-y-5">
            {/* Tab Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
              <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('roles')}
                  className={`px-3.5 py-1.5 font-semibold uppercase tracking-wider border transition-colors ${
                    activeTab === 'roles'
                      ? 'bg-bone text-ink-950 border-bone font-bold'
                      : 'bg-ink-950 text-bone-dim border-line hover:border-bone-dim hover:text-bone'
                  }`}
                >
                  Roles Deck
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`px-3.5 py-1.5 font-semibold uppercase tracking-wider border transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-bone text-ink-950 border-bone font-bold'
                      : 'bg-ink-950 text-bone-dim border-line hover:border-bone-dim hover:text-bone'
                  }`}
                >
                  Rules & Timers
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('comms')}
                  className={`px-3.5 py-1.5 font-semibold uppercase tracking-wider border transition-colors flex items-center gap-1.5 ${
                    activeTab === 'comms'
                      ? 'bg-bone text-ink-950 border-bone font-bold'
                      : 'bg-ink-950 text-bone-dim border-line hover:border-bone-dim hover:text-bone'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Comms Wire</span>
                  {chatList.filter((m) => m.channel === 'public').length > 0 && (
                    <span className="ml-1 px-1 bg-ink-800 text-bone text-[9px] font-mono">
                      {chatList.filter((m) => m.channel === 'public').length}
                    </span>
                  )}
                </button>
                {isHost && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('tools')}
                    className={`px-3.5 py-1.5 font-semibold uppercase tracking-wider border transition-colors flex items-center gap-1.5 ${
                      activeTab === 'tools'
                        ? 'bg-bone text-ink-950 border-bone font-bold'
                        : 'bg-ink-950 text-bone-dim border-line hover:border-bone-dim hover:text-bone'
                    }`}
                  >
                    <Bot className="w-3 h-3" />
                    <span>Host Tools</span>
                  </button>
                )}
              </div>

              {activeTab === 'roles' && isHost && (
                <button
                  type="button"
                  onClick={handleSuggestBalanced}
                  className="px-3 py-1 bg-ink-800 hover:bg-ink-800/80 text-bone hover:text-lamp border border-line text-xs font-mono uppercase tracking-wider transition-colors"
                >
                  Suggest Balanced
                </button>
              )}
            </div>

            {/* Tab 1: Roles Deck Tab */}
            {activeTab === 'roles' && (
              <div className="space-y-5">
                {/* Composition Breakdown Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-bone">Case Composition:</span>
                    <span className="text-bone-dim">
                      {playingCount < minPlayersNeeded ? (
                        <>
                          <strong className="text-bone font-bold">{mafiaTotal} Mafia</strong>
                          {docTotal > 0 && ` · ${docTotal} Doctor`}
                          {copTotal > 0 && ` · ${copTotal} Police`}
                          {vigTotal > 0 && ` · ${vigTotal} Vigilante`}
                          {jesterTotal > 0 && ` · ${jesterTotal} Jester`}
                          {civTotal > 0 && ` · ${civTotal} Civilians`}
                          <span className="ml-1.5 text-lamp font-medium">
                            (Min {minPlayersNeeded} operatives · {playingCount} seated)
                          </span>
                        </>
                      ) : (
                        `${playingCount} Operatives: ${mafiaTotal} Mafia · ${docTotal} Doctor · ${copTotal} Police · ${civTotal} Civilians`
                      )}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-ink-950 border border-line overflow-hidden flex">
                    <div style={{ width: `${(mafiaTotal / displayTotal) * 100}%` }} className="bg-blood h-full" title={`${mafiaTotal} Mafia`} />
                    <div style={{ width: `${(docTotal / displayTotal) * 100}%` }} className="bg-verdigris h-full" title={`${docTotal} Doctor`} />
                    <div style={{ width: `${(copTotal / displayTotal) * 100}%` }} className="bg-night h-full" title={`${copTotal} Police`} />
                    <div style={{ width: `${(vigTotal / displayTotal) * 100}%` }} className="bg-lamp h-full" title={`${vigTotal} Vigilante`} />
                    <div style={{ width: `${(jesterTotal / displayTotal) * 100}%` }} className="bg-plum h-full" title={`${jesterTotal} Jester`} />
                    <div style={{ width: `${(civTotal / displayTotal) * 100}%` }} className="bg-line h-full" title={`${civTotal} Civilians`} />
                  </div>
                </div>

                {/* Quick Presets */}
                {isHost && (
                  <div className="flex flex-wrap items-center gap-2 font-mono">
                    <span className="text-xs text-bone-dim mr-1">Presets:</span>
                    {Object.keys(ROLE_PRESETS).map((pname) => (
                      <button
                        key={pname}
                        type="button"
                        onClick={() => applyRolePreset(pname as any)}
                        className="px-2.5 py-1 text-xs capitalize bg-ink-950 hover:bg-ink-800 border border-line hover:border-bone-dim text-bone transition-colors"
                      >
                        {pname}
                      </button>
                    ))}
                  </div>
                )}

                {/* Role Cards Deck Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Mafia Card */}
                  <div className="p-3.5 bg-ink-950 border border-line flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-bone">Mafia</span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-blood/10 text-red-300 border border-blood/30">
                          Syndicate
                        </span>
                      </div>
                      <div className="text-xs text-bone-dim mt-1">Strikes secretly each night</div>
                    </div>
                    {isHost && (
                      <Stepper
                        value={Math.min(settings.roles.mafia.count, maxAllowedMafia)}
                        min={1}
                        max={maxAllowedMafia}
                        onChange={(val) =>
                          onUpdateSettings({ roles: { ...settings.roles, mafia: { count: Math.min(val, maxAllowedMafia) } } })
                        }
                      />
                    )}
                  </div>

                  {/* Godfather Card */}
                  <div className="p-3.5 bg-ink-950 border border-line flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-bone">Godfather</span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-blood/10 text-red-300 border border-blood/30">
                          Boss
                        </span>
                      </div>
                      <div className="text-xs text-bone-dim mt-1">Appears innocent to police</div>
                    </div>
                    {isHost && (
                      <Switch
                        checked={Boolean(settings.roles.godfather?.enabled)}
                        onChange={(val) => {
                          if (val && specialTotal + 1 > maxRoomCapacity) return;
                          onUpdateSettings({
                            roles: {
                              ...settings.roles,
                              godfather: { enabled: val, count: val ? 1 : 0 },
                            },
                          });
                        }}
                      />
                    )}
                  </div>

                  {/* Doctor Card */}
                  <div className="p-3.5 bg-ink-950 border border-line flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-bone">Doctor</span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-verdigris/15 text-emerald-300 border border-verdigris/30">
                          Town
                        </span>
                      </div>
                      <div className="text-xs text-bone-dim mt-1">Protects 1 target from harm</div>
                    </div>
                    {isHost && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={settings.roles.doctor.enabled}
                          onChange={(val) => {
                            if (val) {
                              if (otherRolesForDoctor >= maxRoomCapacity) return;
                              const count = Math.min(Math.max(1, settings.roles.doctor.count || 1), maxAllowedDoctor);
                              onUpdateSettings({
                                roles: {
                                  ...settings.roles,
                                  doctor: { enabled: true, count },
                                },
                              });
                            } else {
                              onUpdateSettings({
                                roles: {
                                  ...settings.roles,
                                  doctor: { enabled: false, count: 0 },
                                },
                              });
                            }
                          }}
                        />
                        {settings.roles.doctor.enabled && (
                          <Stepper
                            value={Math.min(settings.roles.doctor.count, maxAllowedDoctor)}
                            min={1}
                            max={maxAllowedDoctor}
                            onChange={(val) =>
                              onUpdateSettings({ roles: { ...settings.roles, doctor: { enabled: true, count: Math.min(val, maxAllowedDoctor) } } })
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Police Card */}
                  <div className="p-3.5 bg-ink-950 border border-line flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-bone">Police</span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-night/20 text-blue-300 border border-night/40">
                          Investigative
                        </span>
                      </div>
                      <div className="text-xs text-bone-dim mt-1">Uncovers allegiance each night</div>
                    </div>
                    {isHost && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={settings.roles.police.enabled}
                          onChange={(val) => {
                            if (val) {
                              if (otherRolesForPolice >= maxRoomCapacity) return;
                              const count = Math.min(Math.max(1, settings.roles.police.count || 1), maxAllowedPolice);
                              onUpdateSettings({
                                roles: {
                                  ...settings.roles,
                                  police: { enabled: true, count },
                                },
                              });
                            } else {
                              onUpdateSettings({
                                roles: {
                                  ...settings.roles,
                                  police: { enabled: false, count: 0 },
                                },
                              });
                            }
                          }}
                        />
                        {settings.roles.police.enabled && (
                          <Stepper
                            value={Math.min(settings.roles.police.count, maxAllowedPolice)}
                            min={1}
                            max={maxAllowedPolice}
                            onChange={(val) =>
                              onUpdateSettings({ roles: { ...settings.roles, police: { enabled: true, count: Math.min(val, maxAllowedPolice) } } })
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vigilante Card */}
                  <div className="p-3.5 bg-ink-950 border border-line flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-bone">Vigilante</span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-lamp/15 text-lamp border border-lamp/30">
                          Rogue
                        </span>
                      </div>
                      <div className="text-xs text-bone-dim mt-1">One-shot marksman</div>
                    </div>
                    {isHost && (
                      <Switch
                        checked={settings.roles.vigilante.enabled}
                        onChange={(val) => {
                          if (val && specialTotal + 1 > maxRoomCapacity) return;
                          onUpdateSettings({
                            roles: { ...settings.roles, vigilante: { enabled: val, count: val ? 1 : 0 } },
                          });
                        }}
                      />
                    )}
                  </div>

                  {/* Jester Card */}
                  <div className="p-3.5 bg-ink-950 border border-line flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-bone">Jester</span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-plum/20 text-purple-300 border border-plum/40">
                          Chaos
                        </span>
                      </div>
                      <div className="text-xs text-bone-dim mt-1">Wins if eliminated in day vote</div>
                    </div>
                    {isHost && (
                      <Switch
                        checked={settings.roles.jester.enabled}
                        onChange={(val) => {
                          if (val && specialTotal + 1 > maxRoomCapacity) return;
                          onUpdateSettings({
                            roles: { ...settings.roles, jester: { enabled: val, count: val ? 1 : 0 } },
                          });
                        }}
                      />
                    )}
                  </div>

                  {/* Civilian Card */}
                  <div className="p-3.5 bg-ink-950 border border-line flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-bone">Civilian</span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-ink-800 text-bone-dim border border-line">
                          Town
                        </span>
                      </div>
                      <div className="text-xs text-bone-dim mt-1">Remaining town members</div>
                    </div>
                    <span className="text-xs font-mono text-bone-dim font-medium">Auto: {civTotal}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Rules & Timers */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                {/* Rule Presets Quick Selector */}
                <div className="p-3.5 bg-ink-950 border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-bone block">Match Rule Presets</span>
                    <span className="text-[11px] text-bone-dim">Quick configurations for pacing, timers, and secrecy</span>
                  </div>
                  {isHost ? (
                    <div className="flex flex-wrap gap-2 font-mono">
                      {Object.keys(RULE_PRESETS).map((presetName) => (
                        <button
                          key={presetName}
                          type="button"
                          onClick={() => onUpdateSettings(RULE_PRESETS[presetName])}
                          className="px-2.5 py-1 text-xs border border-line hover:border-lamp bg-ink-900 text-bone hover:text-lamp transition-colors"
                        >
                          {presetName}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-bone-dim font-mono border border-line px-2.5 py-1 bg-ink-900">
                      Host Configured
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SETTINGS_SCHEMA.filter((s) => !s.showIf || s.showIf(settings)).map((s) => (
                    <div key={s.key} className="p-3 bg-ink-950 border border-line flex items-center justify-between">
                      <div className="pr-2">
                        <div className="text-xs font-semibold text-bone">{s.label}</div>
                        <div className="text-[10px] text-bone-dim">{s.tooltip}</div>
                      </div>

                      {isHost ? (
                        s.type === 'toggle' ? (
                          <Switch
                            checked={Boolean((settings as any)[s.key])}
                            onChange={(val) => onUpdateSettings({ [s.key]: val })}
                          />
                        ) : s.type === 'number' ? (
                          <Stepper
                            value={Number((settings as any)[s.key])}
                            min={s.min}
                            max={s.max}
                            step={s.step}
                            onChange={(val) => onUpdateSettings({ [s.key]: val })}
                          />
                        ) : (
                          <select
                            value={String((settings as any)[s.key])}
                            onChange={(e) => onUpdateSettings({ [s.key]: e.target.value })}
                            className="bg-ink-900 border border-line text-xs font-mono px-2 py-1 text-bone focus:outline-none focus:border-lamp"
                          >
                            {s.options?.map((opt) => (
                              <option key={opt.value} value={opt.value} className="bg-ink-900 text-bone">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )
                      ) : (
                        <span className="text-xs text-bone-dim font-mono">{s.plain((settings as any)[s.key])}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Comms & Logs Tab */}
            {activeTab === 'comms' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[380px]">
                  {/* Left Column: Official Room Event Logs */}
                  <div className="bg-ink-950 border border-line p-3 flex flex-col justify-between overflow-hidden">
                    <div className="flex items-center justify-between pb-2 border-b border-line text-xs font-mono">
                      <span className="font-bold text-bone uppercase flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-lamp" />
                        <span>Case Event Logs</span>
                      </span>
                      <span className="text-[10px] text-bone-dim">
                        {gameView.log?.length || 0} events
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 py-2 font-mono text-xs pr-1">
                      {gameView.log && gameView.log.length > 0 ? (
                        [...gameView.log].reverse().map((entry) => (
                          <div
                            key={entry.id}
                            className={`p-2 border text-[11px] leading-relaxed ${
                              entry.type === 'death'
                                ? 'bg-blood/10 border-blood/40 text-red-200'
                                : entry.type === 'vote'
                                ? 'bg-lamp/10 border-lamp/40 text-lamp'
                                : 'bg-ink-900 border-line text-bone'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[9px] text-bone-dim mb-0.5">
                              <span className="uppercase">{entry.phase}</span>
                              <span>
                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                            <div>{entry.text}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-bone-dim/60 text-center pt-24 text-xs font-mono">
                          No room events recorded yet.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Public Lobby Chat */}
                  <div className="bg-ink-950 border border-line p-3 flex flex-col justify-between overflow-hidden">
                    <div className="flex items-center justify-between pb-2 border-b border-line text-xs font-mono">
                      <span className="font-bold text-bone uppercase flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-bone" />
                        <span>Lobby Comms Wire</span>
                      </span>
                      <span className="text-[10px] text-bone-dim">
                        All Operatives
                      </span>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto space-y-1.5 py-2 text-xs pr-1">
                      {chatList
                        .filter((m) => m.channel === 'public')
                        .map((m) => (
                          <div
                            key={m.id}
                            className={`p-2 border leading-relaxed ${
                              m.senderId === 'system'
                                ? 'bg-ink-900 border-line text-lamp font-mono text-[11px]'
                                : 'bg-ink-900 border-line text-bone'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[9px] text-bone-dim mb-0.5 font-mono">
                              <span className="font-bold text-bone">
                                {m.senderId === 'system' ? '[SYSTEM]' : m.senderName}
                              </span>
                              <span>
                                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-xs">{m.text}</div>
                          </div>
                        ))}
                      {chatList.filter((m) => m.channel === 'public').length === 0 && (
                        <div className="text-bone-dim/60 text-center pt-24 text-xs font-mono">
                          Comms wire quiet. Say hello to everyone!
                        </div>
                      )}
                    </div>

                    {/* Chat Input */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!lobbyChatInput.trim() || !onSendChat) return;
                        onSendChat('public', lobbyChatInput.trim());
                        setLobbyChatInput('');
                      }}
                      className="pt-2 border-t border-line flex gap-2"
                    >
                      <input
                        type="text"
                        value={lobbyChatInput}
                        onChange={(e) => setLobbyChatInput(e.target.value)}
                        placeholder="Type message to lobby..."
                        maxLength={300}
                        className="flex-1 bg-ink-900 border border-line px-3 py-1.5 text-xs text-bone placeholder:text-bone-dim/50 focus:outline-none focus:border-lamp"
                      />
                      <button
                        type="submit"
                        className="px-3 bg-ink-800 hover:bg-ink-800/80 text-bone hover:text-lamp border border-line text-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Host Tools (Relocated Test Bots with clear human explanation) */}
            {activeTab === 'tools' && isHost && (
              <div className="space-y-4">
                <div className="p-4 bg-ink-950 border border-line space-y-3">
                  <div>
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-bone flex items-center gap-2">
                      <Bot className="w-4 h-4 text-lamp" />
                      <span>Automated Test Operatives (Simulated Bots)</span>
                    </h4>
                    <p className="text-xs text-bone-dim mt-1 leading-relaxed">
                      Deploy autonomous simulated bots to quickly test match pacing, role mechanics, night actions, and day voting without needing multiple browser tabs.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {onAddBots && (
                      <button
                        type="button"
                        onClick={onAddBots}
                        className="px-4 py-2 bg-lamp text-ink-950 font-mono text-xs font-bold uppercase tracking-wider hover:bg-lamp-soft transition-colors flex items-center gap-1.5"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>+ Test Bots ({Math.max(0, minPlayersNeeded - players.length) > 0 ? `+${Math.max(0, minPlayersNeeded - players.length)} needed` : 'Fill Room'})</span>
                      </button>
                    )}

                    {players.some((p) => p.isBot || p.id.startsWith('bot_')) && onClearBots && (
                      <button
                        type="button"
                        onClick={onClearBots}
                        className="px-3.5 py-2 bg-ink-900 hover:bg-ink-800 text-blood hover:text-white border border-blood/40 hover:border-blood font-mono text-xs font-bold uppercase tracking-wider transition-colors"
                      >
                        Clear Bots
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Start / Ready Action Bar at Bottom of Setup Panel */}
          <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs md:text-sm text-center sm:text-left font-mono">
              {!validation.valid ? (
                <span className="text-lamp font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-lamp shrink-0" /> {validation.reason}
                </span>
              ) : unreadyPlayers.length > 0 ? (
                <span className="text-lamp font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-lamp shrink-0" /> Waiting for {unreadyPlayers.length} operative{unreadyPlayers.length > 1 ? 's' : ''} to mark Ready
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Ready to commence night investigation
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {!isHost && (
                <button
                  type="button"
                  onClick={onToggleReady}
                  className={`w-full sm:w-auto px-6 py-2.5 font-mono text-xs uppercase tracking-wider font-bold border transition-all ${
                    me?.isReady
                      ? 'bg-ink-800 text-bone-dim border-line hover:text-bone'
                      : 'bg-lamp text-ink-950 border-lamp hover:bg-lamp-soft shadow-md'
                  }`}
                >
                  {me?.isReady ? 'Cancel Ready' : 'Mark Ready'}
                  <Kbd className="ml-2 border-line/60 bg-ink-950/40 text-current">Shift+Enter</Kbd>
                </button>
              )}

              {isHost && (
                <button
                  type="button"
                  disabled={!validation.valid || unreadyPlayers.length > 0}
                  onClick={() => setStartConfirmOpen(true)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-lamp text-ink-950 font-mono text-xs font-bold uppercase tracking-wider shadow-lg hover:bg-lamp-soft active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Match</span>
                  <Kbd className="ml-1 border-ink-950/40 bg-ink-950/20 text-ink-950">Ctrl+Enter</Kbd>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Start Match Confirmation Modal */}
      <Modal
        isOpen={startConfirmOpen}
        onClose={() => setStartConfirmOpen(false)}
        title="COMMENCE OPERATION"
      >
        <div className="space-y-4 text-bone font-mono">
          <p className="text-xs leading-relaxed">
            Begin the investigation with <strong className="text-lamp font-bold">{players.length} operatives</strong>?
          </p>
          <div className="p-3 bg-ink-950 border border-line text-[11px] text-bone-dim">
            All players will immediately be assigned their secret roles and Night 1 will commence.
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setStartConfirmOpen(false)}
              className="px-3 py-1.5 bg-ink-900 border border-line text-bone-dim hover:text-bone text-xs uppercase"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmStart}
              className="px-4 py-1.5 bg-lamp text-ink-950 font-bold text-xs uppercase hover:bg-lamp-soft"
            >
              Commence Match
            </button>
          </div>
        </div>
      </Modal>

      {/* Kick Player Confirmation Modal */}
      <Modal
        isOpen={Boolean(pendingKickPlayer)}
        onClose={() => setPendingKickPlayer(null)}
        title="EXPEL OPERATIVE"
      >
        <div className="space-y-4 text-bone font-mono">
          <p className="text-xs leading-relaxed">
            Remove <strong className="text-lamp">{pendingKickPlayer?.name}</strong> from the briefing room?
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setPendingKickPlayer(null)}
              className="px-3 py-1.5 bg-ink-900 border border-line text-bone-dim hover:text-bone text-xs uppercase"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmKick}
              className="px-4 py-1.5 bg-blood text-white font-bold text-xs uppercase hover:bg-blood/80"
            >
              Expel
            </button>
          </div>
        </div>
      </Modal>

      {/* Ban Player Confirmation Modal */}
      <Modal
        isOpen={Boolean(pendingBanPlayer)}
        onClose={() => setPendingBanPlayer(null)}
        title="PERMANENT BAN"
      >
        <div className="space-y-4 text-bone font-mono">
          <p className="text-xs leading-relaxed">
            Permanently ban <strong className="text-lamp">{pendingBanPlayer?.name}</strong> from this room?
          </p>
          <div className="p-3 bg-blood/10 border border-blood/40 text-[11px] text-red-200">
            Their device token will be permanently blocked from rejoining this case room.
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setPendingBanPlayer(null)}
              className="px-3 py-1.5 bg-ink-900 border border-line text-bone-dim hover:text-bone text-xs uppercase"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmBan}
              className="px-4 py-1.5 bg-blood text-white font-bold text-xs uppercase hover:bg-blood/80"
            >
              Confirm Ban
            </button>
          </div>
        </div>
      </Modal>

      {/* Unified Invite & QR Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="INVITE OPERATIVES"
      >
        <div className="flex flex-col items-center justify-center p-4 space-y-5 text-bone font-mono">
          <div className="p-4 bg-bone border border-line shadow-inner">
            <QRCodeSVG value={shareUrl} size={200} />
          </div>

          <div className="text-center space-y-1">
            <div className="text-2xl font-bold tracking-widest text-bone">
              CASE #{gameView.code}
            </div>
            <div className="text-xs text-bone-dim">
              Scan with phone camera or share link below
            </div>
          </div>

          <div className="w-full space-y-2 pt-2 border-t border-line">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-ink-950 border border-line px-3 py-1.5 text-xs text-bone-dim select-all font-mono"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-ink-800 hover:bg-ink-800/80 text-bone hover:text-lamp border border-line text-xs font-semibold uppercase"
              >
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
