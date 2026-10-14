'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  IconButton,
  Card,
  PaperCard,
  RubberStamp,
  RedactionBar,
  Avatar,
  TimerRing,
  PhaseTitle,
  NarratorLine,
  VoteToken,
  LampCone,
  Switch,
  Stepper,
  Kbd,
} from '@/components/ui';

export default function GalleryPage() {
  const [activeMood, setActiveMood] = useState<'lobby' | 'reveal' | 'night' | 'day' | 'vote' | 'gameOver'>('night');
  const [switchVal, setSwitchVal] = useState(true);
  const [stepperVal, setStepperVal] = useState(2);
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div
      data-phase={activeMood}
      className="b min-h-screen bg-[#0A0B0E] text-[#ECE6D8] p-6 sm:p-12 space-y-12 select-none"
    >
      {/* Gallery Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-[#262A33] gap-4">
        <div>
          <span className="t text-xs tracking-[3px] text-[#D9A441] uppercase">DEV DESIGN SYSTEM</span>
          <h1 className="d text-5xl font-extrabold tracking-wider text-[#ECE6D8] m-0">COMPONENT GALLERY</h1>
          <p className="text-sm font-sans text-[#A39D90] mt-1">
            Faithful token reproduction from approved mockups in Examples/
          </p>
        </div>

        {/* Phase Mood Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#101216] border border-[#262A33] rounded-[4px] text-xs font-mono">
          {(['lobby', 'reveal', 'night', 'day', 'vote', 'gameOver'] as const).map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => setActiveMood(mood)}
              className={`px-3 py-1.5 uppercase transition-colors rounded-[2px] ${
                activeMood === mood
                  ? 'bg-[#D9A441] text-[#0A0B0E] font-bold'
                  : 'text-[#A39D90] hover:text-[#ECE6D8]'
              }`}
            >
              {mood}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Typography Hierarchy */}
      <section className="space-y-4">
        <h2 className="t text-xs tracking-[3px] text-[#A39D90] uppercase">1. Typography Hierarchy</h2>
        <div className="p-6 bg-[#101216] border border-[#262A33] rounded-[6px] space-y-4">
          <div>
            <div className="d text-6xl font-black uppercase text-[#ECE6D8] leading-none">
              Big Shoulders Display · Wordmark & Title
            </div>
            <span className="text-xs font-mono text-[#A39D90]">font-family: &quot;Big Shoulders Display&quot;, Impact, sans-serif (800/900)</span>
          </div>

          <div>
            <div className="text-xl font-medium text-[#ECE6D8]">
              Instrument Sans · Clean Modern UI & Body Text
            </div>
            <span className="text-xs font-mono text-[#A39D90]">font-family: &quot;Instrument Sans&quot;, system-ui, sans-serif (400/500/600)</span>
          </div>

          <div>
            <div className="t text-lg text-[#D9A441] tracking-[2px]">
              Special Elite · Confidential Narrator & Typewriter Labels
            </div>
            <span className="text-xs font-mono text-[#A39D90]">font-family: &quot;Special Elite&quot;, monospace</span>
          </div>
        </div>
      </section>

      {/* 2. Buttons & Controls */}
      <section className="space-y-4">
        <h2 className="t text-xs tracking-[3px] text-[#A39D90] uppercase">2. Buttons & Semantic Controls</h2>
        <div className="p-6 bg-[#101216] border border-[#262A33] rounded-[6px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
          {/* Primary Lamp */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-[#A39D90]">Primary Lamp (.ob lamp)</span>
            <button className="h-[48px] px-6 bg-[#D9A441] hover:bg-[#F0D79A] text-[#0A0B0E] font-semibold text-sm rounded-[4px] w-full transition-colors">
              Confirm Action
            </button>
          </div>

          {/* Outline Button */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-[#A39D90]">Outline (.ob)</span>
            <button className="ob w-full flex items-center justify-center">
              Invite friends
            </button>
          </div>

          {/* 44px Icon Button (.hb) */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-[#A39D90]">44px Icon Button (.hb)</span>
            <div className="flex items-center gap-2">
              <button className="hb flex items-center justify-center" aria-label="Back">‹</button>
              <button className="hb flex items-center justify-center" aria-label="Menu">≡</button>
              <button className="hb flex items-center justify-center" aria-label="Close">×</button>
            </div>
          </div>

          {/* Disabled Button */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-[#A39D90]">Disabled with Contrast Fix</span>
            <button
              disabled
              className="h-[48px] px-6 bg-[#1a1d24] text-[#8e8878] border border-[#262A33] rounded-[4px] w-full cursor-not-allowed text-sm font-semibold"
            >
              Disabled Action
            </button>
          </div>
        </div>
      </section>

      {/* 3. Rubber Stamps & Redaction */}
      <section className="space-y-4">
        <h2 className="t text-xs tracking-[3px] text-[#A39D90] uppercase">3. Rubber Stamps & Redaction Shield</h2>
        <div className="p-6 bg-[#101216] border border-[#262A33] rounded-[6px] grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Stamps */}
          <div className="space-y-3">
            <span className="text-xs font-mono text-[#A39D90] block">Rubber Stamps</span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="t border-2 border-[#15130f] bg-[#ECE6D8] text-[#15130f] px-2.5 py-0.5 text-xs font-bold -rotate-6">
                SURVIVED
              </div>
              <div className="t border-2 border-[#7E2327] bg-[#cfc8b8] text-[#7E2327] px-2.5 py-0.5 text-xs font-bold -rotate-6">
                ELIMINATED · R2
              </div>
              <div className="t border-2 border-[#B3363B] text-[#B3363B] px-2.5 py-0.5 text-xs font-bold -rotate-6">
                CLASSIFIED
              </div>
            </div>
          </div>

          {/* Redaction Shield */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#A39D90]">DOM-Safe Redaction Shield</span>
              <button
                type="button"
                onClick={() => setIsRevealed(!isRevealed)}
                className="text-xs font-mono text-[#D9A441] underline"
              >
                {isRevealed ? 'Conceal' : 'Reveal'}
              </button>
            </div>
            <div className="p-4 bg-[#ECE6D8] text-[#15130f] rounded-[4px] space-y-2">
              <div className="t text-xs font-bold uppercase tracking-wider">SECRET DIRECTIVE</div>
              {isRevealed ? (
                <p className="text-sm font-sans leading-relaxed text-[#15130f]">
                  Strike silently during the night phase. Coordinate targets with other syndicate operatives.
                </p>
              ) : (
                <div className="space-y-1.5" aria-hidden="true">
                  <div className="h-4 w-[85%] bg-[#0A0B0E]" />
                  <div className="h-4 w-[50%] bg-[#0A0B0E]" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Pawn Figure & Table Tokens */}
      <section className="space-y-4">
        <h2 className="t text-xs tracking-[3px] text-[#A39D90] uppercase">4. Pawn Figures & Seated Operatives</h2>
        <div className="p-6 bg-[#101216] border border-[#262A33] rounded-[6px] flex flex-wrap items-center justify-around gap-8 min-h-[160px]">
          {/* Pawn: Ready */}
          <div className="relative text-center" style={{ ['--c' as any]: '#B3363B' }}>
            <div className="absolute left-[41px] -top-[16px] w-[8px] h-[8px] rounded-full bg-[#D9A441] shadow-[0_0_10px_#D9A441]" />
            <div className="hd" />
            <div className="bd" />
            <span className="nm">hehee HOST</span>
          </div>

          {/* Pawn: Target Highlight */}
          <div className="relative text-center" style={{ ['--c' as any]: '#5E8C7B' }}>
            <div className="absolute left-[5px] -top-[10px] w-[80px] h-[104px] border-2 border-[#D9A441] rounded-[50%]" />
            <div className="hd" />
            <div className="bd" />
            <span className="nm border border-[#D9A441]">Nova · target</span>
          </div>

          {/* Pawn: Accused with Spotlight & Vote Tokens */}
          <div className="relative text-center" style={{ ['--c' as any]: '#C9A86A' }}>
            <div className="absolute left-[3px] -top-[12px] w-[84px] h-[108px] border-2 border-[#F0D79A] rounded-[50%]" />
            <div className="hd" />
            <div className="bd" />
            <span className="nm border border-[#F0D79A]">Cipher</span>
          </div>

          {/* Pawn: Fallen Player */}
          <div className="relative text-center opacity-50 transform rotate-[78deg]" style={{ ['--c' as any]: '#5B7FA6' }}>
            <div className="hd" />
            <div className="bd" />
          </div>

          {/* Empty Seat Silhouette */}
          <div className="text-center opacity-50">
            <div className="w-[54px] h-[76px] mx-auto border-2 border-dashed border-[#3a3a3a] rounded-[50%]" />
            <span className="nm text-[#8e8878]">Empty seat</span>
          </div>
        </div>
      </section>

      {/* 5. Navigation Links to Deterministic Scenes */}
      <section className="space-y-4 pt-4 border-t border-[#262A33]">
        <h2 className="t text-xs tracking-[3px] text-[#D9A441] uppercase">5. Deterministic Scene Fixtures (/dev/scenes)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          {[
            { id: 'landing', label: 'Landing' },
            { id: 'lobby', label: 'Lobby ("Back Room")' },
            { id: 'reveal', label: 'Role Reveal' },
            { id: 'night', label: 'Night Table' },
            { id: 'vote', label: 'Day Vote ("The Accusation")' },
            { id: 'rulebook', label: 'Rulebook' },
            { id: 'sound', label: 'Voice & Sound' },
            { id: 'gameover', label: 'Game Over ("Case Closed")' },
          ].map((s) => (
            <Link
              key={s.id}
              href={`/dev/scenes/${s.id}`}
              className="p-3 bg-[#171A20] hover:bg-[#1f232b] border border-[#262A33] hover:border-[#D9A441] transition-colors rounded-[4px] text-center"
            >
              {s.label} →
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
