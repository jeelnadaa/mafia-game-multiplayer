'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRoom } from '@/lib/useRoom';
import { TopBar } from '@/components/TopBar';
import { Lobby } from '@/components/Lobby';
import { Night } from '@/components/Night';
import { Day } from '@/components/Day';
import { End } from '@/components/End';
import { God } from '@/components/God';
import { HelpSheet, HelpTab } from '@/components/HelpSheet';
import { Button } from '@/components/ui';
import { AlertCircle, RotateCcw, Moon } from 'lucide-react';
import { useShortcut } from '@/lib/shortcuts';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string)?.toUpperCase() || '';

  const [name, setName] = useState('Player');
  const [avatar, setAvatar] = useState(1);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpInitialTab, setHelpInitialTab] = useState<HelpTab>('basics');

  // Retrieve player profile from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('mafia-name');
      const savedAvatar = localStorage.getItem('mafia-avatar');
      if (savedName) setName(savedName);
      if (savedAvatar) setAvatar(parseInt(savedAvatar, 10));
    }
  }, []);

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
    kickPlayer,
    setGodMode,
    updateSettings,
  } = useRoom(code, name, avatar);

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

  // Connection Error Screen
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-bg text-center">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-mafia/20 text-mafia">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-heading font-bold text-text">Connection Interrupted</h2>
          <p className="text-xs text-muted leading-relaxed">{error}</p>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="secondary" onClick={() => window.location.reload()}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              <span>Retry</span>
            </Button>
            <Button variant="primary" onClick={() => router.push('/')}>
              Home
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Connecting Screen
  if (isConnecting || !gameView) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-bg text-center">
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center text-day-amber mx-auto animate-pulse">
            <Moon className="w-8 h-8 fill-current" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-semibold text-text">Connecting to Room {code}</h2>
            <p className="text-xs text-muted mt-1">Establishing direct WebRTC peer channel...</p>
          </div>
        </div>
      </main>
    );
  }

  const { phase, me } = gameView;

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      {/* Persistent Top Bar */}
      <TopBar
        gameView={gameView}
        onOpenHelp={handleOpenHelp}
        rtt={rtt}
        isReconnecting={!isConnected}
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
                onToggleGod={setGodMode}
                onUpdateSettings={updateSettings}
              />
            )}

            {(phase === 'roleReveal' || phase === 'night') && (
              <Night
                gameView={gameView}
                onNightAction={(targetId) => sendIntent('nightAction', { targetId })}
                onConfirmNightAction={(targetId) => sendIntent('confirmNightAction', { targetId })}
                onSendChat={(channel, text) => sendChat(channel, text)}
                onOpenHelp={handleOpenHelp}
              />
            )}

            {(phase === 'morning' || phase === 'discussion' || phase === 'voting' || phase === 'voteResult') && (
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
                onLeave={() => router.push('/')}
                onSendChat={(channel, text) => sendChat(channel, text)}
              />
            )}

            {/* Graveyard Lounge for dead players during active phases */}
            {!me?.alive && phase !== 'lobby' && phase !== 'gameOver' && (
              <End
                gameView={gameView}
                isHost={isHost}
                onRematch={() => {}}
                onLeave={() => router.push('/')}
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
