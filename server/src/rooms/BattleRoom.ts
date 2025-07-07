// server/src/rooms/BattleRoom.ts - VERSION NETTOYÉE AVEC TURNSYSTEM + FIXES
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
  
  // Gestion des tours et timings
  private actionTimeoutMs = 30000;
  private currentActionTimer?: NodeJS.Timeout;
  private playerHpPercentages: Map<string, number> = new Map();
  private lastStatusIcons: Map<string, BattleStatusIcon> = new Map();

  // ✅ NOUVEAU: Contexte de combat pour BattleEndManager
  private battleContext!: BattleContext;
  private battleStartTime!: Date;

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

  /**
   * ✅ CORRIGÉ: Crée les callbacks pour BattleIntegration
   */
  private createBattleCallbacks(): IBattleRoomCallbacks {
    return {
      /**
       * Diffuse un message de combat à tous les clients
       */
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

      /**
       * Diffuse une mise à jour générale de combat
       */
      broadcastUpdate: (updateData: any) => {
        console.log(`📡 [BattleRoom] Broadcasting update`);
        
        if (updateData.phase) {
          this.state.phase = updateData.phase;
        }
        
        if (updateData.currentTurn) {
          this.state.currentTurn = updateData.currentTurn;
        }
        
        this.broadcast('battleUpdate', {
          ...updateData,
          battleState: this.getClientBattleState()
        });
      },

      /**
       * ✅ CALLBACK PRINCIPAL CORRIGÉ - Met à jour les HP d'un Pokémon
       */
      updatePokemonHP: (pokemonId: string, newHp: number) => {
        console.log(`🩹 [CALLBACK] DamageManager.updatePokemonHP appelé`);
        console.log(`🔍 [CALLBACK DEBUG] === DÉTAILS CALLBACK ===`);
        console.log(`🔍 [CALLBACK DEBUG] pokemonId: ${pokemonId}`);
        console.log(`🔍 [CALLBACK DEBUG] newHp reçu: ${newHp}`);
        
        const currentHpInState = this.getCurrentHPFromState(pokemonId);
        console.log(`🔍 [CALLBACK DEBUG] HP actuel dans state: ${currentHpInState}`);
        
        if (currentHpInState !== null) {
          const expectedDamage = currentHpInState - newHp;
          console.log(`🔍 [CALLBACK DEBUG] Différence attendue: ${currentHpInState} → ${newHp} = ${expectedDamage} dégâts`);
        }
        
        // ✅ VALIDATIONS DE SÉCURITÉ
        if (newHp < 0) {
          console.error(`🚨 [CALLBACK ERROR] newHp négatif: ${newHp} pour pokemonId: ${pokemonId}`);
          newHp = 0;
        }
        
        if (currentHpInState !== null && newHp > currentHpInState + 100) {
          console.error(`🚨 [CALLBACK ERROR] newHp trop élevé: ${newHp} vs actuel: ${currentHpInState} pour pokemonId: ${pokemonId}`);
          console.error(`🚨 [CALLBACK ERROR] Callback ignoré pour éviter corruption des données`);
          return;
        }
        
        const result = DamageManager.updatePokemonHP(
          pokemonId, 
          newHp, 
          this.state, 
          this.battleContext,
          'attack'
        );
        
        if (result) {
          console.log(`✅ [CALLBACK] HP synchronisés: ${result.pokemonName} ${result.oldHp} → ${result.newHp}`);
          console.log(`🔍 [CALLBACK DEBUG] Dégâts calculés par DamageManager: ${result.damage}`);
          
          if (result.wasKnockedOut) {
            console.log(`💀 [CALLBACK] ${result.pokemonName} K.O. confirmé par DamageManager !`);
            
            if (pokemonId === this.state.player1Pokemon?.pokemonId.toString()) {
              this.state.player1Pokemon.currentHp = 0;
            } else if (pokemonId === this.state.player2Pokemon?.pokemonId.toString()) {
              this.state.player2Pokemon.currentHp = 0;
            }
          }
          
          // ✅ FIX: Récupérer maxHp depuis le state
          let maxHp = 100; // Valeur par défaut
          
          if (pokemonId === this.state.player1Pokemon?.pokemonId.toString()) {
            maxHp = this.state.player1Pokemon.maxHp;
          } else if (pokemonId === this.state.player2Pokemon?.pokemonId.toString()) {
            maxHp = this.state.player2Pokemon.maxHp;
          }
          
          this.broadcast('pokemonHPUpdate', {
            pokemonId: pokemonId,
            oldHp: result.oldHp,
            newHp: result.newHp,
            maxHp: maxHp, // ✅ Utiliser la valeur récupérée
            damage: result.damage,
            isKnockedOut: result.wasKnockedOut,
            pokemonName: result.pokemonName
          });
          
        } else {
          console.error(`❌ [CALLBACK] Erreur synchronisation HP pour pokemonId: ${pokemonId}`);
        }
        
        console.log(`🔍 [CALLBACK DEBUG] === FIN CALLBACK ===`);
      },

      /**
       * CHANGEMENT DE TOUR - NE PLUS UTILISER (TurnSystem gère maintenant)
       */
      changeTurn: (newTurn: string) => {
        console.log(`🔄 [CALLBACK] Demande changement tour: ${newTurn} (ignoré - TurnSystem gère)`);
        
        if (this.state.currentTurn !== newTurn) {
          console.log(`🔄 [CALLBACK] Tour actuel: ${this.state.currentTurn}, demandé: ${newTurn}`);
        }
      },

      /**
       * Termine le combat avec un résultat
       */
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
        
        let iconType: BattleStatusIcon = "battle_victory";
        if (result.result === 'defeat') {
          iconType = "battle_defeat";
        } else if (result.result === 'fled') {
          iconType = "battle_fled";
        }
        this.updatePlayerStatusIcon(this.state.player1Id, iconType);
        
        this.handleBattleEnd();
      },

      /**
       * ✅ CORRIGÉ: Log des événements de combat
       */
      logBattleEvent: (event: any) => {
        console.log(`📝 [EVENT] ${event.type}`);
        
        if (event.type === 'damage') {
          console.log(`🔍 [EVENT DEBUG] === ÉVÉNEMENT DAMAGE ===`);
          console.log(`🔍 [EVENT DEBUG] targetId: ${event.targetId}`);
          console.log(`🔍 [EVENT DEBUG] damage dans event.data: ${event.data?.damage}`);
          console.log(`🔍 [EVENT DEBUG] currentHp dans event.data: ${event.data?.currentHp}`);
          console.log(`🔍 [EVENT DEBUG] oldHp dans event.data: ${event.data?.oldHp}`);
          console.log(`🔍 [EVENT DEBUG] effectiveness: ${event.data?.effectiveness}`);
          console.log(`🔍 [EVENT DEBUG] pokemonName: ${event.data?.pokemonName}`);
          console.log(`🔍 [EVENT DEBUG] attackName: ${event.data?.attackName}`);
          
          if (event.targetId) {
            const currentHp = this.getCurrentHPFromState(event.targetId);
            console.log(`🔍 [EVENT DEBUG] HP actuel dans state: ${currentHp}`);
            
            if (event.data?.oldHp !== undefined && currentHp !== event.data.oldHp) {
              console.warn(`⚠️ [EVENT DEBUG] Incohérence HP: state=${currentHp}, event.oldHp=${event.data.oldHp}`);
            }
            
            console.log(`🔍 [EVENT DEBUG] Nouvelle HP qui sera envoyée: ${event.data?.currentHp}`);
          }
          console.log(`🔍 [EVENT DEBUG] === FIN EVENT DEBUG ===`);
        }
        
        if (event.type === 'message') {
          console.log(`💬 [EVENT] Message: ${event.message || event.data?.message}`);
        }
        
        if (event.type === 'heal') {
          console.log(`💚 [EVENT] Soin: ${event.data?.healing} HP pour ${event.targetId}`);
        }
        
        if (event.type === 'status') {
          console.log(`🌟 [EVENT] Statut: ${event.data?.status} appliqué à ${event.targetId}`);
          // ✅ Appeler la méthode pour mettre à jour le statut
          this.updatePokemonStatus(event.targetId, event.data?.status);
        }
        
        if (event.type === 'battle_end') {
          console.log(`🏁 [EVENT] Fin combat: ${event.data?.result} - ${event.data?.reason}`);
        }
        
        if (this.state.battleLog.length < 100) {
          const logMessage = `[${event.type.toUpperCase()}] ${event.data?.pokemonName || event.targetId || 'Unknown'}: ${event.data?.message || event.message || 'Event triggered'}`;
          this.addBattleMessage(logMessage);
        }
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
    
    // ✅ NOUVEAU: Initialiser le contexte de combat
    this.battleStartTime = new Date();
    this.initializeBattleContext();
    
    // ✅ NOUVEAU: Configuration TurnSystem
    const playerData = [
      { id: this.state.player1Id, type: 'human' as PlayerType, name: this.state.player1Name },
      { id: 'ai', type:'ai' as PlayerType, name: 'Pokémon Sauvage' }
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
      
      // ✅ NOUVEAU: Mettre à jour le contexte et vérifier la fin
      this.updateBattleContext();
      
      const endCondition = BattleEndManager.checkEndConditions(this.battleContext);
      if (endCondition) {
        console.log(`🏁 [AI] Condition de fin détectée:`, endCondition);
        await this.processBattleEndWithManager(endCondition);
        return;
      }
      
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
    
    // ✅ NOUVEAU: Mettre à jour le contexte
    this.battleContext.turnNumber = this.state.turnNumber;
    
    console.log(`🔄 [TURN] Nouveau tour: ${this.state.currentTurn}`);
    
    this.broadcast("battleUpdate", this.getClientBattleState());
    
    // Continuer le cycle
    this.processTurn();
  }

  // === GESTION DU CONTEXTE DE COMBAT ===

  private updateBattleContext() {
    console.log(`🔄 [CONTEXT] === MISE À JOUR CONTEXTE ===`);
    console.log(`🔄 [CONTEXT] Tour: ${this.state.turnNumber}`);
    
    // Mettre à jour les participants
    this.battleContext.participants.forEach((participant, index) => {
      console.log(`🔄 [CONTEXT] Participant ${index}: ${participant.name} (${participant.sessionId})`);
      
      if (participant.sessionId === this.state.player1Id) {
        const oldHp = participant.activePokemon.currentHp;
        participant.activePokemon = this.state.player1Pokemon;
        participant.team = [this.state.player1Pokemon]; // TODO: Équipe complète
        participant.isConnected = this.clients.some(c => c.sessionId === this.state.player1Id);
        
        console.log(`🔄 [CONTEXT] Player1: ${participant.activePokemon.name} HP ${oldHp} → ${participant.activePokemon.currentHp}`);
      } else if (participant.sessionId === 'ai') {
        const oldHp = participant.activePokemon.currentHp;
        participant.activePokemon = this.state.player2Pokemon;
        participant.team = [this.state.player2Pokemon];
        
        console.log(`🔄 [CONTEXT] IA: ${participant.activePokemon.name} HP ${oldHp} → ${participant.activePokemon.currentHp}`);
      }
    });
    
    this.battleContext.turnNumber = this.state.turnNumber;
    
    // ✅ NOUVEAU: Synchroniser les statistiques DamageManager avec le contexte
    DamageManager.syncStatisticsToContext(this.battleContext);
    
    console.log(`🔄 [CONTEXT] === FIN MISE À JOUR ===`);
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
            if (newLevel) {
              console.log(`⬆️ [LEVEL] Pokémon ${pokemonId} monte au niveau ${newLevel} !`);
            }
            this.addBattleMessage(`${this.getPokemonName(pokemonId)} gagne ${expGained} points d'expérience !`);
          },
          
          onLevelUp: (pokemonId: number, newLevel: number, movesLearned: string[]) => {
            console.log(`🎉 [LEVEL UP] Pokémon ${pokemonId} niveau ${newLevel}`);
            this.addBattleMessage(`${this.getPokemonName(pokemonId)} monte au niveau ${newLevel} !`);
            
            if (movesLearned.length > 0) {
              movesLearned.forEach(moveId => {
                this.addBattleMessage(`${this.getPokemonName(pokemonId)} apprend ${moveId} !`);
              });
            }
          },
          
          onMoneyGained: (amount: number) => {
            console.log(`💰 [MONEY] +${amount} argent`);
            this.addBattleMessage(`Vous trouvez ${amount}₽ !`);
          },
          
          onItemReceived: (itemId: string, quantity: number) => {
            console.log(`📦 [ITEM] +${quantity}x ${itemId}`);
            this.addBattleMessage(`Vous trouvez ${quantity}x ${itemId} !`);
          },
          
          onBadgeEarned: (badgeId: string) => {
            console.log(`🏅 [BADGE] Badge obtenu: ${badgeId}`);
            this.addBattleMessage(`Vous obtenez le badge ${badgeId} !`);
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
      
      // Marquer la fin du combat
      this.state.battleEnded = true;
      this.state.winner = endCondition.winner || '';
      this.state.phase = endCondition.result === 'fled' ? 'fled' : 'ended';
      
      // Déterminer le type de fin pour l'icône
      let iconType: BattleStatusIcon = "battle_victory";
      if (endCondition.result === 'defeat') {
        iconType = "battle_defeat";
      } else if (endCondition.result === 'fled') {
        iconType = "battle_fled";
      }
      
      this.updatePlayerStatusIcon(this.state.player1Id, iconType);
      
      // Broadcast des récompenses
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
      
      console.log(`🏆 [BATTLE] Fin traitée avec succès:`, {
        result: endCondition.result,
        exp: rewards.experience.reduce((sum, exp) => sum + exp.gained, 0),
        money: rewards.money,
        items: rewards.items.length
      });
      
      // Programmer la fermeture
      this.clock.setTimeout(() => this.disconnect(), 8000);
      
    } catch (error) {
      console.error(`💥 [BATTLE] Erreur traitement fin:`, error);
      // Fallback vers l'ancienne méthode
      await this.handleBattleEnd();
    }
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
      
      // ✅ NOUVEAU: Mettre à jour le contexte de combat
      this.updateBattleContext();
      
      // ✅ NOUVEAU: Vérifier les conditions de fin avec BattleEndManager
      const endCondition = BattleEndManager.checkEndConditions(this.battleContext);
      if (endCondition) {
        console.log(`🏁 [BATTLE] Condition de fin détectée:`, endCondition);
        await this.processBattleEndWithManager(endCondition);
        return;
      }
      
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
      // ✅ NOUVEAU: Validation avec CaptureManager
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
      
      // ✅ NOUVEAU: Utiliser CaptureManager pour toute la logique
      const attempt: CaptureAttempt = {
        pokemonId: this.state.player2Pokemon.pokemonId,
        pokemonLevel: this.state.player2Pokemon.level,
        currentHp: this.state.player2Pokemon.currentHp,
        maxHp: this.state.player2Pokemon.maxHp,
        statusCondition: this.state.player2Pokemon.statusCondition,
        ballType: ballType,
        location: this.state.encounterLocation || 'unknown'
      };

      // Validation de la tentative
      const validationError = CaptureManager.validateCaptureAttempt(attempt);
      if (validationError) {
        client.send("error", { message: validationError });
        return;
      }

      console.log(`🎯 [CAPTURE] Démarrage capture avec CaptureManager...`);

      // ✅ NOUVEAU: Traitement complet via CaptureManager
      const result = await CaptureManager.processCaptureAttempt(
        attempt,
        this.state.player2Pokemon.name,
        this.state.player1Name,
        { 
          turnNumber: this.state.turnNumber,
          timeOfDay: 'day', // TODO: Récupérer l'heure réelle
          location: this.state.encounterLocation,
          isFirstCapture: false // TODO: Vérifier si c'est la première capture
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
            console.log(`✅ [CAPTURE] Succès ! Pokémon capturé:`, capturedPokemon.species);
            this.handlePokemonCaptured(capturedPokemon);
          },
          
          onCaptureFailed: () => {
            console.log(`❌ [CAPTURE] Échec de capture`);
            this.handleCaptureFailure();
          }
        }
      );

      console.log(`🎯 [CAPTURE] Résultat final:`, {
        success: result.success,
        criticalCapture: result.criticalCapture,
        shakeCount: result.shakeCount,
        probability: `${((result.finalRate / 255) * 100).toFixed(1)}%`
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

  // === GESTION DES RÉSULTATS DE CAPTURE ===

  private initializeBattleContext() {
    console.log(`🎮 [CONTEXT] Initialisation du contexte de combat`);
    
    const participants: BattleParticipant[] = [
      {
        sessionId: this.state.player1Id,
        name: this.state.player1Name,
        isAI: false,
        activePokemon: this.state.player1Pokemon,
        team: [this.state.player1Pokemon], // TODO: Équipe complète
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

    // ✅ NOUVEAU: Initialiser DamageManager pour ce combat
    const playerIds = [this.state.player1Id, 'ai'];
    DamageManager.initializeForBattle(playerIds);

    console.log(`✅ [CONTEXT] Contexte initialisé pour ${participants.length} participants`);
    console.log(`✅ [CONTEXT] DamageManager initialisé pour ${playerIds.length} joueurs`);
  }

  private handlePokemonCaptured(capturedPokemon: any) {
    console.log(`🎊 [CAPTURE] Pokémon capturé avec succès !`);
    
    // Marquer la fin du combat
    this.state.pokemonCaught = true;
    this.state.battleEnded = true;
    this.state.winner = this.state.player1Id;
    this.state.phase = "ended";
    
    // Broadcast du succès avec les données complètes
    this.broadcast("captureSuccess", { 
      pokemon: {
        ...this.serializePokemon(this.state.player2Pokemon),
        captureInfo: capturedPokemon.captureInfo,
        ivs: capturedPokemon.ivs,
        nature: capturedPokemon.nature
      },
      criticalCapture: capturedPokemon.captureInfo?.criticalCapture || false
    });
    
    // Déclencher la fin du combat
    this.handleBattleEnd();
  }

  private handleCaptureFailure() {
    console.log(`💔 [CAPTURE] Échec de capture`);
    
    // Broadcast de l'échec
    this.broadcast("captureFailure", {
      pokemon: this.serializePokemon(this.state.player2Pokemon)
    });
    
    // Le combat continue - tour de l'IA
    this.changeTurn();
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * ✅ NOUVEAU: Met à jour le statut d'un Pokémon
   */
  private updatePokemonStatus(pokemonId: string, newStatus: string) {
    console.log(`🌟 [BattleRoom] Mise à jour statut: ${pokemonId} → ${newStatus}`);
    
    if (this.state.player1Pokemon?.pokemonId.toString() === pokemonId) {
      this.state.player1Pokemon.statusCondition = newStatus;
    } else if (this.state.player2Pokemon?.pokemonId.toString() === pokemonId) {
      this.state.player2Pokemon.statusCondition = newStatus;
    }
    
    if (this.battleContext) {
      this.battleContext.participants.forEach(participant => {
        if (participant.activePokemon.pokemonId.toString() === pokemonId) {
          participant.activePokemon.statusCondition = newStatus;
        }
      });
    }
    
    this.broadcast('pokemonStatusUpdate', {
      pokemonId,
      newStatus,
      pokemonName: this.getPokemonName(parseInt(pokemonId))
    });
  }

  /**
   * ✅ NOUVEAU: Joue une animation de combat
   */
  private playBattleAnimation(animationType: string, animationData: any) {
    console.log(`🎬 [BattleRoom] Animation: ${animationType}`, animationData);
    
    this.broadcast('battleAnimation', {
      type: animationType,
      data: animationData,
      timestamp: Date.now()
    });
  }

  private getCurrentHPFromState(pokemonId: string): number | null {
    if (this.state.player1Pokemon?.pokemonId.toString() === pokemonId) {
      return this.state.player1Pokemon.currentHp;
    }
    if (this.state.player2Pokemon?.pokemonId.toString() === pokemonId) {
      return this.state.player2Pokemon.currentHp;
    }
    return null;
  }

  private getPokemonName(pokemonId: number): string {
    if (this.state.player1Pokemon?.pokemonId === pokemonId) {
      return this.state.player1Pokemon.name;
    }
    if (this.state.player2Pokemon?.pokemonId === pokemonId) {
      return this.state.player2Pokemon.name;
    }
    return `Pokémon #${pokemonId}`;
  }

    private calculateHPStat(baseStat: number, level: number): number {
      return Math.floor(((2 * baseStat + 31) * level) / 100) + level + 10;  // ✅ +level+10 pour HP
    }
    
    private calculateOtherStat(baseStat: number, level: number): number {
      return Math.floor(((2 * baseStat + 31) * level) / 100) + 5;  // ✅ +5 pour autres stats
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
    
    // ✅ NOUVEAU: Nettoyer DamageManager
    DamageManager.cleanup();
    console.log(`🧹 [DISPOSE] DamageManager nettoyé`);
    
    console.log(`✅ [DISPOSE] Nettoyage terminé`);
  }
}
