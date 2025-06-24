// server/src/managers/InteractionManager.ts - VERSION COMPLÈTE AVEC SHOP CORRIGÉ

import { QuestManager } from "./QuestManager";
import { ShopManager } from "./ShopManager";
import { InventoryManager } from "./InventoryManager"; // ✅ NOUVEAU IMPORT
import { Player } from "../schema/PokeWorldState";

export interface NpcInteractionResult {
  type: string;
  message?: string;
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
}

export class InteractionManager {
  private getNpcManager: (zoneName: string) => any;
  private questManager: QuestManager;
  private shopManager: ShopManager;

  constructor(
    getNpcManager: (zoneName: string) => any, 
    questManager: QuestManager,
    shopManager: ShopManager
  ) {
    this.getNpcManager = getNpcManager;
    this.questManager = questManager;
    this.shopManager = shopManager;
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

    // ✅ === VÉRIFIER SI C'EST UN MARCHAND ===
    if (npc.properties.npcType === 'merchant' || npc.properties.shopId) {
      console.log(`🏪 NPC Marchand détecté`);
      return await this.handleMerchantInteraction(player, npc, npcId);
    }

    // === LOGIQUE EXISTANTE : VÉRIFIER D'ABORD LES OBJECTIFS TALK ===
    
    const talkValidationResult = await this.checkTalkObjectiveValidation(player.name, npcId);
    if (talkValidationResult) {
      console.log(`💬 Objectif talk validé pour NPC ${npcId} - ARRÊT DU FLOW`);
      return talkValidationResult;
    }

    // === PROGRESSION NORMALE (sans validation talk) ===
    
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

    // === VÉRIFIER LES QUÊTES APRÈS PROGRESSION ===
    
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

    // === COMPORTEMENT NPC NORMAL ===
    
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

  // ✅ === MÉTHODE MARCHAND CORRIGÉE AVEC INVENTAIRE ===
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

    return {
      type: "shop",
      shopId: shopId,
      shopData: {
        shopInfo: shopCatalog.shopInfo,
        availableItems: shopCatalog.availableItems, // ✅ CORRECTION: utiliser availableItems
        playerGold: player.gold || 1000,
        playerLevel: player.level || 1,
        npcName: npc.name || "Marchand" // ✅ AJOUT DU NOM
      },
      npcId: npcId,
      npcName: npc.name,
      message: `Bienvenue dans ${shopCatalog.shopInfo.name} !`
    };
  }

  // ✅ === MÉTHODE TRANSACTIONS SHOP CORRIGÉE AVEC INVENTAIRE ===
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

    const playerGold = player.gold || 1000;
    const playerLevel = player.level || 1;

    if (action === 'buy') {
      // ✅ UTILISER LE SHOPMANAGER CORRIGÉ AVEC USERNAME
      const result = await this.shopManager.buyItem(
        player.name, // ✅ USERNAME REQUIS
        shopId, 
        itemId, 
        quantity, 
        playerGold, 
        playerLevel
      );
      
      if (result.success) {
        console.log(`✅ Achat réussi: ${quantity}x ${itemId} pour ${player.name}`);
        console.log(`💰 Nouvel or: ${result.newGold}`);
        
        // ✅ L'objet a déjà été ajouté à l'inventaire par ShopManager.buyItem()
        // ✅ L'or sera mis à jour par le WorldRoom
      }
      
      return result;
      
    } else if (action === 'sell') {
      // ✅ UTILISER LE SHOPMANAGER CORRIGÉ AVEC USERNAME
      const result = await this.shopManager.sellItem(
        player.name, // ✅ USERNAME REQUIS
        shopId, 
        itemId, 
        quantity
      );
      
      if (result.success) {
        console.log(`✅ Vente réussie: ${quantity}x ${itemId} par ${player.name}`);
        console.log(`💰 Or gagné: ${result.newGold}`);
        
        // ✅ L'objet a déjà été retiré de l'inventaire par ShopManager.sellItem()
        // ✅ L'or sera mis à jour par le WorldRoom
      }
      
      return result;
    }

    return {
      success: false,
      message: "Action non reconnue"
    };
  }

  // === MÉTHODE EXISTANTE : Vérifier validation objectif talk ===
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
              
              // Vérifier si l'objectif OU l'étape ont été complétés
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

  // === MÉTHODE EXISTANTE : Récupérer dialogue de quête ===
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

  // === MÉTHODE HELPER : Récupérer nom NPC ===
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

  // === MÉTHODES HELPER EXISTANTES ===

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
      ],
      'merchant_general': [
        "Que puis-je faire pour vous aujourd'hui ?",
        "J'ai les meilleurs produits de la région !"
      ]
    };
    
    return dialogueMap[dialogueId] || [];
  }

  // === MÉTHODES POUR LES QUÊTES ===

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

  // ✅ === NOUVELLES MÉTHODES UTILITAIRES POUR L'INVENTAIRE ===

  async giveItemToPlayer(username: string, itemId: string, quantity: number = 1): Promise<boolean> {
    try {
      await InventoryManager.addItem(username, itemId, quantity);
      console.log(`✅ [InteractionManager] Donné ${quantity}x ${itemId} à ${username}`);
      return true;
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur lors du don d'objet:`, error);
      return false;
    }
  }

  async takeItemFromPlayer(username: string, itemId: string, quantity: number = 1): Promise<boolean> {
    try {
      const success = await InventoryManager.removeItem(username, itemId, quantity);
      if (success) {
        console.log(`✅ [InteractionManager] Retiré ${quantity}x ${itemId} à ${username}`);
      }
      return success;
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur lors du retrait d'objet:`, error);
      return false;
    }
  }

  async playerHasItem(username: string, itemId: string, quantity: number = 1): Promise<boolean> {
    try {
      const count = await InventoryManager.getItemCount(username, itemId);
      return count >= quantity;
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur lors de la vérification d'objet:`, error);
      return false;
    }
  }

  // ✅ === MÉTHODES POUR L'INTÉGRATION SHOP-QUEST ===

  async canAffordItem(username: string, shopId: string, itemId: string, quantity: number = 1): Promise<{
    canAfford: boolean;
    playerGold: number;
    totalCost: number;
    reason?: string;
  }> {
    try {
      // TODO: Récupérer l'or du joueur depuis PlayerData
      const playerGold = 1000; // Temporaire
      const totalCost = this.shopManager.getItemBuyPrice(shopId, itemId) * quantity;
      
      return {
        canAfford: playerGold >= totalCost,
        playerGold: playerGold,
        totalCost: totalCost,
        reason: playerGold < totalCost ? "Pas assez d'argent" : undefined
      };
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur canAffordItem:`, error);
      return {
        canAfford: false,
        playerGold: 0,
        totalCost: 0,
        reason: "Erreur lors de la vérification"
      };
    }
  }

  // ✅ === MÉTHODES POUR LES RÉCOMPENSES DE QUÊTE ===

  async giveQuestReward(username: string, reward: {
    type: 'item' | 'gold' | 'experience';
    itemId?: string;
    amount: number;
  }): Promise<boolean> {
    try {
      switch (reward.type) {
        case 'item':
          if (reward.itemId) {
            return await this.giveItemToPlayer(username, reward.itemId, reward.amount);
          }
          return false;

        case 'gold':
          // TODO: Ajouter l'or au joueur via PlayerDataManager
          console.log(`💰 [InteractionManager] Donner ${reward.amount} or à ${username} (non implémenté)`);
          return true;

        case 'experience':
          // TODO: Ajouter l'expérience au joueur
          console.log(`⭐ [InteractionManager] Donner ${reward.amount} XP à ${username} (non implémenté)`);
          return true;

        default:
          console.warn(`⚠️ [InteractionManager] Type de récompense inconnu: ${reward.type}`);
          return false;
      }
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur giveQuestReward:`, error);
      return false;
    }
  }

  // ✅ === MÉTHODES POUR LES ÉVÉNEMENTS DE QUÊTE ===

  async triggerQuestEvent(username: string, eventType: string, data: any): Promise<any[]> {
    try {
      console.log(`🎯 [InteractionManager] Déclenchement événement quête: ${eventType} pour ${username}`, data);
      
      const results = await this.updatePlayerProgress(username, eventType, data);
      
      if (results.length > 0) {
        console.log(`📊 [InteractionManager] Événement traité: ${results.length} résultats`);
      }
      
      return results;
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur triggerQuestEvent:`, error);
      return [];
    }
  }

  // ✅ === MÉTHODES POUR LA VALIDATION DES PRÉREQUIS ===

  async validateQuestPrerequisites(username: string, questId: string): Promise<{
    canStart: boolean;
    missingRequirements: string[];
  }> {
    try {
      const questDefinition = this.questManager.getQuestDefinition(questId);
      if (!questDefinition) {
        return {
          canStart: false,
          missingRequirements: ["Quête introuvable"]
        };
      }

      const missingRequirements: string[] = [];

      // Vérifier les prérequis d'objets
      if (questDefinition.prerequisites?.items) {
        for (const itemReq of questDefinition.prerequisites.items) {
          const hasItem = await this.playerHasItem(username, itemReq.itemId, itemReq.quantity || 1);
          if (!hasItem) {
            missingRequirements.push(`${itemReq.quantity || 1}x ${itemReq.itemId}`);
          }
        }
      }

      // Vérifier les prérequis de niveau
      if (questDefinition.prerequisites?.level) {
        // TODO: Vérifier le niveau du joueur
        console.log(`🔍 [InteractionManager] Vérification niveau requis: ${questDefinition.prerequisites.level} (non implémenté)`);
      }

      // Vérifier les quêtes prérequises
      if (questDefinition.prerequisites?.completedQuests) {
        const activeQuests = await this.questManager.getActiveQuests(username);
        const completedQuests = await this.questManager.getCompletedQuests(username);
        
        for (const requiredQuestId of questDefinition.prerequisites.completedQuests) {
          const isCompleted = completedQuests.some(q => q.id === requiredQuestId);
          if (!isCompleted) {
            const questDef = this.questManager.getQuestDefinition(requiredQuestId);
            missingRequirements.push(`Quête prérequise: ${questDef?.name || requiredQuestId}`);
          }
        }
      }

      return {
        canStart: missingRequirements.length === 0,
        missingRequirements: missingRequirements
      };
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur validateQuestPrerequisites:`, error);
      return {
        canStart: false,
        missingRequirements: ["Erreur lors de la validation"]
      };
    }
  }

  // ✅ === MÉTHODES POUR LES ACHATS CONDITIONNELS ===

  async handleConditionalPurchase(username: string, shopId: string, itemId: string, conditions: {
    requireQuest?: string;
    requireItem?: { itemId: string; quantity: number };
    requireLevel?: number;
  }): Promise<{
    canPurchase: boolean;
    reason?: string;
  }> {
    try {
      // Vérifier si une quête est requise
      if (conditions.requireQuest) {
        const completedQuests = await this.questManager.getCompletedQuests(username);
        const hasCompletedQuest = completedQuests.some(q => q.id === conditions.requireQuest);
        
        if (!hasCompletedQuest) {
          const questDef = this.questManager.getQuestDefinition(conditions.requireQuest!);
          return {
            canPurchase: false,
            reason: `Quête requise: ${questDef?.name || conditions.requireQuest}`
          };
        }
      }

      // Vérifier si un objet est requis
      if (conditions.requireItem) {
        const hasItem = await this.playerHasItem(
          username, 
          conditions.requireItem.itemId, 
          conditions.requireItem.quantity
        );
        
        if (!hasItem) {
          return {
            canPurchase: false,
            reason: `Objet requis: ${conditions.requireItem.quantity}x ${conditions.requireItem.itemId}`
          };
        }
      }

      // Vérifier le niveau
      if (conditions.requireLevel) {
        // TODO: Vérifier le niveau du joueur
        console.log(`🔍 [InteractionManager] Vérification niveau requis pour achat: ${conditions.requireLevel} (non implémenté)`);
      }

      return { canPurchase: true };
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur handleConditionalPurchase:`, error);
      return {
        canPurchase: false,
        reason: "Erreur lors de la vérification des conditions"
      };
    }
  }

  // ✅ === MÉTHODES POUR LES DIALOGUES DYNAMIQUES ===

  async getDynamicDialogue(npcId: number, username: string): Promise<string[]> {
    try {
      // Récupérer les quêtes actives du joueur
      const activeQuests = await this.questManager.getActiveQuests(username);
      const completedQuests = await this.questManager.getCompletedQuests(username);

      // Dialogue basé sur les quêtes actives
      const questsForNpc = activeQuests.filter(q => q.startNpcId === npcId || q.endNpcId === npcId);
      
      if (questsForNpc.length > 0) {
        const quest = questsForNpc[0];
        const questDef = this.questManager.getQuestDefinition(quest.id);
        
        if (quest.status === 'readyToComplete') {
          return questDef?.dialogues?.questComplete || [
            "Excellent travail !",
            "Vous avez accompli votre mission avec brio !"
          ];
        } else {
          return questDef?.dialogues?.questInProgress || [
            "Comment avance votre mission ?",
            "Courage, vous y êtes presque !"
          ];
        }
      }

      // Dialogue basé sur les quêtes terminées
      const completedQuestsForNpc = completedQuests.filter(q => q.startNpcId === npcId || q.endNpcId === npcId);
      
      if (completedQuestsForNpc.length > 0) {
        return [
          "Merci encore pour votre aide !",
          "Grâce à vous, tout va mieux maintenant."
        ];
      }

      // Dialogue par défaut
      return await this.getDefaultDialogueForNpc({ id: npcId, name: await this.getNpcName(npcId) });
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur getDynamicDialogue:`, error);
      return ["Bonjour !", "Belle journée, n'est-ce pas ?"];
    }
  }

  // ✅ === MÉTHODES DE DEBUG ET UTILITAIRES ===

  async debugPlayerProgress(username: string): Promise<{
    activeQuests: any[];
    completedQuests: any[];
    inventoryStats: {
      totalItems: number;
      pockets: { [key: string]: number };
    };
    shopAccess: { [shopId: string]: boolean };
  }> {
    try {
      console.log(`🔍 [InteractionManager] Debug pour ${username}`);

      const activeQuests = await this.questManager.getActiveQuests(username);
      const completedQuests = await this.questManager.getCompletedQuests(username);

      // Statistiques d'inventaire
      const inventoryData = await InventoryManager.getAllItemsGroupedByPocket(username);
      const inventoryStats = {
        totalItems: 0,
        pockets: {} as { [key: string]: number }
      };

      for (const [pocket, items] of Object.entries(inventoryData)) {
        const pocketCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        inventoryStats.pockets[pocket] = pocketCount;
        inventoryStats.totalItems += pocketCount;
      }

      // Accès aux shops (exemple)
      const shopAccess = {
        'village_general_store': true,
        'lavandiashop': completedQuests.some(q => q.id === 'tutorial_quest'),
        'secret_shop': completedQuests.length >= 3
      };

      const debugInfo = {
        activeQuests: activeQuests.map(q => ({
          id: q.id,
          name: q.name,
          status: q.status,
          currentStep: q.currentStepIndex,
          totalSteps: q.steps?.length || 0
        })),
        completedQuests: completedQuests.map(q => ({
          id: q.id,
          name: q.name,
          completedAt: q.completedAt
        })),
        inventoryStats,
        shopAccess
      };

      console.log(`📊 [InteractionManager] Debug info:`, debugInfo);
      return debugInfo;
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur debugPlayerProgress:`, error);
      return {
        activeQuests: [],
        completedQuests: [],
        inventoryStats: { totalItems: 0, pockets: {} },
        shopAccess: {}
      };
    }
  }

  // ✅ === MÉTHODES D'EXPORT POUR L'INTÉGRATION ===

  getShopManager(): ShopManager {
    return this.shopManager;
  }

  getQuestManager(): QuestManager {
    return this.questManager;
  }

  // ✅ === MÉTHODES POUR LES ÉVÉNEMENTS SPÉCIAUX ===

  async handleSpecialEvent(username: string, eventType: string, eventData: any): Promise<{
    success: boolean;
    message: string;
    rewards?: any[];
  }> {
    try {
      console.log(`🎊 [InteractionManager] Événement spécial: ${eventType} pour ${username}`, eventData);

      switch (eventType) {
        case 'daily_bonus':
          // Bonus quotidien
          await this.giveItemToPlayer(username, 'potion', 1);
          return {
            success: true,
            message: "Bonus quotidien reçu !",
            rewards: [{ type: 'item', itemId: 'potion', amount: 1 }]
          };

        case 'lottery_win':
          // Gain de loterie
          const prize = eventData.prize || 'rare_candy';
          await this.giveItemToPlayer(username, prize, 1);
          return {
            success: true,
            message: `Félicitations ! Vous avez gagné : ${prize}`,
            rewards: [{ type: 'item', itemId: prize, amount: 1 }]
          };

        case 'achievement_unlock':
          // Déblocage d'achievement
          const achievementReward = eventData.reward || { itemId: 'nugget', amount: 1 };
          await this.giveItemToPlayer(username, achievementReward.itemId, achievementReward.amount);
          return {
            success: true,
            message: `Achievement débloqué : ${eventData.achievementName}`,
            rewards: [{ type: 'item', itemId: achievementReward.itemId, amount: achievementReward.amount }]
          };

        default:
          console.warn(`⚠️ [InteractionManager] Événement spécial inconnu: ${eventType}`);
          return {
            success: false,
            message: "Événement non reconnu"
          };
      }
    } catch (error) {
      console.error(`❌ [InteractionManager] Erreur handleSpecialEvent:`, error);
      return {
        success: false,
        message: "Erreur lors du traitement de l'événement"
      };
    }
  }
}
