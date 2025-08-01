// client/src/managers/NpcSpriteManager.js
// ✅ CORRECTION: Fix de l'erreur generateTexture + amélioration fallback

import { SpriteUtils } from '../utils/SpriteUtils.js';

export class NpcSpriteManager {
  constructor(scene) {
    this.scene = scene;
    this.isInitialized = false;
    
    // ✅ Cache des sprites chargés
    this.loadedSprites = new Set();
    this.loadingSprites = new Map(); // sprite -> Promise
    this.failedSprites = new Set();
    
    // ✅ Cache des structures sprite sheets
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
      // ✅ Configuration sprite sheets
      defaultFrame: 0, // Frame à utiliser par défaut (idle)
      detectSpriteSheets: true, // Activer la détection de sprite sheets
      // ✅ Configuration fallback sprite sheet
      createFallbackAsSheet: true, // Créer le fallback comme sprite sheet
      fallbackSheetStructure: {
        frameWidth: 32,
        frameHeight: 32,
        cols: 4,
        rows: 4,
        name: 'Fallback Sheet (4x4)'
      }
    };
    
    // ✅ Statistiques debug
    this.stats = {
      totalRequested: 0,
      successfullyLoaded: 0,
      failed: 0,
      cached: 0,
      fallbacksUsed: 0,
      spriteSheetsDetected: 0,
      simpleImagesLoaded: 0,
      fallbackCreated: 0
    };
    
    console.log('[NpcSpriteManager] 🎭 Créé pour scène avec support sprite sheets complet:', scene.scene.key);
  }

  // ✅ INITIALISATION
  initialize() {
    if (this.isInitialized) {
      console.log('[NpcSpriteManager] ⚠️ Déjà initialisé');
      return this;
    }
    
    console.log('[NpcSpriteManager] 🚀 === INITIALISATION AVEC SPRITE SHEETS COMPLET ===');
    
    if (!this.scene || !this.scene.load) {
      console.error('[NpcSpriteManager] ❌ Scène non prête pour chargement');
      return this;
    }
    
    this.preloadFallbackSprite();
    this.isInitialized = true;
    console.log('[NpcSpriteManager] ✅ Initialisé avec support sprite sheets complet');
    
    return this;
  }

  // ✅ MÉTHODE CORRIGÉE : Pré-charger le fallback
  async preloadFallbackSprite() {
    console.log('[NpcSpriteManager] 🎯 === PRÉ-CHARGEMENT FALLBACK AVEC SPRITE SHEET ===');
    
    const fallbackKey = this.config.fallbackSprite;
    
    if (this.scene.textures.exists(fallbackKey)) {
      console.log('[NpcSpriteManager] ✅ Sprite fallback déjà chargé');
      this.loadedSprites.add(fallbackKey);
      return;
    }
    
    try {
      // ✅ Essayer d'abord de charger le fallback comme un sprite normal
      console.log('[NpcSpriteManager] 🔍 Tentative chargement fallback externe...');
      
      const fallbackResult = await this.loadNpcSprite(fallbackKey).catch(() => null);
      
      if (fallbackResult && fallbackResult.success) {
        console.log('[NpcSpriteManager] ✅ Fallback externe chargé avec succès');
        return;
      }
      
      // ✅ Si échec, créer le fallback graphique
      console.log('[NpcSpriteManager] 🎨 Création fallback graphique...');
      await this.createDefaultFallback();
      
    } catch (error) {
      console.error('[NpcSpriteManager] ❌ Erreur setup fallback:', error);
      await this.createDefaultFallback();
    }
  }

  // ✅ MÉTHODE PRINCIPALE (inchangée)
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
    
    // ✅ Créer promesse de chargement avec détection sprite sheet
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

  // ✅ MÉTHODE CHARGEMENT SPRITE SHEET
  async performSpriteSheetLoad(spriteKey) {
    return new Promise(async (resolve, reject) => {
      console.log(`[NpcSpriteManager] 🔍 === DÉTECTION SPRITE SHEET: ${spriteKey} ===`);
      
      // ✅ Charger l'image pour analyser sa structure
      const hasExtension = spriteKey.endsWith('.png') || spriteKey.endsWith('.jpg') || spriteKey.endsWith('.jpeg');
      const spritePath = hasExtension 
        ? `${this.config.spritePath}${spriteKey}`
        : `${this.config.spritePath}${spriteKey}${this.config.spriteExtension}`;
      
      console.log(`[NpcSpriteManager] 📁 Analyse chemin: ${spritePath}`);
      
      try {
        // ✅ Charger image temporaire pour analyser
        const imageStructure = await this.analyzeImageStructure(spritePath, spriteKey);
        
        // ✅ Charger selon le type détecté
        if (imageStructure.isSpriteSheet) {
          console.log(`[NpcSpriteManager] 🎞️ Sprite sheet détecté: ${imageStructure.structure.name}`);
          this.stats.spriteSheetsDetected++;
          await this.loadAsSpriteSheet(spriteKey, spritePath, imageStructure.structure);
        } else {
          console.log(`[NpcSpriteManager] 🖼️ Image simple détectée`);
          this.stats.simpleImagesLoaded++;
          await this.loadAsSimpleImage(spriteKey, spritePath);
        }
        
        // ✅ Stocker la structure pour usage ultérieur
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

  // ✅ MÉTHODES D'ANALYSE (inchangées)
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

  // ✅ MÉTHODES DE CHARGEMENT (inchangées)
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

  // ✅ MÉTHODES D'ACCÈS
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

  getDefaultFrameForSprite(spriteKey) {
    const structure = this.spriteStructures.get(spriteKey);
    
    if (!structure) {
      return 0;
    }
    
    return this.config.defaultFrame;
  }

  // ✅ MÉTHODE MODIFIÉE : Support fallback sprite sheet
  getSpriteSheetInfo(spriteKey) {
    const structure = this.spriteStructures.get(spriteKey);
    
    // ✅ Si c'est le fallback et qu'il n'a pas de structure, utiliser la config
    if (!structure && spriteKey === this.config.fallbackSprite && this.config.createFallbackAsSheet) {
      const fallbackStructure = this.config.fallbackSheetStructure;
      return {
        isSpriteSheet: true,
        structure: fallbackStructure,
        frameCount: fallbackStructure.cols * fallbackStructure.rows,
        defaultFrame: this.config.defaultFrame,
        frameWidth: fallbackStructure.frameWidth,
        frameHeight: fallbackStructure.frameHeight,
        cols: fallbackStructure.cols,
        rows: fallbackStructure.rows
      };
    }
    
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

  // ✅ MÉTHODES UTILITAIRES
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
      await this.createDefaultFallback();
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

  // ✅ MÉTHODE CORRIGÉE : Créer fallback avec méthode compatible
  async createDefaultFallback() {
    console.log('[NpcSpriteManager] 🎨 === CRÉATION FALLBACK COMPATIBLE ===');
    
    try {
      const key = this.config.fallbackSprite;
      
      if (this.scene.textures.exists(key)) {
        this.scene.textures.remove(key);
      }

      // ✅ SOLUTION 1: Créer fallback simple en premier
      console.log('[NpcSpriteManager] 🎨 Création fallback simple...');
      await this.createSimpleFallback();
      
      // ✅ Si on veut vraiment un sprite sheet, essayer la méthode alternative
      if (this.config.createFallbackAsSheet) {
        console.log('[NpcSpriteManager] 🎞️ Tentative création sprite sheet fallback...');
        try {
          await this.createFallbackSpriteSheet();
        } catch (sheetError) {
          console.warn('[NpcSpriteManager] ⚠️ Échec sprite sheet, utilisation fallback simple:', sheetError.message);
          // Le fallback simple est déjà créé
        }
      }
      
    } catch (error) {
      console.error('[NpcSpriteManager] ❌ Erreur création fallback:', error);
      // Essayer une méthode encore plus simple
      this.createEmergencyFallback();
    }
  }

  // ✅ NOUVELLE MÉTHODE : Fallback simple compatible
  async createSimpleFallback() {
    console.log('[NpcSpriteManager] 🎨 Création fallback simple compatible...');
    
    try {
      const key = this.config.fallbackSprite;
      
      if (this.scene.textures.exists(key)) {
        this.scene.textures.remove(key);
      }
      
      // ✅ Utiliser la méthode Canvas HTML5 directement
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      
      // ✅ Dessiner le sprite fallback
      // Corps
      ctx.fillStyle = '#4169E1';
      ctx.fillRect(4, 8, 24, 16);
      
      // Tête
      ctx.fillStyle = '#FFDBB0';
      ctx.beginPath();
      ctx.arc(16, 12, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Yeux
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(13, 10, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(19, 10, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Chapeau
      ctx.fillStyle = '#FF4444';
      ctx.fillRect(8, 4, 16, 3);
      
      // Jambes
      ctx.fillStyle = '#2E8B57';
      ctx.fillRect(12, 20, 8, 10);
      
      // Bordure
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 30, 30);
      
      // Texte
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('NPC', 16, 28);
      
      // ✅ Créer la texture à partir du canvas
      const dataURL = canvas.toDataURL();
      
      return new Promise((resolve, reject) => {
        const onComplete = () => {
          this.loadedSprites.add(key);
          this.stats.fallbackCreated++;
          console.log('[NpcSpriteManager] ✅ Fallback simple créé:', key);
          resolve();
        };
        
        const onError = (fileObj) => {
          if (fileObj.key === key) {
            console.error('[NpcSpriteManager] ❌ Erreur création fallback simple:', key);
            reject(new Error(`Failed to create simple fallback: ${key}`));
          }
        };
        
        this.scene.load.once('filecomplete-image-' + key, onComplete);
        this.scene.load.once('loaderror', onError);
        
        // ✅ Charger comme image normale
        this.scene.load.image(key, dataURL);
        
        if (!this.scene.load.isLoading()) {
          this.scene.load.start();
        }
      });
      
    } catch (error) {
      console.error('[NpcSpriteManager] ❌ Erreur création fallback simple:', error);
      throw error;
    }
  }

  // ✅ NOUVELLE MÉTHODE : Sprite sheet fallback alternatif
  async createFallbackSpriteSheet() {
    console.log('[NpcSpriteManager] 🎞️ === CRÉATION FALLBACK SPRITE SHEET ALTERNATIF ===');
    
    try {
      const key = this.config.fallbackSprite + '_sheet';
      const structure = this.config.fallbackSheetStructure;
      
      if (this.scene.textures.exists(key)) {
        this.scene.textures.remove(key);
      }
      
      // ✅ Créer canvas pour le sprite sheet
      const totalWidth = structure.frameWidth * structure.cols;
      const totalHeight = structure.frameHeight * structure.rows;
      
      const canvas = document.createElement('canvas');
      canvas.width = totalWidth;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');
      
      console.log(`[NpcSpriteManager] 📐 Canvas sprite sheet: ${totalWidth}x${totalHeight}`);
      
      // ✅ Générer plusieurs frames
      for (let row = 0; row < structure.rows; row++) {
        for (let col = 0; col < structure.cols; col++) {
          const frameIndex = row * structure.cols + col;
          const x = col * structure.frameWidth;
          const y = row * structure.frameHeight;
          
          this.drawFallbackFrameOnCanvas(ctx, x, y, structure.frameWidth, structure.frameHeight, frameIndex);
        }
      }
      
      const dataURL = canvas.toDataURL();
      
      return new Promise((resolve, reject) => {
        const onSheetComplete = () => {
          // ✅ Remplacer le fallback simple par le sprite sheet
          if (this.scene.textures.exists(this.config.fallbackSprite)) {
            this.scene.textures.remove(this.config.fallbackSprite);
          }
          
          // ✅ Copier le sprite sheet vers la clé fallback principale
          const sheetTexture = this.scene.textures.get(key);
          this.scene.textures.addSpriteSheet(this.config.fallbackSprite, sheetTexture.source[0], {
            frameWidth: structure.frameWidth,
            frameHeight: structure.frameHeight
          });
          
          // ✅ Stocker la structure
          this.spriteStructures.set(this.config.fallbackSprite, structure);
          
          console.log('[NpcSpriteManager] ✅ Fallback sprite sheet créé avec succès');
          resolve();
        };
        
        const onSheetError = (fileObj) => {
          if (fileObj.key === key) {
            console.error('[NpcSpriteManager] ❌ Erreur création sprite sheet fallback');
            reject(new Error(`Failed to create fallback spritesheet: ${key}`));
          }
        };
        
        this.scene.load.once('filecomplete-spritesheet-' + key, onSheetComplete);
        this.scene.load.once('loaderror', onSheetError);
        
        // ✅ Charger comme spritesheet
        this.scene.load.spritesheet(key, dataURL, {
          frameWidth: structure.frameWidth,
          frameHeight: structure.frameHeight
        });
        
        if (!this.scene.load.isLoading()) {
          this.scene.load.start();
        }
      });
      
    } catch (error) {
      console.error('[NpcSpriteManager] ❌ Erreur création fallback sprite sheet:', error);
      throw error;
    }
  }

  // ✅ NOUVELLE MÉTHODE : Dessiner frame sur canvas
  drawFallbackFrameOnCanvas(ctx, x, y, width, height, frameIndex) {
    // ✅ Couleurs variables selon le frame
    const hue = (frameIndex * 30) % 360;
    const hslColor = this.hslToRgb(hue / 360, 0.3, 0.8);
    const bodyColor = `rgb(${Math.round(hslColor.r * 255)}, ${Math.round(hslColor.g * 255)}, ${Math.round(hslColor.b * 255)})`;
    
    // ✅ Corps
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x + 4, y + 8, width - 8, height - 16);
    
    // ✅ Tête
    ctx.fillStyle = '#FFDBB0';
    ctx.beginPath();
    ctx.arc(x + width/2, y + 6, width/4, 0, Math.PI * 2);
    ctx.fill();
    
    // ✅ Yeux
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x + width/2 - 3, y + 4, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + width/2 + 3, y + 4, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // ✅ Numéro du frame
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '6px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(frameIndex.toString(), x + width/2, y + height - 4);
  }

  // ✅ MÉTHODE UTILITAIRE : Conversion HSL vers RGB
  hslToRgb(h, s, l) {
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return { r, g, b };
  }

  // ✅ NOUVELLE MÉTHODE : Fallback d'urgence
  createEmergencyFallback() {
    console.log('[NpcSpriteManager] 🚨 Création fallback d\'urgence...');
    
    try {
      const key = this.config.fallbackSprite;
      
      // ✅ Créer une texture 1x1 pixel simple
      if (this.scene.textures.exists(key)) {
        this.scene.textures.remove(key);
      }
      
      // ✅ Méthode la plus simple possible
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      
      // ✅ Rectangle simple
      ctx.fillStyle = '#4169E1';
      ctx.fillRect(0, 0, 32, 32);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('?', 16, 20);
      
      const dataURL = canvas.toDataURL();
      
      // ✅ Créer texture directement
      this.scene.textures.addBase64(key, dataURL);
      this.loadedSprites.add(key);
      this.stats.fallbackCreated++;
      
      console.log('[NpcSpriteManager] ✅ Fallback d\'urgence créé');
      
    } catch (error) {
      console.error('[NpcSpriteManager] ❌ Impossible de créer fallback d\'urgence:', error);
    }
  }

  // ✅ MÉTHODES RESTANTES (inchangées)
  async preloadSprites(spriteList) {
    console.log(`[NpcSpriteManager] 📦 Pré-chargement de ${spriteList.length} sprites...`);
    
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
    console.log('[NpcSpriteManager] 📊 === STATISTIQUES CORRIGÉES ===');
    console.table(this.stats);
    console.log('📦 Sprites chargés:', Array.from(this.loadedSprites));
    console.log('❌ Sprites en échec:', Array.from(this.failedSprites));
    console.log('⏳ Sprites en cours:', Array.from(this.loadingSprites.keys()));
    console.log('🎞️ Sprite sheets détectés:', this.spriteStructures.size);
    
    if (this.spriteStructures.size > 0) {
      console.log('📊 Structures détectées:');
      this.spriteStructures.forEach((structure, spriteKey) => {
        console.log(`  ${spriteKey}: ${structure.name} (${structure.frameWidth}x${structure.frameHeight})`);
      });
    }
  }

  cleanupUnusedSprites(activeSprites = []) {
    console.log('[NpcSpriteManager] 🧹 Nettoyage sprites inutilisés...');
    
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
      this.spriteStructures.delete(spriteKey);
    });
    
    console.log(`[NpcSpriteManager] ✅ ${cleaned} sprites nettoyés`);
    return cleaned;
  }

  destroy() {
    console.log('[NpcSpriteManager] 💀 Destruction...');
    
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
    console.log('[NpcSpriteManager] === DEBUG INFO CORRIGÉ ===');
    console.table(info.stats);
    console.log('[NpcSpriteManager] Info complète:', info);
    return info;
  } else {
    console.error('[NpcSpriteManager] Manager non trouvé');
    return null;
  }
};

console.log('✅ NpcSpriteManager CORRIGÉ chargé!');
console.log('🔍 Utilisez window.debugNpcSpriteManager() pour diagnostiquer');
