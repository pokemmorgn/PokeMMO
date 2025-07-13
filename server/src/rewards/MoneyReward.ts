// server/src/rewards/MoneyReward.ts

import { PlayerData } from '../models/PlayerData';
import { getServerConfig } from '../config/serverConfig';
import { 
  MoneyReward as MoneyRewardType, 
  ProcessedReward, 
  RewardNotification,
  REWARD_CONSTANTS 
} from './types/RewardTypes';

export class MoneyReward {

  /**
   * 💰 Distribue de l'argent à un joueur
   */
  async giveMoney(playerId: string, reward: MoneyRewardType): Promise<ProcessedReward> {
    console.log(`💰 [MoneyReward] Distribution argent pour ${playerId}: ${reward.amount} PokéDollars`);

    try {
      // Calculer le montant final avec multiplicateurs
      const finalAmount = this.calculateFinalAmount(reward.amount, reward.multipliers || {});
      
      if (finalAmount <= 0) {
        return {
          type: 'money',
          success: false,
          error: 'Montant invalide après calculs'
        };
      }

      // Vérifier la limite max
      if (finalAmount > REWARD_CONSTANTS.MAX_MONEY_PER_BATTLE) {
        console.warn(`⚠️ [MoneyReward] Montant trop élevé: ${finalAmount}, limité à ${REWARD_CONSTANTS.MAX_MONEY_PER_BATTLE}`);
      }

      const cappedAmount = Math.min(finalAmount, REWARD_CONSTANTS.MAX_MONEY_PER_BATTLE);

      // Récupérer les données du joueur
      let playerData = await PlayerData.findOne({ username: playerId });
      
      if (!playerData) {
        console.warn(`⚠️ [MoneyReward] Joueur ${playerId} non trouvé, création automatique`);
        playerData = new PlayerData({
          username: playerId,
          gold: 0
        });
      }

      // Sauvegarder l'ancien montant pour les logs
      const oldAmount = playerData.gold || 0;
      
      // Ajouter l'argent (limité à une valeur maximale raisonnable)
      playerData.gold = Math.min((playerData.gold || 0) + cappedAmount, 9999999);
      
      await playerData.save();

      const notifications: RewardNotification[] = [
        {
          type: 'money',
          message: `Vous gagnez ${cappedAmount} PokéDollars !`,
          priority: 'medium',
          data: {
            amountGained: cappedAmount,
            oldAmount,
            newAmount: playerData.gold,
            multipliers: reward.multipliers
          }
        }
      ];

      // Notification spéciale pour gros gains
      if (cappedAmount >= 1000) {
        notifications.push({
          type: 'money',
          message: `Excellent ! Vous avez maintenant ${playerData.gold} PokéDollars !`,
          priority: 'high',
          data: {
            totalAmount: playerData.gold,
            bigGain: true
          }
        });
      }

      console.log(`✅ [MoneyReward] ${playerId}: ${oldAmount} -> ${playerData.gold} (+${cappedAmount})`);

      return {
        type: 'money',
        success: true,
        finalAmount: cappedAmount,
        multipliers: reward.multipliers,
        data: {
          oldAmount,
          newAmount: playerData.gold,
          amountGained: cappedAmount,
          notifications
        }
      };

    } catch (error) {
      console.error('❌ [MoneyReward] Erreur distribution argent:', error);
      return {
        type: 'money',
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 💸 Retire de l'argent à un joueur (pour achats, etc.)
   */
  async spendMoney(playerId: string, amount: number, reason?: string): Promise<{
    success: boolean;
    error?: string;
    oldAmount?: number;
    newAmount?: number;
  }> {
    console.log(`💸 [MoneyReward] Dépense argent ${playerId}: ${amount} (${reason || 'Non spécifié'})`);

    try {
      if (amount <= 0) {
        return {
          success: false,
          error: 'Montant invalide'
        };
      }

      const playerData = await PlayerData.findOne({ username: playerId });
      
      if (!playerData) {
        return {
          success: false,
          error: 'Joueur non trouvé'
        };
      }

      if ((playerData.gold || 0) < amount) {
        return {
          success: false,
          error: 'Fonds insuffisants',
          oldAmount: playerData.gold || 0,
          newAmount: playerData.gold || 0
        };
      }

      const oldAmount = playerData.gold || 0;
      playerData.gold = oldAmount - amount;
      
      await playerData.save();

      console.log(`✅ [MoneyReward] Dépense ${playerId}: ${oldAmount} -> ${playerData.gold} (-${amount})`);

      return {
        success: true,
        oldAmount,
        newAmount: playerData.gold
      };

    } catch (error) {
      console.error('❌ [MoneyReward] Erreur dépense argent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🧮 Calcule le montant final avec multiplicateurs
   */
  private calculateFinalAmount(baseAmount: number, multipliers: Record<string, number>): number {
    const serverConfig = getServerConfig();
    let finalAmount = baseAmount * serverConfig.moneyRate; // Base serveur

    // Appliquer tous les multiplicateurs
    Object.values(multipliers).forEach(mult => {
      if (mult && mult > 0) {
        finalAmount *= mult;
      }
    });

    return Math.floor(Math.max(0, finalAmount));
  }

  /**
   * 💰 Obtient le solde actuel d'un joueur
   */
  async getPlayerMoney(playerId: string): Promise<number> {
    try {
      const playerData = await PlayerData.findOne({ username: playerId });
      return playerData?.gold || 0;
    } catch (error) {
      console.error('❌ [MoneyReward] Erreur récupération solde:', error);
      return 0;
    }
  }

  /**
   * 💎 Vérifie si un joueur peut se permettre un achat
   */
  async canAfford(playerId: string, amount: number): Promise<boolean> {
    try {
      const currentMoney = await this.getPlayerMoney(playerId);
      return currentMoney >= amount;
    } catch (error) {
      console.error('❌ [MoneyReward] Erreur vérification fonds:', error);
      return false;
    }
  }

  /**
   * 🏆 Calcule les récompenses monétaires pour différents types de dresseurs
   */
  public calculateTrainerReward(
    trainerClass: string, 
    pokemonLevel: number,
    bonusMultiplier: number = 1.0
  ): number {
    const basePayout = this.getTrainerBasePayout(trainerClass);
    const levelMultiplier = Math.max(1, pokemonLevel);
    
    return Math.floor(basePayout * levelMultiplier * bonusMultiplier);
  }

  /**
   * 💰 Obtient le paiement de base selon la classe de dresseur
   */
  private getTrainerBasePayout(trainerClass: string): number {
    const payouts: Record<string, number> = {
      'youngster': 16,
      'lass': 16,
      'bug_catcher': 12,
      'picnicker': 16,
      'camper': 20,
      'fisherman': 20,
      'sailor': 24,
      'gentleman': 48,
      'beauty': 56,
      'psychic_m': 24,
      'psychic_f': 24,
      'rocker': 20,
      'juggler': 28,
      'tamer': 24,
      'birdkeeper': 20,
      'blackbelt': 20,
      'rival': 35,
      'gym_leader': 100,
      'elite_four': 200,
      'champion': 500
    };

    return payouts[trainerClass.toLowerCase()] || 16; // Défaut: Youngster
  }

  /**
   * 📊 Obtient les statistiques monétaires d'un joueur
   */
  async getMoneyStats(playerId: string): Promise<{
    currentMoney: number;
    canAffordExpensive: boolean; // >10000
    canAffordLuxury: boolean;    // >50000
    wealthLevel: 'poor' | 'modest' | 'comfortable' | 'rich' | 'wealthy';
  }> {
    try {
      const currentMoney = await this.getPlayerMoney(playerId);

      let wealthLevel: 'poor' | 'modest' | 'comfortable' | 'rich' | 'wealthy';
      if (currentMoney < 1000) {
        wealthLevel = 'poor';
      } else if (currentMoney < 10000) {
        wealthLevel = 'modest';
      } else if (currentMoney < 50000) {
        wealthLevel = 'comfortable';
      } else if (currentMoney < 200000) {
        wealthLevel = 'rich';
      } else {
        wealthLevel = 'wealthy';
      }

      return {
        currentMoney,
        canAffordExpensive: currentMoney >= 10000,
        canAffordLuxury: currentMoney >= 50000,
        wealthLevel
      };

    } catch (error) {
      console.error('❌ [MoneyReward] Erreur stats monétaires:', error);
      return {
        currentMoney: 0,
        canAffordExpensive: false,
        canAffordLuxury: false,
        wealthLevel: 'poor'
      };
    }
  }

  /**
   * 🎰 Simulation de gain d'argent (sans l'appliquer)
   */
  public simulateMoneyGain(
    baseAmount: number,
    multipliers: Record<string, number>
  ): {
    finalAmount: number;
    multiplierBreakdown: Record<string, number>;
    effectiveMultiplier: number;
  } {
    const serverConfig = getServerConfig();
    let finalAmount = baseAmount * serverConfig.moneyRate;
    const multiplierBreakdown: Record<string, number> = {
      server: serverConfig.moneyRate
    };

    let effectiveMultiplier = serverConfig.moneyRate;

    Object.entries(multipliers).forEach(([key, mult]) => {
      if (mult && mult > 0) {
        finalAmount *= mult;
        effectiveMultiplier *= mult;
        multiplierBreakdown[key] = mult;
      }
    });

    return {
      finalAmount: Math.floor(Math.max(0, finalAmount)),
      multiplierBreakdown,
      effectiveMultiplier
    };
  }

  /**
   * 💳 Transfère de l'argent entre joueurs (pour échanges, etc.)
   */
  async transferMoney(
    fromPlayerId: string,
    toPlayerId: string,
    amount: number,
    reason?: string
  ): Promise<{
    success: boolean;
    error?: string;
    fromOldAmount?: number;
    fromNewAmount?: number;
    toOldAmount?: number;
    toNewAmount?: number;
  }> {
    console.log(`💳 [MoneyReward] Transfert ${fromPlayerId} -> ${toPlayerId}: ${amount} (${reason || 'Non spécifié'})`);

    try {
      if (amount <= 0) {
        return { success: false, error: 'Montant invalide' };
      }

      // Utiliser une transaction MongoDB si possible
      const fromPlayer = await PlayerData.findOne({ username: fromPlayerId });
      const toPlayer = await PlayerData.findOne({ username: toPlayerId });

      if (!fromPlayer) {
        return { success: false, error: 'Expéditeur non trouvé' };
      }

      if (!toPlayer) {
        return { success: false, error: 'Destinataire non trouvé' };
      }

      if ((fromPlayer.gold || 0) < amount) {
        return { 
          success: false, 
          error: 'Fonds insuffisants',
          fromOldAmount: fromPlayer.gold || 0,
          fromNewAmount: fromPlayer.gold || 0
        };
      }

      const fromOldAmount = fromPlayer.gold || 0;
      const toOldAmount = toPlayer.gold || 0;

      fromPlayer.gold = fromOldAmount - amount;
      toPlayer.gold = Math.min(toOldAmount + amount, 9999999); // Limite max

      await fromPlayer.save();
      await toPlayer.save();

      console.log(`✅ [MoneyReward] Transfert réussi: ${fromPlayerId}(${fromOldAmount}->${fromPlayer.gold}) -> ${toPlayerId}(${toOldAmount}->${toPlayer.gold})`);

      return {
        success: true,
        fromOldAmount,
        fromNewAmount: fromPlayer.gold,
        toOldAmount,
        toNewAmount: toPlayer.gold
      };

    } catch (error) {
      console.error('❌ [MoneyReward] Erreur transfert argent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}
