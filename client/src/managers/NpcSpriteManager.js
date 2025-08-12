// client/src/managers/NpcSpriteManager.js
// ✅ CORRECTION: Gestion proper des spritesheets PNG réels

import { SpriteUtils } from '../utils/SpriteUtils.js';

export class NpcSpriteManager {
  constructor(scene) {
    this.scene = scene;
    this.isInitialized = false;
    
    // ✅ Cache des sprites chargés
    this.loadedSprites = new Set();
    this.loadingSprites = new Map(); // sprite -> Promise
    this.failedSprites = new Set();
    
    // ✅ Cache des structures sprite sheets (NPC + Pokémon)
    this.spriteStructures = new Map(); // spriteKey -> structure
    
    // ✅ Gestion des handlers actifs pour nettoyage
    this.activeLoadHandlers = new Map();
    
    // ✅ Configuration étendue
    this.config = {
      // Sprites NPC classiques
      spritePath: '/assets/npc/',
      spriteExtension: '.png',
      
      // ✅ NOUVEAU: Support Pokémon
      pokemonSpritePath: '/assets/pokemon/',
      pokemonSpriteFiles: ['Walk-Anim.png', 'Swing-Anim.png'], // Fichiers d'animation supportés
      pokemonIconFile: 'icons.png', // Fichier d'icônes
      enablePokemonSprites: true,
      
      fallbackSprite: 'npc_default',
      enableDebugLogs: true,
      maxRetries: 2,
      retryDelay: 1000,
      defaultFrame: 0,
      detectSpriteSheets: true,
      createFallbackAsSheet: false,
      fallbackSheetStructure: {
        frameWidth: 32,
        frameHeight: 32,
        cols: 4,
        rows: 4,
        name: 'Fallback Sheet (4x4)'
      }
    };
    
    // ✅ Statistiques étendues
    this.stats = {
      totalRequested: 0,
      successfullyLoaded: 0,
      failed: 0,
      cached: 0,
      fallbacksUsed: 0,
      spriteSheetsDetected: 0,
      simpleImagesLoaded: 0,
      fallbackCreated: 0,
      // ✅ NOUVEAU: Stats Pokémon
      pokemonSpritesLoaded: 0,
      pokemonIconsLoaded: 0,
      pokemonStructuresFromJson: 0
    };
    
    console.log('[NpcSpriteManager] 🎭 Créé avec support Pokémon sprites');
  }

  // ✅ INITIALISATION
  async initialize() {
    if (this.isInitialized) {
      console.log('[NpcSpriteManager] ⚠️ Déjà initialisé');
      return this;
    }
    
    console.log('[NpcSpriteManager] 🚀 === INITIALISATION NPC + POKÉMON ===');
    
    if (!this.scene || !this.scene.load) {
      console.error('[NpcSpriteManager] ❌ Scène non prête pour chargement');
      return this;
    }
    
    // ✅ Charger sprite-sizes.json si activé
    if (this.config.enablePokemonSprites) {
      console.log('[NpcSpriteManager] 📋 Chargement sprite-sizes.json...');
      await SpriteUtils.loadSpriteSizes();
      console.log('[NpcSpriteManager] ✅ sprite-sizes.json chargé');
    }
    
    // ✅ Créer le fallback immédiatement
    this.createImmediateFallback();
    
    this.isInitialized = true;
    console.log('[NpcSpriteManager] ✅ Initialisé avec support Pokémon');
    
    return this;
  }

  // ✅ NOUVELLE MÉTHODE : Créer fallback immédiat sans async
  createImmediateFallback() {
    console.log('[NpcSpriteManager] ⚡ Création fallback immédiat...');
    
    const key = this.config.fallbackSprite;
    
    if (this.scene.textures.exists(key)) {
      console.log('[NpcSpriteManager] ✅ Fallback déjà existant');
      this.loadedSprites.add(key);
      return;
    }
    
    try {
      // ✅ Créer une texture simple avec Phaser Graphics
      const graphics = this.scene.add.graphics({ x: 0, y: 0 });
      
      // ✅ Dessiner un NPC simple
      graphics.fillStyle(0x4169E1, 1.0); // Corps bleu
      graphics.fillRoundedRect(0, 8, 32, 16, 2);
      
      graphics.fillStyle(0xFFDBB0, 1.0); // Tête
      graphics.fillCircle(16, 12, 8);
      
      graphics.fillStyle(0x000000, 1.0); // Yeux
      graphics.fillCircle(13, 10, 2);
      graphics.fillCircle(19, 10, 2);
      
      graphics.fillStyle(0xFF4444, 1.0); // Chapeau
      graphics.fillRect(8, 4, 16, 3);
      
      graphics.fillStyle(0x2E8B57, 1.0); // Jambes
      graphics.fillRect(12, 20, 8, 10);
      
      // ✅ Utiliser generateTexture de Graphics (qui fonctionne)
      graphics.generateTexture(key, 32, 32);
      
      // ✅ Nettoyer le graphics
      graphics.destroy();
      
      this.loadedSprites.add(key);
      this.stats.fallbackCreated++;
      
      console.log('[NpcSpriteManager] ✅ Fallback immédiat créé:', key);
      
    } catch (error) {
      console.error('[NpcSpriteManager] ❌ Erreur fallback immédiat:', error);
      // ✅ Fallback ultime : texture colorée simple
      this.createUltimateFallback();
    }
  }

  // ✅ NOUVELLE MÉTHODE : Fallback ultime
  createUltimateFallback() {
    console.log('[NpcSpriteManager] 🚨 Création fallback ultime...');
    
    try {
      const key = this.config.fallbackSprite;
      const graphics = this.scene.add.graphics();
      
      // ✅ Rectangle simple avec couleur
      graphics.fillStyle(0x4169E1, 1.0);
      graphics.fillRect(0, 0, 32, 32);
      
      graphics.fillStyle(0xFFFFFF, 1.0);
      graphics.fillRect(14, 12, 4, 8); // Corps simple
      
      graphics.generateTexture(key, 32, 32);
      graphics.destroy();
      
      this.loadedSprites.add(key);
      this.stats.fallbackCreated++;
      
      console.log('[NpcSpriteManager] ✅ Fallback ultime créé');
      
    } catch (error) {
      console.error('[NpcSpriteManager] ❌ Impossible de créer fallback ultime:', error);
    }
  }

  // ✅ MÉTHODE PRINCIPALE : Chargement spritesheets PNG
async loadNpcSprite(spriteKey) {
    console.log(`[NpcSpriteManager] 📥 === CHARGEMENT SPRITE "${spriteKey}" ===`);
    
    this.stats.totalRequested++;
    
    // ✅ Vérifier si déjà chargé
    if (this.isSpriteCached(spriteKey)) {
      console.log(`[NpcSpriteManager] ⚡ Sprite en cache: ${spriteKey}`);
      this.stats.cached++;
      return { success: true, spriteKey, fromCache: true };
    }
    
    // ✅ Vérifier si déjà en cours de chargement
    if (this.loadingSprites.has(spriteKey)) {
      console.log(`[NpcSpriteManager] ⏳ Sprite en cours de chargement: ${spriteKey}`);
      return await this.loadingSprites.get(spriteKey);
    }
    
    // ✅ Vérifier si déjà en échec
    if (this.failedSprites.has(spriteKey)) {
      console.log(`[NpcSpriteManager] ❌ Sprite déjà en échec: ${spriteKey}`);
      return this.getFallbackResult(spriteKey);
    }
    
    // ✅ NOUVEAU : Détecter le type de sprite (NPC classique vs Pokémon)
    const spriteType = this.detectSpriteType(spriteKey);
    console.log(`[NpcSpriteManager] 🔍 Type détecté: ${spriteType.type} pour "${spriteKey}"`);
    
    // ✅ Choisir la méthode de chargement appropriée
    let loadingPromise;
    
    if (spriteType.type === 'pokemon') {
      loadingPromise = this.performPokemonSpriteLoad(spriteKey, spriteType);
    } else {
      loadingPromise = this.performNpcSpriteLoad(spriteKey);
    }
    
    this.loadingSprites.set(spriteKey, loadingPromise);
    
    try {
      const result = await loadingPromise;
      this.loadingSprites.delete(spriteKey);
      return result;
      
    } catch (error) {
      console.error(`[NpcSpriteManager] ❌ Erreur chargement ${spriteKey}:`, error);
      this.loadingSprites.delete(spriteKey);
      this.failedSprites.add(spriteKey);
      this.stats.failed++;
      return this.getFallbackResult(spriteKey);
    }
  }

 // ✅ MÉTHODE EXISTANTE : Chargement NPC classique (inchangée)
  async performNpcSpriteLoad(spriteKey) {
    return new Promise(async (resolve, reject) => {
      console.log(`[NpcSpriteManager] 🖼️ === CHARGEMENT NPC PNG: ${spriteKey} ===`);
      
      const hasExtension = spriteKey.endsWith('.png') || spriteKey.endsWith('.jpg') || spriteKey.endsWith('.jpeg');
      const spritePath = hasExtension 
        ? `${this.config.spritePath}${spriteKey}`
        : `${this.config.spritePath}${spriteKey}${this.config.spriteExtension}`;
      
      console.log(`[NpcSpriteManager] 📁 Chemin NPC: ${spritePath}`);
      
      try {
        const imageInfo = await this.analyzePngStructure(spritePath, spriteKey);
        
        if (imageInfo.isSpriteSheet) {
          console.log(`[NpcSpriteManager] 🎞️ NPC Spritesheet détecté: ${imageInfo.structure.name}`);
          await this.loadPngAsSpriteSheet(spriteKey, spritePath, imageInfo.structure);
          this.spriteStructures.set(spriteKey, imageInfo.structure);
          this.stats.spriteSheetsDetected++;
        } else {
          console.log(`[NpcSpriteManager] 🖼️ NPC Image simple détectée`);
          await this.loadPngAsSimpleImage(spriteKey, spritePath);
          this.stats.simpleImagesLoaded++;
        }
        
        console.log(`[NpcSpriteManager] ✅ NPC PNG chargé avec succès: ${spriteKey}`);
        this.loadedSprites.add(spriteKey);
        this.stats.successfullyLoaded++;
        
        resolve({
          success: true,
          spriteKey,
          fromCache: false,
          path: spritePath,
          isSpriteSheet: imageInfo.isSpriteSheet,
          structure: imageInfo.isSpriteSheet ? imageInfo.structure : null,
          isPokemon: false
        });
        
      } catch (error) {
        console.error(`[NpcSpriteManager] ❌ Erreur chargement NPC PNG ${spriteKey}:`, error);
        reject(error);
      }
    });
  }
  
   // ✅ NOUVELLE MÉTHODE : Détection du type de sprite
  detectSpriteType(spriteKey) {
    console.log(`[NpcSpriteManager] 🔍 === DÉTECTION TYPE SPRITE: "${spriteKey}" ===`);
    
    // ✅ Pattern 1: pokemon:ID:animation (ex: "pokemon:025:walk")
    const pokemonPatternMatch = spriteKey.match(/^pokemon:(\d+):(\w+)$/i);
    if (pokemonPatternMatch) {
      const pokemonId = parseInt(pokemonPatternMatch[1]);
      const animationType = pokemonPatternMatch[2].toLowerCase();
      
      return {
        type: 'pokemon',
        pokemonId,
        animationType,
        originalKey: spriteKey,
        format: 'structured'
      };
    }
    
    // ✅ Pattern 2: pokemonXXX_animation (ex: "pokemon025_walk", "pokemon025_swing")
    const pokemonNumericMatch = spriteKey.match(/^pokemon(\d+)_(\w+)$/i);
    if (pokemonNumericMatch) {
      const pokemonId = parseInt(pokemonNumericMatch[1]);
      const animationType = pokemonNumericMatch[2].toLowerCase();
      
      return {
        type: 'pokemon',
        pokemonId,
        animationType,
        originalKey: spriteKey,
        format: 'numeric'
      };
    }
    
    // ✅ Pattern 3: Simple pokemonXXX (ex: "pokemon025") -> utilise walk par défaut
    const pokemonSimpleMatch = spriteKey.match(/^pokemon(\d+)$/i);
    if (pokemonSimpleMatch) {
      const pokemonId = parseInt(pokemonSimpleMatch[1]);
      
      return {
        type: 'pokemon',
        pokemonId,
        animationType: 'walk', // Par défaut
        originalKey: spriteKey,
        format: 'simple'
      };
    }
    
    // ✅ Pattern 4: Nom de Pokémon direct (ex: "pikachu", "charizard")
    // TODO: Implémenter un mapping nom -> ID si nécessaire
    
    // ✅ Par défaut: sprite NPC classique
    return {
      type: 'npc',
      originalKey: spriteKey,
      format: 'classic'
    };
  }

  // ✅ NOUVELLE MÉTHODE : Chargement sprite Pokémon
  async performPokemonSpriteLoad(spriteKey, spriteInfo) {
    console.log(`[NpcSpriteManager] 🐾 === CHARGEMENT POKÉMON SPRITE ===`);
    console.log(`[NpcSpriteManager] 🎯 Pokémon ID: ${spriteInfo.pokemonId}, Animation: ${spriteInfo.animationType}`);
    
    try {
      // ✅ Mapper le type d'animation vers le fichier
      const animationFileMap = {
        'walk': 'Walk-Anim.png',
        'move': 'Walk-Anim.png',
        'swing': 'Swing-Anim.png',
        'attack': 'Swing-Anim.png',
        'icon': 'icons.png'
      };
      
      const animationFile = animationFileMap[spriteInfo.animationType] || 'Walk-Anim.png';
      console.log(`[NpcSpriteManager] 📁 Fichier d'animation: ${animationFile}`);
      
      // ✅ Construire le chemin Pokémon
      const paddedId = spriteInfo.pokemonId.toString().padStart(3, '0');
      const pokemonSpritePath = `${this.config.pokemonSpritePath}${paddedId}/${animationFile}`;
      
      console.log(`[NpcSpriteManager] 📁 Chemin Pokémon: ${pokemonSpritePath}`);
      
      // ✅ Obtenir la structure depuis sprite-sizes.json
      let structure = null;
      
      if (SpriteUtils.spriteSizes && SpriteUtils.spriteSizes[spriteInfo.pokemonId]) {
        const pokemonData = SpriteUtils.spriteSizes[spriteInfo.pokemonId];
        
        if (pokemonData[animationFile]) {
          const sizeString = pokemonData[animationFile];
          structure = this.parsePokemonStructureFromJson(sizeString, animationFile, spriteInfo.pokemonId);
          console.log(`[NpcSpriteManager] 📋 Structure JSON trouvée: ${structure.name}`);
          this.stats.pokemonStructuresFromJson++;
        }
      }
      
      // ✅ Si pas de structure JSON, analyser l'image
      if (!structure) {
        console.log(`[NpcSpriteManager] 🔍 Pas de structure JSON, analyse de l'image...`);
        const imageInfo = await this.analyzePngStructure(pokemonSpritePath, spriteKey);
        structure = imageInfo.structure || this.createFallbackPokemonStructure();
      }
      
      // ✅ Charger le sprite Pokémon avec la structure
      if (animationFile === 'icons.png') {
        await this.loadPokemonIcon(spriteKey, pokemonSpritePath, structure, spriteInfo);
        this.stats.pokemonIconsLoaded++;
      } else {
        await this.loadPokemonAnimation(spriteKey, pokemonSpritePath, structure, spriteInfo);
        this.stats.pokemonSpritesLoaded++;
      }
      
      // ✅ Stocker la structure
      this.spriteStructures.set(spriteKey, {
        ...structure,
        pokemonId: spriteInfo.pokemonId,
        animationType: spriteInfo.animationType,
        animationFile,
        isPokemon: true
      });
      
      this.loadedSprites.add(spriteKey);
      this.stats.successfullyLoaded++;
      this.stats.spriteSheetsDetected++;
      
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
      console.error(`[NpcSpriteManager] ❌ Erreur chargement Pokémon ${spriteKey}:`, error);
      throw error;
    }
  }

  // ✅ NOUVELLE MÉTHODE : Parser structure depuis sprite-sizes.json
  parsePokemonStructureFromJson(sizeString, animationFile, pokemonId) {
    console.log(`[NpcSpriteManager] 📋 Parsing structure JSON: ${sizeString} pour ${animationFile}`);
    
    const [width, height] = sizeString.split('x').map(Number);
    
    // ✅ Utiliser la logique de SpriteUtils pour obtenir la structure
    const structure = SpriteUtils.getKnownStructureFromSize(sizeString, animationFile);
    
    console.log(`[NpcSpriteManager] ✅ Structure JSON parsée: ${structure.name}`);
    
    return {
      ...structure,
      totalWidth: width,
      totalHeight: height,
      source: 'sprite-sizes-json',
      pokemonId,
      animationFile
    };
  }

  // ✅ NOUVELLE MÉTHODE : Chargement animation Pokémon
  async loadPokemonAnimation(spriteKey, spritePath, structure, spriteInfo) {
    return new Promise((resolve, reject) => {
      console.log(`[NpcSpriteManager] 🎞️ Chargement animation Pokémon: ${spriteKey}`);
      console.log(`[NpcSpriteManager] 📊 Structure: ${structure.frameWidth}x${structure.frameHeight} (${structure.cols}x${structure.rows})`);
      
      const timeoutId = setTimeout(() => {
        this.cleanupLoadHandlers(spriteKey);
        reject(new Error(`Timeout loading Pokémon animation: ${spriteKey}`));
      }, 10000);
      
      const onSuccess = () => {
        clearTimeout(timeoutId);
        this.cleanupLoadHandlers(spriteKey);
        console.log(`[NpcSpriteManager] ✅ Animation Pokémon chargée: ${spriteKey}`);
        resolve();
      };
      
      const onError = (fileObj) => {
        if (fileObj.key === spriteKey) {
          clearTimeout(timeoutId);
          this.cleanupLoadHandlers(spriteKey);
          reject(new Error(`Failed to load Pokémon animation: ${spriteKey}`));
        }
      };
      
      this.activeLoadHandlers.set(spriteKey, { onSuccess, onError });
      
      this.scene.load.once('filecomplete-spritesheet-' + spriteKey, onSuccess);
      this.scene.load.once('loaderror', onError);
      
      try {
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

  // ✅ NOUVELLE MÉTHODE : Chargement icône Pokémon
  async loadPokemonIcon(spriteKey, spritePath, structure, spriteInfo) {
    return new Promise((resolve, reject) => {
      console.log(`[NpcSpriteManager] 🖼️ Chargement icône Pokémon: ${spriteKey}`);
      
      const timeoutId = setTimeout(() => {
        this.cleanupLoadHandlers(spriteKey);
        reject(new Error(`Timeout loading Pokémon icon: ${spriteKey}`));
      }, 8000);
      
      const onSuccess = () => {
        clearTimeout(timeoutId);
        this.cleanupLoadHandlers(spriteKey);
        console.log(`[NpcSpriteManager] ✅ Icône Pokémon chargée: ${spriteKey}`);
        resolve();
      };
      
      const onError = (fileObj) => {
        if (fileObj.key === spriteKey) {
          clearTimeout(timeoutId);
          this.cleanupLoadHandlers(spriteKey);
          reject(new Error(`Failed to load Pokémon icon: ${spriteKey}`));
        }
      };
      
      this.activeLoadHandlers.set(spriteKey, { onSuccess, onError });
      
      // ✅ Pour les icônes, on peut utiliser spritesheet si structure disponible
      if (structure && structure.cols > 1) {
        this.scene.load.once('filecomplete-spritesheet-' + spriteKey, onSuccess);
        this.scene.load.spritesheet(spriteKey, spritePath, {
          frameWidth: structure.frameWidth,
          frameHeight: structure.frameHeight
        });
      } else {
        this.scene.load.once('filecomplete-image-' + spriteKey, onSuccess);
        this.scene.load.image(spriteKey, spritePath);
      }
      
      this.scene.load.once('loaderror', onError);
      
      try {
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

  // ✅ NOUVELLE MÉTHODE : Structure fallback pour Pokémon
  createFallbackPokemonStructure() {
    return {
      cols: 1,
      rows: 1,
      frameWidth: 32,
      frameHeight: 32,
      totalFrames: 1,
      name: 'Pokémon Fallback (1x1)',
      source: 'pokemon-fallback',
      qualityScore: 10
    };
  }


  // ✅ NOUVELLE MÉTHODE : Chargement spécialisé PNG
  async performPngSpritesheetLoad(spriteKey) {
    return new Promise(async (resolve, reject) => {
      console.log(`[NpcSpriteManager] 🖼️ === CHARGEMENT PNG: ${spriteKey} ===`);
      
      // ✅ Construire le chemin du fichier PNG
      const hasExtension = spriteKey.endsWith('.png') || spriteKey.endsWith('.jpg') || spriteKey.endsWith('.jpeg');
      const spritePath = hasExtension 
        ? `${this.config.spritePath}${spriteKey}`
        : `${this.config.spritePath}${spriteKey}${this.config.spriteExtension}`;
      
      console.log(`[NpcSpriteManager] 📁 Chemin PNG: ${spritePath}`);
      
      try {
        // ✅ D'abord, détecter si c'est un spritesheet ou une image simple
        const imageInfo = await this.analyzePngStructure(spritePath, spriteKey);
        
        if (imageInfo.isSpriteSheet) {
          console.log(`[NpcSpriteManager] 🎞️ PNG Spritesheet détecté: ${imageInfo.structure.name}`);
          await this.loadPngAsSpriteSheet(spriteKey, spritePath, imageInfo.structure);
          this.spriteStructures.set(spriteKey, imageInfo.structure);
          this.stats.spriteSheetsDetected++;
        } else {
          console.log(`[NpcSpriteManager] 🖼️ PNG Image simple détectée`);
          await this.loadPngAsSimpleImage(spriteKey, spritePath);
          this.stats.simpleImagesLoaded++;
        }
        
        console.log(`[NpcSpriteManager] ✅ PNG chargé avec succès: ${spriteKey}`);
        this.loadedSprites.add(spriteKey);
        this.stats.successfullyLoaded++;
        
        resolve({
          success: true,
          spriteKey,
          fromCache: false,
          path: spritePath,
          isSpriteSheet: imageInfo.isSpriteSheet,
          structure: imageInfo.isSpriteSheet ? imageInfo.structure : null
        });
        
      } catch (error) {
        console.error(`[NpcSpriteManager] ❌ Erreur chargement PNG ${spriteKey}:`, error);
        reject(error);
      }
    });
  }

  // ✅ MÉTHODE AMÉLIORÉE : Analyse structure PNG
  async analyzePngStructure(imagePath, spriteKey) {
    return new Promise((resolve, reject) => {
      const tempImage = new Image();
      
      // ✅ Timeout plus court pour éviter les blocages
      const timeoutId = setTimeout(() => {
        console.error(`[NpcSpriteManager] ⏰ Timeout analyse PNG ${spriteKey} après 3s`);
        reject(new Error(`Timeout analyzing PNG: ${spriteKey}`));
      }, 3000);
      
      tempImage.onload = () => {
        clearTimeout(timeoutId);
        
        const width = tempImage.width;
        const height = tempImage.height;
        
        console.log(`[NpcSpriteManager] 📐 PNG ${spriteKey}: ${width}x${height}`);
        
        // ✅ Détecter la structure du spritesheet
        const structure = this.detectNpcSpriteStructure(width, height, spriteKey);
        const isSpriteSheet = structure.cols > 1 || structure.rows > 1;
        
        console.log(`[NpcSpriteManager] 🔍 Type: ${isSpriteSheet ? 'SPRITESHEET' : 'IMAGE SIMPLE'}`);
        if (isSpriteSheet) {
          console.log(`[NpcSpriteManager] 📊 Structure: ${structure.name} (${structure.frameWidth}x${structure.frameHeight})`);
        }
        
        resolve({
          width,
          height,
          isSpriteSheet,
          structure: isSpriteSheet ? structure : null
        });
      };
      
      tempImage.onerror = () => {
        clearTimeout(timeoutId);
        console.error(`[NpcSpriteManager] ❌ Impossible de charger PNG pour analyse: ${imagePath}`);
        reject(new Error(`Failed to load PNG for analysis: ${imagePath}`));
      };
      
      tempImage.src = imagePath;
    });
  }

  // ✅ MÉTHODE INCHANGÉE : Détection structure
  detectNpcSpriteStructure(width, height, spriteKey) {
    console.log(`[NpcSpriteManager] 🔍 Détection structure NPC pour ${width}x${height}`);
    
    const npcPatterns = [
      { cols: 4, rows: 4, name: 'NPC Standard (4x4)', priority: 100 },
      { cols: 3, rows: 4, name: 'NPC Compact (3x4)', priority: 90 },
      { cols: 4, rows: 3, name: 'NPC Alt (4x3)', priority: 80 },
      { cols: 4, rows: 1, name: 'NPC WalkSprite (4x1)', priority: 70 },
      { cols: 3, rows: 1, name: 'NPC Simple (3x1)', priority: 60 },
      { cols: 2, rows: 2, name: 'NPC Mini (2x2)', priority: 50 },
      { cols: 1, rows: 1, name: 'NPC Single (1x1)', priority: 10 }
    ];
    
    const validStructures = [];
    
    for (const pattern of npcPatterns) {
      const frameW = width / pattern.cols;
      const frameH = height / pattern.rows;
      
      if (frameW % 1 === 0 && frameH % 1 === 0) {
        let score = pattern.priority;
        
        if (frameW >= 16 && frameW <= 64 && frameH >= 16 && frameH <= 64) {
          score += 30;
        }
        
        const aspectRatio = frameW / frameH;
        if (aspectRatio >= 0.8 && aspectRatio <= 1.2) {
          score += 20;
        }
        
        if (frameW % 8 === 0 && frameH % 8 === 0) {
          score += 15;
        }
        
        validStructures.push({
          ...pattern,
          frameWidth: frameW,
          frameHeight: frameH,
          totalFrames: pattern.cols * pattern.rows,
          score,
          aspectRatio: aspectRatio.toFixed(2)
        });
      }
    }
    
    validStructures.sort((a, b) => b.score - a.score);
    
    const best = validStructures[0] || {
      cols: 1,
      rows: 1,
      frameWidth: width,
      frameHeight: height,
      totalFrames: 1,
      name: 'NPC Fallback (1x1)',
      score: 0
    };
    
    console.log(`[NpcSpriteManager] ✅ Structure détectée: ${best.name} (score: ${best.score})`);
    
    return best;
  }

  // ✅ MÉTHODE SPÉCIALISÉE : Chargement PNG comme spritesheet
  async loadPngAsSpriteSheet(spriteKey, spritePath, structure) {
    return new Promise((resolve, reject) => {
      console.log(`[NpcSpriteManager] 🎞️ Chargement PNG spritesheet: ${spriteKey}`);
      console.log(`[NpcSpriteManager] 📊 Structure: ${structure.frameWidth}x${structure.frameHeight} (${structure.cols}x${structure.rows})`);
      
      // ✅ Timeout réduit pour éviter les blocages
      const timeoutId = setTimeout(() => {
        this.cleanupLoadHandlers(spriteKey);
        reject(new Error(`Timeout loading PNG spritesheet: ${spriteKey}`));
      }, 8000);
      
      const onSuccess = () => {
        clearTimeout(timeoutId);
        this.cleanupLoadHandlers(spriteKey);
        console.log(`[NpcSpriteManager] ✅ PNG spritesheet chargé: ${spriteKey}`);
        resolve();
      };
      
      const onError = (fileObj) => {
        if (fileObj.key === spriteKey) {
          clearTimeout(timeoutId);
          this.cleanupLoadHandlers(spriteKey);
          reject(new Error(`Failed to load PNG spritesheet: ${spriteKey}`));
        }
      };
      
      this.activeLoadHandlers.set(spriteKey, { onSuccess, onError });
      
      this.scene.load.once('filecomplete-spritesheet-' + spriteKey, onSuccess);
      this.scene.load.once('loaderror', onError);
      
      try {
        // ✅ Charger le PNG comme spritesheet avec la structure détectée
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

  // ✅ MÉTHODE SPÉCIALISÉE : Chargement PNG comme image simple
  async loadPngAsSimpleImage(spriteKey, spritePath) {
    return new Promise((resolve, reject) => {
      console.log(`[NpcSpriteManager] 🖼️ Chargement PNG image: ${spriteKey}`);
      
      const timeoutId = setTimeout(() => {
        this.cleanupLoadHandlers(spriteKey);
        reject(new Error(`Timeout loading PNG image: ${spriteKey}`));
      }, 8000);
      
      const onSuccess = () => {
        clearTimeout(timeoutId);
        this.cleanupLoadHandlers(spriteKey);
        console.log(`[NpcSpriteManager] ✅ PNG image chargée: ${spriteKey}`);
        resolve();
      };
      
      const onError = (fileObj) => {
        if (fileObj.key === spriteKey) {
          clearTimeout(timeoutId);
          this.cleanupLoadHandlers(spriteKey);
          reject(new Error(`Failed to load PNG image: ${spriteKey}`));
        }
      };
      
      this.activeLoadHandlers.set(spriteKey, { onSuccess, onError });
      
      this.scene.load.once('filecomplete-image-' + spriteKey, onSuccess);
      this.scene.load.once('loaderror', onError);
      
      try {
        this.scene.load.image(spriteKey, spritePath);
        
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

  // ✅ MÉTHODES D'ACCÈS (adaptées pour PNG)
  async getSpriteKeyToUse(requestedSprite) {
    console.log(`[NpcSpriteManager] 🎯 === GET PNG SPRITE: "${requestedSprite}" ===`);
    
    if (!requestedSprite) {
      console.log('[NpcSpriteManager] ⚠️ Pas de sprite demandé, utilisation fallback');
      return this.config.fallbackSprite;
    }
    
    try {
      const result = await this.loadNpcSprite(requestedSprite);
      
      if (result.success) {
        console.log(`[NpcSpriteManager] ✅ PNG sprite obtenu: ${result.spriteKey}`);
        
        const isReallyAvailable = await this.validateSpriteAvailability(result.spriteKey);
        
        if (isReallyAvailable) {
          return result.spriteKey;
        } else {
          console.warn(`[NpcSpriteManager] ⚠️ PNG sprite ${result.spriteKey} non disponible, fallback`);
          return this.config.fallbackSprite;
        }
        
      } else {
        console.log(`[NpcSpriteManager] 🔄 Utilisation fallback pour: ${requestedSprite}`);
        return this.config.fallbackSprite;
      }
      
    } catch (error) {
      console.error(`[NpcSpriteManager] ❌ Erreur getSpriteKeyToUse pour ${requestedSprite}:`, error);
      return this.config.fallbackSprite;
    }
  }

  getDefaultFrameForSprite(spriteKey) {
    const structure = this.spriteStructures.get(spriteKey);
    return structure ? this.config.defaultFrame : 0;
  }

  // ✅ MÉTHODE SIMPLIFIÉE : Info spritesheet PNG
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
      defaultFrame: this.config.defaultFrame,
      frameWidth: structure.frameWidth,
      frameHeight: structure.frameHeight,
      cols: structure.cols,
      rows: structure.rows,
      // ✅ NOUVEAU: Info Pokémon
      isPokemon: structure.isPokemon || false,
      pokemonId: structure.pokemonId || null,
      animationType: structure.animationType || null,
      animationFile: structure.animationFile || null
    };
  }

   // ✅ NOUVELLES MÉTHODES UTILITAIRES POKÉMON

  /**
   * Génère automatiquement une clé sprite pour un Pokémon
   */
  generatePokemonSpriteKey(pokemonId, animationType = 'walk') {
    return `pokemon:${pokemonId.toString().padStart(3, '0')}:${animationType}`;
  }

  /**
   * Charge plusieurs sprites Pokémon en lot
   */
  async preloadPokemonSprites(pokemonIds, animationTypes = ['walk']) {
    console.log(`[NpcSpriteManager] 🐾 Pré-chargement Pokémon: ${pokemonIds.length} Pokémon x ${animationTypes.length} animations`);
    
    const spritesToLoad = [];
    
    for (const pokemonId of pokemonIds) {
      for (const animationType of animationTypes) {
        const spriteKey = this.generatePokemonSpriteKey(pokemonId, animationType);
        spritesToLoad.push(spriteKey);
      }
    }
    
    return await this.preloadSprites(spritesToLoad);
  }

  /**
   * Obtient les sprites disponibles pour un Pokémon
   */
  getAvailablePokemonSprites(pokemonId) {
    const availableSprites = [];
    const pokemonPrefix = `pokemon:${pokemonId.toString().padStart(3, '0')}:`;
    
    for (const spriteKey of this.loadedSprites) {
      if (spriteKey.startsWith(pokemonPrefix)) {
        const animationType = spriteKey.replace(pokemonPrefix, '');
        availableSprites.push({
          spriteKey,
          animationType,
          structure: this.spriteStructures.get(spriteKey)
        });
      }
    }
    
    return availableSprites;
  }

  // ✅ MÉTHODES UTILITAIRES (inchangées)
  cleanupLoadHandlers(spriteKey) {
    if (this.activeLoadHandlers && this.activeLoadHandlers.has(spriteKey)) {
      const handlers = this.activeLoadHandlers.get(spriteKey);
      
      try {
        this.scene.load.off('filecomplete-image-' + spriteKey, handlers.onSuccess);
        this.scene.load.off('filecomplete-spritesheet-' + spriteKey, handlers.onSuccess);
        this.scene.load.off('loaderror', handlers.onError);
      } catch (error) {
        console.warn(`[NpcSpriteManager] ⚠️ Erreur nettoyage handlers ${spriteKey}:`, error);
      }
      
      this.activeLoadHandlers.delete(spriteKey);
    }
  }

  isSpriteCached(spriteKey) {
    return this.scene.textures.exists(spriteKey) && this.loadedSprites.has(spriteKey);
  }

  getFallbackResult(originalSpriteKey) {
    console.log(`[NpcSpriteManager] 🔄 Fallback pour: ${originalSpriteKey}`);
    this.stats.fallbacksUsed++;
    
    return {
      success: false,
      spriteKey: this.config.fallbackSprite,
      originalSpriteKey,
      isFallback: true,
      reason: 'png_not_found'
    };
  }

  async validateSpriteAvailability(spriteKey, maxWaitMs = 1000) {
    console.log(`[NpcSpriteManager] 🔍 Validation disponibilité PNG: ${spriteKey}`);
    
    if (this.scene.textures.exists(spriteKey)) {
      console.log(`[NpcSpriteManager] ✅ PNG sprite immédiatement disponible: ${spriteKey}`);
      return true;
    }
    
    console.log(`[NpcSpriteManager] ⏳ Attente PNG sprite ${spriteKey} (max ${maxWaitMs}ms)...`);
    
    const startTime = Date.now();
    const checkInterval = 50;
    
    return new Promise((resolve) => {
      const checkAvailability = () => {
        if (this.scene.textures.exists(spriteKey)) {
          const elapsed = Date.now() - startTime;
          console.log(`[NpcSpriteManager] ✅ PNG sprite ${spriteKey} disponible après ${elapsed}ms`);
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime >= maxWaitMs) {
          console.warn(`[NpcSpriteManager] ⏰ Timeout validation PNG ${spriteKey} après ${maxWaitMs}ms`);
          resolve(false);
          return;
        }
        
        setTimeout(checkAvailability, checkInterval);
      };
      
      checkAvailability();
    });
  }

  // ✅ MÉTHODES RESTANTES (simplifiées)
  async preloadSprites(spriteList) {
    console.log(`[NpcSpriteManager] 📦 Pré-chargement de ${spriteList.length} PNG sprites...`);
    
    const promises = spriteList.map(sprite => this.loadNpcSprite(sprite));
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;
    
    console.log(`[NpcSpriteManager] 📊 Pré-chargement PNG terminé: ${successful} succès, ${failed} échecs`);
    
    return {
      total: spriteList.length,
      successful,
      failed,
      results
    };
  }

getDebugInfo() {
    const textureList = this.scene.textures ? Object.keys(this.scene.textures.list) : [];
    const npcTextures = textureList.filter(key => 
      this.loadedSprites.has(key) || key === this.config.fallbackSprite
    );
    
    // ✅ Séparer les sprites Pokémon des NPC
    const pokemonSprites = Array.from(this.loadedSprites).filter(key => 
      this.spriteStructures.get(key)?.isPokemon
    );
    
    const npcSprites = Array.from(this.loadedSprites).filter(key => 
      !this.spriteStructures.get(key)?.isPokemon
    );
    
    return {
      isInitialized: this.isInitialized,
      sceneKey: this.scene?.scene?.key,
      stats: { ...this.stats },
      cache: {
        loaded: Array.from(this.loadedSprites),
        loading: Array.from(this.loadingSprites.keys()),
        failed: Array.from(this.failedSprites),
        // ✅ NOUVEAU: Séparation par type
        pokemonSprites,
        npcSprites
      },
      spriteSheets: {
        count: this.spriteStructures.size,
        structures: Object.fromEntries(this.spriteStructures),
        pokemonCount: pokemonSprites.length,
        npcCount: npcSprites.length
      },
      pokemon: {
        enabled: this.config.enablePokemonSprites,
        spriteSizesLoaded: SpriteUtils.spriteSizesLoaded,
        availablePokemon: this.getLoadedPokemonSummary()
      },
      config: { ...this.config },
      sceneTextures: {
        total: textureList.length,
        npcRelated: npcTextures,
        fallbackExists: this.scene.textures?.exists(this.config.fallbackSprite) || false
      },
      activeHandlers: this.activeLoadHandlers ? this.activeLoadHandlers.size : 0
    };
  }
getLoadedPokemonSummary() {
    const pokemonMap = new Map();
    
    this.spriteStructures.forEach((structure, spriteKey) => {
      if (structure.isPokemon) {
        const pokemonId = structure.pokemonId;
        if (!pokemonMap.has(pokemonId)) {
          pokemonMap.set(pokemonId, []);
        }
        pokemonMap.get(pokemonId).push({
          spriteKey,
          animationType: structure.animationType,
          animationFile: structure.animationFile
        });
      }
    });
    
    return Object.fromEntries(pokemonMap);
  }
 debugStats() {
    console.log('[NpcSpriteManager] 📊 === STATS NPC + POKÉMON ===');
    console.table(this.stats);
    
    const pokemonSprites = Array.from(this.loadedSprites).filter(key => 
      this.spriteStructures.get(key)?.isPokemon
    );
    
    const npcSprites = Array.from(this.loadedSprites).filter(key => 
      !this.spriteStructures.get(key)?.isPokemon
    );
    
    console.log('🐾 Sprites Pokémon chargés:', pokemonSprites);
    console.log('🎭 Sprites NPC chargés:', npcSprites);
    console.log('❌ Sprites en échec:', Array.from(this.failedSprites));
    console.log('⏳ Sprites en cours:', Array.from(this.loadingSprites.keys()));
    
    if (this.spriteStructures.size > 0) {
      console.log('📊 Structures PNG détectées:');
      this.spriteStructures.forEach((structure, spriteKey) => {
        console.log(`  ${spriteKey}: ${structure.name} (${structure.frameWidth}x${structure.frameHeight})`);
      });
    }
  }

  cleanupUnusedSprites(activeSprites = []) {
    console.log('[NpcSpriteManager] 🧹 Nettoyage PNG sprites inutilisés...');
    
    let cleaned = 0;
    
    this.loadedSprites.forEach(spriteKey => {
      if (spriteKey === this.config.fallbackSprite || activeSprites.includes(spriteKey)) {
        return;
      }
      
      if (this.scene.textures.exists(spriteKey)) {
        this.scene.textures.remove(spriteKey);
        console.log(`[NpcSpriteManager] 🗑️ PNG sprite nettoyé: ${spriteKey}`);
        cleaned++;
      }
      
      this.loadedSprites.delete(spriteKey);
      this.spriteStructures.delete(spriteKey);
    });
    
    console.log(`[NpcSpriteManager] ✅ ${cleaned} PNG sprites nettoyés`);
    return cleaned;
  }

  destroy() {
    console.log('[NpcSpriteManager] 💀 Destruction PNG manager...');
    
    if (this.activeLoadHandlers) {
      this.activeLoadHandlers.forEach((handlers, spriteKey) => {
        this.cleanupLoadHandlers(spriteKey);
      });
      this.activeLoadHandlers.clear();
      this.activeLoadHandlers = null;
    }
    
    this.loadingSprites.clear();
    this.loadedSprites.clear();
    this.failedSprites.clear();
    this.spriteStructures.clear();
    
    Object.keys(this.stats).forEach(key => this.stats[key] = 0);
    
    this.isInitialized = false;
    this.scene = null;
    
    console.log('[NpcSpriteManager] ✅ Destruction terminée');
  }
}

// ✅ FONCTIONS DEBUG GLOBALES
window.debugNpcSpriteManager = function() {
  const scene = window.game?.scene?.getScenes(true)?.[0];
  const manager = scene?.npcSpriteManager;
  
  if (manager) {
    const info = manager.getDebugInfo();
    console.log('[NpcSpriteManager] === DEBUG INFO PNG SPRITESHEETS ===');
    console.table(info.stats);
    console.log('[NpcSpriteManager] Info complète:', info);
    return info;
  } else {
    console.error('[NpcSpriteManager] Manager non trouvé');
    return null;
  }
};

console.log('✅ NpcSpriteManager PNG SPRITESHEETS chargé!');
console.log('🔍 Utilisez window.debugNpcSpriteManager() pour diagnostiquer');
