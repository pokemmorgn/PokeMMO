// PokeMMO/server/src/managers/CollisionManager.ts

import fs from "fs";
import path from "path";

export class CollisionManager {
  private collisionTiles: Set<string> = new Set();
  private tileWidth: number = 32;  // ajuste si besoin
  private tileHeight: number = 32;

  constructor(mapPath: string) {
    this.loadCollisionsFromMap(mapPath);
  }

loadCollisionsFromMap(mapPath: string) {
  // Force l’extension .tmj
  let fileName = mapPath.endsWith('.tmj') ? mapPath : mapPath.replace(/\.[^.]+$/, '') + '.tmj';

  // Force le dossier build/assets/maps/ même si l’argument n’est pas bon
  const resolvedPath = path.resolve(__dirname, "../../../build/assets/maps", fileName);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`CollisionManager: Le fichier map n'existe pas : ${resolvedPath}`);
  }
  const mapData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));

    // Remplace "Worlds" par le nom de ton calque collision si différent
    const collisionLayer = mapData.layers.find((l: any) =>
      l.name === "Worlds" && (
        !l.properties || l.properties.some((p: any) => p.name === "collides" && p.value === true)
      )
    );
    if (!collisionLayer || !collisionLayer.data) return;

    this.tileWidth = mapData.tilewidth;
    this.tileHeight = mapData.tileheight;

    for (let y = 0; y < collisionLayer.height; y++) {
      for (let x = 0; x < collisionLayer.width; x++) {
        const idx = y * collisionLayer.width + x;
        if (collisionLayer.data[idx] !== 0) {
          this.collisionTiles.add(`${x},${y}`);
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
