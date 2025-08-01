// server/src/battle/modules/SwitchManager.ts
// 🔧 CORRECTIONS CHANGEMENT FORCÉ - SESSION 2 FINALISATION

import { BattleGameState, BattleResult, BattleAction, PlayerRole, Pokemon } from '../types/BattleTypes';
import { TrainerTeamManager, SwitchValidation, TeamAnalysis } from '../managers/TrainerTeamManager';
import { 
  TrainerBattlePhase, 
  SwitchAction, 
  TrainerBattleRules,
  isSwitchAction,
  TRAINER_BATTLE_CONSTANTS 
} from '../types/TrainerBattleTypes';

// === INTERFACES SPÉCIFIQUES ===

export interface SwitchRequest {
  requestId: string;
  playerRole: PlayerRole;
  fromPokemonIndex: number;
  toPokemonIndex: number;
  isForced: boolean;
  reason: string;
  timestamp: number;
  timeLimit: number;
  processed: boolean;
}

export interface SwitchValidationResult {
  isValid: boolean;
  reason?: string;
  availableOptions?: number[];
  cooldownTurns?: number;
  alternativeSuggestions?: number[];
}

export interface SwitchExecutionResult {
  success: boolean;
  switchExecuted: boolean;
  fromPokemon?: Pokemon;
  toPokemon?: Pokemon;
  playerRole: PlayerRole;
  turnNumber: number;
  wasForced: boolean;
  message: string[];
  error?: string;
  teamDefeated?: boolean; // 🔧 AJOUTÉ pour clarifier équipe vaincue
}

export interface SwitchManagerState {
  pendingRequests: SwitchRequest[];
  lastSwitchTurns: Map<PlayerRole, number>;
  switchCounts: Map<PlayerRole, number>;
  forcedSwitchQueue: PlayerRole[];
  isProcessingSwitches: boolean;
  currentTurn: number;
}

/**
 * SWITCH MANAGER - 🔧 CORRECTIONS POUR CHANGEMENT FORCÉ
 */
export class SwitchManager {
  
  private gameState: BattleGameState | null = null;
  private teamManagers: Map<PlayerRole, TrainerTeamManager> = new Map();
  private battleRules: TrainerBattleRules | null = null;
  private switchState: SwitchManagerState;
  
  // Configuration
  private readonly SWITCH_TIME_LIMIT = TRAINER_BATTLE_CONSTANTS.FORCED_SWITCH_TIME_LIMIT;
  private readonly MAX_SWITCHES_PER_TURN = 1;
  private readonly SWITCH_COOLDOWN = 0;
  
  constructor() {
    this.switchState = {
      pendingRequests: [],
      lastSwitchTurns: new Map(),
      switchCounts: new Map(),
      forcedSwitchQueue: [],
      isProcessingSwitches: false,
      currentTurn: 0
    };
    
    console.log('🔄 [SwitchManager] Initialisé - Gestion changements Pokémon');
  }
  
  // === INITIALISATION ===
  
  initialize(
    gameState: BattleGameState,
    player1TeamManager?: TrainerTeamManager,
    player2TeamManager?: TrainerTeamManager,
    rules?: TrainerBattleRules
  ): void {
    this.gameState = gameState;
    this.battleRules = rules || this.getDefaultRules();
    this.switchState.currentTurn = gameState.turnNumber || 1;
    
    // Enregistrer les gestionnaires d'équipes
    if (player1TeamManager) {
      this.teamManagers.set('player1', player1TeamManager);
      console.log('✅ [SwitchManager] Player1 TeamManager enregistré');
    }
    
    if (player2TeamManager) {
      this.teamManagers.set('player2', player2TeamManager);
      console.log('✅ [SwitchManager] Player2 TeamManager enregistré');
    }
    
    // Initialiser les compteurs
    this.switchState.lastSwitchTurns.clear();
    this.switchState.switchCounts.set('player1', 0);
    this.switchState.switchCounts.set('player2', 0);
    
    console.log(`✅ [SwitchManager] Configuré - Équipes: ${this.teamManagers.size}, Règles: changements ${this.battleRules.allowSwitching ? 'autorisés' : 'interdits'}`);
  }
  
  // === 🔧 CORRECTION PRINCIPALE - CHANGEMENT FORCÉ ===
  
  /**
   * 🔧 CORRECTION: Gère les changements forcés après KO avec validation complète
   */
  async handleForcedSwitch(playerRole: PlayerRole, faintedPokemonIndex: number): Promise<BattleResult> {
    console.log(`💀 [SwitchManager] 🔧 DÉBUT changement forcé: ${playerRole} (Pokémon ${faintedPokemonIndex} KO)`);
    
    if (!this.gameState) {
      console.error('❌ [SwitchManager] GameState manquant');
      return this.createErrorResult('SwitchManager non initialisé');
    }
    
    const teamManager = this.teamManagers.get(playerRole);
    if (!teamManager) {
      console.error(`❌ [SwitchManager] TeamManager manquant pour ${playerRole}`);
      return this.createErrorResult(`Aucun gestionnaire d'équipe pour ${playerRole}`);
    }
    
    try {
      console.log(`🔍 [SwitchManager] 🔧 Analyse équipe ${playerRole}...`);
      
      // 1. 🔧 ANALYSE ÉQUIPE DÉTAILLÉE
      const analysis = teamManager.analyzeTeam();
      console.log(`📊 [SwitchManager] Analyse: ${analysis.alivePokemon}/${analysis.totalPokemon} vivants, Battle ready: ${analysis.battleReady}`);
      
      // 2. 🔧 VÉRIFICATION ÉQUIPE VAINCUE AVEC LOGS DÉTAILLÉS
      if (analysis.alivePokemon <= 0 || !analysis.battleReady) {
        console.log(`💀 [SwitchManager] 🔧 ÉQUIPE VAINCUE DÉTECTÉE:`);
        console.log(`    - Pokémon vivants: ${analysis.alivePokemon}`);
        console.log(`    - Pokémon total: ${analysis.totalPokemon}}`);
        console.log(`    - Battle ready: ${analysis.battleReady}`);
        console.log(`    - Gagnant: ${playerRole === 'player1' ? 'player2' : 'player1'}`);
        
        return {
          success: true, // ✅ SUCCÈS car traitement correct d'équipe vaincue
          gameState: this.gameState,
          events: [`${this.getPlayerName(playerRole)} n'a plus de Pokémon valides !`],
          data: {
            teamDefeated: true,
            playerRole: playerRole,
            winner: playerRole === 'player1' ? 'player2' : 'player1',
            switchExecuted: false, // ✅ Pas de changement car équipe vaincue
            reason: 'team_defeated',
            wasForced: true // 🔧 AJOUTÉ
          }
        };
      }
      
      console.log(`✅ [SwitchManager] 🔧 Équipe ${playerRole} a encore ${analysis.alivePokemon} Pokémon vivants`);
      
      // 3. 🔧 CHANGEMENT AUTOMATIQUE AVEC VALIDATION
      console.log(`🔄 [SwitchManager] 🔧 Tentative changement automatique...`);
      const autoSwitchSuccess = teamManager.autoSwitchToFirstAlive();
      
      if (!autoSwitchSuccess) {
        console.error('❌ [SwitchManager] 🔧 AutoSwitch échoué malgré Pokémon vivants');
        return this.createErrorResult('Impossible de trouver un Pokémon de remplacement');
      }
      
      console.log(`✅ [SwitchManager] 🔧 AutoSwitch réussi`);
      
      // 4. 🔧 RÉCUPÉRATION NOUVEAU POKÉMON ACTIF
      const newActivePokemon = teamManager.getActivePokemon();
      if (!newActivePokemon) {
        console.error('❌ [SwitchManager] 🔧 Nouveau Pokémon actif introuvable');
        return this.createErrorResult('Erreur récupération nouveau Pokémon actif');
      }
      
      console.log(`✅ [SwitchManager] 🔧 Nouveau Pokémon actif: ${newActivePokemon.name} (${newActivePokemon.currentHp}/${newActivePokemon.maxHp} HP)`);
      
      // 5. 🔧 MISE À JOUR GAMESTATE AVEC VALIDATION
      if (playerRole === 'player1') {
        const oldPokemon = this.gameState.player1.pokemon?.name || 'N/A';
        this.gameState.player1.pokemon = newActivePokemon;
        console.log(`🔄 [SwitchManager] 🔧 GameState Player1: ${oldPokemon} → ${newActivePokemon.name}`);
      } else {
        const oldPokemon = this.gameState.player2.pokemon?.name || 'N/A';
        this.gameState.player2.pokemon = newActivePokemon;
        console.log(`🔄 [SwitchManager] 🔧 GameState Player2: ${oldPokemon} → ${newActivePokemon.name}`);
      }
      
      console.log(`✅ [SwitchManager] 🔧 CHANGEMENT FORCÉ RÉUSSI COMPLÈTEMENT`);
      
      return {
        success: true,
        gameState: this.gameState,
        events: [
          `${this.getPlayerName(playerRole)} envoie ${newActivePokemon.name} !`,
          `Allez-y ${newActivePokemon.name} !`
        ],
        data: {
          switchExecuted: true,
          playerRole: playerRole,
          toPokemon: newActivePokemon.name,
          wasForced: true,
          reason: 'forced_after_ko',
          teamDefeated: false, // ✅ Équipe pas vaincue
          fromPokemonIndex: faintedPokemonIndex,
          toPokemonIndex: teamManager.findPokemonIndex(newActivePokemon.combatId)
        }
      };
      
    } catch (error) {
      console.error(`❌ [SwitchManager] 🔧 Erreur changement forcé:`, error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur changement forcé'
      );
    }
  }
  
  // === API PRINCIPALE (INCHANGÉE) ===
  
  async processSwitchAction(action: BattleAction): Promise<BattleResult> {
    console.log(`🔄 [SwitchManager] Traitement action changement par ${action.playerId}`);
    
    if (!this.gameState) {
      return this.createErrorResult('SwitchManager non initialisé');
    }
    
    if (!isSwitchAction(action)) {
      return this.createErrorResult('Action n\'est pas un changement de Pokémon');
    }
    
    const switchAction = action as SwitchAction;
    const playerRole = this.getPlayerRole(action.playerId);
    
    if (!playerRole) {
      return this.createErrorResult('Joueur non reconnu');
    }
    
    try {
      // 1. Validation du changement
      const validation = await this.validateSwitch(
        playerRole,
        switchAction.data.fromPokemonIndex,
        switchAction.data.toPokemonIndex,
        switchAction.data.isForced
      );
      
      if (!validation.isValid) {
        return this.createErrorResult(validation.reason || 'Changement non autorisé');
      }
      
      // 2. Exécution du changement
      const executionResult = await this.executeSwitch(
        playerRole,
        switchAction.data.fromPokemonIndex,
        switchAction.data.toPokemonIndex,
        switchAction.data.isForced,
        switchAction.data.reason || 'changement_volontaire'
      );
      
      if (!executionResult.success) {
        return this.createErrorResult(executionResult.error || 'Échec exécution changement');
      }
      
      // 3. Mise à jour état de combat
      this.updateBattleStateAfterSwitch(playerRole, executionResult);
      
      return {
        success: true,
        gameState: this.gameState,
        events: executionResult.message,
        data: {
          switchExecuted: true,
          playerRole: playerRole,
          fromPokemon: executionResult.fromPokemon?.name,
          toPokemon: executionResult.toPokemon?.name,
          wasForced: executionResult.wasForced
        }
      };
      
    } catch (error) {
      console.error(`❌ [SwitchManager] Erreur traitement:`, error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue'
      );
    }
  }
  
  // === VALIDATION ===
  
  async validateSwitch(
    playerRole: PlayerRole,
    fromIndex: number,
    toIndex: number,
    isForced: boolean = false
  ): Promise<SwitchValidationResult> {
    
    // 1. Vérifications de base
    if (!this.battleRules?.allowSwitching && !isForced) {
      return {
        isValid: false,
        reason: 'Les changements de Pokémon sont interdits dans ce combat'
      };
    }
    
    const teamManager = this.teamManagers.get(playerRole);
    if (!teamManager) {
      return {
        isValid: false,
        reason: 'Gestionnaire d\'équipe non trouvé'
      };
    }
    
    // 2. Validation via TeamManager
    const teamValidation = teamManager.validateSwitch(
      fromIndex,
      toIndex,
      this.switchState.currentTurn,
      isForced
    );
    
    if (!teamValidation.isValid) {
      return {
        isValid: false,
        reason: teamValidation.reason,
        availableOptions: teamValidation.availableOptions,
        cooldownTurns: teamValidation.cooldownTurns
      };
    }
    
    // 3. Vérifications règles spécifiques combat
    if (!isForced) {
      // Vérifier limite de changements par tour
      const switchCount = this.switchState.switchCounts.get(playerRole) || 0;
      if (switchCount >= this.MAX_SWITCHES_PER_TURN) {
        return {
          isValid: false,
          reason: `Maximum ${this.MAX_SWITCHES_PER_TURN} changement(s) par tour atteint`
        };
      }
      
      // Vérifier cooldown
      const lastSwitchTurn = this.switchState.lastSwitchTurns.get(playerRole);
      if (lastSwitchTurn !== undefined) {
        const turnsSinceLastSwitch = this.switchState.currentTurn - lastSwitchTurn;
        if (turnsSinceLastSwitch < this.SWITCH_COOLDOWN) {
          return {
            isValid: false,
            reason: 'Cooldown de changement actif',
            cooldownTurns: this.SWITCH_COOLDOWN - turnsSinceLastSwitch
          };
        }
      }
    }
    
    return {
      isValid: true,
      availableOptions: teamValidation.availableOptions
    };
  }
  
  // === EXÉCUTION CHANGEMENT ===
  
  private async executeSwitch(
    playerRole: PlayerRole,
    fromIndex: number,
    toIndex: number,
    isForced: boolean,
    reason: string
  ): Promise<SwitchExecutionResult> {
    
    const teamManager = this.teamManagers.get(playerRole);
    if (!teamManager) {
      return {
        success: false,
        switchExecuted: false,
        playerRole,
        turnNumber: this.switchState.currentTurn,
        wasForced: isForced,
        message: [],
        error: 'Gestionnaire d\'équipe non trouvé'
      };
    }
    
    // Récupérer les Pokémon impliqués
    const fromPokemon = teamManager.getPokemonByIndex(fromIndex);
    const toPokemon = teamManager.getPokemonByIndex(toIndex);
    
    if (!fromPokemon || !toPokemon) {
      return {
        success: false,
        switchExecuted: false,
        playerRole,
        turnNumber: this.switchState.currentTurn,
        wasForced: isForced,
        message: [],
        error: 'Pokémon source ou cible introuvable'
      };
    }
    
    // Exécuter le changement via TeamManager
    const switchSuccess = teamManager.executeSwitch(
      fromIndex,
      toIndex,
      this.switchState.currentTurn,
      isForced
    );
    
    if (!switchSuccess) {
      return {
        success: false,
        switchExecuted: false,
        playerRole,
        turnNumber: this.switchState.currentTurn,
        wasForced: isForced,
        message: [],
        error: 'Échec exécution changement dans TeamManager'
      };
    }
    
    // Mise à jour compteurs
    if (!isForced) {
      const currentCount = this.switchState.switchCounts.get(playerRole) || 0;
      this.switchState.switchCounts.set(playerRole, currentCount + 1);
      this.switchState.lastSwitchTurns.set(playerRole, this.switchState.currentTurn);
    }
    
    // Générer messages
    const messages = this.generateSwitchMessages(
      this.getPlayerName(playerRole),
      fromPokemon,
      toPokemon,
      isForced,
      reason
    );
    
    console.log(`✅ [SwitchManager] Changement exécuté: ${fromPokemon.name} → ${toPokemon.name} (${isForced ? 'forcé' : 'volontaire'})`);
    
    return {
      success: true,
      switchExecuted: true,
      fromPokemon,
      toPokemon,
      playerRole,
      turnNumber: this.switchState.currentTurn,
      wasForced: isForced,
      message: messages
    };
  }
  
  // === AUTRES MÉTHODES (INCHANGÉES) ===
  
  createSwitchRequest(
    playerRole: PlayerRole,
    fromIndex: number,
    toIndex: number,
    isForced: boolean,
    reason: string = 'player_choice'
  ): string {
    
    const requestId = `switch_${playerRole}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const request: SwitchRequest = {
      requestId,
      playerRole,
      fromPokemonIndex: fromIndex,
      toPokemonIndex: toIndex,
      isForced,
      reason,
      timestamp: Date.now(),
      timeLimit: isForced ? this.SWITCH_TIME_LIMIT : 0,
      processed: false
    };
    
    this.switchState.pendingRequests.push(request);
    
    console.log(`📝 [SwitchManager] Demande de changement créée: ${requestId} (${reason})`);
    
    return requestId;
  }
  
  async processSwitchRequest(requestId: string): Promise<BattleResult> {
    const request = this.switchState.pendingRequests.find(r => r.requestId === requestId);
    
    if (!request) {
      return this.createErrorResult('Demande de changement introuvable');
    }
    
    if (request.processed) {
      return this.createErrorResult('Demande de changement déjà traitée');
    }
    
    // Vérifier timeout pour changements forcés
    if (request.isForced && request.timeLimit > 0) {
      const elapsed = Date.now() - request.timestamp;
      if (elapsed > request.timeLimit) {
        // Changement automatique
        console.log(`⏰ [SwitchManager] Timeout changement forcé - Changement automatique`);
        const autoResult = await this.handleForcedSwitch(request.playerRole, request.fromPokemonIndex);
        request.processed = true;
        return autoResult;
      }
    }
    
    // Traiter la demande normale
    const switchAction: SwitchAction = {
      actionId: `switch_action_${requestId}`,
      playerId: this.getPlayerSessionId(request.playerRole),
      type: 'switch',
      data: {
        fromPokemonIndex: request.fromPokemonIndex,
        toPokemonIndex: request.toPokemonIndex,
        isForced: request.isForced,
        reason: request.reason
      },
      timestamp: Date.now()
    };
    
    request.processed = true;
    
    return await this.processSwitchAction(switchAction);
  }
  
  getSwitchActionPriority(switchAction: SwitchAction): number {
    return TRAINER_BATTLE_CONSTANTS.SWITCH_PRIORITY; // 6 - Plus élevé que les attaques
  }
  
  canQueueSwitchAction(playerRole: PlayerRole): boolean {
    if (!this.battleRules?.allowSwitching) {
      return false;
    }
    
    const teamManager = this.teamManagers.get(playerRole);
    if (!teamManager) {
      return false;
    }
    
    const analysis = teamManager.analyzeTeam();
    return analysis.alivePokemon > 1; // Au moins 2 Pokémon vivants pour changement
  }
  
  analyzeSwitchOptions(playerRole: PlayerRole): {
    canSwitch: boolean;
    availablePokemon: number[];
    recommendedSwitches: { index: number; reason: string }[];
    restrictions: string[];
  } {
    
    const teamManager = this.teamManagers.get(playerRole);
    if (!teamManager) {
      return {
        canSwitch: false,
        availablePokemon: [],
        recommendedSwitches: [],
        restrictions: ['Gestionnaire d\'équipe non trouvé']
      };
    }
    
    const analysis = teamManager.analyzeTeam();
    const restrictions: string[] = [];
    
    // Vérifier restrictions générales
    if (!this.battleRules?.allowSwitching) {
      restrictions.push('Changements interdits dans ce combat');
    }
    
    if (analysis.alivePokemon <= 1) {
      restrictions.push('Aucun autre Pokémon vivant');
    }
    
    const switchCount = this.switchState.switchCounts.get(playerRole) || 0;
    if (switchCount >= this.MAX_SWITCHES_PER_TURN) {
      restrictions.push(`Limite de ${this.MAX_SWITCHES_PER_TURN} changement(s) par tour atteinte`);
    }
    
    // Options disponibles
    const availablePokemon: number[] = [];
    const recommendedSwitches: { index: number; reason: string }[] = [];
    
    if (restrictions.length === 0) {
      const allPokemon = teamManager.getAllPokemon();
      
      allPokemon.forEach((pokemon, index) => {
        if (pokemon.currentHp > 0 && index !== analysis.alivePokemon) {
          availablePokemon.push(index);
          
          // Recommandations basiques
          if (pokemon.speed > (analysis.fastestPokemon?.speed || 0)) {
            recommendedSwitches.push({
              index,
              reason: 'Pokémon plus rapide'
            });
          }
          
          if (pokemon.attack > (analysis.strongestPokemon?.attack || 0)) {
            recommendedSwitches.push({
              index,
              reason: 'Pokémon plus fort'
            });
          }
        }
      });
    }
    
    return {
      canSwitch: restrictions.length === 0 && availablePokemon.length > 0,
      availablePokemon,
      recommendedSwitches,
      restrictions
    };
  }
  
  // === MISE À JOUR ÉTAT COMBAT ===
  
  private updateBattleStateAfterSwitch(playerRole: PlayerRole, result: SwitchExecutionResult): void {
    if (!this.gameState || !result.toPokemon) return;
    
    // Mettre à jour le Pokémon actif dans l'état de combat
    if (playerRole === 'player1') {
      this.gameState.player1.pokemon = result.toPokemon;
    } else {
      this.gameState.player2.pokemon = result.toPokemon;
    }
    
    console.log(`🔄 [SwitchManager] État combat mis à jour - ${playerRole}: ${result.toPokemon.name} actif`);
  }
  
  resetTurnCounters(newTurnNumber: number): void {
    this.switchState.currentTurn = newTurnNumber;
    this.switchState.switchCounts.set('player1', 0);
    this.switchState.switchCounts.set('player2', 0);
    
    // Nettoyer les demandes anciennes
    this.switchState.pendingRequests = this.switchState.pendingRequests.filter(
      r => !r.processed && (Date.now() - r.timestamp) < 60000 // Garder 1 minute max
    );
    
    console.log(`🔄 [SwitchManager] Compteurs réinitialisés pour tour ${newTurnNumber}`);
  }
  
  // === UTILITAIRES ===
  
  private generateSwitchMessages(
    playerName: string,
    fromPokemon: Pokemon,
    toPokemon: Pokemon,
    isForced: boolean,
    reason: string
  ): string[] {
    
    const messages: string[] = [];
    
    if (isForced) {
      messages.push(`${fromPokemon.name} ne peut plus combattre !`);
      messages.push(`${playerName} envoie ${toPokemon.name} !`);
    } else {
      messages.push(`${playerName} rappelle ${fromPokemon.name} !`);
      messages.push(`${playerName} envoie ${toPokemon.name} !`);
    }
    
    messages.push(`Allez-y ${toPokemon.name} !`);
    
    return messages;
  }
  
  private getPlayerRole(playerId: string): PlayerRole | null {
    if (!this.gameState) return null;
    
    if (playerId === this.gameState.player1.sessionId) return 'player1';
    if (playerId === this.gameState.player2.sessionId) return 'player2';
    
    return null;
  }
  
  private getPlayerName(playerRole: PlayerRole): string {
    if (!this.gameState) return 'Joueur Inconnu';
    
    if (playerRole === 'player1') return this.gameState.player1.name;
    if (playerRole === 'player2') return this.gameState.player2.name;
    
    return 'Joueur Inconnu';
  }
  
  private getPlayerSessionId(playerRole: PlayerRole): string {
    if (!this.gameState) return '';
    
    if (playerRole === 'player1') return this.gameState.player1.sessionId;
    if (playerRole === 'player2') return this.gameState.player2.sessionId;
    
    return '';
  }
  
  private getDefaultRules(): TrainerBattleRules {
    return {
      allowSwitching: true,
      forceSwitch: true,
      maxSwitchesPerTurn: this.MAX_SWITCHES_PER_TURN,
      switchCooldown: this.SWITCH_COOLDOWN,
      itemsAllowed: false,
      megaEvolution: false
    };
  }
  
  private createErrorResult(message: string): BattleResult {
    return {
      success: false,
      error: message,
      gameState: this.gameState!,
      events: []
    };
  }
  
  // === DIAGNOSTICS ===
  
  getDebugState(): any {
    return {
      version: 'switch_manager_v1_corrected',
      isInitialized: this.gameState !== null,
      teamManagersCount: this.teamManagers.size,
      battleRules: this.battleRules,
      switchState: {
        ...this.switchState,
        pendingRequestsCount: this.switchState.pendingRequests.length,
        lastSwitchTurns: Object.fromEntries(this.switchState.lastSwitchTurns),
        switchCounts: Object.fromEntries(this.switchState.switchCounts)
      },
      configuration: {
        maxSwitchesPerTurn: this.MAX_SWITCHES_PER_TURN,
        switchCooldown: this.SWITCH_COOLDOWN,
        switchTimeLimit: this.SWITCH_TIME_LIMIT
      },
      features: [
        'switch_validation_corrected',
        'forced_switch_handling_enhanced', // 🔧
        'team_manager_integration',
        'action_queue_priority',
        'turn_counter_management',
        'switch_request_system',
        'mmo_performance_optimized',  
        'detailed_forced_switch_logging' // 🔧
      ]
    };
  }
  
  getStats(): any {
    const totalSwitches = Array.from(this.switchState.switchCounts.values()).reduce((sum, count) => sum + count, 0);
    
    return {
      architecture: 'SwitchManager + TrainerTeamManager Integration - Fixed',
      status: 'Production Ready - Forced Switch Corrected', // 🔧
      totalSwitches,
      pendingRequests: this.switchState.pendingRequests.length,
      averageSwitchesPerPlayer: totalSwitches / Math.max(this.teamManagers.size, 1),
      supportedFeatures: [
        'voluntary_switches',
        'forced_switches_on_ko_corrected', // 🔧
        'multi_team_support',
        'rule_based_validation',
        'priority_integration',
        'timeout_handling',
        'switch_recommendations',
        'team_defeat_detection_enhanced' // 🔧
      ]
    };
  }
  
  isReady(): boolean {
    return this.gameState !== null && this.teamManagers.size > 0;
  }
  
  reset(): void {
    this.gameState = null;
    this.teamManagers.clear();
    this.battleRules = null;
    
    this.switchState = {
      pendingRequests: [],
      lastSwitchTurns: new Map(),
      switchCounts: new Map(),
      forcedSwitchQueue: [],
      isProcessingSwitches: false,
      currentTurn: 0
    };
    
    console.log('🔄 [SwitchManager] Reset effectué');
  }
}

export default SwitchManager;
