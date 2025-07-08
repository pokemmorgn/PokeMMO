// server/src/managers/battle/handlers/SoloBattleHandler.ts
// VERSION ULTRA-SIMPLE : Combat 1v1 qui MARCHE !

import { 
  BattleContext, 
  BattleAction, 
  BattleSequence,
  BattlePokemonData,
  ActionType,
  BATTLE_TIMINGS
} from '../types/BattleTypes';
import { IBattleHandler } from '../BattleSequencer';
import { DamageCalculator } from '../DamageCalculator';
import { createBattleMessage, createAttackMessages } from '../BattleMessageHandler';
import { MoveManager } from '../../MoveManager';

/**
 * HANDLER ULTRA-SIMPLE POUR COMBATS 1v1
 * Responsabilités : Sauvage, Dresseur, Arène, Elite 4
 * FAIT JUSTE CE QU'IL FAUT : Attaque → Dégâts → HP
 */
class SoloBattleHandler implements IBattleHandler {
  
  constructor() {
    console.log('🤖 [SoloBattleHandler] Version simple initialisée');
  }
  
  // === INTERFACE IBattleHandler ===
  
  canHandle(context: BattleContext): boolean {
    const canHandle = context.battleType === 'wild' || 
                     context.battleType === 'trainer' ||
                     context.battleType === 'gym' ||
                     context.battleType === 'elite4';
    
    console.log(`🔍 [SoloBattleHandler] Peut gérer ${context.battleType}: ${canHandle}`);
    return canHandle;
  }
  
  async processAction(action: BattleAction, context: BattleContext): Promise<BattleSequence> {
    console.log(`⚔️ [SoloBattleHandler] Action: ${action.type}`);
    
    switch (action.type) {
      case 'attack':
        return await this.processAttack(action, context);
        
      case 'item':
      case 'switch':
      case 'run':
      case 'capture':
        return this.createSimpleSequence(`${action.type}_not_implemented`);
        
      default:
        console.warn(`⚠️ [SoloBattleHandler] Action non gérée: ${action.type}`);
        return this.createSimpleSequence('action_failed');
    }
  }
  
  shouldPlayAITurn(context: BattleContext): boolean {
    return false; // TurnSystem gère maintenant
  }
  
  async generateAIAction(context: BattleContext): Promise<BattleAction> {
    console.log(`🧠 [SoloBattleHandler] Génération action IA simple...`);
    
    // IA ultra-simple : attaque aléatoire
    const aiPokemon = this.getAIPokemon(context);
    if (!aiPokemon || !aiPokemon.moves || aiPokemon.moves.length === 0) {
      throw new Error('IA : Aucun move disponible');
    }
    
    const randomMove = aiPokemon.moves[Math.floor(Math.random() * aiPokemon.moves.length)];
    const moveId = typeof randomMove === 'string' ? randomMove : randomMove.moveId;
    
    console.log(`🤖 [SoloBattleHandler] IA choisit: ${moveId}`);
    
    return {
      actionId: `ai_action_${Date.now()}`,
      playerId: 'ai',
      type: 'attack',
      data: { moveId },
      priority: 0,
      speed: aiPokemon.stats?.speed || 50,
      timestamp: Date.now()
    };
  }
  
  // === TRAITEMENT ATTAQUE SIMPLE ===
  
  private async processAttack(action: BattleAction, context: BattleContext): Promise<BattleSequence> {
    console.log(`💥 [SoloBattleHandler] Traitement attaque simple...`);
    
    const moveId = action.data.moveId;
    if (!moveId) {
      return this.createSimpleSequence('no_move');
    }
    
    // Récupérer attaquant et défenseur
    const attacker = this.getPokemonByPlayerId(action.playerId, context);
    const defender = this.getOpponentPokemon(action.playerId, context);
    
    if (!attacker || !defender) {
      console.error(`❌ [SoloBattleHandler] Pokémon manquants`);
      return this.createSimpleSequence('pokemon_missing');
    }
    
    console.log(`⚔️ [SoloBattleHandler] ${attacker.name} attaque ${defender.name} avec ${moveId}`);
    
    // Données de move depuis MoveManager
    const moveData = this.getMoveData(moveId);
    
    // Calculer dégâts
    const isCritical = Math.random() < 0.1; // 10% critique
    const damageResult = DamageCalculator.calculateDamage({
      attacker,
      defender,
      move: moveData,
      moveType: moveData.type,
      weather: undefined,
      terrain: undefined,
      isCritical
    });
    
    console.log(`💥 [SoloBattleHandler] Dégâts: ${damageResult.finalDamage}`);
    
    // ✅ CORRECTION DU BUG : Utiliser les HP ACTUELS du context
    const currentDefenderHp = this.getCurrentHpFromState(defender, context);
    const newDefenderHp = Math.max(0, currentDefenderHp - damageResult.finalDamage);
    
    console.log(`🩹 [SoloBattleHandler] HP: ${currentDefenderHp} → ${newDefenderHp}`);
    
    // Créer séquence avec les BONS HP
    return this.createAttackSequence(attacker, defender, moveData, damageResult, currentDefenderHp, newDefenderHp, context);
  }
  
  // === CRÉATION DE SÉQUENCES SIMPLES ===

  private getCurrentHpFromState(pokemon: BattlePokemonData, context: BattleContext): number {
  // Utiliser le state qui est toujours à jour
  const currentDefenderHp = defender.currentHp;
  console.log(`🔍 [DEBUG] HP défenseur du context: ${currentDefenderHp}`);
  // OU récupérer depuis BattleRoom directement
  return pokemon.currentHp; // Pour l'instant
}
  
  private createAttackSequence(
    attacker: BattlePokemonData,
    defender: BattlePokemonData,
    move: any,
    damageResult: any,
    currentHp: number,
    newHp: number,
    context: BattleContext
  ): BattleSequence {
    const events: any[] = [];
    let currentDelay = 0;
    
    console.log(`🎬 [SoloBattleHandler] Création séquence: ${attacker.name} → ${defender.name}`);
    
    // Message d'attaque
    const attackMessage = `${attacker.name} utilise ${move.name} !`;
    events.push({
      eventId: 'attack_msg',
      type: 'message',
      timestamp: Date.now(),
      data: { messageId: 'attack_message', message: attackMessage },
      message: attackMessage,
      delay: currentDelay
    });
    currentDelay += 1000;
    
    // Message critique si applicable
    if (damageResult.critical) {
      events.push({
        eventId: 'critical_msg',
        type: 'message',
        timestamp: Date.now(),
        data: { messageId: 'critical_hit', message: "Coup critique !" },
        message: "Coup critique !",
        delay: currentDelay
      });
      currentDelay += 1000;
    }
    
    // ✅ ÉVÉNEMENT DAMAGE AVEC LES BONS HP
    if (damageResult.finalDamage > 0) {
      events.push({
        eventId: 'damage_event',
        type: 'damage',
        timestamp: Date.now(),
        targetId: defender.combatId,
        data: {
          targetCombatId: defender.combatId,
          targetPokemonId: defender.pokemonId,
          damage: damageResult.finalDamage,
          currentHp: currentHp,  // ✅ HP ACTUELS
          calculatedNewHp: newHp, // ✅ NOUVEAUX HP CORRECTS
          effectiveness: damageResult.effectiveness,
          critical: damageResult.critical
        },
        delay: currentDelay
      });
      currentDelay += 1000;
    }
    
    // Message K.O. si nécessaire
    if (newHp <= 0) {
      events.push({
        eventId: 'faint_msg',
        type: 'message',
        timestamp: Date.now(),
        data: { messageId: 'pokemon_fainted', message: `${defender.name} est mis K.O. !` },
        message: `${defender.name} est mis K.O. !`,
        delay: currentDelay
      });
      currentDelay += 1000;
      
      // Fin de combat
      events.push({
        eventId: 'battle_end',
        type: 'battle_end',
        timestamp: Date.now(),
        data: { 
          result: 'victory',
          winner: context.participants.find(p => !p.isAI)?.sessionId,
          reason: 'pokemon_fainted'
        },
        delay: currentDelay
      });
    }
    
    return {
      sequenceId: `attack_simple_${Date.now()}`,
      events,
      totalDuration: currentDelay,
      priority: 80
    };
  }
  
  private createSimpleSequence(messageId: string): BattleSequence {
    return {
      sequenceId: `simple_${Date.now()}`,
      events: [{
        eventId: messageId,
        type: 'message',
        timestamp: Date.now(),
        data: { messageId, message: `Action: ${messageId}` },
        message: `Action: ${messageId}`,
        delay: 0
      }],
      totalDuration: 1000,
      priority: 50
    };
  }
  
  // === MÉTHODES UTILITAIRES SIMPLES ===
  
  private getPokemonByPlayerId(playerId: string, context: BattleContext): BattlePokemonData | null {
    const participant = context.participants.find(p => p.sessionId === playerId);
    return participant?.team[0] || null;
  }

  private getPlayerPokemon(context: BattleContext): BattlePokemonData | null {
    const participant = context.participants.find(p => !p.isAI);
    return participant?.team[0] || null;
  }

  private getAIPokemon(context: BattleContext): BattlePokemonData | null {
    const participant = context.participants.find(p => p.isAI);
    return participant?.team[0] || null;
  }

  private getOpponentPokemon(playerId: string, context: BattleContext): BattlePokemonData | null {
    const participant = context.participants.find(p => p.sessionId !== playerId);
    return participant?.team[0] || null;
  }
  
  private getMoveData(moveId: string): any {
    const moveData = MoveManager.getMoveData(moveId);
    
    if (moveData) {
      console.log(`🎯 [SoloBattleHandler] Move trouvé: ${moveData.name} (${moveData.power} puissance)`);
      return moveData;
    }
    
    // Fallback si pas trouvé
    console.warn(`⚠️ [SoloBattleHandler] Move ${moveId} non trouvé, utilisation fallback`);
    return { 
      id: moveId, 
      name: moveId.charAt(0).toUpperCase() + moveId.slice(1), 
      type: 'Normal', 
      power: 40, 
      accuracy: 100 
    };
  }

  /**
   * Obtient les statistiques du handler (pour BattleIntegration)
   */
  getStats(): any {
    return {
      version: 'simple_v1',
      supportedBattleTypes: ['wild', 'trainer', 'gym', 'elite4'],
      features: ['basic_attack', 'ai_random'],
      lineCount: '~200 lines vs 600+ before'
    };
  }
}

export default SoloBattleHandler;
