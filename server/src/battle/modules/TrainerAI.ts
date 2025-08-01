// server/src/battle/modules/TrainerAI.ts
// 🧠 SYSTÈME IA AVANCÉ POUR COMBATS DRESSEURS - SESSION 3 FINALE

import { BattleGameState, BattleResult, BattleAction, PlayerRole, Pokemon } from '../types/BattleTypes';
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
  alternativeActions: string[];
  thinkingTime: number; // ms
  memoryUpdated: boolean;
}

export interface AIAnalysis {
  opponentPokemon: PokemonAnalysis | null;
  myActivePokemon: PokemonAnalysis | null;
  battleSituation: BattleSituationAnalysis;
  teamComposition: TeamAnalysis;
  turnContext: TurnContextAnalysis;
  strategicRecommendations: StrategicRecommendation[];
}

export interface PokemonAnalysis {
  pokemon: Pokemon;
  hpPercent: number;
  statusEffects: string[];
  typeAdvantages: string[];
  typeWeaknesses: string[];
  predictedMoves: string[];
  threatLevel: number; // 0-10
  switchValue: number; // 0-10 (intérêt à changer)
}

export interface BattleSituationAnalysis {
  momentum: 'winning' | 'losing' | 'even';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  turnPressure: number; // 0-10
  predictedPlayerAction: string[];
  counterStrategies: string[];
}

export interface TeamAnalysis {
  remainingPokemon: number;
  averageHpPercent: number;
  typesCovered: string[];
  gaps: string[];
  bestSwitchOption: { index: number; reason: string } | null;
  emergencyOptions: number[];
}

export interface TurnContextAnalysis {
  turnNumber: number;
  recentActions: string[];
  patterns: string[];
  playerBehavior: PlayerBehaviorAnalysis;
  recommendation: 'attack' | 'switch' | 'setup' | 'stall';
}

export interface PlayerBehaviorAnalysis {
  aggressiveness: number; // 0-10
  predictability: number; // 0-10
  favoriteStrategies: string[];
  weaknesses: string[];
  nextActionPrediction: { action: string; confidence: number }[];
}

export interface StrategicRecommendation {
  action: 'attack' | 'switch' | 'item';
  target?: string | number;
  reasoning: string;
  priority: number; // 0-10
  riskLevel: number; // 0-10
  expectedOutcome: string;
}

export interface AIMemory {
  trainerId: string;
  battleHistory: BattleMemoryEntry[];
  playerPatterns: Map<string, PlayerPattern>;
  strategicInsights: StrategicInsight[];
  lastUpdate: number;
}

export interface BattleMemoryEntry {
  battleId: string;
  opponent: string;
  result: 'victory' | 'defeat';
  turns: number;
  keyMoments: string[];
  lessonsLearned: string[];
  timestamp: number;
}

export interface PlayerPattern {
  playerId: string;
  encounterCount: number;
  commonStrategies: string[];
  predictedBehaviors: string[];
  counters: string[];
  successRate: number;
}

export interface StrategicInsight {
  situation: string;
  action: string;
  effectiveness: number;
  timesUsed: number;
  lastUsed: number;
}

/**
 * TRAINER AI - SYSTÈME IA AVANCÉ POUR DRESSEURS
 * 
 * Fonctionnalités :
 * - Analyse multi-niveaux (Pokémon, équipe, situation, joueur)
 * - Prise de décision intelligente basée sur profil IA
 * - Système de mémoire et apprentissage
 * - Prédiction des actions joueur
 * - Stratégies dynamiques selon contexte
 * - Intégration AINPCManager pour apprentissage global
 */
export class TrainerAI {
  
  private trainerData: TrainerData | null = null;
  private aiProfile: TrainerAIProfile | null = null;
  private teamManager: TrainerTeamManager | null = null;
  private ainpcManager: AINPCManager | null = null;
  private aiMemory: AIMemory | null = null;
  
  // État interne
  private isInitialized = false;
  private battleId: string = '';
  private turnHistory: BattleAction[] = [];
  private playerBehaviorData: Map<string, any> = new Map();
  
  // Configuration
  private readonly THINKING_TIME_BASE = 800;
  private readonly THINKING_TIME_MAX = 3500;
  private readonly CONFIDENCE_THRESHOLD = 0.6;
  private readonly MEMORY_RETENTION_DAYS = 30;
  
  constructor() {
    console.log('🧠 [TrainerAI] Système IA dresseur initialisé');
  }
  
  // === INITIALISATION ===
  
  initialize(
    trainerData: TrainerData,
    ainpcManager?: AINPCManager,
    teamManager?: TrainerTeamManager
  ): void {
    this.trainerData = trainerData;
    this.aiProfile = trainerData.aiProfile;
    this.ainpcManager = ainpcManager || null;
    this.teamManager = teamManager || null;
    
    // Initialiser mémoire IA
    this.initializeAIMemory();
    
    this.isInitialized = true;
    
    console.log(`✅ [TrainerAI] Initialisé pour ${trainerData.name}`);
    console.log(`    Difficulté: ${this.aiProfile.difficulty}`);
    console.log(`    Intelligence: ${this.aiProfile.intelligence}/100`);
    console.log(`    Mémoire: ${this.aiProfile.memory ? 'activée' : 'désactivée'}`);
    console.log(`    AINPCManager: ${this.ainpcManager ? 'connecté' : 'non connecté'}`);
  }
  
  private initializeAIMemory(): void {
    if (!this.trainerData || !this.aiProfile.memory) return;
    
    this.aiMemory = {
      trainerId: this.trainerData.trainerId,
      battleHistory: [],
      playerPatterns: new Map(),
      strategicInsights: [],
      lastUpdate: Date.now()
    };
    
    console.log(`🧠 [TrainerAI] Mémoire IA initialisée pour ${this.trainerData.name}`);
  }
  
  // === API PRINCIPALE ===
  
  /**
   * Prend une décision IA selon le contexte de combat
   */
  makeDecision(
    gameState: BattleGameState,
    opponentPokemon: Pokemon | null,
    turnNumber: number
  ): AIDecision {
    console.log(`🧠 [TrainerAI] Prise de décision tour ${turnNumber}...`);
    
    if (!this.isInitialized || !this.trainerData || !this.aiProfile) {
      return this.createFailedDecision('IA non initialisée');
    }
    
    try {
      const startTime = Date.now();
      
      // 1. Analyser la situation complète
      const analysis = this.performFullAnalysis(gameState, opponentPokemon, turnNumber);
      
      // 2. Evaluer les stratégies disponibles
      const strategicOptions = this.evaluateStrategies(analysis, gameState);
      
      // 3. Prendre la décision optimale
      const decision = this.selectOptimalAction(strategicOptions, analysis, gameState);
      
      // 4. Mettre à jour la mémoire
      if (this.aiProfile.memory && decision.success) {
        this.updateAIMemory(decision, analysis, gameState);
      }
      
      // 5. Tracking pour apprentissage global
      if (this.ainpcManager && decision.success) {
        this.trackDecisionForLearning(decision, analysis, gameState);
      }
      
      const thinkingTime = Date.now() - startTime;
      decision.thinkingTime = thinkingTime;
      
      console.log(`🧠 [TrainerAI] Décision: ${decision.action?.type || 'none'} (${decision.strategy})`);
      console.log(`    Confiance: ${(decision.confidence * 100).toFixed(1)}%`);
      console.log(`    Temps réflexion: ${thinkingTime}ms`);
      
      return decision;
      
    } catch (error) {
      console.error(`❌ [TrainerAI] Erreur prise de décision:`, error);
      return this.createFailedDecision(error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }
  
  /**
   * Calcule le temps de réflexion selon difficulté IA
   */
  getThinkingDelay(): number {
    if (!this.aiProfile) return this.THINKING_TIME_BASE;
    
    // Plus l'IA est intelligente, plus elle "réfléchit"
    const intelligenceBonus = (this.aiProfile.intelligence / 100) * 1000;
    const difficultyMultiplier = this.getDifficultyMultiplier();
    
    const baseTime = this.THINKING_TIME_BASE + intelligenceBonus;
    const finalTime = Math.min(baseTime * difficultyMultiplier, this.THINKING_TIME_MAX);
    
    // Ajouter variabilité pour sembler plus naturel
    const variation = Math.random() * 500 - 250; // ±250ms
    
    return Math.max(500, finalTime + variation);
  }
  
  private getDifficultyMultiplier(): number {
    if (!this.aiProfile) return 1.0;
    
    switch (this.aiProfile.difficulty) {
      case 'easy': return 0.7;
      case 'normal': return 1.0;
      case 'hard': return 1.3;
      case 'expert': return 1.6;
      default: return 1.0;
    }
  }
  
  // === ANALYSE COMPLÈTE ===
  
  private performFullAnalysis(
    gameState: BattleGameState,
    opponentPokemon: Pokemon | null,
    turnNumber: number
  ): AIAnalysis {
    console.log(`📊 [TrainerAI] Analyse complète tour ${turnNumber}...`);
    
    // Analyse Pokémon actifs
    const myActivePokemon = this.analyzeMyActivePokemon(gameState);
    const opponentPokemonAnalysis = this.analyzeOpponentPokemon(opponentPokemon);
    
    // Analyse situation
    const battleSituation = this.analyzeBattleSituation(
      gameState, 
      myActivePokemon, 
      opponentPokemonAnalysis, 
      turnNumber
    );
    
    // Analyse équipe
    const teamComposition = this.analyzeTeamComposition();
    
    // Analyse contexte tour
    const turnContext = this.analyzeTurnContext(turnNumber, gameState);
    
    // Recommandations stratégiques
    const strategicRecommendations = this.generateStrategicRecommendations(
      battleSituation,
      teamComposition,
      turnContext
    );
    
    return {
      opponentPokemon: opponentPokemonAnalysis,
      myActivePokemon,
      battleSituation,
      teamComposition,
      turnContext,
      strategicRecommendations
    };
  }
  
  private analyzeMyActivePokemon(gameState: BattleGameState): PokemonAnalysis | null {
    const myPokemon = gameState.player2.pokemon; // IA = player2
    if (!myPokemon) return null;
    
    const hpPercent = (myPokemon.currentHp / myPokemon.maxHp) * 100;
    const statusEffects = myPokemon.status ? [myPokemon.status] : [];
    
    // Analyser avantages/faiblesses de type (simplifié)
    const typeAdvantages = this.calculateTypeAdvantages(myPokemon.types);
    const typeWeaknesses = this.calculateTypeWeaknesses(myPokemon.types);
    
    // Prédire les attaques disponibles
    const predictedMoves = myPokemon.moves.slice();
    
    // Évaluer niveau de menace et valeur de changement
    const threatLevel = this.calculateThreatLevel(myPokemon, hpPercent);
    const switchValue = this.calculateSwitchValue(myPokemon, hpPercent, statusEffects);
    
    return {
      pokemon: myPokemon,
      hpPercent,
      statusEffects,
      typeAdvantages,
      typeWeaknesses,
      predictedMoves,
      threatLevel,
      switchValue
    };
  }
  
  private analyzeOpponentPokemon(opponentPokemon: Pokemon | null): PokemonAnalysis | null {
    if (!opponentPokemon) return null;
    
    const hpPercent = (opponentPokemon.currentHp / opponentPokemon.maxHp) * 100;
    const statusEffects = opponentPokemon.status ? [opponentPokemon.status] : [];
    
    const typeAdvantages = this.calculateTypeAdvantages(opponentPokemon.types);
    const typeWeaknesses = this.calculateTypeWeaknesses(opponentPokemon.types);
    const predictedMoves = this.predictOpponentMoves(opponentPokemon);
    
    const threatLevel = this.calculateThreatLevel(opponentPokemon, hpPercent);
    const switchValue = 0; // Joueur ne change pas automatiquement
    
    return {
      pokemon: opponentPokemon,
      hpPercent,
      statusEffects,
      typeAdvantages,
      typeWeaknesses,
      predictedMoves,
      threatLevel,
      switchValue
    };
  }
  
  private analyzeBattleSituation(
    gameState: BattleGameState,
    myPokemon: PokemonAnalysis | null,
    opponentPokemon: PokemonAnalysis | null,
    turnNumber: number
  ): BattleSituationAnalysis {
    
    // Déterminer momentum
    let momentum: 'winning' | 'losing' | 'even' = 'even';
    if (myPokemon && opponentPokemon) {
      const myHp = myPokemon.hpPercent;
      const opponentHp = opponentPokemon.hpPercent;
      const hpDifference = myHp - opponentHp;
      
      if (hpDifference > 20) momentum = 'winning';
      else if (hpDifference < -20) momentum = 'losing';
    }
    
    // Évaluer urgence
    const urgency = this.calculateUrgency(myPokemon, opponentPokemon, turnNumber);
    
    // Pression du tour
    const turnPressure = this.calculateTurnPressure(turnNumber, momentum, urgency);
    
    // Prédire action joueur
    const predictedPlayerAction = this.predictPlayerActions(opponentPokemon, turnNumber);
    
    // Stratégies de contre
    const counterStrategies = this.generateCounterStrategies(predictedPlayerAction, momentum);
    
    return {
      momentum,
      urgency,
      turnPressure,
      predictedPlayerAction,
      counterStrategies
    };
  }
  
  private analyzeTeamComposition(): TeamAnalysis {
    if (!this.teamManager) {
      return {
        remainingPokemon: 1,
        averageHpPercent: 100,
        typesCovered: [],
        gaps: [],
        bestSwitchOption: null,
        emergencyOptions: []
      };
    }
    
    const analysis = this.teamManager.analyzeTeam();
    const allPokemon = this.teamManager.getAllPokemon();
    
    // Calculer HP moyen
    const totalHp = allPokemon.reduce((sum, p) => sum + (p.currentHp / p.maxHp), 0);
    const averageHpPercent = allPokemon.length > 0 ? (totalHp / allPokemon.length) * 100 : 0;
    
    // Types couverts
    const typesCovered = [...new Set(allPokemon.flatMap(p => p.types))];
    
    // Lacunes de type (simplifié)
    const allTypes = ['fire', 'water', 'grass', 'electric', 'psychic', 'fighting', 'poison', 'ground', 'flying', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
    const gaps = allTypes.filter(type => !typesCovered.includes(type)).slice(0, 3); // Top 3 gaps
    
    // Meilleure option de changement
    const bestSwitchOption = this.findBestSwitchOption(allPokemon);
    
    // Options d'urgence
    const emergencyOptions = allPokemon
      .map((p, index) => ({ index, hp: p.currentHp / p.maxHp }))
      .filter(p => p.hp > 0.3)
      .map(p => p.index);
    
    return {
      remainingPokemon: analysis.alivePokemon,
      averageHpPercent,
      typesCovered,
      gaps,
      bestSwitchOption,
      emergencyOptions
    };
  }
  
  private analyzeTurnContext(turnNumber: number, gameState: BattleGameState): TurnContextAnalysis {
    // Actions récentes (simplifié)
    const recentActions = this.turnHistory.slice(-3).map(a => a.type);
    
    // Patterns détectés
    const patterns = this.detectPatterns(this.turnHistory);
    
    // Analyse comportement joueur
    const playerBehavior = this.analyzePlayerBehavior(gameState.player1.name, turnNumber);
    
    // Recommandation générale
    let recommendation: 'attack' | 'switch' | 'setup' | 'stall' = 'attack';
    if (turnNumber <= 2) recommendation = 'setup';
    else if (playerBehavior.aggressiveness > 7) recommendation = 'switch';
    else if (patterns.includes('defensive')) recommendation = 'attack';
    
    return {
      turnNumber,
      recentActions,
      patterns,
      playerBehavior,
      recommendation
    };
  }
  
  // === ÉVALUATION STRATÉGIES ===
  
  private evaluateStrategies(analysis: AIAnalysis, gameState: BattleGameState): StrategicRecommendation[] {
    const strategies: StrategicRecommendation[] = [];
    
    if (!this.aiProfile) return strategies;
    
    // Évaluer chaque stratégie du profil IA
    for (const strategy of this.aiProfile.strategies) {
      const evaluation = this.evaluateStrategy(strategy, analysis, gameState);
      if (evaluation) {
        strategies.push(evaluation);
      }
    }
    
    // Ajouter stratégies dynamiques
    const dynamicStrategies = this.generateDynamicStrategies(analysis, gameState);
    strategies.push(...dynamicStrategies);
    
    // Trier par priorité
    return strategies.sort((a, b) => b.priority - a.priority);
  }
  
  private evaluateStrategy(
    strategy: TrainerStrategy,
    analysis: AIAnalysis,
    gameState: BattleGameState
  ): StrategicRecommendation | null {
    
    // Vérifier conditions d'activation
    const conditionsMet = this.checkStrategyConditions(strategy.conditions, analysis, gameState);
    if (!conditionsMet) return null;
    
    // Calculer priorité ajustée
    const basePriority = strategy.priority / 10; // Convertir 0-100 en 0-10
    const situationModifier = this.calculateSituationModifier(strategy, analysis);
    const adjustedPriority = Math.min(10, basePriority * situationModifier);
    
    // Déterminer action concrète
    const action = this.interpretStrategyAction(strategy.actions[0], analysis);
    if (!action) return null;
    
    // Évaluer risque
    const riskLevel = this.calculateRiskLevel(action, analysis);
    
    return {
      action: action.type as 'attack' | 'switch' | 'item',
      target: action.target,
      reasoning: `Stratégie: ${strategy.name}`,
      priority: adjustedPriority,
      riskLevel,
      expectedOutcome: this.predictOutcome(action, analysis)
    };
  }
  
  private generateDynamicStrategies(analysis: AIAnalysis, gameState: BattleGameState): StrategicRecommendation[] {
    const dynamicStrategies: StrategicRecommendation[] = [];
    
    // Stratégie urgence HP faible
    if (analysis.myActivePokemon && analysis.myActivePokemon.hpPercent < 25) {
      if (analysis.teamComposition.bestSwitchOption) {
        dynamicStrategies.push({
          action: 'switch',
          target: analysis.teamComposition.bestSwitchOption.index,
          reasoning: 'HP critique - changement de survie',
          priority: 9,
          riskLevel: 3,
          expectedOutcome: 'Préservation équipe'
        });
      }
    }
    
    // Stratégie avantage de type
    if (analysis.opponentPokemon && analysis.myActivePokemon) {
      const typeAdvantage = this.hasTypeAdvantage(
        analysis.myActivePokemon.pokemon.types,
        analysis.opponentPokemon.pokemon.types
      );
      
      if (typeAdvantage) {
        dynamicStrategies.push({
          action: 'attack',
          target: this.selectBestMove(analysis.myActivePokemon.pokemon, analysis.opponentPokemon.pokemon),
          reasoning: 'Avantage de type détecté',
          priority: 8,
          riskLevel: 2,
          expectedOutcome: 'Dégâts super efficaces'
        });
      }
    }
    
    // Stratégie momentum
    if (analysis.battleSituation.momentum === 'winning') {
      dynamicStrategies.push({
        action: 'attack',
        target: 'aggressive_move',
        reasoning: 'Maintenir momentum positif',
        priority: 7,
        riskLevel: 4,
        expectedOutcome: 'Pression continue'
      });
    }
    
    return dynamicStrategies;
  }
  
  // === SÉLECTION ACTION OPTIMALE ===
  
  private selectOptimalAction(
    strategies: StrategicRecommendation[],
    analysis: AIAnalysis,
    gameState: BattleGameState
  ): AIDecision {
    
    if (strategies.length === 0) {
      return this.createDefaultDecision(gameState);
    }
    
    // Prendre la stratégie la plus prioritaire
    const chosenStrategy = strategies[0];
    
    // Créer l'action correspondante
    const action = this.createBattleAction(chosenStrategy, gameState);
    
    // Calculer confiance
    const confidence = this.calculateConfidence(chosenStrategy, analysis);
    
    // Générer alternatives
    const alternatives = strategies.slice(1, 4).map(s => s.reasoning);
    
    return {
      success: action !== null,
      action,
      strategy: chosenStrategy.reasoning,
      reasoning: [
        chosenStrategy.reasoning,
        `Priorité: ${chosenStrategy.priority}/10`,
        `Risque: ${chosenStrategy.riskLevel}/10`,
        `Résultat attendu: ${chosenStrategy.expectedOutcome}`
      ],
      confidence,
      alternativeActions: alternatives,
      thinkingTime: 0, // Sera mis à jour par appelant
      memoryUpdated: false // Sera mis à jour par updateAIMemory
    };
  }
  
  private createBattleAction(strategy: StrategicRecommendation, gameState: BattleGameState): BattleAction | null {
    if (!this.trainerData) return null;
    
    switch (strategy.action) {
      case 'attack':
        return {
          actionId: `ai_attack_${Date.now()}`,
          playerId: gameState.player2.sessionId,
          type: 'attack',
          data: {
            moveId: typeof strategy.target === 'string' ? 
              this.selectMoveFromHint(strategy.target, gameState.player2.pokemon) : 
              this.selectRandomMove(gameState.player2.pokemon)
          },
          timestamp: Date.now()
        };
        
      case 'switch':
        if (typeof strategy.target === 'number' && this.teamManager) {
          const currentIndex = this.teamManager.findPokemonIndex(gameState.player2.pokemon?.combatId || '');
          const switchAction: SwitchAction = {
            actionId: `ai_switch_${Date.now()}`,
            playerId: gameState.player2.sessionId,
            type: 'switch',
            data: {
              fromPokemonIndex: currentIndex >= 0 ? currentIndex : 0,
              toPokemonIndex: strategy.target,
              isForced: false,
              reason: 'ai_strategic'
            },
            timestamp: Date.now()
          };
          return switchAction;
        }
        break;
        
      case 'item':
        // Items pas encore implémentés pour IA
        return null;
    }
    
    return null;
  }
  
  // === UTILITAIRES CALCULS ===
  
  private calculateTypeAdvantages(types: string[]): string[] {
    // Simplification - en réalité il faudrait une vraie table des types
    const advantages: Record<string, string[]> = {
      'fire': ['grass', 'bug', 'steel', 'ice'],
      'water': ['fire', 'ground', 'rock'],
      'grass': ['water', 'ground', 'rock'],
      'electric': ['water', 'flying'],
      'psychic': ['fighting', 'poison'],
      'ice': ['grass', 'ground', 'flying', 'dragon'],
      'fighting': ['normal', 'rock', 'steel', 'ice', 'dark'],
      'poison': ['grass', 'fairy'],
      'ground': ['poison', 'rock', 'steel', 'fire', 'electric'],
      'flying': ['fighting', 'bug', 'grass'],
      'bug': ['grass', 'psychic', 'dark'],
      'rock': ['flying', 'bug', 'fire', 'ice'],
      'ghost': ['ghost', 'psychic'],
      'dragon': ['dragon'],
      'dark': ['ghost', 'psychic'],
      'steel': ['rock', 'ice', 'fairy'],
      'fairy': ['fighting', 'dragon', 'dark']
    };
    
    return types.flatMap(type => advantages[type] || []);
  }
  
  private calculateTypeWeaknesses(types: string[]): string[] {
    // Simplification - faiblesses basiques
    const weaknesses: Record<string, string[]> = {
      'fire': ['water', 'ground', 'rock'],
      'water': ['grass', 'electric'],
      'grass': ['flying', 'poison', 'bug', 'fire', 'ice'],
      'electric': ['ground'],
      'psychic': ['bug', 'ghost', 'dark'],
      'ice': ['fighting', 'rock', 'steel', 'fire'],
      'fighting': ['flying', 'psychic', 'fairy'],
      'poison': ['ground', 'psychic'],
      'ground': ['water', 'grass', 'ice'],
      'flying': ['rock', 'electric', 'ice'],
      'bug': ['flying', 'rock', 'fire'],
      'rock': ['fighting', 'ground', 'steel', 'water', 'grass'],
      'ghost': ['ghost', 'dark'],
      'dragon': ['ice', 'dragon', 'fairy'],
      'dark': ['fighting', 'bug', 'fairy'],
      'steel': ['fighting', 'ground', 'fire'],
      'fairy': ['poison', 'steel']
    };
    
    return types.flatMap(type => weaknesses[type] || []);
  }
  
  private calculateThreatLevel(pokemon: Pokemon, hpPercent: number): number {
    let threat = 5; // Base
    
    // Facteur HP
    threat += (hpPercent / 100) * 3;
    
    // Facteur niveau
    threat += Math.min(pokemon.level / 20, 2);
    
    // Facteur stats
    const avgStat = (pokemon.attack + pokemon.speed) / 2;
    threat += Math.min(avgStat / 30, 2);
    
    return Math.min(10, Math.max(0, threat));
  }
  
  private calculateSwitchValue(pokemon: Pokemon, hpPercent: number, statusEffects: string[]): number {
    let switchValue = 0;
    
    // HP faible = forte valeur de changement
    if (hpPercent < 30) switchValue += 8;
    else if (hpPercent < 50) switchValue += 5;
    else if (hpPercent < 70) switchValue += 2;
    
    // Statuts négatifs
    if (statusEffects.includes('poison') || statusEffects.includes('burn')) switchValue += 3;
    if (statusEffects.includes('paralysis') || statusEffects.includes('sleep')) switchValue += 4;
    
    return Math.min(10, switchValue);
  }
  
  private calculateUrgency(
    myPokemon: PokemonAnalysis | null,
    opponentPokemon: PokemonAnalysis | null,
    turnNumber: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    
    if (!myPokemon) return 'critical';
    
    if (myPokemon.hpPercent < 15) return 'critical';
    if (myPokemon.hpPercent < 35) return 'high';
    if (turnNumber > 10 && myPokemon.hpPercent < 60) return 'medium';
    
    return 'low';
  }
  
  private calculateTurnPressure(turnNumber: number, momentum: string, urgency: string): number {
    let pressure = 3; // Base
    
    // Facteur tour
    if (turnNumber > 15) pressure += 3;
    else if (turnNumber > 8) pressure += 1;
    
    // Facteur momentum
    if (momentum === 'losing') pressure += 4;
    else if (momentum === 'winning') pressure -= 1;
    
    // Facteur urgence
    switch (urgency) {
      case 'critical': pressure += 4; break;
      case 'high': pressure += 2; break;
      case 'medium': pressure += 1; break;
    }
    
    return Math.min(10, Math.max(0, pressure));
  }
  
  // === PRÉDICTIONS ===
  
  private predictPlayerActions(opponentPokemon: PokemonAnalysis | null, turnNumber: number): string[] {
    const predictions: string[] = [];
    
    if (!opponentPokemon) return ['unknown'];
    
    // Basé sur HP
    if (opponentPokemon.hpPercent < 30) {
      predictions.push('defensive', 'item_use', 'desperate_attack');
    } else if (opponentPokemon.hpPercent > 70) {
      predictions.push('aggressive_attack', 'setup_move');
    } else {
      predictions.push('balanced_attack', 'tactical_move');
    }
    
    // Basé sur tour
    if (turnNumber <= 3) {
      predictions.push('setup', 'cautious');
    } else if (turnNumber > 10) {
      predictions.push('aggressive', 'finishing_move');
    }
    
    return predictions.slice(0, 3);
  }
  
  private predictOpponentMoves(pokemon: Pokemon): string[] {
    // En réalité, on analyserait l'historique des moves
    // Pour l'instant, retourner les moves connus
    return pokemon.moves.slice();
  }
  
  // === AUTRES UTILITAIRES ===
  
  private hasTypeAdvantage(myTypes: string[], opponentTypes: string[]): boolean {
    const myAdvantages = this.calculateTypeAdvantages(myTypes);
    return opponentTypes.some(type => myAdvantages.includes(type));
  }
  
  private selectBestMove(myPokemon: Pokemon, opponentPokemon: Pokemon): string {
    // Prioriser moves avec avantage de type
    const myAdvantages = this.calculateTypeAdvantages(myPokemon.types);
    const effectiveMoves = myPokemon.moves.filter(move => {
      // Simplifié - en réalité il faudrait une DB des moves avec leurs types
      return myAdvantages.some(advantage => 
        opponentPokemon.types.includes(advantage)
      );
    });
    
    if (effectiveMoves.length > 0) {
      return effectiveMoves[0];
    }
    
    // Sinon, move aléatoire
    return myPokemon.moves[Math.floor(Math.random() * myPokemon.moves.length)];
  }
  
  private selectMoveFromHint(hint: string, pokemon: Pokemon | null): string {
    if (!pokemon) return 'tackle';
    
    const moves = pokemon.moves;
    
    switch (hint) {
      case 'aggressive_move':
        // Prioriser moves offensifs
        return moves.find(m => ['thunderbolt', 'flamethrower', 'hydro_pump'].includes(m)) || moves[0];
        
      case 'defensive_move':
        // Prioriser moves défensifs/status
        return moves.find(m => ['growl', 'tail_whip', 'leer'].includes(m)) || moves[0];
        
      default:
        return moves[Math.floor(Math.random() * moves.length)];
    }
  }
  
  private selectRandomMove(pokemon: Pokemon | null): string {
    if (!pokemon || pokemon.moves.length === 0) return 'tackle';
    return pokemon.moves[Math.floor(Math.random() * pokemon.moves.length)];
  }
  
  // === MÉMOIRE ET APPRENTISSAGE ===
  
  private updateAIMemory(decision: AIDecision, analysis: AIAnalysis, gameState: BattleGameState): void {
    if (!this.aiMemory || !this.trainerData) return;
    
    // Ajouter insight stratégique
    const insight: StrategicInsight = {
      situation: `${analysis.battleSituation.momentum}_${analysis.battleSituation.urgency}`,
      action: decision.action?.type || 'unknown',
      effectiveness: decision.confidence,
      timesUsed: 1,
      lastUsed: Date.now()
    };
    
    // Fusionner ou ajouter
    const existingInsight = this.aiMemory.strategicInsights.find(
      i => i.situation === insight.situation && i.action === insight.action
    );
    
    if (existingInsight) {
      existingInsight.effectiveness = (existingInsight.effectiveness + insight.effectiveness) / 2;
      existingInsight.timesUsed++;
      existingInsight.lastUsed = insight.lastUsed;
    } else {
      this.aiMemory.strategicInsights.push(insight);
    }
    
    // Nettoyer anciens insights
    const cutoffTime = Date.now() - (this.MEMORY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    this.aiMemory.strategicInsights = this.aiMemory.strategicInsights.filter(
      i => i.lastUsed > cutoffTime
    );
    
    this.aiMemory.lastUpdate = Date.now();
    decision.memoryUpdated = true;
    
    console.log(`🧠 [TrainerAI] Mémoire mise à jour: ${this.aiMemory.strategicInsights.length} insights`);
  }
  
  private trackDecisionForLearning(decision: AIDecision, analysis: AIAnalysis, gameState: BattleGameState): void {
    if (!this.ainpcManager || !this.trainerData) return;
    
    try {
      // Utiliser les ActionType corrects qui existent
      this.ainpcManager.trackPlayerAction(
        'AI_TRAINER',
        ActionType.NPC_TALK, // Réutiliser ce type pour les décisions IA
        {
          trainerId: this.trainerData.trainerId,
          trainerName: this.trainerData.name,
          decision: decision.action?.type || 'none',
          strategy: decision.strategy,
          confidence: decision.confidence,
          battleSituation: analysis.battleSituation.momentum,
          turnNumber: analysis.turnContext.turnNumber
        },
        {
          location: {
            map: 'battle_arena',
            x: 0,
            y: 0
          }
        }
      );
      
      console.log(`📊 [TrainerAI] Décision trackée pour apprentissage global`);
      
    } catch (error) {
      console.warn(`⚠️ [TrainerAI] Erreur tracking décision:`, error);
    }
  }
  
  // === HELPERS STRATÉGIES ===
  
  private checkStrategyConditions(conditions: string[], analysis: AIAnalysis, gameState: BattleGameState): boolean {
    // Évaluer chaque condition
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, analysis, gameState)) {
        return false;
      }
    }
    return true;
  }
  
  private evaluateCondition(condition: string, analysis: AIAnalysis, gameState: BattleGameState): boolean {
    switch (condition) {
      case 'always':
        return true;
        
      case 'hp_below_25':
        return analysis.myActivePokemon ? analysis.myActivePokemon.hpPercent < 25 : false;
        
      case 'hp_below_50':
        return analysis.myActivePokemon ? analysis.myActivePokemon.hpPercent < 50 : false;
        
      case 'has_type_advantage':
        return analysis.myActivePokemon && analysis.opponentPokemon ? 
          this.hasTypeAdvantage(
            analysis.myActivePokemon.pokemon.types,
            analysis.opponentPokemon.pokemon.types
          ) : false;
          
      case 'type_disadvantage':
        return analysis.myActivePokemon && analysis.opponentPokemon ? 
          this.hasTypeAdvantage(
            analysis.opponentPokemon.pokemon.types,
            analysis.myActivePokemon.pokemon.types
          ) : false;
          
      case 'first_pokemon':
        return analysis.turnContext.turnNumber <= 1;
        
      case 'hp_above_75':
        return analysis.myActivePokemon ? analysis.myActivePokemon.hpPercent > 75 : false;
        
      case 'last_pokemon':
        return analysis.teamComposition.remainingPokemon <= 1;
        
      case 'can_predict_player_move':
        return analysis.turnContext.playerBehavior.predictability > 6;
        
      case 'enemy_switching':
        return analysis.turnContext.recentActions.includes('switch');
        
      default:
        console.warn(`⚠️ [TrainerAI] Condition inconnue: ${condition}`);
        return false;
    }
  }
  
  private calculateSituationModifier(strategy: TrainerStrategy, analysis: AIAnalysis): number {
    let modifier = 1.0;
    
    // Modifier selon situation
    if (analysis.battleSituation.momentum === 'losing') {
      if (strategy.name.includes('defensive') || strategy.name.includes('heal')) {
        modifier += 0.5;
      }
    } else if (analysis.battleSituation.momentum === 'winning') {
      if (strategy.name.includes('aggressive') || strategy.name.includes('attack')) {
        modifier += 0.3;
      }
    }
    
    // Modifier selon urgence
    if (analysis.battleSituation.urgency === 'critical') {
      if (strategy.name.includes('switch') || strategy.name.includes('heal')) {
        modifier += 0.7;
      }
    }
    
    return modifier;
  }
  
  private interpretStrategyAction(actionName: string, analysis: AIAnalysis): { type: string; target?: string | number } | null {
    switch (actionName) {
      case 'use_random_move':
      case 'use_effective_move':
        return { type: 'attack', target: 'best_move' };
        
      case 'use_stat_boost':
        return { type: 'attack', target: 'setup_move' };
        
      case 'use_potion':
        return { type: 'item', target: 'potion' };
        
      case 'switch_to_resistant':
        return analysis.teamComposition.bestSwitchOption ? 
          { type: 'switch', target: analysis.teamComposition.bestSwitchOption.index } : null;
          
      case 'counter_predicted_move':
        return { type: 'attack', target: 'counter_move' };
        
      case 'use_hazards':
        return { type: 'attack', target: 'hazard_move' };
        
      case 'maximize_damage':
        return { type: 'attack', target: 'aggressive_move' };
        
      default:
        console.warn(`⚠️ [TrainerAI] Action inconnue: ${actionName}`);
        return { type: 'attack', target: 'random_move' };
    }
  }
  
  private calculateRiskLevel(action: { type: string; target?: string | number }, analysis: AIAnalysis): number {
    let risk = 3; // Base
    
    if (action.type === 'switch') {
      risk += 2; // Changement = risque modéré
      if (analysis.myActivePokemon && analysis.myActivePokemon.hpPercent > 70) {
        risk += 3; // Risqué de changer quand en bonne santé
      }
    } else if (action.type === 'attack') {
      if (typeof action.target === 'string' && action.target.includes('aggressive')) {
        risk += 4; // Attaque agressive = risqué
      }
    }
    
    return Math.min(10, Math.max(0, risk));
  }
  
  private predictOutcome(action: { type: string; target?: string | number }, analysis: AIAnalysis): string {
    if (action.type === 'attack') {
      if (analysis.myActivePokemon && analysis.opponentPokemon) {
        const hasAdvantage = this.hasTypeAdvantage(
          analysis.myActivePokemon.pokemon.types,
          analysis.opponentPokemon.pokemon.types
        );
        return hasAdvantage ? 'Dégâts efficaces attendus' : 'Dégâts modérés attendus';
      }
      return 'Dégâts standards attendus';
    } else if (action.type === 'switch') {
      return 'Changement tactique pour avantage';
    } else {
      return 'Effet de support';
    }
  }
  
  private calculateConfidence(strategy: StrategicRecommendation, analysis: AIAnalysis): number {
    let confidence = 0.5; // Base
    
    // Boost par priorité
    confidence += strategy.priority / 20; // 0-0.5
    
    // Réduction par risque
    confidence -= strategy.riskLevel / 30; // 0-0.33
    
    // Boost par intelligence IA
    if (this.aiProfile) {
      confidence += (this.aiProfile.intelligence / 100) * 0.3; // 0-0.3
    }
    
    // Boost si avantage de type
    if (analysis.myActivePokemon && analysis.opponentPokemon) {
      const hasAdvantage = this.hasTypeAdvantage(
        analysis.myActivePokemon.pokemon.types,
        analysis.opponentPokemon.pokemon.types
      );
      if (hasAdvantage) confidence += 0.2;
    }
    
    return Math.min(1.0, Math.max(0.1, confidence));
  }
  
  // === MÉTHODES AUXILIAIRES ===
  
  private findBestSwitchOption(allPokemon: Pokemon[]): { index: number; reason: string } | null {
    const alivePokemon = allPokemon
      .map((p, index) => ({ pokemon: p, index }))
      .filter(p => p.pokemon.currentHp > 0);
    
    if (alivePokemon.length <= 1) return null;
    
    // Prioriser celui avec le plus de HP
    const best = alivePokemon.reduce((best, current) => 
      current.pokemon.currentHp > best.pokemon.currentHp ? current : best
    );
    
    return {
      index: best.index,
      reason: `Meilleur HP (${best.pokemon.currentHp}/${best.pokemon.maxHp})`
    };
  }
  
  private detectPatterns(history: BattleAction[]): string[] {
    const patterns: string[] = [];
    
    if (history.length < 3) return patterns;
    
    const recentTypes = history.slice(-3).map(a => a.type);
    
    if (recentTypes.every(t => t === 'attack')) {
      patterns.push('aggressive');
    } else if (recentTypes.includes('switch')) {
      patterns.push('tactical');
    } else if (recentTypes.includes('item')) {
      patterns.push('defensive');
    }
    
    return patterns;
  }
  
  private analyzePlayerBehavior(playerName: string, turnNumber: number): PlayerBehaviorAnalysis {
    // Récupérer données comportementales existantes ou créer par défaut
    const existingData = this.playerBehaviorData.get(playerName);
    
    if (existingData) {
      return existingData;
    }
    
    // Analyse par défaut basée sur patterns généraux
    const defaultBehavior: PlayerBehaviorAnalysis = {
      aggressiveness: 5, // Moyen
      predictability: 4, // Assez imprévisible
      favoriteStrategies: ['balanced_attack'],
      weaknesses: ['impatience'],
      nextActionPrediction: [
        { action: 'attack', confidence: 0.6 },
        { action: 'switch', confidence: 0.2 },
        { action: 'item', confidence: 0.2 }
      ]
    };
    
    this.playerBehaviorData.set(playerName, defaultBehavior);
    return defaultBehavior;
  }
  
  private generateCounterStrategies(predictedActions: string[], momentum: string): string[] {
    const counters: string[] = [];
    
    for (const action of predictedActions) {
      switch (action) {
        case 'aggressive_attack':
          counters.push('defensive_counter', 'switch_to_tank');
          break;
        case 'setup_move':
          counters.push('interrupt_attack', 'status_counter');
          break;
        case 'defensive':
          counters.push('setup_opportunity', 'pressure_attack');
          break;
        case 'item_use':
          counters.push('quick_attack', 'status_inflict');
          break;
      }
    }
    
    // Ajouter stratégies selon momentum
    if (momentum === 'losing') {
      counters.push('comeback_strategy', 'desperate_measure');
    } else if (momentum === 'winning') {
      counters.push('maintain_pressure', 'secure_victory');
    }
    
    return [...new Set(counters)]; // Dédupliquer
  }
  
  private generateStrategicRecommendations(
    battleSituation: BattleSituationAnalysis,
    teamComposition: TeamAnalysis,
    turnContext: TurnContextAnalysis
  ): StrategicRecommendation[] {
    
    const recommendations: StrategicRecommendation[] = [];
    
    // Recommandation basée sur momentum
    if (battleSituation.momentum === 'winning') {
      recommendations.push({
        action: 'attack',
        reasoning: 'Maintenir l\'avantage',
        priority: 7,
        riskLevel: 3,
        expectedOutcome: 'Consolidation victoire'
      });
    }
    
    // Recommandation basée sur équipe
    if (teamComposition.remainingPokemon > 3 && teamComposition.bestSwitchOption) {
      recommendations.push({
        action: 'switch',
        target: teamComposition.bestSwitchOption.index,
        reasoning: teamComposition.bestSwitchOption.reason,
        priority: 6,
        riskLevel: 4,
        expectedOutcome: 'Repositionnement tactique'
      });
    }
    
    // Recommandation basée sur contexte
    if (turnContext.recommendation === 'attack') {
      recommendations.push({
        action: 'attack',
        reasoning: 'Contexte favorable à l\'attaque',
        priority: 8,
        riskLevel: 2,
        expectedOutcome: 'Dégâts optimaux'
      });
    }
    
    return recommendations;
  }
  
  // === MÉTHODES DE FALLBACK ===
  
  private createDefaultDecision(gameState: BattleGameState): AIDecision {
    // Attaque basique par défaut
    const defaultAction: BattleAction = {
      actionId: `ai_default_${Date.now()}`,
      playerId: gameState.player2.sessionId,
      type: 'attack',
      data: {
        moveId: this.selectRandomMove(gameState.player2.pokemon)
      },
      timestamp: Date.now()
    };
    
    return {
      success: true,
      action: defaultAction,
      strategy: 'Attaque par défaut',
      reasoning: ['Aucune stratégie spécifique déclenchée', 'Action de base sélectionnée'],
      confidence: 0.3,
      alternativeActions: ['switch', 'different_move'],
      thinkingTime: 0,
      memoryUpdated: false
    };
  }
  
  private createFailedDecision(reason: string): AIDecision {
    return {
      success: false,
      action: null,
      strategy: 'Échec',
      reasoning: [reason],
      confidence: 0,
      alternativeActions: [],
      thinkingTime: 0,
      memoryUpdated: false
    };
  }
  
  // === API PUBLIQUE ÉTENDUE ===
  
  /**
   * Vérifie si l'IA est prête à fonctionner
   */
  isReady(): boolean {
    return this.isInitialized && this.trainerData !== null && this.aiProfile !== null;
  }
  
  /**
   * Obtient des statistiques sur l'IA
   */
  getStats(): any {
    return {
      version: 'trainer_ai_v1',
      isReady: this.isReady(),
      trainerName: this.trainerData?.name || 'N/A',
      difficulty: this.aiProfile?.difficulty || 'N/A',
      intelligence: this.aiProfile?.intelligence || 0,
      memoryEnabled: this.aiProfile?.memory || false,
      strategiesCount: this.aiProfile?.strategies.length || 0,
      switchPatternsCount: this.aiProfile?.switchPatterns.length || 0,
      ainpcConnected: this.ainpcManager !== null,
      teamManagerConnected: this.teamManager !== null,
      turnHistorySize: this.turnHistory.length,
      playerBehaviorTracked: this.playerBehaviorData.size,
      memoryInsights: this.aiMemory?.strategicInsights.length || 0,
      configuration: {
        thinkingTimeBase: this.THINKING_TIME_BASE,
        thinkingTimeMax: this.THINKING_TIME_MAX,
        confidenceThreshold: this.CONFIDENCE_THRESHOLD,
        memoryRetentionDays: this.MEMORY_RETENTION_DAYS
      },
      features: [
        'multi_level_analysis',
        'strategic_decision_making',
        'player_behavior_prediction',
        'memory_learning_system',
        'dynamic_strategy_adaptation',
        'type_advantage_calculation',
        'team_composition_analysis',
        'ainpc_integration',
        'confidence_calculation',
        'risk_assessment'
      ]
    };
  }
  
  /**
   * Reset pour un nouveau combat
   */
  reset(): void {
    this.battleId = '';
    this.turnHistory = [];
    this.playerBehaviorData.clear();
    // Note: ne pas reset aiMemory pour conserver l'apprentissage entre combats
    
    console.log('🔄 [TrainerAI] Reset effectué');
  }
  
  /**
   * Nettoyage complet (fin de session)
   */
  cleanup(): void {
    this.trainerData = null;
    this.aiProfile = null;
    this.teamManager = null;
    this.ainpcManager = null;
    this.aiMemory = null;
    this.isInitialized = false;
    
    this.reset();
    console.log('🧹 [TrainerAI] Nettoyage complet effectué');
  }
}

export default TrainerAI;
