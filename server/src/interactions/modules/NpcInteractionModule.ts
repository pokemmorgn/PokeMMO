// src/interactions/modules/NpcInteractionModule.ts - VERSION SÉCURISÉE
import { Player } from "../../schema/PokeWorldState";
import { QuestManager } from "../../managers/QuestManager";
import { ShopManager } from "../../managers/ShopManager";
import { StarterHandlers } from "../../handlers/StarterHandlers";
import { InventoryManager } from "../../managers/InventoryManager";
import { SpectatorManager } from "../../battle/modules/broadcast/SpectatorManager";
import { 
  InteractionRequest, 
  InteractionResult, 
  InteractionContext,
  InteractionType
} from "../types/BaseInteractionTypes";
import { BaseInteractionModule } from "../interfaces/InteractionModule";
import { DialogStringModel, SupportedLanguage } from "../../models/DialogString";
import { 
  NPCIntelligenceConnector, 
  getNPCIntelligenceConnector,
  handleSmartNPCInteraction,
  registerNPCsWithAI
} from "../../Intelligence/NPCSystem/NPCIntelligenceConnector";
import type { SmartNPCResponse } from "../../Intelligence/NPCSystem/NPCIntelligenceConnector";
import { ActionType } from "../../Intelligence/Core/ActionTypes";
import { UnifiedInterfaceHandler } from "./npc/handlers/UnifiedInterfaceHandler";
import { 
  UnifiedInterfaceResult, 
  NpcCapability, 
  SpecificActionRequest,
  SpecificActionResult
} from "../types/UnifiedInterfaceTypes";
import { MerchantNpcHandler } from "./npc/handlers/MerchantNpcHandler";

export interface NpcInteractionResult extends InteractionResult {
  shopId?: string;
  shopData?: any;
  lines?: string[];
  availableQuests?: any[];
  questRewards?: any[];
  questProgress?: any[];
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
  
  npcId: number;
  npcName: string;
  isUnifiedInterface: boolean;
  capabilities: NpcCapability[];
  contextualData: {
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
  
  isIntelligentResponse?: boolean;
  intelligenceUsed?: boolean;
  aiAnalysisConfidence?: number;
  personalizedLevel?: number;
  relationshipLevel?: string;
  proactiveHelp?: boolean;
  followUpQuestions?: string[];
  tracking?: any;
  
  isPostQuestDialogue?: boolean;
  completedQuestName?: string;
  completedAt?: Date;
  
  unifiedInterface?: UnifiedInterfaceResult;
  unifiedMode?: boolean;
}

interface NPCIntelligenceConfig {
  enableIntelligence: boolean;
  enabledNPCTypes: string[];
  enabledZones: string[];
  fallbackToLegacy: boolean;
  analysisTimeout: number;
  minConfidenceThreshold: number;
  debugMode: boolean;
}

export interface EnhancedInteractionContext extends InteractionContext {
  userId?: string;
  sessionId?: string;
}

export class NpcInteractionModule extends BaseInteractionModule {
  
  readonly moduleName = "NpcInteractionModule";
  readonly supportedTypes: InteractionType[] = ["npc"];
  readonly version = "5.0.0";

  private getNpcManager: (zoneName: string) => any;
  private questManager: QuestManager;
  private shopManager: ShopManager;
  private starterHandlers: StarterHandlers;
  private spectatorManager: SpectatorManager;
  
  private merchantHandler: MerchantNpcHandler;
  private unifiedInterfaceHandler: UnifiedInterfaceHandler;

  private intelligenceConnector: NPCIntelligenceConnector;
  private intelligenceConfig: NPCIntelligenceConfig;
  private npcsRegisteredWithAI: Set<number> = new Set();

  constructor(
    getNpcManager: (zoneName: string) => any,
    questManager: QuestManager,
    shopManager: ShopManager,
    starterHandlers: StarterHandlers,
    spectatorManager: SpectatorManager,
    intelligenceConfig?: Partial<NPCIntelligenceConfig>
  ) {
    super();
    this.getNpcManager = getNpcManager;
    this.questManager = questManager;
    this.shopManager = shopManager;
    this.starterHandlers = starterHandlers;
    this.spectatorManager = spectatorManager;

    this.intelligenceConfig = {
      enableIntelligence: process.env.NPC_AI_ENABLED !== 'false',
      enabledNPCTypes: ['dialogue', 'healer', 'quest_master', 'researcher', 'merchant'],
      enabledZones: [],
      fallbackToLegacy: true,
      analysisTimeout: 5000,
      minConfidenceThreshold: 0.3,
      debugMode: process.env.NODE_ENV === 'development',
      ...intelligenceConfig
    };

    this.intelligenceConnector = getNPCIntelligenceConnector();
    
    this.initializeHandlers();

    if (this.intelligenceConfig.enableIntelligence) {
      this.scheduleNPCRegistrationWithAI();
    }
  }

  private async createPlayerDialogVars(player: Player, npcName?: string, targetName?: string): Promise<Record<string, string>> {
    return {
      player: player.name,
      level: player.level.toString(),
      gold: player.gold.toString(),
      npc: npcName || '',
      target: targetName || '',
      zone: player.currentZone // ✅ SÉCURISÉ : Utilise currentZone du serveur
    };
  }

  private scheduleNPCRegistrationWithAI(): void {
    setTimeout(async () => {
      await this.registerAllNPCsWithAI();
    }, 2000);
  }

  private async registerAllNPCsWithAI(): Promise<void> {
    try {
      const allNPCs: any[] = [];
      const zones = ['villagelab', 'road1', 'lavandia']; // ✅ Utilise les noms de zones DB
      
      for (const zoneName of zones) {
        try {
          const npcManager = this.getNpcManager(zoneName);
          if (npcManager) {
            const zoneNPCs = npcManager.getAllNpcs();
            allNPCs.push(...zoneNPCs);
          }
        } catch (error) {
          console.warn(`⚠️ Impossible de récupérer les NPCs de ${zoneName}:`, error);
        }
      }

      if (allNPCs.length === 0) {
        return;
      }

      const result = await registerNPCsWithAI(allNPCs);
      
      for (const npc of allNPCs) {
        if (this.shouldNPCUseIntelligence(npc)) {
          this.npcsRegisteredWithAI.add(npc.id);
        }
      }

      if (result.errors.length > 0) {
        console.warn(`⚠️ Erreurs d'enregistrement IA:`, result.errors.slice(0, 5));
      }

    } catch (error) {
      console.error(`❌ Erreur enregistrement NPCs dans l'IA:`, error);
    }
  }

  private initializeHandlers(): void {
    try {
      this.merchantHandler = new MerchantNpcHandler(this.shopManager, {
        debugMode: process.env.NODE_ENV === 'development'
      });
      
      this.unifiedInterfaceHandler = new UnifiedInterfaceHandler(
        this.questManager,
        this.shopManager,
        this.merchantHandler,
        {
          debugMode: process.env.NODE_ENV === 'development',
          enabledCapabilities: ['merchant', 'quest', 'dialogue', 'healer', 'trainer'],
          maxCapabilitiesPerNpc: 4
        }
      );
      
    } catch (error) {
      throw new Error(`Impossible d'initialiser les handlers NPCs: ${error}`);
    }
  }

  canHandle(request: InteractionRequest): boolean {
    return request.type === 'npc' && request.data?.npcId !== undefined;
  }

  async handle(context: InteractionContext | EnhancedInteractionContext): Promise<InteractionResult> {
    const startTime = Date.now();
    
    try {
      const { player, request } = context;
      const enhancedContext = context as EnhancedInteractionContext;
      const npcId = request.data?.npcId;

      if (!npcId) {
        return this.createErrorResult("NPC ID manquant", "INVALID_REQUEST");
      }

      const requestAny = request as any;
      const playerLanguage = request.data?.playerLanguage || 
                            requestAny.playerLanguage || 
                            'fr';

      // 🔒 SÉCURITÉ : Utiliser SEULEMENT les données serveur
      console.log('🔒 [SECURITY] Zone serveur:', player.currentZone);
      console.log('🔒 [SECURITY] Position serveur:', player.x, player.y);

      if (this.intelligenceConfig.enableIntelligence && enhancedContext.userId) {
        try {
          const { trackPlayerAction } = await import("../../Intelligence/IntelligenceOrchestrator");
          
          await trackPlayerAction(
            enhancedContext.userId,
            ActionType.NPC_TALK,
            {
              npcId,
              playerLevel: player.level,
              playerGold: player.gold,
              zone: player.currentZone, // ✅ SÉCURISÉ : Utilise currentZone du serveur
              playerLanguage
            },
            {
              location: { 
                map: player.currentZone, // ✅ SÉCURISÉ : Utilise currentZone du serveur
                x: player.x,     // ✅ SÉCURISÉ : Utilise x du serveur
                y: player.y      // ✅ SÉCURISÉ : Utilise y du serveur
              }
            }
          );
          
        } catch (error) {
          console.warn(`⚠️ [AI] Erreur tracking:`, error);
        }
      }
      
      const result = await this.handleNpcInteractionWithAI(player, npcId, request, enhancedContext.userId, playerLanguage);

      const processingTime = Date.now() - startTime;
      this.updateStats(result.success, processingTime);

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue',
        "PROCESSING_FAILED"
      );
    }
  }

  private async handleNpcInteractionWithAI(
    player: Player, 
    npcId: number, 
    request: InteractionRequest,
    userId?: string,
    playerLanguage: string = 'fr'
  ): Promise<NpcInteractionResult> {
    
    // 🔒 SÉCURITÉ : Utiliser SEULEMENT player.currentZone (données serveur)
    const serverZone = player.currentZone;
    console.log('🔒 [SECURITY] Utilisation zone serveur:', serverZone);
    
    const npcManager = this.getNpcManager(serverZone);
    if (!npcManager) {
      return this.createSafeErrorResult(npcId, "NPCs non disponibles dans cette zone.");
    }

    // 🔒 SÉCURITÉ : Chercher le NPC avec la zone serveur
    const npc = npcManager.getNpcById(npcId, serverZone);
    if (!npc) {
      return this.createSafeErrorResult(npcId, "NPC inconnu dans cette zone.");
    }

    // 🔒 SÉCURITÉ : Vérifier la distance avec les coordonnées serveur
    const distance = Math.sqrt(
      Math.pow(player.x - npc.x, 2) + 
      Math.pow(player.y - npc.y, 2)
    );

    if (distance > 100) { // 100 pixels max
      return this.createSafeErrorResult(npcId, `Trop loin du NPC (distance: ${Math.round(distance)})`);
    }

    console.log('✅ [SECURITY] Validation distance OK:', Math.round(distance), 'pixels');

    const safeNpcId = npc.id ?? npcId;
    const safeNpcName = npc.name || `NPC #${npcId}`;

    if (this.shouldUseIntelligentInteraction(npc) && userId) {
      try {
        const intelligentResult = await this.handleIntelligentNPCInteraction(
          player, npc, safeNpcId, safeNpcName, request, userId, playerLanguage
        );
        
        if (intelligentResult.intelligenceUsed) {
          return intelligentResult;
        }
        
      } catch (error) {
        if (!this.intelligenceConfig.fallbackToLegacy) {
          return this.createSafeErrorResult(safeNpcId, "Erreur système d'intelligence");
        }
      }
    }

    const legacyResult = await this.handleLegacyNpcInteractionLogic(player, npc, safeNpcId, playerLanguage);
    
    const enrichedResult: NpcInteractionResult = {
      ...legacyResult,
      intelligenceUsed: false,
      isIntelligentResponse: false,
      aiAnalysisConfidence: 0,
      personalizedLevel: 0,
      relationshipLevel: 'unknown'
    };

    return enrichedResult;
  }

  private async handleIntelligentNPCInteraction(
    player: Player,
    npc: any,
    npcId: number,
    npcName: string,
    request: InteractionRequest,
    userId: string,
    playerLanguage: string = 'fr'
  ): Promise<NpcInteractionResult> {
    
    const context = {
      playerAction: request.data?.action || 'dialogue',
      location: {
        map: player.currentZone, // ✅ SÉCURISÉ : Utilise currentZone du serveur
        x: player.x,     // ✅ SÉCURISÉ : Utilise x du serveur
        y: player.y      // ✅ SÉCURISÉ : Utilise y du serveur
      },
      sessionData: {
        sessionId: (request as any).sessionId,
        interactionCount: (request as any).interactionCount || 1
      },
      playerPreferences: {
        language: playerLanguage
      }
    };

    try {
      const smartResponse: SmartNPCResponse = await handleSmartNPCInteraction(
        userId,
        npcId.toString(),
        'dialogue',
        context
      );

      if (!smartResponse.success) {
        return {
          success: false,
          type: "error",
          message: "IA non applicable",
          npcId: npcId,
          npcName: npcName,
          isUnifiedInterface: false,
          capabilities: [],
          contextualData: {
            hasShop: false,
            hasQuests: false,
            hasHealing: false,
            defaultAction: 'dialogue',
            quickActions: []
          },
          intelligenceUsed: false,
          isIntelligentResponse: false
        };
      }

      await this.recordActionForAILearning(player, npcId, 'npc_interaction', {
        npcName,
        interactionType: 'dialogue',
        analysisUsed: true,
        smartResponse: smartResponse.dialogue.message,
        userId: userId,
        playerLanguage: playerLanguage
      });

      const result: NpcInteractionResult = {
        success: true,
        type: this.mapAIResponseTypeToNpcType(smartResponse) as any,
        message: smartResponse.dialogue.message,

        npcId: npcId,
        npcName: npcName,
        isUnifiedInterface: false,
        capabilities: this.extractCapabilitiesFromActions(smartResponse.actions),
        contextualData: this.buildContextualDataFromResponse(smartResponse),

        intelligenceUsed: true,
        isIntelligentResponse: true,
        aiAnalysisConfidence: smartResponse.metadata.analysisConfidence,
        personalizedLevel: smartResponse.metadata.personalizedLevel,
        relationshipLevel: smartResponse.metadata.relationshipLevel,
        proactiveHelp: smartResponse.metadata.isProactiveHelp,
        followUpQuestions: smartResponse.followUpQuestions,

        lines: [smartResponse.dialogue.message],

        ...(this.hasShopActions(smartResponse.actions) && {
          shopId: this.extractShopIdFromActions(smartResponse.actions),
          shopData: this.extractShopDataFromActions(smartResponse.actions)
        }),

        ...(this.hasQuestActions(smartResponse.actions) && {
          availableQuests: this.extractQuestDataFromActions(smartResponse.actions),
          questProgress: []
        }),

        tracking: smartResponse.tracking
      };

      return result;

    } catch (error) {
      return {
        success: false,
        type: "error",
        message: error instanceof Error ? error.message : 'Erreur IA inconnue',
        npcId: npcId,
        npcName: npcName,
        isUnifiedInterface: false,
        capabilities: [],
        contextualData: {
          hasShop: false,
          hasQuests: false,
          hasHealing: false,
          defaultAction: 'dialogue',
          quickActions: []
        },
        intelligenceUsed: false,
        isIntelligentResponse: false
      };
    }
  }

  private async handleLegacyNpcInteractionLogic(player: Player, npc: any, npcId: number, playerLanguage: string = 'fr'): Promise<NpcInteractionResult> {
    
    // ✅ ÉTAPE 1 : Analyser les quêtes du NPC (TOUJOURS en premier)
    const questInfo = await this.analyzeNpcQuests(player, npc, npcId);
    console.log('🔍 [QUEST] Analyse NPC:', questInfo);

    try {
      const recentQuest = await this.questManager.getRecentlyCompletedQuestByNpc(player.name, npcId, 24);
      
      if (recentQuest && recentQuest.questDefinition.dialogues?.postQuestDialogue) {
        const postQuestLines = await this.getPostQuestDialogue(recentQuest.questDefinition, player, playerLanguage);
        
        return {
          success: true,
          type: "dialogue",
          message: postQuestLines[0] || "Félicitations pour votre quête terminée !",
          lines: postQuestLines,
          npcId: npcId,
          npcName: npc.name || `NPC #${npcId}`,
          isUnifiedInterface: false,
          capabilities: questInfo.hasAnyQuests ? ['dialogue', 'quest'] : ['dialogue'],
          contextualData: {
            hasShop: false,
            hasQuests: questInfo.hasAnyQuests,
            hasHealing: false,
            defaultAction: 'dialogue',
            quickActions: questInfo.hasAnyQuests ? this.createQuestQuickActions() : []
          },
          isPostQuestDialogue: true,
          completedQuestName: recentQuest.questDefinition.name,
          completedAt: recentQuest.completedAt,
          // ✅ DONNÉES QUEST TOUJOURS INCLUSES
          ...questInfo.questData
        };
      }
      
    } catch (error) {
      // Continue vers la logique normale en cas d'erreur
    }

    if (npc.properties?.startertable === true || npc.properties?.startertable === 'true') {
      return await this.handleStarterTableInteraction(player, npc, npcId);
    }

    const talkValidationResult = await this.checkTalkObjectiveValidation(player.name, npcId);
    if (talkValidationResult) {
      return talkValidationResult;
    }

    let questProgress: any[] = [];
    try {
      const progressResult = await this.questManager.progressQuest(player.name, {
        type: 'talk',
        target: npcId.toString(),
        amount: 1,
        data: {
          npc: {
            id: npcId,
            name: npc.name || `NPC #${npcId}`,
            type: npc.type || 'dialogue'
          },
          location: {
            x: player.x,     // ✅ SÉCURISÉ : Utilise x du serveur
            y: player.y,     // ✅ SÉCURISÉ : Utilise y du serveur
            map: player.currentZone  // ✅ SÉCURISÉ : Utilise currentZone du serveur
          }
        }
      });
      
      questProgress = progressResult.results || [];
    } catch (error) {
      // Continue en cas d'erreur
    }

    // ✅ ÉTAPE 2 : Vérifier quêtes prioritaires (completion d'abord)
    if (questInfo.questsToComplete.length > 0) {
      const firstQuest = questInfo.questsToComplete[0];
      const questDefinition = this.questManager.getQuestDefinition(firstQuest.id);
      const completionDialogue = await this.getQuestDialogue(questDefinition, 'questComplete', player, playerLanguage);
      
      const completionResults = [];
      for (const quest of questInfo.questsToComplete) {
        const result = await this.questManager.completePlayerQuest(player.name, quest.id);
        if (result.success) {
          completionResults.push({
            questId: quest.id,
            questName: questDefinition?.name || quest.id,
            questRewards: result.rewards || [],
            message: result.message
          });
        }
      }
      
      if (completionResults.length > 0) {
        const totalRewards = completionResults.reduce((acc, result) => {
          return [...acc, ...(result.questRewards || [])];
        }, []);
        
        const questNames = completionResults.map(r => r.questName).join(', ');
        
        return {
          success: true,
          type: "questComplete",
          questId: completionResults[0].questId,
          questName: questNames,
          questRewards: totalRewards,
          questProgress: questProgress,
          npcId: npcId,
          npcName: npc.name || `NPC #${npcId}`,
          isUnifiedInterface: false,
          capabilities: ['quest'],
          contextualData: {
            hasShop: false,
            hasQuests: true,
            hasHealing: false,
            defaultAction: 'quest',
            quickActions: this.createQuestQuickActions()
          },
          lines: completionDialogue,
          message: `Félicitations ! Vous avez terminé : ${questNames}`,
          // ✅ DONNÉES QUEST COMPLÈTES
          ...questInfo.questData
        };
      }
    }

    // ✅ ÉTAPE 3 : Vérifier nouvelles quêtes disponibles
    if (questInfo.availableQuests.length > 0) {
      const firstQuest = questInfo.availableQuests[0];
      const questOfferDialogue = await this.getQuestDialogue(firstQuest, 'questOffer', player, playerLanguage);
      
      return {
        success: true,
        type: "questGiver",
        message: questOfferDialogue.join(' '),
        lines: questOfferDialogue,
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name || `NPC #${npcId}`,
        isUnifiedInterface: false,
        capabilities: ['quest'],
        contextualData: {
          hasShop: false,
          hasQuests: true,
          hasHealing: false,
          defaultAction: 'quest',
          quickActions: this.createQuestQuickActions()
        },
        // ✅ DONNÉES QUEST COMPLÈTES
        ...questInfo.questData
      };
    }

    // ✅ ÉTAPE 4 : Type de NPC (avec quêtes intégrées)
    
    // 🔒 MARCHAND (+ quêtes optionnelles)
    if (npc.shopId || npc.properties?.shop) {
      const shopId = npc.shopId || npc.properties.shop;
      console.log('🛍️ [SECURITY] NPC marchand détecté, shopId:', shopId);
      
      const shopGreeting = await this.getShopGreeting(player, npc, playerLanguage);
      
      return { 
        success: true,
        type: "shop", 
        shopId: shopId,
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name || `NPC #${npcId}`,
        isUnifiedInterface: false,
        capabilities: questInfo.hasAnyQuests ? ['merchant', 'quest'] : ['merchant'],
        contextualData: {
          hasShop: true,
          hasQuests: questInfo.hasAnyQuests,  // ✅ Flag quest
          hasHealing: false,
          defaultAction: 'merchant',
          quickActions: this.createShopQuickActions(questInfo.hasAnyQuests)
        },
        lines: [shopGreeting],
        message: shopGreeting,
        // ✅ DONNÉES QUEST SI PRÉSENTES
        ...questInfo.questData
      };
    } 
    
    // 🏥 SOIGNEUR (+ quêtes optionnelles)
    else if (npc.properties?.healer || npc.type === 'healer') {
      const healerGreeting = await this.getHealerGreeting(player, npc, playerLanguage);
      
      return { 
        success: true,
        type: "heal", 
        message: healerGreeting,
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name || `NPC #${npcId}`,
        isUnifiedInterface: false,
        capabilities: questInfo.hasAnyQuests ? ['healer', 'quest'] : ['healer'],
        contextualData: {
          hasShop: false,
          hasQuests: questInfo.hasAnyQuests,  // ✅ Flag quest
          hasHealing: true,
          defaultAction: 'healer',
          quickActions: this.createHealerQuickActions(questInfo.hasAnyQuests)
        },
        lines: [healerGreeting],
        // ✅ DONNÉES QUEST SI PRÉSENTES
        ...questInfo.questData
      };
    } 
    
    // 💬 DIALOGUE avec dialogue spécifique (+ quêtes optionnelles)
    else if (npc.properties?.dialogue || npc.dialogueIds) {
      const lines = await this.getDialogueLines(npc, player, playerLanguage);
      return { 
        success: true,
        type: questInfo.hasAnyQuests ? "questGiver" : "dialogue",
        lines,
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name || `NPC #${npcId}`,
        isUnifiedInterface: false,
        capabilities: questInfo.hasAnyQuests ? ['dialogue', 'quest'] : ['dialogue'],
        contextualData: {
          hasShop: false,
          hasQuests: questInfo.hasAnyQuests,  // ✅ Flag quest
          hasHealing: false,
          defaultAction: questInfo.hasAnyQuests ? 'quest' : 'dialogue',
          quickActions: questInfo.hasAnyQuests ? this.createDialogueQuestQuickActions() : []
        },
        // ✅ DONNÉES QUEST SI PRÉSENTES
        ...questInfo.questData
      };
    } 
    
    // 💬 DIALOGUE par défaut (+ quêtes optionnelles)
    else {
      const defaultDialogue = await this.getDefaultDialogueForNpc(npc, player, playerLanguage);
      return { 
        success: true,
        type: questInfo.hasAnyQuests ? "questGiver" : "dialogue",
        lines: defaultDialogue,
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name || `NPC #${npcId}`,
        isUnifiedInterface: false,
        capabilities: questInfo.hasAnyQuests ? ['dialogue', 'quest'] : ['dialogue'],
        contextualData: {
          hasShop: false,
          hasQuests: questInfo.hasAnyQuests,  // ✅ Flag quest
          hasHealing: false,
          defaultAction: questInfo.hasAnyQuests ? 'quest' : 'dialogue',
          quickActions: questInfo.hasAnyQuests ? this.createDialogueQuestQuickActions() : []
        },
        // ✅ DONNÉES QUEST SI PRÉSENTES
        ...questInfo.questData
      };
    }
  }

  // === ✅ NOUVELLES MÉTHODES POUR ANALYSE QUÊTES ===

  /**
   * Analyse complète des quêtes d'un NPC
   */
  private async analyzeNpcQuests(player: Player, npc: any, npcId: number): Promise<{
    hasAnyQuests: boolean;
    hasQuestsToGive: boolean;
    hasQuestsToEnd: boolean;
    availableQuests: any[];
    questsToComplete: any[];
    questsInProgress: any[];
    questData: any;
  }> {
    try {
      // Vérifier configuration NPC
      const hasQuestsToGive = !!(npc.questsToGive && npc.questsToGive.length > 0);
      const hasQuestsToEnd = !!(npc.questsToEnd && npc.questsToEnd.length > 0);

      console.log('🔍 [QUEST ANALYSIS] NPC config:', {
        npcId,
        questsToGive: npc.questsToGive || [],
        questsToEnd: npc.questsToEnd || [],
        hasQuestsToGive,
        hasQuestsToEnd
      });

      // Récupérer quêtes disponibles
      const availableQuests = hasQuestsToGive ? 
        await this.getQuestsByIds(npc.questsToGive) : [];

      // Récupérer quêtes à terminer
      const questsToComplete = hasQuestsToEnd ? 
        await this.getActiveQuestsForCompletion(player.name, npc.questsToEnd) : [];

      // Récupérer quêtes en cours
      const questsInProgress = await this.getQuestsInProgressForNpc(player.name, npcId);

      const hasAnyQuests = hasQuestsToGive || hasQuestsToEnd || 
                          availableQuests.length > 0 || 
                          questsToComplete.length > 0 || 
                          questsInProgress.length > 0;

      console.log('🔍 [QUEST ANALYSIS] Résultats:', {
        hasAnyQuests,
        availableQuests: availableQuests.length,
        questsToComplete: questsToComplete.length,
        questsInProgress: questsInProgress.length
      });

      // Construire les données quest pour le client
      const questData = hasAnyQuests ? {
        availableQuests: this.serializeQuests(availableQuests),
        questsToComplete: questsToComplete,
        questsInProgress: questsInProgress,
        hasQuestDialogue: availableQuests.length > 0,
        questDialogue: availableQuests.length > 0 ? 
          await this.getQuestOfferDialogue(availableQuests[0], player) : []
      } : {};

      return {
        hasAnyQuests,
        hasQuestsToGive,
        hasQuestsToEnd,
        availableQuests,
        questsToComplete,
        questsInProgress,
        questData
      };

    } catch (error) {
      console.error('❌ [QUEST ANALYSIS] Erreur:', error);
      return {
        hasAnyQuests: false,
        hasQuestsToGive: false,
        hasQuestsToEnd: false,
        availableQuests: [],
        questsToComplete: [],
        questsInProgress: [],
        questData: {}
      };
    }
  }

  /**
   * Récupère les quêtes par IDs
   */
  private async getQuestsByIds(questIds: string[]): Promise<any[]> {
    try {
      const quests = [];
      for (const questId of questIds) {
        const quest = this.questManager.getQuestDefinition(questId);
        if (quest) {
          quests.push(quest);
        }
      }
      return quests;
    } catch (error) {
      console.error('❌ [QUEST] Erreur récupération quêtes par IDs:', error);
      return [];
    }
  }

  /**
   * Récupère les quêtes actives prêtes à être terminées
   */
  private async getActiveQuestsForCompletion(username: string, questIds: string[]): Promise<any[]> {
    try {
      const activeQuests = await this.questManager.getActiveQuests(username);
      return activeQuests.filter(quest => 
        questIds.includes(quest.id) && quest.status === 'readyToComplete'
      );
    } catch (error) {
      console.error('❌ [QUEST] Erreur récupération quêtes completion:', error);
      return [];
    }
  }

  /**
   * Récupère les quêtes en cours pour un NPC
   */
  private async getQuestsInProgressForNpc(username: string, npcId: number): Promise<any[]> {
    try {
      const activeQuests = await this.questManager.getActiveQuests(username);
      return activeQuests.filter(quest => 
        (quest.startNpcId === npcId || quest.endNpcId === npcId) && 
        quest.status !== 'readyToComplete'
      );
    } catch (error) {
      console.error('❌ [QUEST] Erreur récupération quêtes en cours:', error);
      return [];
    }
  }

  /**
   * Sérialise les quêtes pour le client
   */
  private serializeQuests(quests: any[]): any[] {
    return quests.map(quest => ({
      id: quest.id,
      name: quest.name,
      description: quest.description,
      category: quest.category || 'general',
      difficulty: quest.difficulty || 'Moyen',
      rewards: quest.rewards || [],
      steps: quest.steps ? quest.steps.map((step: any) => ({
        id: step.id,
        name: step.name,
        description: step.description,
        objectives: step.objectives || [],
        rewards: step.rewards || []
      })) : []
    }));
  }

  /**
   * Récupère le dialogue d'offre de quête
   */
  private async getQuestOfferDialogue(quest: any, player: Player, playerLanguage: string = 'fr'): Promise<string[]> {
    try {
      return await this.getQuestDialogue(quest, 'questOffer', player, playerLanguage);
    } catch (error) {
      return [`J'ai une mission pour vous, ${player.name}...`];
    }
  }

  // === ✅ MÉTHODES QUICK ACTIONS ===

  /**
   * Crée les actions rapides pour les quêtes uniquement
   */
  private createQuestQuickActions(): any[] {
    return [
      {
        id: 'quest',
        label: 'Quêtes',
        action: 'quest',
        enabled: true
      }
    ];
  }

  /**
   * Crée les actions rapides pour marchand (+ quêtes optionnelles)
   */
  private createShopQuickActions(hasQuests: boolean): any[] {
    const actions = [
      {
        id: 'merchant',
        label: 'Boutique',
        action: 'merchant',
        enabled: true
      }
    ];

    if (hasQuests) {
      actions.push({
        id: 'quest',
        label: 'Quêtes',
        action: 'quest',
        enabled: true
      });
    }

    return actions;
  }

  /**
   * Crée les actions rapides pour soigneur (+ quêtes optionnelles)
   */
  private createHealerQuickActions(hasQuests: boolean): any[] {
    const actions = [
      {
        id: 'healer',
        label: 'Soins',
        action: 'healer',
        enabled: true
      }
    ];

    if (hasQuests) {
      actions.push({
        id: 'quest',
        label: 'Quêtes',
        action: 'quest',
        enabled: true
      });
    }

    return actions;
  }

  /**
   * Crée les actions rapides pour dialogue + quêtes
   */
  private createDialogueQuestQuickActions(): any[] {
    return [
      {
        id: 'dialogue',
        label: 'Parler',
        action: 'dialogue',
        enabled: true
      },
      {
        id: 'quest',
        label: 'Quêtes',
        action: 'quest',
        enabled: true
      }
    ];
  }
  
  private async getPostQuestDialogue(questDefinition: any, player: Player, playerLanguage: string = 'fr'): Promise<string[]> {
    try {
      const questId = questDefinition.id || 'unknown_quest';
      const dialogVars = await this.createPlayerDialogVars(player, undefined, questDefinition.name);
      
      const postQuestDialogId = `quest.${questId}.postQuestDialogue`;
      let dialogue = await DialogStringModel.findOne({
        dialogId: postQuestDialogId,
        isActive: true
      });
      
      if (dialogue) {
        const text = dialogue.replaceVariables(playerLanguage as SupportedLanguage, player.name, questDefinition.name);
        return [text];
      }
      
      if (questDefinition.dialogues?.postQuestDialogue && Array.isArray(questDefinition.dialogues.postQuestDialogue)) {
        const postQuestLines = questDefinition.dialogues.postQuestDialogue.map((line: string) => {
          return line
            .replace('%player%', player.name)
            .replace('%quest%', questDefinition.name)
            .replace('%level%', player.level.toString());
        });
        
        return postQuestLines;
      }
      
      const genericPostDialogId = `generic.quest.postQuestDialogue`;
      const genericDialogue = await DialogStringModel.findOne({
        dialogId: genericPostDialogId,
        isActive: true
      });
      
      if (genericDialogue) {
        const text = genericDialogue.replaceVariables(playerLanguage as SupportedLanguage, player.name, questDefinition.name);
        return [text];
      }
      
      const fallbackMessage = playerLanguage === 'en' 
        ? `Thank you for completing "${questDefinition.name}", ${player.name}! Feel free to talk to me anytime.`
        : `Merci d'avoir terminé "${questDefinition.name}", ${player.name} ! N'hésitez pas à me reparler à tout moment.`;
      
      return [fallbackMessage];
      
    } catch (error) {
      return [`Félicitations pour avoir terminé votre quête, ${player.name} !`];
    }
  }

  private async getShopGreeting(player: Player, npc: any, playerLanguage: string = 'fr'): Promise<string> {
    try {
      const npcIdentifier = this.extractNpcIdentifier(npc);
      
      const dialogPatterns = [
        `${npcIdentifier}.shop.greeting`,
        `generic.shop.welcome`
      ];

      for (const pattern of dialogPatterns) {
        const dialogue = await DialogStringModel.findOne({
          dialogId: pattern,
          isActive: true
        });

        if (dialogue) {
          return dialogue.replaceVariables(playerLanguage as SupportedLanguage, player.name);
        }
      }
      
      return `Bienvenue dans ma boutique, ${player.name} !`;
      
    } catch (error) {
      return `Bienvenue dans ma boutique, ${player.name} !`;
    }
  }

  private async getHealerGreeting(player: Player, npc: any, playerLanguage: string = 'fr'): Promise<string> {
    try {
      const npcIdentifier = this.extractNpcIdentifier(npc);
      
      const dialogPatterns = [
        `${npcIdentifier}.healer.greeting`,
        `generic.healer.welcome`
      ];

      for (const pattern of dialogPatterns) {
        const dialogue = await DialogStringModel.findOne({
          dialogId: pattern,
          isActive: true
        });

        if (dialogue) {
          return dialogue.replaceVariables(playerLanguage as SupportedLanguage, player.name);
        }
      }
      
      return `Vos Pokémon sont soignés, ${player.name} ! Ils sont maintenant en pleine forme.`;
      
    } catch (error) {
      return `Vos Pokémon sont soignés !`;
    }
  }

  private extractNpcIdentifier(npc: any): string {
    if (npc.dialogId) return npc.dialogId;
    if (npc.name) return npc.name.toLowerCase().replace(/\s+/g, '_');
    if (npc.id) return `npc_${npc.id}`;
    return 'unknown_npc';
  }

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
    try {
      const serverZone = player.currentZone; // ✅ SÉCURISÉ : Utilise currentZone du serveur
      const npcManager = this.getNpcManager(serverZone);
      if (npcManager) {
        const allNpcs = npcManager.getAllNpcs();
        const merchantNpc = allNpcs.find((npc: any) => 
          this.merchantHandler.isMerchantNpc(npc) && 
          (npc.shopId === shopId || npc.properties?.shopId === shopId || npc.properties?.shop === shopId)
        );
        
        if (merchantNpc) {
          return await this.merchantHandler.handleShopTransaction(player, merchantNpc, action, itemId, quantity);
        }
      }
    } catch (error) {
      console.warn('Erreur délégation MerchantHandler, fallback vers logique legacy', error);
    }

    const playerGold = player.gold || 1000;
    const playerLevel = player.level || 1;

    if (action === 'buy') {
      const result = await this.shopManager.buyItem(
        player.name,
        shopId, 
        itemId, 
        quantity, 
        playerGold, 
        playerLevel
      );
      
      return result;
      
    } else if (action === 'sell') {
      const result = await this.shopManager.sellItem(
        player.name,
        shopId, 
        itemId, 
        quantity
      );
      
      return result;
    }

    return {
      success: false,
      message: "Action non reconnue"
    };
  }

  async handleQuestStart(username: string, questId: string): Promise<{ success: boolean; message: string; quest?: any }> {
    try {
      const giveResult = await this.questManager.giveQuest(username, questId);
      
      if (giveResult.success) {
        return {
          success: true,
          message: giveResult.message,
          quest: giveResult.quest
        };
      } else {
        return {
          success: false,
          message: giveResult.message
        };
      }
      
    } catch (error) {
      return {
        success: false,
        message: `Erreur lors du démarrage de la quête: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  async handlePlayerInteraction(
    spectatorPlayer: Player, 
    targetPlayerId: string,
    targetPlayerPosition: { x: number; y: number; mapId: string }
  ): Promise<NpcInteractionResult> {
    
    const battleStatus = this.spectatorManager.getPlayerBattleStatus(targetPlayerId);
    
    if (!battleStatus.inBattle) {
      return {
        success: false,
        type: "error",
        message: "Ce joueur n'est pas en combat actuellement.",
        npcId: 0,
        npcName: targetPlayerId,
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
    
    const spectatorRequest = {
      spectatorId: spectatorPlayer.name,
      targetPlayerId: targetPlayerId,
      spectatorPosition: {
        x: spectatorPlayer.x,    // ✅ SÉCURISÉ : Utilise x du serveur
        y: spectatorPlayer.y,    // ✅ SÉCURISÉ : Utilise y du serveur
        mapId: spectatorPlayer.currentZone // ✅ SÉCURISÉ : Utilise currentZone du serveur
      },
      targetPosition: targetPlayerPosition,
      interactionDistance: 100
    };
    
    const watchResult = this.spectatorManager.requestWatchBattle(spectatorRequest);
    
    if (!watchResult.canWatch) {
      return {
        success: false,
        type: "error",
        message: watchResult.reason || "Impossible de regarder ce combat",
        npcId: 0,
        npcName: targetPlayerId,
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
    
    return {
      success: true,
      type: "battleSpectate",
      message: `Vous regardez le combat de ${targetPlayerId}`,
      battleSpectate: {
        battleId: watchResult.battleId!,
        battleRoomId: watchResult.battleRoomId!,
        targetPlayerName: targetPlayerId,
        canWatch: true
      },
      npcId: 0,
      npcName: targetPlayerId,
      isUnifiedInterface: false,
      capabilities: ['service'],
      contextualData: {
        hasShop: false,
        hasQuests: false,
        hasHealing: false,
        defaultAction: 'service',
        quickActions: []
      }
    };
  }

  async handleSpecificAction(
    player: Player, 
    request: SpecificActionRequest
  ): Promise<SpecificActionResult> {
    
    try {
      const serverZone = player.currentZone; // ✅ SÉCURISÉ : Utilise currentZone du serveur
      const npcManager = this.getNpcManager(serverZone);
      if (!npcManager) {
        return {
          success: false,
          type: "error",
          message: "NPCs non disponibles dans cette zone",
          actionType: request.actionType,
          npcId: request.npcId
        };
      }

      const npc = npcManager.getNpcById(request.npcId, serverZone); // ✅ SÉCURISÉ : Avec zone serveur
      if (!npc) {
        return {
          success: false,
          type: "error",
          message: "NPC introuvable",
          actionType: request.actionType,
          npcId: request.npcId
        };
      }

      switch (request.actionType) {
        case 'merchant':
          return await this.handleMerchantSpecificAction(player, npc, request);
          
        case 'quest':
          return await this.handleQuestSpecificAction(player, npc, request);
          
        case 'dialogue':
          return await this.handleDialogueSpecificAction(player, npc, request);
          
        default:
          return {
            success: false,
            type: "error",
            message: `Action ${request.actionType} non implémentée`,
            actionType: request.actionType,
            npcId: request.npcId
          };
      }

    } catch (error) {
      return {
        success: false,
        type: "error",
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        actionType: request.actionType,
        npcId: request.npcId
      };
    }
  }

  private createSafeErrorResult(npcId: number, message: string): NpcInteractionResult {
    return {
      success: false,
      type: "error",
      message: message,
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
      },
      intelligenceUsed: false,
      isIntelligentResponse: false
    };
  }

  protected createErrorResult(message: string, code: string): InteractionResult {
    return {
      success: false,
      type: 'error',
      message,
      data: {
        metadata: {
          errorCode: code,
          timestamp: Date.now()
        }
      }
    };
  }

  private shouldUseIntelligentInteraction(npc: any): boolean {
    if (!this.intelligenceConfig.enableIntelligence) return false;
    const npcData = npc;
    if (!npcData) return false;
    return this.shouldNPCUseIntelligence(npcData);
  }

  private shouldNPCUseIntelligence(npc: any): boolean {
    if (this.intelligenceConfig.enabledNPCTypes.length > 0 && 
        !this.intelligenceConfig.enabledNPCTypes.includes(npc.type)) {
      return false;
    }
    if (this.intelligenceConfig.enabledZones.length > 0 && 
        !this.intelligenceConfig.enabledZones.includes(npc.zone || '')) {
      return false;
    }
    return true;
  }

  private async recordActionForAILearning(player: Player, npcId: number, actionType: string, data: any): Promise<void> {
    try {
      const actionData = {
        npcId,
        actionType: 'npc_interaction',
        ...data
      };
    } catch (error) {
      console.warn(`⚠️ [AI Learning] Erreur enregistrement action:`, error);
    }
  }

  private mapAIResponseTypeToNpcType(smartResponse: any): string {
    return 'dialogue';
  }

  private extractCapabilitiesFromActions(actions: any[]): NpcCapability[] {
    return ['dialogue'];
  }

  private buildContextualDataFromResponse(smartResponse: any): any {
    return {
      hasShop: false,
      hasQuests: false, 
      hasHealing: false,
      defaultAction: 'dialogue',
      quickActions: []
    };
  }

  private hasShopActions(actions: any[]): boolean { return false; }
  private hasQuestActions(actions: any[]): boolean { return false; }
  private extractShopIdFromActions(actions: any[]): string | undefined { return undefined; }
  private extractShopDataFromActions(actions: any[]): any | undefined { return undefined; }
  private extractQuestDataFromActions(actions: any[]): any[] | undefined { return undefined; }

  private async handleStarterTableInteraction(player: Player, npc: any, npcId: number): Promise<NpcInteractionResult> {
    return this.createSafeErrorResult(npcId, "Starter table non implémenté");
  }

  private async checkTalkObjectiveValidation(username: string, npcId: number): Promise<NpcInteractionResult | null> {
    return null;
  }

  private async getQuestDialogue(questDefinition: any, dialogueType: string, player: Player, playerLanguage: string = 'fr'): Promise<string[]> {
    try {
      if (!questDefinition) return ["Dialogue par défaut"];
      
      const questId = questDefinition.id || 'unknown_quest';
      
      const dialogId = `quest.${questId}.${dialogueType}`;
      const dialogue = await DialogStringModel.findOne({
        dialogId: dialogId,
        isActive: true
      });
      
      if (dialogue) {
        const text = dialogue.replaceVariables(playerLanguage as SupportedLanguage, player.name, questDefinition.name);
        return [text];
      }
      
      const genericDialogId = `generic.quest.${dialogueType}`;
      const genericDialogue = await DialogStringModel.findOne({
        dialogId: genericDialogId,
        isActive: true
      });
      
      if (genericDialogue) {
        const text = genericDialogue.replaceVariables(playerLanguage as SupportedLanguage, player.name, questDefinition.name);
        return [text];
      }
      
      return ["Dialogue par défaut"];
      
    } catch (error) {
      return ["Dialogue par défaut"];
    }
  }

  private async getReadyToCompleteQuestsForNpc(username: string, npcId: number): Promise<any[]> {
    return [];
  }

  private async getAvailableQuestsForNpc(username: string, npcId: number): Promise<any[]> {
    return [];
  }

  private async getDialogueLines(npc: any, player: Player, playerLanguage: string = 'fr'): Promise<string[]> {
    try {
      const npcId = this.extractNpcIdentifier(npc);
      
      if (npc.dialogueIds && Array.isArray(npc.dialogueIds)) {
        const processedLines = [];
        
        for (const dialogId of npc.dialogueIds) {
          const dialogue = await DialogStringModel.findOne({
            dialogId: dialogId,
            isActive: true
          });
          
          if (dialogue) {
            const text = dialogue.replaceVariables(playerLanguage as SupportedLanguage, player.name);
            processedLines.push(text);
          } else {
            processedLines.push(dialogId);
          }
        }
        
        return processedLines;
      }
      
      const genericDialogue = await DialogStringModel.findOne({
        dialogId: `${npcId}.greeting.default`,
        isActive: true
      });
      
      if (genericDialogue) {
        const text = genericDialogue.replaceVariables(playerLanguage as SupportedLanguage, player.name);
        return [text];
      }
      
      if (npc.properties?.dialogue) {
        const dialogue = npc.properties.dialogue;
        const lines = Array.isArray(dialogue) ? dialogue : [dialogue];
        
        return lines.map((line: string) => {
          return line.replace('%s', player.name);
        });
      }
      
      return ["Bonjour !"];
      
    } catch (error) {
      return ["Bonjour !"];
    }
  }

  private async getDefaultDialogueForNpc(npc: any, player: Player, playerLanguage: string = 'fr'): Promise<string[]> {
    try {
      const npcId = this.extractNpcIdentifier(npc);
      
      let dialogue = await DialogStringModel.findOne({
        dialogId: `${npcId}.greeting.default`,
        isActive: true
      });
      
      if (!dialogue) {
        dialogue = await DialogStringModel.findOne({
          dialogId: 'generic.greeting.default',
          isActive: true
        });
      }
      
      if (dialogue) {
        const text = dialogue.replaceVariables(playerLanguage as SupportedLanguage, player.name, npc.name);
        return [text];
      }
      
      return [`Bonjour ${player.name} ! Je suis ${npc.name || 'un NPC'}.`];
      
    } catch (error) {
      return [`Bonjour ! Je suis ${npc.name || 'un NPC'}.`];
    }
  }

  private async handleMerchantSpecificAction(player: Player, npc: any, request: SpecificActionRequest): Promise<SpecificActionResult> {
    return {
      success: false,
      type: "error",
      message: "Merchant action non implémentée",
      actionType: request.actionType,
      npcId: request.npcId
    };
  }

  private async handleQuestSpecificAction(player: Player, npc: any, request: SpecificActionRequest): Promise<SpecificActionResult> {
    return {
      success: false,
      type: "error", 
      message: "Quest action non implémentée",
      actionType: request.actionType,
      npcId: request.npcId
    };
  }

  private async handleDialogueSpecificAction(player: Player, npc: any, request: SpecificActionRequest): Promise<SpecificActionResult> {
    const lines = await this.getDialogueLines(npc, player, 'fr');
    return {
      success: true,
      type: "dialogue",
      message: lines.join(' '),
      actionType: 'dialogue',
      npcId: npc.id
    };
  }
}
