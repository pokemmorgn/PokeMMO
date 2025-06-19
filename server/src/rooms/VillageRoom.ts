// VillageRoom.ts
import { Client } from "@colyseus/core";
import { BaseRoom } from "./BaseRoom";
import { PokeWorldState } from "../schema/PokeWorldState";
import type { SpawnData } from "./BaseRoom";

export class VillageRoom extends BaseRoom {
  public mapName = "VillageRoom";
  protected defaultX = 428;
  protected defaultY = 445;

  // ✅ SUPPRIMÉ : Plus besoin de calculateSpawnPosition() !
  // ✅ SUPPRIMÉ : Plus besoin de getDestinationSpawnPosition() !
  // ✅ SUPPRIMÉ : Plus besoin de getNamedSpawnPosition() !  
  // ✅ SUPPRIMÉ : Plus besoin de getSpawnFromOrigin() !

  // Le système automatique va gérer tous les spawns via les objets Tiled

  onCreate(options: any) {
    super.onCreate(options);
    console.log("[VillageRoom] Room créée :", this.roomId);
  }
}
