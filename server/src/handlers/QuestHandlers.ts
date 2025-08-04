// server/src/handlers/QuestHandlers.ts
import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { ServiceRegistry } from "../services/ServiceRegistry";

export class QuestHandlers {
  private room: WorldRoom;

  constructor(room: WorldRoom) {
    this.room = room;
  }

  setupHandlers() {
    // Handlers progression quêtes
    this.room.onMessage("progressIntroQuest", async (client: Client, data: { step: string }) => {
      await this.handleProgressIntroQuest(client, data.step);
    });

    // Handlers messages intro
    this.room.onMessage("intro_started", async (client: Client) => {
      await this.handleProgressIntroQuest(client, "intro_started");
    });

    this.room.onMessage("acceptQuest", async (client: Client, data: { questId: string, npcId: string | number, timestamp?: number }) => {
    await this.handleAcceptQuest(client, data);
    });
    
    this.room.onMessage("dialogue_completed", async (client: Client) => {
      await this.handleProgressIntroQuest(client, "dialogue_completed");
    });

    this.room.onMessage("intro_completed", async (client: Client) => {
      await this.handleProgressIntroQuest(client, "intro_completed");
    });

    // Handlers gestion automatique
    this.room.onMessage("checkAutoIntroQuest", async (client: Client) => {
      await this.handleCheckAutoIntroQuest(client);
    });

    this.room.onMessage("clientIntroReady", (client: Client) => {
      this.handleCheckAutoIntroQuest(client);
    });

    // Handlers classiques
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

    this.room.onMessage("debugQuests", (client: Client) => {
      this.handleDebugQuests(client);
    });

    this.room.onMessage("debugPlayerQuests", async (client: Client) => {
      await this.handleDebugPlayerQuests(client);
    });

    // Handlers événements automatiques
    this.room.onMessage("triggerQuestEvent", async (client: Client, data: { eventType: string, eventData: any }) => {
      await this.handleQuestEvent(client, data.eventType, data.eventData);
    });

    this.room.onMessage("checkQuestConditions", async (client: Client, data: { conditions: any }) => {
      await this.handleQuestConditions(client, data.conditions);
    });

    // ✅ NOUVEAU: Handler pour récupérer les détails d'une quête
    this.room.onMessage("getQuestDetails", async (client: Client, data: { npcId: number, questId: string }) => {
      await this.handleGetQuestDetails(client, data);
    });
  }

  // ✅ NOUVEAU: Handler pour récupérer les détails d'une quête
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
    const questManager = ServiceRegistry.getInstance().getQuestManager();
    if (!questManager) {
      throw new Error("QuestManager non disponible");
    }

    // ✅ CORRIGÉ : Utiliser les méthodes qui existent vraiment
    // Récupérer les quêtes disponibles pour voir si cette quête est dedans
    const availableQuests = await questManager.getPlayerAvailableQuests(player.name);
    const questDetails = availableQuests.find(q => q.id === data.questId);
    
    if (!questDetails) {
      // Peut-être que c'est une quête active ?
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
          canAccept: false, // Déjà en cours
          status: 'active'
        }
      });
      return;
    }

    // ✅ CORRIGÉ : Vérifier si le joueur peut accepter (logique simplifiée)
    const questStatus = await questManager.checkQuestStatus(player.name, data.questId);
    const canAccept = questStatus === 'available';

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
    client.send("questDetailsResult", {
      success: false,
      error: (error as Error).message || "Erreur lors de la récupération des détails"
    });
  }
}
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

  public async handleProgressIntroQuest(client: Client, step: string) {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;

      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) return;

      if (step === 'intro_started') {
        return;
      }

      const progressEvent = this.convertStepToProgressEvent(step);
      if (!progressEvent) return;

      const result = await questManager.progressQuest(player.name, progressEvent);
      
      if (result.success && result.results.length > 0) {
        for (const questResult of result.results) {
          if (questResult.questCompleted) {
            client.send("introQuestCompleted", {
              message: "Félicitations ! Votre aventure commence vraiment maintenant !",
              reward: "Vous avez débloqué de nouvelles fonctionnalités !",
              questName: questResult.questName
            });
          }
        }

        await this.updateQuestStatuses(player.name);
      }
      
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur handleProgressIntroQuest:`, error);
    }
  }

  private async handleAcceptQuest(client: Client, data: { questId: string, npcId: string | number, timestamp?: number }) {
  const player = this.room.state.players.get(client.sessionId);
  if (!player) {
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
    if (questStatus !== 'available') {
      throw new Error(`Quête non disponible (statut: ${questStatus})`);
    }

    // Démarrer la quête
    const quest = await questManager.startQuest(player.name, data.questId);
    
    if (quest) {
      // Succès !
      client.send("questAcceptResult", {
        success: true,
        questId: data.questId,
        quest: quest,
        message: `Quête "${quest.name}" acceptée !`
      });

      // Notifier le système de quêtes
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

      // Mettre à jour les statuts de quêtes
      await this.updateQuestStatuses(player.name, client);

      console.log(`✅ [QuestHandlers] Quête ${data.questId} acceptée avec succès par ${player.name}`);

    } else {
      throw new Error("Impossible de démarrer la quête");
    }

  } catch (error) {
    console.error(`❌ [QuestHandlers] Erreur acceptation quête ${data.questId}:`, error);
    
    client.send("questAcceptResult", {
      success: false,
      questId: data.questId,
      error: (error as Error).message || "Erreur lors de l'acceptation de la quête"
    });
  }
}
  
  private async handleStartQuest(client: Client, data: { questId: string }) {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("questStartResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      this.room.blockPlayerMovement(client.sessionId, 'dialog', 3000, { questId: data.questId });

      try {
        const questManager = ServiceRegistry.getInstance().getQuestManager();
        if (!questManager) {
          client.send("questStartResult", {
            success: false,
            message: "Système de quêtes non disponible"
          });
          return;
        }

        const quest = await questManager.startQuest(player.name, data.questId);
        
        if (quest) {
          client.send("questStartResult", {
            success: true,
            quest: quest,
            message: `Quête "${quest.name}" démarrée !`
          });
          
          await this.updateQuestStatuses(player.name);
        } else {
          client.send("questStartResult", {
            success: false,
            message: "Impossible de démarrer cette quête"
          });
        }

        this.room.unblockPlayerMovement(client.sessionId, 'dialog');
        
      } catch (error) {
        this.room.unblockPlayerMovement(client.sessionId, 'dialog');
        throw error;
      }
      
    } catch (error) {
      client.send("questStartResult", {
        success: false,
        message: "Erreur serveur lors du démarrage de la quête"
      });
    }
  }

  private async handleGetActiveQuests(client: Client) {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("activeQuestsList", { quests: [] });
        return;
      }

      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) {
        client.send("activeQuestsList", { quests: [] });
        return;
      }

      const activeQuests = await questManager.getPlayerActiveQuests(player.name);
      
      client.send("activeQuestsList", {
        quests: activeQuests
      });
      
    } catch (error) {
      client.send("activeQuestsList", { quests: [] });
    }
  }

  private async handleGetAvailableQuests(client: Client) {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("availableQuestsList", { quests: [] });
        return;
      }

      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) {
        client.send("availableQuestsList", { quests: [] });
        return;
      }

      const availableQuests = await questManager.getPlayerAvailableQuests(player.name);
      
      client.send("availableQuestsList", {
        quests: availableQuests
      });
      
    } catch (error) {
      client.send("availableQuestsList", { quests: [] });
    }
  }

  private async handleQuestProgress(client: Client, data: any) {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;

      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) return;

      const result = await questManager.progressQuest(player.name, data);
      
      if (result.success && result.results.length > 0) {
        client.send("questProgressUpdate", result.results);
        await this.updateQuestStatuses(player.name);
      }
      
    } catch (error) {
      console.error("❌ [QuestHandlers] Erreur handleQuestProgress:", error);
    }
  }

  private async handleQuestEvent(client: Client, eventType: string, eventData: any) {
    try {
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
          return;
      }

      const result = await questManager.progressQuest(player.name, progressEvent);
      
      if (result.success && result.results.length > 0) {
        client.send("questProgressUpdate", result.results);
      }
      
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur handleQuestEvent:`, error);
    }
  }

  private async handleQuestConditions(client: Client, conditions: any) {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;

      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) return;

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

      client.send("questConditionsResult", {
        checks: checks,
        allMet: checks.every(check => check.met)
      });
      
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur handleQuestConditions:`, error);
    }
  }

  private async handleDebugQuests(client: Client) {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;
    
    try {
      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) return;

      const activeQuests = await questManager.getPlayerActiveQuests(player.name);
      const availableQuests = await questManager.getPlayerAvailableQuests(player.name);
      
      console.log(`🐛 [QuestHandlers] Quêtes actives (${activeQuests.length}):`, 
        activeQuests.map((q: any) => ({ id: q.id, name: q.name, step: q.currentStepIndex })));
      
      console.log(`🐛 [QuestHandlers] Quêtes disponibles (${availableQuests.length}):`, 
        availableQuests.map((q: any) => ({ id: q.id, name: q.name })));
        
    } catch (error) {
      console.error(`🐛 [QuestHandlers] Erreur debug quêtes:`, error);
    }
  }

  private async handleDebugPlayerQuests(client: Client) {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;

      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) return;

      const activeQuests = await questManager.getPlayerActiveQuests(player.name);
      const availableQuests = await questManager.getPlayerAvailableQuests(player.name);

      const debugInfo = {
        playerName: player.name,
        activeQuests: activeQuests.map((q: any) => ({
          id: q.id,
          name: q.name,
          currentStep: q.currentStepIndex,
          status: q.status,
          objectives: q.steps[q.currentStepIndex]?.objectives || []
        })),
        availableQuests: availableQuests.map((q: any) => ({
          id: q.id,
          name: q.name,
          category: q.category
        })),
        stats: {
          activeCount: activeQuests.length,
          availableCount: availableQuests.length
        }
      };

      client.send("questDebugInfo", debugInfo);
      
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur handleDebugPlayerQuests:`, error);
    }
  }

  private async updateQuestStatuses(playerName: string, client?: Client) {
    try {
      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) return;
      
      const availableQuests = await questManager.getPlayerAvailableQuests(playerName);
      const activeQuests = await questManager.getPlayerActiveQuests(playerName);
      
      // ✅ NOUVEAU FORMAT AVEC IDs
      const npcQuestMap = new Map<number, any>();

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
        if (client) {
          client.send("questStatuses", { questStatuses });
        } else {
          this.room.broadcast("questStatuses", { questStatuses });
        }
      }
      
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur updateQuestStatuses:`, error);
    }
  }

  private convertStepToProgressEvent(step: string): any | null {
    switch (step) {
      case 'intro_started':
        return null;

      case 'dialogue_completed':
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

      case 'follow_psyduck':
        return {
          type: 'talk',
          npcId: 999,
          targetId: '999A',
          amount: 1
        };
        
      default:
        return null;
    }
  }

  public async triggerQuestEvent(playerName: string, eventType: string, eventData: any): Promise<void> {
    try {
      for (const [sessionId, player] of this.room.state.players) {
        if (player.name === playerName) {
          const client = this.room.clients.find(c => c.sessionId === sessionId);
          if (client) {
            await this.handleQuestEvent(client, eventType, eventData);
            return;
          }
        }
      }
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur triggerQuestEvent:`, error);
    }
  }

  public async checkConditionsForPlayer(playerName: string, conditions: any): Promise<boolean> {
    try {
      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) return false;

      if (conditions.completedQuests) {
        for (const questId of conditions.completedQuests) {
          const status = await questManager.checkQuestStatus(playerName, questId);
          if (status !== 'completed') return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  cleanup() {
    // Cleanup si nécessaire
  }
}
