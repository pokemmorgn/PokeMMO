// server/src/battle/BattleEngine.ts
// ✅ VERSION COMPLÈTE AVEC TOUTES LES MÉTHODES + CORRECTIONS IA

import { PhaseManager, BattlePhase as InternalBattlePhase } from './modules/PhaseManager';
import { ActionQueue } from './modules/ActionQueue';
import { SpeedCalculator } from './modules/SpeedCalculator';
import { ActionProcessor } from './modules/ActionProcessor';
import { AIPlayer } from './modules/AIPlayer';
import { BattleEndManager } from './modules/BattleEndManager';
import { CaptureManager } from './modules/CaptureManager';
import { KOManager } from './modules/KOManager';
import { BroadcastManager } from './modules/BroadcastManager';
import { BroadcastManagerFactory } from './modules/broadcast/BroadcastManagerFactory';
import { SpectatorManager } from './modules/broadcast/SpectatorManager';
import { BATTLE_TIMINGS } from './modules/BroadcastManager';
import { BattleConfig, BattleGameState, BattleResult, BattleAction, BattleModule, PlayerRole, Pokemon } from './types/BattleTypes';
import { pokedexIntegrationService } from '../services/PokedexIntegrationService';

// ✅ IMPORTS INTELLIGENCE IA
import { getAINPCManager } from '../Intelligence/AINPCManager';
import { ActionType } from '../Intelligence/Core/ActionTypes';
import type { AINPCManager } from '../Intelligence/AINPCManager';

// === SOUS-PHASES POKÉMON AUTHENTIQUES ===
enum SubPhase {
  NONE = 'none',
  ATTACKER_1 = 'attacker_1_phase',
  ATTACKER_2 = 'attacker_2_phase',
  KO_CHECK = 'ko_check_phase'
}

export class BattleEngine {
  
  // === GESTION PHASES ===
  private phaseManager: PhaseManager;
  private actionQueue: ActionQueue;
  private speedCalculator: SpeedCalculator;
  
  // === ÉTAT DU JEU ===
  private gameState: BattleGameState;
  private isInitialized: boolean = false;
  private isProcessingActions: boolean = false;
  
  // === SOUS-PHASES POKÉMON AUTHENTIQUES ===
  private currentSubPhase: SubPhase = SubPhase.NONE;
  private orderedActions: any[] = [];
  private currentAttackerData: any = null;
  
  // === MODULES CORE ===
  private actionProcessor: ActionProcessor;
  private aiPlayer: AIPlayer;
  private battleEndManager: BattleEndManager;
  private captureManager: CaptureManager;
  private koManager: KOManager;
  
  // === MODULES BROADCAST ===
  private broadcastManager: BroadcastManager | null = null;
  private spectatorManager: SpectatorManager | null = null;
  
  // ✅ INTELLIGENCE IA
  private aiNPCManager: AINPCManager;
  
  // === SYSTÈME D'ÉVÉNEMENTS ===
  private eventListeners: Map<string, Function[]> = new Map();
  private modules: Map<string, BattleModule> = new Map();
  
  // === TIMERS ===
  private introTimer: NodeJS.Timeout | null = null;
  private aiActionTimer: NodeJS.Timeout | null = null;
  private subPhaseTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    // === MODULES ===
    this.phaseManager = new PhaseManager();
    this.actionQueue = new ActionQueue();
    this.speedCalculator = new SpeedCalculator();
    this.actionProcessor = new ActionProcessor();
    this.aiPlayer = new AIPlayer();
    this.battleEndManager = new BattleEndManager();
    this.captureManager = new CaptureManager();
    this.koManager = new KOManager();
    
    // ✅ INTELLIGENCE IA
    this.aiNPCManager = getAINPCManager();
    
    // État initial vide
    this.gameState = this.createEmptyState();
  }
  
  // ===================================================================
  // 🆕 CORRECTIONS INTELLIGENCE IA - INITIALISATION
  // ===================================================================
  
  /**
   * ✅ NOUVEAU : Initialise le système d'intelligence IA
   */
  private async initializeAISystem(): Promise<void> {
    try {
      console.log(`🤖 [BattleEngine-IA] === INITIALISATION SYSTÈME D'IA ===`);
      
      // ✅ CORRECTION #1 : Initialiser AINPCManager
      await this.aiNPCManager.initialize();
      console.log(`✅ [BattleEngine-IA] AINPCManager initialisé`);
      
      // ✅ CORRECTION #2 : Enregistrer les joueurs dans ActionTracker
      this.registerPlayersInAI();
      console.log(`✅ [BattleEngine-IA] Joueurs enregistrés dans ActionTracker`);
      
      console.log(`🎉 [BattleEngine-IA] Système d'IA complètement initialisé !`);
      
    } catch (error) {
      console.error(`❌ [BattleEngine-IA] Erreur initialisation système IA:`, error);
      // Continue sans IA mais log l'erreur
    }
  }
  
  /**
   * ✅ NOUVEAU : Enregistre les joueurs du combat dans ActionTracker
   */
  private registerPlayersInAI(): void {
    try {
      // Enregistrer player1
      if (this.gameState.player1.name && this.gameState.player1.name !== this.gameState.player1.sessionId) {
        this.aiNPCManager.registerPlayer({
          username: this.gameState.player1.name,
          sessionId: this.gameState.player1.sessionId,
          level: this.gameState.player1.pokemon?.level || 1,
          gold: 0, // Non pertinent en combat
          currentZone: 'battle_area',
          x: 0,
          y: 0
        });
        
        console.log(`📝 [BattleEngine-IA] Player1 enregistré: ${this.gameState.player1.name}`);
      }
      
      // Enregistrer player2 (seulement si c'est un vrai joueur, pas l'IA)
      if (this.gameState.player2.sessionId !== 'ai' && 
          this.gameState.player2.name && 
          this.gameState.player2.name !== this.gameState.player2.sessionId) {
        
        this.aiNPCManager.registerPlayer({
          username: this.gameState.player2.name,
          sessionId: this.gameState.player2.sessionId,
          level: this.gameState.player2.pokemon?.level || 1,
          gold: 0,
          currentZone: 'battle_area',
          x: 0,
          y: 0
        });
        
        console.log(`📝 [BattleEngine-IA] Player2 enregistré: ${this.gameState.player2.name}`);
      }
      
    } catch (error) {
      console.error(`❌ [BattleEngine-IA] Erreur enregistrement joueurs:`, error);
    }
  }
  
  // ===================================================================
  // 🔧 CORRECTIONS MÉTHODES DE LOGGING 
  // ===================================================================
  
  /**
   * ✅ CORRIGÉ : Logger le début du combat - conditions assouplies
   */
  private logBattleStart(config: BattleConfig): void {
    try {
      const playerName = config.player1?.name;
      if (!playerName) {
        console.log(`⚠️ [BattleEngine-IA] Pas de nom joueur pour logging début combat`);
        return;
      }
      
      console.log(`🧠 [BattleEngine-IA] Logging début combat pour ${playerName}`);
      
      this.aiNPCManager.trackPlayerAction(
        playerName, // ✅ Username (ID permanent)
        ActionType.BATTLE_START,
        {
          battleType: config.type,
          playerPokemon: config.player1.pokemon?.name,
          playerPokemonLevel: config.player1.pokemon?.level,
          opponentPokemon: config.opponent.pokemon?.name,
          opponentPokemonLevel: config.opponent.pokemon?.level,
          battleId: this.gameState.battleId
        },
        {
          location: {
            map: 'battle_area',
            x: 0,
            y: 0
          }
        }
      );
      
    } catch (error) {
      console.error('❌ [BattleEngine-IA] Erreur logging début combat:', error);
    }
  }
  
  /**
   * ✅ CORRIGÉ : Logger les tentatives de fuite - conditions assouplies
   */
  private logRunAttempt(action: BattleAction): void {
    try {
      const playerName = this.getPlayerName(action.playerId);
      
      // ✅ CORRECTION #3 : Condition assouplie (accepter même si sessionId = playerName)
      if (!playerName) {
        console.log(`⚠️ [BattleEngine-IA] Pas de nom joueur pour logging fuite`);
        return;
      }
      
      console.log(`🧠 [BattleEngine-IA] Logging tentative de fuite pour ${playerName}`);
      
      this.aiNPCManager.trackPlayerAction(
        playerName,
        ActionType.BATTLE_RUN_ATTEMPT, // ✅ CORRIGÉ : ActionType plus approprié
        {
          actionType: 'run_attempt',
          battleType: this.gameState.type,
          opponentPokemon: this.gameState.player2.pokemon?.name,
          opponentLevel: this.gameState.player2.pokemon?.level,
          playerPokemon: this.gameState.player1.pokemon?.name,
          playerPokemonHp: this.gameState.player1.pokemon?.currentHp,
          playerPokemonMaxHp: this.gameState.player1.pokemon?.maxHp,
          turnNumber: this.gameState.turnNumber,
          battleId: this.gameState.battleId,
          runReason: 'player_initiated'
        },
        {
          location: {
            map: 'battle_area',
            x: 0,
            y: 0
          }
        }
      );
      
    } catch (error) {
      console.error('❌ [BattleEngine-IA] Erreur logging fuite:', error);
    }
  }
  
  /**
   * ✅ CORRIGÉ : Logger la fin du combat - conditions assouplies
   */
  private logBattleEnd(winner: PlayerRole | null, reason: string): void {
    try {
      const playerName = this.gameState.player1.name;
      
      // ✅ CORRECTION #4 : Condition assouplie
      if (!playerName) {
        console.log(`⚠️ [BattleEngine-IA] Pas de nom joueur pour logging fin combat`);
        return;
      }
      
      console.log(`🧠 [BattleEngine-IA] Logging fin combat pour ${playerName}: ${winner} (${reason})`);
      
      const isPlayerWinner = winner === 'player1';
      const actionType = isPlayerWinner ? ActionType.BATTLE_VICTORY : ActionType.BATTLE_DEFEAT;
      
      this.aiNPCManager.trackPlayerAction(
        playerName,
        actionType,
        {
          battleType: this.gameState.type,
          battleResult: winner,
          battleReason: reason,
          battleId: this.gameState.battleId,
          opponentPokemon: this.gameState.player2.pokemon?.name,
          playerPokemon: this.gameState.player1.pokemon?.name,
          turnCount: this.gameState.turnNumber,
          battleDuration: Date.now() - this.getBattleStartTime()
        },
        {
          location: {
            map: 'battle_area',
            x: 0,
            y: 0
          }
        }
      );
      
    } catch (error) {
      console.error('❌ [BattleEngine-IA] Erreur logging fin combat:', error);
    }
  }
  
  /**
   * ✅ CORRIGÉ : Logger les tentatives de capture - conditions assouplies
   */
  private logCaptureAttempt(action: BattleAction, result: BattleResult): void {
    try {
      const playerName = this.getPlayerName(action.playerId);
      
      // ✅ CORRECTION #5 : Condition assouplie
      if (!playerName) {
        console.log(`⚠️ [BattleEngine-IA] Pas de nom joueur pour logging capture`);
        return;
      }
      
      const success = result.success && result.data?.captured;
      const actionType = success ? ActionType.POKEMON_CAPTURE_SUCCESS : ActionType.POKEMON_CAPTURE_FAILURE;
      
      console.log(`🧠 [BattleEngine-IA] Logging capture ${success ? 'réussie' : 'ratée'} pour ${playerName}`);
      
      this.aiNPCManager.trackPlayerAction(
        playerName,
        actionType,
        {
          pokemonId: this.gameState.player2.pokemon?.id,
          pokemonName: this.gameState.player2.pokemon?.name,
          pokemonLevel: this.gameState.player2.pokemon?.level,
          ballType: action.data?.ballType || 'poke_ball',
          captureSuccess: success,
          captureRate: result.data?.captureRate || 0,
          attempts: 1,
          battleId: this.gameState.battleId,
          turnNumber: this.gameState.turnNumber
        },
        {
          location: {
            map: 'battle_area',
            x: 0,
            y: 0
          }
        }
      );
      
    } catch (error) {
      console.error('❌ [BattleEngine-IA] Erreur logging capture:', error);
    }
  }
  
  // ===================================================================
  // 🔧 API PRINCIPALE - MÉTHODES PUBLIQUES
  // ===================================================================
  
  /**
   * ✅ CORRIGÉ : Démarre un nouveau combat avec initialisation IA
   */
  startBattle(config: BattleConfig): BattleResult {
    try {
      this.clearAllTimers();
      this.validateConfig(config);
      this.gameState = this.initializeGameState(config);
      this.initializeAllModules();
      
      // ✅ CORRECTION #6 : Initialiser le système d'IA APRÈS gameState
      this.initializeAISystem().catch(error => {
        console.error(`❌ [BattleEngine-IA] Erreur initialisation IA asynchrone:`, error);
      });
      
      this.isInitialized = true;
      
      // ✅ Logger le début du combat
      this.logBattleStart(config);
      
      this.emit('battleStart', {
        gameState: this.gameState,
        phase: InternalBattlePhase.INTRO,
        introMessage: `Un ${this.gameState.player2.pokemon!.name} sauvage apparaît !`
      });

      // ✅ CORRECTION POKÉDX - Marquer le Pokémon adverse comme vu
      if (this.gameState.type === 'wild' && this.gameState.player2.pokemon) {
        console.log(`👁️ [BattleEngine] Enregistrement Pokémon vu: #${this.gameState.player2.pokemon.id} pour ${this.gameState.player1.name}`);
        
        pokedexIntegrationService.handlePokemonEncounter({
          playerId: this.gameState.player1.name,
          pokemonId: this.gameState.player2.pokemon.id,
          level: this.gameState.player2.pokemon.level,
          location: 'Combat Sauvage',
          method: 'wild',
          weather: undefined,
          timeOfDay: undefined,
          sessionId: this.gameState.player1.sessionId,
          biome: 'battle_area',
          difficulty: undefined,
          isEvent: false
        }).then(result => {
          if (result.success) {
            console.log(`✅ [BattleEngine] Pokémon #${this.gameState.player2.pokemon!.id} enregistré comme vu`);
            if (result.isNewDiscovery) {
              console.log(`🎉 [BattleEngine] NOUVELLE DÉCOUVERTE: ${this.gameState.player2.pokemon!.name}!`);
              
              this.emit('pokemonDiscovered', {
                pokemonId: this.gameState.player2.pokemon.id,
                pokemonName: this.gameState.player2.pokemon.name,
                playerId: this.gameState.player1.name,
                isNewDiscovery: true,
                notifications: result.notifications
              });
            }
          } else {
            console.warn(`⚠️ [BattleEngine] Échec enregistrement Pokédx: ${result.error || 'Erreur inconnue'}`);
          }
        }).catch(error => {
          console.error('❌ [BattleEngine] Erreur enregistrement Pokédx seen:', error);
        });
      }
      
      this.scheduleIntroTransition();
      
      return {
        success: true,
        gameState: this.gameState,
        events: [`Un ${this.gameState.player2.pokemon!.name} sauvage apparaît !`]
      };
      
    } catch (error) {
      this.clearAllTimers();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        gameState: this.gameState,
        events: []
      };
    }
  }
  
  /**
   * Soumission d'actions avec logging IA
   */
  async submitAction(action: BattleAction, teamManager?: any): Promise<BattleResult> {
    if (!this.isInitialized) {
      return this.createErrorResult('Combat non initialisé');
    }
    
    if (this.gameState.isEnded) {
      return this.createErrorResult('Combat déjà terminé');
    }
    
    const phaseValidation = this.phaseManager.validateAction(action);
    if (!phaseValidation.isValid) {
      return this.createErrorResult(phaseValidation.reason || 'Action non autorisée');
    }
    
    const playerRole = this.getPlayerRole(action.playerId);
    if (!playerRole) {
      return this.createErrorResult('Joueur non reconnu');
    }
    
    try {
      // ✅ Logger les actions de fuite spécifiquement
      if (action.type === 'run') {
        this.logRunAttempt(action);
      }
      
      if (action.type === 'capture') {
        return await this.handleCaptureAction(action, teamManager);
      }
      
      const pokemon = playerRole === 'player1' ? 
        this.gameState.player1.pokemon! : 
        this.gameState.player2.pokemon!;
      
      const success = this.actionQueue.addAction(playerRole, action, pokemon);
      if (!success) {
        return this.createErrorResult('Erreur ajout action en file');
      }
      
      this.emit('actionQueued', {
        playerRole,
        actionType: action.type,
        queueState: this.actionQueue.getQueueState()
      });
      
      if (this.actionQueue.areAllActionsReady()) {
        this.clearActionTimers();
        this.transitionToPhase(InternalBattlePhase.ACTION_RESOLUTION, 'all_actions_ready');
      }
      
      return {
        success: true,
        gameState: this.gameState,
        events: [`Action "${action.type}" enregistrée`],
        actionQueued: true
      };
      
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue'
      );
    }
  }
  
  // ===================================================================
  // 🔧 GESTION DES PHASES POKÉMON ROUGE/BLEU AUTHENTIQUE
  // ===================================================================
  
  /**
   * Programme la transition automatique INTRO → ACTION_SELECTION
   */
  private scheduleIntroTransition(): void {
    this.introTimer = setTimeout(() => {
      if (this.getCurrentPhase() === InternalBattlePhase.INTRO && this.isInitialized) {
        this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'intro_complete');
      }
    }, 3000);
  }
  
  /**
   * Transition vers une nouvelle phase
   */
  transitionToPhase(newPhase: InternalBattlePhase, trigger: string = 'manual'): void {
    if (!this.isInitialized) return;
    
    const success = this.phaseManager.setPhase(newPhase, trigger);
    if (!success) return;
    
    // Logique spécifique selon la nouvelle phase
    switch (newPhase) {
      case InternalBattlePhase.ACTION_SELECTION:
        this.handleActionSelectionPhase();
        break;
      case InternalBattlePhase.ACTION_RESOLUTION:
        this.handleActionResolutionPhase();
        break;
      case InternalBattlePhase.ENDED:
        this.handleEndedPhase();
        break;
    }
    
    // Émettre événement de changement de phase
    this.emit('phaseChanged', {
      phase: newPhase,
      previousPhase: this.phaseManager.getCurrentPhase(),
      gameState: this.gameState,
      canAct: this.phaseManager.canSubmitAction(),
      trigger: trigger
    });
  }
  
  /**
   * Gestion phase ACTION_SELECTION - Pokémon Rouge/Bleu authentique
   */
  private handleActionSelectionPhase(): void {
    this.clearActionTimers();
    this.actionQueue.clear();
    this.currentSubPhase = SubPhase.NONE;
    this.orderedActions = [];
    this.currentAttackerData = null;
    
    this.emit('actionSelectionStart', {
      canAct: true,
      gameState: this.gameState,
      turnNumber: this.gameState.turnNumber,
      message: "Que doit faire votre Pokémon ?"
    });
    
    this.scheduleAIAction();
  }
  
  /**
   * ✅ POKÉMON ROUGE/BLEU AUTHENTIQUE: Gestion phase ACTION_RESOLUTION avec VRAIES SOUS-PHASES + KO
   */
  private async handleActionResolutionPhase(): Promise<void> {
    this.isProcessingActions = true;
    
    try {
      const allActions = this.actionQueue.getAllActions();
      
      if (allActions.length === 0) {
        this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'no_actions');
        return;
      }
      
      this.orderedActions = this.actionQueue.getActionsBySpeed();
      
      this.emit('resolutionStart', {
        actionCount: this.orderedActions.length,
        orderPreview: this.orderedActions.map(qa => ({
          playerRole: qa.playerRole,
          actionType: qa.action.type,
          pokemonName: qa.pokemon.name
        }))
      });
      
      await this.startAttackerPhase(0);
      
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur résolution:', error);
      this.isProcessingActions = false;
    }
  }
  
  /**
   * ✅ POKÉMON ROUGE/BLEU: Démarre la phase d'un attaquant spécifique
   */
  private async startAttackerPhase(attackerIndex: number): Promise<void> {
    if (attackerIndex >= this.orderedActions.length) {
      console.log('💀 [BattleEngine] === PHASE K.O. CHECK ===');
      await this.performKOCheckPhase();
      return;
    }
    
    this.currentAttackerData = this.orderedActions[attackerIndex];
    
    // ✅ VÉRIFICATION K.O. AVANT D'AGIR
    const currentPokemon = this.getCurrentPokemonInGame(this.currentAttackerData.playerRole);
    if (!currentPokemon || currentPokemon.currentHp <= 0) {
      console.log(`💀 [BattleEngine] ${this.currentAttackerData.pokemon.name} est K.O., ne peut pas agir !`);
      await this.startAttackerPhase(attackerIndex + 1);
      return;
    }
    
    this.currentSubPhase = attackerIndex === 0 ? SubPhase.ATTACKER_1 : SubPhase.ATTACKER_2;
    
    this.emit('attackerPhaseStart', {
      subPhase: this.currentSubPhase,
      playerRole: this.currentAttackerData.playerRole,
      actionType: this.currentAttackerData.action.type,
      pokemon: this.currentAttackerData.pokemon.name,
      message: `Phase d'attaque de ${this.currentAttackerData.pokemon.name}`
    });
    
    await this.executeFullAttackerAction();
    await this.delay(500);
    await this.startAttackerPhase(attackerIndex + 1);
  }

  /**
   * ✅ NOUVELLE PHASE: K.O. CHECK après toutes les attaques
   */
  private async performKOCheckPhase(): Promise<void> {
    this.currentSubPhase = SubPhase.KO_CHECK;
    
    const player1Pokemon = this.gameState.player1.pokemon;
    const player2Pokemon = this.gameState.player2.pokemon;
    
    if (!player1Pokemon || !player2Pokemon) {
      await this.completeActionResolution();
      return;
    }
    
    // Vérifier K.O. pour chaque Pokémon
    const player1KO = this.koManager.checkAndProcessKO(player1Pokemon, 'player1');
    if (player1KO.isKO) {
      await this.processKOSequence(player1KO);
    }
    
    const player2KO = this.koManager.checkAndProcessKO(player2Pokemon, 'player2');
    if (player2KO.isKO) {
      await this.processKOSequence(player2KO);
    }
    
    // Vérification finale de fin de combat
    const battleEndCheck = this.koManager.checkBattleEnd();
    if (battleEndCheck.isEnded) {
      this.gameState.isEnded = true;
      this.gameState.winner = battleEndCheck.winner;
      
      // ✅ Logger la fin du combat
      this.logBattleEnd(battleEndCheck.winner, battleEndCheck.reason);
      
      await this.delay(1000);
      
      this.emit('battleEnd', {
        winner: battleEndCheck.winner,
        reason: battleEndCheck.reason,
        message: battleEndCheck.message,
        gameState: this.gameState,
        koVictory: true
      });
      
      this.transitionToPhase(InternalBattlePhase.ENDED, battleEndCheck.reason);
      return;
    }
    
    await this.completeActionResolution();
  }

  /**
   * ✅ TRAITE LA SÉQUENCE K.O. AVEC TIMING
   */
  private async processKOSequence(koResult: any): Promise<void> {
    // Exécuter chaque étape de la séquence avec timing
    for (const step of koResult.sequence) {
      switch (step.type) {
        case 'faint_animation':
          if (this.broadcastManager) {
            await this.broadcastManager.emitTimed('pokemonFainted', {
              pokemonName: koResult.pokemonName,
              targetRole: koResult.playerRole,
              playerId: koResult.playerRole === 'player1' ? 
                this.gameState.player1.sessionId : 
                this.gameState.player2.sessionId,
              animationType: step.data?.animationType || 'faint_fall',
              message: step.message
            });
          }
          break;
          
        case 'ko_message':
          this.emit('koMessage', {
            pokemonName: koResult.pokemonName,
            playerRole: koResult.playerRole,
            message: step.message,
            messageType: step.data?.messageType || 'official_ko'
          });
          await this.delay(step.timing);
          break;
          
        case 'winner_announce':
          this.emit('winnerAnnounce', {
            winner: step.data?.winner,
            message: step.message,
            battleEndType: step.data?.battleEndType,
            messageType: step.data?.messageType
          });
          await this.delay(step.timing);
          break;
          
        default:
          await this.delay(step.timing);
          break;
      }
    }
  }
  
  /**
   * ✅ POKÉMON ROUGE/BLEU: Exécute l'action COMPLÈTE d'un attaquant (message + dégâts + efficacité + K.O.)
   */
  private async executeFullAttackerAction(): Promise<void> {
    const { action, playerRole, pokemon } = this.currentAttackerData;
   
    const result = await this.actionProcessor.processAction(action);
    
    if (!result.success) return;
    
    if (action.type === 'attack' && result.data && this.broadcastManager) {
      await this.broadcastManager.emitTimed('moveUsed', {
        attackerName: pokemon.name,
        attackerRole: playerRole,
        moveName: this.getMoveDisplayName(action.data.moveId),
        moveId: action.data.moveId,
        subPhase: this.currentSubPhase,
        message: `${pokemon.name} utilise ${this.getMoveDisplayName(action.data.moveId)} !`
      });
          
      if (result.data.damage > 0) {
        await this.broadcastManager.emitTimed('damageDealt', {
          targetName: result.data.defenderRole === 'player1' ? 
            this.gameState.player1.pokemon!.name : 
            this.gameState.player2.pokemon!.name,
          targetRole: result.data.defenderRole,
          damage: result.data.damage,
          oldHp: result.data.oldHp,
          newHp: result.data.newHp,
          maxHp: result.data.maxHp,
          subPhase: this.currentSubPhase,
          isKnockedOut: result.data.isKnockedOut
        });
      }
      
      this.emit('attackerPhaseComplete', {
        subPhase: this.currentSubPhase,
        playerRole: playerRole,
        pokemon: pokemon.name,
        damageDealt: result.data.damage || 0,
        targetRole: result.data.defenderRole
      });
    }
    
    this.emit('actionProcessed', {
      action,
      result,
      playerRole,
      subPhase: this.currentSubPhase
    });
  }
  
  /**
   * ✅ POKÉMON ROUGE/BLEU: Termine la phase de résolution (tous les attaquants ont agi + K.O. check terminé)
   */
  private async completeActionResolution(): Promise<void> {
    this.isProcessingActions = false;
    this.currentSubPhase = SubPhase.NONE;
    this.orderedActions = [];
    this.currentAttackerData = null;
    this.gameState.turnNumber++;
    
    this.emit('resolutionComplete', {
      actionsExecuted: this.actionQueue.getAllActions().length,
      battleEnded: false,
      newTurnNumber: this.gameState.turnNumber,
      message: "Tour terminé ! Nouveau tour."
    });
    
    this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'turn_complete');
  }
  
  // ===================================================================
  // 🔧 CAPTURE
  // ===================================================================
  
  private handleCaptureAction(action: BattleAction, teamManager?: any): Promise<BattleResult> {
    console.log('🎯 [BattleEngine] Gestion capture spéciale');
    
    this.transitionToPhase(InternalBattlePhase.CAPTURE, 'capture_attempt');
    
    if (!teamManager) {
      return Promise.resolve(this.createErrorResult('TeamManager requis pour la capture'));
    }
    
    this.captureManager.initialize(this.gameState);
    return this.captureManager.attemptCapture(
      action.playerId, 
      action.data.ballType || 'poke_ball', 
      teamManager
    ).then(result => {
      // ✅ Logger la tentative de capture
      this.logCaptureAttempt(action, result);
      
      if (result.success && result.data?.captured) {
        this.gameState.isEnded = true;
        this.gameState.winner = 'player1';
        this.transitionToPhase(InternalBattlePhase.ENDED, 'pokemon_captured');
        
        this.emit('battleEnd', {
          winner: 'player1',
          reason: 'Pokémon capturé !',
          gameState: this.gameState,
          captureSuccess: true
        });
      } else {
        this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'capture_failed');
      }
      
      return result;
    });
  }
  
  private handleEndedPhase(): void {
    console.log('🏁 [BattleEngine] Phase ENDED - Combat terminé');
    
    this.clearAllTimers();
    this.savePokemonAfterBattle();
    this.cleanupSpectators();
  }
  
  // ===================================================================
  // 🔧 IA
  // ===================================================================
  
  private scheduleAIAction(): void {
    if (this.gameState.player2.sessionId !== 'ai') {
      console.log('👤 [BattleEngine] Pas d\'IA, en attente joueur 2');
      return;
    }
    
    const delay = this.getAIDelay();
    console.log(`🤖 [BattleEngine] IA programmée dans ${delay}ms`);
    
    this.aiActionTimer = setTimeout(() => {
      if (this.getCurrentPhase() === InternalBattlePhase.ACTION_SELECTION && this.isInitialized) {
        console.log('🤖 [BattleEngine] Exécution action IA programmée');
        this.executeAIAction();
      }
    }, delay);
  }
  
  private executeAIAction(): void {
    console.log('🤖 [BattleEngine] IA génère son action...');
    
    const aiAction = this.aiPlayer.generateAction();
    if (aiAction) {
      console.log(`🤖 [BattleEngine] IA choisit: ${aiAction.type}`);
      this.submitAction(aiAction);
    } else {
      console.error('❌ [BattleEngine] IA n\'a pas pu générer d\'action');
    }
  }
  
  // ===================================================================
  // 🔧 INITIALISATION MODULES
  // ===================================================================
  
  private initializeAllModules(): void {
    console.log('🔧 [BattleEngine] Initialisation de tous les modules...');
    
    this.phaseManager.initialize(this.gameState);
    this.actionProcessor.initialize(this.gameState);
    this.aiPlayer.initialize(this.gameState);
    this.battleEndManager.initialize(this.gameState);
    this.captureManager.initialize(this.gameState);
    this.koManager.initialize(this.gameState);
    this.configureBroadcastSystem();
    
    console.log('✅ [BattleEngine] Tous les modules initialisés (+ KOManager + IA)');
  }
  
  private configureBroadcastSystem(): void {
    console.log('📡 [BattleEngine] Configuration système broadcast...');
    
    this.broadcastManager = BroadcastManagerFactory.createForWildBattle(
      this.gameState.battleId,
      this.gameState,
      this.gameState.player1.sessionId
    );
    
    this.broadcastManager.setEmitCallback((event) => {
      this.emit('battleEvent', event);
    });
    
    this.spectatorManager = new SpectatorManager();
    
    console.log('✅ [BattleEngine] BroadcastManager et SpectatorManager configurés');
  }
  
  private async savePokemonAfterBattle(): Promise<void> {
    console.log('💾 [BattleEngine] Démarrage sauvegarde post-combat...');
    
    try {
      const result = await this.battleEndManager.savePokemonAfterBattle();
      
      if (result.success) {
        console.log('✅ [BattleEngine] Pokémon sauvegardés avec succès');
        this.emit('pokemonSaved', {
          events: result.events,
          data: result.data
        });
      } else {
        console.error(`❌ [BattleEngine] Erreur sauvegarde: ${result.error}`);
        this.emit('saveError', {
          error: result.error
        });
      }
      
    } catch (error) {
      console.error(`❌ [BattleEngine] Erreur critique sauvegarde:`, error);
    }
  }
  
  private cleanupSpectators(): void {
    if (this.spectatorManager) {
      const cleanup = this.spectatorManager.cleanupBattle(this.gameState.battleId);
      console.log(`🧹 [BattleEngine] ${cleanup.spectatorsRemoved.length} spectateurs nettoyés`);
    }
  }
  
  // ===================================================================
  // 🔧 GESTION DES TIMERS
  // ===================================================================
  
  private clearAllTimers(): void {
    this.clearIntroTimer();
    this.clearActionTimers();
    this.clearSubPhaseTimer();
  }
  
  private clearIntroTimer(): void {
    if (this.introTimer) {
      clearTimeout(this.introTimer);
      this.introTimer = null;
    }
  }
  
  private clearActionTimers(): void {
    if (this.aiActionTimer) {
      clearTimeout(this.aiActionTimer);
      this.aiActionTimer = null;
    }
  }
  
  private clearSubPhaseTimer(): void {
    if (this.subPhaseTimer) {
      clearTimeout(this.subPhaseTimer);
      this.subPhaseTimer = null;
    }
  }
  
  // ===================================================================
  // 🔧 COMPATIBILITÉ ET GETTERS
  // ===================================================================
  
  async processAction(action: BattleAction, teamManager?: any): Promise<BattleResult> {
    return await this.submitAction(action, teamManager);
  }
  
  generateAIAction(): BattleAction | null {
    console.log('🤖 [BattleEngine] Génération action IA via méthode legacy');
    
    if (!this.isInitialized) {
      console.error('❌ [BattleEngine] Combat non initialisé pour IA');
      return null;
    }
    
    if (this.getCurrentPhase() !== InternalBattlePhase.ACTION_SELECTION) {
      console.log('⏳ [BattleEngine] IA en attente de phase ACTION_SELECTION');
      return null;
    }
    
    return this.aiPlayer.generateAction();
  }
  
  getAIThinkingDelay(): number {
    return this.getAIDelay();
  }
  
  getCurrentState(): BattleGameState {
    return { ...this.gameState };
  }
  
  getCurrentPhase(): InternalBattlePhase {
    return this.phaseManager.getCurrentPhase();
  }
  
  getCurrentSubPhase(): SubPhase {
    return this.currentSubPhase;
  }
  
  canSubmitAction(): boolean {
    return this.phaseManager.canSubmitAction();
  }
  
  getActionQueueState(): any {
    return this.actionQueue.getQueueState();
  }
  
  getPhaseState(): any {
    return this.phaseManager.getPhaseState();
  }
  
  // ===================================================================
  // 🔧 GESTION SPECTATEURS
  // ===================================================================
  
  setBattleWorldPosition(
    battleRoomId: string,
    worldPosition: { x: number; y: number; mapId: string }
  ): void {
    if (this.spectatorManager) {
      this.spectatorManager.setBattleWorldPosition(
        this.gameState.battleId,
        battleRoomId,
        this.gameState,
        worldPosition
      );
    }
  }
  
  addSpectator(
    sessionId: string,
    battleRoomId: string,
    worldPosition: { x: number; y: number; mapId: string }
  ): boolean {
    if (this.spectatorManager) {
      return this.spectatorManager.addSpectator(
        sessionId,
        this.gameState.battleId,
        battleRoomId,
        worldPosition
      );
    }
    return false;
  }
  
  removeSpectator(sessionId: string): {
    removed: boolean;
    shouldLeaveBattleRoom: boolean;
    battleRoomId?: string;
  } {
    if (this.spectatorManager) {
      return this.spectatorManager.removeSpectator(sessionId);
    }
    return { removed: false, shouldLeaveBattleRoom: false };
  }
  
  // ===================================================================
  // 🔧 UTILITAIRES
  // ===================================================================
  
  /**
   * ✅ Récupère le Pokémon actuel dans le gameState (pas la copie de l'action)
   */
  private getCurrentPokemonInGame(playerRole: PlayerRole): Pokemon | null {
    if (!this.gameState) return null;
    
    if (playerRole === 'player1') {
      return this.gameState.player1.pokemon;
    } else if (playerRole === 'player2') {
      return this.gameState.player2.pokemon;
    }
    
    return null;
  }
  
  private getPlayerRole(playerId: string): PlayerRole | null {
    if (playerId === this.gameState.player1.sessionId) {
      return 'player1';
    } else if (playerId === this.gameState.player2.sessionId || playerId === 'ai') {
      return 'player2';
    }
    return null;
  }
  
  /**
   * ✅ CORRIGÉ : getPlayerName avec fallback approprié
   */
  private getPlayerName(playerId: string): string {
    if (!this.gameState) return playerId;
    
    if (playerId === this.gameState.player1.sessionId) {
      return this.gameState.player1.name || playerId;
    } else if (playerId === this.gameState.player2.sessionId || playerId === 'ai') {
      return this.gameState.player2.name || playerId;
    }
    
    return playerId;
  }
  
  private getMoveDisplayName(moveId: string): string {
    const names: Record<string, string> = {
      'tackle': 'Charge',
      'scratch': 'Griffe', 
      'pound': 'Écras\'Face',
      'growl': 'Rugissement',
      'tail_whip': 'Fouet Queue',
      'vine_whip': 'Fouet Lianes',
      'razor_leaf': 'Tranch\'Herbe',
      'poison_sting': 'Dard-Venin',
      'string_shot': 'Sécrétion'
    };
    
    return names[moveId] || moveId;
  }
  
  private getAIDelay(): number {
    if (this.gameState.type === 'wild') {
      return 0;
    }
    return this.aiPlayer.getThinkingDelay();
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private createErrorResult(message: string): BattleResult {
    return {
      success: false,
      error: message,
      gameState: this.gameState,
      events: []
    };
  }
  
  /**
   * ✅ Approximation du temps de début de combat
   */
  private getBattleStartTime(): number {
    const battleIdParts = this.gameState.battleId.split('_');
    if (battleIdParts.length > 1) {
      const timestamp = parseInt(battleIdParts[1]);
      if (!isNaN(timestamp)) {
        return timestamp;
      }
    }
    
    return Date.now() - (this.gameState.turnNumber * 30000);
  }
  
  // ===================================================================
  // 🔧 MÉTHODES PRIVÉES DE BASE
  // ===================================================================
  
  private createEmptyState(): BattleGameState {
    return {
      battleId: '',
      type: 'wild',
      phase: 'waiting',
      turnNumber: 0,
      currentTurn: 'player1',
      player1: { sessionId: '', name: '', pokemon: null },
      player2: { sessionId: '', name: '', pokemon: null },
      isEnded: false,
      winner: null
    };
  }
  
  private validateConfig(config: BattleConfig): void {
    if (!config.player1?.name || !config.player1?.pokemon) {
      throw new Error('Configuration joueur 1 invalide');
    }
    
    if (!config.opponent?.pokemon) {
      throw new Error('Configuration adversaire invalide');
    }
    
    if (!['wild', 'trainer', 'pvp'].includes(config.type)) {
      throw new Error('Type de combat invalide');
    }
  }
  
  private initializeGameState(config: BattleConfig): BattleGameState {
    return {
      battleId: `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: config.type,
      phase: 'battle',
      turnNumber: 1,
      currentTurn: 'player1',
      player1: {
        sessionId: config.player1.sessionId,
        name: config.player1.name,
        pokemon: { ...config.player1.pokemon }
      },
      player2: {
        sessionId: config.opponent.sessionId || 'ai',
        name: config.opponent.name || 'Pokémon Sauvage',
        pokemon: { ...config.opponent.pokemon }
      },
      isEnded: false,
      winner: null
    };
  }
  
  // ===================================================================
  // 🔧 SYSTÈME D'EXTENSION
  // ===================================================================
  
  addModule(name: string, module: BattleModule): void {
    console.log(`🔧 [BattleEngine] Ajout module: ${name}`);
    this.modules.set(name, module);
    module.initialize(this);
    console.log(`✅ [BattleEngine] Module ${name} ajouté`);
  }
  
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }
  
  emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`❌ [BattleEngine] Erreur listener ${event}:`, error);
      }
    });
  }
  
  // ===================================================================
  // 🔧 NETTOYAGE
  // ===================================================================
  
  cleanup(): void {
    this.clearAllTimers();
    this.cleanupSpectators();
    
    if (this.broadcastManager) {
      this.broadcastManager.cleanup();
      this.broadcastManager = null;
    }
    
    // Reset modules
    this.phaseManager.reset();
    this.actionQueue.reset();
    this.actionProcessor.reset();
    this.aiPlayer.reset();
    this.battleEndManager.reset();
    this.captureManager.reset();
    this.koManager.reset();
    
    // Reset sous-phases
    this.currentSubPhase = SubPhase.NONE;
    this.orderedActions = [];
    this.currentAttackerData = null;
    
    console.log('🧹 [BattleEngine] Nettoyage complet effectué (+ KOManager + IA CORRIGÉE)');
  }
  
  // ===================================================================
  // 🔧 DIAGNOSTICS AMÉLIORÉS
  // ===================================================================
  
  getSystemState(): any {
    return {
      version: 'pokemon_rouge_bleu_ABSOLUMENT_authentique_v4_KO_IA_FIXED',
      architecture: 'sous_phases_pokemon_authentiques + ko_manager + intelligence_ia_CORRIGEE',
      isInitialized: this.isInitialized,
      isProcessingActions: this.isProcessingActions,
      currentSubPhase: this.currentSubPhase,
      currentAttacker: this.currentAttackerData?.pokemon?.name || 'aucun',
      
      phaseState: this.phaseManager.getPhaseState(),
      actionQueueState: this.actionQueue.getQueueState(),
      koManagerStats: this.koManager.getStats(),
      aiManagerStats: this.aiNPCManager.getStats(), // ✅ Stats IA
      gameState: {
        battleId: this.gameState.battleId,
        type: this.gameState.type,
        phase: this.gameState.phase,
        isEnded: this.gameState.isEnded,
        winner: this.gameState.winner,
        turnNumber: this.gameState.turnNumber
      },
      
      timers: {
        introTimer: this.introTimer !== null,
        aiActionTimer: this.aiActionTimer !== null,
        subPhaseTimer: this.subPhaseTimer !== null
      },
      
      features: [
        'pokemon_rouge_bleu_ABSOLUMENT_authentique',
        'vraies_sous_phases_attaquants',
        'execution_complete_par_attaquant',
        'ko_manager_integration',
        'ko_check_phase_authentique',
        'intelligence_ai_integration_FIXED', // ✅ CORRIGÉ
        'action_logging_system_WORKING', // ✅ CORRIGÉ
        'npc_reaction_ready_FIXED', // ✅ CORRIGÉ
        'authentic_pokemon_classic',
        'zero_compromise_authenticity'
      ],
      
      corrections: [
        'sous_phases_attaquants_separees',
        'execution_complete_par_pokemon',
        'ko_check_phase_ajoutee',
        'gestion_ko_authentique',
        'intelligence_ai_battle_logging_FIXED', // ✅ NOUVEAU
        'ai_system_initialization_ADDED', // ✅ NOUVEAU
        'player_registration_in_ai_ADDED', // ✅ NOUVEAU
        'logging_conditions_RELAXED', // ✅ NOUVEAU
        'run_attempt_tracking_WORKING', // ✅ CORRIGÉ
        'capture_attempt_logging_WORKING', // ✅ CORRIGÉ
        'flow_pokemon_rouge_bleu_exact',
        'aucun_raccourci_aucun_compromise'
      ]
    };
  }
}

export default BattleEngine;
