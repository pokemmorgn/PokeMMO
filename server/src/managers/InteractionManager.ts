// server/src/managers/InteractionManager.ts - VERSION MODULAIRE AVEC TIMER
// ✅ Ajout de la configuration du timer centralisé

import { QuestManager } from "./QuestManager";
import { ShopManager } from "./ShopManager";
import { StarterHandlers } from "../handlers/StarterHandlers";
import { InventoryManager } from "./InventoryManager";
import { Player } from "../schema/PokeWorldState";
import { SpectatorManager } from "../battle/modules/broadcast/SpectatorManager";

// ✅ IMPORTS DU NOUVEAU SYSTÈME
import { BaseInteractionManager } from "../interactions/BaseInteractionManager";
import { NpcInteractionModule } from "../interactions/modules/NpcInteractionModule";
import { 
  InteractionRequest,
  InteractionResult,
  InteractionContext
} from "../interactions/types/BaseInteractionTypes";

// ✅ INTERFACE CORRIGÉE POUR COMPATIBILITÉ avec Interface Unifiée
export interface NpcInteractionResult {
  type: string;
  message?: string;
  shopId?: string;
  shopData?: any;
  lines?: string[];
  availableQuests?: any[];
  questRewards?: any[];
  questProgress?: any[];
  npcId?: number;
  npcName?: string;
  questId?: string;
  questName?: string;
  starterData?: any;
  starterEligible?: boolean;
  starterReason?: string;

  // ✅ NOUVEAUX CHAMPS : Interface Unifiée (ajoutés)
  isUnifiedInterface?: boolean;
  capabilities?: string[];
  contextualData?: {
    hasShop: boolean;
    hasQuests: boolean;
    hasHealing: boolean;
    defaultAction: string;
    quickActions: Array<{
      id: string;
      label: string;
      action: string;
      enabled: boolean;
    }>;
  };
  unifiedInterface?: any;
  unifiedMode?: boolean;

  battleSpectate?: {
    battleId: string;
    battleRoomId: string;
    targetPlayerName: string;
    canWatch: boolean;
    reason?: string;
  };
}

export class InteractionManager {
  // ✅ DÉPENDANCES EXISTANTES CONSERVÉES
  private getNpcManager: (zoneName: string) => any;
  private questManager: QuestManager;
  private shopManager: ShopManager;
  private starterHandlers: StarterHandlers;
  private spectatorManager: SpectatorManager;

  // ✅ NOUVEAU SYSTÈME MODULAIRE
  private baseInteractionManager: BaseInteractionManager;
  private npcModule: NpcInteractionModule;
  private isInitialized: boolean = false;
  
  // 🔧 NOUVEAU : Références pour le timer
  private objectManager: any = null;
  private npcManagers: Map<string, any> = new Map();
  private room: any = null;

  constructor(
    getNpcManager: (zoneName: string) => any, 
    questManager: QuestManager,
    shopManager: ShopManager,
    starterHandlers: StarterHandlers,
    spectatorManager: SpectatorManager
  ) {
    console.log(`🔄 [InteractionManager] Initialisation avec système modulaire + timer`);
    
    // ✅ CONSERVATION DES DÉPENDANCES EXISTANTES
    this.getNpcManager = getNpcManager;
    this.questManager = questManager;
    this.shopManager = shopManager;
    this.starterHandlers = starterHandlers;
    this.spectatorManager = spectatorManager;

    // ✅ INITIALISATION DU NOUVEAU SYSTÈME
    this.initializeModularSystem();
  }

  private async initializeModularSystem(): Promise<void> {
    try {
      console.log(`🚀 [InteractionManager] Configuration système modulaire...`);

      // 1. Créer BaseInteractionManager avec configuration
      this.baseInteractionManager = new BaseInteractionManager({
        maxDistance: 64,
        cooldowns: {
          npc: 500,
          object: 200,
          environment: 1000,
          player: 2000,
          puzzle: 0
        },
        debug: process.env.NODE_ENV === 'development',
        logLevel: 'info',
        
        // 🔧 NOUVEAU : Configuration timer centralisé
        worldUpdateTimer: {
          enabled: process.env.WORLD_TIMER_ENABLED !== 'false',
          interval: parseInt(process.env.WORLD_TIMER_INTERVAL || '5000'),
          includeQuestStatuses: true,
          includeGameObjects: true,
          includeNpcUpdates: true,
          includePlayerUpdates: false,
          debugMode: process.env.NODE_ENV === 'development'
        }
      });

      // 2. Créer et enregistrer le module NPC
      this.npcModule = new NpcInteractionModule(
        this.getNpcManager,
        this.questManager,
        this.shopManager,
        this.starterHandlers,
        this.spectatorManager
      );

      this.baseInteractionManager.registerModule(this.npcModule);

      // 3. Initialiser le système
      await this.baseInteractionManager.initialize();

      this.isInitialized = true;
      console.log(`✅ [InteractionManager] Système modulaire initialisé avec succès`);
      console.log(`📦 [InteractionManager] Modules enregistrés: ${this.baseInteractionManager.listModules().join(', ')}`);

    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur initialisation modulaire:`, error);
      this.isInitialized = false;
    }
  }

  // 🔧 NOUVELLES MÉTHODES : Configuration du timer

  /**
   * 🔧 Configurer les gestionnaires supplémentaires et la room pour le timer
   */
  setAdditionalManagers(config: {
    objectManager?: any;
    npcManagers?: Map<string, any>;
    room?: any;
  }): void {
    console.log('🔧 [InteractionManager] === CONFIGURATION GESTIONNAIRES TIMER ===');
    console.log('🔧 [InteractionManager] Gestionnaires reçus:', {
      objectManager: !!config.objectManager,
      npcManagers: config.npcManagers?.size || 0,
      room: !!config.room
    });

    // Stocker les références
    if (config.objectManager) this.objectManager = config.objectManager;
    if (config.npcManagers) this.npcManagers = config.npcManagers;
    if (config.room) this.room = config.room;

    // 🔧 Configurer le timer si le BaseInteractionManager est prêt
    if (this.baseInteractionManager && this.isInitialized) {
      this.configureTimer();
    } else {
      console.log('⏳ [InteractionManager] BaseInteractionManager pas encore prêt, configuration timer différée');
      
      // Réessayer après un délai
      setTimeout(() => {
        if (this.isInitialized) {
          this.configureTimer();
        }
      }, 1000);
    }
  }

  /**
   * 🔧 Configurer le timer avec tous les gestionnaires
   */
  private configureTimer(): void {
    console.log('⏰ [InteractionManager] === CONFIGURATION TIMER ===');
    
    if (!this.baseInteractionManager) {
      console.error('❌ [InteractionManager] BaseInteractionManager non disponible');
      return;
    }

    // Préparer tous les gestionnaires pour le timer
    const timerManagers = {
      questManager: this.questManager,
      objectManager: this.objectManager,
      npcManagers: this.npcManagers,
      room: this.room
    };

    console.log('🔧 [InteractionManager] Configuration timer avec gestionnaires:', {
      questManager: !!timerManagers.questManager,
      objectManager: !!timerManagers.objectManager,
      npcManagers: timerManagers.npcManagers?.size || 0,
      room: !!timerManagers.room
    });

    // 🚀 Configurer le timer centralisé
    this.baseInteractionManager.setTimerManagers(timerManagers);
    
    console.log('✅ [InteractionManager] Timer centralisé configuré');
  }

  /**
   * 📊 Obtenir les stats du timer
   */
  getTimerStats() {
    if (this.baseInteractionManager) {
      return this.baseInteractionManager.getWorldUpdateTimerStats();
    }
    return null;
  }

  /**
   * 🛑 Arrêter le timer manuellement
   */
  stopTimer(): void {
    if (this.baseInteractionManager) {
      this.baseInteractionManager.stopWorldUpdateTimer();
    }
  }

  /**
   * 🚀 Démarrer le timer manuellement
   */
  startTimer(): void {
    if (this.baseInteractionManager) {
      this.baseInteractionManager.startWorldUpdateTimer();
    }
  }

  // ✅ MÉTHODES EXISTANTES INCHANGÉES

  async handleNpcInteraction(
    player: Player, 
    npcId: number, 
    additionalData?: any
  ): Promise<NpcInteractionResult> {
    console.log(`🔍 [InteractionManager] === INTERACTION NPC ${npcId} ===`);
    console.log(`👤 Player: ${player.name}, Zone: ${player.currentZone}`);
    
    if (additionalData) {
      console.log(`🌐 [InteractionManager] Données supplémentaires:`, {
        playerLanguage: additionalData.playerLanguage,
        playerPosition: additionalData.playerPosition,
        zone: additionalData.zone,
        sessionId: additionalData.sessionId,
        keys: Object.keys(additionalData)
      });
    }

    // Vérification que le système modulaire est prêt
    if (!this.isInitialized) {
      console.warn(`⚠️ [InteractionManager] Système modulaire non initialisé, réessai...`);
      await this.initializeModularSystem();
      
      if (!this.isInitialized) {
        return { 
          type: "error", 
          message: "Système d'interaction temporairement indisponible." 
        };
      }
    }

    try {
      const request: InteractionRequest = {
        type: 'npc',
        targetId: npcId,
        position: {
          x: player.x,
          y: player.y,
          mapId: player.currentZone
        },
        data: {
          npcId: npcId,
          ...additionalData
        },
        timestamp: Date.now()
      };

      console.log(`📤 [InteractionManager] Requête envoyée au module:`, {
        type: request.type,
        targetId: request.targetId,
        dataKeys: Object.keys(request.data),
        playerLanguage: request.data.playerLanguage
      });

      const result = await this.baseInteractionManager.processInteraction(player, request);

      const npcModuleResult = result as any;
      const resultData = result.data as any;

      console.log(`🔧 [InteractionManager] Résultat brut du module:`, {
        type: result.type,
        npcId: npcModuleResult.npcId,
        npcIdType: typeof npcModuleResult.npcId,
        npcName: npcModuleResult.npcName,
        isUnifiedInterface: npcModuleResult.isUnifiedInterface,
        capabilities: npcModuleResult.capabilities?.length || 0,
        contextualData: !!npcModuleResult.contextualData
      });

      const npcResult: NpcInteractionResult = {
        type: result.type,
        message: result.message,
        
        npcId: npcModuleResult.npcId ?? resultData?.npcId,
        npcName: npcModuleResult.npcName ?? resultData?.npcName,
        
        isUnifiedInterface: npcModuleResult.isUnifiedInterface,
        capabilities: npcModuleResult.capabilities,
        contextualData: npcModuleResult.contextualData,
        unifiedInterface: npcModuleResult.unifiedInterface,
        unifiedMode: npcModuleResult.unifiedMode,
        
        shopId: npcModuleResult.shopId ?? resultData?.shopId,
        shopData: npcModuleResult.shopData ?? resultData?.shopData,
        lines: npcModuleResult.lines ?? resultData?.lines,
        availableQuests: npcModuleResult.availableQuests ?? resultData?.availableQuests,
        questRewards: npcModuleResult.questRewards ?? resultData?.questRewards,
        questProgress: npcModuleResult.questProgress ?? resultData?.questProgress,
        questId: npcModuleResult.questId ?? resultData?.questId,
        questName: npcModuleResult.questName ?? resultData?.questName,
        starterData: npcModuleResult.starterData ?? resultData?.starterData,
        starterEligible: npcModuleResult.starterEligible ?? resultData?.starterEligible,
        starterReason: npcModuleResult.starterReason ?? resultData?.starterReason,
        battleSpectate: npcModuleResult.battleSpectate ?? resultData?.battleSpectate
      };

      console.log(`🔧 [InteractionManager] Résultat final pour envoi:`, {
        type: npcResult.type,
        npcId: npcResult.npcId,
        npcName: npcResult.npcName,
        isUnifiedInterface: npcResult.isUnifiedInterface,
        capabilities: npcResult.capabilities?.length || 0,
        contextualData: !!npcResult.contextualData
      });

      console.log(`✅ [InteractionManager] Interaction traitée via système modulaire`);
      console.log(`📊 [InteractionManager] Résultat: ${result.type}, Module: ${result.moduleUsed}, Temps: ${result.processingTime}ms`);
      console.log(`📤 Envoi résultat interaction: ${npcResult.type}`);

      return npcResult;

    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur système modulaire:`, error);
      
      return {
        type: "error",
        message: error instanceof Error ? error.message : "Erreur inconnue lors de l'interaction"
      };
    }
  }

  // ✅ TOUTES LES AUTRES MÉTHODES EXISTANTES RESTENT INCHANGÉES...
  
  async handleShopTransaction(
    player: Player, 
    shopId: string, 
    action: 'buy' | 'sell',
    itemId: string,
    quantity: number
  ): Promise<{
    success: boolean;
    message: string;
    newGold?: number;
    itemsChanged?: any[];
    shopStockChanged?: any[];
  }> {
    console.log(`💰 [InteractionManager] Transaction shop via module`);
    
    if (!this.isInitialized || !this.npcModule) {
      return {
        success: false,
        message: "Système de boutique temporairement indisponible"
      };
    }

    return this.npcModule.handleShopTransaction(player, shopId, action, itemId, quantity);
  }

  async handlePlayerInteraction(
    spectatorPlayer: Player, 
    targetPlayerId: string,
    targetPlayerPosition: { x: number; y: number; mapId: string }
  ): Promise<NpcInteractionResult> {
    console.log(`👁️ [InteractionManager] Interaction joueur via module`);
    
    if (!this.isInitialized || !this.npcModule) {
      return {
        type: "error",
        message: "Système d'interaction temporairement indisponible"
      };
    }

    return this.npcModule.handlePlayerInteraction(spectatorPlayer, targetPlayerId, targetPlayerPosition);
  }

  async confirmSpectatorJoin(
    spectatorId: string,
    battleId: string,
    battleRoomId: string,
    spectatorPosition: { x: number; y: number; mapId: string }
  ): Promise<boolean> {
    console.log(`✅ [InteractionManager] Confirmation spectateur ${spectatorId}`);
    
    return this.spectatorManager.addSpectator(
      spectatorId,
      battleId,
      battleRoomId,
      spectatorPosition
    );
  }

  removeSpectator(spectatorId: string): {
    removed: boolean;
    shouldLeaveBattleRoom: boolean;
    battleRoomId?: string;
  } {
    console.log(`👋 [InteractionManager] Retrait spectateur ${spectatorId}`);
    return this.spectatorManager.removeSpectator(spectatorId);
  }

  isPlayerInBattle(playerId: string): boolean {
    return this.spectatorManager.isPlayerInBattle(playerId);
  }

  getBattleSpectatorCount(battleId: string): number {
    return this.spectatorManager.getBattleSpectatorCount(battleId);
  }

  async handleQuestStart(username: string, questId: string): Promise<{ success: boolean; message: string; quest?: any }> {
    console.log(`🎯 [InteractionManager] Démarrage quête via module`);
    
    if (!this.isInitialized || !this.npcModule) {
      return {
        success: false,
        message: "Système de quêtes temporairement indisponible"
      };
    }

    return this.npcModule.handleQuestStart(username, questId);
  }

  async updatePlayerProgress(username: string, eventType: string, data: any): Promise<any[]> {
    try {
      switch (eventType) {
        case 'collect':
          return await this.questManager.updateQuestProgress(username, {
            type: 'collect',
            targetId: data.itemId,
            amount: data.amount || 1
          });

        case 'defeat':
          return await this.questManager.updateQuestProgress(username, {
            type: 'defeat',
            pokemonId: data.pokemonId,
            amount: 1
          });

        case 'reach':
          return await this.questManager.updateQuestProgress(username, {
            type: 'reach',
            targetId: data.zoneId,
            location: { x: data.x, y: data.y, map: data.map }
          });

        case 'deliver':
          return await this.questManager.updateQuestProgress(username, {
            type: 'deliver',
            npcId: data.npcId,
            targetId: data.targetId
          });

        default:
          return [];
      }
    } catch (error) {
      console.error("❌ [InteractionManager] Erreur mise à jour progression:", error);
      return [];
    }
  }

  async getQuestStatuses(username: string): Promise<any[]> {
    try {
      const availableQuests = await this.questManager.getAvailableQuests(username);
      const activeQuests = await this.questManager.getActiveQuests(username);
      
      const questStatuses: any[] = [];
      
      for (const quest of availableQuests) {
        if (quest.startNpcId) {
          questStatuses.push({
            npcId: quest.startNpcId,
            type: 'questAvailable'
          });
        }
      }
      
      for (const quest of activeQuests) {
        if (quest.status === 'readyToComplete' && quest.endNpcId) {
          questStatuses.push({
            npcId: quest.endNpcId,
            type: 'questReadyToComplete'
          });
        }
        else if (quest.endNpcId) {
          questStatuses.push({
            npcId: quest.endNpcId,
            type: 'questInProgress'
          });
        }
      }
      
      return questStatuses;
    } catch (error) {
      console.error("❌ [InteractionManager] Erreur getQuestStatuses:", error);
      return [];
    }
  }

  async giveItemToPlayer(username: string, itemId: string, quantity: number = 1): Promise<boolean> {
    try {
      await InventoryManager.addItem(username, itemId, quantity);
      console.log(`✅ [InteractionManager] Donné ${quantity}x ${itemId} à ${username}`);
      return true;
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur don d'objet:`, error);
      return false;
    }
  }

  async takeItemFromPlayer(username: string, itemId: string, quantity: number = 1): Promise<boolean> {
    try {
      const success = await InventoryManager.removeItem(username, itemId, quantity);
      if (success) {
        console.log(`✅ [InteractionManager] Retiré ${quantity}x ${itemId} à ${username}`);
      }
      return success;
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur retrait d'objet:`, error);
      return false;
    }
  }

  async playerHasItem(username: string, itemId: string, quantity: number = 1): Promise<boolean> {
    try {
      const count = await InventoryManager.getItemCount(username, itemId);
      return count >= quantity;
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur vérification d'objet:`, error);
      return false;
    }
  }

  async giveQuestReward(username: string, reward: {
    type: 'item' | 'gold' | 'experience';
    itemId?: string;
    amount: number;
  }): Promise<boolean> {
    try {
      switch (reward.type) {
        case 'item':
          if (reward.itemId) {
            return await this.giveItemToPlayer(username, reward.itemId, reward.amount);
          }
          return false;

        case 'gold':
          console.log(`💰 [InteractionManager] Donner ${reward.amount} or à ${username} (non implémenté)`);
          return true;

        case 'experience':
          console.log(`⭐ [InteractionManager] Donner ${reward.amount} XP à ${username} (non implémenté)`);
          return true;

        default:
          console.warn(`⚠️ [InteractionManager] Type de récompense inconnu: ${reward.type}`);
          return false;
      }
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur giveQuestReward:`, error);
      return false;
    }
  }

  getModularSystemStats(): any {
    if (!this.isInitialized || !this.baseInteractionManager) {
      return {
        initialized: false,
        error: "Système modulaire non initialisé"
      };
    }

    const stats = this.baseInteractionManager.getStats();
    const config = this.baseInteractionManager.getConfig();

    return {
      initialized: true,
      stats: stats,
      config: config,
      modules: this.baseInteractionManager.listModules(),
      timer: this.getTimerStats() // 🔧 NOUVEAU : Stats timer
    };
  }

  async reinitializeModularSystem(): Promise<boolean> {
    try {
      console.log(`🔄 [InteractionManager] Réinitialisation système modulaire...`);
      
      if (this.baseInteractionManager) {
        await this.baseInteractionManager.cleanup();
      }
      
      this.isInitialized = false;
      await this.initializeModularSystem();
      
      // 🔧 NOUVEAU : Reconfigurer le timer après réinitialisation
      if (this.isInitialized && (this.objectManager || this.npcManagers.size > 0 || this.room)) {
        this.configureTimer();
      }
      
      return this.isInitialized;
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur réinitialisation:`, error);
      return false;
    }
  }

  setDebugMode(enabled: boolean): void {
    if (this.baseInteractionManager) {
      this.baseInteractionManager.updateConfig({ debug: enabled });
      console.log(`🔧 [InteractionManager] Mode debug: ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
    }
  }

  async cleanup(): Promise<void> {
    console.log(`🧹 [InteractionManager] Nettoyage du système modulaire...`);
    
    if (this.baseInteractionManager) {
      await this.baseInteractionManager.cleanup();
    }
    
    this.isInitialized = false;
    console.log(`✅ [InteractionManager] Nettoyage terminé`);
  }
}
