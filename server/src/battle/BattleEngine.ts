// server/src/battle/BattleEngine.ts
// ÉTAPE 2.6 : BattleEngine avec système narratif

import { TurnManager } from './modules/TurnManager';
import { ActionProcessor } from './modules/ActionProcessor';
import { AIPlayer } from './modules/AIPlayer';
import { BattleEndManager } from './modules/BattleEndManager';
import { BattleConfig, BattleGameState, BattleResult, BattleAction, BattleModule, TurnPlayer, PlayerRole } from './types/BattleTypes';

/**
 * BATTLE ENGINE - Chef d'orchestre du combat avec narrateur
 * 
 * Responsabilités :
 * - Coordonner les modules
 * - Maintenir l'état du jeu
 * - Gérer le tour narratif
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
  private narrativeTimer: NodeJS.Timeout | null = null;
  
  // === MODULES CORE ===
  private turnManager: TurnManager;
  private actionProcessor: ActionProcessor;
  private aiPlayer: AIPlayer;
  private battleEndManager: BattleEndManager;
  
  // === MODULES OPTIONNELS (ajoutés par étapes) ===
  private modules: Map<string, BattleModule> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  
  constructor() {
    console.log('🎯 [BattleEngine] Initialisation avec système narratif...');
    
    // Modules obligatoires
    this.turnManager = new TurnManager();
    this.actionProcessor = new ActionProcessor();
    this.aiPlayer = new AIPlayer();
    this.battleEndManager = new BattleEndManager();
    
    // État initial vide
    this.gameState = this.createEmptyState();
    
    console.log('✅ [BattleEngine] Prêt pour le combat narratif');
  }
  
  // === API PRINCIPALE (STABLE) ===
  
  /**
   * Démarre un nouveau combat avec tour narratif
   */
  startBattle(config: BattleConfig): BattleResult {
    console.log(`🚀 [BattleEngine] Démarrage combat ${config.type} avec narrateur`);
    
    try {
      // 1. Valider la configuration
      this.validateConfig(config);
      
      // 2. Initialiser l'état du jeu
      this.gameState = this.initializeGameState(config);
      
      // 3. Configurer les modules
      this.turnManager.initialize(this.gameState);
      this.actionProcessor.initialize(this.gameState);
      this.aiPlayer.initialize(this.gameState);
      this.battleEndManager.initialize(this.gameState);
      
      // 4. ✅ NOUVEAU: Démarrer par le tour narratif
      this.turnManager.startNarrativeTurn();
      
      this.isInitialized = true;
      
      // 5. ✅ NOUVEAU: Émettre événement narratif
      this.emit('battleStart', {
        gameState: this.gameState,
        isNarrative: true
      });
      
      // 6. ✅ NOUVEAU: Programmer la transition vers le combat
      this.narrativeTimer = setTimeout(() => {
        this.endNarrative();
      }, 3000); // 3 secondes de narration
      
      console.log(`✅ [BattleEngine] Combat démarré - Mode narratif (3s)`);
      
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
  
  // === ✅ NOUVEAU: GESTION NARRATIVE ===
  
  /**
   * Termine la narration et démarre le combat
   */
  private endNarrative(): void {
    if (!this.gameState || this.gameState.isEnded) {
      console.log('⏹️ [BattleEngine] Combat terminé pendant la narration');
      return;
    }
    
    console.log('📖→⚔️ [BattleEngine] Fin de la narration, début du combat');
    
    // Passer au premier combattant
    const firstCombatant = this.turnManager.nextTurn() as PlayerRole;
    
    // Émettre événements
    this.emit('narrativeEnd', {
      firstCombatant: firstCombatant,
      gameState: this.gameState
    });
    
    this.emit('turnChanged', {
      newPlayer: firstCombatant,
      turnNumber: this.gameState.turnNumber
    });
    
    console.log(`⚔️ [BattleEngine] Combat actif - Premier combattant: ${firstCombatant}`);
  }
  
  /**
   * Traite une action (bloquée pendant la narration)
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
    
    // ✅ NOUVEAU: Bloquer les actions pendant la narration
    if (this.turnManager.isNarrative()) {
      return {
        success: false,
        error: 'Attendez la fin de la présentation',
        gameState: this.gameState,
        events: ['Le combat va bientôt commencer...']
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
        
        // ✅ Vérifier fin de combat AVANT de changer de tour
        const battleEndCheck = this.checkBattleEnd();
        
        if (battleEndCheck.isEnded) {
          console.log(`🏁 [BattleEngine] Fin de combat détectée`);
          
          // Nettoyer le timer narratif si actif
          if (this.narrativeTimer) {
            clearTimeout(this.narrativeTimer);
            this.narrativeTimer = null;
          }
          
          // Marquer le combat comme terminé
          this.gameState.isEnded = true;
          this.gameState.winner = battleEndCheck.winner;
          this.gameState.phase = 'ended';
          
          // Sauvegarder les Pokémon via BattleEndManager
          this.savePokemonAfterBattle();
          
          // Émettre événement de fin
          this.emit('battleEnd', {
            winner: battleEndCheck.winner,
            reason: battleEndCheck.reason,
            gameState: this.gameState
          });
          
          // Retourner résultat avec fin de combat
          return {
            success: true,
            gameState: this.gameState,
            events: [...result.events, battleEndCheck.reason],
            data: {
              ...result.data,
              battleEnded: true,
              winner: battleEndCheck.winner
            }
          };
        }
        
        // Changer de tour seulement si le combat continue
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
   * Génère une action IA (bloquée pendant la narration)
   */
  generateAIAction(): BattleAction | null {
    console.log('🤖 [BattleEngine] Génération action IA');
    
    if (!this.isInitialized) {
      console.error('❌ [BattleEngine] Combat non initialisé pour IA');
      return null;
    }
    
    // ✅ NOUVEAU: Bloquer l'IA pendant la narration
    if (this.turnManager.isNarrative()) {
      console.log('📖 [BattleEngine] IA en attente de fin de narration');
      return null;
    }
    
    // Vérifier que c'est bien le tour de l'IA
    const currentPlayer = this.turnManager.getCurrentPlayer();
    if (currentPlayer !== 'player2') {
      console.error(`❌ [BattleEngine] Pas le tour de l'IA (tour actuel: ${currentPlayer})`);
      return null;
    }
    
    // Vérifier que le combat n'est pas terminé
    if (this.gameState.isEnded) {
      console.log('⏹️ [BattleEngine] Combat terminé, IA ne joue pas');
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
  
  // === VÉRIFICATION FIN DE COMBAT ===
  
  /**
   * Vérifie si le combat est terminé
   */
  private checkBattleEnd(): { isEnded: boolean; winner: PlayerRole | null; reason: string } {
    if (!this.gameState) {
      return { isEnded: false, winner: null, reason: '' };
    }
    
    const player1Pokemon = this.gameState.player1.pokemon;
    const player2Pokemon = this.gameState.player2.pokemon;
    
    if (!player1Pokemon || !player2Pokemon) {
      return { isEnded: false, winner: null, reason: '' };
    }
    
    // Vérifier si un Pokémon est K.O.
    const player1KO = player1Pokemon.currentHp <= 0;
    const player2KO = player2Pokemon.currentHp <= 0;
    
    if (player1KO && player2KO) {
      return {
        isEnded: true,
        winner: null,
        reason: 'Match nul ! Les deux Pokémon sont K.O.'
      };
    }
    
    if (player1KO) {
      return {
        isEnded: true,
        winner: 'player2',
        reason: `${player1Pokemon.name} est K.O. ! ${this.gameState.player2.name} gagne !`
      };
    }
    
    if (player2KO) {
      return {
        isEnded: true,
        winner: 'player1',
        reason: `${player2Pokemon.name} est K.O. ! ${this.gameState.player1.name} gagne !`
      };
    }
    
    // TODO: Autres conditions de fin (fuite, capture, etc.)
    
    return { isEnded: false, winner: null, reason: '' };
  }
  
  // === SAUVEGARDE POKÉMON ===
  
  /**
   * Sauvegarde les Pokémon après combat (asynchrone)
   */
  private async savePokemonAfterBattle(): Promise<void> {
    console.log('💾 [BattleEngine] Démarrage sauvegarde post-combat...');
    
    try {
      const result = await this.battleEndManager.savePokemonAfterBattle();
      
      if (result.success) {
        console.log('✅ [BattleEngine] Pokémon sauvegardés avec succès');
        
        // Émettre événement de sauvegarde
        this.emit('pokemonSaved', {
          events: result.events,
          data: result.data
        });
      } else {
        console.error(`❌ [BattleEngine] Erreur sauvegarde: ${result.error}`);
        
        // Émettre événement d'erreur
        this.emit('saveError', {
          error: result.error
        });
      }
      
    } catch (error) {
      console.error(`❌ [BattleEngine] Erreur critique sauvegarde:`, error);
    }
  }
  
  /**
   * Récupère le délai de réflexion de l'IA
   */
  getAIThinkingDelay(): number {
    return this.aiPlayer.getThinkingDelay();
  }
  
  /**
   * Récupère l'état actuel du jeu
   */
  getCurrentState(): BattleGameState {
    return { ...this.gameState }; // Copie pour éviter mutations
  }
  
  /**
   * Vérifie si on est en mode narratif
   */
  isNarrative(): boolean {
    return this.turnManager.isNarrative();
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
  
  // === NETTOYAGE ===
  
  /**
   * Nettoie les ressources du moteur
   */
  cleanup(): void {
    if (this.narrativeTimer) {
      clearTimeout(this.narrativeTimer);
      this.narrativeTimer = null;
    }
    console.log('🧹 [BattleEngine] Nettoyage effectué');
  }
  
  // === MÉTHODES PRIVÉES ===
  
  private createEmptyState(): BattleGameState {
    return {
      battleId: '',
      type: 'wild',
      phase: 'waiting',
      turnNumber: 0,
      currentTurn: 'narrator',
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
      turnNumber: 0, // Commence à 0 pour le narrateur
      currentTurn: 'narrator', // Commence par le narrateur
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
