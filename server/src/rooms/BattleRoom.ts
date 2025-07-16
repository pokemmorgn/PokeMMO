// server/src/rooms/BattleRoom.ts
// VERSION POKÉMON AUTHENTIQUE COMPLÈTE - Flow Rouge/Bleu AVEC TIMING

import { Room, Client } from "@colyseus/core";
import { BattleState, BattlePokemon } from "../schema/BattleState";
import { BattleEngine } from "../battle/BattleEngine";
import { BattleConfig, BattleGameState, Pokemon, BattleAction } from "../battle/types/BattleTypes";
import { getPokemonById } from "../data/PokemonData";
import { TeamManager } from "../managers/TeamManager";
import { PokemonMoveService } from "../services/PokemonMoveService";
import { BattlePhase } from '../battle/types/BattleTypes';
import { JWTManager } from "../managers/JWTManager";

// === INTERFACES BATTLEROOM ===

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
  restoreState?: any; // ✅ AJOUT pour restauration
}

// === BATTLEROOM POKÉMON AUTHENTIQUE ===

export class BattleRoom extends Room<BattleState> {
  
  // === SYSTÈME DE COMBAT ===
  private battleEngine: BattleEngine;
  private battleGameState: BattleGameState | null = null;
  private battleStateBackup: any = null;

  // === DONNÉES ROOM ===
  private battleInitData!: BattleInitData;
  private teamManagers: Map<string, TeamManager> = new Map();
  private jwtManager = JWTManager.getInstance();

  maxClients = 2;
  
  // === CRÉATION ROOM ===
  
  async onCreate(options: BattleInitData & { restoreState?: any }) {
    console.log(`⚔️ [BattleRoom] Création/Restauration Pokémon authentique`);
    
    this.battleInitData = options;
    this.setState(new BattleState());
    
    if (options.restoreState) {
      console.log(`🔄 [BattleRoom] Mode restauration activé`);
      await this.restoreBattleState(options.restoreState);
    } else {
      console.log(`🆕 [BattleRoom] Nouveau combat`);
      
      // Configuration de base
      this.state.battleId = `${options.battleType}_${Date.now()}_${this.roomId}`;
      this.state.battleType = options.battleType;
      this.state.phase = "waiting";
      
      // ✅ Initialiser BattleEngine Pokémon authentique
      this.battleEngine = new BattleEngine();
      this.setupBattleEngineEvents();
      this.setupMessageHandlers();
      
      console.log(`✅ [BattleRoom] ${this.roomId} créée avec flow Pokémon authentique`);
    }
  }

  private async restoreBattleState(savedState: any): Promise<void> {
    try {
      // ✅ RESTAURER L'ÉTAT DEPUIS LA SAUVEGARDE
      this.state.battleId = savedState.battleId;
      this.state.battleType = savedState.battleType;
      this.state.phase = savedState.phase;
      this.state.turnNumber = savedState.turnNumber;
      this.state.currentTurn = savedState.currentTurn;
      this.state.player1Id = savedState.player1.userId;
      this.state.player1Name = savedState.player1.name;
      
      // Restaurer les Pokémon
      if (savedState.player1.pokemon) {
        this.state.player1Pokemon = this.convertToBattlePokemon(savedState.player1.pokemon);
      }
      if (savedState.player2.pokemon) {
        this.state.player2Pokemon = this.convertToBattlePokemon(savedState.player2.pokemon);
      }
      
      // ✅ RECONSTRUIRE LE BATTLEENGINE
      this.battleEngine = new BattleEngine();
      this.setupBattleEngineEvents();
      this.setupMessageHandlers();
      
      // ✅ RESTAURER LE GAMESTATE
this.battleGameState = {
  battleId: savedState.battleId,
  type: savedState.battleType,
  phase: savedState.phase,
  turnNumber: savedState.turnNumber,
  currentTurn: savedState.currentTurn,
  player1: savedState.player1,
  player2: savedState.player2,
  isEnded: savedState.phase === 'ended',
  winner: savedState.winner || null
};
      
      console.log(`✅ [BattleRoom] État restauré: Tour ${savedState.turnNumber}, Phase ${savedState.phase}`);
      
    } catch (error) {
      console.error(`❌ [BattleRoom] Erreur restauration:`, error);
      throw error;
    }
  }

  // === GESTION MESSAGES ===
  
  private setupMessageHandlers(): void {
    console.log('🎮 [BattleRoom] Configuration message handlers Pokémon authentique');
    
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
    
    this.onMessage("requestMoves", async (client) => {
      await this.handleRequestMoves(client);
    });
  }

  /**
   * Gère la demande d'attaques disponibles du joueur
   */
  private async handleRequestMoves(client: Client): Promise<void> {
    console.log(`🎮 [BattleRoom] Demande d'attaques de ${client.sessionId}`);
    
    try {
      // Vérifier que le combat est en cours et c'est le tour du joueur
      if (!this.battleGameState) {
        client.send("requestMovesResult", {
          success: false,
          error: "Aucun combat en cours",
          moves: []
        });
        return;
      }
      
      // ✅ CORRECTION: Utiliser canSubmitAction() qui est plus sûr
      if (!this.battleEngine.canSubmitAction()) {
        client.send("requestMovesResult", {
          success: false,
          error: "Ce n'est pas le moment de choisir une attaque",
          moves: []
        });
        return;
      }
      
      // Vérifier que c'est bien le joueur actuel
      const userId = this.jwtManager.getUserId(client.sessionId);
      if (userId !== this.state.player1Id) {
        client.send("requestMovesResult", {
          success: false,
          error: "Ce n'est pas votre tour",
          moves: []
        });
        return;
      }
      
      // Récupérer le TeamManager pour ce joueur
      const teamManager = this.teamManagers.get(client.sessionId);
      if (!teamManager) {
        client.send("requestMovesResult", {
          success: false,
          error: "TeamManager non trouvé",
          moves: []
        });
        return;
      }
      
      // Récupérer le premier Pokémon vivant de l'équipe
      const alivePokemon = await teamManager.getFirstAlivePokemon();
      if (!alivePokemon) {
        client.send("requestMovesResult", {
          success: false,
          error: "Aucun Pokémon disponible pour combattre",
          moves: []
        });
        return;
      }
      
      // Récupérer les attaques avec toutes leurs données
      const movesWithData = await PokemonMoveService.getMovesWithData(alivePokemon);
      
      console.log(`✅ [BattleRoom] Envoi de ${movesWithData.length} attaques à ${client.sessionId}`);
      console.log(`📋 [BattleRoom] Attaques: ${movesWithData.map(m => `${m.name}(${m.currentPp}/${m.maxPp})`).join(', ')}`);
      
      // Vérifier si le Pokémon doit utiliser Struggle
      const shouldUseStruggle = PokemonMoveService.shouldUseStruggle(alivePokemon);
      
      if (shouldUseStruggle) {
        console.log(`⚔️ [BattleRoom] ${alivePokemon.nickname || alivePokemon.pokemonId} doit utiliser Lutte !`);
        
        // Envoyer Struggle comme seule option
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
      
      // Envoyer les attaques normales
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
  
  private async handleBattleAction(client: Client, data: any): Promise<void> {
    console.log(`🎮 [BattleRoom] Action reçue: ${data.actionType} de ${client.sessionId}`);
    
    try {
      // ✅ NOUVEAU: Utiliser userId au lieu de sessionId
      const userId = this.jwtManager.getUserId(client.sessionId);
      if (!userId) {
        client.send("actionResult", { success: false, error: "Session invalide" });
        return;
      }
      
      // Créer l'action pour BattleEngine
      const action: BattleAction = {
        actionId: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        playerId: userId, // ✅ Utiliser userId stable
        type: data.actionType,
        data: {
          moveId: data.moveId,
          itemId: data.itemId,
          targetPokemonId: data.targetPokemonId,
          ballType: data.ballType
        },
        timestamp: Date.now()
      };
      
      // Récupérer le TeamManager pour la capture
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
      
      // Traiter via BattleEngine
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
  
  // === ✅ NOUVEAUX ÉVÉNEMENTS BATTLEENGINE POKÉMON AUTHENTIQUE ===
  
  private setupBattleEngineEvents(): void {
    console.log('🎮 [BattleRoom] Configuration événements Pokémon authentique');

    // === 📖 INTRO NARRATIF ===
    this.battleEngine.on('battleStart', (data: any) => {
      console.log(`📖 [BattleRoom] "${data.introMessage}"`);
      
      if (data.gameState) {
        this.battleGameState = data.gameState;
        this.syncStateFromGameState();
      }
      
      // ✅ Message d'introduction Pokémon authentique
      this.broadcast("narrativeStart", {
        playerPokemon: this.battleGameState?.player1.pokemon,
        opponentPokemon: this.battleGameState?.player2.pokemon,
        gameState: this.getClientBattleState(),
        events: [data.introMessage || `Un ${this.battleGameState?.player2.pokemon?.name} sauvage apparaît !`],
        duration: 3000
      });
      
      console.log(`📖 [BattleRoom] Narration Pokémon envoyée`);
    });

    // === 🎭 CHANGEMENTS DE PHASE ===
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
      
      // ✅ Gestion spécifique phases Pokémon
      switch (data.phase) {
        case 'action_selection':
          console.log(`🎮 [BattleRoom] "Que doit faire votre Pokémon ?"`);
          
          // ✅ NOUVEAU: Trouver client par userId
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

    // === 🎮 SÉLECTION D'ACTIONS ===
    this.battleEngine.on('actionSelectionStart', (data: any) => {
      console.log(`🎮 [BattleRoom] Sélection d'actions - Tour ${data.turnNumber}`);
      
      this.broadcast('actionSelectionStart', {
        canAct: data.canAct,
        turnNumber: data.turnNumber,
        message: data.message || "Que doit faire votre Pokémon ?",
        gameState: this.getClientBattleState()
      });
      
      // Notifier le joueur spécifiquement
      // ✅ NOUVEAU: Trouver client par userId
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

    // === 📥 ACTION AJOUTÉE À LA QUEUE ===
    this.battleEngine.on('actionQueued', (data: any) => {
      console.log(`📥 [BattleRoom] Action en file: ${data.playerRole} → ${data.actionType}`);
      
      this.broadcast('actionQueued', {
        playerRole: data.playerRole,
        actionType: data.actionType,
        queueState: data.queueState
      });
    });

    // === ⚡ DÉBUT RÉSOLUTION ===
    this.battleEngine.on('resolutionStart', (data: any) => {
      console.log(`⚡ [BattleRoom] Début résolution - ${data.actionCount} actions par vitesse`);
      
      this.broadcast('resolutionStart', {
        actionCount: data.actionCount,
        orderPreview: data.orderPreview,
        message: "Résolution des actions par ordre de vitesse..."
      });
    });

    // === ✅ NOUVEAU: TOUR D'ATTAQUANT ===
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

    // === ✅ FIN RÉSOLUTION ===
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
      
      // ✅ CRÉER UN ÉVÉNEMENT BATTLEEVENT POUR LE TIMING
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
      
      // ✅ RETRANSMETTRE VIA LE SYSTÈME BATTLEEVENT (avec timing automatique)
      this.broadcast('battleEvent', battleEvent);
      
      console.log(`✅ [BattleRoom] K.O. Message retransmis via battleEvent`);
    });

    this.battleEngine.on('winnerAnnounce', (data: any) => {
      console.log(`🏆 [BattleRoom] Winner Announce reçu: ${data.message}`);
      
      // ✅ CRÉER UN ÉVÉNEMENT BATTLEEVENT POUR LE TIMING
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
      
      // ✅ RETRANSMETTRE VIA LE SYSTÈME BATTLEEVENT (avec timing automatique)
      this.broadcast('battleEvent', battleEvent);
      
      console.log(`✅ [BattleRoom] Winner Announce retransmis via battleEvent`);
    });

    // === ⚔️ ÉVÉNEMENTS DE COMBAT INDIVIDUELS AVEC TIMING ===
    
    // Attaque utilisée
    this.battleEngine.on('battleEvent', async (event: any) => {
      console.log(`⚔️ [BattleRoom] Événement combat: ${event.eventId}`);
      
      // ✅ NOUVEAU: DEBUG COMPLET DES DONNÉES
      console.log(`🔍 [DEBUG] Event Data:`, JSON.stringify(event.data, null, 2));
      
      // ✅ DEBUG SPÉCIFIQUE PAR TYPE D'ÉVÉNEMENT
      if (event.eventId === 'damageDealt') {
        console.log(`🔍 [DEBUG damageDealt] Détails:`);
        console.log(`   - Target: ${event.data.targetName} (${event.data.targetRole})`);
        console.log(`   - Damage: ${event.data.damage}`);
        console.log(`   - HP: ${event.data.oldHp} → ${event.data.newHp}/${event.data.maxHp}`);
        console.log(`   - Cible joueur: ${event.data.targetRole === 'player1' ? 'OUI' : 'NON'}`);
      }
      
      if (event.eventId === 'moveUsed') {
        console.log(`🔍 [DEBUG moveUsed] Détails:`);
        console.log(`   - Attacker: ${event.data.attackerName} (${event.data.attackerRole})`);
        console.log(`   - Move: ${event.data.moveName}`);
        console.log(`   - SubPhase: ${event.data.subPhase}`);
      }
      
      // Calculer le délai selon le type d'événement
      const delay = this.getBattleEventDelay(event.eventId);
      
      if (delay > 0) {
        console.log(`⏰ [BattleRoom] Attente ${delay}ms avant retransmission ${event.eventId}`);
        await this.delay(delay);
      }
      
      // ✅ DEBUG: Log avant envoi au client
      console.log(`📤 [DEBUG] Envoi au client:`, {
        eventId: event.eventId,
        targetRole: event.data.targetRole,
        damage: event.data.damage,
        clientsConnected: this.clients.length
      });
      
      // Retransmettre l'événement avec délai respecté
      this.broadcast('battleEvent', event);
      
      // Messages spécifiques selon le type
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

    // === 🏁 FIN DE COMBAT ===
    this.battleEngine.on('battleEnd', (data: any) => {
      console.log(`🏁 [BattleRoom] Fin de combat: ${data.winner || 'Match nul'}`);
      console.log(`📄 [BattleRoom] Raison: ${data.reason}`);
      
      // ✅ NOUVEAU: Nettoyer l'état de combat sauvegardé
      if (this.state.player1Id) {
        this.jwtManager.clearBattleState(this.state.player1Id);
        console.log(`🗑️ [BattleRoom] État de combat nettoyé pour ${this.state.player1Name}`);
      }
      
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
      
      // Message de victoire/défaite
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
      
      // Programmer la fermeture
      console.log('⏰ [BattleRoom] Fermeture programmée dans 5 secondes...');
      this.clock.setTimeout(() => {
        console.log('🚪 [BattleRoom] Fermeture de la room');
        this.disconnect();
      }, 5000);
    });

    // === 💾 SAUVEGARDE POKÉMON ===
    this.battleEngine.on('pokemonSaved', (data: any) => {
      console.log(`💾 [BattleRoom] Pokémon sauvegardés`);
      
      this.broadcast("pokemonSaved", {
        success: true,
        message: "Données Pokémon sauvegardées !",
        events: data.events,
        pokemonCount: data.data?.pokemonSaved || 0
      });
    });

    // === ❌ ERREURS ===
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

    // === 🎯 CAPTURE ===
    this.battleEngine.on('pokemonCaptured', (data: any) => {
      console.log(`🎯 [BattleRoom] Pokémon capturé: ${data.pokemon.name}`);
      
      this.broadcast("pokemonCaptured", {
        pokemon: data.pokemon,
        ball: data.ball,
        success: data.success,
        shakes: data.shakes
      });
    });

    // === 🌟 EXPÉRIENCE (FUTUR) ===
    this.battleEngine.on('experienceGained', (data: any) => {
      console.log(`🌟 [BattleRoom] Expérience: ${data.amount} EXP`);
      
      this.broadcast("experienceGained", {
        pokemon: data.pokemon,
        experience: data.amount,
        newLevel: data.newLevel,
        evolution: data.evolution
      });
    });

    // === 🎁 RÉCOMPENSES (FUTUR) ===
    this.battleEngine.on('rewardsGained', (data: any) => {
      console.log(`🎁 [BattleRoom] Récompenses: ${data.rewards}`);
      
      this.broadcast("rewardsGained", {
        money: data.money,
        items: data.items,
        experience: data.experience
      });
    });

    // === 🏃 FUITE ===
    this.battleEngine.on('battleFled', (data: any) => {
      console.log(`🏃 [BattleRoom] Fuite par ${data.player}`);
      
      this.broadcast("battleFled", {
        player: data.player,
        reason: data.reason
      });
    });

    // === ❌ ERREURS GÉNÉRALES ===
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
  
  // === MÉTHODES UTILITAIRES POUR TIMING ===
  
  /**
   * Calcule le délai approprié pour chaque type d'événement
   */
  private getBattleEventDelay(eventId: string): number {
    // Timings Pokémon authentiques (copie de BroadcastManager)
    const BATTLE_TIMINGS: Record<string, number> = {
      moveUsed: 500,           // Annonce attaque
      damageDealt: 600,        // Application dégâts  
      criticalHit: 800,         // "Coup critique !"
      superEffective: 900,      // "C'est super efficace !"
      notVeryEffective: 900,    // "Ce n'est pas très efficace..."
      noEffect: 1000,           // "Ça n'a aucun effet !"
      pokemonFainted: 2000,     // K.O. (pause importante)

     // ✅ AJOUTER LES TIMINGS K.O.
      koMessage: 1500,        // Message K.O. officiel
      winnerAnnounce: 2200,   // Annonce vainqueur
      
      // Capture
      captureAttempt: 1500,     // Lancer Ball
      captureShake: 600,        // Chaque secousse
      captureSuccess: 2000,     // "Pokémon capturé !"
      captureFailure: 1500,     // "Il s'est échappé !"
      
      // Défaut
      default: 500
    };
    
    return BATTLE_TIMINGS[eventId] || BATTLE_TIMINGS.default;
  }

  /**
   * Délai utilitaire
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // === GESTION CLIENTS ===
  
  async onJoin(client: Client, options: any): Promise<void> {
    console.log(`🔥 [JOIN] ${client.sessionId} rejoint BattleRoom avec auto-registration JWT`);
    
    try {
      // ✅ AUTO-REGISTRATION JWT DANS BATTLEROOM
      const jwtData = this.battleInitData.playerData.jwtData;
      const userId = this.battleInitData.playerData.userId;
      
      if (!jwtData || !userId) {
        console.error(`❌ [BattleRoom] Données JWT manquantes dans battleInitData`);
        client.leave(1000, "Données session manquantes");
        return;
      }
      
      // ✅ ENREGISTRER JWT AVEC LE NOUVEAU SESSIONID BATTLEROOM
      this.jwtManager.registerUser(client.sessionId, jwtData);
      console.log(`✅ [BattleRoom] JWT re-enregistré: ${client.sessionId} → ${userId}`);
      
      // ✅ VÉRIFICATION QUE ÇA MARCHE
      const verifyUserId = this.jwtManager.getUserId(client.sessionId);
      if (verifyUserId !== userId) {
        console.error(`❌ [BattleRoom] Erreur re-registration: attendu ${userId}, reçu ${verifyUserId}`);
        client.leave(1000, "Erreur session registration");
        return;
      }
      
      this.state.player1Id = userId;
      this.state.player1Name = this.battleInitData.playerData.name;
        
      // Créer TeamManager
      const teamManager = new TeamManager(this.state.player1Name);
      await teamManager.load();
      this.teamManagers.set(client.sessionId, teamManager);
      
      client.send("battleJoined", {
        battleId: this.state.battleId,
        battleType: this.state.battleType,
        yourRole: "player1"
      });
      
      // ✅ NOUVEAU: Si mode restauration, notifier le client
      if (this.battleInitData.restoreState) {
        console.log(`🔄 [BattleRoom] Envoi notification restauration`);
        client.send("battleRestored", {
          success: true,
          battleState: this.getClientBattleState(),
          message: "Combat restauré avec succès !",
          turnNumber: this.state.turnNumber,
          phase: this.state.phase
        });
      } else {
        // Démarrer le combat automatiquement pour nouveau combat
        this.clock.setTimeout(() => this.startBattleAuthentic(), 1000);
      }
      
    } catch (error) {
      console.error(`❌ [JOIN] Erreur:`, error);
      client.leave(1000, "Erreur lors de l'entrée en combat");
    }
  }
  
  async onLeave(client: Client): Promise<void> {
    console.log(`👋 ${client.sessionId} quitte BattleRoom Pokémon authentique`);
    this.cleanupPlayer(client.sessionId);
  }
  
  // === DÉMARRAGE COMBAT POKÉMON AUTHENTIQUE ===
  
  private async startBattleAuthentic(): Promise<void> {
    console.log(`🚀 [BattleRoom] Démarrage combat Pokémon authentique`);
    
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
      
      // 4. Démarrer le combat via BattleEngine Pokémon authentique
      const result = this.battleEngine.startBattle(battleConfig);
      
      if (result.success) {
        this.battleGameState = result.gameState;
        this.syncStateFromGameState();
        
        console.log(`✅ [BattleRoom] Combat Pokémon authentique démarré`);
        console.log(`📖 [BattleRoom] Tour ${this.battleGameState.turnNumber} - ${result.events[0]}`);
        
        // ✅ NOUVEAU: Démarrer la sauvegarde périodique
        this.clock.setInterval(() => {
          this.saveBattleState();
        }, 2000); // Toutes les 2 secondes
        
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
  
  private syncStateFromGameState(): void {
    if (!this.battleGameState) return;
    
    console.log(`🔄 [BattleRoom] Synchronisation state`);
    
    // Phase
    this.state.phase = this.battleGameState.phase;
    this.state.turnNumber = this.battleGameState.turnNumber;
    this.state.currentTurn = this.battleGameState.currentTurn;
    
    // Pokémon
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
  
  private getClientBattleState(): any {
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
  
  private cleanupPlayer(sessionId: string): void {
    this.teamManagers.delete(sessionId);
  }
  
  // === SAUVEGARDE ÉTAT COMBAT ===
  
  private saveBattleState(): void {
    if (!this.battleGameState) return;
    
    const stateToSave = {
      battleId: this.state.battleId,
      battleType: this.state.battleType,
      phase: this.battleGameState.phase,
      turnNumber: this.battleGameState.turnNumber,
      currentTurn: this.battleGameState.currentTurn,
      player1: {
        userId: this.state.player1Id,
        name: this.state.player1Name,
        pokemon: this.battleGameState.player1.pokemon
      },
      player2: {
        pokemon: this.battleGameState.player2.pokemon
      },
      timestamp: Date.now()
    };
    
    // Sauvegarder dans JWTManager
    this.jwtManager.saveBattleState(this.state.player1Id, stateToSave);
    console.log(`💾 [BattleRoom] État sauvegardé pour ${this.state.player1Name}`);
  }
  
  // === NETTOYAGE ===
  
  async onDispose(): Promise<void> {
    console.log(`💀 [BattleRoom] Pokémon authentique ${this.roomId} en cours de destruction`);
    
    // ✅ NOUVEAU: Nettoyer l'état de combat si combat non terminé
    if (this.state.player1Id && this.battleGameState && this.battleGameState.phase !== 'ended') {
      this.jwtManager.clearBattleState(this.state.player1Id);
      console.log(`🗑️ [BattleRoom] État de combat nettoyé lors de la destruction`);
    }
    
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
