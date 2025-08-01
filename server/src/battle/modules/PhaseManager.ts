// server/src/battle/modules/PhaseManager.ts
// SYSTÈME DE PHASES POKÉMON AUTHENTIQUE - VERSION CORRIGÉE

import { BattleGameState, BattleAction, PlayerRole } from '../types/BattleTypes';

// === ÉNUMÉRATION DES PHASES ===

export enum BattlePhase {
  INITIALIZING = 'initializing',  // ✅ NOUVEAU: Phase d'initialisation
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
 * CORRECTIONS APPLIQUÉES:
 * - Phase INITIALIZING pour éviter les race conditions
 * - Lock des transitions pour empêcher les appels simultanés
 * - Validation renforcée des états
 * - Debug amélioré
 * 
 * Responsabilités :
 * - Gérer les 6 phases distinctes (incluant INITIALIZING)
 * - Valider les transitions avec lock
 * - Contrôler les actions autorisées
 * - Historique des transitions
 * - Timings de phases
 */
export class PhaseManager {
  
  private currentPhase: BattlePhase = BattlePhase.INITIALIZING;  // ✅ CORRECTION: État initial
  private gameState: BattleGameState | null = null;
  private phaseHistory: PhaseTransition[] = [];
  private phaseStartTime: number = 0;
  private isTransitioning: boolean = false;
  private initialized: boolean = false;  // ✅ NOUVEAU: Flag d'initialisation
  private transitionLock: boolean = false;  // ✅ NOUVEAU: Lock pour éviter race conditions
  
  constructor() {
    console.log('🎭 [PhaseManager] Initialisé avec 6 phases (incluant INITIALIZING)');
    console.log(`🎭 [PhaseManager] Constructor - Phase initiale: ${this.currentPhase}`);
  }
  
  // === INITIALISATION ===
  
  /**
   * ✅ CORRIGÉ: Initialise avec l'état du jeu de manière thread-safe
   */
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
    
    // ✅ CORRECTION: Transition propre vers INTRO
    this.currentPhase = BattlePhase.INTRO;
    this.initialized = true;
    
    console.log(`🎭 [PhaseManager] Initialize END - Phase: ${this.currentPhase}`);
    console.log('✅ [PhaseManager] Configuré pour combat avec phases');
  }
  
  // === GESTION DES PHASES ===
  
  /**
   * ✅ CORRIGÉ: Change de phase avec validation ET lock anti-race condition
   */
  setPhase(newPhase: BattlePhase, trigger: string = 'manual', data?: any): boolean {
    // ✅ PROTECTION: Vérifier l'initialisation
    if (!this.initialized && newPhase !== BattlePhase.INTRO) {
      console.error(`❌ [PhaseManager] Tentative de transition avant initialisation: ${this.currentPhase} → ${newPhase}`);
      return false;
    }

    // ✅ PROTECTION: Lock anti-race condition
    if (this.transitionLock) {
      console.log(`🔒 [PhaseManager] Transition bloquée par lock: ${this.currentPhase} → ${newPhase}`);
      return false;
    }

    if (this.isTransitioning) {
      console.log(`⏳ [PhaseManager] Transition en cours, changement refusé: ${newPhase}`);
      return false;
    }

    console.log(`🎭 [PhaseManager] Transition REQUEST: ${this.currentPhase} → ${newPhase} (${trigger})`);
    console.log(`🎭 [PhaseManager] Current actual phase: ${this.currentPhase}`);
    
    const validation = this.validateTransition(this.currentPhase, newPhase);
    if (!validation.isValid) {
      console.error(`❌ [PhaseManager] Transition invalide: ${this.currentPhase} → ${newPhase} (${validation.reason})`);
      return false;
    }
    
    // ✅ ACTIVATION DU LOCK
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
      
      console.log(`🎭 [PhaseManager] Transition: ${this.currentPhase} → ${newPhase} (${trigger})`);
      
      // Effectuer le changement
      this.currentPhase = newPhase;
      this.phaseStartTime = Date.now();
      
      // Mettre à jour l'état du jeu avec le bon type
      if (this.gameState) {
        const gameStatePhase = this.mapPhaseToGameState(newPhase);
        (this.gameState as any).phase = gameStatePhase;
      }
      
      return true;
      
    } finally {
      // ✅ LIBÉRATION DU LOCK
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
   * ✅ AMÉLIORÉ: Vérifie si on est dans une phase spécifique avec protections
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
   * ✅ CORRIGÉ: Vérifie si une action peut être soumise avec protections renforcées
   */
  canSubmitAction(actionType?: string): boolean {
    // ✅ PROTECTION: Vérifications préliminaires
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
        return false; // Aucune action pendant l'initialisation
        
      case BattlePhase.INTRO:
        return false; // Aucune action pendant l'intro
        
      case BattlePhase.ACTION_SELECTION:
        return true; // Actions autorisées
        
      case BattlePhase.ACTION_RESOLUTION:
        return false; // Actions en cours de traitement
        
      case BattlePhase.POKEMON_FAINTED:
        return false; // Pokémon évanoui
        
      case BattlePhase.CAPTURE:
        return false; // Capture en cours
        
      case BattlePhase.ENDED:
        return false; // Combat terminé
        
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
   * Retour à ACTION_SELECTION après résolution
   */
  returnToActionSelection(): boolean {
    return this.setPhase(BattlePhase.ACTION_SELECTION, 'resolution_complete');
  }
  
  // === VALIDATION DES TRANSITIONS ===
  
  /**
   * ✅ CORRIGÉ: Valide qu'une transition est autorisée avec phase INITIALIZING
   */
  private validateTransition(from: BattlePhase, to: BattlePhase): PhaseValidation {
    // ✅ CORRECTION: Matrice des transitions autorisées avec INITIALIZING
    const allowedTransitions: Record<BattlePhase, BattlePhase[]> = {
      [BattlePhase.INITIALIZING]: [BattlePhase.INTRO],  // ✅ NOUVEAU
      [BattlePhase.INTRO]: [BattlePhase.ACTION_SELECTION, BattlePhase.ENDED],
      [BattlePhase.ACTION_SELECTION]: [BattlePhase.ACTION_RESOLUTION, BattlePhase.CAPTURE, BattlePhase.ENDED],
      [BattlePhase.ACTION_RESOLUTION]: [BattlePhase.POKEMON_FAINTED, BattlePhase.ACTION_SELECTION, BattlePhase.ENDED],
      [BattlePhase.POKEMON_FAINTED]: [BattlePhase.ACTION_SELECTION, BattlePhase.ENDED],
      [BattlePhase.CAPTURE]: [BattlePhase.ACTION_SELECTION, BattlePhase.ENDED],
      [BattlePhase.ENDED]: []
    };
    
    const allowed = allowedTransitions[from] || [];
    
    if (!allowed.includes(to)) {
      return {
        isValid: false,
        reason: `Transition non autorisée: ${from} → ${to}`
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
    
    const INTRO_DURATION = 3000; // 3 secondes
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
   * ✅ AMÉLIORÉ: État complet du gestionnaire de phases avec debug
   */
  getPhaseState(): any {
    return {
      currentPhase: this.currentPhase,
      phaseDuration: this.getCurrentPhaseDuration(),
      isTransitioning: this.isTransitioning,
      transitionLock: this.transitionLock,  // ✅ NOUVEAU
      initialized: this.initialized,  // ✅ NOUVEAU
      canSubmitActions: this.canSubmitAction(),
      transitionCount: this.phaseHistory.length,
      gameStatePhase: this.gameState?.phase || 'unknown',
      lastTransition: this.phaseHistory.length > 0 ? 
        this.phaseHistory[this.phaseHistory.length - 1] : null
    };
  }
  
  /**
   * Historique des transitions
   */
  getPhaseHistory(): PhaseTransition[] {
    return [...this.phaseHistory];
  }
  
  /**
   * ✅ AMÉLIORÉ: Statistiques des phases avec informations de debug
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
      version: 'phase_system_v2_race_condition_fixed',
      currentPhase: this.currentPhase,
      initialized: this.initialized,
      totalTransitions: this.phaseHistory.length,
      phaseCount,
      averagePhaseTime: phaseTime,
      features: [
        'six_phase_system_with_initializing',
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
        'enhanced_debugging'
      ]
    };
  }
  
  // === UTILITAIRES ===
  
  /**
   * ✅ CORRIGÉ: Mappe les phases internes vers l'état du jeu avec INITIALIZING
   */
  private mapPhaseToGameState(phase: BattlePhase): 'waiting' | 'battle' | 'ended' | 'fled' {
    switch (phase) {
      case BattlePhase.INITIALIZING:
        return 'waiting';  // ✅ NOUVEAU
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
   * ✅ CORRIGÉ: Reset pour nouveau combat avec remise à zéro complète
   */
  reset(): void {
    // ✅ RESET COMPLET avec nouveaux champs
    this.currentPhase = BattlePhase.INITIALIZING;
    this.gameState = null;
    this.phaseHistory = [];
    this.phaseStartTime = 0;
    this.isTransitioning = false;
    this.initialized = false;
    this.transitionLock = false;
    
    console.log('🔄 [PhaseManager] Reset effectué - retour à INITIALIZING');
  }
  
  /**
   * ✅ AMÉLIORÉ: Vérifie si le gestionnaire est prêt avec plus de validations
   */
  isReady(): boolean {
    return this.initialized && 
           this.gameState !== null && 
           this.currentPhase !== BattlePhase.INITIALIZING &&
           !this.transitionLock;
  }
  
  // === MÉTHODES DE DEBUG ===
  
  /**
   * ✅ NOUVEAU: Debug pour identifier les race conditions
   */
  debugTransitionState(): void {
    console.log('🔍 [PhaseManager] DEBUG STATE:');
    console.log(`  - currentPhase: ${this.currentPhase}`);
    console.log(`  - initialized: ${this.initialized}`);
    console.log(`  - isTransitioning: ${this.isTransitioning}`);
    console.log(`  - transitionLock: ${this.transitionLock}`);
    console.log(`  - canSubmitAction: ${this.canSubmitAction()}`);
    console.log(`  - lastTransition: ${this.phaseHistory.length > 0 ? 
      this.phaseHistory[this.phaseHistory.length - 1].trigger : 'none'}`);
  }
  
  /**
   * ✅ NOUVEAU: Force une transition en mode debug (usage interne uniquement)
   */
  forceTransition(to: BattlePhase, reason: string = 'debug_force'): boolean {
    console.warn(`⚠️ [PhaseManager] FORCE TRANSITION: ${this.currentPhase} → ${to} (${reason})`);
    
    // Libérer tous les locks
    this.transitionLock = false;
    this.isTransitioning = false;
    
    // Effectuer la transition forcée
    return this.setPhase(to, `force_${reason}`);
  }
}

export default PhaseManager;
