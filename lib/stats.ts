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
/**
 * Renders a high-resolution noir share card onto an HTML5 canvas (1200x630 landscape or 1080x1350 portrait)
 */
export async function renderShareCardToBlob(
  gameView: ClientGameView,
  localPlayerName: string,
  localPlayerRole?: string,
  options?: { format?: 'landscape' | 'portrait' }
): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch (_) {}

  const isPortrait = options?.format === 'portrait';
  const width = isPortrait ? 1080 : 1200;
  const height = isPortrait ? 1350 : 630;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background: Deep Ink
  ctx.fillStyle = '#0A0B0E';
  ctx.fillRect(0, 0, width, height);

  // Subtle Aged File Border
  ctx.strokeStyle = '#262A33';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  ctx.strokeStyle = '#D9A441';
  ctx.lineWidth = 1;
  ctx.strokeRect(32, 32, width - 64, height - 64);

  // Top Classified Header
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.fillStyle = '#B3363B';
  ctx.fillText('TOP SECRET // DECLASSIFIED OFFICIAL MATCH DOCKET // CASE RECORD', 60, 68);

  // Wordmark
  ctx.font = 'bold 22px "Georgia", serif';
  ctx.fillStyle = '#D9A441';
  ctx.fillText('MAFIA: SHADOWS OF THE CITY', 60, 102);

  // Title: Winner Verdict
  const winnerTitle =
    gameView.winner === 'town'
      ? 'THE TOWN PREVAILS'
      : gameView.winner === 'mafia'
      ? 'THE SYNDICATE WINS'
      : 'THE JESTER PREVAILS';

  ctx.font = '900 48px "Georgia", serif';
  ctx.fillStyle = gameView.winner === 'mafia' ? '#fca5a5' : '#ECE6D8';
  ctx.fillText(winnerTitle, 60, 160);

  // Case Metadata
  ctx.font = '14px "Courier New", monospace';
  ctx.fillStyle = '#A39D90';
  ctx.fillText(
    `CASE #${gameView.code}  ·  ROUNDS: ${gameView.round}  ·  OPERATIVES: ${gameView.players.length}  ·  DATE: ${new Date().toLocaleDateString()}`,
    60,
    195
  );

  if (!isPortrait) {
    // Landscape Layout (1200x630)
    // Left Box: Operative File
    ctx.fillStyle = '#101216';
    ctx.fillRect(60, 230, 520, 310);
    ctx.strokeStyle = '#262A33';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(60, 230, 520, 310);

    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = '#A39D90';
    ctx.fillText('SUBJECT DOSSIER', 85, 265);

    ctx.font = 'bold 30px "Georgia", serif';
    ctx.fillStyle = '#ECE6D8';
    ctx.fillText(localPlayerName.slice(0, 20), 85, 315);

    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = '#D9A441';
    ctx.fillText(`ROLE: ${(localPlayerRole || 'CIVILIAN').toUpperCase()}`, 85, 360);

    ctx.font = '14px "Georgia", serif';
    ctx.fillStyle = '#A39D90';
    ctx.fillText(
      `Status: ${gameView.me?.alive ? 'Survived Operation' : 'Fallen in Action'}`,
      85,
      405
    );

    // Stamped mark
    ctx.save();
    ctx.translate(450, 440);
    ctx.rotate(-0.1);
    ctx.font = '900 24px "Courier New", monospace';
    ctx.fillStyle = gameView.me?.alive ? '#5E8C7B' : '#B3363B';
    ctx.strokeStyle = gameView.me?.alive ? '#5E8C7B' : '#B3363B';
    ctx.lineWidth = 2;
    ctx.strokeRect(-10, -26, 140, 36);
    ctx.fillText(gameView.me?.alive ? 'SURVIVED' : 'ELIMINATED', 0, 0);
    ctx.restore();

    // Right Box: Roster Attrition Record
    ctx.fillStyle = '#101216';
    ctx.fillRect(620, 230, 520, 310);
    ctx.strokeStyle = '#262A33';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(620, 230, 520, 310);

    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = '#A39D90';
    ctx.fillText('IDENTIFIED ATTRITION & ROLES', 645, 265);

    const displayPlayers = gameView.players.slice(0, 7);
    displayPlayers.forEach((p, idx) => {
      ctx.font = '14px "Georgia", serif';
      ctx.fillStyle = p.alive ? '#ECE6D8' : '#71717a';
      const roleText = p.role ? `(${p.role.toUpperCase()})` : '';
      const statusText = p.alive ? '· Survived' : `· Fallen R${p.diedInRound || 1}`;
      ctx.fillText(
        `${idx + 1}. ${p.name.slice(0, 16)} ${roleText} ${statusText}`,
        645,
        305 + idx * 30
      );
    });
  } else {
    // Portrait Layout (1080x1350)
    ctx.fillStyle = '#101216';
    ctx.fillRect(60, 240, 960, 420);
    ctx.strokeStyle = '#262A33';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 240, 960, 420);

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#A39D90';
    ctx.fillText('SUBJECT DOSSIER', 95, 285);

    ctx.font = 'bold 44px "Georgia", serif';
    ctx.fillStyle = '#ECE6D8';
    ctx.fillText(localPlayerName.slice(0, 24), 95, 360);

    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillStyle = '#D9A441';
    ctx.fillText(`ROLE: ${(localPlayerRole || 'CIVILIAN').toUpperCase()}`, 95, 430);

    // Roster Box
    ctx.fillStyle = '#101216';
    ctx.fillRect(60, 700, 960, 520);
    ctx.strokeStyle = '#262A33';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 700, 960, 520);

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#A39D90';
    ctx.fillText('ATTRITION & IDENTITIES', 95, 745);

    gameView.players.slice(0, 12).forEach((p, idx) => {
      ctx.font = '18px "Georgia", serif';
      ctx.fillStyle = p.alive ? '#ECE6D8' : '#71717a';
      const roleText = p.role ? `· ${(p.role || '').toUpperCase()}` : '';
      ctx.fillText(
        `${idx + 1}. ${p.name.slice(0, 20)} ${roleText}`,
        95,
        795 + idx * 34
      );
    });
  }

  // Footer: Site URL
  ctx.font = '12px "Courier New", monospace';
  ctx.fillStyle = '#A39D90';
  ctx.fillText('Play free P2P at https://the-apes.vercel.app · No signup required', 60, height - 42);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}
