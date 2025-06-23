// client/src/game/ClientCollisionsManager.js
// VERSION avec support de la couche d'objets "collides"

export class ClientCollisionManager {
  constructor(scene) {
    this.scene = scene;
    this.collisionRects = []; // Rectangles de collision
    this.isLoaded = false;
    
    // Système anti-blocage
    this.lastValidPosition = { x: 52, y: 48 };
    this.stuckCounter = 0;
    this.maxStuckAttempts = 3;
    
    console.log(`🛡️ [ClientCollision] Init pour ${scene.scene.key}`);
  }

  // ✅ NOUVELLE MÉTHODE : Charger depuis la couche d'objets "collides"
  loadCollisionsFromObjectLayer() {
    if (!this.scene.map) {
      console.warn(`⚠️ [ClientCollision] Pas de map chargée`);
      return false;
    }

    console.log(`🔍 [ClientCollision] Recherche couche d'objets "collides"...`);
    
    // Chercher la couche d'objets nommée "collides"
    const collidesLayer = this.scene.map.getObjectLayer('collides');
    
    if (!collidesLayer) {
      console.warn(`⚠️ [ClientCollision] Couche d'objets "collides" non trouvée`);
      console.log(`📋 [ClientCollision] Couches disponibles:`, 
        this.scene.map.objects.map(layer => layer.name));
      return false;
    }

    console.log(`✅ [ClientCollision] Couche "collides" trouvée avec ${collidesLayer.objects.length} objets`);
    
    this.collisionRects = [];
    let collisionsCount = 0;
    
    // Parcourir tous les objets de la couche "collides"
    collidesLayer.objects.forEach(obj => {
      // Tiled utilise Y inversé, donc on corrige
      const rect = {
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        // Calculer les bords pour optimiser les tests
        left: obj.x,
        right: obj.x + obj.width,
        top: obj.y,
        bottom: obj.y + obj.height
      };
      
      this.collisionRects.push(rect);
      collisionsCount++;
      
      console.log(`  📦 [ClientCollision] Rectangle ${collisionsCount}: (${rect.x}, ${rect.y}) ${rect.width}x${rect.height}`);
    });

    console.log(`✅ [ClientCollision] ${collisionsCount} rectangles de collision chargés`);
    this.isLoaded = true;
    return true;
  }

  // ✅ NOUVELLE MÉTHODE : Vérifier collision avec rectangles
  isBlocked(x, y) {
    if (!this.isLoaded) return false;
    
    // Tester collision avec chaque rectangle
    for (const rect of this.collisionRects) {
      if (x >= rect.left && x < rect.right && 
          y >= rect.top && y < rect.bottom) {
        return true;
      }
    }
    
    return false;
  }

  // ✅ MÉTHODE AMÉLIORÉE : Test collision avec hitbox du joueur
  canMoveTo(targetX, targetY, currentX = null, currentY = null) {
    if (!this.isLoaded) return true;

    // Hitbox du joueur (ajustée selon votre configuration)
    const hitboxWidth = 16;
    const hitboxHeight = 16;
    const offsetX = 8;
    const offsetY = 16;

    // Coins de la hitbox du joueur
    const playerRect = {
      left: targetX - offsetX,
      right: targetX - offsetX + hitboxWidth,
      top: targetY - offsetY,
      bottom: targetY - offsetY + hitboxHeight
    };

    // Tester collision avec chaque rectangle de collision
    let hasCollision = false;
    for (const collisionRect of this.collisionRects) {
      if (this.rectanglesOverlap(playerRect, collisionRect)) {
        hasCollision = true;
        break;
      }
    }

    // ✅ SYSTÈME ANTI-BLOCAGE
    if (currentX !== null && currentY !== null) {
      const isCurrentlyStuck = this.isPlayerStuck(currentX, currentY);
      
      if (isCurrentlyStuck) {
        console.log(`🆘 [ClientCollision] Joueur bloqué à (${currentX}, ${currentY})`);
        
        // Si le nouveau mouvement réduit les collisions, l'autoriser
        const currentCollisions = this.countPlayerCollisions(currentX, currentY);
        const targetCollisions = hasCollision ? 1 : 0;
        
        if (targetCollisions < currentCollisions) {
          console.log(`🔓 [ClientCollision] Mouvement d'évasion autorisé`);
          this.updateLastValidPosition(targetX, targetY);
          return true;
        }
        
        this.stuckCounter++;
        
        if (this.stuckCounter >= this.maxStuckAttempts) {
          console.log(`🚨 [ClientCollision] Force téléportation anti-blocage !`);
          this.teleportToSafePosition();
          return false;
        }
      } else {
        this.stuckCounter = 0;
        this.updateLastValidPosition(currentX, currentY);
      }
    }

    if (!hasCollision) {
      this.updateLastValidPosition(targetX, targetY);
    }

    return !hasCollision;
  }

  // ✅ HELPER : Test si deux rectangles se chevauchent
  rectanglesOverlap(rect1, rect2) {
    return !(rect1.right <= rect2.left || 
             rect1.left >= rect2.right || 
             rect1.bottom <= rect2.top || 
             rect1.top >= rect2.bottom);
  }

  // ✅ HELPER : Vérifier si le joueur est coincé
  isPlayerStuck(x, y) {
    const hitboxWidth = 16;
    const hitboxHeight = 16;
    const offsetX = 8;
    const offsetY = 16;

    const playerRect = {
      left: x - offsetX,
      right: x - offsetX + hitboxWidth,
      top: y - offsetY,
      bottom: y - offsetY + hitboxHeight
    };

    // Si le joueur chevauche avec un rectangle de collision
    for (const collisionRect of this.collisionRects) {
      if (this.rectanglesOverlap(playerRect, collisionRect)) {
        return true;
      }
    }
    
    return false;
  }

  // ✅ HELPER : Compter les collisions actuelles
  countPlayerCollisions(x, y) {
    const hitboxWidth = 16;
    const hitboxHeight = 16;
    const offsetX = 8;
    const offsetY = 16;

    const playerRect = {
      left: x - offsetX,
      right: x - offsetX + hitboxWidth,
      top: y - offsetY,
      bottom: y - offsetY + hitboxHeight
    };

    let collisions = 0;
    for (const collisionRect of this.collisionRects) {
      if (this.rectanglesOverlap(playerRect, collisionRect)) {
        collisions++;
      }
    }
    
    return collisions;
  }

  // ✅ MÉTHODE : Trouver position libre la plus proche
  findNearestFreePosition(startX, startY, maxRadius = 64) {
    console.log(`🔍 [ClientCollision] Recherche position libre près de (${startX}, ${startY})`);
    
    // Tester en spirale depuis la position de départ
    for (let radius = 8; radius <= maxRadius; radius += 8) {
      const positions = this.generateSpiraPositions(startX, startY, radius);
      
      for (const pos of positions) {
        if (!this.isPlayerStuck(pos.x, pos.y)) {
          console.log(`✅ [ClientCollision] Position libre trouvée à (${pos.x}, ${pos.y})`);
          return pos;
        }
      }
    }
    
    console.warn(`⚠️ [ClientCollision] Aucune position libre trouvée, retour spawn`);
    return { x: 52, y: 48 };
  }

  // ✅ HELPER : Générer des positions en spirale
  generateSpiraPositions(centerX, centerY, radius) {
    const positions = [];
    const step = 8; // Taille d'un pas
    
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

  // ✅ MÉTHODE : Mise à jour position valide
  updateLastValidPosition(x, y) {
    if (!this.isPlayerStuck(x, y)) {
      this.lastValidPosition = { x, y };
    }
  }

  // ✅ MÉTHODE : Téléportation de secours
  teleportToSafePosition() {
    const myPlayer = this.scene.playerManager?.getMyPlayer();
    if (!myPlayer) return;

    console.log(`🚁 [ClientCollision] Téléportation de secours...`);
    
    const safePos = this.findNearestFreePosition(myPlayer.x, myPlayer.y);
    
    myPlayer.x = safePos.x;
    myPlayer.y = safePos.y;
    myPlayer.targetX = safePos.x;
    myPlayer.targetY = safePos.y;
    
    if (this.scene.networkManager) {
      this.scene.networkManager.sendMove(safePos.x, safePos.y, 'down', false);
    }
    
    this.stuckCounter = 0;
    this.updateLastValidPosition(safePos.x, safePos.y);
    
    this.scene.showNotification("Position corrigée automatiquement", "warning");
  }

  // ✅ MÉTHODE : Déblocage d'urgence
  emergencyUnstuck() {
    const myPlayer = this.scene.playerManager?.getMyPlayer();
    if (!myPlayer) return;

    console.log(`🚨 [ClientCollision] Déblocage d'urgence !`);
    
    const freePos = this.findNearestFreePosition(myPlayer.x, myPlayer.y);
    
    myPlayer.x = freePos.x;
    myPlayer.y = freePos.y;
    myPlayer.targetX = freePos.x;
    myPlayer.targetY = freePos.y;
    
    if (this.scene.networkManager) {
      this.scene.networkManager.sendMove(freePos.x, freePos.y, 'down', false);
    }
    
    this.stuckCounter = 0;
    this.updateLastValidPosition(freePos.x, freePos.y);
    
    this.scene.showNotification("Déblocage d'urgence effectué !", "info");
  }

  // ✅ DEBUG : Afficher les rectangles de collision
  debugShowCollisions() {
    if (!this.scene.add || !this.isLoaded) return;

    console.log(`🐛 [ClientCollision] Affichage debug des rectangles...`);
    
    if (this._debugGraphics) {
      this._debugGraphics.destroy();
    }
    
    this._debugGraphics = this.scene.add.graphics();
    this._debugGraphics.setDepth(999);
    
    // Afficher tous les rectangles de collision
    this.collisionRects.forEach((rect, index) => {
      this._debugGraphics.fillStyle(0xff0000, 0.3);
      this._debugGraphics.fillRect(rect.x, rect.y, rect.width, rect.height);
      
      // Bordure
      this._debugGraphics.lineStyle(1, 0xff0000, 1);
      this._debugGraphics.strokeRect(rect.x, rect.y, rect.width, rect.height);
    });
    
    // Afficher la position du joueur et sa hitbox
    const myPlayer = this.scene.playerManager?.getMyPlayer();
    if (myPlayer) {
      // Hitbox du joueur
      this._debugGraphics.lineStyle(2, 0x00ff00);
      this._debugGraphics.strokeRect(myPlayer.x - 8, myPlayer.y - 16, 16, 16);
      
      // Position actuelle
      this._debugGraphics.fillStyle(0x00ff00, 0.8);
      this._debugGraphics.fillCircle(myPlayer.x, myPlayer.y, 3);
      
      // Dernière position valide
      this._debugGraphics.fillStyle(0x0000ff, 0.8);
      this._debugGraphics.fillCircle(this.lastValidPosition.x, this.lastValidPosition.y, 3);
      
      // Statut de collision
      const isStuck = this.isPlayerStuck(myPlayer.x, myPlayer.y);
      const statusColor = isStuck ? 0xff0000 : 0x00ff00;
      this._debugGraphics.fillStyle(statusColor, 0.6);
      this._debugGraphics.fillCircle(myPlayer.x, myPlayer.y - 25, 5);
    }
    
    console.log(`🐛 [ClientCollision] ${this.collisionRects.length} rectangles affichés`);
    console.log(`🐛 Position valide: (${this.lastValidPosition.x}, ${this.lastValidPosition.y})`);
    console.log(`🐛 Compteur blocage: ${this.stuckCounter}/${this.maxStuckAttempts}`);
  }

  hideDebugCollisions() {
    if (this._debugGraphics) {
      this._debugGraphics.destroy();
      this._debugGraphics = null;
      console.log(`🐛 [ClientCollision] Debug masqué`);
    }
  }
}