// server/src/battle/modules/PhaseManager.ts
// SYSTÈME DE PHASES POKÉMON AUTHENTIQUE AVEC PROTECTION CAPTURE

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
 * PHASE MANAGER - Gestionnaire de phases authentique Pokémon AVEC PROTECTION CAPTURE
 * 
 * Responsabilités :
 * - Gérer les 5 phases distinctes
 * - Valider les transitions
 * - Contrôler les actions autorisées
 * - Historique des transitions
 * - Timings de phases
 * - ✅ NOUVEAU : Protection anti-exploit pendant capture
 */
export class PhaseManager {
  
  private currentPhase: BattlePhase = BattlePhase.INTRO;
  private gameState: BattleGameState | null = null;
  private phaseHistory: PhaseTransition[] = [];
  private phaseStartTime: number = 0;
  private isTransitioning: boolean = false;
  
  // ✅ NOUVEAU : Timestamps pour protection capture
  private captureStartTime: number | null = null;
  private captureExpectedDuration: number | null = null;
  
  constructor() {
    console.log('🎭 [PhaseManager] Initialisé avec 5 phases + protection capture');
  }
  
  // === GESTION DES PHASES ===
  
  /**
   * Change la phase actuelle
   */
  setPhase(newPhase: BattlePhase, trigger?: string): void {
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
  
  // === ✅ VALIDATION DES ACTIONS AVEC PROTECTION CAPTURE ===
  
  /**
   * Vérifie si une action peut être soumise
   */
  canSubmitAction(action: BattleAction): { allowed: boolean; reason?: string } {
    const currentPhase = this.getCurrentPhase();
    
    console.log(`🔍 [PhaseManager] Vérification action ${action.type} en phase ${currentPhase}`);
    
    // ✅ PROTECTION CAPTURE STRICTE
    if (currentPhase === 'capture') {
      const captureStatus = this.getCaptureStatus();
      
      console.log(`🎯 [PhaseManager] Action bloquée en phase capture:`, captureStatus);
      
      return {
        allowed: false,
        reason: `Action impossible pendant la capture (${captureStatus.timeRemaining}ms restantes)`
      };
    }
    
    // ✅ PROTECTION TRANSITION DE CAPTURE
    if (this.isTransitioningFromCapture()) {
      console.log(`🎯 [PhaseManager] Action bloquée pendant transition post-capture`);
      
      return {
        allowed: false,
        reason: 'Transition en cours après capture'
      };
    }
    
    // Validation standard par phase
    switch (currentPhase) {
      case 'waiting':
        return {
          allowed: false,
          reason: 'Combat pas encore commencé'
        };
        
      case 'intro':
        return {
          allowed: false,
          reason: 'Phase d\'introduction en cours'
        };
        
      case 'action_selection':
        // ✅ SEULE PHASE QUI AUTORISE LES ACTIONS
        if (action.type === 'move' || action.type === 'capture' || action.type === 'item' || action.type === 'run') {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: `Action ${action.type} non autorisée en sélection d'action`
        };
        
      case 'action_resolution':
        return {
          allowed: false,
          reason: 'Résolution des actions en cours'
        };
        
      case 'ended':
        return {
          allowed: false,
          reason: 'Combat terminé'
        };
        
      default:
        return {
          allowed: false,
          reason: `Phase ${currentPhase} non reconnue`
        };
    }
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
   * Vérifie si une phase peut être atteinte depuis la phase actuelle
   */
  canTransitionTo(targetPhase: BattlePhase): boolean {
    const currentPhase = this.getCurrentPhase();
    
    // ✅ CAPTURE NE PEUT PAS ÊTRE INTERROMPUE
    if (currentPhase === 'capture' && targetPhase !== 'ended') {
      const captureStatus = this.getCaptureStatus();
      console.log(`🎯 [PhaseManager] Transition ${currentPhase} → ${targetPhase} REFUSÉE (capture ${captureStatus.timeRemaining}ms)`);
      return false;
    }
    
    // Transitions autorisées
    const allowedTransitions: Record<BattlePhase, BattlePhase[]> = {
      'waiting': ['intro', 'ended'],
      'intro': ['action_selection', 'ended'],
      'action_selection': ['action_resolution', 'capture', 'ended'],
      'action_resolution': ['action_selection', 'ended'],
      'capture': ['action_selection', 'ended'], // ✅ Seulement après timing
      'ended': [] // Phase finale
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
  
  // === DIAGNOSTICS ===
  
  /**
   * Obtient un diagnostic complet du PhaseManager
   */
  getDiagnostics(): any {
    const captureStatus = this.getCaptureStatus();
    
    return {
      version: 'phase_manager_capture_lock_v1',
      currentPhase: this.getCurrentPhase(),
      previousPhase: this.getPreviousPhase(),
      canPlayerAct: this.canPlayerAct(),
      isActive: this.isActive(),
      isEnded: this.isEnded(),
      isWaitingForActions: this.isWaitingForActions(),
      captureStatus: captureStatus,
      captureProtection: {
        isInCapture: this.gameState.phase === 'capture',
        isTransitioning: this.isTransitioningFromCapture(),
        startTime: this.captureStartTime,
        expectedDuration: this.captureExpectedDuration
      },
      allowedTransitions: this.getAllowedTransitions(),
      features: [
        'capture_phase_locking',
        'transition_protection',
        'action_validation',
        'timing_synchronization',
        'exploit_prevention'
      ]
    };
  }
  
  /**
   * Obtient les transitions autorisées depuis la phase actuelle
   */
  private getAllowedTransitions(): BattlePhase[] {
    const currentPhase = this.getCurrentPhase();
    
    const allowedTransitions: Record<BattlePhase, BattlePhase[]> = {
      'waiting': ['intro', 'ended'],
      'intro': ['action_selection', 'ended'],
      'action_selection': ['action_resolution', 'capture', 'ended'],
      'action_resolution': ['action_selection', 'ended'],
      'capture': ['action_selection', 'ended'],
      'ended': []
    };
    
    return allowedTransitions[currentPhase] || [];
  }
  
  /**
   * Reset pour un nouveau combat
   */
  reset(): void {
    this.previousPhase = null;
    this.captureStartTime = null;
    this.captureExpectedDuration = null;
    this.gameState.phase = 'waiting';
    
    console.log('🔄 [PhaseManager] Reset effectué');
  }
  
  // === MÉTHODES DE SÉCURITÉ ===
  
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
