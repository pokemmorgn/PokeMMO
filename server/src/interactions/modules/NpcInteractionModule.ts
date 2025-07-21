// src/interactions/modules/NpcInteractionModule.ts
// VERSION 3.0 - Système de priorités multi-fonctionnels
// NOUVEAUTÉ : Détection et interface de choix pour NPCs multi-fonctionnels

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

// Import du handler merchant
import { MerchantNpcHandler } from "./npc/handlers/MerchantNpcHandler";

// ✅ NOUVELLES INTERFACES POUR SYSTÈME MULTI-FONCTIONNEL

export interface NpcCapability {
  type: 'merchant' | 'quest_giver' | 'quest_completer' | 'healer' | 'trainer' | 'dialogue' | 'starter';
  priority: number; // 1 = haute priorité, 10 = basse priorité
  urgent: boolean;  // Si true, bypass le choix et exécute directement
  label: string;    // Texte affiché dans l'interface de choix
  icon: string;     // Icône pour l'UI
  description?: string;
  data?: any;       // Données contextuelles pour cette capacité
}

export interface NpcCapabilitiesAnalysis {
  npcId: number;
  npcName: string;
  totalCapabilities: number;
  capabilities: NpcCapability[];
  hasUrgentCapabilities: boolean;
  urgentCapability?: NpcCapability;
  requiresChoice: boolean;
  defaultCapability?: NpcCapability;
}

export interface ChoiceInterfaceResult extends InteractionResult {
  type: "choice_interface";
  choiceData: {
    npcId: number;
    npcName: string;
    capabilities: Array<{
      id: string;
      label: string;
      icon: string;
      description?: string;
    }>;
    timeoutSeconds?: number;
  };
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

  // ✅ NOUVELLE CONFIGURATION PRIORITÉS
  private priorityConfig = {
    urgent_priorities: [
      'quest_completer',  // Quêtes prêtes à compléter = URGENT
      'starter'           // Table starter = URGENT
    ],
    default_priorities: {
      'quest_completer': 1,
      'starter': 2,
      'quest_giver': 3,
      'merchant': 4,
      'healer': 5,
      'trainer': 6,
      'dialogue': 7
    },
    auto_execute_single: true,  // Si 1 seule capacité, exécuter directement
    auto_execute_urgent: true,  // Si capacité urgente, exécuter directement
    choice_timeout_seconds: 30  // Timeout interface de choix
  };

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

    this.log('info', '🔄 Module NPC v3.0 initialisé avec système multi-fonctionnel', {
      version: this.version,
      handlersLoaded: ['merchant'],
      priorityConfig: this.priorityConfig
    });
  }

  private initializeHandlers(): void {
    try {
      // Handler Merchant
      this.merchantHandler = new MerchantNpcHandler(this.shopManager, {
        debugMode: process.env.NODE_ENV === 'development'
      });
      
      this.log('info', '✅ Handlers modulaires initialisés');
      
    } catch (error) {
      this.log('error', '❌ Erreur initialisation handlers', error);
      throw new Error(`Impossible d'initialiser les handlers NPCs: ${error}`);
    }
  }

  // === MÉTHODE PRINCIPALE MODIFIÉE ===

  canHandle(request: InteractionRequest): boolean {
    return request.type === 'npc' && request.data?.npcId !== undefined;
  }

  async handle(context: InteractionContext): Promise<InteractionResult> {
    const startTime = Date.now();
    
    try {
      const { player, request } = context;
      const npcId = request.data?.npcId;
      const choiceId = request.data?.choiceId; // ✅ NOUVEAU: pour traiter les choix

      if (!npcId) {
        return this.createErrorResult("NPC ID manquant", "INVALID_REQUEST");
      }

      this.log('info', `🎯 Interaction NPC ${npcId}`, { 
        player: player.name, 
        choiceId: choiceId || 'initial'
      });

      // ✅ NOUVELLE LOGIQUE MULTI-FONCTIONNELLE
      const result = await this.handleMultiFunctionalNpcInteraction(player, npcId, choiceId);

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

  // ✅ NOUVELLE LOGIQUE PRINCIPALE MULTI-FONCTIONNELLE

  private async handleMultiFunctionalNpcInteraction(
    player: Player, 
    npcId: number, 
    choiceId?: string
  ): Promise<NpcInteractionResult | ChoiceInterfaceResult> {
    
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

    this.log('info', `🔍 Analyse NPC ${npc.name}`, { 
      type: npc.type || 'legacy',
      sourceType: npc.sourceType || 'tiled'
    });

    // ✅ SI UN CHOIX EST FAIT, TRAITER DIRECTEMENT
    if (choiceId) {
      return await this.handleSpecificChoice(player, npc, npcId, choiceId);
    }

    // ✅ ANALYSE DES CAPACITÉS DU NPC
    const capabilities = await this.analyzeNpcCapabilities(player, npc, npcId);
    
    this.log('info', `📊 Capacités détectées`, {
      total: capabilities.totalCapabilities,
      capabilities: capabilities.capabilities.map(c => c.type),
      urgent: capabilities.hasUrgentCapabilities,
      requiresChoice: capabilities.requiresChoice
    });

    // ✅ LOGIQUE DE DÉCISION

    // 1. Capacité urgente = exécution immédiate
    if (capabilities.hasUrgentCapabilities && this.priorityConfig.auto_execute_urgent) {
      this.log('info', `🚨 Exécution urgente: ${capabilities.urgentCapability!.type}`);
      return await this.executeCapability(player, npc, npcId, capabilities.urgentCapability!);
    }

    // 2. Une seule capacité = exécution directe
    if (capabilities.totalCapabilities === 1 && this.priorityConfig.auto_execute_single) {
      this.log('info', `⚡ Exécution directe: ${capabilities.capabilities[0].type}`);
      return await this.executeCapability(player, npc, npcId, capabilities.capabilities[0]);
    }

    // 3. Plusieurs capacités = interface de choix
    if (capabilities.requiresChoice) {
      this.log('info', `🎯 Interface de choix requise (${capabilities.totalCapabilities} options)`);
      return this.createChoiceInterface(capabilities);
    }

    // 4. Fallback : capacité par défaut
    if (capabilities.defaultCapability) {
      this.log('info', `🔄 Fallback: ${capabilities.defaultCapability.type}`);
      return await this.executeCapability(player, npc, npcId, capabilities.defaultCapability);
    }

    // 5. Aucune capacité = dialogue par défaut
    this.log('info', '💬 Aucune capacité spécifique, dialogue par défaut');
    return await this.handleLegacyNpcInteraction(player, npc, npcId);
  }

  // ✅ ANALYSE DES CAPACITÉS DU NPC

  private async analyzeNpcCapabilities(
    player: Player, 
    npc: any, 
    npcId: number
  ): Promise<NpcCapabilitiesAnalysis> {
    
    const capabilities: NpcCapability[] = [];

    // 1. ✅ CAPACITÉ MARCHAND
    if (this.merchantHandler.isMerchantNpc(npc)) {
      capabilities.push({
        type: 'merchant',
        priority: this.priorityConfig.default_priorities.merchant,
        urgent: false,
        label: "🛒 Ouvrir la boutique",
        icon: "shop",
        description: "Acheter et vendre des objets",
        data: { shopId: this.merchantHandler.getShopId?.(npc) || npc.shopId }
      });
    }

    // 2. ✅ CAPACITÉ QUÊTES À COMPLÉTER (URGENT)
    const readyToCompleteQuests = await this.getReadyToCompleteQuestsForNpc(player.name, npcId);
    if (readyToCompleteQuests.length > 0) {
      capabilities.push({
        type: 'quest_completer',
        priority: this.priorityConfig.default_priorities.quest_completer,
        urgent: true,
        label: `✅ Terminer quête${readyToCompleteQuests.length > 1 ? 's' : ''} (${readyToCompleteQuests.length})`,
        icon: "quest_complete",
        description: `${readyToCompleteQuests.length} quête(s) prête(s) à terminer`,
        data: { quests: readyToCompleteQuests }
      });
    }

    // 3. ✅ CAPACITÉ DONNEUR DE QUÊTES
    const availableQuests = await this.getAvailableQuestsForNpc(player.name, npcId);
    if (availableQuests.length > 0) {
      capabilities.push({
        type: 'quest_giver',
        priority: this.priorityConfig.default_priorities.quest_giver,
        urgent: false,
        label: `🎯 Nouvelles quêtes (${availableQuests.length})`,
        icon: "quest_new",
        description: `${availableQuests.length} nouvelle(s) quête(s) disponible(s)`,
        data: { quests: availableQuests }
      });
    }

    // 4. ✅ CAPACITÉ STARTER (URGENT)
    if (npc.properties?.startertable === true || npc.properties?.startertable === 'true') {
      const validation = await this.starterHandlers.validateStarterRequest(player, 1);
      capabilities.push({
        type: 'starter',
        priority: this.priorityConfig.default_priorities.starter,
        urgent: validation.valid, // Urgent seulement si éligible
        label: "🎁 Choisir un starter",
        icon: "pokeball",
        description: validation.valid ? "Choisir votre Pokémon de départ" : validation.message,
        data: { eligible: validation.valid, reason: validation.reason }
      });
    }

    // 5. ✅ CAPACITÉ SOIGNEUR
    if (npc.properties?.healer || npc.type === 'healer') {
      capabilities.push({
        type: 'healer',
        priority: this.priorityConfig.default_priorities.healer,
        urgent: false,
        label: "💊 Soigner les Pokémon",
        icon: "heal",
        description: "Soigner votre équipe Pokémon"
      });
    }

    // 6. ✅ CAPACITÉ DRESSEUR
    if (npc.trainerId || npc.type === 'trainer') {
      capabilities.push({
        type: 'trainer',
        priority: this.priorityConfig.default_priorities.trainer,
        urgent: false,
        label: "⚔️ Combattre",
        icon: "battle",
        description: "Défier ce dresseur au combat"
      });
    }

    // 7. ✅ CAPACITÉ DIALOGUE
    if (npc.dialogueIds || npc.properties?.dialogue || capabilities.length === 0) {
      capabilities.push({
        type: 'dialogue',
        priority: this.priorityConfig.default_priorities.dialogue,
        urgent: false,
        label: "💬 Parler",
        icon: "chat",
        description: "Discuter avec ce personnage"
      });
    }

    // ✅ ANALYSE FINALE
    const sortedCapabilities = capabilities.sort((a, b) => a.priority - b.priority);
    const urgentCapability = capabilities.find(c => c.urgent);
    
    return {
      npcId,
      npcName: npc.name,
      totalCapabilities: capabilities.length,
      capabilities: sortedCapabilities,
      hasUrgentCapabilities: !!urgentCapability,
      urgentCapability,
      requiresChoice: capabilities.length > 1 && !urgentCapability,
      defaultCapability: sortedCapabilities[0]
    };
  }

  // ✅ CRÉATION INTERFACE DE CHOIX

  private createChoiceInterface(analysis: NpcCapabilitiesAnalysis): ChoiceInterfaceResult {
    return {
      success: true,
      type: "choice_interface",
      message: `Que voulez-vous faire avec ${analysis.npcName} ?`,
      choiceData: {
        npcId: analysis.npcId,
        npcName: analysis.npcName,
        capabilities: analysis.capabilities.map(cap => ({
          id: cap.type,
          label: cap.label,
          icon: cap.icon,
          description: cap.description
        })),
        timeoutSeconds: this.priorityConfig.choice_timeout_seconds
      }
    };
  }

  // ✅ TRAITEMENT D'UN CHOIX SPÉCIFIQUE

  private async handleSpecificChoice(
    player: Player, 
    npc: any, 
    npcId: number, 
    choiceId: string
  ): Promise<NpcInteractionResult> {
    
    this.log('info', `🎯 Traitement choix: ${choiceId}`);

    // Re-analyser pour obtenir la capacité choisie
    const capabilities = await this.analyzeNpcCapabilities(player, npc, npcId);
    const chosenCapability = capabilities.capabilities.find(c => c.type === choiceId);

    if (!chosenCapability) {
      return {
        success: false,
        type: "error",
        message: "Choix invalide ou capacité non disponible.",
        npcId,
        npcName: npc.name
      };
    }

    return await this.executeCapability(player, npc, npcId, chosenCapability);
  }

  // ✅ EXÉCUTION D'UNE CAPACITÉ SPÉCIFIQUE

  private async executeCapability(
    player: Player, 
    npc: any, 
    npcId: number, 
    capability: NpcCapability
  ): Promise<NpcInteractionResult> {
    
    this.log('info', `⚡ Exécution capacité: ${capability.type}`, {
      label: capability.label,
      urgent: capability.urgent
    });

    switch (capability.type) {
      
      case 'merchant':
        // Déléguer au MerchantHandler
        const merchantResult = await this.merchantHandler.handle(player, npc, npcId);
        const questProgress = await this.getQuestProgressSafe(player.name, npcId);
        return { ...merchantResult, questProgress };

      case 'quest_completer':
        return await this.handleQuestCompletion(player, npc, npcId, capability.data.quests);

      case 'quest_giver':
        return await this.handleQuestOffer(player, npc, npcId, capability.data.quests);

      case 'starter':
        return await this.handleStarterTableInteraction(player, npc, npcId);

      case 'healer':
        return await this.handleHealerInteraction(player, npc, npcId);

      case 'trainer':
        return await this.handleTrainerInteraction(player, npc, npcId);

      case 'dialogue':
      default:
        return await this.handleDialogueInteraction(player, npc, npcId);
    }
  }

  // ✅ HANDLERS SPÉCIALISÉS PAR CAPACITÉ

  private async handleQuestCompletion(
    player: Player, 
    npc: any, 
    npcId: number, 
    quests: any[]
  ): Promise<NpcInteractionResult> {
    
    this.log('info', `✅ Finalisation ${quests.length} quête(s)`);

    const completionResults = [];
    for (const quest of quests) {
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
      const questDefinition = this.questManager.getQuestDefinition(completionResults[0].questId);
      const completionDialogue = this.getQuestDialogue(questDefinition, 'questComplete');
      
      return {
        success: true,
        type: "questComplete",
        questId: completionResults[0].questId,
        questName: questNames,
        questRewards: totalRewards,
        npcId: npcId,
        npcName: npc.name,
        lines: completionDialogue,
        message: `Félicitations ! Vous avez terminé : ${questNames}`
      };
    }

    return {
      success: false,
      type: "error",
      message: "Impossible de finaliser les quêtes",
      npcId,
      npcName: npc.name
    };
  }

  private async handleQuestOffer(
    player: Player, 
    npc: any, 
    npcId: number, 
    quests: any[]
  ): Promise<NpcInteractionResult> {
    
    this.log('info', `🎯 Proposition ${quests.length} quête(s)`);

    const firstQuest = quests[0];
    const questOfferDialogue = this.getQuestDialogue(firstQuest, 'questOffer');
    
    const serializedQuests = quests.map(quest => ({
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
      npcId: npcId,
      npcName: npc.name
    };
  }

  private async handleHealerInteraction(
    player: Player, 
    npc: any, 
    npcId: number
  ): Promise<NpcInteractionResult> {
    
    // TODO: Implémenter handler Healer spécialisé
    this.log('info', '💊 Soins Pokémon (implémentation basique)');
    
    return {
      success: true,
      type: "heal",
      message: "Vos Pokémon sont soignés !",
      npcId: npcId,
      npcName: npc.name,
      lines: [
        "Laissez-moi soigner vos Pokémon !",
        "Voilà ! Ils sont en pleine forme !"
      ]
    };
  }

  private async handleTrainerInteraction(
    player: Player, 
    npc: any, 
    npcId: number
  ): Promise<NpcInteractionResult> {
    
    // TODO: Implémenter handler Trainer spécialisé
    this.log('info', '⚔️ Combat dresseur (implémentation basique)');
    
    return {
      success: true,
      type: "trainer",
      message: "Prêt pour un combat ?",
      npcId: npcId,
      npcName: npc.name,
      lines: [
        "Hé ! Tu veux te battre ?",
        "Allez, montrons nos Pokémon !"
      ]
    };
  }

  private async handleDialogueInteraction(
    player: Player, 
    npc: any, 
    npcId: number
  ): Promise<NpcInteractionResult> {
    
    this.log('info', '💬 Dialogue standard');
    
    const lines = this.getDialogueLines(npc);
    const questProgress = await this.getQuestProgressSafe(player.name, npcId);
    
    return {
      success: true,
      type: "dialogue",
      lines,
      npcId: npcId,
      npcName: npc.name,
      questProgress
    };
  }

  // ✅ MÉTHODES UTILITAIRES (CODE EXISTANT CONSERVÉ) ===

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

  // Support JSON + Tiled pour dialogues
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

  // Récupération quest progress safe
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

      return readyQuests;
    } catch (error) {
      this.log('error', 'Erreur getReadyToCompleteQuestsForNpc', error);
      return [];
    }
  }

  // ✅ LOGIQUE LEGACY (conservée pour fallback)
  private async handleLegacyNpcInteraction(player: Player, npc: any, npcId: number): Promise<NpcInteractionResult> {
    // Code existant conservé...
    this.log('info', '⚠️ Fallback vers logique legacy');

    const questProgress = await this.getQuestProgressSafe(player.name, npcId);

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
    } else {
      const lines = this.getDialogueLines(npc);
      return { 
        success: true,
        type: "dialogue", 
        lines,
        npcId: npcId,
        npcName: npc.name,
        questProgress: questProgress
      };
    }
  }

  // === MÉTHODES PUBLIQUES EXISTANTES (CONSERVÉES) ===

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
    // Code existant conservé...
    this.log('info', 'Transaction shop via MerchantHandler si possible');

    try {
      const npcManager = this.getNpcManager(player.currentZone);
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
      this.log('warn', 'Erreur délégation MerchantHandler, fallback vers logique legacy', error);
    }

    // Fallback logique existante
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
      
      return { ...result, dialogues: undefined };
      
    } else if (action === 'sell') {
      const result = await this.shopManager.sellItem(
        player.name,
        shopId, 
        itemId, 
        quantity
      );
      
      return { ...result, dialogues: undefined };
    }

    return {
      success: false,
      message: "Action non reconnue",
      dialogues: undefined
    };
  }

  async handleQuestStart(username: string, questId: string): Promise<{ success: boolean; message: string; quest?: any }> {
    // Code existant conservé...
    try {
      this.log('info', 'Démarrage quête', { username, questId });
      
      const quest = await this.questManager.startQuest(username, questId);
      if (quest) {
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

  async handlePlayerInteraction(
    spectatorPlayer: Player, 
    targetPlayerId: string,
    targetPlayerPosition: { x: number; y: number; mapId: string }
  ): Promise<NpcInteractionResult> {
    // Code existant conservé...
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

  // ✅ NOUVELLES MÉTHODES D'ADMINISTRATION MULTI-FONCTIONNELLES

  getMultiFunctionalStats(): any {
    return {
      module: this.getStats(),
      priorityConfig: this.priorityConfig,
      handlers: {
        merchant: this.merchantHandler?.getStats(),
        // TODO: autres handlers stats
      },
      supportedCapabilities: [
        'merchant',
        'quest_giver', 
        'quest_completer',
        'healer',
        'trainer', 
        'starter',
        'dialogue'
      ]
    };
  }

  setPriorityConfig(newConfig: Partial<typeof this.priorityConfig>): void {
    this.priorityConfig = { ...this.priorityConfig, ...newConfig };
    this.log('info', '🔧 Configuration priorités mise à jour', this.priorityConfig);
  }

  async debugNpcCapabilities(zoneName: string, npcId: number): Promise<NpcCapabilitiesAnalysis | null> {
    try {
      const npcManager = this.getNpcManager(zoneName);
      if (!npcManager) return null;

      const npc = npcManager.getNpcById(npcId);
      if (!npc) return null;

      // Mock player pour analyse
      const mockPlayer = { name: 'DEBUG', currentZone: zoneName } as Player;
      const analysis = await this.analyzeNpcCapabilities(mockPlayer, npc, npcId);
      
      console.log(`🔍 [DEBUG] Analyse NPC ${npcId}:`, analysis);
      return analysis;
    } catch (error) {
      this.log('error', 'Erreur debug capabilities', error);
      return null;
    }
  }
}
