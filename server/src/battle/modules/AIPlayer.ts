// server/src/battle/modules/AIPlayer.ts
// ÉTAPE 2.2 : IA basique pour les combats

import { BattleGameState, BattleAction, Pokemon } from '../types/BattleTypes';
import { getRandomAIDelay, isFeatureEnabled, BATTLE_CONSTANTS } from '../config/BattleConfig';

/**
 * AI PLAYER - Intelligence artificielle pour les combats
 * 
 * Responsabilités :
 * - Choisir une attaque aléatoire
 * - Générer des actions pour l'IA
 * - Logique simple mais efficace
 * 
 * ÉTAPE 2.2 : IA ultra-basique (attaque aléatoire)
 * Plus tard : IA plus intelligente avec stratégie
 */
export class AIPlayer {
  
  private gameState: BattleGameState | null = null;
  
  constructor() {
    console.log('🤖 [AIPlayer] Initialisé');
  }
  
  // === INITIALISATION ===
  
  /**
   * Initialise avec l'état du jeu
   */
  initialize(gameState: BattleGameState): void {
    this.gameState = gameState;
    console.log('✅ [AIPlayer] Configuré pour le combat');
  }
  
  // === GÉNÉRATION D'ACTIONS ===
  
  /**
   * Génère une action pour l'IA
   */
  generateAction(): BattleAction | null {
    console.log('🧠 [AIPlayer] Génération action IA...');
    
    if (!this.gameState) {
      console.error('❌ [AIPlayer] Pas d\'état de jeu disponible');
      return null;
    }
    
    // Vérifier si l'IA est activée
    if (!isFeatureEnabled('aiEnabled')) {
      console.log('⏸️ [AIPlayer] IA désactivée dans la configuration');
      return null;
    }
    
    // Récupérer le Pokémon de l'IA (player2)
    const aiPokemon = this.gameState.player2.pokemon;
    if (!aiPokemon) {
      console.error('❌ [AIPlayer] Aucun Pokémon IA disponible');
      return null;
    }
    
    // Vérifier si le Pokémon peut agir
    if (aiPokemon.currentHp <= 0) {
      console.log('💀 [AIPlayer] Pokémon IA K.O., aucune action possible');
      return null;
    }
    
    // Choisir une action (pour l'instant, seulement attaque)
    const actionType = this.chooseActionType(aiPokemon);
    
    switch (actionType) {
      case 'attack':
        return this.generateAttackAction(aiPokemon);
        
      case 'run':
        // TODO: Implémenté plus tard
        console.log('🏃 [AIPlayer] Fuite pas encore implémentée');
        return this.generateAttackAction(aiPokemon); // Fallback sur attaque
        
      default:
        return this.generateAttackAction(aiPokemon);
    }
  }
  
  /**
   * Calcule le délai de réflexion de l'IA
   */
getThinkingDelay(): number {
  // Combat sauvage : pas de délai de réflexion
  if (this.gameState?.type === 'wild') {
    console.log(`🌿 [AIPlayer] Combat sauvage - Pas de réflexion (0ms)`);
    return 0;
  }
  
  // Combat dresseur : délai de réflexion normal
  const delay = getRandomAIDelay();
  console.log(`🤔 [AIPlayer] Combat dresseur - Temps de réflexion: ${delay}ms`);
  return delay;
}
  
  // === CHOIX D'ACTIONS ===
  
  /**
   * Choisit le type d'action à effectuer
   */
  private chooseActionType(aiPokemon: Pokemon): 'attack' | 'run' {
    // ÉTAPE 2.2 : Logique ultra-simple
    // L'IA attaque toujours pour l'instant
    
    // Plus tard : logique plus avancée
    // - Fuir si HP très bas
    // - Utiliser des objets si disponibles
    // - Changer de Pokémon si en difficulté
    
    return 'attack';
  }
  
  /**
   * Génère une action d'attaque
   */
  private generateAttackAction(aiPokemon: Pokemon): BattleAction | null {
    console.log(`⚔️ [AIPlayer] Génération attaque pour ${aiPokemon.name}`);
    
    // Récupérer les attaques disponibles
    const availableMoves = this.getAvailableMoves(aiPokemon);
    
    if (availableMoves.length === 0) {
      console.error('❌ [AIPlayer] Aucune attaque disponible');
      return null;
    }
    
    // Choisir une attaque (logique simple pour l'étape 2.2)
    const chosenMove = this.chooseMove(availableMoves, aiPokemon);
    
    console.log(`🎯 [AIPlayer] IA choisit: ${chosenMove}`);
    
    // Créer l'action
    return {
      actionId: `ai_action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId: this.gameState!.player2.sessionId, // 'ai' ou 'player2'
      type: 'attack',
      data: {
        moveId: chosenMove
      },
      timestamp: Date.now()
    };
  }
  
  /**
   * Récupère les attaques disponibles
   */
  private getAvailableMoves(pokemon: Pokemon): string[] {
    // Pour l'instant, toutes les attaques sont disponibles
    // Plus tard : gérer les PP, les attaques désactivées, etc.
    
    const moves = pokemon.moves.filter(move => {
      // Filtrer les attaques non-offensives pour l'IA simple
      return this.isOffensiveMove(move);
    });
    
    // Si aucune attaque offensive, utiliser toutes les attaques
    return moves.length > 0 ? moves : pokemon.moves;
  }
  
  /**
   * Choisit quelle attaque utiliser
   */
  private chooseMove(availableMoves: string[], aiPokemon: Pokemon): string {
    // ÉTAPE 2.2 : Choix aléatoire simple
    const randomIndex = Math.floor(Math.random() * availableMoves.length);
    const chosenMove = availableMoves[randomIndex];
    
    console.log(`🎲 [AIPlayer] Choix aléatoire: ${chosenMove} (${randomIndex + 1}/${availableMoves.length})`);
    
    return chosenMove;
    
    // TODO: Logique plus avancée pour les prochaines étapes
    // - Prioriser les attaques super efficaces
    // - Éviter les attaques pas très efficaces
    // - Considérer la puissance des attaques
    // - Utiliser des attaques de statut quand approprié
  }
  
  /**
   * Vérifie si une attaque est offensive
   */
  private isOffensiveMove(moveId: string): boolean {
    // Liste des attaques non-offensives
    const nonOffensiveMoves = [
      'growl', 'tail_whip', 'leer', 'string_shot',
      'sand_attack', 'smokescreen', 'withdraw',
      'harden', 'defense_curl', 'barrier'
    ];
    
    return !nonOffensiveMoves.includes(moveId.toLowerCase());
  }
  
  // === ÉVALUATION (POUR PLUS TARD) ===
  
  /**
   * Évalue la situation actuelle du combat
   */
  private evaluateBattleSituation(): 'winning' | 'losing' | 'even' {
    if (!this.gameState) return 'even';
    
    const aiPokemon = this.gameState.player2.pokemon;
    const playerPokemon = this.gameState.player1.pokemon;
    
    if (!aiPokemon || !playerPokemon) return 'even';
    
    const aiHpPercent = (aiPokemon.currentHp / aiPokemon.maxHp) * 100;
    const playerHpPercent = (playerPokemon.currentHp / playerPokemon.maxHp) * 100;
    
    const hpDifference = aiHpPercent - playerHpPercent;
    
    if (hpDifference > 20) return 'winning';
    if (hpDifference < -20) return 'losing';
    return 'even';
  }
  
  /**
   * Calcule l'efficacité d'un type contre un autre (basique)
   */
  private getTypeEffectiveness(attackType: string, defenderTypes: string[]): number {
    // TODO: Implémenter le tableau des types complet
    // Pour l'instant, retourner 1.0 (efficacité normale)
    
    // Quelques exemples basiques
    const typeChart: Record<string, Record<string, number>> = {
      'Fire': { 'Grass': 2.0, 'Water': 0.5, 'Fire': 0.5 },
      'Water': { 'Fire': 2.0, 'Grass': 0.5, 'Water': 0.5 },
      'Grass': { 'Water': 2.0, 'Fire': 0.5, 'Grass': 0.5 },
      'Electric': { 'Water': 2.0, 'Flying': 2.0, 'Ground': 0.0 },
    };
    
    let effectiveness = 1.0;
    
    for (const defenderType of defenderTypes) {
      const modifier = typeChart[attackType]?.[defenderType] ?? 1.0;
      effectiveness *= modifier;
    }
    
    return effectiveness;
  }
  
  // === UTILITAIRES ===
  
  /**
   * Vérifie si l'AIPlayer est prêt
   */
  isReady(): boolean {
    return this.gameState !== null && isFeatureEnabled('aiEnabled');
  }
  
  /**
   * Reset pour un nouveau combat
   */
  reset(): void {
    this.gameState = null;
    console.log('🔄 [AIPlayer] Reset effectué');
  }
  
  /**
   * Obtient des statistiques sur l'IA
   */
  getStats(): any {
    return {
      version: 'basic_v1',
      strategy: 'random_attack',
      features: ['offensive_moves_priority'],
      thinkingTime: `${getRandomAIDelay()}ms variable`,
      enabled: isFeatureEnabled('aiEnabled')
    };
  }
}

export default AIPlayer;
