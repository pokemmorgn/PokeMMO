// ================================================================================================
// SERVER/SRC/MANAGERS/OVERWORLDPOKEMONMANAGER.TS - POKÉMON OVERWORLD SIMPLIFIÉ
// ================================================================================================

import * as fs from 'fs';
import * as path from 'path';

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
  currentAnimation: string;
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
  currentAnimation: string;
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
    console.log("🌍 [OverworldPokemonManager] Initialisé");
  }

  /**
   * Charge la configuration depuis le fichier JSON
   */
  private loadConfig(): void {
    try {
      const configPath = path.join(__dirname, '../config/overworldPokemonConfig.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(configData);
      
      this.updateInterval = this.config.globalSettings?.updateInterval || 1000;
      
      console.log(`📋 [OverworldPokemonManager] Configuration chargée: ${Object.keys(this.config.areas).length} zones`);
      
      // Debug des zones
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

  /**
   * Démarre le système
   */
  start(): void {
    console.log("🚀 [OverworldPokemonManager] Démarrage du système");
    
    // Spawn initial
    Object.keys(this.config.areas).forEach(areaId => {
      this.spawnPokemonInArea(areaId);
    });
    
    // Démarrer les boucles
    this.startUpdateLoop();
    this.startSpawnLoop();
  }

  /**
   * Arrête le système
   */
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

  /**
   * Boucle de mise à jour des mouvements
   */
  private startUpdateLoop(): void {
    this.updateLoop = setInterval(() => {
      const now = Date.now();
      const deltaTime = now - this.lastUpdateTime;
      
      this.updateAllPokemon(deltaTime);
      this.lastUpdateTime = now;
    }, this.updateInterval);
  }

  /**
   * Boucle de vérification des spawns
   */
  private startSpawnLoop(): void {
    this.spawnLoop = setInterval(() => {
      this.checkSpawns();
    }, 5000); // Vérifier toutes les 5 secondes
  }

  /**
   * Génère des Pokémon dans une zone
   */
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

  /**
   * Génère un Pokémon spécifique
   */
  private spawnPokemon(areaId: string, config: OverworldPokemonConfig): void {
    const areaConfig = this.config.areas[areaId];
    if (!areaConfig) return;
    
    const id = `overworld_${areaId}_${config.pokemonId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Position aléatoire dans les limites
    const x = areaConfig.boundaries.minX + Math.random() * (areaConfig.boundaries.maxX - areaConfig.boundaries.minX);
    const y = areaConfig.boundaries.minY + Math.random() * (areaConfig.boundaries.maxY - areaConfig.boundaries.minY);
    
    // Direction aléatoire
    const direction = this.directions[Math.floor(Math.random() * this.directions.length)];
    
    const pokemon: OverworldPokemonData = {
      id,
      pokemonId: config.pokemonId,
      name: config.name,
      x,
      y,
      direction,
      isMoving: false,
      isShiny: config.isShiny || (Math.random() < 0.001), // 0.1% chance shiny
      spawnTime: Date.now(),
      lastMoveTime: Date.now(),
      speed: config.speed,
      movePattern: config.movePattern,
      patrolPoints: config.patrolPoints,
      currentPatrolIndex: 0,
      areaId: areaId,
      boundaries: areaConfig.boundaries,
      animations: config.animations,
      currentAnimation: config.currentAnimation
    };
    
    this.overworldPokemon.set(id, pokemon);
    
    console.log(`🐾 [OverworldPokemonManager] ${config.name} spawné dans ${areaId} (animation: ${pokemon.currentAnimation})`);
    
    // Notifier les clients
    this.broadcastPokemonSpawn(pokemon);
  }

  /**
   * Met à jour tous les Pokémon
   */
  private updateAllPokemon(deltaTime: number): void {
    this.overworldPokemon.forEach((pokemon, id) => {
      this.updatePokemonMovement(pokemon, deltaTime);
    });
  }

  /**
   * Met à jour le mouvement d'un Pokémon
   */
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
        this.updateRandomMovement(pokemon, timeSinceLastMove, deltaTime); // Fallback
        break;
    }
  }

  /**
   * Mouvement aléatoire
   */
  private updateRandomMovement(pokemon: OverworldPokemonData, timeSinceLastMove: number, deltaTime: number): void {
    const moveInterval = 2000 + Math.random() * 3000; // 2-5 secondes
    const stopInterval = 1000 + Math.random() * 2000; // 1-3 secondes
    
    if (pokemon.isMoving) {
      // Calculer la nouvelle position
      const moveDistance = (pokemon.speed * deltaTime) / 1000;
      const newPos = this.calculateNewPosition(pokemon.x, pokemon.y, pokemon.direction, moveDistance);
      
      // Vérifier les limites
      if (this.isPositionValid(newPos.x, newPos.y, pokemon.boundaries)) {
        pokemon.x = newPos.x;
        pokemon.y = newPos.y;
        
        // Notifier les clients
        this.broadcastPokemonUpdate(pokemon);
      } else {
        // Changer de direction si on atteint une limite
        pokemon.direction = this.directions[Math.floor(Math.random() * this.directions.length)];
        this.broadcastPokemonUpdate(pokemon);
      }
      
      // Arrêter après un certain temps
      if (timeSinceLastMove > stopInterval) {
        pokemon.isMoving = false;
        pokemon.lastMoveTime = Date.now();
        this.broadcastPokemonUpdate(pokemon);
      }
    } else {
      // Commencer à bouger après un certain temps
      if (timeSinceLastMove > moveInterval) {
        pokemon.isMoving = true;
        pokemon.direction = this.directions[Math.floor(Math.random() * this.directions.length)];
        pokemon.lastMoveTime = Date.now();
        this.broadcastPokemonUpdate(pokemon);
      }
    }
  }

  /**
   * Mouvement en patrouille
   */
  private updatePatrolMovement(pokemon: OverworldPokemonData, timeSinceLastMove: number, deltaTime: number): void {
    if (!pokemon.patrolPoints || pokemon.patrolPoints.length === 0) {
      this.updateRandomMovement(pokemon, timeSinceLastMove, deltaTime);
      return;
    }
    
    const targetPoint = pokemon.patrolPoints[pokemon.currentPatrolIndex || 0];
    const dx = targetPoint.x - pokemon.x;
    const dy = targetPoint.y - pokemon.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      // Se diriger vers le point cible
      pokemon.isMoving = true;
      pokemon.direction = this.getDirectionToTarget(pokemon.x, pokemon.y, targetPoint.x, targetPoint.y);
      
      const moveDistance = (pokemon.speed * deltaTime) / 1000;
      const ratio = Math.min(moveDistance / distance, 1);
      
      pokemon.x += dx * ratio;
      pokemon.y += dy * ratio;
      
      this.broadcastPokemonUpdate(pokemon);
    } else {
      // Point atteint, passer au suivant
      pokemon.currentPatrolIndex = ((pokemon.currentPatrolIndex || 0) + 1) % pokemon.patrolPoints.length;
      pokemon.isMoving = false;
      pokemon.lastMoveTime = Date.now();
      
      // Petite pause avant le prochain mouvement
      setTimeout(() => {
        if (this.overworldPokemon.has(pokemon.id)) {
          pokemon.isMoving = true;
          this.broadcastPokemonUpdate(pokemon);
        }
      }, 1000 + Math.random() * 2000);
    }
  }

  /**
   * Calcule une nouvelle position selon la direction
   */
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

  /**
   * Détermine la direction vers une cible
   */
  private getDirectionToTarget(fromX: number, fromY: number, toX: number, toY: number): string {
    const dx = toX - fromX;
    const dy = toY - fromY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }

  /**
   * Vérifie si une position est valide dans les limites
   */
  private isPositionValid(x: number, y: number, boundaries: any): boolean {
    return x >= boundaries.minX && x <= boundaries.maxX && 
           y >= boundaries.minY && y <= boundaries.maxY;
  }

  /**
   * Compte les Pokémon dans une zone
   */
  private countPokemonInArea(areaId: string, pokemonId?: number): number {
    let count = 0;
    this.overworldPokemon.forEach(pokemon => {
      if (pokemon.areaId === areaId && (!pokemonId || pokemon.pokemonId === pokemonId)) {
        count++;
      }
    });
    return count;
  }

  /**
   * Vérifie les spawns nécessaires
   */
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

  /**
   * Diffuse la création d'un Pokémon
   */
  private broadcastPokemonSpawn(pokemon: OverworldPokemonData): void {
    this.room.broadcast("overworldPokemon", {
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
        currentAnimation: pokemon.currentAnimation
      }
    });
  }

  /**
   * Diffuse la mise à jour d'un Pokémon
   */
  private broadcastPokemonUpdate(pokemon: OverworldPokemonData): void {
    this.room.broadcast("overworldPokemon", {
      type: "OVERWORLD_POKEMON_UPDATE",
      data: {
        id: pokemon.id,
        x: pokemon.x,
        y: pokemon.y,
        direction: pokemon.direction,
        isMoving: pokemon.isMoving,
        currentAnimation: pokemon.currentAnimation
      }
    });
  }

  /**
   * Diffuse la suppression d'un Pokémon
   */
  private broadcastPokemonRemove(pokemonId: string): void {
    this.room.broadcast("overworldPokemon", {
      type: "OVERWORLD_POKEMON_REMOVE",
      data: {
        id: pokemonId
      }
    });
  }

  /**
   * Synchronise tous les Pokémon pour un nouveau client
   */
  syncPokemonForClient(client: any): void {
    const pokemonList = Array.from(this.overworldPokemon.values()).map(pokemon => ({
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
      currentAnimation: pokemon.currentAnimation
    }));
    
    client.send("overworldPokemon", {
      type: "OVERWORLD_POKEMON_SYNC",
      data: {
        pokemon: pokemonList
      }
    });
    
    console.log(`🔄 [OverworldPokemonManager] Synchronisation de ${pokemonList.length} Pokémon pour nouveau client`);
  }

  /**
   * Supprime un Pokémon
   */
  removePokemon(pokemonId: string): void {
    if (this.overworldPokemon.has(pokemonId)) {
      console.log(`🗑️ [OverworldPokemonManager] Suppression Pokémon: ${pokemonId}`);
      this.overworldPokemon.delete(pokemonId);
      this.broadcastPokemonRemove(pokemonId);
    }
  }

  /**
   * Supprime tous les Pokémon d'une zone
   */
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

  /**
   * Force le spawn d'un Pokémon spécifique
   */
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
    
    // Créer une copie avec position spécifique si fournie
    const spawnConfig = { ...pokemonConfig };
    if (x !== undefined && y !== undefined) {
      // Temporairement modifier les boundaries pour forcer la position
      const originalBoundaries = areaConfig.boundaries;
      areaConfig.boundaries = { minX: x, maxX: x, minY: y, maxY: y };
      
      this.spawnPokemon(areaId, spawnConfig);
      
      // Restaurer les boundaries
      areaConfig.boundaries = originalBoundaries;
    } else {
      this.spawnPokemon(areaId, spawnConfig);
    }
    
    console.log(`🎯 [OverworldPokemonManager] Force spawn: ${pokemonConfig.name} dans ${areaId}`);
  }

  /**
   * Nettoie tous les Pokémon
   */
  cleanup(): void {
    console.log(`🧹 [OverworldPokemonManager] Nettoyage de ${this.overworldPokemon.size} Pokémon overworld`);
    
    this.overworldPokemon.forEach((pokemon, id) => {
      this.broadcastPokemonRemove(id);
    });
    
    this.overworldPokemon.clear();
  }

  /**
   * Statistiques du système
   */
  getStats(): any {
    const stats = {
      totalPokemon: this.overworldPokemon.size,
      areas: {} as { [key: string]: number },
      pokemonByType: {} as { [key: number]: number },
      movingPokemon: 0,
      shinyPokemon: 0
    };
    
    this.overworldPokemon.forEach(pokemon => {
      // Stats par zone
      if (!stats.areas[pokemon.areaId]) {
        stats.areas[pokemon.areaId] = 0;
      }
      stats.areas[pokemon.areaId]++;
      
      // Stats par type
      if (!stats.pokemonByType[pokemon.pokemonId]) {
        stats.pokemonByType[pokemon.pokemonId] = 0;
      }
      stats.pokemonByType[pokemon.pokemonId]++;
      
      // Stats mouvement et shiny
      if (pokemon.isMoving) stats.movingPokemon++;
      if (pokemon.isShiny) stats.shinyPokemon++;
    });
    
    return stats;
  }

  /**
   * Debug complet
   */
  debug(): void {
    console.log(`🔍 [OverworldPokemonManager] === DEBUG OVERWORLD POKEMON ===`);
    console.log(`📊 Stats:`, this.getStats());
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
      console.log(`  ${id}: ${pokemon.name} dans ${pokemon.areaId} à (${pokemon.x.toFixed(1)}, ${pokemon.y.toFixed(1)}) - ${pokemon.isMoving ? 'Bouge' : 'Immobile'} ${pokemon.direction} - Anim: ${pokemon.currentAnimation}`);
    });
  }
}
