import { Client } from "@colyseus/core";
import { FollowerManager } from "../managers/FollowerManager";
import { WorldRoom } from "../rooms/WorldRoom";

export class FollowerHandlers {
  private room: WorldRoom;
  private followerManager: FollowerManager;

  constructor(room: WorldRoom) {
    this.room = room;
    this.followerManager = new FollowerManager(room);
    console.log("🐾 [FollowerHandlers] Initialisé");
  }

  /**
   * Configure tous les handlers de followers
   */
  setupHandlers(): void {
    console.log("🐾 [FollowerHandlers] Configuration des handlers...");

    // Demande de mise à jour du follower
    this.room.onMessage("updateFollower", this.handleUpdateFollower.bind(this));
    
    // Demande de suppression du follower
    this.room.onMessage("removeFollower", this.handleRemoveFollower.bind(this));
    
    // ✅ NOUVEAU: Handler pour les transitions de carte
    this.room.onMessage("playerMapTransition", this.handlePlayerMapTransition.bind(this));
    
    // Debug des followers (admin)
    this.room.onMessage("debugFollowers", this.handleDebugFollowers.bind(this));
    
    // Rafraîchir tous les followers (admin)
    this.room.onMessage("refreshAllFollowers", this.handleRefreshAllFollowers.bind(this));

    console.log("✅ [FollowerHandlers] Tous les handlers configurés");
  }

  /**
   * Met à jour le follower d'un joueur
   */
  private async handleUpdateFollower(client: Client): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("followerActionResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      console.log(`🔄 [FollowerHandlers] Mise à jour follower pour ${player.name}`);
      
      await this.followerManager.updatePlayerFollower(client.sessionId);
      
      client.send("followerActionResult", {
        success: true,
        message: "Follower mis à jour"
      });

    } catch (error) {
      console.error("❌ [FollowerHandlers] Erreur updateFollower:", error);
      client.send("followerActionResult", {
        success: false,
        message: "Erreur lors de la mise à jour du follower"
      });
    }
  }

  /**
   * Supprime le follower d'un joueur
   */
  private handleRemoveFollower(client: Client): void {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("followerActionResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      console.log(`🗑️ [FollowerHandlers] Suppression follower pour ${player.name}`);
      
      this.followerManager.removePlayerFollower(client.sessionId);
      
      client.send("followerActionResult", {
        success: true,
        message: "Follower supprimé"
      });

    } catch (error) {
      console.error("❌ [FollowerHandlers] Erreur removeFollower:", error);
      client.send("followerActionResult", {
        success: false,
        message: "Erreur lors de la suppression du follower"
      });
    }
  }

  /**
   * ✅ NOUVEAU: Gère les transitions de carte
   */
  private handlePlayerMapTransition(client: Client, message: { newX: number, newY: number, mapName?: string }): void {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        console.warn(`⚠️ [FollowerHandlers] Joueur non trouvé pour transition: ${client.sessionId}`);
        return;
      }

      console.log(`🗺️ [FollowerHandlers] Transition de carte pour ${player.name} vers (${message.newX}, ${message.newY})`);
      
      // Informer le FollowerManager de la transition
      this.followerManager.onPlayerMapTransition(client.sessionId, message.newX, message.newY);
      
      // Optionnel: Confirmer la transition au client
      client.send("followerTransitionResult", {
        success: true,
        message: "Follower téléporté après transition"
      });

    } catch (error) {
      console.error("❌ [FollowerHandlers] Erreur playerMapTransition:", error);
      client.send("followerTransitionResult", {
        success: false,
        message: "Erreur lors de la transition du follower"
      });
    }
  }

  /**
   * Debug des followers (admin seulement)
   */
  private handleDebugFollowers(client: Client): void {
    try {
      console.log(`🔍 [FollowerHandlers] Debug demandé par ${client.sessionId}`);
      
      this.followerManager.debugFollowers();
      
      client.send("followerDebugResult", {
        success: true,
        message: "Debug affiché dans les logs serveur"
      });

    } catch (error) {
      console.error("❌ [FollowerHandlers] Erreur debugFollowers:", error);
      client.send("followerDebugResult", {
        success: false,
        message: "Erreur lors du debug"
      });
    }
  }

  /**
   * Rafraîchit tous les followers (admin seulement)
   */
  private async handleRefreshAllFollowers(client: Client): Promise<void> {
    try {
      console.log(`🔄 [FollowerHandlers] Rafraîchissement global demandé par ${client.sessionId}`);
      
      await this.followerManager.refreshAllFollowers();
      
      client.send("followerRefreshResult", {
        success: true,
        message: "Tous les followers ont été rafraîchis"
      });

    } catch (error) {
      console.error("❌ [FollowerHandlers] Erreur refreshAllFollowers:", error);
      client.send("followerRefreshResult", {
        success: false,
        message: "Erreur lors du rafraîchissement"
      });
    }
  }

  /**
   * Méthode appelée quand l'équipe d'un joueur change
   */
  async onTeamChanged(playerId: string): Promise<void> {
    try {
      console.log(`⚔️ [FollowerHandlers] Équipe changée pour ${playerId}, mise à jour follower`);
      await this.followerManager.updatePlayerFollower(playerId);
    } catch (error) {
      console.error("❌ [FollowerHandlers] Erreur onTeamChanged:", error);
    }
  }

  /**
   * Méthode appelée quand un joueur bouge
   */
  onPlayerMove(playerId: string, x: number, y: number, direction: string, isMoving: boolean): void {
    try {
      this.followerManager.updateFollowerPosition(playerId, x, y, direction, isMoving);
    } catch (error) {
      console.error("❌ [FollowerHandlers] Erreur onPlayerMove:", error);
    }
  }

  /**
   * ✅ NOUVEAU: Méthode appelée lors d'une transition de carte
   */
  onPlayerMapTransition(playerId: string, newX: number, newY: number): void {
    try {
      console.log(`🗺️ [FollowerHandlers] Transition externe pour ${playerId} vers (${newX}, ${newY})`);
      this.followerManager.onPlayerMapTransition(playerId, newX, newY);
    } catch (error) {
      console.error("❌ [FollowerHandlers] Erreur onPlayerMapTransition:", error);
    }
  }

  /**
   * Nettoyage
   */
  cleanup(): void {
    console.log("🧹 [FollowerHandlers] Nettoyage...");
    this.followerManager.cleanup();
  }

  /**
   * Getters
   */
  getFollowerManager(): FollowerManager {
    return this.followerManager;
  }
}
