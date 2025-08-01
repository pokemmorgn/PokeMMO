// server/src/battle/BattleEngine.ts
// 🔥 VERSION FINALE - CORRECTIONS STRESS TEST

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

  // 🔥 CORRECTIONS STRESS TEST
  private turnCounter = 0;
  private transitionAttempts = 0;
  private readonly MAX_TURNS = 50;
  private readonly MAX_TRANSITION_ATTEMPTS = 3; // 🔥 RÉDUIT de 5 à 3
  private readonly BATTLE_TIMEOUT_MS = 30000;
  private readonly TURN_TIMEOUT_MS = 8000; // 🔥 RÉDUIT de 10s à 8s
  private readonly AI_ACTION_DELAY = 500; // 🔥 RÉDUIT délai IA

  // Events
  private eventListeners = new Map<string, Function[]>();
  private modules = new Map<string, BattleModule>();

  // CRITICAL: Flag to prevent premature cleanup
  private isManualCleanup = false;
  private battleEndHandled = false; // 🔥 NOUVEAU: Éviter double-end

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

      // 🔥 CORRECTION CRITIQUE: Vérifier immédiatement si toutes les actions sont prêtes
      if (this.actionQueue.areAllActionsReady()) {
        this.clearActionTimers();
        this.clearTurnTimeout();
        
        // 🔥 TRANSITION IMMÉDIATE SANS DÉLAI
        const transitionSuccess = this.transitionToPhase(InternalBattlePhase.ACTION_RESOLUTION, 'all_actions_ready');
        if (!transitionSuccess) {
          console.error('❌ [BattleEngine] Échec transition vers résolution');
          // 🔥 FORCER LA RÉSOLUTION
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

  // === 🔥 NOUVELLE MÉTHODE: FORCER RÉSOLUTION ===
  
  private forceActionResolution(): void {
    console.log('🚨 [BattleEngine] Force résolution des actions');
    
    // Forcer la phase vers résolution
    this.phaseManager.forceTransition(InternalBattlePhase.ACTION_RESOLUTION, 'force_resolution');
    
    // Traiter immédiatement
    setTimeout(() => {
      this.handleActionResolutionPhase();
    }, 100);
  }

  // === PHASE MANAGEMENT AMÉLIORÉ ===

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
      
      // 🔥 AUTO-RECOVERY: Essayer force transition
      if (this.transitionAttempts <= 2) {
        console.log('🔧 [BattleEngine] Tentative force transition...');
        this.phaseManager.forceTransition(newPhase, `force_${trigger}`);
        return true;
      }
      
      return false;
    }

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

    // 🔥 IA ACTION IMMÉDIATE POUR STRESS TEST
    this.scheduleAIAction();
  }

  private async handleActionResolutionPhase(): Promise<void> {
    this.isProcessingActions = true;
    this.clearTurnTimeout();

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
      
      // 🔥 TRAITEMENT RAPIDE SANS DÉLAIS
      await this.processAllActionsRapidly();
      
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur résolution:', error);
      this.isProcessingActions = false;
      this.forceResolutionComplete();
    }
  }

  // 🔥 NOUVELLE MÉTHODE: TRAITEMENT RAPIDE
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
          
          // 🔥 BROADCAST SIMPLIFIÉ
          if (this.broadcastManager && actionData.action.type === 'attack') {
            this.broadcastManager.emit('moveUsed', {
              attackerName: actionData.pokemon.name,
              moveName: this.getMoveDisplayName(actionData.action.data.moveId)
            });
            
            if (result.data.damage > 0) {
              this.broadcastManager.emit('damageDealt', {
                targetName: result.data.defenderRole === 'player1' ? 
                  this.gameState.player1.pokemon!.name : 
                  this.gameState.player2.pokemon!.name,
                damage: result.data.damage,
                newHp: result.data.newHp
              });
            }
          }
        }
      } catch (error) {
        console.error(`❌ [BattleEngine] Erreur action ${i + 1}:`, error);
        continue;
      }
      
      // 🔥 PAS DE DÉLAI ENTRE ACTIONS
    }

    // KO Check après toutes les actions
    await this.performKOCheckPhase();
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

  // === KO CHECK AMÉLIORÉ ===

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

    // 🔥 TRAITEMENT KO IMMÉDIAT
    if (player1KO.isKO || player2KO.isKO) {
      console.log(`💀 [BattleEngine] KO détecté - P1: ${player1KO.isKO}, P2: ${player2KO.isKO}`);
      
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
      return;
    }

    await this.completeActionResolution();
  }

  private async completeActionResolution(): Promise<void> {
    if (!this.isInitialized || this.battleEndHandled) return;
    
    this.turnCounter++;
    
    // 🔥 CHECK MAX TURNS PLUS TÔT
    if (this.turnCounter > this.MAX_TURNS) {
      console.log(`⏰ [BattleEngine] Max turns atteint (${this.MAX_TURNS}), fin combat`);
      this.forceBattleEnd('max_turns_reached', 'Combat trop long');
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
      // 🔥 TRANSITION IMMÉDIATE VERS NOUVEAU TOUR
      const success = this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'turn_complete');
      if (!success) {
        console.error('❌ [BattleEngine] Échec transition nouveau tour');
        this.forceBattleEnd('transition_failed', 'Impossible de continuer');
      }
    } else {
      this.transitionToPhase(InternalBattlePhase.ENDED, 'battle_ended');
    }
  }

  // === AI MANAGEMENT OPTIMISÉ ===

  private scheduleAIAction(): void {
    if (this.gameState.player2.sessionId !== 'ai') return;

    // 🔥 DÉLAI RÉDUIT POUR STRESS TEST
    const delay = this.AI_ACTION_DELAY;
    
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

  // === TIMEOUT MANAGEMENT OPTIMISÉ ===

  private startBattleTimeout(): void {
    this.clearBattleTimeout();
    this.battleTimeoutId = setTimeout(() => {
      if (!this.battleEndHandled) {
        this.forceBattleEnd('timeout', 'Combat interrompu par timeout');
      }
    }, this.BATTLE_TIMEOUT_MS);
  }

  private startTurnTimeout(): void {
    this.clearTurnTimeout();
    this.turnTimeoutId = setTimeout(() => {
      if (!this.battleEndHandled) {
        this.handleTurnTimeout();
      }
    }, this.TURN_TIMEOUT_MS);
  }

  private handleTurnTimeout(): void {
    try {
      console.log('⏰ [BattleEngine] Timeout tour détecté');
      
      if (this.getCurrentPhase() === InternalBattlePhase.ACTION_SELECTION) {
        this.forceDefaultActions();
      }
      if (this.getCurrentPhase() === InternalBattlePhase.ACTION_RESOLUTION) {
        this.forceResolutionComplete();
      }
      if (!this.gameState.isEnded && !this.battleEndHandled) {
        this.forceNextTurn();
      }
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur timeout:', error);
      this.forceBattleEnd('error', 'Erreur timeout');
    }
  }

  private forceDefaultActions(): void {
    console.log('🔧 [BattleEngine] Force actions par défaut');
    
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
    console.log('🔧 [BattleEngine] Force fin résolution');
    
    this.isProcessingActions = false;
    this.resetSubPhaseState();
    this.gameState.turnNumber++;

    this.emit('resolutionComplete', {
      actionsExecuted: 0,
      battleEnded: false,
      newTurnNumber: this.gameState.turnNumber,
      message: "Tour forcé terminé par timeout"
    });

    if (this.isInitialized && !this.gameState.isEnded && !this.battleEndHandled) {
      if (!this.phaseManager.isReady()) {
        this.phaseManager.initialize(this.gameState);
      }
      this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'timeout_force_complete');
    }
  }

  private forceNextTurn(): void {
    console.log('🔧 [BattleEngine] Force tour suivant');
    
    this.gameState.turnNumber++;
    this.actionQueue.clear();
    this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'timeout_next_turn');
  }

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

  // === INITIALIZATION (INCHANGÉ) ===

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
    const INTRO_DELAY = process.env.NODE_ENV === 'test' ? 50 : 500; // 🔥 RÉDUIT
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

  // === POKEMON ENCOUNTER (INCHANGÉ) ===

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

  // === CAPTURE HANDLING (INCHANGÉ) ===

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

  // === TIMER MANAGEMENT (INCHANGÉ) ===

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

  // === UTILITIES (PLUS RAPIDES) ===

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
    if (this.gameState.type === 'wild') return this.AI_ACTION_DELAY;
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

  // CRITICAL: Separated cleanup methods
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
    // CRITICAL: Only cleanup if manually requested or battle ended
    if (!this.isManualCleanup && !this.gameState.isEnded) {
      return; // Don't cleanup mid-battle
    }

    this.clearAllTimers();
    
    if (this.spectatorManager) {
      this.spectatorManager.cleanupBattle(this.gameState.battleId);
    }

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
    this.isManualCleanup = false;
    this.battleEndHandled = false; // 🔥 RESET FLAG
  }

  // === DIAGNOSTICS ===

  getSystemState(): any {
    return {
      version: 'battle_engine_stress_test_optimized_v1',
      isInitialized: this.isInitialized,
      isProcessingActions: this.isProcessingActions,
      currentSubPhase: this.currentSubPhase,
      turnCounter: this.turnCounter,
      transitionAttempts: this.transitionAttempts,
      isManualCleanup: this.isManualCleanup,
      battleEndHandled: this.battleEndHandled,
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
      },
      optimizations: [
        'reduced_ai_delay_500ms',
        'reduced_turn_timeout_8s',
        'reduced_max_transitions_3',
        'immediate_action_processing',
        'force_resolution_recovery',
        'rapid_action_processing',
        'battle_end_protection',
        'simplified_broadcasts'
      ]
    };
  }
}

export default BattleEngine;
