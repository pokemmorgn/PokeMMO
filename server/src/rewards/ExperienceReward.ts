// server/src/rewards/ExperienceReward.ts

import { OwnedPokemon } from '../models/OwnedPokemon';
import { PlayerData } from '../models/PlayerData';
import { getServerConfig } from '../config/serverConfig';
import { 
  ExperienceReward as ExperienceRewardType, 
  ProcessedReward, 
  RewardNotification,
  ExperienceCalculation,
  REWARD_CONSTANTS 
} from './types/RewardTypes';

export class ExperienceReward {

  /**
   * 🌟 Distribue de l'expérience à un ou plusieurs Pokémon
   */
  async giveExperience(playerId: string, reward: ExperienceRewardType): Promise<ProcessedReward> {
    console.log(`⭐ [ExperienceReward] Distribution XP pour ${playerId}`);

    try {
      const calculations: ExperienceCalculation[] = [];
      const notifications: RewardNotification[] = [];
      let totalExpGiven = 0;

      if (reward.pokemonId) {
        // XP à un Pokémon spécifique
        const calculation = await this.giveExperienceToPokemon(
          playerId, 
          reward.pokemonId, 
          reward.baseAmount, 
          reward.multipliers || {}
        );
        
        if (calculation) {
          calculations.push(calculation);
          totalExpGiven += calculation.finalExp;
        }
      } else {
        // XP à toute l'équipe
        const teamCalculations = await this.giveExperienceToTeam(
          playerId, 
          reward.baseAmount, 
          reward.multipliers || {}
        );
        
        calculations.push(...teamCalculations);
        totalExpGiven = teamCalculations.reduce((sum, calc) => sum + calc.finalExp, 0);
      }

      // Générer les notifications
      for (const calc of calculations) {
        notifications.push({
          type: 'experience',
          message: `${await this.getPokemonNickname(calc.pokemonId)} gagne ${calc.finalExp} XP !`,
          priority: 'medium',
          data: {
            pokemonId: calc.pokemonId,
            expGained: calc.finalExp,
            leveledUp: calc.leveledUp,
            newLevel: calc.newLevel
          }
        });

        if (calc.leveledUp && calc.newLevel) {
          notifications.push({
            type: 'level_up',
            message: `${await this.getPokemonNickname(calc.pokemonId)} monte au niveau ${calc.newLevel} !`,
            priority: 'high',
            data: {
              pokemonId: calc.pokemonId,
              newLevel: calc.newLevel,
              oldLevel: calc.newLevel - 1
            }
          });
        }
      }

      return {
        type: 'experience',
        success: true,
        finalAmount: totalExpGiven,
        data: {
          calculations,
          notifications,
          pokemonsAffected: calculations.length
        }
      };

    } catch (error) {
      console.error('❌ [ExperienceReward] Erreur distribution XP:', error);
      return {
        type: 'experience',
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * ⭐ Donne de l'XP à un Pokémon spécifique
   */
  private async giveExperienceToPokemon(
    playerId: string,
    pokemonId: string,
    baseAmount: number,
    multipliers: Record<string, number>
  ): Promise<ExperienceCalculation | null> {
    try {
      const pokemon = await OwnedPokemon.findById(pokemonId);
      
      if (!pokemon || pokemon.owner !== playerId) {
        console.warn(`⚠️ [ExperienceReward] Pokémon ${pokemonId} non trouvé pour ${playerId}`);
        return null;
      }

      if (pokemon.level >= REWARD_CONSTANTS.MAX_LEVEL) {
        console.log(`📊 [ExperienceReward] ${pokemon.nickname || 'Pokémon'} déjà au niveau max`);
        return {
          pokemonId,
          baseExp: baseAmount,
          level: pokemon.level,
          multipliers: {},
          finalExp: 0,
          leveledUp: false
        };
      }

      // Calculer l'XP finale avec multiplicateurs
      const finalMultiplier = this.calculateFinalMultiplier(multipliers);
      const finalExp = Math.floor(baseAmount * finalMultiplier);
      const oldLevel = pokemon.level;

      // Appliquer l'XP
      pokemon.experience += finalExp;
      
      // Vérifier montée de niveau
      const newLevel = this.calculateLevelFromExperience(pokemon.experience);
      const leveledUp = newLevel > oldLevel;
      
      if (leveledUp && newLevel <= REWARD_CONSTANTS.MAX_LEVEL) {
        pokemon.level = newLevel;
        console.log(`🎊 [ExperienceReward] ${pokemon.nickname || 'Pokémon'} monte au niveau ${newLevel}!`);
      }

      await pokemon.save();

      return {
        pokemonId,
        baseExp: baseAmount,
        level: oldLevel,
        multipliers,
        finalExp,
        newLevel: leveledUp ? newLevel : undefined,
        leveledUp
      };

    } catch (error) {
      console.error(`❌ [ExperienceReward] Erreur XP Pokémon ${pokemonId}:`, error);
      return null;
    }
  }

  /**
   * 👥 Donne de l'XP à toute l'équipe du joueur
   */
  private async giveExperienceToTeam(
    playerId: string,
    baseAmount: number,
    multipliers: Record<string, number>
  ): Promise<ExperienceCalculation[]> {
    try {
      // Récupérer l'équipe du joueur
      const playerData = await PlayerData.findOne({ username: playerId }).populate('team');
      
      if (!playerData || !playerData.team.length) {
        console.warn(`⚠️ [ExperienceReward] Aucune équipe trouvée pour ${playerId}`);
        return [];
      }

      const calculations: ExperienceCalculation[] = [];

      // Distribuer XP à chaque Pokémon de l'équipe
      for (const pokemon of playerData.team as any[]) {
        if (pokemon.currentHp > 0) { // Seulement aux Pokémon conscients
          const calc = await this.giveExperienceToPokemon(
            playerId,
            pokemon._id.toString(),
            baseAmount,
            multipliers
          );
          
          if (calc) {
            calculations.push(calc);
          }
        }
      }

      return calculations;

    } catch (error) {
      console.error(`❌ [ExperienceReward] Erreur XP équipe ${playerId}:`, error);
      return [];
    }
  }

  /**
   * 🧮 Calcule le multiplicateur final à partir de tous les multiplicateurs
   */
  private calculateFinalMultiplier(multipliers: Record<string, number>): number {
    const serverConfig = getServerConfig();
    let finalMultiplier = serverConfig.xpRate; // Base serveur

    // Appliquer tous les multiplicateurs
    Object.values(multipliers).forEach(mult => {
      if (mult && mult > 0) {
        finalMultiplier *= mult;
      }
    });

    return Math.max(0.1, Math.min(finalMultiplier, 10.0)); // Limite entre 0.1x et 10x
  }

  /**
   * 📊 Calcule le niveau basé sur l'expérience (courbe Medium Fast)
   */
  private calculateLevelFromExperience(experience: number): number {
    // Formule Pokémon Medium Fast: exp = level^3
    if (experience <= 0) return 1;
    
    const level = Math.floor(Math.cbrt(experience));
    return Math.min(Math.max(level, 1), REWARD_CONSTANTS.MAX_LEVEL);
  }

  /**
   * 📊 Calcule l'expérience requise pour un niveau donné
   */
  public calculateExperienceForLevel(level: number): number {
    if (level <= 1) return 0;
    if (level > REWARD_CONSTANTS.MAX_LEVEL) return Math.pow(REWARD_CONSTANTS.MAX_LEVEL, 3);
    
    // Formule Medium Fast: exp = level^3
    return Math.pow(level, 3);
  }

  /**
   * 📊 Calcule l'expérience nécessaire pour le prochain niveau
   */
  public calculateExperienceToNextLevel(currentLevel: number, currentExp: number): number {
    if (currentLevel >= REWARD_CONSTANTS.MAX_LEVEL) return 0;
    
    const expForNextLevel = this.calculateExperienceForLevel(currentLevel + 1);
    return Math.max(0, expForNextLevel - currentExp);
  }

  /**
   * 🏷️ Récupère le surnom d'un Pokémon ou son nom par défaut
   */
  private async getPokemonNickname(pokemonId: string): Promise<string> {
    try {
      const pokemon = await OwnedPokemon.findById(pokemonId);
      return pokemon?.nickname || 'Pokémon';
    } catch {
      return 'Pokémon';
    }
  }

  /**
   * 📈 Méthodes utilitaires publiques
   */
  
  public async getPokemonExpInfo(pokemonId: string): Promise<{
    currentLevel: number;
    currentExp: number;
    expForNextLevel: number;
    expToNextLevel: number;
    progressPercent: number;
  } | null> {
    try {
      const pokemon = await OwnedPokemon.findById(pokemonId);
      if (!pokemon) return null;

      const expForNextLevel = this.calculateExperienceForLevel(pokemon.level + 1);
      const expForCurrentLevel = this.calculateExperienceForLevel(pokemon.level);
      const expToNextLevel = expForNextLevel - pokemon.experience;
      const progressPercent = pokemon.level >= REWARD_CONSTANTS.MAX_LEVEL ? 
        100 : 
        ((pokemon.experience - expForCurrentLevel) / (expForNextLevel - expForCurrentLevel)) * 100;

      return {
        currentLevel: pokemon.level,
        currentExp: pokemon.experience,
        expForNextLevel,
        expToNextLevel: Math.max(0, expToNextLevel),
        progressPercent: Math.min(100, Math.max(0, progressPercent))
      };

    } catch (error) {
      console.error('❌ [ExperienceReward] Erreur info XP:', error);
      return null;
    }
  }

  /**
   * 🎯 Simulation de gain d'XP (sans l'appliquer)
   */
  public async simulateExperienceGain(
    pokemonId: string,
    baseAmount: number,
    multipliers: Record<string, number>
  ): Promise<{
    currentLevel: number;
    projectedExp: number;
    projectedLevel: number;
    willLevelUp: boolean;
    finalExpGain: number;
  } | null> {
    try {
      const pokemon = await OwnedPokemon.findById(pokemonId);
      if (!pokemon) return null;

      const finalMultiplier = this.calculateFinalMultiplier(multipliers);
      const finalExpGain = Math.floor(baseAmount * finalMultiplier);
      const projectedExp = pokemon.experience + finalExpGain;
      const projectedLevel = this.calculateLevelFromExperience(projectedExp);

      return {
        currentLevel: pokemon.level,
        projectedExp,
        projectedLevel: Math.min(projectedLevel, REWARD_CONSTANTS.MAX_LEVEL),
        willLevelUp: projectedLevel > pokemon.level,
        finalExpGain
      };

    } catch (error) {
      console.error('❌ [ExperienceReward] Erreur simulation XP:', error);
      return null;
    }
  }
}
