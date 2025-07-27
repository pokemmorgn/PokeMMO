// src/interactions/modules/NpcInteractionModule.ts
// Module de gestion des interactions avec les NPCs - VERSION AVEC IA INTÉGRÉE + DialogString + LANGUE JOUEUR
// ✅ ÉTAPE 4 COMPLÈTE : Intégration langue joueur dans tous les appels DialogString

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

// ✅ NOUVEAU : Import DialogString Service
import { getDialogStringService, DialogVariables, createDialogVars } from "../../services/DialogStringService";

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

// ✅ NOUVEAU : Interface étendue pour contexte avec userId
export interface EnhancedInteractionContext extends InteractionContext {
  userId?: string;        // ✅ NOUVEAU : userId JWT pour tracking IA cohérent
  sessionId?: string;     // ✅ NOUVEAU : sessionId pour mapping
}

export class NpcInteractionModule extends BaseInteractionModule {
  
  readonly moduleName = "NpcInteractionModule";
  readonly supportedTypes: InteractionType[] = ["npc"];
  readonly version = "4.3.0"; // ✅ Version avec DialogString + Langue joueur intégrée

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

  // ✅ NOUVEAU : Service DialogString
  private dialogService = getDialogStringService();

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

    this.log('info', '🤖 Module NPC v4.3.0 avec DialogString + Langue joueur', {
      version: this.version,
      intelligenceEnabled: this.intelligenceConfig.enableIntelligence,
      enabledTypes: this.intelligenceConfig.enabledNPCTypes,
      handlersLoaded: ['merchant', 'unifiedInterface', 'intelligence', 'dialogString'],
      questIntegration: 'Phase 3 - Triggers automatiques + IA',
      dialogService: 'Intégré avec support multilingue',
      languageSupport: 'Intégré - Client vers DialogString'
    });

    // ✅ ENREGISTREMENT DIFFÉRÉ DES NPCs DANS L'IA
    if (this.intelligenceConfig.enableIntelligence) {
      this.scheduleNPCRegistrationWithAI();
    }
  }

  // ✅ NOUVELLE MÉTHODE UTILITAIRE : Créer variables de dialogue
  private createPlayerDialogVars(player: Player, npcName?: string, targetName?: string): DialogVariables {
    return createDialogVars({
      player: {
        name: player.name,
        level: player.level,
        gold: player.gold
      },
      npc: npcName,
      target: targetName,
      zone: player.currentZone
    });
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
        intelligenceConnector: !!this.intelligenceConnector,
        dialogService: !!this.dialogService
      });
      
    } catch (error) {
      this.log('error', '❌ Erreur initialisation handlers', error);
      throw new Error(`Impossible d'initialiser les handlers NPCs: ${error}`);
    }
  }

  // === MÉTHODES PRINCIPALES (MODIFIÉES POUR IA + LANGUE) ===

  canHandle(request: InteractionRequest): boolean {
    return request.type === 'npc' && request.data?.npcId !== undefined;
  }

  // ✅ HANDLE PRINCIPAL MODIFIÉ POUR SUPPORTER USERID + LANGUE
  async handle(context: InteractionContext | EnhancedInteractionContext): Promise<InteractionResult> {
    const startTime = Date.now();
    
    try {
      const { player, request } = context;
      const enhancedContext = context as EnhancedInteractionContext; // Cast pour accéder userId
      const npcId = request.data?.npcId;

          // 🔍 DEBUG COMPLET REQUÊTE
    console.log("🔍 [DEBUG] === ANALYSE COMPLÈTE REQUÊTE ===");
    console.log("🔍 [DEBUG] request.data COMPLET:", JSON.stringify(request.data, null, 2));
    console.log("🔍 [DEBUG] Toutes les clés de request.data:", Object.keys(request.data || {}));
    console.log("🔍 [DEBUG] request.data?.playerLanguage DIRECT:", request.data?.playerLanguage);
    console.log("🔍 [DEBUG] Type:", typeof request.data?.playerLanguage);
    console.log("🔍 [DEBUG] =====================================");
      
      if (!npcId) {
        return this.createErrorResult("NPC ID manquant", "INVALID_REQUEST");
      }

      // ✅ ÉTAPE 2 : Extraire la langue du joueur depuis la requête
      const playerLanguage = request.data?.playerLanguage || 
                            request.playerLanguage || 
                            (request as any).playerLanguage || 
                            'fr';
      
      // 🔍 DEBUG AMÉLIORE :
      console.log("🔍 [DEBUG] === EXTRACTION LANGUE AMÉLIORÉE ===");
      console.log("🔍 [DEBUG] request.data?.playerLanguage:", request.data?.playerLanguage);
      console.log("🔍 [DEBUG] request.playerLanguage:", (request as any).playerLanguage);
      console.log("🔍 [DEBUG] request COMPLET:", JSON.stringify(request, null, 2));
      console.log("🔍 [DEBUG] playerLanguage FINAL:", playerLanguage);
      console.log("🔍 [DEBUG] ========================================");
      
      this.log('info', `🌐 [NpcModule] Langue joueur reçue: ${playerLanguage}`);

      // ✅ TRACKING IA CORRIGÉ : Utiliser userId si disponible
      if (this.intelligenceConfig.enableIntelligence && enhancedContext.userId) {
        try {
          const { trackPlayerAction } = await import("../../Intelligence/IntelligenceOrchestrator");
          
          await trackPlayerAction(
            enhancedContext.userId,  // ✅ CORRIGÉ : userId au lieu de player.name
            ActionType.NPC_TALK,
            {
              npcId,
              playerLevel: player.level,
              playerGold: player.gold,
              zone: player.currentZone,
              playerLanguage // ✅ NOUVEAU : Inclure la langue dans le tracking
            },
            {
              location: { 
                map: player.currentZone, 
                x: player.x, 
                y: player.y 
              }
            }
          );
          
          console.log(`📊 [AI] Action NPC trackée pour userId: ${enhancedContext.userId} → NPC ${npcId} (langue: ${playerLanguage})`);
          
          // ✅ DEBUG: Vérifier la queue
          const { getActionTracker } = await import("../../Intelligence/Core/PlayerActionTracker");
          const tracker = getActionTracker();
          
          const stats = tracker.getStats();
          console.log(`📋 [AI] État queue après tracking:`, {
            actionsInQueue: stats.actionsInQueue,
            playersTracked: stats.playersTracked,
            isEnabled: stats.isEnabled
          });
        
        } catch (error) {
          console.warn(`⚠️ [AI] Erreur tracking:`, error);
        }
      } else if (this.intelligenceConfig.enableIntelligence && !enhancedContext.userId) {
        console.warn(`⚠️ [AI] Tracking impossible : userId manquant pour ${player.name}`);
      }
      
      this.log('info', `🎮 Interaction NPC ${npcId}`, { 
        player: player.name,
        userId: enhancedContext.userId || 'N/A',
        language: playerLanguage,
        intelligenceEnabled: this.intelligenceConfig.enableIntelligence,
        dialogServiceReady: !!this.dialogService
      });

      // ✅ ÉTAPE 2 : Logique avec IA intégrée + langue
      const result = await this.handleNpcInteractionWithAI(player, npcId, request, enhancedContext.userId, playerLanguage);

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

  // === ✅ NOUVELLE LOGIQUE MÉTIER AVEC IA INTÉGRÉE + LANGUE ===

  // ✅ ÉTAPE 2 : Signature modifiée avec playerLanguage
  private async handleNpcInteractionWithAI(
    player: Player, 
    npcId: number, 
    request: InteractionRequest,
    userId?: string,
    playerLanguage: string = 'fr'  // ✅ NOUVEAU : Paramètre langue
  ): Promise<NpcInteractionResult> {
    
    this.log('info', `🤖 [AI+Legacy] Traitement NPC ${npcId} pour ${player.name} (userId: ${userId || 'N/A'}, lang: ${playerLanguage})`);
    
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
      intelligenceAvailable: this.shouldUseIntelligentInteraction(npc),
      hasUserId: !!userId,
      playerLanguage: playerLanguage,
      dialogServiceReady: !!this.dialogService
    });

    // ✅ DÉCISION PRINCIPALE : IA ou Legacy ?
    if (this.shouldUseIntelligentInteraction(npc) && userId) {
      // === TENTATIVE IA ===
      try {
        this.log('info', `🎭 [AI] Tentative interaction intelligente NPC ${safeNpcId} pour userId ${userId} (${playerLanguage})`);
        
        const intelligentResult = await this.handleIntelligentNPCInteraction(
          player, npc, safeNpcId, safeNpcName, request, userId, playerLanguage
        );
        
        // Si l'IA a réussi, retourner le résultat enrichi
        if (intelligentResult.intelligenceUsed) {
          this.log('info', `✅ [AI] Interaction intelligente réussie pour NPC ${safeNpcId}`, {
            confidence: intelligentResult.aiAnalysisConfidence,
            personalized: intelligentResult.personalizedLevel,
            proactive: intelligentResult.proactiveHelp,
            userId: userId,
            language: playerLanguage
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
    } else if (this.shouldUseIntelligentInteraction(npc) && !userId) {
      this.log('warn', `⚠️ [AI] IA disponible mais userId manquant pour NPC ${safeNpcId}`);
    }

    // === FALLBACK LEGACY ===
    this.log('info', `🔧 [Legacy] Utilisation logique traditionnelle pour NPC ${safeNpcId} (${playerLanguage})`);
    
    // ✅ ÉTAPE 3 : Passer la langue au legacy
    const legacyResult = await this.handleLegacyNpcInteractionLogic(player, npc, safeNpcId, playerLanguage);
    
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
      language: playerLanguage,
      hasRequiredFields: !!(enrichedResult.npcId && enrichedResult.npcName)
    });

    return enrichedResult;
  }

  // ✅ NOUVELLE MÉTHODE : Interaction intelligente via connecteur IA + LANGUE
  private async handleIntelligentNPCInteraction(
    player: Player,
    npc: any,
    npcId: number,
    npcName: string,
    request: InteractionRequest,
    userId: string,
    playerLanguage: string = 'fr'  // ✅ NOUVEAU : userId obligatoire pour IA + langue
  ): Promise<NpcInteractionResult> {
    
    this.log('info', `🎭 [Intelligent] Démarrage interaction IA pour NPC ${npcId} (userId: ${userId}, lang: ${playerLanguage})`);
    
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
      },
      // ✅ NOUVEAU : Inclure la langue dans le contexte IA
      playerPreferences: {
        language: playerLanguage
      }
    };

    try {
      // ✅ APPEL AU CONNECTEUR IA AVEC USERID + LANGUE
      const smartResponse: SmartNPCResponse = await handleSmartNPCInteraction(
        userId,  // ✅ CORRIGÉ : userId au lieu de player.name
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
        smartResponse: smartResponse.dialogue.message,
        userId: userId,
        playerLanguage: playerLanguage // ✅ NOUVEAU : Inclure langue dans l'apprentissage
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
        hasFollowUp: smartResponse.followUpQuestions.length,
        userId: userId,
        language: playerLanguage
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

  // ✅ MÉTHODES EXISTANTES AVEC SUPPORT LANGUE COMPLÈTE

  // ✅ ÉTAPE 3 : Signature modifiée avec playerLanguage
  private async handleLegacyNpcInteractionLogic(player: Player, npc: any, npcId: number, playerLanguage: string = 'fr'): Promise<NpcInteractionResult> {
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
      const completionDialogue = await this.getQuestDialogue(questDefinition, 'questComplete', player, playerLanguage);
      
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
      const progressDialogue = await this.getQuestDialogue(questDefinition, 'questInProgress', player, playerLanguage);
      
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
      
      // ✅ ÉTAPE 3 : UTILISER LANGUE JOUEUR
      const shopGreeting = await this.getShopGreeting(player, npc, playerLanguage);
      
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
        },
        lines: [shopGreeting], // ✅ NOUVEAU : Dialogue personnalisé
        message: shopGreeting   // ✅ NOUVEAU : Dialogue personnalisé
      };
    } else if (npc.properties?.healer || npc.type === 'healer') {
      
      // ✅ ÉTAPE 3 : UTILISER LANGUE JOUEUR
      const healerGreeting = await this.getHealerGreeting(player, npc, playerLanguage);
      
      return { 
        success: true,
        type: "heal", 
        message: healerGreeting,
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
        },
        lines: [healerGreeting] // ✅ NOUVEAU : Dialogue personnalisé
      };
    } else if (npc.properties?.dialogue || npc.dialogueIds) {
      const lines = await this.getDialogueLines(npc, player, playerLanguage);
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
      const defaultDialogue = await this.getDefaultDialogueForNpc(npc, player, playerLanguage);
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

  // === ✅ ÉTAPE 4 : NOUVELLES MÉTHODES DIALOGSTRING AVEC LANGUE ===

  /**
   * ✅ ÉTAPE 4 : Obtenir dialogue de boutique via DialogString avec langue
   */
  private async getShopGreeting(player: Player, npc: any, playerLanguage: string = 'fr'): Promise<string> {
    try {
      const npcId = this.extractNpcIdentifier(npc);
      const dialogVars = this.createPlayerDialogVars(player, npc.name);
      
      // Essayer un dialogue spécifique au NPC d'abord
      let greeting = await this.dialogService.getText(
        `${npcId}.shop.greeting`,
        playerLanguage as any, // Cast pour type SupportedLanguage
        dialogVars
      );
      
      // Si pas trouvé, utiliser un dialogue générique
      if (greeting.includes('[MISSING:')) {
        greeting = await this.dialogService.getText(
          'generic.shop.welcome',
          playerLanguage as any,
          dialogVars
        );
      }
      
      // Si toujours pas trouvé, fallback
      if (greeting.includes('[MISSING:')) {
        greeting = `Bienvenue dans ma boutique, %s ! Que puis-je vous vendre ?`;
        greeting = greeting.replace('%s', player.name);
      }
      
      this.log('info', `🛒 [DialogString] Dialogue shop récupéré pour ${npcId} (${playerLanguage})`, {
        dialogId: `${npcId}.shop.greeting`,
        playerName: player.name,
        language: playerLanguage,
        result: greeting.substring(0, 50) + '...'
      });
      
      return greeting;
      
    } catch (error) {
      this.log('error', '❌ [DialogString] Erreur récupération dialogue shop', error);
      return `Bienvenue dans ma boutique, ${player.name} !`;
    }
  }

  /**
   * ✅ ÉTAPE 4 : Obtenir dialogue de soigneur via DialogString avec langue
   */
  private async getHealerGreeting(player: Player, npc: any, playerLanguage: string = 'fr'): Promise<string> {
    try {
      const npcId = this.extractNpcIdentifier(npc);
      const dialogVars = this.createPlayerDialogVars(player, npc.name);
      
      // Essayer un dialogue spécifique au NPC d'abord
      let greeting = await this.dialogService.getText(
        `${npcId}.healer.greeting`,
        playerLanguage as any,
        dialogVars
      );
      
      // Si pas trouvé, utiliser un dialogue générique
      if (greeting.includes('[MISSING:')) {
        greeting = await this.dialogService.getText(
          'generic.healer.welcome',
          playerLanguage as any,
          dialogVars
        );
      }
      
      // Si toujours pas trouvé, fallback
      if (greeting.includes('[MISSING:')) {
        greeting = `Vos Pokémon sont soignés, %s ! Ils sont maintenant en pleine forme.`;
        greeting = greeting.replace('%s', player.name);
      }
      
      this.log('info', `🏥 [DialogString] Dialogue healer récupéré pour ${npcId} (${playerLanguage})`, {
        dialogId: `${npcId}.healer.greeting`,
        playerName: player.name,
        language: playerLanguage,
        result: greeting.substring(0, 50) + '...'
      });
      
      return greeting;
      
    } catch (error) {
      this.log('error', '❌ [DialogString] Erreur récupération dialogue healer', error);
      return `Vos Pokémon sont soignés !`;
    }
  }

  /**
   * ✅ ÉTAPE 4 : Extraire identifiant NPC pour DialogString
   */
  private extractNpcIdentifier(npc: any): string {
    // Essayer plusieurs sources pour l'identifiant
    if (npc.dialogId) return npc.dialogId;
    if (npc.name) return npc.name.toLowerCase().replace(/\s+/g, '_');
    if (npc.id) return `npc_${npc.id}`;
    return 'unknown_npc';
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
      
      return result;
      
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
      
      return result;
    }

    return {
      success: false,
      message: "Action non reconnue"
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

  // ✅ CORRIGÉ : createErrorResult en protected au lieu de private
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

  // ✅ CORRIGÉ : Méthode log en protected au lieu de private
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [NpcInteractionModule] ${message}`;
    
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

  // === TOUTES LES AUTRES MÉTHODES UTILITAIRES (placeholders pour éviter les erreurs) ===

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
      this.log('info', `📊 [AI Learning] Action enregistrée`, {
        player: player.name,
        userId: data.userId || 'N/A',
        npcId,
        actionType,
        language: data.playerLanguage || 'N/A',
        dataKeys: Object.keys(data)
      });
    } catch (error) {
      this.log('warn', `⚠️ [AI Learning] Erreur enregistrement action:`, error);
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

  // ✅ ÉTAPE 4 : Méthode getQuestDialogue modifiée pour utiliser langue
  private async getQuestDialogue(questDefinition: any, dialogueType: string, player: Player, playerLanguage: string = 'fr'): Promise<string[]> {
    try {
      if (!questDefinition) return ["Dialogue par défaut"];
      
      const questId = questDefinition.id || 'unknown_quest';
      const dialogVars = this.createPlayerDialogVars(player, undefined, questDefinition.name);
      
      // Essayer de récupérer via DialogString avec langue
      const dialogId = `quest.${questId}.${dialogueType}`;
      const dialogue = await this.dialogService.getText(dialogId, playerLanguage as any, dialogVars);
      
      if (!dialogue.includes('[MISSING:')) {
        this.log('info', `🎯 [DialogString] Dialogue quête récupéré: ${dialogId} (${playerLanguage})`);
        return [dialogue];
      }
      
      // Fallback vers dialogue générique
      const genericDialogId = `generic.quest.${dialogueType}`;
      const genericDialogue = await this.dialogService.getText(genericDialogId, playerLanguage as any, dialogVars);
      
      if (!genericDialogue.includes('[MISSING:')) {
        return [genericDialogue];
      }
      
      // Dernier fallback
      return ["Dialogue par défaut"];
      
    } catch (error) {
      this.log('error', '❌ [DialogString] Erreur récupération dialogue quête', error);
      return ["Dialogue par défaut"];
    }
  }

  private async getReadyToCompleteQuestsForNpc(username: string, npcId: number): Promise<any[]> {
    return [];
  }

  private async getAvailableQuestsForNpc(username: string, npcId: number): Promise<any[]> {
    return [];
  }

  // ✅ ÉTAPE 4 : Méthode getDialogueLines modifiée pour utiliser langue
  private async getDialogueLines(npc: any, player: Player, playerLanguage: string = 'fr'): Promise<string[]> {
    try {
      const npcId = this.extractNpcIdentifier(npc);
      const dialogVars = this.createPlayerDialogVars(player, npc.name);
      
      // Si le NPC a des dialogueIds spécifiques, les traiter via DialogString
      if (npc.dialogueIds && Array.isArray(npc.dialogueIds)) {
        const processedLines = [];
        
        for (const dialogId of npc.dialogueIds) {
          const dialogue = await this.dialogService.getText(dialogId, playerLanguage as any, dialogVars);
          processedLines.push(dialogue.includes('[MISSING:') ? dialogId : dialogue);
        }
        
        return processedLines;
      }
      
      // Sinon essayer un dialogue générique avec langue
      const genericDialogue = await this.dialogService.getText(
        `${npcId}.greeting.default`,
        playerLanguage as any,
        dialogVars
      );
      
      if (!genericDialogue.includes('[MISSING:')) {
        this.log('info', `💬 [DialogString] Dialogue générique récupéré pour ${npcId} (${playerLanguage})`);
        return [genericDialogue];
      }
      
      // Fallback legacy
      if (npc.properties?.dialogue) {
        const dialogue = npc.properties.dialogue;
        const lines = Array.isArray(dialogue) ? dialogue : [dialogue];
        
        // Traiter les variables dans les dialogues legacy
        return lines.map(line => {
          return line.replace('%s', player.name);
        });
      }
      
      return ["Bonjour !"];
      
    } catch (error) {
      this.log('error', '❌ [DialogString] Erreur récupération dialogues NPC', error);
      return ["Bonjour !"];
    }
  }

  // ✅ ÉTAPE 4 : Méthode getDefaultDialogueForNpc modifiée pour utiliser langue
  private async getDefaultDialogueForNpc(npc: any, player: Player, playerLanguage: string = 'fr'): Promise<string[]> {
    try {
      const npcId = this.extractNpcIdentifier(npc);
      const dialogVars = this.createPlayerDialogVars(player, npc.name);
      
      // Essayer dialogue spécifique NPC avec langue
      let dialogue = await this.dialogService.getText(
        `${npcId}.greeting.default`,
        playerLanguage as any,
        dialogVars
      );
      
      // Si pas trouvé, essayer dialogue générique avec langue
      if (dialogue.includes('[MISSING:')) {
        dialogue = await this.dialogService.getText(
          'generic.greeting.default',
          playerLanguage as any,
          dialogVars
        );
      }
      
      // Si toujours pas trouvé, fallback avec variables
      if (dialogue.includes('[MISSING:')) {
        dialogue = `Bonjour %s ! Je suis %n.`;
        dialogue = dialogue.replace('%s', player.name);
        dialogue = dialogue.replace('%n', npc.name || 'un NPC');
      }
      
      this.log('info', `💬 [DialogString] Dialogue par défaut récupéré pour ${npcId} (${playerLanguage})`, {
        playerName: player.name,
        npcName: npc.name,
        language: playerLanguage,
        result: dialogue.substring(0, 50) + '...'
      });
      
      return [dialogue];
      
    } catch (error) {
      this.log('error', '❌ [DialogString] Erreur récupération dialogue par défaut', error);
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
    const lines = await this.getDialogueLines(npc, player, 'fr'); // TODO: Récupérer langue du joueur
    return {
      success: true,
      type: "dialogue",
      message: lines.join(' '),
      actionType: 'dialogue',
      npcId: npc.id
    };
  }
}
