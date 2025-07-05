// ===== server/src/rooms/zones/WreaithmoorManor1Zone.ts =====
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

export class WraithmoorManor1Zone implements IZone {
  private room: WorldRoom;
  private npcs: NPC[] = [];

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🏚️ === WREAITHMOOR MANOR 1 ZONE INIT ===`);
    
    this.setupNPCs();
    this.setupEvents();
    
    console.log(`✅ WreaithmoorManor1Zone initialisée`);
  }

  private setupNPCs() {
    console.log(`👻 Setup Manoir Spectral NPCs...`);
    
    this.npcs = [];
    console.log(`✅ ${this.npcs.length} NPCs Manoir Spectral configurés`);
  }

  private setupEvents() {
    console.log(`⚡ Setup Manoir Spectral events...`);
    console.log(`✅ Manoir Spectral events configurés`);
  }

  async onPlayerEnter(client: Client) {
    console.log(`🏚️ === PLAYER ENTER WREAITHMOOR MANOR 1 ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} entre dans le Manoir Spectral`);
    
    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "wreaithmoormanor1",
      ...zoneData
    });

    client.send("npcList", this.npcs);

    console.log(`📤 Données Manoir Spectral envoyées à ${player.name}`);
  }

  onPlayerLeave(client: Client) {
    console.log(`🏚️ === PLAYER LEAVE WREAITHMOOR MANOR 1 ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    
    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte le Manoir Spectral`);
    }
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`🏚️ === MANOR NPC INTERACTION ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`👻 NPC ID: ${npcId}`);
    
    const npc = this.npcs.find(n => n.id === npcId);
    if (!npc) {
      console.error(`❌ NPC not found: ${npcId}`);
      client.send("npcInteractionResult", {
        type: "error",
        message: "Esprit introuvable"
      });
      return;
    }

    console.log(`💬 Interaction avec NPC spectral: ${npc.name}`);
    
    client.send("npcInteractionResult", {
      type: "dialogue",
      npcId: npcId,
      npcName: npc.name,
      lines: npc.dialogue
    });

    console.log(`✅ Dialogue spectral envoyé pour ${npc.name}`);
  }

  onQuestStart(client: Client, questId: string) {
    console.log(`🏚️ === MANOR QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);
    
    client.send("questStartResult", {
      success: false,
      message: "Pas de quêtes disponibles dans le Manoir Spectral pour le moment"
    });
  }

  getZoneData() {
    return {
      npcs: this.npcs,
      objects: [] as ZoneObject[],
      spawns: [] as Spawn[],
      music: "haunted_manor_theme",
      weather: "supernatural"
    };
  }
}
