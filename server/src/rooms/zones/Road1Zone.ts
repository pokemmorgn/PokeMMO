// ===== server/src/rooms/zones/Road1Zone.ts =====
import { Client } from "@colyseus/core";
import { IZone } from "./IZone";
import { WorldRoom } from "../WorldRoom";

interface NPC {
  id: number;
  name: string;
  x: number;
  y: number;
  sprite: string;
  dialogue: string[];
}

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

export class Road1Zone implements IZone {
  private room: WorldRoom;
  private npcs: NPC[] = [];

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🛣️ === ROAD 1 ZONE INIT ===`);
    
    this.setupNPCs();
    this.setupEvents();
    
    console.log(`✅ Road1Zone initialisée`);
  }

  private setupNPCs() {
    console.log(`🤖 Setup Road 1 NPCs...`);
    
    this.npcs = [];

    console.log(`✅ ${this.npcs.length} NPCs Road 1 configurés`);
  }

  private setupEvents() {
    console.log(`⚡ Setup Road 1 events...`);
    console.log(`✅ Road 1 events configurés`);
  }

  async onPlayerEnter(client: Client) {
    console.log(`🛣️ === PLAYER ENTER ROAD 1 ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} entre sur la route 1`);

    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "road1",
      ...zoneData
    });

    // ✅ SUPPRIMÉ LE CONFLIT: Plus d'envoi de NPCs ici
    // ✅ LES NPCS SONT MAINTENANT GÉRÉS PAR WORLDROOM
    // Ils seront envoyés automatiquement par WorldRoom.onPlayerJoinZone()

    console.log(`📤 Données Road 1 envoyées à ${player.name}`);
  }

  onPlayerLeave(client: Client) {
    console.log(`🛣️ === PLAYER LEAVE ROAD 1 ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte la route 1`);
    }
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`🛣️ === ROAD 1 NPC INTERACTION ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`🤖 NPC ID: ${npcId}`);

    // ✅ LES INTERACTIONS SONT GÉRÉES PAR LE SYSTÈME EXISTANT
    // Cette méthode existe pour l'interface IZone mais délègue au système global
    console.log(`➡️ Délégation de l'interaction NPC ${npcId} au système global`);
  }

  onQuestStart(client: Client, questId: string) {
    console.log(`🛣️ === ROAD 1 QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);

    // ✅ LES QUÊTES SONT GÉRÉES PAR LE SYSTÈME EXISTANT
    console.log(`➡️ Délégation de la quête ${questId} au système global`);
  }

  getZoneData() {
    return {
      // ✅ PLUS BESOIN DE npcs ICI, GÉRÉ PAR WORLDROOM
      objects: [] as ZoneObject[],
      spawns: [] as Spawn[],
      music: "road_theme",
      weather: "outdoor"
    };
  }
}
