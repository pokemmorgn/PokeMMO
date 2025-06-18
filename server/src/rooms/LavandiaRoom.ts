// ===============================================
// LavandiaRoom.ts - Room Lavandia, héritant de BaseRoom
// ===============================================
import { BaseRoom } from "./BaseRoom";

export class LavandiaRoom extends BaseRoom {
  protected mapName = "LavandiaRoom";
  protected defaultX = 350;
  protected defaultY = 750;

  protected calculateSpawnPosition(targetZone: string): { x: number, y: number } {
    switch (targetZone) {
      case 'Route8Scene':         return { x: 40,  y: 350 };
      case 'Route10Scene':        return { x: 350, y: 60  };
      case 'PoketowerScene':      return { x: 550, y: 150 };
      case 'LavandiaHouse1Scene': return { x: 150, y: 670 };
      default:                    return { x: this.defaultX, y: this.defaultY };
    }
  }

  onCreate(options: any) {
    super.onCreate(options);
    console.log("[LavandiaRoom] Room créée :", this.roomId);
  }
}
