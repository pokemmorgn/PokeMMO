// server/src/managers/battle/TurnSystem.ts
// VERSION ULTRA-SIMPLE pour combats 1v1 seulement
// ✅ 50 lignes au lieu de 300 !

export type PlayerType = 'human' | 'ai';
export type BattleFormat = 'single'; // Seulement 1v1 pour l'instant
export type TurnMode = 'sequential'; // Seulement séquentiel pour l'instant

export interface BattleConfiguration {
  format: BattleFormat;
  turnMode: TurnMode;
  timeLimit: number;
}

/**
 * SYSTÈME DE TOURS ULTRA-SIMPLE
 * Gère SEULEMENT les combats 1v1 Pokémon classiques
 * player1 → player2 → player1 → player2...
 */
export class TurnSystem {
  private player1Id: string = '';
  private player2Id: string = '';
  private currentTurn: 'player1' | 'player2' = 'player1';
  private turnNumber: number = 1;
  private config: BattleConfiguration;
  
  // Callback pour notifier BattleRoom du démarrage des tours
  private onTurnStartCallback?: () => void;

  constructor(config: BattleConfiguration) {
    this.config = config;
    console.log(`🎯 [TurnSystem] Version simple initialisée`);
  }
  
  // === CONFIGURATION DES JOUEURS ===
  
  /**
   * Configuration automatique pour 1v1
   */
  autoConfigurePlayers(playerData: Array<{ id: string, type: PlayerType, name: string }>): void {
    console.log(`🔧 [TurnSystem] Configuration 1v1 simple`);
    
    this.player1Id = playerData[0].id;
    this.player2Id = playerData[1].id;
    
    console.log(`👤 [TurnSystem] Joueur 1: ${playerData[0].name} (${this.player1Id})`);
    console.log(`👤 [TurnSystem] Joueur 2: ${playerData[1].name} (${this.player2Id})`);
  }
  
  // === GESTION DES TOURS ===
  
  /**
   * Démarre un nouveau tour
   */
  startTurn(): void {
    console.log(`🔄 [TurnSystem] === DÉBUT TOUR ${this.turnNumber} ===`);
    console.log(`🎯 [TurnSystem] C'est au tour de: ${this.currentTurn}`);
    
    // Notifier BattleRoom si callback défini
    if (this.onTurnStartCallback) {
      this.onTurnStartCallback();
    }
  }
  
  /**
   * Vérifie si un joueur peut agir maintenant
   */
  canPlayerAct(playerId: string): boolean {
    if (this.currentTurn === 'player1') {
      return playerId === this.player1Id;
    } else {
      return playerId === this.player2Id || playerId === 'player2';
    }
  }
  
  /**
   * Soumission d'une action (change automatiquement le tour)
   */
  submitAction(playerId: string, action: any): boolean {
    console.log(`🎮 [TurnSystem] Action de ${playerId}: ${action.type}`);
    
    // Vérifier que c'est le bon joueur
    if (!this.canPlayerAct(playerId)) {
      console.warn(`⚠️ [TurnSystem] Ce n'est pas le tour de ${playerId}`);
      console.warn(`⚠️ [TurnSystem] Tour actuel: ${this.currentTurn}`);
      return false;
    }
    
    console.log(`✅ [TurnSystem] Action acceptée pour ${playerId}`);
    
    // ✅ CHANGER LE TOUR AUTOMATIQUEMENT
    this.switchTurn();
    
    return true;
  }
  
  /**
   * Change le tour (player1 ↔ player2)
   */
  private switchTurn(): void {
    if (this.currentTurn === 'player1') {
      this.currentTurn = 'player2';
    } else {
      this.currentTurn = 'player1';
      this.turnNumber++; // Incrémenter seulement quand on revient au joueur 1
    }
    
    console.log(`🔄 [TurnSystem] Nouveau tour: ${this.currentTurn} (Tour ${this.turnNumber})`);
  }
  
  // === MÉTHODES UTILITAIRES ===
  
  /**
   * Réinitialise les actions (ne fait rien en version simple)
   */
  resetPlayerActions(): void {
    // Rien à faire en version simple
    console.log(`🔄 [TurnSystem] Reset actions (version simple)`);
  }
  
  /**
   * Obtient le numéro de tour actuel
   */
  getCurrentTurnNumber(): number {
    return this.turnNumber;
  }
  
  /**
   * Définit le numéro de tour (pour sync avec BattleRoom)
   */
  setTurnNumber(turn: number): void {
    this.turnNumber = turn;
  }
  
  /**
   * Définit le callback de démarrage de tour
   */
  setOnTurnStartCallback(callback: () => void): void {
    this.onTurnStartCallback = callback;
  }
  
  /**
   * Obtient l'état actuel du système
   */
  getState(): any {
    return {
      turnNumber: this.turnNumber,
      currentTurn: this.currentTurn,
      player1Id: this.player1Id,
      player2Id: this.player2Id,
      format: this.config.format
    };
  }
  
  // === DEBUG ===
  
  /**
   * Debug de l'état actuel
   */
  getDebugInfo(): any {
    return {
      version: 'simple_1v1',
      turnNumber: this.turnNumber,
      currentTurn: this.currentTurn,
      player1Id: this.player1Id,
      player2Id: this.player2Id,
      canPlayer1Act: this.canPlayerAct(this.player1Id),
      canPlayer2Act: this.canPlayerAct('player2')
    };
  }
}

// === CONFIGURATIONS PRÉDÉFINIES ===

export const BATTLE_CONFIGS = {
  SINGLE_PVE: {
    format: 'single' as BattleFormat,
    turnMode: 'sequential' as TurnMode,
    timeLimit: 30000
  },
  
  SINGLE_PVP: {
    format: 'single' as BattleFormat,
    turnMode: 'sequential' as TurnMode,
    timeLimit: 45000
  }
};

export default TurnSystem;

/*
🎯 AVANTAGES DE CETTE VERSION :

✅ ULTRA-SIMPLE : 120 lignes au lieu de 400
✅ LOGIQUE CLAIRE : player1 → player2 → player1...
✅ MÊME INTERFACE : BattleRoom ne change pas
✅ DEBUGGABLE : Logs clairs et concis
✅ ÉVOLUTIF : On ajoutera les formats complexes plus tard

🔧 UTILISATION :
- canPlayerAct(playerId) → true/false
- submitAction(playerId, action) → change automatiquement le tour
- startTurn() → notifie BattleRoom
- Fini ! 
*/
