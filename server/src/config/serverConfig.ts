// =======================================
// serverConfig.ts - Configuration serveur
// =======================================

/**
 * Structure des paramètres globaux du serveur
 */
export interface ServerConfig {
  // ---- Progression & Combat ----
  /** Multiplicateur de gain d'expérience (XP) */
  xpRate: number;
  /** Multiplicateur de taux de loot (objets, drops) */
  lootRate: number;
  /** Multiplicateur de chance de capture */
  captureRate: number;
  /** Probabilité de rencontre shiny (ex: 1/4096 ≈ 0.000244) */
  shinyRate: number;
  /** Multiplicateur sur les gains d'argent */
  moneyRate: number;

  // ---- Mouvement & Monde ----
  /** Vitesse de déplacement du joueur (pixels/seconde) */
  playerMoveSpeed: number;
  /** Vitesse de déplacement sur monture/vélo/surf */
  mountMoveSpeed: number;
  /** Vitesse de déplacement des NPCs mobiles */
  npcMoveSpeed: number;
  /** Nombre de pas pour déclencher une rencontre sauvage */
  encounterStepRate: number;

  // ---- Technique / Serveur ----
  /** Nombre maximum de joueurs simultanés par map/instance */
  maxPlayersPerRoom: number;
  /** Activer le PvP globalement */
  allowPVP: boolean;
  /** Le joueur réapparaît à sa dernière position connue */
  onJoinSpawnLastPlace: boolean;

  // ---- Événements & Maintenance ----
  /** Activer un bonus XP temporaire (événement) */
  eventXpBonusActive: boolean;
  /** Activer un bonus de capture temporaire (événement) */
  eventCaptureBonusActive: boolean;
  /** Mode maintenance: bloque la connexion des joueurs */
  maintenanceMode: boolean;

  // ---- Règles du jeu ----
  /** Nombre maximum de Pokémon dans l'équipe */
  maxTeamSize: number;
  /** Liste des IDs de starters autorisés */
  starterList: number[];
  /** Niveau de départ du starter */
  starterLevel: number;

  // ---- Communication ----
  /** Activer/désactiver le chat */
  chatEnabled: boolean;
  /** Délai minimum (en secondes) entre deux messages */
  chatCooldown: number;
}

/**
 * Configuration par défaut du serveur (modifiable)
 */
export const serverConfig: ServerConfig = {
  // Progression & Combat
  xpRate: 2,
  lootRate: 1.5,
  captureRate: 1.2,
  shinyRate: 0.000244, // 1/4096
  moneyRate: 1.0,

  // Mouvement & Monde
  playerMoveSpeed: 120, // px/sec
  mountMoveSpeed: 180,  // px/sec
  npcMoveSpeed: 100,    // px/sec
  encounterStepRate: 30,

  // Technique / Serveur
  maxPlayersPerRoom: 100,
  allowPVP: true,
  onJoinSpawnLastPlace: true,

  // Événements & Maintenance
  eventXpBonusActive: false,
  eventCaptureBonusActive: false,
  maintenanceMode: false,

  // Règles du jeu
  maxTeamSize: 6,
  starterList: [1, 4, 7], // Bulbizarre, Salamèche, Carapuce
  starterLevel: 5,

  // Communication
  chatEnabled: true,
  chatCooldown: 2,
};
