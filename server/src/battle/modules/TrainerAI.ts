// server/src/battle/modules/TrainerAI.ts
// 🧠 SESSION 3 - IA DRESSEUR INTELLIGENTE AVEC INTEGRATION AINPCMANAGER

import { BattleGameState, BattleAction, PlayerRole, Pokemon } from '../types/BattleTypes';
import { 
  TrainerData, 
  TrainerAIProfile, 
  TrainerStrategy, 
  SwitchPattern,
  SwitchAction,
  AIDecisionData,
  BattleMemoryData
} from '../types/TrainerBattleTypes';
import type { AINPCManager } from '../../Intelligence/AINPCManager';
import { TrainerTeamManager } from '../managers/TrainerTeamManager';
import { ActionType } from '../../Intelligence/Core/ActionTypes';

// === INTERFACES SPÉCIFIQUES ===

export interface AIDecision {
  success: boolean;
  action: BattleAction | null;
  strategy: string;
  reasoning: string[];
  confidence: number; // 0-1
  alternativeActions: BattleAction[];
  memoryUpdate?: BattleMemoryData;
  error?: string;
}

export interface BattleSituation {
  myPokemon: Pokemon;
  enemyPokemon: Pokemon;
  myTeamAnalysis: any;
  enemyEstimatedTeam: any;
  turnNumber: number;
  battleHistory: ActionHistory[];
  typeAdvantage: number; // -2 à +2
  hpRatio: number; // Mon HP / HP ennemi
  speedAdvantage: boolean;
  statusEffects: string[];
}

export interface ActionHistory {
  turn: number;
  playerAction: BattleAction;
  trainerAction: BattleAction;
  result: {
    playerDamage: number;
    trainerDamage: number;
    effectiveness: number;
  };
}

export interface StrategyEvaluation {
  strategyName: string;
  priority: number;
  feasible: boolean;
  expectedOutcome: number; // -1 à +1
  requiredActions: BattleAction[];
  confidence: number;
}

/**
 * TRAINER AI - IA Dresseur Intelligente avec Intégration AINPCManager
 * 
 * 🧠 RESPONSABILITÉS :
 * - Analyse tactique avancée des situations de combat
 * - Stratégies adaptées au profil du dresseur (Simple → Champion)
 * - Décisions de changement Pokémon intelligentes
 * - Intégration native avec AINPCManager pour apprentissage
 * - Mémoire des combats précédents via PlayerActionTracker
 * - Adaptation au style de jeu du joueur
 */
export class TrainerAI {
  
  private trainerData: TrainerData | null = null;
  private aiProfile: TrainerAIProfile | null = null;
  private aiNPCManager: AINPCManager | null = null;
  private teamManager: TrainerTeamManager | null = null;
  
  // État de combat
  private battleMemory: BattleMemoryData | null = null;
  private actionHistory: ActionHistory[] = [];
  private playerPatterns: Map<string, any> = new Map();
  private isInitialized = false;
  
  // Configuration IA
  private readonly CONFIDENCE_THRESHOLD = 0.6;
  private readonly MAX_THINKING_TIME = 3500;
  private readonly MIN_THINKING_TIME = 800;
  
  constructor() {
    console.log('🧠 [TrainerAI] Module IA Dresseur avec AINPCManager initialisé');
  }
  
  // === INITIALISATION ===
  
  /**
   * 🆕 Initialise l'IA avec données dresseur et AINPCManager
   */
  initialize(
    trainerData: TrainerData,
    aiNPCManager: AINPCManager,
    teamManager?: TrainerTeamManager
  ): void {
    this.trainerData = trainerData;
    this.aiProfile = trainerData.aiProfile;
    this.aiNPCManager = aiNPCManager;
    this.teamManager = teamManager || null;
    
    // Initialiser mémoire de combat
    this.initializeBattleMemory();
    
    // Charger patterns joueur depuis AINPCManager si disponibles
    this.loadPlayerPatterns();
    
    this.isInitialized = true;
    
    console.log(`✅ [TrainerAI] IA ${trainerData.name} initialisée - Profil: ${this.aiProfile.difficulty}`);
    console.log(`    Stratégies: ${this.aiProfile.strategies.length}, Intelligence: ${this.aiProfile.intelligence}/100`);
  }
  
  /**
   * 🆕 Initialise la mémoire de combat
   */
  private initializeBattleMemory(): void {
    if (!this.trainerData) return;
    
    this.battleMemory = {
      battleId: `trainer_battle_${Date.now()}`,
      playerId: 'unknown', // Sera mis à jour au premier appel
      trainerId: this.trainerData.trainerId,
      startTime: Date.now(),
      turns: 0,
      winner: null,
      playerStrategy: [],
      effectiveActions: [],
      playerWeaknesses: [],
      nextBattleHints: []
    };
  }
  
  /**
   * 🆕 Charge les patterns du joueur via AINPCManager
   */
  private async loadPlayerPatterns(): Promise<void> {
    if (!this.aiNPCManager || !this.aiProfile.memory) return;
    
    try {
      // Simulation de récupération des patterns
      // En vrai, cela viendrait de l'analyse des combats précédents
      console.log('🧠 [TrainerAI] Chargement patterns joueur depuis historique...');
      
      // TODO: Implémenter récupération réelle via aiNPCManager.analyzePlayer()
      // const playerAnalysis = await this.aiNPCManager.analyzePlayer(playerId);
      
    } catch (error) {
      console.warn('⚠️ [TrainerAI] Impossible de charger patterns joueur:', error);
    }
  }
  
  // === 🧠 DÉCISION PRINCIPALE ===
  
  /**
   * 🧠 CŒUR DE L'IA : Prend une décision intelligente
   */
  makeDecision(
    gameState: BattleGameState,
    playerPokemon: Pokemon | null,
    turnNumber: number
  ): AIDecision {
    
    if (!this.isInitialized || !this.trainerData || !this.aiProfile) {
      return this.createErrorDecision('IA non initialisée');
    }
    
    console.log(`🧠 [TrainerAI] ${this.trainerData.name} analyse la situation (Tour ${turnNumber})...`);
    
    try {
      // 1. 🔍 ANALYSE DE SITUATION
      const situation = this.analyzeBattleSituation(gameState, playerPokemon, turnNumber);
      
      // 2. 🎯 ÉVALUATION DES STRATÉGIES
      const strategies = this.evaluateStrategies(situation);
      
      // 3. 📊 SÉLECTION DE LA MEILLEURE STRATÉGIE
      const bestStrategy = this.selectBestStrategy(strategies);
      
      if (!bestStrategy) {
        return this.createFallbackDecision('Aucune stratégie viable');
      }
      
      // 4. ⚔️ GÉNÉRATION DE L'ACTION
      const action = this.generateActionFromStrategy(bestStrategy, situation);
      
      // 5. 🧠 MISE À JOUR MÉMOIRE ET APPRENTISSAGE
      this.updateBattleMemory(situation, bestStrategy, action);
      
      // 6. 📈 TRACKING IA POUR APPRENTISSAGE
      this.trackAIDecision(bestStrategy, action, situation);
      
      const decision: AIDecision = {
        success: true,
        action: action,
        strategy: bestStrategy.strategyName,
        reasoning: [
          `Stratégie: ${bestStrategy.strategyName}`,
          `Confiance: ${Math.round(bestStrategy.confidence * 100)}%`,
          `Type advantage: ${situation.typeAdvantage > 0 ? 'Favorable' : situation.typeAdvantage < 0 ? 'Défavorable' : 'Neutre'}`,
          `HP ratio: ${Math.round(situation.hpRatio * 100)}%`
        ],
        confidence: bestStrategy.confidence,
        alternativeActions: bestStrategy.requiredActions.slice(1), // Actions alternatives
      };
      
      console.log(`✅ [TrainerAI] Décision: ${action?.type} (${bestStrategy.strategyName}, ${Math.round(bestStrategy.confidence * 100)}%)`);
      
      return decision;
      
    } catch (error) {
      console.error('❌ [TrainerAI] Erreur prise de décision:', error);
      return this.createErrorDecision(error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }
  
  // === 🔍 ANALYSE DE SITUATION ===
  
  /**
   * 🔍 Analyse complète de la situation de combat
   */
  private analyzeBattleSituation(
    gameState: BattleGameState,
    playerPokemon: Pokemon | null,
    turnNumber: number
  ): BattleSituation {
    
    const myPokemon = gameState.player2.pokemon!; // Dresseur = player2
    const enemyPokemon = playerPokemon || gameState.player1.pokemon!;
    
    // Analyse des équipes
    const myTeamAnalysis = this.teamManager?.analyzeTeam() || null;
    const enemyEstimatedTeam = this.estimateEnemyTeam(playerPokemon);
    
    // Avantage de type (simplifié)
    const typeAdvantage = this.calculateTypeAdvantage(myPokemon.types, enemyPokemon.types);
    
    // Ratio HP
    const myHpRatio = myPokemon.currentHp / myPokemon.maxHp;
    const enemyHpRatio = enemyPokemon.currentHp / enemyPokemon.maxHp;
    const hpRatio = myHpRatio / Math.max(enemyHpRatio, 0.1);
    
    // Avantage vitesse
    const speedAdvantage = myPokemon.speed > enemyPokemon.speed;
    
    const situation: BattleSituation = {
      myPokemon,
      enemyPokemon,
      myTeamAnalysis,
      enemyEstimatedTeam,
      turnNumber,
      battleHistory: [...this.actionHistory],
      typeAdvantage,
      hpRatio,
      speedAdvantage,
      statusEffects: [myPokemon.status || 'normal']
    };
    
    console.log(`🔍 [TrainerAI] Situation analysée: Type=${typeAdvantage > 0 ? '+' : ''}${typeAdvantage}, HP=${Math.round(hpRatio * 100)}%, Speed=${speedAdvantage ? 'Avantage' : 'Désavantage'}`);
    
    return situation;
  }
  
  /**
   * 📊 Estime l'équipe ennemie (patterns, prédictions)
   */
  private estimateEnemyTeam(playerPokemon: Pokemon | null): any {
    // Analyse basique - peut être améliorée avec historique
    return {
      estimatedSize: 1, // Minimum observé
      observedPokemon: playerPokemon ? [playerPokemon] : [],
      predictedTypes: playerPokemon?.types || [],
      threatLevel: playerPokemon ? this.assessThreatLevel(playerPokemon) : 0.5
    };
  }
  
  /**
   * ⚡ Calcul avantage de type simplifié
   */
  private calculateTypeAdvantage(myTypes: string[], enemyTypes: string[]): number {
    // Tableau d'efficacité simplifié
    const effectiveness: Record<string, Record<string, number>> = {
      'fire': { 'grass': 2, 'water': 0.5, 'rock': 2, 'steel': 2 },
      'water': { 'fire': 2, 'grass': 0.5, 'ground': 2, 'rock': 2 },
      'grass': { 'water': 2, 'fire': 0.5, 'ground': 2, 'rock': 2 },
      'electric': { 'water': 2, 'flying': 2, 'ground': 0 },
      'rock': { 'fire': 2, 'flying': 2, 'fighting': 0.5 },
      'ground': { 'electric': 2, 'fire': 2, 'flying': 0 },
      'fighting': { 'normal': 2, 'rock': 2, 'psychic': 0.5 },
      'psychic': { 'fighting': 2, 'poison': 2, 'dark': 0 }
    };
    
    let totalAdvantage = 0;
    let interactions = 0;
    
    for (const myType of myTypes) {
      for (const enemyType of enemyTypes) {
        const eff = effectiveness[myType]?.[enemyType];
        if (eff !== undefined) {
          if (eff > 1) totalAdvantage += 1;
          else if (eff < 1) totalAdvantage -= 1;
          interactions++;
        }
      }
    }
    
    return interactions > 0 ? totalAdvantage / interactions : 0;
  }
  
  /**
   * 🎯 Évalue le niveau de menace d'un Pokémon
   */
  private assessThreatLevel(pokemon: Pokemon): number {
    const hpRatio = pokemon.currentHp / pokemon.maxHp;
    const levelFactor = Math.min(pokemon.level / 50, 1); // Normaliser sur niveau 50
    const statFactor = (pokemon.attack + pokemon.speed) / 200; // Stats moyennes
    
    return Math.min(hpRatio * levelFactor * statFactor, 1);
  }
  
  // === 🎯 ÉVALUATION DES STRATÉGIES ===
  
  /**
   * 🎯 Évalue toutes les stratégies disponibles selon le profil IA
   */
  private evaluateStrategies(situation: BattleSituation): StrategyEvaluation[] {
    if (!this.aiProfile) return [];
    
    const evaluations: StrategyEvaluation[] = [];
    
    // Évaluer chaque stratégie du profil
    for (const strategy of this.aiProfile.strategies) {
      const evaluation = this.evaluateStrategy(strategy, situation);
      if (evaluation.feasible) {
        evaluations.push(evaluation);
      }
    }
    
    // Ajouter stratégies automatiques selon difficulté
    evaluations.push(...this.getAutomaticStrategies(situation));
    
    // Trier par priorité * confiance
    evaluations.sort((a, b) => (b.priority * b.confidence) - (a.priority * a.confidence));
    
    console.log(`🎯 [TrainerAI] ${evaluations.length} stratégies évaluées, meilleure: ${evaluations[0]?.strategyName || 'Aucune'}`);
    
    return evaluations;
  }
  
  /**
   * 📝 Évalue une stratégie spécifique
   */
  private evaluateStrategy(strategy: TrainerStrategy, situation: BattleSituation): StrategyEvaluation {
    const conditionsMet = this.checkStrategyConditions(strategy.conditions, situation);
    const feasible = conditionsMet.length > 0;
    
    let expectedOutcome = 0;
    let confidence = feasible ? 0.5 : 0;
    
    if (feasible) {
      // Calcul outcome basé sur la situation
      expectedOutcome = this.calculateStrategyOutcome(strategy, situation);
      confidence = this.calculateStrategyConfidence(strategy, situation, conditionsMet.length);
    }
    
    // Ajustement selon intelligence IA
    const intelligenceBonus = (this.aiProfile!.intelligence / 100) * 0.3;
    confidence = Math.min(confidence + intelligenceBonus, 1);
    
    const requiredActions = feasible ? 
      this.generateActionsForStrategy(strategy, situation) : [];
    
    return {
      strategyName: strategy.name,
      priority: strategy.priority,
      feasible,
      expectedOutcome,
      requiredActions,
      confidence
    };
  }
  
  /**
   * ✅ Vérifie les conditions d'une stratégie
   */
  private checkStrategyConditions(conditions: string[], situation: BattleSituation): string[] {
    const metConditions: string[] = [];
    
    for (const condition of conditions) {
      let conditionMet = false;
      
      switch (condition) {
        case 'always':
          conditionMet = true;
          break;
          
        case 'has_type_advantage':
          conditionMet = situation.typeAdvantage > 0;
          break;
          
        case 'type_disadvantage':
          conditionMet = situation.typeAdvantage < 0;
          break;
          
        case 'hp_below_25':
          conditionMet = (situation.myPokemon.currentHp / situation.myPokemon.maxHp) < 0.25;
          break;
          
        case 'hp_above_75':
          conditionMet = (situation.myPokemon.currentHp / situation.myPokemon.maxHp) > 0.75;
          break;
          
        case 'first_pokemon':
          conditionMet = situation.turnNumber <= 3;
          break;
          
        case 'enemy_switching':
          conditionMet = this.detectEnemySwitchPattern();
          break;
          
        case 'last_pokemon':
          conditionMet = (situation.myTeamAnalysis?.alivePokemon || 1) === 1;
          break;
          
        case 'speed_advantage':
          conditionMet = situation.speedAdvantage;
          break;
          
        case 'can_predict_player_move':
          conditionMet = this.canPredictPlayerMove() && this.aiProfile!.intelligence > 80;
          break;
          
        default:
          conditionMet = false;
      }
      
      if (conditionMet) {
        metConditions.push(condition);
      }
    }
    
    return metConditions;
  }
  
  /**
   * 🤖 Génère stratégies automatiques selon le niveau IA
   */
  private getAutomaticStrategies(situation: BattleSituation): StrategyEvaluation[] {
    const strategies: StrategyEvaluation[] = [];
    
    // Stratégie d'attaque basique (toujours disponible)
    strategies.push({
      strategyName: 'basic_attack',
      priority: 30,
      feasible: true,
      expectedOutcome: 0.4,
      confidence: 0.7,
      requiredActions: [this.generateBasicAttack(situation)]
    });
    
    // Stratégie de changement si applicable
    if (this.shouldConsiderSwitch(situation)) {
      const switchAction = this.generateSwitchAction(situation);
      if (switchAction) {
        strategies.push({
          strategyName: 'tactical_switch',
          priority: 60,
          feasible: true,
          expectedOutcome: 0.6,
          confidence: Math.min(0.8, (this.aiProfile!.intelligence / 100) + 0.3),
          requiredActions: [switchAction]
        });
      }
    }
    
    return strategies;
  }
  
  // === ⚔️ GÉNÉRATION D'ACTIONS ===
  
  /**
   * ⚔️ Génère une action depuis la meilleure stratégie
   */
  private generateActionFromStrategy(
    strategy: StrategyEvaluation, 
    situation: BattleSituation
  ): BattleAction {
    
    if (strategy.requiredActions.length > 0) {
      return strategy.requiredActions[0];
    }
    
    // Fallback sur attaque basique
    return this.generateBasicAttack(situation);
  }
  
  /**
   * 🔄 Génère les actions pour une stratégie donnée
   */
  private generateActionsForStrategy(
    strategy: TrainerStrategy, 
    situation: BattleSituation
  ): BattleAction[] {
    
    const actions: BattleAction[] = [];
    
    for (const actionType of strategy.actions) {
      let action: BattleAction | null = null;
      
      switch (actionType) {
        case 'use_random_move':
        case 'use_effective_move':
          action = this.generateAttackAction(situation, actionType === 'use_effective_move');
          break;
          
        case 'use_stat_boost':
          action = this.generateStatBoostAction(situation);
          break;
          
        case 'switch_to_resistant':
        case 'switch_to_advantage':
          action = this.generateSwitchAction(situation, actionType);
          break;
          
        case 'use_potion':
          action = this.generateHealAction(situation);
          break;
          
        case 'predict_switch':
          action = this.generatePredictiveAction(situation);
          break;
          
        case 'maximize_damage':
          action = this.generateMaxDamageAction(situation);
          break;
      }
      
      if (action) {
        actions.push(action);
      }
    }
    
    // Si aucune action générée, fallback sur attaque
    if (actions.length === 0) {
      actions.push(this.generateBasicAttack(situation));
    }
    
    return actions;
  }
  
  /**
   * ⚔️ Génère une attaque (basique ou optimisée)
   */
  private generateAttackAction(situation: BattleSituation, useEffective: boolean = false): BattleAction {
    const pokemon = situation.myPokemon;
    const moves = pokemon.moves.filter(move => this.isOffensiveMove(move));
    
    let chosenMove: string;
    
    if (useEffective && this.aiProfile!.intelligence > 60) {
      // Choisir attaque efficace selon type advantage
      chosenMove = this.selectEffectiveMove(moves, situation) || moves[0] || 'tackle';
    } else {
      // Attaque aléatoire parmi les offensives
      chosenMove = moves[Math.floor(Math.random() * moves.length)] || 'tackle';
    }
    
    return {
      actionId: `trainer_ai_attack_${Date.now()}`,
      playerId: 'ai',
      type: 'attack',
      data: { moveId: chosenMove },
      timestamp: Date.now()
    };
  }
  
  /**
   * 🔄 Génère une action de changement
   */
  private generateSwitchAction(
    situation: BattleSituation, 
    switchType: string = 'tactical'
  ): SwitchAction | null {
    
    if (!this.teamManager) return null;
    
    const teamAnalysis = this.teamManager.analyzeTeam();
    if (teamAnalysis.alivePokemon <= 1) return null;
    
    const availablePokemon = this.teamManager.getAllPokemon()
      .map((pokemon, index) => ({ pokemon, index }))
      .filter(({ pokemon, index }) => 
        pokemon.currentHp > 0 && 
        index !== 0 // Pas le Pokémon actuel (assumé index 0)
      );
    
    if (availablePokemon.length === 0) return null;
    
    // Sélectionner selon le type de switch
    let targetIndex: number;
    
    switch (switchType) {
      case 'switch_to_resistant':
        targetIndex = this.selectResistantPokemon(availablePokemon, situation);
        break;
      case 'switch_to_advantage':
        targetIndex = this.selectAdvantageousPokemon(availablePokemon, situation);
        break;
      default:
        targetIndex = availablePokemon[0].index; // Premier disponible
    }
    
    return {
      actionId: `trainer_ai_switch_${Date.now()}`,
      playerId: 'ai',
      type: 'switch',
      data: {
        fromPokemonIndex: 0, // Pokémon actuel
        toPokemonIndex: targetIndex,
        isForced: false,
        reason: `ai_${switchType}`
      },
      timestamp: Date.now()
    };
  }
  
  /**
   * 💊 Génère action de soin (placeholder)
   */
  private generateHealAction(situation: BattleSituation): BattleAction {
    // Pour l'instant, fallback sur attaque car objets pas implémentés
    return this.generateBasicAttack(situation);
  }
  
  /**
   * 📈 Génère action de boost stats (placeholder)
   */
  private generateStatBoostAction(situation: BattleSituation): BattleAction {
    // Utiliser des moves de stat si disponibles, sinon attaque
    const pokemon = situation.myPokemon;
    const statMoves = pokemon.moves.filter(move => 
      ['growl', 'tail_whip', 'leer', 'string_shot'].includes(move)
    );
    
    const chosenMove = statMoves.length > 0 ? 
      statMoves[Math.floor(Math.random() * statMoves.length)] : 
      'tackle';
    
    return {
      actionId: `trainer_ai_stat_${Date.now()}`,
      playerId: 'ai',
      type: 'attack',
      data: { moveId: chosenMove },
      timestamp: Date.now()
    };
  }
  
  /**
   * 🔮 Génère action prédictive (avancée)
   */
  private generatePredictiveAction(situation: BattleSituation): BattleAction {
    // IA avancée : prédire l'action du joueur et contrer
    const predictedPlayerAction = this.predictPlayerAction(situation);
    
    if (predictedPlayerAction === 'switch') {
      // Joueur va changer, utiliser attaque à priorité ou hazard
      return this.generatePriorityAttack(situation);
    } else if (predictedPlayerAction === 'attack') {
      // Joueur va attaquer, peut-être changer pour résister
      return this.generateSwitchAction(situation, 'switch_to_resistant') || 
             this.generateBasicAttack(situation);
    }
    
    return this.generateBasicAttack(situation);
  }
  
  /**
   * 💥 Génère attaque maximum de dégâts
   */
  private generateMaxDamageAction(situation: BattleSituation): BattleAction {
    const pokemon = situation.myPokemon;
    const moves = pokemon.moves.filter(move => this.isOffensiveMove(move));
    
    // Sélectionner l'attaque la plus puissante disponible
    const strongestMove = this.selectStrongestMove(moves, situation);
    
    return {
      actionId: `trainer_ai_max_damage_${Date.now()}`,
      playerId: 'ai',
      type: 'attack',
      data: { moveId: strongestMove },
      timestamp: Date.now()
    };
  }
  
  /**
   * ⚔️ Génère attaque basique (fallback)
   */
  private generateBasicAttack(situation: BattleSituation): BattleAction {
    const pokemon = situation.myPokemon;
    const moves = pokemon.moves.filter(move => this.isOffensiveMove(move));
    const chosenMove = moves[Math.floor(Math.random() * moves.length)] || 'tackle';
    
    return {
      actionId: `trainer_ai_basic_${Date.now()}`,
      playerId: 'ai',
      type: 'attack',
      data: { moveId: chosenMove },
      timestamp: Date.now()
    };
  }
  
  // === 🧠 MÉTHODES D'ANALYSE AVANCÉES ===
  
  /**
   * 📝 Sélectionne la meilleure stratégie
   */
  private selectBestStrategy(strategies: StrategyEvaluation[]): StrategyEvaluation | null {
    if (strategies.length === 0) return null;
    
    // Filtrer stratégies avec confiance suffisante
    const viableStrategies = strategies.filter(s => s.confidence >= this.CONFIDENCE_THRESHOLD);
    
    if (viableStrategies.length === 0) {
      // Prendre la meilleure même si confiance faible
      return strategies[0];
    }
    
    return viableStrategies[0];
  }
  
  /**
   * 📊 Calcule le résultat attendu d'une stratégie
   */
  private calculateStrategyOutcome(strategy: TrainerStrategy, situation: BattleSituation): number {
    let outcome = 0.5; // Neutre par défaut
    
    // Ajustements selon la stratégie
    switch (strategy.name) {
      case 'type_advantage':
        outcome = 0.3 + (situation.typeAdvantage + 2) / 4; // 0.3-0.8
        break;
      case 'setup_sweep':
        outcome = situation.turnNumber <= 5 ? 0.7 : 0.4;
        break;
      case 'defensive_switch':
        outcome = situation.typeAdvantage < 0 ? 0.6 : 0.3;
        break;
      case 'perfect_prediction':
        outcome = this.aiProfile!.intelligence > 90 ? 0.8 : 0.5;
        break;
      default:
        outcome = 0.5;
    }
    
    return Math.max(0, Math.min(1, outcome));
  }
  
  /**
   * 🎯 Calcule la confiance dans une stratégie
   */
  private calculateStrategyConfidence(
    strategy: TrainerStrategy, 
    situation: BattleSituation, 
    conditionsMetCount: number
  ): number {
    let confidence = 0.3; // Base
    
    // Bonus conditions remplies
    confidence += (conditionsMetCount / strategy.conditions.length) * 0.4;
    
    // Bonus intelligence IA
    confidence += (this.aiProfile!.intelligence / 100) * 0.2;
    
    // Bonus expérience (mémoire)
    if (this.aiProfile!.memory && this.actionHistory.length > 0) {
      confidence += 0.1;
    }
    
    // Malus si aggressif mais situation défavorable
    if (this.aiProfile!.aggressiveness > 70 && situation.hpRatio < 0.5) {
      confidence -= 0.2;
    }
    
    return Math.max(0.1, Math.min(1, confidence));
  }
  
  // === 🔍 MÉTHODES D'AIDE À LA DÉCISION ===
  
  /**
   * 🔄 Détermine si un changement doit être considéré
   */
  private shouldConsiderSwitch(situation: BattleSituation): boolean {
    if (!this.teamManager) return false;
    
    const teamAnalysis = this.teamManager.analyzeTeam();
    if (teamAnalysis.alivePokemon <= 1) return false;
    
    // Facteurs favorisant le changement
    const typeDisadvantage = situation.typeAdvantage < -0.5;
    const lowHp = (situation.myPokemon.currentHp / situation.myPokemon.maxHp) < 0.3;
    const badStatus = situation.statusEffects.some(status => 
      ['poison', 'burn', 'paralysis'].includes(status)
    );
    
    return typeDisadvantage || lowHp || badStatus;
  }
  
  /**
   * 🎯 Sélectionne Pokémon résistant
   */
  private selectResistantPokemon(
    availablePokemon: { pokemon: Pokemon; index: number }[],
    situation: BattleSituation
  ): number {
    // Logique simple : chercher types résistants à l'ennemi
    const enemyTypes = situation.enemyPokemon.types;
    
    for (const { pokemon, index } of availablePokemon) {
      const resistance = this.calculateTypeAdvantage(enemyTypes, pokemon.types);
      if (resistance < 0) { // L'ennemi a désavantage contre ce Pokémon
        return index;
      }
    }
    
    return availablePokemon[0].index; // Premier disponible si aucun résistant
  }
  
  /**
   * ⚡ Sélectionne Pokémon avec avantage
   */
  private selectAdvantageousPokemon(
    availablePokemon: { pokemon: Pokemon; index: number }[],
    situation: BattleSituation
  ): number {
    const enemyTypes = situation.enemyPokemon.types;
    
    for (const { pokemon, index } of availablePokemon) {
      const advantage = this.calculateTypeAdvantage(pokemon.types, enemyTypes);
      if (advantage > 0) { // Ce Pokémon a avantage sur l'ennemi
        return index;
      }
    }
    
    return availablePokemon[0].index; // Premier disponible si aucun avantageux
  }
  
  /**
   * 🎯 Sélectionne attaque efficace
   */
  private selectEffectiveMove(moves: string[], situation: BattleSituation): string | null {
    // Logique simplifiée : retourner une attaque du type avantageux
    const myTypes = situation.myPokemon.types;
    const enemyTypes = situation.enemyPokemon.types;
    
    for (const move of moves) {
      const moveType = this.getMoveType(move);
      if (myTypes.includes(moveType)) {
        const effectiveness = this.calculateTypeAdvantage([moveType], enemyTypes);
        if (effectiveness > 0) {
          return move;
        }
      }
    }
    
    return null;
  }
  
  /**
   * 💥 Sélectionne l'attaque la plus puissante
   */
  private selectStrongestMove(moves: string[], situation: BattleSituation): string {
    // Base de données simple de puissance
    const movePowers: Record<string, number> = {
      'tackle': 40, 'scratch': 40, 'pound': 40,
      'vine_whip': 45, 'ember': 40, 'water_gun': 40,
      'razor_leaf': 55, 'flamethrower': 90, 'surf': 90,
      'thunderbolt': 90, 'psychic': 90, 'ice_beam': 90
    };
    
    let strongestMove = moves[0] || 'tackle';
    let maxPower = movePowers[strongestMove] || 40;
    
    for (const move of moves) {
      const power = movePowers[move] || 40;
      if (power > maxPower) {
        maxPower = power;
        strongestMove = move;
      }
    }
    
    return strongestMove;
  }
  
  /**
   * ⚡ Génère attaque prioritaire
   */
  private generatePriorityAttack(situation: BattleSituation): BattleAction {
    const pokemon = situation.myPokemon;
    const priorityMoves = pokemon.moves.filter(move => 
      ['quick_attack', 'bullet_punch', 'mach_punch'].includes(move)
    );
    
    const chosenMove = priorityMoves.length > 0 ? 
      priorityMoves[0] : 
      pokemon.moves.find(move => this.isOffensiveMove(move)) || 'tackle';
    
    return {
      actionId: `trainer_ai_priority_${Date.now()}`,
      playerId: 'ai',
      type: 'attack',
      data: { moveId: chosenMove },
      timestamp: Date.now()
    };
  }
  
  // === 🔮 PRÉDICTION ET MÉMOIRE ===
  
  /**
   * 🔮 Prédit l'action probable du joueur
   */
  private predictPlayerAction(situation: BattleSituation): 'attack' | 'switch' | 'item' | 'unknown' {
    // Analyse basée sur l'historique et patterns
    if (this.actionHistory.length === 0) return 'unknown';
    
    const recentActions = this.actionHistory.slice(-3);
    const switchPattern = recentActions.filter(a => a.playerAction.type === 'switch').length;
    const attackPattern = recentActions.filter(a => a.playerAction.type === 'attack').length;
    
    // Si joueur change souvent quand en difficulté
    if (situation.hpRatio < 0.5 && switchPattern > attackPattern) {
      return 'switch';
    }
    
    // Si joueur attaque généralement
    if (attackPattern > switchPattern) {
      return 'attack';
    }
    
    return 'unknown';
  }
  
  /**
   * 🧠 Détecte pattern de changement ennemi
   */
  private detectEnemySwitchPattern(): boolean {
    if (this.actionHistory.length < 2) return false;
    
    const recentSwitches = this.actionHistory
      .slice(-5)
      .filter(a => a.playerAction.type === 'switch').length;
    
    return recentSwitches >= 2;
  }
  
  /**
   * 🎯 Peut prédire le prochain coup du joueur
   */
  private canPredictPlayerMove(): boolean {
    if (this.actionHistory.length < 3) return false;
    
    // Chercher patterns répétitifs
    const lastActions = this.actionHistory.slice(-3).map(a => a.playerAction.type);
    const uniqueActions = new Set(lastActions).size;
    
    return uniqueActions <= 2; // Pattern détectable
  }
  
  // === 🧠 APPRENTISSAGE ET MÉMOIRE ===
  
  /**
   * 📝 Met à jour la mémoire de combat
   */
  private updateBattleMemory(
    situation: BattleSituation,
    strategy: StrategyEvaluation,
    action: BattleAction
  ): void {
    if (!this.battleMemory) return;
    
    this.battleMemory.turns = situation.turnNumber;
    
    // Analyser efficacité de la décision
    if (strategy.expectedOutcome > 0.6) {
      this.battleMemory.effectiveActions.push(strategy.strategyName);
    }
    
    // Détecter faiblesses du joueur
    if (situation.typeAdvantage > 0 && situation.hpRatio > 1) {
      this.battleMemory.playerWeaknesses.push('vulnerable_to_type_advantage');
    }
  }
  
  /**
   * 📊 Tracking IA pour apprentissage via AINPCManager
   */
  private trackAIDecision(
    strategy: StrategyEvaluation,
    action: BattleAction,
    situation: BattleSituation
  ): void {
    if (!this.aiNPCManager || !this.trainerData) return;
    
    try {
      this.aiNPCManager.trackPlayerAction(
        `AI_${this.trainerData.trainerId}`,
        ActionType.TRAINER_BATTLE,
        {
          aiDecision: {
            strategy: strategy.strategyName,
            confidence: strategy.confidence,
            actionType: action.type,
            turn: situation.turnNumber,
            situationAnalysis: {
              typeAdvantage: situation.typeAdvantage,
              hpRatio: situation.hpRatio,
              speedAdvantage: situation.speedAdvantage
            }
          }
        }
      );
    } catch (error) {
      // Silencieux pour éviter spam
    }
  }
  
  // === 🛠️ UTILITAIRES ===
  
  /**
   * ⚔️ Vérifie si une attaque est offensive
   */
  private isOffensiveMove(moveId: string): boolean {
    const nonOffensiveMoves = [
      'growl', 'tail_whip', 'leer', 'string_shot',
      'sand_attack', 'smokescreen', 'withdraw',
      'harden', 'defense_curl', 'barrier'
    ];
    
    return !nonOffensiveMoves.includes(moveId.toLowerCase());
  }
  
  /**
   * 🎯 Récupère le type d'une attaque (simplifié)
   */
  private getMoveType(moveId: string): string {
    const moveTypes: Record<string, string> = {
      'tackle': 'normal', 'scratch': 'normal', 'pound': 'normal',
      'ember': 'fire', 'flamethrower': 'fire',
      'water_gun': 'water', 'surf': 'water',
      'vine_whip': 'grass', 'razor_leaf': 'grass',
      'thunderbolt': 'electric', 'thunder': 'electric',
      'psychic': 'psychic',
      'ice_beam': 'ice'
    };
    
    return moveTypes[moveId] || 'normal';
  }
  
  /**
   * ⏱️ Calcule temps de réflexion selon profil IA
   */
  getThinkingDelay(): number {
    if (!this.aiProfile) return this.MIN_THINKING_TIME;
    
    // Base selon difficulté
    let baseTime: number;
    switch (this.aiProfile.difficulty) {
      case 'easy':
        baseTime = 600;
        break;
      case 'normal':
        baseTime = 1200;
        break;
      case 'hard':
        baseTime = 2000;
        break;
      case 'expert':
        baseTime = 2800;
        break;
      default:
        baseTime = 1200;
    }
    
    // Variation selon intelligence (plus intelligent = plus de réflexion)
    const intelligenceModifier = (this.aiProfile.intelligence / 100) * 800;
    
    // Randomisation pour paraître naturel
    const randomVariation = (Math.random() - 0.5) * 400;
    
    return Math.max(
      this.MIN_THINKING_TIME, 
      Math.min(this.MAX_THINKING_TIME, baseTime + intelligenceModifier + randomVariation)
    );
  }
  
  /**
   * ❌ Crée décision d'erreur
   */
  private createErrorDecision(error: string): AIDecision {
    return {
      success: false,
      action: null,
      strategy: 'error',
      reasoning: [`Erreur: ${error}`],
      confidence: 0,
      alternativeActions: [],
      error
    };
  }
  
  /**
   * 🔄 Crée décision de fallback
   */
  private createFallbackDecision(reason: string): AIDecision {
    const fallbackAction: BattleAction = {
      actionId: `trainer_ai_fallback_${Date.now()}`,
      playerId: 'ai',
      type: 'attack',
      data: { moveId: 'tackle' },
      timestamp: Date.now()
    };
    
    return {
      success: true,
      action: fallbackAction,
      strategy: 'fallback',
      reasoning: [`Fallback: ${reason}`, 'Utilisation attaque basique'],
      confidence: 0.3,
      alternativeActions: []
    };
  }
  
  // === GESTION LIFECYCLE ===
  
  /**
   * ✅ Vérifie si l'IA est prête
   */
  isReady(): boolean {
    return this.isInitialized && 
           this.trainerData !== null && 
           this.aiProfile !== null;
  }
  
  /**
   * 🔄 Reset pour nouveau combat
   */
  reset(): void {
    this.trainerData = null;
    this.aiProfile = null;
    this.aiNPCManager = null;
    this.teamManager = null;
    this.battleMemory = null;
    this.actionHistory = [];
    this.playerPatterns.clear();
    this.isInitialized = false;
    
    console.log('🔄 [TrainerAI] Reset effectué');
  }
  
  /**
   * 📊 Diagnostics et statistiques
   */
  getStats(): any {
    return {
      version: 'trainer_ai_v1_ainpc_integrated',
      architecture: 'TrainerAI + AINPCManager + Strategic Analysis',
      status: this.isInitialized ? 'Ready' : 'Not Initialized',
      trainerInfo: this.trainerData ? {
        name: this.trainerData.name,
        class: this.trainerData.trainerClass,
        difficulty: this.aiProfile?.difficulty,
        intelligence: this.aiProfile?.intelligence,
        aggressiveness: this.aiProfile?.aggressiveness,
        strategies: this.aiProfile?.strategies.length,
        hasMemory: this.aiProfile?.memory
      } : null,
      battleState: {
        actionsInHistory: this.actionHistory.length,
        playerPatternsDetected: this.playerPatterns.size,
        battleMemoryActive: this.battleMemory !== null
      },
      features: [
        'strategic_battle_analysis',
        'dynamic_strategy_evaluation',
        'intelligent_switch_decisions',
        'player_pattern_recognition',
        'ainpc_manager_integration',
        'battle_memory_tracking',
        'adaptive_difficulty_scaling',
        'type_advantage_calculation',
        'predictive_action_system',
        'confidence_based_decisions'
      ]
    };
  }
}

export default TrainerAI;
