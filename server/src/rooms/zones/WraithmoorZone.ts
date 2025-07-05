// ===== server/src/rooms/zones/WraithmoorZone.ts =====
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

export class WraithmoorZone implements IZone {
  private room: WorldRoom;
  private npcs: NPC[] = [];

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`👻 === WRAITHMOOR ZONE INIT ===`);
    
    this.setupNPCs();
    this.setupEvents();
    
    console.log(`✅ WraithmoorZone initialisée`);
  }

  private setupNPCs() {
    console.log(`👻 Setup Landes Spectrales NPCs...`);
    
    this.npcs = [];
    console.log(`✅ ${this.npcs.length} NPCs Landes Spectrales configurés`);
  }

  private setupEvents() {
    console.log(`⚡ Setup Landes Spectrales events...`);
    console.log(`✅ Landes Spectrales events configurés`);
  }

  async onPlayerEnter(client: Client) {
    console.log(`👻 === PLAYER ENTER WRAITHMOOR ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} entre dans les Landes Spectrales`);
    
    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "wraithmoor",
      ...zoneData
    });

    client.send("npcList", this.npcs);

    console.log(`📤 Données Landes Spectrales envoyées à ${player.name}`);
  }

  onPlayerLeave(client: Client) {
    console.log(`👻 === PLAYER LEAVE WRAITHMOOR ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    
    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte les Landes Spectrales`);
    }
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`👻 === WRAITHMOOR NPC INTERACTION ===`);
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
    console.log(`👻 === WRAITHMOOR QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);
    
    client.send("questStartResult", {
      success: false,
      message: "Pas de quêtes disponibles dans les Landes Spectrales pour le moment"
    });
  }

  getZoneData() {
    return {
      npcs: this.npcs,
      objects: [] as ZoneObject[],
      spawns: [] as Spawn[],
      music: "wraithmoor_theme",
      weather: "supernatural"
    };
  }
}
