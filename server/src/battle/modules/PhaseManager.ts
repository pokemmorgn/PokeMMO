// server/src/battle/modules/PhaseManager.ts
// SYSTÈME DE PHASES POKÉMON AUTHENTIQUE - VERSION FINALE CORRIGÉE

import { BattleGameState, BattleAction, PlayerRole } from '../types/BattleTypes';

// === ÉNUMÉRATION DES PHASES ===

export enum BattlePhase {
  INITIALIZING = 'initializing',
  INTRO = 'intro',
  ACTION_SELECTION = 'action_selection',
  ACTION_RESOLUTION = 'action_resolution', 
  POKEMON_FAINTED = 'pokemon_fainted',
  CAPTURE = 'capture',
  ENDED = 'ended'
}

// === INTERFACES ===

export interface PhaseTransition {
  from: BattlePhase;
  to: BattlePhase;
  timestamp: number;
  trigger: string;
  data?: any;
}

export interface PhaseValidation {
  isValid: boolean;
  reason?: string;
  allowedActions?: string[];
}

/**
 * PHASE MANAGER - Gestionnaire de phases authentique Pokémon
 * 
 * 🚨 CORRECTION FINALE:
 * - Autoriser les transitions vers la même phase (pour reset de tour)
 * - Logique de validation assouplie
 * - Meilleure gestion des race conditions
 */
export class PhaseManager {
  
  private currentPhase: BattlePhase = BattlePhase.INITIALIZING;
  private gameState: BattleGameState | null = null;
  private phaseHistory: PhaseTransition[] = [];
  private phaseStartTime: number = 0;
  private isTransitioning: boolean = false;
  private initialized: boolean = false;
  private transitionLock: boolean = false;
  
  constructor() {
    console.log('🎭 [PhaseManager] Initialisé avec transitions flexibles');
    console.log(`🎭 [PhaseManager] Constructor - Phase initiale: ${this.currentPhase}`);
  }
  
  // === INITIALISATION ===
  
  initialize(gameState: BattleGameState): void {
    if (this.initialized) {
      console.log('⚠️ [PhaseManager] Déjà initialisé, ignore la re-initialisation');
      return;
    }

    console.log(`🎭 [PhaseManager] Initialize START - Phase actuelle: ${this.currentPhase}`);
    
    this.gameState = gameState;
    this.phaseStartTime = Date.now();
    this.phaseHistory = [];
    this.isTransitioning = false;
    this.transitionLock = false;
    
    this.currentPhase = BattlePhase.INTRO;
    this.initialized = true;
    
    console.log(`🎭 [PhaseManager] Initialize END - Phase: ${this.currentPhase}`);
    console.log('✅ [PhaseManager] Configuré pour combat avec phases flexibles');
  }
  
  // === GESTION DES PHASES ===
  
  /**
   * 🚨 CORRIGÉ: Change de phase avec validation ASSOUPLIE
   */
  setPhase(newPhase: BattlePhase, trigger: string = 'manual', data?: any): boolean {
    // Protection: Vérifier l'initialisation
    if (!this.initialized && newPhase !== BattlePhase.INTRO) {
      console.error(`❌ [PhaseManager] Tentative de transition avant initialisation: ${this.currentPhase} → ${newPhase}`);
      return false;
    }

    // Protection: Lock anti-race condition
    if (this.transitionLock) {
      console.log(`🔒 [PhaseManager] Transition bloquée par lock: ${this.currentPhase} → ${newPhase}`);
      return false;
    }

    if (this.isTransitioning) {
      console.log(`⏳ [PhaseManager] Transition en cours, changement refusé: ${newPhase}`);
      return false;
    }

    console.log(`🎭 [PhaseManager] Transition REQUEST: ${this.currentPhase} → ${newPhase} (${trigger})`);
    
    // 🚨 CORRECTION CRITIQUE: Validation assouplie
    const validation = this.validateTransitionFlexible(this.currentPhase, newPhase, trigger);
    if (!validation.isValid) {
      console.error(`❌ [PhaseManager] Transition invalide: ${this.currentPhase} → ${newPhase} (${validation.reason})`);
      return false;
    }
    
    // Activation du lock
    this.transitionLock = true;
    this.isTransitioning = true;
    
    try {
      // Enregistrer la transition
      const transition: PhaseTransition = {
        from: this.currentPhase,
        to: newPhase,
        timestamp: Date.now(),
        trigger,
        data
      };
      
      this.phaseHistory.push(transition);
      
      console.log(`🎭 [PhaseManager] Transition ACCEPTÉE: ${this.currentPhase} → ${newPhase} (${trigger})`);
      
      // Effectuer le changement
      this.currentPhase = newPhase;
      this.phaseStartTime = Date.now();
      
      // Mettre à jour l'état du jeu
      if (this.gameState) {
        const gameStatePhase = this.mapPhaseToGameState(newPhase);
        (this.gameState as any).phase = gameStatePhase;
      }
      
      return true;
      
    } finally {
      // Libération du lock
      this.isTransitioning = false;
      this.transitionLock = false;
    }
  }
  
  /**
   * Récupère la phase actuelle
   */
  getCurrentPhase(): BattlePhase {
    return this.currentPhase;
  }
  
  /**
   * Vérifie si on est dans une phase spécifique
   */
  isInPhase(phase: BattlePhase): boolean {
    return this.initialized && 
           this.currentPhase === phase && 
           !this.isTransitioning && 
           !this.transitionLock;
  }
  
  /**
   * Durée de la phase actuelle en millisecondes
   */
  getCurrentPhaseDuration(): number {
    return Date.now() - this.phaseStartTime;
  }
  
  // === VALIDATION DES ACTIONS ===
  
  /**
   * Vérifie si une action peut être soumise
   */
  canSubmitAction(actionType?: string): boolean {
    if (!this.initialized) {
      console.log('⚠️ [PhaseManager] Actions refusées - non initialisé');
      return false;
    }

    if (this.isTransitioning || this.transitionLock) {
      console.log('⚠️ [PhaseManager] Actions refusées - transition en cours');
      return false;
    }

    switch (this.currentPhase) {
      case BattlePhase.INITIALIZING:
        return false;
        
      case BattlePhase.INTRO:
        return false;
        
      case BattlePhase.ACTION_SELECTION:
        return true; // Actions autorisées
        
      case BattlePhase.ACTION_RESOLUTION:
        return false;
        
      case BattlePhase.POKEMON_FAINTED:
        return false;
        
      case BattlePhase.CAPTURE:
        return false;
        
      case BattlePhase.ENDED:
        return false;
        
      default:
        console.warn(`⚠️ [PhaseManager] Phase inconnue: ${this.currentPhase}`);
        return false;
    }
  }
  
  /**
   * Valide qu'une action est appropriée pour la phase
   */
  validateAction(action: BattleAction): PhaseValidation {
    if (!this.canSubmitAction(action.type)) {
      return {
        isValid: false,
        reason: `Actions non autorisées en phase ${this.currentPhase}`
      };
    }
    
    switch (this.currentPhase) {
      case BattlePhase.ACTION_SELECTION:
        return this.validateActionSelection(action);
        
      default:
        return {
          isValid: false,
          reason: `Phase ${this.currentPhase} ne gère pas les actions`
        };
    }
  }
  
  /**
   * Validation spécifique phase ACTION_SELECTION
   */
  private validateActionSelection(action: BattleAction): PhaseValidation {
    const allowedActions = ['attack', 'item', 'switch', 'run', 'capture'];
    
    if (!allowedActions.includes(action.type)) {
      return {
        isValid: false,
        reason: `Type d'action non autorisé: ${action.type}`,
        allowedActions
      };
    }
    
    // Validation capture seulement en combat sauvage
    if (action.type === 'capture' && this.gameState?.type !== 'wild') {
      return {
        isValid: false,
        reason: 'Capture seulement possible contre Pokémon sauvages'
      };
    }
    
    return { isValid: true };
  }
  
  // === TRANSITIONS SPÉCIALES ===
  
  /**
   * Transition automatique vers ACTION_SELECTION
   */
  transitionToActionSelection(): boolean {
    return this.setPhase(BattlePhase.ACTION_SELECTION, 'auto_intro_end');
  }
  
  /**
   * Transition vers RESOLUTION quand toutes les actions sont prêtes
   */
  transitionToResolution(actionsReady: boolean): boolean {
    if (!actionsReady) {
      console.log(`⏳ [PhaseManager] Attente des actions pour résolution`);
      return false;
    }
    
    return this.setPhase(BattlePhase.ACTION_RESOLUTION, 'actions_ready');
  }
  
  /**
   * Transition vers CAPTURE
   */
  transitionToCapture(): boolean {
    return this.setPhase(BattlePhase.CAPTURE, 'capture_attempt');
  }
  
  /**
   * Transition vers ENDED
   */
  transitionToEnded(reason: string): boolean {
    return this.setPhase(BattlePhase.ENDED, reason);
  }
  
  /**
   * 🚨 NOUVEAU: Reset de tour (même phase)
   */
  resetTurn(): boolean {
    return this.setPhase(BattlePhase.ACTION_SELECTION, 'turn_reset');
  }
  
  /**
   * Retour à ACTION_SELECTION après résolution
   */
  returnToActionSelection(): boolean {
    return this.setPhase(BattlePhase.ACTION_SELECTION, 'resolution_complete');
  }
  
  // === VALIDATION DES TRANSITIONS FLEXIBLE ===
  
  /**
   * 🚨 CORRIGÉ: Valide les transitions avec logique flexible
   */
  private validateTransitionFlexible(from: BattlePhase, to: BattlePhase, trigger: string): PhaseValidation {
    
    // 🚨 RÈGLE SPÉCIALE: Autoriser les transitions vers la même phase pour certains triggers
    if (from === to) {
      const allowedSamePhaseTransitions = [
        'turn_reset',
        'turn_complete', 
        'timeout_next_turn',
        'timeout_force',
        'timeout_force_complete',
        'resolution_complete',
        'intro_complete',
        'manual_reset'
      ];
      
      if (allowedSamePhaseTransitions.includes(trigger)) {
        console.log(`🔄 [PhaseManager] Transition même phase autorisée: ${from} (${trigger})`);
        return { isValid: true };
      } else {
        return {
          isValid: false,
          reason: `Transition vers même phase non autorisée pour trigger: ${trigger}`
        };
      }
    }
    
    // 🚨 RÈGLE SPÉCIALE: Autoriser toutes les transitions en cas de timeout/force
    const emergencyTriggers = [
      'timeout',
      'force_battle_end', 
      'error',
      'timeout_force',
      'emergency_end',
      'crash_recovery'
    ];
    
    if (emergencyTriggers.some(emergency => trigger.includes(emergency))) {
      console.log(`🚨 [PhaseManager] Transition d'urgence autorisée: ${from} → ${to} (${trigger})`);
      return { isValid: true };
    }
    
    // 🚨 RÈGLES NORMALES: Matrice des transitions autorisées
    const allowedTransitions: Record<BattlePhase, BattlePhase[]> = {
      [BattlePhase.INITIALIZING]: [BattlePhase.INTRO],
      [BattlePhase.INTRO]: [BattlePhase.ACTION_SELECTION, BattlePhase.ENDED],
      [BattlePhase.ACTION_SELECTION]: [
        BattlePhase.ACTION_RESOLUTION, 
        BattlePhase.CAPTURE, 
        BattlePhase.ENDED,
        BattlePhase.ACTION_SELECTION // 🚨 NOUVEAU: Autoriser reset
      ],
      [BattlePhase.ACTION_RESOLUTION]: [
        BattlePhase.POKEMON_FAINTED, 
        BattlePhase.ACTION_SELECTION, 
        BattlePhase.ENDED
      ],
      [BattlePhase.POKEMON_FAINTED]: [BattlePhase.ACTION_SELECTION, BattlePhase.ENDED],
      [BattlePhase.CAPTURE]: [BattlePhase.ACTION_SELECTION, BattlePhase.ENDED],
      [BattlePhase.ENDED]: [BattlePhase.ENDED] // 🚨 NOUVEAU: Autoriser re-end
    };
    
    const allowed = allowedTransitions[from] || [];
    
    if (!allowed.includes(to)) {
      return {
        isValid: false,
        reason: `Transition non autorisée: ${from} → ${to} (règles normales)`
      };
    }
    
    return { isValid: true };
  }
  
  // === LOGIQUES SPÉCIALES ===
  
  /**
   * Vérifie si la phase INTRO devrait se terminer automatiquement
   */
  shouldAutoEndIntro(): boolean {
    if (this.currentPhase !== BattlePhase.INTRO) return false;
    
    const INTRO_DURATION = 2000; // 2 secondes pour tests
    return this.getCurrentPhaseDuration() >= INTRO_DURATION;
  }
  
  /**
   * Détermine la prochaine phase après résolution
   */
  getNextPhaseAfterResolution(battleEnded: boolean): BattlePhase {
    if (battleEnded) {
      return BattlePhase.ENDED;
    }
    return BattlePhase.ACTION_SELECTION;
  }
  
  // === INFORMATIONS ===
  
  /**
   * État complet du gestionnaire de phases
   */
  getPhaseState(): any {
    return {
      currentPhase: this.currentPhase,
      phaseDuration: this.getCurrentPhaseDuration(),
      isTransitioning: this.isTransitioning,
      transitionLock: this.transitionLock,
      initialized: this.initialized,
      canSubmitActions: this.canSubmitAction(),
      transitionCount: this.phaseHistory.length,
      gameStatePhase: this.gameState?.phase || 'unknown',
      lastTransition: this.phaseHistory.length > 0 ? 
        this.phaseHistory[this.phaseHistory.length - 1] : null,
      
      // 🚨 NOUVEAU: Diagnostics des transitions
      recentTransitions: this.phaseHistory.slice(-5).map(t => ({
        from: t.from,
        to: t.to,
        trigger: t.trigger,
        timestamp: t.timestamp
      }))
    };
  }
  
  /**
   * Historique des transitions
   */
  getPhaseHistory(): PhaseTransition[] {
    return [...this.phaseHistory];
  }
  
  /**
   * Statistiques des phases
   */
  getPhaseStats(): any {
    const phaseCount: Record<string, number> = {};
    const phaseTime: Record<string, number> = {};
    
    this.phaseHistory.forEach((transition, index) => {
      const phase = transition.from;
      phaseCount[phase] = (phaseCount[phase] || 0) + 1;
      
      if (index > 0) {
        const duration = transition.timestamp - this.phaseHistory[index - 1].timestamp;
        phaseTime[phase] = (phaseTime[phase] || 0) + duration;
      }
    });
    
    return {
      version: 'phase_system_v3_flexible_transitions',
      currentPhase: this.currentPhase,
      initialized: this.initialized,
      totalTransitions: this.phaseHistory.length,
      phaseCount,
      averagePhaseTime: phaseTime,
      features: [
        'six_phase_system_with_initializing',
        'flexible_transition_validation',     // 🚨 NOUVEAU
        'same_phase_transitions_allowed',     // 🚨 NOUVEAU
        'emergency_transition_override',      // 🚨 NOUVEAU
        'turn_reset_capability', 
        'race_condition_protection',
        'transition_locking',
        'enhanced_validation',
        'debug_improvements',
        'thread_safe_transitions'
      ],
      corrections: [
        'initializing_phase_added',
        'transition_lock_implemented',
        'race_condition_fixed',
        'initialization_flag_added',
        'enhanced_debugging',
        'flexible_validation_ADDED',          // 🚨 NOUVEAU
        'same_phase_transitions_ENABLED',     // 🚨 NOUVEAU
        'emergency_overrides_IMPLEMENTED',    // 🚨 NOUVEAU
        'turn_progression_GUARANTEED'         // 🚨 NOUVEAU
      ]
    };
  }
  
  // === UTILITAIRES ===
  
  /**
   * Mappe les phases internes vers l'état du jeu
   */
  private mapPhaseToGameState(phase: BattlePhase): 'waiting' | 'battle' | 'ended' | 'fled' {
    switch (phase) {
      case BattlePhase.INITIALIZING:
        return 'waiting';
      case BattlePhase.INTRO:
      case BattlePhase.ACTION_SELECTION:
      case BattlePhase.ACTION_RESOLUTION:
      case BattlePhase.POKEMON_FAINTED:
      case BattlePhase.CAPTURE:
        return 'battle';
      case BattlePhase.ENDED:
        return 'ended';
      default:
        return 'waiting';
    }
  }
  
  /**
   * Reset pour nouveau combat
   */
  reset(): void {
    this.currentPhase = BattlePhase.INITIALIZING;
    this.gameState = null;
    this.phaseHistory = [];
    this.phaseStartTime = 0;
    this.isTransitioning = false;
    this.initialized = false;
    this.transitionLock = false;
    
    console.log('🔄 [PhaseManager] Reset effectué - retour à INITIALIZING avec transitions flexibles');
  }
  
  /**
   * Vérifie si le gestionnaire est prêt
   */
  isReady(): boolean {
    return this.initialized && 
           this.gameState !== null && 
           this.currentPhase !== BattlePhase.INITIALIZING &&
           !this.transitionLock;
  }
  
  // === MÉTHODES DE DEBUG ===
  
  /**
   * Debug pour identifier les problèmes de transition
   */
  debugTransitionState(): void {
    console.log('🔍 [PhaseManager] DEBUG STATE:');
    console.log(`  - currentPhase: ${this.currentPhase}`);
    console.log(`  - initialized: ${this.initialized}`);
    console.log(`  - isTransitioning: ${this.isTransitioning}`);
    console.log(`  - transitionLock: ${this.transitionLock}`);
    console.log(`  - canSubmitAction: ${this.canSubmitAction()}`);
    console.log(`  - recentTransitions: ${this.phaseHistory.slice(-3).map(t => `${t.from}→${t.to}(${t.trigger})`).join(', ')}`);
  }
  
  /**
   * Force une transition en mode debug (usage interne uniquement)
   */
  forceTransition(to: BattlePhase, reason: string = 'debug_force'): boolean {
    console.warn(`⚠️ [PhaseManager] FORCE TRANSITION: ${this.currentPhase} → ${to} (${reason})`);
    
    // Libérer tous les locks
    this.transitionLock = false;
    this.isTransitioning = false;
    
    // Effectuer la transition forcée
    return this.setPhase(to, `force_${reason}`);
  }
  
  /**
   * 🚨 NOUVEAU: Test de validation sans exécution
   */
  testTransition(to: BattlePhase, trigger: string): PhaseValidation {
    return this.validateTransitionFlexible(this.currentPhase, to, trigger);
  }
}

export default PhaseManager;
