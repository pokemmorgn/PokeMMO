// ================================================================================================
// CLIENT/SRC/GAME/OVERWORLDPOKEMONMANAGER.JS - POKÉMON OVERWORLD AVEC COLLISION CLIENT
// ================================================================================================

export class OverworldPokemonManager {
  constructor(scene) {
    this.scene = scene;
    this.overworldPokemon = new Map(); // pokemonId -> sprite
    this.loadedSprites = new Set(); // Cache des sprites chargés
    this.loadingSprites = new Set(); // Cache des sprites en cours de chargement
    this.spriteStructures = new Map(); // Cache des structures détectées
    
    console.log("🌍 [OverworldPokemonManager] Initialisé avec collision côté client");
  }

  /**
   * ✅ Détermine si une animation utilise la première rangée seulement
   */
  isFirstRowOnlyAnimation(animationFile) {
    return animationFile.toLowerCase().includes('swing-anim.png');
  }

  /**
   * Détecte automatiquement la structure du spritesheet
   */
  detectSpriteStructure(width, height) {
    console.log(`🔍 [OverworldPokemonManager] Détection structure pour ${width}x${height}`);
    
    const possibilities = [
      { cols: 6, rows: 8, priority: 1, name: "6x8 (standard)" },
      { cols: 4, rows: 8, priority: 2, name: "4x8 (compact)" },
      { cols: 8, rows: 8, priority: 3, name: "8x8 (large)" },
      { cols: 5, rows: 8, priority: 4, name: "5x8 (medium)" },
      { cols: 7, rows: 8, priority: 5, name: "7x8 (extended)" },
      { cols: 9, rows: 8, priority: 1, name: "9x8 (swing)" },
      { cols: 3, rows: 8, priority: 6, name: "3x8 (minimal)" },
      { cols: 10, rows: 8, priority: 7, name: "10x8 (extended)" },
      { cols: 12, rows: 8, priority: 8, name: "12x8 (full)" },
      { cols: 3, rows: 4, priority: 9, name: "3x4 (simple)" },
      { cols: 4, rows: 4, priority: 10, name: "4x4 (basic)" },
      { cols: 6, rows: 4, priority: 11, name: "6x4 (medium)" },
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
   * ✅ Crée les animations avec support première rangée pour Swing-Anim
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
   * ✅ Animations Swing-Anim utilisant seulement la première rangée
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
            frames.push(8);
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
repeat: 0,
duration: 1000
          });
        }
        
        console.log(`✅ Direction ${dir.name}: frame ${baseFrame} (Swing mode)`);
      }
    });

    console.log(`✅ [OverworldPokemonManager] Animations Swing créées pour Pokémon ${pokemonId} (${animType})`);
  }

  /**
   * ✅ Animations standard (8 rangées) pour Walk-Anim et autres
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
      'left': 'left',
      'down-right': 'down-right',
      'up-right': 'up-right',
      'up-left': 'up-left',
      'down-left': 'down-left'
    };
    
    return mapping[direction] || 'down';
  }

  /**
   * ✅ MODIFIÉ: Crée ou met à jour un Pokémon overworld avec collision côté client
   */
  async createOrUpdateOverworldPokemon(pokemonData) {
    try {
      const { 
        id, pokemonId, name, x, y, direction, isMoving, isShiny, 
        animations, currentAnimation, targetX, targetY, 
        moveStartTime, moveDuration, lastDirectionFrame,
        personality, movePattern
      } = pokemonData;
      
      console.log(`🌍 [OverworldPokemonManager] Création/MAJ ${name} (${id}) - ${personality}:`, pokemonData);
      
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
      pokemon.personality = personality || 'calm';
      pokemon.movePattern = movePattern || 'random';
      
      // ✅ NOUVELLES PROPRIÉTÉS POUR MOUVEMENT FLUIDE AVEC COLLISION
      pokemon.targetX = targetX || x;
      pokemon.targetY = targetY || y;
      pokemon.moveStartTime = moveStartTime || Date.now();
      pokemon.moveDuration = moveDuration || 1000;
      pokemon.lastDirectionFrame = lastDirectionFrame || direction;
      pokemon.interpolationSpeed = 0.03; // Plus lent pour éviter les collisions
      pokemon.isInterpolating = false;
      pokemon.serverX = x;
      pokemon.serverY = y;
      pokemon.collisionCheckDistance = 4; // Distance pour anticiper collisions
      pokemon.lastCollisionCheck = 0;
      pokemon.stuckCounter = 0;
      pokemon.alternativePath = null;
      
      // ✅ GESTION ANIMATION INITIALE
      const animDirection = this.getDirectionForAnimation(direction || 'down');
      const animType = animationFile.replace('-Anim.png', '').toLowerCase();
      
      let animKey;
      if (isMoving) {
        animKey = `overworld_pokemon_${pokemonId}_${animType}_${animDirection}`;
        pokemon.isInterpolating = true;
      } else {
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
      
      console.log(`✅ [OverworldPokemonManager] ${name} créé (collision côté client)`);
      
      return pokemon;
      
    } catch (error) {
      console.error(`❌ [OverworldPokemonManager] Erreur création Pokémon overworld:`, error);
    }
  }

  /**
   * ✅ MODIFIÉ: Met à jour un Pokémon avec vérification de collision
   */
  updateOverworldPokemon(pokemonData) {
    const { 
      id, x, y, direction, isMoving, currentAnimation,
      targetX, targetY, moveStartTime, moveDuration, lastDirectionFrame
    } = pokemonData;
    
    const pokemon = this.overworldPokemon.get(id);
    
    if (!pokemon) {
      return;
    }
    
    console.log(`🔄 [OverworldPokemonManager] Update ${pokemon.name}: isMoving=${isMoving}, pos=(${x}, ${y}), target=(${targetX}, ${targetY})`);
    
    // ✅ MISE À JOUR DES PROPRIÉTÉS
    if (targetX !== undefined) pokemon.targetX = targetX;
    if (targetY !== undefined) pokemon.targetY = targetY;
    if (moveStartTime !== undefined) pokemon.moveStartTime = moveStartTime;
    if (moveDuration !== undefined) pokemon.moveDuration = moveDuration;
    if (lastDirectionFrame !== undefined) pokemon.lastDirectionFrame = lastDirectionFrame;
    if (x !== undefined) pokemon.serverX = x;
    if (y !== undefined) pokemon.serverY = y;
    
    // ✅ VÉRIFICATION DE COLLISION POUR LA CIBLE
    if (targetX !== undefined && targetY !== undefined && this.scene.collisionManager) {
      if (!this.scene.collisionManager.canMoveTo(targetX, targetY)) {
        console.log(`🛡️ [OverworldPokemonManager] Collision détectée pour ${pokemon.name} à (${targetX}, ${targetY})`);
        // Trouver un chemin alternatif
        pokemon.alternativePath = this.findAlternativePath(pokemon.x, pokemon.y, targetX, targetY);
        if (pokemon.alternativePath && pokemon.alternativePath.length > 0) {
          const nextPoint = pokemon.alternativePath[0];
          pokemon.targetX = nextPoint.x;
          pokemon.targetY = nextPoint.y;
          console.log(`🔄 [OverworldPokemonManager] Chemin alternatif: (${nextPoint.x}, ${nextPoint.y})`);
        } else {
          // Aucun chemin trouvé, rester sur place
          pokemon.targetX = pokemon.x;
          pokemon.targetY = pokemon.y;
          pokemon.isInterpolating = false;
        }
      }
    }
    
    // ✅ GESTION DU CHANGEMENT D'ÉTAT DE MOUVEMENT
    const wasMoving = pokemon.isMoving;
    if (isMoving !== undefined) pokemon.isMoving = isMoving;
    
    if (isMoving !== wasMoving || (!isMoving && pokemon.anims.currentAnim && !pokemon.anims.currentAnim.key.includes('_idle_'))) {
      if (isMoving) {
        const animDirection = this.getDirectionForAnimation(direction || pokemon.lastDirection);
        const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').toLowerCase();
        const walkAnimKey = `overworld_pokemon_${pokemon.pokemonId}_${animType}_${animDirection}`;
        pokemon.isInterpolating = true;
        pokemon.stuckCounter = 0;
        if (this.scene.anims.exists(walkAnimKey)) {
          pokemon.anims.play(walkAnimKey, true);
          console.log(`🎬 [OverworldPokemonManager] Animation marche: ${walkAnimKey}`);
        }
      } else {
        pokemon.isInterpolating = false;
        const idleDirection = pokemon.lastDirectionFrame
          ? this.getDirectionForAnimation(pokemon.lastDirectionFrame)
          : this.getDirectionForAnimation(direction || pokemon.lastDirection);
        const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').toLowerCase();
        const idleAnimKey = `overworld_pokemon_${pokemon.pokemonId}_${animType}_idle_${idleDirection}`;
        if (this.scene.anims.exists(idleAnimKey)) {
pokemon.anims.play(idleAnimKey, false); // ← false = pas de restart si déjà en cours
          console.log(`🏃‍♂️ [OverworldPokemonManager] Animation idle: ${idleAnimKey}`);
        }
      }
    }
    
    // ✅ CHANGEMENT D'ANIMATION SI NÉCESSAIRE
    if (currentAnimation !== undefined && currentAnimation !== pokemon.currentAnimation) {
      console.log(`🎬 [OverworldPokemonManager] Changement animation: ${pokemon.currentAnimation} → ${currentAnimation}`);
      pokemon.currentAnimation = currentAnimation;
      
      const newAnimationFile = pokemon.animations[currentAnimation];
      if (newAnimationFile) {
        this.changeAnimationSprite(pokemon, newAnimationFile);
      }
    }
  }

  /**
   * ✅ NOUVEAU: Trouve un chemin alternatif en cas de collision
   */
  findAlternativePath(fromX, fromY, toX, toY) {
    if (!this.scene.collisionManager) return null;
    
    const path = [];
    const stepSize = 16; // Une demi-case
    
    // Direction principale
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < stepSize) return null;
    
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Essayer un chemin en contournant l'obstacle
    const perpX = -dirY; // Perpendiculaire
    const perpY = dirX;
    
    // Essayer les deux côtés
    const offsets = [
      { x: perpX * 24, y: perpY * 24 }, // Côté droit
      { x: -perpX * 24, y: -perpY * 24 } // Côté gauche
    ];
    
    for (const offset of offsets) {
      const waypoint1X = fromX + offset.x;
      const waypoint1Y = fromY + offset.y;
      const waypoint2X = toX + offset.x;
      const waypoint2Y = toY + offset.y;
      
      // Vérifier si les waypoints sont libres
      if (this.scene.collisionManager.canMoveTo(waypoint1X, waypoint1Y) &&
          this.scene.collisionManager.canMoveTo(waypoint2X, waypoint2Y)) {
        
        path.push({ x: waypoint1X, y: waypoint1Y });
        path.push({ x: waypoint2X, y: waypoint2Y });
        path.push({ x: toX, y: toY });
        
        console.log(`🛤️ [OverworldPokemonManager] Chemin alternatif trouvé avec ${path.length} étapes`);
        return path;
      }
    }
    
    return null;
  }

  /**
   * ✅ MODIFIÉ: Mise à jour avec vérification de collision continue
   */
  update(delta = 16) {
    const now = Date.now();
    
    this.overworldPokemon.forEach((pokemon, id) => {
      if (pokemon.isInterpolating && pokemon.isMoving) {
        // ✅ VÉRIFICATION DE COLLISION PENDANT LE MOUVEMENT
        if (now - pokemon.lastCollisionCheck > 100) { // Vérifier toutes les 100ms
          const nextX = pokemon.x + (pokemon.targetX - pokemon.x) * pokemon.interpolationSpeed * 2;
          const nextY = pokemon.y + (pokemon.targetY - pokemon.y) * pokemon.interpolationSpeed * 2;
          
          if (this.scene.collisionManager && !this.scene.collisionManager.canMoveTo(nextX, nextY)) {
            console.log(`🛑 [OverworldPokemonManager] ${pokemon.name} bloqué pendant mouvement`);
            
            // Arrêter le mouvement et essayer un chemin alternatif
            pokemon.isInterpolating = false;
            pokemon.stuckCounter = (pokemon.stuckCounter || 0) + 1;
            
            if (pokemon.stuckCounter < 3) {
              // Essayer de contourner
              const alternative = this.findAlternativePath(pokemon.x, pokemon.y, pokemon.targetX, pokemon.targetY);
              if (alternative && alternative.length > 0) {
                pokemon.alternativePath = alternative;
                pokemon.targetX = alternative[0].x;
                pokemon.targetY = alternative[0].y;
                pokemon.isInterpolating = true;
                pokemon.stuckCounter = 0;
              }
            }
          }
          pokemon.lastCollisionCheck = now;
        }
        
        // ✅ INTERPOLATION FLUIDE AVEC COLLISION
        const elapsed = now - pokemon.moveStartTime;
        const progress = Math.min(elapsed / pokemon.moveDuration, 1.0);
        
if (progress >= 1.0) {
  // ✅ MOUVEMENT TERMINÉ
  if (pokemon.alternativePath && pokemon.alternativePath.length > 1) {
    // Passer au point suivant du chemin alternatif
    pokemon.alternativePath.shift();
    const nextPoint = pokemon.alternativePath[0];
    pokemon.x = pokemon.targetX;
    pokemon.y = pokemon.targetY;
    pokemon.setPosition(pokemon.targetX, pokemon.targetY); // ← AJOUTER
    pokemon.targetX = nextPoint.x;
    pokemon.targetY = nextPoint.y;
    pokemon.moveStartTime = now;
    console.log(`🔄 [OverworldPokemonManager] ${pokemon.name} suit chemin alternatif vers (${nextPoint.x}, ${nextPoint.y})`);
  } else {
    // Fin du mouvement
    pokemon.x = pokemon.targetX;
    pokemon.y = pokemon.targetY;
    pokemon.setPosition(pokemon.targetX, pokemon.targetY); // ← AJOUTER
    pokemon.isInterpolating = false;
    pokemon.alternativePath = null;
    console.log(`🎯 [OverworldPokemonManager] ${pokemon.name} a terminé son mouvement à (${pokemon.targetX}, ${pokemon.targetY})`);
  }
} else {
  // ✅ INTERPOLATION EN COURS
  const easeProgress = this.easeInOutCubic(progress);
  
  const startX = pokemon.serverX || pokemon.x;
  const startY = pokemon.serverY || pokemon.y;
  
  const newX = startX + (pokemon.targetX - startX) * easeProgress;
  const newY = startY + (pokemon.targetY - startY) * easeProgress;
  
  // ✅ VÉRIFICATION FINALE AVANT DÉPLACEMENT
  if (!this.scene.collisionManager || this.scene.collisionManager.canMoveTo(newX, newY)) {
    pokemon.x = newX;
    pokemon.y = newY;
    pokemon.setPosition(newX, newY); // ← AJOUTER CETTE LIGNE CRITIQUE
  } else {
    // Collision détectée, arrêter le mouvement
    pokemon.isInterpolating = false;
    pokemon.stuckCounter = (pokemon.stuckCounter || 0) + 1;
    console.log(`🛡️ [OverworldPokemonManager] ${pokemon.name} collision finale à (${newX.toFixed(1)}, ${newY.toFixed(1)})`);
  }
}
      } else if (!pokemon.isMoving) {
        // ✅ POKEMON IMMOBILE - SYNCHRONISATION DOUCE
        const dx = pokemon.serverX - pokemon.x;
        const dy = pokemon.serverY - pokemon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 2) {
          const correctionSpeed = 0.05;
          const newX = pokemon.x + dx * correctionSpeed;
          const newY = pokemon.y + dy * correctionSpeed;
          
          // Vérifier que la correction ne cause pas de collision
          if (!this.scene.collisionManager || this.scene.collisionManager.canMoveTo(newX, newY)) {
            pokemon.x = newX;
            pokemon.y = newY;
          }
        }
      }
      
      // ✅ MISE À JOUR DE LA PROFONDEUR
      pokemon.setDepth(3 + (pokemon.y / 1000));
    });
  }

  /**
   * ✅ Fonction d'easing pour mouvement plus naturel
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Change le sprite d'animation d'un Pokémon
   */
  async changeAnimationSprite(pokemon, newAnimationFile) {
    try {
      const newSpriteKey = await this.loadPokemonSprite(pokemon.pokemonId, newAnimationFile);
      
      pokemon.setTexture(newSpriteKey, 0);
      
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
        
      case 'OVERWORLD_POKEMON_SPAWN_REQUEST':
        this.handlePokemonSpawnRequest(data);
        break;
      default:
        console.warn(`⚠️ [OverworldPokemonManager] Message inconnu: ${type}`);
    }
  }

  handlePokemonSpawnRequest(data) {
  const { id, boundaries } = data;
  let found = false;
  let pos = { x: 0, y: 0 };
  for (let i = 0; i < 30; i++) {
    const x = boundaries.minX + Math.random() * (boundaries.maxX - boundaries.minX);
    const y = boundaries.minY + Math.random() * (boundaries.maxY - boundaries.minY);
    if (!this.scene.collisionManager || this.scene.collisionManager.canMoveTo(x, y)) {
      pos = { x, y };
      found = true;
      break;
    }
  }
  // Répondre au serveur
this.scene.networkManager.room.send('overworldPokemonSpawnResponse', {
    ...data,
    success: found,
    x: pos.x,
    y: pos.y
  });
}

  /**
   * Synchronise tous les Pokémon overworld
   */
  async syncAllOverworldPokemon(pokemonList) {
    console.log(`🔄 [OverworldPokemonManager] Synchronisation de ${pokemonList.length} Pokémon overworld`);
    
    const activeIds = new Set(pokemonList.map(p => p.id));
    this.overworldPokemon.forEach((pokemon, id) => {
      if (!activeIds.has(id)) {
        this.removeOverworldPokemon(id);
      }
    });
    
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
   * ✅ MODIFIÉ: Debug avec informations de collision
   */
  debugOverworldPokemon() {
    console.log(`🔍 [OverworldPokemonManager] === DEBUG OVERWORLD POKEMON (COLLISION CLIENT) ===`);
    console.log(`📊 Pokémon actifs: ${this.overworldPokemon.size}`);
    console.log(`🎨 Sprites chargés: ${this.loadedSprites.size}`);
    console.log(`🛡️ Gestionnaire collision: ${this.scene.collisionManager ? 'ACTIF' : 'INACTIF'}`);
    
    this.overworldPokemon.forEach((pokemon, id) => {
      console.log(`🌍 ${id}:`, {
        name: pokemon.name,
        pokemonId: pokemon.pokemonId,
        personality: pokemon.personality,
        movePattern: pokemon.movePattern,
        position: `(${pokemon.x.toFixed(1)}, ${pokemon.y.toFixed(1)})`,
        serverPos: `(${pokemon.serverX?.toFixed(1)}, ${pokemon.serverY?.toFixed(1)})`,
        target: `(${pokemon.targetX?.toFixed(1)}, ${pokemon.targetY?.toFixed(1)})`,
        direction: pokemon.lastDirection,
        isMoving: pokemon.isMoving,
        isInterpolating: pokemon.isInterpolating,
        stuckCounter: pokemon.stuckCounter || 0,
        hasAlternativePath: pokemon.alternativePath?.length || 0,
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
   * ✅ NOUVEAU: Teste le système de collision
   */
  testCollisionSystem() {
    if (!this.scene.collisionManager) {
      console.warn(`⚠️ [OverworldPokemonManager] Aucun gestionnaire de collision disponible`);
      return;
    }
    
    console.log(`🧪 [OverworldPokemonManager] Test du système de collision`);
    
    let freePositions = 0;
    let blockedPositions = 0;
    const testCount = 100;
    
    // Test de positions aléatoires
    for (let i = 0; i < testCount; i++) {
      const x = 100 + Math.random() * 800;
      const y = 100 + Math.random() * 600;
      
      if (this.scene.collisionManager.canMoveTo(x, y)) {
        freePositions++;
      } else {
        blockedPositions++;
      }
    }
    
    console.log(`📊 Résultats test collision (${testCount} positions):`);
    console.log(`  ✅ Libres: ${freePositions} (${(freePositions/testCount*100).toFixed(1)}%)`);
    console.log(`  ❌ Bloquées: ${blockedPositions} (${(blockedPositions/testCount*100).toFixed(1)}%)`);
    
    // Test des Pokémon actuels
    let pokemonInCollision = 0;
    this.overworldPokemon.forEach((pokemon, id) => {
      if (!this.scene.collisionManager.canMoveTo(pokemon.x, pokemon.y)) {
        pokemonInCollision++;
        console.log(`🛑 ${pokemon.name} est dans une collision à (${pokemon.x.toFixed(1)}, ${pokemon.y.toFixed(1)})`);
      }
    });
    
    console.log(`🐾 Pokémon en collision: ${pokemonInCollision}/${this.overworldPokemon.size}`);
  }

  /**
   * ✅ NOUVEAU: Force le déplacement d'un Pokémon avec vérification
   */
  forcePokemonMovement(pokemonId, targetX, targetY) {
    const pokemon = this.overworldPokemon.get(pokemonId);
    if (!pokemon) {
      console.warn(`⚠️ [OverworldPokemonManager] Pokémon ${pokemonId} non trouvé`);
      return;
    }
    
    console.log(`🎯 [OverworldPokemonManager] Force mouvement ${pokemon.name} vers (${targetX}, ${targetY})`);
    
    // Vérifier la destination
    if (this.scene.collisionManager && !this.scene.collisionManager.canMoveTo(targetX, targetY)) {
      console.log(`🛡️ [OverworldPokemonManager] Destination bloquée, recherche alternative...`);
      
      // Trouver une position libre proche
      const alternative = this.findNearestFreePosition(targetX, targetY);
      if (alternative) {
        targetX = alternative.x;
        targetY = alternative.y;
        console.log(`✅ [OverworldPokemonManager] Position alternative: (${targetX}, ${targetY})`);
      } else {
        console.warn(`❌ [OverworldPokemonManager] Aucune position libre trouvée`);
        return;
      }
    }
    
    // Calculer le mouvement
    const dx = targetX - pokemon.x;
    const dy = targetY - pokemon.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(1000, distance / 60 * 1000); // 60 pixels/seconde
    
    // Mettre à jour les propriétés
    pokemon.targetX = targetX;
    pokemon.targetY = targetY;
    pokemon.moveStartTime = Date.now();
    pokemon.moveDuration = duration;
    pokemon.isMoving = true;
    pokemon.isInterpolating = true;
    pokemon.stuckCounter = 0;
    pokemon.alternativePath = null;
    
    // Mettre à jour l'animation
    const direction = this.getDirectionFromMovement(dx, dy);
    pokemon.lastDirection = direction;
    
    const animDirection = this.getDirectionForAnimation(direction);
    const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').toLowerCase();
    const walkAnimKey = `overworld_pokemon_${pokemon.pokemonId}_${animType}_${animDirection}`;
    
    if (this.scene.anims.exists(walkAnimKey)) {
      pokemon.anims.play(walkAnimKey, true);
    }
    
    console.log(`🚀 [OverworldPokemonManager] ${pokemon.name} déplacé vers (${targetX}, ${targetY}) en ${duration}ms`);
  }

  /**
   * ✅ NOUVEAU: Trouve la position libre la plus proche
   */
  findNearestFreePosition(centerX, centerY, maxRadius = 96) {
    if (!this.scene.collisionManager) return null;
    
    const step = 16;
    
    for (let radius = step; radius <= maxRadius; radius += step) {
      for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 8) {
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        if (this.scene.collisionManager.canMoveTo(x, y)) {
          return { x, y };
        }
      }
    }
    
    return null;
  }

  /**
   * ✅ NOUVEAU: Détermine la direction depuis un mouvement
   */
  getDirectionFromMovement(dx, dy) {
    const angle = Math.atan2(dy, dx);
    const normalizedAngle = ((angle * 180 / Math.PI) + 360) % 360;
    
    if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) return 'right';
    if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) return 'down-right';
    if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) return 'down';
    if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) return 'down-left';
    if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) return 'left';
    if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) return 'up-left';
    if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) return 'up';
    if (normalizedAngle >= 292.5 && normalizedAngle < 337.5) return 'up-right';
    
    return 'down';
  }

  /**
   * ✅ NOUVEAU: Résout les Pokémon bloqués
   */
  resolveStuckPokemon() {
    console.log(`🔧 [OverworldPokemonManager] Résolution des Pokémon bloqués`);
    
    let resolvedCount = 0;
    
    this.overworldPokemon.forEach((pokemon, id) => {
      if (pokemon.stuckCounter > 2) {
        console.log(`🔧 Résolution de ${pokemon.name} (bloqué ${pokemon.stuckCounter} fois)`);
        
        // Trouver une position libre
        const freePos = this.findNearestFreePosition(pokemon.x, pokemon.y);
        if (freePos) {
          pokemon.x = freePos.x;
          pokemon.y = freePos.y;
          pokemon.targetX = freePos.x;
          pokemon.targetY = freePos.y;
          pokemon.serverX = freePos.x;
          pokemon.serverY = freePos.y;
          pokemon.isInterpolating = false;
          pokemon.isMoving = false;
          pokemon.stuckCounter = 0;
          pokemon.alternativePath = null;
          
          // Animation idle
          const animDirection = this.getDirectionForAnimation(pokemon.lastDirection);
          const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').toLowerCase();
          const idleAnimKey = `overworld_pokemon_${pokemon.pokemonId}_${animType}_idle_${animDirection}`;
          
          if (this.scene.anims.exists(idleAnimKey)) {
            pokemon.anims.play(idleAnimKey, true);
          }
          
          resolvedCount++;
          console.log(`✅ ${pokemon.name} déplacé à (${freePos.x}, ${freePos.y})`);
        }
      }
    });
    
    console.log(`✅ [OverworldPokemonManager] ${resolvedCount} Pokémon résolus`);
  }

  /**
   * ✅ NOUVEAU: Active le mode debug visuel pour collision
   */
  toggleCollisionDebug(enabled = true) {
    this.collisionDebugEnabled = enabled;
    
    if (enabled) {
      console.log(`🔍 [OverworldPokemonManager] Mode debug collision ACTIVÉ`);
      
      // Créer des indicateurs visuels pour chaque Pokémon
      this.overworldPokemon.forEach(pokemon => {
        if (!pokemon.collisionDebugGraphics) {
          pokemon.collisionDebugGraphics = this.scene.add.graphics();
          pokemon.collisionDebugText = this.scene.add.text(0, 0, '', {
            fontSize: '10px',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 2, y: 2 }
          });
          pokemon.collisionDebugGraphics.setDepth(1000);
          pokemon.collisionDebugText.setDepth(1001);
        }
      });
    } else {
      console.log(`🔍 [OverworldPokemonManager] Mode debug collision DÉSACTIVÉ`);
      
      // Supprimer les indicateurs visuels
      this.overworldPokemon.forEach(pokemon => {
        if (pokemon.collisionDebugGraphics) {
          pokemon.collisionDebugGraphics.destroy();
          pokemon.collisionDebugText.destroy();
          delete pokemon.collisionDebugGraphics;
          delete pokemon.collisionDebugText;
        }
      });
    }
  }

  /**
   * ✅ NOUVEAU: Met à jour l'affichage debug collision
   */
  updateCollisionDebug() {
    if (!this.collisionDebugEnabled || !this.scene.collisionManager) return;
    
    this.overworldPokemon.forEach(pokemon => {
      if (pokemon.collisionDebugGraphics && pokemon.collisionDebugText) {
        // Effacer les anciens dessins
        pokemon.collisionDebugGraphics.clear();
        
        // Vérifier si la position actuelle est en collision
        const inCollision = !this.scene.collisionManager.canMoveTo(pokemon.x, pokemon.y);
        
        // Dessiner un cercle autour du Pokémon
        const color = inCollision ? 0xff0000 : (pokemon.isMoving ? 0x00ff00 : 0x0066ff);
        pokemon.collisionDebugGraphics.lineStyle(2, color);
        pokemon.collisionDebugGraphics.strokeCircle(pokemon.x, pokemon.y - 8, 12);
        
        // Si en mouvement, dessiner la ligne vers la cible
        if (pokemon.isMoving && pokemon.targetX !== undefined && pokemon.targetY !== undefined) {
          const targetBlocked = !this.scene.collisionManager.canMoveTo(pokemon.targetX, pokemon.targetY);
          pokemon.collisionDebugGraphics.lineStyle(1, targetBlocked ? 0xff6600 : 0x00ff00, 0.7);
          pokemon.collisionDebugGraphics.lineBetween(
            pokemon.x, pokemon.y - 8,
            pokemon.targetX, pokemon.targetY - 8
          );
          
          // Cercle sur la cible
          pokemon.collisionDebugGraphics.lineStyle(2, targetBlocked ? 0xff6600 : 0x00ff00);
          pokemon.collisionDebugGraphics.strokeCircle(pokemon.targetX, pokemon.targetY - 8, 8);
        }
        
        // Chemin alternatif
        if (pokemon.alternativePath && pokemon.alternativePath.length > 0) {
          pokemon.collisionDebugGraphics.lineStyle(2, 0xffff00, 0.8);
          let lastX = pokemon.x;
          let lastY = pokemon.y - 8;
          
          pokemon.alternativePath.forEach((point, index) => {
            pokemon.collisionDebugGraphics.lineBetween(lastX, lastY, point.x, point.y - 8);
            pokemon.collisionDebugGraphics.strokeCircle(point.x, point.y - 8, 4);
            lastX = point.x;
            lastY = point.y - 8;
          });
        }
        
        // Texte d'information
        const stuck = pokemon.stuckCounter || 0;
        const status = inCollision ? 'COLLISION' : (pokemon.isMoving ? 'BOUGE' : 'IDLE');
        
        pokemon.collisionDebugText.setText(
          `${pokemon.name}\n` +
          `${status}\n` +
          `Stuck: ${stuck}\n` +
          `Alt: ${pokemon.alternativePath?.length || 0}`
        );
        
        pokemon.collisionDebugText.setPosition(pokemon.x + 15, pokemon.y - 30);
      }
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

  getStuckPokemon() {
    return Array.from(this.overworldPokemon.values()).filter(pokemon => (pokemon.stuckCounter || 0) > 2);
  }

  getPokemonInCollision() {
    if (!this.scene.collisionManager) return [];
    
    return Array.from(this.overworldPokemon.values()).filter(pokemon => 
      !this.scene.collisionManager.canMoveTo(pokemon.x, pokemon.y)
    );
  }

  /**
   * ✅ MODIFIÉ: Changer animation avec gestion de collision
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
   * ✅ NOUVEAU: Statistiques de collision
   */
  getCollisionStats() {
    if (!this.scene.collisionManager) {
      return {
        collisionManagerActive: false,
        totalPokemon: this.overworldPokemon.size,
        pokemonInCollision: 0,
        stuckPokemon: 0,
        movingPokemon: 0,
        pokemonWithAlternativePath: 0
      };
    }
    
    let pokemonInCollision = 0;
    let stuckPokemon = 0;
    let movingPokemon = 0;
    let pokemonWithAlternativePath = 0;
    
    this.overworldPokemon.forEach(pokemon => {
      if (!this.scene.collisionManager.canMoveTo(pokemon.x, pokemon.y)) {
        pokemonInCollision++;
      }
      if ((pokemon.stuckCounter || 0) > 2) {
        stuckPokemon++;
      }
      if (pokemon.isMoving) {
        movingPokemon++;
      }
      if (pokemon.alternativePath && pokemon.alternativePath.length > 0) {
        pokemonWithAlternativePath++;
      }
    });
    
    return {
      collisionManagerActive: true,
      totalPokemon: this.overworldPokemon.size,
      pokemonInCollision,
      stuckPokemon,
      movingPokemon,
      pokemonWithAlternativePath,
      collisionPercentage: this.overworldPokemon.size > 0 ? 
        (pokemonInCollision / this.overworldPokemon.size * 100).toFixed(1) : 0,
      stuckPercentage: this.overworldPokemon.size > 0 ? 
        (stuckPokemon / this.overworldPokemon.size * 100).toFixed(1) : 0
    };
  }

  /**
   * ✅ NOUVEAU: Optimise automatiquement les collisions
   */
  optimizeCollisions() {
    console.log(`⚡ [OverworldPokemonManager] Optimisation automatique des collisions`);
    
    const stats = this.getCollisionStats();
    console.log(`📊 Stats avant optimisation:`, stats);
    
    // 1. Résoudre les Pokémon bloqués
    this.resolveStuckPokemon();
    
    // 2. Ajuster la vitesse d'interpolation pour éviter les collisions
    this.overworldPokemon.forEach(pokemon => {
      if (pokemon.stuckCounter > 1) {
        pokemon.interpolationSpeed = Math.max(0.01, pokemon.interpolationSpeed * 0.8);
        console.log(`🐌 ${pokemon.name} ralenti (interpolation: ${pokemon.interpolationSpeed.toFixed(3)})`);
      }
    });
    
    // 3. Activer le debug si beaucoup de collisions
    if (stats.collisionPercentage > 20) {
      console.log(`🚨 Beaucoup de collisions détectées (${stats.collisionPercentage}%), activation du debug`);
      this.toggleCollisionDebug(true);
    }
    
    const newStats = this.getCollisionStats();
    console.log(`📊 Stats après optimisation:`, newStats);
    console.log(`✅ Optimisation terminée`);
  }

  /**
   * ✅ MODIFIÉ: Update principal avec debug collision
   */
  updateMain(delta = 16) {
    // Update normal
    this.update(delta);
    
    // Update debug collision si activé
    if (this.collisionDebugEnabled) {
      this.updateCollisionDebug();
    }
    
    // Auto-optimisation périodique
    if (!this.lastOptimization || Date.now() - this.lastOptimization > 30000) { // Toutes les 30s
      const stats = this.getCollisionStats();
      if (stats.stuckPercentage > 15) { // Si plus de 15% de Pokémon bloqués
        this.optimizeCollisions();
      }
      this.lastOptimization = Date.now();
    }
  }
}
