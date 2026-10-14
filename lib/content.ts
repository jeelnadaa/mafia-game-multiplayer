import { Role, Team, Phase } from './types';

export interface RoleDef {
  id: Role | 'god';
  name: string;
  team: Team | 'neutral' | 'moderator';
  colour: string; // Tailwind hex or class
  bgGlow: string;
  summary: string;
  nightVerb: string | null; // "Kill", "Protect", "Investigate", "Shoot", null
  needsTarget: boolean;
  allowSelfTarget: boolean;
  needsConfirm: boolean;
  howToPlay: string;
  tips: string[];
  winCondition: string;
}

export const ROLES: Record<Role | 'god', RoleDef> = {
  mafia: {
    id: 'mafia',
    name: 'Mafia',
    team: 'mafia',
    colour: '#FFFFFF',
    bgGlow: 'rgba(255, 255, 255, 0.15)',
    summary: 'You work with the Mafia to eliminate the town.',
    nightVerb: 'Kill',
    needsTarget: true,
    allowSelfTarget: false,
    needsConfirm: false,
    howToPlay: 'Pick one person to kill. Talk privately with your team.',
    tips: [
      "Don't vote together every single time to avoid suspicion.",
      'Coordinate with teammates carefully in night chat.',
      'Blend in as a helpful townsperson during discussion.',
    ],
    winCondition: 'Mafia equal or outnumber everyone else alive.',
  },
  godfather: {
    id: 'godfather',
    name: 'Godfather',
    team: 'mafia',
    colour: '#FAFAFA',
    bgGlow: 'rgba(255, 255, 255, 0.20)',
    summary: 'Mafia boss. Appears innocent to police investigations.',
    nightVerb: 'Kill',
    needsTarget: true,
    allowSelfTarget: false,
    needsConfirm: false,
    howToPlay: 'Pick one person to kill. In alignment mode, investigations show you as Not Mafia.',
    tips: [
      'Police may report you as "Not mafia" — use that trust wisely.',
      'Lead your syndicate with subtle guidance without over-claiming.',
      'Keep your identity hidden; if you fall, Mafia morale breaks.',
    ],
    winCondition: 'Mafia equal or outnumber everyone else alive.',
  },
  doctor: {
    id: 'doctor',
    name: 'Doctor',
    team: 'town',
    colour: '#E4E4E7',
    bgGlow: 'rgba(228, 228, 231, 0.15)',
    summary: 'Protect someone from the Mafia each night.',
    nightVerb: 'Protect',
    needsTarget: true,
    allowSelfTarget: true,
    needsConfirm: false,
    howToPlay: 'Pick one person to protect. If attacked tonight, they survive.',
    tips: [
      'Protect high-value town players (like investigative claims), not just yourself.',
      'Self-saving and repeating targets follow room settings.',
      'Keep your role secret so Mafia do not target you early.',
    ],
    winCondition: 'All Mafia members are eliminated.',
  },
  police: {
    id: 'police',
    name: 'Police Detective',
    team: 'town',
    colour: '#D4D4D8',
    bgGlow: 'rgba(212, 212, 216, 0.15)',
    summary: 'Investigate one person each night to uncover their allegiance.',
    nightVerb: 'Investigate',
    needsTarget: true,
    allowSelfTarget: false,
    needsConfirm: true,
    howToPlay: 'Pick someone, confirm, and learn their side (timing depends on room rules).',
    tips: [
      'Reveal your findings at decisive moments when town needs proof.',
      'If you reveal yourself too early, Mafia may silence you at night.',
      'Remember: Godfather registers as "Not mafia" under alignment mode.',
    ],
    winCondition: 'All Mafia members are eliminated.',
  },
  vigilante: {
    id: 'vigilante',
    name: 'Vigilante',
    team: 'town',
    colour: '#A1A1AA',
    bgGlow: 'rgba(161, 161, 170, 0.15)',
    summary: "Town's rogue marksman with limited ammunition.",
    nightVerb: 'Shoot',
    needsTarget: true,
    allowSelfTarget: false,
    needsConfirm: true,
    howToPlay: 'Shoot one suspect at night or tap "Hold Fire" to conserve ammo.',
    tips: [
      'Be certain of your target before shooting; town cannot afford mistakes.',
      'Doctor saves can inadvertently block your shot if you shoot a defended player.',
      'Holding fire is often the smarter move until patterns emerge.',
    ],
    winCondition: 'All Mafia members are eliminated.',
  },
  jester: {
    id: 'jester',
    name: 'Jester',
    team: 'jester',
    colour: '#E4E4E7',
    bgGlow: 'rgba(228, 228, 231, 0.15)',
    summary: 'A trickster whose sole goal is to be eliminated by town vote.',
    nightVerb: null,
    needsTarget: false,
    allowSelfTarget: false,
    needsConfirm: false,
    howToPlay: 'Sleep quietly at night. During the day, scheme to get yourself voted out.',
    tips: [
      'Act suspicious, but subtle enough that town suspects you of being Mafia.',
      'If you get night-killed by Mafia, you lose. Stay under Mafia radar.',
      'Winning ends the match immediately in your sole favor!',
    ],
    winCondition: 'Get voted out during the daytime town vote.',
  },
  civilian: {
    id: 'civilian',
    name: 'Civilian',
    team: 'town',
    colour: '#71717A',
    bgGlow: 'rgba(113, 113, 122, 0.15)',
    summary: 'An ordinary citizen relying on logic, observation, and voting power.',
    nightVerb: null,
    needsTarget: false,
    allowSelfTarget: false,
    needsConfirm: false,
    howToPlay: 'Sleep peacefully at night. Tap the harmless decoy screen to disguise activity.',
    tips: [
      'Pay close attention to who accuses whom and who changes votes quickly.',
      'Speak up, cross-examine claims, and band together with trusted townspeople.',
      'Your vote is town’s strongest weapon.',
    ],
    winCondition: 'All Mafia members are eliminated.',
  },
  god: {
    id: 'god',
    name: 'The Narrator (God)',
    team: 'moderator',
    colour: '#FFFFFF',
    bgGlow: 'rgba(255, 255, 255, 0.20)',
    summary: 'Omniscient game master who oversees all actions and guides the game.',
    nightVerb: null,
    needsTarget: false,
    allowSelfTarget: false,
    needsConfirm: false,
    howToPlay: 'You oversee everything in the Control Room but do not take player actions.',
    tips: [
      'Use the Control Room shortcuts to advance phases and maintain game pace.',
      'Monitor live night actions and narrate the morning results atmospherically.',
    ],
    winCondition: 'Deliver an unforgettable game experience.',
  },
};

export const BASICS_STEPS = [
  {
    step: 1,
    title: 'Two Rival Sides',
    text: 'Town aims to find and eliminate all Mafia. Mafia hide in plain sight and aim to equal town numbers.',
    icon: 'Users',
  },
  {
    step: 2,
    title: 'Night Falls',
    text: 'Everyone closes their eyes. Mafia pick a victim, Doctor protects, Police investigate. Civilians sleep peacefully.',
    icon: 'Moon',
  },
  {
    step: 3,
    title: 'Morning Revelations',
    text: 'The city awakens. The morning headline announces who was eliminated, or if someone was saved by the Doctor.',
    icon: 'Sun',
  },
  {
    step: 4,
    title: 'Day Discussion',
    text: 'Players discuss, question alibis, present findings, and accuse suspects in public chat or voice.',
    icon: 'MessageSquare',
  },
  {
    step: 5,
    title: 'The Town Vote',
    text: 'Players cast votes to eliminate one prime suspect. Majority vote eliminates the accused, or voters can choose Skip.',
    icon: 'Gavel',
  },
  {
    step: 6,
    title: 'Victory or Continued Intrigue',
    text: 'Repeat the cycle until Town eliminates all Mafia, Mafia outnumber the Town, or Jester gets voted out!',
    icon: 'Trophy',
  },
];

export const PHASE_DESCRIPTIONS: Record<Phase, string> = {
  lobby: 'Gathering players in the town square. Host configures roles and settings.',
  narratorAssign: 'The Narrator is manually assigning classified roles to all players.',
  roleReveal: 'Secret role assignment. Tap and hold your card to discover your allegiance.',
  night: 'The city sleeps. Secret night actions are underway in the shadows.',
  morning: 'Dawn breaks over the town. Discover the casualties of the night.',
  discussion: 'Town assembly is in session. Debate, interrogate, and build trust.',
  voting: 'The gavel is raised. Cast your vote to eliminate a suspect or skip.',
  voteResult: 'The town votes have been tallied. The accused meets their fate.',
  gameOver: 'The conflict has concluded. View the full truth and timeline recap.',
};
