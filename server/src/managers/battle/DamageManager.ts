// server/src/managers/battle/DamageManager.ts
// VERSION ULTRA-SIMPLE : Juste changer les HP, point !

import { BattleContext } from "./BattleEndManager";

export interface DamageResult {
  pokemonId: string;
  combatId: string;
  oldHp: number;
  newHp: number;
  damage: number;
  wasKnockedOut: boolean;
  targetPlayerId: string;
  attackerId: string;
  pokemonName: string;
}

/**
 * GESTIONNAIRE DE DÉGÂTS ULTRA-SIMPLE
 * Fait JUSTE ce qu'il faut : mettre à jour les HP !
 */
export class DamageManager {
  
  /**
   * ✅ MÉTHODE PRINCIPALE : Met à jour les HP d'un Pokémon
   */
  static updatePokemonHP(
    combatId: string,
    newHp: number,
    battleState: any,
    battleContext: BattleContext,
    source: string = 'attack',
    attackerId?: string
  ): DamageResult | null {
    console.log(`🩹 [DamageManager] Mise à jour HP: ${combatId} → ${newHp}`);
    
    // 1. Trouver et mettre à jour dans le state
    const stateResult = this.updateInState(combatId, newHp, battleState);
    if (!stateResult) {
      console.error(`❌ [DamageManager] Pokémon ${combatId} non trouvé dans state`);
      return null;
    }
    
    // 2. Trouver et mettre à jour dans le context
    const contextResult = this.updateInContext(combatId, newHp, battleContext);
    if (!contextResult) {
      console.error(`❌ [DamageManager] Pokémon ${combatId} non trouvé dans context`);
      return null;
    }
    
    // 3. Créer le résultat
    const damage = Math.max(0, stateResult.oldHp - newHp);
    const wasKnockedOut = newHp <= 0;
    
    const result: DamageResult = {
      pokemonId: stateResult.pokemonId,
      combatId: combatId,
      oldHp: stateResult.oldHp,
      newHp: newHp,
      damage: damage,
      wasKnockedOut: wasKnockedOut,
      targetPlayerId: contextResult.playerId,
      attackerId: attackerId || 'unknown',
      pokemonName: stateResult.name
    };
    
    console.log(`✅ [DamageManager] ${result.pokemonName}: ${result.oldHp} → ${result.newHp} HP`);
    if (wasKnockedOut) {
      console.log(`💀 [DamageManager] ${result.pokemonName} mis K.O. !`);
    }
    
    return result;
  }
  
  /**
   * Met à jour HP dans le state
   */
  private static updateInState(combatId: string, newHp: number, battleState: any): any {
    // Player 1
    if (battleState.player1Pokemon?.combatId === combatId) {
      const oldHp = battleState.player1Pokemon.currentHp;
      battleState.player1Pokemon.currentHp = newHp;
      
      return {
        pokemonId: battleState.player1Pokemon.pokemonId,
        name: battleState.player1Pokemon.name,
        oldHp: oldHp
      };
    }
    
    // Player 2
    if (battleState.player2Pokemon?.combatId === combatId) {
      const oldHp = battleState.player2Pokemon.currentHp;
      battleState.player2Pokemon.currentHp = newHp;
      
      return {
        pokemonId: battleState.player2Pokemon.pokemonId,
        name: battleState.player2Pokemon.name,
        oldHp: oldHp
      };
    }
    
    return null;
  }
  
  /**
   * Met à jour HP dans le context
   */
  private static updateInContext(combatId: string, newHp: number, battleContext: BattleContext): any {
    for (const participant of battleContext.participants) {
      // Pokémon actif
      if (participant.activePokemon?.combatId === combatId) {
        participant.activePokemon.currentHp = newHp;
        return { playerId: participant.sessionId };
      }
      
      // Équipe complète
      for (const pokemon of participant.team) {
        if (pokemon.combatId === combatId) {
          pokemon.currentHp = newHp;
          return { playerId: participant.sessionId };
        }
      }
    }
    
    return null;
  }
  
  // === MÉTHODES UTILITAIRES SIMPLES ===
  
  /**
   * Initialise pour un nouveau combat (vide pour l'instant)
   */
  static initializeForBattle(playerIds: string[]): void {
    console.log(`🔄 [DamageManager] Initialisé (version simple)`);
  }
  
  /**
   * Synchronise avec le context (vide pour l'instant)
   */
  static syncStatisticsToContext(battleContext: BattleContext): void {
    console.log(`🔄 [DamageManager] Sync (version simple)`);
  }
  
  /**
   * Récupère les stats (vide pour l'instant)
   */
  static getTotalDamageDealt(playerId: string): number {
    return 0; // TODO: Plus tard
  }
  
  static getTotalDamageReceived(playerId: string): number {
    return 0; // TODO: Plus tard
  }
  
  static getPokemonKnockedOut(playerId: string): number {
    return 0; // TODO: Plus tard
  }
  
  /**
   * Nettoyage (vide pour l'instant)
   */
  static cleanup(): void {
    console.log(`🧹 [DamageManager] Nettoyé (version simple)`);
  }
}

export default DamageManager;

/*
🎯 AVANTAGES DE CETTE VERSION :

✅ ULTRA-SIMPLE : 100 lignes au lieu de 500
✅ FAIT LE TRAVAIL : Change les HP dans state ET context
✅ PAS DE BUGS : Plus de "récupère HP" bizarre
✅ MÊME INTERFACE : BattleRoom ne change pas
✅ ÉVOLUTIF : On ajoutera les stats plus tard

🔧 FONCTIONNEMENT :
1. updatePokemonHP(combatId, newHp, ...)
2. Trouve le Pokémon dans state → met à jour
3. Trouve le Pokémon dans context → met à jour  
4. Retourne DamageResult simple
5. FINI !
*/
