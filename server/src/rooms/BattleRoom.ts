// server/src/rooms/BattleRoom.ts - VERSION NETTOYÉE AVEC TURNSYSTEM
import { Room, Client } from "@colyseus/core";
import { BattleState, BattlePokemon, BattleAction } from "../schema/BattleState";
import { BattleIntegration } from '../managers/battle/BattleIntegration';
import { ActionType } from '../managers/battle/types/BattleTypes';
import { IBattleRoomCallbacks } from '../managers/battle/BattleSequencer';
import { MoveManager } from "../managers/MoveManager";
import { CaptureManager, CaptureAttempt } from "../managers/CaptureManager";
import { WildPokemon } from "../managers/EncounterManager";
import { getPokemonById } from "../data/PokemonData";
import { TeamManager } from "../managers/TeamManager";
import { TurnSystem, BATTLE_CONFIGS, PlayerType } from '../managers/battle/TurnSystem';

export interface BattleInitData {
  battleType: "wild" | "pvp";
  playerData: {
    sessionId: string;
    name: string;
    worldRoomId: string;
    activePokemonId?: string;
  };
  wildPokemon?: WildPokemon;
  player2Data?: {
    sessionId: string;
    name: string;
    worldRoomId: string;
  };
}

export type BattleStatusIcon = 
  | "entering_battle" | "battle_advantage" | "battle_struggling" 
  | "battle_critical" | "battle_victory" | "battle_defeat" 
  | "battle_fled" | "capturing" | "switching_pokemon";

export class BattleRoom extends Room<BattleState> {
  private turnSystem!: TurnSystem;
  private battleInitData!: BattleInitData;
  private teamManagers: Map<string, TeamManager> = new Map();
  private worldRoomRef: any = null;
  private battleIntegration!: BattleIntegration;
  
  // Gestion des tours et timings
  private actionTimeoutMs = 30000;
  private currentActionTimer?: NodeJS.Timeout;
  private playerHpPercentages: Map<string, number> = new Map();
  private lastStatusIcons: Map<string, BattleStatusIcon> = new Map();

  maxClients = 2;

  async onCreate(options: BattleInitData) {
    console.log(`⚔️ [BattleRoom] Création avec TurnSystem`);
    console.log(`🎯 Type: ${options.battleType}, Joueur: ${options.playerData.name}`);
    
    this.battleInitData = options;
    this.setState(new BattleState());
    
    // Configuration de base
    this.state.battleId = `${options.battleType}_${Date.now()}_${this.roomId}`;
    this.state.battleType = options.battleType;
    this.state.phase = "waiting";

    // ✅ NOUVEAU: Initialiser les systèmes de combat
    this.battleIntegration = new BattleIntegration();
    
    const config = options.battleType === 'wild' 
      ? BATTLE_CONFIGS.SINGLE_PVE 
      : BATTLE_CONFIGS.SINGLE_PVP;
    this.turnSystem = new TurnSystem(config);
    
    await MoveManager.initialize();
    await this.setupWorldRoomConnection();
    this.setupMessageHandlers();
    
    console.log(`✅ BattleRoom ${this.roomId} créée`);
  }

  private async setupWorldRoomConnection() {
    try {
      const { ServiceRegistry } = require('../services/ServiceRegistry');
      if (ServiceRegistry) {
        const registry = ServiceRegistry.getInstance();
        this.worldRoomRef = registry?.getWorldRoom();
      }
    } catch (error) {
      console.warn(`⚠️ [BattleRoom] Mode dégradé sans WorldRoom`);
      this.worldRoomRef = null;
    }
  }

  private setupMessageHandlers() {
    this.onMessage("battleAction", async (client, data: {
      actionType: "attack" | "item" | "switch" | "run";
      moveId?: string;
      itemId?: string;
      targetPokemonId?: string;
    }) => {
      await this.handleBattleAction(client, data);
    });

    this.onMessage("choosePokemon", async (client, data: { pokemonId: string }) => {
      await this.handleChoosePokemon(client, data.pokemonId);
    });

    this.onMessage("attemptCapture", async (client, data: { ballType: string }) => {
      await this.handleCaptureAttempt(client, data.ballType);
    });

    this.onMessage("attemptFlee", async (client) => {
      await this.handleFleeAttempt(client);
    });

    this.onMessage("getBattleState", (client) => {
      client.send("battleStateUpdate", this.getClientBattleState());
    });
  }

  // === GESTION DES CONNEXIONS ===

  async onJoin(client: Client, options: any) {
    console.log(`🔥 [JOIN] ${client.sessionId} rejoint BattleRoom`);
    
    try {
      const effectiveSessionId = options?.worldSessionId || client.sessionId;
      const playerName = this.getPlayerName(effectiveSessionId);
      
      // ✅ SIMPLIFIÉ: Attribution directe
      this.state.player1Id = client.sessionId;
      this.state.player1Name = playerName || this.battleInitData.playerData.name;
      
      // Créer TeamManager
      const teamManager = new TeamManager(this.state.player1Name);
      await teamManager.load();
      this.teamManagers.set(client.sessionId, teamManager);
      
      this.blockPlayerInWorldRoom(client.sessionId, "Entré en combat");
      this.updatePlayerStatusIcon(client.sessionId, "entering_battle");
      
      client.send("battleJoined", {
        battleId: this.state.battleId,
        battleType: this.state.battleType,
        yourRole: "player1"
      });

      // ✅ CONDITION SIMPLIFIÉE pour démarrer
      if (this.canStartBattle()) {
        this.clock.setTimeout(() => this.startBattle(), 1000);
      }

    } catch (error) {
      console.error(`❌ [JOIN] Erreur:`, error);
      client.leave(1000, "Erreur lors de l'entrée en combat");
    }
  }
  
  async onLeave(client: Client, consented: boolean) {
    console.log(`👋 ${client.sessionId} quitte BattleRoom`);
    
    this.cleanupPlayer(client.sessionId);
    
    if (this.state.phase === "battle") {
      this.endBattleEarly("player_disconnected");
    }
  }

  // === DÉMARRAGE DU COMBAT ===

  private async startBattle() {
    console.log(`🚀 [START] Démarrage combat ${this.state.battleType}`);
    
    try {
      this.state.phase = "intro";
      
      if (this.state.battleType === "wild") {
        await this.setupWildBattle();
      } else {
        await this.setupPvPBattle();
      }
      
      // ✅ NOUVEAU: Démarrage automatique avec BattleIntegration
      this.state.phase = "team_selection";
      await this.autoStartBattle();
      
    } catch (error) {
      console.error(`❌ [START] Erreur:`, error);
      this.endBattleEarly("setup_error");
    }
  }

  private async setupWildBattle() {
    if (!this.battleInitData.wildPokemon) {
      throw new Error("Données Pokémon sauvage manquantes");
    }
    console.log(`🌿 [SETUP] Combat sauvage configuré`);
  }

  private async setupPvPBattle() {
    if (!this.battleInitData.player2Data) {
      throw new Error("Données joueur 2 manquantes");
    }
    this.state.player2Name = this.battleInitData.player2Data.name;
    console.log(`⚔️ [SETUP] Combat PvP configuré`);
  }

  private async autoStartBattle() {
    console.log(`🤖 [AUTO] Démarrage automatique...`);
    
    const playerClient = Array.from(this.clients)[0];
    if (!playerClient) throw new Error("Aucun client trouvé");
    
    const teamManager = this.teamManagers.get(playerClient.sessionId);
    if (!teamManager) throw new Error("TeamManager non trouvé");
    
    const team = await teamManager.getTeam();
    const firstPokemon = team.find(p => p.currentHp > 0 && p.moves?.length > 0);
    if (!firstPokemon) throw new Error("Aucun Pokémon disponible");
    
    // ✅ SIMPLIFIÉ: Créer les BattlePokemon
    this.state.player1Pokemon = await this.createBattlePokemon(firstPokemon, false);
    
    if (this.battleInitData.wildPokemon) {
      this.state.player2Pokemon = await this.createBattlePokemon(this.battleInitData.wildPokemon, true);
    }
    
    // ✅ NOUVEAU: Initialiser BattleIntegration avec callbacks propres
    const callbacks = this.createBattleCallbacks();
    const participants = this.createParticipants();
    
    this.battleIntegration.initializeBattle(callbacks, 'wild', participants);
    
    this.startActualBattle();
  }

  // === CRÉATION DES COMPOSANTS DE COMBAT ===

  private createBattleCallbacks(): IBattleRoomCallbacks {
    return {
      broadcastMessage: (messageId: string, data: any) => {
        this.addBattleMessage(data.message || messageId);
        this.broadcast('battleMessage', {
          messageId,
          message: data.message || messageId,
          variables: data.variables || {},
          timing: data.timing || 2000
        });
      },

      broadcastUpdate: (updateData: any) => {
        this.broadcast('battleUpdate', updateData);
      },

      updatePokemonHP: (pokemonId: string, newHp: number) => {
        // ✅ SIMPLIFIÉ: Mise à jour directe
        if (this.state.player1Pokemon?.pokemonId.toString() === pokemonId) {
          this.state.player1Pokemon.currentHp = newHp;
        } else if (this.state.player2Pokemon?.pokemonId.toString() === pokemonId) {
          this.state.player2Pokemon.currentHp = newHp;
        }
      },

      changeTurn: (newTurn: string) => {
        // ✅ CRITIQUE: Ne plus changer automatiquement les tours ici !
        // Le TurnSystem gère maintenant les tours
        console.log(`🔄 [CALLBACK] Demande changement tour: ${newTurn} (ignoré - TurnSystem gère)`);
      },

      endBattle: (result: any) => {
        console.log(`🏁 [CALLBACK] Fin combat:`, result);
        this.state.battleEnded = true;
        this.state.winner = result.winner;
        this.state.phase = result.result === 'fled' ? 'fled' : 'ended';
        this.handleBattleEnd();
      },

      logBattleEvent: (event: any) => {
        console.log(`📝 [EVENT] ${event.type}`);
      }
    };
  }

  private createParticipants(): any[] {
    const convertPokemon = (battlePokemon: BattlePokemon) => ({
      pokemonId: battlePokemon.pokemonId,
      name: battlePokemon.name,
      level: battlePokemon.level,
      currentHp: battlePokemon.currentHp,
      maxHp: battlePokemon.maxHp,
      types: Array.from(battlePokemon.types),
      moves: Array.from(battlePokemon.moves).map(moveId => ({
        moveId,
        name: MoveManager.getMoveData(moveId)?.name || moveId,
        type: MoveManager.getMoveData(moveId)?.type || 'Normal',
        category: 'physical' as const,
        power: MoveManager.getMoveData(moveId)?.power || 40,
        accuracy: MoveManager.getMoveData(moveId)?.accuracy || 100,
        pp: 35,
        maxPp: 35,
        priority: 0,
        description: ''
      })),
      stats: {
        attack: battlePokemon.attack,
        defense: battlePokemon.defense,
        specialAttack: battlePokemon.specialAttack,
        specialDefense: battlePokemon.specialDefense,
        speed: battlePokemon.speed,
        hp: battlePokemon.maxHp
      },
      statStages: {
        attack: 0, defense: 0, specialAttack: 0, 
        specialDefense: 0, speed: 0, accuracy: 0, evasion: 0
      },
      statusCondition: battlePokemon.statusCondition || 'normal',
      ability: undefined as string | undefined,
      heldItem: undefined as string | undefined,
      gender: battlePokemon.gender,
      shiny: battlePokemon.shiny,
      isWild: battlePokemon.isWild,
      nature: 'Hardy'
    });

    return [
      {
        sessionId: this.state.player1Id,
        name: this.state.player1Name,
        role: 'player1',
        team: [convertPokemon(this.state.player1Pokemon)],
        activePokemon: this.state.player1Pokemon.pokemonId.toString(),
        isAI: false,
        isConnected: true,
        lastActionTime: Date.now()
      },
      {
        sessionId: 'ai',
        name: 'Pokémon Sauvage',
        role: 'player2',
        team: [convertPokemon(this.state.player2Pokemon)],
        activePokemon: this.state.player2Pokemon.pokemonId.toString(),
        isAI: true,
        isConnected: true,
        lastActionTime: Date.now()
      }
    ];
  }

  private async createBattlePokemon(pokemonData: any, isWild: boolean): Promise<BattlePokemon> {
    const battlePokemon = new BattlePokemon();
    
    const baseData = await getPokemonById(pokemonData.pokemonId);
    if (!baseData) throw new Error(`Pokémon ${pokemonData.pokemonId} introuvable`);

    // Configuration de base
    battlePokemon.pokemonId = pokemonData.pokemonId;
    battlePokemon.name = isWild ? baseData.name : (pokemonData.customName || baseData.name);
    battlePokemon.level = pokemonData.level;
    battlePokemon.isWild = isWild;
    battlePokemon.gender = pokemonData.gender || 'unknown';
    battlePokemon.shiny = pokemonData.shiny || false;
    
    // Types
    battlePokemon.types.clear();
    (pokemonData.types || baseData.types).forEach((type: string) => {
      battlePokemon.types.push(type);
    });
    
    // Stats
    if (isWild) {
      battlePokemon.maxHp = pokemonData.hp || this.calculateStat(baseData.baseStats.hp, pokemonData.level);
      battlePokemon.currentHp = battlePokemon.maxHp;
      battlePokemon.attack = pokemonData.attack || this.calculateStat(baseData.baseStats.attack, pokemonData.level);
      battlePokemon.defense = pokemonData.defense || this.calculateStat(baseData.baseStats.defense, pokemonData.level);
      battlePokemon.specialAttack = pokemonData.specialAttack || this.calculateStat(baseData.baseStats.specialAttack, pokemonData.level);
      battlePokemon.specialDefense = pokemonData.specialDefense || this.calculateStat(baseData.baseStats.specialDefense, pokemonData.level);
      battlePokemon.speed = pokemonData.speed || this.calculateStat(baseData.baseStats.speed, pokemonData.level);
    } else {
      battlePokemon.maxHp = pokemonData.maxHp;
      battlePokemon.currentHp = pokemonData.currentHp;
      battlePokemon.attack = pokemonData.calculatedStats?.attack || this.calculateStat(baseData.baseStats.attack, pokemonData.level);
      battlePokemon.defense = pokemonData.calculatedStats?.defense || this.calculateStat(baseData.baseStats.defense, pokemonData.level);
      battlePokemon.specialAttack = pokemonData.calculatedStats?.spAttack || this.calculateStat(baseData.baseStats.specialAttack, pokemonData.level);
      battlePokemon.specialDefense = pokemonData.calculatedStats?.spDefense || this.calculateStat(baseData.baseStats.specialDefense, pokemonData.level);
      battlePokemon.speed = pokemonData.calculatedStats?.speed || this.calculateStat(baseData.baseStats.speed, pokemonData.level);
    }
    
    // Moves
    battlePokemon.moves.clear();
    if (pokemonData.moves?.length > 0) {
      pokemonData.moves.forEach((move: any) => {
        const moveId = typeof move === 'string' ? move : move.moveId;
        if (moveId) battlePokemon.moves.push(moveId);
      });
    } else {
      // Fallback moves
      const baseMoves = baseData.learnset
        ?.filter((learn: any) => learn.level <= pokemonData.level)
        ?.slice(-4)
        ?.map((learn: any) => learn.moveId) || ["tackle"];
      
      baseMoves.forEach((move: string) => battlePokemon.moves.push(move));
    }
    
    battlePokemon.statusCondition = pokemonData.status || "normal";
    
    return battlePokemon;
  }

  // === GESTION DES TOURS AVEC TURNSYSTEM ===

  private startActualBattle() {
    console.log(`🎯 [BATTLE] Démarrage avec TurnSystem`);
    
    // ✅ NOUVEAU: Configuration TurnSystem
    const playerData = [
      { id: this.state.player1Id, type: 'human' as PlayerType, name: this.state.player1Name },
      { id: 'ai', type: 'ai' as PlayerType, name: 'Pokémon Sauvage' }
    ];
    this.turnSystem.autoConfigurePlayers(playerData);
    
    this.state.phase = "battle";
    this.state.waitingForAction = true;
    this.state.turnNumber = 1;
    
    // ✅ SIMPLIFIÉ: Qui joue en premier (vitesse)
    const player1Speed = this.state.player1Pokemon?.speed || 0;
    const player2Speed = this.state.player2Pokemon?.speed || 0;
    
    this.state.currentTurn = player1Speed >= player2Speed ? "player1" : "player2";
    
    console.log(`⚡ [BATTLE] Vitesses: P1=${player1Speed} vs P2=${player2Speed}`);
    console.log(`🎯 [BATTLE] Premier tour: ${this.state.currentTurn}`);
    
    this.broadcast("battleStart", this.getClientBattleState());
    this.updateBattleStatusIcons();
    
    // ✅ NOUVEAU: Démarrer le système de tours
    this.turnSystem.startTurn();
    this.processTurn();
  }

  private processTurn() {
    console.log(`🎲 [TURN] Tour ${this.state.currentTurn}`);
    
    if (this.state.battleEnded) {
      console.log(`🎲 [TURN] Combat terminé, arrêt`);
      return;
    }
    
    if (this.state.currentTurn === "player1") {
      this.processHumanTurn();
    } else if (this.state.currentTurn === "player2") {
      this.processAITurn();
    }
  }

  private processHumanTurn() {
    console.log(`👤 [TURN] Tour joueur humain`);
    
    this.startActionTimer();
    
    const client = this.clients.find(c => c.sessionId === this.state.player1Id);
    if (client) {
      client.send("yourTurn", { 
        timeRemaining: this.actionTimeoutMs,
        turnNumber: this.state.turnNumber
      });
    }
  }

  private processAITurn() {
    console.log(`🤖 [TURN] Tour IA`);
    
    // ✅ NOUVEAU: Délai réaliste puis action IA
    this.clock.setTimeout(() => {
      if (this.state.currentTurn === "player2" && !this.state.battleEnded) {
        this.executeAIAction();
      }
    }, 1500);
  }

  private async executeAIAction() {
    console.log(`🤖 [AI] Exécution action IA`);
    
    try {
      // ✅ SIMPLIFIÉ: Action IA basique
      const aiMoves = Array.from(this.state.player2Pokemon.moves);
      const randomMove = aiMoves[0] || "tackle";
      
      await this.battleIntegration.processAction('ai', 'attack', { moveId: randomMove });
      
      // ✅ NOUVEAU: Changer de tour manuellement (plus via callback)
      this.changeTurn();
      
    } catch (error) {
      console.error(`❌ [AI] Erreur:`, error);
      this.changeTurn(); // Continuer même en cas d'erreur
    }
  }

  private changeTurn() {
    console.log(`🔄 [TURN] Changement de tour`);
    
    // ✅ ALTERNANCE SIMPLE
    if (this.state.currentTurn === "player1") {
      this.state.currentTurn = "player2";
    } else {
      this.state.currentTurn = "player1";
    }
    
    this.state.turnNumber++;
    
    console.log(`🔄 [TURN] Nouveau tour: ${this.state.currentTurn}`);
    
    this.broadcast("battleUpdate", this.getClientBattleState());
    
    // Continuer le cycle
    this.processTurn();
  }

  // === ACTIONS DE COMBAT ===

  private async handleBattleAction(client: Client, data: any) {
    console.log(`🎮 [ACTION] ${client.sessionId}: ${data.actionType}`);
    
    if (this.state.phase !== "battle" || this.state.battleEnded) {
      client.send("error", { message: "Combat terminé" });
      return;
    }

    if (this.state.currentTurn !== "player1" || client.sessionId !== this.state.player1Id) {
      client.send("error", { message: "Ce n'est pas votre tour" });
      return;
    }

    try {
      this.clearActionTimer();
      
      await this.battleIntegration.processAction(
        client.sessionId,
        data.actionType as ActionType,
        data
      );
      
      if (this.state.battleEnded) {
        await this.handleBattleEnd();
      } else {
        this.updatePlayerHpPercentages();
        this.updateBattleStatusIcons();
        this.changeTurn(); // ✅ CHANGEMENT MANUEL
      }

    } catch (error) {
      console.error(`❌ [ACTION] Erreur:`, error);
      client.send("error", { message: "Erreur lors de l'action" });
    }
  }

  private async handleChoosePokemon(client: Client, pokemonId: string) {
    console.log(`🎯 [CHOOSE] Pokémon: ${pokemonId}`);
    
    try {
      const teamManager = this.teamManagers.get(client.sessionId);
      if (!teamManager) {
        client.send("error", { message: "TeamManager non trouvé" });
        return;
      }

      const team = await teamManager.getTeam();
      const selectedPokemon = team.find(p => p._id.toString() === pokemonId);
      
      if (!selectedPokemon || selectedPokemon.currentHp <= 0) {
        client.send("error", { message: "Pokémon invalide" });
        return;
      }

      // ✅ SIMPLIFIÉ: Pour l'instant, juste confirmation
      client.send("pokemonChosen", { pokemon: selectedPokemon });

    } catch (error) {
      console.error(`❌ [CHOOSE] Erreur:`, error);
      client.send("error", { message: "Erreur lors de la sélection" });
    }
  }

  // === ACTIONS SPÉCIALES ===

  private async handleCaptureAttempt(client: Client, ballType: string) {
    if (this.state.battleType !== "wild") {
      client.send("error", { message: "Impossible de capturer un Pokémon de dresseur !" });
      return;
    }
    
    console.log(`🎯 [CAPTURE] Tentative avec ${ballType}`);
    
    try {
      this.updatePlayerStatusIcon(client.sessionId, "capturing");
      
      const captureAttempt: CaptureAttempt = {
        pokemonId: this.state.player2Pokemon.pokemonId,
        pokemonLevel: this.state.player2Pokemon.level,
        currentHp: this.state.player2Pokemon.currentHp,
        maxHp: this.state.player2Pokemon.maxHp,
        statusCondition: this.state.player2Pokemon.statusCondition,
        ballType: ballType,
        location: this.state.encounterLocation
      };

      const pokemonData = await getPokemonById(this.state.player2Pokemon.pokemonId);
      const captureResult = CaptureManager.calculateCaptureRate(captureAttempt, pokemonData);
      
      this.addBattleMessage(`${this.state.player1Name} lance une ${ballType} !`);
      
      // Animation simple
      this.broadcast("captureStart", { ballType });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (captureResult.success) {
        this.addBattleMessage(`Gotcha ! ${this.state.player2Pokemon.name} a été capturé !`);
        this.state.pokemonCaught = true;
        this.state.battleEnded = true;
        this.state.winner = this.state.player1Id;
        this.broadcast("captureSuccess", { pokemon: this.serializePokemon(this.state.player2Pokemon) });
        await this.handleBattleEnd();
      } else {
        this.addBattleMessage(`${this.state.player2Pokemon.name} s'est échappé !`);
        this.broadcast("captureFailure");
        this.changeTurn(); // ✅ Tour IA après échec
      }
      
    } catch (error) {
      console.error(`❌ [CAPTURE] Erreur:`, error);
      client.send("error", { message: "Erreur lors de la capture" });
    }
  }

  private async handleFleeAttempt(client: Client) {
    if (this.state.battleType !== "wild") {
      client.send("error", { message: "Impossible de fuir un combat de dresseur !" });
      return;
    }
    
    console.log(`🏃 [FLEE] Tentative de fuite`);
    
    try {
      // ✅ SIMPLIFIÉ: Fuite toujours réussie pour test
      this.addBattleMessage(`${this.state.player1Name} s'enfuit !`);
      this.state.battleEnded = true;
      this.state.phase = "fled";
      this.updatePlayerStatusIcon(client.sessionId, "battle_fled");
      await this.handleBattleEnd();
      
    } catch (error) {
      console.error(`❌ [FLEE] Erreur:`, error);
      client.send("error", { message: "Erreur lors de la fuite" });
    }
  }

  // === UTILITAIRES ===

  private calculateStat(baseStat: number, level: number): number {
    return Math.floor(((2 * baseStat + 31) * level) / 100) + 5;
  }

  private canStartBattle(): boolean {
    return this.clients.length >= 1 && 
           this.state.player1Id !== "" && 
           this.teamManagers.size >= 1;
  }

  private getPlayerName(sessionId: string): string | null {
    if (sessionId === this.battleInitData.playerData.sessionId) {
      return this.battleInitData.playerData.name;
    }
    if (this.battleInitData.player2Data?.sessionId === sessionId) {
      return this.battleInitData.player2Data.name;
    }
    return null;
  }

  private addBattleMessage(message: string) {
    this.state.battleLog.push(message);
    this.state.lastMessage = message;
    
    if (this.state.battleLog.length > 50) {
      this.state.battleLog.splice(0, this.state.battleLog.length - 50);
    }
    
    console.log(`💬 [COMBAT] ${message}`);
    this.broadcast("battleMessage", { message });
  }

  private serializePokemon(pokemon: BattlePokemon) {
    if (!pokemon) return null;
    
    return {
      pokemonId: pokemon.pokemonId,
      name: pokemon.name,
      level: pokemon.level,
      currentHp: pokemon.currentHp,
      maxHp: pokemon.maxHp,
      types: Array.from(pokemon.types),
      moves: Array.from(pokemon.moves),
      statusCondition: pokemon.statusCondition,
      gender: pokemon.gender,
      shiny: pokemon.shiny,
      isWild: pokemon.isWild,
      attack: pokemon.attack,
      defense: pokemon.defense,
      specialAttack: pokemon.specialAttack,
      specialDefense: pokemon.specialDefense,
      speed: pokemon.speed,
      attackStage: pokemon.attackStage,
      defenseStage: pokemon.defenseStage,
      speedStage: pokemon.speedStage
    };
  }

  private getClientBattleState() {
    return {
      phase: this.state.phase,
      currentTurn: this.state.currentTurn,
      player1Pokemon: this.serializePokemon(this.state.player1Pokemon),
      player2Pokemon: this.serializePokemon(this.state.player2Pokemon),
      battleLog: Array.from(this.state.battleLog),
      turnNumber: this.state.turnNumber,
      battleEnded: this.state.battleEnded,
      winner: this.state.winner,
      lastMessage: this.state.lastMessage
    };
  }

  private updatePlayerHpPercentages() {
    if (this.state.player1Pokemon?.maxHp > 0) {
      const hp1 = (this.state.player1Pokemon.currentHp / this.state.player1Pokemon.maxHp) * 100;
      this.playerHpPercentages.set(this.state.player1Id, hp1);
    }
  }

  private updateBattleStatusIcons() {
    this.clients.forEach(client => {
      const hpPercent = this.playerHpPercentages.get(client.sessionId) || 100;
      let newIcon: BattleStatusIcon;
      
      if (hpPercent > 70) {
        newIcon = "battle_advantage";
      } else if (hpPercent > 30) {
        newIcon = "battle_struggling";
      } else {
        newIcon = "battle_critical";
      }
      
      const lastIcon = this.lastStatusIcons.get(client.sessionId);
      if (lastIcon !== newIcon) {
        this.updatePlayerStatusIcon(client.sessionId, newIcon);
      }
    });
  }

  private updatePlayerStatusIcon(sessionId: string, icon: BattleStatusIcon) {
    this.lastStatusIcons.set(sessionId, icon);
    
    if (this.worldRoomRef) {
      try {
        this.worldRoomRef.broadcast("playerStatusIcon", {
          playerId: sessionId,
          icon: icon,
          iconEmoji: this.getIconEmoji(icon)
        });
      } catch (error) {
        console.error(`❌ Erreur mise à jour icône:`, error);
      }
    }
  }

  private getIconEmoji(icon: BattleStatusIcon): string {
    const iconMap = {
      "entering_battle": "⚔️",
      "battle_advantage": "😤", 
      "battle_struggling": "😰",
      "battle_critical": "😵",
      "battle_victory": "🎉",
      "battle_defeat": "😢",
      "battle_fled": "🏃",
      "capturing": "🎯",
      "switching_pokemon": "🔄"
    };
    
    return iconMap[icon] || "❓";
  }

  // === TIMERS ===

  private startActionTimer() {
    this.clearActionTimer();
    this.currentActionTimer = setTimeout(() => {
      console.log(`⏰ [TIMER] Timeout joueur`);
      this.handleDefaultAction();
    }, this.actionTimeoutMs);
  }

  private clearActionTimer() {
    if (this.currentActionTimer) {
      clearTimeout(this.currentActionTimer);
      this.currentActionTimer = undefined;
    }
  }

  private async handleDefaultAction() {
    if (this.state.battleEnded || this.state.currentTurn !== "player1") return;
    
    try {
      const moves = Array.from(this.state.player1Pokemon.moves);
      const defaultMove = moves[0] || "tackle";
      
      await this.battleIntegration.processAction(
        this.state.player1Id,
        'attack' as ActionType,
        { moveId: defaultMove }
      );
      
      this.changeTurn();
      
    } catch (error) {
      console.error(`❌ [TIMER] Erreur action par défaut:`, error);
      this.changeTurn();
    }
  }

  // === GESTION WORLDROOM ===

  private blockPlayerInWorldRoom(sessionId: string, reason: string) {
    if (this.worldRoomRef) {
      try {
        this.worldRoomRef.blockPlayerMovement(sessionId, "battle", 0, { reason });
      } catch (error) {
        console.error(`❌ Erreur blocage mouvement:`, error);
      }
    }
  }

  private unblockPlayerInWorldRoom(sessionId: string) {
    if (this.worldRoomRef) {
      try {
        this.worldRoomRef.unblockPlayerMovement(sessionId, "battle");
      } catch (error) {
        console.error(`❌ Erreur déblocage mouvement:`, error);
      }
    }
  }

  // === FIN DE COMBAT ===

  private async handleBattleEnd() {
    console.log(`🏁 [END] Fin de combat`);
    
    this.clearActionTimer();
    
    let endType: "victory" | "defeat" | "fled" | "draw" = "victory";
    
    if (this.state.pokemonCaught) {
      endType = "victory";
      this.updatePlayerStatusIcon(this.state.player1Id, "battle_victory");
    } else if (this.state.winner === this.state.player1Id) {
      endType = "victory";
      this.updatePlayerStatusIcon(this.state.player1Id, "battle_victory");
    } else if (this.state.phase === "fled") {
      endType = "fled";
      this.updatePlayerStatusIcon(this.state.player1Id, "battle_fled");
    } else {
      endType = "defeat";
      this.updatePlayerStatusIcon(this.state.player1Id, "battle_defeat");
    }
    
    const rewards = {
      experience: 50,
      gold: Math.floor(Math.random() * 100),
      items: [] as string[],
      pokemonCaught: this.state.pokemonCaught
    };
    
    this.broadcast("battleEnd", {
      result: endType,
      rewards: rewards,
      finalLog: Array.from(this.state.battleLog)
    });
    
    this.clock.setTimeout(() => this.disconnect(), 5000);
  }

  private endBattleEarly(reason: string) {
    console.log(`⚠️ [EARLY] Arrêt prématuré: ${reason}`);
    
    this.state.phase = "ended";
    this.state.battleEnded = true;
    this.clearActionTimer();
    
    this.addBattleMessage(`Combat interrompu: ${reason}`);
    this.broadcast("battleInterrupted", { reason });
    
    this.clock.setTimeout(() => this.disconnect(), 2000);
  }

  private cleanupPlayer(sessionId: string) {
    this.unblockPlayerInWorldRoom(sessionId);
    this.lastStatusIcons.delete(sessionId);
    this.teamManagers.delete(sessionId);
    this.playerHpPercentages.delete(sessionId);
    
    if (this.worldRoomRef) {
      try {
        this.worldRoomRef.broadcast("playerStatusIcon", {
          playerId: sessionId,
          icon: null,
          iconEmoji: null
        });
      } catch (error) {
        console.error(`❌ Erreur nettoyage icône:`, error);
      }
    }
  }

  async onDispose() {
    console.log(`💀 [DISPOSE] BattleRoom ${this.roomId} détruite`);
    
    this.clearActionTimer();
    
    this.clients.forEach(client => {
      this.cleanupPlayer(client.sessionId);
    });
    
    console.log(`✅ [DISPOSE] Nettoyage terminé`);
  }
}
