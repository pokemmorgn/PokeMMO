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
import { InteractionManager } from "./InteractionManager";
import { QuestManager } from "./QuestManager";

export class ZoneManager {
  private zones = new Map<string, IZone>();
  private room: WorldRoom;
  
  // ✅ AJOUT DES MANAGERS POUR LES INTERACTIONS
  private interactionManager: InteractionManager;
  private questManager: QuestManager;

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🗺️ === ZONE MANAGER INIT ===`);
    
    // ✅ INITIALISER LES MANAGERS D'INTERACTION
    this.initializeInteractionManagers();
    
    this.loadAllZones();
  }

  // ✅ NOUVELLE MÉTHODE : Initialiser les managers d'interaction
  private initializeInteractionManagers() {
    try {
      // Utiliser le même système que BaseRoom
      this.questManager = new QuestManager(`../data/quests/quests.json`);
      
      // L'InteractionManager a besoin d'un NpcManager, on prendra celui de la zone courante
      // Pour l'instant, on crée avec un placeholder
      const placeholderNpcManager = this.room.getNpcManager("beach"); // Fallback
      this.interactionManager = new InteractionManager(placeholderNpcManager, this.questManager);
      
      console.log(`✅ Managers d'interaction initialisés`);
    } catch (error) {
      console.error(`❌ Erreur initialisation managers d'interaction:`, error);
    }
  }

  private loadAllZones() {
    console.log(`🏗️ Chargement des zones...`);

    // Charger toutes les zones
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

    // Vérifier que la zone de destination existe
    const targetZone = this.zones.get(toZone);
    if (!targetZone) {
      console.error(`❌ Zone de destination inconnue: ${toZone}`);
      client.send("transitionResult", { success: false, reason: "Zone not found" });
      return;
    }

    try {
      // Sortir de l'ancienne zone
      if (fromZone && fromZone !== toZone) {
        console.log(`📤 Sortie de zone: ${fromZone}`);
        this.onPlayerLeaveZone(client, fromZone);
      }

      // Mettre à jour la position du joueur
      player.currentZone = toZone;
      player.map = toZone; // Compatibilité
      if (data.spawnX !== undefined) player.x = data.spawnX;
      if (data.spawnY !== undefined) player.y = data.spawnY;

      console.log(`📍 Position mise à jour: (${player.x}, ${player.y}) dans ${toZone}`);

      // Entrer dans la nouvelle zone
      console.log(`📥 Entrée dans zone: ${toZone}`);
      await this.onPlayerJoinZone(client, toZone);

      // Confirmer la transition
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
      
      // ✅ ENVOYER LES NPCS DEPUIS WORLDROOM
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

  // ✅ CORRECTION MAJEURE : Gestion des interactions NPC
async handleNpcInteraction(client: Client, npcId: number) {
  console.log(`💬 === NPC INTERACTION HANDLER ===`);
  
  const player = this.room.state.players.get(client.sessionId) as Player;
  if (!player) {
    console.error(`❌ Player not found: ${client.sessionId}`);
    return;
  }

  const npcManager = this.room.getNpcManager(player.currentZone);
  if (!npcManager) {
    console.error(`❌ NPCManager not found for zone: ${player.currentZone}`);
    return;
  }

  const npc = npcManager.getNpcById(npcId);
  if (!npc) {
    console.error(`❌ NPC not found: ${npcId}`);
    return;
  }

  // ✅ NOUVELLE LOGIQUE : Vérifier les quêtes d'abord
  if (npc.properties?.questId) {
    const availableQuests = await this.questManager.getAvailableQuests(player.name);
    const npcQuest = availableQuests.find(q => q.id === npc.properties.questId);
    
    if (npcQuest) {
      // ✅ Proposer la quête
      client.send("npcInteractionResult", {
        type: "questGiver",
        availableQuests: [npcQuest],
        npcId: npcId
      });
      return;
    }
  }

  // ✅ Dialogue normal si pas de quête
  const dialogueLines = ["Bonjour ! Comment allez-vous ?"]; // TODO: Récupérer depuis dialogueId
  
  client.send("npcInteractionResult", {
    type: "dialogue",
    lines: dialogueLines,
    npcId: npcId
  });
}

    // ✅ RÉCUPÉRER LE NPCMANAGER DE LA ZONE ACTUELLE
    const npcManager = this.room.getNpcManager(player.currentZone);
    if (!npcManager) {
      console.error(`❌ NPCManager not found for zone: ${player.currentZone}`);
      client.send("npcInteractionResult", {
        type: "error",
        message: "NPCs non disponibles dans cette zone"
      });
      return;
    }

    // ✅ VÉRIFIER QUE LE NPC EXISTE
    const npc = npcManager.getNpcById(npcId);
    if (!npc) {
      console.error(`❌ NPC not found: ${npcId} in zone: ${player.currentZone}`);
      client.send("npcInteractionResult", {
        type: "error",
        message: "NPC introuvable"
      });
      return;
    }

    console.log(`💬 Interaction avec NPC: ${npc.name} dans ${player.currentZone}`);

    try {
      // ✅ UTILISER LE SYSTÈME D'INTERACTION COMME BASEROOM
      // Mettre à jour l'InteractionManager avec le bon NpcManager
      this.interactionManager = new InteractionManager(npcManager, this.questManager);
      
      const result = await this.interactionManager.handleNpcInteraction(player, npcId);
      
      client.send("npcInteractionResult", { 
        ...result, 
        npcId: npcId 
      });
      
      console.log(`✅ Interaction NPC ${npcId} réussie pour ${player.name}`);
      
    } catch (error) {
      console.error(`❌ Erreur interaction NPC ${npcId}:`, error);
      client.send("npcInteractionResult", {
        type: "error",
        message: "Erreur lors de l'interaction avec le NPC"
      });
    }
  }

  // ✅ CORRECTION : Gestion des quêtes
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
      // ✅ UTILISER LE SYSTÈME DE QUÊTES COMME BASEROOM
      const result = await this.interactionManager.handleQuestStart(player.name, questId);
      
      client.send("questStartResult", result);
      
      if (result.success) {
        // Broadcaster aux autres joueurs
        this.broadcastToZone(player.currentZone, "questUpdate", {
          player: player.name,
          action: "started",
          questId: questId
        });
      }
      
      console.log(`✅ Quête ${questId} démarrée pour ${player.name}: ${result.success}`);
      
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
    
    const playersInZone = this.getPlayersInZone(zoneName);
    
    // Obtenir les clients dans cette zone
    const clientsInZone = this.room.clients.filter(client => {
      const player = this.room.state.players.get(client.sessionId) as Player;
      return player && player.currentZone === zoneName;
    });
    
    // Broadcaster à tous les clients de la zone
    clientsInZone.forEach(client => {
      client.send(message, data);
    });
    
    console.log(`📤 Message envoyé à ${clientsInZone.length} clients dans ${zoneName}`);
  }
}
