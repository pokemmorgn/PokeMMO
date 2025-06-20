// ===== server/src/managers/ZoneManager.ts =====
import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom"; // Chemin corrigé
import { IZone } from "../rooms/zones/IZone"; // Chemin corrigé
import { BeachZone } from "../rooms/zones/BeachZone"; // Chemin corrigé
import { VillageZone } from "../rooms/zones/VillageZone"; // Chemin corrigé
import { VillageLabZone } from "../rooms/zones/VillageLabZone"; // Chemin corrigé
import { Player } from "../schema/PokeWorldState"; // Import du type Player
export class ZoneManager {
  private zones = new Map<string, IZone>();
  private room: WorldRoom;

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🗺️ === ZONE MANAGER INIT ===`);
    
    this.loadAllZones();
  }

  private loadAllZones() {
    console.log(`🏗️ Chargement des zones...`);

    // Charger toutes les zones
    this.loadZone('beach', new BeachZone(this.room));
    this.loadZone('village', new VillageZone(this.room));
    this.loadZone('villagelab', new VillageLabZone(this.room));
    // TODO: Ajouter autres zones

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

  handleNpcInteraction(client: Client, npcId: number) {
    console.log(`💬 === NPC INTERACTION HANDLER ===`);
    
    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    const currentZone = this.zones.get(player.currentZone);
    if (currentZone) {
      console.log(`🤖 Delegating NPC interaction to zone: ${player.currentZone}`);
      currentZone.onNpcInteract(client, npcId);
    } else {
      console.error(`❌ Current zone not found: ${player.currentZone}`);
    }
  }

  handleQuestStart(client: Client, questId: string) {
    console.log(`🎯 === QUEST START HANDLER ===`);
    
    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    const currentZone = this.zones.get(player.currentZone);
    if (currentZone) {
      console.log(`📜 Delegating quest start to zone: ${player.currentZone}`);
      currentZone.onQuestStart(client, questId);
    } else {
      console.error(`❌ Current zone not found: ${player.currentZone}`);
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
  
  // Obtenir les clients dans cette zone (pas les IDs de session)
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
