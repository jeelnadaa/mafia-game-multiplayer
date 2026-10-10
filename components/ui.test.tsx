import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { CenterTimer } from './ui';
import { Lobby } from './Lobby';
import { CircleSittingArena } from './CircleSittingArena';
import { Day } from './Day';
import { Night } from './Night';
import { DEFAULT_SETTINGS } from '../lib/settings';
import { ClientGameView } from '../lib/types';

describe('Frontend UI Components: Rendering & Reflection', () => {
  it('renders CenterTimer with accurate remaining time in HTML', () => {
    const phaseEndsAt = Date.now() + 30000; // 30s remaining
    const html = renderToStaticMarkup(
      <CenterTimer phaseEndsAt={phaseEndsAt} serverNow={Date.now()} label="Phase Timer" size="md" />
    );
    assert.ok(html.includes('Phase Timer'), 'Expected timer label in markup');
    assert.ok(html.includes('30s') || html.includes('29s'), 'Expected remaining seconds in markup');
  });

  it('renders Lobby with Mafia, Godfather card, Doctor, Police, and Circle Sitting mode', () => {
    const mockGameView: ClientGameView = {
      code: 'TESTX',
      version: 1,
      phase: 'lobby',
      round: 0,
      phaseEndsAt: null,
      paused: false,
      settings: DEFAULT_SETTINGS,
      players: [
        { id: 'p1', name: 'Host Player', avatar: 1, isHost: true, isGod: false, ready: true, alive: true, connected: true },
        { id: 'p2', name: 'Player Two', avatar: 2, isHost: false, isGod: false, ready: false, alive: true, connected: true },
        { id: 'p3', name: 'Player Three', avatar: 3, isHost: false, isGod: false, ready: true, alive: true, connected: true },
        { id: 'p4', name: 'Player Four', avatar: 4, isHost: false, isGod: false, ready: false, alive: true, connected: true },
      ],
      me: {
        id: 'p1',
        token: 'tok-p1',
        name: 'Host Player',
        avatar: 1,
        isGod: false,
        isHost: true,
        alive: true,
        canActNow: false,
        isConfirmed: false,
        nightPick: null,
        nightLocked: false,
        vote: null,
        readyToVote: false,
        isReady: true,
      },
      chat: [],
      log: [],
      readyToVote: [],
      serverNow: Date.now(),
    };

    const html = renderToStaticMarkup(
      <Lobby
        gameView={mockGameView}
        isHost={true}
        onStart={() => {}}
        onToggleReady={() => {}}
        onKick={() => {}}
        onToggleGod={() => {}}
        onUpdateSettings={() => {}}
      />
    );

    assert.ok(html.includes('Mafia'), 'Expected Mafia in Lobby markup');
    assert.ok(html.includes('Godfather'), 'Expected Godfather card in Lobby markup');
    assert.ok(html.includes('Doctor'), 'Expected Doctor card in Lobby markup');
    assert.ok(html.includes('Police'), 'Expected Police card in Lobby markup');
    assert.ok(html.includes('Circle Sitting'), 'Expected Circle Sitting Mode in Lobby markup');
  });

  it('renders CircleSittingArena reflecting Detective Dossier and seat badges', () => {
    const policeGameView: ClientGameView = {
      code: 'TESTX',
      version: 2,
      phase: 'night',
      nightSubPhase: 'police',
      round: 1,
      phaseEndsAt: Date.now() + 20000,
      paused: false,
      settings: DEFAULT_SETTINGS,
      players: [
        { id: 'pol', name: 'Detective', avatar: 1, isHost: true, isGod: false, ready: true, alive: true, connected: true },
        { id: 'sus1', name: 'Suspect One', avatar: 2, isHost: false, isGod: false, ready: true, alive: true, connected: true },
        { id: 'sus2', name: 'Suspect Two', avatar: 3, isHost: false, isGod: false, ready: true, alive: true, connected: true },
        { id: 'civ1', name: 'Innocent Civ', avatar: 4, isHost: false, isGod: false, ready: true, alive: true, connected: true },
      ],
      me: {
        id: 'pol',
        token: 'tok-pol',
        name: 'Detective',
        avatar: 1,
        role: 'police',
        isGod: false,
        isHost: true,
        alive: true,
        canActNow: true,
        isConfirmed: false,
        nightPick: null,
        nightLocked: false,
        policeInbox: [
          { targetId: 'sus1', result: 'Mafia', round: 1 },
          { targetId: 'civ1', result: 'Not mafia', round: 1 },
        ],
        vote: null,
        readyToVote: false,
        isReady: true,
      },
      readyToVote: [],
      chat: [],
      log: [],
      serverNow: Date.now(),
    };

    const html = renderToStaticMarkup(
      <CircleSittingArena
        gameView={policeGameView}
        onNightAction={() => {}}
        onConfirmNightAction={() => {}}
        onVote={() => {}}
        onReadyToVote={() => {}}
        onSendChat={() => {}}
        onOpenHelp={() => {}}
      />
    );

    // Verify Detective Dossier in sidebar
    assert.ok(html.includes('Detective Dossier'), 'Expected Detective Dossier in tactical sidebar');
    assert.ok(html.includes('Suspect One'), 'Expected investigated suspect in dossier');
    assert.ok(html.includes('Innocent Civ'), 'Expected investigated civ in dossier');

    // Verify badges above player chairs
    assert.ok(html.includes('MAFIA'), 'Expected MAFIA badge on suspect chair');
    assert.ok(html.includes('NOT MAFIA'), 'Expected NOT MAFIA badge on civ chair');
  });

  it('renders Day and TargetPicker reflecting Detective investigation badges', () => {
    const dayGameView: ClientGameView = {
      code: 'TESTX',
      version: 3,
      phase: 'discussion',
      round: 1,
      phaseEndsAt: Date.now() + 60000,
      paused: false,
      settings: DEFAULT_SETTINGS,
      players: [
        { id: 'pol', name: 'Detective', avatar: 1, isHost: true, isGod: false, ready: true, alive: true, connected: true },
        { id: 'sus1', name: 'Suspect One', avatar: 2, isHost: false, isGod: false, ready: true, alive: true, connected: true },
        { id: 'civ1', name: 'Innocent Civ', avatar: 3, isHost: false, isGod: false, ready: true, alive: true, connected: true },
      ],
      me: {
        id: 'pol',
        token: 'tok-pol',
        name: 'Detective',
        avatar: 1,
        role: 'police',
        isGod: false,
        isHost: true,
        alive: true,
        canActNow: false,
        isConfirmed: false,
        nightPick: null,
        nightLocked: false,
        policeInbox: [
          { targetId: 'sus1', result: 'Mafia', round: 1 },
        ],
        vote: null,
        readyToVote: false,
        isReady: true,
      },
      readyToVote: [],
      chat: [],
      log: [],
      serverNow: Date.now(),
    };

    const html = renderToStaticMarkup(
      <Day
        gameView={dayGameView}
        onVote={() => {}}
        onReadyToVote={() => {}}
        onSendChat={() => {}}
      />
    );

    // Verify Detective Dossier rendered in Day mode
    assert.ok(html.includes('Detective Dossier'), 'Expected Detective Dossier in Day view');
    // Verify badge next to suspect name
    assert.ok(html.includes('Mafia'), 'Expected Mafia result badge in Day view');
  });
});
