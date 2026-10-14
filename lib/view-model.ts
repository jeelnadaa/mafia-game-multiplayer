'use client';

import { useMemo } from 'react';
import { ClientGameView, PlayerView, Role } from './types';
import { ROLES } from './content';

export interface RoomViewModel {
  code: string;
  round: number;
  isLobby: boolean;
  isPlaying: boolean;
  isGameOver: boolean;
  totalPlayers: number;
  livingPlayers: PlayerView[];
  eliminatedPlayers: PlayerView[];
  livingCount: number;
  eliminatedCount: number;
}

export function useRoomView(gameView?: ClientGameView | null): RoomViewModel {
  return useMemo(() => {
    const code = gameView?.code || '';
    const round = gameView?.round ?? 0;
    const phase = gameView?.phase || 'lobby';
    const isLobby = phase === 'lobby';
    const isGameOver = phase === 'gameOver';
    const isPlaying = !isLobby && !isGameOver;
    const players = gameView?.players || [];
    const livingPlayers = players.filter((p) => p.alive && !p.isGod);
    const eliminatedPlayers = players.filter((p) => !p.alive && !p.isGod);

    return {
      code,
      round,
      isLobby,
      isPlaying,
      isGameOver,
      totalPlayers: players.filter((p) => !p.isGod).length,
      livingPlayers,
      eliminatedPlayers,
      livingCount: livingPlayers.length,
      eliminatedCount: eliminatedPlayers.length,
    };
  }, [gameView]);
}

export interface PhaseViewModel {
  phase: string;
  round: number;
  displayName: string;
  bannerTitle: string;
  isNight: boolean;
  isDay: boolean;
  isVoting: boolean;
  isLobby: boolean;
  isGameOver: boolean;
  subPhase?: string | null;
}

export function usePhaseView(gameView?: ClientGameView | null): PhaseViewModel {
  return useMemo(() => {
    const phase = gameView?.phase || 'lobby';
    const round = gameView?.round ?? 0;
    const isNight = phase === 'night' || phase === 'roleReveal';
    const isDay = phase === 'discussion' || phase === 'morning';
    const isVoting = phase === 'voting' || phase === 'voteResult';
    const isLobby = phase === 'lobby';
    const isGameOver = phase === 'gameOver';

    let displayName = 'Lobby';
    let bannerTitle = 'Dossier Assembly';

    if (phase === 'roleReveal') {
      displayName = 'Briefing';
      bannerTitle = 'CLASSIFIED BRIEFING';
    } else if (phase === 'night') {
      displayName = gameView?.nightSubPhase ? `Night · ${gameView.nightSubPhase.toUpperCase()}` : `Night ${round}`;
      bannerTitle = `NIGHT ${round}`;
    } else if (phase === 'discussion' || phase === 'morning') {
      displayName = `Day ${round}`;
      bannerTitle = `DAY ${round} INQUIRY`;
    } else if (phase === 'voting' || phase === 'voteResult') {
      displayName = 'Town Ballot';
      bannerTitle = 'TOWN ACCUSATION';
    } else if (phase === 'gameOver') {
      displayName = 'Case Closed';
      bannerTitle = 'CASE CLOSED';
    }

    return {
      phase,
      round,
      displayName,
      bannerTitle,
      isNight,
      isDay,
      isVoting,
      isLobby,
      isGameOver,
      subPhase: gameView?.nightSubPhase,
    };
  }, [gameView]);
}

export interface MyRoleViewModel {
  role: Role | null;
  name: string;
  team: 'mafia' | 'town' | 'jester' | 'neutral';
  objective: string;
  isAlive: boolean;
  canActNow: boolean;
  isConfirmed: boolean;
  teammates: { id: string; name: string }[];
  investigationIntel: { targetId: string; result: string; round: number }[];
}

export function useMyRoleView(gameView?: ClientGameView | null): MyRoleViewModel {
  return useMemo(() => {
    const me = gameView?.me;
    const roleKey = me?.role as Role | undefined;
    const roleDef = roleKey ? ROLES[roleKey] : null;

    // Teammates visible for syndicate
    const teammates =
      roleKey === 'mafia' || roleKey === 'godfather'
        ? (gameView?.players || [])
            .filter((p) => p.id !== me?.id && p.role && (p.role === 'mafia' || p.role === 'godfather'))
            .map((p) => ({ id: p.id, name: p.name }))
        : [];

    return {
      role: roleKey || null,
      name: roleDef?.name || 'Operative',
      team: (roleDef?.team as any) || 'town',
      objective: roleDef?.summary || roleDef?.winCondition || 'Survive the night and eliminate threats.',
      isAlive: Boolean(me?.alive ?? true),
      canActNow: Boolean(me?.canActNow),
      isConfirmed: Boolean(me?.isConfirmed),
      teammates,
      investigationIntel: me?.policeInbox || [],
    };
  }, [gameView]);
}
