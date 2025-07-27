// src/interactions/modules/NpcInteractionModule.ts
// Module de gestion des interactions avec les NPCs - VERSION AVEC IA INTÉGRÉE + DialogString - ÉTAPE 1

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
  readonly version = "4.2.0"; // ✅ Version avec DialogString intégré

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

    this.log('info', '🤖 Module NPC v4.2 avec DialogString intégré', {
      version: this.version,
      intelligenceEnabled: this.intelligenceConfig.enableIntelligence,
      enabledTypes: this.intelligenceConfig.enabledNPCTypes,
      handlersLoaded: ['merchant', 'unifiedInterface', 'intelligence', 'dialogString'],
      questIntegration: 'Phase 3 - Triggers automatiques + IA',
      dialogService: 'Intégré et prêt'
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

  // ✅ MÉTHODE MODIFIÉE : Enregistrement différé des NPCs dans l'IA
  private scheduleNPCRegistrationWithAI(): void {
    // Enregistrer les NPCs dans l'IA après un délai pour laisser le temps au système de s'initialiser
    setTimeout(async () => {
      await this.registerAllNPCsWithAI();
    }, 2000); // 2 secondes de délai
  }

  // ✅ MÉTHODE MODIFIÉE : Enregistrement de masse des NPCs
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

  // === MÉTHODES PRINCIPALES (MODIFIÉES POUR IA) ===

  canHandle(request: InteractionRequest): boolean {
    return request.type === 'npc' && request.data?.npcId !== undefined;
  }

  // ✅ HANDLE PRINCIPAL MODIFIÉ POUR SUPPORTER USERID
  async handle(context: InteractionContext | EnhancedInteractionContext): Promise<InteractionResult> {
    const startTime = Date.now();
    
    try {
      const { player, request } = context;
      const enhancedContext = context as EnhancedInteractionContext; // Cast pour accéder userId
      const npcId = request.data?.npcId;

      if (!npcId) {
        return this.createErrorResult("NPC ID manquant", "INVALID_REQUEST");
      }

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
          
          console.log(`📊 [AI] Action NPC trackée pour userId: ${enhancedContext.userId} → NPC ${npcId}`);
          
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
        intelligenceEnabled: this.intelligenceConfig.enableIntelligence,
        dialogServiceReady: !!this.dialogService
      });

      // ✅ NOUVEAU : Logique avec IA intégrée
      const result = await this.handleNpcInteractionWithAI(player, npcId, request, enhancedContext.userId);

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

  // === ✅ NOUVELLE LOGIQUE MÉTIER AVEC IA INTÉGRÉE (MODIFIÉE POUR USERID) ===

  private async handleNpcInteractionWithAI(
    player: Player, 
    npcId: number, 
    request: InteractionRequest,
    userId?: string  // ✅ NOUVEAU : userId pour tracking intelligent
  ): Promise<NpcInteractionResult> {
    
    this.log('info', `🤖 [AI+Legacy] Traitement NPC ${npcId} pour ${player.name} (userId: ${userId || 'N/A'})`);
    
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
      dialogServiceReady: !!this.dialogService
    });

    // ✅ DÉCISION PRINCIPALE : IA ou Legacy ?
    if (this.shouldUseIntelligentInteraction(npc) && userId) {
      // === TENTATIVE IA ===
      try {
        this.log('info', `🎭 [AI] Tentative interaction intelligente NPC ${safeNpcId} pour userId ${userId}`);
        
        const intelligentResult = await this.handleIntelligentNPCInteraction(
          player, npc, safeNpcId, safeNpcName, request, userId
        );
        
        // Si l'IA a réussi, retourner le résultat enrichi
        if (intelligentResult.intelligenceUsed) {
          this.log('info', `✅ [AI] Interaction intelligente réussie pour NPC ${safeNpcId}`, {
            confidence: intelligentResult.aiAnalysisConfidence,
            personalized: intelligentResult.personalizedLevel,
            proactive: intelligentResult.proactiveHelp,
            userId: userId
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

  // === TOUTES LES AUTRES MÉTHODES RESTENT IDENTIQUES ===
  // (handleIntelligentNPCInteraction, handleLegacyNpcInteractionLogic, etc... inchangées)

  // Je coupe ici pour éviter la répétition du code existant...
  // Le reste du fichier reste exactement identique

  // Exemple de méthodes qui restent inchangées :
  private async handleIntelligentNPCInteraction(...args: any[]): Promise<any> {
    // Code existant inchangé
    return null; // Placeholder
  }

  private async handleLegacyNpcInteractionLogic(...args: any[]): Promise<any> {
    // Code existant inchangé  
    return null; // Placeholder
  }

  // ... toutes les autres méthodes existantes restent identiques

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

  private createErrorResult(message: string, code: string): InteractionResult {
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

  private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
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

  // Méthodes utilitaires inchangées
  private shouldUseIntelligentInteraction(npc: any): boolean {
    // Code existant inchangé
    return false; // Placeholder
  }

  private shouldNPCUseIntelligence(npc: any): boolean {
    // Code existant inchangé
    return false; // Placeholder
  }
}
