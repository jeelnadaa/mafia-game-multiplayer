'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HelpSheet } from '@/components/HelpSheet';
import { generateRoomCode } from '@/lib/net';
import { useShortcut } from '@/lib/shortcuts';
import { cleanExpiredGameData } from '@/lib/storage';
import {
  initSound,
  toggleMute,
  getIsMuted,
  getAmbienceVolume,
  setAmbienceVolume,
  getSfxVolume,
  setSfxVolume,
  setPhaseAmbience,
  playUiTick,
} from '@/lib/sfx';
import { Volume2, VolumeX, Sliders, X } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(3);
  const [joinCode, setJoinCode] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [ambienceVol, setAmbienceVol] = useState(40);
  const [sfxVol, setSfxVol] = useState(80);

  // Restore saved player profile, clean expired data & initialize atmospheric audio
  useEffect(() => {
    initSound();
    setPhaseAmbience('lobby');
    setIsSoundMuted(getIsMuted());
    setAmbienceVol(Math.round(getAmbienceVolume() * 100));
    setSfxVol(Math.round(getSfxVolume() * 100));

    if (typeof window !== 'undefined') {
      cleanExpiredGameData();
      const savedName = localStorage.getItem('mafia-name');
      const savedAvatar = localStorage.getItem('mafia-avatar');
      if (savedName) setName(savedName);
      if (savedAvatar) setAvatar(parseInt(savedAvatar, 10));
    }
  }, []);

  const handleToggleMute = () => {
    const unmuted = toggleMute();
    setIsSoundMuted(!unmuted);
  };

  const handleAmbienceChange = (val: number) => {
    setAmbienceVol(val);
    setAmbienceVolume(val / 100);
  };

  const handleSfxChange = (val: number) => {
    setSfxVol(val);
    setSfxVolume(val / 100);
  };

  const saveProfile = (newName: string, newAvatar: number) => {
    setName(newName);
    setAvatar(newAvatar);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mafia-name', newName);
      localStorage.setItem('mafia-avatar', String(newAvatar));
    }
  };

  useShortcut(['?', 'h', 'H'], () => setHelpOpen((prev) => !prev), { scope: 'screen' });

  const handleCreateGame = () => {
    const finalName = name.trim() || 'hehee';
    saveProfile(finalName, avatar);
    const code = generateRoomCode();
    if (typeof window !== 'undefined') {
      localStorage.setItem(`mafia-is-host:${code}`, 'true');
    }
    router.push(`/room/${code}?host=true`);
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) return;
    const finalName = name.trim() || 'hehee';
    saveProfile(finalName, avatar);
    router.push(`/room/${cleanCode}`);
  };

  const pinColors = [
    '#B3363B',
    '#5B7FA6',
    '#ECE6D8',
    '#C9A86A',
    '#8C6FA0',
    '#5E8C7B',
    '#D9A441',
    '#7A5C86',
    '#4A7C59',
    '#A85B32',
    '#3E5A78',
    '#9C8D72',
  ];

  return (
    <div className="b relative w-full min-h-screen lg:h-[760px] overflow-x-hidden lg:overflow-hidden bg-[#0A0B0E] text-[#ECE6D8] selection:bg-[#D9A441] selection:text-[#0A0B0E]">
      {/* ------------------------------------------------------------- */}
      {/* AMBIENT LIGHTING, LAMP & TABLE ASSEMBLY (Perfect Alignment)   */}
      {/* ------------------------------------------------------------- */}
      <div className="pointer-events-none absolute inset-0 max-w-[1280px] mx-auto overflow-hidden">
        {/* Amber Light Pool - Centered on Lamp Axis (x = 990px) */}
        <div
          className="absolute -translate-x-1/2 top-0 w-[700px] h-[760px]"
          style={{
            left: '990px',
            background: 'radial-gradient(ellipse 60% 75% at 50% 0%, rgba(217,164,65,.28), transparent 70%)',
          }}
          aria-hidden="true"
        />

        {/* Hanging Brass Pendant Lamp Cord (Centered at x = 990px) */}
        <div
          className="hidden lg:block absolute -translate-x-1/2 top-0 w-[2px] h-[118px] bg-[#2a2d35]"
          style={{ left: '990px' }}
          aria-hidden="true"
        />
        {/* Lamp Shade (Centered at x = 990px, width 80px) */}
        <div
          className="hidden lg:block absolute -translate-x-1/2 top-[118px] w-[80px] h-[38px] bg-[#D9A441]"
          style={{
            left: '990px',
            clipPath: 'polygon(22% 0, 78% 0, 100% 100%, 0 100%)',
          }}
          aria-hidden="true"
        />

        {/* Billiard Felt Table (Directly under the lamp, centered at x = 990px, width 520px) */}
        <div
          className="hidden lg:block absolute -translate-x-1/2 top-[500px] w-[520px] h-[210px] rounded-[50%] border-[6px] border-[#6b5426]"
          style={{
            left: '990px',
            background: 'radial-gradient(ellipse at 50% 25%, #1d2c26, #0b1210 72%)',
          }}
          aria-hidden="true"
        />
        {/* Two paper playing cards on table */}
        <div
          className="hidden lg:block absolute top-[560px] w-[46px] h-[64px] rounded-[4px] bg-[#ECE6D8] -rotate-12 shadow-[0_6px_14px_rgba(0,0,0,.5)] border border-[#b9b2a2]"
          style={{ left: '955px' }}
          aria-hidden="true"
        />
        <div
          className="hidden lg:block absolute top-[566px] w-[46px] h-[64px] rounded-[4px] bg-[#ECE6D8] rotate-[8deg] shadow-[0_6px_14px_rgba(0,0,0,.5)] border border-[#b9b2a2]"
          style={{ left: '1005px' }}
          aria-hidden="true"
        />
      </div>

      {/* Top Right Navigation & Audio Dock */}
      <div className="absolute right-6 lg:right-[56px] top-6 lg:top-[40px] flex items-center gap-3 z-20">
        {/* Quick Audio Mute Toggle Button */}
        <button
          type="button"
          onClick={handleToggleMute}
          title={isSoundMuted ? 'Unmute atmospheric audio' : 'Mute atmospheric audio'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border text-xs font-mono uppercase tracking-wider transition-all duration-150 ${
            isSoundMuted
              ? 'bg-[#B3363B]/20 border-[#B3363B] text-[#fca5a5] hover:bg-[#B3363B]/30'
              : 'bg-[#101216]/80 border-[#262A33] text-[#D9A441] hover:border-[#D9A441] hover:text-[#F0D79A]'
          }`}
        >
          {isSoundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 animate-pulse" />}
          <span className="hidden sm:inline">{isSoundMuted ? 'Muted' : 'Sound On'}</span>
        </button>

        {/* Audio Console Settings Button */}
        <button
          type="button"
          onClick={() => setAudioModalOpen(true)}
          title="Audio & Ambience Settings"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-[#262A33] bg-[#101216]/80 text-[#ECE6D8] hover:border-[#D9A441] hover:text-[#D9A441] text-xs font-mono uppercase tracking-wider transition-all duration-150 cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-[#A39D90]" />
          <span className="hidden sm:inline">Settings</span>
        </button>

        {/* How to Play Link */}
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="t text-[#A39D90] hover:text-[#D9A441] text-[15px] transition-colors pl-2"
        >
          How to play&nbsp;&nbsp;[H]
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LEFT COLUMN: HERO HEADLINE & CASE SETUP                       */}
      {/* ------------------------------------------------------------- */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 py-12 lg:py-0 lg:px-0 h-full flex flex-col justify-center">
        <div className="lg:absolute lg:left-[96px] lg:top-[78px] space-y-2">
          <div className="t text-[14px] lg:text-[15px] tracking-[3px] text-[#D9A441] uppercase">
            A GAME OF LIES · 4–20 PLAYERS
          </div>

          {/* Custom MAFIA Wordmark with Slit Line */}
          <div className="relative inline-block my-1 lg:my-0">
            <h1
              className="d text-[110px] sm:text-[160px] lg:text-[230px] font-[900] leading-[0.85] tracking-[6px] text-[#ECE6D8] select-none"
              style={{ margin: 0 }}
            >
              MAFIA
            </h1>
            {/* Cut-through slit line aligned across wordmark */}
            <div
              className="absolute left-0 top-[52%] w-full h-[3px] bg-[#D9A441] opacity-90 pointer-events-none"
              aria-hidden="true"
            />
          </div>

          <div className="text-[22px] sm:text-[26px] lg:text-[30px] font-[500] text-[#ECE6D8] pt-2">
            Lies, alibis, and one very long night.
          </div>
          <div className="text-[15px] lg:text-[18px] text-[#A39D90]">
            Play with friends in your browser. No signup.
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* PLAYER DOSSIER IDENTITY CONSOLE (Matches Examples/Landing)  */}
        {/* ----------------------------------------------------------- */}
        <div
          className="mt-8 lg:mt-0 lg:absolute lg:left-[96px] lg:top-[410px] w-full max-w-[520px] p-[24px] lg:p-[26px] bg-[rgba(16,18,22,.88)] border border-[#262A33] rounded-[6px] shadow-2xl backdrop-blur-md"
        >
          {/* Pick a face */}
          <div className="text-[13px] text-[#A39D90] mb-[12px] font-sans">
            Pick a face
          </div>
          <div className="flex items-center gap-[12px] mb-[18px] overflow-x-auto no-scrollbar py-1">
            {Array.from({ length: 6 }, (_, i) => i + 1).map((id) => {
              const isSelected = avatar === id;
              const color = pinColors[id - 1] || '#B3363B';
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => saveProfile(name, id)}
                  style={{
                    ['--c' as string]: color,
                  }}
                  className={`w-[52px] h-[52px] rounded-full shrink-0 box-border border-2 transition-transform hover:scale-105 ${
                    isSelected
                      ? 'outline outline-2 outline-[#D9A441] outline-offset-[3px] scale-105'
                      : 'opacity-85 hover:opacity-100'
                  }`}
                  aria-label={`Select character portrait ${id}`}
                >
                  <div
                    className="w-full h-full rounded-full overflow-hidden"
                    style={{
                      borderColor: color,
                      background: `radial-gradient(circle at 50% 36%, #bdb6a6 0 19%, transparent 20%), radial-gradient(ellipse at 50% 104%, #bdb6a6 0 42%, transparent 43%), #171A20`,
                    }}
                  >
                    <img
                      src={`/assets/avatars/${id}.webp`}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Alias Input */}
          <label htmlFor="alias-input" className="block text-[13px] text-[#A39D90] mb-[6px]">
            Your alias
          </label>
          <input
            id="alias-input"
            type="text"
            value={name}
            onChange={(e) => saveProfile(e.target.value, avatar)}
            placeholder="hehee"
            maxLength={20}
            className="w-full h-[50px] bg-[#0A0B0E] border border-[#262A33] rounded-[4px] text-[#ECE6D8] text-[18px] px-[16px] mb-[14px] focus:outline-none focus:border-[#D9A441] transition-colors font-sans"
          />

          {/* Primary CTA: Create new game */}
          <button
            type="button"
            onClick={handleCreateGame}
            className="w-full h-[56px] bg-[#D9A441] hover:bg-[#F0D79A] text-[#0A0B0E] border-0 rounded-[4px] text-[18px] font-[600] cursor-pointer transition-colors shadow-lg active:scale-[0.99] font-sans"
          >
            Create new game
          </button>

          {/* Join with Room Code */}
          <form onSubmit={handleJoinGame} className="flex gap-[10px] mt-[14px]">
            <input
              aria-label="Room code"
              placeholder="ROOM CODE"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={5}
              className="flex-1 h-[48px] bg-transparent border border-[#262A33] rounded-[4px] text-[#ECE6D8] px-[16px] text-[16px] tracking-[4px] uppercase placeholder:text-[#A39D90]/50 focus:outline-none focus:border-[#D9A441] font-mono"
            />
            <button
              type="submit"
              disabled={!joinCode.trim()}
              className="w-[110px] h-[48px] bg-transparent hover:bg-white/[0.04] text-[#ECE6D8] border border-[#6b6455] hover:border-[#ECE6D8] rounded-[4px] text-[16px] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-sans"
            >
              Join
            </button>
          </form>
        </div>
      </div>

      {/* Rulebook Modal Drawer */}
      <HelpSheet isOpen={helpOpen} onClose={() => setHelpOpen(false)} initialTab="basics" />

      {/* Atmospheric Audio & Ambience Console Modal */}
      {audioModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
        >
          <div className="relative w-full max-w-md bg-[#101216] border border-[#262A33] rounded-[6px] shadow-2xl p-6 font-['Instrument_Sans']">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#262A33]">
              <div>
                <h3 className="t text-sm font-bold tracking-[2px] text-[#D9A441] uppercase">
                  ATMOSPHERIC AUDIO & AMBIENCE
                </h3>
                <p className="text-xs text-[#A39D90] mt-0.5">
                  Noir background ambience, lo-fi score & procedural sound cues
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAudioModalOpen(false)}
                className="text-[#A39D90] hover:text-[#ECE6D8] p-1 rounded transition-colors"
                aria-label="Close audio settings"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-4">
              {/* Master Mute Toggle */}
              <div className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[4px] flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-[#ECE6D8] block">Master Sound</span>
                  <span className="text-xs text-[#A39D90]">Enable or silence all synthesizer audio</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-[3px] border transition-colors ${
                    isSoundMuted
                      ? 'bg-[#B3363B]/20 text-[#fca5a5] border-[#B3363B]'
                      : 'bg-[#101216] text-[#D9A441] border-[#D9A441]'
                  }`}
                >
                  {isSoundMuted ? 'UNMUTE' : 'MUTE'}
                </button>
              </div>

              {/* Background Ambience Volume */}
              <div className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[4px] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="t text-[#A39D90] uppercase tracking-wider">Background Ambience</span>
                  <span className="t text-[#D9A441] font-mono font-bold">{ambienceVol}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={ambienceVol}
                  onChange={(e) => handleAmbienceChange(Number(e.target.value))}
                  className="w-full accent-[#D9A441] cursor-pointer h-1.5 bg-[#101216] rounded appearance-none"
                />
                <p className="text-[11px] text-[#A39D90]/70">
                  Vinyl warmth, lo-fi organ chords & suspenseful atmosphere
                </p>
              </div>

              {/* SFX Volume */}
              <div className="p-3.5 bg-[#171A20] border border-[#262A33] rounded-[4px] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="t text-[#A39D90] uppercase tracking-wider">Sound Effects (SFX)</span>
                  <span className="t text-[#D9A441] font-mono font-bold">{sfxVol}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sfxVol}
                  onChange={(e) => handleSfxChange(Number(e.target.value))}
                  className="w-full accent-[#D9A441] cursor-pointer h-1.5 bg-[#101216] rounded appearance-none"
                />
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-[#A39D90]/70">
                    Clicks, bells, chimes & gunshots
                  </p>
                  <button
                    type="button"
                    onClick={() => playUiTick()}
                    className="text-[11px] font-mono text-[#D9A441] hover:underline"
                  >
                    Test Cues
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setAudioModalOpen(false)}
                className="w-full h-11 text-sm font-semibold rounded-[3px] bg-[#171A20] border border-[#262A33] text-[#ECE6D8] hover:border-[#D9A441] hover:text-[#D9A441] transition-colors uppercase tracking-wider font-mono cursor-pointer"
              >
                CLOSE CONSOLE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
