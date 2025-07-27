// server/src/Intelligence/Core/PlayerActionTracker.ts

/**
 * 🎯 PLAYER ACTION TRACKER - CŒUR DU SYSTÈME D'INTELLIGENCE
 * 
 * Ce système capture TOUTES les actions des joueurs en temps réel.
 * C'est le pont entre les événements du jeu et la base de données d'IA.
 * 
 * PRIORITÉ ABSOLUE : Sans ce système, aucune IA n'est possible !
 */

import { v4 as uuidv4 } from 'uuid';
import { ActionType, ActionCategory, PlayerAction, createBaseAction, getCategoryForActionType } from './ActionTypes';
import type { 
  PokemonActionData, 
  CombatActionData, 
  MovementActionData, 
  InventoryActionData,
  QuestActionData,
  SocialActionData,
  EconomyActionData,
  BaseActionData 
} from './ActionTypes';

// ===================================================================
// 🗄️ INTERFACE AVEC LA BASE DE DONNÉES
// ===================================================================

/**
 * Interface pour sauvegarder les actions en BDD
 * (sera implémentée avec MongoDB/GoDB)
 */
interface ActionDatabase {
  saveAction(action: PlayerAction): Promise<boolean>;
  getPlayerActions(playerId: string, limit?: number): Promise<PlayerAction[]>;
  getRecentActions(minutes: number): Promise<PlayerAction[]>;
}

// ===================================================================
// 🎮 CONTEXTE JOUEUR EN TEMPS RÉEL
// ===================================================================

/**
 * Informations contextuelles du joueur pour enrichir les actions
 */
interface PlayerContext {
  playerId: string;
  playerName: string;
  sessionId: string;
  currentLocation: {
    map: string;
    x: number;
    y: number;
  };
  sessionStartTime: number;
  level?: number;
  friendsOnline?: string[];
  lastActionTime?: number;
}

// ===================================================================
// 🔥 CLASSE PRINCIPALE - PLAYER ACTION TRACKER
// ===================================================================

export class PlayerActionTracker {
  private database: ActionDatabase | null = null;
  private playerContexts: Map<string, PlayerContext> = new Map();
  private actionQueue: PlayerAction[] = [];
  private batchProcessingTimer: NodeJS.Timeout | null = null;
  private isEnabled: boolean = true;
  
  // Configuration
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_INTERVAL_MS = 5000; // 5 secondes
  private readonly MAX_QUEUE_SIZE = 1000;

  constructor() {
    console.log('🎯 PlayerActionTracker initialisé');
    this.startBatchProcessing();
  }

  // ===================================================================
  // 🔌 CONFIGURATION ET INITIALISATION
  // ===================================================================

  /**
   * Configure la base de données pour sauvegarder les actions
   */
  setDatabase(database: ActionDatabase): void {
    this.database = database;
    console.log('📀 Base de données connectée au PlayerActionTracker');
  }

  /**
   * Active/désactive le tracking (pour debug)
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`${enabled ? '✅' : '❌'} PlayerActionTracker ${enabled ? 'activé' : 'désactivé'}`);
  }

  // ===================================================================
  // 👤 GESTION DU CONTEXTE JOUEUR
  // ===================================================================

  /**
   * Enregistre un nouveau joueur pour le tracking
   */
  registerPlayer(
    playerId: string, 
    playerName: string, 
    sessionId: string,
    location: { map: string; x: number; y: number },
    level?: number
  ): void {
    const context: PlayerContext = {
      playerId,
      playerName,
      sessionId,
      currentLocation: { ...location },
      sessionStartTime: Date.now(),
      level,
      friendsOnline: []
    };

    this.playerContexts.set(playerId, context);
    console.log(`👤 Joueur ${playerName} (${playerId}) enregistré pour tracking`);

    // Enregistrer l'action de début de session
    this.trackAction(playerId, ActionType.SESSION_START, {});
  }

  /**
   * Désenregistre un joueur (déconnexion)
   */
  unregisterPlayer(playerId: string): void {
    const context = this.playerContexts.get(playerId);
    if (context) {
      // Enregistrer l'action de fin de session
      this.trackAction(playerId, ActionType.SESSION_END, {
        sessionDuration: Date.now() - context.sessionStartTime
      });
      
      this.playerContexts.delete(playerId);
      console.log(`👤 Joueur ${context.playerName} désenregistré du tracking`);
    }
  }

  /**
   * Met à jour la position d'un joueur
   */
  updatePlayerLocation(playerId: string, location: { map: string; x: number; y: number }): void {
    const context = this.playerContexts.get(playerId);
    if (context) {
      const previousLocation = { ...context.currentLocation };
      context.currentLocation = { ...location };

      // Si changement de carte, enregistrer l'action
      if (previousLocation.map !== location.map) {
        this.trackMovement(playerId, previousLocation, location, 'teleport');
      }
    }
  }

  /**
   * Met à jour la liste d'amis en ligne
   */
  updatePlayerFriends(playerId: string, friendsOnline: string[]): void {
    const context = this.playerContexts.get(playerId);
    if (context) {
      context.friendsOnline = [...friendsOnline];
    }
  }

  // ===================================================================
  // 📝 MÉTHODES DE TRACKING PRINCIPALES
  // ===================================================================

  /**
   * Méthode générique pour tracker toute action
   */
  trackAction(
    playerId: string, 
    actionType: ActionType, 
    actionData: Partial<any>,
    customLocation?: { map: string; x: number; y: number }
  ): void {
    if (!this.isEnabled) return;

    const context = this.playerContexts.get(playerId);
    if (!context) {
      console.warn(`⚠️ Contexte joueur non trouvé pour ${playerId}`);
      return;
    }

    const location = customLocation || context.currentLocation;
    const baseAction = createBaseAction(
      playerId, 
      context.playerName, 
      actionType, 
      location, 
      context.sessionId
    );

    // Enrichir avec contexte
    const enrichedData: BaseActionData = {
      ...actionData,
      timestamp: Date.now(),
      sessionId: context.sessionId,
      playerId,
      playerName: context.playerName,
      location,
      context: {
        friendsOnline: context.friendsOnline,
        playerLevel: context.level,
        sessionDuration: Date.now() - context.sessionStartTime,
        timeOfDay: this.getTimeOfDay(),
        weather: 'sunny' // TODO: Intégrer système météo
      }
    };

    const fullAction: PlayerAction = {
      ...baseAction,
      id: uuidv4(),
      data: enrichedData
    };

    // Ajouter à la queue pour traitement par lot
    this.addToQueue(fullAction);

    // Mettre à jour le timestamp de dernière action
    context.lastActionTime = Date.now();

    console.log(`📝 Action trackée: ${context.playerName} -> ${actionType}`);
  }

  // ===================================================================
  // 🎮 MÉTHODES SPÉCIALISÉES PAR TYPE D'ACTION
  // ===================================================================

  /**
   * Tracker les actions Pokémon
   */
  trackPokemonAction(
    playerId: string,
    actionType: ActionType,
    pokemonData: {
      species?: string;
      level?: number;
      isShiny?: boolean;
      success?: boolean;
      pokeball?: string;
      attempts?: number;
      reason?: string;
    }
  ): void {
    const data: Partial<PokemonActionData> = {
      pokemon: pokemonData.species ? {
        species: pokemonData.species,
        level: pokemonData.level || 1,
        isShiny: pokemonData.isShiny || false
      } : undefined,
      pokeball: pokemonData.pokeball,
      success: pokemonData.success,
      attempts: pokemonData.attempts,
      reason: pokemonData.reason
    };

    this.trackAction(playerId, actionType, data);
  }

  /**
   * Tracker les actions de combat
   */
  trackCombatAction(
    playerId: string,
    actionType: ActionType,
    combatData: {
      battleType: 'wild' | 'trainer' | 'pvp' | 'gym';
      opponent?: string;
      playerTeam?: string[];
      move?: string;
      damage?: number;
      result?: 'victory' | 'defeat' | 'draw' | 'ongoing';
      duration?: number;
      turnsCount?: number;
    }
  ): void {
    const data: Partial<CombatActionData> = {
      battleType: combatData.battleType,
      opponent: combatData.opponent,
      playerTeam: combatData.playerTeam || [],
      move: combatData.move,
      damage: combatData.damage,
      result: combatData.result,
      duration: combatData.duration,
      turnsCount: combatData.turnsCount
    };

    this.trackAction(playerId, actionType, data);
  }

  /**
   * Tracker les mouvements
   */
  trackMovement(
    playerId: string,
    fromLocation: { map: string; x: number; y: number },
    toLocation: { map: string; x: number; y: number },
    method: 'walk' | 'run' | 'bike' | 'surf' | 'teleport' = 'walk'
  ): void {
    const distance = Math.sqrt(
      Math.pow(toLocation.x - fromLocation.x, 2) + 
      Math.pow(toLocation.y - fromLocation.y, 2)
    );

    const data: Partial<MovementActionData> = {
      fromLocation,
      toLocation,
      distance,
      method
    };

    const actionType = fromLocation.map !== toLocation.map ? 
      ActionType.MAP_CHANGE : ActionType.PLAYER_MOVE;

    this.trackAction(playerId, actionType, data, toLocation);
  }

  /**
   * Tracker les actions d'inventaire
   */
  trackInventoryAction(
    playerId: string,
    actionType: ActionType,
    itemData: {
      itemId: string;
      itemName: string;
      quantity: number;
      category?: string;
      target?: string;
      effect?: string;
    }
  ): void {
    const data: Partial<InventoryActionData> = {
      itemId: itemData.itemId,
      itemName: itemData.itemName,
      quantity: itemData.quantity,
      category: itemData.category,
      target: itemData.target,
      effect: itemData.effect
    };

    this.trackAction(playerId, actionType, data);
  }

  /**
   * Tracker les actions de quête
   */
  trackQuestAction(
    playerId: string,
    actionType: ActionType,
    questData: {
      questId: string;
      questName: string;
      questType?: string;
      progress?: number;
      reward?: any;
      npcId?: string;
    }
  ): void {
    const data: Partial<QuestActionData> = {
      questId: questData.questId,
      questName: questData.questName,
      questType: questData.questType,
      progress: questData.progress,
      reward: questData.reward,
      npcId: questData.npcId
    };

    this.trackAction(playerId, actionType, data);
  }

  /**
   * Tracker les actions sociales
   */
  trackSocialAction(
    playerId: string,
    actionType: ActionType,
    socialData: {
      targetPlayer?: string;
      message?: string;
      channelType?: 'whisper' | 'local' | 'guild' | 'global';
      guildId?: string;
      tradeItems?: any;
    }
  ): void {
    const data: Partial<SocialActionData> = {
      targetPlayer: socialData.targetPlayer,
      message: socialData.message,
      channelType: socialData.channelType,
      guildId: socialData.guildId,
      tradeItems: socialData.tradeItems
    };

    this.trackAction(playerId, actionType, data);
  }

  /**
   * Tracker les actions économiques
   */
  trackEconomyAction(
    playerId: string,
    actionType: ActionType,
    economyData: {
      itemId?: string;
      quantity?: number;
      price?: number;
      totalCost?: number;
      goldBefore?: number;
      goldAfter?: number;
      shopId?: string;
    }
  ): void {
    const data: Partial<EconomyActionData> = {
      itemId: economyData.itemId,
      quantity: economyData.quantity,
      price: economyData.price,
      totalCost: economyData.totalCost,
      goldBefore: economyData.goldBefore,
      goldAfter: economyData.goldAfter,
      shopId: economyData.shopId
    };

    this.trackAction(playerId, actionType, data);
  }

  // ===================================================================
  // 🔄 TRAITEMENT PAR LOTS ET PERFORMANCE
  // ===================================================================

  /**
   * Ajoute une action à la queue de traitement
   */
  private addToQueue(action: PlayerAction): void {
    this.actionQueue.push(action);

    // Limiter la taille de la queue
    if (this.actionQueue.length > this.MAX_QUEUE_SIZE) {
      console.warn(`⚠️ Queue d'actions pleine, suppression des plus anciennes`);
      this.actionQueue = this.actionQueue.slice(-this.MAX_QUEUE_SIZE);
    }

    // Traitement immédiat si queue pleine
    if (this.actionQueue.length >= this.BATCH_SIZE) {
      this.processBatch();
    }
  }

  /**
   * Lance le traitement par lots en arrière-plan
   */
  private startBatchProcessing(): void {
    this.batchProcessingTimer = setInterval(() => {
      if (this.actionQueue.length > 0) {
        this.processBatch();
      }
    }, this.BATCH_INTERVAL_MS);

    console.log(`🔄 Traitement par lots démarré (${this.BATCH_INTERVAL_MS}ms)`);
  }

  /**
   * Traite un lot d'actions
   */
  private async processBatch(): Promise<void> {
    if (this.actionQueue.length === 0 || !this.database) return;

    const batch = this.actionQueue.splice(0, this.BATCH_SIZE);
    console.log(`📦 Traitement lot de ${batch.length} actions`);

    try {
      // Sauvegarder toutes les actions du lot
      const promises = batch.map(action => this.database!.saveAction(action));
      const results = await Promise.allSettled(promises);

      // Compter les succès et échecs
      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;

      console.log(`✅ Lot traité: ${successes} succès, ${failures} échecs`);

      if (failures > 0) {
        console.error(`❌ Échecs de sauvegarde:`, 
          results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason)
        );
      }
    } catch (error) {
      console.error(`❌ Erreur traitement lot:`, error);
      // Remettre les actions en queue en cas d'erreur
      this.actionQueue.unshift(...batch);
    }
  }

  // ===================================================================
  // 🛠️ UTILITAIRES
  // ===================================================================

  /**
   * Détecte AFK automatiquement
   */
  detectAFK(): void {
    const now = Date.now();
    const AFK_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    for (const [playerId, context] of this.playerContexts) {
      if (context.lastActionTime && 
          (now - context.lastActionTime) > AFK_THRESHOLD) {
        
        this.trackAction(playerId, ActionType.AFK_START, {
          inactivityDuration: now - context.lastActionTime
        });
        
        // Marquer comme AFK pour éviter les doublons
        context.lastActionTime = undefined;
      }
    }
  }

  /**
   * Retourne l'heure de la journée
   */
  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Statistiques du tracker
   */
  getStats(): {
    playersTracked: number;
    actionsInQueue: number;
    isEnabled: boolean;
    uptime: number;
  } {
    return {
      playersTracked: this.playerContexts.size,
      actionsInQueue: this.actionQueue.length,
      isEnabled: this.isEnabled,
      uptime: Date.now() - (this.playerContexts.values().next().value?.sessionStartTime || Date.now())
    };
  }

  /**
   * Nettoyage à la destruction
   */
  destroy(): void {
    if (this.batchProcessingTimer) {
      clearInterval(this.batchProcessingTimer);
    }
    
    // Traitement final des actions en attente
    if (this.actionQueue.length > 0) {
      this.processBatch();
    }

    console.log('🎯 PlayerActionTracker détruit');
  }
}

// ===================================================================
// 🏭 SINGLETON POUR UTILISATION GLOBALE
// ===================================================================

let trackerInstance: PlayerActionTracker | null = null;

/**
 * Récupère l'instance singleton du tracker
 */
export function getActionTracker(): PlayerActionTracker {
  if (!trackerInstance) {
    trackerInstance = new PlayerActionTracker();
  }
  return trackerInstance;
}

/**
 * Raccourci pour tracker une action rapidement
 */
export function trackPlayerAction(
  playerId: string,
  actionType: ActionType,
  data: any = {}
): void {
  getActionTracker().trackAction(playerId, actionType, data);
}

/**
 * Export par défaut
 */
export default PlayerActionTracker;
