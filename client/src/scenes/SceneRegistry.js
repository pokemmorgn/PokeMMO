// client/src/scenes/SceneRegistry.js
// ✅ REGISTRY CENTRALISÉ AVEC IMPORT DYNAMIQUE

export class SceneRegistry {
  static instance = null;
  
  constructor() {
    this.sceneMap = new Map();
    this.classCache = new Map();
    this.importMap = new Map();
    
    // Mapping zone → path d'import (pas de dépendance circulaire)
    this.setupImportMap();
  }
  
  static getInstance() {
    if (!SceneRegistry.instance) {
      SceneRegistry.instance = new SceneRegistry();
    }
    return SceneRegistry.instance;
  }
  
  setupImportMap() {
    // ✅ Seulement les chemins, pas les classes
    this.importMap.set('beach', () => import('./zones/BeachScene.js'));
    this.importMap.set('village', () => import('./zones/VillageScene.js'));
    this.importMap.set('villagelab', () => import('./zones/VillageLabScene.js'));
    this.importMap.set('road1', () => import('./zones/Road1Scene.js'));
    this.importMap.set('villagehouse1', () => import('./zones/VillageHouse1Scene.js'));
    this.importMap.set('lavandia', () => import('./zones/LavandiaScene.js'));
  }
  
  // ✅ Import dynamique avec cache
  async getSceneClass(zoneName) {
    const sceneKey = this.getSceneKey(zoneName);
    
    // Vérifier le cache d'abord
    if (this.classCache.has(sceneKey)) {
      return this.classCache.get(sceneKey);
    }
    
    // Import dynamique
    const importFn = this.importMap.get(zoneName);
    if (!importFn) {
      throw new Error(`Zone inconnue: ${zoneName}`);
    }
    
    try {
      console.log(`📦 [SceneRegistry] Import dynamique: ${zoneName}`);
      const module = await importFn();
      const SceneClass = module[sceneKey]; // Ex: module.BeachScene
      
      if (!SceneClass) {
        throw new Error(`Classe ${sceneKey} introuvable dans le module`);
      }
      
      // Mettre en cache
      this.classCache.set(sceneKey, SceneClass);
      console.log(`✅ [SceneRegistry] Classe ${sceneKey} chargée et mise en cache`);
      
      return SceneClass;
    } catch (error) {
      console.error(`❌ [SceneRegistry] Erreur import ${zoneName}:`, error);
      throw error;
    }
  }
  
  // ✅ Créer une nouvelle instance de scène
  async createSceneInstance(zoneName) {
    const SceneClass = await this.getSceneClass(zoneName);
    const sceneKey = this.getSceneKey(zoneName);
    
    console.log(`🏭 [SceneRegistry] Création instance: ${sceneKey}`);
    return new SceneClass();
  }
  
  // ✅ Enregistrer une scène dans Phaser
  async registerSceneInPhaser(game, zoneName) {
    const sceneInstance = await this.createSceneInstance(zoneName);
    const sceneKey = this.getSceneKey(zoneName);
    
    // Vérifier si déjà enregistrée
    if (game.scene.getScene(sceneKey)) {
      console.warn(`⚠️ [SceneRegistry] Scène ${sceneKey} déjà enregistrée`);
      return sceneInstance;
    }
    
    // Ajouter à Phaser
    game.scene.add(sceneKey, sceneInstance, false);
    console.log(`✅ [SceneRegistry] Scène ${sceneKey} enregistrée dans Phaser`);
    
    return sceneInstance;
  }
  
  // ✅ Mapping zone → clé de scène
  getSceneKey(zoneName) {
    const mapping = {
      'beach': 'BeachScene',
      'village': 'VillageScene', 
      'villagelab': 'VillageLabScene',
      'road1': 'Road1Scene',
      'villagehouse1': 'VillageHouse1Scene',
      'lavandia': 'LavandiaScene'
    };
    return mapping[zoneName] || `${zoneName}Scene`;
  }
  
  getZoneFromSceneKey(sceneKey) {
    const mapping = {
      'BeachScene': 'beach',
      'VillageScene': 'village',
      'VillageLabScene': 'villagelab', 
      'Road1Scene': 'road1',
      'VillageHouse1Scene': 'villagehouse1',
      'LavandiaScene': 'lavandia'
    };
    return mapping[sceneKey] || sceneKey.toLowerCase();
  }
  
  // ✅ Nettoyage du cache (si nécessaire)
  clearCache() {
    this.classCache.clear();
    console.log(`🧹 [SceneRegistry] Cache nettoyé`);
  }
  
  // ✅ Debug
  debugInfo() {
    console.log(`📋 [SceneRegistry] === DEBUG ===`);
    console.log(`Zones disponibles: ${Array.from(this.importMap.keys())}`);
    console.log(`Classes en cache: ${Array.from(this.classCache.keys())}`);
  }
}
