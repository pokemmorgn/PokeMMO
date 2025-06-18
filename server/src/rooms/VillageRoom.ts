// ===============================================
// VillageRoom.ts - Room dédiée Village, héritant de BaseRoom
// ===============================================
import { Client } from "@colyseus/core";
import { BaseRoom } from "./BaseRoom";
import { PokeWorldState } from "../schema/PokeWorldState";

export class VillageRoom extends BaseRoom {
  // Propriétés obligatoires à définir
  protected mapName = "VillageRoom";
  protected defaultX = 200;   // position par défaut
  protected defaultY = 150;

  // Logique de calcul du point de spawn selon la zone d'arrivée
  protected calculateSpawnPosition(targetZone: string): { x: number, y: number } {
    // Ajuste les coordonnées selon la zone cible
    switch (targetZone) {
      case "BeachScene":
        return { x: 100, y: 100 };
      case "Road1Scene":
        return { x: 342, y: 618 };
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
