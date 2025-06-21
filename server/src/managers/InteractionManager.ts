// server/src/managers/InteractionManager.ts - VERSION COMPLÈTE AVEC SHOP

import { QuestManager } from "./QuestManager";
import { ShopManager } from "./ShopManager"; // ✅ IMPORT SHOP
import { Player } from "../schema/PokeWorldState";

export interface NpcInteractionResult {
  type: string;
  message?: string;
  shopId?: string;
  shopData?: any; // ✅ NOUVEAU : Données du shop
  lines?: string[];
  availableQuests?: any[];
  questRewards?: any[];
  questProgress?: any[];
  npcId?: number;
  npcName?: string;
  questId?: string;
  questName?: string;
}

export class InteractionManager {
  private getNpcManager: (zoneName: string) => any;
  private questManager: QuestManager;
  private shopManager: ShopManager; // ✅ NOUVEAU MANAGER

  constructor(
    getNpcManager: (zoneName: string) => any, 
    questManager: QuestManager,
    shopManager: ShopManager // ✅ NOUVEAU PARAMÈTRE
  ) {
    this.getNpcManager = getNpcManager;
    this.questManager = questManager;
    this.shopManager = shopManager; // ✅ INITIALISATION
  }

  async handleNpcInteraction(player: Player, npcId: number): Promise<NpcInteractionResult> {
    console.log(`🔍 === INTERACTION MANAGER ===`);
    console.log(`👤 Player: ${player.name}`);
    console.log(`🤖 NPC ID: ${npcId}`);
    
    // Récupérer le NPC
    const npcManager = this.getNpcManager(player.currentZone);
    if (!npcManager) {
      return { type: "error", message: "NPCs non disponibles dans cette zone." };
    }

    const npc = npcManager.getNpcById(npcId);
    if (!npc) {
      return { type: "error", message: "NPC inconnu." };
    }

    console.log(`🔍 NPC trouvé: ${npc.name}, propriétés:`, npc.properties);

    // Vérifier la proximité (64px)
    const dx = Math.abs(player.x - npc.x);
    const dy = Math.abs(player.y - npc.y);
    if (dx > 64 || dy > 64) {
      return { type: "error", message: "Trop loin du NPC." };
    }

    // ✅ === NOUVEAU : VÉRIFIER SI C'EST UN MARCHAND ===
    if (npc.properties.npcType === 'merchant' || npc.properties.shopId) {
      console.log(`🏪 NPC Marchand détecté`);
      return await this.handleMerchantInteraction(player, npc, npcId);
    }

    // ✅ === LOGIQUE EXISTANTE : VÉRIFIER D'ABORD LES OBJECTIFS TALK ===
    
    const talkValidationResult = await this.checkTalkObjectiveValidation(player.name, npcId);
    if (talkValidationResult) {
      console.log(`💬 Objectif talk validé pour NPC ${npcId} - ARRÊT DU FLOW`);
      return talkValidationResult;
    }

    // ✅ === PROGRESSION NORMALE (sans validation talk) ===
    
    console.log(`💬 Déclenchement updateQuestProgress pour talk avec NPC ${npcId}`);
    
    let questProgress: any[] = [];
    try {
      questProgress = await this.questManager.updateQuestProgress(player.name, {
        type: 'talk',
        npcId: npcId,
        targetId: npcId.toString()
      });
      console.log(`📊 Résultats progression quêtes:`, questProgress);
    } catch (error) {
      console.error(`❌ Erreur lors de updateQuestProgress:`, error);
    }

    // ✅ === VÉRIFIER LES QUÊTES APRÈS PROGRESSION ===
    
    // 1. Vérifier les quêtes prêtes à compléter manuellement
    const readyToCompleteQuests = await this.getReadyToCompleteQuestsForNpc(player.name, npcId);
    
    if (readyToCompleteQuests.length > 0) {
      console.log(`🎉 Quêtes prêtes à compléter: ${readyToCompleteQuests.length}`);
      
      // Utiliser le dialogue de completion de la première quête
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

    // 2. Vérifier les quêtes disponibles
    const availableQuests = await this.getAvailableQuestsForNpc(player.name, npcId);
    
    if (availableQuests.length > 0) {
      console.log(`📋 Quêtes disponibles: ${availableQuests.length}`);
      
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
        type: "questGiver",
        message: questOfferDialogue.join(' '),
        lines: questOfferDialogue,
        availableQuests: serializedQuests,
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name
      };
    }

    // 3. Vérifier les quêtes en cours
    const activeQuests = await this.questManager.getActiveQuests(player.name);
    const questsForThisNpc = activeQuests.filter(q => 
      q.startNpcId === npcId || q.endNpcId === npcId
    );

    if (questsForThisNpc.length > 0) {
      console.log(`📈 Quêtes en cours pour ce NPC: ${questsForThisNpc.length}`);
      
      const firstQuest = questsForThisNpc[0];
      const questDefinition = this.questManager.getQuestDefinition(firstQuest.id);
      const progressDialogue = this.getQuestDialogue(questDefinition, 'questInProgress');
      
      return {
        type: "dialogue",
        lines: progressDialogue,
        npcId: npcId,
        npcName: npc.name,
        questProgress: questProgress
      };
    }

    // ✅ === COMPORTEMENT NPC NORMAL ===
    
    console.log(`💬 Aucune quête, dialogue normal`);

    // Types d'interaction classiques selon les propriétés du NPC
    if (npc.properties.shop) {
      return { 
        type: "shop", 
        shopId: npc.properties.shop,
        npcId: npcId,
        npcName: npc.name,
        questProgress: questProgress
      };
    } else if (npc.properties.healer) {
      return { 
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
        type: "dialogue", 
        lines,
        npcId: npcId,
        npcName: npc.name,
        questProgress: questProgress
      };
    } else {
      // Dialogue par défaut
      const defaultDialogue = await this.getDefaultDialogueForNpc(npc);
      return { 
        type: "dialogue", 
        lines: defaultDialogue,
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name
      };
    }
  }

  // ✅ === NOUVELLE MÉTHODE : GESTION DES MARCHANDS ===
  private async handleMerchantInteraction(player: Player, npc: any, npcId: number): Promise<NpcInteractionResult> {
    console.log(`🏪 === INTERACTION MARCHAND ===`);
    
    // Récupérer le shop ID depuis les propriétés du NPC
    const shopId = npc.properties.shopId || npc.properties.shop;
    
    if (!shopId) {
      console.error(`❌ NPC marchand ${npcId} sans shopId`);
      return {
        type: "error",
        message: "Ce marchand n'a pas de boutique configurée."
      };
    }

    // Récupérer les données du shop
    const shopCatalog = this.shopManager.getShopCatalog(shopId, player.level || 1);
    
    if (!shopCatalog) {
      console.error(`❌ Shop ${shopId} introuvable`);
      return {
        type: "error",
        message: "Boutique indisponible."
      };
    }

    console.log(`✅ Shop ${shopId} chargé: ${shopCatalog.availableItems.length} objets disponibles`);

    // TODO: Récupérer l'argent du joueur depuis la base de données
    const playerGold = player.gold || 1000; // Valeur temporaire

    return {
      type: "shop",
      shopId: shopId,
      shopData: {
        shopInfo: shopCatalog.shopInfo,
        items: shopCatalog.availableItems,
        playerGold: playerGold,
        playerLevel: player.level || 1
      },
      npcId: npcId,
      npcName: npc.name,
      message: `Bienvenue dans ${shopCatalog.shopInfo.name} !`
    };
  }

  // ✅ === NOUVELLE MÉTHODE : TRANSACTIONS SHOP ===
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
    console.log(`💰 === TRANSACTION SHOP ===`);
    console.log(`👤 Player: ${player.name}, Shop: ${shopId}, Action: ${action}, Item: ${itemId}, Qty: ${quantity}`);

    // TODO: Récupérer l'argent et l'inventaire du joueur depuis la DB
    const playerGold = player.gold || 1000;
    const playerLevel = player.level || 1;

    if (action === 'buy') {
      const result = await this.shopManager.buyItem(shopId, itemId, quantity, playerGold, playerLevel);
      
      if (result.success) {
        // TODO: Mettre à jour l'argent du joueur dans la DB
        // TODO: Ajouter l'objet à l'inventaire du joueur
        console.log(`✅ Achat réussi: ${quantity}x ${itemId}`);
      }
      
      return result;
      
    } else if (action === 'sell') {
      // TODO: Vérifier la quantité possédée par le joueur
      const playerHasQuantity = 10; // Valeur temporaire
      
      const result = await this.shopManager.sellItem(shopId, itemId, quantity, playerHasQuantity);
      
      if (result.success) {
        // TODO: Mettre à jour l'argent du joueur dans la DB
        // TODO: Retirer l'objet de l'inventaire du joueur
        console.log(`✅ Vente réussie: ${quantity}x ${itemId}`);
      }
      
      return result;
    }

    return {
      success: false,
      message: "Action non reconnue"
    };
  }

  // ✅ === MÉTHODE EXISTANTE : Vérifier validation objectif talk ===
  private async checkTalkObjectiveValidation(username: string, npcId: number): Promise<NpcInteractionResult | null> {
    try {
      const activeQuests = await this.questManager.getActiveQuests(username);
      console.log(`🔍 [checkTalkObjective] Quêtes actives: ${activeQuests.length}`);
      
      for (const quest of activeQuests) {
        const currentStep = quest.steps[quest.currentStepIndex];
        if (!currentStep) continue;
        
        console.log(`🔍 [checkTalkObjective] Quête: ${quest.name}, étape: ${quest.currentStepIndex}`);
        console.log(`🔍 [checkTalkObjective] Objectifs de l'étape:`, currentStep.objectives.map(obj => ({
          id: obj.id,
          type: obj.type,
          target: obj.target,
          completed: obj.completed
        })));
        
        // Chercher des objectifs talk pour ce NPC dans l'étape COURANTE
        for (const objective of currentStep.objectives) {
          console.log(`🔍 [checkTalkObjective] Vérification objectif: ${objective.id}`);
          console.log(`🔍 [checkTalkObjective] Type: ${objective.type}, Target: ${objective.target}, NpcId: ${npcId}, Completed: ${objective.completed}`);
          
          if (objective.type === 'talk' && 
              objective.target === npcId.toString() && 
              !objective.completed) {
            
            console.log(`🎯 [checkTalkObjective] MATCH ! Objectif talk trouvé: ${objective.description}`);
            
            // Déclencher la progression
            const progressResults = await this.questManager.updateQuestProgress(username, {
              type: 'talk',
              npcId: npcId,
              targetId: npcId.toString()
            });
            
            console.log(`📊 [checkTalkObjective] Résultats progression:`, progressResults);
            
            if (progressResults.length > 0) {
              const result = progressResults[0];
              console.log(`📊 [checkTalkObjective] Résultat principal:`, result);
              
              // ✅ CORRECTION: Vérifier si l'objectif OU l'étape ont été complétés
              if (result.objectiveCompleted || result.stepCompleted) {
                const validationDialogue = (objective as any).validationDialogue || [
                  "Parfait ! Merci de m'avoir parlé !",
                  "C'était exactement ce qu'il fallait faire."
                ];
                
                console.log(`✅ [checkTalkObjective] Objectif/Étape complété(e) ! Dialogue de validation:`, validationDialogue);
                
                return {
                  type: "dialogue",
                  lines: validationDialogue,
                  npcId: npcId,
                  npcName: await this.getNpcName(npcId),
                  questProgress: progressResults,
                  message: result.message
                };
              } else {
                console.log(`⏳ [checkTalkObjective] Progression enregistrée mais objectif pas encore complété`);
                return null;
              }
            } else {
              console.log(`❌ [checkTalkObjective] Aucun résultat de progression`);
              return null;
            }
          }
        }
      }
      
      console.log(`❌ [checkTalkObjective] Aucun objectif talk à valider dans l'étape courante`);
      return null;
      
    } catch (error) {
      console.error(`❌ Erreur checkTalkObjectiveValidation:`, error);
      return null;
    }
  }

  // ✅ === MÉTHODE EXISTANTE : Récupérer dialogue de quête ===
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

  // ✅ === MÉTHODE HELPER : Récupérer nom NPC ===
  private async getNpcName(npcId: number): Promise<string> {
    const npcNames: { [key: number]: string } = {
      1: "Professeur Oak",
      87: "Bob le pêcheur", 
      5: "Le collecteur de baies",
      10: "Le maître dresseur"
    };
    
    return npcNames[npcId] || `NPC #${npcId}`;
  }

  // ✅ === MÉTHODES HELPER EXISTANTES ===

  private async getAvailableQuestsForNpc(username: string, npcId: number): Promise<any[]> {
    try {
      const questsForNpc = this.questManager.getQuestsForNpc(npcId);
      const availableQuests = await this.questManager.getAvailableQuests(username);
      
      console.log(`🔍 Quêtes pour NPC ${npcId}:`, questsForNpc.length);
      console.log(`🔍 Quêtes disponibles pour ${username}:`, availableQuests.length);
      
      const result = availableQuests.filter(quest => 
        questsForNpc.some(npcQuest => 
          npcQuest.id === quest.id && npcQuest.startNpcId === npcId
        )
      );
      
      console.log(`🔍 Quêtes filtrées pour NPC ${npcId}:`, result.length);
      return result;
    } catch (error) {
      console.error(`❌ Erreur getAvailableQuestsForNpc:`, error);
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

      console.log(`🎉 Quêtes prêtes à compléter pour NPC ${npcId}:`, readyQuests.length);
      return readyQuests;
    } catch (error) {
      console.error(`❌ Erreur getReadyToCompleteQuestsForNpc:`, error);
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
    
    if (npc.properties?.shop) {
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

  // ✅ === MÉTHODES POUR LES QUÊTES ===

  async handleQuestStart(username: string, questId: string): Promise<{ success: boolean; message: string; quest?: any }> {
    try {
      console.log(`🎯 Tentative de démarrage de quête ${questId} pour ${username}`);
      
      const quest = await this.questManager.startQuest(username, questId);
      if (quest) {
        console.log(`✅ Quête ${questId} démarrée avec succès pour ${username}`);
        return {
          success: true,
          message: `Quête "${quest.name}" acceptée !`,
          quest: quest
        };
      } else {
        console.log(`❌ Impossible de démarrer la quête ${questId} pour ${username}`);
        return {
          success: false,
          message: "Impossible de commencer cette quête."
        };
      }
    } catch (error) {
      console.error("❌ Erreur lors du démarrage de quête:", error);
      return {
        success: false,
        message: `Erreur lors du démarrage de la quête: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  async updatePlayerProgress(username: string, eventType: string, data: any): Promise<any[]> {
    try {
      switch (eventType) {
        case 'collect':
          return await this.questManager.updateQuestProgress(username, {
            type: 'collect',
            targetId: data.itemId,
            amount: data.amount || 1
          });

        case 'defeat':
          return await this.questManager.updateQuestProgress(username, {
            type: 'defeat',
            pokemonId: data.pokemonId,
            amount: 1
          });

        case 'reach':
          return await this.questManager.updateQuestProgress(username, {
            type: 'reach',
            targetId: data.zoneId,
            location: { x: data.x, y: data.y, map: data.map }
          });

        case 'deliver':
          return await this.questManager.updateQuestProgress(username, {
            type: 'deliver',
            npcId: data.npcId,
            targetId: data.targetId
          });

        default:
          return [];
      }
    } catch (error) {
      console.error("❌ Erreur mise à jour progression:", error);
      return [];
    }
  }

  async getQuestStatuses(username: string): Promise<any[]> {
    try {
      const availableQuests = await this.questManager.getAvailableQuests(username);
      const activeQuests = await this.questManager.getActiveQuests(username);
      
      const questStatuses: any[] = [];
      
      // Statuts pour les quêtes disponibles
      for (const quest of availableQuests) {
        if (quest.startNpcId) {
          questStatuses.push({
            npcId: quest.startNpcId,
            type: 'questAvailable'
          });
        }
      }
      
      // Statuts pour les quêtes actives
      for (const quest of activeQuests) {
        if (quest.status === 'readyToComplete' && quest.endNpcId) {
          questStatuses.push({
            npcId: quest.endNpcId,
            type: 'questReadyToComplete'
          });
        }
        else if (quest.endNpcId) {
          questStatuses.push({
            npcId: quest.endNpcId,
            type: 'questInProgress'
          });
        }
      }
      
      return questStatuses;
    } catch (error) {
      console.error("❌ Erreur getQuestStatuses:", error);
      return [];
    }
  }
}
