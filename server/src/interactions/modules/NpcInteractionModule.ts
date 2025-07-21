// src/interactions/modules/NpcInteractionModule.ts
// Module de gestion des interactions avec les NPCs - Version complète avec système multi-fonctionnel

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

// ✅ Import du handler merchant
import { MerchantNpcHandler } from "./npc/handlers/MerchantNpcHandler";

// ✅ NOUVELLES INTERFACES POUR SYSTÈME MULTI-FONCTIONNEL
export interface NpcCapability {
  type: 'merchant' | 'quest_giver' | 'quest_ender' | 'healer' | 'dialogue' | 'starter' | 'spectate';
  priority: number;
  handler?: string;
  icon?: string;
  label: string;
  description?: string;
  available: boolean;
  reason?: string; // Si non disponible
}

export interface NpcChoiceResult extends InteractionResult {
  type: "npc_choice";
  capabilities: NpcCapability[];
  npcId: number;
  npcName: string;
  welcomeMessage?: string;
  lines?: string[];
}

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
  
  // ✅ NOUVEAU : Capacités multi-fonctionnelles
  capabilities?: NpcCapability[];
}

export class NpcInteractionModule extends BaseInteractionModule {
  
  readonly moduleName = "NpcInteractionModule";
  readonly supportedTypes: InteractionType[] = ["npc"];
  readonly version = "3.0.0"; // ✅ Version avec système multi-fonctionnel

  // === DÉPENDANCES (injectées depuis InteractionManager existant) ===
  private getNpcManager: (zoneName: string) => any;
  private questManager: QuestManager;
  private shopManager: ShopManager;
  private starterHandlers: StarterHandlers;
  private spectatorManager: SpectatorManager;
  
  // ✅ HANDLERS MODULAIRES
  private merchantHandler: MerchantNpcHandler;

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

    // ✅ INITIALISATION HANDLERS MODULAIRES
    this.initializeHandlers();

    this.log('info', '🔄 Module NPC initialisé avec système multi-fonctionnel', {
      version: this.version,
      handlersLoaded: ['merchant'],
      capabilities: ['multi_function_detection', 'choice_interface', 'priority_system']
    });
  }

  // ✅ INITIALISATION DES HANDLERS
  private initializeHandlers(): void {
    try {
      // Handler Merchant
      this.merchantHandler = new MerchantNpcHandler(this.shopManager, {
        debugMode: process.env.NODE_ENV === 'development'
      });
      
      this.log('info', '✅ Handlers modulaires initialisés', {
        merchantHandler: !!this.merchantHandler
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
      const requestedCapability = request.data?.capability; // ✅ NOUVEAU : Capability demandée

      if (!npcId) {
        return this.createErrorResult("NPC ID manquant", "INVALID_REQUEST");
      }

      this.log('info', `Interaction NPC ${npcId}`, { 
        player: player.name,
        requestedCapability: requestedCapability || 'auto_detect'
      });

      // === LOGIQUE AVEC SYSTÈME MULTI-FONCTIONNEL ===
      const result = await this.handleNpcInteractionLogic(player, npcId, requestedCapability);

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

  // === LOGIQUE MÉTIER NPCs AVEC SYSTÈME MULTI-FONCTIONNEL ===

  private async handleNpcInteractionLogic(
    player: Player, 
    npcId: number, 
    requestedCapability?: string
  ): Promise<NpcInteractionResult> {
    
    this.log('info', `Traitement logique NPC ${npcId} pour ${player.name}`, {
      requestedCapability: requestedCapability || 'detection_auto'
    });
    
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
      properties: Object.keys(npc.properties || {}).slice(0, 5)
    });

    // === NOUVELLE LOGIQUE : ANALYSE DES CAPACITÉS DISPONIBLES ===
    const capabilities = await this.analyzeNpcCapabilities(player, npc, npcId);
    
    this.log('info', `🔍 Capacités détectées pour NPC ${npcId}:`, {
      total: capabilities.length,
      available: capabilities.filter(c => c.available).length,
      types: capabilities.map(c => c.type)
    });

    // === CAS 1 : CAPABILITY SPÉCIFIQUE DEMANDÉE ===
    if (requestedCapability) {
      this.log('info', `🎯 Capability spécifique demandée: ${requestedCapability}`);
      
      const targetCapability = capabilities.find(c => c.type === requestedCapability);
      if (!targetCapability) {
        return {
          success: false,
          type: "error",
          message: `Cette action n'est pas disponible pour ce NPC.`,
          capabilities
        };
      }
      
      if (!targetCapability.available) {
        return {
          success: false,
          type: "error",
          message: targetCapability.reason || "Action temporairement indisponible.",
          capabilities
        };
      }
      
      // Déléguer à la capability demandée
      return await this.delegateToSpecificCapability(player, npc, npcId, targetCapability, capabilities);
    }

    // === CAS 2 : UNE SEULE CAPABILITY DISPONIBLE - DÉLÉGATION DIRECTE ===
    const availableCapabilities = capabilities.filter(c => c.available);
    
    if (availableCapabilities.length === 1) {
      const singleCapability = availableCapabilities[0];
      this.log('info', `🎯 Une seule capability disponible: ${singleCapability.type}`);
      
      return await this.delegateToSpecificCapability(player, npc, npcId, singleCapability, capabilities);
    }

    // === CAS 3 : AUCUNE CAPABILITY DISPONIBLE ===
    if (availableCapabilities.length === 0) {
      this.log('warn', `⚠️ Aucune capability disponible pour NPC ${npcId}`);
      
      // Fallback vers dialogue par défaut
      const defaultDialogue = await this.getDefaultDialogueForNpc(npc);
      return {
        success: true,
        type: "dialogue",
        lines: defaultDialogue,
        npcId: npcId,
        npcName: npc.name,
        capabilities
      };
    }

    // === CAS 4 : MULTIPLE CAPABILITIES - INTERFACE DE CHOIX ===
    this.log('info', `🎛️ Capabilities multiples disponibles (${availableCapabilities.length}), génération interface de choix`);
    
    const welcomeLines = await this.generateWelcomeMessage(npc, availableCapabilities);
    
    return {
      success: true,
      type: "npc_choice",
      capabilities: availableCapabilities,
      npcId: npcId,
      npcName: npc.name,
      lines: welcomeLines,
      welcomeMessage: `Bonjour ! Comment puis-je vous aider ?`,
      message: "Choisissez une option"
    } as NpcChoiceResult;
  }

  // === NOUVELLE MÉTHODE : ANALYSE DES CAPACITÉS NPCs ===
  
  private async analyzeNpcCapabilities(player: Player, npc: any, npcId: number): Promise<NpcCapability[]> {
    const capabilities: NpcCapability[] = [];
    
    try {
      // === 1. CAPABILITY MERCHANT ===
      if (this.merchantHandler.isMerchantNpc(npc)) {
        const shopId = this.getShopId(npc);
        const shopAvailable = shopId ? !!this.shopManager.getShopCatalog(shopId, player.level || 1) : false;
        
        capabilities.push({
          type: 'merchant',
          priority: 10,
          handler: 'MerchantNpcHandler',
          icon: '🛒',
          label: 'Ouvrir la boutique',
          description: 'Acheter et vendre des objets',
          available: shopAvailable,
          reason: shopAvailable ? undefined : 'Boutique temporairement fermée'
        });
      }

      // === 2. CAPABILITY QUEST GIVER ===
      const availableQuests = await this.getAvailableQuestsForNpc(player.name, npcId);
      if (availableQuests.length > 0) {
        capabilities.push({
          type: 'quest_giver',
          priority: 20,
          handler: 'QuestSystem',
          icon: '📜',
          label: 'Recevoir une quête',
          description: `${availableQuests.length} quête(s) disponible(s)`,
          available: true
        });
      }

      // === 3. CAPABILITY QUEST ENDER ===
      const readyToCompleteQuests = await this.getReadyToCompleteQuestsForNpc(player.name, npcId);
      if (readyToCompleteQuests.length > 0) {
        capabilities.push({
          type: 'quest_ender',
          priority: 30,
          handler: 'QuestSystem',
          icon: '✅',
          label: 'Terminer une quête',
          description: `${readyToCompleteQuests.length} quête(s) à rendre`,
          available: true
        });
      }

      // === 4. CAPABILITY HEALER ===
      if (npc.properties?.healer || npc.type === 'healer') {
        const hasWoundedPokemon = this.playerHasWoundedPokemon(player);
        capabilities.push({
          type: 'healer',
          priority: 40,
          handler: 'HealerSystem',
          icon: '🏥',
          label: 'Soigner les Pokémon',
          description: hasWoundedPokemon ? 'Vos Pokémon ont besoin de soins' : 'Vos Pokémon sont en bonne santé',
          available: true
        });
      }

      // === 5. CAPABILITY STARTER ===
      if (npc.properties?.startertable === true || npc.properties?.startertable === 'true') {
        const validation = await this.starterHandlers.validateStarterRequest(player, 1);
        capabilities.push({
          type: 'starter',
          priority: 50,
          handler: 'StarterSystem',
          icon: '🎁',
          label: 'Choisir un starter',
          description: validation.valid ? 'Choisissez votre premier Pokémon' : validation.message,
          available: validation.valid,
          reason: validation.valid ? undefined : validation.reason
        });
      }

      // === 6. CAPABILITY DIALOGUE (toujours disponible comme fallback) ===
      const hasDialogue = npc.dialogueIds || npc.properties?.dialogue || npc.properties?.dialogueId;
      if (hasDialogue || capabilities.length === 0) {
        capabilities.push({
          type: 'dialogue',
          priority: 100,
          handler: 'DialogueSystem',
          icon: '💬',
          label: 'Discuter',
          description: 'Avoir une conversation',
          available: true
        });
      }

      // === 7. CAPABILITY SPECTATE (pour les autres joueurs) ===
      // Note: Cette capability est gérée différemment car elle s'applique aux joueurs, pas aux NPCs

      // === TRI PAR PRIORITÉ ===
      capabilities.sort((a, b) => a.priority - b.priority);

      return capabilities;

    } catch (error) {
      this.log('error', 'Erreur analyse des capacités', error);
      
      // Fallback vers dialogue simple
      return [{
        type: 'dialogue',
        priority: 100,
        handler: 'DialogueSystem',
        icon: '💬',
        label: 'Discuter',
        description: 'Avoir une conversation',
        available: true
      }];
    }
  }

  // === NOUVELLE MÉTHODE : DÉLÉGATION VERS CAPABILITY SPÉCIFIQUE ===

  private async delegateToSpecificCapability(
    player: Player, 
    npc: any, 
    npcId: number, 
    capability: NpcCapability,
    allCapabilities: NpcCapability[]
  ): Promise<NpcInteractionResult> {
    
    this.log('info', `🎯 Délégation vers capability: ${capability.type}`, {
      handler: capability.handler,
      available: capability.available
    });

    // Ajouter les capabilities à tous les résultats pour compatibilité
    const baseResult = { capabilities: allCapabilities };

    switch (capability.type) {
      case 'merchant':
        if (this.merchantHandler.isMerchantNpc(npc)) {
          this.log('info', '🛒 Délégation au MerchantNpcHandler');
          const merchantResult = await this.merchantHandler.handle(player, npc, npcId);
          
          // Ajouter quest progress pour compatibilité
          const questProgress = await this.getQuestProgressSafe(player.name, npcId);
          
          return {
            ...merchantResult,
            questProgress,
            ...baseResult
          };
        }
        break;

      case 'quest_giver':
        this.log('info', '📜 Délégation au système de quêtes (quest giver)');
        return await this.handleQuestGiverLogic(player, npc, npcId, allCapabilities);

      case 'quest_ender':
        this.log('info', '✅ Délégation au système de quêtes (quest ender)');
        return await this.handleQuestEnderLogic(player, npc, npcId, allCapabilities);

      case 'healer':
        this.log('info', '🏥 Délégation au système de soins');
        return await this.handleHealerLogic(player, npc, npcId, allCapabilities);

      case 'starter':
        this.log('info', '🎁 Délégation au système de starters');
        return await this.handleStarterTableInteraction(player, npc, npcId, allCapabilities);

      case 'dialogue':
        this.log('info', '💬 Délégation au système de dialogue');
        return await this.handleDialogueLogic(player, npc, npcId, allCapabilities);

      default:
        this.log('warn', `⚠️ Capability non gérée: ${capability.type}`);
        return await this.handleDialogueLogic(player, npc, npcId, allCapabilities);
    }

    // Fallback
    return await this.handleDialogueLogic(player, npc, npcId, allCapabilities);
  }

  // === HANDLERS SPÉCIALISÉS PAR CAPABILITY ===

  private async handleQuestGiverLogic(player: Player, npc: any, npcId: number, capabilities: NpcCapability[]): Promise<NpcInteractionResult> {
    const questProgress = await this.getQuestProgressSafe(player.name, npcId);
    const availableQuests = await this.getAvailableQuestsForNpc(player.name, npcId);
    
    if (availableQuests.length > 0) {
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
        npcName: npc.name,
        capabilities
      };
    }

    return {
      success: false,
      type: "error",
      message: "Aucune quête disponible pour le moment.",
      capabilities
    };
  }

  private async handleQuestEnderLogic(player: Player, npc: any, npcId: number, capabilities: NpcCapability[]): Promise<NpcInteractionResult> {
    const questProgress = await this.getQuestProgressSafe(player.name, npcId);
    const readyToCompleteQuests = await this.getReadyToCompleteQuestsForNpc(player.name, npcId);
    
    if (readyToCompleteQuests.length > 0) {
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
          message: `Félicitations ! Vous avez terminé : ${questNames}`,
          capabilities
        };
      }
    }

    return {
      success: false,
      type: "error",
      message: "Aucune quête à terminer pour le moment.",
      capabilities
    };
  }

  private async handleHealerLogic(player: Player, npc: any, npcId: number, capabilities: NpcCapability[]): Promise<NpcInteractionResult> {
    const questProgress = await this.getQuestProgressSafe(player.name, npcId);
    
    return {
      success: true,
      type: "heal",
      message: "Vos Pokémon sont soignés !",
      lines: [
        "Bienvenue au centre de soins !",
        "Vos Pokémon sont maintenant en pleine forme !"
      ],
      npcId: npcId,
      npcName: npc.name,
      questProgress,
      capabilities
    };
  }

  private async handleStarterTableInteraction(player: Player, npc: any, npcId: number, capabilities: NpcCapability[]): Promise<NpcInteractionResult> {
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
        ],
        capabilities
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
        lines: [validation.message],
        capabilities
      };
    }
  }

  private async handleDialogueLogic(player: Player, npc: any, npcId: number, capabilities: NpcCapability[]): Promise<NpcInteractionResult> {
    const questProgress = await this.getQuestProgressSafe(player.name, npcId);
    const lines = this.getDialogueLines(npc);
    
    return {
      success: true,
      type: "dialogue",
      lines,
      npcId: npcId,
      npcName: npc.name,
      questProgress,
      capabilities
    };
  }

  // === MÉTHODES UTILITAIRES NOUVELLES ===

  private async generateWelcomeMessage(npc: any, capabilities: NpcCapability[]): Promise<string[]> {
    const npcName = npc.name || "quelqu'un";
    
    // Message d'accueil basé sur les capabilities disponibles
    const welcomeLines = [`Bonjour ! Je suis ${npcName}.`];
    
    if (capabilities.some(c => c.type === 'merchant')) {
      welcomeLines.push("Je tiens une boutique ici.");
    }
    
    if (capabilities.some(c => c.type === 'quest_giver' || c.type === 'quest_ender')) {
      welcomeLines.push("J'ai peut-être des missions pour vous.");
    }
    
    if (capabilities.some(c => c.type === 'healer')) {
      welcomeLines.push("Je peux soigner vos Pokémon.");
    }
    
    welcomeLines.push("Comment puis-je vous aider ?");
    
    return welcomeLines;
  }

  private getShopId(npc: any): string | null {
    // JSON : shopId direct (priorité)
    if (npc.shopId) return npc.shopId;
    
    // Tiled : propriétés legacy
    if (npc.properties?.shopId) return npc.properties.shopId;
    if (npc.properties?.shop) return npc.properties.shop;
    
    return null;
  }

  private playerHasWoundedPokemon(player: Player): boolean {
    // TODO: Implémenter la vérification des Pokémon blessés
    // Pour l'instant, on simule que le joueur a des Pokémon blessés
    return true;
  }

  // === MÉTHODES UTILITAIRES EXISTANTES (CONSERVÉES) ===

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

    // ✅ Essayer de déléguer au MerchantHandler si possible
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

  // === ✅ NOUVELLE MÉTHODE PUBLIQUE : INTERACTION AVEC CAPABILITY SPÉCIFIQUE ===

  /**
   * Permet de déclencher une capability spécifique sur un NPC
   * Utilisé par le client après avoir choisi une option dans l'interface
   */
  async handleSpecificCapability(
    player: Player, 
    npcId: number, 
    capability: string
  ): Promise<NpcInteractionResult> {
    
    this.log('info', `🎯 Capability spécifique demandée: ${capability} pour NPC ${npcId}`);
    
    // Utiliser la logique existante avec la capability spécifiée
    return await this.handleNpcInteractionLogic(player, npcId, capability);
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
      capabilities: {
        multiFunction: true,
        choiceInterface: true,
        prioritySystem: true
      },
      handlers: {
        merchant: this.merchantHandler?.getStats(),
        // TODO: autres handlers
      }
    };
  }

  debugHandler(handlerType: 'merchant', npcId?: number): void {
    switch (handlerType) {
      case 'merchant':
        if (npcId) {
          console.log(`🔍 Debug MerchantHandler pour NPC ${npcId}`);
          console.log('Stats:', this.merchantHandler.getStats());
        } else {
          console.log('🔍 MerchantHandler Stats:', this.merchantHandler.getStats());
        }
        break;
      default:
        console.log('Handler non supporté:', handlerType);
    }
  }

  // === ✅ NOUVELLE MÉTHODE : DEBUG CAPABILITIES ===
  
  async debugNpcCapabilities(player: Player, npcId: number): Promise<void> {
    const npcManager = this.getNpcManager(player.currentZone);
    if (!npcManager) {
      console.log(`❌ NPCManager non trouvé pour zone ${player.currentZone}`);
      return;
    }

    const npc = npcManager.getNpcById(npcId);
    if (!npc) {
      console.log(`❌ NPC ${npcId} non trouvé`);
      return;
    }

    console.log(`🔍 === DEBUG CAPABILITIES NPC ${npcId} ===`);
    console.log(`📋 NPC: ${npc.name} (${npc.type || 'legacy'})`);
    
    const capabilities = await this.analyzeNpcCapabilities(player, npc, npcId);
    
    console.log(`🎛️ Capabilities détectées (${capabilities.length}):`);
    capabilities.forEach((cap, index) => {
      console.log(`   ${index + 1}. ${cap.icon} ${cap.label} (${cap.type})`);
      console.log(`      Disponible: ${cap.available ? '✅' : '❌'}`);
      console.log(`      Priorité: ${cap.priority}`);
      console.log(`      Handler: ${cap.handler}`);
      if (!cap.available && cap.reason) {
        console.log(`      Raison: ${cap.reason}`);
      }
      console.log('');
    });
    
    console.log(`=======================================`);
  }
}
