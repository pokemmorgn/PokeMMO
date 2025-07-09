// server/src/rooms/BattleRoom.ts
// VERSION 2.6 : BattleRoom avec système narratif complet + CAPTURE

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

// === BATTLEROOM V2.6 - AVEC SYSTÈME NARRATIF + CAPTURE ===

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
    console.log(`⚔️ [BattleRoom] Création V2.6 avec système narratif + capture`);
    console.log(`🎯 Type: ${options.battleType}, Joueur: ${options.playerData.name}`);
    
    this.battleInitData = options;
    this.setState(new BattleState());
    
    // Configuration de base
    this.state.battleId = `${options.battleType}_${Date.now()}_${this.roomId}`;
    this.state.battleType = options.battleType;
    this.state.phase = "waiting";
    
    // ✅ Initialiser BattleEngine avec système narratif
    this.battleEngine = new BattleEngine();
    this.setupBattleEngineEvents();
    this.setupMessageHandlers();
    
    console.log(`✅ [BattleRoom] ${this.roomId} créée avec BattleEngine narratif V2.6 + capture`);
  }
  
  // === GESTION MESSAGES ===
  
  private setupMessageHandlers() {
    console.log('🎮 [BattleRoom] Configuration message handlers narratif V2.6 + capture');
    
    // Handler pour les actions de combat (maintenant async)
    this.onMessage("battleAction", async (client, data: {
      actionType: "attack" | "item" | "switch" | "run" | "capture";
      moveId?: string;
      itemId?: string;
      targetPokemonId?: string;
      ballType?: string;
    }) => {
      await this.handleBattleAction(client, data);
    });

        // Handler spécifique pour la capture
    this.onMessage("attemptCapture", async (client, data: {
      ballType: string;
    }) => {
      console.log(`🎯 [BattleRoom] Capture reçue: ${data.ballType}`);
      await this.handleBattleAction(client, {
        actionType: "capture",
        ballType: data.ballType
      });
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
      
      // ✅ NOUVEAU: Récupérer le TeamManager pour la capture
      let teamManager = null;
      if (data.actionType === 'capture') {
        teamManager = this.teamManagers.get(client.sessionId);
        if (!teamManager) {
          client.send("actionResult", {
            success: false,
            error: "TeamManager non trouvé pour la capture",
            events: []
          });
          return;
        }
      }
      
      // ✅ CORRIGÉ: Traiter via BattleEngine (maintenant async)
      const result = await this.battleEngine.processAction(action, teamManager);
      
      if (result.success) {
        console.log(`✅ [BattleRoom] Action traitée avec succès`);
        
        // Synchroniser le state
        this.syncStateFromGameState();
        
        // Notifier tous les clients
        this.broadcast("actionResult", {
          success: true,
          events: result.events,
          data: result.data,
          gameState: this.getClientBattleState(),
          battleEnded: result.data?.battleEnded || false
        });
        
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
  
  // === ✅ EXÉCUTION ACTION IA (maintenant async) ===
  
  private async executeAIAction() {
    console.log('🤖 [BattleRoom] Exécution action IA');
    
    try {
      // Générer l'action IA
      const aiAction = this.battleEngine.generateAIAction();
      
      if (!aiAction) {
        console.error('❌ [BattleRoom] Aucune action IA générée');
        return;
      }
      
      console.log(`🤖 [BattleRoom] IA va utiliser: ${aiAction.data.moveId}`);
      
      // ✅ CORRIGÉ: Traiter l'action via BattleEngine (maintenant async)
      const result = await this.battleEngine.processAction(aiAction);
      
      if (result.success) {
        console.log(`✅ [BattleRoom] Action IA traitée avec succès`);
        
        // Synchroniser le state
        this.syncStateFromGameState();
        
        // Notifier tous les clients
        this.broadcast("actionResult", {
          success: true,
          isAI: true,
          events: result.events,
          data: result.data,
          gameState: this.getClientBattleState(),
          battleEnded: result.data?.battleEnded || false
        });
        
      } else {
        console.error(`❌ [BattleRoom] Échec action IA: ${result.error}`);
        
        // En cas d'échec IA, passer au tour suivant
        // TODO: Gérer les échecs IA plus proprement
      }
      
    } catch (error) {
      console.error(`❌ [BattleRoom] Erreur executeAIAction:`, error);
    }
  }
  
  async onJoin(client: Client, options: any) {
    console.log(`🔥 [JOIN] ${client.sessionId} rejoint BattleRoom narratif V2.6 + capture`);
    
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
    console.log(`👋 ${client.sessionId} quitte BattleRoom narratif V2.6 + capture`);
    this.cleanupPlayer(client.sessionId);
  }
  
  // === DÉMARRAGE COMBAT V2.6 ===
  
  private async startBattleV2() {
    console.log(`🚀 [BattleRoom] Démarrage combat narratif V2.6 + capture`);
    
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
      
      // 4. Démarrer le combat via BattleEngine (avec narrateur)
      const result = this.battleEngine.startBattle(battleConfig);
      
      if (result.success) {
        this.battleGameState = result.gameState;
        this.syncStateFromGameState();
        
        console.log(`✅ [BattleRoom] Combat narratif V2.6 + capture démarré avec succès`);
        console.log(`📖 [BattleRoom] Mode narratif actif - Tour ${this.battleGameState.turnNumber}`);
        
      } else {
        throw new Error(result.error || 'Erreur démarrage combat');
      }
      
    } catch (error) {
      console.error(`❌ [BattleRoom] Erreur démarrage narratif V2.6 + capture:`, error);
      this.broadcast("battleError", { 
        message: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
    }
  }
  
  // === ✅ ÉVÉNEMENTS BATTLEENGINE NARRATIFS COMPLETS ===
  
  private setupBattleEngineEvents() {
    console.log('🎮 [BattleRoom] Configuration des événements BattleEngine Narratif V2.6 + capture');

    // === ✅ DÉMARRAGE NARRATIF ===
    this.battleEngine.on('battleStart', (data: any) => {
      console.log(`📖 [BattleRoom] Mode narratif activé`);
      
      // Synchroniser state avec gameState
      if (data.gameState) {
        this.battleGameState = data.gameState;
        this.syncStateFromGameState();
      }
      
      // Envoyer les infos narratives au client
      this.broadcast("narrativeStart", {
        playerPokemon: this.battleGameState?.player1.pokemon,
        opponentPokemon: this.battleGameState?.player2.pokemon,
        gameState: this.getClientBattleState(),
        events: [`Une ${this.battleGameState?.player2.pokemon?.name} sauvage apparaît !`],
        duration: 3000 // 3 secondes de narration
      });
      
      console.log(`📖 [BattleRoom] Narration envoyée aux clients`);
    });

    // === ✅ FIN DE NARRATION ===
    this.battleEngine.on('narrativeEnd', (data: any) => {
      console.log(`📖→⚔️ [BattleRoom] Narration terminée, combat commence avec ${data.firstCombatant}`);
      
      // Synchroniser le state
      this.syncStateFromGameState();
      
      // Notifier la fin de narration
      this.broadcast("narrativeEnd", {
        firstCombatant: data.firstCombatant,
        message: "Le combat commence !",
        gameState: this.getClientBattleState()
      });
      
      console.log(`⚔️ [BattleRoom] Combat actif, premier combattant: ${data.firstCombatant}`);
    });

    // === CHANGEMENTS DE TOUR (Combat actif) ===
    this.battleEngine.on('turnChanged', (data: any) => {
      console.log(`🔄 [BattleRoom] Tour de combat: ${data.newPlayer} (Tour ${data.turnNumber})`);
      
      // Synchroniser le state
      this.syncStateFromGameState();
      
      // Notifier tous les clients du changement de tour
      this.broadcast('turnChanged', {
        currentTurn: data.newPlayer,
        turnNumber: data.turnNumber,
        gameState: this.getClientBattleState()
      });
      
      // Gestion spécifique selon le joueur
      if (data.newPlayer === 'player1') {
        // C'est le tour du joueur humain
        const client = this.clients.find(c => c.sessionId === this.state.player1Id);
        if (client) {
          client.send('yourTurn', { 
            turnNumber: data.turnNumber,
            message: "C'est votre tour !"
          });
        }
        
        console.log(`👤 [BattleRoom] Tour du joueur ${this.state.player1Name}`);
        
      } else if (data.newPlayer === 'player2') {
        // C'est le tour de l'IA
        const aiDelay = this.battleEngine.getAIThinkingDelay();
        console.log(`🤖 [BattleRoom] Tour de l'IA - Réflexion ${aiDelay}ms...`);
        
        // Notifier que l'IA réfléchit
        this.broadcast('aiThinking', {
          delay: aiDelay,
          message: "L'adversaire réfléchit...",
          turnNumber: data.turnNumber
        });
        
        // Programmer l'action de l'IA
        this.clock.setTimeout(async () => {
          if (!this.battleGameState?.isEnded) {
            await this.executeAIAction();
          } else {
            console.log('⏹️ [BattleRoom] Combat terminé, IA annulée');
          }
        }, aiDelay);
      }
    });

    // === FIN DE COMBAT (avec capture) ===
    this.battleEngine.on('battleEnd', (data: any) => {
      console.log(`🏁 [BattleRoom] Fin de combat: ${data.winner || 'Match nul'}`);
      console.log(`📄 [BattleRoom] Raison: ${data.reason}`);
      
      // ✅ NOUVEAU: Vérifier si c'est une fin par capture
      if (data.captureSuccess) {
        console.log(`🎯 [BattleRoom] Combat terminé par capture réussie !`);
      }
      
      // Synchroniser le state final
      this.syncStateFromGameState();
      
      // Notifier tous les clients de la fin
      this.broadcast("battleEnd", {
        winner: data.winner,
        reason: data.reason,
        gameState: this.getClientBattleState(),
        captureSuccess: data.captureSuccess || false,
        timestamp: Date.now()
      });
      
      // Message de victoire/défaite personnalisé
      let victoryMessage: string;
      if (data.captureSuccess) {
        victoryMessage = 'Pokémon capturé avec succès !';
      } else {
        victoryMessage = data.winner === 'player1' ? 
          'Félicitations ! Vous avez gagné !' : 
          data.winner === 'player2' ?
          'Défaite ! Vous avez perdu...' :
          'Match nul !';
      }
        
      this.broadcast("battleMessage", {
        message: victoryMessage,
        type: data.captureSuccess ? 'capture' : data.winner === 'player1' ? 'victory' : data.winner === 'player2' ? 'defeat' : 'draw',
        timing: 3000
      });
      
      // Programmer la fermeture de la room
      console.log('⏰ [BattleRoom] Fermeture programmée dans 5 secondes...');
      this.clock.setTimeout(() => {
        console.log('🚪 [BattleRoom] Fermeture de la room de combat');
        this.disconnect();
      }, 5000);
    });

    // === SAUVEGARDE POKÉMON ===
    this.battleEngine.on('pokemonSaved', (data: any) => {
      console.log(`💾 [BattleRoom] Pokémon sauvegardés avec succès`);
      console.log(`📋 [BattleRoom] Événements: ${data.events.join(', ')}`);
      
      // Notifier les clients de la sauvegarde réussie
      this.broadcast("pokemonSaved", {
        success: true,
        message: "Données Pokémon sauvegardées !",
        events: data.events,
        pokemonCount: data.data?.pokemonSaved || 0
      });
    });

    // === ERREURS DE SAUVEGARDE ===
    this.battleEngine.on('saveError', (data: any) => {
      console.error(`❌ [BattleRoom] Erreur critique de sauvegarde: ${data.error}`);
      
      // Notifier les clients de l'erreur (critique)
      this.broadcast("saveError", {
        success: false,
        message: "Erreur lors de la sauvegarde des données !",
        error: data.error,
        severity: 'critical'
      });
    });

    // === TRAITEMENT D'ACTIONS ===
    this.battleEngine.on('actionProcessed', (data: any) => {
      console.log(`⚔️ [BattleRoom] Action traitée: ${data.action.type} → Tour suivant: ${data.nextPlayer}`);
    });

    // === ✅ NOUVEAUX ÉVÉNEMENTS CAPTURE ===
    
    // Capture de Pokémon
    this.battleEngine.on('pokemonCaptured', (data: any) => {
      console.log(`🎯 [BattleRoom] Pokémon capturé: ${data.pokemon.name}`);
      
      this.broadcast("pokemonCaptured", {
        pokemon: data.pokemon,
        ball: data.ball,
        success: data.success,
        shakes: data.shakes
      });
    });

    // === ÉVÉNEMENTS FUTURS (prêts pour extension) ===
    
    // Expérience gagnée
    this.battleEngine.on('experienceGained', (data: any) => {
      console.log(`🌟 [BattleRoom] Expérience gagnée: ${data.amount} EXP`);
      
      this.broadcast("experienceGained", {
        pokemon: data.pokemon,
        experience: data.amount,
        newLevel: data.newLevel,
        evolution: data.evolution
      });
    });

    // Récompenses obtenues
    this.battleEngine.on('rewardsGained', (data: any) => {
      console.log(`🎁 [BattleRoom] Récompenses: ${data.rewards}`);
      
      this.broadcast("rewardsGained", {
        money: data.money,
        items: data.items,
        experience: data.experience
      });
    });

    // Fuite du combat
    this.battleEngine.on('battleFled', (data: any) => {
      console.log(`🏃 [BattleRoom] Fuite du combat par ${data.player}`);
      
      this.broadcast("battleFled", {
        player: data.player,
        reason: data.reason
      });
    });

    // Erreurs générales
    this.battleEngine.on('error', (data: any) => {
      console.error(`❌ [BattleRoom] Erreur BattleEngine: ${data.error}`);
      
      this.broadcast("battleError", {
        message: "Une erreur est survenue",
        error: data.error,
        timestamp: Date.now()
      });
    });

    console.log('✅ [BattleRoom] Tous les événements BattleEngine narratifs + capture configurés');
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
  
  // === ✅ NETTOYAGE AVEC BATTLEENGINE ===
  
  async onDispose() {
    console.log(`💀 [BattleRoom] Narratif + capture ${this.roomId} en cours de destruction`);
    
    // ✅ Nettoyer le BattleEngine
    if (this.battleEngine) {
      this.battleEngine.cleanup();
      console.log('🧹 [BattleRoom] BattleEngine nettoyé');
    }
    
    // Nettoyer les TeamManagers
    this.teamManagers.clear();
    
    // Nettoyer les références
    this.battleGameState = null;
    
    console.log(`✅ [BattleRoom] Destruction complète de ${this.roomId}`);
  }
}

export default BattleRoom;
