// server/src/Intelligence/Core/ActionTypes.ts

/**
 * 🎮 SYSTÈME DE TYPES D'ACTIONS - FONDATION DU TRACKING INTELLIGENT
 * 
 * Ce fichier définit TOUS les types d'actions possibles dans le MMO Pokémon.
 * Chaque action du joueur sera catégorisée et trackée selon ces types.
 * 
 * ORDRE CRITIQUE : Ce fichier DOIT être créé EN PREMIER !
 * Tout le système d'IA dépend de ces définitions.
 */

// ===================================================================
// 🏷️ CATÉGORIES PRINCIPALES D'ACTIONS
// ===================================================================

export enum ActionCategory {
  // Core gameplay
  POKEMON = "pokemon",           // Capture, release, évolution
  COMBAT = "combat",             // Combats PvE et PvP
  MOVEMENT = "movement",         // Déplacements sur la carte
  EXPLORATION = "exploration",   // Découverte de zones, objets
  
  // Systèmes de jeu
  INVENTORY = "inventory",       // Gestion objets et équipement
  QUEST = "quest",              // Système de quêtes
  SOCIAL = "social",            // Interactions avec autres joueurs
  ECONOMY = "economy",          // Trading, achat/vente
  
  // Interface et UX
  UI = "ui",                    // Interactions interface
  SETTINGS = "settings",        // Changements configuration
  
  // Meta-gameplay
  SESSION = "session",          // Connexion, déconnexion
  ACHIEVEMENT = "achievement",  // Succès et accomplissements
  ERROR = "error"              // Erreurs et bugs
}

// ===================================================================
// 🎯 TYPES D'ACTIONS DÉTAILLÉS PAR CATÉGORIE
// ===================================================================

export enum ActionType {
  // 🐾 POKÉMON ACTIONS
  POKEMON_ENCOUNTER = "pokemon_encounter",         // Rencontre Pokémon sauvage
  POKEMON_CAPTURE_ATTEMPT = "pokemon_capture_attempt", // Tentative de capture
  POKEMON_CAPTURE_SUCCESS = "pokemon_capture_success", // Capture réussie
  POKEMON_CAPTURE_FAILURE = "pokemon_capture_failure", // Capture ratée
  POKEMON_FLEE = "pokemon_flee",                   // Pokémon s'enfuit
  POKEMON_RELEASE = "pokemon_release",             // Libérer un Pokémon
  POKEMON_EVOLVE = "pokemon_evolve",               // Évolution
  POKEMON_NICKNAME = "pokemon_nickname",           // Changer surnom
  POKEMON_SWITCH_TEAM = "pokemon_switch_team",     // Changer équipe active
  
  // ⚔️ COMBAT ACTIONS
  BATTLE_START = "battle_start",                   // Début combat
  BATTLE_END = "battle_end",                       // Fin combat
  BATTLE_ATTACK = "battle_attack",                 // Attaque lancée
  BATTLE_ITEM_USE = "battle_item_use",            // Utilisation objet en combat
  BATTLE_POKEMON_SWITCH = "battle_pokemon_switch", // Changement Pokémon actif
  BATTLE_RUN_ATTEMPT = "battle_run_attempt",       // Tentative de fuite
  BATTLE_VICTORY = "battle_victory",               // Victoire
  BATTLE_DEFEAT = "battle_defeat",                 // Défaite
  BATTLE_DRAW = "battle_draw",                     // Match nul
  
  // 🚶 MOVEMENT ACTIONS  
  PLAYER_MOVE = "player_move",                     // Mouvement joueur
  MAP_CHANGE = "map_change",                       // Changement de carte
  TELEPORT = "teleport",                          // Téléportation
  STUCK_DETECTION = "stuck_detection",             // Joueur bloqué détecté
  
  // 🗺️ EXPLORATION ACTIONS
  ZONE_DISCOVER = "zone_discover",                 // Découverte nouvelle zone
  OBJECT_INTERACT = "object_interact",             // Interaction avec objet
  OBJECT_COLLECT = "object_collect",               // Collecte d'objet
  HIDDEN_ITEM_FIND = "hidden_item_find",          // Trouvaille objet caché
  NPC_TALK = "npc_talk",                          // Dialogue avec NPC
  
  // 🎒 INVENTORY ACTIONS
  ITEM_USE = "item_use",                          // Utilisation objet
  ITEM_DROP = "item_drop",                        // Jeter objet
  ITEM_SORT = "item_sort",                        // Trier inventaire
  ITEM_COMBINE = "item_combine",                  // Combiner objets
  
  // 📋 QUEST ACTIONS
  QUEST_ACCEPT = "quest_accept",                  // Accepter quête
  QUEST_ABANDON = "quest_abandon",                // Abandonner quête
  QUEST_PROGRESS = "quest_progress",              // Progression quête
  QUEST_COMPLETE = "quest_complete",              // Terminer quête
  QUEST_TURN_IN = "quest_turn_in",               // Rendre quête
  
  // 👥 SOCIAL ACTIONS
  PLAYER_MESSAGE = "player_message",              // Message à autre joueur
  FRIEND_ADD = "friend_add",                      // Ajout ami
  FRIEND_REMOVE = "friend_remove",                // Suppression ami
  GUILD_JOIN = "guild_join",                      // Rejoindre guilde
  GUILD_LEAVE = "guild_leave",                    // Quitter guilde
  TRADE_INITIATE = "trade_initiate",              // Initier échange
  TRADE_COMPLETE = "trade_complete",              // Finaliser échange
  
  // 💰 ECONOMY ACTIONS
  SHOP_BROWSE = "shop_browse",                    // Parcourir boutique
  ITEM_BUY = "item_buy",                         // Achat objet
  ITEM_SELL = "item_sell",                       // Vente objet
  GOLD_EARN = "gold_earn",                       // Gain d'or
  GOLD_SPEND = "gold_spend",                     // Dépense d'or
  
  // 🖥️ UI ACTIONS
  MENU_OPEN = "menu_open",                       // Ouverture menu
  MENU_CLOSE = "menu_close",                     // Fermeture menu
  PANEL_SWITCH = "panel_switch",                 // Changement panneau UI
  BUTTON_CLICK = "button_click",                 // Clic bouton
  HOTKEY_USE = "hotkey_use",                     // Utilisation raccourci
  
  // ⚙️ SETTINGS ACTIONS
  SETTING_CHANGE = "setting_change",             // Changement paramètre
  LANGUAGE_CHANGE = "language_change",           // Changement langue
  SOUND_TOGGLE = "sound_toggle",                 // Son on/off
  
  // 📱 SESSION ACTIONS
  LOGIN = "login",                               // Connexion
  LOGOUT = "logout",                             // Déconnexion
  SESSION_START = "session_start",               // Début session
  SESSION_END = "session_end",                   // Fin session
  AFK_START = "afk_start",                      // Début AFK
  AFK_END = "afk_end",                          // Fin AFK
  
  // 🏆 ACHIEVEMENT ACTIONS
  ACHIEVEMENT_UNLOCK = "achievement_unlock",      // Déblocage succès
  MILESTONE_REACH = "milestone_reach",           // Atteinte palier
  LEVEL_UP = "level_up",                        // Montée de niveau
  
  // NPC
  NPC_INTERACTION = 'npc_interaction',          // Interaction avec NPC
  
  // ❌ ERROR ACTIONS
  ERROR_OCCURRED = "error_occurred",             // Erreur rencontrée
  BUG_REPORT = "bug_report",                    // Rapport de bug
  CRASH_DETECTED = "crash_detected"             // Crash détecté
}

// ===================================================================
// 📊 DONNÉES SPÉCIFIQUES PAR TYPE D'ACTION
// ===================================================================

/**
 * Interface de base pour toutes les actions
 */
export interface BaseActionData {
  timestamp: number;           // Timestamp en millisecondes
  sessionId: string;          // ID de session
  playerId: string;           // ID du joueur
  playerName: string;         // Nom du joueur
  location: {                 // Position actuelle
    map: string;
    x: number;
    y: number;
  };
  context?: {                 // Contexte additionnel optionnel
    friendsOnline?: string[];
    weather?: string;
    timeOfDay?: string;
    playerLevel?: number;
    sessionDuration?: number;  // Durée session actuelle en ms
  };
}

/**
 * Données spécifiques aux actions Pokémon
 */
export interface PokemonActionData extends BaseActionData {
  pokemon?: {
    species: string;
    level: number;
    isShiny?: boolean;
    ivs?: number[];           // Individual Values
    nature?: string;
  };
  pokeball?: string;          // Type de Pokéball utilisée
  success?: boolean;          // Réussite/échec
  attempts?: number;          // Nombre de tentatives
  reason?: string;           // Raison d'échec
}

/**
 * Données spécifiques aux actions de combat
 */
export interface CombatActionData extends BaseActionData {
  battleType: 'wild' | 'trainer' | 'pvp' | 'gym';
  opponent?: string;          // Nom adversaire ou type
  playerTeam: string[];       // Équipe du joueur
  opponentTeam?: string[];    // Équipe adversaire
  move?: string;             // Attaque utilisée
  damage?: number;           // Dégâts infligés
  effectiveness?: number;     // Efficacité attaque
  result?: 'victory' | 'defeat' | 'draw' | 'ongoing';
  duration?: number;         // Durée combat en ms
  turnsCount?: number;       // Nombre de tours
}

/**
 * Données spécifiques aux actions de mouvement
 */
export interface MovementActionData extends BaseActionData {
  fromLocation: {
    map: string;
    x: number;
    y: number;
  };
  toLocation: {
    map: string;
    x: number;
    y: number;
  };
  distance?: number;         // Distance parcourue
  speed?: number;           // Vitesse de déplacement
  method?: 'walk' | 'run' | 'bike' | 'surf' | 'teleport';
}

/**
 * Données spécifiques aux actions d'inventaire
 */
export interface InventoryActionData extends BaseActionData {
  itemId: string;           // ID de l'objet
  itemName: string;         // Nom de l'objet
  quantity: number;         // Quantité
  category?: string;        // Catégorie d'objet
  target?: string;         // Cible (Pokémon, etc.)
  effect?: string;         // Effet de l'utilisation
}

/**
 * Données spécifiques aux actions de quête
 */
export interface QuestActionData extends BaseActionData {
  questId: string;          // ID de la quête
  questName: string;        // Nom de la quête
  questType?: string;       // Type de quête
  progress?: number;        // Progression (0-100)
  reward?: {               // Récompenses
    gold?: number;
    items?: { id: string; quantity: number }[];
    experience?: number;
  };
  npcId?: string;          // NPC donneur de quête
}

/**
 * Données spécifiques aux actions sociales
 */
export interface SocialActionData extends BaseActionData {
  targetPlayer?: string;    // Joueur cible
  message?: string;        // Message envoyé
  channelType?: 'whisper' | 'local' | 'guild' | 'global';
  guildId?: string;        // ID guilde
  tradeItems?: {           // Objets échangés
    offered: { id: string; quantity: number }[];
    received: { id: string; quantity: number }[];
  };
}

/**
 * Données spécifiques aux actions d'économie
 */
export interface EconomyActionData extends BaseActionData {
  itemId?: string;         // ID objet acheté/vendu
  quantity?: number;       // Quantité
  price?: number;          // Prix unitaire
  totalCost?: number;      // Coût total
  goldBefore?: number;     // Or avant transaction
  goldAfter?: number;      // Or après transaction
  shopId?: string;         // ID du marchand
}

/**
 * Union type pour toutes les données d'action possibles
 */
export type ActionData = 
  | BaseActionData 
  | PokemonActionData 
  | CombatActionData 
  | MovementActionData 
  | InventoryActionData 
  | QuestActionData 
  | SocialActionData 
  | EconomyActionData;

// ===================================================================
// 🎯 INTERFACE PRINCIPALE D'ACTION
// ===================================================================

/**
 * Structure principale d'une action trackée
 */
export interface PlayerAction {
  id: string;                    // UUID unique
  playerId: string;             // ID du joueur
  actionType: ActionType;       // Type d'action (énumération)
  category: ActionCategory;     // Catégorie principale
  timestamp: number;            // Timestamp Unix en ms
  data: ActionData;            // Données spécifiques à l'action
  metadata?: {                 // Métadonnées optionnelles
    version: string;           // Version du système de tracking
    source: string;           // Source de l'action (client, server)
    processed: boolean;       // Action analysée par l'IA
    tags?: string[];         // Tags additionnels
  };
}

// ===================================================================
// 🔧 HELPERS ET UTILITAIRES
// ===================================================================

/**
 * Vérifie si une action appartient à une catégorie
 */
export function isActionOfCategory(action: PlayerAction, category: ActionCategory): boolean {
  return action.category === category;
}

/**
 * Récupère la catégorie d'un type d'action
 */
export function getCategoryForActionType(actionType: ActionType): ActionCategory {
  // Mapping automatique basé sur le préfixe du nom
  if (actionType.startsWith('pokemon_')) return ActionCategory.POKEMON;
  if (actionType.startsWith('battle_')) return ActionCategory.COMBAT;
  if (actionType.startsWith('player_move') || actionType.startsWith('map_') || actionType === 'teleport') return ActionCategory.MOVEMENT;
  if (actionType.startsWith('zone_') || actionType.startsWith('object_') || actionType.startsWith('hidden_') || actionType === 'npc_talk') return ActionCategory.EXPLORATION;
  if (actionType.startsWith('item_')) return ActionCategory.INVENTORY;
  if (actionType.startsWith('quest_')) return ActionCategory.QUEST;
  if (actionType.startsWith('player_message') || actionType.startsWith('friend_') || actionType.startsWith('guild_') || actionType.startsWith('trade_')) return ActionCategory.SOCIAL;
  if (actionType.startsWith('shop_') || actionType.startsWith('gold_') || actionType === 'item_buy' || actionType === 'item_sell') return ActionCategory.ECONOMY;
  if (actionType.startsWith('menu_') || actionType.startsWith('panel_') || actionType.startsWith('button_') || actionType.startsWith('hotkey_')) return ActionCategory.UI;
  if (actionType.startsWith('setting_') || actionType.startsWith('language_') || actionType.startsWith('sound_')) return ActionCategory.SETTINGS;
  if (actionType.includes('login') || actionType.includes('logout') || actionType.includes('session') || actionType.includes('afk')) return ActionCategory.SESSION;
  if (actionType.startsWith('achievement_') || actionType.includes('level_up') || actionType.includes('milestone')) return ActionCategory.ACHIEVEMENT;
  if (actionType.includes('error') || actionType.includes('bug') || actionType.includes('crash')) return ActionCategory.ERROR;
  
  return ActionCategory.UI; // Fallback
}

/**
 * Crée une action de base avec timestamp et métadonnées
 */
export function createBaseAction(
  playerId: string,
  playerName: string,
  actionType: ActionType,
  location: { map: string; x: number; y: number },
  sessionId: string
): Omit<PlayerAction, 'id' | 'data'> {
  return {
    playerId,
    actionType,
    category: getCategoryForActionType(actionType),
    timestamp: Date.now(),
    metadata: {
      version: '1.0.0',
      source: 'server',
      processed: false,
      tags: []
    }
  };
}

/**
 * Types d'actions critiques qui nécessitent une analyse immédiate
 */
export const CRITICAL_ACTIONS: ActionType[] = [
  ActionType.POKEMON_CAPTURE_FAILURE,
  ActionType.BATTLE_DEFEAT,
  ActionType.ERROR_OCCURRED,
  ActionType.STUCK_DETECTION,
  ActionType.AFK_START
];

/**
 * Types d'actions positives qui indiquent un succès
 */
export const POSITIVE_ACTIONS: ActionType[] = [
  ActionType.POKEMON_CAPTURE_SUCCESS,
  ActionType.BATTLE_VICTORY,
  ActionType.QUEST_COMPLETE,
  ActionType.ACHIEVEMENT_UNLOCK,
  ActionType.LEVEL_UP
];

/**
 * Actions qui indiquent une frustration potentielle
 */
export const FRUSTRATION_INDICATORS: ActionType[] = [
  ActionType.POKEMON_CAPTURE_FAILURE,
  ActionType.POKEMON_FLEE,
  ActionType.BATTLE_DEFEAT,
  ActionType.QUEST_ABANDON,
  ActionType.ERROR_OCCURRED
];

// ===================================================================
// 🎮 CONSTANTES DE CONFIGURATION
// ===================================================================

/**
 * Configuration des seuils de détection comportementale
 */
export const BEHAVIOR_THRESHOLDS = {
  FRUSTRATION_CONSECUTIVE_FAILURES: 3,    // 3 échecs consécutifs = frustration
  AFK_THRESHOLD_MINUTES: 5,               // 5 min sans action = AFK
  SESSION_LONG_THRESHOLD_HOURS: 3,        // 3h+ = session longue
  RAPID_ACTIONS_PER_MINUTE: 30,          // 30+ actions/min = jeu rapide
  SOCIAL_ISOLATION_THRESHOLD_MINUTES: 30  // 30min sans interaction sociale
} as const;

/**
 * Export par défaut pour faciliter les imports
 */
export default {
  ActionType,
  ActionCategory,
  getCategoryForActionType,
  createBaseAction,
  CRITICAL_ACTIONS,
  POSITIVE_ACTIONS,
  FRUSTRATION_INDICATORS,
  BEHAVIOR_THRESHOLDS
};
