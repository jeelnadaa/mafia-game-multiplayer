import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function expect(actual: any) {
  return {
    toBe: (expected: any) => assert.strictEqual(actual, expected),
    toEqual: (expected: any) => assert.deepStrictEqual(actual, expected),
    toBeNull: () => assert.strictEqual(actual, null),
    toBeUndefined: () => assert.strictEqual(actual, undefined),
    toHaveLength: (length: number) => assert.strictEqual(actual?.length, length),
    toContain: (item: any) => assert.ok(actual?.includes(item), `Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`),
    toBeGreaterThanOrEqual: (n: number) => assert.ok(actual >= n, `Expected ${actual} >= ${n}`),
    not: {
      toContain: (item: any) => assert.ok(!actual?.includes(item), `Expected ${JSON.stringify(actual)} to NOT contain ${JSON.stringify(item)}`),
    },
  };
}
import { validateSettings, assignRoles, checkWinCondition } from './rules';
import { resolveNight, tallyVotes, maybeAdvance } from './phases';
import { buildViewFor } from './view';
import { DEFAULT_SETTINGS } from '../settings';
import { GameState, Player } from '../types';

describe('Mafia Engine: Rules & Validation', () => {
  it('validates minimum player count and mafia ratio', () => {
    // 3 players should fail (< 4)
    expect(validateSettings(DEFAULT_SETTINGS, 3).valid).toBe(false);

    // 4 players with 2 mafia should fail (mafia must be strictly less than half)
    const settings2Mafia = {
      ...DEFAULT_SETTINGS,
      roles: { ...DEFAULT_SETTINGS.roles, mafia: { count: 2 }, godfather: { enabled: false, count: 0 } },
    };
    expect(validateSettings(settings2Mafia, 4).valid).toBe(false);

    // 5 players with 1 mafia, 1 doctor, 1 police should succeed
    const validSettings = {
      ...DEFAULT_SETTINGS,
      roles: {
        ...DEFAULT_SETTINGS.roles,
        mafia: { count: 1 },
        godfather: { enabled: false, count: 0 },
        doctor: { enabled: true, count: 1 },
        police: { enabled: true, count: 1 },
      },
    };
    expect(validateSettings(validSettings, 5).valid).toBe(true);
  });

  it('assigns roles cleanly without leaking duplicates', () => {
    const players: Player[] = [
      { id: 'p1', token: 't1', name: 'Alice', avatar: 1, isHost: true, isGod: false, ready: true, connected: true, lastSeen: 0, alive: true },
      { id: 'p2', token: 't2', name: 'Bob', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, alive: true },
      { id: 'p3', token: 't3', name: 'Charlie', avatar: 3, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, alive: true },
      { id: 'p4', token: 't4', name: 'Dave', avatar: 4, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, alive: true },
      { id: 'p5', token: 't5', name: 'Eve', avatar: 5, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, alive: true },
    ];

    let seed = 0.42;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const assigned = assignRoles(players, DEFAULT_SETTINGS, rng);
    expect(assigned).toHaveLength(5);
    const roles = assigned.map((p) => p.role);
    expect(roles.filter((r) => r === 'mafia').length).toBe(1);
    expect(roles.filter((r) => r === 'godfather').length).toBe(0);
  });

  it('correctly calculates Town, Mafia, and Jester win states', () => {
    const townPlayers: Player[] = [
      { id: 'p1', token: 't1', name: 'A', avatar: 1, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
      { id: 'p2', token: 't2', name: 'B', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'doctor', alive: true },
      { id: 'p3', token: 't3', name: 'C', avatar: 3, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'mafia', alive: false },
    ];
    expect(checkWinCondition(townPlayers)).toBe('town');

    const mafiaPlayers: Player[] = [
      { id: 'p1', token: 't1', name: 'A', avatar: 1, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
      { id: 'p2', token: 't2', name: 'B', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'mafia', alive: true },
    ];
    // Mafia equal to town -> Mafia wins
    expect(checkWinCondition(mafiaPlayers)).toBe('mafia');

    // Jester voted out -> Jester wins instantly
    expect(checkWinCondition(townPlayers, true)).toBe('jester');

    // 1 Mafia leaves -> game ends because mafia left (Town wins)
    const playersWithMafiaLeaving: Player[] = [
      { id: 'p1', token: 't1', name: 'Citizen Vance', avatar: 1, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
      { id: 'p2', token: 't2', name: 'Doctor Smith', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'doctor', alive: true },
      { id: 'p3', token: 't3', name: 'Mafia Boss', avatar: 3, isHost: false, isGod: false, ready: true, connected: false, lastSeen: 0, role: 'mafia', alive: false, diedBy: 'left' },
    ];
    expect(checkWinCondition(playersWithMafiaLeaving)).toBe('town');

    // Civilians leave -> Mafia left outnumbers or equals town (Mafia wins)
    const playersWithCivLeaving: Player[] = [
      { id: 'p1', token: 't1', name: 'Citizen Vance', avatar: 1, isHost: false, isGod: false, ready: true, connected: false, lastSeen: 0, role: 'civilian', alive: false, diedBy: 'left' },
      { id: 'p2', token: 't2', name: 'Doctor Smith', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'doctor', alive: true },
      { id: 'p3', token: 't3', name: 'Mafia Boss', avatar: 3, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'mafia', alive: true },
    ];
    expect(checkWinCondition(playersWithCivLeaving)).toBe('mafia');
  });
});

describe('Mafia Engine: Night Resolution & Voting', () => {
  const baseState: GameState = {
    code: 'TEST1',
    version: 1,
    phase: 'night',
    round: 1,
    phaseEndsAt: 100000,
    paused: false,
    settings: { ...DEFAULT_SETTINGS, noKillFirstNight: false },
    players: [
      { id: 'm1', token: 'tm1', name: 'Mafia1', avatar: 1, isHost: true, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'mafia', alive: true },
      { id: 'd1', token: 'td1', name: 'Doctor1', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'doctor', alive: true },
      { id: 'c1', token: 'tc1', name: 'Civ1', avatar: 3, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
      { id: 'c2', token: 'tc2', name: 'Civ2', avatar: 4, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
    ],
    night: {
      subPhase: 'mafia',
      picks: {
        m1: 'c1', // Mafia targets Civ1
        d1: 'c2', // Doctor protects Civ2
      },
      confirmed: {},
      locked: {},
      earlyEndAt: null,
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

  it('eliminates victim when Doctor protects the wrong target', () => {
    const { morningDeaths, savedPlayers } = resolveNight(baseState, () => 0.5, 1000);
    expect(morningDeaths).toContain('c1');
    expect(savedPlayers).toHaveLength(0);
  });

  it('saves target when Doctor successfully shields Mafia target', () => {
    const stateWithSave: GameState = {
      ...baseState,
      night: {
        ...baseState.night,
        picks: {
          m1: 'c1', // Mafia targets c1
          d1: 'c1', // Doctor shields c1!
        },
      },
    };
    const { morningDeaths, savedPlayers } = resolveNight(stateWithSave, () => 0.5, 1000);
    expect(morningDeaths).toHaveLength(0);
    expect(savedPlayers).toContain('c1');
  });

  it('correctly tallies day votes with tie rules', () => {
    const alive = ['p1', 'p2', 'p3', 'p4'];
    const votes: Record<string, string | 'skip' | null> = {
      p1: 'p2',
      p3: 'p2',
      p4: 'p1',
    };
    const res = tallyVotes(votes, alive, 'revote_then_none', () => 0.5);
    expect(res.eliminatedId).toBe('p2');
    expect(res.skipWon).toBe(false);
  });

  it('broadcasts morning casualties and voting verdicts to both event logs and chat', () => {
    // 1. Morning resolution broadcasts
    const { nextState: morningState } = resolveNight(baseState, () => 0.5, 1000);
    const morningLog = morningState.log.find((l) => l.phase === 'morning');
    expect(Boolean(morningLog)).toBe(true);
    expect(morningLog?.text).toContain('Civ1');

    const morningChat = morningState.chat.find((m) => m.channel === 'public' && m.senderId === 'system');
    expect(Boolean(morningChat)).toBe(true);
    expect(morningChat?.text).toContain('Civ1');

    // 2. Voting resolution broadcasts via maybeAdvance
    const votingState: GameState = {
      ...baseState,
      phase: 'voting',
      phaseEndsAt: 1000,
      round: 1,
      votes: {
        m1: 'c1',
        d1: 'c1',
        c2: 'c1',
      },
      players: [
        { id: 'm1', token: 'tm1', name: 'Mafia1', avatar: 1, isHost: true, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'mafia', alive: true },
        { id: 'd1', token: 'td1', name: 'Doctor1', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'doctor', alive: true },
        { id: 'c1', token: 'tc1', name: 'Civ1', avatar: 3, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
        { id: 'c2', token: 'tc2', name: 'Civ2', avatar: 4, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
      ],
      log: [],
      chat: [],
    };

    const advancedState = maybeAdvance(votingState, 2000, () => 0.5);
    expect(advancedState.phase).toBe('voteResult');

    const voteLog = advancedState.log.find((l) => l.type === 'vote');
    expect(Boolean(voteLog)).toBe(true);
    expect(voteLog?.text).toContain('Civ1');

    const voteChat = advancedState.chat.find((m) => m.channel === 'public' && m.senderId === 'system');
    expect(Boolean(voteChat)).toBe(true);
    expect(voteChat?.text).toContain('Civ1');
  });
});

describe('Mafia Engine: View Information Masking', () => {
  it('never leaks secret roles or other player tokens to civilians', () => {
    const state: GameState = {
      code: 'SECR1',
      version: 1,
      phase: 'night',
      round: 1,
      phaseEndsAt: 1000,
      paused: false,
      settings: DEFAULT_SETTINGS,
      players: [
        { id: 'civ', token: 'secret-tok-1', name: 'Citizen', avatar: 1, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
        { id: 'maf', token: 'secret-tok-2', name: 'Mafioso', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'mafia', alive: true },
      ],
      night: { subPhase: 'mafia', picks: { maf: 'civ' }, confirmed: {}, locked: {}, earlyEndAt: null },
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

    const civilianView = buildViewFor(state, 'civ', 1000);
    // Civilian should see their own role
    expect(civilianView.me.role).toBe('civilian');
    // But other player's role MUST be undefined
    const mafPlayer = civilianView.players.find((p) => p.id === 'maf');
    expect(mafPlayer?.role).toBeUndefined();
    // Tokens of others must not exist
    expect((mafPlayer as any).token).toBeUndefined();
  });

  it('strictly hides Doctor and Police identity, targets, and suspicion from other players', () => {
    const state: GameState = {
      code: 'PRIV1',
      version: 1,
      phase: 'night',
      round: 1,
      phaseEndsAt: 1000,
      paused: false,
      settings: DEFAULT_SETTINGS,
      players: [
        { id: 'm1', token: 'tok-m1', name: 'Mafia1', avatar: 1, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'mafia', alive: true },
        { id: 'd1', token: 'tok-d1', name: 'Doctor1', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'doctor', alive: true },
        { id: 'p1', token: 'tok-p1', name: 'Police1', avatar: 3, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'police', alive: true },
        { id: 'c1', token: 'tok-c1', name: 'Civ1', avatar: 4, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
      ],
      night: {
        subPhase: 'doctor',
        picks: {
          m1: 'c1',
          d1: 'c1',
          p1: 'm1',
        },
        confirmed: { d1: true },
        locked: {},
        earlyEndAt: null,
      },
      doctorHistory: {},
      shotsUsed: {},
      policeInbox: [
        { policeId: 'p1', fromRound: 1, revealRound: 1, targetId: 'm1', result: 'Mafia', delivered: true },
      ],
      votes: {},
      revotePending: false,
      readyToVote: [],
      log: [],
      secretLog: [],
      chat: [
        { id: 'm1-chat', senderId: 'm1', senderName: 'Mafia1', channel: 'mafia', text: 'Target civ1 tonight', timestamp: 1000 },
        { id: 'pub-chat', senderId: 'c1', senderName: 'Civ1', channel: 'public', text: 'Good day all', timestamp: 1000 },
        { id: 'dead-chat', senderId: 'dead1', senderName: 'Ghost', channel: 'dead', text: 'Ooooh', timestamp: 1000 },
      ],
    };

    // 1. Check from Civilian perspective
    const civView = buildViewFor(state, 'c1', 1000);
    // Doctor and Police roles must be completely hidden
    expect(civView.players.find((p) => p.id === 'd1')?.role).toBeUndefined();
    expect(civView.players.find((p) => p.id === 'p1')?.role).toBeUndefined();
    expect(civView.players.find((p) => p.id === 'm1')?.role).toBeUndefined();
    // Civilian cannot see Doctor's pick or Police's inbox
    expect(civView.me.policeInbox).toHaveLength(0);
    expect(civView.me.nightPick).toBeNull();
    // Civilian cannot act during doctor subphase and sees decoy
    expect(civView.me.canActNow).toBe(false);
    expect(civView.nightSubPhase).toBeUndefined();
    // Civilian cannot see private mafia chat or dead chat
    expect(civView.chat.map((m) => m.channel)).not.toContain('mafia');
    expect(civView.chat.map((m) => m.channel)).not.toContain('dead');

    // 2. Check from Mafia perspective
    const mafView = buildViewFor(state, 'm1', 1000);
    expect(mafView.players.find((p) => p.id === 'd1')?.role).toBeUndefined();
    expect(mafView.players.find((p) => p.id === 'p1')?.role).toBeUndefined();
    expect(mafView.chat.map((m) => m.channel)).toContain('mafia');
    // Mafia cannot act during doctor subphase
    expect(mafView.me.canActNow).toBe(false);

    // 3. Check from Police perspective
    const policeView = buildViewFor(state, 'p1', 1000);
    expect(policeView.me.policeInbox).toHaveLength(1);
    expect(policeView.me.policeInbox![0].targetId).toBe('m1');
    expect(policeView.me.policeInbox![0].result).toBe('Mafia');
    // Police cannot see Doctor role
    expect(policeView.players.find((p) => p.id === 'd1')?.role).toBeUndefined();
  });

  it('supports skip voting cleanly in tallyVotes', () => {
    const alive = ['p1', 'p2', 'p3', 'p4', 'p5'];
    // 3 votes for skip, 2 votes for p1
    const votes: Record<string, string | 'skip' | null> = {
      p1: 'skip',
      p2: 'skip',
      p3: 'skip',
      p4: 'p1',
      p5: 'p1',
    };
    const res = tallyVotes(votes, alive, 'revote_then_none', () => 0.5);
    expect(res.eliminatedId).toBeNull();
    expect(res.skipWon).toBe(true);
  });

  it('correctly executes detective investigations including godfather immunity', () => {
    const policeState: GameState = {
      code: 'TEST1',
      version: 1,
      phase: 'night',
      round: 1,
      phaseEndsAt: 2000,
      paused: false,
      settings: DEFAULT_SETTINGS,
      players: [
        { id: 'pol', token: 't-pol', name: 'Detective', avatar: 1, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'police', alive: true },
        { id: 'maf', token: 't-maf', name: 'Mobster', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'mafia', alive: true },
        { id: 'gf', token: 't-gf', name: 'Don', avatar: 3, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'godfather', alive: true },
        { id: 'civ', token: 't-civ', name: 'Citizen', avatar: 4, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
      ],
      night: {
        subPhase: 'police',
        picks: {
          pol: 'maf',
        },
        confirmed: { pol: true },
        locked: {},
        earlyEndAt: null,
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

    // 1. Investigating regular Mafia -> 'Mafia'
    const { nextState: afterMafia } = resolveNight(policeState, () => 0.5, 1000);
    expect(afterMafia.policeInbox).toHaveLength(1);
    expect(afterMafia.policeInbox[0].targetId).toBe('maf');
    expect(afterMafia.policeInbox[0].result).toBe('Mafia');

    // 2. Investigating Godfather -> 'Not mafia' (Don immunity)
    const gfInvestigationState = {
      ...policeState,
      night: { ...policeState.night, picks: { pol: 'gf' } },
    };
    const { nextState: afterGf } = resolveNight(gfInvestigationState, () => 0.5, 1000);
    expect(afterGf.policeInbox).toHaveLength(1);
    expect(afterGf.policeInbox[0].targetId).toBe('gf');
    expect(afterGf.policeInbox[0].result).toBe('Not mafia');

    // 3. Investigating Civilian -> 'Not mafia'
    const civInvestigationState = {
      ...policeState,
      night: { ...policeState.night, picks: { pol: 'civ' } },
    };
    const { nextState: afterCiv } = resolveNight(civInvestigationState, () => 0.5, 1000);
    expect(afterCiv.policeInbox).toHaveLength(1);
    expect(afterCiv.policeInbox[0].targetId).toBe('civ');
    expect(afterCiv.policeInbox[0].result).toBe('Not mafia');
  });

  it('correctly executes vigilante marksman shots and hold fire options', () => {
    const baseState: GameState = {
      code: 'VIG01',
      version: 1,
      phase: 'night',
      round: 1,
      phaseEndsAt: 2000,
      paused: false,
      settings: { ...DEFAULT_SETTINGS, vigilanteShots: 1 },
      players: [
        { id: 'vig', token: 't-vig', name: 'Marksman', avatar: 1, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'vigilante', alive: true },
        { id: 'doc', token: 't-doc', name: 'Medic', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'doctor', alive: true },
        { id: 'maf', token: 't-maf', name: 'Mobster', avatar: 3, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'mafia', alive: true },
        { id: 'civ', token: 't-civ', name: 'Citizen', avatar: 4, isHost: false, isGod: false, ready: true, connected: true, lastSeen: 0, role: 'civilian', alive: true },
      ],
      night: {
        subPhase: 'vigilante',
        picks: {
          maf: 'civ',
          doc: 'civ',
          vig: 'maf', // Vigilante shoots mafia, Doctor saves civ
        },
        confirmed: { vig: true },
        locked: {},
        earlyEndAt: null,
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

    // 1. Vigilante eliminates Mafia; Civ saved by doctor
    const { morningDeaths, savedPlayers, nextState: state1 } = resolveNight(baseState, () => 0.5, 1000);
    expect(morningDeaths).toContain('maf');
    expect(savedPlayers).toContain('civ');
    expect(state1.players.find((p) => p.id === 'maf')?.alive).toBe(false);
    expect(state1.players.find((p) => p.id === 'civ')?.alive).toBe(true);
    expect(state1.shotsUsed['vig']).toBe(1);

    // 2. Vigilante chooses 'hold' -> No shot consumed, target not hit
    const holdState = {
      ...baseState,
      night: { ...baseState.night, picks: { maf: 'civ', doc: 'maf', vig: 'hold' } },
    };
    const { morningDeaths: deaths2, nextState: state2 } = resolveNight(holdState, () => 0.5, 1000);
    expect(deaths2).not.toContain('maf');
    expect(state2.shotsUsed['vig']).toBeUndefined();
  });
});
