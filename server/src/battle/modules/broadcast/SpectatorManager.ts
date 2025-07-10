// server/src/battle/modules/broadcast/SpectatorManager.ts
// GESTION BASIQUE DES SPECTATEURS - SQUELETTE SIMPLE

import { BattleGameState } from '../../types/BattleTypes';

// === INTERFACES ===

export interface SpectatorInfo {
  sessionId: string;
  battleId: string;
  joinedAt: number;
  isActive: boolean;
}

export interface BattleVisibility {
  battleId: string;
  isPublic: boolean;
  allowSpectators: boolean;
  maxSpectators: number;
  battleType: 'wild' | 'pvp' | 'trainer';
}

/**
 * SPECTATOR MANAGER - Gestion basique des spectateurs
 * 
 * Responsabilités (pour l'instant) :
 * - Ajouter/retirer spectateurs
 * - Vérifier permissions de base
 * - Compter spectateurs
 * - Règles simples public/privé
 * 
 * ÉVOLUTIF : Base pour futures features (chat, réactions, etc.)
 */
export class SpectatorManager {
  
  private spectators: Map<string, SpectatorInfo> = new Map();
  private battleVisibility: Map<string, BattleVisibility> = new Map();
  
  constructor() {
    console.log('👁️ [SpectatorManager] Initialisé - Mode basique');
  }
  
  // === GESTION SPECTATEURS ===
  
  /**
   * Ajoute un spectateur à un combat
   */
  addSpectator(sessionId: string, battleId: string): boolean {
    console.log(`👁️ [SpectatorManager] Tentative ajout spectateur ${sessionId} → ${battleId}`);
    
    // Vérifier si peut regarder
    if (!this.canWatchBattle(sessionId, battleId)) {
      console.log(`❌ [SpectatorManager] Spectateur ${sessionId} refusé pour ${battleId}`);
      return false;
    }
    
    // Ajouter le spectateur
    const spectatorInfo: SpectatorInfo = {
      sessionId,
      battleId,
      joinedAt: Date.now(),
      isActive: true
    };
    
    this.spectators.set(sessionId, spectatorInfo);
    
    console.log(`✅ [SpectatorManager] Spectateur ${sessionId} ajouté à ${battleId}`);
    return true;
  }
  
  /**
   * Retire un spectateur
   */
  removeSpectator(sessionId: string): boolean {
    const removed = this.spectators.delete(sessionId);
    
    if (removed) {
      console.log(`👋 [SpectatorManager] Spectateur ${sessionId} retiré`);
    }
    
    return removed;
  }
  
  /**
   * Vérifie si un spectateur peut regarder un combat
   */
  canWatchBattle(sessionId: string, battleId: string): boolean {
    const visibility = this.battleVisibility.get(battleId);
    
    // Pas de règles définies = autoriser (défaut permissif)
    if (!visibility) {
      return true;
    }
    
    // Combat n'autorise pas les spectateurs
    if (!visibility.allowSpectators) {
      return false;
    }
    
    // Combat privé (PvP par défaut)
    if (!visibility.isPublic) {
      // TODO: Système d'invitations/liens plus tard
      return false;
    }
    
    // Vérifier limite de spectateurs
    const currentCount = this.getSpectatorCount(battleId);
    if (currentCount >= visibility.maxSpectators) {
      return false;
    }
    
    return true;
  }
  
  // === CONFIGURATION COMBATS ===
  
  /**
   * Configure la visibilité d'un combat
   */
  setBattleVisibility(battleId: string, gameState: BattleGameState): void {
    const visibility: BattleVisibility = {
      battleId,
      isPublic: this.getDefaultVisibility(gameState.type),
      allowSpectators: true,
      maxSpectators: this.getDefaultMaxSpectators(gameState.type),
      battleType: gameState.type
    };
    
    this.battleVisibility.set(battleId, visibility);
    
    console.log(`👁️ [SpectatorManager] Visibilité configurée pour ${battleId}: public=${visibility.isPublic}, max=${visibility.maxSpectators}`);
  }
  
  /**
   * Met à jour les paramètres de visibilité
   */
  updateBattleVisibility(
    battleId: string, 
    updates: Partial<Omit<BattleVisibility, 'battleId' | 'battleType'>>
  ): void {
    const current = this.battleVisibility.get(battleId);
    if (current) {
      Object.assign(current, updates);
      console.log(`🔧 [SpectatorManager] Visibilité mise à jour pour ${battleId}`);
    }
  }
  
  // === INFORMATIONS ===
  
  /**
   * Récupère le nombre de spectateurs pour un combat
   */
  getSpectatorCount(battleId: string): number {
    return Array.from(this.spectators.values())
      .filter(s => s.battleId === battleId && s.isActive)
      .length;
  }
  
  /**
   * Récupère la liste des spectateurs d'un combat
   */
  getBattleSpectators(battleId: string): string[] {
    return Array.from(this.spectators.values())
      .filter(s => s.battleId === battleId && s.isActive)
      .map(s => s.sessionId);
  }
  
  /**
   * Récupère les infos d'un spectateur
   */
  getSpectatorInfo(sessionId: string): SpectatorInfo | null {
    return this.spectators.get(sessionId) || null;
  }
  
  /**
   * Vérifie si un utilisateur est spectateur d'un combat
   */
  isWatching(sessionId: string, battleId: string): boolean {
    const info = this.spectators.get(sessionId);
    return info ? info.battleId === battleId && info.isActive : false;
  }
  
  // === NETTOYAGE ===
  
  /**
   * Nettoie tous les spectateurs d'un combat terminé
   */
  cleanupBattle(battleId: string): number {
    const removed = Array.from(this.spectators.entries())
      .filter(([_, info]) => info.battleId === battleId)
      .map(([sessionId, _]) => sessionId);
    
    removed.forEach(sessionId => this.spectators.delete(sessionId));
    this.battleVisibility.delete(battleId);
    
    console.log(`🧹 [SpectatorManager] Combat ${battleId} nettoyé - ${removed.length} spectateurs retirés`);
    return removed.length;
  }
  
  /**
   * Marque un spectateur comme inactif (déconnexion)
   */
  markInactive(sessionId: string): void {
    const info = this.spectators.get(sessionId);
    if (info) {
      info.isActive = false;
      console.log(`💤 [SpectatorManager] Spectateur ${sessionId} marqué inactif`);
    }
  }
  
  // === RÈGLES PAR DÉFAUT ===
  
  private getDefaultVisibility(battleType: string): boolean {
    switch (battleType) {
      case 'wild':
        return true;  // Combats sauvages = publics
      case 'pvp':
        return false; // PvP = privés par défaut
      case 'trainer':
        return true;  // Dresseurs = publics
      default:
        return true;  // Défaut permissif
    }
  }
  
  private getDefaultMaxSpectators(battleType: string): number {
    switch (battleType) {
      case 'wild':
        return 10;   // Limite raisonnable
      case 'pvp':
        return 20;   // Plus populaire
      case 'trainer':
        return 15;   // Intermédiaire
      default:
        return 10;   // Défaut sûr
    }
  }
  
  // === STATISTIQUES ===
  
  /**
   * Statistiques générales
   */
  getStats(): any {
    const totalSpectators = this.spectators.size;
    const activeSpectators = Array.from(this.spectators.values())
      .filter(s => s.isActive).length;
    
    const battleCounts = new Map<string, number>();
    Array.from(this.spectators.values()).forEach(s => {
      if (s.isActive) {
        battleCounts.set(s.battleId, (battleCounts.get(s.battleId) || 0) + 1);
      }
    });
    
    return {
      version: 'basic_v1',
      totalSpectators,
      activeSpectators,
      activeBattles: this.battleVisibility.size,
      mostWatchedBattle: this.getMostWatchedBattle(),
      features: ['basic_permissions', 'public_private_battles', 'spectator_limits']
    };
  }
  
  private getMostWatchedBattle(): { battleId: string; count: number } | null {
    const counts = new Map<string, number>();
    
    Array.from(this.spectators.values())
      .filter(s => s.isActive)
      .forEach(s => {
        counts.set(s.battleId, (counts.get(s.battleId) || 0) + 1);
      });
    
    if (counts.size === 0) return null;
    
    const [battleId, count] = Array.from(counts.entries())
      .reduce((max, current) => current[1] > max[1] ? current : max);
    
    return { battleId, count };
  }
  
  /**
   * Reset complet (pour tests)
   */
  reset(): void {
    this.spectators.clear();
    this.battleVisibility.clear();
    console.log('🔄 [SpectatorManager] Reset effectué');
  }
}

export default SpectatorManager;
