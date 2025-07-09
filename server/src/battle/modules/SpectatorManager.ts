// server/src/battle/modules/SpectatorManager.ts
// GESTION DES SPECTATEURS DE COMBAT

import { BattleGameState, PlayerRole } from '../types/BattleTypes';

// === INTERFACES ===

export interface SpectatorInfo {
  sessionId: string;
  username: string;
  joinedAt: number;
  permissions: SpectatorPermissions;
  isVip?: boolean;
}

export interface SpectatorPermissions {
  canChat: boolean;
  canSeePrivateInfo: boolean;  // HP exacts, moves cachés, etc.
  canReceiveAdvancedStats: boolean;
  priority: number; // Pour l'ordre des messages
}

export interface SpectatorStats {
  totalSpectators: number;
  vipSpectators: number;
  averageWatchTime: number;
  peakSpectators: number;
}

export interface BattleVisibility {
  isPublic: boolean;
  maxSpectators: number;
  requiresPermission: boolean;
  allowChat: boolean;
  showPlayerNames: boolean;
}

/**
 * SPECTATOR MANAGER - Gestion complète des spectateurs
 * 
 * Responsabilités :
 * - Ajouter/retirer spectateurs
 * - Gérer les permissions
 * - Filtrer les données selon les droits
 * - Statistiques de spectateurs
 * - Chat de spectateurs (optionnel)
 * - VIP et modération
 */
export class SpectatorManager {
  
  private battleId: string;
  private gameState: BattleGameState;
  private spectators: Map<string, SpectatorInfo> = new Map();
  private visibility: BattleVisibility;
  private stats: SpectatorStats;
  
  // Événements
  private eventListeners: Map<string, Function[]> = new Map();
  
  constructor(battleId: string, gameState: BattleGameState, visibility: Partial<BattleVisibility> = {}) {
    this.battleId = battleId;
    this.gameState = gameState;
    
    // Configuration par défaut
    this.visibility = {
      isPublic: true,
      maxSpectators: 50,
      requiresPermission: false,
      allowChat: true,
      showPlayerNames: true,
      ...visibility
    };
    
    this.stats = {
      totalSpectators: 0,
      vipSpectators: 0,
      averageWatchTime: 0,
      peakSpectators: 0
    };
    
    console.log(`👁️ [SpectatorManager] Initialisé pour combat ${battleId} - Public: ${this.visibility.isPublic}`);
  }
  
  // === GESTION DES SPECTATEURS ===
  
  /**
   * Ajoute un spectateur
   */
  addSpectator(sessionId: string, username: string, permissions?: Partial<SpectatorPermissions>): boolean {
    // Vérifications
    if (this.isParticipant(sessionId)) {
      console.log(`⚠️ [SpectatorManager] ${sessionId} est déjà participant, ne peut pas être spectateur`);
      return false;
    }
    
    if (!this.canJoinAsSpectator(sessionId)) {
      console.log(`❌ [SpectatorManager] ${sessionId} ne peut pas rejoindre comme spectateur`);
      return false;
    }
    
    // Permissions par défaut
    const defaultPermissions: SpectatorPermissions = {
      canChat: this.visibility.allowChat,
      canSeePrivateInfo: false,
      canReceiveAdvancedStats: false,
      priority: 0
    };
    
    const spectatorInfo: SpectatorInfo = {
      sessionId,
      username,
      joinedAt: Date.now(),
      permissions: { ...defaultPermissions, ...permissions }
    };
    
    this.spectators.set(sessionId, spectatorInfo);
    this.updateStats();
    
    // Émettre événement
    this.emit('spectatorJoined', {
      spectator: spectatorInfo,
      totalSpectators: this.spectators.size
    });
    
    console.log(`👁️ [SpectatorManager] Spectateur ajouté: ${username} (${sessionId})`);
    
    return true;
  }
  
  /**
   * Retire un spectateur
   */
  removeSpectator(sessionId: string): boolean {
    const spectator = this.spectators.get(sessionId);
    if (!spectator) {
      return false;
    }
    
    // Calculer temps de visionnage
    const watchTime = Date.now() - spectator.joinedAt;
    
    this.spectators.delete(sessionId);
    this.updateStats();
    
    // Émettre événement
    this.emit('spectatorLeft', {
      spectator: spectator,
      watchTime: watchTime,
      totalSpectators: this.spectators.size
    });
    
    console.log(`👋 [SpectatorManager] Spectateur retiré: ${spectator.username} (${Math.round(watchTime/1000)}s)`);
    
    return true;
  }
  
  /**
   * Promeut un spectateur en VIP
   */
  promoteToVip(sessionId: string): boolean {
    const spectator = this.spectators.get(sessionId);
    if (!spectator) return false;
    
    spectator.isVip = true;
    spectator.permissions.canSeePrivateInfo = true;
    spectator.permissions.canReceiveAdvancedStats = true;
    spectator.permissions.priority = 10;
    
    this.emit('spectatorPromoted', { spectator });
    
    console.log(`⭐ [SpectatorManager] ${spectator.username} promu VIP`);
    
    return true;
  }
  
  // === FILTRAGE DES DONNÉES ===
  
  /**
   * Filtre les données de combat selon les permissions du spectateur
   */
  filterBattleDataForSpectator(sessionId: string, battleData: any): any {
    const spectator = this.spectators.get(sessionId);
    if (!spectator) return null;
    
    const filtered = { ...battleData };
    
    // Si pas de permissions privées, masquer infos sensibles
    if (!spectator.permissions.canSeePrivateInfo) {
      // Masquer HP exacts (montrer seulement les pourcentages)
      if (filtered.gameState) {
        if (filtered.gameState.player1?.pokemon) {
          delete filtered.gameState.player1.pokemon.currentHp;
          delete filtered.gameState.player1.pokemon.maxHp;
        }
        if (filtered.gameState.player2?.pokemon) {
          delete filtered.gameState.player2.pokemon.currentHp;
          delete filtered.gameState.player2.pokemon.maxHp;
        }
      }
      
      // Masquer les noms des joueurs si configuré
      if (!this.visibility.showPlayerNames) {
        if (filtered.gameState?.player1) {
          filtered.gameState.player1.name = "Joueur 1";
        }
        if (filtered.gameState?.player2) {
          filtered.gameState.player2.name = "Joueur 2";
        }
      }
    }
    
    return filtered;
  }
  
  /**
   * Récupère la liste des spectateurs avec leurs infos
   */
  getSpectatorsList(includePrivateInfo: boolean = false): SpectatorInfo[] {
    const list = Array.from(this.spectators.values());
    
    if (!includePrivateInfo) {
      return list.map(spec => ({
        sessionId: spec.sessionId,
        username: spec.username,
        joinedAt: spec.joinedAt,
        permissions: { ...spec.permissions },
        isVip: spec.isVip
      }));
    }
    
    return list;
  }
  
  /**
   * Récupère les IDs des spectateurs selon leurs permissions
   */
  getSpectatorIds(filter?: {
    vipOnly?: boolean;
    canChat?: boolean;
    canSeePrivate?: boolean;
  }): string[] {
    let spectators = Array.from(this.spectators.values());
    
    if (filter) {
      spectators = spectators.filter(spec => {
        if (filter.vipOnly && !spec.isVip) return false;
        if (filter.canChat !== undefined && spec.permissions.canChat !== filter.canChat) return false;
        if (filter.canSeePrivate !== undefined && spec.permissions.canSeePrivateInfo !== filter.canSeePrivate) return false;
        return true;
      });
    }
    
    return spectators.map(spec => spec.sessionId);
  }
  
  // === VALIDATION ===
  
  /**
   * Vérifie si un utilisateur peut rejoindre comme spectateur
   */
  private canJoinAsSpectator(sessionId: string): boolean {
    // Déjà spectateur
    if (this.spectators.has(sessionId)) {
      return false;
    }
    
    // Combat non public
    if (!this.visibility.isPublic) {
      return false;
    }
    
    // Limite atteinte
    if (this.spectators.size >= this.visibility.maxSpectators) {
      return false;
    }
    
    // Permission requise (logique à implémenter selon besoins)
    if (this.visibility.requiresPermission) {
      // TODO: Vérifier permissions utilisateur
      return true;
    }
    
    return true;
  }
  
  /**
   * Vérifie si un utilisateur est participant au combat
   */
  private isParticipant(sessionId: string): boolean {
    return (
      sessionId === this.gameState.player1.sessionId ||
      sessionId === this.gameState.player2.sessionId
    );
  }
  
  // === STATISTIQUES ===
  
  /**
   * Met à jour les statistiques
   */
  private updateStats(): void {
    const current = this.spectators.size;
    const vips = Array.from(this.spectators.values()).filter(s => s.isVip).length;
    
    this.stats.totalSpectators = current;
    this.stats.vipSpectators = vips;
    this.stats.peakSpectators = Math.max(this.stats.peakSpectators, current);
    
    // Calcul temps moyen (approximatif)
    const now = Date.now();
    const totalWatchTime = Array.from(this.spectators.values())
      .reduce((sum, spec) => sum + (now - spec.joinedAt), 0);
    
    this.stats.averageWatchTime = current > 0 ? totalWatchTime / current : 0;
  }
  
  /**
   * Récupère les statistiques
   */
  getStats(): SpectatorStats {
    this.updateStats();
    return { ...this.stats };
  }
  
  // === CONFIGURATION ===
  
  /**
   * Met à jour la visibilité du combat
   */
  updateVisibility(newVisibility: Partial<BattleVisibility>): void {
    this.visibility = { ...this.visibility, ...newVisibility };
    
    // Si le combat devient privé, virer les spectateurs
    if (!this.visibility.isPublic) {
      const toRemove = Array.from(this.spectators.keys());
      toRemove.forEach(sessionId => this.removeSpectator(sessionId));
    }
    
    console.log(`⚙️ [SpectatorManager] Visibilité mise à jour:`, this.visibility);
  }
  
  /**
   * Met à jour l'état du jeu
   */
  updateGameState(gameState: BattleGameState): void {
    this.gameState = gameState;
  }
  
  // === SYSTÈME D'ÉVÉNEMENTS ===
  
  /**
   * Ajoute un listener d'événement
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }
  
  /**
   * Émet un événement
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`❌ [SpectatorManager] Erreur listener ${event}:`, error);
      }
    });
  }
  
  // === UTILITAIRES ===
  
  /**
   * Vérifie si le combat a des spectateurs
   */
  hasSpectators(): boolean {
    return this.spectators.size > 0;
  }
  
  /**
   * Compte les spectateurs par type
   */
  getSpectatorCounts(): { total: number; vip: number; regular: number } {
    const total = this.spectators.size;
    const vip = Array.from(this.spectators.values()).filter(s => s.isVip).length;
    
    return {
      total,
      vip,
      regular: total - vip
    };
  }
  
  /**
   * Nettoie les ressources
   */
  cleanup(): void {
    // Retirer tous les spectateurs
    const spectatorIds = Array.from(this.spectators.keys());
    spectatorIds.forEach(id => this.removeSpectator(id));
    
    // Nettoyer les listeners
    this.eventListeners.clear();
    
    console.log(`🧹 [SpectatorManager] Nettoyage effectué pour ${this.battleId}`);
  }
  
  /**
   * Obtient des infos de debug
   */
  getDebugInfo(): any {
    return {
      battleId: this.battleId,
      visibility: this.visibility,
      stats: this.getStats(),
      spectators: this.getSpectatorsList(true),
      version: 'v1.0.0'
    };
  }
}

export default SpectatorManager;
