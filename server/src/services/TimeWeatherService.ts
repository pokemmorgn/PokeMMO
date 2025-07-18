// TimeWeatherService.ts - VERSION ANTI-SPAM OPTIMISÉE AVEC SYNC RAPIDE
import { getServerConfig, getRandomWeatherType, WeatherType } from "../config/serverConfig";
import { PokeWorldState } from "../schema/PokeWorldState";
import { serverZoneEnvironmentManager } from "../config/zoneEnvironments";

interface ClientZoneInfo {
  sessionId: string;
  currentZone: string;
  environment: 'outdoor' | 'indoor' | 'cave';
  lastUpdate: number;
  // ✅ NOUVEAU: États précédents pour éviter les doublons
  lastTimeState?: string;
  lastWeatherState?: string;
}

interface PendingSync {
  time: boolean;
  weather: boolean;
  timer?: NodeJS.Timeout;
}

export class TimeWeatherService {
  private state: PokeWorldState;
  private timeClockId: any;
  private weatherClockId: any;
  private currentWeather: WeatherType;
  private onWeatherChangeCallback?: (weather: WeatherType) => void;
  private onTimeChangeCallback?: (hour: number, isDayTime: boolean) => void;
  
  private connectedClients: Set<any> = new Set();
  private clientZoneInfo: Map<string, ClientZoneInfo> = new Map();
  private syncClockId: any;
  private lastSyncTime: number = 0;
  
  // ✅ NOUVEAU: Anti-spam avec debouncing
  private pendingSyncs: Map<string, PendingSync> = new Map();
  private debugMode: boolean = false;

  constructor(state: PokeWorldState, clockService: any) {
    this.state = state;
    this.setupInitialState();
    this.startSystems(clockService);
    this.startSyncSystem(clockService);
    this.validateEnvironmentConfiguration();
  }

  private setupInitialState() {
    const config = getServerConfig();
    
    this.state.gameHour = config.timeSystem.startHour;
    this.state.isDayTime = this.calculateDayTime(this.state.gameHour);
    
    this.currentWeather = this.getWeatherByName("clear") || getRandomWeatherType();
    this.state.weather = this.currentWeather.name;
    
    console.log(`🕐 [TimeWeatherService] État initial: ${this.state.gameHour}h ${this.state.isDayTime ? '(JOUR)' : '(NUIT)'}`);
    console.log(`🌤️ [TimeWeatherService] Météo: ${this.currentWeather.displayName}`);
  }

  private validateEnvironmentConfiguration() {
    const validation = serverZoneEnvironmentManager.validateAllZones();
    if (!validation.valid) {
      console.warn(`⚠️ [TimeWeatherService] Problèmes configuration environnements:`, validation.issues);
    } else {
      console.log(`✅ [TimeWeatherService] Configuration environnements validée`);
    }
  }

  private startSystems(clockService: any) {
    const config = getServerConfig();
    
    if (config.timeSystem.enabled) {
      this.timeClockId = clockService.setInterval(() => {
        this.updateTime();
      }, config.timeSystem.timeIntervalMs);
      
      console.log(`✅ [TimeWeatherService] Système temps démarré (${config.timeSystem.timeIntervalMs}ms)`);
    }

    if (config.weatherSystem.enabled) {
      this.weatherClockId = clockService.setInterval(() => {
        this.updateWeather();
      }, config.weatherSystem.changeIntervalMs);
      
      console.log(`✅ [TimeWeatherService] Système météo démarré (${config.weatherSystem.changeIntervalMs}ms)`);
    }
  }

  // ✅ SYNC RÉDUIT: 5 minutes au lieu de 30 secondes
  private startSyncSystem(clockService: any) {
    this.syncClockId = clockService.setInterval(() => {
      this.scheduledHealthSync();
    }, 300000); // ✅ 5 minutes au lieu de 30 secondes
    
    console.log(`✅ [TimeWeatherService] Système de sync réduit démarré (5min)`);
  }

  // ✅ NOUVEAU: Sync santé seulement si nécessaire
  private scheduledHealthSync() {
    const health = this.healthCheck();
    
    if (!health.healthy) {
      console.log(`🔄 [TimeWeatherService] Sync santé: problèmes détectés`, health.issues);
      this.broadcastCurrentStateByEnvironment();
    } else if (this.debugMode) {
      console.log(`✅ [TimeWeatherService] Sync santé: tout va bien, pas d'envoi`);
    }
  }

  private updateTime() {
    const oldHour = this.state.gameHour;
    const oldDayTime = this.state.isDayTime;
    
    this.state.gameHour = (this.state.gameHour + 1) % 24;
    this.state.isDayTime = this.calculateDayTime(this.state.gameHour);
    
    if (oldDayTime !== this.state.isDayTime) {
      console.log(`🌅 [TimeWeatherService] Transition: ${oldDayTime ? 'JOUR' : 'NUIT'} → ${this.state.isDayTime ? 'JOUR' : 'NUIT'} (${this.state.gameHour}h)`);
    }
    
    // ✅ BROADCAST INTELLIGENT et DEBOUNCED
    this.debouncedBroadcastTime();
  }

  private updateWeather() {
    const oldWeather = this.currentWeather;
    this.currentWeather = getRandomWeatherType();
    this.state.weather = this.currentWeather.name;
    
    console.log(`🌤️ [TimeWeatherService] Météo: ${oldWeather.displayName} → ${this.currentWeather.displayName}`);
    
    // ✅ BROADCAST INTELLIGENT et DEBOUNCED
    this.debouncedBroadcastWeather();
  }

  // ✅ NOUVEAU: Debouncing pour éviter le spam
  private debouncedBroadcastTime() {
    this.scheduleClientUpdates('time');
  }

  private debouncedBroadcastWeather() {
    this.scheduleClientUpdates('weather');
  }

  private scheduleClientUpdates(type: 'time' | 'weather') {
    // ✅ Grouper les updates par client pour éviter le spam
    this.connectedClients.forEach(client => {
      const sessionId = client.sessionId;
      
      if (!this.pendingSyncs.has(sessionId)) {
        this.pendingSyncs.set(sessionId, { time: false, weather: false });
      }
      
      const pending = this.pendingSyncs.get(sessionId)!;
      pending[type] = true;
      
      // ✅ Annuler le timer existant
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      
      // ✅ Programmer l'envoi groupé dans 50ms au lieu de 200ms
      pending.timer = setTimeout(() => {
        this.sendPendingUpdates(client, pending);
        this.pendingSyncs.delete(sessionId);
      }, 50);
    });
  }

  // ✅ NOUVEAU: Envoi groupé des updates
  private sendPendingUpdates(client: any, pending: PendingSync) {
    const zoneInfo = this.clientZoneInfo.get(client.sessionId);
    
    if (!zoneInfo) {
      // Client sans zone - envoyer basique
      if (pending.time) {
        this.sendTimeUpdate(client, null);
      }
      if (pending.weather) {
        this.sendWeatherUpdate(client, null);
      }
      return;
    }
    
    // ✅ Calculer les nouveaux états
    const timeState = `${this.state.gameHour}-${this.state.isDayTime}`;
    const weatherState = `${this.currentWeather.name}-${this.currentWeather.displayName}`;
    
    // ✅ SKIP si états identiques
    if (pending.time && zoneInfo.lastTimeState === timeState) {
      if (this.debugMode) {
        console.log(`⚡ [TimeWeatherService] Skip temps identique pour ${client.sessionId}: ${timeState}`);
      }
      pending.time = false;
    }
    
    if (pending.weather && zoneInfo.lastWeatherState === weatherState) {
      if (this.debugMode) {
        console.log(`⚡ [TimeWeatherService] Skip météo identique pour ${client.sessionId}: ${weatherState}`);
      }
      pending.weather = false;
    }
    
    // ✅ Envoyer seulement ce qui a changé
    if (pending.time) {
      this.sendTimeUpdate(client, zoneInfo);
      zoneInfo.lastTimeState = timeState;
    }
    
    if (pending.weather) {
      this.sendWeatherUpdate(client, zoneInfo);
      zoneInfo.lastWeatherState = weatherState;
    }
  }

  // ✅ NOUVEAU: Méthodes d'envoi individuelles
  private sendTimeUpdate(client: any, zoneInfo: ClientZoneInfo | null) {
    const timeData = {
      gameHour: this.state.gameHour,
      isDayTime: this.state.isDayTime,
      displayTime: this.formatTime(),
      timestamp: Date.now()
    };

    if (zoneInfo) {
      const affectedByDayNight = serverZoneEnvironmentManager.isAffectedByDayNight(zoneInfo.currentZone);
      
      client.send("timeUpdate", {
        ...timeData,
        environment: zoneInfo.environment,
        zone: zoneInfo.currentZone,
        affectedByDayNight: affectedByDayNight
      });
      
      if (this.debugMode) {
        console.log(`📤 [TimeWeatherService] Temps envoyé à ${client.sessionId}: ${timeData.displayTime} (${zoneInfo.environment})`);
      }
    } else {
      client.send("timeUpdate", timeData);
    }
  }

  private sendWeatherUpdate(client: any, zoneInfo: ClientZoneInfo | null) {
    const weatherData = {
      weather: this.currentWeather.name,
      displayName: this.currentWeather.displayName,
      timestamp: Date.now()
    };

    if (zoneInfo) {
      const affectedByWeather = serverZoneEnvironmentManager.isAffectedByWeather(zoneInfo.currentZone);
      
      client.send("weatherUpdate", {
        ...weatherData,
        environment: zoneInfo.environment,
        zone: zoneInfo.currentZone,
        affectedByWeather: affectedByWeather
      });
      
      if (this.debugMode) {
        console.log(`📤 [TimeWeatherService] Météo envoyée à ${client.sessionId}: ${weatherData.displayName} (${zoneInfo.environment})`);
      }
    } else {
      client.send("weatherUpdate", weatherData);
    }
  }

  // ✅ ANCIENNE MÉTHODE: Broadcast complet (seulement pour les callbacks)
  private broadcastCurrentStateByEnvironment() {
    if (this.connectedClients.size === 0) {
      return;
    }
    
    console.log(`🔄 [TimeWeatherService] Broadcast complet forcé: ${this.connectedClients.size} clients`);
    
    // ✅ Utiliser le système debounced même pour les broadcasts forcés
    this.debouncedBroadcastTime();
    this.debouncedBroadcastWeather();
    
    // ✅ Utiliser les callbacks pour WorldRoom
    if (this.onTimeChangeCallback) {
      this.onTimeChangeCallback(this.state.gameHour, this.state.isDayTime);
    }
    
    if (this.onWeatherChangeCallback) {
      this.onWeatherChangeCallback(this.currentWeather);
    }
    
    this.lastSyncTime = Date.now();
  }

  private calculateDayTime(hour: number): boolean {
    const config = getServerConfig();
    return hour >= config.timeSystem.dayStartHour && hour < config.timeSystem.nightStartHour;
  }

  private getWeatherByName(name: string): WeatherType | undefined {
    const config = getServerConfig();
    return config.weatherSystem.weatherTypes.find(w => w.name === name);
  }

  // ✅ GESTION CLIENTS AVEC ANTI-SPAM

  public addClient(client: any, currentZone?: string) {
    this.connectedClients.add(client);
    
    if (currentZone) {
      this.updateClientZone(client, currentZone);
    }
    
    console.log(`👤 [TimeWeatherService] Client ajouté: ${client.sessionId} ${currentZone ? `(zone: ${currentZone})` : ''} (total: ${this.connectedClients.size})`);
    
    // ✅ DÉLAI RÉDUIT de 1000ms à 200ms
    setTimeout(() => {
      this.sendCurrentStateToClient(client);
    }, 200);
  }

  public removeClient(client: any) {
    this.connectedClients.delete(client);
    this.clientZoneInfo.delete(client.sessionId);
    
    // ✅ NETTOYER les syncs en attente
    const pending = this.pendingSyncs.get(client.sessionId);
    if (pending?.timer) {
      clearTimeout(pending.timer);
    }
    this.pendingSyncs.delete(client.sessionId);
    
    console.log(`👋 [TimeWeatherService] Client retiré: ${client.sessionId} (restant: ${this.connectedClients.size})`);
  }

  // ✅ NOUVEAU: UpdateClientZone avec débouncing
  public updateClientZone(client: any, newZone: string) {
    const environment = serverZoneEnvironmentManager.getZoneConfig(newZone)?.environment || 'outdoor';
    
    const zoneInfo: ClientZoneInfo = {
      sessionId: client.sessionId,
      currentZone: newZone,
      environment: environment,
      lastUpdate: Date.now(),
      // ✅ Reset des états pour forcer l'envoi
      lastTimeState: undefined,
      lastWeatherState: undefined
    };
    
    this.clientZoneInfo.set(client.sessionId, zoneInfo);
    
    console.log(`🌍 [TimeWeatherService] Client ${client.sessionId} → zone: ${newZone} (${environment})`);
    
    // ✅ ENVOI IMMÉDIAT au lieu d'un délai
    this.sendCurrentStateToClient(client);
  }

  private sendCurrentStateToClient(client: any) {
    const zoneInfo = this.clientZoneInfo.get(client.sessionId);
    const environment = zoneInfo?.environment || 'outdoor';
    const currentZone = zoneInfo?.currentZone || 'unknown';
    
    console.log(`📤 [TimeWeatherService] Envoi état initial à ${client.sessionId} (${currentZone}, ${environment})`);
    
    // ✅ Envoyer les états individuellement avec les bons états
    this.sendTimeUpdate(client, zoneInfo);
    this.sendWeatherUpdate(client, zoneInfo);
    
    // ✅ Marquer les états comme envoyés
    if (zoneInfo) {
      zoneInfo.lastTimeState = `${this.state.gameHour}-${this.state.isDayTime}`;
      zoneInfo.lastWeatherState = `${this.currentWeather.name}-${this.currentWeather.displayName}`;
    }
  }

  // ✅ API PUBLIQUE

  public setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
    console.log(`🔧 [TimeWeatherService] Debug mode: ${enabled ? 'ON' : 'OFF'}`);
  }

  public sendCurrentStateToAllClients() {
    console.log(`📡 [TimeWeatherService] Force envoi état à tous les clients (${this.connectedClients.size})`);
    
    this.connectedClients.forEach(client => {
      // ✅ Reset des états pour forcer l'envoi
      const zoneInfo = this.clientZoneInfo.get(client.sessionId);
      if (zoneInfo) {
        zoneInfo.lastTimeState = undefined;
        zoneInfo.lastWeatherState = undefined;
      }
      
      this.sendCurrentStateToClient(client);
    });
  }

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

  getEncounterConditions(zoneName?: string): { timeOfDay: 'day' | 'night', weather: 'clear' | 'rain' } {
    let effectiveTimeOfDay: 'day' | 'night' = this.state.isDayTime ? 'day' : 'night';
    let effectiveWeather: 'clear' | 'rain' = this.currentWeather.name === 'rain' ? 'rain' : 'clear';
    
    if (zoneName) {
      const affectedByDayNight = serverZoneEnvironmentManager.isAffectedByDayNight(zoneName);
      const affectedByWeather = serverZoneEnvironmentManager.isAffectedByWeather(zoneName);
      
      if (!affectedByDayNight) {
        effectiveTimeOfDay = 'day';
      }
      
      if (!affectedByWeather) {
        effectiveWeather = 'clear';
      }
    }
    
    return {
      timeOfDay: effectiveTimeOfDay,
      weather: effectiveWeather
    };
  }

  formatTime(): string {
    const period = this.state.gameHour < 12 ? 'AM' : 'PM';
    const displayHour = this.state.gameHour === 0 ? 12 : this.state.gameHour > 12 ? this.state.gameHour - 12 : this.state.gameHour;
    return `${displayHour}:00 ${period}`;
  }

  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  public healthCheck(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!this.timeClockId) {
      issues.push("Système de temps non actif");
    }
    
    if (!this.weatherClockId) {
      issues.push("Système de météo non actif");
    }
    
    if (this.connectedClients.size === 0) {
      issues.push("Aucun client connecté");
    }
    
    const timeSinceLastSync = Date.now() - this.lastSyncTime;
    if (timeSinceLastSync > 360000) { // Plus de 6 minutes
      issues.push(`Dernière sync il y a ${Math.round(timeSinceLastSync / 1000)}s`);
    }
    
    return {
      healthy: issues.length === 0,
      issues: issues
    };
  }

  public debugSyncStatus() {
    console.log(`🔍 [TimeWeatherService] === ÉTAT ANTI-SPAM ===`);
    console.log(`👥 Clients connectés: ${this.connectedClients.size}`);
    console.log(`⏳ Syncs en attente: ${this.pendingSyncs.size}`);
    console.log(`🕐 Heure actuelle: ${this.formatTime()}`);
    console.log(`🌤️ Météo actuelle: ${this.currentWeather.displayName}`);
    console.log(`🔧 Debug mode: ${this.debugMode}`);
    
    if (this.pendingSyncs.size > 0) {
      console.log(`📋 Syncs en attente:`, Array.from(this.pendingSyncs.keys()));
    }
  }

  // ✅ TESTS AVEC DÉBOUNCING
  public forceTime(hour: number, minute: number = 0): void {
    const oldHour = this.state.gameHour;
    
    this.state.gameHour = hour;
    this.state.isDayTime = this.calculateDayTime(hour);
    
    console.log(`🕐 [TEST] Heure forcée: ${oldHour}h → ${hour}h`);
    
    this.debouncedBroadcastTime();
  }

  public forceWeather(weatherName: string): void {
    const weather = this.getWeatherByName(weatherName);
    
    if (!weather) {
      console.warn(`⚠️ [TimeWeatherService] Météo inconnue: ${weatherName}`);
      return;
    }
    
    this.currentWeather = weather;
    this.state.weather = weather.name;
    
    console.log(`🌦️ [TEST] Météo forcée: ${weatherName}`);
    
    this.debouncedBroadcastWeather();
  }

  public forceSyncAll(): void {
    console.log(`🔄 [TimeWeatherService] SYNC FORCÉE (anti-spam)`);
    
    // ✅ Reset tous les états pour forcer l'envoi
    this.clientZoneInfo.forEach(zoneInfo => {
      zoneInfo.lastTimeState = undefined;
      zoneInfo.lastWeatherState = undefined;
    });
    
    this.sendCurrentStateToAllClients();
  }

  destroy() {
    console.log(`🧹 [TimeWeatherService] Destruction avec nettoyage anti-spam...`);
    
    // ✅ Nettoyer tous les timers de débouncing
    this.pendingSyncs.forEach(pending => {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
    });
    this.pendingSyncs.clear();
    
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
    this.clientZoneInfo.clear();
    
    console.log(`✅ [TimeWeatherService] Service détruit (anti-spam)`);
  }
}
