// ===============================================
// BeachRoom.ts - Version simplifiée héritant de BaseRoom
// ===============================================
import { BaseRoom } from "./BaseRoom";

export class BeachRoom extends BaseRoom {
  protected mapName = "BeachRoom";
  protected defaultX = 52;
  protected defaultY = 48;

  public calculateSpawnPosition(targetZone: string): { x: number, y: number } {
  switch (targetZone) {
    case "VillageScene":
      return { x: 62, y: 50 }; // Position où spawn le joueur s'il vient de BeachScene
      return { x: this.defaultX, y: this.defaultY };
  }
}


}
