// server/src/Intelligence/Analysis/PlayerBehaviorAnalyzer.ts

/**
 * 🧠 PLAYER BEHAVIOR ANALYZER - ANALYSE COMPORTEMENTALE AVANCÉE
 * 
 * Crée des profils psychologiques complets des joueurs en analysant :
 * - Personnalité (tolérance frustration, socialité, exploration, compétitivité)
 * - État actuel (humeur, besoins, patterns récents)
 * - Prédictions comportementales (prochaine action, besoins sociaux)
 * - Intégration avec SimplePatternMatcher pour données temps réel
 * 
 * UTILISE : SimplePatternMatcher + historique + tendances temporelles
 */

import { SimplePatternMatcher, getSimplePatternMatcher } from './SimplePatternMatcher';
import type { DetectedPattern } from './SimplePatternMatcher';
import { PlayerHistoryReader, getPlayerHistoryReader } from '../DataCollection/PlayerHistoryReader';
import type { PlayerActivitySummary, PlayerBehaviorAnalysis } from '../DataCollection/PlayerHistoryReader';
import { BasicStatsCalculator, getBasicStatsCalculator } from './BasicStatsCalculator';
import type { BasicPlayerStats } from './BasicStatsCalculator';
import { 
  ActionType, 
  ActionCategory,
  POSITIVE_ACTIONS,
  FRUSTRATION_INDICATORS
} from '../Core/ActionTypes';
import type { PlayerAction } from '../Core/ActionTypes';

// ===================================================================
// 🧠 INTERFACES DU PROFIL COMPORTEMENTAL
// ===================================================================

/**
 * Profil comportemental complet d'un joueur
 */
export interface BehaviorProfile {
  playerId: string;
  
  // Profil de personnalité (traits stables)
  personality: {
    frustrationTolerance: number; // 0-1 : tolérance aux échecs
    socialness: number; // 0-1 : tendance à interagir socialement
    explorationTendency: number; // 0-1 : goût pour l'exploration
    competitiveness: number; // 0-1 : orientation compétitive
    patience: number; // 0-1 : patience dans les tâches longues
    riskTaking: number; // 0-1 : propension à prendre des risques
  };
  
  // État actuel (change rapidement)
  currentState: {
    mood: 'happy' | 'frustrated' | 'neutral' | 'excited' | 'bored';
    needsHelp: boolean;
    energyLevel: number; // 0-1 : niveau d'énergie/activité
    focusLevel: number; // 0-1 : niveau de concentration
    recentPatterns: DetectedPattern[]; // Patterns détectés récemment
    lastAnalysisTime: number;
  };
  
  // Prédictions comportementales
  predictions: {
    nextAction: string; // Type d'action probable
    nextActionConfidence: number; // 0-1 confiance dans la prédiction
    nextActionTime: number; // Timestamp estimé
    helpTopics: string[]; // Sujets d'aide suggérés
    socialNeeds: boolean; // Besoin d'interaction sociale
    sessionDuration: number; // Durée estimée de session en minutes
    churnRisk: number; // 0-1 risque d'abandon
  };
  
  // Métadonnées
  analysisTimestamp: number;
  confidence: number; // 0-1 confiance globale dans l'analyse
  sampleSize: number; // Nombre d'actions analysées
}

/**
 * Tendances comportementales temporelles
 */
export interface BehavioralTrends {
  playerId: string;
  
  // Évolution des métriques dans le temps
  trends: {
    activityTrend: number; // -1 à 1 (décroissant à croissant)
    moodTrend: number; // -1 à 1 (se dégrade à s'améliore)
    socialTrend: number; // -1 à 1 (moins social à plus social)
    skillTrend: number; // -1 à 1 (régression à progression)
    frustrationTrend: number; // -1 à 1 (plus patient à plus frustré)
  };
  
  // Prédictions de changements
  predictedChanges: {
    personalityShifts: { trait: string; direction: number; confidence: number }[];
    behaviorChanges: { behavior: string; likelihood: number }[];
    interventionNeeds: string[]; // Actions recommandées
  };
  
  // Période d'analyse
  analysisWindow: {
    startTime: number;
    endTime: number;
    sampleActions: number;
  };
}

/**
 * Configuration de l'analyser
 */
export interface BehaviorAnalyzerConfig {
  // Fenêtres d'analyse
  shortTermWindow: number; // Heures pour analyse court terme
  longTermWindow: number; // Jours pour analyse long terme
  minActionsRequired: number; // Actions min pour analyse fiable
  
  // Poids des facteurs dans l'analyse
  weights: {
    recentActions: number; // Poids actions récentes
    historicalPatterns: number; // Poids patterns historiques
    sessionBehavior: number; // Poids comportement en session
    socialInteractions: number; // Poids interactions sociales
  };
  
  // Cache et performance
  cacheProfileMinutes: number;
  maxAnalysisDepth: number; // Max actions à analyser
}

// ===================================================================
// 🔥 CLASSE PRINCIPALE - PLAYER BEHAVIOR ANALYZER
// ===================================================================

export class PlayerBehaviorAnalyzer {
  private patternMatcher: SimplePatternMatcher;
  private historyReader: PlayerHistoryReader;
  private statsCalculator: BasicStatsCalculator;
  private config: BehaviorAnalyzerConfig;
  
  // Cache des profils
  private behaviorProfiles: Map<string, BehaviorProfile> = new Map();
  private profileExpiry: Map<string, number> = new Map();
  
  // Cache des tendances
  private behavioralTrends: Map<string, BehavioralTrends> = new Map();
  private trendsExpiry: Map<string, number> = new Map();
  
  // Statistiques de performance
  private stats = {
    profilesGenerated: 0,
    averageAnalysisTime: 0,
    cacheHits: 0,
    predictionAccuracy: 0 // TODO: Implémenter suivi prédictions
  };

  constructor(config?: Partial<BehaviorAnalyzerConfig>) {
    this.patternMatcher = getSimplePatternMatcher();
    this.historyReader = getPlayerHistoryReader();
    this.statsCalculator = getBasicStatsCalculator();
    
    this.config = {
      shortTermWindow: 6, // 6 heures
      longTermWindow: 14, // 14 jours
      minActionsRequired: 20,
      weights: {
        recentActions: 0.4,
        historicalPatterns: 0.3,
        sessionBehavior: 0.2,
        socialInteractions: 0.1
      },
      cacheProfileMinutes: 10,
      maxAnalysisDepth: 200,
      ...config
    };

    console.log('🧠 PlayerBehaviorAnalyzer initialisé', this.config);
    this.startMaintenanceTasks();
  }

  // ===================================================================
  // 🎯 MÉTHODES PRINCIPALES D'ANALYSE
  // ===================================================================

  /**
   * Génère un profil comportemental complet
   */
  async generateBehaviorProfile(playerId: string): Promise<BehaviorProfile | null> {
    const startTime = Date.now();
    
    try {
      // Vérifier le cache
      const cached = this.getCachedProfile(playerId);
      if (cached) {
        this.stats.cacheHits++;
        return cached;
      }

      // Récupérer les données nécessaires
      const [playerStats, summary, patterns, recentActions] = await Promise.all([
        this.statsCalculator.calculatePlayerStats(playerId),
        this.historyReader.generatePlayerSummary(playerId),
        this.patternMatcher.analyzePlayerPatterns(playerId),
        this.getRecentActionsForAnalysis(playerId)
      ]);

      if (!playerStats || !summary || recentActions.length < this.config.minActionsRequired) {
        console.warn(`⚠️ Données insuffisantes pour analyser ${playerId}`);
        return null;
      }

      // Analyser la personnalité (traits stables)
      const personality = await this.analyzePersonality(playerStats, summary, recentActions);
      
      // Analyser l'état actuel
      const currentState = await this.analyzeCurrentState(patterns, recentActions, playerStats);
      
      // Générer les prédictions
      const predictions = await this.generatePredictions(personality, currentState, summary, recentActions);
      
      // Calculer la confiance globale
      const confidence = this.calculateAnalysisConfidence(recentActions.length, patterns.length, summary);

      const profile: BehaviorProfile = {
        playerId,
        personality,
        currentState,
        predictions,
        analysisTimestamp: Date.now(),
        confidence,
        sampleSize: recentActions.length
      };

      // Mettre en cache
      this.cacheProfile(playerId, profile);
      
      // Mettre à jour les stats
      this.updateStats(Date.now() - startTime);
      
      console.log(`🧠 Profil généré pour ${playerId} (confiance: ${(confidence * 100).toFixed(1)}%)`);
      return profile;

    } catch (error) {
      console.error(`❌ Erreur génération profil ${playerId}:`, error);
      return null;
    }
  }

  /**
   * Analyse les tendances comportementales
   */
  async analyzeBehavioralTrends(playerId: string): Promise<BehavioralTrends | null> {
    try {
      // Vérifier le cache
      const cached = this.getCachedTrends(playerId);
      if (cached) return cached;

      // Récupérer les données sur plusieurs périodes
      const now = Date.now();
      const periods = [
        { start: now - 24 * 60 * 60 * 1000, end: now, label: 'recent' }, // 24h
        { start: now - 7 * 24 * 60 * 60 * 1000, end: now - 24 * 60 * 60 * 1000, label: 'week' }, // 7 jours avant
        { start: now - 14 * 24 * 60 * 60 * 1000, end: now - 7 * 24 * 60 * 60 * 1000, label: 'twoweeks' } // 14 jours avant
      ];

      const periodData = await Promise.all(
        periods.map(async period => ({
          ...period,
          actions: await this.historyReader.getPlayerActions(playerId, {
            startTime: period.start,
            endTime: period.end,
            limit: 100
          })
        }))
      );

      // Calculer les métriques pour chaque période
      const periodMetrics = periodData.map(data => ({
        label: data.label,
        activityLevel: data.actions.length,
        positiveMood: data.actions.filter(a => POSITIVE_ACTIONS.includes(a.actionType)).length / Math.max(1, data.actions.length),
        socialActivity: data.actions.filter(a => a.category === ActionCategory.SOCIAL).length,
        skillIndicators: this.calculateSkillIndicators(data.actions),
        frustrationLevel: data.actions.filter(a => FRUSTRATION_INDICATORS.includes(a.actionType)).length / Math.max(1, data.actions.length)
      }));

      // Calculer les tendances
      const trends = {
        activityTrend: this.calculateTrend(periodMetrics.map(p => p.activityLevel)),
        moodTrend: this.calculateTrend(periodMetrics.map(p => p.positiveMood)),
        socialTrend: this.calculateTrend(periodMetrics.map(p => p.socialActivity)),
        skillTrend: this.calculateTrend(periodMetrics.map(p => p.skillIndicators)),
        frustrationTrend: this.calculateTrend(periodMetrics.map(p => p.frustrationLevel))
      };

      // Prédire les changements
      const predictedChanges = this.predictBehaviorChanges(trends, periodMetrics);

      const behavioralTrends: BehavioralTrends = {
        playerId,
        trends,
        predictedChanges,
        analysisWindow: {
          startTime: periods[2].start,
          endTime: periods[0].end,
          sampleActions: periodData.reduce((sum, p) => sum + p.actions.length, 0)
        }
      };

      // Mettre en cache
      this.cacheTrends(playerId, behavioralTrends);
      
      return behavioralTrends;

    } catch (error) {
      console.error(`❌ Erreur analyse tendances ${playerId}:`, error);
      return null;
    }
  }

  // ===================================================================
  // 🧩 ANALYSE DE LA PERSONNALITÉ
  // ===================================================================

  /**
   * Analyse les traits de personnalité stables
   */
  private async analyzePersonality(
    stats: BasicPlayerStats,
    summary: PlayerActivitySummary,
    actions: PlayerAction[]
  ): Promise<BehaviorProfile['personality']> {
    
    // Analyser la tolérance à la frustration
    const frustrationTolerance = this.calculateFrustrationTolerance(actions, stats);
    
    // Analyser la socialité
    const socialness = this.calculateSocialness(stats, summary, actions);
    
    // Analyser la tendance à l'exploration
    const explorationTendency = this.calculateExplorationTendency(summary, actions);
    
    // Analyser la compétitivité
    const competitiveness = this.calculateCompetitiveness(actions, stats);
    
    // Analyser la patience
    const patience = this.calculatePatience(actions);
    
    // Analyser la prise de risque
    const riskTaking = this.calculateRiskTaking(actions);

    return {
      frustrationTolerance,
      socialness,
      explorationTendency,
      competitiveness,
      patience,
      riskTaking
    };
  }

  /**
   * Calcule la tolérance à la frustration
   */
  private calculateFrustrationTolerance(actions: PlayerAction[], stats: BasicPlayerStats): number {
    // Analyser comment le joueur réagit aux échecs
    const frustrationActions = actions.filter(a => FRUSTRATION_INDICATORS.includes(a.actionType));
    const totalActions = actions.length;
    
    if (frustrationActions.length === 0) return 0.8; // Pas d'échecs = tolérance élevée
    
    // Calculer les patterns de réaction aux échecs
    let recoveryQuickness = 0;
    let persistenceAfterFailure = 0;
    
    for (let i = 0; i < frustrationActions.length; i++) {
      const failureIndex = actions.findIndex(a => a.id === frustrationActions[i].id);
      if (failureIndex === -1) continue;
      
      // Chercher la prochaine action positive
      const nextPositive = actions.slice(0, failureIndex).find(a => POSITIVE_ACTIONS.includes(a.actionType));
      
      if (nextPositive) {
        const timeDiff = nextPositive.timestamp - frustrationActions[i].timestamp;
        if (timeDiff < 5 * 60 * 1000) { // Récupération en moins de 5 minutes
          recoveryQuickness++;
        }
      }
      
      // Vérifier s'il continue après l'échec
      const nextActions = actions.slice(Math.max(0, failureIndex - 3), failureIndex);
      if (nextActions.length > 0) {
        persistenceAfterFailure++;
      }
    }
    
    const recoveryRate = recoveryQuickness / frustrationActions.length;
    const persistenceRate = persistenceAfterFailure / frustrationActions.length;
    
    // Tolérance basée sur capacité de récupération et persistance
    return Math.min(1, (recoveryRate * 0.6 + persistenceRate * 0.4 + (1 - stats.health.frustrationLevel) * 0.5) / 1.5);
  }

  /**
   * Calcule le niveau de socialité
   */
  private calculateSocialness(stats: BasicPlayerStats, summary: PlayerActivitySummary, actions: PlayerAction[]): number {
    const socialWeight = 0.4;
    const frequencyWeight = 0.3;
    const varietyWeight = 0.3;
    
    // Score basé sur le ratio d'actions sociales
    const socialScore = stats.social.socialScore;
    
    // Score basé sur la fréquence des interactions
    const socialActions = actions.filter(a => a.category === ActionCategory.SOCIAL);
    const frequencyScore = Math.min(1, socialActions.length / 20); // Normalisé sur 20 actions sociales
    
    // Score basé sur la variété des interactions sociales
    const socialTypes = new Set(socialActions.map(a => a.actionType));
    const varietyScore = Math.min(1, socialTypes.size / 5); // Normalisé sur 5 types différents
    
    return socialWeight * socialScore + frequencyWeight * frequencyScore + varietyWeight * varietyScore;
  }

  /**
   * Calcule la tendance à l'exploration
   */
  private calculateExplorationTendency(summary: PlayerActivitySummary, actions: PlayerAction[]): number {
    // Analyser la diversité des localisations
    const locationDiversity = summary.favoriteLocations.length / 10; // Normalisé sur 10 zones
    
    // Analyser les actions d'exploration
    const explorationActions = actions.filter(a => a.category === ActionCategory.EXPLORATION);
    const explorationRatio = explorationActions.length / actions.length;
    
    // Analyser les nouveaux lieux découverts
    const discoveryActions = actions.filter(a => a.actionType === ActionType.ZONE_DISCOVER);
    const discoveryScore = Math.min(1, discoveryActions.length / 5);
    
    return Math.min(1, (locationDiversity * 0.4 + explorationRatio * 0.4 + discoveryScore * 0.2));
  }

  /**
   * Calcule la compétitivité
   */
  private calculateCompetitiveness(actions: PlayerAction[], stats: BasicPlayerStats): number {
    // Analyser l'engagement dans les combats
    const combatActions = actions.filter(a => a.category === ActionCategory.COMBAT);
    const combatRatio = combatActions.length / actions.length;
    
    // Analyser la recherche de défis
    const challengingBattles = combatActions.filter(a => {
      const data = a.data as any;
      return data.battleType === 'trainer' || data.battleType === 'gym';
    });
    
    const challengeSeekingScore = combatActions.length > 0 ? challengingBattles.length / combatActions.length : 0;
    
    // Analyser la persistance dans les combats difficiles
    const winRate = stats.gameplay.winRate;
    const persistenceScore = winRate < 0.5 && combatRatio > 0.3 ? 0.8 : winRate; // Bonus si continue malgré défaites
    
    return Math.min(1, (combatRatio * 0.4 + challengeSeekingScore * 0.3 + persistenceScore * 0.3));
  }

  /**
   * Calcule la patience
   */
  private calculatePatience(actions: PlayerAction[]): number {
    // Analyser la durée des sessions de farming/grinding
    const farmingActions = actions.filter(a => 
      a.actionType === ActionType.POKEMON_ENCOUNTER || 
      a.actionType === ActionType.OBJECT_COLLECT
    );
    
    // Calculer les séquences d'actions répétitives
    let longestSequence = 0;
    let currentSequence = 0;
    let lastActionType: ActionType | null = null;
    
    for (const action of actions) {
      if (action.actionType === lastActionType && 
          [ActionType.POKEMON_ENCOUNTER, ActionType.OBJECT_COLLECT, ActionType.QUEST_PROGRESS].includes(action.actionType)) {
        currentSequence++;
      } else {
        longestSequence = Math.max(longestSequence, currentSequence);
        currentSequence = 1;
      }
      lastActionType = action.actionType;
    }
    
    longestSequence = Math.max(longestSequence, currentSequence);
    
    // Score basé sur la capacité à faire des tâches répétitives
    const repetitiveTaskScore = Math.min(1, longestSequence / 10);
    
    // Score basé sur la proportion d'activités de "farming"
    const farmingRatio = farmingActions.length / actions.length;
    
    return Math.min(1, (repetitiveTaskScore * 0.6 + farmingRatio * 0.4));
  }

  /**
   * Calcule la propension à prendre des risques
   */
  private calculateRiskTaking(actions: PlayerAction[]): number {
    // Analyser les tentatives dans des zones difficiles
    const riskyActions = actions.filter(a => {
      const data = a.data as any;
      return (
        a.actionType === ActionType.BATTLE_START && data.battleType === 'gym' ||
        a.actionType === ActionType.POKEMON_CAPTURE_ATTEMPT && data.pokemon?.level > 50 ||
        a.actionType === ActionType.ZONE_DISCOVER // Explorer de nouvelles zones = risque
      );
    });
    
    const riskRatio = riskActions.length / actions.length;
    
    // Analyser les échecs dans des situations risquées
    const riskyFailures = actions.filter(a => 
      FRUSTRATION_INDICATORS.includes(a.actionType) && 
      riskActions.some(r => Math.abs(r.timestamp - a.timestamp) < 60000) // Échec proche d'une action risquée
    );
    
    const persistenceAfterRiskyFailure = riskyFailures.length > 0 ? 
      riskActions.filter(r => r.timestamp > riskyFailures[0].timestamp).length / riskActions.length : 1;
    
    return Math.min(1, (riskRatio * 0.7 + persistenceAfterRiskyFailure * 0.3));
  }

  // ===================================================================
  // 📊 ANALYSE DE L'ÉTAT ACTUEL
  // ===================================================================

  /**
   * Analyse l'état actuel du joueur
   */
  private async analyzeCurrentState(
    patterns: DetectedPattern[],
    recentActions: PlayerAction[],
    stats: BasicPlayerStats
  ): Promise<BehaviorProfile['currentState']> {
    
    // Déterminer l'humeur actuelle
    const mood = this.determineMood(patterns, recentActions);
    
    // Déterminer si le joueur a besoin d'aide
    const needsHelp = patterns.some(p => p.patternType === 'help_needed') || 
                     patterns.some(p => p.patternType === 'frustration' && p.confidence > 0.7);
    
    // Calculer le niveau d'énergie
    const energyLevel = this.calculateEnergyLevel(recentActions);
    
    // Calculer le niveau de focus
    const focusLevel = this.calculateFocusLevel(recentActions);

    return {
      mood,
      needsHelp,
      energyLevel,
      focusLevel,
      recentPatterns: patterns,
      lastAnalysisTime: Date.now()
    };
  }

  /**
   * Détermine l'humeur actuelle
   */
  private determineMood(patterns: DetectedPattern[], actions: PlayerAction[]): BehaviorProfile['currentState']['mood'] {
    // Priorité aux patterns détectés
    const frustrationPattern = patterns.find(p => p.patternType === 'frustration');
    if (frustrationPattern && frustrationPattern.confidence > 0.6) {
      return 'frustrated';
    }
    
    const skillProgressPattern = patterns.find(p => p.patternType === 'skill_progression');
    if (skillProgressPattern && skillProgressPattern.confidence > 0.7) {
      return 'excited';
    }
    
    // Analyser les actions récentes
    const recentActions = actions.slice(0, 10); // 10 dernières actions
    const positiveCount = recentActions.filter(a => POSITIVE_ACTIONS.includes(a.actionType)).length;
    const negativeCount = recentActions.filter(a => FRUSTRATION_INDICATORS.includes(a.actionType)).length;
    
    if (positiveCount > negativeCount * 2) return 'happy';
    if (negativeCount > positiveCount) return 'frustrated';
    if (recentActions.length < 3) return 'bored';
    
    return 'neutral';
  }

  /**
   * Calcule le niveau d'énergie
   */
  private calculateEnergyLevel(actions: PlayerAction[]): number {
    if (actions.length === 0) return 0;
    
    // Analyser la fréquence des actions récentes
    const now = Date.now();
    const lastHour = actions.filter(a => now - a.timestamp < 60 * 60 * 1000);
    const actionsPerHour = lastHour.length;
    
    // Analyser la variété des actions
    const actionTypes = new Set(lastHour.map(a => a.actionType));
    const varietyScore = actionTypes.size / 10; // Normalisé
    
    // Score basé sur l'activité et la variété
    const activityScore = Math.min(1, actionsPerHour / 30); // 30 actions/heure = max énergie
    
    return Math.min(1, (activityScore * 0.7 + varietyScore * 0.3));
  }

  /**
   * Calcule le niveau de focus
   */
  private calculateFocusLevel(actions: PlayerAction[]): number {
    if (actions.length < 5) return 0.5;
    
    // Analyser la cohérence des actions
    const categories = actions.slice(0, 10).map(a => a.category);
    const categoryCount = new Map();
    
    for (const category of categories) {
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    }
    
    // Focus = dominance d'une catégorie
    const maxCategoryCount = Math.max(...categoryCount.values());
    const focusScore = maxCategoryCount / categories.length;
    
    // Bonus si les actions sont dans un intervalle de temps serré
    const timeSpan = actions[0].timestamp - actions[Math.min(9, actions.length - 1)].timestamp;
    const timeBonus = timeSpan < 30 * 60 * 1000 ? 0.2 : 0; // Bonus si < 30 minutes
    
    return Math.min(1, focusScore + timeBonus);
  }

  // ===================================================================
  // 🔮 GÉNÉRATION DE PRÉDICTIONS
  // ===================================================================

  /**
   * Génère les prédictions comportementales
   */
  private async generatePredictions(
    personality: BehaviorProfile['personality'],
    currentState: BehaviorProfile['currentState'],
    summary: PlayerActivitySummary,
    actions: PlayerAction[]
  ): Promise<BehaviorProfile['predictions']> {
    
    // Prédire la prochaine action
    const { nextAction, confidence: nextActionConfidence } = this.predictNextAction(actions, personality);
    
    // Prédire le timing
    const nextActionTime = this.predictNextActionTime(actions, summary);
    
    // Suggérer des sujets d'aide
    const helpTopics = this.suggestHelpTopics(currentState, personality, actions);
    
    // Évaluer les besoins sociaux
    const socialNeeds = this.evaluateSocialNeeds(personality, currentState, actions);
    
    // Prédire la durée de session
    const sessionDuration = this.predictSessionDuration(summary, personality, currentState);
    
    // Évaluer le risque de churn
    const churnRisk = this.evaluateChurnRisk(personality, currentState, summary);

    return {
      nextAction,
      nextActionConfidence,
      nextActionTime,
      helpTopics,
      socialNeeds,
      sessionDuration,
      churnRisk
    };
  }

  /**
   * Prédit la prochaine action probable
   */
  private predictNextAction(actions: PlayerAction[], personality: BehaviorProfile['personality']): { nextAction: string; confidence: number } {
    if (actions.length < 3) return { nextAction: 'exploration', confidence: 0.3 };
    
    // Analyser les patterns d'actions récentes
    const recentActions = actions.slice(0, 5);
    const actionCounts = new Map<string, number>();
    
    for (const action of recentActions) {
      const key = action.category;
      actionCounts.set(key, (actionCounts.get(key) || 0) + 1);
    }
    
    // Ajuster selon la personnalité
    if (personality.competitiveness > 0.7) {
      actionCounts.set(ActionCategory.COMBAT, (actionCounts.get(ActionCategory.COMBAT) || 0) + 2);
    }
    
    if (personality.explorationTendency > 0.7) {
      actionCounts.set(ActionCategory.EXPLORATION, (actionCounts.get(ActionCategory.EXPLORATION) || 0) + 2);
    }
    
    if (personality.socialness > 0.7) {
      actionCounts.set(ActionCategory.SOCIAL, (actionCounts.get(ActionCategory.SOCIAL) || 0) + 1);
    }
    
    // Trouver l'action la plus probable
    const mostLikely = Array.from(actionCounts.entries())
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostLikely) {
      const confidence = Math.min(0.9, mostLikely[1] / (recentActions.length + 2));
      return { nextAction: mostLikely[0], confidence };
    }
    
    return { nextAction: ActionCategory.EXPLORATION, confidence: 0.4 };
  }

  /**
   * Prédit le timing de la prochaine action
   */
  private predictNextActionTime(actions: PlayerAction[], summary: PlayerActivitySummary): number {
    if (actions.length < 2) return Date.now() + 5 * 60 * 1000; // 5 minutes par défaut
    
    // Calculer l'intervalle moyen entre actions
    const intervals = [];
    for (let i = 1; i < Math.min(10, actions.length); i++) {
      intervals.push(actions[i-1].timestamp - actions[i].timestamp);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // Ajuster selon l'heure préférée du joueur
    const now = new Date();
    const currentHour = now.getHours();
    const isPreferredTime = summary.mostActiveHours.includes(currentHour);
    
    const multiplier = isPreferredTime ? 0.8 : 1.2; // Plus rapide aux heures préférées
    
    return Date.now() + (avgInterval * multiplier);
  }

  /**
   * Suggère des sujets d'aide
   */
  private suggestHelpTopics(
    currentState: BehaviorProfile['currentState'],
    personality: BehaviorProfile['personality'],
    actions: PlayerAction[]
  ): string[] {
    const topics: string[] = [];
    
    // Basé sur l'état actuel
    if (currentState.mood === 'frustrated') {
      topics.push('gestion de la frustration', 'stratégies alternatives');
    }
    
    if (currentState.needsHelp) {
      topics.push('aide immédiate', 'conseils de base');
    }
    
    // Basé sur la personnalité
    if (personality.competitiveness > 0.7) {
      topics.push('stratégies de combat', 'équipes compétitives');
    }
    
    if (personality.explorationTendency > 0.7) {
      topics.push('nouvelles zones', 'secrets cachés');
    }
    
    if (personality.socialness < 0.3) {
      topics.push('fonctionnalités solo', 'progression individuelle');
    }
    
    // Basé sur les actions récentes
    const combatActions = actions.filter(a => a.category === ActionCategory.COMBAT);
    if (combatActions.length > actions.length * 0.5) {
      topics.push('optimisation combat', 'types Pokémon');
    }
    
    return [...new Set(topics)]; // Supprimer les doublons
  }

  /**
   * Évalue les besoins sociaux
   */
  private evaluateSocialNeeds(
    personality: BehaviorProfile['personality'],
    currentState: BehaviorProfile['currentState'],
    actions: PlayerAction[]
  ): boolean {
    // Joueurs très sociaux ont toujours des besoins sociaux
    if (personality.socialness > 0.8) return true;
    
    // Analyser la récence des interactions sociales
    const socialActions = actions.filter(a => a.category === ActionCategory.SOCIAL);
    if (socialActions.length === 0 && personality.socialness > 0.4) return true;
    
    // Besoin social si frustré et normalement social
    if (currentState.mood === 'frustrated' && personality.socialness > 0.5) return true;
    
    return false;
  }

  /**
   * Prédit la durée de session
   */
  private predictSessionDuration(
    summary: PlayerActivitySummary,
    personality: BehaviorProfile['personality'],
    currentState: BehaviorProfile['currentState']
  ): number {
    let baseDuration = summary.sessionStats.averageSessionDuration;
    
    // Ajustements selon l'état
    if (currentState.energyLevel > 0.8) baseDuration *= 1.3;
    if (currentState.mood === 'frustrated') baseDuration *= 0.7;
    if (currentState.mood === 'excited') baseDuration *= 1.2;
    
    // Ajustements selon la personnalité
    if (personality.patience > 0.7) baseDuration *= 1.2;
    if (personality.competitiveness > 0.8) baseDuration *= 1.1;
    
    return Math.max(10, Math.round(baseDuration)); // Minimum 10 minutes
  }

  /**
   * Évalue le risque de churn
   */
  private evaluateChurnRisk(
    personality: BehaviorProfile['personality'],
    currentState: BehaviorProfile['currentState'],
    summary: PlayerActivitySummary
  ): number {
    let risk = 0;
    
    // Facteurs de risque
    if (currentState.mood === 'frustrated') risk += 0.3;
    if (currentState.mood === 'bored') risk += 0.4;
    if (currentState.needsHelp && personality.frustrationTolerance < 0.4) risk += 0.3;
    if (summary.activityPattern === 'inactive') risk += 0.5;
    
    // Facteurs protecteurs
    if (personality.patience > 0.7) risk -= 0.2;
    if (personality.socialness > 0.6) risk -= 0.1;
    if (currentState.mood === 'happy' || currentState.mood === 'excited') risk -= 0.3;
    
    return Math.max(0, Math.min(1, risk));
  }

  // ===================================================================
  // 📈 CALCULS DE TENDANCES ET UTILITAIRES
  // ===================================================================

  /**
   * Calcule une tendance à partir de valeurs temporelles
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Régression linéaire simple
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = values.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (values[i] - meanY);
      denominator += (x[i] - meanX) ** 2;
    }
    
    const slope = denominator === 0 ? 0 : numerator / denominator;
    
    // Normaliser entre -1 et 1
    return Math.max(-1, Math.min(1, slope));
  }

  /**
   * Calcule des indicateurs de compétence
   */
  private calculateSkillIndicators(actions: PlayerAction[]): number {
    const combatActions = actions.filter(a => a.category === ActionCategory.COMBAT);
    if (combatActions.length === 0) return 0.5;
    
    const victories = combatActions.filter(a => a.actionType === ActionType.BATTLE_VICTORY).length;
    const defeats = combatActions.filter(a => a.actionType === ActionType.BATTLE_DEFEAT).length;
    
    return victories + defeats > 0 ? victories / (victories + defeats) : 0.5;
  }

  /**
   * Prédit les changements de comportement
   */
  private predictBehaviorChanges(trends: BehavioralTrends['trends'], periodMetrics: any[]): BehavioralTrends['predictedChanges'] {
    const personalityShifts: { trait: string; direction: number; confidence: number }[] = [];
    const behaviorChanges: { behavior: string; likelihood: number }[] = [];
    const interventionNeeds: string[] = [];
    
    // Analyser les tendances fortes
    Object.entries(trends).forEach(([key, value]) => {
      if (Math.abs(value) > 0.5) {
        personalityShifts.push({
          trait: key,
          direction: value,
          confidence: Math.abs(value)
        });
      }
    });
    
    // Prédictions spécifiques
    if (trends.frustrationTrend > 0.3) {
      behaviorChanges.push({ behavior: 'increasing_frustration', likelihood: trends.frustrationTrend });
      interventionNeeds.push('proposer aide proactive');
    }
    
    if (trends.socialTrend < -0.3) {
      behaviorChanges.push({ behavior: 'social_withdrawal', likelihood: Math.abs(trends.socialTrend) });
      interventionNeeds.push('encourager interactions sociales');
    }
    
    if (trends.activityTrend < -0.4) {
      behaviorChanges.push({ behavior: 'decreasing_engagement', likelihood: Math.abs(trends.activityTrend) });
      interventionNeeds.push('proposer nouveau contenu');
    }
    
    return {
      personalityShifts,
      behaviorChanges,
      interventionNeeds
    };
  }

  /**
   * Récupère les actions récentes pour analyse
   */
  private async getRecentActionsForAnalysis(playerId: string): Promise<PlayerAction[]> {
    const shortTermActions = await this.historyReader.getPlayerActions(playerId, {
      startTime: Date.now() - this.config.shortTermWindow * 60 * 60 * 1000,
      limit: this.config.maxAnalysisDepth,
      sortOrder: 'desc'
    });
    
    return shortTermActions;
  }

  // ===================================================================
  // 🗂️ GESTION DU CACHE
  // ===================================================================

  private getCachedProfile(playerId: string): BehaviorProfile | null {
    const expiry = this.profileExpiry.get(playerId);
    if (expiry && Date.now() > expiry) {
      this.behaviorProfiles.delete(playerId);
      this.profileExpiry.delete(playerId);
      return null;
    }
    return this.behaviorProfiles.get(playerId) || null;
  }

  private cacheProfile(playerId: string, profile: BehaviorProfile): void {
    this.behaviorProfiles.set(playerId, profile);
    this.profileExpiry.set(playerId, Date.now() + this.config.cacheProfileMinutes * 60 * 1000);
  }

  private getCachedTrends(playerId: string): BehavioralTrends | null {
    const expiry = this.trendsExpiry.get(playerId);
    if (expiry && Date.now() > expiry) {
      this.behavioralTrends.delete(playerId);
      this.trendsExpiry.delete(playerId);
      return null;
    }
    return this.behavioralTrends.get(playerId) || null;
  }

  private cacheTrends(playerId: string, trends: BehavioralTrends): void {
    this.behavioralTrends.set(playerId, trends);
    this.trendsExpiry.set(playerId, Date.now() + 30 * 60 * 1000); // 30 minutes
  }

  // ===================================================================
  // 📊 STATISTIQUES ET MAINTENANCE
  // ===================================================================

  private updateStats(analysisTime: number): void {
    this.stats.profilesGenerated++;
    this.stats.averageAnalysisTime = (this.stats.averageAnalysisTime * 0.9) + (analysisTime * 0.1);
  }

  /**
   * Calcule la confiance dans l'analyse
   */
  private calculateAnalysisConfidence(
    actionCount: number,
    patternCount: number,
    summary: PlayerActivitySummary
  ): number {
    let confidence = 0;
    
    // Confiance basée sur la taille de l'échantillon
    confidence += Math.min(0.5, actionCount / 100); // Max 0.5 pour 100+ actions
    
    // Confiance basée sur les patterns détectés
    confidence += Math.min(0.3, patternCount * 0.1); // Max 0.3 pour 3+ patterns
    
    // Confiance basée sur l'historique total
    confidence += Math.min(0.2, summary.totalActions / 500); // Max 0.2 pour 500+ actions
    
    return Math.min(1, confidence);
  }

  getStats() {
    return {
      ...this.stats,
      cachedProfiles: this.behaviorProfiles.size,
      cachedTrends: this.behavioralTrends.size
    };
  }

  private startMaintenanceTasks(): void {
    setInterval(() => {
      this.cleanupCache();
    }, 10 * 60 * 1000); // Nettoyage toutes les 10 minutes
  }

  private cleanupCache(): void {
    const now = Date.now();
    
    // Nettoyer les profils expirés
    for (const [playerId, expiry] of this.profileExpiry) {
      if (now > expiry) {
        this.behaviorProfiles.delete(playerId);
        this.profileExpiry.delete(playerId);
      }
    }
    
    // Nettoyer les tendances expirées
    for (const [playerId, expiry] of this.trendsExpiry) {
      if (now > expiry) {
        this.behavioralTrends.delete(playerId);
        this.trendsExpiry.delete(playerId);
      }
    }
  }

  destroy(): void {
    this.behaviorProfiles.clear();
    this.profileExpiry.clear();
    this.behavioralTrends.clear();
    this.trendsExpiry.clear();
    console.log('🧠 PlayerBehaviorAnalyzer détruit');
  }
}

// ===================================================================
// 🏭 SINGLETON ET EXPORTS
// ===================================================================

let analyzerInstance: PlayerBehaviorAnalyzer | null = null;

export function getPlayerBehaviorAnalyzer(): PlayerBehaviorAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new PlayerBehaviorAnalyzer();
  }
  return analyzerInstance;
}

export default PlayerBehaviorAnalyzer;
