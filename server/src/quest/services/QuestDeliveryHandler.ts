// server/src/quest/services/QuestDeliveryHandler.ts
// Service pour traiter les livraisons de quêtes confirmées par le joueur

import { InventoryManager } from "../../managers/InventoryManager";

// ===== TYPES POUR LE HANDLER =====

/**
 * 🚚 Requête de livraison du client
 */
export interface DeliveryRequest {
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
 * 🚚 Résultat du traitement de livraison
 */
export interface DeliveryProcessingResult {
  success: boolean;
  processedDeliveries: DeliveryItemResult[];
  failedDeliveries: DeliveryFailure[];
  questProgressions: QuestProgressionResult[];
  
  // Statistiques
  totalItemsDelivered: number;
  totalQuestsProgressed: number;
  
  // Messages
  message: string;
  detailedMessages: string[];
  
  // Timing
  processingTime: number;
}

/**
 * 🚚 Résultat de livraison d'un item
 */
export interface DeliveryItemResult {
  questId: string;
  objectiveId: string;
  itemId: string;
  itemName: string;
  deliveredAmount: number;
  requiredAmount: number;
  inventoryRemoved: boolean;
  questProgressed: boolean;
}

/**
 * 🚚 Échec de livraison
 */
export interface DeliveryFailure {
  questId: string;
  objectiveId: string;
  itemId: string;
  reason: 'insufficient_items' | 'inventory_error' | 'quest_error' | 'validation_failed';
  playerHas: number;
  required: number;
  error?: string;
}

/**
 * 🚚 Résultat de progression de quête
 */
export interface QuestProgressionResult {
  questId: string;
  questName: string;
  objectiveCompleted: boolean;
  stepCompleted: boolean;
  questCompleted: boolean;
  progressMessage: string;
}

/**
 * 🚚 Configuration du handler
 */
export interface QuestDeliveryHandlerConfig {
  enableLogging: boolean;
  strictValidation: boolean;
  maxProcessingTime: number;
  enableRollback: boolean; // En cas d'erreur partielle
  validateInventoryBeforeProcessing: boolean;
}

// ===== CLASSE PRINCIPALE =====

/**
 * 🚚 Handler pour traiter les livraisons de quête
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
      ...config
    };

    if (this.config.enableLogging) {
      console.log('🚚 [QuestDeliveryHandler] Service initialisé');
    }
  }

  // ===== MÉTHODE PRINCIPALE =====

  /**
   * 🚚 Traite une requête de livraison complète
   */
  async processDeliveryRequest(
    request: DeliveryRequest,
    questManager: any // Interface du QuestManager
  ): Promise<DeliveryProcessingResult> {
    
    const startTime = Date.now();
    
    this.log('info', `🚚 === TRAITEMENT LIVRAISON ===`);
    this.log('info', `👤 Joueur: ${request.playerId}, NPC: ${request.npcId}`);
    this.log('info', `📦 ${request.deliveries.length} livraison(s) à traiter`);

    const result: DeliveryProcessingResult = {
      success: true,
      processedDeliveries: [],
      failedDeliveries: [],
      questProgressions: [],
      totalItemsDelivered: 0,
      totalQuestsProgressed: 0,
      message: '',
      detailedMessages: [],
      processingTime: 0
    };

    try {
      // ✅ PHASE 1 : Validation préliminaire
      if (this.config.validateInventoryBeforeProcessing) {
        const validationResult = await this.validateInventoryForDeliveries(request);
        if (!validationResult.valid) {
          return this.createFailureResult(
            validationResult.reason || 'Validation échouée',
            startTime
          );
        }
      }

      // ✅ PHASE 2 : Traiter chaque livraison
      const rollbackActions: Array<() => Promise<void>> = [];

      for (const delivery of request.deliveries) {
        try {
          const deliveryResult = await this.processSingleDelivery(
            request.playerId,
            delivery,
            questManager
          );

          if (deliveryResult.success) {
            result.processedDeliveries.push(deliveryResult.itemResult!);
            result.totalItemsDelivered += deliveryResult.itemResult!.deliveredAmount;

            // Ajouter action de rollback si activé
            if (this.config.enableRollback) {
              rollbackActions.push(async () => {
                await this.rollbackDelivery(request.playerId, deliveryResult.itemResult!);
              });
            }

            // Progression de quête
            if (deliveryResult.questProgression) {
              result.questProgressions.push(deliveryResult.questProgression);
              if (deliveryResult.questProgression.objectiveCompleted || 
                  deliveryResult.questProgression.stepCompleted ||
                  deliveryResult.questProgression.questCompleted) {
                result.totalQuestsProgressed++;
              }
            }

          } else {
            result.failedDeliveries.push(deliveryResult.failure!);
            
            if (this.config.strictValidation) {
              // En mode strict, annuler toutes les livraisons précédentes
              if (this.config.enableRollback) {
                this.log('warn', `❌ Échec strict, rollback de ${rollbackActions.length} action(s)`);
                for (const rollback of rollbackActions.reverse()) {
                  try {
                    await rollback();
                  } catch (rollbackError) {
                    this.log('error', `❌ Erreur rollback:`, rollbackError);
                  }
                }
              }
              
              return this.createFailureResult(
                `Livraison échouée: ${deliveryResult.failure!.reason}`,
                startTime
              );
            }
          }

        } catch (deliveryError) {
          this.log('error', `❌ Erreur traitement livraison:`, deliveryError);
          
          result.failedDeliveries.push({
            questId: delivery.questId,
            objectiveId: delivery.objectiveId,
            itemId: delivery.itemId,
            reason: 'quest_error',
            playerHas: 0,
            required: delivery.requiredAmount,
            error: deliveryError instanceof Error ? deliveryError.message : 'Erreur inconnue'
          });
        }
      }

      // ✅ PHASE 3 : Finaliser le résultat
      result.success = result.processedDeliveries.length > 0;
      
      if (result.success) {
        result.message = this.buildSuccessMessage(result);
        result.detailedMessages = this.buildDetailedMessages(result);
      } else {
        result.message = 'Aucune livraison n\'a pu être effectuée';
      }

      result.processingTime = Date.now() - startTime;
      
      this.log('info', `✅ Traitement terminé: ${result.processedDeliveries.length}/${request.deliveries.length} livraisons réussies (${result.processingTime}ms)`);

      return result;

    } catch (error) {
      this.log('error', `❌ Erreur globale traitement livraison:`, error);
      return this.createFailureResult(
        'Erreur système lors du traitement',
        startTime
      );
    }
  }

  // ===== MÉTHODES PRIVÉES =====

  /**
   * 🚚 Traite une livraison individuelle
   */
  private async processSingleDelivery(
    playerId: string,
    delivery: DeliveryRequest['deliveries'][0],
    questManager: any
  ): Promise<{
    success: boolean;
    itemResult?: DeliveryItemResult;
    questProgression?: QuestProgressionResult;
    failure?: DeliveryFailure;
  }> {

    this.log('debug', `📦 Traitement livraison: ${delivery.itemId} (${delivery.requiredAmount}) pour quête ${delivery.questId}`);

    try {
      // ✅ ÉTAPE 1 : Vérifier inventaire
      const playerHas = await InventoryManager.getItemCount(playerId, delivery.itemId);
      
      if (playerHas < delivery.requiredAmount) {
        this.log('warn', `❌ Inventaire insuffisant: ${playerHas}/${delivery.requiredAmount} pour ${delivery.itemId}`);
        
        return {
          success: false,
          failure: {
            questId: delivery.questId,
            objectiveId: delivery.objectiveId,
            itemId: delivery.itemId,
            reason: 'insufficient_items',
            playerHas,
            required: delivery.requiredAmount
          }
        };
      }

      // ✅ ÉTAPE 2 : Retirer les items de l'inventaire
      const itemRemoved = await InventoryManager.removeItem(playerId, delivery.itemId, delivery.requiredAmount);
      
      if (!itemRemoved) {
        this.log('error', `❌ Impossible de retirer ${delivery.itemId} de l'inventaire`);
        
        return {
          success: false,
          failure: {
            questId: delivery.questId,
            objectiveId: delivery.objectiveId,
            itemId: delivery.itemId,
            reason: 'inventory_error',
            playerHas,
            required: delivery.requiredAmount,
            error: 'Échec suppression inventaire'
          }
        };
      }

      this.log('info', `✅ Items retirés: ${delivery.itemId} x${delivery.requiredAmount}`);

      // ✅ ÉTAPE 3 : Progresser la quête
      let questProgression: QuestProgressionResult = {
        questId: delivery.questId,
        questName: delivery.questId, // Sera mis à jour si possible
        objectiveCompleted: false,
        stepCompleted: false,
        questCompleted: false,
        progressMessage: 'Livraison effectuée'
      };

      try {
        // Déclencher la progression via le QuestManager
        const progressResults = await questManager.updateQuestProgress(playerId, {
          type: 'deliver',
          targetId: delivery.itemId,
          npcId: parseInt(delivery.objectiveId.split('_')[1] || '0'), // Extraire NPC ID si possible
          amount: delivery.requiredAmount
        });

        // Analyser les résultats de progression
        if (progressResults && progressResults.length > 0) {
          const questResult = progressResults.find((r: any) => r.questId === delivery.questId);
          if (questResult) {
            questProgression.questName = questResult.questName || delivery.questId;
            questProgression.objectiveCompleted = questResult.objectiveCompleted || false;
            questProgression.stepCompleted = questResult.stepCompleted || false;
            questProgression.questCompleted = questResult.questCompleted || false;
            questProgression.progressMessage = questResult.message || 'Livraison effectuée';
          }
        }

      } catch (questError) {
        this.log('warn', `⚠️ Erreur progression quête:`, questError);
        // Continue même si la progression échoue - les items sont déjà retirés
      }

      // ✅ ÉTAPE 4 : Construire le résultat
      const itemData = await InventoryManager.getItemDataHybrid(delivery.itemId);
      const itemName = itemData?.data?.name || delivery.itemId;

      const itemResult: DeliveryItemResult = {
        questId: delivery.questId,
        objectiveId: delivery.objectiveId,
        itemId: delivery.itemId,
        itemName,
        deliveredAmount: delivery.requiredAmount,
        requiredAmount: delivery.requiredAmount,
        inventoryRemoved: true,
        questProgressed: questProgression.objectiveCompleted || questProgression.stepCompleted
      };

      this.log('info', `✅ Livraison réussie: ${itemName} x${delivery.requiredAmount}`);

      return {
        success: true,
        itemResult,
        questProgression
      };

    } catch (error) {
      this.log('error', `❌ Erreur traitement livraison individuelle:`, error);
      
      return {
        success: false,
        failure: {
          questId: delivery.questId,
          objectiveId: delivery.objectiveId,
          itemId: delivery.itemId,
          reason: 'quest_error',
          playerHas: 0,
          required: delivery.requiredAmount,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        }
      };
    }
  }

  /**
   * 🚚 Valide l'inventaire avant traitement
   */
  private async validateInventoryForDeliveries(request: DeliveryRequest): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    
    try {
      for (const delivery of request.deliveries) {
        const playerHas = await InventoryManager.getItemCount(request.playerId, delivery.itemId);
        
        if (playerHas < delivery.requiredAmount) {
          return {
            valid: false,
            reason: `Inventaire insuffisant: ${delivery.itemId} (${playerHas}/${delivery.requiredAmount})`
          };
        }
      }

      return { valid: true };

    } catch (error) {
      return {
        valid: false,
        reason: 'Erreur validation inventaire'
      };
    }
  }

  /**
   * 🚚 Rollback d'une livraison (rendre les items)
   */
  private async rollbackDelivery(playerId: string, itemResult: DeliveryItemResult): Promise<void> {
    try {
      await InventoryManager.addItem(playerId, itemResult.itemId, itemResult.deliveredAmount);
      this.log('info', `🔄 Rollback effectué: ${itemResult.itemName} x${itemResult.deliveredAmount} rendu à ${playerId}`);
    } catch (error) {
      this.log('error', `❌ Erreur rollback:`, error);
    }
  }

  /**
   * 🚚 Construit le message de succès
   */
  private buildSuccessMessage(result: DeliveryProcessingResult): string {
    const deliveredCount = result.processedDeliveries.length;
    const progressedCount = result.totalQuestsProgressed;

    if (deliveredCount === 1) {
      const delivery = result.processedDeliveries[0];
      return `Vous avez livré ${delivery.itemName} avec succès !`;
    } else {
      return `Vous avez livré ${deliveredCount} objet(s) avec succès !`;
    }
  }

  /**
   * 🚚 Construit les messages détaillés
   */
  private buildDetailedMessages(result: DeliveryProcessingResult): string[] {
    const messages: string[] = [];

    for (const delivery of result.processedDeliveries) {
      messages.push(`✅ ${delivery.itemName} x${delivery.deliveredAmount} livré`);
    }

    for (const progression of result.questProgressions) {
      if (progression.objectiveCompleted) {
        messages.push(`🎯 Objectif complété dans "${progression.questName}"`);
      }
      if (progression.stepCompleted) {
        messages.push(`📋 Étape terminée dans "${progression.questName}"`);
      }
      if (progression.questCompleted) {
        messages.push(`🏆 Quête "${progression.questName}" terminée !`);
      }
    }

    return messages;
  }

  /**
   * 🚚 Crée un résultat d'échec
   */
  private createFailureResult(message: string, startTime: number): DeliveryProcessingResult {
    return {
      success: false,
      processedDeliveries: [],
      failedDeliveries: [],
      questProgressions: [],
      totalItemsDelivered: 0,
      totalQuestsProgressed: 0,
      message,
      detailedMessages: [message],
      processingTime: Date.now() - startTime
    };
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
      version: '1.0.0',
      features: {
        strictValidation: this.config.strictValidation,
        rollback: this.config.enableRollback,
        inventoryValidation: this.config.validateInventoryBeforeProcessing
      }
    };
  }

  /**
   * 🚚 Met à jour la configuration
   */
  public updateConfig(newConfig: Partial<QuestDeliveryHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('info', '⚙️ Configuration mise à jour');
  }
}

// ===== EXPORT PAR DÉFAUT =====
export default QuestDeliveryHandler;
