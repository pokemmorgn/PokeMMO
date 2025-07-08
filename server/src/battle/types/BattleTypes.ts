// server/src/battle/types/BattleTypes.ts
// ÉTAPE 1 : Types de base pour le système de combat

// === TYPES DE BASE ===

export type BattleType = 'wild' | 'trainer' | 'pvp';
export type BattlePhase = 'waiting' | 'battle' | 'ended' | 'fled';
export type PlayerRole = 'player1' | 'player2';

// === POKEMON ===

export interface Pokemon {
  id: number;
  combatId: string;
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  types: string[];
  moves: string[];
  status?: string;
  gender?: string;
  shiny?: boolean;
  isWild?: boolean;
}

// === JOUEURS ===

export interface BattlePlayer {
  sessionId: string;
  name: string;
  pokemon: Pokemon | null;
  isAI?: boolean;
}

// === CONFIGURATION ===

export interface PlayerData {
  sessionId: string;
  name: string;
  pokemon: Pokemon;
}

export interface OpponentData {
  sessionId?: string;
  name?: string;
  pokemon: Pokemon;
  isAI?: boolean;
}

export interface BattleConfig {
  type: BattleType;
  player1: PlayerData;
  opponent: OpponentData;
  rules?: BattleRules;
}

export interface BattleRules {
  maxTurns?: number;
  allowItems?: boolean;
  allowSwitching?: boolean;
  allowRunning?: boolean;
}

// === ÉTAT DU JEU ===

export interface BattleGameState {
  battleId: string;
  type: BattleType;
  phase: BattlePhase;
  turnNumber: number;
  currentTurn: PlayerRole;
  player1: BattlePlayer;
  player2: BattlePlayer;
  isEnded: boolean;
  winner: PlayerRole | null;
  rules?: BattleRules;
}

// === ACTIONS ===

export type ActionType = 'attack' | 'item' | 'switch' | 'run' | 'capture';

export interface BattleAction {
  actionId: string;
  playerId: string;
  type: ActionType;
  data: any;
  timestamp: number;
}

// === RÉSULTATS ===

export interface BattleResult {
  success: boolean;
  error?: string;
  gameState: BattleGameState;
  events: string[];
  data?: any;
}

// === SYSTÈME DE MODULES ===

export interface BattleModule {
  name: string;
  initialize(engine: any): void;
  process(action: BattleAction): BattleResult | Promise<BattleResult>;
  canHandle(action: BattleAction): boolean;
}

// === ÉVÉNEMENTS ===

export interface BattleEvent {
  eventId: string;
  type: string;
  timestamp: number;
  data: any;
  playerId?: string;
}

export interface BattleEventData {
  battleStart?: {
    gameState: BattleGameState;
    firstPlayer: PlayerRole;
  };
  turnChange?: {
    newPlayer: PlayerRole;
    turnNumber: number;
  };
  action?: {
    player: PlayerRole;
    action: BattleAction;
  };
  battleEnd?: {
    winner: PlayerRole | null;
    reason: string;
  };
}

// === CALLBACKS ===

export interface BattleCallbacks {
  onBattleStart?: (data: BattleEventData['battleStart']) => void;
  onTurnChange?: (data: BattleEventData['turnChange']) => void;
  onAction?: (data: BattleEventData['action']) => void;
  onBattleEnd?: (data: BattleEventData['battleEnd']) => void;
  onError?: (error: string) => void;
}

// === EXPORTS ===

export default {
  // Types principaux
  BattleConfig,
  BattleGameState,
  BattleAction,
  BattleResult,
  BattleModule,
  
  // Types utilitaires
  Pokemon,
  BattlePlayer,
  BattleEvent,
  BattleCallbacks
};
