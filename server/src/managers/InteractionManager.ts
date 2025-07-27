// server/src/managers/InteractionManager.ts - VERSION MODULAIRE CORRIGÉE
// ✅ Interface Unifiée : Champs correctement copiés depuis result vers npcResult

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

  constructor(
    getNpcManager: (zoneName: string) => any, 
    questManager: QuestManager,
    shopManager: ShopManager,
    starterHandlers: StarterHandlers,
    spectatorManager: SpectatorManager
  ) {
    console.log(`🔄 [InteractionManager] Initialisation avec système modulaire`);
    
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
        logLevel: 'info'
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
      
      // En cas d'erreur, on pourrait fallback sur l'ancien système
      // Mais pour l'instant on log juste l'erreur
    }
  }

  // ✅ MÉTHODE PRINCIPALE CORRIGÉE - Copie correcte des champs Interface Unifiée
async handleNpcInteraction(
  player: Player, 
  npcId: number,
  options?: { userId?: string; sessionId?: string }  // ✅ NOUVEAU : support userId/sessionId
): Promise<NpcInteractionResult> {
  console.log(`🔍 [InteractionManager] === INTERACTION NPC ${npcId} ===`);
  console.log(`👤 Player: ${player.name}, Zone: ${player.currentZone}`);
  console.log(`🆔 UserId: ${options?.userId || 'N/A'}, SessionId: ${options?.sessionId || 'N/A'}`);

  // Vérification que le système modulaire est prêt
  if (!this.isInitialized) {
    console.warn(`⚠️ [InteractionManager] Système modulaire non initialisé, réessai...`);
    await this.initializeModularSystem();
    
    if (!this.isInitialized) {
      return { 
        type: "error", 
        message: "Système d'interaction temporairement indisponible.",
        // ✅ NOUVEAU : Champs requis pour NpcInteractionResult
        npcId: npcId,
        npcName: `NPC #${npcId}`,
        isUnifiedInterface: false,
        capabilities: [],
        contextualData: {
          hasShop: false,
          hasQuests: false,
          hasHealing: false,
          defaultAction: 'dialogue',
          quickActions: []
        }
      };
    }
  }

  try {
    // ✅ CONSTRUIRE LA REQUÊTE POUR LE NOUVEAU SYSTÈME avec userId/sessionId
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
        // ✅ NOUVEAU : Ajouter userId/sessionId dans les données de la requête
        userId: options?.userId,
        sessionId: options?.sessionId
      },
      timestamp: Date.now()
    };

    // ✅ NOUVEAU : Créer un contexte enrichi avec userId/sessionId pour le module
    const contextMetadata = {
      userId: options?.userId,
      sessionId: options?.sessionId,
      source: 'interaction_manager',
      timestamp: Date.now()
    };

    console.log(`🔗 [InteractionManager] Passage userId ${options?.userId} au système modulaire`);

    // ✅ TRAITER VIA LE NOUVEAU SYSTÈME avec métadonnées enrichies
    const result = await this.baseInteractionManager.processInteraction(
      player, 
      request,
      contextMetadata  // ✅ NOUVEAU : Passer les métadonnées (userId, sessionId)
    );

    // ✅ CASTING SÉCURISÉ vers le type NPC du module
    const npcModuleResult = result as any; // Casting pour accéder aux propriétés étendues
    const resultData = result.data as any; // Casting pour result.data aussi

    // ✅ DEBUG AVANT CONVERSION
    console.log(`🔧 [InteractionManager] Résultat brut du module:`, {
      type: result.type,
      npcId: npcModuleResult.npcId,
      npcIdType: typeof npcModuleResult.npcId,
      npcName: npcModuleResult.npcName,
      isUnifiedInterface: npcModuleResult.isUnifiedInterface,
      capabilities: npcModuleResult.capabilities?.length || 0,
      contextualData: !!npcModuleResult.contextualData,
      userId: options?.userId
    });

    // ✅ CONVERSION CORRIGÉE - Utiliser le casting pour accéder aux propriétés étendues
    const npcResult: NpcInteractionResult = {
      type: result.type,
      message: result.message,
      
      // ✅ CORRIGÉ : Utiliser le casting pour accéder aux champs NPC
      npcId: npcModuleResult.npcId ?? resultData?.npcId ?? npcId,
      npcName: npcModuleResult.npcName ?? resultData?.npcName ?? `NPC #${npcId}`,
      
      // ✅ NOUVEAUX CHAMPS : Interface unifiée (depuis casting) avec fallbacks
      isUnifiedInterface: npcModuleResult.isUnifiedInterface ?? false,
      capabilities: npcModuleResult.capabilities ?? ['dialogue'],
      contextualData: npcModuleResult.contextualData ?? {
        hasShop: false,
        hasQuests: false,
        hasHealing: false,
        defaultAction: 'dialogue',
        quickActions: []
      },
      unifiedInterface: npcModuleResult.unifiedInterface,
      unifiedMode: npcModuleResult.unifiedMode,
      
      // Données spécifiques NPCs (depuis casting avec fallback)
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
      battleSpectate: npcModuleResult.battleSpectate ?? resultData?.battleSpectate,
      
      // ✅ NOUVEAU : Données IA si présentes
      isIntelligentResponse: npcModuleResult.isIntelligentResponse,
      intelligenceUsed: npcModuleResult.intelligenceUsed,
      aiAnalysisConfidence: npcModuleResult.aiAnalysisConfidence,
      personalizedLevel: npcModuleResult.personalizedLevel,
      relationshipLevel: npcModuleResult.relationshipLevel,
      proactiveHelp: npcModuleResult.proactiveHelp,
      followUpQuestions: npcModuleResult.followUpQuestions,
      tracking: npcModuleResult.tracking
    };

    // ✅ DEBUG APRÈS CONVERSION
    console.log(`🔧 [InteractionManager] Résultat final pour envoi:`, {
      type: npcResult.type,
      npcId: npcResult.npcId,
      npcName: npcResult.npcName,
      isUnifiedInterface: npcResult.isUnifiedInterface,
      capabilities: npcResult.capabilities?.length || 0,
      contextualData: !!npcResult.contextualData,
      intelligenceUsed: npcResult.intelligenceUsed,
      userId: options?.userId
    });

    console.log(`✅ [InteractionManager] Interaction traitée via système modulaire avec userId ${options?.userId}`);
    console.log(`📊 [InteractionManager] Résultat: ${result.type}, Module: ${result.moduleUsed}, Temps: ${result.processingTime}ms`);
    console.log(`📤 Envoi résultat interaction: ${npcResult.type}`);

    return npcResult;

  } catch (error) {
    console.error(`❌ [InteractionManager] Erreur système modulaire:`, error);
    
    // Retour d'erreur au format existant avec champs requis
    return {
      type: "error",
      message: error instanceof Error ? error.message : "Erreur inconnue lors de l'interaction",
      // ✅ NOUVEAU : Champs requis même en cas d'erreur
      npcId: npcId,
      npcName: `NPC #${npcId}`,
      isUnifiedInterface: false,
      capabilities: [],
      contextualData: {
        hasShop: false,
        hasQuests: false,
        hasHealing: false,
        defaultAction: 'dialogue',
        quickActions: []
      }
    };
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

  // ✅ NOUVELLES MÉTHODES POUR DEBUGGING/MONITORING

  /**
   * Obtenir les statistiques du système modulaire
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

    return {
      initialized: true,
      stats: stats,
      config: config,
      modules: this.baseInteractionManager.listModules()
    };
  }

  /**
   * Reinitialiser le système modulaire (pour debugging)
   */
  async reinitializeModularSystem(): Promise<boolean> {
    try {
      console.log(`🔄 [InteractionManager] Réinitialisation système modulaire...`);
      
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

  // ✅ NETTOYAGE LORS DE LA DESTRUCTION
  async cleanup(): Promise<void> {
    console.log(`🧹 [InteractionManager] Nettoyage du système modulaire...`);
    
    if (this.baseInteractionManager) {
      await this.baseInteractionManager.cleanup();
    }
    
    this.isInitialized = false;
    console.log(`✅ [InteractionManager] Nettoyage terminé`);
  }
}
