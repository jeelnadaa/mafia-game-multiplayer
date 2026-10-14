/**
 * peer-simulator.ts — In-Memory Peer & WebRTC Transport Simulator
 *
 * Implements headless simulation of Host-as-Hub Star topology per Spec Section 7 & 8.2.
 * Allows simulating network packet drops, delays, reordering, disconnections, reconnects,
 * late joiners, and host migrations across 4 to 12 headless players.
 */

import { GameState, ClientGameView, Settings, Player, IntentType, Role } from '../types';
import { DEFAULT_SETTINGS, PLAYER_COLORS } from '../settings';
import { buildViewFor } from './view';
import { maybeAdvance, resolveNight, tallyVotes } from './phases';
import { assignRoles, validateSettings, checkWinCondition } from './rules';

export interface SimulatedPacket {
  id: string;
  from: string;
  to: string;
  data: any;
  sendTime: number;
  deliverTime: number;
  dropped?: boolean;
}

export class VirtualNetworkHub {
  private peers: Map<string, (from: string, data: any) => void> = new Map();
  private packetQueue: SimulatedPacket[] = [];
  public dropRate = 0; // 0.0 to 1.0
  public latencyMs = 0;
  public partitionedPeers: Set<string> = new Set();
  public deliveryLog: SimulatedPacket[] = [];

  registerPeer(id: string, onMessage: (from: string, data: any) => void) {
    this.peers.set(id, onMessage);
  }

  unregisterPeer(id: string) {
    this.peers.delete(id);
  }

  partition(peerId: string) {
    this.partitionedPeers.add(peerId);
  }

  heal(peerId: string) {
    this.partitionedPeers.delete(peerId);
  }

  send(from: string, to: string, data: any, now = Date.now()) {
    // Check network partition
    if (this.partitionedPeers.has(from) || this.partitionedPeers.has(to)) {
      return;
    }

    // Check drop rate
    const dropped = Math.random() < this.dropRate;
    const packet: SimulatedPacket = {
      id: `pkt_${Math.random().toString(36).slice(2, 9)}`,
      from,
      to,
      data: JSON.parse(JSON.stringify(data)), // Enforce serialization round-trip test!
      sendTime: now,
      deliverTime: now + this.latencyMs,
      dropped,
    };

    this.deliveryLog.push(packet);

    if (dropped) return;

    if (this.latencyMs <= 0) {
      const handler = this.peers.get(to);
      if (handler) handler(from, packet.data);
    } else {
      this.packetQueue.push(packet);
    }
  }

  flushQueue(now = Date.now()) {
    const ready = this.packetQueue.filter((p) => p.deliverTime <= now && !p.dropped);
    this.packetQueue = this.packetQueue.filter((p) => p.deliverTime > now && !p.dropped);

    for (const pkt of ready) {
      if (!this.partitionedPeers.has(pkt.from) && !this.partitionedPeers.has(pkt.to)) {
        const handler = this.peers.get(pkt.to);
        if (handler) handler(pkt.from, pkt.data);
      }
    }
  }
}

export class SimulatedRoom {
  public code: string;
  public hub: VirtualNetworkHub;
  public hostState: GameState;
  public hostId: string;
  public clientViews: Map<string, ClientGameView> = new Map();
  public peerTokens: Map<string, string> = new Map();

  constructor(code = 'SIM01', hostName = 'HostPlayer', hostAvatar = 1) {
    this.code = code;
    this.hub = new VirtualNetworkHub();
    this.hostId = 'host_peer_0';
    const hostToken = 'tok_host_0';
    this.peerTokens.set(this.hostId, hostToken);

    this.hostState = {
      code,
      version: 1,
      phase: 'lobby',
      round: 0,
      phaseEndsAt: null,
      paused: false,
      settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
      players: [
        {
          id: this.hostId,
          token: hostToken,
          name: hostName,
          avatar: hostAvatar,
          color: PLAYER_COLORS[0],
          isHost: true,
          isGod: false,
          ready: true,
          connected: true,
          lastSeen: Date.now(),
          alive: true,
        },
      ],
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

    // Register host peer on network
    this.hub.registerPeer(this.hostId, (from, data) => this.handleHostIncoming(from, data));
    this.broadcastViews();
  }

  broadcastViews(now = Date.now()) {
    // 1. Host local view
    const hostView = buildViewFor(this.hostState, this.hostId, now);
    this.clientViews.set(this.hostId, hostView);

    // 2. Transmit projection to each connected peer
    for (const player of this.hostState.players) {
      if (player.id !== this.hostId && player.connected) {
        const view = buildViewFor(this.hostState, player.id, now);
        this.hub.send(this.hostId, player.id, {
          type: 'view',
          version: this.hostState.version,
          view,
        }, now);
      }
    }
  }

  joinPlayer(peerId: string, name: string, avatar: number, token?: string, now = Date.now()): ClientGameView | null {
    const finalToken = token || `tok_${peerId}`;
    this.peerTokens.set(peerId, finalToken);

    // Register client listener on network
    this.hub.registerPeer(peerId, (_from, data) => {
      if (data?.type === 'view') {
        this.clientViews.set(peerId, data.view);
      }
    });

    // Send hello to host
    this.hub.send(peerId, this.hostId, {
      type: 'hello',
      code: this.code,
      name,
      avatar,
      token: finalToken,
    }, now);

    this.broadcastViews(now);
    return this.clientViews.get(peerId) || null;
  }

  disconnectPlayer(peerId: string) {
    const player = this.hostState.players.find((p) => p.id === peerId);
    if (!player) return;

    if (this.hostState.phase === 'lobby') {
      this.hostState.players = this.hostState.players.filter((p) => p.id !== peerId);
    } else {
      player.connected = false;
    }
    this.hostState.version++;
    this.hub.unregisterPeer(peerId);
    this.broadcastViews();
  }

  updateHostSettings(partial: Partial<Settings>) {
    this.hostState.settings = { ...this.hostState.settings, ...partial };
    this.hostState.version++;
    this.broadcastViews();
  }

  startGame(): { ok: boolean; reason?: string } {
    const validation = validateSettings(this.hostState.settings, this.hostState.players.length);
    if (!validation.valid) {
      return { ok: false, reason: validation.reason };
    }

    const assigned = assignRoles(this.hostState.players, this.hostState.settings, () => Math.random());
    this.hostState.players = assigned;
    this.hostState.phase = 'night';
    this.hostState.round = 1;
    this.hostState.night.subPhase = 'mafia';
    this.hostState.version++;
    this.broadcastViews();
    return { ok: true };
  }

  migrateHost(newHostId: string) {
    const prevHost = this.hostState.players.find((p) => p.id === this.hostId);
    const newHost = this.hostState.players.find((p) => p.id === newHostId);
    if (!newHost) throw new Error('Target peer is not in player roster');

    if (prevHost) prevHost.isHost = false;
    newHost.isHost = true;
    this.hostId = newHostId;
    this.hostState.version++;
    this.broadcastViews();
  }

  dispatchData(from: string, data: any) {
    this.handleHostIncoming(from, data);
  }

  private handleHostIncoming(from: string, data: any) {
    if (data?.type === 'hello') {
      const existing = this.hostState.players.find((p) => p.token === data.token);
      if (existing) {
        existing.id = from;
        existing.connected = true;
        existing.name = data.name;
        existing.avatar = data.avatar;
      } else {
        const color = PLAYER_COLORS[this.hostState.players.length % PLAYER_COLORS.length];
        this.hostState.players.push({
          id: from,
          token: data.token,
          name: data.name,
          avatar: data.avatar,
          color,
          isHost: false,
          isGod: false,
          ready: false,
          connected: true,
          lastSeen: Date.now(),
          alive: true,
        });
      }
      this.hostState.version++;
      this.broadcastViews();
    } else if (data?.type === 'intent') {
      if (data.intentType === 'toggleReady') {
        const p = this.hostState.players.find((pl) => pl.id === from);
        if (p) p.ready = !p.ready;
      } else if (data.intentType === 'vote') {
        this.hostState.votes[from] = data.payload?.targetId || null;
      } else if (data.intentType === 'nightAction') {
        this.hostState.night.picks[from] = data.payload?.targetId || null;
      } else if (data.intentType === 'setSuspicion') {
        if (!this.hostState.suspicions) this.hostState.suspicions = {};
        if (data.payload?.targetId) this.hostState.suspicions[from] = data.payload.targetId;
      } else if (data.intentType === 'clearSuspicion') {
        if (this.hostState.suspicions) delete this.hostState.suspicions[from];
      } else if (data.intentType === 'sendReaction') {
        if (!this.hostState.reactions) this.hostState.reactions = {};
        this.hostState.reactions[from] = {
          reaction: data.payload?.reaction,
          timestamp: Date.now(),
        };
      }
      this.hostState.version++;
      this.broadcastViews();
    }
  }
}
