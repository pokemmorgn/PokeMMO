// src/quest/core/types/ClientTypes.ts
// Types pour les notifications et messages client du système de quêtes

import { QuestNotificationType, QuestNotificationAction } from './EventTypes';
import { QuestReward, QuestObjective, Quest, QuestStatus } from './QuestTypes';

// ===== MESSAGES CLIENT AUTOMATIQUES =====

/**
 * 📡 Types de messages automatiques envoyés au client
 */
export type QuestClientMessageType =
  // Messages de base du système
  | 'quest_started'           // Quête démarrée
  | 'quest_progress'          // Progression d'objectif
  | 'quest_completed'         // Quête terminée
  | 'objective_completed'     // Objectif spécifique terminé
  | 'step_completed'          // Étape terminée
  | 'quest_failed'            // Quête échouée
  | 'quest_abandoned'         // Quête abandonnée
  | 'quest_updated'           // Mise à jour générale
  
  // Messages de récompenses
  | 'reward_received'         // Récompense reçue
  | 'bonus_reward'            // Récompense bonus
  | 'achievement_unlocked'    // Achievement débloqué
  
  // Messages d'état
  | 'quest_available'         // Nouvelle quête disponible
  | 'quest_reminder'          // Rappel de quête active
  | 'quest_deadline'          // Avertissement deadline
  | 'quest_locked'            // Quête verrouillée
  | 'quest_unlocked'          // Quête déverrouillée
  
  // Messages système
  | 'system_notification'     // Notification système
  | 'error_message'           // Message d'erreur
  | 'maintenance_notice';     // Avis de maintenance

/**
 * 📡 Message client de base
 */
export interface QuestClientMessage {
  type: QuestClientMessageType;
  timestamp: Date;
  playerId: string;
  
  // Contenu principal
  title: string;
  message: string;
  description?: string;
  
  // Données liées à la quête
  questId?: string;
  questName?: string;
  stepId?: string;
  objectiveId?: string;
  
  // Configuration d'affichage
  display: QuestClientDisplay;
  
  // Actions possibles
  actions?: QuestClientAction[];
  
  // Données additionnelles
  data?: QuestClientMessageData;
}

/**
 * 📡 Configuration d'affichage des messages
 */
export interface QuestClientDisplay {
  // Type d'affichage
  type: 'toast' | 'modal' | 'banner' | 'popup' | 'overlay' | 'sidebar' | 'chat';
  
  // Apparence
  theme?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'achievement';
  icon?: string;
  color?: string;
  backgroundColor?: string;
  
  // Comportement
  duration?: number; // Durée d'affichage en ms (0 = permanent)
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  persistent?: boolean; // Survivre aux changements de page
  closable?: boolean;
  
  // Position (pour toasts/popups)
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  
  // Animation
  animation?: {
    enter?: string;
    exit?: string;
    duration?: number;
  };
  
  // Son
  sound?: {
    file?: string;
    volume?: number;
    enabled?: boolean;
  };
}

/**
 * 📡 Action client disponible
 */
export interface QuestClientAction {
  id: string;
  label: string;
  type: 'button' | 'link' | 'command' | 'quest_action';
  
  // Action à exécuter
  action: string;
  params?: Record<string, any>;
  
  // Apparence
  style?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'link';
  icon?: string;
  
  // Comportement
  closeOnClick?: boolean;
  confirmText?: string;
  cooldown?: number; // en ms
  
  // Conditions
  enabled?: boolean;
  visible?: boolean;
  tooltip?: string;
}

/**
 * 📡 Données additionnelles du message
 */
export interface QuestClientMessageData {
  // Progression
  progress?: {
    current: number;
    total: number;
    percentage: number;
    previousValue?: number;
  };
  
  // Récompenses
  rewards?: QuestClientReward[];
  
  // Informations de quête
  questInfo?: {
    category: string;
    difficulty: string;
    estimatedTime?: number;
    isRepeatable: boolean;
    status: QuestStatus;
  };
  
  // Contexte additionnel
  context?: {
    location?: string;
    npcName?: string;
    itemName?: string;
    pokemonName?: string;
    battleResult?: string;
  };
  
  // Métadonnées techniques
  meta?: {
    messageId: string;
    source: string;
    version: string;
    debugInfo?: any;
  };
}

/**
 * 📡 Récompense formatée pour le client
 */
export interface QuestClientReward {
  type: string;
  name: string;
  description?: string;
  amount?: number;
  
  // Affichage
  icon?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  color?: string;
  
  // Métadonnées
  isNew?: boolean;
  isBonusReward?: boolean;
  source?: string;
}

// ===== MESSAGES SPÉCIALISÉS =====

/**
 * 🎉 Message de démarrage de quête
 */
export interface QuestStartedMessage extends QuestClientMessage {
  type: 'quest_started';
  data: QuestClientMessageData & {
    questInfo: Required<QuestClientMessageData['questInfo']>;
    firstObjectives: QuestClientObjective[];
    estimatedRewards?: QuestClientReward[];
  };
}

/**
 * 📈 Message de progression
 */
export interface QuestProgressMessage extends QuestClientMessage {
  type: 'quest_progress';
  data: QuestClientMessageData & {
    progress: Required<QuestClientMessageData['progress']>;
    updatedObjective: QuestClientObjective;
    allObjectives?: QuestClientObjective[];
  };
}

/**
 * 🏆 Message de completion
 */
export interface QuestCompletedMessage extends QuestClientMessage {
  type: 'quest_completed';
  data: QuestClientMessageData & {
    rewards: QuestClientReward[];
    questInfo: Required<QuestClientMessageData['questInfo']>;
    completionStats: {
      totalTime: number;
      stepsCompleted: number;
      objectivesCompleted: number;
      score?: number;
      rating?: number;
    };
  };
}

/**
 * 🎯 Objectif formaté pour le client
 */
export interface QuestClientObjective {
  id: string;
  name: string;
  description: string;
  type: string;
  
  // Progression
  current: number;
  required: number;
  completed: boolean;
  
  // Affichage
  icon?: string;
  color?: string;
  priority?: number;
  
  // État
  isNew?: boolean;
  justCompleted?: boolean;
  isOptional?: boolean;
  isHidden?: boolean;
}

// ===== CONFIGURATION DES NOTIFICATIONS =====

/**
 * ⚙️ Configuration des notifications par joueur
 */
export interface QuestNotificationConfig {
  playerId: string;
  
  // Notifications activées par type
  enabledTypes: Partial<Record<QuestClientMessageType, boolean>>;
  
  // Configuration globale
  globalSettings: {
    enabled: boolean;
    volume: number;
    showToasts: boolean;
    showPopups: boolean;
    showChat: boolean;
    showBanners: boolean;
  };
  
  // Configuration par type d'affichage
  displaySettings: {
    toast: QuestNotificationDisplaySettings;
    modal: QuestNotificationDisplaySettings;
    banner: QuestNotificationDisplaySettings;
    popup: QuestNotificationDisplaySettings;
  };
  
  // Filtres avancés
  filters: {
    questCategories?: string[]; // Catégories de quêtes à notifier
    minimumRewardValue?: number; // Valeur min des récompenses
    difficultiesOnly?: string[]; // Difficultés spécifiques
    priorityThreshold?: 'low' | 'normal' | 'high' | 'urgent';
  };
  
  // Planification
  schedule?: {
    quietHours?: Array<{ start: string; end: string }>; // Format HH:MM
    maxNotificationsPerHour?: number;
    batchSimilarNotifications?: boolean;
  };
}

/**
 * ⚙️ Configuration d'affichage par type
 */
export interface QuestNotificationDisplaySettings {
  enabled: boolean;
  duration: number;
  maxConcurrent: number;
  position?: string;
  theme?: string;
  
  // Son
  soundEnabled: boolean;
  soundVolume: number;
  customSounds?: Record<QuestClientMessageType, string>;
  
  // Animation
  animationsEnabled: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
}

// ===== TYPES POUR UI COMPONENTS =====

/**
 * 🎨 Propriétés pour composant UI de quête
 */
export interface QuestUIComponentProps {
  // Données de la quête
  quest: Quest;
  
  // État d'affichage
  expanded?: boolean;
  highlighted?: boolean;
  compact?: boolean;
  
  // Callbacks
  onStart?: (questId: string) => void;
  onComplete?: (questId: string) => void;
  onAbandon?: (questId: string) => void;
  onExpand?: (questId: string) => void;
  
  // Configuration
  showRewards?: boolean;
  showProgress?: boolean;
  showDescription?: boolean;
  showEstimatedTime?: boolean;
  
  // Style
  theme?: 'light' | 'dark' | 'auto';
  size?: 'small' | 'medium' | 'large';
  variant?: 'card' | 'list' | 'compact' | 'detailed';
}

/**
 * 🎨 État d'une notification dans l'UI
 */
export interface QuestNotificationUIState {
  id: string;
  message: QuestClientMessage;
  
  // État d'affichage
  visible: boolean;
  rendered: boolean;
  animating: boolean;
  
  // Timing
  createdAt: Date;
  shownAt?: Date;
  hideAt?: Date;
  
  // Interaction
  clicked: boolean;
  dismissed: boolean;
  actionsTaken: string[];
  
  // Position dans la queue
  queuePosition?: number;
  priority: number;
}

/**
 * 🎨 Gestionnaire de queue de notifications
 */
export interface QuestNotificationQueue {
  // Queue principale
  pending: QuestNotificationUIState[];
  visible: QuestNotificationUIState[];
  history: QuestNotificationUIState[];
  
  // Configuration
  maxVisible: number;
  maxHistory: number;
  
  // Méthodes
  add: (message: QuestClientMessage) => void;
  remove: (id: string) => void;
  clear: () => void;
  show: (id: string) => void;
  hide: (id: string) => void;
  
  // État
  isPaused: boolean;
  totalShown: number;
  totalDismissed: number;
}

// ===== TYPES POUR INTÉGRATION SERVICEREGISTRY =====

/**
 * 🔗 Interface pour ServiceRegistry
 */
export interface QuestClientNotifier {
  // Méthodes principales
  notify(playerId: string, message: QuestClientMessage): Promise<boolean>;
  notifyBatch(messages: QuestClientMessage[]): Promise<QuestBatchNotificationResult>;
  
  // Configuration
  updatePlayerConfig(playerId: string, config: Partial<QuestNotificationConfig>): Promise<boolean>;
  getPlayerConfig(playerId: string): Promise<QuestNotificationConfig | null>;
  
  // État
  isPlayerOnline(playerId: string): boolean;
  getOnlinePlayers(): string[];
  
  // Historique
  getNotificationHistory(playerId: string, limit?: number): Promise<QuestClientMessage[]>;
  clearNotificationHistory(playerId: string): Promise<boolean>;
}

/**
 * 🔗 Résultat de notification batch
 */
export interface QuestBatchNotificationResult {
  success: boolean;
  totalMessages: number;
  delivered: number;
  failed: number;
  offlinePlayers: string[];
  errors: Array<{
    playerId: string;
    messageId: string;
    error: string;
  }>;
  processingTime: number;
}

/**
 * 🔗 Statistiques de notifications
 */
export interface QuestNotificationStats {
  // Volume
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  
  // Par type
  byType: Record<QuestClientMessageType, {
    sent: number;
    delivered: number;
    failed: number;
    averageDeliveryTime: number;
  }>;
  
  // Par joueur (top 10)
  topRecipients: Array<{
    playerId: string;
    received: number;
    dismissed: number;
    actionsPerformed: number;
  }>;
  
  // Performance
  averageDeliveryTime: number;
  peakDeliveryTime: number;
  deliveryRate: number;
  
  // Période
  startTime: Date;
  endTime: Date;
  duration: number; // en secondes
}

// ===== FACTORY ET UTILITAIRES =====

/**
 * 🏭 Factory pour créer des messages client
 */
export const QuestClientMessageFactory = {
  /**
   * Créer un message de démarrage de quête
   */
  createQuestStarted: (
    playerId: string,
    quest: Quest,
    firstObjectives: QuestObjective[]
  ): QuestStartedMessage => ({
    type: 'quest_started',
    timestamp: new Date(),
    playerId,
    title: 'Nouvelle Quête !',
    message: `Vous avez commencé "${quest.name}"`,
    questId: quest.id,
    questName: quest.name,
    display: {
      type: 'toast',
      theme: 'success',
      duration: 5000,
      priority: 'normal',
      icon: '🎯',
      sound: { enabled: true, file: 'quest_start.mp3' }
    },
    actions: [
      {
        id: 'view_quest',
        label: 'Voir les détails',
        type: 'quest_action',
        action: 'open_quest_log',
        params: { questId: quest.id },
        style: 'primary'
      }
    ],
    data: {
      questInfo: {
        category: quest.category,
        difficulty: quest.metadata?.difficulty || 'medium',
        estimatedTime: quest.metadata?.estimatedTime,
        isRepeatable: quest.isRepeatable,
        status: quest.status
      },
      firstObjectives: firstObjectives.map(obj => ({
        id: obj.id,
        name: obj.targetName || obj.description,
        description: obj.description,
        type: obj.type,
        current: obj.currentAmount,
        required: obj.requiredAmount,
        completed: obj.completed,
        isNew: true
      }))
    }
  }),
  
  /**
   * Créer un message de progression
   */
  createQuestProgress: (
    playerId: string,
    quest: Quest,
    objective: QuestObjective,
    previousAmount: number
  ): QuestProgressMessage => ({
    type: 'quest_progress',
    timestamp: new Date(),
    playerId,
    title: 'Progression de Quête',
    message: `${objective.description}: ${objective.currentAmount}/${objective.requiredAmount}`,
    questId: quest.id,
    questName: quest.name,
    objectiveId: objective.id,
    display: {
      type: 'toast',
      theme: 'info',
      duration: 3000,
      priority: 'normal',
      icon: '📈',
      position: 'top-right'
    },
    data: {
      progress: {
        current: objective.currentAmount,
        total: objective.requiredAmount,
        percentage: Math.round((objective.currentAmount / objective.requiredAmount) * 100),
        previousValue: previousAmount
      },
      updatedObjective: {
        id: objective.id,
        name: objective.targetName || objective.description,
        description: objective.description,
        type: objective.type,
        current: objective.currentAmount,
        required: objective.requiredAmount,
        completed: objective.completed
      }
    }
  }),
  
  /**
   * Créer un message de completion
   */
  createQuestCompleted: (
    playerId: string,
    quest: Quest,
    rewards: QuestReward[],
    stats: { totalTime: number; stepsCompleted: number; objectivesCompleted: number }
  ): QuestCompletedMessage => ({
    type: 'quest_completed',
    timestamp: new Date(),
    playerId,
    title: 'Quête Terminée !',
    message: `Félicitations ! Vous avez terminé "${quest.name}"`,
    questId: quest.id,
    questName: quest.name,
    display: {
      type: 'modal',
      theme: 'achievement',
      duration: 0, // Permanent jusqu'à fermeture manuelle
      priority: 'high',
      icon: '🏆',
      persistent: true,
      animation: {
        enter: 'fadeInScale',
        exit: 'fadeOutScale',
        duration: 500
      },
      sound: { enabled: true, file: 'quest_complete.mp3', volume: 0.8 }
    },
    actions: [
      {
        id: 'claim_rewards',
        label: 'Récupérer les Récompenses',
        type: 'quest_action',
        action: 'claim_quest_rewards',
        params: { questId: quest.id },
        style: 'success',
        icon: '🎁'
      },
      {
        id: 'view_achievements',
        label: 'Voir les Succès',
        type: 'link',
        action: 'open_achievements',
        style: 'secondary'
      }
    ],
    data: {
      rewards: rewards.map(reward => ({
        type: reward.type,
        name: reward.itemId || `${reward.amount} ${reward.type}`,
        amount: reward.amount,
        icon: getRewardIcon(reward.type),
        rarity: reward.rarity || 'common'
      })),
      questInfo: {
        category: quest.category,
        difficulty: quest.metadata?.difficulty || 'medium',
        estimatedTime: quest.metadata?.estimatedTime,
        isRepeatable: quest.isRepeatable,
        status: quest.status
      },
      completionStats: stats
    }
  })
};

/**
 * 🎨 Utilitaire pour obtenir l'icône d'une récompense
 */
function getRewardIcon(rewardType: string): string {
  const icons: Record<string, string> = {
    'gold': '💰',
    'item': '📦',
    'pokemon': '⚡',
    'experience': '⭐',
    'badge': '🏅',
    'title': '👑',
    'access': '🔑',
    'recipe': '📜',
    'move': '💢',
    'unlock': '🔓',
    'boost': '⚡',
    'cosmetic': '✨'
  };
  return icons[rewardType] || '🎁';
}

/**
 * 🔧 Constantes pour notifications client
 */
export const QuestClientConstants = {
  // Durées par défaut (en ms)
  DURATION: {
    TOAST: 4000,
    BANNER: 6000,
    POPUP: 8000,
    MODAL: 0, // Permanent
  },
  
  // Limites
  LIMITS: {
    MAX_VISIBLE_NOTIFICATIONS: 5,
    MAX_HISTORY_SIZE: 100,
    MAX_BATCH_SIZE: 20,
    MAX_NOTIFICATIONS_PER_HOUR: 60
  },
  
  // Thèmes par défaut
  THEMES: {
    DEFAULT: 'default',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    ACHIEVEMENT: 'achievement',
    INFO: 'info'
  }
} as const;
