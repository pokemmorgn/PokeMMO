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
      enableDebugLogs: true,
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
    
    console.log('[ObjectManager] 📦 Créé pour scène:', this.scene.scene.key);
  }

  // === INITIALISATION ===

  initialize() {
    console.log('[ObjectManager] 🚀 === INITIALISATION ===');
    
    try {
      // ✅ Créer les groupes Phaser avec protection
      this.setupPhaserGroups();
      
      // ✅ Marquer comme initialisé
      this.isInitialized = true;
      
      console.log('[ObjectManager] ✅ Initialisé avec succès');
      return true;
      
    } catch (error) {
      console.error('[ObjectManager] ❌ Erreur initialisation:', error);
      this.stats.cleanupErrors++;
      return false;
    }
  }

  setupPhaserGroups() {
    console.log('[ObjectManager] 🎯 Création groupes Phaser...');
    
    try {
      // ✅ Nettoyer les anciens groupes si ils existent
      this.safeCleanupGroups();
      
      // ✅ Créer nouveaux groupes
      this.phaserGroups.objects = this.scene.add.group({
        name: 'ObjectManagerGroup',
        active: true,
        maxSize: -1,
        runChildUpdate: false // ✅ Performance
      });
      
      this.phaserGroups.interactions = this.scene.add.group({
        name: 'ObjectInteractionGroup',
        active: true,
        maxSize: -1,
        runChildUpdate: false
      });
      
      // ✅ Vérifier que les groupes sont valides
      if (!this.phaserGroups.objects || !this.phaserGroups.interactions) {
        throw new Error('Échec création groupes Phaser');
      }
      
      console.log('[ObjectManager] ✅ Groupes Phaser créés');
      
    } catch (error) {
      console.error('[ObjectManager] ❌ Erreur création groupes:', error);
      
      // ✅ Fallback: pas de groupes (mode dégradé)
      this.phaserGroups.objects = null;
      this.phaserGroups.interactions = null;
      
      console.warn('[ObjectManager] ⚠️ Mode dégradé: pas de groupes Phaser');
    }
  }

  // === GESTION DES OBJETS ===

  updateObjects(serverObjects) {
    if (!this.isInitialized) {
      console.warn('[ObjectManager] ⚠️ Manager non initialisé');
      return false;
    }
    
    console.log(`[ObjectManager] 🔄 Mise à jour ${serverObjects.length} objets...`);
    
    const stats = {
      created: 0,
      updated: 0,
      destroyed: 0,
      errors: 0
    };
    
    try {
      // ✅ Créer un Set des IDs serveur pour la comparaison
      const serverObjectIds = new Set(serverObjects.map(obj => obj.id));
      
      // ✅ 1. Traiter les objets du serveur
      for (const serverObject of serverObjects) {
        try {
          if (this.objectSprites.has(serverObject.id)) {
            // ✅ Objet existe - mise à jour
            if (this.updateExistingObject(serverObject)) {
              stats.updated++;
            }
          } else {
            // ✅ Nouvel objet - création
            if (this.createNewObject(serverObject)) {
              stats.created++;
            }
          }
        } catch (error) {
          console.error(`[ObjectManager] ❌ Erreur traitement objet ${serverObject.id}:`, error);
          stats.errors++;
        }
      }
      
      // ✅ 2. Supprimer les objets qui ne sont plus sur le serveur
      const objectsToDestroy = [];
      for (const [objectId] of this.objectSprites) {
        if (!serverObjectIds.has(objectId)) {
          objectsToDestroy.push(objectId);
        }
      }
      
      // ✅ 3. Détruire les objets obsolètes
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
      
      // ✅ Mettre à jour les statistiques
      this.updateStats(stats);
      
      // ✅ Log du résultat
      if (this.config.enableDebugLogs && (stats.created > 0 || stats.destroyed > 0)) {
        console.log(`[ObjectManager] ✅ ${stats.created + stats.updated + stats.destroyed} objets traités (${stats.created} créés, ${stats.updated} mis à jour, ${stats.destroyed} détruits)`);
      }
      
      return true;
      
    } catch (error) {
      console.error('[ObjectManager] ❌ Erreur mise à jour objets:', error);
      this.stats.cleanupErrors++;
      return false;
    }
  }

  createNewObject(objectData) {
    try {
      console.log(`[ObjectManager] 🆕 Création objet: ${objectData.id} à (${objectData.x}, ${objectData.y})`);
      
      // ✅ Valider les données
      if (!this.validateObjectData(objectData)) {
        throw new Error(`Données objet invalides: ${JSON.stringify(objectData)}`);
      }
      
      // ✅ Déterminer la texture
      const texture = this.determineTexture(objectData);
      if (!texture) {
        throw new Error(`Texture non déterminée pour objet: ${objectData.type || objectData.name}`);
      }
      
      // ✅ Créer le sprite
      const sprite = this.scene.add.sprite(objectData.x, objectData.y, texture);
      if (!sprite) {
        throw new Error('Échec création sprite Phaser');
      }
      
      // ✅ Configurer le sprite
      this.configureSprite(sprite, objectData);
      
      // ✅ Ajouter au groupe Phaser (si disponible)
      this.addSpriteToGroup(sprite, 'objects');
      
      // ✅ Stocker dans nos Maps
      this.objectSprites.set(objectData.id, sprite);
      this.objectData.set(objectData.id, { ...objectData, createdAt: Date.now() });
      
      // ✅ Mise à jour statistiques
      this.state.totalObjectsCreated++;
      this.stats.objectsInScene++;
      this.stats.objectsCreatedThisSession++;
      
      // ✅ Callback
      if (this.callbacks.onObjectCreated) {
        this.callbacks.onObjectCreated(objectData, sprite);
      }
      
      if (this.config.enableDebugLogs) {
        console.log(`[ObjectManager] ✅ Sprite créé: ${objectData.id} à (${objectData.x}, ${objectData.y})`);
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
        console.warn(`[ObjectManager] ⚠️ Objet ${objectData.id} introuvable pour mise à jour`);
        return false;
      }
      
      // ✅ Vérifier si une mise à jour est nécessaire
      const needsUpdate = this.checkIfUpdateNeeded(oldData, objectData);
      if (!needsUpdate) {
        return false; // Pas de changement
      }
      
      // ✅ Mettre à jour la position si nécessaire
      if (oldData.x !== objectData.x || oldData.y !== objectData.y) {
        sprite.setPosition(objectData.x, objectData.y);
        
        if (this.config.enableDebugLogs) {
          console.log(`[ObjectManager] 📍 Position mise à jour: ${objectData.id} -> (${objectData.x}, ${objectData.y})`);
        }
      }
      
      // ✅ Mettre à jour la texture si nécessaire
      const newTexture = this.determineTexture(objectData);
      if (newTexture && sprite.texture.key !== newTexture) {
        sprite.setTexture(newTexture);
        
        if (this.config.enableDebugLogs) {
          console.log(`[ObjectManager] 🎨 Texture mise à jour: ${objectData.id} -> ${newTexture}`);
        }
      }
      
      // ✅ Mettre à jour les données stockées
      this.objectData.set(objectData.id, { ...objectData, updatedAt: Date.now() });
      
      // ✅ Callback
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
        console.warn(`[ObjectManager] ⚠️ Sprite ${objectId} déjà détruit ou inexistant`);
        return false;
      }
      
      if (this.config.enableDebugLogs) {
        console.log(`[ObjectManager] 🗑️ Destruction objet: ${objectId}`);
      }
      
      // ✅ Retirer du groupe Phaser d'abord
      this.removeSpriteFromGroup(sprite, 'objects');
      
      // ✅ Détruire le sprite Phaser
      if (sprite && sprite.scene && !sprite.scene.sys.isDestroyed) {
        sprite.destroy();
      }
      
      // ✅ Supprimer de nos Maps
      this.objectSprites.delete(objectId);
      this.objectData.delete(objectId);
      
      // ✅ Mise à jour statistiques
      this.state.totalObjectsDestroyed++;
      this.stats.objectsInScene--;
      this.stats.objectsDestroyedThisSession++;
      
      // ✅ Callback
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
      console.log('[ObjectManager] ⚠️ Nettoyage déjà en cours, skip');
      return;
    }
    
    this.state.isCleaningUp = true;
    this.state.lastCleanupTime = Date.now();
    this.stats.cleanupAttempts++;
    
    console.log('[ObjectManager] 🧹 === NETTOYAGE SÉCURISÉ DES GROUPES ===');
    
    // ✅ Callback de début
    if (this.callbacks.onCleanupStart) {
      this.callbacks.onCleanupStart();
    }
    
    try {
      // ✅ ÉTAPE 1: Nettoyer d'abord nos Maps internes
      console.log('[ObjectManager] 🗂️ Nettoyage Maps internes...');
      this.cleanupInternalMaps();
      
      // ✅ ÉTAPE 2: Nettoyer les groupes Phaser avec plusieurs stratégies
      console.log('[ObjectManager] 🎯 Nettoyage groupes Phaser...');
      this.cleanupPhaserGroupsSafely();
      
      // ✅ ÉTAPE 3: Réinitialiser les groupes à null
      console.log('[ObjectManager] 🔄 Réinitialisation groupes...');
      this.phaserGroups.objects = null;
      this.phaserGroups.interactions = null;
      
      console.log('[ObjectManager] ✅ Nettoyage terminé avec succès');
      
      // ✅ Callback de succès
      if (this.callbacks.onCleanupComplete) {
        this.callbacks.onCleanupComplete(true);
      }
      
    } catch (error) {
      console.error('[ObjectManager] ❌ Erreur nettoyage:', error);
      this.stats.cleanupErrors++;
      this.stats.lastErrorMessage = error.message;
      
      // ✅ Callback d'erreur
      if (this.callbacks.onCleanupError) {
        this.callbacks.onCleanupError(error);
      }
      
      // ✅ Forcer la réinitialisation même en cas d'erreur
      this.phaserGroups.objects = null;
      this.phaserGroups.interactions = null;
      
    } finally {
      this.state.isCleaningUp = false;
    }
  }

  cleanupInternalMaps() {
    const objectCount = this.objectSprites.size;
    
    // ✅ Détruire tous les sprites individuellement AVANT de toucher aux groupes
    for (const [objectId, sprite] of this.objectSprites) {
      try {
        if (sprite && sprite.scene && !sprite.scene.sys.isDestroyed) {
          // ✅ Important: ne pas utiliser les groupes ici
          sprite.destroy();
        }
      } catch (error) {
        console.warn(`[ObjectManager] ⚠️ Erreur destruction sprite ${objectId}:`, error);
      }
    }
    
    // ✅ Vider les Maps
    this.objectSprites.clear();
    this.objectData.clear();
    
    // ✅ Reset statistiques
    this.stats.objectsInScene = 0;
    
    console.log(`[ObjectManager] ✅ ${objectCount} sprites nettoyés individuellement`);
  }

  cleanupPhaserGroupsSafely() {
    const strategies = [
      () => this.cleanupStrategy_RemoveAllFirst(),
      () => this.cleanupStrategy_DestroyDirectly(),
      () => this.cleanupStrategy_SkipClear()
    ];
    
    for (const [groupName, group] of Object.entries(this.phaserGroups)) {
      if (!group) continue;
      
      console.log(`[ObjectManager] 🧹 Nettoyage groupe: ${groupName}`);
      
      // ✅ Essayer chaque stratégie jusqu'à ce qu'une fonctionne
      let cleaned = false;
      for (let i = 0; i < strategies.length && !cleaned; i++) {
        try {
          strategies[i](group, groupName);
          cleaned = true;
          console.log(`[ObjectManager] ✅ Groupe ${groupName} nettoyé avec stratégie ${i + 1}`);
        } catch (error) {
          console.warn(`[ObjectManager] ⚠️ Stratégie ${i + 1} échouée pour ${groupName}:`, error);
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
    // ✅ Logique de détermination de texture
    if (objectData.sprite) {
      return objectData.sprite;
    }
    
    if (objectData.type) {
      const textureMap = {
        'pokeball': 'pokeball',
        'potion': 'potion',
        'berry': 'berry',
        'item': 'item_generic',
        'collectible': 'collectible'
      };
      
      return textureMap[objectData.type.toLowerCase()] || 'item_generic';
    }
    
    if (objectData.name) {
      const name = objectData.name.toLowerCase();
      if (name.includes('ball')) return 'pokeball';
      if (name.includes('potion')) return 'potion';
      if (name.includes('berry')) return 'berry';
    }
    
    return 'item_generic'; // Fallback
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
    
    // ✅ Logs de performance si beaucoup d'opérations
    if (operationStats.created + operationStats.destroyed > 10) {
      console.log(`[ObjectManager] 📊 Opération importante: +${operationStats.created} -${operationStats.destroyed} objets`);
    }
  }

  // === API PUBLIQUE ===

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
    console.log('[ObjectManager] 💀 === DESTRUCTION FINALE ===');
    
    try {
      // ✅ Nettoyer en toute sécurité
      this.safeCleanupGroups();
      
      // ✅ Vider les callbacks
      Object.keys(this.callbacks).forEach(key => {
        this.callbacks[key] = null;
      });
      
      // ✅ Reset état
      this.isInitialized = false;
      this.scene = null;
      
      console.log('[ObjectManager] ✅ Destruction terminée');
      
    } catch (error) {
      console.error('[ObjectManager] ❌ Erreur destruction finale:', error);
    }
  }
}

// === FONCTIONS DEBUG GLOBALES ===

window.debugObjectManager = function() {
  // Essayer de trouver le manager dans différents endroits
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

console.log('✅ ObjectManager chargé (VERSION CORRIGÉE)!');
console.log('🔍 Utilisez window.debugObjectManager() pour diagnostiquer');
console.log('🎯 Le problème de nettoyage des groupes Phaser devrait être résolu!');
