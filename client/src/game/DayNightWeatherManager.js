// client/src/game/DayNightWeatherManager.js - VERSION SYNCHRONISÉE SERVEUR
import { ClientTimeWeatherManager } from '../managers/ClientTimeWeatherManager.js';

export class DayNightWeatherManager {
  constructor(scene) {
    this.scene = scene;
    this.overlay = null;
    this.weatherOverlay = null;
    this.timeWeatherManager = null;
    this.isInitialized = false;
    
    // ✅ NOUVEAU: État de synchronisation
    this.isServerSynced = false;
    this.pendingTimeUpdate = null;
    this.pendingWeatherUpdate = null;
    
    console.log(`🌅 [DayNightWeatherManager] Créé pour ${scene.scene.key}`);
  }

  initialize(networkManager) {
    if (this.isInitialized) {
      console.log(`⚠️ [DayNightWeatherManager] Déjà initialisé`);
      return;
    }

    console.log(`🌅 [DayNightWeatherManager] === INITIALISATION (MODE SERVEUR) ===`);
    
    try {
      // ✅ Créer le gestionnaire temps/météo
      this.timeWeatherManager = new ClientTimeWeatherManager(this.scene);
      this.timeWeatherManager.initialize(networkManager);

      this.setupOverlays();
      this.setupCallbacks();
      
      // ✅ NOUVEAU: Vérifier la synchronisation après un délai
      setTimeout(() => {
        this.checkSynchronization();
      }, 3000);
      
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
    // ✅ Callback temps - AVEC GESTION DE SYNCHRONISATION
    this.timeWeatherManager.onTimeChange((hour, isDayTime) => {
      console.log(`🌅 [DayNightWeatherManager] ⬇️ SERVEUR: ${hour}h ${isDayTime ? 'JOUR' : 'NUIT'}`);
      
      // ✅ MARQUER COMME SYNCHRONISÉ
      if (!this.isServerSynced) {
        this.isServerSynced = true;
        console.log(`🔄 [DayNightWeatherManager] PREMIÈRE synchronisation serveur reçue`);
      }
      
      this.updateTimeOverlay(isDayTime);
    });

    // ✅ Callback météo - AVEC GESTION DE SYNCHRONISATION
    this.timeWeatherManager.onWeatherChange((weather, displayName) => {
      console.log(`🌤️ [DayNightWeatherManager] ⬇️ SERVEUR: ${displayName}`);
      this.updateWeatherOverlay(weather);
    });
  }

  updateTimeOverlay(isDayTime) {
    if (!this.overlay) {
      console.warn(`⚠️ [DayNightWeatherManager] Pas d'overlay pour update temps`);
      return;
    }

    const targetAlpha = isDayTime ? 0 : 0.8;
    
    // ✅ NOUVEAU: Animation plus fluide avec easing amélioré
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: targetAlpha,
      duration: this.isServerSynced ? 3000 : 100, // Plus rapide pour la première sync
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

    // ✅ AMÉLIORATION: Support pour plus de types de météo
    let targetAlpha = 0;
    let targetColor = 0x4488ff;
    
    switch (weather) {
      case 'rain':
        targetAlpha = 0.15;
        targetColor = 0x4488ff; // Bleu pour la pluie
        break;
      case 'storm':
        targetAlpha = 0.25;
        targetColor = 0x333366; // Gris-bleu pour l'orage
        break;
      case 'snow':
        targetAlpha = 0.10;
        targetColor = 0xffffff; // Blanc pour la neige
        break;
      case 'fog':
        targetAlpha = 0.20;
        targetColor = 0xcccccc; // Gris pour le brouillard
        break;
      default: // clear, sunny, etc.
        targetAlpha = 0;
        break;
    }
    
    // ✅ Changer la couleur si nécessaire
    if (this.weatherOverlay.fillColor !== targetColor) {
      this.weatherOverlay.setFillStyle(targetColor);
    }
    
    this.scene.tweens.add({
      targets: this.weatherOverlay,
      alpha: targetAlpha,
      duration: 2000,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        console.log(`✅ [DayNightWeatherManager] Transition météo terminée: ${weather} (alpha=${targetAlpha})`);
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Vérification de synchronisation
  checkSynchronization() {
    if (!this.timeWeatherManager) {
      console.warn(`⚠️ [DayNightWeatherManager] TimeWeatherManager manquant lors de la vérification`);
      return;
    }
    
    const isSynced = this.timeWeatherManager.isSynchronized();
    
    if (!isSynced) {
      console.warn(`⚠️ [DayNightWeatherManager] PAS SYNCHRONISÉ avec le serveur après 3s !`);
      console.log(`🔄 [DayNightWeatherManager] Tentative de re-synchronisation...`);
      
      // ✅ Forcer une nouvelle demande au serveur
      // (nécessite l'accès au networkManager - peut être passé en paramètre)
      if (this.scene?.networkManager) {
        this.timeWeatherManager.forceRefreshFromServer(this.scene.networkManager);
      }
    } else {
      console.log(`✅ [DayNightWeatherManager] Complètement synchronisé avec le serveur`);
      this.isServerSynced = true;
    }
  }

  // ✅ API PUBLIQUE - INCHANGÉE

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

  // ✅ NOUVELLE MÉTHODE: Forcer refresh depuis serveur
  forceServerRefresh() {
    if (!this.timeWeatherManager) {
      console.warn(`⚠️ [DayNightWeatherManager] TimeWeatherManager pas disponible`);
      return;
    }
    
    console.log(`🔄 [DayNightWeatherManager] Force refresh depuis serveur...`);
    
    if (this.scene?.networkManager) {
      this.timeWeatherManager.forceRefreshFromServer(this.scene.networkManager);
    } else {
      console.warn(`⚠️ [DayNightWeatherManager] NetworkManager pas disponible pour refresh`);
    }
  }

  // ✅ DEBUG AMÉLIORÉ

  debug() {
    console.log(`🔍 [DayNightWeatherManager] === DEBUG ===`);
    console.log(`🎮 Scène: ${this.scene.scene.key}`);
    console.log(`🎨 Overlays: temps=${!!this.overlay}, météo=${!!this.weatherOverlay}`);
    console.log(`✅ Initialisé: ${this.isInitialized}`);
    console.log(`📡 Synchronisé serveur: ${this.isServerSynced}`);
    
    if (this.timeWeatherManager) {
      this.timeWeatherManager.debug();
    } else {
      console.warn(`⚠️ [DayNightWeatherManager] TimeWeatherManager manquant !`);
    }
    
    // ✅ NOUVEAU: Vérification état actuel
    const time = this.getCurrentTime();
    const weather = this.getCurrentWeather();
    console.log(`🕐 État actuel: ${time.hour}h ${time.isDayTime ? '(JOUR)' : '(NUIT)'}`);
    console.log(`🌤️ Météo actuelle: ${weather.displayName} (${weather.weather})`);
  }

  // ✅ GETTER POUR LA SYNCHRONISATION
  isSynchronized() {
    return this.isServerSynced && this.timeWeatherManager?.isSynchronized();
  }

  // ✅ NETTOYAGE - AMÉLIORÉ

  destroy() {
    console.log(`🧹 [DayNightWeatherManager] Destruction...`);
    
    // ✅ Arrêter les animations en cours
    if (this.overlay) {
      this.scene.tweens.killTweensOf(this.overlay);
      this.overlay.destroy();
      this.overlay = null;
    }
    
    if (this.weatherOverlay) {
      this.scene.tweens.killTweensOf(this.weatherOverlay);
      this.weatherOverlay.destroy();
      this.weatherOverlay = null;
    }
    
    if (this.timeWeatherManager) {
      this.timeWeatherManager.destroy();
      this.timeWeatherManager = null;
    }
    
    this.isInitialized = false;
    this.isServerSynced = false;
    this.pendingTimeUpdate = null;
    this.pendingWeatherUpdate = null;
    
    console.log(`✅ [DayNightWeatherManager] Détruit`);
  }
}
