// client/src/game/DayNightWeatherManager.js
import { ClientTimeWeatherManager } from '../managers/ClientTimeWeatherManager.js';

export class DayNightWeatherManager {
  constructor(scene) {
    this.scene = scene;
    this.overlay = null;
    this.weatherOverlay = null;
    this.timeWeatherManager = null;
    this.isInitialized = false;
    
    console.log(`🌅 [DayNightWeatherManager] Créé pour ${scene.scene.key}`);
  }

  initialize(networkManager) {
    if (this.isInitialized) {
      console.log(`⚠️ [DayNightWeatherManager] Déjà initialisé`);
      return;
    }

    console.log(`🌅 [DayNightWeatherManager] === INITIALISATION ===`);
    
    try {
      // ✅ Créer le gestionnaire temps/météo
      this.timeWeatherManager = new ClientTimeWeatherManager(this.scene);
      this.timeWeatherManager.initialize(networkManager);

      this.setupOverlays();
      this.setupCallbacks();
      
      this.isInitialized = true;
      console.log(`✅ [DayNightWeatherManager] Initialisé avec succès`);
      
    } catch (error) {
      console.error(`❌ [DayNightWeatherManager] Erreur initialisation:`, error);
    }
  }

  setupOverlays() {
    console.log(`🎨 [DayNightWeatherManager] Setup overlays...`);
    
    // ✅ Overlay jour/nuit
    this.overlay = this.scene.add.rectangle(0, 0, 3000, 3000, 0x000044, 0);
    this.overlay.setOrigin(0, 0);
    this.overlay.setDepth(998);
    this.overlay.setScrollFactor(0);
    
    // ✅ Overlay météo (pluie)
    this.weatherOverlay = this.scene.add.rectangle(0, 0, 3000, 3000, 0x4488ff, 0);
    this.weatherOverlay.setOrigin(0, 0);
    this.weatherOverlay.setDepth(997);
    this.weatherOverlay.setScrollFactor(0);
    
    console.log(`✅ [DayNightWeatherManager] Overlays créés`);
  }

  setupCallbacks() {
    // ✅ Callback temps
    this.timeWeatherManager.onTimeChange((hour, isDayTime) => {
      console.log(`🌅 [DayNightWeatherManager] Temps: ${hour}h ${isDayTime ? 'JOUR' : 'NUIT'}`);
      this.updateTimeOverlay(isDayTime);
    });

    // ✅ Callback météo
    this.timeWeatherManager.onWeatherChange((weather, displayName) => {
      console.log(`🌤️ [DayNightWeatherManager] Météo: ${displayName}`);
      this.updateWeatherOverlay(weather);
    });
  }

  updateTimeOverlay(isDayTime) {
    if (!this.overlay) {
      console.warn(`⚠️ [DayNightWeatherManager] Pas d'overlay pour update temps`);
      return;
    }

    const targetAlpha = isDayTime ? 0 : 0.4;
    
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: targetAlpha,
      duration: 3000,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        console.log(`✅ [DayNightWeatherManager] Transition temps terminée: alpha=${targetAlpha}`);
      }
    });
  }

  updateWeatherOverlay(weather) {
    if (!this.weatherOverlay) {
      console.warn(`⚠️ [DayNightWeatherManager] Pas d'overlay pour update météo`);
      return;
    }

    // ✅ Simple : pluie = overlay bleu léger, sinon transparent
    const targetAlpha = weather === 'rain' ? 0.15 : 0;
    
    this.scene.tweens.add({
      targets: this.weatherOverlay,
      alpha: targetAlpha,
      duration: 2000,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        console.log(`✅ [DayNightWeatherManager] Transition météo terminée: ${weather}`);
      }
    });
  }

  // ✅ API PUBLIQUE

  getCurrentTime() {
    return this.timeWeatherManager?.getCurrentTime() || { hour: 12, isDayTime: true };
  }

  getCurrentWeather() {
    return this.timeWeatherManager?.getCurrentWeather() || { weather: 'clear', displayName: 'Ciel dégagé' };
  }

  forceUpdate() {
    if (!this.isInitialized) {
      console.warn(`⚠️ [DayNightWeatherManager] Pas initialisé`);
      return;
    }

    const time = this.getCurrentTime();
    const weather = this.getCurrentWeather();
    
    console.log(`🔄 [DayNightWeatherManager] Force update: ${time.hour}h ${weather.displayName}`);
    
    this.updateTimeOverlay(time.isDayTime);
    this.updateWeatherOverlay(weather.weather);
  }

  debug() {
    console.log(`🔍 [DayNightWeatherManager] === DEBUG ===`);
    console.log(`🎮 Scène: ${this.scene.scene.key}`);
    console.log(`🎨 Overlays: temps=${!!this.overlay}, météo=${!!this.weatherOverlay}`);
    console.log(`✅ Initialisé: ${this.isInitialized}`);
    
    if (this.timeWeatherManager) {
      this.timeWeatherManager.debug();
    }
  }

  destroy() {
    console.log(`🧹 [DayNightWeatherManager] Destruction...`);
    
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    
    if (this.weatherOverlay) {
      this.weatherOverlay.destroy();
      this.weatherOverlay = null;
    }
    
    if (this.timeWeatherManager) {
      this.timeWeatherManager.destroy();
      this.timeWeatherManager = null;
    }
    
    this.isInitialized = false;
    console.log(`✅ [DayNightWeatherManager] Détruit`);
  }
}
