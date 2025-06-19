// VillageRoom.ts
import { Client } from "@colyseus/core";
import { BaseRoom } from "./BaseRoom";
import { PokeWorldState } from "../schema/PokeWorldState";
import type { SpawnData } from "./BaseRoom";

export class VillageRoom extends BaseRoom {
  public mapName = "VillageRoom";
  protected defaultX = 428;
  protected defaultY = 445;

  public calculateSpawnPosition(spawnData: SpawnData): { x: number, y: number } {
    console.log(`[VillageRoom] calculateSpawnPosition appelé avec:`, spawnData);
    
    // ✅ Priorité 1 : Coordonnées explicites
    if (spawnData.targetX !== undefined && spawnData.targetY !== undefined) {
      console.log(`[VillageRoom] Utilisation coordonnées explicites: (${spawnData.targetX}, ${spawnData.targetY})`);
      return { x: spawnData.targetX, y: spawnData.targetY };
    }
    
    // ✅ Priorité 2 : Spawn nommé (targetSpawn)
    if (spawnData.targetSpawn) {
      const namedSpawn = this.getNamedSpawnPosition(spawnData.targetSpawn);
      if (namedSpawn) {
        console.log(`[VillageRoom] Utilisation spawn nommé '${spawnData.targetSpawn}': (${namedSpawn.x}, ${namedSpawn.y})`);
        return namedSpawn;
      }
    }
    
    // ✅ Priorité 3 : Spawn basé sur la zone d'origine (fromZone)
    if (spawnData.fromZone) {
      const originSpawn = this.getSpawnFromOrigin(spawnData.fromZone);
      console.log(`[VillageRoom] Utilisation spawn depuis '${spawnData.fromZone}': (${originSpawn.x}, ${originSpawn.y})`);
      return originSpawn;
    }
    
    // ✅ Priorité 4 : Position par défaut
    console.log(`[VillageRoom] Utilisation position par défaut: (${this.defaultX}, ${this.defaultY})`);
    return { x: this.defaultX, y: this.defaultY };
  }

  // ✅ NOUVEAU : Gestion des spawns nommés
  private getNamedSpawnPosition(spawnName: string): { x: number, y: number } | null {
    const namedSpawns: Record<string, { x: number, y: number }> = {
      // Spawn quand on vient de la plage
      'FromBeachScene': { x: 428, y: 445 },
      'FromBeach': { x: 428, y: 445 },
      
      // Spawn quand on vient de Route 1
      'FromRoad1Scene': { x: 150, y: 26 },
      'FromRoad1': { x: 150, y: 26 },
      
      // Spawn par défaut
      'Default': { x: this.defaultX, y: this.defaultY },
      'VillageCenter': { x: 428, y: 445 },
    };
    
    return namedSpawns[spawnName] || null;
  }

  // ✅ Spawn basé sur la zone d'origine (fallback)
  private getSpawnFromOrigin(fromZone: string): { x: number, y: number } {
    switch (fromZone) {
      case "BeachRoom":
      case "BeachScene":
        return { x: 428, y: 445 }; // Position quand on vient de la plage
      case "Road1Room":  
      case "Road1Scene":
        return { x: 150, y: 26 }; // Position quand on vient de Route 1
      default:
        return { x: this.defaultX, y: this.defaultY };
    }
  }

  onCreate(options: any) {
    super.onCreate(options);
    console.log("[VillageRoom] Room créée :", this.roomId);
  }
}
