// ===== server/src/rooms/zones/LavandiaBossRoomZone.ts =====
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

export class LavandiaBossRoomZone implements IZone {
  private room: WorldRoom;
  private npcs: NPC[] = [];

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`👹 === LAVANDIA BOSS ROOM ZONE INIT ===`);
    
    this.setupNPCs();
    this.setupEvents();
    
    console.log(`✅ LavandiaBossRoomZone initialisée`);
  }

  private setupNPCs() {
    console.log(`🤖 Setup Boss Room NPCs...`);
    
    this.npcs = [];

    console.log(`✅ ${this.npcs.length} NPCs Boss Room configurés`);
  }

  private setupEvents() {
    console.log(`⚡ Setup Boss Room events...`);
    console.log(`✅ Boss Room events configurés`);
  }

  async onPlayerEnter(client: Client) {
    console.log(`👹 === PLAYER ENTER BOSS ROOM ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} entre dans la salle du boss`);

    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "bossroom",
      ...zoneData
    });

    client.send("npcList", this.npcs);

    console.log(`📤 Données Boss Room envoyées à ${player.name}`);
  }

  onPlayerLeave(client: Client) {
    console.log(`👹 === PLAYER LEAVE BOSS ROOM ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte la salle du boss`);
    }
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`👹 === BOSS ROOM NPC INTERACTION ===`);
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
    console.log(`👹 === BOSS ROOM QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);

    client.send("questStartResult", {
      success: false,
      message: "Pas de quêtes disponibles dans la salle du boss pour le moment"
    });
  }

  getZoneData() {
    return {
      npcs: this.npcs,
      objects: [] as ZoneObject[],
      spawns: [] as Spawn[],
      music: "boss_theme",
      weather: "dark"
    };
  }
}