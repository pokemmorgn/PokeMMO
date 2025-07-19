// client/src/modules/ObjectManager.js
// ✅ Gestionnaire d'objets visuels pour MMO Pokémon
// 🔧 VERSION CORRIGÉE - Résout l'erreur de nettoyage des groupes Phaser

export class ObjectManager {
  constructor(scene) {
    this.scene = scene;
    this.isInitialized = false;
    
    // ✅ Gestion interne avec Map() - Plus fiable que les groupes Phaser
    this.objectSprites = new Map(); // objectId -> sprite
    this.objectData = new Map();    // objectId -> data
    
    // ✅ Groupes Phaser pour l'affichage uniquement
    this.phaserGroups = {
      objects: null,
      interactions: null
    };
    
    // ✅ État du manager
    this.state = {
      lastUpdateTime: 0,
      totalObjectsCreated: 0,
      totalObjectsDestroyed: 0,
      isCleaningUp: false,
      lastCleanupTime: 0
    };
    
    // ✅ Configuration
    this.config = {
      enableDebugLogs: false, // ← DÉSACTIVÉ
      enableVisualFeedback: true,
      objectScale: 1.0,
      interactionDistance: 50,
      enableObjectCaching: true,
      maxCacheSize: 1000,
      cleanupBatchSize: 50,
      preventDoubleCleanup: true
    };
    
    // ✅ Callbacks
    this.callbacks = {
      onObjectCreated: null,
      onObjectDestroyed: null,
      onObjectUpdated: null,
      onCleanupStart: null,
      onCleanupComplete: null,
      onCleanupError: null
    };
    
    // ✅ Statistiques debug
    this.stats = {
      objectsInScene: 0,
      objectsCreatedThisSession: 0,
      objectsDestroyedThisSession: 0,
      cleanupAttempts: 0,
      cleanupErrors: 0,
      lastErrorMessage: null
    };
  }

  // === INITIALISATION ===

  initialize() {
    try {
      this.setupPhaserGroups();
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('[ObjectManager] ❌ Erreur initialisation:', error);
      this.stats.cleanupErrors++;
      return false;
    }
  }

  setupPhaserGroups() {
    try {
      this.safeCleanupGroups();
      this.ensureFallbackTexture();
      
      this.phaserGroups.objects = this.scene.add.group({
        name: 'ObjectManagerGroup',
        active: true,
        maxSize: -1,
        runChildUpdate: false
      });
      
      this.phaserGroups.interactions = this.scene.add.group({
        name: 'ObjectInteractionGroup',
        active: true,
        maxSize: -1,
        runChildUpdate: false
      });
      
      if (!this.phaserGroups.objects || !this.phaserGroups.interactions) {
        throw new Error('Échec création groupes Phaser');
      }
      
    } catch (error) {
      console.error('[ObjectManager] ❌ Erreur création groupes:', error);
      this.phaserGroups.objects = null;
      this.phaserGroups.interactions = null;
    }
  }

  // ✅ MÉTHODE AMÉLIORÉE: Créer des textures d'objets réalistes
  ensureFallbackTexture() {
    // Créer plusieurs textures d'objets si elles n'existent pas
    this.createObjectTextures();
  }

  createObjectTextures() {
    const textures = [
      {
        name: 'pokeball_fallback',
        draw: (ctx, size) => {
          // Pokeball rouge et blanche
          ctx.fillStyle = '#FF0000';
          ctx.fillRect(0, 0, size, size/2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, size/2, size, size/2);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, size, size);
          ctx.beginPath();
          ctx.moveTo(0, size/2);
          ctx.lineTo(size, size/2);
          ctx.stroke();
          // Centre noir
          ctx.fillStyle = '#000000';
          ctx.fillRect(size/2-2, size/2-2, 4, 4);
        }
      },
      {
        name: 'potion_fallback',
        draw: (ctx, size) => {
          // Bouteille de potion bleue
          ctx.fillStyle = '#E8F5E8';
          ctx.fillRect(4, 0, size-8, 4); // Bouchon
          ctx.fillStyle = '#C0C0C0';
          ctx.fillRect(2, 4, size-4, size-6); // Bouteille
          ctx.fillStyle = '#0066FF';
          ctx.fillRect(4, 6, size-8, size-10); // Liquide bleu
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(2, 4, size-4, size-6);
        }
      },
      {
        name: 'berry_fallback',
        draw: (ctx, size) => {
          // Baie ronde rouge
          ctx.fillStyle = '#FF6B6B';
          ctx.beginPath();
          ctx.arc(size/2, size/2, size/2-2, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#CC0000';
          ctx.lineWidth = 1;
          ctx.stroke();
          // Petite feuille verte
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(size/2-1, 2, 2, 4);
        }
      },
      {
        name: 'item_fallback',
        draw: (ctx, size) => {
          // Item générique - boîte dorée
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(2, 2, size-4, size-4);
          ctx.strokeStyle = '#B8860B';
          ctx.lineWidth = 1;
          ctx.strokeRect(2, 2, size-4, size-4);
          // Croix au centre
          ctx.strokeStyle = '#8B4513';
          ctx.beginPath();
          ctx.moveTo(size/2, 4);
          ctx.lineTo(size/2, size-4);
          ctx.moveTo(4, size/2);
          ctx.lineTo(size-4, size/2);
          ctx.stroke();
        }
      },
      {
        name: 'collectible_fallback',
        draw: (ctx, size) => {
          // Diamant violet
          ctx.fillStyle = '#9C27B0';
          ctx.beginPath();
          ctx.moveTo(size/2, 2);
          ctx.lineTo(size-2, size/2);
          ctx.lineTo(size/2, size-2);
          ctx.lineTo(2, size/2);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#6A1B9A';
          ctx.lineWidth = 1;
          ctx.stroke();
          // Brillance
          ctx.fillStyle = '#E1BEE7';
          ctx.fillRect(size/2-1, 4, 2, 3);
        }
      },
      {
        name: 'treasure_fallback',
        draw: (ctx, size) => {
          // Coffre au trésor
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(0, size/2, size, size/2);
          ctx.fillStyle = '#D2691E';
          ctx.fillRect(0, size/3, size, size/6);
          ctx.strokeStyle = '#654321';
          ctx.lineWidth = 1;
          ctx.strokeRect(0, size/3, size, size*2/3);
          // Serrure dorée
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(size/2-2, size/2+2, 4, 3);
        }
      }
    ];

    const size = 16;
    
    textures.forEach(textureConfig => {
      if (!this.scene.textures.exists(textureConfig.name)) {
        try {
          const canvas = this.scene.textures.createCanvas(textureConfig.name, size, size);
          const context = canvas.getContext();
          
          // Effacer le canvas
          context.clearRect(0, 0, size, size);
          
          // Dessiner la texture
          textureConfig.draw(context, size);
          
          canvas.refresh();
        } catch (error) {
          // Silence - si erreur, on utilisera un fallback plus simple
        }
      }
    });
  }

  // === GESTION DES OBJETS ===

  // ✅ NOUVELLE MÉTHODE: Handler pour les objets reçus du NetworkManager
  handleZoneObjectsReceived(data) {
    if (!data.objects || !Array.isArray(data.objects)) {
      return false;
    }
    
    if (data.objects.length === 0) {
      this.updateObjects([]);
      return true;
    }
    
    return this.updateObjects(data.objects);
  }

  updateObjects(serverObjects) {
    if (!this.isInitialized) {
      return false;
    }
    
    const stats = { created: 0, updated: 0, destroyed: 0, errors: 0 };
    
    try {
      const serverObjectIds = new Set(serverObjects.map(obj => obj.id));
      
      // Traiter les objets du serveur
      for (const serverObject of serverObjects) {
        try {
          if (this.objectSprites.has(serverObject.id)) {
            if (this.updateExistingObject(serverObject)) {
              stats.updated++;
            }
          } else {
            if (this.createNewObject(serverObject)) {
              stats.created++;
            }
          }
        } catch (error) {
          console.error(`[ObjectManager] ❌ Erreur traitement objet ${serverObject.id}:`, error);
          stats.errors++;
        }
      }
      
      // Supprimer les objets obsolètes
      const objectsToDestroy = [];
      for (const [objectId] of this.objectSprites) {
        if (!serverObjectIds.has(objectId)) {
          objectsToDestroy.push(objectId);
        }
      }
      
      for (const objectId of objectsToDestroy) {
        try {
          if (this.destroyObject(objectId)) {
            stats.destroyed++;
          }
        } catch (error) {
          console.error(`[ObjectManager] ❌ Erreur destruction objet ${objectId}:`, error);
          stats.errors++;
        }
      }
      
      this.updateStats(stats);
      return true;
      
    } catch (error) {
      console.error('[ObjectManager] ❌ Erreur mise à jour objets:', error);
      this.stats.cleanupErrors++;
      return false;
    }
  }

  createNewObject(objectData) {
    try {
      if (!this.validateObjectData(objectData)) {
        throw new Error(`Données objet invalides: ${JSON.stringify(objectData)}`);
      }
      
      const texture = this.determineTexture(objectData);
      if (!texture) {
        throw new Error(`Texture non déterminée pour objet: ${objectData.type || objectData.name}`);
      }
      
      const sprite = this.scene.add.sprite(objectData.x, objectData.y, texture);
      if (!sprite) {
        throw new Error('Échec création sprite Phaser');
      }
      
      this.configureSprite(sprite, objectData);
      this.addSpriteToGroup(sprite, 'objects');
      
      this.objectSprites.set(objectData.id, sprite);
      this.objectData.set(objectData.id, { ...objectData, createdAt: Date.now() });
      
      this.state.totalObjectsCreated++;
      this.stats.objectsInScene++;
      this.stats.objectsCreatedThisSession++;
      
      if (this.callbacks.onObjectCreated) {
        this.callbacks.onObjectCreated(objectData, sprite);
      }
      
      return true;
      
    } catch (error) {
      console.error(`[ObjectManager] ❌ Erreur création objet ${objectData.id}:`, error);
      return false;
    }
  }

  updateExistingObject(objectData) {
    try {
      const sprite = this.objectSprites.get(objectData.id);
      const oldData = this.objectData.get(objectData.id);
      
      if (!sprite || !oldData) {
        return false;
      }
      
      const needsUpdate = this.checkIfUpdateNeeded(oldData, objectData);
      if (!needsUpdate) {
        return false;
      }
      
      if (oldData.x !== objectData.x || oldData.y !== objectData.y) {
        sprite.setPosition(objectData.x, objectData.y);
      }
      
      const newTexture = this.determineTexture(objectData);
      if (newTexture && sprite.texture.key !== newTexture) {
        sprite.setTexture(newTexture);
      }
      
      this.objectData.set(objectData.id, { ...objectData, updatedAt: Date.now() });
      
      if (this.callbacks.onObjectUpdated) {
        this.callbacks.onObjectUpdated(objectData, sprite, oldData);
      }
      
      return true;
      
    } catch (error) {
      console.error(`[ObjectManager] ❌ Erreur mise à jour objet ${objectData.id}:`, error);
      return false;
    }
  }

  destroyObject(objectId) {
    try {
      const sprite = this.objectSprites.get(objectId);
      const objectData = this.objectData.get(objectId);
      
      if (!sprite) {
        return false;
      }
      
      this.removeSpriteFromGroup(sprite, 'objects');
      
      if (sprite && sprite.scene && !sprite.scene.sys.isDestroyed) {
        sprite.destroy();
      }
      
      this.objectSprites.delete(objectId);
      this.objectData.delete(objectId);
      
      this.state.totalObjectsDestroyed++;
      this.stats.objectsInScene--;
      this.stats.objectsDestroyedThisSession++;
      
      if (this.callbacks.onObjectDestroyed) {
        this.callbacks.onObjectDestroyed(objectData, objectId);
      }
      
      return true;
      
    } catch (error) {
      console.error(`[ObjectManager] ❌ Erreur destruction objet ${objectId}:`, error);
      return false;
    }
  }

  // === GESTION DES GROUPES PHASER (VERSION SÉCURISÉE) ===

  addSpriteToGroup(sprite, groupName) {
    if (!sprite) return false;
    
    const group = this.phaserGroups[groupName];
    if (!group) return false; // Mode dégradé
    
    try {
      // ✅ Vérifier que le groupe est encore valide
      if (group.scene && !group.scene.sys.isDestroyed) {
        group.add(sprite);
        return true;
      }
    } catch (error) {
      console.warn(`[ObjectManager] ⚠️ Erreur ajout sprite au groupe ${groupName}:`, error);
    }
    
    return false;
  }

  removeSpriteFromGroup(sprite, groupName) {
    if (!sprite) return false;
    
    const group = this.phaserGroups[groupName];
    if (!group) return false; // Mode dégradé
    
    try {
      // ✅ Vérifier que le groupe est encore valide
      if (group.scene && !group.scene.sys.isDestroyed && group.contains && group.contains(sprite)) {
        group.remove(sprite);
        return true;
      }
    } catch (error) {
      console.warn(`[ObjectManager] ⚠️ Erreur suppression sprite du groupe ${groupName}:`, error);
    }
    
    return false;
  }

  // === NETTOYAGE SÉCURISÉ (RÉSOUT LE PROBLÈME PRINCIPAL) ===

  safeCleanupGroups() {
    if (this.state.isCleaningUp) {
      return;
    }
    
    this.state.isCleaningUp = true;
    this.state.lastCleanupTime = Date.now();
    this.stats.cleanupAttempts++;
    
    if (this.callbacks.onCleanupStart) {
      this.callbacks.onCleanupStart();
    }
    
    try {
      this.cleanupInternalMaps();
      this.cleanupPhaserGroupsSafely();
      this.phaserGroups.objects = null;
      this.phaserGroups.interactions = null;
      
      if (this.callbacks.onCleanupComplete) {
        this.callbacks.onCleanupComplete(true);
      }
      
    } catch (error) {
      console.error('[ObjectManager] ❌ Erreur nettoyage:', error);
      this.stats.cleanupErrors++;
      this.stats.lastErrorMessage = error.message;
      
      if (this.callbacks.onCleanupError) {
        this.callbacks.onCleanupError(error);
      }
      
      this.phaserGroups.objects = null;
      this.phaserGroups.interactions = null;
      
    } finally {
      this.state.isCleaningUp = false;
    }
  }

  cleanupInternalMaps() {
    for (const [objectId, sprite] of this.objectSprites) {
      try {
        if (sprite && sprite.scene && !sprite.scene.sys.isDestroyed) {
          sprite.destroy();
        }
      } catch (error) {
        // Silence - erreur non critique
      }
    }
    
    this.objectSprites.clear();
    this.objectData.clear();
    this.stats.objectsInScene = 0;
  }

  cleanupPhaserGroupsSafely() {
    const strategies = [
      () => this.cleanupStrategy_RemoveAllFirst(),
      () => this.cleanupStrategy_DestroyDirectly(),
      () => this.cleanupStrategy_SkipClear()
    ];
    
    for (const [groupName, group] of Object.entries(this.phaserGroups)) {
      if (!group) continue;
      
      let cleaned = false;
      for (let i = 0; i < strategies.length && !cleaned; i++) {
        try {
          strategies[i](group, groupName);
          cleaned = true;
        } catch (error) {
          if (i === strategies.length - 1) {
            console.error(`[ObjectManager] ❌ Toutes les stratégies ont échoué pour ${groupName}`);
          }
        }
      }
    }
  }

  // === STRATÉGIES DE NETTOYAGE ===

  cleanupStrategy_RemoveAllFirst(group, groupName) {
    // ✅ Stratégie 1: Vider avec removeAll puis destroy
    if (group && group.children && typeof group.removeAll === 'function') {
      group.removeAll();
    }
    if (group && typeof group.destroy === 'function') {
      group.destroy();
    }
  }

  cleanupStrategy_DestroyDirectly(group, groupName) {
    // ✅ Stratégie 2: Destruction directe sans clear
    if (group && typeof group.destroy === 'function') {
      group.destroy();
    }
  }

  cleanupStrategy_SkipClear(group, groupName) {
    // ✅ Stratégie 3: Marquer comme détruit et laisser le GC s'en occuper
    if (group) {
      group._destroyed = true; // Flag personnalisé
    }
  }

  // === UTILITAIRES ===

  validateObjectData(objectData) {
    return !!(
      objectData &&
      objectData.id !== undefined &&
      typeof objectData.x === 'number' &&
      typeof objectData.y === 'number' &&
      (objectData.type || objectData.name || objectData.sprite)
    );
  }

  determineTexture(objectData) {
    // ✅ Logique de détermination de texture améliorée
    if (objectData.sprite && this.scene.textures.exists(objectData.sprite)) {
      return objectData.sprite;
    }
    
    if (objectData.type) {
      const textureMap = {
        'pokeball': 'pokeball_fallback',
        'ball': 'pokeball_fallback',
        'potion': 'potion_fallback',
        'heal': 'potion_fallback',
        'medicine': 'potion_fallback',
        'berry': 'berry_fallback',
        'food': 'berry_fallback',
        'item': 'item_fallback',
        'collectible': 'collectible_fallback',
        'gem': 'collectible_fallback',
        'treasure': 'treasure_fallback',
        'chest': 'treasure_fallback'
      };
      
      const mappedTexture = textureMap[objectData.type.toLowerCase()];
      if (mappedTexture && this.scene.textures.exists(mappedTexture)) {
        return mappedTexture;
      }
    }
    
    if (objectData.name) {
      const name = objectData.name.toLowerCase();
      if (name.includes('ball') && this.scene.textures.exists('pokeball_fallback')) {
        return 'pokeball_fallback';
      }
      if (name.includes('potion') && this.scene.textures.exists('potion_fallback')) {
        return 'potion_fallback';
      }
      if (name.includes('berry') && this.scene.textures.exists('berry_fallback')) {
        return 'berry_fallback';
      }
      if ((name.includes('treasure') || name.includes('chest')) && this.scene.textures.exists('treasure_fallback')) {
        return 'treasure_fallback';
      }
    }
    
    // ✅ Fallbacks avec textures réalistes
    const fallbackTextures = [
      'item_fallback', 'pokeball_fallback', 'potion_fallback', 
      'berry_fallback', 'collectible_fallback', 'dude'
    ];
    
    for (const fallback of fallbackTextures) {
      if (this.scene.textures.exists(fallback)) {
        return fallback;
      }
    }
    
    // ✅ Dernier recours
    this.ensureFallbackTexture();
    return this.scene.textures.exists('item_fallback') ? 'item_fallback' : '__DEFAULT';
  }

  configureSprite(sprite, objectData) {
    // ✅ Configuration de base
    sprite.setScale(this.config.objectScale);
    sprite.setOrigin(0.5, 0.5);
    
    // ✅ Propriétés personnalisées
    sprite.objectId = objectData.id;
    sprite.objectType = objectData.type;
    sprite.objectData = objectData;
    
    // ✅ Interactivité si nécessaire
    if (objectData.interactive !== false) {
      sprite.setInteractive();
    }
    
    // ✅ Profondeur
    if (objectData.depth !== undefined) {
      sprite.setDepth(objectData.depth);
    } else {
      sprite.setDepth(1); // Au-dessus du sol
    }
  }

  checkIfUpdateNeeded(oldData, newData) {
    return (
      oldData.x !== newData.x ||
      oldData.y !== newData.y ||
      oldData.sprite !== newData.sprite ||
      oldData.type !== newData.type ||
      oldData.name !== newData.name
    );
  }

  updateStats(operationStats) {
    this.state.lastUpdateTime = Date.now();
    // Pas de log sauf si beaucoup d'opérations importantes
    if (operationStats.created + operationStats.destroyed > 20) {
      console.log(`[ObjectManager] 📊 Opération importante: +${operationStats.created} -${operationStats.destroyed} objets`);
    }
  }

  // === API PUBLIQUE ===

  // ✅ NOUVELLE MÉTHODE: Demander les objets d'une zone au serveur
  requestZoneObjects(zoneName, networkManager) {
    if (!networkManager?.room) {
      return false;
    }
    
    try {
      networkManager.room.send("requestZoneObjects", { 
        zone: zoneName,
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      console.error('[ObjectManager] ❌ Erreur demande objets:', error);
      return false;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Forcer une synchronisation
  forceSynchronization(networkManager, zoneName) {
    this.updateObjects([]);
    
    if (zoneName && networkManager) {
      setTimeout(() => {
        this.requestZoneObjects(zoneName, networkManager);
      }, 100);
    }
  }

  getObjectById(objectId) {
    return this.objectSprites.get(objectId) || null;
  }

  getObjectData(objectId) {
    return this.objectData.get(objectId) || null;
  }

  getAllObjects() {
    return Array.from(this.objectSprites.values());
  }

  getAllObjectData() {
    return Array.from(this.objectData.values());
  }

  getObjectsInRadius(centerX, centerY, radius) {
    const objectsInRadius = [];
    
    for (const [objectId, sprite] of this.objectSprites) {
      const distance = Math.sqrt(
        Math.pow(sprite.x - centerX, 2) + 
        Math.pow(sprite.y - centerY, 2)
      );
      
      if (distance <= radius) {
        objectsInRadius.push({
          sprite: sprite,
          data: this.objectData.get(objectId),
          distance: distance
        });
      }
    }
    
    return objectsInRadius.sort((a, b) => a.distance - b.distance);
  }

  // === CALLBACKS ===

  onObjectCreated(callback) { this.callbacks.onObjectCreated = callback; }
  onObjectDestroyed(callback) { this.callbacks.onObjectDestroyed = callback; }
  onObjectUpdated(callback) { this.callbacks.onObjectUpdated = callback; }
  onCleanupStart(callback) { this.callbacks.onCleanupStart = callback; }
  onCleanupComplete(callback) { this.callbacks.onCleanupComplete = callback; }
  onCleanupError(callback) { this.callbacks.onCleanupError = callback; }

  // === CONFIGURATION ===

  setConfig(newConfig) {
    console.log('[ObjectManager] 🔧 Mise à jour configuration:', newConfig);
    this.config = { ...this.config, ...newConfig };
  }

  // === DEBUG ===

  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      state: this.state,
      config: this.config,
      stats: this.stats,
      objectCounts: {
        spritesStored: this.objectSprites.size,
        dataStored: this.objectData.size,
        inScene: this.stats.objectsInScene
      },
      groupsStatus: {
        objects: !!this.phaserGroups.objects,
        interactions: !!this.phaserGroups.interactions
      },
      sceneKey: this.scene?.scene?.key,
      lastError: this.stats.lastErrorMessage
    };
  }

  resetStats() {
    console.log('[ObjectManager] 🔄 Reset statistiques');
    
    this.stats = {
      objectsInScene: this.objectSprites.size,
      objectsCreatedThisSession: 0,
      objectsDestroyedThisSession: 0,
      cleanupAttempts: 0,
      cleanupErrors: 0,
      lastErrorMessage: null
    };
  }

  // === DESTRUCTION FINALE ===

  destroy() {
    try {
      this.safeCleanupGroups();
      
      Object.keys(this.callbacks).forEach(key => {
        this.callbacks[key] = null;
      });
      
      this.isInitialized = false;
      this.scene = null;
      
    } catch (error) {
      console.error('[ObjectManager] ❌ Erreur destruction finale:', error);
    }
  }
}

// === FONCTIONS DEBUG GLOBALES ===

window.debugObjectManager = function() {
  const managers = [
    window.game?.scene?.getScenes(true)?.[0]?.objectManager,
    window.currentObjectManager
  ].filter(Boolean);
  
  if (managers.length > 0) {
    const info = managers[0].getDebugInfo();
    console.log('[ObjectManager] === DEBUG INFO ===');
    console.table({
      'Objets en Scène': info.stats.objectsInScene,
      'Créés (Session)': info.stats.objectsCreatedThisSession,
      'Détruits (Session)': info.stats.objectsDestroyedThisSession,
      'Tentatives Nettoyage': info.stats.cleanupAttempts,
      'Erreurs Nettoyage': info.stats.cleanupErrors,
      'Sprites Stockés': info.objectCounts.spritesStored,
      'Données Stockées': info.objectCounts.dataStored
    });
    
    if (info.lastError) {
      console.error('[ObjectManager] 🚨 Dernière erreur:', info.lastError);
    }
    
    console.log('[ObjectManager] Info complète:', info);
    return info;
  } else {
    console.error('[ObjectManager] Manager non trouvé');
    return null;
  }
};

// ✅ EXPORT PAR DÉFAUT (corrige l'erreur d'import)
export default ObjectManager;
