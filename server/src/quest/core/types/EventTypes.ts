// src/quest/core/types/EventTypes.ts
// Types pour le système d'événements avancé du QuestManager modulaire

import { QuestObjectiveType, QuestProgressEvent, QuestEventMetadata, QuestEventContext } from './QuestTypes';

// ===== ÉVÉNEMENTS DE TRIGGER (API ONE-LINER) =====

/**
 * 🎯 Types d'événements pour l'API one-liner ultra-rapide
 */
export type QuestTriggerType = 
  // Actions de base
  | 'defeat'      // QuestManager.trigger('player', 'defeat', 'rattata')
  | 'collect'     // QuestManager.trigger('player', 'collect', 'potion') 
  | 'catch'       // QuestManager.trigger('player', 'catch', 'pikachu')
  | 'talk'        // QuestManager.trigger('player', 'talk', 'npc_1')
  | 'reach'       // QuestManager.trigger('player', 'reach', 'route_1')
  | 'use'         // QuestManager.trigger('player', 'use', 'pokeball')
  | 'deliver'     // QuestManager.trigger('player', 'deliver', 'package', { to: 'npc_2' })
  | 'encounter'   // QuestManager.trigger('player', 'encounter', 'legendary')
  | 'win'         // QuestManager.trigger('player', 'win', 'gym_battle')
  | 'explore'     // QuestManager.trigger('player', 'explore', 'hidden_cave')
  
  // Actions avancées (futurs)
  | 'breed'       // QuestManager.trigger('player', 'breed', 'perfect_iv')
  | 'contest'     // QuestManager.trigger('player', 'contest', 'beauty_contest')
  | 'trade'       // QuestManager.trigger('player', 'trade', 'pokemon_trade')
  | 'evolve'      // QuestManager.trigger('player', 'evolve', 'pikachu')
  | 'level_up'    // QuestManager.trigger('player', 'level_up', 'trainer')
  | 'unlock';     // QuestManager.trigger('player', 'unlock', 'new_area')

/**
 * 🎯 Événement de trigger simplifié pour API one-liner
 */
export interface QuestTriggerEvent {
  // Données de base (API simple)
  type: QuestTriggerType;
  target: string;
  
  // Données optionnelles
  amount?: number;
  data?: QuestTriggerData;
  
  // Métadonnées automatiques (ajoutées par le système)
  timestamp?: Date;
  playerId?: string;
  sessionId?: string;
}

/**
 * 🎯 Données étendues pour triggers complexes
 */
export interface QuestTriggerData {
  // Contexte de lieu
  location?: {
    x?: number;
    y?: number;
    map?: string;
    zone?: string;
  };
  
  // Contexte Pokémon
  pokemon?: {
    id?: number | string;
    level?: number;
    type?: string[];
    isShiny?: boolean;
    isWild?: boolean;
    perfectIV?: boolean;
    nature?: string;
  };
  
  // Contexte NPC/interaction
  npc?: {
    id?: number;
    type?: string;
    name?: string;
  };
  
  // Contexte combat
  battle?: {
    type?: 'wild' | 'trainer' | 'gym' | 'elite4';
    result?: 'win' | 'lose' | 'draw';
    score?: number;
    perfect?: boolean;
    turns?: number;
  };
  
  // Contexte objet
  item?: {
    id?: string;
    quantity?: number;
    rarity?: string;
    quality?: number;
  };
  
  // Données libres pour extensibilité
  [key: string]: any;
}

/**
 * 🎯 Résultat d'un trigger
 */
export interface QuestTriggerResult {
  success: boolean;
  processed: boolean;
  triggeredQuests: string[];
  completedObjectives: QuestObjectiveCompletion[];
  completedSteps: QuestStepCompletion[];
  completedQuests: QuestCompletion[];
  errors?: string[];
  warnings?: string[];
  processingTime?: number;
}

// ===== ÉVÉNEMENTS DE GESTION DE QUÊTES =====

/**
 * 🎮 Actions de gestion des quêtes
 */
export type QuestActionType =
  | 'start'       // QuestManager.start('player', 'quest_id')
  | 'complete'    // QuestManager.complete('player', 'quest_id')
  | 'abandon'     // QuestManager.abandon('player', 'quest_id')
  | 'reset'       // QuestManager.reset('player', 'quest_id')
  | 'skip_step'   // QuestManager.skipStep('player', 'quest_id', step_index)
  | 'check';      // QuestManager.check('player', 'quest_id')

/**
 * 🎮 Événement d'action de quête
 */
export interface QuestActionEvent {
  type: QuestActionType;
  questId: string;
  stepIndex?: number;
  reason?: string;
  forced?: boolean;
  
  // Métadonnées
  timestamp?: Date;
  playerId?: string;
  source?: 'player' | 'npc' | 'system' | 'admin';
}

/**
 * 🎮 Résultat d'une action de quête
 */
export interface QuestActionResult {
  success: boolean;
  action: QuestActionType;
  questId: string;
  questName?: string;
  status?: string;
  message?: string;
  data?: any;
  errors?: string[];
  warnings?: string[];
}

// ===== ÉVÉNEMENTS DE COMPLETION =====

/**
 * 🏆 Completion d'objectif
 */
export interface QuestObjectiveCompletion {
  questId: string;
  questName: string;
  stepId: string;
  stepName: string;
  objectiveId: string;
  objectiveName: string;
  
  // Détails de completion
  completedAt: Date;
  previousAmount: number;
  newAmount: number;
  requiredAmount: number;
  triggerEvent?: QuestTriggerEvent;
  
  // Performance
  attempts?: number;
  timeSpent?: number; // en secondes
  score?: number;
  perfect?: boolean;
  
  // Récompenses immédiates
  instantRewards?: any[];
}

/**
 * 🏆 Completion d'étape
 */
export interface QuestStepCompletion {
  questId: string;
  questName: string;
  stepId: string;
  stepName: string;
  stepIndex: number;
  
  // Détails de completion
  completedAt: Date;
  objectivesCompleted: QuestObjectiveCompletion[];
  nextStepId?: string;
  nextStepName?: string;
  
  // Récompenses d'étape
  stepRewards?: any[];
  
  // Performance globale de l'étape
  totalTime?: number;
  totalAttempts?: number;
  overallScore?: number;
}

/**
 * 🏆 Completion de quête
 */
export interface QuestCompletion {
  questId: string;
  questName: string;
  category: string;
  
  // Détails de completion
  completedAt: Date;
  startedAt: Date;
  totalTime: number; // en secondes
  autoCompleted: boolean;
  
  // Performance globale
  stepsCompleted: QuestStepCompletion[];
  totalObjectives: number;
  totalSteps: number;
  overallScore?: number;
  rating?: number;
  
  // Récompenses finales
  questRewards?: any[];
  bonusRewards?: any[];
  
  // Statistiques
  deaths?: number;
  hints?: number;
  perfectRun?: boolean;
}

// ===== ÉVÉNEMENTS DE NOTIFICATION =====

/**
 * 📢 Types de notifications
 */
export type QuestNotificationType =
  | 'quest_offered'         // Nouvelle quête disponible
  | 'quest_started'         // Quête démarrée
  | 'objective_progress'    // Progression d'objectif
  | 'objective_completed'   // Objectif terminé
  | 'step_completed'        // Étape terminée
  | 'quest_completed'       // Quête terminée
  | 'quest_failed'          // Quête échouée
  | 'quest_abandoned'       // Quête abandonnée
  | 'reward_received'       // Récompense reçue
  | 'achievement_unlocked'  // Achievement débloqué
  | 'reminder'              // Rappel de quête
  | 'warning'               // Avertissement (time limit, etc.)
  | 'system_message';       // Message système

/**
 * 📢 Notification de quête
 */
export interface QuestNotification {
  type: QuestNotificationType;
  playerId: string;
  title: string;
  message: string;
  
  // Données liées
  questId?: string;
  stepId?: string;
  objectiveId?: string;
  
  // Apparence
  icon?: string;
  color?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  
  // Comportement
  autoHide?: boolean;
  hideAfter?: number; // en secondes
  persistent?: boolean;
  sound?: string;
  
  // Actions possibles
  actions?: QuestNotificationAction[];
  
  // Métadonnées
  timestamp: Date;
  source: string;
  data?: any;
}

/**
 * 📢 Action de notification
 */
export interface QuestNotificationAction {
  id: string;
  label: string;
  type: 'button' | 'link' | 'command';
  action: string;
  data?: any;
  style?: 'primary' | 'secondary' | 'danger' | 'success';
}

// ===== ÉVÉNEMENTS BATCH/MULTIPLE =====

/**
 * 📦 Batch d'événements pour performance
 */
export interface QuestEventBatch {
  playerId: string;
  events: QuestTriggerEvent[];
  batchId?: string;
  timestamp: Date;
  source?: string;
  
  // Configuration du batch
  atomic?: boolean; // Tout ou rien
  ordered?: boolean; // Ordre d'exécution important
  maxRetries?: number;
  timeout?: number; // en millisecondes
}

/**
 * 📦 Résultat de batch
 */
export interface QuestBatchResult {
  batchId: string;
  success: boolean;
  processed: number;
  failed: number;
  results: QuestTriggerResult[];
  
  // Agrégation
  totalTriggeredQuests: string[];
  totalCompletedObjectives: number;
  totalCompletedSteps: number;
  totalCompletedQuests: number;
  
  // Performance
  processingTime: number;
  averageEventTime: number;
  
  // Erreurs
  errors?: string[];
  warnings?: string[];
}

// ===== ÉVÉNEMENTS DE VALIDATION =====

/**
 * ✅ Événement de validation
 */
export interface QuestValidationEvent {
  type: 'pre_start' | 'pre_complete' | 'pre_abandon' | 'condition_check';
  questId: string;
  playerId: string;
  
  // Données de validation
  conditions?: any;
  requirements?: any;
  context?: any;
  
  // Résultat (rempli par le validateur)
  valid?: boolean;
  reason?: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * ✅ Résultat de validation
 */
export interface QuestValidationResult {
  valid: boolean;
  questId: string;
  playerId: string;
  
  // Détails
  checkedConditions: string[];
  failedConditions?: string[];
  warnings?: string[];
  
  // Recommandations
  suggestions?: string[];
  alternatives?: string[];
  
  // Performance
  validationTime: number;
}

// ===== ÉVÉNEMENTS SYSTÈME =====

/**
 * ⚙️ Événements système internes
 */
export type QuestSystemEventType =
  | 'module_loaded'
  | 'module_unloaded'
  | 'cache_cleared'
  | 'database_sync'
  | 'performance_warning'
  | 'rate_limit_hit'
  | 'error_threshold_reached'
  | 'maintenance_mode'
  | 'hotreload_triggered';

/**
 * ⚙️ Événement système
 */
export interface QuestSystemEvent {
  type: QuestSystemEventType;
  timestamp: Date;
  source: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  data?: any;
  
  // Contexte
  moduleId?: string;
  playerId?: string;
  questId?: string;
  
  // Performance
  duration?: number;
  memory?: number;
  cpu?: number;
}

// ===== TYPES POUR HANDLERS/LISTENERS =====

/**
 * 🎧 Handler d'événements de quête
 */
export type QuestEventHandler<T = any> = (event: T) => Promise<void> | void;

/**
 * 🎧 Configuration de listener
 */
export interface QuestEventListener {
  id: string;
  events: string[]; // Types d'événements à écouter
  handler: QuestEventHandler;
  priority?: number;
  enabled?: boolean;
  filter?: (event: any) => boolean;
}

/**
 * 🎧 Registre d'événements
 */
export interface QuestEventRegistry {
  // Gestion des listeners
  addListener(config: QuestEventListener): void;
  removeListener(id: string): void;
  
  // Émission d'événements
  emit(eventType: string, event: any): Promise<void>;
  emitSync(eventType: string, event: any): void;
  
  // Batch
  emitBatch(events: Array<{ type: string; event: any }>): Promise<void>;
  
  // État
  getListeners(eventType?: string): QuestEventListener[];
  isEnabled(listenerId: string): boolean;
  enable(listenerId: string): void;
  disable(listenerId: string): void;
}

// ===== TYPES POUR MÉTRIQUES/ANALYTICS =====

/**
 * 📊 Métriques d'événements
 */
export interface QuestEventMetrics {
  // Compteurs
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsPerSecond: number;
  
  // Performance
  averageProcessingTime: number;
  slowestEvents: Array<{ type: string; time: number; questId: string }>;
  
  // Erreurs
  errorRate: number;
  errorsByType: Record<string, number>;
  
  // Joueurs
  activePlayerCount: number;
  mostActivePlayer: string;
  
  // Période
  startTime: Date;
  endTime?: Date;
  duration: number; // en secondes
}

/**
 * 📊 Analytics d'événement spécifique
 */
export interface QuestEventAnalytics {
  eventType: string;
  
  // Volume
  totalOccurrences: number;
  dailyAverage: number;
  peakHour: number;
  
  // Performance
  averageTime: number;
  successRate: number;
  retryRate: number;
  
  // Joueurs
  uniquePlayers: number;
  topPlayers: Array<{ playerId: string; count: number }>;
  
  // Tendances
  trends: Array<{
    date: string;
    count: number;
    averageTime: number;
    successRate: number;
  }>;
}

// ===== EXPORTS UTILITAIRES =====

/**
 * 🔧 Utilitaires de création d'événements
 */
export const QuestEventFactory = {
  /**
   * Créer un trigger event simple
   */
  createTrigger: (
    type: QuestTriggerType,
    target: string,
    amount: number = 1,
    data?: Partial<QuestTriggerData>
  ): QuestTriggerEvent => ({
    type,
    target,
    amount,
    data,
    timestamp: new Date()
  }),
  
  /**
   * Créer une notification simple
   */
  createNotification: (
    type: QuestNotificationType,
    playerId: string,
    title: string,
    message: string,
    data?: any
  ): QuestNotification => ({
    type,
    playerId,
    title,
    message,
    priority: 'normal',
    timestamp: new Date(),
    source: 'system',
    data
  }),
  
  /**
   * Créer un batch d'événements
   */
  createBatch: (
    playerId: string,
    events: QuestTriggerEvent[],
    options?: {
      atomic?: boolean;
      ordered?: boolean;
      batchId?: string;
    }
  ): QuestEventBatch => ({
    playerId,
    events,
    batchId: options?.batchId || `batch_${Date.now()}`,
    timestamp: new Date(),
    atomic: options?.atomic || false,
    ordered: options?.ordered || true
  })
};

/**
 * 🔧 Constantes d'événements
 */
export const QuestEventConstants = {
  // Priorités
  PRIORITY: {
    LOW: 1,
    NORMAL: 5,
    HIGH: 8,
    CRITICAL: 10
  },
  
  // Timeouts
  TIMEOUT: {
    DEFAULT: 5000,
    BATCH: 30000,
    VALIDATION: 2000
  },
  
  // Limites
  LIMITS: {
    MAX_BATCH_SIZE: 100,
    MAX_RETRY_ATTEMPTS: 3,
    MAX_LISTENERS_PER_EVENT: 50
  }
} as const;
