// ===== server/src/rooms/zones/VillageFloristZone.ts =====
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

export class VillageFloristZone implements IZone {
  private room: WorldRoom;
  private npcs: NPC[] = [];

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🌸 === VILLAGE FLORIST ZONE INIT ===`);
    
    this.setupNPCs();
    this.setupEvents();
    
    console.log(`✅ VillageFloristZone initialisée`);
  }

  private setupNPCs() {
    console.log(`🤖 Setup Village Florist NPCs...`);
    
    this.npcs = [];

    console.log(`✅ ${this.npcs.length} NPCs Village Florist configurés`);
  }

  private setupEvents() {
    console.log(`⚡ Setup Village Florist events...`);
    console.log(`✅ Village Florist events configurés`);
  }

  async onPlayerEnter(client: Client) {
    console.log(`🌸 === PLAYER ENTER VILLAGE FLORIST ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} entre chez le fleuriste du village`);

    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "villageflorist",
      ...zoneData
    });

    client.send("npcList", this.npcs);

    console.log(`📤 Données Village Florist envoyées à ${player.name}`);
  }

  onPlayerLeave(client: Client) {
    console.log(`🌸 === PLAYER LEAVE VILLAGE FLORIST ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte le fleuriste du village`);
    }
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`🌸 === VILLAGE FLORIST NPC INTERACTION ===`);
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
    console.log(`🌸 === VILLAGE FLORIST QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);

    client.send("questStartResult", {
      success: false,
      message: "Pas de quêtes disponibles chez le fleuriste du village pour le moment"
    });
  }

  getZoneData() {
    return {
      npcs: this.npcs,
      objects: [] as ZoneObject[],
      spawns: [] as Spawn[],
      music: "shop_theme",
      weather: "indoor"
    };
  }
}