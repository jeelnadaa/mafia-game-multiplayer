export type Role = 'mafia' | 'godfather' | 'doctor' | 'police' | 'vigilante' | 'jester' | 'civilian';
export type Team = 'mafia' | 'town' | 'jester';
export type Phase = 'lobby' | 'roleReveal' | 'night' | 'morning' | 'discussion' | 'voting' | 'voteResult' | 'gameOver';

export interface Player {
  id: string;
  token: string;
  name: string;
  avatar: number; // 1..12
  isHost: boolean;
  isGod: boolean; // God does not play
  ready: boolean;
  connected: boolean;
  lastSeen: number;
  role?: Role;
  alive: boolean;
  diedInRound?: number;
  diedBy?: 'mafia' | 'vote' | 'vigilante' | 'god' | 'left';
}

export type ChatChannel = 'public' | 'mafia' | 'dead' | 'god';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: Role;
  channel: ChatChannel;
  text: string;
  timestamp: number;
}

export interface LogEntry {
  id: string;
  round: number;
  phase: Phase;
  text: string;
  timestamp: number;
  type?: 'info' | 'death' | 'save' | 'vote' | 'phase';
}

export interface SecretLogEntry {
  round: number;
  mafiaTarget: string | null;
  doctorSaves: string[];
  policeInvestigations: { policeId: string; targetId: string; result: string }[];
  vigilanteShots: { vigilanteId: string; targetId: string }[];
  eliminatedByVote: string | null;
}

export interface RolesConfig {
  mafia: { count: number };
  godfather: { enabled: boolean; count: number };
  doctor: { enabled: boolean; count: number };
  police: { enabled: boolean; count: number };
  vigilante: { enabled: boolean; count: number };
  jester: { enabled: boolean; count: number };
}

export interface Settings {
  maxPlayers: number;
  moderatorMode: 'god' | 'auto';
  roleAssignment: 'random' | 'manual';
  mafiaKillMode: 'unanimous' | 'random_pick' | 'majority';
  mafiaDisagreeFallback: 'no_kill' | 'random_pick';
  mafiaNightChat: boolean;
  noKillFirstNight: boolean;
  doctorSelfSave: 'always' | 'once' | 'never';
  doctorSameTargetTwice: boolean;
  announceSave: boolean;
  policeResultDelay: number;
  policeResultDetail: 'alignment' | 'exact_role';
  vigilanteShots: number;
  nightDuration: number;
  discussionDuration: number;
  votingDuration: number;
  endNightEarly: boolean;
  godAutoAdvance: boolean;
  voteVisibility: 'public' | 'anonymous';
  allowSkipVote: boolean;
  tieRule: 'no_elimination' | 'revote_then_none' | 'random';
  revealRoleOnDeath: 'full' | 'alignment' | 'none';
  dayChat: boolean;
  deadChat: boolean;
  deadSeeRoles: boolean;
  revealRoleList: boolean;
  roles: RolesConfig;
}

export interface GameState {
  code: string;
  version: number;
  phase: Phase;
  round: number;
  phaseEndsAt: number | null;
  paused: boolean;
  hostAwayAt?: number;
  updatedAt?: number;
  settings: Settings;
  players: Player[];
  night: {
    subPhase: 'mafia' | 'doctor' | 'police' | 'vigilante';
    picks: Record<string, string | null | 'hold'>; // actorId -> targetId / hold
    confirmed: Record<string, boolean>; // actorId -> true when confirmed
    locked: Record<string, boolean>;
    earlyEndAt?: number | null;
  };
  doctorHistory: Record<string, { lastSavedId: string | null; selfSavesUsed: number }>;
  shotsUsed: Record<string, number>;
  policeInbox: {
    policeId: string;
    fromRound: number;
    revealRound: number;
    targetId: string;
    result: string;
    delivered: boolean;
  }[];
  votes: Record<string, string | 'skip' | null>;
  revotePending: boolean;
  readyToVote: string[];
  log: LogEntry[];
  secretLog: SecretLogEntry[];
  chat: ChatMessage[];
  winner?: 'town' | 'mafia' | 'jester';
}

export interface PlayerView {
  id: string;
  name: string;
  avatar: number;
  isHost: boolean;
  isGod: boolean;
  ready: boolean;
  connected: boolean;
  alive: boolean;
  role?: Role;
  diedInRound?: number;
  diedBy?: 'mafia' | 'vote' | 'vigilante' | 'god' | 'left';
  voteTarget?: string | 'skip' | null;
}

export interface ClientGameView {
  code: string;
  version: number;
  phase: Phase;
  nightSubPhase?: 'mafia' | 'doctor' | 'police' | 'vigilante';
  round: number;
  phaseEndsAt: number | null;
  paused: boolean;
  settings: Settings;
  players: PlayerView[];
  me: {
    id: string;
    token: string;
    name: string;
    avatar: number;
    role?: Role;
    isGod: boolean;
    isHost: boolean;
    alive: boolean;
    canActNow?: boolean;
    isConfirmed?: boolean;
    teammates?: string[];
    teammatePicks?: Record<string, string | null>;
    nightPick?: string | null | 'hold';
    nightLocked?: boolean;
    shotsRemaining?: number;
    policeInbox?: { targetId: string; result: string; round: number }[];
    vote?: string | 'skip' | null;
    readyToVote?: boolean;
    isReady?: boolean;
  };
  publicVotes?: Record<string, string | 'skip' | null>;
  voteCounts?: Record<string, number>;
  readyToVote: string[];
  log: LogEntry[];
  chat: ChatMessage[];
  winner?: 'town' | 'mafia' | 'jester';
  serverNow: number;
  secretLog?: SecretLogEntry[];
}

export type IntentType =
  | 'updateSettings'
  | 'applyPreset'
  | 'suggestBalanced'
  | 'setReady'
  | 'kick'
  | 'setGod'
  | 'start'
  | 'assignRole'
  | 'nightAction'
  | 'confirmNightAction'
  | 'policeConfirm'
  | 'readyToVote'
  | 'vote'
  | 'godAction'
  | 'rematch'
  | 'leave'
  | 'updateProfile';

export interface IntentMessage {
  reqId: string;
  type: IntentType;
  payload: any;
}
