import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function expect(actual: any) {
  return {
    toBe: (expected: any) => assert.strictEqual(actual, expected),
    toEqual: (expected: any) => assert.deepStrictEqual(actual, expected),
    toBeNull: () => assert.strictEqual(actual, null),
    toBeUndefined: () => assert.strictEqual(actual, undefined),
    toBeDefined: () => assert.ok(actual !== undefined && actual !== null),
    toHaveLength: (length: number) => assert.strictEqual(actual?.length, length),
    toContain: (item: any) => assert.ok(actual?.includes(item), `Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`),
    toBeGreaterThanOrEqual: (n: number) => assert.ok(actual >= n, `Expected ${actual} >= ${n}`),
    not: {
      toContain: (item: any) => assert.ok(!actual?.includes(item), `Expected ${JSON.stringify(actual)} to NOT contain ${JSON.stringify(item)}`),
      toBe: (expected: any) => assert.notStrictEqual(actual, expected),
    },
  };
}

import { validateSettings, assignRoles } from './rules';
import { resolveNight, tallyVotes, maybeAdvance, getSubPhaseDuration } from './phases';
import { buildViewFor } from './view';
import { DEFAULT_SETTINGS, SETTINGS_SCHEMA, RULE_PRESETS } from '../settings';
import { GameState, Player, Settings } from '../types';

describe('Settings Reflection & Engine Synchronization', () => {
  it('has all settings mapped in SETTINGS_SCHEMA with plain description functions', () => {
    const settingKeys = SETTINGS_SCHEMA.map((s) => s.key);
    expect(settingKeys).toContain('circleSitting');
    expect(settingKeys).toContain('maxPlayers');
    expect(settingKeys).toContain('moderatorMode');
    expect(settingKeys).toContain('dayChat');
    expect(settingKeys).toContain('mafiaKillMode');
    expect(settingKeys).toContain('mafiaDisagreeFallback');
    expect(settingKeys).toContain('noKillFirstNight');
    expect(settingKeys).toContain('mafiaNightChat');
    expect(settingKeys).toContain('doctorSelfSave');
    expect(settingKeys).toContain('doctorSameTargetTwice');
    expect(settingKeys).toContain('announceSave');
    expect(settingKeys).toContain('policeResultDelay');
    expect(settingKeys).toContain('policeResultDetail');
    expect(settingKeys).toContain('vigilanteShots');
    expect(settingKeys).toContain('nightDuration');
    expect(settingKeys).toContain('discussionDuration');
    expect(settingKeys).toContain('votingDuration');
    expect(settingKeys).toContain('endNightEarly');
    expect(settingKeys).toContain('voteVisibility');
    expect(settingKeys).toContain('allowSkipVote');
    expect(settingKeys).toContain('tieRule');
    expect(settingKeys).toContain('revealRoleOnDeath');
    expect(settingKeys).toContain('revealRoleList');
    expect(settingKeys).toContain('deadChat');
    expect(settingKeys).toContain('deadSeeRoles');

    // Verify all schema entries have labels, tooltips, and non-empty plain string formatting
    SETTINGS_SCHEMA.forEach((field) => {
      expect(typeof field.label).toBe('string');
      expect(typeof field.tooltip).toBe('string');
      const plainOutput = field.plain((DEFAULT_SETTINGS as any)[field.key] ?? field.default);
      expect(typeof plainOutput).toBe('string');
      expect(plainOutput.length > 0).toBe(true);
    });
  });

  it('correctly handles moderatorMode: god in validateSettings and role assignment', () => {
    const godSettings: Settings = {
      ...DEFAULT_SETTINGS,
      moderatorMode: 'god',
      roles: {
        ...DEFAULT_SETTINGS.roles,
        mafia: { count: 1 },
        doctor: { enabled: true, count: 1 },
        police: { enabled: true, count: 1 },
      },
    };

    // 4 players with god mode: only 3 active players, which is < 4 active players, should fail
    const validation4 = validateSettings(godSettings, 4);
    expect(validation4.valid).toBe(false);

    // 5 players with god mode: 4 active players (1 host god + 4 players), should succeed
    const validation5 = validateSettings(godSettings, 5);
    expect(validation5.valid).toBe(true);

    const players: Player[] = [
      { id: 'h1', token: 'th', name: 'HostNarrator', avatar: 1, isHost: true, isGod: true, ready: true, connected: true, lastSeen: 0, alive: true },
      { id: 'p1', token: 't1', name: 'P1', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, alive: true },
      { id: 'p2', token: 't2', name: 'P2', avatar: 3, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, alive: true },
      { id: 'p3', token: 't3', name: 'P3', avatar: 4, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, alive: true },
      { id: 'p4', token: 't4', name: 'P4', avatar: 5, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, alive: true },
    ];

    const assigned = assignRoles(players, godSettings, () => 0.5);
    const hostAssigned = assigned.find((p) => p.isHost);
    expect(hostAssigned?.isGod).toBe(true);
    expect(hostAssigned?.role).toBeUndefined();
    expect(hostAssigned?.alive).toBe(false);

    const activeAssigned = assigned.filter((p) => !p.isGod);
    expect(activeAssigned).toHaveLength(4);
    const activeRoles = activeAssigned.map((p) => p.role);
    expect(activeRoles).toContain('mafia');
    expect(activeRoles).toContain('doctor');
    expect(activeRoles).toContain('police');
    expect(activeRoles).toContain('civilian');
  });

  it('enforces voteVisibility: public vs anonymous in client views', () => {
    const players: Player[] = [
      { id: 'p1', token: 't1', name: 'Alice', avatar: 1, isHost: true, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
      { id: 'p2', token: 't2', name: 'Bob', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
      { id: 'p3', token: 't3', name: 'Charlie', avatar: 3, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'mafia', alive: true },
      { id: 'p4', token: 't4', name: 'Dave', avatar: 4, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'doctor', alive: true },
    ];

    const baseState: GameState = {
      code: 'TEST1',
      version: 1,
      phase: 'voting',
      round: 1,
      phaseEndsAt: Date.now() + 30000,
      paused: false,
      settings: { ...DEFAULT_SETTINGS, voteVisibility: 'public' },
      players,
      night: { subPhase: 'mafia', picks: {}, confirmed: {}, locked: {} },
      doctorHistory: {},
      shotsUsed: {},
      policeInbox: [],
      votes: { p1: 'p3', p2: 'p3', p3: 'p1' },
      revotePending: false,
      readyToVote: [],
      log: [],
      secretLog: [],
      chat: [],
    };

    // Public vote mode: vote targets and publicVotes are exposed
    const publicView = buildViewFor(baseState, 'p1', Date.now());
    expect(publicView.publicVotes).toBeDefined();
    expect(publicView.publicVotes?.p1).toBe('p3');
    expect(publicView.players.find((p) => p.id === 'p1')?.voteTarget).toBe('p3');

    // Anonymous vote mode: vote targets and publicVotes are hidden
    const anonState: GameState = {
      ...baseState,
      settings: { ...DEFAULT_SETTINGS, voteVisibility: 'anonymous' },
    };
    const anonView = buildViewFor(anonState, 'p1', Date.now());
    expect(anonView.publicVotes).toBeUndefined();
    expect(anonView.players.find((p) => p.id === 'p1')?.voteTarget).toBeUndefined();
    // But aggregate tally is still accurately calculated
    expect(anonView.voteCounts?.['p3']).toBe(2);
    expect(anonView.voteCounts?.['p1']).toBe(1);
  });

  it('correctly executes tieRule revote_then_none with runoff revote', () => {
    const players: Player[] = [
      { id: 'p1', token: 't1', name: 'Alice', avatar: 1, isHost: true, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
      { id: 'p2', token: 't2', name: 'Bob', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
      { id: 'p3', token: 't3', name: 'Charlie', avatar: 3, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'mafia', alive: true },
      { id: 'p4', token: 't4', name: 'Dave', avatar: 4, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'doctor', alive: true },
    ];

    const now = Date.now();
    const tieState: GameState = {
      code: 'TEST2',
      version: 1,
      phase: 'voting',
      round: 1,
      phaseEndsAt: now - 100, // timer expired
      paused: false,
      settings: { ...DEFAULT_SETTINGS, tieRule: 'revote_then_none', votingDuration: 40 },
      players,
      night: { subPhase: 'mafia', picks: {}, confirmed: {}, locked: {} },
      doctorHistory: {},
      shotsUsed: {},
      policeInbox: [],
      votes: { p1: 'p2', p3: 'p2', p2: 'p3', p4: 'p3' }, // 2 votes for p2, 2 votes for p3 -> TIE
      revotePending: false,
      readyToVote: [],
      log: [],
      secretLog: [],
      chat: [],
    };

    // First tie: initiates revote runoff
    const afterTie = maybeAdvance(tieState, now, () => 0.5);
    expect(afterTie.phase).toBe('voting');
    expect(afterTie.revotePending).toBe(true);
    expect(Object.keys(afterTie.votes)).toHaveLength(0);
    expect(afterTie.log.some((l) => l.text.includes('runoff revote has begun'))).toBe(true);

    // Second tie during revote runoff: concludes without elimination
    const runoffTieState: GameState = {
      ...afterTie,
      phaseEndsAt: now - 100,
      votes: { p1: 'p2', p3: 'p2', p2: 'p3', p4: 'p3' },
    };

    const afterRunoffTie = maybeAdvance(runoffTieState, now, () => 0.5);
    expect(afterRunoffTie.phase).toBe('voteResult');
    expect(afterRunoffTie.revotePending).toBe(false);
    expect(afterRunoffTie.players.every((p) => p.alive)).toBe(true); // nobody eliminated
  });

  it('enforces revealRoleOnDeath: full vs alignment vs none in player views', () => {
    const players: Player[] = [
      { id: 'p1', token: 't1', name: 'Alice', avatar: 1, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
      { id: 'p2', token: 't2', name: 'DeadMafia', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'mafia', alive: false, diedInRound: 1 },
      { id: 'p3', token: 't3', name: 'DeadDoc', avatar: 3, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'doctor', alive: false, diedInRound: 1 },
    ];

    const makeState = (revealMode: Settings['revealRoleOnDeath']): GameState => ({
      code: 'TEST3',
      version: 1,
      phase: 'discussion',
      round: 1,
      phaseEndsAt: Date.now() + 30000,
      paused: false,
      settings: { ...DEFAULT_SETTINGS, revealRoleOnDeath: revealMode, deadSeeRoles: false },
      players,
      night: { subPhase: 'mafia', picks: {}, confirmed: {}, locked: {} },
      doctorHistory: {},
      shotsUsed: {},
      policeInbox: [],
      votes: {},
      revotePending: false,
      readyToVote: [],
      log: [],
      secretLog: [],
      chat: [],
    });

    // 1. Full reveal: dead players have exact role and alignment visible
    const fullView = buildViewFor(makeState('full'), 'p1', Date.now());
    expect(fullView.players.find((p) => p.id === 'p2')?.role).toBe('mafia');
    expect(fullView.players.find((p) => p.id === 'p2')?.alignment).toBe('mafia');
    expect(fullView.players.find((p) => p.id === 'p3')?.role).toBe('doctor');
    expect(fullView.players.find((p) => p.id === 'p3')?.alignment).toBe('town');

    // 2. Alignment reveal: dead players have role undefined, but alignment visible
    const alignView = buildViewFor(makeState('alignment'), 'p1', Date.now());
    expect(alignView.players.find((p) => p.id === 'p2')?.role).toBeUndefined();
    expect(alignView.players.find((p) => p.id === 'p2')?.alignment).toBe('mafia');
    expect(alignView.players.find((p) => p.id === 'p3')?.role).toBeUndefined();
    expect(alignView.players.find((p) => p.id === 'p3')?.alignment).toBe('town');

    // 3. None reveal: dead players have role and alignment undefined
    const noneView = buildViewFor(makeState('none'), 'p1', Date.now());
    expect(noneView.players.find((p) => p.id === 'p2')?.role).toBeUndefined();
    expect(noneView.players.find((p) => p.id === 'p2')?.alignment).toBeUndefined();
  });

  it('accurately exposes Doctor self-save rules and consecutive save restrictions to view', () => {
    const players: Player[] = [
      { id: 'doc1', token: 'td', name: 'Doctor Smith', avatar: 1, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'doctor', alive: true },
      { id: 'p2', token: 't2', name: 'Citizen Vance', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
    ];

    const state: GameState = {
      code: 'TEST4',
      version: 1,
      phase: 'night',
      round: 2,
      phaseEndsAt: Date.now() + 30000,
      paused: false,
      settings: { ...DEFAULT_SETTINGS, doctorSelfSave: 'once', doctorSameTargetTwice: false },
      players,
      night: { subPhase: 'doctor', picks: {}, confirmed: {}, locked: {} },
      doctorHistory: { doc1: { lastSavedId: 'p2', selfSavesUsed: 1 } },
      shotsUsed: {},
      policeInbox: [],
      votes: {},
      revotePending: false,
      readyToVote: [],
      log: [],
      secretLog: [],
      chat: [],
    };

    const docView = buildViewFor(state, 'doc1', Date.now());
    // Since selfSavesUsed is 1 and setting is 'once', doctorSelfSavesRemaining should be 0
    expect(docView.me.doctorSelfSavesRemaining).toBe(0);
    // lastSavedId should be 'p2'
    expect(docView.me.doctorLastSavedId).toBe('p2');
  });

  it('respects nightDuration and does not cap subphase to 35s when host configures longer timer', () => {
    const settings60 = { ...DEFAULT_SETTINGS, nightDuration: 60 };
    expect(getSubPhaseDuration('mafia', settings60)).toBe(60);
    expect(getSubPhaseDuration('doctor', settings60)).toBe(60);
    expect(getSubPhaseDuration('police', settings60)).toBe(60);
    expect(getSubPhaseDuration('vigilante', settings60)).toBe(60);

    const settings90 = { ...DEFAULT_SETTINGS, nightDuration: 90 };
    expect(getSubPhaseDuration('mafia', settings90)).toBe(90);
    expect(getSubPhaseDuration('doctor', settings90)).toBe(90);
  });

  it('excludes inactive mafia members who ran out of time so active picks resolve unanimously', () => {
    const players: Player[] = [
      { id: 'm1', token: 'tm1', name: 'Mafia One', avatar: 1, isHost: true, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'mafia', alive: true },
      { id: 'm2', token: 'tm2', name: 'Mafia Two', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'mafia', alive: true },
      { id: 'c1', token: 'tc1', name: 'Civ One', avatar: 3, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
      { id: 'c2', token: 'tc2', name: 'Civ Two', avatar: 4, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
    ];

    // Scenario 1: m1 picked c1, m2 did not pick in time (picks is empty for m2).
    // In unanimous mode, m2 is excluded, and m1's choice of c1 resolves unanimously.
    const state: GameState = {
      code: 'TESTU',
      version: 1,
      phase: 'night',
      round: 1,
      phaseEndsAt: Date.now() - 1000,
      paused: false,
      settings: { ...DEFAULT_SETTINGS, mafiaKillMode: 'unanimous', noKillFirstNight: false },
      players,
      night: { subPhase: 'mafia', picks: { m1: 'c1' }, confirmed: { m1: false }, locked: {} },
      doctorHistory: {},
      shotsUsed: {},
      policeInbox: [],
      votes: {},
      revotePending: false,
      readyToVote: [],
      log: [],
      secretLog: [],
      chat: [],
    };

    const { nextState, morningDeaths } = resolveNight(state, () => 0.5, Date.now());
    expect(morningDeaths).toContain('c1');
    expect(nextState.players.find((p) => p.id === 'c1')?.alive).toBe(false);

    // Scenario 2: m1 picked c1, m2 picked c2 (divergent picks in unanimous mode).
    // Disagreement fallback is triggered (random_pick or no_kill).
    const disagreeState: GameState = {
      ...state,
      night: { subPhase: 'mafia', picks: { m1: 'c1', m2: 'c2' }, confirmed: { m1: true, m2: true }, locked: {} },
      settings: { ...DEFAULT_SETTINGS, mafiaKillMode: 'unanimous', mafiaDisagreeFallback: 'no_kill', noKillFirstNight: false },
    };
    const { morningDeaths: disagreeDeaths } = resolveNight(disagreeState, () => 0.5, Date.now());
    expect(disagreeDeaths).toHaveLength(0);
  });

  it('exposes real-time staged teammate picks and confirmed status to syndicate members in view', () => {
    const players: Player[] = [
      { id: 'm1', token: 'tm1', name: 'Mafia One', avatar: 1, isHost: true, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'mafia', alive: true },
      { id: 'm2', token: 'tm2', name: 'Mafia Two', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'godfather', alive: true },
      { id: 'c1', token: 'tc1', name: 'Civ One', avatar: 3, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
    ];

    const state: GameState = {
      code: 'TESTV',
      version: 1,
      phase: 'night',
      round: 1,
      phaseEndsAt: Date.now() + 30000,
      paused: false,
      settings: { ...DEFAULT_SETTINGS, mafiaKillMode: 'unanimous' },
      players,
      night: {
        subPhase: 'mafia',
        picks: { m1: 'c1', m2: 'c1' },
        confirmed: { m1: true, m2: false }, // m1 confirmed, m2 staged without confirming
        locked: {},
      },
      doctorHistory: {},
      shotsUsed: {},
      policeInbox: [],
      votes: {},
      revotePending: false,
      readyToVote: [],
      log: [],
      secretLog: [],
      chat: [],
    };

    const m2View = buildViewFor(state, 'm2', Date.now());
    expect(m2View.me.teammatePicks).toBeDefined();
    expect(m2View.me.teammatePicks!['m1']).toBe('c1');
    expect(m2View.me.teammateConfirmed!['m1']).toBe(true);
    expect(m2View.me.teammateConfirmed!['m2']).toBe(false);

    // Civilian observer never sees teammatePicks or secret picks
    const c1View = buildViewFor(state, 'c1', Date.now());
    expect(c1View.me.teammatePicks).toBeUndefined();
    expect(c1View.me.teammateConfirmed).toBeUndefined();
  });
});
