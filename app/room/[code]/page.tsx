'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRoom } from '@/lib/useRoom';
import { Lobby } from '@/components/Lobby';
import { Night } from '@/components/Night';
import { Day } from '@/components/Day';
import { End } from '@/components/End';
import { God } from '@/components/God';
import { HelpSheet, HelpTab } from '@/components/HelpSheet';
import { CircleSittingArena } from '@/components/CircleSittingArena';
import { RoleReveal } from '@/components/RoleReveal';
import { DawnAnnouncement } from '@/components/DawnAnnouncement';
import { VoiceOverlay } from '@/components/VoiceOverlay';
import { CasterOverlay } from '@/components/CasterOverlay';
import { Button, Avatar, Modal } from '@/components/ui';
import { AlertCircle, RotateCcw, Moon, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShortcut } from '@/lib/shortcuts';
import { clearRoomData } from '@/lib/storage';
import { playNightBell, setPhaseAmbience } from '@/lib/sfx';


export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string)?.toUpperCase() || '';
  const isValidCode = /^[A-HJ-NP-Z2-9]{5}$/i.test(code) || /^[A-Z0-9]{5}$/.test(code);

  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState<string>('');
  const [avatar, setAvatar] = useState<number>(1);
  const [hasJoined, setHasJoined] = useState<boolean>(false);

  const [helpOpen, setHelpOpen] = useState(false);
  const [helpInitialTab, setHelpInitialTab] = useState<HelpTab>('basics');

  const [backConfirmOpen, setBackConfirmOpen] = useState(false);
  const [godConsoleOpen, setGodConsoleOpen] = useState(false);

  // Synchronize profile updates and host status from localStorage on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const savedAvatar = localStorage.getItem('mafia-avatar');
      if (savedAvatar) {
        const parsed = parseInt(savedAvatar, 10);
        if (parsed >= 1 && parsed <= 12) setAvatar(parsed);
      }
      const savedName = localStorage.getItem('mafia-name');
      if (savedName) setName(savedName);

      const savedHostRaw = localStorage.getItem(`mafia-host:${code}`);
      const isHostSaved = localStorage.getItem(`mafia-is-host:${code}`) === 'true';
      const isHostParam = window.location.search.includes('host=true');
      if (Boolean(savedHostRaw) || isHostSaved || isHostParam) {
        setHasJoined(true);
      }
    }
  }, [code]);

  // Handle browser back button with custom confirmation modal
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setBackConfirmOpen(true);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleConfirmBack = () => {
    setBackConfirmOpen(false);
    handleLeaveRoom();
  };

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
    assignNarratorRoles,
    updateSettings,
    updateProfile,
    setSuspicion,
    clearSuspicion,
    sendReaction,
    leaveRoom,
    isVoiceActive,
    isVoiceMuted,
    toggleVoice,
    toggleVoiceMute,
    speakingPeers,
    speakingLevels,
  } = useRoom(code, name.trim() || 'Player', avatar, { enabled: hasJoined });

  const handleLeaveRoom = useCallback(() => {
    leaveRoom();
    router.push('/');
  }, [leaveRoom, router]);

  // Staged Screen Sequencing: Screen 1 -> Transition Screen -> Screen 2
  const [displayedPhase, setDisplayedPhase] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionNotice, setTransitionNotice] = useState<{
    title: string;
    subtitle: string;
  } | null>(null);
  const prevPhaseRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!gameView) return;
    const currentPhase = gameView.phase;
    const roundNum = gameView.round || 1;

    let htmlPhase = 'lobby';
    let themeColor = '#09090b';

    if (!currentPhase || currentPhase === 'lobby') {
      htmlPhase = 'lobby';
      themeColor = '#09090b';
      setPhaseAmbience('lobby');
    } else if (currentPhase === 'roleReveal') {
      htmlPhase = 'night';
      themeColor = '#07090e';
      setPhaseAmbience('night');
    } else if (currentPhase === 'night') {
      htmlPhase = 'night';
      themeColor = '#07090e';
      playNightBell();
      setPhaseAmbience('night');
    } else if (currentPhase === 'morning' || currentPhase === 'discussion') {
      htmlPhase = 'day';
      themeColor = '#0c0a09';
      setPhaseAmbience('day');
    } else if (currentPhase === 'voting' || currentPhase === 'voteResult') {
      htmlPhase = 'voting';
      themeColor = '#0d0707';
      setPhaseAmbience('voting');
    } else if (currentPhase === 'gameOver') {
      htmlPhase = 'gameover';
      themeColor = '#09090b';
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

    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = currentPhase;

    // Initial mount or lobby: show immediately without transition delay
    if (prevPhase === null || currentPhase === 'lobby') {
      setDisplayedPhase(currentPhase);
      setIsTransitioning(false);
      setTransitionNotice(null);
      return;
    }

    // Active match phase transition: Show Transition Screen exclusively first, THEN next screen!
    if (prevPhase !== currentPhase) {
      let title = '';
      let subtitle = '';

      if (currentPhase === 'narratorAssign') {
        title = 'TRANSITIONING TO DOSSIER ASSIGNMENT...';
        subtitle = 'NARRATOR CLASSIFIED ALLOCATION ACTIVE';
      } else if (currentPhase === 'roleReveal') {
        title = 'TRANSITIONING TO ROLE REVEAL...';
        subtitle = 'INSPECT YOUR CLASSIFIED IDENTITY';
      } else if (currentPhase === 'night') {
        title = `TRANSITIONING TO NIGHT ${roundNum}...`;
        subtitle = 'SHADOW OPERATIONS UNDERWAY · COVERT ORDERS ACTIVE';
      } else if (currentPhase === 'morning') {
        title = 'TRANSITIONING TO MORNING DISPATCH...';
        subtitle = 'DAWN HAS BROKEN · COMPILING NIGHT REPORT';
      } else if (currentPhase === 'discussion') {
        title = `TRANSITIONING TO DAY ${roundNum} DELIBERATION...`;
        subtitle = 'TOWN SQUARE CONVENES · HEAR TESTIMONIES & ACCUSATIONS';
      } else if (currentPhase === 'voting') {
        title = 'TRANSITIONING TO TOWN VOTING...';
        subtitle = 'TRIBUNAL IN SESSION · CAST SOLEMN BALLOTS';
      } else if (currentPhase === 'voteResult') {
        title = 'TRANSITIONING TO TRIBUNAL VERDICT...';
        subtitle = 'BALLOTS SEALED · FINAL JUDGMENT INCOMING';
      } else if (currentPhase === 'gameOver') {
        title = 'TRANSITIONING TO CASE SUMMARY...';
        subtitle = 'OPERATION CONCLUDED · CLASSIFIED DOSSIERS UNLOCKED';
      }

      if (title) {
        setIsTransitioning(true);
        setTransitionNotice({ title, subtitle });
        const timer = setTimeout(() => {
          setDisplayedPhase(currentPhase);
          setIsTransitioning(false);
          setTransitionNotice(null);
        }, 2600); // 2.6s generous transition time
        return () => clearTimeout(timer);
      } else {
        setDisplayedPhase(currentPhase);
      }
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
      handleOpenHelp();
    },
    { scope: 'global' }
  );

  // 'I' opens directly to My Role
  useShortcut(
    ['i', 'I'],
    () => {
      handleOpenHelp('my-role');
    },
    { scope: 'global' }
  );

  const handleOpenHelp = (tab?: HelpTab) => {
    if (tab) {
      setHelpInitialTab(tab);
    } else {
      const saved = typeof window !== 'undefined' ? (localStorage.getItem('mafia_last_help_tab') as HelpTab | null) : null;
      setHelpInitialTab(saved || 'basics');
    }
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

  // 0. Ensure SSR and initial client pass match 100% to prevent hydration mismatch
  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-transparent text-center select-none relative">
        <div
          className="absolute pointer-events-none z-0"
          style={{
            width: '420px',
            height: '420px',
            background: 'radial-gradient(circle at 50% 50%, rgba(217,164,65,0.18) 0%, transparent 70%)',
            filter: 'blur(35px)',
          }}
        />
        <div className="relative z-10 space-y-5 max-w-md w-full bg-[#101216] border-2 border-[#262A33] rounded-[8px] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(217,164,65,0.15)]">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#D9A441]/40 animate-ping" />
            <div className="w-14 h-14 rounded-full bg-[#171A20] border-2 border-[#D9A441] flex items-center justify-center text-[#D9A441] shadow-[0_0_25px_rgba(217,164,65,0.5)]">
              <Moon className="w-6 h-6 fill-current text-[#D9A441] animate-pulse" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="t text-[11px] tracking-[3px] text-[#D9A441] uppercase font-bold">
              CLASSIFIED TERMINAL INITIALIZATION
            </div>
            <h2 className="d text-3xl font-black tracking-[3px] uppercase text-[#ECE6D8]">
              Initializing Room {code}
            </h2>
            <p className="t text-xs text-[#A39D90] tracking-wider uppercase">
              Checking room availability & peer mesh...
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#171A20] border border-[#262A33] rounded-full text-[11px] font-mono text-[#A39D90]">
              <span className="w-2 h-2 rounded-full bg-[#5E8C7B] animate-ping" />
              Direct P2P WebRTC Signal Active
            </span>
          </div>
        </div>
      </main>
    );
  }

  // 1. Pre-Join Screen for Visitors (Ask for name & avatar before checking availability)
  if (!hasJoined) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-transparent select-none relative">
        <div
          className="absolute pointer-events-none z-0"
          style={{
            width: '460px',
            height: '460px',
            background: 'radial-gradient(circle at 50% 50%, rgba(217,164,65,0.18) 0%, transparent 70%)',
            filter: 'blur(35px)',
          }}
        />
        <div className="relative z-10 w-full max-w-md bg-[#101216] border-2 border-[#262A33] rounded-[8px] p-6 sm:p-8 space-y-6 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(217,164,65,0.12)] font-['Instrument_Sans']">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#262A33]">
            <div>
              <span className="t text-[11px] tracking-[2px] text-[#D9A441] uppercase font-bold block">
                DIRECT P2P MESH
              </span>
              <h1 className="d text-3xl font-black text-[#ECE6D8] tracking-[2px] uppercase">
                Join Operation
              </h1>
            </div>
            <div className="px-3 py-1.5 bg-[#171A20] border-2 border-[#D9A441] rounded-[4px] font-mono text-sm font-black tracking-widest text-[#D9A441] shadow-sm">
              #{code}
            </div>
          </div>

          {/* Avatar Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#A39D90] uppercase tracking-wider font-mono">
                Select Persona Avatar
              </label>
              <span className="text-xs font-mono text-[#D9A441]">Avatar #{avatar}</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAvatar(id)}
                  className={`p-1 border rounded-[4px] transition-all flex items-center justify-center cursor-pointer ${
                    avatar === id
                      ? 'border-[#D9A441] bg-[#D9A441]/15 ring-2 ring-[#D9A441] scale-105'
                      : 'border-[#262A33] hover:border-[#D9A441]/60 bg-[#171A20]'
                  }`}
                >
                  <Avatar avatarId={id} size={36} className="border-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Name Input Form */}
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-500/60 text-red-200 text-xs flex items-center gap-2 rounded">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#A39D90] uppercase tracking-wider font-mono">
                Operative Codename
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Detective Vance"
                maxLength={20}
                autoFocus
                className="w-full bg-[#171A20] border border-[#262A33] rounded-[4px] px-4 py-3 text-sm text-[#ECE6D8] placeholder-[#A39D90]/50 focus:outline-none focus:border-[#D9A441] focus:bg-[#101216] transition-colors font-sans"
              />
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="submit"
                className="w-full h-12 bg-[#D9A441] hover:bg-[#FFEA00] text-[#0A0B0E] font-bold text-base tracking-wider uppercase rounded-[4px] transition-all shadow-[0_0_20px_rgba(217,164,65,0.4)] cursor-pointer"
              >
                Join Room
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full py-2 text-xs font-mono text-[#A39D90] hover:text-[#ECE6D8] transition-colors cursor-pointer"
              >
                Return to Headquarters
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // 2. Connection Error Screen
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-transparent text-center select-none relative">
        <div className="max-w-md w-full bg-[#101216] border-2 border-[#B3363B]/60 rounded-[8px] p-7 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(179,54,59,0.2)] font-['Instrument_Sans']">
          <div className="inline-flex items-center justify-center p-3 border border-[#B3363B] bg-[#170D0E] text-[#B3363B] rounded-full shadow-md">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="d text-3xl font-black uppercase tracking-[2px] text-[#ECE6D8]">
              Room Unavailable
            </h2>
            <p className="text-xs font-mono text-[#fca5a5] leading-relaxed">{error}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-3">
            <Button variant="secondary" onClick={() => setHasJoined(false)}>
              <span>Change Codename</span>
            </Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              <span>Retry</span>
            </Button>
            <Button variant="primary" onClick={() => router.push('/')}>
              <span>Return Home</span>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // 3. Connecting / Verifying Room Availability Screen
  if (isConnecting || !gameView) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-transparent text-center select-none relative">
        <div
          className="absolute pointer-events-none z-0"
          style={{
            width: '440px',
            height: '440px',
            background: 'radial-gradient(circle at 50% 50%, rgba(217,164,65,0.18) 0%, transparent 70%)',
            filter: 'blur(35px)',
          }}
        />
        <div className="relative z-10 space-y-5 max-w-sm w-full bg-[#101216] border-2 border-[#262A33] rounded-[8px] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(217,164,65,0.15)]">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#D9A441]/40 animate-ping" />
            <div className="w-14 h-14 rounded-full bg-[#171A20] border-2 border-[#D9A441] flex items-center justify-center text-[#D9A441] shadow-[0_0_25px_rgba(217,164,65,0.5)]">
              <Moon className="w-6 h-6 fill-current text-[#D9A441] animate-pulse" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="t text-[11px] tracking-[3px] text-[#D9A441] uppercase font-bold">
              ESTABLISHING MESH LINK
            </div>
            <h2 className="d text-3xl font-black tracking-[3px] uppercase text-[#ECE6D8]">
              Connecting to Room {code}
            </h2>
            <p className="t text-xs text-[#A39D90] tracking-wider uppercase">
              Checking room availability & host status...
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setHasJoined(false)}
              className="text-xs font-mono text-[#A39D90] hover:text-[#ECE6D8] underline transition-colors cursor-pointer"
            >
              Cancel Connection
            </button>
          </div>
        </div>
      </main>
    );
  }

  const { me } = gameView;
  const currentMatchPhase = isTransitioning ? 'transition' : (displayedPhase || gameView.phase);
  const isMatchEnded = currentMatchPhase === 'gameOver';

  return (
    <div className="min-h-screen flex flex-col text-text bg-transparent relative">
      {/* Subtle Atmospheric Light Cone Overlay */}
      <div className="phase-atmosphere-overlay" aria-hidden="true" />

      {/* Discord-style Gaming Voice Overlay on Left Side */}
      <VoiceOverlay
        gameView={gameView}
        isVoiceActive={isVoiceActive}
        isVoiceMuted={isVoiceMuted}
        onToggleVoice={toggleVoice}
        onToggleVoiceMute={toggleVoiceMute}
        speakingPeers={speakingPeers}
        speakingLevels={speakingLevels}
      />

      {/* Dedicated Streamer / God Spectator Mode Broadcast HUD Overlay */}
      <CasterOverlay gameView={gameView} />

      {/* Main Game Screen Routing with fluid staged transitions */}
      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {isTransitioning && transitionNotice ? (
            <motion.div
              key={`interstitial-${transitionNotice.title}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 min-h-[520px] flex items-center justify-center p-6 select-none relative"
            >
              {/* Warm Ambient Spotlight Glow */}
              <div
                className="absolute pointer-events-none z-0"
                style={{
                  width: 'min(640px, 92vw)',
                  height: 'min(480px, 70vh)',
                  background: 'radial-gradient(circle at 50% 50%, rgba(217,164,65,0.22) 0%, rgba(91,122,153,0.10) 45%, transparent 70%)',
                  filter: 'blur(35px)',
                }}
              />

              <div className="relative z-10 text-center px-8 sm:px-12 py-10 sm:py-14 rounded-[12px] bg-[#161A22] border-2 border-[#D9A441]/70 shadow-[0_20px_80px_rgba(0,0,0,0.85),0_0_50px_rgba(217,164,65,0.3)] max-w-lg mx-auto">
                <div className="flex items-center justify-center gap-2.5 mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#D9A441] animate-ping" />
                  <span className="t text-xs tracking-[4px] text-[#D9A441] uppercase font-bold">
                    OPERATION DISPATCH
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#D9A441] animate-ping" />
                </div>
                <h3 className="d text-3xl sm:text-5xl font-black text-[#ECE6D8] tracking-[3px] uppercase my-2">
                  {transitionNotice.title}
                </h3>
                <p className="t text-xs sm:text-sm text-[#C5BFB2] tracking-[2px] uppercase mt-2">
                  {transitionNotice.subtitle}
                </p>
                <div className="w-28 h-[2.5px] bg-gradient-to-r from-transparent via-[#D9A441] to-transparent mx-auto mt-6 animate-pulse" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={isMatchEnded ? 'game-over' : currentMatchPhase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col w-full"
            >
        {/* Match Finished Screen: Shows who won and full docket directly without sitting deck or scrolling */}
        {isMatchEnded ? (
          <End
            gameView={gameView}
            isHost={isHost}
            onRematch={() => sendIntent('rematch')}
            onLeave={handleLeaveRoom}
            onSendChat={(channel, text) => sendChat(channel, text)}
          />
        ) : (
          <>
            {/* 1. LOBBY PHASE */}
            {currentMatchPhase === 'lobby' && (
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
                onOpenHelp={handleOpenHelp}
                onSendChat={(channel, text) => sendChat(channel, text)}
                onAddBots={addBots}
                onClearBots={clearBots}
                onBack={() => setBackConfirmOpen(true)}
                isVoiceActive={isVoiceActive}
                isVoiceMuted={isVoiceMuted}
                onToggleVoice={toggleVoice}
                onToggleVoiceMute={toggleVoiceMute}
                speakingPeers={speakingPeers}
              />
            )}

            {/* 2. NARRATOR ASSIGN PHASE */}
            {currentMatchPhase === 'narratorAssign' && (
              me?.isGod ? (
                <God
                  gameView={gameView}
                  onGodAction={(action) => sendIntent('godAction', { action })}
                  onAssignRoles={assignNarratorRoles}
                />
              ) : (
                <div className="w-full max-w-lg mx-auto my-auto p-6 sm:p-8 bg-[#101216] border border-[#262A33] rounded-[8px] text-center space-y-4 shadow-2xl animate-in fade-in duration-300 font-['Instrument_Sans'] select-none">
                  <span className="t text-[11px] tracking-[3px] text-[#D9A441] uppercase font-bold px-3 py-1 bg-[#171A20] border border-[#262A33] rounded-[2px] inline-block">
                    CLASSIFIED ALLOCATION IN PROGRESS
                  </span>
                  <h2 className="d text-3xl sm:text-4xl font-black text-[#ECE6D8] tracking-[2px] uppercase">
                    Narrator is Assigning Roles
                  </h2>
                  <p className="text-xs sm:text-sm text-[#A39D90] leading-relaxed max-w-sm mx-auto">
                    The designated narrator is distributing confidential dossiers to all seated operatives. Stand by to inspect your classified assignment.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D9A441] animate-ping" />
                    <span className="text-xs font-mono text-[#D9A441]">Awaiting Sealed Orders...</span>
                  </div>
                </div>
              )
            )}

            {/* 3. ROLE REVEAL SCREEN */}
            {currentMatchPhase === 'roleReveal' && (
              me?.isGod ? (
                <God
                  gameView={gameView}
                  onGodAction={(action) => sendIntent('godAction', { action })}
                />
              ) : (
                <RoleReveal
                  gameView={gameView}
                  onConfirmReady={toggleReady}
                />
              )
            )}

            {/* 4. DAWN ANNOUNCEMENT SCREEN */}
            {currentMatchPhase === 'morning' && (
              <DawnAnnouncement
                gameView={gameView}
                onProceed={() => sendIntent('godAction', { action: 'next' })}
              />
            )}

            {/* 5. CIRCLE SITTING ARENA: Active round table for all phases (narrator and dead are spectators) */}
            {currentMatchPhase !== 'lobby' &&
              currentMatchPhase !== 'narratorAssign' &&
              currentMatchPhase !== 'roleReveal' &&
              currentMatchPhase !== 'morning' && (
                <>
                  {/* Floating Narrator Controls Toolbar for God spectator */}
                  {me?.isGod && (
                    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-[#101216]/95 border border-[#262A33] px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md font-['Instrument_Sans']">
                      <span className="text-xs font-mono font-bold text-[#D9A441] flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-[#D9A441]" />
                        <span>NARRATOR</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => sendIntent('godAction', { action: 'pause' })}
                        className="text-xs font-mono px-2.5 py-1 bg-[#171A20] hover:bg-[#262A33] text-[#ECE6D8] rounded border border-[#262A33] transition-colors cursor-pointer"
                      >
                        {gameView.paused ? 'Resume' : 'Pause'}
                      </button>
                      <button
                        type="button"
                        onClick={() => sendIntent('godAction', { action: 'extend' })}
                        className="text-xs font-mono px-2.5 py-1 bg-[#171A20] hover:bg-[#262A33] text-[#ECE6D8] rounded border border-[#262A33] transition-colors cursor-pointer"
                      >
                        +30s
                      </button>
                      <button
                        type="button"
                        onClick={() => sendIntent('godAction', { action: 'next' })}
                        className="text-xs font-mono px-3 py-1 bg-[#D9A441] hover:bg-[#FFEA00] text-[#0A0B0E] font-bold rounded transition-colors cursor-pointer"
                      >
                        Advance
                      </button>
                      <button
                        type="button"
                        onClick={() => setGodConsoleOpen(true)}
                        className="text-xs font-mono px-2.5 py-1 bg-[#171A20] hover:bg-[#262A33] text-[#A39D90] hover:text-[#ECE6D8] rounded border border-[#262A33] transition-colors cursor-pointer"
                      >
                        Matrix
                      </button>
                    </div>
                  )}

                  <CircleSittingArena
                    gameView={gameView}
                    onNightAction={(targetId, confirm) => sendIntent('nightAction', { targetId, confirm })}
                    onConfirmNightAction={(targetId) => sendIntent('confirmNightAction', { targetId })}
                    onVote={(targetId) => sendIntent('vote', { targetId })}
                    onReadyToVote={() => sendIntent('readyToVote')}
                    onSendChat={(channel, text) => sendChat(channel, text)}
                    onOpenHelp={handleOpenHelp}
                    onBack={() => setBackConfirmOpen(true)}
                    onSetSuspicion={setSuspicion}
                    onClearSuspicion={clearSuspicion}
                    onSendReaction={sendReaction}
                  />

                  {/* Narrator Omniscient Surveillance Matrix Modal */}
                  {me?.isGod && (
                    <Modal
                      isOpen={godConsoleOpen}
                      onClose={() => setGodConsoleOpen(false)}
                      title="SURVEILLANCE MATRIX"
                      subtitle="OMNISCIENT CLASSIFIED DOSSIERS"
                      maxWidth="max-w-4xl"
                    >
                      <God
                        gameView={gameView}
                        onGodAction={(action) => sendIntent('godAction', { action })}
                      />
                    </Modal>
                  )}
                </>
              )}
          </>
        )}
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Unified Help & Role Sheet */}
      <HelpSheet
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        initialTab={helpInitialTab}
        gameView={gameView}
      />

      {/* Custom Confirmation Modal on Back Operations */}
      <Modal
        isOpen={backConfirmOpen}
        onClose={() => setBackConfirmOpen(false)}
        title="EXIT ROOM"
        subtitle={`CASE #${code} · DISCONNECT`}
      >
        <div className="space-y-4 text-[#ECE6D8] font-['Instrument_Sans']">
          <div className="p-4 bg-[#171A20] border border-[#262A33] rounded-[6px] space-y-2">
            <div className="flex items-center gap-2.5 text-sm font-bold text-[#ECE6D8]">
              <span className="w-2 h-2 rounded-full bg-[#D9A441]" />
              <span>Withdraw From Current Room?</span>
            </div>
            <p className="text-xs text-[#A39D90] leading-relaxed">
              Are you sure you want to withdraw from room <strong className="text-[#D9A441] font-mono">{code}</strong>? Any active seat at the table will be vacated and you will be returned to headquarters.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#262A33]">
            <Button variant="secondary" onClick={() => setBackConfirmOpen(false)}>
              Stay at Table
            </Button>
            <Button variant="danger" onClick={handleConfirmBack}>
              Exit Room
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
