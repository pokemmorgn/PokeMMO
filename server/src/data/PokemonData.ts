// src/data/PokemonData.ts
import pokemonIndex from './pokemon/pokemon-index.json';

// Types pour la structure de vos données
interface PokemonMove {
  moveId: string;
  level: number;
}

interface PokemonData {
  id: number;
  name: string;
  types: string[];
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  abilities: string[];
  hiddenAbility?: string | null;
  learnset: PokemonMove[];
  genderRatio: {
    male: number;
    female: number;
  };
  evolution?: {
    canEvolve: boolean;
    evolvesInto?: number;
    evolvesFrom?: number;
    method?: string;
    requirement?: string | number;
  };
}

interface PokemonFamily {
  family: string;
  region: string;
  pokemon: PokemonData[];
}

// Cache pour éviter de recharger les mêmes fichiers
const familyCache = new Map<string, PokemonFamily>();

/**
 * Charge une famille de Pokémon depuis le JSON
 */
async function loadPokemonFamily(familyPath: string): Promise<PokemonFamily | null> {
  if (familyCache.has(familyPath)) {
    return familyCache.get(familyPath)!;
  }

  try {
    // Import dynamique des fichiers de famille
    const familyData = await import(`./pokemon/${familyPath}.json`);
    familyCache.set(familyPath, familyData.default);
    return familyData.default;
  } catch (error) {
    console.error(`Erreur lors du chargement de ${familyPath}:`, error);
    return null;
  }
}

/**
 * Trouve un Pokémon par son ID
 */
export async function getPokemonById(pokemonId: number): Promise<PokemonData | null> {
  const familyPath = pokemonIndex[pokemonId.toString() as keyof typeof pokemonIndex];
  if (!familyPath) {
    console.error(`Pokémon ID ${pokemonId} non trouvé dans l'index`);
    return null;
  }

  const family = await loadPokemonFamily(familyPath);
  if (!family) {
    return null;
  }

  return family.pokemon.find(p => p.id === pokemonId) || null;
}

/**
 * Récupère les moves qu'un Pokémon apprend au niveau 1
 */
export async function getStarterMoves(pokemonId: number): Promise<string[]> {
  const pokemon = await getPokemonById(pokemonId);
  if (!pokemon) {
    console.warn(`Pokémon ${pokemonId} non trouvé, utilisation des moves par défaut`);
    return ["tackle", "growl"];
  }

  // Récupère tous les moves de niveau 1
  const level1Moves = pokemon.learnset
    .filter(move => move.level === 1)
    .map(move => move.moveId);

  // Si aucun move de niveau 1, retourne des moves par défaut
  if (level1Moves.length === 0) {
    console.warn(`Aucun move de niveau 1 pour ${pokemon.name}, utilisation des moves par défaut`);
    return ["tackle", "growl"];
  }

  return level1Moves;
}

/**
 * Récupère les moves qu'un Pokémon peut apprendre jusqu'à un certain niveau
 */
export async function getMovesUpToLevel(pokemonId: number, maxLevel: number): Promise<string[]> {
  const pokemon = await getPokemonById(pokemonId);
  if (!pokemon) {
    return ["tackle", "growl"];
  }

  return pokemon.learnset
    .filter(move => move.level <= maxLevel)
    .map(move => move.moveId);
}

/**
 * Génère un genre aléatoire basé sur les ratios du Pokémon
 */
export async function generateRandomGender(pokemonId: number): Promise<string> {
  const pokemon = await getPokemonById(pokemonId);
  if (!pokemon) {
    // Genre par défaut 50/50
    return Math.random() < 0.5 ? "male" : "female";
  }

  const { genderRatio } = pokemon;
  
  // Pokémon sans genre (comme Magnemite)
  if (genderRatio.male === 0 && genderRatio.female === 0) {
    return "unknown";
  }

  // Utilise le ratio réel du Pokémon
  const maleChance = genderRatio.male / 100;
  return Math.random() < maleChance ? "male" : "female";
}

/**
 * Récupère toutes les données d'un Pokémon
 */
export async function getPokemonData(pokemonId: number): Promise<PokemonData | null> {
  return getPokemonById(pokemonId);
}

/**
 * Vérifie si un Pokémon peut évoluer
 */
export async function canPokemonEvolve(pokemonId: number): Promise<boolean> {
  const pokemon = await getPokemonById(pokemonId);
  return pokemon?.evolution?.canEvolve || false;
}

/**
 * Récupère l'évolution d'un Pokémon
 */
export async function getEvolutionData(pokemonId: number) {
  const pokemon = await getPokemonById(pokemonId);
  return pokemon?.evolution || null;
}
