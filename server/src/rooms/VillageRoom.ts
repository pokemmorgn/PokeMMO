// ===============================================
// VillageRoom.ts - Room dédiée Village, héritant de BaseRoom
// ===============================================
import { Client } from "@colyseus/core";
import { BaseRoom } from "./BaseRoom";
import { PokeWorldState } from "../schema/PokeWorldState";

export class VillageRoom extends BaseRoom {
  // Propriétés obligatoires à définir
  protected mapName = "VillageRoom";
  protected defaultX = 428;   // position par défaut
  protected defaultY = 445;

  // Logique de calcul du point de spawn selon la zone d'arrivée
 public calculateSpawnPosition(spawnData: SpawnData): { x: number, y: number } {
  const targetZone = spawnData.targetZone;

  switch (targetZone) {
    case "BeachScene":
      return { x: 428, y: 445 }; // Position où spawn le joueur s'il vient de BeachScene
    case "Road1Scene":
      return { x: 150, y: 26 };
    default:
      return { x: this.defaultX, y: this.defaultY };
  }
}



  // Optionnel : Ajoute de la logique custom si besoin
  // Si tu veux faire des logs à la création ou autres
  onCreate(options: any) {
    super.onCreate(options);
    console.log("[VillageRoom] Room créée :", this.roomId);
  }
}
