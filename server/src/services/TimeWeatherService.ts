// server/src/services/TimeWeatherService.ts
import { getServerConfig, getRandomWeatherType, WeatherType } from "../config/serverConfig";
import { PokeWorldState } from "../schema/PokeWorldState";

export class TimeWeatherService {
  private state: PokeWorldState;
  private timeClockId: any;
  private weatherClockId: any;
  private currentWeather: WeatherType;
  private onWeatherChangeCallback?: (weather: WeatherType) => void;
  private onTimeChangeCallback?: (hour: number, isDayTime: boolean) => void;

  constructor(state: PokeWorldState, clockService: any) {
    this.state = state;
    this.setupInitialState();
    this.startSystems(clockService);
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

  private updateTime() {
    const config = getServerConfig();
    const oldHour = this.state.gameHour;
    const oldDayTime = this.state.isDayTime;
    
    this.state.gameHour = (this.state.gameHour + 1) % 24;
    this.state.isDayTime = this.calculateDayTime(this.state.gameHour);
    
    if (oldDayTime !== this.state.isDayTime) {
      console.log(`🌅 [TimeWeatherService] Transition: ${oldDayTime ? 'JOUR' : 'NUIT'} → ${this.state.isDayTime ? 'JOUR' : 'NUIT'} (${this.state.gameHour}h)`);
    }
    
    this.onTimeChangeCallback?.(this.state.gameHour, this.state.isDayTime);
  }

  private updateWeather() {
    const oldWeather = this.currentWeather;
    this.currentWeather = getRandomWeatherType();
    this.state.weather = this.currentWeather.name;
    
    console.log(`🌤️ [TimeWeatherService] Météo: ${oldWeather.displayName} → ${this.currentWeather.displayName}`);
    
    this.onWeatherChangeCallback?.(this.currentWeather);
  }

  private calculateDayTime(hour: number): boolean {
    const config = getServerConfig();
    return hour >= config.timeSystem.dayStartHour && hour < config.timeSystem.nightStartHour;
  }

  private getWeatherByName(name: string): WeatherType | undefined {
    const config = getServerConfig();
    return config.weatherSystem.weatherTypes.find(w => w.name === name);
  }

  // ✅ API PUBLIQUE
  
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
  // Dans TimeWeatherService.ts, change cette méthode :
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

  // ✅ MÉTHODES DE TEST

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
    
    // Déclencher le callback immédiatement
    if (this.onTimeChangeCallback) {
      this.onTimeChangeCallback(hour, this.state.isDayTime);
    }
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
    
    // Déclencher le callback immédiatement
    if (this.onWeatherChangeCallback) {
      this.onWeatherChangeCallback(weather);
    }
  }

  destroy() {
    if (this.timeClockId) {
      this.timeClockId.clear();
    }
    if (this.weatherClockId) {
      this.weatherClockId.clear();
    }
    console.log(`🧹 [TimeWeatherService] Service détruit`);
  }
}