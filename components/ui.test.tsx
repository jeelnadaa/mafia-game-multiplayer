import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { CenterTimer } from './ui';
import { Lobby } from './Lobby';
import { CircleSittingArena } from './CircleSittingArena';
import { Day } from './Day';
import { Night } from './Night';
import { TopBar } from './TopBar';
import { DawnAnnouncement } from './DawnAnnouncement';
import { VoiceOverlay } from './VoiceOverlay';
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

  it('renders Day with public voter names vs anonymous secret ballots based on voteVisibility', () => {
    const publicVoteView: ClientGameView = {
      code: 'TESTX',
      version: 4,
      phase: 'voting',
      round: 1,
      phaseEndsAt: Date.now() + 30000,
      paused: false,
      settings: { ...DEFAULT_SETTINGS, voteVisibility: 'public' },
      players: [
        { id: 'p1', name: 'Alice', avatar: 1, isHost: true, isGod: false, ready: true, alive: true, connected: true, voteTarget: 'p3' },
        { id: 'p2', name: 'Bob', avatar: 2, isHost: false, isGod: false, ready: true, alive: true, connected: true, voteTarget: 'p3' },
        { id: 'p3', name: 'Charlie', avatar: 3, isHost: false, isGod: false, ready: true, alive: true, connected: true, voteTarget: 'p1' },
      ],
      me: {
        id: 'p1',
        token: 'tok-p1',
        name: 'Alice',
        avatar: 1,
        isGod: false,
        isHost: true,
        alive: true,
        vote: 'p3',
        readyToVote: false,
        isReady: true,
      },
      voteCounts: { p3: 2, p1: 1 },
      readyToVote: [],
      chat: [],
      log: [],
      serverNow: Date.now(),
    };

    const publicHtml = renderToStaticMarkup(
      <Day gameView={publicVoteView} onVote={() => {}} onReadyToVote={() => {}} onSendChat={() => {}} />
    );
    assert.ok(publicHtml.includes('Voted by:'), 'Expected public voters list in markup');
    assert.ok(publicHtml.includes('Alice, Bob'), 'Expected Alice and Bob listed under Charlie');

    const anonVoteView: ClientGameView = {
      ...publicVoteView,
      settings: { ...DEFAULT_SETTINGS, voteVisibility: 'anonymous' },
      players: publicVoteView.players.map((p) => ({ ...p, voteTarget: undefined })),
    };

    const anonHtml = renderToStaticMarkup(
      <Day gameView={anonVoteView} onVote={() => {}} onReadyToVote={() => {}} onSendChat={() => {}} />
    );
    assert.ok(anonHtml.includes('Anonymous Secret Ballots'), 'Expected Anonymous Secret Ballots header');
    assert.ok(anonHtml.includes('Secret vote'), 'Expected Secret vote label on tally rows');
  });

  it('renders disabled notice in Day and Night when chat channels are disabled by room settings', () => {
    const noChatView: ClientGameView = {
      code: 'TESTX',
      version: 5,
      phase: 'discussion',
      round: 1,
      phaseEndsAt: Date.now() + 30000,
      paused: false,
      settings: { ...DEFAULT_SETTINGS, dayChat: false, mafiaNightChat: false },
      players: [
        { id: 'p1', name: 'Alice', avatar: 1, isHost: true, isGod: false, ready: true, alive: true, connected: true },
        { id: 'p2', name: 'Bob', avatar: 2, isHost: false, isGod: false, ready: true, alive: true, connected: true },
      ],
      me: {
        id: 'p1',
        token: 'tok-p1',
        name: 'Alice',
        avatar: 1,
        isGod: false,
        isHost: true,
        alive: true,
        role: 'mafia',
        readyToVote: false,
        isReady: true,
      },
      readyToVote: [],
      chat: [],
      log: [],
      serverNow: Date.now(),
    };

    const dayHtml = renderToStaticMarkup(
      <Day gameView={noChatView} onVote={() => {}} onReadyToVote={() => {}} onSendChat={() => {}} />
    );
    assert.ok(dayHtml.includes('Town public chat is disabled by room rules'), 'Expected day chat disabled notice');

    const nightView: ClientGameView = {
      ...noChatView,
      phase: 'night',
      nightSubPhase: 'mafia',
      me: { ...noChatView.me, canActNow: true },
    };
    const nightHtml = renderToStaticMarkup(
      <Night gameView={nightView} onNightAction={() => {}} onSendChat={() => {}} onOpenHelp={() => {}} />
    );
    assert.ok(nightHtml.includes('Syndicate night chat is disabled by room rules'), 'Expected mafia night chat disabled notice');
  });

  it('renders Lobby with grouped role families and categorized rules & timers', () => {
    const lobbyView: ClientGameView = {
      code: 'TESTX',
      version: 1,
      phase: 'lobby',
      round: 0,
      phaseEndsAt: null,
      paused: false,
      settings: DEFAULT_SETTINGS,
      players: [
        { id: 'h1', name: 'Host Player', avatar: 1, isHost: true, isGod: false, ready: true, alive: true, connected: true },
        { id: 'p2', name: 'Agent Two', avatar: 2, isHost: false, isGod: false, ready: true, alive: true, connected: true },
      ],
      me: {
        id: 'h1',
        token: 'tok-h1',
        name: 'Host Player',
        avatar: 1,
        isGod: false,
        isHost: true,
        alive: true,
        readyToVote: false,
        isReady: true,
      },
      readyToVote: [],
      chat: [],
      log: [],
      serverNow: Date.now(),
    };

    const rolesHtml = renderToStaticMarkup(
      <Lobby
        gameView={lobbyView}
        isHost={true}
        defaultSetupTab="roles"
        onStart={() => {}}
        onToggleReady={() => {}}
        onKick={() => {}}
        onToggleGod={() => {}}
        onUpdateSettings={() => {}}
      />
    );

    // Verify Role Family Groupings
    assert.ok(rolesHtml.includes('Syndicate Family'), 'Expected Syndicate Family header in setup');
    assert.ok(rolesHtml.includes('Town Defense &amp; Law') || rolesHtml.includes('Town Defense & Law'), 'Expected Town Defense & Law header');
    assert.ok(rolesHtml.includes('Town Populace'), 'Expected Town Populace header');
    assert.ok(rolesHtml.includes('Neutrals &amp; Chaos') || rolesHtml.includes('Neutrals & Chaos'), 'Expected Neutrals & Chaos header');

    const settingsHtml = renderToStaticMarkup(
      <Lobby
        gameView={lobbyView}
        isHost={true}
        defaultSetupTab="settings"
        onStart={() => {}}
        onToggleReady={() => {}}
        onKick={() => {}}
        onToggleGod={() => {}}
        onUpdateSettings={() => {}}
      />
    );

    // Verify Settings Category Groupings
    assert.ok(settingsHtml.includes('TIMERS &amp; PACING') || settingsHtml.includes('TIMERS & PACING'), 'Expected Timers & Pacing category');
    assert.ok(settingsHtml.includes('SYNDICATE FAMILY RULES'), 'Expected Syndicate Family Rules category');
    assert.ok(settingsHtml.includes('TOWN DEFENSE &amp; INVESTIGATIVE') || settingsHtml.includes('TOWN DEFENSE & INVESTIGATIVE'), 'Expected Town Defense category');
    assert.ok(settingsHtml.includes('TRIBUNAL &amp; VOTING RULES') || settingsHtml.includes('TRIBUNAL & VOTING RULES'), 'Expected Tribunal category');
    assert.ok(settingsHtml.includes('GENERAL &amp; MATCH INTEGRITY') || settingsHtml.includes('GENERAL & MATCH INTEGRITY'), 'Expected General category');
  });

  it('renders TopBar with untimed infinity symbol and advance button when noTimer is enabled', () => {
    const untimedView: ClientGameView = {
      code: 'TESTX',
      version: 2,
      phase: 'discussion',
      round: 1,
      phaseEndsAt: null,
      paused: false,
      settings: { ...DEFAULT_SETTINGS, noTimer: true },
      players: [
        { id: 'h1', name: 'Host Player', avatar: 1, isHost: true, isGod: false, ready: true, alive: true, connected: true },
      ],
      me: {
        id: 'h1',
        token: 'tok-h1',
        name: 'Host Player',
        avatar: 1,
        isGod: false,
        isHost: true,
        alive: true,
        readyToVote: false,
        isReady: true,
      },
      readyToVote: [],
      chat: [],
      log: [],
      serverNow: Date.now(),
    };

    const topBarHtml = renderToStaticMarkup(
      <TopBar
        gameView={untimedView}
        isHost={true}
        onOpenHelp={() => {}}
        onGodAction={() => {}}
      />
    );

    assert.ok(topBarHtml.includes('∞'), 'Expected infinity symbol in untimed mode');
    assert.ok(topBarHtml.includes('Advance'), 'Expected Host Advance button in untimed mode');
  });

  it('renders Night with Syndicate teammate roles and tags', () => {
    const nightMafiaView: ClientGameView = {
      code: 'TESTX',
      version: 4,
      phase: 'night',
      nightSubPhase: 'mafia',
      round: 1,
      phaseEndsAt: Date.now() + 30000,
      paused: false,
      settings: DEFAULT_SETTINGS,
      players: [
        { id: 'm1', name: 'Boss Man', avatar: 1, isHost: true, isGod: false, ready: true, alive: true, connected: true, role: 'godfather' },
        { id: 'm2', name: 'Enforcer', avatar: 2, isHost: false, isGod: false, ready: true, alive: true, connected: true, role: 'mafia' },
        { id: 'c1', name: 'Target Civ', avatar: 3, isHost: false, isGod: false, ready: true, alive: true, connected: true },
      ],
      me: {
        id: 'm2',
        token: 'tok-m2',
        name: 'Enforcer',
        avatar: 2,
        isGod: false,
        isHost: false,
        alive: true,
        role: 'mafia',
        canActNow: true,
        teammates: ['m1'],
        teammatePicks: { m1: 'c1', m2: null },
        teammateConfirmed: { m1: false, m2: false },
        readyToVote: false,
        isReady: true,
      },
      readyToVote: [],
      chat: [],
      log: [],
      serverNow: Date.now(),
    };

    const html = renderToStaticMarkup(
      <Night gameView={nightMafiaView} onNightAction={() => {}} onSendChat={() => {}} onOpenHelp={() => {}} />
    );

    assert.ok(html.includes('Boss Man'), 'Expected teammate name Boss Man');
    assert.ok(html.includes('Godfather'), 'Expected Godfather tag on fellow syndicate boss');
    assert.ok(html.includes('Mafia'), 'Expected Mafia tag on local player');
  });

  it('renders DawnAnnouncement with syndicate disagreement banner and suppresses doctor save on discord', () => {
    const dawnDiscordView: ClientGameView = {
      code: 'DISC1',
      version: 2,
      phase: 'morning',
      round: 1,
      phaseEndsAt: Date.now() + 10000,
      paused: false,
      settings: { ...DEFAULT_SETTINGS, mafiaKillMode: 'unanimous', announceSave: true },
      players: [
        { id: 'm1', name: 'Mafia One', avatar: 1, isHost: true, isGod: false, ready: true, alive: true, connected: true },
        { id: 'm2', name: 'Mafia Two', avatar: 2, isHost: false, isGod: false, ready: true, alive: true, connected: true },
        { id: 'c1', name: 'Citizen One', avatar: 3, isHost: false, isGod: false, ready: true, alive: true, connected: true },
      ],
      me: {
        id: 'c1',
        token: 'tc1',
        name: 'Citizen One',
        avatar: 3,
        isGod: false,
        isHost: false,
        alive: true,
        canActNow: false,
        isConfirmed: false,
        nightPick: null,
        nightLocked: false,
        vote: null,
        readyToVote: false,
        isReady: true,
      },
      readyToVote: [],
      chat: [],
      log: [
        {
          id: 'log-1-safe-1000',
          round: 1,
          phase: 'morning',
          text: 'Syndicate discord prevented an assassination — operatives failed to reach unanimous agreement in the shadows!',
          timestamp: 1000,
          type: 'info',
        },
      ],
      serverNow: Date.now(),
    };

    const html = renderToStaticMarkup(<DawnAnnouncement gameView={dawnDiscordView} initialStep={1} />);
    assert.ok(html.includes('SYNDICATE FAILED TO AGREE ON TARGET'), 'Expected syndicate disagreement header');
    assert.ok(html.includes('Internal discord in the shadows prevented an assassination'), 'Expected discord description');
    assert.ok(!html.includes('The doctor intervened in time'), 'Doctor save notice must be suppressed when syndicate disagreed');
  });

  it('renders CircleSittingArena with enlarged teammate target badges positioned below the nameplate', () => {
    const arenaMafiaView: ClientGameView = {
      code: 'ARENA',
      version: 1,
      phase: 'night',
      nightSubPhase: 'mafia',
      round: 1,
      phaseEndsAt: Date.now() + 30000,
      paused: false,
      settings: DEFAULT_SETTINGS,
      players: [
        { id: 'm1', name: 'Cipher', avatar: 1, isHost: true, isGod: false, ready: true, alive: true, connected: true, role: 'mafia' },
        { id: 'm2', name: 'Shadow', avatar: 2, isHost: false, isGod: false, ready: true, alive: true, connected: true, role: 'mafia' },
        { id: 'c1', name: 'TargetCiv', avatar: 3, isHost: false, isGod: false, ready: true, alive: true, connected: true, role: 'civilian' },
      ],
      me: {
        id: 'm1',
        token: 'tm1',
        name: 'Cipher',
        avatar: 1,
        isGod: false,
        isHost: true,
        alive: true,
        role: 'mafia',
        canActNow: true,
        teammates: ['m2'],
        teammatePicks: { m2: 'c1' },
        teammateConfirmed: { m2: true },
        nightPick: 'c1',
        nightLocked: false,
        isConfirmed: false,
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
        gameView={arenaMafiaView}
        onNightAction={() => {}}
        onConfirmNightAction={() => {}}
        onVote={() => {}}
        onReadyToVote={() => {}}
        onSendChat={() => {}}
        onOpenHelp={() => {}}
      />
    );

    assert.ok(html.includes('Shadow:'), 'Expected teammate name Shadow on targeted pawn');
    assert.ok(html.includes('LOCKED ✓'), 'Expected LOCKED check badge');
    assert.ok(html.includes('mt-2 flex flex-col items-center gap-1.5'), 'Expected non-overlapping mt-2 placement container');
    assert.ok(html.includes('text-xs font-mono font-bold'), 'Expected enlarged text-xs font style');
  });

  it('renders VoiceOverlay with on-screen HUD, glowing green when speaking and no glow when silent', () => {
    const voiceGameView: ClientGameView = {
      code: 'VOICE',
      version: 1,
      phase: 'discussion',
      round: 1,
      phaseEndsAt: Date.now() + 30000,
      paused: false,
      settings: DEFAULT_SETTINGS,
      voiceMuted: { p2: false },
      players: [
        { id: 'p1', name: 'Speaker One', avatar: 1, isHost: true, isGod: false, ready: true, alive: true, connected: true },
        { id: 'p2', name: 'Silent Peer', avatar: 2, isHost: false, isGod: false, ready: true, alive: true, connected: true },
      ],
      me: {
        id: 'p1',
        token: 'tp1',
        name: 'Speaker One',
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
      readyToVote: [],
      chat: [],
      log: [],
      serverNow: Date.now(),
    };

    // p1 is speaking (glow), p2 is silent (no glow)
    const speakingPeers = { p1: true, p2: false };

    const html = renderToStaticMarkup(
      <VoiceOverlay
        gameView={voiceGameView}
        isVoiceActive={true}
        isVoiceMuted={false}
        onToggleVoice={() => {}}
        onToggleVoiceMute={() => {}}
        speakingPeers={speakingPeers}
      />
    );

    assert.ok(html.includes('WIRE (2)'), 'Expected HUD header with participant count');
    assert.ok(html.includes('Speaker One'), 'Expected speaker one in voice list');
    assert.ok(html.includes('Silent Peer'), 'Expected silent peer in voice list');
    // Emerald glow ring for speaker:
    assert.ok(html.includes('#2ED573'), 'Expected emerald glow color for active speaker');
  });
});
