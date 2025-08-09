// server/src/scripts/migrate-pokemon.ts - SCRIPT DE MIGRATION POKÉMON GÉNÉRATION 1
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import axios, { AxiosRequestConfig } from 'axios';
import { PokemonData, IPokemonData, PokemonType, GrowthRate, EggGroup, IBaseStats, IGenderRatio, IEvolutionData, ILearnsetMove } from '../models/PokemonData';

// ===== CONFIGURATION =====
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokeworld';
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
const GEN1_POKEMON_COUNT = 151; // Pokémon 1-151 pour Gen 1
const RATE_LIMIT_DELAY = 100; // 100ms entre chaque requête API
const BATCH_SIZE = 10; // Traiter par lots de 10 Pokémon
const CACHE_DIR = './cache/pokemon';

// ===== INTERFACES POKEAPI =====
interface PokeApiPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  species: {
    name: string;
    url: string;
  };
  sprites: {
    front_default: string;
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  stats: Array<{
    base_stat: number;
    stat: {
      name: string;
    };
  }>;
  types: Array<{
    slot: number;
    type: {
      name: string;
    };
  }>;
  abilities: Array<{
    ability: {
      name: string;
    };
    is_hidden: boolean;
    slot: number;
  }>;
  moves: Array<{
    move: {
      name: string;
      url: string;
    };
    version_group_details: Array<{
      level_learned_at: number;
      move_learn_method: {
        name: string;
      };
      version_group: {
        name: string;
      };
    }>;
  }>;
}

interface PokeApiSpecies {
  id: number;
  name: string;
  generation: {
    name: string;
  };
  flavor_text_entries: Array<{
    flavor_text: string;
    language: {
      name: string;
    };
    version: {
      name: string;
    };
  }>;
  genus: string;
  gender_rate: number;
  capture_rate: number;
  base_happiness: number;
  growth_rate: {
    name: string;
  };
  egg_groups: Array<{
    name: string;
  }>;
  hatch_counter: number;
  evolution_chain: {
    url: string;
  };
  habitat?: {
    name: string;
  };
  color: {
    name: string;
  };
  is_baby: boolean;
  is_legendary: boolean;
  is_mythical: boolean;
}

interface PokeApiEvolutionChain {
  id: number;
  chain: EvolutionNode;
}

interface EvolutionNode {
  is_baby: boolean;
  species: {
    name: string;
    url: string;
  };
  evolution_details: Array<{
    min_level?: number;
    trigger: {
      name: string;
    };
    item?: {
      name: string;
    };
    held_item?: {
      name: string;
    };
    known_move?: {
      name: string;
    };
    location?: {
      name: string;
    };
    min_happiness?: number;
    min_beauty?: number;
    min_affection?: number;
    time_of_day?: string;
    gender?: number;
    needs_overworld_rain?: boolean;
    party_species?: {
      name: string;
    };
    party_type?: {
      name: string;
    };
    relative_physical_stats?: number;
    trade_species?: {
      name: string;
    };
    turn_upside_down?: boolean;
  }>;
  evolves_to: EvolutionNode[];
}

// ===== UTILITAIRES =====

/**
 * Fonction de delay pour respecter les rate limits
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Connecte à MongoDB
 */
async function connectToDatabase(): Promise<void> {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`📍 URI: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Ferme la connexion MongoDB
 */
async function disconnectFromDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('⚠️ Error disconnecting from MongoDB:', error);
  }
}

/**
 * Crée le répertoire de cache
 */
function createCacheDirectory(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`📁 Created cache directory: ${CACHE_DIR}`);
  }
}

/**
 * Charge depuis le cache ou télécharge depuis l'API
 */
async function fetchWithCache<T>(url: string, cacheKey: string): Promise<T> {
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
  
  // Vérifier le cache
  if (fs.existsSync(cacheFile)) {
    const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    console.log(`💾 Loaded from cache: ${cacheKey}`);
    return cachedData;
  }
  
  // Télécharger depuis l'API
  try {
    await delay(RATE_LIMIT_DELAY); // Rate limiting
    
    const response = await axios.get<T>(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'PokemonMigrationScript/1.0'
      }
    } as AxiosRequestConfig);
    
    const data = response.data;
    
    // Sauvegarder en cache
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
    console.log(`🌐 Downloaded and cached: ${cacheKey}`);
    
    return data;
  } catch (error) {
    console.error(`❌ Failed to fetch ${url}:`, error);
    throw error;
  }
}

/**
 * Convertit les noms d'API vers les enums TypeScript
 */
function convertApiType(apiType: string): PokemonType {
  const typeMap: { [key: string]: PokemonType } = {
    'normal': 'Normal',
    'fire': 'Fire',
    'water': 'Water',
    'electric': 'Electric',
    'grass': 'Grass',
    'ice': 'Ice',
    'fighting': 'Fighting',
    'poison': 'Poison',
    'ground': 'Ground',
    'flying': 'Flying',
    'psychic': 'Psychic',
    'bug': 'Bug',
    'rock': 'Rock',
    'ghost': 'Ghost',
    'dragon': 'Dragon',
    'dark': 'Dark',
    'steel': 'Steel',
    'fairy': 'Fairy'
  };
  
  return typeMap[apiType] || 'Normal';
}

function convertGrowthRate(apiRate: string): GrowthRate {
  const rateMap: { [key: string]: GrowthRate } = {
    'slow': 'slow',
    'medium-slow': 'medium_slow',
    'medium': 'medium_fast',
    'fast': 'fast',
    'erratic': 'erratic',
    'fluctuating': 'fluctuating'
  };
  
  return rateMap[apiRate] || 'medium_fast';
}

function convertEggGroup(apiGroup: string): EggGroup {
  const groupMap: { [key: string]: EggGroup } = {
    'monster': 'monster',
    'water1': 'water1',
    'water2': 'water2',
    'water3': 'water3',
    'bug': 'bug',
    'flying': 'flying',
    'field': 'field',
    'fairy': 'fairy',
    'grass': 'grass',
    'human-like': 'human_like',
    'mineral': 'mineral',
    'amorphous': 'amorphous',
    'ditto': 'ditto',
    'dragon': 'dragon',
    'undiscovered': 'undiscovered',
    'no-eggs': 'undiscovered'
  };
  
  return groupMap[apiGroup] || 'undiscovered';
}

/**
 * Convertit les stats de l'API vers notre format
 */
function convertStats(apiStats: PokeApiPokemon['stats']): IBaseStats {
  const statsMap: { [key: string]: keyof IBaseStats } = {
    'hp': 'hp',
    'attack': 'attack',
    'defense': 'defense',
    'special-attack': 'specialAttack',
    'special-defense': 'specialDefense',
    'speed': 'speed'
  };
  
  const baseStats: IBaseStats = {
    hp: 1,
    attack: 1,
    defense: 1,
    specialAttack: 1,
    specialDefense: 1,
    speed: 1
  };
  
  apiStats.forEach(stat => {
    const statName = statsMap[stat.stat.name];
    if (statName) {
      baseStats[statName] = stat.base_stat;
    }
  });
  
  return baseStats;
}

/**
 * Calcule le ratio de genre depuis l'API
 */
function convertGenderRatio(genderRate: number): IGenderRatio {
  if (genderRate === -1) {
    return { male: 0, female: 0, genderless: true };
  }
  
  const femalePercent = (genderRate / 8) * 100;
  const malePercent = 100 - femalePercent;
  
  return {
    male: Math.round(malePercent),
    female: Math.round(femalePercent),
    genderless: false
  };
}

/**
 * Extrait l'ID depuis une URL PokéAPI
 */
function extractIdFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Convertit les moves de l'API vers notre format
 */
function convertLearnset(apiMoves: PokeApiPokemon['moves']): ILearnsetMove[] {
  const learnset: ILearnsetMove[] = [];
  
  apiMoves.forEach(apiMove => {
    const moveName = apiMove.move.name.replace(/-/g, '_');
    
    // Filtrer pour la génération 1 uniquement (red-blue)
    const gen1Details = apiMove.version_group_details.filter(detail => 
      detail.version_group.name === 'red-blue'
    );
    
    gen1Details.forEach(detail => {
      const move: ILearnsetMove = {
        moveId: moveName,
        level: detail.level_learned_at,
        method: convertLearnMethod(detail.move_learn_method.name),
        generation: 1,
        priority: 0
      };
      
      learnset.push(move);
    });
  });
  
  // Supprimer les doublons et trier
  const uniqueMoves = learnset.reduce((acc, move) => {
    const key = `${move.moveId}-${move.method}-${move.level}`;
    if (!acc.has(key)) {
      acc.set(key, move);
    }
    return acc;
  }, new Map());
  
  return Array.from(uniqueMoves.values()).sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.moveId.localeCompare(b.moveId);
  });
}

function convertLearnMethod(apiMethod: string): ILearnsetMove['method'] {
  const methodMap: { [key: string]: ILearnsetMove['method'] } = {
    'level-up': 'level',
    'machine': 'tm',
    'egg': 'egg',
    'tutor': 'tutor'
  };
  
  return methodMap[apiMethod] || 'level';
}

/**
 * Récupère les données d'évolution
 */
async function fetchEvolutionData(evolutionChainUrl: string): Promise<{ [pokemonName: string]: IEvolutionData }> {
  const chainId = extractIdFromUrl(evolutionChainUrl);
  const evolutionChain = await fetchWithCache<PokeApiEvolutionChain>(
    evolutionChainUrl,
    `evolution_chain_${chainId}`
  );
  
  const evolutionData: { [pokemonName: string]: IEvolutionData } = {};
  
  function processEvolutionNode(node: EvolutionNode, fromSpecies?: string): void {
    const speciesName = node.species.name;
    const speciesId = extractIdFromUrl(node.species.url);
    
    if (fromSpecies) {
      // Ce Pokémon évolue depuis fromSpecies
      const evDetail = node.evolution_details[0];
      evolutionData[speciesName] = {
        canEvolve: node.evolves_to.length > 0,
        evolvesInto: node.evolves_to.length > 0 ? extractIdFromUrl(node.evolves_to[0].species.url) : undefined,
        evolvesFrom: extractIdFromUrl(fromSpecies),
        method: convertEvolutionMethod(evDetail.trigger.name),
        requirement: evDetail.min_level || evDetail.item?.name || 'trade',
        conditions: {
          minimumLevel: evDetail.min_level,
          timeOfDay: evDetail.time_of_day as any,
          heldItem: evDetail.held_item?.name,
          knownMove: evDetail.known_move?.name,
          location: evDetail.location?.name,
          minimumFriendship: evDetail.min_happiness,
          gender: evDetail.gender === 1 ? 'female' : evDetail.gender === 2 ? 'male' : undefined
        }
      };
    } else {
      // Pokémon de base
      evolutionData[speciesName] = {
        canEvolve: node.evolves_to.length > 0,
        evolvesInto: node.evolves_to.length > 0 ? extractIdFromUrl(node.evolves_to[0].species.url) : undefined,
        method: 'level',
        requirement: 1
      };
    }
    
    // Traiter les évolutions suivantes
    node.evolves_to.forEach(evolution => {
      processEvolutionNode(evolution, node.species.url);
    });
  }
  
  processEvolutionNode(evolutionChain.chain);
  return evolutionData;
}

function convertEvolutionMethod(apiMethod: string): IEvolutionData['method'] {
  const methodMap: { [key: string]: IEvolutionData['method'] } = {
    'level-up': 'level',
    'trade': 'trade',
    'use-item': 'stone',
    'shed': 'special'
  };
  
  return methodMap[apiMethod] || 'level';
}

/**
 * Récupère et convertit un Pokémon depuis l'API
 */
async function fetchAndConvertPokemon(pokemonId: number): Promise<Partial<IPokemonData>> {
  console.log(`🔍 Fetching Pokémon #${pokemonId}...`);
  
  // Récupérer les données de base
  const pokemon = await fetchWithCache<PokeApiPokemon>(
    `${POKEAPI_BASE_URL}/pokemon/${pokemonId}`,
    `pokemon_${pokemonId}`
  );
  
  // Récupérer les données d'espèce
  const species = await fetchWithCache<PokeApiSpecies>(
    pokemon.species.url,
    `species_${pokemonId}`
  );
  
  // Récupérer les données d'évolution
  const evolutionDataMap = await fetchEvolutionData(species.evolution_chain.url);
  const evolutionData = evolutionDataMap[pokemon.name] || {
    canEvolve: false,
    method: 'level',
    requirement: 1
  };
  
  // Extraire les capacités
  const abilities = pokemon.abilities
    .filter(ability => !ability.is_hidden)
    .sort((a, b) => a.slot - b.slot)
    .map(ability => ability.ability.name.replace(/-/g, '_'));
  
  const hiddenAbility = pokemon.abilities
    .find(ability => ability.is_hidden)?.ability.name.replace(/-/g, '_');
  
  // Convertir vers notre format
  const pokemonData: Partial<IPokemonData> = {
    nationalDex: pokemon.id,
    nameKey: `pokemon.name.${pokemon.name}`,
    species: species.genus.replace(' Pokémon', ''),
    descriptionKey: `pokemon.description.${pokemon.name}`,
    category: species.is_legendary ? 'legendary' : 
             species.is_mythical ? 'mythical' : 
             species.is_baby ? 'baby' : 'normal',
    
    types: pokemon.types
      .sort((a, b) => a.slot - b.slot)
      .map(type => convertApiType(type.type.name)),
    
    baseStats: convertStats(pokemon.stats),
    abilities: abilities,
    hiddenAbility: hiddenAbility,
    
    height: pokemon.height / 10, // Convertir dm en m
    weight: pokemon.weight / 10, // Convertir hg en kg
    sprite: pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default,
    
    genderRatio: convertGenderRatio(species.gender_rate),
    eggGroups: species.egg_groups.map(group => convertEggGroup(group.name)),
    hatchTime: species.hatch_counter * 256, // Convertir en steps
    
    baseExperience: pokemon.base_experience,
    growthRate: convertGrowthRate(species.growth_rate.name),
    captureRate: species.capture_rate,
    baseHappiness: species.base_happiness,
    
    region: 'kanto',
    generation: 1,
    
    learnset: convertLearnset(pokemon.moves),
    evolution: evolutionData,
    
    catchLocations: [], // Sera rempli plus tard si nécessaire
    
    isActive: true,
    isObtainable: true,
    rarity: species.is_legendary ? 'legendary' : 
           species.is_mythical ? 'mythical' : 'common',
    
    metadata: {
      color: species.color.name,
      habitat: species.habitat?.name,
      isLegendary: species.is_legendary,
      isMythical: species.is_mythical,
      isBaby: species.is_baby
    }
  };
  
  console.log(`✅ Converted ${pokemon.name} (#${pokemon.id})`);
  return pokemonData;
}

/**
 * Vide la collection Pokémon
 */
async function clearPokemonCollection(): Promise<void> {
  try {
    console.log('🧹 Clearing existing Pokémon collection...');
    const deleteResult = await PokemonData.deleteMany({});
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing Pokémon`);
  } catch (error) {
    console.error('❌ Error clearing collection:', error);
    throw error;
  }
}

/**
 * Affiche les statistiques
 */
async function showStats(): Promise<void> {
  try {
    console.log('\n📊 DATABASE STATISTICS');
    console.log('======================');
    
    const total = await PokemonData.countDocuments({});
    const byGeneration = await PokemonData.aggregate([
      { $group: { _id: '$generation', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    const byType = await PokemonData.aggregate([
      { $unwind: '$types' },
      { $group: { _id: '$types', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const legendary = await PokemonData.countDocuments({ 
      $or: [{ category: 'legendary' }, { category: 'mythical' }] 
    });
    
    console.log(`📦 Total Pokémon: ${total}`);
    console.log(`🏆 Legendary/Mythical: ${legendary}`);
    
    console.log('\n📈 By Generation:');
    byGeneration.forEach(stat => {
      console.log(`  Gen ${stat._id}: ${stat.count}`);
    });
    
    console.log('\n🎨 Top Types:');
    byType.slice(0, 5).forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count}`);
    });
    
    console.log('======================\n');
  } catch (error) {
    console.error('⚠️ Error getting stats:', error);
  }
}

/**
 * Valide les données migrées
 */
async function validateMigration(): Promise<void> {
  try {
    console.log('🔍 Validating migration...');
    
    const issues: string[] = [];
    
    // Vérifier les évolutions
    const pokemonWithEvolutions = await PokemonData.find({ 'evolution.canEvolve': true });
    for (const pokemon of pokemonWithEvolutions) {
      if (pokemon.evolution.evolvesInto) {
        const evolutionExists = await PokemonData.findOne({ nationalDex: pokemon.evolution.evolvesInto });
        if (!evolutionExists) {
          issues.push(`Pokémon #${pokemon.nationalDex} evolves into non-existent #${pokemon.evolution.evolvesInto}`);
        }
      }
    }
    
    // Vérifier les stats
    const pokemonWithBadStats = await PokemonData.find({
      $or: [
        { 'baseStats.hp': { $lt: 1 } },
        { 'baseStats.attack': { $lt: 1 } },
        { 'baseStats.defense': { $lt: 1 } },
        { 'baseStats.specialAttack': { $lt: 1 } },
        { 'baseStats.specialDefense': { $lt: 1 } },
        { 'baseStats.speed': { $lt: 1 } }
      ]
    });
    
    if (pokemonWithBadStats.length > 0) {
      issues.push(`${pokemonWithBadStats.length} Pokémon have invalid base stats`);
    }
    
    console.log('\n🔍 VALIDATION RESULTS');
    console.log('=====================');
    console.log(`Status: ${issues.length === 0 ? '✅ VALID' : '❌ ISSUES FOUND'}`);
    
    if (issues.length > 0) {
      console.log('\n⚠️ Issues found:');
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    } else {
      console.log('✅ All validations passed!');
    }
    
    console.log('=====================\n');
  } catch (error) {
    console.error('⚠️ Error during validation:', error);
  }
}

/**
 * Fonction principale de migration
 */
async function migratePokemon(options: {
  dryRun?: boolean;
  clearExisting?: boolean;
  startFrom?: number;
  endAt?: number;
}): Promise<void> {
  const { dryRun = false, clearExisting = true, startFrom = 1, endAt = GEN1_POKEMON_COUNT } = options;
  
  try {
    console.log('🚀 Starting Pokémon Generation 1 migration...');
    console.log(`🔧 Options: dryRun=${dryRun}, clearExisting=${clearExisting}`);
    console.log(`📊 Range: Pokémon #${startFrom} to #${endAt}`);
    
    if (clearExisting && !dryRun) {
      await clearPokemonCollection();
    }
    
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made to the database');
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Traiter par lots
    for (let i = startFrom; i <= endAt; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE - 1, endAt);
      console.log(`\n📦 Processing batch: Pokémon #${i}-${batchEnd}`);
      
      const promises = [];
      for (let pokemonId = i; pokemonId <= batchEnd; pokemonId++) {
        promises.push(
          fetchAndConvertPokemon(pokemonId).catch(error => ({
            error: true,
            pokemonId,
            message: error.message
          }))
        );
      }
      
      const results = await Promise.all(promises);
      
      for (const result of results) {
        if ('error' in result) {
          errorCount++;
          const errorMsg = `❌ Pokémon #${result.pokemonId}: ${result.message}`;
          errors.push(errorMsg);
          console.log(errorMsg);
          continue;
        }
        
        try {
          if (!dryRun) {
            await PokemonData.create(result);
          }
          successCount++;
        } catch (saveError) {
          errorCount++;
          const errorMsg = `❌ Save error for Pokémon #${result.nationalDex}: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.log(errorMsg);
        }
      }
      
      // Pause entre les lots
      if (i + BATCH_SIZE <= endAt) {
        console.log(`⏳ Waiting ${RATE_LIMIT_DELAY * 2}ms before next batch...`);
        await delay(RATE_LIMIT_DELAY * 2);
      }
    }
    
    console.log('\n✅ MIGRATION COMPLETED');
    console.log('======================');
    console.log(`✅ Success: ${successCount} Pokémon`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`🎮 Generation 1 complete!`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS ENCOUNTERED:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Fonction principale
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  const options = {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    clearExisting: !args.includes('--no-clear'),
    skipValidation: args.includes('--skip-validation'),
    skipStats: args.includes('--skip-stats'),
    help: args.includes('--help') || args.includes('-h'),
    startFrom: parseInt(args.find(arg => arg.startsWith('--start='))?.split('=')[1] || '1'),
    endAt: parseInt(args.find(arg => arg.startsWith('--end='))?.split('=')[1] || GEN1_POKEMON_COUNT.toString())
  };
  
  if (options.help) {
    console.log(`
🎮 Pokémon Generation 1 Migration Script
========================================

Usage: npx ts-node server/src/scripts/migrate-pokemon.ts [options]

Options:
  --dry-run, -d          Run without making changes (simulation)
  --no-clear             Don't clear existing Pokémon before migration
  --skip-validation      Skip database validation after migration
  --skip-stats           Skip statistics display
  --start=N              Start from Pokémon #N (default: 1)
  --end=N                End at Pokémon #N (default: 151)
  --help, -h             Show this help message

Environment Variables:
  MONGODB_URI           MongoDB connection string (default: mongodb://localhost:27017/pokeworld)

Data Source:
  📡 PokéAPI (https://pokeapi.co) - Official Pokémon data
  📊 Generation 1: Pokémon #1-151 (Kanto region)
  🔄 Includes: Base stats, types, abilities, learnsets, evolutions

Features:
  ⚡ Rate limiting (100ms between requests)
  💾 Local caching for repeated runs  
  📦 Batch processing (10 Pokémon per batch)
  🔍 Data validation and error reporting
  📊 Comprehensive statistics

Examples:
  npx ts-node server/src/scripts/migrate-pokemon.ts                    # Full Gen 1 migration
  npx ts-node server/src/scripts/migrate-pokemon.ts --dry-run          # Simulation only
  npx ts-node server/src/scripts/migrate-pokemon.ts --start=1 --end=50 # First 50 Pokémon
  npx ts-node server/src/scripts/migrate-pokemon.ts --no-clear         # Keep existing data

⚠️  WARNING: This script will REPLACE all Pokémon data in the database!
    Use --dry-run first to preview changes.
`);
    return;
  }
  
  console.log('🎮 PokéMMO Generation 1 Migration Script');
  console.log('========================================\n');
  
  if (!options.dryRun && options.clearExisting) {
    console.log('⚠️  WARNING: This will REPLACE all Pokémon data in the database!');
    console.log('⚠️  Press Ctrl+C within 5 seconds to cancel...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  try {
    // Créer le répertoire de cache
    createCacheDirectory();
    
    // Connexion à la base de données
    await connectToDatabase();
    
    // Migration
    await migratePokemon(options);
    
    // Statistiques post-migration
    if (!options.dryRun && !options.skipStats) {
      await showStats();
    }
    
    // Validation
    if (!options.skipValidation && !options.dryRun) {
      await validateMigration();
    }
    
    console.log('🎉 Migration script completed successfully!');
    console.log('📱 Your PokéMMO database now contains Generation 1 Pokémon!');
    console.log('💾 Cache stored in ./cache/pokemon for faster subsequent runs');
    
  } catch (error) {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
  }
}

// ===== GESTION DES SIGNAUX =====
process.on('SIGINT', async () => {
  console.log('\n⚠️ Received SIGINT, gracefully shutting down...');
  await disconnectFromDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️ Received SIGTERM, gracefully shutting down...');
  await disconnectFromDatabase();
  process.exit(0);
});

// ===== EXÉCUTION =====
if (require.main === module) {
  main().catch(console.error);
}

export { main as migratePokemon };
