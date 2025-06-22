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
    // Force .tmj et le chemin absolu
    const fileName = mapPath.endsWith('.tmj') ? mapPath : mapPath.replace(/\.[^.]+$/, '') + '.tmj';
    const resolvedPath = path.resolve(__dirname, "../../build/assets/maps", fileName);

    console.log(`[COLLISION] Chargement collisions pour : ${resolvedPath}`);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`CollisionManager: Le fichier map n'existe pas : ${resolvedPath}`);
    }
    const mapData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));

    this.tileWidth = mapData.tilewidth;
    this.tileHeight = mapData.tileheight;

    let collisionsCount = 0;

    // Support : objets "collides" sur les objectgroups
    for (const layer of mapData.layers) {
      if (layer.type === "objectgroup" && Array.isArray(layer.objects)) {
        for (const obj of layer.objects) {
          if (
            obj.properties &&
            obj.properties.some((p: any) => p.name === "collides" && p.value === true)
          ) {
            const startX = Math.floor(obj.x / this.tileWidth);
            const startY = Math.floor(obj.y / this.tileHeight);
            const width = Math.max(1, Math.ceil((obj.width || this.tileWidth) / this.tileWidth));
            const height = Math.max(1, Math.ceil((obj.height || this.tileHeight) / this.tileHeight));

            for (let dx = 0; dx < width; dx++) {
              for (let dy = 0; dy < height; dy++) {
                this.collisionTiles.add(`${startX + dx},${startY + dy}`);
                collisionsCount++;
              }
            }
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
