// server/src/handlers/MovementHandlers.ts
import { Client } from "@colyseus/core";
import { movementBlockManager, BlockReason } from "../managers/MovementBlockManager";
import { getServerConfig } from '../config/serverConfig';
import { EncounterMapManager } from '../managers/EncounterMapManager';

export class MovementHandlers {
  // 🔐 TRACKING POUR LES RENCONTRES
  private encounterTracker: Map<string, {
    stepCount: number;
    lastPosition: { x: number; y: number };
    lastEncounterCheck: number;
  }> = new Map();

  // 🗺️ MANAGERS DE MAP PAR ZONE
  private encounterMapManagers: Map<string, EncounterMapManager> = new Map();

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
    // ✅ NOUVEAU: Notifier le FollowerHandlers du mouvement
    const followerHandlers = this.room.getFollowerHandlers();
    if (followerHandlers) {
      followerHandlers.onPlayerMove(
        client.sessionId, 
        data.x, 
        data.y, 
        data.direction, 
        data.isMoving
      );
    }
    // Log occasionnel pour debug
    if (Math.random() < 0.05) { // 5% de chance
      console.log(`🚶 [MovementHandlers] ${player.name}: (${player.x}, ${player.y}) dans ${player.currentZone}`);
    }

    // ✅ NOUVEAU: Tracking des rencontres automatique
    this.trackEncounterMovement(client.sessionId, data.x, data.y, data.currentZone || player.currentZone, data.terrainType);
  }

  /**
   * ✅ NOUVEAU: Tracking automatique pour les rencontres
   */
  private async trackEncounterMovement(
    sessionId: string, 
    x: number, 
    y: number, 
    zone: string,
    terrainType?: string
  ): Promise<void> {
    const config = getServerConfig().encounterSystem;
    if (!config.enabled) return;

    // Obtenir ou créer le tracker
    let tracker = this.encounterTracker.get(sessionId);
    if (!tracker) {
      tracker = {
        stepCount: 0,
        lastPosition: { x, y },
        lastEncounterCheck: 0
      };
      this.encounterTracker.set(sessionId, tracker);
      return;
    }

    // Calculer la distance parcourue
    const distance = Math.sqrt(
      Math.pow(x - tracker.lastPosition.x, 2) + 
      Math.pow(y - tracker.lastPosition.y, 2)
    );

    // Compter un "pas" si distance suffisante
    if (distance >= config.minStepDistance) {
      tracker.stepCount++;
      tracker.lastPosition = { x, y };

      // Log occasionnel des pas
      if (tracker.stepCount % 5 === 0) {
        console.log(`👣 [MovementHandlers] ${sessionId}: ${tracker.stepCount} pas dans ${zone}`);
      }

      // Vérifier rencontre si assez de pas ET si dans un terrain approprié
      if (tracker.stepCount >= config.stepsPerEncounterCheck) {
        await this.checkForWildEncounter(sessionId, x, y, zone, terrainType);
        tracker.stepCount = 0; // Reset compteur
      }
    }
  }

  /**
   * ✅ NOUVEAU: Vérification des rencontres sauvages
   */
  private async checkForWildEncounter(
    sessionId: string, 
    x: number, 
    y: number, 
    zone: string,
    terrainType?: string
  ): Promise<void> {
    const config = getServerConfig().encounterSystem;
    const tracker = this.encounterTracker.get(sessionId);
    if (!tracker) return;

    const now = Date.now();
    
    // Vérifier cooldown
    if (now - tracker.lastEncounterCheck < config.playerCooldownMs) {
      return;
    }
    
    tracker.lastEncounterCheck = now;

    // Déterminer si le joueur est dans un terrain avec des rencontres
    const method = this.determineEncounterMethod(terrainType, x, y, zone);
    if (!method) {
      return; // Pas dans un terrain approprié
    }

    console.log(`🎲 [MovementHandlers] Vérification rencontre pour ${sessionId} en ${method} dans ${zone}`);

    // Obtenir les handlers d'encounter de la room
    const encounterHandlers = this.room.getEncounterHandlers();
    if (!encounterHandlers) {
      console.warn(`⚠️ [MovementHandlers] EncounterHandlers non disponible`);
      return;
    }

    // Déclencher la vérification via les EncounterHandlers de manière sécurisée
    try {
      await encounterHandlers.triggerServerEncounter(sessionId, x, y, method);
    } catch (error) {
      console.error(`❌ [MovementHandlers] Erreur déclenchement rencontre:`, error);
    }
  }

  /**
   * ✅ NOUVEAU: Détermine la méthode de rencontre selon le terrain (SÉCURISÉ)
   */
  private determineEncounterMethod(
    terrainType: string | undefined, 
    x: number, 
    y: number, 
    zone: string
  ): 'grass' | 'fishing' | null {
    
    // Obtenir ou créer le manager de map pour cette zone
    let encounterMapManager = this.encounterMapManagers.get(zone);
    if (!encounterMapManager) {
      try {
        encounterMapManager = new EncounterMapManager(zone);
        this.encounterMapManagers.set(zone, encounterMapManager);
        console.log(`🗺️ [MovementHandlers] EncounterMapManager créé pour ${zone}`);
      } catch (error) {
        console.error(`❌ [MovementHandlers] Erreur création EncounterMapManager pour ${zone}:`, error);
        return null;
      }
    }

    // ✅ VALIDATION SÉCURISÉE : Serveur détermine le terrain
    const validation = encounterMapManager.validateClientTerrain(x, y, terrainType);
    
    if (validation.mismatch) {
      console.warn(`🚫 [MovementHandlers] Terrain suspect pour ${zone} à (${x}, ${y}) - utilisation données serveur`);
    }

    // ✅ UTILISER LES DONNÉES SERVEUR (sécurisé)
    const serverTerrain = validation.serverTerrain;
    
    // Log détaillé pour debug
    if (serverTerrain.canEncounter) {
      console.log(`✅ [MovementHandlers] Encounter possible : ${serverTerrain.method} dans zone ${serverTerrain.encounterZone}`);
    }
    
    return serverTerrain.method; // null, 'grass', ou 'fishing'
  }

  /**
   * ✅ NOUVEAU: Debug terrain à une position
   */
  public debugTerrainAt(x: number, y: number, zone: string): void {
    const encounterMapManager = this.encounterMapManagers.get(zone);
    if (!encounterMapManager) {
      console.log(`❌ [MovementHandlers] Pas de manager pour zone ${zone}`);
      return;
    }

    encounterMapManager.debugPosition(x, y);
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

  // ✅ NOUVEAU: Accès aux EncounterMapManagers
  public getEncounterMapManager(zone: string): EncounterMapManager | undefined {
    return this.encounterMapManagers.get(zone);
  }

  // ✅ NOUVEAU: Nettoyage des trackers d'encounter
  private cleanupEncounterTrackers(): void {
    const now = Date.now();
    const INACTIVE_TIMEOUT = 300000; // 5 minutes

    for (const [sessionId, tracker] of this.encounterTracker.entries()) {
      if (now - tracker.lastEncounterCheck > INACTIVE_TIMEOUT) {
        this.encounterTracker.delete(sessionId);
      }
    }
  }

  // ✅ NOUVEAU: Stats des encounters pour debug
  public getEncounterStats(): {
    totalTrackedPlayers: number;
    avgStepsPerPlayer: number;
    recentChecks: number;
    loadedMaps: string[];
  } {
    const now = Date.now();
    const recentThreshold = 60000; // 1 minute

    const players = Array.from(this.encounterTracker.values());
    const recentChecks = players.filter(
      tracker => now - tracker.lastEncounterCheck < recentThreshold
    ).length;

    const avgSteps = players.length > 0 
      ? players.reduce((sum, tracker) => sum + tracker.stepCount, 0) / players.length 
      : 0;

    return {
      totalTrackedPlayers: this.encounterTracker.size,
      avgStepsPerPlayer: Math.round(avgSteps),
      recentChecks,
      loadedMaps: Array.from(this.encounterMapManagers.keys())
    };
  }

  /**
   * Méthode de nettoyage
   */
  cleanup(): void {
    console.log(`🧹 [MovementHandlers] Nettoyage des handlers de mouvement...`);
    
    // ✅ NOUVEAU: Nettoyer les trackers d'encounter
    this.cleanupEncounterTrackers();
    
    // Nettoyer les références si nécessaire
    this.encounterTracker.clear();
    this.encounterMapManagers.clear();
  }

  /**
   * Méthode de debug pour l'état global
   */
  debugStatus(): void {
    console.log(`🔍 [MovementHandlers] === DEBUG STATUS ===`);
    console.log(`📊 Stats MovementBlockManager:`, movementBlockManager.getStats());
    console.log(`🎲 Stats Encounters:`, this.getEncounterStats());
    console.log(`🎮 Room clients: ${this.room.clients.length}`);
    console.log(`👥 Players in state: ${this.room.state.players.size}`);
    
    // Debug des maps chargées
    this.encounterMapManagers.forEach((manager, zone) => {
      console.log(`🗺️ Map ${zone}:`, manager.getStats());
    });
  }
}
