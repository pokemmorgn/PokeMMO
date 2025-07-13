// server/src/rewards/RewardManager.ts

import { ExperienceReward } from './ExperienceReward';
import { MoneyReward } from './MoneyReward';
import { ItemReward } from './ItemReward';
import { FriendshipReward } from './FriendshipReward';
import { CaptureReward } from './CaptureReward';
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
  TRAINER_CLASSES,
  ExtendedRewardBundle,
  FriendshipReward as FriendshipRewardType,
  CaptureReward as CaptureRewardType
} from './types/RewardTypes';

export class RewardManager {
  private experienceReward: ExperienceReward;
  private moneyReward: MoneyReward;
  private itemReward: ItemReward;
  private friendshipReward: FriendshipReward;
  private captureReward: CaptureReward;

  constructor() {
    this.experienceReward = new ExperienceReward();
    this.moneyReward = new MoneyReward();
    this.itemReward = new ItemReward();
    this.friendshipReward = new FriendshipReward();
    this.captureReward = new CaptureReward();
  }

  /**
   * 🎁 MÉTHODE PRINCIPALE - Distribue un bundle de récompenses étendu
   */
  async giveRewards(bundle: ExtendedRewardBundle): Promise<RewardResult> {
    console.log(`🎁 [RewardManager] Distribution récompenses étendues pour ${bundle.playerId} (source: ${bundle.source.sourceType})`);

    const result: RewardResult = {
      success: true,
      processedRewards: [],
      totalExperience: 0,
      totalMoney: 0,
      totalFriendship: 0,
      itemsGiven: [],
      notifications: [],
      specialEvents: []
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

      // Appliquer les contextes étendus
      await this.processExtendedContexts(bundle, result);

      // Générer les notifications finales
      this.generateSummaryNotifications(result, bundle.source);

      // Vérifier les événements spéciaux
      await this.checkSpecialEvents(bundle, result);

      console.log(`✅ [RewardManager] Récompenses distribuées: ${result.totalExperience} XP, ${result.totalMoney} PokéDollars, ${result.totalFriendship} Amitié, ${result.itemsGiven.length} objets`);

    } catch (error) {
      console.error('❌ [RewardManager] Erreur distribution récompenses:', error);
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Erreur inconnue';
    }

    return result;
  }

  /**
   * 🔥 MÉTHODE RAPIDE - Récompenses de combat avec amitié
   */
  async giveBattleRewards(
    playerId: string, 
    config: BattleExperienceConfig,
    trainerClass?: string
  ): Promise<RewardResult> {
    const rewards: Reward[] = [];
    const serverConfig = getServerConfig();

    // === EXPÉRIENCE AVEC BONUS D'AMITIÉ ===
    if (config.participatingPokemon.length > 0) {
      for (const pokemon of config.participatingPokemon) {
        if (pokemon.participated) {
          // Calculer le multiplicateur d'amitié
          const friendshipMultiplier = this.friendshipReward.calculateFriendshipExpBonus(pokemon.friendship);

          rewards.push({
            type: 'experience',
            pokemonId: pokemon.pokemonId,
            baseAmount: this.calculateBattleBaseExp(config.defeatedPokemon),
            multipliers: {
              trainer: config.battleType !== 'wild' ? 1.5 : 1.0,
              traded: pokemon.isTraded ? 1.5 : 1.0,
              luckyEgg: pokemon.hasLuckyEgg ? 1.5 : 1.0,
              friendship: friendshipMultiplier,
              switching: pokemon.switchedIn ? 1.2 : 1.0,
              expShare: config.expShareActive ? 0.5 : 1.0,
              weather: serverConfig.weatherSystem?.enabled ? serverConfig.xpRate : 1.0,
              event: serverConfig.eventXpBonusActive ? 2.0 : 1.0
            }
          });

          // === AMITIÉ POUR VICTOIRE ===
          rewards.push({
            type: 'friendship',
            pokemonId: pokemon.pokemonId,
            friendshipGain: config.battleType === 'wild' ? 3 : 5, // Plus d'amitié contre dresseurs
            reason: 'battle_victory'
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
          event: serverConfig.eventXpBonusActive ? 1.5 : 1.0,
          prestige: 1.0 // TODO: Récupérer le vrai bonus de prestige
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
      playerId,
      friendshipContext: {
        activeFriendshipBoosts: {},
        pokemonReadyToEvolve: [] // TODO: Récupérer depuis FriendshipReward
      }
    });
  }

  /**
   * 🎯 MÉTHODE RAPIDE - Récompenses de capture complètes
   */
  async giveCaptureRewards(
    playerId: string,
    capturedPokemon: { 
      pokemonId: number; 
      level: number; 
      shiny: boolean;
      ballUsed: string;
      attempts: number;
      wasCritical: boolean;
      wasWeakened: boolean;
    },
    ownedPokemonId?: string
  ): Promise<RewardResult> {
    console.log(`🎯 [RewardManager] Récompenses de capture pour ${playerId}`);

    // Utiliser directement CaptureReward
    const captureResult = await this.captureReward.handleCaptureSuccess(
      playerId,
      {
        pokemonId: capturedPokemon.pokemonId,
        level: capturedPokemon.level,
        isShiny: capturedPokemon.shiny,
        ballUsed: capturedPokemon.ballUsed,
        attempts: capturedPokemon.attempts,
        wasCritical: capturedPokemon.wasCritical,
        wasWeakened: capturedPokemon.wasWeakened
      },
      ownedPokemonId || ''
    );

    if (!captureResult.success) {
      return {
        success: false,
        error: 'Erreur lors des récompenses de capture',
        processedRewards: [],
        totalExperience: 0,
        totalMoney: 0,
        totalFriendship: 0,
        itemsGiven: [],
        notifications: []
      };
    }

    // Convertir le résultat au format RewardResult
    return {
      success: true,
      processedRewards: [{
        type: 'capture',
        success: true,
        finalAmount: captureResult.rewards.experience + captureResult.rewards.money,
        data: captureResult
      }],
      totalExperience: captureResult.rewards.experience,
      totalMoney: captureResult.rewards.money,
      totalFriendship: captureResult.rewards.friendship,
      itemsGiven: [], // TODO: Convertir depuis les notifications
      notifications: captureResult.notifications,
      specialEvents: captureResult.achievements.map(achievement => ({
        type: 'achievement' as const,
        message: `Achievement débloqué : ${achievement}`,
        data: { achievement },
        animation: 'star',
        rarity: 'rare' as const
      }))
    };
  }

  /**
   * 💖 MÉTHODE RAPIDE - Distribuer de l'amitié
   */
  async giveFriendshipReward(
    playerId: string,
    pokemonId: string,
    friendshipGain: number,
    reason: string
  ): Promise<RewardResult> {
    const friendshipReward: FriendshipRewardType = {
      type: 'friendship',
      pokemonId,
      friendshipGain,
      reason: reason as any
    };

    return this.giveRewards({
      rewards: [friendshipReward],
      source: {
        sourceType: 'friendship',
        sourceId: `friendship_${reason}_${Date.now()}`,
        metadata: { reason }
      },
      playerId
    });
  }

  /**
   * 🚶 MÉTHODE RAPIDE - Amitié pour marche (pas)
   */
  async giveWalkingFriendship(
    playerId: string,
    teamPokemonIds: string[],
    steps: number
  ): Promise<RewardResult> {
    console.log(`🚶 [RewardManager] Amitié de marche: ${steps} pas pour ${teamPokemonIds.length} Pokémon`);

    const rewards: FriendshipRewardType[] = [];

    // Distribuer amitié selon les pas (1 point tous les 100 pas)
    const friendshipGain = Math.floor(steps / 100);
    
    if (friendshipGain > 0) {
      for (const pokemonId of teamPokemonIds) {
        rewards.push({
          type: 'friendship',
          pokemonId,
          friendshipGain,
          reason: 'walk_steps'
        });
      }
    }

    if (rewards.length === 0) {
      return {
        success: true,
        processedRewards: [],
        totalExperience: 0,
        totalMoney: 0,
        totalFriendship: 0,
        itemsGiven: [],
        notifications: []
      };
    }

    return this.giveRewards({
      rewards,
      source: {
        sourceType: 'friendship',
        sourceId: `walking_${Date.now()}`,
        metadata: { steps, reason: 'walking' }
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

  // === MÉTHODES PRIVÉES ÉTENDUES ===

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

        case 'friendship':
          return await this.friendshipReward.giveFriendship(playerId, reward);

        case 'capture':
          return await this.captureReward.processCaptureRewards(playerId, reward);

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

      case 'friendship':
        result.totalFriendship += processed.finalAmount || 0;
        break;

      case 'item':
        if (processed.data) {
          result.itemsGiven.push({
            itemId: processed.data.itemId,
            quantity: processed.data.quantity,
            pocket: processed.data.pocket || 'items',
            rarity: processed.data.rarity
          });
        }
        break;

      case 'capture':
        // Les récompenses de capture sont déjà agrégées dans leur processeur
        if (processed.data) {
          result.totalExperience += processed.data.rewards?.experience || 0;
          result.totalMoney += processed.data.rewards?.money || 0;
          result.totalFriendship += processed.data.rewards?.friendship || 0;
        }
        break;
    }

    // Ajouter les notifications spécifiques
    if (processed.data?.notifications) {
      result.notifications.push(...processed.data.notifications);
    }
  }

  /**
   * 🔍 Traite les contextes étendus (amitié, capture, prestige)
   */
  private async processExtendedContexts(
    bundle: ExtendedRewardBundle, 
    result: RewardResult
  ): Promise<void> {
    try {
      // Contexte d'amitié
      if (bundle.friendshipContext?.pokemonReadyToEvolve?.length) {
        for (const pokemonId of bundle.friendshipContext.pokemonReadyToEvolve) {
          result.specialEvents?.push({
            type: 'evolution_ready',
            message: 'Un de vos Pokémon peut évoluer grâce à l\'amitié !',
            data: { pokemonId },
            animation: 'evolution_glow',
            rarity: 'rare'
          });
        }
      }

      // Contexte de capture
      if (bundle.captureContext?.currentCaptureStreak && bundle.captureContext.currentCaptureStreak >= 10) {
        result.specialEvents?.push({
          type: 'capture_streak',
          message: `Série de captures : ${bundle.captureContext.currentCaptureStreak} !`,
          data: { streak: bundle.captureContext.currentCaptureStreak },
          animation: 'star',
          rarity: 'uncommon'
        });
      }

      // Contexte de prestige
      if (bundle.prestigeContext?.pointsToNextRank && bundle.prestigeContext.pointsToNextRank <= 100) {
        result.notifications.push({
          type: 'achievement',
          message: `Proche du rang suivant ! Plus que ${bundle.prestigeContext.pointsToNextRank} points.`,
          priority: 'medium',
          data: { prestige: bundle.prestigeContext }
        });
      }

    } catch (error) {
      console.error('❌ [RewardManager] Erreur contextes étendus:', error);
    }
  }

  /**
   * 🎊 Vérifie les événements spéciaux déclenchés
   */
  private async checkSpecialEvents(
    bundle: ExtendedRewardBundle, 
    result: RewardResult
  ): Promise<void> {
    try {
      // Vérifier milestones d'expérience
      if (result.totalExperience >= 1000) {
        result.specialEvents?.push({
          type: 'pokedex_milestone',
          message: 'Énorme gain d\'expérience ! Vos Pokémon progressent rapidement !',
          data: { totalExp: result.totalExperience },
          animation: 'explosion',
          rarity: 'epic'
        });
      }

      // Vérifier milestone d'argent
      if (result.totalMoney >= 5000) {
        result.specialEvents?.push({
          type: 'pokedex_milestone',
          message: 'Jackpot ! Vous avez gagné beaucoup d\'argent !',
          data: { totalMoney: result.totalMoney },
          animation: 'sparkle',
          rarity: 'rare'
        });
      }

      // Vérifier amitié maximale
      if (result.totalFriendship >= 50) {
        result.specialEvents?.push({
          type: 'friendship_maxed',
          message: 'Vos liens avec vos Pokémon se renforcent énormément !',
          data: { totalFriendship: result.totalFriendship },
          animation: 'heart',
          rarity: 'epic'
        });
      }

    } catch (error) {
      console.error('❌ [RewardManager] Erreur événements spéciaux:', error);
    }
  }

  private generateSummaryNotifications(result: RewardResult, source: RewardSource): void {
    // Notification globale de gain
    if (result.totalExperience > 0 || result.totalMoney > 0 || result.totalFriendship > 0 || result.itemsGiven.length > 0) {
      let summary = "Récompenses obtenues: ";
      const parts: string[] = [];

      if (result.totalExperience > 0) {
        parts.push(`${result.totalExperience} XP`);
      }
      if (result.totalMoney > 0) {
        parts.push(`${result.totalMoney} PokéDollars`);
      }
      if (result.totalFriendship > 0) {
        parts.push(`${result.totalFriendship} Amitié`);
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
    totalFriendshipGained: number;
    itemsReceived: number;
    capturesSuccessful: number;
    rewardsToday: number;
    averageFriendship: number;
  }> {
    try {
      // Récupérer stats de capture
      const captureStats = await this.captureReward.getPlayerCaptureStats(playerId);
      
      // Récupérer stats d'amitié
      const friendshipStats = await this.friendshipReward.getPlayerFriendshipStats(playerId);

      return {
        totalExperienceGained: 0, // TODO: Tracker dans une table historique
        totalMoneyEarned: 0, // TODO: Tracker dans une table historique
        totalFriendshipGained: friendshipStats.averageFriendship * friendshipStats.totalPokemon,
        itemsReceived: 0, // TODO: Tracker dans une table historique
        capturesSuccessful: captureStats.totalCaptures,
        rewardsToday: 0, // TODO: Tracker dans une table historique
        averageFriendship: friendshipStats.averageFriendship
      };

    } catch (error) {
      console.error('❌ [RewardManager] Erreur stats joueur:', error);
      return {
        totalExperienceGained: 0,
        totalMoneyEarned: 0,
        totalFriendshipGained: 0,
        itemsReceived: 0,
        capturesSuccessful: 0,
        rewardsToday: 0,
        averageFriendship: 0
      };
    }
  }

  /**
   * ⚙️ Calculer les multiplicateurs actuels pour un joueur
   */
  getActiveMultipliers(playerId: string): Record<string, number> {
    const serverConfig = getServerConfig();
    
    return {
      xp: serverConfig.xpRate || 1.0,
      money: serverConfig.moneyRate || 1.0,
      friendship: 1.0, // TODO: Calculer selon objets/effets
      weather: serverConfig.weatherSystem?.enabled ? 1.0 : 1.0,
      event: serverConfig.eventXpBonusActive ? 1.5 : 1.0
    };
  }

  /**
   * 🔮 Prévisualiser les récompenses de capture
   */
  async previewCaptureRewards(
    playerId: string,
    pokemonId: number,
    level: number,
    ballType: string,
    isShiny: boolean = false
  ) {
    return await this.captureReward.previewCaptureRewards(
      playerId,
      pokemonId,
      level,
      ballType,
      isShiny
    );
  }

  /**
   * 💖 Obtenir info d'amitié d'un Pokémon
   */
  async getPokemonFriendshipInfo(pokemonId: string) {
    return await this.friendshipReward.getPokemonFriendshipInfo(pokemonId);
  }

  /**
   * 🔄 Obtenir Pokémon prêts à évoluer par amitié
   */
  async getEvolutionReadyPokemon(playerId: string) {
    return await this.friendshipReward.getEvolutionReadyPokemon(playerId);
  }
}
