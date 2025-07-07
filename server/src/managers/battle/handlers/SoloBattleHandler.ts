// server/src/managers/battle/handlers/SoloBattleHandler.ts
// Handler spécialisé pour les combats Solo (PvE) - Sauvage et Dresseur

import { 
  BattleContext, 
  BattleAction, 
  BattleSequence,
  BattlePokemonData,
  ActionType,
  BATTLE_TIMINGS,
  POKEMON_CONSTANTS
} from '../types/BattleTypes';
import { IBattleHandler } from '../BattleSequencer';
import { DamageCalculator } from '../DamageCalculator';
import { TypeEffectiveness } from '../TypeEffectiveness';
import { BattleMessageHandler, createBattleMessage, createAttackMessages } from '../BattleMessageHandler';

/**
 * HANDLER POUR COMBATS SOLO (PvE)
 * 
 * Gère :
 * - Combats vs Pokémon sauvages
 * - Combats vs Dresseurs NPC
 * - Logique IA simple et avancée
 * - Captures de Pokémon sauvages
 * - Fuite de combat
 */
export class SoloBattleHandler implements IBattleHandler {
  
  // Cache des données de moves pour performance
  private moveDataCache: Map<string, any> = new Map();
  
  // IA - Patterns de comportement
  private aiPersonalities = {
    'aggressive': { attackChance: 0.9, switchChance: 0.05, itemChance: 0.05 },
    'defensive': { attackChance: 0.6, switchChance: 0.3, itemChance: 0.1 },
    'balanced': { attackChance: 0.75, switchChance: 0.15, itemChance: 0.1 },
    'wild': { attackChance: 0.95, switchChance: 0.0, itemChance: 0.05 }
  };
  
  constructor() {
    console.log('🤖 [SoloBattleHandler] Handler PvE initialisé');
  }
  
  // === INTERFACE IBattleHandler ===
  
  /**
   * Vérifie si ce handler peut gérer ce type de combat
   */
  canHandle(context: BattleContext): boolean {
    const canHandle = context.battleType === 'wild' || 
                     context.battleType === 'trainer' ||
                     context.battleType === 'gym' ||
                     context.battleType === 'elite4';
    
    console.log(`🔍 [SoloBattleHandler] Peut gérer ${context.battleType}: ${canHandle}`);
    return canHandle;
  }
  
  /**
   * Traite une action de combat PvE
   */
  async processAction(action: BattleAction, context: BattleContext): Promise<BattleSequence> {
    console.log(`⚔️ [SoloBattleHandler] Traitement action: ${action.type}`);
    
    switch (action.type) {
      case 'attack':
        return await this.processAttackAction(action, context);
        
      case 'item':
        return await this.processItemAction(action, context);
        
      case 'switch':
        return await this.processSwitchAction(action, context);
        
      case 'run':
        return await this.processRunAction(action, context);
        
      case 'capture':
        return await this.processCaptureAction(action, context);
        
      default:
        console.warn(`⚠️ [SoloBattleHandler] Type d'action non géré: ${action.type}`);
        return this.createEmptySequence();
    }
  }
  
  /**
   * Détermine si l'IA doit jouer après cette action
   */
  shouldPlayAITurn(context: BattleContext): boolean {
    // L'IA joue si :
    // - Le tour est à l'IA
    // - Le combat n'est pas terminé
    // - Aucune action en attente
    
    const isAITurn = context.currentPlayer === 'ai' || context.currentPlayer === 'player2';
    const battleActive = context.phase === 'battle';
    
    console.log(`🤖 [SoloBattleHandler] IA doit jouer ? ${isAITurn && battleActive}`);
    return isAITurn && battleActive;
  }
  
  /**
   * Génère une action IA intelligente
   */
  async generateAIAction(context: BattleContext): Promise<BattleAction> {
    console.log(`🧠 [SoloBattleHandler] Génération action IA...`);
    
    // Obtenir les données actuelles
    const aiPokemon = this.getAIPokemon(context);
    const playerPokemon = this.getPlayerPokemon(context);
    
    if (!aiPokemon || !playerPokemon) {
      throw new Error('Pokémon manquants pour l\'IA');
    }
    
    // Déterminer la personnalité IA
    const personality = this.getAIPersonality(context);
    
    // Logique de décision
    const decision = await this.makeAIDecision(aiPokemon, playerPokemon, personality, context);
    
    return {
      actionId: `ai_action_${Date.now()}`,
      playerId: 'ai',
      type: decision.type,
      targetId: decision.targetId,
      data: decision.data,
      priority: decision.priority || 0,
      speed: aiPokemon.speed,
      timestamp: Date.now()
    };
  }
  
  // === TRAITEMENT DES ACTIONS SPÉCIFIQUES ===
  
  /**
   * Traite une attaque
   */
  private async processAttackAction(action: BattleAction, context: BattleContext): Promise<BattleSequence> {
    console.log(`💥 [SoloBattleHandler] Traitement attaque...`);
    
    const moveId = action.data.moveId;
    if (!moveId) {
      return this.createErrorSequence('MSG_MOVE_FAILED');
    }
    
    // Obtenir les données de l'attaque
    const moveData = await this.getMoveData(moveId);
    if (!moveData) {
      return this.createErrorSequence('MSG_MOVE_FAILED');
    }
    
    // Obtenir attaquant et défenseur
    const attacker = this.getPokemonById(action.playerId, context);
    const defender = this.getOpponentPokemon(action.playerId, context);
    
    if (!attacker || !defender) {
      return this.createErrorSequence('MSG_MOVE_FAILED');
    }
    
    // Vérifier si l'attaque peut être utilisée
    if (!this.canUseMove(attacker, moveData)) {
      return this.createMoveBlockedSequence(attacker, moveData);
    }
    
    // Calculer précision
    if (!this.checkMoveAccuracy(moveData, attacker, defender)) {
      return this.createMissSequence(attacker, moveData);
    }
    
    // Calculer coup critique
    const isCritical = this.calculateCriticalHit(attacker, moveData);
    
    // Calculer dégâts
    const damageResult = DamageCalculator.calculateDamage({
      attacker,
      defender,
      move: moveData,
      moveType: moveData.type || 'Normal',
      weather: context.environment?.weather,
      terrain: context.environment?.terrain,
      isCritical
    });
    
    // Appliquer les dégâts
    const newDefenderHp = Math.max(0, defender.currentHp - damageResult.finalDamage);
    const defenderFainted = newDefenderHp <= 0;
    
    // Créer la séquence d'attaque
    return this.createAttackSequence(
      attacker,
      defender,
      moveData,
      damageResult,
      defenderFainted,
      context
    );
  }
  
  /**
   * Traite l'utilisation d'un objet
   */
  private async processItemAction(action: BattleAction, context: BattleContext): Promise<BattleSequence> {
    console.log(`🎒 [SoloBattleHandler] Traitement objet: ${action.data.itemId}`);
    
    const itemId = action.data.itemId;
    const targetId = action.data.targetPokemonId;
    
    // Obtenir les données de l'objet
    const itemData = await this.getItemData(itemId);
    if (!itemData) {
      return this.createErrorSequence('MSG_ITEM_FAILED');
    }
    
    // Traitement selon le type d'objet
    switch (itemData.category) {
      case 'healing':
        return this.processHealingItem(itemData, targetId, context);
        
      case 'pokeball':
        return this.processPokeball(itemData, context);
        
      case 'status':
        return this.processStatusItem(itemData, targetId, context);
        
      default:
        return this.createErrorSequence('MSG_ITEM_FAILED');
    }
  }
  
  /**
   * Traite un changement de Pokémon
   */
  private async processSwitchAction(action: BattleAction, context: BattleContext): Promise<BattleSequence> {
    console.log(`🔄 [SoloBattleHandler] Changement Pokémon: ${action.data.targetPokemonId}`);
    
    const newPokemonId = action.data.targetPokemonId;
    if (!newPokemonId) {
      return this.createErrorSequence('MSG_SWITCH_FAILED');
    }
    
    // Vérifier que le nouveau Pokémon est disponible
    const newPokemon = this.getPokemonById(newPokemonId, context);
    if (!newPokemon || newPokemon.currentHp <= 0) {
      return this.createErrorSequence('MSG_SWITCH_FAILED');
    }
    
    const currentPokemon = this.getPokemonById(action.playerId, context);
    
    return this.createSwitchSequence(currentPokemon, newPokemon, context);
  }
  
  /**
   * Traite une tentative de fuite
   */
  private async processRunAction(action: BattleAction, context: BattleContext): Promise<BattleSequence> {
    console.log(`🏃 [SoloBattleHandler] Tentative de fuite...`);
    
    // Combats de dresseurs : impossible de fuir
    if (context.battleType === 'trainer' || context.battleType === 'gym' || context.battleType === 'elite4') {
      return this.createRunFailSequence('MSG_CANT_ESCAPE_TRAINER');
    }
    
    // Calcul de réussite de fuite
    const escapeChance = this.calculateEscapeChance(context);
    const escaped = Math.random() < escapeChance;
    
    if (escaped) {
      return this.createRunSuccessSequence(context);
    } else {
      return this.createRunFailSequence('MSG_CANT_ESCAPE');
    }
  }
  
  /**
   * Traite une tentative de capture
   */
  private async processCaptureAction(action: BattleAction, context: BattleContext): Promise<BattleSequence> {
    console.log(`🎯 [SoloBattleHandler] Tentative de capture...`);
    
    // Seulement dans les combats sauvages
    if (context.battleType !== 'wild') {
      return this.createErrorSequence('MSG_CANT_CAPTURE_TRAINER');
    }
    
    const ballType = action.data.ballType || 'pokeball';
    const targetPokemon = this.getOpponentPokemon(action.playerId, context);
    
    if (!targetPokemon) {
      return this.createErrorSequence('MSG_CAPTURE_FAILED');
    }
    
    // Calculer le résultat de capture
    const captureResult = this.calculateCaptureResult(targetPokemon, ballType, context);
    
    return this.createCaptureSequence(targetPokemon, ballType, captureResult, context);
  }
  
  // === LOGIQUE IA ===
  
  /**
   * Prend une décision intelligente pour l'IA
   */
  private async makeAIDecision(
    aiPokemon: BattlePokemonData,
    playerPokemon: BattlePokemonData,
    personality: any,
    context: BattleContext
  ): Promise<any> {
    console.log(`🎯 [SoloBattleHandler] Décision IA (${personality.name || 'default'})...`);
    
    // Évaluer la situation
    const aiHpPercent = aiPokemon.currentHp / aiPokemon.maxHp;
    const playerHpPercent = playerPokemon.currentHp / playerPokemon.maxHp;
    
    // Logique de fuite (Pokémon sauvages seulement)
    if (context.battleType === 'wild' && aiHpPercent < 0.2 && Math.random() < 0.3) {
      return {
        type: 'run' as ActionType,
        data: {},
        priority: 0
      };
    }
    
    // Logique de changement (dresseurs seulement)
    if (context.battleType === 'trainer' && aiHpPercent < 0.3 && Math.random() < personality.switchChance) {
      const switchTarget = this.findBestSwitchTarget(aiPokemon, playerPokemon, context);
      if (switchTarget) {
        return {
          type: 'switch' as ActionType,
          targetId: switchTarget.pokemonId,
          data: { targetPokemonId: switchTarget.pokemonId },
          priority: 0
        };
      }
    }
    
    // Logique d'objets (dresseurs seulement)
    if (context.battleType === 'trainer' && aiHpPercent < 0.5 && Math.random() < personality.itemChance) {
      const healingItem = this.findBestHealingItem(aiPokemon, context);
      if (healingItem) {
        return {
          type: 'item' as ActionType,
          data: { itemId: healingItem.id, targetPokemonId: aiPokemon.pokemonId },
          priority: 0
        };
      }
    }
    
    // Logique d'attaque (par défaut)
    const bestMove = this.findBestMove(aiPokemon, playerPokemon, context);
    
    return {
      type: 'attack' as ActionType,
      data: { moveId: bestMove.id },
      priority: bestMove.priority || 0
    };
  }
  
  /**
   * Trouve la meilleure attaque pour l'IA
   */
  private findBestMove(aiPokemon: BattlePokemonData, playerPokemon: BattlePokemonData, context: BattleContext): any {
    console.log(`🎯 [SoloBattleHandler] Recherche meilleure attaque...`);
    
    const availableMoves = aiPokemon.moves.filter(move => move.pp > 0);
    
    if (availableMoves.length === 0) {
      return { id: 'struggle', name: 'Lutte', priority: 0 };
    }
    
    let bestMove = availableMoves[0];
    let bestScore = 0;
    
    for (const move of availableMoves) {
      const score = this.evaluateMoveEffectiveness(move, aiPokemon, playerPokemon);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    console.log(`✅ [SoloBattleHandler] Meilleure attaque: ${bestMove.name} (score: ${bestScore})`);
    return bestMove;
  }
  
  /**
   * Évalue l'efficacité d'une attaque
   */
  private evaluateMoveEffectiveness(
    move: any,
    attacker: BattlePokemonData,
    defender: BattlePokemonData
  ): number {
    // Facteurs d'évaluation
    let score = move.power || 0;
    
    // Bonus efficacité des types
    const effectiveness = TypeEffectiveness.getTotalEffectiveness(move.type, defender.types);
    score *= effectiveness;
    
    // Bonus STAB
    if (TypeEffectiveness.hasSTAB(move.type, attacker.types)) {
      score *= 1.5;
    }
    
    // Pénalité si faible précision
    if (move.accuracy < 90) {
      score *= (move.accuracy / 100);
    }
    
    // Bonus si adversaire a peu de PV
    const defenderHpPercent = defender.currentHp / defender.maxHp;
    if (defenderHpPercent < 0.3 && score > 0) {
      score *= 1.5; // Priorité aux attaques qui peuvent finir
    }
    
    return score;
  }
  
  /**
   * Trouve le meilleur Pokémon pour un switch
   */
  private findBestSwitchTarget(
    currentPokemon: BattlePokemonData,
    opponentPokemon: BattlePokemonData,
    context: BattleContext
  ): BattlePokemonData | null {
    // TODO: Implémenter quand on aura le système d'équipe IA
    console.log(`🔄 [SoloBattleHandler] Recherche switch target (TODO)`);
    return null;
  }
  
  /**
   * Trouve le meilleur objet de soin
   */
  private findBestHealingItem(pokemon: BattlePokemonData, context: BattleContext): any | null {
    // TODO: Implémenter quand on aura le système d'inventaire IA
    console.log(`💊 [SoloBattleHandler] Recherche healing item (TODO)`);
    return null;
  }
  
  // === CALCULS DE COMBAT ===
  
  /**
   * Vérifie si un move peut être utilisé
   */
  private canUseMove(pokemon: BattlePokemonData, move: any): boolean {
    // Vérifier PP
    if (move.pp <= 0) {
      return false;
    }
    
    // Vérifier statuts bloquants
    if (pokemon.statusCondition === 'sleep' && Math.random() > 0.3) {
      return false;
    }
    
    if (pokemon.statusCondition === 'freeze' && Math.random() > 0.2) {
      return false;
    }
    
    if (pokemon.statusCondition === 'paralysis' && Math.random() < 0.25) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Calcule la précision d'une attaque
   */
  private checkMoveAccuracy(move: any, attacker: BattlePokemonData, defender: BattlePokemonData): boolean {
    let accuracy = move.accuracy || 100;
    
    // Modifications de précision par les stages
    const accuracyStage = attacker.statStages?.accuracy || 0;
    const evasionStage = defender.statStages?.evasion || 0;
    
    const netStage = accuracyStage - evasionStage;
    const stageMultiplier = this.getAccuracyStageMultiplier(netStage);
    
    accuracy *= stageMultiplier;
    
    return Math.random() * 100 < accuracy;
  }
  
  /**
   * Calcule si c'est un coup critique
   */
  private calculateCriticalHit(pokemon: BattlePokemonData, move: any): boolean {
    const baseCritRate = POKEMON_CONSTANTS.CRITICAL_BASE_RATE;
    let critRate = baseCritRate;
    
    // Certaines attaques ont un taux critique élevé
    if (move.highCritRatio) {
      critRate *= 2;
    }
    
    // Capacités qui augmentent les critiques
    if (pokemon.ability === 'super_luck') {
      critRate *= 2;
    }
    
    return Math.random() < critRate;
  }
  
  /**
   * Calcule la chance de fuite
   */
  private calculateEscapeChance(context: BattleContext): number {
    // Formule simplifiée : chance augmente avec les tentatives
    const attempts = context.escapeAttempts || 0;
    let baseChance = 0.5; // 50% de base
    
    // Chaque tentative augmente les chances
    baseChance += attempts * 0.1;
    
    return Math.min(baseChance, 1.0);
  }
  
  /**
   * Calcule le résultat d'une capture
   */
  private calculateCaptureResult(pokemon: BattlePokemonData, ballType: string, context: BattleContext): any {
    // TODO: Intégrer avec le CaptureManager existant
    const baseRate = 45; // Rate de base du Pokémon
    const ballBonus = this.getBallBonus(ballType);
    const hpModifier = 1 - (pokemon.currentHp / pokemon.maxHp);
    const statusModifier = this.getStatusCaptureModifier(pokemon.statusCondition);
    
    const finalRate = baseRate * ballBonus * (1 + hpModifier) * statusModifier;
    const success = Math.random() * 255 < finalRate;
    
    // Nombre de secousses basé sur la proximité du succès
    let shakeCount = 0;
    if (finalRate > 200) shakeCount = 3;
    else if (finalRate > 150) shakeCount = 2;
    else if (finalRate > 100) shakeCount = 1;
    
    return {
      success,
      shakeCount,
      criticalCapture: Math.random() < 0.01, // 1% de chance
      finalRate
    };
  }
  
  // === HELPERS ===
  
  private getBallBonus(ballType: string): number {
    const ballBonuses: { [key: string]: number } = {
      'pokeball': 1.0,
      'greatball': 1.5,
      'ultraball': 2.0,
      'masterball': 255.0
    };
    
    return ballBonuses[ballType] || 1.0;
  }
  
  private getStatusCaptureModifier(status: string): number {
    const statusModifiers: { [key: string]: number } = {
      'normal': 1.0,
      'sleep': 2.5,
      'freeze': 2.5,
      'paralysis': 1.5,
      'burn': 1.5,
      'poison': 1.5
    };
    
    return statusModifiers[status] || 1.0;
  }
  
  private getAccuracyStageMultiplier(stage: number): number {
    const clampedStage = Math.max(-6, Math.min(6, stage));
    
    if (clampedStage >= 0) {
      return (3 + clampedStage) / 3;
    } else {
      return 3 / (3 - clampedStage);
    }
  }
  
  private getAIPersonality(context: BattleContext): any {
    switch (context.battleType) {
      case 'wild':
        return { ...this.aiPersonalities.wild, name: 'wild' };
      case 'trainer':
        return { ...this.aiPersonalities.balanced, name: 'trainer' };
      case 'gym':
        return { ...this.aiPersonalities.aggressive, name: 'gym' };
      case 'elite4':
        return { ...this.aiPersonalities.defensive, name: 'elite4' };
      default:
        return { ...this.aiPersonalities.balanced, name: 'default' };
    }
  }
  
  // === HELPERS DE DONNÉES ===
  
  private getPokemonById(playerId: string, context: BattleContext): BattlePokemonData | null {
    return context.participants.find(p => p.sessionId === playerId)?.team[0] || null;
  }
  
  private getPlayerPokemon(context: BattleContext): BattlePokemonData | null {
    return context.participants.find(p => !p.isAI)?.team[0] || null;
  }
  
  private getAIPokemon(context: BattleContext): BattlePokemonData | null {
    return context.participants.find(p => p.isAI)?.team[0] || null;
  }
  
  private getOpponentPokemon(playerId: string, context: BattleContext): BattlePokemonData | null {
    return context.participants.find(p => p.sessionId !== playerId)?.team[0] || null;
  }
  
  private async getMoveData(moveId: string): Promise<any> {
    if (this.moveDataCache.has(moveId)) {
      return this.moveDataCache.get(moveId);
    }
    
    // TODO: Charger depuis vos JSONs de moves
    const mockMoveData = {
      id: moveId,
      name: moveId.charAt(0).toUpperCase() + moveId.slice(1),
      type: 'Normal',
      category: 'Physical',
      power: 40,
      accuracy: 100,
      pp: 35,
      priority: 0
    };
    
    this.moveDataCache.set(moveId, mockMoveData);
    return mockMoveData;
  }
  
  private async getItemData(itemId: string): Promise<any> {
    // TODO: Charger depuis vos JSONs d'objets
    return {
      id: itemId,
      name: itemId,
      category: 'healing',
      effect: 'heal_20'
    };
  }
  
  // === CRÉATION DE SÉQUENCES ===
  
  private createAttackSequence(
    attacker: BattlePokemonData,
    defender: BattlePokemonData,
    move: any,
    damageResult: any,
    defenderFainted: boolean,
    context: BattleContext
  ): BattleSequence {
    const events: any[] = [];
    let currentDelay = 0;
    
    // Messages d'attaque
    const attackMessages = createAttackMessages(
      attacker.name,
      move.name,
      damageResult.effectiveness,
      damageResult.critical,
      attacker.pokemonId !== context.currentPlayer
    );
    
    attackMessages.forEach(msg => {
      events.push({
        eventId: `attack_msg_${events.length}`,
        type: 'message',
        timestamp: Date.now(),
        data: { messageId: msg.id, variables: msg.variables },
        message: msg.template,
        delay: currentDelay
      });
      currentDelay += msg.timing;
    });
    
    // Animation et dégâts
    if (damageResult.finalDamage > 0) {
      events.push({
        eventId: 'damage_event',
        type: 'damage',
        timestamp: Date.now(),
        targetId: defender.pokemonId,
        data: {
          damage: damageResult.finalDamage,
          currentHp: defender.currentHp - damageResult.finalDamage,
          effectiveness: damageResult.effectiveness
        },
        delay: currentDelay
      });
      currentDelay += BATTLE_TIMINGS.DAMAGE_ANIMATION;
    }
    
    // K.O. si nécessaire
    if (defenderFainted) {
      const faintMessage = createBattleMessage('MSG_POKEMON_FAINTED', {
        pokemon: defender.name
      });
      
      if (faintMessage) {
        events.push({
          eventId: 'faint_msg',
          type: 'message',
          timestamp: Date.now(),
          data: { messageId: faintMessage.id, variables: faintMessage.variables },
          message: faintMessage.template,
          delay: currentDelay
        });
      }
    }
    
    return {
      sequenceId: `attack_${Date.now()}`,
      events,
      totalDuration: currentDelay,
      priority: 80
    };
  }
  
  private createCaptureSequence(
    pokemon: BattlePokemonData,
    ballType: string,
    result: any,
    context: BattleContext
  ): BattleSequence {
    const events: any[] = [];
    let currentDelay = 0;
    
    // Messages de capture
    const captureMessages = BattleMessageHandler.generateCaptureSequence(
      'Dresseur',
      ballType,
      pokemon.name,
      result.shakeCount,
      result.success,
      result.criticalCapture
    );
    
    captureMessages.forEach(msg => {
      events.push({
        eventId: `capture_msg_${events.length}`,
        type: 'message',
        timestamp: Date.now(),
        data: { messageId: msg.id, variables: msg.variables },
        message: msg.template,
        delay: currentDelay
      });
      currentDelay += msg.timing;
    });
    
    return {
      sequenceId: `capture_${Date.now()}`,
      events,
      totalDuration: currentDelay,
      priority: 90
    };
  }
  
  private createSwitchSequence(
    oldPokemon: BattlePokemonData | null,
    newPokemon: BattlePokemonData,
    context: BattleContext
  ): BattleSequence {
    const events: any[] = [];
    let currentDelay = 0;
    
    // Messages de changement
    const switchMessages = BattleMessageHandler.generateSwitchSequence(
      'Dresseur',
      oldPokemon?.name || 'Pokémon',
      newPokemon.name,
      true
    );
    
    switchMessages.forEach(msg => {
      events.push({
        eventId: `switch_msg_${events.length}`,
        type: 'message',
        timestamp: Date.now(),
        data: { messageId: msg.id, variables: msg.variables },
        message: msg.template,
        delay: currentDelay
      });
      currentDelay += msg.timing;
    });
    
    return {
      sequenceId: `switch_${Date.now()}`,
      events,
      totalDuration: currentDelay,
      priority: 75
    };
  }
  
  private createRunSuccessSequence(context: BattleContext): BattleSequence {
    const events: any[] = [];
    
    const runMessage = createBattleMessage('MSG_ESCAPED_SAFELY');
    if (runMessage) {
      events.push({
        eventId: 'run_success',
        type: 'message',
        timestamp: Date.now(),
        data: { messageId: runMessage.id, variables: runMessage.variables },
        message: runMessage.template,
        delay: 0
      });
      
      // Terminer le combat
      events.push({
        eventId: 'battle_end',
        type: 'battle_end',
        timestamp: Date.now(),
        data: { result: 'fled', reason: 'player_fled' },
        delay: BATTLE_TIMINGS.MESSAGE_DISPLAY
      });
    }
    
    return {
      sequenceId: `run_success_${Date.now()}`,
      events,
      totalDuration: BATTLE_TIMINGS.MESSAGE_DISPLAY + BATTLE_TIMINGS.BATTLE_END,
      priority: 85
    };
  }
  
  private createRunFailSequence(messageId: string): BattleSequence {
    const events: any[] = [];
    
    const failMessage = createBattleMessage(messageId);
    if (failMessage) {
      events.push({
        eventId: 'run_fail',
        type: 'message',
        timestamp: Date.now(),
        data: { messageId: failMessage.id, variables: failMessage.variables },
        message: failMessage.template,
        delay: 0
      });
    }
    
    return {
      sequenceId: `run_fail_${Date.now()}`,
      events,
      totalDuration: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 70
    };
  }
  
  private createMissSequence(attacker: BattlePokemonData, move: any): BattleSequence {
    const events: any[] = [];
    
    const missMessage = createBattleMessage('MSG_MOVE_MISSED', {
      pokemon: attacker.name
    });
    
    if (missMessage) {
      events.push({
        eventId: 'move_miss',
        type: 'message',
        timestamp: Date.now(),
        data: { messageId: missMessage.id, variables: missMessage.variables },
        message: missMessage.template,
        delay: 0
      });
    }
    
    return {
      sequenceId: `miss_${Date.now()}`,
      events,
      totalDuration: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 60
    };
  }
  
  private createMoveBlockedSequence(pokemon: BattlePokemonData, move: any): BattleSequence {
    const events: any[] = [];
    let messageId = 'MSG_MOVE_FAILED';
    
    // Messages spécifiques selon le statut
    if (pokemon.statusCondition === 'sleep') {
      messageId = 'MSG_POKEMON_ASLEEP';
    } else if (pokemon.statusCondition === 'paralysis') {
      messageId = 'MSG_PARALYSIS_PREVENTS';
    } else if (pokemon.statusCondition === 'freeze') {
      messageId = 'MSG_POKEMON_FROZEN';
    }
    
    const blockedMessage = createBattleMessage(messageId, {
      pokemon: pokemon.name
    });
    
    if (blockedMessage) {
      events.push({
        eventId: 'move_blocked',
        type: 'message',
        timestamp: Date.now(),
        data: { messageId: blockedMessage.id, variables: blockedMessage.variables },
        message: blockedMessage.template,
        delay: 0
      });
    }
    
    return {
      sequenceId: `blocked_${Date.now()}`,
      events,
      totalDuration: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 65
    };
  }
  
  private createErrorSequence(messageId: string): BattleSequence {
    const events: any[] = [];
    
    const errorMessage = createBattleMessage(messageId);
    if (errorMessage) {
      events.push({
        eventId: 'error_msg',
        type: 'message',
        timestamp: Date.now(),
        data: { messageId: errorMessage.id, variables: errorMessage.variables },
        message: errorMessage.template,
        delay: 0
      });
    }
    
    return {
      sequenceId: `error_${Date.now()}`,
      events,
      totalDuration: BATTLE_TIMINGS.MESSAGE_DISPLAY,
      priority: 50
    };
  }
  
  private createEmptySequence(): BattleSequence {
    return {
      sequenceId: `empty_${Date.now()}`,
      events: [],
      totalDuration: 0,
      priority: 0
    };
  }
  
  // === TRAITEMENT OBJETS SPÉCIALISÉS ===
  
  private processHealingItem(item: any, targetId: string | undefined, context: BattleContext): BattleSequence {
    const events: any[] = [];
    let currentDelay = 0;
    
    // Message d'utilisation
    const useMessage = createBattleMessage('MSG_TRAINER_USES_ITEM', {
      trainer: 'Dresseur',
      item: item.name
    });
    
    if (useMessage) {
      events.push({
        eventId: 'item_use',
        type: 'message',
        timestamp: Date.now(),
        data: { messageId: useMessage.id, variables: useMessage.variables },
        message: useMessage.template,
        delay: currentDelay
      });
      currentDelay += useMessage.timing;
    }
    
    // Effet de soin
    const healAmount = this.calculateHealAmount(item);
    const healMessage = createBattleMessage('MSG_POTION_USED', {
      pokemon: 'Pokémon', // TODO: Nom du Pokémon cible
      hp: healAmount.toString()
    });
    
    if (healMessage) {
      events.push({
        eventId: 'heal_effect',
        type: 'heal',
        timestamp: Date.now(),
        targetId: targetId,
        data: {
          healing: healAmount,
          currentHp: 50, // TODO: HP actuel
          maxHp: 100 // TODO: HP max
        },
        delay: currentDelay
      });
      
      events.push({
        eventId: 'heal_msg',
        type: 'message',
        timestamp: Date.now(),
        data: { messageId: healMessage.id, variables: healMessage.variables },
        message: healMessage.template,
        delay: currentDelay
      });
      currentDelay += healMessage.timing;
    }
    
    return {
      sequenceId: `healing_${Date.now()}`,
      events,
      totalDuration: currentDelay,
      priority: 70
    };
  }
  
  private processPokeball(item: any, context: BattleContext): BattleSequence {
    // Rediriger vers la capture
    return this.processCaptureAction({
      actionId: `capture_${Date.now()}`,
      playerId: context.currentPlayer,
      type: 'capture',
      data: { ballType: item.id },
      priority: 0,
      speed: 0,
      timestamp: Date.now()
    }, context);
  }
  
  private processStatusItem(item: any, targetId: string | undefined, context: BattleContext): BattleSequence {
    const events: any[] = [];
    let currentDelay = 0;
    
    // Message d'utilisation
    const useMessage = createBattleMessage('MSG_TRAINER_USES_ITEM', {
      trainer: 'Dresseur',
      item: item.name
    });
    
    if (useMessage) {
      events.push({
        eventId: 'status_item_use',
        type: 'message',
        timestamp: Date.now(),
        data: { messageId: useMessage.id, variables: useMessage.variables },
        message: useMessage.template,
        delay: currentDelay
      });
      currentDelay += useMessage.timing;
    }
    
    // Effet de guérison de statut
    events.push({
      eventId: 'status_heal',
      type: 'status',
      timestamp: Date.now(),
      targetId: targetId,
      data: {
        status: 'normal',
        applied: true
      },
      delay: currentDelay
    });
    
    return {
      sequenceId: `status_item_${Date.now()}`,
      events,
      totalDuration: currentDelay + BATTLE_TIMINGS.STATUS_CHANGE,
      priority: 70
    };
  }
  
  private calculateHealAmount(item: any): number {
    switch (item.effect) {
      case 'heal_20': return 20;
      case 'heal_50': return 50;
      case 'heal_full': return 9999; // HP complets
      case 'heal_percent_50': return -50; // 50% (négatif = pourcentage)
      default: return 20;
    }
  }
  
  // === MÉTHODES UTILITAIRES ===
  
  /**
   * Nettoie le cache des moves
   */
  clearMoveCache(): void {
    this.moveDataCache.clear();
    console.log('🧹 [SoloBattleHandler] Cache moves nettoyé');
  }
  
  /**
   * Obtient les statistiques du handler
   */
  getStats(): any {
    return {
      moveCacheSize: this.moveDataCache.size,
      supportedBattleTypes: ['wild', 'trainer', 'gym', 'elite4'],
      aiPersonalities: Object.keys(this.aiPersonalities),
      version: '1.0.0'
    };
  }
  
  /**
   * Debug d'une décision IA
   */
  debugAIDecision(
    aiPokemon: BattlePokemonData,
    playerPokemon: BattlePokemonData,
    context: BattleContext
  ): void {
    console.log('🔍 [SoloBattleHandler] === DEBUG DÉCISION IA ===');
    console.log(`🤖 IA: ${aiPokemon.name} (${aiPokemon.currentHp}/${aiPokemon.maxHp} HP)`);
    console.log(`👤 Joueur: ${playerPokemon.name} (${playerPokemon.currentHp}/${playerPokemon.maxHp} HP)`);
    console.log(`⚔️ Type: ${context.battleType}`);
    
    const personality = this.getAIPersonality(context);
    console.log(`🎭 Personnalité: ${personality.name}`);
    console.log(`   Attaque: ${personality.attackChance * 100}%`);
    console.log(`   Change: ${personality.switchChance * 100}%`);
    console.log(`   Objet: ${personality.itemChance * 100}%`);
    
    // Évaluer chaque move
    console.log(`📋 Évaluation des attaques:`);
    aiPokemon.moves.forEach(move => {
      const score = this.evaluateMoveEffectiveness(move, aiPokemon, playerPokemon);
      console.log(`   ${move.name}: ${score.toFixed(2)} points`);
    });
  }
  
  /**
   * Simule un combat complet pour les tests
   */
  async simulateBattle(context: BattleContext): Promise<string> {
    console.log('🎮 [SoloBattleHandler] === SIMULATION COMBAT ===');
    
    let turnCount = 0;
    const maxTurns = 20;
    
    while (turnCount < maxTurns && context.phase === 'battle') {
      console.log(`--- Tour ${turnCount + 1} ---`);
      
      // Tour joueur (simulation)
      const playerAction: BattleAction = {
        actionId: `sim_${turnCount}`,
        playerId: context.currentPlayer,
        type: 'attack',
        data: { moveId: 'tackle' },
        priority: 0,
        speed: 50,
        timestamp: Date.now()
      };
      
      await this.processAction(playerAction, context);
      
      // Tour IA
      if (this.shouldPlayAITurn(context)) {
        const aiAction = await this.generateAIAction(context);
        await this.processAction(aiAction, context);
      }
      
      turnCount++;
      
      // Vérifier fin de combat
      const aiPokemon = this.getAIPokemon(context);
      const playerPokemon = this.getPlayerPokemon(context);
      
      if (!aiPokemon || aiPokemon.currentHp <= 0) {
        return 'victory';
      }
      
      if (!playerPokemon || playerPokemon.currentHp <= 0) {
        return 'defeat';
      }
    }
    
    return 'timeout';
  }
}

// === TESTS ET EXPORTS ===

/**
 * Fonction de test pour le SoloBattleHandler
 */
export function testSoloBattleHandler(): void {
  console.log('🧪 [SoloBattleHandler] === TESTS ===');
  
  const handler = new SoloBattleHandler();
  
  // Test canHandle
  const wildContext: Partial<BattleContext> = { battleType: 'wild' };
  const trainerContext: Partial<BattleContext> = { battleType: 'trainer' };
  const pvpContext: Partial<BattleContext> = { battleType: 'pvp' };
  
  console.log(`✅ Wild: ${handler.canHandle(wildContext as BattleContext)}`);
  console.log(`✅ Trainer: ${handler.canHandle(trainerContext as BattleContext)}`);
  console.log(`❌ PvP: ${handler.canHandle(pvpContext as BattleContext)}`);
  
  // Test stats
  const stats = handler.getStats();
  console.log(`📊 Stats:`, stats);
  
  console.log('✅ [SoloBattleHandler] Tests terminés');
}

// Exécuter les tests en mode développement
if (process.env.NODE_ENV === 'development') {
  testSoloBattleHandler();
}

export default SoloBattleHandler;
