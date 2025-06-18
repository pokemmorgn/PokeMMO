// ===============================================
// VillageHouse1Room.ts - Room Maison du Village 1, héritant de BaseRoom
// ===============================================
import { BaseRoom } from "./BaseRoom";
import { Client } from "@colyseus/core";

export class VillageHouse1Room extends BaseRoom {
  protected mapName = "VillageHouse1Room";
  protected defaultX = 300;
  protected defaultY = 200;

 public calculateSpawnPosition(spawnData: SpawnData): { x: number, y: number } {
  const targetZone = spawnData.targetZone;

  switch (targetZone) {
    case "VillageScene":
      return { x: 181, y: 281 }; // Position où spawn le joueur s'il vient de BeachScene
    default:
      return { x: this.defaultX, y: this.defaultY };
  }
}

  onCreate(options: any): void {
    super.onCreate(options);

    // Exemple d'interaction simple, propre à la maison
    this.onMessage("interactWithNPC", (client: Client, data: { npcName: string }) => {
      console.log(`[VillageHouse1Room] ${client.sessionId} interagit avec ${data.npcName}`);

      const messages: Record<string, string> = {
        Grandma: "Bonjour jeune dresseur ! Prends soin de toi.",
        Cat:    "Le chat ronronne doucement.",
      };

      const message = messages[data.npcName] || "Il n'y a rien ici.";
      client.send("npcDialog", { message });
    });

    console.log("[VillageHouse1Room] Room créée :", this.roomId);
  }

  // Hook d'accueil spécifique à cette room
  async onJoin(client: Client, options: any): Promise<void> {
    await super.onJoin(client, options);
    client.send("welcomeToHouse", {
      message: "Bienvenue dans la maison du village !"
    });
  }
}
