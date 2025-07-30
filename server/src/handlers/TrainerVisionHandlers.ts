// server/src/handlers/TrainerVisionHandlers.ts
import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { Player } from "../schema/PokeWorldState";
import { PokemonTrainerVisionService } from "../services/PokemonTrainerVisionService";
import { ActionType } from "../Intelligence/Core/ActionTypes";
import { BlockReason } from "../managers/MovementBlockManager";

// ===== INTERFACES =====

interface TrainerDetectionEvent {
  trainerId: string;
  trainerName: string;
  playerId: string;
  playerName: string;
  detectionType: 'sight' | 'collision';
  distance: number;
  trainerPosition: { x: number; y: number };
  playerPosition: { x: number; y: number };
  zone: string;
  timestamp: number;
}

interface TrainerBattleRequest {
  trainerId: string;
  trainerName: string;
  trainerClass: string;
  teamId: string;
  battleDialogue: string[];
  canRefuse: boolean;
  timeout: number;
}

interface NpcTrainerData {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  // Propriétés étendues depuis vos modèles
  visionConfig?: {
    sightRange: number;
    sightAngle: number;
    chaseRange: number;
    returnToPosition?: boolean;
    blockMovement?: boolean;
    canSeeHiddenPlayers?: boolean;
    detectionCooldown?: number;
    pursuitSpeed?: number;
    alertSound?: string;
    pursuitSound?: string;
    lostTargetSound?: string;
  };
  battleConfig?: {
    teamId?: string;
    canBattle?: boolean;
    battleType?: 'single' | 'double' | 'multi';
    allowItems?: boolean;
    allowSwitching?: boolean;
    customRules?: string[];
  };
  trainerRuntime?: {
    currentState: 'idle' | 'alerted' | 'chasing' | 'battling' | 'defeated' | 'returning';
    lastDetectionTime?: number;
    targetPlayerId?: string;
    originalPosition: { x: number; y: number };
    lastBattleTime?: number;
    defeatedBy?: string[];
  };
}

// ===== HANDLER PRINCIPAL =====

export class TrainerVisionHandlers {
  private room: WorldRoom;
  private visionService: PokemonTrainerVisionService;
  
  // Cache des états de trainers pour optimisation
  private activeDetections: Map<string, TrainerDetectionEvent> = new Map();
  private trainerBattleRequests: Map<string, TrainerBattleRequest> = new Map();
  
  // Configuration
  private config = {
    maxSimultaneousBattles: 3,
    detectionCooldown: 5000, // 5s entre détections
    battleRequestTimeout: 15000, // 15s pour répondre
    stateUpdateInterval: 1000, // 1s pour les updates
    enableBatching: true,
    maxDetectionDistance: 200 // pixels
  };

  constructor(room: WorldRoom) {
    this.room = room;
    this.visionService = new PokemonTrainerVisionService(room);
    
    console.log('🎯 TrainerVisionHandlers initialisé');
  }

  // ===== INITIALISATION =====

  async setup(): Promise<void> {
    try {
      console.log('🔄 [TrainerVision] Setup...');
      
      // Charger les trainers depuis la base de données
      await this.loadZoneTrainers();
      
      // Démarrer les mises à jour périodiques
      this.startPeriodicUpdates();
      
      console.log('✅ [TrainerVision] Setup terminé avec succès');
      
    } catch (error) {
      console.error('❌ [TrainerVision] Erreur setup:', error);
      throw error;
    }
  }

  private async loadZoneTrainers(): Promise<void> {
    try {
      // Récupérer toutes les zones actives avec des joueurs
      const activeZones = new Set<string>();
      this.room.state.players.forEach(player => {
        activeZones.add(player.currentZone);
      });

      console.log(`📍 [TrainerVision] Chargement trainers pour ${activeZones.size} zones actives`);

      for (const zone of activeZones) {
        const npcManager = this.room.getNpcManager(zone);
        if (!npcManager) continue;

        const npcs = npcManager.getNpcsByZone(zone);
        const trainers = npcs.filter(npc => 
          npc.type === 'trainer' && (npc as any).visionConfig
        );

        console.log(`🎯 [TrainerVision] Zone ${zone}: ${trainers.length} trainers détectés`);

        // Enregistrer chaque trainer dans le service
        for (const trainer of trainers) {
          await this.registerTrainerInService(trainer as any, zone);
        }
      }

    } catch (error) {
      console.error('❌ [TrainerVision] Erreur chargement trainers:', error);
    }
  }

  private async registerTrainerInService(trainer: NpcTrainerData, zone: string): Promise<void> {
    try {
      // Utiliser les méthodes disponibles du PokemonTrainerVisionService
      const trainerId = trainer.id.toString();
      
      // Créer le trainer dans le service avec les données disponibles
      const trainerConfig = {
        id: trainerId,
        name: trainer.name,
        position: { x: trainer.x, y: trainer.y },
        zone: zone,
        visionRange: trainer.visionConfig?.sightRange || 128,
        visionAngle: trainer.visionConfig?.sightAngle || 90,
        teamId: trainer.battleConfig?.teamId || `team_${trainerId}`,
        isActive: true
      };

      // Utiliser addTrainer du service
      await this.visionService.addTrainer(trainerConfig);
      
      console.log(`✅ [TrainerVision] Trainer ${trainerId} enregistré`);

    } catch (error) {
      console.error(`❌ [TrainerVision] Erreur enregistrement trainer ${trainer.id}:`, error);
    }
  }

  // ===== SETUP DES HANDLERS =====

  setupHandlers(): void {
    console.log('🔧 [TrainerVision] Configuration des handlers...');

    // === HANDLERS DE MOUVEMENT ===
    
    // Détection automatique lors du mouvement
    this.room.onMessage("playerMove", (client, data) => {
      this.handlePlayerMovement(client, data);
    });

    // === HANDLERS DE COMBAT TRAINER ===
    
    // Réponse à une demande de combat trainer
    this.room.onMessage("trainerBattleResponse", (client, data: {
      trainerId: string;
      accept: boolean;
    }) => {
      this.handleTrainerBattleResponse(client, data);
    });

    // Échapper à la poursuite d'un trainer
    this.room.onMessage("escapeTrainer", (client, data: {
      trainerId: string;
    }) => {
      this.handleEscapeAttempt(client, data);
    });

    // === HANDLERS D'ADMINISTRATION ===
    
    // Debug d'un trainer spécifique
    this.room.onMessage("debugTrainer", (client, data: {
      trainerId: string;
    }) => {
      this.handleDebugTrainer(client, data);
    });

    // Reset d'un trainer
    this.room.onMessage("resetTrainer", (client, data: {
      trainerId: string;
    }) => {
      this.handleResetTrainer(client, data);
    });

    // Stats du système de vision
    this.room.onMessage("getTrainerVisionStats", (client) => {
      this.handleGetVisionStats(client);
    });

    console.log('✅ [TrainerVision] Handlers configurés');
  }

  // ===== HANDLERS DE MOUVEMENT ===

  private async handlePlayerMovement(client: Client, data: {
    x: number;
    y: number;
    currentZone: string;
    direction?: string;
  }): Promise<void> {
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    try {
      // Mettre à jour la position du joueur dans le service
      await this.visionService.updatePlayerPosition(client.sessionId, {
        x: data.x,
        y: data.y,
        zone: data.currentZone
      });

      // Vérifier les détections manuellement
      await this.checkTrainerDetections(client, data);

    } catch (error) {
      console.error('❌ [TrainerVision] Erreur mouvement joueur:', error);
    }
  }

  private async checkTrainerDetections(client: Client, data: {
    x: number;
    y: number;
    currentZone: string;
  }): Promise<void> {
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    // Récupérer les trainers de la zone
    const npcManager = this.room.getNpcManager(data.currentZone);
    if (!npcManager) return;

    const npcs = npcManager.getNpcsByZone(data.currentZone);
    const trainers = npcs.filter(npc => 
      npc.type === 'trainer' && (npc as any).visionConfig
    ) as NpcTrainerData[];

    // Vérifier chaque trainer
    for (const trainer of trainers) {
      const detectionKey = `${trainer.id}_${client.sessionId}`;
      
      // Éviter les détections multiples trop rapides
      if (this.activeDetections.has(detectionKey)) {
        const lastDetection = this.activeDetections.get(detectionKey)!;
        if (Date.now() - lastDetection.timestamp < this.config.detectionCooldown) {
          continue;
        }
      }

      // Vérifier si le trainer peut voir le joueur
      if (this.canTrainerSeePlayer(trainer, data)) {
        await this.processTrainerDetection(client, trainer, data);
      }
    }
  }

  private canTrainerSeePlayer(trainer: NpcTrainerData, playerData: {
    x: number;
    y: number;
    currentZone: string;
  }): boolean {
    
    if (!trainer.visionConfig || !trainer.trainerRuntime) {
      return false;
    }

    // Vérifier si le trainer est dans un état où il peut détecter
    const state = trainer.trainerRuntime.currentState;
    if (state === 'battling' || state === 'defeated') {
      return false;
    }

    // Calculer la distance
    const dx = playerData.x - trainer.x;
    const dy = playerData.y - trainer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Vérifier la portée de vision
    if (distance > trainer.visionConfig.sightRange) {
      return false;
    }

    // Vérifier l'angle de vision (simplifiée)
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const trainerDirection = this.getTrainerDirection(trainer);
    const angleToPlayer = Math.abs(angle - trainerDirection);
    
    return angleToPlayer <= trainer.visionConfig.sightAngle / 2;
  }

  private getTrainerDirection(trainer: NpcTrainerData): number {
    // Conversion direction → angle (approximative)
    // TODO: Utiliser la vraie direction du trainer depuis ses données
    return 0; // Face à l'est par défaut
  }

  private async processTrainerDetection(
    client: Client, 
    trainer: NpcTrainerData,
    playerData: { x: number; y: number; currentZone: string }
  ): Promise<void> {
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    const detectionKey = `${trainer.id}_${client.sessionId}`;
    
    console.log(`🎯 [TrainerVision] Détection: trainer ${trainer.id} → joueur ${player.name}`);

    // Créer l'événement de détection
    const detectionEvent: TrainerDetectionEvent = {
      trainerId: trainer.id.toString(),
      trainerName: trainer.name,
      playerId: client.sessionId,
      playerName: player.name,
      detectionType: 'sight',
      distance: Math.sqrt(
        Math.pow(playerData.x - trainer.x, 2) + 
        Math.pow(playerData.y - trainer.y, 2)
      ),
      trainerPosition: { x: trainer.x, y: trainer.y },
      playerPosition: { x: playerData.x, y: playerData.y },
      zone: playerData.currentZone,
      timestamp: Date.now()
    };

    this.activeDetections.set(detectionKey, detectionEvent);

    // Notifier le système d'IA
    await this.notifyAISystem(detectionEvent);

    // Bloquer le mouvement du joueur
    this.room.blockPlayerMovement(
      client.sessionId, 
      'battle' as BlockReason, // Utiliser un BlockReason valide
      this.config.battleRequestTimeout,
      { trainerId: trainer.id.toString() }
    );

    // Déclencher la séquence de combat
    await this.initiateTrainerBattle(client, trainer);
  }

  // ===== HANDLERS DE COMBAT ===

  private async initiateTrainerBattle(
    client: Client,
    trainer: NpcTrainerData
  ): Promise<void> {
    
    try {
      console.log(`⚔️ [TrainerVision] Initiation combat trainer ${trainer.id}`);

      // Construire la demande de combat
      const battleRequest: TrainerBattleRequest = {
        trainerId: trainer.id.toString(),
        trainerName: trainer.name,
        trainerClass: 'Dresseur', // TODO: Récupérer depuis les données
        teamId: trainer.battleConfig?.teamId || `team_${trainer.id}`,
        battleDialogue: [
          `${trainer.name}: Hé ! Tu as croisé mon regard !`,
          "Tu ne peux pas échapper à un combat de Dresseurs !"
        ],
        canRefuse: false, // Les trainers automatiques ne peuvent être refusés
        timeout: this.config.battleRequestTimeout
      };

      // Stocker la demande
      this.trainerBattleRequests.set(
        `${trainer.id}_${client.sessionId}`, 
        battleRequest
      );

      // Envoyer la demande au client
      client.send("trainerBattleRequest", battleRequest);

      // Programmer le timeout
      this.room.clock.setTimeout(() => {
        this.handleBattleTimeout(client, trainer.id.toString());
      }, this.config.battleRequestTimeout);

      console.log(`✅ [TrainerVision] Demande de combat envoyée à ${client.sessionId}`);

    } catch (error) {
      console.error('❌ [TrainerVision] Erreur initiation combat:', error);
      this.room.unblockPlayerMovement(client.sessionId, 'battle' as BlockReason);
    }
  }

  private async handleTrainerBattleResponse(
    client: Client,
    data: { trainerId: string; accept: boolean }
  ): Promise<void> {
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`⚔️ [TrainerVision] Réponse combat: trainer ${data.trainerId}, accept: ${data.accept}`);

    try {
      if (data.accept || !data.accept) { // Force l'acceptation pour les trainers auto
        await this.startTrainerBattle(client, data.trainerId);
      }

    } catch (error) {
      console.error('❌ [TrainerVision] Erreur réponse combat:', error);
      this.room.unblockPlayerMovement(client.sessionId, 'battle' as BlockReason);
    }
  }

  private async startTrainerBattle(
    client: Client,
    trainerId: string
  ): Promise<void> {
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    try {
      console.log(`🚀 [TrainerVision] Démarrage combat: ${player.name} vs trainer ${trainerId}`);

      // Récupérer la demande de combat
      const requestKey = `${trainerId}_${client.sessionId}`;
      const battleRequest = this.trainerBattleRequests.get(requestKey);
      
      if (!battleRequest) {
        throw new Error(`Demande de combat ${requestKey} introuvable`);
      }

      // Mettre à jour l'état du trainer dans le service
      await this.visionService.setTrainerState(trainerId, 'battling');

      // Utiliser le BattleSystem existant de la room
      const battleHandlers = this.room.getBattleHandlers();
      
      // Préparer les données de combat - adapter à votre API BattleHandlers
      const battleData = {
        type: 'trainer',
        trainerId: trainerId,
        trainerName: battleRequest.trainerName,
        teamId: battleRequest.teamId,
        canRun: false // Impossible de fuir un combat trainer automatique
      };

      // Démarrer le combat via votre système existant
      // Note: Vous devrez peut-être adapter cette partie selon votre API BattleHandlers
      await battleHandlers.handleBattleRequest(client, battleData);

      // Tracking IA si disponible
      if ((this.room as any).trackPlayerAction) {
        (this.room as any).trackPlayerAction(
          player.name,
          ActionType.BATTLE_START,
          {
            battleType: 'trainer_auto',
            trainerId: trainerId,
            trainerName: battleRequest.trainerName,
            detectionType: 'automatic'
          },
          {
            location: {
              map: player.currentZone,
              x: player.x,
              y: player.y
            }
          }
        );
      }

      // Nettoyer la demande
      this.trainerBattleRequests.delete(requestKey);

      console.log(`✅ [TrainerVision] Combat démarré avec succès`);

    } catch (error) {
      console.error('❌ [TrainerVision] Erreur démarrage combat:', error);
      
      // Débloquer le joueur en cas d'erreur
      this.room.unblockPlayerMovement(client.sessionId, 'battle' as BlockReason);
      
      // Notifier l'erreur au client
      client.send("trainerBattleError", {
        trainerId: trainerId,
        message: "Impossible de démarrer le combat",
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  // ===== HANDLERS D'ÉVÉNEMENTS ===

  private async handleBattleTimeout(
    client: Client,
    trainerId: string
  ): Promise<void> {
    
    console.log(`⏰ [TrainerVision] Timeout combat trainer ${trainerId}`);
    
    // Forcer l'acceptation (combat automatique)
    await this.startTrainerBattle(client, trainerId);
  }

  private async handleEscapeAttempt(
    client: Client,
    data: { trainerId: string }
  ): Promise<void> {
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`🏃 [TrainerVision] Tentative d'échappement: ${player.name} vs trainer ${data.trainerId}`);

    // Dans les vrais jeux Pokémon, on ne peut pas échapper à un trainer automatique
    client.send("escapeTrainerResult", {
      trainerId: data.trainerId,
      success: false,
      message: "Tu ne peux pas échapper à un combat de Dresseurs !"
    });
  }

  // ===== MÉTHODES DE NOTIFICATION ===

  private async notifyAISystem(detection: TrainerDetectionEvent): Promise<void> {
    try {
      // Notifier le système d'IA si disponible
      if ((this.room as any).trackPlayerAction) {
        (this.room as any).trackPlayerAction(
          detection.playerName,
          ActionType.NPC_TALK, // On utilise NPC_TALK pour les interactions trainer
          {
            npcId: parseInt(detection.trainerId),
            interactionType: 'trainer_detection',
            detectionType: detection.detectionType,
            distance: detection.distance,
            automatic: true
          },
          {
            location: {
              map: detection.zone,
              x: detection.playerPosition.x,
              y: detection.playerPosition.y
            }
          }
        );
      }

    } catch (error) {
      console.error('❌ [TrainerVision] Erreur notification IA:', error);
    }
  }

  // ===== CALLBACKS POUR LE BATTLESYSTEM ===

  /**
   * Appelé quand un combat trainer se termine
   */
  async onTrainerBattleEnd(
    playerId: string,
    trainerId: string,
    result: 'victory' | 'defeat' | 'draw'
  ): Promise<void> {
    
    console.log(`🏁 [TrainerVision] Fin combat: joueur ${playerId} vs trainer ${trainerId} → ${result}`);

    try {
      // Mettre à jour l'état du trainer
      if (result === 'victory') {
        await this.visionService.setTrainerState(trainerId, 'defeated');
      } else {
        await this.visionService.setTrainerState(trainerId, 'idle');
      }

      // Débloquer le joueur
      this.room.unblockPlayerMovement(playerId, 'battle' as BlockReason);

      // Nettoyer les détections actives
      const keysToDelete: string[] = [];
      for (const [key, detection] of this.activeDetections) {
        if (detection.trainerId === trainerId && detection.playerId === playerId) {
          keysToDelete.push(key);
        }
      }
      
      for (const key of keysToDelete) {
        this.activeDetections.delete(key);
      }

      // Nettoyer les demandes de combat
      const requestKey = `${trainerId}_${playerId}`;
      this.trainerBattleRequests.delete(requestKey);

      console.log(`✅ [TrainerVision] Nettoyage post-combat terminé`);

    } catch (error) {
      console.error('❌ [TrainerVision] Erreur fin combat:', error);
    }
  }

  // ===== HANDLERS D'ADMINISTRATION ===

  private handleDebugTrainer(client: Client, data: { trainerId: string }): void {
    console.log(`🔍 [TrainerVision] Debug trainer ${data.trainerId}`);
    
    // Récupérer les infos de debug disponibles
    const debugInfo = {
      trainerId: data.trainerId,
      visionServiceStats: this.visionService.getStats(),
      activeDetections: Array.from(this.activeDetections.entries())
        .filter(([key]) => key.startsWith(data.trainerId))
        .map(([key, detection]) => ({ key, detection })),
      battleRequests: Array.from(this.trainerBattleRequests.entries())
        .filter(([key]) => key.startsWith(data.trainerId))
        .map(([key, request]) => ({ key, request }))
    };

    client.send("trainerDebugInfo", {
      trainerId: data.trainerId,
      debugInfo
    });
  }

  private async handleResetTrainer(client: Client, data: { trainerId: string }): Promise<void> {
    console.log(`🔄 [TrainerVision] Reset trainer ${data.trainerId}`);
    
    try {
      // Reset via le service
      await this.visionService.setTrainerState(data.trainerId, 'idle');
      
      // Nettoyer les caches locaux
      const keysToDelete: string[] = [];
      for (const key of this.activeDetections.keys()) {
        if (key.startsWith(data.trainerId)) {
          keysToDelete.push(key);
        }
      }
      
      for (const key of keysToDelete) {
        this.activeDetections.delete(key);
      }

      for (const key of this.trainerBattleRequests.keys()) {
        if (key.startsWith(data.trainerId)) {
          this.trainerBattleRequests.delete(key);
        }
      }
      
      client.send("trainerResetResult", {
        trainerId: data.trainerId,
        success: true,
        message: "Trainer réinitialisé avec succès"
      });
      
    } catch (error) {
      client.send("trainerResetResult", {
        trainerId: data.trainerId,
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  private handleGetVisionStats(client: Client): void {
    const stats = this.getStats();
    client.send("trainerVisionStats", stats);
  }

  // ===== MISES À JOUR PÉRIODIQUES ===

  private startPeriodicUpdates(): void {
    // Nettoyage des détections expirées toutes les 30s
    this.room.clock.setInterval(() => {
      this.cleanupExpiredDetections();
    }, 30000);

    // Mise à jour des états de trainers toutes les secondes
    this.room.clock.setInterval(() => {
      this.broadcastTrainerStates();
    }, this.config.stateUpdateInterval);

    console.log('⏰ [TrainerVision] Mises à jour périodiques démarrées');
  }

  private broadcastTrainerStates(): void {
    try {
      if (this.config.enableBatching && this.activeDetections.size > 0) {
        // Envoyer les états actifs des trainers
        const activeStates = Array.from(this.activeDetections.values()).map(detection => ({
          trainerId: detection.trainerId,
          state: 'alerted', // État basé sur la détection
          targetPlayerId: detection.playerId,
          timestamp: detection.timestamp
        }));

        if (activeStates.length > 0) {
          this.room.broadcast("trainerStatesUpdate", {
            updates: activeStates,
            timestamp: Date.now()
          });
        }
      }

    } catch (error) {
      // Log silencieux pour éviter le spam
      if (Math.random() < 0.01) {
        console.error('❌ [TrainerVision] Erreur broadcast états:', error);
      }
    }
  }

  private cleanupExpiredDetections(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, detection] of this.activeDetections) {
      if (now - detection.timestamp > this.config.detectionCooldown * 2) {
        this.activeDetections.delete(key);
        cleanedCount++;
      }
    }

    // Nettoyer aussi les demandes de combat expirées
    for (const [key, request] of this.trainerBattleRequests) {
      if (now - Date.now() > request.timeout * 2) { // Approximation
        this.trainerBattleRequests.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 [TrainerVision] ${cleanedCount} éléments expirés nettoyés`);
    }
  }

  // ===== MÉTHODES PUBLIQUES ===

  async onPlayerJoinZone(playerId: string, zoneName: string): Promise<void> {
    console.log(`📍 [TrainerVision] Joueur ${playerId} rejoint zone ${zoneName}`);
    
    // Mettre à jour la position dans le service
    const player = this.room.state.players.get(playerId);
    if (player) {
      await this.visionService.updatePlayerPosition(playerId, {
        x: player.x,
        y: player.y,
        zone: zoneName
      });
    }
    
    // Charger les trainers de la nouvelle zone si nécessaire
    await this.loadZoneTrainers();
  }

  async onPlayerLeaveZone(playerId: string, zoneName: string): Promise<void> {
    console.log(`📤 [TrainerVision] Joueur ${playerId} quitte zone ${zoneName}`);
    
    // Nettoyer les détections actives
    const keysToDelete: string[] = [];
    for (const [key, detection] of this.activeDetections) {
      if (detection.playerId === playerId) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.activeDetections.delete(key);
    }

    // Nettoyer les demandes de combat
    for (const [key, request] of this.trainerBattleRequests) {
      if (key.includes(playerId)) {
        this.trainerBattleRequests.delete(key);
      }
    }
  }

  getStats(): any {
    return {
      service: this.visionService.getStats(),
      handlers: {
        activeDetections: this.activeDetections.size,
        battleRequests: this.trainerBattleRequests.size,
        config: this.config
      },
      performance: {
        maxSimultaneousBattles: this.config.maxSimultaneousBattles,
        detectionCooldown: this.config.detectionCooldown,
        batchingEnabled: this.config.enableBatching
      }
    };
  }

  // ===== NETTOYAGE =====

  cleanup(): void {
    console.log('🧹 [TrainerVision] Nettoyage...');
    
    this.activeDetections.clear();
    this.trainerBattleRequests.clear();
    
    // Le service se nettoie automatiquement avec la room
    
    console.log('✅ [TrainerVision] Nettoyé');
  }
}
