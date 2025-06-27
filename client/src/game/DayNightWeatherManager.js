// DayNightWeatherManager.js - VERSION ANTI-SPAM DÉFINITIVE
import { ClientTimeWeatherManager } from '../managers/ClientTimeWeatherManager.js';
import { zoneEnvironmentManager } from '../managers/ZoneEnvironmentManager.js';
import { WeatherEffects } from '../effects/WeatherEffects.js';

export class OptimizedPhaserOverlayManager {
  constructor(scene) {
    this.scene = scene;
    
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
    
    console.log(`🎨 [PhaserOverlay] Initialisé (Mode: ${this.performanceMode})`);
  }

  detectPerformanceLevel() {
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
    console.log(`🎨 [PhaserOverlay] Création overlay combiné...`);
    
    this.createCombinedOverlay();
    this.precacheCommonColors();
    
    console.log(`✅ [PhaserOverlay] Overlay combiné créé`);
  }

  createCombinedOverlay() {
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
      'day-rain-outdoor': { color: 0x4488FF, alpha: 0.1 },
      'day-storm-outdoor': { color: 0x333366, alpha: 0.15 },
      'day-snow-outdoor': { color: 0xCCDDFF, alpha: 0.05 },
      'day-fog-outdoor': { color: 0xCCCCCC, alpha: 0.1 },
      
      'night-clear-outdoor': { color: 0x000044, alpha: 0.4 },
      'night-rain-outdoor': { color: 0x223366, alpha: 0.5 },
      'night-storm-outdoor': { color: 0x111133, alpha: 0.6 },
      'night-snow-outdoor': { color: 0x334466, alpha: 0.45 },
      'night-fog-outdoor': { color: 0x555577, alpha: 0.55 },
      
      'cave': { color: 0x2D1B0E, alpha: 0.6 },
      'indoor': { color: 0x000044, alpha: 0 }
    };
    
    Object.entries(commonColors).forEach(([key, value]) => {
      this.colorCache.set(key, value);
    });
    
    console.log(`🎨 [PhaserOverlay] ${this.colorCache.size} couleurs combinées en cache`);
  }

  // ✅ UPDATE COMBINÉ avec DÉBOUNCING INTELLIGENT
  updateCombined(isDayTime, weather, environment = 'outdoor', zoneName = null) {
    if (!this.combinedOverlay) return;
    
    // ✅ NORMALISER zoneName pour éviter les oscillations null/string
    const normalizedZone = this.normalizeZoneName(zoneName);
    
    // ✅ Créer une clé d'état UNIQUE et STABLE
    const timeState = isDayTime ? 'day' : 'night';
    const stateKey = `${timeState}-${weather}-${environment}-${normalizedZone}`;
    
    // ✅ SKIP IMMÉDIAT si état identique
    if (this.lastCombinedState === stateKey) {
      if (this.debugMode) {
        console.log(`⚡ [PhaserOverlay] Skip identique: ${stateKey}`);
      }
      return;
    }
    
    // ✅ MODE TRANSITION RAPIDE : Appliquer immédiatement
    if (this.fastTransitionMode) {
      this.executeUpdateImmediate(isDayTime, weather, environment, normalizedZone, stateKey);
      return;
    }
    
    // ✅ MODE NORMAL : Débouncing de 300ms
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    
    this.pendingUpdate = {
      isDayTime,
      weather,
      environment,
      zoneName: normalizedZone,
      stateKey
    };
    
    this.updateTimer = setTimeout(() => {
      this.executePendingUpdate();
    }, 300);
    
    if (this.debugMode) {
      console.log(`⏳ [PhaserOverlay] Update programmé: ${stateKey}`);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Exécution immédiate pour transitions
  executeUpdateImmediate(isDayTime, weather, environment, zoneName, stateKey) {
    console.log(`🚀 [PhaserOverlay] Exécution immédiate: ${stateKey}`);
    this.lastCombinedState = stateKey;
    
    // ✅ Calculer et appliquer immédiatement
    const { targetColor, targetAlpha } = this.calculateColorAndAlpha(isDayTime, weather, environment);
    
    console.log(`🎨 [PhaserOverlay] ${stateKey} → couleur: 0x${targetColor.toString(16)}, alpha: ${targetAlpha}`);
    
    this.animateCombinedOverlay(targetColor, targetAlpha);
  }

  // ✅ MÉTHODE REFACTORISÉE: Calcul de couleur et alpha
  calculateColorAndAlpha(isDayTime, weather, environment) {
    let targetColor, targetAlpha;
    
    if (environment === 'indoor') {
      targetColor = 0x000044;
      targetAlpha = 0;
    } else if (environment === 'cave') {
      const cached = this.colorCache.get('cave');
      targetColor = cached.color;
      targetAlpha = cached.alpha;
    } else {
      const combinedKey = `${isDayTime ? 'day' : 'night'}-${weather}-${environment}`;
      const cached = this.colorCache.get(combinedKey);
      
      if (cached) {
        targetColor = cached.color;
        targetAlpha = cached.alpha;
      } else {
        const result = this.calculateCombinedEffect(isDayTime, weather);
        targetColor = result.color;
        targetAlpha = result.alpha;
      }
    }
    
    return { targetColor, targetAlpha };
  }
  // ✅ MÉTHODE MISE À JOUR: Exécuter l'update en attente
  executePendingUpdate() {
    if (!this.pendingUpdate || !this.combinedOverlay) {
      return;
    }
    
    const { isDayTime, weather, environment, zoneName, stateKey } = this.pendingUpdate;
    
    // ✅ Double vérification anti-doublon
    if (this.lastCombinedState === stateKey) {
      if (this.debugMode) {
        console.log(`⚡ [PhaserOverlay] Skip doublon dans execution: ${stateKey}`);
      }
      this.pendingUpdate = null;
      return;
    }
    
    console.log(`🔄 [PhaserOverlay] Exécution: ${this.lastCombinedState} → ${stateKey}`);
    this.lastCombinedState = stateKey;
    
    // ✅ Utiliser la méthode refactorisée
    const { targetColor, targetAlpha } = this.calculateColorAndAlpha(isDayTime, weather, environment);
    
    console.log(`🎨 [PhaserOverlay] ${stateKey} → couleur: 0x${targetColor.toString(16)}, alpha: ${targetAlpha}`);
    
    this.animateCombinedOverlay(targetColor, targetAlpha);
    
    // ✅ Nettoyer
    this.pendingUpdate = null;
    this.updateTimer = null;
  }

  // ✅ NOUVELLE MÉTHODE: Normaliser le zoneName
  normalizeZoneName(zoneName) {
    if (!zoneName || zoneName === 'null' || zoneName === 'undefined') {
      // ✅ Essayer de récupérer depuis la scène
      const sceneZone = this.scene?.zoneName || this.scene?.scene?.key;
      if (sceneZone && sceneZone !== 'null' && sceneZone !== 'undefined') {
        return sceneZone;
      }
      return 'default'; // Fallback stable
    }
    return zoneName;
  }

  calculateCombinedEffect(isDayTime, weather) {
    let baseAlpha = isDayTime ? 0 : 0.4;
    let baseColor = 0x000044;
    
    switch (weather) {
      case 'rain':
        baseAlpha += 0.1;
        baseColor = 0x4488FF;
        break;
      case 'storm':
        baseAlpha += 0.2;
        baseColor = 0x333366;
        break;
      case 'snow':
        baseAlpha += 0.05;
        baseColor = isDayTime ? 0xCCDDFF : 0x334466;
        break;
      case 'fog':
        baseAlpha += 0.15;
        baseColor = 0xCCCCCC;
        break;
    }
    
    return {
      color: baseColor,
      alpha: Math.min(baseAlpha, 0.8)
    };
  }

  animateCombinedOverlay(targetColor, targetAlpha) {
    // ✅ ARRÊTER le tween précédent
    if (this.activeTween) {
      this.activeTween.stop();
      this.activeTween = null;
    }
    
    // ✅ Couleur immédiate
    this.combinedOverlay.setFillStyle(targetColor);
    
    // ✅ Animation alpha
    const duration = this.getAnimationDuration();
    
    if (duration === 0 || this.performanceMode === 'low') {
      this.combinedOverlay.setAlpha(targetAlpha);
      if (this.debugMode) {
        console.log(`⚡ [PhaserOverlay] Instantané`);
      }
    } else {
      this.activeTween = this.scene.tweens.add({
        targets: this.combinedOverlay,
        alpha: targetAlpha,
        duration: duration,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.activeTween = null;
          if (this.debugMode) {
            console.log(`✅ [PhaserOverlay] Animation terminée`);
          }
        },
        onStop: () => {
          this.activeTween = null;
          if (this.debugMode) {
            console.log(`🛑 [PhaserOverlay] Animation arrêtée`);
          }
        }
      });
      
      if (this.debugMode) {
        console.log(`🎬 [PhaserOverlay] Animation (${duration}ms) → alpha: ${targetAlpha}`);
      }
    }
  }

  getAnimationDuration() {
    const baseDuration = 2000;
    
    const performanceMultipliers = {
      high: 1.0,
      medium: 0.7,
      low: 0
    };
    
    const multiplier = performanceMultipliers[this.performanceMode] || 1.0;
    return Math.round(baseDuration * multiplier);
  }

  // ✅ API PUBLIQUE avec débouncing intégré
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
    
    // ✅ ANNULER le débouncing en cours
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    this.pendingUpdate = null;
    
    // ✅ RESET de l'état pour forcer
    this.lastCombinedState = null;
    this.lastWeather = weather;
    this.lastIsDayTime = isDayTime;
    
    // ✅ Update immédiat (bypass débouncing)
    this.updateCombined(isDayTime, weather, environment, zoneName);
    this.executePendingUpdate();
  }

  // ✅ NOUVELLES MÉTHODES DE CONTRÔLE
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`🔧 [PhaserOverlay] Debug mode: ${enabled ? 'ON' : 'OFF'}`);
  }

  // ✅ NOUVEAU: Contrôle du mode transition rapide
  enableFastTransition() {
    this.fastTransitionMode = true;
    console.log(`🚀 [PhaserOverlay] Mode transition rapide activé`);
  }

  disableFastTransition() {
    this.fastTransitionMode = false;
    console.log(`⏳ [PhaserOverlay] Mode transition rapide désactivé`);
  }

  clearPendingUpdates() {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    this.pendingUpdate = null;
    console.log(`🧹 [PhaserOverlay] Updates en attente nettoyés`);
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
    console.log(`🔍 [PhaserOverlay] === DEBUG OVERLAY ANTI-SPAM ===`);
    console.log(`⚡ Mode: ${this.performanceMode}`);
    console.log(`🎬 Tween actif: ${this.activeTween ? 'OUI' : 'NON'}`);
    console.log(`⏳ Update en attente: ${this.pendingUpdate ? 'OUI' : 'NON'}`);
    console.log(`🔄 Timer actif: ${this.updateTimer ? 'OUI' : 'NON'}`);
    console.log(`🎨 État actuel: ${this.lastCombinedState}`);
    console.log(`🔧 Debug mode: ${this.debugMode}`);
    
    if (this.combinedOverlay) {
      console.log(`🌙 Overlay: alpha=${this.combinedOverlay.alpha.toFixed(3)}, visible=${this.combinedOverlay.visible}`);
      console.log(`🎨 Couleur: 0x${this.combinedOverlay.fillColor.toString(16)}`);
    }
    
    if (this.pendingUpdate) {
      console.log(`⏳ Update en attente:`, this.pendingUpdate);
    }
  }

  destroy() {
    console.log(`🧹 [PhaserOverlay] Destruction avec anti-spam...`);
    
    // ✅ Nettoyer le débouncing
    this.clearPendingUpdates();
    
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
    
    console.log(`✅ [PhaserOverlay] Détruit (anti-spam)`);
  }
}

// ✅ MANAGER PRINCIPAL AVEC DÉBOUNCING
export class DayNightWeatherManagerPhaser {
  constructor(scene) {
    this.scene = scene;
    this.overlayManager = null;
    this.timeWeatherManager = null;
    this.weatherEffects = null;
    this.isInitialized = false;
    
    // ✅ NOUVEAU: Anti-spam pour les callbacks
    this.callbackDebounce = {
      time: null,
      weather: null
    };
    
    console.log(`🌅 [DayNightWeatherManagerPhaser] Créé (ANTI-SPAM)`);
  }

  initialize(networkManager) {
    if (this.isInitialized) return;

    console.log(`🌅 [DayNightWeatherManagerPhaser] === INIT ANTI-SPAM ===`);
    
    try {
      this.timeWeatherManager = new ClientTimeWeatherManager(this.scene);
      this.timeWeatherManager.initialize(networkManager);

      this.overlayManager = new OptimizedPhaserOverlayManager(this.scene);
      this.overlayManager.initialize();

      this.weatherEffects = new WeatherEffects(this.scene);
      this.setupCallbacks();
      
      this.isInitialized = true;
      console.log(`✅ [DayNightWeatherManagerPhaser] Initialisé (ANTI-SPAM)`);
      
    } catch (error) {
      console.error(`❌ [DayNightWeatherManagerPhaser] Erreur:`, error);
    }
  }

  // ✅ CALLBACKS AVEC DÉBOUNCING SÉVÈRE
  setupCallbacks() {
    // ✅ Callback temps avec débouncing
    this.timeWeatherManager.onTimeChange((hour, isDayTime) => {
      // ✅ Annuler le timer précédent
      if (this.callbackDebounce.time) {
        clearTimeout(this.callbackDebounce.time);
      }
      
      // ✅ Programmer l'exécution dans 200ms
      this.callbackDebounce.time = setTimeout(() => {
        this.handleTimeChange(hour, isDayTime);
        this.callbackDebounce.time = null;
      }, 200);
    });

    // ✅ Callback météo avec débouncing
    this.timeWeatherManager.onWeatherChange((weather, displayName) => {
      // ✅ Annuler le timer précédent
      if (this.callbackDebounce.weather) {
        clearTimeout(this.callbackDebounce.weather);
      }
      
      // ✅ Programmer l'exécution dans 200ms
      this.callbackDebounce.weather = setTimeout(() => {
        this.handleWeatherChange(weather, displayName);
        this.callbackDebounce.weather = null;
      }, 200);
    });
  }

  // ✅ NOUVEAUX HANDLERS SÉPARÉS
  handleTimeChange(hour, isDayTime) {
    const currentZone = this.getCurrentZone();
    const environment = zoneEnvironmentManager.getZoneEnvironment(currentZone);
    
    console.log(`🌅 [DayNightWeatherManagerPhaser] Temps débounced: ${hour}h ${isDayTime ? 'JOUR' : 'NUIT'} (${environment})`);
    
    this.overlayManager.setDayNight(isDayTime, environment, currentZone);
  }

  handleWeatherChange(weather, displayName) {
    const currentZone = this.getCurrentZone();
    const environment = zoneEnvironmentManager.getZoneEnvironment(currentZone);
    
    console.log(`🌤️ [DayNightWeatherManagerPhaser] Météo débounced: ${displayName} (${environment})`);
    
    this.overlayManager.setWeather(weather, environment);
    
    if (this.weatherEffects) {
      this.weatherEffects.setEnvironmentType(environment);
      this.weatherEffects.setWeather(weather);
    }
  }

  getCurrentZone() {
    // ✅ AMÉLIORER la récupération de zone
    let zoneName = this.scene?.zoneName || this.scene?.scene?.key || 'unknown';
    
    // ✅ Normaliser les zones problématiques
    if (!zoneName || zoneName === 'null' || zoneName === 'undefined') {
      zoneName = 'default';
    }
    
    return zoneName;
  }

  forceUpdate() {
    if (!this.isInitialized) return;

    // ✅ Annuler tous les débouncing en cours
    if (this.callbackDebounce.time) {
      clearTimeout(this.callbackDebounce.time);
      this.callbackDebounce.time = null;
    }
    if (this.callbackDebounce.weather) {
      clearTimeout(this.callbackDebounce.weather);
      this.callbackDebounce.weather = null;
    }

    const time = this.timeWeatherManager.getCurrentTime();
    const weather = this.timeWeatherManager.getCurrentWeather();
    const currentZone = this.getCurrentZone();
    const environment = zoneEnvironmentManager.getZoneEnvironment(currentZone);

    console.log(`🔄 [DayNightWeatherManagerPhaser] Force update anti-spam`);
    
    this.overlayManager.forceUpdate(time.isDayTime, weather.weather, environment, currentZone);
  }

  onZoneChanged(newZoneName) {
    console.log(`🌍 [DayNightWeatherManagerPhaser] Zone changée: ${newZoneName}`);
    
    // ✅ Activer mode transition rapide pour 1 seconde
    this.enableFastTransition(1000);
    
    setTimeout(() => this.forceUpdate(), 50); // Délai réduit à 50ms
  }

  // ✅ NOUVEAU: Contrôle du mode transition rapide
  enableFastTransition(duration = 1000) {
    console.log(`🚀 [DayNightWeatherManagerPhaser] Activation transition rapide (${duration}ms)`);
    
    // ✅ Activer sur les deux managers
    if (this.timeWeatherManager && this.timeWeatherManager.enableFastTransition) {
      this.timeWeatherManager.enableFastTransition(duration);
    }
    
    if (this.overlayManager && this.overlayManager.enableFastTransition) {
      this.overlayManager.enableFastTransition();
      
      // ✅ Désactiver automatiquement après la durée
      setTimeout(() => {
        this.overlayManager.disableFastTransition();
      }, duration);
    }
  }

  onCameraResize() {
    if (this.overlayManager) {
      this.overlayManager.onCameraResize();
    }
  }

  // ✅ NOUVELLES MÉTHODES DE CONTRÔLE
  setDebugMode(enabled) {
    if (this.overlayManager) {
      this.overlayManager.setDebugMode(enabled);
    }
    console.log(`🔧 [DayNightWeatherManagerPhaser] Debug mode: ${enabled ? 'ON' : 'OFF'}`);
  }

  clearAllDebouncing() {
    // ✅ Nettoyer tous les débouncing
    if (this.callbackDebounce.time) {
      clearTimeout(this.callbackDebounce.time);
      this.callbackDebounce.time = null;
    }
    if (this.callbackDebounce.weather) {
      clearTimeout(this.callbackDebounce.weather);
      this.callbackDebounce.weather = null;
    }
    
    if (this.overlayManager) {
      this.overlayManager.clearPendingUpdates();
    }
    
    console.log(`🧹 [DayNightWeatherManagerPhaser] Tous les débouncing nettoyés`);
  }

  debug() {
    console.log(`🔍 [DayNightWeatherManagerPhaser] === DEBUG ANTI-SPAM ===`);
    console.log(`⏳ Débouncing actif:`, {
      time: !!this.callbackDebounce.time,
      weather: !!this.callbackDebounce.weather
    });
    
    if (this.overlayManager) {
      this.overlayManager.debug();
    }
    
    if (this.weatherEffects) {
      this.weatherEffects.debug();
    }
  }

  destroy() {
    console.log(`🧹 [DayNightWeatherManagerPhaser] Destruction anti-spam...`);
    
    // ✅ Nettoyer tous les débouncing
    this.clearAllDebouncing();
    
    if (this.overlayManager) {
      this.overlayManager.destroy();
    }
    
    if (this.weatherEffects) {
      this.weatherEffects.destroy();
    }
    
    if (this.timeWeatherManager) {
      this.timeWeatherManager.destroy();
    }
    
    console.log(`✅ [DayNightWeatherManagerPhaser] Détruit (ANTI-SPAM)`);
  }
}

export { DayNightWeatherManagerPhaser as DayNightWeatherManager };
