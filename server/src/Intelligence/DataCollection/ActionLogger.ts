// server/src/Intelligence/DataCollection/ActionLogger.ts

/**
 * 💾 ACTION LOGGER - SAUVEGARDE INTELLIGENTE EN BASE
 * 
 * Implémente l'interface ActionDatabase du PlayerActionTracker.
 * Sauvegarde toutes les actions en base de données avec optimisations.
 * 
 * RÔLE CRITIQUE : Pont entre le tracking temps réel et la persistance.
 */

import { 
  PlayerActionModel, 
  NPCMemoryModel, 
  BehaviorPatternModel, 
  GameSessionModel,
  type IPlayerActionDocument,
  type IGameSessionDocument 
} from '../Core/DatabaseSchema';

import { 
  PlayerAction, 
  ActionType, 
  ActionCategory,
  CRITICAL_ACTIONS,
  POSITIVE_ACTIONS,
  FRUSTRATION_INDICATORS 
} from '../Core/ActionTypes';

// ===================================================================
// 📊 INTERFACE DATABASE POUR LE TRACKER
// ===================================================================

/**
 * Interface que doit implémenter ActionLogger pour le PlayerActionTracker
 */
interface ActionDatabase {
  saveAction(action: PlayerAction): Promise<boolean>;
  getPlayerActions(playerId: string, limit?: number): Promise<PlayerAction[]>;
  getRecentActions(minutes: number): Promise<PlayerAction[]>;
}

// ===================================================================
// 🔥 CLASSE PRINCIPALE - ACTION LOGGER
// ===================================================================

export class ActionLogger implements ActionDatabase {
  private sessionCache: Map<string, IGameSessionDocument> = new Map();
  private batchStats = {
    totalSaved: 0,
    totalErrors: 0,
    avgSaveTime: 0,
    lastBatchTime: 0
  };

  constructor() {
    console.log('💾 ActionLogger initialisé');
    this.startMaintenanceTasks();
  }

  // ===================================================================
  // 💾 IMPLÉMENTATION INTERFACE ActionDatabase
  // ===================================================================

  /**
   * Sauvegarde une action en base de données
   */
  async saveAction(action: PlayerAction): Promise<boolean> {
    const startTime = Date.now();

    try {
      // Préparer les données pour MongoDB
      const actionData = this.prepareActionForSave(action);
      
      // Sauvegarder l'action principale
      const savedAction = await PlayerActionModel.create(actionData);
      
      // Traitement post-sauvegarde asynchrone
      this.processActionSideEffects(action, savedAction._id.toString());
      
      // Mettre à jour les statistiques
      this.updateBatchStats(Date.now() - startTime, true);
      
      console.log(`✅ Action sauvée: ${action.actionType} (${action.playerId})`);
      return true;

    } catch (error) {
      console.error(`❌ Erreur sauvegarde action:`, error);
      this.updateBatchStats(Date.now() - startTime, false);
      return false;
    }
  }

  /**
   * Récupère les actions d'un joueur
   */
  async getPlayerActions(playerId: string, limit: number = 100): Promise<PlayerAction[]> {
    try {
      const actions = await PlayerActionModel
        .find({ playerId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean(); // Plus rapide, retourne des objets JS purs

      return actions.map(action => this.convertFromDatabase(action));

    } catch (error) {
      console.error(`❌ Erreur lecture actions joueur ${playerId}:`, error);
      return [];
    }
  }

  /**
   * Récupère les actions récentes (toutes)
   */
  async getRecentActions(minutes: number): Promise<PlayerAction[]> {
    try {
      const cutoffTime = Date.now() - (minutes * 60 * 1000);
      
      const actions = await PlayerActionModel
        .find({ timestamp: { $gte: cutoffTime } })
        .sort({ timestamp: -1 })
        .limit(1000) // Limite pour éviter la surcharge
        .lean();

      return actions.map(action => this.convertFromDatabase(action));

    } catch (error) {
      console.error(`❌ Erreur lecture actions récentes:`, error);
      return [];
    }
  }

  // ===================================================================
  // 🛠️ PRÉPARATION ET CONVERSION DES DONNÉES
  // ===================================================================

  /**
   * Prépare une action pour la sauvegarde en base
   */
  private prepareActionForSave(action: PlayerAction): any {
    return {
      playerId: action.playerId,
      actionType: action.actionType,
      category: action.category,
      timestamp: action.timestamp,
      data: action.data,
      metadata: {
        ...action.metadata,
        processed: false, // Sera analysé plus tard par l'IA
        analysisResults: {} // Résultats d'analyse vides au début
      },
      searchText: this.generateSearchText(action) // Pour la recherche textuelle
    };
  }

  /**
   * Convertit une action de la base vers le format TypeScript
   */
  private convertFromDatabase(dbAction: any): PlayerAction {
    return {
      id: dbAction._id.toString(),
      playerId: dbAction.playerId,
      actionType: dbAction.actionType as ActionType,
      category: dbAction.category as ActionCategory,
      timestamp: dbAction.timestamp,
      data: dbAction.data,
      metadata: dbAction.metadata
    };
  }

  /**
   * Génère du texte de recherche pour l'indexation
   */
  private generateSearchText(action: PlayerAction): string {
    const data = action.data as any; // Type assertion pour accéder aux propriétés spécifiques
    
    const parts = [
      action.actionType,
      action.category,
      data.playerName,
      data.location?.map,
      data.pokemon?.species,
      data.opponent,
      data.itemName,
      data.questName,
      data.itemId,
      data.questId
    ].filter(Boolean);

    return parts.join(' ').toLowerCase();
  }

  // ===================================================================
  // 🔄 TRAITEMENT POST-SAUVEGARDE (SIDE EFFECTS)
  // ===================================================================

  /**
   * Traite les effets de bord après sauvegarde d'une action
   */
  private async processActionSideEffects(action: PlayerAction, actionId: string): Promise<void> {
    // Traitement asynchrone pour ne pas ralentir la sauvegarde principale
    setImmediate(async () => {
      try {
        // Mettre à jour la session de jeu
        await this.updateGameSession(action);
        
        // Traiter les actions critiques immédiatement
        if (CRITICAL_ACTIONS.includes(action.actionType)) {
          await this.processCriticalAction(action, actionId);
        }
        
        // Détecter les patterns simples en temps réel
        if (this.shouldAnalyzePattern(action)) {
          await this.quickPatternAnalysis(action);
        }

      } catch (error) {
        console.error(`❌ Erreur traitement side effects:`, error);
      }
    });
  }

  /**
   * Met à jour les statistiques de session de jeu
   */
  private async updateGameSession(action: PlayerAction): Promise<void> {
    const sessionId = action.data.sessionId;
    
    try {
      // Récupérer ou créer la session depuis le cache
      let session = this.sessionCache.get(sessionId);
      
      if (!session) {
        // Essayer de récupérer depuis la BDD
        session = await GameSessionModel.findOne({ sessionId });
        
        if (!session) {
          // Créer une nouvelle session
          session = await GameSessionModel.create({
            sessionId,
            playerId: action.playerId,
            playerName: action.data.playerName,
            startTime: action.timestamp,
            stats: {
              totalActions: 0,
              actionsByCategory: {},
              locationsVisited: [],
              pokemonEncountered: 0,
              battlesWon: 0,
              battlesLost: 0,
              questsCompleted: 0,
              socialInteractions: 0
            },
            analysis: {
              mood: 'neutral',
              productivity: 0.5,
              socialness: 0.5,
              skillDisplay: 0.5,
              patterns: []
            }
          });
        }
        
        this.sessionCache.set(sessionId, session);
      }

      // Mettre à jour les statistiques
      session.stats.totalActions++;
      session.stats.actionsByCategory[action.category] = 
        (session.stats.actionsByCategory[action.category] || 0) + 1;

      // Ajouter la localisation si nouvelle
      const currentMap = action.data.location?.map;
      if (currentMap && !session.stats.locationsVisited.includes(currentMap)) {
        session.stats.locationsVisited.push(currentMap);
      }

      // Statistiques spécifiques selon le type d'action
      switch (action.actionType) {
        case ActionType.POKEMON_ENCOUNTER:
          session.stats.pokemonEncountered++;
          break;
        case ActionType.BATTLE_VICTORY:
          session.stats.battlesWon++;
          break;
        case ActionType.BATTLE_DEFEAT:
          session.stats.battlesLost++;
          break;
        case ActionType.QUEST_COMPLETE:
          session.stats.questsCompleted++;
          break;
        case ActionType.PLAYER_MESSAGE:
        case ActionType.FRIEND_ADD:
        case ActionType.TRADE_COMPLETE:
          session.stats.socialInteractions++;
          break;
      }

      // Analyse basique de l'humeur
      if (POSITIVE_ACTIONS.includes(action.actionType)) {
        session.analysis.mood = 'happy';
      } else if (FRUSTRATION_INDICATORS.includes(action.actionType)) {
        session.analysis.mood = 'frustrated';
      }

      // Sauvegarder la session mise à jour
      await session.save();

    } catch (error) {
      console.error(`❌ Erreur mise à jour session ${sessionId}:`, error);
    }
  }

  /**
   * Traite immédiatement les actions critiques
   */
  private async processCriticalAction(action: PlayerAction, actionId: string): Promise<void> {
    console.log(`🚨 Action critique détectée: ${action.actionType} pour ${action.data.playerName}`);
    
    try {
      // Marquer l'action comme nécessitant une analyse prioritaire
      await PlayerActionModel.updateOne(
        { _id: actionId },
        { 
          $set: { 
            'metadata.processed': false,
            'metadata.tags': ['critical', 'priority_analysis']
          }
        }
      );

      // TODO: Déclencher analyse immédiate par l'IA
      // → Sera implémenté dans les phases suivantes
      
    } catch (error) {
      console.error(`❌ Erreur traitement action critique:`, error);
    }
  }

  /**
   * Détermine si une action doit déclencher une analyse de pattern
   */
  private shouldAnalyzePattern(action: PlayerAction): boolean {
    // Analyser seulement certains types d'actions pour la performance
    const patternTriggers = [
      ActionType.POKEMON_CAPTURE_FAILURE,
      ActionType.BATTLE_DEFEAT,
      ActionType.QUEST_ABANDON,
      ActionType.AFK_START,
      ActionType.PLAYER_MOVE
    ];

    return patternTriggers.includes(action.actionType);
  }

  /**
   * Analyse rapide de patterns en temps réel
   */
  private async quickPatternAnalysis(action: PlayerAction): Promise<void> {
    try {
      // Récupérer les 10 dernières actions du même type
      const recentActions = await PlayerActionModel
        .find({ 
          playerId: action.playerId,
          actionType: action.actionType 
        })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();

      // Détecter pattern simple : 3+ échecs consécutifs
      if (FRUSTRATION_INDICATORS.includes(action.actionType) && recentActions.length >= 3) {
        const recentFailures = recentActions.slice(0, 3);
        const timeSpan = recentFailures[0].timestamp - recentFailures[2].timestamp;
        
        // Si 3 échecs en moins de 5 minutes = pattern de frustration
        if (timeSpan < 5 * 60 * 1000) {
          await this.recordBehaviorPattern(action.playerId, 'frustration_burst', {
            confidence: 0.8,
            actions: recentFailures.map(a => a._id.toString()),
            timeSpan
          });
        }
      }

    } catch (error) {
      console.error(`❌ Erreur analyse pattern rapide:`, error);
    }
  }

  /**
   * Enregistre un pattern comportemental détecté
   */
  private async recordBehaviorPattern(
    playerId: string, 
    patternType: string, 
    patternData: any
  ): Promise<void> {
    try {
      await BehaviorPatternModel.create({
        playerId,
        patternType,
        pattern: {
          name: patternType,
          description: `Pattern détecté automatiquement: ${patternType}`,
          confidence: patternData.confidence || 0.5,
          frequency: 1,
          triggers: {},
          stats: {
            firstObserved: Date.now(),
            lastObserved: Date.now(),
            totalOccurrences: 1
          }
        },
        relatedActions: patternData.actions || [],
        predictions: {},
        isActive: true,
        lastAnalyzed: Date.now()
      });

      console.log(`🧠 Pattern enregistré: ${patternType} pour ${playerId}`);

    } catch (error) {
      console.error(`❌ Erreur enregistrement pattern:`, error);
    }
  }

  // ===================================================================
  // 📊 STATISTIQUES ET MONITORING
  // ===================================================================

  /**
   * Met à jour les statistiques de performance
   */
  private updateBatchStats(duration: number, success: boolean): void {
    if (success) {
      this.batchStats.totalSaved++;
      // Moyenne mobile pour le temps de sauvegarde
      this.batchStats.avgSaveTime = 
        (this.batchStats.avgSaveTime * 0.9) + (duration * 0.1);
    } else {
      this.batchStats.totalErrors++;
    }
    
    this.batchStats.lastBatchTime = Date.now();
  }

  /**
   * Retourne les statistiques de performance
   */
  getPerformanceStats(): {
    totalSaved: number;
    totalErrors: number;
    successRate: number;
    avgSaveTime: number;
    cachedSessions: number;
  } {
    const total = this.batchStats.totalSaved + this.batchStats.totalErrors;
    const successRate = total > 0 ? this.batchStats.totalSaved / total : 1;

    return {
      totalSaved: this.batchStats.totalSaved,
      totalErrors: this.batchStats.totalErrors,
      successRate: Math.round(successRate * 100) / 100,
      avgSaveTime: Math.round(this.batchStats.avgSaveTime * 100) / 100,
      cachedSessions: this.sessionCache.size
    };
  }

  // ===================================================================
  // 🧹 MAINTENANCE ET OPTIMISATION
  // ===================================================================

  /**
   * Lance les tâches de maintenance en arrière-plan
   */
  private startMaintenanceTasks(): void {
    // Nettoyage du cache des sessions toutes les 30 minutes
    setInterval(() => {
      this.cleanupSessionCache();
    }, 30 * 60 * 1000);

    // Statistiques toutes les 5 minutes
    setInterval(() => {
      this.logPerformanceStats();
    }, 5 * 60 * 1000);

    console.log('🧹 Tâches de maintenance démarrées');
  }

  /**
   * Nettoie le cache des sessions inactives
   */
  private cleanupSessionCache(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 heure
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessionCache) {
      if (now - session.updatedAt.getTime() > maxAge) {
        this.sessionCache.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cache nettoyé: ${cleanedCount} sessions supprimées`);
    }
  }

  /**
   * Affiche les statistiques de performance
   */
  private logPerformanceStats(): void {
    const stats = this.getPerformanceStats();
    console.log(`📊 ActionLogger Stats: ${stats.totalSaved} saved, ${stats.successRate * 100}% success, ${stats.avgSaveTime}ms avg`);
  }

  // ===================================================================
  // 🔧 MÉTHODES AVANCÉES POUR L'IA
  // ===================================================================

  /**
   * Récupère les actions par catégorie pour analyse
   */
  async getActionsByCategory(
    playerId: string, 
    category: ActionCategory, 
    limit: number = 50
  ): Promise<PlayerAction[]> {
    try {
      const actions = await PlayerActionModel
        .find({ playerId, category })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      return actions.map(action => this.convertFromDatabase(action));

    } catch (error) {
      console.error(`❌ Erreur lecture actions par catégorie:`, error);
      return [];
    }
  }

  /**
   * Recherche d'actions par texte (pour l'IA)
   */
  async searchActions(query: string, limit: number = 20): Promise<PlayerAction[]> {
    try {
      const actions = await PlayerActionModel
        .find({ $text: { $search: query } })
        .sort({ score: { $meta: 'textScore' }, timestamp: -1 })
        .limit(limit)
        .lean();

      return actions.map(action => this.convertFromDatabase(action));

    } catch (error) {
      console.error(`❌ Erreur recherche actions:`, error);
      return [];
    }
  }

  /**
   * Marque une action comme analysée par l'IA
   */
  async markActionAsProcessed(
    actionId: string, 
    analysisResults: any
  ): Promise<boolean> {
    try {
      await PlayerActionModel.updateOne(
        { _id: actionId },
        { 
          $set: { 
            'metadata.processed': true,
            'metadata.analysisResults': analysisResults
          }
        }
      );
      return true;

    } catch (error) {
      console.error(`❌ Erreur marquage action comme traitée:`, error);
      return false;
    }
  }

  /**
   * Récupère les actions non traitées pour l'IA
   */
  async getUnprocessedActions(limit: number = 100): Promise<PlayerAction[]> {
    try {
      const actions = await PlayerActionModel
        .find({ 'metadata.processed': false })
        .sort({ timestamp: 1 }) // Plus anciennes en premier
        .limit(limit)
        .lean();

      return actions.map(action => this.convertFromDatabase(action));

    } catch (error) {
      console.error(`❌ Erreur lecture actions non traitées:`, error);
      return [];
    }
  }

  /**
   * Nettoyage propre à la destruction
   */
  destroy(): void {
    // Sauvegarder toutes les sessions en cache
    for (const session of this.sessionCache.values()) {
      session.save().catch(console.error);
    }
    
    this.sessionCache.clear();
    console.log('💾 ActionLogger détruit proprement');
  }
}

// ===================================================================
// 🏭 SINGLETON POUR UTILISATION GLOBALE
// ===================================================================

let loggerInstance: ActionLogger | null = null;

/**
 * Récupère l'instance singleton du logger
 */
export function getActionLogger(): ActionLogger {
  if (!loggerInstance) {
    loggerInstance = new ActionLogger();
  }
  return loggerInstance;
}

/**
 * Export par défaut
 */
export default ActionLogger;
