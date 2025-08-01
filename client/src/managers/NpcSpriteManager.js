// client/src/managers/NpcSpriteManager.js
// ✅ Manager pour gérer les sprites NPCs dynamiques - VERSION CORRIGÉE AVEC LOGS APPROFONDIS
// 🔧 CORRECTION: generateTexture + Logs [SPRITEMANAGER]

import { SpriteUtils } from '../utils/SpriteUtils.js';

export class NpcSpriteManager {
  constructor(scene) {
    console.log('[SPRITEMANAGER] 🚀 === CONSTRUCTION SPRITE MANAGER ===');
    console.log('[SPRITEMANAGER] 📊 Scène reçue:', scene?.scene?.key || 'AUCUNE');
    
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
    
    console.log('[SPRITEMANAGER] ✅ Sprite Manager créé avec config:', this.config);
    console.log('[SPRITEMANAGER] 📊 Stats initiales:', this.stats);
  }

  // ✅ INITIALISATION AVEC LOGS APPROFONDIS
  initialize() {
    console.log('[SPRITEMANAGER] 🔥 === INITIALISATION SPRITE MANAGER ===');
    
    if (this.isInitialized) {
      console.log('[SPRITEMANAGER] ⚠️ Déjà initialisé, skip');
      return this;
    }
    
    console.log('[SPRITEMANAGER] 🔍 Vérification scène...');
    if (!this.scene || !this.scene.load) {
      console.error('[SPRITEMANAGER] ❌ Scène non prête pour chargement:', {
        scene: !!this.scene,
        load: !!this.scene?.load,
        textures: !!this.scene?.textures
      });
      return this;
    }
    console.log('[SPRITEMANAGER] ✅ Scène valide pour chargement');
    
    console.log('[SPRITEMANAGER] 🎨 Pré-chargement fallback...');
    this.preloadFallbackSprite();
    
    this.isInitialized = true;
    console.log('[SPRITEMANAGER] ✅ Initialisation terminée avec succès');
    
    return this;
  }

  // ✅ PRÉ-CHARGEMENT FALLBACK AVEC LOGS APPROFONDIS
  async preloadFallbackSprite() {
    console.log('[SPRITEMANAGER] 🎯 === PRÉ-CHARGEMENT FALLBACK ===');
    
    const fallbackKey = this.config.fallbackSprite;
    console.log('[SPRITEMANAGER] 🔑 Clé fallback:', fallbackKey);
    
    if (this.scene.textures.exists(fallbackKey)) {
      console.log('[SPRITEMANAGER] ✅ Sprite fallback déjà chargé');
      this.loadedSprites.add(fallbackKey);
      return;
    }
    
    console.log('[SPRITEMANAGER] 🔍 Fallback non trouvé, création nécessaire');
    
    try {
      console.log('[SPRITEMANAGER] 🚀 Tentative chargement fallback externe...');
      
      const fallbackResult = await this.loadNpcSprite(fallbackKey).catch((error) => {
        console.log('[SPRITEMANAGER] ⚠️ Chargement externe échoué:', error.message);
        return null;
      });
      
      if (fallbackResult && fallbackResult.success) {
        console.log('[SPRITEMANAGER] ✅ Fallback externe chargé avec succès');
        return;
      }
      
      console.log('[SPRITEMANAGER] 🎨 Création fallback graphique nécessaire...');
      await this.createDefaultFallback();
      
    } catch (error) {
      console.error('[SPRITEMANAGER] ❌ Erreur setup fallback:', error);
      console.log('[SPRITEMANAGER] 🔄 Tentative création fallback de secours...');
      await this.createDefaultFallback();
    }
  }

  // ✅ CHARGEMENT SPRITE AVEC LOGS APPROFONDIS
  async loadNpcSprite(spriteKey) {
    console.log(`[SPRITEMANAGER] 📥 === CHARGEMENT SPRITE "${spriteKey}" ===`);
    
    this.stats.totalRequested++;
    console.log('[SPRITEMANAGER] 📊 Stats requêtes:', { total: this.stats.totalRequested });
    
    // ✅ Vérifier si déjà chargé
    if (this.isSpriteCached(spriteKey)) {
      console.log(`[SPRITEMANAGER] ⚡ Sprite en cache: ${spriteKey}`);
      this.stats.cached++;
      return { success: true, spriteKey, fromCache: true };
    }
    
    // ✅ Vérifier si déjà en cours de chargement
    if (this.loadingSprites.has(spriteKey)) {
      console.log(`[SPRITEMANAGER] ⏳ Sprite en cours de chargement: ${spriteKey}`);
      return await this.loadingSprites.get(spriteKey);
    }
    
    // ✅ Vérifier si déjà en échec
    if (this.failedSprites.has(spriteKey)) {
      console.log(`[SPRITEMANAGER] ❌ Sprite déjà en échec: ${spriteKey}`);
      return this.getFallbackResult(spriteKey);
    }
    
    console.log(`[SPRITEMANAGER] 🔄 Démarrage chargement: ${spriteKey}`);
    
    // ✅ Créer promesse de chargement avec détection sprite sheet
    const loadingPromise = this.performSpriteSheetLoad(spriteKey);
    this.loadingSprites.set(spriteKey, loadingPromise);
    
    try {
      const result = await loadingPromise;
      this.loadingSprites.delete(spriteKey);
      console.log(`[SPRITEMANAGER] ✅ Chargement réussi: ${spriteKey}`, result);
      return result;
      
    } catch (error) {
      console.error(`[SPRITEMANAGER] ❌ Erreur chargement ${spriteKey}:`, error);
      this.loadingSprites.delete(spriteKey);
      this.failedSprites.add(spriteKey);
      this.stats.failed++;
      return this.getFallbackResult(spriteKey);
    }
  }

  // ✅ CHARGEMENT SPRITE SHEET AVEC LOGS APPROFONDIS
  async performSpriteSheetLoad(spriteKey) {
    return new Promise(async (resolve, reject) => {
      console.log(`[SPRITEMANAGER] 🔍 === DÉTECTION SPRITE SHEET: ${spriteKey} ===`);
      
      // ✅ Charger l'image pour analyser sa structure
      const hasExtension = spriteKey.endsWith('.png') || spriteKey.endsWith('.jpg') || spriteKey.endsWith('.jpeg');
      const spritePath = hasExtension 
        ? `${this.config.spritePath}${spriteKey}`
        : `${this.config.spritePath}${spriteKey}${this.config.spriteExtension}`;
      
      console.log(`[SPRITEMANAGER] 📁 Chemin analysé:`, {
        spriteKey,
        hasExtension,
        finalPath: spritePath
      });
      
      try {
        console.log(`[SPRITEMANAGER] 🔬 Analyse structure image...`);
        const imageStructure = await this.analyzeImageStructure(spritePath, spriteKey);
        
        console.log(`[SPRITEMANAGER] 📊 Résultat analyse:`, {
          width: imageStructure.width,
          height: imageStructure.height,
          isSpriteSheet: imageStructure.isSpriteSheet,
          structure: imageStructure.structure
        });
        
        // ✅ Charger selon le type détecté
        if (imageStructure.isSpriteSheet) {
          console.log(`[SPRITEMANAGER] 🎞️ Sprite sheet détecté: ${imageStructure.structure.name}`);
          this.stats.spriteSheetsDetected++;
          await this.loadAsSpriteSheet(spriteKey, spritePath, imageStructure.structure);
        } else {
          console.log(`[SPRITEMANAGER] 🖼️ Image simple détectée`);
          this.stats.simpleImagesLoaded++;
          await this.loadAsSimpleImage(spriteKey, spritePath);
        }
        
        // ✅ Stocker la structure pour usage ultérieur
        if (imageStructure.isSpriteSheet) {
          this.spriteStructures.set(spriteKey, imageStructure.structure);
          console.log(`[SPRITEMANAGER] 💾 Structure stockée pour: ${spriteKey}`);
        }
        
        console.log(`[SPRITEMANAGER] ✅ Chargement réussi: ${spriteKey}`);
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
        console.error(`[SPRITEMANAGER] ❌ Erreur analyse/chargement ${spriteKey}:`, error);
        reject(error);
      }
    });
  }

  // ✅ ANALYSE STRUCTURE AVEC LOGS APPROFONDIS
  async analyzeImageStructure(imagePath, spriteKey) {
    console.log(`[SPRITEMANAGER] 🔬 === ANALYSE STRUCTURE IMAGE ===`);
    console.log(`[SPRITEMANAGER] 📁 Chemin: ${imagePath}`);
    console.log(`[SPRITEMANAGER] 🔑 Clé: ${spriteKey}`);
    
    return new Promise((resolve, reject) => {
      const tempImage = new Image();
      
      const timeoutId = setTimeout(() => {
        console.error(`[SPRITEMANAGER] ⏰ Timeout analyse ${spriteKey} après 5s`);
        reject(new Error(`Timeout analyzing image: ${spriteKey}`));
      }, 5000);
      
      tempImage.onload = () => {
        console.log(`[SPRITEMANAGER] ✅ Image chargée pour analyse`);
        clearTimeout(timeoutId);
        
        const width = tempImage.width;
        const height = tempImage.height;
        
        console.log(`[SPRITEMANAGER] 📐 Dimensions image ${spriteKey}: ${width}x${height}`);
        
        const structure = this.detectNpcSpriteStructure(width, height, spriteKey);
        const isSpriteSheet = structure.cols > 1 || structure.rows > 1;
        
        console.log(`[SPRITEMANAGER] 🔍 Analyse terminée:`, {
          isSpriteSheet,
          structure: isSpriteSheet ? structure.name : 'Image simple'
        });
        
        resolve({
          width,
          height,
          isSpriteSheet,
          structure: isSpriteSheet ? structure : null
        });
      };
      
      tempImage.onerror = (error) => {
        console.error(`[SPRITEMANAGER] ❌ Erreur chargement image pour analyse:`, {
          imagePath,
          spriteKey,
          error
        });
        clearTimeout(timeoutId);
        reject(new Error(`Failed to load image for analysis: ${imagePath}`));
      };
      
      console.log(`[SPRITEMANAGER] 🚀 Démarrage chargement image temporaire...`);
      tempImage.src = imagePath;
    });
  }

  // ✅ DÉTECTION STRUCTURE AVEC LOGS APPROFONDIS
  detectNpcSpriteStructure(width, height, spriteKey) {
    console.log(`[SPRITEMANAGER] 🔍 === DÉTECTION STRUCTURE NPC ===`);
    console.log(`[SPRITEMANAGER] 📐 Dimensions: ${width}x${height}`);
    console.log(`[SPRITEMANAGER] 🔑 Sprite: ${spriteKey}`);
    
    const npcPatterns = [
      { cols: 4, rows: 4, name: 'NPC Standard (4x4)', priority: 100 },
      { cols: 3, rows: 4, name: 'NPC Compact (3x4)', priority: 90 },
      { cols: 4, rows: 3, name: 'NPC Alt (4x3)', priority: 80 },
      { cols: 4, rows: 1, name: 'NPC WalkSprite (4x1)', priority: 70 },
      { cols: 3, rows: 1, name: 'NPC Simple (3x1)', priority: 60 },
      { cols: 2, rows: 2, name: 'NPC Mini (2x2)', priority: 50 },
      { cols: 1, rows: 1, name: 'NPC Single (1x1)', priority: 10 }
    ];
    
    console.log(`[SPRITEMANAGER] 🔍 Test de ${npcPatterns.length} patterns...`);
    
    const validStructures = [];
    
    for (const pattern of npcPatterns) {
      const frameW = width / pattern.cols;
      const frameH = height / pattern.rows;
      
      if (frameW % 1 === 0 && frameH % 1 === 0) {
        let score = pattern.priority;
        
        // Bonus pour dimensions réalistes
        if (frameW >= 16 && frameW <= 64 && frameH >= 16 && frameH <= 64) {
          score += 30;
        }
        
        // Bonus pour aspect ratio proche de 1:1
        const aspectRatio = frameW / frameH;
        if (aspectRatio >= 0.8 && aspectRatio <= 1.2) {
          score += 20;
        }
        
        // Bonus pour tailles multiples de 8
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
        
        console.log(`[SPRITEMANAGER] ✅ Pattern valide: ${pattern.name} (score: ${score})`);
      } else {
        console.log(`[SPRITEMANAGER] ❌ Pattern invalide: ${pattern.name} (dimensions non entières)`);
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
    
    console.log(`[SPRITEMANAGER] 🏆 Meilleure structure détectée:`, {
      name: best.name,
      score: best.score,
      frameSize: `${best.frameWidth}x${best.frameHeight}`,
      grid: `${best.cols}x${best.rows}`,
      totalFrames: best.totalFrames
    });
    
    return best;
  }

  // ✅ CHARGEMENT SPRITE SHEET AVEC LOGS APPROFONDIS
  async loadAsSpriteSheet(spriteKey, spritePath, structure) {
    return new Promise((resolve, reject) => {
      console.log(`[SPRITEMANAGER] 🎞️ === CHARGEMENT SPRITE SHEET ===`);
      console.log(`[SPRITEMANAGER] 🔑 Clé: ${spriteKey}`);
      console.log(`[SPRITEMANAGER] 📁 Chemin: ${spritePath}`);
      console.log(`[SPRITEMANAGER] 📊 Structure:`, {
        frameSize: `${structure.frameWidth}x${structure.frameHeight}`,
        grid: `${structure.cols}x${structure.rows}`,
        totalFrames: structure.totalFrames
      });
      
      const timeoutId = setTimeout(() => {
        console.error(`[SPRITEMANAGER] ⏰ Timeout chargement sprite sheet ${spriteKey} après 10s`);
        this.cleanupLoadHandlers(spriteKey);
        reject(new Error(`Timeout loading spritesheet: ${spriteKey}`));
      }, 10000);
      
      const onSuccess = () => {
        console.log(`[SPRITEMANAGER] ✅ Sprite sheet chargé avec succès: ${spriteKey}`);
        clearTimeout(timeoutId);
        this.cleanupLoadHandlers(spriteKey);
        resolve();
      };
      
      const onError = (fileObj) => {
        if (fileObj.key === spriteKey) {
          console.error(`[SPRITEMANAGER] ❌ Erreur chargement sprite sheet: ${spriteKey}`, fileObj);
          clearTimeout(timeoutId);
          this.cleanupLoadHandlers(spriteKey);
          reject(new Error(`Failed to load spritesheet: ${spriteKey}`));
        }
      };
      
      this.activeLoadHandlers.set(spriteKey, { onSuccess, onError });
      
      console.log(`[SPRITEMANAGER] 🔗 Configuration event listeners...`);
      this.scene.load.once('filecomplete-spritesheet-' + spriteKey, onSuccess);
      this.scene.load.once('loaderror', onError);
      
      try {
        console.log(`[SPRITEMANAGER] 🚀 Démarrage chargement sprite sheet...`);
        this.scene.load.spritesheet(spriteKey, spritePath, {
          frameWidth: structure.frameWidth,
          frameHeight: structure.frameHeight
        });
        
        if (!this.scene.load.isLoading()) {
          console.log(`[SPRITEMANAGER] ▶️ Démarrage loader Phaser...`);
          this.scene.load.start();
        } else {
          console.log(`[SPRITEMANAGER] ⏳ Loader Phaser déjà en cours...`);
        }
        
      } catch (error) {
        console.error(`[SPRITEMANAGER] ❌ Erreur setup sprite sheet ${spriteKey}:`, error);
        clearTimeout(timeoutId);
        this.cleanupLoadHandlers(spriteKey);
        reject(error);
      }
    });
  }

  // ✅ CHARGEMENT IMAGE SIMPLE AVEC LOGS APPROFONDIS
  async loadAsSimpleImage(spriteKey, spritePath) {
    return new Promise((resolve, reject) => {
      console.log(`[SPRITEMANAGER] 🖼️ === CHARGEMENT IMAGE SIMPLE ===`);
      console.log(`[SPRITEMANAGER] 🔑 Clé: ${spriteKey}`);
      console.log(`[SPRITEMANAGER] 📁 Chemin: ${spritePath}`);
      
      const timeoutId = setTimeout(() => {
        console.error(`[SPRITEMANAGER] ⏰ Timeout chargement image ${spriteKey} après 10s`);
        this.cleanupLoadHandlers(spriteKey);
        reject(new Error(`Timeout loading image: ${spriteKey}`));
      }, 10000);
      
      const onSuccess = () => {
        console.log(`[SPRITEMANAGER] ✅ Image simple chargée avec succès: ${spriteKey}`);
        clearTimeout(timeoutId);
        this.cleanupLoadHandlers(spriteKey);
        resolve();
      };
      
      const onError = (fileObj) => {
        if (fileObj.key === spriteKey) {
          console.error(`[SPRITEMANAGER] ❌ Erreur chargement image: ${spriteKey}`, fileObj);
          clearTimeout(timeoutId);
          this.cleanupLoadHandlers(spriteKey);
          reject(new Error(`Failed to load image: ${spriteKey}`));
        }
      };
      
      this.activeLoadHandlers.set(spriteKey, { onSuccess, onError });
      
      console.log(`[SPRITEMANAGER] 🔗 Configuration event listeners...`);
      this.scene.load.once('filecomplete-image-' + spriteKey, onSuccess);
      this.scene.load.once('loaderror', onError);
      
      try {
        console.log(`[SPRITEMANAGER] 🚀 Démarrage chargement image...`);
        this.scene.load.image(spriteKey, spritePath);
        
        if (!this.scene.load.isLoading()) {
          console.log(`[SPRITEMANAGER] ▶️ Démarrage loader Phaser...`);
          this.scene.load.start();
        } else {
          console.log(`[SPRITEMANAGER] ⏳ Loader Phaser déjà en cours...`);
        }
        
      } catch (error) {
        console.error(`[SPRITEMANAGER] ❌ Erreur setup image ${spriteKey}:`, error);
        clearTimeout(timeoutId);
        this.cleanupLoadHandlers(spriteKey);
        reject(error);
      }
    });
  }

  // ✅ CRÉATION FALLBACK CORRIGÉE AVEC LOGS APPROFONDIS
  async createDefaultFallback() {
    console.log('[SPRITEMANAGER] 🎨 === CRÉATION FALLBACK CORRIGÉE ===');
    
    try {
      const key = this.config.fallbackSprite;
      console.log(`[SPRITEMANAGER] 🔑 Clé fallback: ${key}`);
      
      if (this.scene.textures.exists(key)) {
        console.log(`[SPRITEMANAGER] 🗑️ Suppression texture existante: ${key}`);
        this.scene.textures.remove(key);
      }
      
      console.log(`[SPRITEMANAGER] 🔍 Vérification support textures...`);
      if (!this.scene.textures || !this.scene.textures.createCanvas) {
        console.error(`[SPRITEMANAGER] ❌ Support textures manquant`);
        throw new Error('Texture support not available');
      }
      
      const structure = this.config.fallbackSheetStructure;
      const totalWidth = structure.frameWidth * structure.cols;
      const totalHeight = structure.frameHeight * structure.rows;
      
      console.log(`[SPRITEMANAGER] 📐 Dimensions calculées:`, {
        frameSize: `${structure.frameWidth}x${structure.frameHeight}`,
        grid: `${structure.cols}x${structure.rows}`,
        totalSize: `${totalWidth}x${totalHeight}`
      });
      
      // ✅ FIX PRINCIPAL: Créer texture canvas directement
      console.log(`[SPRITEMANAGER] 🎨 Création texture canvas...`);
      const texture = this.scene.textures.createCanvas(key, totalWidth, totalHeight);
      
      if (!texture) {
        console.error(`[SPRITEMANAGER] ❌ Impossible de créer texture canvas`);
        throw new Error('Failed to create canvas texture');
      }
      
      console.log(`[SPRITEMANAGER] ✅ Texture canvas créée: ${key}`);
      
      const ctx = texture.getContext();
      if (!ctx) {
        console.error(`[SPRITEMANAGER] ❌ Impossible d'obtenir contexte canvas`);
        throw new Error('Failed to get canvas context');
      }
      
      console.log(`[SPRITEMANAGER] ✅ Contexte canvas obtenu`);
      
      // ✅ Générer plusieurs frames avec des variations
      console.log(`[SPRITEMANAGER] 🎭 Génération de ${structure.cols * structure.rows} frames...`);
      
      for (let row = 0; row < structure.rows; row++) {
        for (let col = 0; col < structure.cols; col++) {
          const frameIndex = row * structure.cols + col;
          const x = col * structure.frameWidth;
          const y = row * structure.frameHeight;
          
          console.log(`[SPRITEMANAGER] 🎨 Frame ${frameIndex}: position (${x}, ${y})`);
          this.drawFallbackFrameOnCanvas(ctx, x, y, structure.frameWidth, structure.frameHeight, frameIndex);
        }
      }
      
      console.log(`[SPRITEMANAGER] 🔄 Rafraîchissement texture...`);
      texture.refresh();
      
      // ✅ Maintenant convertir en spritesheet
      console.log(`[SPRITEMANAGER] 🎞️ Conversion en sprite sheet...`);
      
      // Obtenir les données de la texture
      const canvas = texture.source[0].image;
      const dataURL = canvas.toDataURL();
      
      console.log(`[SPRITEMANAGER] 📊 Données canvas obtenues, taille: ${dataURL.length} caractères`);
      
      // Supprimer la texture simple pour la remplacer par sprite sheet
      this.scene.textures.remove(key);
      
      return new Promise((resolve, reject) => {
        console.log(`[SPRITEMANAGER] 🔗 Configuration sprite sheet loader...`);
        
        const onSheetComplete = () => {
          console.log(`[SPRITEMANAGER] ✅ Fallback sprite sheet créé avec succès: ${key}`);
          
          // ✅ Stocker la structure du fallback
          this.spriteStructures.set(key, structure);
          this.loadedSprites.add(key);
          this.stats.fallbackCreated++;
          
          console.log(`[SPRITEMANAGER] 💾 Structure fallback stockée`);
          console.log(`[SPRITEMANAGER] 📊 Stats mises à jour:`, {
            fallbackCreated: this.stats.fallbackCreated,
            totalLoaded: this.loadedSprites.size
          });
          
          resolve();
        };
        
        const onSheetError = (fileObj) => {
          if (fileObj.key === key) {
            console.error(`[SPRITEMANAGER] ❌ Erreur création sprite sheet fallback: ${key}`, fileObj);
            reject(new Error(`Failed to create fallback spritesheet: ${key}`));
          }
        };
        
        this.scene.load.once('filecomplete-spritesheet-' + key, onSheetComplete);
        this.scene.load.once('loaderror', onSheetError);
        
        console.log(`[SPRITEMANAGER] 🚀 Chargement sprite sheet fallback...`);
        
        // ✅ Charger comme spritesheet
        this.scene.load.spritesheet(key, dataURL, {
          frameWidth: structure.frameWidth,
          frameHeight: structure.frameHeight
        });
        
        if (!this.scene.load.isLoading()) {
          console.log(`[SPRITEMANAGER] ▶️ Démarrage loader pour fallback...`);
          this.scene.load.start();
        } else {
          console.log(`[SPRITEMANAGER] ⏳ Loader déjà en cours pour fallback...`);
        }
      });
      
    } catch (error) {
      console.error('[SPRITEMANAGER] ❌ Erreur création fallback sprite sheet:', error);
      
      // ✅ Fallback du fallback : créer une image simple
      console.log('[SPRITEMANAGER] 🔄 Tentative fallback simple...');
      await this.createSimpleFallback();
    }
  }

  // ✅ NOUVELLE MÉTHODE: Dessiner frame sur canvas avec logs
  drawFallbackFrameOnCanvas(ctx, x, y, width, height, frameIndex) {
    console.log(`[SPRITEMANAGER] 🎨 Dessin frame ${frameIndex} à (${x}, ${y}) taille ${width}x${height}`);
    
    try {
      // ✅ Couleurs variables selon le frame
      const hue = (frameIndex * 30) % 360;
      const bodyColor = this.hsvToRgb(hue / 360, 0.3, 0.8);
      const headColor = '#FFDBAC';
      
      // ✅ Corps
      ctx.fillStyle = `rgb(${bodyColor.r}, ${bodyColor.g}, ${bodyColor.b})`;
      this.fillRoundedRect(ctx, x + 4, y + 8, width - 8, height - 16, 2);
      
      // ✅ Tête
      ctx.fillStyle = headColor;
      ctx.beginPath();
      ctx.arc(x + width/2, y + 6, width/4, 0, 2 * Math.PI);
      ctx.fill();
      
      // ✅ Yeux
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(x + width/2 - 3, y + 4, 1, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + width/2 + 3, y + 4, 1, 0, 2 * Math.PI);
      ctx.fill();
      
      // ✅ Numéro du frame (debug)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 6px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(frameIndex.toString(), x + width/2, y + height - 4);
      
      console.log(`[SPRITEMANAGER] ✅ Frame ${frameIndex} dessiné`);
      
    } catch (error) {
      console.error(`[SPRITEMANAGER] ❌ Erreur dessin frame ${frameIndex}:`, error);
    }
  }

  // ✅ FALLBACK SIMPLE CORRIGÉ AVEC LOGS APPROFONDIS
  async createSimpleFallback() {
    console.log('[SPRITEMANAGER] 🎨 === CRÉATION FALLBACK SIMPLE CORRIGÉ ===');
    
    try {
      const key = this.config.fallbackSprite;
      console.log(`[SPRITEMANAGER] 🔑 Clé fallback simple: ${key}`);
      
      if (this.scene.textures.exists(key)) {
        console.log(`[SPRITEMANAGER] 🗑️ Suppression texture existante: ${key}`);
        this.scene.textures.remove(key);
      }
      
      console.log(`[SPRITEMANAGER] 🎨 Création texture canvas 32x32...`);
      const texture = this.scene.textures.createCanvas(key, 32, 32);
      
      if (!texture) {
        console.error(`[SPRITEMANAGER] ❌ Impossible de créer texture canvas simple`);
        throw new Error('Failed to create simple canvas texture');
      }
      
      const ctx = texture.getContext();
      
      if (!ctx) {
        console.error(`[SPRITEMANAGER] ❌ Impossible d'obtenir contexte canvas simple`);
        throw new Error('Failed to get simple canvas context');
      }
      
      console.log(`[SPRITEMANAGER] 🎭 Dessin NPC simple...`);
      
      // ✅ Dessiner directement sur le canvas
      // Corps bleu
      ctx.fillStyle = '#4169E1';
      this.fillRoundedRect(ctx, 4, 8, 24, 16, 2);
      
      // Tête
      ctx.fillStyle = '#FFDBAC';
      ctx.beginPath();
      ctx.arc(16, 12, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Yeux
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(13, 10, 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(19, 10, 2, 0, 2 * Math.PI);
      ctx.fill();
      
      // Chapeau rouge
      ctx.fillStyle = '#FF4444';
      ctx.fillRect(8, 4, 16, 3);
      
      // Jambes vertes
      ctx.fillStyle = '#2E8B57';
      this.fillRoundedRect(ctx, 12, 20, 8, 10, 2);
      
      // Bordure blanche
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      this.strokeRoundedRect(ctx, 1, 1, 30, 30, 4);
      
      // Texte NPC
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('NPC', 16, 28);
      
      console.log(`[SPRITEMANAGER] 🔄 Rafraîchissement texture simple...`);
      texture.refresh();
      
      this.loadedSprites.add(key);
      this.stats.fallbackCreated++;
      
      console.log(`[SPRITEMANAGER] ✅ Fallback simple créé avec succès: ${key}`);
      console.log(`[SPRITEMANAGER] 📊 Stats finales:`, {
        fallbackCreated: this.stats.fallbackCreated,
        totalLoaded: this.loadedSprites.size
      });
      
    } catch (error) {
      console.error('[SPRITEMANAGER] ❌ Erreur création fallback simple:', error);
      throw error;
    }
  }

  // ✅ MÉTHODES UTILITAIRES AVEC LOGS
  
  async getSpriteKeyToUse(requestedSprite) {
    console.log(`[SPRITEMANAGER] 🎯 === OBTENTION CLÉ SPRITE ===`);
    console.log(`[SPRITEMANAGER] 🔍 Sprite demandé: "${requestedSprite}"`);
    
    if (!requestedSprite) {
      console.log('[SPRITEMANAGER] ⚠️ Pas de sprite demandé, utilisation fallback');
      await this.ensureFallbackReady();
      return this.config.fallbackSprite;
    }
    
    try {
      console.log(`[SPRITEMANAGER] 🚀 Chargement sprite: ${requestedSprite}`);
      const result = await this.loadNpcSprite(requestedSprite);
      
      if (result.success) {
        console.log(`[SPRITEMANAGER] ✅ Sprite obtenu: ${result.spriteKey}`);
        
        const isReallyAvailable = await this.validateSpriteAvailability(result.spriteKey);
        
        if (isReallyAvailable) {
          console.log(`[SPRITEMANAGER] ✅ Sprite validé et disponible: ${result.spriteKey}`);
          return result.spriteKey;
        } else {
          console.warn(`[SPRITEMANAGER] ⚠️ Sprite ${result.spriteKey} signalé comme chargé mais pas disponible`);
          await this.ensureFallbackReady();
          return this.config.fallbackSprite;
        }
        
      } else {
        console.log(`[SPRITEMANAGER] 🔄 Utilisation fallback pour: ${requestedSprite}`);
        await this.ensureFallbackReady();
        return this.config.fallbackSprite;
      }
      
    } catch (error) {
      console.error(`[SPRITEMANAGER] ❌ Erreur getSpriteKeyToUse pour ${requestedSprite}:`, error);
      await this.ensureFallbackReady();
      return this.config.fallbackSprite;
    }
  }

  async validateSpriteAvailability(spriteKey, maxWaitMs = 2000) {
    console.log(`[SPRITEMANAGER] 🔍 === VALIDATION DISPONIBILITÉ ===`);
    console.log(`[SPRITEMANAGER] 🔑 Sprite: ${spriteKey}`);
    console.log(`[SPRITEMANAGER] ⏱️ Timeout: ${maxWaitMs}ms`);
    
    if (this.scene.textures.exists(spriteKey)) {
      console.log(`[SPRITEMANAGER] ✅ Sprite immédiatement disponible: ${spriteKey}`);
      return true;
    }
    
    console.log(`[SPRITEMANAGER] ⏳ Attente sprite ${spriteKey}...`);
    
    const startTime = Date.now();
    const checkInterval = 50;
    
    return new Promise((resolve) => {
      const checkAvailability = () => {
        if (this.scene.textures.exists(spriteKey)) {
          const elapsed = Date.now() - startTime;
          console.log(`[SPRITEMANAGER] ✅ Sprite ${spriteKey} disponible après ${elapsed}ms`);
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime >= maxWaitMs) {
          console.warn(`[SPRITEMANAGER] ⏰ Timeout validation ${spriteKey} après ${maxWaitMs}ms`);
          resolve(false);
          return;
        }
        
        setTimeout(checkAvailability, checkInterval);
      };
      
      checkAvailability();
    });
  }

  async ensureFallbackReady() {
    console.log(`[SPRITEMANAGER] 🛡️ === VÉRIFICATION FALLBACK ===`);
    
    const fallbackKey = this.config.fallbackSprite;
    console.log(`[SPRITEMANAGER] 🔑 Clé fallback: ${fallbackKey}`);
    
    if (this.scene.textures.exists(fallbackKey)) {
      console.log(`[SPRITEMANAGER] ✅ Fallback déjà disponible: ${fallbackKey}`);
      return true;
    }
    
    console.log(`[SPRITEMANAGER] 🎨 Création fallback nécessaire: ${fallbackKey}`);
    
    try {
      await this.createDefaultFallback();
      const isAvailable = await this.validateSpriteAvailability(fallbackKey, 1000);
      
      if (isAvailable) {
        this.loadedSprites.add(fallbackKey);
        console.log(`[SPRITEMANAGER] ✅ Fallback créé et validé: ${fallbackKey}`);
        return true;
      } else {
        console.error(`[SPRITEMANAGER] ❌ Impossible de créer fallback: ${fallbackKey}`);
        return false;
      }
      
    } catch (error) {
      console.error(`[SPRITEMANAGER] ❌ Erreur création fallback:`, error);
      return false;
    }
  }

  getSpriteSheetInfo(spriteKey) {
    console.log(`[SPRITEMANAGER] 📊 === INFO SPRITE SHEET ===`);
    console.log(`[SPRITEMANAGER] 🔑 Sprite: ${spriteKey}`);
    
    const structure = this.spriteStructures.get(spriteKey);
    
    // ✅ Si c'est le fallback et qu'il n'a pas de structure, utiliser la config
    if (!structure && spriteKey === this.config.fallbackSprite && this.config.createFallbackAsSheet) {
      const fallbackStructure = this.config.fallbackSheetStructure;
      console.log(`[SPRITEMANAGER] 🎞️ Info fallback sprite sheet:`, fallbackStructure);
      
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
      console.log(`[SPRITEMANAGER] 🖼️ Image simple: ${spriteKey}`);
      return {
        isSpriteSheet: false,
        frameCount: 1,
        defaultFrame: 0
      };
    }
    
    console.log(`[SPRITEMANAGER] 🎞️ Sprite sheet trouvé:`, structure);
    
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

  getDefaultFrameForSprite(spriteKey) {
    const structure = this.spriteStructures.get(spriteKey);
    
    if (!structure) {
      return 0;
    }
    
    return this.config.defaultFrame;
  }

  getFallbackResult(originalSpriteKey) {
    console.log(`[SPRITEMANAGER] 🔄 === RÉSULTAT FALLBACK ===`);
    console.log(`[SPRITEMANAGER] 🔍 Sprite original: ${originalSpriteKey}`);
    console.log(`[SPRITEMANAGER] 🛡️ Fallback utilisé: ${this.config.fallbackSprite}`);
    
    this.stats.fallbacksUsed++;
    
    return {
      success: false,
      spriteKey: this.config.fallbackSprite,
      originalSpriteKey,
      isFallback: true,
      reason: 'sprite_not_found'
    };
  }

  // ✅ MÉTHODES UTILITAIRES CANVAS
  
  fillRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }

  strokeRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.stroke();
  }

  hsvToRgb(h, s, v) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    
    switch (i % 6) {
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
    }
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  // ✅ MÉTHODES DE MAINTENANCE AVEC LOGS
  
  cleanupLoadHandlers(spriteKey) {
    console.log(`[SPRITEMANAGER] 🧹 Nettoyage handlers: ${spriteKey}`);
    
    if (this.activeLoadHandlers && this.activeLoadHandlers.has(spriteKey)) {
      const handlers = this.activeLoadHandlers.get(spriteKey);
      
      try {
        this.scene.load.off('filecomplete-image-' + spriteKey, handlers.onSuccess);
        this.scene.load.off('filecomplete-spritesheet-' + spriteKey, handlers.onSuccess);
        this.scene.load.off('loaderror', handlers.onError);
        console.log(`[SPRITEMANAGER] ✅ Handlers nettoyés pour: ${spriteKey}`);
      } catch (error) {
        console.warn(`[SPRITEMANAGER] ⚠️ Erreur nettoyage handlers ${spriteKey}:`, error);
      }
      
      this.activeLoadHandlers.delete(spriteKey);
    }
  }

  isSpriteCached(spriteKey) {
    const exists = this.scene.textures.exists(spriteKey);
    const loaded = this.loadedSprites.has(spriteKey);
    const cached = exists && loaded;
    
    console.log(`[SPRITEMANAGER] 🔍 Cache check ${spriteKey}:`, {
      exists,
      loaded,
      cached
    });
    
    return cached;
  }

  async preloadSprites(spriteList) {
    console.log(`[SPRITEMANAGER] 📦 === PRÉ-CHARGEMENT BATCH ===`);
    console.log(`[SPRITEMANAGER] 📊 Nombre de sprites: ${spriteList.length}`);
    console.log(`[SPRITEMANAGER] 📋 Liste:`, spriteList);
    
    const promises = spriteList.map(sprite => this.loadNpcSprite(sprite));
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;
    
    console.log(`[SPRITEMANAGER] 📊 Pré-chargement terminé:`, {
      total: spriteList.length,
      successful,
      failed
    });
    
    return {
      total: spriteList.length,
      successful,
      failed,
      results
    };
  }

  getDebugInfo() {
    console.log(`[SPRITEMANAGER] 🔍 === GÉNÉRATION INFO DEBUG ===`);
    
    const textureList = this.scene.textures ? Object.keys(this.scene.textures.list) : [];
    const npcTextures = textureList.filter(key => 
      this.loadedSprites.has(key) || key === this.config.fallbackSprite
    );
    
    const debugInfo = {
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
    
    console.log(`[SPRITEMANAGER] 📊 Info debug générée:`, debugInfo);
    
    return debugInfo;
  }

  debugStats() {
    console.log('[SPRITEMANAGER] 📊 === STATISTIQUES COMPLÈTES ===');
    console.table(this.stats);
    console.log('[SPRITEMANAGER] 📦 Sprites chargés:', Array.from(this.loadedSprites));
    console.log('[SPRITEMANAGER] ❌ Sprites en échec:', Array.from(this.failedSprites));
    console.log('[SPRITEMANAGER] ⏳ Sprites en cours:', Array.from(this.loadingSprites.keys()));
    console.log('[SPRITEMANAGER] 🎞️ Sprite sheets détectés:', this.spriteStructures.size);
    
    if (this.spriteStructures.size > 0) {
      console.log('[SPRITEMANAGER] 📊 Structures détectées:');
      this.spriteStructures.forEach((structure, spriteKey) => {
        console.log(`[SPRITEMANAGER]   ${spriteKey}: ${structure.name} (${structure.frameWidth}x${structure.frameHeight})`);
      });
    }
  }

  cleanupUnusedSprites(activeSprites = []) {
    console.log('[SPRITEMANAGER] 🧹 === NETTOYAGE SPRITES INUTILISÉS ===');
    console.log('[SPRITEMANAGER] 📋 Sprites actifs:', activeSprites);
    
    let cleaned = 0;
    
    this.loadedSprites.forEach(spriteKey => {
      if (spriteKey === this.config.fallbackSprite || activeSprites.includes(spriteKey)) {
        console.log(`[SPRITEMANAGER] ✅ Conservé: ${spriteKey}`);
        return;
      }
      
      if (this.scene.textures.exists(spriteKey)) {
        this.scene.textures.remove(spriteKey);
        console.log(`[SPRITEMANAGER] 🗑️ Sprite nettoyé: ${spriteKey}`);
        cleaned++;
      }
      
      this.loadedSprites.delete(spriteKey);
      this.spriteStructures.delete(spriteKey);
    });
    
    console.log(`[SPRITEMANAGER] ✅ ${cleaned} sprites nettoyés`);
    return cleaned;
  }

  destroy() {
    console.log('[SPRITEMANAGER] 💀 === DESTRUCTION SPRITE MANAGER ===');
    
    if (this.activeLoadHandlers) {
      console.log(`[SPRITEMANAGER] 🧹 Nettoyage ${this.activeLoadHandlers.size} handlers actifs...`);
      this.activeLoadHandlers.forEach((handlers, spriteKey) => {
        this.cleanupLoadHandlers(spriteKey);
      });
      this.activeLoadHandlers.clear();
      this.activeLoadHandlers = null;
    }
    
    console.log(`[SPRITEMANAGER] 🗑️ Nettoyage caches...`);
    this.loadingSprites.clear();
    this.loadedSprites.clear();
    this.failedSprites.clear();
    this.spriteStructures.clear();
    
    console.log(`[SPRITEMANAGER] 📊 Reset statistiques...`);
    Object.keys(this.stats).forEach(key => this.stats[key] = 0);
    
    this.isInitialized = false;
    this.scene = null;
    
    console.log('[SPRITEMANAGER] ✅ Destruction terminée');
  }
}

// ✅ FONCTIONS DEBUG GLOBALES AVEC LOGS
window.debugNpcSpriteManager = function() {
  console.log('[SPRITEMANAGER] 🔍 === DEBUG GLOBAL ===');
  
  const scene = window.game?.scene?.getScenes(true)?.[0];
  const manager = scene?.npcSpriteManager;
  
  if (manager) {
    const info = manager.getDebugInfo();
    console.log('[SPRITEMANAGER] === DEBUG INFO COMPLET ===');
    console.table(info.stats);
    console.log('[SPRITEMANAGER] Info complète:', info);
    return info;
  } else {
    console.error('[SPRITEMANAGER] ❌ Manager non trouvé');
    return null;
  }
};

console.log('[SPRITEMANAGER] ✅ NpcSpriteManager CORRIGÉ chargé!');
console.log('[SPRITEMANAGER] 🔍 Utilisez window.debugNpcSpriteManager() pour diagnostiquer');
