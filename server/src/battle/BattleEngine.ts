// server/src/battle/BattleEngine.ts
// ÉTAPE 1 : Fondations extensibles - Entrée en combat uniquement

import { TurnManager } from './modules/TurnManager';
import { BattleConfig, BattleGameState, BattleResult, BattleAction, BattleModule } from './types/BattleTypes';

/**
 * BATTLE ENGINE - Chef d'orchestre du combat
 * 
 * Responsabilités :
 * - Coordonner les modules
 * - Maintenir l'état du jeu
 * - API stable pour BattleRoom
 * 
 * Extensibilité :
 * - Modules ajoutés progressivement
 * - Interface stable
 * - Système d'événements
 */
export class BattleEngine {
  
  // === ÉTAT DU JEU ===
  private gameState: BattleGameState;
  private isInitialized: boolean = false;
  
  // === MODULES CORE ===
  private turnManager: TurnManager;
  
  // === MODULES OPTIONNELS (ajoutés par étapes) ===
  private modules: Map<string, BattleModule> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  
  constructor() {
    console.log('🎯 [BattleEngine] Initialisation...');
    
    // Module obligatoire : gestion des tours
    this.turnManager = new TurnManager();
    
    // État initial vide
    this.gameState = this.createEmptyState();
    
    console.log('✅ [BattleEngine] Prêt pour le combat');
  }
  
  // === API PRINCIPALE (STABLE) ===
  
  /**
   * Démarre un nouveau combat
   */
  startBattle(config: BattleConfig): BattleResult {
    console.log(`🚀 [BattleEngine] Démarrage combat ${config.type}`);
    
    try {
      // 1. Valider la configuration
      this.validateConfig(config);
      
      // 2. Initialiser l'état du jeu
      this.gameState = this.initializeGameState(config);
      
      // 3. Configurer les modules
      this.turnManager.initialize(this.gameState);
      
      // 4. Déterminer qui commence
      const firstPlayer = this.turnManager.determineFirstPlayer(
        this.gameState.player1.pokemon,
        this.gameState.player2.pokemon
      );
      this.gameState.currentTurn = firstPlayer;
      
      this.isInitialized = true;
      
      // 5. Émettre événement de début
      this.emit('battleStart', {
        gameState: this.gameState,
        firstPlayer: firstPlayer
      });
      
      console.log(`✅ [BattleEngine] Combat démarré - Premier joueur: ${firstPlayer}`);
      
      return {
        success: true,
        gameState: this.gameState,
        events: [`Combat démarré ! ${this.gameState.player1.pokemon.name} VS ${this.gameState.player2.pokemon.name}`]
      };
      
    } catch (error) {
      console.error(`❌ [BattleEngine] Erreur démarrage:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        gameState: this.gameState,
        events: []
      };
    }
  }
  
  /**
   * Traite une action (pour plus tard)
   */
  processAction(action: BattleAction): BattleResult {
    console.log(`🎮 [BattleEngine] Action reçue: ${action.type}`);
    
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'Combat non initialisé',
        gameState: this.gameState,
        events: []
      };
    }
    
    // ÉTAPE 1 : Pas d'actions encore, juste loguer
    console.log(`⏸️ [BattleEngine] Actions pas encore implémentées`);
    
    return {
      success: false,
      error: 'Actions pas encore implémentées',
      gameState: this.gameState,
      events: ['Actions bientôt disponibles...']
    };
  }
  
  /**
   * Récupère l'état actuel du jeu
   */
  getCurrentState(): BattleGameState {
    return { ...this.gameState }; // Copie pour éviter mutations
  }
  
  // === SYSTÈME D'EXTENSION ===
  
  /**
   * Ajoute un module au moteur
   */
  addModule(name: string, module: BattleModule): void {
    console.log(`🔧 [BattleEngine] Ajout module: ${name}`);
    
    this.modules.set(name, module);
    module.initialize(this);
    
    console.log(`✅ [BattleEngine] Module ${name} ajouté`);
  }
  
  /**
   * Système d'événements
   */
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
      currentTurn: 'player1', // Déterminé plus tard
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
  

}

export default BattleEngine;
