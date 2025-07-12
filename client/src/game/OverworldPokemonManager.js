// ================================================================================================
// CLIENT/SRC/GAME/OVERWORLDPOKEMONMANAGER.JS - VERSION PHYSICS VELOCITY
// ================================================================================================
import { SpriteUtils } from '../utils/SpriteUtils.js';

export class OverworldPokemonManager {
  constructor(scene) {
    this.scene = scene;
    this.overworldPokemon = new Map(); // pokemonId -> sprite
    this.loadedSprites = new Set(); // Cache des sprites chargés
    this.loadingSprites = new Set(); // Cache des sprites en cours de chargement
    this.spriteStructures = new Map(); // Cache des structures détectées
    this.gridSize = 32; // Taille d'une case (2 tiles de 16px)
    
    console.log("🌍 [OverworldPokemonManager] Initialisé - Système physics velocity");
  }

  /**
   * ✅ Détermine si une animation utilise la première rangée seulement (Swing-Anim)
   */
  isFirstRowOnlyAnimation(animationFile) {
    return animationFile.toLowerCase().includes('swing-anim.png');
  }

  /**
   * ✅ Détection structure avec SpriteUtils
   */
  async detectSpriteStructure(pokemonId, animationFile, width, height) {
    return await SpriteUtils.getSpriteStructure(pokemonId, animationFile, width, height);
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
   * ✅ Crée ou met à jour un Pokémon overworld avec PHYSICS comme le joueur
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
      
      // ✅ CRÉATION AVEC PHYSICS comme le joueur
      const pokemon = this.scene.physics.add.sprite(x, y, spriteKey, 0);
      
      // ✅ Configuration physics identique au joueur
      pokemon.setOrigin(0.5, 1);
      pokemon.setScale(1.0);
      pokemon.setDepth(3);
      
      // ✅ PHYSICS BODY comme le joueur
      pokemon.body.setSize(16, 16);
      pokemon.body.setOffset(8, 16);
      pokemon.body.setCollideWorldBounds(true);
      
      // ✅ AJOUTER LES COLLIDERS avec les mêmes layers que le joueur
      if (this.scene.collisionLayers && this.scene.collisionLayers.length > 0) {
        pokemon.colliders = [];
        this.scene.collisionLayers.forEach((layer) => {
          const collider = this.scene.physics.add.collider(pokemon, layer);
          pokemon.colliders.push(collider);
        });
        console.log(`🛡️ [OverworldPokemonManager] ${pokemon.colliders.length} colliders ajoutés pour ${name}`);
      }
      
      // Propriétés custom
      pokemon.overworldId = id;
      pokemon.pokemonId = pokemonId;
      pokemon.name = name;
      pokemon.isShiny = isShiny || false;
      pokemon.lastDirection = direction || 'down';
      pokemon.isMoving = isMoving || false;
      pokemon.animations = animations;
      pokemon.currentAnimation = currentAnimation;
      
      // ✅ Propriétés pour mouvement physics
      pokemon.targetX = targetX || x;
      pokemon.targetY = targetY || y;
      pokemon.moveSpeed = 100; // Vitesse de déplacement (comme le joueur)
      pokemon.isMovingToTarget = false;
      
      // ✅ Démarrer le mouvement si nécessaire
      if (isMoving && targetX !== undefined && targetY !== undefined) {
        this.startPhysicsMovement(pokemon, targetX, targetY);
      }
      
      // ✅ Gestion animation initiale
      const animDirection = this.getDirectionForAnimation(direction || 'down');
      const animType = animationFile.replace('-Anim.png', '').toLowerCase();
      
      let animKey;
      if (isMoving) {
        animKey = `overworld_pokemon_${pokemonId}_${animType}_${animDirection}`;
      } else {
        animKey = `overworld_pokemon_${pokemonId}_${animType}_idle_${animDirection}`;
      }
      
      // ✅ Protection pour animation
      this.scene.time.delayedCall(100, () => {
        if (pokemon && pokemon.anims && this.scene.anims.exists(animKey)) {
          try {
            pokemon.anims.play(animKey, true);
            console.log(`🎬 [OverworldPokemonManager] Animation: ${animKey}`);
          } catch (error) {
            console.warn(`⚠️ [OverworldPokemonManager] Erreur animation ${animKey}:`, error);
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
      
      console.log(`✅ [OverworldPokemonManager] ${name} créé avec physics movement`);
      
      return pokemon;
      
    } catch (error) {
      console.error(`❌ [OverworldPokemonManager] Erreur création Pokémon:`, error);
      return null;
    }
  }

  /**
   * ✅ Démarre le mouvement physics vers une cible
   */
  startPhysicsMovement(pokemon, targetX, targetY) {
    console.log(`🚀 [OverworldPokemonManager] ${pokemon.name} démarre mouvement physics vers (${targetX}, ${targetY})`);
    
    pokemon.targetX = targetX;
    pokemon.targetY = targetY;
    pokemon.isMovingToTarget = true;
    
    // Calculer la direction et la vélocité
    const deltaX = targetX - pokemon.x;
    const deltaY = targetY - pokemon.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > 2) { // Si assez loin pour bouger
      const velocityX = (deltaX / distance) * pokemon.moveSpeed;
      const velocityY = (deltaY / distance) * pokemon.moveSpeed;
      
      pokemon.body.setVelocity(velocityX, velocityY);
      
      // Déterminer la direction pour l'animation
      let direction = 'down';
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }
      
      pokemon.lastDirection = direction;
      
      // Jouer l'animation de marche
      const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').toLowerCase();
      const animKey = `overworld_pokemon_${pokemon.pokemonId}_${animType}_${direction}`;
      
      if (pokemon.anims && this.scene.anims.exists(animKey)) {
        try {
          pokemon.anims.play(animKey, true);
        } catch (error) {
          console.warn(`⚠️ Erreur animation marche:`, error);
        }
      }
    } else {
      // Déjà à destination
      this.stopPhysicsMovement(pokemon);
    }
  }

  /**
   * ✅ Arrête le mouvement physics
   */
  stopPhysicsMovement(pokemon) {
    console.log(`⏹️ [OverworldPokemonManager] ${pokemon.name} arrêt mouvement physics`);
    
    pokemon.body.setVelocity(0, 0);
    pokemon.isMovingToTarget = false;
    
    // Jouer l'animation idle
    const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').toLowerCase();
    const animKey = `overworld_pokemon_${pokemon.pokemonId}_${animType}_idle_${pokemon.lastDirection}`;
    
    if (pokemon.anims && this.scene.anims.exists(animKey)) {
      try {
        pokemon.anims.play(animKey, true);
      } catch (error) {
        console.warn(`⚠️ Erreur animation idle:`, error);
      }
    }
  }

  /**
   * ✅ Met à jour un Pokémon existant avec physics
   */
  updateOverworldPokemon(pokemonData) {
    const { 
      id, x, y, direction, isMoving, currentAnimation,
      targetX, targetY, moveStartTime, moveDuration
    } = pokemonData;
    
    const pokemon = this.overworldPokemon.get(id);
    if (!pokemon) return;
    
    console.log(`🔄 [OverworldPokemonManager] Update ${pokemon.name}: ${isMoving ? 'BOUGE' : 'IDLE'} ${direction}`);
    
    // ✅ Nouveau mouvement détecté
    if (isMoving && targetX !== undefined && targetY !== undefined) {
      if (targetX !== pokemon.targetX || targetY !== pokemon.targetY) {
        console.log(`🚀 [OverworldPokemonManager] Nouveau mouvement physics: ${pokemon.name} → (${targetX},${targetY})`);
        this.startPhysicsMovement(pokemon, targetX, targetY);
      }
    }
    
    // ✅ Arrêt forcé par le serveur
    else if (isMoving === false && pokemon.isMovingToTarget) {
      console.log(`⏹️ [OverworldPokemonManager] Arrêt forcé physics: ${pokemon.name}`);
      this.stopPhysicsMovement(pokemon);
      
      // Synchroniser position avec le serveur si nécessaire
      if (x !== undefined && y !== undefined) {
        pokemon.setPosition(x, y);
      }
    }
    
    // ✅ Mise à jour direction
    if (direction !== undefined) {
      pokemon.lastDirection = direction;
    }
  }

  /**
   * ✅ Mise à jour principale avec physics (BEAUCOUP plus simple)
   */
  update(delta = 16) {
    this.overworldPokemon.forEach((pokemon, id) => {
      // ✅ Vérifier si on est arrivé à destination
      if (pokemon.isMovingToTarget && pokemon.targetX !== undefined && pokemon.targetY !== undefined) {
        const deltaX = pokemon.targetX - pokemon.x;
        const deltaY = pokemon.targetY - pokemon.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance < 3) { // Seuil d'arrivée
          console.log(`🎯 [OverworldPokemonManager] ${pokemon.name} arrivé à destination physics`);
          pokemon.setPosition(pokemon.targetX, pokemon.targetY);
          this.stopPhysicsMovement(pokemon);
        }
      }
      
      // ✅ Mise à jour de la profondeur
      pokemon.setDepth(3 + (pokemon.y / 1000));
    });
  }

  /**
   * ✅ Supprime un Pokémon overworld avec cleanup physics
   */
  removeOverworldPokemon(id) {
    const pokemon = this.overworldPokemon.get(id);
    if (pokemon) {
      console.log(`🗑️ [OverworldPokemonManager] Suppression Pokémon ${id}`);
      
      if (pokemon.anims && pokemon.anims.isPlaying) {
        pokemon.anims.stop();
      }
      
      // ✅ NETTOYER LES COLLIDERS PHYSICS
      if (pokemon.colliders) {
        pokemon.colliders.forEach(collider => {
          try { collider.destroy(); } catch(e) {}
        });
      }
      
      if (pokemon.body) {
        pokemon.body.setVelocity(0, 0);
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
        
      default:
        console.warn(`⚠️ [OverworldPokemonManager] Message inconnu: ${type}`);
    }
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
   * ✅ Debug physics
   */
  debugOverworldPokemon() {
    console.log(`🔍 [OverworldPokemonManager] === DEBUG PHYSICS ===`);
    console.log(`📊 Pokémon actifs: ${this.overworldPokemon.size}`);
    console.log(`🎨 Sprites chargés: ${this.loadedSprites.size}`);
    console.log(`🛡️ Collision layers: ${this.scene.collisionLayers?.length || 0}`);
    console.log(`📏 Taille grille: ${this.gridSize}px`);
    
    this.overworldPokemon.forEach((pokemon, id) => {
      const velocity = pokemon.body ? `(${pokemon.body.velocity.x.toFixed(1)}, ${pokemon.body.velocity.y.toFixed(1)})` : 'N/A';
      
      console.log(`🌍 ${id}:`, {
        name: pokemon.name,
        position: `(${pokemon.x.toFixed(1)}, ${pokemon.y.toFixed(1)})`,
        target: `(${pokemon.targetX?.toFixed(1)}, ${pokemon.targetY?.toFixed(1)})`,
        direction: pokemon.lastDirection,
        isMovingToTarget: pokemon.isMovingToTarget,
        velocity: velocity,
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
    return Array.from(this.overworldPokemon.values()).filter(pokemon => pokemon.isMovingToTarget);
  }

  getIdlePokemon() {
    return Array.from(this.overworldPokemon.values()).filter(pokemon => !pokemon.isMovingToTarget);
  }
}
