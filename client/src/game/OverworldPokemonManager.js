// ================================================================================================
// CLIENT/SRC/GAME/OVERWORLDPOKEMONMANAGER.JS - VERSION TILE PAR TILE
// ================================================================================================
import { SpriteUtils } from '../utils/SpriteUtils.js';

export class OverworldPokemonManager {
  constructor(scene) {
    this.scene = scene;
    this.overworldPokemon = new Map();
    this.loadedSprites = new Set();
    this.loadingSprites = new Set();
    this.spriteStructures = new Map();
    this.tileSize = 32;
    this.moveSpeed = 32;
    
    console.log("🌍 [OverworldPokemonManager] Initialisé - Système tile par tile");
  }

  isFirstRowOnlyAnimation(animationFile) {
    return animationFile.toLowerCase().includes('swing-anim.png');
  }

  async detectSpriteStructure(pokemonId, animationFile, width, height) {
    return await SpriteUtils.getSpriteStructure(pokemonId, animationFile, width, height);
  }

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

  createPokemonAnimations(pokemonId, spriteKey, structure, animationFile) {
    const isFirstRowOnly = this.isFirstRowOnlyAnimation(animationFile);
    
    console.log(`🎬 [OverworldPokemonManager] Création animations ${pokemonId} - Mode: ${isFirstRowOnly ? 'Swing' : 'Standard'}`);

    if (isFirstRowOnly) {
      this.createSwingAnimations(pokemonId, spriteKey, structure, animationFile);
    } else {
      this.createStandardAnimations(pokemonId, spriteKey, structure, animationFile);
    }
  }

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
            repeat: 0
          });
        }
      }
    });
    
    console.log(`✅ [OverworldPokemonManager] Animations Swing créées pour ${pokemonId}`);
  }

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

  snapToGrid(x, y) {
    return {
      x: Math.round(x / this.tileSize) * this.tileSize,
      y: Math.round(y / this.tileSize) * this.tileSize
    };
  }

  canMoveToTile(pokemon, tileX, tileY) {
    const pixelX = tileX * this.tileSize + (this.tileSize / 2);
    const pixelY = tileY * this.tileSize + (this.tileSize / 2);
    
    if (pokemon && pokemon.isStatic) {
      console.log(`🚫 [OverworldPokemonManager] ${pokemon.name} est STATIQUE - mouvement interdit`);
      return false;
    }
    
    if (pokemon && pokemon.spawnTileX !== undefined && pokemon.spawnTileY !== undefined) {
      const distanceFromSpawn = Math.abs(tileX - pokemon.spawnTileX) + Math.abs(tileY - pokemon.spawnTileY);
      if (distanceFromSpawn > pokemon.movementRadius) {
 //       console.log(`🚫 [OverworldPokemonManager] Tile (${tileX}, ${tileY}) HORS ZONE - distance ${distanceFromSpawn} > ${pokemon.movementRadius}`);
        return false;
      }
    }
    
    if (this.scene.collisionLayers && this.scene.collisionLayers.length > 0) {
      for (let i = 0; i < this.scene.collisionLayers.length; i++) {
        const layer = this.scene.collisionLayers[i];
        const tile = layer.getTileAtWorldXY(pixelX, pixelY);
        
        if (tile && tile.collides) {
  //        console.log(`🚫 [OverworldPokemonManager] Tile (${tileX}, ${tileY}) BLOQUÉE par layer ${i}`);
          return false;
        }
      }
    } else {
      console.warn(`⚠️ [OverworldPokemonManager] Aucun collisionLayer trouvé !`);
    }
    
    console.log(`✅ [OverworldPokemonManager] Tile (${tileX}, ${tileY}) LIBRE`);
    return true;
  }

  async createOrUpdateOverworldPokemon(pokemonData) {
    try {
      const { 
        id, pokemonId, name, x, y, direction, isMoving, isShiny, 
        animations, currentAnimation, targetX, targetY, 
        moveStartTime, moveDuration
      } = pokemonData;
      
      console.log(`🌍 [OverworldPokemonManager] Création/MAJ ${name} (${id}) à (${x}, ${y})`);
      
      if (this.overworldPokemon.has(id)) {
        this.removeOverworldPokemon(id);
      }
      
      const animationFile = animations[currentAnimation] || 'Walk-Anim.png';
      const spriteKey = await this.loadPokemonSprite(pokemonId, animationFile);
      
      const snappedPos = this.snapToGrid(x, y);
      const pokemon = this.scene.physics.add.sprite(snappedPos.x, snappedPos.y, spriteKey, 0);
      
      pokemon.setOrigin(0.5, 1);
      pokemon.setScale(1.0);
      pokemon.setDepth(3);
      
      pokemon.body.setSize(16, 16);
      pokemon.body.setOffset(8, 16);
      pokemon.body.setCollideWorldBounds(true);
      
      if (this.scene.collisionLayers && this.scene.collisionLayers.length > 0) {
        pokemon.colliders = [];
        this.scene.collisionLayers.forEach((layer) => {
          const collider = this.scene.physics.add.collider(pokemon, layer);
          pokemon.colliders.push(collider);
        });
        console.log(`🛡️ [OverworldPokemonManager] ${pokemon.colliders.length} colliders ajoutés pour ${name}`);
      }
      
      pokemon.overworldId = id;
      pokemon.pokemonId = pokemonId;
      pokemon.name = name;
      pokemon.isShiny = isShiny || false;
      pokemon.lastDirection = direction || 'down';
      pokemon.isMoving = isMoving || false;
      pokemon.animations = animations;
      pokemon.currentAnimation = currentAnimation;
      
      pokemon.spawnTileX = Math.round(snappedPos.x / this.tileSize);
      pokemon.spawnTileY = Math.round(snappedPos.y / this.tileSize);
      pokemon.movementRadius = pokemonData.movementRadius || 3;
      pokemon.isStatic = pokemonData.isStatic || false;
      pokemon.canWander = pokemonData.canWander !== false;
      pokemon.moveChance = pokemonData.moveChance || 0.7;
      
      pokemon.targetX = targetX ? this.snapToGrid(targetX, 0).x : snappedPos.x;
      pokemon.targetY = targetY ? this.snapToGrid(0, targetY).y : snappedPos.y;
      pokemon.isMovingToTarget = false;
      pokemon.moveProgress = 0;
      pokemon.moveStartTime = 0;
      pokemon.moveDuration = 0;
      
      pokemon.currentTileX = Math.round(snappedPos.x / this.tileSize);
      pokemon.currentTileY = Math.round(snappedPos.y / this.tileSize);
      
      if (isMoving && targetX !== undefined && targetY !== undefined) {
        this.startTileMovement(pokemon, targetX, targetY);
      }
      
      const animDirection = this.getDirectionForAnimation(direction || 'down');
      const animType = animationFile.replace('-Anim.png', '').replace('.png', '').toLowerCase();
      
      let animKey;
      if (isMoving) {
        animKey = `overworld_pokemon_${pokemonId}_${animType}_${animDirection}`;
      } else {
        animKey = `overworld_pokemon_${pokemonId}_${animType}_idle_${animDirection}`;
      }
      
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
      
      this.overworldPokemon.set(id, pokemon);
      
      console.log(`✅ [OverworldPokemonManager] ${name} créé avec système tile par tile`);
      
      return pokemon;
      
    } catch (error) {
      console.error(`❌ [OverworldPokemonManager] Erreur création Pokémon:`, error);
      return null;
    }
  }

  startTileMovement(pokemon, targetX, targetY) {
    const snappedTarget = this.snapToGrid(targetX, targetY);
    const targetTileX = Math.round(snappedTarget.x / this.tileSize);
    const targetTileY = Math.round(snappedTarget.y / this.tileSize);
    
//    console.log(`🚀 [OverworldPokemonManager] ${pokemon.name} tile movement: (${pokemon.currentTileX},${pokemon.currentTileY}) → (${targetTileX},${targetTileY})`);
    
    if (!this.canMoveToTile(pokemon, targetTileX, targetTileY)) {
//      console.log(`🚫 [OverworldPokemonManager] ${pokemon.name} MOUVEMENT BLOQUÉ - tile (${targetTileX},${targetTileY}) collision détectée`);
      this.stopTileMovement(pokemon);
      return false;
    }
    
    pokemon.targetX = snappedTarget.x;
    pokemon.targetY = snappedTarget.y;
    pokemon.isMovingToTarget = true;
    pokemon.moveProgress = 0;
    pokemon.moveStartTime = Date.now();
    pokemon.moveDuration = (this.tileSize / this.moveSpeed) * 1000;
    
    const deltaX = targetTileX - pokemon.currentTileX;
    const deltaY = targetTileY - pokemon.currentTileY;
    
    let direction = 'down';
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }
    
    pokemon.lastDirection = direction;
    
    const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').replace('.png', '').toLowerCase();
    const animKey = `overworld_pokemon_${pokemon.pokemonId}_${animType}_${direction}`;
    
    if (pokemon.anims && this.scene.anims.exists(animKey)) {
      try {
        pokemon.anims.play(animKey, true);
//        console.log(`🎬 [OverworldPokemonManager] Animation marche: ${animKey}`);
      } catch (error) {
        console.warn(`⚠️ Erreur animation marche:`, error);
      }
    }
    
//    console.log(`✅ [OverworldPokemonManager] ${pokemon.name} mouvement autorisé vers (${targetTileX}, ${targetTileY})`);
    return true;
  }

  stopTileMovement(pokemon) {
    console.log(`⏹️ [OverworldPokemonManager] ${pokemon.name} arrêt mouvement tile`);
    
    const finalPos = this.snapToGrid(pokemon.x, pokemon.y);
    pokemon.setPosition(finalPos.x, finalPos.y);
    
    pokemon.currentTileX = Math.round(finalPos.x / this.tileSize);
    pokemon.currentTileY = Math.round(finalPos.y / this.tileSize);
    
    pokemon.isMovingToTarget = false;
    pokemon.moveProgress = 0;
    
    const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').replace('.png', '').toLowerCase();
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

  updateOverworldPokemon(pokemonData) {
    const { 
      id, x, y, direction, isMoving, currentAnimation,
      targetX, targetY, moveStartTime, moveDuration
    } = pokemonData;
    
    const pokemon = this.overworldPokemon.get(id);
    if (!pokemon) return;
    
    console.log(`🔄 [OverworldPokemonManager] Update ${pokemon.name}: isMoving=${isMoving}, direction=${direction}`);
    
    if (x !== undefined && y !== undefined) {
      const distanceX = Math.abs(pokemon.x - x);
      const distanceY = Math.abs(pokemon.y - y);
      
      if (distanceX > 5 || distanceY > 5) {
        console.log(`🔄 [OverworldPokemonManager] ${pokemon.name} SYNC position`);
        const snappedPos = this.snapToGrid(x, y);
        pokemon.setPosition(snappedPos.x, snappedPos.y);
        pokemon.currentTileX = Math.round(snappedPos.x / this.tileSize);
        pokemon.currentTileY = Math.round(snappedPos.y / this.tileSize);
      }
    }
    
    if (isMoving && targetX !== undefined && targetY !== undefined) {
      if (pokemon.isMovingToTarget) {
        this.stopTileMovement(pokemon);
      }
      
      const snappedTarget = this.snapToGrid(targetX, targetY);
      pokemon.targetX = snappedTarget.x;
      pokemon.targetY = snappedTarget.y;
      pokemon.isMovingToTarget = true;
      pokemon.moveProgress = 0;
      pokemon.moveStartTime = Date.now();
      pokemon.moveDuration = (this.tileSize / this.moveSpeed) * 1000;
      
      const targetTileX = Math.round(snappedTarget.x / this.tileSize);
      const targetTileY = Math.round(snappedTarget.y / this.tileSize);
      const deltaX = targetTileX - pokemon.currentTileX;
      const deltaY = targetTileY - pokemon.currentTileY;
      
      let newDirection = 'down';
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        newDirection = deltaX > 0 ? 'right' : 'left';
      } else {
        newDirection = deltaY > 0 ? 'down' : 'up';
      }
      
      pokemon.lastDirection = direction || newDirection;
      
      const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').replace('.png', '').toLowerCase();
      const animKey = `overworld_pokemon_${pokemon.pokemonId}_${animType}_${pokemon.lastDirection}`;
      
      if (pokemon.anims && this.scene.anims.exists(animKey)) {
        try {
          pokemon.anims.play(animKey, true);
        } catch (error) {
          console.warn(`⚠️ Erreur animation marche:`, error);
        }
      }
    } else if (isMoving === false && pokemon.isMovingToTarget) {
      this.stopTileMovement(pokemon);
      
      if (x !== undefined && y !== undefined) {
        const snappedPos = this.snapToGrid(x, y);
        pokemon.setPosition(snappedPos.x, snappedPos.y);
        pokemon.currentTileX = Math.round(snappedPos.x / this.tileSize);
        pokemon.currentTileY = Math.round(snappedPos.y / this.tileSize);
      }
    }
    
    if (direction !== undefined && direction !== pokemon.lastDirection) {
      pokemon.lastDirection = direction;
      
      if (!pokemon.isMovingToTarget) {
        const animType = pokemon.animations[pokemon.currentAnimation].replace('-Anim.png', '').replace('.png', '').toLowerCase();
        const idleAnimKey = `overworld_pokemon_${pokemon.pokemonId}_${animType}_idle_${direction}`;
        
        if (pokemon.anims && this.scene.anims.exists(idleAnimKey)) {
          try {
            pokemon.anims.play(idleAnimKey, true);
          } catch (error) {
            console.warn(`⚠️ Erreur animation direction:`, error);
          }
        }
      }
    }
  }

  update(delta = 16) {
    this.overworldPokemon.forEach((pokemon, id) => {
      if (pokemon.isMovingToTarget) {
        this.updateTileMovement(pokemon, delta);
      }
      pokemon.setDepth(3 + (pokemon.y / 1000));
    });
  }

  updateTileMovement(pokemon, delta) {
    const now = Date.now();
    const elapsed = now - pokemon.moveStartTime;
    const progress = Math.min(elapsed / pokemon.moveDuration, 1);
    
    if (progress >= 1) {
      pokemon.setPosition(pokemon.targetX, pokemon.targetY);
      pokemon.currentTileX = Math.round(pokemon.targetX / this.tileSize);
      pokemon.currentTileY = Math.round(pokemon.targetY / this.tileSize);
      this.stopTileMovement(pokemon);
    } else {
      const startX = pokemon.currentTileX * this.tileSize;
      const startY = pokemon.currentTileY * this.tileSize;
      
      const currentX = startX + (pokemon.targetX - startX) * progress;
      const currentY = startY + (pokemon.targetY - startY) * progress;
      
      pokemon.setPosition(currentX, currentY);
      pokemon.moveProgress = progress;
    }
  }

  removeOverworldPokemon(id) {
    const pokemon = this.overworldPokemon.get(id);
    if (pokemon) {
      console.log(`🗑️ [OverworldPokemonManager] Suppression Pokémon ${id}`);
      
      if (pokemon.anims && pokemon.anims.isPlaying) {
        pokemon.anims.stop();
      }
      
      if (pokemon.colliders) {
        pokemon.colliders.forEach(collider => {
          try { collider.destroy(); } catch(e) {}
        });
      }
      
      try { pokemon.destroy(); } catch(e) {}
      this.overworldPokemon.delete(id);
    }
  }

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

  handlePokemonSpawnRequest(data) {
    const { id, x, y } = data;
    
    console.log(`🎯 [OverworldPokemonManager] Spawn request ${id} à (${x}, ${y})`);
    
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

  handlePokemonMoveRequest(data) {
    const { id, fromX, fromY, toX, toY, direction } = data;
    
    console.log(`🚀 [OverworldPokemonManager] Move request ${id}: (${fromX},${fromY}) → (${toX},${toY})`);
    
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

  async syncAllOverworldPokemon(pokemonList) {
    console.log(`🔄 [OverworldPokemonManager] Synchronisation de ${pokemonList.length} Pokémon`);
    
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

  debugOverworldPokemon() {
    console.log(`🔍 [OverworldPokemonManager] === DEBUG TILE PAR TILE ===`);
    console.log(`📊 Pokémon actifs: ${this.overworldPokemon.size}`);
    console.log(`🎨 Sprites chargés: ${this.loadedSprites.size}`);
    console.log(`🛡️ Collision layers: ${this.scene.collisionLayers?.length || 0}`);
    console.log(`📏 Taille tile: ${this.tileSize}px`);
    console.log(`⚡ Vitesse mouvement: ${this.moveSpeed}px/s`);
    console.log(`🎮 Système: TILE PAR TILE avec CONFIG MOUVEMENT`);
    console.log(`🎬 Support animations: Walk-Anim, Swing-Anim`);
    
    this.overworldPokemon.forEach((pokemon, id) => {
      const isMoving = pokemon.isMovingToTarget;
      const currentTile = `(${pokemon.currentTileX}, ${pokemon.currentTileY})`;
      const targetTile = `(${Math.round(pokemon.targetX / this.tileSize)}, ${Math.round(pokemon.targetY / this.tileSize)})`;
      const spawnTile = `(${pokemon.spawnTileX}, ${pokemon.spawnTileY})`;
      const moveProgress = isMoving ? `${(pokemon.moveProgress * 100).toFixed(1)}%` : 'N/A';
      const distanceFromSpawn = Math.abs(pokemon.currentTileX - pokemon.spawnTileX) + Math.abs(pokemon.currentTileY - pokemon.spawnTileY);
      
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
  }

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

  debugCheckTile(tileX, tileY) {
    const canMove = this.canMoveToTile(null, tileX, tileY);
    const pixelX = tileX * this.tileSize;
    const pixelY = tileY * this.tileSize;
    
    console.log(`🧪 [DEBUG] Tile (${tileX}, ${tileY}) à (${pixelX}, ${pixelY}): ${canMove ? 'LIBRE' : 'BLOQUÉE'}`);
    
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

  getRandomTileInMovementZone(pokemon) {
    if (!pokemon.spawnTileX || !pokemon.spawnTileY) {
      return null;
    }
    
    const attempts = 20;
    const radius = pokemon.movementRadius;
    
    for (let i = 0; i < attempts; i++) {
      const deltaX = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
      const deltaY = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
      
      const targetTileX = pokemon.spawnTileX + deltaX;
      const targetTileY = pokemon.spawnTileY + deltaY;
      
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
  
  moveRandomlyInZone(pokemon) {
    const randomTile = this.getRandomTileInMovementZone(pokemon);
    
    if (randomTile) {
      console.log(`🎲 [OverworldPokemonManager] ${pokemon.name} mouvement aléatoire vers (${randomTile.tileX}, ${randomTile.tileY})`);
      return this.startTileMovement(pokemon, randomTile.pixelX, randomTile.pixelY);
    }
    
    return false;
  }
  
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
    console.log(`Légende: 🟢 = spawn, ⬜ = libre, 🟥 = bloqué, 🟡 = occupé`);
    
    for (let y = centerY - radius; y <= centerY + radius; y++) {
      let row = `${y.toString().padStart(2, '0')}: `;
      for (let x = centerX - radius; x <= centerX + radius; x++) {
        if (x === centerX && y === centerY) {
          row += '🟢';
        } else if (this.isTileOccupiedByPokemon(x, y)) {
          row += '🟡';
        } else if (this.canMoveToTile(pokemon, x, y)) {
          row += '⬜';
        } else {
          row += '🟥';
        }
      }
      console.log(row);
    }
  }

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

  getPokemonOnTile(tileX, tileY) {
    return Array.from(this.overworldPokemon.values()).filter(pokemon => 
      pokemon.currentTileX === tileX && pokemon.currentTileY === tileY
    );
  }

  isTileOccupiedByPokemon(tileX, tileY) {
    return this.getPokemonOnTile(tileX, tileY).length > 0;
  }

  getNearestFreeTile(centerTileX, centerTileY, maxRadius = 3) {
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
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
    
    return null;
  }
}
