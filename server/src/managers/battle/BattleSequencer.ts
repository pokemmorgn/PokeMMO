// server/src/managers/battle/BattleSequencer.ts
// Orchestrateur principal du système de combat - Gère timing et séquences

import { 
  BattleContext, 
  BattleAction, 
  BattleEvent, 
  BattleSequence,
  BattlePokemonData,
  BATTLE_TIMINGS,
  ActionType,
  BattleEventType
} from './types/BattleTypes';
import { DamageCalculator } from './DamageCalculator';
import { TypeEffectiveness } from './TypeEffectiveness';
import { BattleMessageHandler, createBattleMessage, createAttackMessages } from './BattleMessageHandler';
import { BattleEffectSystem } from './BattleEffectSystem';

// Interfaces pour les handlers spécialisés
export interface IBattleHandler {
  canHandle(context: BattleContext): boolean;
  processAction(action: BattleAction, context: BattleContext): Promise<BattleSequence>;
  shouldPlayAITurn(context: BattleContext): boolean;
  generateAIAction(context: BattleContext): Promise<BattleAction>;
}

// Interface pour les callbacks du BattleRoom
export interface IBattleRoomCallbacks {
  broadcastMessage(messageId: string, data: any): void;
  broadcastUpdate(updateData: any): void;
  updatePokemonHP(pokemonId: string, newHp: number): void;
  changeTurn(newTurn: string): void;
  endBattle(result: any): void;
  logBattleEvent(event: BattleEvent): void;
}

/**
 * ORCHESTRATEUR PRINCIPAL DU SYSTÈME DE COMBAT
 * 
 * Responsabilités :
 * - Router les actions vers les bons handlers (Solo/Multi)
 * - Gérer le timing authentique Pokémon
 * - Coordonner les messages et animations
 * - Maintenir la séquence de combat
 */
export class BattleSequencer {
  
  private handlers: Map<string, IBattleHandler> = new Map();
  private activeSequences: Map<string, BattleSequence> = new Map();
  private battleRoomCallbacks?: IBattleRoomCallbacks;
  
  // Queue d'événements temporisés
  private eventQueue: Array<{
    event: BattleEvent;
    executeAt: number;
    battleId: string;
  }> = [];
  
  // Timers actifs
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(callbacks?: IBattleRoomCallbacks) {
    this.battleRoomCallbacks = callbacks;
    console.log('🎼 [BattleSequencer] Orchestrateur initialisé');
  }
  
  // === REGISTRATION DES HANDLERS ===
  
  /**
   * Enregistre un handler pour un type de combat
   */
  registerHandler(type: string, handler: IBattleHandler): void {
    this.handlers.set(type, handler);
    console.log(`🔧 [BattleSequencer] Handler "${type}" enregistré`);
  }
  
  /**
   * Trouve le bon handler pour un contexte de combat
   */
  private findHandler(context: BattleContext): IBattleHandler | null {
    for (const [type, handler] of this.handlers) {
      if (handler.canHandle(context)) {
        console.log(`🎯 [BattleSequencer] Handler "${type}" sélectionné`);
        return handler;
      }
    }
    
    console.warn(`⚠️ [BattleSequencer] Aucun handler trouvé pour le contexte`, context.battleType);
    return null;
  }
  
  // === TRAITEMENT DES ACTIONS ===
  
  /**
   * MÉTHODE PRINCIPALE : Traite une action de combat
   */
  async processAction(action: BattleAction, context: BattleContext): Promise<boolean> {
    console.log(`🎮 [BattleSequencer] === TRAITEMENT ACTION ===`);
    console.log(`🎯 Action: ${action.type} par ${action.playerId}`);
    console.log(`⚔️ Combat: ${context.battleId} (${context.battleType})`);
    
    try {
      // 1. Trouver le handler approprié
      const handler = this.findHandler(context);
      if (!handler) {
        console.error(`❌ [BattleSequencer] Aucun handler disponible`);
        return false;
      }
      
      // 2. Traiter l'action via le handler
      const sequence = await handler.processAction(action, context);
      
      // 3. Exécuter la séquence avec timing
      await this.executeSequence(sequence, context);
      
      // 4. Vérifier si l'IA doit jouer
      if (handler.shouldPlayAITurn(context)) {
        await this.scheduleAITurn(handler, context);
      }
      
      return true;
      
    } catch (error) {
      console.error(`💥 [BattleSequencer] Erreur traitement action:`, error);
      return false;
    }
  }
  
  /**
   * Exécute une séquence d'événements avec timing authentique
   */
  private async executeSequence(sequence: BattleSequence, context: BattleContext): Promise<void> {
    console.log(`🎬 [BattleSequencer] Exécution séquence "${sequence.sequenceId}"`);
    console.log(`📋 [BattleSequencer] ${sequence.events.length} événements, durée: ${sequence.totalDuration}ms`);
    
    this.activeSequences.set(context.battleId, sequence);
    
    let currentTime = 0;
    
    for (const event of sequence.events) {
      // Programmer l'événement
      this.scheduleEvent(event, currentTime, context.battleId);
      currentTime += event.delay;
    }
    
    // Nettoyer après la séquence complète
setTimeout(() => {
  try {
    // ⚡ Déclencher tous les effets de fin de tour (brûlure, poison, météo…)
    const results = BattleEffectSystem.triggerHook(context, "onTurnEnd", {});
    if (results && results.length) {
      results.forEach((r) => {
        if (r?.message) {
          this.battleRoomCallbacks?.broadcastMessage("battleMessage", {
            message: r.message,
            timing: 1800
          });
        }
      });
    }
  } catch (err) {
    console.error("[BattleSequencer] Erreur effet onTurnEnd:", err);
  }

  // Nettoyage normal
  this.activeSequences.delete(context.battleId);
  console.log(`✅ [BattleSequencer] Séquence "${sequence.sequenceId}" terminée`);
}, sequence.totalDuration);
  }
  
  /**
   * Programme un événement à exécuter après un délai
   */
  private scheduleEvent(event: BattleEvent, delay: number, battleId: string): void {
    const executeAt = Date.now() + delay;
    
    this.eventQueue.push({ event, executeAt, battleId });
    
    const timer = setTimeout(() => {
      this.executeEvent(event, battleId);
      this.activeTimers.delete(event.eventId);
    }, delay);
    
    this.activeTimers.set(event.eventId, timer);
    
    console.log(`⏰ [BattleSequencer] Événement "${event.type}" programmé dans ${delay}ms`);
  }
  
  /**
   * Exécute un événement au bon moment
   */
  private executeEvent(event: BattleEvent, battleId: string): void {
    console.log(`🎬 [BattleSequencer] Exécution événement: ${event.type}`);
    
    try {
      // Log de l'événement
      if (this.battleRoomCallbacks) {
        this.battleRoomCallbacks.logBattleEvent(event);
      }
      
      // Traitement selon le type d'événement
      switch (event.type) {
        case 'message':
          this.handleMessageEvent(event);
          break;
          
        case 'animation':
          this.handleAnimationEvent(event);
          break;
          
        case 'damage':
          this.handleDamageEvent(event);
          break;
          
        case 'heal':
          this.handleHealEvent(event);
          break;
          
        case 'status':
          this.handleStatusEvent(event);
          break;
          
        case 'faint':
          this.handleFaintEvent(event);
          break;
          
        case 'ui_update':
          this.handleUIUpdateEvent(event);
          break;
          
        case 'turn_change':
          this.handleTurnChangeEvent(event);
          break;
          
        case 'battle_end':
          this.handleBattleEndEvent(event);
          break;
          
        default:
          console.warn(`⚠️ [BattleSequencer] Type d'événement non géré: ${event.type}`);
      }
      
    } catch (error) {
      console.error(`💥 [BattleSequencer] Erreur exécution événement:`, error);
    }
  }
  
  // === HANDLERS D'ÉVÉNEMENTS ===
  
  private handleMessageEvent(event: BattleEvent): void {
    if (!this.battleRoomCallbacks) return;
    
    this.battleRoomCallbacks.broadcastMessage('battleMessage', {
      messageId: event.data.messageId,
      message: event.message,
      variables: event.data.variables || {},
      timing: event.delay
    });
  }
  
  private handleAnimationEvent(event: BattleEvent): void {
    if (!this.battleRoomCallbacks) return;
    
    this.battleRoomCallbacks.broadcastMessage('battleAnimation', {
      animation: event.animation,
      target: event.targetId,
      duration: event.delay,
      data: event.data
    });
  }
  
  private handleDamageEvent(event: BattleEvent): void {
    if (!this.battleRoomCallbacks || !event.targetId) return;
    
    const damage = event.data.damage || 0;
    const newHp = Math.max(0, (event.data.currentHp || 0) - damage);
    
    this.battleRoomCallbacks.updatePokemonHP(event.targetId, newHp);
    this.battleRoomCallbacks.broadcastMessage('pokemonDamage', {
      pokemonId: event.targetId,
      damage: damage,
      newHp: newHp,
      effectiveness: event.data.effectiveness
    });
  }
  
  private handleHealEvent(event: BattleEvent): void {
    if (!this.battleRoomCallbacks || !event.targetId) return;
    
    const healing = event.data.healing || 0;
    const newHp = Math.min(event.data.maxHp || 100, (event.data.currentHp || 0) + healing);
    
    this.battleRoomCallbacks.updatePokemonHP(event.targetId, newHp);
    this.battleRoomCallbacks.broadcastMessage('pokemonHeal', {
      pokemonId: event.targetId,
      healing: healing,
      newHp: newHp
    });
  }
  
  private handleStatusEvent(event: BattleEvent): void {
    if (!this.battleRoomCallbacks) return;
    
    this.battleRoomCallbacks.broadcastMessage('statusChange', {
      pokemonId: event.targetId,
      status: event.data.status,
      applied: event.data.applied || true
    });
  }
  
  private handleFaintEvent(event: BattleEvent): void {
    if (!this.battleRoomCallbacks || !event.targetId) return;
    
    this.battleRoomCallbacks.updatePokemonHP(event.targetId, 0);
    this.battleRoomCallbacks.broadcastMessage('pokemonFaint', {
      pokemonId: event.targetId
    });
  }
  
  private handleUIUpdateEvent(event: BattleEvent): void {
    if (!this.battleRoomCallbacks) return;
    
    this.battleRoomCallbacks.broadcastUpdate(event.data);
  }
  
  private handleTurnChangeEvent(event: BattleEvent): void {
    if (!this.battleRoomCallbacks) return;
    
    this.battleRoomCallbacks.changeTurn(event.data.newTurn);
    this.battleRoomCallbacks.broadcastMessage('turnChange', {
      newTurn: event.data.newTurn,
      turnNumber: event.data.turnNumber
    });
  }
  
  private handleBattleEndEvent(event: BattleEvent): void {
    if (!this.battleRoomCallbacks) return;
    
    this.battleRoomCallbacks.endBattle(event.data);
  }
  
  // === GESTION DE L'IA ===
  
  /**
   * Programme le tour de l'IA avec délai authentique
   */
  private async scheduleAITurn(handler: IBattleHandler, context: BattleContext): Promise<void> {
    console.log(`🤖 [BattleSequencer] Programmation tour IA...`);
    
    // Délai réaliste pour l'IA (1-3 secondes)
    const aiThinkingTime = Math.random() * 2000 + 1000;
    
    setTimeout(async () => {
      try {
        console.log(`🤖 [BattleSequencer] IA commence son tour`);
        
        // Générer l'action IA
        const aiAction = await handler.generateAIAction(context);
        
        // Traiter l'action IA
        await this.processAction(aiAction, context);
        
      } catch (error) {
        console.error(`💥 [BattleSequencer] Erreur tour IA:`, error);
      }
    }, aiThinkingTime);
  }
  
  // === UTILITAIRES DE CRÉATION DE SÉQUENCES ===
  
  /**
   * Crée une séquence d'attaque standard
   */
  createAttackSequence(
    attackerId: string,
    targetId: string,
    moveData: any,
    damageResult: any,
    context: BattleContext
  ): BattleSequence {
    const events: BattleEvent[] = [];
    let currentDelay = 0;
    
    const sequenceId = `attack_${attackerId}_${Date.now()}`;
    
    // 1. Message d'utilisation d'attaque
    const attackMessages = createAttackMessages(
      damageResult.attackerName,
      moveData.name,
      damageResult.effectiveness,
      damageResult.critical,
      attackerId !== context.currentPlayer
    );
    
    attackMessages.forEach(msg => {
      events.push({
        eventId: `msg_${events.length}`,
        type: 'message',
        timestamp: Date.now(),
        data: {
          messageId: msg.id,
          variables: msg.variables
        },
        message: msg.template,
        delay: currentDelay
      });
      currentDelay += msg.timing;
    });
    
    // 2. Animation d'attaque
    events.push({
      eventId: `anim_attack`,
      type: 'animation',
      timestamp: Date.now(),
      playerId: attackerId,
      targetId: targetId,
      data: {
        moveId: moveData.id,
        animation: moveData.animation || 'default_attack'
      },
      animation: moveData.animation || 'default_attack',
      delay: currentDelay
    });
    currentDelay += BATTLE_TIMINGS.MOVE_ANIMATION;
    
    // 3. Dégâts (si applicable)
    if (damageResult.finalDamage > 0) {
      events.push({
        eventId: `damage_${targetId}`,
        type: 'damage',
        timestamp: Date.now(),
        targetId: targetId,
        data: {
          damage: damageResult.finalDamage,
          currentHp: damageResult.targetCurrentHp,
          effectiveness: damageResult.effectiveness
        },
        delay: currentDelay
      });
      currentDelay += BATTLE_TIMINGS.DAMAGE_ANIMATION;
    }
    
    // 4. K.O. si nécessaire
    if (damageResult.targetFainted) {
      const faintMessage = createBattleMessage('MSG_POKEMON_FAINTED', {
        pokemon: damageResult.targetName
      });
      
      if (faintMessage) {
        events.push({
          eventId: `faint_msg`,
          type: 'message',
          timestamp: Date.now(),
          data: {
            messageId: faintMessage.id,
            variables: faintMessage.variables
          },
          message: faintMessage.template,
          delay: currentDelay
        });
        currentDelay += faintMessage.timing;
      }
      
      events.push({
        eventId: `faint_${targetId}`,
        type: 'faint',
        timestamp: Date.now(),
        targetId: targetId,
        data: {},
        delay: currentDelay
      });
      currentDelay += BATTLE_TIMINGS.MESSAGE_DISPLAY;
    }
    
    return {
      sequenceId,
      events,
      totalDuration: currentDelay,
      priority: 80
    };
  }
  
  /**
   * Crée une séquence de capture
   */
  createCaptureSequence(
    playerId: string,
    targetId: string,
    ballType: string,
    result: any,
    context: BattleContext
  ): BattleSequence {
    const events: BattleEvent[] = [];
    let currentDelay = 0;
    
    const sequenceId = `capture_${playerId}_${Date.now()}`;
    
    // Messages de capture
    const captureMessages = BattleMessageHandler.generateCaptureSequence(
      result.trainerName,
      ballType,
      result.pokemonName,
      result.shakeCount,
      result.success,
      result.criticalCapture
    );
    
    captureMessages.forEach(msg => {
      events.push({
        eventId: `capture_msg_${events.length}`,
        type: 'message',
        timestamp: Date.now(),
        data: {
          messageId: msg.id,
          variables: msg.variables
        },
        message: msg.template,
        delay: currentDelay
      });
      currentDelay += msg.timing;
    });
    
    // Animation finale
    if (result.success) {
      events.push({
        eventId: `capture_success`,
        type: 'animation',
        timestamp: Date.now(),
        targetId: targetId,
        data: { captured: true },
        animation: 'capture_success',
        delay: currentDelay
      });
    }
    
    return {
      sequenceId,
      events,
      totalDuration: currentDelay,
      priority: 90
    };
  }
  
  /**
   * Crée une séquence de changement de tour
   */
  createTurnChangeSequence(
    newTurn: string,
    turnNumber: number,
    context: BattleContext
  ): BattleSequence {
    const events: BattleEvent[] = [];
    const sequenceId = `turn_change_${Date.now()}`;
    
    // Message "À votre tour"
    if (newTurn === context.participants[0]?.sessionId) {
      const turnMessage = createBattleMessage('MSG_TURN_START');
      if (turnMessage) {
        events.push({
          eventId: `turn_msg`,
          type: 'message',
          timestamp: Date.now(),
          data: {
            messageId: turnMessage.id,
            variables: turnMessage.variables
          },
          message: turnMessage.template,
          delay: 0
        });
      }
    }
    
    // Changement de tour
    events.push({
      eventId: `turn_change`,
      type: 'turn_change',
      timestamp: Date.now(),
      data: {
        newTurn,
        turnNumber
      },
      delay: BATTLE_TIMINGS.TURN_TRANSITION
    });
    
    return {
      sequenceId,
      events,
      totalDuration: BATTLE_TIMINGS.TURN_TRANSITION + BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 60
    };
  }
  
  // === GESTION DES CALLBACKS ===
  
  /**
   * Définit les callbacks du BattleRoom
   */
  setCallbacks(callbacks: IBattleRoomCallbacks): void {
    this.battleRoomCallbacks = callbacks;
  }
  
  // === NETTOYAGE ===
  
  /**
   * Annule toutes les séquences en cours pour un combat
   */
  cancelBattleSequences(battleId: string): void {
    console.log(`🛑 [BattleSequencer] Annulation séquences pour ${battleId}`);
    
    // Nettoyer les timers
    for (const [eventId, timer] of this.activeTimers) {
      clearTimeout(timer);
      this.activeTimers.delete(eventId);
    }
    
    // Nettoyer les séquences actives
    this.activeSequences.delete(battleId);
    
    // Nettoyer la queue d'événements
    this.eventQueue = this.eventQueue.filter(item => item.battleId !== battleId);
  }
  
  /**
   * Nettoyage complet
   */
  destroy(): void {
    console.log(`💀 [BattleSequencer] Destruction...`);
    
    // Annuler tous les timers
    for (const timer of this.activeTimers.values()) {
      clearTimeout(timer);
    }
    
    // Nettoyer toutes les collections
    this.activeTimers.clear();
    this.activeSequences.clear();
    this.eventQueue = [];
    this.handlers.clear();
    
    console.log(`✅ [BattleSequencer] Détruit`);
  }
  
  // === DEBUG ===
  
  /**
   * Obtient l'état actuel du sequencer
   */
  getDebugInfo(): any {
    return {
      handlersCount: this.handlers.size,
      activeSequencesCount: this.activeSequences.size,
      activeTimersCount: this.activeTimers.size,
      eventQueueLength: this.eventQueue.length,
      hasCallbacks: !!this.battleRoomCallbacks
    };
  }
}

export default BattleSequencer;
