import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clearRoomData, saveHostState, cleanExpiredGameData, FIVE_HOURS_MS } from './storage';
import { GameState } from './types';
import { DEFAULT_SETTINGS } from './settings';

// Mock localStorage for Node test environment
const mockStorage: Record<string, string> = {};
(global as any).window = {
  localStorage: {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
    get length() { return Object.keys(mockStorage).length; },
    key: (i: number) => Object.keys(mockStorage)[i] || null,
  },
};
(global as any).localStorage = (global as any).window.localStorage;

function createDummyState(code: string, phase: any = 'lobby', winner?: any): GameState {
  return {
    code,
    version: 1,
    phase,
    round: 1,
    phaseEndsAt: null,
    paused: false,
    settings: DEFAULT_SETTINGS,
    players: [],
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
    winner,
  };
}

describe('Storage Management & Auto-Expiration', () => {
  beforeEach(() => {
    (global as any).localStorage.clear();
  });

  it('clearRoomData purges all room-specific keys from localStorage', () => {
    const code = 'TEST1';
    localStorage.setItem(`mafia-host:${code}`, '{"code":"TEST1"}');
    localStorage.setItem(`mafia-is-host:${code}`, 'true');
    localStorage.setItem(`mafia-token:${code}`, 'token_abc');
    localStorage.setItem(`mafia-notes:${code}`, 'some notes');
    localStorage.setItem(`mafia-updated:${code}`, '123456');

    clearRoomData(code);

    assert.strictEqual(localStorage.getItem(`mafia-host:${code}`), null);
    assert.strictEqual(localStorage.getItem(`mafia-is-host:${code}`), null);
    assert.strictEqual(localStorage.getItem(`mafia-token:${code}`), null);
    assert.strictEqual(localStorage.getItem(`mafia-notes:${code}`), null);
    assert.strictEqual(localStorage.getItem(`mafia-updated:${code}`), null);
  });

  it('cleanExpiredGameData purges completed games immediately', () => {
    const code = 'WON99';
    const finishedState = createDummyState(code, 'gameOver', 'town');
    saveHostState(code, finishedState);

    cleanExpiredGameData();

    assert.strictEqual(localStorage.getItem(`mafia-host:${code}`), null);
    assert.strictEqual(localStorage.getItem(`mafia-updated:${code}`), null);
  });

  it('cleanExpiredGameData deletes unsolved games older than 5 hours', () => {
    const oldCode = 'OLD01';
    const activeState = createDummyState(oldCode, 'discussion');
    saveHostState(oldCode, activeState);

    // Artificially age the game to 6 hours ago
    const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
    localStorage.setItem(`mafia-updated:${oldCode}`, String(sixHoursAgo));

    cleanExpiredGameData(FIVE_HOURS_MS);

    assert.strictEqual(localStorage.getItem(`mafia-host:${oldCode}`), null);
    assert.strictEqual(localStorage.getItem(`mafia-updated:${oldCode}`), null);
  });

  it('cleanExpiredGameData preserves active games younger than 5 hours', () => {
    const freshCode = 'FRESH';
    const activeState = createDummyState(freshCode, 'night');
    saveHostState(freshCode, activeState);

    // Artificially age the game to 1 hour ago
    const oneHourAgo = Date.now() - (1 * 60 * 60 * 1000);
    localStorage.setItem(`mafia-updated:${freshCode}`, String(oneHourAgo));

    cleanExpiredGameData(FIVE_HOURS_MS);

    assert.notStrictEqual(localStorage.getItem(`mafia-host:${freshCode}`), null);
  });
});
