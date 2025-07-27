// server/src/Intelligence/IntelligenceOrchestrator.ts

/**
 * 🎼 INTELLIGENCE ORCHESTRATOR - CHEF D'ORCHESTRE DE L'IA
 * 
 * Coordonne tous les systèmes d'intelligence artificielle :
 * - SimplePatternMatcher pour détection temps réel
 * - PlayerBehaviorAnalyzer pour profils comportementaux
 * - NPCMemoryManager pour mémoire persistante
 * - NPCReactionSystem pour réactions intelligentes
 * 
 * RÔLE : Interface unique pour utiliser toute l'IA du jeu
 * Point d'entrée principal pour les événements du jeu
 */

import { SimplePatternMatcher, getSimplePatternMatcher } from './Analysis/SimplePatternMatcher';
import type { DetectedPattern } from './Analysis/SimplePatternMatcher';

import { PlayerBehaviorAnalyzer, getPlayerBehaviorAnalyzer } from './Analysis/PlayerBehaviorAnalyzer';
import type { BehaviorProfile, BehavioralTrends } from './Analysis/PlayerBehaviorAnalyzer';

import { NPCMemoryManager, getNPCMemoryManager, recordNPCInteraction } from './NPCSystem/NPCMemoryManager';
import type { NPCMemory, NPCInteractionEvent } from './NPCSystem/NPCMemoryManager';

import { NPCReactionSystem, getNPCReactionSystem, triggerNPCReactions, registerNPC } from './NPCSystem/NPCReactionSystem';
import type { NPCReaction, NPCContext } from './NPCSystem/NPCReactionSystem';

import { ActionSummary, getActionSummary } from './Analysis/ActionSummary';
import type { PlayerActivityReport, SessionReport } from './Analysis/ActionSummary';

import { PlayerActionTracker, getActionTracker } from './Core/PlayerActionTracker';
import { ActionLogger, getActionLogger } from './DataCollection/ActionLogger';

import { ActionType } from './Core/ActionTypes';
import type { PlayerAction } from './Core/ActionTypes';

// ===================================================================
// 🎯 INTERFACES D'ORCHESTRATION
// ===================================================================

/**
 * Résultat complet d'analyse d'un joueur
 */
export interface CompletePlayerAnalysis {
  playerId: string;
  timestamp: number;
  
  // Données de base
  behaviorProfile: BehaviorProfile | null;
  activityReport: PlayerActivityReport | null;
  detectedPatterns: DetectedPattern[];
  
  // Réactions NPCs
  npcReactions: NPCReaction[];
  relevantMemories: NPCMemory[];
  
  // Recommandations
  recommendations: {
    forPlayer: string[];
    forNPCs: string[];
    forGameDesign: string[];
  };
  
  // Métriques de confiance
  analysisConfidence: number;
  dataQuality: number;
  predictionReliability: number;
}

/**
 * Événement de jeu à analyser
 */
export interface GameEvent {
  eventType: 'player_action' | 'npc_interaction' | 'session_start' | 'session_end' | 'achievement' | 'error';
  playerId: string;
  timestamp: number;
  data: any;
  context?: {
    location?: { map: string; x: number; y: number };
    sessionId?: string;
    playerLevel?: number;
  };
}

/**
 * Configuration de l'orchestrateur
 */
export interface OrchestratorConfig {
  // Seuils d'analyse
  minActionsForAnalysis: number;
  analysisFrequencyMinutes: number;
  
  // Activation des composants
  enabledComponents: {
    patternMatching: boolean;
    behaviorAnalysis: boolean;
    npcMemory: boolean;
    npcReactions: boolean;
  };
  
  // Performance
  batchSize: number;
  maxConcurrentAnalyses: number;
  cacheResultsMinutes: number;
  
  // Notifications
  notifyOnHighChurnRisk: boolean;
  notifyOnFrustrationSpike: boolean;
  notifyOnUnusualBehavior: boolean;
}

// ===================================================================
// 🔥 CLASSE PRINCIPALE - INTELLIGENCE ORCHESTRATOR
// ===================================================================

export class IntelligenceOrchestrator {
  private patternMatcher: SimplePatternMatcher;
  private behaviorAnalyzer: PlayerBehaviorAnalyzer;
  private memoryManager: NPCMemoryManager;
  private reactionSystem: NPCReactionSystem;
  private actionSummary: ActionSummary;
  private actionTracker: PlayerActionTracker;
  private actionLogger: ActionLogger;
  
  private config: OrchestratorConfig;
  
  // Cache des analyses
  private analysisCache: Map<string, CompletePlayerAnalysis> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  
  // Queue des événements à traiter
  private eventQueue: GameEvent[] = [];
  private processingInProgress: Set<string> = new Set(); // playerIds en cours d'analyse
  
  // Timers et maintenance
  private analysisTimer: NodeJS.Timeout | null = null;
  private maintenanceTimer: NodeJS.Timeout | null = null;
  
  // Statistiques globales
  private stats = {
    totalAnalyses: 0,
    averageAnalysisTime: 0,
    playersAnalyzed: new Set<string>(),
    patternsDetected: 0,
    reactionsGenerated: 0,
    interventionsTriggered: 0
  };

  constructor(config?: Partial<OrchestratorConfig>) {
    // Initialiser tous les composants
    this.patternMatcher = getSimplePatternMatcher();
    this.behaviorAnalyzer = getPlayerBehaviorAnalyzer();
    this.memoryManager = getNPCMemoryManager();
    this.reactionSystem = getNPCReactionSystem();
    this.actionSummary = getActionSummary();
    this.actionTracker = getActionTracker();
    this.actionLogger = getActionLogger();
    
    this.config = {
      minActionsForAnalysis: 10,
      analysisFrequencyMinutes: 5,
      enabledComponents: {
        patternMatching: true,
        behaviorAnalysis: true,
        npcMemory: true,
        npcReactions: true
      },
      batchSize: 5,
      maxConcurrentAnalyses: 3,
      cacheResultsMinutes: 10,
      notifyOnHighChurnRisk: true,
      notifyOnFrustrationSpike: true,
      notifyOnUnusualBehavior: true,
      ...config
    };

    console.log('🎼 IntelligenceOrchestrator initialisé', this.config);
    
    // Connecter le tracker à notre logger
    this.actionTracker.setDatabase(this.actionLogger);
    
    this.startPeriodicAnalysis();
    this.startMaintenanceTasks();
  }

  // ===================================================================
  // 🎯 MÉTHODES PRINCIPALES D'ORCHESTRATION
  // ===================================================================

  /**
   * Analyse complète d'un joueur (point d'entrée principal)
   */
  async analyzePlayer(playerId: string, forceAnalysis: boolean = false): Promise<CompletePlayerAnalysis | null> {
    const startTime = Date.now();
    
    try {
      // Vérifier le cache si pas forcé
      if (!forceAnalysis) {
        const cached = this.getCachedAnalysis(playerId);
        if (cached) return cached;
      }

      // Éviter les analyses simultanées du même joueur
      if (this.processingInProgress.has(playerId)) {
        console.log(`⏳ Analyse déjà en cours pour ${playerId}`);
        return null;
      }

      this.processingInProgress.add(playerId);

      console.log(`🔍 Analyse complète démarrée pour ${playerId}`);

      // Étape 1 : Détection de patterns (rapide)
      let detectedPatterns: DetectedPattern[] = [];
      if (this.config.enabledComponents.patternMatching) {
        detectedPatterns = await this.patternMatcher.analyzePlayerPatterns(playerId);
        this.stats.patternsDetected += detectedPatterns.length;
      }

      // Étape 2 : Analyse comportementale (plus lente)
      let behaviorProfile: BehaviorProfile | null = null;
      if (this.config.enabledComponents.behaviorAnalysis) {
        behaviorProfile = await this.behaviorAnalyzer.generateBehaviorProfile(playerId);
      }

      // Étape 3 : Rapport d'activité
      const activityReport = await this.actionSummary.generatePlayerReport(playerId);

      // Étape 4 : Générer réactions NPCs
      let npcReactions: NPCReaction[] = [];
      if (this.config.enabledComponents.npcReactions && detectedPatterns.length > 0) {
        npcReactions = await this.reactionSystem.triggerPlayerAnalysis(playerId);
        this.stats.reactionsGenerated += npcReactions.length;
      }

      // Étape 5 : Récupérer mémoires NPCs pertinentes
      let relevantMemories: NPCMemory[] = [];
      if (this.config.enabledComponents.npcMemory) {
        relevantMemories = await this.memoryManager.getPlayerMemories(playerId);
      }

      // Étape 6 : Générer recommandations
      const recommendations = this.generateRecommendations(
        behaviorProfile, activityReport, detectedPatterns, npcReactions
      );

      // Étape 7 : Calculer métriques de confiance
      const confidence = this.calculateAnalysisConfidence(
        behaviorProfile, activityReport, detectedPatterns.length
      );

      // Construire le résultat
      const analysis: CompletePlayerAnalysis = {
        playerId,
        timestamp: Date.now(),
        behaviorProfile,
        activityReport,
        detectedPatterns,
        npcReactions,
        relevantMemories,
        recommendations,
        analysisConfidence: confidence.overall,
        dataQuality: confidence.dataQuality,
        predictionReliability: confidence.predictionReliability
      };

      // Mettre en cache
      this.cacheAnalysis(playerId, analysis);

      // Déclencher interventions si nécessaire
      await this.triggerInterventionsIfNeeded(analysis);

      // Mettre à jour les stats
      this.updateStats(Date.now() - startTime, playerId);

      console.log(`✅ Analyse complète terminée pour ${playerId} (${Date.now() - startTime}ms)`);
      return analysis;

    } catch (error) {
      console.error(`❌ Erreur analyse complète ${playerId}:`, error);
      return null;
    } finally {
      this.processingInProgress.delete(playerId);
    }
  }

  /**
   * Traite un événement de jeu en temps réel
   */
  async processGameEvent(event: GameEvent): Promise<void> {
    try {
      console.log(`🎮 Événement reçu: ${event.eventType} pour ${event.playerId}`);

      // Traitement immédiat selon le type d'événement
      switch (event.eventType) {
        case 'player_action':
          await this.handlePlayerAction(event);
          break;
          
        case 'npc_interaction':
          await this.handleNPCInteraction(event);
          break;
          
        case 'session_start':
          await this.handleSessionStart(event);
          break;
          
        case 'session_end':
          await this.handleSessionEnd(event);
          break;
          
        case 'achievement':
          await this.handleAchievement(event);
          break;
          
        case 'error':
          await this.handleError(event);
          break;
      }

      // Ajouter à la queue pour analyse différée si pertinent
      if (this.shouldQueueForAnalysis(event)) {
        this.eventQueue.push(event);
      }

    } catch (error) {
      console.error(`❌ Erreur traitement événement:`, error);
    }
  }

  /**
   * Analyse en lot de plusieurs joueurs
   */
  async analyzeBatch(playerIds: string[]): Promise<CompletePlayerAnalysis[]> {
    console.log(`📊 Analyse en lot de ${playerIds.length} joueurs`);
    
    const results: CompletePlayerAnalysis[] = [];
    const chunks = this.chunkArray(playerIds, this.config.batchSize);
    
    for (const chunk of chunks) {
      const promises = chunk.map(playerId => 
        this.analyzePlayer(playerId).catch((error: Error) => {
          console.error(`❌ Erreur analyse ${playerId}:`, error);
          return null;
        })
      );
      
      const chunkResults = await Promise.allSettled(promises);
      
      for (const result of chunkResults) {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      }
      
      // Pause entre chunks pour éviter la surcharge
      if (chunks.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`✅ Analyse en lot terminée: ${results.length}/${playerIds.length} réussies`);
    return results;
  }

  // ===================================================================
  // 🎮 GESTIONNAIRES D'ÉVÉNEMENTS SPÉCIALISÉS
  // ===================================================================

  /**
   * Gère une action de joueur
   */
  private async handlePlayerAction(event: GameEvent): Promise<void> {
    const actionData = event.data as PlayerAction;
    
    // Analyse de pattern en temps réel si action critique
    if (this.isCriticalAction(actionData.actionType)) {
      const patterns = await this.patternMatcher.analyzeActionPattern(actionData);
      
      if (patterns.length > 0) {
        // Déclencher réactions immédiates
        const reactions = await this.reactionSystem.triggerPlayerAnalysis(event.playerId);
        
        if (reactions.some(r => r.priority >= 8)) {
          console.log(`🚨 Réaction haute priorité déclenchée pour ${event.playerId}`);
          this.stats.interventionsTriggered++;
        }
      }
    }
  }

  /**
   * Gère une interaction avec un NPC
   */
  private async handleNPCInteraction(event: GameEvent): Promise<void> {
    const interactionData = event.data as NPCInteractionEvent;
    
    // Enregistrer dans la mémoire NPC
    if (this.config.enabledComponents.npcMemory) {
      await this.memoryManager.recordInteraction(interactionData);
    }
    
    // Déclencher analyse si interaction significative
    if (interactionData.outcome === 'negative' || interactionData.interactionType === 'help') {
      this.eventQueue.push(event);
    }
  }

  /**
   * Gère le début de session
   */
  private async handleSessionStart(event: GameEvent): Promise<void> {
    // Enregistrer le joueur pour tracking
    this.actionTracker.registerPlayer(
      event.playerId,
      event.data.playerName || event.playerId,
      event.data.sessionId || `session_${Date.now()}`,
      event.context?.location || { map: 'unknown', x: 0, y: 0 },
      event.context?.playerLevel
    );
    
    // Analyser si joueur de retour après longue absence
    const lastAnalysis = this.analysisCache.get(event.playerId);
    if (!lastAnalysis || Date.now() - lastAnalysis.timestamp > 24 * 60 * 60 * 1000) {
      this.eventQueue.push(event);
    }
  }

  /**
   * Gère la fin de session
   */
  private async handleSessionEnd(event: GameEvent): Promise<void> {
    // Désenregistrer du tracker
    this.actionTracker.unregisterPlayer(event.playerId);
    
    // Générer rapport de session
    if (event.data.sessionId) {
      const sessionReport = await this.actionSummary.generateSessionReport(event.data.sessionId);
      
      if (sessionReport?.mood === 'frustrated') {
        console.log(`😤 Session frustrante détectée pour ${event.playerId}`);
        this.eventQueue.push(event);
      }
    }
  }

  /**
   * Gère un succès/achievement
   */
  private async handleAchievement(event: GameEvent): Promise<void> {
    // Déclencher réactions de félicitations
    const reactions = await this.reactionSystem.triggerPlayerAnalysis(event.playerId);
    
    const congratsReactions = reactions.filter(r => 
      r.content.emotion === 'excited' || r.triggerPattern.patternType === 'skill_progression'
    );
    
    if (congratsReactions.length > 0) {
      console.log(`🎉 Félicitations déclenchées pour ${event.playerId}`);
    }
  }

  /**
   * Gère une erreur de jeu
   */
  private async handleError(event: GameEvent): Promise<void> {
    // Logger l'erreur et déclencher analyse si erreurs répétées
    console.warn(`🐛 Erreur détectée pour ${event.playerId}:`, event.data.error);
    
    // Marquer pour analyse prioritaire
    event.data.priority = 'high';
    this.eventQueue.push(event);
  }

  // ===================================================================
  // 🎯 GÉNÉRATION DE RECOMMANDATIONS
  // ===================================================================

  /**
   * Génère des recommandations basées sur l'analyse
   */
  private generateRecommendations(
    profile: BehaviorProfile | null,
    report: PlayerActivityReport | null,
    patterns: DetectedPattern[],
    reactions: NPCReaction[]
  ) {
    const forPlayer: string[] = [];
    const forNPCs: string[] = [];
    const forGameDesign: string[] = [];

    // Recommandations basées sur les patterns
    for (const pattern of patterns) {
      forPlayer.push(...pattern.recommendations);
    }

    // Recommandations basées sur le profil
    if (profile) {
      if (profile.predictions.churnRisk > 0.7) {
        forPlayer.push("Proposer du contenu plus engageant");
        forNPCs.push("Être extra attentif et encourageant");
        forGameDesign.push("Revoir la courbe de difficulté");
      }
      
      if (profile.personality.socialness < 0.3) {
        forNPCs.push("Respecter la préférence pour le jeu solo");
        forGameDesign.push("Offrir plus de contenu solo");
      }
      
      if (profile.currentState.needsHelp) {
        forNPCs.push("Offrir aide proactive");
        forPlayer.push("Consulter les guides et tutoriels");
      }
    }

    // Recommandations basées sur le rapport
    if (report) {
      if (report.predictions.churnRisk === 'high') {
        forGameDesign.push("Intervention immédiate nécessaire");
        forNPCs.push("Contact prioritaire recommandé");
      }
      
      forPlayer.push(...report.recommendations.forPlayer);
      forNPCs.push(...report.recommendations.forNPCs);
    }

    // Supprimer les doublons
    return {
      forPlayer: [...new Set(forPlayer)],
      forNPCs: [...new Set(forNPCs)],
      forGameDesign: [...new Set(forGameDesign)]
    };
  }

  /**
   * Calcule les métriques de confiance
   */
  private calculateAnalysisConfidence(
    profile: BehaviorProfile | null,
    report: PlayerActivityReport | null,
    patternCount: number
  ) {
    let dataQuality = 0;
    let predictionReliability = 0;
    
    // Qualité des données
    if (report) {
      const actionCount = report.recentActivity.highlights.length + report.recentActivity.concerns.length;
      dataQuality = Math.min(1, actionCount / 20); // Normalisé sur 20 événements
    }
    
    // Fiabilité des prédictions
    if (profile) {
      predictionReliability = profile.confidence;
    }
    
    // Bonus pour patterns détectés
    const patternBonus = Math.min(0.3, patternCount * 0.1);
    
    const overall = (dataQuality * 0.4 + predictionReliability * 0.4 + patternBonus * 0.2);
    
    return {
      overall: Math.min(1, overall),
      dataQuality,
      predictionReliability
    };
  }

  // ===================================================================
  // 🚨 SYSTÈME D'INTERVENTIONS
  // ===================================================================

  /**
   * Déclenche des interventions si nécessaire
   */
  private async triggerInterventionsIfNeeded(analysis: CompletePlayerAnalysis): Promise<void> {
    const { behaviorProfile, detectedPatterns, activityReport } = analysis;
    
    // Intervention pour risque de churn élevé
    if (this.config.notifyOnHighChurnRisk && 
        (behaviorProfile?.predictions.churnRisk > 0.8 || activityReport?.predictions.churnRisk === 'high')) {
      
      await this.triggerChurnPreventionIntervention(analysis);
    }
    
    // Intervention pour pic de frustration
    if (this.config.notifyOnFrustrationSpike) {
      const frustrationPatterns = detectedPatterns.filter(p => p.patternType === 'frustration');
      if (frustrationPatterns.some(p => p.confidence > 0.8)) {
        await this.triggerFrustrationIntervention(analysis);
      }
    }
    
    // Intervention pour comportement inhabituel
    if (this.config.notifyOnUnusualBehavior && analysis.analysisConfidence < 0.3) {
      await this.triggerUnusualBehaviorIntervention(analysis);
    }
  }

  /**
   * Intervention prévention de churn
   */
  private async triggerChurnPreventionIntervention(analysis: CompletePlayerAnalysis): Promise<void> {
    console.log(`🚨 INTERVENTION CHURN: ${analysis.playerId}`);
    
    // Déclencher toutes les réactions NPCs disponibles
    for (const reaction of analysis.npcReactions) {
      if (reaction.priority >= 7) {
        await this.reactionSystem.executeReaction(
          `${reaction.npcId}_${reaction.triggerPattern.timestamp}`,
          analysis.playerId
        );
      }
    }
    
    this.stats.interventionsTriggered++;
  }

  /**
   * Intervention frustration
   */
  private async triggerFrustrationIntervention(analysis: CompletePlayerAnalysis): Promise<void> {
    console.log(`😤 INTERVENTION FRUSTRATION: ${analysis.playerId}`);
    
    // Activer toutes les réactions d'aide
    const helpReactions = analysis.npcReactions.filter(r => 
      r.reactionType === 'proactive_help' || r.content.emotion === 'helpful'
    );
    
    for (const reaction of helpReactions) {
      await this.reactionSystem.executeReaction(
        `${reaction.npcId}_${reaction.triggerPattern.timestamp}`,
        analysis.playerId
      );
    }
    
    this.stats.interventionsTriggered++;
  }

  /**
   * Intervention comportement inhabituel
   */
  private async triggerUnusualBehaviorIntervention(analysis: CompletePlayerAnalysis): Promise<void> {
    console.log(`🤔 COMPORTEMENT INHABITUEL: ${analysis.playerId}`);
    
    // Forcer une nouvelle analyse approfondie
    setTimeout(() => {
      this.analyzePlayer(analysis.playerId, true);
    }, 5 * 60 * 1000); // Dans 5 minutes
  }

  // ===================================================================
  // 🔄 TRAITEMENT PÉRIODIQUE ET MAINTENANCE
  // ===================================================================

  /**
   * Démarre l'analyse périodique
   */
  private startPeriodicAnalysis(): void {
    this.analysisTimer = setInterval(async () => {
      await this.processEventQueue();
    }, this.config.analysisFrequencyMinutes * 60 * 1000);
    
    console.log(`🔄 Analyse périodique démarrée (${this.config.analysisFrequencyMinutes} minutes)`);
  }

  /**
   * Traite la queue des événements
   */
  private async processEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    console.log(`📥 Traitement de ${this.eventQueue.length} événements en queue`);
    
    // Grouper par joueur
    const playerEvents = new Map<string, GameEvent[]>();
    for (const event of this.eventQueue) {
      const events = playerEvents.get(event.playerId) || [];
      events.push(event);
      playerEvents.set(event.playerId, events);
    }
    
    // Analyser chaque joueur
    const playerIds = Array.from(playerEvents.keys()).slice(0, this.config.maxConcurrentAnalyses);
    await this.analyzeBatch(playerIds);
    
    // Vider la queue des événements traités
    this.eventQueue = this.eventQueue.filter(e => !playerIds.includes(e.playerId));
  }

  /**
   * Démarre les tâches de maintenance
   */
  private startMaintenanceTasks(): void {
    this.maintenanceTimer = setInterval(() => {
      this.performMaintenance();
    }, 30 * 60 * 1000); // Toutes les 30 minutes
    
    console.log('🧹 Tâches de maintenance démarrées');
  }

  /**
   * Effectue la maintenance
   */
  private performMaintenance(): void {
    // Nettoyer le cache expiré
    this.cleanupCache();
    
    // Logs de statistiques
    this.logStats();
    
    // Détecter AFK automatiquement
    this.actionTracker.detectAFK();
  }

  // ===================================================================
  // 🛠️ MÉTHODES UTILITAIRES
  // ===================================================================

  /**
   * Détermine si un événement doit être mis en queue pour analyse
   */
  private shouldQueueForAnalysis(event: GameEvent): boolean {
    return event.eventType === 'player_action' || 
           event.eventType === 'npc_interaction' ||
           event.data.priority === 'high';
  }

  /**
   * Détermine si une action est critique
   */
  private isCriticalAction(actionType: ActionType): boolean {
    const criticalActions = [
      ActionType.POKEMON_CAPTURE_FAILURE,
      ActionType.BATTLE_DEFEAT,
      ActionType.ERROR_OCCURRED,
      ActionType.QUEST_ABANDON,
      ActionType.AFK_START
    ];
    
    return criticalActions.includes(actionType);
  }

  /**
   * Divise un tableau en chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // ===================================================================
  // 🗂️ GESTION DU CACHE
  // ===================================================================

  private getCachedAnalysis(playerId: string): CompletePlayerAnalysis | null {
    const expiry = this.cacheExpiry.get(playerId);
    if (expiry && Date.now() > expiry) {
      this.analysisCache.delete(playerId);
      this.cacheExpiry.delete(playerId);
      return null;
    }
    return this.analysisCache.get(playerId) || null;
  }

  private cacheAnalysis(playerId: string, analysis: CompletePlayerAnalysis): void {
    this.analysisCache.set(playerId, analysis);
    this.cacheExpiry.set(playerId, Date.now() + this.config.cacheResultsMinutes * 60 * 1000);
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [playerId, expiry] of this.cacheExpiry) {
      if (now > expiry) {
        this.analysisCache.delete(playerId);
        this.cacheExpiry.delete(playerId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 ${cleanedCount} analyses expirées nettoyées du cache`);
    }
  }

  // ===================================================================
  // 📊 STATISTIQUES ET MONITORING
  // ===================================================================

  private updateStats(analysisTime: number, playerId: string): void {
    this.stats.totalAnalyses++;
    this.stats.averageAnalysisTime = (this.stats.averageAnalysisTime * 0.9) + (analysisTime * 0.1);
    this.stats.playersAnalyzed.add(playerId);
  }

  private logStats(): void {
    const stats = this.getStats();
    console.log(`📊 Intelligence Stats: ${stats.totalAnalyses} analyses, ${stats.playersAnalyzed} joueurs uniques, ${stats.interventionsTriggered} interventions`);
  }

  /**
   * Retourne les statistiques complètes
   */
  getStats() {
    return {
      ...this.stats,
      playersAnalyzed: this.stats.playersAnalyzed.size,
      cachedAnalyses: this.analysisCache.size,
      queuedEvents: this.eventQueue.length,
      processingInProgress: this.processingInProgress.size,
      components: {
        patternMatcher: this.patternMatcher.getPerformanceStats(),
        behaviorAnalyzer: this.behaviorAnalyzer.getStats(),
        memoryManager: this.memoryManager.getStats(),
        reactionSystem: this.reactionSystem.getStats()
      }
    };
  }

  /**
   * État de santé du système
   */
  getHealthStatus() {
    const stats = this.getStats();
    
    return {
      status: stats.processingInProgress < this.config.maxConcurrentAnalyses ? 'healthy' : 'overloaded',
      queueSize: stats.queuedEvents,
      cacheHitRate: stats.components.patternMatcher.cacheHitRate,
      averageResponseTime: stats.averageAnalysisTime,
      enabledComponents: this.config.enabledComponents,
      lastMaintenance: Date.now() // TODO: Tracker vraie heure de maintenance
    };
  }

  /**
   * Nettoyage à la destruction
   */
  destroy(): void {
    if (this.analysisTimer) clearInterval(this.analysisTimer);
    if (this.maintenanceTimer) clearInterval(this.maintenanceTimer);
    
    this.analysisCache.clear();
    this.cacheExpiry.clear();
    this.eventQueue.length = 0;
    this.processingInProgress.clear();
    
    console.log('🎼 IntelligenceOrchestrator détruit');
  }
}

// ===================================================================
// 🏭 SINGLETON ET EXPORTS
// ===================================================================

let orchestratorInstance: IntelligenceOrchestrator | null = null;

/**
 * Récupère l'instance singleton de l'orchestrateur
 */
export function getIntelligenceOrchestrator(): IntelligenceOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new IntelligenceOrchestrator();
  }
  return orchestratorInstance;
}

/**
 * API simplifiée pour analyser un joueur
 */
export async function analyzePlayer(playerId: string): Promise<CompletePlayerAnalysis | null> {
  return getIntelligenceOrchestrator().analyzePlayer(playerId);
}

/**
 * API simplifiée pour traiter un événement de jeu
 */
export async function processGameEvent(event: GameEvent): Promise<void> {
  return getIntelligenceOrchestrator().processGameEvent(event);
}

/**
 * API simplifiée pour enregistrer une action de joueur
 */
export async function trackPlayerAction(
  playerId: string,
  actionType: ActionType,
  actionData: any,
  context?: GameEvent['context']
): Promise<void> {
  const event: GameEvent = {
    eventType: 'player_action',
    playerId,
    timestamp: Date.now(),
    data: { actionType, ...actionData },
    context
  };
  
  return processGameEvent(event);
}

/**
 * Export par défaut
 */
export default IntelligenceOrchestrator;
