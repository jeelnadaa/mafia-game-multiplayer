'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Crown, Shield, Users, Play, Copy, Check, QrCode, Sliders, Sparkles, X, UserMinus } from 'lucide-react';
import { ClientGameView, Settings, Role } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { SETTINGS_SCHEMA, ROLE_PRESETS, RULE_PRESETS } from '@/lib/settings';
import { validateSettings } from '@/lib/engine/rules';
import { Button, Card, Badge, Switch, Stepper, Avatar, Modal, Kbd } from './ui';

interface LobbyProps {
  gameView: ClientGameView;
  isHost: boolean;
  onStart: () => void;
  onToggleReady: () => void;
  onKick: (playerId: string) => void;
  onToggleGod: (isGod: boolean) => void;
  onUpdateSettings: (partial: Partial<Settings>) => void;
}

export function Lobby({
  gameView,
  isHost,
  onStart,
  onToggleReady,
  onKick,
  onToggleGod,
  onUpdateSettings,
}: LobbyProps) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'roles' | 'settings'>('roles');

  const { settings, players, me } = gameView;
  const validation = validateSettings(settings, players.length);

  const playingCount = players.filter((p) => !p.isGod).length;
  const mafiaTotal = settings.roles.mafia.count + (settings.roles.godfather.enabled ? settings.roles.godfather.count : 0);
  const docTotal = settings.roles.doctor.enabled ? settings.roles.doctor.count : 0;
  const copTotal = settings.roles.police.enabled ? settings.roles.police.count : 0;
  const vigTotal = settings.roles.vigilante.enabled ? settings.roles.vigilante.count : 0;
  const jesterTotal = settings.roles.jester.enabled ? settings.roles.jester.count : 0;
  const civTotal = Math.max(0, playingCount - (mafiaTotal + docTotal + copTotal + vigTotal + jesterTotal));

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/room/${gameView.code}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Top Banner: Share & Invite */}
      <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-muted">ROOM CODE</div>
          <div className="text-3xl md:text-4xl font-mono font-bold tracking-widest text-text">
            {gameView.code}
          </div>
          <div className="text-xs text-muted mt-1">Friends join via this code or link on any phone or laptop</div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="secondary" onClick={handleCopyLink} className="flex-1 md:flex-initial">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </Button>
          <Button variant="secondary" onClick={() => setShowQr(true)}>
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">QR</span>
          </Button>
        </div>
      </div>

      {/* Player Roster Grid */}
      <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-day-amber" />
            <h3 className="font-heading font-semibold text-text text-base">
              Players ({players.length}/{settings.maxPlayers})
            </h3>
          </div>

          {isHost && (
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer hover:text-text select-none">
              <span>I will be God (Narrator)</span>
              <Switch checked={Boolean(me?.isGod)} onChange={(val) => onToggleGod(val)} />
            </label>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {players.map((p) => (
            <div
              key={p.id}
              className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all ${
                p.id === me?.id ? 'bg-surface-2 border-border shadow-sm' : 'bg-surface-2/40 border-border/60'
              }`}
            >
              <Avatar avatarId={p.avatar} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-text truncate">{p.name}</span>
                  {p.isHost && <Crown className="w-3.5 h-3.5 text-day-amber shrink-0" />}
                  {p.isGod && <Shield className="w-3.5 h-3.5 text-god shrink-0" />}
                </div>
                <div className="text-[11px] text-muted">
                  {p.isGod ? 'Moderator' : p.ready ? 'Ready' : 'Waiting'}
                </div>
              </div>

              {isHost && p.id !== me?.id && (
                <button
                  type="button"
                  onClick={() => onKick(p.id)}
                  title="Kick player"
                  className="opacity-40 hover:opacity-100 p-1 rounded text-mafia transition-opacity"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs: Roles Panel vs Settings */}
      <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'roles' ? 'bg-surface-2 text-text border border-border' : 'text-muted hover:text-text'
              }`}
            >
              Roles Configuration
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'settings' ? 'bg-surface-2 text-text border border-border' : 'text-muted hover:text-text'
              }`}
            >
              Match Rules & Timers
            </button>
          </div>

          {activeTab === 'roles' && isHost && (
            <Button variant="secondary" size="sm" onClick={handleSuggestBalanced}>
              <Sparkles className="w-3.5 h-3.5 text-day-amber" />
              <span>Suggest Balanced</span>
            </Button>
          )}
        </div>

        {/* Roles Panel Tab */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            {/* Live Summary Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text">Composition Breakdown:</span>
                <span className="text-muted font-mono">
                  {playingCount} Players: {mafiaTotal} Mafia · {docTotal} Doctor · {copTotal} Police · {civTotal} Civilians
                </span>
              </div>
              <div className="h-2.5 w-full bg-surface-2 rounded-full overflow-hidden flex">
                <div style={{ width: `${(mafiaTotal / Math.max(1, playingCount)) * 100}%` }} className="bg-mafia h-full" />
                <div style={{ width: `${(docTotal / Math.max(1, playingCount)) * 100}%` }} className="bg-doctor h-full" />
                <div style={{ width: `${(copTotal / Math.max(1, playingCount)) * 100}%` }} className="bg-police h-full" />
                <div style={{ width: `${(vigTotal / Math.max(1, playingCount)) * 100}%` }} className="bg-vigilante h-full" />
                <div style={{ width: `${(jesterTotal / Math.max(1, playingCount)) * 100}%` }} className="bg-jester h-full" />
                <div style={{ width: `${(civTotal / Math.max(1, playingCount)) * 100}%` }} className="bg-civilian h-full" />
              </div>
            </div>

            {/* Role Presets */}
            {isHost && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted mr-1">Presets:</span>
                {Object.keys(ROLE_PRESETS).map((pname) => (
                  <button
                    key={pname}
                    type="button"
                    onClick={() => applyRolePreset(pname as any)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-surface-2 hover:bg-border border border-border text-text transition-colors"
                  >
                    {pname}
                  </button>
                ))}
              </div>
            )}

            {/* Role Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Mafia */}
              <div className="p-3.5 bg-surface-2/60 border border-border rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-mafia">Mafia</span>
                    <Badge color="mafia">SYNDICATE</Badge>
                  </div>
                  <div className="text-xs text-muted mt-0.5">Strikes in the dark each night</div>
                </div>
                {isHost && (
                  <Stepper
                    value={settings.roles.mafia.count}
                    min={1}
                    max={6}
                    onChange={(val) =>
                      onUpdateSettings({ roles: { ...settings.roles, mafia: { count: val } } })
                    }
                  />
                )}
              </div>

              {/* Doctor */}
              <div className="p-3.5 bg-surface-2/60 border border-border rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text">Doctor</span>
                    <Badge color="doctor">TOWN</Badge>
                  </div>
                  <div className="text-xs text-muted mt-0.5">Protects 1 person from harm</div>
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
                        max={3}
                        onChange={(val) =>
                          onUpdateSettings({ roles: { ...settings.roles, doctor: { enabled: true, count: val } } })
                        }
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Police */}
              <div className="p-3.5 bg-surface-2/60 border border-border rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-police">Police</span>
                    <Badge color="police">INVESTIGATIVE</Badge>
                  </div>
                  <div className="text-xs text-muted mt-0.5">Investigates allegiance each night</div>
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
                        max={3}
                        onChange={(val) =>
                          onUpdateSettings({ roles: { ...settings.roles, police: { enabled: true, count: val } } })
                        }
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Vigilante */}
              <div className="p-3.5 bg-surface-2/60 border border-border rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-vigilante">Vigilante</span>
                    <Badge color="vigilante">ROGUE</Badge>
                  </div>
                  <div className="text-xs text-muted mt-0.5">One-shot marksman</div>
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
              <div className="p-3.5 bg-surface-2/60 border border-border rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-jester">Jester</span>
                    <Badge color="jester">CHAOS</Badge>
                  </div>
                  <div className="text-xs text-muted mt-0.5">Wins if eliminated in day vote</div>
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

              {/* Civilian (Automatic) */}
              <div className="p-3.5 bg-surface-2/40 border border-border/60 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-civilian">Civilians</span>
                    <Badge color="civilian">TOWN</Badge>
                  </div>
                  <div className="text-xs text-muted mt-0.5">All remainder players</div>
                </div>
                <span className="text-xs font-mono font-semibold text-muted">Auto: {civTotal}</span>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SETTINGS_SCHEMA.filter((s) => !s.showIf || s.showIf(settings)).map((s) => (
                <div key={s.key} className="p-3 bg-surface-2/60 border border-border rounded-xl flex items-center justify-between">
                  <div className="pr-2">
                    <div className="text-xs font-semibold text-text">{s.label}</div>
                    <div className="text-[11px] text-muted">{s.tooltip}</div>
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
                        className="bg-surface border border-border text-xs rounded-lg px-2 py-1 text-text"
                      >
                        {s.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )
                  ) : (
                    <span className="text-xs font-mono text-muted">{s.plain((settings as any)[s.key])}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Start / Ready Action Bar */}
      <div className="p-4 bg-surface border border-border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="text-xs text-center sm:text-left">
          {!validation.valid ? (
            <span className="text-mafia font-medium">⚠️ {validation.reason}</span>
          ) : (
            <span className="text-emerald-400 font-medium">✓ Ready to initiate game</span>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isHost && (
            <Button
              variant={me?.isReady ? 'secondary' : 'accent'}
              onClick={onToggleReady}
              className="w-full sm:w-auto"
              kbd="Shift+Enter"
            >
              {me?.isReady ? 'Cancel Ready' : 'Mark Ready'}
            </Button>
          )}

          {isHost && (
            <Button
              variant="accent"
              disabled={!validation.valid}
              onClick={onStart}
              className="w-full sm:w-auto"
              kbd="Ctrl+Enter"
            >
              <Play className="w-4 h-4 mr-1 fill-current" />
              <span>Start Match</span>
            </Button>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      <Modal isOpen={showQr} onClose={() => setShowQr(false)} title="Join via QR Code">
        <div className="flex flex-col items-center justify-center p-4 space-y-4">
          <div className="p-4 bg-white rounded-2xl">
            {typeof window !== 'undefined' && (
              <QRCodeSVG value={`${window.location.origin}/room/${gameView.code}`} size={200} />
            )}
          </div>
          <div className="text-center">
            <div className="font-mono text-xl font-bold tracking-widest text-text">{gameView.code}</div>
            <div className="text-xs text-muted mt-1">Scan with any phone camera to join immediately</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
