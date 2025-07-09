// server/src/battle/BattleEngine.ts
// ÉTAPE INTÉGRATION 1 : Ajout BroadcastManager + IDs SEULEMENT

import { TurnManager } from './modules/TurnManager';
import { ActionProcessor } from './modules/ActionProcessor';
import { AIPlayer } from './modules/AIPlayer';
import { BattleEndManager } from './modules/BattleEndManager';
import { CaptureManager } from './modules/CaptureManager';
import { SpectatorManager } from './modules/SpectatorManager';
import { BroadcastManagerFactory } from './modules/broadcast/BroadcastManagerFactory';
import { BroadcastManager } from './modules/broadcast/BroadcastManager';
import { BattleConfig, BattleGameState, BattleResult, BattleAction, BattleModule, TurnPlayer, PlayerRole } from './types/BattleTypes';

/**
 * BATTLE ENGINE - Chef d'orchestre du combat avec BroadcastManager
 * 
 * PRINCIPE : IDs SEULEMENT côté serveur
 * - Pas de texte traduit
 * - Pas de messages en français
 * - Client traduit via BattleTranslator
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
  private captureManager: CaptureManager;
  
  // === ✅ NOUVEAU: BROADCAST ET SPECTATEURS ===
  private broadcastManager: BroadcastManager | null = null;
  private spectatorManager: SpectatorManager | null = null;
  
  // === MODULES OPTIONNELS ===
  private modules: Map<string, BattleModule> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  
  constructor() {
    console.log('🎯 [BattleEngine] Initialisation avec BroadcastManager...');
    
    // Modules obligatoires
    this.turnManager = new TurnManager();
    this.actionProcessor = new ActionProcessor();
    this.aiPlayer = new AIPlayer();
    this.battleEndManager = new BattleEndManager();
    this.captureManager = new CaptureManager();
    
    // État initial vide
    this.gameState = this.createEmptyState();
    
    console.log('✅ [BattleEngine] Prêt pour le combat avec timing serveur');
  }
  
  // === ✅ NOUVEAU: CONFIGURATION BROADCAST + SPECTATEURS ===
  
  /**
   * Configure le BroadcastManager avec callback d'émission
   */
  configureBroadcast(emitCallback: (event: any) => void): void {
    if (this.broadcastManager) {
      this.broadcastManager.setEmitCallback(emitCallback);
      console.log('📡 [BattleEngine] Callback broadcast configuré');
    }
  }
  
  /**
   * Ajoute un spectateur au combat
   */
  addSpectator(sessionId: string, username: string): boolean {
    if (this.spectatorManager) {
      const success = this.spectatorManager.addSpectator(sessionId, username);
      if (success && this.broadcastManager) {
        this.broadcastManager.addSpectator(sessionId);
      }
      return success;
    }
    return false;
  }
  
  /**
   * Retire un spectateur
   */
  removeSpectator(sessionId: string): boolean {
    if (this.spectatorManager) {
      const success = this.spectatorManager.removeSpectator(sessionId);
      if (success && this.broadcastManager) {
        this.broadcastManager.removeUser(sessionId);
      }
      return success;
    }
    return false;
  }
  
  /**
   * Récupère les spectateurs
   */
  getSpectators(): any[] {
    return this.spectatorManager?.getSpectatorsList() || [];
  }
  
  // === API PRINCIPALE ===
  
  /**
   * Démarre un nouveau combat avec BroadcastManager
   */
  startBattle(config: BattleConfig): BattleResult {
    console.log(`🚀 [BattleEngine] Démarrage combat ${config.type} avec BroadcastManager`);
    
    try {
      // 1. Valider la configuration
      this.validateConfig(config);
      
      // 2. Initialiser l'état du jeu
      this.gameState = this.initializeGameState(config);
      
      // 3. ✅ NOUVEAU: Créer BroadcastManager + SpectatorManager
      this.broadcastManager = BroadcastManagerFactory.createForWildBattle(
        this.gameState.battleId,
        this.gameState,
        this.gameState.player1.sessionId
      );
      
      this.spectatorManager = new SpectatorManager(
        this.gameState.battleId,
        this.gameState,
        { isPublic: config.type === 'wild', maxSpectators: 20 }
      );
      
      // 4. Configurer les modules
      this.turnManager.initialize(this.gameState);
      this.actionProcessor.initialize(this.gameState);
      this.aiPlayer.initialize(this.gameState);
      this.battleEndManager.initialize(this.gameState);
      this.captureManager.initialize(this.gameState);
      
      // 5. Démarrer par le tour narratif
      this.turnManager.startNarrativeTurn();
      
      this.isInitialized = true;
      
      // 6. ✅ NOUVEAU: Émettre via BroadcastManager (IDs seulement)
      if (this.broadcastManager) {
        this.broadcastManager.emit('battleStart', {
          gameState: this.gameState,
          isNarrative: true,
          player1Name: this.gameState.player1.name,
          player2Name: this.gameState.player2.name,
          player1PokemonName: this.gameState.player1.pokemon?.name,
          player2PokemonName: this.gameState.player2.pokemon?.name,
          player1PokemonId: this.gameState.player1.pokemon?.id,
          player2PokemonId: this.gameState.player2.pokemon?.id
        });
      }
      
      // 7. Programmer la transition vers le combat
      this.narrativeTimer = setTimeout(() => {
        this.endNarrative();
      }, 3000);
      
      console.log(`✅ [BattleEngine] Combat démarré avec BroadcastManager`);
      
      return {
        success: true,
        gameState: this.gameState,
        events: [] // Pas d'événements texte côté serveur
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
  
  // === ✅ NOUVEAU: GESTION NARRATIVE AVEC BROADCAST ===
  
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
    
    // ✅ NOUVEAU: Émettre via BroadcastManager (IDs seulement)
    if (this.broadcastManager) {
      this.broadcastManager.emit('narrativeEnd', {
        firstCombatant: firstCombatant,
        gameState: this.gameState
      });
      
      // ✅ NOUVEAU: Utiliser la séquence de transition de tour
      this.broadcastManager.emitTurnTransition(
        firstCombatant,
        firstCombatant === 'player1' ? this.gameState.player1.name : this.gameState.player2.name,
        firstCombatant === 'player2' // isAI
      );
    }
    
    console.log(`⚔️ [BattleEngine] Combat actif - Premier combattant: ${firstCombatant}`);
  }
  
  /**
   * Traite une action avec BroadcastManager
   */
  async processAction(action: BattleAction, teamManager?: any): Promise<BattleResult> {
    console.log(`🎮 [BattleEngine] Action reçue: ${action.type} par ${action.playerId}`);
    
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'Combat non initialisé',
        gameState: this.gameState,
        events: []
      };
    }
    
    if (this.gameState.isEnded) {
      console.log(`❌ [BattleEngine] Action refusée: Combat déjà terminé`);
      return {
        success: false,
        error: 'Combat déjà terminé',
        gameState: this.gameState,
        events: []
      };
    }
    
    // Bloquer les actions pendant la narration
    if (this.turnManager.isNarrative()) {
      return {
        success: false,
        error: 'Attendez la fin de la présentation',
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
      
      // Traiter l'action selon son type
      let result: BattleResult;
      
      if (action.type === 'capture') {
        // Déléguer au CaptureManager avec BroadcastManager
        result = await this.processCaptureWithBroadcast(action, teamManager);
      } else if (action.type === 'attack') {
        // ✅ NOUVEAU: Traiter attaque avec BroadcastManager
        result = await this.processAttackWithBroadcast(action);
      } else {
        // Traiter via ActionProcessor pour les autres actions
        result = this.actionProcessor.processAction(action);
      }
      
      if (result.success) {
        console.log(`✅ [BattleEngine] Action traitée avec succès`);
        
        // Vérifier fin de combat pour capture
        if (action.type === 'capture' && result.data?.captured && result.data?.battleEnded) {
          console.log(`🎉 [BattleEngine] Combat terminé par capture !`);
          await this.endBattleWithBroadcast('player1', 'capture_victory');
          return result;
        }
        
        // Vérifier fin de combat pour autres actions
        const battleEndCheck = this.checkBattleEnd();
        
        if (battleEndCheck.isEnded) {
          console.log(`🏁 [BattleEngine] Fin de combat détectée`);
          await this.endBattleWithBroadcast(battleEndCheck.winner, battleEndCheck.reasonId);
          
          return {
            success: true,
            gameState: this.gameState,
            events: [],
            data: {
              ...result.data,
              battleEnded: true,
              winner: battleEndCheck.winner
            }
          };
        }
        
        // Changer de tour si nécessaire
        if (!(action.type === 'capture' && !result.data?.captured)) {
          const nextPlayer = this.turnManager.nextTurn();
          console.log(`🔄 [BattleEngine] Tour suivant: ${nextPlayer}`);
          
          // ✅ NOUVEAU: Transition de tour avec BroadcastManager
          if (this.broadcastManager && nextPlayer !== 'narrator') {
            const playerRole = nextPlayer as PlayerRole; // Cast sécurisé après vérification
            await this.broadcastManager.emitTurnTransition(
              playerRole,
              playerRole === 'player1' ? this.gameState.player1.name : this.gameState.player2.name,
              playerRole === 'player2' // isAI
            );
          }
        }
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
  
  // === ✅ NOUVEAU: MÉTHODES AVEC BROADCAST ===
  
  /**
   * Traite une attaque avec BroadcastManager (IDs seulement)
   */
  private async processAttackWithBroadcast(action: BattleAction): Promise<BattleResult> {
    console.log(`⚔️ [BattleEngine] Traitement attaque avec BroadcastManager`);
    
    // Traiter via ActionProcessor
    const result = this.actionProcessor.processAction(action);
    
    if (result.success && this.broadcastManager && result.data) {
      // ✅ NOUVEAU: Utiliser emitAttackSequence avec IDs seulement
      const attackData = BroadcastManagerFactory.createAttackData(
        {
          name: result.data.attackerRole === 'player1' ? 
            this.gameState.player1.pokemon?.name || 'Unknown' : 
            this.gameState.player2.pokemon?.name || 'Unknown',
          role: result.data.attackerRole
        },
        {
          name: result.data.defenderRole === 'player1' ? 
            this.gameState.player1.pokemon?.name || 'Unknown' : 
            this.gameState.player2.pokemon?.name || 'Unknown',
          role: result.data.defenderRole
        },
        {
          id: result.data.moveUsed || 'unknown_move',
          name: result.data.moveUsed || 'unknown_move' // ✅ CORRECTION: Pas de traduction
        },
        result.data.damage || 0,
        result.data.oldHp || 0,
        result.data.newHp || 0,
        this.getMaxHpForRole(result.data.defenderRole),
        this.calculateEffects(result.data) // ✅ NOUVEAU: Calcul des effets
      );
      
      // Émettre la séquence complète avec timing optimal
      await this.broadcastManager.emitAttackSequence(attackData);
    }
    
    return result;
  }
  
  /**
   * Traite une capture avec BroadcastManager
   */
  private async processCaptureWithBroadcast(action: BattleAction, teamManager: any): Promise<BattleResult> {
    console.log(`🎯 [BattleEngine] Traitement capture avec BroadcastManager`);
    
    // Pour l'instant, déléguer au CaptureManager normal
    // ✅ NOUVEAU: Configurer CaptureManager avec BroadcastManager
    if (!teamManager) {
      return {
        success: false,
        error: 'TeamManager requis pour la capture',
        gameState: this.gameState,
        events: []
      };
    }
    
    this.captureManager.initialize(this.gameState);
    
    // Configurer BroadcastManager dans CaptureManager
    if (this.broadcastManager) {
      this.captureManager.setBroadcastManager(this.broadcastManager);
    }
    
    return await this.captureManager.attemptCapture(action.playerId, action.data.ballType || 'poke_ball', teamManager);
  }
  
  /**
   * Termine le combat avec BroadcastManager (IDs seulement)
   */
  private async endBattleWithBroadcast(winner: PlayerRole | null, reasonId: string): Promise<void> {
    if (this.narrativeTimer) {
      clearTimeout(this.narrativeTimer);
      this.narrativeTimer = null;
    }
    
    this.gameState.isEnded = true;
    this.gameState.winner = winner;
    this.gameState.phase = 'ended';
    
    // Sauvegarder les Pokémon
    this.savePokemonAfterBattle();
    
    // ✅ NOUVEAU: Émettre fin de combat avec BroadcastManager (IDs seulement)
    if (this.broadcastManager) {
      await this.broadcastManager.emitBattleEnd(winner, reasonId);
    }
  }
  
  // === ✅ NOUVEAU: MÉTHODES UTILITAIRES ===
  
  /**
   * Calcule les effets d'une attaque (IDs seulement)
   */
  private calculateEffects(resultData: any): string[] {
    const effects: string[] = [];
    
    // TODO: Implémenter logique des effets de type
    // Pour l'instant, retourner tableau vide
    // Plus tard: 'super_effective', 'not_very_effective', 'no_effect', 'critical_hit'
    
    return effects;
  }
  
  /**
   * Récupère les HP max selon le rôle
   */
  private getMaxHpForRole(role: PlayerRole): number {
    if (role === 'player1') {
      return this.gameState.player1.pokemon?.maxHp || 100;
    } else {
      return this.gameState.player2.pokemon?.maxHp || 100;
    }
  }
  
  // === ✅ CORRECTION: MÉTHODES AVEC IDs SEULEMENT ===
  
  /**
   * Vérifie la fin de combat (IDs seulement)
   */
  private checkBattleEnd(): { isEnded: boolean; winner: PlayerRole | null; reasonId: string } {
    if (!this.gameState) {
      return { isEnded: false, winner: null, reasonId: '' };
    }
    
    const player1Pokemon = this.gameState.player1.pokemon;
    const player2Pokemon = this.gameState.player2.pokemon;
    
    if (!player1Pokemon || !player2Pokemon) {
      return { isEnded: false, winner: null, reasonId: '' };
    }
    
    const player1KO = player1Pokemon.currentHp <= 0;
    const player2KO = player2Pokemon.currentHp <= 0;
    
    if (player1KO && player2KO) {
      return {
        isEnded: true,
        winner: null,
        reasonId: 'draw_both_fainted' // ✅ CORRECTION: ID seulement
      };
    }
    
    if (player1KO) {
      return {
        isEnded: true,
        winner: 'player2',
        reasonId: 'player1_pokemon_fainted' // ✅ CORRECTION: ID seulement
      };
    }
    
    if (player2KO) {
      return {
        isEnded: true,
        winner: 'player1',
        reasonId: 'player2_pokemon_fainted' // ✅ CORRECTION: ID seulement
      };
    }
    
    return { isEnded: false, winner: null, reasonId: '' };
  }
  
  // === MÉTHODES EXISTANTES (inchangées) ===
  
  private async savePokemonAfterBattle(): Promise<void> {
    console.log('💾 [BattleEngine] Démarrage sauvegarde post-combat...');
    
    try {
      const result = await this.battleEndManager.savePokemonAfterBattle();
      
      if (result.success) {
        console.log('✅ [BattleEngine] Pokémon sauvegardés avec succès');
      } else {
        console.error(`❌ [BattleEngine] Erreur sauvegarde: ${result.error}`);
      }
      
    } catch (error) {
      console.error(`❌ [BattleEngine] Erreur critique sauvegarde:`, error);
    }
  }
  
  // === API PUBLIQUE (inchangée) ===
  
  generateAIAction(): BattleAction | null {
    if (!this.isInitialized || this.turnManager.isNarrative() || this.gameState.isEnded) {
      return null;
    }
    
    const currentPlayer = this.turnManager.getCurrentPlayer();
    if (currentPlayer !== 'player2') {
      return null;
    }
    
    return this.aiPlayer.generateAction();
  }
  
  getCurrentState(): BattleGameState {
    return { ...this.gameState };
  }
  
  isNarrative(): boolean {
    return this.turnManager.isNarrative();
  }
  
  getAIThinkingDelay(): number {
    return this.aiPlayer.getThinkingDelay();
  }
  
  // === SYSTÈME D'EXTENSION (inchangé) ===
  
  addModule(name: string, module: BattleModule): void {
    this.modules.set(name, module);
    module.initialize(this);
  }
  
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
  
  cleanup(): void {
    if (this.narrativeTimer) {
      clearTimeout(this.narrativeTimer);
      this.narrativeTimer = null;
    }
    
    if (this.broadcastManager) {
      this.broadcastManager.cleanup();
      this.broadcastManager = null;
    }
    
    if (this.spectatorManager) {
      this.spectatorManager.cleanup();
      this.spectatorManager = null;
    }
    
    console.log('🧹 [BattleEngine] Nettoyage effectué');
  }
  
  // === MÉTHODES UTILITAIRES (inchangées) ===
  
  private getPlayerName(playerId: string): string {
    if (!this.gameState) return playerId;
    
    if (playerId === this.gameState.player1.sessionId) {
      return this.gameState.player1.name;
    } else if (playerId === this.gameState.player2.sessionId) {
      return this.gameState.player2.name;
    }
    
    return playerId;
  }
  
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
      turnNumber: 0,
      currentTurn: 'narrator',
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
