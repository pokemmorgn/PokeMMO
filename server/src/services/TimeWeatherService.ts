// server/src/services/TimeWeatherService.ts - VERSION SYNCHRONISATION GARANTIE
import { getServerConfig, getRandomWeatherType, WeatherType } from "../config/serverConfig";
import { PokeWorldState } from "../schema/PokeWorldState";

export class TimeWeatherService {
  private state: PokeWorldState;
  private timeClockId: any;
  private weatherClockId: any;
  private currentWeather: WeatherType;
  private onWeatherChangeCallback?: (weather: WeatherType) => void;
  private onTimeChangeCallback?: (hour: number, isDayTime: boolean) => void;
  
  // ✅ NOUVEAU: Système de synchronisation garantie
  private connectedClients: Set<any> = new Set();
  private syncClockId: any;
  private lastSyncTime: number = 0;

  constructor(state: PokeWorldState, clockService: any) {
    this.state = state;
    this.setupInitialState();
    this.startSystems(clockService);
    this.startSyncSystem(clockService);
  }

  private setupInitialState() {
    const config = getServerConfig();
    
    // ✅ État initial temps
    this.state.gameHour = config.timeSystem.startHour;
    this.state.isDayTime = this.calculateDayTime(this.state.gameHour);
    
    // ✅ État initial météo
    this.currentWeather = this.getWeatherByName("clear") || getRandomWeatherType();
    this.state.weather = this.currentWeather.name;
    
    console.log(`🕐 [TimeWeatherService] État initial: ${this.state.gameHour}h ${this.state.isDayTime ? '(JOUR)' : '(NUIT)'}`);
    console.log(`🌤️ [TimeWeatherService] Météo: ${this.currentWeather.displayName}`);
  }

  private startSystems(clockService: any) {
    const config = getServerConfig();
    
    // ✅ Système temps
    if (config.timeSystem.enabled) {
      this.timeClockId = clockService.setInterval(() => {
        this.updateTime();
      }, config.timeSystem.timeIntervalMs);
      
      console.log(`✅ [TimeWeatherService] Système temps démarré (${config.timeSystem.timeIntervalMs}ms)`);
    }

    // ✅ Système météo
    if (config.weatherSystem.enabled) {
      this.weatherClockId = clockService.setInterval(() => {
        this.updateWeather();
      }, config.weatherSystem.changeIntervalMs);
      
      console.log(`✅ [TimeWeatherService] Système météo démarré (${config.weatherSystem.changeIntervalMs}ms)`);
    }
  }

  // ✅ NOUVEAU: Système de synchronisation périodique
  private startSyncSystem(clockService: any) {
    // ✅ Envoyer l'état actuel toutes les 30 secondes pour garantir la sync
    this.syncClockId = clockService.setInterval(() => {
      this.broadcastCurrentState();
    }, 30000); // 30 secondes
    
    console.log(`✅ [TimeWeatherService] Système de sync périodique démarré (30s)`);
  }

  private updateTime() {
    const config = getServerConfig();
    const oldHour = this.state.gameHour;
    const oldDayTime = this.state.isDayTime;
    
    this.state.gameHour = (this.state.gameHour + 1) % 24;
    this.state.isDayTime = this.calculateDayTime(this.state.gameHour);
    
    if (oldDayTime !== this.state.isDayTime) {
      console.log(`🌅 [TimeWeatherService] Transition: ${oldDayTime ? 'JOUR' : 'NUIT'} → ${this.state.isDayTime ? 'JOUR' : 'NUIT'} (${this.state.gameHour}h)`);
    }
    
    // ✅ BROADCAST IMMÉDIAT à tous les clients connectés
    this.broadcastTimeUpdate();
  }

  private updateWeather() {
    const oldWeather = this.currentWeather;
    this.currentWeather = getRandomWeatherType();
    this.state.weather = this.currentWeather.name;
    
    console.log(`🌤️ [TimeWeatherService] Météo: ${oldWeather.displayName} → ${this.currentWeather.displayName}`);
    
    // ✅ BROADCAST IMMÉDIAT à tous les clients connectés
    this.broadcastWeatherUpdate();
  }

  private calculateDayTime(hour: number): boolean {
    const config = getServerConfig();
    return hour >= config.timeSystem.dayStartHour && hour < config.timeSystem.nightStartHour;
  }

  private getWeatherByName(name: string): WeatherType | undefined {
    const config = getServerConfig();
    return config.weatherSystem.weatherTypes.find(w => w.name === name);
  }

  // ✅ NOUVEAUX MÉTHODES DE BROADCAST

  private broadcastTimeUpdate() {
    const timeData = {
      gameHour: this.state.gameHour,
      isDayTime: this.state.isDayTime,
      displayTime: this.formatTime(),
      timestamp: Date.now()
    };
    
    console.log(`📡 [TimeWeatherService] Broadcast temps: ${timeData.displayTime} → ${this.connectedClients.size} clients`);
    
    // ✅ Utiliser le callback pour envoyer via WorldRoom
    if (this.onTimeChangeCallback) {
      this.onTimeChangeCallback(this.state.gameHour, this.state.isDayTime);
    }
    
    this.lastSyncTime = Date.now();
  }

  private broadcastWeatherUpdate() {
    const weatherData = {
      weather: this.currentWeather.name,
      displayName: this.currentWeather.displayName,
      timestamp: Date.now()
    };
    
    console.log(`📡 [TimeWeatherService] Broadcast météo: ${weatherData.displayName} → ${this.connectedClients.size} clients`);
    
    // ✅ Utiliser le callback pour envoyer via WorldRoom
    if (this.onWeatherChangeCallback) {
      this.onWeatherChangeCallback(this.currentWeather);
    }
  }

  private broadcastCurrentState() {
    if (this.connectedClients.size === 0) {
      return; // Pas de clients connectés
    }
    
    console.log(`🔄 [TimeWeatherService] Sync périodique: ${this.connectedClients.size} clients`);
    
    // ✅ Forcer l'envoi de l'état actuel
    this.broadcastTimeUpdate();
    this.broadcastWeatherUpdate();
  }

  // ✅ NOUVELLES MÉTHODES DE GESTION DES CLIENTS

  public addClient(client: any) {
    this.connectedClients.add(client);
    console.log(`👤 [TimeWeatherService] Client ajouté: ${client.sessionId} (total: ${this.connectedClients.size})`);
    
    // ✅ ENVOYER IMMÉDIATEMENT L'ÉTAT ACTUEL AU NOUVEAU CLIENT
    setTimeout(() => {
      this.sendCurrentStateToClient(client);
    }, 500); // Petit délai pour laisser le client s'initialiser
  }

  public removeClient(client: any) {
    this.connectedClients.delete(client);
    console.log(`👋 [TimeWeatherService] Client retiré: ${client.sessionId} (restant: ${this.connectedClients.size})`);
  }

  private sendCurrentStateToClient(client: any) {
    console.log(`📤 [TimeWeatherService] Envoi état actuel à ${client.sessionId}`);
    
    // ✅ Envoyer l'état temps actuel
    client.send("currentTime", {
      gameHour: this.state.gameHour,
      isDayTime: this.state.isDayTime,
      displayTime: this.formatTime()
    });
    
    // ✅ Envoyer l'état météo actuel
    client.send("currentWeather", {
      weather: this.currentWeather.name,
      displayName: this.currentWeather.displayName
    });
    
    console.log(`✅ [TimeWeatherService] État envoyé: ${this.formatTime()}, ${this.currentWeather.displayName}`);
  }

  // ✅ API PUBLIQUE - INCHANGÉE
  
  getCurrentWeather(): WeatherType {
    return this.currentWeather;
  }

  getCurrentTime(): { hour: number; isDayTime: boolean } {
    return {
      hour: this.state.gameHour,
      isDayTime: this.state.isDayTime
    };
  }

  setWeatherChangeCallback(callback: (weather: WeatherType) => void) {
    this.onWeatherChangeCallback = callback;
  }

  setTimeChangeCallback(callback: (hour: number, isDayTime: boolean) => void) {
    this.onTimeChangeCallback = callback;
  }

  getWeatherEffect(effectName: string): number {
    return this.currentWeather.effects[effectName as keyof typeof this.currentWeather.effects] as number || 1.0;
  }

  // ✅ MÉTHODE SIMPLIFIÉE: Retourne les conditions actuelles pour les rencontres
  getEncounterConditions(): { timeOfDay: 'day' | 'night', weather: 'clear' | 'rain' } {
    return {
      timeOfDay: this.state.isDayTime ? 'day' : 'night',
      weather: this.currentWeather.name === 'rain' ? 'rain' : 'clear' // Force clear pour tous sauf rain
    };
  }

  getAvailableWeatherTypes(): string[] {
    const config = getServerConfig();
    return config.weatherSystem.weatherTypes.map(w => w.name);
  }

  formatTime(): string {
    const period = this.state.gameHour < 12 ? 'AM' : 'PM';
    const displayHour = this.state.gameHour === 0 ? 12 : this.state.gameHour > 12 ? this.state.gameHour - 12 : this.state.gameHour;
    return `${displayHour}:00 ${period}`;
  }

  // ✅ NOUVELLES MÉTHODES DE GESTION MANUELLE

  public sendCurrentStateToAllClients() {
    console.log(`📡 [TimeWeatherService] Force envoi état à tous les clients (${this.connectedClients.size})`);
    
    this.connectedClients.forEach(client => {
      this.sendCurrentStateToClient(client);
    });
  }

  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  public debugSyncStatus() {
    console.log(`🔍 [TimeWeatherService] === ÉTAT DE SYNCHRONISATION ===`);
    console.log(`👥 Clients connectés: ${this.connectedClients.size}`);
    console.log(`🕐 Heure actuelle: ${this.formatTime()} (${this.state.gameHour}h)`);
    console.log(`🌤️ Météo actuelle: ${this.currentWeather.displayName}`);
    console.log(`⏰ Dernière sync: ${this.lastSyncTime ? new Date(this.lastSyncTime).toLocaleTimeString() : 'jamais'}`);
    console.log(`📡 Système temps actif: ${!!this.timeClockId}`);
    console.log(`🌦️ Système météo actif: ${!!this.weatherClockId}`);
    console.log(`🔄 Système sync actif: ${!!this.syncClockId}`);
    
    // ✅ Lister les clients connectés
    if (this.connectedClients.size > 0) {
      console.log(`👤 Clients:`);
      this.connectedClients.forEach((client, index) => {
        console.log(`  ${index + 1}. ${client.sessionId}`);
      });
    }
  }

  // ✅ MÉTHODES DE TEST AMÉLIORÉES

  public forceTime(hour: number, minute: number = 0): void {
    if (hour < 0 || hour > 23) {
      console.warn(`⚠️ [TimeWeatherService] Heure invalide: ${hour}`);
      return;
    }
    
    const oldHour = this.state.gameHour;
    const oldDayTime = this.state.isDayTime;
    
    this.state.gameHour = hour;
    this.state.isDayTime = this.calculateDayTime(hour);
    
    console.log(`🕐 [TEST] Heure forcée: ${oldHour}h → ${hour}h (${this.state.isDayTime ? 'JOUR' : 'NUIT'})`);
    
    // ✅ BROADCAST IMMÉDIAT à tous les clients
    this.broadcastTimeUpdate();
  }

  public forceWeather(weatherName: string): void {
    const weather = this.getWeatherByName(weatherName);
    
    if (!weather) {
      console.warn(`⚠️ [TimeWeatherService] Météo inconnue: ${weatherName}`);
      const config = getServerConfig();
      console.log(`📋 Météos disponibles:`, config.weatherSystem.weatherTypes.map(w => w.name));
      return;
    }
    
    const oldWeather = this.currentWeather.name;
    this.currentWeather = weather;
    this.state.weather = weather.name;
    
    console.log(`🌦️ [TEST] Météo forcée: ${oldWeather} → ${weatherName}`);
    
    // ✅ BROADCAST IMMÉDIAT à tous les clients
    this.broadcastWeatherUpdate();
  }

  // ✅ MÉTHODE DE SYNCHRONISATION FORCÉE

  public forceSyncAll(): void {
    console.log(`🔄 [TimeWeatherService] SYNCHRONISATION FORCÉE DE TOUS LES CLIENTS`);
    
    if (this.connectedClients.size === 0) {
      console.log(`ℹ️ [TimeWeatherService] Aucun client à synchroniser`);
      return;
    }
    
    this.broadcastCurrentState();
    console.log(`✅ [TimeWeatherService] Synchronisation forcée terminée`);
  }

  // ✅ MÉTHODE POUR VÉRIFIER LA SANTÉ DU SYSTÈME

  public healthCheck(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!this.timeClockId) {
      issues.push("Système de temps non actif");
    }
    
    if (!this.weatherClockId) {
      issues.push("Système de météo non actif");
    }
    
    if (!this.syncClockId) {
      issues.push("Système de synchronisation non actif");
    }
    
    if (this.connectedClients.size === 0) {
      issues.push("Aucun client connecté");
    }
    
    const timeSinceLastSync = Date.now() - this.lastSyncTime;
    if (timeSinceLastSync > 60000) { // Plus de 1 minute
      issues.push(`Dernière sync il y a ${Math.round(timeSinceLastSync / 1000)}s`);
    }
    
    return {
      healthy: issues.length === 0,
      issues: issues
    };
  }

  destroy() {
    console.log(`🧹 [TimeWeatherService] Destruction...`);
    
    if (this.timeClockId) {
      this.timeClockId.clear();
      this.timeClockId = null;
    }
    
    if (this.weatherClockId) {
      this.weatherClockId.clear();
      this.weatherClockId = null;
    }
    
    if (this.syncClockId) {
      this.syncClockId.clear();
      this.syncClockId = null;
    }
    
    this.connectedClients.clear();
    
    console.log(`✅ [TimeWeatherService] Service détruit`);
  }
}
