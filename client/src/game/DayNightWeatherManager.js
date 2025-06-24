// client/src/game/DayNightWeatherManager.js - VERSION HTML
import { ClientTimeWeatherManager } from '../managers/ClientTimeWeatherManager.js';

export class DayNightWeatherManager {
  constructor(scene) {
    this.scene = scene;
    this.htmlOverlay = null;
    this.weatherHtmlOverlay = null;
    this.timeWeatherManager = null;
    this.isInitialized = false;
    
    // ✅ NOUVEAU: État de synchronisation
    this.isServerSynced = false;
    
    console.log(`🌅 [DayNightWeatherManager] Créé pour ${scene.scene.key} (Mode HTML)`);
  }

  initialize(networkManager) {
    if (this.isInitialized) {
      console.log(`⚠️ [DayNightWeatherManager] Déjà initialisé`);
      return;
    }

    console.log(`🌅 [DayNightWeatherManager] === INITIALISATION (MODE HTML) ===`);
    
    try {
      // ✅ Créer le gestionnaire temps/météo
      this.timeWeatherManager = new ClientTimeWeatherManager(this.scene);
      this.timeWeatherManager.initialize(networkManager);

      this.setupHtmlOverlays();
      this.setupCallbacks();
      
      // ✅ Vérifier la synchronisation après un délai
      setTimeout(() => {
        this.checkSynchronization();
      }, 3000);
      
      this.isInitialized = true;
      console.log(`✅ [DayNightWeatherManager] Initialisé avec succès (HTML)`);
      
    } catch (error) {
      console.error(`❌ [DayNightWeatherManager] Erreur initialisation:`, error);
    }
  }

  setupHtmlOverlays() {
    console.log(`🎨 [DayNightWeatherManager] Setup HTML overlays...`);
    
    // ✅ Nettoyer les anciens overlays
    this.removeHtmlOverlays();
    
    // ✅ Overlay jour/nuit
    this.htmlOverlay = document.createElement('div');
    this.htmlOverlay.id = 'day-night-overlay';
    this.htmlOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 68, 0);
      z-index: 9998;
      pointer-events: none;
      transition: background-color 3s ease-in-out;
    `;
    document.body.appendChild(this.htmlOverlay);
    
    // ✅ Overlay météo
    this.weatherHtmlOverlay = document.createElement('div');
    this.weatherHtmlOverlay.id = 'weather-overlay';
    this.weatherHtmlOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(68, 136, 255, 0);
      z-index: 9997;
      pointer-events: none;
      transition: background-color 2s ease-in-out;
    `;
    document.body.appendChild(this.weatherHtmlOverlay);
    
    console.log(`✅ [DayNightWeatherManager] HTML overlays créés`);
  }

  removeHtmlOverlays() {
    // Supprimer les anciens overlays s'ils existent
    const oldDayNight = document.getElementById('day-night-overlay');
    const oldWeather = document.getElementById('weather-overlay');
    
    if (oldDayNight) oldDayNight.remove();
    if (oldWeather) oldWeather.remove();
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
    if (!this.htmlOverlay) {
      console.warn(`⚠️ [DayNightWeatherManager] Pas d'overlay HTML pour update temps`);
      return;
    }

    const targetAlpha = isDayTime ? 0 : 0.8;
    const backgroundColor = `rgba(0, 0, 68, ${targetAlpha})`;
    
    console.log(`🌅 [DayNightWeatherManager] Transition HTML: ${isDayTime ? 'JOUR' : 'NUIT'} (alpha=${targetAlpha})`);
    
    // ✅ Animation CSS immédiate
    this.htmlOverlay.style.backgroundColor = backgroundColor;
    
    // ✅ Log de confirmation après la transition
    setTimeout(() => {
      console.log(`✅ [DayNightWeatherManager] Transition temps HTML terminée: alpha=${targetAlpha}`);
    }, 3000);
  }

  updateWeatherOverlay(weather) {
    if (!this.weatherHtmlOverlay) {
      console.warn(`⚠️ [DayNightWeatherManager] Pas d'overlay météo HTML`);
      return;
    }

    // ✅ Support pour différents types de météo
    let backgroundColor = 'rgba(68, 136, 255, 0)'; // Transparent par défaut
    
    switch (weather) {
      case 'rain':
        backgroundColor = 'rgba(68, 136, 255, 0.15)'; // Bleu pour la pluie
        break;
      case 'storm':
        backgroundColor = 'rgba(51, 51, 102, 0.25)'; // Gris-bleu pour l'orage
        break;
      case 'snow':
        backgroundColor = 'rgba(255, 255, 255, 0.10)'; // Blanc pour la neige
        break;
      case 'fog':
        backgroundColor = 'rgba(204, 204, 204, 0.20)'; // Gris pour le brouillard
        break;
      default: // clear, sunny, etc.
        backgroundColor = 'rgba(68, 136, 255, 0)';
        break;
    }
    
    console.log(`🌤️ [DayNightWeatherManager] Météo HTML: ${weather} (${backgroundColor})`);
    
    this.weatherHtmlOverlay.style.backgroundColor = backgroundColor;
    
    setTimeout(() => {
      console.log(`✅ [DayNightWeatherManager] Transition météo HTML terminée: ${weather}`);
    }, 2000);
  }

  // ✅ Vérification de synchronisation
  checkSynchronization() {
    if (!this.timeWeatherManager) {
      console.warn(`⚠️ [DayNightWeatherManager] TimeWeatherManager manquant lors de la vérification`);
      return;
    }
    
    const isSynced = this.timeWeatherManager.isSynchronized();
    
    if (!isSynced) {
      console.warn(`⚠️ [DayNightWeatherManager] PAS SYNCHRONISÉ avec le serveur après 3s !`);
      console.log(`🔄 [DayNightWeatherManager] Tentative de re-synchronisation...`);
      
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

  // ✅ NOUVELLES MÉTHODES HTML

  // Test manuel des overlays
  testOverlays() {
    console.log(`🧪 [DayNightWeatherManager] Test des overlays HTML...`);
    
    // Test nuit
    this.updateTimeOverlay(false);
    
    setTimeout(() => {
      // Test météo pluie
      this.updateWeatherOverlay('rain');
      
      setTimeout(() => {
        // Remettre jour + temps clair
        this.updateTimeOverlay(true);
        this.updateWeatherOverlay('clear');
      }, 3000);
    }, 3000);
  }

  // Changer manuellement la transparence
  setNightAlpha(alpha) {
    if (this.htmlOverlay) {
      this.htmlOverlay.style.backgroundColor = `rgba(0, 0, 68, ${alpha})`;
      console.log(`🌙 [DayNightWeatherManager] Alpha nuit manuel: ${alpha}`);
    }
  }

  // ✅ DEBUG AMÉLIORÉ

  debug() {
    console.log(`🔍 [DayNightWeatherManager] === DEBUG (HTML) ===`);
    console.log(`🎮 Scène: ${this.scene.scene.key}`);
    console.log(`🎨 HTML Overlays: temps=${!!this.htmlOverlay}, météo=${!!this.weatherHtmlOverlay}`);
    console.log(`✅ Initialisé: ${this.isInitialized}`);
    console.log(`📡 Synchronisé serveur: ${this.isServerSynced}`);
    
    if (this.htmlOverlay) {
      console.log(`🌙 Overlay temps HTML:`, {
        id: this.htmlOverlay.id,
        backgroundColor: this.htmlOverlay.style.backgroundColor,
        zIndex: this.htmlOverlay.style.zIndex
      });
    }
    
    if (this.timeWeatherManager) {
      this.timeWeatherManager.debug();
    } else {
      console.warn(`⚠️ [DayNightWeatherManager] TimeWeatherManager manquant !`);
    }
    
    // ✅ État actuel
    const time = this.getCurrentTime();
    const weather = this.getCurrentWeather();
    console.log(`🕐 État actuel: ${time.hour}h ${time.isDayTime ? '(JOUR)' : '(NUIT)'}`);
    console.log(`🌤️ Météo actuelle: ${weather.displayName} (${weather.weather})`);
  }

  // ✅ GETTER POUR LA SYNCHRONISATION
  isSynchronized() {
    return this.isServerSynced && this.timeWeatherManager?.isSynchronized();
  }

  // ✅ NETTOYAGE COMPLET

  destroy() {
    console.log(`🧹 [DayNightWeatherManager] Destruction (HTML)...`);
    
    // ✅ Supprimer les overlays HTML
    this.removeHtmlOverlays();
    
    if (this.timeWeatherManager) {
      this.timeWeatherManager.destroy();
      this.timeWeatherManager = null;
    }
    
    this.htmlOverlay = null;
    this.weatherHtmlOverlay = null;
    this.isInitialized = false;
    this.isServerSynced = false;
    
    console.log(`✅ [DayNightWeatherManager] Détruit (HTML)`);
  }
}
