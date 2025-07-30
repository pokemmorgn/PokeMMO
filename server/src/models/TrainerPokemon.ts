// server/src/models/TrainerPokemon.ts
// Interface et types pour les Pokémon des équipes de dresseurs

// ===== INTERFACES =====

// Interface pour les stats d'un Pokémon (cohérence avec OwnedPokemon)
export interface IPokemonStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

// Interface principale pour un Pokémon de dresseur
export interface ITrainerPokemon {
  // === IDENTIFICATION ===
  species: number;              // ID du Pokémon (1 = Bulbasaur, etc.)
  level: number;                // Niveau du Pokémon (1-100)
  
  // === CARACTÉRISTIQUES ===
  nature: string;               // Nature (adamant, modest, etc.)
  ability: string;              // Capacité du Pokémon
  gender?: "Male" | "Female" | "Genderless"; // Genre (optionnel, sinon aléatoire)
  shiny?: boolean;              // Pokémon shiny (optionnel, défaut: false)
  
  // === ATTAQUES ===
  moves: string[];              // Liste des attaques (1-4)
  
  // === STATS ===
  ivs: IPokemonStats;           // Valeurs individuelles (0-31)
  evs: IPokemonStats;           // Points d'effort (0-252, max 510 total)
  
  // === ÉQUIPEMENT ===
  heldItem?: string;            // Objet tenu (optionnel)
  
  // === MÉTADONNÉES (pour génération) ===
  nickname?: string;            // Surnom personnalisé (optionnel)
  pokeball?: string;            // Type de Ball (optionnel, défaut: "poke_ball")
  originalTrainer?: string;     // Nom du dresseur original (pour identification)
}

// ===== TYPES UTILITAIRES =====

// Type pour créer un Pokémon de dresseur (champs requis seulement)
export type CreateTrainerPokemonData = {
  species: number;
  level: number;
  nature: string;
  ability: string;
  moves: string[];
  ivs: IPokemonStats;
  evs: IPokemonStats;
  gender?: "Male" | "Female" | "Genderless";
  shiny?: boolean;
  heldItem?: string;
  nickname?: string;
  pokeball?: string;
  originalTrainer?: string;
};

// Type pour un Pokémon avec stats calculées (pour aperçu)
export interface TrainerPokemonWithStats extends ITrainerPokemon {
  calculatedStats: {
    hp: number;
    attack: number;
    defense: number;
    spAttack: number;
    spDefense: number;
    speed: number;
  };
  estimatedCP?: number;         // Combat Power estimé (optionnel)
}

// ===== CONSTANTES DE VALIDATION =====

export const TRAINER_POKEMON_CONSTRAINTS = {
  MIN_LEVEL: 1,
  MAX_LEVEL: 100,
  MIN_IV: 0,
  MAX_IV: 31,
  MIN_EV: 0,
  MAX_EV: 252,
  MAX_TOTAL_EVS: 510,
  MIN_MOVES: 1,
  MAX_MOVES: 4,
  MAX_SPECIES_ID: 1025,        // Ajuster selon votre Pokédex
  MAX_NICKNAME_LENGTH: 12,
  MAX_ABILITY_LENGTH: 50,
  MAX_MOVE_LENGTH: 30,
  MAX_ITEM_LENGTH: 50
} as const;

// ===== FONCTIONS DE VALIDATION =====

/**
 * Valide un Pokémon de dresseur
 */
export function validateTrainerPokemon(pokemon: ITrainerPokemon): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const c = TRAINER_POKEMON_CONSTRAINTS;
  
  // Validation espèce
  if (!pokemon.species || pokemon.species < 1 || pokemon.species > c.MAX_SPECIES_ID) {
    errors.push(`Species ID invalide: ${pokemon.species} (doit être entre 1 et ${c.MAX_SPECIES_ID})`);
  }
  
  // Validation niveau
  if (!pokemon.level || pokemon.level < c.MIN_LEVEL || pokemon.level > c.MAX_LEVEL) {
    errors.push(`Niveau invalide: ${pokemon.level} (doit être entre ${c.MIN_LEVEL} et ${c.MAX_LEVEL})`);
  }
  
  // Validation nature
  if (!pokemon.nature || pokemon.nature.trim().length === 0) {
    errors.push('Nature requise');
  }
  
  // Validation capacité
  if (!pokemon.ability || pokemon.ability.trim().length === 0) {
    errors.push('Capacité requise');
  } else if (pokemon.ability.length > c.MAX_ABILITY_LENGTH) {
    errors.push(`Nom de capacité trop long: ${pokemon.ability.length}/${c.MAX_ABILITY_LENGTH}`);
  }
  
  // Validation attaques
  if (!Array.isArray(pokemon.moves) || pokemon.moves.length < c.MIN_MOVES || pokemon.moves.length > c.MAX_MOVES) {
    errors.push(`Nombre d'attaques invalide: ${pokemon.moves?.length || 0} (doit être entre ${c.MIN_MOVES} et ${c.MAX_MOVES})`);
  } else {
    // Vérifier unicité des attaques
    const uniqueMoves = [...new Set(pokemon.moves)];
    if (uniqueMoves.length !== pokemon.moves.length) {
      errors.push('Les attaques doivent être uniques');
    }
    
    // Vérifier longueur des noms d'attaques
    pokemon.moves.forEach((move, index) => {
      if (!move || move.trim().length === 0) {
        errors.push(`Attaque ${index + 1} vide`);
      } else if (move.length > c.MAX_MOVE_LENGTH) {
        errors.push(`Nom d'attaque trop long: ${move} (${move.length}/${c.MAX_MOVE_LENGTH})`);
      }
    });
  }
  
  // Validation IVs
  if (!pokemon.ivs) {
    errors.push('IVs requis');
  } else {
    Object.entries(pokemon.ivs).forEach(([stat, value]) => {
      if (typeof value !== 'number' || value < c.MIN_IV || value > c.MAX_IV) {
        errors.push(`IV ${stat} invalide: ${value} (doit être entre ${c.MIN_IV} et ${c.MAX_IV})`);
      }
    });
  }
  
  // Validation EVs
  if (!pokemon.evs) {
    errors.push('EVs requis');
  } else {
    let totalEvs = 0;
    Object.entries(pokemon.evs).forEach(([stat, value]) => {
      if (typeof value !== 'number' || value < c.MIN_EV || value > c.MAX_EV) {
        errors.push(`EV ${stat} invalide: ${value} (doit être entre ${c.MIN_EV} et ${c.MAX_EV})`);
      }
      totalEvs += value;
    });
    
    if (totalEvs > c.MAX_TOTAL_EVS) {
      errors.push(`Total EVs trop élevé: ${totalEvs}/${c.MAX_TOTAL_EVS}`);
    }
  }
  
  // Validation genre (optionnel)
  if (pokemon.gender && !['Male', 'Female', 'Genderless'].includes(pokemon.gender)) {
    errors.push(`Genre invalide: ${pokemon.gender}`);
  }
  
  // Validation surnom (optionnel)
  if (pokemon.nickname && pokemon.nickname.length > c.MAX_NICKNAME_LENGTH) {
    errors.push(`Surnom trop long: ${pokemon.nickname.length}/${c.MAX_NICKNAME_LENGTH}`);
  }
  
  // Validation objet tenu (optionnel)
  if (pokemon.heldItem && pokemon.heldItem.length > c.MAX_ITEM_LENGTH) {
    errors.push(`Nom d'objet trop long: ${pokemon.heldItem.length}/${c.MAX_ITEM_LENGTH}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valide une équipe de Pokémon de dresseur
 */
export function validateTrainerPokemonTeam(pokemon: ITrainerPokemon[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validation taille équipe
  if (!Array.isArray(pokemon) || pokemon.length === 0 || pokemon.length > 6) {
    errors.push(`Taille d'équipe invalide: ${pokemon?.length || 0} (doit être entre 1 et 6)`);
    return { valid: false, errors };
  }
  
  // Validation chaque Pokémon
  pokemon.forEach((pkmn, index) => {
    const validation = validateTrainerPokemon(pkmn);
    if (!validation.valid) {
      errors.push(`Pokémon ${index + 1}: ${validation.errors.join(', ')}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ===== FONCTIONS UTILITAIRES =====

/**
 * Crée un Pokémon de dresseur avec valeurs par défaut
 */
export function createTrainerPokemon(data: Partial<CreateTrainerPokemonData>): ITrainerPokemon {
  return {
    species: data.species || 1,
    level: data.level || 50,
    nature: data.nature || 'hardy',
    ability: data.ability || 'default',
    moves: data.moves || ['tackle'],
    ivs: data.ivs || {
      hp: 31, attack: 31, defense: 31,
      spAttack: 31, spDefense: 31, speed: 31
    },
    evs: data.evs || {
      hp: 0, attack: 0, defense: 0,
      spAttack: 0, spDefense: 0, speed: 0
    },
    gender: data.gender,
    shiny: data.shiny || false,
    heldItem: data.heldItem,
    nickname: data.nickname,
    pokeball: data.pokeball || 'poke_ball',
    originalTrainer: data.originalTrainer
  };
}

/**
 * Clone un Pokémon de dresseur
 */
export function cloneTrainerPokemon(pokemon: ITrainerPokemon): ITrainerPokemon {
  return {
    ...pokemon,
    moves: [...pokemon.moves],
    ivs: { ...pokemon.ivs },
    evs: { ...pokemon.evs }
  };
}

/**
 * Calcule les stats d'un Pokémon de dresseur (approximatif)
 * Note: Cette fonction nécessite les données de base du Pokémon (baseStats)
 */
export function calculateTrainerPokemonStats(
  pokemon: ITrainerPokemon,
  baseStats: IPokemonStats
): IPokemonStats {
  const calculateStat = (
    statName: keyof IPokemonStats,
    baseStat: number,
    isHP: boolean = false
  ): number => {
    const iv = pokemon.ivs[statName] || 0;
    const ev = pokemon.evs[statName] || 0;
    
    if (isHP) {
      return Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * pokemon.level) / 100) + pokemon.level + 10;
    } else {
      let stat = Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * pokemon.level) / 100) + 5;
      
      // Application de la nature (approximative - à adapter selon vos données de natures)
      // Exemple basique : certaines natures modifient les stats
      // TODO: Intégrer votre système de natures existant
      
      return stat;
    }
  };
  
  return {
    hp: calculateStat('hp', baseStats.hp, true),
    attack: calculateStat('attack', baseStats.attack),
    defense: calculateStat('defense', baseStats.defense),
    spAttack: calculateStat('spAttack', baseStats.spAttack),
    spDefense: calculateStat('spDefense', baseStats.spDefense),
    speed: calculateStat('speed', baseStats.speed)
  };
}

/**
 * Génère un résumé d'un Pokémon de dresseur
 */
export function getTrainerPokemonSummary(pokemon: ITrainerPokemon): string {
  const shinyPrefix = pokemon.shiny ? '✨ ' : '';
  const nickname = pokemon.nickname ? `"${pokemon.nickname}"` : `Pokémon #${pokemon.species}`;
  const level = `Niv. ${pokemon.level}`;
  const nature = pokemon.nature.charAt(0).toUpperCase() + pokemon.nature.slice(1);
  const item = pokemon.heldItem ? ` @ ${pokemon.heldItem}` : '';
  
  return `${shinyPrefix}${nickname} (${level}, ${nature})${item}`;
}

// ===== EXPORT PAR DÉFAUT =====
export default {
  validateTrainerPokemon,
  validateTrainerPokemonTeam,
  createTrainerPokemon,
  cloneTrainerPokemon,
  calculateTrainerPokemonStats,
  getTrainerPokemonSummary,
  TRAINER_POKEMON_CONSTRAINTS
};
