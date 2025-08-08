// server/src/battle/types/TrainerBattleTypes.ts
// 🔧 CORRECTION COMPATIBILITÉ AVEC NOUVEAUX TYPES UNIVERSELS

import { 
  BattleType, 
  BattlePhase, 
  PlayerRole, 
  Pokemon, 
  BattleConfig, 
  BattleGameState, 
  BattleAction, 
  BattleResult,
  InternalBattlePhase,
  // 🆕 IMPORT NOUVEAUX TYPES UNIVERSELS
  PokemonTeam,           // Remplace TrainerPokemonTeam
  TeamConfiguration,     // Remplace TrainerBattleRules partiellement
  SwitchAction,          // Maintenant universel
  createPokemonTeam,     // Helper universel
  getDefaultTeamConfig   // Config par défaut selon type combat
} from './BattleTypes';
import { IOwnedPokemon } from '../../models/OwnedPokemon';
import mongoose from 'mongoose';

// === PHASES DRESSEURS (CONSERVÉES POUR COMPATIBILITÉ) ===

export enum TrainerBattlePhase {
  // Phases existantes (compatibilité)
  INTRO = 'intro',
  ACTION_SELECTION = 'action_selection', 
  ACTION_RESOLUTION = 'action_resolution',
  CAPTURE = 'capture',
  ENDED = 'ended',
  
  // 🆕 NOUVELLES PHASES DRESSEURS (maintenant universelles)
  POKEMON_SELECTION = 'pokemon_selection',    // Choix Pokémon initial (automatique)
  SWITCH_PHASE = 'switch_phase',             // Changement de Pokémon
  FORCED_SWITCH = 'forced_switch',           // Changement forcé (KO)
  VICTORY_SEQUENCE = 'victory_sequence'      // Séquence de victoire + récompenses
}

// === 🔧 ALIAS POUR COMPATIBILITÉ ===

/**
 * @deprecated Utiliser PokemonTeam à la place
 */
export type TrainerPokemonTeam = PokemonTeam;

/**
 * Crée une équipe pour combat dresseur (wrapper compatibilité)
 */
export function createTrainerPokemonTeam(
  pokemon: Pokemon[],
  activePokemonIndex: number = 0
): PokemonTeam {
  return createPokemonTeam(pokemon, activePokemonIndex, 'trainer');
}

// === DONNÉES DRESSEUR (CONSERVÉES) ===

export interface TrainerData {
  trainerId: string;           
  name: string;               
  trainerClass: string;       
  level: number;              
  pokemon: Pokemon[];         
  aiProfile: TrainerAIProfile; 
  rewards: TrainerRewards;    
  dialogue?: TrainerDialogue; 
  specialRules?: TrainerBattleRules; 
}

export interface TrainerAIProfile {
  difficulty: 'easy' | 'normal' | 'hard' | 'expert';
  strategies: TrainerStrategy[];
  switchPatterns: SwitchPattern[];
  aggressiveness: number;     
  intelligence: number;       
  memory: boolean;           
}

export interface TrainerStrategy {
  name: string;              
  priority: number;          
  conditions: string[];      
  actions: string[];         
}

export interface SwitchPattern {
  trigger: 'hp_low' | 'type_disadvantage' | 'status_inflicted' | 'setup_complete';
  threshold?: number;        
  targetSelection: 'random' | 'type_advantage' | 'fastest' | 'specific';
  specificPokemonIndex?: number;
}

export interface TrainerRewards {
  baseMoney: number;         
  moneyMultiplier: number;   
  baseExp: number;           
  expMultiplier: number;     
  items?: TrainerRewardItem[]; 
}

export interface TrainerRewardItem {
  itemId: string;
  quantity: number;
  chance: number;            
}

export interface TrainerDialogue {
  prebattle?: string[];     
  midBattle?: string[];     
  victory?: string[];       
  defeat?: string[];        
  rematch?: string[];       
}

// === 🔧 RÈGLES DRESSEURS (EXTENDED DEPUIS TEAMCONFIGURATION) ===

export interface TrainerBattleRules extends TeamConfiguration {
  // Hérite de : allowSwitching, maxSwitchesPerTurn, switchCooldown, forceSwitch
  
  // 🆕 SPÉCIFICITÉS DRESSEURS
  itemsAllowed: boolean;     // Dresseur peut utiliser objets
  megaEvolution: boolean;    // Méga-évolution autorisée (futur)
  
  // Propriétés héritées de TeamConfiguration :
  // allowSwitching: boolean;
  // maxSwitchesPerTurn: number; 
  // switchCooldown: number;
  // forceSwitch: boolean;
}

// === CONFIGURATIONS ÉTENDUES ===

export interface TrainerBattleConfig extends Omit<BattleConfig, 'type'> {
  type: 'trainer';          
  trainer: TrainerData;     
  playerTeam: Pokemon[];    
  rules: TrainerBattleRules; 
  // ✅ GARDE opponent pour compatibilité (mappé depuis trainer)
  opponent: {
    sessionId?: string;
    name?: string;
    pokemon: Pokemon;
    isAI?: boolean;
    // 🆕 ÉQUIPE COMPLÈTE POUR COMPATIBILITÉ UNIVERSELLE
    team?: Pokemon[];
    teamConfig?: TeamConfiguration;
  };
}

// === 🔧 ÉTAT JEU DRESSEUR (CORRIGÉ) ===

export interface TrainerGameState extends Omit<BattleGameState, 'player2'> {
  // Extension joueur avec équipe (garde pokemon pour compatibilité)
  player1: {
    sessionId: string;
    name: string;
    pokemon: Pokemon | null; // ✅ OBLIGATOIRE pour compatibilité BattleGameState
    team: PokemonTeam;       // 🔧 UTILISE PokemonTeam universel maintenant
    isAI?: boolean;
    teamConfig?: TeamConfiguration;
  };
  
  // 🆕 DRESSEUR COMPLET  
  trainer: {
    sessionId: string;      
    data: TrainerData;      
    team: PokemonTeam;      // 🔧 UTILISE PokemonTeam universel
  };
  
  // ✅ AJOUTER player2 pour compatibilité complète
  player2: {
    sessionId: string;
    name: string;
    pokemon: Pokemon | null; 
    isAI?: boolean;
    team?: PokemonTeam;     // 🔧 UTILISE PokemonTeam universel
    teamConfig?: TeamConfiguration;
  };
  
  // Nouvelles propriétés spécifiques dresseurs
  trainerPhase?: TrainerBattlePhase; 
  switchRequests?: SwitchRequest[];   
  lastRewards?: CalculatedRewards;    
  battleMemory?: BattleMemoryData;    
}

// === ACTIONS ÉTENDUES (CONSERVÉES) ===

// 🔧 PLUS BESOIN DE REDÉFINIR SwitchAction - utilise version universelle
// export interface SwitchAction extends BattleAction { ... } // SUPPRIMÉ

export interface SwitchRequest {
  playerRole: PlayerRole;
  fromIndex: number;
  toIndex: number;
  isForced: boolean;
  timestamp: number;
  processed: boolean;
}

// === RÉSULTATS ÉTENDUS (CONSERVÉS) ===

export interface TrainerBattleResult extends BattleResult {
  trainerData?: {
    switchExecuted?: boolean;
    newActivePokemon?: Pokemon;
    pokemonDefeated?: boolean;
    teamDefeated?: boolean;
    rewardsEarned?: CalculatedRewards;
    aiDecision?: AIDecisionData;
  };
}

export interface CalculatedRewards {
  money: number;
  experience: { pokemonId: string; exp: number }[];
  items: { itemId: string; quantity: number }[];
  totalExpGained: number;
  moneyMultiplier: number;
}

export interface AIDecisionData {
  strategy: string;
  reasoning: string[];
  confidence: number;
  alternativeActions: string[];
  memoryUpdates?: string[];
}

// === MÉMOIRE COMBAT (CONSERVÉE) ===

export interface BattleMemoryData {
  battleId: string;
  playerId: string;
  trainerId: string;
  startTime: number;
  endTime?: number;
  turns: number;
  winner: PlayerRole | null;
  playerStrategy: string[];    
  effectiveActions: string[];  
  playerWeaknesses: string[];  
  nextBattleHints: string[];   
}

// === 🔧 FACTORY & HELPERS (CORRIGÉS) ===

/**
 * Crée une configuration de combat dresseur (compatible universelle)
 */
export function createTrainerBattleConfig(
  playerSessionId: string,
  playerName: string,
  playerPokemon: Pokemon[], 
  trainerData: TrainerData
): TrainerBattleConfig {
  return {
    type: 'trainer',
    player1: {
      sessionId: playerSessionId,
      name: playerName,
      pokemon: playerPokemon[0], // Premier Pokémon pour compatibilité
      // 🆕 ÉQUIPE COMPLÈTE POUR CHANGEMENTS UNIVERSELS
      team: playerPokemon,
      teamConfig: getDefaultTeamConfig('trainer') // 🔧 UTILISE CONFIG UNIVERSELLE
    },
    // ✅ AJOUTER opponent pour compatibilité
    opponent: {
      sessionId: 'ai',
      name: trainerData.name,
      pokemon: trainerData.pokemon[0],
      isAI: true,
      // 🆕 ÉQUIPE COMPLÈTE DRESSEUR
      team: trainerData.pokemon,
      teamConfig: getDefaultTeamConfig('trainer')
    },
    trainer: trainerData,
    playerTeam: playerPokemon,
    rules: {
      // 🔧 MERGE TeamConfiguration + spécificités dresseurs
      ...getDefaultTeamConfig('trainer'),
      itemsAllowed: false,
      megaEvolution: false,
      // Ajouter règles spéciales du dresseur si présentes
      ...(trainerData.specialRules || {})
    }
  };
}

/**
 * 🔧 CONVERTIT IOwnedPokemon vers Pokemon universel (corrigé)
 */
export function convertOwnedPokemonToBattlePokemon(ownedPokemon: IOwnedPokemon): Pokemon {
  return {
    id: ownedPokemon.pokemonId,
    combatId: `combat_${ownedPokemon._id}_${Date.now()}`,
    name: ownedPokemon.nickname || `Pokemon_${ownedPokemon.pokemonId}`,
    level: ownedPokemon.level,
    currentHp: ownedPokemon.currentHp,
    maxHp: ownedPokemon.maxHp,
    attack: ownedPokemon.calculatedStats.attack,
    defense: ownedPokemon.calculatedStats.defense,
    specialAttack: ownedPokemon.calculatedStats.spAttack,
    specialDefense: ownedPokemon.calculatedStats.spDefense,
    speed: ownedPokemon.calculatedStats.speed,
    types: [], // TODO: Récupérer depuis base données Pokémon
    moves: ownedPokemon.moves.map(m => m.moveId),
    status: ownedPokemon.status as string,
    gender: ownedPokemon.gender,
    shiny: ownedPokemon.shiny,
    isWild: false
  };
}

/**
 * 🔧 WRAPPER COMPATIBILITÉ - utilise createPokemonTeam universel
 */
export { createPokemonTeam as createTrainerPokemonTeamUniversal };

/**
 * Mappe les phases dresseurs vers phases universelles
 */
export function mapTrainerPhaseToInternal(trainerPhase: TrainerBattlePhase): InternalBattlePhase {
  switch (trainerPhase) {
    case TrainerBattlePhase.INTRO:
      return InternalBattlePhase.INTRO;
    case TrainerBattlePhase.POKEMON_SELECTION:
    case TrainerBattlePhase.ACTION_SELECTION:
      return InternalBattlePhase.ACTION_SELECTION;
    case TrainerBattlePhase.SWITCH_PHASE:
      return InternalBattlePhase.SWITCH_PHASE;        // 🔧 UTILISE PHASE UNIVERSELLE
    case TrainerBattlePhase.FORCED_SWITCH:
      return InternalBattlePhase.FORCED_SWITCH;       // 🔧 UTILISE PHASE UNIVERSELLE
    case TrainerBattlePhase.ACTION_RESOLUTION:
      return InternalBattlePhase.ACTION_RESOLUTION;
    case TrainerBattlePhase.VICTORY_SEQUENCE:
    case TrainerBattlePhase.ENDED:
      return InternalBattlePhase.ENDED;
    default:
      return InternalBattlePhase.ACTION_SELECTION;
  }
}

// === VALIDATION & GUARDS (CORRIGÉS) ===

/**
 * Vérifie si une config est pour combat dresseur
 */
export function isTrainerBattleConfig(config: BattleConfig): config is TrainerBattleConfig {
  return config.type === 'trainer' && 'trainer' in config;
}

/**
 * 🔧 CORRECTION - Vérifie si un état est pour combat dresseur  
 */
export function isTrainerGameState(state: BattleGameState): boolean {
  // 🔧 CORRECTION : plus de type guard strict à cause des différences de structure
  // Utilise une vérification booléenne simple
  return state.type === 'trainer';
}

/**
 * 🔧 UTILISE isSwitchAction universel
 */
export { isSwitchAction } from './BattleTypes';

// === CONSTANTES (CONSERVÉES) ===

export const TRAINER_BATTLE_CONSTANTS = {
  MAX_POKEMON_PER_TEAM: 6,
  MIN_POKEMON_PER_TEAM: 1,
  MAX_SWITCHES_PER_TURN: 1,
  DEFAULT_SWITCH_COOLDOWN: 0,
  SWITCH_PRIORITY: 6,        
  FORCED_SWITCH_TIME_LIMIT: 30000, 
  
  AI_DIFFICULTY_MODIFIERS: {
    easy: { switchChance: 0.1, predictiveDepth: 1 },
    normal: { switchChance: 0.3, predictiveDepth: 2 },
    hard: { switchChance: 0.5, predictiveDepth: 3 },
    expert: { switchChance: 0.7, predictiveDepth: 4 }
  },
  
  REWARD_BASE_MULTIPLIERS: {
    youngster: 1.0,
    trainer: 1.2,
    gym_leader: 2.0,
    elite_four: 3.0,
    champion: 5.0
  }
} as const;

// === 🔧 HELPERS DE MIGRATION ===

/**
 * Convertit TrainerBattleRules vers TeamConfiguration universelle
 */
export function trainerRulesToTeamConfig(trainerRules: TrainerBattleRules): TeamConfiguration {
  return {
    allowSwitching: trainerRules.allowSwitching,
    maxSwitchesPerTurn: trainerRules.maxSwitchesPerTurn,
    switchCooldown: trainerRules.switchCooldown,
    forceSwitch: trainerRules.forceSwitch
  };
}

/**
 * Convertit TeamConfiguration vers TrainerBattleRules
 */
export function teamConfigToTrainerRules(
  teamConfig: TeamConfiguration, 
  itemsAllowed: boolean = false,
  megaEvolution: boolean = false
): TrainerBattleRules {
  return {
    ...teamConfig,
    itemsAllowed,
    megaEvolution
  };
}

// === EXPORTS POUR COMPATIBILITÉ ===

// Réexporter les types universels pour éviter imports multiples
export {
  BattleType,
  BattlePhase, 
  PlayerRole,
  Pokemon,
  BattleConfig,
  BattleGameState,
  BattleAction,
  BattleResult,
  InternalBattlePhase,
  // 🆕 TYPES UNIVERSELS
  PokemonTeam,
  TeamConfiguration,
  SwitchAction,
  createSwitchAction,
  getDefaultTeamConfig
} from './BattleTypes';
