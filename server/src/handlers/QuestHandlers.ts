// server/src/handlers/QuestHandlers.ts
import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { ServiceRegistry } from "../services/ServiceRegistry";

export class QuestHandlers {
  private room: WorldRoom;

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🎯 === QUEST HANDLERS INIT ===`);
  }

  setupHandlers() {
    console.log(`📨 Setup Quest handlers...`);

    // ✅ Handler pour progression des quêtes d'intro
    this.room.onMessage("progressIntroQuest", async (client: Client, data: { step: string }) => {
      await this.handleProgressIntroQuest(client, data.step);
    });

    // ✅ Handler pour événements automatiques de quêtes
    this.room.onMessage("triggerQuestEvent", async (client: Client, data: { eventType: string, eventData: any }) => {
      await this.handleQuestEvent(client, data.eventType, data.eventData);
    });

    // ✅ Handler pour vérification de quêtes conditionnelles
    this.room.onMessage("checkQuestConditions", async (client: Client, data: { conditions: any }) => {
      await this.handleQuestConditions(client, data.conditions);
    });

    // ✅ Handler pour debug des quêtes (dev uniquement)
    this.room.onMessage("debugPlayerQuests", async (client: Client) => {
      await this.handleDebugQuests(client);
    });

    console.log(`✅ Quest handlers configurés`);
  }

  // ✅ === HANDLER PROGRESSION INTRO ===
  private async handleProgressIntroQuest(client: Client, step: string) {
    try {
      console.log(`🎬 [QuestHandlers] Progression intro quest: ${step}`);
      
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        console.warn(`⚠️ [QuestHandlers] Joueur non trouvé: ${client.sessionId}`);
        return;
      }

      // ✅ Utiliser le Service Registry
      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) {
        console.error(`❌ [QuestHandlers] QuestManager non disponible`);
        return;
      }

      // Conversion step → event de progression
      const progressEvent = this.convertStepToProgressEvent(step);
      if (!progressEvent) {
        console.warn(`⚠️ [QuestHandlers] Étape intro inconnue: ${step}`);
        return;
      }

      console.log(`📈 [QuestHandlers] Progression pour ${player.name}:`, progressEvent);

      // Faire progresser via QuestManager
      const result = await questManager.progressQuest(player.name, progressEvent);
      
      if (result.success && result.results.length > 0) {
        console.log(`✅ [QuestHandlers] Progression intro réussie pour ${player.name}`);
        
        // Vérifier si quête terminée
        for (const questResult of result.results) {
          if (questResult.questCompleted) {
            console.log(`🎉 [QuestHandlers] Quête d'intro terminée pour ${player.name}!`);
            
            // Envoyer notification spéciale de completion
            client.send("introQuestCompleted", {
              message: "Félicitations ! Votre aventure commence vraiment maintenant !",
              reward: "Vous avez débloqué de nouvelles fonctionnalités !",
              questName: questResult.questName
            });
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur handleProgressIntroQuest:`, error);
    }
  }

  // ✅ === HANDLER ÉVÉNEMENTS DE QUÊTES ===
  private async handleQuestEvent(client: Client, eventType: string, eventData: any) {
    try {
      console.log(`⚡ [QuestHandlers] Événement de quête: ${eventType}`, eventData);
      
      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;

      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) return;

      let progressEvent;

      switch (eventType) {
        case 'itemCollected':
          progressEvent = {
            type: 'collect',
            targetId: eventData.itemId,
            amount: eventData.quantity || 1
          };
          break;

        case 'pokemonDefeated':
          progressEvent = {
            type: 'defeat',
            pokemonId: eventData.pokemonId,
            amount: 1
          };
          break;

        case 'npcTalked':
          progressEvent = {
            type: 'talk',
            npcId: eventData.npcId,
            targetId: eventData.npcId.toString(),
            amount: 1
          };
          break;

        case 'areaReached':
          progressEvent = {
            type: 'reach',
            targetId: eventData.areaId,
            amount: 1
          };
          break;

        case 'itemDelivered':
          progressEvent = {
            type: 'deliver',
            npcId: eventData.npcId,
            targetId: eventData.itemId,
            amount: eventData.quantity || 1
          };
          break;

        default:
          console.warn(`⚠️ [QuestHandlers] Type d'événement inconnu: ${eventType}`);
          return;
      }

      // Faire progresser toutes les quêtes concernées
      const result = await questManager.progressQuest(player.name, progressEvent);
      
      if (result.success && result.results.length > 0) {
        console.log(`✅ [QuestHandlers] ${result.results.length} quête(s) progressée(s) pour ${player.name}`);
        
        // Envoyer les mises à jour au client
        client.send("questProgressUpdate", result.results);
      }
      
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur handleQuestEvent:`, error);
    }
  }

  // ✅ === HANDLER CONDITIONS DE QUÊTES ===
  private async handleQuestConditions(client: Client, conditions: any) {
    try {
      console.log(`🔍 [QuestHandlers] Vérification conditions:`, conditions);
      
      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;

      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) return;

      // Vérifier les conditions (niveau, objets, quêtes complétées, etc.)
      const checks = [];

      if (conditions.level) {
        checks.push({
          type: 'level',
          required: conditions.level,
          current: player.level,
          met: player.level >= conditions.level
        });
      }

      if (conditions.completedQuests) {
        for (const questId of conditions.completedQuests) {
          const status = await questManager.checkQuestStatus(player.name, questId);
          checks.push({
            type: 'questCompleted',
            questId: questId,
            required: 'completed',
            current: status,
            met: status === 'completed'
          });
        }
      }

      if (conditions.items) {
        for (const item of conditions.items) {
          const hasItem = await this.room.playerHasItem(player.name, item.itemId, item.quantity);
          checks.push({
            type: 'item',
            itemId: item.itemId,
            required: item.quantity,
            met: hasItem
          });
        }
      }

      // Envoyer le résultat des vérifications
      client.send("questConditionsResult", {
        checks: checks,
        allMet: checks.every(check => check.met)
      });
      
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur handleQuestConditions:`, error);
    }
  }

  // ✅ === HANDLER DEBUG QUÊTES ===
  private async handleDebugQuests(client: Client) {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;

      console.log(`🐛 [QuestHandlers] Debug quêtes pour ${player.name}`);

      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) return;

      // Récupérer toutes les infos de quêtes
      const activeQuests = await questManager.getPlayerActiveQuests(player.name);
      const availableQuests = await questManager.getPlayerAvailableQuests(player.name);

      const debugInfo = {
        playerName: player.name,
        activeQuests: activeQuests.map(q => ({
          id: q.id,
          name: q.name,
          currentStep: q.currentStepIndex,
          status: q.status,
          objectives: q.steps[q.currentStepIndex]?.objectives || []
        })),
        availableQuests: availableQuests.map(q => ({
          id: q.id,
          name: q.name,
          category: q.category
        })),
        stats: {
          activeCount: activeQuests.length,
          availableCount: availableQuests.length
        }
      };

      console.log(`🐛 [QuestHandlers] Debug info:`, debugInfo);

      // Envoyer les infos de debug au client
      client.send("questDebugInfo", debugInfo);
      
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur handleDebugQuests:`, error);
    }
  }

  // ✅ === HELPERS ===

  private convertStepToProgressEvent(step: string): any | null {
    switch (step) {
      case 'intro_watched':
        return {
          type: 'reach',
          targetId: 'beach_intro_watched',
          amount: 1
        };

      case 'psyduck_talked':
        return {
          type: 'talk',
          npcId: 999,
          targetId: '999',
          amount: 1
        };

      case 'intro_completed':
        return {
          type: 'reach',
          targetId: 'intro_sequence_finished',
          amount: 1
        };

      default:
        return null;
    }
  }

  // ✅ === MÉTHODES PUBLIQUES POUR DÉCLENCHER DES ÉVÉNEMENTS ===

  /**
   * Déclenche un événement de quête depuis n'importe où dans le code
   */
  public async triggerQuestEvent(playerName: string, eventType: string, eventData: any): Promise<void> {
    try {
      console.log(`🎯 [QuestHandlers] Événement déclenché pour ${playerName}: ${eventType}`);

      // Trouver le client du joueur
      for (const [sessionId, player] of this.room.state.players) {
        if (player.name === playerName) {
          const client = this.room.clients.find(c => c.sessionId === sessionId);
          if (client) {
            await this.handleQuestEvent(client, eventType, eventData);
            return;
          }
        }
      }

      console.warn(`⚠️ [QuestHandlers] Client non trouvé pour ${playerName}`);
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur triggerQuestEvent:`, error);
    }
  }

  /**
   * Vérifie les conditions de quêtes pour un joueur
   */
  public async checkConditionsForPlayer(playerName: string, conditions: any): Promise<boolean> {
    try {
      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) return false;

      // Logique de vérification simplifiée
      if (conditions.completedQuests) {
        for (const questId of conditions.completedQuests) {
          const status = await questManager.checkQuestStatus(playerName, questId);
          if (status !== 'completed') return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur checkConditionsForPlayer:`, error);
      return false;
    }
  }

  /**
   * Nettoie les handlers
   */
  cleanup() {
    console.log(`🧹 [QuestHandlers] Nettoyage`);
    // Cleanup si nécessaire
  }
}
