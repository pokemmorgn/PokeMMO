// ===== server/src/managers/ZoneManager.ts =====
import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { IZone } from "../rooms/zones/IZone";
import { BeachZone } from "../rooms/zones/BeachZone";
import { VillageZone } from "../rooms/zones/VillageZone";
import { VillageLabZone } from "../rooms/zones/VillageLabZone";
import { Villagehouse1 } from "../rooms/zones/Villagehouse1";
import { Villageflorist } from "../rooms/zones/Villageflorist";
import { Player } from "../schema/PokeWorldState";

// ✅ AJOUT DES IMPORTS POUR LES INTERACTIONS
import { QuestManager } from "./QuestManager";
import { QuestProgressEvent } from "../types/QuestTypes";

export class ZoneManager {
  private zones = new Map<string, IZone>();
  private room: WorldRoom;
  
  // ✅ AJOUT DU QUEST MANAGER
  private questManager: QuestManager;

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🗺️ === ZONE MANAGER INIT ===`);
    
    // ✅ INITIALISER LE QUEST MANAGER
    this.initializeQuestManager();
    
    this.loadAllZones();
  }

  // ✅ MÉTHODE SIMPLIFIÉE : Initialiser le quest manager
  private initializeQuestManager() {
    try {
      this.questManager = new QuestManager(`../data/quests/quests.json`);
      console.log(`✅ QuestManager initialisé`);
    } catch (error) {
      console.error(`❌ Erreur initialisation QuestManager:`, error);
    }
  }

  private loadAllZones() {
    console.log(`🏗️ Chargement des zones...`);

    this.loadZone('beach', new BeachZone(this.room));
    this.loadZone('village', new VillageZone(this.room));
    this.loadZone('villagelab', new VillageLabZone(this.room));
    this.loadZone('villagehouse1', new Villagehouse1(this.room));
    this.loadZone('villageflorist', new Villageflorist(this.room));

    console.log(`✅ ${this.zones.size} zones chargées:`, Array.from(this.zones.keys()));
  }

  private loadZone(zoneName: string, zone: IZone) {
    console.log(`📦 Chargement zone: ${zoneName}`);
    this.zones.set(zoneName, zone);
    console.log(`✅ Zone ${zoneName} chargée`);
  }

  async handleZoneTransition(client: Client, data: any) {
    console.log(`🌀 === ZONE TRANSITION HANDLER ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📍 Data:`, data);

    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      client.send("transitionResult", { success: false, reason: "Player not found" });
      return;
    }

    const fromZone = player.currentZone;
    const toZone = data.targetZone;

    console.log(`🔄 Transition: ${fromZone} → ${toZone}`);

    const targetZone = this.zones.get(toZone);
    if (!targetZone) {
      console.error(`❌ Zone de destination inconnue: ${toZone}`);
      client.send("transitionResult", { success: false, reason: "Zone not found" });
      return;
    }

    try {
      if (fromZone && fromZone !== toZone) {
        console.log(`📤 Sortie de zone: ${fromZone}`);
        this.onPlayerLeaveZone(client, fromZone);
      }

      player.currentZone = toZone;
      player.map = toZone;
      if (data.spawnX !== undefined) player.x = data.spawnX;
      if (data.spawnY !== undefined) player.y = data.spawnY;

      console.log(`📍 Position mise à jour: (${player.x}, ${player.y}) dans ${toZone}`);

      console.log(`📥 Entrée dans zone: ${toZone}`);
      await this.onPlayerJoinZone(client, toZone);

      client.send("transitionResult", { 
        success: true, 
        currentZone: toZone,
        position: { x: player.x, y: player.y }
      });

      console.log(`✅ Transition réussie: ${player.name} est maintenant dans ${toZone}`);

    } catch (error) {
      console.error(`❌ Erreur lors de la transition:`, error);
      client.send("transitionResult", { success: false, reason: "Transition failed" });
    }
  }

  async onPlayerJoinZone(client: Client, zoneName: string) {
    console.log(`📥 === PLAYER JOIN ZONE ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`🌍 Zone: ${zoneName}`);

    const zone = this.zones.get(zoneName);
    if (zone) {
      await zone.onPlayerEnter(client);
      await this.room.onPlayerJoinZone(client, zoneName);
      
      // ✅ NOUVEAU: Envoyer les statuts de quêtes pour les NPCs de cette zone
      await this.sendQuestStatusesForZone(client, zoneName);
      
      console.log(`✅ Player entered zone: ${zoneName}`);
    } else {
      console.error(`❌ Zone not found: ${zoneName}`);
    }
  }

  onPlayerLeaveZone(client: Client, zoneName: string) {
    console.log(`📤 === PLAYER LEAVE ZONE ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`🌍 Zone: ${zoneName}`);

    const zone = this.zones.get(zoneName);
    if (zone) {
      zone.onPlayerLeave(client);
      console.log(`✅ Player left zone: ${zoneName}`);
    } else {
      console.error(`❌ Zone not found: ${zoneName}`);
    }
  }

  // ✅ GESTION DES INTERACTIONS NPC AVEC LOGIQUE DE QUÊTES
  async handleNpcInteraction(client: Client, npcId: number) {
    console.log(`💬 === NPC INTERACTION HANDLER ===`);
    
    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      client.send("npcInteractionResult", {
        type: "error",
        message: "Joueur non trouvé"
      });
      return;
    }

    const npcManager = this.room.getNpcManager(player.currentZone);
    if (!npcManager) {
      console.error(`❌ NPCManager not found for zone: ${player.currentZone}`);
      client.send("npcInteractionResult", {
        type: "error",
        message: "NPCs non disponibles dans cette zone"
      });
      return;
    }

    const npc = npcManager.getNpcById(npcId);
    if (!npc) {
      console.error(`❌ NPC not found: ${npcId}`);
      client.send("npcInteractionResult", {
        type: "error",
        message: "NPC introuvable"
      });
      return;
    }

    console.log(`💬 Interaction avec NPC: ${npc.name} dans ${player.currentZone}`);

    try {
      // ✅ 1. VÉRIFIER LE STATUT DES QUÊTES DE CE NPC
      const questStatus = await this.getQuestStatusForNpc(player.name, npc);
      
      switch (questStatus.type) {
        case 'questAvailable':
          // ✅ Quête disponible à prendre
          client.send("npcInteractionResult", {
            type: "questGiver",
            availableQuests: questStatus.quests,
            npcId: npcId,
            npcName: npc.name
          });
          break;
          
        case 'questReadyToComplete':
          // ✅ Quête prête à rendre
          client.send("npcInteractionResult", {
            type: "questComplete", 
            questId: questStatus.questId,
            npcId: npcId,
            npcName: npc.name,
            message: `Félicitations ! Vous avez terminé la quête !`
          });
          break;
          
        case 'questInProgress':
          // ✅ Quête en cours - dialogue normal
          const progressDialogue = this.getProgressDialogueForNpc(npc, questStatus.quest);
          client.send("npcInteractionResult", {
            type: "dialogue",
            lines: progressDialogue,
            npcId: npcId,
            npcName: npc.name
          });
          break;
          
        case 'noQuest':
        default:
          // ✅ Pas de quête - dialogue normal
          const dialogueLines = this.getDialogueForNpc(npc);
          client.send("npcInteractionResult", {
            type: "dialogue",
            lines: dialogueLines,
            npcId: npcId,
            npcName: npc.name
          });
          break;
      }
      
    } catch (error) {
      console.error(`❌ Erreur interaction NPC ${npcId}:`, error);
      client.send("npcInteractionResult", {
        type: "error",
        message: "Erreur lors de l'interaction avec le NPC"
      });
    }
  }

  // ✅ MÉTHODE OPTIMISÉE: Analyser le statut des quêtes pour un NPC
  private async getQuestStatusForNpc(username: string, npc: any) {
    if (!npc.properties?.questId) {
      return { type: 'noQuest' };
    }

    const questId = npc.properties.questId;
    
    // ✅ UTILISER LE QUESTMANAGER EXISTANT - plus efficace !
    const availableQuests = await this.questManager.getAvailableQuests(username);
    const availableQuest = availableQuests.find(q => q.id === questId);
    
    if (availableQuest) {
      return { type: 'questAvailable', quests: [availableQuest] };
    }

    // ✅ Vérifier les quêtes actives
    const activeQuests = await this.questManager.getActiveQuests(username);
    const activeQuest = activeQuests.find(q => q.id === questId);
    
    if (activeQuest) {
      // Vérifier si prête à compléter
      if (this.isQuestReadyToComplete(activeQuest)) {
        return { type: 'questReadyToComplete', questId, quest: activeQuest };
      } else {
        return { type: 'questInProgress', quest: activeQuest };
      }
    }

    // ✅ Pas de quête pour ce NPC
    return { type: 'noQuest' };
  }

  // ✅ MÉTHODE OPTIMISÉE: Vérifier si une quête est prête à compléter
  private isQuestReadyToComplete(quest: any): boolean {
    const currentStep = quest.steps[quest.currentStepIndex];
    if (!currentStep) return false;

    // ✅ Vérifier que tous les objectifs de l'étape courante sont complétés
    return currentStep.objectives.every((obj: any) => obj.completed);
  }

  // ✅ MÉTHODE HELPER : Récupérer le dialogue d'un NPC
  private getDialogueForNpc(npc: any): string[] {
    // TODO: Implémenter la récupération depuis dialogueId
    if (npc.properties?.dialogueId) {
      // Pour l'instant, dialogue par défaut
      switch (npc.properties.dialogueId) {
        case 'greeting_bob':
          return ["Salut ! Je suis Bob, le pêcheur local.", "J'espère que tu aimes la pêche !"];
        default:
          return [`Bonjour ! Je suis ${npc.name}.`];
      }
    }
    
    return [`Bonjour ! Je suis ${npc.name}.`];
  }

  // ✅ NOUVELLE MÉTHODE: Dialogue spécifique pendant une quête
  private getProgressDialogueForNpc(npc: any, quest: any): string[] {
    // Dialogues spécifiques selon la quête en cours
    if (quest.id === 'quest_fishingrod') {
      return [
        "Comment va votre recherche de matériel de pêche ?",
        "J'ai vraiment hâte de retourner pêcher !"
      ];
    }
    
    // Dialogue générique pour quête en cours
    return [
      `Comment avance votre mission ?`,
      `Revenez me voir quand vous aurez terminé !`
    ];
  }

  // ✅ NOUVELLE MÉTHODE: Envoyer les statuts de quêtes
  private async sendQuestStatusesForZone(client: Client, zoneName: string) {
    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) return;

    const npcManager = this.room.getNpcManager(zoneName);
    if (!npcManager) return;

    const npcs = npcManager.getAllNpcs();
    const questStatuses = [];

    for (const npc of npcs) {
      if (npc.properties?.questId) {
        const status = await this.getQuestStatusForNpc(player.name, npc);
        questStatuses.push({
          npcId: npc.id,
          type: status.type
        });
      }
    }

    if (questStatuses.length > 0) {
      client.send("questStatuses", { questStatuses });
    }
  }

  // ✅ === MÉTHODES DE DÉLÉGATION AU QUEST MANAGER ===
  // Ces méthodes sont des proxies vers le QuestManager

  async handleQuestStart(client: Client, questId: string): Promise<{ success: boolean; message: string; quest?: any }> {
    console.log(`🎯 === QUEST START HANDLER ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest ID: ${questId}`);
    
    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return {
        success: false,
        message: "Joueur non trouvé"
      };
    }

    try {
      const quest = await this.questManager.startQuest(player.name, questId);
      
      if (quest) {
        // ✅ NOUVEAU: Mettre à jour les indicateurs de quête après démarrage
        await this.sendQuestStatusesForZone(client, player.currentZone);
        
        // Broadcaster aux autres joueurs
        this.broadcastToZone(player.currentZone, "questUpdate", {
          player: player.name,
          action: "started",
          questId: questId
        });
        
        console.log(`✅ Quête ${questId} démarrée pour ${player.name}`);
        
        return {
          success: true,
          quest: quest,
          message: `Quête "${quest.name}" démarrée !`
        };
      } else {
        return {
          success: false,
          message: "Impossible de démarrer cette quête"
        };
      }
      
    } catch (error) {
      console.error(`❌ Erreur démarrage quête ${questId}:`, error);
      return {
        success: false,
        message: "Erreur lors du démarrage de la quête"
      };
    }
  }

  // ✅ DÉLÉGATION: Récupérer les quêtes actives
  async getActiveQuests(username: string): Promise<any[]> {
    try {
      return await this.questManager.getActiveQuests(username);
    } catch (error) {
      console.error(`❌ Erreur getActiveQuests:`, error);
      return [];
    }
  }

  // ✅ DÉLÉGATION: Récupérer les quêtes disponibles
  async getAvailableQuests(username: string): Promise<any[]> {
    try {
      return await this.questManager.getAvailableQuests(username);
    } catch (error) {
      console.error(`❌ Erreur getAvailableQuests:`, error);
      return [];
    }
  }

  // ✅ DÉLÉGATION: Mettre à jour la progression des quêtes
  async updateQuestProgress(username: string, event: QuestProgressEvent): Promise<any[]> {
    try {
      return await this.questManager.updateQuestProgress(username, event);
    } catch (error) {
      console.error(`❌ Erreur updateQuestProgress:`, error);
      return [];
    }
  }

  // ✅ DÉLÉGATION: Récupérer les statuts de quête pour un joueur
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
      console.error(`❌ Erreur getQuestStatuses:`, error);
      return [];
    }
  }

  // Méthodes utilitaires
  getPlayersInZone(zoneName: string): Player[] {
    const playersInZone = Array.from(this.room.state.players.values())
      .filter((player: Player) => player.currentZone === zoneName);
    
    console.log(`📊 Players in zone ${zoneName}: ${playersInZone.length}`);
    return playersInZone;
  }

  broadcastToZone(zoneName: string, message: string, data: any) {
    console.log(`📡 Broadcasting to zone ${zoneName}: ${message}`);
    
    const clientsInZone = this.room.clients.filter(client => {
      const player = this.room.state.players.get(client.sessionId) as Player;
      return player && player.currentZone === zoneName;
    });
    
    clientsInZone.forEach(client => {
      client.send(message, data);
    });
    
    console.log(`📤 Message envoyé à ${clientsInZone.length} clients dans ${zoneName}`);
  }
}
