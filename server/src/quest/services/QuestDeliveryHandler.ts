// server/src/quest/services/QuestDeliveryHandler.ts
// Service pour traiter les livraisons de quêtes confirmées par le joueur
// ✅ VERSION CORRIGÉE : Synchronisation améliorée + Invalidation cache

import { InventoryManager } from "../../managers/InventoryManager";

// ===== TYPES POUR LE HANDLER =====

/**
 * 🚚 Requête de livraison du client - VERSION SIMPLIFIÉE
 */
export interface DeliveryRequest {
  playerId: string;
  npcId: string;
  questId: string;
  objectiveId: string;
  itemId: string;
  requiredAmount: number;
}

/**
 * 🚚 Requête de livraison multiple
 */
export interface MultiDeliveryRequest {
  playerId: string;
  npcId: string;
  deliveries: Array<{
    questId: string;
    objectiveId: string;
    itemId: string;
    requiredAmount: number;
  }>;
}

/**
 * 🚚 Résultat du traitement de livraison - VERSION SIMPLIFIÉE
 */
export interface DeliveryProcessingResult {
  success: boolean;
  message: string;
  questId: string;
  objectiveId: string;
  itemId: string;
  
  // Détail de ce qui s'est passé
  itemsRemoved: boolean;
  amountRemoved: number;
  questProgressed: boolean;
  
  // Progression de quête résultante
  objectiveCompleted?: boolean;
  stepCompleted?: boolean;
  questCompleted?: boolean;
  progressMessage?: string;
  
  // En cas d'erreur
  error?: string;
  errorCode?: 'INSUFFICIENT_ITEMS' | 'QUEST_ERROR' | 'VALIDATION_FAILED' | 'SYSTEM_ERROR';
  
  // ✅ NOUVEAU : Callback de synchronisation
  syncCallback?: () => Promise<void>;
  
  // Timing pour debug
  processingTime: number;
}

/**
 * 🚚 Résultat de livraison multiple
 */
export interface MultiDeliveryProcessingResult {
  success: boolean;
  message: string;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  
  // Résultats individuels
  results: DeliveryProcessingResult[];
  
  // États globaux
  anyQuestProgressed: boolean;
  anyQuestCompleted: boolean;
  
  // Messages détaillés
  detailedMessages: string[];
  
  // ✅ NOUVEAU : Callback de synchronisation globale
  syncCallback?: () => Promise<void>;
  
  // Timing
  processingTime: number;
}

/**
 * 🚚 Configuration du handler
 */
export interface QuestDeliveryHandlerConfig {
  enableLogging: boolean;
  strictValidation: boolean;
  maxProcessingTime: number;
  enableRollback: boolean;
  validateInventoryBeforeProcessing: boolean;
  enableProgressNotifications: boolean;
  
  // ✅ NOUVEAUX : Configuration synchronisation
  enableAsyncSync: boolean;
  syncDelayMs: number;
  maxSyncWaitMs: number;
  enableCacheInvalidation: boolean;
}

// ===== CLASSE PRINCIPALE AMÉLIORÉE =====

/**
 * 🚚 Handler pour traiter les livraisons de quête
 * ✅ VERSION CORRIGÉE : Synchronisation améliorée
 */
export class QuestDeliveryHandler {
  private config: QuestDeliveryHandlerConfig;

  constructor(config?: Partial<QuestDeliveryHandlerConfig>) {
    this.config = {
      enableLogging: process.env.NODE_ENV === 'development',
      strictValidation: true,
      maxProcessingTime: 10000, // 10 secondes max
      enableRollback: true,
      validateInventoryBeforeProcessing: true,
      enableProgressNotifications: true,
      
      // ✅ NOUVEAUX : Configuration sync
      enableAsyncSync: true,
      syncDelayMs: 500, // Délai pour laisser la DB se mettre à jour
      maxSyncWaitMs: 3000, // Maximum 3s d'attente
      enableCacheInvalidation: true,
      
      ...config
    };

    if (this.config.enableLogging) {
      console.log('🚚 [QuestDeliveryHandler] Service initialisé avec sync améliorée');
    }
  }

  // ===== MÉTHODE PRINCIPALE CORRIGÉE =====

  /**
   * 🚚 Traite une livraison unique (méthode principale corrigée)
   */
  async handleQuestDelivery(
    playerId: string,
    npcId: string,
    questId: string,
    objectiveId: string,
    itemId: string,
    requiredAmount: number,
    questManager: any,
    // ✅ NOUVEAUX PARAMÈTRES : Callbacks pour synchronisation
    worldRoomCallback?: () => Promise<void>,
    cacheInvalidationCallback?: (playerId: string, npcId: string) => void
  ): Promise<DeliveryProcessingResult> {
    
    const startTime = Date.now();
    
    this.log('info', `🚚 === TRAITEMENT LIVRAISON AVEC SYNC AMÉLIORÉE ===`);
    this.log('info', `👤 Joueur: ${playerId}, NPC: ${npcId}`);
    this.log('info', `📦 Livraison: ${itemId} x${requiredAmount} pour quête ${questId}`);

    const result: DeliveryProcessingResult = {
      success: false,
      message: '',
      questId,
      objectiveId,
      itemId,
      itemsRemoved: false,
      amountRemoved: 0,
      questProgressed: false,
      processingTime: 0
    };

    try {
      // ✅ ÉTAPE 1 : Validation préalable
      const validation = await this.validateSingleDelivery(playerId, itemId, requiredAmount);
      if (!validation.valid) {
        result.error = validation.reason;
        result.errorCode = validation.errorCode;
        result.message = validation.reason || 'Validation échouée';
        result.processingTime = Date.now() - startTime;
        return result;
      }

      // ✅ ÉTAPE 2 : Supprimer les items de l'inventaire
      this.log('info', `📦 Suppression de ${itemId} x${requiredAmount} de l'inventaire`);
      
      const itemRemoved = await InventoryManager.removeItem(playerId, itemId, requiredAmount);
      
      if (!itemRemoved) {
        result.error = 'Impossible de supprimer les items de l\'inventaire';
        result.errorCode = 'SYSTEM_ERROR';
        result.message = 'Erreur lors de la suppression des items';
        result.processingTime = Date.now() - startTime;
        return result;
      }

      result.itemsRemoved = true;
      result.amountRemoved = requiredAmount;
      this.log('info', `✅ Items supprimés avec succès: ${itemId} x${requiredAmount}`);

      // ✅ ÉTAPE 3 : Progresser la quête
      this.log('info', `🎯 Progression de la quête ${questId} pour livraison`);
      
      try {
        // Utiliser la méthode asPlayerQuestWith du QuestManager
        await questManager.asPlayerQuestWith(playerId, 'deliver', itemId);
        
        result.questProgressed = true;
        result.success = true;
        result.message = `Livraison de ${itemId} effectuée avec succès !`;
        
        this.log('info', `✅ Quête progressée avec succès`);

        // ✅ ÉTAPE 4 : Vérifier l'état de la progression (optionnel)
        try {
          const questStatus = await questManager.getQuestStatus(playerId, questId);
          if (questStatus === 'readyToComplete') {
            result.questCompleted = true;
            result.progressMessage = 'Quête prête à être terminée !';
          } else if (questStatus === 'completed') {
            result.questCompleted = true;
            result.progressMessage = 'Quête terminée automatiquement !';
          } else {
            result.progressMessage = 'Quête mise à jour';
          }
        } catch (statusError) {
          // Ne pas faire échouer la livraison pour ça
          this.log('warn', `⚠️ Impossible de vérifier le statut de la quête:`, statusError);
          result.progressMessage = 'Livraison effectuée';
        }

        // ✅ ÉTAPE 5 : SYNCHRONISATION AMÉLIORÉE
        if (this.config.enableAsyncSync) {
          result.syncCallback = async () => {
            try {
              this.log('info', `🔄 Début synchronisation post-livraison pour ${playerId}`);
              
              // 1. Invalidation du cache si disponible
              if (this.config.enableCacheInvalidation && cacheInvalidationCallback) {
                this.log('info', `🗑️ Invalidation cache pour ${playerId}-${npcId}`);
                cacheInvalidationCallback(playerId, npcId.toString());
              }
              
              // 2. Attendre que la DB soit mise à jour
              await this.waitForDbSync();
              
              // 3. Callback vers WorldRoom pour refresh des NPCs
              if (worldRoomCallback) {
                this.log('info', `📡 Appel callback WorldRoom pour refresh NPCs`);
                await worldRoomCallback();
              }
              
              this.log('info', `✅ Synchronisation post-livraison terminée`);
              
            } catch (syncError) {
              this.log('error', `❌ Erreur synchronisation:`, syncError);
            }
          };
        }

      } catch (questError) {
        this.log('error', `❌ Erreur progression quête:`, questError);
        
        // ✅ ROLLBACK : Rendre les items si la progression échoue
        if (this.config.enableRollback) {
          try {
            await InventoryManager.addItem(playerId, itemId, requiredAmount);
            this.log('info', `🔄 Rollback effectué: items rendus`);
            result.itemsRemoved = false;
            result.amountRemoved = 0;
          } catch (rollbackError) {
            this.log('error', `❌ Erreur rollback:`, rollbackError);
          }
        }
        
        result.error = questError instanceof Error ? questError.message : 'Erreur progression quête';
        result.errorCode = 'QUEST_ERROR';
        result.message = 'Erreur lors de la progression de la quête';
        result.success = false;
      }

      result.processingTime = Date.now() - startTime;
      
      this.log('info', `✅ Traitement terminé: ${result.success ? 'SUCCÈS' : 'ÉCHEC'} (${result.processingTime}ms)`);

      return result;

    } catch (error) {
      this.log('error', `❌ Erreur globale traitement livraison:`, error);
      
      result.error = error instanceof Error ? error.message : 'Erreur système';
      result.errorCode = 'SYSTEM_ERROR';
      result.message = 'Erreur système lors du traitement';
      result.success = false;
      result.processingTime = Date.now() - startTime;
      
      return result;
    }
  }

  /**
   * 🚚 Traite des livraisons multiples (pour plusieurs objectifs à la fois)
   */
  async handleMultipleDeliveries(
    request: MultiDeliveryRequest,
    questManager: any,
    worldRoomCallback?: () => Promise<void>,
    cacheInvalidationCallback?: (playerId: string, npcId: string) => void
  ): Promise<MultiDeliveryProcessingResult> {
    
    const startTime = Date.now();
    
    this.log('info', `🚚 === TRAITEMENT LIVRAISONS MULTIPLES AVEC SYNC ===`);
    this.log('info', `👤 Joueur: ${request.playerId}, NPC: ${request.npcId}`);
    this.log('info', `📦 ${request.deliveries.length} livraison(s) à traiter`);

    const result: MultiDeliveryProcessingResult = {
      success: true,
      message: '',
      totalDeliveries: request.deliveries.length,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      results: [],
      anyQuestProgressed: false,
      anyQuestCompleted: false,
      detailedMessages: [],
      processingTime: 0
    };

    try {
      const allSyncCallbacks: Array<() => Promise<void>> = [];

      // Traiter chaque livraison individuellement
      for (const delivery of request.deliveries) {
        const deliveryResult = await this.handleQuestDelivery(
          request.playerId,
          request.npcId,
          delivery.questId,
          delivery.objectiveId,
          delivery.itemId,
          delivery.requiredAmount,
          questManager,
          worldRoomCallback,
          cacheInvalidationCallback
        );

        result.results.push(deliveryResult);

        if (deliveryResult.success) {
          result.successfulDeliveries++;
          result.detailedMessages.push(`✅ ${delivery.itemId} x${delivery.requiredAmount} livré`);
          
          if (deliveryResult.questProgressed) {
            result.anyQuestProgressed = true;
          }
          
          if (deliveryResult.questCompleted) {
            result.anyQuestCompleted = true;
            result.detailedMessages.push(`🏆 Quête ${delivery.questId} terminée !`);
          }

          // ✅ Collecter les callbacks de sync
          if (deliveryResult.syncCallback) {
            allSyncCallbacks.push(deliveryResult.syncCallback);
          }

        } else {
          result.failedDeliveries++;
          result.detailedMessages.push(`❌ ${delivery.itemId}: ${deliveryResult.error}`);
          
          if (this.config.strictValidation) {
            result.success = false;
            result.message = `Livraison échouée: ${deliveryResult.error}`;
            break; // Arrêter en mode strict
          }
        }
      }

      // ✅ SYNCHRONISATION GLOBALE
      if (allSyncCallbacks.length > 0) {
        result.syncCallback = async () => {
          this.log('info', `🔄 Synchronisation globale: ${allSyncCallbacks.length} callback(s)`);
          
          // Exécuter tous les callbacks en séquence
          for (const callback of allSyncCallbacks) {
            await callback();
          }
          
          this.log('info', `✅ Synchronisation globale terminée`);
        };
      }

      // Construire le message final
      if (result.success) {
        if (result.successfulDeliveries === result.totalDeliveries) {
          result.message = `Toutes les livraisons effectuées avec succès !`;
        } else {
          result.message = `${result.successfulDeliveries}/${result.totalDeliveries} livraisons réussies`;
        }
      }

      result.processingTime = Date.now() - startTime;
      
      this.log('info', `✅ Traitement multiple terminé: ${result.successfulDeliveries}/${result.totalDeliveries} réussies (${result.processingTime}ms)`);

      return result;

    } catch (error) {
      this.log('error', `❌ Erreur traitement livraisons multiples:`, error);
      
      result.success = false;
      result.message = 'Erreur système lors du traitement multiple';
      result.processingTime = Date.now() - startTime;
      
      return result;
    }
  }

  // ===== NOUVELLES MÉTHODES DE SYNCHRONISATION =====

  /**
   * ✅ NOUVELLE MÉTHODE : Attendre que la DB soit synchronisée
   */
  private async waitForDbSync(): Promise<void> {
    if (!this.config.enableAsyncSync) {
      return;
    }

    this.log('info', `⏳ Attente synchronisation DB (${this.config.syncDelayMs}ms)`);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout synchronisation DB après ${this.config.maxSyncWaitMs}ms`));
      }, this.config.maxSyncWaitMs);

      setTimeout(() => {
        clearTimeout(timeout);
        resolve();
      }, this.config.syncDelayMs);
    });
  }

  /**
   * ✅ NOUVELLE MÉTHODE UTILITAIRE : Exécuter la synchronisation d'un résultat
   */
  public static async executeSyncCallback(result: DeliveryProcessingResult | MultiDeliveryProcessingResult): Promise<void> {
    if (result.syncCallback) {
      try {
        await result.syncCallback();
      } catch (error) {
        console.error(`❌ [QuestDeliveryHandler] Erreur callback sync:`, error);
      }
    }
  }

  // ===== MÉTHODES PRIVÉES (IDENTIQUES) =====

  /**
   * 🚚 Valide une livraison unique
   */
  private async validateSingleDelivery(
    playerId: string,
    itemId: string,
    requiredAmount: number
  ): Promise<{
    valid: boolean;
    reason?: string;
    errorCode?: DeliveryProcessingResult['errorCode'];
  }> {
    
    try {
      // Vérifier que les paramètres sont valides
      if (!playerId || !itemId || requiredAmount <= 0) {
        return {
          valid: false,
          reason: 'Paramètres invalides',
          errorCode: 'VALIDATION_FAILED'
        };
      }

      // Vérifier l'inventaire du joueur
      if (this.config.validateInventoryBeforeProcessing) {
        const playerHas = await InventoryManager.getItemCount(playerId, itemId);
        
        if (playerHas < requiredAmount) {
          return {
            valid: false,
            reason: `Inventaire insuffisant: ${playerHas}/${requiredAmount} ${itemId}`,
            errorCode: 'INSUFFICIENT_ITEMS'
          };
        }
      }

      return { valid: true };

    } catch (error) {
      return {
        valid: false,
        reason: 'Erreur lors de la validation',
        errorCode: 'SYSTEM_ERROR'
      };
    }
  }

  /**
   * 🚚 Logging intelligent
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.enableLogging && level === 'debug') return;

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [QuestDeliveryHandler] ${message}`;

    switch (level) {
      case 'debug':
        if (this.config.enableLogging) {
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

  /**
   * 🚚 Informations de debug
   */
  public getDebugInfo(): any {
    return {
      config: this.config,
      version: '2.1.0', // ✅ Version avec sync améliorée
      features: {
        singleDelivery: true,
        multipleDelivery: true,
        strictValidation: this.config.strictValidation,
        rollback: this.config.enableRollback,
        inventoryValidation: this.config.validateInventoryBeforeProcessing,
        progressNotifications: this.config.enableProgressNotifications,
        asyncSync: this.config.enableAsyncSync,
        cacheInvalidation: this.config.enableCacheInvalidation
      },
      syncConfig: {
        enabled: this.config.enableAsyncSync,
        delayMs: this.config.syncDelayMs,
        maxWaitMs: this.config.maxSyncWaitMs,
        cacheInvalidation: this.config.enableCacheInvalidation
      },
      supportedErrorCodes: [
        'INSUFFICIENT_ITEMS',
        'QUEST_ERROR', 
        'VALIDATION_FAILED',
        'SYSTEM_ERROR'
      ]
    };
  }

  /**
   * 🚚 Met à jour la configuration
   */
  public updateConfig(newConfig: Partial<QuestDeliveryHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('info', '⚙️ Configuration mise à jour avec sync améliorée');
  }

  /**
   * 🚚 Nettoie le service
   */
  public cleanup(): void {
    this.log('info', '🧹 Service nettoyé');
  }

  // ===== MÉTHODES UTILITAIRES PUBLIQUES (IDENTIQUES) =====

  /**
   * 🚚 Crée une requête de livraison simple
   */
  public static createDeliveryRequest(
    playerId: string,
    npcId: string,
    questId: string,
    objectiveId: string,
    itemId: string,
    requiredAmount: number
  ): DeliveryRequest {
    return {
      playerId,
      npcId,
      questId,
      objectiveId,
      itemId,
      requiredAmount
    };
  }

  /**
   * 🚚 Crée une requête de livraisons multiples
   */
  public static createMultiDeliveryRequest(
    playerId: string,
    npcId: string,
    deliveries: Array<{
      questId: string;
      objectiveId: string;
      itemId: string;
      requiredAmount: number;
    }>
  ): MultiDeliveryRequest {
    return {
      playerId,
      npcId,
      deliveries
    };
  }

  /**
   * 🚚 Vérifie si un résultat est un succès
   */
  public static isSuccess(result: DeliveryProcessingResult | MultiDeliveryProcessingResult): boolean {
    return result.success;
  }

  /**
   * 🚚 Extrait le message d'erreur principal
   */
  public static getErrorMessage(result: DeliveryProcessingResult | MultiDeliveryProcessingResult): string {
    if (result.success) return '';
    
    if ('error' in result && result.error) {
      return result.error;
    }
    
    return result.message || 'Erreur inconnue';
  }
}

// ===== EXPORT PAR DÉFAUT =====
export default QuestDeliveryHandler;
