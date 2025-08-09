// server/src/services/PokemonService.ts - Version mise à jour pour MongoDB

import { OwnedPokemon, IOwnedPokemon } from "../models/OwnedPokemon";
import { PlayerData } from "../models/PlayerData";
import { PokemonData, IPokemonData } from "../models/PokemonData"; // 🔄 NOUVEAU : Import du modèle MongoDB
import { HydratedDocument } from "mongoose";
import movesIndex from "../data/moves-index.json";
import abilitiesData from "../data/abilities.json";
import naturesData from "../data/natures.json";

// === FONCTIONS DE DONNÉES MISES À JOUR ===

/**
 * 🔄 NOUVEAU : Récupère un Pokémon depuis MongoDB au lieu du JSON
 */
async function getPokemonById(pokemonId: number): Promise<IPokemonData | null> {
  try {
    const pokemon = await PokemonData.findByNationalDex(pokemonId);
    return pokemon;
  } catch (error) {
    console.error(`❌ [PokemonService] Erreur récupération Pokémon #${pokemonId}:`, error);
    return null;
  }
}

/**
 * 🔄 NOUVEAU : Récupère les moves de départ depuis le nouveau système
 */
async function getStarterMoves(pokemonId: number): Promise<string[]> {
  try {
    const pokemon = await getPokemonById(pokemonId);
    if (!pokemon) return ['tackle']; // Fallback
    
    // Récupérer les moves de niveau 1 et 0 (moves de base)
    const starterMoves = pokemon.getMovesAtLevel(1);
    if (starterMoves.length === 0) {
      // Si pas de moves au niveau 1, prendre les moves de niveau 0
      const baseMoves = pokemon.getMovesAtLevel(0);
      if (baseMoves.length > 0) return baseMoves;
    }
    
    // S'assurer qu'on a au moins une attaque
    return starterMoves.length > 0 ? starterMoves : ['tackle'];
  } catch (error) {
    console.error(`❌ [PokemonService] Erreur getStarterMoves pour #${pokemonId}:`, error);
    return ['tackle'];
  }
}

/**
 * 🔄 NOUVEAU : Génère un genre aléatoire basé sur les vrais ratios du Pokémon
 */
async function generateRandomGender(pokemonId: number): Promise<string> {
  try {
    const pokemon = await getPokemonById(pokemonId);
    if (!pokemon) return 'Genderless';
    
    const { genderRatio } = pokemon;
    
    // Pokémon sans genre
    if (genderRatio.genderless) {
      return 'Genderless';
    }
    
    // Génération basée sur les vrais pourcentages
    const random = Math.random() * 100;
    if (random < genderRatio.male) {
      return 'Male';
    } else {
      return 'Female';
    }
  } catch (error) {
    console.error(`❌ [PokemonService] Erreur generateRandomGender pour #${pokemonId}:`, error);
    return 'Genderless';
  }
}

// === UTILITAIRES DE GÉNÉRATION ===

export function randomIVs(): any {
  return {
    hp: Math.floor(Math.random() * 32),
    attack: Math.floor(Math.random() * 32),
    defense: Math.floor(Math.random() * 32),
    spAttack: Math.floor(Math.random() * 32),
    spDefense: Math.floor(Math.random() * 32),
    speed: Math.floor(Math.random() * 32),
  };
}

export function randomNature(): string {
  const natures = Object.keys(naturesData);
  return natures[Math.floor(Math.random() * natures.length)];
}

export function randomShiny(odds: number = 4096): boolean {
  return Math.random() < (1 / odds);
}

async function getMovesWithPP(pokemonId: number, level: number = 1): Promise<Array<{
  moveId: string;
  currentPp: number;
  maxPp: number;
}>> {
  const moves = await getStarterMoves(pokemonId);
  return moves.slice(0, 4).map(moveId => ({
    moveId,
    currentPp: getMoveBasePP(moveId),
    maxPp: getMoveBasePP(moveId)
  }));
}

function toModelGender(gender: string | undefined): "Male" | "Female" | "Genderless" {
  if (!gender) return "Genderless";
  switch (gender.toLowerCase()) {
    case "male":
    case "m":
      return "Male";
    case "female":
    case "f":
      return "Female";
    case "genderless":
    case "none":
    case "n":
      return "Genderless";
    default:
      return "Genderless";
  }
}

function getMoveBasePP(moveId: string): number {
  const defaultPP: { [key: string]: number } = {
    normal: 35, fighting: 25, flying: 35, poison: 35,
    ground: 30, rock: 25, bug: 35, ghost: 15, steel: 25,
    fire: 25, water: 25, grass: 25, electric: 30,
    psychic: 20, ice: 25, dragon: 15, dark: 15, fairy: 25
  };
  const moveType = movesIndex[moveId as keyof typeof movesIndex] || "normal";
  return defaultPP[moveType] || 30;
}

/**
 * 🔄 NOUVEAU : Sélectionne une capacité depuis les vraies données du Pokémon
 */
async function selectPokemonAbility(pokemonId: number): Promise<string> {
  try {
    const pokemon = await getPokemonById(pokemonId);
    if (!pokemon || !pokemon.abilities.length) {
      return "run_away";
    }
    
    // 20% de chance d'avoir la capacité cachée si elle existe
    const useHidden = Math.random() < 0.2 && pokemon.hiddenAbility;
    if (useHidden && pokemon.hiddenAbility) {
      return pokemon.hiddenAbility;
    } else {
      const randomIndex = Math.floor(Math.random() * pokemon.abilities.length);
      return pokemon.abilities[randomIndex];
    }
  } catch (error) {
    console.error(`❌ [PokemonService] Erreur selectPokemonAbility pour #${pokemonId}:`, error);
    return "run_away";
  }
}

// === FONCTIONS PRINCIPALES ===

export async function createCompletePokemon(
  username: string,
  options: {
    pokemonId: number;
    level?: number;
    nature?: string;
    shiny?: boolean;
    nickname?: string;
    inTeam?: boolean;
    ivs?: any;
    ability?: string;
    gender?: string;
  }
): Promise<HydratedDocument<IOwnedPokemon>> {
  const playerData = await PlayerData.findOne({ username });
  if (!playerData) throw new Error("Joueur introuvable");

  const pokemonData = await getPokemonById(options.pokemonId);
  if (!pokemonData) throw new Error(`Pokémon ID ${options.pokemonId} introuvable`);

  // Génération des données
  const level = options.level || 1;
  const ivs = options.ivs || randomIVs();
  const nature = options.nature || randomNature();
  const isShiny = options.shiny !== undefined ? options.shiny : randomShiny();

  // --- Gestion du genre
  let genderRaw: string | undefined = undefined;
  if (options.gender) {
    genderRaw = options.gender;
  } else {
    genderRaw = await generateRandomGender(options.pokemonId);
  }
  const gender = toModelGender(genderRaw);
  console.log("[DEBUG createCompletePokemon GENDER]", { genderRaw, gender });

  const ability = options.ability || await selectPokemonAbility(options.pokemonId);
  const moves = await getMovesWithPP(options.pokemonId, level);

  // 🔄 NOUVEAU : Utiliser les vraies données pour le nickname par défaut
  const defaultNickname = options.nickname || pokemonData.nameKey.split('.').pop() || `Pokemon${options.pokemonId}`;

  // Création du Pokémon
  const pokemonDoc = new OwnedPokemon({
    owner: username,
    pokemonId: options.pokemonId,
    level,
    experience: getExperienceForLevel(level),
    nature,
    nickname: defaultNickname,
    shiny: isShiny,
    gender: ["Male", "Female", "Genderless"].includes(gender) ? gender : "Genderless",
    ability,
    ivs,
    evs: {
      hp: 0, attack: 0, defense: 0,
      spAttack: 0, spDefense: 0, speed: 0
    },
    moves,
    currentHp: 1, // Sera recalculé dans pre('save')
    maxHp: 1,     // Sera recalculé dans pre('save')
    status: 'normal',
    calculatedStats: {
      attack: 1, defense: 1, spAttack: 1,
      spDefense: 1, speed: 1
    },
    isInTeam: false,
    box: 0,
    friendship: pokemonData.baseHappiness || 70, // 🔄 NOUVEAU : Utiliser la vraie valeur
    pokeball: 'poke_ball',
    originalTrainer: username
  });

  // Sauvegarde (déclenche le calcul automatique des stats)
  await pokemonDoc.save();

  // Gestion de l'équipe si demandé
  if (options.inTeam) {
    const teamCount = await OwnedPokemon.countDocuments({
      owner: username,
      isInTeam: true
    });

    if (teamCount < 6) {
      pokemonDoc.isInTeam = true;
      pokemonDoc.slot = teamCount;
      pokemonDoc.box = undefined;
      pokemonDoc.boxSlot = undefined;

      // Met à jour PlayerData
      if (!Array.isArray(playerData.team)) {
        playerData.team = [];
      }
      playerData.team.push(pokemonDoc._id as any);
      await playerData.save();
      await pokemonDoc.save();
    } else {
      console.warn(`Équipe pleine pour ${username}, ${defaultNickname} envoyé au PC`);
    }
  }

  return pokemonDoc;
}

/**
 * 🔄 AMÉLIORÉ : Calcul de l'expérience basé sur le growth rate du Pokémon
 */
function getExperienceForLevel(level: number, growthRate: string = 'medium_fast'): number {
  if (level === 1) return 0;
  
  // Formules officielles par growth rate
  switch (growthRate) {
    case 'fast':
      return Math.floor((4 * Math.pow(level, 3)) / 5);
    case 'medium_fast':
      return Math.floor(Math.pow(level, 3));
    case 'medium_slow':
      return Math.floor((6 * Math.pow(level, 3)) / 5 - 15 * Math.pow(level, 2) + 100 * level - 140);
    case 'slow':
      return Math.floor((5 * Math.pow(level, 3)) / 4);
    case 'erratic':
      if (level <= 50) {
        return Math.floor((Math.pow(level, 3) * (100 - level)) / 50);
      } else if (level <= 68) {
        return Math.floor((Math.pow(level, 3) * (150 - level)) / 100);
      } else if (level <= 98) {
        return Math.floor((Math.pow(level, 3) * ((1911 - 10 * level) / 3)) / 500);
      } else {
        return Math.floor((Math.pow(level, 3) * (160 - level)) / 100);
      }
    case 'fluctuating':
      if (level <= 15) {
        return Math.floor(Math.pow(level, 3) * ((level + 1) / 3 + 24) / 50);
      } else if (level <= 35) {
        return Math.floor(Math.pow(level, 3) * (level + 14) / 50);
      } else {
        return Math.floor(Math.pow(level, 3) * (level / 2 + 32) / 50);
      }
    default:
      return Math.floor(Math.pow(level, 3)); // medium_fast par défaut
  }
}

export async function giveStarterToPlayer(
  username: string,
  starterId: 1 | 4 | 7
): Promise<HydratedDocument<IOwnedPokemon>> {
  const starterIVs = {
    hp: Math.floor(Math.random() * 16) + 15,
    attack: Math.floor(Math.random() * 16) + 15,
    defense: Math.floor(Math.random() * 16) + 15,
    spAttack: Math.floor(Math.random() * 16) + 15,
    spDefense: Math.floor(Math.random() * 16) + 15,
    speed: Math.floor(Math.random() * 16) + 15,
  };

  return createCompletePokemon(username, {
    pokemonId: starterId,
    level: 5,
    inTeam: true,
    shiny: randomShiny(8192),
    ivs: starterIVs
  });
}

/**
 * 🔄 NOUVEAU : Génération de Pokémon sauvage avec vraies données
 */
export async function generateWildPokemon(
  pokemonId: number,
  level: number,
  options: {
    minIVs?: number;
    maxIVs?: number;
    shinyOdds?: number;
    nature?: string;
  } = {}
): Promise<any> {
  const pokemonData = await getPokemonById(pokemonId);
  if (!pokemonData) throw new Error(`Pokémon ID ${pokemonId} introuvable`);

  const minIV = options.minIVs || 0;
  const maxIV = options.maxIVs || 31;
  
  const ivs = {
    hp: Math.floor(Math.random() * (maxIV - minIV + 1)) + minIV,
    attack: Math.floor(Math.random() * (maxIV - minIV + 1)) + minIV,
    defense: Math.floor(Math.random() * (maxIV - minIV + 1)) + minIV,
    spAttack: Math.floor(Math.random() * (maxIV - minIV + 1)) + minIV,
    spDefense: Math.floor(Math.random() * (maxIV - minIV + 1)) + minIV,
    speed: Math.floor(Math.random() * (maxIV - minIV + 1)) + minIV,
  };

  const nature = options.nature || randomNature();
  const isShiny = randomShiny(options.shinyOdds || 4096);
  const gender = await generateRandomGender(pokemonId);
  const ability = await selectPokemonAbility(pokemonId);
  const moves = await getMovesWithPP(pokemonId, level);

  // 🔄 NOUVEAU : Calcul des stats avec les vraies baseStats
  const stats = calculateWildPokemonStats(pokemonData.baseStats, level, ivs, nature);

  return {
    pokemonId,
    name: pokemonData.nameKey.split('.').pop() || `Pokemon${pokemonId}`, // 🔄 Extract name from key
    level,
    nature,
    shiny: isShiny,
    gender,
    ability,
    ivs,
    moves,
    currentHp: stats.hp,
    maxHp: stats.hp,
    status: 'normal',
    calculatedStats: {
      attack: stats.attack,
      defense: stats.defense,
      spAttack: stats.spAttack,
      spDefense: stats.spDefense,
      speed: stats.speed
    },
    types: pokemonData.types,
    baseStats: pokemonData.baseStats,
    // 🔄 NOUVEAU : Ajouter plus de métadonnées
    species: pokemonData.species,
    height: pokemonData.height,
    weight: pokemonData.weight,
    captureRate: pokemonData.captureRate
  };
}

/**
 * 🔄 AMÉLIORÉ : Calcul de stats avec les bonnes propriétés MongoDB
 */
function calculateWildPokemonStats(baseStats: any, level: number, ivs: any, nature: string): any {
  const natureData = naturesData[nature as keyof typeof naturesData];
  
  const calculateStat = (mongoStatName: string, gameStatName: string, isHP: boolean = false): number => {
    const baseStat = baseStats[mongoStatName] || 1;
    const iv = ivs[gameStatName] || 0;
    
    if (isHP) {
      return Math.floor(((2 * baseStat + iv) * level) / 100) + level + 10;
    } else {
      let stat = Math.floor(((2 * baseStat + iv) * level) / 100) + 5;
      if (natureData?.increased === gameStatName) {
        stat = Math.floor(stat * 1.1);
      } else if (natureData?.decreased === gameStatName) {
        stat = Math.floor(stat * 0.9);
      }
      return stat;
    }
  };

  return {
    hp: calculateStat('hp', 'hp', true),
    attack: calculateStat('attack', 'attack'),
    defense: calculateStat('defense', 'defense'),
    spAttack: calculateStat('specialAttack', 'spAttack'),
    spDefense: calculateStat('specialDefense', 'spDefense'),
    speed: calculateStat('speed', 'speed')
  };
}

/**
 * 🔄 AMÉLIORÉ : Évolution avec validation des données
 */
export async function evolvePokemon(
  pokemonId: string,
  newPokemonId: number
): Promise<IOwnedPokemon | null> {
  const pokemon = await OwnedPokemon.findById(pokemonId);
  if (!pokemon) return null;

  const newPokemonData = await getPokemonById(newPokemonId);
  if (!newPokemonData) return null;

  // Vérifier que l'évolution est valide
  const currentPokemonData = await getPokemonById(pokemon.pokemonId);
  if (currentPokemonData && currentPokemonData.evolution.canEvolve) {
    if (currentPokemonData.evolution.evolvesInto !== newPokemonId) {
      console.warn(`⚠️ [PokemonService] Évolution invalide: ${pokemon.pokemonId} ne peut pas évoluer en ${newPokemonId}`);
      return null;
    }
  }

  pokemon.pokemonId = newPokemonId;
  const newAbility = await selectPokemonAbility(newPokemonId);
  pokemon.ability = newAbility;
  
  // 🔄 NOUVEAU : Mettre à jour le nickname si c'était le nom par défaut
  const oldDefaultName = currentPokemonData?.nameKey.split('.').pop();
  if (pokemon.nickname === oldDefaultName) {
    pokemon.nickname = newPokemonData.nameKey.split('.').pop() || pokemon.nickname;
  }
  
  await pokemon.save();

  return pokemon;
}

/**
 * 🔄 AMÉLIORÉ : Gain d'expérience avec growth rate spécifique
 */
export async function gainExperience(
  pokemonId: string,
  expAmount: number
): Promise<{ leveledUp: boolean, newLevel?: number }> {
  const pokemon = await OwnedPokemon.findById(pokemonId);
  if (!pokemon) throw new Error("Pokémon introuvable");

  // 🔄 NOUVEAU : Récupérer le growth rate du Pokémon
  const pokemonData = await getPokemonById(pokemon.pokemonId);
  const growthRate = pokemonData?.growthRate || 'medium_fast';

  const oldLevel = pokemon.level;
  pokemon.experience += expAmount;

  let newLevel = calculateLevelFromExp(pokemon.experience, growthRate);
  if (newLevel > 100) newLevel = 100;

  const leveledUp = newLevel > oldLevel;
  if (leveledUp) {
    pokemon.level = newLevel;
  }

  await pokemon.save();

  return { leveledUp, newLevel: leveledUp ? newLevel : undefined };
}

/**
 * 🔄 NOUVEAU : Calcul de niveau depuis XP avec growth rate
 */
function calculateLevelFromExp(exp: number, growthRate: string = 'medium_fast'): number {
  if (exp === 0) return 1;
  
  for (let level = 1; level <= 100; level++) {
    const expForLevel = getExperienceForLevel(level, growthRate);
    const expForNextLevel = getExperienceForLevel(level + 1, growthRate);
    if (exp >= expForLevel && exp < expForNextLevel) {
      return level;
    }
  }
  return 100;
}

export async function healPokemonAtCenter(username: string): Promise<number> {
  const teamPokemon = await OwnedPokemon.find({
    owner: username,
    isInTeam: true
  });

  let healedCount = 0;
  for (const pokemon of teamPokemon) {
    if (pokemon.currentHp < pokemon.maxHp || pokemon.status !== 'normal') {
      pokemon.heal();
      await pokemon.save();
      healedCount++;
    }
  }
  return healedCount;
}

export async function givePokemonToPlayer(
  username: string,
  options: {
    pokemonId: number;
    level?: number;
    nature?: string;
    shiny?: boolean;
    nickname?: string;
    inTeam?: boolean;
    gender?: string;
  }
): Promise<HydratedDocument<IOwnedPokemon>> {
  return createCompletePokemon(username, options);
}

// === NOUVELLES FONCTIONS UTILITAIRES ===

/**
 * 🆕 NOUVEAU : Récupère tous les Pokémon disponibles
 */
export async function getAvailablePokemon(): Promise<IPokemonData[]> {
  try {
    return await PokemonData.find({ isActive: true, isObtainable: true }).sort({ nationalDex: 1 });
  } catch (error) {
    console.error(`❌ [PokemonService] Erreur getAvailablePokemon:`, error);
    return [];
  }
}

/**
 * 🆕 NOUVEAU : Vérifie si un Pokémon peut apprendre une attaque
 */
export async function canPokemonLearnMove(pokemonId: number, moveId: string): Promise<boolean> {
  try {
    const pokemon = await getPokemonById(pokemonId);
    if (!pokemon) return false;
    
    return pokemon.canLearnMove(moveId);
  } catch (error) {
    console.error(`❌ [PokemonService] Erreur canPokemonLearnMove:`, error);
    return false;
  }
}

/**
 * 🆕 NOUVEAU : Récupère les stats d'un Pokémon à un niveau donné
 */
export async function calculatePokemonStatsAtLevel(
  pokemonId: number, 
  level: number, 
  ivs?: any, 
  evs?: any, 
  nature?: string
): Promise<any> {
  try {
    const pokemon = await getPokemonById(pokemonId);
    if (!pokemon) return null;
    
    const stats: any = {};
    const statNames: (keyof typeof pokemon.baseStats)[] = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];
    
    for (const statName of statNames) {
      const iv = ivs?.[statName] || 31;
      const ev = evs?.[statName] || 0;
      stats[statName] = pokemon.calculateStatAtLevel(statName, level, iv, ev);
    }
    
    return stats;
  } catch (error) {
    console.error(`❌ [PokemonService] Erreur calculatePokemonStatsAtLevel:`, error);
    return null;
  }
}

/**
 * 🆕 NOUVEAU : Calcule l'XP donné par un Pokémon NPC vaincu
 */
export async function calculateXPYield(
  pokemonId: number, 
  pokemonLevel: number, 
  options: {
    isTrainer?: boolean;
    isShared?: boolean; // XP partagé avec Exp. Share
    participantCount?: number; // Nombre de Pokémon ayant participé
    playerLevel?: number; // Niveau du Pokémon joueur (pour ajustement)
    customMultiplier?: number; // Multiplicateur personnalisé
  } = {}
): Promise<{
  baseXP: number;
  totalXP: number;
  breakdown: {
    base: number;
    trainerBonus: number;
    levelAdjustment: number;
    shareAdjustment: number;
    finalMultiplier: number;
  };
}> {
  try {
    const pokemonData = await getPokemonById(pokemonId);
    if (!pokemonData) {
      return {
        baseXP: 0,
        totalXP: 0,
        breakdown: {
          base: 0,
          trainerBonus: 1,
          levelAdjustment: 1,
          shareAdjustment: 1,
          finalMultiplier: 1
        }
      };
    }
    
    // Utiliser baseExperienceYield en priorité (Gen 5+), sinon baseExperience (Gen 1-4)
    const baseXP = pokemonData.baseExperienceYield || pokemonData.baseExperience;
    
    // Calculs de multiplicateurs
    const trainerBonus = options.isTrainer ? 1.5 : 1.0;
    
    // Ajustement de niveau (formule officielle)
    let levelAdjustment = 1.0;
    if (options.playerLevel) {
      // Plus l'écart de niveau est grand, moins l'XP est importante
      const levelDifference = pokemonLevel - options.playerLevel;
      if (levelDifference > 0) {
        levelAdjustment = Math.min(1.2, 1.0 + (levelDifference * 0.05)); // Bonus si Pokémon ennemi plus fort
      } else {
        levelAdjustment = Math.max(0.5, 1.0 + (levelDifference * 0.1)); // Malus si Pokémon ennemi plus faible
      }
    }
    
    // Ajustement pour partage d'XP
    let shareAdjustment = 1.0;
    if (options.isShared && options.participantCount) {
      shareAdjustment = 1.0 / Math.sqrt(options.participantCount); // Racine carrée pour un partage équitable
    }
    
    // Multiplicateur final
    const finalMultiplier = (options.customMultiplier || 1.0) * trainerBonus * levelAdjustment * shareAdjustment;
    
    // Calcul final avec formule officielle
    const levelFactor = pokemonLevel / 7;
    const totalXP = Math.floor(baseXP * levelFactor * finalMultiplier);
    
    return {
      baseXP,
      totalXP: Math.max(1, totalXP), // Au minimum 1 XP
      breakdown: {
        base: baseXP,
        trainerBonus,
        levelAdjustment,
        shareAdjustment,
        finalMultiplier
      }
    };
    
  } catch (error) {
    console.error(`❌ [PokemonService] Erreur calculateXPYield:`, error);
    return {
      baseXP: 0,
      totalXP: 0,
      breakdown: {
        base: 0,
        trainerBonus: 1,
        levelAdjustment: 1,
        shareAdjustment: 1,
        finalMultiplier: 1
      }
    };
  }
}

/**
 * 🆕 NOUVEAU : Récupère les informations de base d'un Pokémon pour les NPC
 */
export async function getPokemonBaseInfo(pokemonId: number): Promise<{
  id: number;
  name: string;
  types: string[];
  baseStats: any;
  baseXP: number;
  captureRate: number;
  growthRate: string;
  abilities: string[];
  hiddenAbility?: string;
  height: number;
  weight: number;
  generation: number;
  region: string;
} | null> {
  try {
    const pokemon = await getPokemonById(pokemonId);
    if (!pokemon) return null;
    
    return {
      id: pokemon.nationalDex,
      name: pokemon.nameKey.split('.').pop()?.charAt(0).toUpperCase() + pokemon.nameKey.split('.').pop()?.slice(1) || `Pokemon${pokemonId}`,
      types: pokemon.types,
      baseStats: pokemon.baseStats,
      baseXP: pokemon.baseExperienceYield || pokemon.baseExperience,
      captureRate: pokemon.captureRate,
      growthRate: pokemon.growthRate,
      abilities: pokemon.abilities,
      hiddenAbility: pokemon.hiddenAbility,
      height: pokemon.height,
      weight: pokemon.weight,
      generation: pokemon.generation,
      region: pokemon.region
    };
  } catch (error) {
    console.error(`❌ [PokemonService] Erreur getPokemonBaseInfo:`, error);
    return null;
  }
}

/**
 * 🆕 NOUVEAU : Génère un Pokémon NPC avec des stats appropriées
 */
export async function generateNPCPokemon(
  pokemonId: number, 
  level: number,
  options: {
    nature?: string;
    ivRange?: { min: number; max: number }; // IVs pour NPCs (généralement plus bas)
    isTrainer?: boolean; // Les trainers ont de meilleurs IVs
    customAbility?: string;
    customMoves?: string[];
    isShiny?: boolean;
    aiLevel?: 'novice' | 'intermediate' | 'expert' | 'champion'; // Niveau IA pour les stats
  } = {}
): Promise<{
  pokemonId: number;
  name: string;
  level: number;
  nature: string;
  ability: string;
  types: string[];
  ivs: any;
  stats: any;
  moves: string[];
  shiny: boolean;
  aiData: {
    aiLevel: string;
    strategy: string;
    priority: number;
  };
} | null> {
  try {
    const pokemonData = await getPokemonById(pokemonId);
    if (!pokemonData) return null;
    
    // Déterminer les IVs selon le niveau IA
    const aiLevel = options.aiLevel || 'intermediate';
    let ivRange = options.ivRange || { min: 10, max: 20 };
    
    switch (aiLevel) {
      case 'novice':
        ivRange = { min: 0, max: 15 };
        break;
      case 'intermediate':
        ivRange = { min: 10, max: 20 };
        break;
      case 'expert':
        ivRange = { min: 20, max: 28 };
        break;
      case 'champion':
        ivRange = { min: 28, max: 31 };
        break;
    }
    
    // Si c'est un trainer, améliorer les IVs
    if (options.isTrainer) {
      ivRange.min = Math.min(31, ivRange.min + 5);
      ivRange.max = Math.min(31, ivRange.max + 5);
    }
    
    // Générer les IVs
    const ivs = {
      hp: Math.floor(Math.random() * (ivRange.max - ivRange.min + 1)) + ivRange.min,
      attack: Math.floor(Math.random() * (ivRange.max - ivRange.min + 1)) + ivRange.min,
      defense: Math.floor(Math.random() * (ivRange.max - ivRange.min + 1)) + ivRange.min,
      spAttack: Math.floor(Math.random() * (ivRange.max - ivRange.min + 1)) + ivRange.min,
      spDefense: Math.floor(Math.random() * (ivRange.max - ivRange.min + 1)) + ivRange.min,
      speed: Math.floor(Math.random() * (ivRange.max - ivRange.min + 1)) + ivRange.min,
    };
    
    // Nature et capacité
    const nature = options.nature || randomNature();
    const ability = options.customAbility || await selectPokemonAbility(pokemonId);
    
    // Moves (utiliser les custom ou générer selon le niveau)
    let moves: string[] = [];
    if (options.customMoves) {
      moves = options.customMoves.slice(0, 4);
    } else {
      // Récupérer les moves que le Pokémon peut apprendre jusqu'à ce niveau
      const availableMoves = pokemonData.learnset
        .filter(move => move.method === 'level' && move.level <= level)
        .sort((a, b) => b.level - a.level) // Plus récents en premier
        .slice(0, 4)
        .map(move => move.moveId);
      
      moves = availableMoves.length > 0 ? availableMoves : ['tackle'];
    }
    
    // Calculer les stats
    const stats = calculateWildPokemonStats(pokemonData.baseStats, level, ivs, nature);
    
    // Shiny (très rare pour les NPCs sauf spécifié)
    const isShiny = options.isShiny !== undefined ? options.isShiny : (Math.random() < 0.001); // 0.1% chance
    
    // Données IA
    const aiStrategy = determineAIStrategy(pokemonData, aiLevel);
    
    return {
      pokemonId,
      name: pokemonData.nameKey.split('.').pop()?.charAt(0).toUpperCase() + pokemonData.nameKey.split('.').pop()?.slice(1) || `Pokemon${pokemonId}`,
      level,
      nature,
      ability,
      types: pokemonData.types,
      ivs,
      stats,
      moves,
      shiny: isShiny,
      aiData: {
        aiLevel,
        strategy: aiStrategy,
        priority: calculateAIPriority(pokemonData, stats)
      }
    };
    
  } catch (error) {
    console.error(`❌ [PokemonService] Erreur generateNPCPokemon:`, error);
    return null;
  }
}

/**
 * 🆕 NOUVEAU : Détermine la stratégie IA basée sur les stats du Pokémon
 */
function determineAIStrategy(pokemonData: IPokemonData, aiLevel: string): string {
  const stats = pokemonData.baseStats;
  
  // Analyser les points forts du Pokémon
  const totalStats = stats.attack + stats.defense + stats.specialAttack + stats.specialDefense + stats.speed + stats.hp;
  const avgStat = totalStats / 6;
  
  if (stats.attack > avgStat * 1.3) {
    return aiLevel === 'novice' ? 'aggressive' : 'physical_sweeper';
  } else if (stats.specialAttack > avgStat * 1.3) {
    return aiLevel === 'novice' ? 'aggressive' : 'special_sweeper';
  } else if (stats.speed > avgStat * 1.3) {
    return aiLevel === 'novice' ? 'fast' : 'speed_control';
  } else if ((stats.defense + stats.specialDefense) > avgStat * 2.5) {
    return aiLevel === 'novice' ? 'defensive' : 'wall';
  } else if (stats.hp > avgStat * 1.5) {
    return aiLevel === 'novice' ? 'tanky' : 'support';
  } else {
    return aiLevel === 'novice' ? 'balanced' : 'utility';
  }
}

/**
 * 🆕 NOUVEAU : Calcule la priorité IA (ordre d'action)
 */
function calculateAIPriority(pokemonData: IPokemonData, stats: any): number {
  // Base sur la vitesse et la dangerosité
  const speedFactor = stats.speed / 200; // Normaliser
  const threatLevel = Math.max(stats.attack, stats.specialAttack) / 150; // Normaliser
  
  return Math.round((speedFactor + threatLevel) * 100);
}

/**
 * 🆕 NOUVEAU : Récupère les multiplicateurs de capture pour un Pokémon
 */
export async function getCaptureInfo(pokemonId: number): Promise<{
  captureRate: number;
  ballEffectiveness: any;
  statusModifiers: any;
  difficultyLevel: 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard' | 'legendary';
  tips: string[];
} | null> {
  try {
    const pokemon = await getPokemonById(pokemonId);
    if (!pokemon) return null;
    
    // Déterminer la difficulté de capture
    let difficultyLevel: 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard' | 'legendary';
    if (pokemon.captureRate >= 200) difficultyLevel = 'very_easy';
    else if (pokemon.captureRate >= 120) difficultyLevel = 'easy';
    else if (pokemon.captureRate >= 75) difficultyLevel = 'medium';
    else if (pokemon.captureRate >= 45) difficultyLevel = 'hard';
    else if (pokemon.captureRate >= 25) difficultyLevel = 'very_hard';
    else difficultyLevel = 'legendary';
    
    // Conseils de capture
    const tips: string[] = [];
    if (pokemon.captureRate < 50) {
      tips.push("Utilisez des Ultra Balls ou mieux");
      tips.push("Infligez un statut (sommeil/paralysie)");
      tips.push("Réduisez les HP au minimum");
    }
    if (pokemon.types.includes('Ghost')) {
      tips.push("Les Pokémon spectre sont plus faciles à capturer la nuit");
    }
    if (pokemon.types.includes('Water')) {
      tips.push("Utilisez des Filet Balls près de l'eau");
    }
    
    // Ball effectiveness par défaut (peut être override par catch locations)
    const defaultBallEffectiveness = {
      poke_ball: 1.0,
      great_ball: 1.5,
      ultra_ball: 2.0,
      master_ball: 255.0
    };
    
    return {
      captureRate: pokemon.captureRate,
      ballEffectiveness: pokemon.catchLocations[0]?.ballEffectiveness || defaultBallEffectiveness,
      statusModifiers: pokemon.catchLocations[0]?.statusModifiers || {
        normal: 1.0,
        sleep: 2.5,
        freeze: 2.5,
        paralysis: 1.5,
        burn: 1.5,
        poison: 1.5
      },
      difficultyLevel,
      tips
    };
    
  } catch (error) {
    console.error(`❌ [PokemonService] Erreur getCaptureInfo:`, error);
    return null;
  }
}

// 🔄 EXPORT : Conserver la compatibilité avec l'ancien code
export { getPokemonById, getStarterMoves, generateRandomGender };
