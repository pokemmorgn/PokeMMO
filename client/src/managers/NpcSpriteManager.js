// client/src/managers/NpcSpriteManager.js
// ✅ Manager pour gérer les sprites NPCs dynamiques depuis MongoDB

export class NpcSpriteManager {
  constructor(scene) {
    this.scene = scene;
    this.isInitialized = false;
    
    // ✅ Cache des sprites chargés
    this.loadedSprites = new Set();
    this.loadingSprites = new Map(); // sprite -> Promise
    this.failedSprites = new Set();
    
    // ✅ Configuration
    this.config = {
      spritePath: '/assets/npc/',
      spriteExtension: '.png',
      fallbackSprite: 'npc_default', // ✅ CHANGÉ : utiliser npc_default au lieu de default_npc
      enableDebugLogs: true,
      maxRetries: 2,
      retryDelay: 1000
    };
    
    // ✅ Statistiques debug
    this.stats = {
      totalRequested: 0,
      successfullyLoaded: 0,
      failed: 0,
      cached: 0,
      fallbacksUsed: 0
    };
    
    console.log('[NpcSpriteManager] 🎭 Créé pour scène:', scene.scene.key);
  }

  // ✅ INITIALISATION
  initialize() {
    if (this.isInitialized) {
      console.log('[NpcSpriteManager] ⚠️ Déjà initialisé');
      return this;
    }
    
    console.log('[NpcSpriteManager] 🚀 === INITIALISATION ===');
    
    // ✅ Vérifier que la scène est prête
    if (!this.scene || !this.scene.load) {
      console.error('[NpcSpriteManager] ❌ Scène non prête pour chargement');
      return this;
    }
    
    // ✅ Pré-charger le sprite de fallback
    this.preloadFallbackSprite();
    
    this.isInitialized = true;
    console.log('[NpcSpriteManager] ✅ Initialisé avec succès');
    
    return this;
  }

  // ✅ PRÉ-CHARGER LE SPRITE DE FALLBACK
  preloadFallbackSprite() {
    console.log('[NpcSpriteManager] 🎯 Pré-chargement sprite fallback...');
    
    const fallbackKey = this.config.fallbackSprite;
    const fallbackPath = `${this.config.spritePath}${fallbackKey}${this.config.spriteExtension}`;
    
    // ✅ Vérifier si déjà chargé
    if (this.scene.textures.exists(fallbackKey)) {
      console.log('[NpcSpriteManager] ✅ Sprite fallback déjà chargé');
      this.loadedSprites.add(fallbackKey);
      return;
    }
    
    // ✅ Charger le sprite fallback
    try {
      this.scene.load.image(fallbackKey, fallbackPath);
      
      // ✅ Démarrer le chargement si pas déjà en cours
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
      
      // ✅ Handler de succès
      this.scene.load.once('filecomplete-image-' + fallbackKey, () => {
        console.log('[NpcSpriteManager] ✅ Sprite fallback chargé:', fallbackKey);
        this.loadedSprites.add(fallbackKey);
      });
      
      // ✅ Handler d'erreur
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

  // ✅ CRÉER UN FALLBACK GRAPHIQUE PAR DÉFAUT
  createDefaultFallback() {
    console.log('[NpcSpriteManager] 🎨 Création fallback graphique...');
    
    try {
      const key = this.config.fallbackSprite;
      
      // ✅ Créer une texture générée si le fichier est introuvable
      const graphics = this.scene.add.graphics();
      
      // ✅ Dessiner un NPC simple et reconnaissable
      graphics.fillStyle(0x4169E1); // Bleu royal
      graphics.fillCircle(16, 24, 12); // Corps
      
      graphics.fillStyle(0xFFDBB0); // Couleur peau
      graphics.fillCircle(16, 12, 8); // Tête
      
      graphics.fillStyle(0x000000); // Noir pour les yeux
      graphics.fillCircle(14, 10, 2); // Œil gauche
      graphics.fillCircle(18, 10, 2); // Œil droit
      
      graphics.fillStyle(0xFF0000); // Rouge pour indiquer que c'est un fallback
      graphics.fillRect(12, 6, 8, 2); // Bandeau rouge
      
      // ✅ Générer la texture
      graphics.generateTexture(key, 32, 32);
      graphics.destroy();
      
      this.loadedSprites.add(key);
      console.log('[NpcSpriteManager] ✅ Fallback graphique créé:', key);
      
    } catch (error) {
      console.error('[NpcSpriteManager] ❌ Erreur création fallback graphique:', error);
    }
  }

  // ✅ MÉTHODE PRINCIPALE : CHARGER UN SPRITE NPC
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
    
    // ✅ Créer et stocker la promesse de chargement
    const loadingPromise = this.performSpriteLoad(spriteKey);
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

  // ✅ PERFORMER LE CHARGEMENT RÉEL DU SPRITE
  async performSpriteLoad(spriteKey) {
    return new Promise((resolve, reject) => {
      // ✅ FIX : Éviter la double extension si le sprite a déjà .png
      const hasExtension = spriteKey.endsWith('.png') || spriteKey.endsWith('.jpg') || spriteKey.endsWith('.jpeg');
      const spritePath = hasExtension 
        ? `${this.config.spritePath}${spriteKey}`
        : `${this.config.spritePath}${spriteKey}${this.config.spriteExtension}`;
      
      console.log(`[NpcSpriteManager] 🔄 Chargement: ${spritePath}`);
      
      // ✅ Configurer les handlers avant de démarrer le chargement
      const onSuccess = () => {
        console.log(`[NpcSpriteManager] ✅ Succès: ${spriteKey}`);
        this.loadedSprites.add(spriteKey);
        this.stats.successfullyLoaded++;
        
        resolve({
          success: true,
          spriteKey,
          fromCache: false,
          path: spritePath
        });
      };
      
      const onError = (fileObj) => {
        if (fileObj.key === spriteKey) {
          console.error(`[NpcSpriteManager] ❌ Échec: ${spriteKey} (${fileObj.src})`);
          this.failedSprites.add(spriteKey);
          this.stats.failed++;
          
          reject(new Error(`Failed to load sprite: ${spriteKey}`));
        }
      };
      
      // ✅ Ajouter les handlers
      this.scene.load.once('filecomplete-image-' + spriteKey, onSuccess);
      this.scene.load.once('loaderror', onError);
      
      // ✅ Ajouter le fichier à charger
      this.scene.load.image(spriteKey, spritePath);
      
      // ✅ Démarrer le chargement
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }

  // ✅ VÉRIFIER SI UN SPRITE EST EN CACHE
  isSpriteCached(spriteKey) {
    return this.scene.textures.exists(spriteKey) && this.loadedSprites.has(spriteKey);
  }

  // ✅ OBTENIR LE RÉSULTAT FALLBACK
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

  // ✅ MÉTHODE UTILITAIRE : OBTENIR LE SPRITE À UTILISER
  async getSpriteKeyToUse(requestedSprite) {
    if (!requestedSprite) {
      console.log('[NpcSpriteManager] ⚠️ Pas de sprite demandé, utilisation fallback');
      return this.config.fallbackSprite;
    }
    
    const result = await this.loadNpcSprite(requestedSprite);
    
    if (result.success) {
      return result.spriteKey;
    } else {
      return result.spriteKey; // Le fallback
    }
  }

  // ✅ PRÉ-CHARGER PLUSIEURS SPRITES
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

  // ✅ NETTOYER LES SPRITES INUTILISÉS
  cleanupUnusedSprites(activeSprites = []) {
    console.log('[NpcSpriteManager] 🧹 Nettoyage sprites inutilisés...');
    
    let cleaned = 0;
    
    this.loadedSprites.forEach(spriteKey => {
      // ✅ Ne pas nettoyer le fallback ni les sprites actifs
      if (spriteKey === this.config.fallbackSprite || activeSprites.includes(spriteKey)) {
        return;
      }
      
      // ✅ Supprimer de la texture cache de Phaser
      if (this.scene.textures.exists(spriteKey)) {
        this.scene.textures.remove(spriteKey);
        console.log(`[NpcSpriteManager] 🗑️ Sprite nettoyé: ${spriteKey}`);
        cleaned++;
      }
      
      this.loadedSprites.delete(spriteKey);
    });
    
    console.log(`[NpcSpriteManager] ✅ ${cleaned} sprites nettoyés`);
    return cleaned;
  }

  // ✅ DEBUG ET MONITORING
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      sceneKey: this.scene?.scene?.key,
      stats: { ...this.stats },
      cache: {
        loaded: Array.from(this.loadedSprites),
        loading: Array.from(this.loadingSprites.keys()),
        failed: Array.from(this.failedSprites)
      },
      config: { ...this.config }
    };
  }

  debugStats() {
    console.log('[NpcSpriteManager] 📊 === STATISTIQUES ===');
    console.table(this.stats);
    console.log('📦 Sprites chargés:', Array.from(this.loadedSprites));
    console.log('❌ Sprites en échec:', Array.from(this.failedSprites));
    console.log('⏳ Sprites en cours:', Array.from(this.loadingSprites.keys()));
  }

  // ✅ DESTRUCTION
  destroy() {
    console.log('[NpcSpriteManager] 💀 Destruction...');
    
    // ✅ Annuler les chargements en cours
    this.loadingSprites.clear();
    
    // ✅ Reset des caches
    this.loadedSprites.clear();
    this.failedSprites.clear();
    
    // ✅ Reset stats
    Object.keys(this.stats).forEach(key => this.stats[key] = 0);
    
    this.isInitialized = false;
    this.scene = null;
    
    console.log('[NpcSpriteManager] ✅ Détruit');
  }
}

// ✅ FONCTION DEBUG GLOBALE
window.debugNpcSpriteManager = function() {
  const scene = window.game?.scene?.getScenes(true)?.[0];
  const manager = scene?.npcSpriteManager;
  
  if (manager) {
    const info = manager.getDebugInfo();
    console.log('[NpcSpriteManager] === DEBUG INFO ===');
    console.table(info.stats);
    console.log('[NpcSpriteManager] Info complète:', info);
    return info;
  } else {
    console.error('[NpcSpriteManager] Manager non trouvé');
    return null;
  }
};

console.log('✅ NpcSpriteManager chargé!');
console.log('🔍 Utilisez window.debugNpcSpriteManager() pour diagnostiquer');
