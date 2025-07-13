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
  areaId: string;
  animations: {
    idle: string;
    walk: string;
  };
  currentAnimation: 'idle' | 'walk';
  targetX?: number;
  targetY?: number;
  moveStartTime?: number;
  moveDuration?: number;
  lastMoveTime: number;
}

export interface PokemonConfig {
  pokemonId: number;
  name: string;
  count: number;
  animations: {
    idle: string;
    walk: string;
  };
  currentAnimation: 'idle' | 'walk';
  spawnPositions: Array<{x: number, y: number}>;
}

export interface AreaConfig {
  name: string;
  maxPokemon: number;
  spawnInterval: number;
  pokemon: PokemonConfig[];
}

export class OverworldPokemonManager {
  private room: any;
  private overworldPokemon: Map<string, OverworldPokemonData> = new Map();
  private config: any;
  private updateInterval: number = 200;
  private moveInterval: number = 2500;
  private gridSize: number = 32;
  private directions: string[] = ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right'];
  private updateLoop: NodeJS.Timeout | null = null;
  private spawnLoop: NodeJS.Timeout | null = null;
  
  constructor(room: any) {
    this.room = room;
    this.loadConfig();

      // ✅ AJOUTER CETTE LIGNE POUR DEBUG
  console.log(`🔍 [DEBUG] Config après chargement:`, {
    hasAreas: !!this.config.areas,
    areaCount: Object.keys(this.config.areas || {}).length,
    hasVillage: !!this.config.areas?.village,
    villageConfig: this.config.areas?.village
  });
    console.log("🌍 [OverworldPokemonManager] Initialisé - Système case par case");
  }

  private loadConfig(): void {
    try {
      const configPath = path.join(__dirname, '../config/overworldPokemonConfig.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(configData);
      
      this.updateInterval = this.config.globalSettings?.updateInterval || 200;
      this.moveInterval = this.config.globalSettings?.moveInterval || 2500;
      this.gridSize = this.config.globalSettings?.gridSize || 32;
      
      console.log(`📋 [OverworldPokemonManager] Config chargée: ${Object.keys(this.config.areas).length} zones`);
      Object.entries(this.config.areas).forEach(([areaId, area]: [string, any]) => {
        console.log(`🏞️ Zone ${areaId}: ${area.pokemon.length} types de Pokémon`);
        area.pokemon.forEach((pokemon: any) => {
          console.log(`  🐾 ${pokemon.name} (ID: ${pokemon.pokemonId}) - Count: ${pokemon.count}`);
        });
      });
    } catch (error) {
      console.error('❌ [OverworldPokemonManager] Erreur chargement config:', error);
      this.config = { 
        areas: {},
        globalSettings: { 
          updateInterval: 200,
          moveInterval: 2500,
          gridSize: 32
        }
      };
    }
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

  start(): void {
    console.log("🚀 [OverworldPokemonManager] Démarrage - Mouvement case par case");
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
      this.updateAllPokemon();
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
    
    areaConfig.pokemon.forEach((pokemonConfig: PokemonConfig) => {
      const currentCount = this.countPokemonInArea(areaId, pokemonConfig.pokemonId);
      const needToSpawn = Math.max(0, pokemonConfig.count - currentCount);
      
      for (let i = 0; i < needToSpawn; i++) {
        this.spawnPokemon(areaId, pokemonConfig, i);
      }
    });
  }

  private spawnPokemon(areaId: string, config: PokemonConfig, index: number): void {
    const areaConfig = this.config.areas[areaId];
    if (!areaConfig) return;
    
    // Utiliser position prédéfinie ou fallback
    const spawnPos = config.spawnPositions[index] || config.spawnPositions[0] || { x: 400, y: 300 };
    
    const id = `overworld_${areaId}_${config.pokemonId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Vérifier que la position de spawn est libre côté client
    const spawnRequest = {
      type: "OVERWORLD_POKEMON_SPAWN_REQUEST",
      data: {
        id,
        pokemonId: config.pokemonId,
        name: config.name,
        areaId: areaId,
        x: spawnPos.x,
        y: spawnPos.y,
        direction: this.directions[Math.floor(Math.random() * this.directions.length)],
        isShiny: Math.random() < 0.001, // 0.1% chance
        animations: config.animations,
        currentAnimation: config.currentAnimation
      }
    };
    
    const clientsInZone = this.getClientsInZone(areaId);
    if (clientsInZone.length > 0) {
      clientsInZone[0].send("overworldPokemon", spawnRequest);
    }
  }

  public handleClientSpawnResponse(client: any, data: any): void {
    const { id, x, y, success } = data;
    
    if (!success) {
      console.warn(`⚠️ [OverworldPokemonManager] Position occupée pour ${id}, retry...`);
      // On pourrait retry avec une position différente ici
      return;
    }
    
    // Créer le Pokémon avec position validée
    const pokemon: OverworldPokemonData = {
      id: data.id,
      pokemonId: data.pokemonId,
      name: data.name,
      x: x,
      y: y,
      direction: data.direction,
      isMoving: false,
      isShiny: data.isShiny,
      areaId: data.areaId,
      animations: data.animations,
      currentAnimation: data.currentAnimation,
      targetX: x,
      targetY: y,
      moveStartTime: Date.now(),
      moveDuration: 1000,
      lastMoveTime: Date.now()
    };
    
    this.overworldPokemon.set(id, pokemon);
    console.log(`🐾 [OverworldPokemonManager] ${data.name} spawné à (${x}, ${y})`);
    
    // Broadcaster le spawn
    this.broadcastPokemonSpawn(pokemon);
  }

  private updateAllPokemon(): void {
    const now = Date.now();
    
    this.overworldPokemon.forEach((pokemon) => {
      this.updatePokemonMovement(pokemon, now);
    });
  }

  private updatePokemonMovement(pokemon: OverworldPokemonData, now: number): void {
    const timeSinceLastMove = now - pokemon.lastMoveTime;
    
    if (pokemon.isMoving) {
      // Vérifier si le mouvement est terminé
      const moveProgress = (now - (pokemon.moveStartTime || 0)) / (pokemon.moveDuration || 1000);
      
      if (moveProgress >= 1.0) {
        // Mouvement terminé
        pokemon.x = pokemon.targetX || pokemon.x;
        pokemon.y = pokemon.targetY || pokemon.y;
        pokemon.isMoving = false;
        pokemon.lastMoveTime = now;
        this.broadcastPokemonUpdate(pokemon);
        console.log(`🎯 [OverworldPokemonManager] ${pokemon.name} arrivé à (${pokemon.x}, ${pokemon.y})`);
      }
    } else {
      // Pokémon immobile, vérifier s'il doit bouger
      if (timeSinceLastMove > this.moveInterval + Math.random() * 1000) {
        this.startPokemonMovement(pokemon);
      }
    }
  }

  private startPokemonMovement(pokemon: OverworldPokemonData): void {
    // Choisir direction aléatoire
    const direction = this.directions[Math.floor(Math.random() * this.directions.length)];
    
    // Calculer position cible (case par case)
    const targetPos = this.calculateTargetPosition(pokemon.x, pokemon.y, direction);
    
    // Demander validation côté client
    const moveRequest = {
      type: "OVERWORLD_POKEMON_MOVE_REQUEST",
      data: {
        id: pokemon.id,
        fromX: pokemon.x,
        fromY: pokemon.y,
        toX: targetPos.x,
        toY: targetPos.y,
        direction: direction
      }
    };
    
    const clientsInZone = this.getClientsInZone(pokemon.areaId);
    if (clientsInZone.length > 0) {
      clientsInZone[0].send("overworldPokemon", moveRequest);
    }
  }

 public handleClientMoveResponse(client: any, data: any): void {
  const { id, success, toX, toY, direction } = data;
  const pokemon = this.overworldPokemon.get(id);
  
  if (!pokemon) return;
  
  if (success) {
    // ✅ Mouvement autorisé par le client
    pokemon.isMoving = true;
    pokemon.targetX = toX;
    pokemon.targetY = toY;
    pokemon.direction = direction;
    pokemon.moveStartTime = Date.now();
    pokemon.moveDuration = 800; // 800ms pour une case
    pokemon.lastMoveTime = Date.now();
    
    this.broadcastPokemonUpdate(pokemon);
    console.log(`🚀 [OverworldPokemonManager] ${pokemon.name}: (${pokemon.x}, ${pokemon.y}) → (${toX}, ${toY}) ${direction}`);
  } else {
    // ✅ MOUVEMENT BLOQUÉ - NE PAS BOUGER
    console.log(`🛡️ [OverworldPokemonManager] ${pokemon.name} bloqué par collision à (${toX}, ${toY})`);
    
    // Marquer comme immobile et attendre avant le prochain essai
    pokemon.isMoving = false;
    pokemon.lastMoveTime = Date.now() + 1000; // Attendre 1 seconde avant de re-essayer
    
    // ✅ BROADCASTER L'ÉTAT IMMOBILE
    this.broadcastPokemonUpdate(pokemon);
  }
}

  private calculateTargetPosition(x: number, y: number, direction: string): {x: number, y: number} {
    let targetX = x;
    let targetY = y;
    
    switch (direction) {
      case 'up':
        targetY -= this.gridSize;
        break;
      case 'down':
        targetY += this.gridSize;
        break;
      case 'left':
        targetX -= this.gridSize;
        break;
      case 'right':
        targetX += this.gridSize;
        break;
      case 'up-left':
        targetX -= this.gridSize;
        targetY -= this.gridSize;
        break;
      case 'up-right':
        targetX += this.gridSize;
        targetY -= this.gridSize;
        break;
      case 'down-left':
        targetX -= this.gridSize;
        targetY += this.gridSize;
        break;
      case 'down-right':
        targetX += this.gridSize;
        targetY += this.gridSize;
        break;
    }
    
    return { x: targetX, y: targetY };
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
        areaConfig.pokemon.forEach((pokemonConfig: PokemonConfig) => {
          const currentCount = this.countPokemonInArea(areaId, pokemonConfig.pokemonId);
          if (currentCount < pokemonConfig.count) {
            // Spawn manquant
            const missingIndex = currentCount;
            this.spawnPokemon(areaId, pokemonConfig, missingIndex);
          }
        });
      }
    });
  }

  private broadcastPokemonSpawn(pokemon: OverworldPokemonData): void {
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
        moveDuration: pokemon.moveDuration
      }
    };
    
    clientsInZone.forEach(client => {
      client.send("overworldPokemon", message);
    });
    console.log(`📤 [OverworldPokemonManager] Spawn ${pokemon.name} → ${clientsInZone.length} clients`);
  }

  private broadcastPokemonUpdate(pokemon: OverworldPokemonData): void {
    const clientsInZone = this.getClientsInZone(pokemon.areaId);
    if (clientsInZone.length === 0) return;
    
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
        moveDuration: pokemon.moveDuration
      }
    };
    
    clientsInZone.forEach(client => {
      client.send("overworldPokemon", message);
    });
  }

  private broadcastPokemonRemove(pokemonId: string, areaId: string): void {
    const clientsInZone = this.getClientsInZone(areaId);
    const message = {
      type: "OVERWORLD_POKEMON_REMOVE",
      data: { id: pokemonId }
    };
    
    clientsInZone.forEach(client => {
      client.send("overworldPokemon", message);
    });
    console.log(`🗑️ [OverworldPokemonManager] Remove ${pokemonId} → ${clientsInZone.length} clients`);
  }

  syncPokemonForClient(client: any): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;
    
    const playerZone = player.currentZone;
    console.log(`🔄 [OverworldPokemonManager] Sync pour ${client.sessionId} dans ${playerZone}`);
    
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
        moveDuration: pokemon.moveDuration
      }));
    
    client.send("overworldPokemon", {
      type: "OVERWORLD_POKEMON_SYNC",
      data: { pokemon: pokemonList }
    });
    
    console.log(`✅ [OverworldPokemonManager] ${pokemonList.length} Pokémon synchronisés`);
  }

  public onPlayerZoneChanged(sessionId: string, oldZone: string, newZone: string): void {
    console.log(`🔄 [OverworldPokemonManager] Joueur ${sessionId}: ${oldZone} → ${newZone}`);
    const client = this.room.clients.find((c: any) => c.sessionId === sessionId);
    if (!client) return;
    
    setTimeout(() => {
      this.syncPokemonForClient(client);
    }, 500);
  }

  removePokemon(pokemonId: string): void {
    const pokemon = this.overworldPokemon.get(pokemonId);
    if (pokemon) {
      console.log(`🗑️ [OverworldPokemonManager] Suppression: ${pokemonId}`);
      this.overworldPokemon.delete(pokemonId);
      this.broadcastPokemonRemove(pokemonId, pokemon.areaId);
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

  cleanup(): void {
    console.log(`🧹 [OverworldPokemonManager] Nettoyage de ${this.overworldPokemon.size} Pokémon`);
    this.overworldPokemon.forEach((pokemon) => {
      this.broadcastPokemonRemove(pokemon.id, pokemon.areaId);
    });
    this.overworldPokemon.clear();
  }

  getStats(): any {
    const stats = {
      totalPokemon: this.overworldPokemon.size,
      areas: {} as { [key: string]: number },
      movingPokemon: 0,
      shinyPokemon: 0
    };
    
    this.overworldPokemon.forEach(pokemon => {
      if (!stats.areas[pokemon.areaId]) {
        stats.areas[pokemon.areaId] = 0;
      }
      stats.areas[pokemon.areaId]++;
      
      if (pokemon.isMoving) stats.movingPokemon++;
      if (pokemon.isShiny) stats.shinyPokemon++;
    });
    
    return stats;
  }

  debug(): void {
    console.log(`🔍 [OverworldPokemonManager] === DEBUG SIMPLE ===`);
    const stats = this.getStats();
    console.log(`📊 Stats:`, stats);
    console.log(`⚙️ Settings: gridSize=${this.gridSize}px, moveInterval=${this.moveInterval}ms`);
    
    this.overworldPokemon.forEach((pokemon, id) => {
      console.log(`🐾 ${pokemon.name} (${id}): (${pokemon.x}, ${pokemon.y}) ${pokemon.direction} ${pokemon.isMoving ? 'BOUGE' : 'IDLE'}`);
    });
  }
}
