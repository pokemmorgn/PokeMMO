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
  /**
 * 🎨 SYSTÈME DE DÉTECTION AUTOMATIQUE DES SPRITES POKÉMON
 * ✅ Toutes les combinaisons possibles calculées automatiquement
 * 🔧 Support Walk (8 lignes, 2-10 colonnes) + Swing (1 ligne, 6-9 colonnes)
 */

/**
 * 🤖 DÉTECTION AUTOMATIQUE SPRITES - SANS MAPPING MANUEL
 * ✅ Analyse intelligente des dimensions pour trouver la bonne structure
 */

/**
 * ✅ REMPLACEZ detectSpriteStructure() par cette version ULTRA-INTELLIGENTE
 */
detectSpriteStructure(width, height) {
  console.log(`🔍 [OverworldPokemonManager] Détection AUTO pour ${width}x${height}`);
  
  // ✅ ÉTAPE 1: TROUVER TOUTES LES DIVISIONS EXACTES POSSIBLES
  const exactDivisions = [];
  
  // Tester toutes les combinaisons possibles de 1 à 20 cols/rows
  for (let cols = 1; cols <= 20; cols++) {
    for (let rows = 1; rows <= 20; rows++) {
      const frameW = width / cols;
      const frameH = height / rows;
      
      // Division exacte = pixels entiers
      if (frameW % 1 === 0 && frameH % 1 === 0) {
        exactDivisions.push({
          cols: cols,
          rows: rows,
          frameWidth: frameW,
          frameHeight: frameH,
          totalFrames: cols * rows
        });
      }
    }
  }
  
  console.log(`📊 [OverworldPokemonManager] ${exactDivisions.length} divisions exactes trouvées`);
  
  if (exactDivisions.length === 0) {
    return this.createFallbackStructure(width, height);
  }
  
  // ✅ ÉTAPE 2: SCORING INTELLIGENT BASÉ SUR LES PATTERNS POKÉMON
  const scoredOptions = exactDivisions.map(option => {
    let score = 0;
    const { cols, rows, frameWidth, frameHeight } = option;
    
    // 🎯 CRITÈRE 1: FORMATS WALK ANIMATION (8 lignes)
    if (rows === 8) {
      score += 50; // Bonus énorme pour 8 lignes
      
      // Bonus supplémentaire pour colonnes courantes
      if (cols === 5) score += 30; // 160÷5=32px (Roucool!)
      if (cols === 6) score += 25; // Format très courant
      if (cols === 4) score += 20; // Format compact
      if (cols === 8) score += 15; // Format carré
      if (cols === 9) score += 10; // Format étendu
    }
    
    // 🎯 CRITÈRE 2: FORMATS SWING ANIMATION (1 ligne)
    if (rows === 1) {
      score += 40; // Bonus fort pour swing
      
      if (cols === 8) score += 25; // 8 directions standard
      if (cols === 9) score += 30; // 8 directions + animation
      if (cols === 6) score += 15; // 6 directions
    }
    
    // 🎯 CRITÈRE 3: TAILLE DE FRAME OPTIMALE (16-64px typique Pokémon)
    if (frameWidth >= 16 && frameWidth <= 64 && frameHeight >= 16 && frameHeight <= 64) {
      score += 30;
      
      // Bonus pour tailles "rondes" (multiples de 8)
      if (frameWidth % 8 === 0) score += 10;
      if (frameHeight % 8 === 0) score += 10;
      
      // Bonus pour 32x32 (très courant)
      if (frameWidth === 32 && frameHeight === 32) score += 20;
    }
    
    // 🎯 CRITÈRE 4: RATIO D'ASPECT RAISONNABLE
    const aspectRatio = frameWidth / frameHeight;
    if (aspectRatio >= 0.5 && aspectRatio <= 2.0) {
      score += 20;
      
      // Bonus pour ratio proche de 1:1 (carré)
      if (aspectRatio >= 0.8 && aspectRatio <= 1.2) score += 15;
    }
    
    // 🎯 CRITÈRE 5: NOMBRE DE FRAMES LOGIQUE
    const totalFrames = cols * rows;
    if (totalFrames >= 8 && totalFrames <= 80) {
      score += 15;
      
      // Bonus pour nombres "magiques" d'animation
      if (totalFrames === 40 || totalFrames === 48 || totalFrames === 64) score += 10; // 5x8, 6x8, 8x8
      if (totalFrames === 32) score += 10; // 4x8
      if (totalFrames === 8 || totalFrames === 9) score += 15; // Swing
    }
    
    // 🎯 CRITÈRE 6: ÉVITER LES FORMATS BIZARRES
    if (cols > 15 || rows > 12) score -= 20; // Trop de frames
    if (frameWidth < 8 || frameHeight < 8) score -= 30; // Trop petit
    if (frameWidth > 128 || frameHeight > 128) score -= 20; // Trop grand
    if (cols === 1 || rows === 1) {
      if (!(rows === 1 && cols >= 6)) score -= 15; // Sauf si c'est du swing
    }
    
    return {
      ...option,
      score: score,
      aspectRatio: (frameWidth / frameHeight).toFixed(2),
      name: this.generateStructureName(cols, rows, frameWidth, frameHeight, score)
    };
  });
  
  // ✅ ÉTAPE 3: TRIER PAR SCORE ET SÉLECTIONNER LE MEILLEUR
  scoredOptions.sort((a, b) => b.score - a.score);
  
  const best = scoredOptions[0];
  
  console.log(`✅ [OverworldPokemonManager] Meilleure structure: ${best.name}`);
  console.log(`📐 Détails: ${best.cols}x${best.rows} = ${best.frameWidth}x${best.frameHeight}px (score: ${best.score})`);
  
  // Debug des alternatives
  if (scoredOptions.length > 1) {
    console.log(`🔍 Top 3 alternatives:`);
    scoredOptions.slice(1, 4).forEach((alt, i) => {
      console.log(`  ${i+2}. ${alt.name} (score: ${alt.score})`);
    });
  }
  
  return best;
}

/**
 * ✅ MÉTHODE HELPER: Générer nom intelligent de structure
 */
generateStructureName(cols, rows, frameWidth, frameHeight, score) {
  let name = `${cols}x${rows}`;
  let type = 'unknown';
  
  // Déterminer le type
  if (rows === 8) {
    type = 'walk';
    if (cols === 5) type = 'walk-roucool';
    else if (cols === 6) type = 'walk-standard';
    else if (cols === 4) type = 'walk-compact';
    else if (cols === 8) type = 'walk-large';
  } else if (rows === 1) {
    type = 'swing';
    if (cols === 8) type = 'swing-8dir';
    else if (cols === 9) type = 'swing-9dir';
  } else if (rows === 4) {
    type = 'compact';
  }
  
  return `${name} (${type}) [${frameWidth}x${frameHeight}px]`;
}

/**
 * ✅ MÉTHODE HELPER: Structure de fallback intelligente
 */
createFallbackStructure(width, height) {
  console.warn(`⚠️ [OverworldPokemonManager] Aucune division exacte pour ${width}x${height} - fallback intelligent`);
  
  // Essayer de deviner la meilleure structure approximative
  let bestCols = 6; // Default raisonnable
  let bestRows = 8; // Default walk
  
  // Si plus large que haut = probablement swing
  if (width > height * 2) {
    bestRows = 1;
    bestCols = Math.round(width / 32); // Frames de 32px
  } else {
    // Sinon = probablement walk
    bestRows = 8;
    bestCols = Math.round(width / 32);
  }
  
  // Sécurité
  bestCols = Math.max(1, Math.min(12, bestCols));
  bestRows = Math.max(1, Math.min(12, bestRows));
  
  return {
    cols: bestCols,
    rows: bestRows,
    frameWidth: Math.round(width / bestCols),
    frameHeight: Math.round(height / bestRows),
    name: `${bestCols}x${bestRows} (fallback-intelligent)`,
    score: -10,
    totalFrames: bestCols * bestRows
  };
}

/**
 * 🧪 MÉTHODE DE TEST: Tester le Roucool spécifiquement
 */
testRoucoolDetection() {
  console.log("🧪 === TEST DÉTECTION ROUCOOL 160x256 ===");
  
  const result = this.detectSpriteStructure(160, 256);
  
  console.log("📊 Résultat:", {
    structure: result.name,
    cols: result.cols,
    rows: result.rows,
    frameSize: `${result.frameWidth}x${result.frameHeight}`,
    score: result.score,
    shouldBe: "5x8 (walk-roucool) [32x32px]"
  });
  
  // Vérifier si c'est correct
  const isCorrect = result.cols === 5 && result.rows === 8 && result.frameWidth === 32 && result.frameHeight === 32;
  console.log(isCorrect ? "✅ DETECTION CORRECTE!" : "❌ Détection incorrecte");
  
  return result;
}

// ✅ UTILISATION:
// 1. Remplacez detectSpriteStructure() par le code ci-dessus
// 2. Testez: overworldPokemonManager.testRoucoolDetection()
// 3. Le système devrait automatiquement détecter 5x8 pour Roucool !
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
    // ✅ AJOUTEZ CETTE LIGNE CRITIQUE :
  // Si le serveur dit "ne bouge pas", forcer l'arrêt immédiat
  if (isMoving === false) {
    pokemon.isMoving = false;
    pokemon.x = pokemon.serverX; // ← FORCER POSITION SERVEUR
    pokemon.y = pokemon.serverY; // ← FORCER POSITION SERVEUR
    pokemon.setPosition(pokemon.serverX, pokemon.serverY); // ← PHYSICS
  }
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
        // ✅ AVANT D'ARRIVER, VÉRIFIER SI LA DESTINATION EST VALIDE
        const canReachTarget = this.canMoveToGrid(pokemon.targetX, pokemon.targetY);
        
        if (canReachTarget) {
          // Mouvement terminé normalement
          pokemon.x = pokemon.targetX;
          pokemon.y = pokemon.targetY;
          pokemon.setPosition(pokemon.targetX, pokemon.targetY);
          console.log(`🎯 [OverworldPokemonManager] ${pokemon.name} arrivé à (${pokemon.targetX}, ${pokemon.targetY})`);
        } else {
          // ✅ DESTINATION DEVENUE INVALIDE - ARRÊTER AVANT
          console.log(`🛡️ [OverworldPokemonManager] ${pokemon.name} bloqué avant destination (${pokemon.targetX}, ${pokemon.targetY})`);
          // Rester à la position actuelle
          pokemon.targetX = pokemon.x;
          pokemon.targetY = pokemon.y;
        }
        
        pokemon.isMoving = false;
      } else {
  // ✅ Interpolation en cours - VÉRIFIER LA TRAJECTOIRE
  const easeProgress = this.easeInOutQuad(progress);
  
  const startX = pokemon.serverX;
  const startY = pokemon.serverY;
  
  const newX = startX + (pokemon.targetX - startX) * easeProgress;
  const newY = startY + (pokemon.targetY - startY) * easeProgress;
  
  // ✅ VÉRIFIER SI LA POSITION INTERMÉDIAIRE EST VALIDE
  if (this.canMoveToGrid(newX, newY)) {
    pokemon.setPosition(newX, newY);
  } else {
    // ✅ COLLISION - ARRÊT TOTAL SANS BOUGER
    console.log(`🛡️ [OverworldPokemonManager] ${pokemon.name} collision - arrêt total`);
    pokemon.isMoving = false;
    pokemon.targetX = pokemon.x; // ← GARDER POSITION ACTUELLE
    pokemon.targetY = pokemon.y; // ← GARDER POSITION ACTUELLE
    // NE PAS CHANGER LA POSITION DU TOUT
  }
}
    }
    
    // ✅ Mise à jour de la profondeur
    pokemon.setDepth(4.5 + (pokemon.y / 1000));
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
  
  // ✅ VÉRIFICATION STRICTE - REFUSER SI DESTINATION INVALIDE
  const canMove = this.canMoveToGrid(toX, toY) && !this.isPokemonAt(toX, toY);
  
  // ✅ VÉRIFICATION SUPPLÉMENTAIRE - TRAJECTORY CLEAR
  const trajectoryOK = this.isTrajectoryValid(fromX, fromY, toX, toY);
  const finalCanMove = canMove && trajectoryOK;
  
  if (this.scene.networkManager?.room) {
    this.scene.networkManager.room.send('overworldPokemonMoveResponse', {
      id,
      success: finalCanMove, // ← Plus strict
      toX,
      toY,
      direction
    });
  }
  
  console.log(`🚀 [OverworldPokemonManager] Move request ${id}: ${finalCanMove ? 'OK' : 'BLOQUÉ'} (${fromX},${fromY}) → (${toX},${toY})`);
}

// ✅ NOUVELLE MÉTHODE - Vérifier que la trajectoire est libre
isTrajectoryValid(fromX, fromY, toX, toY) {
  // Vérifier quelques points intermédiaires
  const steps = 3;
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const checkX = fromX + (toX - fromX) * progress;
    const checkY = fromY + (toY - fromY) * progress;
    
    if (!this.canMoveToGrid(checkX, checkY)) {
      console.log(`🛡️ [OverworldPokemonManager] Trajectoire bloquée à (${checkX.toFixed(1)}, ${checkY.toFixed(1)})`);
      return false;
    }
  }
  return true;
}
  /**
   * ✅ Vérification si on peut spawn à une position
   */
  canSpawnAt(x, y) {
    console.log(`🔍 [OverworldPokemonManager] Test spawn à (${x}, ${y})`);
    
    // Vérifier collision avec les murs
    if (!this.canMoveToGrid(x, y)) {
      console.log(`🛡️ [OverworldPokemonManager] Position bloquée par mur`);
      return false;
    }
    
    // Vérifier collision avec autres Pokémon
    if (this.isPokemonAt(x, y)) {
      console.log(`🐾 [OverworldPokemonManager] Position occupée par autre Pokémon`);
      return false;
    }
    
    // Vérifier collision avec le joueur
    const player = this.scene.playerManager?.getMyPlayer();
    if (player) {
      const distance = Math.abs(player.x - x) + Math.abs(player.y - y);
      if (distance < this.gridSize) {
        console.log(`👤 [OverworldPokemonManager] Position trop proche du joueur`);
        return false;
      }
    }
    
    console.log(`✅ [OverworldPokemonManager] Position libre`);
    return true;
  }

  /**
   * ✅ Vérification si on peut se déplacer vers une position
   */
canMoveTo(x, y) {
  return this.canMoveToGrid(x, y);
}

  canMoveToGrid(x, y) {
  console.log(`🔍 [OverworldPokemonManager] canMoveToGrid(${x}, ${y}) - vérification collision`);
  
  if (!this.scene.map) {
    console.warn(`⚠️ [OverworldPokemonManager] Pas de carte chargée`);
    return false;
  }
  
  const mapWidth = this.scene.map.widthInPixels;
  const mapHeight = this.scene.map.heightInPixels;
  
  if (x < 0 || x > mapWidth || y < 0 || y > mapHeight) {
    console.log(`🚫 [OverworldPokemonManager] Position hors carte: (${x}, ${y})`);
    return false;
  }
  
  if (this.scene.collisionLayers && this.scene.collisionLayers.length > 0) {
    const tileX = Math.floor(x / 16);
    const tileY = Math.floor(y / 16);
    
    for (const layer of this.scene.collisionLayers) {
      const tile = layer.getTileAt(tileX, tileY);
      if (tile && tile.collides) {
        console.log(`🛡️ [OverworldPokemonManager] Collision tile détectée: (${tileX}, ${tileY})`);
        return false;
      }
    }
  }
  
  console.log(`✅ [OverworldPokemonManager] Mouvement autorisé vers (${x}, ${y})`);
  return true;
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
