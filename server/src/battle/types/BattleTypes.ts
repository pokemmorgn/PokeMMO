// server/src/battle/types/BattleTypes.ts
// TYPES MIS À JOUR POUR CHANGEMENTS UNIVERSELS - TOUS TYPES DE COMBATS

// === TYPES DE BASE ===

export type BattleType = 'wild' | 'trainer' | 'pvp';
export type BattlePhase = 'waiting' | 'battle' | 'ended' | 'fled';
export type PlayerRole = 'player1' | 'player2';

// === NOUVELLES PHASES INTERNES ===

export enum InternalBattlePhase {
  INTRO = 'intro',
  ACTION_SELECTION = 'action_selection',
  ACTION_RESOLUTION = 'action_resolution',
  POKEMON_FAINTED = 'pokemon_fainted',
  CAPTURE = 'capture', 
  ENDED = 'ended',
  // 🆕 PHASES CHANGEMENT POUR TOUS COMBATS
  SWITCH_PHASE = 'switch_phase',           // Changement volontaire
  FORCED_SWITCH = 'forced_switch'          // Changement forcé après KO
}

// === 🆕 ÉQUIPES UNIVERSELLES ===

export interface PokemonTeam {
  pokemon: Pokemon[];           // Équipe complète (1-6 Pokémon)
  activePokemonIndex: number;   // Index Pokémon actuel au combat
  remainingPokemon: number;     // Nombre de Pokémon encore valides
  canSwitch: boolean;          // Peut faire des changements
  lastSwitchTurn?: number;     // Dernier tour de changement
  teamType: 'player' | 'wild' | 'trainer'; // 🆕 Type d'équipe
}

export interface TeamConfiguration {
  allowSwitching: boolean;      // Autorise changements
  maxSwitchesPerTurn: number;   // Limite par tour
  switchCooldown: number;       // Tours d'attente entre changements
  forceSwitch: boolean;         // Force changement si KO
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

// === JOUEURS ÉTENDUS ===

export interface BattlePlayer {
  sessionId: string;
  name: string;
  pokemon: Pokemon | null;    // 🔥 GARDE pour compatibilité - Pokémon actif
  isAI?: boolean;
  // 🆕 ÉQUIPE COMPLÈTE POUR TOUS
  team?: PokemonTeam;         // Équipe complète (optionnel pour compatibilité)
  teamConfig?: TeamConfiguration; // Configuration changements
}

// === 🆕 ACTIONS CHANGEMENT UNIVERSELLES ===

export interface SwitchAction extends BattleAction {
  type: 'switch';
  data: {
    fromPokemonIndex: number;    // Index Pokémon actuel
    toPokemonIndex: number;      // Index Pokémon cible
    isForced: boolean;           // Changement forcé (KO) vs libre
    reason?: string;             // Raison du changement
    battleType?: BattleType;     // 🆕 Type de combat pour validation
  };
}

export interface SwitchValidationResult {
  isValid: boolean;
  reason?: string;
  availableOptions?: number[];
  cooldownTurns?: number;
}

// === CONFIGURATION ÉTENDUE ===

export interface PlayerData {
  sessionId: string;
  name: string;
  pokemon: Pokemon;
  // 🆕 ÉQUIPE COMPLÈTE OPTIONNELLE
  team?: Pokemon[];           // Si fournie = combat multi-Pokémon
  teamConfig?: TeamConfiguration; // Configuration changements
}

export interface OpponentData {
  sessionId?: string;
  name?: string;
  pokemon: Pokemon;
  isAI?: boolean;
  // 🆕 ÉQUIPE ADVERSE
  team?: Pokemon[];           // Équipe complète (dresseurs)
  teamConfig?: TeamConfiguration;
}

export interface BattleConfig {
  type: BattleType;
  player1: PlayerData;
  opponent: OpponentData;
  rules?: BattleRules;
  // 🆕 CONFIGURATION CHANGEMENTS GLOBALE
  switchRules?: {
    allowWildSwitching: boolean;     // Autorise changements combats sauvages
    allowTrainerSwitching: boolean;  // Autorise changements combats dresseurs  
    allowPvPSwitching: boolean;      // Autorise changements PvP
    defaultCooldown: number;         // Cooldown par défaut
    maxSwitchesPerTurn: number;      // Limite par défaut
  };
}

export interface BattleRules {
  maxTurns?: number;
  allowItems?: boolean;
  allowSwitching?: boolean;    // 🔥 GARDE compatibilité
  allowRunning?: boolean;
  // 🆕 RÈGLES SPÉCIFIQUES CHANGEMENTS
  switchRules?: TeamConfiguration;
}

// === ÉTAT DU JEU ÉTENDU ===

export interface BattleGameState {
  battleId: string;
  type: BattleType;
  phase: BattlePhase; // Phase externe pour compatibilité
  turnNumber: number;
  currentTurn: PlayerRole;
  player1: BattlePlayer;
  player2: BattlePlayer;
  isEnded: boolean;
  winner: PlayerRole | null;
  rules?: BattleRules;
  
  // === PROPRIÉTÉS PHASES ===
  internalPhase?: InternalBattlePhase;
  canSubmitActions?: boolean;
  actionQueueState?: {
    hasPlayer1Action: boolean;
    hasPlayer2Action: boolean;
    isComplete: boolean;
  };
  
  // 🆕 ÉTAT CHANGEMENTS UNIVERSELS
  switchState?: {
    pendingSwitches: Map<PlayerRole, SwitchAction>;
    lastSwitchTurns: Map<PlayerRole, number>;
    switchCounts: Map<PlayerRole, number>;
    isProcessing: boolean;
  };
  
  // 🆕 SUPPORT ÉQUIPES MULTIPLES TOUS COMBATS
  isMultiPokemonBattle?: boolean;  // true si au moins un joueur a une équipe
  switchRulesActive?: TeamConfiguration; // Règles actives de changement
}

// === ACTIONS ÉTENDUES ===

export type ActionType = 'attack' | 'item' | 'switch' | 'run' | 'capture';

export interface BattleAction {
  actionId: string;
  playerId: string;
  type: ActionType;
  data: any;
  timestamp: number;
  
  // === PROPRIÉTÉS ÉTENDUES ===
  priority?: number; 
  expectedSpeed?: number;
  battleType?: BattleType;     // 🆕 Contexte de combat
}

// === RÉSULTATS ÉTENDUS ===

export interface BattleResult {
  success: boolean;
  error?: string;
  gameState: BattleGameState;
  events: string[];
  data?: any;
  
  // === PROPRIÉTÉS CHANGEMENT ===
  phaseChanged?: boolean;
  newPhase?: InternalBattlePhase;
  actionQueued?: boolean;
  // 🆕 DONNÉES CHANGEMENT
  switchData?: {
    switchExecuted?: boolean;
    fromPokemon?: Pokemon;
    toPokemon?: Pokemon;
    playerRole?: PlayerRole;
    teamDefeated?: boolean;
    availableOptions?: number[];
  };
}

// === 🆕 ÉVÉNEMENTS CHANGEMENT UNIVERSELS ===

export interface SwitchEvent {
  eventId: 'pokemonSwitched' | 'forcedSwitchRequired' | 'switchValidation';
  battleId: string;
  timestamp: number;
  data: SwitchEventData;
}

export interface SwitchEventData {
  pokemonSwitched?: {
    playerRole: PlayerRole;
    fromPokemon: string;
    toPokemon: string;
    fromIndex: number;
    toIndex: number;
    isForced: boolean;
    reason: string;
    newActivePokemon: Pokemon;
  };
  
  forcedSwitchRequired?: {
    playerRole: PlayerRole;
    faintedPokemon: string;
    availableOptions: number[];
    timeLimit: number;
    battleType: BattleType;  // 🆕 Contexte
  };
  
  switchValidation?: {
    isValid: boolean;
    reason?: string;
    playerRole: PlayerRole;
    availableOptions?: number[];
  };
}

// === 🆕 HELPERS ÉQUIPES UNIVERSELLES ===

/**
 * Crée une équipe Pokémon universelle
 */
export function createPokemonTeam(
  pokemon: Pokemon[],
  activePokemonIndex: number = 0,
  teamType: 'player' | 'wild' | 'trainer' = 'player'
): PokemonTeam {
  const validPokemon = pokemon.filter(p => p.currentHp > 0);
  
  return {
    pokemon: pokemon,
    activePokemonIndex: Math.min(activePokemonIndex, pokemon.length - 1),
    remainingPokemon: validPokemon.length,
    canSwitch: validPokemon.length > 1,
    lastSwitchTurn: undefined,
    teamType
  };
}

/**
 * Configuration par défaut selon type de combat
 */
export function getDefaultTeamConfig(battleType: BattleType): TeamConfiguration {
  switch (battleType) {
    case 'wild':
      return {
        allowSwitching: true,       // 🆕 Autorisé maintenant !
        maxSwitchesPerTurn: 1,      // Limite normale
        switchCooldown: 0,          // Pas de cooldown (plus libre)
        forceSwitch: true           // Force changement si KO
      };
      
    case 'trainer':
      return {
        allowSwitching: true,
        maxSwitchesPerTurn: 1,
        switchCooldown: 0,          // Peut être ajusté selon difficulté
        forceSwitch: true
      };
      
    case 'pvp':
      return {
        allowSwitching: true,
        maxSwitchesPerTurn: 1,
        switchCooldown: 1,          // Cooldown PvP pour équilibrer
        forceSwitch: true
      };
      
    default:
      return {
        allowSwitching: true,
        maxSwitchesPerTurn: 1,
        switchCooldown: 0,
        forceSwitch: true
      };
  }
}

/**
 * Vérifie si une configuration supporte les changements
 */
export function supportsSwitching(config: BattleConfig): boolean {
  // Vérifier si au moins un joueur a une équipe
  const hasPlayerTeam = config.player1.team && config.player1.team.length > 1;
  const hasOpponentTeam = config.opponent.team && config.opponent.team.length > 1;
  
  if (!hasPlayerTeam && !hasOpponentTeam) {
    return false; // Combat 1v1 classique
  }
  
  // Vérifier règles globales
  if (config.switchRules) {
    switch (config.type) {
      case 'wild': return config.switchRules.allowWildSwitching;
      case 'trainer': return config.switchRules.allowTrainerSwitching;
      case 'pvp': return config.switchRules.allowPvPSwitching;
    }
  }
  
  // Par défaut, autoriser si équipe multiple
  return true;
}

/**
 * Vérifie si une action est un changement
 */
export function isSwitchAction(action: BattleAction): action is SwitchAction {
  return action.type === 'switch';
}

/**
 * Crée une action de changement
 */
export function createSwitchAction(
  playerId: string,
  fromIndex: number,
  toIndex: number,
  isForced: boolean = false,
  battleType?: BattleType
): SwitchAction {
  return {
    actionId: `switch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    playerId,
    type: 'switch',
    data: {
      fromPokemonIndex: fromIndex,
      toPokemonIndex: toIndex,
      isForced,
      reason: isForced ? 'forced_after_ko' : 'player_choice',
      battleType
    },
    timestamp: Date.now()
  };
}

// === SYSTÈME DE MODULES (CONSERVÉ) ===

export interface BattleModule {
  name: string;
  initialize(engine: any): void;
  process(action: BattleAction): BattleResult | Promise<BattleResult>;
  canHandle(action: BattleAction): boolean;
}

// === ÉVÉNEMENTS PHASES (CONSERVÉ AVEC EXTENSIONS) ===

export interface PhaseEvent {
  eventId: 'phaseChanged' | 'actionSelectionStart' | 'actionQueued' | 'resolutionStart' | 'resolutionComplete' | 'switchRequired';
  battleId: string;
  timestamp: number;
  data: PhaseEventData;
}

export interface PhaseEventData {
  phaseChanged?: {
    phase: InternalBattlePhase;
    canAct: boolean;
    gameState: BattleGameState;
    // 🆕 DONNÉES CHANGEMENT
    switchRequired?: {
      playerRole: PlayerRole;
      isForced: boolean;
      availableOptions: number[];
      timeLimit?: number;
    };
  };
  actionSelectionStart?: {
    canAct: boolean;
    gameState: BattleGameState;
    timeLimit?: number;
    // 🆕 OPTIONS CHANGEMENT
    canSwitch?: boolean;
    availableSwitches?: number[];
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

// === COMPATIBILITÉ (CONSERVÉ) ===

/**
 * Mappe les phases internes vers les phases client
 */
export function mapInternalPhaseToClient(internalPhase: InternalBattlePhase): BattlePhase {
  switch (internalPhase) {
    case InternalBattlePhase.INTRO:
    case InternalBattlePhase.ACTION_SELECTION:
    case InternalBattlePhase.ACTION_RESOLUTION:
    case InternalBattlePhase.CAPTURE:
    case InternalBattlePhase.SWITCH_PHASE:      // 🆕
    case InternalBattlePhase.FORCED_SWITCH:     // 🆕
      return 'battle';
    case InternalBattlePhase.ENDED:
      return 'ended';
    default:
      return 'waiting';
  }
}

/**
 * Crée un état de jeu pour le client
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

// === VALIDATION (ÉTENDUE) ===

export interface ActionValidation {
  isValid: boolean;
  reason?: string;
  allowedActions?: ActionType[];
  timeRemaining?: number;
  // 🆕 VALIDATION CHANGEMENT
  switchValidation?: SwitchValidationResult;
}

export interface PhaseValidation {
  canTransition: boolean;
  reason?: string;
  requiredConditions?: string[];
}

// === ÉVÉNEMENTS EXISTANTS (CONSERVÉS AVEC EXTENSIONS) ===

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
    phase?: InternalBattlePhase;
    // 🆕 INFO ÉQUIPES
    isMultiPokemonBattle?: boolean;
    switchingEnabled?: boolean;
  };
  phaseChanged?: PhaseEventData['phaseChanged'];
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
  // 🆕 ÉVÉNEMENTS CHANGEMENT
  pokemonSwitched?: SwitchEventData['pokemonSwitched'];
  switchRequired?: SwitchEventData['forcedSwitchRequired'];
}

// === CALLBACKS ÉTENDUS ===

export interface BattleCallbacks {
  onBattleStart?: (data: BattleEventData['battleStart']) => void;
  onPhaseChanged?: (data: BattleEventData['phaseChanged']) => void;
  onActionQueued?: (data: PhaseEventData['actionQueued']) => void;
  onActionProcessed?: (data: BattleEventData['actionProcessed']) => void;
  onBattleEnd?: (data: BattleEventData['battleEnd']) => void;
  onError?: (error: string) => void;
  // 🆕 CALLBACKS CHANGEMENT
  onPokemonSwitched?: (data: BattleEventData['pokemonSwitched']) => void;
  onSwitchRequired?: (data: BattleEventData['switchRequired']) => void;
}

// === DIAGNOSTICS (ÉTENDU) ===

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
  // 🆕 DIAGNOSTICS CHANGEMENT
  switchingSupport: {
    enabled: boolean;
    activeRules: TeamConfiguration | null;
    pendingSwitches: number;
    totalSwitches: number;
  };
}

// === EXPORTS POUR RÉTROCOMPATIBILITÉ ===

export type TurnPlayer = PlayerRole;
export { BattleConfig as LegacyBattleConfig };
export { BattleResult as LegacyBattleResult };
