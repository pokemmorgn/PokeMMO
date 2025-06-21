// server/src/managers/InteractionManager.ts - VERSION COMPLÈTE CORRIGÉE

import { QuestManager } from "./QuestManager";
import { Player } from "../schema/PokeWorldState";

export interface NpcInteractionResult {
  type: string;
  message?: string;
  shopId?: string;
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

  constructor(getNpcManager: (zoneName: string) => any, questManager: QuestManager) {
    this.getNpcManager = getNpcManager;
    this.questManager = questManager;
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

    // ✅ === NOUVELLE LOGIQUE : VÉRIFIER D'ABORD LES OBJECTIFS TALK ===
    
    const talkValidationResult = await this.checkTalkObjectiveValidation(player.name, npcId);
    if (talkValidationResult) {
      console.log(`💬 Objectif talk validé pour NPC ${npcId}`);
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
          lines: completionDialogue, // ✅ NOUVEAU: Dialogue spécifique
          message: `Félicitations ! Vous avez terminé : ${questNames}`
        };
      }
    }

    // 2. Vérifier les quêtes disponibles
    const availableQuests = await this.getAvailableQuestsForNpc(player.name, npcId);
    
    if (availableQuests.length > 0) {
      console.log(`📋 Quêtes disponibles: ${availableQuests.length}`);
      
      // ✅ NOUVEAU: Utiliser le dialogue d'offre de la première quête
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
        message: questOfferDialogue.join(' '), // ✅ NOUVEAU: Message d'offre
        lines: questOfferDialogue, // ✅ NOUVEAU: Dialogue complet
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
      
      // ✅ NOUVEAU: Utiliser le dialogue de progression de la quête
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

  // ✅ === NOUVELLE MÉTHODE: Vérifier validation objectif talk ===
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
              !objective.completed) { // ✅ SEULEMENT les objectifs non complétés
            
            console.log(`🎯 [checkTalkObjective] MATCH ! Objectif talk trouvé: ${objective.description}`);
            
            // Déclencher la progression
            const progressResults = await this.questManager.updateQuestProgress(username, {
              type: 'talk',
              npcId: npcId,
              targetId: npcId.toString()
            });
            
            if (progressResults.length > 0) {
              const result = progressResults[0];
              console.log(`📊 [checkTalkObjective] Résultat progression:`, result);
              
              // Si l'objectif a été complété, utiliser le dialogue de validation
              if (result.objectiveCompleted) {
                const validationDialogue = (objective as any).validationDialogue || [
                  "Merci de m'avoir parlé !",
                  "C'était exactement ce qu'il fallait faire."
                ];
                
                console.log(`✅ [checkTalkObjective] Objectif complété ! Dialogue de validation:`, validationDialogue);
                
                return {
                  type: "dialogue",
                  lines: validationDialogue,
                  npcId: npcId,
                  npcName: await this.getNpcName(npcId),
                  questProgress: progressResults,
                  message: result.message
                };
              }
            }
          } else {
            console.log(`❌ [checkTalkObjective] Pas de match pour objectif ${objective.id}`);
          }
        }
      }
      
      console.log(`❌ [checkTalkObjective] Aucun objectif talk à valider dans l'étape courante`);
      return null; // Aucun objectif talk à valider dans l'étape courante
      
    } catch (error) {
      console.error(`❌ Erreur checkTalkObjectiveValidation:`, error);
      return null;
    }
  }

  // ✅ === NOUVELLE MÉTHODE: Récupérer dialogue de quête ===
  private getQuestDialogue(questDefinition: any, dialogueType: 'questOffer' | 'questInProgress' | 'questComplete'): string[] {
    if (!questDefinition?.dialogues?.[dialogueType]) {
      // Dialogues par défaut selon le type
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

  // ✅ === MÉTHODE HELPER: Récupérer nom NPC ===
  private async getNpcName(npcId: number): Promise<string> {
    // TODO: Récupérer depuis le NPCManager si besoin
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

  // ✅ NOUVELLE MÉTHODE : Récupérer les quêtes prêtes à compléter manuellement
  private async getReadyToCompleteQuestsForNpc(username: string, npcId: number): Promise<any[]> {
    try {
      const activeQuests = await this.questManager.getActiveQuests(username);
      
      const readyQuests = activeQuests.filter(quest => {
        // Vérifier si c'est le bon NPC pour rendre la quête
        if (quest.endNpcId !== npcId) return false;
        
        // Vérifier si la quête est marquée comme prête à compléter
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
    // 1. Vérifier si le NPC a un dialogueId
    if (npc.properties?.dialogueId) {
      const dialogues = await this.getDialogueById(npc.properties.dialogueId);
      if (dialogues.length > 0) {
        return dialogues;
      }
    }
    
    // 2. Dialogue par défaut basé sur le type de NPC
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
    
    // 3. Dialogue générique par défaut
    return [
      `Bonjour ! Je suis ${npc.name}.`,
      `Belle journée pour une aventure !`
    ];
  }

  private async getDialogueById(dialogueId: string): Promise<string[]> {
    // TODO: Charger depuis un fichier JSON ou base de données
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
        // Quête prête à être rendue
        if (quest.status === 'readyToComplete' && quest.endNpcId) {
          questStatuses.push({
            npcId: quest.endNpcId,
            type: 'questReadyToComplete'
          });
        }
        // Quête en cours avec des objectifs
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
