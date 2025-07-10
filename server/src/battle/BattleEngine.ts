// server/src/battle/BattleEngine.ts
// VERSION POKÉMON ROUGE/BLEU ABSOLUMENT AUTHENTIQUE - ZERO ATTENTE SAUVAGE

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
 * BATTLE ENGINE - POKÉMON ROUGE/BLEU ABSOLUMENT AUTHENTIQUE
 * ✅ ZERO ATTENTE POUR COMBAT SAUVAGE
 */

// === SOUS-PHASES POKÉMON AUTHENTIQUES ===
enum SubPhase {
  NONE = 'none',
  ATTACKER_1 = 'attacker_1_phase',
  ATTACKER_2 = 'attacker_2_phase'
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
  
  // === MODULES BROADCAST ===
  private broadcastManager: BroadcastManager | null = null;
  private spectatorManager: SpectatorManager | null = null;
  
  // === SYSTÈME D'ÉVÉNEMENTS ===
  private eventListeners: Map<string, Function[]> = new Map();
  private modules: Map<string, BattleModule> = new Map();
  
  // === TIMERS ===
  private introTimer: NodeJS.Timeout | null = null;
  private aiActionTimer: NodeJS.Timeout | null = null;
  private subPhaseTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    console.log('🎯 [BattleEngine] Système Pokémon Rouge/Bleu - ZERO ATTENTE SAUVAGE');
    
    // === MODULES ===
    this.phaseManager = new PhaseManager();
    this.actionQueue = new ActionQueue();
    this.speedCalculator = new SpeedCalculator();
    this.actionProcessor = new ActionProcessor();
    this.aiPlayer = new AIPlayer();
    this.battleEndManager = new BattleEndManager();
    this.captureManager = new CaptureManager();
    
    // État initial vide
    this.gameState = this.createEmptyState();
    
    console.log('✅ [BattleEngine] Pokémon Rouge/Bleu INSTANTANÉ prêt');
  }
  
  // === API PRINCIPALE ===
  
  /**
   * Démarre un nouveau combat - Style Pokémon Rouge/Bleu AUTHENTIQUE
   */
  startBattle(config: BattleConfig): BattleResult {
    console.log(`🚀 [BattleEngine] DÉBUT COMBAT POKÉMON INSTANTANÉ - Type: ${config.type}`);
    
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
      
      // 6. Émettre événement de début avec message authentique Pokémon
      this.emit('battleStart', {
        gameState: this.gameState,
        phase: InternalBattlePhase.INTRO,
        introMessage: `Un ${this.gameState.player2.pokemon!.name} sauvage apparaît !`
      });
      
      // 7. ✅ INTRO RAPIDE POUR SAUVAGE
      this.scheduleIntroTransition();
      
      console.log(`✅ [BattleEngine] Combat Pokémon INSTANTANÉ démarré`);
      
      return {
        success: true,
        gameState: this.gameState,
        events: [`Un ${this.gameState.player2.pokemon!.name} sauvage apparaît !`]
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
  
  // === GESTION DES PHASES POKÉMON ROUGE/BLEU AUTHENTIQUE ===
  
  /**
   * ✅ INTRO ULTRA-RAPIDE POUR SAUVAGE
   */
  private scheduleIntroTransition(): void {
    const introDelay = this.gameState.type === 'wild' ? 500 : 3000; // ✅ 0.5s pour sauvage
    console.log(`⏰ [BattleEngine] Intro - Transition dans ${introDelay}ms`);
    
    this.introTimer = setTimeout(() => {
      console.log('🎮 [BattleEngine] "Que doit faire [Pokémon] ?" - POKÉMON AUTHENTIQUE');
      
      if (this.getCurrentPhase() === InternalBattlePhase.INTRO && this.isInitialized) {
        this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'intro_complete');
      }
    }, introDelay);
  }
  
  /**
   * Transition vers une nouvelle phase
   */
  transitionToPhase(newPhase: InternalBattlePhase, trigger: string = 'manual'): void {
    if (!this.isInitialized) {
      console.log('❌ [BattleEngine] Combat non initialisé');
      return;
    }
    
    const currentPhase = this.phaseManager.getCurrentPhase();
    console.log(`🎭 [BattleEngine] Transition Pokémon: ${currentPhase} → ${newPhase} (${trigger})`);
    
    const success = this.phaseManager.setPhase(newPhase, trigger);
    if (!success) {
      console.log(`❌ [BattleEngine] Transition refusée`);
      return;
    }
    
    console.log(`✅ [BattleEngine] Nouvelle phase Pokémon: ${newPhase}`);
    
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
   * ✅ GESTION ACTION_SELECTION - PAS D'IA AUTO POUR SAUVAGE
   */
  private handleActionSelectionPhase(): void {
    console.log('🎮 [BattleEngine] ACTION_SELECTION - "Que doit faire votre Pokémon ?"');
    
    // Nettoyer les timers précédents
    this.clearActionTimers();
    
    // Vider la file d'attente pour le nouveau tour
    this.actionQueue.clear();
    
    // Reset des sous-phases
    this.currentSubPhase = SubPhase.NONE;
    this.orderedActions = [];
    this.currentAttackerData = null;
    
    // Émettre événement pour l'interface utilisateur
    this.emit('actionSelectionStart', {
      canAct: true,
      gameState: this.gameState,
      turnNumber: this.gameState.turnNumber,
      message: "Que doit faire votre Pokémon ?"
    });
    
    // ✅ PAS D'IA AUTO POUR SAUVAGE - Elle sera gérée dans submitAction()
    if (this.gameState.type !== 'wild') {
      console.log('🤖 [BattleEngine] Programmation IA pour dresseur/PvP');
      this.scheduleAIAction();
    } else {
      console.log('🌿 [BattleEngine] Combat sauvage - IA gérée au clic joueur');
    }
  }
  
  /**
   * ✅ POKÉMON ROUGE/BLEU AUTHENTIQUE: Gestion phase ACTION_RESOLUTION avec VRAIES SOUS-PHASES
   */
  private async handleActionResolutionPhase(): Promise<void> {
    console.log('⚔️ [BattleEngine] ACTION_RESOLUTION - SOUS-PHASES POKÉMON AUTHENTIQUES');
    
    this.isProcessingActions = true;
    
    try {
      // 1. Récupérer et ordonner les actions par vitesse
      const allActions = this.actionQueue.getAllActions();
      
      if (allActions.length === 0) {
        console.log('⚠️ [BattleEngine] Aucune action à résoudre');
        this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'no_actions');
        return;
      }
      
      // 2. Calculer l'ordre par vitesse (COMME POKÉMON ROUGE/BLEU)
      this.orderedActions = this.actionQueue.getActionsBySpeed();
      
      console.log(`⚡ [BattleEngine] Ordre Pokémon authentique: ${this.orderedActions.map(qa => 
        `${qa.playerRole}(${qa.pokemon.name})`
      ).join(' puis ')}`);
      
      // 3. Émettre événement de début de résolution
      this.emit('resolutionStart', {
        actionCount: this.orderedActions.length,
        orderPreview: this.orderedActions.map(qa => ({
          playerRole: qa.playerRole,
          actionType: qa.action.type,
          pokemonName: qa.pokemon.name
        }))
      });
      
      // 4. ✅ POKÉMON AUTHENTIQUE: Commencer ATTACKER_1_PHASE
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
    // Tous les attaquants ont agi
    await this.completeActionResolution();
    return;
  }
  
  this.currentAttackerData = this.orderedActions[attackerIndex];
  const attackerNumber = attackerIndex + 1;
  const totalAttackers = this.orderedActions.length;
  
  // Déterminer la sous-phase
  this.currentSubPhase = attackerIndex === 0 ? SubPhase.ATTACKER_1 : SubPhase.ATTACKER_2;
  
  console.log(`👊 [BattleEngine] === ${this.currentSubPhase.toUpperCase()} === `);
  console.log(`🎯 [BattleEngine] ${this.currentAttackerData.pokemon.name} (${this.currentAttackerData.playerRole}) va agir`);
  
  // Émettre événement de début de phase attaquant
  this.emit('attackerPhaseStart', {
    subPhase: this.currentSubPhase,
    playerRole: this.currentAttackerData.playerRole,
    actionType: this.currentAttackerData.action.type,
    attackerNumber,
    totalAttackers,
    pokemon: this.currentAttackerData.pokemon.name,
    message: `Phase d'attaque de ${this.currentAttackerData.pokemon.name}`
  });
  
  // ✅ POKÉMON AUTHENTIQUE: Exécuter l'action COMPLÈTEMENT et ATTENDRE
  console.log(`⏰ [BattleEngine] DÉBUT action ${this.currentAttackerData.pokemon.name} - AVEC TIMING OPTIMISÉ`);
  
  await this.executeFullAttackerAction();
  
  console.log(`⏰ [BattleEngine] FIN action ${this.currentAttackerData.pokemon.name} - Délais optimisés`);
  
  // Vérifier fin de combat après cette phase
  const battleEndCheck = this.checkBattleEnd();
  if (battleEndCheck.isEnded) {
    console.log(`🏁 [BattleEngine] Combat terminé après phase ${this.currentSubPhase}: ${battleEndCheck.reason}`);
    this.gameState.isEnded = true;
    this.gameState.winner = battleEndCheck.winner;
    this.transitionToPhase(InternalBattlePhase.ENDED, battleEndCheck.reason);
    return;
  }
  
  // ✅ DÉLAI ULTRA-COURT ENTRE ATTAQUANTS
  const betweenDelay = this.gameState.type === 'wild' ? 100 : 500;
  await this.delay(betweenDelay);
  
  await this.startAttackerPhase(attackerIndex + 1);
}
  
  /**
   * ✅ EXÉCUTION ATTAQUE AVEC TIMING OPTIMISÉ
   */
private async executeFullAttackerAction(): Promise<void> {
  const { action, playerRole, pokemon } = this.currentAttackerData;
  
  console.log(`⚔️ [BattleEngine] EXÉCUTION OPTIMISÉE: ${pokemon.name} utilise ${action.data?.moveId}!`);
  
  // 1. Traiter l'action via ActionProcessor
  const result = this.actionProcessor.processAction(action);
  
  if (!result.success) {
    console.log(`❌ [BattleEngine] Échec action ${playerRole}: ${result.error}`);
    return;
  }
  
  // 2. ✅ ÉMISSION ULTRA-RAPIDE POUR SAUVAGE
  if (action.type === 'attack' && result.data && this.broadcastManager) {
    
    const isWild = this.gameState.type === 'wild';
    
    // Message d'attaque
    console.log(`📢 [BattleEngine] "${pokemon.name} utilise ${this.getMoveDisplayName(action.data.moveId)} !"`);
    
    if (isWild) {
      // ✅ MODE INSTANTANÉ POUR SAUVAGE
      this.broadcastManager.emit('moveUsed', {
        attackerName: pokemon.name,
        attackerRole: playerRole,
        moveName: this.getMoveDisplayName(action.data.moveId),
        moveId: action.data.moveId,
        subPhase: this.currentSubPhase,
        message: `${pokemon.name} utilise ${this.getMoveDisplayName(action.data.moveId)} !`
      });
      
      // Dégâts avec micro-délai pour ordre
      if (result.data.damage > 0) {
        setTimeout(() => {
          this.broadcastManager!.emit('damageDealt', {
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
        }, 50);
      }
      
      // K.O. avec micro-délai
      if (result.data.isKnockedOut) {
        const defenderName = result.data.defenderRole === 'player1' ? 
          this.gameState.player1.pokemon!.name : 
          this.gameState.player2.pokemon!.name;
          
        setTimeout(() => {
          this.broadcastManager!.emit('pokemonFainted', {
            pokemonName: defenderName,
            targetRole: result.data.defenderRole,
            subPhase: this.currentSubPhase,
            message: `${defenderName} est mis K.O. !`
          });
        }, 100);
      }
      
    } else {
      // Mode normal avec timing pour dresseurs
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
      
      if (result.data.isKnockedOut) {
        const defenderName = result.data.defenderRole === 'player1' ? 
          this.gameState.player1.pokemon!.name : 
          this.gameState.player2.pokemon!.name;
          
        await this.broadcastManager.emitTimed('pokemonFainted', {
          pokemonName: defenderName,
          targetRole: result.data.defenderRole,
          subPhase: this.currentSubPhase,
          message: `${defenderName} est mis K.O. !`
        });
      }
    }
    
    // Émettre fin de phase d'attaquant
    this.emit('attackerPhaseComplete', {
      subPhase: this.currentSubPhase,
      playerRole: playerRole,
      pokemon: pokemon.name,
      damageDealt: result.data.damage || 0,
      targetKnockedOut: result.data.isKnockedOut || false
    });
  }
  
  // 3. Émettre événement d'action traitée
  this.emit('actionProcessed', {
    action,
    result,
    playerRole,
    subPhase: this.currentSubPhase
  });
  
  console.log(`✅ [BattleEngine] Phase complète de ${pokemon.name} terminée`);
}
  
  /**
   * ✅ POKÉMON ROUGE/BLEU: Termine la phase de résolution (tous les attaquants ont agi)
   */
  private async completeActionResolution(): Promise<void> {
    console.log('✅ [BattleEngine] === RÉSOLUTION COMPLÈTE === Nouveau tour Pokémon');
    
    // Reset des sous-phases
    this.isProcessingActions = false;
    this.currentSubPhase = SubPhase.NONE;
    this.orderedActions = [];
    this.currentAttackerData = null;
    
    // Incrémenter le numéro de tour
    this.gameState.turnNumber++;
    
    // Émettre événement de fin de résolution
    this.emit('resolutionComplete', {
      actionsExecuted: this.actionQueue.getAllActions().length,
      battleEnded: false,
      newTurnNumber: this.gameState.turnNumber,
      message: "Tour terminé ! Nouveau tour."
    });
    
    // Retour à la sélection d'action pour le nouveau tour
    this.transitionToPhase(InternalBattlePhase.ACTION_SELECTION, 'turn_complete');
  }
  
  // === ✅ SOUMISSION D'ACTIONS OPTIMISÉE POUR SAUVAGE ===
  
  async submitAction(action: BattleAction, teamManager?: any): Promise<BattleResult> {
    console.log(`🎮 [BattleEngine] Action soumise: ${action.type} par ${action.playerId}`);
    
    if (!this.isInitialized) {
      return this.createErrorResult('Combat non initialisé');
    }
    
    if (this.gameState.isEnded) {
      return this.createErrorResult('Combat déjà terminé');
    }
    
    // Validation de phase
    const phaseValidation = this.phaseManager.validateAction(action);
    if (!phaseValidation.isValid) {
      return this.createErrorResult(phaseValidation.reason || 'Action non autorisée');
    }
    
    // Validation joueur
    const playerRole = this.getPlayerRole(action.playerId);
    if (!playerRole) {
      return this.createErrorResult('Joueur non reconnu');
    }
    
    try {
      // Gestion capture spéciale
      if (action.type === 'capture') {
        return await this.handleCaptureAction(action, teamManager);
      }
      
      // Ajouter à la file d'attente
      const pokemon = playerRole === 'player1' ? 
        this.gameState.player1.pokemon! : 
        this.gameState.player2.pokemon!;
      
      const success = this.actionQueue.addAction(playerRole, action, pokemon);
      if (!success) {
        return this.createErrorResult('Erreur ajout action en file');
      }
      
      console.log(`📥 [BattleEngine] Action ajoutée: ${playerRole} → ${action.type}`);
      
      // ✅ FIX PRINCIPAL: IA SYNCHRONE POUR COMBAT SAUVAGE
      if (this.gameState.type === 'wild' && playerRole === 'player1') {
        console.log('⚡ [BattleEngine] Combat sauvage - IA SYNCHRONE IMMÉDIATE');
        
        // Annuler tout timer IA existant
        this.clearActionTimers();
        
        // Générer action IA immédiatement
        const aiAction = this.aiPlayer.generateAction();
        if (aiAction) {
          const aiPokemon = this.gameState.player2.pokemon!;
          const aiSuccess = this.actionQueue.addAction('player2', aiAction, aiPokemon);
          
          if (aiSuccess) {
            console.log(`🤖 [BattleEngine] IA action ajoutée: ${aiAction.type}`);
            
            // Transition immédiate vers résolution
            console.log('⚡ [BattleEngine] RÉSOLUTION IMMÉDIATE - ZERO ATTENTE !');
            this.transitionToPhase(InternalBattlePhase.ACTION_RESOLUTION, 'instant_wild_resolution');
            
            return {
              success: true,
              gameState: this.gameState,
              events: [`Combat sauvage - Résolution immédiate !`],
              actionQueued: true
            };
          }
        }
        
        // Fallback si problème IA
        console.warn('⚠️ [BattleEngine] Problème IA, mode normal');
      }
      
      // ✅ LOGIQUE NORMALE pour PvP/Dresseurs
      this.emit('actionQueued', {
        playerRole,
        actionType: action.type,
        queueState: this.actionQueue.getQueueState()
      });
      
      // Vérifier si toutes les actions sont prêtes
      if (this.actionQueue.areAllActionsReady()) {
        console.log('🔄 [BattleEngine] Toutes les actions prêtes → Résolution');
        this.clearActionTimers();
        this.transitionToPhase(InternalBattlePhase.ACTION_RESOLUTION, 'all_actions_ready');
      } else {
        // Programmer IA pour dresseurs/PvP
        this.scheduleAIAction();
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
  
  // === IA OPTIMISÉE ===
  
  /**
   * ✅ SCHEDULING IA - PAS POUR SAUVAGE
   */
  private scheduleAIAction(): void {
    if (this.gameState.player2.sessionId !== 'ai') {
      console.log('👤 [BattleEngine] Pas d\'IA, en attente joueur 2');
      return;
    }
    
    // ✅ NE PAS PROGRAMMER D'IA POUR SAUVAGE (gérée en synchrone)
    if (this.gameState.type === 'wild') {
      console.log('🌿 [BattleEngine] Combat sauvage - IA gérée en synchrone dans submitAction()');
      return;
    }
    
    // Logique normale pour dresseurs/PvP
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
  
  /**
   * ✅ DÉLAI IA OPTIMISÉ
   */
  private getAIDelay(): number {
    if (this.gameState.type === 'wild') {
      return 0; // ✅ ZERO pour sauvage (mais ne devrait pas être appelé)
    }
    return this.aiPlayer.getThinkingDelay();
  }
  
  // === GESTION DES TIMERS ===
  
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
  
  // === CAPTURE (INCHANGÉ) ===
  
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
      if (result.success && result.captureData?.captured) {
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
        reason: `${player1Pokemon.name} est K.O. ! Vous avez perdu !`
      };
    }
    
    if (player2KO) {
      return {
        isEnded: true,
        winner: 'player1',
        reason: `${player2Pokemon.name} est K.O. ! Vous avez gagné !`
      };
    }
    
    return { isEnded: false, winner: null, reason: '' };
  }
  
  // === INITIALISATION MODULES (INCHANGÉE) ===
  
  private initializeAllModules(): void {
    console.log('🔧 [BattleEngine] Initialisation de tous les modules...');
    
    this.phaseManager.initialize(this.gameState);
    this.actionProcessor.initialize(this.gameState);
    this.aiPlayer.initialize(this.gameState);
    this.battleEndManager.initialize(this.gameState);
    this.captureManager.initialize(this.gameState);
    this.configureBroadcastSystem();
    
    console.log('✅ [BattleEngine] Tous les modules initialisés');
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
  
  // === COMPATIBILITÉ BATTLEROOM ===
  
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
  
  // === GETTERS ===
  
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
  
  // === UTILITAIRES ===
  
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
      return this.gameState.player1.name;
    } else if (playerId === this.gameState.player2.sessionId) {
      return this.gameState.player2.name;
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
    
    // Reset sous-phases
    this.currentSubPhase = SubPhase.NONE;
    this.orderedActions = [];
    this.currentAttackerData = null;
    
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
  
  getSystemState(): any {
    return {
      version: 'pokemon_rouge_bleu_ZERO_ATTENTE_v1',
      architecture: 'wild_instant_synchronous_ai',
      isInitialized: this.isInitialized,
      isProcessingActions: this.isProcessingActions,
      currentSubPhase: this.currentSubPhase,
      currentAttacker: this.currentAttackerData?.pokemon?.name || 'aucun',
      
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
      
      timers: {
        introTimer: this.introTimer !== null,
        aiActionTimer: this.aiActionTimer !== null,
        subPhaseTimer: this.subPhaseTimer !== null
      },
      
      optimizations: [
        'zero_ai_delay_wild',
        'synchronous_ai_execution',
        'instant_action_resolution',
        'optimized_intro_timing',
        'ultra_fast_emissions',
        'no_setTimeout_for_wild'
      ],
      
      wildBattleFlow: [
        'click_attack',
        'submitAction_immediate',
        'ai_synchronous_generation',
        'instant_phase_transition',
        'ultra_fast_execution',
        'ZERO_WAITING_TIME'
      ]
    };
  }
}

export default BattleEngine;
