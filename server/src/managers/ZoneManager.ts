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

// AJOUTS :
import { QuestManager } from "./QuestManager";
import { QuestProgressEvent } from "../types/QuestTypes";
import { InteractionManager } from "./InteractionManager";
import { NpcManager } from "./NPCManager";

export class ZoneManager {
  private zones = new Map<string, IZone>();
  private room: WorldRoom;

  // Ajout des managers
  private questManager: QuestManager;
  private npcManagers: Map<string, NpcManager> = new Map();
  private interactionManager: InteractionManager;

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🗺️ === ZONE MANAGER INIT ===`);

    // Initialisation QuestManager
    this.questManager = new QuestManager(`../data/quests/quests.json`);
    console.log(`✅ QuestManager initialisé`);

    // Initialisation NPC Managers (par zone)
    this.initializeNpcManagers();

    // Initialisation InteractionManager (on passera dynamiquement le bon npcManager)
    // On lui passe un dummy pour le moment, il sera remplacé à chaque appel d'interaction
    const dummyNpcManager = this.npcManagers.values().next().value || null;
    this.interactionManager = new InteractionManager(dummyNpcManager, this.questManager);

    // Zones
    this.loadAllZones();
  }

  // Initialisation de tous les npcManagers pour chaque zone
  private initializeNpcManagers() {
    const zones = ['beach', 'village', 'villagelab', 'villagehouse1', 'villageflorist'];
    zones.forEach(zoneName => {
      try {
        const mapPath = `../assets/maps/${zoneName}.tmj`;
        const npcManager = new NpcManager(mapPath);
        this.npcManagers.set(zoneName, npcManager);
        console.log(`✅ NPCs chargés pour ${zoneName}: ${npcManager.getAllNpcs().length}`);
      } catch (error) {
        console.warn(`⚠️ Impossible de charger les NPCs pour ${zoneName}:`, error);
      }
    });
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
      
      // Envoyer les statuts de quêtes pour les NPCs de cette zone
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

  // ============= NOUVEAU : TOUTE INTERACTION NPC PASSE PAR InteractionManager =============
  async handleNpcInteraction(client: Client, npcId: number) {
    console.log(`💬 === NPC INTERACTION HANDLER (via InteractionManager) ===`);

    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) {
      client.send("npcInteractionResult", { type: "error", message: "Joueur non trouvé" });
      return;
    }

    const npcManager = this.npcManagers.get(player.currentZone);
    if (!npcManager) {
      client.send("npcInteractionResult", { type: "error", message: "NPCs non disponibles dans cette zone" });
      return;
    }

    // 🟢 ON PASSE LE BON npcManager À L’INTERACTIONMANAGER
    this.interactionManager.npcManager = npcManager;

    // Toute la logique, logs, progression, etc., est dans InteractionManager.handleNpcInteraction
    const result = await this.interactionManager.handleNpcInteraction(player, npcId);

    // Log général du retour
    console.log(`[ZoneManager] Résultat interaction:`, result);

    // Renvoi au client
    client.send("npcInteractionResult", result);
  }

  // ============= TOUT LE RESTE RESTE PAREIL =============

  // Envoie les statuts de quêtes pour la zone (affichage sur NPC)
  private async sendQuestStatusesForZone(client: Client, zoneName: string) {
    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) return;

    const npcManager = this.npcManagers.get(zoneName);
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

  // Optimisé : statut de quête d’un NPC
  private async getQuestStatusForNpc(username: string, npc: any) {
    if (!npc.properties?.questId) {
      return { type: 'noQuest' };
    }

    const questId = npc.properties.questId;
    const availableQuests = await this.questManager.getAvailableQuests(username);
    const availableQuest = availableQuests.find(q => q.id === questId);
    if (availableQuest) {
      return { type: 'questAvailable', quests: [availableQuest] };
    }

    const activeQuests = await this.questManager.getActiveQuests(username);
    const activeQuest = activeQuests.find(q => q.id === questId);
    if (activeQuest) {
      if (this.isQuestReadyToComplete(activeQuest)) {
        return { type: 'questReadyToComplete', questId, quest: activeQuest };
      } else {
        return { type: 'questInProgress', quest: activeQuest };
      }
    }
    return { type: 'noQuest' };
  }

  private isQuestReadyToComplete(quest: any): boolean {
    const currentStep = quest.steps[quest.currentStepIndex];
    if (!currentStep) return false;
    return currentStep.objectives.every((obj: any) => obj.completed);
  }

  // Délégations QuestManager
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
        await this.sendQuestStatusesForZone(client, player.currentZone);
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

  async getActiveQuests(username: string): Promise<any[]> {
    try {
      return await this.questManager.getActiveQuests(username);
    } catch (error) {
      console.error(`❌ Erreur getActiveQuests:`, error);
      return [];
    }
  }

  async getAvailableQuests(username: string): Promise<any[]> {
    try {
      return await this.questManager.getAvailableQuests(username);
    } catch (error) {
      console.error(`❌ Erreur getAvailableQuests:`, error);
      return [];
    }
  }

  async updateQuestProgress(username: string, event: QuestProgressEvent): Promise<any[]> {
    try {
      return await this.questManager.updateQuestProgress(username, event);
    } catch (error) {
      console.error(`❌ Erreur updateQuestProgress:`, error);
      return [];
    }
  }

  async getQuestStatuses(username: string): Promise<any[]> {
    try {
      const availableQuests = await this.questManager.getAvailableQuests(username);
      const activeQuests = await this.questManager.getActiveQuests(username);
      const questStatuses: any[] = [];
      for (const quest of availableQuests) {
        if (quest.startNpcId) {
          questStatuses.push({
            npcId: quest.startNpcId,
            type: 'questAvailable'
          });
        }
      }
      for (const quest of activeQuests) {
        if (quest.currentStepIndex >= quest.steps.length && quest.endNpcId) {
          questStatuses.push({
            npcId: quest.endNpcId,
            type: 'questReadyToComplete'
          });
        } else if (quest.endNpcId) {
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
