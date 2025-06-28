// server/src/managers/MovementBlockManager.ts
import { Client } from "@colyseus/core";

export type BlockReason = 
  | 'dialog' 
  | 'battle' 
  | 'menu' 
  | 'cutscene' 
  | 'transition' 
  | 'interaction'
  | 'shop'
  | 'encounter'
  | 'custom';

interface MovementBlock {
  playerId: string;
  reason: BlockReason;
  timestamp: number;
  duration?: number; // Durée en ms, undefined = permanent jusqu'à déblocage manuel
  metadata?: any; // Données additionnelles (ex: dialogId, battleId, etc.)
}

export class MovementBlockManager {
  private static instance: MovementBlockManager;
  private blockedPlayers: Map<string, MovementBlock[]> = new Map();
  private roomRef: any; // Référence à la WorldRoom

  private constructor() {}

  public static getInstance(): MovementBlockManager {
    if (!MovementBlockManager.instance) {
      MovementBlockManager.instance = new MovementBlockManager();
    }
    return MovementBlockManager.instance;
  }

  public setRoomReference(room: any): void {
    this.roomRef = room;
    console.log(`🔒 [MovementBlockManager] Référence room configurée`);
  }

  /**
   * Bloque les mouvements d'un joueur
   */
  public blockMovement(
    playerId: string, 
    reason: BlockReason, 
    duration?: number,
    metadata?: any
  ): boolean {
    try {
      const block: MovementBlock = {
        playerId,
        reason,
        timestamp: Date.now(),
        duration,
        metadata
      };

      // Ajouter le blocage à la liste
      if (!this.blockedPlayers.has(playerId)) {
        this.blockedPlayers.set(playerId, []);
      }
      
      const playerBlocks = this.blockedPlayers.get(playerId)!;
      
      // Éviter les doublons pour la même raison
      const existingIndex = playerBlocks.findIndex(b => b.reason === reason);
      if (existingIndex !== -1) {
        playerBlocks[existingIndex] = block; // Remplacer
      } else {
        playerBlocks.push(block); // Ajouter
      }

      // Programmer le déblocage automatique si durée spécifiée
      if (duration && duration > 0) {
        setTimeout(() => {
          this.unblockMovement(playerId, reason);
        }, duration);
      }

      // Notifier le client
      this.notifyClient(playerId, 'movementBlocked', {
        reason,
        duration,
        metadata,
        totalBlocks: playerBlocks.length
      });

      console.log(`🔒 [MovementBlock] ${playerId} bloqué pour: ${reason}${duration ? ` (${duration}ms)` : ' (permanent)'}`);
      return true;

    } catch (error) {
      console.error(`❌ [MovementBlock] Erreur blocage ${playerId}:`, error);
      return false;
    }
  }

  /**
   * Débloque les mouvements d'un joueur pour une raison spécifique
   */
  public unblockMovement(playerId: string, reason?: BlockReason): boolean {
    try {
      const playerBlocks = this.blockedPlayers.get(playerId);
      if (!playerBlocks || playerBlocks.length === 0) {
        return true; // Déjà débloqué
      }

      if (reason) {
        // Débloquer pour une raison spécifique
        const index = playerBlocks.findIndex(b => b.reason === reason);
        if (index !== -1) {
          playerBlocks.splice(index, 1);
          console.log(`🔓 [MovementBlock] ${playerId} débloqué pour: ${reason}`);
        }
      } else {
        // Débloquer tout
        this.blockedPlayers.delete(playerId);
        console.log(`🔓 [MovementBlock] ${playerId} totalement débloqué`);
      }

      // Nettoyer si plus de blocages
      if (playerBlocks && playerBlocks.length === 0) {
        this.blockedPlayers.delete(playerId);
      }

      // Notifier le client
      const isStillBlocked = this.isMovementBlocked(playerId);
      this.notifyClient(playerId, 'movementUnblocked', {
        reason,
        stillBlocked: isStillBlocked,
        remainingBlocks: isStillBlocked ? this.getPlayerBlocks(playerId).length : 0
      });

      return true;

    } catch (error) {
      console.error(`❌ [MovementBlock] Erreur déblocage ${playerId}:`, error);
      return false;
    }
  }

  /**
   * Vérifie si un joueur est bloqué
   */
  public isMovementBlocked(playerId: string): boolean {
    const playerBlocks = this.blockedPlayers.get(playerId);
    if (!playerBlocks || playerBlocks.length === 0) {
      return false;
    }

    // Nettoyer les blocages expirés
    const now = Date.now();
    const validBlocks = playerBlocks.filter(block => {
      if (!block.duration) return true; // Permanent
      return (now - block.timestamp) < block.duration;
    });

    // Mettre à jour la liste
    if (validBlocks.length !== playerBlocks.length) {
      if (validBlocks.length === 0) {
        this.blockedPlayers.delete(playerId);
      } else {
        this.blockedPlayers.set(playerId, validBlocks);
      }
    }

    return validBlocks.length > 0;
  }

  /**
   * Obtient tous les blocages d'un joueur
   */
  public getPlayerBlocks(playerId: string): MovementBlock[] {
    return this.blockedPlayers.get(playerId) || [];
  }

  /**
   * Vérifie si un joueur est bloqué pour une raison spécifique
   */
  public isBlockedFor(playerId: string, reason: BlockReason): boolean {
    const blocks = this.getPlayerBlocks(playerId);
    return blocks.some(block => block.reason === reason);
  }

  /**
   * Force le déblocage complet d'un joueur (urgence)
   */
  public forceUnblockAll(playerId: string): boolean {
    try {
      const wasBlocked = this.isMovementBlocked(playerId);
      this.blockedPlayers.delete(playerId);
      
      if (wasBlocked) {
        this.notifyClient(playerId, 'movementForceUnblocked', {
          message: 'Tous les blocages supprimés'
        });
        console.log(`🔥 [MovementBlock] ${playerId} déblocage forcé`);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ [MovementBlock] Erreur déblocage forcé ${playerId}:`, error);
      return false;
    }
  }

  /**
   * Validation côté serveur : peut-on traiter ce mouvement ?
   */
  public validateMovement(playerId: string, moveData: any): {
    allowed: boolean;
    reason?: BlockReason;
    message?: string;
  } {
    if (!this.isMovementBlocked(playerId)) {
      return { allowed: true };
    }

    const blocks = this.getPlayerBlocks(playerId);
    const primaryBlock = blocks[0]; // Le plus ancien/important

    return {
      allowed: false,
      reason: primaryBlock.reason,
      message: this.getBlockMessage(primaryBlock.reason)
    };
  }

  /**
   * Messages d'erreur pour chaque type de blocage
   */
  private getBlockMessage(reason: BlockReason): string {
    const messages = {
      dialog: "Vous ne pouvez pas bouger pendant un dialogue",
      battle: "Vous ne pouvez pas bouger pendant un combat",
      menu: "Fermez le menu pour pouvoir bouger",
      cutscene: "Attendez la fin de la cinématique",
      transition: "Transition en cours...",
      interaction: "Interaction en cours",
      shop: "Vous êtes dans un magasin",
      encounter: "Rencontre Pokémon en cours",
      custom: "Mouvement temporairement bloqué"
    };
    return messages[reason] || "Mouvement bloqué";
  }

  /**
   * Notifie le client spécifique
   */
  private notifyClient(playerId: string, eventType: string, data: any): void {
    if (!this.roomRef) {
      console.warn(`⚠️ [MovementBlock] Pas de référence room pour notifier ${playerId}`);
      return;
    }

    try {
      // Trouver le client dans la room
      const client = this.roomRef.clients.find((c: Client) => c.sessionId === playerId);
      if (client) {
        client.send(eventType, data);
      } else {
        console.warn(`⚠️ [MovementBlock] Client ${playerId} non trouvé`);
      }
    } catch (error) {
      console.error(`❌ [MovementBlock] Erreur notification ${playerId}:`, error);
    }
  }

  /**
   * Debug : affiche l'état de tous les blocages
   */
  public debugAllBlocks(): void {
    console.log(`🔍 [MovementBlock] === DEBUG TOUS LES BLOCAGES ===`);
    console.log(`👥 Joueurs bloqués: ${this.blockedPlayers.size}`);
    
    this.blockedPlayers.forEach((blocks, playerId) => {
      console.log(`🔒 ${playerId}: ${blocks.length} blocage(s)`);
      blocks.forEach((block, index) => {
        const elapsed = Date.now() - block.timestamp;
        const remaining = block.duration ? Math.max(0, block.duration - elapsed) : 'permanent';
        console.log(`  ${index + 1}. ${block.reason} - ${remaining}ms restant`);
      });
    });
  }

  /**
   * Nettoie les blocages expirés (appelé périodiquement)
   */
  public cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    this.blockedPlayers.forEach((blocks, playerId) => {
      const validBlocks = blocks.filter(block => {
        if (!block.duration) return true;
        return (now - block.timestamp) < block.duration;
      });

      if (validBlocks.length !== blocks.length) {
        if (validBlocks.length === 0) {
          this.blockedPlayers.delete(playerId);
        } else {
          this.blockedPlayers.set(playerId, validBlocks);
        }
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`🧹 [MovementBlock] ${cleanedCount} blocages expirés nettoyés`);
    }
  }

  /**
   * Obtient les statistiques globales
   */
  public getStats(): {
    totalBlockedPlayers: number;
    totalBlocks: number;
    blocksByReason: Record<BlockReason, number>;
  } {
    const stats = {
      totalBlockedPlayers: this.blockedPlayers.size,
      totalBlocks: 0,
      blocksByReason: {} as Record<BlockReason, number>
    };

    this.blockedPlayers.forEach(blocks => {
      stats.totalBlocks += blocks.length;
      blocks.forEach(block => {
        stats.blocksByReason[block.reason] = (stats.blocksByReason[block.reason] || 0) + 1;
      });
    });

    return stats;
  }
}

// ✅ INSTANCE GLOBALE - Accessible partout
export const movementBlockManager = MovementBlockManager.getInstance();
