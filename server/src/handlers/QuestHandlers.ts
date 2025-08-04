// server/src/handlers/QuestHandlers.ts - VERSION NETTOYÉE
// 🧹 MESSAGES UNIFIÉS: Un seul message par action, pas de doublon

import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { ServiceRegistry } from "../services/ServiceRegistry";

export class QuestHandlers {
  private room: WorldRoom;

  constructor(room: WorldRoom) {
    this.room = room;
  }

  setupHandlers() {
    // ✅ HANDLER PRINCIPAL: Acceptation de quête
    this.room.onMessage("acceptQuest", async (client: Client, data: { questId: string, npcId: string | number, timestamp?: number }) => {
      await this.handleAcceptQuest(client, data);
    });

    // ✅ HANDLER: Récupérer détails d'une quête
    this.room.onMessage("getQuestDetails", async (client: Client, data: { npcId: number, questId: string }) => {
      await this.handleGetQuestDetails(client, data);
    });

    // Handlers classiques (inchangés)
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

    // Handlers intro (inchangés)
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

    // Debug handlers
    this.room.onMessage("debugQuests", (client: Client) => {
      this.handleDebugQuests(client);
    });

    this.room.onMessage("debugPlayerQuests", async (client: Client) => {
      await this.handleDebugPlayerQuests(client);
    });

    console.log('✅ [QuestHandlers] Handlers configurés (version nettoyée)');
  }

  // ✅ HANDLER PRINCIPAL: Acceptation de quête (NETTOYÉ)
  private async handleAcceptQuest(client: Client, data: { questId: string, npcId: string | number, timestamp?: number }) {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ [QuestHandlers] Joueur non trouvé pour session ${client.sessionId}`);
      this.sendQuestResult(client, false, data.questId, "Joueur non trouvé");
      return;
    }

    console.log(`🎯 [QuestHandlers] === DÉBUT ACCEPTATION QUÊTE ===`);
    console.log(`📋 Quête: ${data.questId}, Joueur: ${player.name}, NPC: ${data.npcId}`);

    try {
      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) {
        throw new Error("QuestManager non disponible");
      }

      // Vérifier statut
      const questStatus = await questManager.checkQuestStatus(player.name, data.questId);
      console.log(`🔍 Statut quête ${data.questId}: ${questStatus}`);
      
      if (questStatus !== 'available') {
        throw new Error(`Quête non disponible (statut: ${questStatus})`);
      }

      // Démarrer la quête
      const quest = await questManager.startQuest(player.name, data.questId);
      
      if (quest) {
        console.log(`✅ [QuestHandlers] Quête ${data.questId} démarrée avec succès`);
        
        // ✅ UN SEUL MESSAGE CLIENT: questAcceptResult
        this.sendQuestResult(client, true, data.questId, `Quête "${quest.name}" acceptée !`, quest);
        
        // ✅ Mettre à jour les statuts NPCs
        await this.updateQuestStatuses(player.name, client);
        
        console.log(`✅ [QuestHandlers] === FIN ACCEPTATION RÉUSSIE ===`);

      } else {
        throw new Error("Impossible de démarrer la quête");
      }

    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur acceptation:`, error);
      this.sendQuestResult(client, false, data.questId, (error as Error).message);
      console.log(`❌ [QuestHandlers] === FIN ACCEPTATION ÉCHOUÉE ===`);
    }
  }

  // ✅ MÉTHODE UNIFIÉE: Envoi résultat quête
  private sendQuestResult(client: Client, success: boolean, questId: string, message: string, quest?: any) {
    const result = {
      success: success,
      questId: questId,
      message: message,
      quest: quest || null
    };

    console.log(`📤 [QuestHandlers] Envoi questAcceptResult:`, {
      success: result.success,
      questId: result.questId,
      questName: result.quest?.name || 'N/A'
    });

    // ✅ UN SEUL MESSAGE CLIENT
    client.send("questAcceptResult", result);
    
    console.log(`✅ [QuestHandlers] questAcceptResult envoyé avec succès`);
  }

  // ✅ HANDLER: Détails de quête (NETTOYÉ)
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

  // ✅ MÉTHODE: Mise à jour statuts NPCs (NETTOYÉE)
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
        console.log(`📤 [QuestHandlers] Envoi questStatuses pour ${questStatuses.length} NPCs`);
        
        if (client) {
          client.send("questStatuses", { questStatuses });
        } else {
          this.room.broadcast("questStatuses", { questStatuses });
        }
      } else {
        console.log(`ℹ️ [QuestHandlers] Aucun statut à mettre à jour`);
      }
      
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur updateQuestStatuses:`, error);
    }
  }

  // === HANDLERS EXISTANTS (INCHANGÉS) ===

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
            await this.handleQuestProgress(client, { type: eventType, ...eventData });
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
    console.log(`🧹 [QuestHandlers] Nettoyage...`);
  }
}
