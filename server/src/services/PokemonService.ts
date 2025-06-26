// server/src/services/PokemonService.ts - Version complète corrigée

import { OwnedPokemon, IOwnedPokemon } from "../models/OwnedPokemon";
import { PlayerData } from "../models/PlayerData";
import { HydratedDocument } from "mongoose";
import { 
  getPokemonById, 
  getStarterMoves, 
  generateRandomGender 
} from "../data/PokemonData";
import movesIndex from "../data/moves-index.json";
import abilitiesData from "../data/abilities.json";
import naturesData from "../data/natures.json";

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

async function selectPokemonAbility(pokemonId: number): Promise<string> {
  const pokemonData = await getPokemonById(pokemonId);
  if (!pokemonData || !pokemonData.abilities.length) {
    return "run_away";
  }
  const useHidden = Math.random() < 0.2 && pokemonData.hiddenAbility;
  if (useHidden) {
    return pokemonData.hiddenAbility!;
  } else {
    const randomIndex = Math.floor(Math.random() * pokemonData.abilities.length);
    return pokemonData.abilities[randomIndex];
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
    gender?: string; // <-- Ajouté pour compat, mais pas obligatoire
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
    genderRaw = options.gender; // Permet d'imposer un genre, si fourni (future compat)
  } else {
    genderRaw = await generateRandomGender(options.pokemonId);
  }
  const gender = toModelGender(genderRaw);
  console.log("[DEBUG createCompletePokemon GENDER]", { genderRaw, gender });

  const ability = options.ability || await selectPokemonAbility(options.pokemonId);
  const moves = await getMovesWithPP(options.pokemonId, level);

  // Création du Pokémon
  const pokemonDoc = new OwnedPokemon({
    owner: username,
    pokemonId: options.pokemonId,
    level,
    experience: getExperienceForLevel(level),
    nature,
    nickname: options.nickname,
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
    friendship: 70,
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
      console.warn(`Équipe pleine pour ${username}, ${options.nickname || pokemonData.name} envoyé au PC`);
    }
  }

  return pokemonDoc;
}

function getExperienceForLevel(level: number): number {
  if (level === 1) return 0;
  return Math.floor((6 * Math.pow(level, 3)) / 5 - 15 * Math.pow(level, 2) + 100 * level - 140);
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

  // Calcul des stats avec la formule officielle
  const stats = calculateWildPokemonStats(pokemonData.baseStats, level, ivs, nature);

  return {
    pokemonId,
    name: pokemonData.name,
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
    baseStats: pokemonData.baseStats
  };
}

function calculateWildPokemonStats(baseStats: any, level: number, ivs: any, nature: string): any {
  const natureData = naturesData[nature as keyof typeof naturesData];
  
  const calculateStat = (statName: string, baseStat: number, isHP: boolean = false): number => {
    const iv = ivs[statName] || 0;
    if (isHP) {
      return Math.floor(((2 * baseStat + iv) * level) / 100) + level + 10;
    } else {
      let stat = Math.floor(((2 * baseStat + iv) * level) / 100) + 5;
      if (natureData?.increased === statName) {
        stat = Math.floor(stat * 1.1);
      } else if (natureData?.decreased === statName) {
        stat = Math.floor(stat * 0.9);
      }
      return stat;
    }
  };

  return {
    hp: calculateStat('hp', baseStats.hp, true),
    attack: calculateStat('attack', baseStats.attack),
    defense: calculateStat('defense', baseStats.defense),
    spAttack: calculateStat('spAttack', baseStats.specialAttack),
    spDefense: calculateStat('spDefense', baseStats.specialDefense),
    speed: calculateStat('speed', baseStats.speed)
  };
}

export async function evolvePokemon(
  pokemonId: string,
  newPokemonId: number
): Promise<IOwnedPokemon | null> {
  const pokemon = await OwnedPokemon.findById(pokemonId);
  if (!pokemon) return null;

  const newPokemonData = await getPokemonById(newPokemonId);
  if (!newPokemonData) return null;

  pokemon.pokemonId = newPokemonId;
  const newAbility = await selectPokemonAbility(newPokemonId);
  pokemon.ability = newAbility;
  await pokemon.save();

  return pokemon;
}

export async function gainExperience(
  pokemonId: string,
  expAmount: number
): Promise<{ leveledUp: boolean, newLevel?: number }> {
  const pokemon = await OwnedPokemon.findById(pokemonId);
  if (!pokemon) throw new Error("Pokémon introuvable");

  const oldLevel = pokemon.level;
  pokemon.experience += expAmount;

  let newLevel = calculateLevelFromExp(pokemon.experience);
  if (newLevel > 100) newLevel = 100;

  const leveledUp = newLevel > oldLevel;
  if (leveledUp) {
    pokemon.level = newLevel;
  }

  await pokemon.save();

  return { leveledUp, newLevel: leveledUp ? newLevel : undefined };
}

function calculateLevelFromExp(exp: number): number {
  if (exp === 0) return 1;
  for (let level = 1; level <= 100; level++) {
    const expForLevel = getExperienceForLevel(level);
    const expForNextLevel = getExperienceForLevel(level + 1);
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
