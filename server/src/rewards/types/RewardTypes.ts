// server/src/rewards/types/RewardTypes.ts

export interface RewardSource {
  sourceType: 'battle' | 'quest' | 'achievement' | 'capture' | 'trade' | 'daily' | 'event' | 'friendship' | 'breeding';
  sourceId: string;
  metadata?: Record<string, any>;
}

export interface ExperienceReward {
  type: 'experience';
  pokemonId?: string; // ID du Pokémon qui reçoit l'XP (undefined = tous)
  baseAmount: number;
  multipliers?: {
    trainer?: number;       // 1.5x contre dresseurs
    traded?: number;        // 1.5x si Pokémon échangé
    luckyEgg?: number;      // 1.5x avec Œuf Chance
    weather?: number;       // Bonus météo du serveur
    event?: number;         // Bonus événement
    friendship?: number;    // 1.0-1.2x selon amitié (NEW)
    daycare?: number;       // Bonus pension
    criticalCapture?: number; // Bonus capture critique
    switching?: number;     // Bonus si switch pendant combat (NEW)
    expShare?: number;      // Réduction si partage XP (NEW)
  };
}

export interface MoneyReward {
  type: 'money';
  amount: number;
  multipliers?: {
    amulet?: number;        // Pièce Rune
    event?: number;         // Bonus événement serveur
    prestige?: number;      // Bonus rang de dresseur (NEW)
    dailyStreak?: number;   // Bonus streak quotidien (NEW)
  };
}

export interface ItemReward {
  type: 'item';
  itemId: string;
  quantity: number;
  pocket?: string; // Auto-détecté si non fourni
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  source?: 'capture' | 'battle' | 'gift' | 'quest'; // NEW
}

export interface PokemonReward {
  type: 'pokemon';
  pokemonData: {
    pokemonId: number;
    level: number;
    shiny?: boolean;
    nature?: string;
    moves?: string[];
    friendship?: number; // NEW - Amitié initiale
    ivs?: {
      hp?: number;
      attack?: number;
      defense?: number;
      spAttack?: number;
      spDefense?: number;
      speed?: number;
    };
  };
}

// === NOUVEAU : SYSTÈME D'AMITIÉ ===
export interface FriendshipReward {
  type: 'friendship';
  pokemonId: string;
  friendshipGain: number;
  reason: 'battle_victory' | 'walk_steps' | 'level_up' | 'item_use' | 'grooming' | 'massage' | 'capture' | 'vitamin' | 'evolution_stone' | 'rare_candy';
  bonuses?: {
    expMultiplier?: number;     // 1.0-1.2x selon niveau d'amitié
    criticalHitChance?: number; // Augmente les coups critiques
    statusResistance?: number;  // Résistance aux status
    dodgeChance?: number;       // Esquive occasionnelle
  };
}

// === NOUVEAU : BONUS DE CAPTURE DÉTAILLÉS ===
export interface CaptureReward {
  type: 'capture';
  pokemonId: number;
  level: number;
  ballUsed: string;
  captureDetails: {
    isCriticalCapture: boolean;    // Animation spéciale + bonus
    isNewSpecies: boolean;         // Premier de l'espèce
    isShiny: boolean;
    captureStreak: number;         // Captures consécutives réussies
    pokeBallsUsed: number;         // Nombre de balls utilisées
    weakenedProperly: boolean;     // Pokémon affaibli avant capture
  };
  bonuses: {
    experienceBonus: number;       // XP bonus selon les conditions
    moneyBonus: number;           // Argent bonus
    friendshipStart: number;      // Amitié de départ
    itemRewards: ItemReward[];    // Objets bonus selon la capture
    pokedexProgress: {
      newEntry: boolean;
      completionBonus: number;    // Bonus si proche de 100%
    };
  };
}

export type Reward = ExperienceReward | MoneyReward | ItemReward | PokemonReward | FriendshipReward | CaptureReward;

export interface RewardBundle {
  rewards: Reward[];
  source: RewardSource;
  playerId: string;
  timestamp?: number;
  contextData?: {
    currentStreak?: number;
    playerPrestige?: number;
    activeEvents?: string[];
  };
}

export interface RewardResult {
  success: boolean;
  error?: string;
  processedRewards: ProcessedReward[];
  totalExperience: number;
  totalMoney: number;
  totalFriendship: number; // NEW
  itemsGiven: Array<{ itemId: string; quantity: number; pocket: string; rarity?: string }>;
  notifications: RewardNotification[];
  specialEvents?: Array<{ // NEW - Événements spéciaux déclenchés
    type: 'evolution_ready' | 'friendship_maxed' | 'shiny_charm_unlocked' | 'pokedex_milestone' | 'capture_streak' | 'achievement';
    message: string;
    data: any;
    animation?: string;
    rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  }>;
}

export interface ProcessedReward {
  type: string;
  success: boolean;
  error?: string;
  data?: any;
  finalAmount?: number;
  multipliers?: Record<string, number>;
  friendshipData?: { // NEW
    pokemonId?: string;
    oldFriendship?: number;
    newFriendship?: number;
    relationshipLevel?: string;
  };
}

export interface RewardNotification {
  type: 'experience' | 'money' | 'item' | 'level_up' | 'pokemon' | 'achievement' | 'friendship' | 'capture' | 'evolution';
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high';
  animation?: 'sparkle' | 'heart' | 'star' | 'explosion'; // NEW - Animations spéciales
}

export interface ExperienceCalculation {
  pokemonId: string;
  baseExp: number;
  level: number;
  multipliers: Record<string, number>;
  finalExp: number;
  newLevel?: number;
  leveledUp: boolean;
  friendshipBonus?: number; // NEW
}

// === NOUVEAU : SYSTÈME DE PRESTIGE ===
export interface PrestigeSystem {
  rank: 'novice' | 'trainer' | 'ace_trainer' | 'expert' | 'master' | 'champion';
  points: number;
  nextRankRequirement: number;
  multipliers: {
    experience: number;
    money: number;
    captureRate: number;
    shinyOdds: number;
  };
  specialPrivileges: string[];
}

// Types pour la configuration des calculs d'XP
export interface BattleExperienceConfig {
  defeatedPokemon: {
    pokemonId: number;
    level: number;
    isTrainer: boolean;
  };
  participatingPokemon: Array<{
    pokemonId: string;
    level: number;
    participated: boolean;
    hasLuckyEgg: boolean;
    isTraded: boolean;
    friendship: number; // NEW - Influence l'XP
    switchedIn: boolean; // NEW - Bonus si switch pendant combat
  }>;
  battleType: 'wild' | 'trainer' | 'gym' | 'elite_four';
  expShareActive: boolean; // NEW - Partage d'XP entre toute l'équipe
}

// Interface pour les multiplicateurs de dresseurs
export interface TrainerRewardConfig {
  trainerClass: string;
  basePayout: number;
  bonusMultiplier?: number;
  prestigeRequirement?: number; // NEW - Rang minimum pour défier
}

export const TRAINER_CLASSES: Record<string, TrainerRewardConfig> = {
  'youngster': { trainerClass: 'youngster', basePayout: 16 },
  'lass': { trainerClass: 'lass', basePayout: 16 },
  'bug_catcher': { trainerClass: 'bug_catcher', basePayout: 12 },
  'fisherman': { trainerClass: 'fisherman', basePayout: 20 },
  'sailor': { trainerClass: 'sailor', basePayout: 24 },
  'gentleman': { trainerClass: 'gentleman', basePayout: 48 },
  'beauty': { trainerClass: 'beauty', basePayout: 56 },
  'psychic': { trainerClass: 'psychic', basePayout: 24 },
  'blackbelt': { trainerClass: 'blackbelt', basePayout: 20 },
  'gym_leader': { trainerClass: 'gym_leader', basePayout: 100, bonusMultiplier: 2.0, prestigeRequirement: 3 },
  'elite_four': { trainerClass: 'elite_four', basePayout: 200, bonusMultiplier: 3.0, prestigeRequirement: 5 },
  'champion': { trainerClass: 'champion', basePayout: 500, bonusMultiplier: 5.0, prestigeRequirement: 6 }
};

// === NOUVEAU : NIVEAUX D'AMITIÉ ===
export const FRIENDSHIP_LEVELS = {
  0: { name: 'Hostile', multiplier: 0.8, benefits: [] as string[] },
  1: { name: 'Méfiant', multiplier: 0.9, benefits: [] as string[] },
  70: { name: 'Neutre', multiplier: 1.0, benefits: ['basic_obedience'] as string[] },
  100: { name: 'Amical', multiplier: 1.05, benefits: ['basic_obedience', 'occasional_dodge'] as string[] },
  150: { name: 'Affectueux', multiplier: 1.1, benefits: ['basic_obedience', 'occasional_dodge', 'status_resistance'] as string[] },
  200: { name: 'Loyal', multiplier: 1.15, benefits: ['basic_obedience', 'occasional_dodge', 'status_resistance', 'critical_boost'] as string[] },
  255: { name: 'Dévoué', multiplier: 1.2, benefits: ['basic_obedience', 'frequent_dodge', 'status_immunity', 'critical_boost', 'endure_ko'] as string[] }
} as const;

// === NOUVEAU : BONUS DE CAPTURE ===
export const CAPTURE_BONUSES = {
  criticalCapture: {
    chance: 0.05, // 5% de base
    expBonus: 1.5,
    moneyBonus: 200,
    friendshipBonus: 20
  },
  newSpecies: {
    expBonus: 2.0,
    moneyBonus: 500,
    friendshipBonus: 30,
    itemRewards: ['poke_ball', 'potion']
  },
  shinyCapture: {
    expBonus: 3.0,
    moneyBonus: 1000,
    friendshipBonus: 50,
    itemRewards: ['ultra_ball', 'full_restore'],
    prestigeBonus: 100
  },
  weakenedCapture: {
    expBonus: 1.2,
    friendshipBonus: 10
  },
  quickCapture: { // 1 ball
    expBonus: 1.3,
    moneyBonus: 100,
    friendshipBonus: 15
  }
} as const;

// Constantes pour les calculs
export const REWARD_CONSTANTS = {
  // Multiplicateurs d'expérience
  TRAINER_EXP_MULTIPLIER: 1.5,
  TRADED_POKEMON_MULTIPLIER: 1.5,
  LUCKY_EGG_MULTIPLIER: 1.5,
  FRIENDSHIP_MAX_MULTIPLIER: 1.2, // NEW
  EXP_SHARE_REDUCTION: 0.5, // NEW - Réduction si partage actif
  
  // Limites
  MAX_LEVEL: 100,
  MAX_EXP_PER_BATTLE: 50000,
  MAX_MONEY_PER_BATTLE: 100000,
  MAX_FRIENDSHIP: 255, // NEW
  
  // Formules d'XP par niveau (courbe Medium Fast)
  EXP_FORMULA: 'medium_fast',
  
  // === NOUVEAU : PROBABILITÉS ET BONUS ===
  CRITICAL_CAPTURE_BASE_RATE: 0.05,
  SHINY_BASE_RATE: 1/4096,
  FRIENDSHIP_GAIN_RATES: {
    battle_victory: 3,
    level_up: 5,
    walk_100_steps: 1,
    vitamin_use: 5,
    massage: 10,
    grooming: 5,
    rare_candy: 3,
    evolution_stone: 4
  },
  
  // Bonus de prestige
  PRESTIGE_REQUIREMENTS: {
    novice: 0,
    trainer: 100,
    ace_trainer: 500,
    expert: 1500,
    master: 5000,
    champion: 15000
  },
  
  // Items d'amitié
  FRIENDSHIP_ITEMS: {
    'poke_puff': 20,
    'pokeball_polish': 15,
    'grooming_kit': 25,
    'friendship_berry': 10,
    'luxury_ball': 30 // Bonus si capturé avec
  }
} as const;

// === NOUVEAU : HELPER FUNCTIONS TYPES ===
export interface FriendshipCalculation {
  pokemonId: string;
  oldFriendship: number;
  newFriendship: number;
  gainAmount: number;
  reason: string;
  levelName: string;
  multiplierGained: number;
  benefitsUnlocked: string[];
  evolutionReady: boolean; // Si évolution par amitié possible
}

export interface CaptureCalculation {
  pokemonId: number;
  ballUsed: string;
  attempts: number;
  criticalCapture: boolean;
  bonuses: {
    experience: number;
    money: number;
    friendship: number;
    items: ItemReward[];
    prestige: number;
  };
  notifications: RewardNotification[];
}

// === NOUVEAU : ÉVÉNEMENTS SPÉCIAUX ===
export interface SpecialEvent {
  type: 'evolution_ready' | 'friendship_maxed' | 'pokedex_milestone' | 'capture_streak' | 'shiny_streak' | 'achievement';
  pokemonId?: string;
  milestone?: number;
  rewards?: Reward[];
  announcement: string;
  animation: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// === INTEGRATION COMPLÈTE ===
export interface ExtendedRewardBundle extends RewardBundle {
  friendshipContext?: {
    activeFriendshipBoosts: Record<string, number>;
    pokemonReadyToEvolve: string[];
  };
  captureContext?: {
    currentCaptureStreak: number;
    recentShinyCaptures: number;
    pokedexCompletionRate: number;
  };
  prestigeContext?: {
    currentRank: keyof typeof REWARD_CONSTANTS.PRESTIGE_REQUIREMENTS;
    pointsToNextRank: number;
    unlockedPrivileges: string[];
  };
}
