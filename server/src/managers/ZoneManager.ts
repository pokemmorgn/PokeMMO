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
      // ✅ LOGIQUE DE QUÊTES : Vérifier si le NPC a une quête à donner
      if (npc.properties?.questId) {
        console.log(`🎯 NPC ${npc.name} a une quête: ${npc.properties.questId}`);
        
        const availableQuests = await this.questManager.getAvailableQuests(player.name);
        const npcQuest = availableQuests.find(q => q.id === npc.properties.questId);
        
        if (npcQuest) {
          console.log(`✅ Quête ${npcQuest.id} disponible pour ${player.name}`);
          
          client.send("npcInteractionResult", {
            type: "questGiver",
            availableQuests: [npcQuest],
            npcId: npcId,
            npcName: npc.name
          });
          return;
        } else {
          console.log(`⚠️ Quête ${npc.properties.questId} non disponible pour ${player.name}`);
        }
      }

      // ✅ DIALOGUE NORMAL si pas de quête disponible
      const dialogueLines = this.getDialogueForNpc(npc);
      
      client.send("npcInteractionResult", {
        type: "dialogue",
        lines: dialogueLines,
        npcId: npcId,
        npcName: npc.name
      });
      
      console.log(`✅ Dialogue envoyé pour ${npc.name}`);
      
    } catch (error) {
      console.error(`❌ Erreur interaction NPC ${npcId}:`, error);
      client.send("npcInteractionResult", {
        type: "error",
        message: "Erreur lors de l'interaction avec le NPC"
      });
    }
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

  // ✅ GESTION DES QUÊTES
  async handleQuestStart(client: Client, questId: string) {
    console.log(`🎯 === QUEST START HANDLER ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest ID: ${questId}`);
    
    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      client.send("questStartResult", {
        success: false,
        message: "Joueur non trouvé"
      });
      return;
    }

    try {
      const quest = await this.questManager.startQuest(player.name, questId);
      
      if (quest) {
        client.send("questStartResult", {
          success: true,
          quest: quest,
          message: `Quête "${quest.name}" démarrée !`
        });
        
        // Broadcaster aux autres joueurs
        this.broadcastToZone(player.currentZone, "questUpdate", {
          player: player.name,
          action: "started",
          questId: questId
        });
        
        console.log(`✅ Quête ${questId} démarrée pour ${player.name}`);
      } else {
        client.send("questStartResult", {
          success: false,
          message: "Impossible de démarrer cette quête"
        });
      }
      
    } catch (error) {
      console.error(`❌ Erreur démarrage quête ${questId}:`, error);
      client.send("questStartResult", {
        success: false,
        message: "Erreur lors du démarrage de la quête"
      });
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
