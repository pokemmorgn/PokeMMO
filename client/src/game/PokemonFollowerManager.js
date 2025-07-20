// ================================================================================================
// CLIENT/SRC/GAME/POKEMONFOLLOWERMANAGER.JS - VERSION ANTI-LAG OPTIMISÉE
// ================================================================================================

export class PokemonFollowerManager {
  constructor(scene) {
    this.scene = scene;
    this.followers = new Map(); // sessionId -> follower sprite
    this.loadedSprites = new Set(); // Cache des sprites déjà chargés
    this.loadingSprites = new Set(); // Cache des sprites en cours de chargement
    this.spriteStructures = new Map(); // Cache des structures détectées par pokemonId
    
    // ✅ NOUVEAU: Système d'interpolation fluide
    this.interpolationSpeed = 0.15; // Vitesse d'interpolation (0.1 = lent, 0.3 = rapide)
    this.maxInterpolationDistance = 80; // Distance max avant téléportation
    this.smoothingEnabled = true; // Activer le lissage des mouvements
    
    // ✅ NOUVEAU: Cache des dernières positions pour éviter les doublons
    this.lastPositions = new Map(); // sessionId -> {x, y, direction, isMoving}
    
    console.log("🐾 [PokemonFollowerManager] Version anti-lag initialisée avec interpolation fluide");
  }

  /**
   * Détecte automatiquement la structure du spritesheet Pokémon
   */
  detectSpriteStructure(width, height) {
    // Possibilités communes pour les spritesheets Pokémon PokeMMO
    const possibilities = [
      { cols: 6, rows: 8, priority: 1 }, // Le plus commun
      { cols: 4, rows: 8, priority: 2 }, // Version simple
      { cols: 8, rows: 8, priority: 3 }, // Version étendue
      { cols: 5, rows: 8, priority: 4 }, // Rare
      { cols: 7, rows: 8, priority: 5 }, // Original (pour compatibility)
    ];

    const validOptions = [];

    possibilities.forEach(p => {
      const frameW = width / p.cols;
      const frameH = height / p.rows;
      
      // Vérifier que c'est un nombre entier
      if (frameW % 1 === 0 && frameH % 1 === 0) {
        validOptions.push({
          cols: p.cols,
          rows: p.rows,
          frameWidth: frameW,
          frameHeight: frameH,
          totalFrames: p.cols * p.rows,
          priority: p.priority,
          // Bonus si les frames sont carrées ou proches
          squareBonus: Math.abs(frameW - frameH) < 5 ? 10 : 0
        });
      }
    });

    if (validOptions.length === 0) {
      console.warn(`⚠️ [PokemonFollowerManager] Aucune structure valide trouvée pour ${width}×${height}`);
      // Fallback : essayer de deviner
      return {
        cols: Math.round(width / 32), // Assume 32px par frame
        rows: 8,
        frameWidth: Math.round(width / Math.round(width / 32)),
        frameHeight: Math.round(height / 8)
      };
    }

    // Trier par priorité et bonus de carré
    validOptions.sort((a, b) => {
      const scoreA = (10 - a.priority) + a.squareBonus;
      const scoreB = (10 - b.priority) + b.squareBonus;
      return scoreB - scoreA;
    });

    const best = validOptions[0];
    console.log(`📐 [PokemonFollowerManager] Structure détectée: ${best.cols}×${best.rows} (${best.frameWidth}×${best.frameHeight}px par frame)`);
    
    return best;
  }

  /**
   * Charge un sprite Pokémon avec détection automatique de taille
   */
  async loadPokemonSprite(pokemonId) {
    const spriteKey = `pokemon_${pokemonId}`;
    
    // Déjà chargé ou en cours de chargement
    if (this.loadedSprites.has(spriteKey) || this.loadingSprites.has(spriteKey)) {
      return spriteKey;
    }
    
    this.loadingSprites.add(spriteKey);
    
    const paddedId = pokemonId.toString().padStart(3, '0');
    const spritePath = `/assets/pokemon/${paddedId}/Walk-Anim.png`;
    
    console.log(`🎨 [PokemonFollowerManager] Chargement sprite Pokémon ${pokemonId}: ${spritePath}`);
    
    try {
      // Étape 1: Charger comme image pour détecter la taille
      const tempKey = `${spriteKey}_temp`;
      
      await new Promise((resolve, reject) => {
        this.scene.load.image(tempKey, spritePath);
        
        this.scene.load.once('complete', () => {
          try {
            const texture = this.scene.textures.get(tempKey);
            if (!texture || !texture.source[0]) {
              throw new Error(`Texture ${tempKey} introuvable`);
            }
            
            const width = texture.source[0].width;
            const height = texture.source[0].height;
            
            // Détection adaptative de la structure
            const structure = this.detectSpriteStructure(width, height);
            this.spriteStructures.set(pokemonId, structure);
            
            console.log(`📐 [PokemonFollowerManager] Pokémon ${pokemonId}: ${width}x${height} → structure ${structure.cols}×${structure.rows}, frames ${structure.frameWidth}×${structure.frameHeight}`);
            
            // Étape 2: Charger comme spritesheet avec les bonnes dimensions
            this.scene.load.spritesheet(spriteKey, spritePath, {
              frameWidth: structure.frameWidth,
              frameHeight: structure.frameHeight
            });
            
            this.scene.load.once('complete', () => {
              // Nettoyer la texture temporaire
              this.scene.textures.remove(tempKey);
              
              // Créer les animations avec la structure détectée
              this.createPokemonAnimations(pokemonId, spriteKey, structure);
              
              this.loadedSprites.add(spriteKey);
              this.loadingSprites.delete(spriteKey);
              
              console.log(`✅ [PokemonFollowerManager] Sprite ${spriteKey} chargé et animations créées`);
              resolve(spriteKey);
            });
            
            this.scene.load.start();
            
          } catch (error) {
            console.error(`❌ [PokemonFollowerManager] Erreur traitement texture ${tempKey}:`, error);
            this.loadingSprites.delete(spriteKey);
            reject(error);
          }
        });
        
        this.scene.load.once('loaderror', (fileObj) => {
          console.error(`❌ [PokemonFollowerManager] Erreur chargement ${spritePath}:`, fileObj);
          this.loadingSprites.delete(spriteKey);
          reject(new Error(`Impossible de charger ${spritePath}`));
        });
        
        this.scene.load.start();
      });
      
      return spriteKey;
      
    } catch (error) {
      console.error(`❌ [PokemonFollowerManager] Erreur loadPokemonSprite ${pokemonId}:`, error);
      this.loadingSprites.delete(spriteKey);
      throw error;
    }
  }

  /**
   * Crée les animations pour un Pokémon - VERSION ADAPTATIVE
   */
  createPokemonAnimations(pokemonId, spriteKey, structure) {
    const directions = [
      { name: 'down', row: 0 },      // bas
      { name: 'down-right', row: 1 }, // bas droite
      { name: 'right', row: 2 },     // droite
      { name: 'up-right', row: 3 },  // haut droite
      { name: 'up', row: 4 },        // haut
      { name: 'up-left', row: 5 },   // haut gauche
      { name: 'left', row: 6 },      // gauche
      { name: 'down-left', row: 7 }  // bas gauche
    ];

    directions.forEach(dir => {
      const walkKey = `pokemon_${pokemonId}_walk_${dir.name}`;
      const idleKey = `pokemon_${pokemonId}_idle_${dir.name}`;
      
      // Calculer les frames selon la structure détectée
      const startFrame = dir.row * structure.cols;
      const endFrame = startFrame + (structure.cols - 1); // cols-1 car on commence à 0
      
      // Animation de marche (toutes les frames de la ligne)
      if (!this.scene.anims.exists(walkKey)) {
        this.scene.anims.create({
          key: walkKey,
          frames: this.scene.anims.generateFrameNumbers(spriteKey, {
            start: startFrame,
            end: endFrame
          }),
          frameRate: 8,
          repeat: -1
        });
      }
      
      // Animation idle (première frame de la ligne)
      if (!this.scene.anims.exists(idleKey)) {
        this.scene.anims.create({
          key: idleKey,
          frames: [{
            key: spriteKey,
            frame: startFrame // Première frame de la direction
          }],
          frameRate: 1,
          repeat: 0
        });
      }
    });

    console.log(`✅ [PokemonFollowerManager] Toutes les animations créées pour Pokémon ${pokemonId} (structure ${structure.cols}×${structure.rows})`);
  }

  /**
   * Convertit la direction du joueur en direction Pokémon
   */
  getPlayerToPokemonDirection(playerDirection) {
    const mapping = {
      'down': 'down',    // 0
      'right': 'right',  // 2
      'up': 'up',        // 4
      'left': 'left'     // 6
    };
    
    return mapping[playerDirection] || 'down';
  }

  /**
   * ✅ NOUVEAU: Vérifie si les données ont changé pour éviter les updates inutiles
   */
  hasDataChanged(sessionId, newData) {
    const lastData = this.lastPositions.get(sessionId);
    if (!lastData) return true;
    
    return (
      lastData.x !== newData.x ||
      lastData.y !== newData.y ||
      lastData.direction !== newData.direction ||
      lastData.isMoving !== newData.isMoving
    );
  }

  /**
   * ✅ NOUVEAU: Met en cache la dernière position
   */
  cachePosition(sessionId, data) {
    this.lastPositions.set(sessionId, {
      x: data.x,
      y: data.y,
      direction: data.direction,
      isMoving: data.isMoving
    });
  }

  /**
   * Crée un follower Pokémon pour un joueur
   */
  async createFollower(sessionId, followerData) {
    try {
      console.log(`🐾 [PokemonFollowerManager] Création follower pour ${sessionId}:`, followerData);
      
      // Supprimer l'ancien follower s'il existe
      this.removeFollower(sessionId);
      
      if (!followerData || !followerData.pokemonId) {
        console.warn(`⚠️ [PokemonFollowerManager] Données follower invalides pour ${sessionId}`);
        return;
      }
      
      // Charger le sprite si nécessaire
      const spriteKey = await this.loadPokemonSprite(followerData.pokemonId);
      
      // Créer le sprite
      const follower = this.scene.physics.add.sprite(
        followerData.x || 0,
        followerData.y || 0,
        spriteKey,
        0 // Frame initiale
      );
      
      // Configuration du sprite
      follower.setOrigin(0.5, 1);
      follower.setScale(1.2); // Même échelle que les joueurs
      
      // ✅ NOUVEAU: Profondeur initiale selon la direction
      this.setInitialFollowerDepth(follower, followerData.direction || 'down');
      
      // Propriétés custom
      follower.sessionId = sessionId;
      follower.pokemonId = followerData.pokemonId;
      follower.isShiny = followerData.isShiny || false;
      follower.nickname = followerData.nickname;
      follower.lastDirection = followerData.direction || 'down';
      follower.isMoving = false;
      
      // ✅ NOUVEAU: Système d'interpolation fluide
      follower.targetX = followerData.x || 0;
      follower.targetY = followerData.y || 0;
      follower.isInterpolating = false;
      follower.lastUpdateTime = Date.now();
      
      // Animation initiale
      const pokemonDirection = this.getPlayerToPokemonDirection(followerData.direction || 'down');
      const initialAnimKey = `pokemon_${followerData.pokemonId}_idle_${pokemonDirection}`;
      
      if (this.scene.anims.exists(initialAnimKey)) {
        follower.anims.play(initialAnimKey, true);
        console.log(`🎬 [PokemonFollowerManager] Animation initiale: ${initialAnimKey}`);
      } else {
        console.warn(`⚠️ [PokemonFollowerManager] Animation initiale ${initialAnimKey} n'existe pas`);
      }
      
      // ✅ NOUVEAU: Initialiser le cache de position
      this.cachePosition(sessionId, followerData);
      
      // Ajouter au cache
      this.followers.set(sessionId, follower);
      
      console.log(`✅ [PokemonFollowerManager] Follower créé: ${followerData.nickname || `Pokémon #${followerData.pokemonId}`} pour ${sessionId}`);
      
      return follower;
      
    } catch (error) {
      console.error(`❌ [PokemonFollowerManager] Erreur création follower:`, error);
    }
  }

  /**
   * ✅ OPTIMISÉ: Met à jour un follower existant avec interpolation fluide
   */
  updateFollower(sessionId, followerData) {
    const follower = this.followers.get(sessionId);
    if (!follower) {
      console.warn(`⚠️ [PokemonFollowerManager] Follower ${sessionId} non trouvé pour mise à jour`);
      return;
    }

    // ✅ NOUVEAU: Éviter les updates inutiles
    if (!this.hasDataChanged(sessionId, followerData)) {
      return; // Pas de changement, on évite le traitement
    }

    const now = Date.now();
    
    // ✅ NOUVEAU: Position avec interpolation fluide
    if (followerData.x !== undefined && followerData.y !== undefined) {
      const distance = Math.sqrt(
        Math.pow(followerData.x - follower.x, 2) + 
        Math.pow(followerData.y - follower.y, 2)
      );
      
      // Si la distance est trop grande, téléporter directement (transition de carte, etc.)
      if (distance > this.maxInterpolationDistance) {
        console.log(`🚀 [PokemonFollowerManager] Téléportation follower ${sessionId}: distance ${distance.toFixed(1)}px`);
        follower.x = followerData.x;
        follower.y = followerData.y;
        follower.targetX = followerData.x;
        follower.targetY = followerData.y;
        follower.isInterpolating = false;
      } else if (this.smoothingEnabled && distance > 1) {
        // Interpolation fluide pour les petites distances
        follower.targetX = followerData.x;
        follower.targetY = followerData.y;
        follower.isInterpolating = true;
      } else {
        // Micro-mouvements : position directe
        follower.x = followerData.x;
        follower.y = followerData.y;
        follower.targetX = followerData.x;
        follower.targetY = followerData.y;
        follower.isInterpolating = false;
      }
    }
    
    // ✅ OPTIMISÉ: État de mouvement avec logique améliorée
    if (followerData.isMoving !== undefined) {
      const wasMoving = follower.isMoving;
      follower.isMoving = followerData.isMoving;
      
      // ✅ NOUVEAU: Arrêt immédiat si le mouvement s'arrête
      if (wasMoving && !followerData.isMoving) {
        follower.isInterpolating = false;
        follower.targetX = follower.x;
        follower.targetY = follower.y;
      }
    }
    
    // ✅ OPTIMISÉ: Direction et animation seulement si nécessaire
    if (followerData.direction !== undefined && followerData.direction !== follower.lastDirection) {
      follower.lastDirection = followerData.direction;
      
      // ✅ NOUVEAU: Ajuster la profondeur selon la direction
      this.updateFollowerDepth(follower, followerData.direction);
      
      const pokemonDirection = this.getPlayerToPokemonDirection(followerData.direction);
      const animKey = followerData.isMoving 
        ? `pokemon_${follower.pokemonId}_walk_${pokemonDirection}`
        : `pokemon_${follower.pokemonId}_idle_${pokemonDirection}`;
      
      if (this.scene.anims.exists(animKey)) {
        // ✅ OPTIMISATION: Ne jouer l'animation que si elle est différente
        if (!follower.anims.currentAnim || follower.anims.currentAnim.key !== animKey) {
          follower.anims.play(animKey, true);
        }
      } else {
        console.warn(`⚠️ [PokemonFollowerManager] Animation ${animKey} n'existe pas`);
      }
    }
    
    // ✅ NOUVEAU: Mettre à jour le timestamp et cache
    follower.lastUpdateTime = now;
    this.cachePosition(sessionId, followerData);
  }

  /**
   * ✅ NOUVEAU: Définit la profondeur initiale selon la direction
   */
  setInitialFollowerDepth(follower, direction) {
    const myPlayer = this.getMyPlayer();
    const playerDepth = myPlayer ? (myPlayer.depth || 4.5) : 4.5;
    
    switch (direction) {
      case 'up':
        // Si on monte, le follower doit être AU-DESSUS du joueur
        follower.setDepth(playerDepth + 0.5);
        break;
      case 'down':
        // Si on descend, le joueur doit être AU-DESSUS du follower
        follower.setDepth(playerDepth - 0.5);
        break;
      case 'left':
      case 'right':
        // Sur les côtés, légèrement en dessous
        follower.setDepth(playerDepth - 0.1);
        break;
      default:
        follower.setDepth(playerDepth - 0.5);
    }
    
    console.log(`🎯 [PokemonFollowerManager] Profondeur initiale: ${follower.depth} (direction: ${direction}, joueur: ${playerDepth})`);
  }

  /**
   * ✅ NOUVEAU: Met à jour la profondeur selon la direction pour la perspective
   */
  updateFollowerDepth(follower, direction) {
    const myPlayer = this.getMyPlayer();
    if (!myPlayer) return;
    
    const playerDepth = myPlayer.depth || 4.5;
    const oldDepth = follower.depth;
    
    switch (direction) {
      case 'up':
        // Si on monte, le follower doit être AU-DESSUS du joueur
        follower.setDepth(playerDepth + 0.5);
        break;
      case 'down':
        // Si on descend, le joueur doit être AU-DESSUS du follower
        follower.setDepth(playerDepth - 0.5);
        break;
      case 'left':
      case 'right':
        // Sur les côtés, même profondeur ou légèrement en dessous
        follower.setDepth(playerDepth - 0.1);
        break;
      default:
        follower.setDepth(playerDepth - 0.5);
    }
    
    // Log seulement si la profondeur a changé
    if (Math.abs(oldDepth - follower.depth) > 0.1) {
      console.log(`🎭 [PokemonFollowerManager] Profondeur mise à jour: ${oldDepth} → ${follower.depth} (direction: ${direction})`);
    }
  }

  /**
   * ✅ NOUVEAU: Récupère le joueur local
   */
  getMyPlayer() {
    // Essayer de récupérer le joueur depuis la scène
    if (this.scene.playerManager) {
      return this.scene.playerManager.getMyPlayer();
    }
    return null;
  }

  /**
   * Supprime un follower
   */
  removeFollower(sessionId) {
    const follower = this.followers.get(sessionId);
    if (follower) {
      console.log(`🗑️ [PokemonFollowerManager] Suppression follower ${sessionId}`);
      
      // Arrêter les animations
      if (follower.anims && follower.anims.isPlaying) {
        follower.anims.stop();
      }
      
      // Détruire le sprite
      if (follower.body && follower.body.destroy) {
        try { follower.body.destroy(); } catch(e) {}
      }
      
      try { follower.destroy(); } catch(e) {}
      
      this.followers.delete(sessionId);
      
      // ✅ NOUVEAU: Nettoyer le cache de position
      this.lastPositions.delete(sessionId);
    }
  }

  /**
   * ✅ OPTIMISÉ: Met à jour tous les followers avec interpolation
   */
  update(delta = 16) {
    if (!this.smoothingEnabled) return;
    
    this.followers.forEach((follower) => {
      if (follower.isInterpolating) {
        const currentX = follower.x;
        const currentY = follower.y;
        const targetX = follower.targetX;
        const targetY = follower.targetY;
        
        // Calculer la distance restante
        const distanceX = targetX - currentX;
        const distanceY = targetY - currentY;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        // Si on est très proche de la cible, arrêter l'interpolation
        if (distance < 1) {
          follower.x = targetX;
          follower.y = targetY;
          follower.isInterpolating = false;
        } else {
          // Interpolation fluide
          const factor = Math.min(this.interpolationSpeed, distance / 60); // Adaptative selon la distance
          follower.x += distanceX * factor;
          follower.y += distanceY * factor;
        }
      }
    });
  }

  /**
   * Nettoie tous les followers
   */
  cleanup() {
    console.log(`🧹 [PokemonFollowerManager] Nettoyage de ${this.followers.size} followers`);
    
    Array.from(this.followers.keys()).forEach(sessionId => {
      this.removeFollower(sessionId);
    });
    
    this.followers.clear();
    this.loadedSprites.clear();
    this.loadingSprites.clear();
    this.spriteStructures.clear();
    
    // ✅ NOUVEAU: Nettoyer le cache de positions
    this.lastPositions.clear();
  }

  /**
   * ✅ NOUVEAU: Méthodes pour ajuster les performances
   */
  setSmoothingEnabled(enabled) {
    this.smoothingEnabled = enabled;
    console.log(`🎛️ [PokemonFollowerManager] Lissage des mouvements: ${enabled ? 'activé' : 'désactivé'}`);
  }

  setInterpolationSpeed(speed) {
    this.interpolationSpeed = Math.max(0.05, Math.min(0.5, speed));
    console.log(`⚡ [PokemonFollowerManager] Vitesse d'interpolation: ${this.interpolationSpeed}`);
  }

  setMaxInterpolationDistance(distance) {
    this.maxInterpolationDistance = Math.max(20, distance);
    console.log(`📏 [PokemonFollowerManager] Distance max d'interpolation: ${this.maxInterpolationDistance}px`);
  }

  /**
   * Debug - affiche l'état des followers
   */
  debugFollowers() {
    console.log(`🔍 [PokemonFollowerManager] === DEBUG FOLLOWERS ANTI-LAG ===`);
    console.log(`📊 Followers actifs: ${this.followers.size}`);
    console.log(`🎨 Sprites chargés: ${this.loadedSprites.size}`);
    console.log(`⏳ Sprites en chargement: ${this.loadingSprites.size}`);
    console.log(`📐 Structures détectées: ${this.spriteStructures.size}`);
    console.log(`💾 Positions en cache: ${this.lastPositions.size}`);
    console.log(`🎛️ Lissage: ${this.smoothingEnabled}, Vitesse: ${this.interpolationSpeed}, Distance max: ${this.maxInterpolationDistance}`);
    
    this.followers.forEach((follower, sessionId) => {
      console.log(`🐾 ${sessionId}:`, {
        pokemonId: follower.pokemonId,
        nickname: follower.nickname,
        position: `(${follower.x.toFixed(1)}, ${follower.y.toFixed(1)})`,
        target: `(${follower.targetX?.toFixed(1)}, ${follower.targetY?.toFixed(1)})`,
        direction: follower.lastDirection,
        isMoving: follower.isMoving,
        isInterpolating: follower.isInterpolating,
        lastUpdate: follower.lastUpdateTime ? `${Date.now() - follower.lastUpdateTime}ms ago` : 'N/A',
        visible: follower.visible
      });
    });
  }

  /**
   * Getters utiles
   */
  getFollower(sessionId) {
    return this.followers.get(sessionId);
  }

  hasFollower(sessionId) {
    return this.followers.has(sessionId);
  }

  getFollowerCount() {
    return this.followers.size;
  }

  getAllFollowers() {
    return Array.from(this.followers.values());
  }

  getSpriteStructure(pokemonId) {
    return this.spriteStructures.get(pokemonId);
  }

  /**
   * ✅ NOUVEAU: Statistiques de performance
   */
  getPerformanceStats() {
    const interpolatingCount = Array.from(this.followers.values()).filter(f => f.isInterpolating).length;
    
    return {
      totalFollowers: this.followers.size,
      interpolatingFollowers: interpolatingCount,
      cachedPositions: this.lastPositions.size,
      smoothingEnabled: this.smoothingEnabled,
      interpolationSpeed: this.interpolationSpeed,
      maxInterpolationDistance: this.maxInterpolationDistance,
      loadedSprites: this.loadedSprites.size,
      loadingSprites: this.loadingSprites.size
    };
  }
}
