// LavandiaRoom.ts - Room Lavandia, héritant de BaseRoom
import { BaseRoom } from "./BaseRoom";
import type { SpawnData } from "./BaseRoom";

export class LavandiaRoom extends BaseRoom {
  public mapName = "LavandiaRoom";
  protected defaultX = 350;
  protected defaultY = 750;

  public calculateSpawnPosition(spawnData: SpawnData): { x: number, y: number } {
    console.log(`[LavandiaRoom] calculateSpawnPosition appelé avec:`, spawnData);
    
    // ✅ NOUVEAU : Si on va vers une autre zone (targetZone), calculer la position dans cette zone
    if (spawnData.targetZone) {
      const destinationSpawn = this.getDestinationSpawnPosition(spawnData.targetZone, spawnData.targetSpawn);
      if (destinationSpawn) {
        console.log(`[LavandiaRoom] Destination '${spawnData.targetZone}': (${destinationSpawn.x}, ${destinationSpawn.y})`);
        return destinationSpawn;
      }
    }
    
    // ✅ Priorité 1 : Coordonnées explicites
    if (spawnData.targetX !== undefined && spawnData.targetY !== undefined) {
      console.log(`[LavandiaRoom] Utilisation coordonnées explicites: (${spawnData.targetX}, ${spawnData.targetY})`);
      return { x: spawnData.targetX, y: spawnData.targetY };
    }
    
    // ✅ Priorité 2 : Spawn nommé (targetSpawn)
    if (spawnData.targetSpawn) {
      const namedSpawn = this.getNamedSpawnPosition(spawnData.targetSpawn);
      if (namedSpawn) {
        console.log(`[LavandiaRoom] Utilisation spawn nommé '${spawnData.targetSpawn}': (${namedSpawn.x}, ${namedSpawn.y})`);
        return namedSpawn;
      }
    }
    
    // ✅ Priorité 3 : Spawn basé sur la zone d'origine (fromZone)
    if (spawnData.fromZone) {
      const originSpawn = this.getSpawnFromOrigin(spawnData.fromZone);
      console.log(`[LavandiaRoom] Utilisation spawn depuis '${spawnData.fromZone}': (${originSpawn.x}, ${originSpawn.y})`);
      return originSpawn;
    }
    
    // ✅ Priorité 4 : Position par défaut
    console.log(`[LavandiaRoom] Utilisation position par défaut: (${this.defaultX}, ${this.defaultY})`);
    return { x: this.defaultX, y: this.defaultY };
  }

  // ✅ NOUVEAU : Calculer la position dans la zone de destination
  private getDestinationSpawnPosition(targetZone: string, targetSpawn?: string): { x: number, y: number } | null {
    const destinationSpawns: Record<string, { x: number, y: number }> = {
      // Position dans Route 1 quand on sort de Lavandia
      'Road1Scene': { x: 198, y: 22 },
      'Road1Room': { x: 198, y: 22 },
    };
    
    // Si on a un spawn nommé spécifique
    if (targetSpawn) {
      const specificSpawns: Record<string, { x: number, y: number }> = {
        'FromLavandiaScene': { x: 198, y: 22 },
      };
      if (specificSpawns[targetSpawn]) {
        return specificSpawns[targetSpawn];
      }
    }
    
    return destinationSpawns[targetZone] || null;
  }

  // ✅ Gestion des spawns nommés (pour quand on arrive à Lavandia)
  private getNamedSpawnPosition(spawnName: string): { x: number, y: number } | null {
    const namedSpawns: Record<string, { x: number, y: number }> = {
      // Spawn quand on vient de Route 1
      'FromRoad1Scene': { x: 82, y: 911 },
      'FromRoad1': { x: 82, y: 911 },
      
      // Spawn par défaut
      'Default': { x: this.defaultX, y: this.defaultY },
      'LavandiaEntrance': { x: 350, y: 750 },
    };
    
    return namedSpawns[spawnName] || null;
  }

  // ✅ Spawn basé sur la zone d'origine (fallback pour arrivées à Lavandia)
  private getSpawnFromOrigin(fromZone: string): { x: number, y: number } {
    switch (fromZone) {
      case "Road1Room":
      case "Road1Scene":
        return { x: 82, y: 911 }; // Position quand on vient de Route 1
      default:
        return { x: this.defaultX, y: this.defaultY };
    }
  }

  onCreate(options: any) {
    super.onCreate(options);
    console.log("[LavandiaRoom] Room créée :", this.roomId);
  }
}
