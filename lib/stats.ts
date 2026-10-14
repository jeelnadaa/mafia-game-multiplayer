// Local Player Stats, Achievements, Match Awards, and Canvas Share Card

import { PlayerView, Role, SecretLogEntry, LogEntry, ClientGameView } from './types';

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  roleCounts: Record<Role, number>;
  roleWins: Record<Role, number>;
  totalSecondsPlayed: number;
  lastPlayed: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface MatchAward {
  id: string;
  title: string;
  recipientName: string;
  recipientAvatar: number;
  description: string;
  badge: string;
}

export const INITIAL_STATS: PlayerStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  currentStreak: 0,
  bestStreak: 0,
  roleCounts: {
    mafia: 0,
    godfather: 0,
    doctor: 0,
    police: 0,
    vigilante: 0,
    jester: 0,
    civilian: 0,
  },
  roleWins: {
    mafia: 0,
    godfather: 0,
    doctor: 0,
    police: 0,
    vigilante: 0,
    jester: 0,
    civilian: 0,
  },
  totalSecondsPlayed: 0,
  lastPlayed: 0,
};

export const ACHIEVEMENTS_LIST: Achievement[] = [
  {
    id: 'survived_town',
    title: 'Survivor of Shadows',
    description: 'Survived until the end and claimed victory as Town.',
    unlocked: false,
  },
  {
    id: 'untouchable_mafia',
    title: 'Untouchable Syndicate',
    description: 'Won as Mafia without receiving a single daytime vote.',
    unlocked: false,
  },
  {
    id: 'three_mafia_voted',
    title: 'Master Inquisitor',
    description: 'Cast decisive votes to eliminate 2 or more Syndicate members.',
    unlocked: false,
  },
  {
    id: 'ten_games',
    title: 'Veteran Detective',
    description: 'Played 10 full multiplayer investigations.',
    unlocked: false,
  },
];

const STATS_STORAGE_KEY = 'mafia_player_stats_v1';
const ACHIEVEMENTS_STORAGE_KEY = 'mafia_achievements_v1';
const PROCESSED_GAMES_KEY = 'mafia_processed_game_ids';

/**
 * Loads persisted player stats with safe error recovery
 */
export function getPlayerStats(): PlayerStats {
  if (typeof window === 'undefined') return INITIAL_STATS;
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return INITIAL_STATS;
    const parsed = JSON.parse(raw);
    return { ...INITIAL_STATS, ...parsed };
  } catch (_) {
    return INITIAL_STATS;
  }
}

/**
 * Loads persisted achievements with safe error recovery
 */
export function getPlayerAchievements(): Achievement[] {
  if (typeof window === 'undefined') return ACHIEVEMENTS_LIST;
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (!raw) return ACHIEVEMENTS_LIST;
    const unlockedMap: Record<string, number> = JSON.parse(raw);
    return ACHIEVEMENTS_LIST.map((ach) => ({
      ...ach,
      unlocked: Boolean(unlockedMap[ach.id]),
      unlockedAt: unlockedMap[ach.id] || undefined,
    }));
  } catch (_) {
    return ACHIEVEMENTS_LIST;
  }
}

/**
 * Record match completion once per room match ID (idempotent)
 */
export function recordMatchCompletion(
  gameId: string,
  winner: 'town' | 'mafia' | 'jester',
  myRole: Role,
  survived: boolean,
  matchDurationSec: number = 300
): { stats: PlayerStats; newAchievements: Achievement[] } {
  const currentStats = getPlayerStats();
  const currentAchievements = getPlayerAchievements();

  if (typeof window === 'undefined') {
    return { stats: currentStats, newAchievements: [] };
  }

  // Idempotency check: don't double count if user reloads on game over screen
  try {
    const rawProcessed = localStorage.getItem(PROCESSED_GAMES_KEY);
    const processed: string[] = rawProcessed ? JSON.parse(rawProcessed) : [];
    if (processed.includes(gameId)) {
      return { stats: currentStats, newAchievements: [] };
    }
    processed.push(gameId);
    localStorage.setItem(PROCESSED_GAMES_KEY, JSON.stringify(processed.slice(-50)));
  } catch (_) {}

  const isTownRole = myRole === 'doctor' || myRole === 'police' || myRole === 'vigilante' || myRole === 'civilian';
  const isMafiaRole = myRole === 'mafia' || myRole === 'godfather';

  const didWin =
    (winner === 'town' && isTownRole) ||
    (winner === 'mafia' && isMafiaRole) ||
    (winner === 'jester' && myRole === 'jester');

  const gamesPlayed = currentStats.gamesPlayed + 1;
  const wins = currentStats.wins + (didWin ? 1 : 0);
  const losses = currentStats.losses + (didWin ? 0 : 1);
  const currentStreak = didWin ? currentStats.currentStreak + 1 : 0;
  const bestStreak = Math.max(currentStats.bestStreak, currentStreak);

  const roleCounts = {
    ...currentStats.roleCounts,
    [myRole]: (currentStats.roleCounts[myRole] || 0) + 1,
  };

  const roleWins = {
    ...currentStats.roleWins,
    [myRole]: (currentStats.roleWins[myRole] || 0) + (didWin ? 1 : 0),
  };

  const updatedStats: PlayerStats = {
    gamesPlayed,
    wins,
    losses,
    currentStreak,
    bestStreak,
    roleCounts,
    roleWins,
    totalSecondsPlayed: currentStats.totalSecondsPlayed + matchDurationSec,
    lastPlayed: Date.now(),
  };

  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(updatedStats));
  } catch (_) {}

  // Check achievements
  const newAchievements: Achievement[] = [];
  const unlockedMap: Record<string, number> = {};
  currentAchievements.forEach((a) => {
    if (a.unlocked && a.unlockedAt) unlockedMap[a.id] = a.unlockedAt;
  });

  const now = Date.now();

  // 1. Survived Town
  if (!unlockedMap['survived_town'] && isTownRole && didWin && survived) {
    unlockedMap['survived_town'] = now;
  }

  // 2. Untouchable Mafia
  if (!unlockedMap['untouchable_mafia'] && isMafiaRole && didWin) {
    unlockedMap['untouchable_mafia'] = now;
  }

  // 3. Ten Games
  if (!unlockedMap['ten_games'] && gamesPlayed >= 10) {
    unlockedMap['ten_games'] = now;
  }

  try {
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(unlockedMap));
  } catch (_) {}

  const finalAchievements = currentAchievements.map((ach) => {
    const isNowUnlocked = Boolean(unlockedMap[ach.id]);
    if (!ach.unlocked && isNowUnlocked) {
      newAchievements.push({ ...ach, unlocked: true, unlockedAt: unlockedMap[ach.id] });
    }
    return {
      ...ach,
      unlocked: isNowUnlocked,
      unlockedAt: unlockedMap[ach.id] || undefined,
    };
  });

  return { stats: updatedStats, newAchievements };
}

/**
 * Resets local stats & achievements
 */
export function resetPlayerStats(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STATS_STORAGE_KEY);
      localStorage.removeItem(ACHIEVEMENTS_STORAGE_KEY);
      localStorage.removeItem(PROCESSED_GAMES_KEY);
    } catch (_) {}
  }
}

/**
 * Computes derived end-of-match awards from game logs
 */
export function computeMatchAwards(
  players: PlayerView[],
  log: LogEntry[],
  secretLog?: SecretLogEntry[],
  winner?: 'town' | 'mafia' | 'jester'
): MatchAward[] {
  const awards: MatchAward[] = [];

  // 1. Lone Wolf: Last surviving Mafia member if Mafia won
  const mafiaMembers = players.filter((p) => p.role === 'mafia' || p.role === 'godfather');
  const livingMafia = mafiaMembers.filter((m) => m.alive);
  if (livingMafia.length === 1 && winner === 'mafia') {
    awards.push({
      id: 'lone_wolf',
      title: 'Lone Wolf',
      recipientName: livingMafia[0].name,
      recipientAvatar: livingMafia[0].avatar,
      description: 'Single-handedly outsmarted the town as the last surviving Syndicate operative.',
      badge: 'MAFIA',
    });
  }

  // 2. Silver Tongue: Longest surviving Mafia member
  if (mafiaMembers.length > 0) {
    const sortedMafia = [...mafiaMembers].sort((a, b) => {
      if (a.alive && !b.alive) return -1;
      if (!a.alive && b.alive) return 1;
      return (b.diedInRound || 99) - (a.diedInRound || 99);
    });
    if (sortedMafia[0]) {
      awards.push({
        id: 'silver_tongue',
        title: 'Silver Tongue',
        recipientName: sortedMafia[0].name,
        recipientAvatar: sortedMafia[0].avatar,
        description: 'Successfully deflected suspicion and survived longest within the syndicate.',
        badge: 'SURVIVOR',
      });
    }
  }

  // 3. Sharpest Eye: Town member who survived and won
  const livingTown = players.filter(
    (p) => p.alive && p.role !== 'mafia' && p.role !== 'godfather' && p.role !== 'jester' && !p.isGod
  );
  if (winner === 'town' && livingTown.length > 0) {
    awards.push({
      id: 'sharpest_eye',
      title: 'Sharpest Eye',
      recipientName: livingTown[0].name,
      recipientAvatar: livingTown[0].avatar,
      description: 'Stood resolute to the very end, piercing the syndicate veil of deception.',
      badge: 'TOWN',
    });
  }

  return awards;
}

/**
 * Renders a high-resolution noir share card onto an HTML5 canvas (1200x630)
 */
export async function renderShareCardToBlob(
  gameView: ClientGameView,
  localPlayerName: string,
  localPlayerRole?: string
): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, 1200, 630);

  // Noise / Subtle Grid Lines
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 1;
  for (let x = 0; x < 1200; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 630);
    ctx.stroke();
  }
  for (let y = 0; y < 630; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1200, y);
    ctx.stroke();
  }

  // Double Border
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, 1160, 590);

  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 1;
  ctx.strokeRect(28, 28, 1144, 574);

  // Top Classified Header
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#dc2626';
  ctx.fillText('TOP SECRET // MAFIA: SHADOWS OF THE CITY // DOSSIER SUMMARY', 60, 75);

  // Title: Winner
  const winnerTitle =
    gameView.winner === 'town'
      ? 'TOWN PREVAILS'
      : gameView.winner === 'mafia'
      ? 'SYNDICATE WINS'
      : 'JESTER VICTORY';

  ctx.font = 'bold 54px sans-serif';
  ctx.fillStyle = '#fafafa';
  ctx.fillText(winnerTitle, 60, 160);

  // Match Details
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText(
    `Room Code: ${gameView.code}  ·  Rounds: ${gameView.round}  ·  Players: ${gameView.players.length}`,
    60,
    210
  );

  // Local Player Dossier Box
  ctx.fillStyle = '#111113';
  ctx.fillRect(60, 260, 500, 240);
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 260, 500, 240);

  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#71717a';
  ctx.fillText('OPERATIVE DOSSIER', 85, 295);

  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = '#fafafa';
  ctx.fillText(localPlayerName.slice(0, 18), 85, 345);

  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#d97706';
  ctx.fillText(`ROLE: ${(localPlayerRole || 'CIVILIAN').toUpperCase()}`, 85, 395);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText(
    `Status: ${gameView.me.alive ? 'Survived Operation' : 'Fallen in Action'}`,
    85,
    440
  );

  // Right Side: Roster preview
  ctx.fillStyle = '#111113';
  ctx.fillRect(600, 260, 540, 240);
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 2;
  ctx.strokeRect(600, 260, 540, 240);

  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#71717a';
  ctx.fillText('IDENTIFIED ATTRITION', 625, 295);

  const displayPlayers = gameView.players.slice(0, 5);
  displayPlayers.forEach((p, idx) => {
    ctx.font = '16px sans-serif';
    ctx.fillStyle = p.alive ? '#fafafa' : '#71717a';
    const roleText = p.role ? `(${p.role.toUpperCase()})` : '';
    ctx.fillText(
      `${idx + 1}. ${p.name.slice(0, 14)} ${roleText}`,
      625,
      340 + idx * 30
    );
  });

  // Footer: Site URL
  ctx.font = '16px monospace';
  ctx.fillStyle = '#71717a';
  ctx.fillText('Play free P2P at https://the-apes.vercel.app · No signup required', 60, 565);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}
