// server/src/rewards/RewardHistory.ts

import { PlayerData } from '../models/PlayerData';
import { 
  RewardResult, 
  RewardSource, 
  Reward,
  RewardNotification,
  SpecialEvent 
} from './types/RewardTypes';

// === INTERFACES D'HISTORIQUE ===

export interface RewardHistoryEntry {
  id: string;
  playerId: string;
  timestamp: Date;
  source: RewardSource;
  rewards: Reward[];
  results: {
    totalExperience: number;
    totalMoney: number;
    totalFriendship: number;
    itemsGiven: number;
    prestigeGained?: number;
  };
  success: boolean;
  error?: string;
  notifications: RewardNotification[];
  specialEvents: SpecialEvent[];
  sessionId?: string; // Pour grouper les actions d'une même session
}

export interface DailyRewardStats {
  date: string;
  totalExperience: number;
  totalMoney: number;
  totalFriendship: number;
  itemsReceived: number;
  capturesRewarded: number;
  battlesRewarded: number;
  questsCompleted: number;
  achievementsUnlocked: number;
  specialEventsTriggered: number;
}

export interface PlayerRewardSummary {
  playerId: string;
  periodStart: Date;
  periodEnd: Date;
  totals: {
    experience: number;
    money: number;
    friendship: number;
    items: number;
    captures: number;
    battles: number;
    quests: number;
    achievements: number;
    specialEvents: number;
  };
  dailyBreakdown: DailyRewardStats[];
  topSources: Array<{
    sourceType: string;
    count: number;
    totalValue: number;
  }>;
  streaks: {
    currentDailyStreak: number;
    longestDailyStreak: number;
    lastRewardDate: Date;
  };
  milestones: Array<{
    type: string;
    threshold: number;
    achievedAt: Date;
    rewards?: Reward[];
  }>;
}

export interface RewardTrend {
  period: string; // 'daily' | 'weekly' | 'monthly'
  data: Array<{
    date: string;
    experience: number;
    money: number;
    friendship: number;
    items: number;
    activityScore: number;
  }>;
  averages: {
    experiencePerDay: number;
    moneyPerDay: number;
    friendshipPerDay: number;
    itemsPerDay: number;
  };
  projections: {
    nextWeekEstimate: {
      experience: number;
      money: number;
      friendship: number;
    };
  };
}

export class RewardHistory {
  private readonly CLEANUP_DAYS = 90; // Garder 90 jours d'historique
  private readonly MAX_ENTRIES_PER_PLAYER = 1000; // Limite par joueur

  /**
   * 📝 Enregistre une entrée dans l'historique des récompenses
   */
  async recordRewardDistribution(
    playerId: string,
    source: RewardSource,
    rewards: Reward[],
    result: RewardResult,
    sessionId?: string
  ): Promise<string> {
    try {
      const entryId = this.generateEntryId();
      
      const historyEntry: RewardHistoryEntry = {
        id: entryId,
        playerId,
        timestamp: new Date(),
        source,
        rewards,
        results: {
          totalExperience: result.totalExperience,
          totalMoney: result.totalMoney,
          totalFriendship: result.totalFriendship,
          itemsGiven: result.itemsGiven.length,
          prestigeGained: this.extractPrestigeFromResult(result)
        },
        success: result.success,
        error: result.error,
        notifications: result.notifications,
        specialEvents: result.specialEvents || [],
        sessionId
      };

      // Sauvegarder dans la base de données
      await this.saveHistoryEntry(historyEntry);

      // Mettre à jour les statistiques du joueur
      await this.updatePlayerStats(playerId, historyEntry);

      // Vérifier les milestones
      await this.checkRewardMilestones(playerId, historyEntry);

      console.log(`📝 [RewardHistory] Entrée enregistrée: ${entryId} pour ${playerId}`);
      return entryId;

    } catch (error) {
      console.error('❌ [RewardHistory] Erreur enregistrement:', error);
      throw error;
    }
  }

  /**
   * 📊 Obtient l'historique récent des récompenses d'un joueur
   */
  async getPlayerRecentHistory(
    playerId: string, 
    limit: number = 50,
    sourceType?: string
  ): Promise<RewardHistoryEntry[]> {
    try {
      // TODO: Requête MongoDB pour récupérer l'historique
      // Pour l'instant, retourner un tableau vide
      console.log(`📊 [RewardHistory] Récupération historique ${playerId} (${limit} entrées)`);
      return [];

    } catch (error) {
      console.error('❌ [RewardHistory] Erreur récupération historique:', error);
      return [];
    }
  }

  /**
   * 📈 Génère un résumé des récompenses pour une période
   */
  async getPlayerRewardSummary(
    playerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PlayerRewardSummary> {
    try {
      // TODO: Requête agrégée pour calculer les totaux
      const mockSummary: PlayerRewardSummary = {
        playerId,
        periodStart: startDate,
        periodEnd: endDate,
        totals: {
          experience: 0,
          money: 0,
          friendship: 0,
          items: 0,
          captures: 0,
          battles: 0,
          quests: 0,
          achievements: 0,
          specialEvents: 0
        },
        dailyBreakdown: [],
        topSources: [],
        streaks: {
          currentDailyStreak: 0,
          longestDailyStreak: 0,
          lastRewardDate: new Date()
        },
        milestones: []
      };

      return mockSummary;

    } catch (error) {
      console.error('❌ [RewardHistory] Erreur résumé:', error);
      throw error;
    }
  }

  /**
   * 📊 Obtient les statistiques quotidiennes des récompenses
   */
  async getDailyRewardStats(playerId: string, date: Date): Promise<DailyRewardStats> {
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      // TODO: Requête agrégée pour la journée spécifiée
      const stats: DailyRewardStats = {
        date: dateStr,
        totalExperience: 0,
        totalMoney: 0,
        totalFriendship: 0,
        itemsReceived: 0,
        capturesRewarded: 0,
        battlesRewarded: 0,
        questsCompleted: 0,
        achievementsUnlocked: 0,
        specialEventsTriggered: 0
      };

      return stats;

    } catch (error) {
      console.error('❌ [RewardHistory] Erreur stats quotidiennes:', error);
      throw error;
    }
  }

  /**
   * 📈 Analyse les tendances de récompenses
   */
  async getRewardTrends(
    playerId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 30
  ): Promise<RewardTrend> {
    try {
      // TODO: Calculer les tendances basées sur l'historique
      const trend: RewardTrend = {
        period,
        data: [],
        averages: {
          experiencePerDay: 0,
          moneyPerDay: 0,
          friendshipPerDay: 0,
          itemsPerDay: 0
        },
        projections: {
          nextWeekEstimate: {
            experience: 0,
            money: 0,
            friendship: 0
          }
        }
      };

      // Générer des données d'exemple pour les derniers jours
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        trend.data.push({
          date: date.toISOString().split('T')[0],
          experience: Math.floor(Math.random() * 1000),
          money: Math.floor(Math.random() * 5000),
          friendship: Math.floor(Math.random() * 50),
          items: Math.floor(Math.random() * 10),
          activityScore: Math.floor(Math.random() * 100)
        });
      }

      // Calculer les moyennes
      if (trend.data.length > 0) {
        trend.averages.experiencePerDay = Math.floor(
          trend.data.reduce((sum, day) => sum + day.experience, 0) / trend.data.length
        );
        trend.averages.moneyPerDay = Math.floor(
          trend.data.reduce((sum, day) => sum + day.money, 0) / trend.data.length
        );
        trend.averages.friendshipPerDay = Math.floor(
          trend.data.reduce((sum, day) => sum + day.friendship, 0) / trend.data.length
        );
        trend.averages.itemsPerDay = Math.floor(
          trend.data.reduce((sum, day) => sum + day.items, 0) / trend.data.length
        );

        // Projections simples basées sur la moyenne
        trend.projections.nextWeekEstimate = {
          experience: trend.averages.experiencePerDay * 7,
          money: trend.averages.moneyPerDay * 7,
          friendship: trend.averages.friendshipPerDay * 7
        };
      }

      return trend;

    } catch (error) {
      console.error('❌ [RewardHistory] Erreur tendances:', error);
      throw error;
    }
  }

  /**
   * 🏆 Obtient les milestones de récompenses d'un joueur
   */
  async getPlayerMilestones(playerId: string): Promise<Array<{
    type: string;
    description: string;
    threshold: number;
    currentProgress: number;
    achieved: boolean;
    achievedAt?: Date;
    reward?: Reward[];
  }>> {
    try {
      // Définir les milestones disponibles
      const milestoneDefinitions = [
        { type: 'total_experience', description: 'Expérience totale gagnée', thresholds: [1000, 5000, 10000, 25000, 50000, 100000] },
        { type: 'total_money', description: 'Argent total gagné', thresholds: [5000, 25000, 50000, 100000, 250000, 500000] },
        { type: 'total_friendship', description: 'Amitié totale gagnée', thresholds: [100, 500, 1000, 2500, 5000, 10000] },
        { type: 'items_received', description: 'Objets reçus', thresholds: [10, 50, 100, 250, 500, 1000] },
        { type: 'captures_rewarded', description: 'Captures récompensées', thresholds: [10, 50, 100, 250, 500, 1000] },
        { type: 'battles_won', description: 'Combats gagnés', thresholds: [10, 50, 100, 250, 500, 1000] },
        { type: 'daily_streak', description: 'Jours consécutifs actifs', thresholds: [7, 14, 30, 60, 100, 365] }
      ];

      const milestones = [];

      for (const definition of milestoneDefinitions) {
        const currentProgress = await this.getPlayerProgressForMilestone(playerId, definition.type);
        
        for (const threshold of definition.thresholds) {
          const achieved = currentProgress >= threshold;
          
          milestones.push({
            type: `${definition.type}_${threshold}`,
            description: `${definition.description}: ${threshold}`,
            threshold,
            currentProgress,
            achieved,
            achievedAt: achieved ? new Date() : undefined, // TODO: Récupérer la vraie date
            reward: achieved ? this.getMilestoneReward(definition.type, threshold) : undefined
          });
        }
      }

      return milestones.sort((a, b) => a.threshold - b.threshold);

    } catch (error) {
      console.error('❌ [RewardHistory] Erreur milestones:', error);
      return [];
    }
  }

  /**
   * 📊 Obtient les sources de récompenses les plus fréquentes
   */
  async getTopRewardSources(
    playerId: string,
    limit: number = 10,
    days: number = 30
  ): Promise<Array<{
    sourceType: string;
    sourceId: string;
    count: number;
    totalExperience: number;
    totalMoney: number;
    totalFriendship: number;
    averagePerSession: number;
  }>> {
    try {
      // TODO: Requête agrégée pour analyser les sources
      return [];

    } catch (error) {
      console.error('❌ [RewardHistory] Erreur top sources:', error);
      return [];
    }
  }

  /**
   * 🎯 Obtient les suggestions d'optimisation pour un joueur
   */
  async getOptimizationSuggestions(playerId: string): Promise<Array<{
    type: 'efficiency' | 'opportunity' | 'milestone' | 'streak';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    estimatedBenefit: {
      experience?: number;
      money?: number;
      friendship?: number;
    };
    actionRequired: string;
  }>> {
    try {
      const suggestions = [];
      
      // Analyser les patterns récents
      const recentHistory = await this.getPlayerRecentHistory(playerId, 100);
      const trends = await this.getRewardTrends(playerId, 'daily', 7);
      
      // Suggestion 1: Améliorer l'amitié
      if (trends.averages.friendshipPerDay < 20) {
        suggestions.push({
          type: 'opportunity',
          title: 'Améliorer l\'amitié avec vos Pokémon',
          description: 'Marchez plus avec vos Pokémon ou utilisez des objets d\'amitié pour augmenter les bonus d\'expérience.',
          priority: 'medium',
          estimatedBenefit: {
            experience: trends.averages.experiencePerDay * 0.2
          },
          actionRequired: 'Marcher 1000 pas ou utiliser des Poké Puffs'
        });
      }

      // Suggestion 2: Streak quotidien
      const summary = await this.getPlayerRewardSummary(playerId, new Date(Date.now() - 7*24*60*60*1000), new Date());
      if (summary.streaks.currentDailyStreak < 3) {
        suggestions.push({
          type: 'streak',
          title: 'Construire une série quotidienne',
          description: 'Connectez-vous tous les jours pour des bonus de récompenses croissants.',
          priority: 'high',
          estimatedBenefit: {
            experience: 500,
            money: 2000
          },
          actionRequired: 'Se connecter quotidiennement pendant 7 jours'
        });
      }

      // Suggestion 3: Diversification des sources
      const topSources = await this.getTopRewardSources(playerId, 5, 7);
      if (topSources.length > 0 && topSources[0].count > topSources.reduce((sum, s) => sum + s.count, 0) * 0.7) {
        suggestions.push({
          type: 'efficiency',
          title: 'Diversifier les sources de récompenses',
          description: 'Explorez différentes activités (quêtes, captures, combats) pour maximiser vos gains.',
          priority: 'medium',
          estimatedBenefit: {
            experience: trends.averages.experiencePerDay * 0.3,
            money: trends.averages.moneyPerDay * 0.3
          },
          actionRequired: 'Essayer 3 types d\'activités différents cette semaine'
        });
      }

      // Suggestion 4: Milestone proche
      const milestones = await this.getPlayerMilestones(playerId);
      const nextMilestone = milestones.find(m => !m.achieved && m.currentProgress >= m.threshold * 0.8);
      if (nextMilestone) {
        suggestions.push({
          type: 'milestone',
          title: `Milestone proche: ${nextMilestone.description}`,
          description: `Plus que ${nextMilestone.threshold - nextMilestone.currentProgress} pour débloquer des récompenses spéciales.`,
          priority: 'high',
          estimatedBenefit: {
            experience: 1000,
            money: 5000
          },
          actionRequired: `Continuer l'activité courante pour atteindre ${nextMilestone.threshold}`
        });
      }

      return suggestions.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

    } catch (error) {
      console.error('❌ [RewardHistory] Erreur suggestions:', error);
      return [];
    }
  }

  /**
   * 🧹 Nettoie l'historique ancien
   */
  async cleanupOldHistory(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.CLEANUP_DAYS);

      // TODO: Supprimer les entrées plus anciennes que CLEANUP_DAYS
      console.log(`🧹 [RewardHistory] Nettoyage historique avant ${cutoffDate.toISOString()}`);

    } catch (error) {
      console.error('❌ [RewardHistory] Erreur nettoyage:', error);
    }
  }

  /**
   * 📊 Obtient les statistiques globales du serveur
   */
  async getServerRewardStats(days: number = 7): Promise<{
    totalPlayersActive: number;
    totalRewardsDistributed: number;
    averageRewardsPerPlayer: number;
    topRewardSources: Array<{ sourceType: string; count: number; percentage: number }>;
    totalValueDistributed: {
      experience: number;
      money: number;
      friendship: number;
      items: number;
    };
  }> {
    try {
      // TODO: Requête agrégée sur tous les joueurs
      return {
        totalPlayersActive: 0,
        totalRewardsDistributed: 0,
        averageRewardsPerPlayer: 0,
        topRewardSources: [],
        totalValueDistributed: {
          experience: 0,
          money: 0,
          friendship: 0,
          items: 0
        }
      };

    } catch (error) {
      console.error('❌ [RewardHistory] Erreur stats serveur:', error);
      throw error;
    }
  }

  // === MÉTHODES PRIVÉES ===

  private generateEntryId(): string {
    return `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractPrestigeFromResult(result: RewardResult): number {
    // Extraire les points de prestige depuis les résultats
    const prestigeReward = result.processedRewards.find(r => r.type === 'prestige');
    return prestigeReward?.finalAmount || 0;
  }

  private async saveHistoryEntry(entry: RewardHistoryEntry): Promise<void> {
    try {
      // TODO: Sauvegarder dans MongoDB
      // Collection: rewardHistory
      console.log(`💾 [RewardHistory] Sauvegarde entrée ${entry.id}`);

    } catch (error) {
      console.error('❌ [RewardHistory] Erreur sauvegarde entrée:', error);
      throw error;
    }
  }

  private async updatePlayerStats(playerId: string, entry: RewardHistoryEntry): Promise<void> {
    try {
      // Mettre à jour les statistiques cumulatives du joueur
      await PlayerData.findOneAndUpdate(
        { username: playerId },
        {
          $inc: {
            'rewardStats.totalExperience': entry.results.totalExperience,
            'rewardStats.totalMoney': entry.results.totalMoney,
            'rewardStats.totalFriendship': entry.results.totalFriendship,
            'rewardStats.totalItems': entry.results.itemsGiven,
            'rewardStats.totalRewards': 1
          },
          $set: {
            'rewardStats.lastRewardDate': entry.timestamp
          }
        },
        { upsert: true }
      );

    } catch (error) {
      console.error('❌ [RewardHistory] Erreur mise à jour stats:', error);
    }
  }

  private async checkRewardMilestones(playerId: string, entry: RewardHistoryEntry): Promise<void> {
    try {
      // TODO: Vérifier si des milestones ont été atteints
      // et déclencher des récompenses bonus

    } catch (error) {
      console.error('❌ [RewardHistory] Erreur vérification milestones:', error);
    }
  }

  private async getPlayerProgressForMilestone(playerId: string, milestoneType: string): Promise<number> {
    try {
      // TODO: Calculer la progression actuelle pour un type de milestone
      return Math.floor(Math.random() * 1000); // Valeur d'exemple

    } catch (error) {
      console.error('❌ [RewardHistory] Erreur progression milestone:', error);
      return 0;
    }
  }

  private getMilestoneReward(milestoneType: string, threshold: number): Reward[] {
    // Générer des récompenses selon le type et le seuil
    const rewards: Reward[] = [];

    if (milestoneType === 'total_experience') {
      rewards.push({
        type: 'item',
        itemId: 'exp_share',
        quantity: 1
      });
    } else if (milestoneType === 'total_money') {
      rewards.push({
        type: 'money',
        amount: threshold * 0.1
      });
    } else if (milestoneType === 'total_friendship') {
      rewards.push({
        type: 'item',
        itemId: 'soothe_bell',
        quantity: 1
      });
    }

    return rewards;
  }

  /**
   * 📈 Obtient l'activité récente d'un joueur
   */
  async getPlayerActivityScore(playerId: string, days: number = 7): Promise<{
    activityScore: number; // 0-100
    breakdown: {
      battles: number;
      captures: number;
      quests: number;
      social: number;
      exploration: number;
    };
    trend: 'increasing' | 'stable' | 'decreasing';
    recommendation: string;
  }> {
    try {
      const trends = await this.getRewardTrends(playerId, 'daily', days);
      
      // Calculer le score d'activité basé sur la diversité et la fréquence
      let activityScore = 0;
      const breakdown = {
        battles: 0,
        captures: 0,
        quests: 0,
        social: 0,
        exploration: 0
      };

      // Analyser les sources récentes
      const recentSources = await this.getTopRewardSources(playerId, 10, days);
      for (const source of recentSources) {
        switch (source.sourceType) {
          case 'battle':
            breakdown.battles += source.count;
            break;
          case 'capture':
            breakdown.captures += source.count;
            break;
          case 'quest':
            breakdown.quests += source.count;
            break;
          case 'trade':
            breakdown.social += source.count;
            break;
          case 'exploration':
            breakdown.exploration += source.count;
            break;
        }
      }

      // Calculer le score (diversité + volume)
      const totalActivities = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
      const diversity = Object.values(breakdown).filter(val => val > 0).length;
      
      activityScore = Math.min(100, (totalActivities * 2) + (diversity * 10));

      // Déterminer la tendance
      const currentWeekAvg = trends.data.slice(-7).reduce((sum, day) => sum + day.activityScore, 0) / 7;
      const previousWeekAvg = trends.data.slice(-14, -7).reduce((sum, day) => sum + day.activityScore, 0) / 7;
      
      let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      if (currentWeekAvg > previousWeekAvg * 1.1) {
        trend = 'increasing';
      } else if (currentWeekAvg < previousWeekAvg * 0.9) {
        trend = 'decreasing';
      }

      // Recommandation
      let recommendation = 'Continuez votre excellent travail !';
      if (activityScore < 30) {
        recommendation = 'Essayez de vous connecter plus régulièrement et diversifiez vos activités.';
      } else if (activityScore < 60) {
        recommendation = 'Bon travail ! Essayez d\'explorer de nouvelles activités pour maximiser vos récompenses.';
      } else if (diversity < 3) {
        recommendation = 'Excellent volume d\'activité ! Diversifiez pour débloquer plus de bonus.';
      }

      return {
        activityScore,
        breakdown,
        trend,
        recommendation
      };

    } catch (error) {
      console.error('❌ [RewardHistory] Erreur score d\'activité:', error);
      return {
        activityScore: 0,
        breakdown: {
          battles: 0,
          captures: 0,
          quests: 0,
          social: 0,
          exploration: 0
        },
        trend: 'stable',
        recommendation: 'Commencez par capturer des Pokémon et participer à des combats !'
      };
    }
  }

  /**
   * 🎯 Génère un rapport de performance personnalisé
   */
  async generatePerformanceReport(playerId: string): Promise<{
    overall: {
      grade: 'F' | 'D' | 'C' | 'B' | 'A' | 'S';
      score: number;
      improvement: number; // % d'amélioration vs période précédente
    };
    strengths: string[];
    areasForImprovement: string[];
    achievements: Array<{
      name: string;
      description: string;
      rarity: 'common' | 'rare' | 'epic' | 'legendary';
    }>;
    nextGoals: Array<{
      description: string;
      estimatedTime: string;
      reward: string;
    }>;
    personalizedTips: string[];
  }> {
    try {
      const activity = await this.getPlayerActivityScore(playerId, 30);
      const milestones = await this.getPlayerMilestones(playerId);
      const trends = await this.getRewardTrends(playerId, 'daily', 30);

      // Calculer la note globale
      const score = Math.min(100, (activity.activityScore * 0.4) + (milestones.filter(m => m.achieved).length * 2));
      let grade: 'F' | 'D' | 'C' | 'B' | 'A' | 'S' = 'F';
      
      if (score >= 90) grade = 'S';
      else if (score >= 80) grade = 'A';
      else if (score >= 70) grade = 'B';
      else if (score >= 60) grade = 'C';
      else if (score >= 50) grade = 'D';

      // Identifier les forces
      const strengths = [];
      if (activity.breakdown.battles > 10) strengths.push('Excellent combattant');
      if (activity.breakdown.captures > 20) strengths.push('Collectionneur passionné');
      if (activity.breakdown.quests > 5) strengths.push('Aventurier déterminé');
      if (trends.averages.friendshipPerDay > 30) strengths.push('Ami fidèle des Pokémon');

      // Identifier les axes d'amélioration
      const areasForImprovement = [];
      if (activity.breakdown.battles < 5) areasForImprovement.push('Participer à plus de combats');
      if (activity.breakdown.captures < 10) areasForImprovement.push('Capturer plus de Pokémon');
      if (activity.breakdown.social < 2) areasForImprovement.push('Interactions sociales (échanges)');
      if (trends.averages.friendshipPerDay < 15) areasForImprovement.push('Développer l\'amitié avec vos Pokémon');

      return {
        overall: {
          grade,
          score,
          improvement: Math.random() * 20 - 10 // TODO: Calculer la vraie amélioration
        },
        strengths: strengths.length > 0 ? strengths : ['Nouveau dresseur plein de potentiel'],
        areasForImprovement,
        achievements: [
          // TODO: Extraire les vrais achievements récents
        ],
        nextGoals: [
          {
            description: 'Atteindre le prochain milestone d\'expérience',
            estimatedTime: '3-5 jours',
            reward: '1000 XP bonus + Objets rares'
          },
          {
            description: 'Construire une série de 7 jours',
            estimatedTime: '1 semaine',
            reward: 'Bonus quotidiens doublés'
          }
        ],
        personalizedTips: [
          activity.recommendation,
          'Connectez-vous quotidiennement pour les bonus de série',
          'Explorez de nouvelles zones pour découvrir des Pokémon rares'
        ]
      };

    } catch (error) {
      console.error('❌ [RewardHistory] Erreur rapport de performance:', error);
      throw error;
    }
  }
}
