// server/src/quest/services/QuestDeliveryDetector.ts
// Service de détection automatique des livraisons de quête lors d'interaction NPC

import { 
  QuestDefinition, 
  QuestObjective,
  Quest
} from "../core/types/QuestTypes";

import { InventoryManager } from "../../managers/InventoryManager";

// ===== TYPES POUR LE SYSTÈME DE LIVRAISON =====

/**
 * 🎯 Objectif de livraison détecté
 */
export interface DeliveryObjective {
  questId: string;
  questName: string;
  stepIndex: number;
  stepName: string;
  objectiveId: string;
  objectiveDescription: string;
  
  // Données de l'item à livrer
  itemId: string;
  itemName: string;
  requiredAmount: number;
  playerHasAmount: number;
  canDeliver: boolean;
  
  // Métadonnées
  isCompleted: boolean;
  npcId: string;
}

/**
 * 🎯 Résultat de détection de livraisons
 */
export interface DeliveryDetectionResult {
  hasDeliveries: boolean;
  npcId: string;
  npcName?: string;
  
  // Livraisons disponibles
  deliveries: DeliveryObjective[];
  
  // États globaux
  allItemsAvailable: boolean;
  totalDeliveries: number;
  readyDeliveries: number;
  
  // Métadonnées
  detectionTime: number;
  lastUpdated: Date;
}

/**
 * 🎯 Configuration du détecteur
 */
export interface QuestDeliveryDetectorConfig {
  enableCaching: boolean;
  cacheTTL: number; // en millisecondes
  enableLogging: boolean;
  strictValidation: boolean;
  maxDetectionTime: number; // timeout en ms
  enableInventoryValidation: boolean;
}

// ===== CLASSE PRINCIPALE =====

/**
 * 🎯 Détecteur de livraisons de quête
 * 
 * Analyse les quêtes actives d'un joueur pour détecter automatiquement
 * les livraisons possibles lors d'une interaction avec un NPC.
 */
export class QuestDeliveryDetector {
  private config: QuestDeliveryDetectorConfig;
  private detectionCache: Map<string, { result: DeliveryDetectionResult; expires: number }>;

  constructor(config?: Partial<QuestDeliveryDetectorConfig>) {
    this.config = {
      enableCaching: true,
      cacheTTL: 30000, // 30 secondes
      enableLogging: process.env.NODE_ENV === 'development',
      strictValidation: true,
      maxDetectionTime: 5000, // 5 secondes max
      enableInventoryValidation: true,
      ...config
    };

    this.detectionCache = new Map();
    
    if (this.config.enableLogging) {
      console.log('🚚 [QuestDeliveryDetector] Service initialisé');
    }
  }

  // ===== MÉTHODE PRINCIPALE =====

  /**
   * 🎯 Détecte automatiquement les livraisons possibles pour un NPC
   * 
   * @param playerId - ID du joueur
   * @param npcId - ID du NPC avec lequel il interagit
   * @param activeQuests - Quêtes actives du joueur
   * @param questDefinitions - Définitions de toutes les quêtes
   * @returns Résultat de détection avec toutes les livraisons possibles
   */
  async detectDeliveries(
    playerId: string,
    npcId: string,
    activeQuests: Quest[],
    questDefinitions: Map<string, QuestDefinition>
  ): Promise<DeliveryDetectionResult> {
    
    const startTime = Date.now();
    
    this.log('info', `🔍 Détection livraisons: ${playerId} -> NPC ${npcId}`);

    // ✅ VÉRIFICATION CACHE
    if (this.config.enableCaching) {
      const cacheKey = this.generateCacheKey(playerId, npcId);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.log('debug', `📋 Cache hit pour ${playerId}-${npcId}`);
        return cached;
      }
    }

    // ✅ RÉSULTAT INITIAL
    const result: DeliveryDetectionResult = {
      hasDeliveries: false,
      npcId: npcId,
      deliveries: [],
      allItemsAvailable: false,
      totalDeliveries: 0,
      readyDeliveries: 0,
      detectionTime: 0,
      lastUpdated: new Date()
    };

    try {
      // ✅ PHASE 1 : Scanner toutes les quêtes actives
      for (const activeQuest of activeQuests) {
        if (activeQuest.status !== 'active') {
          continue; // Ignorer les quêtes non actives
        }

        const definition = questDefinitions.get(activeQuest.id);
        if (!definition) {
          this.log('warn', `⚠️ Définition manquante pour quête ${activeQuest.id}`);
          continue;
        }

        // ✅ PHASE 2 : Analyser l'étape courante
        const currentStep = definition.steps[activeQuest.currentStepIndex];
        if (!currentStep) {
          this.log('warn', `⚠️ Étape courante introuvable pour ${definition.name}`);
          continue;
        }

        // ✅ PHASE 3 : Chercher les objectifs 'deliver' pour ce NPC
        await this.scanStepForDeliveries(
          playerId,
          npcId,
          activeQuest,
          definition,
          currentStep,
          result
        );
      }

      // ✅ PHASE 4 : Calculer les états globaux
      this.calculateGlobalStates(result);

      // ✅ PHASE 5 : Mise en cache si applicable
      if (this.config.enableCaching && result.hasDeliveries) {
        const cacheKey = this.generateCacheKey(playerId, npcId);
        this.setCache(cacheKey, result);
      }

      result.detectionTime = Date.now() - startTime;
      
      this.log('info', `✅ Détection terminée: ${result.totalDeliveries} livraison(s), ${result.readyDeliveries} prête(s) (${result.detectionTime}ms)`);

      return result;

    } catch (error) {
      this.log('error', `❌ Erreur détection livraisons:`, error);
      result.detectionTime = Date.now() - startTime;
      return result;
    }
  }

  // ===== MÉTHODES PRIVÉES =====

  /**
   * 🎯 Scanne une étape pour les livraisons vers un NPC spécifique
   */
  private async scanStepForDeliveries(
    playerId: string,
    npcId: string,
    activeQuest: Quest,
    definition: QuestDefinition,
    currentStep: any,
    result: DeliveryDetectionResult
  ): Promise<void> {

    for (const objective of currentStep.objectives) {
      // ✅ FILTRER : Seulement les objectifs 'deliver'
      if (objective.type !== 'deliver') {
        continue;
      }

      // ✅ FILTRER : Seulement pour ce NPC
      if (objective.target !== npcId.toString()) {
        continue;
      }

      // ✅ VÉRIFIER : Objectif pas déjà complété
      const objectiveProgress = this.getObjectiveProgress(activeQuest, objective.id);
      if (objectiveProgress?.completed) {
        this.log('debug', `⏭️ Objectif ${objective.id} déjà complété`);
        continue;
      }

      this.log('info', `🎯 Objectif de livraison trouvé: ${objective.description} (${objective.itemId} -> NPC ${npcId})`);

      // ✅ CRÉER L'OBJECTIF DE LIVRAISON
      const deliveryObjective = await this.createDeliveryObjective(
        playerId,
        activeQuest,
        definition,
        currentStep,
        objective,
        npcId
      );

      if (deliveryObjective) {
        result.deliveries.push(deliveryObjective);
        result.totalDeliveries++;

        if (deliveryObjective.canDeliver) {
          result.readyDeliveries++;
        }
      }
    }
  }

  /**
   * 🎯 Crée un objectif de livraison avec vérification inventaire
   */
  private async createDeliveryObjective(
    playerId: string,
    activeQuest: Quest,
    definition: QuestDefinition,
    currentStep: any,
    objective: any,
    npcId: string
  ): Promise<DeliveryObjective | null> {

    try {
      // ✅ VÉRIFICATION INVENTAIRE
      let playerHasAmount = 0;
      let itemName = objective.itemId || 'Objet inconnu';

      if (this.config.enableInventoryValidation && objective.itemId) {
        try {
          playerHasAmount = await InventoryManager.getItemCount(playerId, objective.itemId);
          
          // Tenter de récupérer le nom de l'item
          const itemData = await InventoryManager.getItemDataHybrid(objective.itemId);
          if (itemData?.data?.name) {
            itemName = itemData.data.name;
          }
        } catch (inventoryError) {
          this.log('warn', `⚠️ Erreur vérification inventaire pour ${objective.itemId}:`, inventoryError);
        }
      }

      const requiredAmount = objective.requiredAmount || 1;
      const canDeliver = playerHasAmount >= requiredAmount;

      return {
        questId: activeQuest.id,
        questName: definition.name,
        stepIndex: activeQuest.currentStepIndex,
        stepName: currentStep.name || `Étape ${activeQuest.currentStepIndex + 1}`,
        objectiveId: objective.id,
        objectiveDescription: objective.description,
        
        itemId: objective.itemId || '',
        itemName: itemName,
        requiredAmount: requiredAmount,
        playerHasAmount: playerHasAmount,
        canDeliver: canDeliver,
        
        isCompleted: false,
        npcId: npcId
      };

    } catch (error) {
      this.log('error', `❌ Erreur création objectif livraison:`, error);
      return null;
    }
  }

  /**
   * 🎯 Récupère la progression d'un objectif spécifique
   */
  private getObjectiveProgress(activeQuest: Quest, objectiveId: string): { completed: boolean; currentAmount?: number } | null {
    try {
      // Gérer Map vs Object pour la compatibilité
      const objectivesMap = activeQuest.steps[activeQuest.currentStepIndex]?.objectives 
        ? new Map(activeQuest.steps[activeQuest.currentStepIndex].objectives.map(obj => [obj.id, obj]))
        : new Map();

      const objective = objectivesMap.get(objectiveId);
      return objective ? { 
        completed: objective.completed || false, 
        currentAmount: objective.currentAmount || 0 
      } : null;

    } catch (error) {
      this.log('warn', `⚠️ Erreur récupération progression objectif ${objectiveId}:`, error);
      return null;
    }
  }

  /**
   * 🎯 Calcule les états globaux du résultat
   */
  private calculateGlobalStates(result: DeliveryDetectionResult): void {
    result.hasDeliveries = result.totalDeliveries > 0;
    result.allItemsAvailable = result.deliveries.length > 0 && 
                               result.deliveries.every(d => d.canDeliver);
  }

  // ===== GESTION DU CACHE =====

  private generateCacheKey(playerId: string, npcId: string): string {
    return `delivery_${playerId}_${npcId}`;
  }

  private getFromCache(key: string): DeliveryDetectionResult | null {
    const cached = this.detectionCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expires) {
      this.detectionCache.delete(key);
      return null;
    }

    return cached.result;
  }

  private setCache(key: string, result: DeliveryDetectionResult): void {
    // Nettoyage du cache si trop grand
    if (this.detectionCache.size > 100) {
      const oldestKeys = Array.from(this.detectionCache.keys()).slice(0, 20);
      oldestKeys.forEach(k => this.detectionCache.delete(k));
    }

    this.detectionCache.set(key, {
      result: { ...result }, // Copie pour éviter les mutations
      expires: Date.now() + this.config.cacheTTL
    });
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * 🎯 Invalide le cache pour un joueur spécifique
   */
  public invalidatePlayerCache(playerId: string): void {
    const keysToDelete = Array.from(this.detectionCache.keys())
      .filter(key => key.includes(`delivery_${playerId}_`));
    
    keysToDelete.forEach(key => this.detectionCache.delete(key));
    
    if (keysToDelete.length > 0) {
      this.log('debug', `🗑️ Cache invalidé pour ${playerId}: ${keysToDelete.length} entrée(s)`);
    }
  }

  /**
   * 🎯 Vide tout le cache
   */
  public clearCache(): void {
    this.detectionCache.clear();
    this.log('info', '🗑️ Cache de détection livraisons vidé');
  }

  /**
   * 🎯 Informations de debug
   */
  public getDebugInfo(): any {
    return {
      config: this.config,
      cacheSize: this.detectionCache.size,
      version: '1.0.0',
      features: {
        caching: this.config.enableCaching,
        inventoryValidation: this.config.enableInventoryValidation,
        strictValidation: this.config.strictValidation
      }
    };
  }

  /**
   * 🎯 Logging intelligent
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.enableLogging && level === 'debug') return;

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [QuestDeliveryDetector] ${message}`;

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
   * 🎯 Met à jour la configuration
   */
  public updateConfig(newConfig: Partial<QuestDeliveryDetectorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('info', '⚙️ Configuration mise à jour');
  }

  /**
   * 🎯 Nettoyage du service
   */
  public cleanup(): void {
    this.clearCache();
    this.log('info', '🧹 Service nettoyé');
  }
}

// ===== EXPORT PAR DÉFAUT =====
export default QuestDeliveryDetector;
