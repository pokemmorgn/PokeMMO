// server/src/services/PokemonTrainerVisionService.ts
// Système de vision exact des dresseurs Pokémon Rouge/Bleu

import { INpcData } from "../models/NpcData";
import { Player } from "../schema/PokeWorldState";

// ===== INTERFACES =====

export interface TrainerDetectionResult {
  detected: boolean;
  trainer?: INpcData;
  detectionType: 'line_of_sight' | 'none';
  distanceInTiles: number;
  blockedByObstacle?: boolean;
  obstacleType?: 'wall' | 'tree' | 'water' | 'npc' | 'object';
}

export interface TrainerMovementCommand {
  trainerId: number;
  action: 'move_towards_player' | 'start_battle' | 'return_idle';
  targetPosition?: { x: number; y: number };
  moveSpeed: number;
  exclamationEffect: boolean;
  battleDialogue?: string;
}

export interface MapObstacle {
  x: number;
  y: number;
  type: 'wall' | 'tree' | 'water' | 'npc' | 'object';
  blocks: boolean;
}

// Configuration du service (fidèle à l'original)
export interface PokemonTrainerVisionConfig {
  tileSize: number;                    // Taille d'une case (32px généralement)
  maxVisionRange: number;              // Portée max en cases (4-6 comme l'original)
  exclamationDuration: number;        // Durée "!" en ms (1500ms original)
  trainerMoveSpeed: number;            // Vitesse déplacement dresseur (plus lent que joueur)
  battleTriggerDistance: number;       // Distance pour déclencher combat (1 case)
  enableObstacleDetection: boolean;    // Activer détection obstacles
  debugMode: boolean;
}

// États exactes du dresseur (comme l'original)
export type PokemonTrainerState = 
  | 'idle'              // Attendre, regarder dans sa direction
  | 'detected'          // "!" affiché, se prépare à bouger
  | 'approaching'       // Se déplace vers le joueur
  | 'battling'          // En combat
  | 'defeated'          // Battu, ne bougera plus jamais
  | 'disabled';         // Désactivé temporairement

// ===== SERVICE PRINCIPAL =====

export class PokemonTrainerVisionService {
  
  private config: PokemonTrainerVisionConfig;
  private mapObstacles: Map<string, MapObstacle[]> = new Map(); // obstacles par zone
  private trainerStates: Map<number, PokemonTrainerState> = new Map();
  
  constructor(config?: Partial<PokemonTrainerVisionConfig>) {
    this.config = {
      tileSize: 32,
      maxVisionRange: 5,              // 5 cases comme l'original
      exclamationDuration: 1500,      // 1.5 secondes
      trainerMoveSpeed: 1.2,           // Plus lent que le joueur (1.5)
      battleTriggerDistance: 1,        // 1 case pour déclencher
      enableObstacleDetection: true,
      debugMode: process.env.NODE_ENV === 'development',
      ...config
    };
    
    this.log('info', '👁️ Service Vision Pokémon initialisé (système Rouge/Bleu)', {
      visionRange: this.config.maxVisionRange,
      tileSize: this.config.tileSize,
      obstacleDetection: this.config.enableObstacleDetection
    });
  }

  // === MÉTHODE PRINCIPALE DE DÉTECTION ===

  /**
   * Vérifie la détection de tous les dresseurs pour un joueur
   * (Appelé à chaque mouvement du joueur)
   */
  checkTrainerDetection(
    player: Player,
    trainersInZone: INpcData[]
  ): TrainerDetectionResult[] {
    
    const results: TrainerDetectionResult[] = [];
    const playerTilePos = this.pixelsToTiles(player.x, player.y);
    
    for (const trainer of trainersInZone) {
      // Ignorer si pas un vrai dresseur ou déjà battu
      if (!this.isActiveTrainer(trainer)) {
        continue;
      }
      
      const detection = this.checkSingleTrainerDetection(player, trainer);
      results.push(detection);
      
      // Si détection, mettre à jour l'état
      if (detection.detected && this.getTrainerState(trainer.npcId) === 'idle') {
        this.setTrainerState(trainer.npcId, 'detected');
        this.log('info', `🎯 [Détection] Dresseur ${trainer.npcId} détecte ${player.name}`, {
          distance: detection.distanceInTiles,
          trainerPos: this.pixelsToTiles(trainer.position.x, trainer.position.y),
          playerPos: playerTilePos
        });
      }
    }
    
    return results;
  }

  /**
   * Vérifie la détection d'un seul dresseur (logique Rouge/Bleu exacte)
   */
  private checkSingleTrainerDetection(
    player: Player,
    trainer: INpcData
  ): TrainerDetectionResult {
    
    // Positions en cases
    const trainerTilePos = this.pixelsToTiles(trainer.position.x, trainer.position.y);
    const playerTilePos = this.pixelsToTiles(player.x, player.y);
    
    // Vérifier si dans la ligne de vue directionnelle
    const lineOfSight = this.checkLineOfSight(
      trainerTilePos,
      playerTilePos,
      trainer.direction
    );
    
    if (!lineOfSight.inLine) {
      return {
        detected: false,
        detectionType: 'none',
        distanceInTiles: lineOfSight.distance
      };
    }
    
    // Vérifier obstacles si activé
    if (this.config.enableObstacleDetection) {
      const obstacleCheck = this.checkObstaclesBetween(
        trainerTilePos,
        playerTilePos,
        player.currentZone
      );
      
      if (obstacleCheck.blocked) {
        return {
          detected: false,
          detectionType: 'none',
          distanceInTiles: lineOfSight.distance,
          blockedByObstacle: true,
          obstacleType: obstacleCheck.obstacleType as 'wall' | 'tree' | 'water' | 'npc' | 'object'
        };
      }
    }
    
    // DÉTECTION RÉUSSIE !
    return {
      detected: true,
      trainer: trainer,
      detectionType: 'line_of_sight',
      distanceInTiles: lineOfSight.distance
    };
  }

  // === LOGIQUE DE LIGNE DE VUE (EXACTE POKEMON) ===

  /**
   * Vérifie si le joueur est dans la ligne de vue directionnelle du dresseur
   */
  private checkLineOfSight(
    trainerPos: { x: number; y: number },
    playerPos: { x: number; y: number },
    trainerDirection: string
  ): { inLine: boolean; distance: number } {
    
    const dx = playerPos.x - trainerPos.x;
    const dy = playerPos.y - trainerPos.y;
    const distance = Math.max(Math.abs(dx), Math.abs(dy)); // Distance Manhattan
    
    // Trop loin
    if (distance > this.config.maxVisionRange) {
      return { inLine: false, distance };
    }
    
    // Même case = détection immédiate
    if (distance === 0) {
      return { inLine: true, distance: 0 };
    }
    
    // Vérifier alignement selon direction (EXACT comme Pokémon)
    switch (trainerDirection) {
      case 'north':
        // Joueur doit être directement au nord (même X, Y plus petit)
        return { 
          inLine: dx === 0 && dy < 0, 
          distance: Math.abs(dy)
        };
        
      case 'south':
        // Joueur doit être directement au sud (même X, Y plus grand)
        return { 
          inLine: dx === 0 && dy > 0, 
          distance: Math.abs(dy)
        };
        
      case 'east':
        // Joueur doit être directement à l'est (même Y, X plus grand)
        return { 
          inLine: dy === 0 && dx > 0, 
          distance: Math.abs(dx)
        };
        
      case 'west':
        // Joueur doit être directement à l'ouest (même Y, X plus petit)
        return { 
          inLine: dy === 0 && dx < 0, 
          distance: Math.abs(dx)
        };
        
      default:
        return { inLine: false, distance };
    }
  }

  // === DÉTECTION D'OBSTACLES ===

  /**
   * Vérifie s'il y a des obstacles entre le dresseur et le joueur
   */
  private checkObstaclesBetween(
    start: { x: number; y: number },
    end: { x: number; y: number },
    zone: string
  ): { blocked: boolean; obstacleType?: string } {
    
    const obstacles = this.mapObstacles.get(zone) || [];
    
    // Ligne droite entre start et end
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    
    if (steps === 0) return { blocked: false };
    
    const stepX = dx / steps;
    const stepY = dy / steps;
    
    // Vérifier chaque case sur le chemin
    for (let i = 1; i < steps; i++) {
      const checkX = Math.round(start.x + stepX * i);
      const checkY = Math.round(start.y + stepY * i);
      
      // Chercher obstacle à cette position
      const obstacle = obstacles.find(obs => 
        obs.x === checkX && obs.y === checkY && obs.blocks
      );
      
      if (obstacle) {
        return { 
          blocked: true, 
          obstacleType: obstacle.type 
        };
      }
    }
    
    return { blocked: false };
  }

  // === COMMANDES DE MOUVEMENT DRESSEURS ===

  /**
   * Génère une commande de mouvement pour un dresseur détecté
   */
  generateTrainerMovement(
    trainer: INpcData,
    player: Player
  ): TrainerMovementCommand | null {
    
    const state = this.getTrainerState(trainer.npcId);
    const trainerTilePos = this.pixelsToTiles(trainer.position.x, trainer.position.y);
    const playerTilePos = this.pixelsToTiles(player.x, player.y);
    const distance = Math.max(
      Math.abs(playerTilePos.x - trainerTilePos.x),
      Math.abs(playerTilePos.y - trainerTilePos.y)
    );
    
    switch (state) {
      case 'detected':
        // Afficher "!" et commencer à se déplacer
        this.setTrainerState(trainer.npcId, 'approaching');
        return {
          trainerId: trainer.npcId,
          action: 'move_towards_player',
          targetPosition: this.tilesToPixels(playerTilePos.x, playerTilePos.y),
          moveSpeed: this.config.trainerMoveSpeed,
          exclamationEffect: true,
          battleDialogue: this.getBattleDialogue(trainer, 'detection')
        };
        
      case 'approaching':
        // Continuer vers le joueur
        if (distance <= this.config.battleTriggerDistance) {
          // Assez proche pour combat !
          this.setTrainerState(trainer.npcId, 'battling');
          return {
            trainerId: trainer.npcId,
            action: 'start_battle',
            targetPosition: this.tilesToPixels(playerTilePos.x, playerTilePos.y),
            moveSpeed: 0,
            exclamationEffect: false,
            battleDialogue: this.getBattleDialogue(trainer, 'battle_start')
          };
        } else {
          // Continuer d'approcher
          return {
            trainerId: trainer.npcId,
            action: 'move_towards_player',
            targetPosition: this.tilesToPixels(playerTilePos.x, playerTilePos.y),
            moveSpeed: this.config.trainerMoveSpeed,
            exclamationEffect: false
          };
        }
        
      case 'defeated':
        // Ne bouge plus jamais
        return null;
        
      default:
        return null;
    }
  }

  // === GESTION DES ÉTATS ===

  /**
   * Marque un dresseur comme battu (plus jamais de combat)
   */
  markTrainerDefeated(trainerId: number, defeatedBy: string): void {
    this.setTrainerState(trainerId, 'defeated');
    this.log('info', `⚔️ [Combat] Dresseur ${trainerId} battu par ${defeatedBy}`);
  }

  /**
   * Vérifie si un dresseur peut encore détecter/combattre
   */
  private isActiveTrainer(trainer: INpcData): boolean {
    if (!trainer.isTrainerType() || !trainer.battleConfig?.teamId) {
      return false;
    }
    
    const state = this.getTrainerState(trainer.npcId);
    return state !== 'defeated' && state !== 'disabled';
  }

  private getTrainerState(trainerId: number): PokemonTrainerState {
    return this.trainerStates.get(trainerId) || 'idle';
  }

  private setTrainerState(trainerId: number, state: PokemonTrainerState): void {
    this.trainerStates.set(trainerId, state);
  }

  // === GESTION DES OBSTACLES ===

  /**
   * Charge les obstacles d'une zone (murs, arbres, etc.)
   */
  loadMapObstacles(zone: string, obstacles: MapObstacle[]): void {
    this.mapObstacles.set(zone, obstacles);
    this.log('info', `🗺️ [Obstacles] ${obstacles.length} obstacles chargés pour ${zone}`);
  }

  /**
   * Ajoute un obstacle temporaire (autre joueur, NPC mobile, etc.)
   */
  addTemporaryObstacle(zone: string, obstacle: MapObstacle): void {
    const obstacles = this.mapObstacles.get(zone) || [];
    obstacles.push(obstacle);
    this.mapObstacles.set(zone, obstacles);
  }

  /**
   * Retire un obstacle temporaire
   */
  removeTemporaryObstacle(zone: string, x: number, y: number): void {
    const obstacles = this.mapObstacles.get(zone) || [];
    const filtered = obstacles.filter(obs => !(obs.x === x && obs.y === y));
    this.mapObstacles.set(zone, filtered);
  }

  // === UTILITAIRES ===

  private pixelsToTiles(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.floor(x / this.config.tileSize),
      y: Math.floor(y / this.config.tileSize)
    };
  }

  private tilesToPixels(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.config.tileSize + this.config.tileSize / 2, // Centre de la case
      y: y * this.config.tileSize + this.config.tileSize / 2
    };
  }

  private getBattleDialogue(trainer: INpcData, type: 'detection' | 'battle_start'): string {
    const dialogues = {
      detection: [
        "Hé ! Nos regards se sont croisés !",
        "Tu ne peux pas fuir !",
        "Un dresseur Pokémon ne peut pas ignorer un défi !"
      ],
      battle_start: [
        "Allez-y ! C'est un combat de Pokémon !",
        "Je vais te montrer la puissance de mes Pokémon !",
        "Prépare-toi au combat !"
      ]
    };
    
    const options = dialogues[type];
    return options[Math.floor(Math.random() * options.length)];
  }

  // === DEBUG ET ADMIN ===

  /**
   * Affiche l'état de tous les dresseurs d'une zone
   */
  debugTrainerStates(zone: string): void {
    console.log(`🔍 [Debug] États dresseurs zone ${zone}:`);
    for (const [trainerId, state] of this.trainerStates.entries()) {
      console.log(`  Dresseur ${trainerId}: ${state}`);
    }
  }

  /**
   * Remet un dresseur en état idle (pour tests)
   */
  resetTrainer(trainerId: number): void {
    this.setTrainerState(trainerId, 'idle');
    this.log('info', `🔄 [Reset] Dresseur ${trainerId} remis en idle`);
  }

  /**
   * Stats du service
   */
  getServiceStats(): any {
    const stateCount = Array.from(this.trainerStates.values()).reduce((acc, state) => {
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      serviceType: 'pokemon_trainer_vision',
      version: '1.0.0',
      system: 'Rouge/Bleu exact',
      config: this.config,
      trainers: {
        total: this.trainerStates.size,
        byState: stateCount
      },
      obstacles: {
        zonesLoaded: this.mapObstacles.size,
        totalObstacles: Array.from(this.mapObstacles.values())
          .reduce((sum, obs) => sum + obs.length, 0)
      }
    };
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.debugMode && level === 'info') return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    switch (level) {
      case 'info':
        console.log(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
    }
  }
}

// ===== EXPORT SINGLETON =====
let pokemonTrainerVisionInstance: PokemonTrainerVisionService | null = null;

export function getPokemonTrainerVisionService(
  config?: Partial<PokemonTrainerVisionConfig>
): PokemonTrainerVisionService {
  if (!pokemonTrainerVisionInstance) {
    pokemonTrainerVisionInstance = new PokemonTrainerVisionService(config);
  }
  return pokemonTrainerVisionInstance;
}

export default PokemonTrainerVisionService;
