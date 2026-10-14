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

/** Canonical site URL constant for production / deployment */
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://the-apes.vercel.app';

/** Get the absolute shareable URL for a room code dynamically on Vercel or any deployment */
export function getRoomShareUrl(code: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/room/${code}`;
  }
  return `${SITE_URL.replace(/\/$/, '')}/room/${code}`;
}

let cachedIceServers: any[] | null = null;
let cachedIceExpiry = 0;

/** Retrieve multi-STUN and TURN configuration with short-lived credential caching */
export async function getIceConfig(): Promise<{
  iceServers: any[];
  iceTransportPolicy?: 'relay' | 'all';
}> {
  const isForceRelay =
    (typeof window !== 'undefined' &&
      Boolean(window.location?.search?.includes('relay=1') || (window as any).__FORCE_RELAY__)) ||
    process.env.NEXT_PUBLIC_FORCE_RELAY === 'true';

  const defaultStuns = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com:3478' },
  ];

  const now = Date.now();
  if (cachedIceServers && now < cachedIceExpiry) {
    return {
      iceServers: cachedIceServers,
      iceTransportPolicy: isForceRelay ? 'relay' : 'all',
    };
  }

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/turn-credentials');
      if (res.ok) {
        const data = await res.json();
        if (data.iceServers && Array.isArray(data.iceServers)) {
          cachedIceServers = data.iceServers;
          cachedIceExpiry = now + 1800000; // 30 min cache
          return {
            iceServers: data.iceServers,
            iceTransportPolicy: isForceRelay ? 'relay' : 'all',
          };
        }
      }
    } catch (_) {
      // Offline fallback
    }
  }

  return {
    iceServers: defaultStuns,
    iceTransportPolicy: isForceRelay ? 'relay' : 'all',
  };
}

/** Diagnostic helper: inspect active ICE candidate pair via getStats() */
export async function logSelectedCandidatePair(pc: RTCPeerConnection): Promise<'direct' | 'relayed' | 'connecting'> {
  if (!pc || typeof pc.getStats !== 'function') return 'direct';
  try {
    const stats = await pc.getStats();
    let selectedCandidatePair: any = null;
    stats.forEach((report) => {
      if (report.type === 'transport' && report.selectedCandidatePairId) {
        selectedCandidatePair = stats.get(report.selectedCandidatePairId);
      }
      if (report.type === 'candidate-pair' && (report.selected || report.nominated)) {
        selectedCandidatePair = report;
      }
    });

    if (selectedCandidatePair) {
      const localCand = stats.get(selectedCandidatePair.localCandidateId);
      const isRelayed = localCand?.candidateType === 'relay';
      if (process.env.NODE_ENV !== 'production' || (typeof window !== 'undefined' && window.location.search.includes('debug=1'))) {
        console.log(`[WebRTC Stats] Selected pair: ${localCand?.candidateType} ↔ ${stats.get(selectedCandidatePair.remoteCandidateId)?.candidateType} (${isRelayed ? 'TURN RELAY' : 'DIRECT P2P'})`);
      }
      return isRelayed ? 'relayed' : 'direct';
    }
  } catch (_) {}
  return 'direct';
}
