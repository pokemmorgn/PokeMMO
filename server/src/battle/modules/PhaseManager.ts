// server/src/battle/modules/PhaseManager.ts
// 🎭 EXTENSION PHASEMANAGER POUR COMBATS DRESSEURS - COMPATIBLE SYSTÈME EXISTANT

import { BattleGameState, BattleAction, PlayerRole } from '../types/BattleTypes';
import { TrainerBattlePhase } from '../types/TrainerBattleTypes';

// === ÉNUMÉRATION DES PHASES ÉTENDUES ===

export enum BattlePhase {
  // 🔥 PHASES EXISTANTES (INCHANGÉES)
  INITIALIZING = 'initializing',
  INTRO = 'intro',
  ACTION_SELECTION = 'action_selection',
  ACTION_RESOLUTION = 'action_resolution', 
  POKEMON_FAINTED = 'pokemon_fainted',
  CAPTURE = 'capture',
  ENDED = 'ended',
  
  // 🆕 NOUVELLES PHASES DRESSEURS
  POKEMON_SELECTION = 'pokemon_selection',    // Choix Pokémon initial
  SWITCH_PHASE = 'switch_phase',             // Phase de changement
  FORCED_SWITCH = 'forced_switch'            // Changement forcé après KO
}

// === INTERFACES ÉTENDUES ===

export interface PhaseTransition {
  from: BattlePhase;
  to: BattlePhase;
  timestamp: number;
  trigger: string;
  data?: any;
  battleType?: 'wild' | 'trainer' | 'pvp'; // 🆕 Contexte type de combat
}

export interface PhaseValidation {
  isValid: boolean;
  reason?: string;
  allowedActions?: string[];
  battleTypeRestrictions?: string[]; // 🆕 Restrictions par type
}

export interface SwitchPhaseData {
  playerRole: PlayerRole;
  availablePokemon: number[];
  isForced: boolean;
  timeLimit?: number;
  reason?: string;
}

/**
 * PHASE MANAGER ÉTENDU - Support complet combats dresseurs
 * 
 * 🔥 EXTENSIONS AJOUTÉES :
 * - 3 nouvelles phases pour changements Pokémon
 * - Validation spécifique par type de combat
 * - Gestion des timeouts de changement forcé
 * - Compatibilité totale avec système existant
 */
export class PhaseManager {
  
  private currentPhase: BattlePhase = BattlePhase.INITIALIZING;
  private gameState: BattleGameState | null = null;
  private phaseHistory: PhaseTransition[] = [];
  private phaseStartTime: number = 0;
  private isTransitioning: boolean = false;
  private initialized: boolean = false;
  private transitionLock: boolean = false;
  
  // 🆕 NOUVEAUX ÉTAT POUR DRESSEURS
  private battleType: 'wild' | 'trainer' | 'pvp' = 'wild';
  private switchPhaseData: SwitchPhaseData | null = null;
  private forcedSwitchTimeouts: Map<PlayerRole, NodeJS.Timeout> = new Map();
  
  constructor() {
    console.log('🎭 [PhaseManager] Initialisé avec support dresseurs étendu');
    console.log(`🎭 [PhaseManager] Constructor - Phase initiale: ${this.currentPhase}`);
  }
  
  // === INITIALISATION ÉTENDUE ===
  
  initialize(gameState: BattleGameState): void {
    if (this.initialized) {
      console.log('⚠️ [PhaseManager] Déjà initialisé, ignore la re-initialisation');
      return;
    }

    console.log(`🎭 [PhaseManager] Initialize START - Phase actuelle: ${this.currentPhase}`);
    
    this.gameState = gameState;
    this.battleType = gameState.type; // 🆕 Détecter type de combat
    this.phaseStartTime = Date.now();
    this.phaseHistory = [];
    this.isTransitioning = false;
    this.transitionLock = false;
    this.switchPhaseData = null;
    
    this.currentPhase = BattlePhase.INTRO;
    this.initialized = true;
    
    console.log(`🎭 [PhaseManager] Initialize END - Phase: ${this.currentPhase}, Type: ${this.battleType}`);
    console.log('✅ [PhaseManager] Configuré avec support phases dresseurs');
  }
  
  // === GESTION DES PHASES ÉTENDUES ===
  
  /**
   * Change de phase avec validation étendue pour dresseurs
   */
  setPhase(newPhase: BattlePhase, trigger: string = 'manual', data?: any): boolean {
    if (!this.initialized && newPhase !== BattlePhase.INTRO) {
      console.error(`❌ [PhaseManager] Tentative transition avant initialisation: ${this.currentPhase} → ${newPhase}`);
      return false;
    }

    if (this.transitionLock) {
      console.log(`🔒 [PhaseManager] Transition bloquée par lock: ${this.currentPhase} → ${newPhase}`);
      return false;
    }

    if (this.isTransitioning) {
      console.log(`⏳ [PhaseManager] Transition en cours, changement refusé: ${newPhase}`);
      return false;
    }

    console.log(`🎭 [PhaseManager] Transition REQUEST: ${this.currentPhase} → ${newPhase} (${trigger}) [${this.battleType}]`);
    
    // 🆕 VALIDATION ÉTENDUE avec type de combat
    const validation = this.validateTransitionExtended(this.currentPhase, newPhase, trigger);
    if (!validation.isValid) {
      console.error(`❌ [PhaseManager] Transition invalide: ${this.currentPhase} → ${newPhase} (${validation.reason})`);
      return false;
    }
    
    this.transitionLock = true;
    this.isTransitioning = true;
    
    try {
      const transition: PhaseTransition = {
        from: this.currentPhase,
        to: newPhase,
        timestamp: Date.now(),
        trigger,
        data,
        battleType: this.battleType // 🆕 Contexte sauvegardé
      };
      
      this.phaseHistory.push(transition);
      
      console.log(`🎭 [PhaseManager] Transition ACCEPTÉE: ${this.currentPhase} → ${newPhase} (${trigger})`);
      
      // 🆕 NETTOYAGE PHASE PRÉCÉDENTE
      this.cleanupPreviousPhase(this.currentPhase);
      
      this.currentPhase = newPhase;
      this.phaseStartTime = Date.now();
      
      // 🆕 INITIALISATION NOUVELLE PHASE
      this.initializeNewPhase(newPhase, data);
      
      if (this.gameState) {
        const gameStatePhase = this.mapPhaseToGameState(newPhase);
        (this.gameState as any).phase = gameStatePhase;
      }
      
      return true;
      
    } finally {
      this.isTransitioning = false;
      this.transitionLock = false;
    }
  }
  
  /**
   * 🆕 NOUVELLES TRANSITIONS SPÉCIFIQUES DRESSEURS
   */
  
  /**
   * Transition vers phase de changement Pokémon
   */
  transitionToSwitchPhase(
    playerRole: PlayerRole,
    availablePokemon: number[],
    isForced: boolean,
    reason: string = 'player_choice',
    timeLimit?: number
  ): boolean {
    
    console.log(`🔄 [PhaseManager] Transition vers SWITCH_PHASE pour ${playerRole} (${isForced ? 'forcé' : 'volontaire'})`);
    
    const switchData: SwitchPhaseData = {
      playerRole,
      availablePokemon,
      isForced,
      timeLimit,
      reason
    };
    
    const phase = isForced ? BattlePhase.FORCED_SWITCH : BattlePhase.SWITCH_PHASE;
    return this.setPhase(phase, `switch_${reason}`, switchData);
  }
  
  /**
   * Transition vers sélection Pokémon initial (dresseurs)
   */
  transitionToPokemonSelection(): boolean {
    if (this.battleType !== 'trainer') {
      console.log(`⚠️ [PhaseManager] POKEMON_SELECTION seulement pour combats dresseurs`);
      return false;
    }
    
    return this.setPhase(BattlePhase.POKEMON_SELECTION, 'trainer_battle_start');
  }
  
  /**
   * Force une transition en mode debug (🔥 CONSERVÉ)
   */
  forceTransition(to: BattlePhase, reason: string = 'debug_force'): boolean {
    console.warn(`⚠️ [PhaseManager] FORCE TRANSITION: ${this.currentPhase} → ${to} (${reason})`);
    
    // Libérer tous les locks
    this.transitionLock = false;
    this.isTransitioning = false;
    
    // Effectuer la transition forcée en contournant les validations
    const transition: PhaseTransition = {
      from: this.currentPhase,
      to: to,
      timestamp: Date.now(),
      trigger: `force_${reason}`,
      data: { forced: true, originalReason: reason },
      battleType: this.battleType
    };
    
    this.phaseHistory.push(transition);
    this.cleanupPreviousPhase(this.currentPhase);
    this.currentPhase = to;
    this.phaseStartTime = Date.now();
    this.initializeNewPhase(to, { forced: true });
    
    if (this.gameState) {
      const gameStatePhase = this.mapPhaseToGameState(to);
      (this.gameState as any).phase = gameStatePhase;
    }
    
    console.log(`🚨 [PhaseManager] Transition forcée réussie: ${this.currentPhase}`);
    return true;
  }
  
  // === VALIDATION ÉTENDUE ===
  
  /**
   * 🆕 Validation avec support des nouvelles phases
   */
  private validateTransitionExtended(from: BattlePhase, to: BattlePhase, trigger: string): PhaseValidation {
    
    // 🔥 TRANSITIONS IDENTIQUES (conservé du système existant)
    if (from === to) {
      const allowedSamePhaseTransitions = [
        'turn_reset',
        'turn_complete', 
        'timeout_next_turn',
        'timeout_force',
        'timeout_force_complete',
        'resolution_complete',
        'intro_complete',
        'intro_complete_fixed',
        'manual_reset'
      ];
      
      if (allowedSamePhaseTransitions.includes(trigger)) {
        console.log(`🔄 [PhaseManager] Transition même phase autorisée: ${from} (${trigger})`);
        return { isValid: true };
      }
    }
    
    // 🔥 TRIGGERS D'URGENCE (conservé)
    const emergencyTriggers = [
      'timeout',
      'force_battle_end', 
      'error',
      'timeout_force',
      'emergency_end',
      'crash_recovery',
      'force_',
      'intro_complete_fixed',
      'emergency_intro_fix'
    ];
    
    if (emergencyTriggers.some(emergency => trigger.includes(emergency))) {
      console.log(`🚨 [PhaseManager] Transition d'urgence autorisée: ${from} → ${to} (${trigger})`);
      return { isValid: true };
    }
    
    // 🆕 NOUVELLES RÈGLES POUR PHASES DRESSEURS
    return this.validateTrainerPhaseTransitions(from, to, trigger);
  }
  
  /**
   * 🆕 Validation spécifique phases dresseurs
   */
  private validateTrainerPhaseTransitions(from: BattlePhase, to: BattlePhase, trigger: string): PhaseValidation {
    
    // Matrice étendue des transitions autorisées
    const allowedTransitions: Record<BattlePhase, BattlePhase[]> = {
      // 🔥 PHASES EXISTANTES (conservées)
      [BattlePhase.INITIALIZING]: [BattlePhase.INTRO],
      [BattlePhase.INTRO]: [
        BattlePhase.POKEMON_SELECTION, // 🆕 Pour dresseurs
        BattlePhase.ACTION_SELECTION, 
        BattlePhase.ENDED
      ],
      [BattlePhase.ACTION_SELECTION]: [
        BattlePhase.ACTION_RESOLUTION, 
        BattlePhase.SWITCH_PHASE,      // 🆕 Changement volontaire
        BattlePhase.CAPTURE, 
        BattlePhase.ENDED,
        BattlePhase.ACTION_SELECTION   // Reset
      ],
      [BattlePhase.ACTION_RESOLUTION]: [
        BattlePhase.POKEMON_FAINTED, 
        BattlePhase.FORCED_SWITCH,     // 🆕 Après KO
        BattlePhase.SWITCH_PHASE,      // 🆕 Changement post-résolution
        BattlePhase.ACTION_SELECTION, 
        BattlePhase.ENDED
      ],
      [BattlePhase.POKEMON_FAINTED]: [
        BattlePhase.FORCED_SWITCH,     // 🆕 Changement obligatoire
        BattlePhase.ACTION_SELECTION, 
        BattlePhase.ENDED
      ],
      [BattlePhase.CAPTURE]: [
        BattlePhase.ACTION_SELECTION, 
        BattlePhase.ENDED
      ],
      [BattlePhase.ENDED]: [BattlePhase.ENDED],
      
      // 🆕 NOUVELLES PHASES DRESSEURS
      [BattlePhase.POKEMON_SELECTION]: [
        BattlePhase.ACTION_SELECTION,  // Vers combat normal
        BattlePhase.ENDED              // Abandon possible
      ],
      [BattlePhase.SWITCH_PHASE]: [
        BattlePhase.ACTION_SELECTION,  // Après changement
        BattlePhase.ACTION_RESOLUTION, // Changement prioritaire
        BattlePhase.ENDED              // Abandon
      ],
      [BattlePhase.FORCED_SWITCH]: [
        BattlePhase.ACTION_SELECTION,  // Après changement forcé
        BattlePhase.ENDED              // Si aucun Pokémon disponible
      ]
    };
    
    const allowed = allowedTransitions[from] || [];
    
    if (!allowed.includes(to)) {
      return {
        isValid: false,
        reason: `Transition non autorisée: ${from} → ${to} (${this.battleType})`
      };
    }
    
    // 🆕 VALIDATIONS SPÉCIFIQUES PAR TYPE DE COMBAT
    if (this.battleType === 'wild') {
      // Combats sauvages ne peuvent pas utiliser phases dresseurs
      const trainerOnlyPhases = [
        BattlePhase.POKEMON_SELECTION,
        BattlePhase.SWITCH_PHASE,
        BattlePhase.FORCED_SWITCH
      ];
      
      if (trainerOnlyPhases.includes(to)) {
        return {
          isValid: false,
          reason: `Phase ${to} non disponible pour combats sauvages`,
          battleTypeRestrictions: [`${to} réservé aux dresseurs`]
        };
      }
    }
    
    return { isValid: true };
  }
  
  // === VALIDATION DES ACTIONS ÉTENDUE ===
  
  /**
   * 🆕 Validation actions étendue avec nouvelles phases
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
      case BattlePhase.INTRO:
      case BattlePhase.ACTION_RESOLUTION:
      case BattlePhase.POKEMON_FAINTED:
      case BattlePhase.CAPTURE:
      case BattlePhase.ENDED:
        return false;
        
      case BattlePhase.ACTION_SELECTION:
        return true;
        
      // 🆕 NOUVELLES PHASES
      case BattlePhase.POKEMON_SELECTION:
        return actionType === 'pokemon_select' || actionType === 'switch';
        
      case BattlePhase.SWITCH_PHASE:
      case BattlePhase.FORCED_SWITCH:
        return actionType === 'switch';
        
      default:
        console.warn(`⚠️ [PhaseManager] Phase inconnue: ${this.currentPhase}`);
        return false;
    }
  }
  
  /**
   * 🆕 Validation action étendue
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
        
      // 🆕 NOUVELLES VALIDATIONS
      case BattlePhase.SWITCH_PHASE:
      case BattlePhase.FORCED_SWITCH:
        return this.validateSwitchAction(action);
        
      case BattlePhase.POKEMON_SELECTION:
        return this.validatePokemonSelection(action);
        
      default:
        return {
          isValid: false,
          reason: `Phase ${this.currentPhase} ne gère pas les actions`
        };
    }
  }
  
  /**
   * 🔥 Validation action selection (conservée)
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
    
    if (action.type === 'capture' && this.gameState?.type !== 'wild') {
      return {
        isValid: false,
        reason: 'Capture seulement possible contre Pokémon sauvages'
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * 🆕 Validation actions de changement
   */
  private validateSwitchAction(action: BattleAction): PhaseValidation {
    if (action.type !== 'switch') {
      return {
        isValid: false,
        reason: 'Seules les actions de changement sont autorisées',
        allowedActions: ['switch']
      };
    }
    
    // Vérifier données de changement
    if (!action.data || typeof action.data.toPokemonIndex !== 'number') {
      return {
        isValid: false,
        reason: 'Données de changement invalides'
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * 🆕 Validation sélection Pokémon initial
   */
  private validatePokemonSelection(action: BattleAction): PhaseValidation {
    if (!['pokemon_select', 'switch'].includes(action.type)) {
      return {
        isValid: false,
        reason: 'Seule la sélection de Pokémon est autorisée',
        allowedActions: ['pokemon_select', 'switch']
      };
    }
    
    return { isValid: true };
  }
  
  // === GESTION LIFECYCLE PHASES ===
  
  /**
   * 🆕 Nettoyage phase précédente
   */
  private cleanupPreviousPhase(phase: BattlePhase): void {
    switch (phase) {
      case BattlePhase.FORCED_SWITCH:
        // Nettoyer timeouts de changement forcé
        this.forcedSwitchTimeouts.forEach(timeout => clearTimeout(timeout));
        this.forcedSwitchTimeouts.clear();
        break;
        
      case BattlePhase.SWITCH_PHASE:
        // Nettoyer données de changement
        this.switchPhaseData = null;
        break;
    }
  }
  
  /**
   * 🆕 Initialisation nouvelle phase
   */
  private initializeNewPhase(phase: BattlePhase, data?: any): void {
    switch (phase) {
      case BattlePhase.SWITCH_PHASE:
      case BattlePhase.FORCED_SWITCH:
        if (data && 'playerRole' in data) {
          this.switchPhaseData = data as SwitchPhaseData;
          
          // Gérer timeout changement forcé
          if (phase === BattlePhase.FORCED_SWITCH && this.switchPhaseData.timeLimit) {
            this.setupForcedSwitchTimeout(this.switchPhaseData.playerRole, this.switchPhaseData.timeLimit);
          }
        }
        break;
        
      case BattlePhase.POKEMON_SELECTION:
        console.log('🆕 [PhaseManager] Phase sélection Pokémon initialisée');
        break;
    }
  }
  
  /**
   * 🆕 Gestion timeout changement forcé
   */
  private setupForcedSwitchTimeout(playerRole: PlayerRole, timeLimit: number): void {
    const timeout = setTimeout(() => {
      console.log(`⏰ [PhaseManager] Timeout changement forcé pour ${playerRole}`);
      
      // Force retour vers sélection d'action avec changement automatique
      this.setPhase(BattlePhase.ACTION_SELECTION, 'forced_switch_timeout', {
        playerRole,
        autoSwitch: true
      });
      
    }, timeLimit);
    
    this.forcedSwitchTimeouts.set(playerRole, timeout);
  }
  
  // === API PUBLIQUE ÉTENDUE ===
  
  /**
   * Récupère la phase actuelle (🔥 conservé)
   */
  getCurrentPhase(): BattlePhase {
    return this.currentPhase;
  }
  
  /**
   * 🆕 Récupère les données de phase de changement
   */
  getSwitchPhaseData(): SwitchPhaseData | null {
    return this.switchPhaseData;
  }
  
  /**
   * 🆕 Vérifie si phase nécessite action de changement
   */
  requiresSwitchAction(): boolean {
    return [
      BattlePhase.SWITCH_PHASE,
      BattlePhase.FORCED_SWITCH,
      BattlePhase.POKEMON_SELECTION
    ].includes(this.currentPhase);
  }
  
  /**
   * 🆕 Vérifie si combat est de type dresseur
   */
  isTrainerBattle(): boolean {
    return this.battleType === 'trainer';
  }
  
  // === MÉTHODES CONSERVÉES SYSTÈME EXISTANT ===
  
  isInPhase(phase: BattlePhase): boolean {
    return this.initialized && 
           this.currentPhase === phase && 
           !this.isTransitioning && 
           !this.transitionLock;
  }
  
  getCurrentPhaseDuration(): number {
    return Date.now() - this.phaseStartTime;
  }
  
  transitionToActionSelection(): boolean {
    return this.setPhase(BattlePhase.ACTION_SELECTION, 'auto_intro_end');
  }
  
  transitionToResolution(actionsReady: boolean): boolean {
    if (!actionsReady) {
      console.log(`⏳ [PhaseManager] Attente des actions pour résolution`);
      return false;
    }
    
    return this.setPhase(BattlePhase.ACTION_RESOLUTION, 'actions_ready');
  }
  
  transitionToCapture(): boolean {
    return this.setPhase(BattlePhase.CAPTURE, 'capture_attempt');
  }
  
  transitionToEnded(reason: string): boolean {
    return this.setPhase(BattlePhase.ENDED, reason);
  }
  
  resetTurn(): boolean {
    return this.setPhase(BattlePhase.ACTION_SELECTION, 'turn_reset');
  }
  
  returnToActionSelection(): boolean {
    return this.setPhase(BattlePhase.ACTION_SELECTION, 'resolution_complete');
  }
  
  shouldAutoEndIntro(): boolean {
    if (this.currentPhase !== BattlePhase.INTRO) return false;
    
    const INTRO_DURATION = 1000;
    return this.getCurrentPhaseDuration() >= INTRO_DURATION;
  }
  
  getNextPhaseAfterResolution(battleEnded: boolean): BattlePhase {
    if (battleEnded) {
      return BattlePhase.ENDED;
    }
    return BattlePhase.ACTION_SELECTION;
  }
  
  // === INFORMATIONS ÉTENDUES ===
  
  getPhaseState(): any {
    return {
      currentPhase: this.currentPhase,
      battleType: this.battleType, // 🆕
      phaseDuration: this.getCurrentPhaseDuration(),
      isTransitioning: this.isTransitioning,
      transitionLock: this.transitionLock,
      initialized: this.initialized,
      canSubmitActions: this.canSubmitAction(),
      transitionCount: this.phaseHistory.length,
      gameStatePhase: this.gameState?.phase || 'unknown',
      
      // 🆕 NOUVELLES PROPRIÉTÉS
      switchPhaseData: this.switchPhaseData,
      requiresSwitchAction: this.requiresSwitchAction(),
      isTrainerBattle: this.isTrainerBattle(),
      forcedSwitchTimeouts: this.forcedSwitchTimeouts.size,
      
      lastTransition: this.phaseHistory.length > 0 ? 
        this.phaseHistory[this.phaseHistory.length - 1] : null,
      
      recentTransitions: this.phaseHistory.slice(-5).map(t => ({
        from: t.from,
        to: t.to,
        trigger: t.trigger,
        timestamp: t.timestamp,
        battleType: t.battleType // 🆕
      }))
    };
  }
  
  getPhaseHistory(): PhaseTransition[] {
    return [...this.phaseHistory];
  }
  
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
      version: 'phase_system_v4_trainer_extended',
      currentPhase: this.currentPhase,
      battleType: this.battleType, // 🆕
      initialized: this.initialized,
      totalTransitions: this.phaseHistory.length,
      phaseCount,
      averagePhaseTime: phaseTime,
      
      features: [
        'nine_phase_system_extended', // 🆕 6 → 9 phases
        'trainer_battle_support',     // 🆕
        'switch_phase_management',    // 🆕
        'forced_switch_timeouts',     // 🆕
        'battle_type_validation',     // 🆕
        'flexible_transition_validation',
        'same_phase_transitions_allowed',
        'emergency_transition_override',
        'turn_reset_capability', 
        'race_condition_protection',
        'transition_locking',
        'enhanced_validation',
        'debug_improvements',
        'thread_safe_transitions',
        'force_transition_method'
      ],
      
      extensions: [
        'pokemon_selection_phase_ADDED',    // 🆕
        'switch_phase_ADDED',               // 🆕
        'forced_switch_phase_ADDED',        // 🆕
        'battle_type_context_ADDED',        // 🆕
        'switch_timeout_management_ADDED',  // 🆕
        'trainer_specific_validation_ADDED',// 🆕
        'phase_lifecycle_management_ADDED', // 🆕
        'backward_compatibility_MAINTAINED' // 🔥
      ]
    };
  }
  
  // === UTILITAIRES CONSERVÉS ===
  
  private mapPhaseToGameState(phase: BattlePhase): 'waiting' | 'battle' | 'ended' | 'fled' {
    switch (phase) {
      case BattlePhase.INITIALIZING:
        return 'waiting';
      case BattlePhase.INTRO:
      case BattlePhase.ACTION_SELECTION:
      case BattlePhase.ACTION_RESOLUTION:
      case BattlePhase.POKEMON_FAINTED:
      case BattlePhase.CAPTURE:
      case BattlePhase.POKEMON_SELECTION:  // 🆕
      case BattlePhase.SWITCH_PHASE:       // 🆕
      case BattlePhase.FORCED_SWITCH:      // 🆕
        return 'battle';
      case BattlePhase.ENDED:
        return 'ended';
      default:
        return 'waiting';
    }
  }
  
  reset(): void {
    // 🆕 NETTOYAGE ÉTENDU
    this.forcedSwitchTimeouts.forEach(timeout => clearTimeout(timeout));
    this.forcedSwitchTimeouts.clear();
    this.switchPhaseData = null;
    this.battleType = 'wild';
    
    // 🔥 NETTOYAGE EXISTANT
    this.currentPhase = BattlePhase.INITIALIZING;
    this.gameState = null;
    this.phaseHistory = [];
    this.phaseStartTime = 0;
    this.isTransitioning = false;
    this.initialized = false;
    this.transitionLock = false;
    
    console.log('🔄 [PhaseManager] Reset effectué - Support dresseurs étendu');
  }
  
  isReady(): boolean {
    return this.initialized && 
           this.gameState !== null && 
           this.currentPhase !== BattlePhase.INITIALIZING &&
           !this.transitionLock;
  }
  
  debugTransitionState(): void {
    console.log('🔍 [PhaseManager] DEBUG STATE ÉTENDU:');
    console.log(`  - currentPhase: ${this.currentPhase}`);
    console.log(`  - battleType: ${this.battleType}`); // 🆕
    console.log(`  - initialized: ${this.initialized}`);
    console.log(`  - isTransitioning: ${this.isTransitioning}`);
    console.log(`  - transitionLock: ${this.transitionLock}`);
    console.log(`  - canSubmitAction: ${this.canSubmitAction()}`);
    console.log(`  - requiresSwitchAction: ${this.requiresSwitchAction()}`); // 🆕
    console.log(`  - switchPhaseData: ${this.switchPhaseData ? 'présent' : 'null'}`); // 🆕
    console.log(`  - recentTransitions: ${this.phaseHistory.slice(-3).map(t => `${t.from}→${t.to}(${t.trigger})`).join(', ')}`);
  }
  
  testTransition(to: BattlePhase, trigger: string): PhaseValidation {
    return this.validateTransitionExtended(this.currentPhase, to, trigger);
  }
}

export default PhaseManager;
