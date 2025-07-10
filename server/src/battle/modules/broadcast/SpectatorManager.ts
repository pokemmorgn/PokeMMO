// server/src/battle/modules/broadcast/SpectatorManager.ts
// GESTION SPECTATEURS SPATIAUX - INTÉGRATION BATTLEROOM

import { BattleGameState } from '../../types/BattleTypes';

// === INTERFACES ===

export interface SpectatorInfo {
  sessionId: string;
  battleId: string;
  battleRoomId: string;
  joinedAt: number;
  joinedFromWorld: boolean;
  worldPosition?: { x: number; y: number; mapId: string };
}

export interface BattleWorldPosition {
  battleId: string;
  battleRoomId: string;
  x: number;
  y: number;
  mapId: string;
  participantIds: string[];
  allowSpectators: boolean;
  maxSpectators: number;
}

export interface SpectatorRequest {
  spectatorId: string;
  targetPlayerId: string;
  spectatorPosition: { x: number; y: number; mapId: string };
  targetPosition: { x: number; y: number; mapId: string };
  interactionDistance: number;
}

/**
 * SPECTATOR MANAGER - Gestion spectateurs spatiaux via BattleRoom
 * 
 * Responsabilités :
 * - Gérer spectateurs via proximité spatiale
 * - Intégration avec BattleRoom
 * - Validation positions monde/combat
 * - Gestion des interactions "E" pour regarder
 * 
 * WORKFLOW :
 * 1. Joueur en combat → Position enregistrée dans le monde
 * 2. Autre joueur s'approche → Peut appuyer sur E
 * 3. Validation proximité → Rejoindre BattleRoom en spectateur
 * 4. Interface combat en mode readonly
 */
export class SpectatorManager {
  
  private spectators: Map<string, SpectatorInfo> = new Map();
  private battlePositions: Map<string, BattleWorldPosition> = new Map();
  private playerBattleStatus: Map<string, string> = new Map(); // playerId → battleId
  
  // Configuration
  private readonly MAX_INTERACTION_DISTANCE = 100; // unités de jeu
  private readonly DEFAULT_MAX_SPECTATORS = 5;
  
  constructor() {
    console.log('👁️ [SpectatorManager] Initialisé - Mode spatial/BattleRoom');
  }
  
  // === GESTION POSITIONS COMBAT ===
  
  /**
   * Enregistre la position d'un combat dans le monde
   */
  setBattleWorldPosition(
    battleId: string,
    battleRoomId: string,
    gameState: BattleGameState,
    worldPosition: { x: number; y: number; mapId: string }
  ): void {
    
    const participantIds = [
      gameState.player1.sessionId,
      gameState.player2.sessionId !== 'ai' ? gameState.player2.sessionId : ''
    ].filter(id => id);
    
    const battlePosition: BattleWorldPosition = {
      battleId,
      battleRoomId,
      x: worldPosition.x,
      y: worldPosition.y,
      mapId: worldPosition.mapId,
      participantIds,
      allowSpectators: this.getAllowSpectators(gameState.type),
      maxSpectators: this.getMaxSpectators(gameState.type)
    };
    
    this.battlePositions.set(battleId, battlePosition);
    
    // Marquer les joueurs comme étant en combat
    participantIds.forEach(playerId => {
      if (playerId) {
        this.playerBattleStatus.set(playerId, battleId);
      }
    });
    
    console.log(`📍 [SpectatorManager] Position combat enregistrée: ${battleId} à (${worldPosition.x}, ${worldPosition.y}) sur ${worldPosition.mapId}`);
  }
  
  /**
   * Met à jour la position d'un combat (si les joueurs bougent)
   */
  updateBattlePosition(
    battleId: string,
    newPosition: { x: number; y: number; mapId: string }
  ): void {
    const battle = this.battlePositions.get(battleId);
    if (battle) {
      battle.x = newPosition.x;
      battle.y = newPosition.y;
      battle.mapId = newPosition.mapId;
      
      console.log(`🔄 [SpectatorManager] Position combat mise à jour: ${battleId}`);
    }
  }
  
  // === INTERACTION SPATIALE ===
  
  /**
   * Traite une demande d'interaction "E" pour regarder un combat
   */
  requestWatchBattle(request: SpectatorRequest): {
    canWatch: boolean;
    battleId?: string;
    battleRoomId?: string;
    reason?: string;
  } {
    
    console.log(`👁️ [SpectatorManager] Demande spectateur: ${request.spectatorId} → ${request.targetPlayerId}`);
    
    // 1. Vérifier que le joueur cible est en combat
    const targetBattleId = this.playerBattleStatus.get(request.targetPlayerId);
    if (!targetBattleId) {
      return {
        canWatch: false,
        reason: 'Le joueur n\'est pas en combat'
      };
    }
    
    // 2. Récupérer la position du combat
    const battlePosition = this.battlePositions.get(targetBattleId);
    if (!battlePosition) {
      return {
        canWatch: false,
        reason: 'Combat introuvable'
      };
    }
    
    // 3. Vérifier la proximité spatiale
    if (!this.isWithinInteractionDistance(request)) {
      return {
        canWatch: false,
        reason: 'Vous êtes trop loin du combat'
      };
    }
    
    // 4. Vérifier les permissions
    if (!battlePosition.allowSpectators) {
      return {
        canWatch: false,
        reason: 'Ce combat n\'autorise pas les spectateurs'
      };
    }
    
    // 5. Vérifier la limite de spectateurs
    const currentSpectatorCount = this.getBattleSpectatorCount(targetBattleId);
    if (currentSpectatorCount >= battlePosition.maxSpectators) {
      return {
        canWatch: false,
        reason: 'Trop de spectateurs pour ce combat'
      };
    }
    
    // 6. Vérifier que le spectateur n'est pas déjà en train de regarder
    if (this.spectators.has(request.spectatorId)) {
      return {
        canWatch: false,
        reason: 'Vous regardez déjà un autre combat'
      };
    }
    
    // ✅ Autoriser le spectateur
    return {
      canWatch: true,
      battleId: targetBattleId,
      battleRoomId: battlePosition.battleRoomId
    };
  }
  
  /**
   * Ajoute un spectateur à un combat (après validation)
   */
  addSpectator(
    sessionId: string,
    battleId: string,
    battleRoomId: string,
    worldPosition: { x: number; y: number; mapId: string }
  ): boolean {
    
    // Vérifier que le combat existe encore
    const battlePosition = this.battlePositions.get(battleId);
    if (!battlePosition) {
      console.log(`❌ [SpectatorManager] Combat ${battleId} introuvable pour spectateur ${sessionId}`);
      return false;
    }
    
    // Créer l'info spectateur
    const spectatorInfo: SpectatorInfo = {
      sessionId,
      battleId,
      battleRoomId,
      joinedAt: Date.now(),
      joinedFromWorld: true,
      worldPosition
    };
    
    this.spectators.set(sessionId, spectatorInfo);
    
    console.log(`✅ [SpectatorManager] Spectateur ${sessionId} ajouté au combat ${battleId} (BattleRoom: ${battleRoomId})`);
    return true;
  }
  
  /**
   * Retire un spectateur
   */
  removeSpectator(sessionId: string): { 
    removed: boolean; 
    shouldLeaveBattleRoom: boolean;
    battleRoomId?: string;
  } {
    
    const spectatorInfo = this.spectators.get(sessionId);
    const removed = this.spectators.delete(sessionId);
    
    if (removed && spectatorInfo) {
      console.log(`👋 [SpectatorManager] Spectateur ${sessionId} retiré du combat ${spectatorInfo.battleId}`);
      
      return {
        removed: true,
        shouldLeaveBattleRoom: true,
        battleRoomId: spectatorInfo.battleRoomId
      };
    }
    
    return { removed: false, shouldLeaveBattleRoom: false };
  }
  
  // === DÉTECTION PROXIMITÉ ===
  
  /**
   * Vérifie si un joueur est assez proche pour interagir
   */
  private isWithinInteractionDistance(request: SpectatorRequest): boolean {
    const distance = this.calculateDistance(
      request.spectatorPosition,
      request.targetPosition
    );
    
    const isClose = distance <= (request.interactionDistance || this.MAX_INTERACTION_DISTANCE);
    const sameMap = request.spectatorPosition.mapId === request.targetPosition.mapId;
    
    console.log(`📏 [SpectatorManager] Distance: ${distance.toFixed(1)} (max: ${this.MAX_INTERACTION_DISTANCE}), même carte: ${sameMap}`);
    
    return isClose && sameMap;
  }
  
  /**
   * Calcule la distance entre deux positions
   */
  private calculateDistance(
    pos1: { x: number; y: number },
    pos2: { x: number; y: number }
  ): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Trouve tous les joueurs proches d'un combat
   */
  getNearbyPlayers(
    battleId: string,
    allPlayersPositions: Map<string, { x: number; y: number; mapId: string }>
  ): string[] {
    
    const battlePosition = this.battlePositions.get(battleId);
    if (!battlePosition) return [];
    
    const nearbyPlayers: string[] = [];
    
    allPlayersPositions.forEach((position, playerId) => {
      // Ignorer les participants du combat
      if (battlePosition.participantIds.includes(playerId)) return;
      
      // Ignorer si déjà spectateur d'un autre combat
      if (this.spectators.has(playerId)) return;
      
      // Vérifier la proximité
      const distance = this.calculateDistance(battlePosition, position);
      const sameMap = battlePosition.mapId === position.mapId;
      
      if (distance <= this.MAX_INTERACTION_DISTANCE && sameMap) {
        nearbyPlayers.push(playerId);
      }
    });
    
    return nearbyPlayers;
  }
  
  // === INFORMATIONS ===
  
  /**
   * Vérifie si un joueur est en combat
   */
  isPlayerInBattle(playerId: string): boolean {
    return this.playerBattleStatus.has(playerId);
  }
  
  /**
   * Récupère le statut de combat d'un joueur
   */
  getPlayerBattleStatus(playerId: string): {
    inBattle: boolean;
    battleId?: string;
    battleRoomId?: string;
    allowSpectators?: boolean;
  } {
    
    const battleId = this.playerBattleStatus.get(playerId);
    if (!battleId) {
      return { inBattle: false };
    }
    
    const battlePosition = this.battlePositions.get(battleId);
    return {
      inBattle: true,
      battleId,
      battleRoomId: battlePosition?.battleRoomId,
      allowSpectators: battlePosition?.allowSpectators || false
    };
  }
  
  /**
   * Compte les spectateurs d'un combat
   */
  getBattleSpectatorCount(battleId: string): number {
    return Array.from(this.spectators.values())
      .filter(s => s.battleId === battleId)
      .length;
  }
  
  /**
   * Récupère tous les spectateurs d'un combat
   */
  getBattleSpectators(battleId: string): string[] {
    return Array.from(this.spectators.values())
      .filter(s => s.battleId === battleId)
      .map(s => s.sessionId);
  }
  
  /**
   * Récupère les informations d'un spectateur
   */
  getSpectatorInfo(sessionId: string): SpectatorInfo | null {
    return this.spectators.get(sessionId) || null;
  }
  
  // === NETTOYAGE ===
  
  /**
   * Nettoie un combat terminé
   */
  cleanupBattle(battleId: string): {
    spectatorsRemoved: string[];
    battleRoomIds: string[];
  } {
    
    console.log(`🧹 [SpectatorManager] Nettoyage combat ${battleId}`);
    
    // Récupérer les spectateurs à retirer
    const spectatorsToRemove = Array.from(this.spectators.entries())
      .filter(([_, info]) => info.battleId === battleId)
      .map(([sessionId, info]) => ({ sessionId, battleRoomId: info.battleRoomId }));
    
    // Retirer les spectateurs
    spectatorsToRemove.forEach(({ sessionId }) => {
      this.spectators.delete(sessionId);
    });
    
    // Récupérer les infos de la bataille
    const battlePosition = this.battlePositions.get(battleId);
    const battleRoomIds = battlePosition ? [battlePosition.battleRoomId] : [];
    
    // Nettoyer les statuts des joueurs
    battlePosition?.participantIds.forEach(playerId => {
      if (playerId) {
        this.playerBattleStatus.delete(playerId);
      }
    });
    
    // Supprimer la position du combat
    this.battlePositions.delete(battleId);
    
    console.log(`✅ [SpectatorManager] Combat ${battleId} nettoyé - ${spectatorsToRemove.length} spectateurs retirés`);
    
    return {
      spectatorsRemoved: spectatorsToRemove.map(s => s.sessionId),
      battleRoomIds
    };
  }
  
  // === CONFIGURATION ===
  
  private getAllowSpectators(battleType: string): boolean {
    switch (battleType) {
      case 'wild':
        return true;  // Combats sauvages = spectateurs OK
      case 'pvp':
        return true;  // PvP = spectateurs OK (dans le monde)
      case 'trainer':
        return true;  // Dresseurs = spectateurs OK
      default:
        return true;
    }
  }
  
  private getMaxSpectators(battleType: string): number {
    switch (battleType) {
      case 'wild':
        return 3;  // Pas trop de monde pour un sauvage
      case 'pvp':
        return 8;  // PvP plus populaire
      case 'trainer':
        return 5;  // Intermédiaire
      default:
        return this.DEFAULT_MAX_SPECTATORS;
    }
  }
  
  // === STATISTIQUES ===
  
  getStats(): any {
    const totalSpectators = this.spectators.size;
    const activeBattles = this.battlePositions.size;
    const playersInBattle = this.playerBattleStatus.size;
    
    return {
      version: 'spatial_v1',
      totalSpectators,
      activeBattles,
      playersInBattle,
      maxInteractionDistance: this.MAX_INTERACTION_DISTANCE,
      features: [
        'spatial_proximity',
        'battleroom_integration',
        'world_position_tracking',
        'interaction_validation'
      ]
    };
  }
  
  /**
   * Reset complet
   */
  reset(): void {
    this.spectators.clear();
    this.battlePositions.clear();
    this.playerBattleStatus.clear();
    console.log('🔄 [SpectatorManager] Reset effectué');
  }
}

export default SpectatorManager;
