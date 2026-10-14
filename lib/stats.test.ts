import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPlayerStats,
  recordMatchCompletion,
  resetPlayerStats,
  computeMatchAwards,
} from './stats';
import { PlayerView } from './types';

describe('Player Stats, Achievements, and Match Awards', () => {
  // Mock localStorage for node environment
  const mockStorage: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => {
      mockStorage[key] = val;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    },
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('records match completion and updates role counts and win records', () => {
    const res = recordMatchCompletion('match-1', 'town', 'doctor', true, 180);
    assert.equal(res.stats.gamesPlayed, 1);
    assert.equal(res.stats.wins, 1);
    assert.equal(res.stats.losses, 0);
    assert.equal(res.stats.roleCounts.doctor, 1);
    assert.equal(res.stats.roleWins.doctor, 1);
    assert.equal(res.stats.currentStreak, 1);
  });

  it('guarantees idempotency: duplicate match IDs are never counted twice', () => {
    recordMatchCompletion('match-dup-1', 'town', 'police', true, 200);
    const res2 = recordMatchCompletion('match-dup-1', 'town', 'police', true, 200);

    assert.equal(res2.stats.gamesPlayed, 1);
    assert.equal(res2.stats.wins, 1);
  });

  it('resets player stats cleanly without crashing', () => {
    recordMatchCompletion('match-to-reset', 'mafia', 'mafia', true, 150);
    resetPlayerStats();
    const stats = getPlayerStats();
    assert.equal(stats.gamesPlayed, 0);
    assert.equal(stats.wins, 0);
  });

  it('computes Lone Wolf award when single surviving Mafia claims victory', () => {
    const players: PlayerView[] = [
      { id: 'p1', name: 'Al Capone', avatar: 1, isHost: true, isGod: false, ready: true, connected: true, alive: true, role: 'mafia' },
      { id: 'p2', name: 'Mob Enforcer', avatar: 2, isHost: false, isGod: false, ready: true, connected: true, alive: false, role: 'mafia' },
      { id: 'p3', name: 'Citizen Jane', avatar: 3, isHost: false, isGod: false, ready: true, connected: true, alive: false, role: 'civilian' },
    ];

    const awards = computeMatchAwards(players, [], [], 'mafia');
    const loneWolf = awards.find((a) => a.id === 'lone_wolf');
    assert.ok(loneWolf, 'Lone Wolf award should be awarded');
    assert.equal(loneWolf.recipientName, 'Al Capone');
  });

  it('computes Sharpest Eye award when town member survives and wins', () => {
    const players: PlayerView[] = [
      { id: 'p1', name: 'Detective Sherlock', avatar: 4, isHost: true, isGod: false, ready: true, connected: true, alive: true, role: 'police' },
      { id: 'p2', name: 'Fallen Mafioso', avatar: 1, isHost: false, isGod: false, ready: true, connected: true, alive: false, role: 'mafia' },
    ];

    const awards = computeMatchAwards(players, [], [], 'town');
    const sharpestEye = awards.find((a) => a.id === 'sharpest_eye');
    assert.ok(sharpestEye, 'Sharpest Eye award should be awarded');
    assert.equal(sharpestEye.recipientName, 'Detective Sherlock');
  });
});
