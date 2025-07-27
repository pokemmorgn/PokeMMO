// server/src/Intelligence/Analysis/SimplePatternMatcher.ts

/**
 * 🔍 SIMPLE PATTERN MATCHER - DÉTECTION DE PATTERNS EN TEMPS RÉEL
 * 
 * Détecte automatiquement des patterns comportementaux simples :
 * - Frustration (échecs consécutifs)
 * - Besoin d'aide (faible win rate + activité récente)
 * - Patterns de socialisation
 * - Détection AFK/inactivité
 * - Progression de compétences
 * 
 * PERFORMANCE : < 50ms par analyse, optimisé pour temps réel
 */

import { PlayerHistoryReader, getPlayerHistoryReader } from '../DataCollection/PlayerHistoryReader';
import { BasicStatsCalculator, getBasicStatsCalculator } from './BasicStatsCalculator';
import type { BasicPlayerStats } from './BasicStatsCalculator';
import { 
  ActionType, 
  ActionCategory,
  POSITIVE_ACTIONS,
  FRUSTRATION_INDICATORS,
  BEHAVIOR_THRESHOLDS
} from '../Core/ActionTypes';
import type { PlayerAction } from '../Core/ActionTypes';

// ===================================================================
// 🎯 INTERFACES DES PATTERNS DÉTECTÉS
// ===================================================================

/**
 * Pattern comportemental détecté
 */
export interface DetectedPattern {
  patternType: 'frustration' | 'help_needed' | 'social' | 'afk' | 'skill_progression';
  confidence: number; // 0-1, niveau de confiance dans la détection
  triggers: string[]; // Événements qui ont déclenché la détection
  recommendations: string[]; // Actions recommandées pour les NPCs
  timestamp: number; // Quand le pattern a été détecté
  playerId: string; // Joueur concerné
  metadata?: { // Données additionnelles spécifiques au pattern
    [key: string]: any;
  };
}

/**
 * Configuration du matcher
 */
export interface PatternMatcherConfig {
  // Seuils de détection
  frustrationThreshold: number; // Nombre d'échecs consécutifs
  helpNeededThreshold: number; // Win rate en dessous duquel proposer aide
  afkThresholdMinutes: number; // Minutes sans action = AFK
  socialThresholdActions: number; // Actions sociales min pour être "social"
  
  // Performance
  maxActionsToAnalyze: number; // Limite d'actions à analyser
  cachePatternMinutes: number; // Durée cache des patterns détectés
  
  // Activation des patterns
  enabledPatterns: {
    frustration: boolean;
    helpNeeded: boolean;
    social: boolean;
    afk: boolean;
    skillProgression: boolean;
  };
}

/**
 * Contexte d'analyse rapide d'un joueur
 */
interface QuickPlayerContext {
  playerId: string;
  recentActions: PlayerAction[]; // 20 dernières actions max
  lastActivity: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  recentSocialActivity: number;
  winRate: number;
  lastPatternCheck: number;
}

// ===================================================================
// 🔥 CLASSE PRINCIPALE - SIMPLE PATTERN MATCHER
// ===================================================================

export class SimplePatternMatcher {
  private historyReader: PlayerHistoryReader;
  private statsCalculator: BasicStatsCalculator;
  private config: PatternMatcherConfig;
  
  // Cache pour performance
  private playerContexts: Map<string, QuickPlayerContext> = new Map();
  private detectedPatterns: Map<string, DetectedPattern[]> = new Map(); // playerId -> patterns
  private patternCache: Map<string, { pattern: DetectedPattern; expires: number }> = new Map();
  
  // Statistiques de performance
  private performanceStats = {
    totalAnalyses: 0,
    averageAnalysisTime: 0,
    patternsDetected: 0,
    cacheHits: 0
  };

  constructor(config?: Partial<PatternMatcherConfig>) {
    this.historyReader = getPlayerHistoryReader();
    this.statsCalculator = getBasicStatsCalculator();
    
    this.config = {
      frustrationThreshold: 3,
      helpNeededThreshold: 0.3,
      afkThresholdMinutes: 5,
      socialThresholdActions: 10,
      maxActionsToAnalyze: 20,
      cachePatternMinutes: 2,
      enabledPatterns: {
        frustration: true,
        helpNeeded: true,
        social: true,
        afk: true,
        skillProgression: true
      },
      ...config
    };

    console.log('🔍 SimplePatternMatcher initialisé', this.config);
    this.startMaintenanceTasks();
  }

  // ===================================================================
  // 🎯 MÉTHODES PRINCIPALES DE DÉTECTION
  // ===================================================================

  /**
   * Analyse rapide d'un joueur pour détecter des patterns
   */
  async analyzePlayerPatterns(playerId: string): Promise<DetectedPattern[]> {
    const startTime = Date.now();
    
    try {
      // Vérifier le cache d'abord
      const cachedPatterns = this.getCachedPatterns(playerId);
      if (cachedPatterns.length > 0) {
        this.performanceStats.cacheHits++;
        return cachedPatterns;
      }

      const patterns: DetectedPattern[] = [];
      
      // Récupérer ou créer le contexte du joueur
      const context = await this.getOrCreatePlayerContext(playerId);
      if (!context) return patterns;

      // Analyser chaque type de pattern activé
      if (this.config.enabledPatterns.frustration) {
        const frustrationPattern = this.detectFrustrationPattern(context);
        if (frustrationPattern) patterns.push(frustrationPattern);
      }

      if (this.config.enabledPatterns.helpNeeded) {
        const helpPattern = await this.detectHelpNeededPattern(context);
        if (helpPattern) patterns.push(helpPattern);
      }

      if (this.config.enabledPatterns.social) {
        const socialPattern = this.detectSocialPattern(context);
        if (socialPattern) patterns.push(socialPattern);
      }

      if (this.config.enabledPatterns.afk) {
        const afkPattern = this.detectAFKPattern(context);
        if (afkPattern) patterns.push(afkPattern);
      }

      if (this.config.enabledPatterns.skillProgression) {
        const skillPattern = this.detectSkillProgressionPattern(context);
        if (skillPattern) patterns.push(skillPattern);
      }

      // Mettre en cache les patterns détectés
      this.cachePatterns(playerId, patterns);
      
      // Mettre à jour les statistiques
      this.updatePerformanceStats(Date.now() - startTime, patterns.length);
      
      console.log(`🔍 Patterns détectés pour ${playerId}: ${patterns.map(p => p.patternType).join(', ')}`);
      return patterns;

    } catch (error) {
      console.error(`❌ Erreur analyse patterns pour ${playerId}:`, error);
      return [];
    }
  }

  /**
   * Analyse déclenchée par une action spécifique
   */
  async analyzeActionPattern(action: PlayerAction): Promise<DetectedPattern[]> {
    // Mise à jour du contexte avec la nouvelle action
    this.updatePlayerContextWithAction(action);
    
    // Analyser seulement si l'action peut déclencher un pattern
    if (this.isPatternTriggerAction(action)) {
      return this.analyzePlayerPatterns(action.playerId);
    }
    
    return [];
  }

  // ===================================================================
  // 🚨 DÉTECTIONS SPÉCIFIQUES PAR TYPE DE PATTERN
  // ===================================================================

  /**
   * Détecte un pattern de frustration
   */
  private detectFrustrationPattern(context: QuickPlayerContext): DetectedPattern | null {
    const threshold = this.config.frustrationThreshold;
    
    if (context.consecutiveFailures >= threshold) {
      // Analyser la fréquence des échecs
      const recentFailures = context.recentActions.filter(a => 
        FRUSTRATION_INDICATORS.includes(a.actionType)
      );
      
      // Calculer la fenêtre temporelle des échecs
      const timeWindow = context.recentActions[0].timestamp - context.recentActions[context.recentActions.length - 1].timestamp;
      const failureRate = recentFailures.length / Math.max(1, timeWindow / (60 * 1000)); // échecs par minute
      
      // Confidence basée sur la densité des échecs
      let confidence = Math.min(1, context.consecutiveFailures / (threshold * 2));
      if (failureRate > 2) confidence += 0.2; // Bonus si échecs très rapprochés
      confidence = Math.min(1, confidence);

      const triggers = [
        `${context.consecutiveFailures} échecs consécutifs`,
        `Taux d'échec: ${failureRate.toFixed(1)}/min`
      ];

      const recommendations = [
        "Proposer de l'aide proactivement",
        "Utiliser un dialogue encourageant",
        "Suggérer des activités plus faciles",
        "Offrir des conseils de stratégie"
      ];

      // Ajouter des recommandations spécifiques selon le type d'échecs
      const lastFailureType = recentFailures[0]?.actionType;
      if (lastFailureType === ActionType.BATTLE_DEFEAT) {
        recommendations.push("Conseiller visite au Centre Pokémon");
        recommendations.push("Suggérer l'entraînement avec des adversaires plus faibles");
      } else if (lastFailureType === ActionType.POKEMON_CAPTURE_FAILURE) {
        recommendations.push("Expliquer les mécaniques de capture");
        recommendations.push("Recommander de meilleures Pokéballs");
      }

      return {
        patternType: 'frustration',
        confidence,
        triggers,
        recommendations,
        timestamp: Date.now(),
        playerId: context.playerId,
        metadata: {
          consecutiveFailures: context.consecutiveFailures,
          failureRate,
          lastFailureType,
          timeWindow
        }
      };
    }

    return null;
  }

  /**
   * Détecte un besoin d'aide
   */
  private async detectHelpNeededPattern(context: QuickPlayerContext): Promise<DetectedPattern | null> {
    // Vérifier le win rate et l'activité récente
    if (context.winRate < this.config.helpNeededThreshold && context.recentActions.length >= 5) {
      
      // Analyser l'activité récente pour voir si le joueur essaie activement
      const recentActivity = context.recentActions.filter(a => 
        a.timestamp > Date.now() - 10 * 60 * 1000 // 10 dernières minutes
      ).length;

      if (recentActivity >= 3) { // Joueur actif mais en difficulté
        const confidence = Math.min(1, (this.config.helpNeededThreshold - context.winRate) * 3);
        
        const triggers = [
          `Win rate faible: ${(context.winRate * 100).toFixed(1)}%`,
          `Activité récente: ${recentActivity} actions`,
          "Joueur actif mais en difficulté"
        ];

        const recommendations = [
          "Offrir aide avant qu'elle soit demandée",
          "Proposer des tutoriels adaptés",
          "Guider vers du contenu approprié au niveau",
          "Être particulièrement patient et encourageant"
        ];

        // Analyser le type de difficultés
        const combatActions = context.recentActions.filter(a => a.category === ActionCategory.COMBAT);
        const pokemonActions = context.recentActions.filter(a => a.category === ActionCategory.POKEMON);
        
        if (combatActions.length > pokemonActions.length) {
          recommendations.push("Focus sur les stratégies de combat");
          recommendations.push("Expliquer les types Pokémon");
        } else {
          recommendations.push("Aider avec la capture de Pokémon");
          recommendations.push("Expliquer les mécaniques de base");
        }

        return {
          patternType: 'help_needed',
          confidence,
          triggers,
          recommendations,
          timestamp: Date.now(),
          playerId: context.playerId,
          metadata: {
            winRate: context.winRate,
            recentActivity,
            primaryDifficulty: combatActions.length > pokemonActions.length ? 'combat' : 'pokemon'
          }
        };
      }
    }

    return null;
  }

  /**
   * Détecte un pattern social
   */
  private detectSocialPattern(context: QuickPlayerContext): DetectedPattern | null {
    const socialActions = context.recentActions.filter(a => a.category === ActionCategory.SOCIAL);
    
    if (socialActions.length >= 3) {
      // Joueur très social
      const confidence = Math.min(1, socialActions.length / 10);
      
      const triggers = [
        `${socialActions.length} actions sociales récentes`,
        "Comportement sociable détecté"
      ];

      const recommendations = [
        "Adopter un ton amical et bavard",
        "Mentionner d'autres joueurs ou activités de groupe",
        "Proposer des activités sociales",
        "Être plus expressif dans les dialogues"
      ];

      return {
        patternType: 'social',
        confidence,
        triggers,
        recommendations,
        timestamp: Date.now(),
        playerId: context.playerId,
        metadata: {
          socialActionsCount: socialActions.length,
          socialActionTypes: [...new Set(socialActions.map(a => a.actionType))]
        }
      };
    } else if (context.recentActions.length >= 10 && socialActions.length === 0) {
      // Joueur antisocial
      const confidence = 0.7;
      
      const triggers = [
        "Aucune interaction sociale récente",
        "Comportement solitaire détecté"
      ];

      const recommendations = [
        "Adopter un ton plus neutre et direct",
        "Éviter les références sociales",
        "Se concentrer sur l'aide pratique",
        "Respecter la préférence pour le jeu solo"
      ];

      return {
        patternType: 'social',
        confidence,
        triggers,
        recommendations,
        timestamp: Date.now(),
        playerId: context.playerId,
        metadata: {
          socialActionsCount: 0,
          antisocial: true
        }
      };
    }

    return null;
  }

  /**
   * Détecte un pattern AFK
   */
  private detectAFKPattern(context: QuickPlayerContext): DetectedPattern | null {
    const timeSinceLastAction = (Date.now() - context.lastActivity) / (60 * 1000); // minutes
    
    if (timeSinceLastAction >= this.config.afkThresholdMinutes) {
      const confidence = Math.min(1, timeSinceLastAction / (this.config.afkThresholdMinutes * 2));
      
      const triggers = [
        `${Math.round(timeSinceLastAction)} minutes d'inactivité`,
        "Joueur potentiellement AFK"
      ];

      const recommendations = [
        "Proposer un résumé de ce qui s'est passé",
        "Offrir des suggestions d'activités",
        "Vérifier si le joueur a besoin d'aide",
        "Utiliser un ton de bienvenue"
      ];

      return {
        patternType: 'afk',
        confidence,
        triggers,
        recommendations,
        timestamp: Date.now(),
        playerId: context.playerId,
        metadata: {
          minutesInactive: Math.round(timeSinceLastAction)
        }
      };
    }

    return null;
  }

  /**
   * Détecte un pattern de progression de compétences
   */
  private detectSkillProgressionPattern(context: QuickPlayerContext): DetectedPattern | null {
    // Analyser les succès récents vs l'historique
    const recentSuccesses = context.recentActions.filter(a => 
      POSITIVE_ACTIONS.includes(a.actionType)
    ).length;
    
    const recentTotal = context.recentActions.length;
    const currentSuccessRate = recentTotal > 0 ? recentSuccesses / recentTotal : 0;
    
    // Comparer avec le win rate historique
    const improvement = currentSuccessRate - context.winRate;
    
    if (improvement > 0.2 && recentSuccesses >= 3) {
      // Progression positive détectée
      const confidence = Math.min(1, improvement * 2);
      
      const triggers = [
        `Amélioration du taux de succès: +${(improvement * 100).toFixed(1)}%`,
        `${recentSuccesses} succès récents`,
        "Progression de compétences détectée"
      ];

      const recommendations = [
        "Féliciter les progrès",
        "Proposer des défis plus avancés",
        "Encourager à continuer sur cette voie",
        "Mentionner l'amélioration observée"
      ];

      return {
        patternType: 'skill_progression',
        confidence,
        triggers,
        recommendations,
        timestamp: Date.now(),
        playerId: context.playerId,
        metadata: {
          improvement,
          currentSuccessRate,
          historicalWinRate: context.winRate,
          recentSuccesses
        }
      };
    }

    return null;
  }

  // ===================================================================
  // 📊 GESTION DU CONTEXTE JOUEUR
  // ===================================================================

  /**
   * Récupère ou crée le contexte d'un joueur
   */
  private async getOrCreatePlayerContext(playerId: string): Promise<QuickPlayerContext | null> {
    let context = this.playerContexts.get(playerId);
    
    if (!context || Date.now() - context.lastPatternCheck > 60000) { // Refresh si > 1 minute
      try {
        // Récupérer les actions récentes
        const recentActions = await this.historyReader.getPlayerActions(playerId, {
          limit: this.config.maxActionsToAnalyze,
          sortOrder: 'desc'
        });

        if (recentActions.length === 0) return null;

        // Calculer les métriques de base
        const consecutiveFailures = this.countConsecutiveFailures(recentActions);
        const consecutiveSuccesses = this.countConsecutiveSuccesses(recentActions);
        
        const socialActions = recentActions.filter(a => a.category === ActionCategory.SOCIAL).length;
        
        // Calculer win rate rapide
        const battles = recentActions.filter(a => 
          a.actionType === ActionType.BATTLE_VICTORY || a.actionType === ActionType.BATTLE_DEFEAT
        );
        const wins = battles.filter(a => a.actionType === ActionType.BATTLE_VICTORY).length;
        const winRate = battles.length > 0 ? wins / battles.length : 0.5;

        context = {
          playerId,
          recentActions,
          lastActivity: recentActions[0].timestamp,
          consecutiveFailures,
          consecutiveSuccesses,
          recentSocialActivity: socialActions,
          winRate,
          lastPatternCheck: Date.now()
        };

        this.playerContexts.set(playerId, context);
        
      } catch (error) {
        console.error(`❌ Erreur création contexte pour ${playerId}:`, error);
        return null;
      }
    }

    return context;
  }

  /**
   * Met à jour le contexte avec une nouvelle action
   */
  private updatePlayerContextWithAction(action: PlayerAction): void {
    const context = this.playerContexts.get(action.playerId);
    if (!context) return;

    // Ajouter l'action au début
    context.recentActions.unshift(action);
    
    // Limiter la taille
    if (context.recentActions.length > this.config.maxActionsToAnalyze) {
      context.recentActions = context.recentActions.slice(0, this.config.maxActionsToAnalyze);
    }

    // Mettre à jour les métriques
    context.lastActivity = action.timestamp;
    context.consecutiveFailures = this.countConsecutiveFailures(context.recentActions);
    context.consecutiveSuccesses = this.countConsecutiveSuccesses(context.recentActions);
    
    if (action.category === ActionCategory.SOCIAL) {
      context.recentSocialActivity++;
    }

    // Recalculer win rate si action de combat
    if (action.actionType === ActionType.BATTLE_VICTORY || action.actionType === ActionType.BATTLE_DEFEAT) {
      const battles = context.recentActions.filter(a => 
        a.actionType === ActionType.BATTLE_VICTORY || a.actionType === ActionType.BATTLE_DEFEAT
      );
      const wins = battles.filter(a => a.actionType === ActionType.BATTLE_VICTORY).length;
      context.winRate = battles.length > 0 ? wins / battles.length : 0.5;
    }
  }

  /**
   * Compte les échecs consécutifs depuis le début
   */
  private countConsecutiveFailures(actions: PlayerAction[]): number {
    let count = 0;
    for (const action of actions) {
      if (FRUSTRATION_INDICATORS.includes(action.actionType)) {
        count++;
      } else if (POSITIVE_ACTIONS.includes(action.actionType)) {
        break; // Arrêter au premier succès
      }
    }
    return count;
  }

  /**
   * Compte les succès consécutifs depuis le début
   */
  private countConsecutiveSuccesses(actions: PlayerAction[]): number {
    let count = 0;
    for (const action of actions) {
      if (POSITIVE_ACTIONS.includes(action.actionType)) {
        count++;
      } else if (FRUSTRATION_INDICATORS.includes(action.actionType)) {
        break; // Arrêter au premier échec
      }
    }
    return count;
  }

  /**
   * Détermine si une action peut déclencher l'analyse de patterns
   */
  private isPatternTriggerAction(action: PlayerAction): boolean {
    const triggerTypes = [
      ...FRUSTRATION_INDICATORS,
      ...POSITIVE_ACTIONS,
      ActionType.PLAYER_MESSAGE,
      ActionType.AFK_START,
      ActionType.SESSION_START
    ];
    
    return triggerTypes.includes(action.actionType);
  }

  // ===================================================================
  // 🗂️ GESTION DU CACHE
  // ===================================================================

  /**
   * Récupère les patterns en cache
   */
  private getCachedPatterns(playerId: string): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const now = Date.now();
    
    for (const [key, cached] of this.patternCache) {
      if (key.startsWith(`${playerId}_`) && cached.expires > now) {
        patterns.push(cached.pattern);
      }
    }
    
    return patterns;
  }

  /**
   * Met en cache les patterns détectés
   */
  private cachePatterns(playerId: string, patterns: DetectedPattern[]): void {
    const expiresAt = Date.now() + (this.config.cachePatternMinutes * 60 * 1000);
    
    for (const pattern of patterns) {
      const key = `${playerId}_${pattern.patternType}_${pattern.timestamp}`;
      this.patternCache.set(key, {
        pattern,
        expires: expiresAt
      });
    }
  }

  // ===================================================================
  // 📊 STATISTIQUES ET MONITORING
  // ===================================================================

  /**
   * Met à jour les statistiques de performance
   */
  private updatePerformanceStats(analysisTime: number, patternsFound: number): void {
    this.performanceStats.totalAnalyses++;
    this.performanceStats.patternsDetected += patternsFound;
    
    // Moyenne mobile du temps d'analyse
    this.performanceStats.averageAnalysisTime = 
      (this.performanceStats.averageAnalysisTime * 0.9) + (analysisTime * 0.1);
  }

  /**
   * Retourne les statistiques de performance
   */
  getPerformanceStats(): {
    totalAnalyses: number;
    averageAnalysisTime: number;
    patternsDetected: number;
    cacheHitRate: number;
    playersTracked: number;
  } {
    const cacheHitRate = this.performanceStats.totalAnalyses > 0 ? 
      this.performanceStats.cacheHits / this.performanceStats.totalAnalyses : 0;

    return {
      ...this.performanceStats,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      playersTracked: this.playerContexts.size
    };
  }

  /**
   * Récupère tous les patterns actifs d'un joueur
   */
  getActivePatterns(playerId: string): DetectedPattern[] {
    return this.detectedPatterns.get(playerId) || [];
  }

  /**
   * Force l'analyse d'un joueur (bypass cache)
   */
  async forceAnalyzePlayer(playerId: string): Promise<DetectedPattern[]> {
    // Supprimer du cache
    this.playerContexts.delete(playerId);
    
    // Supprimer les patterns en cache
    for (const key of this.patternCache.keys()) {
      if (key.startsWith(`${playerId}_`)) {
        this.patternCache.delete(key);
      }
    }
    
    return this.analyzePlayerPatterns(playerId);
  }

  // ===================================================================
  // 🧹 MAINTENANCE
  // ===================================================================

  /**
   * Lance les tâches de maintenance
   */
  private startMaintenanceTasks(): void {
    // Nettoyage du cache toutes les 5 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000);

    // Nettoyage des contextes toutes les 10 minutes
    setInterval(() => {
      this.cleanupPlayerContexts();
    }, 10 * 60 * 1000);

    console.log('🧹 Tâches de maintenance SimplePatternMatcher démarrées');
  }

  /**
   * Nettoie le cache expiré
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.patternCache) {
      if (cached.expires <= now) {
        this.patternCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 ${cleanedCount} patterns expirés nettoyés du cache`);
    }
  }

  /**
   * Nettoie les contextes de joueurs inactifs
   */
  private cleanupPlayerContexts(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    let cleanedCount = 0;

    for (const [playerId, context] of this.playerContexts) {
      if (now - context.lastActivity > maxAge) {
        this.playerContexts.delete(playerId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 ${cleanedCount} contextes joueurs nettoyés`);
    }
  }

  /**
   * Nettoyage à la destruction
   */
  destroy(): void {
    this.playerContexts.clear();
    this.patternCache.clear();
    this.detectedPatterns.clear();
    console.log('🔍 SimplePatternMatcher détruit');
  }
}

// ===================================================================
// 🏭 SINGLETON ET EXPORTS
// ===================================================================

let matcherInstance: SimplePatternMatcher | null = null;

/**
 * Récupère l'instance singleton du matcher
 */
export function getSimplePatternMatcher(): SimplePatternMatcher {
  if (!matcherInstance) {
    matcherInstance = new SimplePatternMatcher();
  }
  return matcherInstance;
}

/**
 * Analyse rapide d'un joueur (fonction utilitaire)
 */
export async function quickAnalyzePlayer(playerId: string): Promise<DetectedPattern[]> {
  return getSimplePatternMatcher().analyzePlayerPatterns(playerId);
}

/**
 * Export par défaut
 */
export default SimplePatternMatcher;
