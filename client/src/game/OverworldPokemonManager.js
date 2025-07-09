// ================================================================================================
// CLIENT/SRC/GAME/OVERWORLDPOKEMONMANAGER.JS - POKÉMON OVERWORLD AVEC MOUVEMENT FLUIDE
// ================================================================================================

export class OverworldPokemonManager {
  constructor(scene) {
    this.scene = scene;
    this.overworldPokemon = new Map(); // pokemonId -> sprite
    this.loadedSprites = new Set(); // Cache des sprites chargés
    this.loadingSprites = new Set(); // Cache des sprites en cours de chargement
    this.spriteStructures = new Map(); // Cache des structures détectées
    
    console.log("🌍 [OverworldPokemonManager] Initialisé avec mouvement fluide");
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
   * ✅ MÉTHODE MODIFIÉE: Crée ou met à jour un Pokémon overworld avec mouvement fluide
   */
  async createOrUpdateOverworldPokemon(pokemonData) {
    try {
      const { 
        id, pokemonId, name, x, y, direction, isMoving, isShiny, 
        animations, currentAnimation, targetX, targetY, 
        moveStartTime, moveDuration, lastDirectionFrame 
      } = pokemonData;
      
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
      
      // ✅ NOUVELLES PROPRIÉTÉS POUR MOUVEMENT FLUIDE
      pokemon.targetX = targetX || x;
      pokemon.targetY = targetY || y;
      pokemon.moveStartTime = moveStartTime || Date.now();
      pokemon.moveDuration = moveDuration || 1000;
      pokemon.lastDirectionFrame = lastDirectionFrame || direction;
      pokemon.interpolationSpeed = 0.05; // Plus lent pour plus de fluidité
      pokemon.isInterpolating = false; // État d'interpolation locale
      pokemon.serverX = x; // Position serveur de référence
      pokemon.serverY = y;
      
      // ✅ GESTION ANIMATION INITIALE AMÉLIORÉE
      const animDirection = this.getDirectionForAnimation(direction || 'down');
      const animType = animationFile.replace('-Anim.png', '').toLowerCase();
      
      let animKey;
      if (isMoving) {
        // ✅ ANIMATION DE MOUVEMENT
        animKey = `overworld_pokemon_${pokemonId}_${animType}_${animDirection}`;
        pokemon.isInterpolating = true;
      } else {
        // ✅ ANIMATION IDLE AVEC DERNIÈRE DIRECTION
        const idleDirection = lastDirectionFrame ? this.getDirectionForAnimation(lastDirectionFrame) : animDirection;
        animKey = `overworld_pokemon_${pokemonId}_${animType}_idle_${idleDirection}`;
      }
      
      if (this.scene.anims.exists(animKey)) {
        pokemon.anims.play(animKey, true);
        console.log(`🎬 [OverworldPokemonManager] Animation: ${animKey}`);
      } else {
        console.warn(`⚠️ [OverworldPokemonManager] Animation ${animKey} n'existe pas`);
      }
      
      // Ajouter au cache
      this.overworldPokemon.set(id, pokemon);
      
      console.log(`✅ [OverworldPokemonManager] ${name} créé (mouvement fluide activé)`);
      
      return pokemon;
      
    } catch (error) {
      console.error(`❌ [OverworldPokemonManager] Erreur création Pokémon overworld:`, error);
    }
  }

  /**
   * ✅ MÉTHODE MODIFIÉE: Met à jour un Pokémon avec mouvement fluide
   */
  updateOverworldPokemon(pokemonData) {
    const { 
      id, x, y, direction, isMoving, currentAnimation,
      targetX, targetY, moveStartTime, moveDuration, lastDirectionFrame
    } = pokemonData;
    
    const pokemon = this.overworldPokemon.get(id);
    
    if (!pokemon) {
      return; // Ignorer silencieusement les updates pour des Pokémon non locaux
    }
    
    console.log(`🔄 [OverworldPokemonManager] Update ${pokemon.name}: isMoving=${isMoving}, pos=(${x}, ${y}), target=(${targetX}, ${targetY})`);
    
    // ✅ MISE À JOUR DES PROPRIÉTÉS DE MOUVEMENT FLUIDE
    if (targetX !== undefined) pokemon.targetX = targetX;
    if (targetY !== undefined) pokemon.targetY = targetY;
    if (moveStartTime !== undefined) pokemon.moveStartTime = moveStartTime;
    if (moveDuration !== undefined) pokemon.moveDuration = moveDuration;
    if (lastDirectionFrame !== undefined) pokemon.lastDirectionFrame = lastDirectionFrame;
    if (x !== undefined) pokemon.serverX = x;
    if (y !== undefined) pokemon.serverY = y;
    
    // ✅ GESTION DU CHANGEMENT D'ÉTAT DE MOUVEMENT
    const wasMoving = pokemon.isMoving;
    if (isMoving !== undefined) pokemon.isMoving = isMoving;
    
    // ✅ DÉMARRAGE OU ARRÊT DU MOUVEMENT
    if (isMoving !== wasMoving) {
      if (isMoving) {
        // ✅ DÉBUT DE MOUVEMENT - DÉMARRER L'INTERPOLATION
        console.log(`🚀 [OverworldPokemonManager] ${pokemon.name} commence le mouvement fluide`);
        pokemon.isInterpolating = true;
        
        // ✅ ANIMATION DE MARCHE
        const animDirection = this.getDirectionForAnimation(direction || pokemon.lastDirection);
        const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').toLowerCase();
        const walkAnimKey = `overworld_pokemon_${pokemon.pokemonId}_${animType}_${animDirection}`;
        
        if (this.scene.anims.exists(walkAnimKey)) {
          pokemon.anims.play(walkAnimKey, true);
          console.log(`🎬 [OverworldPokemonManager] Animation marche: ${walkAnimKey}`);
        }
        
      } else {
        // ✅ FIN DE MOUVEMENT - PASSER EN IDLE
        console.log(`🎯 [OverworldPokemonManager] ${pokemon.name} arrête le mouvement`);
        pokemon.isInterpolating = false;
        
        // ✅ POSITION FINALE EXACTE
        if (x !== undefined) pokemon.x = x;
        if (y !== undefined) pokemon.y = y;
        
        // ✅ ANIMATION IDLE AVEC DERNIÈRE DIRECTION
        const idleDirection = pokemon.lastDirectionFrame ? 
          this.getDirectionForAnimation(pokemon.lastDirectionFrame) : 
          this.getDirectionForAnimation(pokemon.lastDirection);
        
        const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').toLowerCase();
        const idleAnimKey = `overworld_pokemon_${pokemon.pokemonId}_${animType}_idle_${idleDirection}`;
        
        if (this.scene.anims.exists(idleAnimKey)) {
          pokemon.anims.play(idleAnimKey, true);
          console.log(`🏃‍♂️ [OverworldPokemonManager] Animation idle: ${idleAnimKey}`);
        }
      }
    }
    
    // ✅ MISE À JOUR DE LA DIRECTION (sans affecter le mouvement en cours)
   
    
    // ✅ CHANGEMENT D'ANIMATION SI NÉCESSAIRE
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
   * ✅ MISE À JOUR PRINCIPALE MODIFIÉE - Interpolation fluide avancée
   */
  update(delta = 16) {
    const now = Date.now();
    
    this.overworldPokemon.forEach((pokemon, id) => {
      if (pokemon.isInterpolating && pokemon.isMoving) {
        // ✅ INTERPOLATION FLUIDE BASÉE SUR LE TEMPS
        const elapsed = now - pokemon.moveStartTime;
        const progress = Math.min(elapsed / pokemon.moveDuration, 1.0);
        
        if (progress >= 1.0) {
          // ✅ MOUVEMENT TERMINÉ
          pokemon.x = pokemon.targetX;
          pokemon.y = pokemon.targetY;
          pokemon.isInterpolating = false;
          
          console.log(`🎯 [OverworldPokemonManager] ${pokemon.name} a terminé son mouvement à (${pokemon.targetX}, ${pokemon.targetY})`);
        } else {
          // ✅ INTERPOLATION EN COURS - COURBE D'EASING
          const easeProgress = this.easeInOutCubic(progress);
          
          // Position de départ (dernière position serveur connue)
          const startX = pokemon.serverX || pokemon.x;
          const startY = pokemon.serverY || pokemon.y;
          
          // Interpolation vers la cible
          pokemon.x = startX + (pokemon.targetX - startX) * easeProgress;
          pokemon.y = startY + (pokemon.targetY - startY) * easeProgress;
        }
      } else if (!pokemon.isMoving) {
        // ✅ POKEMON IMMOBILE - SYNCHRONISATION DOUCE AVEC SERVEUR
        const dx = pokemon.serverX - pokemon.x;
        const dy = pokemon.serverY - pokemon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 2) { // Seuil de correction
          const correctionSpeed = 0.1;
          pokemon.x += dx * correctionSpeed;
          pokemon.y += dy * correctionSpeed;
        }
      }
      
      // ✅ MISE À JOUR DE LA PROFONDEUR
      pokemon.setDepth(3 + (pokemon.y / 1000));
    });
  }

  /**
   * ✅ NOUVELLE MÉTHODE: Fonction d'easing pour mouvement plus naturel
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
   * ✅ MÉTHODE MODIFIÉE: Debug avec informations de mouvement fluide
   */
  debugOverworldPokemon() {
    console.log(`🔍 [OverworldPokemonManager] === DEBUG OVERWORLD POKEMON (MOUVEMENT FLUIDE) ===`);
    console.log(`📊 Pokémon actifs: ${this.overworldPokemon.size}`);
    console.log(`🎨 Sprites chargés: ${this.loadedSprites.size}`);
    
    this.overworldPokemon.forEach((pokemon, id) => {
      console.log(`🌍 ${id}:`, {
        name: pokemon.name,
        pokemonId: pokemon.pokemonId,
        position: `(${pokemon.x.toFixed(1)}, ${pokemon.y.toFixed(1)})`,
        serverPos: `(${pokemon.serverX?.toFixed(1)}, ${pokemon.serverY?.toFixed(1)})`,
        target: `(${pokemon.targetX?.toFixed(1)}, ${pokemon.targetY?.toFixed(1)})`,
        direction: pokemon.lastDirection,
        isMoving: pokemon.isMoving,
        isInterpolating: pokemon.isInterpolating,
        currentAnimation: pokemon.currentAnimation,
        lastDirectionFrame: pokemon.lastDirectionFrame,
        visible: pokemon.visible,
        depth: pokemon.depth,
        moveProgress: pokemon.moveStartTime ? 
          `${(((Date.now() - pokemon.moveStartTime) / pokemon.moveDuration) * 100).toFixed(1)}%` : 'N/A'
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
   * ✅ MÉTHODE MODIFIÉE: Changer animation avec gestion du mouvement fluide
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

  /**
   * Obtient toutes les animations disponibles
   */
  getAllAvailableAnimations() {
    const animations = new Set();
    this.overworldPokemon.forEach(pokemon => {
      Object.keys(pokemon.animations || {}).forEach(anim => {
        animations.add(anim);
      });
    });
    return Array.from(animations);
  }

  /**
   * ✅ NOUVELLES MÉTHODES UTILITAIRES POUR LE MOUVEMENT FLUIDE
   */

  /**
   * Force la synchronisation d'un Pokémon avec le serveur
   */
  forceSyncPokemon(pokemonId) {
    const pokemon = this.overworldPokemon.get(pokemonId);
    if (pokemon) {
      pokemon.x = pokemon.serverX || pokemon.x;
      pokemon.y = pokemon.serverY || pokemon.y;
      pokemon.isInterpolating = false;
      console.log(`🔄 [OverworldPokemonManager] Synchronisation forcée: ${pokemon.name}`);
    }
  }

  /**
   * Obtient les statistiques de mouvement
   */
  getMovementStats() {
    let moving = 0;
    let interpolating = 0;
    let idle = 0;

    this.overworldPokemon.forEach(pokemon => {
      if (pokemon.isMoving) moving++;
      if (pokemon.isInterpolating) interpolating++;
      if (!pokemon.isMoving) idle++;
    });

    return {
      total: this.overworldPokemon.size,
      moving,
      interpolating,
      idle,
      movingPercentage: this.overworldPokemon.size > 0 ? (moving / this.overworldPokemon.size * 100).toFixed(1) : 0
    };
  }

  /**
   * Teste le système de mouvement fluide
   */
  testFluidMovement(pokemonId) {
    const pokemon = this.overworldPokemon.get(pokemonId);
    if (!pokemon) {
      console.warn(`⚠️ [OverworldPokemonManager] Pokémon ${pokemonId} non trouvé pour test`);
      return;
    }

    console.log(`🧪 [OverworldPokemonManager] Test mouvement fluide pour ${pokemon.name}`);
    
    // Simuler un mouvement
    pokemon.targetX = pokemon.x + 64; // 2 cases à droite
    pokemon.targetY = pokemon.y;
    pokemon.isMoving = true;
    pokemon.isInterpolating = true;
    pokemon.moveStartTime = Date.now();
    pokemon.moveDuration = 2000; // 2 secondes
    pokemon.lastDirection = 'right';

    // Animation de marche
    const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').toLowerCase();
    const walkAnimKey = `overworld_pokemon_${pokemon.pokemonId}_${animType}_right`;
    
    if (this.scene.anims.exists(walkAnimKey)) {
      pokemon.anims.play(walkAnimKey, true);
    }

    // Arrêter le mouvement après la durée
    setTimeout(() => {
      if (this.overworldPokemon.has(pokemonId)) {
        pokemon.isMoving = false;
        pokemon.isInterpolating = false;
        
        const idleAnimKey = `overworld_pokemon_${pokemon.pokemonId}_${animType}_idle_right`;
        if (this.scene.anims.exists(idleAnimKey)) {
          pokemon.anims.play(idleAnimKey, true);
        }
        
        console.log(`✅ [OverworldPokemonManager] Test terminé pour ${pokemon.name}`);
      }
    }, pokemon.moveDuration);
  }

  /**
   * Obtient la distance entre deux Pokémon
   */
  getDistanceBetweenPokemon(id1, id2) {
    const pokemon1 = this.overworldPokemon.get(id1);
    const pokemon2 = this.overworldPokemon.get(id2);
    
    if (!pokemon1 || !pokemon2) {
      return null;
    }
    
    const dx = pokemon2.x - pokemon1.x;
    const dy = pokemon2.y - pokemon1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Trouve les Pokémon dans un rayon donné
   */
  getPokemonInRadius(centerX, centerY, radius) {
    const pokemonInRadius = [];
    
    this.overworldPokemon.forEach((pokemon, id) => {
      const dx = pokemon.x - centerX;
      const dy = pokemon.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= radius) {
        pokemonInRadius.push({
          id,
          pokemon,
          distance
        });
      }
    });
    
    // Trier par distance
    pokemonInRadius.sort((a, b) => a.distance - b.distance);
    
    return pokemonInRadius;
  }

  /**
   * Active/désactive le mode debug visuel
   */
  toggleDebugMode(enabled = true) {
    this.debugMode = enabled;
    
    this.overworldPokemon.forEach(pokemon => {
      if (enabled) {
        // Ajouter des indicateurs visuels de debug
        if (!pokemon.debugGraphics) {
          pokemon.debugGraphics = this.scene.add.graphics();
          pokemon.debugText = this.scene.add.text(0, 0, '', {
            fontSize: '10px',
            fill: '#ffffff',
            backgroundColor: '#000000'
          });
        }
      } else {
        // Supprimer les indicateurs de debug
        if (pokemon.debugGraphics) {
          pokemon.debugGraphics.destroy();
          pokemon.debugText.destroy();
          delete pokemon.debugGraphics;
          delete pokemon.debugText;
        }
      }
    });
    
    console.log(`🔍 [OverworldPokemonManager] Mode debug: ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
  }

  /**
   * Met à jour les indicateurs de debug (appelé dans update() si debugMode activé)
   */
  updateDebugDisplay() {
    if (!this.debugMode) return;
    
    this.overworldPokemon.forEach(pokemon => {
      if (pokemon.debugGraphics && pokemon.debugText) {
        // Effacer les anciens dessins
        pokemon.debugGraphics.clear();
        
        // Dessiner la position cible si en mouvement
        if (pokemon.isMoving && pokemon.targetX !== undefined && pokemon.targetY !== undefined) {
          pokemon.debugGraphics.lineStyle(2, 0xff0000);
          pokemon.debugGraphics.strokeCircle(pokemon.targetX, pokemon.targetY - 16, 8);
          
          // Ligne vers la cible
          pokemon.debugGraphics.lineStyle(1, 0xff0000, 0.5);
          pokemon.debugGraphics.lineBetween(
            pokemon.x, pokemon.y - 16,
            pokemon.targetX, pokemon.targetY - 16
          );
        }
        
        // Position actuelle
        pokemon.debugGraphics.lineStyle(2, 0x00ff00);
        pokemon.debugGraphics.strokeCircle(pokemon.x, pokemon.y - 16, 4);
        
        // Texte d'information
        const moveProgress = pokemon.moveStartTime ? 
          ((Date.now() - pokemon.moveStartTime) / pokemon.moveDuration * 100).toFixed(0) + '%' : 'N/A';
        
        pokemon.debugText.setText(
          `${pokemon.name}\n` +
          `Pos: ${pokemon.x.toFixed(0)},${pokemon.y.toFixed(0)}\n` +
          `Target: ${pokemon.targetX?.toFixed(0)},${pokemon.targetY?.toFixed(0)}\n` +
          `Moving: ${pokemon.isMoving ? 'YES' : 'NO'}\n` +
          `Progress: ${moveProgress}`
        );
        
        pokemon.debugText.setPosition(pokemon.x + 20, pokemon.y - 40);
      }
    });
  }
}
