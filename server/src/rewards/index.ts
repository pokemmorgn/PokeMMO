// server/src/rewards/index.ts
// Export principal du système de récompenses étendu avec amitié et capture

// === GESTIONNAIRE PRINCIPAL ===
export { RewardManager } from './RewardManager';

// === GESTIONNAIRES SPÉCIALISÉS ===
export { ExperienceReward } from './ExperienceReward';
export { MoneyReward } from './MoneyReward';
export { ItemReward } from './ItemReward';
export { FriendshipReward } from './FriendshipReward';
export { CaptureReward } from './CaptureReward';

// === TYPES ET INTERFACES ===
export * from './types/RewardTypes';

// === EXEMPLES D'INTÉGRATION ===
// export * from '../examples/RewardIntegrationExample'; // TODO: Créer ce fichier

// === INSTANCE GLOBALE POUR UTILISATION SIMPLE ===
import { RewardManager } from './RewardManager';
export const globalRewardManager = new RewardManager();

/**
 * 🎁 FONCTION UTILITAIRE RAPIDE - Distribution de récompenses
 * Usage: await giveRewards(playerId, [...rewards], source)
 */
export async function giveRewards(
  playerId: string,
  rewards: any[],
  source: { sourceType: 'battle' | 'quest' | 'achievement' | 'capture' | 'trade' | 'daily' | 'event' | 'friendship' | 'breeding'; sourceId: string; metadata?: any }
) {
  return await globalRewardManager.giveRewards({
    rewards,
    source,
    playerId
  });
}

/**
 * 🥊 FONCTION UTILITAIRE RAPIDE - Récompenses de combat avec amitié
 * Usage: await giveBattleRewards(playerId, battleConfig, trainerClass?)
 */
export async function giveBattleRewards(
  playerId: string,
  battleConfig: any,
  trainerClass?: string
) {
  return await globalRewardManager.giveBattleRewards(playerId, battleConfig, trainerClass);
}

/**
 * 🎯 FONCTION UTILITAIRE RAPIDE - Récompenses de capture complètes
 * Usage: await giveCaptureRewards(playerId, pokemon, ownedPokemonId?)
 */
export async function giveCaptureRewards(
  playerId: string,
  pokemon: { 
    pokemonId: number; 
    level: number; 
    shiny: boolean;
    ballUsed: string;
    attempts: number;
    wasCritical: boolean;
    wasWeakened: boolean;
  },
  ownedPokemonId?: string
) {
  return await globalRewardManager.giveCaptureRewards(
    playerId, 
    {
      pokemonId: pokemon.pokemonId,
      level: pokemon.level,
      shiny: pokemon.shiny,
      ballUsed: pokemon.ballUsed,
      attempts: pokemon.attempts,
      wasCritical: pokemon.wasCritical,
      wasWeakened: pokemon.wasWeakened
    }, 
    ownedPokemonId
  );
}

/**
 * 💖 FONCTION UTILITAIRE RAPIDE - Donner de l'amitié
 * Usage: await giveFriendship(playerId, pokemonId, amount, reason)
 */
export async function giveFriendship(
  playerId: string,
  pokemonId: string,
  friendshipGain: number = 5,
  reason: string = 'manual'
) {
  return await globalRewardManager.giveFriendshipReward(playerId, pokemonId, friendshipGain, reason);
}

/**
 * 🚶 FONCTION UTILITAIRE RAPIDE - Amitié de marche
 * Usage: await giveWalkingFriendship(playerId, teamIds, steps)
 */
export async function giveWalkingFriendship(
  playerId: string,
  teamPokemonIds: string[],
  steps: number
) {
  return await globalRewardManager.giveWalkingFriendship(playerId, teamPokemonIds, steps);
}

/**
 * 💰 FONCTION UTILITAIRE RAPIDE - Donner de l'argent
 * Usage: await giveMoney(playerId, amount)
 */
export async function giveMoney(playerId: string, amount: number) {
  return await giveRewards(playerId, [
    { type: 'money', amount }
  ], {
    sourceType: 'manual',
    sourceId: `money_${Date.now()}`
  });
}

/**
 * ⭐ FONCTION UTILITAIRE RAPIDE - Donner de l'XP
 * Usage: await giveExperience(playerId, amount, pokemonId?)
 */
export async function giveExperience(
  playerId: string, 
  amount: number, 
  pokemonId?: string
) {
  return await giveRewards(playerId, [
    { 
      type: 'experience', 
      baseAmount: amount,
      pokemonId 
    }
  ], {
    sourceType: 'manual',
    sourceId: `exp_${Date.now()}`
  });
}

/**
 * 🎒 FONCTION UTILITAIRE RAPIDE - Donner un objet
 * Usage: await giveItem(playerId, itemId, quantity)
 */
export async function giveItem(
  playerId: string, 
  itemId: string, 
  quantity: number = 1
) {
  return await giveRewards(playerId, [
    { 
      type: 'item', 
      itemId, 
      quantity 
    }
  ], {
    sourceType: 'manual',
    sourceId: `item_${Date.now()}`
  });
}

/**
 * 🔮 FONCTION UTILITAIRE - Prévisualiser récompenses de capture
 * Usage: await previewCaptureRewards(playerId, pokemonId, level, ballType, isShiny?)
 */
export async function previewCaptureRewards(
  playerId: string,
  pokemonId: number,
  level: number,
  ballType: string,
  isShiny: boolean = false
) {
  return await globalRewardManager.previewCaptureRewards(playerId, pokemonId, level, ballType, isShiny);
}

/**
 * 💖 FONCTION UTILITAIRE - Obtenir info d'amitié
 * Usage: await getPokemonFriendshipInfo(pokemonId)
 */
export async function getPokemonFriendshipInfo(pokemonId: string) {
  return await globalRewardManager.getPokemonFriendshipInfo(pokemonId);
}

/**
 * 🔄 FONCTION UTILITAIRE - Pokémon prêts à évoluer
 * Usage: await getEvolutionReadyPokemon(playerId)
 */
export async function getEvolutionReadyPokemon(playerId: string) {
  return await globalRewardManager.getEvolutionReadyPokemon(playerId);
}

/**
 * 📊 FONCTION UTILITAIRE - Statistiques de récompenses
 * Usage: await getPlayerRewardStats(playerId)
 */
export async function getPlayerRewardStats(playerId: string) {
  return await globalRewardManager.getPlayerRewardStats(playerId);
}

// === CONSTANTES UTILES ÉTENDUES ===
export const REWARD_CONSTANTS = {
  MAX_LEVEL: 100,
  MAX_FRIENDSHIP: 255,
  TRAINER_EXP_MULTIPLIER: 1.5,
  LUCKY_EGG_MULTIPLIER: 1.5,
  TRADED_POKEMON_MULTIPLIER: 1.5,
  FRIENDSHIP_MAX_MULTIPLIER: 1.2,
  
  // Classes de dresseurs et leurs récompenses
  TRAINER_CLASSES: {
    'youngster': 16,
    'lass': 16,
    'bug_catcher': 12,
    'gym_leader': 100,
    'elite_four': 200,
    'champion': 500
  },
  
  // Niveaux d'amitié
  FRIENDSHIP_LEVELS: {
    HOSTILE: { min: 0, name: 'Hostile', multiplier: 0.8 },
    NEUTRAL: { min: 70, name: 'Neutre', multiplier: 1.0 },
    FRIENDLY: { min: 100, name: 'Amical', multiplier: 1.05 },
    AFFECTIONATE: { min: 150, name: 'Affectueux', multiplier: 1.1 },
    LOYAL: { min: 200, name: 'Loyal', multiplier: 1.15 },
    DEVOTED: { min: 255, name: 'Dévoué', multiplier: 1.2 }
  },
  
  // Bonus de capture
  CAPTURE_BONUSES: {
    CRITICAL: { chance: 0.05, expBonus: 1.5, moneyBonus: 200 },
    NEW_SPECIES: { expBonus: 2.0, moneyBonus: 500 },
    SHINY: { expBonus: 3.0, moneyBonus: 1000, prestigeBonus: 100 },
    QUICK: { expBonus: 1.3, moneyBonus: 100 },
    WEAKENED: { expBonus: 1.2, friendshipBonus: 10 }
  },
  
  // Items rares
  RARE_ITEMS: [
    'master_ball',
    'max_revive', 
    'full_restore',
    'bicycle',
    'exp_share',
    'luxury_ball'
  ],
  
  // Items d'amitié
  FRIENDSHIP_ITEMS: {
    'luxury_ball': 30,
    'soothe_bell': 15,
    'poke_puff': 20,
    'grooming_kit': 25
  }
} as const;

// === HELPER POUR DEBUGGING ÉTENDU ===
export async function debugRewardSystem(playerId: string) {
  console.log(`🔍 [RewardSystem] Debug étendu pour ${playerId}:`);
  
  const multipliers = globalRewardManager.getActiveMultipliers(playerId);
  const rewardStats = await globalRewardManager.getPlayerRewardStats(playerId);
  const evolutionReady = await globalRewardManager.getEvolutionReadyPokemon(playerId);
  
  console.log('  Multiplicateurs actifs:', multipliers);
  console.log('  Stats de récompenses:', rewardStats);
  console.log('  Pokémon prêts à évoluer:', evolutionReady.length);
  
  return {
    playerId,
    activeMultipliers: multipliers,
    rewardStats,
    evolutionReadyCount: evolutionReady.length,
    systemStatus: 'operational_extended',
    features: [
      'experience_rewards',
      'money_rewards', 
      'item_rewards',
      'friendship_system',
      'capture_rewards',
      'battle_integration',
      'walking_friendship',
      'evolution_tracking',
      'achievement_system',
      'prestige_system'
    ]
  };
}

// === FONCTIONS AVANCÉES ===

/**
 * 🎯 FONCTION COMPLÈTE - Traiter une capture complète avec toutes les récompenses
 */
export async function handleCompleteCapture(
  playerId: string,
  captureData: {
    pokemonId: number;
    level: number;
    isShiny: boolean;
    ballUsed: string;
    attempts: number;
    wasCritical: boolean;
    wasWeakened: boolean;
  },
  ownedPokemonId: string
): Promise<{
  success: boolean;
  rewards: {
    experience: number;
    money: number;
    friendship: number;
    items: number;
    prestige: number;
  };
  notifications: any[];
  achievements: string[];
  evolutionReady: boolean;
}> {
  try {
    // 1. Récompenses de capture
    const captureResult = await giveCaptureRewards(playerId, {
      pokemonId: captureData.pokemonId,
      level: captureData.level,
      shiny: captureData.isShiny,
      ballUsed: captureData.ballUsed,
      attempts: captureData.attempts,
      wasCritical: captureData.wasCritical,
      wasWeakened: captureData.wasWeakened
    }, ownedPokemonId);
    
    // 2. Vérifier évolutions possibles par amitié
    const evolutionReady = await getEvolutionReadyPokemon(playerId);
    const thisPokemonEvolutionReady = evolutionReady.some(p => p.pokemonId === ownedPokemonId);
    
    if (!captureResult.success) {
      return {
        success: false,
        rewards: { experience: 0, money: 0, friendship: 0, items: 0, prestige: 0 },
        notifications: [],
        achievements: [],
        evolutionReady: false
      };
    }

    return {
      success: true,
      rewards: {
        experience: captureResult.totalExperience,
        money: captureResult.totalMoney,
        friendship: captureResult.totalFriendship,
        items: captureResult.itemsGiven.length,
        prestige: 0 // TODO: Extraire du résultat
      },
      notifications: captureResult.notifications,
      achievements: captureResult.specialEvents?.map(e => e.type) || [],
      evolutionReady: thisPokemonEvolutionReady
    };

  } catch (error) {
    console.error('❌ [RewardSystem] Erreur capture complète:', error);
    return {
      success: false,
      rewards: { experience: 0, money: 0, friendship: 0, items: 0, prestige: 0 },
      notifications: [],
      achievements: [],
      evolutionReady: false
    };
  }
}

/**
 * 🥊 FONCTION COMPLÈTE - Traiter un combat complet avec amitié
 */
export async function handleCompleteBattle(
  playerId: string,
  battleData: {
    participatingPokemon: Array<{
      pokemonId: string;
      level: number;
      participated: boolean;
      hasLuckyEgg: boolean;
      isTraded: boolean;
      friendship: number;
      switchedIn: boolean;
    }>;
    defeatedPokemon: {
      pokemonId: number;
      level: number;
      isTrainer: boolean;
    };
    battleType: 'wild' | 'trainer' | 'gym' | 'elite_four';
    expShareActive: boolean;
  },
  trainerClass?: string
): Promise<{
  success: boolean;
  rewards: {
    totalExperience: number;
    totalMoney: number;
    totalFriendship: number;
  };
  notifications: any[];
  levelUps: Array<{ pokemonId: string; newLevel: number }>;
  evolutionsReady: string[];
}> {
  try {
    // 1. Récompenses de combat
    const battleResult = await giveBattleRewards(playerId, battleData, trainerClass);
    
    // 2. Vérifier évolutions possibles
    const evolutionReady = await getEvolutionReadyPokemon(playerId);
    
    if (!battleResult.success) {
      return {
        success: false,
        rewards: { totalExperience: 0, totalMoney: 0, totalFriendship: 0 },
        notifications: [],
        levelUps: [],
        evolutionsReady: []
      };
    }

    // 3. Extraire les level ups des notifications
    const levelUps = battleResult.notifications
      .filter(n => n.type === 'level_up')
      .map(n => ({
        pokemonId: n.data?.pokemonId || '',
        newLevel: n.data?.newLevel || 0
      }));

    return {
      success: true,
      rewards: {
        totalExperience: battleResult.totalExperience,
        totalMoney: battleResult.totalMoney,
        totalFriendship: battleResult.totalFriendship
      },
      notifications: battleResult.notifications,
      levelUps,
      evolutionsReady: evolutionReady.map(p => p.pokemonId)
    };

  } catch (error) {
    console.error('❌ [RewardSystem] Erreur combat complet:', error);
    return {
      success: false,
      rewards: { totalExperience: 0, totalMoney: 0, totalFriendship: 0 },
      notifications: [],
      levelUps: [],
      evolutionsReady: []
    };
  }
}
