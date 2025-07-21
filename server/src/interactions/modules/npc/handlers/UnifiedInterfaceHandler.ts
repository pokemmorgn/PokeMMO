// server/src/interactions/modules/npc/handlers/UnifiedInterfaceHandler.ts
// Handler pour construire l'interface unifiée des NPCs multi-fonctionnels

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

// ===== INTERFACE NPC DATA (Compatible JSON + Tiled) =====
interface NpcData {
  id: number;
  name: string;
  sprite: string;
  x: number;
  y: number;
  properties?: Record<string, any>;
  
  // Propriétés JSON
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
  sourceType?: 'tiled' | 'json';
  sourceFile?: string;
}

// ===== CONFIGURATION HANDLER =====
interface UnifiedHandlerConfig {
  debugMode: boolean;
  enabledCapabilities: NpcCapability[];
  capabilityPriority: Record<NpcCapability, number>;
  defaultTabByNpcType: Record<string, NpcCapability>;
  maxCapabilitiesPerNpc: number;
}

// ===== HANDLER PRINCIPAL =====
export class UnifiedInterfaceHandler {
  
  private config: UnifiedHandlerConfig;
  
  // Dépendances injectées
  private questManager: QuestManager;
  private shopManager: ShopManager;
  
  // Handlers spécialisés existants
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
      ...config
    };
    
    this.log('info', '🔗 UnifiedInterfaceHandler initialisé', {
      enabledCapabilities: this.config.enabledCapabilities.length,
      hasHandlers: {
        merchant: !!this.merchantHandler
      }
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
      this.log('info', `🔗 [UnifiedInterface] Construction pour NPC ${npc.id}`, {
        player: player.name,
        npcName: npc.name,
        capabilities: detectedCapabilities.length
      });

      // 1. Analyser et prioriser les capacités
      const capabilityAnalysis = await this.analyzeCapabilities(player, npc, detectedCapabilities);
      
      // 2. Filtrer les capacités disponibles
      const availableCapabilities = capabilityAnalysis
        .filter(analysis => analysis.available)
        .sort((a, b) => b.priority - a.priority)
        .slice(0, this.config.maxCapabilitiesPerNpc);

      if (availableCapabilities.length === 0) {
        this.log('warn', `🔗 [UnifiedInterface] Aucune capacité disponible pour NPC ${npc.id}`);
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

      // 4. Collecter données par capacité
      for (const capAnalysis of availableCapabilities) {
        try {
          const data = await capAnalysis.dataFetcher();
          this.attachCapabilityData(result, capAnalysis.capability, data);
          
        } catch (error) {
          this.log('error', `🔗 [UnifiedInterface] Erreur données ${capAnalysis.capability}`, error);
          // On continue avec les autres capacités
        }
      }

      const processingTime = Date.now() - startTime;
      this.log('info', `✅ [UnifiedInterface] Interface construite`, {
        capabilities: result.capabilities.length,
        defaultAction: result.defaultAction,
        processingTime: `${processingTime}ms`
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.log('error', `❌ [UnifiedInterface] Erreur construction NPC ${npc.id}`, {
        error: error instanceof Error ? error.message : error,
        processingTime: `${processingTime}ms`
      });
      
      return this.buildFallbackResult(npc, "Erreur lors de la construction de l'interface");
    }
  }

  // === ANALYSE DES CAPACITÉS ===

  private async analyzeCapabilities(
    player: Player,
    npc: NpcData,
    detectedCapabilities: NpcCapability[]
  ): Promise<CapabilityAnalysis[]> {
    
    const analysis: CapabilityAnalysis[] = [];

    for (const capability of detectedCapabilities) {
      const capAnalysis = await this.analyzeSpecificCapability(player, npc, capability);
      analysis.push(capAnalysis);
    }

    this.log('info', `🔍 [UnifiedInterface] Analyse capacités`, {
      total: analysis.length,
      available: analysis.filter(a => a.available).length,
      unavailable: analysis.filter(a => !a.available).length
    });

    return analysis;
  }

  private async analyzeSpecificCapability(
    player: Player,
    npc: NpcData,
    capability: NpcCapability
  ): Promise<CapabilityAnalysis> {
    
    const basePriority = this.config.capabilityPriority[capability] || 0;
    
    switch (capability) {
      case 'merchant':
        return {
          capability,
          available: this.merchantHandler.isMerchantNpc(npc) && this.hasValidShop(npc),
          priority: basePriority + (npc.type === 'merchant' ? 2 : 0),
          dataFetcher: () => this.collectMerchantData(player, npc)
        };

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

  // === COLLECTEURS DE DONNÉES ===

  private async collectMerchantData(player: Player, npc: NpcData): Promise<MerchantData> {
    const shopId = npc.shopId || npc.properties?.shopId || npc.properties?.shop;
    const catalog = this.shopManager.getShopCatalog(shopId, player.level || 1);
    
    if (!catalog) {
      throw new Error(`Shop ${shopId} non trouvé`);
    }

    return {
      shopId: shopId,
      shopInfo: {
        name: catalog.shopInfo.name || 'Boutique',
        currency: 'gold',
        shopType: npc.shopType || npc.properties?.shopType || 'pokemart'
      },
      availableItems: catalog.availableItems.map(item => ({
        id: item.id,
        name: item.name || item.id,
        price: item.buyPrice || 0,
        stock: item.stock || 99,
        category: item.category || 'items',
        description: item.description
      })),
      playerGold: player.gold || 1000,
      welcomeDialogue: this.getShopDialogue(npc, 'welcome'),
      canBuy: true,
      canSell: catalog.shopInfo.acceptsSell !== false,
      restrictions: this.getShopRestrictions(npc, player)
    };
  }

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
        rewards: quest.rewards || []
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
        rewards: quest.rewards || []
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
        needsHealing: true, // TODO: Vérifier l'état réel
        pokemonCount: 6, // TODO: Récupérer depuis player
        injuredCount: 2 // TODO: Calculer
      },
      welcomeDialogue: this.getHealerDialogue(npc, 'welcome'),
      canHeal: true
    };
  }

  private async collectTrainerData(player: Player, npc: NpcData): Promise<TrainerData> {
    return {
      trainerId: npc.trainerId || `trainer_${npc.id}`,
      trainerClass: npc.properties?.trainerClass || 'youngster',
      battleType: 'single',
      teamPreview: [], // TODO: Récupérer l'équipe
      battleDialogue: this.getTrainerDialogue(npc, 'challenge'),
      rewards: {
        money: 500,
        items: []
      },
      canBattle: true
    };
  }

  // === MÉTHODES DE DÉTECTION ===

  private hasValidShop(npc: NpcData): boolean {
    const shopId = npc.shopId || npc.properties?.shopId || npc.properties?.shop;
    return !!shopId;
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
    return !!(npc.dialogueIds?.length || npc.properties?.dialogue);
  }

  private isHealerNpc(npc: NpcData): boolean {
    return npc.type === 'healer' || !!npc.properties?.healer;
  }

  private isTrainerNpc(npc: NpcData): boolean {
    return npc.type === 'trainer' || !!npc.trainerId;
  }

  // === MÉTHODES UTILITAIRES ===

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

  // === MÉTHODES DE DIALOGUE ET DONNÉES ===

  private getShopDialogue(npc: NpcData, type: 'welcome'): string[] {
    if (npc.shopDialogueIds?.shopOpen) {
      return npc.shopDialogueIds.shopOpen;
    }
    return ["Bienvenue dans ma boutique !"];
  }

  private getQuestDialogue(npc: NpcData): string[] {
    if (npc.questDialogueIds?.questOffer) {
      return npc.questDialogueIds.questOffer;
    }
    return ["J'ai peut-être quelque chose pour vous..."];
  }

  private getDialogueLines(npc: NpcData): string[] {
    if (npc.dialogueIds?.length) {
      return npc.dialogueIds;
    }
    if (npc.properties?.dialogue) {
      return Array.isArray(npc.properties.dialogue) ? npc.properties.dialogue : [npc.properties.dialogue];
    }
    return [`Bonjour ! Je suis ${npc.name}.`];
  }

  private getHealerDialogue(npc: NpcData, type: 'welcome'): string[] {
    return ["Voulez-vous soigner vos Pokémon ?"];
  }

  private getTrainerDialogue(npc: NpcData, type: 'challenge'): string[] {
    return ["Hé ! Tu veux te battre ?"];
  }

  private getShopRestrictions(npc: NpcData, player: Player): MerchantData['restrictions'] {
    return {
      minLevel: npc.properties?.minLevel,
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
      config: this.config,
      version: '1.0.0',
      supportedCapabilities: this.config.enabledCapabilities
    };
  }
}
