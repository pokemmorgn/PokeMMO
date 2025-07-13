// server/src/rewards/FriendshipReward.ts

import { OwnedPokemon } from '../models/OwnedPokemon';
import { getPokemonById } from '../data/PokemonData';
import { 
  FriendshipReward as FriendshipRewardType, 
  ProcessedReward, 
  RewardNotification,
  FriendshipCalculation,
  SpecialEvent,
  FRIENDSHIP_LEVELS,
  REWARD_CONSTANTS 
} from './types/RewardTypes';

export class FriendshipReward {

  /**
   * 💖 Distribue de l'amitié à un Pokémon
   */
  async giveFriendship(playerId: string, reward: FriendshipRewardType): Promise<ProcessedReward> {
    console.log(`💖 [FriendshipReward] Distribution amitié pour ${playerId}: ${reward.friendshipGain} vers ${reward.pokemonId}`);

    try {
      const calculation = await this.calculateFriendshipGain(
        playerId,
        reward.pokemonId,
        reward.friendshipGain,
        reward.reason
      );

      if (!calculation) {
        return {
          type: 'friendship',
          success: false,
          error: 'Pokémon non trouvé ou erreur de calcul'
        };
      }

      // Appliquer le gain d'amitié
      await this.applyFriendshipGain(calculation);

      // Générer les notifications
      const notifications = this.generateFriendshipNotifications(calculation);

      // Vérifier les événements spéciaux
      const specialEvents = await this.checkSpecialEvents(calculation);

      console.log(`✅ [FriendshipReward] ${playerId}: ${calculation.pokemonId} amitié ${calculation.oldFriendship} -> ${calculation.newFriendship}`);

      return {
        type: 'friendship',
        success: true,
        finalAmount: calculation.gainAmount,
        friendshipData: {
          pokemonId: calculation.pokemonId,
          oldFriendship: calculation.oldFriendship,
          newFriendship: calculation.newFriendship,
          relationshipLevel: calculation.levelName
        },
        data: {
          calculation,
          notifications,
          specialEvents,
          benefitsUnlocked: calculation.benefitsUnlocked,
          evolutionReady: calculation.evolutionReady
        }
      };

    } catch (error) {
      console.error('❌ [FriendshipReward] Erreur distribution amitié:', error);
      return {
        type: 'friendship',
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🧮 Calcule le gain d'amitié avec tous les modificateurs
   */
  private async calculateFriendshipGain(
    playerId: string,
    pokemonId: string,
    baseGain: number,
    reason: string
  ): Promise<FriendshipCalculation | null> {
    try {
      const pokemon = await OwnedPokemon.findById(pokemonId);
      
      if (!pokemon || pokemon.owner !== playerId) {
        console.warn(`⚠️ [FriendshipReward] Pokémon ${pokemonId} non trouvé pour ${playerId}`);
        return null;
      }

      const oldFriendship = pokemon.friendship || 70; // Valeur par défaut
      let finalGain = baseGain;

      // === MODIFICATEURS DE GAIN ===
      
      // 1. Pokéball de luxure : +50% d'amitié
      if (pokemon.pokeball === 'luxury_ball') {
        finalGain = Math.floor(finalGain * 1.5);
      }

      // 2. Objet tenu : Grelot Zen
      if (pokemon.heldItem === 'soothe_bell') {
        finalGain = Math.floor(finalGain * 1.5);
      }

      // 3. Bonus selon la raison
      const reasonMultiplier = this.getReasonMultiplier(reason, pokemon.level);
      finalGain = Math.floor(finalGain * reasonMultiplier);

      // 4. Limitation si amitié élevée (plus difficile à augmenter)
      if (oldFriendship >= 200) {
        finalGain = Math.floor(finalGain * 0.5);
      } else if (oldFriendship >= 150) {
        finalGain = Math.floor(finalGain * 0.75);
      }

      // Calculer la nouvelle amitié (limitée à 255)
      const newFriendship = Math.min(oldFriendship + finalGain, REWARD_CONSTANTS.MAX_FRIENDSHIP);
      const actualGain = newFriendship - oldFriendship;

      // Déterminer le niveau d'amitié
      const oldLevel = this.getFriendshipLevel(oldFriendship);
      const newLevel = this.getFriendshipLevel(newFriendship);

      // Vérifier les nouveaux bénéfices débloqués
      const benefitsUnlocked = this.getNewBenefits(oldFriendship, newFriendship);

      // Vérifier si évolution par amitié possible
      const evolutionReady = await this.checkEvolutionReadiness(pokemon, newFriendship);

      return {
        pokemonId,
        oldFriendship,
        newFriendship,
        gainAmount: actualGain,
        reason,
        levelName: newLevel.name,
        multiplierGained: newLevel.multiplier,
        benefitsUnlocked,
        evolutionReady
      };

    } catch (error) {
      console.error(`❌ [FriendshipReward] Erreur calcul amitié ${pokemonId}:`, error);
      return null;
    }
  }

  /**
   * 💾 Applique le gain d'amitié au Pokémon
   */
  private async applyFriendshipGain(calculation: FriendshipCalculation): Promise<void> {
    try {
      const pokemon = await OwnedPokemon.findById(calculation.pokemonId);
      if (!pokemon) return;

      pokemon.friendship = calculation.newFriendship;
      await pokemon.save();

      console.log(`💖 [FriendshipReward] Amitié mise à jour: ${calculation.pokemonId} = ${calculation.newFriendship}`);

    } catch (error) {
      console.error('❌ [FriendshipReward] Erreur sauvegarde amitié:', error);
      throw error;
    }
  }

  /**
   * 🔔 Génère les notifications d'amitié
   */
  private generateFriendshipNotifications(calculation: FriendshipCalculation): RewardNotification[] {
    const notifications: RewardNotification[] = [];

    // Notification de base
    if (calculation.gainAmount > 0) {
      notifications.push({
        type: 'friendship',
        message: `L'amitié avec votre Pokémon augmente ! (+${calculation.gainAmount})`,
        priority: 'low',
        animation: 'heart',
        data: {
          pokemonId: calculation.pokemonId,
          friendshipGain: calculation.gainAmount,
          newLevel: calculation.levelName
        }
      });
    }

    // Notification de changement de niveau d'amitié
    if (calculation.benefitsUnlocked.length > 0) {
      notifications.push({
        type: 'friendship',
        message: `Votre Pokémon vous fait davantage confiance ! (${calculation.levelName})`,
        priority: 'medium',
        animation: 'sparkle',
        data: {
          pokemonId: calculation.pokemonId,
          newLevel: calculation.levelName,
          benefitsUnlocked: calculation.benefitsUnlocked
        }
      });
    }

    // Notification d'amitié maximale
    if (calculation.newFriendship === REWARD_CONSTANTS.MAX_FRIENDSHIP) {
      notifications.push({
        type: 'friendship',
        message: `Votre Pokémon vous est totalement dévoué ! L'amitié est au maximum !`,
        priority: 'high',
        animation: 'star',
        data: {
          pokemonId: calculation.pokemonId,
          maxFriendship: true
        }
      });
    }

    // Notification d'évolution possible
    if (calculation.evolutionReady) {
      notifications.push({
        type: 'evolution',
        message: `Votre Pokémon semble prêt à évoluer grâce à votre amitié !`,
        priority: 'high',
        animation: 'explosion',
        data: {
          pokemonId: calculation.pokemonId,
          evolutionTrigger: 'friendship'
        }
      });
    }

    return notifications;
  }

  /**
   * 🎊 Vérifie les événements spéciaux d'amitié
   */
  private async checkSpecialEvents(calculation: FriendshipCalculation): Promise<SpecialEvent[]> {
    const events: SpecialEvent[] = [];

    // Événement : Amitié maximale atteinte
    if (calculation.newFriendship === REWARD_CONSTANTS.MAX_FRIENDSHIP && 
        calculation.oldFriendship < REWARD_CONSTANTS.MAX_FRIENDSHIP) {
      events.push({
        type: 'friendship_maxed',
        pokemonId: calculation.pokemonId,
        announcement: `Un lien indéfectible s'est formé avec votre Pokémon !`,
        animation: 'heart_explosion',
        rarity: 'epic'
      });
    }

    // Événement : Évolution par amitié prête
    if (calculation.evolutionReady) {
      events.push({
        type: 'evolution_ready',
        pokemonId: calculation.pokemonId,
        announcement: `L'amitié a rendu l'évolution possible !`,
        animation: 'evolution_glow',
        rarity: 'rare'
      });
    }

    return events;
  }

  /**
   * 📊 Obtient le niveau d'amitié actuel
   */
  private getFriendshipLevel(friendship: number): { name: string; multiplier: number; benefits: string[] } {
    const levels = Object.entries(FRIENDSHIP_LEVELS)
      .map(([threshold, data]) => ({ threshold: parseInt(threshold), ...data }))
      .sort((a, b) => b.threshold - a.threshold);

    for (const level of levels) {
      if (friendship >= level.threshold) {
        return level;
      }
    }

    return FRIENDSHIP_LEVELS[0]; // Hostile par défaut
  }

  /**
   * 🆕 Détermine les nouveaux bénéfices débloqués
   */
  private getNewBenefits(oldFriendship: number, newFriendship: number): string[] {
    const oldLevel = this.getFriendshipLevel(oldFriendship);
    const newLevel = this.getFriendshipLevel(newFriendship);

    if (oldLevel.name === newLevel.name) {
      return []; // Pas de changement de niveau
    }

    // Retourner les nouveaux bénéfices
    return newLevel.benefits.filter(benefit => !oldLevel.benefits.includes(benefit));
  }

  /**
   * 🔄 Vérifie si le Pokémon peut évoluer par amitié
   */
  private async checkEvolutionReadiness(pokemon: any, newFriendship: number): Promise<boolean> {
    try {
      if (newFriendship < 220) return false; // Seuil minimum pour évolution par amitié

      const pokemonData = await getPokemonById(pokemon.pokemonId);
      if (!pokemonData?.evolutions) return false;

      // Vérifier si une évolution par amitié existe
      const friendshipEvolutions = pokemonData.evolutions.filter((evo: any) => 
        evo.method === 'friendship' || evo.trigger === 'friendship'
      );

      return friendshipEvolutions.length > 0;

    } catch (error) {
      console.error('❌ [FriendshipReward] Erreur vérification évolution:', error);
      return false;
    }
  }

  /**
   * 🎯 Obtient le multiplicateur selon la raison du gain
   */
  private getReasonMultiplier(reason: string, pokemonLevel: number): number {
    const baseMultipliers: Record<string, number> = {
      'battle_victory': 1.0,
      'walk_steps': 0.5,
      'level_up': 1.5,
      'item_use': 1.2,
      'grooming': 1.8,
      'massage': 2.0,
      'rare_candy': 1.0,
      'vitamin': 1.3,
      'evolution_stone': 1.0
    };

    let multiplier = baseMultipliers[reason] || 1.0;

    // Bonus pour les Pokémon de haut niveau (plus difficiles à satisfaire)
    if (pokemonLevel >= 50) {
      multiplier *= 1.2;
    } else if (pokemonLevel >= 80) {
      multiplier *= 1.5;
    }

    return multiplier;
  }

  // === MÉTHODES UTILITAIRES PUBLIQUES ===

  /**
   * 📈 Obtient les informations d'amitié d'un Pokémon
   */
  async getPokemonFriendshipInfo(pokemonId: string): Promise<{
    currentFriendship: number;
    levelName: string;
    multiplier: number;
    benefits: string[];
    nextLevelAt: number;
    evolutionReady: boolean;
    maxFriendship: boolean;
  } | null> {
    try {
      const pokemon = await OwnedPokemon.findById(pokemonId);
      if (!pokemon) return null;

      const friendship = pokemon.friendship || 70;
      const level = this.getFriendshipLevel(friendship);
      const evolutionReady = await this.checkEvolutionReadiness(pokemon, friendship);

      // Calculer le prochain seuil
      const levels = Object.keys(FRIENDSHIP_LEVELS).map(Number).sort((a, b) => a - b);
      const nextLevelAt = levels.find(threshold => threshold > friendship) || 255;

      return {
        currentFriendship: friendship,
        levelName: level.name,
        multiplier: level.multiplier,
        benefits: level.benefits,
        nextLevelAt,
        evolutionReady,
        maxFriendship: friendship === REWARD_CONSTANTS.MAX_FRIENDSHIP
      };

    } catch (error) {
      console.error('❌ [FriendshipReward] Erreur info amitié:', error);
      return null;
    }
  }

  /**
   * 🎁 Distribution d'amitié en lot pour une équipe
   */
  async giveFriendshipToTeam(
    playerId: string,
    baseGain: number,
    reason: string,
    teamPokemonIds: string[]
  ): Promise<{
    success: boolean;
    results: Array<{
      pokemonId: string;
      success: boolean;
      friendshipGained: number;
      error?: string;
    }>;
    totalFriendshipGained: number;
  }> {
    console.log(`👥 [FriendshipReward] Distribution amitié équipe ${playerId}: ${teamPokemonIds.length} Pokémon`);

    const results: Array<{
      pokemonId: string;
      success: boolean;
      friendshipGained: number;
      error?: string;
    }> = [];

    let totalFriendshipGained = 0;

    try {
      for (const pokemonId of teamPokemonIds) {
        const result = await this.giveFriendship(playerId, {
          type: 'friendship',
          pokemonId,
          friendshipGain: baseGain,
          reason: reason as any
        });

        results.push({
          pokemonId,
          success: result.success,
          friendshipGained: result.finalAmount || 0,
          error: result.error
        });

        if (result.success) {
          totalFriendshipGained += result.finalAmount || 0;
        }
      }

      return {
        success: true,
        results,
        totalFriendshipGained
      };

    } catch (error) {
      console.error('❌ [FriendshipReward] Erreur distribution équipe:', error);
      return {
        success: false,
        results,
        totalFriendshipGained: 0
      };
    }
  }

  /**
   * 🔍 Obtient tous les Pokémon prêts à évoluer par amitié
   */
  async getEvolutionReadyPokemon(playerId: string): Promise<Array<{
    pokemonId: string;
    nickname?: string;
    friendship: number;
    evolutionPossible: string; // Nom de l'évolution
  }>> {
    try {
      const playerPokemon = await OwnedPokemon.find({ owner: playerId });
      const readyPokemon: Array<{
        pokemonId: string;
        nickname?: string;
        friendship: number;
        evolutionPossible: string;
      }> = [];

      for (const pokemon of playerPokemon) {
        const friendship = pokemon.friendship || 70;
        if (friendship >= 220) { // Seuil d'évolution par amitié
          const canEvolve = await this.checkEvolutionReadiness(pokemon, friendship);
          if (canEvolve) {
            // TODO: Récupérer le nom de l'évolution depuis PokemonData
            readyPokemon.push({
              pokemonId: pokemon._id.toString(),
              nickname: pokemon.nickname,
              friendship,
              evolutionPossible: 'Evolution disponible' // À améliorer avec les vraies données
            });
          }
        }
      }

      return readyPokemon;

    } catch (error) {
      console.error('❌ [FriendshipReward] Erreur recherche évolutions:', error);
      return [];
    }
  }

  /**
   * 📊 Statistiques d'amitié pour un joueur
   */
  async getPlayerFriendshipStats(playerId: string): Promise<{
    totalPokemon: number;
    averageFriendship: number;
    pokemonByLevel: Record<string, number>;
    maxFriendshipPokemon: number;
    evolutionReadyCount: number;
  }> {
    try {
      const playerPokemon = await OwnedPokemon.find({ owner: playerId });
      
      if (playerPokemon.length === 0) {
        return {
          totalPokemon: 0,
          averageFriendship: 0,
          pokemonByLevel: {},
          maxFriendshipPokemon: 0,
          evolutionReadyCount: 0
        };
      }

      let totalFriendship = 0;
      let maxFriendshipCount = 0;
      let evolutionReadyCount = 0;
      const levelCounts: Record<string, number> = {};

      for (const pokemon of playerPokemon) {
        const friendship = pokemon.friendship || 70;
        totalFriendship += friendship;

        const level = this.getFriendshipLevel(friendship);
        levelCounts[level.name] = (levelCounts[level.name] || 0) + 1;

        if (friendship === REWARD_CONSTANTS.MAX_FRIENDSHIP) {
          maxFriendshipCount++;
        }

        if (friendship >= 220 && await this.checkEvolutionReadiness(pokemon, friendship)) {
          evolutionReadyCount++;
        }
      }

      return {
        totalPokemon: playerPokemon.length,
        averageFriendship: Math.round(totalFriendship / playerPokemon.length),
        pokemonByLevel: levelCounts,
        maxFriendshipPokemon: maxFriendshipCount,
        evolutionReadyCount
      };

    } catch (error) {
      console.error('❌ [FriendshipReward] Erreur stats amitié:', error);
      return {
        totalPokemon: 0,
        averageFriendship: 0,
        pokemonByLevel: {},
        maxFriendshipPokemon: 0,
        evolutionReadyCount: 0
      };
    }
  }

  /**
   * 🎯 Calcule le bonus d'XP basé sur l'amitié
   */
  public calculateFriendshipExpBonus(friendship: number): number {
    const level = this.getFriendshipLevel(friendship);
    return level.multiplier;
  }

  /**
   * 🛡️ Calcule la résistance aux status basée sur l'amitié
   */
  public calculateStatusResistance(friendship: number): number {
    if (friendship >= 200) return 0.25; // 25% de résistance
    if (friendship >= 150) return 0.15; // 15% de résistance
    if (friendship >= 100) return 0.05; // 5% de résistance
    return 0;
  }

  /**
   * ⚡ Calcule la chance d'esquive basée sur l'amitié
   */
  public calculateDodgeChance(friendship: number): number {
    if (friendship >= 255) return 0.1;  // 10% d'esquive max
    if (friendship >= 200) return 0.05; // 5% d'esquive
    if (friendship >= 150) return 0.02; // 2% d'esquive
    return 0;
  }
}
