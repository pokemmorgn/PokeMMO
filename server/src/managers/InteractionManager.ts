// server/src/managers/InteractionManager.ts - VERSION MODULAIRE MULTI-FONCTIONNELLE
// Utilise le nouveau système BaseInteractionManager + modules avec support des capabilities

import { QuestManager } from "./QuestManager";
import { ShopManager } from "./ShopManager";
import { StarterHandlers } from "../handlers/StarterHandlers";
import { InventoryManager } from "./InventoryManager";
import { Player } from "../schema/PokeWorldState";
import { SpectatorManager } from "../battle/modules/broadcast/SpectatorManager";

// ✅ IMPORTS DU NOUVEAU SYSTÈME
import { BaseInteractionManager } from "../interactions/BaseInteractionManager";
import { 
  NpcInteractionModule, 
  NpcInteractionResult,
  NpcCapability,
  NpcChoiceResult
} from "../interactions/modules/NpcInteractionModule";
import { 
  InteractionRequest,
  InteractionResult,
  InteractionContext
} from "../interactions/types/BaseInteractionTypes";

// ✅ INTERFACES ÉTENDUES POUR COMPATIBILITÉ
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

  battleSpectate?: {
    battleId: string;
    battleRoomId: string;
    targetPlayerName: string;
    canWatch: boolean;
    reason?: string;
  };
  
  // ✅ NOUVEAU : Support multi-fonctionnel
  capabilities?: NpcCapability[];
  welcomeMessage?: string;
}

// ✅ NOUVELLE INTERFACE POUR LE CLIENT
export interface NpcCapabilityRequest {
  npcId: number;
  capability: string;
  playerPosition?: { x: number; y: number; mapId: string };
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

  constructor(
    getNpcManager: (zoneName: string) => any, 
    questManager: QuestManager,
    shopManager: ShopManager,
    starterHandlers: StarterHandlers,
    spectatorManager: SpectatorManager
  ) {
    console.log(`🔄 [InteractionManager] Initialisation avec système multi-fonctionnel`);
    
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
      console.log(`🚀 [InteractionManager] Configuration système multi-fonctionnel...`);

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
        logLevel: 'info'
      });

      // 2. Créer et enregistrer le module NPC avec support multi-fonctionnel
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
      console.log(`✅ [InteractionManager] Système multi-fonctionnel initialisé avec succès`);
      console.log(`📦 [InteractionManager] Modules enregistrés: ${this.baseInteractionManager.listModules().join(', ')}`);
      console.log(`🎛️ [InteractionManager] Support capabilities: ACTIVÉ`);

    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur initialisation multi-fonctionnelle:`, error);
      this.isInitialized = false;
    }
  }

  // ✅ MÉTHODE PRINCIPALE - INTERFACE PUBLIQUE IDENTIQUE (avec détection auto capabilities)
  async handleNpcInteraction(player: Player, npcId: number): Promise<NpcInteractionResult> {
    console.log(`🔍 [InteractionManager] === INTERACTION NPC ${npcId} (AUTO-DETECT) ===`);
    console.log(`👤 Player: ${player.name}, Zone: ${player.currentZone}`);

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
      // ✅ CONSTRUIRE LA REQUÊTE POUR LE NOUVEAU SYSTÈME (sans capability spécifique)
      const request: InteractionRequest = {
        type: 'npc',
        targetId: npcId,
        position: {
          x: player.x,
          y: player.y,
          mapId: player.currentZone
        },
        data: {
          npcId: npcId
          // Pas de capability → Détection automatique
        },
        timestamp: Date.now()
      };

      // ✅ TRAITER VIA LE NOUVEAU SYSTÈME
      const result = await this.baseInteractionManager.processInteraction(player, request);

      // ✅ CONVERTIR LE RÉSULTAT AU FORMAT EXISTANT + NOUVEAU
      const npcResult: NpcInteractionResult = {
        type: result.type,
        message: result.message,
        
        // Données spécifiques NPCs du nouveau système
        shopId: result.data?.shopId,
        shopData: result.data?.shopData,
        lines: result.lines,
        availableQuests: result.data?.availableQuests,
        questRewards: result.data?.questRewards,
        questProgress: result.data?.questProgress,
        npcId: result.data?.npcId,
        npcName: result.data?.npcName,
        questId: result.data?.questId,
        questName: result.data?.questName,
        starterData: result.data?.starterData,
        starterEligible: result.data?.starterEligible,
        starterReason: result.data?.starterReason,
        battleSpectate: result.data?.battleSpectate,
        
        // ✅ NOUVEAU : Données multi-fonctionnelles
        capabilities: result.data?.capabilities,
        welcomeMessage: result.data?.welcomeMessage
      };

      // ✅ LOGGING AMÉLIORÉ POUR MULTI-FONCTIONNEL
      if (result.type === 'npc_choice') {
        const capCount = result.data?.capabilities?.length || 0;
        console.log(`🎛️ [InteractionManager] Interface de choix générée (${capCount} options)`);
      } else {
        console.log(`✅ [InteractionManager] Interaction directe traitée`);
      }
      
      console.log(`📊 [InteractionManager] Résultat: ${result.type}, Module: ${result.moduleUsed}, Temps: ${result.processingTime}ms`);

      return npcResult;

    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur système modulaire:`, error);
      
      // Retour d'erreur au format existant
      return {
        type: "error",
        message: error instanceof Error ? error.message : "Erreur inconnue lors de l'interaction"
      };
    }
  }

  // ✅ NOUVELLE MÉTHODE PUBLIQUE : INTERACTION AVEC CAPABILITY SPÉCIFIQUE
  async handleNpcCapabilityInteraction(
    player: Player, 
    request: NpcCapabilityRequest
  ): Promise<NpcInteractionResult> {
    
    console.log(`🎯 [InteractionManager] === INTERACTION CAPABILITY SPÉCIFIQUE ===`);
    console.log(`👤 Player: ${player.name}, NPC: ${request.npcId}, Capability: ${request.capability}`);

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
      // ✅ CONSTRUIRE LA REQUÊTE AVEC CAPABILITY SPÉCIFIQUE
      const interactionRequest: InteractionRequest = {
        type: 'npc',
        targetId: request.npcId,
        position: request.playerPosition || {
          x: player.x,
          y: player.y,
          mapId: player.currentZone
        },
        data: {
          npcId: request.npcId,
          capability: request.capability  // ✅ NOUVEAU : Capability demandée
        },
        timestamp: Date.now()
      };

      // ✅ TRAITER VIA LE NOUVEAU SYSTÈME
      const result = await this.baseInteractionManager.processInteraction(player, interactionRequest);

      // ✅ CONVERTIR LE RÉSULTAT
      const npcResult: NpcInteractionResult = {
        type: result.type,
        message: result.message,
        
        // Données spécifiques NPCs
        shopId: result.data?.shopId,
        shopData: result.data?.shopData,
        lines: result.lines,
        availableQuests: result.data?.availableQuests,
        questRewards: result.data?.questRewards,
        questProgress: result.data?.questProgress,
        npcId: result.data?.npcId,
        npcName: result.data?.npcName,
        questId: result.data?.questId,
        questName: result.data?.questName,
        starterData: result.data?.starterData,
        starterEligible: result.data?.starterEligible,
        starterReason: result.data?.starterReason,
        battleSpectate: result.data?.battleSpectate,
        
        // Données multi-fonctionnelles
        capabilities: result.data?.capabilities,
        welcomeMessage: result.data?.welcomeMessage
      };

      console.log(`✅ [InteractionManager] Capability ${request.capability} exécutée`);
      console.log(`📊 [InteractionManager] Résultat: ${result.type}, Temps: ${result.processingTime}ms`);

      return npcResult;

    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur capability ${request.capability}:`, error);
      
      return {
        type: "error",
        message: error instanceof Error ? error.message : "Erreur lors de l'exécution de l'action"
      };
    }
  }

  // ✅ NOUVELLE MÉTHODE : RÉCUPÉRER LES CAPABILITIES D'UN NPC (sans interaction)
  async getNpcCapabilities(player: Player, npcId: number): Promise<NpcCapability[]> {
    console.log(`🔍 [InteractionManager] Récupération capabilities NPC ${npcId}`);

    if (!this.isInitialized || !this.npcModule) {
      console.warn(`⚠️ [InteractionManager] Système non initialisé pour getNpcCapabilities`);
      return [];
    }

    try {
      // Analyser les capabilities sans déclencher d'interaction
      const npcManager = this.getNpcManager(player.currentZone);
      if (!npcManager) {
        return [];
      }

      const npc = npcManager.getNpcById(npcId);
      if (!npc) {
        return [];
      }

      // Utiliser la méthode d'analyse du module
      // Note: On devrait exposer cette méthode dans le module pour éviter la duplication
      const capabilities = await this.npcModule.debugNpcCapabilities(player, npcId);
      
      console.log(`🎛️ [InteractionManager] ${capabilities?.length || 0} capabilities trouvées`);
      return capabilities || [];

    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur getNpcCapabilities:`, error);
      return [];
    }
  }

  // ✅ MÉTHODES EXISTANTES CONSERVÉES - DÉLÈGUENT AU MODULE NPC

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

  // ✅ MÉTHODES QUÊTES CONSERVÉES - DÉLÈGUENT AU MODULE NPC

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

  // ✅ MÉTHODES UTILITAIRES CONSERVÉES

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

  // ✅ NOUVELLES MÉTHODES POUR DEBUGGING/MONITORING MULTI-FONCTIONNEL

  /**
   * Obtenir les statistiques du système modulaire avec support multi-fonctionnel
   */
  getModularSystemStats(): any {
    if (!this.isInitialized || !this.baseInteractionManager) {
      return {
        initialized: false,
        error: "Système modulaire non initialisé"
      };
    }

    const stats = this.baseInteractionManager.getStats();
    const config = this.baseInteractionManager.getConfig();
    const handlerStats = this.npcModule?.getHandlerStats();

    return {
      initialized: true,
      version: "3.0.0",
      multiFunction: true,
      stats: stats,
      config: config,
      modules: this.baseInteractionManager.listModules(),
      capabilities: {
        autoDetection: true,
        choiceInterface: true,
        specificCapability: true,
        prioritySystem: true
      },
      handlers: handlerStats
    };
  }

  /**
   * Debug des capabilities d'un NPC spécifique
   */
  async debugNpcCapabilities(player: Player, npcId: number): Promise<void> {
    console.log(`🔍 [InteractionManager] === DEBUG CAPABILITIES NPC ${npcId} ===`);
    
    if (!this.isInitialized || !this.npcModule) {
      console.log(`❌ Système non initialisé`);
      return;
    }

    try {
      await this.npcModule.debugNpcCapabilities(player, npcId);
    } catch (error) {
      console.error(`❌ Erreur debug capabilities:`, error);
    }
  }

  /**
   * Test d'une capability spécifique sans l'exécuter
   */
  async testNpcCapability(player: Player, npcId: number, capability: string): Promise<{
    available: boolean;
    reason?: string;
    details?: any;
  }> {
    console.log(`🧪 [InteractionManager] Test capability ${capability} pour NPC ${npcId}`);
    
    if (!this.isInitialized || !this.npcModule) {
      return {
        available: false,
        reason: "Système non initialisé"
      };
    }

    try {
      const capabilities = await this.getNpcCapabilities(player, npcId);
      const targetCapability = capabilities.find(c => c.type === capability);
      
      if (!targetCapability) {
        return {
          available: false,
          reason: "Capability non supportée par ce NPC"
        };
      }
      
      return {
        available: targetCapability.available,
        reason: targetCapability.reason,
        details: {
          label: targetCapability.label,
          description: targetCapability.description,
          priority: targetCapability.priority,
          handler: targetCapability.handler
        }
      };
      
    } catch (error) {
      console.error(`❌ Erreur test capability:`, error);
      return {
        available: false,
        reason: "Erreur lors du test"
      };
    }
  }

  /**
   * Reinitialiser le système modulaire (pour debugging)
   */
  async reinitializeModularSystem(): Promise<boolean> {
    try {
      console.log(`🔄 [InteractionManager] Réinitialisation système multi-fonctionnel...`);
      
      if (this.baseInteractionManager) {
        await this.baseInteractionManager.cleanup();
      }
      
      this.isInitialized = false;
      await this.initializeModularSystem();
      
      return this.isInitialized;
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur réinitialisation:`, error);
      return false;
    }
  }

  /**
   * Activer/désactiver le mode debug
   */
  setDebugMode(enabled: boolean): void {
    if (this.baseInteractionManager) {
      this.baseInteractionManager.updateConfig({ debug: enabled });
      console.log(`🔧 [InteractionManager] Mode debug: ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
    }
  }

  /**
   * Lister toutes les capabilities disponibles dans le système
   */
  getAvailableCapabilityTypes(): string[] {
    return [
      'merchant',
      'quest_giver', 
      'quest_ender',
      'healer',
      'starter',
      'dialogue',
      'transport',
      'service',
      'minigame',
      'spectate'
    ];
  }

  // ✅ NETTOYAGE LORS DE LA DESTRUCTION
  async cleanup(): Promise<void> {
    console.log(`🧹 [InteractionManager] Nettoyage du système multi-fonctionnel...`);
    
    if (this.baseInteractionManager) {
      await this.baseInteractionManager.cleanup();
    }
    
    this.isInitialized = false;
    console.log(`✅ [InteractionManager] Nettoyage terminé`);
  }
}
