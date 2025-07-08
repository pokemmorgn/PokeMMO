// server/src/battle/config/BattleConfig.ts
// Configuration centralisée pour tous les timings et constantes de combat

/**
 * BATTLE CONFIG - Configuration centralisée
 * 
 * Avantages :
 * - Un seul endroit pour tous les timings
 * - Facile à modifier pour équilibrage
 * - Cohérence entre tous les modules
 * - Facilite les tests avec différents timings
 */

// === TIMINGS GÉNÉRAUX ===
export const BATTLE_TIMINGS = {
  // Délais d'actions
  AI_THINKING_MIN: 1500,      // IA réfléchit minimum 1.5s
  AI_THINKING_MAX: 3500,      // IA réfléchit maximum 3.5s
  PLAYER_ACTION_TIMEOUT: 30000, // Joueur a 30s pour agir
  
  // Animations
  ATTACK_ANIMATION: 1000,     // Durée animation attaque
  DAMAGE_ANIMATION: 800,      // Durée animation dégâts
  FAINT_ANIMATION: 1500,      // Durée animation K.O.
  MESSAGE_DISPLAY: 2000,      // Durée affichage message
  
  // Transitions
  TURN_TRANSITION: 500,       // Délai changement de tour
  BATTLE_START_DELAY: 1000,   // Délai avant premier tour
  BATTLE_END_DELAY: 3000,     // Délai avant fermeture combat
  
  // Capture (pour plus tard)
  CAPTURE_THROW: 1000,
  CAPTURE_SHAKE: 800,
  CAPTURE_SUCCESS: 2000,
  
  // Changement Pokémon (pour plus tard)
  SWITCH_OUT: 1000,
  SWITCH_IN: 1000,
} as const;

// === CONSTANTES DE COMBAT ===
export const BATTLE_CONSTANTS = {
  // Limites
  MAX_TURNS: 1000,            // Maximum de tours avant match nul
  MAX_POKEMON_PER_TEAM: 6,    // Maximum de Pokémon par équipe
  MAX_MOVES_PER_POKEMON: 4,   // Maximum d'attaques par Pokémon
  
  // Probabilités
  CRITICAL_HIT_CHANCE: 0.0625, // 1/16 chance coup critique
  ACCURACY_BASE: 100,         // Précision de base
  
  // Dégâts
  MIN_DAMAGE: 1,              // Dégâts minimum
  SAME_TYPE_ATTACK_BONUS: 1.5, // Bonus STAB
  
  // Niveaux
  MIN_LEVEL: 1,
  MAX_LEVEL: 100,
  
  // Stats
  MIN_STAT: 1,
  MAX_STAT: 999,
} as const;

// === MESSAGES DE COMBAT ===
export const BATTLE_MESSAGES = {
  // Début/Fin
  BATTLE_START: "Le combat commence !",
  BATTLE_END_VICTORY: "Vous avez gagné !",
  BATTLE_END_DEFEAT: "Vous avez perdu !",
  BATTLE_END_DRAW: "Match nul !",
  
  // Actions
  ATTACK_MISS: "{attacker} rate son attaque !",
  ATTACK_HIT: "{attacker} utilise {move} !",
  CRITICAL_HIT: "Coup critique !",
  SUPER_EFFECTIVE: "C'est super efficace !",
  NOT_VERY_EFFECTIVE: "Ce n'est pas très efficace...",
  NO_EFFECT: "Ça n'a aucun effet !",
  
  // États
  POKEMON_FAINTED: "{pokemon} est mis K.O. !",
  POKEMON_PARALYZED: "{pokemon} est paralysé !",
  POKEMON_POISONED: "{pokemon} est empoisonné !",
  
  // Erreurs
  NO_MOVES: "{pokemon} n'a plus d'attaques !",
  INVALID_TARGET: "Cible invalide !",
  NOT_YOUR_TURN: "Ce n'est pas votre tour !",
} as const;

// === TYPES D'EFFICACITÉ ===
export const TYPE_EFFECTIVENESS = {
  SUPER_EFFECTIVE: 2.0,
  NORMAL: 1.0,
  NOT_VERY_EFFECTIVE: 0.5,
  NO_EFFECT: 0.0,
} as const;

// === CONFIGURATION MODES DE JEU ===
export const GAME_MODES = {
  // Mode normal
  NORMAL: {
    timings: BATTLE_TIMINGS,
    constants: BATTLE_CONSTANTS,
    aiEnabled: true,
    captureEnabled: true,
    runEnabled: true,
  },
  
  // Mode rapide (pour tests)
  FAST: {
    timings: {
      ...BATTLE_TIMINGS,
      AI_THINKING_MIN: 200,
      AI_THINKING_MAX: 500,
      ATTACK_ANIMATION: 200,
      DAMAGE_ANIMATION: 200,
      MESSAGE_DISPLAY: 500,
    },
    constants: BATTLE_CONSTANTS,
    aiEnabled: true,
    captureEnabled: true,
    runEnabled: true,
  },
  
  // Mode debug (instantané)
  DEBUG: {
    timings: {
      ...BATTLE_TIMINGS,
      AI_THINKING_MIN: 0,
      AI_THINKING_MAX: 100,
      ATTACK_ANIMATION: 0,
      DAMAGE_ANIMATION: 0,
      MESSAGE_DISPLAY: 100,
    },
    constants: BATTLE_CONSTANTS,
    aiEnabled: true,
    captureEnabled: true,
    runEnabled: true,
  },
} as const;

// === CONFIGURATION ACTIVE ===
// Changer ici pour basculer entre les modes
export const CURRENT_MODE = 'NORMAL'; // 'NORMAL' | 'FAST' | 'DEBUG'

// === EXPORTS UTILITAIRES ===

/**
 * Récupère la configuration actuelle
 */
export function getCurrentConfig() {
  return GAME_MODES[CURRENT_MODE as keyof typeof GAME_MODES];
}

/**
 * Récupère les timings actuels
 */
export function getTimings() {
  return getCurrentConfig().timings;
}

/**
 * Récupère les constantes actuelles
 */
export function getConstants() {
  return getCurrentConfig().constants;
}

/**
 * Récupère un timing spécifique
 */
export function getTiming(key: keyof typeof BATTLE_TIMINGS): number {
  return getTimings()[key];
}

/**
 * Récupère une constante spécifique
 */
export function getConstant(key: keyof typeof BATTLE_CONSTANTS): number {
  return getConstants()[key];
}

/**
 * Calcule un délai d'IA aléatoire
 */
export function getRandomAIDelay(): number {
  const timings = getTimings();
  const min = timings.AI_THINKING_MIN;
  const max = timings.AI_THINKING_MAX;
  return min + Math.random() * (max - min);
}

/**
 * Vérifie si une fonctionnalité est activée
 */
export function isFeatureEnabled(feature: 'aiEnabled' | 'captureEnabled' | 'runEnabled'): boolean {
  return getCurrentConfig()[feature];
}

export default {
  BATTLE_TIMINGS,
  BATTLE_CONSTANTS,
  BATTLE_MESSAGES,
  TYPE_EFFECTIVENESS,
  GAME_MODES,
  getCurrentConfig,
  getTimings,
  getConstants,
  getTiming,
  getConstant,
  getRandomAIDelay,
  isFeatureEnabled,
};
