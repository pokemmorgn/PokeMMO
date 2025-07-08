// server/src/managers/battle/TurnSystem.ts
// Système de tours modulable pour tous types de combat

export type PlayerType = 'human' | 'ai' | 'spectator';
export type BattleFormat = 'single' | 'double' | 'triple' | 'rotation' | 'multi';
export type TurnMode = 'sequential' | 'simultaneous' | 'speed_based';

export interface PlayerSlot {
  id: string;                    // sessionId ou 'ai_1', 'ai_2', etc.
  type: PlayerType;
  name: string;
  teamSlot: number;              // 0 = équipe 1, 1 = équipe 2, etc.
  position: number;              // Position dans l'équipe (0, 1, 2...)
  isActive: boolean;             // Peut jouer actuellement
  hasActed: boolean;             // A déjà agi ce tour
  pokemonCount: number;          // Pokémon restants
  activePokemon: string[];       // IDs des Pokémon actifs
}

export interface TurnPhase {
  name: string;                  // 'selection', 'action', 'resolution', 'end'
  allowedActions: string[];      // Actions possibles dans cette phase
  waitingFor: string[];          // IDs des joueurs attendus
  timeLimit?: number;            // Limite de temps (ms)
}

export interface BattleConfiguration {
  format: BattleFormat;          // single, double, triple, etc.
  turnMode: TurnMode;            // sequential, simultaneous, speed_based
  maxPlayersPerTeam: number;     // 1, 2, 3, 4...
  maxTeams: number;              // 2, 3, 4 pour battle royale
  pokemonPerPlayer: number;      // 1-6
  activePokemonPerPlayer: number; // 1-3
  timeLimit: number;             // Temps par action
  allowSpectators: boolean;
}

/**
 * SYSTÈME DE TOURS MODULABLE
 * Gère tous les formats de combat possibles
 */
export class TurnSystem {
  private players: Map<string, PlayerSlot> = new Map();
  private currentPhase: TurnPhase;
  private turnNumber: number = 1;
  private config: BattleConfiguration;
  private actionQueue: Map<string, any> = new Map(); // Actions en attente
  
  constructor(config: BattleConfiguration) {
    this.config = config;
    this.currentPhase = {
      name: 'selection',
      allowedActions: ['pokemon_select'],
      waitingFor: [],
      timeLimit: config.timeLimit
    };
    
    console.log(`🎯 [TurnSystem] Système initialisé: ${config.format} (${config.turnMode})`);
  }
  
  // === GESTION DES JOUEURS ===
  
  /**
   * Ajoute un joueur au système de tours
   */
  addPlayer(
    id: string,
    type: PlayerType,
    name: string,
    teamSlot: number,
    position: number = 0
  ): void {
    const player: PlayerSlot = {
      id,
      type,
      name,
      teamSlot,
      position,
      isActive: true,
      hasActed: false,
      pokemonCount: this.config.pokemonPerPlayer,
      activePokemon: []
    };
    
    this.players.set(id, player);
    console.log(`👤 [TurnSystem] Joueur ajouté: ${name} (${type}) - Équipe ${teamSlot}, Position ${position}`);
  }
  
  /**
   * Configure automatiquement selon le format
   */
  autoConfigurePlayers(playerData: Array<{ id: string, type: PlayerType, name: string }>): void {
    console.log(`🔧 [TurnSystem] Configuration automatique: ${this.config.format}`);
    
    switch (this.config.format) {
      case 'single':
        // 1v1 classique
        this.addPlayer(playerData[0].id, playerData[0].type, playerData[0].name, 0, 0);
        this.addPlayer(playerData[1].id, playerData[1].type, playerData[1].name, 1, 0);
        break;
        
      case 'double':
        // 2v2 - Chaque joueur contrôle 2 Pokémon
        this.addPlayer(playerData[0].id, playerData[0].type, playerData[0].name, 0, 0);
        this.addPlayer(playerData[1].id, playerData[1].type, playerData[1].name, 1, 0);
        break;
        
      case 'multi':
        // 2v2 - 4 joueurs, 2 par équipe
        for (let i = 0; i < 4 && i < playerData.length; i++) {
          const teamSlot = Math.floor(i / 2); // 0,1,0,1
          const position = i % 2;             // 0,0,1,1
          this.addPlayer(playerData[i].id, playerData[i].type, playerData[i].name, teamSlot, position);
        }
        break;
        
      case 'triple':
        // 3v3 - Chaque joueur contrôle 3 Pokémon
        this.addPlayer(playerData[0].id, playerData[0].type, playerData[0].name, 0, 0);
        this.addPlayer(playerData[1].id, playerData[1].type, playerData[1].name, 1, 0);
        break;
    }
  }
  
  // === GESTION DES PHASES ===
  
  /**
   * Démarre un nouveau tour
   */
  startTurn(): void {
    console.log(`🔄 [TurnSystem] === DÉBUT TOUR ${this.turnNumber} ===`);
    
    // Reset des flags
    this.players.forEach(player => {
      player.hasActed = false;
    });
    
    this.actionQueue.clear();
    
    // Démarrer phase de sélection/action
    this.startActionPhase();
  }
  
  /**
   * Phase d'action selon le mode de tour
   */
  private startActionPhase(): void {
    this.currentPhase = {
      name: 'action',
      allowedActions: ['attack', 'item', 'pokemon', 'run'],
      waitingFor: this.getActivePlayerIds(),
      timeLimit: this.config.timeLimit
    };
    
    console.log(`⚔️ [TurnSystem] Phase d'action - Mode: ${this.config.turnMode}`);
    console.log(`⏰ [TurnSystem] En attente de: [${this.currentPhase.waitingFor.join(', ')}]`);
    
    switch (this.config.turnMode) {
      case 'sequential':
        this.processSequentialTurn();
        break;
        
      case 'simultaneous':
        this.processSimultaneousTurn();
        break;
        
      case 'speed_based':
        this.processSpeedBasedTurn();
        break;
    }
  }
  
  // === MODES DE TOUR ===
  
  /**
   * Mode séquentiel : Un joueur après l'autre
   */
  private processSequentialTurn(): void {
    const nextPlayer = this.getNextPlayerToAct();
    if (!nextPlayer) {
      this.endTurn();
      return;
    }
    
    this.currentPhase.waitingFor = [nextPlayer.id];
    console.log(`👤 [TurnSystem] Tour séquentiel: ${nextPlayer.name}`);
    
    // Notifier que c'est le tour de ce joueur
    this.onPlayerTurnStart(nextPlayer);
  }
  
  /**
   * Mode simultané : Tous les joueurs agissent en même temps
   */
  private processSimultaneousTurn(): void {
    const activePlayers = Array.from(this.players.values()).filter(p => p.isActive && !p.hasActed);
    this.currentPhase.waitingFor = activePlayers.map(p => p.id);
    
    console.log(`👥 [TurnSystem] Tour simultané: ${activePlayers.length} joueurs`);
    
    // Notifier tous les joueurs
    activePlayers.forEach(player => {
      this.onPlayerTurnStart(player);
    });
    
    // Démarrer timer global
    this.startPhaseTimer();
  }
  
  /**
   * Mode basé sur la vitesse : Ordre dynamique selon les stats
   */
  private processSpeedBasedTurn(): void {
    // Trier par vitesse des Pokémon actifs
    const speedOrder = this.calculateSpeedOrder();
    console.log(`⚡ [TurnSystem] Ordre vitesse:`, speedOrder.map(p => `${p.name}(${p.speed})`));
    
    // Traiter dans l'ordre de vitesse
    this.processSpeedOrderedActions(speedOrder);
  }
  
  // === GESTION DES ACTIONS ===
  
  /**
   * Reçoit une action d'un joueur
   */
  submitAction(playerId: string, action: any): boolean {
    const player = this.players.get(playerId);
    if (!player) {
      console.error(`❌ [TurnSystem] Joueur inconnu: ${playerId}`);
      return false;
    }
    
    if (player.hasActed) {
      console.warn(`⚠️ [TurnSystem] ${player.name} a déjà agi ce tour`);
      return false;
    }
    
    if (!this.currentPhase.waitingFor.includes(playerId)) {
      console.warn(`⚠️ [TurnSystem] Pas le tour de ${player.name}`);
      return false;
    }
    
    console.log(`✅ [TurnSystem] Action reçue: ${player.name} → ${action.type}`);
    
    // Stocker l'action
    this.actionQueue.set(playerId, action);
    player.hasActed = true;
    
    // Retirer de la liste d'attente
    this.currentPhase.waitingFor = this.currentPhase.waitingFor.filter(id => id !== playerId);
    
    // Vérifier si on peut continuer
    this.checkTurnProgression();
    
    return true;
  }
  
  /**
   * Vérifie si on peut passer à l'étape suivante
   */
  private checkTurnProgression(): void {
    switch (this.config.turnMode) {
      case 'sequential':
        // En séquentiel, passer au joueur suivant
        this.processSequentialTurn();
        break;
        
      case 'simultaneous':
        // En simultané, attendre que tous aient agi
        if (this.currentPhase.waitingFor.length === 0) {
          this.resolveAllActions();
        }
        break;
        
      case 'speed_based':
        // En speed-based, traiter l'action immédiatement
        this.resolveNextSpeedAction();
        break;
    }
  }
  
  // === RÉSOLUTION DES ACTIONS ===
  
  /**
   * Résout toutes les actions en attente
   */
  private resolveAllActions(): void {
    console.log(`🎬 [TurnSystem] Résolution de ${this.actionQueue.size} actions`);
    
    const actions = Array.from(this.actionQueue.entries());
    
    // Trier par priorité si nécessaire
    const sortedActions = this.sortActionsByPriority(actions);
    
    // Exécuter les actions
    this.executeActions(sortedActions);
  }
  
  /**
   * Trie les actions par priorité
   */
  private sortActionsByPriority(actions: Array<[string, any]>): Array<[string, any]> {
    return actions.sort((a, b) => {
      const priorityA = this.getActionPriority(a[1]);
      const priorityB = this.getActionPriority(b[1]);
      return priorityB - priorityA; // Priorité décroissante
    });
  }

  
  /**
   * Obtient la priorité d'une action
   */
  private getActionPriority(action: any): number {
    switch (action.type) {
      case 'pokemon': return 6;    // Changement Pokémon
      case 'item': return 5;       // Objets
      case 'attack': return action.priority || 0; // Attaques selon priority move
      case 'run': return -1;       // Fuite
      default: return 0;
    }
  }
  
  // === UTILITAIRES ===
  
  /**
   * Obtient le prochain joueur à agir (mode séquentiel)
   */
  private getNextPlayerToAct(): PlayerSlot | null {
    const activePlayers = Array.from(this.players.values())
      .filter(p => p.isActive && !p.hasActed)
      .sort((a, b) => {
        // Trier par équipe puis position
        if (a.teamSlot !== b.teamSlot) return a.teamSlot - b.teamSlot;
        return a.position - b.position;
      });
    
    return activePlayers[0] || null;
  }
  
  /**
   * Obtient les IDs des joueurs actifs
   */
  private getActivePlayerIds(): string[] {
    return Array.from(this.players.values())
      .filter(p => p.isActive)
      .map(p => p.id);
  }
  
  /**
   * Calcule l'ordre de vitesse
   */
  private calculateSpeedOrder(): Array<{ id: string, name: string, speed: number }> {
    // TODO: Récupérer la vitesse réelle des Pokémon actifs
    return Array.from(this.players.values())
      .filter(p => p.isActive)
      .map(p => ({ id: p.id, name: p.name, speed: Math.random() * 100 }))
      .sort((a, b) => b.speed - a.speed);
  }
  
  // === ÉVÉNEMENTS (À IMPLÉMENTER) ===
  
  private onPlayerTurnStart(player: PlayerSlot): void {
    console.log(`🎯 [TurnSystem] Tour de ${player.name} (${player.type})`);
    // TODO: Notifier BattleRoom
  }
  
  private startPhaseTimer(): void {
    // TODO: Timer pour phase simultanée
  }
  
  private processSpeedOrderedActions(speedOrder: any[]): void {
    // TODO: Traitement séquentiel par vitesse
  }
  
  private resolveNextSpeedAction(): void {
    // TODO: Résolution action suivante en mode speed
  }
  
  private executeActions(actions: Array<[string, any]>): void {
    // TODO: Exécution des actions via BattleIntegration
  }
  
  private endTurn(): void {
    this.turnNumber++;
    console.log(`🏁 [TurnSystem] Fin du tour ${this.turnNumber - 1}`);
    // TODO: Vérifier conditions de fin, démarrer tour suivant
  }
  
  // === API PUBLIQUE ===
  
  /**
   * Obtient l'état actuel du système
   */
  getState(): any {
    return {
      turnNumber: this.turnNumber,
      currentPhase: this.currentPhase,
      players: Array.from(this.players.values()),
      config: this.config
    };
  }

  /**
 * Réinitialise les actions des joueurs pour un nouveau tour
 */
resetPlayerActions(): void {
  this.players.forEach(player => {
    player.hasActed = false;
  });
  console.log(`🔄 [TurnSystem] Actions réinitialisées pour le nouveau tour`);
}
  /**
   * Vérifie si un joueur peut agir
   */
  canPlayerAct(playerId: string): boolean {
    const player = this.players.get(playerId);
    return !!(player && player.isActive && !player.hasActed && 
             this.currentPhase.waitingFor.includes(playerId));
  }
}

// === CONFIGURATIONS PRÉDÉFINIES ===

export const BATTLE_CONFIGS = {
  SINGLE_PVE: {
    format: 'single' as BattleFormat,
    turnMode: 'sequential' as TurnMode,
    maxPlayersPerTeam: 1,
    maxTeams: 2,
    pokemonPerPlayer: 6,
    activePokemonPerPlayer: 1,
    timeLimit: 30000,
    allowSpectators: true
  },
  
  SINGLE_PVP: {
    format: 'single' as BattleFormat,
    turnMode: 'simultaneous' as TurnMode,
    maxPlayersPerTeam: 1,
    maxTeams: 2,
    pokemonPerPlayer: 6,
    activePokemonPerPlayer: 1,
    timeLimit: 45000,
    allowSpectators: true
  },
  
  DOUBLE_BATTLE: {
    format: 'double' as BattleFormat,
    turnMode: 'speed_based' as TurnMode,
    maxPlayersPerTeam: 1,
    maxTeams: 2,
    pokemonPerPlayer: 6,
    activePokemonPerPlayer: 2,
    timeLimit: 60000,
    allowSpectators: true
  },
  
  MULTI_BATTLE: {
    format: 'multi' as BattleFormat,
    turnMode: 'simultaneous' as TurnMode,
    maxPlayersPerTeam: 2,
    maxTeams: 2,
    pokemonPerPlayer: 3,
    activePokemonPerPlayer: 1,
    timeLimit: 45000,
    allowSpectators: true
  }
};

export default TurnSystem;
