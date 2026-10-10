import { GameState } from './types';

export const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

/**
 * Completely purges all data for a specific room code from localStorage.
 * Called when a game is finished / left by the player.
 */
export function clearRoomData(code: string) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const cleanCode = code.toUpperCase();
  localStorage.removeItem(`mafia-host:${cleanCode}`);
  localStorage.removeItem(`mafia-is-host:${cleanCode}`);
  localStorage.removeItem(`mafia-token:${cleanCode}`);
  localStorage.removeItem(`mafia-notes:${cleanCode}`);
  localStorage.removeItem(`mafia-updated:${cleanCode}`);
}

/**
 * Saves authoritative host game state with an explicit timestamp.
 */
export function saveHostState(code: string, state: GameState) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const cleanCode = code.toUpperCase();
  const now = Date.now();
  state.updatedAt = now;
  try {
    localStorage.setItem(`mafia-host:${cleanCode}`, JSON.stringify(state));
    localStorage.setItem(`mafia-updated:${cleanCode}`, String(now));
  } catch (err) {
    // If quota exceeded, perform an immediate purge of expired rooms
    cleanExpiredGameData();
  }
}

/**
 * Sweeps localStorage to remove:
 * 1. Games that are finished (phase === 'gameOver' or winner is set).
 * 2. Unsolved / unfinished games that have been inactive for more than 5 hours.
 * 3. Orphaned tokens or notes without active sessions.
 */
export function cleanExpiredGameData(maxAgeMs = FIVE_HOURS_MS) {
  if (typeof window === 'undefined' || !window.localStorage) return;

  const now = Date.now();
  const codesToCheck = new Set<string>();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const match = key.match(/^mafia-(?:host|token|is-host|notes|updated):([A-Z0-9]+)$/i);
    if (match) {
      codesToCheck.add(match[1].toUpperCase());
    }
  }

  codesToCheck.forEach((code) => {
    let shouldDelete = false;
    const updatedRaw = localStorage.getItem(`mafia-updated:${code}`);
    let lastActivity = updatedRaw ? parseInt(updatedRaw, 10) : 0;

    const hostRaw = localStorage.getItem(`mafia-host:${code}`);
    if (hostRaw) {
      try {
        const state: GameState = JSON.parse(hostRaw);
        // If the game has concluded, it should be deleted
        if (state.phase === 'gameOver' || Boolean(state.winner)) {
          shouldDelete = true;
        }

        if (!lastActivity) {
          if (state.updatedAt) lastActivity = state.updatedAt;
          else if (state.chat && state.chat.length > 0) {
            lastActivity = state.chat[state.chat.length - 1].timestamp;
          } else if (state.log && state.log.length > 0) {
            lastActivity = state.log[state.log.length - 1].timestamp;
          }
        }
      } catch (_) {
        shouldDelete = true; // Corrupted JSON
      }
    }

    // If unresolved game is older than maxAgeMs (default 5 hours)
    if (!shouldDelete) {
      if (lastActivity && now - lastActivity > maxAgeMs) {
        shouldDelete = true;
      } else if (!lastActivity && !hostRaw) {
        // Orphaned token/notes without an active host state
        shouldDelete = true;
      }
    }

    if (shouldDelete) {
      clearRoomData(code);
    }
  });
}
