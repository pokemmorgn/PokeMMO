import fs from "fs";
import path from "path";

export class CollisionManager {
  private collisionTiles: Set<string> = new Set();
  private tileWidth: number = 16;
  private tileHeight: number = 16;
private npcCollisions: Map<number, {x: number, y: number, width: number, height: number}> = new Map();

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


isBlocked(x: number, y: number, playerWidth: number = 16, playerHeight: number = 16): boolean {
  // 1. Vérifier collision avec les tiles (code existant)
  const tx = Math.floor(x / this.tileWidth);
  const ty = Math.floor(y / this.tileHeight);
  if (this.collisionTiles.has(`${tx},${ty}`)) {
    console.log(`[COLLISION] Mouvement bloqué par tile à (${tx},${ty}) [pixels: ${x},${y}]`);
    return true;
  }

  // 2. Vérifier collision avec les NPCs (nouveau)
  for (const [npcId, npcRect] of this.npcCollisions) {
    if (this.rectanglesOverlap(x, y, playerWidth, playerHeight, npcRect.x, npcRect.y, npcRect.width, npcRect.height)) {
      console.log(`[COLLISION] Mouvement bloqué par NPC ${npcId} à (${npcRect.x},${npcRect.y})`);
      return true;
    }
  }

  return false;
}

addNpcCollision(npcId: number, x: number, y: number, width: number = 16, height: number = 16): void {
  this.npcCollisions.set(npcId, { x, y, width, height });
  console.log(`[COLLISION] NPC ${npcId} ajouté: ${width}x${height} à (${x},${y})`);
}

removeNpcCollision(npcId: number): void {
  if (this.npcCollisions.delete(npcId)) {
    console.log(`[COLLISION] NPC ${npcId} retiré`);
  }
}

updateNpcPosition(npcId: number, newX: number, newY: number): void {
  const npc = this.npcCollisions.get(npcId);
  if (npc) {
    npc.x = newX;
    npc.y = newY;
    console.log(`[COLLISION] NPC ${npcId} déplacé vers (${newX},${newY})`);
  }
}

private rectanglesOverlap(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean {
  return !(x1 >= x2 + w2 || x2 >= x1 + w1 || y1 >= y2 + h2 || y2 >= y1 + h1);
}
}

export default CollisionManager;
