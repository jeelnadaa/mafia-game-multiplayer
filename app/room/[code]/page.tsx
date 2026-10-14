'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRoom } from '@/lib/useRoom';
import { TopBar } from '@/components/TopBar';
import { Lobby } from '@/components/Lobby';
import { Night } from '@/components/Night';
import { Day } from '@/components/Day';
import { End } from '@/components/End';
import { God } from '@/components/God';
import { HelpSheet, HelpTab } from '@/components/HelpSheet';
import { CircleSittingArena } from '@/components/CircleSittingArena';
import { RoleReveal } from '@/components/RoleReveal';
import { DawnAnnouncement } from '@/components/DawnAnnouncement';
import { Button, Avatar } from '@/components/ui';
import { AlertCircle, RotateCcw, Moon } from 'lucide-react';
import { useShortcut } from '@/lib/shortcuts';
import { clearRoomData } from '@/lib/storage';
import { playNightBell, setPhaseAmbience } from '@/lib/sfx';


export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string)?.toUpperCase() || '';
  const isValidCode = /^[A-HJ-NP-Z2-9]{5}$/i.test(code) || /^[A-Z0-9]{5}$/.test(code);

  const [name, setName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mafia-name') || '';
    }
    return '';
  });
  const [avatar, setAvatar] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mafia-avatar');
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });

  // Host enters automatically because they configured their profile on the home page.
  // Direct link visitors must enter their name and confirm joining.
  const [hasJoined, setHasJoined] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedHostRaw = localStorage.getItem(`mafia-host:${code}`);
      const isHostSaved = localStorage.getItem(`mafia-is-host:${code}`) === 'true';
      const isHostParam = window.location.search.includes('host=true');
      return Boolean(savedHostRaw) || isHostSaved || isHostParam;
    }
    return false;
  });

  const [helpOpen, setHelpOpen] = useState(false);
  const [helpInitialTab, setHelpInitialTab] = useState<HelpTab>('basics');

  // Synchronize profile updates from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAvatar = localStorage.getItem('mafia-avatar');
      if (savedAvatar) {
        const parsed = parseInt(savedAvatar, 10);
        if (parsed >= 1 && parsed <= 12) setAvatar(parsed);
      }
      const savedName = localStorage.getItem('mafia-name');
      if (savedName) setName(savedName);
    }
  }, []);

  // Synchronize profile updates to localStorage
  const handleSaveProfile = (newName: string, newAvatar: number) => {
    setName(newName);
    setAvatar(newAvatar);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mafia-name', newName);
      localStorage.setItem('mafia-avatar', String(newAvatar));
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'Player';
    handleSaveProfile(finalName, avatar);
    setHasJoined(true);
  };

  const {
    gameView,
    isHost,
    isConnected,
    isConnecting,
    error,
    rtt,
    sendIntent,
    sendChat,
    startMatch,
    toggleReady,
    addBots,
    clearBots,
    kickPlayer,
    banPlayer,
    toggleLockRoom,
    skipPlayer,
    setGodMode,
    updateSettings,
    updateProfile,
    setSuspicion,
    clearSuspicion,
    sendReaction,
    leaveRoom,
  } = useRoom(code, name.trim() || 'Player', avatar, { enabled: hasJoined });

  const handleLeaveRoom = useCallback(() => {
    leaveRoom();
    router.push('/');
  }, [leaveRoom, router]);

  // Section 3.1: Day/Night atmosphere shift, theme-color sync & phase banners
  const [phaseBanner, setPhaseBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!gameView) return;
    const currentPhase = gameView.phase;
    const roundNum = gameView.round;

    let htmlPhase = 'lobby';
    let themeColor = '#09090b';
    let bannerText = '';

    if (currentPhase === 'lobby') {
      htmlPhase = 'lobby';
      themeColor = '#09090b';
    } else if (currentPhase === 'roleReveal') {
      htmlPhase = 'night';
      themeColor = '#07090e';
      bannerText = 'ROLE REVEAL';
    } else if (currentPhase === 'night') {
      htmlPhase = 'night';
      themeColor = '#07090e';
      bannerText = `NIGHT ${roundNum}`;
      playNightBell();
      setPhaseAmbience('night');
    } else if (currentPhase === 'morning' || currentPhase === 'discussion') {
      htmlPhase = 'day';
      themeColor = '#0c0a09';
      bannerText = `DAY ${roundNum}`;
      setPhaseAmbience('day');
    } else if (currentPhase === 'voting' || currentPhase === 'voteResult') {
      htmlPhase = 'voting';
      themeColor = '#0d0707';
      bannerText = 'TOWN VOTE';
      setPhaseAmbience('voting');
    } else if (currentPhase === 'gameOver') {
      htmlPhase = 'gameover';
      themeColor = '#09090b';
      bannerText = 'GAME OVER';
      setPhaseAmbience('gameover');
    }

    document.documentElement.dataset.phase = htmlPhase;

    // Update browser theme-color meta tag for mobile status bar
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', themeColor);

    // Show phase banner for 1.5s
    if (bannerText && currentPhase !== 'lobby') {
      setPhaseBanner(bannerText);
      const timer = setTimeout(() => setPhaseBanner(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [gameView?.phase, gameView?.round]);

  // If rejected because name is already taken, immediately bring back join form
  useEffect(() => {
    if (error && error.includes('already taken')) {
      setHasJoined(false);
    }
  }, [error]);


  // Global shortcut 'H' or '?' toggles help
  useShortcut(
    ['?', 'h', 'H'],
    () => {
      setHelpInitialTab('basics');
      setHelpOpen((prev) => !prev);
    },
    { scope: 'global' }
  );

  // 'I' opens directly to My Role
  useShortcut(
    ['i', 'I'],
    () => {
      setHelpInitialTab('my-role');
      setHelpOpen(true);
    },
    { scope: 'global' }
  );

  const handleOpenHelp = (tab: HelpTab = 'basics') => {
    setHelpInitialTab(tab);
    setHelpOpen(true);
  };

  // 0. Invalid Room Code Screen
  if (!isValidCode) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-transparent text-center">
        <div className="max-w-md w-full bg-surface border border-border p-6 space-y-4">
          <div className="inline-flex items-center justify-center p-3 border border-border bg-surface-2 text-white">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-text">
            INVALID ROOM CODE
          </h2>
          <p className="text-xs font-mono text-muted leading-relaxed">
            The room code &quot;{code}&quot; is invalid. Room codes must be exactly 5 alphanumeric characters.
          </p>
          <div className="pt-2">
            <Button variant="primary" onClick={() => router.push('/')} className="w-full justify-center">
              RETURN HOME
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // 1. Pre-Join Screen for Visitors (Ask for name & avatar before checking availability)
  if (!hasJoined) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-transparent">
        <div className="w-full max-w-md bg-surface border border-border p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <span className="text-xs text-muted block">Direct P2P Mesh</span>
              <h1 className="text-xl font-bold text-text">Join Room</h1>
            </div>
            <div className="px-3 py-1 bg-surface-2 border border-border font-mono text-sm font-bold tracking-widest text-text">
              {code}
            </div>
          </div>

          {/* Avatar Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted">Choose Your Avatar</label>
              <span className="text-xs text-muted">Avatar #{avatar}</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAvatar(id)}
                  className={`p-1 border transition-colors flex items-center justify-center rounded-none ${
                    avatar === id
                      ? 'border-white bg-white/10 ring-1 ring-white'
                      : 'border-border hover:border-zinc-500 bg-surface-2'
                  }`}
                >
                  <Avatar avatarId={id} size={38} className="rounded-none" />
                </button>
              ))}
            </div>
          </div>

          {/* Name Input Form */}
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-500/60 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted">Your Codename</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Detective Vance"
                maxLength={20}
                autoFocus
                className="w-full bg-surface-2 border border-border rounded-none px-4 py-2.5 text-sm text-text placeholder-muted/50 focus:outline-none focus:border-white focus:bg-zinc-900 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" variant="primary" size="lg" className="w-full font-semibold justify-center text-center">
                Join Room
              </Button>
              <Button variant="ghost" size="md" onClick={() => router.push('/')} className="w-full text-muted justify-center text-center">
                Return Home
              </Button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // 2. Connection Error Screen
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-transparent text-center">
        <div className="max-w-md w-full bg-surface border border-border rounded-none p-6 space-y-4">
          <div className="inline-flex items-center justify-center p-3 border border-border bg-surface-2 text-white">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-text">
            ROOM UNAVAILABLE
          </h2>
          <p className="text-xs font-mono text-muted leading-relaxed">{error}</p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button variant="secondary" onClick={() => setHasJoined(false)}>
              <span>CHANGE CODENAME</span>
            </Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              <span>RETRY</span>
            </Button>
            <Button variant="primary" onClick={() => router.push('/')}>
              <span>RETURN HOME</span>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // 3. Connecting / Verifying Room Availability Screen
  if (isConnecting || !gameView) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-transparent text-center">
        <div className="space-y-4 max-w-sm w-full bg-surface border border-border p-8">
          <div className="w-12 h-12 border border-border bg-surface-2 flex items-center justify-center text-white mx-auto animate-pulse">
            <Moon className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-text">
              CONNECTING TO ROOM {code}
            </h2>
            <p className="text-xs font-mono text-muted mt-1">CHECKING ROOM AVAILABILITY & HOST STATUS...</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setHasJoined(false)} className="w-full text-muted justify-center">
            Cancel
          </Button>
        </div>
      </main>
    );
  }

  const { phase, me } = gameView;

  return (
    <div className="min-h-screen flex flex-col text-text bg-transparent relative">
      {/* Subtle Atmospheric Light Cone Overlay */}
      <div className="phase-atmosphere-overlay" aria-hidden="true" />

      {/* Temporary Phase Change Announcement Banner */}
      {phaseBanner && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 inset-x-0 mx-auto w-max max-w-sm px-6 py-2 bg-black/90 border border-white text-white font-mono font-bold text-sm tracking-widest uppercase z-50 shadow-2xl animate-in fade-in zoom-in duration-300"
        >
          {phaseBanner}
        </div>
      )}

      {/* Persistent Top Bar */}
      <TopBar
        gameView={gameView}
        onOpenHelp={handleOpenHelp}
        rtt={rtt}
        isReconnecting={!isConnected}
        isHost={isHost}
        onGodAction={(action) => sendIntent('godAction', { action })}
        onLeave={handleLeaveRoom}
      />

      {/* Main Game Screen Routing */}
      <main className="flex-1 flex flex-col">
        {/* God Mode Override Screen */}
        {me?.isGod && phase !== 'lobby' && (
          <God
            gameView={gameView}
            onGodAction={(action) => sendIntent('godAction', { action })}
          />
        )}

        {/* Regular Player Screen by Phase */}
        {(!me?.isGod || phase === 'lobby') && (
          <>
            {phase === 'lobby' && (
              <Lobby
                gameView={gameView}
                isHost={isHost}
                onStart={startMatch}
                onToggleReady={toggleReady}
                onKick={kickPlayer}
                onBan={banPlayer}
                onToggleLockRoom={toggleLockRoom}
                onToggleGod={setGodMode}
                onUpdateSettings={updateSettings}
                onUpdateProfile={(profile) => {
                  handleSaveProfile(profile.name || name, profile.avatar);
                  updateProfile(profile);
                }}
                onSendChat={(channel, text) => sendChat(channel, text)}
                onAddBots={addBots}
                onClearBots={clearBots}
              />
            )}

            {/* ROLE REVEAL SCREEN: Press-and-hold confidential dossier */}
            {phase === 'roleReveal' && (
              <RoleReveal
                gameView={gameView}
                onConfirmReady={toggleReady}
              />
            )}

            {/* DAWN ANNOUNCEMENT SCREEN: Sequenced morning casualties & saves report */}
            {phase === 'morning' && (
              <DawnAnnouncement
                gameView={gameView}
                onProceed={() => sendIntent('godAction', { action: 'next' })}
              />
            )}

            {/* CIRCLE SITTING ARENA: 3D Round Table Seating Mode */}
            {gameView.settings?.circleSitting &&
              phase !== 'lobby' &&
              phase !== 'roleReveal' &&
              phase !== 'morning' &&
              phase !== 'gameOver' && (
                <CircleSittingArena
                  gameView={gameView}
                  onNightAction={(targetId) => sendIntent('nightAction', { targetId })}
                  onConfirmNightAction={(targetId) => sendIntent('confirmNightAction', { targetId })}
                  onVote={(targetId) => sendIntent('vote', { targetId })}
                  onReadyToVote={() => sendIntent('readyToVote')}
                  onSendChat={(channel, text) => sendChat(channel, text)}
                  onOpenHelp={handleOpenHelp}
                  onSetSuspicion={setSuspicion}
                  onClearSuspicion={clearSuspicion}
                  onSendReaction={sendReaction}
                />
              )}

            {/* STANDARD MODE: Night & Day separate views */}
            {!gameView.settings?.circleSitting && phase === 'night' && (
              <Night
                gameView={gameView}
                onNightAction={(targetId) => sendIntent('nightAction', { targetId })}
                onConfirmNightAction={(targetId) => sendIntent('confirmNightAction', { targetId })}
                onSendChat={(channel, text) => sendChat(channel, text)}
                onOpenHelp={handleOpenHelp}
              />
            )}

            {!gameView.settings?.circleSitting &&
              (phase === 'discussion' || phase === 'voting' || phase === 'voteResult') && (
                <Day
                  gameView={gameView}
                  onVote={(targetId) => sendIntent('vote', { targetId })}
                  onReadyToVote={() => sendIntent('readyToVote')}
                  onSendChat={(channel, text) => sendChat(channel, text)}
                />
              )}


            {phase === 'gameOver' && (
              <End
                gameView={gameView}
                isHost={isHost}
                onRematch={() => sendIntent('rematch')}
                onLeave={handleLeaveRoom}
                onSendChat={(channel, text) => sendChat(channel, text)}
              />
            )}

            {/* Graveyard Lounge for dead players during active phases */}
            {!me?.alive && phase !== 'lobby' && phase !== 'gameOver' && (
              <End
                gameView={gameView}
                isHost={isHost}
                onRematch={() => {}}
                onLeave={handleLeaveRoom}
                onSendChat={(channel, text) => sendChat(channel, text)}
              />
            )}
          </>
        )}
      </main>

      {/* Unified Help & Role Sheet */}
      <HelpSheet
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        initialTab={helpInitialTab}
        gameView={gameView}
      />
    </div>
  );
}
