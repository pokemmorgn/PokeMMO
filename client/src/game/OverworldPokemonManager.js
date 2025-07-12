// ================================================================================================
// CLIENT/SRC/GAME/OVERWORLDPOKEMONMANAGER.JS - VERSION TILE PAR TILE AVEC FLAPAROUND
// ================================================================================================
import { SpriteUtils } from '../utils/SpriteUtils.js';

export class OverworldPokemonManager {
  constructor(scene) {
    this.scene = scene;
    this.overworldPokemon = new Map(); // pokemonId -> sprite
    this.loadedSprites = new Set(); // Cache des sprites chargés
    this.loadingSprites = new Set(); // Cache des sprites en cours de chargement
    this.spriteStructures = new Map(); // Cache des structures détectées
    this.tileSize = 16; // Taille d'une tile
    this.moveSpeed = 32; // Pixels par seconde pour le lerp (plus lent = plus naturel)
    
    console.log("🌍 [OverworldPokemonManager] Initialisé - Système tile par tile avec FlapAround");
  }

  /**
   * ✅ Détermine si une animation utilise la première rangée seulement (FlapAround-Anim)
   */
  isFirstRowOnlyAnimation(animationFile) {
    return animationFile.toLowerCase().includes('flaparound-anim.png');
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
    
    // ✅ MISE À JOUR DIRECTION MÊME SI PAS DE MOUVEMENT
    if (direction !== undefined && direction !== pokemon.lastDirection) {
      console.log(`🧭 [OverworldPokemonManager] ${pokemon.name} changement direction: ${pokemon.lastDirection} → ${direction}`);
      pokemon.lastDirection = direction;
      
      // Si le Pokémon ne bouge pas, changer l'animation idle
      if (!pokemon.isMovingToTarget) {
        const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').toLowerCase();
        const idleAnimKey = `overworld_pokemon_${pokemon.pokemonId}_${animType}_idle_${direction}`;
        
        if (pokemon.anims && this.scene.anims.exists(idleAnimKey)) {
          try {
            pokemon.anims.play(idleAnimKey, true);
            console.log(`🎬 [OverworldPokemonManager] Animation direction: ${idleAnimKey}`);
          } catch (error) {
            console.warn(`⚠️ Erreur animation direction:`, error);
          }
        }
      }
    }
  }

  /**
   * ✅ Mise à jour principale avec lerp tile par tile
   */
  update(delta = 16) {
    this.overworldPokemon.forEach((pokemon, id) => {
      // ✅ Mise à jour du mouvement tile par tile
      if (pokemon.isMovingToTarget) {
        this.updateTileMovement(pokemon, delta);
      }
      
      // ✅ Mise à jour de la profondeur
      pokemon.setDepth(3 + (pokemon.y / 1000));
    });
  }

  /**
   * ✅ Met à jour le mouvement tile par tile avec lerp
   */
  updateTileMovement(pokemon, delta) {
    const now = Date.now();
    const elapsed = now - pokemon.moveStartTime;
    const progress = Math.min(elapsed / pokemon.moveDuration, 1);
    
    if (progress >= 1) {
      // Mouvement terminé
      pokemon.setPosition(pokemon.targetX, pokemon.targetY);
      pokemon.currentTileX = Math.round(pokemon.targetX / this.tileSize);
      pokemon.currentTileY = Math.round(pokemon.targetY / this.tileSize);
      this.stopTileMovement(pokemon);
      
      console.log(`🎯 [OverworldPokemonManager] ${pokemon.name} arrivé à tile (${pokemon.currentTileX}, ${pokemon.currentTileY})`);
    } else {
      // Lerp vers la position cible
      const startX = pokemon.currentTileX * this.tileSize;
      const startY = pokemon.currentTileY * this.tileSize;
      
      const currentX = startX + (pokemon.targetX - startX) * progress;
      const currentY = startY + (pokemon.targetY - startY) * progress;
      
      pokemon.setPosition(currentX, currentY);
      pokemon.moveProgress = progress;
    }
  }

  /**
   * ✅ Supprime un Pokémon overworld avec cleanup
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
   * ✅ Gestion demande de spawn - avec vérification tile
   */
  handlePokemonSpawnRequest(data) {
    const { id, x, y } = data;
    
    console.log(`🎯 [OverworldPokemonManager] Spawn request ${id} à (${x}, ${y})`);
    
    // ✅ Vérifier que la tile est libre
    const snappedPos = this.snapToGrid(x, y);
    const tileX = Math.round(snappedPos.x / this.tileSize);
    const tileY = Math.round(snappedPos.y / this.tileSize);
    
    const canSpawn = this.canMoveToTile(null, tileX, tileY);
    
    if (this.scene.networkManager?.room) {
      this.scene.networkManager.room.send('overworldPokemonSpawnResponse', {
        ...data,
        success: canSpawn,
        x: snappedPos.x,
        y: snappedPos.y
      });
    } else {
      console.error(`❌ [OverworldPokemonManager] Pas de connexion réseau pour répondre au spawn`);
    }
    
    console.log(`🎯 [OverworldPokemonManager] Spawn request ${id}: ${canSpawn ? 'OK' : 'BLOQUÉ'} à tile (${tileX}, ${tileY})`);
  }

  /**
   * ✅ Gestion demande de mouvement - avec vérification tile
   */
  handlePokemonMoveRequest(data) {
    const { id, fromX, fromY, toX, toY, direction } = data;
    
    console.log(`🚀 [OverworldPokemonManager] Move request ${id}: (${fromX},${fromY}) → (${toX},${toY})`);
    
    // ✅ Vérifier que la tile de destination est libre
    const snappedTarget = this.snapToGrid(toX, toY);
    const targetTileX = Math.round(snappedTarget.x / this.tileSize);
    const targetTileY = Math.round(snappedTarget.y / this.tileSize);
    
    const canMove = this.canMoveToTile(null, targetTileX, targetTileY);
    
    if (this.scene.networkManager?.room) {
      this.scene.networkManager.room.send('overworldPokemonMoveResponse', {
        id,
        success: canMove,
        toX: snappedTarget.x,
        toY: snappedTarget.y,
        direction
      });
    } else {
      console.error(`❌ [OverworldPokemonManager] Pas de connexion réseau pour répondre au mouvement`);
    }
    
    console.log(`🚀 [OverworldPokemonManager] Move request ${id}: ${canMove ? 'OK' : 'BLOQUÉ'} vers tile (${targetTileX}, ${targetTileY})`);
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
   * ✅ Debug système tile par tile avec zones et configuration
   */
  debugOverworldPokemon() {
    console.log(`🔍 [OverworldPokemonManager] === DEBUG TILE PAR TILE AVEC CONFIG ===`);
    console.log(`📊 Pokémon actifs: ${this.overworldPokemon.size}`);
    console.log(`🎨 Sprites chargés: ${this.loadedSprites.size}`);
    console.log(`🛡️ Collision layers: ${this.scene.collisionLayers?.length || 0}`);
    console.log(`📏 Taille tile: ${this.tileSize}px`);
    console.log(`⚡ Vitesse mouvement: ${this.moveSpeed}px/s`);
    console.log(`🎮 Système: TILE PAR TILE avec CONFIG MOUVEMENT`);
    
    this.overworldPokemon.forEach((pokemon, id) => {
      const isMoving = pokemon.isMovingToTarget;
      const currentTile = `(${pokemon.currentTileX}, ${pokemon.currentTileY})`;
      const targetTile = `(${Math.round(pokemon.targetX / this.tileSize)}, ${Math.round(pokemon.targetY / this.tileSize)})`;
      const spawnTile = `(${pokemon.spawnTileX}, ${pokemon.spawnTileY})`;
      const moveProgress = isMoving ? `${(pokemon.moveProgress * 100).toFixed(1)}%` : 'N/A';
      const distanceFromSpawn = Math.abs(pokemon.currentTileX - pokemon.spawnTileX) + Math.abs(pokemon.currentTileY - pokemon.spawnTileY);
      
      // ✅ NOUVEAU: Info sur la configuration de mouvement
      const movementConfig = {
        isStatic: pokemon.isStatic,
        canWander: pokemon.canWander,
        moveChance: pokemon.moveChance,
        movementRadius: pokemon.movementRadius
      };
      
      console.log(`🌍 ${id}:`, {
        name: pokemon.name,
        currentTile: currentTile,
        spawnTile: spawnTile,
        targetTile: targetTile,
        distanceFromSpawn: distanceFromSpawn,
        position: `(${pokemon.x.toFixed(1)}, ${pokemon.y.toFixed(1)})`,
        direction: pokemon.lastDirection,
        isMoving: isMoving,
        moveProgress: moveProgress,
        movementConfig: movementConfig,
        colliders: pokemon.colliders?.length || 0,
        currentAnimation: pokemon.currentAnimation
      });
    });
    
    console.log(`🎲 Utilisez debugShowMovementZone('pokemonId') pour voir la zone d'un Pokémon`);
    console.log(`🎯 Utilisez moveRandomlyInZone(pokemon) pour test de mouvement aléatoire`);
    console.log(`🔒 Les Pokémon STATIQUES ne bougent jamais`);
    console.log(`🚶 Les Pokémon avec canWander=false ne bougent que sur commande serveur`);
    console.log(`🦅 Support FlapAround-Anim avec paires d'index par direction`);
  }

  /**
   * ✅ Force un Pokémon à se déplacer à une tile spécifique (debug)
   */
  debugMovePokemonToTile(pokemonId, tileX, tileY) {
    const pokemon = this.overworldPokemon.get(pokemonId);
    if (!pokemon) {
      console.error(`❌ [DEBUG] Pokémon ${pokemonId} introuvable`);
      return false;
    }
    
    const targetX = tileX * this.tileSize;
    const targetY = tileY * this.tileSize;
    
    console.log(`🧪 [DEBUG] Force mouvement ${pokemon.name} vers tile (${tileX}, ${tileY})`);
    
    return this.startTileMovement(pokemon, targetX, targetY);
  }

  /**
   * ✅ Test de collision pour une tile spécifique (debug)
   */
  debugCheckTile(tileX, tileY) {
    const canMove = this.canMoveToTile(null, tileX, tileY);
    const pixelX = tileX * this.tileSize;
    const pixelY = tileY * this.tileSize;
    
    console.log(`🧪 [DEBUG] Tile (${tileX}, ${tileY}) à (${pixelX}, ${pixelY}): ${canMove ? 'LIBRE' : 'BLOQUÉE'}`);
    
    // Vérifier chaque layer
    if (this.scene.collisionLayers) {
      this.scene.collisionLayers.forEach((layer, index) => {
        const tile = layer.getTileAtWorldXY(pixelX, pixelY);
        if (tile) {
          console.log(`  Layer ${index} (${layer.layer.name}): Tile ${tile.index}, Collides: ${tile.collides}`);
        } else {
          console.log(`  Layer ${index} (${layer.layer.name}): Pas de tile`);
        }
      });
    }
    
    return canMove;
  }

  /**
   * ✅ Obtient une tile libre dans la zone de mouvement autorisée
   */
  getRandomTileInMovementZone(pokemon) {
    if (!pokemon.spawnTileX || !pokemon.spawnTileY) {
      return null;
    }
    
    const attempts = 20; // Éviter les boucles infinies
    const radius = pokemon.movementRadius;
    
    for (let i = 0; i < attempts; i++) {
      // Générer une position aléatoire dans le rayon
      const deltaX = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
      const deltaY = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
      
      const targetTileX = pokemon.spawnTileX + deltaX;
      const targetTileY = pokemon.spawnTileY + deltaY;
      
      // Vérifier si cette tile est libre
      if (this.canMoveToTile(pokemon, targetTileX, targetTileY) && 
          !this.isTileOccupiedByPokemon(targetTileX, targetTileY)) {
        return {
          tileX: targetTileX,
          tileY: targetTileY,
          pixelX: targetTileX * this.tileSize,
          pixelY: targetTileY * this.tileSize
        };
      }
    }
    
    console.log(`⚠️ [OverworldPokemonManager] Aucune tile libre trouvée pour ${pokemon.name} dans sa zone`);
    return null;
  }
  
  /**
   * ✅ Fait bouger un Pokémon aléatoirement dans sa zone
   */
  moveRandomlyInZone(pokemon) {
    const randomTile = this.getRandomTileInMovementZone(pokemon);
    
    if (randomTile) {
      console.log(`🎲 [OverworldPokemonManager] ${pokemon.name} mouvement aléatoire vers (${randomTile.tileX}, ${randomTile.tileY})`);
      return this.startTileMovement(pokemon, randomTile.pixelX, randomTile.pixelY);
    }
    
    return false;
  }
  
  /**
   * ✅ Affiche la zone de mouvement d'un Pokémon (debug)
   */
  debugShowMovementZone(pokemonId) {
    const pokemon = this.overworldPokemon.get(pokemonId);
    if (!pokemon) {
      console.error(`❌ [DEBUG] Pokémon ${pokemonId} introuvable`);
      return;
    }
    
    const radius = pokemon.movementRadius;
    const centerX = pokemon.spawnTileX;
    const centerY = pokemon.spawnTileY;
    
    console.log(`🧪 [DEBUG] Zone de mouvement de ${pokemon.name}:`);
    console.log(`📍 Spawn: (${centerX}, ${centerY})`);
    console.log(`📏 Rayon: ${radius} tiles`);
    console.log(`🗺️ Zone: ${radius * 2 + 1}x${radius * 2 + 1} tiles`);
    
    // Afficher la grille de la zone
    console.log(`Légende: 🟢 = spawn, ⬜ = libre, 🟥 = bloqué, 🟡 = occupé`);
    
    for (let y = centerY - radius; y <= centerY + radius; y++) {
      let row = `${y.toString().padStart(2, '0')}: `;
      for (let x = centerX - radius; x <= centerX + radius; x++) {
        if (x === centerX && y === centerY) {
          row += '🟢'; // Point de spawn
        } else if (this.isTileOccupiedByPokemon(x, y)) {
          row += '🟡'; // Occupé par un Pokémon
        } else if (this.canMoveToTile(pokemon, x, y)) {
          row += '⬜'; // Libre
        } else {
          row += '🟥'; // Bloqué
        }
      }
      console.log(row);
    }
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

  /**
   * ✅ Obtient la position tile d'un Pokémon
   */
  getPokemonTilePosition(id) {
    const pokemon = this.overworldPokemon.get(id);
    if (!pokemon) return null;
    
    return {
      tileX: pokemon.currentTileX,
      tileY: pokemon.currentTileY,
      pixelX: pokemon.x,
      pixelY: pokemon.y
    };
  }

  /**
   * ✅ Obtient tous les Pokémon sur une tile spécifique
   */
  getPokemonOnTile(tileX, tileY) {
    return Array.from(this.overworldPokemon.values()).filter(pokemon => 
      pokemon.currentTileX === tileX && pokemon.currentTileY === tileY
    );
  }

  /**
   * ✅ Vérifie si une tile est occupée par un Pokémon
   */
  isTileOccupiedByPokemon(tileX, tileY) {
    return this.getPokemonOnTile(tileX, tileY).length > 0;
  }

  /**
   * ✅ Obtient la tile la plus proche libre autour d'une position
   */
  getNearestFreeTile(centerTileX, centerTileY, maxRadius = 3) {
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Ignorer le centre et ne vérifier que le périmètre du rayon actuel
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
            const checkX = centerTileX + dx;
            const checkY = centerTileY + dy;
            
            if (this.canMoveToTile(null, checkX, checkY) && 
                !this.isTileOccupiedByPokemon(checkX, checkY)) {
              return { tileX: checkX, tileY: checkY };
            }
          }
        }
      }
    }
    
    return null; // Aucune tile libre trouvée
  }
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
   * ✅ Crée les animations avec support première rangée pour FlapAround-Anim
   */
  createPokemonAnimations(pokemonId, spriteKey, structure, animationFile) {
    const isFirstRowOnly = this.isFirstRowOnlyAnimation(animationFile);
    
    console.log(`🎬 [OverworldPokemonManager] Création animations ${pokemonId} - Mode: ${isFirstRowOnly ? 'FlapAround' : 'Standard'}`);

    if (isFirstRowOnly) {
      this.createFlapAroundAnimations(pokemonId, spriteKey, structure, animationFile);
    } else {
      this.createStandardAnimations(pokemonId, spriteKey, structure, animationFile);
    }
  }

  /**
   * ✅ Animations FlapAround-Anim (première rangée uniquement avec paires d'index)
   */
  createFlapAroundAnimations(pokemonId, spriteKey, structure, animationFile) {
    const animType = animationFile.replace('-Anim.png', '').toLowerCase();
    
    // ✅ Mapping des directions avec leurs paires d'index
    const directions = [
      { name: 'down', startIndex: 0 },        // Index 0-1 : vole vers le bas
      { name: 'down-right', startIndex: 2 },  // Index 2-3 : bas droite  
      { name: 'right', startIndex: 4 },       // Index 4-5 : droite
      { name: 'up-right', startIndex: 6 },    // Index 6-7 : haut droite
      { name: 'up', startIndex: 8 },          // Index 8-9 : haut
      { name: 'up-left', startIndex: 10 },    // Index 10-11 : haut gauche
      { name: 'left', startIndex: 12 },       // Index 12-13 : gauche
      { name: 'down-left', startIndex: 14 }   // Index 14-15 : bas gauche
    ];

    directions.forEach(dir => {
      // Vérifier qu'on a assez de frames
      if (dir.startIndex + 1 < structure.cols * structure.rows) {
        const walkKey = `overworld_pokemon_${pokemonId}_${animType}_${dir.name}`;
        const idleKey = `overworld_pokemon_${pokemonId}_${animType}_idle_${dir.name}`;
        
        // Animation de vol (2 frames par direction)
        if (!this.scene.anims.exists(walkKey)) {
          this.scene.anims.create({
            key: walkKey,
            frames: [
              { key: spriteKey, frame: dir.startIndex },     // Frame 1
              { key: spriteKey, frame: dir.startIndex + 1 }  // Frame 2
            ],
            frameRate: 8, // Vitesse d'animation de vol
            repeat: -1
          });
        }
        
        // Animation idle (première frame de la paire)
        if (!this.scene.anims.exists(idleKey)) {
          this.scene.anims.create({
            key: idleKey,
            frames: [{
              key: spriteKey,
              frame: dir.startIndex
            }],
            frameRate: 1,
            repeat: 0
          });
        }
      }
    });
    
    console.log(`✅ [OverworldPokemonManager] Animations FlapAround créées pour ${pokemonId}`);
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
   * ✅ Snap une position sur la grille 16x16
   */
  snapToGrid(x, y) {
    return {
      x: Math.round(x / this.tileSize) * this.tileSize,
      y: Math.round(y / this.tileSize) * this.tileSize
    };
  }

  /**
   * ✅ Vérifie si une position tile est libre ET dans la zone de mouvement autorisée
   */
  canMoveToTile(pokemon, tileX, tileY) {
    // Convertir en pixels (centre de la tile)
    const pixelX = tileX * this.tileSize + (this.tileSize / 2);
    const pixelY = tileY * this.tileSize + (this.tileSize / 2);
    
    console.log(`🔍 [OverworldPokemonManager] Vérification tile (${tileX}, ${tileY}) = pixels (${pixelX}, ${pixelY})`);
    
    // ✅ NOUVEAU: Vérifier si le Pokémon peut bouger (statique ou non)
    if (pokemon && pokemon.isStatic) {
      console.log(`🚫 [OverworldPokemonManager] ${pokemon.name} est STATIQUE - mouvement interdit`);
      return false;
    }
    
    // ✅ Vérifier si c'est dans la zone de mouvement autorisée
    if (pokemon && pokemon.spawnTileX !== undefined && pokemon.spawnTileY !== undefined) {
      const distanceFromSpawn = Math.abs(tileX - pokemon.spawnTileX) + Math.abs(tileY - pokemon.spawnTileY);
      if (distanceFromSpawn > pokemon.movementRadius) {
        console.log(`🚫 [OverworldPokemonManager] Tile (${tileX}, ${tileY}) HORS ZONE - distance ${distanceFromSpawn} > ${pokemon.movementRadius}`);
        return false;
      }
    }
    
    // Vérifier les collisions avec les layers
    if (this.scene.collisionLayers && this.scene.collisionLayers.length > 0) {
      for (let i = 0; i < this.scene.collisionLayers.length; i++) {
        const layer = this.scene.collisionLayers[i];
        const tile = layer.getTileAtWorldXY(pixelX, pixelY);
        
        console.log(`  Layer ${i}: tile=${tile?.index || 'null'}, collides=${tile?.collides || false}`);
        
        if (tile && tile.collides) {
          console.log(`🚫 [OverworldPokemonManager] Tile (${tileX}, ${tileY}) BLOQUÉE par layer ${i}`);
          return false;
        }
      }
    } else {
      console.warn(`⚠️ [OverworldPokemonManager] Aucun collisionLayer trouvé !`);
    }
    
    console.log(`✅ [OverworldPokemonManager] Tile (${tileX}, ${tileY}) LIBRE`);
    return true;
  }

  /**
   * ✅ Crée ou met à jour un Pokémon overworld avec système tile par tile
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
      
      // ✅ CRÉATION AVEC PHYSICS mais position snappée sur grille
      const snappedPos = this.snapToGrid(x, y);
      const pokemon = this.scene.physics.add.sprite(snappedPos.x, snappedPos.y, spriteKey, 0);
      
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
      
      // ✅ NOUVEAU: Configuration de mouvement depuis les données serveur
      pokemon.spawnTileX = Math.round(snappedPos.x / this.tileSize);
      pokemon.spawnTileY = Math.round(snappedPos.y / this.tileSize);
      pokemon.movementRadius = pokemonData.movementRadius || 3; // Rayon en tiles (défaut: 3)
      pokemon.isStatic = pokemonData.isStatic || false; // Si true, ne bouge jamais
      pokemon.canWander = pokemonData.canWander !== false; // Si false, ne bouge que sur commande serveur
      pokemon.moveChance = pokemonData.moveChance || 0.7; // Probabilité de mouvement (0.0 à 1.0)
      
      // ✅ Propriétés pour mouvement tile par tile
      pokemon.targetX = targetX ? this.snapToGrid(targetX, 0).x : snappedPos.x;
      pokemon.targetY = targetY ? this.snapToGrid(0, targetY).y : snappedPos.y;
      pokemon.isMovingToTarget = false;
      pokemon.moveProgress = 0; // 0 à 1 pour le lerp
      pokemon.moveStartTime = 0;
      pokemon.moveDuration = 0;
      
      // ✅ Position actuelle en tiles
      pokemon.currentTileX = Math.round(snappedPos.x / this.tileSize);
      pokemon.currentTileY = Math.round(snappedPos.y / this.tileSize);
      
      // ✅ Démarrer le mouvement si nécessaire
      if (isMoving && targetX !== undefined && targetY !== undefined) {
        this.startTileMovement(pokemon, targetX, targetY);
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
      
      console.log(`✅ [OverworldPokemonManager] ${name} créé avec système tile par tile`);
      
      return pokemon;
      
    } catch (error) {
      console.error(`❌ [OverworldPokemonManager] Erreur création Pokémon:`, error);
      return null;
    }
  }

  /**
   * ✅ Démarre le mouvement tile par tile vers une cible - AVEC VÉRIFICATION STRICTE
   */
  startTileMovement(pokemon, targetX, targetY) {
    // Snapper la cible sur la grille
    const snappedTarget = this.snapToGrid(targetX, targetY);
    const targetTileX = Math.round(snappedTarget.x / this.tileSize);
    const targetTileY = Math.round(snappedTarget.y / this.tileSize);
    
    console.log(`🚀 [OverworldPokemonManager] ${pokemon.name} tile movement: (${pokemon.currentTileX},${pokemon.currentTileY}) → (${targetTileX},${targetTileY})`);
    
    // ✅ VÉRIFICATION STRICTE - ARRÊTER SI BLOQUÉ
    if (!this.canMoveToTile(pokemon, targetTileX, targetTileY)) {
      console.log(`🚫 [OverworldPokemonManager] ${pokemon.name} MOUVEMENT BLOQUÉ - tile (${targetTileX},${targetTileY}) collision détectée`);
      
      // ✅ FORCER L'ARRÊT et jouer animation idle
      this.stopTileMovement(pokemon);
      return false;
    }
    
    // Configuration du mouvement
    pokemon.targetX = snappedTarget.x;
    pokemon.targetY = snappedTarget.y;
    pokemon.isMovingToTarget = true;
    pokemon.moveProgress = 0;
    pokemon.moveStartTime = Date.now();
    pokemon.moveDuration = (this.tileSize / this.moveSpeed) * 1000; // Durée en ms
    
    // Déterminer la direction pour l'animation
    const deltaX = targetTileX - pokemon.currentTileX;
    const deltaY = targetTileY - pokemon.currentTileY;
    
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
        console.log(`🎬 [OverworldPokemonManager] Animation marche: ${animKey}`);
      } catch (error) {
        console.warn(`⚠️ Erreur animation marche:`, error);
      }
    }
    
    console.log(`✅ [OverworldPokemonManager] ${pokemon.name} mouvement autorisé vers (${targetTileX}, ${targetTileY})`);
    return true;
  }

  /**
   * ✅ Arrête le mouvement tile par tile
   */
  stopTileMovement(pokemon) {
    console.log(`⏹️ [OverworldPokemonManager] ${pokemon.name} arrêt mouvement tile`);
    
    // Snapper à la position finale
    const finalPos = this.snapToGrid(pokemon.x, pokemon.y);
    pokemon.setPosition(finalPos.x, finalPos.y);
    
    // Mettre à jour la position tile
    pokemon.currentTileX = Math.round(finalPos.x / this.tileSize);
    pokemon.currentTileY = Math.round(finalPos.y / this.tileSize);
    
    pokemon.isMovingToTarget = false;
    pokemon.moveProgress = 0;
    
    // Jouer l'animation idle
    const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').toLowerCase();
    const animKey = `overworld_pokemon_${pokemon.pokemonId}_${animType}_idle_${pokemon.lastDirection}`;
    
    if (pokemon.anims && this.scene.anims.exists(animKey)) {
      try {
        pokemon.anims.play(animKey, true);
        console.log(`🎬 [OverworldPokemonManager] Animation idle: ${animKey}`);
      } catch (error) {
        console.warn(`⚠️ Erreur animation idle:`, error);
      }
    }
  }

  /**
   * ✅ Met à jour un Pokémon existant avec système tile par tile - AVEC DEBUG VISUEL
   */
  updateOverworldPokemon(pokemonData) {
    const { 
      id, x, y, direction, isMoving, currentAnimation,
      targetX, targetY, moveStartTime, moveDuration
    } = pokemonData;
    
    const pokemon = this.overworldPokemon.get(id);
    if (!pokemon) return;
    
    console.log(`🔄 [OverworldPokemonManager] Update ${pokemon.name}: isMoving=${isMoving}, direction=${direction}`);
    console.log(`📍 Position serveur: (${x}, ${y}) → Target: (${targetX}, ${targetY})`);
    console.log(`🎯 Position client actuelle: (${pokemon.x.toFixed(1)}, ${pokemon.y.toFixed(1)})`);
    
    // ✅ SYNCHRONISER POSITION SI TROP ÉLOIGNÉE
    if (x !== undefined && y !== undefined) {
      const distanceX = Math.abs(pokemon.x - x);
      const distanceY = Math.abs(pokemon.y - y);
      
      if (distanceX > 5 || distanceY > 5) {
        console.log(`🔄 [OverworldPokemonManager] ${pokemon.name} SYNC position: client(${pokemon.x.toFixed(1)}, ${pokemon.y.toFixed(1)}) → serveur(${x}, ${y})`);
        const snappedPos = this.snapToGrid(x, y);
        pokemon.setPosition(snappedPos.x, snappedPos.y);
        pokemon.currentTileX = Math.round(snappedPos.x / this.tileSize);
        pokemon.currentTileY = Math.round(snappedPos.y / this.tileSize);
      }
    }
    
    // ✅ NOUVEAU MOUVEMENT DÉTECTÉ - FORCER LE DÉMARRAGE
    if (isMoving && targetX !== undefined && targetY !== undefined) {
      const snappedTarget = this.snapToGrid(targetX, targetY);
      const targetTileX = Math.round(snappedTarget.x / this.tileSize);
      const targetTileY = Math.round(snappedTarget.y / this.tileSize);
      
      console.log(`🚀 [OverworldPokemonManager] ${pokemon.name} COMMANDE MOUVEMENT: (${pokemon.currentTileX}, ${pokemon.currentTileY}) → (${targetTileX}, ${targetTileY})`);
      
      // ✅ ARRÊTER LE MOUVEMENT ACTUEL S'IL Y EN A UN
      if (pokemon.isMovingToTarget) {
        console.log(`⏹️ [OverworldPokemonManager] ${pokemon.name} arrêt mouvement précédent`);
        this.stopTileMovement(pokemon);
      }
      
      // ✅ FORCER LE NOUVEAU MOUVEMENT - IGNORER LES VÉRIFICATIONS DE COLLISION
      console.log(`🎯 [OverworldPokemonManager] ${pokemon.name} FORCE mouvement vers (${targetTileX}, ${targetTileY})`);
      
      // Configuration du mouvement FORCÉ
      pokemon.targetX = snappedTarget.x;
      pokemon.targetY = snappedTarget.y;
      pokemon.isMovingToTarget = true;
      pokemon.moveProgress = 0;
      pokemon.moveStartTime = Date.now();
      pokemon.moveDuration = (this.tileSize / this.moveSpeed) * 1000;
      
      // Déterminer la direction pour l'animation
      const deltaX = targetTileX - pokemon.currentTileX;
      const deltaY = targetTileY - pokemon.currentTileY;
      
      let newDirection = 'down';
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        newDirection = deltaX > 0 ? 'right' : 'left';
      } else {
        newDirection = deltaY > 0 ? 'down' : 'up';
      }
      
      pokemon.lastDirection = direction || newDirection;
      
      // ✅ FORCER L'ANIMATION DE MARCHE
      const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').toLowerCase();
      const animKey = `overworld_pokemon_${pokemon.pokemonId}_${animType}_${pokemon.lastDirection}`;
      
      if (pokemon.anims && this.scene.anims.exists(animKey)) {
        try {
          pokemon.anims.play(animKey, true);
          console.log(`🎬 [OverworldPokemonManager] FORCE animation marche: ${animKey}`);
        } catch (error) {
          console.warn(`⚠️ Erreur animation marche:`, error);
        }
      }
      
      console.log(`✅ [OverworldPokemonManager] ${pokemon.name} mouvement visuel FORCÉ démarré`);
    }
    
    // ✅ ARRÊT FORCÉ PAR LE SERVEUR
    else if (isMoving === false && pokemon.isMovingToTarget) {
      console.log(`⏹️ [OverworldPokemonManager] ${pokemon.name} ARRÊT forcé par serveur`);
      this.stopTileMovement(pokemon);
      
      // Synchroniser position finale avec le serveur
      if (x !== undefined && y !== undefined) {
        const snappedPos = this.snapToGrid(x, y);
        pokemon.setPosition(snappedPos.x, snappedPos.y);
        pokemon.currentTileX = Math.round(snappedPos.x / this.tileSize);
        pokemon.currentTileY = Math.round(snappedPos.y / this.tileSize);
        console.log(`📍 [OverworldPokemonManager] ${pokemon.name} position finale sync: (${pokemon.currentTileX}, ${pokemon.currentTileY})`);
      }
    }
