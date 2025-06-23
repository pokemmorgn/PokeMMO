// client/src/game/ClientCollisionManager.js
// Gestionnaire de collisions côté client - VERSION SIMPLE
// Bloque juste l'accès, le serveur fait la vérification finale

export class ClientCollisionManager {
  constructor(scene) {
    this.scene = scene;
    this.collisionTiles = new Set();
    this.tileWidth = 16;
    this.tileHeight = 16;
    this.isLoaded = false;
    
    console.log(`🛡️ [ClientCollision] Init pour ${scene.scene.key}`);
  }

  // ✅ Charger les collisions depuis la tilemap
  loadCollisionsFromTilemap() {
    if (!this.scene.worldLayer) {
      console.warn(`⚠️ [ClientCollision] Pas de worldLayer`);
      return false;
    }

    console.log(`🔍 [ClientCollision] Chargement collisions...`);
    
    this.collisionTiles.clear();
    this.tileWidth = this.scene.map.tileWidth || 16;
    this.tileHeight = this.scene.map.tileHeight || 16;
    
    let collisionsCount = 0;
    
    // Parcourir toutes les tiles du worldLayer
    this.scene.worldLayer.forEachTile((tile) => {
      if (tile && tile.collides) {
        this.collisionTiles.add(`${tile.x},${tile.y}`);
        collisionsCount++;
      }
    });

    console.log(`✅ [ClientCollision] ${collisionsCount} tiles bloquantes`);
    this.isLoaded = true;
    return true;
  }

  // ✅ Vérifier si une position (pixels) est bloquée
  isBlocked(x, y) {
    if (!this.isLoaded) return false; // Si pas chargé, laisser passer
    
    const tileX = Math.floor(x / this.tileWidth);
    const tileY = Math.floor(y / this.tileHeight);
    
    return this.collisionTiles.has(`${tileX},${tileY}`);
  }

  // ✅ Méthode principale : peut-on bouger vers cette position ?
  canMoveTo(targetX, targetY) {
  if (!this.isLoaded) return true;

  // Décalage réel de ta hitbox
  const hitboxWidth = 16;
  const hitboxHeight = 16;
  const offsetX = 8;  // correspond à body.setOffset(x)
  const offsetY = 16;

  const corners = [
    { x: targetX - offsetX, y: targetY - offsetY }, // haut gauche
    { x: targetX - offsetX + hitboxWidth - 1, y: targetY - offsetY }, // haut droit
    { x: targetX - offsetX, y: targetY - offsetY + hitboxHeight - 1 }, // bas gauche
    { x: targetX - offsetX + hitboxWidth - 1, y: targetY - offsetY + hitboxHeight - 1 } // bas droit
  ];

  for (const pt of corners) {
    const tileX = Math.floor(pt.x / this.tileWidth);
    const tileY = Math.floor(pt.y / this.tileHeight);
    if (this.collisionTiles.has(`${tileX},${tileY}`)) return false;
  }

  return true;
}


  // ✅ Debug : afficher les collisions avec des rectangles rouges
  debugShowCollisions() {
    if (!this.scene.add || !this.isLoaded) return;

    console.log(`🐛 [ClientCollision] Affichage debug des collisions...`);
    
    // Supprimer les anciens debug rectangles
    if (this._debugGraphics) {
      this._debugGraphics.destroy();
    }
    
    this._debugGraphics = this.scene.add.graphics();
    this._debugGraphics.fillStyle(0xff0000, 0.3); // Rouge semi-transparent
    this._debugGraphics.setDepth(999);
    
    let debugCount = 0;
    this.collisionTiles.forEach(tileKey => {
      const [x, y] = tileKey.split(',').map(Number);
      const pixelX = x * this.tileWidth;
      const pixelY = y * this.tileHeight;
      
      this._debugGraphics.fillRect(pixelX, pixelY, this.tileWidth, this.tileHeight);
      debugCount++;
    });
    
    console.log(`🐛 [ClientCollision] ${debugCount} rectangles de collision affichés`);
  }

  // ✅ Masquer le debug
  hideDebugCollisions() {
    if (this._debugGraphics) {
      this._debugGraphics.destroy();
      this._debugGraphics = null;
      console.log(`🐛 [ClientCollision] Debug masqué`);
    }
  }
}
