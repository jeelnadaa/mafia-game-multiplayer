import { describe, it, expect } from 'vitest';
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
});
