// server/src/rooms/BattleRoom.ts
import { Room, Client } from "@colyseus/core";
import { BattleState, BattlePokemon } from "../schema/BattleState";
import { BattleEngine } from "../battle/BattleEngine";
import { BattleConfig, BattleGameState, Pokemon, BattleAction } from "../battle/types/BattleTypes";
import { getPokemonById } from "../data/PokemonData";
import { TeamManager } from "../managers/TeamManager";
import { PokemonMoveService } from "../services/PokemonMoveService";
import { BattlePhase } from '../battle/types/BattleTypes';
import { JWTManager } from "../managers/JWTManager";
import BattleEndManager from '../battle/modules/BattleEndManager';

export interface BattleInitData {
  battleType: "wild" | "pvp";
  playerData: {
    sessionId: string;
    name: string;
    worldRoomId: string;
    activePokemonId?: string;
    userId: string;
    jwtData: any;
  };
  wildPokemon?: any;
  player2Data?: {
    sessionId: string;
    name: string;
    worldRoomId: string;
  };
}

export class BattleRoom extends Room<BattleState> {
  
  private battleEngine: BattleEngine;
  private battleGameState: BattleGameState | null = null;
  private battleInitData!: BattleInitData;
  private teamManagers: Map<string, TeamManager> = new Map();
  private jwtManager = JWTManager.getInstance();
  private battleEndManager: BattleEndManager | null = null;
  maxClients = 2;
  
  async onCreate(options: BattleInitData) {
    console.log(`⚔️ [BattleRoom] Création Pokémon authentique`);
    console.log(`🎯 Type: ${options.battleType}, Joueur: ${options.playerData.name}`);
    
    this.battleInitData = options;
    this.setState(new BattleState());
    
    this.state.battleId = `${options.battleType}_${Date.now()}_${this.roomId}`;
    this.state.battleType = options.battleType;
    this.state.phase = "waiting";
    
    this.battleEngine = new BattleEngine();
    this.setupBattleEngineEvents();
    this.setupMessageHandlers();
    
    console.log(`✅ [BattleRoom] ${this.roomId} créée avec flow Pokémon authentique`);
  }
  
  private setupMessageHandlers() {
    console.log('🎮 [BattleRoom] Configuration message handlers Pokémon authentique');
    
    this.onMessage("battleAction", async (client, data: {
      actionType: "attack" | "item" | "switch" | "run" | "capture";
      moveId?: string;
      itemId?: string;
      targetPokemonId?: string;
      ballType?: string;
    }) => {
      await this.handleBattleAction(client, data);
    });

    this.onMessage("attemptCapture", async (client, data: {
      ballType: string;
    }) => {
      console.log(`🎯 [BattleRoom] Capture reçue: ${data.ballType}`);
      await this.handleBattleAction(client, {
        actionType: "capture",
        ballType: data.ballType
      });
    });

this.onMessage("attemptFlee", async (client, data) => {
  console.log(`🏃 [BattleRoom] Tentative de fuite de ${client.sessionId}`);
  
  try {
    // ✅ CORRECTION #1 : Utiliser userId au lieu de sessionId
    let userId = this.jwtManager.getUserId(client.sessionId);
    
    if (!userId) {
      const jwtData = this.jwtManager.getJWTDataBySession(client.sessionId);
      userId = jwtData?.userId;
      
      if (!userId) {
        console.error(`❌ [BattleRoom] Session invalide pour fuite: ${client.sessionId}`);
        client.send("fleeResult", {
          success: true, // On laisse fuir même en cas d'erreur
          message: "Vous avez pris la fuite !",
          fled: true
        });
        setTimeout(() => this.disconnect(), 2500);
        return;
      }
    }
    
    // ✅ CORRECTION #2 : Logger AVANT les validations de phase
    console.log(`🧠 [BattleRoom] Logging action de fuite DIRECTEMENT...`);
    
    // Appel DIRECT à la méthode de logging IA
    const fleeAction: BattleAction = {
      type: 'run',
      playerId: userId, // ✅ Utiliser userId
      actionId: `flee_${Date.now()}`,
      timestamp: Date.now(),
      data: { reason: 'player_flee' }
    };
    
    // ✅ NOUVEAU : Appel direct à logRunAttempt pour garantir le logging
    if (this.battleEngine && typeof (this.battleEngine as any).logRunAttemptDirect === 'function') {
      await (this.battleEngine as any).logRunAttemptDirect(fleeAction);
    } else {
      // Fallback : essayer submitAction quand même
      await this.battleEngine.submitAction(fleeAction);
    }
    
    console.log(`✅ [BattleRoom] Action de fuite loggée avec succès`);
    
    client.send("fleeResult", {
      success: true,
      message: "Vous avez pris la fuite !",
      fled: true
    });
    
    // ✅ CORRECTION #3 : Délai augmenté pour garantir la sauvegarde IA
    setTimeout(() => this.disconnect(), 3000);
    
  } catch (error) {
    console.error(`❌ [BattleRoom] Erreur handler fuite:`, error);
    
    // Même en cas d'erreur, on laisse le joueur fuir
    client.send("fleeResult", {
      success: true,
      message: "Vous avez pris la fuite !",
      fled: true
    });
    
    setTimeout(() => this.disconnect(), 3000);
  }
});

    this.onMessage("getBattleState", (client) => {
      client.send("battleStateUpdate", this.getClientBattleState());
    });

    this.onMessage("requestMoves", async (client) => {
      await this.handleRequestMoves(client);
    });
  }

  private async handleRequestMoves(client: Client) {
    console.log(`🎮 [BattleRoom] Demande d'attaques de ${client.sessionId}`);
    
    try {
      if (!this.battleGameState) {
        client.send("requestMovesResult", {
          success: false,
          error: "Aucun combat en cours",
          moves: []
        });
        return;
      }
      
      if (!this.battleEngine.canSubmitAction()) {
        client.send("requestMovesResult", {
          success: false,
          error: "Ce n'est pas le moment de choisir une attaque",
          moves: []
        });
        return;
      }
      
      const userId = this.jwtManager.getUserId(client.sessionId);
      if (userId !== this.state.player1Id) {
        client.send("requestMovesResult", {
          success: false,
          error: "Ce n'est pas votre tour",
          moves: []
        });
        return;
      }
      
      const teamManager = this.teamManagers.get(client.sessionId);
      if (!teamManager) {
        client.send("requestMovesResult", {
          success: false,
          error: "TeamManager non trouvé",
          moves: []
        });
        return;
      }
      
      const alivePokemon = await teamManager.getFirstAlivePokemon();
      if (!alivePokemon) {
        client.send("requestMovesResult", {
          success: false,
          error: "Aucun Pokémon disponible pour combattre",
          moves: []
        });
        return;
      }
      
      const movesWithData = await PokemonMoveService.getMovesWithData(alivePokemon);
      
      console.log(`✅ [BattleRoom] Envoi de ${movesWithData.length} attaques à ${client.sessionId}`);
      
      const shouldUseStruggle = PokemonMoveService.shouldUseStruggle(alivePokemon);
      
      if (shouldUseStruggle) {
        console.log(`⚔️ [BattleRoom] ${alivePokemon.nickname || alivePokemon.pokemonId} doit utiliser Lutte !`);
        
        client.send("requestMovesResult", {
          success: true,
          moves: [{
            moveId: "struggle",
            name: "Lutte",
            currentPp: 1,
            maxPp: 1,
            power: 50,
            accuracy: 100,
            type: "Normal",
            category: "Physical",
            description: "Une attaque désespérée utilisée quand toutes les autres sont épuisées.",
            disabled: false
          }],
          pokemonName: alivePokemon.nickname || `Pokémon ${alivePokemon.pokemonId}`,
          forceStruggle: true,
          message: "Toutes les attaques sont épuisées ! Utilise Lutte !"
        });
        return;
      }
      
      client.send("requestMovesResult", {
        success: true,
        moves: movesWithData,
        pokemonName: alivePokemon.nickname || `Pokémon ${alivePokemon.pokemonId}`,
        forceStruggle: false,
        message: "Choisis une attaque !"
      });
      
    } catch (error) {
      console.error(`❌ [BattleRoom] Erreur handleRequestMoves:`, error);
      
      client.send("requestMovesResult", {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        moves: []
      });
    }
  }
  
  private async handleBattleAction(client: Client, data: any) {
    console.log(`🎮 [BattleRoom] Action reçue: ${data.actionType} de ${client.sessionId}`);
    
    try {
      let userId = this.jwtManager.getUserId(client.sessionId);
      
      if (!userId) {
        const jwtData = this.jwtManager.getJWTDataBySession(client.sessionId);
        userId = jwtData?.userId;
        
        if (!userId) {
          console.error(`❌ [BattleRoom] Session invalide: ${client.sessionId}`);
          client.send("actionResult", { success: false, error: "Session invalide" });
          return;
        }
        
        console.log(`🔄 [BattleRoom] Fallback JWT réussi: ${userId}`);
      }
      
      const action: BattleAction = {
        actionId: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        playerId: userId,
        type: data.actionType,
        data: {
          moveId: data.moveId,
          itemId: data.itemId,
          targetPokemonId: data.targetPokemonId,
          ballType: data.ballType
        },
        timestamp: Date.now()
      };
      
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
      
      const result = await this.battleEngine.processAction(action, teamManager);
      
      if (result.success) {
        console.log(`✅ [BattleRoom] Action traitée avec succès`);
        
        this.syncStateFromGameState();
        
        this.broadcast("actionResult", {
          success: true,
          events: result.events,
          data: result.data,
          gameState: this.getClientBattleState(),
          battleEnded: result.data?.battleEnded || false
        });
        
      } else {
        console.log(`❌ [BattleRoom] Échec action: ${result.error}`);
        
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
  
  private setupBattleEngineEvents() {
    console.log('🎮 [BattleRoom] Configuration événements Pokémon authentique');

    this.battleEngine.on('battleStart', (data: any) => {
      console.log(`📖 [BattleRoom] "${data.introMessage}"`);
      
      if (data.gameState) {
        this.battleGameState = data.gameState;
        this.syncStateFromGameState();
      }
      
      this.broadcast("narrativeStart", {
        playerPokemon: this.battleGameState?.player1.pokemon,
        opponentPokemon: this.battleGameState?.player2.pokemon,
        gameState: this.getClientBattleState(),
        events: [data.introMessage || `Un ${this.battleGameState?.player2.pokemon?.name} sauvage apparaît !`],
        duration: 3000
      });
      
      console.log(`📖 [BattleRoom] Narration Pokémon envoyée`);
    });

    this.battleEngine.on('phaseChanged', (data: any) => {
      console.log(`🎭 [BattleRoom] Phase: ${data.phase} (${data.trigger})`);
      
      this.syncStateFromGameState();
      
      this.broadcast('phaseChanged', {
        phase: data.phase,
        previousPhase: data.previousPhase,
        canAct: data.canAct,
        trigger: data.trigger,
        gameState: this.getClientBattleState()
      });
      
      switch (data.phase) {
        case 'action_selection':
          console.log(`🎮 [BattleRoom] "Que doit faire votre Pokémon ?"`);
          
          const client = this.clients.find(c => {
            const clientUserId = this.jwtManager.getUserId(c.sessionId);
            return clientUserId === this.state.player1Id;
          });
          
          if (client) {
            client.send('yourTurn', { 
              phase: 'action_selection',
              message: "Que doit faire votre Pokémon ?",
              turnNumber: this.battleGameState?.turnNumber || 1
            });
          }
          break;
          
        case 'action_resolution':
          console.log(`⚔️ [BattleRoom] Résolution des actions par vitesse`);
          this.broadcast('actionsResolving', {
            message: "Résolution des actions...",
            phase: 'action_resolution'
          });
          break;
          
        case 'capture':
          console.log(`🎯 [BattleRoom] Phase capture`);
          this.broadcast('capturePhase', {
            message: "Tentative de capture...",
            phase: 'capture'
          });
          break;
          
        case 'ended':
          console.log(`🏁 [BattleRoom] Combat terminé`);
          break;
      }
    });

    this.battleEngine.on('actionSelectionStart', (data: any) => {
      console.log(`🎮 [BattleRoom] Sélection d'actions - Tour ${data.turnNumber}`);
      
      this.broadcast('actionSelectionStart', {
        canAct: data.canAct,
        turnNumber: data.turnNumber,
        message: data.message || "Que doit faire votre Pokémon ?",
        gameState: this.getClientBattleState()
      });
      
      const client = this.clients.find(c => {
        const clientUserId = this.jwtManager.getUserId(c.sessionId);
        return clientUserId === this.state.player1Id;
      });
      
      if (client) {
        client.send('yourTurn', { 
          turnNumber: data.turnNumber,
          message: data.message || "À vous de jouer !",
          canAct: true
        });
      }
    });

    this.battleEngine.on('actionQueued', (data: any) => {
      console.log(`📥 [BattleRoom] Action en file: ${data.playerRole} → ${data.actionType}`);
      
      this.broadcast('actionQueued', {
        playerRole: data.playerRole,
        actionType: data.actionType,
        queueState: data.queueState
      });
    });

    this.battleEngine.on('resolutionStart', (data: any) => {
      console.log(`⚡ [BattleRoom] Début résolution - ${data.actionCount} actions par vitesse`);
      
      this.broadcast('resolutionStart', {
        actionCount: data.actionCount,
        orderPreview: data.orderPreview,
        message: "Résolution des actions par ordre de vitesse..."
      });
    });

    this.battleEngine.on('attackerTurn', (data: any) => {
      console.log(`👊 [BattleRoom] Tour attaquant ${data.attackerNumber}/${data.totalAttackers}: ${data.playerRole}`);
      
      this.broadcast('attackerTurn', {
        playerRole: data.playerRole,
        actionType: data.actionType,
        attackerNumber: data.attackerNumber,
        totalAttackers: data.totalAttackers,
        pokemon: data.pokemon,
        message: `C'est au tour de ${data.pokemon} !`
      });
    });

    this.battleEngine.on('resolutionComplete', (data: any) => {
      console.log(`✅ [BattleRoom] Résolution terminée - ${data.actionsExecuted} actions`);
      
      this.broadcast('resolutionComplete', {
        actionsExecuted: data.actionsExecuted,
        battleEnded: data.battleEnded,
        newTurnNumber: data.newTurnNumber,
        message: "Tour terminé !"
      });
    });

    this.battleEngine.on('koMessage', (data: any) => {
      console.log(`💀 [BattleRoom] K.O. Message reçu: ${data.message}`);
      
      const battleEvent = {
        eventId: 'koMessage',
        battleId: this.state.battleId,
        timestamp: Date.now(),
        data: {
          pokemonName: data.pokemonName,
          playerRole: data.playerRole,
          message: data.message,
          messageType: data.messageType || 'official_ko'
        }
      };
      
      this.broadcast('battleEvent', battleEvent);
      
      console.log(`✅ [BattleRoom] K.O. Message retransmis via battleEvent`);
    });

    this.battleEngine.on('winnerAnnounce', (data: any) => {
      console.log(`🏆 [BattleRoom] Winner Announce reçu: ${data.message}`);
      
      const battleEvent = {
        eventId: 'winnerAnnounce',
        battleId: this.state.battleId,
        timestamp: Date.now(),
        data: {
          winner: data.winner,
          message: data.message,
          battleEndType: data.battleEndType,
          messageType: data.messageType || 'victory'
        }
      };
      
      this.broadcast('battleEvent', battleEvent);
      
      console.log(`✅ [BattleRoom] Winner Announce retransmis via battleEvent`);
    });

    this.battleEngine.on('battleEvent', async (event: any) => {
      console.log(`⚔️ [BattleRoom] Événement combat: ${event.eventId}`);
      
      const delay = this.getBattleEventDelay(event.eventId);
      
      if (delay > 0) {
        console.log(`⏰ [BattleRoom] Attente ${delay}ms avant retransmission ${event.eventId}`);
        await this.delay(delay);
      }
      
      this.broadcast('battleEvent', event);
      
      switch (event.eventId) {
        case 'moveUsed':
          console.log(`⚔️ ${event.data.attackerName} utilise ${event.data.moveName} !`);
          break;
          
        case 'damageDealt':
          console.log(`💥 ${event.data.damage} dégâts à ${event.data.targetName} !`);
          break;
          
        case 'pokemonFainted':
          console.log(`💀 ${event.data.pokemonName} est K.O. !`);
          break;
      }
      
      console.log(`✅ [BattleRoom] Événement ${event.eventId} retransmis avec délai`);
    });

    this.battleEngine.on('battleEnd', (data: any) => {
      console.log(`🏁 [BattleRoom] Fin de combat: ${data.winner || 'Match nul'}`);
      console.log(`📄 [BattleRoom] Raison: ${data.reason}`);
      
      if (data.captureSuccess) {
        console.log(`🎯 [BattleRoom] Combat terminé par capture !`);
      }
      
      this.syncStateFromGameState();
      
      this.broadcast("battleEnd", {
        winner: data.winner,
        reason: data.reason,
        gameState: this.getClientBattleState(),
        captureSuccess: data.captureSuccess || false,
        timestamp: Date.now()
      });
      
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
      
      console.log('⏰ [BattleRoom] Fermeture programmée dans 5 secondes...');
      this.clock.setTimeout(() => {
        console.log('🚪 [BattleRoom] Fermeture de la room');
        this.disconnect();
      }, 5000);
    });

    this.battleEngine.on('pokemonSaved', (data: any) => {
      console.log(`💾 [BattleRoom] Pokémon sauvegardés`);
      
      this.broadcast("pokemonSaved", {
        success: true,
        message: "Données Pokémon sauvegardées !",
        events: data.events,
        pokemonCount: data.data?.pokemonSaved || 0
      });
    });

    this.battleEngine.on('saveError', (data: any) => {
      console.error(`❌ [BattleRoom] Erreur sauvegarde: ${data.error}`);
      
      this.broadcast("saveError", {
        success: false,
        message: "Erreur lors de la sauvegarde !",
        error: data.error,
        severity: 'critical'
      });
    });

    this.battleEngine.on('actionProcessed', (data: any) => {
      console.log(`⚔️ [BattleRoom] Action traitée: ${data.action.type}`);
    });

    this.battleEngine.on('pokemonCaptured', (data: any) => {
      console.log(`🎯 [BattleRoom] Pokémon capturé: ${data.pokemon.name}`);
      
      this.broadcast("pokemonCaptured", {
        pokemon: data.pokemon,
        ball: data.ball,
        success: data.success,
        shakes: data.shakes
      });
    });

    this.battleEngine.on('experienceGained', (data: any) => {
      console.log(`🌟 [BattleRoom] Expérience: ${data.amount} EXP`);
      
      this.broadcast("experienceGained", {
        pokemon: data.pokemon,
        experience: data.amount,
        newLevel: data.newLevel,
        evolution: data.evolution
      });
    });

    this.battleEngine.on('rewardsGained', (data: any) => {
      console.log(`🎁 [BattleRoom] Récompenses: ${data.rewards}`);
      
      this.broadcast("rewardsGained", {
        money: data.money,
        items: data.items,
        experience: data.experience
      });
    });

    this.battleEngine.on('battleFled', (data: any) => {
      console.log(`🏃 [BattleRoom] Fuite par ${data.player}`);
      
      this.broadcast("battleFled", {
        player: data.player,
        reason: data.reason
      });
    });

    this.battleEngine.on('error', (data: any) => {
      console.error(`❌ [BattleRoom] Erreur: ${data.error}`);
      
      this.broadcast("battleError", {
        message: "Une erreur est survenue",
        error: data.error,
        timestamp: Date.now()
      });
    });

    console.log('✅ [BattleRoom] Tous les événements Pokémon authentique configurés');
  }
  
  private getBattleEventDelay(eventId: string): number {
    const BATTLE_TIMINGS: Record<string, number> = {
      moveUsed: 500,
      damageDealt: 600,
      criticalHit: 800,
      superEffective: 900,
      notVeryEffective: 900,
      noEffect: 1000,
      pokemonFainted: 2000,
      koMessage: 1500,
      winnerAnnounce: 2200,
      captureAttempt: 1500,
      captureShake: 600,
      captureSuccess: 2000,
      captureFailure: 1500,
      default: 500
    };
    
    return BATTLE_TIMINGS[eventId] || BATTLE_TIMINGS.default;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async onJoin(client: Client, options: any) {
    console.log(`🔥 [JOIN] ${client.sessionId} rejoint BattleRoom`);
    console.log(`📋 [JOIN] Options reçues:`, JSON.stringify(options, null, 2));
    
    try {
      const worldSessionId = options.worldSessionId;
      const playerName = options.playerName;
      
      if (!worldSessionId) {
        console.error(`❌ [BattleRoom] worldSessionId manquant dans options:`, options);
        client.leave(1000, "worldSessionId manquant");
        return;
      }
      
      console.log(`🔍 [JOIN] Recherche JWT pour worldSession: ${worldSessionId}, player: ${playerName}`);
      
      const validation = await this.jwtManager.validateSessionRobust(
        worldSessionId, 
        playerName, 
        'battleRoom_join'
      );
      
      if (!validation.valid) {
        console.error(`❌ [BattleRoom] Validation échouée: ${validation.reason}`);
        client.leave(1000, `Session invalide: ${validation.reason}`);
        return;
      }
      
      const { userId, jwtData } = validation;
      console.log(`✅ [JOIN] Validation réussie: ${userId} (${jwtData.username})`);
      
      try {
        await this.jwtManager.registerUser(client.sessionId, jwtData, { roomType: 'battle' });
        console.log(`✅ [JOIN] JWT enregistré pour BattleRoom: ${client.sessionId} → ${userId}`);
      } catch (registrationError) {
        console.error(`❌ [JOIN] Erreur registration JWT:`, registrationError);
        
        this.jwtManager.ensureMapping(client.sessionId, userId, jwtData);
        console.log(`🔄 [JOIN] Mapping forcé: ${client.sessionId} → ${userId}`);
      }
      
      const finalUserId = this.jwtManager.getUserId(client.sessionId);
      if (!finalUserId || finalUserId !== userId) {
        console.error(`❌ [JOIN] Mapping final échoué: attendu ${userId}, reçu ${finalUserId}`);
        client.leave(1000, "Erreur mapping session");
        return;
      }
      
      console.log(`🎯 [JOIN] Session BattleRoom validée: ${client.sessionId} → ${finalUserId}`);
      
      this.state.player1Id = finalUserId;
      this.state.player1Name = jwtData.username;
      
      console.log(`👥 [JOIN] Création TeamManager pour ${jwtData.username}`);
      const teamManager = new TeamManager(jwtData.username);
      
      try {
        await teamManager.load();
        this.teamManagers.set(client.sessionId, teamManager);
        console.log(`✅ [JOIN] TeamManager chargé pour ${jwtData.username}`);
      } catch (teamError) {
        console.error(`❌ [JOIN] Erreur TeamManager:`, teamError);
        client.leave(1000, "Erreur chargement équipe");
        return;
      }
      
      client.send("battleJoined", {
        battleId: this.state.battleId,
        battleType: this.state.battleType,
        yourRole: "player1",
        playerId: finalUserId,
        playerName: jwtData.username
      });
      
      console.log(`✅ [JOIN] Client notifié du succès de la connexion`);
      
      this.clock.setTimeout(() => {
        console.log(`🚀 [JOIN] Démarrage combat différé...`);
        this.startBattleAuthentic();
      }, 1000);
      
      console.log(`🎉 [JOIN] Connexion BattleRoom complète pour ${jwtData.username}`);
      
    } catch (error) {
      console.error(`❌ [JOIN] Erreur critique:`, error);
      console.error(`❌ [JOIN] Stack:`, error instanceof Error ? error.stack : 'Pas de stack');
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      client.leave(1000, `Erreur: ${errorMessage}`);
    }
  }
  
  async onLeave(client: Client) {
    console.log(`👋 ${client.sessionId} quitte BattleRoom Pokémon authentique`);
    this.cleanupPlayer(client.sessionId);
  }
  
private async startBattleAuthentic() {
  console.log(`🚀 [BattleRoom] Démarrage combat Pokémon authentique`);
  
  try {
    const playerClient = Array.from(this.clients)[0];
    if (!playerClient) throw new Error("Aucun client trouvé");
    
    const teamManager = this.teamManagers.get(playerClient.sessionId);
    if (!teamManager) throw new Error("TeamManager non trouvé");
    
    const team = await teamManager.getTeam();
    const firstPokemon = team.find(p => p.currentHp > 0 && p.moves?.length > 0);
    if (!firstPokemon) throw new Error("Aucun Pokémon disponible");
    
    const player1Pokemon = await this.convertToBattleEnginePokemon(firstPokemon, false);
    const player2Pokemon = await this.convertToBattleEnginePokemon(this.battleInitData.wildPokemon, true);
    
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
    
    // 🔧 CORRECTION: Await la promesse retournée par startBattle
    const result = await this.battleEngine.startBattle(battleConfig);
    
    if (result.success) {
      this.battleGameState = result.gameState;
      this.syncStateFromGameState();
      
      console.log(`✅ [BattleRoom] Combat Pokémon authentique démarré`);
      console.log(`📖 [BattleRoom] Tour ${this.battleGameState.turnNumber} - ${result.events[0]}`);
      
    } else {
      throw new Error(result.error || 'Erreur démarrage combat');
    }
    
  } catch (error) {
    console.error(`❌ [BattleRoom] Erreur démarrage:`, error);
    this.broadcast("battleError", { 
      message: error instanceof Error ? error.message : 'Erreur inconnue' 
    });
  }
}
  
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
  
  private syncStateFromGameState() {
    if (!this.battleGameState) return;
    
    console.log(`🔄 [BattleRoom] Synchronisation state`);
    
    this.state.phase = this.battleGameState.phase;
    this.state.turnNumber = this.battleGameState.turnNumber;
    this.state.currentTurn = this.battleGameState.currentTurn;
    
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
    
    battlePokemon.types.clear();
    pokemon.types.forEach(type => battlePokemon.types.push(type));
    
    battlePokemon.moves.clear();
    pokemon.moves.forEach(move => battlePokemon.moves.push(move));
    
    return battlePokemon;
  }
  
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
  
  /**
 * 🎯 Configure le BattleEndManager avec callback pour événements XP
 */
configureBattleEndManager(battleEndManager: BattleEndManager): void {
  this.battleEndManager = battleEndManager;
  
  // Configuration du callback pour émettre vers les clients
  battleEndManager.setEmitToClientCallback((eventType: string, data: any) => {
    console.log(`📤 [BattleRoom] Émission événement XP: ${eventType}`);
    this.broadcast(eventType, data);
  });
  
  console.log('🎯 [BattleRoom] BattleEndManager configuré avec callback XP');
}
  
  async onDispose() {
    console.log(`💀 [BattleRoom] Pokémon authentique ${this.roomId} en cours de destruction`);
    
    if (this.battleEngine) {
      this.battleEngine.cleanup();
      console.log('🧹 [BattleRoom] BattleEngine nettoyé');
    }
    
    this.teamManagers.clear();
    this.battleGameState = null;
    
    console.log(`✅ [BattleRoom] Destruction complète de ${this.roomId}`);
  }
}

export default BattleRoom;
