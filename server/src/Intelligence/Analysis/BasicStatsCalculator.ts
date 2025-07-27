// server/src/Intelligence/Analysis/BasicStatsCalculator.ts

/**
 * 📊 BASIC STATS CALCULATOR - STATISTIQUES SIMPLES ET RAPIDES
 * 
 * Calcule des statistiques de base sur les données des joueurs.
 * Optimisé pour des réponses rapides et des métriques simples.
 * 
 * RÔLE : Fournir des insights immédiats sans analyse complexe.
 */

import { PlayerHistoryReader, getPlayerHistoryReader } from '../DataCollection/PlayerHistoryReader';
import { 
  ActionType, 
  ActionCategory,
  POSITIVE_ACTIONS,
  FRUSTRATION_INDICATORS,
  CRITICAL_ACTIONS
} from '../Core/ActionTypes';

import type { PlayerAction } from '../Core/ActionTypes';

// ===================================================================
// 📈 INTERFACES DES STATISTIQUES
// ===================================================================

/**
 * Statistiques de base d'un joueur
 */
export interface BasicPlayerStats {
  playerId: string;
  playerName: string;
  
  // Statistiques d'activité
  activity: {
    totalActions: number;
    actionsToday: number;
    actionsThisWeek: number;
    averageActionsPerDay: number;
    lastActivity: number;
    daysSinceLastActivity: number;
  };
  
  // Statistiques de session
  sessions: {
    totalSessions: number;
    averageSessionDuration: number; // en minutes
    longestSession: number; // en minutes
    sessionsThisWeek: number;
  };
  
  // Statistiques de gameplay
  gameplay: {
    pokemonCaught: number;
    battlesWon: number;
    battlesLost: number;
    winRate: number;
    questsCompleted: number;
    locationsVisited: number;
  };
  
  // Statistiques sociales
  social: {
    messagesCount: number;
    friendInteractions: number;
    tradesCompleted: number;
    socialScore: number; // 0-1
  };
  
  // Indicateurs de santé
  health: {
    frustrationLevel: number; // 0-1
    engagementLevel: number; // 0-1
    skillProgression: number; // 0-1
    churnRisk: number; // 0-1
  };
}

/**
 * Statistiques globales du serveur
 */
export interface GlobalServerStats {
  timestamp: number;
  
  // Statistiques des joueurs
  players: {
    totalPlayers: number;
    activePlayers: number; // dernières 24h
    newPlayersToday: number;
    returningPlayers: number; // revenus après 7+ jours
  };
  
  // Statistiques d'activité
  activity: {
    totalActionsToday: number;
    averageActionsPerPlayer: number;
    mostActiveHour: number;
    activeSessions: number;
  };
  
  // Statistiques de gameplay
  gameplay: {
    pokemonCaughtToday: number;
    battlesToday: number;
    questsCompletedToday: number;
    averageWinRate: number;
  };
  
  // Métriques de performance
  performance: {
    averageSessionDuration: number;
    playerRetentionRate: number; // 7 jours
    churnRate: number;
    engagementScore: number;
  };
}

/**
 * Comparaison de joueur vs moyennes
 */
export interface PlayerComparison {
  playerId: string;
  comparedToServer: {
    activityLevel: 'much_below' | 'below' | 'average' | 'above' | 'much_above';
    skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    socialness: 'antisocial' | 'quiet' | 'normal' | 'social' | 'very_social';
    engagement: 'disengaged' | 'casual' | 'regular' | 'committed' | 'hardcore';
  };
  percentiles: {
    totalActions: number;
    sessionDuration: number;
    winRate: number;
    socialActivity: number;
  };
}

// ===================================================================
// 🔥 CLASSE PRINCIPALE - BASIC STATS CALCULATOR
// ===================================================================

export class BasicStatsCalculator {
  private historyReader: PlayerHistoryReader;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  constructor() {
    this.historyReader = getPlayerHistoryReader();
    console.log('📊 BasicStatsCalculator initialisé');
  }

  // ===================================================================
  // 👤 STATISTIQUES JOUEUR
  // ===================================================================

  /**
   * Calcule les statistiques de base d'un joueur
   */
  async calculatePlayerStats(playerId: string): Promise<BasicPlayerStats | null> {
    const cacheKey = `player_stats_${playerId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Récupérer les données nécessaires
      const [actions, sessions, summary] = await Promise.all([
        this.historyReader.getPlayerActions(playerId, { limit: 1000 }),
        this.historyReader.getPlayerSessions(playerId, 30),
        this.historyReader.generatePlayerSummary(playerId)
      ]);

      if (!actions.length || !summary) return null;

      // Calculer les statistiques d'activité
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

      const actionsToday = actions.filter(a => a.timestamp >= oneDayAgo).length;
      const actionsThisWeek = actions.filter(a => a.timestamp >= oneWeekAgo).length;
      
      const daysSinceFirst = (now - actions[actions.length - 1].timestamp) / (24 * 60 * 60 * 1000);
      const averageActionsPerDay = actions.length / Math.max(1, daysSinceFirst);
      
      const daysSinceLastActivity = (now - actions[0].timestamp) / (24 * 60 * 60 * 1000);

      // Calculer les statistiques de session
      const sessionsThisWeek = sessions.filter(s => s.startTime >= oneWeekAgo).length;
      const sessionDurations = sessions.filter(s => s.duration).map(s => s.duration! / (60 * 1000));
      const averageSessionDuration = sessionDurations.length > 0 ? 
        sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length : 0;
      const longestSession = sessionDurations.length > 0 ? Math.max(...sessionDurations) : 0;

      // Calculer les statistiques de gameplay
      const pokemonCaught = actions.filter(a => a.actionType === ActionType.POKEMON_CAPTURE_SUCCESS).length;
      const battlesWon = actions.filter(a => a.actionType === ActionType.BATTLE_VICTORY).length;
      const battlesLost = actions.filter(a => a.actionType === ActionType.BATTLE_DEFEAT).length;
      const winRate = (battlesWon + battlesLost) > 0 ? battlesWon / (battlesWon + battlesLost) : 0;
      const questsCompleted = actions.filter(a => a.actionType === ActionType.QUEST_COMPLETE).length;
      
      const uniqueLocations = new Set(
        actions.map(a => a.data.location?.map).filter(Boolean)
      ).size;

      // Calculer les statistiques sociales
      const messagesCount = actions.filter(a => a.actionType === ActionType.PLAYER_MESSAGE).length;
      const friendInteractions = actions.filter(a => 
        a.actionType === ActionType.FRIEND_ADD || 
        a.actionType === ActionType.PLAYER_MESSAGE
      ).length;
      const tradesCompleted = actions.filter(a => a.actionType === ActionType.TRADE_COMPLETE).length;
      const socialScore = Math.min(1, (messagesCount + friendInteractions * 2 + tradesCompleted * 3) / 100);

      // Calculer les indicateurs de santé
      const recentActions = actions.filter(a => a.timestamp >= oneWeekAgo);
      const frustrationActions = recentActions.filter(a => FRUSTRATION_INDICATORS.includes(a.actionType)).length;
      const positiveActions = recentActions.filter(a => POSITIVE_ACTIONS.includes(a.actionType)).length;
      
      const frustrationLevel = recentActions.length > 0 ? 
        Math.min(1, frustrationActions / recentActions.length * 2) : 0;

      const engagementLevel = Math.min(1, (actionsToday * 0.3 + sessionsThisWeek * 0.4 + socialScore * 0.3));
      
      const skillProgression = Math.min(1, (winRate * 0.4 + questsCompleted / 20 * 0.3 + pokemonCaught / 50 * 0.3));

      const churnRisk = daysSinceLastActivity > 3 ? Math.min(1, daysSinceLastActivity / 7) : 0;

      const stats: BasicPlayerStats = {
        playerId,
        playerName: summary.playerName,
        activity: {
          totalActions: actions.length,
          actionsToday,
          actionsThisWeek,
          averageActionsPerDay: Math.round(averageActionsPerDay * 100) / 100,
          lastActivity: actions[0].timestamp,
          daysSinceLastActivity: Math.round(daysSinceLastActivity * 100) / 100
        },
        sessions: {
          totalSessions: sessions.length,
          averageSessionDuration: Math.round(averageSessionDuration),
          longestSession: Math.round(longestSession),
          sessionsThisWeek
        },
        gameplay: {
          pokemonCaught,
          battlesWon,
          battlesLost,
          winRate: Math.round(winRate * 100) / 100,
          questsCompleted,
          locationsVisited: uniqueLocations
        },
        social: {
          messagesCount,
          friendInteractions,
          tradesCompleted,
          socialScore: Math.round(socialScore * 100) / 100
        },
        health: {
          frustrationLevel: Math.round(frustrationLevel * 100) / 100,
          engagementLevel: Math.round(engagementLevel * 100) / 100,
          skillProgression: Math.round(skillProgression * 100) / 100,
          churnRisk: Math.round(churnRisk * 100) / 100
        }
      };

      this.setCache(cacheKey, stats);
      return stats;

    } catch (error) {
      console.error(`❌ Erreur calcul stats joueur ${playerId}:`, error);
      return null;
    }
  }

  /**
   * Compare un joueur aux moyennes du serveur
   */
  async comparePlayerToServer(playerId: string): Promise<PlayerComparison | null> {
    try {
      const [playerStats, globalStats] = await Promise.all([
        this.calculatePlayerStats(playerId),
        this.calculateGlobalStats()
      ]);

      if (!playerStats || !globalStats) return null;

      // Calculer les niveaux comparatifs
      const activityRatio = playerStats.activity.averageActionsPerDay / globalStats.activity.averageActionsPerPlayer;
      let activityLevel: 'much_below' | 'below' | 'average' | 'above' | 'much_above';
      if (activityRatio < 0.3) activityLevel = 'much_below';
      else if (activityRatio < 0.7) activityLevel = 'below';
      else if (activityRatio < 1.3) activityLevel = 'average';
      else if (activityRatio < 2.0) activityLevel = 'above';
      else activityLevel = 'much_above';

      // Déterminer le niveau de skill
      let skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      if (playerStats.gameplay.winRate < 0.3) skillLevel = 'beginner';
      else if (playerStats.gameplay.winRate < 0.6) skillLevel = 'intermediate';
      else if (playerStats.gameplay.winRate < 0.8) skillLevel = 'advanced';
      else skillLevel = 'expert';

      // Déterminer la socialité
      const socialRatio = playerStats.social.socialScore;
      let socialness: 'antisocial' | 'quiet' | 'normal' | 'social' | 'very_social';
      if (socialRatio < 0.1) socialness = 'antisocial';
      else if (socialRatio < 0.3) socialness = 'quiet';
      else if (socialRatio < 0.6) socialness = 'normal';
      else if (socialRatio < 0.8) socialness = 'social';
      else socialness = 'very_social';

      // Déterminer l'engagement
      const engagementRatio = playerStats.health.engagementLevel;
      let engagement: 'disengaged' | 'casual' | 'regular' | 'committed' | 'hardcore';
      if (engagementRatio < 0.2) engagement = 'disengaged';
      else if (engagementRatio < 0.4) engagement = 'casual';
      else if (engagementRatio < 0.6) engagement = 'regular';
      else if (engagementRatio < 0.8) engagement = 'committed';
      else engagement = 'hardcore';

      const comparison: PlayerComparison = {
        playerId,
        comparedToServer: {
          activityLevel,
          skillLevel,
          socialness,
          engagement
        },
        percentiles: {
          totalActions: Math.round(activityRatio * 50), // Approximation
          sessionDuration: Math.round((playerStats.sessions.averageSessionDuration / globalStats.performance.averageSessionDuration) * 50),
          winRate: Math.round(playerStats.gameplay.winRate * 100),
          socialActivity: Math.round(socialRatio * 100)
        }
      };

      return comparison;

    } catch (error) {
      console.error(`❌ Erreur comparaison joueur ${playerId}:`, error);
      return null;
    }
  }

  // ===================================================================
  // 🌍 STATISTIQUES GLOBALES
  // ===================================================================

  /**
   * Calcule les statistiques globales du serveur
   */
  async calculateGlobalStats(): Promise<GlobalServerStats | null> {
    const cacheKey = 'global_stats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

      // Récupérer les actions récentes
      const actionsToday = await this.historyReader.searchActions({
        timeRange: { start: oneDayAgo, end: now },
        limit: 10000
      });

      const actionsThisWeek = await this.historyReader.searchActions({
        timeRange: { start: oneWeekAgo, end: now },
        limit: 50000
      });

      // Calculer les joueurs uniques
      const playersToday = new Set(actionsToday.map(a => a.playerId));
      const playersThisWeek = new Set(actionsThisWeek.map(a => a.playerId));

      // Calculer l'heure la plus active
      const hourCounts: { [hour: number]: number } = {};
      for (const action of actionsToday) {
        const hour = new Date(action.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
      const mostActiveHour = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] ? parseInt(Object.entries(hourCounts).sort(([,a], [,b]) => b - a)[0][0]) : 12;

      // Calculer les statistiques de gameplay
      const pokemonCaughtToday = actionsToday.filter(a => a.actionType === ActionType.POKEMON_CAPTURE_SUCCESS).length;
      const battlesToday = actionsToday.filter(a => a.actionType === ActionType.BATTLE_START).length;
      const questsCompletedToday = actionsToday.filter(a => a.actionType === ActionType.QUEST_COMPLETE).length;

      const battlesWon = actionsToday.filter(a => a.actionType === ActionType.BATTLE_VICTORY).length;
      const battlesLost = actionsToday.filter(a => a.actionType === ActionType.BATTLE_DEFEAT).length;
      const averageWinRate = (battlesWon + battlesLost) > 0 ? battlesWon / (battlesWon + battlesLost) : 0;

      const stats: GlobalServerStats = {
        timestamp: now,
        players: {
          totalPlayers: playersThisWeek.size,
          activePlayers: playersToday.size,
          newPlayersToday: 0, // TODO: Détecter nouveaux joueurs
          returningPlayers: 0 // TODO: Détecter joueurs de retour
        },
        activity: {
          totalActionsToday: actionsToday.length,
          averageActionsPerPlayer: playersToday.size > 0 ? actionsToday.length / playersToday.size : 0,
          mostActiveHour,
          activeSessions: 0 // TODO: Compter sessions actives
        },
        gameplay: {
          pokemonCaughtToday,
          battlesToday,
          questsCompletedToday,
          averageWinRate: Math.round(averageWinRate * 100) / 100
        },
        performance: {
          averageSessionDuration: 45, // TODO: Calculer depuis les vraies sessions
          playerRetentionRate: 0.7, // TODO: Calculer rétention 7 jours
          churnRate: 0.1,
          engagementScore: 0.6
        }
      };

      this.setCache(cacheKey, stats, 5 * 60 * 1000); // Cache 5 minutes pour global
      return stats;

    } catch (error) {
      console.error('❌ Erreur calcul stats globales:', error);
      return null;
    }
  }

  // ===================================================================
  // 📊 STATISTIQUES RAPIDES
  // ===================================================================

  /**
   * Statistiques rapides d'un joueur (version allégée)
   */
  async getQuickPlayerStats(playerId: string): Promise<{
    totalActions: number;
    lastActivity: number;
    daysSinceLastActivity: number;
    winRate: number;
    engagementLevel: 'low' | 'medium' | 'high';
  } | null> {
    try {
      const recentActions = await this.historyReader.getPlayerActions(playerId, { limit: 100 });
      if (recentActions.length === 0) return null;

      const battlesWon = recentActions.filter(a => a.actionType === ActionType.BATTLE_VICTORY).length;
      const battlesLost = recentActions.filter(a => a.actionType === ActionType.BATTLE_DEFEAT).length;
      const winRate = (battlesWon + battlesLost) > 0 ? battlesWon / (battlesWon + battlesLost) : 0;

      const daysSinceLastActivity = (Date.now() - recentActions[0].timestamp) / (24 * 60 * 60 * 1000);
      
      let engagementLevel: 'low' | 'medium' | 'high' = 'low';
      if (daysSinceLastActivity < 1 && recentActions.length > 20) engagementLevel = 'high';
      else if (daysSinceLastActivity < 3 && recentActions.length > 10) engagementLevel = 'medium';

      return {
        totalActions: recentActions.length,
        lastActivity: recentActions[0].timestamp,
        daysSinceLastActivity: Math.round(daysSinceLastActivity * 100) / 100,
        winRate: Math.round(winRate * 100) / 100,
        engagementLevel
      };

    } catch (error) {
      console.error(`❌ Erreur stats rapides ${playerId}:`, error);
      return null;
    }
  }

  /**
   * Top joueurs par métrique
   */
  async getTopPlayers(
    metric: 'activity' | 'winrate' | 'social' | 'pokemon',
    limit: number = 10
  ): Promise<{ playerId: string; playerName: string; value: number }[]> {
    try {
      // Version simplifiée - récupère les joueurs actifs récents
      const recentActions = await this.historyReader.searchActions({
        timeRange: { start: Date.now() - 7 * 24 * 60 * 60 * 1000, end: Date.now() },
        limit: 5000
      });

      const playerStats = new Map<string, any>();

      // Compter par joueur
      for (const action of recentActions) {
        if (!playerStats.has(action.playerId)) {
          playerStats.set(action.playerId, {
            playerId: action.playerId,
            playerName: action.data.playerName,
            actions: 0,
            battlesWon: 0,
            battlesTotal: 0,
            messages: 0,
            pokemonCaught: 0
          });
        }

        const stats = playerStats.get(action.playerId);
        stats.actions++;

        if (action.actionType === ActionType.BATTLE_VICTORY) stats.battlesWon++;
        if (action.actionType === ActionType.BATTLE_START) stats.battlesTotal++;
        if (action.actionType === ActionType.PLAYER_MESSAGE) stats.messages++;
        if (action.actionType === ActionType.POKEMON_CAPTURE_SUCCESS) stats.pokemonCaught++;
      }

      // Calculer la métrique et trier
      const results = Array.from(playerStats.values()).map(stats => {
        let value = 0;
        switch (metric) {
          case 'activity':
            value = stats.actions;
            break;
          case 'winrate':
            value = stats.battlesTotal > 0 ? stats.battlesWon / stats.battlesTotal : 0;
            break;
          case 'social':
            value = stats.messages;
            break;
          case 'pokemon':
            value = stats.pokemonCaught;
            break;
        }
        return {
          playerId: stats.playerId,
          playerName: stats.playerName,
          value: Math.round(value * 100) / 100
        };
      });

      return results
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);

    } catch (error) {
      console.error(`❌ Erreur top joueurs ${metric}:`, error);
      return [];
    }
  }

  // ===================================================================
  // 🗂️ GESTION DU CACHE
  // ===================================================================

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, customDuration?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + (customDuration || this.CACHE_DURATION)
    });
  }

  /**
   * Vide le cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Cache BasicStatsCalculator vidé');
  }

  /**
   * Nettoyage à la destruction
   */
  destroy(): void {
    this.clearCache();
    console.log('📊 BasicStatsCalculator détruit');
  }
}

// ===================================================================
// 🏭 SINGLETON ET EXPORTS
// ===================================================================

let calculatorInstance: BasicStatsCalculator | null = null;

/**
 * Récupère l'instance singleton du calculator
 */
export function getBasicStatsCalculator(): BasicStatsCalculator {
  if (!calculatorInstance) {
    calculatorInstance = new BasicStatsCalculator();
  }
  return calculatorInstance;
}

/**
 * Export par défaut
 */
export default BasicStatsCalculator;
