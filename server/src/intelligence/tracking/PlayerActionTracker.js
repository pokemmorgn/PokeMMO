// server/src/intelligence/tracking/PlayerActionTracker.js

import { ActionType, ANALYSIS_THRESHOLDS } from '../types/ActionTypes.js';
import { PlayerData } from '../../models/PlayerData.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 🧠 PLAYER ACTION TRACKER - Le système nerveux de l'IA NPCs
 * 
 * Capture et enregistre TOUTES les actions des joueurs en temps réel.
 * Base fondamentale pour rendre les NPCs intelligents et réactifs.
 * 
 * Performance: < 50ms par action
 * Intégration: Compatible avec Colyseus + ServiceRegistry existant
 */

export class PlayerActionTracker {
  constructor() {
    this.isEnabled = true;
    this.actionQueue = new Map(); // Cache temporaire pour optimiser la performance
    this.sessionData = new Map(); // Données de session active
    this.flushInterval = 5000; // Flush la queue toutes les 5 secondes
    
    // Statistiques pour monitoring
    this.stats = {
      actionsTracked: 0,
      actionsFailed: 0,
      averageProcessingTime: 0,
      lastFlush: Date.now()
    };
    
    // Démarrer le système de flush automatique
    this.startAutoFlush();
    
    console.log('🧠 PlayerActionTracker initialisé - Prêt à capturer les actions!');
  }

  // ===== MÉTHODE PRINCIPALE : TRACKER UNE ACTION =====
  /**
   * Enregistre une action joueur avec validation et contexte automatique
   * @param {string} playerId - ID du joueur
   * @param {ActionType} actionType - Type d'action
   * @param {Object} actionData - Données spécifiques de l'action
   * @param {Object} worldRoom - Référence à la room pour le contexte
   */
  async trackAction(playerId, actionType, actionData = {}, worldRoom = null) {
    if (!this.isEnabled) return false;
    
    const startTime = performance.now();
    
    try {
      // 1. Validation rapide des données d'entrée
      if (!this.validateInput(playerId, actionType)) {
        this.stats.actionsFailed++;
        return false;
      }

      // 2. Construire l'action complète avec contexte
      const action = await this.buildCompleteAction(playerId, actionType, actionData, worldRoom);
      
      // 3. Ajouter à la queue pour traitement batch (performance)
      this.addToQueue(action);
      
      // 4. Mettre à jour les données de session
      this.updateSessionData(playerId, action);
      
      // 5. Traitement temps réel critique (détection frustration, etc.)
      this.processRealTimeAnalysis(action, worldRoom);
      
      const processingTime = performance.now() - startTime;
      this.updateStats(processingTime, true);
      
      return true;
      
    } catch (error) {
      console.error(`❌ Erreur tracking action ${actionType} pour ${playerId}:`, error);
      this.stats.actionsFailed++;
      return false;
    }
  }

  // ===== CONSTRUCTION D'ACTION COMPLÈTE =====
  async buildCompleteAction(playerId, actionType, actionData, worldRoom) {
    const timestamp = Date.now();
    const sessionId = this.getOrCreateSessionId(playerId);
    
    // Construire le contexte environnemental
    const context = await this.buildActionContext(playerId, worldRoom);
    
    // Action de base
    const action = {
      id: uuidv4(),
      playerId,
      actionType,
      timestamp,
      sessionId,
      
      // Données enrichies selon le type d'action
      data: {
        ...actionData,
        playerId,
        actionType,
        timestamp,
        sessionId
      },
      
      context,
      
      metadata: {
        processingTime: 0, // Sera calculé après traitement
        analysisComplete: false,
        flagged: false,
        patterns: []
      }
    };
    
    return action;
  }

  // ===== CONSTRUCTION DU CONTEXTE =====
  async buildActionContext(playerId, worldRoom) {
    const context = {
      // Contexte temporel
      timeOfDay: this.getTimeOfDay(),
      dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      
      // Valeurs par défaut
      currentMap: 'unknown',
      zone: null,
      nearbyPlayers: [],
      nearbyNPCs: [],
      isAlone: true,
      friendsOnline: 0,
      currentGold: 0,
      currentLevel: 1,
      teamSize: 0,
      inventoryFull: false,
      recentFailures: 0,
      consecutiveActions: 1,
      idleTime: 0
    };

    try {
      // Enrichir avec données WorldRoom si disponible
      if (worldRoom && worldRoom.state && worldRoom.state.players) {
        const player = worldRoom.state.players.get(playerId);
        if (player) {
          context.currentMap = player.mapName || 'unknown';
          context.nearbyPlayers = this.findNearbyPlayers(player, worldRoom.state.players);
          context.isAlone = context.nearbyPlayers.length === 0;
        }
      }
      
      // Enrichir avec données PlayerData
      const playerData = await PlayerData.findOne({ username: playerId });
      if (playerData) {
        context.currentGold = playerData.gold || 0;
        context.currentLevel = playerData.level || 1;
        context.teamSize = playerData.team ? playerData.team.length : 0;
      }
      
      // Analyser données de session pour patterns
      const sessionData = this.sessionData.get(playerId);
      if (sessionData) {
        context.recentFailures = this.countRecentFailures(sessionData.recentActions);
        context.consecutiveActions = this.countConsecutiveActions(sessionData.recentActions);
        context.idleTime = timestamp - (sessionData.lastActionTime || timestamp);
      }
      
    } catch (error) {
      console.warn(`⚠️ Erreur construction contexte pour ${playerId}:`, error);
      // Contexte par défaut en cas d'erreur
    }
    
    return context;
  }

  // ===== GESTION DES SESSIONS =====
  getOrCreateSessionId(playerId) {
    const existing = this.sessionData.get(playerId);
    if (existing && existing.sessionId) {
      return existing.sessionId;
    }
    
    const newSessionId = `session_${playerId}_${Date.now()}`;
    this.initializeSession(playerId, newSessionId);
    return newSessionId;
  }

  initializeSession(playerId, sessionId) {
    this.sessionData.set(playerId, {
      sessionId,
      startTime: Date.now(),
      lastActionTime: Date.now(),
      actionsCount: 0,
      recentActions: [], // Dernières 20 actions pour analyse
      patterns: new Set(),
      frustrationLevel: 0
    });
    
    // Tracker automatiquement le début de session
    this.trackAction(playerId, ActionType.SESSION_START, { sessionId });
  }

  updateSessionData(playerId, action) {
    const session = this.sessionData.get(playerId);
    if (!session) return;
    
    session.lastActionTime = action.timestamp;
    session.actionsCount++;
    
    // Maintenir un historique des 20 dernières actions
    session.recentActions.push({
      type: action.actionType,
      timestamp: action.timestamp,
      success: action.data.success !== false // Par défaut true sauf si explicitement false
    });
    
    if (session.recentActions.length > 20) {
      session.recentActions.shift(); // Supprimer la plus ancienne
    }
  }

  // ===== ANALYSE TEMPS RÉEL =====
  processRealTimeAnalysis(action, worldRoom) {
    try {
      // 1. Détection de frustration immédiate
      if (this.detectFrustration(action)) {
        this.flagForAnalysis(action, 'frustration_detected');
        this.notifyNPCs(action.playerId, 'player_frustrated', action, worldRoom);
      }
      
      // 2. Détection d'aide nécessaire
      if (this.detectNeedForHelp(action)) {
        this.flagForAnalysis(action, 'needs_help');
        this.notifyNPCs(action.playerId, 'player_needs_help', action, worldRoom);
      }
      
      // 3. Détection d'inactivité
      if (action.context.idleTime > ANALYSIS_THRESHOLDS.IDLE_THRESHOLD) {
        this.flagForAnalysis(action, 'returned_from_idle');
      }
      
    } catch (error) {
      console.warn(`⚠️ Erreur analyse temps réel:`, error);
    }
  }

  detectFrustration(action) {
    const session = this.sessionData.get(action.playerId);
    if (!session) return false;
    
    // Compter les échecs récents
    const recentFailures = session.recentActions
      .filter(a => Date.now() - a.timestamp < ANALYSIS_THRESHOLDS.FRUSTRATION_TIME_WINDOW)
      .filter(a => a.success === false)
      .length;
    
    return recentFailures >= ANALYSIS_THRESHOLDS.FRUSTRATION_FAILURES;
  }

  detectNeedForHelp(action) {
    // Joueur bloqué au même endroit + plusieurs échecs
    return action.context.recentFailures >= 2 && 
           action.context.consecutiveActions >= 3;
  }

  flagForAnalysis(action, reason) {
    action.metadata.flagged = true;
    action.metadata.patterns.push(reason);
  }

  // ===== COMMUNICATION AVEC LES NPCs =====
  notifyNPCs(playerId, eventType, action, worldRoom) {
    // TODO: Intégrer avec le système NPCs (Phase 2)
    console.log(`🎭 Notification NPCs: ${playerId} -> ${eventType}`);
  }

  // ===== GESTION DE LA QUEUE ET PERFORMANCE =====
  addToQueue(action) {
    if (!this.actionQueue.has(action.playerId)) {
      this.actionQueue.set(action.playerId, []);
    }
    
    this.actionQueue.get(action.playerId).push(action);
    this.stats.actionsTracked++;
  }

  startAutoFlush() {
    setInterval(() => {
      this.flushActionQueue();
    }, this.flushInterval);
  }

  async flushActionQueue() {
    if (this.actionQueue.size === 0) return;
    
    const startTime = performance.now();
    let totalActions = 0;
    
    try {
      // Traiter toutes les actions en batch pour performance
      const promises = [];
      
      for (const [playerId, actions] of this.actionQueue) {
        if (actions.length > 0) {
          promises.push(this.savePlayerActions(playerId, actions));
          totalActions += actions.length;
        }
      }
      
      await Promise.all(promises);
      
      // Vider la queue
      this.actionQueue.clear();
      
      const flushTime = performance.now() - startTime;
      this.stats.lastFlush = Date.now();
      
      console.log(`💾 Actions sauvées: ${totalActions} en ${flushTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error(`❌ Erreur sauvegarde actions:`, error);
    }
  }

  async savePlayerActions(playerId, actions) {
    try {
      // Pour l'instant, on utilise la collection PlayerData existante
      // Plus tard, on créera une collection player_actions dédiée
      
      const playerData = await PlayerData.findOne({ username: playerId });
      if (!playerData) {
        console.warn(`⚠️ Joueur ${playerId} non trouvé pour sauvegarde actions`);
        return false;
      }
      
      // Créer un champ temporaire pour stocker les actions
      // (En attendant la création de la table player_actions dédiée)
      if (!playerData.recentActions) {
        playerData.recentActions = [];
      }
      
      // Ajouter les nouvelles actions
      playerData.recentActions.push(...actions);
      
      // Garder seulement les 100 dernières actions pour éviter de surcharger
      if (playerData.recentActions.length > 100) {
        playerData.recentActions = playerData.recentActions.slice(-100);
      }
      
      await playerData.save();
      return true;
      
    } catch (error) {
      console.error(`❌ Erreur sauvegarde actions pour ${playerId}:`, error);
      return false;
    }
  }

  // ===== UTILITAIRES =====
  validateInput(playerId, actionType) {
    return playerId && 
           typeof playerId === 'string' && 
           actionType && 
           Object.values(ActionType).includes(actionType);
  }

  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  findNearbyPlayers(player, allPlayers) {
    const nearby = [];
    const maxDistance = 100; // Distance en pixels
    
    for (const [otherId, otherPlayer] of allPlayers) {
      if (otherId === player.id) continue;
      if (otherPlayer.mapName !== player.mapName) continue;
      
      const distance = Math.sqrt(
        Math.pow(player.x - otherPlayer.x, 2) + 
        Math.pow(player.y - otherPlayer.y, 2)
      );
      
      if (distance <= maxDistance) {
        nearby.push(otherPlayer.name);
      }
    }
    
    return nearby;
  }

  countRecentFailures(recentActions) {
    const tenMinutesAgo = Date.now() - 600000; // 10 minutes
    return recentActions
      .filter(a => a.timestamp > tenMinutesAgo && a.success === false)
      .length;
  }

  countConsecutiveActions(recentActions) {
    if (recentActions.length === 0) return 1;
    
    const lastAction = recentActions[recentActions.length - 1];
    let count = 1;
    
    for (let i = recentActions.length - 2; i >= 0; i--) {
      if (recentActions[i].type === lastAction.type) {
        count++;
      } else {
        break;
      }
    }
    
    return count;
  }

  updateStats(processingTime, success) {
    if (success) {
      // Calcul moyenne mobile simple
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * 0.9) + (processingTime * 0.1);
    }
  }

  // ===== MÉTHODES PUBLIQUES POUR INTÉGRATION =====
  
  /**
   * Hook pour WorldRoom - Capture mouvement joueur
   */
  trackPlayerMovement(playerId, fromX, fromY, toX, toY, mapName, worldRoom) {
    const distance = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
    
    this.trackAction(playerId, ActionType.PLAYER_MOVE, {
      fromX, fromY, toX, toY,
      map: mapName,
      movementSpeed: distance / 1000, // Approximation
      distanceTraveled: distance
    }, worldRoom);
  }

  /**
   * Hook pour WorldRoom - Capture capture Pokémon
   */
  trackPokemonCapture(playerId, pokemonName, level, ballType, success, worldRoom) {
    const actionType = success ? ActionType.POKEMON_CAPTURE_SUCCESS : ActionType.POKEMON_CAPTURE_FAIL;
    
    this.trackAction(playerId, actionType, {
      pokemonName,
      pokemonLevel: level,
      ballType,
      success,
      attemptNumber: 1 // TODO: Tracker les tentatives multiples
    }, worldRoom);
  }

  /**
   * Hook pour NPCs - Capture interaction
   */
  trackNPCInteraction(playerId, npcId, npcName, interactionType, worldRoom) {
    this.trackAction(playerId, ActionType.NPC_TALK, {
      npcId,
      npcName,
      interactionType,
      duration: 0 // Sera calculé à la fin de l'interaction
    }, worldRoom);
  }

  /**
   * Hook pour items - Capture utilisation
   */
  trackItemUse(playerId, itemId, itemName, quantity, context, worldRoom) {
    this.trackAction(playerId, ActionType.ITEM_USE, {
      itemId,
      itemName,
      quantity,
      context
    }, worldRoom);
  }

  /**
   * Hook pour chat - Capture messages
   */
  trackChatMessage(playerId, message, isGlobal, targetPlayer, worldRoom) {
    this.trackAction(playerId, ActionType.CHAT_MESSAGE, {
      messageLength: message.length,
      isGlobal,
      isPrivate: !!targetPlayer,
      targetPlayer,
      sentiment: this.analyzeSentiment(message) // Analyse basique du sentiment
    }, worldRoom);
  }

  analyzeSentiment(message) {
    const lowerMessage = message.toLowerCase();
    
    // Détection basique de frustration
    const frustrationWords = ['help', 'stuck', 'wtf', 'damn', 'frustrated', 'annoying'];
    if (frustrationWords.some(word => lowerMessage.includes(word))) {
      return 'frustrated';
    }
    
    // Détection positive
    const positiveWords = ['thanks', 'cool', 'awesome', 'love', 'great'];
    if (positiveWords.some(word => lowerMessage.includes(word))) {
      return 'positive';
    }
    
    return 'neutral';
  }

  // ===== MÉTHODES DE DEBUG ET MONITORING =====
  getStats() {
    return {
      ...this.stats,
      queueSize: Array.from(this.actionQueue.values()).reduce((sum, arr) => sum + arr.length, 0),
      activeSessions: this.sessionData.size,
      memoryUsage: process.memoryUsage()
    };
  }

  // Nettoyer les sessions inactives
  cleanupInactiveSessions() {
    const now = Date.now();
    const sessionTimeout = ANALYSIS_THRESHOLDS.SESSION_TIMEOUT;
    
    for (const [playerId, session] of this.sessionData) {
      if (now - session.lastActionTime > sessionTimeout) {
        // Enregistrer fin de session
        this.trackAction(playerId, ActionType.SESSION_END, {
          sessionDuration: now - session.startTime,
          actionsPerformed: session.actionsCount
        });
        
        this.sessionData.delete(playerId);
        console.log(`🔄 Session ${playerId} nettoyée (inactive ${sessionTimeout/1000}s)`);
      }
    }
  }

  // Démarrer le nettoyage automatique des sessions
  startSessionCleanup() {
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 300000); // Toutes les 5 minutes
  }
}

// Export singleton
export const playerActionTracker = new PlayerActionTracker();
