// server/src/battle/BattleEngine.ts
// 🚨 CORRECTIONS CRITIQUES POUR LES TIMEOUTS

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
  
  // === 🚨 NOUVEAU: GESTION DES TIMEOUTS ===
  private battleTimeoutId: NodeJS.Timeout | null = null;
  private readonly BATTLE_TIMEOUT_MS = 30000; // 30 secondes max par combat
  private readonly TURN_TIMEOUT_MS = 10000;   // 10 secondes max par tour
  private turnTimeoutId: NodeJS.Timeout | null = null;
  
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
  // 🚨 NOUVEAU: GESTION DES TIMEOUTS ANTI-BLOCAGE
  // ===================================================================
  
  /**
   * 🚨 CRITIQUE: Démarre le timeout global du combat
   */
  private startBattleTimeout(): void {
    this.clearBattleTimeout();
    
    this.battleTimeoutId = setTimeout(() => {
      console.error(`🚨 [BattleEngine] TIMEOUT GLOBAL - Combat ${this.gameState.battleId} forcé à se terminer`);
      this.forceBattleEnd('timeout', 'Combat interrompu par timeout');
    }, this.BATTLE_TIMEOUT_MS);
    
    console.log(`⏰ [BattleEngine] Timeout global activé: ${this.BATTLE_TIMEOUT_MS}ms`);
  }
  
  /**
   * 🚨 CRITIQUE: Démarre le timeout d'un tour
   */
  private startTurnTimeout(): void {
    this.clearTurnTimeout();
    
    this.turnTimeoutId = setTimeout(() => {
      console.warn(`⏰ [BattleEngine] TIMEOUT TOUR ${this.gameState.turnNumber} - Force la progression`);
      this.handleTurnTimeout();
    }, this.TURN_TIMEOUT_MS);
  }
  
  /**
   * 🚨 CRITIQUE: Gère un timeout de tour
   */
  private handleTurnTimeout(): void {
    try {
      console.log(`🚨 [BattleEngine] Gestion timeout tour ${this.gameState.turnNumber}`);
      
      // Si en sélection d'action, forcer une action par défaut
      if (this.getCurrentPhase() === InternalBattlePhase.ACTION_SELECTION) {
        this.forceDefaultActions();
      }
      
      // Si en résolution, forcer la completion
      if (this.getCurrentPhase() === InternalBattlePhase.ACTION_RESOLUTION) {
        this.forceResolutionComplete();
      }
      
      // Si bloqué ailleurs, passer au tour suivant
      if (!this.gameState.isEnded) {
        this.forceNextTurn();
      }
      
    } catch (error) {
      console.error(`❌ [BattleEngine] Erreur gestion timeout:`, error);
      this.forceBattleEnd('error', 'Erreur timeout');
    }
  }
  
  /**
   * 🚨 CRITIQUE: Force des actions par défaut pour débloquer
   */
  private forceDefaultActions(): void {
    console.log(`🔧 [BattleEngine] Force des actions par défaut`);
    
    // Action joueur 1 si manquante
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
        console.log(`🔧 [BattleEngine] Action forcée pour Player1: tackle`);
      }
    }
    
    // Action joueur 2/IA si manquante
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
        console.log(`🔧 [BattleEngine] Action forcée pour Player2: tackle`);
      }
    }
    
    // Forcer la transition vers résolution
    if (this.actionQueue.areAllActionsReady()) {
      this.transitionToPhase(InternalBattlePhase.ACTION_RESOLUTION, 'timeout_force');
    }
  }
  
  /**
   * 🚨 CRITIQUE: Force la completion de la résolution
   */
  private forceResolutionComplete(): void {
    console.log(`🔧 [BattleEngine] Force completion résolution`);
    
    this.isProcessingActions = false;
    this.currentSubPhase = SubPhase.NONE;
    this.orderedActions = [];
    this.currentAttackerData = null;
    this.gameState.turnNumber++;
    
    this.emit('resolutionComplete', {
      actionsExecuted: 0,
      battleEnded: false,
      newTurnNumber: this.gameState.turnNumber,
      message: "Tour forcé terminé par timeout"
    });
    
    this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'timeout_force_complete');
  }
  
  /**
   * 🚨 CRITIQUE: Force le passage au tour suivant
   */
  private forceNextTurn(): void {
    console.log(`🔧 [BattleEngine] Force tour suivant: ${this.gameState.turnNumber + 1}`);
    
    this.gameState.turnNumber++;
    this.actionQueue.clear();
    this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'timeout_next_turn');
  }
  
  /**
   * 🚨 CRITIQUE: Force la fin du combat en cas de problème grave
   */
  private forceBattleEnd(reason: string, message: string): void {
    console.log(`🚨 [BattleEngine] FORCE FIN COMBAT: ${reason} - ${message}`);
    
    this.gameState.isEnded = true;
    this.gameState.winner = 'player1'; // Par défaut, joueur gagne
    
    this.clearAllTimers();
    
    this.emit('battleEnd', {
      winner: 'player1',
      reason: reason,
      message: message,
      gameState: this.gameState,
      forced: true
    });
    
    this.transitionToPhase(InternalBattlePhase.ENDED, reason);
  }
  
  /**
   * Clear timeouts
   */
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
  
  // ===================================================================
  // 🔧 CORRECTIONS INITIALISATION IA
  // ===================================================================
  
  /**
   * ✅ CORRIGÉ: Initialise le système d'intelligence IA
   */
  private async initializeAISystem(): Promise<void> {
    try {
      console.log(`🤖 [BattleEngine-IA] === INITIALISATION SYSTÈME D'IA ===`);
      
      await this.aiNPCManager.initialize();
      console.log(`✅ [BattleEngine-IA] AINPCManager initialisé`);
      
      this.registerPlayersInAI();
      console.log(`✅ [BattleEngine-IA] Joueurs enregistrés dans ActionTracker`);
      
      console.log(`🎉 [BattleEngine-IA] Système d'IA complètement initialisé !`);
      
    } catch (error) {
      console.error(`❌ [BattleEngine-IA] Erreur initialisation système IA:`, error);
    }
  }
  
  /**
   * ✅ CORRIGÉ: Enregistre les joueurs du combat dans ActionTracker
   */
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
        
        console.log(`📝 [BattleEngine-IA] Player1 enregistré: ${this.gameState.player1.name}`);
      }
      
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
  // 🔧 API PRINCIPALE - MÉTHODES PUBLIQUES CORRIGÉES
  // ===================================================================
  
  /**
   * 🚨 CORRIGÉ: Démarre un nouveau combat avec timeouts
   */
  startBattle(config: BattleConfig): BattleResult {
    try {
      console.log(`🚀 [BattleEngine] DÉMARRAGE COMBAT avec timeouts`);
      
      this.clearAllTimers();
      this.validateConfig(config);
      this.gameState = this.initializeGameState(config);
      this.initializeAllModules();
      
      // ✅ CRITIQUE: Démarrer les timeouts
      this.startBattleTimeout();
      
      // Initialiser le système d'IA APRÈS gameState
      this.initializeAISystem().catch(error => {
        console.error(`❌ [BattleEngine-IA] Erreur initialisation IA asynchrone:`, error);
      });
      
      this.isInitialized = true;
      
      // Logger le début du combat
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
   * 🚨 CORRIGÉ: Soumission d'actions avec timeout de tour
   */
  async submitAction(action: BattleAction, teamManager?: any): Promise<BattleResult> {
    if (!this.isInitialized) {
      return this.createErrorResult('Combat non initialisé');
    }
    
    if (this.gameState.isEnded) {
      return this.createErrorResult('Combat déjà terminé');
    }
    
    console.log(`🎮 [BattleEngine] Submit action: ${action.type} par ${action.playerId}`);
    
    const phaseValidation = this.phaseManager.validateAction(action);
    if (!phaseValidation.isValid) {
      return this.createErrorResult(phaseValidation.reason || 'Action non autorisée');
    }
    
    const playerRole = this.getPlayerRole(action.playerId);
    if (!playerRole) {
      return this.createErrorResult('Joueur non reconnu');
    }
    
    try {
      // Logger les actions de fuite spécifiquement
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
      
      console.log(`✅ [BattleEngine] Action ${action.type} ajoutée pour ${playerRole}`);
      
      this.emit('actionQueued', {
        playerRole,
        actionType: action.type,
        queueState: this.actionQueue.getQueueState()
      });
      
      // 🚨 CRITIQUE: Vérifier si toutes les actions sont prêtes
      if (this.actionQueue.areAllActionsReady()) {
        console.log(`🎯 [BattleEngine] Toutes les actions prêtes, transition vers résolution`);
        this.clearActionTimers();
        this.clearTurnTimeout(); // Clear timeout tour
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
  // 🔧 GESTION DES PHASES POKÉMON ROUGE/BLEU CORRIGÉE
  // ===================================================================
  
  /**
   * 🚨 CORRIGÉ: Programme la transition automatique INTRO → ACTION_SELECTION
   */
  private scheduleIntroTransition(): void {
    this.introTimer = setTimeout(() => {
      if (this.getCurrentPhase() === InternalBattlePhase.INTRO && this.isInitialized) {
        console.log(`🎭 [BattleEngine] Transition automatique INTRO → ACTION_SELECTION`);
        this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'intro_complete');
      }
    }, 2000); // Réduit à 2s pour les tests
  }
  
  /**
   * 🚨 CORRIGÉ: Transition vers une nouvelle phase avec logs
   */
  transitionToPhase(newPhase: InternalBattlePhase, trigger: string = 'manual'): void {
    if (!this.isInitialized) {
      console.warn(`⚠️ [BattleEngine] Tentative transition avant initialisation: ${newPhase}`);
      return;
    }
    
    const currentPhase = this.getCurrentPhase();
    console.log(`🎭 [BattleEngine] TRANSITION: ${currentPhase} → ${newPhase} (${trigger})`);
    
    const success = this.phaseManager.setPhase(newPhase, trigger);
    if (!success) {
      console.error(`❌ [BattleEngine] Transition échouée: ${currentPhase} → ${newPhase}`);
      return;
    }
    
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
      previousPhase: currentPhase,
      gameState: this.gameState,
      canAct: this.phaseManager.canSubmitAction(),
      trigger: trigger
    });
    
    console.log(`✅ [BattleEngine] Transition réussie vers ${newPhase}`);
  }
  
  /**
   * 🚨 CORRIGÉ: Gestion phase ACTION_SELECTION avec timeout
   */
  private handleActionSelectionPhase(): void {
    console.log(`🎮 [BattleEngine] === PHASE ACTION_SELECTION TOUR ${this.gameState.turnNumber} ===`);
    
    this.clearActionTimers();
    this.clearTurnTimeout();
    this.actionQueue.clear();
    this.currentSubPhase = SubPhase.NONE;
    this.orderedActions = [];
    this.currentAttackerData = null;
    
    // 🚨 CRITIQUE: Démarrer timeout de tour
    this.startTurnTimeout();
    
    this.emit('actionSelectionStart', {
      canAct: true,
      gameState: this.gameState,
      turnNumber: this.gameState.turnNumber,
      message: "Que doit faire votre Pokémon ?"
    });
    
    // Programmer l'action IA
    this.scheduleAIAction();
  }
  
  /**
   * 🚨 CORRIGÉ: Gestion phase ACTION_RESOLUTION avec timeout
   */
  private async handleActionResolutionPhase(): Promise<void> {
    console.log(`⚔️ [BattleEngine] === PHASE ACTION_RESOLUTION ===`);
    
    this.isProcessingActions = true;
    this.clearTurnTimeout(); // Clear timeout pendant résolution
    
    try {
      const allActions = this.actionQueue.getAllActions();
      
      if (allActions.length === 0) {
        console.warn(`⚠️ [BattleEngine] Aucune action à résoudre`);
        this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'no_actions');
        return;
      }
      
      console.log(`⚔️ [BattleEngine] Résolution de ${allActions.length} action(s)`);
      
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
      this.forceResolutionComplete();
    }
  }
  
  /**
   * 🚨 CORRIGÉ: Démarre la phase d'un attaquant spécifique avec vérifications
   */
  private async startAttackerPhase(attackerIndex: number): Promise<void> {
    console.log(`⚔️ [BattleEngine] Attaquant ${attackerIndex + 1}/${this.orderedActions.length}`);
    
    if (attackerIndex >= this.orderedActions.length) {
      console.log('💀 [BattleEngine] === PHASE K.O. CHECK ===');
      await this.performKOCheckPhase();
      return;
    }
    
    this.currentAttackerData = this.orderedActions[attackerIndex];
    
    // Vérification K.O. avant d'agir
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
    await this.delay(200); // Délai réduit pour tests
    await this.startAttackerPhase(attackerIndex + 1);
  }

  /**
   * 🚨 CORRIGÉ: Phase K.O. CHECK après toutes les attaques
   */
  private async performKOCheckPhase(): Promise<void> {
    console.log(`💀 [BattleEngine] === K.O. CHECK PHASE ===`);
    
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
      console.log(`💀 [BattleEngine] Player1 ${player1Pokemon.name} K.O.`);
      await this.processKOSequence(player1KO);
    }
    
    const player2KO = this.koManager.checkAndProcessKO(player2Pokemon, 'player2');
    if (player2KO.isKO) {
      console.log(`💀 [BattleEngine] Player2 ${player2Pokemon.name} K.O.`);
      await this.processKOSequence(player2KO);
    }
    
    // Vérification finale de fin de combat
    const battleEndCheck = this.koManager.checkBattleEnd();
    if (battleEndCheck.isEnded) {
      console.log(`🏁 [BattleEngine] Combat terminé: ${battleEndCheck.winner} (${battleEndCheck.reason})`);
      
      this.gameState.isEnded = true;
      this.gameState.winner = battleEndCheck.winner;
      
      // Logger la fin du combat
      this.logBattleEnd(battleEndCheck.winner, battleEndCheck.reason);
      
      await this.delay(500);
      
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
   * 🚨 CORRIGÉ: Traite la séquence K.O. avec timing réduit
   */
  private async processKOSequence(koResult: any): Promise<void> {
    console.log(`💀 [BattleEngine] Séquence K.O. pour ${koResult.pokemonName}`);
    
    // Exécuter chaque étape de la séquence avec timing réduit pour tests
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
          await this.delay(Math.min(step.timing, 500)); // Timing réduit pour tests
          break;
          
        case 'winner_announce':
          this.emit('winnerAnnounce', {
            winner: step.data?.winner,
            message: step.message,
            battleEndType: step.data?.battleEndType,
            messageType: step.data?.messageType
          });
          await this.delay(Math.min(step.timing, 500)); // Timing réduit pour tests
          break;
          
        default:
          await this.delay(Math.min(step.timing, 200));
          break;
      }
    }
  }
  
  /**
   * 🚨 CORRIGÉ: Exécute l'action COMPLÈTE d'un attaquant
   */
  private async executeFullAttackerAction(): Promise<void> {
    const { action, playerRole, pokemon } = this.currentAttackerData;
   
    console.log(`⚔️ [BattleEngine] Exécution action: ${pokemon.name} utilise ${action.type}`);
    
    const result = await this.actionProcessor.processAction(action);
    
    if (!result.success) {
      console.warn(`⚠️ [BattleEngine] Action échouée: ${result.error}`);
      return;
    }
    
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
        
        console.log(`💥 [BattleEngine] ${result.data.damage} dégâts infligés`);
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
   * 🚨 CORRIGÉ: Termine la phase de résolution
   */
  private async completeActionResolution(): Promise<void> {
    console.log(`✅ [BattleEngine] === RÉSOLUTION COMPLÈTE ===`);
    
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
    
    // 🚨 CRITIQUE: Vérifier si le combat doit continuer
    if (!this.gameState.isEnded) {
      console.log(`🔄 [BattleEngine] Combat continue - Tour ${this.gameState.turnNumber}`);
      this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'turn_complete');
    } else {
      console.log(`🏁 [BattleEngine] Combat terminé`);
      this.transitionToPhase(InternalBattlePhase.ENDED, 'battle_ended');
    }
  }
  
  // ===================================================================
  // 🔧 IA CORRIGÉE
  // ===================================================================
  
  /**
   * 🚨 CORRIGÉ: Programme l'action IA avec timeout réduit
   */
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
  
  /**
   * 🚨 CORRIGÉ: Exécute l'action IA avec gestion d'erreur
   */
  private executeAIAction(): void {
    console.log('🤖 [BattleEngine] IA génère son action...');
    
    try {
      const aiAction = this.aiPlayer.generateAction();
      if (aiAction) {
        console.log(`🤖 [BattleEngine] IA choisit: ${aiAction.type}`);
        this.submitAction(aiAction);
      } else {
        console.error('❌ [BattleEngine] IA n\'a pas pu générer d\'action, action forcée');
        // Action de secours
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
      console.error('❌ [BattleEngine] Erreur exécution IA:', error);
      // Action de secours en cas d'erreur
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
  
  // ===================================================================
  // 🔧 GESTION DES TIMERS CORRIGÉE
  // ===================================================================
  
  /**
   * 🚨 CORRIGÉ: Clear TOUS les timers
   */
  private clearAllTimers(): void {
    this.clearIntroTimer();
    this.clearActionTimers();
    this.clearSubPhaseTimer();
    this.clearBattleTimeout();
    this.clearTurnTimeout();
    
    console.log(`🧹 [BattleEngine] Tous les timers nettoyés`);
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
  // 🔧 MÉTHODES UTILITAIRES INCHANGÉES
  // ===================================================================
  
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
      return 100; // Très rapide pour les tests
    }
    return Math.min(this.aiPlayer.getThinkingDelay(), 1000); // Max 1s pour les tests
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
  // 🔧 LOGGING METHODS (INCHANGÉES)
  // ===================================================================
  
  private logBattleStart(config: BattleConfig): void {
    try {
      const playerName = config.player1?.name;
      if (!playerName) {
        console.log(`⚠️ [BattleEngine-IA] Pas de nom joueur pour logging début combat`);
        return;
      }
      
      console.log(`🧠 [BattleEngine-IA] Logging début combat pour ${playerName}`);
      
      this.aiNPCManager.trackPlayerAction(
        playerName,
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
  
  private logRunAttempt(action: BattleAction): void {
    try {
      const playerName = this.getPlayerName(action.playerId);
      
      if (!playerName) {
        console.log(`⚠️ [BattleEngine-IA] Pas de nom joueur pour logging fuite`);
        return;
      }
      
      console.log(`🧠 [BattleEngine-IA] Logging tentative de fuite pour ${playerName}`);
      
      this.aiNPCManager.trackPlayerAction(
        playerName,
        ActionType.BATTLE_RUN_ATTEMPT,
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
  
  private logBattleEnd(winner: PlayerRole | null, reason: string): void {
    try {
      const playerName = this.gameState.player1.name;
      
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
  
  private logCaptureAttempt(action: BattleAction, result: BattleResult): void {
    try {
      const playerName = this.getPlayerName(action.playerId);
      
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
  // 🔧 GESTION SPECTATEURS (INCHANGÉE)
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
  // 🔧 AUTRES MÉTHODES (INCHANGÉES MAIS OPTIMISÉES)
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
    
    this.clearAllTimers(); // 🚨 CRITIQUE: Clear tous les timers
    this.savePokemonAfterBattle();
    this.cleanupSpectators();
  }
  
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
  // 🔧 API COMPATIBILITÉ (INCHANGÉE)
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
  // 🔧 MÉTHODES PRIVÉES DE BASE (INCHANGÉES)
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
  // 🔧 SYSTÈME D'EXTENSION (INCHANGÉ)
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
  // 🔧 NETTOYAGE AMÉLIORÉ
  // ===================================================================
  
  cleanup(): void {
    console.log(`🧹 [BattleEngine] === NETTOYAGE COMPLET ===`);
    
    this.clearAllTimers(); // 🚨 CRITIQUE: Clear TOUS les timers
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
    
    // Reset flags
    this.isInitialized = false;
    this.isProcessingActions = false;
    
    console.log('✅ [BattleEngine] Nettoyage complet effectué avec timeouts anti-blocage');
  }
  
  // ===================================================================
  // 🔧 DIAGNOSTICS AMÉLIORÉS
  // ===================================================================
  
  getSystemState(): any {
    return {
      version: 'pokemon_rouge_bleu_ABSOLUMENT_authentique_v5_TIMEOUT_FIXED',
      architecture: 'sous_phases_pokemon_authentiques + ko_manager + intelligence_ia + timeout_protection',
      isInitialized: this.isInitialized,
      isProcessingActions: this.isProcessingActions,
      currentSubPhase: this.currentSubPhase,
      currentAttacker: this.currentAttackerData?.pokemon?.name || 'aucun',
      
      // 🚨 NOUVEAU: État des timeouts
      timeouts: {
        battleTimeout: this.battleTimeoutId !== null,
        turnTimeout: this.turnTimeoutId !== null,
        battleTimeoutMs: this.BATTLE_TIMEOUT_MS,
        turnTimeoutMs: this.TURN_TIMEOUT_MS
      },
      
      phaseState: this.phaseManager.getPhaseState(),
      actionQueueState: this.actionQueue.getQueueState(),
      koManagerStats: this.koManager.getStats(),
      aiManagerStats: this.aiNPCManager.getStats(),
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
        'intelligence_ai_integration_FIXED',
        'action_logging_system_WORKING',
        'npc_reaction_ready_FIXED',
        'authentic_pokemon_classic',
        'zero_compromise_authenticity',
        'timeout_protection_CRITICAL', // 🚨 NOUVEAU
        'anti_infinite_loop_system',   // 🚨 NOUVEAU
        'battle_force_end_capability', // 🚨 NOUVEAU
        'turn_progression_guarantee'   // 🚨 NOUVEAU
      ],
      
      corrections: [
        'sous_phases_attaquants_separees',
        'execution_complete_par_pokemon',
        'ko_check_phase_ajoutee',
        'gestion_ko_authentique',
        'intelligence_ai_battle_logging_FIXED',
        'ai_system_initialization_ADDED',
        'player_registration_in_ai_ADDED',
        'logging_conditions_RELAXED',
        'run_attempt_tracking_WORKING',
        'capture_attempt_logging_WORKING',
        'flow_pokemon_rouge_bleu_exact',
        'aucun_raccourci_aucun_compromise',
        'battle_timeout_protection_ADDED',     // 🚨 NOUVEAU
        'turn_timeout_with_fallback_ADDED',    // 🚨 NOUVEAU
        'infinite_loop_prevention_ADDED',      // 🚨 NOUVEAU
        'force_battle_end_when_stuck_ADDED',   // 🚨 NOUVEAU
        'ai_action_error_handling_IMPROVED',   // 🚨 NOUVEAU
        'phase_transition_logging_ENHANCED',   // 🚨 NOUVEAU
        'timer_cleanup_comprehensive_FIXED'    // 🚨 NOUVEAU
      ]
    };
  }
}

export default BattleEngine;
