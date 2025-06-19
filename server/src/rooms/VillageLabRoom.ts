// ===============================================
// VillageLabRoom.ts - Room du labo du village, héritant de BaseRoom
// ===============================================
import { BaseRoom } from "./BaseRoom";
import { Client } from "@colyseus/core";
import type { SpawnData } from "./BaseRoom";

export class VillageLabRoom extends BaseRoom {
  public mapName = "VillageLabRoom";
  protected defaultX = 300;
  protected defaultY = 200;

  public calculateSpawnPosition(spawnData: SpawnData): { x: number, y: number } {
    console.log(`[VillageLabRoom] calculateSpawnPosition appelé avec:`, spawnData);
    
    // ✅ NOUVEAU : Si on va vers une autre zone (targetZone), calculer la position dans cette zone
    if (spawnData.targetZone) {
      const destinationSpawn = this.getDestinationSpawnPosition(spawnData.targetZone, spawnData.targetSpawn);
      if (destinationSpawn) {
        console.log(`[VillageLabRoom] Destination '${spawnData.targetZone}': (${destinationSpawn.x}, ${destinationSpawn.y})`);
        return destinationSpawn;
      }
    }
    
    // ✅ Priorité 1 : Coordonnées explicites
    if (spawnData.targetX !== undefined && spawnData.targetY !== undefined) {
      console.log(`[VillageLabRoom] Utilisation coordonnées explicites: (${spawnData.targetX}, ${spawnData.targetY})`);
      return { x: spawnData.targetX, y: spawnData.targetY };
    }
    
    // ✅ Priorité 2 : Spawn nommé (targetSpawn)
    if (spawnData.targetSpawn) {
      const namedSpawn = this.getNamedSpawnPosition(spawnData.targetSpawn);
      if (namedSpawn) {
        console.log(`[VillageLabRoom] Utilisation spawn nommé '${spawnData.targetSpawn}': (${namedSpawn.x}, ${namedSpawn.y})`);
        return namedSpawn;
      }
    }
    
    // ✅ Priorité 3 : Spawn basé sur la zone d'origine (fromZone)
    if (spawnData.fromZone) {
      const originSpawn = this.getSpawnFromOrigin(spawnData.fromZone);
      console.log(`[VillageLabRoom] Utilisation spawn depuis '${spawnData.fromZone}': (${originSpawn.x}, ${originSpawn.y})`);
      return originSpawn;
    }
    
    // ✅ Priorité 4 : Position par défaut
    console.log(`[VillageLabRoom] Utilisation position par défaut: (${this.defaultX}, ${this.defaultY})`);
    return { x: this.defaultX, y: this.defaultY };
  }

  // ✅ NOUVEAU : Calculer la position dans la zone de destination
  private getDestinationSpawnPosition(targetZone: string, targetSpawn?: string): { x: number, y: number } | null {
    const destinationSpawns: Record<string, { x: number, y: number }> = {
      // Position dans le village quand on sort du labo
      'VillageScene': { x: 248, y: 364 },
      'VillageRoom': { x: 248, y: 364 },
    };
    
    // Si on a un spawn nommé spécifique
    if (targetSpawn) {
      const specificSpawns: Record<string, { x: number, y: number }> = {
        'FromLabScene': { x: 248, y: 364 },
      };
      if (specificSpawns[targetSpawn]) {
        return specificSpawns[targetSpawn];
      }
    }
    
    return destinationSpawns[targetZone] || null;
  }

  // ✅ Gestion des spawns nommés (pour quand on arrive au labo)
  private getNamedSpawnPosition(spawnName: string): { x: number, y: number } | null {
    const namedSpawns: Record<string, { x: number, y: number }> = {
      // Spawn quand on vient du village
      'FromVillageScene': { x: 248, y: 364 },
      'FromVillage': { x: 248, y: 364 },
      
      // Spawn par défaut
      'Default': { x: this.defaultX, y: this.defaultY },
      'LabEntrance': { x: 248, y: 364 },
    };
    
    return namedSpawns[spawnName] || null;
  }

  // ✅ Spawn basé sur la zone d'origine (fallback pour arrivées au labo)
  private getSpawnFromOrigin(fromZone: string): { x: number, y: number } {
    switch (fromZone) {
      case "VillageRoom":
      case "VillageScene":
        return { x: 248, y: 364 }; // Position quand on vient du village
      default:
        return { x: this.defaultX, y: this.defaultY };
    }
  }

  // Ajout des messages custom (interactions labo)
  onCreate(options: any): void {
    super.onCreate(options);

    this.onMessage("interactWithProfessor", (client: Client) => {
      console.log(`[VillageLabRoom] ${client.sessionId} interagit avec le professeur`);
      client.send("professorDialog", {
        message: "Bonjour ! Bienvenue dans mon laboratoire !",
        options: ["Recevoir un Pokémon", "Informations", "Fermer"],
      });
    });

    this.onMessage("selectStarter", (client: Client, data: { pokemon: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        console.log(`[VillageLabRoom] ${player.name} sélectionne ${data.pokemon} comme starter`);
        client.send("starterReceived", {
          pokemon: data.pokemon,
          message: `Félicitations ! Vous avez reçu ${data.pokemon} !`,
        });
      }
    });

    console.log("[VillageLabRoom] Room créée :", this.roomId);
  }

  // Ajout possible de message de bienvenue, hook sur onJoin (optionnel)
  async onJoin(client: Client, options: any): Promise<void> {
    await super.onJoin(client, options);
    client.send("welcomeToLab", {
      message: "Bienvenue dans le laboratoire du Professeur !",
      canReceiveStarter: true
    });
  }
}
