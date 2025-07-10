// server/src/battle/types/BattleTypes.ts
// TYPES MIS À JOUR POUR LE SYSTÈME DE PHASES

// === TYPES DE BASE ===

export type BattleType = 'wild' | 'trainer' | 'pvp';
export type BattlePhase = 'waiting' | 'battle' | 'ended' | 'fled';
export type PlayerRole = 'player1' | 'player2';

// === NOUVELLES PHASES INTERNES ===

export enum InternalBattlePhase {
  INTRO = 'intro',
  ACTION_SELECTION = 'action_selection',
  ACTION_RESOLUTION = 'action_resolution',
  CAPTURE = 'capture', 
  ENDED = 'ended'
}

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
  phase: BattlePhase; // Phase externe pour compatibilité
  turnNumber: number;
  currentTurn: PlayerRole; // Simplifié pour compatibilité
  player1: BattlePlayer;
  player2: BattlePlayer;
  isEnded: boolean;
  winner: PlayerRole | null;
  rules?: BattleRules;
  
  // === NOUVELLES PROPRIÉTÉS PHASES ===
  internalPhase?: InternalBattlePhase; // Phase interne détaillée
  canSubmitActions?: boolean; // Interface peut soumettre des actions
  actionQueueState?: {
    hasPlayer1Action: boolean;
    hasPlayer2Action: boolean;
    isComplete: boolean;
  };
}

// === ACTIONS ===

export type ActionType = 'attack' | 'item' | 'switch' | 'run' | 'capture';

export interface BattleAction {
  actionId: string;
  playerId: string;
  type: ActionType;
  data: any;
  timestamp: number;
  
  // === NOUVELLES PROPRIÉTÉS ===
  priority?: number; // Priorité calculée
  expectedSpeed?: number; // Vitesse attendue
}

// === RÉSULTATS ===

export interface BattleResult {
  success: boolean;
  error?: string;
  gameState: BattleGameState;
  events: string[];
  data?: any;
  
  // === NOUVELLES PROPRIÉTÉS ===
  phaseChanged?: boolean; // Indique si la phase a changé
  newPhase?: InternalBattlePhase; // Nouvelle phase si changée
  actionQueued?: boolean; // Action ajoutée à la file
}

// === SYSTÈME DE MODULES ===

export interface BattleModule {
  name: string;
  initialize(engine: any): void;
  process(action: BattleAction): BattleResult | Promise<BattleResult>;
  canHandle(action: BattleAction): boolean;
}

// === ÉVÉNEMENTS PHASES ===

export interface PhaseEvent {
  eventId: 'phaseChanged' | 'actionSelectionStart' | 'actionQueued' | 'resolutionStart' | 'resolutionComplete';
  battleId: string;
  timestamp: number;
  data: PhaseEventData;
}

export interface PhaseEventData {
  phaseChanged?: {
    phase: InternalBattlePhase;
    canAct: boolean;
    gameState: BattleGameState;
  };
  actionSelectionStart?: {
    canAct: boolean;
    gameState: BattleGameState;
    timeLimit?: number;
  };
  actionQueued?: {
    playerRole: PlayerRole;
    actionType: string;
    queueState: any;
  };
  resolutionStart?: {
    actionCount: number;
    orderPreview: { playerRole: PlayerRole; actionType: string }[];
  };
  resolutionComplete?: {
    actionsExecuted: number;
    battleEnded: boolean;
  };
}

// === ÉVÉNEMENTS EXISTANTS (CONSERVÉS) ===

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
    phase?: InternalBattlePhase; // Ajouté
  };
  phaseChanged?: PhaseEventData['phaseChanged']; // Nouveau
  actionProcessed?: {
    action: BattleAction;
    result: BattleResult;
    playerRole: PlayerRole;
  };
  battleEnd?: {
    winner: PlayerRole | null;
    reason: string;
    captureSuccess?: boolean;
  };
}

// === CALLBACKS ÉTENDUS ===

export interface BattleCallbacks {
  onBattleStart?: (data: BattleEventData['battleStart']) => void;
  onPhaseChanged?: (data: BattleEventData['phaseChanged']) => void; // Nouveau
  onActionQueued?: (data: PhaseEventData['actionQueued']) => void; // Nouveau
  onActionProcessed?: (data: BattleEventData['actionProcessed']) => void;
  onBattleEnd?: (data: BattleEventData['battleEnd']) => void;
  onError?: (error: string) => void;
}

// === COMPATIBILITÉ CLIENT ===

/**
 * Mappe les phases internes vers les phases client
 */
export function mapInternalPhaseToClient(internalPhase: InternalBattlePhase): BattlePhase {
  switch (internalPhase) {
    case InternalBattlePhase.INTRO:
    case InternalBattlePhase.ACTION_SELECTION:
    case InternalBattlePhase.ACTION_RESOLUTION:
    case InternalBattlePhase.CAPTURE:
      return 'battle';
    case InternalBattlePhase.ENDED:
      return 'ended';
    default:
      return 'waiting';
  }
}

/**
 * Crée un état de jeu pour le client (masque les détails internes)
 */
export function createClientGameState(
  internalState: BattleGameState,
  internalPhase: InternalBattlePhase,
  canSubmitActions: boolean,
  actionQueueState?: any
): BattleGameState {
  return {
    ...internalState,
    phase: mapInternalPhaseToClient(internalPhase),
    internalPhase,
    canSubmitActions,
    actionQueueState
  };
}

// === VALIDATION ===

export interface ActionValidation {
  isValid: boolean;
  reason?: string;
  allowedActions?: ActionType[];
  timeRemaining?: number;
}

export interface PhaseValidation {
  canTransition: boolean;
  reason?: string;
  requiredConditions?: string[];
}

// === DIAGNOSTICS ===

export interface BattleSystemDiagnostics {
  version: string;
  architecture: string;
  currentPhase: InternalBattlePhase;
  isProcessing: boolean;
  actionQueueSize: number;
  moduleStatuses: Record<string, boolean>;
  performanceMetrics: {
    averageActionTime: number;
    phaseTransitionCount: number;
    totalBattleTime: number;
  };
}

// === EXPORTS POUR RÉTROCOMPATIBILITÉ ===

// Types exportés individuellement (pas de default export)
export type TurnPlayer = PlayerRole; // Alias pour compatibilité
export { BattleConfig as LegacyBattleConfig };
export { BattleResult as LegacyBattleResult };
