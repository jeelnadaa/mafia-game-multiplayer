import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function expect(actual: any) {
  return {
    toBe: (expected: any) => assert.strictEqual(actual, expected),
    toEqual: (expected: any) => assert.deepStrictEqual(actual, expected),
    toHaveLength: (length: number) => assert.strictEqual(actual?.length, length),
    toBeGreaterThan: (n: number) => assert.ok(actual > n, `Expected ${actual} > ${n}`),
    not: {
      toBe: (expected: any) => assert.notStrictEqual(actual, expected),
    },
  };
}
import {
  ClientHelloSchema,
  ClientIntentSchema,
  ClientChatSchema,
  ClientPingSchema,
  ClientMessageSchema,
  generateRoomCode,
  generateToken,
} from './net';

describe('Network Protocol & Zod Validation', () => {
  it('validates client hello message', () => {
    const validHello = {
      type: 'hello',
      code: 'ABCDE',
      name: 'Player1',
      avatar: 3,
    };
    expect(ClientHelloSchema.safeParse(validHello).success).toBe(true);

    const invalidHello = {
      type: 'hello',
      code: 'ABCDE',
      name: '', // Empty name should fail
      avatar: 15, // Out of bounds avatar
    };
    expect(ClientHelloSchema.safeParse(invalidHello).success).toBe(false);
  });

  it('validates client intent message', () => {
    const validIntent = {
      type: 'intent',
      reqId: 'req_123',
      intentType: 'vote',
      payload: { targetId: 'p2' },
    };
    expect(ClientIntentSchema.safeParse(validIntent).success).toBe(true);
  });

  it('validates client chat message and rejects long text', () => {
    const validChat = {
      type: 'chat',
      channel: 'public',
      text: 'Who is suspicious?',
    };
    expect(ClientChatSchema.safeParse(validChat).success).toBe(true);

    const tooLongChat = {
      type: 'chat',
      channel: 'public',
      text: 'a'.repeat(301),
    };
    expect(ClientChatSchema.safeParse(tooLongChat).success).toBe(false);
  });

  it('generates 5-character uppercase alphanumeric room codes', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateRoomCode();
      expect(code).toHaveLength(5);
      expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
    }
  });

  it('generates distinct secure player tokens', () => {
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
    expect(t1.length).toBeGreaterThan(6);
  });

  it('generates production-ready room share URLs', () => {
    const { getRoomShareUrl } = require('./net');
    const shareUrl = getRoomShareUrl('ABCDE');
    expect(shareUrl.includes('/room/ABCDE')).toBe(true);
    expect(shareUrl.startsWith('https://') || shareUrl.startsWith('http://')).toBe(true);
  });

  it('provides multi-STUN fallback servers in getIceConfig', async () => {
    const { getIceConfig } = require('./net');
    const config = await getIceConfig();
    expect(Array.isArray(config.iceServers)).toBe(true);
    expect(config.iceServers.length).toBeGreaterThan(2);
    const urls = config.iceServers.flatMap((s: any) => (Array.isArray(s.urls) ? s.urls : [s.urls]));
    expect(urls.some((u: string) => u.includes('google'))).toBe(true);
    expect(urls.some((u: string) => u.includes('cloudflare'))).toBe(true);
  });

  it('assigns 100% unique colors across 4, 8, and 12-player rosters', () => {
    const { PLAYER_COLORS } = require('./settings');
    expect(PLAYER_COLORS).toHaveLength(12);
    const uniqueColors = new Set(PLAYER_COLORS);
    expect(uniqueColors.size).toBe(12);

    // Verify 4-player room
    const p4 = Array.from({ length: 4 }, (_, i) => PLAYER_COLORS[i % PLAYER_COLORS.length]);
    expect(new Set(p4).size).toBe(4);

    // Verify 8-player room
    const p8 = Array.from({ length: 8 }, (_, i) => PLAYER_COLORS[i % PLAYER_COLORS.length]);
    expect(new Set(p8).size).toBe(8);

    // Verify 12-player room
    const p12 = Array.from({ length: 12 }, (_, i) => PLAYER_COLORS[i % PLAYER_COLORS.length]);
    expect(new Set(p12).size).toBe(12);
  });
});
