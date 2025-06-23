// server/src/managers/CollisionManager.ts
// VERSION avec support de la couche d'objets "collides"

import fs from "fs";
import path from "path";

interface CollisionRect {
  x: number;
  y: number;
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export class CollisionManager {
  private collisionRects: CollisionRect[] = [];

  constructor(mapPath: string) {
    this.loadCollisionsFromMap(mapPath);
  }

  loadCollisionsFromMap(mapPath: string) {
    const fileName = mapPath.endsWith('.tmj') ? mapPath : mapPath.replace(/\.[^.]+$/, '') + '.tmj';
    const resolvedPath = path.resolve(__dirname, "../../build/assets/maps", fileName);

    console.log(`[COLLISION] Chargement collisions objets pour : ${resolvedPath}`);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`CollisionManager: Le fichier map n'existe pas : ${resolvedPath}`);
    }
    
    const mapData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));

    // ✅ RECHERCHER LA COUCHE D'OBJETS "collides"
    let collidesLayer = null;
    
    for (const layer of mapData.layers) {
      if (layer.type === "objectgroup" && layer.name === "collides") {
        collidesLayer = layer;
        break;
      }
    }

    if (!collidesLayer) {
      console.warn(`[COLLISION] ⚠️ Couche d'objets "collides" non trouvée dans ${mapPath}`);
      console.log(`[COLLISION] Couches disponibles:`, 
        mapData.layers.map((l: any) => `${l.name} (${l.type})`));
      return;
    }

    console.log(`[COLLISION] ✅ Couche "collides" trouvée avec ${collidesLayer.objects.length} objets`);

    let collisionsCount = 0;
    this.collisionRects = [];

    // ✅ PARCOURIR TOUS LES OBJETS DE LA COUCHE "collides"
    for (const obj of collidesLayer.objects) {
      // Créer un rectangle de collision avec optimisations
      const rect: CollisionRect = {
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        // Précalculer les bords pour optimiser les tests
        left: obj.x,
        right: obj.x + obj.width,
        top: obj.y,
        bottom: obj.y + obj.height
      };

      this.collisionRects.push(rect);
      collisionsCount++;

      console.log(`[COLLISION]   📦 Rectangle ${collisionsCount}: (${rect.x}, ${rect.y}) ${rect.width}x${rect.height}`);
    }

    console.log(`[COLLISION] ✅ ${collisionsCount} rectangles de collision chargés`);
  }

  // ✅ NOUVELLE MÉTHODE : Test de collision par point
  isBlocked(x: number, y: number): boolean {
    // Tester si le point (x, y) est dans l'un des rectangles de collision
    for (const rect of this.collisionRects) {
      if (x >= rect.left && x < rect.right && 
          y >= rect.top && y < rect.bottom) {
        console.log(`[COLLISION] Point (${x}, ${y}) bloqué par rectangle (${rect.x}, ${rect.y}) ${rect.width}x${rect.height}`);
        return true;
      }
    }
    return false;
  }

  // ✅ NOUVELLE MÉTHODE : Test de collision avec hitbox du joueur
  isPlayerBlocked(playerX: number, playerY: number): boolean {
    // Hitbox du joueur (même configuration que côté client)
    const hitboxWidth = 16;
    const hitboxHeight = 16;
    const offsetX = 8;
    const offsetY = 16;

    const playerRect = {
      left: playerX - offsetX,
      right: playerX - offsetX + hitboxWidth,
      top: playerY - offsetY,
      bottom: playerY - offsetY + hitboxHeight
    };

    // Tester collision avec chaque rectangle
    for (const collisionRect of this.collisionRects) {
      if (this.rectanglesOverlap(playerRect, collisionRect)) {
        console.log(`[COLLISION] Joueur à (${playerX}, ${playerY}) bloqué par rectangle (${collisionRect.x}, ${collisionRect.y})`);
        return true;
      }
    }

    return false;
  }

  // ✅ HELPER : Test si deux rectangles se chevauchent
  private rectanglesOverlap(rect1: any, rect2: CollisionRect): boolean {
    return !(rect1.right <= rect2.left || 
             rect1.left >= rect2.right || 
             rect1.bottom <= rect2.top || 
             rect1.top >= rect2.bottom);
  }

  // ✅ NOUVELLE MÉTHODE : Trouver position libre la plus proche
  findNearestFreePosition(startX: number, startY: number, maxRadius: number = 64): { x: number, y: number } {
    console.log(`[COLLISION] Recherche position libre près de (${startX}, ${startY})`);
    
    // Tester en spirale depuis la position de départ
    for (let radius = 8; radius <= maxRadius; radius += 8) {
      const positions = this.generateSpiralPositions(startX, startY, radius);
      
      for (const pos of positions) {
        if (!this.isPlayerBlocked(pos.x, pos.y)) {
          console.log(`[COLLISION] ✅ Position libre trouvée à (${pos.x}, ${pos.y})`);
          return pos;
        }
      }
    }
    
    console.warn(`[COLLISION] ⚠️ Aucune position libre trouvée, retour spawn par défaut`);
    return { x: 52, y: 48 };
  }

  // ✅ HELPER : Générer des positions en spirale
  private generateSpiralPositions(centerX: number, centerY: number, radius: number): { x: number, y: number }[] {
    const positions = [];
    
    // Positions cardinales
    positions.push(
      { x: centerX + radius, y: centerY },
      { x: centerX - radius, y: centerY },
      { x: centerX, y: centerY + radius },
      { x: centerX, y: centerY - radius }
    );
    
    // Positions diagonales
    positions.push(
      { x: centerX + radius, y: centerY + radius },
      { x: centerX + radius, y: centerY - radius },
      { x: centerX - radius, y: centerY + radius },
      { x: centerX - radius, y: centerY - radius }
    );
    
    return positions;
  }

  // ✅ MÉTHODE : Debug des rectangles de collision
  debugCollisions(): void {
    console.log(`[COLLISION] === DEBUG RECTANGLES DE COLLISION ===`);
    console.log(`[COLLISION] Total: ${this.collisionRects.length} rectangles`);
    
    this.collisionRects.forEach((rect, index) => {
      console.log(`[COLLISION] ${index + 1}. (${rect.x}, ${rect.y}) ${rect.width}x${rect.height} | Bords: L=${rect.left} R=${rect.right} T=${rect.top} B=${rect.bottom}`);
    });
    
    console.log(`[COLLISION] =======================================`);
  }

  // ✅ GETTER : Obtenir tous les rectangles (pour debug)
  getAllCollisionRects(): CollisionRect[] {
    return [...this.collisionRects];
  }

  // ✅ MÉTHODE : Compter les collisions
  getCollisionCount(): number {
    return this.collisionRects.length;
  }
}

export default CollisionManager;