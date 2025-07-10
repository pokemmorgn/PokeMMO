// server/src/services/PokemonMoveService.ts
// SERVICE CENTRALISÉ POUR LA GESTION DES ATTAQUES ET PP

import { MoveManager } from '../managers/MoveManager';
import { IOwnedPokemon } from '../models/OwnedPokemon';

export interface MoveWithData {
  moveId: string;
  name: string;
  currentPp: number;
  maxPp: number;
  power: number;
  accuracy: number;
  type: string;
  category: 'Physical' | 'Special' | 'Status';
  description: string;
  disabled: boolean;
}

export interface PPConsumptionResult {
  success: boolean;
  newPP: number;
  maxPP: number;
  moveExhausted: boolean;
  allMovesExhausted: boolean;
}

export class PokemonMoveService {
  
  /**
   * Initialise les PP corrects pour un Pokémon (nouveaux ou modifiés)
   */
  static async initializePP(pokemon: IOwnedPokemon): Promise<void> {
    console.log(`🔧 [PokemonMoveService] Initialisation PP pour ${pokemon.moves.length} attaques`);
    
    await MoveManager.initialize();
    
    for (const move of pokemon.moves) {
      const moveData = MoveManager.getMoveData(move.moveId);
      
      if (!moveData) {
        console.warn(`⚠️ [PokemonMoveService] Attaque ${move.moveId} introuvable`);
        // Valeur par défaut pour éviter les crashs
        move.maxPp = move.maxPp || 10;
        move.currentPp = Math.min(move.currentPp, move.maxPp);
        continue;
      }
      
      const correctMaxPP = moveData.pp;
      
      // Si nouveau Pokémon ou maxPP incorrect
      if (!move.maxPp || move.maxPp !== correctMaxPP) {
        const oldMaxPp = move.maxPp || correctMaxPP;
        const ppRatio = move.currentPp / oldMaxPp;
        
        move.maxPp = correctMaxPP;
        move.currentPp = Math.max(0, Math.floor(correctMaxPP * ppRatio));
        
        console.log(`✅ [PokemonMoveService] ${move.moveId}: ${move.currentPp}/${move.maxPp} PP`);
      }
    }
  }
  
  /**
   * Consomme PP pour une attaque ET sauvegarde immédiatement
   */
  static async consumePPAndSave(pokemon: IOwnedPokemon, moveId: string): Promise<PPConsumptionResult> {
    const result = this.consumePP(pokemon, moveId);
    
    if (result.success) {
      try {
        await pokemon.save();
        console.log(`💾 [PokemonMoveService] PP sauvegardé pour ${moveId}`);
      } catch (error) {
        console.error(`❌ [PokemonMoveService] Erreur sauvegarde PP:`, error);
        // Note: PP déjà modifié en mémoire, erreur critique
      }
    }
    
    return result;
  }
    const move = pokemon.moves.find(m => m.moveId === moveId);
    
    if (!move) {
      return {
        success: false,
        newPP: 0,
        maxPP: 0,
        moveExhausted: true,
        allMovesExhausted: !pokemon.moves.some(m => m.currentPp > 0)
      };
    }
    
    if (move.currentPp <= 0) {
      return {
        success: false,
        newPP: 0,
        maxPP: move.maxPp,
        moveExhausted: true,
        allMovesExhausted: !pokemon.moves.some(m => m.currentPp > 0)
      };
    }
    
    move.currentPp--;
    
    const moveExhausted = move.currentPp === 0;
    const allMovesExhausted = !pokemon.moves.some(m => m.currentPp > 0);
    
    console.log(`⚡ [PokemonMoveService] ${moveId}: ${move.currentPp}/${move.maxPp} PP`);
    
    return {
      success: true,
      newPP: move.currentPp,
      maxPP: move.maxPp,
      moveExhausted,
      allMovesExhausted
    };
  }
  
  /**
   * Vérifie si une attaque peut être utilisée
   */
  static canUseMove(pokemon: IOwnedPokemon, moveId: string): boolean {
    const move = pokemon.moves.find(m => m.moveId === moveId);
    return move ? move.currentPp > 0 : false;
  }
  
  /**
   * Vérifie si le Pokémon a des attaques utilisables
   */
  static hasUsableMoves(pokemon: IOwnedPokemon): boolean {
    return pokemon.moves.some(move => move.currentPp > 0);
  }
  
  /**
   * Retourne les attaques utilisables seulement
   */
  static getUsableMoves(pokemon: IOwnedPokemon): string[] {
    return pokemon.moves
      .filter(move => move.currentPp > 0)
      .map(move => move.moveId);
  }
  
  /**
   * Vérifie si le Pokémon doit utiliser Struggle
   */
  static shouldUseStruggle(pokemon: IOwnedPokemon): boolean {
    return !this.hasUsableMoves(pokemon);
  }
  
  /**
   * Restaure les PP ET sauvegarde immédiatement
   */
  static async restorePPAndSave(pokemon: IOwnedPokemon, moveId?: string): Promise<void> {
    this.restorePP(pokemon, moveId);
    
    try {
      await pokemon.save();
      console.log(`💾 [PokemonMoveService] Restauration PP sauvegardée`);
    } catch (error) {
      console.error(`❌ [PokemonMoveService] Erreur sauvegarde restauration:`, error);
    }
  }
    if (moveId) {
      const move = pokemon.moves.find(m => m.moveId === moveId);
      if (move) {
        const oldPp = move.currentPp;
        move.currentPp = move.maxPp;
        console.log(`💊 [PokemonMoveService] ${moveId}: ${oldPp} → ${move.currentPp} PP restauré`);
      }
    } else {
      // Restaurer toutes les attaques
      pokemon.moves.forEach(move => {
        const oldPp = move.currentPp;
        move.currentPp = move.maxPp;
        console.log(`💊 [PokemonMoveService] ${move.moveId}: ${oldPp} → ${move.currentPp} PP restauré`);
      });
    }
  }
  
  /**
   * Obtient les attaques avec toutes leurs données pour l'UI
   */
  static async getMovesWithData(pokemon: IOwnedPokemon): Promise<MoveWithData[]> {
    await MoveManager.initialize();
    
    const movesWithData: MoveWithData[] = [];
    
    for (const move of pokemon.moves) {
      const moveData = MoveManager.getMoveData(move.moveId);
      
      if (!moveData) {
        console.warn(`⚠️ [PokemonMoveService] Données manquantes pour ${move.moveId}`);
        continue;
      }
      
      movesWithData.push({
        moveId: move.moveId,
        name: moveData.name,
        currentPp: move.currentPp,
        maxPp: move.maxPp,
        power: moveData.power,
        accuracy: moveData.accuracy,
        type: moveData.type,
        category: moveData.category,
        description: moveData.description,
        disabled: move.currentPp <= 0
      });
    }
    
    return movesWithData;
  }
  
  /**
   * Valide la cohérence des PP d'un Pokémon
   */
  static async validatePP(pokemon: IOwnedPokemon): Promise<boolean> {
    await MoveManager.initialize();
    
    for (const move of pokemon.moves) {
      // Vérifier currentPP <= maxPP
      if (move.currentPp > move.maxPp) {
        console.error(`❌ [PokemonMoveService] ${move.moveId}: currentPP (${move.currentPp}) > maxPP (${move.maxPp})`);
        return false;
      }
      
      // Vérifier maxPP cohérent avec MoveManager
      const moveData = MoveManager.getMoveData(move.moveId);
      if (moveData && move.maxPp !== moveData.pp) {
        console.warn(`⚠️ [PokemonMoveService] ${move.moveId}: maxPP incohérent (${move.maxPp} vs ${moveData.pp})`);
      }
    }
    
    return true;
  }
  
  /**
   * Debug: affiche l'état des PP d'un Pokémon
   */
  static debugPP(pokemon: IOwnedPokemon): void {
    console.log(`🔍 [DEBUG] PP de ${pokemon.nickname || 'Pokémon'}:`);
    pokemon.moves.forEach(move => {
      const status = move.currentPp > 0 ? '✅' : '❌';
      console.log(`  ${status} ${move.moveId}: ${move.currentPp}/${move.maxPp} PP`);
    });
    console.log(`🎯 Peut combattre: ${this.hasUsableMoves(pokemon)}`);
    console.log(`⚔️ Doit utiliser Struggle: ${this.shouldUseStruggle(pokemon)}`);
  }
}
