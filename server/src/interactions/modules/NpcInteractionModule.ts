// src/interactions/modules/NpcInteractionModule.ts
// Module de gestion des interactions avec les NPCs - Version complète avec Interface Unifiée

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

// ✅ NOUVEAUX IMPORTS : Interface Unifiée
import { UnifiedInterfaceHandler } from "./npc/handlers/UnifiedInterfaceHandler";
import { 
  UnifiedInterfaceResult, 
  NpcCapability, 
  SpecificActionRequest,
  SpecificActionResult
} from "../types/UnifiedInterfaceTypes";

// Import du handler merchant existant
import { MerchantNpcHandler } from "./npc/handlers/MerchantNpcHandler";

// ✅ INTERFACE RESULT NPC (conserve compatibilité existante)
export interface NpcInteractionResult extends InteractionResult {
  // Données NPCs existantes
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
  
  // ✅ NOUVEAUX : Interface Unifiée
  unifiedInterface?: UnifiedInterfaceResult;
  capabilities?: NpcCapability[];
  
  // ✅ AJOUTÉ : Nouvelles propriétés pour détection client
  isUnifiedInterface?: boolean;
  unifiedMode?: boolean;
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
}

export class NpcInteractionModule extends BaseInteractionModule {
  
  readonly moduleName = "NpcInteractionModule";
  readonly supportedTypes: InteractionType[] = ["npc"];
  readonly version = "3.0.0"; // ✅ Version avec interface unifiée

  // === DÉPENDANCES (injectées depuis InteractionManager existant) ===
  private getNpcManager: (zoneName: string) => any;
  private questManager: QuestManager;
  private shopManager: ShopManager;
  private starterHandlers: StarterHandlers;
  private spectatorManager: SpectatorManager;
  
  // ✅ HANDLERS MODULAIRES
  private merchantHandler: MerchantNpcHandler;
  private unifiedInterfaceHandler: UnifiedInterfaceHandler; // NOUVEAU

  constructor(
    getNpcManager: (zoneName: string) => any,
    questManager: QuestManager,
    shopManager: ShopManager,
    starterHandlers: StarterHandlers,
    spectatorManager: SpectatorManager
  ) {
    super();
    this.getNpcManager = getNpcManager;
    this.questManager = questManager;
    this.shopManager = shopManager;
    this.starterHandlers = starterHandlers;
    this.spectatorManager = spectatorManager;

    // ✅ INITIALISATION HANDLERS MODULAIRES (existant + nouveau)
    this.initializeHandlers();

    this.log('info', '🔄 Module NPC initialisé avec Interface Unifiée', {
      version: this.version,
      handlersLoaded: ['merchant', 'unifiedInterface']
    });
  }

  // ✅ MÉTHODE MODIFIÉE: Initialisation des handlers (+ UnifiedInterface)
  private initializeHandlers(): void {
    try {
      // Handler Merchant (existant)
      this.merchantHandler = new MerchantNpcHandler(this.shopManager, {
        debugMode: process.env.NODE_ENV === 'development'
      });
      
      // ✅ NOUVEAU : Handler Interface Unifiée
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
        unifiedInterfaceHandler: !!this.unifiedInterfaceHandler
      });
      
    } catch (error) {
      this.log('error', '❌ Erreur initialisation handlers', error);
      throw new Error(`Impossible d'initialiser les handlers NPCs: ${error}`);
    }
  }

  // === MÉTHODES PRINCIPALES ===

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

      this.log('info', `Interaction NPC ${npcId}`, { player: player.name });

      // === LOGIQUE AVEC INTERFACE UNIFIÉE ===
      const result = await this.handleNpcInteractionLogic(player, npcId);

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

  // === LOGIQUE MÉTIER NPCs (MODIFIÉE AVEC INTERFACE UNIFIÉE) ===

  private async handleNpcInteractionLogic(player: Player, npcId: number): Promise<NpcInteractionResult> {
    this.log('info', `Traitement logique NPC ${npcId} pour ${player.name}`);
    
    // Récupérer le NPC
    const npcManager = this.getNpcManager(player.currentZone);
    if (!npcManager) {
      return {
        success: false,
        type: "error", 
        message: "NPCs non disponibles dans cette zone."
      };
    }

    const npc = npcManager.getNpcById(npcId);
    if (!npc) {
      return {
        success: false,
        type: "error", 
        message: "NPC inconnu."
      };
    }

    this.log('info', `NPC trouvé: ${npc.name}`, { 
      type: npc.type || 'legacy',
      sourceType: npc.sourceType || 'tiled',
      properties: Object.keys(npc.properties || {}).slice(0, 5) // Limiter pour logs
    });

    // ✅ NOUVELLE LOGIQUE : Analyse des capacités pour Interface Unifiée
    const capabilities = await this.analyzeNpcCapabilities(player, npc);
    
    this.log('info', `Capacités détectées: ${capabilities.length}`, { capabilities });

    // ✅ LOGIQUE CONDITIONNELLE : Multi-capacités vs Mono-capacité
    if (capabilities.length >= 1 && this.shouldUseUnifiedInterface(capabilities)) {
      // === CAS MULTI-CAPACITÉS : Interface Unifiée ===
      this.log('info', '🔗 NPC multi-capacités -> Interface Unifiée');
      
      try {
        const unifiedResult = await this.unifiedInterfaceHandler.build(player, npc, capabilities);
        
        // Conversion vers NpcInteractionResult pour compatibilité
      const result: NpcInteractionResult = {
        success: true,
        type: "unifiedInterface",
        message: `Interface ${capabilities.join(', ')} pour ${npc.name}`,
        npcId: npcId,
        npcName: npc.name,
        
        // ✅ AJOUTÉ : Flags explicites pour le client
        isUnifiedInterface: true,
        unifiedMode: true,
        
        unifiedInterface: unifiedResult,
        capabilities: capabilities,
        
        // ✅ NOUVEAU : Données contextuelles pour détection client
        contextualData: {
          hasShop: capabilities.includes('merchant'),
          hasQuests: capabilities.includes('quest'),
          hasHealing: capabilities.includes('healer'),
          defaultAction: unifiedResult.defaultAction,
          quickActions: unifiedResult.quickActions || []
        },
        
        // ✅ NOUVEAU : Données shop si présentes
        ...(unifiedResult.merchantData && {
          shopId: unifiedResult.merchantData.shopId,
          shopData: {
            shopInfo: unifiedResult.merchantData.shopInfo,
            availableItems: unifiedResult.merchantData.availableItems,
            playerGold: unifiedResult.merchantData.playerGold
          }
        }),
        
        // Données legacy pour rétro-compatibilité
        lines: unifiedResult.dialogueData?.lines || [`Bonjour ! Je suis ${npc.name}.`]
      };

        this.log('info', '✅ Interface Unifiée construite', { 
          capabilities: unifiedResult.capabilities.length,
          defaultAction: unifiedResult.defaultAction
        });

        return result;
        
      } catch (error) {
        this.log('error', '❌ Erreur Interface Unifiée, fallback legacy', error);
        // Fallback vers logique existante en cas d'erreur
      }
    }

    // === CAS MONO-CAPACITÉ OU FALLBACK : Logique Existante ===
    this.log('info', '⚠️ NPC mono-capacité ou fallback -> Logique existante');
    return await this.handleLegacyNpcInteraction(player, npc, npcId);
  }

  // ✅ NOUVELLE MÉTHODE : Analyse des capacités NPCs
  private async analyzeNpcCapabilities(player: Player, npc: any): Promise<NpcCapability[]> {
    const capabilities: NpcCapability[] = [];

    // 1. Merchant
    if (this.merchantHandler.isMerchantNpc(npc)) {
      capabilities.push('merchant');
    }

    // 2. Quest (asynchrone)
    try {
      const hasQuests = await this.hasQuestCapability(player, npc);
      if (hasQuests) {
        capabilities.push('quest');
      }
    } catch (error) {
      this.log('warn', 'Erreur vérification quêtes', error);
    }

    // 3. Dialogue (toujours disponible)
    if (this.hasDialogueCapability(npc)) {
      capabilities.push('dialogue');
    }

    // 4. Healer
    if (this.hasHealerCapability(npc)) {
      capabilities.push('healer');
    }

    // 5. Trainer
    if (this.hasTrainerCapability(npc)) {
      capabilities.push('trainer');
    }

    // 6. Transport
    if (this.hasTransportCapability(npc)) {
      capabilities.push('transport');
    }

    // 7. Service
    if (this.hasServiceCapability(npc)) {
      capabilities.push('service');
    }

    // Supprimer les doublons et limiter
    const uniqueCapabilities = [...new Set(capabilities)].slice(0, 5);

    this.log('info', `Capacités analysées pour NPC ${npc.id}`, {
      total: uniqueCapabilities.length,
      list: uniqueCapabilities
    });

    return uniqueCapabilities;
  }

  // ✅ MÉTHODES DE DÉTECTION DES CAPACITÉS

  private async hasQuestCapability(player: Player, npc: any): Promise<boolean> {
    try {
      // Quêtes disponibles
      const availableQuests = await this.getAvailableQuestsForNpc(player.name, npc.id);
      
      // Quêtes à compléter
      const activeQuests = await this.questManager.getActiveQuests(player.name);
      const questsToComplete = activeQuests.filter(q => q.endNpcId === npc.id && q.status === 'readyToComplete');
      
      return availableQuests.length > 0 || questsToComplete.length > 0;
    } catch {
      return false;
    }
  }

  private hasDialogueCapability(npc: any): boolean {
    return !!(npc.dialogueIds?.length || npc.properties?.dialogue) || true; // Toujours disponible comme fallback
  }

  private hasHealerCapability(npc: any): boolean {
    return npc.type === 'healer' || !!npc.properties?.healer || !!npc.healerConfig;
  }

  private hasTrainerCapability(npc: any): boolean {
    return npc.type === 'trainer' || !!npc.trainerId || !!npc.properties?.trainerId;
  }

  private hasTransportCapability(npc: any): boolean {
    return npc.type === 'transport' || !!npc.transportConfig || !!npc.properties?.transport;
  }

  private hasServiceCapability(npc: any): boolean {
    return npc.type === 'service' || !!npc.serviceConfig || !!npc.properties?.service;
  }

  // ✅ NOUVELLE MÉTHODE : Déterminer si utiliser l'interface unifiée
private shouldUseUnifiedInterface(capabilities: NpcCapability[]): boolean {
  // Ne pas utiliser interface unifiée si pas de capabilities
  if (capabilities.length === 0) return false;
  
  // Si seulement "dialogue", utiliser legacy pour performance
  if (capabilities.length === 1 && capabilities[0] === 'dialogue') {
    return false;
  }
  
  // Sinon, utiliser interface unifiée
  this.log('info', `🔍 shouldUseUnifiedInterface: ${capabilities.join(',')} -> OUI`);
  return true;
}
  // ✅ NOUVELLE MÉTHODE PUBLIQUE : Gestion des actions spécifiques (pour client)
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

      // Déléguer selon le type d'action
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

  // === HANDLERS ACTIONS SPÉCIFIQUES ===

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
    
    // Pour dialogue, on retourne juste les lignes de dialogue
    const lines = this.getDialogueLines(npc);
    
    return {
      success: true,
      type: "dialogue",
      message: lines.join(' '),
      actionType: 'dialogue',
      npcId: npc.id
    };
  }

  // ✅ LOGIQUE LEGACY (code existant pour les NPCs non migrés) - INCHANGÉE
  private async handleLegacyNpcInteraction(player: Player, npc: any, npcId: number): Promise<NpcInteractionResult> {
    // === LOGIQUE DE PRIORITÉ EXISTANTE ===

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

    // 3. Progression normale des quêtes
    this.log('info', 'Déclenchement updateQuestProgress pour talk');
    
    let questProgress: any[] = [];
    try {
      questProgress = await this.questManager.updateQuestProgress(player.name, {
        type: 'talk',
        npcId: npcId,
        targetId: npcId.toString()
      });
      this.log('info', 'Résultats progression quêtes', questProgress);
    } catch (error) {
      this.log('error', 'Erreur updateQuestProgress', error);
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
        const result = await this.questManager.completeQuestManually(player.name, quest.id);
        if (result) {
          completionResults.push(result);
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
          npcName: npc.name,
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
        npcName: npc.name
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
        npcId: npcId,
        npcName: npc.name,
        questProgress: questProgress
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
        npcId: npcId,
        npcName: npc.name,
        questProgress: questProgress
      };
    } else if (npc.properties?.healer || npc.type === 'healer') {
      return { 
        success: true,
        type: "heal", 
        message: "Vos Pokémon sont soignés !",
        npcId: npcId,
        npcName: npc.name,
        questProgress: questProgress
      };
    } else if (npc.properties?.dialogue || npc.dialogueIds) {
      const lines = this.getDialogueLines(npc);
      return { 
        success: true,
        type: "dialogue", 
        lines,
        npcId: npcId,
        npcName: npc.name,
        questProgress: questProgress
      };
    } else {
      const defaultDialogue = await this.getDefaultDialogueForNpc(npc);
      return { 
        success: true,
        type: "dialogue", 
        lines: defaultDialogue,
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name
      };
    }
  }

  // === MÉTHODES SPÉCIALISÉES (CODE EXISTANT CONSERVÉ) ===

  private async handleStarterTableInteraction(player: Player, npc: any, npcId: number): Promise<NpcInteractionResult> {
    this.log('info', 'Traitement interaction table starter');
  
    const validation = await this.starterHandlers.validateStarterRequest(player, 1);
    
    if (validation.valid) {
      return {
        success: true,
        type: "starterTable",
        message: "Choisissez votre Pokémon starter !",
        npcId: npcId,
        npcName: npc.name || "Table des starters",
        starterEligible: true,
        lines: [
          "Voici les trois Pokémon starter !",
          "Choisissez celui qui vous accompagnera dans votre aventure !"
        ]
      };
    } else {
      return {
        success: true,
        type: "dialogue",
        message: validation.message,
        npcId: npcId,
        npcName: npc.name || "Table des starters",
        starterEligible: false,
        starterReason: validation.reason,
        lines: [validation.message]
      };
    }
  }

  // === MÉTHODES UTILITAIRES (CODE EXISTANT CONSERVÉ) ===

  // ✅ Support JSON + Tiled pour dialogues
  private getDialogueLines(npc: any): string[] {
    // JSON : dialogueIds
    if (npc.dialogueIds && Array.isArray(npc.dialogueIds)) {
      return npc.dialogueIds;
    }
    
    // Tiled : properties.dialogue
    if (npc.properties?.dialogue) {
      const dialogue = npc.properties.dialogue;
      return Array.isArray(dialogue) ? dialogue : [dialogue];
    }
    
    return ["Bonjour !"];
  }

  // ✅ Récupération quest progress safe
  private async getQuestProgressSafe(username: string, npcId: number): Promise<any[]> {
    try {
      return await this.questManager.updateQuestProgress(username, {
        type: 'talk',
        npcId: npcId,
        targetId: npcId.toString()
      });
    } catch (error) {
      this.log('error', 'Erreur getQuestProgressSafe', error);
      return [];
    }
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
                  npcId: npcId,
                  npcName: await this.getNpcName(npcId),
                  questProgress: progressResults,
                  message: result.message
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
    
    // ✅ Support JSON + Tiled
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

  // === MÉTHODES PUBLIQUES POUR TRANSACTIONS SHOP (MODIFIÉES) ===

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

    // ✅ DÉLÉGATION AU MERCHANT HANDLER
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

    // ✅ FALLBACK: Logique existante
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

  // === MÉTHODES PUBLIQUES POUR QUÊTES (INCHANGÉES) ===

  async handleQuestStart(username: string, questId: string): Promise<{ success: boolean; message: string; quest?: any }> {
    try {
      this.log('info', 'Démarrage quête', { username, questId });
      
      const quest = await this.questManager.startQuest(username, questId);
      if (quest) {
        this.log('info', 'Quête démarrée avec succès', { questName: quest.name });
        return {
          success: true,
          message: `Quête "${quest.name}" acceptée !`,
          quest: quest
        };
      } else {
        return {
          success: false,
          message: "Impossible de commencer cette quête."
        };
      }
    } catch (error) {
      this.log('error', 'Erreur démarrage quête', error);
      return {
        success: false,
        message: `Erreur lors du démarrage de la quête: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  // === MÉTHODES PUBLIQUES POUR SPECTATEURS (INCHANGÉES) ===

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
        message: "Ce joueur n'est pas en combat actuellement."
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
        message: watchResult.reason || "Impossible de regarder ce combat"
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
      }
    };
  }

  // === NOUVELLES MÉTHODES D'ADMINISTRATION ===

  getHandlerStats(): any {
    return {
      module: this.getStats(),
      handlers: {
        merchant: this.merchantHandler?.getStats(),
        unifiedInterface: this.unifiedInterfaceHandler?.getStats()
      }
    };
  }

  debugHandler(handlerType: 'merchant' | 'unifiedInterface', npcId?: number): void {
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
      default:
        console.log('Handler non supporté:', handlerType);
    }
  }
}
