// server/src/battle/modules/BroadcastManager.ts
// SYSTÈME DE TIMING SERVER-DRIVEN POUR COMBATS POKÉMON

import { BattleGameState, PlayerRole } from '../types/BattleTypes';

// === INTERFACES ===

export interface BattleEvent {
  eventId: string;
  battleId: string;
  timestamp: number;
  data: any;
  participants?: string[];
  spectators?: string[];
}

export interface AttackSequenceData {
  attacker: { name: string; role: PlayerRole };
  target: { name: string; role: PlayerRole };
  move: { id: string; name: string; power?: number };
  damage: number;
  oldHp: number;
  newHp: number;
  maxHp: number;
  effects?: string[];
  isKnockedOut?: boolean;
}

export interface CaptureSequenceData {
  playerName: string;
  pokemonName: string;
  ballType: string;
  ballDisplayName: string;
  shakeCount: number;
  captured: boolean;
  critical?: boolean;
  addedTo?: 'team' | 'pc';
}

export interface ParticipantManager {
  participants: Set<string>;
  spectators: Set<string>;
  
  addParticipant(sessionId: string): void;
  removeParticipant(sessionId: string): void;
  addSpectator(sessionId: string): void;
  removeSpectator(sessionId: string): void;
  getAllRecipients(): string[];
}

// === TIMING AUTHENTIQUES POKÉMON (basés sur Gen 4/5) ===

export const BATTLE_TIMINGS = {
  // Actions de base (timing des vrais jeux)
  moveUsed: 1800,           // Annonce attaque (comme DS)
  damageDealt: 1200,        // Application dégâts
  criticalHit: 800,         // "Coup critique !"
  superEffective: 900,      // "C'est super efficace !"
  notVeryEffective: 900,    // "Ce n'est pas très efficace..."
  noEffect: 1000,           // "Ça n'a aucun effet !"
  pokemonFainted: 2000,     // K.O. (pause importante)
  
  // Capture (timing Gen 5 authentique)
  captureAttempt: 1500,     // Lancer Ball
  captureShake: 600,        // Chaque secousse (4 max)
  captureSuccess: 2000,     // "Pokémon capturé !"
  captureFailure: 1500,     // "Il s'est échappé !"
  captureCritical: 1000,    // Effet critique
  
  // Statuts
  statusInflicted: 1000,    // "Pokémon est empoisonné !"
  statusDamage: 800,        // Dégâts de poison/brûlure
  statusCured: 1000,        // Guérison
  
  // Tours et transitions
  yourTurn: 0,              // Instantané (interface)
  enemyThinking: 800,       // IA réfléchit (court)
  turnTransition: 300,      // Entre les tours
  
  // Expérience et niveaux
  expGained: 1500,          // "Pokémon gagne X EXP"
  levelUp: 2500,            // "Monte au niveau X !" (important)
  
  // Fin de combat
  battleEnd: 2200,          // Annonce vainqueur
  moneyGained: 1300,        // Récompense argent
  
  // Spéciaux
  pokemonSentOut: 1600,     // "Allez-y Pokémon !"
  wildPokemonAppears: 2000, // "Un Pokémon sauvage apparaît !"
  
  // Objets
  itemUsed: 1400,           // Utilisation objet
  
  // Timing techniques
  transitionFast: 200,      // Très rapide
  transitionNormal: 500,    // Normal
  transitionSlow: 1000      // Lent
} as const;

/**
 * BROADCAST MANAGER - Gestion du timing et communication
 * 
 * Responsabilités :
 * - Timing optimisé côté serveur
 * - Séquences pré-construites
 * - Gestion participants + spectateurs
 * - Logs automatiques pour replay
 * - API simple pour BattleEngine
 */
export class BroadcastManager {
  
  private battleId: string;
  private gameState: BattleGameState;
  private participantManager: ParticipantManager;
  private eventLog: BattleEvent[] = [];
  private emitCallback: ((event: BattleEvent) => void) | null = null;
  
  constructor(battleId: string, gameState: BattleGameState) {
    this.battleId = battleId;
    this.gameState = gameState;
    this.participantManager = this.createParticipantManager();
    
    console.log(`📡 [BroadcastManager] Initialisé pour combat ${battleId}`);
  }
  
  // === CONFIGURATION ===
  
  /**
   * Configure le callback d'émission (WebSocket, etc.)
   */
  setEmitCallback(callback: (event: BattleEvent) => void): void {
    this.emitCallback = callback;
    console.log('✅ [BroadcastManager] Callback d\'émission configuré');
  }
  
  /**
   * Met à jour l'état du jeu (pour logs)
   */
  updateGameState(gameState: BattleGameState): void {
    this.gameState = gameState;
  }
  
  // === API PRINCIPALE - ÉMISSION SIMPLE ===
  
  /**
   * Émission simple sans délai
   */
  emit(eventId: string, data: any): void {
    const event = this.createEvent(eventId, data);
    this.logAndEmit(event);
  }
  
  /**
   * Émission avec délai personnalisé
   */
  async emitWithDelay(eventId: string, data: any, delayMs: number): Promise<void> {
    const event = this.createEvent(eventId, data);
    this.logAndEmit(event);
    
    if (delayMs > 0) {
      await this.delay(delayMs);
    }
  }
  
/**
 * Émission avec délai automatique selon le type d'événement
 */
async emitTimed(eventId: string, data: any): Promise<void> {
  const timing = this.getTimingForEvent(eventId);
  await this.emitWithDelay(eventId, data, timing);
}
  // === SÉQUENCES PRÉ-CONSTRUITES ===
  
/**
 * Séquence complète d'attaque SANS timing (timing géré par BattleEngine)
 */
async emitAttackSequence(attackData: AttackSequenceData): Promise<void> {
  console.log(`⚔️ [BroadcastManager] Séquence attaque: ${attackData.move.name}`);
  
  // 1. Annonce de l'attaque (INSTANTANÉ)
  this.emit('moveUsed', {
    attackerName: attackData.attacker.name,
    attackerRole: attackData.attacker.role,
    moveName: attackData.move.name,
    moveId: attackData.move.id
  });
  
  // 2. Dégâts infligés (INSTANTANÉ - données pour barre de vie)
  if (attackData.damage > 0) {
    this.emit('damageDealt', {
      targetName: attackData.target.name,
      targetRole: attackData.target.role,
      targetPlayerId: attackData.target.role === 'player1' ? this.gameState.player1.sessionId : this.gameState.player2.sessionId,
      damage: attackData.damage,
      oldHp: attackData.oldHp,
      newHp: attackData.newHp,
      maxHp: attackData.maxHp,
      hpPercentage: Math.round((attackData.newHp / attackData.maxHp) * 100)
    });
  }
  
  // 3. K.O. si applicable (INSTANTANÉ)
  if (attackData.isKnockedOut) {
    this.emit('pokemonFainted', {
      pokemonName: attackData.target.name,
      targetRole: attackData.target.role,
      playerId: attackData.target.role === 'player1' ? this.gameState.player1.sessionId : this.gameState.player2.sessionId
    });
  }
  
  console.log(`✅ [BroadcastManager] Séquence attaque envoyée (sans timing)`);
}
  
  /**
   * Séquence complète de capture avec timing optimal
   */
  async emitCaptureSequence(captureData: CaptureSequenceData): Promise<void> {
    console.log(`🎯 [BroadcastManager] Séquence capture: ${captureData.ballDisplayName}`);
    
    // 1. Lancer de Ball (ID + données brutes)
    await this.emitTimed('captureAttempt', {
      playerName: captureData.playerName,
      ballDisplayName: captureData.ballDisplayName,
      ballType: captureData.ballType,
      pokemonName: captureData.pokemonName
    });
    
    // 2. Capture critique ou secousses normales
    if (captureData.critical) {
      await this.emitTimed('captureCritical', {
        pokemonName: captureData.pokemonName
      });
    } else {
      // Séquence de secousses (max 4 comme Gen 5)
      for (let i = 0; i < captureData.shakeCount; i++) {
        await this.emitTimed('captureShake', {
          shakeNumber: i + 1,
          totalShakes: captureData.shakeCount,
          pokemonName: captureData.pokemonName
        });
      }
    }
    
    // 3. Résultat final (succès ou échec)
    if (captureData.captured) {
      await this.emitTimed('captureSuccess', {
        pokemonName: captureData.pokemonName,
        critical: captureData.critical,
        addedTo: captureData.addedTo
      });
    } else {
      await this.emitTimed('captureFailure', {
        pokemonName: captureData.pokemonName
      });
    }
    
    console.log(`✅ [BroadcastManager] Séquence capture terminée`);
  }
  
  /**
   * Séquence de transition de tour
   */
  async emitTurnTransition(newPlayer: PlayerRole, playerName: string, isAI: boolean = false): Promise<void> {
    if (isAI) {
      await this.emitTimed('opponentTurn', {
        playerRole: newPlayer,
        playerName: playerName
      });
    } else {
      this.emit('yourTurn', {
        playerRole: newPlayer,
        playerName: playerName
      });
    }
  }
  
  /**
   * Séquence de fin de combat
   */
  async emitBattleEnd(winner: PlayerRole | null, reason: string, rewards?: any): Promise<void> {
    console.log(`🏁 [BroadcastManager] Séquence fin de combat`);
    
    await this.emitTimed('battleEnd', {
      winner: winner,
      winnerId: winner ? (winner === 'player1' ? this.gameState.player1.sessionId : this.gameState.player2.sessionId) : null,
      reason: reason,
      gameState: this.gameState
    });
    
    if (rewards?.money) {
      await this.emitTimed('moneyGained', {
        amount: rewards.money,
        playerId: rewards.playerId
      });
    }
    
    console.log(`✅ [BroadcastManager] Séquence fin terminée`);
  }
  
  // === GESTION DES PARTICIPANTS ===
  
  /**
   * Ajoute un participant au combat
   */
  addParticipant(sessionId: string): void {
    this.participantManager.addParticipant(sessionId);
    console.log(`👤 [BroadcastManager] Participant ajouté: ${sessionId}`);
  }
  
  /**
   * Ajoute un spectateur
   */
  addSpectator(sessionId: string): void {
    this.participantManager.addSpectator(sessionId);
    console.log(`👁️ [BroadcastManager] Spectateur ajouté: ${sessionId}`);
  }
  
  /**
   * Retire un participant/spectateur
   */
  removeUser(sessionId: string): void {
    this.participantManager.removeParticipant(sessionId);
    this.participantManager.removeSpectator(sessionId);
    console.log(`👋 [BroadcastManager] Utilisateur retiré: ${sessionId}`);
  }
  
  // === SYSTÈME DE LOGS ===
  
  /**
   * Récupère l'historique complet pour replay
   */
  getEventLog(): BattleEvent[] {
    return [...this.eventLog];
  }
  
  /**
   * Exporte le log en format compact pour sauvegarde
   */
  exportReplayData(): any {
    return {
      battleId: this.battleId,
      timestamp: Date.now(),
      events: this.eventLog.map(event => ({
        eventId: event.eventId,
        timestamp: event.timestamp,
        data: event.data
      })),
      finalState: this.gameState
    };
  }
  
  // === MÉTHODES PRIVÉES ===
  
  private createEvent(eventId: string, data: any): BattleEvent {
    return {
      eventId,
      battleId: this.battleId,
      timestamp: Date.now(),
      data: {
        ...data,
        battleId: this.battleId,
        gameState: {
          turnNumber: this.gameState.turnNumber,
          currentTurn: this.gameState.currentTurn,
          phase: this.gameState.phase
        }
      },
      participants: Array.from(this.participantManager.participants),
      spectators: Array.from(this.participantManager.spectators)
    };
  }
  
  private logAndEmit(event: BattleEvent): void {
    // Ajouter au log
    this.eventLog.push(event);
    
    // Émettre via callback
    if (this.emitCallback) {
      this.emitCallback(event);
    }
    
    console.log(`📡 [BroadcastManager] Émis: ${event.eventId} → ${event.participants?.length || 0} participants + ${event.spectators?.length || 0} spectateurs`);
  }
  
  private getTimingForEvent(eventId: string): number {
    return (BATTLE_TIMINGS as any)[eventId] || BATTLE_TIMINGS.transitionNormal;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private getShakeMessage(shakeNumber: number): string {
    // Cette méthode est conservée pour les logs côté serveur uniquement
    const messages = [
      'La Ball bouge...',
      'Elle bouge encore...',
      'Et encore une fois...'
    ];
    return messages[shakeNumber - 1] || 'La Ball bouge...';
  }
  
  private createParticipantManager(): ParticipantManager {
    const participants = new Set<string>();
    const spectators = new Set<string>();
    
    // Ajouter les participants initiaux
    participants.add(this.gameState.player1.sessionId);
    if (this.gameState.player2.sessionId !== 'ai') {
      participants.add(this.gameState.player2.sessionId);
    }
    
    return {
      participants,
      spectators,
      
      addParticipant(sessionId: string) {
        participants.add(sessionId);
        spectators.delete(sessionId); // Retirer des spectateurs si présent
      },
      
      removeParticipant(sessionId: string) {
        participants.delete(sessionId);
      },
      
      addSpectator(sessionId: string) {
        if (!participants.has(sessionId)) {
          spectators.add(sessionId);
        }
      },
      
      removeSpectator(sessionId: string) {
        spectators.delete(sessionId);
      },
      
      getAllRecipients() {
        return [...participants, ...spectators];
      }
    };
  }
  
  // === UTILITAIRES ===
  
  /**
   * Statistiques du manager
   */
  getStats(): any {
    return {
      battleId: this.battleId,
      participants: this.participantManager.participants.size,
      spectators: this.participantManager.spectators.size,
      eventsLogged: this.eventLog.length,
      callbackConfigured: this.emitCallback !== null,
      version: 'v1.0.0'
    };
  }
  
  /**
   * Nettoyage des ressources
   */
  cleanup(): void {
    this.eventLog = [];
    this.participantManager.participants.clear();
    this.participantManager.spectators.clear();
    this.emitCallback = null;
    
    console.log(`🧹 [BroadcastManager] Nettoyage effectué pour ${this.battleId}`);
  }
}

export default BroadcastManager;
