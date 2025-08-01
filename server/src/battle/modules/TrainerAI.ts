// server/src/battle/modules/TrainerAI.ts
// 🧠 MODULE IA AVANCÉE POUR COMBATS DRESSEURS - SESSION 3

import { BattleGameState, BattleAction, PlayerRole, Pokemon } from '../types/BattleTypes';
import { 
  TrainerData, 
  TrainerAIProfile,
  TrainerStrategy,
  SwitchPattern,
  SwitchAction,
  TRAINER_BATTLE_CONSTANTS 
} from '../types/TrainerBattleTypes';
import { TrainerTeamManager } from '../managers/TrainerTeamManager';
import type { AINPCManager } from '../../Intelligence/AINPCManager';
import { ActionType } from '../../Intelligence/Core/ActionTypes';

// === INTERFACES SPÉCIFIQUES ===

export interface AIDecision {
  success: boolean;
  action: BattleAction | null;
  strategy: string;
  reasoning: string[];
  confidence: number; // 0-1
  alternativeActions: BattleAction[];
  memoryUpdates?: string[];
  thinkingTime: number; // ms calculé selon difficulté
}

export interface BattleContext {
  playerPokemon: Pokemon | null;
  trainerPokemon: Pokemon | null;
  turnNumber: number;
  playerTeamSize: number;
  trainerTeamSize: number;
  recentPlayerActions: string[];
  typeAdvantage: 'favorable' | 'neutral' | 'unfavorable';
  hpRatio: { player: number; trainer: number };
  statusSituation: string;
}

export interface StrategicMemory {
  playerId: string;
  trainerId: string;
  battleCount: number;
  playerPreferences: {
    favoriteActions: string[];
    commonSwitchPatterns: string[];
    averageAggressiveness: number;
    predictabilityScore: number;
  };
  effectiveCounters: {
    action: string;
    counter: string;
    successRate: number;
  }[];
  lastBattleOutcome: 'win' | 'loss' | null;
  lastUpdated: number;
}

export interface MoveAnalysis {
  moveId: string;
  power: number;
  accuracy: number;
  pp: number;
  type: string;
  category: 'physical' | 'special' | 'status';
  priority: number;
  effectiveness: number; // Contre le Pokémon adversaire
  strategicValue: number; // Valeur calculée selon la situation
}

/**
 * TRAINER AI - Intelligence artificielle avancée pour dresseurs
 * 
 * Responsabilités :
 * - Prendre des décisions tactiques selon profil du dresseur
 * - Mémoriser les patterns du joueur pour adaptation
 * - Intégration avec AINPCManager pour apprentissage
 * - Gestion changements de Pokémon intelligents
 * - Adaptation difficulté selon classe dresseur
 */
export class TrainerAI {
  
  private trainerData: TrainerData | null = null;
  private aiNPCManager: AINPCManager | null = null;
  private trainerTeamManager: TrainerTeamManager | null = null;
  private strategicMemory: Map<string, StrategicMemory> = new Map();
  private isInitialized = false;
  
  // État de décision
  private lastDecision: AIDecision | null = null;
  private decisionHistory: AIDecision[] = [];
  private battleContext: BattleContext | null = null;
  
  // Configuration adaptative
  private thinkingDelays = {
    easy: { min: 800, max: 1500 },
    normal: { min: 1200, max: 2200 },
    hard: { min: 1500, max: 2800 },
    expert: { min: 1800, max: 3500 }
  };
  
  constructor() {
    console.log('🧠 [TrainerAI] Module IA dresseurs initialisé');
  }
  
  // === INITIALISATION ===
  
  initialize(
    trainerData: TrainerData,
    aiNPCManager?: AINPCManager,
    trainerTeamManager?: TrainerTeamManager
  ): void {
    this.trainerData = trainerData;
    this.aiNPCManager = aiNPCManager || null;
    this.trainerTeamManager = trainerTeamManager || null;
    
    // Charger mémoire stratégique si disponible
    this.loadStrategicMemory();
    
    this.isInitialized = true;
    
    console.log(`✅ [TrainerAI] Initialisé pour ${trainerData.name} (${trainerData.trainerClass})`);
    console.log(`    Difficulté: ${trainerData.aiProfile.difficulty}`);
    console.log(`    Stratégies: ${trainerData.aiProfile.strategies.length}`);
    console.log(`    Mémoire: ${trainerData.aiProfile.memory ? 'Activée' : 'Désactivée'}`);
  }
  
  // === API PRINCIPALE ===
  
  /**
   * Prend une décision de combat intelligente
   */
  makeDecision(
    gameState: BattleGameState,
    playerPokemon: Pokemon | null,
    turnNumber: number
  ): AIDecision {
    
    if (!this.isInitialized || !this.trainerData) {
      return this.createFailureDecision('IA non initialisée');
    }
    
    console.log(`🧠 [TrainerAI] Décision pour ${this.trainerData.name} - Tour ${turnNumber}`);
    
    try {
      // 1. Analyser le contexte actuel
      this.battleContext = this.analyzeBattleContext(gameState, playerPokemon, turnNumber);
      
      // 2. Évaluer toutes les stratégies disponibles
      const availableStrategies = this.evaluateStrategies(this.battleContext);
      
      // 3. Sélectionner la meilleure stratégie
      const selectedStrategy = this.selectBestStrategy(availableStrategies);
      
      // 4. Générer l'action correspondante
      const action = this.generateActionForStrategy(selectedStrategy, this.battleContext);
      
      // 5. Calculer alternatives et confiance
      const alternatives = this.generateAlternativeActions(availableStrategies.slice(1, 3));
      const confidence = this.calculateDecisionConfidence(selectedStrategy, this.battleContext);
      
      // 6. Créer la décision finale
      const decision: AIDecision = {
        success: action !== null,
        action,
        strategy: selectedStrategy.name,
        reasoning: this.generateReasoning(selectedStrategy, this.battleContext),
        confidence,
        alternativeActions: alternatives,
        thinkingTime: this.calculateThinkingTime()
      };
      
      // 7. Mémoriser pour apprentissage
      this.recordDecision(decision);
      
      console.log(`🎯 [TrainerAI] Décision: ${decision.strategy} (confiance: ${(confidence * 100).toFixed(1)}%)`);
      
      return decision;
      
    } catch (error) {
      console.error(`❌ [TrainerAI] Erreur prise de décision:`, error);
      return this.createFailureDecision(
        error instanceof Error ? error.message : 'Erreur inconnue'
      );
    }
  }
  
  /**
   * Obtient le délai de réflexion selon la difficulté
   */
  getThinkingDelay(): number {
    if (!this.trainerData) return 1500;
    
    const delays = this.thinkingDelays[this.trainerData.aiProfile.difficulty];
    return delays.min + Math.random() * (delays.max - delays.min);
  }
  
  // === ANALYSE CONTEXTUELLE ===
  
  private analyzeBattleContext(
    gameState: BattleGameState,
    playerPokemon: Pokemon | null,
    turnNumber: number
  ): BattleContext {
    
    const trainerPokemon = gameState.player2.pokemon;
    
    // Calculer avantage de type
    const typeAdvantage = this.calculateTypeAdvantage(trainerPokemon, playerPokemon);
    
    // Calculer ratios HP
    const hpRatio = {
      player: playerPokemon ? (playerPokemon.currentHp / playerPokemon.maxHp) : 0,
      trainer: trainerPokemon ? (trainerPokemon.currentHp / trainerPokemon.maxHp) : 0
    };
    
    // Analyser situation statuts
    const statusSituation = this.analyzeStatusSituation(trainerPokemon, playerPokemon);
    
    // Obtenir tailles d'équipes
    const playerTeamSize = this.estimatePlayerTeamSize();
    const trainerTeamSize = this.trainerTeamManager?.getAllPokemon().length || 1;
    
    return {
      playerPokemon,
      trainerPokemon,
      turnNumber,
      playerTeamSize,
      trainerTeamSize,
      recentPlayerActions: this.getRecentPlayerActions(),
      typeAdvantage,
      hpRatio,
      statusSituation
    };
  }
  
  private calculateTypeAdvantage(
    trainerPokemon: Pokemon | null,
    playerPokemon: Pokemon | null
  ): 'favorable' | 'neutral' | 'unfavorable' {
    
    if (!trainerPokemon || !playerPokemon) return 'neutral';
    
    // Analyse simplifiée des types (à améliorer avec vraie table des types)
    const typeChart: Record<string, Record<string, number>> = {
      'fire': { 'grass': 2, 'water': 0.5, 'rock': 2 },
      'water': { 'fire': 2, 'grass': 0.5, 'rock': 2 },
      'grass': { 'water': 2, 'fire': 0.5, 'rock': 2 },
      'electric': { 'water': 2, 'flying': 2, 'ground': 0 },
      'rock': { 'fire': 2, 'flying': 2, 'grass': 2 }
    };
    
    let advantage = 1.0;
    
    // Calculer efficacité des attaques dresseur contre joueur
    for (const trainerType of trainerPokemon.types) {
      for (const playerType of playerPokemon.types) {
        const multiplier = typeChart[trainerType]?.[playerType] ?? 1.0;
        advantage *= multiplier;
      }
    }
    
    if (advantage > 1.2) return 'favorable';
    if (advantage < 0.8) return 'unfavorable';
    return 'neutral';
  }
  
  private analyzeStatusSituation(
    trainerPokemon: Pokemon | null,
    playerPokemon: Pokemon | null
  ): string {
    
    const situations = [];
    
    if (trainerPokemon?.status && trainerPokemon.status !== 'normal') {
      situations.push(`trainer_${trainerPokemon.status}`);
    }
    
    if (playerPokemon?.status && playerPokemon.status !== 'normal') {
      situations.push(`player_${playerPokemon.status}`);
    }
    
    return situations.length > 0 ? situations.join('_') : 'normal';
  }
  
  // === ÉVALUATION STRATÉGIES ===
  
  private evaluateStrategies(context: BattleContext): Array<TrainerStrategy & { score: number }> {
    if (!this.trainerData) return [];
    
    const evaluatedStrategies = this.trainerData.aiProfile.strategies.map(strategy => {
      const score = this.calculateStrategyScore(strategy, context);
      return { ...strategy, score };
    });
    
    // Trier par score décroissant
    return evaluatedStrategies.sort((a, b) => b.score - a.score);
  }
  
  private calculateStrategyScore(strategy: TrainerStrategy, context: BattleContext): number {
    let score = strategy.priority; // Score de base
    
    // Évaluer les conditions
    for (const condition of strategy.conditions) {
      if (this.evaluateCondition(condition, context)) {
        score += 20; // Bonus si condition remplie
      } else {
        score -= 10; // Malus si condition non remplie
      }
    }
    
    // Ajustements selon la situation
    score += this.getContextualBonus(strategy, context);
    
    // Facteur d'aggressivité du dresseur
    const aggressiveness = this.trainerData?.aiProfile.aggressiveness || 50;
    if (strategy.name.includes('aggressive') || strategy.name.includes('attack')) {
      score += (aggressiveness - 50) * 0.5;
    }
    
    return Math.max(0, score);
  }
  
  private evaluateCondition(condition: string, context: BattleContext): boolean {
    switch (condition) {
      case 'always':
        return true;
        
      case 'hp_below_25':
        return context.hpRatio.trainer < 0.25;
        
      case 'hp_below_50':
        return context.hpRatio.trainer < 0.5;
        
      case 'hp_above_75':
        return context.hpRatio.trainer > 0.75;
        
      case 'has_type_advantage':
        return context.typeAdvantage === 'favorable';
        
      case 'type_disadvantage':
        return context.typeAdvantage === 'unfavorable';
        
      case 'first_pokemon':
        return context.turnNumber <= 3;
        
      case 'enemy_switching':
        return this.getRecentPlayerActions().includes('switch');
        
      case 'can_predict_player_move':
        return this.trainerData?.aiProfile.intelligence > 70;
        
      case 'last_pokemon':
        return this.trainerTeamManager?.analyzeTeam().alivePokemon === 1;
        
      default:
        return false;
    }
  }
  
  private getContextualBonus(strategy: TrainerStrategy, context: BattleContext): number {
    let bonus = 0;
    
    // Bonus selon le nom de la stratégie et le contexte
    if (strategy.name === 'defensive_switch' && context.hpRatio.trainer < 0.3) {
      bonus += 15;
    }
    
    if (strategy.name === 'type_advantage' && context.typeAdvantage === 'favorable') {
      bonus += 25;
    }
    
    if (strategy.name === 'setup_sweep' && context.turnNumber <= 5) {
      bonus += 20;
    }
    
    return bonus;
  }
  
  // === GÉNÉRATION D'ACTIONS ===
  
  private generateActionForStrategy(
    strategy: TrainerStrategy,
    context: BattleContext
  ): BattleAction | null {
    
    if (!this.trainerData || !context.trainerPokemon) return null;
    
    const actions = strategy.actions;
    
    for (const actionType of actions) {
      const action = this.createActionForType(actionType, context);
      if (action) {
        console.log(`⚔️ [TrainerAI] Action générée: ${actionType} pour stratégie ${strategy.name}`);
        return action;
      }
    }
    
    // Fallback : attaque basique
    return this.createBasicAttackAction(context);
  }
  
  private createActionForType(actionType: string, context: BattleContext): BattleAction | null {
    if (!this.trainerData || !context.trainerPokemon) return null;
    
    switch (actionType) {
      case 'use_effective_move':
        return this.createEffectiveMoveAction(context);
        
      case 'use_random_move':
        return this.createRandomMoveAction(context);
        
      case 'use_stat_boost':
        return this.createStatBoostAction(context);
        
      case 'switch_to_resistant':
        return this.createSwitchAction('type_advantage', context);
        
      case 'switch_to_faster':  
        return this.createSwitchAction('speed', context);
        
      case 'use_potion':
        return this.createItemAction('potion', context);
        
      case 'predict_switch':
        return this.createPredictiveMoveAction(context);
        
      case 'maximize_damage':
        return this.createMaxDamageAction(context);
        
      default:
        return null;
    }
  }
  
  private createEffectiveMoveAction(context: BattleContext): BattleAction | null {
    if (!context.trainerPokemon || !context.playerPokemon) return null;
    
    // Analyser toutes les attaques disponibles
    const moveAnalyses = context.trainerPokemon.moves.map(moveId => 
      this.analyzeMoveEffectiveness(moveId, context.trainerPokemon!, context.playerPokemon!)
    );
    
    // Sélectionner la plus efficace
    const bestMove = moveAnalyses.reduce((best, current) => 
      current.effectiveness > best.effectiveness ? current : best
    );
    
    return {
      actionId: `ai_effective_${Date.now()}`,
      playerId: 'ai',
      type: 'attack',
      data: { moveId: bestMove.moveId },
      timestamp: Date.now()
    };
  }
  
  private createSwitchAction(criterion: string, context: BattleContext): BattleAction | null {
    if (!this.trainerTeamManager) return null;
    
    const analysis = this.trainerTeamManager.analyzeTeam();
    if (analysis.alivePokemon <= 1) return null;
    
    // Trouver le meilleur Pokémon selon le critère
    const allPokemon = this.trainerTeamManager.getAllPokemon();
    const activePokemonIndex = this.trainerTeamManager.findPokemonIndex(
      context.trainerPokemon?.combatId || ''
    );
    
    let bestIndex = -1;
    let bestScore = -1;
    
    allPokemon.forEach((pokemon, index) => {
      if (pokemon.currentHp <= 0 || index === activePokemonIndex) return;
      
      let score = 0;
      
      switch (criterion) {
        case 'type_advantage':
          score = this.calculateTypeAdvantageScore(pokemon, context.playerPokemon);
          break;
        case 'speed':
          score = pokemon.speed;
          break;
        case 'hp':
          score = pokemon.currentHp / pokemon.maxHp;
          break;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    
    if (bestIndex === -1) return null;
    
    const switchAction: SwitchAction = {
      actionId: `ai_switch_${Date.now()}`,
      playerId: 'ai',
      type: 'switch',
      data: {
        fromPokemonIndex: activePokemonIndex,
        toPokemonIndex: bestIndex,
        isForced: false,
        reason: `strategic_${criterion}`
      },
      timestamp: Date.now()
    };
    
    return switchAction;
  }
  
  private createBasicAttackAction(context: BattleContext): BattleAction | null {
    if (!context.trainerPokemon) return null;
    
    // Choisir une attaque aléatoire offensive
    const offensiveMoves = context.trainerPokemon.moves.filter(move => 
      !['growl', 'tail_whip', 'string_shot'].includes(move)
    );
    
    const chosenMove = offensiveMoves.length > 0 ? 
      offensiveMoves[Math.floor(Math.random() * offensiveMoves.length)] :
      context.trainerPokemon.moves[0];
    
    return {
      actionId: `ai_basic_${Date.now()}`,
      playerId: 'ai',
      type: 'attack',
      data: { moveId: chosenMove },
      timestamp: Date.now()
    };
  }
  
  // === ANALYSE D'ATTAQUES ===
  
  private analyzeMoveEffectiveness(
    moveId: string,
    attacker: Pokemon,
    defender: Pokemon
  ): MoveAnalysis {
    
    // Base de données simplifiée des attaques
    const movesDB: Record<string, any> = {
      'tackle': { power: 40, accuracy: 100, type: 'normal', category: 'physical', priority: 0 },
      'thunderbolt': { power: 90, accuracy: 100, type: 'electric', category: 'special', priority: 0 },
      'ember': { power: 40, accuracy: 100, type: 'fire', category: 'special', priority: 0 },
      'vine_whip': { power: 45, accuracy: 100, type: 'grass', category: 'physical', priority: 0 },
      'quick_attack': { power: 40, accuracy: 100, type: 'normal', category: 'physical', priority: 1 }
    };
    
    const moveData = movesDB[moveId] || { power: 40, accuracy: 100, type: 'normal', category: 'physical', priority: 0 };
    
    // Calculer efficacité de type (simplifié)
    const effectiveness = this.calculateMoveTypeEffectiveness(moveData.type, defender.types);
    
    // Calculer valeur stratégique
    const strategicValue = this.calculateStrategicValue(moveData, attacker, defender, effectiveness);
    
    return {
      moveId,
      power: moveData.power,
      accuracy: moveData.accuracy,
      pp: 20, // Simplifié
      type: moveData.type,
      category: moveData.category,
      priority: moveData.priority,
      effectiveness,
      strategicValue
    };
  }
  
  private calculateMoveTypeEffectiveness(moveType: string, defenderTypes: string[]): number {
    // Table des types simplifiée
    const typeChart: Record<string, Record<string, number>> = {
      'fire': { 'grass': 2, 'water': 0.5, 'fire': 0.5 },
      'water': { 'fire': 2, 'rock': 2, 'water': 0.5 },
      'electric': { 'water': 2, 'flying': 2, 'ground': 0 },
      'grass': { 'water': 2, 'rock': 2, 'fire': 0.5 }
    };
    
    let effectiveness = 1.0;
    
    for (const defenderType of defenderTypes) {
      const multiplier = typeChart[moveType]?.[defenderType] ?? 1.0;
      effectiveness *= multiplier;
    }
    
    return effectiveness;
  }
  
  private calculateStrategicValue(
    moveData: any,
    attacker: Pokemon,
    defender: Pokemon,
    effectiveness: number
  ): number {
    
    let value = moveData.power * effectiveness;
    
    // Bonus pour haute précision
    value *= (moveData.accuracy / 100);
    
    // Bonus pour priorité
    value += moveData.priority * 10;
    
    // Malus si défenseur presque KO (pas besoin d'overkill)
    const defenderHpRatio = defender.currentHp / defender.maxHp;
    if (defenderHpRatio < 0.2 && value > defender.currentHp) {
      value *= 0.7; // Réduire valeur si overkill
    }
    
    return value;
  }
  
  // === ALTERNATIVES ET CONFIANCE ===
  
  private generateAlternativeActions(strategies: TrainerStrategy[]): BattleAction[] {
    const alternatives: BattleAction[] = [];
    
    for (const strategy of strategies.slice(0, 2)) {
      const action = this.generateActionForStrategy(strategy, this.battleContext!);
      if (action) {
        alternatives.push(action);
      }
    }
    
    return alternatives;
  }
  
  private calculateDecisionConfidence(strategy: TrainerStrategy, context: BattleContext): number {
    let confidence = 0.5; // Base
    
    // Bonus selon intelligence du dresseur
    const intelligence = this.trainerData?.aiProfile.intelligence || 50;
    confidence += (intelligence - 50) / 200; // -0.25 à +0.25
    
    // Bonus si stratégie bien adaptée au contexte
    if (strategy.score > 50) {
      confidence += 0.2;
    }
    
    // Bonus selon avantage de type
    if (context.typeAdvantage === 'favorable') {
      confidence += 0.15;
    } else if (context.typeAdvantage === 'unfavorable') {
      confidence -= 0.1;
    }
    
    // Bonus selon état HP
    if (context.hpRatio.trainer > 0.7) {
      confidence += 0.1;
    } else if (context.hpRatio.trainer < 0.3) {
      confidence -= 0.15;
    }
    
    return Math.max(0.1, Math.min(0.95, confidence));
  }
  
  // === RAISONNEMENT ===
  
  private generateReasoning(strategy: TrainerStrategy, context: BattleContext): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`Stratégie choisie: ${strategy.name} (priorité: ${strategy.priority})`);
    
    // Analyse du contexte
    if (context.typeAdvantage === 'favorable') {
      reasoning.push('Avantage de type favorable');
    } else if (context.typeAdvantage === 'unfavorable') {
      reasoning.push('Désavantage de type, adaptation nécessaire');
    }
    
    // État HP
    if (context.hpRatio.trainer < 0.3) {
      reasoning.push('HP critiques, stratégie défensive prioritaire');
    } else if (context.hpRatio.trainer > 0.8) {
      reasoning.push('HP élevés, peut jouer offensif');
    }
    
    // Tour de combat
    if (context.turnNumber <= 3) {
      reasoning.push('Début de combat, établir l\'avantage');
    } else if (context.turnNumber >= 10) {
      reasoning.push('Combat prolongé, optimiser les ressources');
    }
    
    // Actions récentes joueur
    const recentActions = context.recentPlayerActions;
    if (recentActions.includes('attack')) {
      reasoning.push('Joueur agressif récemment');
    } else if (recentActions.includes('switch')) {
      reasoning.push('Joueur fait des changements tactiques');
    }
    
    return reasoning;
  }
  
  // === UTILITAIRES ===
  
  private selectBestStrategy(strategies: Array<TrainerStrategy & { score: number }>): TrainerStrategy {
    // Ajouter un facteur aléatoire selon difficulté
    const randomFactor = this.getRandomFactor();
    
    if (randomFactor > 0.8 && strategies.length > 1) {
      // Parfois choisir la 2ème meilleure pour imprévisibilité
      return strategies[1];
    }
    
    return strategies[0];
  }
  
  private getRandomFactor(): number {
    if (!this.trainerData) return 0.5;
    
    // Plus l'IA est intelligente, moins elle est aléatoire
    const intelligence = this.trainerData.aiProfile.intelligence;
    return Math.max(0.1, (100 - intelligence) / 100);
  }
  
  private calculateThinkingTime(): number {
    if (!this.trainerData) return 1500;
    
    const delays = this.thinkingDelays[this.trainerData.aiProfile.difficulty];
    const baseTime = delays.min + Math.random() * (delays.max - delays.min);
    
    // Ajuster selon complexité de la décision
    const complexity = this.lastDecision?.alternativeActions.length || 1;
    return baseTime + (complexity * 200);
  }
  
  private estimatePlayerTeamSize(): number {
    // TODO: Améliorer avec vraies données équipe joueur
    return 1; // Simplifié pour l'instant
  }
  
  private getRecentPlayerActions(): string[] {
    // TODO: Implémenter avec vraie mémoire des actions
    return ['attack']; // Simplifié
  }
  
  private calculateTypeAdvantageScore(pokemon: Pokemon, target: Pokemon | null): number {
    if (!target) return 0;
    
    let score = 0;
    for (const pokemonType of pokemon.types) {
      for (const targetType of target.types) {
        score += this.calculateMoveTypeEffectiveness(pokemonType, [targetType]);
      }
    }
    
    return score;
  }
  
  private createRandomMoveAction(context: BattleContext): BattleAction | null {
    if (!context.trainerPokemon) return null;
    
    const moves = context.trainerPokemon.moves;
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    
    return {
      actionId: `ai_random_${Date.now()}`,
      playerId: 'ai',
      type: 'attack',
      data: { moveId: randomMove },
      timestamp: Date.now()
    };
  }
  
  private createStatBoostAction(context: BattleContext): BattleAction | null {
    // Retourner attaque de boost si disponible, sinon attaque normale
    const boostMoves = ['growl', 'tail_whip', 'string_shot'];
    const availableBoosts = context.trainerPokemon?.moves.filter(move => 
      boostMoves.includes(move)
    ) || [];
    
    if (availableBoosts.length > 0) {
      return {
        actionId: `ai_boost_${Date.now()}`,
        playerId: 'ai',
        type: 'attack',
        data: { moveId: availableBoosts[0] },
        timestamp: Date.now()
      };
    }
    
    return this.createBasicAttackAction(context);
  }
  
  private createItemAction(itemType: string, context: BattleContext): BattleAction | null {
    // Les objets ne sont pas encore implémentés, fallback sur attaque
    return this.createBasicAttackAction(context);
  }
  
  private createPredictiveMoveAction(context: BattleContext): BattleAction | null {
    // IA experte peut prédire changements joueur
    const recentActions = this.getRecentPlayerActions();
    
    if (recentActions.includes('switch') && context.typeAdvantage === 'unfavorable') {
      // Prédire que le joueur va changer, utiliser attaque qui touche les changements
      return this.createEffectiveMoveAction(context);
    }
    
    return this.createBasicAttackAction(context);
  }
  
  private createMaxDamageAction(context: BattleContext): BattleAction | null {
    if (!context.trainerPokemon || !context.playerPokemon) return null;
    
    // Analyser toutes les attaques pour trouver celle qui fait le plus de dégâts
    const moveAnalyses = context.trainerPokemon.moves.map(moveId => 
      this.analyzeMoveEffectiveness(moveId, context.trainerPokemon!, context.playerPokemon!)
    );
    
    const maxDamageMove = moveAnalyses.reduce((best, current) => 
      current.strategicValue > best.strategicValue ? current : best
    );
    
    return {
      actionId: `ai_maxdamage_${Date.now()}`,
      playerId: 'ai',
      type: 'attack',
      data: { moveId: maxDamageMove.moveId },
      timestamp: Date.now()
    };
  }
  
  // === MÉMOIRE ET APPRENTISSAGE ===
  
  private recordDecision(decision: AIDecision): void {
    this.lastDecision = decision;
    
    // Limiter l'historique
    this.decisionHistory.push(decision);
    if (this.decisionHistory.length > 20) {
      this.decisionHistory.shift();
    }
    
    // Intégration avec AINPCManager pour apprentissage
    if (this.aiNPCManager && this.trainerData) {
      this.trackDecisionWithAI(decision);
    }
  }
  
  private trackDecisionWithAI(decision: AIDecision): void {
    if (!this.aiNPCManager || !this.trainerData) return;
    
    try {
      this.aiNPCManager.trackPlayerAction(
        'AI_TRAINER',
        ActionType.NPC_TALK, // Réutiliser pour décisions IA
        {
          trainerId: this.trainerData.trainerId,
          strategy: decision.strategy,
          confidence: decision.confidence,
          action: decision.action?.type,
          reasoning: decision.reasoning.join('; '),
          battleContext: {
            turnNumber: this.battleContext?.turnNumber,
            typeAdvantage: this.battleContext?.typeAdvantage,
            hpRatio: this.battleContext?.hpRatio
          }
        }
      );
    } catch (error) {
      // Silencieux pour éviter spam
    }
  }
  
  private loadStrategicMemory(): void {
    // TODO: Implémenter chargement depuis base de données
    console.log('📚 [TrainerAI] Chargement mémoire stratégique...');
  }
  
  // === ERREURS ET FALLBACKS ===
  
  private createFailureDecision(reason: string): AIDecision {
    return {
      success: false,
      action: null,
      strategy: 'fallback',
      reasoning: [`Échec prise de décision: ${reason}`],
      confidence: 0.1,
      alternativeActions: [],
      thinkingTime: 1000
    };
  }
  
  // === API PUBLIQUE ===
  
  isReady(): boolean {
    return this.isInitialized && this.trainerData !== null;
  }
  
  getLastDecision(): AIDecision | null {
    return this.lastDecision;
  }
  
  getDecisionHistory(): AIDecision[] {
    return [...this.decisionHistory];
  }
  
  getBattleContext(): BattleContext | null {
    return this.battleContext;
  }
  
  // === DIAGNOSTICS ===
  
  getStats(): any {
    return {
      version: 'trainer_ai_v1',
      isReady: this.isReady(),
      trainerName: this.trainerData?.name,
      trainerClass: this.trainerData?.trainerClass,
      difficulty: this.trainerData?.aiProfile.difficulty,
      intelligence: this.trainerData?.aiProfile.intelligence,
      aggressiveness: this.trainerData?.aiProfile.aggressiveness,
      memoryEnabled: this.trainerData?.aiProfile.memory,
      decisionsMade: this.decisionHistory.length,
      lastDecision: this.lastDecision ? {
        strategy: this.lastDecision.strategy,
        confidence: this.lastDecision.confidence,
        thinkingTime: this.lastDecision.thinkingTime
      } : null,
      features: [
        'contextual_analysis',
        'strategy_evaluation',
        'type_effectiveness_calculation',
        'adaptive_difficulty',
        'memory_system_ready',
        'ainpc_integration',
        'switch_strategy_support',
        'predictive_analysis'
      ]
    };
  }
  
  reset(): void {
    this.lastDecision = null;
    this.decisionHistory = [];
    this.battleContext = null;
    this.isInitialized = false;
    console.log('🔄 [TrainerAI] Reset effectué');
  }
}

export default TrainerAI;
