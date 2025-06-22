// server/src/managers/CollisionManager.ts

import fs from "fs";
import path from "path";

export class CollisionManager {
  private collisionGrid: boolean[][] = [];
  public width: number = 0;
  public height: number = 0;
  private tileWidth: number = 32;   // adapte si besoin
  private tileHeight: number = 32;

  constructor(mapPath: string) {
    this.loadCollisionsFromMap(mapPath);
  }

loadCollisionsFromMap(mapPath: string) {
  const resolvedPath = path.resolve(process.cwd(), "assets/maps", mapPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`CollisionManager: Le fichier map n'existe pas : ${resolvedPath}`);
  }
    const mapData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
    this.width = mapData.width;
    this.height = mapData.height;
    this.tileWidth = mapData.tilewidth;
    this.tileHeight = mapData.tileheight;

    // Trouve le layer collision (propriété "collides" à true)
    const collidesLayer = mapData.layers.find((l: any) =>
      l.properties?.some((p: any) => p.name === "collides" && p.value === true)
    );
    if (!collidesLayer) throw new Error("CollisionManager: Aucun layer 'collides' trouvé.");

    // Crée la grille
    this.collisionGrid = [];
    for (let y = 0; y < this.height; y++) {
      this.collisionGrid[y] = [];
      for (let x = 0; x < this.width; x++) {
        // Pour les tile layers (data est un tableau 1D)
        const idx = x + y * this.width;
        const isBlocked = (collidesLayer.data && collidesLayer.data[idx] !== 0);
        this.collisionGrid[y][x] = isBlocked;
      }
    }
  }

  /**
   * Vérifie si la case (coordonnées pixels) est bloquée
   */
  isBlocked(x: number, y: number): boolean {
    const tx = Math.floor(x / this.tileWidth);
    const ty = Math.floor(y / this.tileHeight);
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return true; // hors map = bloqué
    return this.collisionGrid[ty][tx];
  }
}

export default CollisionManager;
