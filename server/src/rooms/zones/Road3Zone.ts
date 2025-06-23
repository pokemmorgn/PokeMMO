// ===== server/src/rooms/zones/Road3Zone.ts =====
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

export class Road3Zone implements IZone {
  private room: WorldRoom;
  private npcs: NPC[] = [];

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🛣️ === ROAD 3 ZONE INIT ===`);
    
    this.setupNPCs();
    this.setupEvents();
    
    console.log(`✅ Road3Zone initialisée`);
  }

  private setupNPCs() {
    console.log(`🤖 Setup Road 3 NPCs...`);
    
    this.npcs = [];

    console.log(`✅ ${this.npcs.length} NPCs Road 3 configurés`);
  }

  private setupEvents() {
    console.log(`⚡ Setup Road 3 events...`);
    console.log(`✅ Road 3 events configurés`);
  }

  async onPlayerEnter(client: Client) {
    console.log(`🛣️ === PLAYER ENTER ROAD 3 ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} entre sur la route 3`);

    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "road3",
      ...zoneData
    });

    client.send("npcList", this.npcs);

    console.log(`📤 Données Road 3 envoyées à ${player.name}`);
  }

  onPlayerLeave(client: Client) {
    console.log(`🛣️ === PLAYER LEAVE ROAD 3 ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte la route 3`);
    }
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`🛣️ === ROAD 3 NPC INTERACTION ===`);
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
    console.log(`🛣️ === ROAD 3 QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);

    client.send("questStartResult", {
      success: false,
      message: "Pas de quêtes disponibles sur la route 3 pour le moment"
    });
  }

  getZoneData() {
    return {
      npcs: this.npcs,
      objects: [] as ZoneObject[],
      spawns: [] as Spawn[],
      music: "road_theme",
      weather: "outdoor"
    };
  }
}
