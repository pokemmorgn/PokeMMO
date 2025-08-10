// server/src/battle/modules/BattleEndManager.ts
// ÉTAPE 2.5 : Gestion de fin de combat et sauvegarde + 🆕 SYSTÈME XP INTÉGRÉ

import { BattleGameState, BattleResult, Pokemon } from '../types/BattleTypes';
import { OwnedPokemon } from '../../models/OwnedPokemon';
// 🆕 IMPORT DU SERVICE XP
import { givePlayerWildXP } from '../../services/ExperienceService';

/**
 * BATTLE END MANAGER - Gestion de fin de combat
 * 
 * Responsabilités :
 * - Sauvegarder les HP après combat
 * - 🆕 DONNER L'XP POUR COMBATS SAUVAGES
 * - Gérer l'expérience (étape future)
 * - Gérer les récompenses (étape future)
 * - Nettoyer l'état de combat
 */
export class BattleEndManager {
  
  private gameState: BattleGameState | null = null;
  
  constructor() {
    console.log('🏁 [BattleEndManager] Initialisé avec système XP');
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
   * Sauvegarde l'état des Pokémon après combat + 🆕 GAIN D'XP
   */
  async savePokemonAfterBattle(): Promise<BattleResult> {
    console.log('💾 [BattleEndManager] Sauvegarde des Pokémon après combat...');
    
    if (!this.gameState) {
      return this.createErrorResult('BattleEndManager non initialisé');
    }
    
    try {
      const savePromises: Promise<any>[] = [];
      const events: string[] = [];
      
      // 🔥 ÉTAPE 1 : SAUVEGARDER LES HP COMME AVANT
      
      // Sauvegarder le Pokémon du joueur 1 (jamais wild)
      if (this.gameState.player1.pokemon && !this.gameState.player1.pokemon.isWild) {
        const savePromise = this.savePokemonDataBySession(
          this.gameState.player1.pokemon,
          this.gameState.player1.sessionId
        );
        savePromises.push(savePromise);
        events.push(`${this.gameState.player1.pokemon.name} sauvegardé`);
      }
      
      // Sauvegarder le Pokémon du joueur 2 (seulement si pas wild)
      if (this.gameState.player2.pokemon && !this.gameState.player2.pokemon.isWild) {
        const savePromise = this.savePokemonDataBySession(
          this.gameState.player2.pokemon,
          this.gameState.player2.sessionId
        );
        savePromises.push(savePromise);
        events.push(`${this.gameState.player2.pokemon.name} sauvegardé`);
      }
      
      // Attendre toutes les sauvegardes HP
      await Promise.all(savePromises);
      
      console.log(`✅ [BattleEndManager] ${savePromises.length} Pokémon sauvegardés`);
      
      // 🆕 ÉTAPE 2 : GAIN D'XP POUR COMBATS SAUVAGES GAGNÉS
      let xpEvents: string[] = [];
      if (this.gameState.type === 'wild' && this.gameState.winner === 'player1') {
        console.log('🌟 [BattleEndManager] Combat sauvage gagné - Attribution XP...');
        xpEvents = await this.processWildBattleExperience();
      }
      
      // 🔥 COMBINER TOUS LES ÉVÉNEMENTS
      const allEvents = [...events, ...xpEvents];
      
      return {
        success: true,
        gameState: this.gameState,
        events: allEvents,
        data: {
          pokemonSaved: savePromises.length,
          xpAwarded: xpEvents.length > 0 // 🆕 Indicateur XP donné
        }
      };
      
    } catch (error) {
      console.error(`❌ [BattleEndManager] Erreur sauvegarde:`, error);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur sauvegarde'
      );
    }
  }
  
  // === 🆕 SYSTÈME XP POUR COMBATS SAUVAGES ===
  
  /**
   * 🆕 Traite l'expérience pour un combat sauvage gagné
   */
  private async processWildBattleExperience(): Promise<string[]> {
    if (!this.gameState) return [];
    
    const events: string[] = [];
    
    try {
      // 🎯 RÉCUPÉRER LES DONNÉES NÉCESSAIRES
      const playerPokemon = this.gameState.player1.pokemon;
      const wildPokemon = this.gameState.player2.pokemon;
      
      if (!playerPokemon || !wildPokemon) {
        console.warn('⚠️ [BattleEndManager] Données Pokémon manquantes pour XP');
        return [];
      }
      
      // 🎯 IDENTIFIER L'OWNER (userId directement depuis sessionId si c'est déjà l'userId)
      const ownerIdentifier = this.gameState.player1.sessionId;
      console.log(`🔍 [BattleEndManager] Recherche Pokémon avec owner: ${ownerIdentifier}`);
      
      // 🎯 ESSAYER RECHERCHE DIRECTE D'ABORD
      let ownedPokemon = await this.findOwnedPokemon(playerPokemon, ownerIdentifier);
      
      // 🎯 SI ÉCHEC, ESSAYER CONVERSION sessionId -> userId
      if (!ownedPokemon) {
        console.log(`🔄 [BattleEndManager] Recherche directe échouée, tentative conversion sessionId...`);
        ownedPokemon = await this.findOwnedPokemonBySession(playerPokemon, ownerIdentifier);
      }
      
      if (!ownedPokemon) {
        console.warn('⚠️ [BattleEndManager] OwnedPokemon introuvable - XP ignorée');
        return ['⚠️ Impossible d\'attribuer l\'expérience (Pokémon introuvable)'];
      }
      
      console.log(`✅ [BattleEndManager] OwnedPokemon trouvé: ${ownedPokemon.nickname || 'Pokemon'} (owner: ${ownedPokemon.owner})`);
      
      // 🎯 DONNÉES DU POKÉMON VAINCU
      const defeatedPokemonData = {
        pokemonId: wildPokemon.id,
        level: wildPokemon.level
      };
      
      console.log(`🌟 [BattleEndManager] Attribution XP: ${playerPokemon.name} vs ${wildPokemon.name} (niveau ${wildPokemon.level})`);
      
      // 🚀 APPEL DU SERVICE XP AVEC L'OWNEDPOKEMON DIRECTEMENT
      const xpSuccess = await givePlayerWildXP(
        ownedPokemon, // ← Passer l'objet entier au lieu de l'ID
        defeatedPokemonData
      );
      
      if (xpSuccess) {
        events.push(`🌟 ${playerPokemon.name} a gagné de l'expérience !`);
        console.log(`✅ [BattleEndManager] XP attribuée avec succès à ${playerPokemon.name}`);
      } else {
        events.push(`⚠️ Erreur lors de l'attribution d'expérience`);
        console.warn(`⚠️ [BattleEndManager] Échec attribution XP pour ${playerPokemon.name}`);
      }
      
    } catch (error) {
      console.error('❌ [BattleEndManager] Erreur traitement XP:', error);
      events.push(`❌ Erreur lors du calcul d'expérience`);
    }
    
    return events;
  }
  
  // === 🔥 MÉTHODES EXISTANTES PRÉSERVÉES ===
  
  /**
   * 🆕 Sauvegarde un Pokémon par sessionId (convertit en userId d'abord)
   */
  private async savePokemonDataBySession(pokemon: Pokemon, sessionId: string): Promise<void> {
    try {
      // 🎯 CONVERTIR sessionId en userId
      const { JWTManager } = require('../../managers/JWTManager');
      const jwtManager = JWTManager.getInstance();
      
      let userId = jwtManager.getUserId(sessionId);
      
      // 🆕 SI PAS DE MAPPING, ESSAYER AVEC LE PLAYERNAME
      if (!userId && this.gameState?.player1?.name) {
        console.log(`🔄 [BattleEndManager] Tentative getUserIdRobust pour sauvegarde avec playerName: ${this.gameState.player1.name}`);
        userId = await jwtManager.getUserIdRobust(sessionId, this.gameState.player1.name);
      }
      
      if (!userId) {
        console.warn(`⚠️ [BattleEndManager] Impossible de convertir sessionId ${sessionId} en userId pour sauvegarde`);
        return;
      }
      
      console.log(`✅ [BattleEndManager] Conversion sauvegarde: sessionId ${sessionId} -> userId ${userId}`);
      
      // 🎯 UTILISER LA LOGIQUE EXISTANTE AVEC LE BON userId
      await this.savePokemonData(pokemon, userId);
      
    } catch (error) {
      console.error(`❌ [BattleEndManager] Erreur sauvegarde par session:`, error);
      throw error;
    }
  }

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
   * 🆕 Trouve le Pokémon par sessionId (convertit en userId d'abord)
   */
  private async findOwnedPokemonBySession(pokemon: Pokemon, sessionId: string): Promise<any> {
    try {
      // 🎯 CONVERTIR sessionId en userId via JWTManager
      const { JWTManager } = require('../../managers/JWTManager');
      const jwtManager = JWTManager.getInstance();
      
      console.log(`🔍 [BattleEndManager] Debug sessionId: ${sessionId}`);
      
      let userId = jwtManager.getUserId(sessionId);
      
      // 🆕 SI PAS DE MAPPING, ESSAYER AVEC LE PLAYERNAME
      if (!userId && this.gameState?.player1?.name) {
        console.log(`🔄 [BattleEndManager] Tentative getUserIdRobust avec playerName: ${this.gameState.player1.name}`);
        userId = await jwtManager.getUserIdRobust(sessionId, this.gameState.player1.name);
      }
      
      if (!userId) {
        console.warn(`⚠️ [BattleEndManager] Impossible de convertir sessionId ${sessionId} en userId`);
        console.log(`🔍 [BattleEndManager] Debug JWTManager mappings:`);
        jwtManager.debugMappings();
        return null;
      }
      
      console.log(`✅ [BattleEndManager] Conversion réussie: sessionId ${sessionId} -> userId ${userId}`);
      
      // 🎯 UTILISER LA LOGIQUE EXISTANTE AVEC LE BON userId
      return await this.findOwnedPokemon(pokemon, userId);
      
    } catch (error) {
      console.error(`❌ [BattleEndManager] Erreur conversion sessionId:`, error);
      return null;
    }
  }

  /**
   * Trouve le Pokémon correspondant en base de données
   */
  private async findOwnedPokemon(pokemon: Pokemon, ownerSessionId: string): Promise<any> {
    console.log(`🔍 [BattleEndManager] === RECHERCHE POKÉMON DÉTAILLÉE ===`);
    console.log(`🎯 Pokémon recherché:`, {
      name: pokemon.name,
      id: pokemon.id,
      level: pokemon.level,
      combatId: pokemon.combatId,
      maxHp: pokemon.maxHp,
      isWild: pokemon.isWild
    });
    console.log(`👤 Owner: ${ownerSessionId}`);
    
    // Plusieurs stratégies pour trouver le bon Pokémon
    
    // Stratégie 1: Par combatId si disponible et unique
    if (pokemon.combatId) {
      console.log(`🔄 [BattleEndManager] Stratégie 1: Recherche par combatId ${pokemon.combatId}`);
      
      let found = await OwnedPokemon.findOne({ 
        combatId: pokemon.combatId,
        owner: ownerSessionId 
      });
      
      if (found) {
        console.log(`✅ [BattleEndManager] Trouvé par combatId:`, {
          id: found._id,
          nickname: found.nickname,
          pokemonId: found.pokemonId,
          level: found.level,
          owner: found.owner
        });
        return found;
      } else {
        console.log(`❌ [BattleEndManager] Pas trouvé par combatId`);
      }
    }
    
    // Stratégie 2: Par pokemonId + owner + isInTeam (pour l'équipe active)
    console.log(`🔄 [BattleEndManager] Stratégie 2: Recherche par équipe active`);
    
    const teamPokemon = await OwnedPokemon.findOne({
      pokemonId: pokemon.id,
      owner: ownerSessionId,
      isInTeam: true,
      level: pokemon.level // Critère supplémentaire pour éviter confusion
    });
    
    if (teamPokemon) {
      console.log(`✅ [BattleEndManager] Trouvé par équipe active:`, {
        id: teamPokemon._id,
        nickname: teamPokemon.nickname,
        pokemonId: teamPokemon.pokemonId,
        level: teamPokemon.level,
        owner: teamPokemon.owner,
        isInTeam: teamPokemon.isInTeam
      });
      return teamPokemon;
    } else {
      console.log(`❌ [BattleEndManager] Pas trouvé par équipe active`);
    }
    
    // Stratégie 3: Par tous les critères disponibles (dernier recours)
    console.log(`🔄 [BattleEndManager] Stratégie 3: Recherche par critères généraux`);
    
    const generalSearch = await OwnedPokemon.findOne({
      pokemonId: pokemon.id,
      owner: ownerSessionId,
      level: pokemon.level,
      maxHp: pokemon.maxHp
    });
    
    if (generalSearch) {
      console.log(`✅ [BattleEndManager] Trouvé par critères généraux:`, {
        id: generalSearch._id,
        nickname: generalSearch.nickname,
        pokemonId: generalSearch.pokemonId,
        level: generalSearch.level,
        owner: generalSearch.owner,
        maxHp: generalSearch.maxHp,
        isInTeam: generalSearch.isInTeam
      });
      return generalSearch;
    } else {
      console.log(`❌ [BattleEndManager] Pas trouvé par critères généraux`);
    }
    
    // 🆕 STRATÉGIE 4: DEBUG - Lister TOUS les Pokémon de ce joueur
    console.log(`🔍 [BattleEndManager] === DEBUG: TOUS LES POKÉMON DU JOUEUR ===`);
    
    try {
      const allPlayerPokemon = await OwnedPokemon.find({ owner: ownerSessionId }).limit(10);
      console.log(`📊 [BattleEndManager] ${allPlayerPokemon.length} Pokémon trouvés pour owner ${ownerSessionId}:`);
      
      allPlayerPokemon.forEach((p, index) => {
        console.log(`  ${index + 1}. ${p.nickname || 'Sans nom'} (#${p.pokemonId}) - Niv.${p.level} - InTeam:${p.isInTeam} - HP:${p.currentHp}/${p.maxHp}`);
      });
      
      // Chercher des Pokémon similaires
      const similarPokemon = allPlayerPokemon.filter(p => 
        p.pokemonId === pokemon.id || 
        (p.nickname && p.nickname.toLowerCase().includes(pokemon.name.toLowerCase()))
      );
      
      if (similarPokemon.length > 0) {
        console.log(`🎯 [BattleEndManager] Pokémon similaires trouvés:`);
        similarPokemon.forEach((p, index) => {
          console.log(`  - ${p.nickname || 'Sans nom'} (#${p.pokemonId}) - Niv.${p.level} - InTeam:${p.isInTeam} - Owner:${p.owner}`);
        });
      }
      
    } catch (error) {
      console.error(`❌ [BattleEndManager] Erreur debug liste Pokémon:`, error);
    }
    
    console.log(`❌ [BattleEndManager] === POKÉMON INTROUVABLE ===`);
    return null;
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
      version: 'xp_integrated_v1', // 🆕 Version avec XP
      features: ['hp_save', 'status_save', 'wild_battle_xp'], // 🆕 Feature XP ajoutée
      ready: this.isReady(),
      gameState: this.gameState ? 'loaded' : 'empty'
    };
  }
}

export default BattleEndManager;
