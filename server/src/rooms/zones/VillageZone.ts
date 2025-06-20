// ===== server/src/rooms/zones/VillageZone.ts =====
import { Client } from "@colyseus/core";
import { IZone } from "./IZone";
import { WorldRoom } from "../WorldRoom";

export class VillageZone implements IZone {
  private room: WorldRoom;
  private npcs: any[] = [];

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🏘️ === VILLAGE ZONE INIT ===`);
    
    this.setupNPCs();
    this.setupEvents();
    
    console.log(`✅ VillageZone initialisée`);
  }

  private setupNPCs() {
    console.log(`🤖 Setup Village NPCs...`);
    
    this.npcs = [
      {
        id: 10,
        name: "Mayor",
        x: 200,
        y: 200,
        sprite: "OldMan",
        dialogue: ["Bienvenue à GreenRoot Village !"]
      },
      {
        id: 11,
        name: "Merchant", 
        x: 250,
        y: 300,
        sprite: "BlondeGirl",
        dialogue: ["J'ai de super objets à vendre !"]
      }
    ];

    console.log(`✅ ${this.npcs.length} NPCs Village configurés`);
  }

  private setupEvents() {
    console.log(`⚡ Setup Village events...`);
    console.log(`✅ Village events configurés`);
  }

  async onPlayerEnter(client: Client) {
    console.log(`🏘️ === PLAYER ENTER VILLAGE ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} entre au village`);

    // Envoyer les données de la zone
    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "village",
      ...zoneData
    });

    // Envoyer la liste des NPCs
    client.send("npcList", this.npcs);

    console.log(`📤 Données Village envoyées à ${player.name}`);
  }

  onPlayerLeave(client: Client) {
    console.log(`🏘️ === PLAYER LEAVE VILLAGE ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte le village`);
    }
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`🏘️ === VILLAGE NPC INTERACTION ===`);
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
    console.log(`🏘️ === VILLAGE QUEST START ===`);
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
      objects: [],
      spawns: [
        { name: "fromBeach", x: 100, y: 200 },
        { name: "fromRoad1", x: 342, y: 618 }
      ],
      music: "village_theme",
      weather: "clear"
    };
  }
}
