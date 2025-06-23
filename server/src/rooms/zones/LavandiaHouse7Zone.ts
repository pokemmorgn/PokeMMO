// ===== server/src/rooms/zones/LavandiaHouse7Zone.ts =====
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

export class LavandiaHouse7Zone implements IZone {
  private room: WorldRoom;
  private npcs: NPC[] = [];

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🏠 === LAVANDIA HOUSE 7 ZONE INIT ===`);
    
    this.setupNPCs();
    this.setupEvents();
    
    console.log(`✅ LavandiaHouse7Zone initialisée`);
  }

  private setupNPCs() {
    console.log(`🤖 Setup House 7 NPCs...`);
    
    this.npcs = [];

    console.log(`✅ ${this.npcs.length} NPCs House 7 configurés`);
  }

  private setupEvents() {
    console.log(`⚡ Setup House 7 events...`);
    console.log(`✅ House 7 events configurés`);
  }

  async onPlayerEnter(client: Client) {
    console.log(`🏠 === PLAYER ENTER HOUSE 7 ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} entre dans la maison 7`);

    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "house7",
      ...zoneData
    });

    client.send("npcList", this.npcs);

    console.log(`📤 Données House 7 envoyées à ${player.name}`);
  }

  onPlayerLeave(client: Client) {
    console.log(`🏠 === PLAYER LEAVE HOUSE 7 ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte la maison 7`);
    }
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`🏠 === HOUSE 7 NPC INTERACTION ===`);
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
    console.log(`🏠 === HOUSE 7 QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);

    client.send("questStartResult", {
      success: false,
      message: "Pas de quêtes disponibles dans la maison 7 pour le moment"
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