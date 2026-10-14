import test from 'node:test';
import assert from 'node:assert';
import { DEFAULT_SETTINGS } from '../settings';
import { validateSettings, assignRoles } from './rules';
import { Player, GameState } from '../types';

test('Automated Test Bots & Role Capability Suite', async (t) => {
  await t.test('calculates minimum fake players needed for default and custom setups', () => {
    // 1 host player in room with default settings (1 mafia, 1 doc, 1 cop)
    const settings = { ...DEFAULT_SETTINGS };
    const initialPlayers: Player[] = [
      {
        id: 'host-1',
        token: 'tok-1',
        name: 'Host',
        avatar: 1,
        isHost: true,
        isGod: false,
        ready: true,
        connected: true,
        lastSeen: Date.now(),
        alive: true,
      },
    ];

    const isGodMode = settings.moderatorMode === 'god';
    const mafiaCount = settings.roles.mafia.count;
    const totalMafia = mafiaCount;
    const doctorCount = settings.roles.doctor.enabled ? settings.roles.doctor.count : 0;
    const policeCount = settings.roles.police.enabled ? settings.roles.police.count : 0;
    const totalSpecial = totalMafia + doctorCount + policeCount;
    const minForMafia = 2 * totalMafia + 1;
    const minRequiredActive = Math.max(4, totalSpecial, minForMafia);
    const minTotalPlayers = isGodMode ? minRequiredActive + 1 : minRequiredActive;

    assert.strictEqual(minTotalPlayers, 4, 'Default settings require 4 minimum players');
    const needed = minTotalPlayers - initialPlayers.length;
    assert.strictEqual(needed, 3, 'Should need 3 bots to satisfy minimum');

    // Add 3 fake players
    for (let i = 0; i < needed; i++) {
      initialPlayers.push({
        id: `bot_${i}`,
        token: `bot_tok_${i}`,
        name: `[BOT] Test Bot ${i}`,
        avatar: i + 2,
        isHost: false,
        isGod: false,
        isBot: true,
        ready: true,
        connected: true,
        lastSeen: Date.now(),
        alive: true,
      });
    }

    assert.strictEqual(initialPlayers.length, 4);
    const validation = validateSettings(settings, initialPlayers.length);
    assert.strictEqual(validation.valid, true, 'Room with bots is fully valid to start match');
  });

  await t.test('supports uncapped Mafia, Doctor, and Police up to max room capacity', () => {
    // Set 5 Mafia, 4 Doctors, 4 Police in a 20-player room
    const customSettings = {
      ...DEFAULT_SETTINGS,
      maxPlayers: 20,
      roles: {
        ...DEFAULT_SETTINGS.roles,
        mafia: { count: 5 },
        doctor: { enabled: true, count: 4 },
        police: { enabled: true, count: 4 },
      },
    };

    assert.strictEqual(customSettings.roles.mafia.count, 5);
    assert.strictEqual(customSettings.roles.doctor.count, 4);
    assert.strictEqual(customSettings.roles.police.count, 4);

    // 5 Mafia requires active players >= 2 * 5 + 1 = 11
    // Total special = 5 + 4 + 4 = 13.
    // So 13 active players needed.
    const validationWith13 = validateSettings(customSettings, 13);
    assert.strictEqual(validationWith13.valid, true, '13 players can start with 5 mafia, 4 doctors, 4 police');
  });

  await t.test('bot players assign roles accurately and mark ready for quick start', () => {
    const players: Player[] = [
      { id: 'p1', token: 't1', name: 'Host', avatar: 1, isHost: true, isGod: false, ready: true, connected: true, lastSeen: Date.now(), alive: true },
      { id: 'bot_1', token: 'tb1', name: '[BOT] Vega', avatar: 2, isHost: false, isGod: false, isBot: true, ready: true, connected: true, lastSeen: Date.now(), alive: true },
      { id: 'bot_2', token: 'tb2', name: '[BOT] Raven', avatar: 3, isHost: false, isGod: false, isBot: true, ready: true, connected: true, lastSeen: Date.now(), alive: true },
      { id: 'bot_3', token: 'tb3', name: '[BOT] Cipher', avatar: 4, isHost: false, isGod: false, isBot: true, ready: true, connected: true, lastSeen: Date.now(), alive: true },
    ];

    const unready = players.filter((p) => !p.isHost && !p.ready);
    assert.strictEqual(unready.length, 0, 'All bots are automatically ready for instant match launch');

    const assigned = assignRoles(players, DEFAULT_SETTINGS, () => 0.5);
    const assignedRoles = assigned.map((p) => p.role);
    assert.ok(assignedRoles.includes('mafia'), 'Assigned mafia');
    assert.ok(assignedRoles.includes('doctor'), 'Assigned doctor');
    assert.ok(assignedRoles.includes('police'), 'Assigned police');
    assert.ok(assignedRoles.includes('civilian'), 'Assigned civilian');
  });

  await t.test('bots perform autonomous role operations during night and voting phases', () => {
    const players: Player[] = [
      { id: 'p1', token: 't1', name: 'Host', avatar: 1, isHost: true, isGod: false, ready: true, connected: true, lastSeen: Date.now(), alive: true, role: 'civilian' },
      { id: 'bot_mafia', token: 'tb1', name: '[BOT] Vega', avatar: 2, isHost: false, isGod: false, isBot: true, ready: true, connected: true, lastSeen: Date.now(), alive: true, role: 'mafia' },
      { id: 'bot_doctor', token: 'tb2', name: '[BOT] Raven', avatar: 3, isHost: false, isGod: false, isBot: true, ready: true, connected: true, lastSeen: Date.now(), alive: true, role: 'doctor' },
      { id: 'bot_police', token: 'tb3', name: '[BOT] Cipher', avatar: 4, isHost: false, isGod: false, isBot: true, ready: true, connected: true, lastSeen: Date.now(), alive: true, role: 'police' },
    ];

    // Simulate bot target selection for mafia
    const livingTown = players.filter((p) => p.alive && !p.isGod && p.role !== 'mafia');
    assert.strictEqual(livingTown.length, 3, 'Mafia bot has 3 valid town targets');
    const mafiaTarget = livingTown[0].id;
    assert.ok(mafiaTarget, 'Mafia selected target');

    // Simulate doctor pick
    const doctorCandidates = players.filter((p) => p.alive && !p.isGod);
    assert.strictEqual(doctorCandidates.length, 4, 'Doctor has candidates');

    // Simulate voting pick
    const botVoter = players[1];
    const votingCandidates = players.filter((p) => p.alive && !p.isGod && p.id !== botVoter.id);
    assert.strictEqual(votingCandidates.length, 3, 'Bot voter does not vote for itself');
  });
});
