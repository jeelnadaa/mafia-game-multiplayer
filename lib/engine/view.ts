import { GameState, ClientGameView, PlayerView, Role } from '../types';
import { PLAYER_COLORS, computeSettingsHash } from '../settings';

export function buildViewFor(state: GameState, observerId: string, now: number): ClientGameView {
  const me = state.players.find((p) => p.id === observerId);
  const isGod = me?.isGod || false;
  const isDead = me ? !me.alive : false;
  const isGameOver = state.phase === 'gameOver' || Boolean(state.winner);
  const isObserverMafia = me?.role === 'mafia' || me?.role === 'godfather';

  // Format players list with masked roles
  const playerViews: PlayerView[] = state.players.map((p, idx) => {
    let roleVisible = false;
    let alignment: 'town' | 'mafia' | 'jester' | undefined = undefined;

    const pAlignment: 'town' | 'mafia' | 'jester' =
      p.role === 'mafia' || p.role === 'godfather'
        ? 'mafia'
        : p.role === 'jester'
        ? 'jester'
        : 'town';

    if (p.id === observerId) {
      roleVisible = true;
      alignment = pAlignment;
    } else if (isGod || isGameOver) {
      roleVisible = true;
      alignment = pAlignment;
    } else if (isObserverMafia && (p.role === 'mafia' || p.role === 'godfather')) {
      roleVisible = true;
      alignment = 'mafia';
    } else if (isDead && state.settings.deadSeeRoles) {
      roleVisible = true;
      alignment = pAlignment;
    } else if (!p.alive) {
      if (state.settings.revealRoleOnDeath === 'full') {
        roleVisible = true;
        alignment = pAlignment;
      } else if (state.settings.revealRoleOnDeath === 'alignment') {
        alignment = pAlignment;
      }
    }

    let voteTarget: string | 'skip' | null | undefined = undefined;
    if (state.settings.voteVisibility === 'public' && (state.phase === 'voting' || state.phase === 'voteResult')) {
      voteTarget = state.votes[p.id] || null;
    }

    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color || PLAYER_COLORS[idx % PLAYER_COLORS.length],
      isHost: p.isHost,
      isGod: p.isGod,
      ready: p.ready,
      connected: p.connected,
      alive: p.alive,
      role: roleVisible ? p.role : undefined,
      alignment,
      diedInRound: p.diedInRound,
      diedBy: p.diedBy,
      voteTarget,
    };
  });

  // Calculate live vote counts
  const voteCounts: Record<string, number> = {};
  if (state.phase === 'voting' || state.phase === 'voteResult') {
    Object.values(state.votes).forEach((target) => {
      if (target) {
        voteCounts[target] = (voteCounts[target] || 0) + 1;
      }
    });
  }

  // Active role check
  const subPhase = state.night.subPhase || 'mafia';
  const canActNow =
    state.phase === 'night' &&
    Boolean(me?.alive) &&
    !isGod &&
    ((subPhase === 'mafia' && isObserverMafia) ||
      (subPhase === 'doctor' && me?.role === 'doctor') ||
      (subPhase === 'police' && me?.role === 'police') ||
      (subPhase === 'vigilante' &&
        me?.role === 'vigilante' &&
        Math.max(0, state.settings.vigilanteShots - (state.shotsUsed[observerId] || 0)) > 0));

  const isConfirmed = Boolean(state.night.confirmed?.[observerId]);

  // Teammates and picks for Mafia
  let teammates: string[] | undefined = undefined;
  let teammatePicks: Record<string, string | null> | undefined = undefined;
  if (isObserverMafia) {
    teammates = state.players
      .filter((p) => (p.role === 'mafia' || p.role === 'godfather') && p.id !== observerId)
      .map((p) => p.id);

    teammatePicks = {};
    state.players
      .filter((p) => (p.role === 'mafia' || p.role === 'godfather') && p.alive)
      .forEach((p) => {
        teammatePicks![p.id] = state.night.picks[p.id] || null;
      });
  }

  // Filter police inbox for this specific police player
  const myPoliceInbox = state.policeInbox
    .filter((entry) => entry.policeId === observerId)
    .map((e) => ({
      targetId: e.targetId,
      result: e.revealRound <= state.round ? e.result : 'Report pending...',
      round: e.fromRound,
      ready: e.revealRound <= state.round,
    }));

  // Doctor self saves and history
  const doctorHistory = state.doctorHistory[observerId];
  const doctorSelfSavesRemaining =
    me?.role === 'doctor'
      ? state.settings.doctorSelfSave === 'never'
        ? 0
        : state.settings.doctorSelfSave === 'once'
        ? Math.max(0, 1 - (doctorHistory?.selfSavesUsed || 0))
        : 999
      : undefined;
  const doctorLastSavedId = me?.role === 'doctor' ? doctorHistory?.lastSavedId || null : undefined;

  // Filter chats by readable channel and room settings
  const allowedChannels: string[] = ['public'];
  if (isObserverMafia && (state.settings.mafiaNightChat || isGod)) allowedChannels.push('mafia');
  if (isDead && (state.settings.deadChat || isGod)) allowedChannels.push('dead');
  if (isGod) allowedChannels.push('god', 'mafia', 'dead');

  const filteredChat = state.chat.filter((msg) => allowedChannels.includes(msg.channel));

  return {
    code: state.code,
    version: state.version,
    phase: state.phase,
    nightSubPhase: canActNow || isGod || isGameOver ? subPhase : undefined,
    round: state.round,
    phaseEndsAt: state.phaseEndsAt,
    paused: state.paused,
    settings: state.settings,
    players: playerViews,
    me: {
      id: me?.id || observerId,
      token: me?.token || '',
      name: me?.name || 'Observer',
      avatar: me?.avatar || 1,
      color: me?.color || PLAYER_COLORS[0],
      role: me?.role,
      isGod,
      isHost: me?.isHost || false,
      alive: me?.alive ?? true,
      canActNow,
      isConfirmed,
      teammates,
      teammatePicks,
      nightPick: state.night.picks[observerId] || null,
      nightLocked: Boolean(state.night.locked[observerId]),
      shotsRemaining: me?.role === 'vigilante'
        ? Math.max(0, state.settings.vigilanteShots - (state.shotsUsed[observerId] || 0))
        : undefined,
      policeInbox: myPoliceInbox,
      doctorSelfSavesRemaining,
      doctorLastSavedId,
      vote: state.votes[observerId] || null,
      readyToVote: state.readyToVote.includes(observerId),
      isReady: me?.ready || false,
    },
    publicVotes: state.settings.voteVisibility === 'public' ? state.votes : undefined,
    voteCounts,
    readyToVote: state.readyToVote || [],
    log: state.log,
    chat: filteredChat,
    winner: state.winner,
    serverNow: now,
    secretLog: isGameOver ? state.secretLog : undefined,
    isLocked: Boolean(state.isLocked),
    effectiveSettingsHash: computeSettingsHash(state.settings),
  };
}
