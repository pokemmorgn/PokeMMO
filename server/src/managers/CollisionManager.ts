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

  console.log(`[COLLISION] Chargement collisions pour : ${resolvedPath}`);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`CollisionManager: Le fichier map n'existe pas : ${resolvedPath}`);
  }
  const mapData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));

  this.tileWidth = mapData.tilewidth;
  this.tileHeight = mapData.tileheight;

  // 1. Construction d’un dictionnaire des IDs de tuiles avec collides: true
  const collidesTileIds = new Set<number>();
  for (const tileset of mapData.tilesets) {
    if (!tileset.tiles) continue;
    for (const tile of tileset.tiles) {
      if (
        tile.properties &&
        tile.properties.some((p: any) => p.name === "collides" && p.value === true)
      ) {
        collidesTileIds.add(tileset.firstgid + tile.id);
      }
    }
  }

  let collisionsCount = 0;
  // 2. Parcours de tous les layers de type tilelayer
  for (const layer of mapData.layers) {
    if (layer.type !== "tilelayer" || !Array.isArray(layer.data)) continue;

    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const idx = y * layer.width + x;
        const gid = layer.data[idx];
        if (collidesTileIds.has(gid)) {
          this.collisionTiles.add(`${x},${y}`);
          collisionsCount++;
        }
      }
    }
  }
  console.log(`[COLLISION] Tiles bloquantes chargées : ${collisionsCount}`);
}


  isBlocked(x: number, y: number): boolean {
    const tx = Math.floor(x / this.tileWidth);
    const ty = Math.floor(y / this.tileHeight);
    const blocked = this.collisionTiles.has(`${tx},${ty}`);
    if (blocked) {
      console.log(`[COLLISION] Mouvement bloqué à (${tx},${ty}) [pixels: ${x},${y}]`);
    }
    return blocked;
  }
}

export default CollisionManager;
