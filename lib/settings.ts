import { Settings } from './types';

export interface SettingField {
  key: keyof Settings | string;
  group: 'General' | 'Mafia' | 'Doctor' | 'Police' | 'Vigilante' | 'Timing' | 'Voting & Roles';
  label: string;
  tooltip: string;
  type: 'toggle' | 'number' | 'select';
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  default: any;
  showIf?: (settings: Settings) => boolean;
  plain: (value: any) => string;
}

export const PLAYER_COLORS = [
  '#E5383B', // Crimson
  '#5B8CFF', // Azure
  '#F4F6FA', // Paper White
  '#C9B79C', // Muted Khaki
  '#B58AD6', // Lavender
  '#7C8CA6', // Slate
  '#D6B15E', // Warm Brass
  '#F2B84B', // Amber
  '#2DD4BF', // Teal
  '#F43F5E', // Rose
  '#8B5CF6', // Violet
  '#10B981', // Emerald
] as const;

export const DEFAULT_SETTINGS: Settings = {
  maxPlayers: 12,
  moderatorMode: 'auto',
  roleAssignment: 'random',
  mafiaKillMode: 'unanimous',
  mafiaDisagreeFallback: 'random_pick',
  mafiaNightChat: true,
  noKillFirstNight: false,
  doctorSelfSave: 'once',
  doctorSameTargetTwice: false,
  announceSave: true,
  policeResultDelay: 0,
  policeResultDetail: 'alignment',
  vigilanteShots: 1,
  nightDuration: 45,
  discussionDuration: 120,
  votingDuration: 45,
  endNightEarly: true,
  godAutoAdvance: false,
  voteVisibility: 'public',
  allowSkipVote: true,
  tieRule: 'revote_then_none',
  revealRoleOnDeath: 'full',
  dayChat: true,
  deadChat: true,
  deadSeeRoles: true,
  revealRoleList: true,
  circleSitting: true,
  roles: {
    mafia: { count: 1 },
    godfather: { enabled: false, count: 0 },
    doctor: { enabled: true, count: 1 },
    police: { enabled: true, count: 1 },
    vigilante: { enabled: false, count: 0 },
    jester: { enabled: false, count: 0 },
  },
};

export const SETTINGS_SCHEMA: SettingField[] = [
  // General
  {
    key: 'circleSitting',
    group: 'General',
    label: 'Circle Sitting Mode',
    tooltip: 'Semi-3D round-table arena where all players sit in a circle in consistent order.',
    type: 'toggle',
    default: true,
    plain: (v) => (v ? 'Enabled (Round Table)' : 'Disabled (Standard Cards)'),
  },
  {
    key: 'maxPlayers',
    group: 'General',
    label: 'Max Players',
    tooltip: 'Total player capacity in the room (4-20)',
    type: 'number',
    min: 4,
    max: 20,
    step: 1,
    default: 12,
    plain: (v) => `Max ${v} players`,
  },
  {
    key: 'moderatorMode',
    group: 'General',
    label: 'Moderator Mode',
    tooltip: 'God (human narrator who does not play) or Auto (automated narrations)',
    type: 'select',
    options: [
      { value: 'auto', label: 'Auto (Everyone plays)' },
      { value: 'god', label: 'God (Host narrates only)' },
    ],
    default: 'auto',
    plain: (v) => (v === 'god' ? 'Host acts as God Narrator' : 'Automated browser moderator'),
  },
  {
    key: 'dayChat',
    group: 'General',
    label: 'Town Public Chat',
    tooltip: 'Allow living players to type and converse in day discussion chat',
    type: 'toggle',
    default: true,
    plain: (v) => (v ? 'Town chat enabled' : 'Town chat disabled'),
  },

  // Mafia
  {
    key: 'mafiaKillMode',
    group: 'Mafia',
    label: 'Mafia Agreement',
    tooltip: 'How the Mafia team decides their night victim',
    type: 'select',
    options: [
      { value: 'unanimous', label: 'Unanimous (All agree)' },
      { value: 'majority', label: 'Majority vote' },
      { value: 'random_pick', label: 'Random Mafia pick' },
    ],
    default: 'unanimous',
    plain: (v) => `Mafia agreement requires ${v}`,
  },
  {
    key: 'mafiaDisagreeFallback',
    group: 'Mafia',
    label: 'Disagreement Fallback',
    tooltip: 'Action taken if Mafia members fail to agree in unanimous mode',
    type: 'select',
    options: [
      { value: 'random_pick', label: 'Random pick from selections' },
      { value: 'no_kill', label: 'No elimination tonight' },
    ],
    default: 'random_pick',
    showIf: (s) => s.mafiaKillMode === 'unanimous',
    plain: (v) => (v === 'random_pick' ? 'Random pick on disagreement' : 'No kill on disagreement'),
  },
  {
    key: 'noKillFirstNight',
    group: 'Mafia',
    label: 'Peaceful Night 1',
    tooltip: 'Mafia cannot eliminate anyone on the very first night',
    type: 'toggle',
    default: false,
    plain: (v) => (v ? 'No night kill on Round 1' : 'Mafia strikes on Night 1'),
  },
  {
    key: 'mafiaNightChat',
    group: 'Mafia',
    label: 'Syndicate Night Chat',
    tooltip: 'Allow Mafia members to chat privately over encrypted channel at night',
    type: 'toggle',
    default: true,
    plain: (v) => (v ? 'Syndicate night chat enabled' : 'Syndicate night chat disabled'),
  },

  // Doctor
  {
    key: 'doctorSelfSave',
    group: 'Doctor',
    label: 'Doctor Self-Save',
    tooltip: 'Can the Doctor protect themselves?',
    type: 'select',
    options: [
      { value: 'once', label: 'Once per match' },
      { value: 'always', label: 'Any night' },
      { value: 'never', label: 'Never' },
    ],
    default: 'once',
    showIf: (s) => s.roles.doctor.enabled && s.roles.doctor.count > 0,
    plain: (v) => `Doctor self-save: ${v}`,
  },
  {
    key: 'doctorSameTargetTwice',
    group: 'Doctor',
    label: 'Consecutive Saves',
    tooltip: 'Can the Doctor protect the same person two nights in a row?',
    type: 'toggle',
    default: false,
    showIf: (s) => s.roles.doctor.enabled && s.roles.doctor.count > 0,
    plain: (v) => (v ? 'Doctor may save same target consecutively' : 'Doctor cannot save same target twice in a row'),
  },
  {
    key: 'announceSave',
    group: 'Doctor',
    label: 'Announce Saves at Dawn',
    tooltip: 'Publicly report when a Doctor successfully protects an attack victim',
    type: 'toggle',
    default: true,
    showIf: (s) => s.roles.doctor.enabled && s.roles.doctor.count > 0,
    plain: (v) => (v ? 'Doctor saves announced at dawn' : 'Doctor saves silent'),
  },

  // Police
  {
    key: 'policeResultDelay',
    group: 'Police',
    label: 'Report Delay',
    tooltip: 'How many rounds after investigation until result is delivered (0 = instant)',
    type: 'number',
    min: 0,
    max: 3,
    step: 1,
    default: 0,
    showIf: (s) => s.roles.police.enabled && s.roles.police.count > 0,
    plain: (v) => (v === 0 ? 'Police reports arrive immediately' : `Police reports arrive ${v} round(s) later`),
  },
  {
    key: 'policeResultDetail',
    group: 'Police',
    label: 'Dossier Detail Level',
    tooltip: 'Investigation reveals allegiance (Mafia / Not mafia) or exact role',
    type: 'select',
    options: [
      { value: 'alignment', label: 'Alignment (Mafia / Not mafia)' },
      { value: 'exact_role', label: 'Exact Role Title' },
    ],
    default: 'alignment',
    showIf: (s) => s.roles.police.enabled && s.roles.police.count > 0,
    plain: (v) => (v === 'exact_role' ? 'Exact role revealed' : 'Alignment revealed'),
  },

  // Vigilante
  {
    key: 'vigilanteShots',
    group: 'Vigilante',
    label: 'Bullet Count',
    tooltip: 'Maximum shots Vigilante can fire throughout the game',
    type: 'number',
    min: 1,
    max: 3,
    step: 1,
    default: 1,
    showIf: (s) => s.roles.vigilante.enabled && s.roles.vigilante.count > 0,
    plain: (v) => `Vigilante has ${v} bullet(s)`,
  },

  // Timing
  {
    key: 'nightDuration',
    group: 'Timing',
    label: 'Night Timer (seconds)',
    tooltip: 'Length of the night phase',
    type: 'number',
    min: 15,
    max: 180,
    step: 5,
    default: 45,
    plain: (v) => `Night length: ${v}s`,
  },
  {
    key: 'discussionDuration',
    group: 'Timing',
    label: 'Discussion Timer (seconds)',
    tooltip: 'Length of daytime discussion (0 skips directly to voting)',
    type: 'number',
    min: 0,
    max: 300,
    step: 15,
    default: 120,
    plain: (v) => `Discussion: ${v}s`,
  },
  {
    key: 'votingDuration',
    group: 'Timing',
    label: 'Voting Timer (seconds)',
    tooltip: 'Length of the town voting phase',
    type: 'number',
    min: 15,
    max: 180,
    step: 5,
    default: 45,
    plain: (v) => `Voting: ${v}s`,
  },
  {
    key: 'endNightEarly',
    group: 'Timing',
    label: 'End Night Early',
    tooltip: 'Advance night phase immediately once all living action holders confirm choices',
    type: 'toggle',
    default: true,
    plain: (v) => (v ? 'Night ends early when actions confirmed' : 'Night waits for full countdown timer'),
  },

  // Voting & Roles
  {
    key: 'voteVisibility',
    group: 'Voting & Roles',
    label: 'Vote Ballot Visibility',
    tooltip: 'Whether individual player votes are visible or completely anonymous',
    type: 'select',
    options: [
      { value: 'public', label: 'Public (Ballots & voters revealed)' },
      { value: 'anonymous', label: 'Anonymous (Secret ballots)' },
    ],
    default: 'public',
    plain: (v) => (v === 'anonymous' ? 'Anonymous secret voting' : 'Public voting'),
  },
  {
    key: 'allowSkipVote',
    group: 'Voting & Roles',
    label: 'Allow Skip Voting',
    tooltip: 'Allow townspeople to cast a ballot to skip elimination',
    type: 'toggle',
    default: true,
    plain: (v) => (v ? 'Skip vote allowed' : 'Skip vote disabled'),
  },
  {
    key: 'tieRule',
    group: 'Voting & Roles',
    label: 'Vote Tie Breaking',
    tooltip: 'What happens when two suspects tie for top votes',
    type: 'select',
    options: [
      { value: 'revote_then_none', label: 'Revote runoff, then nobody' },
      { value: 'no_elimination', label: 'Nobody eliminated' },
      { value: 'random', label: 'Random pick' },
    ],
    default: 'revote_then_none',
    plain: (v) => `Tie rule: ${v}`,
  },
  {
    key: 'revealRoleOnDeath',
    group: 'Voting & Roles',
    label: 'Role Reveal on Death',
    tooltip: 'What is shown when a player is eliminated',
    type: 'select',
    options: [
      { value: 'full', label: 'Exact Role' },
      { value: 'alignment', label: 'Team Alignment only' },
      { value: 'none', label: 'Secret (Hidden)' },
    ],
    default: 'full',
    plain: (v) => `Role on death: ${v}`,
  },
  {
    key: 'revealRoleList',
    group: 'Voting & Roles',
    label: 'Reveal Role Pool in Help',
    tooltip: 'Display enabled role composition and counts in match reference sheet',
    type: 'toggle',
    default: true,
    plain: (v) => (v ? 'Role pool visible in help sheet' : 'Role pool kept secret'),
  },
  {
    key: 'deadChat',
    group: 'Voting & Roles',
    label: 'Graveyard Chat',
    tooltip: 'Allow dead players to chat among themselves',
    type: 'toggle',
    default: true,
    plain: (v) => (v ? 'Dead players can chat in ghost lounge' : 'Dead players silenced'),
  },
  {
    key: 'deadSeeRoles',
    group: 'Voting & Roles',
    label: 'Dead See All Roles',
    tooltip: 'Dead spectators can view secret roles of everyone',
    type: 'toggle',
    default: true,
    plain: (v) => (v ? 'Spectators see all player roles' : 'Spectators keep secrets hidden'),
  },
];

export const RULE_PRESETS: Record<string, Partial<Settings>> = {
  Classic: {
    nightDuration: 45,
    discussionDuration: 120,
    votingDuration: 45,
    voteVisibility: 'public',
    tieRule: 'revote_then_none',
    revealRoleOnDeath: 'full',
  },
  'Quick Game': {
    nightDuration: 25,
    discussionDuration: 45,
    votingDuration: 25,
    voteVisibility: 'public',
    tieRule: 'no_elimination',
  },
  Paranoid: {
    voteVisibility: 'anonymous',
    revealRoleOnDeath: 'none',
    policeResultDelay: 1,
    doctorSelfSave: 'never',
    tieRule: 'no_elimination',
  },
};

export const ROLE_PRESETS = {
  Classic: {
    mafia: 2,
    godfather: 0,
    doctor: 1,
    police: 1,
    vigilante: 0,
    jester: 0,
  },
  'Bare bones': {
    mafia: 2,
    godfather: 0,
    doctor: 0,
    police: 0,
    vigilante: 0,
    jester: 0,
  },
  "Detective's game": {
    mafia: 2,
    godfather: 1,
    doctor: 0,
    police: 2,
    vigilante: 0,
    jester: 0,
  },
  'Medic only': {
    mafia: 2,
    godfather: 0,
    doctor: 2,
    police: 0,
    vigilante: 0,
    jester: 0,
  },
  Chaos: {
    mafia: 2,
    godfather: 1,
    doctor: 1,
    police: 1,
    vigilante: 1,
    jester: 1,
  },
};
