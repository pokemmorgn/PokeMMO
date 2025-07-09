// Version ULTRA SIMPLE du PokemonFollowerManager
export class PokemonFollowerManager {
  constructor(scene) {
    this.scene = scene;
    this.followers = new Map();
    this.loadedSprites = new Set();
    this.loadingSprites = new Set();
    this.spriteStructures = new Map();
    
    console.log("🐾 [PokemonFollowerManager] Version simple initialisée");
  }

  // Méthodes de chargement des sprites (gardées identiques)
  detectSpriteStructure(width, height) {
    const possibilities = [
      { cols: 6, rows: 8, priority: 1 },
      { cols: 4, rows: 8, priority: 2 },
      { cols: 8, rows: 8, priority: 3 }
    ];

    const validOptions = [];
    possibilities.forEach(p => {
      const frameW = width / p.cols;
      const frameH = height / p.rows;
      if (frameW % 1 === 0 && frameH % 1 === 0) {
        validOptions.push({
          cols: p.cols,
          rows: p.rows,
          frameWidth: frameW,
          frameHeight: frameH,
          priority: p.priority
        });
      }
    });

    if (validOptions.length === 0) {
      return { cols: Math.round(width / 32), rows: 8, frameWidth: Math.round(width / Math.round(width / 32)), frameHeight: Math.round(height / 8) };
    }

    validOptions.sort((a, b) => a.priority - b.priority);
    return validOptions[0];
  }

  async loadPokemonSprite(pokemonId) {
    const spriteKey = `pokemon_${pokemonId}`;
    if (this.loadedSprites.has(spriteKey) || this.loadingSprites.has(spriteKey)) {
      return spriteKey;
    }
    
    this.loadingSprites.add(spriteKey);
    const paddedId = pokemonId.toString().padStart(3, '0');
    const spritePath = `/assets/pokemon/${paddedId}/Walk-Anim.png`;
    
    try {
      const tempKey = `${spriteKey}_temp`;
      
      await new Promise((resolve, reject) => {
        this.scene.load.image(tempKey, spritePath);
        
        this.scene.load.once('complete', () => {
          try {
            const texture = this.scene.textures.get(tempKey);
            const width = texture.source[0].width;
            const height = texture.source[0].height;
            
            const structure = this.detectSpriteStructure(width, height);
            this.spriteStructures.set(pokemonId, structure);
            
            this.scene.load.spritesheet(spriteKey, spritePath, {
              frameWidth: structure.frameWidth,
              frameHeight: structure.frameHeight
            });
            
            this.scene.load.once('complete', () => {
              this.scene.textures.remove(tempKey);
              this.createPokemonAnimations(pokemonId, spriteKey, structure);
              this.loadedSprites.add(spriteKey);
              this.loadingSprites.delete(spriteKey);
              resolve(spriteKey);
            });
            
            this.scene.load.start();
          } catch (error) {
            this.loadingSprites.delete(spriteKey);
            reject(error);
          }
        });
        
        this.scene.load.start();
      });
      
      return spriteKey;
    } catch (error) {
      this.loadingSprites.delete(spriteKey);
      throw error;
    }
  }

  createPokemonAnimations(pokemonId, spriteKey, structure) {
    const directions = [
      { name: 'down', row: 0 },
      { name: 'right', row: 2 },
      { name: 'up', row: 4 },
      { name: 'left', row: 6 }
    ];

    directions.forEach(dir => {
      const walkKey = `pokemon_${pokemonId}_walk_${dir.name}`;
      const idleKey = `pokemon_${pokemonId}_idle_${dir.name}`;
      
      const startFrame = dir.row * structure.cols;
      const endFrame = startFrame + (structure.cols - 1);
      
      if (!this.scene.anims.exists(walkKey)) {
        this.scene.anims.create({
          key: walkKey,
          frames: this.scene.anims.generateFrameNumbers(spriteKey, { start: startFrame, end: endFrame }),
          frameRate: 8,
          repeat: -1
        });
      }
      
      if (!this.scene.anims.exists(idleKey)) {
        this.scene.anims.create({
          key: idleKey,
          frames: [{ key: spriteKey, frame: startFrame }],
          frameRate: 1,
          repeat: 0
        });
      }
    });
  }

  getPlayerToPokemonDirection(playerDirection) {
    const mapping = { 'down': 'down', 'right': 'right', 'up': 'up', 'left': 'left' };
    return mapping[playerDirection] || 'down';
  }

  async createFollower(sessionId, followerData) {
    try {
      this.removeFollower(sessionId);
      
      if (!followerData || !followerData.pokemonId) return;
      
      const spriteKey = await this.loadPokemonSprite(followerData.pokemonId);
      
      const follower = this.scene.physics.add.sprite(
        followerData.x || 0,
        followerData.y || 0,
        spriteKey,
        0
      );
      
      follower.setOrigin(0.5, 1);
      follower.setDepth(4);
      follower.setScale(1.2);
      
      follower.sessionId = sessionId;
      follower.pokemonId = followerData.pokemonId;
      follower.nickname = followerData.nickname;
      follower.lastDirection = followerData.direction || 'down';
      follower.isMoving = false;
      
      // ✅ ULTRA SIMPLE : Pas de targetX/Y, position directe
      follower.x = followerData.x || 0;
      follower.y = followerData.y || 0;
      
      const pokemonDirection = this.getPlayerToPokemonDirection(follower.lastDirection);
      const initialAnimKey = `pokemon_${followerData.pokemonId}_idle_${pokemonDirection}`;
      
      if (this.scene.anims.exists(initialAnimKey)) {
        follower.anims.play(initialAnimKey, true);
      }
      
      this.followers.set(sessionId, follower);
      return follower;
    } catch (error) {
      console.error(`❌ [PokemonFollowerManager] Erreur création follower:`, error);
    }
  }

  // ✅ ULTRA SIMPLE : Juste mettre à jour la position directement
  updateFollower(sessionId, followerData) {
    const follower = this.followers.get(sessionId);
    if (!follower) return;

    // Position directe (pas d'interpolation)
    if (followerData.x !== undefined) follower.x = followerData.x;
    if (followerData.y !== undefined) follower.y = followerData.y;
    
    // Direction et animation
    if (followerData.direction !== undefined) {
      follower.lastDirection = followerData.direction;
      
      const pokemonDirection = this.getPlayerToPokemonDirection(followerData.direction);
      const animKey = followerData.isMoving 
        ? `pokemon_${follower.pokemonId}_walk_${pokemonDirection}`
        : `pokemon_${follower.pokemonId}_idle_${pokemonDirection}`;
      
      if (this.scene.anims.exists(animKey)) {
        follower.anims.play(animKey, true);
      }
    }
  }

  removeFollower(sessionId) {
    const follower = this.followers.get(sessionId);
    if (follower) {
      if (follower.anims && follower.anims.isPlaying) {
        follower.anims.stop();
      }
      try { follower.destroy(); } catch(e) {}
      this.followers.delete(sessionId);
    }
  }

  // ✅ ULTRA SIMPLE : Pas d'interpolation, juste nettoyer
  update(delta = 16) {
    // Rien à faire ! Les positions sont directement mises à jour
  }

  cleanup() {
    Array.from(this.followers.keys()).forEach(sessionId => {
      this.removeFollower(sessionId);
    });
    this.followers.clear();
    this.loadedSprites.clear();
    this.loadingSprites.clear();
    this.spriteStructures.clear();
  }

  debugFollowers() {
    console.log(`🔍 [PokemonFollowerManager] === DEBUG SIMPLE ===`);
    console.log(`📊 Followers actifs: ${this.followers.size}`);
    
    this.followers.forEach((follower, sessionId) => {
      console.log(`🐾 ${sessionId}: ${follower.nickname} à (${follower.x}, ${follower.y}) ${follower.lastDirection}`);
    });
  }

  // Getters simples
  getFollower(sessionId) { return this.followers.get(sessionId); }
  hasFollower(sessionId) { return this.followers.has(sessionId); }
  getFollowerCount() { return this.followers.size; }
  getAllFollowers() { return Array.from(this.followers.values()); }
}
