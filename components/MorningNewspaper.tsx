'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientGameView } from '@/lib/types';
import { ROLES } from '@/lib/content';
import { Avatar, RubberStamp } from './ui';
import { playNewspaperUnfold, playEliminationKnell } from '@/lib/sfx';
import { Newspaper, Shield, Skull, AlertCircle, CheckCircle2, ChevronRight, Eye } from 'lucide-react';

interface MorningNewspaperProps {
  gameView: ClientGameView;
  onProceed?: () => void;
  className?: string;
}

export function MorningNewspaper({ gameView, onProceed, className = '' }: MorningNewspaperProps) {
  const { round, settings, log = [], players = [] } = gameView;

  // Filter morning logs
  const morningLogs = log.filter((l) => l.round === round && l.phase === 'morning');
  const isSyndicateDiscord = morningLogs.some(
    (l) =>
      l.text.toLowerCase().includes('syndicate discord') ||
      l.text.toLowerCase().includes('failed to reach unanimous') ||
      l.text.toLowerCase().includes('failed to reach agreement')
  );
  const saveLogs = morningLogs.filter((l) => l.type === 'save' && !isSyndicateDiscord);
  const casualties = players.filter((p) => !p.alive && p.diedInRound === round && p.diedBy !== 'vote');

  const [paperRead, setPaperRead] = useState(false);

  useEffect(() => {
    playNewspaperUnfold();
    if (casualties.length > 0) {
      const knellTimer = setTimeout(() => {
        playEliminationKnell();
      }, 900);
      return () => clearTimeout(knellTimer);
    }
  }, [round, casualties.length]);

  // Lead banner headline and narrative copy
  let bannerHeadline = 'QUIET OVER THE CITY: NO CASUALTIES AT SUNRISE';
  let bannerSubhead = 'Night patrols report tranquil thoroughfares; town tribunal reconvenes this afternoon.';
  let leadStory =
    'The morning fog rolled off the Hudson river to reveal calm streets across all four precincts. While citizens slept behind locked doors, no acts of violence were reported before the dawn whistles sounded.';

  if (casualties.length > 0) {
    const primaryVictim = casualties[0];
    if (casualties.length === 1) {
      bannerHeadline = `${primaryVictim.name.toUpperCase()} FOUND SLAIN IN MIDNIGHT BLOODSHED!`;
      bannerSubhead = primaryVictim.diedBy === 'vigilante'
        ? 'Marksman bullet claims life in waterfront alleyway; Police Blotter reports lone gunshot.'
        : 'Underworld syndicate strikes under cover of darkness; City in state of heightened alert.';
      leadStory = `A grim discovery broke the morning silence today as the body of ${primaryVictim.name} was found by early milkmen near the warehouse district. Detectives on the scene confirmed the operative succumbed during the early hours of darkness. The commissioner has ordered an immediate tribunal to expose the conspirators.`;
    } else {
      bannerHeadline = `MULTIPLE CASUALTIES IN DEADLY MIDNIGHT CROSSFIRE!`;
      bannerSubhead = `${casualties.length} operatives confirmed fallen as underworld war erupts in the metropolis.`;
      leadStory = `A catastrophic night of violence has shaken the city to its foundations. ${casualties
        .map((c) => c.name)
        .join(' and ')} were both discovered lifeless at sunrise. Chief of Police Armstrong has called an emergency city council session to confront the escalating terror.`;
    }
  } else if (isSyndicateDiscord) {
    bannerHeadline = 'SYNDICATE FAILED TO AGREE ON TARGET';
    bannerSubhead = 'Operatives divided in shadows; zero casualties reported at sunrise.';
    leadStory =
      'Internal discord in the shadows prevented an assassination. Underworld operatives failed to reach unanimous agreement on their target, sparing the populace for another sunrise.';
  } else if (settings.announceSave && saveLogs.length > 0) {
    bannerHeadline = 'SURGICAL MIRACLE: DOCTOR THWARTS UNDERWORLD HIT!';
    bannerSubhead = 'Heroic midnight intervention shields intended victim from assassin bullet.';
    leadStory =
      'A brazen assassination plot was narrowly foiled in the eleventh hour when an operative was rescued from fatal injury through swift medical intervention. The assailant was forced to flee into the fog empty-handed.';
  }

  return (
    <div className={`w-full max-w-[880px] mx-auto select-none font-serif ${className}`}>
      {/* 3D Spinning Broadsheet Unfold Animation */}
      <motion.div
        initial={{ scale: 0.15, rotate: -18, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-[#F4EEDF] text-[#1A1612] p-5 sm:p-8 rounded-[3px] shadow-[0_20px_50px_rgba(0,0,0,0.85)] border-4 border-[#241E19] overflow-hidden"
      >
        {/* Newsprint paper grain overlay & aged edges */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20 mix-blend-multiply"
          style={{
            backgroundImage:
              'radial-gradient(#1A1612 0.75px, transparent 0.75px), radial-gradient(#1A1612 0.75px, #F4EEDF 0.75px)',
            backgroundSize: '30px 30px',
            backgroundPosition: '0 0, 15px 15px',
          }}
        />

        {/* Vintage Top Utility Bar */}
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono tracking-widest uppercase border-b-2 border-[#1A1612] pb-1.5 text-[#42382E]">
          <div className="flex items-center gap-2">
            <Newspaper className="w-3.5 h-3.5" />
            <span>CITY CHRONICLE & DISPATCH · EST. 1928</span>
          </div>
          <div>VOL. XLVI NO. 182 · ROUND {round}</div>
          <div className="hidden sm:block">WEATHER: CHILLY WITH DENSE HARBOR FOG</div>
        </div>

        {/* Vintage Broadsheet Masthead */}
        <div className="text-center py-4 border-b-4 border-double border-[#1A1612]">
          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-black tracking-[-1px] uppercase leading-none font-['Big_Shoulders_Display'] text-[#16120E]"
            style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.15)' }}
          >
            The Daily Observer
          </h1>
          <div className="flex items-center justify-center gap-4 mt-1 text-[11px] sm:text-xs font-mono font-bold tracking-[3px] uppercase text-[#332A22]">
            <span>★ SPECIAL MORNING EXTRA ★</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#1A1612]" />
            <span>PRICE TWO CENTS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#1A1612]" />
            <span>DAWN EDITION</span>
          </div>
        </div>

        {/* BANNER HEADLINE */}
        <div className="py-4 border-b-2 border-[#1A1612] text-center">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-tight leading-tight text-[#16120E] font-['Big_Shoulders_Display']">
            {bannerHeadline}
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-sans italic text-[#3E342B] font-semibold max-w-2xl mx-auto">
            {bannerSubhead}
          </p>
        </div>

        {/* 3-Column Broadsheet Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-4">
          {/* Main Column (8 cols): Casualties, Lead Story & Photos */}
          <div className="md:col-span-8 space-y-4">
            {/* Lead Story Article */}
            <div className="text-xs sm:text-sm font-serif leading-relaxed text-[#221C16] text-justify space-y-2 border-b border-[#241E19]/30 pb-4">
              <p className="first-letter:text-4xl first-letter:font-black first-letter:mr-1 first-letter:font-['Big_Shoulders_Display']">
                {leadStory}
              </p>
            </div>

            {/* Casualties Section with Halftone Photo Engravings */}
            {casualties.length > 0 ? (
              <div className="space-y-3">
                <div className="text-[11px] font-mono font-bold tracking-widest uppercase border-b border-[#1A1612] pb-1 text-[#8B1E22] flex items-center justify-between">
                  <span>CORONER&apos;S INQUEST & VICTIM DOSSIER</span>
                  <span>RECORDED AT 04:00 AM</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {casualties.map((victim) => {
                    const roleDef = victim.role ? ROLES[victim.role] : null;
                    const canRevealRole = settings.revealRoleOnDeath === 'full' && Boolean(roleDef);
                    const canRevealAlignment = settings.revealRoleOnDeath === 'alignment' && Boolean(victim.role);

                    return (
                      <div
                        key={victim.id}
                        className="relative bg-[#ECE5D4] border-2 border-[#1A1612] p-3 rounded-[2px] shadow-sm flex flex-col justify-between"
                      >
                        {/* Stamp */}
                        <div className="absolute top-2 right-2 rotate-[12deg] pointer-events-none opacity-90">
                          <RubberStamp variant="eliminated" size="sm" text="DECEASED" />
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Halftone Dot Style Avatar Engraving */}
                          <div className="w-14 h-14 border border-[#1A1612] bg-[#3B322A] rounded-none overflow-hidden grayscale contrast-150 shrink-0">
                            <Avatar avatarId={victim.avatar} size={56} className="rounded-none border-0" />
                          </div>

                          <div className="min-w-0 pr-6">
                            <div className="text-lg font-black uppercase tracking-tight text-[#16120E] font-['Big_Shoulders_Display'] leading-none">
                              {victim.name}
                            </div>
                            <div className="text-[10px] font-mono text-[#741F23] font-bold uppercase mt-1">
                              {victim.diedBy === 'vigilante'
                                ? 'Marksman Bullet'
                                : 'Assassination in Shadows'}
                            </div>
                            <div className="text-[10px] font-serif italic text-[#55473A]">
                              Last seen leaving the speakeasy
                            </div>
                          </div>
                        </div>

                        {/* Official Coroner Finding */}
                        {(canRevealRole || canRevealAlignment) && (
                          <div className="mt-2.5 pt-2 border-t border-[#1A1612]/30 flex items-center justify-between text-[10px] font-mono">
                            <span className="text-[#55473A] uppercase">Allegiance Verified:</span>
                            <span
                              className={`font-bold px-1.5 py-0.5 rounded border uppercase text-[9px] ${
                                victim.role === 'mafia' || victim.role === 'godfather'
                                  ? 'bg-[#8B1E22]/15 text-[#8B1E22] border-[#8B1E22]'
                                  : 'bg-[#2E5E4E]/15 text-[#2E5E4E] border-[#2E5E4E]'
                              }`}
                            >
                              {canRevealRole && roleDef
                                ? roleDef.name
                                : victim.role === 'mafia' || victim.role === 'godfather'
                                ? 'MAFIA'
                                : 'TOWN'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : isSyndicateDiscord ? (
              <div className="p-3 bg-[#EAE2CE] border border-[#1A1612] rounded-[2px] flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-[#B45309] shrink-0" />
                <div className="text-xs font-serif leading-relaxed">
                  <strong className="font-bold text-[#1A1612] uppercase block font-mono text-[11px]">
                    Internal Syndicate Discord:
                  </strong>
                  Internal discord in the shadows prevented an assassination. Operatives failed to pick the same target unanimously, and nobody was harmed tonight!
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#EAE2CE] border border-[#1A1612] rounded-[2px] flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-[#2E5E4E] shrink-0" />
                <div className="text-xs font-serif leading-relaxed">
                  <strong className="font-bold text-[#1A1612] uppercase block font-mono text-[11px]">
                    The Night Remains Peaceful:
                  </strong>
                  No citizens were harmed. The dawn sirens herald a safe beginning to day deliberations.
                </div>
              </div>
            )}
          </div>

          {/* Right Column (4 cols): Police Blotter & 1930s Classifieds */}
          <div className="md:col-span-4 md:border-l-2 md:border-[#1A1612] md:pl-5 space-y-4">
            {/* Police Blotter */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono font-bold tracking-widest uppercase border-b-2 border-[#1A1612] pb-0.5 text-[#1A1612]">
                PRECINCT 4 BLOTTER
              </div>
              <div className="text-[11px] font-serif leading-snug text-[#332A22] space-y-2">
                <p>
                  <strong>02:15 AM:</strong> Heavy footsteps heard across the gravel alleyways near the clock tower.
                </p>
                <p>
                  <strong>03:40 AM:</strong> Patrol squad dispatched. Fingerprints dusted along iron fire escapes.
                </p>
                <p>
                  <strong>NOTICE:</strong> All town residents ordered to convene in the courtyard for testimony.
                </p>
              </div>
            </div>

            {/* Vintage 1930s Advertisements & Classifieds */}
            <div className="p-3 bg-[#E8DFC9] border-2 border-dashed border-[#1A1612] text-center space-y-1.5">
              <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#1A1612]">
                DR. FINCH&apos;S NERVE TONIC
              </div>
              <p className="text-[9px] font-serif italic text-[#4A3C2F] leading-tight">
                Calms trembling hands & relieves nighttime paranoia. Guaranteed pure herbs. 50¢ per flask.
              </p>
            </div>

            <div className="p-3 bg-[#E8DFC9] border-2 border-[#1A1612] text-center space-y-1">
              <div className="text-[10px] font-mono font-bold uppercase text-[#1A1612]">
                LOST & FOUND
              </div>
              <p className="text-[9px] font-serif text-[#4A3C2F] leading-tight">
                One dark wool fedora and sealed envelope found near the bank steps. Inquire with desk sergeant.
              </p>
            </div>
          </div>
        </div>

        {/* Newspaper Footer with Action Button */}
        <div className="mt-5 pt-3 border-t-2 border-[#1A1612] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[10px] font-mono uppercase text-[#55473A]">
            MAFIA DISPATCH · CASE INVESTIGATION IN PROGRESS
          </div>
          {onProceed && (
            <button
              type="button"
              onClick={onProceed}
              className="h-10 px-6 bg-[#1A1612] hover:bg-[#332A22] text-[#F4EEDF] font-mono font-bold text-xs uppercase tracking-widest rounded-[2px] shadow-md transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer"
            >
              <span>Proceed to Discussion</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#D9A441]" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
