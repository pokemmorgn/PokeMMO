// server/src/interactions/modules/npc/handlers/UnifiedInterfaceHandler.ts
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
  CapabilityAnalysis,
  DEFAULT_CAPABILITY_PRIORITY,
  CAPABILITY_LABELS,
  CAPABILITY_ICONS
} from "../../../types/UnifiedInterfaceTypes";
import { MerchantNpcHandler } from "./MerchantNpcHandler";
import { DialogStringModel, SupportedLanguage } from "../../../../models/DialogString";

interface NpcData {
  id: number;
  name: string;
  sprite: string;
  x: number;
  y: number;
  properties?: Record<string, any>;
  type?: string;
  shopId?: string;
  dialogueIds?: string[];
  questsToGive?: string[];
  questsToEnd?: string[];
  trainerId?: string;
  healerConfig?: any;
  transportConfig?: any;
  serviceConfig?: any;
  sourceType?: 'tiled' | 'json' | 'mongodb';
  sourceFile?: string;
}

interface UnifiedHandlerConfig {
  debugMode: boolean;
  enabledCapabilities: NpcCapability[];
  capabilityPriority: Record<NpcCapability, number>;
  defaultTabByNpcType: Record<string, NpcCapability>;
  maxCapabilitiesPerNpc: number;
  useMerchantHandlerForShops: boolean;
}

export class UnifiedInterfaceHandler {
  private config: UnifiedHandlerConfig;
  private questManager: QuestManager;
  private shopManager: ShopManager;
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
      useMerchantHandlerForShops: true,
      ...config
    };
  }

  async build(
    player: Player, 
    npc: NpcData, 
    detectedCapabilities: NpcCapability[]
  ): Promise<UnifiedInterfaceResult> {
    try {
      const capabilityAnalysis = await this.analyzeCapabilitiesWithDelegation(player, npc, detectedCapabilities);
      
      const availableCapabilities = capabilityAnalysis
        .filter(analysis => analysis.available)
        .sort((a, b) => b.priority - a.priority)
        .slice(0, this.config.maxCapabilitiesPerNpc);

      if (availableCapabilities.length === 0) {
        return this.buildFallbackResult(npc, "Aucune action disponible");
      }

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

      for (const capAnalysis of availableCapabilities) {
        try {
          const data = await capAnalysis.dataFetcher();
          this.attachCapabilityData(result, capAnalysis.capability, data);
        } catch (error) {
          // Continue avec les autres capacités
        }
      }

      return result;

    } catch (error) {
      return this.buildFallbackResult(npc, "Erreur lors de la construction de l'interface");
    }
  }

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

  private async analyzeMerchantCapabilityWithDelegation(
    player: Player,
    npc: NpcData,
    basePriority: number
  ): Promise<CapabilityAnalysis> {
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

    return {
      capability: 'merchant',
      available: true,
      priority: basePriority + (npc.type === 'merchant' ? 2 : 0),
      dataFetcher: () => this.config.useMerchantHandlerForShops ? 
                          this.collectMerchantDataViaDelegation(player, npc) :
                          this.collectMerchantDataLegacy(player, npc)
    };
  }

  private async collectMerchantDataViaDelegation(player: Player, npc: NpcData): Promise<MerchantData> {
    try {
      const merchantResult = await this.merchantHandler.handle(player, npc, npc.id);
      
      if (!merchantResult.success || !merchantResult.shopData) {
        throw new Error(`MerchantHandler échec: ${merchantResult.message}`);
      }

      const merchantData: MerchantData = {
        shopId: merchantResult.shopId!,
        shopInfo: {
          name: merchantResult.shopData.shopInfo.name || 'Boutique',
          currency: 'gold',
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

      return merchantData;
      
    } catch (error) {
      return await this.collectMerchantDataLegacy(player, npc);
    }
  }

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
        shopType: npc.type || this.getProperty(npc, 'shopType') || 'pokemart'
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
      welcomeDialogue: await this.getShopDialogue(npc, 'welcome', player),
      canBuy: true,
      canSell: true,
      restrictions: this.getShopRestrictions(npc, player)
    };
  }

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
    if (this.config.useMerchantHandlerForShops && this.merchantHandler) {
      try {
        const result = await this.merchantHandler.handleShopTransaction(
          player, npc, action, itemId, quantity
        );
        return result;
      } catch (error) {
        return await this.handleShopTransactionLegacy(player, npc, action, itemId, quantity);
      }
    } else {
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

  private async collectQuestData(player: Player, npc: NpcData): Promise<QuestData> {
    const availableQuests = await this.getAvailableQuestsForNpc(player.name, npc.id);
    const activeQuests = await this.questManager.getActiveQuests(player.name);
    const questsInProgress = activeQuests
      .filter(q => q.startNpcId === npc.id || q.endNpcId === npc.id)
      .filter(q => q.status !== 'readyToComplete');
    const questsToComplete = activeQuests
      .filter(q => q.endNpcId === npc.id && q.status === 'readyToComplete');

    return {
      availableQuests: availableQuests.map(quest => ({
        id: quest.id,
        name: quest.name,
        description: quest.description,
        difficulty: this.getQuestDifficulty(quest),
        category: quest.category || 'general',
        rewards: [] as Array<{
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
        rewards: [] as Array<{
          type: 'item' | 'gold' | 'experience';
          itemId?: string;
          amount: number;
        }>
      })),
      questDialogue: await this.getQuestDialogue(npc, player),
      canGiveQuests: availableQuests.length > 0,
      canCompleteQuests: questsToComplete.length > 0
    };
  }

  private async collectDialogueData(player: Player, npc: NpcData): Promise<DialogueData> {
    return {
      lines: await this.getDialogueLines(npc, player),
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
      welcomeDialogue: await this.getHealerDialogue(npc, 'welcome', player),
      canHeal: true
    };
  }

  private async collectTrainerData(player: Player, npc: NpcData): Promise<TrainerData> {
    return {
      trainerId: npc.trainerId || `trainer_${npc.id}`,
      trainerClass: this.getProperty(npc, 'trainerClass') || 'youngster',
      battleType: 'single',
      teamPreview: [],
      battleDialogue: await this.getTrainerDialogue(npc, 'challenge', player),
      rewards: {
        money: 500,
        items: []
      },
      canBattle: true
    };
  }

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

  private getShopId(npc: NpcData): string {
    return npc.shopId || this.getProperty(npc, 'shopId') || this.getProperty(npc, 'shop') || '';
  }

  private getProperty(npc: NpcData, key: string): any {
    return npc.properties?.[key];
  }

  private determineDefaultAction(npc: NpcData, capabilities: CapabilityAnalysis[]): NpcCapability {
    if (npc.type && this.config.defaultTabByNpcType[npc.type]) {
      const preferredAction = this.config.defaultTabByNpcType[npc.type];
      if (capabilities.some(c => c.capability === preferredAction)) {
        return preferredAction;
      }
    }

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

  private async getShopDialogue(npc: NpcData, type: 'welcome', player: Player, language: SupportedLanguage = 'fr'): Promise<string[]> {
    try {
      const shopId = this.getShopId(npc);
      const shopType = npc.type || 'pokemart';
      
      const dialogPatterns = [
        `${shopId}.shop.${type}`,
        `${shopType}.shop.${type}`,
        `generic.shop.${type}`
      ];

      for (const pattern of dialogPatterns) {
        const dialogue = await DialogStringModel.findOne({
          dialogId: pattern,
          isActive: true
        });

        if (dialogue) {
          const text = dialogue.replaceVariables(language, player.name);
          return [text];
        }
      }

      return [`Bienvenue dans ma boutique, ${player.name} !`];
    } catch (error) {
      return [`Bienvenue dans ma boutique, ${player.name} !`];
    }
  }

  private async getQuestDialogue(npc: NpcData, player: Player, language: SupportedLanguage = 'fr'): Promise<string[]> {
    try {
      const npcIdentifier = npc.name?.toLowerCase().replace(/\s+/g, '_') || `npc_${npc.id}`;
      
      const dialogPatterns = [
        `${npcIdentifier}.quest.offer`,
        `generic.quest.offer`
      ];

      for (const pattern of dialogPatterns) {
        const dialogue = await DialogStringModel.findOne({
          dialogId: pattern,
          isActive: true
        });

        if (dialogue) {
          const text = dialogue.replaceVariables(language, player.name);
          return [text];
        }
      }

      return [`J'ai peut-être quelque chose pour vous, ${player.name}...`];
    } catch (error) {
      return [`J'ai peut-être quelque chose pour vous, ${player.name}...`];
    }
  }

  private async getDialogueLines(npc: NpcData, player: Player, language: SupportedLanguage = 'fr'): Promise<string[]> {
    try {
      if (npc.dialogueIds?.length) {
        const processedLines = [];
        
        for (const dialogId of npc.dialogueIds) {
          const dialogue = await DialogStringModel.findOne({
            dialogId: dialogId,
            isActive: true
          });
          
          if (dialogue) {
            const text = dialogue.replaceVariables(language, player.name);
            processedLines.push(text);
          } else {
            processedLines.push(dialogId);
          }
        }
        
        return processedLines;
      }
      
      const npcIdentifier = npc.name?.toLowerCase().replace(/\s+/g, '_') || `npc_${npc.id}`;
      
      const dialogue = await DialogStringModel.findOne({
        dialogId: `${npcIdentifier}.greeting.default`,
        isActive: true
      });
      
      if (dialogue) {
        const text = dialogue.replaceVariables(language, player.name);
        return [text];
      }
      
      if (this.getProperty(npc, 'dialogue')) {
        const legacyDialogue = this.getProperty(npc, 'dialogue');
        const lines = Array.isArray(legacyDialogue) ? legacyDialogue : [legacyDialogue];
        return lines.map((line: string) => line.replace('%s', player.name));
      }
      
      return [`Bonjour ${player.name} !`];
      
    } catch (error) {
      return [`Bonjour ${player.name} !`];
    }
  }

  private async getHealerDialogue(npc: NpcData, type: 'welcome', player: Player, language: SupportedLanguage = 'fr'): Promise<string[]> {
    try {
      const npcIdentifier = npc.name?.toLowerCase().replace(/\s+/g, '_') || `npc_${npc.id}`;
      
      const dialogPatterns = [
        `${npcIdentifier}.healer.${type}`,
        `generic.healer.${type}`
      ];

      for (const pattern of dialogPatterns) {
        const dialogue = await DialogStringModel.findOne({
          dialogId: pattern,
          isActive: true
        });

        if (dialogue) {
          const text = dialogue.replaceVariables(language, player.name);
          return [text];
        }
      }

      return [`Voulez-vous soigner vos Pokémon, ${player.name} ?`];
    } catch (error) {
      return [`Voulez-vous soigner vos Pokémon, ${player.name} ?`];
    }
  }

  private async getTrainerDialogue(npc: NpcData, type: 'challenge', player: Player, language: SupportedLanguage = 'fr'): Promise<string[]> {
    try {
      const npcIdentifier = npc.name?.toLowerCase().replace(/\s+/g, '_') || `npc_${npc.id}`;
      
      const dialogPatterns = [
        `${npcIdentifier}.trainer.${type}`,
        `generic.trainer.${type}`
      ];

      for (const pattern of dialogPatterns) {
        const dialogue = await DialogStringModel.findOne({
          dialogId: pattern,
          isActive: true
        });

        if (dialogue) {
          const text = dialogue.replaceVariables(language, player.name);
          return [text];
        }
      }

      return [`Hé ${player.name} ! Tu veux te battre ?`];
    } catch (error) {
      return [`Hé ${player.name} ! Tu veux te battre ?`];
    }
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

  getStats(): any {
    return {
      handlerType: 'unified_interface',
      version: '3.0.0',
      config: this.config,
      supportedCapabilities: this.config.enabledCapabilities,
      merchantHandlerIntegrated: !!this.merchantHandler,
      delegationEnabled: this.config.useMerchantHandlerForShops,
      dialogStringIntegration: true
    };
  }

  setMerchantDelegation(enabled: boolean): void {
    this.config.useMerchantHandlerForShops = enabled;
  }
}
