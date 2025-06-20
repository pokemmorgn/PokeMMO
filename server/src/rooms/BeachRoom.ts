// BeachRoom.ts
import { BaseRoom } from "./BaseRoom";
import type { SpawnData } from "./BaseRoom";

export class BeachRoom extends BaseRoom {
  public mapName = "BeachRoom";
  protected defaultX = 52;
  protected defaultY = 48;

  // ✅ La méthode calculateSpawnPosition héritée de BaseRoom va automatiquement :
  // 1. Chercher les spawns via le système de transition (objets "spawn" dans Tiled)
  // 2. Utiliser les coordonnées spécifiques si fournies
  // 3. Utiliser les valeurs par défaut en dernier recours

  // ✅ PLUS BESOIN DE TOUT ÇA ! Le système automatique s'en charge :
  // - getDestinationSpawnPosition() 
  // - getNamedSpawnPosition()
  // - getSpawnFromOrigin()
  // - calculateSpawnPosition()
}
