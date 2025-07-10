// server/src/battle/BattleEngine.ts
// VERSION CORRIGÉE - SYSTÈME DE PHASES POKÉMON AUTHENTIQUE

import { PhaseManager, BattlePhase as InternalBattlePhase } from './modules/PhaseManager';
import { ActionQueue } from './modules/ActionQueue';
import { SpeedCalculator } from './modules/SpeedCalculator';
import { ActionProcessor } from './modules/ActionProcessor';
import { AIPlayer } from './modules/AIPlayer';
import { BattleEndManager } from './modules/BattleEndManager';
import { CaptureManager } from './modules/CaptureManager';
import { BroadcastManager } from './modules/BroadcastManager';
import { BroadcastManagerFactory } from './modules/broadcast/BroadcastManagerFactory';
import { SpectatorManager } from './modules/broadcast/SpectatorManager';
import { BATTLE_TIMINGS } from './modules/BroadcastManager';
import { BattleConfig, BattleGameState, BattleResult, BattleAction, BattleModule, PlayerRole } from './types/BattleTypes';

/**
 * BATTLE ENGINE - VERSION CORRIGÉE AVEC PHASES
 * 
 * Corrections principales :
 * - Transition automatique INTRO → ACTION_SELECTION
 * - Gestion correcte des événements de phase
 * - Timing amélioré pour IA
 * - Debugging complet
 */
export class BattleEngine {
  
  // === GESTION PHASES ===
  private phaseManager: PhaseManager;
  private actionQueue: ActionQueue;
  private speedCalculator: SpeedCalculator;
  
  // === ÉTAT DU JEU ===
  private gameState: BattleGameState;
  private isInitialized: boolean = false;
  private isProcessingActions: boolean = false;
  
  // === MODULES CORE ===
  private actionProcessor: ActionProcessor;
  private aiPlayer: AIPlayer;
  private battleEndManager: BattleEndManager;
  private captureManager: CaptureManager;
  
  // === MODULES BROADCAST ===
  private broadcastManager: BroadcastManager | null = null;
  private spectatorManager: SpectatorManager | null = null;
  
  // === SYSTÈME D'ÉVÉNEMENTS ===
  private eventListeners: Map<string, Function[]> = new Map();
  private modules: Map<string, BattleModule> = new Map();
  
  // === TIMERS ===
  private introTimer: NodeJS.Timeout | null = null;
  private aiActionTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    console.log('🎯 [BattleEngine] Initialisation système de phases corrigé...');
    
    // === NOUVEAUX MODULES ===
    this.phaseManager = new PhaseManager();
    this.actionQueue = new ActionQueue();
    this.speedCalculator = new SpeedCalculator();
    
    // === MODULES EXISTANTS ===
    this.actionProcessor = new ActionProcessor();
    this.aiPlayer = new AIPlayer();
    this.battleEndManager = new BattleEndManager();
    this.captureManager = new CaptureManager();
    
    // État initial vide
    this.gameState = this.createEmptyState();
    
    console.log('✅ [BattleEngine] Système de phases corrigé initialisé');
  }
  
  // === API PRINCIPALE ===
  
  /**
   * Démarre un nouveau combat avec phases - VERSION CORRIGÉE
   */
  startBattle(config: BattleConfig): BattleResult {
    console.log(`🚀 [BattleEngine] Démarrage combat corrigé - Type: ${config.type}`);
    
    try {
      // 1. Nettoyer les timers précédents
      this.clearAllTimers();
      
      // 2. Valider la configuration
      this.validateConfig(config);
      
      // 3. Initialiser l'état du jeu
      this.gameState = this.initializeGameState(config);
      
      // 4. Configurer tous les modules
      this.initializeAllModules();
      
      // 5. DÉMARRER PAR LA PHASE INTRO
      this.phaseManager.setPhase(InternalBattlePhase.INTRO, 'battle_start');
      
      this.isInitialized = true;
      
      // 6. Émettre événement de début
      this.emit('battleStart', {
        gameState: this.gameState,
        phase: InternalBattlePhase.INTRO
      });
      
      // 7. CORRECTION : Programmer la transition automatique de manière fiable
      this.scheduleIntroTransition();
      
      console.log(`✅ [BattleEngine] Combat démarré - Phase INTRO (3s) programmée`);
      
      return {
        success: true,
        gameState: this.gameState,
        events: [`Combat démarré ! ${this.gameState.player1.pokemon!.name} VS ${this.gameState.player2.pokemon!.name}`]
      };
      
    } catch (error) {
      console.error(`❌ [BattleEngine] Erreur démarrage:`, error);
      this.clearAllTimers();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        gameState: this.gameState,
        events: []
      };
    }
  }
  
  // === GESTION DES PHASES CORRIGÉE ===
  
  /**
   * Programme la transition automatique INTRO → ACTION_SELECTION
   */
  private scheduleIntroTransition(): void {
    console.log('⏰ [BattleEngine] Programmation transition INTRO → ACTION_SELECTION dans 3s');
    
    this.introTimer = setTimeout(() => {
      console.log('🎭 [BattleEngine] Transition automatique INTRO → ACTION_SELECTION');
      
      if (this.getCurrentPhase() === InternalBattlePhase.INTRO && this.isInitialized) {
        this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'intro_timeout');
      } else {
        console.log(`⚠️ [BattleEngine] Transition annulée - Phase: ${this.getCurrentPhase()}, Initialisé: ${this.isInitialized}`);
      }
    }, 3000);
  }
  
  /**
   * Transition vers une nouvelle phase - VERSION CORRIGÉE
   */
  transitionToPhase(newPhase: InternalBattlePhase, trigger: string = 'manual'): void {
    if (!this.isInitialized) {
      console.log('❌ [BattleEngine] Combat non initialisé pour transition');
      return;
    }
    
    const currentPhase = this.phaseManager.getCurrentPhase();
    console.log(`🎭 [BattleEngine] Tentative transition: ${currentPhase} → ${newPhase} (${trigger})`);
    
    const success = this.phaseManager.setPhase(newPhase, trigger);
    if (!success) {
      console.log(`❌ [BattleEngine] Transition refusée: ${currentPhase} → ${newPhase}`);
      return;
    }
    
    console.log(`✅ [BattleEngine] Transition réussie: ${currentPhase} → ${newPhase}`);
    
    // Logique spécifique selon la nouvelle phase
    switch (newPhase) {
      case InternalBattlePhase.ACTION_SELECTION:
        this.handleActionSelectionPhase();
        break;
        
      case InternalBattlePhase.ACTION_RESOLUTION:
        this.handleActionResolutionPhase();
        break;
        
      case InternalBattlePhase.CAPTURE:
        // Géré directement dans submitAction
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
  }
  
  /**
   * Gestion phase ACTION_SELECTION - VERSION CORRIGÉE
   */
  private handleActionSelectionPhase(): void {
    console.log('🎮 [BattleEngine] Phase ACTION_SELECTION activée');
    
    // Nettoyer les timers précédents
    this.clearActionTimers();
    
    // Vider la file d'attente pour le nouveau tour
    this.actionQueue.clear();
    
    // Émettre événement pour l'interface utilisateur
    this.emit('actionSelectionStart', {
      canAct: true,
      gameState: this.gameState,
      turnNumber: this.gameState.turnNumber
    });
    
    // IA agit automatiquement selon le type de combat - AVEC DÉLAI APPROPRIÉ
    this.scheduleAIAction();
  }
  
  /**
   * Programme l'action IA avec le bon délai
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
   * Exécute l'action de l'IA
   */
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
  
  /**
   * Gestion phase ACTION_RESOLUTION - VERSION CORRIGÉE
   */
  private async handleActionResolutionPhase(): Promise<void> {
    console.log('⚔️ [BattleEngine] Phase ACTION_RESOLUTION - Résolution par vitesse');
    
    this.isProcessingActions = true;
    
    try {
      await this.resolveActionsBySpeed();
    } catch (error) {
      console.error('❌ [BattleEngine] Erreur résolution:', error);
    } finally {
      this.isProcessingActions = false;
    }
  }
  
  /**
   * Gestion phase ENDED
   */
  private handleEndedPhase(): void {
    console.log('🏁 [BattleEngine] Phase ENDED - Combat terminé');
    
    this.clearAllTimers();
    this.savePokemonAfterBattle();
    this.cleanupSpectators();
  }
  
  // === SOUMISSION D'ACTIONS - VERSION CORRIGÉE ===
  
  /**
   * Soumet une action avec validation de phase
   */
  async submitAction(action: BattleAction, teamManager?: any): Promise<BattleResult> {
    console.log(`🎮 [BattleEngine] Action soumise: ${action.type} par ${action.playerId}`);
    
    if (!this.isInitialized) {
      return this.createErrorResult('Combat non initialisé');
    }
    
    if (this.gameState.isEnded) {
      return this.createErrorResult('Combat déjà terminé');
    }
    
    // === VALIDATION DE PHASE ===
    const phaseValidation = this.phaseManager.validateAction(action);
    if (!phaseValidation.isValid) {
      return this.createErrorResult(phaseValidation.reason || 'Action non autorisée');
    }
    
    // === VALIDATION JOUEUR ===
    const playerRole = this.getPlayerRole(action.playerId);
    if (!playerRole) {
      return this.createErrorResult('Joueur non reconnu');
    }
    
    try {
      // === GESTION CAPTURE SPÉCIALE ===
      if (action.type === 'capture') {
        return await this.handleCaptureAction(action, teamManager);
      }
      
      // === AJOUTER À LA FILE D'ATTENTE ===
      const pokemon = playerRole === 'player1' ? 
        this.gameState.player1.pokemon! : 
        this.gameState.player2.pokemon!;
      
      const success = this.actionQueue.addAction(playerRole, action, pokemon);
      if (!success) {
        return this.createErrorResult('Erreur ajout action en file');
      }
      
      console.log(`📥 [BattleEngine] Action ajoutée: ${playerRole} → ${action.type}`);
      
      // Émettre événement d'action ajoutée
      this.emit('actionQueued', {
        playerRole,
        actionType: action.type,
        queueState: this.actionQueue.getQueueState()
      });
      
      // === VÉRIFIER SI TOUTES LES ACTIONS SONT PRÊTES ===
      if (this.actionQueue.areAllActionsReady()) {
        console.log('🔄 [BattleEngine] Toutes les actions prêtes → Résolution');
        
        // Annuler le timer IA si toujours actif
        this.clearActionTimers();
        
        // Transition vers résolution
        this.transitionToPhase(InternalBattlePhase.ACTION_RESOLUTION, 'all_actions_ready');
      }
      
      return {
        success: true,
        gameState: this.gameState,
        events: [`Action "${action.type}" enregistrée`],
        actionQueued: true
      };
      
    } catch (error) {
      console.error(`❌ [BattleEngine] Erreur soumission action:`, error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue'
      );
    }
  }
  
  // === RÉSOLUTION PAR VITESSE - VERSION CORRIGÉE ===
  
  /**
   * Résolution des actions par vitesse - CŒUR DU SYSTÈME
   */
  private async resolveActionsBySpeed(): Promise<void> {
    console.log('⚡ [BattleEngine] === RÉSOLUTION PAR VITESSE ===');
    
    // 1. Récupérer toutes les actions
    const allActions = this.actionQueue.getAllActions();
    
    if (allActions.length === 0) {
      console.log('⚠️ [BattleEngine] Aucune action à résoudre');
      this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'no_actions');
      return;
    }
    
    // 2. Calculer l'ordre par vitesse
    const orderedActions = this.actionQueue.getActionsBySpeed();
    
    console.log(`⚡ [BattleEngine] Ordre calculé: ${orderedActions.map(qa => 
      `${qa.playerRole}(${qa.action.type})`
    ).join(' → ')}`);
    
    // Émettre événement de début de résolution
    this.emit('resolutionStart', {
      actionCount: orderedActions.length,
      orderPreview: orderedActions.map(qa => ({
        playerRole: qa.playerRole,
        actionType: qa.action.type
      }))
    });
    
    // 3. Exécuter séquentiellement avec timing Pokémon
    for (let i = 0; i < orderedActions.length; i++) {
      const queuedAction = orderedActions[i];
      
      console.log(`▶️ [BattleEngine] Exécution ${i + 1}/${orderedActions.length}: ${queuedAction.playerRole} → ${queuedAction.action.type}`);
      
      // Exécuter l'action
      await this.executeAction(queuedAction);
      
      // Vérifier fin de combat
      const battleEndCheck = this.checkBattleEnd();
      if (battleEndCheck.isEnded) {
        console.log(`🏁 [BattleEngine] Combat terminé pendant résolution: ${battleEndCheck.reason}`);
        this.gameState.isEnded = true;
        this.gameState.winner = battleEndCheck.winner;
        this.transitionToPhase(InternalBattlePhase.ENDED, battleEndCheck.reason);
        return;
      }
      
      // Délai entre les actions (pas après la dernière)
      if (i < orderedActions.length - 1) {
        await this.delay(BATTLE_TIMINGS.transitionNormal);
      }
    }
    
    // 4. Retour à la sélection d'action
    console.log('🔄 [BattleEngine] Résolution terminée → Retour ACTION_SELECTION');
    
    // Incrémenter le numéro de tour
    this.gameState.turnNumber++;
    
    // Émettre événement de fin de résolution
    this.emit('resolutionComplete', {
      actionsExecuted: orderedActions.length,
      battleEnded: false,
      newTurnNumber: this.gameState.turnNumber
    });
    
    this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'resolution_complete');
  }
  
  /**
   * Exécute une action individuelle avec timing authentique
   */
  private async executeAction(queuedAction: any): Promise<void> {
    const { action, playerRole } = queuedAction;
    
    console.log(`⚔️ [BattleEngine] Exécution: ${playerRole} → ${action.type}`);
    
    // 1. Traiter l'action via ActionProcessor
    const result = this.actionProcessor.processAction(action);
    
    if (!result.success) {
      console.log(`❌ [BattleEngine] Échec action: ${result.error}`);
      return;
    }
    
    // 2. TIMING POKÉMON AUTHENTIQUE
    if (action.type === 'attack' && result.data && this.broadcastManager) {
      
      // ENVOI INSTANTANÉ : Attaque + Dégâts
      this.broadcastManager.emitAttackSequence({
        attacker: { 
          name: this.getPlayerName(action.playerId), 
          role: playerRole 
        },
        target: { 
          name: result.data.defenderRole === 'player1' ? 
            this.gameState.player1.name : 
            this.gameState.player2.name,
          role: result.data.defenderRole 
        },
        move: { 
          id: action.data.moveId, 
          name: this.getMoveDisplayName(action.data.moveId)
        },
        damage: result.data.damage || 0,
        oldHp: result.data.oldHp || 0,
        newHp: result.data.newHp || 0,
        maxHp: result.data.maxHp || 100,
        effects: [],
        isKnockedOut: result.data.isKnockedOut || false
      });
      
      // DÉLAI 1s : Effets
      await this.delay(1000);
      
      // DÉLAI 2s : Transition (géré par la boucle principale)
    }
    
    // 3. Émettre événement d'action traitée
    this.emit('actionProcessed', {
      action,
      result,
      playerRole
    });
  }
  
  // === GESTION CAPTURE ===
  
  /**
   * Gestion spéciale des captures
   */
  private async handleCaptureAction(action: BattleAction, teamManager?: any): Promise<BattleResult> {
    console.log('🎯 [BattleEngine] Gestion capture spéciale');
    
    // Transition vers phase CAPTURE
    this.transitionToPhase(InternalBattlePhase.CAPTURE, 'capture_attempt');
    
    if (!teamManager) {
      return this.createErrorResult('TeamManager requis pour la capture');
    }
    
    // Traiter via CaptureManager
    this.captureManager.initialize(this.gameState);
    const result = await this.captureManager.attemptCapture(
      action.playerId, 
      action.data.ballType || 'poke_ball', 
      teamManager
    );
    
    if (result.success && result.captureData?.captured) {
      // Combat terminé par capture réussie
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
      // Capture ratée, retour au combat
      this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'capture_failed');
    }
    
    return result;
  }
  
  // === VÉRIFICATION FIN DE COMBAT ===
  
  /**
   * Vérifie si le combat doit se terminer
   */
  private checkBattleEnd(): { isEnded: boolean; winner: PlayerRole | null; reason: string } {
    if (!this.gameState) {
      return { isEnded: false, winner: null, reason: '' };
    }
    
    const player1Pokemon = this.gameState.player1.pokemon;
    const player2Pokemon = this.gameState.player2.pokemon;
    
    if (!player1Pokemon || !player2Pokemon) {
      return { isEnded: false, winner: null, reason: '' };
    }
    
    const player1KO = player1Pokemon.currentHp <= 0;
    const player2KO = player2Pokemon.currentHp <= 0;
    
    if (player1KO && player2KO) {
      return {
        isEnded: true,
        winner: null,
        reason: 'Match nul ! Les deux Pokémon sont K.O.'
      };
    }
    
    if (player1KO) {
      return {
        isEnded: true,
        winner: 'player2',
        reason: `${player1Pokemon.name} est K.O. ! ${this.gameState.player2.name} gagne !`
      };
    }
    
    if (player2KO) {
      return {
        isEnded: true,
        winner: 'player1',
        reason: `${player2Pokemon.name} est K.O. ! ${this.gameState.player1.name} gagne !`
      };
    }
    
    return { isEnded: false, winner: null, reason: '' };
  }
  
  // === GESTION DES TIMERS ===
  
  /**
   * Nettoie tous les timers
   */
  private clearAllTimers(): void {
    this.clearIntroTimer();
    this.clearActionTimers();
  }
  
  /**
   * Nettoie le timer d'intro
   */
  private clearIntroTimer(): void {
    if (this.introTimer) {
      clearTimeout(this.introTimer);
      this.introTimer = null;
      console.log('🧹 [BattleEngine] Timer intro nettoyé');
    }
  }
  
  /**
   * Nettoie les timers d'action
   */
  private clearActionTimers(): void {
    if (this.aiActionTimer) {
      clearTimeout(this.aiActionTimer);
      this.aiActionTimer = null;
      console.log('🧹 [BattleEngine] Timer IA nettoyé');
    }
  }
  
  // === INITIALISATION MODULES ===
  
  /**
   * Initialise tous les modules avec l'état du jeu
   */
  private initializeAllModules(): void {
    console.log('🔧 [BattleEngine] Initialisation de tous les modules...');
    
    // === MODULES PHASES ===
    this.phaseManager.initialize(this.gameState);
    // ActionQueue et SpeedCalculator sont stateless
    
    // === MODULES EXISTANTS ===
    this.actionProcessor.initialize(this.gameState);
    this.aiPlayer.initialize(this.gameState);
    this.battleEndManager.initialize(this.gameState);
    this.captureManager.initialize(this.gameState);
    
    // === MODULES BROADCAST ===
    this.configureBroadcastSystem();
    
    console.log('✅ [BattleEngine] Tous les modules initialisés');
  }
  
  /**
   * Configuration du système de broadcast
   */
  private configureBroadcastSystem(): void {
    console.log('📡 [BattleEngine] Configuration système broadcast...');
    
    // Créer BroadcastManager
    this.broadcastManager = BroadcastManagerFactory.createForWildBattle(
      this.gameState.battleId,
      this.gameState,
      this.gameState.player1.sessionId
    );
    
    // Configurer callback
    this.broadcastManager.setEmitCallback((event) => {
      this.emit('battleEvent', event);
    });
    
    // Configurer SpectatorManager
    this.spectatorManager = new SpectatorManager();
    
    console.log('✅ [BattleEngine] BroadcastManager et SpectatorManager configurés');
  }
  
  // === SAUVEGARDE POKÉMON ===
  
  /**
   * Sauvegarde des Pokémon après combat
   */
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
  
  // === GESTION SPECTATEURS ===
  
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
      console.log(`📍 [BattleEngine] Position combat enregistrée pour spectateurs`);
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
  
  private cleanupSpectators(): void {
    if (this.spectatorManager) {
      const cleanup = this.spectatorManager.cleanupBattle(this.gameState.battleId);
      console.log(`🧹 [BattleEngine] ${cleanup.spectatorsRemoved.length} spectateurs nettoyés`);
    }
  }
  
  // === COMPATIBILITÉ BATTLEROOM ===
  
  /**
   * Alias pour submitAction (compatibilité BattleRoom)
   */
  async processAction(action: BattleAction, teamManager?: any): Promise<BattleResult> {
    return await this.submitAction(action, teamManager);
  }
  
  /**
   * Génère une action IA (compatibilité BattleRoom)
   */
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
    
    const aiAction = this.aiPlayer.generateAction();
    
    if (aiAction) {
      console.log(`🤖 [BattleEngine] Action IA générée: ${aiAction.type}`);
    } else {
      console.error('❌ [BattleEngine] Échec génération action IA');
    }
    
    return aiAction;
  }
  
  /**
   * Récupère le délai de réflexion IA (compatibilité BattleRoom)
   */
  getAIThinkingDelay(): number {
    return this.getAIDelay();
  }
  
  // === GETTERS ===
  
  getCurrentState(): BattleGameState {
    return { ...this.gameState };
  }
  
  getCurrentPhase(): InternalBattlePhase {
    return this.phaseManager.getCurrentPhase();
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
  
  // === UTILITAIRES ===
  
  /**
   * Détermine le rôle d'un joueur
   */
  private getPlayerRole(playerId: string): PlayerRole | null {
    if (playerId === this.gameState.player1.sessionId) {
      return 'player1';
    } else if (playerId === this.gameState.player2.sessionId || playerId === 'ai') {
      return 'player2';
    }
    return null;
  }
  
  /**
   * Récupère le nom d'un joueur
   */
  private getPlayerName(playerId: string): string {
    if (!this.gameState) return playerId;
    
    if (playerId === this.gameState.player1.sessionId) {
      return this.gameState.player1.name;
    } else if (playerId === this.gameState.player2.sessionId) {
      return this.gameState.player2.name;
    }
    
    return playerId;
  }
  
  /**
   * Récupère le nom d'affichage d'une attaque
   */
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
  
  /**
   * Calcule le délai avant action IA
   */
  private getAIDelay(): number {
    if (this.gameState.type === 'wild') {
      return 1000; // 1s pour sauvage (pas instantané pour debug)
    }
    return this.aiPlayer.getThinkingDelay(); // Réflexion pour dresseur
  }
  
  /**
   * Délai contrôlé
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Crée un résultat d'erreur
   */
  private createErrorResult(message: string): BattleResult {
    return {
      success: false,
      error: message,
      gameState: this.gameState,
      events: []
    };
  }
  
  // === SYSTÈME D'EXTENSION ===
  
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
  
  // === NETTOYAGE ===
  
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
    
    console.log('🧹 [BattleEngine] Nettoyage complet effectué');
  }
  
  // === MÉTHODES PRIVÉES ===
  
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
  
  // === DIAGNOSTICS ===
  
  /**
   * État complet du système
   */
  getSystemState(): any {
    return {
      version: 'battle_engine_phases_v2_fixed',
      architecture: 'phase_based_authentic_pokemon_corrected',
      isInitialized: this.isInitialized,
      isProcessingActions: this.isProcessingActions,
      
      // États des modules
      phaseState: this.phaseManager.getPhaseState(),
      actionQueueState: this.actionQueue.getQueueState(),
      gameState: {
        battleId: this.gameState.battleId,
        type: this.gameState.type,
        phase: this.gameState.phase,
        isEnded: this.gameState.isEnded,
        winner: this.gameState.winner
      },
      
      // États des timers
      timers: {
        introTimer: this.introTimer !== null,
        aiActionTimer: this.aiActionTimer !== null
      },
      
      // Statistiques modules
      moduleStats: {
        phaseManager: this.phaseManager.getPhaseStats(),
        actionQueue: this.actionQueue.getStats(),
        actionProcessor: this.actionProcessor.isReady(),
        aiPlayer: this.aiPlayer.getStats(),
        broadcastManager: this.broadcastManager?.getStats(),
        spectatorManager: this.spectatorManager?.getStats()
      },
      
      corrections: [
        'automatic_intro_transition_fixed',
        'timer_management_improved',
        'ai_action_scheduling_corrected',
        'phase_event_emissions_added',
        'error_handling_enhanced'
      ],
      
      features: [
        'five_phase_system',
        'speed_based_resolution', 
        'authentic_pokemon_timing',
        'action_queue_management',
        'modular_architecture',
        'broadcast_integration',
        'spectator_support',
        'capture_system',
        'ai_integration'
      ]
    };
  }
}

export default BattleEngine;
