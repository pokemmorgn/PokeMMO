// client/src/managers/GlobalWeatherManager.js
// VERSION ULTRA-OPTIMISÉE - SYNCHRONISATION DIRECTE AVEC SERVEUR

import { zoneEnvironmentManager } from './ZoneEnvironmentManager.js';
import { WeatherEffects } from '../effects/WeatherEffects.js';

export class GlobalWeatherManager {
  constructor() {
    console.log('🌍 [GlobalWeatherManager] === CRÉATION SYSTÈME MÉTÉO ULTRA-OPTIMISÉ ===');
    
    // Managers internes - PLUS DE ClientTimeWeatherManager
    this.networkManager = null;
    
    // État global - DIRECTEMENT DEPUIS LE SERVEUR
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
    
    // Gestionnaire d'effets visuels
    this.sceneWeatherEffects = new Map();
    
    // Éviter les updates en boucle
    this.lastUpdateState = null;
    this.updateInProgress = false;
    
    // ✅ NOUVEAU: Callbacks pour widgets
    this.timeChangeCallbacks = [];
    this.weatherChangeCallbacks = [];
    
    console.log('✅ [GlobalWeatherManager] Instance ultra-optimisée créée (SYNC DIRECTE)');
  }

  // =====================================
  // INITIALISATION DIRECTE AVEC SERVEUR
  // =====================================

  async initialize(networkManager) {
    if (this.isInitialized) {
      console.log('⚠️ [GlobalWeatherManager] Déjà initialisé');
      return true;
    }

    console.log('🚀 [GlobalWeatherManager] === INITIALISATION DIRECTE SERVEUR ===');

    try {
      this.networkManager = networkManager;
      
      // ✅ SETUP HANDLERS RÉSEAU DIRECTS
      this.setupDirectNetworkHandlers();
      
      // ✅ SYNCHRONISATION IMMÉDIATE si état serveur disponible
      if (networkManager.room && networkManager.room.state) {
        console.log('📡 [GlobalWeatherManager] État serveur disponible, sync immédiate...');
        this.syncFromServerState();
      } else {
        console.log('⏳ [GlobalWeatherManager] État serveur pas encore disponible, attente...');
        this.waitForServerState();
      }
      
      this.isInitialized = true;
      console.log('✅ [GlobalWeatherManager] Initialisé avec sync directe serveur');
      return true;

    } catch (error) {
      console.error('❌ [GlobalWeatherManager] Erreur initialisation:', error);
      return false;
    }
  }

  // ✅ NOUVEAU: Setup handlers réseau directs (sans ClientTimeWeatherManager)
  setupDirectNetworkHandlers() {
    console.log('📡 [GlobalWeatherManager] Setup handlers réseau directs...');
    
    // Handler temps direct
    this.networkManager.onMessage("timeUpdate", (data) => {
      console.log(`🕐 [GlobalWeatherManager] TimeUpdate direct: ${data.displayTime}`);
      this.handleDirectTimeUpdate(data);
    });

    // Handler météo direct
    this.networkManager.onMessage("weatherUpdate", (data) => {
      console.log(`🌤️ [GlobalWeatherManager] WeatherUpdate direct: ${data.displayName}`);
      this.handleDirectWeatherUpdate(data);
    });

    // Handler état initial temps
    this.networkManager.onMessage("currentTime", (data) => {
      console.log(`🕐 [GlobalWeatherManager] CurrentTime direct: ${data.displayTime}`);
      this.handleDirectTimeUpdate(data);
    });

    // Handler état initial météo
    this.networkManager.onMessage("currentWeather", (data) => {
      console.log(`🌤️ [GlobalWeatherManager] CurrentWeather direct: ${data.displayName}`);
      this.handleDirectWeatherUpdate(data);
    });

    console.log('✅ [GlobalWeatherManager] Handlers directs configurés');
  }

  // ✅ NOUVEAU: Synchronisation depuis l'état du serveur
  syncFromServerState() {
    if (!this.networkManager.room || !this.networkManager.room.state) {
      console.warn('⚠️ [GlobalWeatherManager] Pas d\'état serveur pour sync');
      return;
    }

    const state = this.networkManager.room.state;
    
    // Vérifier les changements
    const oldTime = { ...this.currentTime };
    const oldWeather = { ...this.currentWeather };
    
    // Mise à jour directe
    this.currentTime = {
      hour: state.gameHour,
      isDayTime: state.isDayTime
    };
    
    this.currentWeather = {
      weather: state.weather,
      displayName: this.getWeatherDisplayName(state.weather)
    };
    
    console.log('✅ [GlobalWeatherManager] Sync directe depuis état serveur:', {
      time: this.currentTime,
      weather: this.currentWeather
    });
    
    // ✅ FORCER LES UPDATES SI CHANGEMENTS
    let hasTimeChanged = oldTime.hour !== this.currentTime.hour || oldTime.isDayTime !== this.currentTime.isDayTime;
    let hasWeatherChanged = oldWeather.weather !== this.currentWeather.weather;
    
    if (hasTimeChanged) {
      this.notifyTimeCallbacks(this.currentTime.hour, this.currentTime.isDayTime);
      this.updateAllScenes('time');
    }
    
    if (hasWeatherChanged) {
      console.log(`🔄 [GlobalWeatherManager] FORCE UPDATE MÉTÉO: ${oldWeather.displayName} → ${this.currentWeather.displayName}`);
      this.notifyWeatherCallbacks(this.currentWeather.weather, this.currentWeather.displayName);
      this.updateAllScenes('weather');
      this.updateWeatherEffectsForAllScenes(this.currentWeather.weather);
    }
    
    // Si pas de changements majeurs, forcer quand même un sync complet
    if (!hasTimeChanged && !hasWeatherChanged) {
      this.updateAllScenes('sync');
    }
  }

  // ✅ NOUVEAU: Attendre l'état serveur
  waitForServerState() {
    const checkServerState = () => {
      if (this.networkManager.room && this.networkManager.room.state && 
          this.networkManager.room.state.gameHour !== undefined) {
        
        console.log('✅ [GlobalWeatherManager] État serveur maintenant disponible');
        this.syncFromServerState();
        
      } else {
        // Réessayer dans 100ms
        setTimeout(checkServerState, 100);
      }
    };
    
    setTimeout(checkServerState, 100);
  }

  // ✅ NOUVEAU: Handler temps direct
  handleDirectTimeUpdate(data) {
    const newTime = {
      hour: data.gameHour,
      isDayTime: data.isDayTime
    };
    
    // Vérifier si changement
    if (this.currentTime.hour !== newTime.hour || this.currentTime.isDayTime !== newTime.isDayTime) {
      console.log(`🕐 [GlobalWeatherManager] Changement temps: ${this.currentTime.hour}h → ${newTime.hour}h`);
      
      this.currentTime = newTime;
      
      // Notifier immédiatement les callbacks
      this.notifyTimeCallbacks(newTime.hour, newTime.isDayTime);
      
      // Mettre à jour les scènes
      this.updateAllScenes('time');
    }
  }

  // ✅ NOUVEAU: Handler météo direct
  handleDirectWeatherUpdate(data) {
    const newWeather = {
      weather: data.weather,
      displayName: data.displayName
    };
    
    // Vérifier si changement
    if (this.currentWeather.weather !== newWeather.weather) {
      console.log(`🌤️ [GlobalWeatherManager] Changement météo: ${this.currentWeather.displayName} → ${newWeather.displayName}`);
      
      this.currentWeather = newWeather;
      
      // ✅ FORCER L'UPDATE DES SCÈNES IMMÉDIATEMENT
      this.updateAllScenes('weather');
      this.updateWeatherEffectsForAllScenes(newWeather.weather);
      
      // Notifier immédiatement les callbacks
      this.notifyWeatherCallbacks(newWeather.weather, newWeather.displayName);
    }
  }

  // ✅ NOUVEAU: Conversion noms météo
  getWeatherDisplayName(weatherName) {
    const weatherNames = {
      'clear': 'Ciel dégagé',
      'rain': 'Pluie',
      'storm': 'Orage',
      'snow': 'Neige',
      'fog': 'Brouillard',
      'cloudy': 'Nuageux'
    };
    
    return weatherNames[weatherName] || weatherName;
  }

  // ✅ NOUVEAU: API pour widgets - callbacks temps
  onTimeChange(callback) {
    this.timeChangeCallbacks.push(callback);
    
    // Appeler immédiatement avec l'état actuel
    setTimeout(() => {
      callback(this.currentTime.hour, this.currentTime.isDayTime);
    }, 10);
    
    console.log(`✅ [GlobalWeatherManager] Callback temps enregistré (total: ${this.timeChangeCallbacks.length})`);
  }

  // ✅ NOUVEAU: API pour widgets - callbacks météo
  onWeatherChange(callback) {
    this.weatherChangeCallbacks.push(callback);
    
    // Appeler immédiatement avec l'état actuel
    setTimeout(() => {
      callback(this.currentWeather.weather, this.currentWeather.displayName);
    }, 10);
    
    console.log(`✅ [GlobalWeatherManager] Callback météo enregistré (total: ${this.weatherChangeCallbacks.length})`);
  }

  // ✅ NOUVEAU: Notifier callbacks temps
  notifyTimeCallbacks(hour, isDayTime) {
    console.log(`📢 [GlobalWeatherManager] Notification temps: ${hour}h ${isDayTime ? '(JOUR)' : '(NUIT)'} → ${this.timeChangeCallbacks.length} callbacks`);
    
    this.timeChangeCallbacks.forEach(callback => {
      try {
        callback(hour, isDayTime);
      } catch (error) {
        console.error(`❌ [GlobalWeatherManager] Erreur callback temps:`, error);
      }
    });
  }

  // ✅ NOUVEAU: Notifier callbacks météo
  notifyWeatherCallbacks(weather, displayName) {
    console.log(`📢 [GlobalWeatherManager] Notification météo: ${displayName} → ${this.weatherChangeCallbacks.length} callbacks`);
    
    this.weatherChangeCallbacks.forEach(callback => {
      try {
        callback(weather, displayName);
      } catch (error) {
        console.error(`❌ [GlobalWeatherManager] Erreur callback météo:`, error);
      }
    });
  }

  // ✅ NOUVEAU: Pour compatibilité avec widget
  getTimeWeatherManager() {
    return {
      onTimeChange: (callback) => this.onTimeChange(callback),
      onWeatherChange: (callback) => this.onWeatherChange(callback),
      getCurrentTime: () => this.getCurrentTime(),
      getCurrentWeather: () => this.getCurrentWeather()
    };
  }

  // =====================================
  // GESTION DES SCÈNES AVEC EFFETS OPTIMISÉS
  // =====================================

  registerScene(scene, zoneName) {
    if (!scene || !zoneName) {
      console.warn('⚠️ [GlobalWeatherManager] Scene ou zone manquante pour enregistrement');
      return false;
    }

    const sceneKey = scene.scene.key;
    
    console.log(`📝 [GlobalWeatherManager] Enregistrement scène ultra-optimisée: ${sceneKey} (zone: ${zoneName})`);

    // ✅ CRÉER LES EFFETS MÉTÉO ULTRA-OPTIMISÉS
    const weatherEffects = new WeatherEffects(scene);
    scene.weatherEffects = weatherEffects;
    this.sceneWeatherEffects.set(sceneKey, weatherEffects);

    // Créer les données de la scène
    const sceneData = {
      scene: scene,
      zoneName: zoneName,
      sceneKey: sceneKey,
      environment: zoneEnvironmentManager.getZoneEnvironment(zoneName),
      overlay: null,
      lastState: null,
      weatherEffects: weatherEffects
    };

    // Enregistrer
    this.registeredScenes.set(sceneKey, sceneData);
    this.activeScenes.add(sceneKey);

    // Créer l'overlay pour cette scène
    this.createOptimizedSceneOverlay(sceneData);

    // Appliquer l'état actuel
    this.applyOptimizedWeatherToScene(sceneData);
    this.applyWeatherEffectsToScene(sceneData);

    console.log(`✅ [GlobalWeatherManager] Scène ${sceneKey} enregistrée ultra-optimisée (env: ${sceneData.environment})`);
    return true;
  }
  
  unregisterScene(sceneKey) {
    console.log(`📤 [GlobalWeatherManager] Désenregistrement scène ultra-optimisée: ${sceneKey}`);

    // Nettoyer l'overlay
    const sceneData = this.registeredScenes.get(sceneKey);
    if (sceneData && sceneData.overlay) {
      sceneData.overlay.destroy();
    }

    // Nettoyer les effets météo
    const weatherEffects = this.sceneWeatherEffects.get(sceneKey);
    if (weatherEffects) {
      weatherEffects.destroy();
      this.sceneWeatherEffects.delete(sceneKey);
    }

    // Supprimer des collections
    this.registeredScenes.delete(sceneKey);
    this.activeScenes.delete(sceneKey);
    this.sceneOverlays.delete(sceneKey);

    console.log(`✅ [GlobalWeatherManager] Scène ${sceneKey} désenregistrée ultra-optimisée`);
  }

  setActiveScene(sceneKey) {
    this.activeScenes.clear();
    this.activeScenes.add(sceneKey);

    const sceneData = this.registeredScenes.get(sceneKey);
    if (sceneData) {
      this.applyOptimizedWeatherToScene(sceneData, true);
      console.log(`🎯 [GlobalWeatherManager] Scène ultra-optimisée active: ${sceneKey}`);
    }
  }

  // =====================================
  // CRÉATION D'OVERLAY OPTIMISÉ
  // =====================================

  createOptimizedSceneOverlay(sceneData) {
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
        0x000044, // ✅ Couleur fixe, pas de changement pour la pluie
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

      console.log(`🎨 [GlobalWeatherManager] Overlay ultra-optimisé créé pour ${sceneData.sceneKey}`);
      return overlay;

    } catch (error) {
      console.error(`❌ [GlobalWeatherManager] Erreur création overlay optimisé:`, error);
      return null;
    }
  }

  // =====================================
  // APPLICATION MÉTÉO ULTRA-OPTIMISÉE
  // =====================================

  updateAllScenes(changeType) {
    if (this.updateInProgress) {
      console.log('⏭️ [GlobalWeatherManager] Update ultra-optimisé déjà en cours, skip');
      return;
    }

    this.updateInProgress = true;

    console.log(`🔄 [GlobalWeatherManager] Update ultra-optimisé toutes les scènes (${changeType})`);

    // Appliquer à toutes les scènes actives
    for (const sceneKey of this.activeScenes) {
      const sceneData = this.registeredScenes.get(sceneKey);
      if (sceneData) {
        this.applyOptimizedWeatherToScene(sceneData);
        this.applyWeatherEffectsToScene(sceneData);
      }
    }

    this.updateInProgress = false;
  }

  // ✅ APPLICATION MÉTÉO ULTRA-OPTIMISÉE - NUIT RÉDUITE + PAS DE COULEUR PLUIE
  applyOptimizedWeatherToScene(sceneData, force = false) {
    const { environment, overlay, sceneKey } = sceneData;

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
        console.log(`⚡ [GlobalWeatherManager] Skip ultra-optimisé ${sceneKey} - état identique: ${stateKey}`);
      }
      return;
    }

    // ✅ CALCUL ULTRA-OPTIMISÉ
    const { color, alpha } = this.calculateOptimizedWeatherEffect(environment);

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

  // ✅ CALCUL ULTRA-OPTIMISÉ - NUIT RÉDUITE + PAS DE COULEUR PLUIE
  calculateOptimizedWeatherEffect(environment) {
    let color = 0x000044; // ✅ COULEUR FIXE - PAS DE CHANGEMENT POUR LA PLUIE
    let alpha = 0;

    // Environnement spéciaux
    if (environment === 'indoor') {
      return { color: 0x000044, alpha: 0 }; // Toujours clair
    }

    if (environment === 'cave') {
      return { color: 0x2D1B0E, alpha: 0.4 }; // ✅ RÉDUIT de 0.6 à 0.4
    }

    // ✅ NUIT RÉDUITE - de 0.4 à 0.25
    if (!this.currentTime.isDayTime) {
      alpha = 0.25; // ✅ BEAUCOUP PLUS CLAIR LA NUIT
      color = 0x000044; // Couleur fixe
    }

    // ✅ EFFETS MÉTÉO AVEC ALPHA PLUIE
    const weather = this.currentWeather.weather;
    
    if (weather === 'rain') {
      // ✅ ALPHA 0.2 pour donner un petit effet pluie
      alpha = Math.max(alpha, 0.2); // Effet pluie visible
      if (!this.currentTime.isDayTime) alpha = Math.max(alpha, 0.4); // Nuit + pluie
    } else if (weather === 'storm') {
      // ✅ Orage plus intense
      alpha = Math.max(alpha, 0.25); // Effet orage plus visible
      if (!this.currentTime.isDayTime) alpha = Math.max(alpha, 0.5); // Nuit + orage
    } else if (weather === 'snow') {
      // ✅ Neige garde un léger effet mais réduit
      color = this.currentTime.isDayTime ? 0xCCDDFF : 0x334466;
      alpha = Math.max(alpha, 0.03); // ✅ RÉDUIT de 0.05 à 0.03
      if (!this.currentTime.isDayTime) alpha = 0.3; // ✅ RÉDUIT de 0.45 à 0.3
    } else if (weather === 'fog') {
      color = 0xCCCCCC;
      alpha = Math.max(alpha, 0.08); // ✅ RÉDUIT de 0.1 à 0.08
      if (!this.currentTime.isDayTime) alpha = 0.4; // ✅ RÉDUIT de 0.55 à 0.4
    }

    return { color, alpha };
  }

  // =====================================
  // EFFETS VISUELS OPTIMISÉS
  // =====================================

  applyWeatherEffectsToScene(sceneData) {
    const { weatherEffects, environment } = sceneData;
    
    if (!weatherEffects) return;

    // Définir le type d'environnement
    weatherEffects.setEnvironmentType(environment);

    // Appliquer la météo actuelle
    if (environment === 'outdoor') {
      weatherEffects.setWeather(this.currentWeather.weather);
    } else {
      weatherEffects.setWeather('clear'); // Pas d'effets en intérieur
    }
  }

  updateWeatherEffectsForAllScenes(weather) {
    for (const [sceneKey, weatherEffects] of this.sceneWeatherEffects) {
      const sceneData = this.registeredScenes.get(sceneKey);
      if (sceneData && sceneData.environment === 'outdoor') {
        weatherEffects.setWeather(weather);
      }
    }
  }

  // =====================================
  // API PUBLIQUE INCHANGÉE
  // =====================================

  getCurrentTime() {
    return { ...this.currentTime };
  }

  getCurrentWeather() {
    return { ...this.currentWeather };
  }

  forceUpdate() {
    if (!this.isInitialized) {
      console.warn('⚠️ [GlobalWeatherManager] Pas initialisé pour force update ultra-optimisé');
      return;
    }

    console.log('🔄 [GlobalWeatherManager] Force update ultra-optimisé de toutes les scènes');

    // Reset des états pour forcer le refresh
    for (const sceneData of this.registeredScenes.values()) {
      sceneData.lastState = null;
    }

    // ✅ FORCER AUSSI LA SYNC DEPUIS LE SERVEUR
    this.syncFromServerState();

    this.updateAllScenes('force');
  }

  onZoneChanged(zoneName) {
    console.log(`🌍 [GlobalWeatherManager] Zone changée ultra-optimisée: ${zoneName}`);
    
    for (const sceneKey of this.activeScenes) {
      const sceneData = this.registeredScenes.get(sceneKey);
      if (sceneData && sceneData.zoneName === zoneName) {
        sceneData.lastState = null;
        this.applyOptimizedWeatherToScene(sceneData, true);
        break;
      }
    }
  }

  // =====================================
  // DEBUG ET CONTRÔLE
  // =====================================

  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`🔧 [GlobalWeatherManager] Debug mode ultra-optimisé: ${enabled ? 'ON' : 'OFF'}`);
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      registeredScenes: this.registeredScenes.size,
      activeScenes: this.activeScenes.size,
      currentTime: this.currentTime,
      currentWeather: this.currentWeather,
      debugMode: this.debugMode,
      scenes: Array.from(this.registeredScenes.keys()),
      callbacks: {
        time: this.timeChangeCallbacks.length,
        weather: this.weatherChangeCallbacks.length
      },
      optimizations: {
        directServerSync: true,
        noClientTimeWeatherManager: true,
        reducedNightAlpha: true,
        noRainColorChange: true,
        singleTileSprite: true,
        automaticSync: true
      }
    };
  }

  debug() {
    console.log('🔍 [GlobalWeatherManager] === DEBUG ULTRA-OPTIMISÉ (SYNC DIRECTE) ===');
    
    const stats = this.getStats();
    console.log('📊 Stats ultra-optimisées:', stats);
    
    // Debug par scène
    console.log('📝 Scènes ultra-optimisées:');
    for (const [sceneKey, sceneData] of this.registeredScenes) {
      console.log(`  ${sceneKey}:`, {
        zone: sceneData.zoneName,
        environment: sceneData.environment,
        hasOverlay: !!sceneData.overlay,
        hasWeatherEffects: !!sceneData.weatherEffects,
        lastState: sceneData.lastState,
        isActive: this.activeScenes.has(sceneKey)
      });
    }

    // Debug état serveur
    if (this.networkManager?.room?.state) {
      console.log('📡 État serveur direct:', {
        gameHour: this.networkManager.room.state.gameHour,
        isDayTime: this.networkManager.room.state.isDayTime,
        weather: this.networkManager.room.state.weather
      });
    }

    // Debug optimisations
    console.log('⚡ Optimisations actives:');
    console.log('  - Synchronisation DIRECTE avec serveur');
    console.log('  - SANS ClientTimeWeatherManager (supprimé)');
    console.log('  - Callbacks directs pour widgets');
    console.log('  - Nuit réduite: 0.25 alpha (au lieu de 0.4)');
    console.log('  - Pluie: 0.2 alpha pour petit effet atmosphérique');
    console.log('  - Orage: 0.25 alpha (plus visible)');
    console.log('  - Pas de couleur pluie: couleur fixe 0x000044');
    console.log('  - 1 TileSprite au lieu de 2 pour la pluie');
    console.log('  - Textures 32x32 au lieu de 128x128');
    console.log('  - Pas de variations automatiques');
    console.log('  - Effet vent léger optimisé');
  }

  // =====================================
  // NETTOYAGE ULTRA-OPTIMISÉ
  // =====================================

  destroy() {
    console.log('🧹 [GlobalWeatherManager] Destruction ultra-optimisée...');

    // Nettoyer toutes les scènes
    for (const sceneKey of this.registeredScenes.keys()) {
      this.unregisterScene(sceneKey);
    }

    // Nettoyer les collections
    this.registeredScenes.clear();
    this.activeScenes.clear();
    this.sceneOverlays.clear();
    this.sceneWeatherEffects.clear();

    // Nettoyer les callbacks
    this.timeChangeCallbacks = [];
    this.weatherChangeCallbacks = [];

    // Reset état
    this.isInitialized = false;
    this.networkManager = null;

    console.log('✅ [GlobalWeatherManager] Détruit ultra-optimisé (sync directe)');
  }
}

// =====================================
// INSTANCE GLOBALE ULTRA-OPTIMISÉE
// =====================================

export const globalWeatherManager = new GlobalWeatherManager();

// =====================================
// FONCTION DE VÉRIFICATION GLOBALE
// =====================================

window.checkTimeWeatherSync = function() {
  console.log("🔍 === VÉRIFICATION SYNCHRONISATION DIRECTE ===");
  
  if (window.globalNetworkManager && window.globalWeatherManager) {
    const serverState = {
      gameHour: window.globalNetworkManager.room?.state?.gameHour,
      isDayTime: window.globalNetworkManager.room?.state?.isDayTime,
      weather: window.globalNetworkManager.room?.state?.weather
    };
    
    const clientState = {
      time: window.globalWeatherManager.getCurrentTime(),
      weather: window.globalWeatherManager.getCurrentWeather()
    };
    
    console.log("État serveur:", serverState);
    console.log("État client:", clientState);
    
    const isSync = (
      serverState.gameHour === clientState.time.hour &&
      serverState.isDayTime === clientState.time.isDayTime &&
      serverState.weather === clientState.weather.weather
    );
    
    if (isSync) {
      console.log("✅ SYNCHRONISATION DIRECTE OK");
      return true;
    } else {
      console.warn("❌ DÉSYNCHRONISATION DÉTECTÉE - FORCE SYNC");
      
      // Auto-correction directe
      if (window.globalWeatherManager) {
        window.globalWeatherManager.syncFromServerState();
        console.log("🔄 Auto-correction directe appliquée");
      }
      
      return false;
    }
  } else {
    console.error("❌ NetworkManager ou GlobalWeatherManager manquant");
    return false;
  }
};
