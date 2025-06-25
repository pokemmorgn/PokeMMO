// client/src/game/DayNightWeatherManager.js - VERSION CORRIGÉE COMPLÈTE
import { ClientTimeWeatherManager } from '../managers/ClientTimeWeatherManager.js';
import { zoneEnvironmentManager } from '../managers/ZoneEnvironmentManager.js';
import { WeatherEffects } from '../effects/WeatherEffects.js';

export class DayNightWeatherManager {
  constructor(scene) {
    this.scene = scene;
    this.htmlOverlay = null;
    this.weatherHtmlOverlay = null;
    this.timeWeatherManager = null;
    this.isInitialized = false;
    
    // ✅ État de synchronisation
    this.isServerSynced = false;
    
    // ✅ Cache de l'environnement actuel
    this.currentEnvironment = null;
    this.lastZoneChecked = null;
    
    // ✅ Système d'effets visuels météo
    this.weatherEffects = null;
    
    console.log(`🌅 [DayNightWeatherManager] Créé pour ${scene.scene.key} (Mode HTML avec environnements + effets visuels)`);
  }

  initialize(networkManager) {
    if (this.isInitialized) {
      console.log(`⚠️ [DayNightWeatherManager] Déjà initialisé`);
      return;
    }

    console.log(`🌅 [DayNightWeatherManager] === INITIALISATION (MODE HTML + ENVIRONNEMENTS + EFFETS) ===`);
    
    try {
      // ✅ Créer le gestionnaire temps/météo
      this.timeWeatherManager = new ClientTimeWeatherManager(this.scene);
      this.timeWeatherManager.initialize(networkManager);

      // ✅ Créer le système d'effets visuels météo
      this.weatherEffects = new WeatherEffects(this.scene);

      this.setupHtmlOverlays();
      this.setupCallbacks();
      
      // ✅ Vérifier la synchronisation après un délai
      setTimeout(() => {
        this.checkSynchronization();
      }, 3000);
      
      this.isInitialized = true;
      console.log(`✅ [DayNightWeatherManager] Initialisé avec succès (HTML + Environnements + Effets)`);
      
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
    // ✅ Callback temps - AVEC GESTION DE SYNCHRONISATION ET ENVIRONNEMENT
    this.timeWeatherManager.onTimeChange((hour, isDayTime) => {
      console.log(`🌅 [DayNightWeatherManager] ⬇️ SERVEUR: ${hour}h ${isDayTime ? 'JOUR' : 'NUIT'}`);
      
      // ✅ MARQUER COMME SYNCHRONISÉ
      if (!this.isServerSynced) {
        this.isServerSynced = true;
        console.log(`🔄 [DayNightWeatherManager] PREMIÈRE synchronisation serveur reçue`);
      }
      
      this.updateTimeOverlay(isDayTime);
    });

    // ✅ Callback météo - AVEC GESTION DE SYNCHRONISATION ET ENVIRONNEMENT
    this.timeWeatherManager.onWeatherChange((weather, displayName) => {
      console.log(`🌤️ [DayNightWeatherManager] ⬇️ SERVEUR: ${displayName}`);
      this.updateWeatherOverlay(weather);
    });
  }

  // ✅ Obtenir la zone actuelle
  getCurrentZone() {
    // Essayer plusieurs sources pour obtenir la zone actuelle
    return this.scene?.zoneName || 
           this.scene?.scene?.key || 
           this.scene?.mapKey || 
           this.scene?.normalizeZoneName?.(this.scene.scene.key) ||
           'unknown';
  }

  // ✅ Vérifier et cacher l'environnement
  checkEnvironmentChange() {
    const currentZone = this.getCurrentZone();
    
    if (this.lastZoneChecked !== currentZone) {
      this.lastZoneChecked = currentZone;
      this.currentEnvironment = zoneEnvironmentManager.getZoneEnvironment(currentZone);
      
      console.log(`🌍 [DayNightWeatherManager] Changement de zone: ${currentZone} (${this.currentEnvironment})`);
      
      // Afficher les détails de l'environnement
      zoneEnvironmentManager.debugZoneEnvironment(currentZone);
      
      return true; // Changement détecté
    }
    
    return false; // Pas de changement
  }

  // ✅ updateTimeOverlay avec support environnement
  updateTimeOverlay(isDayTime) {
    if (!this.htmlOverlay) {
      console.warn(`⚠️ [DayNightWeatherManager] Pas d'overlay HTML pour update temps`);
      return;
    }

    // ✅ Vérifier le changement d'environnement
    this.checkEnvironmentChange();
    
    const currentZone = this.getCurrentZone();
    const lighting = zoneEnvironmentManager.getRecommendedLighting(currentZone, { hour: 0, isDayTime });
    
    console.log(`🌅 [DayNightWeatherManager] Zone "${currentZone}" - ${lighting.reason}`);
    
    if (!lighting.applyOverlay) {
      // ✅ Zone intérieure ou grotte avec gestion spéciale
      this.htmlOverlay.style.backgroundColor = 'rgba(0, 0, 68, 0)';
      console.log(`🏠 [DayNightWeatherManager] Zone intérieure "${currentZone}" - overlay désactivé`);
      
      // ✅ Log de confirmation
      setTimeout(() => {
        console.log(`✅ [DayNightWeatherManager] Transition temps HTML terminée (intérieur): alpha=0`);
      }, 3000);
      
      return;
    }

    // ✅ Zone extérieure - appliquer l'overlay normal ou spécial
    let backgroundColor;
    
    if (lighting.type === 'cave') {
      // Grotte - couleur spéciale
      backgroundColor = zoneEnvironmentManager.getOverlayColor(currentZone);
    } else {
      // Zone extérieure normale
      backgroundColor = `rgba(0, 0, 68, ${lighting.alpha})`;
    }
    
    console.log(`🌍 [DayNightWeatherManager] Transition HTML: ${isDayTime ? 'JOUR' : 'NUIT'} (${lighting.type}, alpha=${lighting.alpha})`);
    
    // ✅ Animation CSS
    this.htmlOverlay.style.backgroundColor = backgroundColor;
    
    // ✅ Log de confirmation après la transition
    setTimeout(() => {
      console.log(`✅ [DayNightWeatherManager] Transition temps HTML terminée: ${lighting.type} alpha=${lighting.alpha}`);
    }, 3000);
  }

  // ✅ updateWeatherOverlay avec effets visuels
  updateWeatherOverlay(weather) {
    if (!this.weatherHtmlOverlay) {
      console.warn(`⚠️ [DayNightWeatherManager] Pas d'overlay météo HTML`);
      return;
    }

    // ✅ Vérifier si la zone est affectée par la météo
    const currentZone = this.getCurrentZone();
    
    if (!zoneEnvironmentManager.shouldApplyWeatherEffect(currentZone)) {
      this.weatherHtmlOverlay.style.backgroundColor = 'rgba(68, 136, 255, 0)';
      
      // ✅ Désactiver les effets visuels en intérieur
      if (this.weatherEffects) {
        this.weatherEffects.setEnvironmentType('indoor');
      }
      
      console.log(`🏠 [DayNightWeatherManager] Zone intérieure "${currentZone}" - pas d'effet météo`);
      
      setTimeout(() => {
        console.log(`✅ [DayNightWeatherManager] Transition météo HTML terminée (intérieur): pas d'effet`);
      }, 2000);
      
      return;
    }

    // ✅ Zone extérieure - appliquer les effets météo
    
    // 1. Overlay HTML classique
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
    
    this.weatherHtmlOverlay.style.backgroundColor = backgroundColor;
    
    // ✅ 2. Effets visuels Phaser
    if (this.weatherEffects) {
      this.weatherEffects.setEnvironmentType('outdoor');
      this.weatherEffects.setWeather(weather);
    }
    
    console.log(`🌤️ [DayNightWeatherManager] Météo HTML + Effets extérieure: ${weather} (${backgroundColor})`);
    
    setTimeout(() => {
      console.log(`✅ [DayNightWeatherManager] Transition météo HTML + Effets terminée: ${weather}`);
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
    
    // ✅ Forcer la vérification de l'environnement
    this.checkEnvironmentChange();
    
    this.updateTimeOverlay(time.isDayTime);
    this.updateWeatherOverlay(weather.weather);
  }

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

  // ✅ NOUVELLES MÉTHODES POUR LES EFFETS VISUELS

  getWeatherEffects() {
    return this.weatherEffects;
  }

  testWeatherEffects() {
    console.log(`🧪 [DayNightWeatherManager] Test des effets météo...`);
    
    if (!this.weatherEffects) {
      console.warn(`⚠️ [DayNightWeatherManager] WeatherEffects non initialisé`);
      return;
    }

    this.weatherEffects.testWeatherCycle();
  }

  forceWeatherEffect(weatherType, intensity = 1.0) {
    console.log(`🌦️ [DayNightWeatherManager] Force effet météo: ${weatherType} (intensité: ${intensity})`);
    
    if (this.weatherEffects) {
      if (weatherType === 'rain' || weatherType === 'storm') {
        this.weatherEffects.updateRainIntensity(intensity);
      }
      this.weatherEffects.setWeather(weatherType, true);
    }
    
    // Forcer aussi l'overlay HTML
    this.updateWeatherOverlay(weatherType);
  }

  setRainAngle(angle) {
    console.log(`🌧️ [DayNightWeatherManager] Angle pluie: ${angle}°`);
    
    if (this.weatherEffects) {
      this.weatherEffects.setRainAngle(angle);
    }
  }

  // ✅ Méthodes d'environnement

  getEnvironmentInfo() {
    const currentZone = this.getCurrentZone();
    return {
      zone: currentZone,
      environment: zoneEnvironmentManager.getZoneEnvironment(currentZone),
      lighting: zoneEnvironmentManager.getRecommendedLighting(currentZone, this.getCurrentTime()),
      dayNightEnabled: zoneEnvironmentManager.shouldApplyDayNightCycle(currentZone),
      weatherEnabled: zoneEnvironmentManager.shouldApplyWeatherEffect(currentZone)
    };
  }

  onZoneChanged(newZoneName) {
    console.log(`🌍 [DayNightWeatherManager] Zone changée: ${this.lastZoneChecked} → ${newZoneName}`);
    
    // Forcer la vérification du nouvel environnement
    this.lastZoneChecked = null;
    this.checkEnvironmentChange();
    
    // ✅ Mettre à jour l'environnement des effets visuels
    const environment = zoneEnvironmentManager.getZoneEnvironment(newZoneName);
    if (this.weatherEffects) {
      this.weatherEffects.setEnvironmentType(environment);
    }
    
    // Forcer une mise à jour complète
    this.forceUpdate();
    
    console.log(`✅ [DayNightWeatherManager] Adaptation à la nouvelle zone terminée`);
  }

  // ✅ DEBUG

  debugEnvironment() {
    const currentZone = this.getCurrentZone();
    console.log(`🔍 [DayNightWeatherManager] === DEBUG ENVIRONNEMENT + EFFETS ===`);
    console.log(`🌍 Zone actuelle: ${currentZone}`);
    
    const envInfo = this.getEnvironmentInfo();
    console.log(`📊 Informations environnement:`, envInfo);
    
    const time = this.getCurrentTime();
    const weather = this.getCurrentWeather();
    console.log(`🕐 Temps actuel: ${time.hour}h ${time.isDayTime ? '(JOUR)' : '(NUIT)'}`);
    console.log(`🌤️ Météo actuelle: ${weather.displayName}`);
    
    if (this.htmlOverlay) {
      console.log(`🌙 Overlay temps:`, {
        backgroundColor: this.htmlOverlay.style.backgroundColor,
        display: this.htmlOverlay.style.display,
        opacity: this.htmlOverlay.style.opacity
      });
    }
    
    if (this.weatherHtmlOverlay) {
      console.log(`🌦️ Overlay météo:`, {
        backgroundColor: this.weatherHtmlOverlay.style.backgroundColor,
        display: this.weatherHtmlOverlay.style.display,
        opacity: this.weatherHtmlOverlay.style.opacity
      });
    }

    // ✅ Debug des effets visuels
    if (this.weatherEffects) {
      console.log(`🎨 Effets visuels météo:`);
      this.weatherEffects.debug();
    } else {
      console.warn(`⚠️ WeatherEffects non initialisé`);
    }
    
    // Test des différents environnements
    console.log(`🧪 [TEST] Simulation des environnements:`);
    ['village', 'villagehouse1', 'nocthercave1'].forEach(testZone => {
      const testEnv = zoneEnvironmentManager.debugZoneEnvironment(testZone);
      console.log(`  ${testZone}: ${testEnv.environment} → Jour/Nuit: ${testEnv.dayNightEffect}, Météo: ${testEnv.weatherEffect}`);
    });
  }

  debug() {
    console.log(`🔍 [DayNightWeatherManager] === DEBUG (HTML + ENVIRONNEMENTS + EFFETS) ===`);
    console.log(`🎮 Scène: ${this.scene.scene.key}`);
    console.log(`🎨 HTML Overlays: temps=${!!this.htmlOverlay}, météo=${!!this.weatherHtmlOverlay}`);
    console.log(`🌦️ Effets visuels: ${!!this.weatherEffects}`);
    console.log(`✅ Initialisé: ${this.isInitialized}`);
    console.log(`📡 Synchronisé serveur: ${this.isServerSynced}`);
    
    // ✅ Informations d'environnement
    const envInfo = this.getEnvironmentInfo();
    console.log(`🌍 Environnement actuel:`, envInfo);
    
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
    console.log(`🧹 [DayNightWeatherManager] Destruction (HTML + Environnements + Effets)...`);
    
    // ✅ Supprimer les overlays HTML
    this.removeHtmlOverlays();
    
    // ✅ Détruire les effets visuels
    if (this.weatherEffects) {
      this.weatherEffects.destroy();
      this.weatherEffects = null;
    }
    
    if (this.timeWeatherManager) {
      this.timeWeatherManager.destroy();
      this.timeWeatherManager = null;
    }
    
    this.htmlOverlay = null;
    this.weatherHtmlOverlay = null;
    this.isInitialized = false;
    this.isServerSynced = false;
    
    // ✅ Nettoyer le cache environnement
    this.currentEnvironment = null;
    this.lastZoneChecked = null;
    
    console.log(`✅ [DayNightWeatherManager] Détruit (HTML + Environnements + Effets)`);
  }

  // ✅ COMMANDES CONSOLE
  static setupConsoleCommands() {
    if (typeof window !== 'undefined') {
      // Commande pour debug l'environnement
      window.debugDayNight = (manager) => {
        if (manager && manager.debug) {
          manager.debug();
          manager.debugEnvironment();
        } else {
          console.warn('❌ Manager non fourni ou invalide');
        }
      };

      // Commande pour tester un environnement
      window.testEnvironment = (manager, zoneName) => {
        if (manager && manager.testEnvironmentChange) {
          manager.testEnvironmentChange(zoneName);
        } else {
          console.warn('❌ Manager non fourni ou invalide');
        }
      };

      // ✅ Commandes pour les effets météo
      window.testRainEffect = (manager) => {
        if (manager && manager.forceWeatherEffect) {
          manager.forceWeatherEffect('rain', 1.5);
          console.log('🌧️ Test pluie intense activé');
        } else {
          console.warn('❌ Manager non fourni ou invalide');
        }
      };

      window.testStormEffect = (manager) => {
        if (manager && manager.forceWeatherEffect) {
          manager.forceWeatherEffect('storm', 2.0);
          console.log('⛈️ Test orage violent activé');
        } else {
          console.warn('❌ Manager non fourni ou invalide');
        }
      };

      window.testSnowEffect = (manager) => {
        if (manager && manager.forceWeatherEffect) {
          manager.forceWeatherEffect('snow', 1.0);
          console.log('❄️ Test neige activé');
        } else {
          console.warn('❌ Manager non fourni ou invalide');
        }
      };

      window.setRainAngle = (manager, angle) => {
        if (manager && manager.setRainAngle) {
          manager.setRainAngle(angle);
          console.log(`🌧️ Angle pluie changé: ${angle}°`);
        } else {
          console.warn('❌ Manager non fourni ou invalide');
        }
      };

      window.clearAllWeather = (manager) => {
        if (manager && manager.forceWeatherEffect) {
          manager.forceWeatherEffect('clear');
          console.log('☀️ Météo claire - tous effets arrêtés');
        } else {
          console.warn('❌ Manager non fourni ou invalide');
        }
      };

      // Commande pour lister les zones
      window.listZoneEnvironments = () => {
        const zones = zoneEnvironmentManager.getAllZonesByEnvironment();
        console.log('🌍 === ZONES PAR ENVIRONNEMENT ===');
        Object.entries(zones).forEach(([env, zoneList]) => {
          console.log(`${env.toUpperCase()}: ${zoneList.join(', ')}`);
        });
      };

      console.log(`🎮 [DayNightWeatherManager] Commandes console disponibles:`);
      console.log(`  - window.debugDayNight(manager)`);
      console.log(`  - window.testEnvironment(manager, 'zoneName')`);
      console.log(`  - window.testRainEffect(manager)`);
      console.log(`  - window.testStormEffect(manager)`);
      console.log(`  - window.testSnowEffect(manager)`);
      console.log(`  - window.setRainAngle(manager, angle)`);
      console.log(`  - window.clearAllWeather(manager)`);
      console.log(`  - window.listZoneEnvironments()`);
    }
  }
}

// ✅ Initialiser les commandes console au chargement
if (typeof window !== 'undefined') {
  DayNightWeatherManager.setupConsoleCommands();
}
