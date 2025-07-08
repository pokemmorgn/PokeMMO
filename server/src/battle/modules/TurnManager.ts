// server/src/battle/modules/TurnManager.ts
// ÉTAPE 1 : Gestion basique des tours

import { BattleGameState, Pokemon } from '../types/BattleTypes';

/**
 * TURN MANAGER - Gestion des tours de combat
 * 
 * Responsabilités :
 * - Déterminer qui joue en premier
 * - Alterner les tours player1 ↔ player2
 * - Incrémenter les numéros de tour
 * - Vérifier si un joueur peut agir
 */
export class TurnManager {
  
  private gameState: BattleGameState | null = null;
  
  constructor() {
    console.log('🔄 [TurnManager] Initialisé');
  }
  
  // === INITIALISATION ===
  
  /**
   * Initialise le gestionnaire avec l'état du jeu
   */
  initialize(gameState: BattleGameState): void {
    this.gameState = gameState;
    console.log('✅ [TurnManager] Configuré pour le combat');
  }
  
  // === DÉTERMINATION PREMIER JOUEUR ===
  
  /**
   * Détermine qui joue en premier selon la vitesse
   */
  determineFirstPlayer(pokemon1: Pokemon, pokemon2: Pokemon): 'player1' | 'player2' {
    const p1Speed = pokemon1.speed || 0;
    const p2Speed = pokemon2.speed || 0;
    
    console.log(`⚡ [TurnManager] Vitesses: P1=${p1Speed} vs P2=${p2Speed}`);
    
    // En cas d'égalité, player1 commence (comme les vrais jeux Pokémon)
    const winner = p1Speed >= p2Speed ? 'player1' : 'player2';
    
    console.log(`🎯 [TurnManager] Premier tour: ${winner}`);
    
    return winner;
  }
  
  // === GESTION DES TOURS ===
  
  /**
   * Passe au tour suivant
   */
  nextTurn(): 'player1' | 'player2' {
    if (!this.gameState) {
      throw new Error('TurnManager non initialisé');
    }
    
    // Alterner les tours
    const nextPlayer = this.gameState.currentTurn === 'player1' ? 'player2' : 'player1';
    
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
  getCurrentPlayer(): 'player1' | 'player2' | null {
    return this.gameState?.currentTurn || null;
  }
  
  /**
   * Récupère le numéro de tour actuel
   */
  getCurrentTurnNumber(): number {
    return this.gameState?.turnNumber || 0;
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
}

export default TurnManager;
