// server/src/battle/BattleEngine.ts
// REFACTORING COMPLET - SYSTÈME DE PHASES POKÉMON AUTHENTIQUE

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
 * BATTLE ENGINE - REFACTORING COMPLET AVEC PHASES
 * 
 * Architecture nouvelle :
 * - PhaseManager : Gestion des 5 phases distinctes
 * - ActionQueue : File d'attente des actions
 * - SpeedCalculator : Résolution par vitesse authentique
 * - Timing Pokémon 100% fidèle
 * - Compatible avec tous les modules existants
 */
export class BattleEngine {
  
  // === GESTION PHASES (NOUVEAU) ===
  private phaseManager: PhaseManager;
  private actionQueue: ActionQueue;
  private speedCalculator: SpeedCalculator;
  
  // === ÉTAT DU JEU ===
  private gameState: BattleGameState;
  private isInitialized: boolean = false;
  private isProcessingActions: boolean = false;
  
  // === MODULES CORE (CONSERVÉS) ===
  private actionProcessor: ActionProcessor;
  private aiPlayer: AIPlayer;
  private battleEndManager: BattleEndManager;
  private captureManager: CaptureManager;
  
  // === MODULES BROADCAST (CONSERVÉS) ===
  private broadcastManager: BroadcastManager | null = null;
  private spectatorManager: SpectatorManager | null = null;
  
  // === MODULES OPTIONNELS ===
  private modules: Map<string, BattleModule> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  
  constructor() {
    console.log('🎯 [BattleEngine] Initialisation système de phases...');
    
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
    
    console.log('✅ [BattleEngine] Système de phases initialisé');
  }
  
  // === API PRINCIPALE ===
  
  /**
   * Démarre un nouveau combat avec phases
   */
  startBattle(config: BattleConfig): BattleResult {
    console.log(`🚀 [BattleEngine] Démarrage combat avec phases - Type: ${config.type}`);
    
    try {
      // 1. Valider la configuration
      this.validateConfig(config);
      
      // 2. Initialiser l'état du jeu
      this.gameState = this.initializeGameState(config);
      
      // 3. Configurer tous les modules
      this.initializeAllModules();
      
      // 4. DÉMARRER PAR LA PHASE INTRO
      this.phaseManager.setPhase(InternalBattlePhase.INTRO, 'battle_start');
      
      this.isInitialized = true;
      
      // 5. Émettre événement de début
      this.emit('battleStart', {
        gameState: this.gameState,
        phase: InternalBattlePhase.INTRO
      });
      
      // 6. Programmer la transition automatique (3s)
      setTimeout(() => {
        this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION);
      }, 3000);
      
      console.log(`✅ [BattleEngine] Combat démarré - Phase INTRO (3s)`);
      
      return {
        success: true,
        gameState: this.gameState,
        events: [`Combat démarré ! ${this.gameState.player1.pokemon.name} VS ${this.gameState.player2.pokemon.name}`]
      };
      
    } catch (error) {
      console.error(`❌ [BattleEngine] Erreur démarrage:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        gameState: this.gameState,
        events: []
      };
    }
  }
  
  // === GESTION DES PHASES ===
  
  /**
   * Transition vers une nouvelle phase
   */
  transitionToPhase(newPhase: InternalBattlePhase, trigger: string = 'automatic'): void {
    if (!this.isInitialized) {
      console.log('❌ [BattleEngine] Combat non initialisé pour transition');
      return;
    }
    
    const success = this.phaseManager.setPhase(newPhase, trigger);
    if (!success) {
      console.log(`❌ [BattleEngine] Transition refusée vers ${newPhase}`);
      return;
    }
    
    console.log(`🎭 [BattleEngine] Transition: ${newPhase}`);
    
    // Logique spécifique selon la phase
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
      gameState: this.gameState,
      canAct: this.phaseManager.canSubmitAction()
    });
  }
  
  /**
   * Gestion phase ACTION_SELECTION
   */
  private handleActionSelectionPhase(): void {
    console.log('🎮 [BattleEngine] Phase ACTION_SELECTION activée');
    
    // Vider la file d'attente pour le nouveau tour
    this.actionQueue.clear();
    
    // Émettre événement pour l'interface utilisateur
    this.emit('actionSelectionStart', {
      canAct: true,
      gameState: this.gameState
    });
    
    // IA agit automatiquement selon le type de combat
    setTimeout(() => {
      this.handleAIAction();
    }, this.getAIDelay());
  }
  
  /**
   * Gestion phase ACTION_RESOLUTION
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
    
    this.savePokemonAfterBattle();
    this.cleanupSpectators();
  }
  
  // === SOUMISSION D'ACTIONS (NOUVEAU SYSTÈME) ===
  
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
      
      // === VÉRIFIER SI TOUTES LES ACTIONS SONT PRÊTES ===
      if (this.actionQueue.areAllActionsReady()) {
        console.log('🔄 [BattleEngine] Toutes les actions prêtes → Résolution');
        this.transitionToPhase(BattlePhase.ACTION_RESOLUTION, 'all_actions_ready');
      }
      
      return {
        success: true,
        gameState: this.gameState,
        events: [`Action "${action.type}" enregistrée`]
      };
      
    } catch (error) {
      console.error(`❌ [BattleEngine] Erreur soumission action:`, error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue'
      );
    }
  }
  
  // === RÉSOLUTION PAR VITESSE (NOUVEAU) ===
  
  /**
   * Résolution des actions par vitesse - CŒUR DU SYSTÈME
   */
  private async resolveActionsBySpeed(): Promise<void> {
    console.log('⚡ [BattleEngine] === RÉSOLUTION PAR VITESSE ===');
    
    // 1. Récupérer toutes les actions
    const allActions = this.actionQueue.getAllActions();
    
    if (allActions.length === 0) {
      console.log('⚠️ [BattleEngine] Aucune action à résoudre');
      this.transitionToPhase(BattlePhase.ACTION_SELECTION, 'no_actions');
      return;
    }
    
    // 2. Calculer l'ordre par vitesse
    const orderedActions = this.actionQueue.getActionsBySpeed();
    
    console.log(`⚡ [BattleEngine] Ordre calculé: ${orderedActions.map(qa => 
      `${qa.playerRole}(${qa.action.type})`
    ).join(' → ')}`);
    
    // 3. Exécuter séquentiellement avec timing Pokémon
    for (let i = 0; i < orderedActions.length; i++) {
      const queuedAction = orderedActions[i];
      
      console.log(`▶️ [BattleEngine] Exécution ${i + 1}/${orderedActions.length}: ${queuedAction.playerRole} → ${queuedAction.action.type}`);
      
      // Exécuter l'action
      await this.executeAction(queuedAction);
      
      // Vérifier fin de combat
      const battleEndCheck = this.checkBattleEnd();
      if (battleEndCheck.isEnded) {
        console.log(`🏁 [BattleEngine] Combat terminé pendant résolution`);
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
    
    // 2. ✅ TIMING POKÉMON AUTHENTIQUE
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
  
  // === GESTION IA ===
  
  /**
   * Gère l'action de l'IA selon le type de combat
   */
  private handleAIAction(): void {
    if (this.gameState.player2.sessionId === 'ai') {
      console.log('🤖 [BattleEngine] IA va agir...');
      
      const aiAction = this.aiPlayer.generateAction();
      if (aiAction) {
        this.submitAction(aiAction);
      }
    }
  }
  
  /**
   * Calcule le délai avant action IA
   */
  private getAIDelay(): number {
    if (this.gameState.type === 'wild') {
      return 0; // Immédiat pour sauvage
    }
    return this.aiPlayer.getThinkingDelay(); // Réflexion pour dresseur
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
      currentTurn: 'player1', // Pas de narrateur dans le nouveau système
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
      turnNumber: 1, // Commencer à 1 avec le système de phases
      currentTurn: 'player1', // Sera géré par les phases
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
      version: 'battle_engine_phases_v1',
      architecture: 'phase_based_authentic_pokemon',
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
      
      // Statistiques modules
      moduleStats: {
        phaseManager: this.phaseManager.getStats(),
        actionQueue: this.actionQueue.getStats(),
        actionProcessor: this.actionProcessor.isReady(),
        aiPlayer: this.aiPlayer.getStats(),
        broadcastManager: this.broadcastManager?.getStats(),
        spectatorManager: this.spectatorManager?.getStats()
      },
      
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
