// src/interactions/modules/NpcInteractionModule.ts - VERSION SÉCURISÉE AVEC CAPACITÉS CORRIGÉES
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
import { getDbZoneName } from '../../config/ZoneMapping';
import QuestDeliveryDetector, { 
  DeliveryDetectionResult, 
  DeliveryObjective 
} from "../../quest/services/QuestDeliveryDetector";
// ✅ NOUVEAU : Import du handler de livraison
import QuestDeliveryHandler, {
  DeliveryProcessingResult,
  MultiDeliveryProcessingResult
} from "../../quest/services/QuestDeliveryHandler";

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
  
  // ✅ AJOUTÉ : Données de livraison de quête
  deliveryData?: {
    npcId: string;
    npcName: string;
    deliveries: Array<{
      questId: string;
      questName: string;
      stepIndex: number;
      stepName: string;
      objectiveId: string;
      objectiveDescription: string;
      itemId: string;
      itemName: string;
      requiredAmount: number;
      playerHasAmount: number;
      canDeliver: boolean;
      isCompleted: boolean;
      npcId: string;
    }>;
    allItemsAvailable: boolean;
    totalDeliveries: number;
    readyDeliveries: number;
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
  readonly version = "5.1.0"; // ✅ Version incrémentée pour les correctifs

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
  private deliveryDetector: QuestDeliveryDetector;
  private deliveryHandler: QuestDeliveryHandler;
  
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
    
   this.deliveryDetector = new QuestDeliveryDetector({
      enableCaching: true,
      cacheTTL: 30000, // 30 secondes
      enableLogging: this.intelligenceConfig.debugMode,
      strictValidation: true,
      enableInventoryValidation: true
    });
    
    this.deliveryHandler = new QuestDeliveryHandler({
      enableLogging: this.intelligenceConfig.debugMode,
      strictValidation: true,
      enableRollback: true,
      validateInventoryBeforeProcessing: true,
      enableProgressNotifications: true
    });
    
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
    const serverZone = getDbZoneName(player.currentZone);
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
    
    // ✅ ÉTAPE 1 : Analyser TOUTES les capacités du NPC d'abord
    const npcCapabilities = await this.analyzeNpcCapabilities(player, npc, npcId);
    console.log('🔍 [NPC CAPABILITIES] Capacités détectées:', npcCapabilities);
    
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
          capabilities: npcCapabilities, // ✅ Utilise les capacités analysées
          contextualData: this.buildContextualDataFromCapabilities(npcCapabilities),
          isPostQuestDialogue: true,
          completedQuestName: recentQuest.questDefinition.name,
          completedAt: recentQuest.completedAt
        };
      }
      
    } catch (error) {
      // Continue vers la logique normale en cas d'erreur
    }

    // ✅ ÉTAPE 2 : Déterminer l'action principale en fonction des capacités prioritaires
    const primaryAction = this.determinePrimaryAction(npcCapabilities, npc);
    console.log('🎯 [NPC ACTION] Action principale déterminée:', primaryAction);
    
    // ✅ ÉTAPE 3 : Exécuter l'action principale
    return await this.executeNpcAction(player, npc, npcId, primaryAction, npcCapabilities, playerLanguage);
  }

  /**
   * ✅ CORRIGÉ : Analyse toutes les capacités d'un NPC avec détection quêtes FIXÉE
   */
private async analyzeNpcCapabilities(player: Player, npc: any, npcId: number): Promise<NpcCapability[]> {
  const capabilities: NpcCapability[] = [];
  
  console.log(`🔍 [NPC CAPABILITIES] === ANALYSE DÉTAILLÉE NPC ${npcId} (${npc.name}) ===`);
  
  // Capacité de base selon le type
  if (npc.type) {
    switch (npc.type) {
      case 'merchant':
        capabilities.push('merchant');
        break;
      case 'healer':
        capabilities.push('healer');
        break;
      case 'trainer':
        capabilities.push('trainer');
        break;
      case 'quest_master':
        capabilities.push('quest');
        break;
      default:
        capabilities.push('dialogue');
    }
  } else {
    capabilities.push('dialogue');
  }
  
  console.log(`📋 [NPC CAPABILITIES] Capacité de base: ${capabilities[0]} (type: ${npc.type})`);
  
  // ✅ VÉRIFICATION QUEST CORRIGÉE - Vérifier qu'il y a VRAIMENT des quêtes disponibles
  let hasQuestCapability = false;
  
  try {
    console.log(`🔍 [QUEST CAPABILITY] === VÉRIFICATION QUÊTES POUR NPC ${npcId} ===`);
    
    // ✅ ÉTAPE 1: Vérifier les quêtes DISPONIBLES (à donner)
    const availableQuests = await this.getAvailableQuestsForNpc(player.name, npcId);
    console.log(`📜 [QUEST CHECK] ${availableQuests.length} quête(s) disponible(s) trouvée(s)`);
    
    if (availableQuests.length > 0) {
      hasQuestCapability = true;
      console.log(`✅ [QUEST CAPABILITY] Quêtes disponibles trouvées:`, availableQuests.map(q => q.id));
    }
    
    // ✅ ÉTAPE 2: Vérifier les quêtes PRÊTES À COMPLÉTER
    if (!hasQuestCapability) {
      const readyQuests = await this.getReadyToCompleteQuestsForNpc(player.name, npcId);
      console.log(`🏁 [QUEST CHECK] ${readyQuests.length} quête(s) prête(s) à compléter`);
      
      if (readyQuests.length > 0) {
        hasQuestCapability = true;
        console.log(`✅ [QUEST CAPABILITY] Quêtes à terminer trouvées:`, readyQuests.map(q => q.id));
      }
    }
    
    // ✅ ÉTAPE 3: Double vérification via statuts individuels si pas encore trouvé
    if (!hasQuestCapability) {
      console.log(`🔍 [QUEST MANAGER] Vérification finale via QuestManager...`);
      const npcQuests = this.questManager.getQuestsForNpc(npcId);
      console.log(`📚 [QUEST MANAGER] ${npcQuests.length} quêtes définies pour NPC ${npcId}`);
      
      if (npcQuests.length > 0) {
        for (const questDef of npcQuests) {
          try {
            const questStatus = await this.questManager.getQuestStatus(player.name, questDef.id);
            console.log(`📊 [QUEST MANAGER] Quête ${questDef.id}: ${questStatus}`);
            
            // ✅ CORRECTION CRITIQUE : Seulement 'available' et 'readyToComplete' donnent la capacité quest
            if (questStatus === 'available' || questStatus === 'readyToComplete') {
              hasQuestCapability = true;
              console.log(`✅ [QUEST CAPABILITY] Quête viable via QuestManager: ${questDef.id} (${questStatus})`);
              break;
            } else {
              console.log(`❌ [QUEST CAPABILITY] Quête ${questDef.id} non viable (statut: ${questStatus})`);
            }
          } catch (questError) {
            console.warn(`⚠️ [QUEST MANAGER] Erreur statut quête ${questDef.id}:`, questError);
          }
        }
      }
    }
    
    // ✅ CORRECTION FINALE : Seulement ajouter 'quest' si réellement justifié
    if (hasQuestCapability && !capabilities.includes('quest')) {
      capabilities.push('quest');
      console.log(`✅ [QUEST CAPABILITY] Capacité 'quest' ajoutée - Quête(s) valide(s) trouvée(s)`);
    } else if (!hasQuestCapability) {
      console.log(`❌ [QUEST CAPABILITY] Aucune capacité 'quest' ajoutée - Aucune quête viable trouvée`);
      
      // ✅ NOUVEAU : Retirer 'quest' si elle était dans les capacités de base mais n'est plus valide
      if (capabilities.includes('quest')) {
        const questIndex = capabilities.indexOf('quest');
        capabilities.splice(questIndex, 1);
        console.log(`🗑️ [QUEST CAPABILITY] Capacité 'quest' retirée - Plus de quêtes viables`);
      }
    }
    
  } catch (error) {
    console.warn(`⚠️ [QUEST CAPABILITY] Erreur générale vérification quêtes:`, error);
    
    // ✅ CORRECTION : En cas d'erreur, retirer la capacité quest si elle était ajoutée par défaut
    if (capabilities.includes('quest')) {
      const questIndex = capabilities.indexOf('quest');
      capabilities.splice(questIndex, 1);
      console.log(`🗑️ [QUEST CAPABILITY] Capacité 'quest' retirée en cas d'erreur - Sécurité`);
    }
  }
  
  // ✅ Vérification de livraison (inchangée)
  try {
    console.log(`🚚 [DELIVERY CAPABILITY] === VÉRIFICATION LIVRAISONS POUR NPC ${npcId} ===`);
    
    const activeQuests = await this.questManager.getActiveQuests(player.name);
    const questDefinitions = new Map();
    
    for (const quest of activeQuests) {
      const definition = this.questManager.getQuestDefinition(quest.id);
      if (definition) {
        questDefinitions.set(quest.id, definition);
      }
    }
    
    const deliveryResult = await this.deliveryDetector.detectDeliveries(
      player.name,
      npcId.toString(),
      activeQuests,
      questDefinitions
    );
    
    if (deliveryResult.hasDeliveries && deliveryResult.totalDeliveries > 0) {
      if (!capabilities.includes('deliver')) {
        capabilities.push('deliver');
        console.log(`✅ [DELIVERY CAPABILITY] Capacité 'deliver' ajoutée`);
      }
    }
    
  } catch (deliveryError) {
    console.warn(`⚠️ [DELIVERY CAPABILITY] Erreur détection livraisons:`, deliveryError);
  }
  
  // ✅ Autres capacités (inchangées)
  if (npc.shopId || npc.properties?.shop) {
    if (!capabilities.includes('merchant')) {
      capabilities.push('merchant');
    }
  }
  
  if (npc.properties?.healer || npc.type === 'healer') {
    if (!capabilities.includes('healer')) {
      capabilities.push('healer');
    }
  }
  
  console.log(`🎯 [NPC CAPABILITIES] === RÉSULTAT FINAL ===`);
  console.log(`🎯 [NPC CAPABILITIES] Capacités pour NPC ${npcId}:`, capabilities);
  console.log(`🎯 [NPC CAPABILITIES] Quest capability: ${capabilities.includes('quest') ? 'OUI' : 'NON'}`);
  console.log(`🎯 [NPC CAPABILITIES] ================================`);
  
  return capabilities;
}

  /**
   * ✅ NOUVELLE IMPLÉMENTATION : Récupère les quêtes disponibles pour un NPC
   */
  private async getAvailableQuestsForNpc(username: string, npcId: number): Promise<any[]> {
    try {
      console.log(`🔍 [getAvailableQuestsForNpc] === RECHERCHE QUÊTES DISPONIBLES ===`);
      console.log(`👤 Joueur: ${username}, NPC: ${npcId}`);
      
      // 1. Récupérer toutes les quêtes disponibles pour le joueur
      const allAvailableQuests = await this.questManager.getAvailableQuests(username);
      console.log(`📚 [getAvailableQuestsForNpc] ${allAvailableQuests.length} quêtes disponibles au total`);
      
      // 2. Filtrer celles qui sont données par ce NPC
      const npcAvailableQuests = allAvailableQuests.filter(quest => 
        quest.startNpcId === npcId
      );
      
      console.log(`🎯 [getAvailableQuestsForNpc] ${npcAvailableQuests.length} quêtes disponibles pour NPC ${npcId}:`);
      npcAvailableQuests.forEach(quest => {
        console.log(`  📜 ${quest.id}: ${quest.name}`);
      });
      
      return npcAvailableQuests;
      
    } catch (error) {
      console.error(`❌ [getAvailableQuestsForNpc] Erreur:`, error);
      return [];
    }
  }

  /**
   * ✅ NOUVELLE IMPLÉMENTATION : Récupère les quêtes prêtes à compléter pour un NPC
   */
  private async getReadyToCompleteQuestsForNpc(username: string, npcId: number): Promise<any[]> {
    try {
      console.log(`🔍 [getReadyToCompleteQuestsForNpc] === RECHERCHE QUÊTES À TERMINER ===`);
      console.log(`👤 Joueur: ${username}, NPC: ${npcId}`);
      
      // 1. Récupérer toutes les quêtes actives du joueur
      const activeQuests = await this.questManager.getActiveQuests(username);
      console.log(`📚 [getReadyToCompleteQuestsForNpc] ${activeQuests.length} quêtes actives au total`);
      
      // 2. Filtrer celles qui sont terminées chez ce NPC
      const readyToCompleteQuests = activeQuests.filter(quest => 
        quest.endNpcId === npcId && quest.status === 'readyToComplete'
      );
      
      console.log(`🏁 [getReadyToCompleteQuestsForNpc] ${readyToCompleteQuests.length} quêtes prêtes à terminer pour NPC ${npcId}:`);
      readyToCompleteQuests.forEach(quest => {
        console.log(`  🎯 ${quest.id}: ${quest.name}`);
      });
      
      return readyToCompleteQuests;
      
    } catch (error) {
      console.error(`❌ [getReadyToCompleteQuestsForNpc] Erreur:`, error);
      return [];
    }
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Détermine l'action principale selon priorité
   */
  private determinePrimaryAction(capabilities: NpcCapability[], npc: any): NpcCapability {
    // Ordre de priorité des actions - ✅ DELIVER EN PREMIER !
    const priorityOrder: NpcCapability[] = [
      'deliver',    // ✅ NOUVEAU : Livraisons en priorité absolue !
      'quest',      // Puis quêtes normales
      'merchant',   // Puis boutique
      'healer',     // Puis soins
      'trainer',    // Puis combat
      'dialogue'    // Enfin dialogue
    ];
    
    for (const priority of priorityOrder) {
      if (capabilities.includes(priority)) {
        return priority;
      }
    }
    
    return 'dialogue'; // Fallback
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Exécute l'action principale avec toutes les capacités
   */
private async executeQuestAction(
  player: Player, 
  npc: any, 
  npcId: number, 
  capabilities: NpcCapability[], 
  questProgress: any[], 
  playerLanguage: string
): Promise<NpcInteractionResult> {
  console.log(`🎯 [executeQuestAction] === EXÉCUTION ACTION QUÊTE ===`);
  console.log(`👤 Joueur: ${player.name}, NPC: ${npcId}`);
  
  // ✅ NOUVEAU : Vérification préalable - Y a-t-il vraiment des quêtes ?
  const availableQuests = await this.getAvailableQuestsForNpc(player.name, npcId);
  const readyToCompleteQuests = await this.getReadyToCompleteQuestsForNpc(player.name, npcId);
  
  console.log(`📊 [executeQuestAction] État des quêtes:`, {
    available: availableQuests.length,
    readyToComplete: readyToCompleteQuests.length
  });
  
  // ✅ CORRECTION : Si aucune quête viable, fallback vers dialogue immédiatement
  if (availableQuests.length === 0 && readyToCompleteQuests.length === 0) {
    console.log(`❌ [executeQuestAction] Aucune quête viable trouvée - Fallback vers dialogue`);
    return await this.executeDialogueAction(player, npc, npcId, capabilities, questProgress, playerLanguage);
  }

  // ✅ Phase 0 - Détection automatique des livraisons (seulement si pas de quêtes à terminer)
  if (readyToCompleteQuests.length === 0) {
    try {
      const activeQuests = await this.questManager.getActiveQuests(player.name);
      const questDefinitions = new Map();
      
      for (const quest of activeQuests) {
        const definition = this.questManager.getQuestDefinition(quest.id);
        if (definition) {
          questDefinitions.set(quest.id, definition);
        }
      }
      
      const deliveryResult = await this.deliveryDetector.detectDeliveries(
        player.name,
        npcId.toString(),
        activeQuests,
        questDefinitions
      );
      
      if (deliveryResult.hasDeliveries && deliveryResult.totalDeliveries > 0) {
        console.log(`🚚 [executeQuestAction] ${deliveryResult.totalDeliveries} livraison(s) détectée(s)`);
        
        return {
          success: true,
          type: "dialogue",
          message: `${npc.name || `NPC #${npcId}`} attend une livraison de votre part.`,
          lines: [`J'attends que vous me livriez quelque chose, ${player.name}...`],
          
          npcId: npcId,
          npcName: npc.name || `NPC #${npcId}`,
          isUnifiedInterface: false,
          capabilities: capabilities,
          contextualData: this.buildContextualDataFromCapabilities(capabilities),
          
          deliveryData: {
            npcId: npcId.toString(),
            npcName: npc.name || `NPC #${npcId}`,
            deliveries: deliveryResult.deliveries,
            allItemsAvailable: deliveryResult.allItemsAvailable,
            totalDeliveries: deliveryResult.totalDeliveries,
            readyDeliveries: deliveryResult.readyDeliveries
          },
          
          questProgress: questProgress
        };
      }
      
    } catch (deliveryError) {
      console.warn(`⚠️ [executeQuestAction] Erreur détection livraisons:`, deliveryError);
    }
  }

  // ✅ PHASE 1 : Vérifier les quêtes à terminer (priorité absolue)
  if (readyToCompleteQuests.length > 0) {
    console.log(`🏁 [executeQuestAction] ${readyToCompleteQuests.length} quêtes à terminer`);
    
    const firstQuest = readyToCompleteQuests[0];
    const questDefinition = this.questManager.getQuestDefinition(firstQuest.id);
    const completionDialogue = await this.getQuestDialogue(questDefinition, 'questComplete', player, playerLanguage);
    
    const completionResults = [];
    for (const quest of readyToCompleteQuests) {
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
      
      // ✅ CORRECTION CRITIQUE : Recalculer les capacités APRÈS completion
      const updatedCapabilities = await this.analyzeNpcCapabilities(player, npc, npcId);
      
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
        capabilities: updatedCapabilities, // ✅ NOUVEAU : Capacités mises à jour
        contextualData: this.buildContextualDataFromCapabilities(updatedCapabilities),
        lines: completionDialogue,
        message: `Félicitations ! Vous avez terminé : ${questNames}`
      };
    }
  }

  // ✅ PHASE 2 : Vérifier les quêtes à donner
  if (availableQuests.length > 0) {
    console.log(`📜 [executeQuestAction] ${availableQuests.length} quêtes à donner`);
    
    const firstQuest = availableQuests[0];
    const questOfferDialogue = await this.getQuestDialogue(firstQuest, 'questOffer', player, playerLanguage);
    
    const serializedQuests = availableQuests.map(quest => ({
      id: quest.id,
      name: quest.name,
      description: quest.description,
      category: quest.category,
      steps: quest.steps.map((step: any) => ({
        id: step.id,
        name: step.name,
        description: step.description,
        objectives: step.objectives,
        rewards: step.rewards
      }))
    }));

    return {
      success: true,
      type: "questGiver",
      message: questOfferDialogue.join(' '),
      lines: questOfferDialogue,
      availableQuests: serializedQuests,
      questProgress: questProgress,
      npcId: npcId,
      npcName: npc.name || `NPC #${npcId}`,
      isUnifiedInterface: false,
      capabilities: capabilities,
      contextualData: this.buildContextualDataFromCapabilities(capabilities)
    };
  }

  // ✅ PHASE 3 : Fallback vers dialogue si plus rien
  console.log(`📭 [executeQuestAction] Aucune quête active trouvée, fallback vers dialogue`);
  return await this.executeDialogueAction(player, npc, npcId, capabilities, questProgress, playerLanguage);
}

  /**
   * ✅ NOUVELLE MÉTHODE : Gère les actions de marchand
   */
  private async executeMerchantAction(
    player: Player, 
    npc: any, 
    npcId: number, 
    capabilities: NpcCapability[], 
    questProgress: any[], 
    playerLanguage: string
  ): Promise<NpcInteractionResult> {
    const shopId = npc.shopId || npc.properties.shop;
    const shopGreeting = await this.getShopGreeting(player, npc, playerLanguage);
    
    return { 
      success: true,
      type: "shop", 
      shopId: shopId,
      questProgress: questProgress,
      npcId: npcId,
      npcName: npc.name || `NPC #${npcId}`,
      isUnifiedInterface: false,
      capabilities: capabilities, // ✅ Toutes les capacités (peut inclure quest)
      contextualData: this.buildContextualDataFromCapabilities(capabilities),
      lines: [shopGreeting],
      message: shopGreeting
    };
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Gère les actions de soigneur
   */
  private async executeHealerAction(
    player: Player, 
    npc: any, 
    npcId: number, 
    capabilities: NpcCapability[], 
    questProgress: any[], 
    playerLanguage: string
  ): Promise<NpcInteractionResult> {
    const healerGreeting = await this.getHealerGreeting(player, npc, playerLanguage);
    
    return { 
      success: true,
      type: "heal", 
      message: healerGreeting,
      questProgress: questProgress,
      npcId: npcId,
      npcName: npc.name || `NPC #${npcId}`,
      isUnifiedInterface: false,
      capabilities: capabilities, // ✅ Toutes les capacités (peut inclure quest)
      contextualData: this.buildContextualDataFromCapabilities(capabilities),
      lines: [healerGreeting]
    };
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Gère les actions de dresseur
   */
  private async executeTrainerAction(
    player: Player, 
    npc: any, 
    npcId: number, 
    capabilities: NpcCapability[], 
    questProgress: any[], 
    playerLanguage: string
  ): Promise<NpcInteractionResult> {
    // TODO: Implémenter la logique trainer
    return await this.executeDialogueAction(player, npc, npcId, capabilities, questProgress, playerLanguage);
  }

 private async executeDeliveryAction(
    player: Player, 
    npc: any, 
    npcId: number, 
    capabilities: NpcCapability[], 
    questProgress: any[], 
    playerLanguage: string
  ): Promise<NpcInteractionResult> {
    
    console.log(`📦 [executeDeliveryAction] === EXÉCUTION ACTION LIVRAISON ===`);
    console.log(`👤 Joueur: ${player.name}, NPC: ${npcId}`);
    
    try {
      // Détecter les livraisons disponibles
      const activeQuests = await this.questManager.getActiveQuests(player.name);
      const questDefinitions = new Map();
      
      for (const quest of activeQuests) {
        const definition = this.questManager.getQuestDefinition(quest.id);
        if (definition) {
          questDefinitions.set(quest.id, definition);
        }
      }
      
      const deliveryResult = await this.deliveryDetector.detectDeliveries(
        player.name,
        npcId.toString(),
        activeQuests,
        questDefinitions
      );
      
      console.log(`📋 [executeDeliveryAction] ${deliveryResult.totalDeliveries} livraison(s) détectée(s)`);
      
      if (deliveryResult.hasDeliveries && deliveryResult.totalDeliveries > 0) {
        
        // ✅ DEBUG : Vérifier les données de livraison
        console.log(`📦 [executeDeliveryAction] ✅ Données de livraison:`, {
          totalDeliveries: deliveryResult.totalDeliveries,
          readyDeliveries: deliveryResult.readyDeliveries,
          deliveries: deliveryResult.deliveries.length,
          firstDelivery: deliveryResult.deliveries[0]
        });
        
        // ✅ Construire le résultat avec deliveryData
        const result = {
          success: true,
          type: "questDelivery" as const,
          message: `${npc.name || `NPC #${npcId}`} attend une livraison de votre part.`,
          lines: [`J'attends que vous me livriez quelque chose, ${player.name}...`],
          
          // ✅ DONNÉES DE LIVRAISON pour le client
          deliveryData: {
            npcId: deliveryResult.npcId,
            npcName: npc.name || `NPC #${npcId}`,
            deliveries: deliveryResult.deliveries,
            allItemsAvailable: deliveryResult.allItemsAvailable,
            totalDeliveries: deliveryResult.totalDeliveries,
            readyDeliveries: deliveryResult.readyDeliveries
          },
          
          questProgress: questProgress,
          npcId: npcId,
          npcName: npc.name || `NPC #${npcId}`,
          isUnifiedInterface: false,
          capabilities: capabilities,
          contextualData: this.buildContextualDataFromCapabilities(capabilities)
        };
        
        // ✅ DEBUG : Vérifier le résultat complet
        console.log(`📦 [executeDeliveryAction] ✅ Résultat complet:`, {
          type: result.type,
          hasDeliveryData: !!result.deliveryData,
          deliveryDataKeys: result.deliveryData ? Object.keys(result.deliveryData) : [],
          totalFields: Object.keys(result).length
        });
        
        console.log(`📦 [executeDeliveryAction] ✅ deliveryData détail:`, JSON.stringify(result.deliveryData, null, 2));
        
        return result as NpcInteractionResult;
        
      } else {
        // Fallback vers dialogue si plus de livraisons
        console.log(`❌ [executeDeliveryAction] Aucune livraison trouvée, fallback dialogue`);
        return await this.executeDialogueAction(player, npc, npcId, capabilities, questProgress, playerLanguage);
      }
      
    } catch (error) {
      console.error(`❌ [executeDeliveryAction] Erreur:`, error);
      // Fallback vers dialogue en cas d'erreur
      return await this.executeDialogueAction(player, npc, npcId, capabilities, questProgress, playerLanguage);
    }
  }
  /**
   * ✅ NOUVELLE MÉTHODE : Gère les actions de dialogue
   */
  private async executeDialogueAction(
    player: Player, 
    npc: any, 
    npcId: number, 
    capabilities: NpcCapability[], 
    questProgress: any[], 
    playerLanguage: string
  ): Promise<NpcInteractionResult> {
    let lines: string[];
    
    if (npc.properties?.dialogue || npc.dialogueIds) {
      lines = await this.getDialogueLines(npc, player, playerLanguage);
    } else {
      lines = await this.getDefaultDialogueForNpc(npc, player, playerLanguage);
    }
    
    return { 
      success: true,
      type: "dialogue", 
      lines,
      questProgress: questProgress,
      npcId: npcId,
      npcName: npc.name || `NPC #${npcId}`,
      isUnifiedInterface: false,
      capabilities: capabilities, // ✅ Toutes les capacités (peut inclure quest)
      contextualData: this.buildContextualDataFromCapabilities(capabilities)
    };
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Construit contextualData depuis les capacités
   */
  private buildContextualDataFromCapabilities(capabilities: NpcCapability[]) {
    const hasShop = capabilities.includes('merchant');
    const hasQuests = capabilities.includes('quest');
    const hasHealing = capabilities.includes('healer');
    
    // Déterminer l'action par défaut
    let defaultAction = 'dialogue';
    if (hasQuests) defaultAction = 'quest';
    else if (hasShop) defaultAction = 'merchant';
    else if (hasHealing) defaultAction = 'healer';
    
    return {
      hasShop,
      hasQuests,
      hasHealing,
      defaultAction,
      quickActions: capabilities.map(cap => ({
        id: cap,
        label: this.getCapabilityLabel(cap),
        action: cap,
        enabled: true
      }))
    };
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Obtient le label d'une capacité
   */
  private getCapabilityLabel(capability: NpcCapability): string {
    const labels: Record<NpcCapability, string> = {
      'dialogue': 'Parler',
      'merchant': 'Boutique',
      'quest': 'Quêtes',
      'healer': 'Soins',
      'trainer': 'Combat',
      'transport': 'Transport',
      'service': 'Service',
      'minigame': 'Mini-jeu',
      'researcher': 'Recherche',
      'guild': 'Guilde',
      'event': 'Événement',
      'quest_master': 'Maître de quête',
      'deliver': 'Livraison'
    };
    
    return labels[capability] || capability;
  }

  // === MÉTHODES EXISTANTES INCHANGÉES ===

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
      const serverZone = getDbZoneName(player.currentZone); // ✅ SÉCURISÉ : Utilise currentZone du serveur
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
      const serverZone = getDbZoneName(player.currentZone); // ✅ SÉCURISÉ : Utilise currentZone du serveur
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

async handleQuestDelivery(
  player: any,
  npcId: number,
  questId: string,
  objectiveId: string,
  itemId: string,
  requiredAmount: number
): Promise<{
  success: boolean;
  message: string;
  result?: any;
  error?: string;
}> {
  try {
    console.log(`🚚 [NpcInteractionModule] Traitement livraison: ${player.name} -> NPC ${npcId}`);
    console.log(`📦 Item: ${itemId} x${requiredAmount} pour quête ${questId}`);

    if (!this.questManager) {
      return {
        success: false,
        message: "QuestManager non disponible"
      };
    }

    // ✅ NOUVEAU : Importer et configurer le deliveryHandler
    const { QuestDeliveryHandler } = await import('../../quest/services/QuestDeliveryHandler');
    
    const deliveryHandler = new QuestDeliveryHandler({
      enableLogging: true,
      enableAsyncSync: true,
      syncDelayMs: 800, // ✅ Délai pour attendre la synchronisation DB
      enableCacheInvalidation: true
    });

    // ✅ NOUVEAUX CALLBACKS de synchronisation
    const worldRoomCallback = async () => {
      try {
        console.log(`🔄 [NpcInteractionModule] Callback WorldRoom déclenché`);
        
        // Appeler le callback enregistré dans QuestManager
        if (this.questManager && typeof this.questManager.triggerWorldRoomCallback === 'function') {
          await this.questManager.triggerWorldRoomCallback(player.name);
        }
        
        console.log(`✅ [NpcInteractionModule] Callback WorldRoom terminé`);
      } catch (error) {
        console.error(`❌ [NpcInteractionModule] Erreur callback WorldRoom:`, error);
      }
    };

    const cacheInvalidationCallback = (playerId: string, npcIdStr: string) => {
      try {
        console.log(`🗑️ [NpcInteractionModule] Invalidation cache pour ${playerId}-${npcIdStr}`);
        
        // Invalider le cache du QuestDeliveryDetector
        if (this.deliveryDetector && typeof this.deliveryDetector.invalidatePlayerCache === 'function') {
          this.deliveryDetector.invalidatePlayerCache(playerId);
        }
        
        console.log(`✅ [NpcInteractionModule] Cache invalidé`);
      } catch (error) {
        console.error(`❌ [NpcInteractionModule] Erreur invalidation cache:`, error);
      }
    };

    // ✅ Appel de la méthode avec les callbacks
    const result = await deliveryHandler.handleQuestDelivery(
      player.name,
      npcId.toString(), // ✅ CORRECTION : Convertir npcId en string
      questId,
      objectiveId,
      itemId,
      requiredAmount,
      this.questManager,
      worldRoomCallback,        // ✅ Callback pour refresh NPCs
      cacheInvalidationCallback // ✅ Callback pour invalidation cache
    );

    // ✅ EXÉCUTER LA SYNCHRONISATION si elle existe
    if (result.syncCallback) {
      console.log(`🔄 [NpcInteractionModule] Exécution synchronisation post-livraison`);
      
      // ✅ Exécuter de manière asynchrone pour ne pas bloquer la réponse au client
      setImmediate(async () => {
        try {
          await result.syncCallback!();
          console.log(`✅ [NpcInteractionModule] Synchronisation post-livraison terminée`);
        } catch (syncError) {
          console.error(`❌ [NpcInteractionModule] Erreur sync:`, syncError);
        }
      });
    }

    if (result.success) {
      return {
        success: true,
        message: result.message,
        result: {
          success: result.success,
          message: result.message,
          questId: result.questId,
          objectiveId: result.objectiveId,
          itemId: result.itemId,
          itemsRemoved: result.itemsRemoved,
          amountRemoved: result.amountRemoved,
          questProgressed: result.questProgressed,
          processingTime: result.processingTime,
          questCompleted: result.questCompleted,
          progressMessage: result.progressMessage
        }
      };
    } else {
      return {
        success: false,
        message: result.message,
        error: result.error
      };
    }

  } catch (error) {
    console.error(`❌ [NpcInteractionModule] Erreur handleQuestDelivery:`, error);
    return {
      success: false,
      message: "Erreur lors du traitement de la livraison",
      error: error instanceof Error ? error.message : "Erreur inconnue"
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
