// server/src/battle/helpers/TrainerBattleHelpers.ts
// 🛠️ UTILITAIRES ET FACTORIES POUR COMBATS DRESSEURS

import { 
  TrainerData, 
  TrainerAIProfile,
  TrainerRewards,
  TrainerDialogue,
  TrainerBattleRules,
  Pokemon,
  TRAINER_BATTLE_CONSTANTS
} from '../types/TrainerBattleTypes';
import { IOwnedPokemon } from '../../models/OwnedPokemon';
import { getPokemonById } from '../../data/PokemonData';

// === FACTORIES DE DRESSEURS ===

/**
 * Crée un dresseur simple pour les tests
 */
export function createSimpleTrainer(
  trainerId: string,
  name: string,
  pokemonData: { id: number; level: number }[]
): TrainerData {
  
  const pokemon: Pokemon[] = pokemonData.map((data, index) => ({
    id: data.id,
    combatId: `trainer_${trainerId}_${data.id}_${index}`,
    name: `Pokemon_${data.id}`,
    level: data.level,
    currentHp: calculateHPForLevel(data.level),
    maxHp: calculateHPForLevel(data.level),
    attack: calculateStatForLevel(data.level, 50), // Stats de base moyennes
    defense: calculateStatForLevel(data.level, 50),
    specialAttack: calculateStatForLevel(data.level, 50),
    specialDefense: calculateStatForLevel(data.level, 50),
    speed: calculateStatForLevel(data.level, 50),
    types: ['normal'], // Type par défaut
    moves: ['tackle', 'scratch'], // Attaques de base
    status: 'normal',
    gender: index % 2 === 0 ? 'male' : 'female',
    shiny: false,
    isWild: false
  }));
  
  return {
    trainerId,
    name,
    trainerClass: 'trainer',
    level: Math.round(pokemonData.reduce((sum, p) => sum + p.level, 0) / pokemonData.length),
    pokemon,
    aiProfile: createSimpleAIProfile(),
    rewards: createStandardRewards(pokemonData),
    dialogue: createBasicDialogue(name),
    specialRules: createStandardRules()
  };
}

/**
 * Crée un Gym Leader avec spécialisation de type
 */
export function createGymLeader(
  trainerId: string,
  name: string,
  specialType: string,
  pokemonCount: number = 3,
  averageLevel: number = 25
): TrainerData {
  
  // Pokémon spécialisés dans le type
  const pokemon: Pokemon[] = [];
  for (let i = 0; i < pokemonCount; i++) {
    const level = averageLevel + (i - 1) * 2; // Progression de niveau
    pokemon.push({
      id: 25 + i, // IDs Pokémon fictifs
      combatId: `gym_${trainerId}_${i}`,
      name: `${specialType}mon_${i + 1}`,
      level,
      currentHp: calculateHPForLevel(level, 1.2), // HP légèrement supérieurs
      maxHp: calculateHPForLevel(level, 1.2),
      attack: calculateStatForLevel(level, 60), // Stats supérieures
      defense: calculateStatForLevel(level, 55),
      specialAttack: calculateStatForLevel(level, 65),
      specialDefense: calculateStatForLevel(level, 55),
      speed: calculateStatForLevel(level, 58),
      types: [specialType, i === pokemonCount - 1 ? 'normal' : specialType], // Ace avec dual type
      moves: getMovesForType(specialType),
      status: 'normal',
      gender: 'male',
      shiny: i === pokemonCount - 1, // Ace est shiny
      isWild: false
    });
  }
  
  return {
    trainerId,
    name: `Leader ${name}`,
    trainerClass: 'gym_leader',
    level: averageLevel,
    pokemon,
    aiProfile: createGymLeaderAIProfile(specialType),
    rewards: createGymLeaderRewards(averageLevel, pokemonCount),
    dialogue: createGymLeaderDialogue(name, specialType),
    specialRules: createGymBattleRules()
  };
}

/**
 * Crée un Champion / Elite 4
 */
export function createChampion(
  trainerId: string,
  name: string,
  averageLevel: number = 50
): TrainerData {
  
  // Équipe complète variée
  const pokemon: Pokemon[] = [];
  const types = ['fire', 'water', 'grass', 'electric', 'psychic', 'dragon'];
  
  for (let i = 0; i < 6; i++) {
    const level = averageLevel + Math.floor(Math.random() * 4) - 2; // Variation ±2
    const pokemonType = types[i];
    
    pokemon.push({
      id: 100 + i,
      combatId: `champion_${trainerId}_${i}`,
      name: `${pokemonType.charAt(0).toUpperCase() + pokemonType.slice(1)}mon`,
      level,
      currentHp: calculateHPForLevel(level, 1.5), // HP Champions élevés
      maxHp: calculateHPForLevel(level, 1.5),
      attack: calculateStatForLevel(level, 75), // Stats très élevées
      defense: calculateStatForLevel(level, 70),
      specialAttack: calculateStatForLevel(level, 75),
      specialDefense: calculateStatForLevel(level, 70),
      speed: calculateStatForLevel(level, 72),
      types: [pokemonType],
      moves: getAdvancedMovesForType(pokemonType),
      status: 'normal',
      gender: i % 2 === 0 ? 'male' : 'female',
      shiny: Math.random() < 0.3, // 30% chance shiny
      isWild: false
    });
  }
  
  return {
    trainerId,
    name: `Champion ${name}`,
    trainerClass: 'champion',
    level: averageLevel,
    pokemon,
    aiProfile: createChampionAIProfile(),
    rewards: createChampionRewards(averageLevel),
    dialogue: createChampionDialogue(name),
    specialRules: createChampionBattleRules()
  };
}

// === FACTORIES PROFILS IA ===

export function createSimpleAIProfile(): TrainerAIProfile {
  return {
    difficulty: 'normal',
    strategies: [
      {
        name: 'basic_attack',
        priority: 80,
        conditions: ['always'],
        actions: ['use_random_move']
      },
      {
        name: 'heal_if_low',
        priority: 60,
        conditions: ['hp_below_25'],
        actions: ['use_potion']
      }
    ],
    switchPatterns: [
      {
        trigger: 'hp_low',
        threshold: 0.2,
        targetSelection: 'random'
      }
    ],
    aggressiveness: 50,
    intelligence: 40,
    memory: false
  };
}

export function createGymLeaderAIProfile(specialType: string): TrainerAIProfile {
  return {
    difficulty: 'hard',
    strategies: [
      {
        name: 'type_advantage',
        priority: 90,
        conditions: ['has_type_advantage'],
        actions: ['use_effective_move']
      },
      {
        name: 'setup_sweep',
        priority: 70,
        conditions: ['first_pokemon', 'hp_above_75'],
        actions: ['use_stat_boost']
      },
      {
        name: 'defensive_switch',
        priority: 80,
        conditions: ['type_disadvantage'],
        actions: ['switch_to_resistant']
      }
    ],
    switchPatterns: [
      {
        trigger: 'type_disadvantage',
        targetSelection: 'type_advantage'
      },
      {
        trigger: 'hp_low',
        threshold: 0.3,
        targetSelection: 'fastest'
      }
    ],
    aggressiveness: 70,
    intelligence: 80,
    memory: true
  };
}

export function createChampionAIProfile(): TrainerAIProfile {
  return {
    difficulty: 'expert',
    strategies: [
      {
        name: 'perfect_prediction',
        priority: 95,
        conditions: ['can_predict_player_move'],
        actions: ['counter_predicted_move']
      },
      {
        name: 'momentum_control',
        priority: 85,
        conditions: ['enemy_switching'],
        actions: ['use_hazards', 'predict_switch']
      },
      {
        name: 'endgame_optimization',
        priority: 90,
        conditions: ['last_pokemon'],
        actions: ['maximize_damage', 'ignore_status']
      }
    ],
    switchPatterns: [
      {
        trigger: 'type_disadvantage',
        targetSelection: 'type_advantage'
      },
      {
        trigger: 'status_inflicted',
        targetSelection: 'specific',
        specificPokemonIndex: 5 // Cleaner/Support
      },
      {
        trigger: 'setup_complete',
        targetSelection: 'specific',
        specificPokemonIndex: 0 // Sweeper
      }
    ],
    aggressiveness: 85,
    intelligence: 95,
    memory: true
  };
}

// === FACTORIES RÉCOMPENSES ===

export function createStandardRewards(pokemonData: { level: number }[]): TrainerRewards {
  const averageLevel = pokemonData.reduce((sum, p) => sum + p.level, 0) / pokemonData.length;
  const pokemonCount = pokemonData.length;
  
  return {
    baseMoney: Math.floor(averageLevel * pokemonCount * 20), // 20 pièces par niveau par Pokémon
    moneyMultiplier: 1.0,
    baseExp: Math.floor(averageLevel * 50), // 50 EXP par niveau
    expMultiplier: 1.0,
    items: []
  };
}

export function createGymLeaderRewards(averageLevel: number, pokemonCount: number): TrainerRewards {
  return {
    baseMoney: Math.floor(averageLevel * pokemonCount * 100), // Plus généreux
    moneyMultiplier: TRAINER_BATTLE_CONSTANTS.REWARD_BASE_MULTIPLIERS.gym_leader,
    baseExp: Math.floor(averageLevel * 150),
    expMultiplier: 1.5,
    items: [
      { itemId: 'tm_special', quantity: 1, chance: 1.0 }, // TM garantie
      { itemId: 'great_ball', quantity: 5, chance: 0.8 },
      { itemId: 'revive', quantity: 2, chance: 0.6 }
    ]
  };
}

export function createChampionRewards(averageLevel: number): TrainerRewards {
  return {
    baseMoney: Math.floor(averageLevel * 6 * 200), // Très généreux
    moneyMultiplier: TRAINER_BATTLE_CONSTANTS.REWARD_BASE_MULTIPLIERS.champion,
    baseExp: Math.floor(averageLevel * 300),
    expMultiplier: 2.0,
    items: [
      { itemId: 'master_ball', quantity: 1, chance: 1.0 },
      { itemId: 'rare_candy', quantity: 3, chance: 1.0 },
      { itemId: 'pp_max', quantity: 3, chance: 0.9 },
      { itemId: 'golden_berry', quantity: 10, chance: 1.0 }
    ]
  };
}

// === FACTORIES DIALOGUES ===

export function createBasicDialogue(trainerName: string): TrainerDialogue {
  return {
    prebattle: [
      `Salut ! Je suis ${trainerName}, et j'aime les combats Pokémon !`,
      `Montre-moi ce dont tes Pokémon sont capables !`
    ],
    victory: [
      `Wow ! Tu es vraiment fort !`,
      `J'ai appris beaucoup de choses de ce combat !`
    ],
    defeat: [
      `Haha ! Cette fois, c'est moi qui ai gagné !`,
      `Mais tu t'es bien battu ! Continue à t'entraîner !`
    ],
    rematch: [
      `Oh ! On se revoit !`,
      `J'ai entraîné mes Pokémon depuis notre dernier combat !`
    ]
  };
}

export function createGymLeaderDialogue(name: string, specialType: string): TrainerDialogue {
  return {
    prebattle: [
      `Bienvenue dans l'Arène de ${name} !`,
      `Je suis spécialisé dans les Pokémon de type ${specialType}.`,
      `Voyons si tu peux surmonter ma spécialité !`
    ],
    victory: [
      `Incroyable ! Tu as vaincu ma spécialité ${specialType} !`,
      `Tu mérites vraiment ce Badge ! Prends-le avec fierté !`,
      `Continue sur cette voie, tu iras loin !`
    ],
    defeat: [
      `La puissance du type ${specialType} était trop forte !`,
      `Entraîne-toi encore et reviens me défier !`,
      `N'abandonne jamais ! Le Badge t'attend !`
    ]
  };
}

export function createChampionDialogue(name: string): TrainerDialogue {
  return {
    prebattle: [
      `Félicitations d'être arrivé jusqu'ici...`,
      `Je suis ${name}, le Champion de cette région.`,
      `Tu as vaincu la Ligue, mais le vrai défi commence maintenant.`,
      `Montre-moi la vraie force de tes liens avec tes Pokémon !`
    ],
    victory: [
      `... Incroyable.`,
      `Tu as non seulement la force, mais aussi l'âme d'un vrai Champion.`,
      `Je te confie officiellement le titre de Champion !`,
      `Mais souviens-toi : être Champion, c'est protéger cette région et ses Pokémon.`
    ],
    defeat: [
      `Tu t'es bien battu, mais l'expérience a fait la différence.`,
      `Le chemin du Champion n'est pas facile.`,
      `Reviens quand tu auras encore grandi avec tes Pokémon.`
    ]
  };
}

// === FACTORIES RÈGLES ===

export function createStandardRules(): TrainerBattleRules {
  return {
    allowSwitching: true,
    forceSwitch: true,
    maxSwitchesPerTurn: 1,
    switchCooldown: 0,
    itemsAllowed: false,
    megaEvolution: false
  };
}

export function createGymBattleRules(): TrainerBattleRules {
  return {
    allowSwitching: true,
    forceSwitch: true,
    maxSwitchesPerTurn: 1,
    switchCooldown: 1, // Cooldown plus élevé
    itemsAllowed: false, // Pas d'objets contre Gym Leaders
    megaEvolution: false
  };
}

export function createChampionBattleRules(): TrainerBattleRules {
  return {
    allowSwitching: true,
    forceSwitch: true,
    maxSwitchesPerTurn: 1,
    switchCooldown: 0,
    itemsAllowed: true, // Champions peuvent utiliser objets
    megaEvolution: true  // Méga-évolution activée
  };
}

// === HELPERS CALCULS ===

export function calculateHPForLevel(level: number, multiplier: number = 1.0): number {
  // Formule simplifiée HP = (2 * base + IV + EV/4) * level / 100 + level + 10
  const baseHP = 50; // HP de base moyen
  return Math.floor(((2 * baseHP + 15) * level / 100 + level + 10) * multiplier);
}

export function calculateStatForLevel(level: number, baseStat: number, multiplier: number = 1.0): number {
  // Formule stat = (2 * base + IV + EV/4) * level / 100 + 5
  return Math.floor(((2 * baseStat + 15) * level / 100 + 5) * multiplier);
}

export function getMovesForType(type: string): string[] {
  const movesByType: Record<string, string[]> = {
    fire: ['ember', 'flame_wheel', 'fire_punch', 'flamethrower'],
    water: ['water_gun', 'bubble_beam', 'surf', 'hydro_pump'],
    grass: ['vine_whip', 'razor_leaf', 'solar_beam', 'petal_dance'],
    electric: ['thundershock', 'spark', 'thunderbolt', 'thunder'],
    normal: ['tackle', 'scratch', 'body_slam', 'hyper_beam'],
    psychic: ['confusion', 'psybeam', 'psychic', 'future_sight']
  };
  
  return movesByType[type] || movesByType.normal;
}

export function getAdvancedMovesForType(type: string): string[] {
  const advancedMoves: Record<string, string[]> = {
    fire: ['fire_blast', 'overheat', 'flame_charge', 'will_o_wisp'],
    water: ['hydro_pump', 'ice_beam', 'surf', 'toxic'],
    grass: ['solar_beam', 'energy_ball', 'sleep_powder', 'leech_seed'],
    electric: ['thunder', 'volt_switch', 'thunder_wave', 'charge_beam'],
    psychic: ['psychic', 'calm_mind', 'recover', 'light_screen'],
    dragon: ['dragon_claw', 'dragon_dance', 'outrage', 'roost']
  };
  
  return advancedMoves[type] || getMovesForType(type);
}

// === HELPERS CONVERSION ===

/**
 * Convertit des IOwnedPokemon vers TrainerData pour les NPCs
 */
export async function convertOwnedPokemonToTrainerData(
  trainerId: string,
  trainerName: string,
  ownedPokemon: IOwnedPokemon[],
  trainerClass: string = 'trainer'
): Promise<TrainerData> {
  
  const pokemon: Pokemon[] = [];
  
  for (const owned of ownedPokemon) {
    // Récupérer données Pokémon depuis la DB
    const pokemonData = await getPokemonById(owned.pokemonId);
    
    pokemon.push({
      id: owned.pokemonId,
      combatId: `trainer_${trainerId}_${owned._id}`,
      name: owned.nickname || pokemonData.name,
      level: owned.level,
      currentHp: owned.currentHp,
      maxHp: owned.maxHp,
      attack: owned.calculatedStats.attack,
      defense: owned.calculatedStats.defense,
      specialAttack: owned.calculatedStats.spAttack,
      specialDefense: owned.calculatedStats.spDefense,
      speed: owned.calculatedStats.speed,
      types: pokemonData.types,
      moves: owned.moves.map(m => m.moveId),
      status: owned.status as string,
      gender: owned.gender,
      shiny: owned.shiny,
      isWild: false
    });
  }
  
  const averageLevel = Math.round(pokemon.reduce((sum, p) => sum + p.level, 0) / pokemon.length);
  
  return {
    trainerId,
    name: trainerName,
    trainerClass,
    level: averageLevel,
    pokemon,
    aiProfile: trainerClass === 'gym_leader' ? 
      createGymLeaderAIProfile('normal') : 
      createSimpleAIProfile(),
    rewards: createStandardRewards(pokemon.map(p => ({ level: p.level }))),
    dialogue: createBasicDialogue(trainerName),
    specialRules: createStandardRules()
  };
}

// === EXPORTS ===

export const TrainerBattleHelpers = {
  // Factories principales
  createSimpleTrainer,
  createGymLeader,
  createChampion,
  
  // Factories profils
  createSimpleAIProfile,
  createGymLeaderAIProfile,
  createChampionAIProfile,
  
  // Factories récompenses
  createStandardRewards,
  createGymLeaderRewards,
  createChampionRewards,
  
  // Factories dialogues
  createBasicDialogue,
  createGymLeaderDialogue,
  createChampionDialogue,
  
  // Factories règles
  createStandardRules,
  createGymBattleRules,
  createChampionBattleRules,
  
  // Helpers calculs
  calculateHPForLevel,
  calculateStatForLevel,
  getMovesForType,
  getAdvancedMovesForType,
  
  // Conversion
  convertOwnedPokemonToTrainerData
};

export default TrainerBattleHelpers;
