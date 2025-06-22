// PokeMMO/server/src/managers/CollisionManager.ts

import fs from "fs";
import path from "path";

export class CollisionManager {
  private collisionTiles: Set<string> = new Set();
  private tileWidth: number = 16;
  private tileHeight: number = 16;

  constructor(mapPath: string) {
    this.loadCollisionsFromMap(mapPath);
  }

  loadCollisionsFromMap(mapPath: string) {
    const fileName = mapPath.endsWith('.tmj') ? mapPath : mapPath.replace(/\.[^.]+$/, '') + '.tmj';
    const resolvedPath = path.resolve(__dirname, "../../build/assets/maps", fileName);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`CollisionManager: Le fichier map n'existe pas : ${resolvedPath}`);
    }
    const mapData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));

    this.tileWidth = mapData.tilewidth;
    this.tileHeight = mapData.tileheight;

    // Parcourt tous les layers de type objectgroup
    for (const layer of mapData.layers) {
      if (layer.type !== "objectgroup" || !layer.objects) continue;

      for (const obj of layer.objects) {
        if (
          obj.properties &&
          obj.properties.some((p: any) => p.name === "collides" && p.value === true)
        ) {
          // Ajoute chaque tile couverte par l'objet dans la set de collision
          const startX = Math.floor(obj.x / this.tileWidth);
          const startY = Math.floor(obj.y / this.tileHeight);

          // Largeur/hauteur en tiles (par défaut 1x1 si absent)
          const width = Math.max(1, Math.ceil((obj.width || this.tileWidth) / this.tileWidth));
          const height = Math.max(1, Math.ceil((obj.height || this.tileHeight) / this.tileHeight));

          for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
              this.collisionTiles.add(`${startX + x},${startY + y}`);
            }
          }
        }
      }
    }
  }

  // Vérifie si une position x, y (en pixels) est bloquée
  isBlocked(x: number, y: number): boolean {
    const tx = Math.floor(x / this.tileWidth);
    const ty = Math.floor(y / this.tileHeight);
    return this.collisionTiles.has(`${tx},${ty}`);
  }
}

export default CollisionManager;
