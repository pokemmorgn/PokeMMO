// ================================================================================================
// CLIENT/SRC/GAME/OVERWORLDPOKEMONMANAGER.JS - VERSION SIMPLIFIÉE CASE PAR CASE
// ================================================================================================

export class OverworldPokemonManager {
  constructor(scene) {
    this.scene = scene;
    this.overworldPokemon = new Map(); // pokemonId -> sprite
    this.loadedSprites = new Set(); // Cache des sprites chargés
    this.loadingSprites = new Set(); // Cache des sprites en cours de chargement
    this.spriteStructures = new Map(); // Cache des structures détectées
    this.gridSize = 32; // Taille d'une case (2 tiles de 16px)
    
    console.log("🌍 [OverworldPokemonManager] Initialisé - Système case par case avec collision");
  }

  /**
   * ✅ Détermine si une animation utilise la première rangée seulement (Swing-Anim)
   */
  isFirstRowOnlyAnimation(animationFile) {
    return animationFile.toLowerCase().includes('swing-anim.png');
  }

  /**
   * ✅ Détecte automatiquement la structure du spritesheet
   */
  detectSpriteStructure(width, height) {
    console.log(`🔍 [OverworldPokemonManager] Détection structure pour ${width}x${height}`);
    
    const possibilities = [
      { cols: 6, rows: 8, priority: 1, name: "6x8 (standard)" },
      { cols: 4, rows: 8, priority: 2, name: "4x8 (compact)" },
      { cols: 8, rows: 8, priority: 3, name: "8x8 (large)" },
      { cols: 9, rows: 8, priority: 1, name: "9x8 (swing)" },
      { cols: 3, rows: 8, priority: 6, name: "3x8 (minimal)" }
    ];

    const validOptions = [];

    possibilities.forEach(p => {
      const frameW = width / p.cols;
      const frameH = height / p.rows;
      
      if (frameW % 1 === 0 && frameH % 1 === 0) {
        const aspectRatio = frameW / frameH;
        const isSquareish = Math.abs(aspectRatio - 1) < 0.5;
        const isReasonableSize = frameW >= 16 && frameW <= 128 && frameH >= 16 && frameH <= 128;
        
        let qualityScore = 0;
        if (isSquareish) qualityScore += 20;
        if (isReasonableSize) qualityScore += 15;
        if (p.rows === 8) qualityScore += 25;
        
        validOptions.push({
          cols: p.cols,
          rows: p.rows,
          frameWidth: frameW,
          frameHeight: frameH,
          totalFrames: p.cols * p.rows,
          priority: p.priority,
          qualityScore: qualityScore,
          name: p.name
        });
      }
    });

    if (validOptions.length === 0) {
      console.warn(`⚠️ [OverworldPokemonManager] Aucune structure valide pour ${width}×${height}`);
      return {
        cols: Math.round(width / 32),
        rows: 8,
        frameWidth: Math.round(width / Math.round(width / 32)),
        frameHeight: Math.round(height / 8),
        name: "fallback"
      };
    }

    validOptions.sort((a, b) => {
      if (b.qualityScore !== a.qualityScore) {
        return b.qualityScore - a.qualityScore;
      }
      return a.priority - b.priority;
    });

    const best = validOptions[0];
    console.log(`✅ [OverworldPokemonManager] Structure détectée: ${best.name}`);
    return best;
  }

  /**
   * ✅ Charge un sprite Pokémon avec animation spécifique
   */
  async loadPokemonSprite(pokemonId, animationFile = 'Walk-Anim.png') {
    const spriteKey = `overworld_pokemon_${pokemonId}_${animationFile.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    if (this.loadedSprites.has(spriteKey) || this.loadingSprites.has(spriteKey)) {
      return spriteKey;
    }
    
    this.loadingSprites.add(spriteKey);
    
    const paddedId = pokemonId.toString().padStart(3, '0');
    const spritePath = `/assets/pokemon/${paddedId}/${animationFile}`;
    
    console.log(`🎨 [OverworldPokemonManager] Chargement sprite ${pokemonId}: ${spritePath}`);
    
    try {
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
            const structure = this.detectSpriteStructure(width, height);
            this.spriteStructures.set(`${pokemonId}_${animationFile}`, structure);
            
            this.scene.load.spritesheet(spriteKey, spritePath, {
              frameWidth: structure.frameWidth,
              frameHeight: structure.frameHeight
            });
            
            this.scene.load.once('complete', () => {
              this.scene.textures.remove(tempKey);
              this.createPokemonAnimations(pokemonId, spriteKey, structure, animationFile);
              this.loadedSprites.add(spriteKey);
              this.loadingSprites.delete(spriteKey);
              resolve(spriteKey);
            });
            
            this.scene.load.start();
            
          } catch (error) {
            console.error(`❌ [OverworldPokemonManager] Erreur texture ${tempKey}:`, error);
            this.loadingSprites.delete(spriteKey);
            reject(error);
          }
        });
        
        this.scene.load.once('loaderror', (fileObj) => {
          console.error(`❌ [OverworldPokemonManager] Erreur chargement ${spritePath}:`, fileObj);
          this.loadingSprites.delete(spriteKey);
          reject(new Error(`Impossible de charger ${spritePath}`));
        });
        
        this.scene.load.start();
      });
      
      return spriteKey;
      
    } catch (error) {
      console.error(`❌ [OverworldPokemonManager] Erreur loadPokemonSprite:`, error);
      this.loadingSprites.delete(spriteKey);
      throw error;
    }
  }

  /**
   * ✅ Crée les animations avec support première rangée pour Swing-Anim
   */
  createPokemonAnimations(pokemonId, spriteKey, structure, animationFile) {
    const isFirstRowOnly = this.isFirstRowOnlyAnimation(animationFile);
    
    console.log(`🎬 [OverworldPokemonManager] Création animations ${pokemonId} - Mode: ${isFirstRowOnly ? 'Swing' : 'Standard'}`);

    if (isFirstRowOnly) {
      this.createSwingAnimations(pokemonId, spriteKey, structure, animationFile);
    } else {
      this.createStandardAnimations(pokemonId, spriteKey, structure, animationFile);
    }
  }

  /**
   * ✅ Animations Swing-Anim (première rangée uniquement)
   */
  createSwingAnimations(pokemonId, spriteKey, structure, animationFile) {
    const animType = animationFile.replace('-Anim.png', '').toLowerCase();
    
    const directions = [
      { name: 'down', col: 0 },
      { name: 'down-left', col: 1 },
      { name: 'left', col: 2 },
      { name: 'up-left', col: 3 },
      { name: 'up', col: 4 },
      { name: 'up-right', col: 5 },
      { name: 'right', col: 6 },
      { name: 'down-right', col: 7 }
    ];

    directions.forEach(dir => {
      if (dir.col < structure.cols) {
        const walkKey = `overworld_pokemon_${pokemonId}_${animType}_${dir.name}`;
        const idleKey = `overworld_pokemon_${pokemonId}_${animType}_idle_${dir.name}`;
        
        const baseFrame = dir.col;
        
        if (!this.scene.anims.exists(walkKey)) {
          const frames = [baseFrame];
          if (structure.cols >= 9) {
            frames.push(8); // Frame d'animation supplémentaire
          }
          
          this.scene.anims.create({
            key: walkKey,
            frames: frames.map(frameIndex => ({
              key: spriteKey,
              frame: frameIndex
            })),
            frameRate: 6,
            repeat: -1
          });
        }
        
        if (!this.scene.anims.exists(idleKey)) {
          this.scene.anims.create({
            key: idleKey,
            frames: [{
              key: spriteKey,
              frame: baseFrame
            }],
            frameRate: 1,
            repeat: 0
          });
        }
      }
    });
  }

  /**
   * ✅ Animations standard (8 rangées) pour Walk-Anim
   */
  createStandardAnimations(pokemonId, spriteKey, structure, animationFile) {
    const directions = [
      { name: 'down', row: 0 },
      { name: 'down-right', row: 1 },
      { name: 'right', row: 2 },
      { name: 'up-right', row: 3 },
      { name: 'up', row: 4 },
      { name: 'up-left', row: 5 },
      { name: 'left', row: 6 },
      { name: 'down-left', row: 7 }
    ];

    const animType = animationFile.replace('-Anim.png', '').toLowerCase();

    directions.forEach(dir => {
      if (dir.row < structure.rows) {
        const walkKey = `overworld_pokemon_${pokemonId}_${animType}_${dir.name}`;
        const idleKey = `overworld_pokemon_${pokemonId}_${animType}_idle_${dir.name}`;
        
        const startFrame = dir.row * structure.cols;
        const endFrame = startFrame + (structure.cols - 1);
        
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
        
        if (!this.scene.anims.exists(idleKey)) {
          this.scene.anims.create({
            key: idleKey,
            frames: [{
              key: spriteKey,
              frame: startFrame
            }],
            frameRate: 1,
            repeat: 0
          });
        }
      }
    });
  }

  /**
   * ✅ Convertit la direction du serveur en direction d'animation
   */
  getDirectionForAnimation(direction) {
    const mapping = {
      'down': 'down',
      'right': 'right',
      'up': 'up',
      'left': 'left',
      'down-right': 'down-right',
      'up-right': 'up-right',
      'up-left': 'up-left',
      'down-left': 'down-left'
    };
    
    return mapping[direction] || 'down';
  }

  /**
   * ✅ Crée ou met à jour un Pokémon overworld avec collision côté client
   */
  async createOrUpdateOverworldPokemon(pokemonData) {
    try {
      const { 
        id, pokemonId, name, x, y, direction, isMoving, isShiny, 
        animations, currentAnimation, targetX, targetY, 
        moveStartTime, moveDuration
      } = pokemonData;
      
      console.log(`🌍 [OverworldPokemonManager] Création/MAJ ${name} (${id}) à (${x}, ${y})`);
      
      // Supprimer l'ancien s'il existe
      if (this.overworldPokemon.has(id)) {
        this.removeOverworldPokemon(id);
      }
      
      // Déterminer le fichier d'animation à utiliser
      const animationFile = animations[currentAnimation] || 'Walk-Anim.png';
      
      // Charger le sprite avec la bonne animation
      const spriteKey = await this.loadPokemonSprite(pokemonId, animationFile);
      
      // Créer le sprite
      const pokemon = this.scene.physics.add.sprite(x, y, spriteKey, 0);
      
      // Configuration
      pokemon.setOrigin(0.5, 1);
      pokemon.setScale(1.0);
      pokemon.setDepth(3);
      
      // Propriétés custom
      pokemon.overworldId = id;
      pokemon.pokemonId = pokemonId;
      pokemon.name = name;
      pokemon.isShiny = isShiny || false;
      pokemon.lastDirection = direction || 'down';
      pokemon.isMoving = isMoving || false;
      pokemon.animations = animations;
      pokemon.currentAnimation = currentAnimation;
      
      // ✅ Propriétés pour mouvement case par case
      pokemon.targetX = targetX || x;
      pokemon.targetY = targetY || y;
      pokemon.moveStartTime = moveStartTime || Date.now();
      pokemon.moveDuration = moveDuration || 800;
      pokemon.serverX = x;
      pokemon.serverY = y;
      
      // ✅ Gestion animation initiale avec protection
      const animDirection = this.getDirectionForAnimation(direction || 'down');
      const animType = animationFile.replace('-Anim.png', '').toLowerCase();
      
      let animKey;
      if (isMoving) {
        animKey = `overworld_pokemon_${pokemonId}_${animType}_${animDirection}`;
      } else {
        animKey = `overworld_pokemon_${pokemonId}_${animType}_idle_${animDirection}`;
      }
      
      // ✅ PROTECTION: Attendre que les animations soient vraiment créées
      this.scene.time.delayedCall(100, () => {
        if (pokemon && pokemon.anims && this.scene.anims.exists(animKey)) {
          try {
            pokemon.anims.play(animKey, true);
            console.log(`🎬 [OverworldPokemonManager] Animation: ${animKey}`);
          } catch (error) {
            console.warn(`⚠️ [OverworldPokemonManager] Erreur animation ${animKey}:`, error);
            // Fallback vers frame statique
            pokemon.setFrame(0);
          }
        } else {
          console.warn(`⚠️ [OverworldPokemonManager] Animation ${animKey} n'existe pas`);
          if (pokemon) {
            pokemon.setFrame(0);
          }
        }
      });
      
      // Ajouter au cache
      this.overworldPokemon.set(id, pokemon);
      
      console.log(`✅ [OverworldPokemonManager] ${name} créé avec collision case par case`);
      
      return pokemon;
      
    } catch (error) {
      console.error(`❌ [OverworldPokemonManager] Erreur création Pokémon:`, error);
    }
  }

  /**
   * ✅ Met à jour un Pokémon existant
   */
  updateOverworldPokemon(pokemonData) {
    const { 
      id, x, y, direction, isMoving, currentAnimation,
      targetX, targetY, moveStartTime, moveDuration
    } = pokemonData;
    
    const pokemon = this.overworldPokemon.get(id);
    if (!pokemon) return;
    
    console.log(`🔄 [OverworldPokemonManager] Update ${pokemon.name}: ${isMoving ? 'BOUGE' : 'IDLE'} ${direction}`);
    
    // ✅ Mise à jour des propriétés
    if (targetX !== undefined) pokemon.targetX = targetX;
    if (targetY !== undefined) pokemon.targetY = targetY;
    if (moveStartTime !== undefined) pokemon.moveStartTime = moveStartTime;
    if (moveDuration !== undefined) pokemon.moveDuration = moveDuration;
    if (x !== undefined) pokemon.serverX = x;
    if (y !== undefined) pokemon.serverY = y;
    if (direction !== undefined) pokemon.lastDirection = direction;
    
    // ✅ Gestion du changement d'état de mouvement
    const wasMoving = pokemon.isMoving;
    if (isMoving !== undefined) pokemon.isMoving = isMoving;
    
    // Changer animation si nécessaire
    if (isMoving !== wasMoving) {
      const animDirection = this.getDirectionForAnimation(direction || pokemon.lastDirection);
      const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').toLowerCase();
      
      const animKey = isMoving 
        ? `overworld_pokemon_${pokemon.pokemonId}_${animType}_${animDirection}`
        : `overworld_pokemon_${pokemon.pokemonId}_${animType}_idle_${animDirection}`;
      
      // ✅ PROTECTION: Vérifier que l'animation existe et que le sprite est prêt
      if (pokemon.anims && this.scene.anims.exists(animKey)) {
        try {
          pokemon.anims.play(animKey, true);
          console.log(`🎬 [OverworldPokemonManager] Animation: ${animKey}`);
        } catch (error) {
          console.warn(`⚠️ [OverworldPokemonManager] Erreur changement animation:`, error);
          pokemon.setFrame(0);
        }
      } else {
        console.warn(`⚠️ [OverworldPokemonManager] Animation ${animKey} non disponible`);
        if (pokemon) {
          pokemon.setFrame(0);
        }
      }
    }
  }

  /**
   * ✅ Mise à jour principale avec interpolation case par case
   */
  update(delta = 16) {
    const now = Date.now();
    
    this.overworldPokemon.forEach((pokemon, id) => {
      if (pokemon.isMoving && pokemon.targetX !== undefined && pokemon.targetY !== undefined) {
        // ✅ Interpolation fluide case par case
        const elapsed = now - pokemon.moveStartTime;
        const progress = Math.min(elapsed / pokemon.moveDuration, 1.0);
        
        if (progress >= 1.0) {
          // ✅ Mouvement terminé
          pokemon.x = pokemon.targetX;
          pokemon.y = pokemon.targetY;
          console.log(`🎯 [OverworldPokemonManager] ${pokemon.name} arrivé à (${pokemon.targetX}, ${pokemon.targetY})`);
        } else {
          // ✅ Interpolation en cours
          const easeProgress = this.easeInOutQuad(progress);
          
          const startX = pokemon.serverX;
          const startY = pokemon.serverY;
          
          pokemon.x = startX + (pokemon.targetX - startX) * easeProgress;
          pokemon.y = startY + (pokemon.targetY - startY) * easeProgress;
        }
      }
      
      // ✅ Mise à jour de la profondeur
      pokemon.setDepth(3 + (pokemon.y / 1000));
    });
  }

  /**
   * ✅ Fonction d'easing simple pour mouvement fluide
   */
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * ✅ Supprime un Pokémon overworld
   */
  removeOverworldPokemon(id) {
    const pokemon = this.overworldPokemon.get(id);
    if (pokemon) {
      console.log(`🗑️ [OverworldPokemonManager] Suppression Pokémon ${id}`);
      
      if (pokemon.anims && pokemon.anims.isPlaying) {
        pokemon.anims.stop();
      }
      
      try { pokemon.destroy(); } catch(e) {}
      this.overworldPokemon.delete(id);
    }
  }

  /**
   * ✅ Gestion des messages du serveur
   */
  handleServerMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case 'OVERWORLD_POKEMON_SPAWN':
        this.createOrUpdateOverworldPokemon(data);
        break;
        
      case 'OVERWORLD_POKEMON_UPDATE':
        this.updateOverworldPokemon(data);
        break;
        
      case 'OVERWORLD_POKEMON_REMOVE':
        this.removeOverworldPokemon(data.id);
        break;
        
      case 'OVERWORLD_POKEMON_SYNC':
        this.syncAllOverworldPokemon(data.pokemon);
        break;
        
      case 'OVERWORLD_POKEMON_SPAWN_REQUEST':
        this.handlePokemonSpawnRequest(data);
        break;
        
      case 'OVERWORLD_POKEMON_MOVE_REQUEST':
        this.handlePokemonMoveRequest(data);
        break;
        
      default:
        console.warn(`⚠️ [OverworldPokemonManager] Message inconnu: ${type}`);
    }
  }

  /**
   * ✅ Gestion demande de spawn (vérification collision)
   */
  handlePokemonSpawnRequest(data) {
    const { id, x, y } = data;
    
    // Vérifier si la position est libre
    const canSpawn = this.canSpawnAt(x, y);
    
    // ✅ CORRECTION: Utiliser networkManager.room.send au lieu de scene.network.send
    if (this.scene.networkManager?.room) {
      this.scene.networkManager.room.send('overworldPokemonSpawnResponse', {
        ...data,
        success: canSpawn,
        x: x,
        y: y
      });
    } else {
      console.error(`❌ [OverworldPokemonManager] Pas de connexion réseau pour répondre au spawn`);
    }
    
    console.log(`🎯 [OverworldPokemonManager] Spawn request ${id}: ${canSpawn ? 'OK' : 'BLOQUÉ'} à (${x}, ${y})`);
  }

  /**
   * ✅ Gestion demande de mouvement (vérification collision)
   */
  handlePokemonMoveRequest(data) {
    const { id, fromX, fromY, toX, toY, direction } = data;
    
    // Vérifier si le mouvement est possible
    const canMove = this.canMoveTo(toX, toY) && !this.isPokemonAt(toX, toY);
    
    // ✅ CORRECTION: Utiliser networkManager.room.send
    if (this.scene.networkManager?.room) {
      this.scene.networkManager.room.send('overworldPokemonMoveResponse', {
        id,
        success: canMove,
        toX,
        toY,
        direction
      });
    } else {
      console.error(`❌ [OverworldPokemonManager] Pas de connexion réseau pour répondre au mouvement`);
    }
    
    console.log(`🚀 [OverworldPokemonManager] Move request ${id}: ${canMove ? 'OK' : 'BLOQUÉ'} (${fromX},${fromY}) → (${toX},${toY})`);
  }

  /**
   * ✅ Vérification si on peut spawn à une position
   */
  canSpawnAt(x, y) {
    // Vérifier collision avec les murs
    if (!this.canMoveTo(x, y)) {
      return false;
    }
    
    // Vérifier collision avec autres Pokémon
    if (this.isPokemonAt(x, y)) {
      return false;
    }
    
    // Vérifier collision avec le joueur
    const player = this.scene.playerManager?.getMyPlayer();
    if (player) {
      const distance = Math.abs(player.x - x) + Math.abs(player.y - y);
      if (distance < this.gridSize) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * ✅ Vérification si on peut se déplacer vers une position
   */
  canMoveTo(x, y) {
    if (!this.scene.collisionManager) {
      return true; // Pas de collision manager = pas de vérification
    }
    
    // Utiliser le même système de collision que le joueur
    return this.scene.collisionManager.canMoveTo(x, y);
  }

  /**
   * ✅ Vérification si un Pokémon est déjà à cette position
   */
  isPokemonAt(x, y) {
    for (const pokemon of this.overworldPokemon.values()) {
      const distance = Math.abs(pokemon.x - x) + Math.abs(pokemon.y - y);
      if (distance < this.gridSize / 2) {
        return true;
      }
    }
    return false;
  }

  /**
   * ✅ Synchronise tous les Pokémon overworld
   */
  async syncAllOverworldPokemon(pokemonList) {
    console.log(`🔄 [OverworldPokemonManager] Synchronisation de ${pokemonList.length} Pokémon`);
    
    // Supprimer les Pokémon qui ne sont plus dans la liste
    const activeIds = new Set(pokemonList.map(p => p.id));
    this.overworldPokemon.forEach((pokemon, id) => {
      if (!activeIds.has(id)) {
        this.removeOverworldPokemon(id);
      }
    });
    
    // Créer ou mettre à jour les Pokémon
    for (const pokemonData of pokemonList) {
      if (this.overworldPokemon.has(pokemonData.id)) {
        this.updateOverworldPokemon(pokemonData);
      } else {
        await this.createOrUpdateOverworldPokemon(pokemonData);
      }
    }
    
    console.log(`✅ [OverworldPokemonManager] Synchronisation terminée`);
  }

  /**
   * ✅ Nettoie tous les Pokémon overworld
   */
  cleanup() {
    console.log(`🧹 [OverworldPokemonManager] Nettoyage de ${this.overworldPokemon.size} Pokémon`);
    
    Array.from(this.overworldPokemon.keys()).forEach(id => {
      this.removeOverworldPokemon(id);
    });
    
    this.overworldPokemon.clear();
    this.loadedSprites.clear();
    this.loadingSprites.clear();
    this.spriteStructures.clear();
  }

  /**
   * ✅ Debug simplifié
   */
  debugOverworldPokemon() {
    console.log(`🔍 [OverworldPokemonManager] === DEBUG SIMPLE ===`);
    console.log(`📊 Pokémon actifs: ${this.overworldPokemon.size}`);
    console.log(`🎨 Sprites chargés: ${this.loadedSprites.size}`);
    console.log(`🛡️ Collision manager: ${this.scene.collisionManager ? 'ACTIF' : 'INACTIF'}`);
    console.log(`📏 Taille grille: ${this.gridSize}px`);
    
    this.overworldPokemon.forEach((pokemon, id) => {
      const moveProgress = pokemon.moveStartTime && pokemon.moveDuration ? 
        `${(((Date.now() - pokemon.moveStartTime) / pokemon.moveDuration) * 100).toFixed(1)}%` : 'N/A';
      
      console.log(`🌍 ${id}:`, {
        name: pokemon.name,
        position: `(${pokemon.x.toFixed(1)}, ${pokemon.y.toFixed(1)})`,
        target: `(${pokemon.targetX?.toFixed(1)}, ${pokemon.targetY?.toFixed(1)})`,
        direction: pokemon.lastDirection,
        isMoving: pokemon.isMoving,
        moveProgress: moveProgress,
        currentAnimation: pokemon.currentAnimation
      });
    });
  }

  // =======================================
  // GETTERS UTILES
  // =======================================

  getOverworldPokemon(id) {
    return this.overworldPokemon.get(id);
  }

  hasOverworldPokemon(id) {
    return this.overworldPokemon.has(id);
  }

  getOverworldPokemonCount() {
    return this.overworldPokemon.size;
  }

  getAllOverworldPokemon() {
    return Array.from(this.overworldPokemon.values());
  }

  getMovingPokemon() {
    return Array.from(this.overworldPokemon.values()).filter(pokemon => pokemon.isMoving);
  }

  getIdlePokemon() {
    return Array.from(this.overworldPokemon.values()).filter(pokemon => !pokemon.isMoving);
  }
}
