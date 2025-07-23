// src/quest/core/types/QuestTypes.ts
// Types de base pour le système de quêtes modulaire - VERSION ÉTENDUE
// ✅ COMPATIBILITÉ 100% avec QuestTypes.ts existant + Extensions futures

// ===== TYPES DE BASE CONSERVÉS =====

/**
 * ✅ CONSERVÉ : Types d'objectifs de base + nouveaux types étendus
 */
export type QuestObjectiveType = 
  // Types de base (existants)
  | 'collect'     // Ramasser X objets spécifiques
  | 'defeat'      // Battre X Pokémon/dresseurs
  | 'talk'        // Parler à un NPC spécifique
  | 'reach'       // Aller à une location/zone
  | 'deliver'     // Porter un objet à un NPC
  
  // Types étendus (nouveaux)
  | 'catch'       // Capturer X Pokémon
  | 'encounter'   // Rencontrer/voir un Pokémon (pas forcément capturer)
  | 'use'         // Utiliser X objets/attaques
  | 'win'         // Gagner combats/concours/arènes
  | 'explore'     // Explorer zones/découvrir zones cachées
  
  // Types avancés (futurs)
  | 'breeding'    // Élevage génétique complexe
  | 'temporal'    // Événements météo/jour-nuit/saisons
  | 'contest'     // Concours beauté/talent/performance
  | 'ecosystem'   // Influence spawns/environnement
  | 'mystery';    // Énigmes/secrets à élucider collectivement

/**
 * ✅ CONSERVÉ : Objectif de quête avec extensions
 */
export interface QuestObjective {
  id: string;
  type: QuestObjectiveType;
  description: string;
  target?: string;
  targetName?: string;
  itemId?: string;
  currentAmount: number;
  requiredAmount: number;
  completed: boolean;
  
  // ✅ CONSERVÉ : Dialogue de validation
  validationDialogue?: string[];
  
  // 🆕 NOUVEAUX : Conditions avancées
  conditions?: QuestObjectiveConditions;
  
  // 🆕 NOUVEAUX : Métadonnées pour extensions
  metadata?: QuestObjectiveMetadata;
}

/**
 * 🆕 NOUVEAU : Conditions avancées pour objectifs
 */
export interface QuestObjectiveConditions {
  // Conditions temporelles
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  weather?: 'sunny' | 'rain' | 'snow' | 'fog' | 'storm';
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  
  // Conditions de lieu
  location?: string | string[];
  mapId?: string | string[];
  zone?: string;
  
  // Conditions de Pokémon (pour catch/defeat/encounter)
  pokemonLevel?: { min?: number; max?: number };
  pokemonType?: string | string[];
  isShiny?: boolean;
  isWild?: boolean;
  perfectIV?: boolean;
  
  // Conditions de combat
  battleType?: 'wild' | 'trainer' | 'gym' | 'elite4' | 'champion';
  consecutive?: boolean;
  perfectScore?: boolean;
  noDamage?: boolean;
  
  // Conditions d'objet
  itemRarity?: 'common' | 'rare' | 'epic' | 'legendary';
  firstTime?: boolean;
  
  // Conditions de joueur
  playerLevel?: { min?: number; max?: number };
  hasItem?: string | string[];
  hasBadge?: string | string[];
  completedQuest?: string | string[];
}

/**
 * 🆕 NOUVEAU : Métadonnées pour extensibilité
 */
export interface QuestObjectiveMetadata {
  // UI/UX
  icon?: string;
  color?: string;
  priority?: number;
  hidden?: boolean;
  
  // Système
  autoValidate?: boolean;
  repeatable?: boolean;
  optional?: boolean;
  
  // Analytics
  category?: string;
  difficulty?: number;
  estimatedTime?: number; // en minutes
  
  // Extensions futures
  [key: string]: any;
}

/**
 * 🌟 Rareté des récompenses (types étendus)
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
 * ✅ CONSERVÉ : Types de récompenses avec extensions
 */
export type QuestRewardType = 
  // Types de base (existants)
  | 'gold' 
  | 'item' 
  | 'pokemon' 
  | 'experience'
  
  // Types étendus (nouveaux)
  | 'badge'       // Badge/achievement
  | 'title'       // Titre de joueur
  | 'access'      // Accès à zone/fonctionnalité
  | 'recipe'      // Recette de craft
  | 'move'        // Attaque pour Pokémon
  | 'unlock'      // Déblocage de contenu
  | 'boost'       // Bonus temporaire
  | 'cosmetic';   // Élément cosmétique

/**
 * ✅ CONSERVÉ : Récompense avec extensions
 */
export interface QuestReward {
  type: QuestRewardType;
  itemId?: string;
  amount?: number;
  pokemonId?: number;
  
  // 🆕 NOUVEAUX : Champs étendus
  badgeId?: string;
  titleId?: string;
  accessId?: string;
  recipeId?: string;
  moveId?: string;
  unlockId?: string;
  boostId?: string;
  cosmeticId?: string;
  
  // 🆕 NOUVEAUX : Métadonnées (avec RewardRarity complet)
  rarity?: RewardRarity;
  temporary?: boolean;
  duration?: number; // en minutes si temporaire
  description?: string;
  
  // 🆕 NOUVEAUX : Conditions d'attribution
  conditions?: {
    levelMin?: number;
    completedWithoutDeath?: boolean;
    perfectScore?: boolean;
    timeLimit?: number;
  };
}

/**
 * ✅ CONSERVÉ : Étape de quête avec extensions
 */
export interface QuestStep {
  id: string;
  name: string;
  description: string;
  objectives: QuestObjective[];
  rewards?: QuestReward[];
  completed: boolean;
  
  // 🆕 NOUVEAUX : Métadonnées d'étape
  type?: QuestStepType;
  skippable?: boolean;
  timeLimit?: number; // en minutes
  
  // 🆕 NOUVEAUX : Logique avancée
  objectiveLogic?: 'AND' | 'OR' | 'SEQUENCE';
  minimumObjectives?: number; // Pour logique OR partielle
  
  // 🆕 NOUVEAUX : Événements
  onStart?: QuestStepEvent[];
  onComplete?: QuestStepEvent[];
  onFail?: QuestStepEvent[];
}

/**
 * 🆕 NOUVEAU : Types d'étapes
 */
export type QuestStepType = 
  | 'normal'      // Étape standard
  | 'tutorial'    // Étape didactique
  | 'boss'        // Étape de boss
  | 'puzzle'      // Étape d'énigme
  | 'choice'      // Étape à choix multiples
  | 'timed'       // Étape chronométrée
  | 'stealth'     // Étape discrète
  | 'collection'  // Étape de collection
  | 'social'      // Étape multijoueur
  | 'finale';     // Étape finale

/**
 * 🆕 NOUVEAU : Événements d'étape
 */
export interface QuestStepEvent {
  type: 'spawn' | 'despawn' | 'unlock' | 'lock' | 'trigger' | 'message';
  target: string;
  data?: any;
}

/**
 * ✅ CONSERVÉ : Statuts de quête avec extensions
 */
export type QuestStatus = 
  | 'available'       // ✅ CONSERVÉ
  | 'active'          // ✅ CONSERVÉ
  | 'readyToComplete' // ✅ CONSERVÉ
  | 'completed'       // ✅ CONSERVÉ
  | 'failed'          // ✅ CONSERVÉ
  
  // 🆕 NOUVEAUX statuts
  | 'locked'          // Verrouillée (prérequis non remplis)
  | 'expired'         // Expirée (time limit)
  | 'abandoned'       // Abandonnée par le joueur
  | 'paused'          // En pause (événement spécial)
  | 'cooldown';       // En cooldown (repeatable)

/**
 * ✅ CONSERVÉ : Quête principale avec extensions
 */
export interface Quest {
  id: string;
  name: string;
  description: string;
  category: QuestCategory;
  prerequisites?: string[];
  steps: QuestStep[];
  currentStepIndex: number;
  status: QuestStatus;
  startNpcId?: number;
  endNpcId?: number;
  isRepeatable: boolean;
  cooldownHours?: number;
  lastCompletedAt?: Date;
  
  // 🆕 NOUVEAUX : Métadonnées avancées
  metadata?: QuestMetadata;
  
  // 🆕 NOUVEAUX : Configuration avancée
  config?: QuestConfiguration;
}

/**
 * 🆕 NOUVEAU : Catégories étendues
 */
export type QuestCategory = 
  // Categories de base (existantes)
  | 'main'        // ✅ CONSERVÉ
  | 'side'        // ✅ CONSERVÉ  
  | 'daily'       // ✅ CONSERVÉ
  | 'repeatable'  // ✅ CONSERVÉ
  
  // Nouvelles catégories
  | 'tutorial'    // Quêtes didactiques
  | 'event'       // Événements temporaires
  | 'guild'       // Quêtes de guilde
  | 'pvp'         // Quêtes PvP
  | 'exploration' // Quêtes d'exploration
  | 'collection'  // Quêtes de collection
  | 'challenge'   // Défis spéciaux
  | 'seasonal'    // Quêtes saisonnières
  | 'achievement' // Succès/achievements
  | 'hidden';     // Quêtes secrètes

/**
 * 🆕 NOUVEAU : Métadonnées de quête
 */
export interface QuestMetadata {
  // UI/UX
  icon?: string;
  color?: string;
  banner?: string;
  priority?: number;
  featured?: boolean;
  
  // Gameplay
  difficulty?: 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';
  estimatedTime?: number; // en minutes
  playerCount?: { min: number; max: number };
  
  // Story/Lore
  chapter?: string;
  storyline?: string;
  characters?: string[];
  locations?: string[];
  
  // Système
  version?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  
  // Analytics
  tags?: string[];
  keywords?: string[];
  completionRate?: number;
  averageTime?: number;
}

/**
 * 🆕 NOUVEAU : Configuration de quête
 */
export interface QuestConfiguration {
  // Comportement
  autoStart?: boolean;
  autoComplete?: boolean; // ✅ CONSERVÉ du type existant
  abandonable?: boolean;
  shareable?: boolean;
  
  // Limites
  timeLimit?: number; // en minutes
  maxAttempts?: number;
  playerLimit?: number;
  
  // Conditions
  levelRequirement?: { min?: number; max?: number };
  regionLocked?: string[];
  seasonLocked?: string[];
  
  // Événements
  onStart?: QuestEvent[];
  onComplete?: QuestEvent[];
  onFail?: QuestEvent[];
  onAbandon?: QuestEvent[];
}

/**
 * 🆕 NOUVEAU : Événements de quête
 */
export interface QuestEvent {
  type: 'spawn_npc' | 'unlock_area' | 'trigger_cutscene' | 'send_message' | 'give_item' | 'start_quest';
  target?: string;
  data?: any;
  delay?: number; // en secondes
  conditions?: any;
}

/**
 * ✅ CONSERVÉ : Progression du joueur avec extensions  
 */
export interface PlayerQuestProgress {
  questId: string;
  currentStepIndex: number;
  objectives: Map<string, {
    currentAmount: number;
    completed: boolean;
    
    // 🆕 NOUVEAUX : Détails de progression
    startedAt?: Date;
    completedAt?: Date;
    attempts?: number;
    bestScore?: number;
  }>;
  status: QuestStatus; // ✅ CONSERVÉ avec nouveaux statuts
  startedAt: Date;
  completedAt?: Date;
  
  // 🆕 NOUVEAUX : Métadonnées de progression
  metadata?: PlayerQuestMetadata;
}

/**
 * 🆕 NOUVEAU : Métadonnées de progression joueur
 */
export interface PlayerQuestMetadata {
  // Performance
  totalTime?: number; // en minutes
  deaths?: number;
  score?: number;
  rating?: number;
  
  // Choix du joueur
  choices?: Record<string, any>;
  paths?: string[];
  
  // Social
  helpers?: string[]; // Autres joueurs qui ont aidé
  sharedWith?: string[];
  
  // Techniques
  version?: string;
  clientVersion?: string;
  savePoints?: Array<{
    stepIndex: number;
    timestamp: Date;
    data?: any;
  }>;
}

/**
 * ✅ CONSERVÉ : Événement de progression avec extensions
 */
export interface QuestProgressEvent {
  type: QuestObjectiveType; // ✅ CONSERVÉ mais utilise le type étendu
  targetId?: string;
  amount?: number;
  location?: { x: number; y: number; map: string };
  pokemonId?: number;
  npcId?: number;
  questId?: string; // ✅ CONSERVÉ pour completion manuelle
  
  // 🆕 NOUVEAUX : Données étendues
  metadata?: QuestEventMetadata;
  
  // 🆕 NOUVEAUX : Contexte étendu
  context?: QuestEventContext;
}

/**
 * 🆕 NOUVEAU : Métadonnées d'événement
 */
export interface QuestEventMetadata {
  // Timing
  timestamp?: Date;
  gameTime?: number;
  
  // Qualité
  quality?: 'perfect' | 'good' | 'normal' | 'poor';
  score?: number;
  bonus?: boolean;
  
  // Contexte
  weather?: string;
  timeOfDay?: string;
  season?: string;
  
  // Social
  witnesses?: string[];
  assisted?: boolean;
  
  // Technique
  clientId?: string;
  sessionId?: string;
}

/**
 * 🆕 NOUVEAU : Contexte d'événement
 */
export interface QuestEventContext {
  // Joueur
  playerLevel?: number;
  playerStats?: any;
  
  // Monde
  worldState?: any;
  activeEvents?: string[];
  
  // Combat (si applicable)
  battleState?: any;
  pokemonUsed?: any;
  movesUsed?: string[];
  
  // Social
  partyMembers?: string[];
  guildId?: string;
  
  // Validation
  validated?: boolean;
  validatedBy?: string;
  validationScore?: number;
}

/**
 * ✅ CONSERVÉ : Définition de quête avec extensions massives
 */
export interface QuestDefinition {
  id: string;
  name: string;
  description: string;
  category: QuestCategory; // ✅ CONSERVÉ mais type étendu
  prerequisites?: string[];
  startNpcId?: number;
  endNpcId?: number;
  isRepeatable: boolean;
  cooldownHours?: number;
  autoComplete?: boolean; // ✅ CONSERVÉ
  
  // ✅ CONSERVÉ : Dialogues spécifiques
  dialogues?: {
    questOffer?: string[];
    questInProgress?: string[];
    questComplete?: string[];
    
    // 🆕 NOUVEAUX : Dialogues étendus
    questFailed?: string[];
    questAbandoned?: string[];
    questUnavailable?: string[];
    stepComplete?: Record<string, string[]>; // Par étape
    objectiveComplete?: Record<string, string[]>; // Par objectif
  };
  
  steps: Array<{
    id: string;
    name: string;
    description: string;
    objectives: Array<{
      id: string;
      type: QuestObjectiveType; // ✅ Type étendu
      description: string;
      target?: string;
      targetName?: string;
      itemId?: string;
      requiredAmount: number;
      validationDialogue?: string[]; // ✅ CONSERVÉ
      
      // 🆕 NOUVEAUX : Tous les champs étendus
      conditions?: QuestObjectiveConditions;
      metadata?: QuestObjectiveMetadata;
    }>;
    rewards?: QuestReward[]; // ✅ CONSERVÉ avec type étendu
    
    // 🆕 NOUVEAUX : Champs d'étape étendus
    type?: QuestStepType;
    skippable?: boolean;
    timeLimit?: number;
    objectiveLogic?: 'AND' | 'OR' | 'SEQUENCE';
    minimumObjectives?: number;
    onStart?: QuestStepEvent[];
    onComplete?: QuestStepEvent[];
    onFail?: QuestStepEvent[];
  }>;
  
  // 🆕 NOUVEAUX : Métadonnées et configuration complètes
  metadata?: QuestMetadata;
  config?: QuestConfiguration;
}

// ===== TYPES UTILITAIRES =====

/**
 * 🆕 NOUVEAU : Résultat de validation de quête
 */
export interface QuestValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  score?: number;
  recommendations?: string[];
}

/**
 * 🆕 NOUVEAU : Résultat de recherche de quête
 */
export interface QuestSearchResult {
  quests: QuestDefinition[];
  total: number;
  filters: QuestSearchFilters;
  sorting: QuestSearchSorting;
}

/**
 * 🆕 NOUVEAU : Filtres de recherche
 */
export interface QuestSearchFilters {
  category?: QuestCategory[];
  difficulty?: string[];
  tags?: string[];
  minLevel?: number;
  maxLevel?: number;
  estimatedTime?: { min?: number; max?: number };
  status?: QuestStatus[];
  featured?: boolean;
}

/**
 * 🆕 NOUVEAU : Tri de recherche
 */
export interface QuestSearchSorting {
  field: 'name' | 'difficulty' | 'estimatedTime' | 'priority' | 'createdAt' | 'completionRate';
  order: 'asc' | 'desc';
}

/**
 * 🆕 NOUVEAU : Statistiques de quête
 */
export interface QuestStatistics {
  questId: string;
  totalAttempts: number;
  totalCompletions: number;
  completionRate: number;
  averageTime: number;
  averageScore: number;
  mostFailedObjective?: string;
  popularChoices?: Record<string, number>;
  ratingDistribution: Record<number, number>;
}

// ===== TYPES POUR SYSTÈME MODULAIRE =====

/**
 * 🆕 NOUVEAU : Configuration du système de quêtes
 */
export interface QuestSystemConfig {
  // Modules activés
  enabledModules: string[];
  
  // Limites système
  maxActiveQuests: number;
  maxDailyQuests: number;
  maxCompletedQuests: number;
  
  // Performance
  cacheEnabled: boolean;
  cacheTTL: number;
  batchSize: number;
  
  // Validation
  strictValidation: boolean;
  allowInvalidQuests: boolean;
  validateOnSave: boolean;
  
  // Notifications
  enableNotifications: boolean;
  notificationChannels: string[];
  
  // Analytics
  enableAnalytics: boolean;
  trackPlayerChoices: boolean;
  trackPerformance: boolean;
}

/**
 * 🆕 NOUVEAU : Informations de module
 */
export interface QuestModuleInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  dependencies: string[];
  supportedTypes: QuestObjectiveType[];
  config?: any;
}

// ===== EXPORTS POUR COMPATIBILITÉ =====

// ✅ IMPORTANT : Réexports pour compatibilité totale avec l'ancien QuestTypes.ts
export type {
  QuestObjective as LegacyQuestObjective,
  QuestReward as LegacyQuestReward,
  QuestStep as LegacyQuestStep,
  Quest as LegacyQuest,
  PlayerQuestProgress as LegacyPlayerQuestProgress,
  QuestProgressEvent as LegacyQuestProgressEvent,
  QuestDefinition as LegacyQuestDefinition
};

// Note: QuestObjectiveType, QuestRewardType, QuestCategory, RewardRarity 
// sont déjà exportés dans leurs déclarations respectives ci-dessus
