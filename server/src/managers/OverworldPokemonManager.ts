import * as fs from 'fs';
import * as path from 'path';

type AnimationType = 'idle' | 'walk' | 'sleep';

export interface OverworldPokemonData {
  id: string;
  pokemonId: number;
  name: string;
  x: number;
  y: number;
  direction: string;
  isMoving: boolean;
  isShiny: boolean;
  spawnTime: number;
  lastMoveTime: number;
  speed: number;
  movePattern: 'random' | 'patrol' | 'circle' | 'wander' | 'float';
  patrolPoints?: Array<{x: number, y: number}>;
  currentPatrolIndex?: number;
  areaId: string;
  boundaries: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  animations: {
    idle: string;
    walk: string;
    sleep: string;
  };
  currentAnimation: AnimationType;
  targetX?: number;
  targetY?: number;
  moveStartTime?: number;
  moveDuration?: number;
  lastDirectionFrame?: string;
  // ✅ NOUVELLES PROPRIÉTÉS POUR MOUVEMENT FLUIDE SANS COLLISION SERVEUR
  wanderRadius?: number;
  wanderCenter?: {x: number, y: number};
  floatHeight?: number; // Pour les Pokémon volants
  personality?: 'calm' | 'active' | 'erratic' | 'lazy';
  preferredDirection?: string;
  directionChangeChance?: number;
  pauseChance?: number;
}

export interface OverworldPokemonConfig {
  pokemonId: number;
  name: string;
  spawnChance: number;
  maxCount: number;
  isShiny: boolean;
  movePattern: 'random' | 'patrol' | 'circle' | 'wander' | 'float';
  speed: number;
  animations: {
    idle: string;
    walk: string;
    sleep: string;
  };
  currentAnimation: AnimationType;
  patrolPoints?: Array<{x: number, y: number}>;
  wanderRadius?: number;
  personality?: 'calm' | 'active' | 'erratic' | 'lazy';
  directionChangeChance?: number;
  pauseChance?: number;
}

export interface AreaConfig {
  name: string;
  boundaries: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  maxPokemon: number;
  spawnInterval: number;
  pokemon: OverworldPokemonConfig[];
}

export class OverworldPokemonManager {
  private room: any;
  private overworldPokemon: Map<string, OverworldPokemonData> = new Map();
  private config: any;
  private lastUpdateTime: number = Date.now();
  private updateInterval: number = 80; // ✅ Très fluide
  private lastSpawnCheck: number = Date.now();
  private directions: string[] = ['up', 'down', 'left', 'right'];
  private diagonalDirections: string[] = ['up-left', 'up-right', 'down-left', 'down-right'];
  private allDirections: string[] = [...this.directions, ...this.diagonalDirections];
  private updateLoop: NodeJS.Timeout | null = null;
  private spawnLoop: NodeJS.Timeout | null = null;
  
  constructor(room: any) {
    this.room = room;
    this.loadConfig();
    console.log("🌍 [OverworldPokemonManager] Initialisé - Collision côté client uniquement");
  }

  private loadConfig(): void {
    try {
      const configPath = path.join(__dirname, '../config/overworldPokemonConfig.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(configData);
      this.updateInterval = this.config.globalSettings?.updateInterval || 80;
      console.log(`📋 [OverworldPokemonManager] Configuration chargée: ${Object.keys(this.config.areas).length} zones`);
      Object.entries(this.config.areas).forEach(([areaId, area]: [string, any]) => {
        console.log(`🏞️ Zone ${areaId}: ${area.pokemon.length} types de Pokémon`);
        area.pokemon.forEach((pokemon: any) => {
          console.log(`  🐾 ${pokemon.name} (ID: ${pokemon.pokemonId}) - Pattern: ${pokemon.movePattern} | Personnalité: ${pokemon.personality || 'normal'}`);
        });
      });
    } catch (error) {
      console.error('❌ [OverworldPokemonManager] Erreur chargement config:', error);
      this.config = { areas: {}, globalSettings: { updateInterval: 80 } };
    }
  }

  // ✅ NOUVEAU: Calcul de mouvement fluide basé sur la personnalité
  private calculateFluidMovementTarget(pokemon: OverworldPokemonData): {x: number, y: number} {
    const personality = pokemon.personality || 'calm';
    let distance: number;
    let directionVariation: number;
    
    // ✅ Distances et variations selon la personnalité
    switch (personality) {
      case 'active':
        distance = 32 + Math.random() * 128; // 1-4 cases
        directionVariation = Math.PI * 0.5; // ±90°
        break;
      case 'erratic':
        distance = 16 + Math.random() * 96; // 0.5-3 cases
        directionVariation = Math.PI; // ±180° (peut faire demi-tour)
        break;
      case 'lazy':
        distance = 16 + Math.random() * 48; // 0.5-1.5 cases
        directionVariation = Math.PI * 0.25; // ±45°
        break;
      case 'calm':
      default:
        distance = 24 + Math.random() * 64; // 0.75-2 cases
        directionVariation = Math.PI * 0.3; // ±54°
        break;
    }

    // ✅ Calcul de direction avec variation naturelle
    let baseAngle = this.getAngleFromDirection(pokemon.direction);
    
    // Chance de changer complètement de direction
    const changeChance = pokemon.directionChangeChance || 0.15;
    if (Math.random() < changeChance) {
      baseAngle = Math.random() * 2 * Math.PI;
    }
    
    // Variation angulaire
    const variation = (Math.random() - 0.5) * directionVariation;
    const finalAngle = baseAngle + variation;
    
    // Position cible
    const targetX = pokemon.x + Math.cos(finalAngle) * distance;
    const targetY = pokemon.y + Math.sin(finalAngle) * distance;
    
    // ✅ Vérifier seulement les limites de zone (pas de collision)
    const clampedX = Math.max(pokemon.boundaries.minX, Math.min(pokemon.boundaries.maxX, targetX));
    const clampedY = Math.max(pokemon.boundaries.minY, Math.min(pokemon.boundaries.maxY, targetY));
    
    // Mettre à jour la direction
    pokemon.direction = this.getDirectionFromAngle(finalAngle);
    
    return { x: clampedX, y: clampedY };
  }

  // ✅ NOUVEAU: Mouvement de déambulation libre
  private calculateWanderTarget(pokemon: OverworldPokemonData): {x: number, y: number} {
    if (!pokemon.wanderCenter) {
      pokemon.wanderCenter = { x: pokemon.x, y: pokemon.y };
    }
    
    const wanderRadius = pokemon.wanderRadius || 128;
    
    // ✅ Point aléatoire dans le cercle de déambulation
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * wanderRadius;
    
    let targetX = pokemon.wanderCenter.x + Math.cos(angle) * distance;
    let targetY = pokemon.wanderCenter.y + Math.sin(angle) * distance;
    
    // Limiter aux boundaries
    targetX = Math.max(pokemon.boundaries.minX, Math.min(pokemon.boundaries.maxX, targetX));
    targetY = Math.max(pokemon.boundaries.minY, Math.min(pokemon.boundaries.maxY, targetY));
    
    pokemon.direction = this.getDirectionToTarget(pokemon.x, pokemon.y, targetX, targetY);
    
    return { x: targetX, y: targetY };
  }

  // ✅ NOUVEAU: Mouvement de vol (pour Pokémon volants)
  private calculateFloatTarget(pokemon: OverworldPokemonData): {x: number, y: number} {
    // Les Pokémon volants peuvent se déplacer plus librement
    const distance = 48 + Math.random() * 128; // 1.5-4 cases
    const angle = Math.random() * 2 * Math.PI; // Direction complètement aléatoire
    
    let targetX = pokemon.x + Math.cos(angle) * distance;
    let targetY = pokemon.y + Math.sin(angle) * distance;
    
    // Limiter aux boundaries avec un peu plus de marge
    const margin = 32;
    targetX = Math.max(pokemon.boundaries.minX + margin, 
                      Math.min(pokemon.boundaries.maxX - margin, targetX));
    targetY = Math.max(pokemon.boundaries.minY + margin, 
                      Math.min(pokemon.boundaries.maxY - margin, targetY));
    
    pokemon.direction = this.getDirectionToTarget(pokemon.x, pokemon.y, targetX, targetY);
    
    return { x: targetX, y: targetY };
  }

  // ✅ Convertit une direction en angle
  private getAngleFromDirection(direction: string): number {
    switch (direction) {
      case 'right': return 0;
      case 'down-right': return Math.PI / 4;
      case 'down': return Math.PI / 2;
      case 'down-left': return 3 * Math.PI / 4;
      case 'left': return Math.PI;
      case 'up-left': return 5 * Math.PI / 4;
      case 'up': return 3 * Math.PI / 2;
      case 'up-right': return 7 * Math.PI / 4;
      default: return 0;
    }
  }

  // ✅ Convertit un angle en direction
  private getDirectionFromAngle(angle: number): string {
    // Normaliser l'angle
    while (angle < 0) angle += 2 * Math.PI;
    while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
    
    const segment = Math.PI / 4; // 45°
    
    if (angle < segment / 2 || angle >= 2 * Math.PI - segment / 2) return 'right';
    if (angle < segment * 1.5) return 'down-right';
    if (angle < segment * 2.5) return 'down';
    if (angle < segment * 3.5) return 'down-left';
    if (angle < segment * 4.5) return 'left';
    if (angle < segment * 5.5) return 'up-left';
    if (angle < segment * 6.5) return 'up';
    return 'up-right';
  }

  private getClientsInZone(zoneId: string): any[] {
    const clientsInZone: any[] = [];
    this.room.clients.forEach((client: any) => {
      const player = this.room.state.players.get(client.sessionId);
      if (player && player.currentZone === zoneId) {
        clientsInZone.push(client);
      }
    });
    return clientsInZone;
  }

  private extractAreaFromPokemonId(pokemonId: string): string | null {
    const parts = pokemonId.split('_');
    if (parts.length >= 3 && parts[0] === 'overworld') {
      return parts[1];
    }
    return null;
  }

  start(): void {
    console.log("🚀 [OverworldPokemonManager] Démarrage - Mouvement fluide libre");
    Object.keys(this.config.areas).forEach(areaId => {
      this.spawnPokemonInArea(areaId);
    });
    this.startUpdateLoop();
    this.startSpawnLoop();
  }

  stop(): void {
    console.log("⏹️ [OverworldPokemonManager] Arrêt du système");
    if (this.updateLoop) {
      clearInterval(this.updateLoop);
      this.updateLoop = null;
    }
    if (this.spawnLoop) {
      clearInterval(this.spawnLoop);
      this.spawnLoop = null;
    }
    this.cleanup();
  }

  private startUpdateLoop(): void {
    this.updateLoop = setInterval(() => {
      const now = Date.now();
      const deltaTime = now - this.lastUpdateTime;
      this.updateAllPokemon(deltaTime);
      this.lastUpdateTime = now;
    }, this.updateInterval);
  }

  private startSpawnLoop(): void {
    this.spawnLoop = setInterval(() => {
      this.checkSpawns();
    }, 5000);
  }

  private spawnPokemonInArea(areaId: string): void {
    const areaConfig = this.config.areas[areaId];
    if (!areaConfig) return;
    
    console.log(`🌱 [OverworldPokemonManager] Spawn dans la zone: ${areaId}`);
    areaConfig.pokemon.forEach((pokemonConfig: OverworldPokemonConfig) => {
      const currentCount = this.countPokemonInArea(areaId, pokemonConfig.pokemonId);
      const needToSpawn = Math.max(0, pokemonConfig.maxCount - currentCount);
      for (let i = 0; i < needToSpawn; i++) {
        if (Math.random() < pokemonConfig.spawnChance) {
          this.spawnPokemon(areaId, pokemonConfig);
        }
      }
    });
  }

  private spawnPokemon(areaId: string, config: OverworldPokemonConfig): void {
  const areaConfig = this.config.areas[areaId];
  if (!areaConfig) return;
  
  const id = `overworld_${areaId}_${config.pokemonId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // ✅ SPAWN AVEC VALIDATION CLIENT
  const spawnRequest = {
    type: "OVERWORLD_POKEMON_SPAWN_REQUEST",
    data: {
      id,
      pokemonId: config.pokemonId,
      name: config.name,
      areaId: areaId,
      boundaries: areaConfig.boundaries,
      direction: this.directions[Math.floor(Math.random() * this.directions.length)],
      isShiny: config.isShiny || (Math.random() < 0.001),
      speed: config.speed,
      movePattern: config.movePattern,
      patrolPoints: config.patrolPoints,
      animations: config.animations,
      currentAnimation: config.currentAnimation,
      wanderRadius: config.wanderRadius || 128,
      personality: config.personality || 'calm',
      directionChangeChance: config.directionChangeChance || 0.15,
      pauseChance: config.pauseChance || 0.1
    }
  };
  
  // Envoyer la demande aux clients pour qu'ils trouvent une position libre
  const clientsInZone = this.getClientsInZone(areaId);
  if (clientsInZone.length > 0) {
    // Demander au premier client de trouver une position libre
    clientsInZone[0].send("overworldPokemon", spawnRequest);
  }
}

  public handleClientSpawnResponse(client: any, data: any): void {
  const { id, x, y, success } = data;
  
  if (!success) {
    console.warn(`⚠️ [OverworldPokemonManager] Client n'a pas trouvé de position libre pour ${id}`);
    return;
  }
  
  // Créer le Pokémon avec la position validée par le client
  const pokemon: OverworldPokemonData = {
    id: data.id,
    pokemonId: data.pokemonId,
    name: data.name,
    x: x,
    y: y,
    direction: data.direction,
    isMoving: false,
    isShiny: data.isShiny,
    spawnTime: Date.now(),
    lastMoveTime: Date.now(),
    speed: data.speed,
    movePattern: data.movePattern,
    patrolPoints: data.patrolPoints,
    currentPatrolIndex: 0,
    areaId: data.areaId,
    boundaries: data.boundaries,
    animations: data.animations,
    currentAnimation: data.currentAnimation,
    targetX: x,
    targetY: y,
    moveStartTime: Date.now(),
    moveDuration: 1000,
    lastDirectionFrame: data.direction,
    wanderRadius: data.wanderRadius,
    wanderCenter: { x: x, y: y },
    personality: data.personality
  };
  
  this.overworldPokemon.set(id, pokemon);
  console.log(`🐾 [OverworldPokemonManager] ${data.name} spawné à (${x.toFixed(1)}, ${y.toFixed(1)})`);
  
  // Broadcaster le spawn à tous les clients de la zone
  this.broadcastPokemonSpawn(pokemon);
}
}
  }
  private updateAllPokemon(deltaTime: number): void {
    this.overworldPokemon.forEach((pokemon, id) => {
      this.updatePokemonMovement(pokemon, deltaTime);
    });
  }

  private updatePokemonMovement(pokemon: OverworldPokemonData, deltaTime: number): void {
    const now = Date.now();
    const timeSinceLastMove = now - pokemon.lastMoveTime;
    
    switch (pokemon.movePattern) {
      case 'random':
        this.updateRandomMovement(pokemon, timeSinceLastMove, deltaTime);
        break;
      case 'wander':
        this.updateWanderMovement(pokemon, timeSinceLastMove, deltaTime);
        break;
      case 'float':
        this.updateFloatMovement(pokemon, timeSinceLastMove, deltaTime);
        break;
      case 'patrol':
        this.updatePatrolMovement(pokemon, timeSinceLastMove, deltaTime);
        break;
      case 'circle':
        this.updateRandomMovement(pokemon, timeSinceLastMove, deltaTime);
        break;
    }
  }

  // ✅ MODIFIÉ: Mouvement aléatoire basé sur la personnalité
  private updateRandomMovement(pokemon: OverworldPokemonData, timeSinceLastMove: number, deltaTime: number): void {
    const personality = pokemon.personality || 'calm';
    
    // ✅ Intervalles selon la personnalité
    let baseInterval: number;
    switch (personality) {
      case 'active': baseInterval = 800; break;
      case 'erratic': baseInterval = 400; break;
      case 'lazy': baseInterval = 3000; break;
      case 'calm': 
      default: baseInterval = 1500; break;
    }
    
    const variableInterval = Math.random() * baseInterval;
    const moveInterval = baseInterval + variableInterval;

    if (pokemon.isMoving) {
      const moveProgress = (Date.now() - (pokemon.moveStartTime || 0)) / (pokemon.moveDuration || 1000);
      
      if (moveProgress >= 1.0) {
        // Mouvement terminé
        if (pokemon.targetX !== undefined && pokemon.targetY !== undefined) {
          pokemon.x = pokemon.targetX;
          pokemon.y = pokemon.targetY;
        }
        pokemon.isMoving = false;
        pokemon.lastMoveTime = Date.now();
        pokemon.lastDirectionFrame = pokemon.direction;
        this.broadcastPokemonUpdate(pokemon);
        console.log(`🎯 [OverworldPokemonManager] ${pokemon.name} (${personality}) arrivé à (${pokemon.x.toFixed(1)}, ${pokemon.y.toFixed(1)})`);
      } else {
        // Broadcast occasionnel pendant le mouvement
        if (Math.random() < 0.01) {
          this.broadcastPokemonUpdate(pokemon);
        }
      }
    } else {
      // ✅ Chance de pause selon la personnalité
      const pauseChance = pokemon.pauseChance || 0.1;
      if (Math.random() < pauseChance) {
        pokemon.lastMoveTime = Date.now() + (baseInterval * 0.5);
        return;
      }
      
      if (timeSinceLastMove > moveInterval) {
        const target = this.calculateFluidMovementTarget(pokemon);
        
        const dx = target.x - pokemon.x;
        const dy = target.y - pokemon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // ✅ Vitesse selon la personnalité
        let effectiveSpeed = pokemon.speed || 60;
        switch (personality) {
          case 'active': effectiveSpeed *= 1.3; break;
          case 'erratic': effectiveSpeed *= 1.1; break;
          case 'lazy': effectiveSpeed *= 0.7; break;
        }
        
        const moveDuration = Math.max(600, distance / effectiveSpeed * 1000);

        pokemon.isMoving = true;
        pokemon.targetX = target.x;
        pokemon.targetY = target.y;
        pokemon.moveStartTime = Date.now();
        pokemon.moveDuration = moveDuration;
        pokemon.lastMoveTime = Date.now();
        
        console.log(`🚀 [OverworldPokemonManager] ${pokemon.name} (${personality}): (${pokemon.x.toFixed(1)}, ${pokemon.y.toFixed(1)}) → (${target.x.toFixed(1)}, ${target.y.toFixed(1)}) [${distance.toFixed(0)}px, ${moveDuration}ms]`);
        this.broadcastPokemonUpdate(pokemon);
      }
    }
  }

  // ✅ NOUVEAU: Mouvement de déambulation
  private updateWanderMovement(pokemon: OverworldPokemonData, timeSinceLastMove: number, deltaTime: number): void {
    const moveInterval = 2000 + Math.random() * 3000;

    if (pokemon.isMoving) {
      const moveProgress = (Date.now() - (pokemon.moveStartTime || 0)) / (pokemon.moveDuration || 1000);
      
      if (moveProgress >= 1.0) {
        if (pokemon.targetX !== undefined && pokemon.targetY !== undefined) {
          pokemon.x = pokemon.targetX;
          pokemon.y = pokemon.targetY;
        }
        pokemon.isMoving = false;
        pokemon.lastMoveTime = Date.now();
        pokemon.lastDirectionFrame = pokemon.direction;
        this.broadcastPokemonUpdate(pokemon);
      }
    } else {
      if (timeSinceLastMove > moveInterval) {
        const target = this.calculateWanderTarget(pokemon);
        
        const dx = target.x - pokemon.x;
        const dy = target.y - pokemon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = pokemon.speed || 50;
        const moveDuration = Math.max(1000, distance / speed * 1000);

        pokemon.isMoving = true;
        pokemon.targetX = target.x;
        pokemon.targetY = target.y;
        pokemon.moveStartTime = Date.now();
        pokemon.moveDuration = moveDuration;
        pokemon.lastMoveTime = Date.now();
        
        this.broadcastPokemonUpdate(pokemon);
      }
    }
  }

  // ✅ NOUVEAU: Mouvement de vol
  private updateFloatMovement(pokemon: OverworldPokemonData, timeSinceLastMove: number, deltaTime: number): void {
    const moveInterval = 1000 + Math.random() * 2000; // Plus rapide que le wander

    if (pokemon.isMoving) {
      const moveProgress = (Date.now() - (pokemon.moveStartTime || 0)) / (pokemon.moveDuration || 1000);
      
      if (moveProgress >= 1.0) {
        if (pokemon.targetX !== undefined && pokemon.targetY !== undefined) {
          pokemon.x = pokemon.targetX;
          pokemon.y = pokemon.targetY;
        }
        pokemon.isMoving = false;
        pokemon.lastMoveTime = Date.now();
        pokemon.lastDirectionFrame = pokemon.direction;
        this.broadcastPokemonUpdate(pokemon);
      }
    } else {
      if (timeSinceLastMove > moveInterval) {
        const target = this.calculateFloatTarget(pokemon);
        
        const dx = target.x - pokemon.x;
        const dy = target.y - pokemon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = (pokemon.speed || 60) * 1.2; // Plus rapide car ils volent
        const moveDuration = Math.max(800, distance / speed * 1000);

        pokemon.isMoving = true;
        pokemon.targetX = target.x;
        pokemon.targetY = target.y;
        pokemon.moveStartTime = Date.now();
        pokemon.moveDuration = moveDuration;
        pokemon.lastMoveTime = Date.now();
        
        this.broadcastPokemonUpdate(pokemon);
      }
    }
  }

  private updatePatrolMovement(pokemon: OverworldPokemonData, timeSinceLastMove: number, deltaTime: number): void {
    if (!pokemon.patrolPoints || pokemon.patrolPoints.length === 0) {
      this.updateWanderMovement(pokemon, timeSinceLastMove, deltaTime);
      return;
    }
    
    const targetPoint = pokemon.patrolPoints[pokemon.currentPatrolIndex || 0];
    
    if (pokemon.isMoving) {
      const moveProgress = (Date.now() - (pokemon.moveStartTime || 0)) / (pokemon.moveDuration || 1000);
      
      if (moveProgress >= 1.0) {
        pokemon.x = pokemon.targetX || targetPoint.x;
        pokemon.y = pokemon.targetY || targetPoint.y;
        pokemon.isMoving = false;
        pokemon.lastMoveTime = Date.now();
        pokemon.currentPatrolIndex = ((pokemon.currentPatrolIndex || 0) + 1) % pokemon.patrolPoints.length;
        this.broadcastPokemonUpdate(pokemon);
      }
    } else {
      const pauseDuration = 1000 + Math.random() * 2000;
      if (timeSinceLastMove > pauseDuration) {
        const dx = targetPoint.x - pokemon.x;
        const dy = targetPoint.y - pokemon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = pokemon.speed || 60;
        const moveDuration = Math.max(1000, distance / speed * 1000);

        pokemon.isMoving = true;
        pokemon.targetX = targetPoint.x;
        pokemon.targetY = targetPoint.y;
        pokemon.moveStartTime = Date.now();
        pokemon.moveDuration = moveDuration;
        pokemon.direction = this.getDirectionToTarget(pokemon.x, pokemon.y, targetPoint.x, targetPoint.y);
        pokemon.lastMoveTime = Date.now();
        this.broadcastPokemonUpdate(pokemon);
      }
    }
  }

  private getDirectionToTarget(fromX: number, fromY: number, toX: number, toY: number): string {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    return this.getDirectionFromAngle(angle);
  }

  private isPositionValid(x: number, y: number, boundaries: any): boolean {
    return x >= boundaries.minX && x <= boundaries.maxX && 
           y >= boundaries.minY && y <= boundaries.maxY;
  }

  private countPokemonInArea(areaId: string, pokemonId?: number): number {
    let count = 0;
    this.overworldPokemon.forEach(pokemon => {
      if (pokemon.areaId === areaId && (!pokemonId || pokemon.pokemonId === pokemonId)) {
        count++;
      }
    });
    return count;
  }

  private checkSpawns(): void {
    Object.entries(this.config.areas).forEach(([areaId, areaConfig]: [string, any]) => {
      const totalInArea = this.countPokemonInArea(areaId);
      if (totalInArea < areaConfig.maxPokemon) {
        areaConfig.pokemon.forEach((pokemonConfig: OverworldPokemonConfig) => {
          const currentCount = this.countPokemonInArea(areaId, pokemonConfig.pokemonId);
          if (currentCount < pokemonConfig.maxCount && Math.random() < pokemonConfig.spawnChance) {
            this.spawnPokemon(areaId, pokemonConfig);
          }
        });
      }
    });
  }

  private broadcastPokemonSpawn(pokemon: OverworldPokemonData): void {
    console.log(`📡 [OverworldPokemonManager] Broadcast spawn ${pokemon.name} dans zone: ${pokemon.areaId}`);
    const clientsInZone = this.getClientsInZone(pokemon.areaId);
    const message = {
      type: "OVERWORLD_POKEMON_SPAWN",
      data: {
        id: pokemon.id,
        pokemonId: pokemon.pokemonId,
        name: pokemon.name,
        x: pokemon.x,
        y: pokemon.y,
        direction: pokemon.direction,
        isMoving: pokemon.isMoving,
        isShiny: pokemon.isShiny,
        areaId: pokemon.areaId,
        animations: pokemon.animations,
        currentAnimation: pokemon.currentAnimation,
        targetX: pokemon.targetX,
        targetY: pokemon.targetY,
        moveStartTime: pokemon.moveStartTime,
        moveDuration: pokemon.moveDuration,
        lastDirectionFrame: pokemon.lastDirectionFrame,
        // ✅ Nouvelles données pour client
        personality: pokemon.personality,
        movePattern: pokemon.movePattern
      }
    };
    clientsInZone.forEach(client => {
      client.send("overworldPokemon", message);
    });
    console.log(`📤 [OverworldPokemonManager] Spawn ${pokemon.name} envoyé à ${clientsInZone.length} clients dans ${pokemon.areaId}`);
  }

  private broadcastPokemonUpdate(pokemon: OverworldPokemonData): void {
    const clientsInZone = this.getClientsInZone(pokemon.areaId);
    if (clientsInZone.length === 0) {
      return;
    }
    const message = {
      type: "OVERWORLD_POKEMON_UPDATE",
      data: {
        id: pokemon.id,
        x: pokemon.x,
        y: pokemon.y,
        direction: pokemon.direction,
        isMoving: pokemon.isMoving,
        currentAnimation: pokemon.currentAnimation,
        targetX: pokemon.targetX,
        targetY: pokemon.targetY,
        moveStartTime: pokemon.moveStartTime,
        moveDuration: pokemon.moveDuration,
        lastDirectionFrame: pokemon.lastDirectionFrame
      }
    };
    clientsInZone.forEach(client => {
      client.send("overworldPokemon", message);
    });
    if (Math.random() < 0.001) {
      console.log(`📤 [OverworldPokemonManager] Update ${pokemon.name} envoyé à ${clientsInZone.length} clients dans ${pokemon.areaId}`);
    }
  }

  private broadcastPokemonRemove(pokemonId: string): void {
    const areaId = this.extractAreaFromPokemonId(pokemonId);
    if (!areaId) {
      console.warn(`⚠️ [OverworldPokemonManager] Impossible d'extraire la zone de ${pokemonId}`);
      return;
    }
    const clientsInZone = this.getClientsInZone(areaId);
    const message = {
      type: "OVERWORLD_POKEMON_REMOVE",
      data: {
        id: pokemonId
      }
    };
    clientsInZone.forEach(client => {
      client.send("overworldPokemon", message);
    });
    console.log(`🗑️ [OverworldPokemonManager] Remove ${pokemonId} envoyé à ${clientsInZone.length} clients dans ${areaId}`);
  }

  syncPokemonForClient(client: any): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.warn(`⚠️ [OverworldPokemonManager] Joueur ${client.sessionId} non trouvé pour sync`);
      return;
    }
    const playerZone = player.currentZone;
    console.log(`🔄 [OverworldPokemonManager] Sync Pokémon overworld pour ${client.sessionId} dans zone: ${playerZone}`);
    const pokemonList = Array.from(this.overworldPokemon.values())
      .filter(pokemon => pokemon.areaId === playerZone)
      .map(pokemon => ({
        id: pokemon.id,
        pokemonId: pokemon.pokemonId,
        name: pokemon.name,
        x: pokemon.x,
        y: pokemon.y,
        direction: pokemon.direction,
        isMoving: pokemon.isMoving,
        isShiny: pokemon.isShiny,
        areaId: pokemon.areaId,
        animations: pokemon.animations,
        currentAnimation: pokemon.currentAnimation,
        targetX: pokemon.targetX,
        targetY: pokemon.targetY,
        moveStartTime: pokemon.moveStartTime,
        moveDuration: pokemon.moveDuration,
        lastDirectionFrame: pokemon.lastDirectionFrame,
        personality: pokemon.personality,
        movePattern: pokemon.movePattern
      }));
    client.send("overworldPokemon", {
      type: "OVERWORLD_POKEMON_SYNC",
      data: {
        pokemon: pokemonList
      }
    });
    console.log(`✅ [OverworldPokemonManager] Synchronisation de ${pokemonList.length} Pokémon pour ${playerZone} → ${client.sessionId}`);
  }

  public onPlayerZoneChanged(sessionId: string, oldZone: string, newZone: string): void {
    console.log(`🔄 [OverworldPokemonManager] Joueur ${sessionId}: ${oldZone} → ${newZone}`);
    const client = this.room.clients.find((c: any) => c.sessionId === sessionId);
    if (!client) return;
    this.clearPokemonForClient(client, oldZone);
    setTimeout(() => {
      this.syncPokemonForClient(client);
    }, 500);
  }

  private clearPokemonForClient(client: any, zoneId: string): void {
    const pokemonToRemove = Array.from(this.overworldPokemon.values())
      .filter(pokemon => pokemon.areaId === zoneId)
      .map(pokemon => pokemon.id);
    pokemonToRemove.forEach(pokemonId => {
      client.send("overworldPokemon", {
        type: "OVERWORLD_POKEMON_REMOVE",
        data: { id: pokemonId }
      });
    });
    console.log(`🧹 [OverworldPokemonManager] ${pokemonToRemove.length} Pokémon supprimés côté client pour zone ${zoneId}`);
  }

  removePokemon(pokemonId: string): void {
    if (this.overworldPokemon.has(pokemonId)) {
      console.log(`🗑️ [OverworldPokemonManager] Suppression Pokémon: ${pokemonId}`);
      this.overworldPokemon.delete(pokemonId);
      this.broadcastPokemonRemove(pokemonId);
    }
  }

  clearArea(areaId: string): void {
    console.log(`🧹 [OverworldPokemonManager] Nettoyage zone: ${areaId}`);
    const toRemove: string[] = [];
    this.overworldPokemon.forEach((pokemon, id) => {
      if (pokemon.areaId === areaId) {
        toRemove.push(id);
      }
    });
    toRemove.forEach(id => this.removePokemon(id));
  }

  forceSpawn(areaId: string, pokemonId: number, x?: number, y?: number): void {
    const areaConfig = this.config.areas[areaId];
    if (!areaConfig) {
      console.warn(`⚠️ [OverworldPokemonManager] Zone ${areaId} non configurée`);
      return;
    }
    const pokemonConfig = areaConfig.pokemon.find((p: any) => p.pokemonId === pokemonId);
    if (!pokemonConfig) {
      console.warn(`⚠️ [OverworldPokemonManager] Pokémon ${pokemonId} non configuré dans ${areaId}`);
      return;
    }
    
    const spawnConfig = { ...pokemonConfig };
    
    if (x !== undefined && y !== undefined) {
      const originalBoundaries = areaConfig.boundaries;
      areaConfig.boundaries = { minX: x, maxX: x, minY: y, maxY: y };
      this.spawnPokemon(areaId, spawnConfig);
      areaConfig.boundaries = originalBoundaries;
    } else {
      this.spawnPokemon(areaId, spawnConfig);
    }
    console.log(`🎯 [OverworldPokemonManager] Force spawn: ${pokemonConfig.name} dans ${areaId}`);
  }

  cleanup(): void {
    console.log(`🧹 [OverworldPokemonManager] Nettoyage de ${this.overworldPokemon.size} Pokémon overworld`);
    this.overworldPokemon.forEach((pokemon, id) => {
      this.broadcastPokemonRemove(id);
    });
    this.overworldPokemon.clear();
  }

  // ✅ MODIFIÉ: Stats avec informations de personnalité
  getStats(): any {
    const stats = {
      totalPokemon: this.overworldPokemon.size,
      areas: {} as { [key: string]: number },
      pokemonByType: {} as { [key: number]: number },
      movingPokemon: 0,
      shinyPokemon: 0,
      fluidMovementStats: {
        interpolating: 0,
        targeting: 0,
        idle: 0,
        wandering: 0,
        floating: 0,
        patrolling: 0
      },
      personalityStats: {
        calm: 0,
        active: 0,
        erratic: 0,
        lazy: 0
      }
    };
    
    this.overworldPokemon.forEach(pokemon => {
      if (!stats.areas[pokemon.areaId]) {
        stats.areas[pokemon.areaId] = 0;
      }
      stats.areas[pokemon.areaId]++;
      
      if (!stats.pokemonByType[pokemon.pokemonId]) {
        stats.pokemonByType[pokemon.pokemonId] = 0;
      }
      stats.pokemonByType[pokemon.pokemonId]++;
      
      if (pokemon.isMoving) stats.movingPokemon++;
      if (pokemon.isShiny) stats.shinyPokemon++;
      
      // Stats par type de mouvement
      if (pokemon.isMoving && pokemon.targetX !== undefined) {
        stats.fluidMovementStats.targeting++;
      } else if (pokemon.isMoving) {
        stats.fluidMovementStats.interpolating++;
      } else {
        stats.fluidMovementStats.idle++;
      }
      
      // Stats par pattern
      switch (pokemon.movePattern) {
        case 'wander':
          stats.fluidMovementStats.wandering++;
          break;
        case 'float':
          stats.fluidMovementStats.floating++;
          break;
        case 'patrol':
          stats.fluidMovementStats.patrolling++;
          break;
      }
      
      // Stats par personnalité
      const personality = pokemon.personality || 'calm';
      if (stats.personalityStats[personality] !== undefined) {
        stats.personalityStats[personality]++;
      }
    });
    
    return stats;
  }

  debug(): void {
    console.log(`🔍 [OverworldPokemonManager] === DEBUG OVERWORLD POKEMON (MOUVEMENT LIBRE) ===`);
    const stats = this.getStats();
    console.log(`📊 Stats:`, stats);
    
    console.log(`🏞️ Zones configurées: ${Object.keys(this.config.areas).length}`);
    Object.entries(this.config.areas).forEach(([areaId, areaConfig]: [string, any]) => {
      console.log(`  📍 ${areaId}: ${areaConfig.pokemon.length} types configurés`);
      areaConfig.pokemon.forEach((config: any) => {
        const count = this.countPokemonInArea(areaId, config.pokemonId);
        console.log(`    🐾 ${config.name} (${config.pokemonId}): ${count}/${config.maxCount} - Pattern: ${config.movePattern} | Personnalité: ${config.personality || 'calm'}`);
      });
    });
    
    console.log(`🐾 Pokémon actifs:`);
    this.overworldPokemon.forEach((pokemon, id) => {
      const moveProgress = pokemon.moveStartTime && pokemon.moveDuration ? 
        `${(((Date.now() - pokemon.moveStartTime) / pokemon.moveDuration) * 100).toFixed(1)}%` : 'N/A';
      console.log(`  ${id}: ${pokemon.name} dans ${pokemon.areaId}`);
      console.log(`    Position: (${pokemon.x.toFixed(1)}, ${pokemon.y.toFixed(1)})`);
      console.log(`    Cible: (${pokemon.targetX?.toFixed(1)}, ${pokemon.targetY?.toFixed(1)})`);
      console.log(`    État: ${pokemon.isMoving ? 'Bouge' : 'Immobile'} ${pokemon.direction}`);
      console.log(`    Pattern: ${pokemon.movePattern} | Personnalité: ${pokemon.personality} | Animation: ${pokemon.currentAnimation}`);
      console.log(`    Progression: ${moveProgress}`);
      if (pokemon.wanderCenter) {
        console.log(`    Centre errance: (${pokemon.wanderCenter.x.toFixed(1)}, ${pokemon.wanderCenter.y.toFixed(1)})`);
      }
    });
  }

  // ✅ NOUVELLES MÉTHODES UTILITAIRES

  /**
   * Change la personnalité de tous les Pokémon d'une zone
   */
  setZonePersonality(areaId: string, personality: 'calm' | 'active' | 'erratic' | 'lazy'): void {
    console.log(`🎭 [OverworldPokemonManager] Changement personnalité zone ${areaId}: ${personality}`);
    let count = 0;
    
    this.overworldPokemon.forEach(pokemon => {
      if (pokemon.areaId === areaId) {
        pokemon.personality = personality;
        
        // Ajuster les chances selon la nouvelle personnalité
        switch (personality) {
          case 'active':
            pokemon.directionChangeChance = 0.25;
            pokemon.pauseChance = 0.05;
            break;
          case 'erratic':
            pokemon.directionChangeChance = 0.4;
            pokemon.pauseChance = 0.3;
            break;
          case 'lazy':
            pokemon.directionChangeChance = 0.1;
            pokemon.pauseChance = 0.4;
            break;
          case 'calm':
          default:
            pokemon.directionChangeChance = 0.15;
            pokemon.pauseChance = 0.1;
            break;
        }
        
        count++;
      }
    });
    
    console.log(`✅ [OverworldPokemonManager] ${count} Pokémon mis à jour avec personnalité ${personality}`);
  }

  /**
   * Force tous les Pokémon à utiliser un pattern spécifique
   */
  setGlobalMovePattern(pattern: 'random' | 'wander' | 'patrol' | 'circle' | 'float'): void {
    console.log(`🔄 [OverworldPokemonManager] Changement pattern global: ${pattern}`);
    let count = 0;
    
    this.overworldPokemon.forEach(pokemon => {
      pokemon.movePattern = pattern;
      
      if (pattern === 'wander' && !pokemon.wanderCenter) {
        pokemon.wanderCenter = { x: pokemon.x, y: pokemon.y };
        pokemon.wanderRadius = pokemon.wanderRadius || 128;
      }
      
      count++;
    });
    
    console.log(`✅ [OverworldPokemonManager] ${count} Pokémon mis à jour avec pattern ${pattern}`);
  }

  /**
   * Crée une "tempête" de mouvements (tous les Pokémon bougent)
   */
  createMovementStorm(duration: number = 10000): void {
    console.log(`🌪️ [OverworldPokemonManager] Tempête de mouvements pendant ${duration}ms`);
    
    this.overworldPokemon.forEach(pokemon => {
      // Forcer le mouvement immédiat
      pokemon.lastMoveTime = Date.now() - 10000;
      
      // Temporairement rendre tous les Pokémon "actifs"
      pokemon.personality = 'active';
      pokemon.directionChangeChance = 0.3;
      pokemon.pauseChance = 0.02;
    });
    
    // Restaurer après la durée
    setTimeout(() => {
      this.overworldPokemon.forEach(pokemon => {
        // Remettre les valeurs par défaut ou celles de config
        pokemon.personality = 'calm';
        pokemon.directionChangeChance = 0.15;
        pokemon.pauseChance = 0.1;
      });
      console.log(`🌤️ [OverworldPokemonManager] Fin de la tempête de mouvements`);
    }, duration);
  }

  /**
   * Mode "parade" - tous les Pokémon se dirigent vers un point
   */
  createParade(targetX: number, targetY: number, areaId?: string): void {
    console.log(`🎪 [OverworldPokemonManager] Parade vers (${targetX}, ${targetY})`);
    
    this.overworldPokemon.forEach(pokemon => {
      if (!areaId || pokemon.areaId === areaId) {
        const dx = targetX - pokemon.x;
        const dy = targetY - pokemon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 32) { // Seulement si pas déjà proche
          const speed = pokemon.speed || 60;
          const moveDuration = Math.max(1000, distance / speed * 1000);

          pokemon.isMoving = true;
          pokemon.targetX = targetX + (Math.random() - 0.5) * 64; // Un peu de variation
          pokemon.targetY = targetY + (Math.random() - 0.5) * 64;
          pokemon.moveStartTime = Date.now();
          pokemon.moveDuration = moveDuration;
          pokemon.direction = this.getDirectionToTarget(pokemon.x, pokemon.y, pokemon.targetX, pokemon.targetY);
          
          this.broadcastPokemonUpdate(pokemon);
        }
      }
    });
  }

  /**
   * Obtient les Pokémon par personnalité
   */
  getPokemonByPersonality(personality: 'calm' | 'active' | 'erratic' | 'lazy'): OverworldPokemonData[] {
    return Array.from(this.overworldPokemon.values()).filter(pokemon => pokemon.personality === personality);
  }

  /**
   * Teste les différents patterns de mouvement
   */
  testMovementPatterns(): void {
    console.log(`🧪 [OverworldPokemonManager] Test des patterns de mouvement`);
    
    const patterns = ['random', 'wander', 'float', 'patrol'];
    let index = 0;
    
    this.overworldPokemon.forEach(pokemon => {
      const oldPattern = pokemon.movePattern;
      pokemon.movePattern = patterns[index % patterns.length] as any;
      pokemon.lastMoveTime = Date.now() - 3000; // Force mouvement immédiat
      
      console.log(`  🔄 ${pokemon.name}: ${oldPattern} → ${pokemon.movePattern}`);
      index++;
    });
  }

  stopAllMovements(): void {
    console.log(`⏸️ [OverworldPokemonManager] Arrêt de tous les mouvements`);
    this.overworldPokemon.forEach(pokemon => {
      if (pokemon.isMoving) {
        if (pokemon.targetX !== undefined && pokemon.targetY !== undefined) {
          pokemon.x = pokemon.targetX;
          pokemon.y = pokemon.targetY;
        }
        pokemon.isMoving = false;
        pokemon.lastDirectionFrame = pokemon.direction;
        this.broadcastPokemonUpdate(pokemon);
      }
    });
  }

  resumeAllMovements(): void {
    console.log(`▶️ [OverworldPokemonManager] Reprise de tous les mouvements`);
    this.overworldPokemon.forEach(pokemon => {
      if (!pokemon.isMoving) {
        pokemon.lastMoveTime = Date.now() - 2000;
      }
    });
  }

  setGlobalSpeed(speedMultiplier: number): void {
    console.log(`🏃‍♂️ [OverworldPokemonManager] Changement vitesse globale: x${speedMultiplier}`);
    this.overworldPokemon.forEach(pokemon => {
      pokemon.speed = (pokemon.speed || 60) * speedMultiplier;
      if (pokemon.moveDuration && pokemon.isMoving) {
        pokemon.moveDuration = Math.max(500, pokemon.moveDuration / speedMultiplier);
      }
    });
  }

  getMovingPokemon(): OverworldPokemonData[] {
    return Array.from(this.overworldPokemon.values()).filter(pokemon => pokemon.isMoving);
  }

  getIdlePokemon(): OverworldPokemonData[] {
    return Array.from(this.overworldPokemon.values()).filter(pokemon => !pokemon.isMoving);
  }

  forcePokemonMovement(pokemonId: string, direction?: string): void {
    const pokemon = this.overworldPokemon.get(pokemonId);
    if (!pokemon) {
      console.warn(`⚠️ [OverworldPokemonManager] Pokémon ${pokemonId} non trouvé`);
      return;
    }
    
    if (direction && [...this.directions, ...this.diagonalDirections].includes(direction)) {
      pokemon.direction = direction;
    }
    
    let target: {x: number, y: number};
    switch (pokemon.movePattern) {
      case 'wander':
        target = this.calculateWanderTarget(pokemon);
        break;
      case 'float':
        target = this.calculateFloatTarget(pokemon);
        break;
      default:
        target = this.calculateFluidMovementTarget(pokemon);
        break;
    }
    
    const dx = target.x - pokemon.x;
    const dy = target.y - pokemon.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = pokemon.speed || 60;
    const moveDuration = Math.max(800, distance / speed * 1000);

    pokemon.isMoving = true;
    pokemon.targetX = target.x;
    pokemon.targetY = target.y;
    pokemon.moveStartTime = Date.now();
    pokemon.moveDuration = moveDuration;
    pokemon.lastMoveTime = Date.now();
    
    this.broadcastPokemonUpdate(pokemon);
    console.log(`🎯 [OverworldPokemonManager] Mouvement forcé: ${pokemon.name} (${pokemon.personality}) vers ${direction || pokemon.direction}`);
  }

  teleportPokemon(pokemonId: string, x: number, y: number): void {
    const pokemon = this.overworldPokemon.get(pokemonId);
    if (!pokemon) {
      console.warn(`⚠️ [OverworldPokemonManager] Pokémon ${pokemonId} non trouvé`);
      return;
    }
    
    if (!this.isPositionValid(x, y, pokemon.boundaries)) {
      console.warn(`⚠️ [OverworldPokemonManager] Position (${x}, ${y}) hors limites pour ${pokemon.name}`);
      return;
    }
    
    pokemon.x = x;
    pokemon.y = y;
    pokemon.targetX = x;
    pokemon.targetY = y;
    pokemon.isMoving = false;
    
    if (pokemon.movePattern === 'wander') {
      pokemon.wanderCenter = { x, y };
    }
    
    this.broadcastPokemonUpdate(pokemon);
    console.log(`📍 [OverworldPokemonManager] ${pokemon.name} téléporté à (${x}, ${y})`);
  }

  changeZoneAnimation(areaId: string, newAnimation: AnimationType): void {
    console.log(`🎬 [OverworldPokemonManager] Changement animation zone ${areaId}: ${newAnimation}`);
    let count = 0;
    this.overworldPokemon.forEach(pokemon => {
      if (pokemon.areaId === areaId && pokemon.animations[newAnimation]) {
        pokemon.currentAnimation = newAnimation;
        this.broadcastPokemonUpdate(pokemon);
        count++;
      }
    });
    console.log(`✅ [OverworldPokemonManager] ${count} Pokémon mis à jour dans ${areaId}`);
  }
}
