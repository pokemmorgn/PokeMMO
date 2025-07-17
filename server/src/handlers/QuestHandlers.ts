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
    console.log(`📨 Setup Quest handlers (COMPLET)...`);

    // ✅ === HANDLERS PROGRESSION QUÊTES ===
    this.room.onMessage("progressIntroQuest", async (client: Client, data: { step: string }) => {
      console.log(`📨 PROGRESS INTRO RECEIVED...`);
      await this.handleProgressIntroQuest(client, data.step);
    });

    // ✅ === NOUVEAUX HANDLERS POUR LES MESSAGES INTRO ===
    this.room.onMessage("intro_started", async (client: Client) => {
      console.log(`🎬 [QuestHandlers] Intro démarrée pour ${client.sessionId}`);
      await this.handleProgressIntroQuest(client, "intro_started");
    });

    this.room.onMessage("dialogue_completed", async (client: Client) => {
      console.log(`💬 [QuestHandlers] Dialogue terminé pour ${client.sessionId}`);
      await this.handleProgressIntroQuest(client, "dialogue_completed");
    });

    this.room.onMessage("intro_completed", async (client: Client) => {
      console.log(`🎉 [QuestHandlers] Intro complétée pour ${client.sessionId}`);
      await this.handleProgressIntroQuest(client, "intro_completed");
    });

    // ✅ === HANDLERS GESTION AUTOMATIQUE ===
    this.room.onMessage("checkAutoIntroQuest", async (client: Client) => {
      await this.handleCheckAutoIntroQuest(client);
    });

    // ✅ === HANDLERS CLASSIQUES ===
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

    // ✅ === HANDLERS ÉVÉNEMENTS AUTOMATIQUES ===
    this.room.onMessage("triggerQuestEvent", async (client: Client, data: { eventType: string, eventData: any }) => {
      await this.handleQuestEvent(client, data.eventType, data.eventData);
    });

    this.room.onMessage("checkQuestConditions", async (client: Client, data: { conditions: any }) => {
      await this.handleQuestConditions(client, data.conditions);
    });

    // ✅ === HANDLER DEBUG DÉVELOPPEMENT ===
    this.room.onMessage("debugPlayerQuests", async (client: Client) => {
      await this.handleDebugPlayerQuests(client);
    });

    // ✅ HANDLER CLIENT READY (le nouveau)
    this.room.onMessage("clientIntroReady", (client: Client) => {
      console.log(`📨 RECEIVED READY FROM PLAYER...`);
      this.handleCheckAutoIntroQuest(client);
    });

    console.log(`✅ Quest handlers configurés (${this.getHandlerCount()} handlers)`);
  }

  private getHandlerCount(): number {
    return 13; // Nombre de handlers configurés (mis à jour)
  }

  // ✅ === NOUVEAU HANDLER: VÉRIFICATION AUTO INTRO ===
  private async handleCheckAutoIntroQuest(client: Client) {
    try {
      console.log(`🎬 [QuestHandlers] Vérification intro quest pour ${client.sessionId}`);

      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        console.warn(`⚠️ [QuestHandlers] Joueur non trouvé: ${client.sessionId}`);
        return;
      }

      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) {
        console.error(`❌ [QuestHandlers] QuestManager non disponible`);
        return;
      }

      const introQuestId = "beach_intro_quest";
      const questStatus = await questManager.checkQuestStatus(player.name, introQuestId);

      console.log(`🔍 [QuestHandlers] Statut quête intro pour ${player.name}: ${questStatus}`);

      if (questStatus === 'available') {
        // ✅ DONNER LA QUÊTE MAIS PAS ENCORE LA VALIDER
        const result = await questManager.giveQuest(player.name, introQuestId);

        if (result.success) {
          console.log(`📋 [QuestHandlers] Quête intro donnée à ${player.name}`);
          
          // ✅ ENVOYER TRIGGER INTRO APRÈS UN DÉLAI
          setTimeout(() => {
            ServiceRegistry.getInstance().notifyPlayer(player.name, "triggerIntroSequence", {
              questId: introQuestId,
              questName: result.quest?.name || "Bienvenue à GreenRoot",
              message: "Bienvenue dans votre aventure !",
              shouldStartIntro: true
            });
            console.log(`📤 [QuestHandlers] triggerIntroSequence envoyé avec délai`);
          }, 1000);
        }
      } else if (questStatus === 'active') {
        // ✅ VÉRIFIER SI L'INTRO A ÉTÉ VUE
        const activeQuests = await questManager.getPlayerActiveQuests(player.name);
        const introQuest = activeQuests.find(q => q.id === introQuestId);

        if (introQuest && introQuest.steps.length > 0) {
          const firstStep = introQuest.steps[0];
          const hasSeenIntro = firstStep.objectives.some((obj: any) => obj.completed);

          if (!hasSeenIntro) {
            console.log(`🔄 [QuestHandlers] Quête active mais intro pas vue pour ${player.name}`);
            
            ServiceRegistry.getInstance().notifyPlayer(player.name, "triggerIntroSequence", {
              questId: introQuestId,
              questName: introQuest.name,
              message: "Continuons votre aventure !",
              shouldStartIntro: true
            });
            console.log(`📤 [QuestHandlers] triggerIntroSequence envoyé (quête existante)`);
          } else {
            console.log(`✅ [QuestHandlers] Intro déjà vue pour ${player.name}`);
          }
        }
      } else if (questStatus === 'completed') {
        console.log(`🎉 [QuestHandlers] Quête intro déjà terminée pour ${player.name}`);
      }

    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur handleCheckAutoIntroQuest:`, error);
    }
  }

  // ✅ === HANDLER PROGRESSION INTRO (maintenant public) ===
  public async handleProgressIntroQuest(client: Client, step: string) {
    try {
      console.log(`🎬 [QuestHandlers] Progression intro quest: ${step}`);
      
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        console.warn(`⚠️ [QuestHandlers] Joueur non trouvé: ${client.sessionId}`);
        return;
      }

      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) {
        console.error(`❌ [QuestHandlers] QuestManager non disponible`);
        return;
      }

      // ✅ GESTION SPÉCIALE POUR intro_started (pas de progression)
      if (step === 'intro_started') {
        console.log(`🎬 [QuestHandlers] Intro démarrée pour ${player.name} - pas de progression encore`);
        return;
      }

      // Conversion step → event de progression
      const progressEvent = this.convertStepToProgressEvent(step);
      if (!progressEvent) {
        console.warn(`⚠️ [QuestHandlers] Étape intro non-progressive: ${step}`);
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

        // ✅ METTRE À JOUR LES STATUTS DE QUÊTE
        await this.updateQuestStatuses(player.name, client);
      }
      
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur handleProgressIntroQuest:`, error);
    }
  }

  // ✅ === HANDLER DÉMARRAGE QUÊTE ===
  private async handleStartQuest(client: Client, data: { questId: string }) {
    try {
      console.log(`🎯 [QuestHandlers] Démarrage de quête ${data.questId} pour ${client.sessionId}`);
      
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("questStartResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      // Bloquer mouvement pendant démarrage
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
          console.log(`✅ [QuestHandlers] Quête ${data.questId} démarrée pour ${player.name}`);
          
          client.send("questStartResult", {
            success: true,
            quest: quest,
            message: `Quête "${quest.name}" démarrée !`
          });
          
          // Mettre à jour les statuts
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
      console.error("❌ [QuestHandlers] Erreur handleStartQuest:", error);
      client.send("questStartResult", {
        success: false,
        message: "Erreur serveur lors du démarrage de la quête"
      });
    }
  }

  // ✅ === HANDLER RÉCUPÉRATION QUÊTES ACTIVES ===
  private async handleGetActiveQuests(client: Client) {
    try {
      console.log(`📋 [QuestHandlers] Récupération des quêtes actives pour ${client.sessionId}`);
      
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
      
      console.log(`📤 [QuestHandlers] Envoi de ${activeQuests.length} quêtes actives`);
      client.send("activeQuestsList", {
        quests: activeQuests
      });
      
    } catch (error) {
      console.error("❌ [QuestHandlers] Erreur handleGetActiveQuests:", error);
      client.send("activeQuestsList", { quests: [] });
    }
  }

  // ✅ === HANDLER RÉCUPÉRATION QUÊTES DISPONIBLES ===
  private async handleGetAvailableQuests(client: Client) {
    try {
      console.log(`📋 [QuestHandlers] Récupération des quêtes disponibles pour ${client.sessionId}`);
      
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
      
      console.log(`📤 [QuestHandlers] Envoi de ${availableQuests.length} quêtes disponibles`);
      client.send("availableQuestsList", {
        quests: availableQuests
      });
      
    } catch (error) {
      console.error("❌ [QuestHandlers] Erreur handleGetAvailableQuests:", error);
      client.send("availableQuestsList", { quests: [] });
    }
  }

  // ✅ === HANDLER PROGRESSION QUÊTE GÉNÉRALE ===
  private async handleQuestProgress(client: Client, data: any) {
    try {
      console.log(`📈 [QuestHandlers] Progression de quête pour ${client.sessionId}:`, data);
      
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        return;
      }

      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) {
        return;
      }

      const result = await questManager.progressQuest(player.name, data);
      
      if (result.success && result.results.length > 0) {
        console.log(`📤 [QuestHandlers] Envoi questProgressUpdate:`, result.results);
        client.send("questProgressUpdate", result.results);
        
        // Mettre à jour les statuts de quête
        await this.updateQuestStatuses(player.name);
      }
      
    } catch (error) {
      console.error("❌ [QuestHandlers] Erreur handleQuestProgress:", error);
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
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;
    
    console.log(`🐛 [QuestHandlers] Debug quêtes pour: ${player.name}`);
    
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

  // ✅ === HANDLER DEBUG DÉVELOPPEMENT ===
  private async handleDebugPlayerQuests(client: Client) {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;

      console.log(`🐛 [QuestHandlers] Debug développement pour ${player.name}`);

      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) return;

      // Récupérer toutes les infos de quêtes
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

      console.log(`🐛 [QuestHandlers] Debug info:`, debugInfo);

      // Envoyer les infos de debug au client
      client.send("questDebugInfo", debugInfo);
      
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur handleDebugPlayerQuests:`, error);
    }
  }

  // ✅ === MÉTHODE HELPER POUR MISE À JOUR STATUTS ===
  private async updateQuestStatuses(playerName: string, client?: Client) {
    try {
      console.log(`📊 [QuestHandlers] === UPDATE QUEST STATUSES ===`);
      console.log(`👤 Username: ${playerName}`);
      
      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) {
        console.error(`❌ [QuestHandlers] QuestManager non accessible !`);
        return;
      }
      
      console.log(`✅ [QuestHandlers] QuestManager OK, récupération quest statuses...`);
      
      const availableQuests = await questManager.getPlayerAvailableQuests(playerName);
      const activeQuests = await questManager.getPlayerActiveQuests(playerName);
      
      console.log(`📋 [QuestHandlers] Quêtes disponibles: ${availableQuests.length}`);
      console.log(`📈 [QuestHandlers] Quêtes actives: ${activeQuests.length}`);
      
      const questStatuses: any[] = [];
      
      // Statuts pour les quêtes disponibles
      for (const quest of availableQuests) {
        if (quest.startNpcId) {
          questStatuses.push({
            npcId: quest.startNpcId,
            type: 'questAvailable'
          });
          console.log(`➕ [QuestHandlers] Quête disponible: ${quest.name} pour NPC ${quest.startNpcId}`);
        }
      }
      
      // Statuts pour les quêtes actives
      for (const quest of activeQuests) {
        if (quest.status === 'readyToComplete' && quest.endNpcId) {
          questStatuses.push({
            npcId: quest.endNpcId,
            type: 'questReadyToComplete'
          });
          console.log(`🎉 [QuestHandlers] Quête prête: ${quest.name} pour NPC ${quest.endNpcId}`);
        } else if (quest.endNpcId) {
          questStatuses.push({
            npcId: quest.endNpcId,
            type: 'questInProgress'
          });
          console.log(`📈 [QuestHandlers] Quête en cours: ${quest.name} pour NPC ${quest.endNpcId}`);
        }
      }
      
      console.log(`📊 [QuestHandlers] Total quest statuses: ${questStatuses.length}`, questStatuses);
      
      if (questStatuses.length > 0) {
        // Envoyer à tous les clients ou juste celui spécifié
        if (client) {
          client.send("questStatuses", { questStatuses });
          console.log(`📤 [QuestHandlers] Quest statuses envoyés à ${client.sessionId}`);
        } else {
          this.room.broadcast("questStatuses", { questStatuses });
          console.log(`📡 [QuestHandlers] Quest statuses broadcastés`);
        }
      } else {
        console.log(`ℹ️ [QuestHandlers] Aucun quest status à envoyer pour ${playerName}`);
      }
      
    } catch (error) {
      console.error(`❌ [QuestHandlers] Erreur updateQuestStatuses:`, error);
    }
  }

  // ✅ === HELPERS ===

  private convertStepToProgressEvent(step: string): any | null {
    switch (step) {
      case 'intro_started':
        return null; // Pas de progression, juste tracking

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
