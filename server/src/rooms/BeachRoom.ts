// BeachRoom.ts
import { BaseRoom } from "./BaseRoom";

// IMPORTANT: importer SpawnData depuis le fichier où il est défini (ou redéfinir ici)
import type { SpawnData } from "./BaseRoom"; // adapte le chemin selon ta structure

export class BeachRoom extends BaseRoom {
  public mapName = "BeachRoom";
  protected defaultX = 52;
  protected defaultY = 48;

  public calculateSpawnPosition(spawnData: SpawnData): { x: number, y: number } {
    const targetZone = spawnData.targetZone;

    switch (targetZone) {
      case "VillageScene":
        return { x: 62, y: 50 }; // position quand on vient de VillageScene
      default:
        return { x: this.defaultX, y: this.defaultY };
    }
  }
}
