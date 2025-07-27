// server/src/Intelligence/DataCollection/PlayerHistoryReader.ts

/**
 * 📖 PLAYER HISTORY READER - INTERFACE DE LECTURE INTELLIGENTE
 * 
 * Lit et analyse l'historique des actions des joueurs depuis la base de données.
 * Fournit des interfaces optimisées pour l'analyse comportementale et l'IA.
 * 
 * RÔLE CLÉ : Pont entre les données brutes et l'intelligence artificielle.
 */

import { 
  PlayerActionModel, 
  NPCMemoryModel, 
  BehaviorPatternModel, 
  GameSessionModel,
  type IPlayerActionDocument,
  type INPCMemoryDocument,
  type IBehaviorPatternDocument,
  type IGameSessionDocument
} from '../Core/DatabaseSchema';

import { 
  PlayerAction, 
  ActionType, 
  ActionCategory,
  POSITIVE_ACTIONS,
  FRUSTRATION_INDICATORS,
  CRITICAL_ACTIONS
} from '../Core/ActionTypes';

import type { 
  PokemonActionData, 
  CombatActionData, 
  MovementActionData,
  SocialActionData 
} from '../Core/ActionTypes';

// ===================================================================
// 📊 INTERFACES DE DONNÉES ANALYSÉES
// ===================================================================

/**
 * Résumé d'activité d'un joueur
 */
export interface PlayerActivitySummary {
  playerId: string;
  playerName: string;
  totalActions: number;
  actionsByCategory: { [category: string]: number };
  mostActiveHours: number[];
  favoriteLocations: string[];
  sessionStats: {
    totalSessions: number;
    averageSessionDuration: number;
    longestSession: number;
    lastSessionDate: number;
  };
  socialStats: {
    messagesCount: number;
    friendsCount: number;
    tradeCount: number;
  };
  gameplayStats: {
    pokemonCaught: number;
    battlesWon: number;
    battlesLost: number;
    questsCompleted: number;
  };
  activityPattern: 'casual' | 'regular' | 'hardcore' | 'inactive';
  lastActivity: number;
}

/**
 * Données de session détaillées
 */
export interface DetailedSessionData {
  sessionId: string;
  playerId: string;
  startTime: number;
  endTime?: number;
  duration: number;
  actionsCount: number;
  actionTimeline: {
    timestamp: number;
    actionType: ActionType;
    category: ActionCategory;
    location: { map: string; x: number; y: number };
  }[];
  productivity: {
    pokemonEncounters: number;
    battlesTotal: number;
    questProgress: number;
    socialInteractions: number;
  };
  behaviorMetrics: {
    averageActionInterval: number;
    mostActiveLocation: string;
    explorationScore: number; // 0-1
    focusScore: number; // 0-1
  };
  mood: 'frustrated' | 'happy' | 'focused' | 'casual' | 'unknown';
}

/**
 * Analyse comportementale d'un joueur
 */
export interface PlayerBehaviorAnalysis {
  playerId: string;
  analysisTimestamp: number;
  
  // Patterns temporels
  temporalPatterns: {
    preferredPlaytimes: string[]; // 'morning', 'afternoon', 'evening', 'night'
    sessionFrequency: number; // sessions per week
    consistencyScore: number; // 0-1
  };
  
  // Preferences de gameplay
  gameplayPreferences: {
    primaryActivity: string; // 'combat', 'exploration', 'social', 'collection'
    skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    riskTolerance: number; // 0-1
    socialness: number; // 0-1
  };
  
  // Indicateurs psychologiques
  psychologicalProfile: {
    frustrationTolerance: number; // 0-1
    achievementOrientation: number; // 0-1
    explorationTendency: number; // 0-1
    compulsiveness: number; // 0-1
  };
  
  // Trends récents
  recentTrends: {
    activityChange: number; // -1 to 1 (decreasing to increasing)
    moodTrend: number; // -1 to 1 (getting worse to getting better)
    skillProgression: number; // -1 to 1
    socialTrend: number; // -1 to 1
  };
  
  // Prédictions
  predictions: {
    nextPlaySession: number; // timestamp probable
    likelyDuration: number; // durée probable en minutes
    churnRisk: number; // 0-1 (probabilité d'arrêt)
    helpNeeded: boolean;
  };
}

/**
 * Statistiques comparatives
 */
export interface ComparativeStats {
  playerRank: {
    totalActions: number;
    percentile: number;
  };
  averageComparison: {
    sessionDuration: { player: number; average: number };
    activityLevel: { player: number; average: number };
    socialness: { player: number; average: number };
    skillLevel: { player: number; average: number };
  };
  achievements: {
    rareActions: string[];
    uniquePatterns: string[];
    expertBehaviors: string[];
  };
}

// ===================================================================
// 🔥 CLASSE PRINCIPALE - PLAYER HISTORY READER
// ===================================================================

export class PlayerHistoryReader {
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    console.log('📖 PlayerHistoryReader initialisé');
    this.startCacheCleanup();
  }

  // ===================================================================
  // 📊 LECTURE DE BASE DES DONNÉES
  // ===================================================================

  /**
   * Récupère les actions d'un joueur avec filtres
   */
  async getPlayerActions(
    playerId: string,
    options: {
      category?: ActionCategory;
      actionType?: ActionType;
      startTime?: number;
      endTime?: number;
      limit?: number;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<PlayerAction[]> {
    const cacheKey = `actions_${playerId}_${JSON.stringify(options)}`;
    
    // Vérifier le cache
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const query: any = { playerId };
      
      // Appliquer les filtres
      if (options.category) query.category = options.category;
      if (options.actionType) query.actionType = options.actionType;
      if (options.startTime || options.endTime) {
        query.timestamp = {};
        if (options.startTime) query.timestamp.$gte = options.startTime;
        if (options.endTime) query.timestamp.$lte = options.endTime;
      }

      const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
      const limit = options.limit || 100;

      const documents = await PlayerActionModel
        .find(query)
        .sort({ timestamp: sortOrder })
        .limit(limit)
        .lean();

      const actions: PlayerAction[] = documents.map(doc => ({
        id: doc._id.toString(),
        playerId: doc.playerId,
        actionType: doc.actionType as ActionType,
        category: doc.category as ActionCategory,
        timestamp: doc.timestamp,
        data: doc.data,
        metadata: doc.metadata
      }));

      this.setCache(cacheKey, actions);
      return actions;

    } catch (error) {
      console.error(`❌ Erreur lecture actions joueur ${playerId}:`, error);
      return [];
    }
  }

  /**
   * Récupère toutes les sessions d'un joueur
   */
  async getPlayerSessions(
    playerId: string,
    limit: number = 50
  ): Promise<IGameSessionDocument[]> {
    const cacheKey = `sessions_${playerId}_${limit}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const sessions = await GameSessionModel
        .find({ playerId })
        .sort({ startTime: -1 })
        .limit(limit)
        .lean();

      this.setCache(cacheKey, sessions);
      return sessions;

    } catch (error) {
      console.error(`❌ Erreur lecture sessions joueur ${playerId}:`, error);
      return [];
    }
  }

  /**
   * Récupère les patterns comportementaux d'un joueur
   */
  async getPlayerBehaviorPatterns(
    playerId: string,
    activeOnly: boolean = true
  ): Promise<IBehaviorPatternDocument[]> {
    const cacheKey = `patterns_${playerId}_${activeOnly}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const query: any = { playerId };
      if (activeOnly) query.isActive = true;

      const patterns = await BehaviorPatternModel
        .find(query)
        .sort({ 'pattern.confidence': -1 })
        .lean();

      this.setCache(cacheKey, patterns);
      return patterns;

    } catch (error) {
      console.error(`❌ Erreur lecture patterns joueur ${playerId}:`, error);
      return [];
    }
  }

  /**
   * Récupère la mémoire NPCs pour un joueur
   */
  async getNPCMemoryForPlayer(
    playerId: string,
    npcId?: string
  ): Promise<INPCMemoryDocument[]> {
    const cacheKey = `npc_memory_${playerId}_${npcId || 'all'}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const query: any = { playerId };
      if (npcId) query.npcId = npcId;

      const memories = await NPCMemoryModel
        .find(query)
        .sort({ 'relationship.lastSeen': -1 })
        .lean();

      this.setCache(cacheKey, memories);
      return memories;

    } catch (error) {
      console.error(`❌ Erreur lecture mémoire NPC pour ${playerId}:`, error);
      return [];
    }
  }

  // ===================================================================
  // 📈 ANALYSES AVANCÉES
  // ===================================================================

  /**
   * Génère un résumé complet d'activité d'un joueur
   */
  async generatePlayerSummary(playerId: string): Promise<PlayerActivitySummary | null> {
    const cacheKey = `summary_${playerId}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Récupérer toutes les données nécessaires
      const [actions, sessions] = await Promise.all([
        this.getPlayerActions(playerId, { limit: 1000 }),
        this.getPlayerSessions(playerId, 20)
      ]);

      if (actions.length === 0) return null;

      // Calculer les statistiques de base
      const actionsByCategory: { [category: string]: number } = {};
      const locationCounts: { [location: string]: number } = {};
      const hourCounts: { [hour: number]: number } = {};

      let pokemonCaught = 0;
      let battlesWon = 0;
      let battlesLost = 0;
      let questsCompleted = 0;
      let messagesCount = 0;
      let tradeCount = 0;

      for (const action of actions) {
        // Compter par catégorie
        actionsByCategory[action.category] = (actionsByCategory[action.category] || 0) + 1;

        // Compter les localisations
        if (action.data.location?.map) {
          locationCounts[action.data.location.map] = (locationCounts[action.data.location.map] || 0) + 1;
        }

        // Compter les heures d'activité
        const hour = new Date(action.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;

        // Statistiques spécifiques
        switch (action.actionType) {
          case ActionType.POKEMON_CAPTURE_SUCCESS:
            pokemonCaught++;
            break;
          case ActionType.BATTLE_VICTORY:
            battlesWon++;
            break;
          case ActionType.BATTLE_DEFEAT:
            battlesLost++;
            break;
          case ActionType.QUEST_COMPLETE:
            questsCompleted++;
            break;
          case ActionType.PLAYER_MESSAGE:
            messagesCount++;
            break;
          case ActionType.TRADE_COMPLETE:
            tradeCount++;
            break;
        }
      }

      // Calculer les heures les plus actives
      const mostActiveHours = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));

      // Calculer les localisations favorites
      const favoriteLocations = Object.entries(locationCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([location]) => location);

      // Calculer les statistiques de session
      const sessionDurations = sessions
        .filter(s => s.duration)
        .map(s => s.duration!);
      
      const averageSessionDuration = sessionDurations.length > 0 ? 
        sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length : 0;

      const longestSession = sessionDurations.length > 0 ? 
        Math.max(...sessionDurations) : 0;

      // Déterminer le pattern d'activité
      const actionsPerDay = actions.length / Math.max(1, (Date.now() - actions[actions.length - 1].timestamp) / (24 * 60 * 60 * 1000));
      
      let activityPattern: 'casual' | 'regular' | 'hardcore' | 'inactive';
      if (actionsPerDay < 10) activityPattern = 'inactive';
      else if (actionsPerDay < 50) activityPattern = 'casual';
      else if (actionsPerDay < 200) activityPattern = 'regular';
      else activityPattern = 'hardcore';

      const summary: PlayerActivitySummary = {
        playerId,
        playerName: actions[0].data.playerName,
        totalActions: actions.length,
        actionsByCategory,
        mostActiveHours,
        favoriteLocations,
        sessionStats: {
          totalSessions: sessions.length,
          averageSessionDuration: Math.round(averageSessionDuration / (60 * 1000)), // en minutes
          longestSession: Math.round(longestSession / (60 * 1000)), // en minutes
          lastSessionDate: sessions[0]?.startTime || 0
        },
        socialStats: {
          messagesCount,
          friendsCount: 0, // TODO: Calculer depuis les actions d'amitié
          tradeCount
        },
        gameplayStats: {
          pokemonCaught,
          battlesWon,
          battlesLost,
          questsCompleted
        },
        activityPattern,
        lastActivity: actions[0].timestamp
      };

      this.setCache(cacheKey, summary);
      return summary;

    } catch (error) {
      console.error(`❌ Erreur génération résumé joueur ${playerId}:`, error);
      return null;
    }
  }

  /**
   * Analyse détaillée d'une session
   */
  async analyzeSession(sessionId: string): Promise<DetailedSessionData | null> {
    const cacheKey = `session_analysis_${sessionId}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Récupérer la session
      const session = await GameSessionModel.findOne({ sessionId }).lean();
      if (!session) return null;

      // Récupérer toutes les actions de la session
      const actions = await this.getPlayerActions(session.playerId, {
        startTime: session.startTime,
        endTime: session.endTime || Date.now(),
        limit: 1000,
        sortOrder: 'asc'
      });

      if (actions.length === 0) return null;

      // Calculer la timeline
      const actionTimeline = actions.map(action => ({
        timestamp: action.timestamp,
        actionType: action.actionType,
        category: action.category,
        location: action.data.location || { map: '', x: 0, y: 0 }
      }));

      // Calculer les métriques de productivité
      let pokemonEncounters = 0;
      let battlesTotal = 0;
      let questProgress = 0;
      let socialInteractions = 0;

      const locationCounts: { [location: string]: number } = {};

      for (const action of actions) {
        if (action.data.location?.map) {
          locationCounts[action.data.location.map] = (locationCounts[action.data.location.map] || 0) + 1;
        }

        switch (action.actionType) {
          case ActionType.POKEMON_ENCOUNTER:
            pokemonEncounters++;
            break;
          case ActionType.BATTLE_START:
            battlesTotal++;
            break;
          case ActionType.QUEST_PROGRESS:
          case ActionType.QUEST_COMPLETE:
            questProgress++;
            break;
          case ActionType.PLAYER_MESSAGE:
          case ActionType.FRIEND_ADD:
          case ActionType.TRADE_INITIATE:
            socialInteractions++;
            break;
        }
      }

      // Calculer les métriques comportementales
      const intervals = [];
      for (let i = 1; i < actions.length; i++) {
        intervals.push(actions[i].timestamp - actions[i-1].timestamp);
      }
      
      const averageActionInterval = intervals.length > 0 ? 
        intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;

      const mostActiveLocation = Object.entries(locationCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

      const uniqueLocations = Object.keys(locationCounts).length;
      const explorationScore = Math.min(1, uniqueLocations / 10); // Normalisé sur 10 zones

      const focusScore = battlesTotal > 0 ? Math.min(1, questProgress / battlesTotal) : 0.5;

      // Déterminer l'humeur de la session
      const positiveActions = actions.filter(a => POSITIVE_ACTIONS.includes(a.actionType)).length;
      const negativeActions = actions.filter(a => FRUSTRATION_INDICATORS.includes(a.actionType)).length;
      
      let mood: 'frustrated' | 'happy' | 'focused' | 'casual' | 'unknown' = 'unknown';
      if (negativeActions > positiveActions * 2) mood = 'frustrated';
      else if (positiveActions > negativeActions * 2) mood = 'happy';
      else if (questProgress > socialInteractions * 2) mood = 'focused';
      else mood = 'casual';

      const analysis: DetailedSessionData = {
        sessionId,
        playerId: session.playerId,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration || (Date.now() - session.startTime),
        actionsCount: actions.length,
        actionTimeline,
        productivity: {
          pokemonEncounters,
          battlesTotal,
          questProgress,
          socialInteractions
        },
        behaviorMetrics: {
          averageActionInterval: Math.round(averageActionInterval),
          mostActiveLocation,
          explorationScore: Math.round(explorationScore * 100) / 100,
          focusScore: Math.round(focusScore * 100) / 100
        },
        mood
      };

      this.setCache(cacheKey, analysis);
      return analysis;

    } catch (error) {
      console.error(`❌ Erreur analyse session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Analyse comportementale complète d'un joueur
   */
  async analyzePlayerBehavior(playerId: string): Promise<PlayerBehaviorAnalysis | null> {
    const cacheKey = `behavior_analysis_${playerId}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Récupérer les données nécessaires
      const [summary, sessions, patterns] = await Promise.all([
        this.generatePlayerSummary(playerId),
        this.getPlayerSessions(playerId, 30),
        this.getPlayerBehaviorPatterns(playerId)
      ]);

      if (!summary || sessions.length === 0) return null;

      // Analyser les patterns temporels
      const sessionsByHour: { [hour: number]: number } = {};
      const sessionDurations = sessions.map(s => s.duration || 0);
      
      for (const session of sessions) {
        const hour = new Date(session.startTime).getHours();
        sessionsByHour[hour] = (sessionsByHour[hour] || 0) + 1;
      }

      const preferredPlaytimes: string[] = [];
      if (sessionsByHour[6] || sessionsByHour[7] || sessionsByHour[8] || sessionsByHour[9] || sessionsByHour[10] || sessionsByHour[11]) preferredPlaytimes.push('morning');
      if (sessionsByHour[12] || sessionsByHour[13] || sessionsByHour[14] || sessionsByHour[15] || sessionsByHour[16] || sessionsByHour[17]) preferredPlaytimes.push('afternoon');
      if (sessionsByHour[18] || sessionsByHour[19] || sessionsByHour[20] || sessionsByHour[21]) preferredPlaytimes.push('evening');
      if (sessionsByHour[22] || sessionsByHour[23] || sessionsByHour[0] || sessionsByHour[1] || sessionsByHour[2] || sessionsByHour[3] || sessionsByHour[4] || sessionsByHour[5]) preferredPlaytimes.push('night');

      const sessionFrequency = sessions.length / Math.max(1, (Date.now() - sessions[sessions.length - 1].startTime) / (7 * 24 * 60 * 60 * 1000));

      // Calculer score de consistance basé sur la régularité des sessions
      const sessionIntervals = [];
      for (let i = 1; i < sessions.length; i++) {
        sessionIntervals.push(sessions[i-1].startTime - sessions[i].startTime);
      }
      const avgInterval = sessionIntervals.reduce((a, b) => a + b, 0) / sessionIntervals.length;
      const intervalVariance = sessionIntervals.reduce((acc, interval) => acc + Math.pow(interval - avgInterval, 2), 0) / sessionIntervals.length;
      const consistencyScore = Math.max(0, 1 - (Math.sqrt(intervalVariance) / avgInterval));

      // Analyser les préférences de gameplay
      const totalActions = Object.values(summary.actionsByCategory).reduce((a, b) => a + b, 0);
      const combatRatio = (summary.actionsByCategory[ActionCategory.COMBAT] || 0) / totalActions;
      const explorationRatio = (summary.actionsByCategory[ActionCategory.EXPLORATION] || 0) / totalActions;
      const socialRatio = (summary.actionsByCategory[ActionCategory.SOCIAL] || 0) / totalActions;
      const pokemonRatio = (summary.actionsByCategory[ActionCategory.POKEMON] || 0) / totalActions;

      let primaryActivity = 'exploration';
      if (combatRatio > 0.3) primaryActivity = 'combat';
      else if (socialRatio > 0.2) primaryActivity = 'social';
      else if (pokemonRatio > 0.3) primaryActivity = 'collection';

      // Déterminer le niveau de skill
      const winRate = summary.gameplayStats.battlesWon / Math.max(1, summary.gameplayStats.battlesWon + summary.gameplayStats.battlesLost);
      const questSuccessRate = summary.gameplayStats.questsCompleted / Math.max(1, totalActions * 0.1);
      
      let skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' = 'beginner';
      if (winRate > 0.8 && questSuccessRate > 0.5) skillLevel = 'expert';
      else if (winRate > 0.6 && questSuccessRate > 0.3) skillLevel = 'advanced';
      else if (winRate > 0.4 && questSuccessRate > 0.2) skillLevel = 'intermediate';

      const analysis: PlayerBehaviorAnalysis = {
        playerId,
        analysisTimestamp: Date.now(),
        temporalPatterns: {
          preferredPlaytimes,
          sessionFrequency: Math.round(sessionFrequency * 100) / 100,
          consistencyScore: Math.round(consistencyScore * 100) / 100
        },
        gameplayPreferences: {
          primaryActivity,
          skillLevel,
          riskTolerance: Math.min(1, combatRatio * 2),
          socialness: Math.min(1, socialRatio * 5)
        },
        psychologicalProfile: {
          frustrationTolerance: 0.5, // TODO: Calculer basé sur patterns de frustration
          achievementOrientation: Math.min(1, summary.gameplayStats.questsCompleted / 50),
          explorationTendency: Math.min(1, explorationRatio * 3),
          compulsiveness: Math.min(1, summary.totalActions / (sessions.length * 100))
        },
        recentTrends: {
          activityChange: 0, // TODO: Comparer dernières semaines
          moodTrend: 0,
          skillProgression: 0,
          socialTrend: 0
        },
        predictions: {
          nextPlaySession: Date.now() + (avgInterval || 24 * 60 * 60 * 1000),
          likelyDuration: Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length / (60 * 1000)),
          churnRisk: summary.activityPattern === 'inactive' ? 0.8 : 0.2,
          helpNeeded: skillLevel === 'beginner' && winRate < 0.3
        }
      };

      this.setCache(cacheKey, analysis);
      return analysis;

    } catch (error) {
      console.error(`❌ Erreur analyse comportementale ${playerId}:`, error);
      return null;
    }
  }

  // ===================================================================
  // 🔍 RECHERCHES SPÉCIALISÉES
  // ===================================================================

  /**
   * Recherche d'actions par critères complexes
   */
  async searchActions(criteria: {
    playerIds?: string[];
    actionTypes?: ActionType[];
    categories?: ActionCategory[];
    timeRange?: { start: number; end: number };
    location?: { map: string; radius?: number; x?: number; y?: number };
    textSearch?: string;
    limit?: number;
  }): Promise<PlayerAction[]> {
    try {
      const query: any = {};

      // Filtres de base
      if (criteria.playerIds) query.playerId = { $in: criteria.playerIds };
      if (criteria.actionTypes) query.actionType = { $in: criteria.actionTypes };
      if (criteria.categories) query.category = { $in: criteria.categories };

      // Filtre temporel
      if (criteria.timeRange) {
        query.timestamp = {
          $gte: criteria.timeRange.start,
          $lte: criteria.timeRange.end
        };
      }

      // Filtre de localisation
      if (criteria.location) {
        query['data.location.map'] = criteria.location.map;
        
        if (criteria.location.radius && criteria.location.x !== undefined && criteria.location.y !== undefined) {
          // Recherche par radius (approximative)
          const radius = criteria.location.radius;
          query['data.location.x'] = { $gte: criteria.location.x - radius, $lte: criteria.location.x + radius };
          query['data.location.y'] = { $gte: criteria.location.y - radius, $lte: criteria.location.y + radius };
        }
      }

      // Recherche textuelle
      if (criteria.textSearch) {
        query.$text = { $search: criteria.textSearch };
      }

      const documents = await PlayerActionModel
        .find(query)
        .sort({ timestamp: -1 })
        .limit(criteria.limit || 100)
        .lean();

      return documents.map(doc => ({
        id: doc._id.toString(),
        playerId: doc.playerId,
        actionType: doc.actionType as ActionType,
        category: doc.category as ActionCategory,
        timestamp: doc.timestamp,
        data: doc.data,
        metadata: doc.metadata
      }));

    } catch (error) {
      console.error('❌ Erreur recherche actions:', error);
      return [];
    }
  }

  /**
   * Trouve les joueurs similaires basé sur les patterns
   */
  async findSimilarPlayers(
    playerId: string, 
    similarity: 'behavior' | 'activity' | 'social' = 'behavior',
    limit: number = 10
  ): Promise<{ playerId: string; similarity: number; reason: string }[]> {
    try {
      const playerSummary = await this.generatePlayerSummary(playerId);
      if (!playerSummary) return [];

      // Récupérer tous les autres joueurs actifs (simplifié pour la démo)
      const recentActions = await PlayerActionModel
        .find({ 
          playerId: { $ne: playerId },
          timestamp: { $gte: Date.now() - 7 * 24 * 60 * 60 * 1000 } // 7 derniers jours
        })
        .distinct('playerId');

      const similarities: { playerId: string; similarity: number; reason: string }[] = [];

      // Comparer avec chaque joueur (version simple)
      for (const otherPlayerId of recentActions.slice(0, 50)) { // Limiter pour performance
        const otherSummary = await this.generatePlayerSummary(otherPlayerId);
        if (!otherSummary) continue;

        let score = 0;
        let reason = '';

        switch (similarity) {
          case 'behavior':
            // Comparer patterns de gameplay
            if (playerSummary.activityPattern === otherSummary.activityPattern) score += 0.3;
            if (Math.abs(playerSummary.sessionStats.averageSessionDuration - otherSummary.sessionStats.averageSessionDuration) < 30) score += 0.2;
            
            // Comparer activités préférées
            const playerPrimary = Object.entries(playerSummary.actionsByCategory).sort(([,a], [,b]) => b - a)[0];
            const otherPrimary = Object.entries(otherSummary.actionsByCategory).sort(([,a], [,b]) => b - a)[0];
            if (playerPrimary[0] === otherPrimary[0]) score += 0.3;
            
            reason = 'Patterns de jeu similaires';
            break;

          case 'activity':
            // Comparer niveau d'activité
            const activityDiff = Math.abs(playerSummary.totalActions - otherSummary.totalActions) / Math.max(playerSummary.totalActions, otherSummary.totalActions);
            score = 1 - activityDiff;
            reason = 'Niveau d\'activité similaire';
            break;

          case 'social':
            // Comparer activité sociale
            const socialDiff = Math.abs(playerSummary.socialStats.messagesCount - otherSummary.socialStats.messagesCount);
            score = Math.max(0, 1 - socialDiff / 100);
            reason = 'Activité sociale similaire';
            break;
        }

        if (score > 0.3) {
          similarities.push({ playerId: otherPlayerId, similarity: score, reason });
        }
      }

      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    } catch (error) {
      console.error(`❌ Erreur recherche joueurs similaires:`, error);
      return [];
    }
  }

  // ===================================================================
  // 🗂️ GESTION DU CACHE
  // ===================================================================

  private getFromCache(key: string): any {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  private setCache(key: string, value: any): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, expiry] of this.cacheExpiry) {
        if (now > expiry) {
          this.cache.delete(key);
          this.cacheExpiry.delete(key);
        }
      }
    }, 60000); // Cleanup chaque minute
  }

  /**
   * Vide le cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    console.log('🧹 Cache PlayerHistoryReader vidé');
  }

  /**
   * Statistiques du cache
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // TODO: Implémenter tracking des hits/miss
    };
  }

  /**
   * Nettoyage à la destruction
   */
  destroy(): void {
    this.clearCache();
    console.log('📖 PlayerHistoryReader détruit');
  }
}

// ===================================================================
// 🏭 SINGLETON ET EXPORTS
// ===================================================================

let readerInstance: PlayerHistoryReader | null = null;

/**
 * Récupère l'instance singleton du reader
 */
export function getPlayerHistoryReader(): PlayerHistoryReader {
  if (!readerInstance) {
    readerInstance = new PlayerHistoryReader();
  }
  return readerInstance;
}

/**
 * Export par défaut
 */
export default PlayerHistoryReader;
