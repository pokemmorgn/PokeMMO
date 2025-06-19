// BeachRoom.ts
import { BaseRoom } from "./BaseRoom";
import type { SpawnData } from "./BaseRoom";

export class BeachRoom extends BaseRoom {
  public mapName = "BeachRoom";
  protected defaultX = 52;
  protected defaultY = 48;

  public calculateSpawnPosition(spawnData: SpawnData): { x: number, y: number } {
    console.log(`[BeachRoom] calculateSpawnPosition appelé avec:`, spawnData);
    
    // ✅ NOUVEAU : Si on va vers une autre zone (targetZone), calculer la position dans cette zone
    if (spawnData.targetZone) {
      const destinationSpawn = this.getDestinationSpawnPosition(spawnData.targetZone, spawnData.targetSpawn);
      if (destinationSpawn) {
        console.log(`[BeachRoom] Destination '${spawnData.targetZone}': (${destinationSpawn.x}, ${destinationSpawn.y})`);
        return destinationSpawn;
      }
    }
    
    // ✅ Priorité 1 : Coordonnées explicites
    if (spawnData.targetX !== undefined && spawnData.targetY !== undefined) {
      console.log(`[BeachRoom] Utilisation coordonnées explicites: (${spawnData.targetX}, ${spawnData.targetY})`);
      return { x: spawnData.targetX, y: spawnData.targetY };
    }
    
    // ✅ Priorité 2 : Spawn nommé (targetSpawn)
    if (spawnData.targetSpawn) {
      const namedSpawn = this.getNamedSpawnPosition(spawnData.targetSpawn);
      if (namedSpawn) {
        console.log(`[BeachRoom] Utilisation spawn nommé '${spawnData.targetSpawn}': (${namedSpawn.x}, ${namedSpawn.y})`);
        return namedSpawn;
      }
    }
    
    // ✅ Priorité 3 : Spawn basé sur la zone d'origine (fromZone)
    if (spawnData.fromZone) {
      const originSpawn = this.getSpawnFromOrigin(spawnData.fromZone);
      console.log(`[BeachRoom] Utilisation spawn depuis '${spawnData.fromZone}': (${originSpawn.x}, ${originSpawn.y})`);
      return originSpawn;
    }
    
    // ✅ Priorité 4 : Position par défaut
    console.log(`[BeachRoom] Utilisation position par défaut: (${this.defaultX}, ${this.defaultY})`);
    return { x: this.defaultX, y: this.defaultY };
  }

  // ✅ NOUVEAU : Calculer la position dans la zone de destination
  private getDestinationSpawnPosition(targetZone: string, targetSpawn?: string): { x: number, y: number } | null {
    const destinationSpawns: Record<string, { x: number, y: number }> = {
      // Positions dans le village quand on vient de la plage
      'VillageScene': { x: 428, y: 445 },
      'VillageRoom': { x: 428, y: 445 },
      
      // Positions dans d'autres zones si nécessaire
      'Road1Scene': { x: 337, y: 616 },
      'Road1Room': { x: 337, y: 616 },
    };
    
    // Si on a un spawn nommé spécifique, on peut le gérer ici aussi
    if (targetSpawn) {
      const specificSpawns: Record<string, { x: number, y: number }> = {
        'FromBeachScene': { x: 428, y: 445 }, // Position spécifique dans le village
      };
      if (specificSpawns[targetSpawn]) {
        return specificSpawns[targetSpawn];
      }
    }
    
    return destinationSpawns[targetZone] || null;
  }

  // ✅ Gestion des spawns nommés (pour quand on arrive à la plage)
  private getNamedSpawnPosition(spawnName: string): { x: number, y: number } | null {
    const namedSpawns: Record<string, { x: number, y: number }> = {
      // Spawn quand on vient du village
      'FromVillageScene': { x: 62, y: 50 },
      'FromVillage': { x: 62, y: 50 },
      
      // Spawn par défaut
      'Default': { x: this.defaultX, y: this.defaultY },
      
      // Autres spawns si nécessaire
      'BeachStart': { x: 52, y: 48 },
    };
    
    return namedSpawns[spawnName] || null;
  }

  // ✅ Spawn basé sur la zone d'origine (fallback)
  private getSpawnFromOrigin(fromZone: string): { x: number, y: number } {
    switch (fromZone) {
      case "VillageRoom":
      case "VillageScene":
        return { x: 62, y: 50 }; // Position quand on vient du village
      default:
        return { x: this.defaultX, y: this.defaultY };
    }
  }
}
