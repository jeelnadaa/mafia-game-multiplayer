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
        <div className="max-w-md w-full bg-surface border border-border rounded-none p-6 space-y-4">
          <div className="inline-flex items-center justify-center p-3 border border-border bg-surface-2 text-white">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-text">
            CONNECTION INTERRUPTED
          </h2>
          <p className="text-xs font-mono text-muted leading-relaxed">{error}</p>
          <div className="flex justify-center gap-3 pt-2">
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

  // Connecting Screen
  if (isConnecting || !gameView) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-bg text-center">
        <div className="space-y-4 max-w-sm w-full bg-surface border border-border p-8">
          <div className="w-12 h-12 border border-border bg-surface-2 flex items-center justify-center text-white mx-auto animate-pulse">
            <Moon className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-text">
              CONNECTING TO ROOM {code}
            </h2>
            <p className="text-xs font-mono text-muted mt-1">ESTABLISHING WEBRTC PEER CHANNEL...</p>
          </div>
        </div>
      </main>
    );
  }

  const { phase, me } = gameView;

  return (
    <div className="min-h-screen flex flex-col text-text bg-transparent">
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
