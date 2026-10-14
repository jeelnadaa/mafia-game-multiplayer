import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SimulatedRoom, VirtualNetworkHub } from './peer-simulator';
import { PLAYER_COLORS } from '../settings';

function expect(actual: any) {
  return {
    toBe: (expected: any) => assert.strictEqual(actual, expected),
    toEqual: (expected: any) => assert.deepStrictEqual(actual, expected),
    toHaveLength: (length: number) => assert.strictEqual(actual?.length, length),
    toBeGreaterThan: (n: number) => assert.ok(actual > n, `Expected ${actual} > ${n}`),
    toBeDefined: () => assert.ok(actual !== undefined && actual !== null),
    toBeUndefined: () => assert.strictEqual(actual, undefined),
  };
}

describe('In-Memory Peer Simulator: Multi-Peer Integration', () => {
  it('connects 4, 8, and 12 players with distinct identities and colors', () => {
    // 4 Players
    const room4 = new SimulatedRoom('ROOM4', 'HostAlice', 1);
    for (let i = 1; i < 4; i++) {
      room4.joinPlayer(`peer_${i}`, `Player${i}`, i + 1);
    }
    expect(room4.hostState.players).toHaveLength(4);
    const colors4 = room4.hostState.players.map((p) => p.color);
    expect(new Set(colors4).size).toBe(4);

    // 8 Players
    const room8 = new SimulatedRoom('ROOM8', 'HostBob', 1);
    for (let i = 1; i < 8; i++) {
      room8.joinPlayer(`peer_${i}`, `Player${i}`, (i % 12) + 1);
    }
    expect(room8.hostState.players).toHaveLength(8);
    const colors8 = room8.hostState.players.map((p) => p.color);
    expect(new Set(colors8).size).toBe(8);

    // 12 Players
    const room12 = new SimulatedRoom('ROOM12', 'HostCharlie', 1);
    for (let i = 1; i < 12; i++) {
      room12.joinPlayer(`peer_${i}`, `Player${i}`, (i % 12) + 1);
    }
    expect(room12.hostState.players).toHaveLength(12);
    const colors12 = room12.hostState.players.map((p) => p.color);
    expect(new Set(colors12).size).toBe(12);
  });

  it('propagates host settings changes in real-time to all connected peer views', () => {
    const room = new SimulatedRoom('SET01', 'Host', 1);
    room.joinPlayer('client_1', 'Client1', 2);
    room.joinPlayer('client_2', 'Client2', 3);

    // Verify initial settings match
    expect(room.clientViews.get('client_1')?.settings.discussionDuration).toBe(120);

    // Host updates discussionDuration to 90s and voteVisibility to anonymous
    room.updateHostSettings({
      discussionDuration: 90,
      voteVisibility: 'anonymous',
      endNightEarly: false,
    });

    // Verify both peers received updated settings
    const v1 = room.clientViews.get('client_1');
    const v2 = room.clientViews.get('client_2');
    expect(v1?.settings.discussionDuration).toBe(90);
    expect(v1?.settings.voteVisibility).toBe('anonymous');
    expect(v1?.settings.endNightEarly).toBe(false);
    expect(v2?.settings.discussionDuration).toBe(90);
  });

  it('ensures late joiners receive the current host settings snapshot, not defaults', () => {
    const room = new SimulatedRoom('LATE1', 'Host', 1);

    // Host updates settings before client joins
    room.updateHostSettings({
      nightDuration: 60,
      doctorSelfSave: 'never',
      revealRoleOnDeath: 'none',
    });

    // Client joins late
    const lateView = room.joinPlayer('late_peer', 'LateComer', 5);
    expect(lateView).toBeDefined();
    expect(lateView?.settings.nightDuration).toBe(60);
    expect(lateView?.settings.doctorSelfSave).toBe('never');
    expect(lateView?.settings.revealRoleOnDeath).toBe('none');
  });

  it('restores role, state, and identity idempotently on player reconnect with token', () => {
    const room = new SimulatedRoom('REC01', 'Host', 1);
    const tokenP1 = 'token_persisted_p1';
    room.joinPlayer('peer_conn_1', 'Ravi', 4, tokenP1);
    for (let i = 2; i <= 4; i++) {
      room.joinPlayer(`peer_conn_${i}`, `P${i}`, i);
    }

    // Start game
    room.hostState.settings.roles.mafia.count = 1;
    const startRes = room.startGame();
    expect(startRes.ok).toBe(true);

    const raviPlayer = room.hostState.players.find((p) => p.token === tokenP1)!;
    const assignedRole = raviPlayer.role;
    const assignedColor = raviPlayer.color;
    expect(assignedRole).toBeDefined();

    // Disconnect Ravi
    room.disconnectPlayer('peer_conn_1');
    expect(raviPlayer.connected).toBe(false);

    // Ravi reconnects with new WebRTC connection ID but same persistent token
    const restoredView = room.joinPlayer('peer_conn_1_reconnect', 'Ravi', 4, tokenP1);
    expect(restoredView).toBeDefined();
    expect(restoredView?.me.name).toBe('Ravi');
    expect(restoredView?.me.role).toBe(assignedRole);
    expect(restoredView?.me.color).toBe(assignedColor);
    expect(raviPlayer.connected).toBe(true);
  });

  it('migrates host smoothly when host leaves, continuing the game with updated authority', () => {
    const room = new SimulatedRoom('MIG01', 'HostOriginal', 1);
    room.joinPlayer('client_a', 'Alice', 2);
    room.joinPlayer('client_b', 'Bob', 3);
    room.joinPlayer('client_c', 'Charlie', 4);

    expect(room.hostState.players[0].isHost).toBe(true);
    expect(room.hostState.players[1].isHost).toBe(false);

    // Host migrates to Alice (client_a)
    room.migrateHost('client_a');

    expect(room.hostId).toBe('client_a');
    expect(room.hostState.players[0].isHost).toBe(false);
    expect(room.hostState.players[1].isHost).toBe(true);

    // All views reflect new host status
    const aliceView = room.clientViews.get('client_a');
    expect(aliceView?.me.isHost).toBe(true);
    const bobView = room.clientViews.get('client_b');
    expect(bobView?.players.find((p) => p.id === 'client_a')?.isHost).toBe(true);
  });

  it('strictly isolates secret roles across network data serialization', () => {
    const room = new SimulatedRoom('ISOL1', 'HostGod', 1);
    for (let i = 1; i <= 4; i++) {
      room.joinPlayer(`p_${i}`, `Player${i}`, i);
    }

    room.hostState.settings.roles.mafia.count = 1;
    room.startGame();

    // Find non-mafia civilian
    const civilian = room.hostState.players.find((p) => p.role !== 'mafia' && p.role !== 'godfather' && p.id !== room.hostId)!;
    const civilianView = room.clientViews.get(civilian.id)!;

    // Check every other player in civilian's view
    for (const other of civilianView.players) {
      if (other.id !== civilian.id) {
        expect(other.role).toBeUndefined();
      }
    }
  });
});
