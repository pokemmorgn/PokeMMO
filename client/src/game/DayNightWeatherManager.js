// client/src/game/DayNightWeatherManager.js - VERSION AVEC SUPPORT INDOOR/OUTDOOR
import { ClientTimeWeatherManager } from '../managers/ClientTimeWeatherManager.js';
import { zoneEnvironmentManager } from '../managers/ZoneEnvironmentManager.js';

export class DayNightWeatherManager {
  constructor(scene) {
    this.scene = scene;
    this.htmlOverlay = null;
    this.weatherHtmlOverlay = null;
    this.timeWeatherManager = null;
    this.isInitialized = false;
    
    // ✅ NOUVEAU: État de synchronisation
    this.isServerSynced = false;
    
    // ✅ NOUVEAU: Cache de l'environnement actuel
    this.currentEnvironment = null;
    this.lastZoneChecked = null;
    
    console.log(`🌅 [DayNightWeatherManager] Créé pour ${scene.scene.key} (Mode HTML avec environnements)`);
  }

  initialize(networkManager) {
    if (this.isInitialized) {
      console.log(`⚠️ [DayNightWeatherManager] Déjà initialisé`);
      return;
    }

    console.log(`🌅 [DayNightWeatherManager] === INITIALISATION (MODE HTML + ENVIRONNEMENTS) ===`);
    
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
      console.log(`✅ [DayNightWeatherManager] Initialisé avec succès (HTML + Environnements)`);
      
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

  // ✅ NOUVELLE MÉTHODE: Obtenir la zone actuelle
  getCurrentZone() {
    // Essayer plusieurs sources pour obtenir la zone actuelle
    return this.scene?.zoneName || 
           this.scene?.scene?.key || 
           this.scene?.mapKey || 
           this.scene?.normalizeZoneName?.(this.scene.scene.key) ||
           'unknown';
  }

  // ✅ NOUVELLE MÉTHODE: Vérifier et cacher l'environnement
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

  // ✅ MÉTHODE MODIFIÉE: updateTimeOverlay avec support environnement
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

  // ✅ MÉTHODE MODIFIÉE: updateWeatherOverlay avec support environnement
  updateWeatherOverlay(weather) {
    if (!this.weatherHtmlOverlay) {
      console.warn(`⚠️ [DayNightWeatherManager] Pas d'overlay météo HTML`);
      return;
    }

    // ✅ Vérifier si la zone est affectée par la météo
    const currentZone = this.getCurrentZone();
    
    if (!zoneEnvironmentManager.shouldApplyWeatherEffect(currentZone)) {
      this.weatherHtmlOverlay.style.backgroundColor = 'rgba(68, 136, 255, 0)';
      console.log(`🏠 [DayNightWeatherManager] Zone intérieure "${currentZone}" - pas d'effet météo`);
      
      setTimeout(() => {
        console.log(`✅ [DayNightWeatherManager] Transition météo HTML terminée (intérieur): pas d'effet`);
      }, 2000);
      
      return;
    }

    // ✅ Zone extérieure - appliquer les effets météo normaux
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
    
    console.log(`🌤️ [DayNightWeatherManager] Météo HTML extérieure: ${weather} (${backgroundColor})`);
    
    this.weatherHtmlOverlay.style.backgroundColor = backgroundColor;
    
    setTimeout(() => {
      console.log(`✅ [DayNightWeatherManager] Transition météo HTML terminée: ${weather}`);
    }, 2000);
  }

  // ✅ Vérification de synchronisation (inchangée)
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
    
    // ✅ Forcer la vérification de l'environnement
    this.checkEnvironmentChange();
    
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

  // ✅ NOUVELLES MÉTHODES AVEC SUPPORT ENVIRONNEMENT

  // Test manuel des overlays avec environnement
  testOverlays() {
    console.log(`🧪 [DayNightWeatherManager] Test des overlays HTML avec environnements...`);
    
    const currentZone = this.getCurrentZone();
    console.log(`🌍 Zone actuelle pour test: ${currentZone}`);
    
    // Debug environnement
    zoneEnvironmentManager.debugZoneEnvironment(currentZone);
    
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

  // Changer manuellement la transparence avec respect de l'environnement
  setNightAlpha(alpha) {
    if (!this.htmlOverlay) return;
    
    const currentZone = this.getCurrentZone();
    const lighting = zoneEnvironmentManager.getRecommendedLighting(currentZone);
    
    if (!lighting.applyOverlay) {
      console.log(`🏠 [DayNightWeatherManager] Alpha ignoré pour zone intérieure "${currentZone}"`);
      return;
    }
    
    this.htmlOverlay.style.backgroundColor = `rgba(0, 0, 68, ${alpha})`;
    console.log(`🌙 [DayNightWeatherManager] Alpha nuit manuel: ${alpha} (zone: ${currentZone})`);
  }

  // ✅ NOUVELLE MÉTHODE: Obtenir les informations d'environnement
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

  // ✅ NOUVELLE MÉTHODE: Debug spécifique aux environnements
  debugEnvironment() {
    const currentZone = this.getCurrentZone();
    console.log(`🔍 [DayNightWeatherManager] === DEBUG ENVIRONNEMENT ===`);
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
    
    // Test des différents environnements
    console.log(`🧪 [TEST] Simulation des environnements:`);
    ['village', 'villagehouse1', 'nocthercave1'].forEach(testZone => {
      const testEnv = zoneEnvironmentManager.debugZoneEnvironment(testZone);
      console.log(`  ${testZone}: ${testEnv.environment} → Jour/Nuit: ${testEnv.dayNightEffect}, Météo: ${testEnv.weatherEffect}`);
    });
  }

  // ✅ DEBUG AMÉLIORÉ avec environnements

  debug() {
    console.log(`🔍 [DayNightWeatherManager] === DEBUG (HTML + ENVIRONNEMENTS) ===`);
    console.log(`🎮 Scène: ${this.scene.scene.key}`);
    console.log(`🎨 HTML Overlays: temps=${!!this.htmlOverlay}, météo=${!!this.weatherHtmlOverlay}`);
    console.log(`✅ Initialisé: ${this.isInitialized}`);
    console.log(`📡 Synchronisé serveur: ${this.isServerSynced}`);
    
    // ✅ Informations d'environnement
    const envInfo = this.getEnvironmentInfo();
    console.log(`🌍 Environnement actuel:`, envInfo);
    
    if (this.htmlOverlay) {
      console.log(`🌙 Overlay temps HTML:`, {
        id: this.htmlOverlay.id,
        backgroundColor: this.htmlOverlay.style.backgroundColor,
        zIndex: this.htmlOverlay.style.zIndex,
        transition: this.htmlOverlay.style.transition
      });
    }
    
    if (this.weatherHtmlOverlay) {
      console.log(`🌦️ Overlay météo HTML:`, {
        id: this.weatherHtmlOverlay.id,
        backgroundColor: this.weatherHtmlOverlay.style.backgroundColor,
        zIndex: this.weatherHtmlOverlay.style.zIndex
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
    
    // ✅ Debug des zones environnantes
    console.log(`📋 [ZONES] Exemples d'environnements:`);
    const examples = ['beach', 'village', 'villagehouse1', 'lavandiashop', 'nocthercave1'];
    examples.forEach(zone => {
      const env = zoneEnvironmentManager.getZoneEnvironment(zone);
      const dayNight = zoneEnvironmentManager.shouldApplyDayNightCycle(zone);
      const weather = zoneEnvironmentManager.shouldApplyWeatherEffect(zone);
      console.log(`  📍 ${zone}: ${env} (Jour/Nuit: ${dayNight}, Météo: ${weather})`);
    });
  }

  // ✅ MÉTHODES UTILITAIRES POUR ZONES SPÉCIFIQUES

  // Forcer le changement d'environnement (pour les tests)
  testEnvironmentChange(zoneName) {
    console.log(`🧪 [DayNightWeatherManager] Test changement vers zone: ${zoneName}`);
    
    // Simuler le changement de zone
    this.lastZoneChecked = null; // Forcer la détection
    
    // Override temporaire pour le test
    const originalGetCurrentZone = this.getCurrentZone;
    this.getCurrentZone = () => zoneName;
    
    // Forcer la mise à jour
    this.forceUpdate();
    
    // Restaurer la méthode originale après 5 secondes
    setTimeout(() => {
      this.getCurrentZone = originalGetCurrentZone;
      this.forceUpdate();
      console.log(`🔄 [DayNightWeatherManager] Test terminé, retour à la zone normale`);
    }, 5000);
  }

  // ✅ MÉTHODES POUR L'INTÉGRATION AVEC BaseZoneScene

  // Méthode appelée quand la scène change de zone
  onZoneChanged(newZoneName) {
    console.log(`🌍 [DayNightWeatherManager] Zone changée: ${this.lastZoneChecked} → ${newZoneName}`);
    
    // Forcer la vérification du nouvel environnement
    this.lastZoneChecked = null;
    this.checkEnvironmentChange();
    
    // Forcer une mise à jour complète
    this.forceUpdate();
    
    console.log(`✅ [DayNightWeatherManager] Adaptation à la nouvelle zone terminée`);
  }

  // ✅ GETTER POUR LA SYNCHRONISATION (inchangé)
  isSynchronized() {
    return this.isServerSynced && this.timeWeatherManager?.isSynchronized();
  }

  // ✅ NETTOYAGE COMPLET (inchangé)

  destroy() {
    console.log(`🧹 [DayNightWeatherManager] Destruction (HTML + Environnements)...`);
    
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
    
    // ✅ Nettoyer le cache environnement
    this.currentEnvironment = null;
    this.lastZoneChecked = null;
    
    console.log(`✅ [DayNightWeatherManager] Détruit (HTML + Environnements)`);
  }

  // ✅ NOUVELLES MÉTHODES DE CONFIGURATION DYNAMIQUE

  // Ajouter une zone à la configuration
  addZoneEnvironment(zoneName, environment) {
    const success = zoneEnvironmentManager.setZoneEnvironment(zoneName, environment);
    if (success) {
      console.log(`✅ [DayNightWeatherManager] Zone "${zoneName}" configurée comme ${environment}`);
      
      // Si c'est la zone actuelle, forcer la mise à jour
      if (this.getCurrentZone() === zoneName) {
        this.onZoneChanged(zoneName);
      }
    }
    return success;
  }

  // Obtenir toutes les zones par environnement
  getAllZonesByEnvironment() {
    return zoneEnvironmentManager.getAllZonesByEnvironment();
  }

  // Valider la configuration des zones
  validateEnvironmentConfiguration() {
    return zoneEnvironmentManager.validateAllZones();
  }

  // ✅ COMMANDES DE DEBUG POUR LA CONSOLE

  // Méthodes accessibles via la console du navigateur
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
      console.log(`  - window.listZoneEnvironments()`);
    }
  }
}

// ✅ Initialiser les commandes console au chargement
if (typeof window !== 'undefined') {
  DayNightWeatherManager.setupConsoleCommands();
}
