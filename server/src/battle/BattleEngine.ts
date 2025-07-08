/**
   * Récupère l'état actuel du jeu
   */// server/src/battle/BattleEngine.ts
// ÉTAPE 1 : Fondations extensibles - Entrée en combat uniquement

import { TurnManager } from './modules/TurnManager';
import { ActionProcessor } from './modules/ActionProcessor';
import { AIPlayer } from './modules/AIPlayer';
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
  private actionProcessor: ActionProcessor;
  private aiPlayer: AIPlayer;
  
  // === MODULES OPTIONNELS (ajoutés par étapes) ===
  private modules: Map<string, BattleModule> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  
  constructor() {
    console.log('🎯 [BattleEngine] Initialisation...');
    
    // Modules obligatoires
    this.turnManager = new TurnManager();
    this.actionProcessor = new ActionProcessor();
    this.aiPlayer = new AIPlayer();
    
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
      this.actionProcessor.initialize(this.gameState);
      this.aiPlayer.initialize(this.gameState);
      
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
   * Traite une action
   */
  processAction(action: BattleAction): BattleResult {
    console.log(`🎮 [BattleEngine] Action reçue: ${action.type} par ${action.playerId}`);
    
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'Combat non initialisé',
        gameState: this.gameState,
        events: []
      };
    }
    
    try {
      // Vérifier si le joueur peut agir
      if (!this.turnManager.canPlayerAct(action.playerId)) {
        return {
          success: false,
          error: 'Ce n\'est pas votre tour',
          gameState: this.gameState,
          events: []
        };
      }
      
      // Traiter l'action via ActionProcessor
      const result = this.actionProcessor.processAction(action);
      
      if (result.success) {
        console.log(`✅ [BattleEngine] Action traitée avec succès`);
        
        // ✅ NOUVEAU: Changer de tour après une action réussie
        const nextPlayer = this.turnManager.nextTurn();
        console.log(`🔄 [BattleEngine] Tour suivant: ${nextPlayer}`);
        
        // Émettre événement de changement de tour
        this.emit('turnChanged', {
          newPlayer: nextPlayer,
          turnNumber: this.turnManager.getCurrentTurnNumber()
        });
        
        // Émettre événement d'action
        this.emit('actionProcessed', {
          action: action,
          result: result,
          nextPlayer: nextPlayer
        });
      } else {
        console.log(`❌ [BattleEngine] Échec action: ${result.error}`);
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ [BattleEngine] Erreur traitement action:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        gameState: this.gameState,
        events: []
      };
    }
  }
  
  /**
   * Génère une action IA
   */
  generateAIAction(): BattleAction | null {
    console.log('🤖 [BattleEngine] Génération action IA');
    
    if (!this.isInitialized) {
      console.error('❌ [BattleEngine] Combat non initialisé pour IA');
      return null;
    }
    
    // Vérifier que c'est bien le tour de l'IA
    const currentPlayer = this.turnManager.getCurrentPlayer();
    if (currentPlayer !== 'player2') {
      console.error(`❌ [BattleEngine] Pas le tour de l'IA (tour actuel: ${currentPlayer})`);
      return null;
    }
    
    // Générer l'action via AIPlayer
    const aiAction = this.aiPlayer.generateAction();
    
    if (aiAction) {
      console.log(`🤖 [BattleEngine] Action IA générée: ${aiAction.type}`);
    } else {
      console.error('❌ [BattleEngine] Échec génération action IA');
    }
    
    return aiAction;
  }
  
  /**
   * Récupère le délai de réflexion de l'IA
   */
  getAIThinkingDelay(): number {
    return this.aiPlayer.getThinkingDelay();
  }
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
