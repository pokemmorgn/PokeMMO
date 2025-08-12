// Dans NpcSpriteManager.js - Version simplifiée avec SpriteUtils

import { SpriteUtils } from '../utils/SpriteUtils.js';

export class NpcSpriteManager {
  constructor(scene) {
    this.scene = scene;
    this.isInitialized = false;
    
    // ✅ Cache des sprites chargés
    this.loadedSprites = new Set();
    this.loadingSprites = new Map();
    this.failedSprites = new Set();
    this.spriteStructures = new Map();
    this.activeLoadHandlers = new Map();
    
    // ✅ Configuration simplifiée
    this.config = {
      spritePath: '/assets/npc/',
      spriteExtension: '.png',
      pokemonSpritePath: '/assets/pokemon/',
      enablePokemonSprites: true,
      fallbackSprite: 'npc_default',
      defaultFrame: 0
    };
    
    // ✅ Statistiques
    this.stats = {
      totalRequested: 0,
      successfullyLoaded: 0,
      failed: 0,
      cached: 0,
      fallbacksUsed: 0,
      pokemonSpritesLoaded: 0,
      pokemonStructuresFromJson: 0
    };
    
    console.log('[NpcSpriteManager] 🎭 Créé avec SpriteUtils direct');
  }

  // ✅ INITIALISATION SIMPLE
  async initialize() {
    if (this.isInitialized) {
      console.log('[NpcSpriteManager] ⚠️ Déjà initialisé');
      return this;
    }
    
    console.log('[NpcSpriteManager] 🚀 === INITIALISATION AVEC SPRITEUTILS ===');
    
    if (!this.scene || !this.scene.load) {
      console.error('[NpcSpriteManager] ❌ Scène non prête');
      return this;
    }
    
    // ✅ Charger sprite-sizes.json via SpriteUtils
    if (this.config.enablePokemonSprites) {
      console.log('[NpcSpriteManager] 📋 Chargement SpriteUtils...');
      await SpriteUtils.loadSpriteSizes();
      console.log('[NpcSpriteManager] ✅ SpriteUtils chargé');
    }
    
    // ✅ Créer le fallback
    this.createImmediateFallback();
    
    this.isInitialized = true;
    console.log('[NpcSpriteManager] ✅ Initialisé avec SpriteUtils');
    
    return this;
  }

  // ✅ MÉTHODE PRINCIPALE SIMPLIFIÉE
  async loadNpcSprite(spriteKey) {
    console.log(`[NpcSpriteManager] 📥 === CHARGEMENT "${spriteKey}" ===`);
    
    this.stats.totalRequested++;
    
    // ✅ Vérifier cache
    if (this.isSpriteCached(spriteKey)) {
      console.log(`[NpcSpriteManager] ⚡ En cache: ${spriteKey}`);
      this.stats.cached++;
      return { success: true, spriteKey, fromCache: true };
    }
    
    // ✅ Vérifier si en cours
    if (this.loadingSprites.has(spriteKey)) {
      return await this.loadingSprites.get(spriteKey);
    }
    
    // ✅ Vérifier si échec
    if (this.failedSprites.has(spriteKey)) {
      return this.getFallbackResult(spriteKey);
    }
    
    // ✅ Détecter le type et charger
    const spriteType = this.detectSpriteType(spriteKey);
    
    let loadingPromise;
    if (spriteType.type === 'pokemon') {
      loadingPromise = this.loadPokemonSpriteWithSpriteUtils(spriteKey, spriteType);
    } else {
      loadingPromise = this.loadNpcSpriteClassic(spriteKey);
    }
    
    this.loadingSprites.set(spriteKey, loadingPromise);
    
    try {
      const result = await loadingPromise;
      this.loadingSprites.delete(spriteKey);
      return result;
    } catch (error) {
      console.error(`[NpcSpriteManager] ❌ Erreur ${spriteKey}:`, error);
      this.loadingSprites.delete(spriteKey);
      this.failedSprites.add(spriteKey);
      this.stats.failed++;
      return this.getFallbackResult(spriteKey);
    }
  }

  // ✅ NOUVELLE MÉTHODE : Chargement Pokémon avec SpriteUtils
  async loadPokemonSpriteWithSpriteUtils(spriteKey, spriteInfo) {
    console.log(`[NpcSpriteManager] 🐾 === CHARGEMENT POKÉMON AVEC SPRITEUTILS ===`);
    console.log(`[NpcSpriteManager] 🎯 Pokémon ID: ${spriteInfo.pokemonId}, Animation: ${spriteInfo.animationType}`);
    
    try {
      // ✅ Mapper animation vers fichier
      const animationFileMap = {
        'walk': 'Walk-Anim.png',
        'move': 'Walk-Anim.png',
        'swing': 'Swing-Anim.png',
        'attack': 'Swing-Anim.png',
        'icon': 'icons.png'
      };
      
      const animationFile = animationFileMap[spriteInfo.animationType] || 'Walk-Anim.png';
      console.log(`[NpcSpriteManager] 📁 Fichier: ${animationFile}`);
      
      // ✅ Construire le chemin
      const paddedId = spriteInfo.pokemonId.toString().padStart(3, '0');
      const pokemonSpritePath = `${this.config.pokemonSpritePath}${paddedId}/${animationFile}`;
      console.log(`[NpcSpriteManager] 📁 Chemin: ${pokemonSpritePath}`);
      
      // ✅ CHARGER AVEC SPRITEUTILS COMME OVERWORLDPOKEMONMANAGER
      console.log(`[NpcSpriteManager] 📋 Utilisation SpriteUtils.loadPokemonSpriteStructure...`);
      
      const structure = await SpriteUtils.loadPokemonSpriteStructure(
        spriteInfo.pokemonId, 
        animationFile, 
        this.scene
      );
      
      console.log(`[NpcSpriteManager] ✅ Structure SpriteUtils: ${structure.name}`);
      this.stats.pokemonStructuresFromJson++;
      
      // ✅ Charger le spritesheet avec la structure correcte
      await this.loadPokemonSpriteSheet(spriteKey, pokemonSpritePath, structure);
      
      // ✅ Stocker la structure
      this.spriteStructures.set(spriteKey, {
        ...structure,
        pokemonId: spriteInfo.pokemonId,
        animationType: spriteInfo.animationType,
        animationFile,
        isPokemon: true,
        source: 'spriteutils-json'
      });
      
      this.loadedSprites.add(spriteKey);
      this.stats.successfullyLoaded++;
      this.stats.pokemonSpritesLoaded++;
      
      console.log(`[NpcSpriteManager] ✅ Pokémon sprite chargé: ${spriteKey}`);
      
      return {
        success: true,
        spriteKey,
        fromCache: false,
        path: pokemonSpritePath,
        isSpriteSheet: true,
        structure,
        isPokemon: true,
        pokemonInfo: spriteInfo
      };
      
    } catch (error) {
      console.error(`[NpcSpriteManager] ❌ Erreur Pokémon ${spriteKey}:`, error);
      throw error;
    }
  }

  // ✅ NOUVELLE MÉTHODE : Chargement spritesheet Pokémon
  async loadPokemonSpriteSheet(spriteKey, spritePath, structure) {
    return new Promise((resolve, reject) => {
      console.log(`[NpcSpriteManager] 🎞️ Chargement spritesheet: ${spriteKey}`);
      console.log(`[NpcSpriteManager] 📊 Structure: ${structure.frameWidth}x${structure.frameHeight} (${structure.cols}x${structure.rows})`);
      
      const timeoutId = setTimeout(() => {
        this.cleanupLoadHandlers(spriteKey);
        reject(new Error(`Timeout loading spritesheet: ${spriteKey}`));
      }, 8000);
      
      const onSuccess = () => {
        clearTimeout(timeoutId);
        this.cleanupLoadHandlers(spriteKey);
        console.log(`[NpcSpriteManager] ✅ Spritesheet chargé: ${spriteKey}`);
        resolve();
      };
      
      const onError = (fileObj) => {
        if (fileObj.key === spriteKey) {
          clearTimeout(timeoutId);
          this.cleanupLoadHandlers(spriteKey);
          reject(new Error(`Failed to load spritesheet: ${spriteKey}`));
        }
      };
      
      this.activeLoadHandlers.set(spriteKey, { onSuccess, onError });
      
      this.scene.load.once('filecomplete-spritesheet-' + spriteKey, onSuccess);
      this.scene.load.once('loaderror', onError);
      
      try {
        // ✅ Charger avec les bonnes dimensions de SpriteUtils
        this.scene.load.spritesheet(spriteKey, spritePath, {
          frameWidth: structure.frameWidth,
          frameHeight: structure.frameHeight
        });
        
        if (!this.scene.load.isLoading()) {
          this.scene.load.start();
        }
        
      } catch (error) {
        clearTimeout(timeoutId);
        this.cleanupLoadHandlers(spriteKey);
        reject(error);
      }
    });
  }

  // ✅ MÉTHODE EXISTANTE : Détection du type de sprite
  detectSpriteType(spriteKey) {
    console.log(`[NpcSpriteManager] 🔍 Détection type: "${spriteKey}"`);
    
    // Pattern: pokemon:ID:animation
    const pokemonPatternMatch = spriteKey.match(/^pokemon:(\d+):(\w+)$/i);
    if (pokemonPatternMatch) {
      return {
        type: 'pokemon',
        pokemonId: parseInt(pokemonPatternMatch[1]),
        animationType: pokemonPatternMatch[2].toLowerCase(),
        originalKey: spriteKey,
        format: 'structured'
      };
    }
    
    // Pattern: pokemonXXX_animation
    const pokemonNumericMatch = spriteKey.match(/^pokemon(\d+)_(\w+)$/i);
    if (pokemonNumericMatch) {
      return {
        type: 'pokemon',
        pokemonId: parseInt(pokemonNumericMatch[1]),
        animationType: pokemonNumericMatch[2].toLowerCase(),
        originalKey: spriteKey,
        format: 'numeric'
      };
    }
    
    // Pattern: pokemonXXX
    const pokemonSimpleMatch = spriteKey.match(/^pokemon(\d+)$/i);
    if (pokemonSimpleMatch) {
      return {
        type: 'pokemon',
        pokemonId: parseInt(pokemonSimpleMatch[1]),
        animationType: 'walk',
        originalKey: spriteKey,
        format: 'simple'
      };
    }
    
    return {
      type: 'npc',
      originalKey: spriteKey,
      format: 'classic'
    };
  }

  // ✅ MÉTHODE CLASSIQUE : Chargement NPC normal
  async loadNpcSpriteClassic(spriteKey) {
    // Votre logique existante pour NPCs classiques...
    console.log(`[NpcSpriteManager] 🎭 Chargement NPC classique: ${spriteKey}`);
    
    const hasExtension = spriteKey.endsWith('.png');
    const spritePath = hasExtension 
      ? `${this.config.spritePath}${spriteKey}`
      : `${this.config.spritePath}${spriteKey}${this.config.spriteExtension}`;
    
    // Charger comme image simple par défaut
    await this.loadAsSimpleImage(spriteKey, spritePath);
    
    this.loadedSprites.add(spriteKey);
    this.stats.successfullyLoaded++;
    
    return {
      success: true,
      spriteKey,
      fromCache: false,
      path: spritePath,
      isSpriteSheet: false,
      isPokemon: false
    };
  }

  // ✅ MÉTHODE UTILITAIRE : Chargement image simple
  async loadAsSimpleImage(spriteKey, spritePath) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.cleanupLoadHandlers(spriteKey);
        reject(new Error(`Timeout loading image: ${spriteKey}`));
      }, 5000);
      
      const onSuccess = () => {
        clearTimeout(timeoutId);
        this.cleanupLoadHandlers(spriteKey);
        resolve();
      };
      
      const onError = () => {
        clearTimeout(timeoutId);
        this.cleanupLoadHandlers(spriteKey);
        reject(new Error(`Failed to load image: ${spriteKey}`));
      };
      
      this.activeLoadHandlers.set(spriteKey, { onSuccess, onError });
      
      this.scene.load.once('filecomplete-image-' + spriteKey, onSuccess);
      this.scene.load.once('loaderror', onError);
      
      this.scene.load.image(spriteKey, spritePath);
      
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }

  // ✅ INFO SPRITESHEET POUR FRAME 0 UNIQUEMENT
  getSpriteSheetInfo(spriteKey) {
    const structure = this.spriteStructures.get(spriteKey);
    
    if (!structure) {
      return {
        isSpriteSheet: false,
        frameCount: 1,
        defaultFrame: 0,
        isPokemon: false
      };
    }
    
    return {
      isSpriteSheet: true,
      structure: structure,
      frameCount: structure.totalFrames,
      defaultFrame: 0, // ✅ TOUJOURS FRAME 0
      frameWidth: structure.frameWidth,
      frameHeight: structure.frameHeight,
      cols: structure.cols,
      rows: structure.rows,
      isPokemon: structure.isPokemon || false,
      pokemonId: structure.pokemonId || null,
      animationType: structure.animationType || null
    };
  }

  // ✅ MÉTHODES UTILITAIRES
  async getSpriteKeyToUse(requestedSprite) {
    if (!requestedSprite) {
      return this.config.fallbackSprite;
    }
    
    try {
      const result = await this.loadNpcSprite(requestedSprite);
      
      if (result.success) {
        const isAvailable = await this.validateSpriteAvailability(result.spriteKey);
        return isAvailable ? result.spriteKey : this.config.fallbackSprite;
      } else {
        return this.config.fallbackSprite;
      }
    } catch (error) {
      console.error(`[NpcSpriteManager] ❌ Erreur getSpriteKeyToUse:`, error);
      return this.config.fallbackSprite;
    }
  }

  createImmediateFallback() {
    const key = this.config.fallbackSprite;
    
    if (this.scene.textures.exists(key)) {
      this.loadedSprites.add(key);
      return;
    }
    
    try {
      const graphics = this.scene.add.graphics();
      
      graphics.fillStyle(0x4169E1, 1.0);
      graphics.fillRoundedRect(0, 8, 32, 16, 2);
      
      graphics.fillStyle(0xFFDBB0, 1.0);
      graphics.fillCircle(16, 12, 8);
      
      graphics.fillStyle(0x000000, 1.0);
      graphics.fillCircle(13, 10, 2);
      graphics.fillCircle(19, 10, 2);
      
      graphics.generateTexture(key, 32, 32);
      graphics.destroy();
      
      this.loadedSprites.add(key);
      console.log('[NpcSpriteManager] ✅ Fallback créé');
      
    } catch (error) {
      console.error('[NpcSpriteManager] ❌ Erreur fallback:', error);
    }
  }

  // ✅ MÉTHODES UTILITAIRES SIMPLIFIÉES
  isSpriteCached(spriteKey) {
    return this.scene.textures.exists(spriteKey) && this.loadedSprites.has(spriteKey);
  }

  getFallbackResult(originalSpriteKey) {
    console.log(`[NpcSpriteManager] 🔄 Fallback: ${originalSpriteKey}`);
    this.stats.fallbacksUsed++;
    
    return {
      success: false,
      spriteKey: this.config.fallbackSprite,
      originalSpriteKey,
      isFallback: true
    };
  }

  async validateSpriteAvailability(spriteKey, maxWaitMs = 1000) {
    if (this.scene.textures.exists(spriteKey)) {
      return true;
    }
    
    const startTime = Date.now();
    return new Promise((resolve) => {
      const check = () => {
        if (this.scene.textures.exists(spriteKey)) {
          resolve(true);
        } else if (Date.now() - startTime >= maxWaitMs) {
          resolve(false);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  cleanupLoadHandlers(spriteKey) {
    if (this.activeLoadHandlers && this.activeLoadHandlers.has(spriteKey)) {
      const handlers = this.activeLoadHandlers.get(spriteKey);
      try {
        this.scene.load.off('filecomplete-image-' + spriteKey, handlers.onSuccess);
        this.scene.load.off('filecomplete-spritesheet-' + spriteKey, handlers.onSuccess);
        this.scene.load.off('loaderror', handlers.onError);
      } catch (error) {
        // Ignore cleanup errors
      }
      this.activeLoadHandlers.delete(spriteKey);
    }
  }

  // ✅ DEBUG
  debugStats() {
    console.log('[NpcSpriteManager] 📊 === STATS AVEC SPRITEUTILS ===');
    console.table(this.stats);
    console.log('✅ SpriteUtils loaded:', SpriteUtils.spriteSizesLoaded);
    console.log('🐾 Sprites Pokémon:', Array.from(this.loadedSprites).filter(key => 
      this.spriteStructures.get(key)?.isPokemon
    ));
  }

  destroy() {
    if (this.activeLoadHandlers) {
      this.activeLoadHandlers.forEach((handlers, spriteKey) => {
        this.cleanupLoadHandlers(spriteKey);
      });
      this.activeLoadHandlers.clear();
    }
    
    this.loadingSprites.clear();
    this.loadedSprites.clear();
    this.failedSprites.clear();
    this.spriteStructures.clear();
    
    this.isInitialized = false;
    this.scene = null;
  }
}

// Debug global
window.debugNpcSpriteManager = function() {
  const scene = window.game?.scene?.getScenes(true)?.[0];
  const manager = scene?.npcSpriteManager;
  
  if (manager) {
    manager.debugStats();
    return manager;
  } else {
    console.error('Manager non trouvé');
    return null;
  }
};

console.log('✅ NpcSpriteManager SIMPLIFIÉ avec SpriteUtils chargé!');
