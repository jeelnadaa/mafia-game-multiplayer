'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ClientGameView, GameState, IntentType, Player, Settings, Role } from './types';
import { DEFAULT_SETTINGS } from './settings';
import { generateRoomCode, generateToken, createTickWorker, requestScreenWakeLock } from './net';
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
import { initSound, playNightBell, playDayChime, playGavelStrike, playFanfare } from './sfx';
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
  setGodMode: (isGod: boolean) => void;
  updateSettings: (partial: Partial<Settings>) => void;
  updateProfile: (profile: { name?: string; avatar: number }) => void;
  leaveRoom: () => void;
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
        } else if (state.phase === 'discussion' && updatedReadyToVote.length >= alivePlaying.length) {
          nextState.phase = 'voting';
          nextState.phaseEndsAt = now + state.settings.votingDuration * 1000;
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
          nextState.players = nextState.players.map((p) => {
            if (p.id === playerId) {
              return {
                ...p,
                avatar: newAvatar && newAvatar >= 1 && newAvatar <= 12 ? newAvatar : p.avatar,
                name: newName || p.name,
              };
            }
            return p;
          });
          nextState.version++;
          break;
        }

        case 'updateSettings': {
          if (!callingPlayer?.isHost) return; // Host only
          nextState.settings = { ...nextState.settings, ...payload };
          nextState.version++;
          break;
        }

        case 'setGod': {
          if (!callingPlayer?.isHost) return; // Host only
          nextState.players = nextState.players.map((p) =>
            p.id === playerId ? { ...p, isGod: Boolean(payload) } : p
          );
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

        case 'start': {
          if (!callingPlayer?.isHost) return; // Host only
          const validation = validateSettings(nextState.settings, nextState.players.length);
          if (!validation.valid) return;

          const rng = () => Math.random();
          nextState.players = assignRoles(nextState.players, nextState.settings, rng);
          nextState.phase = 'roleReveal';
          nextState.round = 0;
          nextState.phaseEndsAt = now + 10000; // 10s role reveal
          nextState.version++;
          break;
        }

        case 'nightAction': {
          if (nextState.phase !== 'night') return;
          nextState.night.picks[playerId] = payload.targetId; // targetId or 'hold'
          nextState.version++;
          break;
        }

        case 'confirmNightAction': {
          if (nextState.phase !== 'night') return;
          const subPhase = nextState.night.subPhase || 'mafia';
          const eligible = getActiveRolePlayers(subPhase, nextState);
          const isEligible = eligible.some((p) => p.id === playerId);
          if (!isEligible) return;

          if (payload?.targetId !== undefined) {
            nextState.night.picks[playerId] = payload.targetId;
          }

          nextState.night.confirmed[playerId] = true;

          // Check if all active members of this role have confirmed
          let canAdvance = eligible.every((p) => nextState.night.confirmed[p.id]);

          // For Mafia: verify target agreement if unanimous mode
          if (subPhase === 'mafia' && canAdvance) {
            const mafiaPicks = eligible.map((m) => nextState.night.picks[m.id]).filter(Boolean);
            if (nextState.settings.mafiaKillMode === 'unanimous' && eligible.length > 1) {
              const allSame =
                mafiaPicks.length === eligible.length && mafiaPicks.every((pick) => pick === mafiaPicks[0]);
              if (!allSame) {
                canAdvance = false;
              }
            }
          }

          if (canAdvance) {
            const nextRole = getNextNightRole(subPhase, nextState);
            if (nextRole) {
              const duration = getSubPhaseDuration(nextRole, nextState.settings);
              nextState.night.subPhase = nextRole;
              nextState.night.confirmed = {};
              nextState.phaseEndsAt = now + duration * 1000;
            } else {
              // Night completed, resolve night!
              const rng = () => Math.random();
              const { nextState: resolvedState } = resolveNight(nextState, rng, now);
              if (resolvedState.winner) {
                nextState = {
                  ...resolvedState,
                  phase: 'gameOver',
                  phaseEndsAt: null,
                };
              } else {
                nextState = {
                  ...resolvedState,
                  phase: 'morning',
                  phaseEndsAt: now + 7000,
                };
              }
            }
          }
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
            // Speed up voting conclusion to 1.5s so players see the final tally before moving to voteResult
            nextState.phaseEndsAt = Math.min(nextState.phaseEndsAt || now + 1500, now + 1500);
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
          nextState.phase = 'lobby';
          nextState.round = 0;
          nextState.winner = undefined;
          nextState.phaseEndsAt = null;
          nextState.votes = {};
          nextState.night = { subPhase: 'mafia', picks: {}, confirmed: {}, locked: {}, earlyEndAt: null };
          nextState.players = nextState.players.map((p) => ({
            ...p,
            alive: true,
            role: undefined,
            ready: false,
          }));
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

      // Channel access rules
      if (channel === 'mafia' && !isMafia && !isGod) return;
      if (channel === 'dead' && !isDead && !isGod) return;
      if (channel === 'public') {
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
          initialGameState = JSON.parse(savedHostRaw);
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

          // Heartbeat watchdog: detect dropped peers after 6.5s of silence
          state.players.forEach((p) => {
            if (!p.isHost && p.connected && (now - (p.lastSeen || 0) > 6500)) {
              handlePlayerDisconnect(p.id);
              changed = true;
            }
          });

          if (!changed && hostStateRef.current) {
            const advanced = maybeAdvance(hostStateRef.current, now, () => Math.random());
            if (advanced.version !== hostStateRef.current.version) {
              pushViews(advanced);
            }
          }
        }
      });

      // Screen Wake Lock
      requestScreenWakeLock();

      // Lazy import PeerJS on client
      import('peerjs').then(({ default: Peer }) => {
        if (!active) return;
        const peerId = `mafia-v1-${code}`;
        const peer = new Peer(peerId, { debug: 0 });
        peerRef.current = peer;

        peer.on('open', () => {
          setIsConnected(true);
        });

        peer.on('connection', (conn) => {
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

              const clientName = (data.name && String(data.name).trim()) || `Player ${state.players.length + 1}`;
              const clientAvatar = Number(data.avatar) || 1;
              const now = Date.now();

              const existingIndex = state.players.findIndex(
                (p) => p.token === data.token || p.id === conn.peer
              );

              // Reject if game already running and this is a new player
              if (state.phase !== 'lobby' && existingIndex === -1) {
                conn.send({ type: 'reject', reason: 'started' });
                setTimeout(() => {
                  try { conn.close(); } catch (_) {}
                }, 500);
                return;
              }

              // Reject if room is full
              if (state.players.length >= state.settings.maxPlayers && existingIndex === -1) {
                conn.send({ type: 'reject', reason: 'full' });
                setTimeout(() => {
                  try { conn.close(); } catch (_) {}
                }, 500);
                return;
              }

              // Reject if codename is already taken by another player in this room
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
    } else {
      // Client Mode
      setIsHost(false);
      setIsConnecting(true);
      setError(null);

      connectTimeout = setTimeout(() => {
        if (!clientConnRef.current || !clientConnRef.current.open) {
          setError(`Room ${code} is unavailable or host is offline.`);
          setIsConnecting(false);
          try { clientConnRef.current?.close(); } catch (_) {}
        }
      }, 8500);

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

      import('peerjs').then(({ default: Peer }) => {
        if (!active) {
          if (connectTimeout) clearTimeout(connectTimeout);
          return;
        }
        const peer = new Peer({ debug: 0 });
        peerRef.current = peer;

        peer.on('open', (id) => {
          const conn = peer.connect(`mafia-v1-${code}`, { reliable: true });
          clientConnRef.current = conn;

          conn.on('open', () => {
            if (connectTimeout) clearTimeout(connectTimeout);
            setIsConnected(true);
            setIsConnecting(false);
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
            } else if (msg?.type === 'reject') {
              if (connectTimeout) clearTimeout(connectTimeout);
              const reasonMap: Record<string, string> = {
                started: 'Game is already in progress.',
                full: 'Room is full (maximum 16 players).',
                duplicate_name: `The codename "${effectiveName}" is already taken in this room. Please choose another name.`,
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

  const setGodMode = useCallback(
    (isGod: boolean) => {
      sendIntent('setGod', isGod);
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
    kickPlayer,
    setGodMode,
    updateSettings,
    updateProfile,
    leaveRoom,
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
    isHost: true,
    isGod: false,
    ready: true,
    connected: true,
    lastSeen: Date.now(),
    alive: true,
  };

  return {
    code,
    version: 1,
    phase: 'lobby',
    round: 0,
    phaseEndsAt: null,
    paused: false,
    settings: DEFAULT_SETTINGS,
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
