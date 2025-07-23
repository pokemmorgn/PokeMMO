// src/quest/core/types/RewardTypes.ts
// Types pour le système de récompenses étendu du QuestManager modulaire

import { QuestReward, QuestRewardType, RewardRarity } from './QuestTypes';

// ===== RÉCOMPENSES ÉTENDUES =====

/**
 * 🎁 Récompense étendue avec métadonnées complètes
 */
export interface ExtendedQuestReward extends QuestReward {
  // Identification unique
  rewardId?: string;
  
  // Métadonnées d'affichage
  displayName?: string;
  description?: string;
  icon?: string;
  color?: string;
  rarity?: RewardRarity;
  
  // Conditions d'attribution
  conditions?: RewardConditions;
  
  // Propriétés temporelles
  temporary?: boolean;
  duration?: number; // en minutes si temporaire
  expiresAt?: Date;
  
  // Métadonnées de performance
  performanceBonus?: boolean;
  bonusMultiplier?: number;
  
  // Données spécifiques par type
  metadata?: RewardMetadata;
  
  // Source et traçabilité
  source?: RewardSource;
  grantedAt?: Date;
  grantedBy?: string;
}

/**
 * 🌟 Rareté des récompenses
 */
export type RewardRarity = 
  | 'common'     // Gris - Récompenses standard
  | 'uncommon'   // Vert - Légèrement meilleures
  | 'rare'       // Bleu - Difficiles à obtenir
  | 'epic'       // Violet - Très rares
  | 'legendary'  // Orange - Extrêmement rares
  | 'mythic'     // Rose - Uniques/événements
  | 'artifact';  // Doré - Légendaires historiques

/**
 * 🎯 Conditions d'attribution des récompenses
 */
export interface RewardConditions {
  // Performance
  minimumScore?: number;
  perfectCompletion?: boolean;
  noDeath?: boolean;
  timeLimit?: number; // en minutes
  
  // Niveau et prérequis
  playerLevel?: { min?: number; max?: number };
  requiredBadges?: string[];
  requiredItems?: string[];
  completedQuests?: string[];
  
  // Contexte
  firstCompletion?: boolean;
  dailyCompletion?: boolean;
  eventPeriod?: boolean;
  weatherCondition?: string;
  seasonRequirement?: string;
  
  // Social
  partySize?: { min?: number; max?: number };
  guildMember?: boolean;
  
  // Difficultés spéciales
  handicaps?: string[]; // Ex: "no_items", "single_pokemon", etc.
  challenges?: string[]; // Défis spéciaux
}

/**
 * 📊 Métadonnées spécifiques par type de récompense
 */
export interface RewardMetadata {
  // Pour les items
  item?: {
    stackable?: boolean;
    durability?: number;
    enchantments?: string[];
    customData?: any;
  };
  
  // Pour les Pokémon
  pokemon?: {
    level?: number;
    nature?: string;
    ability?: string;
    moves?: string[];
    ivs?: { hp: number; attack: number; defense: number; spAttack: number; spDefense: number; speed: number };
    shiny?: boolean;
    ball?: string;
    originalTrainer?: string;
  };
  
  // Pour les badges
  badge?: {
    tier?: number;
    category?: string;
    unlocks?: string[];
    displayOrder?: number;
  };
  
  // Pour les titres
  title?: {
    prefix?: boolean; // Affiché avant le nom
    suffix?: boolean; // Affiché après le nom
    color?: string;
    glow?: boolean;
    exclusive?: boolean;
  };
  
  // Pour les accès
  access?: {
    areas?: string[];
    features?: string[];
    npcs?: string[];
    duration?: number; // Si temporaire
  };
  
  // Pour les recettes
  recipe?: {
    category?: string;
    difficulty?: number;
    materials?: Array<{ itemId: string; quantity: number }>;
    result?: { itemId: string; quantity: number };
    unlockLevel?: number;
  };
  
  // Pour les attaques
  move?: {
    pokemonTypes?: string[];
    power?: number;
    accuracy?: number;
    pp?: number;
    category?: 'physical' | 'special' | 'status';
    tutorOnly?: boolean;
  };
  
  // Pour les boosts
  boost?: {
    statType?: 'experience' | 'gold' | 'speed' | 'luck' | 'damage' | 'defense';
    multiplier?: number;
    additiveBonus?: number;
    stackable?: boolean;
    showInUI?: boolean;
  };
  
  // Pour les cosmétiques
  cosmetic?: {
    category?: 'outfit' | 'accessory' | 'emote' | 'particle' | 'mount' | 'pet';
    slot?: string;
    animationId?: string;
    tradeable?: boolean;
  };
}

/**
 * 📝 Source de la récompense
 */
export interface RewardSource {
  type: 'quest' | 'achievement' | 'event' | 'purchase' | 'gift' | 'compensation' | 'bonus';
  sourceId: string; // ID de la quête, événement, etc.
  sourceName?: string;
  grantedBy?: 'system' | 'admin' | 'player';
  granterId?: string;
  reason?: string;
}

// ===== GROUPES DE RÉCOMPENSES =====

/**
 * 📦 Groupe de récompenses
 */
export interface RewardGroup {
  id: string;
  name: string;
  description?: string;
  
  // Récompenses du groupe
  rewards: ExtendedQuestReward[];
  
  // Distribution
  distributionType: RewardDistributionType;
  
  // Conditions globales du groupe
  conditions?: RewardConditions;
  
  // Métadonnées
  rarity?: RewardRarity;
  weight?: number; // Pour distribution pondérée
  
  // Limites
  maxClaimsPerPlayer?: number;
  maxClaimsGlobal?: number;
  currentClaims?: number;
}

/**
 * 🎲 Type de distribution des récompenses
 */
export type RewardDistributionType =
  | 'all'           // Toutes les récompenses du groupe
  | 'one_random'    // Une récompense au hasard
  | 'weighted'      // Distribution pondérée par weight
  | 'first_available' // Première récompense disponible
  | 'choice'        // Le joueur choisit
  | 'progressive';  // Une par une selon un ordre

/**
 * 🎁 Catalogue de récompenses
 */
export interface RewardCatalog {
  // Groupes de récompenses
  groups: Map<string, RewardGroup>;
  
  // Récompenses individuelles
  individual: Map<string, ExtendedQuestReward>;
  
  // Configuration
  config: RewardCatalogConfig;
  
  // Métadonnées
  version: string;
  lastUpdated: Date;
  totalRewards: number;
}

/**
 * ⚙️ Configuration du catalogue de récompenses
 */
export interface RewardCatalogConfig {
  // Distribution
  enableRandomization: boolean;
  rarityMultipliers: Record<RewardRarity, number>;
  
  // Limites
  maxRewardsPerClaim: number;
  maxDailyRewards: number;
  
  // Économie
  goldInflationProtection: boolean;
  itemValueCaps: Record<string, number>;
  
  // Événements
  eventMultipliers: boolean;
  seasonalBonuses: boolean;
  
  // Debug
  debugMode: boolean;
  logAllDistributions: boolean;
}

// ===== DISTRIBUTION ET CLAIMING =====

/**
 * 📋 Demande de distribution de récompense
 */
export interface RewardDistributionRequest {
  playerId: string;
  rewardSource: RewardSource;
  
  // Récompenses à distribuer
  rewards?: ExtendedQuestReward[];
  rewardGroups?: string[];
  
  // Options
  immediate?: boolean; // Distribution immédiate ou différée
  notification?: boolean; // Envoyer notification au joueur
  
  // Contexte
  questId?: string;
  achievementId?: string;
  eventId?: string;
  
  // Validation
  skipConditionCheck?: boolean;
  overrideValidation?: boolean;
  
  // Métadonnées
  requestId?: string;
  timestamp?: Date;
  requestedBy?: string;
}

/**
 * 📋 Résultat de distribution
 */
export interface RewardDistributionResult {
  success: boolean;
  requestId: string;
  playerId: string;
  
  // Récompenses distribuées
  distributedRewards: DistributedReward[];
  
  // Récompenses échouées
  failedRewards: Array<{
    reward: ExtendedQuestReward;
    reason: string;
    canRetry: boolean;
  }>;
  
  // Statistiques
  totalRewards: number;
  totalValue: number;
  
  // Détails
  distributionTime: number; // en ms
  notifications: boolean;
  
  // Erreurs/avertissements
  errors?: string[];
  warnings?: string[];
}

/**
 * 🎁 Récompense distribuée
 */
export interface DistributedReward extends ExtendedQuestReward {
  // Distribution
  distributedAt: Date;
  distributionId: string;
  
  // État
  claimed: boolean;
  claimedAt?: Date;
  
  // Validation
  validated: boolean;
  validationErrors?: string[];
  
  // Valeur calculée
  actualValue?: number;
  bonusApplied?: number;
  
  // Notification envoyée
  notificationSent: boolean;
}

/**
 * 📬 Boîte aux lettres de récompenses (pour récompenses non réclamées)
 */
export interface RewardMailbox {
  playerId: string;
  
  // Récompenses en attente
  pendingRewards: DistributedReward[];
  
  // Historique récent
  recentHistory: DistributedReward[];
  
  // Configuration
  maxPendingRewards: number;
  autoClaimAfterDays: number;
  deleteAfterDays: number;
  
  // Statistiques
  totalRewardsReceived: number;
  totalValueReceived: number;
  lastActivity: Date;
}

// ===== SYSTÈME D'ACHIEVEMENTS =====

/**
 * 🏆 Achievement (succès)
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  
  // Critères
  criteria: AchievementCriteria;
  
  // Récompenses
  rewards: ExtendedQuestReward[];
  
  // Métadonnées
  icon?: string;
  rarity: RewardRarity;
  points: number;
  
  // Progression
  trackable: boolean;
  progressive: boolean;
  
  // Visibilité
  hidden: boolean;
  spoilerFree: boolean;
  
  // Conditions d'unlock
  unlockConditions?: RewardConditions;
}

/**
 * 🏷️ Catégorie d'achievement
 */
export type AchievementCategory =
  | 'progression'   // Progression générale
  | 'collection'    // Collection de Pokémon/objets
  | 'combat'        // Combats et victoires
  | 'exploration'   // Exploration et découverte
  | 'social'        // Activités sociales
  | 'mastery'       // Maîtrise de mécaniques
  | 'speed'         // Records de vitesse
  | 'challenge'     // Défis spéciaux
  | 'seasonal'      // Événements saisonniers
  | 'secret';       // Achievements secrets

/**
 * 🎯 Critères d'achievement
 */
export interface AchievementCriteria {
  type: 'counter' | 'boolean' | 'threshold' | 'combination' | 'sequence';
  
  // Pour type 'counter'
  targetValue?: number;
  statistic?: string; // Nom de la statistique à tracker
  
  // Pour type 'boolean'
  condition?: string;
  
  // Pour type 'threshold'
  thresholds?: Array<{ value: number; tier: number }>;
  
  // Pour type 'combination'
  requirements?: Array<{
    type: string;
    target: string;
    value: number;
  }>;
  
  // Pour type 'sequence'
  sequence?: Array<{
    action: string;
    parameters?: any;
    timeLimit?: number;
  }>;
}

/**
 * 📊 Progression d'achievement
 */
export interface AchievementProgress {
  achievementId: string;
  playerId: string;
  
  // Progression
  currentValue: number;
  targetValue: number;
  percentage: number;
  completed: boolean;
  
  // Historique
  startedAt: Date;
  completedAt?: Date;
  
  // Détails de progression
  milestones: Array<{
    value: number;
    reachedAt: Date;
    tier?: number;
  }>;
  
  // Métadonnées
  lastUpdated: Date;
  updateCount: number;
}

// ===== ANALYTICS ET STATISTIQUES =====

/**
 * 📈 Statistiques de récompenses
 */
export interface RewardStatistics {
  playerId: string;
  
  // Volume global
  totalRewardsReceived: number;
  totalValue: number;
  
  // Par type
  byType: Record<RewardRawType, {
    count: number;
    totalValue: number;
    averageValue: number;
    lastReceived?: Date;
  }>;
  
  // Par rareté
  byRarity: Record<RewardRarity, {
    count: number;
    percentage: number;
    totalValue: number;
  }>;
  
  // Par source
  bySource: Record<string, {
    count: number;
    totalValue: number;
    sources: string[];
  }>;
  
  // Tendances temporelles
  dailyTrends: Array<{
    date: string;
    count: number;
    value: number;
    topReward?: string;
  }>;
  
  // Records
  highestValueReward: {
    rewardId: string;
    value: number;
    receivedAt: Date;
  };
  
  rarestReward: {
    rewardId: string;
    rarity: RewardRarity;
    receivedAt: Date;
  };
  
  // Achievements
  totalAchievements: number;
  achievementPoints: number;
  completionRate: number;
  
  // Période de calcul
  periodStart: Date;
  periodEnd: Date;
  lastCalculated: Date;
}

/**
 * 🌐 Statistiques globales du système de récompenses
 */
export interface GlobalRewardStatistics {
  // Volume global
  totalDistributions: number;
  totalPlayers: number;
  totalValue: number;
  
  // Tendances
  distributionRate: number; // par heure
  popularRewards: Array<{
    rewardId: string;
    count: number;
    percentage: number;
  }>;
  
  // Économie
  goldDistributed: number;
  itemsDistributed: number;
  inflationRate: number;
  
  // Performance
  averageDistributionTime: number;
  successRate: number;
  
  // Top players
  topRecipients: Array<{
    playerId: string;
    totalRewards: number;
    totalValue: number;
  }>;
  
  // Période
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
}

// ===== INTERFACES POUR SERVICES =====

/**
 * 🔧 Interface pour service de distribution
 */
export interface RewardDistributor {
  // Distribution principale
  distribute(request: RewardDistributionRequest): Promise<RewardDistributionResult>;
  distributeBatch(requests: RewardDistributionRequest[]): Promise<RewardDistributionResult[]>;
  
  // Claiming
  claimReward(playerId: string, rewardId: string): Promise<boolean>;
  claimAllPending(playerId: string): Promise<DistributedReward[]>;
  
  // Mailbox
  getMailbox(playerId: string): Promise<RewardMailbox>;
  clearMailbox(playerId: string): Promise<boolean>;
  
  // Validation
  validateRewardConditions(playerId: string, reward: ExtendedQuestReward): Promise<boolean>;
  canReceiveReward(playerId: string, rewardId: string): Promise<{ canReceive: boolean; reason?: string }>;
  
  // Catalogue
  getCatalog(): RewardCatalog;
  updateCatalog(catalog: Partial<RewardCatalog>): Promise<boolean>;
  
  // Statistiques
  getPlayerStats(playerId: string): Promise<RewardStatistics>;
  getGlobalStats(): Promise<GlobalRewardStatistics>;
}

/**
 * 🏆 Interface pour service d'achievements
 */
export interface AchievementService {
  // Progression
  updateProgress(playerId: string, statistic: string, value: number): Promise<AchievementProgress[]>;
  checkCompletion(playerId: string, achievementId: string): Promise<boolean>;
  
  // Récupération
  getPlayerAchievements(playerId: string): Promise<Achievement[]>;
  getPlayerProgress(playerId: string, achievementId?: string): Promise<AchievementProgress[]>;
  
  // Catalogue
  getAllAchievements(): Achievement[];
  getAchievementsByCategory(category: AchievementCategory): Achievement[];
  
  // Administration
  grantAchievement(playerId: string, achievementId: string, reason?: string): Promise<boolean>;
  resetProgress(playerId: string, achievementId: string): Promise<boolean>;
}

// ===== TYPES UTILITAIRES =====

/**
 * Type union pour tous les types de récompenses (compat)
 */
export type RewardRawType = QuestRewardType;

/**
 * 🏭 Factory pour créer des récompenses
 */
export const RewardFactory = {
  /**
   * Créer une récompense d'or
   */
  createGold: (amount: number, rarity: RewardRarity = 'common'): ExtendedQuestReward => ({
    type: 'gold',
    amount,
    rarity,
    displayName: `${amount} Or`,
    icon: '💰',
    source: {
      type: 'quest',
      sourceId: 'unknown',
      grantedBy: 'system'
    }
  }),
  
  /**
   * Créer une récompense d'item
   */
  createItem: (
    itemId: string,
    amount: number = 1,
    rarity: RewardRarity = 'common'
  ): ExtendedQuestReward => ({
    type: 'item',
    itemId,
    amount,
    rarity,
    displayName: itemId,
    icon: '📦',
    source: {
      type: 'quest',
      sourceId: 'unknown',
      grantedBy: 'system'
    }
  }),
  
  /**
   * Créer un badge
   */
  createBadge: (
    badgeId: string,
    tier: number = 1,
    rarity: RewardRarity = 'rare'
  ): ExtendedQuestReward => ({
    type: 'badge',
    badgeId,
    rarity,
    displayName: `Badge ${badgeId}`,
    icon: '🏅',
    metadata: {
      badge: {
        tier,
        category: 'quest'
      }
    },
    source: {
      type: 'achievement',
      sourceId: badgeId,
      grantedBy: 'system'
    }
  }),
  
  /**
   * Créer un boost temporaire
   */
  createBoost: (
    boostType: 'experience' | 'gold' | 'speed' | 'luck',
    multiplier: number,
    durationMinutes: number
  ): ExtendedQuestReward => ({
    type: 'boost',
    boostId: `${boostType}_boost`,
    temporary: true,
    duration: durationMinutes,
    rarity: 'uncommon',
    displayName: `Boost ${boostType} x${multiplier}`,
    icon: '⚡',
    metadata: {
      boost: {
        statType: boostType,
        multiplier,
        stackable: false,
        showInUI: true
      }
    },
    source: {
      type: 'quest',
      sourceId: 'unknown',
      grantedBy: 'system'
    }
  })
};

/**
 * 🔧 Constantes pour le système de récompenses
 */
export const RewardConstants = {
  // Multiplicateurs de rareté
  RARITY_MULTIPLIERS: {
    common: 1.0,
    uncommon: 1.5,
    rare: 2.0,
    epic: 3.0,
    legendary: 5.0,
    mythic: 8.0,
    artifact: 15.0
  },
  
  // Limites par défaut
  DEFAULT_LIMITS: {
    MAX_PENDING_REWARDS: 50,
    MAX_DAILY_REWARDS: 100,
    AUTO_CLAIM_DAYS: 7,
    DELETE_AFTER_DAYS: 30
  },
  
  // Couleurs par rareté
  RARITY_COLORS: {
    common: '#808080',
    uncommon: '#008000',
    rare: '#0080FF',
    epic: '#8000FF',
    legendary: '#FF8000',
    mythic: '#FF00FF',
    artifact: '#FFD700'
  }
} as const;
