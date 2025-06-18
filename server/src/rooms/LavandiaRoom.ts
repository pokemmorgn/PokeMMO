// ===============================================
// LavandiaRoom.ts - Room Lavandia, héritant de BaseRoom
// ===============================================
import { BaseRoom } from "./BaseRoom";

export class LavandiaRoom extends BaseRoom {
  protected mapName = "LavandiaRoom";
  protected defaultX = 350;
  protected defaultY = 750;

 public calculateSpawnPosition(targetZone: string): { x: number, y: number } {
  switch (targetZone) {
    case "BeachScene":
      return { x: 82, y: 911 }; // Position où spawn le joueur s'il vient de BeachScene
    default:
      return { x: this.defaultX, y: this.defaultY };
  }
}


  onCreate(options: any) {
    super.onCreate(options);
    console.log("[LavandiaRoom] Room créée :", this.roomId);
  }
}
