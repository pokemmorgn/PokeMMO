// ✅ SYSTÈME D'OVERLAY PHASER ULTRA-OPTIMISÉ
// Performance maximale avec gestion intelligente des ressources
import { ClientTimeWeatherManager } from '../managers/ClientTimeWeatherManager.js';
import { zoneEnvironmentManager } from '../managers/ZoneEnvironmentManager.js';
import { WeatherEffects } from '../effects/WeatherEffects.js';

// ✅ SYSTÈME D'OVERLAY PHASER ULTRA-OPTIMISÉ - VERSION CORRIGÉE
export class OptimizedPhaserOverlayManager {
  constructor(scene) {
    this.scene = scene;
    
    // ✅ UN SEUL OVERLAY au lieu de deux qui se superposent
    this.combinedOverlay = null;
    
    // ✅ Cache des couleurs pour éviter les recalculs
    this.colorCache = new Map();
    
    // ✅ États précédents pour éviter les updates inutiles
    this.lastCombinedState = null;
    
    // ✅ UN SEUL tween actif à la fois
    this.activeTween = null;
    
    // ✅ Performance monitoring
    this.performanceMode = this.detectPerformanceLevel();
    
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

  // ✅ UN SEUL OVERLAY pour éviter les conflits
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
      // États combinés jour/nuit + météo
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
      
      // Environnements spéciaux
      'cave': { color: 0x2D1B0E, alpha: 0.6 },
      'indoor': { color: 0x000044, alpha: 0 }
    };
    
    Object.entries(commonColors).forEach(([key, value]) => {
      this.colorCache.set(key, value);
    });
    
    console.log(`🎨 [PhaserOverlay] ${this.colorCache.size} couleurs combinées en cache`);
  }

  // ✅ UPDATE COMBINÉ - Plus de conflit entre overlays
  updateCombined(isDayTime, weather, environment = 'outdoor', zoneName = null) {
    if (!this.combinedOverlay) return;
    
    // ✅ Créer une clé d'état UNIQUE qui combine tout
    const timeState = isDayTime ? 'day' : 'night';
    const stateKey = `${timeState}-${weather}-${environment}-${zoneName}`;
    
    // ✅ SKIP si état identique - CRITIQUE pour éviter les loops
    if (this.lastCombinedState === stateKey) {
      console.log(`⚡ [PhaserOverlay] État identique, skip: ${stateKey}`);
      return;
    }
    
    console.log(`🔄 [PhaserOverlay] ${this.lastCombinedState} → ${stateKey}`);
    this.lastCombinedState = stateKey;
    
    // ✅ Déterminer la couleur et alpha COMBINÉS
    let targetColor, targetAlpha;
    
    if (environment === 'indoor') {
      targetColor = 0x000044;
      targetAlpha = 0;
    } else if (environment === 'cave') {
      const cached = this.colorCache.get('cave');
      targetColor = cached.color;
      targetAlpha = cached.alpha;
    } else {
      // ✅ COMBINAISON intelligente jour/nuit + météo
      const combinedKey = `${timeState}-${weather}-${environment}`;
      const cached = this.colorCache.get(combinedKey);
      
      if (cached) {
        targetColor = cached.color;
        targetAlpha = cached.alpha;
      } else {
        // ✅ Fallback avec calcul dynamique
        const result = this.calculateCombinedEffect(isDayTime, weather);
        targetColor = result.color;
        targetAlpha = result.alpha;
      }
    }
    
    console.log(`🎨 [PhaserOverlay] ${stateKey} → couleur: 0x${targetColor.toString(16)}, alpha: ${targetAlpha}`);
    
    // ✅ Animation UNIQUE - plus de conflits
    this.animateCombinedOverlay(targetColor, targetAlpha);
  }

  // ✅ CALCUL DYNAMIQUE si pas en cache
  calculateCombinedEffect(isDayTime, weather) {
    let baseAlpha = isDayTime ? 0 : 0.4;  // Nuit de base
    let baseColor = 0x000044;  // Bleu nuit
    
    // ✅ Modifier selon la météo
    switch (weather) {
      case 'rain':
        baseAlpha += 0.1;
        baseColor = 0x4488FF;  // Plus bleu
        break;
      case 'storm':
        baseAlpha += 0.2;
        baseColor = 0x333366;  // Plus sombre
        break;
      case 'snow':
        baseAlpha += 0.05;
        baseColor = isDayTime ? 0xCCDDFF : 0x334466;
        break;
      case 'fog':
        baseAlpha += 0.15;
        baseColor = 0xCCCCCC;  // Gris
        break;
    }
    
    return {
      color: baseColor,
      alpha: Math.min(baseAlpha, 0.8)  // Cap à 0.8
    };
  }

  // ✅ ANIMATION UNIQUE - Plus de conflits entre tweens
  animateCombinedOverlay(targetColor, targetAlpha) {
    // ✅ ARRÊTER le tween précédent s'il existe
    if (this.activeTween) {
      this.activeTween.stop();
      this.activeTween = null;
    }
    
    // ✅ Changer la couleur IMMÉDIATEMENT
    this.combinedOverlay.setFillStyle(targetColor);
    
    // ✅ Animer SEULEMENT l'alpha
    const duration = this.getAnimationDuration();
    
    if (duration === 0 || this.performanceMode === 'low') {
      // ✅ Mode performance bas - instantané
      this.combinedOverlay.setAlpha(targetAlpha);
      console.log(`⚡ [PhaserOverlay] Instantané (perf: ${this.performanceMode})`);
    } else {
      // ✅ Animation fluide UNIQUE
      this.activeTween = this.scene.tweens.add({
        targets: this.combinedOverlay,
        alpha: targetAlpha,
        duration: duration,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.activeTween = null;
          console.log(`✅ [PhaserOverlay] Animation terminée`);
        },
        onStop: () => {
          this.activeTween = null;
          console.log(`🛑 [PhaserOverlay] Animation arrêtée`);
        }
      });
      
      console.log(`🎬 [PhaserOverlay] Animation (${duration}ms) → alpha: ${targetAlpha}`);
    }
  }

  getAnimationDuration() {
    const baseDuration = 2000;  // 2 secondes
    
    const performanceMultipliers = {
      high: 1.0,
      medium: 0.7,
      low: 0
    };
    
    const multiplier = performanceMultipliers[this.performanceMode] || 1.0;
    return Math.round(baseDuration * multiplier);
  }

  // ✅ API PUBLIQUE SIMPLIFIÉE
  setDayNight(isDayTime, environment = 'outdoor', zoneName = null) {
    // ✅ Utiliser la météo actuelle ou clear par défaut
    const currentWeather = this.lastWeather || 'clear';
    this.updateCombined(isDayTime, currentWeather, environment, zoneName);
  }

  setWeather(weather, environment = 'outdoor') {
    // ✅ Sauvegarder la météo actuelle
    this.lastWeather = weather;
    
    // ✅ Utiliser le temps actuel ou jour par défaut
    const currentTime = this.lastIsDayTime !== undefined ? this.lastIsDayTime : true;
    this.updateCombined(currentTime, weather, environment);
  }

  // ✅ FORCE UPDATE corrigé
  forceUpdate(isDayTime, weather, environment = 'outdoor', zoneName = null) {
    console.log(`🔄 [PhaserOverlay] Force update: ${isDayTime ? 'JOUR' : 'NUIT'}, ${weather}, ${environment}`);
    
    // ✅ RESET de l'état pour forcer le changement
    this.lastCombinedState = null;
    this.lastWeather = weather;
    this.lastIsDayTime = isDayTime;
    
    this.updateCombined(isDayTime, weather, environment, zoneName);
  }

  // ✅ RESIZE automatique
  onCameraResize() {
    const camera = this.scene.cameras.main;
    
    if (this.combinedOverlay) {
      this.combinedOverlay.setPosition(camera.centerX, camera.centerY);
      this.combinedOverlay.setSize(camera.width, camera.height);
    }
    
    console.log(`📐 [PhaserOverlay] Overlay redimensionné: ${camera.width}x${camera.height}`);
  }

  // ✅ DEBUG optimisé
  debug() {
    console.log(`🔍 [PhaserOverlay] === DEBUG OVERLAY COMBINÉ ===`);
    console.log(`⚡ Mode: ${this.performanceMode}`);
    console.log(`🎬 Tween actif: ${this.activeTween ? 'OUI' : 'NON'}`);
    console.log(`🎨 Couleurs en cache: ${this.colorCache.size}`);
    console.log(`🔄 État actuel: ${this.lastCombinedState}`);
    
    if (this.combinedOverlay) {
      console.log(`🌙 Overlay: alpha=${this.combinedOverlay.alpha.toFixed(3)}, visible=${this.combinedOverlay.visible}`);
      console.log(`🎨 Couleur: 0x${this.combinedOverlay.fillColor.toString(16)}`);
    } else {
      console.log(`❌ Overlay: NON CRÉÉ`);
    }
  }

  // ✅ NETTOYAGE COMPLET
  destroy() {
    console.log(`🧹 [PhaserOverlay] Destruction...`);
    
    // ✅ Arrêter le tween actif
    if (this.activeTween) {
      this.activeTween.stop();
      this.activeTween = null;
    }
    
    // ✅ Détruire l'overlay
    if (this.combinedOverlay) {
      this.combinedOverlay.destroy();
      this.combinedOverlay = null;
    }
    
    // ✅ Nettoyer les caches
    this.colorCache.clear();
    this.lastCombinedState = null;
    
    console.log(`✅ [PhaserOverlay] Détruit`);
  }
}

// ✅ INTÉGRATION dans DayNightWeatherManagerPhaser
export class DayNightWeatherManagerPhaser {
  constructor(scene) {
    this.scene = scene;
    this.overlayManager = null;
    this.timeWeatherManager = null;
    this.weatherEffects = null;
    this.isInitialized = false;
    
    console.log(`🌅 [DayNightWeatherManagerPhaser] Créé (OVERLAY COMBINÉ)`);
  }

  initialize(networkManager) {
    if (this.isInitialized) return;

    console.log(`🌅 [DayNightWeatherManagerPhaser] === INIT OVERLAY COMBINÉ ===`);
    
    try {
      this.timeWeatherManager = new ClientTimeWeatherManager(this.scene);
      this.timeWeatherManager.initialize(networkManager);

      // ✅ Nouveau manager combiné
      this.overlayManager = new OptimizedPhaserOverlayManager(this.scene);
      this.overlayManager.initialize();

      this.weatherEffects = new WeatherEffects(this.scene);
      this.setupCallbacks();
      
      this.isInitialized = true;
      console.log(`✅ [DayNightWeatherManagerPhaser] Initialisé (OVERLAY COMBINÉ)`);
      
    } catch (error) {
      console.error(`❌ [DayNightWeatherManagerPhaser] Erreur:`, error);
    }
  }

  setupCallbacks() {
    // ✅ Callback temps - utilise l'update combiné
    this.timeWeatherManager.onTimeChange((hour, isDayTime) => {
      const currentZone = this.getCurrentZone();
      const environment = zoneEnvironmentManager.getZoneEnvironment(currentZone);
      
      console.log(`🌅 [DayNightWeatherManagerPhaser] Temps: ${hour}h ${isDayTime ? 'JOUR' : 'NUIT'} (${environment})`);
      
      // ✅ Update combiné au lieu de séparé
      this.overlayManager.setDayNight(isDayTime, environment, currentZone);
    });

    // ✅ Callback météo - utilise l'update combiné
    this.timeWeatherManager.onWeatherChange((weather, displayName) => {
      const currentZone = this.getCurrentZone();
      const environment = zoneEnvironmentManager.getZoneEnvironment(currentZone);
      
      console.log(`🌤️ [DayNightWeatherManagerPhaser] Météo: ${displayName} (${environment})`);
      
      // ✅ Update combiné au lieu de séparé
      this.overlayManager.setWeather(weather, environment);
      
      if (this.weatherEffects) {
        this.weatherEffects.setEnvironmentType(environment);
        this.weatherEffects.setWeather(weather);
      }
    });
  }

  getCurrentZone() {
    return this.scene?.zoneName || this.scene?.scene?.key || 'unknown';
  }

  forceUpdate() {
    if (!this.isInitialized) return;

    const time = this.timeWeatherManager.getCurrentTime();
    const weather = this.timeWeatherManager.getCurrentWeather();
    const currentZone = this.getCurrentZone();
    const environment = zoneEnvironmentManager.getZoneEnvironment(currentZone);

    console.log(`🔄 [DayNightWeatherManagerPhaser] Force update combiné`);
    
    // ✅ UN SEUL update combiné
    this.overlayManager.forceUpdate(time.isDayTime, weather.weather, environment, currentZone);
  }

  onZoneChanged(newZoneName) {
    console.log(`🌍 [DayNightWeatherManagerPhaser] Zone changée: ${newZoneName}`);
    setTimeout(() => this.forceUpdate(), 100);
  }

  onCameraResize() {
    if (this.overlayManager) {
      this.overlayManager.onCameraResize();
    }
  }

  debug() {
    console.log(`🔍 [DayNightWeatherManagerPhaser] === DEBUG COMBINÉ ===`);
    
    if (this.overlayManager) {
      this.overlayManager.debug();
    }
    
    if (this.weatherEffects) {
      this.weatherEffects.debug();
    }
  }

  destroy() {
    console.log(`🧹 [DayNightWeatherManagerPhaser] Destruction combinée...`);
    
    if (this.overlayManager) {
      this.overlayManager.destroy();
    }
    
    if (this.weatherEffects) {
      this.weatherEffects.destroy();
    }
    
    if (this.timeWeatherManager) {
      this.timeWeatherManager.destroy();
    }
    
    console.log(`✅ [DayNightWeatherManagerPhaser] Détruit (COMBINÉ)`);
  }
}
// ✅ À la fin du fichier DayNightWeatherManager.js
export { DayNightWeatherManagerPhaser as DayNightWeatherManager };
