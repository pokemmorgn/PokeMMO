// server/src/rewards/RewardManager.ts

import { ExperienceReward } from './ExperienceReward';
import { MoneyReward } from './MoneyReward';
import { ItemReward } from './ItemReward';
import { getServerConfig } from '../config/serverConfig';
import { 
  RewardBundle, 
  RewardResult, 
  RewardSource, 
  Reward, 
  ProcessedReward, 
  RewardNotification,
  BattleExperienceConfig,
  TrainerRewardConfig,
  TRAINER_CLASSES 
} from './types/RewardTypes';

export class RewardManager {
  private experienceReward: ExperienceReward;
  private moneyReward: MoneyReward;
  private itemReward: ItemReward;

  constructor() {
    this.experienceReward = new ExperienceReward();
    this.moneyReward = new MoneyReward();
    this.itemReward = new ItemReward();
  }

  /**
   * 🎁 MÉTHODE PRINCIPALE - Distribue un bundle de récompenses
   */
  async giveRewards(bundle: RewardBundle): Promise<RewardResult> {
    console.log(`🎁 [RewardManager] Distribution récompenses pour ${bundle.playerId} (source: ${bundle.source.sourceType})`);

    const result: RewardResult = {
      success: true,
      processedRewards: [],
      totalExperience: 0,
      totalMoney: 0,
      itemsGiven: [],
      notifications: []
    };

    try {
      // Traiter chaque récompense
      for (const reward of bundle.rewards) {
        const processed = await this.processIndividualReward(reward, bundle.playerId, bundle.source);
        result.processedRewards.push(processed);

        if (!processed.success) {
          console.warn(`⚠️ [RewardManager] Échec récompense ${reward.type}: ${processed.error}`);
          continue;
        }

        // Agréger les totaux
        this.aggregateResults(result, processed, reward);
      }

      // Générer les notifications finales
      this.generateSummaryNotifications(result, bundle.source);

      console.log(`✅ [RewardManager] Récompenses distribuées: ${result.totalExperience} XP, ${result.totalMoney} PokéDollars, ${result.itemsGiven.length} objets`);

    } catch (error) {
      console.error('❌ [RewardManager] Erreur distribution récompenses:', error);
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Erreur inconnue';
    }

    return result;
  }

  /**
   * 🔥 MÉTHODE RAPIDE - Récompenses de combat
   */
  async giveBattleRewards(
    playerId: string, 
    config: BattleExperienceConfig,
    trainerClass?: string
  ): Promise<RewardResult> {
    const rewards: Reward[] = [];
    const serverConfig = getServerConfig();

    // === EXPÉRIENCE ===
    if (config.participatingPokemon.length > 0) {
      for (const pokemon of config.participatingPokemon) {
        if (pokemon.participated) {
          rewards.push({
            type: 'experience',
            pokemonId: pokemon.pokemonId,
            baseAmount: this.calculateBattleBaseExp(config.defeatedPokemon),
            multipliers: {
              trainer: config.battleType !== 'wild' ? 1.5 : 1.0,
              traded: pokemon.isTraded ? 1.5 : 1.0,
              luckyEgg: pokemon.hasLuckyEgg ? 1.5 : 1.0,
              weather: serverConfig.weatherSystem.enabled ? serverConfig.xpRate : 1.0,
              event: serverConfig.eventXpBonusActive ? 2.0 : 1.0
            }
          });
        }
      }
    }

    // === ARGENT (seulement contre dresseurs) ===
    if (config.battleType !== 'wild' && trainerClass) {
      const trainerConfig = TRAINER_CLASSES[trainerClass] || TRAINER_CLASSES['youngster'];
      const moneyAmount = trainerConfig.basePayout * config.defeatedPokemon.level;

      rewards.push({
        type: 'money',
        amount: moneyAmount,
        multipliers: {
          event: serverConfig.eventXpBonusActive ? 1.5 : 1.0
        }
      });
    }

    return this.giveRewards({
      rewards,
      source: {
        sourceType: 'battle',
        sourceId: `battle_${config.battleType}_${Date.now()}`,
        metadata: {
          battleType: config.battleType,
          defeatedPokemon: config.defeatedPokemon,
          trainerClass
        }
      },
      playerId
    });
  }

  /**
   * 🎯 MÉTHODE RAPIDE - Récompenses de capture
   */
  async giveCaptureRewards(
    playerId: string,
    capturedPokemon: { pokemonId: number; level: number; shiny: boolean },
    ballUsed: string
  ): Promise<RewardResult> {
    const rewards: Reward[] = [];
    const serverConfig = getServerConfig();

    // XP de capture (bonus selon la rareté)
    let captureExp = 50 + (capturedPokemon.level * 2);
    if (capturedPokemon.shiny) {
      captureExp *= 3; // Bonus shiny
    }

    rewards.push({
      type: 'experience',
      baseAmount: captureExp,
      multipliers: {
        event: serverConfig.eventXpBonusActive ? 1.5 : 1.0
      }
    });

    // Bonus argent pour capture difficile
    if (['ultra_ball', 'master_ball'].includes(ballUsed)) {
      rewards.push({
        type: 'money',
        amount: 100,
        multipliers: {
          event: serverConfig.eventXpBonusActive ? 1.2 : 1.0
        }
      });
    }

    return this.giveRewards({
      rewards,
      source: {
        sourceType: 'capture',
        sourceId: `capture_${capturedPokemon.pokemonId}_${Date.now()}`,
        metadata: {
          pokemonId: capturedPokemon.pokemonId,
          ballUsed,
          wasShiny: capturedPokemon.shiny
        }
      },
      playerId
    });
  }

  /**
   * 📋 MÉTHODE RAPIDE - Récompenses de quête
   */
  async giveQuestRewards(
    playerId: string,
    questId: string,
    rewards: Reward[]
  ): Promise<RewardResult> {
    return this.giveRewards({
      rewards,
      source: {
        sourceType: 'quest',
        sourceId: questId,
        metadata: { questCompleted: true }
      },
      playerId
    });
  }

  /**
   * 🏆 MÉTHODE RAPIDE - Récompenses d'achievement
   */
  async giveAchievementRewards(
    playerId: string,
    achievementId: string,
    rewards: Reward[]
  ): Promise<RewardResult> {
    return this.giveRewards({
      rewards,
      source: {
        sourceType: 'achievement',
        sourceId: achievementId,
        metadata: { achievementUnlocked: true }
      },
      playerId
    });
  }

  // === MÉTHODES PRIVÉES ===

  private async processIndividualReward(
    reward: Reward, 
    playerId: string, 
    source: RewardSource
  ): Promise<ProcessedReward> {
    try {
      switch (reward.type) {
        case 'experience':
          return await this.experienceReward.giveExperience(playerId, reward);

        case 'money':
          return await this.moneyReward.giveMoney(playerId, reward);

        case 'item':
          return await this.itemReward.giveItem(playerId, reward);

        case 'pokemon':
          // TODO: Implémenter quand on aura le système de génération de Pokémon
          return {
            type: 'pokemon',
            success: false,
            error: 'Récompense Pokémon pas encore implémentée'
          };

        default:
          return {
            type: reward.type,
            success: false,
            error: `Type de récompense inconnu: ${(reward as any).type}`
          };
      }
    } catch (error) {
      return {
        type: reward.type,
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  private aggregateResults(
    result: RewardResult, 
    processed: ProcessedReward, 
    reward: Reward
  ): void {
    if (!processed.success) return;

    switch (reward.type) {
      case 'experience':
        result.totalExperience += processed.finalAmount || 0;
        break;

      case 'money':
        result.totalMoney += processed.finalAmount || 0;
        break;

      case 'item':
        if (processed.data) {
          result.itemsGiven.push({
            itemId: processed.data.itemId,
            quantity: processed.data.quantity,
            pocket: processed.data.pocket
          });
        }
        break;
    }

    // Ajouter les notifications spécifiques
    if (processed.data?.notifications) {
      result.notifications.push(...processed.data.notifications);
    }
  }

  private generateSummaryNotifications(result: RewardResult, source: RewardSource): void {
    // Notification globale de gain
    if (result.totalExperience > 0 || result.totalMoney > 0 || result.itemsGiven.length > 0) {
      let summary = "Récompenses obtenues: ";
      const parts: string[] = [];

      if (result.totalExperience > 0) {
        parts.push(`${result.totalExperience} XP`);
      }
      if (result.totalMoney > 0) {
        parts.push(`${result.totalMoney} PokéDollars`);
      }
      if (result.itemsGiven.length > 0) {
        parts.push(`${result.itemsGiven.length} objet(s)`);
      }

      summary += parts.join(", ");

      result.notifications.push({
        type: 'achievement',
        message: summary,
        priority: 'medium',
        data: {
          source: source.sourceType,
          sourceId: source.sourceId
        }
      });
    }
  }

  private calculateBattleBaseExp(defeatedPokemon: { pokemonId: number; level: number }): number {
    // Formule Pokémon classique
    // baseExp = (Pokémon's base exp yield * enemy level) / 7
    
    // Base exp selon le Pokémon (on peut faire une lookup table plus tard)
    const baseExpYield = this.getPokemonBaseExpYield(defeatedPokemon.pokemonId);
    
    return Math.floor((baseExpYield * defeatedPokemon.level) / 7);
  }

  private getPokemonBaseExpYield(pokemonId: number): number {
    // Valeurs par défaut basées sur les générations classiques
    const baseExpTable: Record<number, number> = {
      // Starters
      1: 64,   // Bulbasaur
      2: 142,  // Ivysaur  
      3: 236,  // Venusaur
      4: 62,   // Charmander
      5: 142,  // Charmeleon
      6: 240,  // Charizard
      7: 63,   // Squirtle
      8: 142,  // Wartortle
      9: 239,  // Blastoise
      
      // Pokémon communs
      10: 39,  // Caterpie
      11: 72,  // Metapod
      12: 178, // Butterfree
      16: 50,  // Pidgey
      17: 122, // Pidgeotto
      18: 216, // Pidgeot
      19: 51,  // Rattata
      20: 145, // Raticate
      25: 112, // Pikachu
      26: 218  // Raichu
    };

    return baseExpTable[pokemonId] || 100; // Valeur par défaut
  }

  // === MÉTHODES UTILITAIRES PUBLIQUES ===

  /**
   * 📊 Obtenir les statistiques des récompenses d'un joueur
   */
  async getPlayerRewardStats(playerId: string): Promise<{
    totalExperienceGained: number;
    totalMoneyEarned: number;
    itemsReceived: number;
    rewardsToday: number;
  }> {
    // TODO: Implémenter avec une base de données des historiques
    return {
      totalExperienceGained: 0,
      totalMoneyEarned: 0,
      itemsReceived: 0,
      rewardsToday: 0
    };
  }

  /**
   * ⚙️ Calculer les multiplicateurs actuels pour un joueur
   */
  getActiveMultipliers(playerId: string): Record<string, number> {
    const serverConfig = getServerConfig();
    
    return {
      xp: serverConfig.xpRate,
      money: serverConfig.moneyRate,
      weather: serverConfig.weatherSystem.enabled ? 1.0 : 1.0,
      event: serverConfig.eventXpBonusActive ? 1.5 : 1.0
    };
  }
}
