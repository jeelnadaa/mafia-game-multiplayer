import { GameState, Player, Settings, LogEntry, SecretLogEntry } from '../types';
import { checkWinCondition } from './rules';

export function resolveNight(
  state: GameState,
  rng: () => number,
  now: number
): {
  nextState: GameState;
  morningDeaths: string[];
  savedPlayers: string[];
} {
  const { round, settings, night, players } = state;
  const alivePlayers = players.filter((p) => p.alive && !p.isGod);

  // 1. Compile alive Mafia picks
  // 1. Compile alive & active Mafia picks (disconnected operatives do not spoil votes)
  const aliveMafia = alivePlayers.filter((p) => p.role === 'mafia' || p.role === 'godfather');
  const connectedMafia = aliveMafia.filter((p) => p.connected !== false);
  const votingMafia = connectedMafia.length > 0 ? connectedMafia : aliveMafia;

  const mafiaPicks = votingMafia
    .map((m) => night.picks[m.id])
    .filter((id): id is string => Boolean(id) && id !== 'hold');

  let mafiaTarget: string | null = null;
  let mafiaDiscord = false;
  if (!(round === 1 && settings.noKillFirstNight)) {
    const rawMafiaPicks = votingMafia.map((m) => night.picks[m.id]).filter(Boolean);
    if (settings.mafiaKillMode === 'unanimous') {
      const hasHold = rawMafiaPicks.includes('hold');
      const hasTarget = mafiaPicks.length > 0;
      if (hasHold && hasTarget) {
        mafiaTarget = null;
        mafiaDiscord = true;
      } else if (mafiaPicks.length > 0) {
        const allSame = mafiaPicks.every((p) => p === mafiaPicks[0]);
        if (allSame) {
          mafiaTarget = mafiaPicks[0];
        } else {
          mafiaTarget = null; // Unanimous mode strictly requires consensus of active syndicate operatives
          mafiaDiscord = true;
        }
      }
    } else if (settings.mafiaKillMode === 'majority') {
      const counts: Record<string, number> = {};
      mafiaPicks.forEach((p) => (counts[p] = (counts[p] || 0) + 1));
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
        mafiaTarget = rng() > 0.5 ? sorted[0][0] : sorted[1][0];
      } else {
        mafiaTarget = sorted[0]?.[0] || null;
      }
    } else {
      mafiaTarget = mafiaPicks.length > 0 ? mafiaPicks[Math.floor(rng() * mafiaPicks.length)] : null;
    }
  }

  // 2. Compile Doctor Saves
  const aliveDoctors = alivePlayers.filter((p) => p.role === 'doctor');
  const savedSet = new Set<string>();
  const doctorHistory = { ...state.doctorHistory };

  aliveDoctors.forEach((doc) => {
    const pick = night.picks[doc.id];
    if (!pick || pick === 'hold') return;

    const hist = doctorHistory[doc.id] || { lastSavedId: null, selfSavesUsed: 0 };
    const isSelfSave = pick === doc.id;

    if (isSelfSave && settings.doctorSelfSave === 'never') return;
    if (isSelfSave && settings.doctorSelfSave === 'once' && hist.selfSavesUsed >= 1) return;
    if (!settings.doctorSameTargetTwice && hist.lastSavedId === pick) return;

    savedSet.add(pick);
    doctorHistory[doc.id] = {
      lastSavedId: pick,
      selfSavesUsed: hist.selfSavesUsed + (isSelfSave ? 1 : 0),
    };
  });

  // 3. Compile Vigilante Shots
  const aliveVigilantes = alivePlayers.filter((p) => p.role === 'vigilante');
  const vigShots: { vigilanteId: string; targetId: string }[] = [];
  const shotsUsed = { ...state.shotsUsed };

  aliveVigilantes.forEach((vig) => {
    const pick = night.picks[vig.id];
    const used = shotsUsed[vig.id] || 0;
    if (pick && pick !== 'hold' && used < settings.vigilanteShots) {
      vigShots.push({ vigilanteId: vig.id, targetId: pick });
      shotsUsed[vig.id] = used + 1;
    }
  });

  // 4. Police investigations
  const alivePolice = alivePlayers.filter((p) => p.role === 'police');
  const policeInbox = [...state.policeInbox];
  const policeLogs: { policeId: string; targetId: string; result: string }[] = [];

  alivePolice.forEach((cop) => {
    const targetId = night.picks[cop.id];
    if (!targetId || targetId === 'hold') return;
    const targetPlayer = players.find((p) => p.id === targetId);
    if (!targetPlayer) return;

    let result = 'Not mafia';
    if (settings.policeResultDetail === 'exact_role') {
      result = targetPlayer.role || 'civilian';
    } else {
      result = targetPlayer.role === 'mafia' ? 'Mafia' : 'Not mafia';
    }

    policeLogs.push({ policeId: cop.id, targetId, result });
    policeInbox.push({
      policeId: cop.id,
      fromRound: round,
      revealRound: round + settings.policeResultDelay,
      targetId,
      result,
      delivered: settings.policeResultDelay === 0,
    });
  });

  // 5. Calculate deaths
  const morningDeaths: string[] = [];
  const savedPlayers: string[] = [];

  if (mafiaTarget) {
    if (savedSet.has(mafiaTarget)) {
      savedPlayers.push(mafiaTarget);
    } else {
      morningDeaths.push(mafiaTarget);
    }
  }

  vigShots.forEach(({ targetId }) => {
    if (savedSet.has(targetId)) {
      if (!savedPlayers.includes(targetId)) savedPlayers.push(targetId);
    } else if (!morningDeaths.includes(targetId)) {
      morningDeaths.push(targetId);
    }
  });

  // Apply deaths to players
  const updatedPlayers = players.map((p) => {
    if (morningDeaths.includes(p.id)) {
      const diedBy = mafiaTarget === p.id ? ('mafia' as const) : ('vigilante' as const);
      return {
        ...p,
        alive: false,
        diedInRound: round,
        diedBy,
      };
    }
    return p;
  });

  // Log entries and chat announcements
  const newLogs: LogEntry[] = [...state.log];
  const newChat = [...(state.chat || [])];

  if (morningDeaths.length === 0) {
    let safeText = 'The city awakens to calm skies. Nobody died tonight.';
    let safeChatText = '🌅 Dawn Report: The city awakens to calm skies. Nobody died tonight.';
    let logType: LogEntry['type'] = 'info';

    if (mafiaDiscord) {
      safeText = 'Syndicate discord prevented an assassination — operatives failed to reach unanimous agreement in the shadows!';
      safeChatText = '🌅 Dawn Report: The Syndicate failed to reach agreement in the shadows. Nobody was harmed tonight.';
      logType = 'info';
    } else if (savedPlayers.length > 0 && settings.announceSave) {
      safeText = 'A citizen was attacked in the dark, but was shielded by a Doctor!';
      safeChatText = '🛡️ Dawn Report: A citizen was attacked in the dark, but was shielded by a Doctor!';
      logType = 'save';
    }

    newLogs.push({
      id: `log-${round}-safe-${now}`,
      round,
      phase: 'morning',
      text: safeText,
      timestamp: now,
      type: logType,
    });
    newChat.push({
      id: `msg-${round}-safe-${now}`,
      senderId: 'system',
      senderName: 'SYSTEM',
      channel: 'public',
      text: safeChatText,
      timestamp: now,
    });

    if (mafiaDiscord) {
      newChat.push({
        id: `msg-${round}-mafia-discord-${now}`,
        senderId: 'system',
        senderName: 'SYNDICATE WIRE',
        channel: 'mafia',
        text: '⚠️ Syndicate Contract Aborted: Operatives failed to pick the same target unanimously. Your discord prevented an assassination tonight!',
        timestamp: now,
      });
    }
  } else {

    morningDeaths.forEach((id) => {
      const victim = players.find((p) => p.id === id);
      const isVigKill = vigShots.some((s) => s.targetId === id) && id !== mafiaTarget;
      const deathCause = isVigKill ? 'eliminated by a marksman bullet' : 'found eliminated';
      const roleRevealed =
        settings.revealRoleOnDeath === 'full'
          ? ` (${victim?.role?.toUpperCase()})`
          : settings.revealRoleOnDeath === 'alignment'
          ? ` (${victim?.role === 'mafia' || victim?.role === 'godfather' ? 'MAFIA' : 'TOWN'})`
          : '';
      newLogs.push({
        id: `log-${round}-death-${id}-${now}`,
        round,
        phase: 'morning',
        text: `${victim?.name || 'A player'} was ${deathCause}${roleRevealed}.`,
        timestamp: now,
        type: 'death',
      });
      newChat.push({
        id: `msg-${round}-death-${id}-${now}`,
        senderId: 'system',
        senderName: 'SYSTEM',
        channel: 'public',
        text: `💀 Dawn Report: ${victim?.name || 'A player'} was ${deathCause}${roleRevealed}.`,
        timestamp: now,
      });
    });
  }

  const secretEntry: SecretLogEntry = {
    round,
    mafiaTarget,
    doctorSaves: Array.from(savedSet),
    policeInvestigations: policeLogs,
    vigilanteShots: vigShots,
    eliminatedByVote: null,
  };

  const winner = checkWinCondition(updatedPlayers);

  return {
    morningDeaths,
    savedPlayers,
    nextState: {
      ...state,
      players: updatedPlayers,
      doctorHistory,
      shotsUsed,
      policeInbox,
      log: newLogs,
      chat: newChat.slice(-149),
      secretLog: [...state.secretLog, secretEntry],
      winner: winner || undefined,
      night: {
        subPhase: 'mafia',
        picks: {},
        confirmed: {},
        locked: {},
        earlyEndAt: null,
      },
    },
  };
}

export function tallyVotes(
  votes: Record<string, string | 'skip' | null>,
  alivePlayerIds: string[],
  tieRule: Settings['tieRule'],
  rng: () => number
): { eliminatedId: string | null; skipWon: boolean; tiedIds?: string[] } {
  const counts: Record<string, number> = {};

  Object.entries(votes).forEach(([voterId, targetId]) => {
    if (!alivePlayerIds.includes(voterId)) return;
    if (targetId) {
      counts[targetId] = (counts[targetId] || 0) + 1;
    }
  });

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return { eliminatedId: null, skipWon: true };
  }

  const topScore = entries[0][1];
  const topCandidates = entries.filter((e) => e[1] === topScore).map((e) => e[0]);

  if (topCandidates.includes('skip')) {
    if (topCandidates.length === 1) {
      return { eliminatedId: null, skipWon: true };
    }
  }

  if (topCandidates.length === 1) {
    return { eliminatedId: topCandidates[0], skipWon: false };
  }

  // Handle Tie
  if (tieRule === 'random') {
    const pick = topCandidates[Math.floor(rng() * topCandidates.length)];
    return { eliminatedId: pick === 'skip' ? null : pick, skipWon: pick === 'skip' };
  }

  if (tieRule === 'revote_then_none') {
    return { eliminatedId: null, skipWon: false, tiedIds: topCandidates.filter((id) => id !== 'skip') };
  }

  // no_elimination
  return { eliminatedId: null, skipWon: false, tiedIds: topCandidates };
}

export function getActiveRolePlayers(
  subPhase: 'mafia' | 'doctor' | 'police' | 'vigilante',
  state: GameState
): Player[] {
  const alivePlayers = state.players.filter((p) => p.alive && !p.isGod);
  const connectedAlive = alivePlayers.filter((p) => p.connected !== false);
  const pool = connectedAlive.length > 0 ? connectedAlive : alivePlayers;

  switch (subPhase) {
    case 'mafia':
      return pool.filter((p) => p.role === 'mafia' || p.role === 'godfather');
    case 'doctor':
      return pool.filter((p) => p.role === 'doctor');
    case 'police':
      return pool.filter((p) => p.role === 'police');
    case 'vigilante':
      return pool.filter(
        (p) => p.role === 'vigilante' && (state.settings.vigilanteShots - (state.shotsUsed[p.id] || 0)) > 0
      );
    default:
      return [];
  }
}

export function getNextNightRole(
  currentSubPhase: 'mafia' | 'doctor' | 'police' | 'vigilante' | null,
  state: GameState
): 'mafia' | 'doctor' | 'police' | 'vigilante' | null {
  const order: ('mafia' | 'doctor' | 'police' | 'vigilante')[] = ['mafia', 'doctor', 'police', 'vigilante'];
  const startIndex = currentSubPhase ? order.indexOf(currentSubPhase) + 1 : 0;

  for (let i = startIndex; i < order.length; i++) {
    const role = order[i];
    const eligible = getActiveRolePlayers(role, state);
    if (eligible.length > 0) {
      return role;
    }
  }
  return null;
}

export function getSubPhaseDuration(
  subPhase: 'mafia' | 'doctor' | 'police' | 'vigilante',
  settings: Settings
): number {
  return Math.max(10, settings.nightDuration);
}

export function maybeAdvance(state: GameState, now: number, rng: () => number): GameState {
  if (state.paused || state.phase === 'gameOver' || !state.phaseEndsAt || now < state.phaseEndsAt) {
    return state;
  }

  const { phase, round, settings } = state;
  const calcEndsAt = (durationSeconds: number) =>
    settings.noTimer ? null : now + durationSeconds * 1000;

  switch (phase) {
    case 'roleReveal': {
      const firstRole = getNextNightRole(null, state) || 'mafia';
      const duration = getSubPhaseDuration(firstRole, settings);
      return {
        ...state,
        phase: 'night',
        round: 1,
        phaseEndsAt: calcEndsAt(duration),
        suspicions: {},
        reactions: {},
        night: {
          subPhase: firstRole,
          picks: {},
          confirmed: {},
          locked: {},
          earlyEndAt: null,
        },
        version: state.version + 1,
      };
    }

    case 'night': {
      const nextRole = getNextNightRole(state.night.subPhase, state);
      if (nextRole) {
        const duration = getSubPhaseDuration(nextRole, settings);
        return {
          ...state,
          phaseEndsAt: calcEndsAt(duration),
          night: {
            ...state.night,
            subPhase: nextRole,
            confirmed: {},
          },
          version: state.version + 1,
        };
      }

      // All active roles have acted, resolve the night
      const { nextState } = resolveNight(state, rng, now);
      if (nextState.winner) {
        return {
          ...nextState,
          phase: 'gameOver',
          phaseEndsAt: null,
          version: state.version + 1,
        };
      }
      return {
        ...nextState,
        phase: 'morning',
        phaseEndsAt: calcEndsAt(7),
        suspicions: {},
        reactions: {},
        version: state.version + 1,
      };
    }

    case 'morning': {
      const nextPhase = settings.discussionDuration > 0 ? 'discussion' : 'voting';
      const duration = nextPhase === 'discussion' ? settings.discussionDuration : settings.votingDuration;
      return {
        ...state,
        phase: nextPhase,
        phaseEndsAt: calcEndsAt(duration),
        readyToVote: [],
        version: state.version + 1,
      };
    }

    case 'discussion': {
      return {
        ...state,
        phase: 'voting',
        phaseEndsAt: calcEndsAt(settings.votingDuration),
        votes: {},
        version: state.version + 1,
      };
    }

    case 'voting': {
      const aliveIds = state.players.filter((p) => p.alive && !p.isGod).map((p) => p.id);
      const { eliminatedId, skipWon, tiedIds } = tallyVotes(state.votes, aliveIds, settings.tieRule, rng);

      // Handle revote_then_none first tie runoff
      if (
        !eliminatedId &&
        !skipWon &&
        settings.tieRule === 'revote_then_none' &&
        !state.revotePending &&
        tiedIds &&
        tiedIds.length > 1
      ) {
        const tiedNames = tiedIds
          .map((id) => state.players.find((p) => p.id === id)?.name || 'Suspect')
          .join(', ');
        const revoteText = `Votes tied between ${tiedNames}! A runoff revote has begun.`;

        const newLogs = [...state.log];
        const newChat = [...(state.chat || [])];

        newLogs.push({
          id: `log-${round}-revote-${now}`,
          round,
          phase: 'voting',
          text: revoteText,
          timestamp: now,
          type: 'vote',
        });

        newChat.push({
          id: `msg-${round}-revote-${now}`,
          senderId: 'system',
          senderName: 'SYSTEM',
          channel: 'public',
          text: `⚖️ Town Verdict: ${revoteText}`,
          timestamp: now,
        });

        return {
          ...state,
          phase: 'voting',
          revotePending: true,
          phaseEndsAt: calcEndsAt(Math.min(30, settings.votingDuration)),
          votes: {},
          log: newLogs,
          chat: newChat.slice(-149),
          version: state.version + 1,
        };
      }

      let updatedPlayers = state.players;
      let jesterWon = false;

      const newLogs = [...state.log];
      const newChat = [...(state.chat || [])];

      if (eliminatedId) {
        const victim = state.players.find((p) => p.id === eliminatedId);
        if (victim?.role === 'jester') {
          jesterWon = true;
        }

        updatedPlayers = state.players.map((p) =>
          p.id === eliminatedId
            ? {
                ...p,
                alive: false,
                diedInRound: round,
                diedBy: 'vote' as const,
              }
            : p
        );

        const roleRevealed =
          settings.revealRoleOnDeath === 'full'
            ? ` (${victim?.role?.toUpperCase()})`
            : settings.revealRoleOnDeath === 'alignment'
            ? ` (${victim?.role === 'mafia' || victim?.role === 'godfather' ? 'MAFIA' : 'TOWN'})`
            : '';

        const verdictText = `By majority vote, ${victim?.name || 'A player'} was eliminated${roleRevealed}.`;

        newLogs.push({
          id: `log-${round}-vote-${eliminatedId}-${now}`,
          round,
          phase: 'voting',
          text: verdictText,
          timestamp: now,
          type: 'vote',
        });

        newChat.push({
          id: `msg-${round}-vote-${eliminatedId}-${now}`,
          senderId: 'system',
          senderName: 'SYSTEM',
          channel: 'public',
          text: `⚖️ Town Verdict: ${verdictText}`,
          timestamp: now,
        });
      } else {
        const noneText = skipWon
          ? 'The town chose to skip voting.'
          : state.revotePending
          ? 'The runoff revote also ended in a tie. Nobody was eliminated.'
          : 'The town votes were tied. Nobody was eliminated.';

        newLogs.push({
          id: `log-${round}-vote-none-${now}`,
          round,
          phase: 'voting',
          text: noneText,
          timestamp: now,
          type: 'vote',
        });

        newChat.push({
          id: `msg-${round}-vote-none-${now}`,
          senderId: 'system',
          senderName: 'SYSTEM',
          channel: 'public',
          text: `⚖️ Town Verdict: ${noneText}`,
          timestamp: now,
        });
      }

      const winner = checkWinCondition(updatedPlayers, jesterWon);

      // Record Day Voting Outcomes in SecretLog for Post-Match Replay Timeline
      const eliminatedVictim = eliminatedId ? state.players.find((p) => p.id === eliminatedId) : null;
      const dayVotesMap: Record<string, string> = {};
      const dayVoteCounts: Record<string, number> = {};
      Object.entries(state.votes || {}).forEach(([voterId, targetId]) => {
        if (targetId) {
          dayVotesMap[voterId] = targetId;
          dayVoteCounts[targetId] = (dayVoteCounts[targetId] || 0) + 1;
        }
      });

      const updatedSecretLog: SecretLogEntry[] = state.secretLog.map((entry) =>
        entry.round === round
          ? {
              ...entry,
              eliminatedByVote: eliminatedId || null,
              dayVotes: dayVotesMap,
              dayVoteCounts,
              dayEliminatedRole: eliminatedVictim?.role,
            }
          : entry
      );
      const hasRoundEntry = updatedSecretLog.some((e) => e.round === round);
      const finalSecretLog: SecretLogEntry[] = hasRoundEntry
        ? updatedSecretLog
        : [
            ...updatedSecretLog,
            {
              round,
              mafiaTarget: null,
              doctorSaves: [],
              policeInvestigations: [],
              vigilanteShots: [],
              eliminatedByVote: eliminatedId || null,
              dayVotes: dayVotesMap,
              dayVoteCounts,
              dayEliminatedRole: eliminatedVictim?.role,
            },
          ];

      if (winner) {
        return {
          ...state,
          players: updatedPlayers,
          winner,
          log: newLogs,
          chat: newChat.slice(-149),
          secretLog: finalSecretLog,
          phase: 'gameOver',
          phaseEndsAt: null,
          revotePending: false,
          version: state.version + 1,
        };
      }

      return {
        ...state,
        players: updatedPlayers,
        winner: undefined,
        log: newLogs,
        chat: newChat.slice(-149),
        secretLog: finalSecretLog,
        phase: 'voteResult',
        phaseEndsAt: now + 5000, // Show verdict then smoothly advance
        revotePending: false,
        version: state.version + 1,
      };
    }

    case 'voteResult': {
      if (state.winner) {
        return {
          ...state,
          phase: 'gameOver',
          phaseEndsAt: null,
          revotePending: false,
          version: state.version + 1,
        };
      }
      const firstRole = getNextNightRole(null, state) || 'mafia';
      const duration = getSubPhaseDuration(firstRole, settings);
      return {
        ...state,
        round: round + 1,
        phase: 'night',
        phaseEndsAt: calcEndsAt(duration),
        votes: {},
        suspicions: {},
        reactions: {},
        revotePending: false,
        night: {
          subPhase: firstRole,
          picks: {},
          confirmed: {},
          locked: {},
          earlyEndAt: null,
        },
        version: state.version + 1,
      };
    }

    default:
      return state;
  }
}
