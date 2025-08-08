// server/src/battle/BattleEngine.ts
// 🚀 SESSION 3 FINALE - EXTENSION COMPLÈTE POUR COMBATS DRESSEURS
// 🎯 MODIFICATION: SUPPRESSION TIMEOUTS POUR COMBATS SOLO/IA

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
import { SwitchManager } from './modules/SwitchManager';
import { TrainerTeamManager } from './managers/TrainerTeamManager';
import { BattleConfig, BattleGameState, BattleResult, BattleAction, BattleModule, PlayerRole, Pokemon } from './types/BattleTypes';
import { 
  TrainerBattleConfig, 
  TrainerGameState, 
  TrainerData, 
  SwitchAction,
  isTrainerBattleConfig,
  createTrainerBattleConfig,
  createTrainerPokemonTeam,
  mapTrainerPhaseToInternal,
  TRAINER_BATTLE_CONSTANTS
} from './types/TrainerBattleTypes';
import { pokedexIntegrationService } from '../services/PokedexIntegrationService';
import { getAINPCManager } from '../Intelligence/AINPCManager';
import { ActionType } from '../Intelligence/Core/ActionTypes';
import type { AINPCManager } from '../Intelligence/AINPCManager';

// 🆕 IMPORT NOUVEAUX MODULES SESSION 3
import { TrainerAI } from './modules/TrainerAI';
import { TrainerRewardManager } from './modules/TrainerRewardManager';

enum SubPhase {
  NONE = 'none',
  ATTACKER_1 = 'attacker_1_phase',
  ATTACKER_2 = 'attacker_2_phase',
  KO_CHECK = 'ko_check_phase',
  SWITCH_RESOLUTION = 'switch_resolution_phase' // 🆕 NOUVEAU
}

export class BattleEngine {
  // Core modules existants
  private phaseManager = new PhaseManager();
  private actionQueue = new ActionQueue();
  private speedCalculator = new SpeedCalculator();
  private actionProcessor = new ActionProcessor();
  private aiPlayer = new AIPlayer();
  private battleEndManager = new BattleEndManager();
  private captureManager = new CaptureManager();
  private koManager = new KOManager();
  private aiNPCManager = getAINPCManager();

  // 🆕 NOUVEAUX MODULES SESSION 3
  private switchManager = new SwitchManager();
  private trainerAI = new TrainerAI();
  private trainerRewardManager = new TrainerRewardManager();
  private playerTeamManager: TrainerTeamManager | null = null;
  private trainerTeamManager: TrainerTeamManager | null = null;

  // State
  private gameState: BattleGameState = this.createEmptyState();
  private isInitialized = false;
  private isProcessingActions = false;
  private currentSubPhase = SubPhase.NONE;
  private orderedActions: any[] = [];
  private currentAttackerData: any = null;

  // 🆕 ÉTAT DRESSEUR ÉTENDU
  private isTrainerBattle = false;
  private trainerData: TrainerData | null = null;
  private pendingSwitches: Map<PlayerRole, SwitchAction> = new Map();

  // Broadcast & spectators
  private broadcastManager: BroadcastManager | null = null;
  private spectatorManager: SpectatorManager | null = null;

  // 🎯 TIMEOUTS RÉVISÉS - SEULEMENT TECHNIQUES
  // ❌ SUPPRIMÉ: turnTimeoutId, aiActionTimer (pas de timeout pour actions)
  // ✅ GARDE: battleTimeoutId (seulement pour crash/nettoyage technique)
  private battleTimeoutId: NodeJS.Timeout | null = null;
  private introTimer: NodeJS.Timeout | null = null;

  // Configuration optimisée
  private turnCounter = 0;
  private transitionAttempts = 0;
  private readonly MAX_TURNS = 200; // 🎯 AUGMENTÉ: pas de limite artificielle
  private readonly MAX_TRANSITION_ATTEMPTS = 3;
  // 🎯 TIMEOUT TECHNIQUE SEULEMENT (crash/nettoyage, pas pour actions)
  private readonly BATTLE_CRASH_TIMEOUT_MS = 1800000; // 30 minutes (technique seulement)
  // ❌ SUPPRIMÉ: TURN_TIMEOUT_MS, AI_ACTION_DELAY

  // Events
  private eventListeners = new Map<string, Function[]>();
  private modules = new Map<string, BattleModule>();

  // Protection
  private isManualCleanup = false;
  private battleEndHandled = false;

  // === 🆕 API PRINCIPALE ÉTENDUE ===

  /**
   * 🆕 NOUVELLE MÉTHODE : Combat dresseur complet
   */
  async startTrainerBattle(config: TrainerBattleConfig): Promise<BattleResult> {
    try {
      console.log('🎯 [BattleEngine] Démarrage combat dresseur...');
      
      this.clearAllTimers();
      this.validateTrainerConfig(config);
      
      // 🆕 INITIALISATION SPÉCIFIQUE DRESSEUR
      this.gameState = this.initializeTrainerGameState(config);
      this.isTrainerBattle = true;
      this.trainerData = config.trainer;
      
      // 🆕 INITIALISATION TEAM MANAGERS
      await this.initializeTeamManagers(config);
      
      // 🆕 INITIALISATION MODULES ÉTENDUS
      this.initializeExtendedModules();
      this.initializeAllModules();
      this.startBattleTimeout(); // 🎯 SEULEMENT timeout technique
      
      // 🆕 SYSTÈME IA ÉTENDU
      await this.initializeExtendedAISystem();
      
      this.isInitialized = true;
      this.handlePokemonEncounter();
      this.scheduleIntroTransition();

      // 🆕 TRACKING IA POUR COMBAT DRESSEUR
      this.trackTrainerBattleStart();

      this.emit('battleStart', {
        gameState: this.gameState,
        phase: InternalBattlePhase.INTRO,
        introMessage: `Le dresseur ${this.trainerData.name} vous défie !`,
        isTrainerBattle: true,
        trainerClass: this.trainerData.trainerClass
      });

      return {
        success: true,
        gameState: this.gameState,
        events: [
          `Le dresseur ${this.trainerData.name} vous défie !`,
          `${this.trainerData.name} envoie ${this.trainerData.pokemon[0].name} !`
        ]
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
   * 🔥 MÉTHODE EXISTANTE AMÉLIORÉE : Support auto-détection type
   */
  startBattle(config: BattleConfig): BattleResult {
    // 🆕 AUTO-DÉTECTION COMBAT DRESSEUR
    if (isTrainerBattleConfig(config)) {
      console.log('🎯 [BattleEngine] Combat dresseur détecté, redirection...');
      this.startTrainerBattle(config).then(result => {
        if (!result.success) {
          console.error('❌ [BattleEngine] Échec combat dresseur:', result.error);
        }
      });
      
      return {
        success: true,
        gameState: this.gameState,
        events: ['Combat dresseur en cours d\'initialisation...']
      };
    }

    // 🔥 COMBAT SAUVAGE EXISTANT (INCHANGÉ)
    try {
      this.clearAllTimers();
      this.validateConfig(config);
      this.gameState = this.initializeGameState(config);
      this.isTrainerBattle = false;
      
      this.initializeAllModules();
      this.startBattleTimeout(); // 🎯 SEULEMENT timeout technique
      this.initializeAISystem();
      
      this.isInitialized = true;
      this.handlePokemonEncounter();
      this.scheduleIntroTransition();

      this.emit('battleStart', {
        gameState: this.gameState,
        phase: InternalBattlePhase.INTRO,
        introMessage: `Un ${this.gameState.player2.pokemon!.name} sauvage apparaît !`
      });

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
   * 🆕 MÉTHODE SOUMISSION ÉTENDUE : Support changements
   */
async submitAction(action: BattleAction, teamManager?: any): Promise<BattleResult> {
  console.log('🚨 [BattleEngine] submitAction() ENTRY:');
  console.log(`    action.playerId: "${action.playerId}"`);
  console.log(`    action.type: "${action.type}"`);
  console.log(`    action.actionId: "${action.actionId}"`);
  console.log(`    timestamp: ${action.timestamp}`);
  console.log(`    gameState exists: ${this.gameState ? 'YES' : 'NO'}`);
  console.log(`    isInitialized: ${this.isInitialized}`);
  console.log(`    gameState.isEnded: ${this.gameState?.isEnded}`);

  if (!this.isInitialized || this.gameState.isEnded) {
    console.log('🚨 [BattleEngine] EARLY RETURN - Not initialized or ended');
    return this.createErrorResult('Combat non disponible');
  }

  const phaseValidation = this.phaseManager.validateAction(action);
  if (!phaseValidation.isValid) {
    console.log('🚨 [BattleEngine] PHASE VALIDATION FAILED:');
    console.log(`    reason: ${phaseValidation.reason}`);
    console.log(`    current phase: ${this.phaseManager.getCurrentPhase()}`);
    console.log(`    can submit actions: ${this.phaseManager.canSubmitAction()}`);
    return this.createErrorResult(phaseValidation.reason || 'Action non autorisée');
  }

  const playerRole = this.getPlayerRole(action.playerId);
  if (!playerRole) {
    console.log('🚨 [BattleEngine] PLAYER ROLE RESOLUTION FAILED:');
    console.log(`    playerId: "${action.playerId}"`);
    console.log(`    player1.sessionId: "${this.gameState.player1.sessionId}"`);
    console.log(`    player2.sessionId: "${this.gameState.player2.sessionId}"`);
    return this.createErrorResult('Joueur non reconnu');
  }

  console.log(`✅ [BattleEngine] Validation passed, playerRole: ${playerRole}`);

    try {
      // 🆕 TRAITEMENT CHANGEMENT POKÉMON
      if (action.type === 'switch' && this.isTrainerBattle) {
        return await this.handleSwitchAction(action as SwitchAction, playerRole);
      }

      if (action.type === 'capture') {
        return await this.handleCaptureAction(action, teamManager);
      }

      // 🔥 TRAITEMENT ACTION NORMALE
      const pokemon = playerRole === 'player1' ? 
        this.gameState.player1.pokemon! : 
        this.gameState.player2.pokemon!;

      const success = this.actionQueue.addAction(playerRole, action, pokemon);
      if (!success) {
        return this.createErrorResult('Erreur ajout action');
      }

      // 🆕 TRACKING IA POUR ACTIONS
      this.trackPlayerActionInBattle(action.playerId, action.type, action.data);

      this.emit('actionQueued', {
        playerRole,
        actionType: action.type,
        queueState: this.actionQueue.getQueueState(),
        isTrainerBattle: this.isTrainerBattle
      });

      // 🔥 VÉRIFICATION ACTIONS PRÊTES OPTIMISÉE
      if (this.actionQueue.areAllActionsReady()) {
        // 🎯 PLUS DE CLEAR TIMEOUT (plus de timeout pour actions)
        const transitionSuccess = this.transitionToPhase(InternalBattlePhase.ACTION_RESOLUTION, 'all_actions_ready');
        if (!transitionSuccess) {
          console.error('❌ [BattleEngine] Échec transition vers résolution');
          this.forceActionResolution();
        }
      }

      return {
        success: true,
        gameState: this.gameState,
        events: [`Action "${action.type}" enregistrée`],
        actionQueued: true
      };
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }

  // === 🆕 NOUVELLES MÉTHODES SPÉCIFIQUES DRESSEURS ===

  /**
   * 🆕 Traite les changements de Pokémon
   */
  private async handleSwitchAction(switchAction: SwitchAction, playerRole: PlayerRole): Promise<BattleResult> {
    console.log(`🔄 [BattleEngine] Traitement changement: ${playerRole}`);
    
    if (!this.switchManager.isReady()) {
      return this.createErrorResult('SwitchManager non initialisé');
    }

    try {
      const switchResult = await this.switchManager.processSwitchAction(switchAction);
      
      if (switchResult.success) {
        this.updateGameStateAfterSwitch(playerRole, switchResult);
        
        this.trackPlayerActionInBattle(switchAction.playerId, 'POKEMON_SWITCH', {
          fromIndex: switchAction.data.fromPokemonIndex,
          toIndex: switchAction.data.toPokemonIndex,
          isForced: switchAction.data.isForced
        });

        return {
          success: true,
          gameState: this.gameState,
          events: switchResult.events,
          data: {
            switchExecuted: true,
            newActivePokemon: switchResult.data?.toPokemon
          }
        };
      } else {
        return this.createErrorResult(switchResult.error || 'Échec changement Pokémon');
      }
    } catch (error) {
      return this.createErrorResult(`Erreur changement: ${error instanceof Error ? error.message : 'Inconnue'}`);
    }
  }

  /**
   * 🆕 Met à jour le GameState après changement
   */
  private updateGameStateAfterSwitch(playerRole: PlayerRole, switchResult: BattleResult): void {
    if (!switchResult.data || !this.isTrainerBattle) return;

    const teamManager = playerRole === 'player1' ? this.playerTeamManager : this.trainerTeamManager;
    if (!teamManager) return;

    const newActivePokemon = teamManager.getActivePokemon();
    if (newActivePokemon) {
      if (playerRole === 'player1') {
        this.gameState.player1.pokemon = newActivePokemon;
      } else {
        this.gameState.player2.pokemon = newActivePokemon;
      }
      
      console.log(`✅ [BattleEngine] GameState mis à jour: ${playerRole} → ${newActivePokemon.name}`);
    }
  }

  /**
   * 🆕 Initialise les gestionnaires d'équipes
   */
  private async initializeTeamManagers(config: TrainerBattleConfig): Promise<void> {
    console.log('🎮 [BattleEngine] Initialisation Team Managers...');
    
    try {
      this.playerTeamManager = new TrainerTeamManager(config.player1.sessionId);
      this.playerTeamManager.initializeWithPokemon(config.playerTeam);
      
      this.trainerTeamManager = new TrainerTeamManager('ai');
      this.trainerTeamManager.initializeWithPokemon(config.trainer.pokemon);
      
      console.log(`✅ [BattleEngine] Team Managers créés - Joueur: ${config.playerTeam.length} Pokémon, Dresseur: ${config.trainer.pokemon.length} Pokémon`);
      
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur Team Managers:', error);
      throw error;
    }
  }

  /**
   * 🆕 Initialise les modules étendus
   */
  private initializeExtendedModules(): void {
    console.log('🔧 [BattleEngine] Initialisation modules étendus...');
    
    try {
      if (this.playerTeamManager && this.trainerTeamManager) {
        this.switchManager.initialize(
          this.gameState,
          this.playerTeamManager,
          this.trainerTeamManager,
          this.trainerData?.specialRules
        );
        console.log('✅ [BattleEngine] SwitchManager initialisé');
      }
      
      if (this.trainerData) {
        this.trainerAI.initialize(
          this.trainerData,
          this.aiNPCManager,
          this.trainerTeamManager
        );
        console.log('✅ [BattleEngine] TrainerAI initialisé');
      }
      
      this.trainerRewardManager.initialize(this.gameState);
      console.log('✅ [BattleEngine] TrainerRewardManager initialisé');
      
      this.actionQueue.configureSwitchBehavior(true, 2, 'priority');
      
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur modules étendus:', error);
      throw error;
    }
  }

  /**
   * 🆕 Système IA étendu avec AINPCManager
   */
  private async initializeExtendedAISystem(): Promise<void> {
    try {
      await this.aiNPCManager.initialize();
      this.registerPlayersInAI();
      
      if (this.trainerData) {
        await this.registerTrainerAsNPC();
      }
      
      console.log('✅ [BattleEngine] Système IA étendu initialisé');
      
    } catch (error) {
      console.warn('⚠️ [BattleEngine] Erreur IA étendue (continue sans):', error);
    }
  }

  /**
   * 🆕 Enregistre le dresseur comme NPC intelligent
   */
  private async registerTrainerAsNPC(): Promise<void> {
    if (!this.trainerData) return;
    
    try {
      const trainerAsNPC = {
        id: parseInt(this.trainerData.trainerId) || 999,
        name: this.trainerData.name,
        type: 'trainer',
        dialogue: this.trainerData.dialogue?.prebattle?.[0] || `Je suis ${this.trainerData.name} !`,
        class: this.trainerData.trainerClass,
        level: this.trainerData.level,
        pokemon: this.trainerData.pokemon.map(p => ({
          id: p.id,
          level: p.level,
          name: p.name
        }))
      };
      
      await this.aiNPCManager.registerNPCs([trainerAsNPC]);
      console.log(`✅ [BattleEngine] Dresseur ${this.trainerData.name} enregistré comme NPC intelligent`);
      
    } catch (error) {
      console.warn('⚠️ [BattleEngine] Erreur enregistrement dresseur NPC:', error);
    }
  }

  /**
   * 🆕 Tracking spécifique combat dresseur
   */
  private trackTrainerBattleStart(): void {
    if (!this.trainerData) return;
    
    try {
      this.aiNPCManager.trackPlayerAction(
        this.gameState.player1.name,
        ActionType.TRAINER_BATTLE,
        {
          trainerId: this.trainerData.trainerId,
          trainerName: this.trainerData.name,
          trainerClass: this.trainerData.trainerClass,
          trainerLevel: this.trainerData.level,
          playerPokemonCount: this.playerTeamManager?.getAllPokemon().length || 1,
          trainerPokemonCount: this.trainerData.pokemon.length
        },
        {
          location: {
            map: 'battle_area',
            x: 0,
            y: 0
          }
        }
      );
      
      console.log(`📊 [BattleEngine] Combat dresseur tracké pour IA`);
      
    } catch (error) {
      console.warn('⚠️ [BattleEngine] Erreur tracking combat:', error);
    }
  }

  /**
   * 🆕 Tracking actions en combat
   */
  private trackPlayerActionInBattle(playerId: string, actionType: string, actionData: any): void {
    if (!this.isTrainerBattle) return;
    
    try {
      const playerName = this.getPlayerName(playerId);
      if (playerName === playerId) return;
      
      this.aiNPCManager.trackPlayerAction(
        playerName,
        actionType as ActionType,
        {
          ...actionData,
          battleId: this.gameState.battleId,
          turnNumber: this.gameState.turnNumber,
          opponent: this.trainerData?.name
        }
      );
      
    } catch (error) {
      // Silencieux pour éviter spam
    }
  }

  /**
   * 🆕 Résout nom joueur depuis session ID
   */
  private getPlayerName(playerId: string): string {
    if (playerId === this.gameState.player1.sessionId) {
      return this.gameState.player1.name;
    }
    return playerId;
  }

  // === 🔥 GESTION PHASES AMÉLIORÉE ===

  private handleActionSelectionPhase(): void {
    // 🎯 PLUS DE CLEAR TIMEOUT (pas de timeout pour actions)
    this.actionQueue.clear();
    this.resetSubPhaseState();
    // 🎯 PLUS DE START TURN TIMEOUT

    // 🆕 RESET COMPTEURS SWITCH POUR NOUVEAU TOUR
    if (this.isTrainerBattle && this.switchManager.isReady()) {
      this.switchManager.resetTurnCounters(this.gameState.turnNumber);
    }

    this.emit('actionSelectionStart', {
      canAct: true,
      gameState: this.gameState,
      turnNumber: this.gameState.turnNumber,
      isTrainerBattle: this.isTrainerBattle,
      // 🎯 PAS DE TIME LIMIT (authentique Pokémon)
      noTimeLimit: true,
      message: "Prenez tout le temps nécessaire pour choisir votre action"
    });

    // 🆕 IA DRESSEUR AMÉLIORÉE (mais pas de timeout)
    if (this.isTrainerBattle) {
      this.scheduleTrainerAIAction();
    } else {
      this.scheduleAIAction();
    }
  }

  /**
   * 🆕 IA Dresseur intelligente (SANS timeout)
   */
  private scheduleTrainerAIAction(): void {
    if (this.gameState.player2.sessionId !== 'ai') return;
    
    // 🎯 IA NATURELLE: Délai de réflexion réaliste mais pas de timeout
    const thinkingDelay = this.trainerAI.isReady() ? 
      this.trainerAI.getThinkingDelay() : 
      1200; // Délai de réflexion naturel
    
    setTimeout(() => {
      if (this.getCurrentPhase() === InternalBattlePhase.ACTION_SELECTION && this.isInitialized) {
        this.executeTrainerAIAction();
      }
    }, thinkingDelay);
  }

  /**
   * 🆕 Exécute action IA dresseur
   */
  private executeTrainerAIAction(): void {
    try {
      if (!this.trainerAI.isReady()) {
        console.log('⚠️ [BattleEngine] TrainerAI pas prêt, fallback AIPlayer');
        this.executeAIAction();
        return;
      }

      const aiDecision = this.trainerAI.makeDecision(
        this.gameState,
        this.playerTeamManager?.getActivePokemon() || null,
        this.gameState.turnNumber
      );

      if (aiDecision.success && aiDecision.action) {
        console.log(`🧠 [BattleEngine] IA dresseur: ${aiDecision.action.type} (stratégie: ${aiDecision.strategy})`);
        
        this.trackAIDecision(aiDecision);
        this.submitAction(aiDecision.action);
      } else {
        console.log('⚠️ [BattleEngine] IA dresseur échec, fallback');
        this.executeAIAction();
      }
      
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur IA dresseur:', error);
      this.executeAIAction();
    }
  }

  /**
   * 🆕 Tracking décisions IA pour apprentissage
   */
  private trackAIDecision(aiDecision: any): void {
    try {
      this.aiNPCManager.trackPlayerAction(
        'AI_TRAINER',
        ActionType.NPC_TALK,
        {
          strategy: aiDecision.strategy,
          actionType: aiDecision.action?.type,
          reasoning: aiDecision.reasoning,
          confidence: aiDecision.confidence,
          battleContext: {
            turnNumber: this.gameState.turnNumber,
            playerPokemon: this.gameState.player1.pokemon?.name,
            trainerPokemon: this.gameState.player2.pokemon?.name
          }
        }
      );
    } catch (error) {
      // Silencieux
    }
  }

  // === 🔥 GESTION KO AMÉLIORÉE POUR DRESSEURS ===

  private async performKOCheckPhase(): Promise<void> {
    this.currentSubPhase = SubPhase.KO_CHECK;
    
    const player1Pokemon = this.gameState.player1.pokemon;
    const player2Pokemon = this.gameState.player2.pokemon;
    
    if (!player1Pokemon || !player2Pokemon) {
      await this.completeActionResolution();
      return;
    }

    const player1KO = this.koManager.checkAndProcessKO(player1Pokemon, 'player1');
    const player2KO = this.koManager.checkAndProcessKO(player2Pokemon, 'player2');

    if (player1KO.isKO || player2KO.isKO) {
      console.log(`💀 [BattleEngine] KO détecté - P1: ${player1KO.isKO}, P2: ${player2KO.isKO}`);
      
      if (this.isTrainerBattle) {
        await this.handleTrainerBattleKO(player1KO, player2KO);
        return;
      }
      
      if (this.broadcastManager) {
        if (player1KO.isKO) {
          this.broadcastManager.emit('pokemonFainted', {
            pokemonName: player1Pokemon.name,
            targetRole: 'player1'
          });
        }
        if (player2KO.isKO) {
          this.broadcastManager.emit('pokemonFainted', {
            pokemonName: player2Pokemon.name,
            targetRole: 'player2'
          });
        }
      }
    }

    const battleEndCheck = this.koManager.checkBattleEnd();
    if (battleEndCheck.isEnded) {
      await this.handleBattleEnd(battleEndCheck);
      return;
    }

    await this.completeActionResolution();
  }

  /**
   * 🆕 Gestion KO spécifique combats dresseurs
   */
  private async handleTrainerBattleKO(player1KO: any, player2KO: any): Promise<void> {
    console.log('💀 [BattleEngine] Gestion KO combat dresseur...');
    
    try {
      if (player1KO.isKO && this.playerTeamManager) {
        await this.handlePlayerKO('player1');
      }
      
      if (player2KO.isKO && this.trainerTeamManager) {
        await this.handleTrainerKO('player2');
      }
      
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur gestion KO dresseur:', error);
      await this.completeActionResolution();
    }
  }

  /**
   * 🆕 Gestion KO joueur avec changement forcé
   */
  private async handlePlayerKO(playerRole: PlayerRole): Promise<void> {
    const teamManager = playerRole === 'player1' ? this.playerTeamManager : this.trainerTeamManager;
    if (!teamManager) return;

    const analysis = teamManager.analyzeTeam();
    
    if (!analysis.battleReady) {
      console.log(`💀 [BattleEngine] Équipe ${playerRole} vaincue !`);
      const winner = playerRole === 'player1' ? 'player2' : 'player1';
      
      await this.handleTrainerBattleEnd(winner, 'team_defeat');
      return;
    }

    console.log(`🔄 [BattleEngine] Changement forcé requis pour ${playerRole}`);
    
    const forcedSwitchResult = await this.switchManager.handleForcedSwitch(playerRole, 0);
    
    if (forcedSwitchResult.success && !forcedSwitchResult.data?.teamDefeated) {
      this.updateGameStateAfterSwitch(playerRole, forcedSwitchResult);
      
      this.emit('pokemonSwitched', {
        playerRole,
        isForced: true,
        newPokemon: forcedSwitchResult.data?.toPokemon,
        reason: 'forced_after_ko'
      });
      
      await this.completeActionResolution();
    } else {
      const winner = playerRole === 'player1' ? 'player2' : 'player1';
      await this.handleTrainerBattleEnd(winner, 'team_defeat');
    }
  }

  /**
   * 🆕 Gestion KO dresseur (identique logique)
   */
  private async handleTrainerKO(playerRole: PlayerRole): Promise<void> {
    await this.handlePlayerKO(playerRole);
  }

  /**
   * 🆕 Fin spécifique combat dresseur
   */
  private async handleTrainerBattleEnd(winner: PlayerRole, reason: string): Promise<void> {
    console.log(`🏆 [BattleEngine] Fin combat dresseur - Vainqueur: ${winner}`);
    
    this.gameState.isEnded = true;
    this.gameState.winner = winner;
    
    try {
      if (winner === 'player1' && this.trainerData) {
        const rewards = await this.trainerRewardManager.calculateAndGiveRewards(
          this.gameState.player1.name,
          this.trainerData,
          this.gameState.turnNumber
        );
        
        console.log(`🎁 [BattleEngine] Récompenses: ${rewards.money} pièces, ${rewards.totalExpGained} EXP`);
        
        this.emit('rewardsEarned', rewards);
      }
      
      this.trackTrainerBattleEnd(winner, reason);
      
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur fin combat dresseur:', error);
    }
    
    this.emit('battleEnd', {
      winner,
      reason: `Combat dresseur terminé: ${reason}`,
      gameState: this.gameState,
      isTrainerBattle: true,
      trainerDefeated: winner === 'player1'
    });
    
    this.transitionToPhase(InternalBattlePhase.ENDED, reason);
  }

  /**
   * 🆕 Tracking fin combat dresseur
   */
  private trackTrainerBattleEnd(winner: PlayerRole, reason: string): void {
    try {
      this.aiNPCManager.trackPlayerAction(
        this.gameState.player1.name,
        ActionType.COMBAT_END,
        {
          battleResult: winner === 'player1' ? 'victory' : 'defeat',
          opponent: this.trainerData?.name,
          reason,
          turns: this.gameState.turnNumber,
          battleDuration: Date.now() - (this.gameState as any).startTime || 0
        }
      );
    } catch (error) {
      // Silencieux
    }
  }

  // === 🔥 MÉTHODES EXISTANTES PRÉSERVÉES ===

  private async handleBattleEnd(battleEndCheck: any): Promise<void> {
    console.log(`🏆 [BattleEngine] Combat terminé - Vainqueur: ${battleEndCheck.winner}`);
    
    this.gameState.isEnded = true;
    this.gameState.winner = battleEndCheck.winner;
    
    this.emit('battleEnd', {
      winner: battleEndCheck.winner,
      reason: battleEndCheck.reason,
      message: battleEndCheck.message,
      gameState: this.gameState,
      koVictory: true
    });
    
    this.transitionToPhase(InternalBattlePhase.ENDED, battleEndCheck.reason);
  }

  // === MÉTHODES PRÉSERVÉES SYSTÈME EXISTANT ===
  
  async processAction(action: BattleAction, teamManager?: any): Promise<BattleResult> {
    return await this.submitAction(action, teamManager);
  }

  generateAIAction(): BattleAction | null {
    if (!this.isInitialized || this.getCurrentPhase() !== InternalBattlePhase.ACTION_SELECTION) {
      return null;
    }
    
    if (this.isTrainerBattle && this.trainerAI.isReady()) {
      const decision = this.trainerAI.makeDecision(
        this.gameState,
        this.playerTeamManager?.getActivePokemon() || null,
        this.gameState.turnNumber
      );
      return decision.action || null;
    }
    
    return this.aiPlayer.generateAction();
  }

  getAIThinkingDelay(): number {
    if (this.isTrainerBattle && this.trainerAI.isReady()) {
      return this.trainerAI.getThinkingDelay();
    }
    
    if (this.gameState?.type === 'wild') {
      return 0;
    }
    
    const delay = Math.min(1500 + Math.random() * 2000, 3500);
    return delay;
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

  // === PRÉSERVATION MÉTHODES CRITIQUES ===

  private forceActionResolution(): void {
    console.log('🚨 [BattleEngine] Force résolution des actions');
    this.phaseManager.forceTransition(InternalBattlePhase.ACTION_RESOLUTION, 'force_resolution');
    setTimeout(() => {
      this.handleActionResolutionPhase();
    }, 100);
  }

  private transitionToPhase(newPhase: InternalBattlePhase, trigger = 'manual'): boolean {
    if (!this.isInitialized) return false;

    this.transitionAttempts++;
    if (this.transitionAttempts > this.MAX_TRANSITION_ATTEMPTS) {
      console.error('🚨 [BattleEngine] Trop de tentatives de transition, force battle end');
      this.forceBattleEnd('transition_loop', 'Boucle de transition détectée');
      return false;
    }

    const success = this.phaseManager.setPhase(newPhase, trigger);
    if (!success) {
      console.error(`❌ [BattleEngine] Échec transition ${this.phaseManager.getCurrentPhase()} → ${newPhase}`);
      
      if (this.transitionAttempts <= 2) {
        console.log('🔧 [BattleEngine] Tentative force transition...');
        this.phaseManager.forceTransition(newPhase, `force_${trigger}`);
        return true;
      }
      
      return false;
    }

    this.transitionAttempts = 0;

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

    this.emit('phaseChanged', {
      phase: newPhase,
      gameState: this.gameState,
      canAct: this.phaseManager.canSubmitAction(),
      trigger,
      isTrainerBattle: this.isTrainerBattle
    });

    return true;
  }

  private async handleActionResolutionPhase(): Promise<void> {
    this.isProcessingActions = true;
    // 🎯 PLUS DE CLEAR TURN TIMEOUT

    try {
      const allActions = this.actionQueue.getAllActions();
      if (allActions.length === 0) {
        console.log('⚠️ [BattleEngine] Aucune action à traiter, retour sélection');
        this.isProcessingActions = false;
        this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'no_actions');
        return;
      }

      console.log(`⚔️ [BattleEngine] Traitement ${allActions.length} actions`);
      this.orderedActions = this.actionQueue.getActionsBySpeed();
      this.emit('resolutionStart', { actionCount: this.orderedActions.length });
      
      await this.processAllActionsRapidly();
      
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur résolution:', error);
      this.isProcessingActions = false;
      this.forceResolutionComplete();
    }
  }

private async processAllActionsRapidly(): Promise<void> {
  for (let i = 0; i < this.orderedActions.length; i++) {
    const actionData = this.orderedActions[i];
    const currentPokemon = this.getCurrentPokemonInGame(actionData.playerRole);
    
    if (!currentPokemon || currentPokemon.currentHp <= 0) {
      console.log(`⏭️ [BattleEngine] Skip action ${i + 1} - Pokémon KO`);
      continue;
    }

    console.log(`⚔️ [BattleEngine] Traitement action ${i + 1}/${this.orderedActions.length}`);
    
    try {
      const result = await this.actionProcessor.processAction(actionData.action);
      
      if (result.success && result.data) {
        this.emit('actionProcessed', {
          action: actionData.action,
          result,
          playerRole: actionData.playerRole
        });
        
        if (this.broadcastManager && actionData.action.type === 'attack') {
          const defenderRole = result.data.defenderRole;
          const defenderPokemon = defenderRole === 'player1' ? 
            this.gameState.player1.pokemon : 
            this.gameState.player2.pokemon;
          
          const attackSequenceData = {
            attacker: {
              name: actionData.pokemon.name,
              role: actionData.playerRole
            },
            target: {
              name: defenderPokemon?.name || 'Unknown',
              role: defenderRole
            },
            move: {
              id: actionData.action.data.moveId,
              name: this.getMoveDisplayName(actionData.action.data.moveId)
            },
            damage: result.data.damage,
            oldHp: result.data.oldHp || defenderPokemon?.currentHp || 0,
            newHp: result.data.newHp,
            maxHp: defenderPokemon?.maxHp || 100,
            isKnockedOut: result.data.isKnockedOut || false
          };
          
          await this.broadcastManager.emitAttackSequence(attackSequenceData);
        }
      }
    } catch (error) {
      console.error(`❌ [BattleEngine] Erreur action ${i + 1}:`, error);
      continue;
    }
    
    if (i < this.orderedActions.length - 1) {
      await this.delay(800);
    }
  }

  await this.performKOCheckPhase();
}

  private async completeActionResolution(): Promise<void> {
    if (!this.isInitialized || this.battleEndHandled) return;
    
    this.turnCounter++;
    
    if (this.turnCounter > this.MAX_TURNS) {
      console.log(`⏰ [BattleEngine] Max turns atteint (${this.MAX_TURNS}), fin combat`);
      this.forceBattleEnd('max_turns_reached', 'Combat très long');
      return;
    }

    this.isProcessingActions = false;
    this.resetSubPhaseState();
    this.gameState.turnNumber++;

    this.emit('resolutionComplete', {
      actionsExecuted: this.actionQueue.getAllActions().length,
      battleEnded: false,
      newTurnNumber: this.gameState.turnNumber
    });

    if (!this.gameState.isEnded) {
      const success = this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'turn_complete');
      if (!success) {
        console.error('❌ [BattleEngine] Échec transition nouveau tour');
        this.forceBattleEnd('transition_failed', 'Impossible de continuer');
      }
    } else {
      this.transitionToPhase(InternalBattlePhase.ENDED, 'battle_ended');
    }
  }

  // 🎯 MÉTHODES TIMEOUT RÉVISÉES - SEULEMENT IA ET TECHNIQUE

  private scheduleAIAction(): void {
    if (this.gameState.player2.sessionId !== 'ai') return;
    
    // 🎯 DÉLAI NATUREL DE RÉFLEXION IA (pas un timeout)
    const thinkingDelay = 800;
    setTimeout(() => {
      if (this.getCurrentPhase() === InternalBattlePhase.ACTION_SELECTION && this.isInitialized) {
        this.executeAIAction();
      }
    }, thinkingDelay);
  }

  private executeAIAction(): void {
    try {
      const aiAction = this.aiPlayer.generateAction();
      if (aiAction) {
        console.log(`🤖 [BattleEngine] IA soumet action: ${aiAction.type}`);
        this.submitAction(aiAction);
      } else {
        console.log('⚠️ [BattleEngine] IA n\'a pas généré d\'action, fallback');
        const fallbackAction: BattleAction = {
          actionId: `ai_fallback_${Date.now()}`,
          playerId: 'ai',
          type: 'attack',
          data: { moveId: 'tackle' },
          timestamp: Date.now()
        };
        this.submitAction(fallbackAction);
      }
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur IA:', error);
      const emergencyAction: BattleAction = {
        actionId: `ai_emergency_${Date.now()}`,
        playerId: 'ai',
        type: 'attack',
        data: { moveId: 'tackle' },
        timestamp: Date.now()
      };
      this.submitAction(emergencyAction);
    }
  }

  // 🎯 TIMEOUT TECHNIQUE SEULEMENT (pour crash/nettoyage)
  private startBattleTimeout(): void {
    this.clearBattleTimeout();
    this.battleTimeoutId = setTimeout(() => {
      if (!this.battleEndHandled) {
        console.log('🧹 [BattleEngine] Timeout technique - Nettoyage après 30 minutes');
        this.forceBattleEnd('technical_timeout', 'Nettoyage technique automatique');
      }
    }, this.BATTLE_CRASH_TIMEOUT_MS);
  }

  // 🎯 MÉTHODES SIMPLIFIÉES (plus de timeout pour actions)

  private forceBattleEnd(reason: string, message: string): void {
    if (this.battleEndHandled) {
      console.log('⚠️ [BattleEngine] Battle end déjà traité (force)');
      return;
    }
    
    console.log(`🚨 [BattleEngine] Force fin combat: ${reason}`);
    
    this.battleEndHandled = true;
    this.gameState.isEnded = true;
    this.gameState.winner = 'player1';
    this.clearAllTimers();

    this.emit('battleEnd', {
      winner: 'player1',
      reason,
      message,
      gameState: this.gameState,
      forced: true
    });

    this.transitionToPhase(InternalBattlePhase.ENDED, reason);
  }

  private initializeAllModules(): void {
    this.phaseManager.initialize(this.gameState);
    this.actionProcessor.initialize(this.gameState);
    this.aiPlayer.initialize(this.gameState);
    this.battleEndManager.initialize(this.gameState);
    this.captureManager.initialize(this.gameState);
    this.koManager.initialize(this.gameState);
    this.configureBroadcastSystem();
  }

  private configureBroadcastSystem(): void {
    try {
      this.broadcastManager = BroadcastManagerFactory.createForWildBattle(
        this.gameState.battleId,
        this.gameState,
        this.gameState.player1.sessionId
      );

      if (this.broadcastManager) {
        this.broadcastManager.setEmitCallback((event) => {
          this.emit('battleEvent', event);
        });
      }

      this.spectatorManager = new SpectatorManager();
    } catch (error) {
      // Continue without broadcast on configuration error
    }
  }

  private async initializeAISystem(): Promise<void> {
    try {
      await this.aiNPCManager.initialize();
      this.registerPlayersInAI();
    } catch (error) {
      // Continue without AI on error
    }
  }

  private registerPlayersInAI(): void {
    try {
      if (this.gameState.player1.name && this.gameState.player1.name !== this.gameState.player1.sessionId) {
        this.aiNPCManager.registerPlayer({
          username: this.gameState.player1.name,
          sessionId: this.gameState.player1.sessionId,
          level: this.gameState.player1.pokemon?.level || 1,
          gold: 0,
          currentZone: 'battle_area',
          x: 0,
          y: 0
        });
      }
    } catch (error) {
      // Continue without AI registration on error
    }
  }

  private scheduleIntroTransition(): void {
    const INTRO_DELAY = process.env.NODE_ENV === 'test' ? 50 : 800;
    this.clearIntroTimer();
    
    this.introTimer = setTimeout(() => {
      try {
        if (this.isInitialized && this.getCurrentPhase() === InternalBattlePhase.INTRO) {
          const success = this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'intro_complete_fixed');
          if (!success && this.phaseManager.forceTransition) {
            console.log('🔧 [BattleEngine] Force transition intro');
            this.phaseManager.forceTransition(InternalBattlePhase.ACTION_SELECTION, 'force_intro_fix');
          }
        }
      } catch (error) {
        console.error('❌ [BattleEngine] Erreur transition intro:', error);
        this.forceBattleEnd('intro_transition_failed', 'Impossible de progresser au-delà de la phase intro');
      }
    }, INTRO_DELAY);
  }

  private handlePokemonEncounter(): void {
    if (this.gameState.type === 'wild' && this.gameState.player2.pokemon) {
      pokedexIntegrationService.handlePokemonEncounter({
        playerId: this.gameState.player1.name,
        pokemonId: this.gameState.player2.pokemon.id,
        level: this.gameState.player2.pokemon.level,
        location: 'Combat Sauvage',
        method: 'wild',
        sessionId: this.gameState.player1.sessionId,
        biome: 'battle_area',
        isEvent: false
      }).then(result => {
        if (result.success && result.isNewDiscovery) {
          this.emit('pokemonDiscovered', {
            pokemonId: this.gameState.player2.pokemon!.id,
            pokemonName: this.gameState.player2.pokemon!.name,
            playerId: this.gameState.player1.name,
            isNewDiscovery: true,
            notifications: result.notifications
          });
        }
      }).catch(() => {});
    }
  }

  private async handleCaptureAction(action: BattleAction, teamManager?: any): Promise<BattleResult> {
    this.transitionToPhase(InternalBattlePhase.CAPTURE, 'capture_attempt');
    
    if (!teamManager) {
      return this.createErrorResult('TeamManager requis pour la capture');
    }

    this.captureManager.initialize(this.gameState);
    const result = await this.captureManager.attemptCapture(
      action.playerId, 
      action.data.ballType || 'poke_ball', 
      teamManager
    );

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
  }

  // 🎯 NETTOYAGE TIMEOUTS SIMPLIFIÉ
  private clearAllTimers(): void {
    this.clearIntroTimer();
    this.clearBattleTimeout();
    // 🎯 PLUS DE turnTimeoutId, aiActionTimer (supprimés)
  }

  private clearIntroTimer(): void {
    if (this.introTimer) {
      clearTimeout(this.introTimer);
      this.introTimer = null;
    }
  }

  private clearBattleTimeout(): void {
    if (this.battleTimeoutId) {
      clearTimeout(this.battleTimeoutId);
      this.battleTimeoutId = null;
    }
  }

  private resetSubPhaseState(): void {
    this.currentSubPhase = SubPhase.NONE;
    this.orderedActions = [];
    this.currentAttackerData = null;
  }

  private getCurrentPokemonInGame(playerRole: PlayerRole): Pokemon | null {
    if (playerRole === 'player1') return this.gameState.player1.pokemon;
    if (playerRole === 'player2') return this.gameState.player2.pokemon;
    return null;
  }

  private getPlayerRole(playerId: string): PlayerRole | null {
    if (playerId === this.gameState.player1.sessionId) return 'player1';
    if (playerId === this.gameState.player2.sessionId || playerId === 'ai') return 'player2';
    return null;
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
    if (this.gameState.type === 'wild') return 800; // 🎯 Délai naturel simple
    return Math.min(this.aiPlayer.getThinkingDelay(), 1000);
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

  private validateTrainerConfig(config: TrainerBattleConfig): void {
    if (!config.player1?.name || !config.playerTeam?.length) {
      throw new Error('Configuration joueur invalide');
    }
    if (!config.trainer?.name || !config.trainer.pokemon?.length) {
      throw new Error('Configuration dresseur invalide');
    }
    if (config.type !== 'trainer') {
      throw new Error('Type de combat doit être "trainer"');
    }
  }

  private initializeTrainerGameState(config: TrainerBattleConfig): BattleGameState {
    return {
      battleId: `trainer_battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'trainer',
      phase: 'battle',
      turnNumber: 1,
      currentTurn: 'player1',
      player1: {
        sessionId: config.player1.sessionId,
        name: config.player1.name,
        pokemon: config.playerTeam[0]
      },
      player2: {
        sessionId: 'ai',
        name: config.trainer.name,
        pokemon: config.trainer.pokemon[0],
        isAI: true
      },
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

  private async savePokemonAfterBattle(): Promise<void> {
    try {
      const result = await this.battleEndManager.savePokemonAfterBattle();
      if (result.success) {
        this.emit('pokemonSaved', {
          events: result.events,
          data: result.data
        });
      } else {
        this.emit('saveError', { error: result.error });
      }
    } catch (error) {
      // Continue on error
    }
  }

  private handleEndedPhase(): void {
    if (this.battleEndHandled) {
      console.log('⚠️ [BattleEngine] Battle end déjà traité');
      return;
    }
    
    this.battleEndHandled = true;
    this.clearAllTimers();
    this.savePokemonAfterBattle();
    this.performFinalCleanup();
  }

  private performFinalCleanup(): void {
    this.isManualCleanup = true;
    
    if (this.spectatorManager) {
      this.spectatorManager.cleanupBattle(this.gameState.battleId);
    }
    
    if (this.broadcastManager) {
      this.broadcastManager.cleanup();
      this.broadcastManager = null;
    }
  }

  // === SPECTATOR MANAGEMENT ===

  setBattleWorldPosition(battleRoomId: string, worldPosition: { x: number; y: number; mapId: string }): void {
    if (this.spectatorManager) {
      this.spectatorManager.setBattleWorldPosition(
        this.gameState.battleId,
        battleRoomId,
        this.gameState,
        worldPosition
      );
    }
  }

  addSpectator(sessionId: string, battleRoomId: string, worldPosition: { x: number; y: number; mapId: string }): boolean {
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

  removeSpectator(sessionId: string): { removed: boolean; shouldLeaveBattleRoom: boolean; battleRoomId?: string; } {
    if (this.spectatorManager) {
      return this.spectatorManager.removeSpectator(sessionId);
    }
    return { removed: false, shouldLeaveBattleRoom: false };
  }

  // === MODULE SYSTEM ===

  addModule(name: string, module: BattleModule): void {
    this.modules.set(name, module);
    module.initialize(this);
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
        // Continue on error
      }
    });
  }

  // === CLEANUP ===

  cleanup(): void {
    if (!this.isManualCleanup && !this.gameState.isEnded) {
      return;
    }

    this.clearAllTimers();
    
    if (this.spectatorManager) {
      this.spectatorManager.cleanupBattle(this.gameState.battleId);
    }

    if (this.broadcastManager) {
      this.broadcastManager.cleanup();
      this.broadcastManager = null;
    }

    // 🆕 NETTOYAGE MODULES ÉTENDUS
    if (this.switchManager) {
      this.switchManager.reset();
    }
    if (this.trainerAI) {
      this.trainerAI.reset();
    }
    if (this.trainerRewardManager) {
      this.trainerRewardManager.reset();
    }

    // 🔥 NETTOYAGE EXISTANT
    this.phaseManager.reset();
    this.actionQueue.reset();
    this.actionProcessor.reset();
    this.aiPlayer.reset();
    this.battleEndManager.reset();
    this.captureManager.reset();
    this.koManager.reset();

    this.resetSubPhaseState();
    this.isInitialized = false;
    this.isProcessingActions = false;
    this.turnCounter = 0;
    this.transitionAttempts = 0;
    this.isManualCleanup = false;
    this.battleEndHandled = false;

    // 🆕 RESET ÉTAT DRESSEUR
    this.isTrainerBattle = false;
    this.trainerData = null;
    this.playerTeamManager = null;
    this.trainerTeamManager = null;
    this.pendingSwitches.clear();
  }

  // === DIAGNOSTICS ===

  getSystemState(): any {
    return {
      version: 'battle_engine_session3_trainer_complete_v1_no_timeout',
      isInitialized: this.isInitialized,
      isProcessingActions: this.isProcessingActions,
      currentSubPhase: this.currentSubPhase,
      turnCounter: this.turnCounter,
      transitionAttempts: this.transitionAttempts,
      isManualCleanup: this.isManualCleanup,
      battleEndHandled: this.battleEndHandled,
      isTrainerBattle: this.isTrainerBattle,
      timeouts: {
        battleCrashTimeout: this.battleTimeoutId !== null, // 🎯 Seulement technique
        // 🎯 SUPPRIMÉ: turnTimeout, aiActionTimer
      },
      phaseState: this.phaseManager.getPhaseState(),
      actionQueueState: this.actionQueue.getQueueState(),
      gameState: {
        battleId: this.gameState.battleId,
        type: this.gameState.type,
        phase: this.gameState.phase,
        isEnded: this.gameState.isEnded,
        winner: this.gameState.winner,
        turnNumber: this.gameState.turnNumber
      },
      trainerBattleState: this.isTrainerBattle ? {
        trainerId: this.trainerData?.trainerId,
        trainerName: this.trainerData?.name,
        trainerClass: this.trainerData?.trainerClass,
        playerTeamSize: this.playerTeamManager?.getAllPokemon().length,
        trainerTeamSize: this.trainerTeamManager?.getAllPokemon().length,
        switchManagerReady: this.switchManager?.isReady(),
        trainerAIReady: this.trainerAI?.isReady(),
        rewardManagerReady: this.trainerRewardManager?.isReady(),
        pendingSwitches: this.pendingSwitches.size
      } : null,
      pokemonExperience: {
        noTimeLimit: true,
        maxTurns: this.MAX_TURNS,
        technicalTimeoutOnly: this.BATTLE_CRASH_TIMEOUT_MS,
        message: "Prenez tout le temps nécessaire - Expérience Pokémon authentique"
      },
      newFeatures: [
        'trainer_battle_support_complete',
        'multi_pokemon_teams',
        'intelligent_switch_management', 
        'advanced_trainer_ai_integration',
        'ainpc_manager_integration',
        'reward_system_integration',
        'forced_switch_handling',
        'battle_memory_tracking',
        'strategic_ai_decisions',
        'seamless_wild_compatibility',
        'no_action_timeouts_authentic_pokemon', // 🎯 NOUVEAU
        'natural_ai_thinking_delays', // 🎯 NOUVEAU
        'technical_cleanup_only_timeout' // 🎯 NOUVEAU
      ]
    };
  }

  // 🎯 MÉTHODES TIMEOUT SUPPRIMÉES/SIMPLIFIÉES

  // ❌ SUPPRIMÉ: handleTurnTimeout() - plus de timeout pour actions
  // ❌ SUPPRIMÉ: forceDefaultActions() - plus de timeout pour actions  
  // ❌ SUPPRIMÉ: forceResolutionComplete() - plus de timeout pour actions
  // ❌ SUPPRIMÉ: forceNextTurn() - plus de timeout pour actions
  // ❌ SUPPRIMÉ: clearActionTimers() - plus de timeout pour actions
  // ❌ SUPPRIMÉ: clearTurnTimeout() - plus de timeout pour actions
  // ❌ SUPPRIMÉ: startTurnTimeout() - plus de timeout pour actions

  // 🎯 NOUVELLE MÉTHODE: Forcer résolution en cas d'urgence seulement
  private forceResolutionComplete(): void {
    console.log('🔧 [BattleEngine] Force fin résolution (urgence seulement)');
    
    this.isProcessingActions = false;
    this.resetSubPhaseState();
    this.gameState.turnNumber++;

    this.emit('resolutionComplete', {
      actionsExecuted: 0,
      battleEnded: false,
      newTurnNumber: this.gameState.turnNumber,
      message: "Résolution forcée par erreur technique"
    });

    if (this.isInitialized && !this.gameState.isEnded && !this.battleEndHandled) {
      if (!this.phaseManager.isReady()) {
        this.phaseManager.initialize(this.gameState);
      }
      this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'emergency_force_complete');
    }
  }
}

export default BattleEngine;
