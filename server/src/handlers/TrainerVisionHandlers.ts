// server/src/handlers/TrainerVisionHandlers.ts
import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { Player } from "../schema/PokeWorldState";
import { PokemonTrainerVisionService } from "../services/PokemonTrainerVisionService";
import { ActionType } from "../Intelligence/Core/ActionTypes";

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

interface TrainerStateUpdate {
  trainerId: string;
  state: 'idle' | 'alerted' | 'chasing' | 'battling' | 'defeated' | 'returning';
  position?: { x: number; y: number };
  targetPlayerId?: string;
  metadata?: any;
}

// ===== HANDLER PRINCIPAL =====

export class TrainerVisionHandlers {
  private room: WorldRoom;
  private visionService: PokemonTrainerVisionService;
  
  // Cache des états de trainers pour optimisation
  private trainerStateCache: Map<string, TrainerStateUpdate> = new Map();
  private activeDetections: Map<string, TrainerDetectionEvent> = new Map();
  
  // Configuration
  private config = {
    maxSimultaneousBattles: 3,
    detectionCooldown: 5000, // 5s entre détections
    battleRequestTimeout: 15000, // 15s pour répondre
    stateUpdateInterval: 100, // 100ms pour les updates
    enableBatching: true
  };

  constructor(room: WorldRoom) {
    this.room = room;
    this.visionService = new PokemonTrainerVisionService();
    
    console.log('🎯 TrainerVisionHandlers initialisé');
  }

  // ===== INITIALISATION =====

  async initialize(): Promise<void> {
    try {
      console.log('🔄 [TrainerVision] Initialisation...');
      
      // Initialiser le service de vision
      await this.visionService.initialize();
      
      // Charger les trainers depuis la base de données
      await this.loadZoneTrainers();
      
      // Démarrer les mises à jour périodiques
      this.startPeriodicUpdates();
      
      console.log('✅ [TrainerVision] Initialisé avec succès');
      
    } catch (error) {
      console.error('❌ [TrainerVision] Erreur initialisation:', error);
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
          npc.type === 'trainer' && npc.visionConfig
        );

        console.log(`🎯 [TrainerVision] Zone ${zone}: ${trainers.length} trainers détectés`);

        // Enregistrer chaque trainer dans le service
        for (const trainer of trainers) {
          await this.visionService.registerTrainer({
            trainerId: trainer.id.toString(),
            name: trainer.name,
            position: { x: trainer.x, y: trainer.y },
            zone: zone,
            visionConfig: trainer.visionConfig!,
            battleConfig: trainer.battleConfig,
            isActive: true
          });
        }
      }

    } catch (error) {
      console.error('❌ [TrainerVision] Erreur chargement trainers:', error);
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
      await this.visionService.updatePlayerPosition(
        client.sessionId,
        { x: data.x, y: data.y },
        data.currentZone
      );

      // Vérifier les détections
      const detections = await this.visionService.checkDetections(
        client.sessionId,
        data.currentZone
      );

      // Traiter chaque détection
      for (const detection of detections) {
        await this.processTrainerDetection(client, detection);
      }

    } catch (error) {
      console.error('❌ [TrainerVision] Erreur mouvement joueur:', error);
    }
  }

  private async processTrainerDetection(
    client: Client, 
    detection: any
  ): Promise<void> {
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    const detectionKey = `${detection.trainerId}_${client.sessionId}`;
    
    // Éviter les détections multiples trop rapides
    if (this.activeDetections.has(detectionKey)) {
      const lastDetection = this.activeDetections.get(detectionKey)!;
      if (Date.now() - lastDetection.timestamp < this.config.detectionCooldown) {
        return;
      }
    }

    console.log(`🎯 [TrainerVision] Détection: trainer ${detection.trainerId} → joueur ${player.name}`);

    // Créer l'événement de détection
    const detectionEvent: TrainerDetectionEvent = {
      trainerId: detection.trainerId,
      trainerName: detection.trainerName,
      playerId: client.sessionId,
      playerName: player.name,
      detectionType: detection.type,
      distance: detection.distance,
      trainerPosition: detection.trainerPosition,
      playerPosition: detection.playerPosition,
      zone: detection.zone,
      timestamp: Date.now()
    };

    this.activeDetections.set(detectionKey, detectionEvent);

    // Notifier le système d'IA
    await this.notifyAISystem(detectionEvent);

    // Bloquer le mouvement du joueur
    this.room.blockPlayerMovement(
      client.sessionId, 
      'trainer_encounter', 
      this.config.battleRequestTimeout,
      { trainerId: detection.trainerId }
    );

    // Déclencher la séquence de combat
    await this.initiateTrainerBattle(client, detection);
  }

  // ===== HANDLERS DE COMBAT ===

  private async initiateTrainerBattle(
    client: Client,
    detection: any
  ): Promise<void> {
    
    try {
      console.log(`⚔️ [TrainerVision] Initiation combat trainer ${detection.trainerId}`);

      // Récupérer les données du trainer
      const trainerData = await this.visionService.getTrainerData(detection.trainerId);
      if (!trainerData) {
        console.error(`❌ [TrainerVision] Données trainer ${detection.trainerId} introuvables`);
        this.room.unblockPlayerMovement(client.sessionId, 'trainer_encounter');
        return;
      }

      // Construire la demande de combat
      const battleRequest: TrainerBattleRequest = {
        trainerId: detection.trainerId,
        trainerName: trainerData.name,
        trainerClass: trainerData.trainerClass || 'Dresseur',
        teamId: trainerData.teamId || `team_${detection.trainerId}`,
        battleDialogue: trainerData.battleDialogue || [
          `${trainerData.name}: Hé ! Tu as croisé mon regard !`,
          "Tu ne peux pas échapper à un combat de Dresseurs !"
        ],
        canRefuse: false, // Les trainers automatiques ne peuvent être refusés
        timeout: this.config.battleRequestTimeout
      };

      // Envoyer la demande au client
      client.send("trainerBattleRequest", battleRequest);

      // Programmer le timeout
      this.room.clock.setTimeout(() => {
        this.handleBattleTimeout(client, detection.trainerId);
      }, this.config.battleRequestTimeout);

      console.log(`✅ [TrainerVision] Demande de combat envoyée à ${client.sessionId}`);

    } catch (error) {
      console.error('❌ [TrainerVision] Erreur initiation combat:', error);
      this.room.unblockPlayerMovement(client.sessionId, 'trainer_encounter');
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
      if (data.accept) {
        // Lancer le combat via le BattleSystem existant
        await this.startTrainerBattle(client, data.trainerId);
        
      } else {
        // Note: Normalement les trainers automatiques ne peuvent être refusés
        console.warn(`⚠️ [TrainerVision] Refus de combat trainer ${data.trainerId} (inhabituel)`);
        await this.handleBattleRefusal(client, data.trainerId);
      }

    } catch (error) {
      console.error('❌ [TrainerVision] Erreur réponse combat:', error);
      this.room.unblockPlayerMovement(client.sessionId, 'trainer_encounter');
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

      // Récupérer les données du trainer
      const trainerData = await this.visionService.getTrainerData(trainerId);
      if (!trainerData) {
        throw new Error(`Données trainer ${trainerId} introuvables`);
      }

      // Marquer le trainer comme en combat
      await this.visionService.updateTrainerState(trainerId, 'battling', {
        targetPlayerId: client.sessionId,
        battleStartTime: Date.now()
      });

      // Utiliser le BattleSystem existant de la room
      const battleHandlers = this.room.getBattleHandlers();
      await battleHandlers.startTrainerBattle(client, {
        trainerId: trainerId,
        trainerName: trainerData.name,
        teamId: trainerData.teamId || `team_${trainerId}`,
        battleType: 'trainer_auto',
        canRun: false // Impossible de fuir un combat trainer automatique
      });

      // Tracking IA
      this.room.trackPlayerAction(
        player.name,
        ActionType.BATTLE_START,
        {
          battleType: 'trainer_auto',
          trainerId: trainerId,
          trainerName: trainerData.name,
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

      console.log(`✅ [TrainerVision] Combat démarré avec succès`);

    } catch (error) {
      console.error('❌ [TrainerVision] Erreur démarrage combat:', error);
      
      // Débloquer le joueur en cas d'erreur
      this.room.unblockPlayerMovement(client.sessionId, 'trainer_encounter');
      
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

  private async handleBattleRefusal(
    client: Client,
    trainerId: string
  ): Promise<void> {
    
    console.log(`🚫 [TrainerVision] Refus combat trainer ${trainerId}`);
    
    // Débloquer le joueur
    this.room.unblockPlayerMovement(client.sessionId, 'trainer_encounter');
    
    // Marquer le trainer comme retournant à sa position
    await this.visionService.updateTrainerState(trainerId, 'returning');
    
    // Nettoyer la détection
    const detectionKey = `${trainerId}_${client.sessionId}`;
    this.activeDetections.delete(detectionKey);
  }

  private async handleEscapeAttempt(
    client: Client,
    data: { trainerId: string }
  ): Promise<void> {
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`🏃 [TrainerVision] Tentative d'échappement: ${player.name} vs trainer ${data.trainerId}`);

    // Dans les vrais jeux Pokémon, on ne peut pas échapper à un trainer automatique
    // Mais on peut implémenter une logique spéciale si nécessaire
    
    client.send("escapeTrainerResult", {
      trainerId: data.trainerId,
      success: false,
      message: "Tu ne peux pas échapper à un combat de Dresseurs !"
    });
  }

  // ===== MÉTHODES DE NOTIFICATION ===

  private async notifyAISystem(detection: TrainerDetectionEvent): Promise<void> {
    try {
      // Notifier le système d'IA de la détection
      this.room.trackPlayerAction(
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
        await this.visionService.updateTrainerState(trainerId, 'defeated', {
          defeatedBy: playerId,
          defeatTime: Date.now()
        });
      } else {
        await this.visionService.updateTrainerState(trainerId, 'returning');
      }

      // Débloquer le joueur
      this.room.unblockPlayerMovement(playerId, 'trainer_encounter');

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

      console.log(`✅ [TrainerVision] Nettoyage post-combat terminé`);

    } catch (error) {
      console.error('❌ [TrainerVision] Erreur fin combat:', error);
    }
  }

  // ===== HANDLERS D'ADMINISTRATION ===

  private handleDebugTrainer(client: Client, data: { trainerId: string }): void {
    console.log(`🔍 [TrainerVision] Debug trainer ${data.trainerId}`);
    
    this.visionService.debugTrainer(data.trainerId).then(debugInfo => {
      client.send("trainerDebugInfo", {
        trainerId: data.trainerId,
        debugInfo
      });
    }).catch(error => {
      client.send("trainerDebugError", {
        trainerId: data.trainerId,
        error: error.message
      });
    });
  }

  private async handleResetTrainer(client: Client, data: { trainerId: string }): Promise<void> {
    console.log(`🔄 [TrainerVision] Reset trainer ${data.trainerId}`);
    
    try {
      await this.visionService.resetTrainer(data.trainerId);
      
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
    // Mise à jour des états de trainers toutes les 100ms
    this.room.clock.setInterval(() => {
      this.updateTrainerStates();
    }, this.config.stateUpdateInterval);

    // Nettoyage des détections expirées toutes les 30s
    this.room.clock.setInterval(() => {
      this.cleanupExpiredDetections();
    }, 30000);

    console.log('⏰ [TrainerVision] Mises à jour périodiques démarrées');
  }

  private async updateTrainerStates(): Promise<void> {
    try {
      // Mettre à jour les positions et états des trainers
      const updates = await this.visionService.getTrainerUpdates();
      
      if (updates.length > 0 && this.config.enableBatching) {
        // Envoyer les mises à jour par batch pour optimiser
        this.room.broadcast("trainerStatesUpdate", {
          updates: updates,
          timestamp: Date.now()
        });
      }

    } catch (error) {
      // Log silencieux pour éviter le spam
      if (Math.random() < 0.01) {
        console.error('❌ [TrainerVision] Erreur mise à jour états:', error);
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

    if (cleanedCount > 0) {
      console.log(`🧹 [TrainerVision] ${cleanedCount} détections expirées nettoyées`);
    }
  }

  // ===== MÉTHODES PUBLIQUES ===

  async onPlayerJoinZone(playerId: string, zoneName: string): Promise<void> {
    console.log(`📍 [TrainerVision] Joueur ${playerId} rejoint zone ${zoneName}`);
    
    // Enregistrer le joueur dans le service de vision
    await this.visionService.registerPlayer(playerId, zoneName);
    
    // Charger les trainers de la nouvelle zone si nécessaire
    await this.loadZoneTrainers();
  }

  async onPlayerLeaveZone(playerId: string, zoneName: string): Promise<void> {
    console.log(`📤 [TrainerVision] Joueur ${playerId} quitte zone ${zoneName}`);
    
    // Désinscrire le joueur du service de vision
    await this.visionService.unregisterPlayer(playerId);
    
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
  }

  getStats(): any {
    return {
      service: this.visionService.getStats(),
      handlers: {
        activeDetections: this.activeDetections.size,
        cacheSize: this.trainerStateCache.size,
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
    this.trainerStateCache.clear();
    
    if (this.visionService) {
      this.visionService.cleanup();
    }
    
    console.log('✅ [TrainerVision] Nettoyé');
  }
}
