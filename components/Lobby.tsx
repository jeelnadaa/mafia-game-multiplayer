'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Crown, Shield, Users, Play, Copy, Check, QrCode, UserMinus, AlertTriangle, MessageSquare, Send, Activity, Lock, Ban, Bot } from 'lucide-react';
import { ClientGameView, Settings, PlayerView } from '@/lib/types';
import { SETTINGS_SCHEMA, ROLE_PRESETS, RULE_PRESETS } from '@/lib/settings';
import { validateSettings } from '@/lib/engine/rules';
import { Button, Badge, Switch, Stepper, Avatar, Modal, Kbd } from './ui';
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
}: LobbyProps) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'roles' | 'settings' | 'comms'>('roles');
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

  const shareUrl = getRoomShareUrl(gameView.code);

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
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
    <div className="w-full max-w-[1650px] 2xl:max-w-[1850px] mx-auto p-4 md:p-8 lg:p-10 space-y-6">
      {/* 16:9 Widescreen Two-Column Layout on PC, Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Room Code & Players Roster (5 cols on Desktop) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          {/* Room Banner */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-sm font-medium text-muted">
                Room Invitation
              </span>
              <span className="text-xs text-muted">Direct P2P Mesh</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-4xl md:text-5xl font-mono font-bold tracking-wider text-text">
                  {gameView.code}
                </div>
                <div className="text-sm text-muted mt-1 truncate max-w-xs md:max-w-md">
                  {shareUrl}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isHost && onToggleLockRoom && (
                  <Button
                    variant={gameView.isLocked ? 'primary' : 'secondary'}
                    size="md"
                    onClick={onToggleLockRoom}
                    title={gameView.isLocked ? 'Unlock room for new players' : 'Lock room against new players'}
                    className="font-medium"
                  >
                    <Lock className="w-4 h-4 mr-1.5" />
                    <span>{gameView.isLocked ? 'Locked' : 'Lock Room'}</span>
                  </Button>
                )}
                <Button variant="secondary" size="md" onClick={handleCopyLink} className="font-medium">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
                </Button>
                <Button variant="secondary" size="md" onClick={() => setShowQr(true)}>
                  <QrCode className="w-4 h-4" />
                  <span>QR</span>
                </Button>
              </div>

            </div>
          </div>

          {/* Your Profile & Avatar Selector */}
          <div className="bg-surface border border-border p-6 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-sm font-bold text-text">Your Avatar & Identity</span>
              <span className="text-xs text-muted">Avatar #{me?.avatar || 1}</span>
            </div>
            <div className="flex items-center gap-4">
              <Avatar avatarId={me?.avatar || 1} size={52} className="rounded-none border-white/80" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-text truncate">{me?.name || 'You'}</div>
                <div className="text-xs text-muted mt-0.5">Click any color box to switch avatar:</div>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2 pt-1">
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
                  className={`p-1 border transition-colors flex items-center justify-center rounded-none ${
                    (me?.avatar || 1) === id
                      ? 'border-white bg-white/10 ring-1 ring-white'
                      : 'border-border hover:border-zinc-500 bg-surface-2'
                  }`}
                >
                  <Avatar avatarId={id} size={32} className="rounded-none pointer-events-none" />
                </button>
              ))}
            </div>
          </div>

          {/* Players Roster */}
          <div className="flex-1 bg-surface border border-border p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header: Title and Test Actions */}
              <div className="space-y-3 pb-3 border-b border-border">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-white shrink-0" />
                    <h3 className="text-base font-bold text-text">
                      Connected Players ({players.length}/{settings.maxPlayers})
                    </h3>
                  </div>

                  {isHost && onAddBots && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={onAddBots}
                        title={`Add minimum test bots required to start match (${Math.max(0, minPlayersNeeded - players.length)} needed)`}
                        className="text-xs font-semibold py-1 px-2.5 h-7 shadow-sm"
                      >
                        <Bot className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                        <span>+ Test Bots ({Math.max(0, minPlayersNeeded - players.length) > 0 ? `+${Math.max(0, minPlayersNeeded - players.length)}` : 'Fill'})</span>
                      </Button>
                      {players.some((p) => p.isBot || p.id.startsWith('bot_')) && onClearBots && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={onClearBots}
                          title="Remove all automated test bots from the room"
                          className="text-xs py-1 px-2 h-7 text-muted hover:text-red-400"
                        >
                          Clear Bots
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Sub-bar: Sitting & Narrator Toggles formatted cleanly with badges & cards */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  {isHost ? (
                    <label className="flex items-center gap-2 text-xs text-muted cursor-pointer hover:text-text select-none bg-surface-2 px-2.5 py-1.5 border border-border">
                      <span className="font-medium">Circle Sitting</span>
                      <Switch
                        checked={Boolean(settings.circleSitting ?? true)}
                        onChange={(val) => onUpdateSettings({ circleSitting: val })}
                      />
                    </label>
                  ) : (
                    <span className="text-[11px] px-2.5 py-1.5 bg-surface-2 border border-border text-muted font-mono">
                      {settings.circleSitting ? 'Circle Seating: ON' : 'Circle Seating: OFF'}
                    </span>
                  )}

                  {isHost ? (
                    <label className="flex items-center gap-2 text-xs text-muted cursor-pointer hover:text-text select-none bg-surface-2 px-2.5 py-1.5 border border-border">
                      <span className="font-medium">Narrator (God) Mode</span>
                      <Switch checked={Boolean(me?.isGod)} onChange={(val) => onToggleGod(val)} />
                    </label>
                  ) : me?.isGod ? (
                    <span className="text-[11px] px-2.5 py-1.5 bg-surface-2 border border-border text-zinc-300 font-mono">
                      Narrator Mode
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Player Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className={`relative flex items-center gap-3 p-3 border transition-colors ${
                      p.id === me?.id ? 'bg-surface-2 border-white/70' : 'bg-surface-2/60 border-border'
                    }`}
                  >
                    <Avatar avatarId={p.avatar} size={44} className="rounded-none" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-text truncate max-w-[120px] sm:max-w-[140px]">{p.name}</span>
                        {p.isHost && <Crown className="w-4 h-4 text-white shrink-0" />}
                        {p.isGod && <Shield className="w-4 h-4 text-zinc-400 shrink-0" />}
                        {(p.isBot || p.id.startsWith('bot_')) && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider shrink-0">
                            BOT
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {p.isGod ? 'Moderator' : p.ready ? 'Ready ✓' : 'Waiting'}
                      </div>
                    </div>

                    {isHost && p.id !== me?.id && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPendingKickPlayer(p)}
                          title={`Kick ${p.name}`}
                          className="opacity-50 hover:opacity-100 p-1.5 text-muted hover:text-white transition-opacity"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                        {onBan && (
                          <button
                            type="button"
                            onClick={() => setPendingBanPlayer(p)}
                            title={`Ban ${p.name} from room`}
                            className="opacity-50 hover:opacity-100 p-1.5 text-red-400 hover:text-red-300 transition-opacity"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </div>

            {/* Live Lobby Activity Feed */}
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-muted uppercase flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Room Activity</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('comms')}
                  className="text-[11px] text-muted hover:text-white underline cursor-pointer"
                >
                  Open Comms →
                </button>
              </div>

              <div className="space-y-1.5 max-h-[110px] overflow-y-auto font-mono text-[11px]">
                {gameView.log && gameView.log.length > 0 ? (
                  gameView.log.slice(-4).reverse().map((entry) => (
                    <div
                      key={entry.id}
                      className="p-1.5 bg-surface-2 border border-border/80 flex items-center justify-between text-text truncate"
                    >
                      <span className="truncate mr-2">{entry.text}</span>
                      <span className="text-[10px] text-muted shrink-0">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-2 bg-surface-2/60 border border-border text-[11px] text-muted text-center">
                    Waiting for players to join...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Roles Configuration & Match Settings (7 cols on Desktop) */}
        <div className="lg:col-span-7 bg-surface border border-border p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Tabs & Presets */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('roles')}
                  className={`px-4 py-2 text-sm font-medium border transition-colors ${
                    activeTab === 'roles'
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-surface-2 text-muted border-border hover:border-zinc-500 hover:text-text'
                  }`}
                >
                  Roles Setup
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-2 text-sm font-medium border transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-surface-2 text-muted border-border hover:border-zinc-500 hover:text-text'
                  }`}
                >
                  Rules & Timers
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('comms')}
                  className={`px-4 py-2 text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                    activeTab === 'comms'
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-surface-2 text-muted border-border hover:border-zinc-500 hover:text-text'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Comms & Logs</span>
                  {chatList.filter((m) => m.channel === 'public').length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-zinc-800 text-white text-[10px] rounded-none">
                      {chatList.filter((m) => m.channel === 'public').length}
                    </span>
                  )}
                </button>
              </div>

              {activeTab === 'roles' && isHost && (
                <Button variant="secondary" size="sm" onClick={handleSuggestBalanced}>
                  <span>Suggest Balanced</span>
                </Button>
              )}
            </div>

            {/* Roles Setup Tab */}
            {activeTab === 'roles' && (
              <div className="space-y-5">
                {/* Composition Breakdown Bar (Clean monochrome segments) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs md:text-sm">
                    <span className="font-semibold text-text">Composition:</span>
                    <span className="text-muted">
                      {playingCount < minPlayersNeeded ? (
                        <>
                          <strong className="text-white font-mono">{mafiaTotal} Mafia</strong>
                          {docTotal > 0 && ` · ${docTotal} Doctor`}
                          {copTotal > 0 && ` · ${copTotal} Police`}
                          {vigTotal > 0 && ` · ${vigTotal} Vigilante`}
                          {jesterTotal > 0 && ` · ${jesterTotal} Jester`}
                          {civTotal > 0 && ` · ${civTotal} Civilians`}
                          <span className="ml-1.5 text-amber-400 font-medium">
                            (Requires min {minPlayersNeeded} players · currently {playingCount})
                          </span>
                        </>
                      ) : (
                        `${playingCount} Players: ${mafiaTotal} Mafia · ${docTotal} Doctor · ${copTotal} Police · ${civTotal} Civilians`
                      )}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-surface-2 border border-border overflow-hidden flex">
                    <div style={{ width: `${(mafiaTotal / displayTotal) * 100}%` }} className="bg-white h-full" title={`${mafiaTotal} Mafia`} />
                    <div style={{ width: `${(docTotal / displayTotal) * 100}%` }} className="bg-zinc-400 h-full" title={`${docTotal} Doctor`} />
                    <div style={{ width: `${(copTotal / displayTotal) * 100}%` }} className="bg-zinc-500 h-full" title={`${copTotal} Police`} />
                    <div style={{ width: `${(vigTotal / displayTotal) * 100}%` }} className="bg-zinc-600 h-full" title={`${vigTotal} Vigilante`} />
                    <div style={{ width: `${(jesterTotal / displayTotal) * 100}%` }} className="bg-zinc-700 h-full" title={`${jesterTotal} Jester`} />
                    <div style={{ width: `${(civTotal / displayTotal) * 100}%` }} className="bg-zinc-800 h-full" title={`${civTotal} Civilians`} />
                  </div>
                </div>

                {/* Presets */}
                {isHost && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs md:text-sm text-muted mr-1">Presets:</span>
                    {Object.keys(ROLE_PRESETS).map((pname) => (
                      <button
                        key={pname}
                        type="button"
                        onClick={() => applyRolePreset(pname as any)}
                        className="px-3 py-1.5 text-xs md:text-sm capitalize bg-surface-2 hover:bg-zinc-800 border border-border text-text transition-colors font-medium"
                      >
                        {pname}
                      </button>
                    ))}
                  </div>
                )}

                {/* Role Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Mafia */}
                  <div className="p-4 bg-surface-2 border border-border flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Mafia</span>
                        <Badge color="mafia">Syndicate</Badge>
                      </div>
                      <div className="text-xs text-muted mt-1">Strikes secretly each night</div>
                    </div>
                    {isHost && (
                      <Stepper
                        value={settings.roles.mafia.count}
                        min={1}
                        max={settings.maxPlayers || 12}
                        onChange={(val) =>
                          onUpdateSettings({ roles: { ...settings.roles, mafia: { count: val } } })
                        }
                      />
                    )}
                  </div>

                  {/* Godfather */}
                  <div className="p-4 bg-surface-2 border border-border flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Godfather</span>
                        <Badge color="mafia">Boss</Badge>
                      </div>
                      <div className="text-xs text-muted mt-1">Appears innocent to police</div>
                    </div>
                    {isHost && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={Boolean(settings.roles.godfather?.enabled)}
                          onChange={(val) =>
                            onUpdateSettings({
                              roles: {
                                ...settings.roles,
                                godfather: { enabled: val, count: val ? 1 : 0 },
                              },
                            })
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* Doctor */}
                  <div className="p-4 bg-surface-2 border border-border flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Doctor</span>
                        <Badge color="doctor">Town</Badge>
                      </div>
                      <div className="text-xs text-muted mt-1">Protects 1 target from harm</div>
                    </div>
                    {isHost && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={settings.roles.doctor.enabled}
                          onChange={(val) =>
                            onUpdateSettings({
                              roles: {
                                ...settings.roles,
                                doctor: { enabled: val, count: val ? Math.max(1, settings.roles.doctor.count) : 0 },
                              },
                            })
                          }
                        />
                        {settings.roles.doctor.enabled && (
                          <Stepper
                            value={settings.roles.doctor.count}
                            min={1}
                            max={settings.maxPlayers || 12}
                            onChange={(val) =>
                              onUpdateSettings({ roles: { ...settings.roles, doctor: { enabled: true, count: val } } })
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Police */}
                  <div className="p-4 bg-surface-2 border border-border flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Police</span>
                        <Badge color="police">Investigative</Badge>
                      </div>
                      <div className="text-xs text-muted mt-1">Uncovers allegiance each night</div>
                    </div>
                    {isHost && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={settings.roles.police.enabled}
                          onChange={(val) =>
                            onUpdateSettings({
                              roles: {
                                ...settings.roles,
                                police: { enabled: val, count: val ? Math.max(1, settings.roles.police.count) : 0 },
                              },
                            })
                          }
                        />
                        {settings.roles.police.enabled && (
                          <Stepper
                            value={settings.roles.police.count}
                            min={1}
                            max={settings.maxPlayers || 12}
                            onChange={(val) =>
                              onUpdateSettings({ roles: { ...settings.roles, police: { enabled: true, count: val } } })
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vigilante */}
                  <div className="p-4 bg-surface-2 border border-border flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Vigilante</span>
                        <Badge color="vigilante">Rogue</Badge>
                      </div>
                      <div className="text-xs text-muted mt-1">One-shot marksman</div>
                    </div>
                    {isHost && (
                      <Switch
                        checked={settings.roles.vigilante.enabled}
                        onChange={(val) =>
                          onUpdateSettings({
                            roles: { ...settings.roles, vigilante: { enabled: val, count: val ? 1 : 0 } },
                          })
                        }
                      />
                    )}
                  </div>

                  {/* Jester */}
                  <div className="p-4 bg-surface-2 border border-border flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Jester</span>
                        <Badge color="jester">Chaos</Badge>
                      </div>
                      <div className="text-xs text-muted mt-1">Wins if eliminated in day vote</div>
                    </div>
                    {isHost && (
                      <Switch
                        checked={settings.roles.jester.enabled}
                        onChange={(val) =>
                          onUpdateSettings({
                            roles: { ...settings.roles, jester: { enabled: val, count: val ? 1 : 0 } },
                          })
                        }
                      />
                    )}
                  </div>

                  {/* Civilian */}
                  <div className="p-4 bg-surface-2 border border-border flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Civilian</span>
                        <Badge color="civilian">Town</Badge>
                      </div>
                      <div className="text-xs text-muted mt-1">Remaining town members</div>
                    </div>
                    <span className="text-sm text-muted font-medium">Auto: {civTotal}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                {/* Rule Presets Quick Selector */}
                <div className="p-4 bg-surface-2 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted block">Match Rule Presets</span>
                    <span className="text-xs text-muted">Quick configurations for pacing, timers, and secrecy</span>
                  </div>
                  {isHost ? (
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(RULE_PRESETS).map((presetName) => (
                        <button
                          key={presetName}
                          type="button"
                          onClick={() => onUpdateSettings(RULE_PRESETS[presetName])}
                          className="px-2.5 py-1 text-xs border border-border hover:border-white bg-surface hover:bg-zinc-800 text-text transition-colors"
                        >
                          {presetName}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted font-mono border border-border px-2.5 py-1 bg-surface">
                      Host Configured
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {SETTINGS_SCHEMA.filter((s) => !s.showIf || s.showIf(settings)).map((s) => (
                    <div key={s.key} className="p-3.5 bg-surface-2 border border-border flex items-center justify-between">
                      <div className="pr-2">
                        <div className="text-xs md:text-sm font-semibold text-text">{s.label}</div>
                        <div className="text-xs text-muted">{s.tooltip}</div>
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
                            className="bg-surface border border-border text-xs md:text-sm rounded-none px-2.5 py-1.5 text-text"
                          >
                            {s.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )
                      ) : (
                        <span className="text-xs text-muted">{s.plain((settings as any)[s.key])}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comms & Activity Log Tab */}
            {activeTab === 'comms' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[420px]">
                  {/* Left Column: Official Transmission Event Logs */}
                  <div className="bg-surface-2 border border-border p-3.5 flex flex-col justify-between overflow-hidden">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Room Event Logs</span>
                      </span>
                      <span className="text-[10px] text-muted font-mono">
                        {gameView.log?.length || 0} events
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 py-2 font-mono text-xs pr-1">
                      {gameView.log && gameView.log.length > 0 ? (
                        [...gameView.log].reverse().map((entry) => (
                          <div
                            key={entry.id}
                            className={`p-2 border text-xs leading-relaxed ${
                              entry.type === 'death'
                                ? 'bg-red-950/40 border-red-800 text-red-200'
                                : entry.type === 'vote'
                                ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                                : 'bg-surface border-border text-text'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] text-muted mb-0.5">
                              <span className="uppercase">{entry.phase}</span>
                              <span>
                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                            <div>{entry.text}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted text-center pt-24 text-xs">
                          No room events recorded yet.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Public Lobby Chat */}
                  <div className="bg-surface-2 border border-border p-3.5 flex flex-col justify-between overflow-hidden">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-white" />
                        <span>Lobby Comms Wire</span>
                      </span>
                      <span className="text-[10px] text-muted font-mono">
                        All Players
                      </span>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto space-y-2 py-2 text-xs pr-1">
                      {chatList
                        .filter((m) => m.channel === 'public')
                        .map((m) => (
                          <div
                            key={m.id}
                            className={`p-2 border leading-relaxed ${
                              m.senderId === 'system'
                                ? 'bg-zinc-900 border-zinc-700 text-amber-300 font-mono'
                                : 'bg-surface border-border text-text'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] text-muted mb-0.5">
                              <span className="font-bold text-white">
                                {m.senderId === 'system' ? '[SYSTEM]' : m.senderName}
                              </span>
                              <span>
                                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div>{m.text}</div>
                          </div>
                        ))}
                      {chatList.filter((m) => m.channel === 'public').length === 0 && (
                        <div className="text-muted text-center pt-24 text-xs">
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
                      className="pt-2 border-t border-border flex gap-2"
                    >
                      <input
                        type="text"
                        value={lobbyChatInput}
                        onChange={(e) => setLobbyChatInput(e.target.value)}
                        placeholder="Type message to lobby..."
                        maxLength={300}
                        className="flex-1 bg-surface border border-border px-3 py-1.5 text-xs text-text placeholder-muted/60 focus:outline-none focus:border-white rounded-none"
                      />
                      <Button type="submit" variant="primary" size="sm" className="px-3">
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Start / Ready Action Bar at Bottom of Right Panel */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs md:text-sm text-center sm:text-left">
              {!validation.valid ? (
                <span className="text-white font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> {validation.reason}
                </span>
              ) : unreadyPlayers.length > 0 ? (
                <span className="text-amber-300 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Waiting for {unreadyPlayers.length} player{unreadyPlayers.length > 1 ? 's' : ''} to mark Ready
                </span>
              ) : (
                <span className="text-emerald-400 font-medium">✓ Ready to begin match</span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {!isHost && (
                <Button
                  variant={me?.isReady ? 'secondary' : 'primary'}
                  onClick={onToggleReady}
                  className="w-full sm:w-auto text-sm font-semibold"
                  kbd="Shift+Enter"
                >
                  {me?.isReady ? 'Cancel Ready' : 'Mark Ready'}
                </Button>
              )}

              {isHost && (
                <Button
                  variant="primary"
                  disabled={!validation.valid || unreadyPlayers.length > 0}
                  onClick={() => setStartConfirmOpen(true)}
                  className="w-full sm:w-auto font-bold text-sm"
                  kbd="Ctrl+Enter"
                >
                  <Play className="w-4 h-4 mr-1.5 fill-current" />
                  <span>Start Match</span>
                </Button>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Start Match Confirmation Modal */}
      <Modal
        isOpen={startConfirmOpen}
        onClose={() => setStartConfirmOpen(false)}
        title="Start Match Confirmation"
      >
        <div className="space-y-4">
          <p className="text-sm text-text leading-relaxed">
            Are you sure you want to begin the match now with <strong className="text-white">{players.length} players</strong>?
          </p>
          <div className="p-3 bg-surface-2 border border-border text-xs text-muted">
            All players will immediately be assigned their secret roles and Night 1 will commence.
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setStartConfirmOpen(false)} kbd="Esc">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmStart} kbd="Enter">
              Start Match
            </Button>
          </div>
        </div>
      </Modal>

      {/* Kick Player Confirmation Modal */}
      <Modal
        isOpen={Boolean(pendingKickPlayer)}
        onClose={() => setPendingKickPlayer(null)}
        title="Kick Player Confirmation"
      >
        <div className="space-y-4">
          <p className="text-sm text-text leading-relaxed">
            Are you sure you want to remove <strong className="text-white">{pendingKickPlayer?.name}</strong> from the game lobby?
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setPendingKickPlayer(null)} kbd="Esc">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmKick} kbd="Enter">
              Kick Player
            </Button>
          </div>
        </div>
      </Modal>

      {/* Ban Player Confirmation Modal */}
      <Modal
        isOpen={Boolean(pendingBanPlayer)}
        onClose={() => setPendingBanPlayer(null)}
        title="Ban Player Confirmation"
      >
        <div className="space-y-4">
          <p className="text-sm text-text leading-relaxed">
            Are you sure you want to permanently ban <strong className="text-white">{pendingBanPlayer?.name}</strong> from this room?
          </p>
          <div className="p-3 bg-red-950/40 border border-red-800 text-xs text-red-200">
            Their device token will be permanently blocked from rejoining this room, even if they change their codename.
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setPendingBanPlayer(null)} kbd="Esc">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmBan} kbd="Enter" className="bg-red-600 hover:bg-red-700 text-white">
              Ban Player
            </Button>
          </div>
        </div>
      </Modal>


      {/* QR Code Modal */}
      <Modal isOpen={showQr} onClose={() => setShowQr(false)} title="Join via QR Code">
        <div className="flex flex-col items-center justify-center p-4 space-y-4">
          <div className="p-4 bg-white rounded-none border border-border">
            <QRCodeSVG value={shareUrl} size={220} />
          </div>
          <div className="text-center space-y-1">
            <div className="font-mono text-2xl font-bold tracking-widest text-text">{gameView.code}</div>
            <div className="text-xs text-muted">Scan to join on any phone or browser</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
