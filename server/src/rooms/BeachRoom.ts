// BeachRoom.ts
import { BaseRoom } from "./BaseRoom";
import type { SpawnData } from "./BaseRoom";

export class BeachRoom extends BaseRoom {
  public mapName = "BeachRoom";
  protected defaultX = 52;
  protected defaultY = 48;

  public calculateSpawnPosition(spawnData: SpawnData): { x: number, y: number } {
    console.log(`[BeachRoom] calculateSpawnPosition appelé avec:`, spawnData);
    
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

  // ✅ NOUVEAU : Gestion des spawns nommés
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
