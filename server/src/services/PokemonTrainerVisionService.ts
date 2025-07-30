// server/src/services/PokemonTrainerVisionService.ts

/**
 * 👁️ POKEMON TRAINER VISION SERVICE - SYSTÈME DE VISION DES DRESSEURS
 * 
 * Implémente le système de vision des dresseurs comme dans Pokémon Rouge/Bleu :
 * - Détection automatique des joueurs dans le champ de vision
 * - Poursuite et blocage du joueur
 * - Déclenchement de combats automatiques
 * - Système de rematch avec cooldowns
 * - Intégration complète avec l'IA pour dialogues intelligents
 * - États de trainer persistants (idle, alerted, chasing, defeated, etc.)
 * 
 * COMPATIBLE : Colyseus, système d'IA existant, NpcData étendu
 */

import { Room } from 'colyseus';
import { NpcData, type INpcData, type TrainerState, type TrainerRuntimeData } from '../models/NpcData';
import { TrainerTeam, type ITrainerTeam } from '../models/TrainerTeam';

// Import du système d'IA existant
import { getAINPCManager } from '../Intelligence/AINPCManager';
import { handleSmartNPCInteraction, getNPCIntelligenceConnector } from '../Intelligence/NPCSystem/NPCIntelligenceConnector';
import type { SmartNPCResponse } from '../Intelligence/NPCSystem/NPCIntelligenceConnector';
import { ActionType } from '../Intelligence/Core/ActionTypes';

// ===================================================================
// 🎯 INTERFACES ET TYPES
// ===================================================================

/**
 * Position d'un joueur avec métadonnées
 */
export interface PlayerPosition {
  playerId: string;
  username: string;
  x: number;
  y: number;
  level: number;
  isHidden?: boolean;        // Joueur utilise Pokéflute/objet invisible
  movementSpeed?: number;    // Vitesse actuelle
  lastMovementTime: number;  // Dernier timestamp de mouvement
}

/**
 * Événement de détection d'un trainer
 */
export interface TrainerDetectionEvent {
  trainerId: string;
  trainerName: string;
  playerId: string;
  playerName: string;
  detectionType: 'sight' | 'collision' | 'proximity';
  distance: number;
  timestamp: number;
  trainerState: TrainerState;
  canBattle: boolean;
  battleCooldownRemaining?: number; // millisecondes
}

/**
 * Résultat d'une interaction de dresseur
 */
export interface TrainerInteractionResult {
  success: boolean;
  interactionType: 'detection' | 'battle_challenge' | 'rematch' | 'dialogue' | 'defeat_dialogue';
  
  // Données de l'interaction
  dialogue?: SmartNPCResponse;
  battleConfig?: {
    teamId: string;
    battleType: 'single' | 'double' | 'multi';
    allowItems: boolean;
    allowSwitching: boolean;
    rewards: any;
  };
  
  // Actions pour le client
  clientActions: {
    showDialogue?: boolean;
    startBattle?: boolean;
    blockMovement?: boolean;
    playSound?: string;
    showEmote?: string;
    moveTrainer?: { x: number; y: number };
  };
  
  // Métadonnées
  metadata: {
    trainerStateChanged: boolean;
    newTrainerState?: TrainerState;
    isFirstEncounter: boolean;
    isRematch: boolean;
    aiAnalysisUsed: boolean;
  };
}

/**
 * Configuration du service de vision
 */
export interface TrainerVisionConfig {
  // Performance
  updateIntervalMs: number;           // Fréquence de mise à jour (ms)
  maxTrainersPerUpdate: number;       // Max trainers traités par update
  visionCacheMs: number;             // Cache des calculs de vision
  
  // Comportement
  enableProactiveDetection: boolean;  // Détection proactive vs réactive
  enableSmartDialogues: boolean;      // Utiliser l'IA pour dialogues
  enableRematchSystem: boolean;       // Système de rematch
  defaultRematchCooldownHours: number; // Cooldown par défaut
  
  // Debugging
  enableVisionDebug: boolean;         // Logs de debug
  enableDetectionLogs: boolean;       // Logs des détections
}

// ===================================================================
// 🔥 CLASSE PRINCIPALE - TRAINER VISION SERVICE
// ===================================================================

export class PokemonTrainerVisionService {
  private room: Room;
  private config: TrainerVisionConfig;
  private aiManager = getAINPCManager();
  private aiConnector = getNPCIntelligenceConnector();
  
  // Cache et state management
  private trainersCache: Map<string, INpcData> = new Map(); // zone_trainerId -> trainer
  private playerPositions: Map<string, PlayerPosition> = new Map(); // playerId -> position
  private detectionCooldowns: Map<string, number> = new Map(); // trainerId_playerId -> timestamp
  private visionCalculationCache: Map<string, { result: boolean; expires: number }> = new Map();
  
  // Timers et intervals
  private visionUpdateTimer: NodeJS.Timeout | null = null;
  private cacheCleanupTimer: NodeJS.Timeout | null = null;
  
  // Statistiques pour monitoring
  private stats = {
    totalDetections: 0,
    totalBattles: 0,
    totalRematches: 0,
    averageDetectionTime: 0,
    trainersTracked: 0,
    playersTracked: 0
  };

  constructor(room: Room, config?: Partial<TrainerVisionConfig>) {
    this.room = room;
    this.config = {
      updateIntervalMs: 500,              // 2 FPS pour vision
      maxTrainersPerUpdate: 10,
      visionCacheMs: 2000,               // Cache 2 secondes
      enableProactiveDetection: true,
      enableSmartDialogues: true,
      enableRematchSystem: true,
      defaultRematchCooldownHours: 24,   // 24h pour rematch
      enableVisionDebug: process.env.NODE_ENV === 'development',
      enableDetectionLogs: true,
      ...config
    };

    this.log('info', '👁️ PokemonTrainerVisionService initialisé', {
      roomId: room.roomId,
      config: this.config
    });

    this.startVisionSystem();
    this.startMaintenanceTasks();
  }

  // ===================================================================
  // 🎯 MÉTHODES PRINCIPALES DU SERVICE
  // ===================================================================

  /**
   * Met à jour la position d'un joueur
   */
  updatePlayerPosition(playerId: string, position: Omit<PlayerPosition, 'playerId'>): void {
    const playerPos: PlayerPosition = {
      playerId,
      ...position,
      lastMovementTime: Date.now()
    };
    
    this.playerPositions.set(playerId, playerPos);
    this.stats.playersTracked = this.playerPositions.size;
    
    // Déclencher vérification immédiate si mouvement significatif
    if (this.config.enableProactiveDetection) {
      this.checkTrainerDetectionsForPlayer(playerId);
    }
  }

  /**
   * Supprime un joueur du tracking
   */
  removePlayer(playerId: string): void {
    this.playerPositions.delete(playerId);
    
    // Nettoyer les cooldowns de ce joueur
    for (const [key, _] of this.detectionCooldowns) {
      if (key.includes(playerId)) {
        this.detectionCooldowns.delete(key);
      }
    }
    
    this.stats.playersTracked = this.playerPositions.size;
    this.log('debug', `Joueur ${playerId} supprimé du tracking`);
  }

  /**
   * Force la recharge des trainers d'une zone
   */
  async reloadTrainersForZone(zoneName: string): Promise<void> {
    try {
      const trainers = await NpcData.findTrainersInZone(zoneName);
      
      // Nettoyer l'ancien cache pour cette zone
      for (const [key, _] of this.trainersCache) {
        if (key.startsWith(`${zoneName}_`)) {
          this.trainersCache.delete(key);
        }
      }
      
      // Charger les nouveaux trainers
      for (const trainer of trainers) {
        const key = `${zoneName}_${trainer.npcId}`;
        this.trainersCache.set(key, trainer);
        
        // Initialiser runtime si nécessaire
        if (!trainer.trainerRuntime) {
          trainer.initializeTrainerRuntime();
          await trainer.save();
        }
      }
      
      this.stats.trainersTracked = this.trainersCache.size;
      this.log('info', `${trainers.length} trainers rechargés pour zone ${zoneName}`);

    } catch (error) {
      this.log('error', `Erreur rechargement trainers zone ${zoneName}:`, error);
    }
  }

  /**
   * Gère l'interaction directe avec un trainer (clic/collision)
   */
  async handleDirectTrainerInteraction(
    playerId: string, 
    trainerId: string, 
    interactionType: 'click' | 'collision' = 'click'
  ): Promise<TrainerInteractionResult> {
    const startTime = Date.now();
    
    try {
      const trainer = this.getTrainerById(trainerId);
      const player = this.playerPositions.get(playerId);
      
      if (!trainer || !player) {
        return this.createErrorResult('Trainer ou joueur non trouvé');
      }

      this.log('info', `Interaction directe: ${player.username} -> ${trainer.name}`, {
        type: interactionType,
        trainerState: trainer.trainerRuntime?.currentState
      });

      // Déterminer le type d'interaction selon l'état du trainer
      const currentState = trainer.trainerRuntime?.currentState || 'idle';
      
      let result: TrainerInteractionResult;
      
      switch (currentState) {
        case 'idle':
        case 'alerted':
          result = await this.handleNewTrainerEncounter(trainer, player);
          break;
          
        case 'defeated':
          result = await this.handleDefeatedTrainerInteraction(trainer, player);
          break;
          
        default:
          result = await this.handleGenericTrainerDialogue(trainer, player);
          break;
      }

      // Tracking pour l'IA
      if (this.config.enableSmartDialogues) {
        this.aiManager.trackPlayerAction(
          playerId,
          ActionType.NPC_TALK,
          {
            npcId: trainer.npcId,
            interactionType,
            trainerState: currentState,
            battleTriggered: result.clientActions.startBattle
          },
          {
            location: { map: this.room.roomId, x: player.x, y: player.y }
          }
        );
      }

      this.updateDetectionStats(Date.now() - startTime);
      return result;

    } catch (error) {
      this.log('error', `Erreur interaction trainer ${trainerId}:`, error);
      return this.createErrorResult('Erreur serveur');
    }
  }

  /**
   * Force un état spécifique pour un trainer (admin/debug)
   */
  async setTrainerState(trainerId: string, newState: TrainerState): Promise<boolean> {
    try {
      const trainer = this.getTrainerById(trainerId);
      if (!trainer) return false;

      const oldState = trainer.trainerRuntime?.currentState;
      trainer.updateTrainerState(newState);
      
      // Sauvegarder si changement persistant
      if (['defeated', 'idle'].includes(newState)) {
        await trainer.save();
      }
      
      this.log('info', `État trainer ${trainer.name} changé: ${oldState} -> ${newState}`);
      return true;

    } catch (error) {
      this.log('error', `Erreur changement état trainer ${trainerId}:`, error);
      return false;
    }
  }

  // ===================================================================
  // 🔍 SYSTÈME DE DÉTECTION ET VISION
  // ===================================================================

  /**
   * Démarre le système de vision automatique
   */
  private startVisionSystem(): void {
    this.visionUpdateTimer = setInterval(() => {
      this.performVisionUpdate();
    }, this.config.updateIntervalMs);

    this.log('info', `Système de vision démarré (${this.config.updateIntervalMs}ms)`);
  }

  /**
   * Effectue une mise à jour complète de la vision
   */
  private async performVisionUpdate(): Promise<void> {
    if (this.playerPositions.size === 0 || this.trainersCache.size === 0) {
      return;
    }

    try {
      // Limiter le nombre de trainers traités par update pour performance
      const trainersToCheck = Array.from(this.trainersCache.values())
        .filter(trainer => this.shouldCheckTrainerVision(trainer))
        .slice(0, this.config.maxTrainersPerUpdate);

      for (const trainer of trainersToCheck) {
        await this.checkTrainerDetections(trainer);
      }

    } catch (error) {
      this.log('error', 'Erreur mise à jour vision:', error);
    }
  }

  /**
   * Vérifie si un trainer doit être analysé pour la vision
   */
  private shouldCheckTrainerVision(trainer: INpcData): boolean {
    // Skip si pas de config de vision
    if (!trainer.visionConfig) return false;
    
    // Skip si trainer occupé
    const state = trainer.trainerRuntime?.currentState;
    if (['battling', 'returning'].includes(state || '')) return false;
    
    // Skip si cooldown de détection actif
    if (trainer.visionConfig.detectionCooldown && trainer.trainerRuntime?.lastDetectionTime) {
      const cooldownMs = trainer.visionConfig.detectionCooldown * 1000;
      const timeSinceDetection = Date.now() - trainer.trainerRuntime.lastDetectionTime;
      if (timeSinceDetection < cooldownMs) return false;
    }
    
    return true;
  }

  /**
   * Vérifie les détections pour un trainer spécifique
   */
  private async checkTrainerDetections(trainer: INpcData): Promise<void> {
    for (const [playerId, playerPos] of this.playerPositions) {
      
      // Skip si joueur caché et trainer ne peut pas voir les joueurs cachés
      if (playerPos.isHidden && !trainer.visionConfig?.canSeeHiddenPlayers) {
        continue;
      }
      
      // Skip si cooldown actif pour cette combinaison
      if (this.isDetectionOnCooldown(trainer.npcId.toString(), playerId)) {
        continue;
      }
      
      // Vérifier la vision avec cache
      const isInVision = this.isPlayerInTrainerVision(trainer, playerPos);
      
      if (isInVision) {
        await this.triggerTrainerDetection(trainer, playerPos);
      }
    }
  }

  /**
   * Vérifie les détections pour un joueur spécifique (optimisé)
   */
  private async checkTrainerDetectionsForPlayer(playerId: string): Promise<void> {
    const playerPos = this.playerPositions.get(playerId);
    if (!playerPos) return;

    // Obtenir trainers proches pour optimiser
    const nearbyTrainers = Array.from(this.trainersCache.values()).filter(trainer => {
      if (!trainer.visionConfig) return false;
      
      const distance = this.calculateDistance(trainer.position, playerPos);
      return distance <= trainer.visionConfig.chaseRange * 1.2; // Buffer de 20%
    });

    for (const trainer of nearbyTrainers) {
      if (!this.shouldCheckTrainerVision(trainer)) continue;
      if (this.isDetectionOnCooldown(trainer.npcId.toString(), playerId)) continue;

      const isInVision = this.isPlayerInTrainerVision(trainer, playerPos);
      if (isInVision) {
        await this.triggerTrainerDetection(trainer, playerPos);
      }
    }
  }

  /**
   * Vérifie si un joueur est dans la vision d'un trainer (avec cache)
   */
  private isPlayerInTrainerVision(trainer: INpcData, playerPos: PlayerPosition): boolean {
    const cacheKey = `${trainer.npcId}_${playerPos.playerId}_${playerPos.lastMovementTime}`;
    
    // Vérifier cache
    const cached = this.visionCalculationCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return cached.result;
    }

    // Calculer vision
    const result = trainer.isInSight(playerPos);
    
    // Mettre en cache
    this.visionCalculationCache.set(cacheKey, {
      result,
      expires: Date.now() + this.config.visionCacheMs
    });

    return result;
  }

  /**
   * Déclenche une détection de trainer
   */
  private async triggerTrainerDetection(trainer: INpcData, playerPos: PlayerPosition): Promise<void> {
    try {
      const distance = this.calculateDistance(trainer.position, playerPos);
      
      const detectionEvent: TrainerDetectionEvent = {
        trainerId: trainer.npcId.toString(),
        trainerName: trainer.name,
        playerId: playerPos.playerId,
        playerName: playerPos.username,
        detectionType: 'sight',
        distance,
        timestamp: Date.now(),
        trainerState: trainer.trainerRuntime?.currentState || 'idle',
        canBattle: trainer.canBattlePlayer(playerPos.level)
      };

      this.log('detection', `🔍 DÉTECTION: ${trainer.name} voit ${playerPos.username}`, detectionEvent);

      // Mettre à jour état du trainer
      if (detectionEvent.canBattle && trainer.trainerRuntime?.currentState === 'idle') {
        trainer.updateTrainerState('alerted');
        
        // Mettre à jour timestamp de détection
        if (trainer.trainerRuntime) {
          trainer.trainerRuntime.lastDetectionTime = Date.now();
          trainer.trainerRuntime.targetPlayerId = playerPos.playerId;
        }
      }

      // Déclencher interaction automatique
      const interactionResult = await this.handleNewTrainerEncounter(trainer, playerPos);

      // Envoyer événements au client
      this.room.broadcast('trainerDetection', {
        event: detectionEvent,
        interaction: interactionResult
      });

      // Appliquer cooldown
      this.setDetectionCooldown(trainer.npcId.toString(), playerPos.playerId);
      
      this.stats.totalDetections++;

    } catch (error) {
      this.log('error', `Erreur déclenchement détection:`, error);
    }
  }

  // ===================================================================
  // 🎭 GESTION DES INTERACTIONS SPÉCIALISÉES
  // ===================================================================

  /**
   * Gère une nouvelle rencontre avec un trainer
   */
  private async handleNewTrainerEncounter(
    trainer: INpcData, 
    player: PlayerPosition
  ): Promise<TrainerInteractionResult> {
    
    // Vérifier si combat possible
    const canBattle = trainer.canBattlePlayer(player.level);
    
    if (!canBattle) {
      return this.handleGenericTrainerDialogue(trainer, player);
    }

    // Générer dialogue intelligent de défi
    let dialogue: SmartNPCResponse | undefined;
    if (this.config.enableSmartDialogues) {
      try {
        dialogue = await this.aiConnector.handleIntelligentInteraction(
          player.playerId,
          trainer.npcId.toString(),
          'battle_challenge',
          {
            playerAction: 'encounter',
            location: { map: this.room.roomId, x: player.x, y: player.y },
            sessionData: { level: player.level }
          }
        );
      } catch (error) {
        this.log('warn', 'Fallback dialogue IA échoué:', error);
      }
    }

    // Dialogue de fallback si IA indisponible
    if (!dialogue || !dialogue.success) {
      dialogue = this.generateFallbackBattleDialogue(trainer, player);
    }

    // Préparer config de combat
    const battleConfig = trainer.battleConfig ? {
      teamId: trainer.battleConfig.teamId!,
      battleType: trainer.battleConfig.battleType || 'single',
      allowItems: trainer.battleConfig.allowItems ?? true,
      allowSwitching: trainer.battleConfig.allowSwitching ?? true,
      rewards: trainer.battleConfig.rewards
    } : undefined;

    // Mettre à jour état trainer
    trainer.updateTrainerState('alerted');
    
    return {
      success: true,
      interactionType: 'battle_challenge',
      dialogue,
      battleConfig,
      clientActions: {
        showDialogue: true,
        startBattle: true,
        blockMovement: true,
        playSound: trainer.visionConfig?.alertSound || 'trainer_spotted',
        showEmote: '!'
      },
      metadata: {
        trainerStateChanged: true,
        newTrainerState: 'alerted',
        isFirstEncounter: !trainer.trainerRuntime?.defeatedBy.includes(player.playerId),
        isRematch: trainer.trainerRuntime?.defeatedBy.includes(player.playerId) || false,
        aiAnalysisUsed: dialogue.tracking?.playerAnalysisUsed || false
      }
    };
  }

  /**
   * Gère l'interaction avec un trainer vaincu
   */
  private async handleDefeatedTrainerInteraction(
    trainer: INpcData, 
    player: PlayerPosition
  ): Promise<TrainerInteractionResult> {
    
    const wasDefeatedByThisPlayer = trainer.trainerRuntime?.defeatedBy.includes(player.playerId);
    
    // Vérifier possibilité de rematch
    const canRematch = this.config.enableRematchSystem && 
                      this.canTrainerRematch(trainer) &&
                      trainer.canBattlePlayer(player.level);

    let interactionType: TrainerInteractionResult['interactionType'] = 'defeat_dialogue';
    
    if (canRematch) {
      interactionType = 'rematch';
    }

    // Dialogue intelligent selon le contexte
    let dialogue: SmartNPCResponse | undefined;
    if (this.config.enableSmartDialogues) {
      try {
        dialogue = await this.aiConnector.handleIntelligentInteraction(
          player.playerId,
          trainer.npcId.toString(),
          canRematch ? 'rematch_offer' : 'post_defeat_chat',
          {
            playerAction: canRematch ? 'rematch_request' : 'casual_talk',
            location: { map: this.room.roomId, x: player.x, y: player.y },
            sessionData: { 
              level: player.level,
              hasDefeatedBefore: wasDefeatedByThisPlayer,
              canRematch 
            }
          }
        );
      } catch (error) {
        this.log('warn', 'Dialogue IA post-défaite échoué:', error);
      }
    }

    // Fallback dialogue
    if (!dialogue || !dialogue.success) {
      dialogue = this.generateFallbackDefeatedDialogue(trainer, player, canRematch, wasDefeatedByThisPlayer);
    }

    const clientActions: TrainerInteractionResult['clientActions'] = {
      showDialogue: true,
      blockMovement: false
    };

    if (canRematch) {
      clientActions.startBattle = true;
      clientActions.playSound = 'trainer_rematch';
      
      // Réinitialiser cooldown de rematch
      if (trainer.trainerRuntime) {
        trainer.trainerRuntime.lastBattleTime = Date.now();
      }
      
      trainer.updateTrainerState('alerted');
      this.stats.totalRematches++;
    }

    return {
      success: true,
      interactionType,
      dialogue,
      battleConfig: canRematch ? {
        teamId: trainer.battleConfig?.teamId!,
        battleType: trainer.battleConfig?.battleType || 'single',
        allowItems: trainer.battleConfig?.allowItems ?? true,
        allowSwitching: trainer.battleConfig?.allowSwitching ?? true,
        rewards: trainer.battleConfig?.rewards
      } : undefined,
      clientActions,
      metadata: {
        trainerStateChanged: canRematch,
        newTrainerState: canRematch ? 'alerted' : 'defeated',
        isFirstEncounter: false,
        isRematch: canRematch,
        aiAnalysisUsed: dialogue.tracking?.playerAnalysisUsed || false
      }
    };
  }

  /**
   * Gère un dialogue générique avec trainer
   */
  private async handleGenericTrainerDialogue(
    trainer: INpcData, 
    player: PlayerPosition
  ): Promise<TrainerInteractionResult> {
    
    let dialogue: SmartNPCResponse | undefined;
    
    if (this.config.enableSmartDialogues) {
      try {
        dialogue = await this.aiConnector.handleIntelligentInteraction(
          player.playerId,
          trainer.npcId.toString(),
          'dialogue',
          {
            playerAction: 'talk',
            location: { map: this.room.roomId, x: player.x, y: player.y },
            sessionData: { level: player.level }
          }
        );
      } catch (error) {
        this.log('warn', 'Dialogue IA générique échoué:', error);
      }
    }

    // Fallback
    if (!dialogue || !dialogue.success) {
      dialogue = this.generateFallbackGenericDialogue(trainer, player);
    }

    return {
      success: true,
      interactionType: 'dialogue',
      dialogue,
      clientActions: {
        showDialogue: true,
        blockMovement: false
      },
      metadata: {
        trainerStateChanged: false,
        isFirstEncounter: false,
        isRematch: false,
        aiAnalysisUsed: dialogue.tracking?.playerAnalysisUsed || false
      }
    };
  }

  // ===================================================================
  // 🎨 GÉNÉRATEURS DE DIALOGUES FALLBACK
  // ===================================================================

  /**
   * Dialogue de défi de combat par défaut
   */
  private generateFallbackBattleDialogue(trainer: INpcData, player: PlayerPosition): SmartNPCResponse {
    const battleMessages = [
      `Hey! I've been waiting for a trainer like you!`,
      `You look strong! Let's have a battle!`,
      `I challenge you to a Pokémon battle!`,
      `Let's see what you're made of, trainer!`
    ];

    const message = battleMessages[Math.floor(Math.random() * battleMessages.length)];

    return {
      npcId: trainer.npcId.toString(),
      success: true,
      dialogue: {
        message,
        emotion: 'excited',
        speaker: trainer.name
      },
      actions: [
        { id: 'accept_battle', label: 'Accept Battle', type: 'custom', data: { action: 'battle' } },
        { id: 'decline_battle', label: 'Maybe later', type: 'dialogue', data: { action: 'decline' } }
      ],
      followUpQuestions: [],
      metadata: {
        personalizedLevel: 0.2,
        relationshipLevel: 'stranger',
        analysisConfidence: 0.5,
        isProactiveHelp: false,
        triggerReasons: ['trainer_encounter']
      },
      tracking: {
        interactionId: `fallback_battle_${trainer.npcId}_${Date.now()}`,
        timestamp: Date.now(),
        playerAnalysisUsed: false,
        patternsDetected: []
      }
    };
  }

  /**
   * Dialogue post-défaite par défaut
   */
  private generateFallbackDefeatedDialogue(
    trainer: INpcData, 
    player: PlayerPosition, 
    canRematch: boolean,
    wasDefeatedByThisPlayer: boolean
  ): SmartNPCResponse {
    
    let message: string;
    let actions: SmartNPCResponse['actions'] = [];

    if (canRematch) {
      if (wasDefeatedByThisPlayer) {
        message = `You beat me before, but I've been training! Want a rematch?`;
        actions = [
          { id: 'accept_rematch', label: 'Yes, let\'s battle!', type: 'custom', data: { action: 'rematch' } },
          { id: 'decline_rematch', label: 'Not now', type: 'dialogue', data: { action: 'decline' } }
        ];
      } else {
        message = `I heard you're a strong trainer. I'd like to test my skills against you!`;
        actions = [
          { id: 'accept_challenge', label: 'I accept your challenge', type: 'custom', data: { action: 'battle' } },
          { id: 'decline_challenge', label: 'Maybe another time', type: 'dialogue', data: { action: 'decline' } }
        ];
      }
    } else {
      if (wasDefeatedByThisPlayer) {
        message = `You're really strong! That was a great battle.`;
      } else {
        message = `I may have lost recently, but I'll get stronger!`;
      }
      actions = [
        { id: 'continue_chat', label: 'Keep talking', type: 'dialogue', data: {} }
      ];
    }

    return {
      npcId: trainer.npcId.toString(),
      success: true,
      dialogue: {
        message,
        emotion: canRematch ? 'encouraging' : 'friendly',
        speaker: trainer.name
      },
      actions,
      followUpQuestions: canRematch ? [] : [
        "How do you train your Pokémon?",
        "Any tips for a fellow trainer?"
      ],
      metadata: {
        personalizedLevel: wasDefeatedByThisPlayer ? 0.6 : 0.3,
        relationshipLevel: wasDefeatedByThisPlayer ? 'acquaintance' : 'stranger',
        analysisConfidence: 0.5,
        isProactiveHelp: false,
        triggerReasons: canRematch ? ['rematch_available'] : ['post_defeat']
      },
      tracking: {
        interactionId: `fallback_defeated_${trainer.npcId}_${Date.now()}`,
        timestamp: Date.now(),
        playerAnalysisUsed: false,
        patternsDetected: []
      }
    };
  }

  /**
   * Dialogue générique par défaut
   */
  private generateFallbackGenericDialogue(trainer: INpcData, player: PlayerPosition): SmartNPCResponse {
    const genericMessages = [
      `Training is the key to becoming a strong trainer!`,
      `Have you been to the Pokémon Center recently?`,
      `There are lots of strong Pokémon in this area.`,
      `Keep training and you'll become a great trainer!`
    ];

    const message = genericMessages[Math.floor(Math.random() * genericMessages.length)];

    return {
      npcId: trainer.npcId.toString(),
      success: true,
      dialogue: {
        message,
        emotion: 'friendly',
        speaker: trainer.name
      },
      actions: [
        { id: 'continue_conversation', label: 'Thanks for the advice', type: 'dialogue', data: {} }
      ],
      followUpQuestions: [
        "What's your favorite Pokémon type?",
        "Any training tips?"
      ],
      metadata: {
        personalizedLevel: 0.1,
        relationshipLevel: 'stranger',
        analysisConfidence: 0.3,
        isProactiveHelp: false,
        triggerReasons: ['casual_talk']
      },
      tracking: {
        interactionId: `fallback_generic_${trainer.npcId}_${Date.now()}`,
        timestamp: Date.now(),
        playerAnalysisUsed: false,
        patternsDetected: []
      }
    };
  }

  // ===================================================================
  // 🛠️ MÉTHODES UTILITAIRES
  // ===================================================================

  /**
   * Récupère un trainer par ID depuis le cache
   */
  private getTrainerById(trainerId: string): INpcData | undefined {
    // Chercher dans le cache par npcId
    for (const trainer of this.trainersCache.values()) {
      if (trainer.npcId.toString() === trainerId) {
        return trainer;
      }
    }
    return undefined;
  }

  /**
   * Calcule la distance entre deux points
   */
  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Vérifie si une détection est en cooldown
   */
  private isDetectionOnCooldown(trainerId: string, playerId: string): boolean {
    const key = `${trainerId}_${playerId}`;
    const cooldownEnd = this.detectionCooldowns.get(key);
    return cooldownEnd ? Date.now() < cooldownEnd : false;
  }

  /**
   * Applique un cooldown de détection
   */
  private setDetectionCooldown(trainerId: string, playerId: string, durationMs: number = 10000): void {
    const key = `${trainerId}_${playerId}`;
    this.detectionCooldowns.set(key, Date.now() + durationMs);
  }

  /**
   * Vérifie si un trainer peut faire un rematch
   */
  private canTrainerRematch(trainer: INpcData): boolean {
    if (!trainer.trainerRuntime?.lastBattleTime) return true;
    
    const cooldownHours = trainer.battleConfig?.battleConditions?.cooldownMinutes ? 
      trainer.battleConfig.battleConditions.cooldownMinutes / 60 :
      this.config.defaultRematchCooldownHours;
    
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const timeSinceLastBattle = Date.now() - trainer.trainerRuntime.lastBattleTime;
    
    return timeSinceLastBattle >= cooldownMs;
  }

  /**
   * Met à jour les statistiques de détection
   */
  private updateDetectionStats(detectionTime: number): void {
    this.stats.averageDetectionTime = (this.stats.averageDetectionTime * 0.9) + (detectionTime * 0.1);
  }

  /**
   * Crée un résultat d'erreur
   */
  private createErrorResult(message: string): TrainerInteractionResult {
    return {
      success: false,
      interactionType: 'dialogue',
      clientActions: {},
      metadata: {
        trainerStateChanged: false,
        isFirstEncounter: false,
        isRematch: false,
        aiAnalysisUsed: false
      }
    };
  }

  // ===================================================================
  // 🧹 MAINTENANCE ET MONITORING
  // ===================================================================

  /**
   * Démarre les tâches de maintenance
   */
  private startMaintenanceTasks(): void {
    // Nettoyage du cache toutes les 2 minutes
    this.cacheCleanupTimer = setInterval(() => {
      this.cleanupCaches();
    }, 2 * 60 * 1000);

    this.log('info', '🧹 Tâches de maintenance démarrées');
  }

  /**
   * Nettoie les caches expirés
   */
  private cleanupCaches(): void {
    const now = Date.now();
    let cleanedVision = 0;
    let cleanedCooldowns = 0;

    // Nettoyer cache de vision
    for (const [key, cache] of this.visionCalculationCache) {
      if (now >= cache.expires) {
        this.visionCalculationCache.delete(key);
        cleanedVision++;
      }
    }

    // Nettoyer cooldowns expirés
    for (const [key, expiry] of this.detectionCooldowns) {
      if (now >= expiry) {
        this.detectionCooldowns.delete(key);
        cleanedCooldowns++;
      }
    }

    if (cleanedVision > 0 || cleanedCooldowns > 0) {
      this.log('debug', `Cache nettoyé: ${cleanedVision} vision, ${cleanedCooldowns} cooldowns`);
    }
  }

  /**
   * Retourne les statistiques du service
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: {
        trainers: this.trainersCache.size,
        players: this.playerPositions.size,
        visionCache: this.visionCalculationCache.size,
        cooldowns: this.detectionCooldowns.size
      },
      uptime: Date.now() // TODO: Calculer vraie uptime
    };
  }

  /**
   * Logging contextualisé
   */
  private log(level: 'info' | 'warn' | 'error' | 'debug' | 'detection', message: string, data?: any): void {
    if (!this.config.enableVisionDebug && level === 'debug') return;
    if (!this.config.enableDetectionLogs && level === 'detection') return;

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [TrainerVision] ${message}`;

    switch (level) {
      case 'error':
        console.error(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'detection':
      case 'debug':
        console.log(`[${level.toUpperCase()}] ${logMessage}`, data || '');
        break;
      default:
        console.log(logMessage, data || '');
    }
  }

  /**
   * Arrête le service et nettoie les ressources
   */
  destroy(): void {
    if (this.visionUpdateTimer) {
      clearInterval(this.visionUpdateTimer);
    }
    
    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
    }

    this.trainersCache.clear();
    this.playerPositions.clear();
    this.detectionCooldowns.clear();
    this.visionCalculationCache.clear();

    this.log('info', '👁️ PokemonTrainerVisionService arrêté');
  }
}

// ===================================================================
// 🏭 EXPORTS ET FONCTIONS UTILITAIRES
// ===================================================================

/**
 * Factory pour créer le service avec configuration par défaut
 */
export function createTrainerVisionService(
  room: Room, 
  config?: Partial<TrainerVisionConfig>
): PokemonTrainerVisionService {
  return new PokemonTrainerVisionService(room, config);
}

/**
 * Configuration recommandée pour différents types de serveurs
 */
export const TRAINER_VISION_PRESETS = {
  // Serveur haute performance
  performance: {
    updateIntervalMs: 1000,
    maxTrainersPerUpdate: 5,
    visionCacheMs: 3000,
    enableVisionDebug: false,
    enableDetectionLogs: false
  },
  
  // Serveur de développement
  development: {
    updateIntervalMs: 500,
    maxTrainersPerUpdate: 15,
    visionCacheMs: 1000,
    enableVisionDebug: true,
    enableDetectionLogs: true
  },
  
  // Serveur de production
  production: {
    updateIntervalMs: 750,
    maxTrainersPerUpdate: 8,
    visionCacheMs: 2000,
    enableVisionDebug: false,
    enableDetectionLogs: true
  }
} as const;

export default PokemonTrainerVisionService;
