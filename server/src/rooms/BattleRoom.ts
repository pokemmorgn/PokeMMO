// === GESTION CONNEXIONS ===// server/src/rooms/BattleRoom.ts
// VERSION 2 : Clean avec BattleEngine

import { Room, Client } from "@colyseus/core";
import { BattleState, BattlePokemon } from "../schema/BattleState";
import { BattleEngine } from "../battle/BattleEngine";
import { BattleConfig, BattleGameState, Pokemon, BattleAction } from "../battle/types/BattleTypes";
import { getPokemonById } from "../data/PokemonData";
import { TeamManager } from "../managers/TeamManager";

// === INTERFACES BATTLEROOM ===

export interface BattleInitData {
  battleType: "wild" | "pvp";
  playerData: {
    sessionId: string;
    name: string;
    worldRoomId: string;
    activePokemonId?: string;
  };
  wildPokemon?: any;
  player2Data?: {
    sessionId: string;
    name: string;
    worldRoomId: string;
  };
}

// === BATTLEROOM V2 ===

export class BattleRoom extends Room<BattleState> {
  
  // === SYSTÈME DE COMBAT ===
  private battleEngine: BattleEngine;
  private battleGameState: BattleGameState | null = null;
  
  // === DONNÉES ROOM ===
  private battleInitData!: BattleInitData;
  private teamManagers: Map<string, TeamManager> = new Map();
  
  maxClients = 2;
  
  // === CRÉATION ROOM ===
  
  async onCreate(options: BattleInitData) {
    console.log(`⚔️ [BattleRoom] Création V2 avec BattleEngine`);
    console.log(`🎯 Type: ${options.battleType}, Joueur: ${options.playerData.name}`);
    
    this.battleInitData = options;
    this.setState(new BattleState());
    
    // Configuration de base
    this.state.battleId = `${options.battleType}_${Date.now()}_${this.roomId}`;
    this.state.battleType = options.battleType;
    this.state.phase = "waiting";
    
    // ✅ NOUVEAU : Initialiser BattleEngine
    this.battleEngine = new BattleEngine();
    this.setupBattleEngineEvents();
    this.setupMessageHandlers();
    
    console.log(`✅ [BattleRoom] ${this.roomId} créée avec BattleEngine V2`);
  }
  
  // === GESTION MESSAGES ===
  
  private setupMessageHandlers() {
    console.log('🎮 [BattleRoom] Configuration message handlers V2');
    
    // Handler pour les actions de combat
    this.onMessage("battleAction", async (client, data: {
      actionType: "attack" | "item" | "switch" | "run" | "capture";
      moveId?: string;
      itemId?: string;
      targetPokemonId?: string;
      ballType?: string;
    }) => {
      await this.handleBattleAction(client, data);
    });
    
    // Handler pour obtenir l'état du combat
    this.onMessage("getBattleState", (client) => {
      client.send("battleStateUpdate", this.getClientBattleState());
    });
  }
  
  private async handleBattleAction(client: Client, data: any) {
    console.log(`🎮 [BattleRoom] Action reçue: ${data.actionType} de ${client.sessionId}`);
    
    try {
      // Créer l'action pour BattleEngine
      const action: BattleAction = {
        actionId: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        playerId: client.sessionId,
        type: data.actionType,
        data: {
          moveId: data.moveId,
          itemId: data.itemId,
          targetPokemonId: data.targetPokemonId,
          ballType: data.ballType
        },
        timestamp: Date.now()
      };
      
      // Traiter via BattleEngine
      const result = this.battleEngine.processAction(action);
      
      if (result.success) {
        console.log(`✅ [BattleRoom] Action traitée avec succès`);
        
        // Synchroniser le state
        this.syncStateFromGameState();
        
        // Notifier tous les clients
        this.broadcast("actionResult", {
          success: true,
          events: result.events,
          data: result.data,
          gameState: this.getClientBattleState()
        });
        
        // Vérifier conditions de fin de combat
        this.checkBattleEnd();
        
      } else {
        console.log(`❌ [BattleRoom] Échec action: ${result.error}`);
        
        // Notifier seulement le client qui a échoué
        client.send("actionResult", {
          success: false,
          error: result.error,
          events: result.events
        });
      }
      
    } catch (error) {
      console.error(`❌ [BattleRoom] Erreur handleBattleAction:`, error);
      
      client.send("actionResult", {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        events: []
      });
    }
  }
  
  private checkBattleEnd() {
    if (!this.battleGameState) return;
    
    // Vérifier si un Pokémon est K.O.
    const player1KO = this.battleGameState.player1.pokemon?.currentHp <= 0;
    const player2KO = this.battleGameState.player2.pokemon?.currentHp <= 0;
    
    if (player1KO || player2KO) {
      console.log(`🏁 [BattleRoom] Fin de combat détectée`);
      
      const winner = player1KO ? 'player2' : 'player1';
      const reason = player1KO ? 'Player 1 K.O.' : 'Player 2 K.O.';
      
      this.battleGameState.isEnded = true;
      this.battleGameState.winner = winner;
      this.battleGameState.phase = 'ended';
      
      this.broadcast("battleEnd", {
        winner: winner,
        reason: reason,
        gameState: this.getClientBattleState()
      });
      
      // Fermer la room dans 5 secondes
      this.clock.setTimeout(() => this.disconnect(), 5000);
    }
  }
  
  async onJoin(client: Client, options: any) {
    console.log(`🔥 [JOIN] ${client.sessionId} rejoint BattleRoom V2`);
    
    try {
      const effectiveSessionId = options?.worldSessionId || client.sessionId;
      const playerName = this.getPlayerName(effectiveSessionId);
      
      this.state.player1Id = client.sessionId;
      this.state.player1Name = playerName || this.battleInitData.playerData.name;
      
      // Créer TeamManager
      const teamManager = new TeamManager(this.state.player1Name);
      await teamManager.load();
      this.teamManagers.set(client.sessionId, teamManager);
      
      client.send("battleJoined", {
        battleId: this.state.battleId,
        battleType: this.state.battleType,
        yourRole: "player1"
      });
      
      // Démarrer le combat automatiquement
      this.clock.setTimeout(() => this.startBattleV2(), 1000);
      
    } catch (error) {
      console.error(`❌ [JOIN] Erreur:`, error);
      client.leave(1000, "Erreur lors de l'entrée en combat");
    }
  }
  
  async onLeave(client: Client) {
    console.log(`👋 ${client.sessionId} quitte BattleRoom V2`);
    this.cleanupPlayer(client.sessionId);
  }
  
  // === DÉMARRAGE COMBAT V2 ===
  
  private async startBattleV2() {
    console.log(`🚀 [BattleRoom] Démarrage combat V2`);
    
    try {
      // 1. Récupérer les données des Pokémon
      const playerClient = Array.from(this.clients)[0];
      if (!playerClient) throw new Error("Aucun client trouvé");
      
      const teamManager = this.teamManagers.get(playerClient.sessionId);
      if (!teamManager) throw new Error("TeamManager non trouvé");
      
      const team = await teamManager.getTeam();
      const firstPokemon = team.find(p => p.currentHp > 0 && p.moves?.length > 0);
      if (!firstPokemon) throw new Error("Aucun Pokémon disponible");
      
      // 2. Convertir vers le format BattleEngine
      const player1Pokemon = await this.convertToBattleEnginePokemon(firstPokemon, false);
      const player2Pokemon = await this.convertToBattleEnginePokemon(this.battleInitData.wildPokemon, true);
      
      // 3. Configurer le combat
      const battleConfig: BattleConfig = {
        type: this.state.battleType as any,
        player1: {
          sessionId: this.state.player1Id,
          name: this.state.player1Name,
          pokemon: player1Pokemon
        },
        opponent: {
          sessionId: 'ai',
          name: 'Pokémon Sauvage',
          pokemon: player2Pokemon,
          isAI: true
        }
      };
      
      // 4. Démarrer le combat via BattleEngine
      const result = this.battleEngine.startBattle(battleConfig);
      
      if (result.success) {
        this.battleGameState = result.gameState;
        this.syncStateFromGameState();
        
        console.log(`✅ [BattleRoom] Combat V2 démarré avec succès`);
        
        // DEBUG: Vérifier ce qu'on envoie
        console.log(`🔍 [DEBUG] player1.pokemon:`, this.battleGameState.player1.pokemon);
        console.log(`🔍 [DEBUG] player2.pokemon:`, this.battleGameState.player2.pokemon);
        
        const battleStartData = {
          playerPokemon: this.battleGameState.player1.pokemon,
          opponentPokemon: this.battleGameState.player2.pokemon,
          gameState: this.getClientBattleState(),
          events: result.events
        };
        
        console.log(`🔍 [DEBUG] Données envoyées au client:`, JSON.stringify(battleStartData, null, 2));
        
        // Notifier le client avec le format attendu
        this.broadcast("battleStart", battleStartData);
        
      } else {
        throw new Error(result.error || 'Erreur démarrage combat');
      }
      
    } catch (error) {
      console.error(`❌ [BattleRoom] Erreur démarrage V2:`, error);
      this.broadcast("battleError", { 
        message: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
    }
  }
  
  // === ÉVÉNEMENTS BATTLEENGINE ===
  
  private setupBattleEngineEvents() {
    this.battleEngine.on('battleStart', (data: any) => {
      console.log(`🎯 [BattleRoom] Événement battleStart reçu`);
      // Synchroniser state avec gameState
      if (data.gameState) {
        this.battleGameState = data.gameState;
        this.syncStateFromGameState();
      }
    });
    
    // ✅ NOUVEAU: Écouter les changements de tour
    this.battleEngine.on('turnChanged', (data: any) => {
      console.log(`🔄 [BattleRoom] Changement de tour: ${data.newPlayer}`);
      
      // Synchroniser le state
      this.syncStateFromGameState();
      
      // Notifier les clients
      this.broadcast('turnChanged', {
        currentTurn: data.newPlayer,
        turnNumber: data.turnNumber,
        gameState: this.getClientBattleState()
      });
      
      // Notifier spécifiquement le joueur actuel
      if (data.newPlayer === 'player1') {
        const client = this.clients.find(c => c.sessionId === this.state.player1Id);
        if (client) {
          client.send('yourTurn', { 
            turnNumber: data.turnNumber 
          });
        }
      } else if (data.newPlayer === 'player2') {
        // TODO: Déclencher l'IA dans la prochaine étape
        console.log(`🤖 [BattleRoom] Tour de l'IA (pas encore implémenté)`);
      }
    });
    
    // TODO: Ajouter d'autres événements dans les prochaines étapes
  }
  
  // === CONVERSION DE DONNÉES ===
  
  private async convertToBattleEnginePokemon(pokemonData: any, isWild: boolean): Promise<Pokemon> {
    const baseData = await getPokemonById(pokemonData.pokemonId);
    if (!baseData) throw new Error(`Pokémon ${pokemonData.pokemonId} introuvable`);
    
    return {
      id: pokemonData.pokemonId,
      combatId: `combat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: isWild ? baseData.name : (pokemonData.customName || baseData.name),
      level: pokemonData.level,
      currentHp: isWild ? (pokemonData.hp || this.calculateHPStat(baseData.baseStats.hp, pokemonData.level)) : pokemonData.currentHp,
      maxHp: isWild ? (pokemonData.hp || this.calculateHPStat(baseData.baseStats.hp, pokemonData.level)) : pokemonData.maxHp,
      attack: pokemonData.attack || this.calculateStat(baseData.baseStats.attack, pokemonData.level),
      defense: pokemonData.defense || this.calculateStat(baseData.baseStats.defense, pokemonData.level),
      specialAttack: pokemonData.specialAttack || this.calculateStat(baseData.baseStats.specialAttack, pokemonData.level),
      specialDefense: pokemonData.specialDefense || this.calculateStat(baseData.baseStats.specialDefense, pokemonData.level),
      speed: pokemonData.speed || this.calculateStat(baseData.baseStats.speed, pokemonData.level),
      types: pokemonData.types || baseData.types,
      moves: pokemonData.moves?.map((m: any) => typeof m === 'string' ? m : m.moveId) || ['tackle'],
      status: pokemonData.status || 'normal',
      gender: pokemonData.gender || 'unknown',
      shiny: pokemonData.shiny || false,
      isWild: isWild
    };
  }
  
  // === SYNCHRONISATION STATE ===
  
  private syncStateFromGameState() {
    if (!this.battleGameState) return;
    
    console.log(`🔄 [BattleRoom] Synchronisation state depuis gameState`);
    
    // Phase
    this.state.phase = this.battleGameState.phase;
    this.state.turnNumber = this.battleGameState.turnNumber;
    this.state.currentTurn = this.battleGameState.currentTurn;
    
    // Pokémon (conversion vers BattlePokemon si nécessaire)
    if (this.battleGameState.player1.pokemon) {
      this.state.player1Pokemon = this.convertToBattlePokemon(this.battleGameState.player1.pokemon);
    }
    
    if (this.battleGameState.player2.pokemon) {
      this.state.player2Pokemon = this.convertToBattlePokemon(this.battleGameState.player2.pokemon);
    }
    
    console.log(`✅ [BattleRoom] State synchronisé`);
  }
  
  private convertToBattlePokemon(pokemon: Pokemon): BattlePokemon {
    const battlePokemon = new BattlePokemon();
    
    battlePokemon.pokemonId = pokemon.id;
    battlePokemon.combatId = pokemon.combatId;
    battlePokemon.name = pokemon.name;
    battlePokemon.level = pokemon.level;
    battlePokemon.currentHp = pokemon.currentHp;
    battlePokemon.maxHp = pokemon.maxHp;
    battlePokemon.attack = pokemon.attack;
    battlePokemon.defense = pokemon.defense;
    battlePokemon.specialAttack = pokemon.specialAttack;
    battlePokemon.specialDefense = pokemon.specialDefense;
    battlePokemon.speed = pokemon.speed;
    battlePokemon.statusCondition = pokemon.status || 'normal';
    battlePokemon.gender = pokemon.gender || 'unknown';
    battlePokemon.shiny = pokemon.shiny || false;
    battlePokemon.isWild = pokemon.isWild || false;
    
    // Types
    battlePokemon.types.clear();
    pokemon.types.forEach(type => battlePokemon.types.push(type));
    
    // Moves
    battlePokemon.moves.clear();
    pokemon.moves.forEach(move => battlePokemon.moves.push(move));
    
    return battlePokemon;
  }
  
  // === UTILITAIRES ===
  
  private calculateStat(baseStat: number, level: number): number {
    return Math.floor(((2 * baseStat + 31) * level) / 100) + 5;
  }
  
  private calculateHPStat(baseStat: number, level: number): number {
    return Math.floor(((2 * baseStat + 31) * level) / 100) + level + 10;
  }
  
  private getPlayerName(sessionId: string): string | null {
    if (sessionId === this.battleInitData.playerData.sessionId) {
      return this.battleInitData.playerData.name;
    }
    return null;
  }
  
  private getClientBattleState() {
    if (!this.battleGameState) return null;
    
    return {
      battleId: this.battleGameState.battleId,
      phase: this.battleGameState.phase,
      currentTurn: this.battleGameState.currentTurn,
      turnNumber: this.battleGameState.turnNumber,
      player1: {
        name: this.battleGameState.player1.name,
        pokemon: this.battleGameState.player1.pokemon
      },
      player2: {
        name: this.battleGameState.player2.name,
        pokemon: this.battleGameState.player2.pokemon
      }
    };
  }
  
  private cleanupPlayer(sessionId: string) {
    this.teamManagers.delete(sessionId);
  }
  
  async onDispose() {
    console.log(`💀 [BattleRoom] V2 ${this.roomId} détruite`);
    this.teamManagers.clear();
  }
}

export default BattleRoom;
