// client/src/managers/ClientTimeWeatherManager.js - VERSION SYNCHRONISÉE SERVEUR
export class ClientTimeWeatherManager {
  constructor(scene) {
    this.scene = scene;
    
    // ✅ SUPPRIMÉ: Plus de gestion locale du temps
    // Le client reçoit UNIQUEMENT l'heure du serveur
    this.currentHour = 12;
    this.isDayTime = true;
    this.currentWeather = "clear";
    this.weatherDisplayName = "Ciel dégagé";
    
    // ✅ Flag pour savoir si on a reçu l'état initial du serveur
    this.hasReceivedInitialTime = false;
    this.hasReceivedInitialWeather = false;
    
    this.listeners = {
      time: [],
      weather: []
    };
    
    console.log(`🌍 [ClientTimeWeatherManager] Initialisé pour ${scene.scene.key} - Mode serveur uniquement`);
  }

  initialize(networkManager) {
    if (!networkManager?.room) {
      console.warn(`⚠️ [ClientTimeWeatherManager] Pas de room disponible`);
      return;
    }

    this.setupNetworkHandlers(networkManager);
    this.requestInitialState(networkManager);
    
    console.log(`✅ [ClientTimeWeatherManager] Connecté au serveur (mode sync)`);
  }

  setupNetworkHandlers(networkManager) {
    // ✅ Handler temps - MISE À JOUR DIRECTE DEPUIS SERVEUR
    networkManager.onMessage("timeUpdate", (data) => {
      console.log(`🕐 [ClientTimeWeatherManager] ⬇️ SERVEUR → CLIENT: ${data.displayTime} ${data.isDayTime ? '☀️' : '🌙'}`);
      
      // ✅ APPLIQUER DIRECTEMENT L'HEURE DU SERVEUR
      this.currentHour = data.gameHour;
      this.isDayTime = data.isDayTime;
      this.hasReceivedInitialTime = true;
      
      // ✅ NOTIFIER IMMÉDIATEMENT LES LISTENERS
      this.notifyTimeListeners(this.currentHour, this.isDayTime);
    });

    // ✅ Handler météo - MISE À JOUR DIRECTE DEPUIS SERVEUR
    networkManager.onMessage("weatherUpdate", (data) => {
      console.log(`🌤️ [ClientTimeWeatherManager] ⬇️ SERVEUR → CLIENT: ${data.displayName}`);
      
      // ✅ APPLIQUER DIRECTEMENT LA MÉTÉO DU SERVEUR
      this.currentWeather = data.weather;
      this.weatherDisplayName = data.displayName;
      this.hasReceivedInitialWeather = true;
      
      // ✅ NOTIFIER IMMÉDIATEMENT LES LISTENERS
      this.notifyWeatherListeners(this.currentWeather, this.weatherDisplayName);
    });

    // ✅ Handler état initial temps
    networkManager.onMessage("currentTime", (data) => {
      console.log(`🕐 [ClientTimeWeatherManager] ➡️ État initial temps: ${data.displayTime}`);
      
      this.currentHour = data.gameHour;
      this.isDayTime = data.isDayTime;
      this.hasReceivedInitialTime = true;
      
      // ✅ NOTIFIER avec l'état initial
      this.notifyTimeListeners(this.currentHour, this.isDayTime);
    });

    // ✅ Handler état initial météo
    networkManager.onMessage("currentWeather", (data) => {
      console.log(`🌤️ [ClientTimeWeatherManager] ➡️ État initial météo: ${data.displayName}`);
      
      this.currentWeather = data.weather;
      this.weatherDisplayName = data.displayName;
      this.hasReceivedInitialWeather = true;
      
      // ✅ NOTIFIER avec l'état initial
      this.notifyWeatherListeners(this.currentWeather, this.weatherDisplayName);
    });

    console.log(`✅ [ClientTimeWeatherManager] Handlers réseau configurés (mode serveur)`);
  }

  requestInitialState(networkManager) {
    console.log(`📤 [ClientTimeWeatherManager] Demande état initial au serveur...`);
    
    // ✅ Demander l'état actuel au serveur
    networkManager.room.send("getTime");
    networkManager.room.send("getWeather");
    
    // ✅ NOUVEAU: Répéter la demande si pas de réponse après 2 secondes
    setTimeout(() => {
      if (!this.hasReceivedInitialTime) {
        console.warn(`⚠️ [ClientTimeWeatherManager] Pas de réponse temps, nouvelle demande...`);
        networkManager.room.send("getTime");
      }
      if (!this.hasReceivedInitialWeather) {
        console.warn(`⚠️ [ClientTimeWeatherManager] Pas de réponse météo, nouvelle demande...`);
        networkManager.room.send("getWeather");
      }
    }, 2000);
  }

  // ✅ API PUBLIQUE - INCHANGÉE

  onTimeChange(callback) {
    this.listeners.time.push(callback);
    
    // ✅ SEULEMENT si on a reçu l'état du serveur
    if (this.hasReceivedInitialTime) {
      callback(this.currentHour, this.isDayTime);
    } else {
      console.log(`⏳ [ClientTimeWeatherManager] Callback temps enregistré, en attente serveur...`);
    }
  }

  onWeatherChange(callback) {
    this.listeners.weather.push(callback);
    
    // ✅ SEULEMENT si on a reçu l'état du serveur
    if (this.hasReceivedInitialWeather) {
      callback(this.currentWeather, this.weatherDisplayName);
    } else {
      console.log(`⏳ [ClientTimeWeatherManager] Callback météo enregistré, en attente serveur...`);
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

  // ✅ NOUVELLES MÉTHODES DE SYNCHRONISATION
  
  isSynchronized() {
    return this.hasReceivedInitialTime && this.hasReceivedInitialWeather;
  }

  forceRefreshFromServer(networkManager) {
    console.log(`🔄 [ClientTimeWeatherManager] Force refresh depuis serveur`);
    
    this.hasReceivedInitialTime = false;
    this.hasReceivedInitialWeather = false;
    
    this.requestInitialState(networkManager);
  }

  // ✅ NOTIFICATIONS INTERNES - INCHANGÉES

  notifyTimeListeners(hour, isDayTime) {
    console.log(`📢 [ClientTimeWeatherManager] Notification temps: ${hour}h ${isDayTime ? '(JOUR)' : '(NUIT)'} → ${this.listeners.time.length} listeners`);
    
    this.listeners.time.forEach(callback => {
      try {
        callback(hour, isDayTime);
      } catch (error) {
        console.error(`❌ [ClientTimeWeatherManager] Erreur callback temps:`, error);
      }
    });
  }

  notifyWeatherListeners(weather, displayName) {
    console.log(`📢 [ClientTimeWeatherManager] Notification météo: ${displayName} → ${this.listeners.weather.length} listeners`);
    
    this.listeners.weather.forEach(callback => {
      try {
        callback(weather, displayName);
      } catch (error) {
        console.error(`❌ [ClientTimeWeatherManager] Erreur callback météo:`, error);
      }
    });
  }

  // ✅ DEBUG AMÉLIORÉ

  debug() {
    console.log(`🔍 [ClientTimeWeatherManager] === DEBUG ===`);
    console.log(`🕐 Temps: ${this.currentHour}h ${this.isDayTime ? '(JOUR)' : '(NUIT)'}`);
    console.log(`🌤️ Météo: ${this.weatherDisplayName} (${this.currentWeather})`);
    console.log(`📡 Sync serveur: temps=${this.hasReceivedInitialTime}, météo=${this.hasReceivedInitialWeather}`);
    console.log(`👂 Listeners: temps=${this.listeners.time.length}, météo=${this.listeners.weather.length}`);
    
    if (!this.isSynchronized()) {
      console.warn(`⚠️ [ClientTimeWeatherManager] PAS COMPLÈTEMENT SYNCHRONISÉ !`);
    } else {
      console.log(`✅ [ClientTimeWeatherManager] Complètement synchronisé avec le serveur`);
    }
  }

  // ✅ NETTOYAGE - INCHANGÉ

  destroy() {
    this.listeners.time = [];
    this.listeners.weather = [];
    this.hasReceivedInitialTime = false;
    this.hasReceivedInitialWeather = false;
    console.log(`🧹 [ClientTimeWeatherManager] Détruit`);
  }
}
