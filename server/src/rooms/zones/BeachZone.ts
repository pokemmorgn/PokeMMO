// ===== server/src/rooms/zones/BeachZone.ts =====
import { Client } from "@colyseus/core";
import { IZone } from "./IZone";
import { WorldRoom } from "../WorldRoom";

interface ZoneObject {
  id: number;
  type: string;
  x: number;
  y: number;
}

interface Spawn {
  name: string;
  x: number;
  y: number;
}

export class BeachZone implements IZone {
  private room: WorldRoom;

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🏖️ === BEACH ZONE INIT ===`);
    
    this.setupEvents();
    
    console.log(`✅ BeachZone initialisée`);
  }

  private setupEvents() {
    console.log(`⚡ Setup Beach events...`);
    // TODO: Events spécifiques à la plage (spawns d'objets, météo, etc.)
    console.log(`✅ Beach events configurés`);
  }

  async onPlayerEnter(client: Client) {
    console.log(`🏖️ === PLAYER ENTER BEACH ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} entre sur la plage`);

    // Envoyer les données de la zone (musique, météo, spawns)
    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "beach",
      ...zoneData
    });

    // ✅ LES NPCS SONT MAINTENANT GÉRÉS PAR WORLDROOM
    // Ils seront envoyés automatiquement par WorldRoom.onPlayerJoinZone()

    console.log(`📤 Données Beach envoyées à ${player.name}`);
  }

  onPlayerLeave(client: Client) {
    console.log(`🏖️ === PLAYER LEAVE BEACH ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte la plage`);
    }

    // Cleanup si nécessaire (effets spéciaux, timers, etc.)
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`🏖️ === BEACH NPC INTERACTION ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`🤖 NPC ID: ${npcId}`);

    // ✅ LES INTERACTIONS SONT GÉRÉES PAR LE SYSTÈME EXISTANT
    // Cette méthode existe pour l'interface IZone mais délègue au système global
    console.log(`➡️ Délégation de l'interaction NPC ${npcId} au système global`);
  }

  onQuestStart(client: Client, questId: string) {
    console.log(`🏖️ === BEACH QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);

    // ✅ LES QUÊTES SONT GÉRÉES PAR LE SYSTÈME EXISTANT
    console.log(`➡️ Délégation de la quête ${questId} au système global`);
  }

  getZoneData() {
    return {
      // ✅ PLUS BESOIN DE npcs ICI, GÉRÉ PAR WORLDROOM
      objects: [
        { id: 1, type: "seashell", x: 150, y: 250 },
        { id: 2, type: "driftwood", x: 400, y: 180 },
        { id: 3, type: "beach_ball", x: 320, y: 200 }
      ] as ZoneObject[],
      spawns: [
        { name: "fromVillage", x: 52, y: 48 },
        { name: "beachCenter", x: 200, y: 200 },
        { name: "pier", x: 100, y: 150 }
      ] as Spawn[],
      music: "beach_theme",
      weather: "sunny",
      ambientSounds: ["waves", "seagulls"],
      timeOfDay: "day"
    };
  }
}
