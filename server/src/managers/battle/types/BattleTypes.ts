// server/src/managers/battle/types/BattleTypes.ts
// Types et interfaces communes pour le système de combat modulaire

export type BattleType = 
  | "wild"           // Combat contre Pokémon sauvage
  | "trainer"        // Combat contre dresseur NPC
  | "pvp"           // Combat joueur vs joueur
  | "double"        // Combat 2v2
  | "triple"        // Combat 3v3  
  | "raid"          // Raid boss (multi-joueurs vs boss)
  | "gym"           // Combat d'arène
  | "elite4"        // Combat Conseil des 4
  | "champion"      // Combat Champion
  | "tournament";   // Tournoi

export type BattlePhase = 
  | "waiting"       // En attente de joueurs
  | "intro"         // Phase d'introduction
  | "team_selection" // Sélection équipe
  | "battle"        // Combat en cours
  | "capture"       // Tentative de capture
  | "victory"       // Victoire
  | "defeat"        // Défaite
  | "fled"          // Fuite
  | "ended"         // Terminé
  | "interrupted";  // Interrompu

export type ActionType = 
  | "attack"        // Utiliser une attaque
  | "item"          // Utiliser un objet
  | "switch"        // Changer de Pokémon
  | "run"           // Fuir
  | "capture"       // Capturer (combat sauvage)
  | "mega_evolve"   // Méga-évolution
  | "z_move";       // Capacité Z

export type BattleEventType =
  | "message"       // Message de combat
  | "animation"     // Animation à jouer
  | "damage"        // Dégâts infligés
  | "heal"          // Soins
  | "status"        // Changement de statut
  | "stat_change"   // Modification de stats
  | "faint"         // Pokémon KO
  | "switch"        // Changement de Pokémon
  | "capture"       // Tentative de capture
  | "ui_update"     // Mise à jour interface
  | "turn_change"   // Changement de tour
  | "battle_end";   // Fin de combat

export type StatusCondition = 
  | "normal"        // Aucun statut
  | "poison"        // Empoisonné
  | "burn"          // Brûlé
  | "freeze"        // Gelé
  | "paralysis"     // Paralysé
  | "sleep"         // Endormi
  | "confusion"     // Confus
  | "infatuation"   // Charmé
  | "flinch";       // Apeurement

export type StatStage = -6 | -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type EffectivenessMultiplier = 0 | 0.25 | 0.5 | 1 | 2 | 4;

export type CaptureResult = {
  success: boolean;
  shakeCount: number;
  criticalCapture: boolean;
  finalProbability: number;
};

export type DamageResult = {
  damage: number;
  effectiveness: EffectivenessMultiplier;
  critical: boolean;
  type: string;
  message?: string;
};

// === INTERFACES PRINCIPALES ===

export interface BattleContext {
  battleId: string;
  battleType: BattleType;
  phase: BattlePhase;
  participants: BattleParticipant[];
  spectators: string[];
  settings: BattleSettings;
  environment: BattleEnvironment;
  turn: number;
  currentPlayer: string;
  isMultiplayer: boolean;
  maxClients: number;
  escapeAttempts?: number;
}

export interface BattleParticipant {
  sessionId: string;
  name: string;
  role: "player1" | "player2" | "player3" | "player4" | "spectator";
  team: BattlePokemonData[];
  activePokemon: string;
  isAI: boolean;
  isConnected: boolean;
  lastActionTime: number;
}

export interface BattlePokemonData {
  pokemonId: number;
  combatId: string;
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  types: string[];
  moves: BattleMoveData[];
  ability?: string;
  heldItem?: string;
  statusCondition: StatusCondition;
  statStages: {
    attack: StatStage;
    defense: StatStage;
    specialAttack: StatStage;
    specialDefense: StatStage;
    speed: StatStage;
    accuracy: StatStage;
    evasion: StatStage;
  };
  stats: {
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
    hp: number;
  };
  gender?: "male" | "female" | "genderless";
  shiny: boolean;
  isWild: boolean;
  experience?: number;
  nature?: string;
}

export interface BattleMoveData {
  moveId: string;
  name: string;
  type: string;
  category: "physical" | "special" | "status";
  power?: number;
  accuracy?: number;
  pp: number;
  maxPp: number;
  priority: number;
  description?: string;
}

export interface BattleAction {
  actionId: string;
  playerId: string;
  type: ActionType;
  targetId?: string;
  data: {
    moveId?: string;
    itemId?: string;
    targetPokemonId?: string;
    ballType?: string; 
    message?: string;
  };
  priority: number;
  speed: number;
  timestamp: number;
}

export interface BattleEvent {
  eventId: string;
  type: BattleEventType;
  timestamp: number;
  playerId?: string;
  targetId?: string;
  data: any;
  message?: string;
  animation?: string;
  delay: number;
}

export interface BattleSequence {
  sequenceId: string;
  events: BattleEvent[];
  totalDuration: number;
  priority: number;
}

export interface BattleSettings {
  timeLimit?: number;           // Limite de temps par tour (ms)
  allowSpectators: boolean;     // Autoriser spectateurs
  allowItems: boolean;          // Autoriser objets
  levelCap?: number;           // Niveau maximum
  banList?: string[];          // Pokémon/moves interdits
  weather?: string;            // Météo initiale
  terrain?: string;            // Terrain initial
  customRules?: any;           // Règles spécifiques
}

export interface BattleEnvironment {
  location: string;
  weather?: string;
  terrain?: string;
  effects: BattleEnvironmentEffect[];
}

export interface BattleEnvironmentEffect {
  id: string;
  type: string;
  duration: number;
  data: any;
}

export interface SpectatorData {
  sessionId: string;
  name: string;
  joinTime: number;
  permissions: {
    canChat: boolean;
    canSeeStats: boolean;
    canSeeHands: boolean;
  };
}

export interface BattleRewards {
  experience: number;
  money: number;
  items: { itemId: string; quantity: number }[];
  pokemonCaught?: BattlePokemonData;
  achievements?: string[];
}

export interface BattleResult {
  winner?: string;
  result: "victory" | "defeat" | "draw" | "fled" | "interrupted";
  rewards: { [playerId: string]: BattleRewards };
  duration: number;
  turns: number;
  summary: string;
}

// === INTERFACES POUR LOGS ===

export interface BattleLogEntry {
  id: string;
  battleId: string;
  timestamp: number;
  type: "action" | "event" | "system" | "security";
  playerId?: string;
  data: any;
  message: string;
}

export interface BattleSecurityEvent {
  type: "rate_limit" | "invalid_action" | "cheat_detected" | "suspicious_timing";
  playerId: string;
  details: any;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: number;
}

// === INTERFACES POUR SAVE STATES ===

export interface BattleSaveState {
  battleId: string;
  timestamp: number;
  context: BattleContext;
  actionHistory: BattleAction[];
  eventHistory: BattleEvent[];
  checksum: string;
}

// === TYPES POUR MESSAGES ===

export interface MessageTemplate {
  id: string;
  template: string;
  variables: string[];
  category: "attack" | "status" | "capture" | "switch" | "system" | "trainer";
  priority: number;
}

export interface LocalizedMessage {
  language: string;
  message: string;
  voiceFile?: string;
}

// === INTERFACES POUR ANIMATIONS ===

export interface BattleAnimation {
  id: string;
  name: string;
  type: "move" | "status" | "entrance" | "faint" | "capture";
  duration: number;
  frames: AnimationFrame[];
  sound?: string;
}

export interface AnimationFrame {
  time: number;
  sprite?: string;
  position?: { x: number; y: number };
  scale?: { x: number; y: number };
  rotation?: number;
  opacity?: number;
  effects?: string[];
}

// === CONSTANTES ===

export const BATTLE_TIMINGS = {
  MESSAGE_DISPLAY: 2000,        // Affichage message standard
  DAMAGE_ANIMATION: 1500,       // Animation de dégâts
  STATUS_CHANGE: 1000,          // Changement de statut
  POKEMON_SWITCH: 2500,         // Changement de Pokémon
  CAPTURE_BOUNCE: 1000,         // Rebond de Poké Ball
  CAPTURE_SHAKE: 800,           // Secousse de capture
  MOVE_ANIMATION: 2000,         // Animation d'attaque
  TURN_TRANSITION: 1000,        // Transition entre tours
  BATTLE_START: 3000,           // Début de combat
  BATTLE_END: 5000,             // Fin de combat
} as const;

export const SECURITY_LIMITS = {
  MAX_ACTIONS_PER_MINUTE: 30,   // Actions max par minute
  MIN_ACTION_INTERVAL: 1000,    // Délai min entre actions (ms)
  MAX_MESSAGE_LENGTH: 200,      // Taille max message
  SESSION_TIMEOUT: 300000,      // Timeout session (5min)
} as const;

export const BATTLE_LIMITS = {
  MAX_SPECTATORS: 50,           // Spectateurs max par combat
  MAX_TURN_TIME: 60000,         // Temps max par tour (ms)
  MAX_BATTLE_DURATION: 1800000, // Durée max combat (30min)
  MAX_POKEMON_PER_TEAM: 6,      // Pokémon max par équipe
  MAX_MOVES_PER_POKEMON: 4,     // Attaques max par Pokémon
} as const;

// === TYPES POUR INTÉGRATION AVEC VOS DONNÉES ===

export interface ExistingPokemonData {
  id: number;
  name: string;
  types: string[];
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  abilities: string[];
  hiddenAbility?: string;
  learnset: Array<{
    moveId: string;
    level: number;
  }>;
  genderRatio: {
    male: number;
    female: number;
  };
  evolution?: {
    canEvolve: boolean;
    evolvesInto?: number;
    evolvesFrom?: number;
    method?: string;
    requirement?: string | number;
  };
}

export interface ExistingMoveData {
  name: string;
  category: "Physical" | "Special" | "Status";
  power?: number;
  accuracy?: number;
  pp: number;
  priority: number;
  description: string;
  effects?: string[];
}

export interface ExistingAbilityData {
  name: string;
  description: string;
  effect: string;
  trigger: string;
  chance?: number;
  multiplier?: number;
  introduced: string;
}

export interface ExistingNatureData {
  name: string;
  increased: string | null;
  decreased: string | null;
  flavor_like: string;
  flavor_dislike: string;
  description: string;
  personality: string;
}

// === INTERFACES POUR IV/EV SYSTEM ===

export interface PokemonIVs {
  hp: number;        // 0-31
  attack: number;    // 0-31
  defense: number;   // 0-31
  spAttack: number;  // 0-31
  spDefense: number; // 0-31
  speed: number;     // 0-31
}

export interface PokemonEVs {
  hp: number;        // 0-252
  attack: number;    // 0-252
  defense: number;   // 0-252
  spAttack: number;  // 0-252
  spDefense: number; // 0-252
  speed: number;     // 0-252
  total: number;     // Max 510
}

export interface CalculatedStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

// === TYPES POUR FORMULE DE DÉGÂTS ===

export interface DamageCalculationInput {
  attacker: BattlePokemonData;
  defender: BattlePokemonData;
  move: ExistingMoveData;
  moveType: string;
  weather?: string;
  terrain?: string;
  isCritical?: boolean;
  randomFactor?: number;  // 0.85-1.0
}

export interface DamageCalculationResult {
  finalDamage: number;
  baseDamage: number;
  effectiveness: EffectivenessMultiplier;
  stab: boolean;           // Same Type Attack Bonus
  critical: boolean;
  weather: number;         // Multiplicateur météo
  ability: number;         // Multiplicateur capacité
  item: number;            // Multiplicateur objet
  randomFactor: number;    // Facteur aléatoire
  messages: string[];      // Messages à afficher
}

// === MESSAGES POKÉMON AUTHENTIQUES ===

export type PokemonMessageCategory = 
  | "attack_use"        // "Pikachu utilise Éclair !"
  | "attack_effect"     // "C'est super efficace !"
  | "attack_miss"       // "L'attaque échoue !"
  | "attack_critical"   // "Coup critique !"
  | "damage_dealt"      // "Ça fait mal !"
  | "status_inflicted"  // "Pikachu est paralysé !"
  | "status_damage"     // "Pikachu souffre du poison !"
  | "status_healed"     // "Pikachu n'est plus paralysé !"
  | "pokemon_faint"     // "Pikachu est K.O. !"
  | "pokemon_switch"    // "Dresseur, rappelle Pikachu !"
  | "item_use"          // "Dresseur utilise une Potion !"
  | "capture_attempt"   // "Dresseur lance une Poké Ball !"
  | "capture_success"   // "Gotcha ! Pikachu a été capturé !"
  | "capture_fail"      // "Mince ! Le Pokémon s'est échappé !"
  | "flee_attempt"      // "Impossible de fuir !"
  | "flee_success"      // "Vous prenez la fuite !"
  | "battle_start"      // "Un Pikachu sauvage apparaît !"
  | "battle_end"        // "Combat terminé !"
  | "trainer_intro"     // "Le Dresseur Martin veut se battre !"
  | "trainer_defeat"    // "Le Dresseur Martin n'a plus de Pokémon !"
  | "ability_trigger"   // "Statik de Pikachu paralyse l'adversaire !"
  | "weather_change"    // "Il commence à pleuvoir !"
  | "turn_info";        // "Que voulez-vous faire ?"

export interface PokemonMessage {
  id: string;
  category: PokemonMessageCategory;
  template: string;
  variables: { [key: string]: string | number };
  priority: number;
  timing: number;  // Durée d'affichage (ms)
}

// === EXPORT DES CONSTANTES DE VOTRE SYSTÈME ===

export const POKEMON_CONSTANTS = {
  MAX_LEVEL: 100,
  MIN_LEVEL: 1,
  MAX_IV: 31,
  MAX_EV_PER_STAT: 252,
  MAX_EV_TOTAL: 510,
  SHINY_BASE_RATE: 1 / 4096,
  CRITICAL_BASE_RATE: 1 / 24,
  STAT_STAGE_MIN: -6,
  STAT_STAGE_MAX: 6,
} as const;

// Multiplicateurs de stages de stats (officiel Pokémon)
export const STAT_STAGE_MULTIPLIERS = {
  '-6': 2/8, '-5': 2/7, '-4': 2/6, '-3': 2/5, '-2': 2/4, '-1': 2/3,
  '0': 1,
  '1': 3/2, '2': 4/2, '3': 5/2, '4': 6/2, '5': 7/2, '6': 8/2
} as const;

// Multiplicateurs de natures (officiel Pokémon)
export const NATURE_MULTIPLIERS = {
  INCREASED: 1.1,
  DECREASED: 0.9,
  NEUTRAL: 1.0
} as const;
