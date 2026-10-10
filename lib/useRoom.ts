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
import { assignRoles, validateSettings } from './engine/rules';
import { initSound, playNightBell, playDayChime, playGavelStrike, playFanfare } from './sfx';

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
}

export function useRoom(roomCode: string, playerName = 'Player', playerAvatar = 1): UseRoomReturn {
  const [gameView, setGameView] = useState<ClientGameView | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rtt, setRtt] = useState(18);

  const hostStateRef = useRef<GameState | null>(null);
  const myPlayerIdRef = useRef<string>('');
  const peerRef = useRef<any>(null);
  const clientConnRef = useRef<any>(null);
  const connectionsRef = useRef<Record<string, any>>({});
  const tickWorkerRef = useRef<{ terminate: () => void } | null>(null);
  const lastPhaseRef = useRef<string>('');

  // 1. Initialize Audio and Identity
  useEffect(() => {
    initSound();
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

    // Save to host storage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`mafia-host:${state.code}`, JSON.stringify(state));
    }

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

  // Host Intent Handler
  const handleHostIntent = useCallback(
    (playerId: string, intentType: IntentType, payload: any) => {
      const state = hostStateRef.current;
      if (!state) return;

      let nextState = { ...state };
      const now = Date.now();

      switch (intentType) {
        case 'setReady': {
          nextState.players = nextState.players.map((p) =>
            p.id === playerId ? { ...p, ready: !p.ready } : p
          );
          nextState.version++;
          break;
        }

        case 'updateSettings': {
          nextState.settings = { ...nextState.settings, ...payload };
          nextState.version++;
          break;
        }

        case 'setGod': {
          nextState.players = nextState.players.map((p) =>
            p.id === playerId ? { ...p, isGod: Boolean(payload) } : p
          );
          nextState.version++;
          break;
        }

        case 'kick': {
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
          const player = nextState.players.find((p) => p.id === playerId);
          if (!player?.isHost && !player?.isGod) return;

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
      }

      pushViews(nextState);
    },
    [pushViews]
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
    let active = true;
    const code = roomCode.toUpperCase();
    const token = localStorage.getItem(`mafia-token:${code}`) || generateToken();

    // Check if host state exists in localStorage
    const savedHostRaw = typeof localStorage !== 'undefined' ? localStorage.getItem(`mafia-host:${code}`) : null;
    const isHostCandidate = Boolean(savedHostRaw) || !window.location.search.includes('join');

    if (isHostCandidate) {
      setIsHost(true);
      let initialGameState: GameState;

      if (savedHostRaw) {
        try {
          initialGameState = JSON.parse(savedHostRaw);
        } catch {
          initialGameState = createInitialState(code, myPlayerIdRef.current, token, playerName, playerAvatar);
        }
      } else {
        initialGameState = createInitialState(code, myPlayerIdRef.current, token, playerName, playerAvatar);
      }

      hostStateRef.current = initialGameState;
      pushViews(initialGameState);
      setIsConnected(true);
      setIsConnecting(false);

      // Start authoritative Web Worker tick
      tickWorkerRef.current = createTickWorker(() => {
        if (hostStateRef.current) {
          const advanced = maybeAdvance(hostStateRef.current, Date.now(), () => Math.random());
          if (advanced.version !== hostStateRef.current.version) {
            pushViews(advanced);
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
            if (data?.type === 'hello') {
              const newPlayer: Player = {
                id: conn.peer,
                token: data.token || generateToken(),
                name: data.name,
                avatar: data.avatar || 1,
                isHost: false,
                isGod: false,
                ready: false,
                connected: true,
                lastSeen: Date.now(),
                alive: true,
              };

              connectionsRef.current[conn.peer] = conn;

              if (hostStateRef.current) {
                const existingIndex = hostStateRef.current.players.findIndex(
                  (p) => p.token === data.token || p.id === conn.peer
                );
                let updatedPlayers = [...hostStateRef.current.players];

                if (existingIndex !== -1) {
                  updatedPlayers[existingIndex] = {
                    ...updatedPlayers[existingIndex],
                    connected: true,
                    name: data.name,
                  };
                } else {
                  updatedPlayers.push(newPlayer);
                }

                const updated = {
                  ...hostStateRef.current,
                  players: updatedPlayers,
                  version: hostStateRef.current.version + 1,
                };
                pushViews(updated);
              }
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
          });
        });
      });
    } else {
      // Client Mode
      setIsHost(false);
      import('peerjs').then(({ default: Peer }) => {
        if (!active) return;
        const peer = new Peer({ debug: 0 });
        peerRef.current = peer;

        peer.on('open', (id) => {
          const conn = peer.connect(`mafia-v1-${code}`, { reliable: true });
          clientConnRef.current = conn;
          conn.on('open', () => {
            setIsConnected(true);
            setIsConnecting(false);
            conn.send({
              type: 'hello',
              code,
              name: playerName,
              avatar: playerAvatar,
              token,
            });
          });

          conn.on('data', (msg: any) => {
            if (msg?.type === 'view') {
              setGameView(msg.view);
            } else if (msg?.type === 'kicked') {
              setError('You were removed from the room.');
              setIsConnected(false);
            }
          });

          conn.on('close', () => {
            setIsConnected(false);
            clientConnRef.current = null;
          });
        });

        peer.on('error', () => {
          setError('Failed to establish peer connection.');
          setIsConnecting(false);
        });
      });
    }

    return () => {
      active = false;
      tickWorkerRef.current?.terminate();
      peerRef.current?.destroy();
    };
  }, [roomCode, playerName, playerAvatar, pushViews, handleHostIntent, handleHostChat]);

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
