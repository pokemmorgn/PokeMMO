// client/src/managers/ClientTimeWeatherManager.js
export class ClientTimeWeatherManager {
  constructor(scene) {
    this.scene = scene;
    this.currentHour = 12;
    this.isDayTime = true;
    this.currentWeather = "clear";
    this.weatherDisplayName = "Ciel dégagé";
    
    this.listeners = {
      time: [],
      weather: []
    };
    
    console.log(`🌍 [ClientTimeWeatherManager] Initialisé pour ${scene.scene.key}`);
  }

  initialize(networkManager) {
    if (!networkManager?.room) {
      console.warn(`⚠️ [ClientTimeWeatherManager] Pas de room disponible`);
      return;
    }

    this.setupNetworkHandlers(networkManager);
    this.requestInitialState(networkManager);
    
    console.log(`✅ [ClientTimeWeatherManager] Connecté au serveur`);
  }

  setupNetworkHandlers(networkManager) {
    // ✅ Handler temps
    networkManager.onMessage("timeUpdate", (data) => {
      console.log(`🕐 [ClientTimeWeatherManager] Temps reçu: ${data.displayTime} ${data.isDayTime ? '☀️' : '🌙'}`);
      
      this.currentHour = data.gameHour;
      this.isDayTime = data.isDayTime;
      
      this.notifyTimeListeners(this.currentHour, this.isDayTime);
    });

    // ✅ Handler météo
    networkManager.onMessage("weatherUpdate", (data) => {
      console.log(`🌤️ [ClientTimeWeatherManager] Météo: ${data.displayName}`);
      
      this.currentWeather = data.weather;
      this.weatherDisplayName = data.displayName;
      
      this.notifyWeatherListeners(this.currentWeather, this.weatherDisplayName);
    });

    // ✅ Handler état actuel temps
    networkManager.onMessage("currentTime", (data) => {
      console.log(`🕐 [ClientTimeWeatherManager] État temps: ${data.displayTime}`);
      
      this.currentHour = data.gameHour;
      this.isDayTime = data.isDayTime;
      
      this.notifyTimeListeners(this.currentHour, this.isDayTime);
    });

    // ✅ Handler état actuel météo
    networkManager.onMessage("currentWeather", (data) => {
      console.log(`🌤️ [ClientTimeWeatherManager] État météo: ${data.displayName}`);
      
      this.currentWeather = data.weather;
      this.weatherDisplayName = data.displayName;
      
      this.notifyWeatherListeners(this.currentWeather, this.weatherDisplayName);
    });
  }

  requestInitialState(networkManager) {
    // Demander l'état actuel
    networkManager.room.send("getTime");
    networkManager.room.send("getWeather");
  }

  // ✅ API PUBLIQUE

  onTimeChange(callback) {
    this.listeners.time.push(callback);
    // Appeler immédiatement avec l'état actuel
    callback(this.currentHour, this.isDayTime);
  }

  onWeatherChange(callback) {
    this.listeners.weather.push(callback);
    // Appeler immédiatement avec l'état actuel
    callback(this.currentWeather, this.weatherDisplayName);
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

  // ✅ NOTIFICATIONS INTERNES

  notifyTimeListeners(hour, isDayTime) {
    this.listeners.time.forEach(callback => {
      try {
        callback(hour, isDayTime);
      } catch (error) {
        console.error(`❌ [ClientTimeWeatherManager] Erreur callback temps:`, error);
      }
    });
  }

  notifyWeatherListeners(weather, displayName) {
    this.listeners.weather.forEach(callback => {
      try {
        callback(weather, displayName);
      } catch (error) {
        console.error(`❌ [ClientTimeWeatherManager] Erreur callback météo:`, error);
      }
    });
  }

  // ✅ DEBUG

  debug() {
    console.log(`🔍 [ClientTimeWeatherManager] === DEBUG ===`);
    console.log(`🕐 Temps: ${this.currentHour}h ${this.isDayTime ? '(JOUR)' : '(NUIT)'}`);
    console.log(`🌤️ Météo: ${this.weatherDisplayName} (${this.currentWeather})`);
    console.log(`👂 Listeners temps: ${this.listeners.time.length}`);
    console.log(`👂 Listeners météo: ${this.listeners.weather.length}`);
  }

  // ✅ NETTOYAGE

  destroy() {
    this.listeners.time = [];
    this.listeners.weather = [];
    console.log(`🧹 [ClientTimeWeatherManager] Détruit`);
  }
}