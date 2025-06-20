// ===== server/src/rooms/zones/BeachZone.ts =====
import { Client } from "@colyseus/core";
import { IZone } from "./IZone";
import { WorldRoom } from "../WorldRoom";

export class BeachZone implements IZone {
  private room: WorldRoom;
  private npcs: any[] = [];

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🏖️ === BEACH ZONE INIT ===`);
    
    this.setupNPCs();
    this.setupEvents();
    
    console.log(`✅ BeachZone initialisée`);
  }

  private setupNPCs() {
    console.log(`🤖 Setup Beach NPCs...`);
    
    // NPCs de la plage (à adapter depuis votre code)
    this.npcs = [
      {
        id: 1,
        name: "Fisherman",
        x: 100,
        y: 200,
        sprite: "OldMan",
        dialogue: ["Bonjour ! Belle journée pour pêcher !"]
      },
      {
        id: 2, 
        name: "Surfer",
        x: 300,
        y: 150,
        sprite: "BrownGuy",
        dialogue: ["Les vagues sont parfaites aujourd'hui !"]
      }
    ];

    console.log(`✅ ${this.npcs.length} NPCs Beach configurés`);
  }

  private setupEvents() {
    console.log(`⚡ Setup Beach events...`);
    // TODO: Events spécifiques à la plage
    console.log(`✅ Beach events configurés`);
  }

  async onPlayerEnter(client: Client) {
    console.log(`🏖️ === PLAYER ENTER BEACH ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} entre sur la plage`);

    // Envoyer les données de la zone
    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "beach",
      ...zoneData
    });

    // Envoyer la liste des NPCs
    client.send("npcList", this.npcs);

    console.log(`📤 Données Beach envoyées à ${player.name}`);
  }

  onPlayerLeave(client: Client) {
    console.log(`🏖️ === PLAYER LEAVE BEACH ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte la plage`);
    }

    // Cleanup si nécessaire
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`🏖️ === BEACH NPC INTERACTION ===`);
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

    // Envoyer le dialogue
    client.send("npcInteractionResult", {
      type: "dialogue",
      npcId: npcId,
      npcName: npc.name,
      lines: npc.dialogue
    });

    console.log(`✅ Dialogue envoyé pour ${npc.name}`);
  }

  onQuestStart(client: Client, questId: string) {
    console.log(`🏖️ === BEACH QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);

    // TODO: Logique des quêtes spécifiques à la plage
    client.send("questStartResult", {
      success: false,
      message: "Pas de quêtes disponibles sur la plage pour le moment"
    });
  }

  getZoneData() {
    return {
      npcs: this.npcs,
      objects: [], // TODO: Objets interactifs
      spawns: [
        { name: "fromVillage", x: 52, y: 48 }
      ],
      music: "beach_theme",
      weather: "sunny"
    };
  }
}
