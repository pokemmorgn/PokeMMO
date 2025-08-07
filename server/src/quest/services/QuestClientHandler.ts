// server/src/quest/services/QuestClientHandler.ts
import { 
  QuestDefinition,
  Quest,
  QuestObjective,
  QuestReward
} from "../core/types/QuestTypes";

import {
  QuestClientMessage,
  QuestClientMessageType,
  QuestStartedMessage,
  QuestProgressMessage,
  QuestCompletedMessage,
  QuestClientMessageFactory,
  QuestNotificationConfig,
  QuestClientNotifier,
  QuestBatchNotificationResult,
  QuestNotificationStats,
  QuestClientConstants
} from "../core/types/ClientTypes";

import { ServiceRegistry } from "../../services/ServiceRegistry";

export interface IQuestClientHandler {
  notifyQuestStarted(playerId: string, quest: Quest, firstObjectives: QuestObjective[]): Promise<boolean>;
  notifyQuestProgress(playerId: string, quest: Quest, objective: QuestObjective, previousAmount: number): Promise<boolean>;
  notifyQuestCompleted(playerId: string, quest: Quest, rewards: QuestReward[], stats: QuestCompletionStats): Promise<boolean>;
  notifyQuestFailed(playerId: string, quest: Quest, reason: string): Promise<boolean>;
  notifyQuestAbandoned(playerId: string, quest: Quest): Promise<boolean>;
  notifyObjectiveCompleted(playerId: string, quest: Quest, objective: QuestObjective): Promise<boolean>;
  notifyStepCompleted(playerId: string, quest: Quest, stepName: string, nextStepName?: string): Promise<boolean>;
  notifyRewardReceived(playerId: string, rewards: QuestReward[], source: string): Promise<boolean>;
  notifyQuestAvailable(playerId: string, quest: QuestDefinition): Promise<boolean>;
  notifyQuestReminder(playerId: string, activeQuests: Quest[]): Promise<boolean>;
  notifySystemMessage(playerId: string, message: string, type?: 'info' | 'warning' | 'error'): Promise<boolean>;
  sendBatchNotifications(messages: QuestClientMessage[]): Promise<QuestBatchNotificationResult>;
  updatePlayerNotificationConfig(playerId: string, config: Partial<QuestNotificationConfig>): Promise<boolean>;
  getPlayerNotificationConfig(playerId: string): Promise<QuestNotificationConfig | null>;
  isPlayerOnline(playerId: string): boolean;
  getNotificationHistory(playerId: string, limit?: number): Promise<QuestClientMessage[]>;
  getNotificationStats(): Promise<QuestNotificationStats>;
}

export interface QuestCompletionStats {
  totalTime: number;
  stepsCompleted: number;
  objectivesCompleted: number;
  score?: number;
  rating?: number;
  deaths?: number;
  hints?: number;
  perfectRun?: boolean;
}

export interface QueuedMessage {
  id: string;
  message: QuestClientMessage;
  priority: number;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date;
}

export interface PlayerNotificationState {
  playerId: string;
  config: QuestNotificationConfig;
  messageHistory: QuestClientMessage[];
  lastActivity: Date;
  totalMessagesSent: number;
  totalMessagesDelivered: number;
  preferences: {
    language: string;
    timezone: string;
    quietHours: Array<{ start: string; end: string }>;
  };
}

export interface QuestClientHandlerConfig {
  enableNotifications: boolean;
  defaultMessageDuration: number;
  maxMessageHistory: number;
  enableMessageQueue: boolean;
  maxQueueSize: number;
  batchSize: number;
  batchInterval: number;
  enableRetry: boolean;
  maxRetryAttempts: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  enableRateLimiting: boolean;
  maxMessagesPerMinute: number;
  enableMessageBatching: boolean;
  serviceRegistryTimeout: number;
  fallbackOnFailure: boolean;
  enablePersonalization: boolean;
  enableContextualMessages: boolean;
  enableSmartNotifications: boolean;
  enableMessageLogging: boolean;
  logFailedDeliveries: boolean;
  logPerformanceMetrics: boolean;
  enableSpamProtection: boolean;
  duplicateMessageThreshold: number;
  enableContentFiltering: boolean;
}

class QuestClientHandler implements IQuestClientHandler, QuestClientNotifier {
  private config: QuestClientHandlerConfig;
  private serviceRegistry: ServiceRegistry;
  private messageQueue: Map<string, QueuedMessage[]>;
  private playerStates: Map<string, PlayerNotificationState>;
  private messageHistory: Map<string, QuestClientMessage[]>;
  private deliveryStats: QuestNotificationStats;
  private batchTimer: NodeJS.Timeout | null = null;
  
  constructor(config?: Partial<QuestClientHandlerConfig>) {
    this.config = {
      enableNotifications: true,
      defaultMessageDuration: QuestClientConstants.DURATION.TOAST,
      maxMessageHistory: QuestClientConstants.LIMITS.MAX_HISTORY_SIZE,
      enableMessageQueue: false,
      maxQueueSize: 100,
      batchSize: QuestClientConstants.LIMITS.MAX_BATCH_SIZE,
      batchInterval: 1000,
      enableRetry: true,
      maxRetryAttempts: 3,
      retryDelay: 2000,
      exponentialBackoff: true,
      enableRateLimiting: true,
      maxMessagesPerMinute: QuestClientConstants.LIMITS.MAX_NOTIFICATIONS_PER_HOUR / 60,
      enableMessageBatching: true,
      serviceRegistryTimeout: 5000,
      fallbackOnFailure: false,
      enablePersonalization: true,
      enableContextualMessages: true,
      enableSmartNotifications: false,
      enableMessageLogging: process.env.NODE_ENV === 'development',
      logFailedDeliveries: true,
      logPerformanceMetrics: false,
      enableSpamProtection: true,
      duplicateMessageThreshold: 30,
      enableContentFiltering: false,
      ...config
    };
    
    this.serviceRegistry = ServiceRegistry.getInstance();
    this.messageQueue = new Map();
    this.playerStates = new Map();
    this.messageHistory = new Map();
    this.deliveryStats = this.initializeStats();
    
    if (this.config.enableMessageBatching) {
      this.startBatchProcessing();
    }
    
    this.log('info', '📡 QuestClientHandler initialisé');
  }

  async notifyQuestStarted(playerId: string, quest: Quest, firstObjectives: QuestObjective[]): Promise<boolean> {
    try {
      const message = QuestClientMessageFactory.createQuestStarted(playerId, quest, firstObjectives);
      
      if (this.config.enablePersonalization) {
        await this.personalizeMessage(playerId, message);
      }
      
      return await this.sendMessage(playerId, message);
      
    } catch (error) {
      this.log('error', `Erreur notification quest started:`, error);
      return false;
    }
  }

  async notifyQuestProgress(
    playerId: string, 
    quest: Quest, 
    objective: QuestObjective, 
    previousAmount: number
  ): Promise<boolean> {
    
    this.log('debug', `📈 Notification progression: ${objective.description} pour ${playerId}`);

    try {
      const message = QuestClientMessageFactory.createQuestProgress(playerId, quest, objective, previousAmount);
      
      const playerState = this.getPlayerState(playerId);
      if (playerState?.config.enabledTypes.quest_progress === false) {
        return true;
      }
      
      const success = await this.sendMessage(playerId, message);
      
      if (success) {
        // ✅ CORRECTION : Refresh à la fois les NPCs ET le quest tracker
        this.refreshPlayerQuestUI(playerId, quest.id);
        
        // ✅ NOUVEAU : Refresh séparé du tracker pour être sûr
        setTimeout(() => {
          this.refreshQuestTracker(playerId);
        }, 100);
      }
      
      return success;
      
    } catch (error) {
      this.log('error', `Erreur notification progress:`, error);
      return false;
    }
  }

  async notifyQuestCompleted(
    playerId: string, 
    quest: Quest, 
    rewards: QuestReward[], 
    stats: QuestCompletionStats
  ): Promise<boolean> {
    
    try {
      const message = QuestClientMessageFactory.createQuestCompleted(playerId, quest, rewards, stats);
      
      message.display.priority = 'high';
      message.display.persistent = true;
      
      const success = await this.sendMessage(playerId, message);
      
      if (success) {
        this.refreshPlayerQuestUI(playerId, quest.id);
        
        // ✅ NOUVEAU : Refresh tracker après completion
        setTimeout(() => {
          this.refreshQuestTracker(playerId);
        }, 200);
      }
      
      return success;
      
    } catch (error) {
      this.log('error', `Erreur notification quest completed:`, error);
      return false;
    }
  }

  async notifyQuestFailed(playerId: string, quest: Quest, reason: string): Promise<boolean> {
    const message: QuestClientMessage = {
      type: 'quest_failed',
      timestamp: new Date(),
      playerId,
      title: 'Quête Échouée',
      message: `La quête "${quest.name}" a échoué`,
      description: reason,
      questId: quest.id,
      questName: quest.name,
      display: {
        type: 'banner',
        theme: 'error',
        duration: 8000,
        priority: 'high',
        icon: '❌',
        persistent: false
      },
      actions: [
        {
          id: 'retry_quest',
          label: 'Réessayer',
          type: 'quest_action',
          action: 'restart_quest',
          params: { questId: quest.id },
          style: 'primary'
        },
        {
          id: 'view_help',
          label: 'Aide',
          type: 'link',
          action: 'open_quest_help',
          style: 'secondary'
        }
      ]
    };

    const success = await this.sendMessage(playerId, message);
    
    if (success) {
      this.refreshPlayerQuestUI(playerId, quest.id);
      
      setTimeout(() => {
        this.refreshQuestTracker(playerId);
      }, 200);
    }
    
    return success;
  }

  async notifyQuestAbandoned(playerId: string, quest: Quest): Promise<boolean> {
    const message: QuestClientMessage = {
      type: 'quest_abandoned',
      timestamp: new Date(),
      playerId,
      title: 'Quête Abandonnée',
      message: `Vous avez abandonné "${quest.name}"`,
      questId: quest.id,
      questName: quest.name,
      display: {
        type: 'toast',
        theme: 'warning',
        duration: 5000,
        priority: 'normal',
        icon: '🚪'
      },
      actions: [
        {
          id: 'restart_quest',
          label: 'Recommencer',
          type: 'quest_action',
          action: 'start_quest',
          params: { questId: quest.id },
          style: 'secondary'
        }
      ]
    };

    const success = await this.sendMessage(playerId, message);
    
    if (success) {
      this.refreshPlayerQuestUI(playerId, quest.id);
      
      setTimeout(() => {
        this.refreshQuestTracker(playerId);
      }, 200);
    }
    
    return success;
  }

  async notifyObjectiveCompleted(playerId: string, quest: Quest, objective: QuestObjective): Promise<boolean> {
    this.log('debug', `🎯 Notification objectif complété: ${objective.description}`);

    const message: QuestClientMessage = {
      type: 'objective_completed',
      timestamp: new Date(),
      playerId,
      title: 'Objectif Terminé !',
      message: objective.description,
      questId: quest.id,
      questName: quest.name,
      objectiveId: objective.id,
      display: {
        type: 'toast',
        theme: 'success',
        duration: 4000,
        priority: 'normal',
        icon: '✅',
        animation: {
          enter: 'slideInRight',
          exit: 'fadeOut',
          duration: 300
        },
        sound: { enabled: true, file: 'objective_complete.mp3' }
      }
    };

    const success = await this.sendMessage(playerId, message);
    
    if (success) {
      // ✅ CORRECTION : Refresh complet après objectif complété
      this.refreshPlayerQuestUI(playerId, quest.id);
      
      // ✅ NOUVEAU : Double refresh pour être sûr que le tracker se met à jour
      setTimeout(() => {
        this.refreshQuestTracker(playerId);
      }, 300);
    }
    
    return success;
  }

  async notifyStepCompleted(playerId: string, quest: Quest, stepName: string, nextStepName?: string): Promise<boolean> {
    const message: QuestClientMessage = {
      type: 'step_completed',
      timestamp: new Date(),
      playerId,
      title: 'Étape Terminée !',
      message: `"${stepName}" terminée`,
      description: nextStepName ? `Prochaine étape: ${nextStepName}` : 'Quête presque terminée !',
      questId: quest.id,
      questName: quest.name,
      stepId: stepName,
      display: {
        type: 'banner',
        theme: 'success',
        duration: 6000,
        priority: 'high',
        icon: '📋',
        persistent: false
      },
      actions: nextStepName ? [
        {
          id: 'view_next_step',
          label: 'Voir la suite',
          type: 'quest_action',
          action: 'focus_quest',
          params: { questId: quest.id },
          style: 'primary'
        }
      ] : undefined
    };

    const success = await this.sendMessage(playerId, message);
    
    if (success) {
      this.refreshPlayerQuestUI(playerId, quest.id);
      
      setTimeout(() => {
        this.refreshQuestTracker(playerId);
      }, 300);
    }
    
    return success;
  }

  async notifyRewardReceived(playerId: string, rewards: QuestReward[], source: string): Promise<boolean> {
    if (rewards.length === 0) return true;

    const title = rewards.length === 1 ? 'Récompense Reçue !' : 'Récompenses Reçues !';
    const rewardText = rewards.length === 1 
      ? this.formatSingleReward(rewards[0])
      : `${rewards.length} récompenses`;

    const message: QuestClientMessage = {
      type: 'reward_received',
      timestamp: new Date(),
      playerId,
      title,
      message: rewardText,
      description: `Source: ${source}`,
      display: {
        type: 'modal',
        theme: 'achievement',
        duration: 0,
        priority: 'high',
        icon: '🎁',
        persistent: true,
        animation: {
          enter: 'bounceIn',
          exit: 'fadeOut',
          duration: 500
        },
        sound: { enabled: true, file: 'reward_received.mp3', volume: 0.7 }
      },
      actions: [
        {
          id: 'claim_rewards',
          label: 'Récupérer',
          type: 'quest_action',
          action: 'claim_rewards',
          style: 'success',
          icon: '🎁'
        },
        {
          id: 'view_inventory',
          label: 'Inventaire',
          type: 'link',
          action: 'open_inventory',
          style: 'secondary'
        }
      ],
      data: {
        rewards: rewards.map(reward => ({
          type: reward.type,
          name: this.formatRewardName(reward),
          amount: reward.amount,
          icon: this.getRewardIcon(reward.type),
          rarity: reward.rarity || 'common'
        }))
      }
    };

    return await this.sendMessage(playerId, message);
  }

  async notifyQuestAvailable(playerId: string, quest: QuestDefinition): Promise<boolean> {
    const message: QuestClientMessage = {
      type: 'quest_available',
      timestamp: new Date(),
      playerId,
      title: 'Nouvelle Quête !',
      message: `"${quest.name}" est maintenant disponible`,
      description: quest.description,
      questId: quest.id,
      questName: quest.name,
      display: {
        type: 'sidebar',
        theme: 'info',
        duration: 10000,
        priority: 'normal',
        icon: '📋',
        closable: true
      },
      actions: [
        {
          id: 'start_quest',
          label: 'Commencer',
          type: 'quest_action',
          action: 'start_quest',
          params: { questId: quest.id },
          style: 'primary'
        },
        {
          id: 'view_details',
          label: 'Détails',
          type: 'quest_action',
          action: 'view_quest_details',
          params: { questId: quest.id },
          style: 'secondary'
        }
      ]
    };

    return await this.sendMessage(playerId, message);
  }

  async notifyQuestReminder(playerId: string, activeQuests: Quest[]): Promise<boolean> {
    if (activeQuests.length === 0) return true;

    const questText = activeQuests.length === 1 
      ? `"${activeQuests[0].name}"`
      : `${activeQuests.length} quêtes actives`;

    const message: QuestClientMessage = {
      type: 'quest_reminder',
      timestamp: new Date(),
      playerId,
      title: 'Rappel de Quêtes',
      message: `N'oubliez pas: ${questText}`,
      description: 'Consultez votre journal de quêtes',
      display: {
        type: 'toast',
        theme: 'info',
        duration: 6000,
        priority: 'low',
        icon: '⏰'
      },
      actions: [
        {
          id: 'open_quest_log',
          label: 'Journal',
          type: 'link',
          action: 'open_quest_log',
          style: 'primary'
        }
      ]
    };

    return await this.sendMessage(playerId, message);
  }

  async notifySystemMessage(playerId: string, message: string, type: 'info' | 'warning' | 'error' = 'info'): Promise<boolean> {
    const themeMap = {
      info: 'info' as const,
      warning: 'warning' as const,
      error: 'error' as const
    };

    const iconMap = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌'
    };

    const clientMessage: QuestClientMessage = {
      type: 'system_notification',
      timestamp: new Date(),
      playerId,
      title: 'Message Système',
      message,
      display: {
        type: 'banner',
        theme: themeMap[type],
        duration: type === 'error' ? 0 : 5000,
        priority: type === 'error' ? 'urgent' : 'normal',
        icon: iconMap[type],
        persistent: type === 'error'
      }
    };

    return await this.sendMessage(playerId, clientMessage);
  }

  private async sendMessage(playerId: string, message: QuestClientMessage): Promise<boolean> {
    try {
      if (this.config.enableSpamProtection && this.isDuplicateMessage(playerId, message)) {
        return true;
      }

      if (this.config.enableRateLimiting && this.isRateLimited(playerId)) {
        return false;
      }

      if (this.config.enableMessageQueue) {
        return this.queueMessage(playerId, message);
      } else {
        return await this.deliverMessage(playerId, message);
      }

    } catch (error) {
      this.log('error', `Erreur envoi message:`, error);
      return false;
    }
  }

  private async deliverMessage(playerId: string, message: QuestClientMessage): Promise<boolean> {
    const startTime = Date.now();

    try {
      const success = this.serviceRegistry.notifyPlayer(playerId, "questNotification", message);
      const deliveryTime = Date.now() - startTime;
      
      if (success) {
        this.recordSuccessfulDelivery(playerId, message, deliveryTime);
        this.addToHistory(playerId, message);
        this.log('debug', `✅ Message livré à ${playerId} en ${deliveryTime}ms`);
      } else {
        this.recordFailedDelivery(playerId, message, 'ServiceRegistry failed');
      }

      return success;

    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      this.recordFailedDelivery(playerId, message, error instanceof Error ? error.message : 'Unknown error');
      this.log('error', `Erreur livraison message:`, error);
      return false;
    }
  }

// ✅ SOLUTION : Attendre que la DB soit mise à jour AVANT de refresh les NPCs
private refreshPlayerQuestUI(playerId: string, questId?: string): void {
  try {
    console.log(`🔄 [QuestClientHandler] REFRESH COMPLET UI pour ${playerId}`);
    
    const worldRoom = this.serviceRegistry.getWorldRoom();
    if (!worldRoom) {
      console.error(`❌ [QuestClientHandler] WorldRoom non disponible`);
      return;
    }

    // ✅ SOLUTION : Délai plus long pour la persistance DB
    setTimeout(async () => {
      try {
        console.log(`🔄 [QuestClientHandler] Refresh statuts NPCs APRÈS persistance DB`);
        await worldRoom.updateQuestStatusesFixed(playerId);
        console.log(`✅ [QuestClientHandler] Statuts NPCs refreshés avec délai`);
      } catch (error) {
        console.error(`❌ [QuestClientHandler] Erreur refresh NPCs:`, error);
      }
    }, 1500); // ✅ AUGMENTÉ de 300ms à 1500ms

    // ✅ Quest tracker refresh aussi avec délai
    setTimeout(async () => {
      try {
        console.log(`🔄 [QuestClientHandler] Refresh quest tracker APRÈS persistance`);
        
        const questManager = worldRoom.getQuestManager();
        if (!questManager) {
          console.error(`❌ [QuestClientHandler] QuestManager non disponible`);
          return;
        }

        const activeQuests = await questManager.getActiveQuests(playerId);
        console.log(`📋 [QuestClientHandler] ${activeQuests.length} quêtes actives récupérées`);

        const success = this.serviceRegistry.notifyPlayer(playerId, "activeQuestsList", {
          quests: activeQuests,
          source: "questProgressRefresh",
          timestamp: Date.now()
        });

        if (success) {
          console.log(`✅ [QuestClientHandler] Quest tracker refreshé avec délai`);
        }

      } catch (error) {
        console.error(`❌ [QuestClientHandler] Erreur refresh quest tracker:`, error);
      }
    }, 2000); // ✅ ENCORE PLUS DE DÉLAI

  } catch (error) {
    console.error(`❌ [QuestClientHandler] Erreur dans refreshPlayerQuestUI:`, error);
  }
}

  // ✅ NOUVELLE MÉTHODE : Refresh séparé pour quest tracker uniquement
  private refreshQuestTracker(playerId: string): void {
    try {
      console.log(`🎯 [QuestClientHandler] Refresh quest tracker direct pour ${playerId}`);
      
      const worldRoom = this.serviceRegistry.getWorldRoom();
      if (!worldRoom) {
        console.error(`❌ [QuestClientHandler] WorldRoom non disponible`);
        return;
      }

      setTimeout(async () => {
        try {
          const questManager = worldRoom.getQuestManager();
          if (!questManager) {
            console.error(`❌ [QuestClientHandler] QuestManager non disponible`);
            return;
          }

          const activeQuests = await questManager.getActiveQuests(playerId);
          
          const success = this.serviceRegistry.notifyPlayer(playerId, "activeQuestsList", {
            quests: activeQuests,
            source: "trackerRefresh",
            forceUpdate: true,
            timestamp: Date.now()
          });

          if (success) {
            console.log(`✅ [QuestClientHandler] Quest tracker mis à jour directement`);
          }

        } catch (error) {
          console.error(`❌ [QuestClientHandler] Erreur refresh tracker direct:`, error);
        }
      }, 200);

    } catch (error) {
      console.error(`❌ [QuestClientHandler] Erreur refreshQuestTracker:`, error);
    }
  }

  private queueMessage(playerId: string, message: QuestClientMessage): boolean {
    const playerQueue = this.messageQueue.get(playerId) || [];
    
    if (playerQueue.length >= this.config.maxQueueSize) {
      return false;
    }

    const queuedMessage: QueuedMessage = {
      id: this.generateMessageId(),
      message,
      priority: this.calculateMessagePriority(message),
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: this.config.maxRetryAttempts
    };

    playerQueue.push(queuedMessage);
    playerQueue.sort((a, b) => b.priority - a.priority);
    
    this.messageQueue.set(playerId, playerQueue);
    
    this.log('debug', `📥 Message ajouté à la queue de ${playerId} (${playerQueue.length} messages)`);
    return true;
  }

  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, this.config.batchInterval);
  }

  private async processBatch(): Promise<void> {
    const allMessages: QuestClientMessage[] = [];

    for (const [playerId, playerQueue] of this.messageQueue.entries()) {
      const messagesToProcess = playerQueue.splice(0, this.config.batchSize);
      
      for (const queuedMessage of messagesToProcess) {
        queuedMessage.attempts++;
        allMessages.push(queuedMessage.message);
      }
    }

    if (allMessages.length === 0) return;

    this.log('debug', `📦 Traitement batch: ${allMessages.length} messages`);

    const result = await this.sendBatchNotifications(allMessages);
    
    if (result.failed > 0) {
      this.log('warn', `${result.failed} messages échoués dans le batch`);
    }
  }

  async sendBatchNotifications(messages: QuestClientMessage[]): Promise<QuestBatchNotificationResult> {
    const startTime = Date.now();
    
    const result: QuestBatchNotificationResult = {
      success: true,
      totalMessages: messages.length,
      delivered: 0,
      failed: 0,
      offlinePlayers: [],
      errors: [],
      processingTime: 0
    };

    for (const message of messages) {
      try {
        const delivered = await this.deliverMessage(message.playerId, message);
        
        if (delivered) {
          result.delivered++;
        } else {
          result.failed++;
          if (!this.isPlayerOnline(message.playerId)) {
            result.offlinePlayers.push(message.playerId);
          }
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          playerId: message.playerId,
          messageId: message.data?.meta?.messageId || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    result.success = result.failed === 0;
    result.processingTime = Date.now() - startTime;

    this.log('info', `📦 Batch traité: ${result.delivered}/${result.totalMessages} livrés en ${result.processingTime}ms`);

    return result;
  }

  async notify(playerId: string, message: QuestClientMessage): Promise<boolean> {
    return await this.sendMessage(playerId, message);
  }

  async notifyBatch(messages: QuestClientMessage[]): Promise<QuestBatchNotificationResult> {
    return await this.sendBatchNotifications(messages);
  }

  async updatePlayerConfig(playerId: string, config: Partial<QuestNotificationConfig>): Promise<boolean> {
    return await this.updatePlayerNotificationConfig(playerId, config);
  }

  async getPlayerConfig(playerId: string): Promise<QuestNotificationConfig | null> {
    return await this.getPlayerNotificationConfig(playerId);
  }

  async updatePlayerNotificationConfig(playerId: string, config: Partial<QuestNotificationConfig>): Promise<boolean> {
    try {
      const currentState = this.getPlayerState(playerId);
      
      if (currentState) {
        currentState.config = { ...currentState.config, ...config };
      } else {
        this.playerStates.set(playerId, {
          playerId,
          config: { ...this.getDefaultNotificationConfig(), ...config },
          messageHistory: [],
          lastActivity: new Date(),
          totalMessagesSent: 0,
          totalMessagesDelivered: 0,
          preferences: {
            language: 'fr',
            timezone: 'Europe/Paris',
            quietHours: []
          }
        });
      }

      return true;

    } catch (error) {
      this.log('error', `Erreur MAJ config notifications:`, error);
      return false;
    }
  }

  async getPlayerNotificationConfig(playerId: string): Promise<QuestNotificationConfig | null> {
    const state = this.getPlayerState(playerId);
    return state?.config || null;
  }

  isPlayerOnline(playerId: string): boolean {
    const worldRoom = this.serviceRegistry.getWorldRoom();
    if (!worldRoom) return false;

    try {
      for (const [sessionId, player] of worldRoom.state.players) {
        if (player.name === playerId) {
          return true;
        }
      }
    } catch (error) {
      // Silent fail
    }

    return false;
  }

  getOnlinePlayers(): string[] {
    const worldRoom = this.serviceRegistry.getWorldRoom();
    if (!worldRoom) return [];

    const players: string[] = [];
    try {
      for (const [sessionId, player] of worldRoom.state.players) {
        players.push(player.name);
      }
    } catch (error) {
      // Silent fail
    }

    return players;
  }

  async getNotificationHistory(playerId: string, limit: number = 50): Promise<QuestClientMessage[]> {
    const history = this.messageHistory.get(playerId) || [];
    return history.slice(-limit);
  }

  async clearNotificationHistory(playerId: string): Promise<boolean> {
    this.messageHistory.delete(playerId);
    const state = this.getPlayerState(playerId);
    if (state) {
      state.messageHistory = [];
    }
    return true;
  }

  async getNotificationStats(): Promise<QuestNotificationStats> {
    return this.deliveryStats;
  }

  private getPlayerState(playerId: string): PlayerNotificationState | undefined {
    return this.playerStates.get(playerId);
  }

  private getDefaultNotificationConfig(): QuestNotificationConfig {
    return {
      playerId: '',
      enabledTypes: {
        quest_started: true,
        quest_progress: true,
        quest_completed: true,
        objective_completed: true,
        step_completed: true,
        quest_failed: true,
        quest_abandoned: false,
        reward_received: true,
        quest_available: true,
        quest_reminder: false,
        system_notification: true,
        error_message: true
      },
      globalSettings: {
        enabled: true,
        volume: 0.8,
        showToasts: true,
        showPopups: true,
        showChat: false,
        showBanners: true
      },
      displaySettings: {
        toast: {
          enabled: true,
          duration: 4000,
          maxConcurrent: 3,
          position: 'top-right',
          theme: 'default',
          soundEnabled: true,
          soundVolume: 0.8,
          animationsEnabled: true,
          animationSpeed: 'normal'
        },
        modal: {
          enabled: true,
          duration: 0,
          maxConcurrent: 1,
          theme: 'default',
          soundEnabled: true,
          soundVolume: 0.8,
          animationsEnabled: true,
          animationSpeed: 'normal'
        },
        banner: {
          enabled: true,
          duration: 6000,
          maxConcurrent: 1,
          theme: 'default',
          soundEnabled: false,
          soundVolume: 0.5,
          animationsEnabled: true,
          animationSpeed: 'normal'
        },
        popup: {
          enabled: true,
          duration: 8000,
          maxConcurrent: 2,
          theme: 'default',
          soundEnabled: true,
          soundVolume: 0.6,
          animationsEnabled: true,
          animationSpeed: 'normal'
        }
      },
      filters: {
        priorityThreshold: 'normal'
      }
    };
  }

  private async personalizeMessage(playerId: string, message: QuestClientMessage): Promise<void> {
    const state = this.getPlayerState(playerId);
    if (!state) return;

    const config = state.config;
    const displayType = message.display.type;
    const supportedTypes: Array<keyof typeof config.displaySettings> = ['toast', 'modal', 'banner', 'popup'];
    
    if (supportedTypes.includes(displayType as any)) {
      const displayConfig = config.displaySettings[displayType as keyof typeof config.displaySettings];
      message.display.duration = displayConfig.duration;
      
      if (message.display.sound) {
        message.display.sound.enabled = displayConfig.soundEnabled;
        message.display.sound.volume = displayConfig.soundVolume;
      }
    }
  }

  private isDuplicateMessage(playerId: string, message: QuestClientMessage): boolean {
    const history = this.messageHistory.get(playerId) || [];
    const recentMessages = history.filter(
      m => Date.now() - m.timestamp.getTime() < (this.config.duplicateMessageThreshold * 1000)
    );

    return recentMessages.some(m => 
      m.type === message.type && 
      m.message === message.message &&
      m.questId === message.questId
    );
  }

  private isRateLimited(playerId: string): boolean {
    const state = this.getPlayerState(playerId);
    if (!state) return false;

    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentMessages = state.messageHistory.filter(
      m => m.timestamp.getTime() > oneMinuteAgo
    );

    return recentMessages.length >= this.config.maxMessagesPerMinute;
  }

  private calculateMessagePriority(message: QuestClientMessage): number {
    const priorityMap = {
      'low': 1,
      'normal': 5,
      'high': 8,
      'urgent': 10
    };

    let basePriority = priorityMap[message.display.priority || 'normal'];

    switch (message.type) {
      case 'quest_completed':
      case 'achievement_unlocked':
        basePriority += 3;
        break;
      case 'quest_failed':
      case 'error_message':
        basePriority += 2;
        break;
      case 'quest_progress':
        basePriority -= 1;
        break;
    }

    return basePriority;
  }

  private formatRewardName(reward: QuestReward): string {
    switch (reward.type) {
      case 'gold':
        return `${reward.amount} Or`;
      case 'item':
        return reward.itemId || 'Objet';
      case 'pokemon':
        return `Pokémon #${reward.pokemonId}`;
      case 'experience':
        return `${reward.amount} XP`;
      default:
        return reward.type;
    }
  }

  private formatSingleReward(reward: QuestReward): string {
    if (reward.amount && reward.amount > 1) {
      return `${reward.amount}x ${this.formatRewardName(reward)}`;
    }
    return this.formatRewardName(reward);
  }

  private getRewardIcon(type: string): string {
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
    return icons[type] || '🎁';
  }

  private addToHistory(playerId: string, message: QuestClientMessage): void {
    let history = this.messageHistory.get(playerId) || [];
    history.push(message);
    
    if (history.length > this.config.maxMessageHistory) {
      history = history.slice(-this.config.maxMessageHistory);
    }
    
    this.messageHistory.set(playerId, history);

    const state = this.getPlayerState(playerId);
    if (state) {
      state.messageHistory = history;
      state.lastActivity = new Date();
    }
  }

  private recordSuccessfulDelivery(playerId: string, message: QuestClientMessage, deliveryTime: number): void {
    this.deliveryStats.totalSent++;
    this.deliveryStats.totalDelivered++;
    
    if (!this.deliveryStats.byType[message.type]) {
      this.deliveryStats.byType[message.type] = {
        sent: 0,
        delivered: 0,
        failed: 0,
        averageDeliveryTime: 0
      };
    }
    
    const typeStats = this.deliveryStats.byType[message.type];
    typeStats.sent++;
    typeStats.delivered++;
    typeStats.averageDeliveryTime = (typeStats.averageDeliveryTime + deliveryTime) / 2;

    const state = this.getPlayerState(playerId);
    if (state) {
      state.totalMessagesSent++;
      state.totalMessagesDelivered++;
    }
  }

  private recordFailedDelivery(playerId: string, message: QuestClientMessage, error: string): void {
    this.deliveryStats.totalSent++;
    this.deliveryStats.totalFailed++;
    
    if (!this.deliveryStats.byType[message.type]) {
      this.deliveryStats.byType[message.type] = {
        sent: 0,
        delivered: 0,
        failed: 0,
        averageDeliveryTime: 0
      };
    }
    
    this.deliveryStats.byType[message.type].sent++;
    this.deliveryStats.byType[message.type].failed++;

    const state = this.getPlayerState(playerId);
    if (state) {
      state.totalMessagesSent++;
    }
  }

  private initializeStats(): QuestNotificationStats {
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      byType: {} as any,
      topRecipients: [],
      averageDeliveryTime: 0,
      peakDeliveryTime: 0,
      deliveryRate: 0,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0
    };
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.enableMessageLogging && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [QuestClientHandler] ${message}`;
    
    switch (level) {
      case 'debug':
        if (this.config.enableMessageLogging) {
          console.log(logMessage, data || '');
        }
        break;
      case 'info':
        console.log(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
    }
  }

  getDebugInfo(): any {
    return {
      config: this.config,
      playerStates: this.playerStates.size,
      queueSizes: Array.from(this.messageQueue.entries()).map(([playerId, queue]) => ({
        playerId,
        queueSize: queue.length
      })),
      version: '1.2.0', // ✅ Version mise à jour avec le fix tracker
      supportedMessageTypes: [
        'quest_started', 'quest_progress', 'quest_completed', 'quest_failed', 'quest_abandoned',
        'objective_completed', 'step_completed', 'reward_received', 'quest_available',
        'quest_reminder', 'system_notification', 'error_message'
      ],
      features: {
        notifications: this.config.enableNotifications,
        queue: this.config.enableMessageQueue,
        batch: this.config.enableMessageBatching,
        personalization: this.config.enablePersonalization,
        rateLimiting: this.config.enableRateLimiting,
        spamProtection: this.config.enableSpamProtection,
        autoUIRefresh: true,
        questTrackerRefresh: true // ✅ Nouveau feature flag
      },
      stats: this.deliveryStats
    };
  }

  updateConfig(newConfig: Partial<QuestClientHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('info', 'Configuration mise à jour');
  }

  cleanup(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    
    this.messageQueue.clear();
    this.playerStates.clear();
    this.messageHistory.clear();
    
    this.log('info', 'QuestClientHandler nettoyé');
  }
}

export default QuestClientHandler;
