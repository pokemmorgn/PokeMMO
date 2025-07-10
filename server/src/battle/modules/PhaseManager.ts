// server/src/battle/modules/PhaseManager.ts
// SYSTÈME DE PHASES POKÉMON AUTHENTIQUE

import { BattleGameState, BattleAction, PlayerRole } from '../types/BattleTypes';

// === ÉNUMÉRATION DES PHASES ===

export enum BattlePhase {
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
 * Responsabilités :
 * - Gérer les 5 phases distinctes
 * - Valider les transitions
 * - Contrôler les actions autorisées
 * - Historique des transitions
 * - Timings de phases
 */
export class PhaseManager {
  
  private currentPhase: BattlePhase = BattlePhase.INTRO;
  private gameState: BattleGameState | null = null;
  private phaseHistory: PhaseTransition[] = [];
  private phaseStartTime: number = 0;
  private isTransitioning: boolean = false;
  
  constructor() {
    console.log('🎭 [PhaseManager] Initialisé avec 5 phases');
  }
  
  // === INITIALISATION ===
  
  /**
   * Initialise avec l'état du jeu
   */
  initialize(gameState: BattleGameState): void {
    this.gameState = gameState;
    this.currentPhase = BattlePhase.INTRO;
    this.phaseStartTime = Date.now();
    this.phaseHistory = [];
    this.isTransitioning = false;
    
    console.log('✅ [PhaseManager] Configuré pour combat avec phases');
  }
  
  // === GESTION DES PHASES ===
  
  /**
   * Change de phase avec validation
   */
  setPhase(newPhase: BattlePhase, trigger: string = 'manual', data?: any): boolean {
    if (this.isTransitioning) {
      console.log(`⏳ [PhaseManager] Transition en cours, changement refusé: ${newPhase}`);
      return false;
    }
    
    const validation = this.validateTransition(this.currentPhase, newPhase);
    if (!validation.isValid) {
      console.log(`❌ [PhaseManager] Transition invalide: ${this.currentPhase} → ${newPhase} (${validation.reason})`);
      return false;
    }
    
    this.isTransitioning = true;
    
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
    this.isTransitioning = false;
    
    // Mettre à jour l'état du jeu avec le bon type
    if (this.gameState) {
      const gameStatePhase = this.mapPhaseToGameState(newPhase);
      (this.gameState as any).phase = gameStatePhase;
    }
    
    return true;
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
    return this.currentPhase === phase && !this.isTransitioning;
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
    switch (this.currentPhase) {
      case BattlePhase.INTRO:
        return false; // Aucune action pendant l'intro
        
      case BattlePhase.ACTION_SELECTION:
        return !this.isTransitioning; // Actions autorisées
        
      case BattlePhase.ACTION_RESOLUTION:
        return false; // Actions en cours de traitement
        
      case BattlePhase.CAPTURE:
        return false; // Capture en cours
        
      case BattlePhase.ENDED:
        return false; // Combat terminé
        
      default:
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
   * Valide qu'une transition est autorisée
   */
  private validateTransition(from: BattlePhase, to: BattlePhase): PhaseValidation {
    // Matrice des transitions autorisées
const allowedTransitions: Record<BattlePhase, BattlePhase[]> = {
  [BattlePhase.INTRO]: [BattlePhase.ACTION_SELECTION, BattlePhase.ENDED],
  [BattlePhase.ACTION_SELECTION]: [BattlePhase.ACTION_RESOLUTION, BattlePhase.CAPTURE, BattlePhase.ENDED],
  [BattlePhase.ACTION_RESOLUTION]: [BattlePhase.POKEMON_FAINTED, BattlePhase.ACTION_SELECTION, BattlePhase.ENDED], // 🆕
  [BattlePhase.POKEMON_FAINTED]: [BattlePhase.ACTION_SELECTION, BattlePhase.ENDED], // 🆕 Nouvelle phase
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
   * État complet du gestionnaire de phases
   */
  getPhaseState(): any {
    return {
      currentPhase: this.currentPhase,
      phaseDuration: this.getCurrentPhaseDuration(),
      isTransitioning: this.isTransitioning,
      canSubmitActions: this.canSubmitAction(),
      transitionCount: this.phaseHistory.length,
      gameStatePhase: this.gameState?.phase || 'unknown'
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
      version: 'phase_system_v1',
      currentPhase: this.currentPhase,
      totalTransitions: this.phaseHistory.length,
      phaseCount,
      averagePhaseTime: phaseTime,
      features: [
        'five_phase_system',
        'transition_validation',
        'action_validation',
        'automatic_transitions',
        'phase_history'
      ]
    };
  }
  
  // === UTILITAIRES ===
  
  /**
   * Mappe les phases internes vers l'état du jeu
   */
  private mapPhaseToGameState(phase: BattlePhase): 'waiting' | 'battle' | 'ended' | 'fled' {
    switch (phase) {
      case BattlePhase.INTRO:
      case BattlePhase.ACTION_SELECTION:
      case BattlePhase.ACTION_RESOLUTION:
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
    this.currentPhase = BattlePhase.INTRO;
    this.gameState = null;
    this.phaseHistory = [];
    this.phaseStartTime = 0;
    this.isTransitioning = false;
    
    console.log('🔄 [PhaseManager] Reset effectué');
  }
  
  /**
   * Vérifie si le gestionnaire est prêt
   */
  isReady(): boolean {
    return this.gameState !== null;
  }
}

export default PhaseManager;
