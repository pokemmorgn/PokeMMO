// client/src/scenes/SceneRegistry.js
// ✅ REGISTRY CENTRALISÉ AVEC IMPORT DYNAMIQUE

export class SceneRegistry {
  static instance = null;
  
  constructor() {
    this.sceneMap = new Map();
    this.classCache = new Map();
    this.importMap = new Map();
    
    // ✅ NOUVEAU: Cache des classes pour éviter les imports dynamiques
    this.registeredClasses = new Map();
    
    // Mapping zone → path d'import (fallback)
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
  
  // ✅ NOUVEAU: Enregistrer une classe directement (évite import dynamique)
  registerSceneClass(zoneName, SceneClass) {
    this.registeredClasses.set(zoneName, SceneClass);
    this.classCache.set(this.getSceneKey(zoneName), SceneClass);
    console.log(`📝 [SceneRegistry] Classe enregistrée: ${zoneName} → ${SceneClass.name}`);
  }
  
  // ✅ MÉTHODE MODIFIÉE: Essayer le cache d'abord, puis import dynamique
  async getSceneClass(zoneName) {
    const sceneKey = this.getSceneKey(zoneName);
    
    // 1. Vérifier le cache des classes enregistrées
    if (this.registeredClasses.has(zoneName)) {
      console.log(`💾 [SceneRegistry] Classe trouvée dans le registry: ${zoneName}`);
      return this.registeredClasses.get(zoneName);
    }
    
    // 2. Vérifier le cache d'import
    if (this.classCache.has(sceneKey)) {
      console.log(`💾 [SceneRegistry] Classe trouvée dans le cache: ${sceneKey}`);
      return this.classCache.get(sceneKey);
    }
    
    // 3. Fallback: Import dynamique
    const importFn = this.importMap.get(zoneName);
    if (!importFn) {
      throw new Error(`Zone inconnue: ${zoneName} (pas de classe enregistrée ni d'import)`);
    }
    
    try {
      console.log(`📦 [SceneRegistry] Fallback import dynamique: ${zoneName}`);
      const module = await importFn();
      const SceneClass = module[sceneKey];
      
      if (!SceneClass) {
        throw new Error(`Classe ${sceneKey} introuvable dans le module`);
      }
      
      // Mettre en cache
      this.classCache.set(sceneKey, SceneClass);
      this.registeredClasses.set(zoneName, SceneClass);
      console.log(`✅ [SceneRegistry] Import dynamique réussi: ${sceneKey}`);
      
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
  
  // ✅ Debug amélioré
  debugInfo() {
    console.log(`📋 [SceneRegistry] === DEBUG ===`);
    console.log(`Zones avec import dynamique: ${Array.from(this.importMap.keys())}`);
    console.log(`Classes enregistrées: ${Array.from(this.registeredClasses.keys())}`);
    console.log(`Classes en cache: ${Array.from(this.classCache.keys())}`);
  }
  
  // ✅ Vérifier si une zone est disponible
  hasZone(zoneName) {
    return this.registeredClasses.has(zoneName) || this.importMap.has(zoneName);
  }
  
  // ✅ Lister toutes les zones disponibles
  getAvailableZones() {
    const zones = new Set([
      ...this.registeredClasses.keys(),
      ...this.importMap.keys()
    ]);
    return Array.from(zones);
  }
  
  // ✅ Nettoyage complet
  clearAll() {
    this.registeredClasses.clear();
    this.classCache.clear();
    console.log(`🧹 [SceneRegistry] Tout nettoyé`);
  }keys())}`);
  }
}
