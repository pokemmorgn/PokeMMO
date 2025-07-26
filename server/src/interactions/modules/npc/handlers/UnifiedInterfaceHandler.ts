// server/src/interactions/modules/npc/handlers/UnifiedInterfaceHandler.ts
// Handler pour construire l'interface unifiée des NPCs multi-fonctionnels - VERSION INTÉGRÉE

import { Player } from "../../../../schema/PokeWorldState";
import { QuestManager } from "../../../../managers/QuestManager";
import { ShopManager } from "../../../../managers/ShopManager";
import { 
  UnifiedInterfaceResult,
  NpcCapability,
  MerchantData,
  QuestData,
  DialogueData,
  HealerData,
  TrainerData,
  TransportData,
  ServiceData,
  CapabilityAnalysis,
  UnifiedInterfaceConfig,
  DEFAULT_CAPABILITY_PRIORITY,
  CAPABILITY_LABELS,
  CAPABILITY_ICONS
} from "../../../types/UnifiedInterfaceTypes";

// Import des handlers existants
import { MerchantNpcHandler } from "./MerchantNpcHandler";

// ===== TYPES UTILITAIRES POUR ÉVITER LES ERREURS =====
type QuestReward = {
  type: 'item' | 'gold' | 'experience';
  itemId?: string;
  amount: number;
};

type TrainerRewards = {
  money: number;
  items: any[];
};

// Fonction utilitaire pour créer des arrays typés vides
const createEmptyRewards = (): QuestReward[] => [];

// ===== INTERFACE NPC DATA COMPLÈTE (Compatible JSON + MongoDB + Tiled) =====
interface NpcData {
  id: number;
  name: string;
  sprite: string;
  x: number;
  y: number;
  properties?: Record<string, any>;
  
  // Propriétés JSON de base
  type?: string;
  shopId?: string;
  shopType?: string;
  dialogueIds?: string[];
  questsToGive?: string[];
  questsToEnd?: string[];
  trainerId?: string;
  healerConfig?: any;
  transportConfig?: any;
  serviceConfig?: any;
  
  // Métadonnées
  sourceType?: 'tiled' | 'json' | 'mongodb';
  sourceFile?: string;
}

// ===== CONFIGURATION HANDLER =====
interface UnifiedHandlerConfig {
  debugMode: boolean;
  enabledCapabilities: NpcCapability[];
  capabilityPriority: Record<NpcCapability, number>;
  defaultTabByNpcType: Record<string, NpcCapability>;
  maxCapabilitiesPerNpc: number;
  useMerchantHandlerForShops: boolean; // ✅ NOUVEAU: Flag pour délégation shop
}

// ===== HANDLER PRINCIPAL INTÉGRÉ =====
export class UnifiedInterfaceHandler {
  
  private config: UnifiedHandlerConfig;
  
  // Dépendances injectées
  private questManager: QuestManager;
  private shopManager: ShopManager;
  
  // ✅ HANDLERS SPÉCIALISÉS - MerchantHandler intégré
  private merchantHandler: MerchantNpcHandler;
  
  constructor(
    questManager: QuestManager,
    shopManager: ShopManager,
    merchantHandler: MerchantNpcHandler,
    config?: Partial<UnifiedHandlerConfig>
  ) {
    this.questManager = questManager;
    this.shopManager = shopManager;
    this.merchantHandler = merchantHandler;
    
    this.config = {
      debugMode: process.env.NODE_ENV === 'development',
      enabledCapabilities: [
        'merchant', 'quest', 'dialogue', 'healer', 
        'trainer', 'transport', 'service'
      ],
      capabilityPriority: DEFAULT_CAPABILITY_PRIORITY,
      defaultTabByNpcType: {
        'merchant': 'merchant',
        'trainer': 'trainer',
        'healer': 'healer',
        'transport': 'transport',
        'dialogue': 'dialogue'
      },
      maxCapabilitiesPerNpc: 5,
      useMerchantHandlerForShops: true, // ✅ Délégation activée par défaut
      ...config
    };
    
    this.log('info', '🔗 UnifiedInterfaceHandler v2.0 initialisé avec MerchantHandler intégré', {
      enabledCapabilities: this.config.enabledCapabilities.length,
      merchantHandlerIntegrated: !!this.merchantHandler,
      delegation: this.config.useMerchantHandlerForShops
    });
  }

  // === MÉTHODE PRINCIPALE ===

  /**
   * Construit l'interface unifiée pour un NPC multi-fonctionnel
   */
  async build(
    player: Player, 
    npc: NpcData, 
    detectedCapabilities: NpcCapability[]
  ): Promise<UnifiedInterfaceResult> {
    
    const startTime = Date.now();
    
    try {
      this.log('info', `🔗 [UnifiedInterface v2] Construction pour NPC ${npc.id}`, {
        player: player.name,
        npcName: npc.name,
        capabilities: detectedCapabilities.length,
        merchantHandlerAvailable: !!this.merchantHandler
      });

      // 1. Analyser et prioriser les capacités avec délégation
      const capabilityAnalysis = await this.analyzeCapabilitiesWithDelegation(player, npc, detectedCapabilities);
      
      // 2. Filtrer les capacités disponibles
      const availableCapabilities = capabilityAnalysis
        .filter(analysis => analysis.available)
        .sort((a, b) => b.priority - a.priority)
        .slice(0, this.config.maxCapabilitiesPerNpc);

      if (availableCapabilities.length === 0) {
        this.log('warn', `🔗 [UnifiedInterface v2] Aucune capacité disponible pour NPC ${npc.id}`);
        return this.buildFallbackResult(npc, "Aucune action disponible");
      }

      // 3. Collecter les données pour chaque capacité
      const result: UnifiedInterfaceResult = {
        success: true,
        type: "unifiedInterface",
        npcId: npc.id,
        npcName: npc.name,
        npcSprite: npc.sprite,
        capabilities: availableCapabilities.map(c => c.capability),
        defaultAction: this.determineDefaultAction(npc, availableCapabilities),
        interfaceConfig: this.buildInterfaceConfig(availableCapabilities),
        quickActions: this.buildQuickActions(availableCapabilities)
      };

      // 4. Collecter données par capacité avec délégation intelligente
      for (const capAnalysis of availableCapabilities) {
        try {
          const data = await capAnalysis.dataFetcher();
          this.attachCapabilityData(result, capAnalysis.capability, data);
          
        } catch (error) {
          this.log('error', `🔗 [UnifiedInterface v2] Erreur données ${capAnalysis.capability}`, error);
          // On continue avec les autres capacités
        }
      }

      const processingTime = Date.now() - startTime;
      this.log('info', `✅ [UnifiedInterface v2] Interface construite`, {
        capabilities: result.capabilities.length,
        defaultAction: result.defaultAction,
        merchantDataAvailable: !!result.merchantData,
        processingTime: `${processingTime}ms`
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.log('error', `❌ [UnifiedInterface v2] Erreur construction NPC ${npc.id}`, {
        error: error instanceof Error ? error.message : error,
        processingTime: `${processingTime}ms`
      });
      
      return this.buildFallbackResult(npc, "Erreur lors de la construction de l'interface");
    }
  }

  // === ✅ ANALYSE DES CAPACITÉS AVEC DÉLÉGATION ===

  private async analyzeCapabilitiesWithDelegation(
    player: Player,
    npc: NpcData,
    detectedCapabilities: NpcCapability[]
  ): Promise<CapabilityAnalysis[]> {
    
    const analysis: CapabilityAnalysis[] = [];

    for (const capability of detectedCapabilities) {
      const capAnalysis = await this.analyzeSpecificCapabilityWithDelegation(player, npc, capability);
      analysis.push(capAnalysis);
    }

    this.log('info', `🔍 [UnifiedInterface v2] Analyse capacités avec délégation`, {
      total: analysis.length,
      available: analysis.filter(a => a.available).length,
      merchantDelegated: analysis.some(a => a.capability === 'merchant' && a.available),
      unavailable: analysis.filter(a => !a.available).length
    });

    return analysis;
  }

  private async analyzeSpecificCapabilityWithDelegation(
    player: Player,
    npc: NpcData,
    capability: NpcCapability
  ): Promise<CapabilityAnalysis> {
    
    const basePriority = this.config.capabilityPriority[capability] || 0;
    
    switch (capability) {
      case 'merchant':
        return await this.analyzeMerchantCapabilityWithDelegation(player, npc, basePriority);

      case 'quest':
        const hasQuests = await this.hasAvailableQuests(player, npc);
        return {
          capability,
          available: hasQuests,
          priority: basePriority + (hasQuests ? 1 : 0),
          dataFetcher: () => this.collectQuestData(player, npc)
        };

      case 'dialogue':
        return {
          capability,
          available: this.hasDialogue(npc),
          priority: basePriority,
          dataFetcher: () => this.collectDialogueData(player, npc)
        };

      case 'healer':
        return {
          capability,
          available: this.isHealerNpc(npc),
          priority: basePriority + (npc.type === 'healer' ? 2 : 0),
          dataFetcher: () => this.collectHealerData(player, npc)
        };

      case 'trainer':
        return {
          capability,
          available: this.isTrainerNpc(npc),
          priority: basePriority + (npc.type === 'trainer' ? 3 : 0),
          dataFetcher: () => this.collectTrainerData(player, npc)
        };

      default:
        return {
          capability,
          available: false,
          priority: 0,
          reason: `Capacité ${capability} non implémentée`,
          dataFetcher: () => Promise.resolve(null)
        };
    }
  }

  // ✅ ANALYSE MERCHANT AVEC DÉLÉGATION AU MERCHANTHANDLER
  private async analyzeMerchantCapabilityWithDelegation(
    player: Player,
    npc: NpcData,
    basePriority: number
  ): Promise<CapabilityAnalysis> {
    
    // ✅ DÉLÉGATION : Utiliser MerchantHandler pour détecter les marchands
    const isMerchantViaHandler = this.config.useMerchantHandlerForShops && 
                                this.merchantHandler && 
                                this.merchantHandler.isMerchantNpc(npc);
    
    const isMerchantLegacy = this.hasValidShop(npc);
    const isMerchant = isMerchantViaHandler || isMerchantLegacy;
    
    if (!isMerchant) {
      return {
        capability: 'merchant',
        available: false,
        priority: 0,
        reason: 'NPC non marchand',
        dataFetcher: () => Promise.resolve(null)
      };
    }

    this.log('info', `🛒 [Merchant Analysis] NPC ${npc.id} détecté comme marchand`, {
      viaHandler: isMerchantViaHandler,
      viaLegacy: isMerchantLegacy,
      delegationEnabled: this.config.useMerchantHandlerForShops
    });

    return {
      capability: 'merchant',
      available: true,
      priority: basePriority + (npc.type === 'merchant' ? 2 : 0),
      // ✅ DÉLÉGATION : Utiliser MerchantHandler pour collecter les données
      dataFetcher: () => this.config.useMerchantHandlerForShops ? 
                          this.collectMerchantDataViaDelegation(player, npc) :
                          this.collectMerchantDataLegacy(player, npc)
    };
  }

  // === ✅ COLLECTEURS DE DONNÉES AVEC DÉLÉGATION ===

  // ✅ NOUVEAU : Collecte de données merchant via MerchantHandler (délégation)
  private async collectMerchantDataViaDelegation(player: Player, npc: NpcData): Promise<MerchantData> {
    this.log('info', `🛒 [Merchant Delegation] Collecte données via MerchantHandler pour NPC ${npc.id}`);
    
    try {
      // ✅ DÉLÉGATION : Appeler directement le MerchantHandler
      const merchantResult = await this.merchantHandler.handle(player, npc, npc.id);
      
      if (!merchantResult.success || !merchantResult.shopData) {
        throw new Error(`MerchantHandler échec: ${merchantResult.message}`);
      }

      // ✅ CONVERSION : Transformer le résultat MerchantHandler en MerchantData
      const merchantData: MerchantData = {
        shopId: merchantResult.shopId!,
        shopInfo: {
          name: merchantResult.shopData.shopInfo.name || 'Boutique',
          currency: 'gold', // TODO: Récupérer depuis shopData
          shopType: merchantResult.shopData.shopInfo.type || 'pokemart'
        },
        availableItems: merchantResult.shopData.availableItems.map(item => ({
          id: item.itemId || item.id || 'unknown',
          name: item.name || item.itemId || 'Item inconnu',
          price: item.buyPrice || item.price || 0,
          stock: item.stock || 99,
          category: item.category || 'items',
          description: item.description
        })),
        playerGold: merchantResult.shopData.playerGold,
        welcomeDialogue: merchantResult.lines || ["Bienvenue !"],
        canBuy: true,
        canSell: true,
        restrictions: {
          minLevel: undefined,
          vipOnly: false
        }
      };

      this.log('info', `✅ [Merchant Delegation] Données collectées via MerchantHandler`, {
        shopId: merchantData.shopId,
        itemCount: merchantData.availableItems.length,
        playerGold: merchantData.playerGold
      });

      return merchantData;
      
    } catch (error) {
      this.log('error', `❌ [Merchant Delegation] Erreur délégation MerchantHandler`, error);
      
      // ✅ FALLBACK : Si délégation échoue, utiliser la méthode legacy
      this.log('info', `🔄 [Merchant Delegation] Fallback vers méthode legacy`);
      return await this.collectMerchantDataLegacy(player, npc);
    }
  }

  // ✅ MÉTHODE LEGACY (backup si délégation échoue)
  private async collectMerchantDataLegacy(player: Player, npc: NpcData): Promise<MerchantData> {
    const shopId = this.getShopId(npc);
    const catalog = this.shopManager.getShopCatalog(shopId, player.level || 1);
    
    if (!catalog) {
      throw new Error(`Shop ${shopId} non trouvé via méthode legacy`);
    }

    return {
      shopId: shopId,
      shopInfo: {
        name: catalog.shopInfo.nameKey || catalog.shopInfo.name || 'Boutique',
        currency: 'gold',
        shopType: npc.shopType || this.getProperty(npc, 'shopType') || 'pokemart'
      },
      availableItems: catalog.availableItems.map(item => ({
        id: item.itemId,
        name: item.itemId,
        price: item.buyPrice || 0,
        stock: item.stock || 99,
        category: 'items',
                  description: undefined as string | undefined
      })),
      playerGold: player.gold || 1000,
      welcomeDialogue: this.getShopDialogue(npc, 'welcome'),
      canBuy: true,
      canSell: true,
      restrictions: this.getShopRestrictions(npc, player)
    };
  }

  // === ✅ MÉTHODE PUBLIQUE POUR TRANSACTIONS VIA DÉLÉGATION ===

  /**
   * Traite une transaction shop via délégation au MerchantHandler
   */
  async handleShopTransaction(
    player: Player,
    npc: NpcData,
    action: 'buy' | 'sell',
    itemId: string,
    quantity: number
  ): Promise<{
    success: boolean;
    message: string;
    messageKey?: string;
    newGold?: number;
    itemsChanged?: any[];
    shopStockChanged?: any[];
    dialogues?: string[];
    dialogueKeys?: string[];
  }> {
    
    this.log('info', `🛒 [Shop Transaction] ${action} ${quantity}x ${itemId} via délégation`, {
      npcId: npc.id,
      player: player.name,
      delegationEnabled: this.config.useMerchantHandlerForShops
    });

    if (this.config.useMerchantHandlerForShops && this.merchantHandler) {
      try {
        // ✅ DÉLÉGATION : Utiliser MerchantHandler pour la transaction
        const result = await this.merchantHandler.handleShopTransaction(
          player, npc, action, itemId, quantity
        );
        
        this.log('info', `✅ [Shop Transaction] Délégation réussie`, {
          success: result.success,
          message: result.message
        });
        
        return result;
        
      } catch (error) {
        this.log('error', `❌ [Shop Transaction] Erreur délégation`, error);
        
        // Fallback vers ShopManager direct
        return await this.handleShopTransactionLegacy(player, npc, action, itemId, quantity);
      }
    } else {
      // Utiliser ShopManager directement
      return await this.handleShopTransactionLegacy(player, npc, action, itemId, quantity);
    }
  }

  private async handleShopTransactionLegacy(
    player: Player,
    npc: NpcData,
    action: 'buy' | 'sell',
    itemId: string,
    quantity: number
  ): Promise<any> {
    
    const shopId = this.getShopId(npc);
    
    if (action === 'buy') {
      return await this.shopManager.buyItem(
        player.name, shopId, itemId, quantity, player.gold || 1000, player.level || 1
      );
    } else {
      return await this.shopManager.sellItem(
        player.name, shopId, itemId, quantity
      );
    }
  }

  // === COLLECTEURS DE DONNÉES AUTRES (INCHANGÉS) ===

  private async collectQuestData(player: Player, npc: NpcData): Promise<QuestData> {
    // Quêtes disponibles
    const availableQuests = await this.getAvailableQuestsForNpc(player.name, npc.id);
    
    // Quêtes en cours
    const activeQuests = await this.questManager.getActiveQuests(player.name);
    const questsInProgress = activeQuests
      .filter(q => q.startNpcId === npc.id || q.endNpcId === npc.id)
      .filter(q => q.status !== 'readyToComplete');
    
    // Quêtes à compléter
    const questsToComplete = activeQuests
      .filter(q => q.endNpcId === npc.id && q.status === 'readyToComplete');

    return {
      availableQuests: availableQuests.map(quest => ({
        id: quest.id,
        name: quest.name,
        description: quest.description,
        difficulty: this.getQuestDifficulty(quest),
        category: quest.category || 'general',
        rewards: createEmptyRewards() as Array<{
          type: 'item' | 'gold' | 'experience';
          itemId?: string;
          amount: number;
        }>
      })),
      questsInProgress: questsInProgress.map(quest => ({
        id: quest.id,
        name: quest.name,
        progress: this.getQuestProgressString(quest),
        canComplete: false
      })),
      questsToComplete: questsToComplete.map(quest => ({
        id: quest.id,
        name: quest.name,
        rewards: createEmptyRewards()
      })),
      questDialogue: this.getQuestDialogue(npc),
      canGiveQuests: availableQuests.length > 0,
      canCompleteQuests: questsToComplete.length > 0
    };
  }

  private async collectDialogueData(player: Player, npc: NpcData): Promise<DialogueData> {
    return {
      lines: this.getDialogueLines(npc),
      npcPersonality: {
        mood: 'friendly',
        topics: ['aventure', 'pokémon', 'région']
      }
    };
  }

  private async collectHealerData(player: Player, npc: NpcData): Promise<HealerData> {
    const healerConfig = npc.healerConfig || {};
    
    return {
      healingType: healerConfig.healingType || 'free',
      cost: healerConfig.cost || 0,
      currency: 'gold',
      services: [
        {
          serviceId: 'heal_all',
          serviceName: 'Soigner tous les Pokémon',
          description: 'Restaure la santé et les PP de tous vos Pokémon',
          cost: healerConfig.cost || 0
        }
      ],
      playerPokemonStatus: {
        needsHealing: true,
        pokemonCount: 6,
        injuredCount: 2
      },
      welcomeDialogue: this.getHealerDialogue(npc, 'welcome'),
      canHeal: true
    };
  }

  private async collectTrainerData(player: Player, npc: NpcData): Promise<TrainerData> {
    return {
      trainerId: npc.trainerId || `trainer_${npc.id}`,
      trainerClass: this.getProperty(npc, 'trainerClass') || 'youngster',
      battleType: 'single',
      teamPreview: [],
      battleDialogue: this.getTrainerDialogue(npc, 'challenge'),
      rewards: {
        money: 500,
        items: []
      } as TrainerRewards,
      canBattle: true
    };
  }

  // === MÉTHODES DE DÉTECTION (INCHANGÉES) ===

  private hasValidShop(npc: NpcData): boolean {
    return !!this.getShopId(npc);
  }

  private async hasAvailableQuests(player: Player, npc: NpcData): Promise<boolean> {
    try {
      const quests = await this.getAvailableQuestsForNpc(player.name, npc.id);
      const activeQuests = await this.questManager.getActiveQuests(player.name);
      const questsToComplete = activeQuests.filter(q => q.endNpcId === npc.id && q.status === 'readyToComplete');
      
      return quests.length > 0 || questsToComplete.length > 0;
    } catch {
      return false;
    }
  }

  private hasDialogue(npc: NpcData): boolean {
    return !!(npc.dialogueIds?.length || this.getProperty(npc, 'dialogue'));
  }

  private isHealerNpc(npc: NpcData): boolean {
    return npc.type === 'healer' || !!this.getProperty(npc, 'healer');
  }

  private isTrainerNpc(npc: NpcData): boolean {
    return npc.type === 'trainer' || !!npc.trainerId;
  }

  // === MÉTHODES UTILITAIRES (INCHANGÉES) ===

  private getShopId(npc: NpcData): string {
    return npc.shopId || this.getProperty(npc, 'shopId') || this.getProperty(npc, 'shop') || '';
  }

  private getProperty(npc: NpcData, key: string): any {
    return npc.properties?.[key];
  }

  private determineDefaultAction(npc: NpcData, capabilities: CapabilityAnalysis[]): NpcCapability {
    // 1. Priorité par type NPC
    if (npc.type && this.config.defaultTabByNpcType[npc.type]) {
      const preferredAction = this.config.defaultTabByNpcType[npc.type];
      if (capabilities.some(c => c.capability === preferredAction)) {
        return preferredAction;
      }
    }

    // 2. Priorité la plus haute
    return capabilities[0]?.capability || 'dialogue';
  }

  private buildInterfaceConfig(capabilities: CapabilityAnalysis[]): UnifiedInterfaceResult['interfaceConfig'] {
    const sortedCaps = capabilities.sort((a, b) => b.priority - a.priority);
    
    return {
      tabOrder: sortedCaps.map(c => c.capability),
      primaryTab: sortedCaps[0]?.capability || 'dialogue',
      theme: 'default'
    };
  }

  private buildQuickActions(capabilities: CapabilityAnalysis[]): UnifiedInterfaceResult['quickActions'] {
    return capabilities.map(cap => ({
      actionType: cap.capability,
      label: CAPABILITY_LABELS[cap.capability],
      icon: CAPABILITY_ICONS[cap.capability],
      enabled: cap.available,
      reasonIfDisabled: cap.reason
    }));
  }

  private attachCapabilityData(result: UnifiedInterfaceResult, capability: NpcCapability, data: any): void {
    switch (capability) {
      case 'merchant':
        result.merchantData = data;
        break;
      case 'quest':
        result.questData = data;
        break;
      case 'dialogue':
        result.dialogueData = data;
        break;
      case 'healer':
        result.healerData = data;
        break;
      case 'trainer':
        result.trainerData = data;
        break;
      case 'transport':
        result.transportData = data;
        break;
      case 'service':
        result.serviceData = data;
        break;
    }
  }

  private buildFallbackResult(npc: NpcData, message: string): UnifiedInterfaceResult {
    return {
      success: true,
      type: "unifiedInterface",
      npcId: npc.id,
      npcName: npc.name,
      npcSprite: npc.sprite,
      capabilities: ['dialogue'],
      defaultAction: 'dialogue',
      dialogueData: {
        lines: [message]
      }
    };
  }

  // === MÉTHODES DE DIALOGUE ET DONNÉES (INCHANGÉES) ===

  private getShopDialogue(npc: NpcData, type: 'welcome'): string[] {
    const npcAny = npc as any;
    if (npcAny.shopDialogueIds?.shopOpen) {
      return npcAny.shopDialogueIds.shopOpen;
    }
    if (this.getProperty(npc, 'shopDialogue')) {
      const dialogue = this.getProperty(npc, 'shopDialogue');
      return Array.isArray(dialogue) ? dialogue : [dialogue];
    }
    return ["Bienvenue dans ma boutique !"];
  }

  private getQuestDialogue(npc: NpcData): string[] {
    const npcAny = npc as any;
    if (npcAny.questDialogueIds?.questOffer) {
      return npcAny.questDialogueIds.questOffer;
    }
    if (this.getProperty(npc, 'questDialogue')) {
      const dialogue = this.getProperty(npc, 'questDialogue');
      return Array.isArray(dialogue) ? dialogue : [dialogue];
    }
    return ["J'ai peut-être quelque chose pour vous..."];
  }

  private getDialogueLines(npc: NpcData): string[] {
    if (npc.dialogueIds?.length) {
      return npc.dialogueIds;
    }
    if (this.getProperty(npc, 'dialogue')) {
      const dialogue = this.getProperty(npc, 'dialogue');
      return Array.isArray(dialogue) ? dialogue : [dialogue];
    }
    return [`Bonjour ! Je suis ${npc.name}.`];
  }

  private getHealerDialogue(npc: NpcData, type: 'welcome'): string[] {
    const npcAny = npc as any;
    if (npcAny.healerDialogueIds?.welcome) {
      return npcAny.healerDialogueIds.welcome;
    }
    return ["Voulez-vous soigner vos Pokémon ?"];
  }

  private getTrainerDialogue(npc: NpcData, type: 'challenge'): string[] {
    const npcAny = npc as any;
    if (npcAny.battleDialogueIds?.preBattle) {
      return npcAny.battleDialogueIds.preBattle;
    }
    return ["Hé ! Tu veux te battre ?"];
  }

  private getShopRestrictions(npc: NpcData, player: Player): MerchantData['restrictions'] {
    return {
      minLevel: this.getProperty(npc, 'minLevel'),
      vipOnly: false
    };
  }

  private async getAvailableQuestsForNpc(username: string, npcId: number): Promise<any[]> {
    try {
      const questsForNpc = this.questManager.getQuestsForNpc(npcId);
      const availableQuests = await this.questManager.getAvailableQuests(username);
      
      return availableQuests.filter(quest => 
        questsForNpc.some(npcQuest => 
          npcQuest.id === quest.id && npcQuest.startNpcId === npcId
        )
      );
    } catch {
      return [];
    }
  }

  private getQuestDifficulty(quest: any): QuestData['availableQuests'][0]['difficulty'] {
    return quest.difficulty || 'Moyen';
  }

  private getQuestProgressString(quest: any): string {
    return `Étape ${quest.currentStepIndex + 1}/${quest.steps.length}`;
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.debugMode && level === 'info') return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    switch (level) {
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

  // === MÉTHODES D'ADMINISTRATION ===

  getStats(): any {
    return {
      handlerType: 'unified_interface',
      version: '2.0.0',
      config: this.config,
      supportedCapabilities: this.config.enabledCapabilities,
      merchantHandlerIntegrated: !!this.merchantHandler,
      delegationEnabled: this.config.useMerchantHandlerForShops
    };
  }

  // ✅ NOUVELLE MÉTHODE : Activer/Désactiver délégation
  setMerchantDelegation(enabled: boolean): void {
    this.config.useMerchantHandlerForShops = enabled;
    this.log('info', `🔄 [UnifiedInterface] Délégation MerchantHandler ${enabled ? 'activée' : 'désactivée'}`);
  }
}
