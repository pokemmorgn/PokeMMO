// ================================================================================================
// CLIENT/SRC/GAME/POKEMONFOLLOWERMANAGER.JS - VERSION UNIFIÉE AVEC SPRITEUTILS
// ================================================================================================
import { SpriteUtils } from '../utils/SpriteUtils.js';

export class PokemonFollowerManager {
  constructor(scene) {
    this.scene = scene;
    this.followers = new Map(); // sessionId -> follower sprite
    this.loadedSprites = new Set(); // Cache des sprites déjà chargés
    this.loadingSprites = new Set(); // Cache des sprites en cours de chargement
    this.spriteStructures = new Map(); // Cache des structures détectées par pokemonId + animation
    
    // ✅ NOUVEAU: Système d'interpolation fluide
    this.interpolationSpeed = 0.15; // Vitesse d'interpolation (0.1 = lent, 0.3 = rapide)
    this.maxInterpolationDistance = 80; // Distance max avant téléportation
    this.smoothingEnabled = true; // Activer le lissage des mouvements
    
    // ✅ NOUVEAU: Cache des dernières positions pour éviter les doublons
    this.lastPositions = new Map(); // sessionId -> {x, y, direction, isMoving}
    
    // ✅ NOUVEAU: Système de normalisation des tailles
    this.sizeNormalizationEnabled = true; // Activer la normalisation des tailles
    this.targetFollowerHeight = 48; // Hauteur cible en pixels (ajustable)
    this.minScale = 0.5; // Échelle minimale
    this.maxScale = 2.5; // Échelle maximale
    this.sizeOverrides = new Map(); // Overrides spécifiques par Pokémon
    
    // Configuration des tailles spéciales pour certains Pokémon
    this.initializeSizeOverrides();
    
    console.log("🐾 [PokemonFollowerManager] Version unifiée avec normalisation des tailles initialisée");
  }

  /**
   * ✅ UNIFIÉ: Utilise le même système que OverworldPokemonManager
   */
  isFirstRowOnlyAnimation(animationFile) {
    return animationFile.toLowerCase().includes('swing-anim.png');
  }

  /**
   * ✅ UNIFIÉ: Détection de structure via SpriteUtils
   */
  async detectSpriteStructure(pokemonId, animationFile, width, height) {
    return await SpriteUtils.getSpriteStructure(pokemonId, animationFile, width, height);
  }

  /**
   * ✅ UNIFIÉ: Charge un sprite Pokémon avec la même logique que OverworldPokemonManager
   */
  async loadPokemonSprite(pokemonId, animationFile = 'Walk-Anim.png') {
    const spriteKey = `follower_pokemon_${pokemonId}_${animationFile.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    if (this.loadedSprites.has(spriteKey) || this.loadingSprites.has(spriteKey)) {
      return spriteKey;
    }
    
    this.loadingSprites.add(spriteKey);
    
    const paddedId = pokemonId.toString().padStart(3, '0');
    const spritePath = `/assets/pokemon/${paddedId}/${animationFile}`;
    
    console.log(`🎨 [PokemonFollowerManager] Chargement sprite ${pokemonId}: ${spritePath}`);
    
    try {
      const tempKey = `${spriteKey}_temp`;
      
      await new Promise((resolve, reject) => {
        this.scene.load.image(tempKey, spritePath);
        
        this.scene.load.once('complete', async () => {
          try {
            const texture = this.scene.textures.get(tempKey);
            if (!texture || !texture.source[0]) {
              throw new Error(`Texture ${tempKey} introuvable`);
            }
            
            const width = texture.source[0].width;
            const height = texture.source[0].height;
            const structure = await this.detectSpriteStructure(pokemonId, animationFile, width, height);
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
            console.error(`❌ [PokemonFollowerManager] Erreur texture ${tempKey}:`, error);
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
      console.error(`❌ [PokemonFollowerManager] Erreur loadPokemonSprite:`, error);
      this.loadingSprites.delete(spriteKey);
      throw error;
    }
  }

  /**
   * ✅ UNIFIÉ: Crée les animations avec la même logique que OverworldPokemonManager
   */
  createPokemonAnimations(pokemonId, spriteKey, structure, animationFile) {
    const isFirstRowOnly = this.isFirstRowOnlyAnimation(animationFile);
    
    console.log(`🎬 [PokemonFollowerManager] Création animations ${pokemonId} - Mode: ${isFirstRowOnly ? 'Swing' : 'Standard'}`);

    if (isFirstRowOnly) {
      this.createSwingAnimations(pokemonId, spriteKey, structure, animationFile);
    } else {
      this.createStandardAnimations(pokemonId, spriteKey, structure, animationFile);
    }
  }

  /**
   * ✅ UNIFIÉ: Animations Swing (même logique que OverworldPokemonManager)
   */
  createSwingAnimations(pokemonId, spriteKey, structure, animationFile) {
    const animType = animationFile.replace('-Anim.png', '').replace('.png', '').toLowerCase();
    
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
        const walkKey = `follower_pokemon_${pokemonId}_${animType}_${dir.name}`;
        const idleKey = `follower_pokemon_${pokemonId}_${animType}_idle_${dir.name}`;
        
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
            repeat: 0
          });
        }
      }
    });
    
    console.log(`✅ [PokemonFollowerManager] Animations Swing créées pour ${pokemonId}`);
  }

  /**
   * ✅ UNIFIÉ: Animations Standard (même logique que OverworldPokemonManager)
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

    const animType = animationFile.replace('-Anim.png', '').replace('.png', '').toLowerCase();

    directions.forEach(dir => {
      if (dir.row < structure.rows) {
        const walkKey = `follower_pokemon_${pokemonId}_${animType}_${dir.name}`;
        const idleKey = `follower_pokemon_${pokemonId}_${animType}_idle_${dir.name}`;
        
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
   * ✅ NOUVEAU: Initialise les overrides de taille pour des Pokémon spécifiques
   */
  initializeSizeOverrides() {
    // Pokémon très grands qui ont besoin d'être réduits
    const largePokemon = [
      482, // Azelf
      484, // Palkia  
      487, // Giratina
      493, // Arceus
      149, // Dragonite
      130, // Leviator/Gyarados
      144, // Articuno
      145, // Zapdos
      146, // Moltres
      150, // Mewtwo
      151, // Mew
      249, // Lugia
      250, // Ho-Oh
      380, // Latias
      381, // Latios
      382, // Kyogre
      383, // Groudon
      384, // Rayquaza
      385, // Jirachi
      386, // Deoxys
    ];
    
    // Pokémon très petits qui ont besoin d'être agrandis
    const smallPokemon = [
      025, // Pikachu
      172, // Pichu
      173, // Cleffa
      174, // Igglybuff
      175, // Togepi
      236, // Tyrogue
      238, // Smoochum
      239, // Elekid
      240, // Magby
      298, // Azurill
      360, // Wynaut
      433, // Chingling
      438, // Bonsly
      439, // Mime Jr.
      440, // Happiny
      446, // Munchlax
      447, // Riolu
    ];
    
    // Appliquer des échelles spécifiques
    largePokemon.forEach(id => {
      this.sizeOverrides.set(id, 0.7); // Réduire les gros Pokémon
    });
    
    smallPokemon.forEach(id => {
      this.sizeOverrides.set(id, 1.4); // Agrandir les petits Pokémon
    });
    
    // Cas spéciaux
    this.sizeOverrides.set(130, 0.6); // Leviator encore plus petit
    this.sizeOverrides.set(149, 0.8); // Dragonite un peu plus petit
    this.sizeOverrides.set(025, 1.2); // Pikachu juste un peu plus grand
    
    console.log(`📏 [PokemonFollowerManager] ${this.sizeOverrides.size} overrides de taille configurés`);
  }

  /**
   * ✅ NOUVEAU: Calcule l'échelle optimale pour un Pokémon
   */
  calculateOptimalScale(pokemonId, frameWidth, frameHeight) {
    // Vérifier s'il y a un override spécifique
    if (this.sizeOverrides.has(pokemonId)) {
      const overrideScale = this.sizeOverrides.get(pokemonId);
      console.log(`📏 [PokemonFollowerManager] Override taille Pokémon ${pokemonId}: ${overrideScale}`);
      return overrideScale;
    }
    
    // Si la normalisation est désactivée, utiliser l'échelle par défaut
    if (!this.sizeNormalizationEnabled) {
      return 1.2; // Échelle par défaut
    }
    
    // Calculer l'échelle basée sur la hauteur de la frame
    const targetScale = this.targetFollowerHeight / frameHeight;
    
    // Limiter l'échelle entre min et max
    const clampedScale = Math.max(this.minScale, Math.min(this.maxScale, targetScale));
    
    console.log(`📏 [PokemonFollowerManager] Pokémon ${pokemonId}: frame ${frameWidth}x${frameHeight} → échelle ${clampedScale.toFixed(2)}`);
    
    return clampedScale;
  }
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
   * ✅ NOUVEAU: Vérifie si les données ont changé pour éviter les updates inutiles
   */
  hasDataChanged(sessionId, newData) {
    const lastData = this.lastPositions.get(sessionId);
    if (!lastData) return true;
    
    return (
      lastData.x !== newData.x ||
      lastData.y !== newData.y ||
      lastData.direction !== newData.direction ||
      lastData.isMoving !== newData.isMoving ||
      lastData.currentAnimation !== newData.currentAnimation
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
      isMoving: data.isMoving,
      currentAnimation: data.currentAnimation || 'Walk-Anim.png'
    });
  }

  /**
   * ✅ UNIFIÉ: Crée un follower avec support des animations multiples
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
      
      // ✅ UNIFIÉ: Support des animations multiples
      const animationFile = followerData.animations && followerData.currentAnimation 
        ? followerData.animations[followerData.currentAnimation] 
        : 'Walk-Anim.png';
      
      // Charger le sprite si nécessaire
      const spriteKey = await this.loadPokemonSprite(followerData.pokemonId, animationFile);
      
      // Créer le sprite
      const follower = this.scene.physics.add.sprite(
        followerData.x || 0,
        followerData.y || 0,
        spriteKey,
        0
      );
      
      // Configuration du sprite
      follower.setOrigin(0.5, 1);
      
      // ✅ NOUVEAU: Calcul automatique de l'échelle selon la taille du Pokémon
      const structure = this.spriteStructures.get(`${followerData.pokemonId}_${animationFile}`);
      const optimalScale = structure 
        ? this.calculateOptimalScale(followerData.pokemonId, structure.frameWidth, structure.frameHeight)
        : 1.2; // Fallback
      
      follower.setScale(optimalScale);
      console.log(`📏 [PokemonFollowerManager] Pokémon ${followerData.pokemonId} échelle: ${optimalScale}`);
      
      // Profondeur initiale selon la direction
      this.setInitialFollowerDepth(follower, followerData.direction || 'down');
      
      // Propriétés custom
      follower.sessionId = sessionId;
      follower.pokemonId = followerData.pokemonId;
      follower.isShiny = followerData.isShiny || false;
      follower.nickname = followerData.nickname;
      follower.lastDirection = followerData.direction || 'down';
      follower.isMoving = false;
      
      // ✅ UNIFIÉ: Support des animations multiples
      follower.animations = followerData.animations || { walk: 'Walk-Anim.png' };
      follower.currentAnimation = followerData.currentAnimation || 'walk';
      
      // Système d'interpolation fluide
      follower.targetX = followerData.x || 0;
      follower.targetY = followerData.y || 0;
      follower.isInterpolating = false;
      follower.lastUpdateTime = Date.now();
      
      // ✅ UNIFIÉ: Animation initiale avec la nouvelle logique
      const animDirection = this.getDirectionForAnimation(followerData.direction || 'down');
      const animType = animationFile.replace('-Anim.png', '').replace('.png', '').toLowerCase();
      const initialAnimKey = `follower_pokemon_${followerData.pokemonId}_${animType}_idle_${animDirection}`;
      
      // Délai pour s'assurer que les animations sont créées
      this.scene.time.delayedCall(100, () => {
        if (follower && follower.anims && this.scene.anims.exists(initialAnimKey)) {
          try {
            follower.anims.play(initialAnimKey, true);
            console.log(`🎬 [PokemonFollowerManager] Animation initiale: ${initialAnimKey}`);
          } catch (error) {
            console.warn(`⚠️ [PokemonFollowerManager] Erreur animation ${initialAnimKey}:`, error);
            follower.setFrame(0);
          }
        } else {
          console.warn(`⚠️ [PokemonFollowerManager] Animation ${initialAnimKey} n'existe pas`);
          if (follower) {
            follower.setFrame(0);
          }
        }
      });
      
      // Initialiser le cache de position
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
   * ✅ UNIFIÉ: Met à jour un follower avec support des changements d'animation
   */
  updateFollower(sessionId, followerData) {
    const follower = this.followers.get(sessionId);
    if (!follower) {
      console.warn(`⚠️ [PokemonFollowerManager] Follower ${sessionId} non trouvé pour mise à jour`);
      return;
    }

    // Éviter les updates inutiles
    if (!this.hasDataChanged(sessionId, followerData)) {
      return;
    }

    const now = Date.now();
    
    // ✅ NOUVEAU: Changement d'animation si nécessaire
    if (followerData.currentAnimation && followerData.currentAnimation !== follower.currentAnimation) {
      console.log(`🔄 [PokemonFollowerManager] Changement d'animation: ${follower.currentAnimation} → ${followerData.currentAnimation}`);
      
      // Recharger le sprite avec la nouvelle animation
      const newAnimationFile = followerData.animations[followerData.currentAnimation];
      if (newAnimationFile) {
        this.loadPokemonSprite(followerData.pokemonId, newAnimationFile)
          .then(newSpriteKey => {
            follower.setTexture(newSpriteKey, 0);
            follower.currentAnimation = followerData.currentAnimation;
            follower.animations = followerData.animations;
            
            // Relancer l'animation appropriée
            const animDirection = this.getDirectionForAnimation(follower.lastDirection);
            const animType = newAnimationFile.replace('-Anim.png', '').replace('.png', '').toLowerCase();
            const animKey = follower.isMoving && follower.isInterpolating
              ? `follower_pokemon_${follower.pokemonId}_${animType}_${animDirection}`
              : `follower_pokemon_${follower.pokemonId}_${animType}_idle_${animDirection}`;
            
            if (this.scene.anims.exists(animKey)) {
              follower.anims.play(animKey, true);
            }
          })
          .catch(error => {
            console.error(`❌ [PokemonFollowerManager] Erreur changement animation:`, error);
          });
      }
    }
    
    // Position avec interpolation fluide
    if (followerData.x !== undefined && followerData.y !== undefined) {
      const distance = Math.sqrt(
        Math.pow(followerData.x - follower.x, 2) + 
        Math.pow(followerData.y - follower.y, 2)
      );
      
      if (distance > this.maxInterpolationDistance) {
        console.log(`🚀 [PokemonFollowerManager] Téléportation follower ${sessionId}: distance ${distance.toFixed(1)}px`);
        follower.x = followerData.x;
        follower.y = followerData.y;
        follower.targetX = followerData.x;
        follower.targetY = followerData.y;
        follower.isInterpolating = false;
      } else if (this.smoothingEnabled && distance > 1) {
        follower.targetX = followerData.x;
        follower.targetY = followerData.y;
        follower.isInterpolating = true;
      } else {
        follower.x = followerData.x;
        follower.y = followerData.y;
        follower.targetX = followerData.x;
        follower.targetY = followerData.y;
        follower.isInterpolating = false;
      }
    }
    
    // État de mouvement
    if (followerData.isMoving !== undefined) {
      const wasMoving = follower.isMoving;
      follower.isMoving = followerData.isMoving;
      
      if (wasMoving && !followerData.isMoving) {
        follower.isInterpolating = false;
        follower.targetX = follower.x;
        follower.targetY = follower.y;
      }
    }
    
    // ✅ UNIFIÉ: Gestion des animations avec la nouvelle logique
    const animDirection = this.getDirectionForAnimation(followerData.direction || follower.lastDirection);
    const currentAnimationFile = follower.animations[follower.currentAnimation] || 'Walk-Anim.png';
    const animType = currentAnimationFile.replace('-Anim.png', '').replace('.png', '').toLowerCase();
    
    const shouldBeWalking = follower.isMoving && follower.isInterpolating;
    const animKey = shouldBeWalking
      ? `follower_pokemon_${follower.pokemonId}_${animType}_${animDirection}`
      : `follower_pokemon_${follower.pokemonId}_${animType}_idle_${animDirection}`;

    const currentAnimKey = follower.anims.currentAnim ? follower.anims.currentAnim.key : null;
    if (currentAnimKey !== animKey) {
      if (this.scene.anims.exists(animKey)) {
        follower.anims.play(animKey, true);
        console.log(`🎬 [PokemonFollowerManager] Animation changée: ${animKey} (moving: ${shouldBeWalking})`);
      } else {
        console.warn(`⚠️ [PokemonFollowerManager] Animation ${animKey} n'existe pas`);
      }
    }

    // Mettre à jour la direction
    if (followerData.direction !== undefined) {
      follower.lastDirection = followerData.direction;
      this.updateFollowerDepth(follower, followerData.direction);
    }
    
    // Mettre à jour le timestamp et cache
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
        follower.setDepth(playerDepth + 0.5);
        break;
      case 'down':
        follower.setDepth(playerDepth - 0.5);
        break;
      case 'left':
      case 'right':
        follower.setDepth(playerDepth - 0.1);
        break;
      default:
        follower.setDepth(playerDepth - 0.5);
    }
    
    console.log(`🎯 [PokemonFollowerManager] Profondeur initiale: ${follower.depth} (direction: ${direction}, joueur: ${playerDepth})`);
  }

  /**
   * ✅ NOUVEAU: Met à jour la profondeur selon la direction
   */
  updateFollowerDepth(follower, direction) {
    const myPlayer = this.getMyPlayer();
    if (!myPlayer) return;
    
    const playerDepth = myPlayer.depth || 4.5;
    const oldDepth = follower.depth;
    
    switch (direction) {
      case 'up':
        follower.setDepth(playerDepth + 0.5);
        break;
      case 'down':
        follower.setDepth(playerDepth - 0.5);
        break;
      case 'left':
      case 'right':
        follower.setDepth(playerDepth - 0.1);
        break;
      default:
        follower.setDepth(playerDepth - 0.5);
    }
    
    if (Math.abs(oldDepth - follower.depth) > 0.1) {
      console.log(`🎭 [PokemonFollowerManager] Profondeur mise à jour: ${oldDepth} → ${follower.depth} (direction: ${direction})`);
    }
  }

  /**
   * ✅ NOUVEAU: Récupère le joueur local
   */
  getMyPlayer() {
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
      
      if (follower.anims && follower.anims.isPlaying) {
        follower.anims.stop();
      }
      
      if (follower.body && follower.body.destroy) {
        try { follower.body.destroy(); } catch(e) {}
      }
      
      try { follower.destroy(); } catch(e) {}
      
      this.followers.delete(sessionId);
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
        
        const distanceX = targetX - currentX;
        const distanceY = targetY - currentY;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        if (distance < 1) {
          follower.x = targetX;
          follower.y = targetY;
          follower.isInterpolating = false;
        } else {
          const factor = Math.min(this.interpolationSpeed, distance / 60);
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
    this.lastPositions.clear();
  }

  /**
   * ✅ NOUVEAU: Configure la normalisation des tailles
   */
  setSizeNormalization(enabled, targetHeight = 48, minScale = 0.5, maxScale = 2.5) {
    this.sizeNormalizationEnabled = enabled;
    this.targetFollowerHeight = targetHeight;
    this.minScale = minScale;
    this.maxScale = maxScale;
    
    console.log(`📏 [PokemonFollowerManager] Normalisation: ${enabled}, hauteur cible: ${targetHeight}px, échelle: ${minScale}-${maxScale}`);
  }

  /**
   * ✅ NOUVEAU: Ajoute un override de taille pour un Pokémon spécifique
   */
  addSizeOverride(pokemonId, scale) {
    this.sizeOverrides.set(pokemonId, scale);
    console.log(`📏 [PokemonFollowerManager] Override ajouté: Pokémon ${pokemonId} → échelle ${scale}`);
    
    // Mettre à jour les followers existants avec ce Pokémon
    this.followers.forEach(follower => {
      if (follower.pokemonId === pokemonId) {
        follower.setScale(scale);
        console.log(`🔄 [PokemonFollowerManager] Échelle mise à jour pour follower ${follower.sessionId}`);
      }
    });
  }

  /**
   * ✅ NOUVEAU: Supprime un override de taille
   */
  removeSizeOverride(pokemonId) {
    if (this.sizeOverrides.delete(pokemonId)) {
      console.log(`📏 [PokemonFollowerManager] Override supprimé pour Pokémon ${pokemonId}`);
      
      // Recalculer l'échelle pour les followers existants
      this.followers.forEach(follower => {
        if (follower.pokemonId === pokemonId) {
          const structure = this.spriteStructures.get(`${pokemonId}_${follower.animations[follower.currentAnimation] || 'Walk-Anim.png'}`);
          if (structure) {
            const newScale = this.calculateOptimalScale(pokemonId, structure.frameWidth, structure.frameHeight);
            follower.setScale(newScale);
            console.log(`🔄 [PokemonFollowerManager] Échelle recalculée: ${newScale} pour follower ${follower.sessionId}`);
          }
        }
      });
    }
  }

  /**
   * ✅ NOUVEAU: Met à jour l'échelle de tous les followers selon les nouveaux paramètres
   */
  updateAllFollowerScales() {
    this.followers.forEach((follower, sessionId) => {
      const animationFile = follower.animations[follower.currentAnimation] || 'Walk-Anim.png';
      const structure = this.spriteStructures.get(`${follower.pokemonId}_${animationFile}`);
      
      if (structure) {
        const newScale = this.calculateOptimalScale(follower.pokemonId, structure.frameWidth, structure.frameHeight);
        follower.setScale(newScale);
        console.log(`🔄 [PokemonFollowerManager] Échelle mise à jour: ${newScale} pour ${follower.nickname || `Pokémon #${follower.pokemonId}`}`);
      }
    });
    
    console.log(`✅ [PokemonFollowerManager] Toutes les échelles mises à jour`);
  }

  /**
   * ✅ NOUVEAU: Obtient les informations de taille d'un Pokémon
   */
  getPokemonSizeInfo(pokemonId, animationFile = 'Walk-Anim.png') {
    const structure = this.spriteStructures.get(`${pokemonId}_${animationFile}`);
    const hasOverride = this.sizeOverrides.has(pokemonId);
    const overrideScale = hasOverride ? this.sizeOverrides.get(pokemonId) : null;
    
    if (!structure) {
      return {
        pokemonId,
        animationFile,
        available: false,
        message: 'Structure non trouvée'
      };
    }
    
    const calculatedScale = this.calculateOptimalScale(pokemonId, structure.frameWidth, structure.frameHeight);
    
    return {
      pokemonId,
      animationFile,
      available: true,
      frameSize: {
        width: structure.frameWidth,
        height: structure.frameHeight
      },
      hasOverride,
      overrideScale,
      calculatedScale,
      finalScale: hasOverride ? overrideScale : calculatedScale,
      sizeCategory: this.categorizePokemonSize(structure.frameHeight)
    };
  }

  /**
   * ✅ NOUVEAU: Catégorise un Pokémon selon sa taille
   */
  categorizePokemonSize(frameHeight) {
    if (frameHeight <= 32) return 'Très petit';
    if (frameHeight <= 48) return 'Petit';
    if (frameHeight <= 64) return 'Normal';
    if (frameHeight <= 80) return 'Grand';
    return 'Très grand';
  }
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
   * Debug - affiche l'état des followers avec informations de taille
   */
  debugFollowers() {
    console.log(`🔍 [PokemonFollowerManager] === DEBUG FOLLOWERS UNIFIÉ AVEC TAILLES ===`);
    console.log(`📊 Followers actifs: ${this.followers.size}`);
    console.log(`🎨 Sprites chargés: ${this.loadedSprites.size}`);
    console.log(`⏳ Sprites en chargement: ${this.loadingSprites.size}`);
    console.log(`📐 Structures détectées: ${this.spriteStructures.size}`);
    console.log(`💾 Positions en cache: ${this.lastPositions.size}`);
    console.log(`🎛️ Lissage: ${this.smoothingEnabled}, Vitesse: ${this.interpolationSpeed}, Distance max: ${this.maxInterpolationDistance}`);
    console.log(`📏 Normalisation taille: ${this.sizeNormalizationEnabled}, Hauteur cible: ${this.targetFollowerHeight}px`);
    console.log(`🎬 Support animations: Walk-Anim, Swing-Anim via SpriteUtils`);
    console.log(`🔧 Overrides de taille: ${this.sizeOverrides.size}`);
    
    // Afficher les overrides
    if (this.sizeOverrides.size > 0) {
      console.log(`📋 Overrides configurés:`);
      this.sizeOverrides.forEach((scale, pokemonId) => {
        console.log(`  - Pokémon ${pokemonId}: échelle ${scale}`);
      });
    }
    
    this.followers.forEach((follower, sessionId) => {
      const sizeInfo = this.getPokemonSizeInfo(follower.pokemonId, follower.animations[follower.currentAnimation] || 'Walk-Anim.png');
      
      console.log(`🐾 ${sessionId}:`, {
        pokemonId: follower.pokemonId,
        nickname: follower.nickname,
        position: `(${follower.x.toFixed(1)}, ${follower.y.toFixed(1)})`,
        target: `(${follower.targetX?.toFixed(1)}, ${follower.targetY?.toFixed(1)})`,
        direction: follower.lastDirection,
        isMoving: follower.isMoving,
        isInterpolating: follower.isInterpolating,
        currentAnimation: follower.currentAnimation,
        scale: follower.scaleX,
        sizeInfo: {
          frameSize: sizeInfo.frameSize,
          category: sizeInfo.sizeCategory,
          hasOverride: sizeInfo.hasOverride,
          finalScale: sizeInfo.finalScale
        },
        lastUpdate: follower.lastUpdateTime ? `${Date.now() - follower.lastUpdateTime}ms ago` : 'N/A',
        visible: follower.visible
      });
    });
  }

  /**
   * ✅ NOUVEAU: Debug spécifique aux tailles
   */
  debugSizes() {
    console.log(`📏 [PokemonFollowerManager] === DEBUG TAILLES ===`);
    console.log(`Normalisation: ${this.sizeNormalizationEnabled}`);
    console.log(`Hauteur cible: ${this.targetFollowerHeight}px`);
    console.log(`Échelle min/max: ${this.minScale} - ${this.maxScale}`);
    console.log(`Overrides configurés: ${this.sizeOverrides.size}`);
    
    // Analyser les tailles des Pokémon chargés
    const sizeAnalysis = new Map();
    this.spriteStructures.forEach((structure, key) => {
      const [pokemonId, animationFile] = key.split('_');
      const category = this.categorizePokemonSize(structure.frameHeight);
      
      if (!sizeAnalysis.has(category)) {
        sizeAnalysis.set(category, []);
      }
      
      sizeAnalysis.get(category).push({
        pokemonId: parseInt(pokemonId),
        animationFile,
        frameSize: `${structure.frameWidth}x${structure.frameHeight}`,
        hasOverride: this.sizeOverrides.has(parseInt(pokemonId))
      });
    });
    
    console.log(`📊 Répartition par taille:`);
    sizeAnalysis.forEach((pokemon, category) => {
      console.log(`  ${category}: ${pokemon.length} Pokémon`);
      pokemon.forEach(p => {
        const override = p.hasOverride ? ` (override: ${this.sizeOverrides.get(p.pokemonId)})` : '';
        console.log(`    - #${p.pokemonId} (${p.frameSize})${override}`);
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

  getSpriteStructure(pokemonId, animationFile = 'Walk-Anim.png') {
    return this.spriteStructures.get(`${pokemonId}_${animationFile}`);
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

  /**
   * ✅ UNIFIÉ: Force l'animation idle quand le follower s'arrête
   */
  forceIdleAnimation(follower) {
    const animDirection = this.getDirectionForAnimation(follower.lastDirection);
    const currentAnimationFile = follower.animations[follower.currentAnimation] || 'Walk-Anim.png';
    const animType = currentAnimationFile.replace('-Anim.png', '').replace('.png', '').toLowerCase();
    const idleAnimKey = `follower_pokemon_${follower.pokemonId}_${animType}_idle_${animDirection}`;
    
    if (this.scene.anims.exists(idleAnimKey)) {
      const currentAnimKey = follower.anims.currentAnim ? follower.anims.currentAnim.key : null;
      if (currentAnimKey !== idleAnimKey) {
        follower.anims.play(idleAnimKey, true);
        console.log(`🛑 [PokemonFollowerManager] Animation idle forcée: ${idleAnimKey}`);
      }
    }
  }

  /**
   * ✅ UNIFIÉ: Change l'animation d'un follower en temps réel
   */
  async changeFollowerAnimation(sessionId, newAnimationType) {
    const follower = this.followers.get(sessionId);
    if (!follower || !follower.animations[newAnimationType]) {
      console.warn(`⚠️ [PokemonFollowerManager] Impossible de changer l'animation: follower ou animation introuvable`);
      return false;
    }

    const newAnimationFile = follower.animations[newAnimationType];
    console.log(`🔄 [PokemonFollowerManager] Changement d'animation: ${follower.currentAnimation} → ${newAnimationType}`);

    try {
      // Charger le nouveau sprite
      const newSpriteKey = await this.loadPokemonSprite(follower.pokemonId, newAnimationFile);
      
      // Changer la texture
      follower.setTexture(newSpriteKey, 0);
      follower.currentAnimation = newAnimationType;
      
      // Relancer l'animation appropriée
      const animDirection = this.getDirectionForAnimation(follower.lastDirection);
      const animType = newAnimationFile.replace('-Anim.png', '').replace('.png', '').toLowerCase();
      const animKey = follower.isMoving && follower.isInterpolating
        ? `follower_pokemon_${follower.pokemonId}_${animType}_${animDirection}`
        : `follower_pokemon_${follower.pokemonId}_${animType}_idle_${animDirection}`;
      
      if (this.scene.anims.exists(animKey)) {
        follower.anims.play(animKey, true);
        console.log(`✅ [PokemonFollowerManager] Animation changée vers: ${animKey}`);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ [PokemonFollowerManager] Erreur changement animation:`, error);
      return false;
    }
  }

  /**
   * ✅ UNIFIÉ: Vérifie si une animation est disponible pour un Pokémon
   */
  isAnimationAvailable(pokemonId, animationType, animationFile) {
    const spriteKey = `follower_pokemon_${pokemonId}_${animationFile.replace(/[^a-zA-Z0-9]/g, '_')}`;
    return this.loadedSprites.has(spriteKey);
  }

  /**
   * ✅ UNIFIÉ: Pré-charge plusieurs animations pour un Pokémon
   */
  async preloadPokemonAnimations(pokemonId, animationFiles) {
    const promises = animationFiles.map(file => 
      this.loadPokemonSprite(pokemonId, file).catch(error => {
        console.warn(`⚠️ [PokemonFollowerManager] Impossible de pré-charger ${file}:`, error);
        return null;
      })
    );

    const results = await Promise.allSettled(promises);
    const loadedCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    
    console.log(`📦 [PokemonFollowerManager] Pré-chargement: ${loadedCount}/${animationFiles.length} animations chargées pour Pokémon ${pokemonId}`);
    return loadedCount;
  }

  /**
   * ✅ UNIFIÉ: Synchronise un follower avec des données complètes
   */
  async syncFollower(sessionId, fullFollowerData) {
    const follower = this.followers.get(sessionId);
    
    if (!follower) {
      // Créer le follower s'il n'existe pas
      return await this.createFollower(sessionId, fullFollowerData);
    } else {
      // Mettre à jour le follower existant
      this.updateFollower(sessionId, fullFollowerData);
      return follower;
    }
  }

  /**
   * ✅ UNIFIÉ: Synchronise tous les followers
   */
  async syncAllFollowers(followersData) {
    console.log(`🔄 [PokemonFollowerManager] Synchronisation de ${Object.keys(followersData).length} followers`);
    
    // Supprimer les followers qui ne sont plus présents
    const activeSessionIds = new Set(Object.keys(followersData));
    this.followers.forEach((follower, sessionId) => {
      if (!activeSessionIds.has(sessionId)) {
        this.removeFollower(sessionId);
      }
    });
    
    // Synchroniser ou créer les followers
    const promises = Object.entries(followersData).map(([sessionId, data]) => 
      this.syncFollower(sessionId, data)
    );
    
    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`✅ [PokemonFollowerManager] Synchronisation terminée: ${successCount}/${promises.length} followers synchronisés`);
  }

  /**
   * ✅ UNIFIÉ: Téléporte un follower à une position
   */
  teleportFollower(sessionId, x, y) {
    const follower = this.followers.get(sessionId);
    if (follower) {
      console.log(`🚀 [PokemonFollowerManager] Téléportation follower ${sessionId} vers (${x}, ${y})`);
      
      follower.x = x;
      follower.y = y;
      follower.targetX = x;
      follower.targetY = y;
      follower.isInterpolating = false;
      
      // Mettre à jour le cache
      const cachedData = this.lastPositions.get(sessionId);
      if (cachedData) {
        cachedData.x = x;
        cachedData.y = y;
      }
      
      return true;
    }
    return false;
  }

  /**
   * ✅ UNIFIÉ: Active/désactive la visibilité d'un follower
   */
  setFollowerVisibility(sessionId, visible) {
    const follower = this.followers.get(sessionId);
    if (follower) {
      follower.setVisible(visible);
      console.log(`👁️ [PokemonFollowerManager] Visibilité follower ${sessionId}: ${visible}`);
      return true;
    }
    return false;
  }

  /**
   * ✅ UNIFIÉ: Change l'échelle d'un follower
   */
  setFollowerScale(sessionId, scale) {
    const follower = this.followers.get(sessionId);
    if (follower) {
      follower.setScale(scale);
      console.log(`📏 [PokemonFollowerManager] Échelle follower ${sessionId}: ${scale}`);
      return true;
    }
    return false;
  }

  /**
   * ✅ NOUVEAU: Obtient les informations détaillées d'un follower
   */
  getFollowerInfo(sessionId) {
    const follower = this.followers.get(sessionId);
    if (!follower) return null;

    const cachedData = this.lastPositions.get(sessionId);
    
    return {
      sessionId: follower.sessionId,
      pokemonId: follower.pokemonId,
      nickname: follower.nickname,
      isShiny: follower.isShiny,
      position: { x: follower.x, y: follower.y },
      target: { x: follower.targetX, y: follower.targetY },
      direction: follower.lastDirection,
      isMoving: follower.isMoving,
      isInterpolating: follower.isInterpolating,
      animations: follower.animations,
      currentAnimation: follower.currentAnimation,
      visible: follower.visible,
      scale: follower.scaleX,
      depth: follower.depth,
      lastUpdate: follower.lastUpdateTime,
      cachedData: cachedData
    };
  }

  /**
   * ✅ NOUVEAU: Exporte l'état de tous les followers
   */
  exportFollowersState() {
    const state = {};
    
    this.followers.forEach((follower, sessionId) => {
      state[sessionId] = this.getFollowerInfo(sessionId);
    });
    
    return {
      followers: state,
      stats: this.getPerformanceStats(),
      config: {
        smoothingEnabled: this.smoothingEnabled,
        interpolationSpeed: this.interpolationSpeed,
        maxInterpolationDistance: this.maxInterpolationDistance
      }
    };
  }

  /**
   * ✅ UNIFIÉ: Arrête tous les mouvements en cours
   */
  stopAllMovements() {
    this.followers.forEach((follower, sessionId) => {
      if (follower.isInterpolating) {
        follower.x = follower.targetX;
        follower.y = follower.targetY;
        follower.isInterpolating = false;
        this.forceIdleAnimation(follower);
      }
    });
    
    console.log(`⏹️ [PokemonFollowerManager] Tous les mouvements arrêtés`);
  }

  /**
   * ✅ UNIFIÉ: Redémarre les animations pour tous les followers
   */
  restartAllAnimations() {
    this.followers.forEach((follower, sessionId) => {
      const animDirection = this.getDirectionForAnimation(follower.lastDirection);
      const currentAnimationFile = follower.animations[follower.currentAnimation] || 'Walk-Anim.png';
      const animType = currentAnimationFile.replace('-Anim.png', '').replace('.png', '').toLowerCase();
      
      const animKey = follower.isMoving && follower.isInterpolating
        ? `follower_pokemon_${follower.pokemonId}_${animType}_${animDirection}`
        : `follower_pokemon_${follower.pokemonId}_${animType}_idle_${animDirection}`;
      
      if (this.scene.anims.exists(animKey)) {
        follower.anims.play(animKey, true);
      }
    });
    
    console.log(`🔄 [PokemonFollowerManager] Toutes les animations redémarrées`);
  }
}
