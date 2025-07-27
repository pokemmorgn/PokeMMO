// server/src/Intelligence/Analysis/ActionSummary.ts

/**
 * 📋 ACTION SUMMARY - GÉNÉRATION DE RÉSUMÉS INTELLIGENTS
 * 
 * Génère des résumés automatiques d'activité, insights et rapports.
 * Transforme les données brutes en texte compréhensible.
 * 
 * RÔLE : Créer des résumés naturels pour NPCs et analytics.
 */

import { PlayerHistoryReader, getPlayerHistoryReader } from '../DataCollection/PlayerHistoryReader';
import { BasicStatsCalculator, getBasicStatsCalculator } from './BasicStatsCalculator';
import { 
  ActionType, 
  ActionCategory,
  POSITIVE_ACTIONS,
  FRUSTRATION_INDICATORS
} from '../Core/ActionTypes';

import type { 
  PlayerAction,
  BasicPlayerStats,
  PlayerActivitySummary,
  DetailedSessionData 
} from '../Core/ActionTypes';

// ===================================================================
// 📄 INTERFACES DES RÉSUMÉS
// ===================================================================

/**
 * Résumé textuel d'activité d'un joueur
 */
export interface PlayerActivityReport {
  playerId: string;
  playerName: string;
  reportTimestamp: number;
  
  // Résumé principal
  summary: {
    headline: string; // "Alex is a dedicated trainer who loves battles"
    description: string; // Paragraphe descriptif
    keyInsights: string[]; // Points clés à retenir
  };
  
  // Données analysées
  recentActivity: {
    period: string; // "last 7 days"
    highlights: string[]; // ["Caught 15 Pokémon", "Won 12 battles"]
    concerns: string[]; // ["Lost 5 battles in a row", "Hasn't logged in for 2 days"]
    achievements: string[]; // ["First shiny Pokémon!", "100 battles won"]
  };
  
  // Recommandations
  recommendations: {
    forPlayer: string[]; // Conseils pour le joueur
    forNPCs: string[]; // Instructions pour les NPCs
    urgentActions: string[]; // Actions prioritaires
  };
  
  // Prédictions
  predictions: {
    nextSession: string; // "Likely to play tomorrow evening"
    playerMood: 'frustrated' | 'happy' | 'neutral' | 'excited' | 'bored';
    helpNeeded: boolean;
    churnRisk: 'low' | 'medium' | 'high';
  };
}

/**
 * Résumé de session de jeu
 */
export interface SessionReport {
  sessionId: string;
  playerId: string;
  playerName: string;
  
  // Résumé de session
  summary: {
    duration: string; // "2 hours 15 minutes"
    productivity: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    mood: string; // "Player seemed focused and determined"
    highlights: string[]; // Moments marquants
  };
  
  // Analyse détaillée
  analysis: {
    mainActivities: string[]; // ["Battling trainers", "Exploring new areas"]
    struggles: string[]; // ["Difficulty with Team Rocket"]
    successes: string[]; // ["Caught rare Pokémon"]
    unusualBehavior: string[]; // Comportements atypiques
  };
  
  // Contexte pour NPCs
  npcContext: {
    mood: string; // Pour ajuster les dialogues
    recentEvents: string[]; // Événements à mentionner
    helpTopics: string[]; // Sujets d'aide suggérés
    socialCues: string[]; // Indices sociaux
  };
}

/**
 * Insights automatiques du serveur
 */
export interface ServerInsights {
  timestamp: number;
  period: string; // "Today" ou "This week"
  
  // Tendances principales
  trends: {
    playerActivity: 'increasing' | 'stable' | 'decreasing';
    engagement: 'improving' | 'stable' | 'declining';
    contentUsage: string[]; // Zones/features populaires
    communityHealth: 'excellent' | 'good' | 'concerning' | 'poor';
  };
  
  // Observations
  observations: {
    hotspots: string[]; // Zones d'activité intense
    bottlenecks: string[]; // Points de friction
    successStories: string[]; // Réussites remarquables
    concerningPatterns: string[]; // Patterns inquiétants
  };
  
  // Recommandations système
  systemRecommendations: {
    immediate: string[]; // Actions immédiates
    shortTerm: string[]; // Prochains jours
    longTerm: string[]; // Prochaines semaines
  };
}

// ===================================================================
// 🔥 CLASSE PRINCIPALE - ACTION SUMMARY
// ===================================================================

export class ActionSummary {
  private historyReader: PlayerHistoryReader;
  private statsCalculator: BasicStatsCalculator;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.historyReader = getPlayerHistoryReader();
    this.statsCalculator = getBasicStatsCalculator();
    console.log('📋 ActionSummary initialisé');
  }

  // ===================================================================
  // 👤 RÉSUMÉS JOUEUR
  // ===================================================================

  /**
   * Génère un rapport complet d'activité d'un joueur
   */
  async generatePlayerReport(playerId: string): Promise<PlayerActivityReport | null> {
    const cacheKey = `player_report_${playerId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Récupérer les données nécessaires
      const [stats, summary, recentActions] = await Promise.all([
        this.statsCalculator.calculatePlayerStats(playerId),
        this.historyReader.generatePlayerSummary(playerId),
        this.historyReader.getPlayerActions(playerId, { 
          startTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 derniers jours
          limit: 200 
        })
      ]);

      if (!stats || !summary) return null;

      // Générer le headline
      const headline = this.generateHeadline(stats, summary);
      
      // Générer la description
      const description = this.generateDescription(stats, summary);
      
      // Extraire les insights clés
      const keyInsights = this.extractKeyInsights(stats, recentActions);
      
      // Analyser l'activité récente
      const highlights = this.generateHighlights(recentActions);
      const concerns = this.identifyConcerns(stats, recentActions);
      const achievements = this.identifyAchievements(recentActions);
      
      // Générer les recommandations
      const forPlayer = this.generatePlayerRecommendations(stats, recentActions);
      const forNPCs = this.generateNPCRecommendations(stats, recentActions);
      const urgentActions = this.identifyUrgentActions(stats, recentActions);
      
      // Prédictions
      const nextSession = this.predictNextSession(stats, recentActions);
      const playerMood = this.analyzePlayerMood(recentActions);
      const helpNeeded = stats.health.churnRisk > 0.5 || stats.gameplay.winRate < 0.3;
      const churnRisk = this.assessChurnRisk(stats);

      const report: PlayerActivityReport = {
        playerId,
        playerName: stats.playerName,
        reportTimestamp: Date.now(),
        summary: {
          headline,
          description,
          keyInsights
        },
        recentActivity: {
          period: 'last 7 days',
          highlights,
          concerns,
          achievements
        },
        recommendations: {
          forPlayer,
          forNPCs,
          urgentActions
        },
        predictions: {
          nextSession,
          playerMood,
          helpNeeded,
          churnRisk
        }
      };

      this.setCache(cacheKey, report);
      return report;

    } catch (error) {
      console.error(`❌ Erreur génération rapport ${playerId}:`, error);
      return null;
    }
  }

  /**
   * Génère un résumé de session
   */
  async generateSessionReport(sessionId: string): Promise<SessionReport | null> {
    const cacheKey = `session_report_${sessionId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const sessionData = await this.historyReader.analyzeSession(sessionId);
      if (!sessionData) return null;

      // Formatage de la durée
      const durationMinutes = Math.round(sessionData.duration / (60 * 1000));
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      const durationText = hours > 0 ? 
        `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}` :
        `${minutes} minute${minutes > 1 ? 's' : ''}`;

      // Analyser la productivité
      const productivity = this.assessSessionProductivity(sessionData);
      
      // Générer l'analyse de mood
      const moodText = this.generateMoodText(sessionData.mood);
      
      // Extraire les highlights
      const highlights = this.generateSessionHighlights(sessionData);
      
      // Analyser les activités principales
      const mainActivities = this.analyzeMainActivities(sessionData);
      const struggles = this.identifySessionStruggles(sessionData);
      const successes = this.identifySessionSuccesses(sessionData);
      const unusualBehavior = this.detectUnusualBehavior(sessionData);
      
      // Contexte pour NPCs
      const npcMood = this.translateMoodForNPCs(sessionData.mood);
      const recentEvents = this.extractRecentEvents(sessionData);
      const helpTopics = this.suggestHelpTopics(sessionData);
      const socialCues = this.generateSocialCues(sessionData);

      const report: SessionReport = {
        sessionId,
        playerId: sessionData.playerId,
        playerName: sessionData.playerId, // TODO: récupérer le vrai nom
        summary: {
          duration: durationText,
          productivity,
          mood: moodText,
          highlights
        },
        analysis: {
          mainActivities,
          struggles,
          successes,
          unusualBehavior
        },
        npcContext: {
          mood: npcMood,
          recentEvents,
          helpTopics,
          socialCues
        }
      };

      this.setCache(cacheKey, report);
      return report;

    } catch (error) {
      console.error(`❌ Erreur rapport session ${sessionId}:`, error);
      return null;
    }
  }

  // ===================================================================
  // 🌍 INSIGHTS SERVEUR
  // ===================================================================

  /**
   * Génère des insights automatiques du serveur
   */
  async generateServerInsights(period: 'today' | 'week' = 'today'): Promise<ServerInsights | null> {
    const cacheKey = `server_insights_${period}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const timeRange = period === 'today' ? 
        { start: Date.now() - 24 * 60 * 60 * 1000, end: Date.now() } :
        { start: Date.now() - 7 * 24 * 60 * 60 * 1000, end: Date.now() };

      // Récupérer les données du serveur
      const [globalStats, recentActions] = await Promise.all([
        this.statsCalculator.calculateGlobalStats(),
        this.historyReader.searchActions({ timeRange, limit: 5000 })
      ]);

      if (!globalStats) return null;

      // Analyser les tendances
      const playerActivity = this.analyzeTrend('activity', globalStats, period);
      const engagement = this.analyzeTrend('engagement', globalStats, period);
      const contentUsage = this.analyzeContentUsage(recentActions);
      const communityHealth = this.assessCommunityHealth(globalStats, recentActions);

      // Générer les observations
      const hotspots = this.identifyHotspots(recentActions);
      const bottlenecks = this.identifyBottlenecks(recentActions);
      const successStories = this.identifySuccessStories(recentActions);
      const concerningPatterns = this.identifyConcerningPatterns(recentActions);

      // Recommandations système
      const immediate = this.generateImmediateRecommendations(globalStats, recentActions);
      const shortTerm = this.generateShortTermRecommendations(globalStats);
      const longTerm = this.generateLongTermRecommendations(globalStats);

      const insights: ServerInsights = {
        timestamp: Date.now(),
        period: period === 'today' ? 'Today' : 'This week',
        trends: {
          playerActivity,
          engagement,
          contentUsage,
          communityHealth
        },
        observations: {
          hotspots,
          bottlenecks,
          successStories,
          concerningPatterns
        },
        systemRecommendations: {
          immediate,
          shortTerm,
          longTerm
        }
      };

      this.setCache(cacheKey, insights, 30 * 60 * 1000); // Cache 30 minutes
      return insights;

    } catch (error) {
      console.error('❌ Erreur insights serveur:', error);
      return null;
    }
  }

  // ===================================================================
  // 🧠 MÉTHODES DE GÉNÉRATION DE TEXTE
  // ===================================================================

  private generateHeadline(stats: BasicPlayerStats, summary: PlayerActivitySummary): string {
    const { activityPattern } = summary;
    const { skillLevel } = stats.health.skillProgression > 0.7 ? { skillLevel: 'expert' } : 
                         stats.health.skillProgression > 0.5 ? { skillLevel: 'advanced' } :
                         stats.health.skillProgression > 0.3 ? { skillLevel: 'intermediate' } :
                         { skillLevel: 'beginner' };

    const primaryActivity = Object.entries(summary.actionsByCategory)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'exploration';

    const adjectives = {
      hardcore: ['dedicated', 'passionate', 'intense'],
      regular: ['committed', 'active', 'engaged'],
      casual: ['relaxed', 'casual', 'easygoing'],
      inactive: ['quiet', 'absent', 'taking a break']
    };

    const activities = {
      [ActionCategory.COMBAT]: 'battles',
      [ActionCategory.POKEMON]: 'collecting Pokémon',
      [ActionCategory.EXPLORATION]: 'exploring',
      [ActionCategory.SOCIAL]: 'socializing',
      [ActionCategory.QUEST]: 'completing quests'
    };

    const adjective = adjectives[activityPattern][Math.floor(Math.random() * adjectives[activityPattern].length)];
    const activity = activities[primaryActivity as ActionCategory] || 'playing';

    if (stats.health.churnRisk > 0.7) {
      return `${stats.playerName} seems to be losing interest and might need encouragement`;
    }
    
    if (stats.health.frustrationLevel > 0.6) {
      return `${stats.playerName} is struggling and could use some help`;
    }

    return `${stats.playerName} is a ${adjective} trainer who loves ${activity}`;
  }

  private generateDescription(stats: BasicPlayerStats, summary: PlayerActivitySummary): string {
    const parts = [];

    // Niveau d'activité
    if (stats.activity.daysSinceLastActivity < 1) {
      parts.push("Very active today");
    } else if (stats.activity.daysSinceLastActivity < 3) {
      parts.push("Regularly active");
    } else {
      parts.push("Not very active recently");
    }

    // Performance
    if (stats.gameplay.winRate > 0.7) {
      parts.push("excellent at battles");
    } else if (stats.gameplay.winRate > 0.5) {
      parts.push("decent battle skills");
    } else {
      parts.push("struggling with battles");
    }

    // Social
    if (stats.social.socialScore > 0.6) {
      parts.push("enjoys interacting with other players");
    } else if (stats.social.socialScore > 0.3) {
      parts.push("occasionally social");
    } else {
      parts.push("prefers playing solo");
    }

    // Tendance récente
    if (stats.health.churnRisk > 0.5) {
      parts.push("but showing signs of disengagement");
    } else if (stats.health.engagementLevel > 0.7) {
      parts.push("and highly engaged with the game");
    }

    return parts.join(', ') + '.';
  }

  private extractKeyInsights(stats: BasicPlayerStats, actions: PlayerAction[]): string[] {
    const insights = [];

    if (stats.health.frustrationLevel > 0.6) {
      insights.push("Player is experiencing frustration - needs help");
    }

    if (stats.gameplay.winRate < 0.3 && stats.gameplay.battlesWon + stats.gameplay.battlesLost > 10) {
      insights.push("Low win rate indicates need for battle strategy guidance");
    }

    if (stats.social.socialScore < 0.2 && stats.activity.totalActions > 100) {
      insights.push("Very antisocial player - might benefit from social encouragement");
    }

    if (stats.activity.daysSinceLastActivity > 7) {
      insights.push("Player is at risk of churning - immediate intervention needed");
    }

    if (stats.health.engagementLevel > 0.8) {
      insights.push("Highly engaged player - good candidate for advanced content");
    }

    return insights;
  }

  private generateHighlights(actions: PlayerAction[]): string[] {
    const highlights = [];
    
    const pokemonCaught = actions.filter(a => a.actionType === ActionType.POKEMON_CAPTURE_SUCCESS).length;
    if (pokemonCaught > 0) highlights.push(`Caught ${pokemonCaught} Pokémon`);

    const battlesWon = actions.filter(a => a.actionType === ActionType.BATTLE_VICTORY).length;
    if (battlesWon > 0) highlights.push(`Won ${battlesWon} battles`);

    const questsCompleted = actions.filter(a => a.actionType === ActionType.QUEST_COMPLETE).length;
    if (questsCompleted > 0) highlights.push(`Completed ${questsCompleted} quests`);

    const uniqueLocations = new Set(actions.map(a => a.data.location?.map).filter(Boolean)).size;
    if (uniqueLocations > 3) highlights.push(`Explored ${uniqueLocations} different areas`);

    return highlights;
  }

  private identifyConcerns(stats: BasicPlayerStats, actions: PlayerAction[]): string[] {
    const concerns = [];

    const recentFrustrations = actions.filter(a => FRUSTRATION_INDICATORS.includes(a.actionType)).length;
    if (recentFrustrations > 5) {
      concerns.push(`${recentFrustrations} frustrating events this week`);
    }

    if (stats.activity.daysSinceLastActivity > 2) {
      concerns.push(`Hasn't played for ${Math.round(stats.activity.daysSinceLastActivity)} days`);
    }

    const consecutiveFailures = this.findConsecutiveFailures(actions);
    if (consecutiveFailures > 3) {
      concerns.push(`${consecutiveFailures} consecutive failures detected`);
    }

    return concerns;
  }

  private identifyAchievements(actions: PlayerAction[]): string[] {
    const achievements = [];

    // Chercher des événements rares ou notables
    const shinyPokemon = actions.filter(a => 
      a.actionType === ActionType.POKEMON_CAPTURE_SUCCESS && 
      (a.data as any).pokemon?.isShiny
    ).length;
    
    if (shinyPokemon > 0) achievements.push(`Caught ${shinyPokemon} shiny Pokémon!`);

    const perfectWins = actions.filter(a => 
      a.actionType === ActionType.BATTLE_VICTORY && 
      (a.data as any).turnsCount && (a.data as any).turnsCount <= 3
    ).length;
    
    if (perfectWins > 0) achievements.push(`${perfectWins} quick battle victories`);

    return achievements;
  }

  private findConsecutiveFailures(actions: PlayerAction[]): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const action of actions) {
      if (FRUSTRATION_INDICATORS.includes(action.actionType)) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else if (POSITIVE_ACTIONS.includes(action.actionType)) {
        currentConsecutive = 0;
      }
    }

    return maxConsecutive;
  }

  // ===================================================================
  // 🎯 MÉTHODES DE RECOMMANDATIONS
  // ===================================================================

  private generatePlayerRecommendations(stats: BasicPlayerStats, actions: PlayerAction[]): string[] {
    const recommendations = [];

    if (stats.gameplay.winRate < 0.4) {
      recommendations.push("Try training with weaker opponents first");
      recommendations.push("Visit the Pokémon Center to heal your team");
    }

    if (stats.social.socialScore < 0.3) {
      recommendations.push("Try chatting with other players");
      recommendations.push("Join group activities when available");
    }

    if (stats.activity.actionsThisWeek < 20) {
      recommendations.push("Try setting daily play goals");
      recommendations.push("Explore new areas for fresh content");
    }

    return recommendations;
  }

  private generateNPCRecommendations(stats: BasicPlayerStats, actions: PlayerAction[]): string[] {
    const recommendations = [];

    if (stats.health.frustrationLevel > 0.6) {
      recommendations.push("NPCs should offer help proactively");
      recommendations.push("Use encouraging dialogue");
      recommendations.push("Suggest easier activities");
    }

    if (stats.health.churnRisk > 0.5) {
      recommendations.push("NPCs should be extra friendly");
      recommendations.push("Offer special rewards or bonuses");
      recommendations.push("Guide toward engaging content");
    }

    if (stats.gameplay.winRate > 0.8) {
      recommendations.push("NPCs can offer advanced challenges");
      recommendations.push("Suggest competitive content");
    }

    return recommendations;
  }

  private identifyUrgentActions(stats: BasicPlayerStats, actions: PlayerAction[]): string[] {
    const urgent = [];

    if (stats.health.churnRisk > 0.7) {
      urgent.push("URGENT: Player at high churn risk");
    }

    if (stats.health.frustrationLevel > 0.8) {
      urgent.push("URGENT: Player highly frustrated");
    }

    const recentErrors = actions.filter(a => a.actionType === ActionType.ERROR_OCCURRED).length;
    if (recentErrors > 3) {
      urgent.push("URGENT: Multiple errors detected");
    }

    return urgent;
  }

  // ===================================================================
  // 🔮 MÉTHODES DE PRÉDICTION
  // ===================================================================

  private predictNextSession(stats: BasicPlayerStats, actions: PlayerAction[]): string {
    if (stats.activity.daysSinceLastActivity > 7) {
      return "Unlikely to return soon without intervention";
    }

    if (stats.activity.daysSinceLastActivity < 1) {
      return "Likely to play again today";
    }

    if (stats.activity.daysSinceLastActivity < 3) {
      return "Likely to play within the next few days";
    }

    return "May play sometime this week";
  }

  private analyzePlayerMood(actions: PlayerAction[]): 'frustrated' | 'happy' | 'neutral' | 'excited' | 'bored' {
    const positiveCount = actions.filter(a => POSITIVE_ACTIONS.includes(a.actionType)).length;
    const negativeCount = actions.filter(a => FRUSTRATION_INDICATORS.includes(a.actionType)).length;

    if (negativeCount > positiveCount * 2) return 'frustrated';
    if (positiveCount > negativeCount * 2) return 'happy';
    if (actions.length < 5) return 'bored';
    if (positiveCount > 10) return 'excited';
    
    return 'neutral';
  }

  private assessChurnRisk(stats: BasicPlayerStats): 'low' | 'medium' | 'high' {
    if (stats.health.churnRisk > 0.7) return 'high';
    if (stats.health.churnRisk > 0.4) return 'medium';
    return 'low';
  }

  // ===================================================================
  // 📊 MÉTHODES D'ANALYSE DE SESSION
  // ===================================================================

  private assessSessionProductivity(session: DetailedSessionData): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
    const totalActivity = session.productivity.pokemonEncounters + 
                         session.productivity.battlesTotal + 
                         session.productivity.questProgress;
    
    const durationHours = session.duration / (60 * 60 * 1000);
    const productivity = totalActivity / Math.max(durationHours, 0.5);

    if (productivity < 5) return 'very_low';
    if (productivity < 15) return 'low';
    if (productivity < 30) return 'medium';
    if (productivity < 50) return 'high';
    return 'very_high';
  }

  private generateMoodText(mood: string): string {
    const moodTexts = {
      frustrated: "Player seemed frustrated and struggling",
      happy: "Player appeared happy and successful",
      focused: "Player was focused and determined",
      casual: "Player had a relaxed, casual session",
      unknown: "Player's mood was neutral"
    };
    
    return moodTexts[mood as keyof typeof moodTexts] || moodTexts.unknown;
  }

  // Autres méthodes simplifiées pour éviter un fichier trop long...
  private generateSessionHighlights(session: DetailedSessionData): string[] {
    return [`${session.actionsCount} total actions`, `Visited ${session.behaviorMetrics.mostActiveLocation}`];
  }

  private analyzeMainActivities(session: DetailedSessionData): string[] {
    const activities = [];
    if (session.productivity.battlesTotal > 5) activities.push("Intensive battling");
    if (session.productivity.pokemonEncounters > 10) activities.push("Pokemon hunting");
    if (session.productivity.questProgress > 3) activities.push("Quest completion");
    return activities;
  }

  private identifySessionStruggles(session: DetailedSessionData): string[] {
    if (session.mood === 'frustrated') return ["Player seemed to struggle with challenges"];
    return [];
  }

  private identifySessionSuccesses(session: DetailedSessionData): string[] {
    if (session.mood === 'happy') return ["Player achieved their goals"];
    return [];
  }

  private detectUnusualBehavior(session: DetailedSessionData): string[] {
    const unusual = [];
    if (session.behaviorMetrics.averageActionInterval < 1000) {
      unusual.push("Unusually rapid actions detected");
    }
    return unusual;
  }

  private translateMoodForNPCs(mood: string): string {
    const npcMoods = {
      frustrated: "Be extra helpful and encouraging",
      happy: "Share in their excitement",
      focused: "Respect their concentration",
      casual: "Be friendly and relaxed"
    };
    
    return npcMoods[mood as keyof typeof npcMoods] || "Be neutral and helpful";
  }

  private extractRecentEvents(session: DetailedSessionData): string[] {
    return ["Recent session completed"]; // Simplifié
  }

  private suggestHelpTopics(session: DetailedSessionData): string[] {
    if (session.mood === 'frustrated') return ["Battle strategies", "Pokemon care"];
    return [];
  }

  private generateSocialCues(session: DetailedSessionData): string[] {
    if (session.productivity.socialInteractions > 5) return ["Player is social today"];
    return ["Player prefers solo play"];
  }

  // Méthodes d'analyse serveur simplifiées
  private analyzeTrend(type: string, stats: any, period: string): 'increasing' | 'stable' | 'decreasing' {
    return 'stable'; // TODO: Implémenter vraie comparaison temporelle
  }

  private analyzeContentUsage(actions: PlayerAction[]): string[] {
    const locations = new Map<string, number>();
    for (const action of actions) {
      const map = action.data.location?.map;
      if (map) locations.set(map, (locations.get(map) || 0) + 1);
    }
    
    return Array.from(locations.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([location]) => location);
  }

  private assessCommunityHealth(stats: any, actions: PlayerAction[]): 'excellent' | 'good' | 'concerning' | 'poor' {
    const socialActions = actions.filter(a => a.category === ActionCategory.SOCIAL).length;
    const socialRatio = socialActions / Math.max(actions.length, 1);
    
    if (socialRatio > 0.3) return 'excellent';
    if (socialRatio > 0.2) return 'good';
    if (socialRatio > 0.1) return 'concerning';
    return 'poor';
  }

  private identifyHotspots(actions: PlayerAction[]): string[] {
    return this.analyzeContentUsage(actions);
  }

  private identifyBottlenecks(actions: PlayerAction[]): string[] {
    const frustrations = actions.filter(a => FRUSTRATION_INDICATORS.includes(a.actionType));
    if (frustrations.length > actions.length * 0.2) {
      return ["High frustration rate detected"];
    }
    return [];
  }

  private identifySuccessStories(actions: PlayerAction[]): string[] {
    const successes = actions.filter(a => POSITIVE_ACTIONS.includes(a.actionType));
    if (successes.length > 100) {
      return ["Many player successes this period"];
    }
    return [];
  }

  private identifyConcerningPatterns(actions: PlayerAction[]): string[] {
    const errors = actions.filter(a => a.actionType === ActionType.ERROR_OCCURRED).length;
    if (errors > 10) {
      return ["High error rate detected"];
    }
    return [];
  }

  private generateImmediateRecommendations(stats: any, actions: PlayerAction[]): string[] {
    const recs = [];
    const errors = actions.filter(a => a.actionType === ActionType.ERROR_OCCURRED).length;
    if (errors > 20) recs.push("Investigate technical issues");
    return recs;
  }

  private generateShortTermRecommendations(stats: any): string[] {
    return ["Monitor player engagement trends"];
  }

  private generateLongTermRecommendations(stats: any): string[] {
    return ["Plan community events to boost engagement"];
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
    console.log('🧹 Cache ActionSummary vidé');
  }

  /**
   * Nettoyage à la destruction
   */
  destroy(): void {
    this.clearCache();
    console.log('📋 ActionSummary détruit');
  }
}

// ===================================================================
// 🏭 SINGLETON ET EXPORTS
// ===================================================================

let summaryInstance: ActionSummary | null = null;

/**
 * Récupère l'instance singleton du summary
 */
export function getActionSummary(): ActionSummary {
  if (!summaryInstance) {
    summaryInstance = new ActionSummary();
  }
  return summaryInstance;
}

/**
 * Export par défaut
 */
export default ActionSummary;
