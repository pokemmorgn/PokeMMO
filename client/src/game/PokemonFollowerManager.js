// ================================================================================================
// CLIENT/SRC/GAME/POKEMONFOLLOWERMANAGER.JS - VERSION FINALE SIMPLE
// ================================================================================================

export class PokemonFollowerManager {
  constructor(scene) {
    this.scene = scene;
    this.followers = new Map(); // sessionId -> follower sprite
    this.loadedSprites = new Set(); // Cache des sprites déjà chargés
    this.loadingSprites = new Set(); // Cache des sprites en cours de chargement
    this.spriteStructures = new Map(); // Cache des structures détectées par pokemonId
    
    console.log("🐾 [PokemonFollowerManager] Version simple initialisée");
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
      follower.setDepth(3.5); // ✅ CORRIGÉ: Profondeur plus faible que le joueur (4.5)
      follower.setScale(1.2); // Même échelle que les joueurs
      
      // Propriétés custom
      follower.sessionId = sessionId;
      follower.pokemonId = followerData.pokemonId;
      follower.isShiny = followerData.isShiny || false;
      follower.nickname = followerData.nickname;
      follower.lastDirection = followerData.direction || 'down';
      follower.isMoving = false;
      
      // ✅ Position cible pour interpolation
      follower.targetX = followerData.x || 0;
      follower.targetY = followerData.y || 0;
      
      // Animation initiale
      const pokemonDirection = this.getPlayerToPokemonDirection(followerData.direction || 'down');
      const initialAnimKey = `pokemon_${followerData.pokemonId}_idle_${pokemonDirection}`;
      
      if (this.scene.anims.exists(initialAnimKey)) {
        follower.anims.play(initialAnimKey, true);
        console.log(`🎬 [PokemonFollowerManager] Animation initiale: ${initialAnimKey}`);
      } else {
        console.warn(`⚠️ [PokemonFollowerManager] Animation initiale ${initialAnimKey} n'existe pas`);
      }
      
      // Ajouter au cache
      this.followers.set(sessionId, follower);
      
      console.log(`✅ [PokemonFollowerManager] Follower créé: ${followerData.nickname || `Pokémon #${followerData.pokemonId}`} pour ${sessionId}`);
      
      return follower;
      
    } catch (error) {
      console.error(`❌ [PokemonFollowerManager] Erreur création follower:`, error);
    }
  }

  /**
   * Met à jour un follower existant
   */
  updateFollower(sessionId, followerData) {
    const follower = this.followers.get(sessionId);
    if (!follower) {
      console.warn(`⚠️ [PokemonFollowerManager] Follower ${sessionId} non trouvé pour mise à jour`);
      return;
    }

    // ✅ POSITION DIRECTE (pas d'interpolation) pour arrêt net
    if (followerData.x !== undefined && followerData.y !== undefined) {
      follower.x = followerData.x;
      follower.y = followerData.y;
      follower.targetX = followerData.x;
      follower.targetY = followerData.y;
    }
    
    // ✅ État de mouvement direct
    if (followerData.isMoving !== undefined) {
      follower.isMoving = followerData.isMoving;
    }
    
    // Direction et animation
    if (followerData.direction !== undefined) {
      follower.lastDirection = followerData.direction;
      
      const pokemonDirection = this.getPlayerToPokemonDirection(followerData.direction);
      const animKey = followerData.isMoving 
        ? `pokemon_${follower.pokemonId}_walk_${pokemonDirection}`
        : `pokemon_${follower.pokemonId}_idle_${pokemonDirection}`;
      
      if (this.scene.anims.exists(animKey)) {
        follower.anims.play(animKey, true);
      } else {
        console.warn(`⚠️ [PokemonFollowerManager] Animation ${animKey} n'existe pas`);
      }
    }
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
    }
  }

  /**
   * Met à jour tous les followers - PAS D'INTERPOLATION pour arrêt net
   */
  update(delta = 16) {
    // ✅ RIEN À FAIRE : Les positions sont mises à jour directement
    // Pas d'interpolation = arrêt net exactement où le serveur dit
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
  }

  /**
   * Debug - affiche l'état des followers
   */
  debugFollowers() {
    console.log(`🔍 [PokemonFollowerManager] === DEBUG FOLLOWERS ===`);
    console.log(`📊 Followers actifs: ${this.followers.size}`);
    console.log(`🎨 Sprites chargés: ${this.loadedSprites.size}`);
    console.log(`⏳ Sprites en chargement: ${this.loadingSprites.size}`);
    console.log(`📐 Structures détectées: ${this.spriteStructures.size}`);
    
    this.followers.forEach((follower, sessionId) => {
      console.log(`🐾 ${sessionId}:`, {
        pokemonId: follower.pokemonId,
        nickname: follower.nickname,
        position: `(${follower.x.toFixed(1)}, ${follower.y.toFixed(1)})`,
        target: `(${follower.targetX?.toFixed(1)}, ${follower.targetY?.toFixed(1)})`,
        direction: follower.lastDirection,
        isMoving: follower.isMoving,
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
}
