// LavandiaRoom.ts - Room Lavandia, héritant de BaseRoom
import { BaseRoom } from "./BaseRoom";
import type { SpawnData } from "./BaseRoom"; // Import du type SpawnData

export class LavandiaRoom extends BaseRoom {
  public mapName = "LavandiaRoom";
  protected defaultX = 350;
  protected defaultY = 750;

  public calculateSpawnPosition(spawnData: SpawnData): { x: number, y: number } {
    const targetZone = spawnData.targetZone;

    switch (targetZone) {
      case "Road1Scene":
        return { x: 82, y: 911 }; // Position où spawn le joueur s'il vient de Road1Scene
      default:
        return { x: this.defaultX, y: this.defaultY };
    }
  }

  onCreate(options: any) {
    super.onCreate(options);
    console.log("[LavandiaRoom] Room créée :", this.roomId);
  }
}
