// server/src/battle/BattleEngine.ts
// BattleEngine Optimisé - Version Corrigée

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
import { BattleConfig, BattleGameState, BattleResult, BattleAction, BattleModule, PlayerRole, Pokemon } from './types/BattleTypes';
import { pokedexIntegrationService } from '../services/PokedexIntegrationService';
import { getAINPCManager } from '../Intelligence/AINPCManager';
import { ActionType } from '../Intelligence/Core/ActionTypes';
import type { AINPCManager } from '../Intelligence/AINPCManager';

enum SubPhase {
  NONE = 'none',
  ATTACKER_1 = 'attacker_1_phase',
  ATTACKER_2 = 'attacker_2_phase',
  KO_CHECK = 'ko_check_phase'
}

export class BattleEngine {
  // Core modules
  private phaseManager = new PhaseManager();
  private actionQueue = new ActionQueue();
  private speedCalculator = new SpeedCalculator();
  private actionProcessor = new ActionProcessor();
  private aiPlayer = new AIPlayer();
  private battleEndManager = new BattleEndManager();
  private captureManager = new CaptureManager();
  private koManager = new KOManager();
  private aiNPCManager = getAINPCManager();

  // State
  private gameState: BattleGameState = this.createEmptyState();
  private isInitialized = false;
  private isProcessingActions = false;
  private currentSubPhase = SubPhase.NONE;
  private orderedActions: any[] = [];
  private currentAttackerData: any = null;

  // Broadcast & spectators
  private broadcastManager: BroadcastManager | null = null;
  private spectatorManager: SpectatorManager | null = null;

  // Timers & timeouts
  private battleTimeoutId: NodeJS.Timeout | null = null;
  private turnTimeoutId: NodeJS.Timeout | null = null;
  private introTimer: NodeJS.Timeout | null = null;
  private aiActionTimer: NodeJS.Timeout | null = null;

  // Safety counters
  private turnCounter = 0;
  private transitionAttempts = 0;
  private readonly MAX_TURNS = 50;
  private readonly MAX_TRANSITION_ATTEMPTS = 5;
  private readonly BATTLE_TIMEOUT_MS = 30000;
  private readonly TURN_TIMEOUT_MS = 10000;

  // Events
  private eventListeners = new Map<string, Function[]>();
  private modules = new Map<string, BattleModule>();

  // === PUBLIC API ===

  startBattle(config: BattleConfig): BattleResult {
    try {
      this.clearAllTimers();
      this.validateConfig(config);
      this.gameState = this.initializeGameState(config);
      
      this.initializeAllModules();
      this.startBattleTimeout();
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

  async submitAction(action: BattleAction, teamManager?: any): Promise<BattleResult> {
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
      if (action.type === 'capture') {
        return await this.handleCaptureAction(action, teamManager);
      }

      const pokemon = playerRole === 'player1' ? 
        this.gameState.player1.pokemon! : 
        this.gameState.player2.pokemon!;

      const success = this.actionQueue.addAction(playerRole, action, pokemon);
      if (!success) {
        return this.createErrorResult('Erreur ajout action');
      }

      this.emit('actionQueued', {
        playerRole,
        actionType: action.type,
        queueState: this.actionQueue.getQueueState()
      });

      if (this.actionQueue.areAllActionsReady()) {
        this.clearActionTimers();
        this.clearTurnTimeout();
        this.transitionToPhase(InternalBattlePhase.ACTION_RESOLUTION, 'all_actions_ready');
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

  // === PHASE MANAGEMENT ===

  private transitionToPhase(newPhase: InternalBattlePhase, trigger = 'manual'): boolean {
    if (!this.isInitialized) return false;

    this.transitionAttempts++;
    if (this.transitionAttempts > this.MAX_TRANSITION_ATTEMPTS) {
      this.forceBattleEnd('transition_loop', 'Boucle de transition détectée');
      return false;
    }

    const success = this.phaseManager.setPhase(newPhase, trigger);
    if (!success) return false;

    this.transitionAttempts = 0; // Reset on success

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
      trigger
    });

    return true;
  }

  private handleActionSelectionPhase(): void {
    this.clearActionTimers();
    this.clearTurnTimeout();
    this.actionQueue.clear();
    this.resetSubPhaseState();
    this.startTurnTimeout();

    this.emit('actionSelectionStart', {
      canAct: true,
      gameState: this.gameState,
      turnNumber: this.gameState.turnNumber
    });

    this.scheduleAIAction();
  }

  private async handleActionResolutionPhase(): Promise<void> {
    this.isProcessingActions = true;
    this.clearTurnTimeout();

    try {
      const allActions = this.actionQueue.getAllActions();
      if (allActions.length === 0) {
        this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'no_actions');
        return;
      }

      this.orderedActions = this.actionQueue.getActionsBySpeed();
      this.emit('resolutionStart', { actionCount: this.orderedActions.length });
      
      await this.startAttackerPhase(0);
    } catch (error) {
      this.isProcessingActions = false;
      this.forceResolutionComplete();
    }
  }

  private handleEndedPhase(): void {
    this.clearAllTimers();
    this.savePokemonAfterBattle();
    this.cleanupSpectators();
  }

  // === COMBAT RESOLUTION ===

  private async startAttackerPhase(attackerIndex: number): Promise<void> {
    // Safety checks
    if (attackerIndex >= this.orderedActions.length) {
      await this.performKOCheckPhase();
      return;
    }

    if (attackerIndex < 0 || !this.orderedActions[attackerIndex]) {
      await this.completeActionResolution();
      return;
    }

    this.currentAttackerData = this.orderedActions[attackerIndex];
    const currentPokemon = this.getCurrentPokemonInGame(this.currentAttackerData.playerRole);
    
    if (!currentPokemon || currentPokemon.currentHp <= 0) {
      await this.startAttackerPhase(attackerIndex + 1);
      return;
    }

    this.currentSubPhase = attackerIndex === 0 ? SubPhase.ATTACKER_1 : SubPhase.ATTACKER_2;
    
    this.emit('attackerPhaseStart', {
      subPhase: this.currentSubPhase,
      playerRole: this.currentAttackerData.playerRole,
      actionType: this.currentAttackerData.action.type,
      pokemon: this.currentAttackerData.pokemon.name
    });

    await this.executeFullAttackerAction();
    await this.delay(100); // Reduced delay
    await this.startAttackerPhase(attackerIndex + 1);
  }

  private async executeFullAttackerAction(): Promise<void> {
    const { action, playerRole, pokemon } = this.currentAttackerData;
    
    const result = await this.actionProcessor.processAction(action);
    if (!result.success) return;

    if (action.type === 'attack' && result.data) {
      await this.handleAttackBroadcast(action, result, playerRole, pokemon);
    }

    this.emit('actionProcessed', {
      action,
      result,
      playerRole,
      subPhase: this.currentSubPhase
    });
  }

  private async handleAttackBroadcast(action: any, result: any, playerRole: PlayerRole, pokemon: Pokemon): Promise<void> {
    // Safe broadcast with null checks and no forced cleanup
    if (!this.broadcastManager) {
      // Try to recreate but don't fail if it doesn't work
      try {
        this.configureBroadcastSystem();
      } catch (error) {
        // Continue without broadcast
        return;
      }
    }

    try {
      if (this.broadcastManager) {
        await this.broadcastManager.emitTimed('moveUsed', {
          attackerName: pokemon.name,
          attackerRole: playerRole,
          moveName: this.getMoveDisplayName(action.data.moveId),
          moveId: action.data.moveId,
          subPhase: this.currentSubPhase
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
      }
    } catch (error) {
      // Continue without broadcast on error - don't crash the battle
    }

    // IMPORTANT: Don't call cleanup or reset here - this is mid-battle
    this.emit('attackerPhaseComplete', {
      subPhase: this.currentSubPhase,
      playerRole,
      pokemon: pokemon.name,
      damageDealt: result.data.damage || 0,
      targetRole: result.data.defenderRole
    });
  }

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

    if (player1KO.isKO) await this.processKOSequence(player1KO);
    if (player2KO.isKO) await this.processKOSequence(player2KO);

    const battleEndCheck = this.koManager.checkBattleEnd();
    if (battleEndCheck.isEnded) {
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
      return;
    }

    await this.completeActionResolution();
  }

  private async processKOSequence(koResult: any): Promise<void> {
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
          await this.delay(Math.min(step.timing, 500));
          break;
        default:
          await this.delay(Math.min(step.timing, 200));
          break;
      }
    }
  }

  private async completeActionResolution(): Promise<void> {
    // Safety checks
    if (!this.isInitialized) return;
    
    this.turnCounter++;
    if (this.turnCounter > this.MAX_TURNS) {
      this.forceBattleEnd('max_turns_reached', 'Combat trop long');
      return;
    }

    // CRITICAL FIX: Don't check phase manager ready here - causes premature exits
    this.isProcessingActions = false;
    this.resetSubPhaseState();
    this.gameState.turnNumber++;

    this.emit('resolutionComplete', {
      actionsExecuted: this.actionQueue.getAllActions().length,
      battleEnded: false,
      newTurnNumber: this.gameState.turnNumber
    });

    if (!this.gameState.isEnded) {
      // CRITICAL FIX: Continue battle normally without extra checks
      const success = this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'turn_complete');
      if (!success) {
        // Only force end if transition truly failed, not for other reasons
        this.forceBattleEnd('transition_failed', 'Impossible de continuer');
      }
    } else {
      this.transitionToPhase(InternalBattlePhase.ENDED, 'battle_ended');
    }
  }

  // === AI MANAGEMENT ===

  private scheduleAIAction(): void {
    if (this.gameState.player2.sessionId !== 'ai') return;

    const delay = this.getAIDelay();
    this.aiActionTimer = setTimeout(() => {
      if (this.getCurrentPhase() === InternalBattlePhase.ACTION_SELECTION && this.isInitialized) {
        this.executeAIAction();
      }
    }, delay);
  }

  private executeAIAction(): void {
    try {
      const aiAction = this.aiPlayer.generateAction();
      if (aiAction) {
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

  // === TIMEOUT MANAGEMENT ===

  private startBattleTimeout(): void {
    this.clearBattleTimeout();
    this.battleTimeoutId = setTimeout(() => {
      this.forceBattleEnd('timeout', 'Combat interrompu par timeout');
    }, this.BATTLE_TIMEOUT_MS);
  }

  private startTurnTimeout(): void {
    this.clearTurnTimeout();
    this.turnTimeoutId = setTimeout(() => {
      this.handleTurnTimeout();
    }, this.TURN_TIMEOUT_MS);
  }

  private handleTurnTimeout(): void {
    try {
      if (this.getCurrentPhase() === InternalBattlePhase.ACTION_SELECTION) {
        this.forceDefaultActions();
      }
      if (this.getCurrentPhase() === InternalBattlePhase.ACTION_RESOLUTION) {
        this.forceResolutionComplete();
      }
      if (!this.gameState.isEnded) {
        this.forceNextTurn();
      }
    } catch (error) {
      this.forceBattleEnd('error', 'Erreur timeout');
    }
  }

  private forceDefaultActions(): void {
    if (!this.actionQueue.hasAction('player1')) {
      const defaultAction: BattleAction = {
        actionId: `timeout_action_p1_${Date.now()}`,
        playerId: this.gameState.player1.sessionId,
        type: 'attack',
        data: { moveId: 'tackle' },
        timestamp: Date.now()
      };
      
      if (this.gameState.player1.pokemon) {
        this.actionQueue.addAction('player1', defaultAction, this.gameState.player1.pokemon);
      }
    }

    if (!this.actionQueue.hasAction('player2')) {
      const defaultAction: BattleAction = {
        actionId: `timeout_action_p2_${Date.now()}`,
        playerId: this.gameState.player2.sessionId,
        type: 'attack',
        data: { moveId: 'tackle' },
        timestamp: Date.now()
      };
      
      if (this.gameState.player2.pokemon) {
        this.actionQueue.addAction('player2', defaultAction, this.gameState.player2.pokemon);
      }
    }

    if (this.actionQueue.areAllActionsReady()) {
      this.transitionToPhase(InternalBattlePhase.ACTION_RESOLUTION, 'timeout_force');
    }
  }

  private forceResolutionComplete(): void {
    this.isProcessingActions = false;
    this.resetSubPhaseState();
    this.gameState.turnNumber++;

    this.emit('resolutionComplete', {
      actionsExecuted: 0,
      battleEnded: false,
      newTurnNumber: this.gameState.turnNumber,
      message: "Tour forcé terminé par timeout"
    });

    if (this.isInitialized && !this.gameState.isEnded) {
      if (!this.phaseManager.isReady()) {
        this.phaseManager.initialize(this.gameState);
      }
      this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'timeout_force_complete');
    }
  }

  private forceNextTurn(): void {
    this.gameState.turnNumber++;
    this.actionQueue.clear();
    this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'timeout_next_turn');
  }

  private forceBattleEnd(reason: string, message: string): void {
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

  // === INITIALIZATION ===

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
      // Continue without broadcast on error
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
    const INTRO_DELAY = process.env.NODE_ENV === 'test' ? 100 : 1000;
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
        this.forceBattleEnd('intro_transition_failed', 'Impossible de progresser au-delà de la phase intro');
      }
    }, INTRO_DELAY);
  }

  // === POKEMON ENCOUNTER ===

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
      }).catch(() => {
        // Continue on error
      });
    }
  }

  // === CAPTURE HANDLING ===

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

  // === TIMER MANAGEMENT ===

  private clearAllTimers(): void {
    this.clearIntroTimer();
    this.clearActionTimers();
    this.clearBattleTimeout();
    this.clearTurnTimeout();
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

  private clearBattleTimeout(): void {
    if (this.battleTimeoutId) {
      clearTimeout(this.battleTimeoutId);
      this.battleTimeoutId = null;
    }
  }

  private clearTurnTimeout(): void {
    if (this.turnTimeoutId) {
      clearTimeout(this.turnTimeoutId);
      this.turnTimeoutId = null;
    }
  }

  // === UTILITIES ===

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
    if (this.gameState.type === 'wild') return 100;
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

  private cleanupSpectators(): void {
    if (this.spectatorManager) {
      this.spectatorManager.cleanupBattle(this.gameState.battleId);
    }
  }

  // === PUBLIC API COMPATIBILITY ===

  async processAction(action: BattleAction, teamManager?: any): Promise<BattleResult> {
    return await this.submitAction(action, teamManager);
  }

  generateAIAction(): BattleAction | null {
    if (!this.isInitialized || this.getCurrentPhase() !== InternalBattlePhase.ACTION_SELECTION) {
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
    this.clearAllTimers();
    this.cleanupSpectators();

    if (this.broadcastManager) {
      this.broadcastManager.cleanup();
      this.broadcastManager = null;
    }

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
  }

  // === DIAGNOSTICS ===

  getSystemState(): any {
    return {
      version: 'battle_engine_optimized_v1',
      isInitialized: this.isInitialized,
      isProcessingActions: this.isProcessingActions,
      currentSubPhase: this.currentSubPhase,
      turnCounter: this.turnCounter,
      transitionAttempts: this.transitionAttempts,
      timeouts: {
        battleTimeout: this.battleTimeoutId !== null,
        turnTimeout: this.turnTimeoutId !== null
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
      }
    };
  }
}

export default BattleEngine;
