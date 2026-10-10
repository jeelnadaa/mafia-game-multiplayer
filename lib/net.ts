import { z } from 'zod';
import { GameState, IntentMessage, ClientGameView, Player } from './types';
import { buildViewFor } from './engine/view';
import { maybeAdvance } from './engine/phases';

// Protocol Zod Schemas
export const ClientHelloSchema = z.object({
  type: z.literal('hello'),
  code: z.string(),
  name: z.string().min(1).max(20),
  avatar: z.number().int().min(1).max(12),
  token: z.string().optional(),
});

export const ClientIntentSchema = z.object({
  type: z.literal('intent'),
  reqId: z.string(),
  intentType: z.string(),
  payload: z.any(),
});

export const ClientChatSchema = z.object({
  type: z.literal('chat'),
  channel: z.enum(['public', 'mafia', 'dead', 'god']),
  text: z.string().min(1).max(300),
});

export const ClientPingSchema = z.object({
  type: z.literal('ping'),
  t: z.number(),
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
  ClientHelloSchema,
  ClientIntentSchema,
  ClientChatSchema,
  ClientPingSchema,
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export interface HostNetworkCallbacks {
  onStateChange: (state: GameState) => void;
  onConnectionChange: (connectedCount: number) => void;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  const bytes = new Uint8Array(5);
  if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 5; i++) {
      result += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 5; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return result;
}

export function generateToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'tok_' + Math.random().toString(36).substring(2, 12);
}

// Inline Web Worker for authoritative host ticks (250ms)
export function createTickWorker(onTick: () => void): { terminate: () => void } {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    const id = setInterval(onTick, 250);
    return { terminate: () => clearInterval(id) };
  }

  const blob = new Blob(
    [`setInterval(function(){ postMessage('tick'); }, 250);`],
    { type: 'application/javascript' }
  );
  const workerUrl = URL.createObjectURL(blob);
  const worker = new Worker(workerUrl);

  worker.onmessage = () => onTick();

  return {
    terminate: () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    },
  };
}

// Request Screen Wake Lock API
export async function requestScreenWakeLock(): Promise<{ release: () => void } | null> {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      const lock = await (navigator as any).wakeLock.request('screen');
      return {
        release: () => lock.release(),
      };
    } catch {
      return null;
    }
  }
  return null;
}

/** Get the absolute shareable URL for a room code dynamically on Vercel or any deployment */
export function getRoomShareUrl(code: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/room/${code}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/room/${code}`;
  }
  return `http://localhost:3000/room/${code}`;
}
