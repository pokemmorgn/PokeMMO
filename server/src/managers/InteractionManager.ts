// server/src/managers/InteractionManager.ts - Version améliorée avec quêtes

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
}

export class InteractionManager {
  private npcManager: NpcManager;
  private questManager: QuestManager;

  constructor(npcManager: NpcManager, questManager: QuestManager) {
    this.npcManager = npcManager;
    this.questManager = questManager;
  }

  async handleNpcInteraction(player: Player, npcId: number): Promise<NpcInteractionResult> {
    console.log(`🔍 DEBUG: Interaction avec NPC ${npcId} par ${player.name}`);
    
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
    
    // Mettre à jour la progression des quêtes (parler à ce NPC)
    const questProgress = await this.questManager.updateQuestProgress(player.name, {
      type: 'talk',
      npcId: npcId
    });

    console.log(`🔍 DEBUG: Progression quêtes:`, questProgress);

    // Vérifier les quêtes disponibles pour ce NPC
    const availableQuests = await this.getAvailableQuestsForNpc(player.name, npcId);
    console.log(`🔍 DEBUG: Quêtes disponibles pour NPC ${npcId}:`, availableQuests);
    
    // Vérifier les quêtes à rendre auprès de ce NPC
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
        questProgress: questProgress
      };
    }

    // Si il y a des quêtes disponibles, les proposer
    if (availableQuests.length > 0) {
      console.log(`✅ DEBUG: Retourne questGiver`);
      return {
        type: "questGiver",
        message: "J'ai quelque chose pour vous...",
        availableQuests: availableQuests,
        questProgress: questProgress
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
          questProgress: questProgress
        };
      }
    }

    console.log(`⚠️ DEBUG: Aucune quête, retourne comportement normal`);

    // === COMPORTEMENT NPC NORMAL ===
    
    // Types d'interaction classiques selon les propriétés du NPC
    if (npc.properties.shop) {
      return { type: "shop", shopId: npc.properties.shop };
    } else if (npc.properties.healer) {
      return { type: "heal", message: "Vos Pokémon sont soignés !" };
    } else if (npc.properties.dialogue) {
      // Dialogue peut être string ou tableau de strings
      const lines = Array.isArray(npc.properties.dialogue)
        ? npc.properties.dialogue
        : [npc.properties.dialogue];
      return { type: "dialogue", lines };
    } else {
      // Dialogue par défaut avec mention des quêtes s'il y en avait
      let defaultMessage = "Bonjour !";
      if (questProgress.length > 0) {
        defaultMessage += " (Progression de quête mise à jour)";
      }
      return { 
        type: "dialogue", 
        lines: [defaultMessage],
        questProgress: questProgress
      };
    }
  }

  private async getAvailableQuestsForNpc(username: string, npcId: number): Promise<any[]> {
    const questsForNpc = this.questManager.getQuestsForNpc(npcId);
    const availableQuests = await this.questManager.getAvailableQuests(username);
    
    // Filtrer les quêtes disponibles qui peuvent être données par ce NPC
    return availableQuests.filter(quest => 
      questsForNpc.some(npcQuest => 
        npcQuest.id === quest.id && npcQuest.startNpcId === npcId
      )
    );
  }

  private async getCompletableQuestsForNpc(username: string, npcId: number): Promise<any[]> {
    const activeQuests = await this.questManager.getActiveQuests(username);
    
    // Filtrer les quêtes actives qui peuvent être rendues à ce NPC
    const completableQuests = activeQuests.filter(quest => {
      // Vérifier si c'est le bon NPC pour rendre la quête
      if (quest.endNpcId !== npcId) return false;
      
      // Vérifier si la quête est terminée
      const currentStep = quest.steps[quest.currentStepIndex];
      if (!currentStep) {
        // Si on a dépassé toutes les étapes, la quête est complète
        return quest.currentStepIndex >= quest.steps.length;
      }
      
      return false;
    });

    return completableQuests;
  }

  // === MÉTHODES UTILITAIRES POUR LES QUÊTES ===

  async handleQuestStart(username: string, questId: string): Promise<{ success: boolean; message: string; quest?: any }> {
    try {
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
      console.error("❌ Erreur lors du démarrage de quête:", error);
      return {
        success: false,
        message: "Erreur lors du démarrage de la quête."
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
   }
