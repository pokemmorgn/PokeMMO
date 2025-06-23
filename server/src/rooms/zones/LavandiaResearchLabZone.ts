// ===== server/src/rooms/zones/LavandiaResearchLabZone.ts =====
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

export class LavandiaResearchLabZone implements IZone {
  private room: WorldRoom;
  private npcs: NPC[] = [];

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🔬 === LAVANDIA RESEARCH LAB ZONE INIT ===`);
    
    this.setupNPCs();
    this.setupEvents();
    
    console.log(`✅ LavandiaResearchLabZone initialisée`);
  }

  private setupNPCs() {
    console.log(`🤖 Setup Research Lab NPCs...`);
    
    this.npcs = [];

    console.log(`✅ ${this.npcs.length} NPCs Research Lab configurés`);
  }

  private setupEvents() {
    console.log(`⚡ Setup Research Lab events...`);
    console.log(`✅ Research Lab events configurés`);
  }

  async onPlayerEnter(client: Client) {
    console.log(`🔬 === PLAYER ENTER RESEARCH LAB ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} entre dans le laboratoire de recherche`);

    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "researchlab",
      ...zoneData
    });

    client.send("npcList", this.npcs);

    console.log(`📤 Données Research Lab envoyées à ${player.name}`);
  }

  onPlayerLeave(client: Client) {
    console.log(`🔬 === PLAYER LEAVE RESEARCH LAB ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte le laboratoire de recherche`);
    }
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`🔬 === RESEARCH LAB NPC INTERACTION ===`);
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
    console.log(`🔬 === RESEARCH LAB QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);

    client.send("questStartResult", {
      success: false,
      message: "Pas de quêtes disponibles dans le laboratoire de recherche pour le moment"
    });
  }

  getZoneData() {
    return {
      npcs: this.npcs,
      objects: [] as ZoneObject[],
      spawns: [] as Spawn[],
      music: "lab_theme",
      weather: "sterile"
    };
  }
}