import { Player, Role, Settings } from '../types';

export function validateSettings(settings: Settings, playerCount: number): { valid: boolean; reason?: string } {
  // If moderatorMode is god, one player is the non-playing Narrator
  const isGodMode = settings.moderatorMode === 'god';
  const effectivePlayingCount = isGodMode ? Math.max(0, playerCount - 1) : playerCount;

  if (effectivePlayingCount < 4) {
    return {
      valid: false,
      reason: isGodMode
        ? `Need at least 4 active players excluding the God Narrator (currently ${effectivePlayingCount})`
        : `Need at least 4 players to start (currently ${playerCount})`,
    };
  }
  if (playerCount > settings.maxPlayers) {
    return { valid: false, reason: `Room exceeds max player limit (${playerCount}/${settings.maxPlayers})` };
  }

  const { roles } = settings;
  const mafiaCount = roles.mafia.count;
  const godfatherCount = roles.godfather.enabled ? roles.godfather.count : 0;
  const totalMafia = mafiaCount + godfatherCount;

  if (totalMafia < 1) {
    return { valid: false, reason: 'At least 1 Mafia member is required' };
  }

  if (totalMafia >= Math.ceil(effectivePlayingCount / 2)) {
    return {
      valid: false,
      reason: `Mafia team (${totalMafia}) must be strictly less than half the active players (${effectivePlayingCount})`,
    };
  }

  const doctorCount = roles.doctor.enabled ? roles.doctor.count : 0;
  const policeCount = roles.police.enabled ? roles.police.count : 0;
  const vigilanteCount = roles.vigilante.enabled ? roles.vigilante.count : 0;
  const jesterCount = roles.jester.enabled ? roles.jester.count : 0;

  const totalSpecial = totalMafia + doctorCount + policeCount + vigilanteCount + jesterCount;
  if (totalSpecial > effectivePlayingCount) {
    return {
      valid: false,
      reason: `Assigned special roles (${totalSpecial}) exceed active players (${effectivePlayingCount})`,
    };
  }

  return { valid: true };
}

export function assignRoles(
  players: Player[],
  settings: Settings,
  rng: () => number,
  manualMap?: Record<string, Role>
): Player[] {
  // Exclude God if moderatorMode is god or player is marked isGod
  const isGodMode = settings.moderatorMode === 'god';
  const playingPlayers = players.filter((p) => (isGodMode ? !p.isHost && !p.isGod : !p.isGod));
  const pool: Role[] = [];

  const { roles } = settings;
  for (let i = 0; i < roles.mafia.count; i++) pool.push('mafia');
  if (roles.godfather.enabled) {
    for (let i = 0; i < roles.godfather.count; i++) pool.push('godfather');
  }
  if (roles.doctor.enabled) {
    for (let i = 0; i < roles.doctor.count; i++) pool.push('doctor');
  }
  if (roles.police.enabled) {
    for (let i = 0; i < roles.police.count; i++) pool.push('police');
  }
  if (roles.vigilante.enabled) {
    for (let i = 0; i < roles.vigilante.count; i++) pool.push('vigilante');
  }
  if (roles.jester.enabled) {
    for (let i = 0; i < roles.jester.count; i++) pool.push('jester');
  }

  // Remainder are Civilians
  while (pool.length < playingPlayers.length) {
    pool.push('civilian');
  }

  // Fisher-Yates shuffle using deterministic rng
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  const assignedPlayers = players.map((p) => {
    if (p.isGod || (isGodMode && p.isHost)) {
      return { ...p, isGod: true, role: undefined, alive: false };
    }
    const manual = manualMap ? manualMap[p.id] : undefined;
    const assignedRole = manual || pool.pop() || 'civilian';
    return {
      ...p,
      role: assignedRole,
      alive: true,
      ready: false,
    };
  });

  return assignedPlayers;
}

export function checkWinCondition(
  players: Player[],
  jesterVotedOut = false
): 'town' | 'mafia' | 'jester' | null {
  if (jesterVotedOut) {
    return 'jester';
  }

  const activePlayers = players.filter((p) => !p.isGod && p.alive);
  const mafiaCount = activePlayers.filter((p) => p.role === 'mafia' || p.role === 'godfather').length;
  const nonMafiaCount = activePlayers.length - mafiaCount;

  if (mafiaCount === 0) {
    return 'town';
  }

  if (mafiaCount >= nonMafiaCount) {
    return 'mafia';
  }

  return null;
}
