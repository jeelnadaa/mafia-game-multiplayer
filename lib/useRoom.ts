'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ClientGameView, GameState, IntentType, Player, Settings, Role, QuickReaction } from './types';
import { DEFAULT_SETTINGS, PLAYER_COLORS, getLastSettings, saveLastSettings } from './settings';
import {
  generateRoomCode,
  generateToken,
  createTickWorker,
  requestScreenWakeLock,
  getIceConfig,
  logSelectedCandidatePair,
} from './net';
import { buildViewFor } from './engine/view';
import {
  maybeAdvance,
  resolveNight,
  tallyVotes,
  getActiveRolePlayers,
  getNextNightRole,
  getSubPhaseDuration,
} from './engine/phases';
import { assignRoles, validateSettings, checkWinCondition } from './engine/rules';
import { initSound, playNightBell, playDayChime, playGavelStrike, playFanfare, setVoiceDucking } from './sfx';
import { voiceEngine } from './voice';
import { saveHostState, clearRoomData, cleanExpiredGameData } from './storage';

export interface UseRoomReturn {
  gameView: ClientGameView | null;
  isHost: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  rtt: number;
  sendIntent: (type: IntentType, payload?: any) => void;
  sendChat: (channel: 'public' | 'mafia' | 'dead' | 'god', text: string) => void;
  startMatch: () => { ok: boolean; reason?: string };
  toggleReady: () => void;
  kickPlayer: (playerId: string) => void;
  banPlayer: (playerId: string) => void;
  toggleLockRoom: () => void;
  skipPlayer: (playerId: string) => void;
  setGodMode: (targetPlayerIdOrIsGod: any, isGod?: boolean) => void;
  assignNarratorRoles: (assignments: Record<string, Role>) => void;
  updateSettings: (partial: Partial<Settings>) => void;
  updateProfile: (profile: { name?: string; avatar: number }) => void;
  setSuspicion: (targetId: string) => void;
  clearSuspicion: () => void;
  sendReaction: (reaction: QuickReaction) => void;
  addBots: () => void;
  clearBots: () => void;
  leaveRoom: () => void;
  isVoiceActive: boolean;
  isVoiceMuted: boolean;
  toggleVoice: () => Promise<{ ok: boolean; reason?: string; active?: boolean }>;
  toggleVoiceMute: () => boolean;
  speakingPeers: Record<string, boolean>;
  speakingLevels: Record<string, number>;
}

function tryAdvanceNightHelper(st: GameState, now: number): GameState {
  const subPhase = st.night.subPhase || 'mafia';
  const eligible = getActiveRolePlayers(subPhase, st);
  if (eligible.length === 0) {
    const nextRole = getNextNightRole(subPhase, st);
    if (nextRole) {
      const duration = getSubPhaseDuration(nextRole, st.settings);
      st.night.subPhase = nextRole;
      st.night.confirmed = {};
      st.phaseEndsAt = st.settings.noTimer ? null : now + duration * 1000;
      return st;
    } else {
      const rng = () => Math.random();
      const { nextState: resolvedState } = resolveNight(st, rng, now);
      return resolvedState.winner
        ? { ...resolvedState, phase: 'gameOver', phaseEndsAt: null }
        : { ...resolvedState, phase: 'morning', phaseEndsAt: st.settings.noTimer ? null : now + 7000 };
    }
  }

  if (!st.settings.endNightEarly) {
    return st;
  }

  const canAdvance = eligible
    .filter((p) => p.connected !== false)
    .every((p) => Boolean(st.night.confirmed[p.id]));

  if (canAdvance) {
    const nextRole = getNextNightRole(subPhase, st);
    if (nextRole) {
      const duration = getSubPhaseDuration(nextRole, st.settings);
      st.night.subPhase = nextRole;
      st.night.confirmed = {};
      st.phaseEndsAt = st.settings.noTimer ? null : now + duration * 1000;
    } else {
      const rng = () => Math.random();
      const { nextState: resolvedState } = resolveNight(st, rng, now);
      if (resolvedState.winner) {
        st = {
          ...resolvedState,
          phase: 'gameOver',
          phaseEndsAt: null,
        };
      } else {
        st = {
          ...resolvedState,
          phase: 'morning',
          phaseEndsAt: st.settings.noTimer ? null : now + 7000,
        };
      }
    }
  }

  return st;
}

function processBotActions(state: GameState, now: number): GameState {
  if (state.paused || state.winner || state.phase === 'lobby' || state.phase === 'gameOver') {
    return state;
  }

  const livingBots = state.players.filter((p) => (p.isBot || p.id.startsWith('bot_')) && p.alive && !p.isGod);
  if (livingBots.length === 0) return state;

  let st = { ...state };
  let modified = false;

  // 1. NIGHT PHASE: Bot night actions
  if (st.phase === 'night') {
    const subPhase = st.night.subPhase || 'mafia';
    const activePlayers = getActiveRolePlayers(subPhase, st);
    const activeBots = activePlayers.filter((p) => p.isBot || p.id.startsWith('bot_'));
    const humanActive = activePlayers.some((p) => !p.isBot && !p.id.startsWith('bot_'));

    // If human is not active in this subphase, give a gentle ~1000ms pause so transitions feel natural
    if (!humanActive && activeBots.length > 0) {
      const phaseRemaining = (st.phaseEndsAt || now) - now;
      const subPhaseDuration = getSubPhaseDuration(subPhase, st.settings) * 1000;
      const elapsed = subPhaseDuration - phaseRemaining;
      if (elapsed < 1000) {
        return state;
      }
    }

    for (const bot of activeBots) {
      if (!st.night.confirmed[bot.id]) {
        if (subPhase === 'mafia') {
          const livingTown = st.players.filter((p) => p.alive && !p.isGod && p.role !== 'mafia' && p.role !== 'godfather');
          if (livingTown.length > 0) {
            // Coordinate if another mafia member already picked
            const existingPick = Object.entries(st.night.picks).find(([mId, target]) => {
              const pl = st.players.find((p) => p.id === mId);
              return pl && (pl.role === 'mafia' || pl.role === 'godfather') && target && target !== 'hold';
            });
            const targetId = existingPick ? (existingPick[1] as string) : livingTown[Math.floor(Math.random() * livingTown.length)].id;
            st.night.picks[bot.id] = targetId;
            st.night.confirmed[bot.id] = true;
            modified = true;
          }
        } else if (subPhase === 'doctor') {
          let candidates = st.players.filter((p) => p.alive && !p.isGod);
          if (st.settings.doctorSelfSave === 'never') {
            candidates = candidates.filter((p) => p.id !== bot.id);
          }
          if (!st.settings.doctorSameTargetTwice && st.doctorHistory[bot.id]?.lastSavedId) {
            candidates = candidates.filter((p) => p.id !== st.doctorHistory[bot.id].lastSavedId);
          }
          if (candidates.length === 0) candidates = st.players.filter((p) => p.alive && !p.isGod);
          if (candidates.length > 0) {
            const targetId = candidates[Math.floor(Math.random() * candidates.length)].id;
            st.night.picks[bot.id] = targetId;
            st.night.confirmed[bot.id] = true;
            modified = true;
          }
        } else if (subPhase === 'police') {
          const candidates = st.players.filter((p) => p.alive && !p.isGod && p.id !== bot.id);
          if (candidates.length > 0) {
            const targetId = candidates[Math.floor(Math.random() * candidates.length)].id;
            st.night.picks[bot.id] = targetId;
            st.night.confirmed[bot.id] = true;
            modified = true;
          }
        } else if (subPhase === 'vigilante') {
          // On Night 1, vigilante bots hold fire to avoid arbitrary blind shots
          const candidates = st.players.filter((p) => p.alive && !p.isGod && p.id !== bot.id);
          if (st.round > 1 && candidates.length > 0 && Math.random() > 0.4) {
            const targetId = candidates[Math.floor(Math.random() * candidates.length)].id;
            st.night.picks[bot.id] = targetId;
          } else {
            st.night.picks[bot.id] = 'hold';
          }
          st.night.confirmed[bot.id] = true;
          modified = true;
        }
      }
    }

    if (modified) {
      st = tryAdvanceNightHelper(st, now);
      st.version++;
    }
  }

  // 2. DISCUSSION PHASE: Bots mark ready
  else if (st.phase === 'discussion') {
    for (const bot of livingBots) {
      if (!st.readyToVote.includes(bot.id)) {
        st.readyToVote = [...st.readyToVote, bot.id];
        modified = true;
      }
    }

    const alivePlaying = st.players.filter((p) => p.alive && !p.isGod);
    if (st.readyToVote.length >= alivePlaying.length) {
      st.phase = 'voting';
      st.phaseEndsAt = now + st.settings.votingDuration * 1000;
      st.votes = {};
      modified = true;
    }

    if (modified) {
      st.version++;
    }
  }

  // 3. VOTING PHASE: Bots cast elimination votes
  else if (st.phase === 'voting') {
    for (const bot of livingBots) {
      if (!st.votes[bot.id]) {
        const candidates = st.players.filter((p) => p.alive && !p.isGod && p.id !== bot.id);
        if (candidates.length > 0) {
          const targetId = candidates[Math.floor(Math.random() * candidates.length)].id;
          st.votes[bot.id] = targetId;
          modified = true;
        }
      }
    }

    const alivePlayers = st.players.filter((p) => p.alive && !p.isGod);
    const allVoted = alivePlayers.length > 0 && alivePlayers.every((p) => Boolean(st.votes[p.id]));
    if (allVoted) {
      st.phaseEndsAt = Math.min(st.phaseEndsAt || now + 1000, now + 1000);
      modified = true;
    }

    if (modified) {
      st.version++;
    }
  }

  return st;
}

export function useRoom(
  roomCode: string,
  playerName = 'Player',
  playerAvatar = 1,
  options?: { enabled?: boolean }
): UseRoomReturn {
  const [gameView, setGameView] = useState<ClientGameView | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(options?.enabled !== false);
  const [error, setError] = useState<string | null>(null);
  const [rtt, setRtt] = useState(18);

  const hostStateRef = useRef<GameState | null>(null);
  const myPlayerIdRef = useRef<string>('');
  const peerRef = useRef<any>(null);
  const clientConnRef = useRef<any>(null);
  const connectionsRef = useRef<Record<string, any>>({});
  const tickWorkerRef = useRef<{ terminate: () => void } | null>(null);
  const pingIntervalRef = useRef<any>(null);
  const lastPhaseRef = useRef<string>('');

  // Voice Chat State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [speakingPeers, setSpeakingPeers] = useState<Record<string, boolean>>({});
  const [speakingLevels, setSpeakingLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    voiceEngine.setRoom(roomCode);
    setIsVoiceActive(voiceEngine.isVoiceActive());
    setIsVoiceMuted(voiceEngine.isMuted());
    return () => {
      voiceEngine.leaveRoom(roomCode);
    };
  }, [roomCode]);

  useEffect(() => {
    return voiceEngine.subscribe((map, levels) => {
      const resolved: Record<string, boolean> = { ...map };
      const resolvedLevels: Record<string, number> = { ...(levels || {}) };
      if (myPlayerIdRef.current) {
        if (map['local'] !== undefined) resolved[myPlayerIdRef.current] = map['local'];
        if (levels && levels['local'] !== undefined) resolvedLevels[myPlayerIdRef.current] = levels['local'];
      }
      setSpeakingPeers(resolved);
      setSpeakingLevels(resolvedLevels);
      const speaking = Object.values(resolved).some(Boolean);
      setVoiceDucking(speaking);
    });
  }, []);

  useEffect(() => {
    if (gameView) {
      voiceEngine.updateRoster(gameView.players, myPlayerIdRef.current, gameView.phase);
    }
  }, [gameView?.phase, gameView?.me?.alive, gameView?.players]);

  // 1. Initialize Audio, Identity, and Purge Expired Game Data
  useEffect(() => {
    initSound();
    cleanExpiredGameData();
    let savedToken = localStorage.getItem(`mafia-token:${roomCode}`);
    if (!savedToken) {
      savedToken = generateToken();
      localStorage.setItem(`mafia-token:${roomCode}`, savedToken);
    }
    myPlayerIdRef.current = savedToken.substring(0, 10);
  }, [roomCode]);

  // Push authoritative view to all players or local UI
  const pushViews = useCallback((state: GameState) => {
    const now = Date.now();
    hostStateRef.current = state;

    // Save to host storage with timestamped expiration tracking
    saveHostState(state.code, state);

    // Host's own view
    const hostView = buildViewFor(state, myPlayerIdRef.current, now);
    setGameView(hostView);

    // Push to connected client peers
    Object.entries(connectionsRef.current).forEach(([playerId, conn]) => {
      if (conn && conn.open) {
        const clientView = buildViewFor(state, playerId, now);
        conn.send({
          type: 'view',
          version: state.version,
          serverNow: now,
          view: clientView,
        });
      }
    });

    // Sound cue on phase change
    if (lastPhaseRef.current !== state.phase) {
      lastPhaseRef.current = state.phase;
      if (state.phase === 'night') playNightBell();
      else if (state.phase === 'morning') playDayChime();
      else if (state.phase === 'voteResult') playGavelStrike();
      else if (state.phase === 'gameOver' && state.winner) playFanfare(state.winner);
    }
  }, []);

  // Comprehensive player disconnect & leave handler
  const handlePlayerDisconnect = useCallback(
    (playerId: string) => {
      const state = hostStateRef.current;
      if (!state) return;

      const player = state.players.find((p) => p.id === playerId);
      if (!player) return;

      // Close and clean up connection reference if open
      if (connectionsRef.current[playerId]) {
        try {
          if (connectionsRef.current[playerId].open) {
            connectionsRef.current[playerId].close();
          }
        } catch (_) {}
        delete connectionsRef.current[playerId];
      }

      const now = Date.now();
      let nextState = { ...state };
      const newLogs = [...(state.log || [])];
      const newChat = [...(state.chat || [])];

      if (state.phase === 'lobby') {
        // In Lobby: remove player from roster completely
        nextState.players = state.players.filter((p) => p.id !== playerId);
        const leaveText = `${player.name} left the room.`;
        newLogs.push({
          id: `log-leave-${playerId}-${now}`,
          round: 0,
          phase: 'lobby',
          text: leaveText,
          timestamp: now,
          type: 'info' as const,
        });
        newChat.push({
          id: `msg-leave-${now}-${Math.random().toString(36).slice(2, 6)}`,
          senderId: 'system',
          senderName: 'SYSTEM',
          channel: 'public',
          text: `🚪 ${leaveText}`,
          timestamp: now,
        });
        nextState.log = newLogs;
        nextState.chat = newChat.slice(-149);
        nextState.version = state.version + 1;
        hostStateRef.current = nextState;
        pushViews(nextState);
        return;
      }

      // In Active Game: mark player as departed
      const roleRevealed = player.role ? ` (${player.role.toUpperCase()})` : '';
      const leaveText = `${player.name}${roleRevealed} disconnected and left the game.`;
      newLogs.push({
        id: `log-leave-${playerId}-${now}`,
        round: state.round,
        phase: state.phase,
        text: leaveText,
        timestamp: now,
        type: 'death' as const,
      });
      newChat.push({
        id: `msg-leave-${now}-${Math.random().toString(36).slice(2, 6)}`,
        senderId: 'system',
        senderName: 'SYSTEM',
        channel: 'public',
        text: `⚠️ ${leaveText}`,
        timestamp: now,
      });

      const updatedPlayers = state.players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              connected: false,
              alive: false,
              diedBy: 'left' as const,
              diedInRound: state.round,
            }
          : p
      );

      // Clean up disconnected player's votes, picks, and ready states
      const updatedVotes = { ...state.votes };
      delete updatedVotes[playerId];

      const updatedNightPicks = { ...state.night.picks };
      delete updatedNightPicks[playerId];

      const updatedNightConfirmed = { ...state.night.confirmed };
      delete updatedNightConfirmed[playerId];

      const updatedReadyToVote = state.readyToVote.filter((id) => id !== playerId);

      nextState = {
        ...state,
        players: updatedPlayers,
        votes: updatedVotes,
        night: {
          ...state.night,
          picks: updatedNightPicks,
          confirmed: updatedNightConfirmed,
        },
        readyToVote: updatedReadyToVote,
        log: newLogs,
        chat: newChat.slice(-149),
      };

      // Re-evaluate win condition immediately upon disconnect!
      const winner = checkWinCondition(updatedPlayers);
      if (winner) {
        nextState.winner = winner;
        nextState.phase = 'gameOver';
        nextState.phaseEndsAt = null;
        newLogs.push({
          id: `log-win-${now}`,
          round: state.round,
          phase: 'gameOver',
          text:
            winner === 'town'
              ? 'Town wins! All Mafia threats have been eliminated or left the city.'
              : winner === 'mafia'
              ? 'Mafia wins! The syndicate outnumbers the town.'
              : 'Jester wins!',
          timestamp: now,
          type: 'phase' as const,
        });
        nextState.log = newLogs;
      } else {
        const alivePlaying = updatedPlayers.filter((p) => p.alive && !p.isGod);
        if (alivePlaying.length < 2) {
          nextState.phase = 'gameOver';
          nextState.phaseEndsAt = null;
          newLogs.push({
            id: `log-not-enough-${now}`,
            round: state.round,
            phase: 'gameOver',
            text: 'Game ended: Not enough players remaining to continue.',
            timestamp: now,
            type: 'phase' as const,
          });
          nextState.log = newLogs;
        } else if (state.phase === 'roleReveal') {
          const allReady = alivePlaying.every((p) => p.ready || p.isHost);
          if (allReady) {
            nextState = maybeAdvance({ ...nextState, phaseEndsAt: now }, now, () => Math.random());
          }
        } else if (state.phase === 'night') {
          nextState = tryAdvanceNightHelper(nextState, now);
        } else if (state.phase === 'discussion' && updatedReadyToVote.length >= alivePlaying.length) {
          nextState.phase = 'voting';
          nextState.phaseEndsAt = state.settings.noTimer ? null : now + state.settings.votingDuration * 1000;
          nextState.votes = {};
        } else if (state.phase === 'voting') {
          const allVoted = alivePlaying.every((p) => Boolean(updatedVotes[p.id]));
          if (allVoted) {
            nextState.phaseEndsAt = Math.min(nextState.phaseEndsAt || now + 1500, now + 1500);
          }
        }
      }

      nextState.version = state.version + 1;
      hostStateRef.current = nextState;
      pushViews(nextState);
    },
    [pushViews]
  );

  // Host Intent Handler
  const handleHostIntent = useCallback(
    (playerId: string, intentType: IntentType, payload: any) => {
      const state = hostStateRef.current;
      if (!state) return;

      let nextState = { ...state };
      const now = Date.now();
      const callingPlayer = state.players.find((p) => p.id === playerId);

      const tryAdvanceNight = (st: GameState): GameState => {
        return tryAdvanceNightHelper(st, now);
      };

      switch (intentType) {
        case 'setReady': {
          nextState.players = nextState.players.map((p) =>
            p.id === playerId ? { ...p, ready: !p.ready } : p
          );
          nextState.version++;
          break;
        }

        case 'updateProfile': {
          const newAvatar = Number(payload?.avatar);
          const newName = payload?.name ? String(payload.name).trim() : undefined;
          const newColor = payload?.color || (newAvatar && newAvatar >= 1 && newAvatar <= PLAYER_COLORS.length ? PLAYER_COLORS[newAvatar - 1] : undefined);
          nextState.players = nextState.players.map((p) => {
            if (p.id === playerId) {
              return {
                ...p,
                avatar: newAvatar && newAvatar >= 1 && newAvatar <= 12 ? newAvatar : p.avatar,
                name: newName || p.name,
                color: newColor || p.color,
              };
            }
            return p;
          });
          nextState.version++;
          break;
        }

        case 'updateSettings': {
          if (!callingPlayer?.isHost) return; // Host only
          const isModeratorModeChanged = payload?.moderatorMode !== undefined;
          const targetModeratorMode = payload?.moderatorMode || nextState.settings.moderatorMode;

          nextState.settings = {
            ...nextState.settings,
            ...payload,
            roles: payload?.roles
              ? {
                  ...nextState.settings.roles,
                  ...payload.roles,
                  mafia: payload.roles.mafia
                    ? { ...nextState.settings.roles.mafia, ...payload.roles.mafia }
                    : nextState.settings.roles.mafia,
                  godfather: payload.roles.godfather
                    ? { ...nextState.settings.roles.godfather, ...payload.roles.godfather }
                    : nextState.settings.roles.godfather,
                  doctor: payload.roles.doctor
                    ? { ...nextState.settings.roles.doctor, ...payload.roles.doctor }
                    : nextState.settings.roles.doctor,
                  police: payload.roles.police
                    ? { ...nextState.settings.roles.police, ...payload.roles.police }
                    : nextState.settings.roles.police,
                  vigilante: payload.roles.vigilante
                    ? { ...nextState.settings.roles.vigilante, ...payload.roles.vigilante }
                    : nextState.settings.roles.vigilante,
                  jester: payload.roles.jester
                    ? { ...nextState.settings.roles.jester, ...payload.roles.jester }
                    : nextState.settings.roles.jester,
                }
              : nextState.settings.roles,
          };

          if (isModeratorModeChanged) {
            const isGod = targetModeratorMode === 'god';
            if (!isGod) {
              nextState.players = nextState.players.map((p) => ({ ...p, isGod: false }));
            }
          }
          saveLastSettings(nextState.settings);

          nextState.version++;
          break;
        }

        case 'setGod': {
          if (!callingPlayer?.isHost) return; // Host only
          let targetId: string | null = null;
          let isGod = false;

          if (typeof payload === 'object' && payload !== null) {
            targetId = payload.targetPlayerId || payload.playerId || null;
            isGod = payload.isGod !== undefined ? Boolean(payload.isGod) : Boolean(targetId);
          } else if (typeof payload === 'string') {
            targetId = payload;
            isGod = true;
          } else if (typeof payload === 'boolean') {
            targetId = playerId;
            isGod = payload;
          } else if (payload === null || payload === undefined) {
            targetId = null;
            isGod = false;
          }

          nextState.players = nextState.players.map((p) => ({
            ...p,
            isGod: isGod && targetId ? p.id === targetId : false, // Only one God/Narrator at a time
          }));
          const hasGod = nextState.players.some((p) => p.isGod);
          nextState.settings = {
            ...nextState.settings,
            moderatorMode: hasGod ? 'god' : 'auto',
          };
          nextState.version++;
          break;
        }

        case 'kick': {
          if (!callingPlayer?.isHost) return; // Host only
          nextState.players = nextState.players.filter((p) => p.id !== payload);
          if (connectionsRef.current[payload]) {
            connectionsRef.current[payload].send({ type: 'kicked' });
            connectionsRef.current[payload].close();
            delete connectionsRef.current[payload];
          }
          nextState.version++;
          break;
        }

        case 'ban': {
          if (!callingPlayer?.isHost) return; // Host only
          const targetPlayer = nextState.players.find((p) => p.id === payload);
          if (targetPlayer?.token) {
            nextState.bannedTokens = [...(nextState.bannedTokens || []), targetPlayer.token];
          }
          nextState.players = nextState.players.filter((p) => p.id !== payload);
          if (connectionsRef.current[payload]) {
            connectionsRef.current[payload].send({ type: 'banned', reason: 'You have been banned from this room.' });
            connectionsRef.current[payload].close();
            delete connectionsRef.current[payload];
          }
          nextState.version++;
          break;
        }

        case 'lockRoom': {
          if (!callingPlayer?.isHost) return; // Host only
          nextState.isLocked = Boolean(payload ?? !nextState.isLocked);
          nextState.version++;
          break;
        }

        case 'skipPlayer': {
          if (!callingPlayer?.isHost) return; // Host only
          const targetId = String(payload);
          if (nextState.phase === 'night') {
            nextState.night.picks[targetId] = 'hold';
            nextState.night.confirmed[targetId] = true;
            nextState = tryAdvanceNight(nextState);
          } else if (nextState.phase === 'voting') {
            nextState.votes[targetId] = 'skip';
          }
          nextState.version++;
          break;
        }

        case 'start': {
          if (!callingPlayer?.isHost) return; // Host only
          const validation = validateSettings(nextState.settings, nextState.players.length);
          if (!validation.valid) return;
          const unready = nextState.players.filter((p) => !p.isHost && !p.ready);
          if (unready.length > 0) return; // Require all players ready

          nextState.chat = [];
          nextState.log = [];
          nextState.secretLog = [];
          nextState.policeInbox = [];
          nextState.doctorHistory = {};
          nextState.shotsUsed = {};
          nextState.votes = {};
          nextState.readyToVote = [];
          nextState.suspicions = {};
          nextState.reactions = {};

          const hasGod = nextState.players.some((p) => p.isGod) || nextState.settings.moderatorMode === 'god';

          if (hasGod) {
            // Live narrator manually assigns roles from the configured deck
            // Strictly NO timing limits during narrator role assignment
            nextState.phase = 'narratorAssign';
            nextState.round = 0;
            nextState.phaseEndsAt = null;
          } else {
            const rng = () => Math.random();
            nextState.players = assignRoles(nextState.players, nextState.settings, rng);
            nextState.phase = 'roleReveal';
            nextState.round = 0;
            nextState.phaseEndsAt = nextState.settings.noTimer ? null : now + 12000;
          }

          nextState.version++;
          break;
        }

        case 'narratorAssignRoles': {
          if (!callingPlayer?.isGod && !callingPlayer?.isHost) return;
          if (nextState.phase !== 'narratorAssign') return;
          const assignments = payload?.assignments as Record<string, Role> | undefined;
          if (!assignments) return;

          // Apply narrator assigned roles to non-god players
          nextState.players = nextState.players.map((p) => {
            if (p.isGod) return p;
            return {
              ...p,
              role: assignments[p.id] || 'civilian',
              ready: false, // Reset ready status for role reveal confirmation
            };
          });

          nextState.phase = 'roleReveal';
          nextState.round = 0;
          nextState.phaseEndsAt = nextState.settings.noTimer ? null : now + 12000;
          nextState.version++;
          break;
        }

        case 'nightAction': {
          if (nextState.phase !== 'night') return;
          const shouldConfirm = payload?.confirm !== undefined ? Boolean(payload.confirm) : true;
          if (payload?.targetId !== undefined) {
            nextState.night.picks[playerId] = payload.targetId; // targetId or 'hold'
          }
          nextState.night.confirmed[playerId] = shouldConfirm;
          if (shouldConfirm) {
            nextState = tryAdvanceNight(nextState);
          }
          nextState.version++;
          break;
        }

        case 'confirmNightAction': {
          if (nextState.phase !== 'night') return;
          if (payload?.targetId !== undefined) {
            nextState.night.picks[playerId] = payload.targetId;
          }
          nextState.night.confirmed[playerId] = true;
          nextState = tryAdvanceNight(nextState);
          nextState.version++;
          break;
        }

        case 'vote': {
          if (nextState.phase !== 'voting') return;
          const voter = nextState.players.find((p) => p.id === playerId);
          if (!voter?.alive || voter.isGod) return;

          nextState.votes[playerId] = payload.targetId; // targetId or 'skip'

          // Check if all alive players have voted (including skip)
          const alivePlayers = nextState.players.filter((p) => p.alive && !p.isGod);
          const allVoted = alivePlayers.length > 0 && alivePlayers.every((p) => Boolean(nextState.votes[p.id]));

          if (allVoted) {
            // Speed up voting conclusion to 1s so players see the final tally before moving to voteResult
            nextState.phaseEndsAt = Math.min(nextState.phaseEndsAt || now + 1000, now + 1000);
          }
          nextState.version++;
          break;
        }

        case 'readyToVote': {
          if (nextState.phase !== 'discussion') return;
          if (nextState.readyToVote.includes(playerId)) {
            nextState.readyToVote = nextState.readyToVote.filter((id) => id !== playerId);
          } else {
            nextState.readyToVote = [...nextState.readyToVote, playerId];
          }
          // If all alive ready, advance early
          const alivePlaying = nextState.players.filter((p) => p.alive && !p.isGod);
          if (nextState.readyToVote.length >= alivePlaying.length) {
            nextState.phase = 'voting';
            nextState.phaseEndsAt = now + nextState.settings.votingDuration * 1000;
            nextState.votes = {};
          }
          nextState.version++;
          break;
        }

        case 'setSuspicion': {
          if (nextState.phase !== 'discussion' && nextState.phase !== 'voting') return;
          const caller = nextState.players.find((p) => p.id === playerId);
          if (!caller?.alive || caller.isGod) return;
          if (!nextState.suspicions) nextState.suspicions = {};
          if (payload?.targetId && payload.targetId !== playerId) {
            nextState.suspicions[playerId] = payload.targetId;
            nextState.version++;
          }
          break;
        }

        case 'clearSuspicion': {
          if (!nextState.suspicions) return;
          delete nextState.suspicions[playerId];
          nextState.version++;
          break;
        }

        case 'sendReaction': {
          const caller = nextState.players.find((p) => p.id === playerId);
          if (!caller?.alive || caller.isGod) return;
          const validReactions = ['suspicious', 'agree', 'nope', 'same', 'trust', 'question'];
          if (!validReactions.includes(payload?.reaction)) return;
          if (!nextState.reactions) nextState.reactions = {};
          const prev = nextState.reactions[playerId];
          if (prev && now - prev.timestamp < 1000) return; // rate limit 1s
          nextState.reactions[playerId] = {
            reaction: payload.reaction,
            timestamp: now,
          };
          nextState.version++;
          break;
        }

        case 'voiceMute': {
          if (!nextState.voiceMuted) nextState.voiceMuted = {};
          nextState.voiceMuted[playerId] = Boolean(payload?.muted);
          nextState.version++;
          break;
        }

        case 'godAction': {
          if (!callingPlayer?.isHost && !callingPlayer?.isGod) return; // Host or Narrator only

          if (payload.action === 'next') {
            nextState = maybeAdvance({ ...nextState, phaseEndsAt: now }, now, () => Math.random());
          } else if (payload.action === 'pause') {
            nextState.paused = !nextState.paused;
          } else if (payload.action === 'extend') {
            if (nextState.phaseEndsAt) nextState.phaseEndsAt += 30000;
          }
          nextState.version++;
          break;
        }

        case 'rematch': {
          if (!callingPlayer?.isHost) return; // Host only
          const hasGod = nextState.players.some((p) => p.isGod) || nextState.settings.moderatorMode === 'god';
          let designatedNarratorId: string | null = null;
          if (hasGod) {
            const firstGod = nextState.players.find((p) => p.isGod);
            designatedNarratorId = firstGod ? firstGod.id : callingPlayer.id;
          }

          nextState.round = 0;
          nextState.winner = undefined;
          nextState.phaseEndsAt = null;
          nextState.votes = {};
          nextState.night = { subPhase: 'mafia', picks: {}, confirmed: {}, locked: {}, earlyEndAt: null };
          nextState.chat = [];
          nextState.log = [];
          nextState.secretLog = [];
          nextState.policeInbox = [];
          nextState.doctorHistory = {};
          nextState.shotsUsed = {};
          nextState.readyToVote = [];
          nextState.suspicions = {};
          nextState.reactions = {};
          nextState.players = nextState.players.map((p) => ({
            ...p,
            alive: true,
            role: undefined,
            isGod: designatedNarratorId ? p.id === designatedNarratorId : false,
            ready: p.isBot ? true : false,
            diedInRound: undefined,
            diedBy: undefined,
            alignment: undefined,
          }));

          // When rematch with a live Narrator, narrator chooses roles again directly!
          if (hasGod && designatedNarratorId) {
            nextState.phase = 'narratorAssign';
            nextState.phaseEndsAt = null;
          } else {
            nextState.phase = 'lobby';
          }

          nextState.version++;
          break;
        }

        case 'addBots': {
          if (!callingPlayer?.isHost) return; // Host only
          if (nextState.phase !== 'lobby') return;

          const isGodMode = nextState.settings.moderatorMode === 'god';
          const mafiaCount = nextState.settings.roles.mafia.count;
          const godfatherCount = nextState.settings.roles.godfather.enabled ? nextState.settings.roles.godfather.count : 0;
          const totalMafia = mafiaCount + godfatherCount;
          const doctorCount = nextState.settings.roles.doctor.enabled ? nextState.settings.roles.doctor.count : 0;
          const policeCount = nextState.settings.roles.police.enabled ? nextState.settings.roles.police.count : 0;
          const vigilanteCount = nextState.settings.roles.vigilante.enabled ? nextState.settings.roles.vigilante.count : 0;
          const jesterCount = nextState.settings.roles.jester.enabled ? nextState.settings.roles.jester.count : 0;
          const totalSpecial = totalMafia + doctorCount + policeCount + vigilanteCount + jesterCount;
          const minForMafia = 2 * totalMafia + 1;
          const minRequiredActive = Math.max(4, totalSpecial, minForMafia);
          const minTotalPlayers = isGodMode ? minRequiredActive + 1 : minRequiredActive;

          const currentCount = nextState.players.length;
          const maxPlayers = nextState.settings.maxPlayers || 12;
          const toAdd = Math.max(0, maxPlayers - currentCount);

          if (toAdd <= 0) return;

          const botNames = [
            'Agent Vega',
            'Raven',
            'Cipher',
            'Shadow',
            'Oracle',
            'Phantom',
            'Viper',
            'Echo',
            'Nexus',
            'Nomad',
            'Blitz',
            'Spectre',
          ];

          const newPlayers = [...nextState.players];
          for (let i = 0; i < toAdd; i++) {
            if (newPlayers.length >= nextState.settings.maxPlayers) break;
            const botIdx = newPlayers.length;
            const botId = `bot_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
            const name = botNames[botIdx % botNames.length];
            newPlayers.push({
              id: botId,
              token: generateToken(),
              name: `[BOT] ${name}`,
              avatar: (botIdx % 12) + 1,
              color: PLAYER_COLORS[botIdx % PLAYER_COLORS.length],
              isHost: false,
              isGod: false,
              isBot: true,
              ready: true,
              connected: true,
              lastSeen: Date.now(),
              alive: true,
            });
          }

          nextState.players = newPlayers;
          nextState.version++;
          break;
        }

        case 'clearBots': {
          if (!callingPlayer?.isHost) return; // Host only
          if (nextState.phase !== 'lobby') return;
          nextState.players = nextState.players.filter((p) => !p.isBot && !p.id.startsWith('bot_'));
          nextState.version++;
          break;
        }

        case 'leave': {
          handlePlayerDisconnect(playerId);
          return;
        }
      }

      pushViews(nextState);
    },
    [pushViews, handlePlayerDisconnect]
  );

  // Host Chat Handler with Channel Validation
  const handleHostChat = useCallback(
    (senderId: string, channel: 'public' | 'mafia' | 'dead' | 'god', text: string) => {
      const state = hostStateRef.current;
      if (!state || !text.trim()) return;

      const player = state.players.find((p) => p.id === senderId);
      if (!player) return;

      const isMafia = player.role === 'mafia' || player.role === 'godfather';
      const isDead = !player.alive;
      const isGod = player.isGod;

      // Channel access rules and room settings enforcement
      if (channel === 'mafia' && (!state.settings.mafiaNightChat || (!isMafia && !isGod))) return;
      if (channel === 'dead' && (!state.settings.deadChat || (!isDead && !isGod))) return;
      if (channel === 'public') {
        if (!state.settings.dayChat && !isGod) return;
        if (isDead && !isGod) return;
        if (state.phase === 'night' && !isGod) return;
      }

      const newMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderId: player.id,
        senderName: player.name,
        senderRole: player.role,
        channel,
        text: text.trim().slice(0, 300),
        timestamp: Date.now(),
      };

      const updated = {
        ...state,
        chat: [...state.chat.slice(-149), newMsg],
        version: state.version + 1,
      };
      pushViews(updated);
    },
    [pushViews]
  );

  // Initialize Room (Host or Peer Client)
  useEffect(() => {
    if (options?.enabled === false) {
      setIsConnecting(false);
      return;
    }

    let active = true;
    let connectTimeout: any = null;
    const code = roomCode.toUpperCase();
    const token = localStorage.getItem(`mafia-token:${code}`) || generateToken();

    // Check if this browser is host
    const savedHostRaw = typeof localStorage !== 'undefined' ? localStorage.getItem(`mafia-host:${code}`) : null;
    const isHostSaved = typeof localStorage !== 'undefined' && localStorage.getItem(`mafia-is-host:${code}`) === 'true';
    const isHostParam = typeof window !== 'undefined' && window.location.search.includes('host=true');
    const isHostCandidate = Boolean(savedHostRaw) || isHostSaved || isHostParam;

    const effectiveName =
      playerName && playerName !== 'Player'
        ? playerName
        : (typeof localStorage !== 'undefined' && localStorage.getItem('mafia-name')) || playerName || 'Host';
    const effectiveAvatar =
      playerAvatar && playerAvatar > 1
        ? playerAvatar
        : (typeof localStorage !== 'undefined' && parseInt(localStorage.getItem('mafia-avatar') || '', 10)) ||
          playerAvatar ||
          1;

    if (isHostCandidate) {
      setIsHost(true);
      let initialGameState: GameState;

      if (savedHostRaw) {
        try {
          const parsed = JSON.parse(savedHostRaw);
          const baseState = createInitialState(code, myPlayerIdRef.current, token, effectiveName, effectiveAvatar);
          initialGameState = {
            ...baseState,
            ...parsed,
            settings: {
              ...DEFAULT_SETTINGS,
              ...(parsed.settings || {}),
            },
            chat: Array.isArray(parsed.chat) ? parsed.chat : [],
            log: Array.isArray(parsed.log) ? parsed.log : [],
          };
          // Always synchronize host player's current codename & avatar
          initialGameState.players = initialGameState.players.map((p) =>
            p.id === myPlayerIdRef.current || p.isHost
              ? { ...p, name: effectiveName, avatar: effectiveAvatar }
              : p
          );
        } catch {
          initialGameState = createInitialState(code, myPlayerIdRef.current, token, effectiveName, effectiveAvatar);
        }
      } else {
        initialGameState = createInitialState(code, myPlayerIdRef.current, token, effectiveName, effectiveAvatar);
      }

      // Mark this browser as host for this room
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`mafia-is-host:${code}`, 'true');
      }

      hostStateRef.current = initialGameState;
      pushViews(initialGameState);
      setIsConnected(true);
      setIsConnecting(false);

      // Start authoritative Web Worker tick with heartbeat watchdog
      tickWorkerRef.current = createTickWorker(() => {
        if (hostStateRef.current) {
          const now = Date.now();
          const state = hostStateRef.current;
          let changed = false;

          // Heartbeat watchdog: detect dropped peers after 6.5s of silence (exclude bots and host)
          state.players.forEach((p) => {
            if (!p.isHost && !p.isBot && !p.id.startsWith('bot_') && p.connected && (now - (p.lastSeen || 0) > 6500)) {
              handlePlayerDisconnect(p.id);
              changed = true;
            }
          });

          if (!changed && hostStateRef.current) {
            let current = hostStateRef.current;
            const botState = processBotActions(current, now);
            if (botState.version !== current.version) {
              hostStateRef.current = botState;
              pushViews(botState);
              current = botState;
            }

            const advanced = maybeAdvance(current, now, () => Math.random());
            if (advanced.version !== current.version) {
              pushViews(advanced);
            }
          }
        }
      });

      // Screen Wake Lock
      requestScreenWakeLock();

      // Lazy import PeerJS on client with dynamic ICE / TURN configuration
      getIceConfig().then((iceConfig) => {
        if (!active) return;
        import('peerjs').then(({ default: Peer }) => {
          if (!active) return;
          const peerId = `mafia-v1-${code}`;
          const peer = new Peer(peerId, {
            debug: 0,
            config: {
              iceServers: iceConfig.iceServers,
              iceTransportPolicy: iceConfig.iceTransportPolicy || 'all',
            },
          });
          peerRef.current = peer;

          peer.on('open', () => {
            setIsConnected(true);
          });

          peer.on('call', (mediaConn: any) => {
            const callRoom = mediaConn.metadata?.roomCode;
            if (callRoom && callRoom !== code.toUpperCase()) {
              mediaConn.close();
              return;
            }
            const localStream = voiceEngine.getLocalStream();
            mediaConn.answer(localStream || undefined);
            mediaConn.on('stream', (remoteStream: MediaStream) => {
              voiceEngine.addPeerStream(mediaConn.peer, remoteStream, code.toUpperCase());
            });
            mediaConn.on('close', () => {
              voiceEngine.removePeerStream(mediaConn.peer);
            });
          });

          peer.on('connection', (conn) => {
            setTimeout(() => {
              if (conn.peerConnection) {
                logSelectedCandidatePair(conn.peerConnection);
              }
            }, 2000);

            conn.on('data', (data: any) => {
            // Keepalive: mark peer active & connected
            if (hostStateRef.current) {
              const activeP = hostStateRef.current.players.find((p) => p.id === conn.peer);
              if (activeP) {
                activeP.lastSeen = Date.now();
                activeP.connected = true;
              }
            }

            if (data?.type === 'hello') {
              const state = hostStateRef.current;
              if (!state) return;

              // 1. Check if token is banned from this room
              if (data.token && state.bannedTokens?.includes(data.token)) {
                conn.send({ type: 'reject', reason: 'banned' });
                setTimeout(() => {
                  try { conn.close(); } catch (_) {}
                }, 500);
                return;
              }

              // 2. Sanitize codename: strip control chars and prevent system impersonation
              let clientName = (data.name && String(data.name).trim()) || `Player ${state.players.length + 1}`;
              clientName = clientName.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim().slice(0, 20);
              if (!clientName) clientName = `Player ${state.players.length + 1}`;
              const reservedNames = ['SYSTEM', 'NARRATOR', 'HOST', 'MODERATOR', 'ADMIN'];
              if (reservedNames.includes(clientName.toUpperCase())) {
                clientName = `${clientName} (Player)`;
              }

              const clientAvatar = Number(data.avatar) || 1;
              const now = Date.now();

              const existingIndex = state.players.findIndex(
                (p) => p.token === data.token || p.id === conn.peer
              );

              // 3. Reject if room is locked and this is a new joiner (reconnects with existing token allowed)
              if (state.isLocked && existingIndex === -1) {
                conn.send({ type: 'reject', reason: 'locked' });
                setTimeout(() => {
                  try { conn.close(); } catch (_) {}
                }, 500);
                return;
              }

              // 4. Reject if game already running and this is a new player
              if (state.phase !== 'lobby' && existingIndex === -1) {
                conn.send({ type: 'reject', reason: 'started' });
                setTimeout(() => {
                  try { conn.close(); } catch (_) {}
                }, 500);
                return;
              }

              // 5. Reject if room is full
              if (state.players.length >= state.settings.maxPlayers && existingIndex === -1) {
                conn.send({ type: 'reject', reason: 'full' });
                setTimeout(() => {
                  try { conn.close(); } catch (_) {}
                }, 500);
                return;
              }

              // 6. Reject if codename is already taken by another player in this room
              const isNameTaken = state.players.some((p) => {
                if (p.token === data.token || p.id === conn.peer) return false;
                return p.name.trim().toLowerCase() === clientName.toLowerCase();
              });

              if (isNameTaken) {
                conn.send({ type: 'reject', reason: 'duplicate_name' });
                setTimeout(() => {
                  try { conn.close(); } catch (_) {}
                }, 500);
                return;
              }

              const newPlayer: Player = {
                id: conn.peer,
                token: data.token || generateToken(),
                name: clientName,
                avatar: clientAvatar,
                color: (data as any)?.color || PLAYER_COLORS[((clientAvatar || 1) - 1) % PLAYER_COLORS.length],
                isHost: false,
                isGod: false,
                ready: false,
                connected: true,
                lastSeen: now,
                alive: true,
              };

              connectionsRef.current[conn.peer] = conn;

              let updatedPlayers = [...state.players];
              const newLogs = [...(state.log || [])];
              const newChat = [...(state.chat || [])];

              if (existingIndex !== -1) {
                const oldId = updatedPlayers[existingIndex].id;
                if (oldId !== conn.peer && connectionsRef.current[oldId]) {
                  delete connectionsRef.current[oldId];
                }
                updatedPlayers[existingIndex] = {
                  ...updatedPlayers[existingIndex],
                  id: conn.peer,
                  connected: true,
                  lastSeen: now,
                  name: clientName,
                  avatar: clientAvatar,
                };
                newLogs.push({
                  id: `log-reconnect-${conn.peer}-${now}`,
                  round: state.round,
                  phase: state.phase,
                  text: `${clientName} reconnected to the room.`,
                  timestamp: now,
                  type: 'info',
                });
                newChat.push({
                  id: `msg-reconnect-${now}-${Math.random().toString(36).slice(2, 6)}`,
                  senderId: 'system',
                  senderName: 'SYSTEM',
                  channel: 'public',
                  text: `🔄 ${clientName} reconnected to the room.`,
                  timestamp: now,
                });
              } else {
                updatedPlayers.push(newPlayer);
                newLogs.push({
                  id: `log-join-${conn.peer}-${now}`,
                  round: state.round,
                  phase: state.phase,
                  text: `${clientName} joined the room.`,
                  timestamp: now,
                  type: 'info',
                });
                newChat.push({
                  id: `msg-join-${now}-${Math.random().toString(36).slice(2, 6)}`,
                  senderId: 'system',
                  senderName: 'SYSTEM',
                  channel: 'public',
                  text: `👋 ${clientName} joined the room.`,
                  timestamp: now,
                });
              }

              const updated = {
                ...state,
                players: updatedPlayers,
                log: newLogs,
                chat: newChat.slice(-149),
                version: state.version + 1,
              };
              pushViews(updated);
            } else if (data?.type === 'intent') {
              handleHostIntent(conn.peer, data.intentType, data.payload);
            } else if (data?.type === 'chat') {
              handleHostChat(conn.peer, data.channel, data.text);
            } else if (data?.type === 'ping') {
              conn.send({ type: 'pong', t: data.t, serverNow: Date.now() });
            }
          });

          conn.on('close', () => {
            delete connectionsRef.current[conn.peer];
            handlePlayerDisconnect(conn.peer);
          });

          conn.on('error', () => {
            delete connectionsRef.current[conn.peer];
            handlePlayerDisconnect(conn.peer);
          });
        });
      });
    });
  } else {
      // Client Mode
      setIsHost(false);
      setIsConnecting(true);
      setError(null);

      connectTimeout = setTimeout(() => {
        if (!clientConnRef.current || !clientConnRef.current.open) {
          setError(`Unable to connect to room ${code}. The host may be offline or unreachable. Try switching between Wi-Fi and mobile data.`);
          setIsConnecting(false);
          try { clientConnRef.current?.close(); } catch (_) {}
        }
      }, 15000);

      const handleUnload = () => {
        if (clientConnRef.current && clientConnRef.current.open) {
          try {
            clientConnRef.current.send({
              type: 'intent',
              reqId: generateToken(),
              intentType: 'leave',
            });
            clientConnRef.current.close();
          } catch (_) {}
        }
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', handleUnload);
        window.addEventListener('pagehide', handleUnload);
      }

      getIceConfig().then((iceConfig) => {
        if (!active) {
          if (connectTimeout) clearTimeout(connectTimeout);
          return;
        }
        import('peerjs').then(({ default: Peer }) => {
          if (!active) {
            if (connectTimeout) clearTimeout(connectTimeout);
            return;
          }
          const peer = new Peer({
            debug: 0,
            config: {
              iceServers: iceConfig.iceServers,
              iceTransportPolicy: iceConfig.iceTransportPolicy || 'all',
            },
          });
          peerRef.current = peer;

          peer.on('call', (mediaConn: any) => {
            const callRoom = mediaConn.metadata?.roomCode;
            if (callRoom && callRoom !== code.toUpperCase()) {
              mediaConn.close();
              return;
            }
            const localStream = voiceEngine.getLocalStream();
            mediaConn.answer(localStream || undefined);
            mediaConn.on('stream', (remoteStream: MediaStream) => {
              voiceEngine.addPeerStream(mediaConn.peer, remoteStream, code.toUpperCase());
            });
            mediaConn.on('close', () => {
              voiceEngine.removePeerStream(mediaConn.peer);
            });
          });

          peer.on('open', (id) => {
            const conn = peer.connect(`mafia-v1-${code}`, { reliable: true });
            clientConnRef.current = conn;

            conn.on('open', () => {
              if (connectTimeout) clearTimeout(connectTimeout);
              setIsConnected(true);
              setIsConnecting(false);
              setTimeout(() => {
                if (conn.peerConnection) {
                  logSelectedCandidatePair(conn.peerConnection);
                }
              }, 2000);
              conn.send({
                type: 'hello',
                code,
                name: effectiveName,
                avatar: effectiveAvatar,
                token,
              });

            // Start heartbeat pings every 2000ms
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = setInterval(() => {
              if (conn.open) {
                conn.send({ type: 'ping', t: Date.now() });
              }
            }, 2000);
          });

          conn.on('data', (msg: any) => {
            if (msg?.type === 'view') {
              setGameView(msg.view);
            } else if (msg?.type === 'pong') {
              const latency = Math.max(0, Date.now() - (msg.t || Date.now()));
              setRtt(latency);
            } else if (msg?.type === 'kicked') {
              setError('You were removed from the room.');
              setIsConnected(false);
            } else if (msg?.type === 'banned') {
              setError('You have been banned from this room by the host.');
              setIsConnected(false);
            } else if (msg?.type === 'reject') {
              if (connectTimeout) clearTimeout(connectTimeout);
              const reasonMap: Record<string, string> = {
                started: 'Game is already in progress.',
                full: 'Room is full (maximum 16 players).',
                duplicate_name: `The codename "${effectiveName}" is already taken in this room. Please choose another name.`,
                locked: 'This room is currently locked by the host.',
                banned: 'You have been banned from this room by the host.',
              };
              setError(reasonMap[msg.reason] || 'Unable to join room.');
              setIsConnected(false);
              setIsConnecting(false);
            }
          });

          conn.on('close', () => {
            setIsConnected(false);
            clientConnRef.current = null;
          });
        });

        peer.on('error', () => {
          if (connectTimeout) clearTimeout(connectTimeout);
          setError(`Room ${code} is unavailable or host is offline.`);
          setIsConnecting(false);
        });
      });
      });
    }

    return () => {
      active = false;
      if (connectTimeout) clearTimeout(connectTimeout);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      tickWorkerRef.current?.terminate();
      peerRef.current?.destroy();
    };
  }, [roomCode, playerName, playerAvatar, options?.enabled, pushViews, handleHostIntent, handleHostChat]);

  // Exposed Actions
  const sendIntent = useCallback(
    (type: IntentType, payload?: any) => {
      if (isHost) {
        handleHostIntent(myPlayerIdRef.current, type, payload);
      } else if (clientConnRef.current && clientConnRef.current.open) {
        clientConnRef.current.send({ type: 'intent', reqId: generateToken(), intentType: type, payload });
      }
    },
    [isHost, handleHostIntent]
  );

  const sendChat = useCallback(
    (channel: 'public' | 'mafia' | 'dead' | 'god', text: string) => {
      if (isHost) {
        handleHostChat(myPlayerIdRef.current, channel, text);
      } else if (clientConnRef.current && clientConnRef.current.open) {
        clientConnRef.current.send({
          type: 'chat',
          channel,
          text,
        });
      }
    },
    [isHost, handleHostChat]
  );

  const startMatch = useCallback(() => {
    if (!hostStateRef.current) return { ok: false, reason: 'Room not initialized' };
    const val = validateSettings(hostStateRef.current.settings, hostStateRef.current.players.length);
    if (!val.valid) return { ok: false, reason: val.reason };
    sendIntent('start');
    return { ok: true };
  }, [sendIntent]);

  const toggleReady = useCallback(() => {
    sendIntent('setReady');
  }, [sendIntent]);

  const kickPlayer = useCallback(
    (playerId: string) => {
      sendIntent('kick', playerId);
    },
    [sendIntent]
  );

  const banPlayer = useCallback(
    (playerId: string) => {
      sendIntent('ban', playerId);
    },
    [sendIntent]
  );

  const toggleLockRoom = useCallback(() => {
    sendIntent('lockRoom');
  }, [sendIntent]);

  const skipPlayer = useCallback(
    (playerId: string) => {
      sendIntent('skipPlayer', playerId);
    },
    [sendIntent]
  );

  const setGodMode = useCallback(
    (targetPlayerIdOrIsGod: any, isGod?: boolean) => {
      if (targetPlayerIdOrIsGod === null || targetPlayerIdOrIsGod === undefined) {
        sendIntent('setGod', { targetPlayerId: null, isGod: false });
      } else if (typeof targetPlayerIdOrIsGod === 'string') {
        sendIntent('setGod', { targetPlayerId: targetPlayerIdOrIsGod, isGod: isGod !== undefined ? isGod : true });
      } else if (typeof targetPlayerIdOrIsGod === 'boolean') {
        sendIntent('setGod', { targetPlayerId: myPlayerIdRef.current, isGod: targetPlayerIdOrIsGod });
      } else {
        sendIntent('setGod', targetPlayerIdOrIsGod);
      }
    },
    [sendIntent]
  );

  const assignNarratorRoles = useCallback(
    (assignments: Record<string, Role>) => {
      sendIntent('narratorAssignRoles', { assignments });
    },
    [sendIntent]
  );

  const updateSettings = useCallback(
    (partial: Partial<Settings>) => {
      sendIntent('updateSettings', partial);
    },
    [sendIntent]
  );

  const updateProfile = useCallback(
    (profile: { name?: string; avatar: number }) => {
      sendIntent('updateProfile', profile);
    },
    [sendIntent]
  );

  const setSuspicion = useCallback(
    (targetId: string) => {
      sendIntent('setSuspicion', { targetId });
    },
    [sendIntent]
  );

  const clearSuspicion = useCallback(() => {
    sendIntent('clearSuspicion');
  }, [sendIntent]);

  const sendReaction = useCallback(
    (reaction: QuickReaction) => {
      sendIntent('sendReaction', { reaction });
    },
    [sendIntent]
  );

  const leaveRoom = useCallback(() => {
    sendIntent('leave');
    try {
      if (clientConnRef.current && clientConnRef.current.open) {
        clientConnRef.current.close();
      }
      peerRef.current?.destroy();
    } catch (_) {}
    clearRoomData(roomCode);
  }, [sendIntent, roomCode]);

  const addBots = useCallback(() => {
    sendIntent('addBots');
  }, [sendIntent]);

  const clearBots = useCallback(() => {
    sendIntent('clearBots');
  }, [sendIntent]);

  const toggleVoice = useCallback(async () => {
    if (voiceEngine.isVoiceActive()) {
      voiceEngine.disableVoice();
      setIsVoiceActive(false);
      return { ok: true, active: false };
    } else {
      const totalPlayers = hostStateRef.current?.players.length || gameView?.players.length || 1;
      const res = await voiceEngine.enableVoice(totalPlayers);
      if (res.ok) {
        setIsVoiceActive(true);
        setIsVoiceMuted(voiceEngine.isMuted());
        const stream = voiceEngine.getLocalStream();
        if (stream && peerRef.current) {
          if (isHost) {
            Object.keys(connectionsRef.current).forEach((clientPeerId) => {
              try {
                const call = peerRef.current.call(clientPeerId, stream, {
                  metadata: { roomCode: roomCode.toUpperCase() },
                });
                if (call) {
                  call.on('stream', (remoteStream: MediaStream) => {
                    voiceEngine.addPeerStream(clientPeerId, remoteStream, roomCode.toUpperCase());
                  });
                  call.on('close', () => {
                    voiceEngine.removePeerStream(clientPeerId);
                  });
                }
              } catch (_) {}
            });
          } else {
            try {
              const call = peerRef.current.call(`mafia-v1-${roomCode.toUpperCase()}`, stream, {
                metadata: { roomCode: roomCode.toUpperCase() },
              });
              if (call) {
                call.on('stream', (remoteStream: MediaStream) => {
                  voiceEngine.addPeerStream(`mafia-v1-${roomCode.toUpperCase()}`, remoteStream, roomCode.toUpperCase());
                });
                call.on('close', () => {
                  voiceEngine.removePeerStream(`mafia-v1-${roomCode.toUpperCase()}`);
                });
              }
            } catch (_) {}
          }
        }
        sendIntent('voiceMute', { muted: voiceEngine.isMuted() });
        return { ok: true, active: true };
      }
      return res;
    }
  }, [isHost, roomCode, gameView?.players.length, sendIntent]);

  const toggleVoiceMute = useCallback(() => {
    const muted = voiceEngine.toggleSelfMute();
    setIsVoiceMuted(muted);
    sendIntent('voiceMute', { muted });
    return muted;
  }, [sendIntent]);

  return {
    gameView,
    isHost,
    isConnected,
    isConnecting,
    error,
    rtt,
    sendIntent,
    sendChat,
    startMatch,
    toggleReady,
    addBots,
    clearBots,
    kickPlayer,
    banPlayer,
    toggleLockRoom,
    skipPlayer,
    setGodMode,
    assignNarratorRoles,
    updateSettings,
    updateProfile,
    setSuspicion,
    clearSuspicion,
    sendReaction,
    leaveRoom,
    isVoiceActive,
    isVoiceMuted,
    toggleVoice,
    toggleVoiceMute,
    speakingPeers,
    speakingLevels,
  };
}

function createInitialState(
  code: string,
  hostId: string,
  hostToken: string,
  hostName: string,
  hostAvatar: number
): GameState {
  const hostPlayer: Player = {
    id: hostId,
    token: hostToken,
    name: hostName || 'Host',
    avatar: hostAvatar || 1,
    color: PLAYER_COLORS[((hostAvatar || 1) - 1) % PLAYER_COLORS.length],
    isHost: true,
    isGod: false,
    ready: true,
    connected: true,
    lastSeen: Date.now(),
    alive: true,
  };

  const persistedSettings = getLastSettings();

  return {
    code,
    version: 1,
    phase: 'lobby',
    round: 0,
    phaseEndsAt: null,
    paused: false,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(persistedSettings || {}),
    },
    players: [hostPlayer],
    night: { subPhase: 'mafia', picks: {}, confirmed: {}, locked: {}, earlyEndAt: null },
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
}
