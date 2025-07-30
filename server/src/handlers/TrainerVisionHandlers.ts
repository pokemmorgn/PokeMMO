// server/src/handlers/TrainerVisionHandlers.ts

/**
 * 🎯 TRAINER VISION HANDLERS - SYSTÈME DE VISION TRAINERS POKÉMON
 * 
 * Intègre le PokemonTrainerVisionService dans WorldRoom :
 * - Détection automatique des joueurs par les trainers
 * - Gestion des événements de combat
 * - États de trainers persistants
 * - Messages client/serveur optimisés
 * - Performance MMO (cache, batching)
 */

import { Client } from "@colyseus/core";
import { Player } from "../schema/PokeWorldState";
import { WorldRoom } from "../rooms/WorldRoom";
import { NpcData } from "../models/NpcData";
import { PokemonTrainerVisionService } from "../services/PokemonTrainerVisionService";
import { BattleHandlers } from "./BattleHandlers";
import { ActionType } from "../Intelligence/Core/ActionTypes";
import { movementBlockManager } from "../managers/MovementBlockManager";

// ===================================================================
// 🎯 INTERFACES POUR TRAINER VISION
// ===================================================================

interface TrainerDetectionEvent {
  trainerId: string;
  trainerNpcId: number;
  playerId: string;
  playerName: string;
  detectionType: 'sight' | 'approach' | 'manual';
  trainerPosition: { x: number; y: number };
  playerPosition: { x: number; y: number };
  distance: number;
  zone: string;
  timestamp: number;
}

interface TrainerStateUpdate {
  trainerId: string;
  npcId: number;
  oldState: string;
  newState: string;
  metadata?: any;
  timestamp: number;
}

interface TrainerBattleRequest {
  trainerId: string;
  npcId: number;
  playerId: string;
  playerName: string;
  battleConfig: {
    battleType: 'single' | 'double';
    teamId: string;
    allowItems: boolean;
    allowSwitching: boolean;
  };
  preDialogue: string[];
  zone: string;
}

interface TrainerVisionStats {
  activeTrainers: number;
  detectionsThisMinute: number;
  battlesInProgress: number;
  averageDetectionTime: number;
  cacheHitRate: number;
}

// ===================================================================
// 🔥 CLASSE PRINCIPALE - TRAINER VISION HANDLERS
// ===================================================================

export class TrainerVisionHandlers {
  private room: WorldRoom;
  private visionService: PokemonTrainerVisionService;
  private battleHandlers: BattleHandlers;
  
  // Cache et performance
  private trainerCache: Map<string, { npc: NpcData; lastUpdate: number }> = new Map();
  private detectionCooldowns: Map<string, number> = new Map(); // trainerId -> lastDetection
  private battleCooldowns: Map<string, number> = new Map(); // trainerId -> lastBattle
  
  // Statistiques temps réel
  private stats: TrainerVisionStats = {
    activeTrainers: 0,
    detectionsThisMinute: 0,
    battlesInProgress: 0,
    averageDetectionTime: 0,
    cacheHitRate: 0
  };
  
  // Timers et maintenance
  private visionUpdateTimer: NodeJS.Timeout | null = null;
  private statsResetTimer: NodeJS.Timeout | null = null;
  private cacheCleanupTimer: NodeJS.Timeout | null = null;

  constructor(room: WorldRoom) {
    this.room = room;
    this.visionService = new PokemonTrainerVisionService();
    this.battleHandlers = room.getBattleHandlers();
    
    console.log('🎯 TrainerVisionHandlers initialisé');
    
    this.startVisionSystem();
    this.startMaintenanceTasks();
  }

  // ===================================================================
  // 🚀 INITIALISATION ET SETUP
  // ===================================================================

  /**
   * Configure tous les handlers de messages pour la vision des trainers
   */
  setupHandlers(): void {
    console.log('📨 Configuration handlers vision trainers...');

    // Réponse du joueur à une détection de trainer
    this.room.onMessage("trainerDetectionResponse", (client, data: {
      trainerId: string;
      response: 'accept' | 'decline' | 'flee';
      dialogueComplete?: boolean;
    }) => {
      this.handleTrainerDetectionResponse(client, data);
    });

    // Demande d'état des trainers dans une zone
    this.room.onMessage("requestTrainerStates", (client, data: { zone: string }) => {
      this.handleTrainerStatesRequest(client, data.zone);
    });

    // Combat de trainer terminé
    this.room.onMessage("trainerBattleFinished", (client, data: {
      trainerId: string;
      result: 'victory' | 'defeat' | 'fled';
      experience?: number;
      rewards?: any;
    }) => {
      this.handleTrainerBattleFinished(client, data);
    });

    // Interaction manuelle avec un trainer
    this.room.onMessage("manualTrainerInteraction", (client, data: {
      npcId: number;
      interactionType: 'talk' | 'challenge';
    }) => {
      this.handleManualTrainerInteraction(client, data);
    });

    // Debug - Forcer détection d'un trainer
    this.room.onMessage("debugForceTrainerDetection", (client, data: { npcId: number }) => {
      if (process.env.NODE_ENV === 'development') {
        this.handleDebugForceDetection(client, data.npcId);
      }
    });

    // Statistiques vision trainers (admin)
    this.room.onMessage("getTrainerVisionStats", (client) => {
      client.send("trainerVisionStats", this.getDetailedStats());
    });

    console.log('✅ Handlers vision trainers configurés');
  }

  // ===================================================================
  // 🔍 SYSTÈME DE VISION PRINCIPAL
  // ===================================================================

  /**
   * Démarre le système de vision des trainers
   */
  private startVisionSystem(): void {
    console.log('👁️ Démarrage système de vision trainers...');

    // Vérification vision toutes les 500ms (optimisé pour MMO)
    this.visionUpdateTimer = setInterval(() => {
      this.performVisionUpdate();
    }, 500);

    console.log('✅ Système de vision trainers démarré');
  }

  /**
   * Met à jour la vision de tous les trainers actifs
   */
  private async performVisionUpdate(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Récupérer tous les joueurs par zone
      const playersByZone = this.groupPlayersByZone();
      
      for (const [zone, players] of playersByZone) {
        if (players.length === 0) continue;
        
        // Récupérer les trainers de cette zone
        const trainers = await this.getActiveTrainersInZone(zone);
        
        // Traiter chaque trainer pour cette zone
        for (const trainer of trainers) {
          await this.processTrainerVision(trainer, players, zone);
        }
      }
      
      const processingTime = Date.now() - startTime;
      this.stats.averageDetectionTime = (this.stats.averageDetectionTime * 0.9) + (processingTime * 0.1);
      
    } catch (error) {
      console.error('❌ Erreur mise à jour vision trainers:', error);
    }
  }

  /**
   * Traite la vision d'un trainer spécifique
   */
  private async processTrainerVision(
    trainer: NpcData,
    playersInZone: { client: Client; player: Player }[],
    zone: string
  ): Promise<void> {
    
    const trainerId = `trainer_${trainer.npcId}_${zone}`;
    
    // Vérifier cooldown de détection
    const lastDetection = this.detectionCooldowns.get(trainerId) || 0;
    const detectionCooldown = trainer.visionConfig?.detectionCooldown || 5000; // 5s par défaut
    
    if (Date.now() - lastDetection < detectionCooldown) {
      return; // Trop tôt pour une nouvelle détection
    }

    // Vérifier état du trainer
    if (!this.canTrainerDetectPlayers(trainer)) {
      return; // Trainer occupé ou vaincu
    }

    // Tester chaque joueur de la zone
    for (const { client, player } of playersInZone) {
      const canDetect = await this.visionService.canTrainerSeePlayer(
        trainer,
        { x: player.x, y: player.y },
        player.level || 1
      );

      if (canDetect.canSee) {
        await this.triggerTrainerDetection(trainer, client, player, zone, canDetect);
        
        // Un trainer ne peut détecter qu'un joueur à la fois
        this.detectionCooldowns.set(trainerId, Date.now());
        this.stats.detectionsThisMinute++;
        break;
      }
    }
  }

  // ===================================================================
  // 🚨 GESTION DES DÉTECTIONS
  // ===================================================================

  /**
   * Déclenche une détection de trainer
   */
  private async triggerTrainerDetection(
    trainer: NpcData,
    client: Client,
    player: Player,
    zone: string,
    detectionResult: any
  ): Promise<void> {
    
    const trainerId = `trainer_${trainer.npcId}_${zone}`;
    
    console.log(`🚨 Détection trainer: ${trainer.name} (${trainerId}) détecte ${player.name}`);

    // Mettre à jour l'état du trainer
    await this.updateTrainerState(trainer, 'alerted', {
      targetPlayerId: client.sessionId,
      detectionTime: Date.now(),
      detectionReason: detectionResult.reason
    });

    // Bloquer le mouvement du joueur
    this.room.blockPlayerMovement(
      client.sessionId, 
      'trainer_detection', 
      30000, // 30s max
      { trainerId, trainerName: trainer.name }
    );

    // Tracking IA
    this.room.trackPlayerAction(
      player.name,
      ActionType.NPC_TALK,
      {
        npcId: trainer.npcId,
        npcType: 'trainer',
        detectionType: 'automatic',
        trainerState: 'alerted'
      },
      {
        location: { map: zone, x: player.x, y: player.y }
      }
    );

    // Créer l'événement de détection
    const detectionEvent: TrainerDetectionEvent = {
      trainerId,
      trainerNpcId: trainer.npcId,
      playerId: client.sessionId,
      playerName: player.name,
      detectionType: 'sight',
      trainerPosition: { x: trainer.position.x, y: trainer.position.y },
      playerPosition: { x: player.x, y: player.y },
      distance: detectionResult.distance,
      zone,
      timestamp: Date.now()
    };

    // Envoyer au client
    client.send("trainerDetected", {
      trainerId,
      trainerData: {
        npcId: trainer.npcId,
        name: trainer.name,
        sprite: trainer.sprite,
        position: trainer.position,
        trainerClass: this.getTrainerClass(trainer),
        level: this.getTrainerLevel(trainer)
      },
      detectionEvent,
      dialogue: await this.getTrainerDialogue(trainer, 'preBattle'),
      battlePreview: await this.getTrainerBattlePreview(trainer),
      timeoutMs: 25000 // 25s pour répondre
    });

    // Notifier les autres joueurs de la zone (animation)
    this.broadcastToZone(zone, "trainerDetectionEvent", {
      trainerId,
      trainerPosition: trainer.position,
      targetPlayerName: player.name,
      trainerName: trainer.name
    }, [client.sessionId]); // Exclure le joueur détecté
  }

  /**
   * Gère la réponse du joueur à une détection
   */
  private async handleTrainerDetectionResponse(
    client: Client, 
    data: { trainerId: string; response: 'accept' | 'decline' | 'flee'; dialogueComplete?: boolean }
  ): Promise<void> {
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`📥 Réponse détection trainer: ${player.name} -> ${data.response} (${data.trainerId})`);

    const trainer = await this.getTrainerFromCache(data.trainerId);
    if (!trainer) {
      console.error(`❌ Trainer ${data.trainerId} introuvable`);
      this.room.unblockPlayerMovement(client.sessionId, 'trainer_detection');
      return;
    }

    switch (data.response) {
      case 'accept':
        await this.startTrainerBattle(client, player, trainer, data.trainerId);
        break;
        
      case 'decline':
        // Dans Pokémon, on ne peut pas refuser un combat de trainer !
        client.send("trainerResponseResult", {
          success: false,
          message: "Tu ne peux pas fuir un combat de dresseur !",
          forceAccept: true
        });
        break;
        
      case 'flee':
        await this.handleTrainerFlee(client, player, trainer, data.trainerId);
        break;
    }
  }

  // ===================================================================
  // ⚔️ GESTION DES COMBATS
  // ===================================================================

  /**
   * Démarre un combat de trainer
   */
  private async startTrainerBattle(
    client: Client,
    player: Player,
    trainer: NpcData,
    trainerId: string
  ): Promise<void> {
    
    console.log(`⚔️ Démarrage combat trainer: ${player.name} vs ${trainer.name}`);

    try {
      // Vérifier que le joueur peut se battre
      const canBattle = await this.visionService.canPlayerBattleTrainer(
        { x: player.x, y: player.y },
        player.level || 1,
        [],
        trainer
      );

      if (!canBattle.canBattle) {
        client.send("trainerBattleError", {
          message: canBattle.reason || "Impossible de commencer le combat",
          trainerId
        });
        this.room.unblockPlayerMovement(client.sessionId, 'trainer_detection');
        return;
      }

      // Mettre à jour l'état du trainer
      await this.updateTrainerState(trainer, 'battling', {
        opponentId: client.sessionId,
        battleStartTime: Date.now()
      });

      // Créer la configuration de combat
      const battleConfig: TrainerBattleRequest = {
        trainerId,
        npcId: trainer.npcId,
        playerId: client.sessionId,
        playerName: player.name,
        battleConfig: {
          battleType: trainer.battleConfig?.battleType || 'single',
          teamId: trainer.battleConfig?.teamId || `team_${trainer.npcId}`,
          allowItems: trainer.battleConfig?.allowItems ?? true,
          allowSwitching: trainer.battleConfig?.allowSwitching ?? true
        },
        preDialogue: await this.getTrainerDialogue(trainer, 'preBattle'),
        zone: player.currentZone
      };

      // Changer le blocage de mouvement pour combat
      this.room.unblockPlayerMovement(client.sessionId, 'trainer_detection');
      this.room.blockPlayerMovement(client.sessionId, 'battle', undefined, { trainerId });

      // Déléguer au BattleHandlers
      const battleResult = await this.battleHandlers.startTrainerBattle(
        client,
        battleConfig.battleConfig.teamId,
        battleConfig
      );

      if (battleResult.success) {
        this.stats.battlesInProgress++;
        
        client.send("trainerBattleStarted", {
          success: true,
          battleId: battleResult.battleId,
          trainerId,
          battleConfig: battleConfig.battleConfig,
          dialogue: battleConfig.preDialogue
        });

        // Tracking IA
        this.room.trackPlayerAction(
          player.name,
          ActionType.BATTLE_START,
          {
            opponentType: 'trainer',
            opponentId: trainer.npcId,
            battleType: battleConfig.battleConfig.battleType,
            trainerId
          },
          {
            location: { map: player.currentZone, x: player.x, y: player.y }
          }
        );

      } else {
        console.error(`❌ Erreur démarrage combat trainer:`, battleResult.error);
        client.send("trainerBattleError", {
          message: "Impossible de démarrer le combat",
          error: battleResult.error,
          trainerId
        });
        
        await this.updateTrainerState(trainer, 'idle');
        this.room.unblockPlayerMovement(client.sessionId, 'battle');
      }

    } catch (error) {
      console.error(`❌ Erreur startTrainerBattle:`, error);
      client.send("trainerBattleError", {
        message: "Erreur lors du démarrage du combat",
        trainerId
      });
      
      await this.updateTrainerState(trainer, 'idle');
      this.room.unblockPlayerMovement(client.sessionId, 'trainer_detection');
      this.room.unblockPlayerMovement(client.sessionId, 'battle');
    }
  }

  /**
   * Gère la fin d'un combat de trainer
   */
  private async handleTrainerBattleFinished(
    client: Client,
    data: { trainerId: string; result: 'victory' | 'defeat' | 'fled'; experience?: number; rewards?: any }
  ): Promise<void> {
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`🏁 Combat trainer terminé: ${player.name} -> ${data.result} (${data.trainerId})`);

    const trainer = await this.getTrainerFromCache(data.trainerId);
    if (!trainer) {
      console.error(`❌ Trainer ${data.trainerId} introuvable pour fin de combat`);
      return;
    }

    try {
      // Mettre à jour l'état du trainer selon le résultat
      if (data.result === 'victory') {
        await this.updateTrainerState(trainer, 'defeated', {
          defeatedBy: client.sessionId,
          defeatedAt: Date.now(),
          canRematch: trainer.rebattle?.enabled || false
        });

        // Ajouter le joueur à la liste des vainqueurs
        if (trainer.trainerRuntime?.defeatedBy) {
          if (!trainer.trainerRuntime.defeatedBy.includes(client.sessionId)) {
            trainer.trainerRuntime.defeatedBy.push(client.sessionId);
          }
        }

        // Dialogue de défaite
        const defeatDialogue = await this.getTrainerDialogue(trainer, 'defeat');
        client.send("trainerDefeatDialogue", {
          trainerId: data.trainerId,
          dialogue: defeatDialogue,
          rewards: data.rewards
        });

      } else if (data.result === 'defeat') {
        await this.updateTrainerState(trainer, 'victorious', {
          defeatedPlayer: client.sessionId,
          victoryAt: Date.now()
        });

        // Dialogue de victoire
        const victoryDialogue = await this.getTrainerDialogue(trainer, 'victory');
        client.send("trainerVictoryDialogue", {
          trainerId: data.trainerId,
          dialogue: victoryDialogue
        });

      } else if (data.result === 'fled') {
        await this.updateTrainerState(trainer, 'confused', {
          playerFled: client.sessionId,
          fleeAt: Date.now()
        });
      }

      // Cooldown de combat
      this.battleCooldowns.set(data.trainerId, Date.now());

      // Débloquer le joueur
      this.room.unblockPlayerMovement(client.sessionId, 'battle');

      // Statistiques
      this.stats.battlesInProgress = Math.max(0, this.stats.battlesInProgress - 1);

      // Tracking IA
      this.room.trackPlayerAction(
        player.name,
        ActionType.BATTLE_END,
        {
          opponentType: 'trainer',
          opponentId: trainer.npcId,
          result: data.result,
          experience: data.experience,
          trainerId: data.trainerId
        },
        {
          location: { map: player.currentZone, x: player.x, y: player.y }
        }
      );

      console.log(`✅ Combat trainer ${data.trainerId} traité: ${data.result}`);

    } catch (error) {
      console.error(`❌ Erreur handleTrainerBattleFinished:`, error);
      
      // Nettoyage d'urgence
      await this.updateTrainerState(trainer, 'idle');
      this.room.unblockPlayerMovement(client.sessionId, 'battle');
    }
  }

  // ===================================================================
  // 🏃 GESTION DE LA FUITE
  // ===================================================================

  /**
   * Gère la fuite d'un joueur face à un trainer
   */
  private async handleTrainerFlee(
    client: Client,
    player: Player,
    trainer: NpcData,
    trainerId: string
  ): Promise<void> {
    
    console.log(`🏃 Tentative de fuite: ${player.name} fuit ${trainer.name}`);

    // Dans Pokémon classique, impossible de fuir face à un trainer
    // Mais on peut permettre dans certains cas (événements spéciaux, etc.)
    const canFlee = trainer.visionConfig?.blockMovement === false || 
                   trainer.battleConditions?.forbiddenFlags?.includes('no_flee');

    if (!canFlee) {
      client.send("trainerFleeResult", {
        success: false,
        message: "Tu ne peux pas fuir face à un dresseur !",
        trainerId,
        forced: true // Force le combat
      });
      return;
    }

    // Fuite autorisée - débloquer et remettre trainer en idle
    await this.updateTrainerState(trainer, 'returning', {
      playerFled: client.sessionId,
      returnStartTime: Date.now()
    });

    this.room.unblockPlayerMovement(client.sessionId, 'trainer_detection');

    client.send("trainerFleeResult", {
      success: true,
      message: "Tu as réussi à t'échapper !",
      trainerId
    });

    // Programmer le retour du trainer à sa position
    setTimeout(async () => {
      await this.updateTrainerState(trainer, 'idle');
    }, 5000); // 5s pour retourner

    console.log(`✅ Fuite réussie: ${player.name} a échappé à ${trainer.name}`);
  }

  // ===================================================================
  // 🤝 INTERACTIONS MANUELLES
  // ===================================================================

  /**
   * Gère l'interaction manuelle avec un trainer
   */
  private async handleManualTrainerInteraction(
    client: Client,
    data: { npcId: number; interactionType: 'talk' | 'challenge' }
  ): Promise<void> {
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`🤝 Interaction manuelle trainer: ${player.name} -> ${data.interactionType} (NPC ${data.npcId})`);

    try {
      // Récupérer le trainer
      const trainer = await this.getTrainerByNpcId(data.npcId, player.currentZone);
      if (!trainer) {
        client.send("manualTrainerResult", {
          success: false,
          message: "Trainer introuvable"
        });
        return;
      }

      const trainerId = `trainer_${trainer.npcId}_${player.currentZone}`;

      // Vérifier si le trainer peut interagir
      if (!this.canTrainerInteract(trainer, client.sessionId)) {
        const state = trainer.trainerRuntime?.currentState || 'unknown';
        client.send("manualTrainerResult", {
          success: false,
          message: `Le dresseur est ${state === 'defeated' ? 'vaincu' : 'occupé'}`
        });
        return;
      }

      if (data.interactionType === 'talk') {
        // Simple dialogue
        const dialogue = await this.getTrainerDialogue(trainer, 'casual');
        client.send("manualTrainerResult", {
          success: true,
          type: 'dialogue',
          dialogue,
          trainerId
        });

      } else if (data.interactionType === 'challenge') {
        // Défi direct
        await this.startTrainerBattle(client, player, trainer, trainerId);
      }

    } catch (error) {
      console.error(`❌ Erreur interaction manuelle trainer:`, error);
      client.send("manualTrainerResult", {
        success: false,
        message: "Erreur lors de l'interaction"
      });
    }
  }

  // ===================================================================
  // 🛠️ MÉTHODES UTILITAIRES
  // ===================================================================

  private groupPlayersByZone(): Map<string, { client: Client; player: Player }[]> {
    const playersByZone = new Map<string, { client: Client; player: Player }[]>();

    for (const client of this.room.clients) {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) continue;

      const zone = player.currentZone;
      if (!playersByZone.has(zone)) {
        playersByZone.set(zone, []);
      }
      playersByZone.get(zone)!.push({ client, player });
    }

    return playersByZone;
  }

  private async getActiveTrainersInZone(zone: string): Promise<NpcData[]> {
    try {
      const npcManager = this.room.getNpcManager(zone);
      if (!npcManager) return [];

      const allNpcs = npcManager.getAllNpcs();
      return allNpcs.filter(npc => 
        (npc.type === 'trainer' || npc.visionConfig) &&
        npc.isActive !== false
      );
    } catch (error) {
      console.error(`❌ Erreur récupération trainers zone ${zone}:`, error);
      return [];
    }
  }

  private canTrainerDetectPlayers(trainer: NpcData): boolean {
    const state = trainer.trainerRuntime?.currentState || 'idle';
    const validStates = ['idle', 'alerted'];
    
    // Vérifier cooldown de bataille
    const trainerId = `trainer_${trainer.npcId}`;
    const lastBattle = this.battleCooldowns.get(trainerId) || 0;
    const battleCooldown = trainer.battleConditions?.cooldownMinutes || 0;
    
    if (battleCooldown > 0) {
      const timeSinceLastBattle = Date.now() - lastBattle;
      if (timeSinceLastBattle < battleCooldown * 60 * 1000) {
        return false;
      }
    }

    return validStates.includes(state);
  }

  private canTrainerInteract(trainer: NpcData, playerId: string): boolean {
    const state = trainer.trainerRuntime?.currentState || 'idle';
    
    // Si vaincu, vérifier si rematch possible
    if (state === 'defeated') {
      if (!trainer.rebattle?.enabled) return false;
      
      const cooldown = trainer.rebattle.cooldownHours || 24;
      const lastBattle = trainer.trainerRuntime?.lastBattleTime || 0;
      const timeSinceBattle = Date.now() - lastBattle;
      
      return timeSinceBattle > (cooldown * 60 * 60 * 1000);
    }

    return ['idle', 'alerted'].includes(state);
  }

  private async updateTrainerState(
    trainer: NpcData,
    newState: string,
    metadata?: any
  ): Promise<void> {
    
    const oldState = trainer.trainerRuntime?.currentState || 'idle';
    
    if (!trainer.trainerRuntime) {
      trainer.initializeTrainerRuntime();
    }

    trainer.trainerRuntime!.currentState = newState as any;
    
    if (metadata) {
      Object.assign(trainer.trainerRuntime!, metadata);
    }

    // Sauvegarder en DB si nécessaire
    try {
      await trainer.save();
    } catch (error) {
      console.error(`❌ Erreur sauvegarde état trainer ${trainer.npcId}:`, error);
    }

    console.log(`🔄 État trainer ${trainer.npcId}: ${oldState} → ${newState}`);
  }

  private async getTrainerFromCache(trainerId: string): Promise<NpcData | null> {
    // Format: trainer_npcId_zone
    const match = trainerId.match(/^trainer_(\d+)_(.+)$/);
    if (!match) return null;

    const [, npcIdStr, zone] = match;
    const npcId = parseInt(npcIdStr);

    return await this.getTrainerByNpcId(npcId, zone);
  }

  private async getTrainerByNpcId(npcId: number, zone: string): Promise<NpcData | null> {
    const cacheKey = `${npcId}_${zone}`;
    const cached = this.trainerCache.get(cacheKey);
    
    if (cached && Date.now() - cached.lastUpdate < 60000) { // Cache 1 minute
      this.stats.cacheHitRate = (this.stats.cacheHitRate * 0.9) + (1 * 0.1);
      return cached.npc;
    }

    try {
      const npcManager = this.room.getNpcManager(zone);
      if (!npcManager) return null;

      const npc = npcManager.getNpcById(npcId);
      if (!npc || (npc.type !== 'trainer' && !npc.visionConfig)) return null;

      // Mettre en cache
      this.trainerCache.set(cacheKey, {
        npc,
        lastUpdate: Date.now()
      });

      this.stats.cacheHitRate = (this.stats.cacheHitRate * 0.9) + (0 * 0.1);
      return npc;

    } catch (error) {
      console.error(`❌ Erreur récupération trainer ${npcId}:`, error);
      return null;
    }
  }

  private getTrainerClass(trainer: NpcData): string {
    return trainer.battleConfig?.trainerClass || 
           trainer.properties?.trainerClass || 
           'Dresseur';
  }

  private getTrainerLevel(trainer: NpcData): number {
    return trainer.battleConfig?.levelCap || 
           trainer.properties?.level || 
           10;
  }

  private async getTrainerDialogue(trainer: NpcData, type: string): Promise<string[]> {
    // Utiliser le système IA pour les dialogues contextuels
    try {
      const aiResult = await this.room.getAINPCManager().handleIntelligentNPCInteraction(
        'system', // Utilisateur système
        'system_session',
        trainer.npcId,
        {
          name: 'System',
          level: 50,
          gold: 0,
          currentZone: 'system',
          x: 0,
          y: 0
        }
      );

      if (aiResult.success && aiResult.dialogue?.message) {
        return [aiResult.dialogue.message];
      }
    } catch (error) {
      console.warn(`⚠️ IA dialogue échec, fallback manuel:`, error);
    }

    // Fallback dialogues manuels
    const dialogues: Record<string, string[]> = {
      preBattle: [
        `Hé toi ! Tu sembles être un dresseur !`,
        `Nos regards se sont croisés ! C'est l'heure du combat !`
      ],
      defeat: [
        `Bravo ! Tu es vraiment fort !`,
        `J'ai encore beaucoup à apprendre...`
      ],
      victory: [
        `Haha ! J'ai gagné !`,
        `Continue à t'entraîner !`
      ],
      casual: [
        `Salut ! Comment va ton adventure ?`,
        `Les Pokémon sauvages sont nombreux dans le coin !`
      ]
    };

    return dialogues[type] || dialogues.casual;
  }

  private async getTrainerBattlePreview(trainer: NpcData): Promise<any> {
    return {
      teamSize: 1, // TODO: Récupérer taille équipe réelle
      averageLevel: this.getTrainerLevel(trainer),
      trainerClass: this.getTrainerClass(trainer),
      canRematch: trainer.rebattle?.enabled || false
    };
  }

  private broadcastToZone(zone: string, message: string, data: any, exclude: string[] = []): void {
    for (const client of this.room.clients) {
      if (exclude.includes(client.sessionId)) continue;
      
      const player = this.room.state.players.get(client.sessionId);
      if (player && player.currentZone === zone) {
        client.send(message, data);
      }
    }
  }

  // ===================================================================
  // 🔧 MAINTENANCE ET TÂCHES DE FOND
  // ===================================================================

  private startMaintenanceTasks(): void {
    // Reset des stats chaque minute
    this.statsResetTimer = setInterval(() => {
      this.stats.detectionsThisMinute = 0;
    }, 60000);

    // Nettoyage du cache toutes les 5 minutes
    this.cacheCleanupTimer = setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000);

    console.log('🧹 Tâches de maintenance trainers démarrées');
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.trainerCache) {
      if (now - cached.lastUpdate > 5 * 60 * 1000) { // 5 minutes
        this.trainerCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cache trainers nettoyé: ${cleanedCount} entrées supprimées`);
    }
  }

  // ===================================================================
  // 📊 STATISTIQUES ET DEBUG
  // ===================================================================

  private handleTrainerStatesRequest(client: Client, zone: string): void {
    // TODO: Implémenter envoi des états de trainers de la zone
    console.log(`📊 Demande états trainers zone ${zone} par ${client.sessionId}`);
  }

  private handleDebugForceDetection(client: Client, npcId: number): void {
    console.log(`🔧 Debug: Force détection trainer ${npcId} par ${client.sessionId}`);
    // TODO: Implémenter force détection pour debug
  }

  getStats(): TrainerVisionStats {
    return { ...this.stats };
  }

  private getDetailedStats(): any {
    return {
      ...this.stats,
      cacheSize: this.trainerCache.size,
      activeCooldowns: {
        detection: this.detectionCooldowns.size,
        battle: this.battleCooldowns.size
      },
      visionSystemActive: !!this.visionUpdateTimer
    };
  }

  // ===================================================================
  // 🧹 NETTOYAGE
  // ===================================================================

  cleanup(): void {
    console.log('🧹 Nettoyage TrainerVisionHandlers...');

    if (this.visionUpdateTimer) {
      clearInterval(this.visionUpdateTimer);
      this.visionUpdateTimer = null;
    }

    if (this.statsResetTimer) {
      clearInterval(this.statsResetTimer);
      this.statsResetTimer = null;
    }

    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
      this.cacheCleanupTimer = null;
    }

    this.trainerCache.clear();
    this.detectionCooldowns.clear();
    this.battleCooldowns.clear();

    console.log('✅ TrainerVisionHandlers nettoyé');
  }
}
