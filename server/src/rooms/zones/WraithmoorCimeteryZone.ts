// ===== server/src/rooms/zones/WraithmoorCimeteryZone.ts =====
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

export class WraithmoorCimeteryZone implements IZone {
  private room: WorldRoom;
  private npcs: NPC[] = [];

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`⚰️ === WRAITHMOOR CIMETERY ZONE INIT ===`);
    
    this.setupNPCs();
    this.setupEvents();
    
    console.log(`✅ WraithmoorCimeteryZone initialisée`);
  }

  private setupNPCs() {
    console.log(`⚰️ Setup Cimetière NPCs...`);
    
    this.npcs = [];
    console.log(`✅ ${this.npcs.length} NPCs Cimetière configurés`);
  }

  private setupEvents() {
    console.log(`⚡ Setup Cimetière events...`);
    console.log(`✅ Cimetière events configurés`);
  }

  async onPlayerEnter(client: Client) {
    console.log(`⚰️ === PLAYER ENTER WRAITHMOOR CIMETERY ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} entre dans le Cimetière`);
    
    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "wraithmoorcimetery",
      ...zoneData
    });

    client.send("npcList", this.npcs);

    console.log(`📤 Données Cimetière envoyées à ${player.name}`);
  }

  onPlayerLeave(client: Client) {
    console.log(`⚰️ === PLAYER LEAVE WRAITHMOOR CIMETERY ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    
    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte le Cimetière`);
    }
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`⚰️ === CIMETERY NPC INTERACTION ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`👻 NPC ID: ${npcId}`);
    
    const npc = this.npcs.find(n => n.id === npcId);
    if (!npc) {
      console.error(`❌ NPC not found: ${npcId}`);
      client.send("npcInteractionResult", {
        type: "error",
        message: "Gardien introuvable"
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
    console.log(`⚰️ === CIMETERY QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);
    
    client.send("questStartResult", {
      success: false,
      message: "Pas de quêtes disponibles dans le Cimetière pour le moment"
    });
  }

  getZoneData() {
    return {
      npcs: this.npcs,
      objects: [] as ZoneObject[],
      spawns: [] as Spawn[],
      music: "cimetery_theme",
      weather: "supernatural"
    };
  }
}
