// ===============================================
// Road1Room.ts - Room Route 1, héritant de BaseRoom
// ===============================================
import { BaseRoom } from "./BaseRoom";

export class Road1Room extends BaseRoom {
  protected mapName = "Road1Room";
  protected defaultX = 342;
  protected defaultY = 618;

  protected calculateSpawnPosition(targetZone: string): { x: number, y: number } {
    switch (targetZone) {
      case 'BeachScene':
        return { x: 52, y: 48 };
      case 'VillageScene':
        return { x: 342, y: 618 };
      case 'Forest1Scene':
        return { x: 100, y: 200 };
      case 'Cave1Scene':
        return { x: 300, y: 100 };
      default:
        // fallback à une position par défaut si la cible n’est pas connue
        return { x: this.defaultX, y: this.defaultY };
    }
  }

  onCreate(options: any) {
    super.onCreate(options);
    console.log("[Road1Room] Room créée :", this.roomId);
  }
}
