// server/src/battle/modules/ActionProcessor.ts
// ÉTAPE 2 : Traitement des actions de combat

import { BattleGameState, BattleAction, BattleResult, Pokemon } from '../types/BattleTypes';

/**
 * ACTION PROCESSOR - Traite toutes les actions de combat
 * 
 * Responsabilités :
 * - Traiter les attaques (calcul dégâts + HP)
 * - Traiter les objets (plus tard)
 * - Traiter les changements de Pokémon (plus tard)
 * - Traiter les captures (plus tard)
 * - Traiter les fuites (plus tard)
 */
export class ActionProcessor {
  
  private gameState: BattleGameState | null = null;
  
  constructor() {
    console.log('⚔️ [ActionProcessor] Initialisé');
  }
  
  // === INITIALISATION ===
  
  /**
   * Initialise avec l'état du jeu
   */
  initialize(gameState: BattleGameState): void {
    this.gameState = gameState;
    console.log('✅ [ActionProcessor] Configuré pour le combat');
  }
  
  // === TRAITEMENT PRINCIPAL ===
  
  /**
   * Traite une action selon son type
   */
  processAction(action: BattleAction): BattleResult {
    console.log(`🎮 [ActionProcessor] Traitement action: ${action.type} par ${action.playerId}`);
    
    if (!this.gameState) {
      return this.createErrorResult('ActionProcessor non initialisé');
    }
    
    try {
      switch (action.type) {
        case 'attack':
          return this.processAttack(action);
          
        case 'item':
          return this.processItem(action);
          
        case 'switch':
          return this.processSwitch(action);
          
        case 'capture':
          return this.processCapture(action);
          
        case 'run':
          return this.processRun(action);
          
        default:
          return this.createErrorResult(`Type d'action non supporté: ${action.type}`);
      }
      
    } catch (error) {
      console.error(`❌ [ActionProcessor] Erreur:`, error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue'
      );
    }
  }
  
  // === ATTAQUE (ÉTAPE 2) ===
  
  /**
   * Traite une attaque
   */
  private processAttack(action: BattleAction): BattleResult {
    console.log(`⚔️ [ActionProcessor] Traitement attaque`);
    
    const moveId = action.data?.moveId;
    if (!moveId) {
      return this.createErrorResult('Aucune attaque spécifiée');
    }
    
    // Récupérer attaquant et défenseur
    const { attacker, defender, attackerRole, defenderRole } = this.getAttackerDefender(action.playerId);
    
    if (!attacker || !defender) {
      return this.createErrorResult('Pokémon introuvables');
    }
    
    console.log(`⚔️ [ActionProcessor] ${attacker.name} attaque ${defender.name} avec ${moveId}`);
    
    // Vérifier si l'attaque existe
    if (!attacker.moves.includes(moveId)) {
      return this.createErrorResult(`${attacker.name} ne connaît pas ${moveId}`);
    }
    
    // Calculer les dégâts (formule simple pour l'étape 2)
    const damage = this.calculateDamage(attacker, defender, moveId);
    
    // Appliquer les dégâts
    const newHp = Math.max(0, defender.currentHp - damage);
    const oldHp = defender.currentHp;
    
    // Mettre à jour les HP
    defender.currentHp = newHp;
    
    console.log(`💥 [ActionProcessor] ${damage} dégâts ! ${defender.name}: ${oldHp} → ${newHp} HP`);
    
    // Vérifier si le Pokémon est K.O.
    const isKnockedOut = newHp <= 0;
    if (isKnockedOut) {
      console.log(`💀 [ActionProcessor] ${defender.name} est K.O. !`);
    }
    
    // Créer les événements
    const events = [
      `${attacker.name} utilise ${this.getMoveDisplayName(moveId)} !`,
      `${defender.name} perd ${damage} HP !`
    ];
    
    if (isKnockedOut) {
      events.push(`${defender.name} est mis K.O. !`);
    }
    
    return {
      success: true,
      gameState: this.gameState,
      events: events,
      data: {
        damage: damage,
        attackerRole: attackerRole,
        defenderRole: defenderRole,
        oldHp: oldHp,
        newHp: newHp,
        isKnockedOut: isKnockedOut,
        moveUsed: moveId
      }
    };
  }
  
  // === AUTRES ACTIONS (ÉTAPES FUTURES) ===
  
  /**
   * Traite l'utilisation d'un objet
   */
  private processItem(action: BattleAction): BattleResult {
    console.log(`🎒 [ActionProcessor] Utilisation objet (pas encore implémenté)`);
    
    return {
      success: false,
      error: 'Objets pas encore implémentés',
      gameState: this.gameState,
      events: ['Les objets seront bientôt disponibles !']
    };
  }
  
  /**
   * Traite le changement de Pokémon
   */
  private processSwitch(action: BattleAction): BattleResult {
    console.log(`🔄 [ActionProcessor] Changement Pokémon (pas encore implémenté)`);
    
    return {
      success: false,
      error: 'Changement de Pokémon pas encore implémenté',
      gameState: this.gameState,
      events: ['Le changement de Pokémon sera bientôt disponible !']
    };
  }
  
  /**
   * Traite une tentative de capture
   */
  private processCapture(action: BattleAction): BattleResult {
    console.log(`🎯 [ActionProcessor] Tentative capture (pas encore implémenté)`);
    
    return {
      success: false,
      error: 'Capture pas encore implémentée',
      gameState: this.gameState,
      events: ['La capture sera bientôt disponible !']
    };
  }
  
  /**
   * Traite une tentative de fuite
   */
  private processRun(action: BattleAction): BattleResult {
    console.log(`🏃 [ActionProcessor] Tentative fuite (pas encore implémenté)`);
    
    return {
      success: false,
      error: 'Fuite pas encore implémentée',
      gameState: this.gameState,
      events: ['La fuite sera bientôt disponible !']
    };
  }
  
  // === MÉTHODES UTILITAIRES ===
  
  /**
   * Récupère l'attaquant et le défenseur
   */
  private getAttackerDefender(playerId: string): {
    attacker: Pokemon | null;
    defender: Pokemon | null;
    attackerRole: 'player1' | 'player2';
    defenderRole: 'player1' | 'player2';
  } {
    if (!this.gameState) {
      return { attacker: null, defender: null, attackerRole: 'player1', defenderRole: 'player2' };
    }
    
    // Déterminer qui attaque
    let attackerRole: 'player1' | 'player2';
    let defenderRole: 'player1' | 'player2';
    
    if (playerId === this.gameState.player1.sessionId) {
      attackerRole = 'player1';
      defenderRole = 'player2';
    } else {
      attackerRole = 'player2';
      defenderRole = 'player1';
    }
    
    const attacker = attackerRole === 'player1' ? this.gameState.player1.pokemon : this.gameState.player2.pokemon;
    const defender = defenderRole === 'player1' ? this.gameState.player1.pokemon : this.gameState.player2.pokemon;
    
    return { attacker, defender, attackerRole, defenderRole };
  }
  
  /**
   * Calcule les dégâts (formule simple pour l'étape 2)
   */
  private calculateDamage(attacker: Pokemon, defender: Pokemon, moveId: string): number {
    // Formule ultra-simple pour commencer
    const basePower = this.getMoveBasePower(moveId);
    const attack = attacker.attack;
    const defense = defender.defense;
    const level = attacker.level;
    
    // Formule Pokémon simplifiée
    const damage = Math.floor(((((2 * level + 10) / 250) * (attack / defense) * basePower) + 2));
    
    // Minimum 1 dégât
    return Math.max(1, damage);
  }
  
  /**
   * Récupère la puissance d'une attaque
   */
  private getMoveBasePower(moveId: string): number {
    // Base de données simple pour l'étape 2
    const moves: Record<string, number> = {
      'tackle': 40,
      'scratch': 40,
      'pound': 40,
      'growl': 0,
      'tail_whip': 0,
      'vine_whip': 45,
      'razor_leaf': 55,
      'poison_sting': 15,
      'string_shot': 0
    };
    
    return moves[moveId] || 40; // Par défaut 40
  }
  
  /**
   * Récupère le nom d'affichage d'une attaque
   */
  private getMoveDisplayName(moveId: string): string {
    const names: Record<string, string> = {
      'tackle': 'Charge',
      'scratch': 'Griffe',
      'pound': 'Écras\'Face',
      'growl': 'Rugissement',
      'tail_whip': 'Fouet Queue',
      'vine_whip': 'Fouet Lianes',
      'razor_leaf': 'Tranch\'Herbe',
      'poison_sting': 'Dard-Venin',
      'string_shot': 'Sécrétion'
    };
    
    return names[moveId] || moveId;
  }
  
  /**
   * Crée un résultat d'erreur
   */
  private createErrorResult(message: string): BattleResult {
    return {
      success: false,
      error: message,
      gameState: this.gameState!,
      events: []
    };
  }
  
  /**
   * Vérifie si l'ActionProcessor est prêt
   */
  isReady(): boolean {
    return this.gameState !== null;
  }
  
  /**
   * Reset pour un nouveau combat
   */
  reset(): void {
    this.gameState = null;
    console.log('🔄 [ActionProcessor] Reset effectué');
  }
}

export default ActionProcessor;
