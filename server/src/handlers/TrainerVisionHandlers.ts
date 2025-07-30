// server/src/handlers/TrainerVisionHandlers.ts
import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { Player } from "../schema/PokeWorldState";
import { PokemonTrainerVisionService } from "../services/PokemonTrainerVisionService";
import { TrainerDetectionEvent, TrainerStateUpdate } from "../services/PokemonTrainerVisionService";
import { movementBlockManager } from "../managers/MovementBlockManager";

// ===================================================================
// 🎯 INTERFACES POUR LES ÉVÉNEMENTS TRAINER
// ===================================================================

interface TrainerInteractionData {
  trainerId: string;
  playerPosition: { x: number; y: number };
  playerLevel?: number;
  forced?: boolean; // Combat forcé (via clic)
}

interface TrainerDialogueData {
  trainerId: string;
  dialogueType: 'pre_battle' | 'victory' | 'defeat' | 'rematch' | 'busy';
  message: string[];
  canSkip?: boolean;
}

interface TrainerBattleData {
  trainerId: string;
  battleId: string;
  teamId: string;
  battleType: 'single' | 'double';
  preBattleDialogue: string[];
}

// ===================================================================
// 🤖 HANDLERS PRINCIPAUX POUR TRAINERS
// ===================================================================

export class TrainerVisionHandlers {
  private room: WorldRoom;
  private visionService: PokemonTrainerVisionService;
  
  // Cache des dernières détections pour éviter le spam
  private lastDetections: Map<string, { timestamp: number; trainerId: string }> = new Map();
  private detectionCooldown = 2000; // 2 secondes
  
  // Stats pour monitoring
  private stats = {
    totalDetections: 0,
    activeBattles: new Set<string>(),
    trainerInteractions: 0,
    detectionCooldowns: 0
  };

  constructor(room: WorldRoom) {
    this.room = room;
    this.visionService = new PokemonTrainerVisionService();
    
    console.log('🔍 [TrainerVisionHandlers] Initialisé');
    this.setupEventListeners();
  }

  // ===================================================================
  // 🎮 SETUP DES HANDLERS COLYSEUS
  // ===================================================================

  setupHandlers(): void {
    console.log('🔧 [TrainerVisionHandlers] Configuration des message handlers...');

    // Handler pour interaction manuelle avec trainer (clic)
    this.room.onMessage("trainerInteract", (client, data: TrainerInteractionData) => {
      this.handleTrainerInteraction(client, data);
    });

    // Handler pour réponse aux dialogues de trainer
    this.room.onMessage("trainerDialogueResponse", (client, data: { trainerId: string; response: 'accept' | 'decline' | 'continue' }) => {
      this.handleTrainerDialogueResponse(client, data);
    });

    // Handler pour démarrer un combat de trainer
    this.room.onMessage("trainerBattleStart", (client, data: { trainerId: string }) => {
      this.handleTrainerBattleStart(client, data);
    });

    // Handler pour fin de combat de trainer
    this.room.onMessage("trainerBattleEnd", (client, data: { trainerId: string; result: 'win' | 'lose' | 'flee' }) => {
      this.handleTrainerBattleEnd(client, data);
    });

    // Handler pour debug (dev seulement)
    this.room.onMessage("debugTrainerVision", (client, data: { trainerId?: string }) => {
      this.handleDebugTrainerVision(client, data);
    });

    // Handler pour vérifier les trainers dans une zone
    this.room.onMessage("getZoneTrainers", (client, data: { zone: string }) => {
      this.handleGetZoneTrainers(client, data);
    });

    console.log('✅ [TrainerVisionHandlers] Message handlers configurés');
  }

  // ===================================================================
  // 🎯 HANDLERS DES INTERACTIONS TRAINER
  // ===================================================================

  /**
   * Gère l'interaction manuelle avec un trainer (clic direct)
   */
  private async handleTrainerInteraction(client: Client, data: TrainerInteractionData): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ [TrainerInteraction] Joueur non trouvé: ${client.sessionId}`);
      return;
    }

    try {
      console.log(`👤 [TrainerInteraction] ${player.name} interagit avec trainer ${data.trainerId}`);

      // Vérifier si le trainer existe et est disponible
      const trainerNpc = await this.getTrainerNpc(data.trainerId, player.currentZone);
      if (!trainerNpc) {
        client.send("trainerInteractionError", {
          message: "Trainer introuvable",
          trainerId: data.trainerId
        });
        return;
      }

      // Vérifier si le trainer peut combattre
      const canBattle = await this.canTrainerBattle(trainerNpc, player);
      if (!canBattle.canBattle) {
        // Envoyer dialogue de refus
        client.send("trainerDialogue", {
          trainerId: data.trainerId,
          dialogueType: 'busy',
          message: canBattle.reason ? [canBattle.reason] : ["Je ne peux pas me battre maintenant."],
          canSkip: true
        });
        return;
      }

      // Bloquer le mouvement du joueur pendant l'interaction
      this.room.blockPlayerMovement(client.sessionId, 'trainer_interaction', 30000, {
        trainerId: data.trainerId,
        interactionType: 'manual'
      });

      // Mettre à jour l'état du trainer
      await this.visionService.updateTrainerState(data.trainerId, 'engaging', {
        targetPlayerId: client.sessionId,
        engagementType: 'manual_interaction'
      });

      // Envoyer le dialogue de pré-combat
      const preBattleDialogue = this.getTrainerDialogue(trainerNpc, 'pre_battle');
      client.send("trainerDialogue", {
        trainerId: data.trainerId,
        dialogueType: 'pre_battle',
        message: preBattleDialogue,
        npcName: trainerNpc.name,
        canSkip: false,
        battleOptions: {
          canAccept: true,
          canDecline: false, // Combat forcé si interaction manuelle
          battleType: trainerNpc.battleConfig?.battleType || 'single'
        }
      } as TrainerDialogueData & { npcName: string; battleOptions: any });

      this.stats.trainerInteractions++;

    } catch (error) {
      console.error(`❌ [TrainerInteraction] Erreur:`, error);
      
      // Débloquer le joueur en cas d'erreur
      this.room.unblockPlayerMovement(client.sessionId, 'trainer_interaction');
      
      client.send("trainerInteractionError", {
        message: "Erreur lors de l'interaction avec le trainer",
        trainerId: data.trainerId
      });
    }
  }

  /**
   * Gère les réponses aux dialogues de trainer
   */
  private async handleTrainerDialogueResponse(
    client: Client, 
    data: { trainerId: string; response: 'accept' | 'decline' | 'continue' }
  ): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`💬 [TrainerDialogue] ${player.name} répond "${data.response}" à trainer ${data.trainerId}`);

    try {
      switch (data.response) {
        case 'accept':
          // Démarrer le combat
          await this.initiateTrainerBattle(client, data.trainerId);
          break;

        case 'decline':
          // Refuser le combat (si possible)
          await this.declineTrainerBattle(client, data.trainerId);
          break;

        case 'continue':
          // Continuer le dialogue
          await this.continueTrainerDialogue(client, data.trainerId);
          break;
      }

    } catch (error) {
      console.error(`❌ [TrainerDialogue] Erreur réponse dialogue:`, error);
      this.room.unblockPlayerMovement(client.sessionId, 'trainer_interaction');
    }
  }

  /**
   * Démarre un combat de trainer
   */
  private async handleTrainerBattleStart(client: Client, data: { trainerId: string }): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`⚔️ [TrainerBattle] Démarrage combat ${player.name} vs trainer ${data.trainerId}`);

    try {
      // Récupérer les données du trainer
      const trainerNpc = await this.getTrainerNpc(data.trainerId, player.currentZone);
      if (!trainerNpc || !trainerNpc.battleConfig?.teamId) {
        throw new Error(`Trainer ${data.trainerId} sans équipe de combat`);
      }

      // Générer l'ID de combat unique
      const battleId = `trainer_${data.trainerId}_${client.sessionId}_${Date.now()}`;

      // Bloquer le mouvement pour toute la durée du combat
      this.room.blockPlayerMovement(client.sessionId, 'battle', 300000, {
        battleId: battleId,
        trainerId: data.trainerId,
        battleType: 'trainer'
      });

      // Mettre à jour l'état du trainer
      await this.visionService.updateTrainerState(data.trainerId, 'battling', {
        targetPlayerId: client.sessionId,
        battleId: battleId
      });

      // Déléguer au BattleHandlers existant pour démarrer le combat
      const battleData = {
        battleType: 'trainer',
        trainerId: data.trainerId,
        trainerTeamId: trainerNpc.battleConfig.teamId,
        battleConfig: trainerNpc.battleConfig,
        rewards: trainerNpc.rewards
      };

      // Envoyer les données de combat au client
      client.send("trainerBattleStart", {
        battleId: battleId,
        trainerId: data.trainerId,
        trainerName: trainerNpc.name,
        battleType: trainerNpc.battleConfig.battleType,
        teamId: trainerNpc.battleConfig.teamId,
        ...battleData
      } as TrainerBattleData & typeof battleData);

      this.stats.activeBattles.add(battleId);

    } catch (error) {
      console.error(`❌ [TrainerBattle] Erreur démarrage combat:`, error);
      
      this.room.unblockPlayerMovement(client.sessionId, 'battle');
      
      client.send("trainerBattleError", {
        message: "Impossible de démarrer le combat",
        trainerId: data.trainerId
      });
    }
  }

  /**
   * Gère la fin d'un combat de trainer
   */
  private async handleTrainerBattleEnd(
    client: Client, 
    data: { trainerId: string; result: 'win' | 'lose' | 'flee' }
  ): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`🏁 [TrainerBattle] Fin combat ${player.name} vs ${data.trainerId}: ${data.result}`);

    try {
      // Débloquer le mouvement du joueur
      this.room.unblockPlayerMovement(client.sessionId, 'battle');
      this.room.unblockPlayerMovement(client.sessionId, 'trainer_interaction');

      // Récupérer le trainer pour les dialogues
      const trainerNpc = await this.getTrainerNpc(data.trainerId, player.currentZone);
      if (!trainerNpc) return;

      // Mettre à jour l'état du trainer selon le résultat
      let newState: 'defeated' | 'idle' | 'returning' = 'idle';
      const metadata: any = {
        lastBattleResult: data.result,
        lastBattleTime: Date.now(),
        lastOpponent: client.sessionId
      };

      if (data.result === 'win') {
        // Joueur a gagné -> trainer vaincu
        newState = 'defeated';
        metadata.defeatedBy = client.sessionId;
        
        // Ajouter le joueur à la liste des vainqueurs
        if (!trainerNpc.trainerRuntime?.defeatedBy) {
          trainerNpc.trainerRuntime = {
            ...trainerNpc.trainerRuntime,
            defeatedBy: []
          };
        }
        if (!trainerNpc.trainerRuntime.defeatedBy.includes(client.sessionId)) {
          trainerNpc.trainerRuntime.defeatedBy.push(client.sessionId);
        }

      } else if (data.result === 'lose') {
        // Joueur a perdu -> trainer retourne à sa position
        newState = 'returning';
        
      } else if (data.result === 'flee') {
        // Joueur a fui -> trainer retourne à sa position
        newState = 'returning';
      }

      await this.visionService.updateTrainerState(data.trainerId, newState, metadata);

      // Envoyer le dialogue de fin de combat
      const dialogueType = data.result === 'win' ? 'defeat' : 'victory';
      const endDialogue = this.getTrainerDialogue(trainerNpc, dialogueType);
      
      client.send("trainerDialogue", {
        trainerId: data.trainerId,
        dialogueType: dialogueType,
        message: endDialogue,
        npcName: trainerNpc.name,
        canSkip: true,
        battleResult: data.result
      });

      // Nettoyer les stats
      const battleId = `trainer_${data.trainerId}_${client.sessionId}`;
      this.stats.activeBattles.delete(battleId);

      console.log(`✅ [TrainerBattle] Combat terminé et état mis à jour`);

    } catch (error) {
      console.error(`❌ [TrainerBattle] Erreur fin de combat:`, error);
      
      // S'assurer que le joueur est débloqué
      this.room.unblockPlayerMovement(client.sessionId, 'battle');
      this.room.unblockPlayerMovement(client.sessionId, 'trainer_interaction');
    }
  }

  // ===================================================================
  // 🔍 GESTION DE LA DÉTECTION AUTOMATIQUE
  // ===================================================================

  /**
   * Configure les écouteurs d'événements du TrainerVisionService
   */
  private setupEventListeners(): void {
    // Écouter les détections de trainers
    this.visionService.onTrainerDetection((event: TrainerDetectionEvent) => {
      this.handleTrainerDetection(event);
    });

    // Écouter les changements d'état des trainers
    this.visionService.onTrainerStateChange((update: TrainerStateUpdate) => {
      this.handleTrainerStateChange(update);
    });

    console.log('🎧 [TrainerVisionHandlers] Event listeners configurés');
  }

  /**
   * Gère une détection automatique de trainer
   */
  private async handleTrainerDetection(event: TrainerDetectionEvent): Promise<void> {
    try {
      console.log(`🔍 [TrainerDetection] Détection: ${event.trainerId} → ${event.playerId}`);

      // Vérifier cooldown pour éviter le spam
      const lastDetection = this.lastDetections.get(event.playerId);
      if (lastDetection && Date.now() - lastDetection.timestamp < this.detectionCooldown) {
        this.stats.detectionCooldowns++;
        return;
      }

      this.lastDetections.set(event.playerId, {
        timestamp: Date.now(),
        trainerId: event.trainerId
      });

      // Trouver le client correspondant
      const client = this.room.clients.find(c => c.sessionId === event.playerId);
      if (!client) {
        console.warn(`⚠️ [TrainerDetection] Client non trouvé: ${event.playerId}`);
        return;
      }

      const player = this.room.state.players.get(event.playerId);
      if (!player) {
        console.warn(`⚠️ [TrainerDetection] Joueur non trouvé: ${event.playerId}`);
        return;
      }

      // Vérifier si le trainer peut combattre
      const trainerNpc = await this.getTrainerNpc(event.trainerId, player.currentZone);
      if (!trainerNpc) return;

      const canBattle = await this.canTrainerBattle(trainerNpc, player);
      if (!canBattle.canBattle) {
        console.log(`🚫 [TrainerDetection] Trainer ${event.trainerId} ne peut pas combattre: ${canBattle.reason}`);
        return;
      }

      // Bloquer le mouvement du joueur
      this.room.blockPlayerMovement(event.playerId, 'trainer_detection', 30000, {
        trainerId: event.trainerId,
        detectionType: 'automatic'
      });

      // Envoyer l'événement de détection au client
      client.send("trainerDetected", {
        trainerId: event.trainerId,
        trainerName: trainerNpc.name,
        trainerSprite: trainerNpc.sprite,
        position: { x: trainerNpc.position.x, y: trainerNpc.position.y },
        detectionType: event.detectionType,
        canEscape: event.canEscape,
        preBattleDialogue: this.getTrainerDialogue(trainerNpc, 'pre_battle')
      });

      this.stats.totalDetections++;

    } catch (error) {
      console.error(`❌ [TrainerDetection] Erreur gestion détection:`, error);
    }
  }

  /**
   * Gère les changements d'état des trainers
   */
  private handleTrainerStateChange(update: TrainerStateUpdate): void {
    console.log(`🔄 [TrainerState] ${update.trainerId}: ${update.oldState} → ${update.newState}`);

    // Broadcaster l'état aux clients de la zone si nécessaire
    if (update.shouldBroadcast) {
      this.broadcastTrainerStateToZone(update);
    }
  }

  // ===================================================================
  // 🎮 MÉTHODES PUBLIQUES POUR LA WORLDROOM
  // ===================================================================

  /**
   * Vérifie les trainers autour d'un joueur en mouvement
   */
  async onPlayerMove(sessionId: string, x: number, y: number, zone: string): Promise<void> {
    try {
      // Vérifier si le joueur est déjà bloqué
      if (this.room.isPlayerMovementBlocked(sessionId)) {
        return;
      }

      // Vérifier les trainers dans la zone
      await this.visionService.checkTrainerDetection(sessionId, { x, y }, zone);

    } catch (error) {
      console.error(`❌ [TrainerVision] Erreur vérification mouvement:`, error);
    }
  }

  /**
   * Initialise les trainers d'une zone pour un joueur
   */
  async onPlayerJoinZone(client: Client, zone: string): Promise<void> {
    try {
      console.log(`🌍 [TrainerVision] ${client.sessionId} rejoint zone ${zone}`);

      // Récupérer les trainers actifs de la zone
      const trainers = await this.visionService.getZoneTrainers(zone);
      
      if (trainers.length > 0) {
        client.send("zoneTrainers", {
          zone: zone,
          trainers: trainers.map(t => ({
            id: t.id,
            name: t.name,
            position: t.position,
            state: t.trainerRuntime?.currentState || 'idle',
            canBattle: t.battleConfig?.canBattle || false
          }))
        });

        console.log(`📤 [TrainerVision] ${trainers.length} trainers envoyés pour zone ${zone}`);
      }

    } catch (error) {
      console.error(`❌ [TrainerVision] Erreur initialisation zone:`, error);
    }
  }

  /**
   * Nettoie les données d'un joueur qui quitte
   */
  onPlayerLeave(sessionId: string): void {
    // Nettoyer les détections en cache
    this.lastDetections.delete(sessionId);
    
    // Annuler les combats en cours
    for (const battleId of this.stats.activeBattles) {
      if (battleId.includes(sessionId)) {
        this.stats.activeBattles.delete(battleId);
      }
    }

    console.log(`🧹 [TrainerVision] Nettoyage données joueur ${sessionId}`);
  }

  // ===================================================================
  // 🛠️ MÉTHODES UTILITAIRES PRIVÉES
  // ===================================================================

  private async getZoneTrainers(zone: string): Promise<any[]> {
    try {
      return await this.visionService.getZoneTrainers(zone);
    } catch (error) {
      console.error(`❌ [TrainerVision] Erreur récupération trainers zone ${zone}:`, error);
      return [];
    }
  }

  private async handleGetZoneTrainers(client: Client, data: { zone: string }): Promise<void> {
    const trainers = await this.getZoneTrainers(data.zone);
    
    client.send("zoneTrainersResponse", {
      zone: data.zone,
      trainers: trainers,
      count: trainers.length
    });
  }

  private async handleDebugTrainerVision(client: Client, data: { trainerId?: string }): Promise<void> {
    if (process.env.NODE_ENV !== 'development') return;

    const debug = {
      stats: this.stats,
      activeDetections: Object.fromEntries(this.lastDetections),
      serviceStats: this.visionService.getStats()
    };

    if (data.trainerId) {
      debug['trainerDetails'] = await this.visionService.getTrainerDebugInfo(data.trainerId);
    }

    client.send("trainerVisionDebug", debug);
  }

  // ===================================================================
  // 🔧 MÉTHODES UTILITAIRES PRIVÉES (SUITE)
  // ===================================================================

  /**
   * Récupère un NPC trainer par son ID
   */
  private async getTrainerNpc(trainerId: string, zone: string): Promise<any | null> {
    try {
      const npcManager = this.room.getNpcManager(zone);
      if (!npcManager) return null;

      const allNpcs = npcManager.getAllNpcs();
      return allNpcs.find(npc => 
        npc.id.toString() === trainerId && 
        (npc.type === 'trainer' || npc.battleConfig?.teamId)
      ) || null;

    } catch (error) {
      console.error(`❌ [TrainerVision] Erreur récupération trainer ${trainerId}:`, error);
      return null;
    }
  }

  /**
   * Vérifie si un trainer peut combattre
   */
  private async canTrainerBattle(trainerNpc: any, player: Player): Promise<{ canBattle: boolean; reason?: string }> {
    try {
      // Vérifier configuration de combat
      if (!trainerNpc.battleConfig?.canBattle || !trainerNpc.battleConfig?.teamId) {
        return { canBattle: false, reason: "Ce trainer ne peut pas combattre." };
      }

      // Vérifier l'état actuel
      const currentState = trainerNpc.trainerRuntime?.currentState || 'idle';
      if (currentState === 'battling') {
        return { canBattle: false, reason: "Ce trainer est déjà en combat." };
      }

      // Vérifier si déjà vaincu par ce joueur
      const defeatedBy = trainerNpc.trainerRuntime?.defeatedBy || [];
      if (defeatedBy.includes(player.id)) {
        // Vérifier cooldown de rematch si configuré
        const rematchConfig = trainerNpc.rebattle;
        if (!rematchConfig?.enabled) {
          return { canBattle: false, reason: "Vous avez déjà vaincu ce trainer." };
        }

        const lastBattleTime = trainerNpc.trainerRuntime?.lastBattleTime || 0;
        const cooldownMs = (rematchConfig.cooldownHours || 24) * 60 * 60 * 1000;
        if (Date.now() - lastBattleTime < cooldownMs) {
          return { canBattle: false, reason: "Il est trop tôt pour un rematch." };
        }
      }

      // Vérifier conditions de niveau
      const battleConditions = trainerNpc.battleConditions;
      if (battleConditions) {
        if (battleConditions.minPlayerLevel && player.level < battleConditions.minPlayerLevel) {
          return { canBattle: false, reason: `Niveau minimum requis: ${battleConditions.minPlayerLevel}` };
        }
        if (battleConditions.maxPlayerLevel && player.level > battleConditions.maxPlayerLevel) {
          return { canBattle: false, reason: "Votre niveau est trop élevé pour ce trainer." };
        }
      }

      return { canBattle: true };

    } catch (error) {
      console.error(`❌ [TrainerVision] Erreur vérification combat:`, error);
      return { canBattle: false, reason: "Erreur lors de la vérification." };
    }
  }

  /**
   * Récupère les dialogues d'un trainer
   */
  private getTrainerDialogue(trainerNpc: any, type: 'pre_battle' | 'defeat' | 'victory' | 'rematch' | 'busy'): string[] {
    const dialogues = trainerNpc.battleDialogueIds || {};
    
    switch (type) {
      case 'pre_battle':
        return dialogues.preBattle || ["Hé ! Tu veux te battre ?"];
      case 'defeat':
        return dialogues.defeat || ["Tu es vraiment fort ! Félicitations !"];
      case 'victory':
        return dialogues.victory || ["J'ai gagné ! Entraîne-toi plus !"];
      case 'rematch':
        return dialogues.rematch || ["Prêt pour un nouveau combat ?"];
      case 'busy':
        return dialogues.busy || ["Je suis occupé pour le moment."];
      default:
        return ["..."];
    }
  }

  /**
   * Lance le processus de combat avec un trainer
   */
  private async initiateTrainerBattle(client: Client, trainerId: string): Promise<void> {
    console.log(`⚔️ [TrainerBattle] Initiation combat avec ${trainerId}`);
    
    // Mettre à jour l'état du trainer
    await this.visionService.updateTrainerState(trainerId, 'battling', {
      targetPlayerId: client.sessionId,
      battleStartTime: Date.now()
    });

    // Démarrer le combat
    await this.handleTrainerBattleStart(client, { trainerId });
  }

  /**
   * Refuse un combat de trainer (si possible)
   */
  private async declineTrainerBattle(client: Client, trainerId: string): Promise<void> {
    console.log(`🚫 [TrainerBattle] Combat refusé avec ${trainerId}`);
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    // Vérifier si le refus est possible (detection automatique vs interaction manuelle)
    const trainerNpc = await this.getTrainerNpc(trainerId, player.currentZone);
    if (!trainerNpc) return;

    // Pour les détections automatiques, le joueur peut parfois s'échapper
    // Pour les interactions manuelles, le combat est généralement forcé
    
    // Débloquer le joueur
    this.room.unblockPlayerMovement(client.sessionId, 'trainer_interaction');
    this.room.unblockPlayerMovement(client.sessionId, 'trainer_detection');

    // Remettre le trainer en idle
    await this.visionService.updateTrainerState(trainerId, 'idle', {
      lastDeclinedBy: client.sessionId,
      lastDeclineTime: Date.now()
    });

    client.send("trainerBattleDeclined", {
      trainerId: trainerId,
      message: "Vous avez évité le combat !"
    });
  }

  /**
   * Continue le dialogue avec un trainer
   */
  private async continueTrainerDialogue(client: Client, trainerId: string): Promise<void> {
    // Implémentation future pour dialogues multi-parties
    console.log(`💬 [TrainerDialogue] Continue dialogue avec ${trainerId}`);
  }

  /**
   * Broadcast l'état d'un trainer à tous les joueurs de sa zone
   */
  private broadcastTrainerStateToZone(update: TrainerStateUpdate): void {
    // Trouver la zone du trainer
    // TODO: Améliorer avec un système de cache zone->trainers
    
    this.room.broadcast("trainerStateUpdate", {
      trainerId: update.trainerId,
      newState: update.newState,
      metadata: update.metadata,
      timestamp: Date.now()
    });
  }

  // ===================================================================
  // 📊 MÉTHODES D'ADMINISTRATION ET DEBUG
  // ===================================================================

  /**
   * Retourne les statistiques du système
   */
  getStats(): any {
    return {
      ...this.stats,
      activeBattles: Array.from(this.stats.activeBattles),
      lastDetections: Object.fromEntries(this.lastDetections),
      visionServiceStats: this.visionService.getStats()
    };
  }

  /**
   * Réinitialise les statistiques
   */
  resetStats(): void {
    this.stats = {
      totalDetections: 0,
      activeBattles: new Set<string>(),
      trainerInteractions: 0,
      detectionCooldowns: 0
    };
    this.lastDetections.clear();
    console.log('📊 [TrainerVisionHandlers] Stats réinitialisées');
  }

  /**
   * Debug d'un trainer spécifique
   */
  async debugTrainer(trainerId: string): Promise<any> {
    return {
      trainerData: await this.visionService.getTrainerDebugInfo(trainerId),
      handlerStats: this.getStats(),
      lastDetections: Array.from(this.lastDetections.entries())
        .filter(([playerId, data]) => data.trainerId === trainerId)
    };
  }

  /**
   * Force l'état d'un trainer (admin seulement)
   */
  async forceTrainerState(trainerId: string, newState: 'idle' | 'alerted' | 'chasing' | 'battling' | 'defeated' | 'returning'): Promise<boolean> {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('⚠️ [TrainerVision] forceTrainerState disponible en dev seulement');
      return false;
    }

    try {
      await this.visionService.updateTrainerState(trainerId, newState, {
        forcedBy: 'admin',
        forcedAt: Date.now()
      });
      
      console.log(`🔧 [TrainerVision] État forcé: ${trainerId} → ${newState}`);
      return true;
    } catch (error) {
      console.error(`❌ [TrainerVision] Erreur force état:`, error);
      return false;
    }
  }

  /**
   * Nettoie les ressources lors de la destruction
   */
  cleanup(): void {
    this.lastDetections.clear();
    this.stats.activeBattles.clear();
    
    // Nettoyer le service de vision
    if (this.visionService) {
      this.visionService.destroy();
    }
    
    console.log('🧹 [TrainerVisionHandlers] Ressources nettoyées');
  }
}
}
