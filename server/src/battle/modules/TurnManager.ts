// server/src/battle/modules/TurnManager.ts
// ÉTAPE 2.6 : Gestion des tours avec système narratif

import { BattleGameState, Pokemon, TurnPlayer, PlayerRole } from '../types/BattleTypes';

/**
 * TURN MANAGER - Gestion des tours de combat avec narrateur
 * 
 * Responsabilités :
 * - Gérer le tour narratif (Tour 0)
 * - Déterminer qui joue en premier
 * - Alterner les tours player1 ↔ player2
 * - Incrémenter les numéros de tour
 * - Vérifier si un joueur peut agir
 */
export class TurnManager {
  
  private gameState: BattleGameState | null = null;
  
  constructor() {
    console.log('🔄 [TurnManager] Initialisé avec système narratif');
  }
  
  // === INITIALISATION ===
  
  /**
   * Initialise le gestionnaire avec l'état du jeu
   */
  initialize(gameState: BattleGameState): void {
    this.gameState = gameState;
    console.log('✅ [TurnManager] Configuré pour le combat narratif');
  }
  
  // === SYSTÈME NARRATIF ===
  
  /**
   * Démarre le tour narratif (Tour 0)
   */
  startNarrativeTurn(): void {
    if (!this.gameState) {
      throw new Error('TurnManager non initialisé');
    }
    
    this.gameState.currentTurn = 'narrator';
    this.gameState.turnNumber = 0;
    
    console.log(`📖 [TurnManager] Tour narratif démarré (Tour 0)`);
  }
  
  /**
   * Termine le tour narratif et démarre le combat
   */
  endNarrativeTurn(): PlayerRole {
    if (!this.gameState) {
      throw new Error('TurnManager non initialisé');
    }
    
    if (this.gameState.currentTurn !== 'narrator') {
      console.warn('⚠️ [TurnManager] Tentative de terminer la narration alors qu\'elle n\'est pas active');
      return this.gameState.currentTurn as PlayerRole;
    }
    
    // Déterminer le premier combattant
    const firstCombatant = this.determineFirstPlayer(
      this.gameState.player1.pokemon!,
      this.gameState.player2.pokemon!
    );
    
    // Passer au premier tour de combat
    this.gameState.currentTurn = firstCombatant;
    this.gameState.turnNumber = 1;
    
    console.log(`📖→⚔️ [TurnManager] Narrateur → Combat : ${firstCombatant} (Tour 1)`);
    
    return firstCombatant;
  }
  
  // === DÉTERMINATION PREMIER JOUEUR ===
  
  /**
   * Détermine qui joue en premier selon la vitesse
   */
  determineFirstPlayer(pokemon1: Pokemon, pokemon2: Pokemon): PlayerRole {
    const p1Speed = pokemon1.speed || 0;
    const p2Speed = pokemon2.speed || 0;
    
    console.log(`⚡ [TurnManager] Vitesses: P1=${p1Speed} vs P2=${p2Speed}`);
    
    // En cas d'égalité, player1 commence (comme les vrais jeux Pokémon)
    const winner: PlayerRole = p1Speed >= p2Speed ? 'player1' : 'player2';
    
    console.log(`🎯 [TurnManager] Premier combattant: ${winner}`);
    
    return winner;
  }
  
  // === GESTION DES TOURS ===
  
  /**
   * Passe au tour suivant
   */
  nextTurn(): TurnPlayer {
    if (!this.gameState) {
      throw new Error('TurnManager non initialisé');
    }
    
    // Logique spéciale pour le narrateur (tour 0)
    if (this.gameState.currentTurn === 'narrator') {
      return this.endNarrativeTurn();
    }
    
    // Logique normale pour alterner player1 ↔ player2
    const currentPlayer = this.gameState.currentTurn as PlayerRole;
    const nextPlayer: PlayerRole = currentPlayer === 'player1' ? 'player2' : 'player1';
    
    // Si on revient à player1, incrémenter le numéro de tour
    if (nextPlayer === 'player1') {
      this.gameState.turnNumber++;
    }
    
    this.gameState.currentTurn = nextPlayer;
    
    console.log(`🔄 [TurnManager] Tour ${this.gameState.turnNumber} - C'est à ${nextPlayer}`);
    
    return nextPlayer;
  }
  
  /**
   * Vérifie si un joueur peut agir maintenant
   */
  canPlayerAct(playerId: string): boolean {
    if (!this.gameState) {
      return false;
    }
    
    // Pendant la narration, personne ne peut agir
    if (this.gameState.currentTurn === 'narrator') {
      console.log(`📖 [TurnManager] ${playerId} ne peut pas agir pendant la narration`);
      return false;
    }
    
    // Le joueur peut agir si c'est son tour
    const canAct = (
      (playerId === this.gameState.player1.sessionId && this.gameState.currentTurn === 'player1') ||
      (playerId === this.gameState.player2.sessionId && this.gameState.currentTurn === 'player2') ||
      (playerId === 'ai' && this.gameState.currentTurn === 'player2') // Pour l'IA
    );
    
    console.log(`🎮 [TurnManager] ${playerId} peut agir: ${canAct} (tour actuel: ${this.gameState.currentTurn})`);
    
    return canAct;
  }
  
  /**
   * Récupère le joueur actuel
   */
  getCurrentPlayer(): TurnPlayer | null {
    return this.gameState?.currentTurn || null;
  }
  
  /**
   * Récupère le numéro de tour actuel
   */
  getCurrentTurnNumber(): number {
    return this.gameState?.turnNumber || 0;
  }
  
  /**
   * Vérifie si on est en mode narratif
   */
  isNarrative(): boolean {
    return this.gameState?.currentTurn === 'narrator';
  }
  
  /**
   * Vérifie si le combat a vraiment commencé (pas de narration)
   */
  isCombatActive(): boolean {
    return this.gameState?.currentTurn !== 'narrator' && this.gameState?.turnNumber > 0;
  }
  
  // === UTILITAIRES ===
  
  /**
   * Reset le système de tours (pour nouveau combat)
   */
  reset(): void {
    this.gameState = null;
    console.log('🔄 [TurnManager] Reset effectué');
  }
  
  /**
   * Vérifie si le système est prêt
   */
  isReady(): boolean {
    return this.gameState !== null;
  }
  
  /**
   * Obtient des statistiques sur le gestionnaire
   */
  getStats(): any {
    return {
      version: 'narrative_v1',
      features: ['narrative_turn', 'speed_priority', 'turn_alternation'],
      ready: this.isReady(),
      currentTurn: this.gameState?.currentTurn || 'unknown',
      turnNumber: this.gameState?.turnNumber || 0,
      isNarrative: this.isNarrative(),
      isCombatActive: this.isCombatActive()
    };
  }
}

export default TurnManager;
