'use client';

import React from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { ClientGameView } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { Lobby } from '@/components/Lobby';
import { RoleReveal } from '@/components/RoleReveal';
import { CircleSittingArena } from '@/components/CircleSittingArena';
import { End } from '@/components/End';
import { HelpSheet } from '@/components/HelpSheet';
import { VoiceOverlay } from '@/components/VoiceOverlay';

// Deterministic fixed mock views matching the 8 artboards
const MOCK_PLAYERS = [
  { id: 'p1', name: 'hehee', avatar: 1, isHost: true, isGod: false, ready: true, alive: true, connected: true, color: '#B3363B' },
  { id: 'p2', name: 'Raven', avatar: 2, isHost: false, isGod: false, ready: true, alive: true, connected: true, color: '#5B7FA6' },
  { id: 'p3', name: 'Cipher', avatar: 3, isHost: false, isGod: false, ready: false, alive: true, connected: true, color: '#C9A86A' },
  { id: 'p4', name: 'Shadow', avatar: 4, isHost: false, isGod: false, ready: true, alive: true, connected: true, color: '#8C6FA0' },
  { id: 'p5', name: 'Nova', avatar: 5, isHost: false, isGod: false, ready: false, alive: true, connected: true, color: '#5E8C7B' },
  { id: 'p6', name: 'Quill', avatar: 6, isHost: false, isGod: false, ready: false, alive: true, connected: true, color: '#ECE6D8' },
];

export default function ScenePage() {
  const params = useParams();
  const name = params?.name as string;

  if (name === 'landing') {
    // Render landing mockup reproduction (1280x760 native)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0B0E] p-4">
        <div className="w-full max-w-[1280px] h-[760px] relative border border-[#262A33] overflow-hidden shadow-2xl">
          <iframe src="/" className="w-full h-full border-0" title="Landing Scene" />
        </div>
      </div>
    );
  }

  if (name === 'lobby') {
    const lobbyGameView: ClientGameView = {
      code: '55WG6',
      version: 1,
      phase: 'lobby',
      round: 0,
      phaseEndsAt: null,
      paused: false,
      settings: DEFAULT_SETTINGS,
      players: MOCK_PLAYERS.slice(0, 4), // 4 seated + 2 empty seats matching Lobby.dc.html!
      me: {
        id: 'p1',
        token: 'tok-p1',
        name: 'hehee',
        avatar: 1,
        color: '#B3363B',
        isGod: false,
        isHost: true,
        alive: true,
        isReady: true,
      },
      readyToVote: [],
      chat: [],
      log: [],
      serverNow: Date.now(),
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050608] p-4">
        <div className="w-full max-w-[1280px] h-[760px] relative border border-[#262A33] overflow-hidden shadow-2xl">
          <Lobby
            gameView={lobbyGameView}
            isHost={true}
            onStart={() => {}}
            onToggleReady={() => {}}
            onKick={() => {}}
            onToggleGod={() => {}}
            onUpdateSettings={() => {}}
          />
        </div>
      </div>
    );
  }

  if (name === 'reveal') {
    const revealGameView: ClientGameView = {
      code: '55WG6',
      version: 2,
      phase: 'roleReveal',
      round: 1,
      phaseEndsAt: Date.now() + 15000,
      paused: false,
      settings: DEFAULT_SETTINGS,
      players: MOCK_PLAYERS,
      me: {
        id: 'p1',
        token: 'tok-p1',
        name: 'hehee',
        avatar: 1,
        role: 'mafia',
        isGod: false,
        isHost: true,
        alive: true,
        teammates: ['p3'],
        isReady: false,
      },
      readyToVote: [],
      chat: [],
      log: [],
      serverNow: Date.now(),
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050608] p-4">
        {/* Mobile native size: 390x844 */}
        <div className="w-[390px] h-[844px] relative border border-[#262A33] overflow-hidden shadow-2xl rounded-[12px]">
          <RoleReveal gameView={revealGameView} onConfirmReady={() => {}} />
        </div>
      </div>
    );
  }

  if (name === 'night') {
    // Night 2 table matching Night.dc.html
    return (
      <div className="b relative w-[1280px] h-[760px] mx-auto overflow-hidden bg-[#0A0D12] text-[#ECE6D8] border border-[#262A33] shadow-2xl" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 45%, #13202e, #0A0D12 75%)' }}>
        <div style={{ position: 'absolute', left: 440, top: 230, width: 400, height: 300, background: 'radial-gradient(circle, rgba(217,164,65,.2), transparent 65%)' }} />
        <div style={{ position: 'absolute', left: 250, top: 290, width: 780, height: 300, borderRadius: '50%', border: '5px solid #3a3326', background: 'radial-gradient(ellipse at 50% 30%, #14201c, #080c0b 75%)' }} />
        
        {/* Dashed Target Line to Nova */}
        <svg width="1280" height="760" style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden="true">
          <line x1="640" y1="540" x2="840" y2="350" stroke="#D9A441" strokeWidth="2" strokeDasharray="4 7" />
        </svg>

        {/* Top HUD */}
        <div style={{ position: 'absolute', left: 40, right: 40, top: 28, height: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="hb" aria-label="Back">‹</button>
            <button className="hb" aria-label="Menu">≡</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#262A33" strokeWidth="3" />
              <circle cx="20" cy="20" r="16" fill="none" stroke="#5B7A99" strokeWidth="3" strokeDasharray="62 100" transform="rotate(-90 20 20)" />
            </svg>
            <div className="d" style={{ fontSize: 46, fontWeight: 800, letterSpacing: 4 }}>NIGHT · 2</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', border: '1px solid #262A33', borderRadius: 999, fontSize: 16 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#B3363B' }} />
            Mafia
          </div>
        </div>

        {/* Narrator line */}
        <div className="t" style={{ position: 'absolute', left: 0, right: 0, top: 112, textAlign: 'center', fontSize: 21, color: '#A39D90' }}>
          The town goes to sleep.
        </div>

        {/* Seated figures */}
        <div className="fg" style={{ left: 640, top: 575, ['--c' as any]: '#B3363B' }}><div className="hd" /><div className="bd" /><span className="nm">hehee (You)</span></div>
        <div className="fg" style={{ left: 350, top: 505, ['--c' as any]: '#5B7FA6' }}><div className="hd" /><div className="bd" /><span className="nm">Raven</span></div>
        <div className="fg" style={{ left: 445, top: 360, ['--c' as any]: '#C9A86A' }}><div className="hd" /><div className="bd" /><span className="nm">Cipher <i style={{ color: '#B3363B' }}>●</i></span></div>
        <div className="fg" style={{ left: 640, top: 318, ['--c' as any]: '#8C6FA0' }}><div className="hd" /><div className="bd" /><span className="nm">Shadow</span></div>
        <div className="fg" style={{ left: 840, top: 370, ['--c' as any]: '#5E8C7B' }}>
          <div style={{ position: 'absolute', left: 5, top: -10, width: 80, height: 104, border: '2px solid #D9A441', borderRadius: '50%' }} />
          <div className="hd" /><div className="bd" /><span className="nm" style={{ border: '1px solid #D9A441' }}>Nova · target</span>
        </div>
        <div className="fg" style={{ left: 930, top: 505, ['--c' as any]: '#ECE6D8' }}><div className="hd" /><div className="bd" /><span className="nm">Quill</span></div>

        {/* Bottom Bar */}
        <div style={{ position: 'absolute', left: 40, right: 40, bottom: 28, height: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, width: 260 }}>
            <button className="ob" style={{ height: 48, background: '#101216', borderColor: '#262A33' }}>
              Syndicate chat <span style={{ color: '#B3363B' }}>●</span>
            </button>
            <button aria-label="Microphone muted" style={{ width: 48, height: 48, background: '#101216', border: '1px solid #262A33', color: '#A39D90', borderRadius: '50%', fontSize: 18 }}>⌀</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <div style={{ fontSize: 21 }}>Choose who to eliminate</div>
            <button style={{ height: 54, padding: '0 30px', background: '#D9A441', color: '#0A0B0E', border: 0, borderRadius: 4, fontSize: 17, fontWeight: 600 }}>Confirm · Nova</button>
          </div>
          <div style={{ width: 260, display: 'flex', justifyContent: 'flex-end', gap: 7, alignItems: 'center', fontSize: 14, color: '#A39D90' }}>
            6 alive
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#D9A441' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (name === 'vote') {
    // Vote Day 2 matching Vote.dc.html
    return (
      <div className="b relative w-[1280px] h-[760px] mx-auto overflow-hidden bg-[#0C0A08] text-[#ECE6D8] border border-[#262A33] shadow-2xl" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 45%, #1d1710, #0C0A08 78%)' }}>
        {/* Spotlight Polygon Cone onto Cipher */}
        <div style={{ position: 'absolute', left: 290, top: 0, width: 310, height: 420, background: 'linear-gradient(rgba(240,215,154,.34), rgba(240,215,154,.02))', clipPath: 'polygon(45% 0, 55% 0, 100% 100%, 0 100%)' }} />
        <div style={{ position: 'absolute', left: 250, top: 290, width: 780, height: 300, borderRadius: '50%', border: '5px solid #4a3d22', background: 'radial-gradient(ellipse at 50% 30%, #14201c, #080c0b 75%)' }} />

        {/* Top HUD */}
        <div style={{ position: 'absolute', left: 40, right: 40, top: 28, height: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10 }}><button className="hb" aria-label="Back">‹</button><button className="hb" aria-label="Menu">≡</button></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#262A33" strokeWidth="3" />
              <circle cx="20" cy="20" r="16" fill="none" stroke="#D9A441" strokeWidth="3" strokeDasharray="40 100" transform="rotate(-90 20 20)" />
            </svg>
            <div className="d" style={{ fontSize: 46, fontWeight: 800, letterSpacing: 4 }}>VOTE · DAY 2</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', border: '1px solid #262A33', borderRadius: 999, fontSize: 16 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#B3363B' }} />
            Mafia
          </div>
        </div>

        {/* Narrator line */}
        <div className="t" style={{ position: 'absolute', left: 0, right: 0, top: 112, textAlign: 'center', fontSize: 21, color: '#ECE6D8' }}>
          Raven was found dead. The town must decide.
        </div>

        {/* Fallen Player */}
        <div className="fg" style={{ left: 350, top: 505, ['--c' as any]: '#5B7FA6', opacity: 0.45, transform: 'translate(-50%, -50%) rotate(78deg)' }}><div className="hd" /><div className="bd" /></div>
        <div className="t" style={{ position: 'absolute', left: 290, top: 520, border: '2px solid #B3363B', color: '#B3363B', padding: '2px 8px', fontSize: 13, transform: 'rotate(-6deg)' }}>ELIMINATED · N2</div>

        {/* Accused Player with Ring & Tokens */}
        <div className="fg" style={{ left: 445, top: 360, ['--c' as any]: '#C9A86A' }}>
          <div style={{ position: 'absolute', left: 3, top: -12, width: 84, height: 108, border: '2px solid #F0D79A', borderRadius: '50%' }} />
          <div className="hd" /><div className="bd" /><span className="nm" style={{ border: '1px solid #F0D79A' }}>Cipher</span>
        </div>
        <div style={{ position: 'absolute', left: 505, top: 300, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#D9A441', border: '3px solid #8C6FA0', boxSizing: 'border-box' }} />
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#D9A441', border: '3px solid #5E8C7B', boxSizing: 'border-box' }} />
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#D9A441', border: '3px solid #B3363B', boxSizing: 'border-box' }} />
        </div>
        <div className="d" style={{ position: 'absolute', left: 540, top: 290, fontSize: 64, fontWeight: 900, color: '#F0D79A', lineHeight: 1 }}>3</div>

        {/* Other living players */}
        <div className="fg" style={{ left: 640, top: 318, ['--c' as any]: '#8C6FA0', opacity: 0.6 }}><div className="hd" /><div className="bd" /><span className="nm">Shadow</span></div>
        <div className="fg" style={{ left: 840, top: 370, ['--c' as any]: '#5E8C7B', opacity: 0.6 }}><div className="hd" /><div className="bd" /><span className="nm">Nova</span></div>
        <div className="fg" style={{ left: 930, top: 505, ['--c' as any]: '#ECE6D8', opacity: 0.6 }}><div className="hd" /><div className="bd" /><span className="nm">Quill</span></div>
        <div className="fg" style={{ left: 640, top: 575, ['--c' as any]: '#B3363B' }}><div className="hd" /><div className="bd" /><span className="nm">hehee (You)</span></div>

        {/* Bottom Bar */}
        <div style={{ position: 'absolute', left: 40, right: 40, bottom: 28, height: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, width: 260 }}>
            <button className="ob" style={{ height: 48, background: '#101216', borderColor: '#262A33' }}>Town chat <span style={{ color: '#D9A441' }}>●</span></button>
            <button aria-label="Microphone live" style={{ width: 48, height: 48, background: '#101216', border: '2px solid #D9A441', color: '#D9A441', borderRadius: '50%', fontSize: 17 }}>●</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ fontSize: 20 }}>Your vote: <b style={{ color: '#F0D79A' }}>Cipher</b></div>
            <button className="ob" style={{ height: 52 }}>Change vote</button>
            <button className="text-[#A39D90] text-[16px] underline">Abstain</button>
          </div>
          <div style={{ width: 260, textAlign: 'right', fontSize: 14, color: '#A39D90' }}>5 alive · 1 fallen · open ballot</div>
        </div>
      </div>
    );
  }

  if (name === 'rulebook') {
    const rulebookGameView: ClientGameView = {
      code: '55WG6',
      version: 2,
      phase: 'night',
      round: 1,
      phaseEndsAt: Date.now() + 34000,
      paused: false,
      settings: DEFAULT_SETTINGS,
      players: MOCK_PLAYERS,
      me: {
        id: 'p1',
        token: 'tok-p1',
        name: 'hehee',
        avatar: 1,
        role: 'mafia',
        isGod: false,
        isHost: true,
        alive: true,
        teammates: ['p3'],
        isReady: true,
      },
      readyToVote: [],
      chat: [],
      log: [],
      serverNow: Date.now(),
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050608] p-4">
        <div className="w-full max-w-[1280px] h-[760px] relative border border-[#262A33] overflow-hidden shadow-2xl">
          <HelpSheet isOpen={true} onClose={() => {}} initialTab="my-role" gameView={rulebookGameView} />
        </div>
      </div>
    );
  }

  if (name === 'sound') {
    const soundGameView: ClientGameView = {
      code: '55WG6',
      version: 1,
      phase: 'lobby',
      round: 0,
      phaseEndsAt: null,
      paused: false,
      settings: DEFAULT_SETTINGS,
      players: MOCK_PLAYERS,
      me: {
        id: 'p1',
        token: 'tok-p1',
        name: 'hehee',
        avatar: 1,
        isGod: false,
        isHost: true,
        alive: true,
        isReady: true,
      },
      readyToVote: [],
      chat: [],
      log: [],
      serverNow: Date.now(),
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050608] p-4">
        <div className="w-[390px] h-[844px] relative border border-[#262A33] overflow-hidden shadow-2xl rounded-[12px] bg-[#0A0B0E]">
          <VoiceOverlay
            gameView={soundGameView}
            isVoiceActive={true}
            isVoiceMuted={false}
            onToggleVoice={() => {}}
            onToggleVoiceMute={() => {}}
            speakingPeers={{ p1: true }}
          />
        </div>
      </div>
    );
  }

  if (name === 'gameover') {
    const endPlayers = [
      { id: 'p1', name: 'hehee', avatar: 1, role: 'mafia' as any, isHost: true, isGod: false, ready: true, alive: true, connected: true, color: '#ECE6D8' },
      { id: 'p2', name: 'Raven', avatar: 2, role: 'civilian' as any, isHost: false, isGod: false, ready: true, alive: true, connected: true, color: '#5B7FA6' },
      { id: 'p3', name: 'Cipher', avatar: 3, role: 'doctor' as any, isHost: false, isGod: false, ready: true, alive: false, diedInRound: 2, connected: true, color: '#C9A86A' },
      { id: 'p4', name: 'Shadow', avatar: 4, role: 'police' as any, isHost: false, isGod: false, ready: true, alive: false, diedInRound: 1, connected: true, color: '#8C6FA0' },
    ];

    const endView: ClientGameView = {
      code: '55WG6',
      version: 5,
      phase: 'gameOver',
      round: 2,
      phaseEndsAt: null,
      paused: false,
      settings: DEFAULT_SETTINGS,
      players: endPlayers,
      winner: 'mafia',
      me: {
        id: 'p1',
        token: 'tok-p1',
        name: 'hehee',
        avatar: 1,
        role: 'mafia',
        isGod: false,
        isHost: true,
        alive: true,
        isReady: true,
      },
      readyToVote: [],
      chat: [],
      log: [
        { id: '1', round: 1, phase: 'night', text: 'Shadow was eliminated in Night 1.', timestamp: Date.now() - 60000, type: 'death' },
        { id: '2', round: 2, phase: 'night', text: 'Cipher was eliminated in Night 2.', timestamp: Date.now() - 30000, type: 'death' },
      ],
      serverNow: Date.now(),
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050608] p-4">
        <div className="w-full max-w-[1280px] h-[760px] relative border border-[#262A33] overflow-hidden shadow-2xl">
          <End
            gameView={endView}
            isHost={true}
            onRematch={() => {}}
            onLeave={() => {}}
            onSendChat={() => {}}
          />
        </div>
      </div>
    );
  }

  return notFound();
}
