// ===== server/src/rooms/zones/Villageflorist.ts =====
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

export class Villageflorist /* ICI */ implements IZone {  
  private room: WorldRoom;
  private npcs: NPC[] = [];

  constructor(room: WorldRoom) {
    this.room = room;
    
    this.setupEvents();
    
  }


  private setupEvents() {
  }

  async onPlayerEnter(client: Client) {

    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }


    // Envoyer les données de la zone
    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "villageflorist", /* ICI */
      ...zoneData
    });

    // Envoyer la liste des NPCs
    client.send("npcList", this.npcs);
  }

  onPlayerLeave(client: Client) {

    const player = this.room.state.players.get(client.sessionId);
    if (player) {
    }
  }

  onNpcInteract(client: Client, npcId: number) {
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
    console.log(`🏘️ === VILLAGE LAB QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);

    // TODO: Logique des quêtes du village
    client.send("questStartResult", {
      success: false,
      message: "Pas de quêtes disponibles au village pour le moment"
    });
  }

  getZoneData() {
    return {
      npcs: this.npcs,
      objects: [] as ZoneObject[], // ✅ Type explicite ajouté
      spawns: [
        { name: "fromBeach", x: 100, y: 200 },
        { name: "fromRoad1", x: 342, y: 618 }
      ] as Spawn[],
      music: "village_theme",
      weather: "clear"
    };
  }
}
