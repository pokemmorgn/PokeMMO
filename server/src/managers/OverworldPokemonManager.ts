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
  movePattern: 'random' | 'patrol' | 'circle';
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
}

export interface OverworldPokemonConfig {
  pokemonId: number;
  name: string;
  spawnChance: number;
  maxCount: number;
  isShiny: boolean;
  movePattern: 'random' | 'patrol' | 'circle';
  speed: number;
  animations: {
    idle: string;
    walk: string;
    sleep: string;
  };
  currentAnimation: AnimationType;
  patrolPoints?: Array<{x: number, y: number}>;
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
  private updateInterval: number = 1000;
  private lastSpawnCheck: number = Date.now();
  private directions: string[] = ['up', 'down', 'left', 'right'];
  private updateLoop: NodeJS.Timeout | null = null;
  private spawnLoop: NodeJS.Timeout | null = null;
  
  constructor(room: any) {
    this.room = room;
    this.loadConfig();
    console.log("🌍 [OverworldPokemonManager] Initialisé avec mouvement fluide");
  }

  private loadConfig(): void {
    try {
      const configPath = path.join(__dirname, '../config/overworldPokemonConfig.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(configData);
      this.updateInterval = this.config.globalSettings?.updateInterval || 1000;
      console.log(`📋 [OverworldPokemonManager] Configuration chargée: ${Object.keys(this.config.areas).length} zones`);
      Object.entries(this.config.areas).forEach(([areaId, area]: [string, any]) => {
        console.log(`🏞️ Zone ${areaId}: ${area.pokemon.length} types de Pokémon`);
        area.pokemon.forEach((pokemon: any) => {
          console.log(`  🐾 ${pokemon.name} (ID: ${pokemon.pokemonId}) - Animation: ${pokemon.currentAnimation}`);
        });
      });
    } catch (error) {
      console.error('❌ [OverworldPokemonManager] Erreur chargement config:', error);
      this.config = { areas: {}, globalSettings: { updateInterval: 1000 } };
    }
  }

  private calculateFluidMovementTarget(pokemon: OverworldPokemonData): {x: number, y: number} {
    const moveDistance = 32;
    let targetX = pokemon.x;
    let targetY = pokemon.y;
    switch (pokemon.direction) {
      case 'up':
        targetY -= moveDistance;
        break;
      case 'down':
        targetY += moveDistance;
        break;
      case 'left':
        targetX -= moveDistance;
        break;
      case 'right':
        targetX += moveDistance;
        break;
    }
    if (!this.isPositionValid(targetX, targetY, pokemon.boundaries)) {
      const newDirection = this.directions[Math.floor(Math.random() * this.directions.length)];
      pokemon.direction = newDirection;
      return this.calculateFluidMovementTarget(pokemon);
    }
    return { x: targetX, y: targetY };
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
    console.log("🚀 [OverworldPokemonManager] Démarrage du système");
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
    const x = areaConfig.boundaries.minX + Math.random() * (areaConfig.boundaries.maxX - areaConfig.boundaries.minX);
    const y = areaConfig.boundaries.minY + Math.random() * (areaConfig.boundaries.maxY - areaConfig.boundaries.minY);
    const direction = this.directions[Math.floor(Math.random() * this.directions.length)];
    const pokemon: OverworldPokemonData = {
      id,
      pokemonId: config.pokemonId,
      name: config.name,
      x,
      y,
      direction,
      isMoving: false,
      isShiny: config.isShiny || (Math.random() < 0.001),
      spawnTime: Date.now(),
      lastMoveTime: Date.now(),
      speed: config.speed,
      movePattern: config.movePattern,
      patrolPoints: config.patrolPoints,
      currentPatrolIndex: 0,
      areaId: areaId,
      boundaries: areaConfig.boundaries,
      animations: config.animations,
      currentAnimation: config.currentAnimation,
      targetX: x,
      targetY: y,
      moveStartTime: Date.now(),
      moveDuration: 1000,
      lastDirectionFrame: direction
    };
    this.overworldPokemon.set(id, pokemon);
    console.log(`🐾 [OverworldPokemonManager] ${config.name} spawné dans ${areaId} à (${x}, ${y})`);
    this.broadcastPokemonSpawn(pokemon);
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
      case 'patrol':
        this.updatePatrolMovement(pokemon, timeSinceLastMove, deltaTime);
        break;
      case 'circle':
        this.updateRandomMovement(pokemon, timeSinceLastMove, deltaTime);
        break;
    }
  }

  private updateRandomMovement(pokemon: OverworldPokemonData, timeSinceLastMove: number, deltaTime: number): void {
    const moveInterval = 2000 + Math.random() * 3000;
    const moveDuration = 1000 + Math.random() * 1000;
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
        console.log(`🎯 [OverworldPokemonManager] ${pokemon.name} arrivé à destination (${pokemon.x}, ${pokemon.y})`);
      } else {
        if (Math.random() < 0.1) {
          this.broadcastPokemonUpdate(pokemon);
        }
      }
    } else {
      if (timeSinceLastMove > moveInterval) {
        const target = this.calculateFluidMovementTarget(pokemon);
        pokemon.isMoving = true;
        pokemon.targetX = target.x;
        pokemon.targetY = target.y;
        pokemon.moveStartTime = Date.now();
        pokemon.moveDuration = moveDuration;
        pokemon.lastMoveTime = Date.now();
        console.log(`🚀 [OverworldPokemonManager] ${pokemon.name} commence mouvement: (${pokemon.x}, ${pokemon.y}) → (${target.x}, ${target.y})`);
        this.broadcastPokemonUpdate(pokemon);
      }
    }
  }

  private updatePatrolMovement(pokemon: OverworldPokemonData, timeSinceLastMove: number, deltaTime: number): void {
    if (!pokemon.patrolPoints || pokemon.patrolPoints.length === 0) {
      this.updateRandomMovement(pokemon, timeSinceLastMove, deltaTime);
      return;
    }
    const targetPoint = pokemon.patrolPoints[pokemon.currentPatrolIndex || 0];
    if (pokemon.isMoving) {
      const dx = targetPoint.x - pokemon.x;
      const dy = targetPoint.y - pokemon.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 5) {
        pokemon.x = targetPoint.x;
        pokemon.y = targetPoint.y;
        pokemon.isMoving = false;
        pokemon.lastMoveTime = Date.now();
        pokemon.currentPatrolIndex = ((pokemon.currentPatrolIndex || 0) + 1) % pokemon.patrolPoints.length;
        this.broadcastPokemonUpdate(pokemon);
        console.log(`🎯 [OverworldPokemonManager] ${pokemon.name} a atteint le point de patrouille ${pokemon.currentPatrolIndex}`);
      } else {
        const moveSpeed = (pokemon.speed * deltaTime) / 1000;
        const ratio = Math.min(moveSpeed / distance, 1);
        pokemon.x += dx * ratio;
        pokemon.y += dy * ratio;
        pokemon.direction = this.getDirectionToTarget(pokemon.x, pokemon.y, targetPoint.x, targetPoint.y);
        if (Math.random() < 0.05) {
          this.broadcastPokemonUpdate(pokemon);
        }
      }
    } else {
      const pauseDuration = 1000 + Math.random() * 2000;
      if (timeSinceLastMove > pauseDuration) {
        pokemon.isMoving = true;
        pokemon.direction = this.getDirectionToTarget(pokemon.x, pokemon.y, targetPoint.x, targetPoint.y);
        pokemon.lastMoveTime = Date.now();
        this.broadcastPokemonUpdate(pokemon);
      }
    }
  }

  private calculateNewPosition(x: number, y: number, direction: string, distance: number): { x: number, y: number } {
    switch (direction) {
      case 'up':
        return { x, y: y - distance };
      case 'down':
        return { x, y: y + distance };
      case 'left':
        return { x: x - distance, y };
      case 'right':
        return { x: x + distance, y };
      default:
        return { x, y };
    }
  }

  private getDirectionToTarget(fromX: number, fromY: number, toX: number, toY: number): string {
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
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
        lastDirectionFrame: pokemon.lastDirectionFrame
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
        lastDirectionFrame: pokemon.lastDirectionFrame
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
        idle: 0
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
      if (pokemon.isMoving && pokemon.targetX !== undefined) {
        stats.fluidMovementStats.targeting++;
      } else if (pokemon.isMoving) {
        stats.fluidMovementStats.interpolating++;
      } else {
        stats.fluidMovementStats.idle++;
      }
    });
    return stats;
  }

  debug(): void {
    console.log(`🔍 [OverworldPokemonManager] === DEBUG OVERWORLD POKEMON (MOUVEMENT FLUIDE) ===`);
    const stats = this.getStats();
    console.log(`📊 Stats:`, stats);
    console.log(`🏞️ Zones configurées: ${Object.keys(this.config.areas).length}`);
    Object.entries(this.config.areas).forEach(([areaId, areaConfig]: [string, any]) => {
      console.log(`  📍 ${areaId}: ${areaConfig.pokemon.length} types configurés`);
      areaConfig.pokemon.forEach((config: any) => {
        const count = this.countPokemonInArea(areaId, config.pokemonId);
        console.log(`    🐾 ${config.name} (${config.pokemonId}): ${count}/${config.maxCount} - Anim: ${config.currentAnimation}`);
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
      console.log(`    Animation: ${pokemon.currentAnimation} | Dernière direction: ${pokemon.lastDirectionFrame}`);
      console.log(`    Progression mouvement: ${moveProgress}`);
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
      if (pokemon.moveDuration) {
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
    if (direction && this.directions.includes(direction)) {
      pokemon.direction = direction;
    }
    const target = this.calculateFluidMovementTarget(pokemon);
    pokemon.isMoving = true;
    pokemon.targetX = target.x;
    pokemon.targetY = target.y;
    pokemon.moveStartTime = Date.now();
    pokemon.moveDuration = 1500;
    pokemon.lastMoveTime = Date.now();
    this.broadcastPokemonUpdate(pokemon);
    console.log(`🎯 [OverworldPokemonManager] Mouvement forcé: ${pokemon.name} vers ${direction || pokemon.direction}`);
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
