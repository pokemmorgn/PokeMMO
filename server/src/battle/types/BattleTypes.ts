// server/src/battle/types/BattleTypes.ts
// ÉTAPE 2.6 : Types avec système narratif

// === TYPES DE BASE ===

export type BattleType = 'wild' | 'trainer' | 'pvp';
export type BattlePhase = 'waiting' | 'battle' | 'ended' | 'fled';
export type PlayerRole = 'player1' | 'player2';
export type TurnPlayer = 'narrator' | 'player1' | 'player2'; // ✅ NOUVEAU

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
  currentTurn: TurnPlayer; // ✅ CHANGÉ : 'narrator' | 'player1' | 'player2'
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
    isNarrative?: boolean; // ✅ NOUVEAU
  };
  narrativeEnd?: { // ✅ NOUVEAU
    firstCombatant: PlayerRole;
    gameState: BattleGameState;
  };
  turnChange?: {
    newPlayer: TurnPlayer; // ✅ CHANGÉ
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
  onNarrativeEnd?: (data: BattleEventData['narrativeEnd']) => void; // ✅ NOUVEAU
  onTurnChange?: (data: BattleEventData['turnChange']) => void;
  onAction?: (data: BattleEventData['action']) => void;
  onBattleEnd?: (data: BattleEventData['battleEnd']) => void;
  onError?: (error: string) => void;
}

// Types exportés individuellement (pas de default export)
