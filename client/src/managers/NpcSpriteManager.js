// client/src/managers/NpcSpriteManager.js
// ✅ Manager pour gérer les sprites NPCs dynamiques depuis MongoDB - VERSION COMPLÈTE CORRIGÉE

export class NpcSpriteManager {
  constructor(scene) {
    this.scene = scene;
    this.isInitialized = false;
    
    // ✅ Cache des sprites chargés
    this.loadedSprites = new Set();
    this.loadingSprites = new Map(); // sprite -> Promise
    this.failedSprites = new Set();
    
    // ✅ NOUVEAU : Gestion des handlers actifs pour nettoyage
    this.activeLoadHandlers = new Map();
    
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

  // ✅ MÉTHODE CORRIGÉE : PERFORMER LE CHARGEMENT RÉEL DU SPRITE
  async performSpriteLoad(spriteKey) {
    return new Promise((resolve, reject) => {
      console.log(`[NpcSpriteManager] 🔄 === CHARGEMENT ROBUSTE: ${spriteKey} ===`);
      
      // ✅ FIX : Éviter la double extension si le sprite a déjà .png
      const hasExtension = spriteKey.endsWith('.png') || spriteKey.endsWith('.jpg') || spriteKey.endsWith('.jpeg');
      const spritePath = hasExtension 
        ? `${this.config.spritePath}${spriteKey}`
        : `${this.config.spritePath}${spriteKey}${this.config.spriteExtension}`;
      
      console.log(`[NpcSpriteManager] 📁 Chemin: ${spritePath}`);
      
      // ✅ NOUVEAU : Vérifier si le loader est déjà en cours
      if (this.scene.load.isLoading()) {
        console.log(`[NpcSpriteManager] ⏳ Loader déjà en cours, attente...`);
        
        // Attendre que le loader actuel finisse
        this.scene.load.once('complete', () => {
          console.log(`[NpcSpriteManager] ✅ Loader précédent terminé, relance pour ${spriteKey}`);
          this.performSpriteLoadDirect(spriteKey, spritePath, resolve, reject);
        });
        
        return;
      }
      
      // ✅ Chargement direct
      this.performSpriteLoadDirect(spriteKey, spritePath, resolve, reject);
    });
  }

  // ✅ NOUVELLE MÉTHODE : Chargement direct avec gestion d'erreurs renforcée
  performSpriteLoadDirect(spriteKey, spritePath, resolve, reject) {
    console.log(`[NpcSpriteManager] 🎯 Chargement direct: ${spriteKey}`);
    
    // ✅ Timeout de sécurité
    const timeoutId = setTimeout(() => {
      console.error(`[NpcSpriteManager] ⏰ Timeout chargement ${spriteKey} après 10s`);
      this.cleanupLoadHandlers(spriteKey);
      reject(new Error(`Timeout loading sprite: ${spriteKey}`));
    }, 10000);
    
    // ✅ Configurer les handlers avec nettoyage automatique
    const onSuccess = () => {
      clearTimeout(timeoutId);
      this.cleanupLoadHandlers(spriteKey);
      
      console.log(`[NpcSpriteManager] ✅ Succès: ${spriteKey}`);
      this.loadedSprites.add(spriteKey);
      this.stats.successfullyLoaded++;
      
      // ✅ NOUVEAU : Double vérification que la texture est bien disponible
      if (this.scene.textures.exists(spriteKey)) {
        console.log(`[NpcSpriteManager] ✅ Texture confirmée disponible: ${spriteKey}`);
        resolve({
          success: true,
          spriteKey,
          fromCache: false,
          path: spritePath,
          verified: true
        });
      } else {
        console.error(`[NpcSpriteManager] ❌ Texture non disponible après succès: ${spriteKey}`);
        reject(new Error(`Texture not available after successful load: ${spriteKey}`));
      }
    };
    
    const onError = (fileObj) => {
      if (fileObj.key === spriteKey) {
        clearTimeout(timeoutId);
        this.cleanupLoadHandlers(spriteKey);
        
        console.error(`[NpcSpriteManager] ❌ Échec: ${spriteKey} (${fileObj.src})`);
        this.failedSprites.add(spriteKey);
        this.stats.failed++;
        
        reject(new Error(`Failed to load sprite: ${spriteKey} from ${fileObj.src}`));
      }
    };
    
    // ✅ Stocker les handlers pour nettoyage
    this.activeLoadHandlers.set(spriteKey, { onSuccess, onError });
    
    // ✅ Ajouter les handlers
    this.scene.load.once('filecomplete-image-' + spriteKey, onSuccess);
    this.scene.load.once('loaderror', onError);
    
    try {
      // ✅ Ajouter le fichier à charger
      this.scene.load.image(spriteKey, spritePath);
      
      // ✅ Démarrer le chargement
      console.log(`[NpcSpriteManager] 🚀 Démarrage loader pour ${spriteKey}...`);
      this.scene.load.start();
      
    } catch (error) {
      clearTimeout(timeoutId);
      this.cleanupLoadHandlers(spriteKey);
      console.error(`[NpcSpriteManager] ❌ Erreur setup chargement ${spriteKey}:`, error);
      reject(error);
    }
  }

  // ✅ NOUVELLE MÉTHODE : Nettoyer les handlers de chargement
  cleanupLoadHandlers(spriteKey) {
    if (this.activeLoadHandlers && this.activeLoadHandlers.has(spriteKey)) {
      const handlers = this.activeLoadHandlers.get(spriteKey);
      
      // Retirer les listeners pour éviter les fuites mémoire
      try {
        this.scene.load.off('filecomplete-image-' + spriteKey, handlers.onSuccess);
        this.scene.load.off('loaderror', handlers.onError);
      } catch (error) {
        console.warn(`[NpcSpriteManager] ⚠️ Erreur nettoyage handlers ${spriteKey}:`, error);
      }
      
      this.activeLoadHandlers.delete(spriteKey);
    }
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

  // ✅ MÉTHODE AMÉLIORÉE : OBTENIR LE SPRITE À UTILISER
  async getSpriteKeyToUse(requestedSprite) {
    console.log(`[NpcSpriteManager] 🎯 === GET SPRITE KEY: "${requestedSprite}" ===`);
    
    if (!requestedSprite) {
      console.log('[NpcSpriteManager] ⚠️ Pas de sprite demandé, utilisation fallback');
      await this.ensureFallbackReady();
      return this.config.fallbackSprite;
    }
    
    try {
      const result = await this.loadNpcSprite(requestedSprite);
      
      if (result.success) {
        console.log(`[NpcSpriteManager] ✅ Sprite obtenu: ${result.spriteKey}`);
        
        // ✅ NOUVELLE VALIDATION : S'assurer que le sprite est vraiment disponible
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

  // ✅ NOUVELLE MÉTHODE : Valider la disponibilité d'un sprite
  async validateSpriteAvailability(spriteKey, maxWaitMs = 2000) {
    console.log(`[NpcSpriteManager] 🔍 Validation disponibilité: ${spriteKey}`);
    
    // ✅ Check immédiat
    if (this.scene.textures.exists(spriteKey)) {
      console.log(`[NpcSpriteManager] ✅ Sprite immédiatement disponible: ${spriteKey}`);
      return true;
    }
    
    // ✅ Attendre avec timeout
    console.log(`[NpcSpriteManager] ⏳ Attente sprite ${spriteKey} (max ${maxWaitMs}ms)...`);
    
    const startTime = Date.now();
    const checkInterval = 50; // Vérifier toutes les 50ms
    
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

  // ✅ NOUVELLE MÉTHODE : S'assurer que le fallback est prêt
  async ensureFallbackReady() {
    const fallbackKey = this.config.fallbackSprite;
    
    if (this.scene.textures.exists(fallbackKey)) {
      console.log(`[NpcSpriteManager] ✅ Fallback déjà disponible: ${fallbackKey}`);
      return true;
    }
    
    console.log(`[NpcSpriteManager] 🎨 Création fallback: ${fallbackKey}`);
    
    try {
      // ✅ Créer le fallback graphique
      this.createDefaultFallback();
      
      // ✅ Valider qu'il est bien créé
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

  // ✅ MÉTHODE AMÉLIORÉE : Créer un fallback graphique plus visible
  createDefaultFallback() {
    console.log('[NpcSpriteManager] 🎨 Création fallback graphique amélioré...');
    
    try {
      const key = this.config.fallbackSprite;
      
      // ✅ Supprimer l'ancienne texture si elle existe
      if (this.scene.textures.exists(key)) {
        this.scene.textures.remove(key);
      }
      
      // ✅ Créer une texture générée plus visible
      const graphics = this.scene.add.graphics();
      
      // ✅ Fond coloré pour être sûr de le voir
      graphics.fillStyle(0x4169E1, 1.0); // Bleu royal opaque
      graphics.fillRoundedRect(0, 0, 32, 32, 4); // Rectangle arrondi
      
      // ✅ Forme de personnage simple
      graphics.fillStyle(0xFFDBB0, 1.0); // Couleur peau
      graphics.fillCircle(16, 12, 8); // Tête
      
      graphics.fillStyle(0x000000, 1.0); // Noir pour les yeux
      graphics.fillCircle(13, 10, 2); // Œil gauche
      graphics.fillCircle(19, 10, 2); // Œil droit
      
      graphics.fillStyle(0xFF4444, 1.0); // Rouge vif pour indiquer que c'est un fallback
      graphics.fillRect(8, 4, 16, 3); // Bandeau rouge vif
      
      // ✅ Corps plus visible
      graphics.fillStyle(0x2E8B57, 1.0); // Vert foncé
      graphics.fillRoundedRect(12, 20, 8, 10, 2); // Corps
      
      // ✅ Bordure pour plus de visibilité
      graphics.lineStyle(2, 0xFFFFFF, 1.0); // Bordure blanche
      graphics.strokeRoundedRect(1, 1, 30, 30, 4);
      
      // ✅ Texte "NPC" pour identification
      const text = this.scene.add.text(16, 28, 'NPC', {
        fontSize: '8px',
        fontFamily: 'Arial',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      // ✅ Générer la texture avec le texte inclus
      const renderTexture = this.scene.add.renderTexture(0, 0, 32, 32);
      renderTexture.draw(graphics);
      renderTexture.draw(text);
      renderTexture.generateTexture(key);
      
      // ✅ Nettoyer les objets temporaires
      graphics.destroy();
      text.destroy();
      renderTexture.destroy();
      
      this.loadedSprites.add(key);
      console.log('[NpcSpriteManager] ✅ Fallback graphique amélioré créé:', key);
      
      // ✅ Vérification immédiate
      if (this.scene.textures.exists(key)) {
        console.log('[NpcSpriteManager] ✅ Fallback immédiatement disponible');
      } else {
        console.error('[NpcSpriteManager] ❌ Fallback créé mais pas disponible');
      }
      
    } catch (error) {
      console.error('[NpcSpriteManager] ❌ Erreur création fallback graphique:', error);
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

  // ✅ DEBUG ET MONITORING AMÉLIORÉ
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
    console.log('[NpcSpriteManager] 📊 === STATISTIQUES ===');
    console.table(this.stats);
    console.log('📦 Sprites chargés:', Array.from(this.loadedSprites));
    console.log('❌ Sprites en échec:', Array.from(this.failedSprites));
    console.log('⏳ Sprites en cours:', Array.from(this.loadingSprites.keys()));
    console.log('🔧 Handlers actifs:', this.activeLoadHandlers ? this.activeLoadHandlers.size : 0);
  }

  // ✅ DESTRUCTION AMÉLIORÉE
  destroy() {
    console.log('[NpcSpriteManager] 💀 Destruction améliorée...');
    
    // ✅ Nettoyer tous les handlers actifs
    if (this.activeLoadHandlers) {
      this.activeLoadHandlers.forEach((handlers, spriteKey) => {
        this.cleanupLoadHandlers(spriteKey);
      });
      this.activeLoadHandlers.clear();
      this.activeLoadHandlers = null;
    }
    
    // ✅ Annuler les chargements en cours
    this.loadingSprites.clear();
    
    // ✅ Reset des caches
    this.loadedSprites.clear();
    this.failedSprites.clear();
    
    // ✅ Reset stats
    Object.keys(this.stats).forEach(key => this.stats[key] = 0);
    
    this.isInitialized = false;
    this.scene = null;
    
    console.log('[NpcSpriteManager] ✅ Destruction améliorée terminée');
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

console.log('✅ NpcSpriteManager COMPLET chargé!');
console.log('🔍 Utilisez window.debugNpcSpriteManager() pour diagnostiquer');
