// server/src/rooms/BattleRoom.ts - VERSION TURNSYSTEM INTÉGRÉE
import { Room, Client } from "@colyseus/core";
import { BattleState, BattlePokemon, BattleAction } from "../schema/BattleState";
import { BattleIntegration } from '../managers/battle/BattleIntegration';
import { ActionType } from '../managers/battle/types/BattleTypes';
import { IBattleRoomCallbacks } from '../managers/battle/BattleSequencer';
import { MoveManager } from "../managers/MoveManager";
import { CaptureManager, CaptureAttempt } from "../managers/battle/CaptureManager";
import { BattleEndManager, BattleEndCondition, BattleRewards, BattleContext, BattleParticipant } from "../managers/battle/BattleEndManager";
import { DamageManager } from "../managers/battle/DamageManager";
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
  
  // ✅ NOUVEAU: TurnSystem devient le chef
  private actionTimeoutMs = 30000;
  private playerHpPercentages: Map<string, number> = new Map();
  private lastStatusIcons: Map<string, BattleStatusIcon> = new Map();

  // Contexte de combat pour BattleEndManager
  private battleContext!: BattleContext;
  private battleStartTime!: Date;

  maxClients = 2;

  async onCreate(options: BattleInitData) {
    console.log(`⚔️ [BattleRoom] Création avec TurnSystem chef`);
    console.log(`🎯 Type: ${options.battleType}, Joueur: ${options.playerData.name}`);
    
    this.battleInitData = options;
    this.setState(new BattleState());
    
    // Configuration de base
    this.state.battleId = `${options.battleType}_${Date.now()}_${this.roomId}`;
    this.state.battleType = options.battleType;
    this.state.phase = "waiting";

    // ✅ Initialiser les systèmes de combat
    this.battleIntegration = new BattleIntegration();
    
    const config = options.battleType === 'wild' 
      ? BATTLE_CONFIGS.SINGLE_PVE 
      : BATTLE_CONFIGS.SINGLE_PVP;
    this.turnSystem = new TurnSystem(config);
    
    await MoveManager.initialize();
    await this.setupWorldRoomConnection();
    this.setupMessageHandlers();
    
    console.log(`✅ BattleRoom ${this.roomId} créée avec TurnSystem`);
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
    // ✅ NOUVEAU: TurnSystem gère les actions
    this.onMessage("battleAction", async (client, data: {
      actionType: "attack" | "item" | "switch" | "run";
      moveId?: string;
      itemId?: string;
      targetPokemonId?: string;
    }) => {
      await this.handleTurnSystemAction(client, data);
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
    
    // Créer les BattlePokemon
    this.state.player1Pokemon = await this.createBattlePokemon(firstPokemon, false);
    
    if (this.battleInitData.wildPokemon) {
      this.state.player2Pokemon = await this.createBattlePokemon(this.battleInitData.wildPokemon, true);
    }
    
    // ✅ NOUVEAU: Initialiser BattleIntegration avec callbacks
    const callbacks = this.createBattleCallbacks();
    const participants = this.createParticipants();
    
    this.battleIntegration.initializeBattle(callbacks, 'wild', participants);
    
    this.startTurnSystemBattle();
  }

  // === ✅ NOUVEAU: DÉMARRAGE AVEC TURNSYSTEM ===

  private startTurnSystemBattle() {
    console.log(`🎯 [TURNSYSTEM] Démarrage avec TurnSystem chef`);
    
    // Initialiser le contexte de combat
    this.battleStartTime = new Date();
    this.initializeBattleContext();
    
    // ✅ Configuration TurnSystem avec les vrais joueurs
    const playerData = [
      { id: this.state.player1Id, type: 'human' as PlayerType, name: this.state.player1Name },
      { id: 'ai', type: 'ai' as PlayerType, name: 'Pokémon Sauvage' }
    ];
    
    this.turnSystem.autoConfigurePlayers(playerData);
    
    this.state.phase = "battle";
    this.state.waitingForAction = true;
    this.state.turnNumber = 1;
    
    // ✅ TurnSystem détermine qui joue en premier
    const player1Speed = this.state.player1Pokemon?.speed || 0;
    const player2Speed = this.state.player2Pokemon?.speed || 0;
    
    // Mettre à jour le state pour l'interface
    this.state.currentTurn = player1Speed >= player2Speed ? "player1" : "player2";
    
    console.log(`⚡ [TURNSYSTEM] Vitesses: P1=${player1Speed} vs P2=${player2Speed}`);
    console.log(`🎯 [TURNSYSTEM] Premier tour: ${this.state.currentTurn}`);
    
    this.broadcast("battleStart", this.getClientBattleState());
    this.updateBattleStatusIcons();
    
    // ✅ DÉMARRER TurnSystem et laisser faire
    this.turnSystem.startTurn();
    this.notifyCurrentPlayer();
  }

private notifyCurrentPlayer() {
  console.log(`📢 [TURNSYSTEM] Notification tour: ${this.state.currentTurn}`);
  
  if (this.state.currentTurn === "player1") {
    const client = this.clients.find(c => c.sessionId === this.state.player1Id);
    if (client) {
      client.send("yourTurn", { 
        timeRemaining: this.actionTimeoutMs,
        turnNumber: this.state.turnNumber
      });
    }
  } else if (this.state.currentTurn === "player2") {
    // ✅ DÉLAI PLUS RÉALISTE POUR L'IA
    const aiThinkingTime = 2000 + Math.random() * 2000; // Entre 2 et 4 secondes
    
    console.log(`🤖 [AI] Réflexion pendant ${aiThinkingTime}ms...`);
    
    this.clock.setTimeout(() => {
      if (!this.state.battleEnded) {
        this.executeAITurnAction();
      }
    }, aiThinkingTime);  // ✅ Délai variable pour plus de réalisme
  }
}

  // === ✅ NOUVEAU: GESTION DES ACTIONS VIA TURNSYSTEM ===

  private async handleTurnSystemAction(client: Client, data: any) {
    console.log(`🎮 [TURNSYSTEM] Action ${client.sessionId}: ${data.actionType}`);

      // ✅ AJOUTER CES LOGS
  console.log(`🔍 [DEBUG] Phase: ${this.state.phase}, BattleEnded: ${this.state.battleEnded}`);
  console.log(`🔍 [DEBUG] canPlayerAct: ${this.turnSystem.canPlayerAct(client.sessionId)}`);

    
    if (this.state.phase !== "battle" || this.state.battleEnded) {
      client.send("error", { message: "Combat terminé" });
      return;
    }

    // ✅ Vérifier que c'est le tour du joueur via TurnSystem
    if (!this.turnSystem.canPlayerAct(client.sessionId)) {
      client.send("error", { message: "Ce n'est pas votre tour" });
      return;
    }

    try {
      // ✅ Soumettre l'action au TurnSystem
      const actionSubmitted = this.turnSystem.submitAction(client.sessionId, {
        type: data.actionType,
        moveId: data.moveId,
        itemId: data.itemId,
        targetPokemonId: data.targetPokemonId
      });

      if (!actionSubmitted) {
        client.send("error", { message: "Action refusée par TurnSystem" });
        return;
      }

      // ✅ Exécuter l'action via BattleIntegration
      await this.executePlayerAction(client.sessionId, data);
      
      // ✅ Mettre à jour le contexte et vérifier fin
      this.updateBattleContext();
      
      const endCondition = BattleEndManager.checkEndConditions(this.battleContext);
      if (endCondition) {
        console.log(`🏁 [TURNSYSTEM] Condition de fin détectée:`, endCondition);
        await this.processBattleEndWithManager(endCondition);
        return;
      }
      
      // ✅ TurnSystem gère automatiquement le prochain tour
      this.proceedToNextTurn();

    } catch (error) {
      console.error(`❌ [TURNSYSTEM] Erreur action:`, error);
      client.send("error", { message: "Erreur lors de l'action" });
    }
  }

  private async executePlayerAction(playerId: string, data: any) {
    console.log(`⚔️ [EXECUTE] Action joueur: ${data.actionType}`);
    
    await this.battleIntegration.processAction(
      playerId,
      data.actionType as ActionType,
      data
    );
  }

  private async executeAITurnAction() {
    console.log(`🤖 [AI] Exécution action IA via TurnSystem`);
    
    try {
      // ✅ Vérifier que l'IA peut jouer
      if (!this.turnSystem.canPlayerAct('ai')) {
        console.log(`🤖 [AI] IA ne peut pas jouer maintenant`);
        return;
      }

      // ✅ Soumettre action IA au TurnSystem
      const aiMoves = Array.from(this.state.player2Pokemon.moves);
      const randomMove = aiMoves[0] || "tackle";
      
      const actionSubmitted = this.turnSystem.submitAction('ai', {
        type: 'attack',
        moveId: randomMove
      });

      if (!actionSubmitted) {
        console.error(`❌ [AI] Action IA refusée par TurnSystem`);
        return;
      }

      // ✅ Exécuter l'action IA
      await this.battleIntegration.processAction('ai', 'attack', { moveId: randomMove });
      
      // ✅ Mettre à jour et vérifier fin
      this.updateBattleContext();
      
      const endCondition = BattleEndManager.checkEndConditions(this.battleContext);
      if (endCondition) {
        console.log(`🏁 [AI] Condition de fin détectée:`, endCondition);
        await this.processBattleEndWithManager(endCondition);
        return;
      }
      
      // ✅ TurnSystem gère le prochain tour
      this.proceedToNextTurn();
      
    } catch (error) {
      console.error(`❌ [AI] Erreur:`, error);
      this.proceedToNextTurn(); // Continuer même en cas d'erreur
    }
  }

  private proceedToNextTurn() {
    console.log(`🔄 [TURNSYSTEM] Passage au tour suivant`);
    
    // ✅ LAISSER TurnSystem déterminer le prochain joueur
    const turnState = this.turnSystem.getState();
    
    // Mettre à jour l'état pour l'interface
    if (this.state.currentTurn === "player1") {
      this.state.currentTurn = "player2";
    } else {
      this.state.currentTurn = "player1";
    }
    
    this.state.turnNumber++;
    this.battleContext.turnNumber = this.state.turnNumber;
      // ✅ AJOUTER CETTE LIGNE CRUCIALE
    this.turnSystem.startTurn();
    console.log(`🔄 [TURNSYSTEM] Nouveau tour: ${this.state.currentTurn} (${this.state.turnNumber})`);
    
    this.broadcast("battleUpdate", this.getClientBattleState());
    
    // ✅ Notifier le joueur actuel
    this.notifyCurrentPlayer();
  }

  // === CALLBACKS BATTLEINTEGRATION (SIMPLIFIÉS) ===

  private createBattleCallbacks(): IBattleRoomCallbacks {
    return {
      broadcastMessage: (messageId: string, data: any) => {
        console.log(`📡 [BattleRoom] Broadcasting message: ${messageId}`);
        
        const displayMessage = data.message || messageId;
        this.addBattleMessage(displayMessage);
        
        this.broadcast('battleMessage', {
          messageId,
          message: displayMessage,
          variables: data.variables || {},
          timing: data.timing || 2000
        });
      },

      broadcastUpdate: (updateData: any) => {
        console.log(`📡 [BattleRoom] Broadcasting update`);
        this.broadcast('battleUpdate', {
          ...updateData,
          battleState: this.getClientBattleState()
        });
      },

updatePokemonHP: (pokemonId: string, newHp: number) => {
  console.log(`🩹 [CALLBACK] HP Update: ${pokemonId} → ${newHp}`);
  
  const result = DamageManager.updatePokemonHP(
    pokemonId, 
    newHp, 
    this.state, 
    this.battleContext,
    'attack'
  );
  
  if (result) {
    // ✅ MAPPER sessionId vers player1/player2
    let targetPlayer: 'player1' | 'player2';
    
    if (result.targetPlayerId === this.state.player1Id || result.targetPlayerId === 'ai' && this.state.player1Id === '') {
      targetPlayer = 'player1';
    } else {
      targetPlayer = 'player2';
    }
    
    // Pour un combat sauvage, l'IA est toujours player2
    if (this.state.battleType === 'wild' && result.targetPlayerId === 'ai') {
      targetPlayer = 'player2';
    }
    
    console.log(`✅ [CALLBACK] Mapping ${result.targetPlayerId} → ${targetPlayer}`);
    
    this.broadcast('pokemonHPUpdate', {
      pokemonId: pokemonId,
      targetPlayer: targetPlayer,  // ✅ Maintenant c'est "player1" ou "player2"
      oldHp: result.oldHp,
      newHp: result.newHp,
      damage: result.damage,
      isKnockedOut: result.wasKnockedOut,
      pokemonName: result.pokemonName
    });
  }
},

      // ✅ SIMPLIFIÉ: Ne plus gérer les tours ici
      changeTurn: (newTurn: string) => {
        console.log(`🔄 [CALLBACK] TurnSystem notification: ${newTurn} (ignoré)`);
        // ✅ TurnSystem gère maintenant
      },

      endBattle: (result: any) => {
        console.log(`🏁 [CALLBACK] Fin combat:`, result);
        
        this.state.battleEnded = true;
        this.state.winner = result.winner || '';
        
        if (result.result === 'fled') {
          this.state.phase = 'fled';
        } else if (result.result === 'captured') {
          this.state.phase = 'ended';
          this.state.pokemonCaught = true;
        } else {
          this.state.phase = 'ended';
        }
        
        this.handleBattleEnd();
      },

      logBattleEvent: (event: any) => {
        console.log(`📝 [EVENT] ${event.type}`);
        
        if (this.state.battleLog.length < 100) {
          const logMessage = `[${event.type.toUpperCase()}] ${event.data?.message || event.message || 'Event triggered'}`;
          this.addBattleMessage(logMessage);
        }
      }
    };
  }

  // === CRÉATION DES COMPOSANTS (INCHANGÉ) ===

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

    battlePokemon.pokemonId = pokemonData.pokemonId;
    battlePokemon.name = isWild ? baseData.name : (pokemonData.customName || baseData.name);
    battlePokemon.level = pokemonData.level;
    battlePokemon.isWild = isWild;
    battlePokemon.gender = pokemonData.gender || 'unknown';
    battlePokemon.shiny = pokemonData.shiny || false;
    
    battlePokemon.types.clear();
    (pokemonData.types || baseData.types).forEach((type: string) => {
      battlePokemon.types.push(type);
    });
    
    if (isWild) {
      battlePokemon.maxHp = pokemonData.hp || this.calculateHPStat(baseData.baseStats.hp, pokemonData.level);
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
    
    battlePokemon.moves.clear();
    if (pokemonData.moves?.length > 0) {
      pokemonData.moves.forEach((move: any) => {
        const moveId = typeof move === 'string' ? move : move.moveId;
        if (moveId) battlePokemon.moves.push(moveId);
      });
    } else {
      const baseMoves = baseData.learnset
        ?.filter((learn: any) => learn.level <= pokemonData.level)
        ?.slice(-4)
        ?.map((learn: any) => learn.moveId) || ["tackle"];
      
      baseMoves.forEach((move: string) => battlePokemon.moves.push(move));
    }
    
    battlePokemon.statusCondition = pokemonData.status || "normal";
    
    return battlePokemon;
  }

  // === ACTIONS SPÉCIALES (INCHANGÉ) ===

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

      client.send("pokemonChosen", { pokemon: selectedPokemon });

    } catch (error) {
      console.error(`❌ [CHOOSE] Erreur:`, error);
      client.send("error", { message: "Erreur lors de la sélection" });
    }
  }

  private async handleCaptureAttempt(client: Client, ballType: string) {
    if (this.state.battleType !== "wild") {
      client.send("error", { message: "Impossible de capturer un Pokémon de dresseur !" });
      return;
    }
    
    console.log(`🎯 [CAPTURE] Tentative avec ${ballType}`);
    
    try {
      const pokemonData = await getPokemonById(this.state.player2Pokemon.pokemonId);
      if (!pokemonData) {
        client.send("error", { message: "Données Pokémon introuvables" });
        return;
      }

      if (!CaptureManager.canCapture(this.state.battleType, pokemonData)) {
        client.send("error", { message: "Ce Pokémon ne peut pas être capturé" });
        return;
      }

      this.updatePlayerStatusIcon(client.sessionId, "capturing");
      
      const attempt: CaptureAttempt = {
        pokemonId: this.state.player2Pokemon.pokemonId,
        pokemonLevel: this.state.player2Pokemon.level,
        currentHp: this.state.player2Pokemon.currentHp,
        maxHp: this.state.player2Pokemon.maxHp,
        statusCondition: this.state.player2Pokemon.statusCondition,
        ballType: ballType,
        location: this.state.encounterLocation || 'unknown'
      };

      const validationError = CaptureManager.validateCaptureAttempt(attempt);
      if (validationError) {
        client.send("error", { message: validationError });
        return;
      }

      console.log(`🎯 [CAPTURE] Démarrage capture avec CaptureManager...`);

      const result = await CaptureManager.processCaptureAttempt(
        attempt,
        this.state.player2Pokemon.name,
        this.state.player1Name,
        { 
          turnNumber: this.state.turnNumber,
          timeOfDay: 'day',
          location: this.state.encounterLocation,
          isFirstCapture: false
        },
        {
          onMessage: (message: string) => {
            this.addBattleMessage(message);
          },
          
          onAnimationStep: (animation: any) => {
            console.log(`🎬 [CAPTURE] Animation: ${animation.phase} - ${animation.message}`);
            this.broadcast("captureAnimation", {
              phase: animation.phase,
              shakeNumber: animation.shakeNumber,
              totalShakes: animation.totalShakes,
              message: animation.message,
              sound: animation.sound
            });
          },
          
          onCaptureSuccess: (capturedPokemon: any) => {
            console.log(`✅ [CAPTURE] Succès !`);
            this.handlePokemonCaptured(capturedPokemon);
          },
          
          onCaptureFailed: () => {
            console.log(`❌ [CAPTURE] Échec`);
            this.handleCaptureFailure();
          }
        }
      );

      console.log(`🎯 [CAPTURE] Résultat:`, {
        success: result.success,
        criticalCapture: result.criticalCapture,
        shakeCount: result.shakeCount
      });
      
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

  // === GESTION DU CONTEXTE (INCHANGÉ) ===

  private updateBattleContext() {
    console.log(`🔄 [CONTEXT] Mise à jour contexte`);
    
    this.battleContext.participants.forEach((participant, index) => {
      if (participant.sessionId === this.state.player1Id) {
        participant.activePokemon = this.state.player1Pokemon;
        participant.team = [this.state.player1Pokemon];
        participant.isConnected = this.clients.some(c => c.sessionId === this.state.player1Id);
      } else if (participant.sessionId === 'ai') {
        participant.activePokemon = this.state.player2Pokemon;
        participant.team = [this.state.player2Pokemon];
      }
    });
    
    this.battleContext.turnNumber = this.state.turnNumber;
    DamageManager.syncStatisticsToContext(this.battleContext);
  }

  private async processBattleEndWithManager(endCondition: BattleEndCondition) {
    console.log(`🏆 [BATTLE] Traitement fin avec BattleEndManager`);
    
    try {
      const rewards = await BattleEndManager.processBattleEnd(
        endCondition,
        this.battleContext,
        {
          onExperienceGained: (pokemonId: number, expGained: number, newLevel?: number) => {
            console.log(`📈 [EXP] Pokémon ${pokemonId} gagne ${expGained} XP`);
            this.addBattleMessage(`${this.getPokemonName(pokemonId)} gagne ${expGained} points d'expérience !`);
          },
          
          onMoneyGained: (amount: number) => {
            console.log(`💰 [MONEY] +${amount} argent`);
            this.addBattleMessage(`Vous trouvez ${amount}₽ !`);
          },
          
          onAchievementUnlocked: (achievementId: string) => {
            console.log(`🏆 [ACHIEVEMENT] ${achievementId} débloqué`);
            this.addBattleMessage(`Achievement débloqué: ${achievementId} !`);
          },
          
          onPokemonStateUpdate: (pokemonId: number, newState: any) => {
            console.log(`💾 [SAVE] État Pokémon ${pokemonId} sauvé`);
          },
          
          onPlayerStatsUpdate: (playerId: string, stats: any) => {
            console.log(`📊 [STATS] Statistiques mises à jour pour ${playerId}`);
          }
        }
      );
      
      this.state.battleEnded = true;
      this.state.winner = endCondition.winner || '';
      this.state.phase = endCondition.result === 'fled' ? 'fled' : 'ended';
      
      let iconType: BattleStatusIcon = "battle_victory";
      if (endCondition.result === 'defeat') {
        iconType = "battle_defeat";
      } else if (endCondition.result === 'fled') {
        iconType = "battle_fled";
      }
      
      this.updatePlayerStatusIcon(this.state.player1Id, iconType);
      
      this.broadcast("battleEndWithRewards", {
        result: endCondition.result,
        reason: endCondition.reason,
        rewards: rewards,
        finalLog: Array.from(this.state.battleLog),
        battleStats: {
          duration: Date.now() - this.battleStartTime.getTime(),
          totalTurns: this.state.turnNumber,
          damageDealt: DamageManager.getTotalDamageDealt(this.state.player1Id),
          damageReceived: DamageManager.getTotalDamageReceived(this.state.player1Id),
          pokemonKnockedOut: DamageManager.getPokemonKnockedOut(this.state.player1Id)
        }
      });
      
      console.log(`🏆 [BATTLE] Fin traitée avec succès`);
      
      this.clock.setTimeout(() => this.disconnect(), 8000);
      
    } catch (error) {
      console.error(`💥 [BATTLE] Erreur traitement fin:`, error);
      await this.handleBattleEnd();
    }
  }

  private initializeBattleContext() {
    console.log(`🎮 [CONTEXT] Initialisation du contexte de combat`);
    
    const participants: BattleParticipant[] = [
      {
        sessionId: this.state.player1Id,
        name: this.state.player1Name,
        isAI: false,
        activePokemon: this.state.player1Pokemon,
        team: [this.state.player1Pokemon],
        isConnected: true
      },
      {
        sessionId: 'ai',
        name: 'Pokémon Sauvage',
        isAI: true,
        activePokemon: this.state.player2Pokemon,
        team: [this.state.player2Pokemon],
        isConnected: true
      }
    ];

    this.battleContext = {
      battleId: this.state.battleId,
      battleType: this.state.battleType as any,
      turnNumber: 1,
      startTime: this.battleStartTime,
      location: this.state.encounterLocation || 'unknown',
      participants,
      damageDealt: new Map(),
      damageReceived: new Map(),
      pokemonDefeated: new Map()
    };

    const playerIds = [this.state.player1Id, 'ai'];
    DamageManager.initializeForBattle(playerIds);

    console.log(`✅ [CONTEXT] Contexte initialisé`);
  }

  private handlePokemonCaptured(capturedPokemon: any) {
    console.log(`🎊 [CAPTURE] Pokémon capturé avec succès !`);
    
    this.state.pokemonCaught = true;
    this.state.battleEnded = true;
    this.state.winner = this.state.player1Id;
    this.state.phase = "ended";
    
    this.broadcast("captureSuccess", { 
      pokemon: {
        ...this.serializePokemon(this.state.player2Pokemon),
        captureInfo: capturedPokemon.captureInfo,
        ivs: capturedPokemon.ivs,
        nature: capturedPokemon.nature
      },
      criticalCapture: capturedPokemon.captureInfo?.criticalCapture || false
    });
    
    this.handleBattleEnd();
  }

  private handleCaptureFailure() {
    console.log(`💔 [CAPTURE] Échec de capture`);
    
    this.broadcast("captureFailure", {
      pokemon: this.serializePokemon(this.state.player2Pokemon)
    });
    
    // ✅ Le combat continue via TurnSystem
    this.proceedToNextTurn();
  }

  // === MÉTHODES UTILITAIRES (INCHANGÉES) ===

  private getPokemonName(pokemonId: number): string {
    if (this.state.player1Pokemon?.pokemonId === pokemonId) {
      return this.state.player1Pokemon.name;
    }
    if (this.state.player2Pokemon?.pokemonId === pokemonId) {
      return this.state.player2Pokemon.name;
    }
    return `Pokémon #${pokemonId}`;
  }

  private calculateStat(baseStat: number, level: number): number {
    return Math.floor(((2 * baseStat + 31) * level) / 100) + 5;
  }

  private calculateHPStat(baseStat: number, level: number): number {
    return Math.floor(((2 * baseStat + 31) * level) / 100) + level + 10;
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

  private async handleBattleEnd() {
    console.log(`🏁 [END] Fin de combat`);
    
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
    
    this.clients.forEach(client => {
      this.cleanupPlayer(client.sessionId);
    });
    
    DamageManager.cleanup();
    console.log(`✅ [DISPOSE] Nettoyage terminé`);
  }
}
