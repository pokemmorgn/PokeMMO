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
    
    // ✅ État initial météo (commence toujours par ciel dégagé)
    this.currentWeather = this.getWeatherByName("clear") || config.weatherSystem.weatherTypes[0];
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
// === MÉTHODES DE TEST === (ajoute ça dans la classe)

public forceTime(hour: number, minute: number = 0): void {
  this.gameTime.hour = hour;
  this.gameTime.minute = minute;
  
  const isDayTime = this.isDayTime();
  console.log(`🕐 [TEST] Heure forcée: ${hour}:${minute} (${isDayTime ? 'JOUR' : 'NUIT'})`);
  
  if (this.timeChangeCallback) {
    this.timeChangeCallback(hour, isDayTime);
  }
  this.updateGameState();
}

public forceWeather(weatherName: string): void {
  const weather = this.weatherTypes.find(w => w.name === weatherName);
  if (!weather) return;
  
  this.currentWeather = weather;
  console.log(`🌦️ [TEST] Météo forcée: ${weatherName}`);
  
  if (this.weatherChangeCallback) {
    this.weatherChangeCallback(weather);
  }
  this.updateGameState();
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

  // ✅ MÉTHODE SIMPLIFIÉE: Conditions pour les rencontres
  getEncounterConditions(): { timeOfDay: 'day' | 'night', weather: 'clear' | 'rain' } {
    return {
      timeOfDay: this.state.isDayTime ? 'day' : 'night',
      weather: this.currentWeather.name as 'clear' | 'rain'
    };
  }

  formatTime(): string {
    const period = this.state.gameHour < 12 ? 'AM' : 'PM';
    const displayHour = this.state.gameHour === 0 ? 12 : this.state.gameHour > 12 ? this.state.gameHour - 12 : this.state.gameHour;
    return `${displayHour}:00 ${period}`;
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