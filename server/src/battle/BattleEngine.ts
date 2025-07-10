// server/src/battle/BattleEngine.ts
// ÉTAPE 2.6 : BattleEngine avec système narratif + CAPTURE

import { TurnManager } from './modules/TurnManager';
import { ActionProcessor } from './modules/ActionProcessor';
import { AIPlayer } from './modules/AIPlayer';
import { BattleEndManager } from './modules/BattleEndManager';
import { CaptureManager } from './modules/CaptureManager';
import { BattleConfig, BattleGameState, BattleResult, BattleAction, BattleModule, TurnPlayer, PlayerRole } from './types/BattleTypes';

import { BroadcastManager } from './modules/BroadcastManager';
import { BroadcastManagerFactory } from './modules/broadcast/BroadcastManagerFactory';
import { SpectatorManager } from './modules/broadcast/SpectatorManager';
import { BATTLE_TIMINGS } from './modules/BroadcastManager';
/**
 * BATTLE ENGINE - Chef d'orchestre du combat avec narrateur + capture
 * 
 * Responsabilités :
 * - Coordonner les modules
 * - Maintenir l'état du jeu
 * - Gérer le tour narratif
 * - Gérer la capture de Pokémon
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
  private captureManager: CaptureManager;


  private broadcastManager: BroadcastManager | null = null;
  private spectatorManager: SpectatorManager | null = null;
  
  // === MODULES OPTIONNELS (ajoutés par étapes) ===
  private modules: Map<string, BattleModule> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  
  constructor() {
    console.log('🎯 [BattleEngine] Initialisation avec système narratif + capture...');
    
    // Modules obligatoires
    this.turnManager = new TurnManager();
    this.actionProcessor = new ActionProcessor();
    this.aiPlayer = new AIPlayer();
    this.battleEndManager = new BattleEndManager();
    this.captureManager = new CaptureManager();
    
    // État initial vide
    this.gameState = this.createEmptyState();
    
    console.log('✅ [BattleEngine] Prêt pour le combat narratif + capture');
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
      this.configureBroadcastSystem(config);
      this.turnManager.initialize(this.gameState);
      this.actionProcessor.initialize(this.gameState);
      this.aiPlayer.initialize(this.gameState);
      this.battleEndManager.initialize(this.gameState);
      this.captureManager.initialize(this.gameState);
      
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
 * Traite une action avec timing Pokémon authentique
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
    console.log(`❌ [BattleEngine] Action refusée: Combat déjà terminé (winner: ${this.gameState.winner})`);
    return {
      success: false,
      error: 'Combat déjà terminé',
      gameState: this.gameState,
      events: ['Le combat est déjà terminé !']
    };
  }
  
  // Bloquer les actions pendant la narration
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
    
    // Traiter l'action selon son type
    let result: BattleResult;
    
    if (action.type === 'capture') {
      // Déléguer au CaptureManager
      if (!teamManager) {
        return {
          success: false,
          error: 'TeamManager requis pour la capture',
          gameState: this.gameState,
          events: []
        };
      }
      this.captureManager.initialize(this.gameState);
      result = await this.captureManager.attemptCapture(action.playerId, action.data.ballType || 'poke_ball', teamManager);
    } else {
      // Traiter via ActionProcessor pour les autres actions
      result = this.actionProcessor.processAction(action);
    }
    
    if (result.success) {
      console.log(`✅ [BattleEngine] Action traitée avec succès`);
      
      // Vérifier si la capture a terminé le combat
      if (action.type === 'capture' && result.data?.captured && result.data?.battleEnded) {
        console.log(`🎉 [BattleEngine] Combat terminé par capture !`);
        
        // Nettoyer le timer narratif si actif
        if (this.narrativeTimer) {
          clearTimeout(this.narrativeTimer);
          this.narrativeTimer = null;
        }
        
        // Marquer le combat comme terminé
        this.gameState.isEnded = true;
        this.gameState.winner = result.data.winner;
        this.gameState.phase = 'ended';
        
        // Émettre événement de fin par capture
        this.emit('battleEnd', {
          winner: result.data.winner,
          reason: 'Pokémon capturé !',
          gameState: this.gameState,
          captureSuccess: true
        });
        
        return result;
      }
      
      // Vérifier fin de combat AVANT de changer de tour
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
      
      // ✅ NOUVEAU: TIMING POKÉMON AUTHENTIQUE (AVANT nextTurn)
      if (this.broadcastManager && action.type === 'attack' && result.data) {
        // 1. Envoyer attaque + dégâts INSTANTANÉMENT
        this.broadcastManager.emitAttackSequence({
          attacker: { 
            name: this.getPlayerName(action.playerId), 
            role: action.playerId === this.gameState.player1.sessionId ? 'player1' : 'player2' 
          },
          target: { 
            name: result.data.defenderRole === 'player1' ? this.gameState.player1.name : this.gameState.player2.name,
            role: result.data.defenderRole 
          },
          move: { 
            id: action.data.moveId, 
            name: action.data.moveId
          },
          damage: result.data.damage || 0,
          oldHp: result.data.oldHp || 0,
          newHp: result.data.newHp || 0,
          maxHp: result.data.maxHp || 100,
          effects: [], // TODO: Calculer effets
          isKnockedOut: result.data.isKnockedOut || false
        });
        
        // 2. TIMING CONTRÔLÉ PAR LE COMBAT
        await this.emitTypeEffects([], {
          targetName: result.data.defenderRole === 'player1' ? this.gameState.player1.name : this.gameState.player2.name,
          targetRole: result.data.defenderRole
        });
        
        // 3. DÉLAI FINAL avant tour suivant (2s comme Pokémon)
        await this.delay(BATTLE_TIMINGS.transitionSlow);
        
        console.log(`⏱️ [BattleEngine] Timing Pokémon terminé, changement de tour`);
      }
      
      // Changer de tour seulement si le combat continue ET que ce n'est pas une capture ratée
      if (!(action.type === 'capture' && !result.data?.captured)) {
        const nextPlayer = this.turnManager.nextTurn();
        console.log(`🔄 [BattleEngine] Tour suivant: ${nextPlayer}`);
        
        // Émettre événement de changement de tour
        this.emit('turnChanged', {
          newPlayer: nextPlayer,
          turnNumber: this.turnManager.getCurrentTurnNumber()
        });
      }
      
      // Fallback pour autres types d'actions (non-attack)
      if (action.type !== 'attack') {
        this.emit('actionProcessed', {
          action: action,
          result: result,
          nextPlayer: this.turnManager.getCurrentPlayer()
        });
      }
      
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
      
// ✅ NOUVEAU: Timing géré par BattleEngine (pas BroadcastManager)
if (this.broadcastManager && action.type === 'attack' && result.data) {
  // 1. Envoyer attaque + dégâts INSTANTANÉMENT
  this.broadcastManager.emitAttackSequence({
    attacker: { 
      name: this.getPlayerName(action.playerId), 
      role: action.playerId === this.gameState.player1.sessionId ? 'player1' : 'player2' 
    },
    target: { 
      name: result.data.defenderRole === 'player1' ? this.gameState.player1.name : this.gameState.player2.name,
      role: result.data.defenderRole 
    },
    move: { 
      id: action.data.moveId, 
      name: action.data.moveId
    },
    damage: result.data.damage || 0,
    oldHp: result.data.oldHp || 0,
    newHp: result.data.newHp || 0,
    maxHp: result.data.maxHp || 100,
    effects: [], // TODO: Calculer effets
    isKnockedOut: result.data.isKnockedOut || false
  });
  
  // 2. TIMING CONTRÔLÉ PAR LE COMBAT
  await this.emitTypeEffects([], {
    targetName: result.data.defenderRole === 'player1' ? this.gameState.player1.name : this.gameState.player2.name,
    targetRole: result.data.defenderRole
  });
  
  // 3. DÉLAI FINAL avant tour suivant (2s comme Pokémon)
  await this.delay(BATTLE_TIMINGS.transitionSlow);
  
} else {
  // Fallback pour autres types d'actions
  this.emit('actionProcessed', {
    action: action,
    result: result,
    nextPlayer: this.turnManager.getCurrentPlayer()
  });
}
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
  // === CONFIGURATION BROADCAST ===

private configureBroadcastSystem(config: BattleConfig): void {
  console.log('📡 [BattleEngine] Configuration système broadcast...');
  
  // Créer BroadcastManager via Factory
  this.broadcastManager = BroadcastManagerFactory.createForWildBattle(
    this.gameState.battleId,
    this.gameState,
    this.gameState.player1.sessionId
  );
  
  //  Configurer le callback d'émission
  this.broadcastManager.setEmitCallback((event) => {
    this.emit('battleEvent', event);
  });

    // Configurer SpectatorManager
  this.spectatorManager = new SpectatorManager();
  
  console.log('✅ [BattleEngine] BroadcastManager créé et configuré');
}
  /**
   * ✅ NOUVEAU: Traite une tentative de capture (délègue au CaptureManager)
   */
  private async processCapture(action: BattleAction, teamManager: any): Promise<BattleResult> {
    console.log(`🎯 [BattleEngine] Tentative capture délégué au CaptureManager`);
    
    const ballType = action.data?.ballType || 'poke_ball';
    
    // Déléguer au CaptureManager
    return await this.captureManager.attemptCapture(
      action.playerId,
      ballType,
      teamManager
    );
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
    
    // TODO: Autres conditions de fin (fuite, etc.)
    
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
 * Envoie les effets de type avec le bon timing
 */
private async emitTypeEffects(effects: string[], targetData: any): Promise<void> {
  if (effects && effects.length > 0) {
    // Délai avant les effets (comme Pokémon)
    await this.delay(1000);
    
    for (const effect of effects) {
      if (this.broadcastManager) {
        if (effect === 'super_effective') {
          this.broadcastManager.emit('superEffective', targetData);
        } else if (effect === 'not_very_effective') {
          this.broadcastManager.emit('notVeryEffective', targetData);
        } else if (effect === 'critical_hit') {
          this.broadcastManager.emit('criticalHit', targetData);
        }
      }
    }
  }
}
  
  // === GESTION SPECTATEURS ===

/**
 * Enregistre la position du combat dans le monde pour les spectateurs
 */
setBattleWorldPosition(
  battleRoomId: string,
  worldPosition: { x: number; y: number; mapId: string }
): void {
  if (this.spectatorManager) {
    this.spectatorManager.setBattleWorldPosition(
      this.gameState.battleId,
      battleRoomId,
      this.gameState,
      worldPosition
    );
    console.log(`📍 [BattleEngine] Position combat enregistrée pour spectateurs`);
  }
}

/**
 * Ajoute un spectateur au combat
 */
addSpectator(
  sessionId: string,
  battleRoomId: string,
  worldPosition: { x: number; y: number; mapId: string }
): boolean {
  if (this.spectatorManager) {
    return this.spectatorManager.addSpectator(
      sessionId,
      this.gameState.battleId,
      battleRoomId,
      worldPosition
    );
  }
  return false;
}

/**
 * Retire un spectateur
 */
removeSpectator(sessionId: string): {
  removed: boolean;
  shouldLeaveBattleRoom: boolean;
  battleRoomId?: string;
} {
  if (this.spectatorManager) {
    return this.spectatorManager.removeSpectator(sessionId);
  }
  return { removed: false, shouldLeaveBattleRoom: false };
}

/**
 * Nettoie les spectateurs à la fin du combat
 */
private cleanupSpectators(): void {
  if (this.spectatorManager) {
    const cleanup = this.spectatorManager.cleanupBattle(this.gameState.battleId);
    console.log(`🧹 [BattleEngine] ${cleanup.spectatorsRemoved.length} spectateurs nettoyés`);
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

    // ✅ NOUVEAU: Nettoyer les spectateurs
  this.cleanupSpectators();
  
  // ✅ NOUVEAU: Nettoyer le BroadcastManager
  if (this.broadcastManager) {
    this.broadcastManager.cleanup();
    this.broadcastManager = null;
  }
    console.log('🧹 [BattleEngine] Nettoyage effectué');
  }
  
  // === MÉTHODES UTILITAIRES ===

  /**
   * Délai contrôlé par le combat
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Récupère le nom du joueur depuis son ID
   */
  private getPlayerName(playerId: string): string {
    if (!this.gameState) return playerId;
    
    if (playerId === this.gameState.player1.sessionId) {
      return this.gameState.player1.name;
    } else if (playerId === this.gameState.player2.sessionId) {
      return this.gameState.player2.name;
    }
    
    return playerId;
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
