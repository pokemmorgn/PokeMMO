// ================================================================================================
// CLIENT/SRC/GAME/OVERWORLDPOKEMONMANAGER.JS - POKÉMON OVERWORLD AVEC SWING-ANIM
// ================================================================================================

export class OverworldPokemonManager {
  constructor(scene) {
    this.scene = scene;
    this.overworldPokemon = new Map(); // pokemonId -> sprite
    this.loadedSprites = new Set(); // Cache des sprites chargés
    this.loadingSprites = new Set(); // Cache des sprites en cours de chargement
    this.spriteStructures = new Map(); // Cache des structures détectées
    
    console.log("🌍 [OverworldPokemonManager] Initialisé");
  }

  /**
   * ✅ NOUVEAU: Détermine si une animation utilise la première rangée seulement
   */
  isFirstRowOnlyAnimation(animationFile) {
    // Seulement Swing-Anim.png utilise la première rangée
    return animationFile.toLowerCase().includes('swing-anim.png');
  }

  /**
   * Détecte automatiquement la structure du spritesheet
   * ✅ AMÉLIORATION: Plus de possibilités et meilleure logique
   */
  detectSpriteStructure(width, height) {
    console.log(`🔍 [OverworldPokemonManager] Détection structure pour ${width}x${height}`);
    
    const possibilities = [
      // Format standard 8 directions
      { cols: 6, rows: 8, priority: 1, name: "6x8 (standard)" },
      { cols: 4, rows: 8, priority: 2, name: "4x8 (compact)" },
      { cols: 8, rows: 8, priority: 3, name: "8x8 (large)" },
      { cols: 5, rows: 8, priority: 4, name: "5x8 (medium)" },
      { cols: 7, rows: 8, priority: 5, name: "7x8 (extended)" },
      
      // ✅ NOUVEAU: Format Swing-Anim (9x8)
      { cols: 9, rows: 8, priority: 1, name: "9x8 (swing)" },
      
      // Autres formats possibles
      { cols: 3, rows: 8, priority: 6, name: "3x8 (minimal)" },
      { cols: 10, rows: 8, priority: 7, name: "10x8 (extended)" },
      { cols: 12, rows: 8, priority: 8, name: "12x8 (full)" },
      
      // Formats 4 directions
      { cols: 3, rows: 4, priority: 9, name: "3x4 (simple)" },
      { cols: 4, rows: 4, priority: 10, name: "4x4 (basic)" },
      { cols: 6, rows: 4, priority: 11, name: "6x4 (medium)" },
    ];

    const validOptions = [];

    possibilities.forEach(p => {
      const frameW = width / p.cols;
      const frameH = height / p.rows;
      
      if (frameW % 1 === 0 && frameH % 1 === 0) {
        // Calculer un score de qualité
        const aspectRatio = frameW / frameH;
        const isSquareish = Math.abs(aspectRatio - 1) < 0.5;
        const isReasonableSize = frameW >= 16 && frameW <= 128 && frameH >= 16 && frameH <= 128;
        
        let qualityScore = 0;
        
        if (isSquareish) qualityScore += 20;
        if (isReasonableSize) qualityScore += 15;
        if (p.rows === 8) qualityScore += 25;
        if (p.cols > 12) qualityScore -= 10;
        
        validOptions.push({
          cols: p.cols,
          rows: p.rows,
          frameWidth: frameW,
          frameHeight: frameH,
          totalFrames: p.cols * p.rows,
          priority: p.priority,
          qualityScore: qualityScore,
          name: p.name,
          aspectRatio: aspectRatio
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

    // Tri par score de qualité puis priorité
    validOptions.sort((a, b) => {
      if (b.qualityScore !== a.qualityScore) {
        return b.qualityScore - a.qualityScore;
      }
      return a.priority - b.priority;
    });

    const best = validOptions[0];
    
    console.log(`✅ [OverworldPokemonManager] Structure détectée: ${best.name}`);
    console.log(`📊 Frames: ${best.frameWidth}x${best.frameHeight} (${best.totalFrames} total)`);
    
    return best;
  }

  /**
   * Charge un sprite Pokémon avec animation spécifique
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
   * ✅ MODIFIÉ: Crée les animations avec support première rangée pour Swing-Anim
   */
  createPokemonAnimations(pokemonId, spriteKey, structure, animationFile) {
    const isFirstRowOnly = this.isFirstRowOnlyAnimation(animationFile);
    
    console.log(`🎬 [OverworldPokemonManager] Création animations ${pokemonId} - Mode: ${isFirstRowOnly ? 'Première rangée (Swing)' : 'Standard'}`);

    if (isFirstRowOnly) {
      this.createSwingAnimations(pokemonId, spriteKey, structure, animationFile);
    } else {
      this.createStandardAnimations(pokemonId, spriteKey, structure, animationFile);
    }
  }

  /**
   * ✅ NOUVEAU: Animations Swing-Anim utilisant seulement la première rangée
   */
  createSwingAnimations(pokemonId, spriteKey, structure, animationFile) {
    const animType = animationFile.replace('-Anim.png', '').toLowerCase();
    
    // ✅ Directions mappées sur les colonnes de la première rangée (9 colonnes)
    const directions = [
      { name: 'down', col: 0 },
      { name: 'down-left', col: 1 },
      { name: 'left', col: 2 },
      { name: 'up-left', col: 3 },
      { name: 'up', col: 4 },
      { name: 'up-right', col: 5 },
      { name: 'right', col: 6 },
      { name: 'down-right', col: 7 }
      // Colonne 8 = frame bonus/transition
    ];

    directions.forEach(dir => {
      if (dir.col < structure.cols) {
        const walkKey = `overworld_pokemon_${pokemonId}_${animType}_${dir.name}`;
        const idleKey = `overworld_pokemon_${pokemonId}_${animType}_idle_${dir.name}`;
        
        // Frame de base pour cette direction (première rangée seulement)
        const baseFrame = dir.col; // Rangée 0, colonne dir.col
        
        // Animation de marche/vol (peut utiliser plusieurs frames si disponible)
        if (!this.scene.anims.exists(walkKey)) {
          // Pour Swing-Anim, on peut utiliser la frame actuelle + la frame bonus (col 8) pour plus de fluidité
          const frames = [baseFrame];
          if (structure.cols >= 9) {
            frames.push(8); // Frame bonus
          }
          
          this.scene.anims.create({
            key: walkKey,
            frames: frames.map(frameIndex => ({
              key: spriteKey,
              frame: frameIndex
            })),
            frameRate: 6, // Plus lent pour le vol
            repeat: -1
          });
        }
        
        // Animation idle (toujours la première frame de la direction)
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
        
        console.log(`✅ Direction ${dir.name}: frame ${baseFrame} (Swing mode)`);
      }
    });

    console.log(`✅ [OverworldPokemonManager] Animations Swing créées pour Pokémon ${pokemonId} (${animType})`);
  }

  /**
   * ✅ EXISTANT: Animations standard (8 rangées) pour Walk-Anim et autres
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

    console.log(`✅ [OverworldPokemonManager] Animations standard créées pour Pokémon ${pokemonId} (${animType})`);
  }

  /**
   * Convertit la direction du serveur en direction d'animation
   */
  getDirectionForAnimation(direction) {
    const mapping = {
      'down': 'down',
      'right': 'right',
      'up': 'up',
      'left': 'left'
    };
    
    return mapping[direction] || 'down';
  }

  /**
   * Crée ou met à jour un Pokémon overworld
   */
  async createOrUpdateOverworldPokemon(pokemonData) {
    try {
      const { id, pokemonId, name, x, y, direction, isMoving, isShiny, animations, currentAnimation } = pokemonData;
      
      console.log(`🌍 [OverworldPokemonManager] Création/MAJ ${name} (${id}):`, pokemonData);
      
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
      
      // Pour l'interpolation fluide
      pokemon.targetX = x;
      pokemon.targetY = y;
      pokemon.interpolationSpeed = 0.1;
      
      // Animation initiale
      const animDirection = this.getDirectionForAnimation(direction || 'down');
      const animType = animationFile.replace('-Anim.png', '').toLowerCase();
      const animKey = isMoving 
        ? `overworld_pokemon_${pokemonId}_${animType}_${animDirection}`
        : `overworld_pokemon_${pokemonId}_${animType}_idle_${animDirection}`;
      
      if (this.scene.anims.exists(animKey)) {
        pokemon.anims.play(animKey, true);
        console.log(`🎬 [OverworldPokemonManager] Animation: ${animKey}`);
      } else {
        console.warn(`⚠️ [OverworldPokemonManager] Animation ${animKey} n'existe pas`);
      }
      
      // Ajouter au cache
      this.overworldPokemon.set(id, pokemon);
      
      console.log(`✅ [OverworldPokemonManager] ${name} créé (animation: ${currentAnimation})`);
      
      return pokemon;
      
    } catch (error) {
      console.error(`❌ [OverworldPokemonManager] Erreur création Pokémon overworld:`, error);
    }
  }

  /**
   * Met à jour un Pokémon overworld existant
   */
  updateOverworldPokemon(pokemonData) {
    const { id, x, y, direction, isMoving, currentAnimation } = pokemonData;
    const pokemon = this.overworldPokemon.get(id);
    
    if (!pokemon) {
      return; // Ignorer silencieusement les updates pour des Pokémon non locaux
    }
    
    // Mise à jour des cibles pour interpolation fluide
    if (x !== undefined) pokemon.targetX = x;
    if (y !== undefined) pokemon.targetY = y;
    
    // Mise à jour de l'état
    if (isMoving !== undefined) pokemon.isMoving = isMoving;
    
    // Mise à jour direction et animation
    if (direction !== undefined && direction !== pokemon.lastDirection) {
      pokemon.lastDirection = direction;
      
      const animDirection = this.getDirectionForAnimation(direction);
      const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').toLowerCase();
      const animKey = isMoving 
        ? `overworld_pokemon_${pokemon.pokemonId}_${animType}_${animDirection}`
        : `overworld_pokemon_${pokemon.pokemonId}_${animType}_idle_${animDirection}`;
      
      if (this.scene.anims.exists(animKey)) {
        pokemon.anims.play(animKey, true);
      } else {
        console.warn(`⚠️ [OverworldPokemonManager] Animation ${animKey} n'existe pas`);
      }
    }
    
    // Changement d'animation si nécessaire
    if (currentAnimation !== undefined && currentAnimation !== pokemon.currentAnimation) {
      console.log(`🎬 [OverworldPokemonManager] Changement animation: ${pokemon.currentAnimation} → ${currentAnimation}`);
      pokemon.currentAnimation = currentAnimation;
      
      // Recharger le sprite avec la nouvelle animation
      const newAnimationFile = pokemon.animations[currentAnimation];
      if (newAnimationFile) {
        this.changeAnimationSprite(pokemon, newAnimationFile);
      }
    }
  }

  /**
   * Change le sprite d'animation d'un Pokémon
   */
  async changeAnimationSprite(pokemon, newAnimationFile) {
    try {
      const newSpriteKey = await this.loadPokemonSprite(pokemon.pokemonId, newAnimationFile);
      
      // Changer la texture du sprite
      pokemon.setTexture(newSpriteKey, 0);
      
      // Rejouer l'animation avec la nouvelle texture
      const animDirection = this.getDirectionForAnimation(pokemon.lastDirection);
      const animType = newAnimationFile.replace('-Anim.png', '').toLowerCase();
      const animKey = pokemon.isMoving 
        ? `overworld_pokemon_${pokemon.pokemonId}_${animType}_${animDirection}`
        : `overworld_pokemon_${pokemon.pokemonId}_${animType}_idle_${animDirection}`;
      
      if (this.scene.anims.exists(animKey)) {
        pokemon.anims.play(animKey, true);
        console.log(`🎬 [OverworldPokemonManager] Animation changée: ${animKey}`);
      }
      
    } catch (error) {
      console.error(`❌ [OverworldPokemonManager] Erreur changement animation:`, error);
    }
  }

  /**
   * Supprime un Pokémon overworld
   */
  removeOverworldPokemon(id) {
    const pokemon = this.overworldPokemon.get(id);
    if (pokemon) {
      console.log(`🗑️ [OverworldPokemonManager] Suppression Pokémon overworld ${id}`);
      
      if (pokemon.anims && pokemon.anims.isPlaying) {
        pokemon.anims.stop();
      }
      
      if (pokemon.body && pokemon.body.destroy) {
        try { pokemon.body.destroy(); } catch(e) {}
      }
      
      try { pokemon.destroy(); } catch(e) {}
      
      this.overworldPokemon.delete(id);
    }
  }

  /**
   * Mise à jour principale - Interpolation fluide
   */
  update(delta = 16) {
    this.overworldPokemon.forEach((pokemon, id) => {
      // Interpolation fluide vers la position cible
      const dx = pokemon.targetX - pokemon.x;
      const dy = pokemon.targetY - pokemon.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 1) {
        const speed = pokemon.interpolationSpeed;
        pokemon.x += dx * speed;
        pokemon.y += dy * speed;
        
        // Mettre à jour la profondeur selon la position Y
        pokemon.setDepth(3 + (pokemon.y / 1000));
      }
    });
  }

  /**
   * Gestion des messages du serveur
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
        
      default:
        console.warn(`⚠️ [OverworldPokemonManager] Message inconnu: ${type}`);
    }
  }

  /**
   * Synchronise tous les Pokémon overworld
   */
  async syncAllOverworldPokemon(pokemonList) {
    console.log(`🔄 [OverworldPokemonManager] Synchronisation de ${pokemonList.length} Pokémon overworld`);
    
    // Supprimer ceux qui ne sont plus dans la liste
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
   * Nettoie tous les Pokémon overworld
   */
  cleanup() {
    console.log(`🧹 [OverworldPokemonManager] Nettoyage de ${this.overworldPokemon.size} Pokémon overworld`);
    
    Array.from(this.overworldPokemon.keys()).forEach(id => {
      this.removeOverworldPokemon(id);
    });
    
    this.overworldPokemon.clear();
    this.loadedSprites.clear();
    this.loadingSprites.clear();
    this.spriteStructures.clear();
  }

  /**
   * Debug
   */
  debugOverworldPokemon() {
    console.log(`🔍 [OverworldPokemonManager] === DEBUG OVERWORLD POKEMON ===`);
    console.log(`📊 Pokémon actifs: ${this.overworldPokemon.size}`);
    console.log(`🎨 Sprites chargés: ${this.loadedSprites.size}`);
    
    this.overworldPokemon.forEach((pokemon, id) => {
      console.log(`🌍 ${id}:`, {
        name: pokemon.name,
        pokemonId: pokemon.pokemonId,
        position: `(${pokemon.x.toFixed(1)}, ${pokemon.y.toFixed(1)})`,
        target: `(${pokemon.targetX?.toFixed(1)}, ${pokemon.targetY?.toFixed(1)})`,
        direction: pokemon.lastDirection,
        isMoving: pokemon.isMoving,
        currentAnimation: pokemon.currentAnimation,
        visible: pokemon.visible,
        depth: pokemon.depth
      });
    });
  }

  /**
   * Getters utiles
   */
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

  /**
   * Méthodes utilitaires pour les animations
   */
  changeAllPokemonAnimation(newAnimation) {
    this.overworldPokemon.forEach(pokemon => {
      if (pokemon.animations[newAnimation]) {
        pokemon.currentAnimation = newAnimation;
        const newAnimationFile = pokemon.animations[newAnimation];
        this.changeAnimationSprite(pokemon, newAnimationFile);
      }
    });
  }

  getAllAvailableAnimations() {
    const animations = new Set();
    this.overworldPokemon.forEach(pokemon => {
      Object.keys(pokemon.animations || {}).forEach(anim => {
        animations.add(anim);
      });
    });
    return Array.from(animations);
  }
}
