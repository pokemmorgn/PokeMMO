// server/src/scripts/migrate-pokemon.ts - SCRIPT DE MIGRATION POKÉMON GÉNÉRATION 1
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
// Utilisation du fetch natif Node.js (disponible depuis Node 18+)
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
  
  // Télécharger depuis l'API avec fetch natif
  try {
    await delay(RATE_LIMIT_DELAY); // Rate limiting
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PokemonMigrationScript/1.0',
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json() as T;
    
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
  
  // Vérifier que apiStats existe et est un tableau
  if (!apiStats || !Array.isArray(apiStats)) {
    console.log('⚠️ No stats data found, using defaults');
    return baseStats;
  }
  
  apiStats.forEach(stat => {
    // Vérifier que l'objet stat et ses propriétés existent
    if (!stat?.stat?.name || typeof stat.base_stat !== 'number') {
      console.log('⚠️ Invalid stat data:', stat);
      return;
    }
    
    const statName = statsMap[stat.stat.name];
    if (statName) {
      baseStats[statName] = Math.max(1, stat.base_stat); // Assurer au moins 1
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
  
  if (!apiMoves || !Array.isArray(apiMoves)) {
    console.log('⚠️ No moves data found');
    return learnset;
  }
  
  apiMoves.forEach(apiMove => {
    // Vérifier que l'objet move et son nom existent
    if (!apiMove?.move?.name) {
      console.log('⚠️ Skipping invalid move data:', apiMove);
      return;
    }
    
    const moveName = apiMove.move.name.replace(/-/g, '_');
    
    // Vérifier que version_group_details existe
    if (!apiMove.version_group_details || !Array.isArray(apiMove.version_group_details)) {
      console.log(`⚠️ No version details for move: ${moveName}`);
      return;
    }
    
    // Filtrer pour la génération 1 uniquement (red-blue)
    const gen1Details = apiMove.version_group_details.filter(detail => 
      detail?.version_group?.name === 'red-blue'
    );
    
    gen1Details.forEach(detail => {
      // Vérifier que les données nécessaires existent
      if (!detail?.move_learn_method?.name) {
        console.log(`⚠️ Invalid learn method for move: ${moveName}`);
        return;
      }
      
      const move: ILearnsetMove = {
        moveId: moveName,
        level: detail.level_learned_at || 0,
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
  
  let evolutionChain: PokeApiEvolutionChain;
  try {
    evolutionChain = await fetchWithCache<PokeApiEvolutionChain>(
      evolutionChainUrl,
      `evolution_chain_${chainId}`
    );
  } catch (error) {
    console.log(`⚠️ Failed to fetch evolution chain ${chainId}:`, error);
    return {};
  }
  
  if (!evolutionChain?.chain) {
    console.log(`⚠️ Invalid evolution chain data for ${chainId}`);
    return {};
  }
  
  const evolutionData: { [pokemonName: string]: IEvolutionData } = {};
  
  function processEvolutionNode(node: EvolutionNode, fromSpecies?: string): void {
    if (!node?.species?.name || !node.species.url) {
      console.log('⚠️ Invalid evolution node:', node);
      return;
    }
    
    const speciesName = node.species.name;
    const speciesId = extractIdFromUrl(node.species.url);
    
    if (fromSpecies) {
      // Ce Pokémon évolue depuis fromSpecies
      const evDetail = node.evolution_details?.[0];
      if (!evDetail) {
        console.log(`⚠️ No evolution details for ${speciesName}`);
        return;
      }
      
      evolutionData[speciesName] = {
        canEvolve: node.evolves_to?.length > 0,
        evolvesInto: node.evolves_to?.length > 0 ? extractIdFromUrl(node.evolves_to[0].species.url) : undefined,
        evolvesFrom: extractIdFromUrl(fromSpecies),
        method: convertEvolutionMethod(evDetail.trigger?.name || 'level-up'),
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
        canEvolve: node.evolves_to?.length > 0,
        evolvesInto: node.evolves_to?.length > 0 ? extractIdFromUrl(node.evolves_to[0].species.url) : undefined,
        method: 'level',
        requirement: 1
      };
    }
    
    // Traiter les évolutions suivantes
    if (node.evolves_to && Array.isArray(node.evolves_to)) {
      node.evolves_to.forEach(evolution => {
        processEvolutionNode(evolution, node.species.url);
      });
    }
  }
  
  try {
    processEvolutionNode(evolutionChain.chain);
  } catch (error) {
    console.log(`⚠️ Error processing evolution chain ${chainId}:`, error);
  }
  
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
  
  try {
    // Récupérer les données de base
    const pokemon = await fetchWithCache<PokeApiPokemon>(
      `${POKEAPI_BASE_URL}/pokemon/${pokemonId}`,
      `pokemon_${pokemonId}`
    );
    
    // Vérifier que les données essentielles existent
    if (!pokemon || !pokemon.species?.url) {
      throw new Error(`Invalid pokemon data for #${pokemonId}`);
    }
    
    // Récupérer les données d'espèce
    const species = await fetchWithCache<PokeApiSpecies>(
      pokemon.species.url,
      `species_${pokemonId}`
    );
    
    if (!species) {
      throw new Error(`Invalid species data for #${pokemonId}`);
    }
    
    // Récupérer les données d'évolution
    let evolutionData: IEvolutionData = {
      canEvolve: false,
      method: 'level',
      requirement: 1
    };
    
    try {
      if (species.evolution_chain?.url) {
        const evolutionDataMap = await fetchEvolutionData(species.evolution_chain.url);
        evolutionData = evolutionDataMap[pokemon.name] || evolutionData;
      }
    } catch (evolutionError) {
      console.log(`⚠️ Evolution data fetch failed for #${pokemonId}:`, evolutionError);
    }
    
    // Extraire les capacités avec vérifications de sécurité
    const abilities = (pokemon.abilities || [])
      .filter(ability => !ability.is_hidden && ability.ability?.name)
      .sort((a, b) => a.slot - b.slot)
      .map(ability => ability.ability.name.replace(/-/g, '_'));
    
    const hiddenAbility = (pokemon.abilities || [])
      .find(ability => ability.is_hidden && ability.ability?.name)
      ?.ability.name?.replace(/-/g, '_');
    
    // Vérifications de sécurité pour les champs requis
    if (!abilities.length) {
      abilities.push('no_ability'); // Fallback si aucune capacité
    }
    
    // Convertir vers notre format
    const pokemonData: Partial<IPokemonData> = {
      nationalDex: pokemon.id,
      nameKey: `pokemon.name.${pokemon.name}`,
      species: (species.genus || 'Unknown Pokémon').replace(' Pokémon', ''),
      descriptionKey: `pokemon.description.${pokemon.name}`,
      category: species.is_legendary ? 'legendary' : 
               species.is_mythical ? 'mythical' : 
               species.is_baby ? 'baby' : 'normal',
      
      types: (pokemon.types || [])
        .sort((a, b) => a.slot - b.slot)
        .map(type => convertApiType(type.type?.name || 'normal')),
      
      baseStats: convertStats(pokemon.stats || []),
      abilities: abilities,
      hiddenAbility: hiddenAbility,
      
      height: (pokemon.height || 10) / 10, // Convertir dm en m, fallback à 1m
      weight: (pokemon.weight || 100) / 10, // Convertir hg en kg, fallback à 10kg
      sprite: pokemon.sprites?.other?.['official-artwork']?.front_default || 
              pokemon.sprites?.front_default || 
              `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`,
      
      genderRatio: convertGenderRatio(species.gender_rate ?? 4), // Fallback à 50/50
      eggGroups: (species.egg_groups || [{ name: 'undiscovered' }]).map(group => convertEggGroup(group.name)),
      hatchTime: (species.hatch_counter || 20) * 256, // Convertir en steps
      
      baseExperience: pokemon.base_experience || 100,
      growthRate: convertGrowthRate(species.growth_rate?.name || 'medium-fast'),
      captureRate: species.capture_rate ?? 255,
      baseHappiness: species.base_happiness ?? 70,
      
      region: 'kanto',
      generation: 1,
      
      learnset: convertLearnset(pokemon.moves || []),
      evolution: evolutionData,
      
      catchLocations: [], // Sera rempli plus tard si nécessaire
      
      isActive: true,
      isObtainable: true,
      rarity: species.is_legendary ? 'legendary' : 
             species.is_mythical ? 'mythical' : 'common',
      
      metadata: {
        color: species.color?.name || 'unknown',
        habitat: species.habitat?.name,
        isLegendary: species.is_legendary || false,
        isMythical: species.is_mythical || false,
        isBaby: species.is_baby || false
      }
    };
    
    // Validation finale des types
    if (!pokemonData.types || pokemonData.types.length === 0) {
      pokemonData.types = ['Normal'];
    }
    
    console.log(`✅ Converted ${pokemon.name} (#${pokemon.id}) - Types: ${pokemonData.types.join(', ')}`);
    return pokemonData;
    
  } catch (error) {
    console.error(`❌ Failed to fetch/convert Pokémon #${pokemonId}:`, error);
    throw error;
  }
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
 * Fonction principale de migration avec mode récupération
 */
async function migratePokemon(options: {
  dryRun?: boolean;
  clearExisting?: boolean;
  startFrom?: number;
  endAt?: number;
  missingOnly?: boolean;
  missingIds?: number[];
}): Promise<void> {
  const { 
    dryRun = false, 
    clearExisting = true, 
    startFrom = 1, 
    endAt = GEN1_POKEMON_COUNT,
    missingOnly = false,
    missingIds = []
  } = options;
  
  try {
    console.log('🚀 Starting Pokémon Generation 1 migration...');
    console.log(`🔧 Options: dryRun=${dryRun}, clearExisting=${clearExisting}, missingOnly=${missingOnly}`);
    
    let pokemonToProcess: number[];
    
    if (missingOnly && missingIds.length > 0) {
      pokemonToProcess = missingIds.sort((a, b) => a - b);
      console.log(`🎯 Processing ${pokemonToProcess.length} missing Pokémon: ${pokemonToProcess.slice(0, 10).join(', ')}${pokemonToProcess.length > 10 ? '...' : ''}`);
    } else {
      pokemonToProcess = Array.from({length: endAt - startFrom + 1}, (_, i) => startFrom + i);
      console.log(`📊 Range: Pokémon #${startFrom} to #${endAt}`);
    }
    
    if (clearExisting && !dryRun && !missingOnly) {
      await clearPokemonCollection();
    }
    
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made to the database');
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Traiter individuellement pour éviter les échecs en cascade
    console.log(`\n📦 Processing ${pokemonToProcess.length} Pokémon individually (safer mode)...`);
    
    for (const pokemonId of pokemonToProcess) {
      try {
        console.log(`🔍 Processing Pokémon #${pokemonId}...`);
        
        const result = await fetchAndConvertPokemon(pokemonId);
        
        if (!dryRun) {
          // Vérifier si le Pokémon existe déjà (pour le mode missing)
          if (missingOnly) {
            const existing = await PokemonData.findOne({ nationalDex: pokemonId });
            if (existing) {
              console.log(`⏭️ Pokémon #${pokemonId} already exists, skipping`);
              successCount++;
              continue;
            }
          }
          
          await PokemonData.create(result);
        }
        
        successCount++;
        console.log(`✅ Pokémon #${pokemonId} processed successfully`);
        
        // Pause plus longue entre chaque Pokémon pour éviter les rate limits
        if (pokemonId !== pokemonToProcess[pokemonToProcess.length - 1]) {
          await delay(RATE_LIMIT_DELAY * 3); // 300ms pause
        }
        
      } catch (error) {
        errorCount++;
        const errorMsg = `❌ Pokémon #${pokemonId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.log(errorMsg);
        
        // Pause même en cas d'erreur pour éviter de surcharger l'API
        await delay(RATE_LIMIT_DELAY);
      }
    }
    
    console.log('\n✅ MIGRATION COMPLETED');
    console.log('======================');
    console.log(`✅ Success: ${successCount} Pokémon`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`🎮 Generation 1 progress: ${successCount}/${pokemonToProcess.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS ENCOUNTERED:');
      errors.slice(0, 10).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more errors`);
      }
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
    missingOnly: args.includes('--missing-only') || args.includes('-m'),
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
  --missing-only, -m     Only process missing Pokémon (safer recovery mode)
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
    
    // Mode récupération des manquants
    if (options.missingOnly) {
      console.log('🎯 MISSING RECOVERY MODE - Fetching missing Pokémon from database...');
      
      // Récupérer les IDs manquants depuis la base
      const presentIds = await PokemonData.distinct('nationalDex');
      const expectedIds = Array.from({length: GEN1_POKEMON_COUNT}, (_, i) => i + 1);
      const missingIds = expectedIds.filter(id => !presentIds.includes(id));
      
      console.log(`📊 Found ${missingIds.length} missing Pokémon out of ${GEN1_POKEMON_COUNT}`);
      console.log(`🎯 Missing IDs: ${missingIds.slice(0, 20).join(', ')}${missingIds.length > 20 ? '...' : ''}`);
      
      if (missingIds.length === 0) {
        console.log('✅ No missing Pokémon found! Database is complete.');
        return;
      }
      
      await migratePokemon({ 
        ...options, 
        missingOnly: true, 
        missingIds: missingIds,
        clearExisting: false // Never clear in missing mode
      });
    } else {
      // Migration normale
      await migratePokemon(options);
    }
    
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
