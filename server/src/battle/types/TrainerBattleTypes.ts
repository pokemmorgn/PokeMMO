// server/src/battle/types/TrainerBattleTypes.ts
// 🎯 EXTENSIONS TYPES POUR COMBATS DRESSEURS - COMPATIBLE SYSTÈME EXISTANT

import { 
  BattleType, 
  BattlePhase, 
  PlayerRole, 
  Pokemon, 
  BattleConfig, 
  BattleGameState, 
  BattleAction, 
  BattleResult,
  InternalBattlePhase 
} from './BattleTypes';
import { IOwnedPokemon } from '../../models/OwnedPokemon';
import mongoose from 'mongoose';

// === NOUVELLES PHASES POUR DRESSEURS ===

export enum TrainerBattlePhase {
  // Phases existantes (compatibilité)
  INTRO = 'intro',
  ACTION_SELECTION = 'action_selection', 
  ACTION_RESOLUTION = 'action_resolution',
  CAPTURE = 'capture',
  ENDED = 'ended',
  
  // 🆕 NOUVELLES PHASES DRESSEURS
  POKEMON_SELECTION = 'pokemon_selection',    // Choix Pokémon initial (automatique)
  SWITCH_PHASE = 'switch_phase',             // Changement de Pokémon
  FORCED_SWITCH = 'forced_switch',           // Changement forcé (KO)
  VICTORY_SEQUENCE = 'victory_sequence'      // Séquence de victoire + récompenses
}

// === TYPES ÉQUIPES MULTIPLES ===

export interface TrainerPokemonTeam {
  pokemon: Pokemon[];           // Équipe complète (1-6 Pokémon)
  activePokemonIndex: number;   // Index Pokémon actuel au combat
  remainingPokemon: number;     // Nombre de Pokémon encore valides
  canSwitch: boolean;          // Peut faire des changements
  lastSwitchTurn?: number;     // Dernier tour de changement
}

export interface TrainerData {
  trainerId: string;           // ID unique dresseur
  name: string;               // Nom du dresseur
  trainerClass: string;       // Type: 'youngster', 'gym_leader', 'elite_four'
  level: number;              // Niveau du dresseur (influence IA)
  pokemon: Pokemon[];         // Équipe complète
  aiProfile: TrainerAIProfile; // Profil d'IA
  rewards: TrainerRewards;    // Récompenses à donner
  dialogue?: TrainerDialogue; // Dialogues avant/après combat
  specialRules?: TrainerBattleRules; // Règles spéciales
}

export interface TrainerAIProfile {
  difficulty: 'easy' | 'normal' | 'hard' | 'expert';
  strategies: TrainerStrategy[];
  switchPatterns: SwitchPattern[];
  aggressiveness: number;     // 0-100 (conservateur vs agressif)
  intelligence: number;       // 0-100 (prédiction des coups)
  memory: boolean;           // Se souvient des combats précédents
}

export interface TrainerStrategy {
  name: string;              // 'type_advantage', 'hp_preservation', 'setup_sweep'
  priority: number;          // 0-100 priorité de cette stratégie
  conditions: string[];      // Conditions d'activation
  actions: string[];         // Actions à prendre
}

export interface SwitchPattern {
  trigger: 'hp_low' | 'type_disadvantage' | 'status_inflicted' | 'setup_complete';
  threshold?: number;        // Seuil HP pour hp_low
  targetSelection: 'random' | 'type_advantage' | 'fastest' | 'specific';
  specificPokemonIndex?: number;
}

export interface TrainerRewards {
  baseMoney: number;         // Argent de base
  moneyMultiplier: number;   // Multiplicateur selon niveau
  baseExp: number;           // EXP de base par Pokémon vaincu
  expMultiplier: number;     // Multiplicateur EXP
  items?: TrainerRewardItem[]; // Objets à donner (optionnel)
}

export interface TrainerRewardItem {
  itemId: string;
  quantity: number;
  chance: number;            // 0-1 probabilité de donner l'objet
}

export interface TrainerDialogue {
  prebattle?: string[];     // Dialogues avant combat
  midBattle?: string[];     // Dialogues en cours (optionnel) 
  victory?: string[];       // Dialogues si dresseur gagne
  defeat?: string[];        // Dialogues si dresseur perd
  rematch?: string[];       // Dialogues combat suivant
}

export interface TrainerBattleRules {
  allowSwitching: boolean;   // Autorise changements libres
  forceSwitch: boolean;      // Force changement si KO
  maxSwitchesPerTurn: number; // Limite changements par tour
  switchCooldown: number;    // Tours d'attente entre changements
  itemsAllowed: boolean;     // Dresseur peut utiliser objets
  megaEvolution: boolean;    // Méga-évolution autorisée (futur)
}

// === NOUVELLES CONFIGURATIONS ===

export interface TrainerBattleConfig extends Omit<BattleConfig, 'type' | 'opponent'> {
  type: 'trainer';          // Type spécifique
  trainer: TrainerData;     // Données complètes du dresseur
  playerTeam: Pokemon[];    // Équipe complète du joueur (pas juste 1)
  rules: TrainerBattleRules; // Règles spécifiques
}

export interface TrainerGameState extends Omit<BattleGameState, 'player2'> {
  // Remplacement player2 par trainer complet
  trainer: {
    sessionId: string;      // 'ai' ou ID du dresseur joueur (PvP futur)
    data: TrainerData;      // Données complètes
    team: TrainerPokemonTeam; // État de l'équipe
  };
  
  // Extension joueur avec équipe
  player1: {
    sessionId: string;
    name: string;
    team: TrainerPokemonTeam; // Équipe complète au lieu d'un seul Pokémon
  };
  
  // Nouvelles propriétés spécifiques dresseurs
  trainerPhase?: TrainerBattlePhase; // Phase interne dresseur
  switchRequests?: SwitchRequest[];   // Demandes de changement en attente
  lastRewards?: CalculatedRewards;    // Dernières récompenses calculées
  battleMemory?: BattleMemoryData;    // Données pour mémorisation IA
}

// === ACTIONS ÉTENDUES ===

export interface SwitchAction extends BattleAction {
  type: 'switch';
  data: {
    fromPokemonIndex: number;    // Index Pokémon actuel
    toPokemonIndex: number;      // Index Pokémon cible
    isForced: boolean;           // Changement forcé (KO) vs libre
    reason?: string;             // Raison du changement
  };
}

export interface SwitchRequest {
  playerRole: PlayerRole;
  fromIndex: number;
  toIndex: number;
  isForced: boolean;
  timestamp: number;
  processed: boolean;
}

// === RÉSULTATS ÉTENDUS ===

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

// === MÉMOIRE COMBAT (POUR IA) ===

export interface BattleMemoryData {
  battleId: string;
  playerId: string;
  trainerId: string;
  startTime: number;
  endTime?: number;
  turns: number;
  winner: PlayerRole | null;
  playerStrategy: string[];    // Stratégies détectées chez le joueur
  effectiveActions: string[];  // Actions qui ont bien marché
  playerWeaknesses: string[];  // Faiblesses détectées
  nextBattleHints: string[];   // Hints pour prochain combat
}

// === FACTORY & HELPERS ===

/**
 * Crée une configuration de combat dresseur depuis les données existantes
 */
export function createTrainerBattleConfig(
  playerSessionId: string,
  playerName: string,
  playerPokemon: Pokemon[], // Équipe complète depuis TeamManager
  trainerData: TrainerData
): TrainerBattleConfig {
  return {
    type: 'trainer',
    player1: {
      sessionId: playerSessionId,
      name: playerName,
      pokemon: playerPokemon[0] // Premier Pokémon pour compatibilité
    },
    trainer: trainerData,
    playerTeam: playerPokemon,
    rules: trainerData.specialRules || {
      allowSwitching: true,
      forceSwitch: true,
      maxSwitchesPerTurn: 1,
      switchCooldown: 0,
      itemsAllowed: false,
      megaEvolution: false
    }
  };
}

/**
 * Convertit IOwnedPokemon vers Pokemon pour le combat
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
 * Convertit une équipe TeamManager vers TrainerPokemonTeam
 */
export function createTrainerPokemonTeam(
  pokemon: Pokemon[],
  activePokemonIndex: number = 0
): TrainerPokemonTeam {
  const validPokemon = pokemon.filter(p => p.currentHp > 0);
  
  return {
    pokemon: pokemon,
    activePokemonIndex: Math.min(activePokemonIndex, pokemon.length - 1),
    remainingPokemon: validPokemon.length,
    canSwitch: validPokemon.length > 1,
    lastSwitchTurn: undefined
  };
}

/**
 * Mappe les phases dresses vers phases compatibles système existant
 */
export function mapTrainerPhaseToInternal(trainerPhase: TrainerBattlePhase): InternalBattlePhase {
  switch (trainerPhase) {
    case TrainerBattlePhase.INTRO:
      return InternalBattlePhase.INTRO;
    case TrainerBattlePhase.POKEMON_SELECTION:
    case TrainerBattlePhase.ACTION_SELECTION:
    case TrainerBattlePhase.SWITCH_PHASE:
    case TrainerBattlePhase.FORCED_SWITCH:
      return InternalBattlePhase.ACTION_SELECTION;
    case TrainerBattlePhase.ACTION_RESOLUTION:
      return InternalBattlePhase.ACTION_RESOLUTION;
    case TrainerBattlePhase.VICTORY_SEQUENCE:
    case TrainerBattlePhase.ENDED:
      return InternalBattlePhase.ENDED;
    default:
      return InternalBattlePhase.ACTION_SELECTION;
  }
}

// === VALIDATION & GUARDS ===

/**
 * Vérifie si une config est pour combat dresseur
 */
export function isTrainerBattleConfig(config: BattleConfig): config is TrainerBattleConfig {
  return config.type === 'trainer' && 'trainer' in config;
}

/**
 * Vérifie si un état est pour combat dresseur  
 */
export function isTrainerGameState(state: BattleGameState): state is TrainerGameState {
  return state.type === 'trainer' && 'trainer' in state;
}

/**
 * Vérifie si une action est un changement de Pokémon
 */
export function isSwitchAction(action: BattleAction): action is SwitchAction {
  return action.type === 'switch';
}

// === CONSTANTES ===

export const TRAINER_BATTLE_CONSTANTS = {
  MAX_POKEMON_PER_TEAM: 6,
  MIN_POKEMON_PER_TEAM: 1,
  MAX_SWITCHES_PER_TURN: 1,
  DEFAULT_SWITCH_COOLDOWN: 0,
  SWITCH_PRIORITY: 6,        // Priorité changement (avant attaques)
  FORCED_SWITCH_TIME_LIMIT: 30000, // 30s pour choisir après KO
  
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

// === EXPORTS POUR COMPATIBILITÉ ===

// Réexporter les types de base pour éviter imports multiples
export {
  BattleType,
  BattlePhase, 
  PlayerRole,
  Pokemon,
  BattleConfig,
  BattleGameState,
  BattleAction,
  BattleResult,
  InternalBattlePhase
} from './BattleTypes';

// Types principaux pour import externe
export type {
  TrainerData,
  TrainerBattleConfig,
  TrainerGameState,
  TrainerBattleResult,
  SwitchAction,
  TrainerPokemonTeam,
  CalculatedRewards
};
