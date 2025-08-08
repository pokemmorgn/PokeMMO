// server/src/battle/BattleEngine.ts
// 🚀 SYSTÈME SWITCH UNIVERSEL - TOUS TYPES DE COMBATS
// 🎯 MODIFICATION: Support changements Pokémon wild/trainer/pvp + suppression timeouts

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
import { 
  BattleConfig, 
  BattleGameState, 
  BattleResult, 
  BattleAction, 
  BattleModule, 
  PlayerRole, 
  Pokemon,
  // 🆕 IMPORTS NOUVEAUX TYPES UNIVERSELS
  PokemonTeam,
  TeamConfiguration,
  SwitchAction,
  createPokemonTeam,
  getDefaultTeamConfig,
  supportsSwitching,
  isSwitchAction,
  createSwitchAction
} from './types/BattleTypes';
import { 
  TrainerBattleConfig, 
  TrainerGameState, 
  TrainerData, 
  isTrainerBattleConfig,
  createTrainerBattleConfig,
  mapTrainerPhaseToInternal,
  TRAINER_BATTLE_CONSTANTS
} from './types/TrainerBattleTypes';
import { pokedexIntegrationService } from '../services/PokedexIntegrationService';
import { getAINPCManager } from '../Intelligence/AINPCManager';
import { ActionType } from '../Intelligence/Core/ActionTypes';
import type { AINPCManager } from '../Intelligence/AINPCManager';

// 🆕 IMPORT NOUVEAUX MODULES
import { TrainerAI } from './modules/TrainerAI';
import { TrainerRewardManager } from './modules/TrainerRewardManager';

enum SubPhase {
  NONE = 'none',
  ATTACKER_1 = 'attacker_1_phase',
  ATTACKER_2 = 'attacker_2_phase',
  KO_CHECK = 'ko_check_phase',
  SWITCH_RESOLUTION = 'switch_resolution_phase'
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

  // 🆕 MODULES UNIVERSELS (pas seulement trainer)
  private switchManager = new SwitchManager();
  private trainerAI = new TrainerAI();
  private trainerRewardManager = new TrainerRewardManager();
  
  // 🆕 TEAM MANAGERS UNIVERSELS
  private playerTeamManager: TrainerTeamManager | null = null;
  private opponentTeamManager: TrainerTeamManager | null = null;

  // State
  private gameState: BattleGameState = this.createEmptyState();
  private isInitialized = false;
  private isProcessingActions = false;
  private currentSubPhase = SubPhase.NONE;
  private orderedActions: any[] = [];
  private currentAttackerData: any = null;

  // 🆕 ÉTAT UNIVERSEL SWITCH
  private isMultiPokemonBattle = false;        // Combat avec équipes multiples
  private switchingEnabled = false;            // Changements autorisés
  private battleTeamConfig: TeamConfiguration | null = null;
  
  // 🔥 ÉTAT DRESSEUR (CONSERVÉ POUR COMPATIBILITÉ)
  private isTrainerBattle = false;
  private trainerData: TrainerData | null = null;
  private pendingSwitches: Map<PlayerRole, SwitchAction> = new Map();

  // Broadcast & spectators
  private broadcastManager: BroadcastManager | null = null;
  private spectatorManager: SpectatorManager | null = null;

  // 🎯 TIMEOUTS RÉVISÉS - SEULEMENT TECHNIQUES
  private battleTimeoutId: NodeJS.Timeout | null = null;
  private introTimer: NodeJS.Timeout | null = null;

  // Configuration optimisée
  private turnCounter = 0;
  private transitionAttempts = 0;
  private readonly MAX_TURNS = 200;
  private readonly MAX_TRANSITION_ATTEMPTS = 3;
  private readonly BATTLE_CRASH_TIMEOUT_MS = 1800000; // 30 minutes (technique seulement)

  // Events
  private eventListeners = new Map<string, Function[]>();
  private modules = new Map<string, BattleModule>();

  // Protection
  private isManualCleanup = false;
  private battleEndHandled = false;

  // === 🆕 API PRINCIPALE UNIVERSELLE ===

  /**
   * 🆕 NOUVELLE MÉTHODE : Combat universel avec détection automatique
   */
  async startBattle(config: BattleConfig): Promise<BattleResult> {
    console.log('🎯 [BattleEngine] Démarrage combat universel...');
    console.log(`    Type: ${config.type}`);
    console.log(`    Player1 team size: ${config.player1.team?.length || 1}`);
    console.log(`    Opponent team size: ${config.opponent.team?.length || 1}`);
    
    try {
      this.clearAllTimers();
      this.validateConfig(config);

      // 🆕 AUTO-DÉTECTION COMBAT DRESSEUR
      if (isTrainerBattleConfig(config)) {
        console.log('🎯 [BattleEngine] Combat dresseur détecté, utilisation logique spécialisée...');
        return await this.startTrainerBattle(config);
      }

      // 🆕 INITIALISATION UNIVERSELLE
      this.gameState = this.initializeGameState(config);
      this.isTrainerBattle = false;
      
      // 🆕 DÉTECTION MULTI-POKÉMON & SWITCH
      this.detectMultiPokemonBattle(config);
      
      // 🆕 INITIALISATION ÉQUIPES UNIVERSELLES
      await this.initializeUniversalTeamManagers(config);
      
      // 🆕 INITIALISATION MODULES (y compris switch si nécessaire)
      this.initializeAllModules();
      this.startBattleTimeout();
      this.initializeAISystem();
      
      this.isInitialized = true;
      this.handlePokemonEncounter();
      this.scheduleIntroTransition();

      // 🆕 MESSAGES ADAPTÉS
      const introMessage = this.generateIntroMessage();
      
      this.emit('battleStart', {
        gameState: this.gameState,
        phase: InternalBattlePhase.INTRO,
        introMessage,
        isTrainerBattle: this.isTrainerBattle,
        isMultiPokemonBattle: this.isMultiPokemonBattle,
        switchingEnabled: this.switchingEnabled
      });

      return {
        success: true,
        gameState: this.gameState,
        events: [introMessage]
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
   * 🔥 COMBAT DRESSEUR SPÉCIALISÉ (INCHANGÉ)
   */
  async startTrainerBattle(config: TrainerBattleConfig): Promise<BattleResult> {
    try {
      console.log('🎯 [BattleEngine] Démarrage combat dresseur...');
      
      this.clearAllTimers();
      this.validateTrainerConfig(config);
      
      // 🆕 INITIALISATION SPÉCIFIQUE DRESSEUR
      this.gameState = this.initializeTrainerGameState(config);
      this.isTrainerBattle = true;
      this.isMultiPokemonBattle = true; // Toujours multi pour dresseurs
      this.switchingEnabled = true;
      this.trainerData = config.trainer;
      
      // 🆕 INITIALISATION TEAM MANAGERS
      await this.initializeTrainerTeamManagers(config);
      
      // 🆕 INITIALISATION MODULES ÉTENDUS
      this.initializeExtendedModules();
      this.initializeAllModules();
      this.startBattleTimeout();
      
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
        isMultiPokemonBattle: true,
        switchingEnabled: true,
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

  // === 🆕 NOUVELLES MÉTHODES UNIVERSELLES ===

  /**
   * 🆕 Détecte si combat multi-Pokémon
   */
  private detectMultiPokemonBattle(config: BattleConfig): void {
    const hasPlayerTeam = config.player1.team && config.player1.team.length > 1;
    const hasOpponentTeam = config.opponent.team && config.opponent.team.length > 1;
    
    this.isMultiPokemonBattle = hasPlayerTeam || hasOpponentTeam;
    this.switchingEnabled = supportsSwitching(config) && this.isMultiPokemonBattle;
    this.battleTeamConfig = this.isMultiPokemonBattle ? getDefaultTeamConfig(config.type) : null;
    
    console.log(`🔍 [BattleEngine] Détection combat:`);
    console.log(`    Multi-Pokémon: ${this.isMultiPokemonBattle}`);
    console.log(`    Changements: ${this.switchingEnabled}`);
    console.log(`    Player team: ${hasPlayerTeam ? config.player1.team!.length : 1}`);
    console.log(`    Opponent team: ${hasOpponentTeam ? config.opponent.team!.length : 1}`);
  }

  /**
   * 🆕 Initialisation équipes UNIVERSELLES (tous types combats)
   */
  private async initializeUniversalTeamManagers(config: BattleConfig): Promise<void> {
    console.log('🎮 [BattleEngine] Initialisation Team Managers universels...');
    
    try {
      // === PLAYER TEAM ===
      if (config.player1.team && config.player1.team.length > 1) {
        console.log(`👤 [BattleEngine] Création équipe joueur: ${config.player1.team.length} Pokémon`);
        this.playerTeamManager = new TrainerTeamManager(config.player1.sessionId);
        this.playerTeamManager.initializeWithPokemon(config.player1.team);
      } else {
        console.log('👤 [BattleEngine] Joueur combat 1v1 - pas de TeamManager');
        this.playerTeamManager = null;
      }
      
      // === OPPONENT TEAM ===
      if (config.opponent.team && config.opponent.team.length > 1) {
        console.log(`🤖 [BattleEngine] Création équipe adversaire: ${config.opponent.team.length} Pokémon`);
        this.opponentTeamManager = new TrainerTeamManager(config.opponent.sessionId || 'opponent');
        this.opponentTeamManager.initializeWithPokemon(config.opponent.team);
      } else if (config.type === 'wild' && this.switchingEnabled) {
        // 🆕 CAS SPÉCIAL: Combat sauvage avec switch côté joueur
        console.log('🌿 [BattleEngine] Combat sauvage - équipe artificielle adversaire pour compatibilité switch');
        this.opponentTeamManager = new TrainerTeamManager('wild_opponent');
        this.opponentTeamManager.initializeWithPokemon([config.opponent.pokemon]);
      } else {
        console.log('🤖 [BattleEngine] Adversaire combat 1v1 - pas de TeamManager');
        this.opponentTeamManager = null;
      }
      
      console.log(`✅ [BattleEngine] Team Managers créés - Player: ${this.playerTeamManager ? 'OUI' : 'NON'}, Opponent: ${this.opponentTeamManager ? 'OUI' : 'NON'}`);
      
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur Team Managers universels:', error);
      throw error;
    }
  }

  /**
   * 🆕 Initialisation modules universels (switch si nécessaire)
   */
  private initializeUniversalModules(): void {
    console.log('🔧 [BattleEngine] Initialisation modules universels...');
    
    try {
      // 🆕 SWITCH MANAGER - pour tous types si équipes multiples
      if (this.isMultiPokemonBattle && this.switchingEnabled) {
        this.switchManager.initialize(
          this.gameState,
          this.playerTeamManager,
          this.opponentTeamManager,
          this.battleTeamConfig
        );
        
        // Configuration switch selon type combat
        this.configureUniversalSwitchBehavior();
        
        console.log('✅ [BattleEngine] SwitchManager initialisé pour combat multi-Pokémon');
      } else {
        console.log('ℹ️ [BattleEngine] SwitchManager non requis (combat 1v1)');
      }
      
      // 🆕 ACTION QUEUE - configuration selon capacités switch
      this.actionQueue.configureSwitchBehavior(
        this.switchingEnabled,
        this.battleTeamConfig?.maxSwitchesPerTurn || 1,
        'priority'
      );
      
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur modules universels:', error);
      throw error;
    }
  }

  /**
   * 🆕 Configuration switch selon type combat
   */
  private configureUniversalSwitchBehavior(): void {
    if (!this.battleTeamConfig) return;
    
    console.log(`🔧 [BattleEngine] Configuration switch pour combat ${this.gameState.type}:`);
    console.log(`    Max switches/tour: ${this.battleTeamConfig.maxSwitchesPerTurn}`);
    console.log(`    Cooldown: ${this.battleTeamConfig.switchCooldown}`);
    console.log(`    Force switch: ${this.battleTeamConfig.forceSwitch}`);
  }

  /**
   * 🆕 SOUMISSION ACTION UNIVERSELLE avec support switch
   */
  async submitAction(action: BattleAction, teamManager?: any): Promise<BattleResult> {
    console.log('🚨 [BattleEngine] submitAction() ENTRY:');
    console.log(`    action.playerId: "${action.playerId}"`);
    console.log(`    action.type: "${action.type}"`);
    console.log(`    switching enabled: ${this.switchingEnabled}`);

    if (!this.isInitialized || this.gameState.isEnded) {
      return this.createErrorResult('Combat non disponible');
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
      // 🆕 TRAITEMENT CHANGEMENT UNIVERSEL
      if (action.type === 'switch' && this.switchingEnabled) {
        return await this.handleUniversalSwitchAction(action as SwitchAction, playerRole);
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
        isTrainerBattle: this.isTrainerBattle,
        isMultiPokemonBattle: this.isMultiPokemonBattle
      });

      // 🔥 VÉRIFICATION ACTIONS PRÊTES
      if (this.actionQueue.areAllActionsReady()) {
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

  /**
   * 🆕 Traitement changements universels (tous types combats)
   */
  private async handleUniversalSwitchAction(switchAction: SwitchAction, playerRole: PlayerRole): Promise<BattleResult> {
    console.log(`🔄 [BattleEngine] Traitement changement universel: ${playerRole} (type: ${this.gameState.type})`);
    
    if (!this.switchManager.isReady()) {
      return this.createErrorResult('SwitchManager non initialisé');
    }

    // Déterminer le bon TeamManager
    const teamManager = playerRole === 'player1' ? this.playerTeamManager : this.opponentTeamManager;
    
    if (!teamManager) {
      // 🆕 CAS SPÉCIAL: Combat 1v1 avec tentative switch
      console.log(`⚠️ [BattleEngine] Tentative switch sans équipe (${playerRole}) - ${this.gameState.type}`);
      return this.createErrorResult(
        this.gameState.type === 'wild' ? 
          'Vous ne pouvez pas changer de Pokémon dans un combat sauvage 1v1' :
          'Aucune équipe disponible pour le changement'
      );
    }

    try {
      const switchResult = await this.switchManager.processSwitchAction(switchAction);
      
      if (switchResult.success) {
        this.updateGameStateAfterSwitch(playerRole, switchResult);
        
        this.trackPlayerActionInBattle(switchAction.playerId, 'POKEMON_SWITCH', {
          fromIndex: switchAction.data.fromPokemonIndex,
          toIndex: switchAction.data.toPokemonIndex,
          isForced: switchAction.data.isForced,
          battleType: this.gameState.type
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
   * 🆕 Génération messages intro adaptés
   */
  private generateIntroMessage(): string {
    if (this.isTrainerBattle && this.trainerData) {
      return `Le dresseur ${this.trainerData.name} vous défie !`;
    }
    
    const opponentName = this.gameState.player2.pokemon?.name || 'Pokémon';
    
    if (this.isMultiPokemonBattle) {
      return `Un ${opponentName} sauvage apparaît ! Vous pouvez changer de Pokémon !`;
    } else {
      return `Un ${opponentName} sauvage apparaît !`;
    }
  }

  // === 🔥 MÉTHODES DRESSEUR SPÉCIALISÉES (INCHANGÉES) ===

  /**
   * 🔥 Initialise les gestionnaires d'équipes DRESSEUR (spécialisé)
   */
  private async initializeTrainerTeamManagers(config: TrainerBattleConfig): Promise<void> {
    console.log('🎮 [BattleEngine] Initialisation Team Managers DRESSEUR...');
    
    try {
      this.playerTeamManager = new TrainerTeamManager(config.player1.sessionId);
      this.playerTeamManager.initializeWithPokemon(config.playerTeam);
      
      this.opponentTeamManager = new TrainerTeamManager('ai');
      this.opponentTeamManager.initializeWithPokemon(config.trainer.pokemon);
      
      console.log(`✅ [BattleEngine] Team Managers dresseur créés - Joueur: ${config.playerTeam.length} Pokémon, Dresseur: ${config.trainer.pokemon.length} Pokémon`);
      
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur Team Managers dresseur:', error);
      throw error;
    }
  }

  /**
   * 🔥 Initialise les modules étendus DRESSEUR (spécialisé)
   */
  private initializeExtendedModules(): void {
    console.log('🔧 [BattleEngine] Initialisation modules étendus dresseur...');
    
    try {
      if (this.playerTeamManager && this.opponentTeamManager) {
        this.switchManager.initialize(
          this.gameState,
          this.playerTeamManager,
          this.opponentTeamManager,
          this.trainerData?.specialRules
        );
        console.log('✅ [BattleEngine] SwitchManager dresseur initialisé');
      }
      
      if (this.trainerData) {
        this.trainerAI.initialize(
          this.trainerData,
          this.aiNPCManager,
          this.opponentTeamManager
        );
        console.log('✅ [BattleEngine] TrainerAI initialisé');
      }
      
      this.trainerRewardManager.initialize(this.gameState);
      console.log('✅ [BattleEngine] TrainerRewardManager initialisé');
      
      this.actionQueue.configureSwitchBehavior(true, 2, 'priority');
      
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur modules étendus dresseur:', error);
      throw error;
    }
  }

  // === 🔥 GESTION PHASES UNIVERSELLE ===

  private handleActionSelectionPhase(): void {
    this.actionQueue.clear();
    this.resetSubPhaseState();

    // 🆕 RESET COMPTEURS SWITCH POUR NOUVEAU TOUR
    if (this.switchingEnabled && this.switchManager.isReady()) {
      this.switchManager.resetTurnCounters(this.gameState.turnNumber);
    }

    this.emit('actionSelectionStart', {
      canAct: true,
      gameState: this.gameState,
      turnNumber: this.gameState.turnNumber,
      isTrainerBattle: this.isTrainerBattle,
      isMultiPokemonBattle: this.isMultiPokemonBattle,
      switchingEnabled: this.switchingEnabled,
      // 🆕 OPTIONS SWITCH UNIVERSELLES
      canSwitch: this.canPlayerSwitch('player1'),
      availableSwitches: this.getAvailableSwitches('player1'),
      noTimeLimit: true,
      message: "Prenez tout le temps nécessaire pour choisir votre action"
    });

    // 🆕 IA ADAPTÉE AU TYPE DE COMBAT
    if (this.isTrainerBattle) {
      this.scheduleTrainerAIAction();
    } else {
      this.scheduleAIAction();
    }
  }

  /**
   * 🆕 Vérifie si un joueur peut changer de Pokémon
   */
  private canPlayerSwitch(playerRole: PlayerRole): boolean {
    if (!this.switchingEnabled) return false;
    
    const teamManager = playerRole === 'player1' ? this.playerTeamManager : this.opponentTeamManager;
    if (!teamManager) return false;
    
    const analysis = teamManager.analyzeTeam();
    return analysis.alivePokemon > 1;
  }

  /**
   * 🆕 Récupère options de changement disponibles
   */
  private getAvailableSwitches(playerRole: PlayerRole): number[] {
    if (!this.switchingEnabled) return [];
    
    const teamManager = playerRole === 'player1' ? this.playerTeamManager : this.opponentTeamManager;
    if (!teamManager) return [];
    
    const analysis = this.switchManager.analyzeSwitchOptions(playerRole);
    return analysis.availablePokemon;
  }

  // === 🔥 GESTION KO UNIVERSELLE ===

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
      
      // 🆕 GESTION KO UNIVERSELLE
      if (this.isMultiPokemonBattle && this.switchingEnabled) {
        await this.handleUniversalKO(player1KO, player2KO);
        return;
      }
      
      // 🔥 GESTION KO CLASSIQUE 1v1
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
   * 🆕 Gestion KO universelle (tous types combats avec équipes)
   */
  private async handleUniversalKO(player1KO: any, player2KO: any): Promise<void> {
    console.log('💀 [BattleEngine] Gestion KO universelle...');
    
    try {
      if (player1KO.isKO && this.playerTeamManager) {
        await this.handlePlayerKO('player1');
      }
      
      if (player2KO.isKO && this.opponentTeamManager) {
        if (this.isTrainerBattle) {
          await this.handleTrainerKO('player2');
        } else {
          await this.handleOpponentKO('player2');
        }
      }
      
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur gestion KO universelle:', error);
      await this.completeActionResolution();
    }
  }

  /**
   * 🆕 Gestion KO adversaire (wild/pvp)
   */
  private async handleOpponentKO(playerRole: PlayerRole): Promise<void> {
    const teamManager = this.opponentTeamManager;
    if (!teamManager) return;

    const analysis = teamManager.analyzeTeam();
    
    if (!analysis.battleReady) {
      console.log(`💀 [BattleEngine] Équipe ${playerRole} vaincue !`);
      const winner = 'player1';
      
      await this.handleBattleEnd({
        isEnded: true,
        winner,
        reason: this.gameState.type === 'wild' ? 'wild_defeated' : 'opponent_defeated',
        message: this.gameState.type === 'wild' ? 
          'Pokémon sauvage vaincu !' : 
          'Adversaire vaincu !'
      });
      return;
    }

    // 🆕 CHANGEMENT FORCÉ POUR ADVERSAIRE (si équipe multiple)
    console.log(`🔄 [BattleEngine] Changement forcé adversaire ${playerRole}`);
    
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
      const winner = 'player1';
      await this.handleBattleEnd({
        isEnded: true,
        winner,
        reason: 'team_defeat',
        message: 'Adversaire vaincu !'
      });
    }
  }

  /**
   * 🔥 Gestion KO joueur avec changement forcé (universel)
   */
  private async handlePlayerKO(playerRole: PlayerRole): Promise<void> {
    const teamManager = this.playerTeamManager;
    if (!teamManager) return;

    const analysis = teamManager.analyzeTeam();
    
    if (!analysis.battleReady) {
      console.log(`💀 [BattleEngine] Équipe ${playerRole} vaincue !`);
      const winner = 'player2';
      
      if (this.isTrainerBattle) {
        await this.handleTrainerBattleEnd(winner, 'team_defeat');
      } else {
        await this.handleBattleEnd({
          isEnded: true,
          winner,
          reason: 'team_defeat',
          message: 'Votre équipe est vaincue !'
        });
      }
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
      const winner = 'player2';
      if (this.isTrainerBattle) {
        await this.handleTrainerBattleEnd(winner, 'team_defeat');
      } else {
        await this.handleBattleEnd({
          isEnded: true,
          winner,
          reason: 'team_defeat',
          message: 'Votre équipe est vaincue !'
        });
      }
    }
  }

  /**
   * 🆕 Met à jour le GameState après changement (universel)
   */
  private updateGameStateAfterSwitch(playerRole: PlayerRole, switchResult: BattleResult): void {
    if (!switchResult.data) return;

    const teamManager = playerRole === 'player1' ? this.playerTeamManager : this.opponentTeamManager;
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

  // === 🔥 MÉTHODES DRESSEUR (CONSERVÉES POUR COMPATIBILITÉ) ===

  /**
   * 🔥 IA Dresseur intelligente (SANS timeout)
   */
  private scheduleTrainerAIAction(): void {
    if (this.gameState.player2.sessionId !== 'ai') return;
    
    const thinkingDelay = this.trainerAI.isReady() ? 
      this.trainerAI.getThinkingDelay() : 
      1200;
    
    setTimeout(() => {
      if (this.getCurrentPhase() === InternalBattlePhase.ACTION_SELECTION && this.isInitialized) {
        this.executeTrainerAIAction();
      }
    }, thinkingDelay);
  }

  /**
   * 🔥 Exécute action IA dresseur
   */
  private executeTrainerAIAction(): void {
    try {
      if (!this.trainerAI.isReady()) {
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
        this.executeAIAction();
      }
      
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur IA dresseur:', error);
      this.executeAIAction();
    }
  }

  /**
   * 🔥 Gestion KO dresseur (identique logique)
   */
  private async handleTrainerKO(playerRole: PlayerRole): Promise<void> {
    await this.handlePlayerKO(playerRole);
  }

  /**
   * 🔥 Fin spécifique combat dresseur
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

  // === 🔥 MÉTHODES EXISTANTES PRÉSERVÉES (AVEC EXTENSIONS) ===

  private async handleBattleEnd(battleEndCheck: any): Promise<void> {
    console.log(`🏆 [BattleEngine] Combat terminé - Vainqueur: ${battleEndCheck.winner}`);
    
    this.gameState.isEnded = true;
    this.gameState.winner = battleEndCheck.winner;
    
    this.emit('battleEnd', {
      winner: battleEndCheck.winner,
      reason: battleEndCheck.reason,
      message: battleEndCheck.message,
      gameState: this.gameState,
      koVictory: true,
      isMultiPokemonBattle: this.isMultiPokemonBattle
    });
    
    this.transitionToPhase(InternalBattlePhase.ENDED, battleEndCheck.reason);
  }

  /**
   * 🔥 Initialise tous les modules (version étendue)
   */
  private initializeAllModules(): void {
    this.phaseManager.initialize(this.gameState);
    this.actionProcessor.initialize(this.gameState);
    this.aiPlayer.initialize(this.gameState);
    this.battleEndManager.initialize(this.gameState);
    this.captureManager.initialize(this.gameState);
    this.koManager.initialize(this.gameState);
    
    // 🆕 INITIALISER MODULES UNIVERSELS SI NÉCESSAIRE
    this.initializeUniversalModules();
    
    this.configureBroadcastSystem();
  }

  // === 🔥 MÉTHODES UTILITAIRES CONSERVÉES ===

  private scheduleAIAction(): void {
    if (this.gameState.player2.sessionId !== 'ai') return;
    
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

  // === API PUBLIQUE (CONSERVÉE) ===

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
    
    return Math.min(1500 + Math.random() * 2000, 3500);
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

  // === MÉTHODES DE TRAITEMENT (CONSERVÉES) ===

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
      isTrainerBattle: this.isTrainerBattle,
      isMultiPokemonBattle: this.isMultiPokemonBattle,
      switchingEnabled: this.switchingEnabled
    });

    return true;
  }

  private async handleActionResolutionPhase(): Promise<void> {
    this.isProcessingActions = true;

    try {
      const allActions = this.actionQueue.getAllActions();
      if (allActions.length === 0) {
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
        continue;
      }

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
        this.forceBattleEnd('transition_failed', 'Impossible de continuer');
      }
    } else {
      this.transitionToPhase(InternalBattlePhase.ENDED, 'battle_ended');
    }
  }

  // === MÉTHODES HELPERS ÉTENDUES ===

  private startBattleTimeout(): void {
    this.clearBattleTimeout();
    this.battleTimeoutId = setTimeout(() => {
      if (!this.battleEndHandled) {
        console.log('🧹 [BattleEngine] Timeout technique - Nettoyage après 30 minutes');
        this.forceBattleEnd('technical_timeout', 'Nettoyage technique automatique');
      }
    }, this.BATTLE_CRASH_TIMEOUT_MS);
  }

  private forceBattleEnd(reason: string, message: string): void {
    if (this.battleEndHandled) return;
    
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
      // Continue sans broadcast
    }
  }

  private async initializeAISystem(): Promise<void> {
    try {
      await this.aiNPCManager.initialize();
      this.registerPlayersInAI();
    } catch (error) {
      // Continue sans IA
    }
  }

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
      // Continue sans enregistrement IA
    }
  }

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

  private scheduleIntroTransition(): void {
    const INTRO_DELAY = process.env.NODE_ENV === 'test' ? 50 : 800;
    this.clearIntroTimer();
    
    this.introTimer = setTimeout(() => {
      try {
        if (this.isInitialized && this.getCurrentPhase() === InternalBattlePhase.INTRO) {
          const success = this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'intro_complete_fixed');
          if (!success && this.phaseManager.forceTransition) {
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

  // === TRACKING ET IA ===

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
    } catch (error) {
      // Silencieux
    }
  }

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
      // Silencieux
    }
  }

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

  // === UTILITAIRES ===

  private getPlayerName(playerId: string): string {
    if (playerId === this.gameState.player1.sessionId) {
      return this.gameState.player1.name;
    }
    return playerId;
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

  // === VALIDATION ===

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

  // === INITIALISATION ÉTATS ===

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
        pokemon: config.playerTeam[0],
        // 🆕 ÉQUIPE UNIVERSELLE
        team: createPokemonTeam(config.playerTeam, 0, 'player'),
        teamConfig: getDefaultTeamConfig('trainer')
      },
      player2: {
        sessionId: 'ai',
        name: config.trainer.name,
        pokemon: config.trainer.pokemon[0],
        isAI: true,
        // 🆕 ÉQUIPE UNIVERSELLE
        team: createPokemonTeam(config.trainer.pokemon, 0, 'trainer'),
        teamConfig: getDefaultTeamConfig('trainer')
      },
      isEnded: false,
      winner: null,
      // 🆕 PROPRIÉTÉS UNIVERSELLES
      isMultiPokemonBattle: true,
      switchRulesActive: getDefaultTeamConfig('trainer')
    };
  }

  private initializeGameState(config: BattleConfig): BattleGameState {
    const hasPlayerTeam = config.player1.team && config.player1.team.length > 1;
    const hasOpponentTeam = config.opponent.team && config.opponent.team.length > 1;
    const isMultiPokemon = hasPlayerTeam || hasOpponentTeam;
    
    return {
      battleId: `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: config.type,
      phase: 'battle',
      turnNumber: 1,
      currentTurn: 'player1',
      player1: {
        sessionId: config.player1.sessionId,
        name: config.player1.name,
        pokemon: { ...config.player1.pokemon },
        // 🆕 ÉQUIPE UNIVERSELLE SI FOURNIE
        team: hasPlayerTeam ? createPokemonTeam(config.player1.team!, 0, 'player') : undefined,
        teamConfig: hasPlayerTeam ? getDefaultTeamConfig(config.type) : undefined
      },
      player2: {
        sessionId: config.opponent.sessionId || 'ai',
        name: config.opponent.name || 'Pokémon Sauvage',
        pokemon: { ...config.opponent.pokemon },
        // 🆕 ÉQUIPE UNIVERSELLE SI FOURNIE
        team: hasOpponentTeam ? createPokemonTeam(config.opponent.team!, 0, 'wild') : undefined,
        teamConfig: hasOpponentTeam ? getDefaultTeamConfig(config.type) : undefined
      },
      isEnded: false,
      winner: null,
      // 🆕 PROPRIÉTÉS UNIVERSELLES
      isMultiPokemonBattle: isMultiPokemon,
      switchRulesActive: isMultiPokemon ? getDefaultTeamConfig(config.type) : undefined
    };
  }

  // === NETTOYAGE ===

  private clearAllTimers(): void {
    this.clearIntroTimer();
    this.clearBattleTimeout();
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
      // Continue sur erreur
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

  // === SPECTATEUR MANAGEMENT ===

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

  // === SYSTÈME MODULES ===

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
        // Continue sur erreur
      }
    });
  }

  // === NETTOYAGE COMPLET ===

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

    // 🆕 NETTOYAGE MODULES UNIVERSELS
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

    // 🆕 RESET ÉTAT UNIVERSEL
    this.isMultiPokemonBattle = false;
    this.switchingEnabled = false;
    this.battleTeamConfig = null;
    this.playerTeamManager = null;
    this.opponentTeamManager = null;
    
    // 🔥 RESET ÉTAT DRESSEUR
    this.isTrainerBattle = false;
    this.trainerData = null;
    this.pendingSwitches.clear();
  }

  // === DIAGNOSTICS ÉTENDUS ===

  getSystemState(): any {
    return {
      version: 'battle_engine_universal_switch_v3_complete',
      isInitialized: this.isInitialized,
      isProcessingActions: this.isProcessingActions,
      currentSubPhase: this.currentSubPhase,
      turnCounter: this.turnCounter,
      transitionAttempts: this.transitionAttempts,
      isManualCleanup: this.isManualCleanup,
      battleEndHandled: this.battleEndHandled,
      
      // 🆕 ÉTAT UNIVERSEL
      battleType: this.gameState.type,
      isMultiPokemonBattle: this.isMultiPokemonBattle,
      switchingEnabled: this.switchingEnabled,
      teamManagersActive: {
        player: this.playerTeamManager !== null,
        opponent: this.opponentTeamManager !== null
      },
      
      // 🔥 ÉTAT DRESSEUR (CONSERVÉ)
      isTrainerBattle: this.isTrainerBattle,
      
      timeouts: {
        battleCrashTimeout: this.battleTimeoutId !== null,
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
      
      // 🆕 INFORMATIONS ÉQUIPES UNIVERSELLES
      teamInfo: {
        player1TeamSize: this.playerTeamManager?.getAllPokemon().length || 1,
        player2TeamSize: this.opponentTeamManager?.getAllPokemon().length || 1,
        switchManagerReady: this.switchManager?.isReady() || false,
        battleTeamConfig: this.battleTeamConfig
      },
      
      // 🔥 ÉTAT DRESSEUR SPÉCIALISÉ (SI APPLICABLE)
      trainerBattleState: this.isTrainerBattle ? {
        trainerId: this.trainerData?.trainerId,
        trainerName: this.trainerData?.name,
        trainerClass: this.trainerData?.trainerClass,
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
      
      // 🆕 NOUVELLES FONCTIONNALITÉS
      newFeaturesUniversal: [
        'universal_switch_support',           // Support changements tous combats
        'multi_pokemon_wild_battles',        // Combats sauvages multi-Pokémon  
        'team_configuration_per_battle_type', // Config par type combat
        'automatic_battle_type_detection',   // Détection automatique type
        'backward_compatibility_preserved',  // Compatibilité préservée
        'enhanced_team_managers',            // Gestionnaires équipes étendus
        'universal_ko_handling',            // Gestion KO universelle
        'switch_options_in_action_selection', // Options changement en sélection
        'natural_pokemon_experience',       // Expérience Pokémon authentique
        'technical_cleanup_only_timeout'    // Timeout technique seulement
      ]
    };
  }

  // 🆕 NOUVELLES MÉTHODES API

  /**
   * 🆕 Vérifie si le combat supporte les changements
   */
  supportsSwitching(): boolean {
    return this.switchingEnabled;
  }

  /**
   * 🆕 Récupère les options de changement pour un joueur
   */
  getSwitchOptions(playerRole: PlayerRole): {
    canSwitch: boolean;
    availableOptions: number[];
    restrictions: string[];
  } {
    if (!this.switchingEnabled || !this.switchManager.isReady()) {
      return {
        canSwitch: false,
        availableOptions: [],
        restrictions: ['Changements non supportés dans ce combat']
      };
    }

    return this.switchManager.analyzeSwitchOptions(playerRole);
  }

  /**
   * 🆕 Crée une action de changement pour le joueur
   */
  createSwitchActionForPlayer(
    playerId: string,
    fromIndex: number,
    toIndex: number,
    isForced: boolean = false
  ): SwitchAction | null {
    if (!this.switchingEnabled) {
      return null;
    }

    return createSwitchAction(playerId, fromIndex, toIndex, isForced, this.gameState.type);
  }

  /**
   * 🆕 Informations sur l'état des équipes
   */
  getTeamsInfo(): {
    player1: { size: number; alive: number; canSwitch: boolean };
    player2: { size: number; alive: number; canSwitch: boolean };
    battleSupportsTeams: boolean;
  } {
    const player1Info = this.playerTeamManager ? 
      (() => {
        const analysis = this.playerTeamManager!.analyzeTeam();
        return {
          size: analysis.totalPokemon,
          alive: analysis.alivePokemon,
          canSwitch: this.canPlayerSwitch('player1')
        };
      })() :
      { size: 1, alive: this.gameState.player1.pokemon?.currentHp ? 1 : 0, canSwitch: false };

    const player2Info = this.opponentTeamManager ? 
      (() => {
        const analysis = this.opponentTeamManager!.analyzeTeam();
        return {
          size: analysis.totalPokemon,
          alive: analysis.alivePokemon,
          canSwitch: this.canPlayerSwitch('player2')
        };
      })() :
      { size: 1, alive: this.gameState.player2.pokemon?.currentHp ? 1 : 0, canSwitch: false };

    return {
      player1: player1Info,
      player2: player2Info,
      battleSupportsTeams: this.isMultiPokemonBattle
    };
  }
}

export default BattleEngine;
