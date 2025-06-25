// server/src/services/TimeWeatherService.ts - VERSION AVEC SUPPORT ENVIRONNEMENTS
import { getServerConfig, getRandomWeatherType, WeatherType } from "../config/serverConfig";
import { PokeWorldState } from "../schema/PokeWorldState";
import { serverZoneEnvironmentManager } from "../config/zoneEnvironments";

interface ClientZoneInfo {
  sessionId: string;
  currentZone: string;
  environment: 'outdoor' | 'indoor' | 'cave';
  lastUpdate: number;
}

export class TimeWeatherService {
  private state: PokeWorldState;
  private timeClockId: any;
  private weatherClockId: any;
  private currentWeather: WeatherType;
  private onWeatherChangeCallback?: (weather: WeatherType) => void;
  private onTimeChangeCallback?: (hour: number, isDayTime: boolean) => void;
  
  // ✅ NOUVEAU: Système de synchronisation garantie avec environnements
  private connectedClients: Set<any> = new Set();
  private clientZoneInfo: Map<string, ClientZoneInfo> = new Map();
  private syncClockId: any;
  private lastSyncTime: number = 0;

  constructor(state: PokeWorldState, clockService: any) {
    this.state = state;
    this.setupInitialState();
    this.startSystems(clockService);
    this.startSyncSystem(clockService);
    this.validateEnvironmentConfiguration();
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

  private validateEnvironmentConfiguration() {
    const validation = serverZoneEnvironmentManager.validateAllZones();
    if (!validation.valid) {
      console.warn(`⚠️ [TimeWeatherService] Problèmes configuration environnements:`, validation.issues);
    } else {
      console.log(`✅ [TimeWeatherService] Configuration environnements validée`);
    }
    
    // Log des environnements
    const grouped = serverZoneEnvironmentManager.getAllZonesByEnvironment();
    console.log(`📊 [TimeWeatherService] Zones par environnement:`);
    Object.entries(grouped).forEach(([env, zones]) => {
      console.log(`  ${env.toUpperCase()}: ${zones.length} zones`);
    });
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

  // ✅ NOUVEAU: Système de synchronisation périodique avec environnements
  private startSyncSystem(clockService: any) {
    // ✅ Envoyer l'état selon l'environnement toutes les 30 secondes
    this.syncClockId = clockService.setInterval(() => {
      this.broadcastCurrentStateByEnvironment();
    }, 30000); // 30 secondes
    
    console.log(`✅ [TimeWeatherService] Système de sync environnementale démarré (30s)`);
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
    
    // ✅ BROADCAST INTELLIGENT selon l'environnement
    this.broadcastTimeUpdateByEnvironment();
  }

  private updateWeather() {
    const oldWeather = this.currentWeather;
    this.currentWeather = getRandomWeatherType();
    this.state.weather = this.currentWeather.name;
    
    console.log(`🌤️ [TimeWeatherService] Météo: ${oldWeather.displayName} → ${this.currentWeather.displayName}`);
    
    // ✅ BROADCAST INTELLIGENT selon l'environnement
    this.broadcastWeatherUpdateByEnvironment();
  }

  private calculateDayTime(hour: number): boolean {
    const config = getServerConfig();
    return hour >= config.timeSystem.dayStartHour && hour < config.timeSystem.nightStartHour;
  }

  private getWeatherByName(name: string): WeatherType | undefined {
    const config = getServerConfig();
    return config.weatherSystem.weatherTypes.find(w => w.name === name);
  }

  // ✅ NOUVEAUX MÉTHODES DE BROADCAST INTELLIGENT

  private broadcastTimeUpdateByEnvironment() {
    const timeData = {
      gameHour: this.state.gameHour,
      isDayTime: this.state.isDayTime,
      displayTime: this.formatTime(),
      timestamp: Date.now()
    };
    
    let outdoorClients = 0;
    let indoorClients = 0;
    let caveClients = 0;
    
    // ✅ Broadcast différencié selon l'environnement du client
    this.connectedClients.forEach(client => {
      const zoneInfo = this.clientZoneInfo.get(client.sessionId);
      
      if (!zoneInfo) {
        // Client sans info de zone - envoyer quand même
        client.send("timeUpdate", timeData);
        return;
      }
      
      const shouldReceiveUpdate = serverZoneEnvironmentManager.isAffectedByDayNight(zoneInfo.currentZone);
      
      if (shouldReceiveUpdate) {
        // ✅ Client dans une zone affectée par le jour/nuit
        client.send("timeUpdate", {
          ...timeData,
          environment: zoneInfo.environment,
          zone: zoneInfo.currentZone,
          affectedByDayNight: true
        });
        
        if (zoneInfo.environment === 'outdoor') outdoorClients++;
        else if (zoneInfo.environment === 'cave') caveClients++;
      } else {
        // ✅ Client dans une zone non affectée (intérieur)
        client.send("timeUpdate", {
          ...timeData,
          environment: zoneInfo.environment,
          zone: zoneInfo.currentZone,
          affectedByDayNight: false,
          message: "Zone intérieure - pas d'effet jour/nuit"
        });
        
        indoorClients++;
      }
    });
    
    console.log(`📡 [TimeWeatherService] Broadcast temps: ${timeData.displayTime} → Outdoor: ${outdoorClients}, Indoor: ${indoorClients}, Cave: ${caveClients}`);
    
    // ✅ Utiliser le callback pour WorldRoom si défini
    if (this.onTimeChangeCallback) {
      this.onTimeChangeCallback(this.state.gameHour, this.state.isDayTime);
    }
    
    this.lastSyncTime = Date.now();
  }

  private broadcastWeatherUpdateByEnvironment() {
    const weatherData = {
      weather: this.currentWeather.name,
      displayName: this.currentWeather.displayName,
      timestamp: Date.now()
    };
    
    let affectedClients = 0;
    let unaffectedClients = 0;
    
    // ✅ Broadcast différencié selon l'environnement du client
    this.connectedClients.forEach(client => {
      const zoneInfo = this.clientZoneInfo.get(client.sessionId);
      
      if (!zoneInfo) {
        // Client sans info de zone - envoyer quand même
        client.send("weatherUpdate", weatherData);
        return;
      }
      
      const shouldReceiveUpdate = serverZoneEnvironmentManager.isAffectedByWeather(zoneInfo.currentZone);
      
      if (shouldReceiveUpdate) {
        // ✅ Client dans une zone affectée par la météo
        client.send("weatherUpdate", {
          ...weatherData,
          environment: zoneInfo.environment,
          zone: zoneInfo.currentZone,
          affectedByWeather: true
        });
        affectedClients++;
      } else {
        // ✅ Client dans une zone non affectée (intérieur/grotte)
        client.send("weatherUpdate", {
          ...weatherData,
          environment: zoneInfo.environment,
          zone: zoneInfo.currentZone,
          affectedByWeather: false,
          message: "Zone protégée - pas d'effet météo"
        });
        unaffectedClients++;
      }
    });
    
    console.log(`📡 [TimeWeatherService] Broadcast météo: ${weatherData.displayName} → Affectés: ${affectedClients}, Protégés: ${unaffectedClients}`);
    
    // ✅ Utiliser le callback pour WorldRoom si défini
    if (this.onWeatherChangeCallback) {
      this.onWeatherChangeCallback(this.currentWeather);
    }
  }

  private broadcastCurrentStateByEnvironment() {
    if (this.connectedClients.size === 0) {
      return; // Pas de clients connectés
    }
    
    console.log(`🔄 [TimeWeatherService] Sync périodique environnementale: ${this.connectedClients.size} clients`);
    
    // ✅ Forcer l'envoi de l'état actuel avec gestion environnementale
    this.broadcastTimeUpdateByEnvironment();
    this.broadcastWeatherUpdateByEnvironment();
  }

  // ✅ NOUVELLES MÉTHODES DE GESTION DES CLIENTS AVEC ENVIRONNEMENTS

  public addClient(client: any, currentZone?: string) {
    this.connectedClients.add(client);
    
    // ✅ Enregistrer les informations de zone du client
    if (currentZone) {
      this.updateClientZone(client, currentZone);
    }
    
    console.log(`👤 [TimeWeatherService] Client ajouté: ${client.sessionId} ${currentZone ? `(zone: ${currentZone})` : ''} (total: ${this.connectedClients.size})`);
    
    // ✅ ENVOYER IMMÉDIATEMENT L'ÉTAT ACTUEL AU NOUVEAU CLIENT
    setTimeout(() => {
      this.sendCurrentStateToClient(client);
    }, 500); // Petit délai pour laisser le client s'initialiser
  }

  public removeClient(client: any) {
    this.connectedClients.delete(client);
    this.clientZoneInfo.delete(client.sessionId);
    console.log(`👋 [TimeWeatherService] Client retiré: ${client.sessionId} (restant: ${this.connectedClients.size})`);
  }

  // ✅ NOUVELLE MÉTHODE: Mettre à jour la zone d'un client
  public updateClientZone(client: any, newZone: string) {
    const environment = serverZoneEnvironmentManager.getZoneConfig(newZone)?.environment || 'outdoor';
    
    const zoneInfo: ClientZoneInfo = {
      sessionId: client.sessionId,
      currentZone: newZone,
      environment: environment,
      lastUpdate: Date.now()
    };
    
    this.clientZoneInfo.set(client.sessionId, zoneInfo);
    
    console.log(`🌍 [TimeWeatherService] Client ${client.sessionId} → zone: ${newZone} (${environment})`);
    
    // ✅ Envoyer immédiatement l'état adapté à la nouvelle zone
    this.sendCurrentStateToClient(client);
  }

  private sendCurrentStateToClient(client: any) {
    const zoneInfo = this.clientZoneInfo.get(client.sessionId);
    const environment = zoneInfo?.environment || 'outdoor';
    const currentZone = zoneInfo?.currentZone || 'unknown';
    
    console.log(`📤 [TimeWeatherService] Envoi état actuel à ${client.sessionId} (${currentZone}, ${environment})`);
    
    // ✅ Envoyer l'état temps selon l'environnement
    const affectedByDayNight = zoneInfo ? serverZoneEnvironmentManager.isAffectedByDayNight(currentZone) : true;
    
    client.send("currentTime", {
      gameHour: this.state.gameHour,
      isDayTime: this.state.isDayTime,
      displayTime: this.formatTime(),
      environment: environment,
      zone: currentZone,
      affectedByDayNight: affectedByDayNight,
      timestamp: Date.now()
    });
    
    // ✅ Envoyer l'état météo selon l'environnement
    const affectedByWeather = zoneInfo ? serverZoneEnvironmentManager.isAffectedByWeather(currentZone) : true;
    
    client.send("currentWeather", {
      weather: this.currentWeather.name,
      displayName: this.currentWeather.displayName,
      environment: environment,
      zone: currentZone,
      affectedByWeather: affectedByWeather,
      timestamp: Date.now()
    });
    
    if (!affectedByDayNight && !affectedByWeather) {
      console.log(`🏠 [TimeWeatherService] Client ${client.sessionId} en zone protégée - effets désactivés`);
    } else {
      console.log(`✅ [TimeWeatherService] État envoyé: ${this.formatTime()}, ${this.currentWeather.displayName} (zone: ${currentZone})`);
    }
  }

  // ✅ API PUBLIQUE - AMÉLIORÉE AVEC ENVIRONNEMENTS
  
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

  // ✅ MÉTHODE AMÉLIORÉE: Retourne les conditions selon la zone
  getEncounterConditions(zoneName?: string): { timeOfDay: 'day' | 'night', weather: 'clear' | 'rain' } {
    let effectiveTimeOfDay: 'day' | 'night' = this.state.isDayTime ? 'day' : 'night';
    let effectiveWeather: 'clear' | 'rain' = this.currentWeather.name === 'rain' ? 'rain' : 'clear';
    
    // ✅ Modifier selon l'environnement de la zone
    if (zoneName) {
      const affectedByDayNight = serverZoneEnvironmentManager.isAffectedByDayNight(zoneName);
      const affectedByWeather = serverZoneEnvironmentManager.isAffectedByWeather(zoneName);
      
      if (!affectedByDayNight) {
        // Zone intérieure ou grotte - toujours "jour artificiel"
        effectiveTimeOfDay = 'day';
      }
      
      if (!affectedByWeather) {
        // Zone protégée - toujours temps clair
        effectiveWeather = 'clear';
      }
    }
    
    return {
      timeOfDay: effectiveTimeOfDay,
      weather: effectiveWeather
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

  // ✅ NOUVELLES MÉTHODES DE GESTION MANUELLE AVEC ENVIRONNEMENTS

  public sendCurrentStateToAllClients() {
    console.log(`📡 [TimeWeatherService] Force envoi état à tous les clients (${this.connectedClients.size})`);
    
    this.connectedClients.forEach(client => {
      this.sendCurrentStateToClient(client);
    });
  }

  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // ✅ NOUVELLE MÉTHODE: Statistiques par environnement
  public getClientEnvironmentStats(): { outdoor: number; indoor: number; cave: number; unknown: number } {
    const stats = { outdoor: 0, indoor: 0, cave: 0, unknown: 0 };
    
    this.clientZoneInfo.forEach(zoneInfo => {
      if (stats[zoneInfo.environment] !== undefined) {
        stats[zoneInfo.environment]++;
      } else {
        stats.unknown++;
      }
    });
    
    return stats;
  }

  public debugSyncStatus() {
    console.log(`🔍 [TimeWeatherService] === ÉTAT DE SYNCHRONISATION ENVIRONNEMENTALE ===`);
    console.log(`👥 Clients connectés: ${this.connectedClients.size}`);
    console.log(`🕐 Heure actuelle: ${this.formatTime()} (${this.state.gameHour}h)`);
    console.log(`🌤️ Météo actuelle: ${this.currentWeather.displayName}`);
    console.log(`⏰ Dernière sync: ${this.lastSyncTime ? new Date(this.lastSyncTime).toLocaleTimeString() : 'jamais'}`);
    console.log(`📡 Système temps actif: ${!!this.timeClockId}`);
    console.log(`🌦️ Système météo actif: ${!!this.weatherClockId}`);
    console.log(`🔄 Système sync actif: ${!!this.syncClockId}`);
    
    // ✅ Statistiques par environnement
    const envStats = this.getClientEnvironmentStats();
    console.log(`🌍 Répartition par environnement:`, envStats);
    
    // ✅ Lister les clients avec leurs zones
    if (this.clientZoneInfo.size > 0) {
      console.log(`👤 Clients par zone:`);
      this.clientZoneInfo.forEach((zoneInfo, sessionId) => {
        const affectedByDayNight = serverZoneEnvironmentManager.isAffectedByDayNight(zoneInfo.currentZone);
        const affectedByWeather = serverZoneEnvironmentManager.isAffectedByWeather(zoneInfo.currentZone);
        console.log(`  ${sessionId}: ${zoneInfo.currentZone} (${zoneInfo.environment}) - Temps: ${affectedByDayNight}, Météo: ${affectedByWeather}`);
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
    
    // ✅ BROADCAST IMMÉDIAT avec gestion environnementale
    this.broadcastTimeUpdateByEnvironment();
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
    
    // ✅ BROADCAST IMMÉDIAT avec gestion environnementale
    this.broadcastWeatherUpdateByEnvironment();
  }

  // ✅ MÉTHODE DE SYNCHRONISATION FORCÉE

  public forceSyncAll(): void {
    console.log(`🔄 [TimeWeatherService] SYNCHRONISATION FORCÉE DE TOUS LES CLIENTS`);
    
    if (this.connectedClients.size === 0) {
      console.log(`ℹ️ [TimeWeatherService] Aucun client à synchroniser`);
      return;
    }
    
    this.broadcastCurrentStateByEnvironment();
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
    
    // ✅ Vérifications spécifiques aux environnements
    const envValidation = serverZoneEnvironmentManager.validateAllZones();
    if (!envValidation.valid) {
      issues.push(...envValidation.issues);
    }
    
    return {
      healthy: issues.length === 0,
      issues: issues
    };
  }

  // ✅ NOUVELLES MÉTHODES POUR LES ENVIRONNEMENTS

  public getZoneEnvironmentInfo(zoneName: string): any {
    return {
      environment: serverZoneEnvironmentManager.getZoneConfig(zoneName)?.environment || 'unknown',
      affectedByDayNight: serverZoneEnvironmentManager.isAffectedByDayNight(zoneName),
      affectedByWeather: serverZoneEnvironmentManager.isAffectedByWeather(zoneName),
      baseIllumination: serverZoneEnvironmentManager.getBaseIllumination(zoneName),
      effectiveIllumination: serverZoneEnvironmentManager.calculateEffectiveIllumination(
        zoneName, 
        this.state.isDayTime, 
        this.getWeatherEffect('encounterRateModifier')
      )
    };
  }

  public getClientEnvironmentData(): Record<string, string> {
    return serverZoneEnvironmentManager.getClientEnvironmentData();
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
    this.clientZoneInfo.clear();
    
    console.log(`✅ [TimeWeatherService] Service détruit`);
  }
}
