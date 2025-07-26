// client/src/managers/NpcSpriteManager.js
// ✅ Manager pour gérer les sprites NPCs dynamiques - VERSION SPRITE SHEETS

import { SpriteUtils } from '../utils/SpriteUtils.js';

export class NpcSpriteManager {
  constructor(scene) {
    this.scene = scene;
    this.isInitialized = false;
    
    // ✅ Cache des sprites chargés
    this.loadedSprites = new Set();
    this.loadingSprites = new Map(); // sprite -> Promise
    this.failedSprites = new Set();
    
    // ✅ NOUVEAU : Cache des structures sprite sheets
    this.spriteStructures = new Map(); // spriteKey -> structure
    
    // ✅ Gestion des handlers actifs pour nettoyage
    this.activeLoadHandlers = new Map();
    
    // ✅ Configuration
    this.config = {
      spritePath: '/assets/npc/',
      spriteExtension: '.png',
      fallbackSprite: 'npc_default',
      enableDebugLogs: true,
      maxRetries: 2,
      retryDelay: 1000,
      // ✅ NOUVEAU : Configuration sprite sheets
      defaultFrame: 0, // Frame à utiliser par défaut (idle)
      detectSpriteSheets: true // Activer la détection de sprite sheets
    };
    
    // ✅ Statistiques debug
    this.stats = {
      totalRequested: 0,
      successfullyLoaded: 0,
      failed: 0,
      cached: 0,
      fallbacksUsed: 0,
      spriteSheetsDetected: 0, // ✅ NOUVEAU
      simpleImagesLoaded: 0    // ✅ NOUVEAU
    };
    
    console.log('[NpcSpriteManager] 🎭 Créé pour scène avec support sprite sheets:', scene.scene.key);
  }

  // ✅ INITIALISATION INCHANGÉE
  initialize() {
    if (this.isInitialized) {
      console.log('[NpcSpriteManager] ⚠️ Déjà initialisé');
      return this;
    }
    
    console.log('[NpcSpriteManager] 🚀 === INITIALISATION AVEC SPRITE SHEETS ===');
    
    if (!this.scene || !this.scene.load) {
      console.error('[NpcSpriteManager] ❌ Scène non prête pour chargement');
      return this;
    }
    
    this.preloadFallbackSprite();
    this.isInitialized = true;
    console.log('[NpcSpriteManager] ✅ Initialisé avec support sprite sheets');
    
    return this;
  }

  // ✅ PRÉ-CHARGER LE SPRITE DE FALLBACK (INCHANGÉ)
  preloadFallbackSprite() {
    console.log('[NpcSpriteManager] 🎯 Pré-chargement sprite fallback...');
    
    const fallbackKey = this.config.fallbackSprite;
    const fallbackPath = `${this.config.spritePath}${fallbackKey}${this.config.spriteExtension}`;
    
    if (this.scene.textures.exists(fallbackKey)) {
      console.log('[NpcSpriteManager] ✅ Sprite fallback déjà chargé');
      this.loadedSprites.add(fallbackKey);
      return;
    }
    
    try {
      this.scene.load.image(fallbackKey, fallbackPath);
      
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
      
      this.scene.load.once('filecomplete-image-' + fallbackKey, () => {
        console.log('[NpcSpriteManager] ✅ Sprite fallback chargé:', fallbackKey);
        this.loadedSprites.add(fallbackKey);
      });
      
      this.scene.load.once('loaderror', (fileObj) => {
        if (fileObj.key === fallbackKey) {
          console.error('[NpcSpriteManager] ❌ Erreur chargement sprite fallback:', fallbackKey);
          this.createDefaultFallback();
        }
      });
      
    } catch (error) {
      console.error('[NpcSpriteManager] ❌ Erreur setup fallback:', error);
      this.createDefaultFallback();
    }
  }

  // ✅ MÉTHODE PRINCIPALE MODIFIÉE : Détecter sprite sheets
  async loadNpcSprite(spriteKey) {
    console.log(`[NpcSpriteManager] 📥 === CHARGEMENT SPRITE SHEET "${spriteKey}" ===`);
    
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
    
    // ✅ NOUVEAU : Créer promesse de chargement avec détection sprite sheet
    const loadingPromise = this.performSpriteSheetLoad(spriteKey);
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

  // ✅ NOUVELLE MÉTHODE : Chargement avec détection sprite sheet
  async performSpriteSheetLoad(spriteKey) {
    return new Promise(async (resolve, reject) => {
      console.log(`[NpcSpriteManager] 🔍 === DÉTECTION SPRITE SHEET: ${spriteKey} ===`);
      
      // ✅ ÉTAPE 1: Charger l'image pour analyser sa structure
      const hasExtension = spriteKey.endsWith('.png') || spriteKey.endsWith('.jpg') || spriteKey.endsWith('.jpeg');
      const spritePath = hasExtension 
        ? `${this.config.spritePath}${spriteKey}`
        : `${this.config.spritePath}${spriteKey}${this.config.spriteExtension}`;
      
      console.log(`[NpcSpriteManager] 📁 Analyse chemin: ${spritePath}`);
      
      try {
        // ✅ ÉTAPE 2: Charger image temporaire pour analyser
        const imageStructure = await this.analyzeImageStructure(spritePath, spriteKey);
        
        // ✅ ÉTAPE 3: Charger selon le type détecté
        if (imageStructure.isSpriteSheet) {
          console.log(`[NpcSpriteManager] 🎞️ Sprite sheet détecté: ${imageStructure.structure.name}`);
          this.stats.spriteSheetsDetected++;
          await this.loadAsSpriteSheet(spriteKey, spritePath, imageStructure.structure);
        } else {
          console.log(`[NpcSpriteManager] 🖼️ Image simple détectée`);
          this.stats.simpleImagesLoaded++;
          await this.loadAsSimpleImage(spriteKey, spritePath);
        }
        
        // ✅ ÉTAPE 4: Stocker la structure pour usage ultérieur
        if (imageStructure.isSpriteSheet) {
          this.spriteStructures.set(spriteKey, imageStructure.structure);
        }
        
        console.log(`[NpcSpriteManager] ✅ Chargement réussi: ${spriteKey}`);
        this.loadedSprites.add(spriteKey);
        this.stats.successfullyLoaded++;
        
        resolve({
          success: true,
          spriteKey,
          fromCache: false,
          path: spritePath,
          isSpriteSheet: imageStructure.isSpriteSheet,
          structure: imageStructure.isSpriteSheet ? imageStructure.structure : null
        });
        
      } catch (error) {
        console.error(`[NpcSpriteManager] ❌ Erreur analyse/chargement ${spriteKey}:`, error);
        reject(error);
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE : Analyser la structure d'une image
  async analyzeImageStructure(imagePath, spriteKey) {
    return new Promise((resolve, reject) => {
      const tempImage = new Image();
      
      const timeoutId = setTimeout(() => {
        console.error(`[NpcSpriteManager] ⏰ Timeout analyse ${spriteKey} après 5s`);
        reject(new Error(`Timeout analyzing image: ${spriteKey}`));
      }, 5000);
      
      tempImage.onload = () => {
        clearTimeout(timeoutId);
        
        const width = tempImage.width;
        const height = tempImage.height;
        
        console.log(`[NpcSpriteManager] 📐 Image ${spriteKey}: ${width}x${height}`);
        
        // ✅ Utiliser SpriteUtils pour détecter la structure
        const structure = this.detectNpcSpriteStructure(width, height, spriteKey);
        
        const isSpriteSheet = structure.cols > 1 || structure.rows > 1;
        
        console.log(`[NpcSpriteManager] 🔍 Analyse: ${isSpriteSheet ? 'SPRITE SHEET' : 'IMAGE SIMPLE'}`);
        if (isSpriteSheet) {
          console.log(`[NpcSpriteManager] 📊 Structure: ${structure.name}`);
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
        reject(new Error(`Failed to load image for analysis: ${imagePath}`));
      };
      
      tempImage.src = imagePath;
    });
  }

  // ✅ NOUVELLE MÉTHODE : Détecter structure sprite NPC (adapté de SpriteUtils)
  detectNpcSpriteStructure(width, height, spriteKey) {
    console.log(`[NpcSpriteManager] 🔍 Détection structure NPC pour ${width}x${height}`);
    
    // ✅ Patterns courants pour les NPCs
    const npcPatterns = [
      // Format standard NPCs (4 directions, idle + walk)
      { cols: 4, rows: 4, name: 'NPC Standard (4x4)', priority: 100 },
      { cols: 3, rows: 4, name: 'NPC Compact (3x4)', priority: 90 },
      { cols: 4, rows: 3, name: 'NPC Alt (4x3)', priority: 80 },
      
      // Format walksprites
      { cols: 4, rows: 1, name: 'NPC WalkSprite (4x1)', priority: 70 },
      { cols: 3, rows: 1, name: 'NPC Simple (3x1)', priority: 60 },
      
      // Format carré
      { cols: 2, rows: 2, name: 'NPC Mini (2x2)', priority: 50 },
      { cols: 1, rows: 1, name: 'NPC Single (1x1)', priority: 10 }
    ];
    
    // ✅ Tester les patterns
    const validStructures = [];
    
    for (const pattern of npcPatterns) {
      const frameW = width / pattern.cols;
      const frameH = height / pattern.rows;
      
      // ✅ Vérifier que les frames sont des entiers
      if (frameW % 1 === 0 && frameH % 1 === 0) {
        let score = pattern.priority;
        
        // ✅ Bonus pour des tailles de frame réalistes
        if (frameW >= 16 && frameW <= 64 && frameH >= 16 && frameH <= 64) {
          score += 30;
        }
        
        // ✅ Bonus pour des frames carrées ou presque
        const aspectRatio = frameW / frameH;
        if (aspectRatio >= 0.8 && aspectRatio <= 1.2) {
          score += 20;
        }
        
        // ✅ Bonus pour des tailles multiples de 8 (pixels art)
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
    
    // ✅ Trier par score
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

  // ✅ NOUVELLE MÉTHODE : Charger comme sprite sheet
  async loadAsSpriteSheet(spriteKey, spritePath, structure) {
    return new Promise((resolve, reject) => {
      console.log(`[NpcSpriteManager] 🎞️ Chargement sprite sheet: ${spriteKey}`);
      console.log(`[NpcSpriteManager] 📊 Structure: ${structure.frameWidth}x${structure.frameHeight} (${structure.cols}x${structure.rows})`);
      
      const timeoutId = setTimeout(() => {
        this.cleanupLoadHandlers(spriteKey);
        reject(new Error(`Timeout loading spritesheet: ${spriteKey}`));
      }, 10000);
      
      const onSuccess = () => {
        clearTimeout(timeoutId);
        this.cleanupLoadHandlers(spriteKey);
        console.log(`[NpcSpriteManager] ✅ Sprite sheet chargé: ${spriteKey}`);
        resolve();
      };
      
      const onError = (fileObj) => {
        if (fileObj.key === spriteKey) {
          clearTimeout(timeoutId);
          this.cleanupLoadHandlers(spriteKey);
          reject(new Error(`Failed to load spritesheet: ${spriteKey}`));
        }
      };
      
      // ✅ Stocker handlers pour nettoyage
      this.activeLoadHandlers.set(spriteKey, { onSuccess, onError });
      
      // ✅ Ajouter handlers
      this.scene.load.once('filecomplete-spritesheet-' + spriteKey, onSuccess);
      this.scene.load.once('loaderror', onError);
      
      try {
        // ✅ Charger comme spritesheet avec la structure détectée
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

  // ✅ NOUVELLE MÉTHODE : Charger comme image simple
  async loadAsSimpleImage(spriteKey, spritePath) {
    return new Promise((resolve, reject) => {
      console.log(`[NpcSpriteManager] 🖼️ Chargement image simple: ${spriteKey}`);
      
      const timeoutId = setTimeout(() => {
        this.cleanupLoadHandlers(spriteKey);
        reject(new Error(`Timeout loading image: ${spriteKey}`));
      }, 10000);
      
      const onSuccess = () => {
        clearTimeout(timeoutId);
        this.cleanupLoadHandlers(spriteKey);
        console.log(`[NpcSpriteManager] ✅ Image simple chargée: ${spriteKey}`);
        resolve();
      };
      
      const onError = (fileObj) => {
        if (fileObj.key === spriteKey) {
          clearTimeout(timeoutId);
          this.cleanupLoadHandlers(spriteKey);
          reject(new Error(`Failed to load image: ${spriteKey}`));
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

  // ✅ MÉTHODE MODIFIÉE : Obtenir le sprite avec frame par défaut
  async getSpriteKeyToUse(requestedSprite) {
    console.log(`[NpcSpriteManager] 🎯 === GET SPRITE KEY (SHEET): "${requestedSprite}" ===`);
    
    if (!requestedSprite) {
      console.log('[NpcSpriteManager] ⚠️ Pas de sprite demandé, utilisation fallback');
      await this.ensureFallbackReady();
      return this.config.fallbackSprite;
    }
    
    try {
      const result = await this.loadNpcSprite(requestedSprite);
      
      if (result.success) {
        console.log(`[NpcSpriteManager] ✅ Sprite obtenu: ${result.spriteKey}`);
        
        const isReallyAvailable = await this.validateSpriteAvailability(result.spriteKey);
        
        if (isReallyAvailable) {
          return result.spriteKey;
        } else {
          console.warn(`[NpcSpriteManager] ⚠️ Sprite ${result.spriteKey} signalé comme chargé mais pas disponible`);
          await this.ensureFallbackReady();
          return this.config.fallbackSprite;
        }
        
      } else {
        console.log(`[NpcSpriteManager] 🔄 Utilisation fallback pour: ${requestedSprite}`);
        await this.ensureFallbackReady();
        return this.config.fallbackSprite;
      }
      
    } catch (error) {
      console.error(`[NpcSpriteManager] ❌ Erreur getSpriteKeyToUse pour ${requestedSprite}:`, error);
      await this.ensureFallbackReady();
      return this.config.fallbackSprite;
    }
  }

  // ✅ NOUVELLE MÉTHODE : Obtenir le frame par défaut pour un sprite
  getDefaultFrameForSprite(spriteKey) {
    const structure = this.spriteStructures.get(spriteKey);
    
    if (!structure) {
      return 0; // Frame par défaut pour image simple
    }
    
    // ✅ Pour les NPCs, utiliser la première frame (idle down généralement)
    return this.config.defaultFrame;
  }

  // ✅ NOUVELLE MÉTHODE : Obtenir les informations de sprite sheet
  getSpriteSheetInfo(spriteKey) {
    const structure = this.spriteStructures.get(spriteKey);
    
    if (!structure) {
      return {
        isSpriteSheet: false,
        frameCount: 1,
        defaultFrame: 0
      };
    }
    
    return {
      isSpriteSheet: true,
      structure: structure,
      frameCount: structure.totalFrames,
      defaultFrame: this.getDefaultFrameForSprite(spriteKey),
      frameWidth: structure.frameWidth,
      frameHeight: structure.frameHeight,
      cols: structure.cols,
      rows: structure.rows
    };
  }

  // ✅ MÉTHODES EXISTANTES INCHANGÉES (nettoyer handlers, validation, fallback, etc.)
  
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
      reason: 'sprite_not_found'
    };
  }

  async validateSpriteAvailability(spriteKey, maxWaitMs = 2000) {
    console.log(`[NpcSpriteManager] 🔍 Validation disponibilité: ${spriteKey}`);
    
    if (this.scene.textures.exists(spriteKey)) {
      console.log(`[NpcSpriteManager] ✅ Sprite immédiatement disponible: ${spriteKey}`);
      return true;
    }
    
    console.log(`[NpcSpriteManager] ⏳ Attente sprite ${spriteKey} (max ${maxWaitMs}ms)...`);
    
    const startTime = Date.now();
    const checkInterval = 50;
    
    return new Promise((resolve) => {
      const checkAvailability = () => {
        if (this.scene.textures.exists(spriteKey)) {
          const elapsed = Date.now() - startTime;
          console.log(`[NpcSpriteManager] ✅ Sprite ${spriteKey} disponible après ${elapsed}ms`);
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime >= maxWaitMs) {
          console.warn(`[NpcSpriteManager] ⏰ Timeout validation ${spriteKey} après ${maxWaitMs}ms`);
          resolve(false);
          return;
        }
        
        setTimeout(checkAvailability, checkInterval);
      };
      
      checkAvailability();
    });
  }

  async ensureFallbackReady() {
    const fallbackKey = this.config.fallbackSprite;
    
    if (this.scene.textures.exists(fallbackKey)) {
      console.log(`[NpcSpriteManager] ✅ Fallback déjà disponible: ${fallbackKey}`);
      return true;
    }
    
    console.log(`[NpcSpriteManager] 🎨 Création fallback: ${fallbackKey}`);
    
    try {
      this.createDefaultFallback();
      const isAvailable = await this.validateSpriteAvailability(fallbackKey, 1000);
      
      if (isAvailable) {
        this.loadedSprites.add(fallbackKey);
        console.log(`[NpcSpriteManager] ✅ Fallback créé et validé: ${fallbackKey}`);
        return true;
      } else {
        console.error(`[NpcSpriteManager] ❌ Impossible de créer fallback: ${fallbackKey}`);
        return false;
      }
      
    } catch (error) {
      console.error(`[NpcSpriteManager] ❌ Erreur création fallback:`, error);
      return false;
    }
  }

  createDefaultFallback() {
    console.log('[NpcSpriteManager] 🎨 Création fallback graphique...');
    
    try {
      const key = this.config.fallbackSprite;
      
      if (this.scene.textures.exists(key)) {
        this.scene.textures.remove(key);
      }
      
      const graphics = this.scene.add.graphics();
      
      graphics.fillStyle(0x4169E1, 1.0);
      graphics.fillRoundedRect(0, 0, 32, 32, 4);
      
      graphics.fillStyle(0xFFDBB0, 1.0);
      graphics.fillCircle(16, 12, 8);
      
      graphics.fillStyle(0x000000, 1.0);
      graphics.fillCircle(13, 10, 2);
      graphics.fillCircle(19, 10, 2);
      
      graphics.fillStyle(0xFF4444, 1.0);
      graphics.fillRect(8, 4, 16, 3);
      
      graphics.fillStyle(0x2E8B57, 1.0);
      graphics.fillRoundedRect(12, 20, 8, 10, 2);
      
      graphics.lineStyle(2, 0xFFFFFF, 1.0);
      graphics.strokeRoundedRect(1, 1, 30, 30, 4);
      
      const text = this.scene.add.text(16, 28, 'NPC', {
        fontSize: '8px',
        fontFamily: 'Arial',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      const renderTexture = this.scene.add.renderTexture(0, 0, 32, 32);
      renderTexture.draw(graphics);
      renderTexture.draw(text);
      renderTexture.generateTexture(key);
      
      graphics.destroy();
      text.destroy();
      renderTexture.destroy();
      
      this.loadedSprites.add(key);
      console.log('[NpcSpriteManager] ✅ Fallback graphique créé:', key);
      
    } catch (error) {
      console.error('[NpcSpriteManager] ❌ Erreur création fallback graphique:', error);
    }
  }

  // ✅ PRÉ-CHARGER PLUSIEURS SPRITES (INCHANGÉ)
  async preloadSprites(spriteList) {
    console.log(`[NpcSpriteManager] 📦 Pré-chargement de ${spriteList.length} sprites (avec détection sheets)...`);
    
    const promises = spriteList.map(sprite => this.loadNpcSprite(sprite));
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;
    
    console.log(`[NpcSpriteManager] 📊 Pré-chargement terminé: ${successful} succès, ${failed} échecs`);
    
    return {
      total: spriteList.length,
      successful,
      failed,
      results
    };
  }

  // ✅ DEBUG AMÉLIORÉ avec infos sprite sheets
  getDebugInfo() {
    const textureList = this.scene.textures ? Object.keys(this.scene.textures.list) : [];
    const npcTextures = textureList.filter(key => 
      this.loadedSprites.has(key) || key === this.config.fallbackSprite
    );
    
    return {
      isInitialized: this.isInitialized,
      sceneKey: this.scene?.scene?.key,
      stats: { ...this.stats },
      cache: {
        loaded: Array.from(this.loadedSprites),
        loading: Array.from(this.loadingSprites.keys()),
        failed: Array.from(this.failedSprites)
      },
      spriteSheets: {
        count: this.spriteStructures.size,
        structures: Object.fromEntries(this.spriteStructures)
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

  debugStats() {
    console.log('[NpcSpriteManager] 📊 === STATISTIQUES SPRITE SHEETS ===');
    console.table(this.stats);
    console.log('📦 Sprites chargés:', Array.from(this.loadedSprites));
    console.log('❌ Sprites en échec:', Array.from(this.failedSprites));
    console.log('⏳ Sprites en cours:', Array.from(this.loadingSprites.keys()));
    console.log('🎞️ Sprite sheets détectés:', this.spriteStructures.size);
    
    // ✅ Debug des structures détectées
    if (this.spriteStructures.size > 0) {
      console.log('📊 Structures détectées:');
      this.spriteStructures.forEach((structure, spriteKey) => {
        console.log(`  ${spriteKey}: ${structure.name} (${structure.frameWidth}x${structure.frameHeight})`);
      });
    }
  }

  // ✅ NETTOYAGE ET DESTRUCTION (INCHANGÉS)
  cleanupUnusedSprites(activeSprites = []) {
    console.log('[NpcSpriteManager] 🧹 Nettoyage sprites inutilisés (sheets)...');
    
    let cleaned = 0;
    
    this.loadedSprites.forEach(spriteKey => {
      if (spriteKey === this.config.fallbackSprite || activeSprites.includes(spriteKey)) {
        return;
      }
      
      if (this.scene.textures.exists(spriteKey)) {
        this.scene.textures.remove(spriteKey);
        console.log(`[NpcSpriteManager] 🗑️ Sprite nettoyé: ${spriteKey}`);
        cleaned++;
      }
      
      this.loadedSprites.delete(spriteKey);
      this.spriteStructures.delete(spriteKey); // ✅ Nettoyer aussi les structures
    });
    
    console.log(`[NpcSpriteManager] ✅ ${cleaned} sprites nettoyés`);
    return cleaned;
  }

  destroy() {
    console.log('[NpcSpriteManager] 💀 Destruction avec sprite sheets...');
    
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
    this.spriteStructures.clear(); // ✅ Nettoyer structures
    
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
    console.log('[NpcSpriteManager] === DEBUG INFO SPRITE SHEETS ===');
    console.table(info.stats);
    console.log('[NpcSpriteManager] Info complète:', info);
    return info;
  } else {
    console.error('[NpcSpriteManager] Manager non trouvé');
    return null;
  }
};

console.log('✅ NpcSpriteManager SPRITE SHEETS chargé!');
console.log('🔍 Utilisez window.debugNpcSpriteManager() pour diagnostiquer');
