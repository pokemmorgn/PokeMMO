// ===============================================
// BeachRoom.ts - Version simplifiée héritant de BaseRoom
// ===============================================
import { BaseRoom } from "./BaseRoom";

export class BeachRoom extends BaseRoom {
  protected mapName = "BeachRoom";
  protected defaultX = 52;
  protected defaultY = 48;

  protected calculateSpawnPosition(spawnData: SpawnData): { x: number; y: number } {
  switch (spawnData.targetZone) {
    case "BeachScene":
      return { x: spawnData.targetX ?? 62, y: spawnData.targetY ?? 50 };
    // autres cas
    default:
      return { x: this.defaultX, y: this.defaultY };
  }
}

}
