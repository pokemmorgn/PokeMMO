// ===============================================
// BeachRoom.ts - Version simplifiée héritant de BaseRoom
// ===============================================
import { BaseRoom } from "./BaseRoom";

export class BeachRoom extends BaseRoom {
  protected roomName = "BeachRoom";
  protected defaultX = 52;
  protected defaultY = 48;

  protected calculateSpawnPosition(targetZone: string): { x: number, y: number } {
    switch(targetZone) {
      case 'VillageScene':
        return { x: 150, y: 200 };
      case 'Road1Scene':
        return { x: 200, y: 150 };
      default:
        console.warn(`[BeachRoom] Zone cible inconnue: ${targetZone}`);
        return { x: 100, y: 100 }; // Position par défaut
    }
  }
}
