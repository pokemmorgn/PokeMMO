// server/src/battle/modules/BattleEndManager.ts
// ÉTAPE 2.5 : Gestion de fin de combat et sauvegarde

import { BattleGameState, BattleResult, Pokemon } from '../types/BattleTypes';
import { OwnedPokemon } from '../../models/OwnedPokemon';

/**
 * BATTLE END MANAGER - Gestion de fin de combat
 * 
 * Responsabilités :
 * - Sauvegarder les HP après combat
 * - Gérer l'expérience (étape future)
 * - Gérer les récompenses (étape future)
 * - Nettoyer l'état de combat
 */
export class BattleEndManager {
  
  private gameState: BattleGameState | null = null;
  
  constructor() {
    console.log('🏁 [BattleEndManager] Initialisé');
  }
  
  // === INITIALISATION ===
  
  /**
   * Initialise avec l'état du jeu
   */
  initialize(gameState: BattleGameState): void {
    this.gameState = gameState;
    console.log('✅ [BattleEndManager] Configuré pour le combat');
  }
  
  // === SAUVEGARDE PRINCIPALE ===
  
  /**
   * Sauvegarde l'état des Pokémon après combat
   */
  async savePokemonAfterBattle(): Promise<BattleResult> {
    console.log('💾 [BattleEndManager] Sauvegarde des Pokémon après combat...');
    
    if (!this.gameState) {
      return this.createErrorResult('BattleEndManager non initialisé');
    }
    
    try {
      const savePromises: Promise<any>[] = [];
      const events: string[] = [];
      
      // Sauvegarder le Pokémon du joueur 1 (jamais wild)
      if (this.gameState.player1.pokemon && !this.gameState.player1.pokemon.isWild) {
        const savePromise = this.savePokemonData(
          this.gameState.player1.pokemon,
          this.gameState.player1.sessionId
        );
        savePromises.push(savePromise);
        events.push(`${this.gameState.player1.pokemon.name} sauvegardé`);
      }
      
      // Sauvegarder le Pokémon du joueur 2 (seulement si pas wild)
      if (this.gameState.player2.pokemon && !this.gameState.player2.pokemon.isWild) {
        const savePromise = this.savePokemonData(
          this.gameState.player2.pokemon,
          this.gameState.player2.sessionId
        );
        savePromises.push(savePromise);
        events.push(`${this.gameState.player2.pokemon.name} sauvegardé`);
      }
      
      // Attendre toutes les sauvegardes
      await Promise.all(savePromises);
      
      console.log(`✅ [BattleEndManager] ${savePromises.length} Pokémon sauvegardés`);
      
      return {
        success: true,
        gameState: this.gameState,
        events: events,
        data: {
          pokemonSaved: savePromises.length
        }
      };
      
    } catch (error) {
      console.error(`❌ [BattleEndManager] Erreur sauvegarde:`, error);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur sauvegarde'
      );
    }
  }
  
  // === SAUVEGARDE INDIVIDUELLE ===
  
  /**
   * Sauvegarde un Pokémon spécifique
   */
  private async savePokemonData(pokemon: Pokemon, ownerSessionId: string): Promise<void> {
    console.log(`💾 [BattleEndManager] Sauvegarde ${pokemon.name} (HP: ${pokemon.currentHp}/${pokemon.maxHp})`);
    
    try {
      // Trouver le Pokémon dans la base de données via son combatId ou autre identifiant
      const ownedPokemon = await this.findOwnedPokemon(pokemon, ownerSessionId);
      
      if (!ownedPokemon) {
        console.warn(`⚠️ [BattleEndManager] Pokémon ${pokemon.name} non trouvé en base`);
        return;
      }
      
      // Mettre à jour les données de combat
      ownedPokemon.currentHp = pokemon.currentHp;
      ownedPokemon.status = pokemon.status as any;
      
      // Mettre à jour statusTurns seulement si défini
      if (pokemon.status && pokemon.status !== 'normal') {
        // statusTurns peut ne pas être défini dans l'interface Pokemon
        const statusTurns = (pokemon as any).statusTurns;
        if (statusTurns !== undefined) {
          ownedPokemon.statusTurns = statusTurns;
        }
      } else {
        ownedPokemon.statusTurns = undefined;
      }
      
      // Mettre à jour les PP des attaques (pour plus tard)
      // TODO: Synchroniser les PP des moves
      
      // Sauvegarder
      await ownedPokemon.save();
      
      console.log(`✅ [BattleEndManager] ${pokemon.name} sauvegardé (HP: ${pokemon.currentHp})`);
      
    } catch (error) {
      console.error(`❌ [BattleEndManager] Erreur sauvegarde ${pokemon.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Trouve le Pokémon correspondant en base de données
   */
  private async findOwnedPokemon(pokemon: Pokemon, ownerSessionId: string): Promise<any> {
    // Plusieurs stratégies pour trouver le bon Pokémon
    
    // Stratégie 1: Par combatId si disponible et unique
    if (pokemon.combatId) {
      let found = await OwnedPokemon.findOne({ 
        combatId: pokemon.combatId,
        owner: ownerSessionId 
      });
      if (found) return found;
    }
    
    // Stratégie 2: Par pokemonId + owner + isInTeam (pour l'équipe active)
    const teamPokemon = await OwnedPokemon.findOne({
      pokemonId: pokemon.id,
      owner: ownerSessionId,
      isInTeam: true,
      level: pokemon.level // Critère supplémentaire pour éviter confusion
    });
    
    if (teamPokemon) return teamPokemon;
    
    // Stratégie 3: Par tous les critères disponibles (dernier recours)
    return await OwnedPokemon.findOne({
      pokemonId: pokemon.id,
      owner: ownerSessionId,
      level: pokemon.level,
      maxHp: pokemon.maxHp
    });
  }
  
  // === GESTION D'EXPÉRIENCE (ÉTAPE FUTURE) ===
  
  /**
   * Donne de l'expérience au Pokémon vainqueur
   */
  async giveExperience(winnerPokemon: Pokemon, loserPokemon: Pokemon): Promise<number> {
    console.log(`🌟 [BattleEndManager] Expérience pas encore implémentée`);
    
    // TODO: Implémenter le calcul d'expérience
    // - Formule Pokémon standard
    // - Mise à jour du niveau
    // - Évolution potentielle
    
    return 0;
  }
  
  // === RÉCOMPENSES (ÉTAPE FUTURE) ===
  
  /**
   * Donne les récompenses de combat
   */
  async giveRewards(winner: 'player1' | 'player2'): Promise<any> {
    console.log(`🎁 [BattleEndManager] Récompenses pas encore implémentées`);
    
    // TODO: Implémenter les récompenses
    // - Argent gagné
    // - Objets trouvés
    // - Points d'expérience de dresseur
    
    return null;
  }
  
  // === NETTOYAGE ===
  
  /**
   * Nettoie les données temporaires de combat
   */
  cleanupBattleData(): void {
    console.log(`🧹 [BattleEndManager] Nettoyage des données temporaires`);
    
    // TODO: Nettoyer les données temporaires
    // - Supprimer les identifiants de combat temporaires
    // - Nettoyer les caches
    // - Libérer les ressources
  }
  
  // === MÉTHODES UTILITAIRES ===
  
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
   * Vérifie si le manager est prêt
   */
  isReady(): boolean {
    return this.gameState !== null;
  }
  
  /**
   * Reset pour un nouveau combat
   */
  reset(): void {
    this.gameState = null;
    console.log('🔄 [BattleEndManager] Reset effectué');
  }
  
  /**
   * Obtient des statistiques sur la sauvegarde
   */
  getStats(): any {
    return {
      version: 'basic_v1',
      features: ['hp_save', 'status_save'],
      ready: this.isReady(),
      gameState: this.gameState ? 'loaded' : 'empty'
    };
  }
}

export default BattleEndManager;
