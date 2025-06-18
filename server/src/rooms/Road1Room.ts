// ===============================================
// Road1Room.ts - Room Route 1, héritant de BaseRoom
// ===============================================
import { BaseRoom } from "./BaseRoom";

export class Road1Room extends BaseRoom {
  protected mapName = "Road1Room";
  protected defaultX = 342;
  protected defaultY = 618;

public calculateSpawnPosition(targetZone: string): { x: number, y: number } {
  switch (targetZone) {
    case "VillageScene":
      return { x: 337, y: 616 }; // Position où spawn le joueur s'il vient de BeachScene
    case "Lavandia":
      return { x: 198, y: 22 };
    default:
      return { x: this.defaultX, y: this.defaultY };
  }
}



  onCreate(options: any) {
    super.onCreate(options);
    console.log("[Road1Room] Room créée :", this.roomId);
  }
}
