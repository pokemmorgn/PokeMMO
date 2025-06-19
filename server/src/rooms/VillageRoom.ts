// VillageRoom.ts
import { Client } from "@colyseus/core";
import { BaseRoom } from "./BaseRoom";
import { PokeWorldState } from "../schema/PokeWorldState";
import type { SpawnData } from "./BaseRoom";

export class VillageRoom extends BaseRoom {
  public mapName = "village";
  protected defaultX = 428;
  protected defaultY = 445;

  public calculateSpawnPosition(spawnData: SpawnData): { x: number, y: number } {
    console.log(`[VillageRoom] calculateSpawnPosition appelé avec:`, spawnData);
    
    // ✅ NOUVEAU : Si on va vers une autre zone (targetZone), calculer la position dans cette zone
    if (spawnData.targetZone) {
      const destinationSpawn = this.getDestinationSpawnPosition(spawnData.targetZone, spawnData.targetSpawn);
      if (destinationSpawn) {
        console.log(`[VillageRoom] Destination '${spawnData.targetZone}': (${destinationSpawn.x}, ${destinationSpawn.y})`);
        return destinationSpawn;
      }
    }
    
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

  // ✅ NOUVEAU : Calculer la position dans la zone de destination
  private getDestinationSpawnPosition(targetZone: string, targetSpawn?: string): { x: number, y: number } | null {
    const destinationSpawns: Record<string, { x: number, y: number }> = {
      // Positions dans la plage quand on vient du village
      'BeachScene': { x: 62, y: 50 },
      'BeachRoom': { x: 62, y: 50 },
      
      // Positions dans Route 1 quand on vient du village
      'Road1Scene': { x: 337, y: 616 }, // ✅ Correct
      'Road1Room': { x: 337, y: 616 },  // ✅ Correct
      
      // Positions dans le labo quand on vient du village
      'VillageLabScene': { x: 248, y: 364 },
      'VillageLabRoom': { x: 248, y: 364 },
      
      // Positions dans la maison quand on vient du village
      'VillageHouse1Scene': { x: 181, y: 281 },
      'VillageHouse1Room': { x: 181, y: 281 },
    };
    
    // Si on a un spawn nommé spécifique, on peut le gérer ici aussi
    if (targetSpawn) {
      const specificSpawns: Record<string, { x: number, y: number }> = {
        'FromVillageScene': { x: 62, y: 50 }, // Position spécifique dans la plage
      };
      if (specificSpawns[targetSpawn]) {
        return specificSpawns[targetSpawn];
      }
    }
    
    return destinationSpawns[targetZone] || null;
  }

  // ✅ Gestion des spawns nommés (pour quand on arrive au village)
  private getNamedSpawnPosition(spawnName: string): { x: number, y: number } | null {
    const namedSpawns: Record<string, { x: number, y: number }> = {
      // Spawn quand on vient de la plage
      'FromBeachScene': { x: 428, y: 445 },
      'FromBeach': { x: 428, y: 445 },
      
      // ✅ CORRIGER : Spawn quand on vient de Route 1  
      'FromRoad1Scene': { x: 131.33, y: 0 }, // ✅ Bonne position !
      'FromRoad1': { x: 131.33, y: 0 },      // ✅ Bonne position !
      
      // Spawn par défaut
      'Default': { x: this.defaultX, y: this.defaultY },
      'VillageCenter': { x: 428, y: 445 },
    };
    
    return namedSpawns[spawnName] || null;
  }

  // ✅ Spawn basé sur la zone d'origine (fallback pour arrivées au village)
  private getSpawnFromOrigin(fromZone: string): { x: number, y: number } {
    switch (fromZone) {
      case "BeachRoom":
      case "BeachScene":
        return { x: 428, y: 445 }; // Position quand on vient de la plage
      case "Road1Room":  
      case "Road1Scene":
        return { x: 131.33, y: 0 }; // ✅ CORRIGER : Position quand on vient de Route 1
      default:
        return { x: this.defaultX, y: this.defaultY };
    }
  }

  onCreate(options: any) {
    super.onCreate(options);
    console.log("[VillageRoom] Room créée :", this.roomId);
  }
}
