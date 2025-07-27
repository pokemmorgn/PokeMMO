// server/src/intelligence/types/ActionTypes.ts

/**
 * 🎯 TYPES D'ACTIONS JOUEUR - Base du système d'IA NPCs
 * 
 * Ce fichier définit TOUS les types d'actions que peut faire un joueur.
 * Chaque action sera capturée et analysée pour rendre les NPCs intelligents.
 */

// ===== TYPES D'ACTIONS PRINCIPALES =====
export enum ActionType {
  // 🗺️ MOUVEMENT & EXPLORATION
  PLAYER_MOVE = "player_move",
  MAP_CHANGE = "map_change", 
  ZONE_ENTER = "zone_enter",
  ZONE_EXIT = "zone_exit",
  
  // ⚔️ COMBAT & POKÉMON
  POKEMON_ENCOUNTER = "pokemon_encounter",
  POKEMON_CAPTURE_ATTEMPT = "pokemon_capture_attempt",
  POKEMON_CAPTURE_SUCCESS = "pokemon_capture_success",
  POKEMON_CAPTURE_FAIL = "pokemon_capture_fail",
  POKEMON_FLEE = "pokemon_flee",
  
  // 💰 ÉCONOMIE & OBJETS
  ITEM_USE = "item_use",
  ITEM_PURCHASE = "item_purchase", 
  ITEM_SELL = "item_sell",
  GOLD_SPEND = "gold_spend",
  GOLD_RECEIVE = "gold_receive",
  OBJECT_COLLECT = "object_collect", // Objets dans le monde
  
  // 👥 SOCIAL & COMMUNICATION
  CHAT_MESSAGE = "chat_message",
  PLAYER_INTERACT = "player_interact",
  FRIEND_REQUEST = "friend_request",
  FRIEND_ACCEPT = "friend_accept",
  
  // 📋 QUÊTES & NPCS
  QUEST_START = "quest_start",
  QUEST_COMPLETE = "quest_complete",
  QUEST_ABANDON = "quest_abandon",
  NPC_TALK = "npc_talk",
  NPC_SHOP_VISIT = "npc_shop_visit",
  
  // 🎮 INTERFACE & SYSTÈME
  UI_OPEN = "ui_open",
  UI_CLOSE = "ui_close", 
  SETTING_CHANGE = "setting_change",
  
  // 📊 SESSION & TEMPS
  SESSION_START = "session_start",
  SESSION_END = "session_end",
  IDLE_START = "idle_start", // Joueur inactif 5min+
  IDLE_END = "idle_end",
  
  // 🏆 SUCCÈS & ÉCHECS 
  ACHIEVEMENT_UNLOCK = "achievement_unlock",
  LEVEL_UP = "level_up",
  DEATH = "death",
  FRUSTRATION_EVENT = "frustration_event", // 3+ échecs consécutifs
}

// ===== DONNÉES SPÉCIFIQUES PAR TYPE D'ACTION =====

export interface BaseActionData {
  // Données communes à toutes les actions
  timestamp: number;
  sessionId: string;
  playerId: string;
  actionType: ActionType;
}

export interface MovementActionData extends BaseActionData {
  actionType: ActionType.PLAYER_MOVE;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  map: string;
  movementSpeed: number;
  distanceTraveled: number;
}

export interface MapChangeActionData extends BaseActionData {
  actionType: ActionType.MAP_CHANGE;
  fromMap: string;
  toMap: string;
  x: number;
  y: number;
  timeOnPreviousMap: number; // millisecondes
}

export interface PokemonCaptureActionData extends BaseActionData {
  actionType: ActionType.POKEMON_CAPTURE_ATTEMPT | ActionType.POKEMON_CAPTURE_SUCCESS | ActionType.POKEMON_CAPTURE_FAIL;
  pokemonName: string;
  pokemonLevel: number;
  ballType: string;
  attemptNumber: number; // 1ère, 2ème, 3ème tentative
  success: boolean;
  breakoutCount?: number; // Nombre d'échappements avant capture/échec
}

export interface ItemActionData extends BaseActionData {
  actionType: ActionType.ITEM_USE | ActionType.ITEM_PURCHASE | ActionType.ITEM_SELL;
  itemId: string;
  itemName: string;
  quantity: number;
  goldCost?: number;
  context?: string; // "combat", "exploration", "healing"
}

export interface NPCInteractionActionData extends BaseActionData {
  actionType: ActionType.NPC_TALK | ActionType.NPC_SHOP_VISIT;
  npcId: string;
  npcName: string;
  interactionType: string; // "dialogue", "shop", "quest"
  dialogueOption?: string;
  duration: number; // Durée de l'interaction en ms
}

export interface ChatActionData extends BaseActionData {
  actionType: ActionType.CHAT_MESSAGE;
  messageLength: number;
  isGlobal: boolean;
  isPrivate: boolean;
  targetPlayer?: string;
  sentiment?: "positive" | "negative" | "neutral" | "frustrated";
}

export interface QuestActionData extends BaseActionData {
  actionType: ActionType.QUEST_START | ActionType.QUEST_COMPLETE | ActionType.QUEST_ABANDON;
  questId: string;
  questName: string;
  questType: string;
  timeToComplete?: number; // Pour QUEST_COMPLETE
  abandonReason?: string; // Pour QUEST_ABANDON
}

export interface UIActionData extends BaseActionData {
  actionType: ActionType.UI_OPEN | ActionType.UI_CLOSE;
  uiElement: string; // "inventory", "team", "settings", "map"
  timeSpent?: number; // Pour UI_CLOSE - temps passé dans l'UI
}

export interface SessionActionData extends BaseActionData {
  actionType: ActionType.SESSION_START | ActionType.SESSION_END;
  sessionDuration?: number; // Pour SESSION_END
  actionsPerformed?: number; // Nombre d'actions dans la session
  mapsVisited?: string[];
}

// ===== CONTEXTE ENVIRONNEMENTAL =====
export interface ActionContext {
  // Contexte temporel
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  dayOfWeek: string;
  
  // Contexte spatial
  currentMap: string;
  zone?: string;
  nearbyPlayers: string[]; // Noms des joueurs à proximité
  nearbyNPCs: string[]; // NPCs à proximité
  
  // Contexte social
  isAlone: boolean;
  friendsOnline: number;
  
  // Contexte de jeu
  currentGold: number;
  currentLevel: number;
  teamSize: number;
  inventoryFull: boolean;
  
  // Contexte émotionnel/comportemental
  recentFailures: number; // Échecs dans les 10 dernières minutes
  consecutiveActions: number; // Actions similaires consécutives
  idleTime: number; // Temps d'inactivité avant cette action
}

// ===== ACTION COMPLÈTE =====
export interface PlayerAction {
  id: string; // UUID unique
  playerId: string;
  actionType: ActionType;
  timestamp: number;
  sessionId: string;
  
  // Données spécifiques selon le type
  data: MovementActionData | PokemonCaptureActionData | ItemActionData | 
        NPCInteractionActionData | ChatActionData | QuestActionData | 
        UIActionData | SessionActionData | BaseActionData;
        
  // Contexte environnemental
  context: ActionContext;
  
  // Métadonnées pour l'analyse
  metadata: {
    processingTime?: number; // Temps de traitement de l'action
    analysisComplete?: boolean;
    flagged?: boolean; // Pour actions suspectes/intéressantes
    patterns?: string[]; // Patterns détectés
  };
}

// ===== CONSTANTES POUR L'ANALYSE =====
export const ANALYSIS_THRESHOLDS = {
  // Seuils de frustration
  FRUSTRATION_FAILURES: 3, // 3 échecs = frustration
  FRUSTRATION_TIME_WINDOW: 600000, // 10 minutes
  
  // Seuils d'inactivité  
  IDLE_THRESHOLD: 300000, // 5 minutes = idle
  SESSION_TIMEOUT: 1800000, // 30 minutes = session timeout
  
  // Seuils sociaux
  ALONE_TIME_THRESHOLD: 1800000, // 30 minutes seul = besoin social
  
  // Seuils de performance
  ACTION_PROCESSING_MAX: 50, // < 50ms de traitement
  
  // Patterns comportementaux
  CONSECUTIVE_ACTION_THRESHOLD: 5, // 5 actions similaires = pattern
  EXPLORATION_DISTANCE_THRESHOLD: 500, // Distance pour être "explorateur"
} as const;

// ===== TYPES POUR L'EXPORT =====
export type ActionData = 
  | MovementActionData 
  | PokemonCaptureActionData 
  | ItemActionData 
  | NPCInteractionActionData 
  | ChatActionData 
  | QuestActionData 
  | UIActionData 
  | SessionActionData 
  | BaseActionData;

export type { ActionContext, PlayerAction };

// Helper types pour TypeScript
export type ActionTypeString = keyof typeof ActionType;
export type ActionDataByType<T extends ActionType> = 
  T extends ActionType.PLAYER_MOVE ? MovementActionData :
  T extends ActionType.POKEMON_CAPTURE_ATTEMPT ? PokemonCaptureActionData :
  T extends ActionType.ITEM_USE ? ItemActionData :
  T extends ActionType.NPC_TALK ? NPCInteractionActionData :
  BaseActionData;
