// ===============================================
// Road1Room.ts - Room Route 1, héritant de BaseRoom
// ===============================================
import { BaseRoom } from "./BaseRoom";
import type { SpawnData } from "./BaseRoom";

export class Road1Room extends BaseRoom {
  public mapName = "Road1Room";
  protected defaultX = 342;
  protected defaultY = 618;

  public calculateSpawnPosition(spawnData: SpawnData): { x: number, y: number } {
    console.log(`[Road1Room] calculateSpawnPosition appelé avec:`, spawnData);
    
    // ✅ NOUVEAU : Si on va vers une autre zone (targetZone), calculer la position dans cette zone
    if (spawnData.targetZone) {
      const destinationSpawn = this.getDestinationSpawnPosition(spawnData.targetZone, spawnData.targetSpawn);
      if (destinationSpawn) {
        console.log(`[Road1Room] Destination '${spawnData.targetZone}': (${destinationSpawn.x}, ${destinationSpawn.y})`);
        return destinationSpawn;
      }
    }
    
    // ✅ Priorité 1 : Coordonnées explicites
    if (spawnData.targetX !== undefined && spawnData.targetY !== undefined) {
      console.log(`[Road1Room] Utilisation coordonnées explicites: (${spawnData.targetX}, ${spawnData.targetY})`);
      return { x: spawnData.targetX, y: spawnData.targetY };
    }
    
    // ✅ Priorité 2 : Spawn nommé (targetSpawn)
    if (spawnData.targetSpawn) {
      const namedSpawn = this.getNamedSpawnPosition(spawnData.targetSpawn);
      if (namedSpawn) {
        console.log(`[Road1Room] Utilisation spawn nommé '${spawnData.targetSpawn}': (${namedSpawn.x}, ${namedSpawn.y})`);
        return namedSpawn;
      }
    }
    
    // ✅ Priorité 3 : Spawn basé sur la zone d'origine (fromZone)
    if (spawnData.fromZone) {
      const originSpawn = this.getSpawnFromOrigin(spawnData.fromZone);
      console.log(`[Road1Room] Utilisation spawn depuis '${spawnData.fromZone}': (${originSpawn.x}, ${originSpawn.y})`);
      return originSpawn;
    }
    
    // ✅ Priorité 4 : Position par défaut
    console.log(`[Road1Room] Utilisation position par défaut: (${this.defaultX}, ${this.defaultY})`);
    return { x: this.defaultX, y: this.defaultY };
  }

  // ✅ NOUVEAU : Calculer la position dans la zone de destination
  private getDestinationSpawnPosition(targetZone: string, targetSpawn?: string): { x: number, y: number } | null {
    const destinationSpawns: Record<string, { x: number, y: number }> = {
      // Position dans le village quand on va vers le village depuis Route 1
      'VillageScene': { x: 150, y: 26 },
      'VillageRoom': { x: 150, y: 26 },
      
      // Position dans Lavandia quand on va vers Lavandia depuis Route 1
      'LavandiaScene': { x: 82, y: 911 },
      'LavandiaRoom': { x: 82, y: 911 },
    };
    
    // Si on a un spawn nommé spécifique
    if (targetSpawn) {
      const specificSpawns: Record<string, { x: number, y: number }> = {
        'FromRoad1Scene': { x: 150, y: 26 }, // Village
        'FromRoad1ToLavandia': { x: 82, y: 911 }, // Lavandia
      };
      if (specificSpawns[targetSpawn]) {
        return specificSpawns[targetSpawn];
      }
    }
    
    return destinationSpawns[targetZone] || null;
  }

  // ✅ Gestion des spawns nommés (pour quand on arrive sur Route 1)
  private getNamedSpawnPosition(spawnName: string): { x: number, y: number } | null {
    const namedSpawns: Record<string, { x: number, y: number }> = {
      // Spawn quand on vient du village
      'FromVillageScene': { x: 337, y: 616 },
      'FromVillage': { x: 337, y: 616 },
      
      // Spawn quand on vient de Lavandia
      'FromLavandiaScene': { x: 198, y: 22 },
      'FromLavandia': { x: 198, y: 22 },
      
      // Spawn par défaut
      'Default': { x: this.defaultX, y: this.defaultY },
      'Road1Center': { x: 342, y: 618 },
    };
    
    return namedSpawns[spawnName] || null;
  }

  // ✅ Spawn basé sur la zone d'origine (fallback pour arrivées sur Route 1)
  private getSpawnFromOrigin(fromZone: string): { x: number, y: number } {
    switch (fromZone) {
      case "VillageRoom":
      case "VillageScene":
        return { x: 337, y: 616 }; // Position quand on vient du village
      case "LavandiaRoom":
      case "LavandiaScene":
        return { x: 198, y: 22 }; // Position quand on vient de Lavandia
      default:
        return { x: this.defaultX, y: this.defaultY };
    }
  }

  onCreate(options: any) {
    super.onCreate(options);
    console.log("[Road1Room] Room créée :", this.roomId);
  }
}
