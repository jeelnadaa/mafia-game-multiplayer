'use client';

import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Crown,
  Shield,
  Users,
  Play,
  Copy,
  Check,
  QrCode,
  UserMinus,
  AlertTriangle,
  MessageSquare,
  Send,
  Activity,
  Lock,
  Unlock,
  Ban,
  Bot,
  Mic,
  MicOff,
  PhoneOff,
  Share2,
  Sliders,
  X,
  Radio,
} from 'lucide-react';
import { ClientGameView, Settings, PlayerView } from '@/lib/types';
import {
  SETTINGS_SCHEMA,
  ROLE_PRESETS,
  RULE_PRESETS,
  PLAYER_COLORS,
  getCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  getLastPresetName,
  setLastPresetName,
  getCustomRulePresets,
  saveCustomRulePreset,
  deleteCustomRulePreset,
  getLastRulePresetName,
  setLastRulePresetName,
  saveLastSettings,
  CustomRolePreset,
  CustomRulePreset,
} from '@/lib/settings';
import { validateSettings } from '@/lib/engine/rules';
import { Button, Switch, Stepper, Avatar, Modal, Kbd } from './ui';
import { getRoomShareUrl } from '@/lib/net';
import { useShortcut } from '@/lib/shortcuts';
import { getSeatPositions } from '@/lib/layout';

interface LobbyProps {
  gameView: ClientGameView;
  isHost: boolean;
  onStart: () => void;
  onToggleReady: () => void;
  onKick: (playerId: string) => void;
  onBan?: (playerId: string) => void;
  onToggleLockRoom?: () => void;
  onToggleGod: (targetPlayerIdOrIsGod: any, isGod?: boolean) => void;
  onUpdateSettings: (partial: Partial<Settings>) => void;
  onUpdateProfile?: (profile: { name?: string; avatar: number; color?: string }) => void;
  onOpenHelp?: () => void;
  onSendChat?: (channel: 'public', text: string) => void;
  onAddBots?: () => void;
  onClearBots?: () => void;
  onBack?: () => void;
  isVoiceActive?: boolean;
  isVoiceMuted?: boolean;
  onToggleVoice?: () => void;
  onToggleVoiceMute?: () => void;
  speakingPeers?: Record<string, boolean>;
  defaultSetupTab?: 'roles' | 'settings' | 'comms' | 'tools';
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
  onOpenHelp,
  onSendChat,
  onAddBots,
  onClearBots,
  onBack,
  isVoiceActive = false,
  isVoiceMuted = false,
  onToggleVoice,
  onToggleVoiceMute,
  speakingPeers = {},
  defaultSetupTab = 'roles',
}: LobbyProps) {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [setupDrawerOpen, setSetupDrawerOpen] = useState(false);
  const [caseDocketOpen, setCaseDocketOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [aliasInput, setAliasInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'roles' | 'settings' | 'comms' | 'tools'>(defaultSetupTab);
  const [lobbyChatInput, setLobbyChatInput] = useState('');

  // Confirmation Modals State
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const [pendingKickPlayer, setPendingKickPlayer] = useState<PlayerView | null>(null);
  const [pendingBanPlayer, setPendingBanPlayer] = useState<PlayerView | null>(null);

  // Custom Presets State
  const [customPresets, setCustomPresets] = useState<CustomRolePreset[]>(() => getCustomPresets());
  const [savePresetModalOpen, setSavePresetModalOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [presetError, setPresetError] = useState('');

  // Custom Rule Presets State
  const [customRulePresets, setCustomRulePresets] = useState<CustomRulePreset[]>(() => getCustomRulePresets());
  const [saveRulePresetModalOpen, setSaveRulePresetModalOpen] = useState(false);
  const [rulePresetNameInput, setRulePresetNameInput] = useState('');
  const [rulePresetError, setRulePresetError] = useState('');

  const { settings, players, me } = gameView;
  const chatList = gameView.chat || [];
  const logList = gameView.log || [];
  const validation = validateSettings(settings, players.length);
  const unreadyPlayers = players.filter((p) => !p.isHost && !p.ready);
  const readyCount = players.filter((p) => p.isHost || p.ready).length;

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
  const mafiaTotal = settings.roles.mafia.count + (settings.roles.godfather?.enabled ? (settings.roles.godfather.count || 1) : 0);
  const docTotal = settings.roles.doctor.enabled ? settings.roles.doctor.count : 0;
  const copTotal = settings.roles.police.enabled ? settings.roles.police.count : 0;
  const vigTotal = settings.roles.vigilante?.enabled ? (settings.roles.vigilante.count || 1) : 0;
  const jesterTotal = settings.roles.jester?.enabled ? (settings.roles.jester.count || 1) : 0;
  const specialTotal = mafiaTotal + docTotal + copTotal + vigTotal + jesterTotal;
  const minPlayersNeeded = Math.max(4, specialTotal, 2 * mafiaTotal + 1);
  const displayTotal = Math.max(playingCount, minPlayersNeeded);
  const civTotal = Math.max(0, displayTotal - specialTotal);

  const maxRoomCapacity = settings.maxPlayers || 12;
  const godfatherCount = settings.roles.godfather?.enabled ? (settings.roles.godfather.count || 1) : 0;
  const vigCount = settings.roles.vigilante?.enabled ? (settings.roles.vigilante.count || 1) : 0;
  const jesterCount = settings.roles.jester?.enabled ? (settings.roles.jester.count || 1) : 0;

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

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join Mafia Game #${gameView.code}`,
          text: `Join our secret investigation table in Room #${gameView.code}`,
          url: shareUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
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
    setLastPresetName(String(presetName));
  };

  const applyCustomPreset = (preset: CustomRolePreset) => {
    const updatePayload: Partial<Settings> = {
      roles: {
        mafia: { count: preset.roles.mafia },
        godfather: { enabled: preset.roles.godfather > 0, count: preset.roles.godfather },
        doctor: { enabled: preset.roles.doctor > 0, count: preset.roles.doctor },
        police: { enabled: preset.roles.police > 0, count: preset.roles.police },
        vigilante: { enabled: preset.roles.vigilante > 0, count: preset.roles.vigilante },
        jester: { enabled: preset.roles.jester > 0, count: preset.roles.jester },
      },
      ...(preset.rules || {}),
    };
    onUpdateSettings(updatePayload);
    saveLastSettings({ ...settings, ...updatePayload });
    setLastPresetName(preset.name);
  };

  const handleSaveCustomPreset = () => {
    const trimmed = presetNameInput.trim();
    if (!trimmed) {
      setPresetError('Please provide a codename for this custom setup.');
      return;
    }
    const currentRules: Partial<Settings> = {
      nightDuration: settings.nightDuration,
      discussionDuration: settings.discussionDuration,
      votingDuration: settings.votingDuration,
      endNightEarly: settings.endNightEarly,
      mafiaKillMode: settings.mafiaKillMode,
      mafiaDisagreeFallback: settings.mafiaDisagreeFallback,
      noKillFirstNight: settings.noKillFirstNight,
      mafiaNightChat: settings.mafiaNightChat,
      doctorSelfSave: settings.doctorSelfSave,
      doctorSameTargetTwice: settings.doctorSameTargetTwice,
      announceSave: settings.announceSave,
      policeResultDelay: settings.policeResultDelay,
      policeResultDetail: settings.policeResultDetail,
      vigilanteShots: settings.vigilanteShots,
      voteVisibility: settings.voteVisibility,
      allowSkipVote: settings.allowSkipVote,
      tieRule: settings.tieRule,
      revealRoleOnDeath: settings.revealRoleOnDeath,
      revealRoleList: settings.revealRoleList,
      deadChat: settings.deadChat,
      deadSeeRoles: settings.deadSeeRoles,
      dayChat: settings.dayChat,
      circleSitting: settings.circleSitting,
      maxPlayers: settings.maxPlayers,
    };
    const newPreset: CustomRolePreset = {
      name: trimmed,
      roles: {
        mafia: settings.roles.mafia.count,
        godfather: settings.roles.godfather?.enabled ? (settings.roles.godfather.count || 1) : 0,
        doctor: settings.roles.doctor.enabled ? settings.roles.doctor.count : 0,
        police: settings.roles.police.enabled ? settings.roles.police.count : 0,
        vigilante: settings.roles.vigilante?.enabled ? (settings.roles.vigilante.count || 1) : 0,
        jester: settings.roles.jester?.enabled ? (settings.roles.jester.count || 1) : 0,
      },
      rules: currentRules,
    };
    const updated = saveCustomPreset(newPreset);
    saveLastSettings(settings);
    setCustomPresets(updated);
    setSavePresetModalOpen(false);
    setPresetNameInput('');
    setPresetError('');
  };

  const applyRulePreset = (presetName: string, rules: Partial<Settings>) => {
    onUpdateSettings(rules);
    saveLastSettings({ ...settings, ...rules });
    setLastRulePresetName(presetName);
  };

  const handleSaveCustomRulePreset = () => {
    const trimmed = rulePresetNameInput.trim();
    if (!trimmed) {
      setRulePresetError('Please provide a name for this rule preset.');
      return;
    }
    const currentRules: Partial<Settings> = {
      nightDuration: settings.nightDuration,
      discussionDuration: settings.discussionDuration,
      votingDuration: settings.votingDuration,
      endNightEarly: settings.endNightEarly,
      mafiaKillMode: settings.mafiaKillMode,
      mafiaDisagreeFallback: settings.mafiaDisagreeFallback,
      noKillFirstNight: settings.noKillFirstNight,
      mafiaNightChat: settings.mafiaNightChat,
      doctorSelfSave: settings.doctorSelfSave,
      doctorSameTargetTwice: settings.doctorSameTargetTwice,
      announceSave: settings.announceSave,
      policeResultDelay: settings.policeResultDelay,
      policeResultDetail: settings.policeResultDetail,
      vigilanteShots: settings.vigilanteShots,
      voteVisibility: settings.voteVisibility,
      allowSkipVote: settings.allowSkipVote,
      tieRule: settings.tieRule,
      revealRoleOnDeath: settings.revealRoleOnDeath,
      revealRoleList: settings.revealRoleList,
      deadChat: settings.deadChat,
      deadSeeRoles: settings.deadSeeRoles,
      dayChat: settings.dayChat,
      circleSitting: settings.circleSitting,
      maxPlayers: settings.maxPlayers,
    };
    const newRulePreset: CustomRulePreset = {
      name: trimmed,
      rules: currentRules,
    };
    const updated = saveCustomRulePreset(newRulePreset);
    saveLastSettings(settings);
    setCustomRulePresets(updated);
    setSaveRulePresetModalOpen(false);
    setRulePresetNameInput('');
    setRulePresetError('');
  };

  const handleDeleteCustomRulePreset = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteCustomRulePreset(name);
    setCustomRulePresets(updated);
  };

  const handleDeleteCustomPreset = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteCustomPreset(name);
    setCustomPresets(updated);
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

  // Determine active preset name or "CUSTOM"
  const currentPresetName = useMemo(() => {
    // 1. Check custom presets first
    for (const p of customPresets) {
      if (
        p.roles.mafia === settings.roles.mafia.count &&
        (p.roles.godfather > 0) === Boolean(settings.roles.godfather?.enabled) &&
        (p.roles.doctor > 0) === Boolean(settings.roles.doctor.enabled) &&
        (p.roles.police > 0) === Boolean(settings.roles.police.enabled) &&
        (p.roles.vigilante > 0) === Boolean(settings.roles.vigilante?.enabled) &&
        (p.roles.jester > 0) === Boolean(settings.roles.jester?.enabled)
      ) {
        return p.name.toUpperCase();
      }
    }
    // 2. Check built-in presets
    for (const [key, p] of Object.entries(ROLE_PRESETS as Record<string, any>)) {
      if (
        p.mafia === settings.roles.mafia.count &&
        (p.godfather > 0) === Boolean(settings.roles.godfather?.enabled) &&
        (p.doctor > 0) === Boolean(settings.roles.doctor.enabled) &&
        (p.police > 0) === Boolean(settings.roles.police.enabled) &&
        (p.vigilante > 0) === Boolean(settings.roles.vigilante?.enabled) &&
        (p.jester > 0) === Boolean(settings.roles.jester?.enabled)
      ) {
        return key.toUpperCase();
      }
    }
    return 'CUSTOM';
  }, [settings.roles, customPresets]);

  // Seating: strictly based on joined players, anchor local player at bottom (6 o'clock)
  const myIndex = Math.max(0, players.findIndex((p) => p.id === me?.id));
  const totalSeats = Math.max(1, players.length);
  const seats = useMemo(() => {
    return getSeatPositions(totalSeats, 100, 100, myIndex, 10);
  }, [totalSeats, myIndex]);

  return (
    <div className="b relative w-full min-h-screen lg:h-[760px] max-w-[1440px] mx-auto overflow-hidden bg-[#0A0B0E] text-[#ECE6D8] select-none flex flex-col justify-between">
      <span className="sr-only">Circle Sitting Mode</span>
      {/* Overhead Brass Lamp Ambient Cone */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 w-[640px] h-[700px] z-0"
        style={{
          background: 'radial-gradient(ellipse 60% 70% at 50% 0%, rgba(217,164,65,.24), transparent 70%)',
        }}
      />
      {/* Hanging Cord & Shade */}
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 z-10 flex flex-col items-center">
        <div className="w-[2px] h-[72px] sm:h-[96px] bg-[#2a2d35]" />
        <div
          className="w-[80px] h-[36px] bg-[#D9A441]"
          style={{ clipPath: 'polygon(22% 0, 78% 0, 100% 100%, 0 100%)' }}
        />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-20 flex items-center justify-between px-5 sm:px-10 pt-6 pb-2">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onBack ? onBack() : window.history.length > 1 ? window.history.back() : window.location.href = '/'}
            className="hb flex items-center justify-center hover:border-bone-dim transition-colors"
            aria-label="Back to landing"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setCaseDocketOpen(true)}
            className="hb flex items-center justify-center hover:border-bone-dim transition-colors"
            aria-label="Open Case Docket"
            title="Open Case Docket (≡)"
          >
            ≡
          </button>
        </div>

        <h1 className="d text-2xl sm:text-4xl font-extrabold tracking-[6px] text-[#A39D90] uppercase text-center m-0">
          THE BACK ROOM
        </h1>

        <div className="flex items-center gap-2">
          {onOpenHelp && (
            <button
              type="button"
              onClick={onOpenHelp}
              className="hb flex items-center justify-center hover:border-bone transition-colors text-lg font-bold"
              title="Classified Dossier & Rulebook (?)"
              aria-label="Open Rulebook"
            >
              ?
            </button>
          )}
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="ob hover:border-lamp hover:text-lamp transition-colors flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            <span>Invite friends</span>
          </button>
        </div>
      </header>

      {/* Main Stage Grid: Left column for cards + Center stage for table */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 px-5 sm:px-10 py-4 items-center">
        {/* Left Column: Room Code & Deck Cards (5 cols on desktop) */}
        <div className="lg:col-span-4 flex flex-col gap-4 max-w-[360px] w-full mx-auto lg:mx-0">
          {/* Card 1: Room Code */}
          <section
            aria-label="Room code"
            className="p-5 border border-[#262A33] bg-[#101216] rounded-[6px] shadow-lg flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="t text-[13px] tracking-[3px] text-[#A39D90] uppercase">
                ROOM CODE
              </span>
              {onToggleLockRoom && isHost && (
                <button
                  type="button"
                  onClick={onToggleLockRoom}
                  className={`text-xs font-mono flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] border transition-all ${
                    gameView.isLocked
                      ? 'border-[#B3363B] text-[#B3363B] bg-[#B3363B]/10 hover:bg-[#B3363B]/20'
                      : 'border-[#262A33] text-[#A39D90] hover:text-[#D9A441] hover:border-[#D9A441]/40'
                  }`}
                  title={gameView.isLocked ? 'Room is locked (click to unlock)' : 'Room is open (click to lock)'}
                >
                  {gameView.isLocked ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-[#B3363B]" />
                      <span className="font-bold">LOCKED</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>LOCK</span>
                    </>
                  )}
                </button>
              )}
              {gameView.isLocked && !isHost && (
                <span className="text-xs font-mono text-[#B3363B] border border-[#B3363B]/50 px-2 py-0.5 rounded-[3px] flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>LOCKED</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyRoomCode}
              title="Click to copy room code"
              className="font-mono text-5xl sm:text-6xl font-bold tracking-[8px] text-[#D9A441] hover:text-[#FFEA00] active:scale-95 transition-all leading-none my-1 flex items-center justify-between group cursor-pointer text-left w-full select-none"
            >
              <span>{gameView.code}</span>
              <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-1 rounded bg-[#171A20] border border-[#262A33] text-[#A39D90] group-hover:text-[#D9A441] group-hover:border-[#D9A441] transition-all">
                {copiedCode ? 'COPIED ✓' : 'COPY'}
              </span>
            </button>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="ob flex-1 h-[40px] px-3.5 text-xs hover:border-bone transition-colors"
              >
                {copiedLink ? 'Copied ✓' : 'Copy link'}
              </button>
              <button
                type="button"
                onClick={() => setInviteModalOpen(true)}
                className="ob h-[40px] px-3.5 text-xs hover:border-bone transition-colors"
              >
                QR
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="ob h-[40px] px-3.5 text-xs hover:border-bone transition-colors"
              >
                Share
              </button>
            </div>
          </section>

          {/* Card 2: The Deck */}
          <section
            aria-label="The deck"
            className="p-5 border border-[#262A33] bg-[#101216] rounded-[6px] shadow-lg flex flex-col gap-2"
          >
            <div className="t text-[13px] tracking-[3px] text-[#A39D90] uppercase">
              THE DECK
            </div>
            <div className="d text-4xl sm:text-5xl font-extrabold tracking-wide text-[#ECE6D8] leading-tight">
              {currentPresetName}
            </div>
            <div className="text-[15px] text-[#ECE6D8] leading-relaxed">
              {mafiaTotal} Mafia · {docTotal} Doctor · {copTotal} Police
              <br />
              {civTotal} Civilians
            </div>
            <div className="text-[13px] text-[#A39D90] mt-1 mb-2">
              {settings.nightDuration}s nights · open votes
            </div>
            <button
              type="button"
              onClick={() => setSetupDrawerOpen(true)}
              className="ob w-full h-[44px] hover:border-lamp hover:text-lamp transition-colors"
            >
              Game setup
            </button>
          </section>

          {/* Player Alias & Avatar Trigger (Custom Modal) */}
          <div className="p-3.5 border border-[#262A33] bg-[#101216] rounded-[6px] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 relative overflow-hidden"
                style={{
                  borderColor:
                    me?.color ||
                    PLAYER_COLORS[((me?.avatar || 1) - 1) % PLAYER_COLORS.length] ||
                    '#D9A441',
                }}
              >
                <Avatar avatarId={me?.avatar || 1} size={36} className="border-0" />
              </div>
              <div className="truncate">
                <div className="text-sm font-semibold text-[#ECE6D8] truncate">{me?.name || 'You'}</div>
                <div className="text-[10px] font-mono text-[#A39D90]">Operative Alias</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAliasInput(me?.name || '');
                setAvatarModalOpen(true);
              }}
              className="ob h-9 px-3 text-xs flex items-center gap-1.5 hover:border-[#D9A441] hover:text-[#D9A441] transition-colors"
            >
              <span>Your avatar</span>
              <span className="text-[10px] text-[#A39D90]">✎</span>
            </button>
          </div>
        </div>

        {/* Center / Right Stage: Felt Table with Seated Operatives (8 cols on desktop) */}
        <div className="lg:col-span-8 relative w-full h-[380px] sm:h-[460px] flex items-center justify-center">
          {/* Billiard Felt Round Table */}
          <div
            className="absolute inset-x-4 sm:inset-x-12 inset-y-8 rounded-[50%] border-[6px] border-[#6b5426] shadow-2xl"
            style={{
              background: 'radial-gradient(ellipse at 50% 25%, #1d2c26, #0b1210 72%)',
            }}
          />

          {/* Seated Pawn Figures around table perimeter (strictly joined players) */}
          {players.map((player, idx) => {
            const seat = seats[idx] || { leftPercent: 50, topPercent: 80 };
            const isSpeaking = speakingPeers[player.id];
            const isReady = player.isHost || player.ready;
            const isLocal = player.id === me?.id;
            const playerColor =
              player.color ||
              PLAYER_COLORS[((player.avatar || 1) - 1) % PLAYER_COLORS.length] ||
              '#B3363B';

            return (
              <div
                key={player.id}
                className="fg z-10 transition-transform duration-300 group"
                style={{
                  left: `${seat.leftPercent}%`,
                  top: `${seat.topPercent}%`,
                  ['--c' as any]: playerColor,
                }}
              >
                {/* Ready Dot Lamp above pawn head */}
                <div
                  className="absolute left-[41px] -top-[16px] w-[8px] h-[8px] rounded-full transition-all"
                  style={{
                    background: isReady ? '#D9A441' : 'transparent',
                    boxShadow: isReady ? '0 0 10px #D9A441' : 'none',
                    border: isReady ? 'none' : '1px solid #8e8878',
                  }}
                  title={isReady ? 'Ready' : 'Waiting'}
                />

                {/* Pawn Head */}
                <div
                  className={`hd relative transition-all duration-150 ${
                    isSpeaking ? 'ring-2 ring-[#2ED573] shadow-[0_0_16px_#2ED573,0_0_28px_rgba(46,213,115,0.7)]' : ''
                  }`}
                >
                  {isSpeaking && (
                    <div
                      className="absolute -inset-1.5 rounded-full pointer-events-none z-30 transition-all duration-150 animate-pulse"
                      style={{
                        border: '2px solid #2ED573',
                        boxShadow: '0 0 16px #2ED573, 0 0 30px rgba(46, 213, 115, 0.7), inset 0 0 8px rgba(46, 213, 115, 0.4)',
                      }}
                    />
                  )}
                </div>

                {/* Pawn Body */}
                <div className="bd" />

                {/* Seated Nameplate */}
                <span className="nm flex items-center justify-center gap-1 border border-transparent group-hover:border-[#262A33]">
                  <span className="max-w-[70px] truncate">{player.name}</span>
                  {isLocal && <span className="text-[10px] text-[#A39D90]">(You)</span>}
                  {player.isHost && (
                    <i style={{ color: '#D9A441', fontStyle: 'normal', fontSize: '11px', marginLeft: 2 }}>
                      HOST
                    </i>
                  )}
                  {player.isGod && (
                    <i style={{ color: '#D9A441', fontStyle: 'normal', fontSize: '10px', fontWeight: 'bold', marginLeft: 2 }}>
                      NARRATOR
                    </i>
                  )}
                  {(player.isBot || player.id.startsWith('bot_')) && (
                    <i style={{ color: '#D9A441', fontStyle: 'normal', fontSize: '9px', marginLeft: 2 }}>
                      BOT
                    </i>
                  )}
                </span>

                {/* Host Controls on Hover: Narrator designation + Kick/Ban */}
                {isHost && (
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[#0A0B0E]/95 px-2 py-0.5 rounded border border-[#262A33] z-20 shadow-xl">
                    <button
                      type="button"
                      onClick={() => onToggleGod(player.id, !player.isGod)}
                      title={player.isGod ? `Remove Narrator status from ${player.name}` : `Designate ${player.name} as Narrator`}
                      className={`p-1 transition-colors ${
                        player.isGod ? 'text-[#D9A441] font-bold' : 'text-[#A39D90] hover:text-[#D9A441]'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                    </button>
                    {!isLocal && (
                      <>
                        <button
                          type="button"
                          onClick={() => setPendingKickPlayer(player)}
                          title={`Kick ${player.name}`}
                          className="text-[#A39D90] hover:text-[#ECE6D8] p-1"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                        {onBan && (
                          <button
                            type="button"
                            onClick={() => setPendingBanPlayer(player)}
                            title={`Ban ${player.name}`}
                            className="text-blood/70 hover:text-blood p-1"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Bottom Status & Primary Action Bar */}
      <footer className="relative z-20 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 px-5 sm:px-10 py-5 border-t border-[#262A33]/40 bg-[#0A0B0E]/80 backdrop-blur-sm">
        <span className="text-[17px] text-[#A39D90] text-center font-sans">
          {!validation.valid ? (
            <span className="text-[#D9A441]">{validation.reason}</span>
          ) : unreadyPlayers.length > 0 ? (
            `Need ${minPlayersNeeded} players, ${readyCount} ready.`
          ) : (
            `All ${players.length} operatives seated & ready.`
          )}
        </span>

        {isHost ? (
          <button
            type="button"
            disabled={!validation.valid || unreadyPlayers.length > 0}
            onClick={() => setStartConfirmOpen(true)}
            className="h-[54px] px-10 rounded-[4px] text-[17px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              background: validation.valid && unreadyPlayers.length === 0 ? '#D9A441' : '#1a1d24',
              color: validation.valid && unreadyPlayers.length === 0 ? '#0A0B0E' : '#8e8878',
              border: validation.valid && unreadyPlayers.length === 0 ? 'none' : '1px solid #262A33',
            }}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start game</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleReady}
            className="h-[54px] px-10 rounded-[4px] text-[17px] font-semibold transition-all flex items-center gap-2 shadow-lg"
            style={{
              background: me?.isReady ? '#1a1d24' : '#D9A441',
              color: me?.isReady ? '#ECE6D8' : '#0A0B0E',
              border: me?.isReady ? '1px solid #6b6455' : 'none',
            }}
          >
            <Check className="w-4 h-4" />
            <span>{me?.isReady ? 'Cancel ready' : 'Ready up'}</span>
          </button>
        )}
      </footer>

      {/* Game Setup Full-Screen Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md ${
          setupDrawerOpen ? 'flex' : 'hidden'
        }`}
        aria-hidden={!setupDrawerOpen}
      >
        <div className="w-full max-w-5xl h-[92vh] max-h-[92vh] bg-[#101216] border border-[#262A33] rounded-[8px] shadow-2xl flex flex-col justify-between p-6 sm:p-8 overflow-hidden animate-in zoom-in-95 duration-200 font-['Instrument_Sans']">
          <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar pr-1">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#262A33]">
                <div className="flex items-center gap-3">
                  <Sliders className="w-5 h-5 text-[#D9A441]" />
                  <h2 className="d text-3xl font-extrabold tracking-wider text-[#ECE6D8] m-0">
                    GAME SETUP
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSetupDrawerOpen(false)}
                  className="hb flex items-center justify-center text-xl hover:border-bone transition-colors"
                  aria-label="Close setup drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs Navigation */}
              <div className="flex flex-wrap gap-2 border-b border-[#262A33] pb-3 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('roles')}
                  className={`d text-base tracking-[2px] font-bold uppercase px-4 py-2 rounded-[3px] border transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'roles'
                      ? 'bg-[#D9A441] text-[#0A0B0E] border-[#D9A441] shadow-[0_0_15px_rgba(217,164,65,0.3)]'
                      : 'bg-[#101216] text-[#A39D90] border-[#262A33] hover:text-[#ECE6D8] hover:border-[#D9A441]/50'
                  }`}
                >
                  Roles Deck
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`d text-base tracking-[2px] font-bold uppercase px-4 py-2 rounded-[3px] border transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-[#D9A441] text-[#0A0B0E] border-[#D9A441] shadow-[0_0_15px_rgba(217,164,65,0.3)]'
                      : 'bg-[#101216] text-[#A39D90] border-[#262A33] hover:text-[#ECE6D8] hover:border-[#D9A441]/50'
                  }`}
                >
                  Rules & Timers
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('comms')}
                  className={`d text-base tracking-[2px] font-bold uppercase px-4 py-2 rounded-[3px] border transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'comms'
                      ? 'bg-[#D9A441] text-[#0A0B0E] border-[#D9A441] shadow-[0_0_15px_rgba(217,164,65,0.3)]'
                      : 'bg-[#101216] text-[#A39D90] border-[#262A33] hover:text-[#ECE6D8] hover:border-[#D9A441]/50'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Comms Wire</span>
                  {chatList.filter((m) => m.channel === 'public').length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-[#0A0B0E] text-[#D9A441] text-[10px] rounded font-mono font-bold">
                      {chatList.filter((m) => m.channel === 'public').length}
                    </span>
                  )}
                </button>
                {isHost && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('tools')}
                    className={`d text-base tracking-[2px] font-bold uppercase px-4 py-2 rounded-[3px] border transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'tools'
                        ? 'bg-[#D9A441] text-[#0A0B0E] border-[#D9A441] shadow-[0_0_15px_rgba(217,164,65,0.3)]'
                        : 'bg-[#101216] text-[#A39D90] border-[#262A33] hover:text-[#ECE6D8] hover:border-[#D9A441]/50'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Host Tools</span>
                  </button>
                )}
              </div>

              {/* Tab 1: Roles Deck */}
              {activeTab === 'roles' && (
                <div className="space-y-5">
                  {/* Composition Bar */}
                  <div className="space-y-2 p-3 bg-[#101216] border border-[#262A33] rounded-[4px]">
                    <div className="flex items-center justify-between">
                      <span className="t text-xs tracking-widest uppercase text-[#D9A441] font-bold">
                        Composition breakdown:
                      </span>
                      <span className="t text-xs tracking-wider text-[#ECE6D8]">
                        {mafiaTotal} Mafia · {docTotal} Doc · {copTotal} Cop · {civTotal} Civ
                      </span>
                    </div>
                    <div className="h-3 w-full bg-[#0A0B0E] border border-[#262A33] rounded-[2px] overflow-hidden flex shadow-inner">
                      <div style={{ width: `${(mafiaTotal / displayTotal) * 100}%` }} className="bg-[#B3363B] h-full transition-all" title={`${mafiaTotal} Mafia`} />
                      <div style={{ width: `${(docTotal / displayTotal) * 100}%` }} className="bg-[#5E8C7B] h-full transition-all" title={`${docTotal} Doctor`} />
                      <div style={{ width: `${(copTotal / displayTotal) * 100}%` }} className="bg-[#5B7A99] h-full transition-all" title={`${copTotal} Police`} />
                      <div style={{ width: `${(vigTotal / displayTotal) * 100}%` }} className="bg-[#D9A441] h-full transition-all" title={`${vigTotal} Vigilante`} />
                      <div style={{ width: `${(jesterTotal / displayTotal) * 100}%` }} className="bg-[#8C6FA0] h-full transition-all" title={`${jesterTotal} Jester`} />
                      <div style={{ width: `${(civTotal / displayTotal) * 100}%` }} className="bg-[#4E4A44] h-full transition-all" title={`${civTotal} Civilians`} />
                    </div>
                  </div>

                  {/* Presets Row */}
                  {isHost && (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="t text-sm tracking-widest text-[#A39D90] uppercase font-bold mr-1">
                        Presets:
                      </span>
                      {Object.keys(ROLE_PRESETS).map((pname) => {
                        const isActive = currentPresetName.toLowerCase() === pname.toLowerCase();
                        return (
                          <button
                            key={pname}
                            type="button"
                            onClick={() => applyRolePreset(pname as any)}
                            className={`t text-sm uppercase tracking-wider px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-[4px] border transition-all cursor-pointer font-bold ${
                              isActive
                                ? 'bg-[#D9A441] text-[#0A0B0E] border-[#D9A441] shadow-[0_0_14px_rgba(217,164,65,0.45)]'
                                : 'bg-[#171A20] text-[#ECE6D8] border-[#262A33] hover:border-[#D9A441]/60 hover:text-[#D9A441]'
                            }`}
                          >
                            {pname}
                          </button>
                        );
                      })}

                      {/* Custom Saved Presets */}
                      {customPresets.map((cp) => {
                        const isActive = currentPresetName.toLowerCase() === cp.name.toLowerCase();
                        return (
                          <div
                            key={cp.name}
                            className={`inline-flex items-center rounded-[4px] border transition-all ${
                              isActive
                                ? 'bg-[#D9A441] text-[#0A0B0E] border-[#D9A441] font-bold shadow-[0_0_14px_rgba(217,164,65,0.45)]'
                                : 'bg-[#171A20] text-[#ECE6D8] border-[#262A33] hover:border-[#D9A441]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => applyCustomPreset(cp)}
                              className="px-4 py-2 sm:px-4.5 sm:py-2.5 uppercase t text-sm tracking-wider font-bold cursor-pointer"
                            >
                              {cp.name}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCustomPreset(cp.name, e)}
                              title={`Delete ${cp.name} preset`}
                              className="px-2.5 py-2 hover:text-[#B3363B] text-sm font-bold border-l border-[#262A33]/50 cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}

                      {/* Save Setup Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setPresetNameInput(currentPresetName === 'CUSTOM' ? '' : currentPresetName);
                          setPresetError('');
                          setSavePresetModalOpen(true);
                        }}
                        className="t text-sm uppercase tracking-wider px-4.5 py-2 sm:py-2.5 rounded-[4px] text-[#D9A441] border-2 border-[#D9A441] hover:bg-[#D9A441] hover:text-[#0A0B0E] font-bold transition-all cursor-pointer shadow-sm"
                      >
                        + Save Setup
                      </button>

                      <button
                        type="button"
                        onClick={handleSuggestBalanced}
                        className="t text-sm uppercase tracking-wider px-5 py-2 sm:py-2.5 rounded-[4px] text-[#D9A441] border-2 border-[#262A33] hover:border-[#D9A441] hover:bg-[#D9A441]/10 font-bold transition-all cursor-pointer ml-auto shadow-sm"
                      >
                        Suggest Balanced
                      </button>
                    </div>
                  )}

                  {/* Grouped Role Cards by Family */}
                  <div className="space-y-6">
                    {/* Family 1: Syndicate Family (Crimson Noir) */}
                    <div className="p-4 rounded-[6px] border border-[#B3363B]/40 bg-[#160A0C]/50 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between pb-2 border-b border-[#B3363B]/20">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#B3363B] shadow-[0_0_8px_#B3363B]" />
                          <span className="d text-xl font-black uppercase tracking-wider text-[#FF8585]">
                            Syndicate Family
                          </span>
                          <span className="t text-[10px] tracking-wider uppercase px-2 py-0.5 bg-[#B3363B]/20 text-[#fca5a5] border border-[#B3363B]/50 font-bold rounded-[2px]">
                            {mafiaTotal} Assigned
                          </span>
                        </div>
                        <span className="text-[11px] font-['Instrument_Sans'] text-[#A39D90] hidden sm:inline">
                          Criminal underworld striking in secret
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Mafia */}
                        <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[4px] hover:border-[#B3363B]/60 transition-all flex items-center justify-between shadow-md">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <span className="d text-2xl font-black uppercase tracking-wide text-[#ECE6D8]">Mafia</span>
                              <span className="t text-[10px] tracking-wider uppercase px-2 py-0.5 bg-[#B3363B]/20 text-[#fca5a5] border border-[#B3363B]/50 font-bold rounded-[2px]">
                                Enforcer
                              </span>
                            </div>
                            <div className="text-xs font-['Instrument_Sans'] text-[#A39D90] mt-1">Strikes secretly each night</div>
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

                        {/* Godfather */}
                        <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[4px] hover:border-[#B3363B]/60 transition-all flex items-center justify-between shadow-md">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <span className="d text-2xl font-black uppercase tracking-wide text-[#ECE6D8]">Godfather</span>
                              <span className="t text-[10px] tracking-wider uppercase px-2 py-0.5 bg-[#D9A441]/20 text-[#D9A441] border border-[#D9A441]/50 font-bold rounded-[2px]">
                                Boss
                              </span>
                            </div>
                            <div className="text-xs font-['Instrument_Sans'] text-[#A39D90] mt-1">Appears innocent to police</div>
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
                      </div>
                    </div>

                    {/* Family 2: Town Defense & Law (Cobalt / Teal Noir) */}
                    <div className="p-4 rounded-[6px] border border-[#5B7A99]/40 bg-[#0C141C]/50 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between pb-2 border-b border-[#5B7A99]/20">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#5B7A99] shadow-[0_0_8px_#5B7A99]" />
                          <span className="d text-xl font-black uppercase tracking-wider text-[#93c5fd]">
                            Town Defense & Law
                          </span>
                          <span className="t text-[10px] tracking-wider uppercase px-2 py-0.5 bg-[#5B7A99]/20 text-[#93c5fd] border border-[#5B7A99]/50 font-bold rounded-[2px]">
                            {docTotal + copTotal + vigTotal} Assigned
                          </span>
                        </div>
                        <span className="text-[11px] font-['Instrument_Sans'] text-[#A39D90] hidden sm:inline">
                          Protectors & investigators exposing conspiracy
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Doctor */}
                        <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[4px] hover:border-[#5E8C7B]/60 transition-all flex items-center justify-between shadow-md">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <span className="d text-2xl font-black uppercase tracking-wide text-[#ECE6D8]">Doctor</span>
                              <span className="t text-[10px] tracking-wider uppercase px-2 py-0.5 bg-[#5E8C7B]/20 text-[#86efac] border border-[#5E8C7B]/50 font-bold rounded-[2px]">
                                Defense
                              </span>
                            </div>
                            <div className="text-xs font-['Instrument_Sans'] text-[#A39D90] mt-1">Protects 1 target from harm</div>
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

                        {/* Police */}
                        <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[4px] hover:border-[#5B7A99]/60 transition-all flex items-center justify-between shadow-md">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <span className="d text-2xl font-black uppercase tracking-wide text-[#ECE6D8]">Police</span>
                              <span className="t text-[10px] tracking-wider uppercase px-2 py-0.5 bg-[#5B7A99]/20 text-[#93c5fd] border border-[#5B7A99]/50 font-bold rounded-[2px]">
                                Law
                              </span>
                            </div>
                            <div className="text-xs font-['Instrument_Sans'] text-[#A39D90] mt-1">Uncovers allegiance each night</div>
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

                        {/* Vigilante */}
                        <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[4px] hover:border-[#D9A441]/60 transition-all flex items-center justify-between shadow-md">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <span className="d text-2xl font-black uppercase tracking-wide text-[#ECE6D8]">Vigilante</span>
                              <span className="t text-[10px] tracking-wider uppercase px-2 py-0.5 bg-[#D9A441]/20 text-[#F0D79A] border border-[#D9A441]/50 font-bold rounded-[2px]">
                                Rogue
                              </span>
                            </div>
                            <div className="text-xs font-['Instrument_Sans'] text-[#A39D90] mt-1">One-shot marksman</div>
                          </div>
                          {isHost && (
                            <Switch
                              checked={Boolean(settings.roles.vigilante?.enabled)}
                              onChange={(val) => {
                                if (val && specialTotal + 1 > maxRoomCapacity) return;
                                onUpdateSettings({
                                  roles: { ...settings.roles, vigilante: { enabled: val, count: val ? 1 : 0 } },
                                });
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Family 3: Town Populace (Amber / Parchment Noir) */}
                    <div className="p-4 rounded-[6px] border border-[#D9A441]/30 bg-[#16130B]/50 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between pb-2 border-b border-[#D9A441]/20">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#D9A441] shadow-[0_0_8px_#D9A441]" />
                          <span className="d text-xl font-black uppercase tracking-wider text-[#F0D79A]">
                            Town Populace
                          </span>
                          <span className="t text-[10px] tracking-wider uppercase px-2 py-0.5 bg-[#D9A441]/20 text-[#D9A441] border border-[#D9A441]/50 font-bold rounded-[2px]">
                            {civTotal} Assigned
                          </span>
                        </div>
                        <span className="text-[11px] font-['Instrument_Sans'] text-[#A39D90] hidden sm:inline">
                          Unarmed citizens voting during daytime tribunal
                        </span>
                      </div>

                      <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[4px] flex items-center justify-between shadow-md">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="d text-2xl font-black uppercase tracking-wide text-[#ECE6D8]">Civilian</span>
                            <span className="t text-[10px] tracking-wider uppercase px-2 py-0.5 bg-[#4E4A44]/40 text-[#ECE6D8] border border-[#6b6455] font-bold rounded-[2px]">
                              Populace
                            </span>
                          </div>
                          <div className="text-xs font-['Instrument_Sans'] text-[#A39D90] mt-1">
                            Voters at town tribunal · Automatically fills remaining {civTotal} seat(s)
                          </div>
                        </div>
                        <div className="px-3.5 py-1.5 rounded bg-[#101216] border border-[#262A33] font-mono text-xs font-bold text-[#D9A441]">
                          {civTotal} Seats
                        </div>
                      </div>
                    </div>

                    {/* Family 4: Neutrals & Chaos (Purple Noir) */}
                    <div className="p-4 rounded-[6px] border border-[#8C6FA0]/40 bg-[#130D19]/50 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between pb-2 border-b border-[#8C6FA0]/20">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#8C6FA0] shadow-[0_0_8px_#8C6FA0]" />
                          <span className="d text-xl font-black uppercase tracking-wider text-[#d8b4fe]">
                            Neutrals & Chaos
                          </span>
                          <span className="t text-[10px] tracking-wider uppercase px-2 py-0.5 bg-[#8C6FA0]/20 text-[#d8b4fe] border border-[#8C6FA0]/50 font-bold rounded-[2px]">
                            {jesterTotal} Assigned
                          </span>
                        </div>
                        <span className="text-[11px] font-['Instrument_Sans'] text-[#A39D90] hidden sm:inline">
                          Lone agents with unpredictable independent win conditions
                        </span>
                      </div>

                      <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[4px] hover:border-[#8C6FA0]/60 transition-all flex items-center justify-between shadow-md">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="d text-2xl font-black uppercase tracking-wide text-[#ECE6D8]">Jester</span>
                            <span className="t text-[10px] tracking-wider uppercase px-2 py-0.5 bg-[#8C6FA0]/20 text-[#d8b4fe] border border-[#8C6FA0]/50 font-bold rounded-[2px]">
                              Chaos
                            </span>
                          </div>
                          <div className="text-xs font-['Instrument_Sans'] text-[#A39D90] mt-1">Wins if eliminated in daytime tribunal</div>
                        </div>
                        {isHost && (
                          <Switch
                            checked={Boolean(settings.roles.jester?.enabled)}
                            onChange={(val) => {
                              if (val && specialTotal + 1 > maxRoomCapacity) return;
                              onUpdateSettings({
                                roles: { ...settings.roles, jester: { enabled: val, count: val ? 1 : 0 } },
                              });
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Rules & Timers */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  {/* Rule Presets */}
                  <div className="p-4 bg-[#101216] border border-[#262A33] rounded-[6px] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="t text-xs uppercase tracking-widest text-[#D9A441] font-bold">Rule & Timer Presets:</span>
                        <span className="text-[10px] font-mono text-[#A39D90]">Includes timers, mafia mode, voting rules</span>
                      </div>
                      {isHost && (
                        <button
                          type="button"
                          onClick={() => {
                            setRulePresetNameInput('');
                            setRulePresetError('');
                            setSaveRulePresetModalOpen(true);
                          }}
                          className="t text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-[4px] text-[#D9A441] border border-[#D9A441] hover:bg-[#D9A441] hover:text-[#0A0B0E] font-bold transition-all cursor-pointer shadow-sm"
                        >
                          + Save Rule Preset
                        </button>
                      )}
                    </div>

                    {isHost ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {Object.keys(RULE_PRESETS).map((presetName) => (
                          <button
                            key={presetName}
                            type="button"
                            onClick={() => applyRulePreset(presetName, RULE_PRESETS[presetName])}
                            className="t text-xs uppercase tracking-wider px-3.5 py-2 rounded-[4px] border border-[#262A33] hover:border-[#D9A441] hover:text-[#D9A441] bg-[#171A20] text-[#ECE6D8] font-bold transition-all cursor-pointer shadow-sm"
                          >
                            {presetName}
                          </button>
                        ))}

                        {customRulePresets.map((crp) => (
                          <div
                            key={crp.name}
                            className="inline-flex items-center rounded-[4px] border border-[#D9A441]/60 bg-[#171A20] text-[#ECE6D8] overflow-hidden shadow-sm hover:border-[#D9A441]"
                          >
                            <button
                              type="button"
                              onClick={() => applyRulePreset(crp.name, crp.rules)}
                              className="t text-xs uppercase tracking-wider px-3 py-2 font-bold hover:text-[#D9A441] transition-colors cursor-pointer"
                            >
                              {crp.name}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCustomRulePreset(crp.name, e)}
                              title={`Delete ${crp.name} rule preset`}
                              className="px-2 py-2 hover:text-[#B3363B] text-xs font-bold border-l border-[#262A33] cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="t text-xs text-[#A39D90] uppercase">Host Controlled</span>
                    )}
                  </div>

                  {/* Grouped Settings Sections */}
                  {[
                    {
                      id: 'timing',
                      title: 'TIMERS & PACING',
                      subtitle: 'Turn clocks, untimed sandbox mode, and night speed',
                      color: '#2DD4BF',
                      borderClass: 'border-[#2DD4BF]/40',
                      bgClass: 'bg-[#0B1516]/50',
                      badgeClass: 'bg-[#2DD4BF]/20 text-[#5eead4] border-[#2DD4BF]/50',
                      keys: ['noTimer', 'nightDuration', 'discussionDuration', 'votingDuration', 'endNightEarly'],
                    },
                    {
                      id: 'syndicate',
                      title: 'SYNDICATE FAMILY RULES',
                      subtitle: 'Underworld consensus, peace pacts, and encrypted channels',
                      color: '#B3363B',
                      borderClass: 'border-[#B3363B]/40',
                      bgClass: 'bg-[#180A0C]/50',
                      badgeClass: 'bg-[#B3363B]/20 text-[#fca5a5] border-[#B3363B]/50',
                      keys: ['mafiaKillMode', 'mafiaDisagreeFallback', 'noKillFirstNight', 'mafiaNightChat'],
                    },
                    {
                      id: 'town',
                      title: 'TOWN DEFENSE & INVESTIGATIVE',
                      subtitle: 'Doctor medical protocol, police intelligence delay, and vigilante armory',
                      color: '#5B7A99',
                      borderClass: 'border-[#5B7A99]/40',
                      bgClass: 'bg-[#0E1520]/50',
                      badgeClass: 'bg-[#5B7A99]/20 text-[#93c5fd] border-[#5B7A99]/50',
                      keys: ['doctorSelfSave', 'doctorSameTargetTwice', 'announceSave', 'policeResultDelay', 'policeResultDetail', 'vigilanteShots'],
                    },
                    {
                      id: 'tribunal',
                      title: 'TRIBUNAL & VOTING RULES',
                      subtitle: 'Public ballots, skip allowances, tie breaks, and role reveals',
                      color: '#D9A441',
                      borderClass: 'border-[#D9A441]/40',
                      bgClass: 'bg-[#181308]/50',
                      badgeClass: 'bg-[#D9A441]/20 text-[#F0D79A] border-[#D9A441]/50',
                      keys: ['voteVisibility', 'allowSkipVote', 'tieRule', 'revealRoleOnDeath'],
                    },
                    {
                      id: 'general',
                      title: 'GENERAL & MATCH INTEGRITY',
                      subtitle: 'Room capacity, table layouts, narrator oversight, and afterlife frequency',
                      color: '#A78BFA',
                      borderClass: 'border-[#A78BFA]/40',
                      bgClass: 'bg-[#140E1E]/50',
                      badgeClass: 'bg-[#A78BFA]/20 text-[#c4b5fd] border-[#A78BFA]/50',
                      keys: ['circleSitting', 'maxPlayers', 'moderatorMode', 'dayChat', 'revealRoleList', 'deadChat', 'deadSeeRoles'],
                    },
                  ].map((category) => {
                    const fields = SETTINGS_SCHEMA.filter(
                      (s) => category.keys.includes(s.key) && (!s.showIf || s.showIf(settings))
                    );
                    if (fields.length === 0) return null;

                    return (
                      <div key={category.id} className={`p-4 rounded-[6px] border ${category.borderClass} ${category.bgClass} space-y-3 shadow-lg`}>
                        <div className="flex items-center justify-between pb-2 border-b border-[#262A33]">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: category.color, boxShadow: `0 0 8px ${category.color}` }} />
                            <span className="d text-xl font-black uppercase tracking-wider" style={{ color: category.color }}>
                              {category.title}
                            </span>
                            <span className={`t text-[10px] tracking-wider uppercase px-2 py-0.5 border font-bold rounded-[2px] ${category.badgeClass}`}>
                              {fields.length} Rules
                            </span>
                          </div>
                          <span className="text-[11px] font-['Instrument_Sans'] text-[#A39D90] hidden sm:inline">
                            {category.subtitle}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {fields.map((s) => (
                            <div key={s.key} className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[4px] hover:border-[#D9A441]/40 transition-colors flex items-center justify-between shadow-sm">
                              <div className="pr-2">
                                <div className="text-sm font-['Instrument_Sans'] font-semibold text-[#ECE6D8]">{s.label}</div>
                                <div className="text-[11px] font-['Instrument_Sans'] text-[#A39D90] mt-0.5">{s.tooltip}</div>
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
                                    className="bg-[#101216] border border-[#262A33] text-xs font-mono px-3 py-1.5 rounded-[2px] text-[#ECE6D8] focus:outline-none focus:border-[#D9A441] cursor-pointer"
                                  >
                                    {s.options?.map((opt) => (
                                      <option key={opt.value} value={opt.value} className="bg-[#101216] text-[#ECE6D8]">
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                )
                              ) : (
                                <span className="text-xs text-[#A39D90] font-mono">{s.plain((settings as any)[s.key])}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 3: Comms & Logs */}
              {activeTab === 'comms' && (
                <div className="space-y-4 font-['Instrument_Sans']">
                  <div className="bg-[#101216] border border-[#262A33] rounded-[6px] p-4 flex flex-col justify-between h-[420px] shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#262A33]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded border border-[#262A33] bg-[#171A20] flex items-center justify-center text-[#D9A441]">
                          <Radio className="w-4 h-4 text-[#D9A441] animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="d text-lg font-black uppercase tracking-wider text-[#ECE6D8]">
                              Lobby Wire Dispatch
                            </span>
                            <span className="w-2 h-2 rounded-full bg-[#5E8C7B] animate-ping" />
                          </div>
                          <span className="text-[10px] font-mono text-[#A39D90] uppercase tracking-widest">
                            Unencrypted Pre-Game Frequency · 108.4 MHz
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-[#D9A441] bg-[#171A20] px-2.5 py-1 border border-[#262A33] rounded">
                        {chatList.filter((m) => m.channel === 'public').length} Dispatches
                      </span>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto space-y-2 py-3 px-1">
                      {chatList
                        .filter((m) => m.channel === 'public')
                        .map((m) => (
                          <div
                            key={m.id}
                            className="p-3 border border-[#262A33] bg-[#171A20] rounded hover:border-[#D9A441]/40 transition-all shadow-sm"
                          >
                            <div className="flex items-center justify-between text-[10px] text-[#A39D90] mb-1 font-mono">
                              <span className="font-bold text-[#D9A441] uppercase tracking-wider">
                                {m.senderName}
                              </span>
                              <span className="text-[#A39D90]">
                                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-xs text-[#ECE6D8] leading-relaxed font-mono">{m.text}</div>
                          </div>
                        ))}
                      {chatList.filter((m) => m.channel === 'public').length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center py-16 space-y-2">
                          <MessageSquare className="w-8 h-8 text-[#A39D90]/40" />
                          <div className="text-sm font-serif font-bold text-[#ECE6D8]">Wire frequency quiet</div>
                          <p className="text-xs text-[#A39D90] font-mono max-w-xs">
                            No transmissions intercepted. Transmit a pre-game dispatch to operatives seated in the room.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Input Bar */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!lobbyChatInput.trim() || !onSendChat) return;
                        onSendChat('public', lobbyChatInput.trim());
                        setLobbyChatInput('');
                      }}
                      className="pt-3 border-t border-[#262A33] flex gap-2.5"
                    >
                      <input
                        type="text"
                        value={lobbyChatInput}
                        onChange={(e) => setLobbyChatInput(e.target.value)}
                        placeholder="Transmit dispatch to lobby frequency..."
                        maxLength={300}
                        className="flex-1 bg-[#171A20] border border-[#262A33] px-3.5 py-2 text-xs font-mono text-[#ECE6D8] placeholder-[#A39D90]/50 rounded-[4px] focus:outline-none focus:border-[#D9A441] transition-colors"
                      />
                      <button
                        type="submit"
                        className="px-5 bg-[#D9A441] hover:bg-[#FFEA00] text-[#0A0B0E] font-bold text-xs uppercase tracking-wider rounded-[4px] flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 text-[#0A0B0E]" />
                        <span>Transmit</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Tab 4: Host Tools */}
              {activeTab === 'tools' && isHost && (
                <div className="space-y-4 font-['Instrument_Sans']">
                  {/* Bot Controls */}
                  <div className="p-5 bg-[#171A20] border border-[#262A33] rounded-[6px] space-y-3 shadow-md">
                    <h4 className="d text-xl font-bold uppercase tracking-wider text-[#ECE6D8] flex items-center gap-2">
                      <Bot className="w-5 h-5 text-[#D9A441]" />
                      <span>Simulated Test Bots</span>
                    </h4>
                    <p className="text-xs font-['Instrument_Sans'] text-[#A39D90]">
                      Add bots to quickly test match flow, night actions, and day voting without needing extra browser windows.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {onAddBots && (() => {
                        const botsNeededToFill = Math.max(0, settings.maxPlayers - players.length);
                        return (
                          <button
                            type="button"
                            onClick={onAddBots}
                            disabled={botsNeededToFill <= 0}
                            className={`px-4 py-2 t text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 rounded-[2px] ${
                              botsNeededToFill > 0
                                ? 'bg-[#D9A441] text-[#0A0B0E] hover:bg-[#F0D79A] cursor-pointer'
                                : 'bg-[#262A33] text-[#A39D90] cursor-not-allowed opacity-60'
                            }`}
                          >
                            <Bot className="w-3.5 h-3.5" />
                            <span>
                              {botsNeededToFill > 0
                                ? `+ Fill Room with Bots (${botsNeededToFill})`
                                : `Room Full (${players.length}/${settings.maxPlayers})`}
                            </span>
                          </button>
                        );
                      })()}
                      {players.some((p) => p.isBot || p.id.startsWith('bot_')) && onClearBots && (
                        <button
                          type="button"
                          onClick={onClearBots}
                          className="px-3.5 py-2 bg-[#101216] text-[#B3363B] hover:text-white border border-[#B3363B]/40 t text-xs font-bold uppercase tracking-wider transition-colors rounded-[2px] cursor-pointer"
                        >
                          Clear Bots
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mode Toggles */}
                  <div className="p-5 bg-[#171A20] border border-[#262A33] rounded-[6px] space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="d text-xl font-bold uppercase tracking-wider text-[#ECE6D8] flex items-center gap-2">
                          <Shield className="w-5 h-5 text-[#D9A441]" />
                          <span>Live Narrator (God Mode)</span>
                        </div>
                        <span className="t text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 bg-[#D9A441]/15 text-[#D9A441] border border-[#D9A441]/40 rounded-[2px]">
                          Omniscient Chair
                        </span>
                      </div>
                      <p className="text-xs text-[#A39D90] leading-relaxed mb-4">
                        Choose any seated player to act as the omniscient Narrator who manually assigns roles from the deck and oversees the match without playing a secret role.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Auto Moderator Option */}
                        <button
                          type="button"
                          onClick={() => onToggleGod(null, false)}
                          className={`p-3.5 rounded-[4px] border text-left flex items-center justify-between transition-all cursor-pointer ${
                            !players.some((p) => p.isGod)
                              ? 'bg-[#101216] border-[#D9A441] shadow-[0_0_15px_rgba(217,164,65,0.25)] ring-1 ring-[#D9A441]'
                              : 'bg-[#101216] border-[#262A33] hover:border-[#D9A441]/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                              !players.some((p) => p.isGod) ? 'border-[#D9A441] bg-[#D9A441]/20 text-[#D9A441]' : 'border-[#262A33] bg-[#171A20] text-[#A39D90]'
                            }`}>
                              <Bot className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-[#ECE6D8]">Auto Moderator</div>
                              <div className="text-[10px] text-[#A39D90]">Everyone plays secret roles</div>
                            </div>
                          </div>
                          {!players.some((p) => p.isGod) && (
                            <span className="text-[10px] font-mono font-bold text-[#D9A441] bg-[#D9A441]/10 px-2 py-0.5 border border-[#D9A441]/40 rounded shrink-0">
                              Active ✓
                            </span>
                          )}
                        </button>

                        {/* Player Narrator Options */}
                        {players.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => onToggleGod(p.id, !p.isGod)}
                            className={`p-3.5 rounded-[4px] border text-left flex items-center justify-between transition-all cursor-pointer ${
                              p.isGod
                                ? 'bg-[#101216] border-[#D9A441] shadow-[0_0_15px_rgba(217,164,65,0.25)] ring-1 ring-[#D9A441]'
                                : 'bg-[#101216] border-[#262A33] hover:border-[#D9A441]/50'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 overflow-hidden"
                                style={{ borderColor: p.color || '#D9A441' }}
                              >
                                <Avatar avatarId={p.avatar || 1} size={32} className="border-0" />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold text-[#ECE6D8] truncate flex items-center gap-1.5">
                                  <span>{p.name}</span>
                                  {p.isHost && <Crown className="w-3 h-3 text-[#D9A441] shrink-0" />}
                                </div>
                                <div className="text-[10px] text-[#A39D90]">
                                  {p.isGod ? 'Live Narrator Overseer' : 'Seated Operative'}
                                </div>
                              </div>
                            </div>
                            {p.isGod ? (
                              <span className="text-[10px] font-mono font-bold text-[#0A0B0E] bg-[#D9A441] px-2 py-0.5 rounded shrink-0">
                                Narrator ✓
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-[#A39D90] hover:text-[#D9A441] shrink-0">
                                Make God
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Lock Room Toggle */}
                    {onToggleLockRoom && (
                      <div className="p-3.5 bg-[#101216] border border-[#262A33] rounded-[4px] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          {gameView.isLocked ? (
                            <Lock className="w-4 h-4 text-[#B3363B]" />
                          ) : (
                            <Unlock className="w-4 h-4 text-[#5E8C7B]" />
                          )}
                          <div>
                            <div className="text-xs font-bold text-[#ECE6D8]">
                              Lock Room Entry
                            </div>
                            <div className="text-[10px] text-[#A39D90]">
                              {gameView.isLocked
                                ? 'Room locked · New players cannot join'
                                : 'Room open · Operatives can join with room code'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={onToggleLockRoom}
                          className={`px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded border transition-colors cursor-pointer ${
                            gameView.isLocked
                              ? 'bg-[#B3363B]/20 text-[#fca5a5] border-[#B3363B] hover:bg-[#B3363B]/30'
                              : 'bg-[#171A20] text-[#ECE6D8] border-[#262A33] hover:border-[#D9A441] hover:text-[#D9A441]'
                          }`}
                        >
                          {gameView.isLocked ? 'Unlock Room' : 'Lock Room'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#262A33] flex justify-end">
              <button
                type="button"
                onClick={() => setSetupDrawerOpen(false)}
                className="px-6 py-2.5 bg-[#D9A441] text-[#0A0B0E] font-bold text-xs uppercase tracking-wider rounded hover:bg-[#F0D79A] shadow-lg transition-all"
              >
                Close setup
              </button>
            </div>
          </div>
        </div>

      {/* Case Docket Modal (≡ Three-bar button) */}
      <Modal
        isOpen={caseDocketOpen}
        onClose={() => setCaseDocketOpen(false)}
        title="CASE DOCKET"
        subtitle={`ROOM CODE · ${gameView.code}`}
      >
        <div className="space-y-4 text-[#ECE6D8] font-['Instrument_Sans']">
          <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[6px] space-y-3">
            <div className="flex items-center justify-between">
              <span className="t text-xs uppercase tracking-widest text-[#A39D90]">CLASSIFIED ROOM CODE</span>
              <span className="font-mono text-3xl font-extrabold text-[#D9A441] tracking-widest">{gameView.code}</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyRoomCode}
                className="ob flex-1 h-10 text-xs font-semibold rounded flex items-center justify-center gap-1.5"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Code Copied' : 'Copy Code'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="ob flex-1 h-10 text-xs font-semibold rounded flex items-center justify-center gap-1.5"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="ob h-10 px-4 text-xs font-semibold rounded hover:border-[#D9A441] hover:text-[#D9A441] transition-colors"
                title="Native Share"
              >
                Share
              </button>
            </div>
          </div>

          {/* Voice Wire Console Access */}
          {onToggleVoice && (
            <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[6px] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Radio className="w-5 h-5 text-[#D9A441]" />
                <div>
                  <div className="text-sm font-semibold text-[#ECE6D8]">Voice Wire Console</div>
                  <div className="text-xs text-[#A39D90] font-mono">
                    {isVoiceActive ? (isVoiceMuted ? 'Mic Muted · Mesh Active' : 'Wire Live · Transmitting') : 'Voice Mesh Disconnected'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isVoiceActive ? (
                  <button
                    type="button"
                    onClick={onToggleVoiceMute}
                    className="ob h-9 px-3 text-xs font-semibold rounded hover:border-[#D9A441]"
                  >
                    {isVoiceMuted ? 'Unmute' : 'Mute'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onToggleVoice}
                    className="h-9 px-3.5 bg-[#D9A441] text-[#0A0B0E] font-bold text-xs uppercase rounded hover:bg-[#F0D79A] transition-colors shadow"
                  >
                    Join Wire
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-[#262A33]">
            <button
              type="button"
              onClick={() => setCaseDocketOpen(false)}
              className="ob px-5 py-2 text-xs font-semibold rounded"
            >
              Close Docket
            </button>
          </div>
        </div>
      </Modal>

      {/* Start Match Confirmation Modal */}
      <Modal
        isOpen={startConfirmOpen}
        onClose={() => setStartConfirmOpen(false)}
        title="COMMENCE OPERATION"
        subtitle={`INVESTIGATION BRIEFING · ${players.length} OPERATIVES`}
      >
        <div className="space-y-4 text-[#ECE6D8] font-['Instrument_Sans']">
          <p className="text-sm leading-relaxed text-[#ECE6D8]">
            Begin the investigation with <strong className="text-[#D9A441] font-bold">{players.length} operatives</strong>?
          </p>
          <div className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[4px] text-xs text-[#A39D90] leading-relaxed">
            All players will immediately be assigned their secret roles and Night 1 will commence. Ensure all operatives are ready.
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262A33]">
            <button
              type="button"
              onClick={() => setStartConfirmOpen(false)}
              className="ob px-4 py-2 text-xs font-semibold rounded text-[#A39D90] hover:text-[#ECE6D8]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmStart}
              className="px-6 py-2 bg-[#D9A441] text-[#0A0B0E] font-bold text-xs uppercase tracking-wider rounded hover:bg-[#F0D79A] shadow-lg transition-all"
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
        subtitle={`AGENT REMOVAL · ${pendingKickPlayer?.name || ''}`}
      >
        <div className="space-y-4 text-[#ECE6D8] font-['Instrument_Sans']">
          <p className="text-sm leading-relaxed text-[#ECE6D8]">
            Remove <strong className="text-[#D9A441] font-bold">{pendingKickPlayer?.name}</strong> from the briefing room?
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262A33]">
            <button
              type="button"
              onClick={() => setPendingKickPlayer(null)}
              className="ob px-4 py-2 text-xs font-semibold rounded text-[#A39D90] hover:text-[#ECE6D8]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmKick}
              className="px-5 py-2 bg-blood text-white font-bold text-xs uppercase tracking-wider rounded hover:bg-blood/80 shadow-lg transition-all"
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
        subtitle={`SECURITY REVOCATION · ${pendingBanPlayer?.name || ''}`}
      >
        <div className="space-y-4 text-[#ECE6D8] font-['Instrument_Sans']">
          <p className="text-sm leading-relaxed text-[#ECE6D8]">
            Permanently ban <strong className="text-[#D9A441] font-bold">{pendingBanPlayer?.name}</strong> from this room?
          </p>
          <div className="p-3 bg-blood/10 border border-blood/40 rounded-[4px] text-xs text-red-200">
            Their device token will be permanently blocked from rejoining this case room.
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262A33]">
            <button
              type="button"
              onClick={() => setPendingBanPlayer(null)}
              className="ob px-4 py-2 text-xs font-semibold rounded text-[#A39D90] hover:text-[#ECE6D8]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmBan}
              className="px-5 py-2 bg-blood text-white font-bold text-xs uppercase tracking-wider rounded hover:bg-blood/80 shadow-lg transition-all"
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
        <div className="flex flex-col items-center justify-center p-4 space-y-5 text-[#ECE6D8] font-mono">
          <div className="p-4 bg-[#ECE6D8] border border-[#262A33] shadow-inner">
            <QRCodeSVG value={shareUrl} size={200} />
          </div>

          <div className="text-center space-y-1">
            <div className="text-2xl font-bold tracking-widest text-[#ECE6D8]">
              CASE #{gameView.code}
            </div>
            <div className="text-xs text-[#A39D90]">
              Scan with phone camera or share link below
            </div>
          </div>

          <div className="w-full space-y-2 pt-2 border-t border-[#262A33]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-[#0A0B0E] border border-[#262A33] px-3 py-1.5 text-xs text-[#A39D90] select-all font-mono"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="ob px-3 py-1.5 text-xs font-semibold uppercase"
              >
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Operative Avatar & Color Custom Modal */}
      <Modal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        title="YOUR AVATAR"
        subtitle="Select your disguise avatar and designated table pawn color"
        maxWidth="max-w-lg"
      >
        <div className="space-y-5 text-[#ECE6D8]">
          {/* Alias Name Edit Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#A39D90] uppercase tracking-wider block">
              Operative Alias
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder="Enter alias"
                maxLength={18}
                className="flex-1 bg-[#0A0B0E] border border-[#262A33] px-3.5 py-2 text-sm text-[#ECE6D8] rounded-[4px] focus:outline-none focus:border-[#D9A441]"
              />
              <button
                type="button"
                onClick={() => {
                  const finalName = aliasInput.trim() || me?.name || 'Operative';
                  if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('mafia-name', finalName);
                  }
                  onUpdateProfile?.({ name: finalName, avatar: me?.avatar || 1, color: me?.color });
                }}
                className="ob px-4 text-xs font-semibold"
              >
                Save
              </button>
            </div>
          </div>

          {/* 12 Avatar Choices Grid */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-[#A39D90] uppercase tracking-wider block">
              Choose Persona (1–12)
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((id) => {
                const isSelected = (me?.avatar || 1) === id;
                const pinColor = PLAYER_COLORS[(id - 1) % PLAYER_COLORS.length];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('mafia-avatar', String(id));
                      }
                      const finalName = aliasInput.trim() || me?.name || 'Operative';
                      onUpdateProfile?.({
                        name: finalName,
                        avatar: id,
                        color: pinColor,
                      });
                      setAvatarModalOpen(false);
                    }}
                    className={`relative p-2 rounded-[6px] border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#D9A441] bg-[#171A20] shadow-[0_0_15px_rgba(217,164,65,0.3)] scale-105'
                        : 'border-[#262A33] bg-[#101216] hover:border-[#6b6455] hover:scale-102'
                    }`}
                  >
                    <div
                      className="w-11 h-11 rounded-full border-2 flex items-center justify-center relative overflow-hidden"
                      style={{ borderColor: pinColor }}
                    >
                      <Avatar avatarId={id} size={40} className="border-0" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#D9A441]/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-[#D9A441]" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-[#A39D90]">#{id}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Save Custom Role Preset Modal (Saves Roles + Rules & Timers) */}
      <Modal
        isOpen={savePresetModalOpen}
        onClose={() => setSavePresetModalOpen(false)}
        title="SAVE CUSTOM SETUP"
        subtitle="SAVES ROLES DECK + RULES & TIMERS COMBINATION"
      >
        <div className="space-y-4 text-[#ECE6D8] font-['Instrument_Sans']">
          <div className="p-3 bg-[#171A20] border border-[#262A33] rounded-[4px] space-y-1">
            <span className="text-[11px] font-mono text-[#D9A441] uppercase tracking-wider block">
              Active Deck Breakdown
            </span>
            <p className="text-xs text-[#ECE6D8]">
              {mafiaTotal} Mafia · {godfatherCount > 0 ? `${godfatherCount} Godfather · ` : ''}{docTotal} Doctor · {copTotal} Police · {vigCount > 0 ? `${vigCount} Vigilante · ` : ''}{jesterCount > 0 ? `${jesterCount} Jester · ` : ''}{civTotal} Civilians
            </p>
            <p className="text-[11px] text-[#A39D90] font-mono pt-1 border-t border-[#262A33]/50">
              Includes {settings.nightDuration}s Night · {settings.discussionDuration}s Discussion · {settings.votingDuration}s Voting · {settings.mafiaKillMode} kill mode
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#A39D90] uppercase tracking-wider block">
              Setup Codename
            </label>
            <input
              type="text"
              value={presetNameInput}
              onChange={(e) => {
                setPresetNameInput(e.target.value);
                if (presetError) setPresetError('');
              }}
              placeholder="e.g. 8-Player High Stakes"
              maxLength={24}
              className="w-full h-11 px-3 bg-[#0A0B0E] border border-[#262A33] focus:border-[#D9A441] rounded-[4px] text-sm text-[#ECE6D8] font-mono outline-none"
            />
            {presetError && <p className="text-xs text-[#B3363B] font-mono">{presetError}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262A33]">
            <Button variant="secondary" onClick={() => setSavePresetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveCustomPreset}>
              Save Setup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Save Custom Rule Preset Modal (Saves Rules & Timers Separately) */}
      <Modal
        isOpen={saveRulePresetModalOpen}
        onClose={() => setSaveRulePresetModalOpen(false)}
        title="SAVE RULE PRESET"
        subtitle="SAVE RULES & TIMERS SEPARATELY"
      >
        <div className="space-y-4 text-[#ECE6D8] font-['Instrument_Sans']">
          <div className="p-3 bg-[#171A20] border border-[#262A33] rounded-[4px] space-y-1">
            <span className="text-[11px] font-mono text-[#D9A441] uppercase tracking-wider block">
              Active Rules & Timers Configuration
            </span>
            <p className="text-xs text-[#ECE6D8]">
              Night: {settings.nightDuration}s · Discussion: {settings.discussionDuration}s · Voting: {settings.votingDuration}s
            </p>
            <p className="text-[11px] text-[#A39D90] font-mono pt-1 border-t border-[#262A33]/50">
              Mafia agreement: {settings.mafiaKillMode} · Vote ballot: {settings.voteVisibility} · Tie rule: {settings.tieRule} · Role on death: {settings.revealRoleOnDeath}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#A39D90] uppercase tracking-wider block">
              Rule Preset Name
            </label>
            <input
              type="text"
              value={rulePresetNameInput}
              onChange={(e) => {
                setRulePresetNameInput(e.target.value);
                if (rulePresetError) setRulePresetError('');
              }}
              placeholder="e.g. Blitz Speed (25s) & Secret Votes"
              maxLength={28}
              className="w-full h-11 px-3 bg-[#0A0B0E] border border-[#262A33] focus:border-[#D9A441] rounded-[4px] text-sm text-[#ECE6D8] font-mono outline-none"
            />
            {rulePresetError && <p className="text-xs text-[#B3363B] font-mono">{rulePresetError}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262A33]">
            <Button variant="secondary" onClick={() => setSaveRulePresetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveCustomRulePreset}>
              Save Rule Preset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
