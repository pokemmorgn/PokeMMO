// server/src/rewards/types/RewardTypes.ts

export interface RewardSource {
  sourceType: 'battle' | 'quest' | 'achievement' | 'capture' | 'trade' | 'daily' | 'event';
  sourceId: string;
  metadata?: Record<string, any>;
}

export interface ExperienceReward {
  type: 'experience';
  pokemonId?: string; // ID du Pokémon qui reçoit l'XP (undefined = tous)
  baseAmount: number;
  multipliers?: {
    trainer?: number;    // 1.5x contre dresseurs
    traded?: number;     // 1.5x si Pokémon échangé
    luckyEgg?: number;   // 1.5x avec Œuf Chance
    weather?: number;    // Bonus météo du serveur
    event?: number;      // Bonus événement
  };
}

export interface MoneyReward {
  type: 'money';
  amount: number;
  multipliers?: {
    amulet?: number;     // Pièce Rune
    event?: number;      // Bonus événement serveur
  };
}

export interface ItemReward {
  type: 'item';
  itemId: string;
  quantity: number;
  pocket?: string; // Auto-détecté si non fourni
}

export interface PokemonReward {
  type: 'pokemon';
  pokemonData: {
    pokemonId: number;
    level: number;
    shiny?: boolean;
    nature?: string;
    moves?: string[];
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

export type Reward = ExperienceReward | MoneyReward | ItemReward | PokemonReward;

export interface RewardBundle {
  rewards: Reward[];
  source: RewardSource;
  playerId: string;
  timestamp?: number;
}

export interface RewardResult {
  success: boolean;
  error?: string;
  processedRewards: ProcessedReward[];
  totalExperience: number;
  totalMoney: number;
  itemsGiven: Array<{ itemId: string; quantity: number; pocket: string }>;
  notifications: RewardNotification[];
}

export interface ProcessedReward {
  type: string;
  success: boolean;
  error?: string;
  data?: any;
  finalAmount?: number;
  multipliers?: Record<string, number>;
}

export interface RewardNotification {
  type: 'experience' | 'money' | 'item' | 'level_up' | 'pokemon' | 'achievement';
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high';
}

export interface ExperienceCalculation {
  pokemonId: string;
  baseExp: number;
  level: number;
  multipliers: Record<string, number>;
  finalExp: number;
  newLevel?: number;
  leveledUp: boolean;
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
  }>;
  battleType: 'wild' | 'trainer' | 'gym' | 'elite_four';
}

// Interface pour les multiplicateurs de dresseurs
export interface TrainerRewardConfig {
  trainerClass: string;
  basePayout: number;
  bonusMultiplier?: number;
}

export const TRAINER_CLASSES: Record<string, TrainerRewardConfig> = {
  'youngster': { trainerClass: 'youngster', basePayout: 16 },
  'lass': { trainerClass: 'lass', basePayout: 16 },
  'bug_catcher': { trainerClass: 'bug_catcher', basePayout: 12 },
  'fisherman': { trainerClass: 'fisherman', basePayout: 20 },
  'gym_leader': { trainerClass: 'gym_leader', basePayout: 100, bonusMultiplier: 2.0 },
  'elite_four': { trainerClass: 'elite_four', basePayout: 200, bonusMultiplier: 3.0 },
  'champion': { trainerClass: 'champion', basePayout: 500, bonusMultiplier: 5.0 }
};

// Constantes pour les calculs
export const REWARD_CONSTANTS = {
  // Multiplicateurs d'expérience
  TRAINER_EXP_MULTIPLIER: 1.5,
  TRADED_POKEMON_MULTIPLIER: 1.5,
  LUCKY_EGG_MULTIPLIER: 1.5,
  
  // Limites
  MAX_LEVEL: 100,
  MAX_EXP_PER_BATTLE: 50000,
  MAX_MONEY_PER_BATTLE: 100000,
  
  // Formules d'XP par niveau (courbe Medium Fast)
  EXP_FORMULA: 'medium_fast',
  
  // Probabilités de bonus
  CRITICAL_CAPTURE_BONUS: 0.05,
  RARE_ITEM_DROP_RATE: 0.01
} as const;
