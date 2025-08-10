// server/src/battle/modules/BattleEndManager.ts
// ÉTAPE 2.5 : Gestion de fin de combat et sauvegarde + 🆕 SYSTÈME XP INTÉGRÉ + 🎯 ÉVÉNEMENTS CLIENT

import { BattleGameState, BattleResult, Pokemon } from '../types/BattleTypes';
import { OwnedPokemon } from '../../models/OwnedPokemon';
// 🆕 IMPORT DU SERVICE XP
import { givePlayerWildXP, experienceService } from '../../services/ExperienceService';
// 🎯 IMPORT FORMATEUR XP POUR CLIENT
import XpEventFormatter, { ClientXpEvent } from '../utils/XpEventFormatter';

/**
 * BATTLE END MANAGER - Gestion de fin de combat
 * 
 * Responsabilités :
 * - Sauvegarder les HP après combat
 * - 🆕 DONNER L'XP POUR COMBATS SAUVAGES
 * - 🎯 ÉMETTRE ÉVÉNEMENTS XP VERS CLIENT
 * - Gérer l'expérience (étape future)
 * - Gérer les récompenses (étape future)
 * - Nettoyer l'état de combat
 */
export class BattleEndManager {
  
  private gameState: BattleGameState | null = null;
  // 🎯 CALLBACK POUR ÉMETTRE VERS CLIENT
  private emitToClientCallback: ((eventType: string, data: any) => void) | null = null;
  
  constructor() {
    console.log('🏁 [BattleEndManager] Initialisé avec système XP + événements client');
    
    // 🎯 ÉCOUTER LES ÉVÉNEMENTS XP DU SERVICE
    this.setupExperienceEventListeners();
  }
  
  // === 🎯 NOUVELLE MÉTHODE : Configuration callback client ===
  
  /**
   * 🎯 Configure le callback pour émettre vers le client
   */
  setEmitToClientCallback(callback: (eventType: string, data: any) => void): void {
    this.emitToClientCallback = callback;
    console.log('📡 [BattleEndManager] Callback client configuré');
  }
  
  /**
   * 🎯 Émet un événement vers le client (si callback configuré)
   */
  private emitToClient(eventType: string, data: any): void {
    if (this.emitToClientCallback) {
      try {
        this.emitToClientCallback(eventType, data);
        console.log(`📤 [BattleEndManager] Événement ${eventType} émis vers client`);
      } catch (error) {
        console.error(`❌ [BattleEndManager] Erreur émission ${eventType}:`, error);
      }
    } else {
      console.warn(`⚠️ [BattleEndManager] Pas de callback client pour ${eventType}`);
    }
  }
  
  // === 🎯 NOUVELLE MÉTHODE : Écoute événements XP ===
  
  /**
   * 🎯 Configure les listeners pour les événements XP
   */
  private setupExperienceEventListeners(): void {
    console.log('🎧 [BattleEndManager] Configuration listeners XP...');
    
    // 🌟 ÉVÉNEMENT PRINCIPAL : Expérience gagnée
    experienceService.on('experienceGained', (eventData: any) => {
      this.handleExperienceGained(eventData);
    });
    
    // 🆙 ÉVÉNEMENT : Level Up
    experienceService.on('levelUp', (eventData: any) => {
      this.handleLevelUp(eventData);
    });
    
    // 🌟 ÉVÉNEMENT : Évolution déclenchée
    experienceService.on('evolutionTriggered', (eventData: any) => {
      this.handleEvolutionTriggered(eventData);
    });
    
    // 📚 ÉVÉNEMENT : Nouveaux sorts disponibles
    experienceService.on('newMovesAvailable', (eventData: any) => {
      this.handleNewMovesAvailable(eventData);
    });
    
    console.log('✅ [BattleEndManager] Listeners XP configurés');
  }
  
  /**
   * 🎯 Traite l'événement "experienceGained" 
   */
  private handleExperienceGained(eventData: { context: any; result: any }): void {
    console.log('🌟 [BattleEndManager] Expérience gagnée détectée:', eventData.result.pokemon.name);
    
    try {
      // 🎨 FORMATER POUR CLIENT
      const clientEvent: ClientXpEvent = XpEventFormatter.formatExperienceGained(
        eventData.context,
        eventData.result,
        {
          battleId: this.gameState?.battleId,
          playerId: this.getCurrentPlayerId(),
          combatId: this.getCurrentCombatId()
        }
      );
      
      // 🐛 DEBUG
      if (process.env.NODE_ENV === 'development') {
        XpEventFormatter.debugFormatResult(clientEvent);
      }
      
      // 📤 ÉMETTRE VERS CLIENT
      this.emitToClient('pokemon_experience_gained', clientEvent);
      
      // 🎯 ÉVÉNEMENTS SPÉCIAUX ADDITIONNELS
      if (clientEvent.specialEvents.evolution.triggered) {
        this.emitToClient('pokemon_evolution_started', {
          pokemonId: clientEvent.pokemon.id,
          fromPokemonId: clientEvent.specialEvents.evolution.fromPokemonId,
          toPokemonId: clientEvent.specialEvents.evolution.toPokemonId,
          method: clientEvent.specialEvents.evolution.method,
          timestamp: Date.now()
        });
      }
      
      if (clientEvent.specialEvents.newMoves.length > 0) {
        this.emitToClient('pokemon_new_moves_learned', {
          pokemonId: clientEvent.pokemon.id,
          newMoves: clientEvent.specialEvents.newMoves,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      console.error('❌ [BattleEndManager] Erreur traitement expérience:', error);
    }
  }
  
  /**
   * 🎯 Traite l'événement "levelUp"
   */
  private handleLevelUp(eventData: any): void {
    console.log(`🆙 [BattleEndManager] Level up détecté: ${eventData.fromLevel} → ${eventData.toLevel}`);
    
    // Événement level up simple (en plus de l'événement XP principal)
    this.emitToClient('pokemon_level_up', {
      pokemonId: eventData.pokemonId,
      fromLevel: eventData.fromLevel,
      toLevel: eventData.toLevel,
      levelsGained: eventData.levelsGained,
      timestamp: Date.now()
    });
  }
  
  /**
   * 🎯 Traite l'événement "evolutionTriggered"
   */
  private handleEvolutionTriggered(eventData: any): void {
    console.log('🌟 [BattleEndManager] Évolution déclenchée:', eventData.pokemonId);
    
    // Événement évolution (envoyé aussi dans experienceGained mais utile séparé)
    this.emitToClient('pokemon_evolution_triggered', {
      pokemonId: eventData.pokemonId,
      evolutionData: eventData.evolutionData,
      timestamp: Date.now()
    });
  }
  
  /**
   * 🎯 Traite l'événement "newMovesAvailable"
   */
  private handleNewMovesAvailable(eventData: any): void {
    console.log('📚 [BattleEndManager] Nouveaux sorts disponibles:', eventData.moves.length);
    
    // Événement nouveaux sorts
    this.emitToClient('pokemon_moves_available', {
      pokemonId: eventData.pokemonId,
      availableMoves: eventData.moves,
      timestamp: Date.now()
    });
  }
  
  // === 🎯 MÉTHODES UTILITAIRES POUR CONTEXTE ===
  
  /**
   * 🎯 Récupère l'ID du joueur actuel
   */
  private getCurrentPlayerId(): string | undefined {
    return this.gameState?.player1?.sessionId;
  }
  
  /**
   * 🎯 Récupère l'ID de combat du Pokémon
   */
  private getCurrentCombatId(): string | undefined {
    const playerPokemon = this.gameState?.player1?.pokemon;
    return playerPokemon?.combatId || `battle_${this.gameState?.battleId}_participant_1`;
  }
  
  // === INITIALISATION ===
  
  /**
   * Initialise avec l'état du jeu
   */
  initialize(gameState: BattleGameState): void {
    this.gameState = gameState;
    console.log('✅ [BattleEndManager] Configuré pour le combat avec événements XP');
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
      
      // 🎯 RECHERCHE POKÉMON VIA SESSION → USERNAME
      const ownedPokemon = await this.findOwnedPokemonBySession(
        playerPokemon, 
        this.gameState.player1.sessionId
      );
      
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
        
        // 🎯 NOTE: Les événements XP détaillés sont gérés automatiquement par
        // les listeners configurés dans setupExperienceEventListeners()
        
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
  
  // === 🆕 CONVERSION sessionId → username ===
  
  /**
   * 🆕 Trouve le Pokémon par sessionId (convertit en username)
   */
  private async findOwnedPokemonBySession(pokemon: Pokemon, sessionId: string): Promise<any> {
    try {
      // 🎯 RÉCUPÉRER LE USERNAME VIA JWTManager
      const username = await this.getUsernameFromSession(sessionId);
      
      if (!username) {
        console.warn(`⚠️ [BattleEndManager] Username introuvable pour sessionId: ${sessionId}`);
        return null;
      }
      
      console.log(`✅ [BattleEndManager] Username récupéré: ${username}`);
      
      // 🎯 RECHERCHER AVEC LE USERNAME
      return await this.findOwnedPokemon(pokemon, username);
      
    } catch (error) {
      console.error(`❌ [BattleEndManager] Erreur conversion sessionId → username:`, error);
      return null;
    }
  }

  /**
   * 🆕 Récupère le username depuis sessionId via JWTManager
   */
  private async getUsernameFromSession(sessionId: string): Promise<string | null> {
    try {
      const { JWTManager } = require('../../managers/JWTManager');
      const jwtManager = JWTManager.getInstance();
      
      console.log(`🔍 [BattleEndManager] Conversion sessionId: ${sessionId}`);
      
      // Étape 1: Récupérer userId
      let userId = jwtManager.getUserId(sessionId);
      
      // Étape 2: Si pas de userId, essayer avec playerName du gameState
      if (!userId && this.gameState?.player1?.name) {
        console.log(`🔄 [BattleEndManager] Tentative getUserIdRobust avec playerName: ${this.gameState.player1.name}`);
        userId = await jwtManager.getUserIdRobust(sessionId, this.gameState.player1.name);
      }
      
      if (!userId) {
        console.warn(`⚠️ [BattleEndManager] UserId introuvable pour sessionId: ${sessionId}`);
        return null;
      }
      
      // Étape 3: Récupérer username depuis JWT data
      const jwtData = jwtManager.getUserJWTData(userId);
      const username = jwtData?.username;
      
      if (!username) {
        console.warn(`⚠️ [BattleEndManager] Username introuvable pour userId: ${userId}`);
        return null;
      }
      
      console.log(`✅ [BattleEndManager] Conversion réussie: sessionId ${sessionId} → username ${username}`);
      return username;
      
    } catch (error) {
      console.error(`❌ [BattleEndManager] Erreur getUsernameFromSession:`, error);
      return null;
    }
  }

  /**
   * 🆕 Sauvegarde un Pokémon par sessionId (convertit en username)
   */
  private async savePokemonDataBySession(pokemon: Pokemon, sessionId: string): Promise<void> {
    try {
      // 🎯 RÉCUPÉRER USERNAME
      const username = await this.getUsernameFromSession(sessionId);
      
      if (!username) {
        console.warn(`⚠️ [BattleEndManager] Username introuvable pour sauvegarde sessionId: ${sessionId}`);
        return;
      }
      
      console.log(`✅ [BattleEndManager] Sauvegarde avec username: ${username}`);
      
      // 🎯 SAUVEGARDER AVEC USERNAME
      await this.savePokemonData(pokemon, username);
      
    } catch (error) {
      console.error(`❌ [BattleEndManager] Erreur sauvegarde par session:`, error);
      throw error;
    }
  }

  /**
   * Sauvegarde un Pokémon spécifique
   */
  private async savePokemonData(pokemon: Pokemon, ownerUsername: string): Promise<void> {
    console.log(`💾 [BattleEndManager] Sauvegarde ${pokemon.name} (HP: ${pokemon.currentHp}/${pokemon.maxHp}) pour ${ownerUsername}`);
    
    try {
      // Trouver le Pokémon dans la base de données
      const ownedPokemon = await this.findOwnedPokemon(pokemon, ownerUsername);
      
      if (!ownedPokemon) {
        console.warn(`⚠️ [BattleEndManager] Pokémon ${pokemon.name} non trouvé en base pour ${ownerUsername}`);
        return;
      }
      
      // Mettre à jour les données de combat
      ownedPokemon.currentHp = pokemon.currentHp;
      ownedPokemon.status = pokemon.status as any;
      
      // Mettre à jour statusTurns seulement si défini
      if (pokemon.status && pokemon.status !== 'normal') {
        const statusTurns = (pokemon as any).statusTurns;
        if (statusTurns !== undefined) {
          ownedPokemon.statusTurns = statusTurns;
        }
      } else {
        ownedPokemon.statusTurns = undefined;
      }
      
      // Sauvegarder
      await ownedPokemon.save();
      
      console.log(`✅ [BattleEndManager] ${pokemon.name} sauvegardé (HP: ${pokemon.currentHp}) pour ${ownerUsername}`);
      
    } catch (error) {
      console.error(`❌ [BattleEndManager] Erreur sauvegarde ${pokemon.name}:`, error);
      throw error;
    }
  }

  /**
   * Trouve le Pokémon correspondant en base de données par USERNAME
   */
  private async findOwnedPokemon(pokemon: Pokemon, ownerUsername: string): Promise<any> {
    console.log(`🔍 [BattleEndManager] === RECHERCHE POKÉMON PAR USERNAME ===`);
    console.log(`🎯 Pokémon recherché:`, {
      name: pokemon.name,
      id: pokemon.id,
      level: pokemon.level,
      combatId: pokemon.combatId,
      maxHp: pokemon.maxHp,
      isWild: pokemon.isWild
    });
    console.log(`👤 Owner (username): ${ownerUsername}`);
    
    // Stratégie 1: Par combatId si disponible
    if (pokemon.combatId) {
      console.log(`🔄 [BattleEndManager] Stratégie 1: Recherche par combatId ${pokemon.combatId}`);
      
      const found = await OwnedPokemon.findOne({ 
        combatId: pokemon.combatId,
        owner: ownerUsername 
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
    
    // Stratégie 2: Par pokemonId + owner + isInTeam (équipe active)
    console.log(`🔄 [BattleEndManager] Stratégie 2: Recherche par équipe active`);
    
    const teamPokemon = await OwnedPokemon.findOne({
      pokemonId: pokemon.id,
      owner: ownerUsername,
      isInTeam: true,
      level: pokemon.level
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
    
    // Stratégie 3: Par critères généraux
    console.log(`🔄 [BattleEndManager] Stratégie 3: Recherche par critères généraux`);
    
    const generalSearch = await OwnedPokemon.findOne({
      pokemonId: pokemon.id,
      owner: ownerUsername,
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
      const allPlayerPokemon = await OwnedPokemon.find({ owner: ownerUsername }).limit(10);
      console.log(`📊 [BattleEndManager] ${allPlayerPokemon.length} Pokémon trouvés pour owner ${ownerUsername}:`);
      
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
    // 🎯 CONSERVER LE CALLBACK CLIENT après reset
    console.log('🔄 [BattleEndManager] Reset effectué (callback client conservé)');
  }
  
  /**
   * Obtient des statistiques sur la sauvegarde
   */
  getStats(): any {
    return {
      version: 'xp_integrated_username_v2_with_client_events', // 🎯 Version mise à jour
      features: ['hp_save', 'status_save', 'wild_battle_xp', 'username_lookup', 'client_events', 'xp_formatting'], // 🎯 Nouvelles features
      ready: this.isReady(),
      gameState: this.gameState ? 'loaded' : 'empty',
      clientCallback: this.emitToClientCallback ? 'configured' : 'not_configured' // 🎯 État callback
    };
  }
}

export default BattleEndManager;
