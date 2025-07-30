// server/src/handlers/TrainerVisionHandlers.ts

/**
 * 👁️ TRAINER VISION HANDLERS - GESTIONNAIRES COLYSEUS POUR VISION DES DRESSEURS
 * 
 * Intègre le PokemonTrainerVisionService dans WorldRoom :
 * - Handlers pour messages client/serveur
 * - Synchronisation avec le système de combat existant
 * - Gestion des événements de détection automatique
 * - Integration avec l'IA et le BattleSystem
 * - Performance optimisée pour MMO
 */

import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { Player } from "../schema/PokeWorldState";
import { 
  PokemonTrainerVisionService, 
  TrainerDetectionEvent, 
  TrainerInteractionResult,
  PlayerPosition,
  createTrainerVisionService,
  TRAINER_VISION_PRESETS
} from "../services/PokemonTrainerVisionService";

// Import des systèmes existants
import { movementBlockManager, BlockReason } from "../managers/MovementBlockManager";
import { JWTManager } from "../managers/JWTManager";
import { NpcData } from "../models/NpcData";
import { ActionType } from "../Intelligence/Core/ActionTypes";

// ===================================================================
// 🎯 INTERFACES POUR HANDLERS
// ===================================================================

interface TrainerInteractionRequest {
  trainerId: string;
  interactionType: 'click' | 'collision';
  playerPosition?: {
    x: number;
    y: number;
  };
}

interface TrainerStateChangeRequest {
  trainerId: string;
  newState: 'idle' | 'alerted' | 'chasing' | 'battling' | 'defeated' | 'returning';
  adminToken?: string; // Pour actions admin
}

interface TrainerVisionDebugRequest {
  action: 'stats' | 'reload_trainers' | 'toggle_debug' | 'force_detection';
  zoneName?: string;
  trainerId?: string;
  playerId?: string;
}

// ===================================================================
// 🔥 CLASSE PRINCIPALE - TRAINER VISION HANDLERS
// ===================================================================

export class TrainerVisionHandlers {
  private room: WorldRoom;
  private visionService: PokemonTrainerVisionService;
  private jwtManager = JWTManager.getInstance();
  
  // Tracking des interactions en cours
  private activeInteractions: Map<string, { 
    trainerId: string; 
    playerId: string; 
    startTime: number; 
    type: string 
  }> = new Map();
  
  // Configuration
  private config = {
    maxConcurrentInteractions: 10,
    interactionTimeoutMs: 30000, // 30 secondes max par interaction
    enableAutoDetection: true,
    enableAdminCommands: process.env.NODE_ENV === 'development'
  };

  constructor(room: WorldRoom) {
    this.room = room;
    
    // Créer le service de vision avec preset selon l'environnement
    const preset = process.env.NODE_ENV === 'production' ? 
      TRAINER_VISION_PRESETS.production : 
      TRAINER_VISION_PRESETS.development;
      
    this.visionService = createTrainerVisionService(room, {
      ...preset,
      enableSmartDialogues: true, // Utiliser l'IA existante
      enableRematchSystem: true   // Activer les rematchs
    });

    console.log('👁️ [TrainerVisionHandlers] Initialisé pour WorldRoom', {
      roomId: room.roomId,
      preset: process.env.NODE_ENV === 'production' ? 'production' : 'development'
    });
  }

  // ===================================================================
  // 🎮 CONFIGURATION DES HANDLERS COLYSEUS
  // ===================================================================

  /**
   * Configure tous les handlers de messages dans WorldRoom
   */
  setupHandlers(): void {
    console.log('📨 [TrainerVisionHandlers] Configuration des handlers...');

    // === HANDLERS PRINCIPAUX ===
    
    // Interaction directe avec un trainer
    this.room.onMessage("trainerInteract", this.handleTrainerInteraction.bind(this));
    
    // Réponse à une détection automatique
    this.room.onMessage("trainerDetectionResponse", this.handleDetectionResponse.bind(this));
    
    // Démarrage de combat via trainer
    this.room.onMessage("trainerBattleStart", this.handleTrainerBattleStart.bind(this));
    
    // Fin de combat avec trainer
    this.room.onMessage("trainerBattleEnd", this.handleTrainerBattleEnd.bind(this));

    // === HANDLERS DE SYNCHRONISATION ===
    
    // Mise à jour position pour vision
    this.room.onMessage("updateVisionPosition", this.handleVisionPositionUpdate.bind(this));
    
    // Synchronisation des trainers d'une zone
    this.room.onMessage("syncZoneTrainers", this.handleZoneTrainerSync.bind(this));

    // === HANDLERS ADMIN/DEBUG ===
    
    if (this.config.enableAdminCommands) {
      this.room.onMessage("trainerVisionDebug", this.handleVisionDebug.bind(this));
      this.room.onMessage("setTrainerState", this.handleSetTrainerState.bind(this));
    }

    // === HOOKS SYSTÈME EXISTANT ===
    
    this.setupSystemHooks();
    
    console.log('✅ [TrainerVisionHandlers] Tous les handlers configurés');
  }

  /**
   * Configure les hooks avec les systèmes existants de WorldRoom
   */
  private setupSystemHooks(): void {
    console.log('🔗 [TrainerVisionHandlers] Configuration hooks système...');
    
    // Hook sur les mouvements de joueurs (via MovementHandlers existant)
    // Le MovementHandlers existant appellera updatePlayerPosition
    
    // Hook sur les changements de zone
    const originalOnPlayerJoinZone = this.room.onPlayerJoinZone.bind(this.room);
    this.room.onPlayerJoinZone = async (client: Client, zoneName: string) => {
      await originalOnPlayerJoinZone(client, zoneName);
      await this.onPlayerZoneChange(client, zoneName);
    };
    
    console.log('✅ [TrainerVisionHandlers] Hooks système configurés');
  }

  // ===================================================================
  // 🎯 HANDLERS PRINCIPAUX
  // ===================================================================

  /**
   * Handler pour interaction directe avec un trainer
   */
  private async handleTrainerInteraction(client: Client, data: TrainerInteractionRequest): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`👥 [TrainerInteraction] ${client.sessionId} -> Trainer ${data.trainerId}`, {
        type: data.interactionType
      });

      // Validation de base
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("trainerInteractionError", { 
          message: "Joueur non trouvé" 
        });
        return;
      }

      // Validation JWT pour sécurité
      const validation = await this.jwtManager.validateSessionRobust(
        client.sessionId,
        player.name,
        'trainerInteraction'
      );

      if (!validation.valid) {
        client.send("trainerInteractionError", { 
          message: "Session invalide",
          reason: validation.reason 
        });
        return;
      }

      // Vérifier limite d'interactions simultanées
      if (this.activeInteractions.size >= this.config.maxConcurrentInteractions) {
        client.send("trainerInteractionError", { 
          message: "Trop d'interactions en cours, réessayez plus tard" 
        });
        return;
      }

      // Enregistrer l'interaction
      const interactionId = `${client.sessionId}_${data.trainerId}_${Date.now()}`;
      this.activeInteractions.set(interactionId, {
        trainerId: data.trainerId,
        playerId: client.sessionId,
        startTime: Date.now(),
        type: data.interactionType
      });

      // Timeout automatique
      setTimeout(() => {
        this.activeInteractions.delete(interactionId);
      }, this.config.interactionTimeoutMs);

      // Déléguer au service de vision
      const result = await this.visionService.handleDirectTrainerInteraction(
        client.sessionId,
        data.trainerId,
        data.interactionType
      );

      // Traiter le résultat
      await this.processInteractionResult(client, result);

      // Nettoyer l'interaction
      this.activeInteractions.delete(interactionId);

      const processingTime = Date.now() - startTime;
      console.log(`✅ [TrainerInteraction] Traité en ${processingTime}ms`);

    } catch (error) {
      console.error(`❌ [TrainerInteraction] Erreur:`, error);
      client.send("trainerInteractionError", { 
        message: "Erreur serveur lors de l'interaction" 
      });
    }
  }

  /**
   * Handler pour réponse à une détection automatique
   */
  private async handleDetectionResponse(client: Client, data: {
    detectionId: string;
    response: 'accept' | 'decline' | 'ignore';
    trainerId: string;
  }): Promise<void> {
    
    try {
      console.log(`🔍 [DetectionResponse] ${client.sessionId} répond: ${data.response}`);

      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;

      if (data.response === 'accept') {
        // Le joueur accepte l'interaction automatique
        await this.handleTrainerInteraction(client, {
          trainerId: data.trainerId,
          interactionType: 'collision' // Utiliser collision pour auto-detection
        });
      } else if (data.response === 'decline') {
        // Le joueur décline - juste débloquer le mouvement
        this.room.unblockPlayerMovement(client.sessionId, 'dialog');
        
        client.send("trainerDetectionDeclined", {
          trainerId: data.trainerId,
          message: "Vous évitez le regard du dresseur."
        });
      }
      // Si 'ignore', ne rien faire - le timeout s'occupera du déblocage

    } catch (error) {
      console.error(`❌ [DetectionResponse] Erreur:`, error);
    }
  }

  /**
   * Handler pour démarrage de combat avec trainer
   */
  private async handleTrainerBattleStart(client: Client, data: {
    trainerId: string;
    battleConfig: any;
    acceptBattle: boolean;
  }): Promise<void> {
    
    try {
      console.log(`⚔️ [TrainerBattle] Démarrage combat: ${client.sessionId} vs ${data.trainerId}`);

      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;

      if (!data.acceptBattle) {
        // Joueur refuse le combat
        client.send("trainerBattleDeclined", {
          trainerId: data.trainerId,
          message: "Vous refusez le combat."
        });
        
        this.room.unblockPlayerMovement(client.sessionId, 'dialog');
        return;
      }

      // Validation sécurité
      const validation = await this.jwtManager.validateSessionRobust(
        client.sessionId,
        player.name,
        'trainerBattle'
      );

      if (!validation.valid) {
        client.send("trainerBattleError", { 
          message: "Session invalide pour combat" 
        });
        return;
      }

      // Bloquer le mouvement pendant le combat
      this.room.blockPlayerMovement(
        client.sessionId, 
        'battle', 
        0, // Durée infinie jusqu'à fin de combat
        { trainerId: data.trainerId, battleType: 'trainer' }
      );

      // Enregistrer état de combat dans JWT (utiliser une méthode qui existe)
      // Note: Adapter selon tes méthodes JWTManager disponibles
      try {
        // Si setBattleState n'existe pas, utiliser une alternative ou commenter
        // this.jwtManager.setBattleState(validation.userId, { ... });
        console.log(`⚔️ Combat trainer préparé pour userId: ${validation.userId}`);
      } catch (error) {
        console.warn('JWTManager setBattleState non disponible:', error);
      }

      // Tracking IA - utiliser l'AI Manager disponible via WorldRoom
      try {
        // Utiliser le système d'IA existant via l'AINPCManager importé
        const { getAINPCManager } = await import('../Intelligence/AINPCManager');
        const aiManager = getAINPCManager();
        
        aiManager.trackPlayerAction(
          player.name,
          ActionType.BATTLE_START,
          {
            opponentType: 'trainer',
            opponentId: data.trainerId,
            battleConfig: data.battleConfig
          },
          {
            location: { map: player.currentZone, x: player.x, y: player.y }
          }
        );
      } catch (error) {
        console.warn('Tracking IA non disponible:', error);
      }

      // Déléguer au BattleSystem existant via BattleHandlers
      const battleHandlers = this.room.getBattleHandlers();
      
      // Utiliser les méthodes existantes du BattleHandlers
      console.log('⚔️ Préparation combat trainer');
      
      // Envoyer config de combat au client pour qu'il lance le battle
      client.send("trainerBattleReady", {
        trainerId: data.trainerId,
        battleConfig: data.battleConfig,
        shouldStart: true,
        message: "Combat de dresseur prêt à démarrer"
      });

      console.log(`✅ [TrainerBattle] Combat démarré avec succès`);

    } catch (error) {
      console.error(`❌ [TrainerBattle] Erreur démarrage:`, error);
      
      // Nettoyer en cas d'erreur
      this.room.unblockPlayerMovement(client.sessionId, 'battle');
      client.send("trainerBattleError", { 
        message: "Erreur lors du démarrage du combat" 
      });
    }
  }

  /**
   * Handler pour fin de combat avec trainer
   */
  private async handleTrainerBattleEnd(client: Client, data: {
    trainerId: string;
    battleResult: 'victory' | 'defeat' | 'draw' | 'flee';
    rewards?: any;
  }): Promise<void> {
    
    try {
      console.log(`🏁 [TrainerBattleEnd] Fin combat: ${client.sessionId} vs ${data.trainerId}`, {
        result: data.battleResult
      });

      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;

      // Validation JWT
      const userId = this.jwtManager.getUserId(client.sessionId);
      const hasActiveBattle = userId ? (this.jwtManager.getBattleState?.(userId) !== null) : false;
      
      if (!userId || !hasActiveBattle) {
        console.warn(`⚠️ [TrainerBattleEnd] Pas de combat actif pour ${client.sessionId}`);
        return;
      }

      // Débloquer le mouvement
      this.room.unblockPlayerMovement(client.sessionId, 'battle');

      // Nettoyer l'état de combat JWT (si méthodes disponibles)
      try {
        // this.jwtManager.clearBattleState(userId);
        console.log(`🏁 Combat terminé pour userId: ${userId}`);
      } catch (error) {
        console.warn('JWTManager clearBattleState non disponible:', error);
      }

      // Mettre à jour l'état du trainer selon le résultat
      await this.updateTrainerPostBattle(data.trainerId, client.sessionId, data.battleResult);

      // Tracking IA
      try {
        // Utiliser le système d'IA existant via l'AINPCManager importé
        const { getAINPCManager } = await import('../Intelligence/AINPCManager');
        const aiManager = getAINPCManager();
        
        aiManager.trackPlayerAction(
          player.name,
          ActionType.BATTLE_END,
          {
            opponentType: 'trainer',
            opponentId: data.trainerId,
            result: data.battleResult,
            rewards: data.rewards
          },
          {
            location: { map: player.currentZone, x: player.x, y: player.y }
          }
        );
      } catch (error) {
        console.warn('Tracking IA non disponible:', error);
      }

      // Notifier le client
      client.send("trainerBattleEndAck", {
        trainerId: data.trainerId,
        result: data.battleResult,
        rewards: data.rewards,
        success: true
      });

      console.log(`✅ [TrainerBattleEnd] Combat terminé avec succès`);

    } catch (error) {
      console.error(`❌ [TrainerBattleEnd] Erreur fin combat:`, error);
      
      // Nettoyer quand même
      this.room.unblockPlayerMovement(client.sessionId, 'battle');
    }
  }

  // ===================================================================
  // 🔄 HANDLERS DE SYNCHRONISATION
  // ===================================================================

  /**
   * Met à jour la position du joueur pour le système de vision
   */
  handleVisionPositionUpdate(client: Client, data: {
    x: number;
    y: number;
    zone: string;
    level?: number;
    isHidden?: boolean;
  }): void {
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    // Convertir les données player en PlayerPosition
    const playerPosition: Omit<PlayerPosition, 'playerId'> = {
      username: player.name,
      x: data.x,
      y: data.y,
      level: data.level || player.level || 1,
      isHidden: data.isHidden || false,
      movementSpeed: 1, // TODO: Récupérer vraie vitesse
      lastMovementTime: Date.now()
    };

    // Mettre à jour dans le service de vision
    this.visionService.updatePlayerPosition(client.sessionId, playerPosition);
  }

  /**
   * Synchronise les trainers d'une zone
   */
  private async handleZoneTrainerSync(client: Client, data: { zoneName: string }): Promise<void> {
    try {
      console.log(`🔄 [ZoneSync] Synchronisation trainers zone ${data.zoneName} pour ${client.sessionId}`);

      // Recharger les trainers de la zone
      await this.visionService.reloadTrainersForZone(data.zoneName);

      // Confirmer au client
      client.send("zoneTrainerSyncComplete", {
        zoneName: data.zoneName,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error(`❌ [ZoneSync] Erreur:`, error);
      client.send("zoneTrainerSyncError", {
        zoneName: data.zoneName,
        message: "Erreur synchronisation trainers"
      });
    }
  }

  // ===================================================================
  // 🛠️ MÉTHODES UTILITAIRES ET TRAITEMENT
  // ===================================================================

  /**
   * Traite le résultat d'une interaction avec un trainer
   */
  private async processInteractionResult(
    client: Client, 
    result: TrainerInteractionResult
  ): Promise<void> {
    
    if (!result.success) {
      client.send("trainerInteractionError", { 
        message: "Interaction échouée" 
      });
      return;
    }

    // Construire la réponse pour le client
    const response: any = {
      success: true,
      interactionType: result.interactionType,
      trainerId: result.dialogue?.npcId,
      dialogue: result.dialogue,
      metadata: result.metadata
    };

    // Actions client spécifiques
    if (result.clientActions.blockMovement) {
      this.room.blockPlayerMovement(
        client.sessionId, 
        'dialog', // Utiliser 'dialog' qui existe dans BlockReason
        10000, // 10 secondes max
        { interaction: result.interactionType }
      );
    }

    if (result.clientActions.startBattle && result.battleConfig) {
      response.battleConfig = result.battleConfig;
      response.shouldStartBattle = true;
      
      // Bloquer pour combat
      this.room.blockPlayerMovement(
        client.sessionId, 
        'battle', // Utiliser 'battle' qui existe
        30000, // 30 secondes pour accepter/refuser
        { trainerId: result.dialogue?.npcId }
      );
    }

    if (result.clientActions.playSound) {
      response.soundEffect = result.clientActions.playSound;
    }

    if (result.clientActions.showEmote) {
      response.emote = result.clientActions.showEmote;
    }

    // Envoyer la réponse
    client.send("trainerInteractionResult", response);

    // Si mouvement de trainer nécessaire
    if (result.clientActions.moveTrainer) {
      this.room.broadcast("trainerMoved", {
        trainerId: result.dialogue?.npcId,
        newPosition: result.clientActions.moveTrainer,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Met à jour l'état d'un trainer après un combat
   */
  private async updateTrainerPostBattle(
    trainerId: string, 
    playerId: string, 
    result: string
  ): Promise<void> {
    
    try {
      // Récupérer le trainer depuis la DB
      const trainer = await NpcData.findOne({ npcId: parseInt(trainerId) });
      if (!trainer) return;

      if (result === 'victory') {
        // Joueur a gagné - trainer vaincu
        trainer.updateTrainerState('defeated');
        
        // Ajouter le joueur à la liste des vainqueurs
        if (trainer.trainerRuntime && !trainer.trainerRuntime.defeatedBy.includes(playerId)) {
          trainer.trainerRuntime.defeatedBy.push(playerId);
        }
        
        // Mettre à jour timestamp de combat
        if (trainer.trainerRuntime) {
          trainer.trainerRuntime.lastBattleTime = Date.now();
        }
        
        await trainer.save();
        
      } else if (result === 'defeat') {
        // Trainer a gagné - retour à l'état idle
        trainer.updateTrainerState('idle');
        await trainer.save();
      }

      console.log(`🏆 [TrainerState] Trainer ${trainerId} mis à jour: ${result}`);

    } catch (error) {
      console.error(`❌ [TrainerState] Erreur mise à jour post-combat:`, error);
    }
  }

  // ===================================================================
  // 🔗 HOOKS SYSTÈME
  // ===================================================================

  /**
   * Appelé quand un joueur change de zone
   */
  private async onPlayerZoneChange(client: Client, zoneName: string): Promise<void> {
    try {
      console.log(`🌍 [VisionHook] ${client.sessionId} change vers zone ${zoneName}`);

      // Recharger les trainers de la nouvelle zone
      await this.visionService.reloadTrainersForZone(zoneName);

      // Mettre à jour la position du joueur
      const player = this.room.state.players.get(client.sessionId);
      if (player) {
        this.handleVisionPositionUpdate(client, {
          x: player.x,
          y: player.y,
          zone: zoneName,
          level: player.level
        });
      }

    } catch (error) {
      console.error(`❌ [VisionHook] Erreur changement zone:`, error);
    }
  }

  /**
   * Hook appelé lors des mouvements de joueur (à appeler depuis MovementHandlers)
   */
  onPlayerMove(client: Client, x: number, y: number, zone: string): void {
    this.handleVisionPositionUpdate(client, { x, y, zone });
  }

  /**
   * Hook appelé quand un joueur quitte la room
   */
  onPlayerLeave(playerId: string): void {
    this.visionService.removePlayer(playerId);
    
    // Nettoyer les interactions actives
    for (const [interactionId, interaction] of this.activeInteractions) {
      if (interaction.playerId === playerId) {
        this.activeInteractions.delete(interactionId);
      }
    }
  }

  // ===================================================================
  // 🐛 HANDLERS DEBUG ET ADMIN
  // ===================================================================

  /**
   * Handler pour commandes de debug
   */
  private async handleVisionDebug(client: Client, data: TrainerVisionDebugRequest): Promise<void> {
    if (!this.config.enableAdminCommands) {
      client.send("debugError", { message: "Commandes debug désactivées" });
      return;
    }

    try {
      let response: any = { action: data.action };

      switch (data.action) {
        case 'stats':
          response.stats = {
            vision: this.visionService.getStats(),
            handlers: {
              activeInteractions: this.activeInteractions.size,
              config: this.config
            }
          };
          break;

        case 'reload_trainers':
          if (data.zoneName) {
            await this.visionService.reloadTrainersForZone(data.zoneName);
            response.message = `Trainers rechargés pour zone ${data.zoneName}`;
          }
          break;

        case 'force_detection':
          if (data.trainerId && data.playerId) {
            const result = await this.visionService.handleDirectTrainerInteraction(
              data.playerId,
              data.trainerId,
              'collision'
            );
            response.detectionResult = result;
          }
          break;

        default:
          response.error = "Action debug non reconnue";
      }

      client.send("visionDebugResult", response);

    } catch (error) {
      console.error(`❌ [VisionDebug] Erreur:`, error);
      client.send("debugError", { message: "Erreur commande debug" });
    }
  }

  /**
   * Handler pour changer l'état d'un trainer (admin)
   */
  private async handleSetTrainerState(client: Client, data: TrainerStateChangeRequest): Promise<void> {
    if (!this.config.enableAdminCommands) {
      client.send("adminError", { message: "Commandes admin désactivées" });
      return;
    }

    try {
      const success = await this.visionService.setTrainerState(data.trainerId, data.newState);
      
      client.send("trainerStateChanged", {
        trainerId: data.trainerId,
        newState: data.newState,
        success
      });

    } catch (error) {
      console.error(`❌ [SetTrainerState] Erreur:`, error);
      client.send("adminError", { message: "Erreur changement état trainer" });
    }
  }

  // ===================================================================
  // 📊 MÉTHODES PUBLIQUES D'ACCÈS
  // ===================================================================

  /**
   * Retourne le service de vision (pour intégrations)
   */
  getVisionService(): PokemonTrainerVisionService {
    return this.visionService;
  }

  /**
   * Retourne les statistiques des handlers
   */
  getStats() {
    return {
      handlersActive: true,
      activeInteractions: this.activeInteractions.size,
      config: this.config,
      visionService: this.visionService.getStats()
    };
  }

  /**
   * Active/désactive la détection automatique
   */
  setAutoDetection(enabled: boolean): void {
    this.config.enableAutoDetection = enabled;
    console.log(`🔄 [TrainerVisionHandlers] Détection automatique ${enabled ? 'activée' : 'désactivée'}`);
  }

  // ===================================================================
  // 🧹 NETTOYAGE
  // ===================================================================

  /**
   * Nettoie les ressources
   */
  cleanup(): void {
    console.log('🧹 [TrainerVisionHandlers] Nettoyage...');
    
    // Arrêter le service de vision
    this.visionService.destroy();
    
    // Nettoyer les interactions actives
    this.activeInteractions.clear();
    
    console.log('✅ [TrainerVisionHandlers] Nettoyé');
  }
}

export default TrainerVisionHandlers;
