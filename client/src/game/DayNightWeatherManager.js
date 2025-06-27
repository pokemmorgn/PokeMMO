// ✅ SYSTÈME D'OVERLAY PHASER ULTRA-OPTIMISÉ
// Performance maximale avec gestion intelligente des ressources

export class OptimizedPhaserOverlayManager {
  constructor(scene) {
    this.scene = scene;
    
    // ✅ Overlays Phaser au lieu de HTML
    this.dayNightOverlay = null;
    this.weatherOverlay = null;
    
    // ✅ Cache des couleurs pour éviter les recalculs
    this.colorCache = new Map();
    
    // ✅ États précédents pour éviter les updates inutiles
    this.lastDayNightState = null;
    this.lastWeatherState = null;
    
    // ✅ Tweens actifs pour éviter les conflits
    this.activeTweens = new Set();
    
    // ✅ Performance monitoring
    this.performanceMode = this.detectPerformanceLevel();
    
    console.log(`🎨 [PhaserOverlay] Initialisé (Mode: ${this.performanceMode})`);
  }

  // ✅ NOUVEAU: Détection automatique du niveau de performance
  detectPerformanceLevel() {
    const game = this.scene.sys.game;
    const renderer = game.renderer;
    
    // Facteurs de performance
    const factors = {
      webgl: renderer.type === Phaser.WEBGL ? 1.0 : 0.7, // WebGL vs Canvas
      memory: navigator.deviceMemory || 4, // GB de RAM
      cores: navigator.hardwareConcurrency || 4,
      mobile: /Mobi|Android/i.test(navigator.userAgent) ? 0.6 : 1.0
    };
    
    const score = factors.webgl * Math.min(factors.memory / 4, 2) * Math.min(factors.cores / 4, 2) * factors.mobile;
    
    if (score >= 1.5) return 'high';
    if (score >= 1.0) return 'medium';
    return 'low';
  }

  // ✅ INITIALISATION: Créer les overlays Phaser
  initialize() {
    console.log(`🎨 [PhaserOverlay] Création overlays Phaser...`);
    
    this.createDayNightOverlay();
    this.createWeatherOverlay();
    
    // ✅ Pré-calculer les couleurs communes
    this.precacheCommonColors();
    
    console.log(`✅ [PhaserOverlay] Overlays Phaser créés`);
  }

  // ✅ OVERLAY JOUR/NUIT optimisé
  createDayNightOverlay() {
    const camera = this.scene.cameras.main;
    
    // ✅ Rectangle simple et efficace
    this.dayNightOverlay = this.scene.add.rectangle(
      camera.centerX,
      camera.centerY,
      camera.width,
      camera.height,
      0x000044, // Bleu nuit par défaut
      0 // Transparent au début
    );
    
    // ✅ Paramètres optimaux
    this.dayNightOverlay.setDepth(9998); // Juste sous les effets météo
    this.dayNightOverlay.setScrollFactor(0); // Fixe à l'écran
    this.dayNightOverlay.setOrigin(0.5, 0.5);
    
    // ✅ Désactiver les interactions
    this.dayNightOverlay.setInteractive(false);
    
    console.log(`🌙 [PhaserOverlay] Overlay jour/nuit créé`);
  }

  // ✅ OVERLAY MÉTÉO optimisé
  createWeatherOverlay() {
    const camera = this.scene.cameras.main;
    
    this.weatherOverlay = this.scene.add.rectangle(
      camera.centerX,
      camera.centerY,
      camera.width,
      camera.height,
      0x4488FF, // Bleu météo par défaut
      0 // Transparent au début
    );
    
    // ✅ Paramètres optimaux
    this.weatherOverlay.setDepth(9997); // Sous le jour/nuit
    this.weatherOverlay.setScrollFactor(0);
    this.weatherOverlay.setOrigin(0.5, 0.5);
    this.weatherOverlay.setInteractive(false);
    
    console.log(`🌦️ [PhaserOverlay] Overlay météo créé`);
  }

  // ✅ PRÉ-CACHE des couleurs pour performance maximale
  precacheCommonColors() {
    const commonColors = {
      // Jour/Nuit
      'day': { color: 0x000044, alpha: 0 },
      'night': { color: 0x000044, alpha: 0.4 },
      'dawn': { color: 0x442200, alpha: 0.2 },
      'dusk': { color: 0x220044, alpha: 0.3 },
      
      // Météo
      'clear': { color: 0x4488FF, alpha: 0 },
      'rain': { color: 0x4488FF, alpha: 0.15 },
      'storm': { color: 0x333366, alpha: 0.25 },
      'snow': { color: 0xFFFFFF, alpha: 0.10 },
      'fog': { color: 0xCCCCCC, alpha: 0.20 },
      
      // Environnements spéciaux
      'cave': { color: 0x2D1B0E, alpha: 0.6 },
      'indoor': { color: 0x000044, alpha: 0 }
    };
    
    Object.entries(commonColors).forEach(([key, value]) => {
      this.colorCache.set(key, value);
    });
    
    console.log(`🎨 [PhaserOverlay] ${this.colorCache.size} couleurs en cache`);
  }

  // ✅ UPDATE JOUR/NUIT ultra-optimisé
  updateDayNight(isDayTime, environment = 'outdoor', zoneName = null) {
    if (!this.dayNightOverlay) return;
    
    // ✅ Créer une clé d'état unique
    const stateKey = `${isDayTime ? 'day' : 'night'}-${environment}-${zoneName}`;
    
    // ✅ SKIP si état identique
    if (this.lastDayNightState === stateKey) {
      return; // Pas de changement nécessaire
    }
    
    this.lastDayNightState = stateKey;
    
    // ✅ Déterminer la couleur et alpha selon l'environnement
    let targetColor, targetAlpha;
    
    if (environment === 'indoor') {
      // Intérieur - pas d'effet
      targetColor = 0x000044;
      targetAlpha = 0;
    } else if (environment === 'cave') {
      // Grotte - couleur spéciale
      const cached = this.colorCache.get('cave');
      targetColor = cached.color;
      targetAlpha = cached.alpha;
    } else {
      // Extérieur - cycle jour/nuit normal
      const timeKey = isDayTime ? 'day' : 'night';
      const cached = this.colorCache.get(timeKey);
      targetColor = cached.color;
      targetAlpha = cached.alpha;
    }
    
    console.log(`🌅 [PhaserOverlay] Jour/Nuit: ${stateKey} → alpha: ${targetAlpha}`);
    
    // ✅ Animation optimisée selon le mode performance
    this.animateOverlay(this.dayNightOverlay, targetColor, targetAlpha, 'daynight');
  }

  // ✅ UPDATE MÉTÉO ultra-optimisé
  updateWeather(weather, environment = 'outdoor') {
    if (!this.weatherOverlay) return;
    
    // ✅ Créer une clé d'état unique
    const stateKey = `${weather}-${environment}`;
    
    // ✅ SKIP si état identique
    if (this.lastWeatherState === stateKey) {
      return; // Pas de changement nécessaire
    }
    
    this.lastWeatherState = stateKey;
    
    // ✅ Déterminer la couleur selon l'environnement
    let targetColor, targetAlpha;
    
    if (environment === 'indoor' || environment === 'cave') {
      // Intérieur/Grotte - pas de météo
      targetColor = 0x4488FF;
      targetAlpha = 0;
    } else {
      // Extérieur - effet météo
      const cached = this.colorCache.get(weather);
      if (cached) {
        targetColor = cached.color;
        targetAlpha = cached.alpha;
      } else {
        // Météo inconnue - défaut clear
        targetColor = 0x4488FF;
        targetAlpha = 0;
      }
    }
    
    console.log(`🌤️ [PhaserOverlay] Météo: ${stateKey} → alpha: ${targetAlpha}`);
    
    // ✅ Animation optimisée
    this.animateOverlay(this.weatherOverlay, targetColor, targetAlpha, 'weather');
  }

  // ✅ ANIMATION INTELLIGENTE selon les performances
  animateOverlay(overlay, targetColor, targetAlpha, type) {
    // ✅ Arrêter les tweens existants pour cet overlay
    this.stopOverlayTweens(overlay);
    
    // ✅ Changer la couleur immédiatement (pas de transition couleur)
    overlay.setFillStyle(targetColor);
    
    // ✅ Animer seulement l'alpha selon le mode performance
    const duration = this.getAnimationDuration(type);
    
    if (duration === 0 || this.performanceMode === 'low') {
      // ✅ Mode performance bas - pas d'animation
      overlay.setAlpha(targetAlpha);
      console.log(`⚡ [PhaserOverlay] ${type} instantané (perf: ${this.performanceMode})`);
    } else {
      // ✅ Animation fluide
      const tween = this.scene.tweens.add({
        targets: overlay,
        alpha: targetAlpha,
        duration: duration,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.activeTweens.delete(tween);
        }
      });
      
      this.activeTweens.add(tween);
      console.log(`🎬 [PhaserOverlay] ${type} animé (${duration}ms)`);
    }
  }

  // ✅ DURÉE D'ANIMATION adaptative
  getAnimationDuration(type) {
    const baseDurations = {
      daynight: 3000, // 3 secondes pour jour/nuit
      weather: 2000   // 2 secondes pour météo
    };
    
    const performanceMultipliers = {
      high: 1.0,     // Durée complète
      medium: 0.7,   // 30% plus rapide
      low: 0         // Pas d'animation
    };
    
    const baseDuration = baseDurations[type] || 2000;
    const multiplier = performanceMultipliers[this.performanceMode] || 1.0;
    
    return Math.round(baseDuration * multiplier);
  }

  // ✅ ARRÊT OPTIMISÉ des animations
  stopOverlayTweens(overlay) {
    // Arrêter tous les tweens actifs pour cet overlay
    this.activeTweens.forEach(tween => {
      if (tween.targets && tween.targets.includes(overlay)) {
        tween.stop();
        this.activeTweens.delete(tween);
      }
    });
  }

  // ✅ RESIZE automatique des overlays
  onCameraResize() {
    const camera = this.scene.cameras.main;
    
    if (this.dayNightOverlay) {
      this.dayNightOverlay.setPosition(camera.centerX, camera.centerY);
      this.dayNightOverlay.setSize(camera.width, camera.height);
    }
    
    if (this.weatherOverlay) {
      this.weatherOverlay.setPosition(camera.centerX, camera.centerY);
      this.weatherOverlay.setSize(camera.width, camera.height);
    }
    
    console.log(`📐 [PhaserOverlay] Overlays redimensionnés: ${camera.width}x${camera.height}`);
  }

  // ✅ API SIMPLIFIÉE pour l'intégration
  setDayNight(isDayTime, environment = 'outdoor', zoneName = null) {
    this.updateDayNight(isDayTime, environment, zoneName);
  }

  setWeather(weather, environment = 'outdoor') {
    this.updateWeather(weather, environment);
  }

  // ✅ FORCE UPDATE pour debug/tests
  forceUpdate(isDayTime, weather, environment = 'outdoor', zoneName = null) {
    console.log(`🔄 [PhaserOverlay] Force update: ${isDayTime ? 'JOUR' : 'NUIT'}, ${weather}, ${environment}`);
    
    // Reset des états pour forcer le changement
    this.lastDayNightState = null;
    this.lastWeatherState = null;
    
    this.updateDayNight(isDayTime, environment, zoneName);
    this.updateWeather(weather, environment);
  }

  // ✅ STATS DE PERFORMANCE
  getPerformanceStats() {
    return {
      performanceMode: this.performanceMode,
      activeTweens: this.activeTweens.size,
      cachedColors: this.colorCache.size,
      lastDayNightState: this.lastDayNightState,
      lastWeatherState: this.lastWeatherState,
      overlaysCreated: !!(this.dayNightOverlay && this.weatherOverlay)
    };
  }

  // ✅ DEBUG optimisé
  debug() {
    const stats = this.getPerformanceStats();
    
    console.log(`🔍 [PhaserOverlay] === DEBUG PERFORMANCE ===`);
    console.log(`⚡ Mode: ${stats.performanceMode}`);
    console.log(`🎬 Tweens actifs: ${stats.activeTweens}`);
    console.log(`🎨 Couleurs en cache: ${stats.cachedColors}`);
    console.log(`🌅 État jour/nuit: ${stats.lastDayNightState}`);
    console.log(`🌤️ État météo: ${stats.lastWeatherState}`);
    console.log(`✅ Overlays: ${stats.overlaysCreated ? 'OK' : 'MANQUANTS'}`);
    
    if (this.dayNightOverlay) {
      console.log(`🌙 Overlay J/N: alpha=${this.dayNightOverlay.alpha.toFixed(2)}, visible=${this.dayNightOverlay.visible}`);
    }
    
    if (this.weatherOverlay) {
      console.log(`🌦️ Overlay météo: alpha=${this.weatherOverlay.alpha.toFixed(2)}, visible=${this.weatherOverlay.visible}`);
    }
  }

  // ✅ NETTOYAGE COMPLET
  destroy() {
    console.log(`🧹 [PhaserOverlay] Destruction...`);
    
    // ✅ Arrêter tous les tweens
    this.activeTweens.forEach(tween => {
      if (tween && tween.stop) {
        tween.stop();
      }
    });
    this.activeTweens.clear();
    
    // ✅ Détruire les overlays
    if (this.dayNightOverlay) {
      this.dayNightOverlay.destroy();
      this.dayNightOverlay = null;
    }
    
    if (this.weatherOverlay) {
      this.weatherOverlay.destroy();
      this.weatherOverlay = null;
    }
    
    // ✅ Nettoyer les caches
    this.colorCache.clear();
    
    console.log(`✅ [PhaserOverlay] Détruit`);
  }
}

// ✅ CLASSE D'INTÉGRATION pour remplacer les overlays HTML
export class DayNightWeatherManagerPhaser {
  constructor(scene) {
    this.scene = scene;
    this.overlayManager = null;
    this.timeWeatherManager = null;
    this.weatherEffects = null;
    this.isInitialized = false;
    
    console.log(`🌅 [DayNightWeatherManagerPhaser] Créé (OVERLAYS PHASER)`);
  }

  initialize(networkManager) {
    if (this.isInitialized) return;

    console.log(`🌅 [DayNightWeatherManagerPhaser] === INIT PHASER OVERLAYS ===`);
    
    try {
      // ✅ Système de temps/météo
      this.timeWeatherManager = new ClientTimeWeatherManager(this.scene);
      this.timeWeatherManager.initialize(networkManager);

      // ✅ Overlays Phaser au lieu de HTML
      this.overlayManager = new OptimizedPhaserOverlayManager(this.scene);
      this.overlayManager.initialize();

      // ✅ Effets météo
      this.weatherEffects = new WeatherEffects(this.scene);

      this.setupCallbacks();
      
      this.isInitialized = true;
      console.log(`✅ [DayNightWeatherManagerPhaser] Initialisé (OVERLAYS PHASER)`);
      
    } catch (error) {
      console.error(`❌ [DayNightWeatherManagerPhaser] Erreur:`, error);
    }
  }

  setupCallbacks() {
    // ✅ Callback temps optimisé
    this.timeWeatherManager.onTimeChange((hour, isDayTime) => {
      const currentZone = this.getCurrentZone();
      const environment = zoneEnvironmentManager.getZoneEnvironment(currentZone);
      
      console.log(`🌅 [DayNightWeatherManagerPhaser] Temps: ${hour}h ${isDayTime ? 'JOUR' : 'NUIT'} (${environment})`);
      
      this.overlayManager.setDayNight(isDayTime, environment, currentZone);
    });

    // ✅ Callback météo optimisé
    this.timeWeatherManager.onWeatherChange((weather, displayName) => {
      const currentZone = this.getCurrentZone();
      const environment = zoneEnvironmentManager.getZoneEnvironment(currentZone);
      
      console.log(`🌤️ [DayNightWeatherManagerPhaser] Météo: ${displayName} (${environment})`);
      
      this.overlayManager.setWeather(weather, environment);
      
      // ✅ Effets visuels
      if (this.weatherEffects) {
        this.weatherEffects.setEnvironmentType(environment);
        this.weatherEffects.setWeather(weather);
      }
    });
  }

  getCurrentZone() {
    return this.scene?.zoneName || this.scene?.scene?.key || 'unknown';
  }

  // ✅ API publique simplifiée
  forceUpdate() {
    if (!this.isInitialized) return;

    const time = this.timeWeatherManager.getCurrentTime();
    const weather = this.timeWeatherManager.getCurrentWeather();
    const currentZone = this.getCurrentZone();
    const environment = zoneEnvironmentManager.getZoneEnvironment(currentZone);

    console.log(`🔄 [DayNightWeatherManagerPhaser] Force update Phaser`);
    
    this.overlayManager.forceUpdate(time.isDayTime, weather.weather, environment, currentZone);
  }

  onZoneChanged(newZoneName) {
    console.log(`🌍 [DayNightWeatherManagerPhaser] Zone changée: ${newZoneName}`);
    
    // ✅ Update immédiat avec les nouveaux paramètres
    setTimeout(() => this.forceUpdate(), 100);
  }

  // ✅ Resize automatique
  onCameraResize() {
    if (this.overlayManager) {
      this.overlayManager.onCameraResize();
    }
  }

  debug() {
    console.log(`🔍 [DayNightWeatherManagerPhaser] === DEBUG PHASER ===`);
    
    if (this.overlayManager) {
      this.overlayManager.debug();
    }
    
    if (this.weatherEffects) {
      this.weatherEffects.debug();
    }
  }

  destroy() {
    console.log(`🧹 [DayNightWeatherManagerPhaser] Destruction Phaser...`);
    
    if (this.overlayManager) {
      this.overlayManager.destroy();
    }
    
    if (this.weatherEffects) {
      this.weatherEffects.destroy();
    }
    
    if (this.timeWeatherManager) {
      this.timeWeatherManager.destroy();
    }
    
    console.log(`✅ [DayNightWeatherManagerPhaser] Détruit (PHASER)`);
  }
}
// ✅ À la fin du fichier DayNightWeatherManager.js
export { DayNightWeatherManager };
