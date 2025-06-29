// server/src/handlers/MovementHandlers.ts
import { Client } from "@colyseus/core";
import { movementBlockManager, BlockReason } from "../managers/MovementBlockManager";

export class MovementHandlers {
  constructor(private room: any) {}

  /**
   * Configure tous les handlers liés au mouvement et au blocage
   */
  setupHandlers(): void {
    console.log(`🎮 [MovementHandlers] Configuration des handlers de mouvement...`);

    // === HANDLERS DE MOUVEMENT STANDARD ===

    // Mouvement du joueur (handler principal)
    this.room.onMessage("playerMove", (client: Client, data: any) => {
      this.handlePlayerMove(client, data);
    });

    // === HANDLERS DE BLOCAGE/DÉBLOCAGE ===

    // Bloquer le mouvement (demande du client)
    this.room.onMessage("blockMovement", (client: Client, data: {
      reason: BlockReason;
      duration?: number;
      metadata?: any;
    }) => {
      this.handleBlockMovement(client, data);
    });

    // Débloquer le mouvement (demande du client)
    this.room.onMessage("unblockMovement", (client: Client, data: {
      reason?: BlockReason;
    }) => {
      this.handleUnblockMovement(client, data);
    });

    // === HANDLERS DE DEBUG ET ADMINISTRATION ===

    // Debug des blocages (admin/dev seulement)
    this.room.onMessage("debugMovementBlocks", (client: Client) => {
      this.handleDebugMovementBlocks(client);
    });

    // Forcer le déblocage (admin/urgence)
    this.room.onMessage("forceUnblockMovement", (client: Client, data: { 
      targetPlayerId?: string 
    }) => {
      this.handleForceUnblockMovement(client, data);
    });

    // Vérifier l'état de blocage
    this.room.onMessage("checkMovementBlock", (client: Client) => {
      this.handleCheckMovementBlock(client);
    });

    // === HANDLERS DE POSITION ET ROLLBACK ===

    // Forcer une position (rollback de collision/blocage)
    this.room.onMessage("requestPositionRollback", (client: Client, data: {
      reason: string;
      lastValidX: number;
      lastValidY: number;
    }) => {
      this.handlePositionRollback(client, data);
    });

    console.log(`✅ [MovementHandlers] Tous les handlers de mouvement configurés`);
  }

  /**
   * Handler principal pour le mouvement des joueurs
   */
  private handlePlayerMove(client: Client, data: any): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    // ✅ ÉTAPE 1: Validation des mouvements via MovementBlockManager
    const validation = movementBlockManager.validateMovement(client.sessionId, data);
    if (!validation.allowed) {
      console.log(`🚫 [MovementHandlers] Mouvement refusé pour ${player.name}: ${validation.reason}`);
      
      // Renvoyer la position serveur pour rollback avec info de blocage
      client.send("forcePlayerPosition", {
        x: player.x,
        y: player.y,
        direction: player.direction,
        currentZone: player.currentZone,
        blocked: true,
        reason: validation.reason,
        message: validation.message
      });
      return;
    }

    // ✅ ÉTAPE 2: Vérification collision (déléguer au ZoneManager)
    const collisionManager = this.room.getZoneManager()?.getCollisionManager(player.currentZone);
    if (collisionManager && collisionManager.isBlocked(data.x, data.y)) {
      // Mouvement interdit par collision : rollback normal
      client.send("forcePlayerPosition", {
        x: player.x,
        y: player.y,
        direction: player.direction,
        currentZone: player.currentZone,
        blocked: false, // Ce n'est pas un blocage système, juste une collision
        collision: true
      });
      return;
    }

    // ✅ ÉTAPE 3: Si tout est OK, appliquer le mouvement
    player.x = data.x;
    player.y = data.y;
    player.direction = data.direction;
    player.isMoving = data.isMoving;

    // Notification de changement de zone au TimeWeatherService
    if (data.currentZone && data.currentZone !== player.currentZone) {
      const timeWeatherService = this.room.timeWeatherService;
      if (timeWeatherService) {
        timeWeatherService.updateClientZone(client, data.currentZone);
      }
    }

    // Mise à jour de la zone
    if (data.currentZone) {
      player.currentZone = data.currentZone;
    }

    // Log occasionnel pour debug
    if (Math.random() < 0.05) { // 5% de chance
      console.log(`🚶 [MovementHandlers] ${player.name}: (${player.x}, ${player.y}) dans ${player.currentZone}`);
    }
  }

  /**
   * Handler pour bloquer le mouvement d'un joueur
   */
  private handleBlockMovement(client: Client, data: {
    reason: BlockReason;
    duration?: number;
    metadata?: any;
  }): void {
    console.log(`🔒 [MovementHandlers] Demande blocage de ${client.sessionId}: ${data.reason}`);
    
    const success = movementBlockManager.blockMovement(
      client.sessionId,
      data.reason,
      data.duration,
      data.metadata
    );
    
    if (success) {
      console.log(`✅ [MovementHandlers] Blocage appliqué: ${data.reason}${data.duration ? ` (${data.duration}ms)` : ''}`);
      
      // Confirmer au client
      client.send("movementBlockConfirmed", {
        reason: data.reason,
        duration: data.duration,
        timestamp: Date.now()
      });
    } else {
      console.error(`❌ [MovementHandlers] Échec blocage pour ${client.sessionId}`);
      
      // Notifier l'échec
      client.send("movementBlockFailed", {
        reason: data.reason,
        error: "Impossible d'appliquer le blocage"
      });
    }
  }

  /**
   * Handler pour débloquer le mouvement d'un joueur
   */
  private handleUnblockMovement(client: Client, data: {
    reason?: BlockReason;
  }): void {
    console.log(`🔓 [MovementHandlers] Demande déblocage de ${client.sessionId}: ${data.reason || 'ALL'}`);
    
    const success = movementBlockManager.unblockMovement(client.sessionId, data.reason);
    
    if (success) {
      console.log(`✅ [MovementHandlers] Déblocage réussi`);
      
      // Confirmer au client
      client.send("movementUnblockConfirmed", {
        reason: data.reason,
        timestamp: Date.now()
      });
    } else {
      console.error(`❌ [MovementHandlers] Échec déblocage pour ${client.sessionId}`);
      
      // Notifier l'échec
      client.send("movementUnblockFailed", {
        reason: data.reason,
        error: "Impossible de débloquer"
      });
    }
  }

  /**
   * Handler pour debug des blocages
   */
  private handleDebugMovementBlocks(client: Client): void {
    console.log(`🔍 [MovementHandlers] Debug blocages demandé par ${client.sessionId}`);
    
    // Afficher debug dans les logs serveur
    movementBlockManager.debugAllBlocks();
    
    // Envoyer les stats au client
    const stats = movementBlockManager.getStats();
    client.send("movementBlockStats", {
      ...stats,
      timestamp: Date.now(),
      requestedBy: client.sessionId
    });
  }

  /**
   * Handler pour forcer le déblocage (admin)
   */
  private handleForceUnblockMovement(client: Client, data: { 
    targetPlayerId?: string 
  }): void {
    const targetId = data.targetPlayerId || client.sessionId;
    
    console.log(`🔥 [MovementHandlers] Déblocage forcé ${targetId} par ${client.sessionId}`);
    
    const success = movementBlockManager.forceUnblockAll(targetId);
    
    client.send("forceUnblockResult", {
      success,
      targetPlayerId: targetId,
      message: success ? "Déblocage forcé réussi" : "Erreur lors du déblocage",
      timestamp: Date.now()
    });
    
    // Log pour audit
    if (success) {
      console.log(`🔥 [ADMIN] ${client.sessionId} a forcé le déblocage de ${targetId}`);
    }
  }

  /**
   * Handler pour vérifier l'état de blocage
   */
  private handleCheckMovementBlock(client: Client): void {
    const isBlocked = movementBlockManager.isMovementBlocked(client.sessionId);
    const blocks = movementBlockManager.getPlayerBlocks(client.sessionId);
    
    client.send("movementBlockStatus", {
      isBlocked,
      blocks: blocks.map(b => ({
        reason: b.reason,
        timestamp: b.timestamp,
        duration: b.duration,
        metadata: b.metadata,
        timeRemaining: b.duration ? Math.max(0, b.duration - (Date.now() - b.timestamp)) : null
      })),
      timestamp: Date.now()
    });
    
    console.log(`📊 [MovementHandlers] Status envoyé à ${client.sessionId}: ${isBlocked ? 'BLOQUÉ' : 'LIBRE'} (${blocks.length} blocages)`);
  }

  /**
   * Handler pour rollback de position
   */
  private handlePositionRollback(client: Client, data: {
    reason: string;
    lastValidX: number;
    lastValidY: number;
  }): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`⬅️ [MovementHandlers] Rollback position pour ${player.name}: ${data.reason}`);
    
    // Forcer la position du joueur
    player.x = data.lastValidX;
    player.y = data.lastValidY;
    
    // Confirmer au client
    client.send("forcePlayerPosition", {
      x: player.x,
      y: player.y,
      direction: player.direction,
      currentZone: player.currentZone,
      rollback: true,
      reason: data.reason
    });
  }

  /**
   * Méthodes utilitaires pour l'accès depuis WorldRoom
   */
  
  public blockPlayerMovement(
    playerId: string, 
    reason: BlockReason, 
    duration?: number,
    metadata?: any
  ): boolean {
    return movementBlockManager.blockMovement(playerId, reason, duration, metadata);
  }

  public unblockPlayerMovement(playerId: string, reason?: BlockReason): boolean {
    return movementBlockManager.unblockMovement(playerId, reason);
  }

  public isPlayerMovementBlocked(playerId: string): boolean {
    return movementBlockManager.isMovementBlocked(playerId);
  }

  public getMovementBlockManager() {
    return movementBlockManager;
  }

  /**
   * Méthode de nettoyage
   */
  cleanup(): void {
    console.log(`🧹 [MovementHandlers] Nettoyage des handlers de mouvement...`);
    // Nettoyer les références si nécessaire
  }

  /**
   * Méthode de debug pour l'état global
   */
  debugStatus(): void {
    console.log(`🔍 [MovementHandlers] === DEBUG STATUS ===`);
    console.log(`📊 Stats MovementBlockManager:`, movementBlockManager.getStats());
    console.log(`🎮 Room clients: ${this.room.clients.length}`);
    console.log(`👥 Players in state: ${this.room.state.players.size}`);
  }
}
