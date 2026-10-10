import { GameState, ClientGameView, PlayerView, Role } from '../types';

export function buildViewFor(state: GameState, observerId: string, now: number): ClientGameView {
  const me = state.players.find((p) => p.id === observerId);
  const isGod = me?.isGod || false;
  const isDead = me ? !me.alive : false;
  const isGameOver = state.phase === 'gameOver' || Boolean(state.winner);
  const isObserverMafia = me?.role === 'mafia' || me?.role === 'godfather';

  // Format players list with masked roles
  const playerViews: PlayerView[] = state.players.map((p) => {
    let roleVisible = false;

    if (p.id === observerId) {
      roleVisible = true;
    } else if (isGod || isGameOver) {
      roleVisible = true;
    } else if (isObserverMafia && (p.role === 'mafia' || p.role === 'godfather')) {
      roleVisible = true;
    } else if (isDead && state.settings.deadSeeRoles) {
      roleVisible = true;
    } else if (!p.alive) {
      if (state.settings.revealRoleOnDeath === 'full') {
        roleVisible = true;
      }
    }

    let voteTarget: string | 'skip' | null | undefined = undefined;
    if (state.settings.voteVisibility === 'public' && state.phase === 'voting') {
      voteTarget = state.votes[p.id] || null;
    }

    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.isHost,
      isGod: p.isGod,
      ready: p.ready,
      connected: p.connected,
      alive: p.alive,
      role: roleVisible ? p.role : undefined,
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
    .filter((entry) => entry.policeId === observerId && entry.revealRound <= state.round)
    .map((e) => ({
      targetId: e.targetId,
      result: e.result,
      round: e.fromRound,
    }));

  // Filter chats by readable channel
  const allowedChannels: string[] = ['public'];
  if (isObserverMafia) allowedChannels.push('mafia');
  if (isDead) allowedChannels.push('dead');
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
  };
}
