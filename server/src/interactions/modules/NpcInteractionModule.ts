// src/interactions/modules/NpcInteractionModule.ts
// Module de gestion des interactions avec les NPCs - VERSION AVEC IA INTÉGRÉE

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

// ✅ NOUVEAU : Imports IA
import { 
  NPCIntelligenceConnector, 
  getNPCIntelligenceConnector,
  handleSmartNPCInteraction,
  registerNPCsWithAI
} from "../../Intelligence/NPCSystem/NPCIntelligenceConnector";
import type { SmartNPCResponse } from "../../Intelligence/NPCSystem/NPCIntelligenceConnector";
import { ActionType } from "../../Intelligence/Core/ActionTypes";

// Imports existants
import { UnifiedInterfaceHandler } from "./npc/handlers/UnifiedInterfaceHandler";
import { 
  UnifiedInterfaceResult, 
  NpcCapability, 
  SpecificActionRequest,
  SpecificActionResult
} from "../types/UnifiedInterfaceTypes";
import { MerchantNpcHandler } from "./npc/handlers/MerchantNpcHandler";

// ✅ INTERFACE RESULT NPC ÉTENDUE POUR IA
export interface NpcInteractionResult extends InteractionResult {
  // Données NPCs existantes (gardées optionnelles pour rétro-compatibilité)
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
  
  // Champs interface unifiée requis
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
  
  // ✅ NOUVEAU : Données IA
  isIntelligentResponse?: boolean;
  intelligenceUsed?: boolean;
  aiAnalysisConfidence?: number;
  personalizedLevel?: number;
  relationshipLevel?: string;
  proactiveHelp?: boolean;
  followUpQuestions?: string[];
  tracking?: any; // Données de tracking de l'IA  
  // Données interface unifiée spécifiques (gardées optionnelles)
  unifiedInterface?: UnifiedInterfaceResult;
  unifiedMode?: boolean;
}

// ✅ NOUVELLE INTERFACE : Configuration IA
interface NPCIntelligenceConfig {
  enableIntelligence: boolean;
  enabledNPCTypes: string[];
  enabledZones: string[];
  fallbackToLegacy: boolean;
  analysisTimeout: number;
  minConfidenceThreshold: number;
  debugMode: boolean;
}

export class NpcInteractionModule extends BaseInteractionModule {
  
  readonly moduleName = "NpcInteractionModule";
  readonly supportedTypes: InteractionType[] = ["npc"];
  readonly version = "4.0.0"; // ✅ Version avec IA intégrée

  // === DÉPENDANCES EXISTANTES ===
  private getNpcManager: (zoneName: string) => any;
  private questManager: QuestManager;
  private shopManager: ShopManager;
  private starterHandlers: StarterHandlers;
  private spectatorManager: SpectatorManager;
  
  // Handlers modulaires existants
  private merchantHandler: MerchantNpcHandler;
  private unifiedInterfaceHandler: UnifiedInterfaceHandler;

  // ✅ NOUVELLE DÉPENDANCE : Connecteur IA
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

    // ✅ CONFIGURATION IA
    this.intelligenceConfig = {
      enableIntelligence: process.env.NPC_AI_ENABLED !== 'false',
      enabledNPCTypes: ['dialogue', 'healer', 'quest_master', 'researcher', 'merchant'],
      enabledZones: [], // Vide = toutes les zones
      fallbackToLegacy: true,
      analysisTimeout: 5000,
      minConfidenceThreshold: 0.3,
      debugMode: process.env.NODE_ENV === 'development',
      ...intelligenceConfig
    };

    // ✅ INITIALISATION IA
    this.intelligenceConnector = getNPCIntelligenceConnector();
    
    // Initialisation handlers existants
    this.initializeHandlers();

    this.log('info', '🤖 Module NPC v4.0 avec IA intégrée initialisé', {
      version: this.version,
      intelligenceEnabled: this.intelligenceConfig.enableIntelligence,
      enabledTypes: this.intelligenceConfig.enabledNPCTypes,
      handlersLoaded: ['merchant', 'unifiedInterface', 'intelligence'],
      questIntegration: 'Phase 3 - Triggers automatiques + IA'
    });

    // ✅ ENREGISTREMENT DIFFÉRÉ DES NPCs DANS L'IA
    if (this.intelligenceConfig.enableIntelligence) {
      this.scheduleNPCRegistrationWithAI();
    }
  }

  // ✅ NOUVELLE MÉTHODE : Enregistrement différé des NPCs dans l'IA
  private scheduleNPCRegistrationWithAI(): void {
    // Enregistrer les NPCs dans l'IA après un délai pour laisser le temps au système de s'initialiser
    setTimeout(async () => {
      await this.registerAllNPCsWithAI();
    }, 2000); // 2 secondes de délai
  }

  // ✅ NOUVELLE MÉTHODE : Enregistrement de masse des NPCs
  private async registerAllNPCsWithAI(): Promise<void> {
    try {
      this.log('info', '🎭 Enregistrement des NPCs dans le système d\'IA...');
      
      // Collecter tous les NPCs de toutes les zones
      const allNPCs: any[] = [];
      const zones = ['pallet_town', 'route_1', 'viridian_city']; // TODO: Récupérer dynamiquement
      
      for (const zoneName of zones) {
        try {
          const npcManager = this.getNpcManager(zoneName);
          if (npcManager) {
            const zoneNPCs = npcManager.getAllNpcs();
            allNPCs.push(...zoneNPCs);
          }
        } catch (error) {
          this.log('warn', `⚠️ Impossible de récupérer les NPCs de ${zoneName}:`, error);
        }
      }

      if (allNPCs.length === 0) {
        this.log('warn', '⚠️ Aucun NPC trouvé pour enregistrement IA');
        return;
      }

      // Enregistrer dans l'IA
      const result = await registerNPCsWithAI(allNPCs);
      
      // Marquer comme enregistrés
      for (const npc of allNPCs) {
        if (this.shouldNPCUseIntelligence(npc)) {
          this.npcsRegisteredWithAI.add(npc.id);
        }
      }

      this.log('info', '✅ NPCs enregistrés dans l\'IA', {
        total: allNPCs.length,
        registered: result.registered,
        skipped: result.skipped,
        errors: result.errors.length,
        intelligentNPCs: this.npcsRegisteredWithAI.size
      });

      if (result.errors.length > 0) {
        this.log('warn', '⚠️ Erreurs d\'enregistrement IA:', result.errors.slice(0, 5));
      }

    } catch (error) {
      this.log('error', '❌ Erreur enregistrement NPCs dans l\'IA:', error);
    }
  }

  // ✅ MÉTHODE MODIFIÉE : Initialisation des handlers (inchangée)
  private initializeHandlers(): void {
    try {
      // Handler Merchant (existant)
      this.merchantHandler = new MerchantNpcHandler(this.shopManager, {
        debugMode: process.env.NODE_ENV === 'development'
      });
      
      // Handler Interface Unifiée (existant)
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
      
      this.log('info', '✅ Handlers modulaires initialisés', {
        merchantHandler: !!this.merchantHandler,
        unifiedInterfaceHandler: !!this.unifiedInterfaceHandler,
        intelligenceConnector: !!this.intelligenceConnector
      });
      
    } catch (error) {
      this.log('error', '❌ Erreur initialisation handlers', error);
      throw new Error(`Impossible d'initialiser les handlers NPCs: ${error}`);
    }
  }

  // === MÉTHODES PRINCIPALES (MODIFIÉES POUR IA) ===

  canHandle(request: InteractionRequest): boolean {
    return request.type === 'npc' && request.data?.npcId !== undefined;
  }

  async handle(context: InteractionContext): Promise<InteractionResult> {
    const startTime = Date.now();
    
    try {
      const { player, request } = context;
      const npcId = request.data?.npcId;

      if (!npcId) {
        return this.createErrorResult("NPC ID manquant", "INVALID_REQUEST");
      }

      // ✅ TRACKING IA: Interaction avec NPC
if (this.intelligenceConfig.enableIntelligence) {
  try {
    // Importer le tracking (ajoute en haut du fichier si pas déjà fait)
    const { trackPlayerAction } = await import("../../Intelligence/IntelligenceOrchestrator");
    const { ActionType } = await import("../../Intelligence/Core/ActionTypes");
    
    await trackPlayerAction(
      player.name, // Utiliser le nom au lieu du sessionId
      ActionType.NPC_TALK,
      {
        npcId,
        playerLevel: player.level,
        playerGold: player.gold,
        zone: player.currentZone
      },
      {
        location: { 
          map: player.currentZone, 
          x: player.x, 
          y: player.y 
        }
      }
    );
      console.log(`📊 [AI] Action NPC trackée pour ${player.name} → NPC ${npcId}`);
      
      // ✅ DEBUG: Vérifier juste la queue
      const { getActionTracker } = await import("../../Intelligence/Core/PlayerActionTracker");
      const tracker = getActionTracker();
      
      const stats = tracker.getStats();
      console.log(`📋 [AI] État queue:`, {
        actionsInQueue: stats.actionsInQueue,
        playersTracked: stats.playersTracked,
        isEnabled: stats.isEnabled
      });
    
  } catch (error) {
    console.warn(`⚠️ [AI] Erreur tracking:`, error);
  }
}
      this.log('info', `🎮 Interaction NPC ${npcId}`, { 
        player: player.name,
        intelligenceEnabled: this.intelligenceConfig.enableIntelligence
      });

      // ✅ NOUVEAU : Logique avec IA intégrée
      const result = await this.handleNpcInteractionWithAI(player, npcId, request);

      // Mise à jour des stats
      const processingTime = Date.now() - startTime;
      this.updateStats(result.success, processingTime);

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      this.log('error', 'Erreur traitement NPC', error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue',
        "PROCESSING_FAILED"
      );
    }
  }

  // === ✅ NOUVELLE LOGIQUE MÉTIER AVEC IA INTÉGRÉE ===

  private async handleNpcInteractionWithAI(
    player: Player, 
    npcId: number, 
    request: InteractionRequest
  ): Promise<NpcInteractionResult> {
    
    this.log('info', `🤖 [AI+Legacy] Traitement NPC ${npcId} pour ${player.name}`);
    
    // Récupérer le NPC
    const npcManager = this.getNpcManager(player.currentZone);
    if (!npcManager) {
      return this.createSafeErrorResult(npcId, "NPCs non disponibles dans cette zone.");
    }

    const npc = npcManager.getNpcById(npcId);
    if (!npc) {
      return this.createSafeErrorResult(npcId, "NPC inconnu.");
    }

    // Sécurité : Valeurs par défaut
    const safeNpcId = npc.id ?? npcId;
    const safeNpcName = npc.name || `NPC #${npcId}`;

    this.log('info', `✅ NPC trouvé: ${safeNpcName} (ID: ${safeNpcId})`, { 
      type: npc.type || 'legacy',
      sourceType: npc.sourceType || 'tiled',
      intelligenceAvailable: this.shouldUseIntelligentInteraction(npc)
    });

    // ✅ DÉCISION PRINCIPALE : IA ou Legacy ?
    if (this.shouldUseIntelligentInteraction(npc)) {
      // === TENTATIVE IA ===
      try {
        this.log('info', `🎭 [AI] Tentative interaction intelligente NPC ${safeNpcId}`);
        
        const intelligentResult = await this.handleIntelligentNPCInteraction(
          player, npc, safeNpcId, safeNpcName, request
        );
        
        // Si l'IA a réussi, retourner le résultat enrichi
        if (intelligentResult.intelligenceUsed) {
          this.log('info', `✅ [AI] Interaction intelligente réussie pour NPC ${safeNpcId}`, {
            confidence: intelligentResult.aiAnalysisConfidence,
            personalized: intelligentResult.personalizedLevel,
            proactive: intelligentResult.proactiveHelp
          });
          
          return intelligentResult;
        }
        
        // Si l'IA n'a pas pu traiter, passer au fallback
        this.log('info', `🔄 [AI] IA non applicable, fallback legacy pour NPC ${safeNpcId}`);
      } catch (error) {
        this.log('error', `❌ [AI] Erreur IA pour NPC ${safeNpcId}, fallback legacy:`, error);
        
        if (!this.intelligenceConfig.fallbackToLegacy) {
          return this.createSafeErrorResult(safeNpcId, "Erreur système d'intelligence");
        }
      }
    }

    // === FALLBACK LEGACY ===
    this.log('info', `🔧 [Legacy] Utilisation logique traditionnelle pour NPC ${safeNpcId}`);
    
    const legacyResult = await this.handleLegacyNpcInteractionLogic(player, npc, safeNpcId);
    
    // Enrichir le résultat legacy avec les champs IA (pour compatibilité)
    const enrichedResult: NpcInteractionResult = {
      ...legacyResult,
      intelligenceUsed: false,
      isIntelligentResponse: false,
      aiAnalysisConfidence: 0,
      personalizedLevel: 0,
      relationshipLevel: 'unknown'
    };

    this.log('info', `✅ [Legacy] Interaction traditionnelle terminée pour NPC ${safeNpcId}`, {
      type: enrichedResult.type,
      hasRequiredFields: !!(enrichedResult.npcId && enrichedResult.npcName)
    });

    return enrichedResult;
  }

  // ✅ NOUVELLE MÉTHODE : Interaction intelligente via connecteur IA
  private async handleIntelligentNPCInteraction(
    player: Player,
    npc: any,
    npcId: number,
    npcName: string,
    request: InteractionRequest
  ): Promise<NpcInteractionResult> {
    
    this.log('info', `🎭 [Intelligent] Démarrage interaction IA pour NPC ${npcId}`);
    
    // Préparer le contexte pour l'IA
    const context = {
      playerAction: request.data?.action || 'dialogue',
      location: {
        map: player.currentZone,
        x: player.x,
        y: player.y
      },
      sessionData: {
        sessionId: (request as any).sessionId,
        interactionCount: (request as any).interactionCount || 1
      }
    };

    try {
      // ✅ APPEL AU CONNECTEUR IA
      const smartResponse: SmartNPCResponse = await handleSmartNPCInteraction(
        player.name,
        npcId.toString(),
        'dialogue',
        context
      );

      if (!smartResponse.success) {
        // Si l'IA échoue, retourner un indicateur pour le legacy (sans erreur)
        console.log(`⚠️ [AI] IA échouée pour NPC ${npcId}, passage automatique au legacy`);
        
        // Retourner un résultat spécial qui indique au parent d'utiliser legacy
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

      // ✅ ENREGISTRER L'ACTION POUR L'APPRENTISSAGE
      await this.recordActionForAILearning(player, npcId, 'npc_interaction', {
        npcName,
        interactionType: 'dialogue',
        analysisUsed: true,
        smartResponse: smartResponse.dialogue.message
      });

      // ✅ CONVERSION : SmartNPCResponse → NpcInteractionResult
      const result: NpcInteractionResult = {
        success: true,
        type: this.mapAIResponseTypeToNpcType(smartResponse) as any, // Cast temporaire
        message: smartResponse.dialogue.message,

        // Champs requis
        npcId: npcId,
        npcName: npcName,
        isUnifiedInterface: false, // SmartNPCResponse ne gère pas encore l'interface unifiée
        capabilities: this.extractCapabilitiesFromActions(smartResponse.actions),
        contextualData: this.buildContextualDataFromResponse(smartResponse),

        // ✅ Données IA enrichies
        intelligenceUsed: true,
        isIntelligentResponse: true,
        aiAnalysisConfidence: smartResponse.metadata.analysisConfidence,
        personalizedLevel: smartResponse.metadata.personalizedLevel,
        relationshipLevel: smartResponse.metadata.relationshipLevel,
        proactiveHelp: smartResponse.metadata.isProactiveHelp,
        followUpQuestions: smartResponse.followUpQuestions,

        // Données de dialogue
        lines: [smartResponse.dialogue.message],

        // Données spécialisées si présentes
        ...(this.hasShopActions(smartResponse.actions) && {
          shopId: this.extractShopIdFromActions(smartResponse.actions),
          shopData: this.extractShopDataFromActions(smartResponse.actions)
        }),

        ...(this.hasQuestActions(smartResponse.actions) && {
          availableQuests: this.extractQuestDataFromActions(smartResponse.actions),
          questProgress: [] // TODO: Récupérer depuis le contexte
        }),

        // Métadonnées tracking
        tracking: smartResponse.tracking
      };

      this.log('info', `🎉 [Intelligent] Réponse IA convertie pour NPC ${npcId}`, {
        type: result.type,
        confidence: result.aiAnalysisConfidence,
        personalized: result.personalizedLevel,
        hasActions: smartResponse.actions.length,
        hasFollowUp: smartResponse.followUpQuestions.length
      });

      return result;

    } catch (error) {
      this.log('error', `❌ [Intelligent] Erreur interaction IA NPC ${npcId}:`, error);
      
      // Retourner un résultat indiquant que l'IA n'a pas pu traiter
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

  // ✅ NOUVELLE MÉTHODE : Enregistrement pour apprentissage IA
  private async recordActionForAILearning(
    player: Player,
    npcId: number,
    actionType: string,
    data: any
  ): Promise<void> {
    try {
      // Utiliser le système de tracking de l'IA
      // Note: ActionType.PLAYER_MESSAGE est utilisé comme placeholder pour NPC_INTERACTION
      // TODO: Ajouter ActionType.NPC_INTERACTION dans ActionTypes.ts si nécessaire
      
      const actionData = {
        npcId,
        actionType: 'npc_interaction',
        ...data
      };

      // Pour l'instant, on log juste pour le debug
      // Dans une version future, on pourrait appeler trackPlayerAction
      this.log('info', `📊 [AI Learning] Action enregistrée`, {
        player: player.name,
        npcId,
        actionType,
        dataKeys: Object.keys(data)
      });

    } catch (error) {
      this.log('warn', `⚠️ [AI Learning] Erreur enregistrement action:`, error);
      // Ne pas faire échouer l'interaction pour une erreur de logging
    }
  }

  // ✅ MÉTHODES UTILITAIRES POUR CONVERSION IA (CORRIGÉES)
  private mapAIResponseTypeToNpcType(smartResponse: SmartNPCResponse): string {
    if (this.hasShopActions(smartResponse.actions)) return 'shop';
    if (this.hasQuestActions(smartResponse.actions)) return 'questGiver';
    if (this.hasHealActions(smartResponse.actions)) return 'heal';
    if (smartResponse.metadata.isProactiveHelp) return 'helpOffer';
    return 'dialogue';
  }

  private extractCapabilitiesFromActions(actions: SmartNPCResponse['actions']): NpcCapability[] {
    const capabilities: NpcCapability[] = [];
    
    for (const action of actions) {
      switch (action.type) {
        case 'trade':
          if (!capabilities.includes('merchant')) capabilities.push('merchant');
          break;
        case 'quest':
          if (!capabilities.includes('quest')) capabilities.push('quest');
          break;
        case 'heal':
          if (!capabilities.includes('healer')) capabilities.push('healer');
          break;
        case 'dialogue':
          if (!capabilities.includes('dialogue')) capabilities.push('dialogue');
          break;
      }
    }

    // Toujours avoir au moins dialogue
    if (capabilities.length === 0) {
      capabilities.push('dialogue');
    }

    return capabilities;
  }

  private buildContextualDataFromResponse(smartResponse: SmartNPCResponse): NpcInteractionResult['contextualData'] {
    const hasShop = this.hasShopActions(smartResponse.actions);
    const hasQuests = this.hasQuestActions(smartResponse.actions);
    const hasHealing = this.hasHealActions(smartResponse.actions);

    return {
      hasShop,
      hasQuests,
      hasHealing,
      defaultAction: hasShop ? 'merchant' : hasQuests ? 'quest' : hasHealing ? 'healer' : 'dialogue',
      quickActions: smartResponse.actions.map(action => ({
        id: action.id,
        label: action.label,
        action: action.type,
        enabled: true
      }))
    };
  }

  private hasShopActions(actions: SmartNPCResponse['actions']): boolean {
    return actions.some(action => action.type === 'trade');
  }

  private hasQuestActions(actions: SmartNPCResponse['actions']): boolean {
    return actions.some(action => action.type === 'quest');
  }

  private hasHealActions(actions: SmartNPCResponse['actions']): boolean {
    return actions.some(action => action.type === 'heal');
  }

  private extractShopIdFromActions(actions: SmartNPCResponse['actions']): string | undefined {
    const shopAction = actions.find(action => action.type === 'trade');
    return shopAction?.data?.shopId;
  }

  private extractShopDataFromActions(actions: SmartNPCResponse['actions']): any | undefined {
    const shopAction = actions.find(action => action.type === 'trade');
    return shopAction?.data;
  }

  private extractQuestDataFromActions(actions: SmartNPCResponse['actions']): any[] | undefined {
    const questActions = actions.filter(action => action.type === 'quest');
    return questActions.map(action => action.data);
  }

  // ✅ MÉTHODES DE DÉCISION IA
  private shouldUseIntelligentInteraction(npc: any): boolean {
    if (!this.intelligenceConfig.enableIntelligence) {
      return false;
    }

    // Vérifier si le NPC est enregistré dans l'IA
    if (!this.npcsRegisteredWithAI.has(npc.id)) {
      return false;
    }

    return this.shouldNPCUseIntelligence(npc);
  }

  private shouldNPCUseIntelligence(npc: any): boolean {
    // Vérifier le type de NPC
    if (this.intelligenceConfig.enabledNPCTypes.length > 0) {
      const npcType = npc.type || 'dialogue';
      if (!this.intelligenceConfig.enabledNPCTypes.includes(npcType)) {
        return false;
      }
    }

    // Vérifier la zone
    if (this.intelligenceConfig.enabledZones.length > 0) {
      const zone = npc.zone || 'unknown';
      if (!this.intelligenceConfig.enabledZones.includes(zone)) {
        return false;
      }
    }

    return true;
  }

  // === ✅ MÉTHODES PUBLIQUES POUR GESTION IA ===

  /**
   * Active/désactive l'IA pour ce module
   */
  setIntelligenceEnabled(enabled: boolean): void {
    this.intelligenceConfig.enableIntelligence = enabled;
    this.log('info', `🎭 Intelligence ${enabled ? 'activée' : 'désactivée'} pour NpcInteractionModule`);
  }

  /**
   * Configure les types de NPCs qui utilisent l'IA
   */
  setEnabledNPCTypes(types: string[]): void {
    this.intelligenceConfig.enabledNPCTypes = types;
    this.log('info', `🎭 Types NPCs IA configurés:`, types);
  }

  /**
   * Force l'enregistrement d'un NPC dans l'IA
   */
  async registerNPCWithAI(npc: any): Promise<boolean> {
    try {
      const result = await registerNPCsWithAI([npc]);
      
      if (result.registered > 0) {
        this.npcsRegisteredWithAI.add(npc.id);
        this.log('info', `✅ NPC ${npc.id} enregistré dans l'IA`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.log('error', `❌ Erreur enregistrement NPC ${npc.id} dans l'IA:`, error);
      return false;
    }
  }

  /**
   * Obtient le statut IA d'un NPC
   */
  getNPCIntelligenceStatus(npcId: number): {
    registeredWithAI: boolean;
    wouldUseIntelligence: boolean;
    lastAnalysisTime?: number;
  } {
    return {
      registeredWithAI: this.npcsRegisteredWithAI.has(npcId),
      wouldUseIntelligence: this.intelligenceConfig.enableIntelligence,
      lastAnalysisTime: undefined // TODO: Tracker depuis le connecteur
    };
  }

  /**
   * Statistiques IA du module
   */
  getIntelligenceStats(): any {
    return {
      config: this.intelligenceConfig,
      registeredNPCs: this.npcsRegisteredWithAI.size,
      connectorStats: this.intelligenceConnector.getStats(),
      supportedTypes: this.intelligenceConfig.enabledNPCTypes
    };
  }

  // === LOGIQUE LEGACY INCHANGÉE (code existant renommé) ===

  private async handleLegacyNpcInteractionLogic(player: Player, npc: any, npcId: number): Promise<NpcInteractionResult> {
    // === LOGIQUE DE PRIORITÉ EXISTANTE INCHANGÉE ===

    // 1. Vérifier si c'est une table starter
    if (npc.properties?.startertable === true || npc.properties?.startertable === 'true') {
      this.log('info', 'Table starter détectée');
      return await this.handleStarterTableInteraction(player, npc, npcId);
    }

    // 2. Vérifier d'abord les objectifs talk
    const talkValidationResult = await this.checkTalkObjectiveValidation(player.name, npcId);
    if (talkValidationResult) {
      this.log('info', `Objectif talk validé pour NPC ${npcId}`);
      return talkValidationResult;
    }

    // 3. Progression optimisée des quêtes avec triggers
    this.log('info', 'Déclenchement trigger talk pour quêtes');
    
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
            x: player.x,
            y: player.y,
            map: player.currentZone
          }
        }
      });
      
      questProgress = progressResult.results || [];
      this.log('info', `✅ Trigger talk traité: ${questProgress.length} progression(s)`, questProgress);
    } catch (error) {
      this.log('error', '❌ Erreur trigger talk:', error);
    }

    // 4. Vérifier les quêtes prêtes à compléter
    const readyToCompleteQuests = await this.getReadyToCompleteQuestsForNpc(player.name, npcId);
    
    if (readyToCompleteQuests.length > 0) {
      this.log('info', `${readyToCompleteQuests.length} quêtes prêtes à compléter`);
      
      const firstQuest = readyToCompleteQuests[0];
      const questDefinition = this.questManager.getQuestDefinition(firstQuest.id);
      const completionDialogue = this.getQuestDialogue(questDefinition, 'questComplete');
      
      // Compléter automatiquement toutes les quêtes prêtes
      const completionResults = [];
      for (const quest of readyToCompleteQuests) {
        this.log('info', `🏆 Tentative completion quête: ${quest.id}`);
        
        const result = await this.questManager.completePlayerQuest(player.name, quest.id);
        if (result.success) {
          completionResults.push({
            questId: quest.id,
            questName: questDefinition?.name || quest.id,
            questRewards: result.rewards || [],
            message: result.message
          });
          this.log('info', `✅ Quête complétée: ${quest.id}`);
        } else {
          this.log('warn', `⚠️ Échec completion: ${result.message}`);
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
            quickActions: []
          },
          lines: completionDialogue,
          message: `Félicitations ! Vous avez terminé : ${questNames}`
        };
      }
    }

    // 5. Vérifier les quêtes disponibles
    const availableQuests = await this.getAvailableQuestsForNpc(player.name, npcId);
    
    if (availableQuests.length > 0) {
      this.log('info', `${availableQuests.length} quêtes disponibles`);
      
      const firstQuest = availableQuests[0];
      const questOfferDialogue = this.getQuestDialogue(firstQuest, 'questOffer');
      
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
        capabilities: ['quest'],
        contextualData: {
          hasShop: false,
          hasQuests: true,
          hasHealing: false,
          defaultAction: 'quest',
          quickActions: []
        }
      };
    }

    // 6. Vérifier les quêtes en cours
    const activeQuests = await this.questManager.getActiveQuests(player.name);
    const questsForThisNpc = activeQuests.filter(q => 
      q.startNpcId === npcId || q.endNpcId === npcId
    );

    if (questsForThisNpc.length > 0) {
      this.log('info', `${questsForThisNpc.length} quêtes en cours pour ce NPC`);
      
      const firstQuest = questsForThisNpc[0];
      const questDefinition = this.questManager.getQuestDefinition(firstQuest.id);
      const progressDialogue = this.getQuestDialogue(questDefinition, 'questInProgress');
      
      return {
        success: true,
        type: "dialogue",
        lines: progressDialogue,
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name || `NPC #${npcId}`,
        isUnifiedInterface: false,
        capabilities: ['quest', 'dialogue'],
        contextualData: {
          hasShop: false,
          hasQuests: true,
          hasHealing: false,
          defaultAction: 'quest',
          quickActions: []
        }
      };
    }

    // 7. Comportement NPC normal (avec support JSON)
    this.log('info', 'Aucune quête, dialogue normal');

    if (npc.properties?.shop || npc.shopId) {
      const shopId = npc.shopId || npc.properties.shop;
      return { 
        success: true,
        type: "shop", 
        shopId: shopId,
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name || `NPC #${npcId}`,
        isUnifiedInterface: false,
        capabilities: ['merchant'],
        contextualData: {
          hasShop: true,
          hasQuests: false,
          hasHealing: false,
          defaultAction: 'merchant',
          quickActions: []
        }
      };
    } else if (npc.properties?.healer || npc.type === 'healer') {
      return { 
        success: true,
        type: "heal", 
        message: "Vos Pokémon sont soignés !",
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name || `NPC #${npcId}`,
        isUnifiedInterface: false,
        capabilities: ['healer'],
        contextualData: {
          hasShop: false,
          hasQuests: false,
          hasHealing: true,
          defaultAction: 'healer',
          quickActions: []
        }
      };
    } else if (npc.properties?.dialogue || npc.dialogueIds) {
      const lines = this.getDialogueLines(npc);
      return { 
        success: true,
        type: "dialogue", 
        lines,
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name || `NPC #${npcId}`,
        isUnifiedInterface: false,
        capabilities: ['dialogue'],
        contextualData: {
          hasShop: false,
          hasQuests: false,
          hasHealing: false,
          defaultAction: 'dialogue',
          quickActions: []
        }
      };
    } else {
      const defaultDialogue = await this.getDefaultDialogueForNpc(npc);
      return { 
        success: true,
        type: "dialogue", 
        lines: defaultDialogue,
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name || `NPC #${npcId}`,
        isUnifiedInterface: false,
        capabilities: ['dialogue'],
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

  // === MÉTHODES UTILITAIRES INCHANGÉES ===

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

  // Toutes les autres méthodes existantes restent INCHANGÉES
  // (handleStarterTableInteraction, getDialogueLines, checkTalkObjectiveValidation, etc.)
  // Je garde le code existant pour éviter de surcharger la réponse...

  private async handleStarterTableInteraction(player: Player, npc: any, npcId: number): Promise<NpcInteractionResult> {
    this.log('info', 'Traitement interaction table starter');
  
    const validation = await this.starterHandlers.validateStarterRequest(player, 1);
    
    if (validation.valid) {
      return {
        success: true,
        type: "starterTable",
        message: "Choisissez votre Pokémon starter !",
        starterEligible: true,
        lines: [
          "Voici les trois Pokémon starter !",
          "Choisissez celui qui vous accompagnera dans votre aventure !"
        ],
        npcId: npcId,
        npcName: npc.name || "Table des starters",
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
    } else {
      return {
        success: true,
        type: "dialogue",
        message: validation.message,
        starterEligible: false,
        starterReason: validation.reason,
        lines: [validation.message],
        npcId: npcId,
        npcName: npc.name || "Table des starters",
        isUnifiedInterface: false,
        capabilities: ['dialogue'],
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

  private getDialogueLines(npc: any): string[] {
    if (npc.dialogueIds && Array.isArray(npc.dialogueIds)) {
      return npc.dialogueIds;
    }
    
    if (npc.properties?.dialogue) {
      const dialogue = npc.properties.dialogue;
      return Array.isArray(dialogue) ? dialogue : [dialogue];
    }
    
    return ["Bonjour !"];
  }

  private async checkTalkObjectiveValidation(username: string, npcId: number): Promise<NpcInteractionResult | null> {
    try {
      const activeQuests = await this.questManager.getActiveQuests(username);
      this.log('info', `Vérification talk objectives`, { activeQuests: activeQuests.length });
      
      for (const quest of activeQuests) {
        const currentStep = quest.steps[quest.currentStepIndex];
        if (!currentStep) continue;
        
        for (const objective of currentStep.objectives) {
          if (objective.type === 'talk' && 
              objective.target === npcId.toString() && 
              !objective.completed) {
            
            this.log('info', 'Objectif talk trouvé', { objectiveId: objective.id });
            
            const progressResults = await this.questManager.updateQuestProgress(username, {
              type: 'talk',
              npcId: npcId,
              targetId: npcId.toString()
            });
            
            if (progressResults.length > 0) {
              const result = progressResults[0];
              
              if (result.objectiveCompleted || result.stepCompleted) {
                const validationDialogue = (objective as any).validationDialogue || [
                  "Parfait ! Merci de m'avoir parlé !",
                  "C'était exactement ce qu'il fallait faire."
                ];
                
                return {
                  success: true,
                  type: "dialogue",
                  lines: validationDialogue,
                  questProgress: progressResults,
                  message: result.message,
                  npcId: npcId,
                  npcName: await this.getNpcName(npcId),
                  isUnifiedInterface: false,
                  capabilities: ['quest', 'dialogue'],
                  contextualData: {
                    hasShop: false,
                    hasQuests: true,
                    hasHealing: false,
                    defaultAction: 'quest',
                    quickActions: []
                  }
                };
              }
            }
          }
        }
      }
      
      return null;
      
    } catch (error) {
      this.log('error', 'Erreur checkTalkObjectiveValidation', error);
      return null;
    }
  }

  private getQuestDialogue(questDefinition: any, dialogueType: 'questOffer' | 'questInProgress' | 'questComplete'): string[] {
    if (!questDefinition?.dialogues?.[dialogueType]) {
      switch (dialogueType) {
        case 'questOffer':
          return ["J'ai quelque chose pour vous...", "Acceptez-vous cette mission ?"];
        case 'questInProgress':
          return ["Comment avance votre mission ?", "Revenez me voir quand c'est terminé !"];
        case 'questComplete':
          return ["Excellent travail !", "Voici votre récompense bien méritée !"];
        default:
          return ["Bonjour !"];
      }
    }
    
    return questDefinition.dialogues[dialogueType];
  }

  private async getAvailableQuestsForNpc(username: string, npcId: number): Promise<any[]> {
    try {
      const questsForNpc = this.questManager.getQuestsForNpc(npcId);
      const availableQuests = await this.questManager.getAvailableQuests(username);
      
      const result = availableQuests.filter(quest => 
        questsForNpc.some(npcQuest => 
          npcQuest.id === quest.id && npcQuest.startNpcId === npcId
        )
      );
      
      this.log('info', 'Quêtes disponibles filtrées', { 
        npcQuests: questsForNpc.length,
        available: availableQuests.length,
        filtered: result.length 
      });
      
      return result;
    } catch (error) {
      this.log('error', 'Erreur getAvailableQuestsForNpc', error);
      return [];
    }
  }

  private async getReadyToCompleteQuestsForNpc(username: string, npcId: number): Promise<any[]> {
    try {
      const activeQuests = await this.questManager.getActiveQuests(username);
      
      const readyQuests = activeQuests.filter(quest => {
        if (quest.endNpcId !== npcId) return false;
        return quest.status === 'readyToComplete';
      });

      this.log('info', 'Quêtes prêtes à compléter', { count: readyQuests.length });
      return readyQuests;
    } catch (error) {
      this.log('error', 'Erreur getReadyToCompleteQuestsForNpc', error);
      return [];
    }
  }

  private async getDefaultDialogueForNpc(npc: any): Promise<string[]> {
    if (npc.properties?.dialogueId) {
      const dialogues = await this.getDialogueById(npc.properties.dialogueId);
      if (dialogues.length > 0) {
        return dialogues;
      }
    }
    
    if (npc.shopId || npc.properties?.shop || npc.properties?.shopId || npc.type === 'merchant') {
      return [
        `Bienvenue dans ma boutique !`,
        `Regardez mes marchandises !`
      ];
    }
    
    if (npc.type === 'healer' || npc.properties?.healer) {
      return [
        `Voulez-vous que je soigne vos Pokémon ?`,
        `Ils seront en pleine forme !`
      ];
    }
    
    return [
      `Bonjour ! Je suis ${npc.name}.`,
      `Belle journée pour une aventure !`
    ];
  }

  private async getDialogueById(dialogueId: string): Promise<string[]> {
    const dialogueMap: { [key: string]: string[] } = {
      'greeting_bob': [
        "Salut ! Je suis Bob, le pêcheur local.",
        "J'espère que tu aimes la pêche comme moi !"
      ],
      'greeting_oak': [
        "Bonjour jeune dresseur !",
        "Prêt pour de nouvelles aventures ?"
      ],
      'shop_keeper': [
        "Bienvenue dans ma boutique !",
        "J'ai tout ce qu'il faut pour votre aventure !"
      ]
    };
    
    return dialogueMap[dialogueId] || [];
  }

  private async getNpcName(npcId: number): Promise<string> {
    const npcNames: { [key: number]: string } = {
      1: "Professeur Oak",
      87: "Bob le pêcheur", 
      5: "Le collecteur de baies",
      10: "Le maître dresseur",
      100: "Marchand du Village",
      101: "Employé Poké Mart",
      102: "Herboriste",
      103: "Vendeur de CTs"
    };
    
    return npcNames[npcId] || `NPC #${npcId}`;
  }

  // === MÉTHODES PUBLIQUES EXISTANTES INCHANGÉES ===

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
    dialogues?: string[];
  }> {
    this.log('info', 'Transaction shop', { 
      player: player.name, 
      shopId, 
      action, 
      itemId, 
      quantity 
    });

    try {
      const npcManager = this.getNpcManager(player.currentZone);
      if (npcManager) {
        const allNpcs = npcManager.getAllNpcs();
        const merchantNpc = allNpcs.find((npc: any) => 
          this.merchantHandler.isMerchantNpc(npc) && 
          (npc.shopId === shopId || npc.properties?.shopId === shopId || npc.properties?.shop === shopId)
        );
        
        if (merchantNpc) {
          this.log('info', `🛒 Transaction déléguée au MerchantHandler (NPC ${merchantNpc.id})`);
          return await this.merchantHandler.handleShopTransaction(player, merchantNpc, action, itemId, quantity);
        }
      }
    } catch (error) {
      this.log('warn', 'Erreur délégation MerchantHandler, fallback vers logique legacy', error);
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
      
      if (result.success) {
        this.log('info', 'Achat réussi', { itemId, quantity, newGold: result.newGold });
      }
      
      return {
        ...result,
        dialogues: undefined
      };
      
    } else if (action === 'sell') {
      const result = await this.shopManager.sellItem(
        player.name,
        shopId, 
        itemId, 
        quantity
      );
      
      if (result.success) {
        this.log('info', 'Vente réussie', { itemId, quantity, goldGained: result.newGold });
      }
      
      return {
        ...result,
        dialogues: undefined
      };
    }

    return {
      success: false,
      message: "Action non reconnue",
      dialogues: undefined
    };
  }

  async handleQuestStart(username: string, questId: string): Promise<{ success: boolean; message: string; quest?: any }> {
    try {
      this.log('info', '🎯 Démarrage quête via NPC', { username, questId });
      
      const giveResult = await this.questManager.giveQuest(username, questId);
      
      if (giveResult.success) {
        this.log('info', `✅ Quête donnée avec succès: ${giveResult.quest?.name || questId}`);
        return {
          success: true,
          message: giveResult.message,
          quest: giveResult.quest
        };
      } else {
        this.log('warn', `⚠️ Impossible de donner la quête: ${giveResult.message}`);
        return {
          success: false,
          message: giveResult.message
        };
      }
      
    } catch (error) {
      this.log('error', '❌ Erreur démarrage quête via NPC:', error);
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
    
    this.log('info', 'Interaction joueur combat', { 
      spectator: spectatorPlayer.name, 
      target: targetPlayerId 
    });
    
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
        x: spectatorPlayer.x,
        y: spectatorPlayer.y,
        mapId: spectatorPlayer.currentZone
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
    
    this.log('info', `Action spécifique NPC ${request.npcId}`, {
      player: player.name,
      actionType: request.actionType
    });

    try {
      const npcManager = this.getNpcManager(player.currentZone);
      if (!npcManager) {
        return {
          success: false,
          type: "error",
          message: "NPCs non disponibles dans cette zone",
          actionType: request.actionType,
          npcId: request.npcId
        };
      }

      const npc = npcManager.getNpcById(request.npcId);
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
      this.log('error', 'Erreur action spécifique', error);
      return {
        success: false,
        type: "error",
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        actionType: request.actionType,
        npcId: request.npcId
      };
    }
  }

  private async handleMerchantSpecificAction(
    player: Player, 
    npc: any, 
    request: SpecificActionRequest
  ): Promise<SpecificActionResult> {
    
    if (!request.actionData?.shopAction) {
      return {
        success: false,
        type: "error",
        message: "Action shop manquante",
        actionType: 'merchant',
        npcId: npc.id
      };
    }

    const { shopAction, itemId, quantity } = request.actionData;

    if (shopAction === 'buy' || shopAction === 'sell') {
      if (!itemId || !quantity) {
        return {
          success: false,
          type: "error",
          message: "ItemId et quantité requis",
          actionType: 'merchant',
          npcId: npc.id
        };
      }

      const result = await this.merchantHandler.handleShopTransaction(
        player, npc, shopAction, itemId, quantity
      );

      return {
        success: result.success,
        type: "merchant",
        message: result.message,
        actionType: 'merchant',
        npcId: npc.id,
        transactionResult: result
      };
    }

    return {
      success: false,
      type: "error",
      message: `Action shop ${shopAction} non reconnue`,
      actionType: 'merchant',
      npcId: npc.id
    };
  }

  private async handleQuestSpecificAction(
    player: Player, 
    npc: any, 
    request: SpecificActionRequest
  ): Promise<SpecificActionResult> {
    
    const { questAction, questId } = request.actionData || {};

    if (!questAction || !questId) {
      return {
        success: false,
        type: "error",
        message: "Action et ID de quête requis",
        actionType: 'quest',
        npcId: npc.id
      };
    }

    if (questAction === 'start') {
      const result = await this.handleQuestStart(player.name, questId);
      return {
        success: result.success,
        type: "quest",
        message: result.message,
        actionType: 'quest',
        npcId: npc.id,
        questResult: result
      };
    }

    if (questAction === 'complete') {
      try {
        const result = await this.questManager.completeQuestManually(player.name, questId);
        return {
          success: !!result,
          type: "quest",
          message: result ? `Quête "${result.questName}" terminée !` : "Impossible de terminer la quête",
          actionType: 'quest',
          npcId: npc.id,
          questResult: result ? {
            success: true,
            message: `Quête "${result.questName}" terminée !`,
            questCompleted: result,
            rewards: result.questRewards || []
          } : undefined
        };
      } catch (error) {
        return {
          success: false,
          type: "error",
          message: error instanceof Error ? error.message : 'Erreur completion quête',
          actionType: 'quest',
          npcId: npc.id
        };
      }
    }

    return {
      success: false,
      type: "error",
      message: `Action quête ${questAction} non reconnue`,
      actionType: 'quest',
      npcId: npc.id
    };
  }

  private async handleDialogueSpecificAction(
    player: Player, 
    npc: any, 
    request: SpecificActionRequest
  ): Promise<SpecificActionResult> {
    
    const lines = this.getDialogueLines(npc);
    
    return {
      success: true,
      type: "dialogue",
      message: lines.join(' '),
      actionType: 'dialogue',
      npcId: npc.id
    };
  }

  // === ADMINISTRATION ET STATS ===

  getHandlerStats(): any {
    return {
      module: this.getStats(),
      handlers: {
        merchant: this.merchantHandler?.getStats(),
        unifiedInterface: this.unifiedInterfaceHandler?.getStats(),
        intelligence: this.getIntelligenceStats()
      }
    };
  }

  debugHandler(handlerType: 'merchant' | 'unifiedInterface' | 'intelligence', npcId?: number): void {
    switch (handlerType) {
      case 'merchant':
        if (npcId) {
          console.log(`🔍 Debug MerchantHandler pour NPC ${npcId}`);
          console.log('Stats:', this.merchantHandler.getStats());
        } else {
          console.log('🔍 MerchantHandler Stats:', this.merchantHandler.getStats());
        }
        break;
      case 'unifiedInterface':
        console.log('🔍 UnifiedInterfaceHandler Stats:', this.unifiedInterfaceHandler.getStats());
        break;
      case 'intelligence':
        console.log('🔍 Intelligence Stats:', this.getIntelligenceStats());
        if (npcId) {
          console.log(`🎭 Status NPC ${npcId}:`, this.getNPCIntelligenceStatus(npcId));
        }
        break;
      default:
        console.log('Handler non supporté:', handlerType);
    }
  }
}
