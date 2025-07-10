// server/src/battle/modules/PhaseManager.ts
// SYSTÈME DE PHASES POKÉMON AUTHENTIQUE AVEC PROTECTION CAPTURE - COMPATIBLE BATTLEENGINE

import { BattleGameState, BattleAction, BattlePhase } from '../types/BattleTypes';
import { EventEmitter } from 'events';

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
 * PHASE MANAGER - Gestionnaire de phases authentique Pokémon AVEC PROTECTION CAPTURE
 * 
 * Responsabilités :
 * - Gérer les phases distinctes
 * - Valider les transitions
 * - Contrôler les actions autorisées
 * - Historique des transitions
 * - Timings de phases
 * - ✅ NOUVEAU : Protection anti-exploit pendant capture
 */
export class PhaseManager extends EventEmitter {
  
  private gameState: BattleGameState;
  private previousPhase: BattlePhase | null = null;
  private phaseHistory: PhaseTransition[] = [];
  private phaseStartTime: number = 0;
  private isTransitioning: boolean = false;
  
  // ✅ NOUVEAU : Timestamps pour protection capture
  private captureStartTime: number | null = null;
  private captureExpectedDuration: number | null = null;
  
  constructor(gameState: BattleGameState) {
    super();
    this.gameState = gameState;
    console.log('🎭 [PhaseManager] Initialisé avec protection capture');
  }
  
  // === INITIALISATION ===
  
  /**
   * Initialise avec l'état du jeu
   */
  initialize(gameState: BattleGameState): void {
    this.gameState = gameState;
    this.phaseStartTime = Date.now();
    this.phaseHistory = [];
    this.isTransitioning = false;
    
    // ✅ NOUVEAU : Reset capture
    this.captureStartTime = null;
    this.captureExpectedDuration = null;
    
    console.log('✅ [PhaseManager] Configuré pour combat avec phases + protection capture');
  }
  
  // === GESTION DES PHASES ===
  
  /**
   * Change de phase avec validation ✅ AVEC PROTECTION CAPTURE
   */
  setPhase(newPhase: BattlePhase, trigger: string = 'manual', data?: any): void {
    if (this.isTransitioning) {
      console.log(`⏳ [PhaseManager] Transition en cours, changement refusé: ${newPhase}`);
      return;
    }
    
    const oldPhase = this.gameState.phase;
    
    // ✅ NOUVEAU : Gestion spéciale phase CAPTURE
    if (newPhase === 'capture') {
      this.captureStartTime = Date.now();
      console.log(`🎯 [PhaseManager] DÉBUT PHASE CAPTURE - Timestamp: ${this.captureStartTime}`);
    }
    
    if (oldPhase === 'capture') {
      this.captureStartTime = null;
      this.captureExpectedDuration = null;
      console.log(`🎯 [PhaseManager] FIN PHASE CAPTURE`);
    }
    
    this.previousPhase = oldPhase;
    this.gameState.phase = newPhase;
    
    console.log(`🎭 [PhaseManager] ${oldPhase} → ${newPhase} ${trigger ? `(${trigger})` : ''}`);
    
    // Émettre l'événement de changement
    this.emit('phaseChanged', {
      phase: newPhase,
      previousPhase: oldPhase,
      trigger: trigger || 'manual',
      canAct: this.canPlayerAct(),
      timestamp: Date.now()
    });
  }
  
  /**
   * ✅ NOUVEAU : Définit la durée attendue de la capture
   */
  setCaptureExpectedDuration(durationMs: number): void {
    if (this.gameState.phase === 'capture') {
      this.captureExpectedDuration = durationMs;
      console.log(`⏰ [PhaseManager] Durée capture attendue: ${durationMs}ms`);
    }
  }
  
  /**
   * Obtient la phase actuelle
   */
  getCurrentPhase(): BattlePhase {
    return this.gameState.phase;
  }
  
  /**
   * Obtient la phase précédente
   */
  getPreviousPhase(): BattlePhase | null {
    return this.previousPhase;
  }
  
  /**
   * Vérifie si on est dans une phase spécifique
   */
  isInPhase(phase: BattlePhase): boolean {
    return this.gameState.phase === phase && !this.isTransitioning;
  }
  
  /**
   * Durée de la phase actuelle en millisecondes
   */
  getCurrentPhaseDuration(): number {
    return Date.now() - this.phaseStartTime;
  }
  
  // === VALIDATION DES ACTIONS AVEC PROTECTION CAPTURE ===
  
  /**
   * Vérifie si une action peut être soumise ✅ AVEC PROTECTION CAPTURE
   */
  canSubmitAction(action?: BattleAction): boolean {
    const currentPhase = this.getCurrentPhase();
    
    // ✅ PROTECTION CAPTURE STRICTE
    if (currentPhase === 'capture') {
      const captureStatus = this.getCaptureStatus();
      console.log(`🎯 [PhaseManager] Action bloquée en phase capture:`, captureStatus);
      return false;
    }
    
    // ✅ PROTECTION TRANSITION DE CAPTURE
    if (this.isTransitioningFromCapture()) {
      console.log(`🎯 [PhaseManager] Action bloquée pendant transition post-capture`);
      return false;
    }
    
    // Logique standard par phase
    switch (currentPhase) {
      case 'waiting':
        return false;
      case 'intro':
        return false;
      case 'action_selection':
        return !this.isTransitioning;
      case 'action_resolution':
        return false;
      case 'capture':
        return false;
      case 'ended':
        return false;
      case 'fled':
        return false;
      default:
        return false;
    }
  }
  
  /**
   * Valide qu'une action est appropriée pour la phase ✅ AVEC PROTECTION CAPTURE
   */
  validateAction(action: BattleAction): PhaseValidation {
    const currentPhase = this.getCurrentPhase();
    
    // ✅ PROTECTION CAPTURE STRICTE
    if (currentPhase === 'capture') {
      const captureStatus = this.getCaptureStatus();
      return {
        isValid: false,
        reason: `Action impossible pendant la capture (${captureStatus.timeRemaining}ms restantes)`
      };
    }
    
    // ✅ PROTECTION TRANSITION DE CAPTURE
    if (this.isTransitioningFromCapture()) {
      return {
        isValid: false,
        reason: 'Transition en cours après capture'
      };
    }
    
    // Logique standard
    if (!this.canSubmitAction(action)) {
      return {
        isValid: false,
        reason: `Actions non autorisées en phase ${currentPhase}`
      };
    }
    
    switch (currentPhase) {
      case 'action_selection':
        return this.validateActionSelection(action);
      default:
        return {
          isValid: false,
          reason: `Phase ${currentPhase} ne gère pas les actions`
        };
    }
  }
  
  /**
   * Validation spécifique phase ACTION_SELECTION
   */
  private validateActionSelection(action: BattleAction): PhaseValidation {
    const allowedActions = ['move', 'capture', 'item', 'run', 'switch'];
    
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
  
  /**
   * ✅ NOUVEAU : Vérifie si le joueur peut agir
   */
  canPlayerAct(): boolean {
    const currentPhase = this.getCurrentPhase();
    
    // ✅ CAPTURE = INTERDIT
    if (currentPhase === 'capture') {
      return false;
    }
    
    // ✅ TRANSITION POST-CAPTURE = INTERDIT
    if (this.isTransitioningFromCapture()) {
      return false;
    }
    
    // Standard
    return currentPhase === 'action_selection';
  }
  
  // === TRANSITIONS SPÉCIALES ===
  
  /**
   * Transition automatique vers ACTION_SELECTION
   */
  transitionToActionSelection(): boolean {
    this.setPhase('action_selection', 'auto_intro_end');
    return true;
  }
  
  /**
   * Transition vers RESOLUTION quand toutes les actions sont prêtes
   */
  transitionToResolution(actionsReady: boolean): boolean {
    if (!actionsReady) {
      console.log(`⏳ [PhaseManager] Attente des actions pour résolution`);
      return false;
    }
    
    this.setPhase('action_resolution', 'actions_ready');
    return true;
  }
  
  /**
   * Transition vers CAPTURE
   */
  transitionToCapture(): boolean {
    this.setPhase('capture', 'capture_attempt');
    return true;
  }
  
  /**
   * Transition vers ENDED
   */
  transitionToEnded(reason: string): boolean {
    this.setPhase('ended', reason);
    return true;
  }
  
  /**
   * Retour à ACTION_SELECTION après résolution
   */
  returnToActionSelection(): boolean {
    this.setPhase('action_selection', 'resolution_complete');
    return true;
  }
  
  // === ✅ NOUVEAUX UTILITAIRES CAPTURE ===
  
  /**
   * Vérifie si on est en transition depuis la capture
   */
  private isTransitioningFromCapture(): boolean {
    // Si on vient de sortir de capture il y a moins de 1 seconde
    if (this.previousPhase === 'capture' && this.captureStartTime) {
      const timeSinceCapture = Date.now() - this.captureStartTime;
      return timeSinceCapture < 1000; // 1 seconde de grâce
    }
    return false;
  }
  
  /**
   * Obtient le statut de la capture en cours
   */
  getCaptureStatus(): {
    isActive: boolean;
    timeElapsed: number;
    timeRemaining: number;
    expectedDuration: number;
  } {
    if (this.gameState.phase !== 'capture' || !this.captureStartTime) {
      return {
        isActive: false,
        timeElapsed: 0,
        timeRemaining: 0,
        expectedDuration: 0
      };
    }
    
    const timeElapsed = Date.now() - this.captureStartTime;
    const expectedDuration = this.captureExpectedDuration || 8000; // 8s par défaut
    const timeRemaining = Math.max(0, expectedDuration - timeElapsed);
    
    return {
      isActive: true,
      timeElapsed,
      timeRemaining,
      expectedDuration
    };
  }
  
  /**
   * Force la fin de la phase capture (pour sécurité)
   */
  forceCaptureEnd(): void {
    if (this.gameState.phase === 'capture') {
      console.log(`🚨 [PhaseManager] FORCE FIN CAPTURE`);
      this.setPhase('action_selection', 'force_capture_end');
    }
  }
  
  // === VALIDATION AVANCÉE ===
  
  /**
   * Vérifie si une phase peut être atteinte depuis la phase actuelle ✅ AVEC PROTECTION CAPTURE
   */
  canTransitionTo(targetPhase: BattlePhase): boolean {
    const currentPhase = this.getCurrentPhase();
    
    // ✅ CAPTURE NE PEUT PAS ÊTRE INTERROMPUE
    if (currentPhase === 'capture' && targetPhase !== 'ended') {
      const captureStatus = this.getCaptureStatus();
      if (captureStatus.isActive && captureStatus.timeRemaining > 0) {
        console.log(`🎯 [PhaseManager] Transition ${currentPhase} → ${targetPhase} REFUSÉE (capture ${captureStatus.timeRemaining}ms)`);
        return false;
      }
    }
    
    // Transitions autorisées standard
    const allowedTransitions: Record<BattlePhase, BattlePhase[]> = {
      'waiting': ['intro', 'ended'],
      'intro': ['action_selection', 'ended'],
      'action_selection': ['action_resolution', 'capture', 'ended'],
      'action_resolution': ['action_selection', 'ended'],
      'capture': ['action_selection', 'ended'],
      'ended': [],
      'fled': []
    };
    
    const allowed = allowedTransitions[currentPhase]?.includes(targetPhase) || false;
    
    if (!allowed) {
      console.log(`🚫 [PhaseManager] Transition ${currentPhase} → ${targetPhase} interdite`);
    }
    
    return allowed;
  }
  
  /**
   * Transition sécurisée vers une nouvelle phase
   */
  transitionTo(targetPhase: BattlePhase, trigger?: string): boolean {
    if (!this.canTransitionTo(targetPhase)) {
      console.warn(`⚠️ [PhaseManager] Transition vers ${targetPhase} refusée`);
      return false;
    }
    
    this.setPhase(targetPhase, trigger);
    return true;
  }
  
  // === LOGIQUES SPÉCIALES ===
  
  /**
   * Vérifie si la phase INTRO devrait se terminer automatiquement
   */
  shouldAutoEndIntro(): boolean {
    if (this.gameState.phase !== 'intro') return false;
    
    const INTRO_DURATION = 3000; // 3 secondes
    return this.getCurrentPhaseDuration() >= INTRO_DURATION;
  }
  
  /**
   * Détermine la prochaine phase après résolution
   */
  getNextPhaseAfterResolution(battleEnded: boolean): BattlePhase {
    if (battleEnded) {
      return 'ended';
    }
    return 'action_selection';
  }
  
  // === CYCLE DE VIE ===
  
  /**
   * Vérifie si le combat est dans une phase active
   */
  isActive(): boolean {
    return this.gameState.phase !== 'waiting' && this.gameState.phase !== 'ended';
  }
  
  /**
   * Vérifie si le combat est terminé
   */
  isEnded(): boolean {
    return this.gameState.phase === 'ended';
  }
  
  /**
   * Vérifie si le combat attend des actions
   */
  isWaitingForActions(): boolean {
    return this.gameState.phase === 'action_selection' && this.canPlayerAct();
  }
  
  // === INFORMATIONS ===
  
  /**
   * État complet du gestionnaire de phases ✅ AVEC INFOS CAPTURE
   */
  getPhaseState(): any {
    const captureStatus = this.getCaptureStatus();
    
    return {
      currentPhase: this.gameState.phase,
      phaseDuration: this.getCurrentPhaseDuration(),
      isTransitioning: this.isTransitioning,
      canSubmitActions: this.canSubmitAction(),
      canPlayerAct: this.canPlayerAct(),
      transitionCount: this.phaseHistory.length,
      gameStatePhase: this.gameState.phase,
      // ✅ NOUVEAU : Infos capture
      captureStatus: captureStatus,
      captureProtection: {
        isInCapture: this.gameState.phase === 'capture',
        isTransitioning: this.isTransitioningFromCapture(),
        startTime: this.captureStartTime,
        expectedDuration: this.captureExpectedDuration
      }
    };
  }
  
  /**
   * Historique des transitions
   */
  getPhaseHistory(): PhaseTransition[] {
    return [...this.phaseHistory];
  }
  
  /**
   * Statistiques des phases ✅ AVEC PROTECTION CAPTURE
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
      version: 'phase_system_capture_protection_v1',
      currentPhase: this.gameState.phase,
      totalTransitions: this.phaseHistory.length,
      phaseCount,
      averagePhaseTime: phaseTime,
      captureProtection: this.getCaptureStatus(),
      features: [
        'battleengine_compatible',
        'transition_validation',
        'action_validation',
        'automatic_transitions',
        'phase_history',
        'capture_phase_locking',      // ✅ NOUVEAU
        'timing_synchronization',     // ✅ NOUVEAU
        'exploit_prevention'          // ✅ NOUVEAU
      ]
    };
  }
  
  // === UTILITAIRES ===
  
  /**
   * Reset pour nouveau combat ✅ AVEC NETTOYAGE CAPTURE
   */
  reset(): void {
    this.previousPhase = null;
    this.phaseHistory = [];
    this.phaseStartTime = 0;
    this.isTransitioning = false;
    
    // ✅ NOUVEAU : Nettoyage capture
    this.captureStartTime = null;
    this.captureExpectedDuration = null;
    
    if (this.gameState) {
      this.gameState.phase = 'waiting';
    }
    
    console.log('🔄 [PhaseManager] Reset effectué avec nettoyage capture');
  }
  
  /**
   * Vérifie si le gestionnaire est prêt
   */
  isReady(): boolean {
    return this.gameState !== null;
  }
  
  /**
   * Vérifie l'intégrité des phases
   */
  validatePhaseIntegrity(): boolean {
    const currentPhase = this.getCurrentPhase();
    
    // ✅ Vérification capture
    if (currentPhase === 'capture') {
      if (!this.captureStartTime) {
        console.error('❌ [PhaseManager] Phase capture sans timestamp !');
        return false;
      }
      
      const captureStatus = this.getCaptureStatus();
      if (captureStatus.timeElapsed > 15000) { // 15s max
        console.error('❌ [PhaseManager] Phase capture trop longue !');
        this.forceCaptureEnd();
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Nettoie les états obsolètes
   */
  cleanup(): void {
    // Nettoyer les timestamps anciens
    if (this.captureStartTime && Date.now() - this.captureStartTime > 30000) {
      console.log('🧹 [PhaseManager] Nettoyage timestamp capture obsolète');
      this.captureStartTime = null;
      this.captureExpectedDuration = null;
    }
  }
}

export default PhaseManager;
