// ===== server/src/rooms/zones/LavandiaEquipmentZone.ts =====
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

export class LavandiaEquipmentZone implements IZone {
  private room: WorldRoom;
  private npcs: NPC[] = [];

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`⚔️ === LAVANDIA EQUIPMENT ZONE INIT ===`);
    
    this.setupNPCs();
    this.setupEvents();
    
    console.log(`✅ LavandiaEquipementZone initialisée`);
  }

  private setupNPCs() {
    console.log(`🤖 Setup Equipement NPCs...`);
    
    this.npcs = [];

    console.log(`✅ ${this.npcs.length} NPCs Equipement configurés`);
  }

  private setupEvents() {
    console.log(`⚡ Setup Equipement events...`);
    console.log(`✅ Equipement events configurés`);
  }

  async onPlayerEnter(client: Client) {
    console.log(`⚔️ === PLAYER ENTER EQUIPEMENT ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} entre dans la zone d'équipement`);

    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "equipement",
      ...zoneData
    });

    client.send("npcList", this.npcs);

    console.log(`📤 Données Equipement envoyées à ${player.name}`);
  }

  onPlayerLeave(client: Client) {
    console.log(`⚔️ === PLAYER LEAVE EQUIPEMENT ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte la zone d'équipement`);
    }
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`⚔️ === EQUIPEMENT NPC INTERACTION ===`);
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
    console.log(`⚔️ === EQUIPEMENT QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);

    client.send("questStartResult", {
      success: false,
      message: "Pas de quêtes disponibles dans la zone d'équipement pour le moment"
    });
  }

  getZoneData() {
    return {
      npcs: this.npcs,
      objects: [] as ZoneObject[],
      spawns: [] as Spawn[],
      music: "equipment_theme",
      weather: "clear"
    };
  }
}
