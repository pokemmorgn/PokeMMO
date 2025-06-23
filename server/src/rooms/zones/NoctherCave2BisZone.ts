// ===== server/src/rooms/zones/NoctherCave2BisZone.ts =====
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

export class NoctherCave2BisZone implements IZone {
  private room: WorldRoom;
  private npcs: NPC[] = [];

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🕳️ === NOCTHER CAVE 2 BIS ZONE INIT ===`);
    
    this.setupNPCs();
    this.setupEvents();
    
    console.log(`✅ NoctherCave2BisZone initialisée`);
  }

  private setupNPCs() {
    console.log(`🤖 Setup Nocther Cave 2 Bis NPCs...`);
    
    this.npcs = [];

    console.log(`✅ ${this.npcs.length} NPCs Nocther Cave 2 Bis configurés`);
  }

  private setupEvents() {
    console.log(`⚡ Setup Nocther Cave 2 Bis events...`);
    console.log(`✅ Nocther Cave 2 Bis events configurés`);
  }

  async onPlayerEnter(client: Client) {
    console.log(`🕳️ === PLAYER ENTER NOCTHER CAVE 2 BIS ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} entre dans la grotte Nocther 2 Bis`);

    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "nocthercave2bis",
      ...zoneData
    });

    client.send("npcList", this.npcs);

    console.log(`📤 Données Nocther Cave 2 Bis envoyées à ${player.name}`);
  }

  onPlayerLeave(client: Client) {
    console.log(`🕳️ === PLAYER LEAVE NOCTHER CAVE 2 BIS ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte la grotte Nocther 2 Bis`);
    }
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`🕳️ === NOCTHER CAVE 2 BIS NPC INTERACTION ===`);
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
    console.log(`🕳️ === NOCTHER CAVE 2 BIS QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);

    client.send("questStartResult", {
      success: false,
      message: "Pas de quêtes disponibles dans la grotte Nocther 2 Bis pour le moment"
    });
  }

  getZoneData() {
    return {
      npcs: this.npcs,
      objects: [] as ZoneObject[],
      spawns: [] as Spawn[],
      music: "cave_theme",
      weather: "dark"
    };
  }
}