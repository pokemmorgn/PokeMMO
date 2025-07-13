// server/src/rewards/index.ts
// Export principal du système de récompenses

// === GESTIONNAIRE PRINCIPAL ===
export { RewardManager } from './RewardManager';

// === GESTIONNAIRES SPÉCIALISÉS ===
export { ExperienceReward } from './ExperienceReward';
export { MoneyReward } from './MoneyReward';
export { ItemReward } from './ItemReward';

// === TYPES ET INTERFACES ===
export * from './types/RewardTypes';

// === EXEMPLES D'INTÉGRATION ===
export * from '../examples/RewardIntegrationExample';

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
  source: { sourceType: string; sourceId: string; metadata?: any }
) {
  return await globalRewardManager.giveRewards({
    rewards,
    source,
    playerId
  });
}

/**
 * 🥊 FONCTION UTILITAIRE RAPIDE - Récompenses de combat
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
 * 🎯 FONCTION UTILITAIRE RAPIDE - Récompenses de capture
 * Usage: await giveCaptureRewards(playerId, pokemon, ballUsed)
 */
export async function giveCaptureRewards(
  playerId: string,
  pokemon: { pokemonId: number; level: number; shiny: boolean },
  ballUsed: string
) {
  return await globalRewardManager.giveCaptureRewards(playerId, pokemon, ballUsed);
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

// === CONSTANTES UTILES ===
export const REWARD_CONSTANTS = {
  MAX_LEVEL: 100,
  TRAINER_EXP_MULTIPLIER: 1.5,
  LUCKY_EGG_MULTIPLIER: 1.5,
  TRADED_POKEMON_MULTIPLIER: 1.5,
  
  // Classes de dresseurs et leurs récompenses
  TRAINER_CLASSES: {
    'youngster': 16,
    'lass': 16,
    'bug_catcher': 12,
    'gym_leader': 100,
    'elite_four': 200,
    'champion': 500
  },
  
  // Items rares
  RARE_ITEMS: [
    'master_ball',
    'max_revive', 
    'full_restore',
    'bicycle',
    'exp_share'
  ]
} as const;

// === HELPER POUR DEBUGGING ===
export async function debugRewardSystem(playerId: string) {
  console.log(`🔍 [RewardSystem] Debug pour ${playerId}:`);
  
  const multipliers = globalRewardManager.getActiveMultipliers(playerId);
  console.log('  Multiplicateurs actifs:', multipliers);
  
  // TODO: Ajouter plus de diagnostics
  return {
    playerId,
    activeMultipliers: multipliers,
    systemStatus: 'operational'
  };
}
