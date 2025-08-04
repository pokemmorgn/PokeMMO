// server/src/handlers/QuestHandlers.ts - CORRECTION DES CALLBACKS CLIENT
import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { ServiceRegistry } from "../services/ServiceRegistry";

export class QuestHandlers {
  private room: WorldRoom;

  constructor(room: WorldRoom) {
    this.room = room;
  }

  setupHandlers() {
    // ✅ CORRIGÉ : Handler acceptQuest avec callback client approprié
    this.room.onMessage("acceptQuest", async (client: Client, data: { questId: string, npcId: string | number, timestamp?: number }) => {
      await this.handleAcceptQuest(client, data);
    });

    // Autres handlers...
    this.room.onMessage("progressIntroQuest", async (client: Client, data: { step: string }) => {
      await this.handleProgressIntroQuest(client, data.step);
    });

    this.room.onMessage("intro_started", async (client: Client) => {
      await this.handleProgressIntroQuest(client, "intro_started");
    });
    
    this.room.onMessage("dialogue_completed", async (client: Client) => {
      await this.handleProgressIntroQuest(client, "dialogue_completed");
    });

    this.room.onMessage("intro_completed", async (client: Client) => {
      await this.handleProgressIntroQuest(client, "intro_completed");
    });

    this.room.onMessage("checkAutoIntroQuest", async (client: Client) => {
      await this.handleCheckAutoIntroQuest(client);
    });

    this.room.onMessage("clientIntroReady", (client: Client) => {
      this.handleCheckAutoIntroQuest(client);
    });

    this.room.onMessage("startQuest", async (client: Client, data: { questId: string }) => {
      await this.handleStartQuest(client, data);
    });

    this.room.onMessage("getActiveQuests", (client: Client) => {
      this.handleGetActiveQuests(client);
    });

    this.room.onMessage("getAvailableQuests", (client: Client) => {
      this.handleGetAvailableQuests(client);
    });

    this.room.onMessage("questProgress", async (client: Client, data: any) => {
      await this.handleQuestProgress(client, data);
    });

    this.room.onMessage("getQuestDetails", async (client: Client, data: { npcId: number, questId: string }) => {
      await this.handleGetQuestDetails(client, data);
    });

    // Debug handlers
    this.room.onMessage("debugQuests", (client: Client) => {
      this.handleDebugQuests(client);
    });

    this.room.onMessage("debugPlayerQuests", async (client: Client) => {
      await this.handleDebugPlayerQuests(client);
    });
  }

  // ✅ CORRIGÉ : handleAcceptQuest avec tous les callbacks nécessaires
  private async handleAcceptQuest(client: Client, data: { questId: string, npcId: string | number, timestamp?: number }) {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ [QuestHandlers] Joueur non trouvé pour session ${client.sessionId}`);
      client.send("questAcceptResult", {
        success: false,
        error: "Joueur non trouvé"
      });
      return;
    }

    try {
      console.log(`🎯 [QuestHandlers] Acceptation quête ${data.questId} par ${player.name} via NPC ${data.npcId}`);

      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) {
        throw new Error("QuestManager non disponible");
      }

      // Vérifier que la quête est disponible
      const questStatus = await questManager.checkQuestStatus(player.name, data.questId);
      console.log(`🔍 [QuestHandlers] Statut quête ${data.questId}: ${questStatus}`);
      
      if (questStatus !== 'available') {
        throw new Error(`Quête non disponible (statut: ${questStatus})`);
      }

      // Démarrer la quête
      const quest = await questManager.startQuest(player.name, data.questId);
      
      if (quest) {
        console.log(`✅ [QuestHandlers] Quête ${data.questId} démarrée avec succès`);
        
        // ✅ CALLBACK 1 : Résultat d'acceptation (pour QuestSystem)
        client.send("questAcceptResult", {
          success: true,
          questId: data.questId,
          quest: quest,
          message: `Quête "${quest.name}" acceptée !`
        });

        // ✅ CALLBACK 2 : Notification de démarrage (pour QuestSystem)
        client.send("quest_started", {
          questId: data.questId,
          questName: quest.name,
          description: quest.description,
          message: `Quête "${quest.name}" démarrée !`,
          data: {
            questInfo: quest,
            steps: quest.steps || []
          }
        });

        // ✅ CALLBACK 3 : Mettre à jour les statuts de quêtes (pour NPCs)
        await this.updateQuestStatuses(player.name, client);

        console.log(`✅ [QuestHandlers] Tous les callbacks envoyés pour ${data.questId}`);

      } else {
        throw new Error("Impossible de démarrer la quête");
      }

    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur acceptation quête ${data.questId}:`, error);
      
      // ✅ CALLBACK D'ERREUR
      client.send("questAcceptResult", {
        success: false,
        questId: data.questId,
        error: (error as Error).message || "Erreur lors de l'acceptation de la quête"
      });
    }
  }

  // ✅ Méthode updateQuestStatuses corrigée
  private async updateQuestStatuses(playerName: string, client?: Client) {
    try {
      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) {
        console.error(`❌ [QuestHandlers] QuestManager non disponible pour updateQuestStatuses`);
        return;
      }
      
      console.log(`🔄 [QuestHandlers] Mise à jour statuts quêtes pour ${playerName}`);
      
      const availableQuests = await questManager.getPlayerAvailableQuests(playerName);
      const activeQuests = await questManager.getPlayerActiveQuests(playerName);
      
      console.log(`📊 [QuestHandlers] ${availableQuests.length} disponibles, ${activeQuests.length} actives`);
      
      // Construire les statuts par NPC
      const npcQuestMap = new Map<number, any>();

      // Traiter les quêtes disponibles
      for (const quest of availableQuests) {
        if (quest.startNpcId) {
          if (!npcQuestMap.has(quest.startNpcId)) {
            npcQuestMap.set(quest.startNpcId, {
              npcId: quest.startNpcId,
              availableQuestIds: [],
              inProgressQuestIds: [],
              readyToCompleteQuestIds: []
            });
          }
          
          npcQuestMap.get(quest.startNpcId).availableQuestIds.push(quest.id);
        }
      }

      // Traiter les quêtes actives
      for (const quest of activeQuests) {
        if (quest.endNpcId) {
          if (!npcQuestMap.has(quest.endNpcId)) {
            npcQuestMap.set(quest.endNpcId, {
              npcId: quest.endNpcId,
              availableQuestIds: [],
              inProgressQuestIds: [],
              readyToCompleteQuestIds: []
            });
          }
          
          if (quest.status === 'readyToComplete') {
            npcQuestMap.get(quest.endNpcId).readyToCompleteQuestIds.push(quest.id);
          } else {
            npcQuestMap.get(quest.endNpcId).inProgressQuestIds.push(quest.id);
          }
        }
      }

      // Construire le message final
      const questStatuses: any[] = [];

      npcQuestMap.forEach((npcData) => {
        let finalType = null;
        
        if (npcData.readyToCompleteQuestIds.length > 0) {
          finalType = 'questReadyToComplete';
        } else if (npcData.availableQuestIds.length > 0) {
          finalType = 'questAvailable';
        } else if (npcData.inProgressQuestIds.length > 0) {
          finalType = 'questInProgress';
        }
        
        if (finalType) {
          questStatuses.push({
            npcId: npcData.npcId,
            type: finalType,
            availableQuestIds: npcData.availableQuestIds,
            inProgressQuestIds: npcData.inProgressQuestIds,
            readyToCompleteQuestIds: npcData.readyToCompleteQuestIds
          });
        }
      });
      
      if (questStatuses.length > 0) {
        console.log(`📤 [QuestHandlers] Envoi statuts pour ${questStatuses.length} NPCs`);
        
        if (client) {
          // Envoyer seulement au client spécifique
          client.send("questStatuses", { questStatuses });
        } else {
          // Broadcast à tous les clients (fallback)
          this.room.broadcast("questStatuses", { questStatuses });
        }
      } else {
        console.log(`ℹ️ [QuestHandlers] Aucun statut à mettre à jour`);
      }
      
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur updateQuestStatuses:`, error);
    }
  }

  // ✅ Handler getQuestDetails corrigé
  private async handleGetQuestDetails(client: Client, data: { npcId: number, questId: string }) {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      client.send("questDetailsResult", {
        success: false,
        error: "Joueur non trouvé"
      });
      return;
    }

    try {
      console.log(`📋 [QuestHandlers] Récupération détails quête ${data.questId} pour NPC ${data.npcId}`);

      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) {
        throw new Error("QuestManager non disponible");
      }

      // Récupérer les quêtes disponibles
      const availableQuests = await questManager.getPlayerAvailableQuests(player.name);
      const questDetails = availableQuests.find(q => q.id === data.questId);
      
      if (!questDetails) {
        // Vérifier si c'est une quête active
        const activeQuests = await questManager.getPlayerActiveQuests(player.name);
        const activeQuest = activeQuests.find(q => q.id === data.questId);
        
        if (!activeQuest) {
          throw new Error(`Quête ${data.questId} non trouvée`);
        }
        
        // Si c'est une quête active, renvoyer ses infos
        client.send("questDetailsResult", {
          success: true,
          questId: data.questId,
          npcId: data.npcId,
          questData: {
            id: activeQuest.id,
            name: activeQuest.name,
            description: activeQuest.description || "Quête en cours",
            rewards: activeQuest.rewards || [],
            requirements: activeQuest.requirements || {},
            canAccept: false,
            status: 'active'
          }
        });
        return;
      }

      // Vérifier si le joueur peut accepter
      const questStatus = await questManager.checkQuestStatus(player.name, data.questId);
      const canAccept = questStatus === 'available';

      console.log(`✅ [QuestHandlers] Détails quête ${data.questId} envoyés`);

      client.send("questDetailsResult", {
        success: true,
        questId: data.questId,
        npcId: data.npcId,
        questData: {
          id: questDetails.id,
          name: questDetails.name,
          description: questDetails.description || "Nouvelle quête disponible",
          rewards: questDetails.rewards || [],
          requirements: questDetails.requirements || {},
          canAccept: canAccept,
          status: questStatus
        }
      });

    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur getQuestDetails:`, error);
      client.send("questDetailsResult", {
        success: false,
        error: (error as Error).message || "Erreur lors de la récupération des détails"
      });
    }
  }

  // Autres méthodes inchangées...
  private async handleCheckAutoIntroQuest(client: Client) {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;

      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) return;

      const introQuestId = "beach_intro_quest";
      const questStatus = await questManager.checkQuestStatus(player.name, introQuestId);

      if (questStatus === 'available') {
        const result = await questManager.giveQuest(player.name, introQuestId);

        if (result.success) {
          setTimeout(() => {
            ServiceRegistry.getInstance().notifyPlayer(player.name, "triggerIntroSequence", {
              questId: introQuestId,
              questName: result.quest?.name || "Bienvenue à GreenRoot",
              message: "Bienvenue dans votre aventure !",
              shouldStartIntro: true
            });
          }, 1000);
        }
      } else if (questStatus === 'active') {
        const activeQuests = await questManager.getPlayerActiveQuests(player.name);
        const introQuest = activeQuests.find(q => q.id === introQuestId);

        if (introQuest && introQuest.steps.length > 0) {
          const firstStep = introQuest.steps[0];
          const hasSeenIntro = firstStep.objectives.some((obj: any) => obj.completed);

          if (!hasSeenIntro) {
            ServiceRegistry.getInstance().notifyPlayer(player.name, "triggerIntroSequence", {
              questId: introQuestId,
              questName: introQuest.name,
              message: "Continuons votre aventure !",
              shouldStartIntro: true
            });
          }
        }
      }

    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur handleCheckAutoIntroQuest:`, error);
    }
  }

  // Autres méthodes restent identiques...
  
  cleanup() {
    console.log(`🧹 [QuestHandlers] Nettoyage...`);
  }
}
