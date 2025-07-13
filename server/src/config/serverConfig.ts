import fs from "fs";
import path from "path";

export interface WeatherType {
  name: string;
  displayName: string;
  probability: number;
  effects: {
    encounterRateModifier: number;
    xpModifier: number;
  };
}

export interface EncounterSystemConfig {
  enabled: boolean;
  serverSideOnly: boolean;
  playerCooldownMs: number;
  maxEncountersPerMinute: number;
  stepsPerEncounterCheck: number;
  minStepDistance: number;
  baseRates: {
    grass: number;
    fishing: number;
    surfing: number;
  };
  antiFarming: {
    enabled: boolean;
    maxEncountersPerHour: number;
    afkDetectionTimeoutMs: number;
  };
}
export interface TimeSystemConfig {
  enabled: boolean;
  startHour: number;
  timeIntervalMs: number;
  dayStartHour: number;
  nightStartHour: number;
}

export interface WeatherSystemConfig {
  enabled: boolean;
  changeIntervalMs: number;
  weatherTypes: WeatherType[];
}

export interface ServerConfig {
  xpRate: number;
  lootRate: number;
  captureRate: number;
  shinyRate: number;
  moneyRate: number;

  playerMoveSpeed: number;
  mountMoveSpeed: number;
  npcMoveSpeed: number;
  encounterStepRate: number;

  maxPlayersPerRoom: number;
  allowPVP: boolean;
  onJoinSpawnLastPlace: boolean;

  eventXpBonusActive: boolean;
  eventCaptureBonusActive: boolean;
  maintenanceMode: boolean;

  maxTeamSize: number;
  starterList: number[];
  starterLevel: number;

  chatEnabled: boolean;
  chatCooldown: number;

  autoresetQuest?: boolean;

  // ✅ SYSTÈMES TEMPS ET MÉTÉO
  timeSystem: TimeSystemConfig;
  weatherSystem: WeatherSystemConfig;

  encounterSystem: EncounterSystemConfig;
}

// La config lue en mémoire (unique, pour tout le serveur)
let serverConfig: ServerConfig;

export function loadServerConfig(): ServerConfig {
  const configPath = path.join(__dirname, "./serverConfig.json");
  const raw = fs.readFileSync(configPath, "utf-8");
  serverConfig = JSON.parse(raw);
  
  console.log(`✅ [ServerConfig] Configuration chargée:`);
  console.log(`  - Système temps: ${serverConfig.timeSystem.enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
  console.log(`  - Système météo: ${serverConfig.weatherSystem.enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
  console.log(`  - Types météo: ${serverConfig.weatherSystem.weatherTypes.map(w => w.name).join(', ')}`);
  
  return serverConfig;
}

export function getServerConfig(): ServerConfig {
  if (!serverConfig) {
    loadServerConfig();
  }
  return serverConfig;
}

export function reloadServerConfig(): void {
  loadServerConfig();
  console.log("✅ Config serveur rechargée !");
}

// ✅ HELPER: Obtenir un type de météo aléatoire basé sur les probabilités
export function getRandomWeatherType(): WeatherType {
  const config = getServerConfig();
  const weatherTypes = config.weatherSystem.weatherTypes;
  
  const totalProbability = weatherTypes.reduce((sum, weather) => sum + weather.probability, 0);
  const random = Math.random() * totalProbability;
  
  let currentProbability = 0;
  for (const weather of weatherTypes) {
    currentProbability += weather.probability;
    if (random <= currentProbability) {
      return weather;
    }
  }
  
  // Fallback vers le premier type si aucun n'est trouvé
  return weatherTypes[0];
}
