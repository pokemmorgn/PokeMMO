// src/interactions/modules/NpcInteractionModule.ts
// Module de gestion des interactions avec les NPCs - Migration du code existant

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
  readonly version = "1.0.0";

  // === DÉPENDANCES (injectées depuis InteractionManager existant) ===
  private getNpcManager: (zoneName: string) => any;
  private questManager: QuestManager;
  private shopManager: ShopManager;
  private starterHandlers: StarterHandlers;
  private spectatorManager: SpectatorManager;

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

    this.log('info', 'Module NPC initialisé avec toutes les dépendances');
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

      // === LOGIQUE MIGRÉE DE L'INTERACTIONMANAGER EXISTANT ===
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

  // === LOGIQUE MÉTIER NPCs (CODE EXISTANT MIGRÉ) ===

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

    this.log('info', `NPC trouvé: ${npc.name}`, { properties: npc.properties });

    // === LOGIQUE DE PRIORITÉ EXISTANTE ===

    // 1. Vérifier si c'est un marchand
    if (npc.properties.npcType === 'merchant' || npc.properties.shopId) {
      this.log('info', 'NPC Marchand détecté');
      return await this.handleMerchantInteraction(player, npc, npcId);
    }

    // 2. Vérifier si c'est une table starter
    if (npc.properties.startertable === true || npc.properties.startertable === 'true') {
      this.log('info', 'Table starter détectée');
      return await this.handleStarterTableInteraction(player, npc, npcId);
    }

    // 3. Vérifier d'abord les objectifs talk
    const talkValidationResult = await this.checkTalkObjectiveValidation(player.name, npcId);
    if (talkValidationResult) {
      this.log('info', `Objectif talk validé pour NPC ${npcId}`);
      return talkValidationResult;
    }

    // 4. Progression normale des quêtes
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

    // 5. Vérifier les quêtes prêtes à compléter
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

    // 6. Vérifier les quêtes disponibles
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

    // 7. Vérifier les quêtes en cours
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

    // 8. Comportement NPC normal
    this.log('info', 'Aucune quête, dialogue normal');

    if (npc.properties.shop) {
      return { 
        success: true,
        type: "shop", 
        shopId: npc.properties.shop,
        npcId: npcId,
        npcName: npc.name,
        questProgress: questProgress
      };
    } else if (npc.properties.healer) {
      return { 
        success: true,
        type: "heal", 
        message: "Vos Pokémon sont soignés !",
        npcId: npcId,
        npcName: npc.name,
        questProgress: questProgress
      };
    } else if (npc.properties.dialogue) {
      const lines = Array.isArray(npc.properties.dialogue)
        ? npc.properties.dialogue
        : [npc.properties.dialogue];
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

  // === MÉTHODES SPÉCIALISÉES (CODE EXISTANT MIGRÉ) ===

  private async handleMerchantInteraction(player: Player, npc: any, npcId: number): Promise<NpcInteractionResult> {
    this.log('info', 'Traitement interaction marchand');
    
    const shopId = npc.properties.shopId || npc.properties.shop;
    
    if (!shopId) {
      this.log('error', `NPC marchand ${npcId} sans shopId`);
      return {
        success: false,
        type: "error",
        message: "Ce marchand n'a pas de boutique configurée."
      };
    }

    const shopCatalog = this.shopManager.getShopCatalog(shopId, player.level || 1);
    
    if (!shopCatalog) {
      this.log('error', `Shop ${shopId} introuvable`);
      return {
        success: false,
        type: "error",
        message: "Boutique indisponible."
      };
    }

    this.log('info', `Shop ${shopId} chargé`, { itemCount: shopCatalog.availableItems.length });

    return {
      success: true,
      type: "shop",
      shopId: shopId,
      shopData: {
        shopInfo: shopCatalog.shopInfo,
        availableItems: shopCatalog.availableItems,
        playerGold: player.gold || 1000,
        playerLevel: player.level || 1,
        npcName: npc.name || "Marchand"
      },
      npcId: npcId,
      npcName: npc.name,
      message: `Bienvenue dans ${shopCatalog.shopInfo.name} !`
    };
  }

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

  // === MÉTHODES UTILITAIRES (CODE EXISTANT MIGRÉ) ===

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
    
    if (npc.properties?.shop || npc.properties?.shopId || npc.properties?.npcType === 'merchant') {
      return [
        `Bienvenue dans ma boutique !`,
        `Regardez mes marchandises !`
      ];
    }
    
    if (npc.properties?.healer) {
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

  // === MÉTHODES PUBLIQUES POUR TRANSACTIONS SHOP ===

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

  // === MÉTHODES PUBLIQUES POUR QUÊTES ===

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

  // === MÉTHODES PUBLIQUES POUR SPECTATEURS ===

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
}
