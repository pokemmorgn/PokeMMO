// server/src/managers/InteractionManager.ts - VERSION CORRIGÉE

import { NpcManager, NpcData } from "./NPCManager";
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
}

// Interface pour typer les étapes de quête
interface QuestStep {
  id: string;
  name: string;
  description: string;
  objectives: any[];
  rewards: any[];
}

// Interface pour typer les quêtes
interface Quest {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: QuestStep[];
}

export class InteractionManager {
  private npcManager: NpcManager;
  private questManager: QuestManager;

  constructor(npcManager: NpcManager, questManager: QuestManager) {
    this.npcManager = npcManager;
    this.questManager = questManager;
  }

  async handleNpcInteraction(player: Player, npcId: number): Promise<NpcInteractionResult> {
    console.log(`🔍 DEBUG: Interactionnnn avec NPC ${npcId} par ${player.name}`);
    
    const npc: NpcData | undefined = this.npcManager.getNpcById(npcId);
    if (!npc) {
      return { type: "error", message: "NPC inconnu." };
    }

    console.log(`🔍 DEBUG: NPC trouvé: ${npc.name}, propriétés:`, npc.properties);

    // Vérifie la proximité (par exemple 64px)
    const dx = Math.abs(player.x - npc.x);
    const dy = Math.abs(player.y - npc.y);
    if (dx > 64 || dy > 64) {
      return { type: "error", message: "Trop loin du NPC." };
    }

    // === GESTION DES QUÊTES ===
    
    // ✅ FIX 1: Amélioration de la progression des quêtes
    let questProgress: any[] = [];
    try {
      questProgress = await this.questManager.updateQuestProgress(player.name, {
        type: 'talk',
        npcId: npcId
      });
      console.log(`🔍 DEBUG: Progression quêtes:`, questProgress);
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour de progression:`, error);
    }

    // ✅ FIX 2: Vérification des quêtes disponibles améliorée
    const availableQuests = await this.getAvailableQuestsForNpc(player.name, npcId);
    console.log(`🔍 DEBUG: Quêtes disponibles pour NPC ${npcId}:`, availableQuests);
    
    // ✅ FIX 3: Vérification des quêtes à rendre améliorée
    const completableQuests = await this.getCompletableQuestsForNpc(player.name, npcId);
    console.log(`🔍 DEBUG: Quêtes à rendre pour NPC ${npcId}:`, completableQuests);

    // === PRIORITÉ AUX QUÊTES ===
    
    // Si il y a des quêtes à rendre, priorité à ça
    if (completableQuests.length > 0) {
      console.log(`✅ DEBUG: Retourne questComplete`);
      return {
        type: "questComplete",
        message: "Félicitations ! Vous avez terminé une quête !",
        questRewards: completableQuests,
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name
      };
    }

    // Si il y a des quêtes disponibles, les proposer
    if (availableQuests.length > 0) {
      console.log(`✅ DEBUG: Retourne questGiver`);
      
      // ✅ FIX 4: Sérialisation correcte des quêtes disponibles avec typage
      const serializedQuests = (availableQuests as Quest[]).map(quest => ({
        id: quest.id,
        name: quest.name,
        description: quest.description,
        category: quest.category,
        steps: quest.steps.map((step: QuestStep) => ({
          id: step.id,
          name: step.name,
          description: step.description,
          objectives: step.objectives,
          rewards: step.rewards
        }))
      }));

      return {
        type: "questGiver",
        message: "J'ai quelque chose pour vous...",
        availableQuests: serializedQuests,
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name
      };
    }

    // Si il y a eu des progressions de quête, les mentionner
    if (questProgress.length > 0) {
      const progressMessages = questProgress.map(p => p.message).filter(Boolean);
      if (progressMessages.length > 0) {
        console.log(`✅ DEBUG: Retourne questProgress`);
        return {
          type: "questProgress",
          message: progressMessages.join("\n"),
          questProgress: questProgress,
          npcId: npcId,
          npcName: npc.name
        };
      }
    }

    console.log(`⚠️ DEBUG: Aucune quête, retourne comportement normal`);

    // === COMPORTEMENT NPC NORMAL ===
    
    // Types d'interaction classiques selon les propriétés du NPC
    if (npc.properties.shop) {
      return { 
        type: "shop", 
        shopId: npc.properties.shop,
        npcId: npcId,
        npcName: npc.name
      };
    } else if (npc.properties.healer) {
      return { 
        type: "heal", 
        message: "Vos Pokémon sont soignés !",
        npcId: npcId,
        npcName: npc.name
      };
    } else if (npc.properties.dialogue) {
      // Dialogue peut être string ou tableau de strings
      const lines = Array.isArray(npc.properties.dialogue)
        ? npc.properties.dialogue
        : [npc.properties.dialogue];
      return { 
        type: "dialogue", 
        lines,
        npcId: npcId,
        npcName: npc.name
      };
    } else {
      // Dialogue par défaut avec mention des quêtes s'il y en avait
      let defaultMessage = "Bonjour !";
      if (questProgress.length > 0) {
        defaultMessage += " (Progression de quête mise à jour)";
      }
      return { 
        type: "dialogue", 
        lines: [defaultMessage],
        questProgress: questProgress,
        npcId: npcId,
        npcName: npc.name
      };
    }
  }

  // ✅ FIX 5: Amélioration de la récupération des quêtes disponibles
  private async getAvailableQuestsForNpc(username: string, npcId: number): Promise<any[]> {
    try {
      const questsForNpc = this.questManager.getQuestsForNpc(npcId);
      const availableQuests = await this.questManager.getAvailableQuests(username);
      
      console.log(`🔍 Quêtes pour NPC ${npcId}:`, questsForNpc.length);
      console.log(`🔍 Quêtes disponibles pour ${username}:`, availableQuests.length);
      
      // Filtrer les quêtes disponibles qui peuvent être données par ce NPC
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

  // ✅ FIX 6: Amélioration de la récupération des quêtes à terminer
  private async getCompletableQuestsForNpc(username: string, npcId: number): Promise<any[]> {
    try {
      const activeQuests = await this.questManager.getActiveQuests(username);
      
      console.log(`🔍 Quêtes actives pour ${username}:`, activeQuests.length);
      
      // Filtrer les quêtes actives qui peuvent être rendues à ce NPC
      const completableQuests = activeQuests.filter(quest => {
        // Vérifier si c'est le bon NPC pour rendre la quête
        if (quest.endNpcId !== npcId) return false;
        
        // Vérifier si la quête est terminée
        const isQuestComplete = quest.currentStepIndex >= quest.steps.length;
        
        if (isQuestComplete) {
          console.log(`🎉 Quête ${quest.id} est complète et peut être rendue à NPC ${npcId}`);
          return true;
        }
        
        // Vérifier si l'étape actuelle est complète
        const currentStep = quest.steps[quest.currentStepIndex];
        if (currentStep) {
          const allObjectivesCompleted = currentStep.objectives.every(obj => obj.completed);
          if (allObjectivesCompleted) {
            console.log(`📋 Étape actuelle de la quête ${quest.id} est complète`);
            return true;
          }
        }
        
        return false;
      });

      console.log(`🔍 Quêtes complétables pour NPC ${npcId}:`, completableQuests.length);
      return completableQuests;
    } catch (error) {
      console.error(`❌ Erreur getCompletableQuestsForNpc:`, error);
      return [];
    }
  }

  // === MÉTHODES UTILITAIRES POUR LES QUÊTES ===

  // ✅ FIX 7: Amélioration du démarrage de quête
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

  async handleQuestComplete(username: string, questId: string): Promise<{ success: boolean; message: string; rewards?: any[] }> {
    try {
      // Cette méthode serait appelée depuis le QuestManager
      // Pour l'instant, on peut juste renvoyer un message de succès
      return {
        success: true,
        message: "Quête terminée avec succès !",
        rewards: [] // Les récompenses seraient gérées par le QuestManager
      };
    } catch (error) {
      console.error("❌ Erreur lors de la completion de quête:", error);
      return {
        success: false,
        message: "Erreur lors de la completion de la quête."
      };
    }
  }

  // === MÉTHODES POUR PROGRESSION AUTOMATIQUE ===

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

  // ✅ FIX 8: Nouvelle méthode pour obtenir les statuts de quête pour un joueur
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
        if (quest.currentStepIndex >= quest.steps.length && quest.endNpcId) {
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
