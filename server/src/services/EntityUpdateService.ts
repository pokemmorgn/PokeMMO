// server/src/services/EntityUpdateService.ts - SERVICE CENTRALISÉ DE MISE À JOUR
import { Client } from "@colyseus/core";
import { Player } from "../schema/PokeWorldState";
import { NpcManager } from "../managers/NPCManager";
import { ObjectInteractionHandlers } from "../handlers/ObjectInteractionHandlers";
import { QuestManager } from "../managers/QuestManager";

// ===== TYPES ET INTERFACES =====

/**
 * Configuration du service de mise à jour des entités
 */
interface EntityUpdateConfig {
  enableDebugLogs: boolean;
  enablePerformanceTracking: boolean;
  defaultTimeout: number;
  enableBatching: boolean;
  batchDelay: number;
}

/**
 * Résultat d'une mise à jour d'entité
 */
interface EntityUpdateResult {
  success: boolean;
  entityType: 'npc' | 'gameobject' | 'quest' | 'mixed';
  entityCount: number;
  executionTime: number;
  errors: string[];
  warnings: string[];
  metadata?: any;
}

/**
 * Paramètres pour la mise à jour des NPCs
 */
interface NpcUpdateParams {
  zone: string;
  player: Player;
  includeCapabilities?: boolean;
  filterByDistance?: { maxDistance: number };
  specificNpcIds?: number[];
}

/**
 * Paramètres pour la mise à jour des GameObjects
 */
interface GameObjectUpdateParams {
  zone: string;
  includeInteractables?: boolean;
  includeDecorative?: boolean;
  filterByType?: string[];
}

/**
 * Paramètres pour la mise à jour des quêtes
 */
interface QuestUpdateParams {
  username: string;
  includeAvailable?: boolean;
  includeActive?: boolean;
  includeCompleted?: boolean;
  specificQuestIds?: string[];
}

/**
 * Paramètres pour la mise à jour complète d'une zone
 */
interface ZoneUpdateParams {
  zone: string;
  player: Player;
  includeNpcs?: boolean;
  includeGameObjects?: boolean;
  includeQuests?: boolean;
  includeQuestStatuses?: boolean;
}

// ===== SERVICE PRINCIPAL =====

/**
 * Service centralisé pour gérer toutes les mises à jour d'entités
 * Évite la duplication de code et centralise la logique
 */
export class EntityUpdateService {
  private static instance: EntityUpdateService | null = null;
  
  private config: EntityUpdateConfig;
  private performanceStats: Map<string, { totalCalls: number; totalTime: number; averageTime: number }> = new Map();
  private pendingBatches: Map<string, { clients: Client[]; params: any; timeout: NodeJS.Timeout }> = new Map();

  constructor(config?: Partial<EntityUpdateConfig>) {
    this.config = {
      enableDebugLogs: process.env.NODE_ENV === 'development',
      enablePerformanceTracking: true,
      defaultTimeout: 5000,
      enableBatching: false, // Désactivé par défaut pour simplicité
      batchDelay: 100,
      ...config
    };

    this.log('🚀 EntityUpdateService initialisé', { config: this.config });
  }

  /**
   * Singleton pattern pour éviter les instances multiples
   */
  public static getInstance(config?: Partial<EntityUpdateConfig>): EntityUpdateService {
    if (!EntityUpdateService.instance) {
      EntityUpdateService.instance = new EntityUpdateService(config);
    }
    return EntityUpdateService.instance;
  }

  // ===== MÉTHODES PRINCIPALES DE MISE À JOUR =====

  /**
   * ✅ MÉTHODE PRINCIPALE : Mise à jour complète d'une zone pour un client
   */
  async updateZoneForClient(
    client: Client,
    params: ZoneUpdateParams,
    dependencies: {
      npcManager?: NpcManager;
      objectHandler?: ObjectInteractionHandlers;
      questManager?: QuestManager;
    }
  ): Promise<EntityUpdateResult> {
    const startTime = Date.now();
    const { zone, player } = params;
    
    this.log(`🌍 [updateZoneForClient] Mise à jour zone complète`, {
      client: client.sessionId,
      zone,
      player: player.name,
      params
    });

    const result: EntityUpdateResult = {
      success: true,
      entityType: 'mixed',
      entityCount: 0,
      executionTime: 0,
      errors: [],
      warnings: [],
      metadata: {
        zone,
        player: player.name,
        updates: []
      }
    };

    try {
      // ✅ 1. Mise à jour des NPCs
      if (params.includeNpcs !== false && dependencies.npcManager) {
        try {
          const npcResult = await this.updateNpcsForClient(client, {
            zone,
            player,
            includeCapabilities: true
          }, dependencies.npcManager);
          
          result.entityCount += npcResult.entityCount;
          result.errors.push(...npcResult.errors);
          result.warnings.push(...npcResult.warnings);
          result.metadata.updates.push({ type: 'npcs', result: npcResult });
          
          this.log(`✅ NPCs mis à jour: ${npcResult.entityCount} entités`);
        } catch (error) {
          const errorMsg = `Erreur mise à jour NPCs: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
          result.errors.push(errorMsg);
          this.log(`❌ ${errorMsg}`, error);
        }
      }

      // ✅ 2. Mise à jour des GameObjects
      if (params.includeGameObjects !== false && dependencies.objectHandler) {
        try {
          const gameObjectResult = await this.updateGameObjectsForClient(client, {
            zone,
            includeInteractables: true,
            includeDecorative: true
          }, dependencies.objectHandler);
          
          result.entityCount += gameObjectResult.entityCount;
          result.errors.push(...gameObjectResult.errors);
          result.warnings.push(...gameObjectResult.warnings);
          result.metadata.updates.push({ type: 'gameobjects', result: gameObjectResult });
          
          this.log(`✅ GameObjects mis à jour: ${gameObjectResult.entityCount} entités`);
        } catch (error) {
          const errorMsg = `Erreur mise à jour GameObjects: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
          result.errors.push(errorMsg);
          this.log(`❌ ${errorMsg}`, error);
        }
      }

      // ✅ 3. Mise à jour des quêtes
      if (params.includeQuests !== false && dependencies.questManager) {
        try {
          const questResult = await this.updateQuestsForClient(client, {
            username: player.name,
            includeAvailable: true,
            includeActive: true
          }, dependencies.questManager);
          
          result.entityCount += questResult.entityCount;
          result.errors.push(...questResult.errors);
          result.warnings.push(...questResult.warnings);
          result.metadata.updates.push({ type: 'quests', result: questResult });
          
          this.log(`✅ Quêtes mises à jour: ${questResult.entityCount} entités`);
        } catch (error) {
          const errorMsg = `Erreur mise à jour quêtes: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
          result.errors.push(errorMsg);
          this.log(`❌ ${errorMsg}`, error);
        }
      }

      // ✅ 4. Mise à jour des statuts de quêtes
      if (params.includeQuestStatuses !== false && dependencies.questManager) {
        try {
          const questStatusResult = await this.updateQuestStatusesForClient(client, {
            username: player.name
          }, dependencies.questManager);
          
          result.metadata.updates.push({ type: 'questStatuses', result: questStatusResult });
          
          this.log(`✅ Statuts de quêtes mis à jour`);
        } catch (error) {
          const errorMsg = `Erreur mise à jour statuts quêtes: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
          result.errors.push(errorMsg);
          this.log(`❌ ${errorMsg}`, error);
        }
      }

      // ✅ Finalisation
      result.executionTime = Date.now() - startTime;
      result.success = result.errors.length === 0;

      this.trackPerformance('updateZoneForClient', result.executionTime);
      
      this.log(`${result.success ? '✅' : '❌'} [updateZoneForClient] Terminé`, {
        success: result.success,
        entityCount: result.entityCount,
        executionTime: result.executionTime,
        errorsCount: result.errors.length,
        warningsCount: result.warnings.length
      });

      return result;

    } catch (error) {
      result.success = false;
      result.executionTime = Date.now() - startTime;
      result.errors.push(`Erreur critique: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      
      this.log(`💥 [updateZoneForClient] Erreur critique`, error);
      return result;
    }
  }

  /**
   * ✅ Mise à jour des NPCs pour un client
   */
  async updateNpcsForClient(
    client: Client,
    params: NpcUpdateParams,
    npcManager: NpcManager
  ): Promise<EntityUpdateResult> {
    const startTime = Date.now();
    const { zone, player } = params;
    
    this.log(`🤖 [updateNpcsForClient] Début mise à jour NPCs`, { client: client.sessionId, zone, player: player.name });

    const result: EntityUpdateResult = {
      success: true,
      entityType: 'npc',
      entityCount: 0,
      executionTime: 0,
      errors: [],
      warnings: [],
      metadata: { zone, player: player.name }
    };

    try {
      // ✅ Mapping des noms de zones (logique existante de WorldRoom)
      const zoneMapping: { [key: string]: string } = {
        'Road1Scene': 'road1',
        'BeachScene': 'beach', 
        'VillageScene': 'village',
        'Road3Scene': 'road3',
        'VillageLabScene': 'villagelab',
        'VillageHouse1Scene': 'villagehouse1',
        'VillageFloristScene': 'villageflorist',
        'Road1HouseScene': 'road1house',
        'Road1HiddenScene': 'road1hidden',
        'WraithmoorScene': 'wraithmoor',
        'NoctherbCave1Scene': 'noctherbcave1',
        'NoctherbCave2Scene': 'noctherbcave2',
        'LavandiaAnalysisScene': 'lavandiaanalysis',
        'LavandiaCelebitempleScene': 'lavandiacelebitemple',
        'LavandiaEquipmentScene': 'lavandiaequipment',
        'LavandiaFurnitureScene': 'lavandiafurniture',
        'LavandiaHealingcenterScene': 'lavandiahealingcenter',
        'LavandiaHouse1Scene': 'lavandiahouse1',
        'LavandiaHouse2Scene': 'lavandiahouse2',
        'LavandiaHouse3Scene': 'lavandiahouse3',
        'LavandiaHouse4Scene': 'lavandiahouse4',
        'LavandiaHouse5Scene': 'lavandiahouse5',
        'LavandiaHouse6Scene': 'lavandiahouse6',
        'LavandiaHouse7Scene': 'lavandiahouse7',
        'LavandiaHouse8Scene': 'lavandiahouse8',
        'LavandiaHouse9Scene': 'lavandiahouse9',
        'LavandiaShopScene': 'lavandiashop'
      };
      
      const mappedZoneName = zoneMapping[zone] || zone.toLowerCase().replace('scene', '');
      this.log(`🔄 Zone mapping: "${zone}" → "${mappedZoneName}"`);

      // ✅ Récupération des NPCs
      let npcs = npcManager.getNpcsByZone(mappedZoneName);
      
      // ✅ Filtrage par IDs spécifiques si demandé
      if (params.specificNpcIds && params.specificNpcIds.length > 0) {
        npcs = npcs.filter(npc => params.specificNpcIds!.includes(npc.id));
        this.log(`🔍 Filtrage par IDs spécifiques: ${npcs.length} NPCs conservés`);
      }

      // ✅ Filtrage par distance si demandé
      if (params.filterByDistance) {
        const { maxDistance } = params.filterByDistance;
        npcs = npcs.filter(npc => {
          const distance = Math.sqrt(
            Math.pow(player.x - npc.x, 2) + 
            Math.pow(player.y - npc.y, 2)
          );
          return distance <= maxDistance;
        });
        this.log(`📏 Filtrage par distance (${maxDistance}px): ${npcs.length} NPCs conservés`);
      }

      result.entityCount = npcs.length;

      // ✅ Debug détaillé si aucun NPC trouvé
      if (npcs.length === 0) {
        result.warnings.push(`Aucun NPC trouvé pour zone "${mappedZoneName}"`);
        
        // Debug avancé
        const allNpcs = npcManager.getAllNpcs();
        const zones = [...new Set(allNpcs.map(npc => npc.zone))];
        
        this.log(`⚠️ Debug NPCs manquants`, {
          zoneDemandee: mappedZoneName,
          zonesDisponibles: zones,
          totalNpcs: allNpcs.length,
          exemplesNpcs: allNpcs.slice(0, 3).map(npc => ({
            id: npc.id,
            name: npc.name,
            zone: npc.zone
          }))
        });
      } else {
        this.log(`✅ ${npcs.length} NPCs trouvés pour "${mappedZoneName}"`);
      }

      // ✅ Envoi des NPCs au client
      try {
        client.send("npcList", npcs);
        this.log(`📤 ${npcs.length} NPCs envoyés à ${client.sessionId}`);
      } catch (sendError) {
        const errorMsg = `Erreur envoi NPCs: ${sendError instanceof Error ? sendError.message : 'Erreur inconnue'}`;
        result.errors.push(errorMsg);
        this.log(`❌ ${errorMsg}`, sendError);
      }

      // ✅ Finalisation
      result.executionTime = Date.now() - startTime;
      result.success = result.errors.length === 0;
      
      this.trackPerformance('updateNpcsForClient', result.executionTime);
      
      return result;

    } catch (error) {
      result.success = false;
      result.executionTime = Date.now() - startTime;
      result.errors.push(`Erreur critique NPCs: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      
      this.log(`💥 [updateNpcsForClient] Erreur critique`, error);
      return result;
    }
  }

  /**
   * ✅ Mise à jour des GameObjects pour un client
   */
  async updateGameObjectsForClient(
    client: Client,
    params: GameObjectUpdateParams,
    objectHandler: ObjectInteractionHandlers
  ): Promise<EntityUpdateResult> {
    const startTime = Date.now();
    const { zone } = params;
    
    this.log(`🎯 [updateGameObjectsForClient] Début mise à jour GameObjects`, { client: client.sessionId, zone });

    const result: EntityUpdateResult = {
      success: true,
      entityType: 'gameobject',
      entityCount: 0,
      executionTime: 0,
      errors: [],
      warnings: [],
      metadata: { zone }
    };

    try {
      // ✅ Mapping de zone (même logique que NPCs)
      const zoneMapping: { [key: string]: string } = {
        'Road1Scene': 'road1',
        'BeachScene': 'beach', 
        'VillageScene': 'village',
        'Road3Scene': 'road3',
        'VillageLabScene': 'villagelab',
        // ... autres mappings (même liste que NPCs)
      };
      
      const mappedZoneName = zoneMapping[zone] || zone.toLowerCase().replace('scene', '');
      this.log(`🔄 Zone mapping GameObjects: "${zone}" → "${mappedZoneName}"`);

      // ✅ Envoi des objets de zone via le handler existant
      await objectHandler.sendZoneObjectsToClient(client, mappedZoneName);
      
      // Note: Le handler ne retourne pas le nombre d'objets, donc on estime
      result.entityCount = 1; // Marqueur que l'opération a été effectuée
      result.executionTime = Date.now() - startTime;
      
      this.log(`✅ GameObjects de zone "${mappedZoneName}" envoyés à ${client.sessionId}`);
      
      this.trackPerformance('updateGameObjectsForClient', result.executionTime);
      
      return result;

    } catch (error) {
      result.success = false;
      result.executionTime = Date.now() - startTime;
      result.errors.push(`Erreur critique GameObjects: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      
      this.log(`💥 [updateGameObjectsForClient] Erreur critique`, error);
      return result;
    }
  }

  /**
   * ✅ Mise à jour des quêtes pour un client
   */
  async updateQuestsForClient(
    client: Client,
    params: QuestUpdateParams,
    questManager: QuestManager
  ): Promise<EntityUpdateResult> {
    const startTime = Date.now();
    const { username } = params;
    
    this.log(`📋 [updateQuestsForClient] Début mise à jour quêtes`, { client: client.sessionId, username });

    const result: EntityUpdateResult = {
      success: true,
      entityType: 'quest',
      entityCount: 0,
      executionTime: 0,
      errors: [],
      warnings: [],
      metadata: { username }
    };

    try {
      let totalQuests = 0;

      // ✅ Quêtes disponibles
      if (params.includeAvailable !== false) {
        try {
          const availableQuests = await questManager.getAvailableQuests(username);
          let filteredQuests = availableQuests;
          
          if (params.specificQuestIds) {
            filteredQuests = availableQuests.filter(q => params.specificQuestIds!.includes(q.id));
          }
          
          client.send("availableQuestsList", { quests: filteredQuests });
          totalQuests += filteredQuests.length;
          
          this.log(`📤 ${filteredQuests.length} quêtes disponibles envoyées`);
        } catch (error) {
          result.errors.push(`Erreur quêtes disponibles: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
      }

      // ✅ Quêtes actives
      if (params.includeActive !== false) {
        try {
          const activeQuests = await questManager.getActiveQuests(username);
          let filteredQuests = activeQuests;
          
          if (params.specificQuestIds) {
            filteredQuests = activeQuests.filter(q => params.specificQuestIds!.includes(q.id));
          }
          
          client.send("activeQuestsList", { quests: filteredQuests });
          totalQuests += filteredQuests.length;
          
          this.log(`📤 ${filteredQuests.length} quêtes actives envoyées`);
        } catch (error) {
          result.errors.push(`Erreur quêtes actives: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
      }

      // ✅ Quêtes complétées (optionnel)
      if (params.includeCompleted === true) {
        try {
          // TODO: Implémenter getCompletedQuests si nécessaire
          this.log(`ℹ️ Quêtes complétées non implémentées pour l'instant`);
        } catch (error) {
          result.warnings.push(`Erreur quêtes complétées: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
      }

      result.entityCount = totalQuests;
      result.executionTime = Date.now() - startTime;
      result.success = result.errors.length === 0;
      
      this.trackPerformance('updateQuestsForClient', result.executionTime);
      
      return result;

    } catch (error) {
      result.success = false;
      result.executionTime = Date.now() - startTime;
      result.errors.push(`Erreur critique quêtes: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      
      this.log(`💥 [updateQuestsForClient] Erreur critique`, error);
      return result;
    }
  }

  /**
   * ✅ Mise à jour des statuts de quêtes pour un client
   */
  async updateQuestStatusesForClient(
    client: Client,
    params: { username: string },
    questManager: QuestManager
  ): Promise<EntityUpdateResult> {
    const startTime = Date.now();
    const { username } = params;
    
    this.log(`📊 [updateQuestStatusesForClient] Début mise à jour statuts quêtes`, { client: client.sessionId, username });

    const result: EntityUpdateResult = {
      success: true,
      entityType: 'quest',
      entityCount: 0,
      executionTime: 0,
      errors: [],
      warnings: [],
      metadata: { username, type: 'statuses' }
    };

    try {
      // ✅ Récupération des quêtes
      const availableQuests = await questManager.getAvailableQuests(username);
      const activeQuests = await questManager.getActiveQuests(username);
      
      this.log(`📋 Quêtes pour statuts`, {
        available: availableQuests.length,
        active: activeQuests.length
      });

      // ✅ Calcul des statuts
      const questStatuses: any[] = [];
      
      // Statuts pour les quêtes disponibles
      for (const quest of availableQuests) {
        if (quest.startNpcId) {
          questStatuses.push({
            npcId: quest.startNpcId,
            type: 'questAvailable'
          });
          this.log(`➕ Quête disponible: ${quest.name || quest.id} pour NPC ${quest.startNpcId}`);
        }
      }
      
      // Statuts pour les quêtes actives
      for (const quest of activeQuests) {
        if (quest.status === 'readyToComplete' && quest.endNpcId) {
          questStatuses.push({
            npcId: quest.endNpcId,
            type: 'questReadyToComplete'
          });
          this.log(`🎉 Quête prête: ${quest.name || quest.id} pour NPC ${quest.endNpcId}`);
        } else if (quest.endNpcId) {
          questStatuses.push({
            npcId: quest.endNpcId,
            type: 'questInProgress'
          });
          this.log(`📈 Quête en cours: ${quest.name || quest.id} pour NPC ${quest.endNpcId}`);
        }
      }

      result.entityCount = questStatuses.length;

      // ✅ Envoi des statuts
      if (questStatuses.length > 0) {
        client.send("questStatuses", { questStatuses });
        this.log(`📤 ${questStatuses.length} statuts de quêtes envoyés à ${client.sessionId}`);
      } else {
        this.log(`ℹ️ Aucun statut de quête à envoyer pour ${username}`);
      }

      result.executionTime = Date.now() - startTime;
      this.trackPerformance('updateQuestStatusesForClient', result.executionTime);
      
      return result;

    } catch (error) {
      result.success = false;
      result.executionTime = Date.now() - startTime;
      result.errors.push(`Erreur critique statuts quêtes: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      
      this.log(`💥 [updateQuestStatusesForClient] Erreur critique`, error);
      return result;
    }
  }

  // ===== MÉTHODES DE MISE À JOUR EN BATCH =====

  /**
   * ✅ Mise à jour d'une zone pour plusieurs clients en même temps
   */
  async updateZoneForMultipleClients(
    clients: Client[],
    params: ZoneUpdateParams,
    dependencies: {
      npcManager?: NpcManager;
      objectHandler?: ObjectInteractionHandlers;
      questManager?: QuestManager;
    }
  ): Promise<EntityUpdateResult[]> {
    const startTime = Date.now();
    
    this.log(`🌍 [updateZoneForMultipleClients] Mise à jour batch`, {
      clientCount: clients.length,
      zone: params.zone
    });

    const results: EntityUpdateResult[] = [];

    try {
      // ✅ Traitement en parallèle pour de meilleures performances
      const promises = clients.map(client => 
        this.updateZoneForClient(client, params, dependencies)
      );

      const batchResults = await Promise.allSettled(promises);
      
      batchResults.forEach((promiseResult, index) => {
        if (promiseResult.status === 'fulfilled') {
          results.push(promiseResult.value);
        } else {
          results.push({
            success: false,
            entityType: 'mixed',
            entityCount: 0,
            executionTime: 0,
            errors: [`Erreur client ${clients[index].sessionId}: ${promiseResult.reason}`],
            warnings: []
          });
        }
      });

      const totalTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      
      this.log(`✅ [updateZoneForMultipleClients] Terminé`, {
        totalClients: clients.length,
        successCount,
        failureCount: clients.length - successCount,
        totalTime,
        averageTimePerClient: Math.round(totalTime / clients.length)
      });

      this.trackPerformance('updateZoneForMultipleClients', totalTime);
      
      return results;

    } catch (error) {
      this.log(`💥 [updateZoneForMultipleClients] Erreur critique`, error);
      
      // Retourner des résultats d'erreur pour tous les clients
      return clients.map(client => ({
        success: false,
        entityType: 'mixed' as const,
        entityCount: 0,
        executionTime: Date.now() - startTime,
        errors: [`Erreur batch: ${error instanceof Error ? error.message : 'Erreur inconnue'}`],
        warnings: [] as string[]
      }));
    }
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * ✅ Obtenir les statistiques de performance
   */
  getPerformanceStats(): { [methodName: string]: { totalCalls: number; totalTime: number; averageTime: number } } {
    const stats: { [key: string]: any } = {};
    
    this.performanceStats.forEach((stat, methodName) => {
      stats[methodName] = { ...stat };
    });
    
    return stats;
  }

  /**
   * ✅ Réinitialiser les statistiques de performance
   */
  resetPerformanceStats(): void {
    this.performanceStats.clear();
    this.log(`📊 Statistiques de performance réinitialisées`);
  }

  /**
   * ✅ Obtenir la configuration actuelle
   */
  getConfig(): EntityUpdateConfig {
    return { ...this.config };
  }

  /**
   * ✅ Mettre à jour la configuration
   */
  updateConfig(newConfig: Partial<EntityUpdateConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log(`⚙️ Configuration mise à jour`, { newConfig });
  }

  /**
   * ✅ Nettoyage du service
   */
  cleanup(): void {
    // Nettoyer les batchs en attente
    this.pendingBatches.forEach((batch, key) => {
      clearTimeout(batch.timeout);
    });
    this.pendingBatches.clear();
    
    // Réinitialiser les stats
    this.performanceStats.clear();
    
    this.log(`🧹 EntityUpdateService nettoyé`);
  }

  // ===== MÉTHODES PRIVÉES =====

  /**
   * Logging conditionnel selon la configuration
   */
  private log(message: string, data?: any): void {
    if (this.config.enableDebugLogs) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [EntityUpdateService] ${message}`, data || '');
    }
  }

  /**
   * Suivi des performances
   */
  private trackPerformance(methodName: string, executionTime: number): void {
    if (!this.config.enablePerformanceTracking) return;

    const existing = this.performanceStats.get(methodName);
    if (existing) {
      existing.totalCalls++;
      existing.totalTime += executionTime;
      existing.averageTime = Math.round(existing.totalTime / existing.totalCalls);
    } else {
      this.performanceStats.set(methodName, {
        totalCalls: 1,
        totalTime: executionTime,
        averageTime: executionTime
      });
    }
  }
}

// ===== EXPORT PAR DÉFAUT ET SINGLETON =====

/**
 * Instance par défaut du service (Singleton)
 */
export const entityUpdateService = EntityUpdateService.getInstance();

/**
 * Export par défaut de la classe pour l'instanciation personnalisée
 */
export default EntityUpdateService;
