// ClientTimeWeatherManager.js - VERSION ANTI-SPAM DÉFINITIVE
export class ClientTimeWeatherManager {
  constructor(scene) {
    this.scene = scene;
    
    this.currentHour = 12;
    this.isDayTime = true;
    this.currentWeather = "clear";
    this.weatherDisplayName = "Ciel dégagé";
    
    this.hasReceivedInitialTime = false;
    this.hasReceivedInitialWeather = false;
    
    this.listeners = {
      time: [],
      weather: []
    };
    
    // ✅ NOUVEAU: Anti-spam SÉVÈRE avec états précédents
    this.lastTimeState = null;
    this.lastWeatherState = null;
    this.timeMessageCount = 0;
    this.weatherMessageCount = 0;
    
    // ✅ NOUVEAU: Débouncing pour éviter les notifications multiples
    this.notificationDebounce = {
      time: null,
      weather: null
    };
    
    // ✅ NOUVEAU: Mode debug
    this.debugMode = false;
    
    // ✅ NOUVEAU: Mode transition rapide
    this.fastTransitionMode = false;
    this.transitionTimer = null;
    
    console.log(`🌍 [ClientTimeWeatherManager] Initialisé avec ANTI-SPAM SÉVÈRE`);
  }

  initialize(networkManager) {
    if (!networkManager?.room) {
      console.warn(`⚠️ [ClientTimeWeatherManager] Pas de room disponible`);
      return;
    }

    this.setupNetworkHandlers(networkManager);
    this.requestInitialState(networkManager);
    
    console.log(`✅ [ClientTimeWeatherManager] Connecté avec anti-spam sévère`);
  }

  setupNetworkHandlers(networkManager) {
    // ✅ Handler temps avec ANTI-SPAM BRUTAL
    networkManager.onMessage("timeUpdate", (data) => {
      this.handleTimeUpdateWithAntiSpam(data);
    });

    // ✅ Handler météo avec ANTI-SPAM BRUTAL
    networkManager.onMessage("weatherUpdate", (data) => {
      this.handleWeatherUpdateWithAntiSpam(data);
    });

    // ✅ Handlers état initial (sans anti-spam car unique)
    networkManager.onMessage("currentTime", (data) => {
      if (this.debugMode) {
        console.log(`🕐 [ClientTimeWeatherManager] ➡️ État initial temps: ${data.displayTime}`);
      }
      
      this.applyTimeUpdate(data);
      this.hasReceivedInitialTime = true;
    });

    networkManager.onMessage("currentWeather", (data) => {
      if (this.debugMode) {
        console.log(`🌤️ [ClientTimeWeatherManager] ➡️ État initial météo: ${data.displayName}`);
      }
      
      this.applyWeatherUpdate(data);
      this.hasReceivedInitialWeather = true;
    });

    console.log(`✅ [ClientTimeWeatherManager] Handlers anti-spam configurés`);
  }

  // ✅ NOUVEAU: Handler temps avec anti-spam BRUTAL
  handleTimeUpdateWithAntiSpam(data) {
    // ✅ Créer une clé d'état unique
    const stateKey = `${data.gameHour}-${data.isDayTime}-${data.displayTime}`;
    
    // ✅ IGNORER COMPLÈTEMENT si état identique
    if (this.lastTimeState === stateKey) {
      this.timeMessageCount++;
      
      // ✅ Log seulement si debug ET log de spam occasionnel
      if (this.debugMode && this.timeMessageCount % 5 === 0) {
        console.log(`🚫 [ClientTimeWeatherManager] ${this.timeMessageCount} messages temps identiques ignorés: ${data.displayTime}`);
      }
      return; // ✅ SORTIE IMMÉDIATE - Ne rien faire
    }
    
    // ✅ Reset compteur si nouveau message
    if (this.timeMessageCount > 0) {
      console.log(`📊 [ClientTimeWeatherManager] ${this.timeMessageCount} messages temps dupliqués ignorés au total`);
      this.timeMessageCount = 0;
    }
    
    if (this.debugMode) {
      console.log(`🕐 [ClientTimeWeatherManager] ⬇️ NOUVEAU TEMPS: ${data.displayTime} ${data.isDayTime ? '☀️' : '🌙'}`);
    }
    
    // ✅ Mettre à jour l'état
    this.lastTimeState = stateKey;
    
    // ✅ Appliquer avec débouncing
    this.debouncedTimeNotification(data);
  }

  // ✅ NOUVEAU: Handler météo avec anti-spam BRUTAL
  handleWeatherUpdateWithAntiSpam(data) {
    // ✅ Créer une clé d'état unique
    const stateKey = `${data.weather}-${data.displayName}`;
    
    // ✅ IGNORER COMPLÈTEMENT si état identique
    if (this.lastWeatherState === stateKey) {
      this.weatherMessageCount++;
      
      // ✅ Log seulement si debug ET log de spam occasionnel
      if (this.debugMode && this.weatherMessageCount % 5 === 0) {
        console.log(`🚫 [ClientTimeWeatherManager] ${this.weatherMessageCount} messages météo identiques ignorés: ${data.displayName}`);
      }
      return; // ✅ SORTIE IMMÉDIATE - Ne rien faire
    }
    
    // ✅ Reset compteur si nouveau message
    if (this.weatherMessageCount > 0) {
      console.log(`📊 [ClientTimeWeatherManager] ${this.weatherMessageCount} messages météo dupliqués ignorés au total`);
      this.weatherMessageCount = 0;
    }
    
    if (this.debugMode) {
      console.log(`🌤️ [ClientTimeWeatherManager] ⬇️ NOUVELLE MÉTÉO: ${data.displayName}`);
    }
    
    // ✅ Mettre à jour l'état
    this.lastWeatherState = stateKey;
    
    // ✅ Appliquer avec débouncing
    this.debouncedWeatherNotification(data);
  }

  // ✅ NOUVEAU: Notification temps avec débouncing intelligent
  debouncedTimeNotification(data) {
    // ✅ Annuler le timer précédent
    if (this.notificationDebounce.time) {
      clearTimeout(this.notificationDebounce.time);
    }
    
    // ✅ Mode transition rapide : appliquer immédiatement
    if (this.fastTransitionMode) {
      this.applyTimeUpdate(data);
      return;
    }
    
    // ✅ Mode normal : débouncing de 100ms
    this.notificationDebounce.time = setTimeout(() => {
      this.applyTimeUpdate(data);
      this.notificationDebounce.time = null;
    }, 100);
  }

  // ✅ NOUVEAU: Notification météo avec débouncing intelligent
  debouncedWeatherNotification(data) {
    // ✅ Annuler le timer précédent
    if (this.notificationDebounce.weather) {
      clearTimeout(this.notificationDebounce.weather);
    }
    
    // ✅ Mode transition rapide : appliquer immédiatement
    if (this.fastTransitionMode) {
      this.applyWeatherUpdate(data);
      return;
    }
    
    // ✅ Mode normal : débouncing de 100ms
    this.notificationDebounce.weather = setTimeout(() => {
      this.applyWeatherUpdate(data);
      this.notificationDebounce.weather = null;
    }, 100);
  }

  // ✅ MÉTHODES D'APPLICATION INCHANGÉES
  applyTimeUpdate(data) {
    this.currentHour = data.gameHour;
    this.isDayTime = data.isDayTime;
    this.hasReceivedInitialTime = true;
    
    this.notifyTimeListeners(this.currentHour, this.isDayTime);
  }

  applyWeatherUpdate(data) {
    this.currentWeather = data.weather;
    this.weatherDisplayName = data.displayName;
    this.hasReceivedInitialWeather = true;
    
    this.notifyWeatherListeners(this.currentWeather, this.weatherDisplayName);
  }

  requestInitialState(networkManager) {
    if (this.debugMode) {
      console.log(`📤 [ClientTimeWeatherManager] Demande état initial...`);
    }
    
    networkManager.room.send("getTime");
    networkManager.room.send("getWeather");
    
    setTimeout(() => {
      if (!this.hasReceivedInitialTime) {
        console.warn(`⚠️ [ClientTimeWeatherManager] Timeout temps, nouvelle demande...`);
        networkManager.room.send("getTime");
      }
      if (!this.hasReceivedInitialWeather) {
        console.warn(`⚠️ [ClientTimeWeatherManager] Timeout météo, nouvelle demande...`);
        networkManager.room.send("getWeather");
      }
    }, 2000);
  }

  // ✅ API PUBLIQUE INCHANGÉE

  onTimeChange(callback) {
    this.listeners.time.push(callback);
    
    if (this.hasReceivedInitialTime) {
      setTimeout(() => {
        callback(this.currentHour, this.isDayTime);
      }, 50);
    } else if (this.debugMode) {
      console.log(`⏳ [ClientTimeWeatherManager] Callback temps enregistré, en attente...`);
    }
  }

  onWeatherChange(callback) {
    this.listeners.weather.push(callback);
    
    if (this.hasReceivedInitialWeather) {
      setTimeout(() => {
        callback(this.currentWeather, this.weatherDisplayName);
      }, 50);
    } else if (this.debugMode) {
      console.log(`⏳ [ClientTimeWeatherManager] Callback météo enregistré, en attente...`);
    }
  }

  getCurrentTime() {
    return {
      hour: this.currentHour,
      isDayTime: this.isDayTime
    };
  }

  getCurrentWeather() {
    return {
      weather: this.currentWeather,
      displayName: this.weatherDisplayName
    };
  }

  formatTime() {
    const period = this.currentHour < 12 ? 'AM' : 'PM';
    const displayHour = this.currentHour === 0 ? 12 : this.currentHour > 12 ? this.currentHour - 12 : this.currentHour;
    return `${displayHour}:00 ${period}`;
  }

  getWeatherIcon() {
    return this.currentWeather === 'rain' ? '🌧️' : '☀️';
  }

  // ✅ NOUVELLES MÉTHODES DE CONTRÔLE ANTI-SPAM ET TRANSITION

  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`🔧 [ClientTimeWeatherManager] Debug mode: ${enabled ? 'ON' : 'OFF'}`);
  }

  // ✅ NOUVEAU: Activer mode transition rapide
  enableFastTransition(duration = 2000) {
    this.fastTransitionMode = true;
    
    // ✅ Nettoyer les débouncing en cours pour appliquer immédiatement
    this.clearAllDebouncing();
    
    console.log(`🚀 [ClientTimeWeatherManager] Mode transition rapide activé (${duration}ms)`);
    
    // ✅ Désactiver automatiquement après la durée spécifiée
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
    }
    
    this.transitionTimer = setTimeout(() => {
      this.disableFastTransition();
    }, duration);
  }

  // ✅ NOUVEAU: Désactiver mode transition rapide
  disableFastTransition() {
    this.fastTransitionMode = false;
    
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    
    console.log(`⏳ [ClientTimeWeatherManager] Mode transition rapide désactivé`);
  }

  getSpamStats() {
    return {
      timeMessageCount: this.timeMessageCount,
      weatherMessageCount: this.weatherMessageCount,
      lastTimeState: this.lastTimeState,
      lastWeatherState: this.lastWeatherState,
      hasReceivedInitialTime: this.hasReceivedInitialTime,
      hasReceivedInitialWeather: this.hasReceivedInitialWeather
    };
  }

  resetSpamCounters() {
    const oldStats = this.getSpamStats();
    
    this.timeMessageCount = 0;
    this.weatherMessageCount = 0;
    
    console.log(`🔄 [ClientTimeWeatherManager] Compteurs spam reset:`, oldStats);
  }

  clearAllDebouncing() {
    if (this.notificationDebounce.time) {
      clearTimeout(this.notificationDebounce.time);
      this.notificationDebounce.time = null;
    }
    if (this.notificationDebounce.weather) {
      clearTimeout(this.notificationDebounce.weather);
      this.notificationDebounce.weather = null;
    }
    
    console.log(`🧹 [ClientTimeWeatherManager] Débouncing nettoyé`);
  }

  forceRefreshFromServer(networkManager) {
    console.log(`🔄 [ClientTimeWeatherManager] Force refresh avec reset anti-spam`);
    
    // ✅ Activer mode transition rapide pour ce refresh
    this.enableFastTransition(1000);
    
    // ✅ Reset de tous les états anti-spam
    this.lastTimeState = null;
    this.lastWeatherState = null;
    this.resetSpamCounters();
    this.clearAllDebouncing();
    
    this.hasReceivedInitialTime = false;
    this.hasReceivedInitialWeather = false;
    
    this.requestInitialState(networkManager);
  }

  isSynchronized() {
    return this.hasReceivedInitialTime && this.hasReceivedInitialWeather;
  }

  // ✅ NOTIFICATIONS INTERNES AVEC PROTECTION

  notifyTimeListeners(hour, isDayTime) {
    if (this.debugMode) {
      console.log(`📢 [ClientTimeWeatherManager] Notification temps: ${hour}h ${isDayTime ? '(JOUR)' : '(NUIT)'} → ${this.listeners.time.length} listeners`);
    }
    
    this.listeners.time.forEach(callback => {
      try {
        callback(hour, isDayTime);
      } catch (error) {
        console.error(`❌ [ClientTimeWeatherManager] Erreur callback temps:`, error);
      }
    });
  }

  notifyWeatherListeners(weather, displayName) {
    if (this.debugMode) {
      console.log(`📢 [ClientTimeWeatherManager] Notification météo: ${displayName} → ${this.listeners.weather.length} listeners`);
    }
    
    this.listeners.weather.forEach(callback => {
      try {
        callback(weather, displayName);
      } catch (error) {
        console.error(`❌ [ClientTimeWeatherManager] Erreur callback météo:`, error);
      }
    });
  }

  // ✅ DEBUG AMÉLIORÉ AVEC STATS ANTI-SPAM

  debug() {
    console.log(`🔍 [ClientTimeWeatherManager] === DEBUG ANTI-SPAM ===`);
    console.log(`🕐 Temps: ${this.currentHour}h ${this.isDayTime ? '(JOUR)' : '(NUIT)'}`);
    console.log(`🌤️ Météo: ${this.weatherDisplayName} (${this.currentWeather})`);
    console.log(`📡 Sync serveur: temps=${this.hasReceivedInitialTime}, météo=${this.hasReceivedInitialWeather}`);
    console.log(`👂 Listeners: temps=${this.listeners.time.length}, météo=${this.listeners.weather.length}`);
    console.log(`🔧 Debug mode: ${this.debugMode}`);
    
    const spamStats = this.getSpamStats();
    console.log(`📊 Stats anti-spam:`, spamStats);
    
    console.log(`⏳ Débouncing actif:`, {
      time: !!this.notificationDebounce.time,
      weather: !!this.notificationDebounce.weather
    });
    
    if (!this.isSynchronized()) {
      console.warn(`⚠️ [ClientTimeWeatherManager] PAS COMPLÈTEMENT SYNCHRONISÉ !`);
    } else {
      console.log(`✅ [ClientTimeWeatherManager] Synchronisé avec anti-spam actif`);
    }
  }

  // ✅ NETTOYAGE AVEC ANTI-SPAM

  destroy() {
    console.log(`🧹 [ClientTimeWeatherManager] Destruction avec nettoyage anti-spam...`);
    
    // ✅ Nettoyer le mode transition
    this.disableFastTransition();
    
    // ✅ Nettoyer le débouncing
    this.clearAllDebouncing();
    
    // ✅ Log des stats finales
    const finalStats = this.getSpamStats();
    if (finalStats.timeMessageCount > 0 || finalStats.weatherMessageCount > 0) {
      console.log(`📊 [ClientTimeWeatherManager] Stats finales spam:`, finalStats);
    }
    
    this.listeners.time = [];
    this.listeners.weather = [];
    this.hasReceivedInitialTime = false;
    this.hasReceivedInitialWeather = false;
    this.lastTimeState = null;
    this.lastWeatherState = null;
    
    console.log(`✅ [ClientTimeWeatherManager] Détruit avec anti-spam`);
  }
}
