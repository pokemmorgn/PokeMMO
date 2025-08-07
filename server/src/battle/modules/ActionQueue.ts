// server/src/battle/modules/ActionQueue.ts
// 🎯 EXTENSION ACTIONQUEUE POUR SUPPORT CHANGEMENTS POKÉMON - COMPATIBLE EXISTANT

import { BattleAction, PlayerRole, Pokemon } from '../types/BattleTypes';
import { SwitchAction, isSwitchAction, TRAINER_BATTLE_CONSTANTS } from '../types/TrainerBattleTypes';

// === INTERFACES ÉTENDUES ===

export interface QueuedAction {
  action: BattleAction;
  playerRole: PlayerRole;
  pokemon: Pokemon;
  submittedAt: number;
  priority: number;
  // 🆕 NOUVELLES PROPRIÉTÉS
  actionCategory: 'switch' | 'attack' | 'item' | 'capture' | 'run'; // Catégorisation
  isHighPriority: boolean;     // Actions prioritaires (changements)
  validationHash?: string;     // Hash pour validation cohérence
}

export interface ActionQueueState {
  hasPlayer1Action: boolean;
  hasPlayer2Action: boolean;
  player1Action?: QueuedAction;
  player2Action?: QueuedAction;
  isComplete: boolean;
  submissionOrder: PlayerRole[];
  // 🆕 NOUVELLES PROPRIÉTÉS
  hasPriorityActions: boolean;          // Actions prioritaires présentes
  switchActionsCount: number;           // Nombre d'actions de changement
  actionBreakdown: ActionBreakdown;     // Répartition par type
}

export interface ActionBreakdown {
  switches: number;
  attacks: number;
  items: number;
  captures: number;
  runs: number;
  totalPriority: number;    // Actions avec priorité > 0
  totalNormal: number;      // Actions priorité normale
}

export interface SwitchActionValidation {
  canAddSwitch: boolean;
  reason?: string;
  conflictingAction?: BattleAction;
  suggestedAlternative?: string;
}

/**
 * ACTION QUEUE ÉTENDUE - Support complet changements Pokémon
 * 
 * 🆕 EXTENSIONS AJOUTÉES :
 * - Priorité élevée pour actions de changement (6)
 * - Validation spécifique changements vs autres actions
 * - Gestion conflits actions (changement + attaque même joueur)
 * - Analyse détaillée types d'actions en file
 * - Compatible performance MMO
 */
export class ActionQueue {
  
  private actions: Map<PlayerRole, QueuedAction> = new Map();
  private submissionOrder: PlayerRole[] = [];
  private maxWaitTime: number = 30000;
  private submissionStart: number = 0;
  
  // 🆕 NOUVELLES PROPRIÉTÉS
  private switchActionsEnabled: boolean = true;
  private maxSwitchActions: number = 2; // Max 1 par joueur
  private actionConflictResolution: 'priority' | 'first_submitted' | 'switch_wins' = 'priority';
  
  constructor() {
    console.log('📋 [ActionQueue] File d\'attente étendue - Support changements prioritaires');
  }
  
  // === API PRINCIPALE ÉTENDUE ===
  
  /**
   * Ajoute une action à la file avec validation étendue
   */
  addAction(
    playerRole: PlayerRole, 
    action: BattleAction, 
    pokemon: Pokemon
  ): boolean {
    
    console.log(`📥 [ActionQueue] Ajout action: ${playerRole} → ${action.type}`);
    
    // 🆕 VALIDATION SPÉCIFIQUE CHANGEMENTS
    if (isSwitchAction(action)) {
      const switchValidation = this.validateSwitchAction(playerRole, action as SwitchAction);
      if (!switchValidation.canAddSwitch) {
        console.warn(`⚠️ [ActionQueue] Changement refusé: ${switchValidation.reason}`);
        return false;
      }
    }
    
    // Vérifier si une action existe déjà pour ce joueur
    const existingAction = this.actions.get(playerRole);
    if (existingAction) {
      console.log(`🔄 [ActionQueue] Action existante pour ${playerRole}, résolution conflit...`);
      
      // 🆕 GESTION CONFLITS AVEC PRIORITÉ
      const shouldReplace = this.resolveActionConflict(existingAction, action, pokemon);
      if (!shouldReplace) {
        console.log(`❌ [ActionQueue] Nouvelle action rejetée, existante prioritaire`);
        return false;
      }
      
      console.log(`✅ [ActionQueue] Remplacement action existante (nouvelle prioritaire)`);
    }
    
    // 🆕 CALCUL PRIORITÉ ÉTENDU
    const priority = this.calculateExtendedActionPriority(action, pokemon);
    const category = this.categorizeAction(action);
    const isHighPriority = priority > 0;
    
    // Créer l'action en file
    const queuedAction: QueuedAction = {
      action,
      playerRole,
      pokemon,
      submittedAt: Date.now(),
      priority,
      actionCategory: category,      // 🆕
      isHighPriority,               // 🆕
      validationHash: this.generateValidationHash(action, pokemon) // 🆕

      console.log(`🔍 [ActionQueue] Après ajout ${playerRole}:`);
      console.log(`    Total actions: ${this.actions.size}`);
      console.log(`    Keys:`, Array.from(this.actions.keys()));
      console.log(`    areAllActionsReady(): ${this.areAllActionsReady()}`);
    };
    
    // Stocker l'action
    this.actions.set(playerRole, queuedAction);
    
    // Enregistrer l'ordre de soumission (si nouvelle)
    if (!this.submissionOrder.includes(playerRole)) {
      this.submissionOrder.push(playerRole);
    }
    
    // Marquer le début si c'est la première action
    if (this.submissionStart === 0) {
      this.submissionStart = Date.now();
    }
    
    console.log(`✅ [ActionQueue] Action ajoutée: ${playerRole} → ${action.type} (priorité: ${priority}, catégorie: ${category})`);
    
    return true;
  }
  
  // === 🆕 NOUVELLES MÉTHODES SPÉCIFIQUES CHANGEMENTS ===
  
  /**
   * Ajoute spécifiquement une action de changement
   */
  addSwitchAction(
    playerRole: PlayerRole,
    switchAction: SwitchAction,
    pokemon: Pokemon
  ): boolean {
    
    if (!this.switchActionsEnabled) {
      console.warn(`⚠️ [ActionQueue] Actions de changement désactivées`);
      return false;
    }
    
    // Validation spécifique changement
    const validation = this.validateSwitchAction(playerRole, switchAction);
    if (!validation.canAddSwitch) {
      console.warn(`❌ [ActionQueue] Changement invalide: ${validation.reason}`);
      return false;
    }
    
    // Ajouter avec priorité élevée garantie
    const success = this.addAction(playerRole, switchAction, pokemon);
    
    if (success) {
      console.log(`🔄 [ActionQueue] Changement ajouté avec priorité ${TRAINER_BATTLE_CONSTANTS.SWITCH_PRIORITY}`);
    }
    
    return success;
  }
  
  /**
   * Valide si un changement peut être ajouté
   */
  private validateSwitchAction(playerRole: PlayerRole, switchAction: SwitchAction): SwitchActionValidation {
    
    // Vérifier limites globales
    const currentSwitchCount = this.getCurrentSwitchActionsCount();
    if (currentSwitchCount >= this.maxSwitchActions) {
      return {
        canAddSwitch: false,
        reason: `Maximum ${this.maxSwitchActions} actions de changement simultanées atteint`
      };
    }
    
    // Vérifier action existante du même joueur
    const existingAction = this.actions.get(playerRole);
    if (existingAction) {
      // Si l'existante est aussi un changement
      if (existingAction.actionCategory === 'switch') {
        return {
          canAddSwitch: false,
          reason: 'Action de changement déjà soumise par ce joueur',
          conflictingAction: existingAction.action
        };
      }
      
      // Si l'existante est une attaque, le changement peut la remplacer (priorité)
      if (existingAction.actionCategory === 'attack') {
        console.log(`🔄 [ActionQueue] Le changement va remplacer l'attaque de ${playerRole}`);
        return { canAddSwitch: true };
      }
    }
    
    // Validation données changement
    const switchData = switchAction.data;
    if (typeof switchData.toPokemonIndex !== 'number' || switchData.toPokemonIndex < 0) {
      return {
        canAddSwitch: false,
        reason: 'Index Pokémon cible invalide'
      };
    }
    
    return { canAddSwitch: true };
  }
  
  /**
   * Compte les actions de changement actuelles
   */
  private getCurrentSwitchActionsCount(): number {
    return Array.from(this.actions.values())
      .filter(qa => qa.actionCategory === 'switch')
      .length;
  }
  
  // === RÉSOLUTION CONFLITS ÉTENDUES ===
  
  /**
   * 🆕 Résout les conflits entre actions du même joueur
   */
  private resolveActionConflict(
    existingAction: QueuedAction, 
    newAction: BattleAction, 
    newPokemon: Pokemon
  ): boolean {
    
    const newPriority = this.calculateExtendedActionPriority(newAction, newPokemon);
    const newCategory = this.categorizeAction(newAction);
    
    console.log(`⚖️ [ActionQueue] Conflit résolution: ${existingAction.actionCategory}(${existingAction.priority}) vs ${newCategory}(${newPriority})`);
    
    switch (this.actionConflictResolution) {
      case 'priority':
        // La plus prioritaire gagne
        return newPriority > existingAction.priority;
        
      case 'switch_wins':
        // Changement gagne toujours
        return newCategory === 'switch';
        
      case 'first_submitted':
        // Première soumise gagne
        return false;
        
      default:
        return newPriority > existingAction.priority;
    }
  }
  
  // === CALCUL PRIORITÉ ÉTENDU ===
  
  /**
   * 🆕 Calcul priorité avec support changements
   */
  private calculateExtendedActionPriority(action: BattleAction, pokemon: Pokemon): number {
    // Priorités selon type d'action (comme système existant + extensions)
    switch (action.type) {
      case 'switch':
        return TRAINER_BATTLE_CONSTANTS.SWITCH_PRIORITY; // 6 - Toujours prioritaire
        
      case 'item':
        return 5; // Objets haute priorité
        
      case 'run':
        return 4; // Fuite prioritaire
        
      case 'capture':
        return 3; // Capture avant attaques
        
      case 'attack':
        return this.getMovePriority(action.data?.moveId || '');
        
      default:
        return 0; // Priorité normale
    }
  }
  
  /**
   * 🔥 Calcul priorité attaques (conservé du système existant)
   */
  private getMovePriority(moveId: string): number {
    const movePriorities: Record<string, number> = {
      // Priorité +2
      'extreme_speed': 2,
      
      // Priorité +1
      'quick_attack': 1,
      'bullet_punch': 1,
      'mach_punch': 1,
      'aqua_jet': 1,
      'ice_shard': 1,
      'shadow_sneak': 1,
      'sucker_punch': 1,
      
      // Priorité +0 (normal) - défaut
      'tackle': 0,
      'scratch': 0,
      'pound': 0,
      'vine_whip': 0,
      'razor_leaf': 0,
      
      // Priorité -1
      'vital_throw': -1,
      
      // Priorité -3
      'focus_punch': -3,
      
      // Priorité -4
      'avalanche': -4,
      'revenge': -4,
      
      // Priorité -5
      'counter': -5,
      'mirror_coat': -5,
      
      // Priorité -6
      'roar': -6,
      'whirlwind': -6
    };
    
    return movePriorities[moveId] || 0;
  }
  
  /**
   * 🆕 Catégorise une action
   */
  private categorizeAction(action: BattleAction): 'switch' | 'attack' | 'item' | 'capture' | 'run' {
    switch (action.type) {
      case 'switch': return 'switch';
      case 'attack': return 'attack';
      case 'item': return 'item';
      case 'capture': return 'capture';
      case 'run': return 'run';
      default: return 'attack';
    }
  }
  
  // === RÉCUPÉRATION ACTIONS ÉTENDUES ===
  
  /**
   * 🔥 Récupère les actions ordonnées par vitesse/priorité (étendu)
   */
  getActionsBySpeed(): QueuedAction[] {
    const allActions = this.getAllActions();
    
    if (allActions.length === 0) {
      return [];
    }
    
    // Trier par priorité d'abord, puis par vitesse
    return allActions.sort((a, b) => {
      // 1. 🆕 PRIORITÉ ACTION (changements toujours en premier)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // 2. Vitesse du Pokémon (plus rapide = premier)
      const speedA = a.pokemon.speed || 0;
      const speedB = b.pokemon.speed || 0;
      
      if (speedA !== speedB) {
        return speedB - speedA;
      }
      
      // 3. 🆕 CATÉGORIE ACTION (changements avant attaques à vitesse égale)
      if (a.actionCategory !== b.actionCategory) {
        const categoryPriority = { switch: 3, item: 2, capture: 1, attack: 0, run: 0 };
        const priorityA = categoryPriority[a.actionCategory] || 0;
        const priorityB = categoryPriority[b.actionCategory] || 0;
        return priorityB - priorityA;
      }
      
      // 4. Ordre de soumission en cas d'égalité parfaite
      const orderA = this.submissionOrder.indexOf(a.playerRole);
      const orderB = this.submissionOrder.indexOf(b.playerRole);
      
      return orderA - orderB;
    });
  }
  
  /**
   * 🆕 Récupère seulement les actions de changement
   */
  getSwitchActions(): QueuedAction[] {
    return this.getAllActions().filter(qa => qa.actionCategory === 'switch');
  }
  
  /**
   * 🆕 Récupère les actions par catégorie
   */
  getActionsByCategory(category: QueuedAction['actionCategory']): QueuedAction[] {
    return this.getAllActions().filter(qa => qa.actionCategory === category);
  }
  
  // === ÉTAT ET INFORMATIONS ÉTENDUES ===
  
  /**
   * 🆕 État complet avec informations changements
   */
  getQueueState(): ActionQueueState {
    const player1Action = this.actions.get('player1');
    const player2Action = this.actions.get('player2');
    const allActions = this.getAllActions();
    
    // Analyser la répartition des actions
    const breakdown: ActionBreakdown = {
      switches: 0,
      attacks: 0,
      items: 0,
      captures: 0,
      runs: 0,
      totalPriority: 0,
      totalNormal: 0
    };
    
    allActions.forEach(qa => {
      // Compter par catégorie
      switch (qa.actionCategory) {
        case 'switch': breakdown.switches++; break;
        case 'attack': breakdown.attacks++; break;
        case 'item': breakdown.items++; break;
        case 'capture': breakdown.captures++; break;
        case 'run': breakdown.runs++; break;
      }
      
      // Compter par priorité
      if (qa.priority > 0) {
        breakdown.totalPriority++;
      } else {
        breakdown.totalNormal++;
      }
    });
    
    return {
      // 🔥 PROPRIÉTÉS EXISTANTES
      hasPlayer1Action: !!player1Action,
      hasPlayer2Action: !!player2Action,
      player1Action,
      player2Action,
      isComplete: this.areAllActionsReady(),
      submissionOrder: [...this.submissionOrder],
      
      // 🆕 NOUVELLES PROPRIÉTÉS
      hasPriorityActions: breakdown.totalPriority > 0,
      switchActionsCount: breakdown.switches,
      actionBreakdown: breakdown
    };
  }
  
  /**
   * 🆕 Analyse détaillée de la priorité
   */
  analyzePriorityOrderExtended(): any {
    const orderedActions = this.getActionsBySpeed();
    
    const analysis = {
      totalActions: orderedActions.length,
      priorityBreakdown: {
        switches: orderedActions.filter(qa => qa.actionCategory === 'switch').length,
        items: orderedActions.filter(qa => qa.actionCategory === 'item').length,
        highPriorityAttacks: orderedActions.filter(qa => qa.actionCategory === 'attack' && qa.priority > 0).length,
        normalAttacks: orderedActions.filter(qa => qa.actionCategory === 'attack' && qa.priority === 0).length,
        others: orderedActions.filter(qa => !['switch', 'item', 'attack'].includes(qa.actionCategory)).length
      },
      executionOrder: orderedActions.map((qa, index) => ({
        position: index + 1,
        playerRole: qa.playerRole,
        actionType: qa.action.type,
        actionCategory: qa.actionCategory,  // 🆕
        priority: qa.priority,
        pokemonSpeed: qa.pokemon.speed,
        submittedAt: qa.submittedAt,
        isHighPriority: qa.isHighPriority  // 🆕
      })),
      speedComparison: orderedActions.length === 2 ? {
        player1Speed: orderedActions.find(qa => qa.playerRole === 'player1')?.pokemon.speed || 0,
        player2Speed: orderedActions.find(qa => qa.playerRole === 'player2')?.pokemon.speed || 0,
        winner: orderedActions[0]?.playerRole,
        winReason: this.determineWinReason(orderedActions) // 🆕
      } : null
    };
    
    return analysis;
  }
  
  /**
   * 🆕 Détermine la raison de victoire dans l'ordre
   */
  private determineWinReason(orderedActions: QueuedAction[]): string {
    if (orderedActions.length < 2) return 'single_action';
    
    const first = orderedActions[0];
    const second = orderedActions[1];
    
    if (first.priority > second.priority) {
      return `priority_advantage (${first.priority} vs ${second.priority})`;
    }
    
    if (first.pokemon.speed > second.pokemon.speed) {
      return `speed_advantage (${first.pokemon.speed} vs ${second.pokemon.speed})`;
    }
    
    if (first.actionCategory !== second.actionCategory) {
      return `category_advantage (${first.actionCategory} vs ${second.actionCategory})`;
    }
    
    return 'submission_order';
  }
  
  // === GESTION SPÉCIALE ÉTENDUES ===
  
  /**
   * 🆕 Vérifie si la file contient des actions prioritaires
   */
  hasPriorityActions(): boolean {
    return this.getAllActions().some(qa => qa.isHighPriority);
  }
  
  /**
   * 🔥 Traite les actions avec logique spéciale (étendu)
   */
  hasSpecialAction(): { hasSpecial: boolean; actionType?: string; playerRole?: PlayerRole; category?: string } {
    for (const [role, queuedAction] of this.actions) {
      // 🔥 ACTIONS SPÉCIALES EXISTANTES
      if (['capture', 'run'].includes(queuedAction.action.type)) {
        return {
          hasSpecial: true,
          actionType: queuedAction.action.type,
          playerRole: role
        };
      }
      
      // 🆕 CHANGEMENTS AUSSI SPÉCIAUX
      if (queuedAction.actionCategory === 'switch') {
        return {
          hasSpecial: true,
          actionType: 'switch',
          playerRole: role,
          category: 'switch'
        };
      }
    }
    
    return { hasSpecial: false };
  }
  
  // === UTILITAIRES ÉTENDUS ===
  
  /**
   * 🆕 Génère hash de validation pour cohérence
   */
  private generateValidationHash(action: BattleAction, pokemon: Pokemon): string {
    const data = {
      actionType: action.type,
      actionId: action.actionId,
      pokemonId: pokemon.combatId,
      timestamp: action.timestamp
    };
    
    return btoa(JSON.stringify(data)).substring(0, 8);
  }
  
  /**
   * 🆕 Valide la cohérence d'une action via hash
   */
  validateActionIntegrity(playerRole: PlayerRole): boolean {
    const queuedAction = this.actions.get(playerRole);
    if (!queuedAction || !queuedAction.validationHash) return true;
    
    const expectedHash = this.generateValidationHash(queuedAction.action, queuedAction.pokemon);
    return expectedHash === queuedAction.validationHash;
  }
  
  // === CONFIGURATION ÉTENDUE ===
  
  /**
   * 🆕 Configure les paramètres de changement
   */
  configureSwitchBehavior(
    enabled: boolean = true,
    maxSwitchActions: number = 2,
    conflictResolution: 'priority' | 'first_submitted' | 'switch_wins' = 'priority'
  ): void {
    
    this.switchActionsEnabled = enabled;
    this.maxSwitchActions = maxSwitchActions;
    this.actionConflictResolution = conflictResolution;
    
    console.log(`⚙️ [ActionQueue] Changements configurés: ${enabled ? 'activés' : 'désactivés'}, max=${maxSwitchActions}, résolution=${conflictResolution}`);
  }
  
  // === MÉTHODES CONSERVÉES SYSTÈME EXISTANT ===
  
  hasAction(playerRole: PlayerRole): boolean {
    return this.actions.has(playerRole);
  }
  
  areAllActionsReady(): boolean {
    const hasPlayer1 = this.actions.has('player1');
    const hasPlayer2 = this.actions.has('player2');
    const result = hasPlayer1 && hasPlayer2;
    
    // 🚨 DEBUG TEMPORAIRE
    console.log(`🔍 [ActionQueue] areAllActionsReady() DEBUG:`);
    console.log(`    actions.size: ${this.actions.size}`);
    console.log(`    keys:`, Array.from(this.actions.keys()));
    console.log(`    hasPlayer1: ${hasPlayer1}`);
    console.log(`    hasPlayer2: ${hasPlayer2}`);
    console.log(`    result: ${result}`);
    
    return result;
  }
  
  getActionCount(): number {
    return this.actions.size;
  }
  
  getAction(playerRole: PlayerRole): QueuedAction | null {
    return this.actions.get(playerRole) || null;
  }
  
  getAllActions(): QueuedAction[] {
    return Array.from(this.actions.values());
  }
  
  getActionsBySubmissionOrder(): QueuedAction[] {
    return this.submissionOrder
      .map(role => this.actions.get(role))
      .filter((action): action is QueuedAction => action !== undefined);
  }
  
  removeAction(playerRole: PlayerRole): boolean {
    const removed = this.actions.delete(playerRole);
    
    if (removed) {
      const index = this.submissionOrder.indexOf(playerRole);
      if (index > -1) {
        this.submissionOrder.splice(index, 1);
      }
      
      console.log(`🗑️ [ActionQueue] Action supprimée: ${playerRole}`);
    }
    
    return removed;
  }
  
  getWaitTime(): number {
    if (this.submissionStart === 0) return 0;
    return Date.now() - this.submissionStart;
  }
  
  isTimedOut(): boolean {
    return this.getWaitTime() > this.maxWaitTime;
  }
  
  getTimeRemaining(): number {
    const elapsed = this.getWaitTime();
    return Math.max(0, this.maxWaitTime - elapsed);
  }
  
  clear(): void {
    this.actions.clear();
    this.submissionOrder = [];
    this.submissionStart = 0;
    
    console.log('🧹 [ActionQueue] File d\'attente vidée (étendue)');
  }
  
  reset(): void {
    this.clear();
    console.log('🔄 [ActionQueue] Reset effectué (étendu)');
  }
  
  setMaxWaitTime(timeMs: number): void {
    this.maxWaitTime = Math.max(1000, timeMs);
    console.log(`⏱️ [ActionQueue] Timeout configuré: ${this.maxWaitTime}ms`);
  }
  
  // === STATISTIQUES ÉTENDUES ===
  
  getStats(): any {
    const queueState = this.getQueueState();
    const priorityAnalysis = this.analyzePriorityOrderExtended();
    
    return {
      version: 'action_queue_v2_switch_extended',
      architecture: 'ActionQueue + Switch Priority System',
      currentState: queueState,
      waitTime: this.getWaitTime(),
      timeRemaining: this.getTimeRemaining(),
      isTimedOut: this.isTimedOut(),
      priorityAnalysis,
      
      // 🆕 NOUVELLES STATISTIQUES
      switchSupport: {
        enabled: this.switchActionsEnabled,
        maxSwitchActions: this.maxSwitchActions,
        conflictResolution: this.actionConflictResolution,
        currentSwitches: queueState.switchActionsCount
      },
      
      integrityChecks: {
        player1Valid: this.validateActionIntegrity('player1'),
        player2Valid: this.validateActionIntegrity('player2')
      },
      
      features: [
        'switch_action_priority_system',    // 🆕
        'action_conflict_resolution',       // 🆕
        'category_based_sorting',          // 🆕
        'validation_hash_system',          // 🆕
        'extended_priority_analysis',      // 🆕
        'priority_system',                 // 🔥 Conservé
        'speed_resolution',                // 🔥 Conservé
        'submission_tracking',             // 🔥 Conservé
        'timeout_management',              // 🔥 Conservé
        'special_action_detection'         // 🔥 Conservé étendu
      ]
    };
  }
}

export default ActionQueue;
