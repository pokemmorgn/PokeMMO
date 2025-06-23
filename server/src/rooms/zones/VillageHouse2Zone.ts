// ===== server/src/rooms/zones/VillageHouse2Zone.ts =====
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

export class VillageHouse2Zone implements IZone {
  private room: WorldRoom;
  private npcs: NPC[] = [];

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🏠 === VILLAGE HOUSE 2 ZONE INIT ===`);
    
    this.setupNPCs();
    this.setupEvents();
    
    console.log(`✅ VillageHouse2Zone initialisée`);
  }

  private setupNPCs() {
    console.log(`🤖 Setup Village House 2 NPCs...`);
    
    this.npcs = [];

    console.log(`✅ ${this.npcs.length} NPCs Village House 2 configurés`);
  }

  private setupEvents() {
    console.log(`⚡ Setup Village House 2 events...`);
    console.log(`✅ Village House 2 events configurés`);
  }

  async onPlayerEnter(client: Client) {
    console.log(`🏠 === PLAYER ENTER VILLAGE HOUSE 2 ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} entre dans la maison 2 du village`);

    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "villagehouse2",
      ...zoneData
    });

    client.send("npcList", this.npcs);

    console.log(`📤 Données Village House 2 envoyées à ${player.name}`);
  }

  onPlayerLeave(client: Client) {
    console.log(`🏠 === PLAYER LEAVE VILLAGE HOUSE 2 ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte la maison 2 du village`);
    }
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`🏠 === VILLAGE HOUSE 2 NPC INTERACTION ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`🤖 NPC ID: ${npcId}`);

    const npc = this.npcs.find(n => n.id === npcId);
    if (!npc) {
      console.error(`❌ NPC not found: ${npcId}`);
      client.send("npcInteractionResult", {
        type: "error",
        message: "NPC introuvable"
      });
      return;
    }

    console.log(`💬 Interaction avec NPC: ${npc.name}`);

    client.send("npcInteractionResult", {
      type: "dialogue",
      npcId: npcId,
      npcName: npc.name,
      lines: npc.dialogue
    });

    console.log(`✅ Dialogue envoyé pour ${npc.name}`);
  }

  onQuestStart(client: Client, questId: string) {
    console.log(`🏠 === VILLAGE HOUSE 2 QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);

    client.send("questStartResult", {
      success: false,
      message: "Pas de quêtes disponibles dans la maison 2 du village pour le moment"
    });
  }

  getZoneData() {
    return {
      npcs: this.npcs,
      objects: [] as ZoneObject[],
      spawns: [] as Spawn[],
      music: "house_theme",
      weather: "indoor"
    };
  }
}