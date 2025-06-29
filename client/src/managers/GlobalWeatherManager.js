// client/src/managers/GlobalWeatherManager.js
// SYSTÈME MÉTÉO 100% GLOBAL - REMPLACE TOUT LE SYSTÈME LOCAL

import { ClientTimeWeatherManager } from './ClientTimeWeatherManager.js';
import { zoneEnvironmentManager } from './ZoneEnvironmentManager.js';

export class GlobalWeatherManager {
  constructor() {
    console.log('🌍 [GlobalWeatherManager] === CRÉATION SYSTÈME MÉTÉO GLOBAL ===');
    
    // Managers internes
    this.timeWeatherManager = null;
    this.networkManager = null;
    
    // État global
    this.isInitialized = false;
    this.currentTime = { hour: 12, isDayTime: true };
    this.currentWeather = { weather: 'clear', displayName: 'Ciel dégagé' };
    
    // Scènes enregistrées
    this.registeredScenes = new Map();
    this.activeScenes = new Set();
    
    // Overlays actifs par scène
    this.sceneOverlays = new Map();
    
    // Mode debug
    this.debugMode = false;
    
    // Éviter les updates en boucle
    this.lastUpdateState = null;
    this.updateInProgress = false;
    
    console.log('✅ [GlobalWeatherManager] Instance créée');
  }

  // =====================================
  // INITIALISATION
  // =====================================

  async initialize(networkManager) {
    if (this.isInitialized) {
      console.log('⚠️ [GlobalWeatherManager] Déjà initialisé');
      return true;
    }

    console.log('🚀 [GlobalWeatherManager] === INITIALISATION ===');

    try {
      // Stocker la référence réseau
      this.networkManager = networkManager;

      // Créer le ClientTimeWeatherManager
      this.timeWeatherManager = new ClientTimeWeatherManager(null); // Mode global
      
      // L'initialiser
      this.timeWeatherManager.initialize(networkManager);

      // Setup des callbacks
      this.setupTimeWeatherCallbacks();

      // Marquer comme initialisé
      this.isInitialized = true;

      console.log('✅ [GlobalWeatherManager] Initialisé avec succès');
      return true;

    } catch (error) {
      console.error('❌ [GlobalWeatherManager] Erreur initialisation:', error);
      return false;
    }
  }

  setupTimeWeatherCallbacks() {
    // Callback changement de temps
    this.timeWeatherManager.onTimeChange((hour, isDayTime) => {
      console.log(`🕐 [GlobalWeatherManager] Changement temps: ${hour}h ${isDayTime ? 'JOUR' : 'NUIT'}`);
      
      this.currentTime = { hour, isDayTime };
      this.updateAllScenes('time');
    });

    // Callback changement météo
    this.timeWeatherManager.onWeatherChange((weather, displayName) => {
      console.log(`🌤️ [GlobalWeatherManager] Changement météo: ${displayName}`);
      
      this.currentWeather = { weather, displayName };
      this.updateAllScenes('weather');
    });

    console.log('✅ [GlobalWeatherManager] Callbacks configurés');
  }

  // =====================================
  // GESTION DES SCÈNES
  // =====================================

  registerScene(scene, zoneName) {
    if (!scene || !zoneName) {
      console.warn('⚠️ [GlobalWeatherManager] Scene ou zone manquante pour enregistrement');
      return false;
    }

    const sceneKey = scene.scene.key;
    
    console.log(`📝 [GlobalWeatherManager] Enregistrement scène: ${sceneKey} (zone: ${zoneName})`);

    // Créer les données de la scène
    const sceneData = {
      scene: scene,
      zoneName: zoneName,
      sceneKey: sceneKey,
      environment: zoneEnvironmentManager.getZoneEnvironment(zoneName),
      overlay: null,
      lastState: null
    };

    // Enregistrer
    this.registeredScenes.set(sceneKey, sceneData);
    this.activeScenes.add(sceneKey);

    // Créer l'overlay pour cette scène
    this.createSceneOverlay(sceneData);

    // Appliquer l'état actuel immédiatement
    this.applyWeatherToScene(sceneData);

    console.log(`✅ [GlobalWeatherManager] Scène ${sceneKey} enregistrée (env: ${sceneData.environment})`);
    return true;
  }

  unregisterScene(sceneKey) {
    console.log(`📤 [GlobalWeatherManager] Désenregistrement scène: ${sceneKey}`);

    // Nettoyer l'overlay
    const sceneData = this.registeredScenes.get(sceneKey);
    if (sceneData && sceneData.overlay) {
      sceneData.overlay.destroy();
    }

    // Supprimer des collections
    this.registeredScenes.delete(sceneKey);
    this.activeScenes.delete(sceneKey);
    this.sceneOverlays.delete(sceneKey);

    console.log(`✅ [GlobalWeatherManager] Scène ${sceneKey} désenregistrée`);
  }

  setActiveScene(sceneKey) {
    // Marquer comme active
    this.activeScenes.clear();
    this.activeScenes.add(sceneKey);

    // Appliquer immédiatement
    const sceneData = this.registeredScenes.get(sceneKey);
    if (sceneData) {
      this.applyWeatherToScene(sceneData, true); // Force = true
      console.log(`🎯 [GlobalWeatherManager] Scène active: ${sceneKey}`);
    }
  }

  // =====================================
  // GESTION DES OVERLAYS
  // =====================================

  createSceneOverlay(sceneData) {
    const scene = sceneData.scene;
    
    if (!scene.cameras || !scene.cameras.main) {
      console.warn(`⚠️ [GlobalWeatherManager] Pas de caméra pour ${sceneData.sceneKey}`);
      return null;
    }

    try {
      const camera = scene.cameras.main;
      
      const overlay = scene.add.rectangle(
        camera.centerX,
        camera.centerY,
        camera.width,
        camera.height,
        0x000044,
        0
      );

      overlay.setDepth(9998);
      overlay.setScrollFactor(0);
      overlay.setOrigin(0.5, 0.5);
      overlay.setInteractive(false);
      overlay.setVisible(false);

      // Stocker la référence
      sceneData.overlay = overlay;
      this.sceneOverlays.set(sceneData.sceneKey, overlay);

      console.log(`🎨 [GlobalWeatherManager] Overlay créé pour ${sceneData.sceneKey}`);
      return overlay;

    } catch (error) {
      console.error(`❌ [GlobalWeatherManager] Erreur création overlay:`, error);
      return null;
    }
  }

  // =====================================
  // APPLICATION MÉTÉO
  // =====================================

  updateAllScenes(changeType) {
    if (this.updateInProgress) {
      console.log('⏭️ [GlobalWeatherManager] Update déjà en cours, skip');
      return;
    }

    this.updateInProgress = true;

    console.log(`🔄 [GlobalWeatherManager] Update toutes les scènes (${changeType})`);

    // Appliquer à toutes les scènes actives
    for (const sceneKey of this.activeScenes) {
      const sceneData = this.registeredScenes.get(sceneKey);
      if (sceneData) {
        this.applyWeatherToScene(sceneData);
      }
    }

    this.updateInProgress = false;
  }

  applyWeatherToScene(sceneData, force = false) {
    const { environment, overlay, sceneKey, zoneName } = sceneData;

    if (!overlay) {
      if (this.debugMode) {
        console.log(`⚠️ [GlobalWeatherManager] Pas d'overlay pour ${sceneKey}`);
      }
      return;
    }

    // Calculer l'état attendu
    const stateKey = `${this.currentTime.isDayTime ? 'day' : 'night'}-${this.currentWeather.weather}-${environment}`;

    // Skip si même état (sauf si forcé)
    if (!force && sceneData.lastState === stateKey) {
      if (this.debugMode) {
        console.log(`⚡ [GlobalWeatherManager] Skip ${sceneKey} - état identique: ${stateKey}`);
      }
      return;
    }

    // Calculer couleur et alpha
    const { color, alpha } = this.calculateWeatherEffect(environment);

    if (this.debugMode) {
      console.log(`🎨 [GlobalWeatherManager] ${sceneKey} → ${stateKey} (couleur: 0x${color.toString(16)}, alpha: ${alpha})`);
    }

    // Appliquer
    overlay.setFillStyle(color);
    overlay.setAlpha(alpha);
    
    if (alpha > 0) {
      overlay.setVisible(true);
    } else {
      overlay.setVisible(false);
    }

    // Marquer l'état appliqué
    sceneData.lastState = stateKey;
  }

  calculateWeatherEffect(environment) {
    let color = 0x000044;
    let alpha = 0;

    // Environnement spéciaux
    if (environment === 'indoor') {
      return { color: 0x000044, alpha: 0 }; // Toujours clair
    }

    if (environment === 'cave') {
      return { color: 0x2D1B0E, alpha: 0.6 }; // Toujours sombre
    }

    // Extérieur - effet nuit
    if (!this.currentTime.isDayTime) {
      alpha = 0.4;
      color = 0x000044;
    }

    // Effets météo (s'ajoutent)
    const weather = this.currentWeather.weather;
    
    if (weather === 'rain') {
      color = 0x4488FF;
      alpha = Math.max(alpha, 0.1);
      if (!this.currentTime.isDayTime) alpha = 0.5;
    } else if (weather === 'storm') {
      color = 0x333366;
      alpha = Math.max(alpha, 0.15);
      if (!this.currentTime.isDayTime) alpha = 0.6;
    } else if (weather === 'snow') {
      color = this.currentTime.isDayTime ? 0xCCDDFF : 0x334466;
      alpha = Math.max(alpha, 0.05);
      if (!this.currentTime.isDayTime) alpha = 0.45;
    } else if (weather === 'fog') {
      color = 0xCCCCCC;
      alpha = Math.max(alpha, 0.1);
      if (!this.currentTime.isDayTime) alpha = 0.55;
    }

    return { color, alpha };
  }

  // =====================================
  // API PUBLIQUE
  // =====================================

  getCurrentTime() {
    return { ...this.currentTime };
  }

  getCurrentWeather() {
    return { ...this.currentWeather };
  }

  getTimeWeatherManager() {
    return this.timeWeatherManager;
  }

  forceUpdate() {
    if (!this.isInitialized) {
      console.warn('⚠️ [GlobalWeatherManager] Pas initialisé pour force update');
      return;
    }

    console.log('🔄 [GlobalWeatherManager] Force update de toutes les scènes');

    // Reset des états pour forcer le refresh
    for (const sceneData of this.registeredScenes.values()) {
      sceneData.lastState = null;
    }

    this.updateAllScenes('force');
  }

  onZoneChanged(zoneName) {
    console.log(`🌍 [GlobalWeatherManager] Zone changée: ${zoneName}`);
    
    // Si on a une scène active qui correspond à cette zone, la réappliquer
    for (const sceneKey of this.activeScenes) {
      const sceneData = this.registeredScenes.get(sceneKey);
      if (sceneData && sceneData.zoneName === zoneName) {
        sceneData.lastState = null; // Force refresh
        this.applyWeatherToScene(sceneData, true);
        break;
      }
    }
  }

  // =====================================
  // DEBUG ET CONTRÔLE
  // =====================================

  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`🔧 [GlobalWeatherManager] Debug mode: ${enabled ? 'ON' : 'OFF'}`);
    
    // Propager au TimeWeatherManager
    if (this.timeWeatherManager) {
      this.timeWeatherManager.setDebugMode(enabled);
    }
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      registeredScenes: this.registeredScenes.size,
      activeScenes: this.activeScenes.size,
      currentTime: this.currentTime,
      currentWeather: this.currentWeather,
      debugMode: this.debugMode,
      scenes: Array.from(this.registeredScenes.keys())
    };
  }

  debug() {
    console.log('🔍 [GlobalWeatherManager] === DEBUG ===');
    
    const stats = this.getStats();
    console.log('📊 Stats globales:', stats);
    
    // Debug par scène
    console.log('📝 Scènes enregistrées:');
    for (const [sceneKey, sceneData] of this.registeredScenes) {
      console.log(`  ${sceneKey}:`, {
        zone: sceneData.zoneName,
        environment: sceneData.environment,
        hasOverlay: !!sceneData.overlay,
        lastState: sceneData.lastState,
        isActive: this.activeScenes.has(sceneKey)
      });
    }

    // Debug TimeWeatherManager
    if (this.timeWeatherManager) {
      console.log('⏰ TimeWeatherManager:');
      this.timeWeatherManager.debug();
    }
  }

  // =====================================
  // NETTOYAGE
  // =====================================

  destroy() {
    console.log('🧹 [GlobalWeatherManager] Destruction...');

    // Nettoyer toutes les scènes
    for (const sceneKey of this.registeredScenes.keys()) {
      this.unregisterScene(sceneKey);
    }

    // Nettoyer les collections
    this.registeredScenes.clear();
    this.activeScenes.clear();
    this.sceneOverlays.clear();

    // Nettoyer le TimeWeatherManager
    if (this.timeWeatherManager) {
      this.timeWeatherManager.destroy();
      this.timeWeatherManager = null;
    }

    // Reset état
    this.isInitialized = false;
    this.networkManager = null;

    console.log('✅ [GlobalWeatherManager] Détruit');
  }
}

// =====================================
// INSTANCE GLOBALE
// =====================================

export const globalWeatherManager = new GlobalWeatherManager();
