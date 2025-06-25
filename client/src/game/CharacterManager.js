// client/src/game/CharacterManager.js
// ✅ Système de gestion des personnages avec mc_whitebrown

export class CharacterManager {
  constructor(scene) {
    this.scene = scene;
    this.defaultCharacter = 'brendan';
    this.characterDefinitions = new Map();
    this.loadedCharacters = new Set();
    
    console.log(`🎭 [CharacterManager] Initialisé pour ${scene.scene.key}`);
    
    // Définir le personnage Brendan
    this.initializeCharacterDefinitions();
  }

  // ✅ Configuration du personnage Brendan
  initializeCharacterDefinitions() {
    console.log(`📋 [CharacterManager] Configuration Brendan...`);
    
    this.defineCharacter('brendan', {
      name: 'Brendan',
      spriteKey: 'BrendanWalking',
      spritePath: 'assets/characters/Brendan/Brendan_Walking.png',
      frameConfig: { frameWidth: 32, frameHeight: 32 }, // 4x4 = 128x128 total
      animations: {
        idle: {
          down: [0],   // Premier frame ligne du bas (idle)
          left: [4],   // Premier frame ligne gauche (idle)
          right: [8],  // Premier frame ligne droite (idle)
          up: [12]     // Premier frame ligne du haut (idle)
        },
        walk: {
          down: { start: 0, end: 3 },   // Ligne du bas: 4 frames (0-3)
          left: { start: 4, end: 7 },   // Ligne gauche: 4 frames (4-7)
          right: { start: 8, end: 11 }, // Ligne droite: 4 frames (8-11)
          up: { start: 12, end: 15 }    // Ligne du haut: 4 frames (12-15)
        }
      },
      defaultFrame: 0, // Frame idle par défaut (down)
      animConfig: {
        walkFrameRate: 10,
        idleFrameRate: 1
      }
    });

    console.log(`✅ [CharacterManager] Brendan défini`);
  }

  // ✅ Définir un personnage
  defineCharacter(characterId, definition) {
    this.characterDefinitions.set(characterId, {
      id: characterId,
      loaded: false,
      ...definition
    });
  }

  // ✅ Créer un sprite pour un personnage
 // ✅ Créer un sprite pour un personnage
async createCharacterSprite(characterId, x, y) {
  // Pour l'instant, toujours utiliser Brendan
  const actualCharacterId = 'brendan';
  
  console.log(`🎭 [CharacterManager] Création sprite pour ${actualCharacterId} à (${x}, ${y})`);

  // ✅ FORCER LE CHARGEMENT ET ATTENDRE
  const loaded = await this.loadCharacter(actualCharacterId);
  if (!loaded) {
    console.error(`❌ [CharacterManager] Impossible de charger ${actualCharacterId}`);
    return this.createPlaceholderSprite(x, y, actualCharacterId);
  }

  const definition = this.characterDefinitions.get(actualCharacterId);
  
  // ✅ VÉRIFIER QUE LA TEXTURE EXISTE VRAIMENT
  if (!this.scene.textures.exists(definition.spriteKey)) {
    console.error(`❌ [CharacterManager] Texture ${definition.spriteKey} n'existe pas !`);
    return this.createPlaceholderSprite(x, y, actualCharacterId);
  }

  // ✅ VÉRIFIER QUE LES ANIMATIONS EXISTENT
  const idleAnimKey = `${actualCharacterId}_idle_down`;
  if (!this.scene.anims.exists(idleAnimKey)) {
    console.error(`❌ [CharacterManager] Animation ${idleAnimKey} n'existe pas !`);
    // Créer les animations maintenant
    this.createCharacterAnimations(actualCharacterId);
  }

  // Créer le sprite avec l'idle par défaut
  const sprite = this.scene.physics.add.sprite(x, y, definition.spriteKey, definition.defaultFrame);

  // ✅ VÉRIFIER QUE LE SPRITE EST VALIDE
  if (!sprite || typeof sprite.setOrigin !== 'function') {
    console.error(`❌ [CharacterManager] Sprite invalide créé pour ${actualCharacterId}`);
    return this.createPlaceholderSprite(x, y, actualCharacterId);
  }

  sprite.setOrigin(0.5, 1);
  sprite.setScale(1);
  sprite.setDepth(4.5);

  // ✅ VÉRIFIER QUE LE BODY EXISTE
  if (sprite.body) {
    sprite.body.setCollideWorldBounds(true);
    sprite.body.setSize(16, 16);
    sprite.body.setOffset(8, 16);
  }

  // Ajouter les métadonnées du personnage
  sprite.characterId = actualCharacterId;
  sprite.characterDefinition = definition;
  sprite.lastDirection = 'down';
  sprite.isMoving = false;

  console.log(`✅ [CharacterManager] Sprite créé pour ${actualCharacterId}`, {
    hasSetVisible: typeof sprite.setVisible === 'function',
    hasPlay: typeof sprite.play === 'function',
    characterId: sprite.characterId
  });
  
  return sprite;
}

  // ✅ Charger les assets d'un personnage
  async loadCharacter(characterId) {
    if (this.loadedCharacters.has(characterId)) {
      console.log(`✅ [CharacterManager] Personnage ${characterId} déjà chargé`);
      return true;
    }

    const definition = this.characterDefinitions.get(characterId);
    if (!definition) {
      console.warn(`⚠️ [CharacterManager] Personnage ${characterId} non défini`);
      return false;
    }

    console.log(`📦 [CharacterManager] Chargement de ${characterId}...`);

    try {
      // Vérifier si le spritesheet est déjà chargé
      if (!this.scene.textures.exists(definition.spriteKey)) {
        console.log(`📥 [CharacterManager] Chargement spritesheet: ${definition.spritePath}`);
        
        // Charger le spritesheet
        this.scene.load.spritesheet(
          definition.spriteKey,
          definition.spritePath,
          definition.frameConfig
        );

        // Attendre que le chargement soit terminé
        await new Promise((resolve, reject) => {
          this.scene.load.once('complete', resolve);
          this.scene.load.once('loaderror', (file) => {
            console.error(`❌ [CharacterManager] Erreur chargement ${file.src}`);
            reject(new Error(`Impossible de charger ${definition.spritePath}`));
          });
          this.scene.load.start();
        });
      }

      // Créer les animations pour ce personnage
      this.createCharacterAnimations(characterId);
      
      this.loadedCharacters.add(characterId);
      definition.loaded = true;
      
      console.log(`✅ [CharacterManager] Personnage ${characterId} chargé avec succès`);
      // ✅ VÉRIFIER QUE LA TEXTURE EST BIEN CHARGÉE
console.log(`🔍 [CharacterManager] Texture ${definition.spriteKey} exists:`, this.scene.textures.exists(definition.spriteKey));
if (this.scene.textures.exists(definition.spriteKey)) {
  const texture = this.scene.textures.get(definition.spriteKey);
  console.log(`🔍 [CharacterManager] Texture info:`, {
    key: texture.key,
    frames: texture.frameTotal,
    source: texture.source
  });
}
      return true;

    } catch (error) {
      console.error(`❌ [CharacterManager] Erreur lors du chargement de ${characterId}:`, error);
      return false;
    }
  }

  // ✅ Créer les animations pour un personnage
  createCharacterAnimations(characterId) {
    const definition = this.characterDefinitions.get(characterId);
    if (!definition) return;

    console.log(`🎬 [CharacterManager] Création animations pour ${characterId}`);

    const spriteKey = definition.spriteKey;
    const animations = definition.animations;
    const animConfig = definition.animConfig;

    // Créer les animations idle
    Object.entries(animations.idle).forEach(([direction, frames]) => {
      const animKey = `${characterId}_idle_${direction}`;
      
      if (!this.scene.anims.exists(animKey)) {
        this.scene.anims.create({
          key: animKey,
          frames: frames.map(frame => ({ key: spriteKey, frame })),
          frameRate: animConfig.idleFrameRate,
          repeat: 0
        });
        
        console.log(`  ✅ Animation créée: ${animKey}`);
      }
    });

    // Créer les animations walk
    Object.entries(animations.walk).forEach(([direction, config]) => {
      const animKey = `${characterId}_walk_${direction}`;
      
      if (!this.scene.anims.exists(animKey)) {
        this.scene.anims.create({
          key: animKey,
          frames: this.scene.anims.generateFrameNumbers(spriteKey, config),
          frameRate: animConfig.walkFrameRate,
          repeat: -1
        });
        
        console.log(`  ✅ Animation créée: ${animKey}`);
      }
    });
  }

  // ✅ Créer un sprite placeholder si le chargement échoue
  createPlaceholderSprite(x, y, characterId) {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xff0000);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('player_placeholder', 32, 32);
    graphics.destroy();
    
    const sprite = this.scene.add.sprite(x, y, 'player_placeholder');
    sprite.setOrigin(0.5, 1);
    sprite.setScale(1);
    sprite.setDepth(5);
    sprite.characterId = characterId;
    
    console.log(`🎭 [CharacterManager] Placeholder créé pour ${characterId}`);
    return sprite;
  }

  // ✅ Jouer une animation sur un sprite
  playAnimation(sprite, animationType, direction) {
    if (!sprite || !sprite.characterId) {
      console.warn(`⚠️ [CharacterManager] Sprite invalide pour animation`);
      return false;
    }

    const characterId = sprite.characterId;
    const animKey = `${characterId}_${animationType}_${direction}`;

    if (this.scene.anims.exists(animKey)) {
      if (sprite.anims.currentAnim?.key !== animKey) {
        sprite.play(animKey, true);
        return true;
      }
    } else {
      console.warn(`⚠️ [CharacterManager] Animation ${animKey} introuvable`);
    }

    return false;
  }

  // ✅ Obtenir les infos d'un personnage
  getCharacterInfo(characterId) {
    return this.characterDefinitions.get(characterId) || null;
  }

  // ✅ Debug
  debugCharacterSystem() {
    console.log(`🔍 [CharacterManager] === DEBUG SYSTÈME PERSONNAGES ===`);
    console.log(`🎭 Personnage par défaut: ${this.defaultCharacter}`);
    console.log(`📊 Personnages définis: ${this.characterDefinitions.size}`);
    console.log(`✅ Personnages chargés: ${this.loadedCharacters.size}`);
    
    this.characterDefinitions.forEach((def, id) => {
      const spriteLoaded = this.scene.textures.exists(def.spriteKey);
      console.log(`  🎭 ${id}: sprite=${spriteLoaded}`);
    });
    
    console.log(`===============================================`);
  }

  // ✅ Nettoyer les ressources
  destroy() {
    console.log(`🧹 [CharacterManager] Nettoyage...`);
    this.characterDefinitions.clear();
    this.loadedCharacters.clear();
    this.scene = null;
    console.log(`✅ [CharacterManager] Nettoyage terminé`);
  }
}
