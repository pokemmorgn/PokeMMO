import fs from "fs";
import path from "path";

// Reprends ici la même interface que tes besoins
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
}

// La config lue en mémoire (unique, pour tout le serveur)
let serverConfig: ServerConfig;

export function loadServerConfig(): ServerConfig {
  // ⚠️ Adapte le chemin si besoin selon ta structure
  const configPath = path.join(__dirname, "./serverConfig.json");
  const raw = fs.readFileSync(configPath, "utf-8");
  serverConfig = JSON.parse(raw);
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
