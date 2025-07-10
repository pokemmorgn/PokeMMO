// server/src/battle/modules/ActionQueue.ts
// FILE D'ATTENTE DES ACTIONS DE COMBAT

import { BattleAction, PlayerRole, Pokemon } from '../types/BattleTypes';

// === INTERFACES ===

export interface QueuedAction {
  action: BattleAction;
  playerRole: PlayerRole;
  pokemon: Pokemon;
  submittedAt: number;
  priority: number;
}

export interface ActionQueueState {
  hasPlayer1Action: boolean;
  hasPlayer2Action: boolean;
  player1Action?: QueuedAction;
  player2Action?: QueuedAction;
  isComplete: boolean;
  submissionOrder: PlayerRole[];
}

/**
 * ACTION QUEUE - File d'attente pour les actions de combat
 * 
 * Responsabilités :
 * - Stocker les actions des 2 joueurs
 * - Déterminer quand toutes les actions sont prêtes
 * - Organiser les actions par priorité/vitesse
 * - Gérer les cas spéciaux (capture, fuite)
 * - Historique des soumissions
 */
export class ActionQueue {
  
  private actions: Map<PlayerRole, QueuedAction> = new Map();
  private submissionOrder: PlayerRole[] = [];
  private maxWaitTime: number = 30000; // 30 secondes timeout
  private submissionStart: number = 0;
  
  constructor() {
    console.log('📋 [ActionQueue] File d\'attente initialisée');
  }
  
  // === SOUMISSION D'ACTIONS ===
  
  /**
   * Ajoute une action à la file
   */
  addAction(
    playerRole: PlayerRole, 
    action: BattleAction, 
    pokemon: Pokemon
  ): boolean {
    
    // Vérifier si une action existe déjà pour ce joueur
    if (this.hasAction(playerRole)) {
      console.log(`⚠️ [ActionQueue] Action déjà soumise pour ${playerRole}, remplacement`);
    }
    
    // Calculer la priorité de l'action
    const priority = this.calculateActionPriority(action, pokemon);
    
    // Créer l'action en file
    const queuedAction: QueuedAction = {
      action,
      playerRole,
      pokemon,
      submittedAt: Date.now(),
      priority
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
    
    console.log(`📥 [ActionQueue] Action ajoutée: ${playerRole} → ${action.type} (priorité: ${priority})`);
    
    return true;
  }
  
  /**
   * Vérifie si un joueur a soumis une action
   */
  hasAction(playerRole: PlayerRole): boolean {
    return this.actions.has(playerRole);
  }
  
  /**
   * Vérifie si toutes les actions sont prêtes
   */
  areAllActionsReady(): boolean {
    return this.actions.has('player1') && this.actions.has('player2');
  }
  
  /**
   * Compte le nombre d'actions en attente
   */
  getActionCount(): number {
    return this.actions.size;
  }
  
  // === RÉCUPÉRATION DES ACTIONS ===
  
  /**
   * Récupère une action spécifique
   */
  getAction(playerRole: PlayerRole): QueuedAction | null {
    return this.actions.get(playerRole) || null;
  }
  
  /**
   * Récupère toutes les actions
   */
  getAllActions(): QueuedAction[] {
    return Array.from(this.actions.values());
  }
  
  /**
   * Récupère les actions ordonnées par vitesse/priorité
   */
  getActionsBySpeed(): QueuedAction[] {
    const allActions = this.getAllActions();
    
    if (allActions.length === 0) {
      return [];
    }
    
    // Trier par priorité d'abord, puis par vitesse
    return allActions.sort((a, b) => {
      // 1. Priorité d'action (plus élevée = premier)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // 2. Vitesse du Pokémon (plus rapide = premier)
      const speedA = a.pokemon.speed || 0;
      const speedB = b.pokemon.speed || 0;
      
      if (speedA !== speedB) {
        return speedB - speedA;
      }
      
      // 3. Ordre de soumission en cas d'égalité parfaite
      const orderA = this.submissionOrder.indexOf(a.playerRole);
      const orderB = this.submissionOrder.indexOf(b.playerRole);
      
      return orderA - orderB;
    });
  }
  
  /**
   * Récupère les actions dans l'ordre de soumission
   */
  getActionsBySubmissionOrder(): QueuedAction[] {
    return this.submissionOrder
      .map(role => this.actions.get(role))
      .filter((action): action is QueuedAction => action !== undefined);
  }
  
  // === CALCULS DE PRIORITÉ ===
  
  /**
   * Calcule la priorité d'une action
   */
  private calculateActionPriority(action: BattleAction, pokemon: Pokemon): number {
    // Priorités d'actions selon les vrais jeux Pokémon
    switch (action.type) {
      case 'switch':
        return 6; // Changement = toujours en premier
        
      case 'item':
        return 5; // Objets = haute priorité
        
      case 'run':
        return 4; // Fuite = prioritaire
        
      case 'capture':
        return 3; // Capture = avant attaques
        
      case 'attack':
        return this.getMovePriority(action.data?.moveId || '');
        
      default:
        return 0; // Priorité normale
    }
  }
  
  /**
   * Récupère la priorité d'une attaque
   */
  private getMovePriority(moveId: string): number {
    // Base de données simplifiée des priorités d'attaques
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
    
    return movePriorities[moveId] || 0; // Priorité normale par défaut
  }
  
  // === GESTION SPÉCIALE ===
  
  /**
   * Traite les actions avec logique spéciale (capture, fuite)
   */
  hasSpecialAction(): { hasSpecial: boolean; actionType?: string; playerRole?: PlayerRole } {
    for (const [role, queuedAction] of this.actions) {
      if (['capture', 'run'].includes(queuedAction.action.type)) {
        return {
          hasSpecial: true,
          actionType: queuedAction.action.type,
          playerRole: role
        };
      }
    }
    
    return { hasSpecial: false };
  }
  
  /**
   * Retire une action spécifique
   */
  removeAction(playerRole: PlayerRole): boolean {
    const removed = this.actions.delete(playerRole);
    
    if (removed) {
      // Retirer de l'ordre de soumission aussi
      const index = this.submissionOrder.indexOf(playerRole);
      if (index > -1) {
        this.submissionOrder.splice(index, 1);
      }
      
      console.log(`🗑️ [ActionQueue] Action supprimée: ${playerRole}`);
    }
    
    return removed;
  }
  
  // === ÉTAT ET INFORMATIONS ===
  
  /**
   * État complet de la file d'attente
   */
  getQueueState(): ActionQueueState {
    const player1Action = this.actions.get('player1');
    const player2Action = this.actions.get('player2');
    
    return {
      hasPlayer1Action: !!player1Action,
      hasPlayer2Action: !!player2Action,
      player1Action,
      player2Action,
      isComplete: this.areAllActionsReady(),
      submissionOrder: [...this.submissionOrder]
    };
  }
  
  /**
   * Temps d'attente actuel
   */
  getWaitTime(): number {
    if (this.submissionStart === 0) return 0;
    return Date.now() - this.submissionStart;
  }
  
  /**
   * Vérifie si le timeout est dépassé
   */
  isTimedOut(): boolean {
    return this.getWaitTime() > this.maxWaitTime;
  }
  
  /**
   * Temps restant avant timeout
   */
  getTimeRemaining(): number {
    const elapsed = this.getWaitTime();
    return Math.max(0, this.maxWaitTime - elapsed);
  }
  
  // === DIAGNOSTICS ===
  
  /**
   * Analyse détaillée de la file d'attente
   */
  analyzePriorityOrder(): any {
    const orderedActions = this.getActionsBySpeed();
    
    return {
      totalActions: orderedActions.length,
      executionOrder: orderedActions.map((qa, index) => ({
        position: index + 1,
        playerRole: qa.playerRole,
        actionType: qa.action.type,
        priority: qa.priority,
        pokemonSpeed: qa.pokemon.speed,
        submittedAt: qa.submittedAt
      })),
      speedComparison: orderedActions.length === 2 ? {
        player1Speed: orderedActions.find(qa => qa.playerRole === 'player1')?.pokemon.speed || 0,
        player2Speed: orderedActions.find(qa => qa.playerRole === 'player2')?.pokemon.speed || 0,
        winner: orderedActions[0]?.playerRole
      } : null
    };
  }
  
  /**
   * Statistiques de performance
   */
  getStats(): any {
    return {
      version: 'action_queue_v1',
      currentState: this.getQueueState(),
      waitTime: this.getWaitTime(),
      timeRemaining: this.getTimeRemaining(),
      isTimedOut: this.isTimedOut(),
      priorityAnalysis: this.analyzePriorityOrder(),
      features: [
        'priority_system',
        'speed_resolution',
        'submission_tracking',
        'timeout_management',
        'special_action_detection'
      ]
    };
  }
  
  // === NETTOYAGE ===
  
  /**
   * Vide la file d'attente
   */
  clear(): void {
    this.actions.clear();
    this.submissionOrder = [];
    this.submissionStart = 0;
    
    console.log('🧹 [ActionQueue] File d\'attente vidée');
  }
  
  /**
   * Reset pour nouveau tour
   */
  reset(): void {
    this.clear();
    console.log('🔄 [ActionQueue] Reset effectué');
  }
  
  /**
   * Configure le timeout maximum
   */
  setMaxWaitTime(timeMs: number): void {
    this.maxWaitTime = Math.max(1000, timeMs); // Minimum 1 seconde
    console.log(`⏱️ [ActionQueue] Timeout configuré: ${this.maxWaitTime}ms`);
  }
}

export default ActionQueue;
