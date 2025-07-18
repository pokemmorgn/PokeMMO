// DayNightWeatherManager.js - VERSION SYNCHRONISATION AUTOMATIQUE
import { ClientTimeWeatherManager } from '../managers/ClientTimeWeatherManager.js';
import { zoneEnvironmentManager } from '../managers/ZoneEnvironmentManager.js';
import { WeatherEffects } from '../effects/WeatherEffects.js';

export class OptimizedPhaserOverlayManager {
  constructor(scene) {
    this.scene = scene;
    
    // ✅ NOUVEAU: Marquer l'heure de démarrage
    this.startTime = Date.now();
    
    // ✅ CORRECTION: Vérifier si la scène existe pour éviter les erreurs
    if (!scene) {
      console.warn('🌤️ [PhaserOverlay] Créé sans scène - mode global');
      this.globalMode = true;
    } else {
      this.globalMode = false;
    }
    
    this.combinedOverlay = null;
    this.colorCache = new Map();
    this.lastCombinedState = null;
    this.activeTween = null;
    this.performanceMode = this.detectPerformanceLevel();
    
    // ✅ NOUVEAU: Anti-spam avec débouncing
    this.pendingUpdate = null;
    this.updateTimer = null;
    this.debugMode = false;
    
    // ✅ NOUVEAU: Mode transition rapide
    this.fastTransitionMode = false;
    
    console.log(`🎨 [PhaserOverlay] Initialisé (Mode: ${this.performanceMode}, Global: ${this.globalMode})`);
  }

  detectPerformanceLevel() {
    // ✅ CORRECTION: Gérer le cas où scene est null
    if (!this.scene || !this.scene.sys) {
      // Mode global - utiliser des valeurs par défaut
      const factors = {
        webgl: 1.0, // Assumer WebGL disponible
        memory: navigator.deviceMemory || 4,
        cores: navigator.hardwareConcurrency || 4,
        mobile: /Mobi|Android/i.test(navigator.userAgent) ? 0.6 : 1.0
      };
      
      const score = factors.webgl * Math.min(factors.memory / 4, 2) * Math.min(factors.cores / 4, 2) * factors.mobile;
      
      if (score >= 1.5) return 'high';
      if (score >= 1.0) return 'medium';
      return 'low';
    }
    
    // Mode normal avec scène
    const game = this.scene.sys.game;
    const renderer = game.renderer;
    
    const factors = {
      webgl: renderer.type === Phaser.WEBGL ? 1.0 : 0.7,
      memory: navigator.deviceMemory || 4,
      cores: navigator.hardwareConcurrency || 4,
      mobile: /Mobi|Android/i.test(navigator.userAgent) ? 0.6 : 1.0
    };
    
    const score = factors.webgl * Math.min(factors.memory / 4, 2) * Math.min(factors.cores / 4, 2) * factors.mobile;
    
    if (score >= 1.5) return 'high';
    if (score >= 1.0) return 'medium';
    return 'low';
  }

  initialize() {
    console.log(`🎨 [PhaserOverlay] Initialisation overlay manager...`);
    
    if (this.globalMode) {
      console.log(`🌍 [PhaserOverlay] Mode global - pas d'overlay direct`);
    } else {
      this.createCombinedOverlay();
    }
    
    this.precacheCommonColors();
    
    console.log(`✅ [PhaserOverlay] Overlay manager initialisé`);
  }

  createCombinedOverlay() {
    // ✅ CORRECTION: Ne pas créer d'overlay en mode global
    if (this.globalMode || !this.scene) {
      console.log(`🌤️ [PhaserOverlay] Mode global - pas d'overlay direct`);
      return;
    }
    
    const camera = this.scene.cameras.main;
    
    this.combinedOverlay = this.scene.add.rectangle(
      camera.centerX,
      camera.centerY,
      camera.width,
      camera.height,
      0x000044,
      0
    );
    
    this.combinedOverlay.setDepth(9998);
    this.combinedOverlay.setScrollFactor(0);
    this.combinedOverlay.setOrigin(0.5, 0.5);
    this.combinedOverlay.setInteractive(false);
    
    console.log(`🌙 [PhaserOverlay] Overlay combiné créé`);
  }

  precacheCommonColors() {
    const commonColors = {
      'day-clear-outdoor': { color: 0x000044, alpha: 0 },
      'day-rain-outdoor': { color: 0x000044, alpha: 0.2 },
      'day-storm-outdoor': { color: 0x333366, alpha: 0.25 },
      'day-snow-outdoor': { color: 0xCCDDFF, alpha: 0.03 },
      'day-fog-outdoor': { color: 0xCCCCCC, alpha: 0.08 },
      
      'night-clear-outdoor': { color: 0x000044, alpha: 0.25 },
      'night-rain-outdoor': { color: 0x000044, alpha: 0.4 },
      'night-storm-outdoor': { color: 0x333366, alpha: 0.5 },
      'night-snow-outdoor': { color: 0x334466, alpha: 0.3 },
      'night-fog-outdoor': { color: 0xCCCCCC, alpha: 0.4 },
      
      'cave': { color: 0x2D1B0E, alpha: 0.4 },
      'indoor': { color: 0x000044, alpha: 0 }
    };
    
    Object.entries(commonColors).forEach(([key, value]) => {
      this.colorCache.set(key, value);
    });
    
    console.log(`🎨 [PhaserOverlay] ${this.colorCache.size} couleurs combinées en cache`);
  }

  // ✅ UPDATE COMBINÉ CORRIGÉ - PAS DE SKIP PENDANT LES PREMIÈRES SECONDES
  updateCombined(isDayTime, weather, environment = 'outdoor', zoneName = null) {
    if (!this.combinedOverlay) return;
    
    // ✅ Normaliser zoneName pour éviter les oscillations
    const normalizedZone = this.normalizeZoneName(zoneName);
    const timeState = isDayTime ? 'day' : 'night';
    const stateKey = `${timeState}-${weather}-${environment}-${normalizedZone}`;
    
    console.log(`🎨 [PhaserOverlay] Update: ${stateKey}`);
    
    // ✅ PAS DE SKIP PENDANT LES PREMIÈRES SECONDES pour garantir l'application
    const isEarlyStage = Date.now() - this.startTime < 10000; // 10 secondes
    
    if (!isEarlyStage && this.lastCombinedState === stateKey) {
      if (this.debugMode) {
        console.log(`⚡ [PhaserOverlay] Skip identique: ${stateKey}`);
      }
      return;
    }
    
    // ✅ CALCULER couleur et alpha selon les conditions
    let targetColor = 0x000044;
    let targetAlpha = 0;
    
    // ✅ EFFETS DE NUIT
    if (!isDayTime) {
      targetColor = 0x000044;
      targetAlpha = 0.25; // Nuit réduite
      console.log(`🌙 [PhaserOverlay] Effet nuit: alpha ${targetAlpha}`);
    }
    
    // ✅ EFFETS MÉTÉO
    if (weather === 'rain') {
      targetAlpha = Math.max(targetAlpha, 0.2);
      if (!isDayTime) targetAlpha = Math.max(targetAlpha, 0.4);
      console.log(`🌧️ [PhaserOverlay] Effet pluie: alpha ${targetAlpha}`);
    } else if (weather === 'storm') {
      targetColor = 0x333366;
      targetAlpha = Math.max(targetAlpha, 0.25);
      if (!isDayTime) targetAlpha = Math.max(targetAlpha, 0.5);
      console.log(`⛈️ [PhaserOverlay] Effet orage: alpha ${targetAlpha}`);
    } else if (weather === 'snow') {
      targetColor = isDayTime ? 0xCCDDFF : 0x334466;
      targetAlpha = Math.max(targetAlpha, 0.03);
      if (!isDayTime) targetAlpha = Math.max(targetAlpha, 0.3);
      console.log(`❄️ [PhaserOverlay] Effet neige: alpha ${targetAlpha}`);
    } else if (weather === 'fog') {
      targetColor = 0xCCCCCC;
      targetAlpha = Math.max(targetAlpha, 0.08);
      if (!isDayTime) targetAlpha = Math.max(targetAlpha, 0.4);
      console.log(`🌫️ [PhaserOverlay] Effet brouillard: alpha ${targetAlpha}`);
    }
    
    // ✅ EFFETS SPÉCIAUX POUR ENVIRONNEMENTS
    if (environment === 'cave') {
      targetColor = 0x2D1B0E;
      targetAlpha = 0.4;
      console.log(`🏔️ [PhaserOverlay] Effet grotte: alpha ${targetAlpha}`);
    } else if (environment === 'indoor') {
      targetColor = 0x000044;
      targetAlpha = 0;
      console.log(`🏠 [PhaserOverlay] Intérieur: pas d'overlay`);
    }
    
    // ✅ MISE À JOUR DE L'ÉTAT
    this.lastCombinedState = stateKey;
    console.log(`🎨 [PhaserOverlay] ${stateKey} → couleur: 0x${targetColor.toString(16)}, alpha: ${targetAlpha}`);
    
    // ✅ APPLICATION IMMÉDIATE
    this.combinedOverlay.setFillStyle(targetColor);
    this.combinedOverlay.setAlpha(targetAlpha);
    
    if (targetAlpha > 0) {
      this.combinedOverlay.setVisible(true);
    } else {
      this.combinedOverlay.setVisible(false);
    }
    
    // ✅ ARRÊTER tout tween en cours pour éviter les conflits
    if (this.activeTween) {
      this.activeTween.stop();
      this.activeTween = null;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Normaliser le zoneName
  normalizeZoneName(zoneName) {
    if (!zoneName || zoneName === 'null' || zoneName === 'undefined') {
      const sceneZone = this.scene?.zoneName || this.scene?.scene?.key;
      if (sceneZone && sceneZone !== 'null' && sceneZone !== 'undefined') {
        return sceneZone;
      }
      return 'default';
    }
    return zoneName;
  }

  // ✅ API PUBLIQUE avec application directe
  setDayNight(isDayTime, environment = 'outdoor', zoneName = null) {
    const currentWeather = this.lastWeather || 'clear';
    this.lastIsDayTime = isDayTime;
    this.updateCombined(isDayTime, currentWeather, environment, zoneName);
  }

  setWeather(weather, environment = 'outdoor') {
    this.lastWeather = weather;
    const currentTime = this.lastIsDayTime !== undefined ? this.lastIsDayTime : true;
    this.updateCombined(currentTime, weather, environment);
  }

  forceUpdate(isDayTime, weather, environment = 'outdoor', zoneName = null) {
    console.log(`🔄 [PhaserOverlay] Force update avec reset`);
    
    // ✅ RESET de l'état pour forcer
    this.lastCombinedState = null;
    this.lastWeather = weather;
    this.lastIsDayTime = isDayTime;
    
    // ✅ Update immédiat
    this.updateCombined(isDayTime, weather, environment, zoneName);
  }

  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`🔧 [PhaserOverlay] Debug mode: ${enabled ? 'ON' : 'OFF'}`);
  }

  onCameraResize() {
    const camera = this.scene.cameras.main;
    
    if (this.combinedOverlay) {
      this.combinedOverlay.setPosition(camera.centerX, camera.centerY);
      this.combinedOverlay.setSize(camera.width, camera.height);
    }
    
    console.log(`📐 [PhaserOverlay] Overlay redimensionné: ${camera.width}x${camera.height}`);
  }

  debug() {
    console.log(`🔍 [PhaserOverlay] === DEBUG OVERLAY OPTIMISÉ ===`);
    console.log(`⚡ Mode: ${this.performanceMode}`);
    console.log(`🎬 Tween actif: ${this.activeTween ? 'OUI' : 'NON'}`);
    console.log(`🎨 État actuel: ${this.lastCombinedState}`);
    console.log(`🔧 Debug mode: ${this.debugMode}`);
    console.log(`⏰ Temps depuis démarrage: ${Date.now() - this.startTime}ms`);
    
    if (this.combinedOverlay) {
      console.log(`🌙 Overlay: alpha=${this.combinedOverlay.alpha.toFixed(3)}, visible=${this.combinedOverlay.visible}`);
      console.log(`🎨 Couleur: 0x${this.combinedOverlay.fillColor.toString(16)}`);
    }
  }

  destroy() {
    console.log(`🧹 [PhaserOverlay] Destruction optimisée...`);
    
    if (this.activeTween) {
      this.activeTween.stop();
      this.activeTween = null;
    }
    
    if (this.combinedOverlay) {
      this.combinedOverlay.destroy();
      this.combinedOverlay = null;
    }
    
    this.colorCache.clear();
    this.lastCombinedState = null;
    
    console.log(`✅ [PhaserOverlay] Détruit`);
  }
}

// ✅ MANAGER PRINCIPAL AVEC SYNCHRONISATION AUTOMATIQUE
export class DayNightWeatherManagerPhaser {
  constructor(scene) {
    this.scene = scene;
    this.globalMode = !scene;
    this.overlayManager = null;
    this.timeWeatherManager = null;
    this.weatherEffects = null;
    this.isInitialized = false;
    
    console.log(`🌅 [DayNightWeatherManagerPhaser] Créé (Global: ${this.globalMode})`);
    
    // ✅ CORRECTION: Pas de WeatherEffects en mode global
    if (this.globalMode) {
      this.weatherEffects = null;
    }
  }

  initialize(networkManager) {
    if (this.isInitialized) return;

    console.log(`🌅 [DayNightWeatherManagerPhaser] === INIT SYNCHRONISATION AUTOMATIQUE ===`);
    
    try {
      this.timeWeatherManager = new ClientTimeWeatherManager(this.scene);
      this.timeWeatherManager.initialize(networkManager);

      this.overlayManager = new OptimizedPhaserOverlayManager(this.scene);
      this.overlayManager.initialize();

      // ✅ CORRECTION: Pas de WeatherEffects en mode global
      if (!this.globalMode && this.scene) {
        this.weatherEffects = new WeatherEffects(this.scene);
      }

      this.setupCallbacks();
      
      this.isInitialized = true;
      console.log(`✅ [DayNightWeatherManagerPhaser] Initialisé (SYNCHRONISATION AUTOMATIQUE)`);
      
    } catch (error) {
      console.error(`❌ [DayNightWeatherManagerPhaser] Erreur:`, error);
    }
  }

  // ✅ CALLBACKS DIRECTS SANS DÉBOUNCING
  setupCallbacks() {
    // ✅ CALLBACKS DIRECTS SANS DÉBOUNCING pour éviter les pertes
    this.timeWeatherManager.onTimeChange((hour, isDayTime) => {
      console.log(`🕐 [DayNightWeatherManagerPhaser] Temps reçu: ${hour}h ${isDayTime ? 'JOUR' : 'NUIT'}`);
      this.handleTimeChange(hour, isDayTime);
    });

    this.timeWeatherManager.onWeatherChange((weather, displayName) => {
      console.log(`🌤️ [DayNightWeatherManagerPhaser] Météo reçue: ${displayName}`);
      this.handleWeatherChange(weather, displayName);
    });
  }

  // ✅ HANDLERS DIRECTS
  handleTimeChange(hour, isDayTime) {
    const currentZone = this.getCurrentZone();
    const environment = zoneEnvironmentManager.getZoneEnvironment(currentZone);
    
    console.log(`🌅 [DayNightWeatherManagerPhaser] Application temps: ${hour}h ${isDayTime ? 'JOUR' : 'NUIT'} (${environment})`);
    
    this.overlayManager.setDayNight(isDayTime, environment, currentZone);
  }

  handleWeatherChange(weather, displayName) {
    const currentZone = this.getCurrentZone();
    const environment = zoneEnvironmentManager.getZoneEnvironment(currentZone);
    
    console.log(`🌤️ [DayNightWeatherManagerPhaser] Application météo: ${displayName} (${environment})`);
    
    this.overlayManager.setWeather(weather, environment);
    
    if (this.weatherEffects) {
      this.weatherEffects.setEnvironmentType(environment);
      this.weatherEffects.setWeather(weather);
    }
  }

  getCurrentZone() {
    let zoneName = this.scene?.zoneName || this.scene?.scene?.key || 'unknown';
    
    if (!zoneName || zoneName === 'null' || zoneName === 'undefined') {
      zoneName = 'default';
    }
    
    return zoneName;
  }

  forceUpdate() {
    if (!this.isInitialized) return;

    const time = this.timeWeatherManager.getCurrentTime();
    const weather = this.timeWeatherManager.getCurrentWeather();
    const currentZone = this.getCurrentZone();
    const environment = zoneEnvironmentManager.getZoneEnvironment(currentZone);

    console.log(`🔄 [DayNightWeatherManagerPhaser] Force update direct`);
    
    this.overlayManager.forceUpdate(time.isDayTime, weather.weather, environment, currentZone);
  }

  forceUpdateWithState(isDayTime, weather, environment, zoneName) {
    if (!this.isInitialized) return;
    
    console.log(`🔧 [DayNightWeatherManagerPhaser] Force update avec état spécifique:`, {
      isDayTime, weather, environment, zoneName
    });
    
    this.overlayManager.forceUpdate(isDayTime, weather, environment, zoneName);
    
    if (this.weatherEffects) {
      this.weatherEffects.setEnvironmentType(environment);
      this.weatherEffects.setWeather(weather);
    }
  }

  onZoneChanged(newZoneName) {
    console.log(`🌍 [DayNightWeatherManagerPhaser] Zone changée: ${newZoneName}`);
    
    // ✅ Application immédiate avec l'état actuel
    this.forceImmediateWeatherApplication(newZoneName);
  }

  forceImmediateWeatherApplication(newZoneName) {
    if (!this.isInitialized) {
      console.warn(`⚠️ [DayNightWeatherManagerPhaser] Service pas initialisé`);
      return;
    }
    
    console.log(`⚡ [DayNightWeatherManagerPhaser] APPLICATION IMMÉDIATE pour: ${newZoneName}`);
    
    // ✅ VÉRIFIER SI ON EST DANS UNE ZONE OUTDOOR
    const environment = zoneEnvironmentManager.getZoneEnvironment(newZoneName);
    
    if (environment === 'outdoor') {
      console.log(`🌍 [DayNightWeatherManagerPhaser] Zone outdoor détectée`);
      
      // ✅ FORCER L'OVERLAY À RESTER CORRECT POUR LES ZONES OUTDOOR
      if (this.overlayManager && this.overlayManager.combinedOverlay) {
        this.overlayManager.lastCombinedState = null; // Reset pour forcer l'application
      }
    }
    
    // ✅ Récupérer l'état actuel et appliquer
    const currentTime = this.timeWeatherManager.getCurrentTime();
    const currentWeather = this.timeWeatherManager.getCurrentWeather();
    
    if (this.overlayManager) {
      this.overlayManager.forceUpdate(
        currentTime.isDayTime, 
        currentWeather.weather, 
        environment, 
        newZoneName
      );
    }
    
    // ✅ Effets météo aussi
    if (this.weatherEffects) {
      this.weatherEffects.setEnvironmentType(environment);
      this.weatherEffects.setWeather(currentWeather.weather);
    }
    
    console.log(`✅ [DayNightWeatherManagerPhaser] Application immédiate terminée`);
  }

  onCameraResize() {
    if (this.overlayManager) {
      this.overlayManager.onCameraResize();
    }
  }

  setDebugMode(enabled) {
    if (this.overlayManager) {
      this.overlayManager.setDebugMode(enabled);
    }
    console.log(`🔧 [DayNightWeatherManagerPhaser] Debug mode: ${enabled ? 'ON' : 'OFF'}`);
  }

  debug() {
    console.log(`🔍 [DayNightWeatherManagerPhaser] === DEBUG SYNCHRONISATION AUTOMATIQUE ===`);
    
    if (this.overlayManager) {
      this.overlayManager.debug();
    }
    
    if (this.weatherEffects) {
      this.weatherEffects.debug();
    }
  }

  destroy() {
    console.log(`🧹 [DayNightWeatherManagerPhaser] Destruction...`);
    
    if (this.overlayManager) {
      this.overlayManager.destroy();
    }
    
    if (this.weatherEffects) {
      this.weatherEffects.destroy();
    }
    
    if (this.timeWeatherManager) {
      this.timeWeatherManager.destroy();
    }
    
    console.log(`✅ [DayNightWeatherManagerPhaser] Détruit`);
  }
}

export { DayNightWeatherManagerPhaser as DayNightWeatherManager };

// =====================================
// VÉRIFICATION PÉRIODIQUE GLOBALE
// =====================================

// Vérification périodique pour s'assurer que la synchronisation reste active
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (window.checkTimeWeatherSync) {
      window.checkTimeWeatherSync();
    }
  }, 60000); // Vérification toutes les minutes
  
  console.log('✅ [DayNightWeatherManager] Vérification périodique activée (1 minute)');
}
