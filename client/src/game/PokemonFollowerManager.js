// ================================================================================================
// CLIENT/SRC/GAME/POKEMONFOLLOWERMANAGER.JS - VERSION CORRIGÉE
// ================================================================================================

export class PokemonFollowerManager {
  constructor(scene) {
    this.scene = scene;
    this.followers = new Map(); // sessionId -> follower sprite
    this.loadedSprites = new Set(); // Cache des sprites déjà chargés
    this.loadingSprites = new Set(); // Cache des sprites en cours de chargement
    
    console.log("🐾 [PokemonFollowerManager] Initialisé");
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
            
            // Calculer taille des frames (7 colonnes, 8 lignes)
            const frameWidth = Math.floor(width / 7);
            const frameHeight = Math.floor(height / 8);
            
            console.log(`📐 [PokemonFollowerManager] Pokémon ${pokemonId}: ${width}x${height} → frames ${frameWidth}x${frameHeight}`);
            
            // Étape 2: Charger comme spritesheet avec les bonnes dimensions
            this.scene.load.spritesheet(spriteKey, spritePath, {
              frameWidth: frameWidth,
              frameHeight: frameHeight
            });
            
            this.scene.load.once('complete', () => {
              // Nettoyer la texture temporaire
              this.scene.textures.remove(tempKey);
              
              // Créer les animations
              this.createPokemonAnimations(pokemonId, spriteKey);
              
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
   * Crée les animations pour un Pokémon - VERSION CORRIGÉE
   */
  createPokemonAnimations(pokemonId, spriteKey) {
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
      
      // ✅ FIX: Calculer correctement les frames pour chaque ligne
      const startFrame = dir.row * 7;  // Première frame de la ligne
      const endFrame = startFrame + 6; // Dernière frame de la ligne (7 frames = 0-6)
      
      // Animation de marche (frames 0-6 de la ligne spécifique)
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
        
        console.log(`🎬 [PokemonFollowerManager] Animation créée: ${walkKey} (frames ${startFrame}-${endFrame})`);
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
        
        console.log(`🎬 [PokemonFollowerManager] Animation idle créée: ${idleKey} (frame ${startFrame})`);
      }
    });

    console.log(`✅ [PokemonFollowerManager] Toutes les animations créées pour Pokémon ${pokemonId}`);
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
      follower.setDepth(4); // Juste en dessous du joueur (depth 4.5)
      follower.setScale(1.2); // Même échelle que les joueurs
      
      // Propriétés custom
      follower.sessionId = sessionId;
      follower.pokemonId = followerData.pokemonId;
      follower.isShiny = followerData.isShiny || false;
      follower.nickname = followerData.nickname;
      follower.lastDirection = 'down';
      follower.isMoving = false;
      
      // Position cible pour l'interpolation
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
   * Met à jour un follower existant - VERSION AVEC MEILLEUR DEBUG
   */
  updateFollower(sessionId, followerData) {
    const follower = this.followers.get(sessionId);
    if (!follower) {
      console.warn(`⚠️ [PokemonFollowerManager] Follower ${sessionId} non trouvé pour mise à jour`);
      return;
    }

    // Mettre à jour la position cible
    if (followerData.x !== undefined) follower.targetX = followerData.x;
    if (followerData.y !== undefined) follower.targetY = followerData.y;
    
    // Mettre à jour l'état de mouvement
    if (followerData.isMoving !== undefined) {
      follower.isMoving = followerData.isMoving;
    }
    
    // Mettre à jour la direction et l'animation
    if (followerData.direction && followerData.direction !== follower.lastDirection) {
      follower.lastDirection = followerData.direction;
      
      const pokemonDirection = this.getPlayerToPokemonDirection(followerData.direction);
      const animKey = follower.isMoving 
        ? `pokemon_${follower.pokemonId}_walk_${pokemonDirection}`
        : `pokemon_${follower.pokemonId}_idle_${pokemonDirection}`;
      
      console.log(`🎬 [PokemonFollowerManager] Changement animation: ${animKey} (isMoving: ${follower.isMoving})`);
      
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
   * Met à jour tous les followers (interpolation de position)
   */
  update(delta = 16) {
    this.followers.forEach((follower, sessionId) => {
      if (!follower || !follower.scene) return;
      
      // Interpolation de position (plus lente que les joueurs pour l'effet de suivi)
      if (follower.targetX !== undefined && follower.targetY !== undefined) {
        const lerpSpeed = 0.12; // Plus lent que les joueurs (0.18)
        
        follower.x += (follower.targetX - follower.x) * lerpSpeed;
        follower.y += (follower.targetY - follower.y) * lerpSpeed;
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
  }

  /**
   * Debug - affiche l'état des followers
   */
  debugFollowers() {
    console.log(`🔍 [PokemonFollowerManager] === DEBUG FOLLOWERS ===`);
    console.log(`📊 Followers actifs: ${this.followers.size}`);
    console.log(`🎨 Sprites chargés: ${this.loadedSprites.size}`);
    console.log(`⏳ Sprites en chargement: ${this.loadingSprites.size}`);
    
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
   * Test debug pour vérifier les animations
   */
  debugAnimations(pokemonId) {
    const spriteKey = `pokemon_${pokemonId}`;
    console.log(`🔍 [PokemonFollowerManager] === DEBUG ANIMATIONS ${spriteKey} ===`);
    
    const directions = ['down', 'right', 'up', 'left'];
    
    directions.forEach(dir => {
      const walkKey = `pokemon_${pokemonId}_walk_${dir}`;
      const idleKey = `pokemon_${pokemonId}_idle_${dir}`;
      
      console.log(`Direction ${dir}:`);
      console.log(`  - Walk: ${this.scene.anims.exists(walkKey) ? '✅' : '❌'} ${walkKey}`);
      console.log(`  - Idle: ${this.scene.anims.exists(idleKey) ? '✅' : '❌'} ${idleKey}`);
      
      if (this.scene.anims.exists(walkKey)) {
        const anim = this.scene.anims.get(walkKey);
        console.log(`    Frames: ${anim.frames[0]?.frame} - ${anim.frames[anim.frames.length-1]?.frame}`);
      }
    });
  }

  /**
   * Force la recréation d'un follower (pour les tests)
   */
  async recreateFollower(sessionId) {
    const follower = this.followers.get(sessionId);
    if (!follower) {
      console.warn(`⚠️ [PokemonFollowerManager] Pas de follower à recréer pour ${sessionId}`);
      return;
    }
    
    // Sauvegarder les données
    const data = {
      pokemonId: follower.pokemonId,
      nickname: follower.nickname,
      x: follower.x,
      y: follower.y,
      direction: follower.lastDirection,
      isMoving: follower.isMoving,
      isShiny: follower.isShiny
    };
    
    // Supprimer et recréer
    this.removeFollower(sessionId);
    
    setTimeout(async () => {
      await this.createFollower(sessionId, data);
    }, 100);
    
    console.log(`🔄 [PokemonFollowerManager] Follower ${sessionId} recréé`);
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
}
