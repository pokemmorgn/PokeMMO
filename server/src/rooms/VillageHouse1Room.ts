// ===============================================
// VillageHouse1Room.ts - Room Maison du Village 1, héritant de BaseRoom
// ===============================================
import { BaseRoom } from "./BaseRoom";
import { Client } from "@colyseus/core";
import type { SpawnData } from "./BaseRoom";

export class VillageHouse1Room extends BaseRoom {
  public mapName = "VillageHouse1Room";
  protected defaultX = 300;
  protected defaultY = 200;

  public calculateSpawnPosition(spawnData: SpawnData): { x: number, y: number } {
    console.log(`[VillageHouse1Room] calculateSpawnPosition appelé avec:`, spawnData);
    
    // ✅ NOUVEAU : Si on va vers une autre zone (targetZone), calculer la position dans cette zone
    if (spawnData.targetZone) {
      const destinationSpawn = this.getDestinationSpawnPosition(spawnData.targetZone, spawnData.targetSpawn);
      if (destinationSpawn) {
        console.log(`[VillageHouse1Room] Destination '${spawnData.targetZone}': (${destinationSpawn.x}, ${destinationSpawn.y})`);
        return destinationSpawn;
      }
    }
    
    // ✅ Priorité 1 : Coordonnées explicites
    if (spawnData.targetX !== undefined && spawnData.targetY !== undefined) {
      console.log(`[VillageHouse1Room] Utilisation coordonnées explicites: (${spawnData.targetX}, ${spawnData.targetY})`);
      return { x: spawnData.targetX, y: spawnData.targetY };
    }
    
    // ✅ Priorité 2 : Spawn nommé (targetSpawn)
    if (spawnData.targetSpawn) {
      const namedSpawn = this.getNamedSpawnPosition(spawnData.targetSpawn);
      if (namedSpawn) {
        console.log(`[VillageHouse1Room] Utilisation spawn nommé '${spawnData.targetSpawn}': (${namedSpawn.x}, ${namedSpawn.y})`);
        return namedSpawn;
      }
    }
    
    // ✅ Priorité 3 : Spawn basé sur la zone d'origine (fromZone)
    if (spawnData.fromZone) {
      const originSpawn = this.getSpawnFromOrigin(spawnData.fromZone);
      console.log(`[VillageHouse1Room] Utilisation spawn depuis '${spawnData.fromZone}': (${originSpawn.x}, ${originSpawn.y})`);
      return originSpawn;
    }
    
    // ✅ Priorité 4 : Position par défaut
    console.log(`[VillageHouse1Room] Utilisation position par défaut: (${this.defaultX}, ${this.defaultY})`);
    return { x: this.defaultX, y: this.defaultY };
  }

  // ✅ NOUVEAU : Calculer la position dans la zone de destination
  private getDestinationSpawnPosition(targetZone: string, targetSpawn?: string): { x: number, y: number } | null {
    const destinationSpawns: Record<string, { x: number, y: number }> = {
      // Position dans le village quand on sort de la maison
      'VillageScene': { x: 181, y: 281 },
      'VillageRoom': { x: 181, y: 281 },
    };
    
    // Si on a un spawn nommé spécifique
    if (targetSpawn) {
      const specificSpawns: Record<string, { x: number, y: number }> = {
        'FromHouseScene': { x: 181, y: 281 },
      };
      if (specificSpawns[targetSpawn]) {
        return specificSpawns[targetSpawn];
      }
    }
    
    return destinationSpawns[targetZone] || null;
  }

  // ✅ Gestion des spawns nommés (pour quand on arrive à la maison)
  private getNamedSpawnPosition(spawnName: string): { x: number, y: number } | null {
    const namedSpawns: Record<string, { x: number, y: number }> = {
      // Spawn quand on vient du village
      'FromVillageScene': { x: 181, y: 281 },
      'FromVillage': { x: 181, y: 281 },
      
      // Spawn par défaut
      'Default': { x: this.defaultX, y: this.defaultY },
      'HouseEntrance': { x: 181, y: 281 },
    };
    
    return namedSpawns[spawnName] || null;
  }

  // ✅ Spawn basé sur la zone d'origine (fallback pour arrivées à la maison)
  private getSpawnFromOrigin(fromZone: string): { x: number, y: number } {
    switch (fromZone) {
      case "VillageRoom":
      case "VillageScene":
        return { x: 181, y: 281 }; // Position quand on vient du village
      default:
        return { x: this.defaultX, y: this.defaultY };
    }
  }

  onCreate(options: any): void {
    super.onCreate(options);

    // Exemple d'interaction simple, propre à la maison
    this.onMessage("interactWithNPC", (client: Client, data: { npcName: string }) => {
      console.log(`[VillageHouse1Room] ${client.sessionId} interagit avec ${data.npcName}`);

      const messages: Record<string, string> = {
        Grandma: "Bonjour jeune dresseur ! Prends soin de toi.",
        Cat: "Le chat ronronne doucement.",
      };

      const message = messages[data.npcName] || "Il n'y a rien ici.";
      client.send("npcDialog", { message });
    });

    console.log("[VillageHouse1Room] Room créée :", this.roomId);
  }

  // Hook d'accueil spécifique à cette room
  async onJoin(client: Client, options: any): Promise<void> {
    await super.onJoin(client, options);
    client.send("welcomeToHouse", {
      message: "Bienvenue dans la maison du village !"
    });
  }
}
