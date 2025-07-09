// ================================================================================================
// SERVER/SRC/MANAGERS/OVERWORLDPOKEMONMANAGER.TS - POKÉMON OVERWORLD AVEC MOUVEMENT FLUIDE
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
  
  // ✅ NOUVELLES PROPRIÉTÉS POUR MOUVEMENT FLUIDE
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
    console.log("🌍 [OverworldPokemonManager] Initialisé avec mouvement fluide");
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
   * ✅ NOUVEAU: Calcule une position cible pour mouvement fluide
   */
  private calculateFluidMovementTarget(pokemon: OverworldPokemonData): {x: number, y: number} {
    // Distance de mouvement (par exemple 32 pixels = 1 case)
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
    
    // Vérifier les limites
    if (!this.isPositionValid(targetX, targetY, pokemon.boundaries)) {
      // Si la position n'est pas valide, changer de direction
      const newDirection = this.directions[Math.floor(Math.random() * this.directions.length)];
      pokemon.direction = newDirection;
      return this.calculateFluidMovementTarget(pokemon); // Récursion pour nouvelle direction
    }
    
    return { x: targetX, y: targetY };
  }

  /**
   * ✅ NOUVEAU: Obtient les clients dans une zone spécifique
   */
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

  /**
   * ✅ NOUVEAU: Extrait la zone depuis l'ID d'un Pokémon
   */
  private extractAreaFromPokemonId(pokemonId: string): string | null {
    // Format: overworld_ZONE_pokemonId_timestamp_random
    // Exemple: overworld_village_17_1752093358731_t6y5r6
    const parts = pokemonId.split('_');
    if (parts.length >= 3 && parts[0] === 'overworld') {
      return parts[1]; // La zone est en position 1
    }
    return null;
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
   * ✅ MÉTHODE MODIFIÉE: Génère un Pokémon avec mouvement fluide
   */
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
      
      // ✅ NOUVELLES PROPRIÉTÉS INITIALISÉES
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
   * ✅ MÉTHODE MODIFIÉE: Mouvement aléatoire fluide
   */
  private updateRandomMovement(pokemon: OverworldPokemonData, timeSinceLastMove: number, deltaTime: number): void {
    const moveInterval = 2000 + Math.random() * 3000; // 2-5 secondes d'immobilité
    const moveDuration = 1000 + Math.random() * 1000; // 1-2 secondes de mouvement
    
    if (pokemon.isMoving) {
      // ✅ VÉRIFIER SI LE MOUVEMENT EST TERMINÉ
      const moveProgress = (Date.now() - (pokemon.moveStartTime || 0)) / (pokemon.moveDuration || 1000);
      
      if (moveProgress >= 1.0) {
        // ✅ MOUVEMENT TERMINÉ - ARRIVER À LA POSITION CIBLE
        if (pokemon.targetX !== undefined && pokemon.targetY !== undefined) {
          pokemon.x = pokemon.targetX;
          pokemon.y = pokemon.targetY;
        }
        
        // ✅ PASSER EN IDLE AVEC LA BONNE DIRECTION
        pokemon.isMoving = false;
        pokemon.lastMoveTime = Date.now();
        pokemon.lastDirectionFrame = pokemon.direction; // Mémoriser la direction
        
        // ✅ ENVOYER UPDATE FINAL AVEC POSITION EXACTE
        this.broadcastPokemonUpdate(pokemon);
        
        console.log(`🎯 [OverworldPokemonManager] ${pokemon.name} arrivé à destination (${pokemon.x}, ${pokemon.y})`);
      } else {
        // ✅ MOUVEMENT EN COURS - ENVOYER UPDATE PÉRIODIQUE (MOINS FRÉQUENT)
        if (Math.random() < 0.1) { // 10% de chance par update
          this.broadcastPokemonUpdate(pokemon);
        }
      }
    } else {
      // ✅ POKÉMON IMMOBILE - VÉRIFIER S'IL FAUT COMMENCER À BOUGER
      if (timeSinceLastMove > moveInterval) {
        // ✅ COMMENCER UN NOUVEAU MOUVEMENT
        const target = this.calculateFluidMovementTarget(pokemon);
        
        pokemon.isMoving = true;
        pokemon.targetX = target.x;
        pokemon.targetY = target.y;
        pokemon.moveStartTime = Date.now();
        pokemon.moveDuration = moveDuration;
        pokemon.lastMoveTime = Date.now();
        
        console.log(`🚀 [OverworldPokemonManager] ${pokemon.name} commence mouvement: (${pokemon.x}, ${pokemon.y}) → (${target.x}, ${target.y})`);
        
        // ✅ ENVOYER UPDATE DE DÉBUT DE MOUVEMENT
        this.broadcastPokemonUpdate(pokemon);
      }
    }
  }

  /**
   * ✅ MÉTHODE MODIFIÉE: Mouvement en patrouille fluide
   */
  private updatePatrolMovement(pokemon: OverworldPokemonData, timeSinceLastMove: number, deltaTime: number): void {
    if (!pokemon.patrolPoints || pokemon.patrolPoints.length === 0) {
      this.updateRandomMovement(pokemon, timeSinceLastMove, deltaTime);
      return;
    }
    
    const targetPoint = pokemon.patrolPoints[pokemon.currentPatrolIndex || 0];
    
    if (pokemon.isMoving) {
      // ✅ VÉRIFIER SI ARRIVÉ AU POINT DE PATROUILLE
      const dx = targetPoint.x - pokemon.x;
      const dy = targetPoint.y - pokemon.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 5) {
        // ✅ POINT ATTEINT
        pokemon.x = targetPoint.x;
        pokemon.y = targetPoint.y;
        pokemon.isMoving = false;
        pokemon.lastMoveTime = Date.now();
        
        // ✅ PASSER AU POINT SUIVANT
        pokemon.currentPatrolIndex = ((pokemon.currentPatrolIndex || 0) + 1) % pokemon.patrolPoints.length;
        
        this.broadcastPokemonUpdate(pokemon);
        
        console.log(`🎯 [OverworldPokemonManager] ${pokemon.name} a atteint le point de patrouille ${pokemon.currentPatrolIndex}`);
      } else {
        // ✅ CONTINUER VERS LE POINT
        const moveSpeed = (pokemon.speed * deltaTime) / 1000;
        const ratio = Math.min(moveSpeed / distance, 1);
        
        pokemon.x += dx * ratio;
        pokemon.y += dy * ratio;
        pokemon.direction = this.getDirectionToTarget(pokemon.x, pokemon.y, targetPoint.x, targetPoint.y);
        
        // Update périodique
        if (Math.random() < 0.05) {
          this.broadcastPokemonUpdate(pokemon);
        }
      }
    } else {
      // ✅ PAUSE ENTRE LES POINTS
      const pauseDuration = 1000 + Math.random() * 2000; // 1-3 secondes
      
      if (timeSinceLastMove > pauseDuration) {
        // ✅ COMMENCER LE MOUVEMENT VERS LE PROCHAIN POINT
        pokemon.isMoving = true;
        pokemon.direction = this.getDirectionToTarget(pokemon.x, pokemon.y, targetPoint.x, targetPoint.y);
        pokemon.lastMoveTime = Date.now();
        
        this.broadcastPokemonUpdate(pokemon);
      }
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
   * ✅ MODIFIÉ: Diffuse la création d'un Pokémon avec mouvement fluide
   */
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
        // ✅ NOUVELLES DONNÉES MOUVEMENT FLUIDE
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

  /**
   * ✅ MODIFIÉ: Diffuse la mise à jour avec informations de mouvement fluide
   */
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
        
        // ✅ NOUVELLES DONNÉES POUR MOUVEMENT FLUIDE
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
    
    // Log réduit pour éviter le spam
    if (Math.random() < 0.001) {
      console.log(`📤 [OverworldPokemonManager] Update ${pokemon.name} envoyé à ${clientsInZone.length} clients dans ${pokemon.areaId}`);
    }
  }

  /**
   * ✅ MODIFIÉ: Diffuse la suppression d'un Pokémon (filtré par zone)
   */
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

  /**
   * ✅ MODIFIÉ: Synchronise tous les Pokémon pour un nouveau client (filtré par zone)
   */
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
        // ✅ DONNÉES MOUVEMENT FLUIDE
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

  /**
   * ✅ NOUVEAU: Gère les changements de zone d'un joueur
   */
  public onPlayerZoneChanged(sessionId: string, oldZone: string, newZone: string): void {
    console.log(`🔄 [OverworldPokemonManager] Joueur ${sessionId}: ${oldZone} → ${newZone}`);
    
    const client = this.room.clients.find((c: any) => c.sessionId === sessionId);
    if (!client) return;
    
    // Supprimer tous les Pokémon de l'ancienne zone côté client
    this.clearPokemonForClient(client, oldZone);
    
    // Synchroniser les Pokémon de la nouvelle zone
    setTimeout(() => {
      this.syncPokemonForClient(client);
    }, 500); // Petit délai pour que le client soit prêt
  }

  /**
   * ✅ NOUVEAU: Nettoie les Pokémon d'une zone côté client
   */
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
      shinyPokemon: 0,
      fluidMovementStats: {
        interpolating: 0,
        targeting: 0,
        idle: 0
      }
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
      
      // ✅ NOUVELLES STATS MOUVEMENT FLUIDE
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

  /**
   * ✅ DEBUG AMÉLIORÉ avec informations mouvement fluide
   */
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

  /**
   * ✅ NOUVELLES MÉTHODES UTILITAIRES POUR LE MOUVEMENT FLUIDE
   */

  /**
   * Force l'arrêt de tous les mouvements
   */
  stopAllMovements(): void {
    console.log(`⏸️ [OverworldPokemonManager] Arrêt de tous les mouvements`);
    
    this.overworldPokemon.forEach(pokemon => {
      if (pokemon.isMoving) {
        // Terminer le mouvement à la position cible
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

  /**
   * Reprend tous les mouvements
   */
  resumeAllMovements(): void {
    console.log(`▶️ [OverworldPokemonManager] Reprise de tous les mouvements`);
    
    this.overworldPokemon.forEach(pokemon => {
      if (!pokemon.isMoving) {
        // Réinitialiser le timer de mouvement
        pokemon.lastMoveTime = Date.now() - 2000; // Démarrer bientôt
      }
    });
  }

  /**
   * Change la vitesse de tous les Pokémon
   */
  setGlobalSpeed(speedMultiplier: number): void {
    console.log(`🏃‍♂️ [OverworldPokemonManager] Changement vitesse globale: x${speedMultiplier}`);
    
    this.overworldPokemon.forEach(pokemon => {
      if (pokemon.moveDuration) {
        pokemon.moveDuration = Math.max(500, pokemon.moveDuration / speedMultiplier);
      }
    });
  }

  /**
   * Obtient les Pokémon en mouvement
   */
  getMovingPokemon(): OverworldPokemonData[] {
    return Array.from(this.overworldPokemon.values()).filter(pokemon => pokemon.isMoving);
  }

  /**
   * Obtient les Pokémon immobiles
   */
  getIdlePokemon(): OverworldPokemonData[] {
    return Array.from(this.overworldPokemon.values()).filter(pokemon => !pokemon.isMoving);
  }

  /**
   * Force le mouvement d'un Pokémon spécifique
   */
  forcePokemonMovement(pokemonId: string, direction?: string): void {
    const pokemon = this.overworldPokemon.get(pokemonId);
    if (!pokemon) {
      console.warn(`⚠️ [OverworldPokemonManager] Pokémon ${pokemonId} non trouvé`);
      return;
    }

    // Changer de direction si spécifiée
    if (direction && this.directions.includes(direction)) {
      pokemon.direction = direction;
    }

    // Forcer le mouvement
    const target = this.calculateFluidMovementTarget(pokemon);
    pokemon.isMoving = true;
    pokemon.targetX = target.x;
    pokemon.targetY = target.y;
    pokemon.moveStartTime = Date.now();
    pokemon.moveDuration = 1500; // Mouvement de 1.5 secondes
    pokemon.lastMoveTime = Date.now();

    this.broadcastPokemonUpdate(pokemon);
    
    console.log(`🎯 [OverworldPokemonManager] Mouvement forcé: ${pokemon.name} vers ${direction || pokemon.direction}`);
  }

  /**
   * Téléporte un Pokémon à une position
   */
  teleportPokemon(pokemonId: string, x: number, y: number): void {
    const pokemon = this.overworldPokemon.get(pokemonId);
    if (!pokemon) {
      console.warn(`⚠️ [OverworldPokemonManager] Pokémon ${pokemonId} non trouvé`);
      return;
    }

    // Vérifier les limites
    if (!this.isPositionValid(x, y, pokemon.boundaries)) {
      console.warn(`⚠️ [OverworldPokemonManager] Position (${x}, ${y}) hors limites pour ${pokemon.name}`);
      return;
    }

    // Téléporter
    pokemon.x = x;
    pokemon.y = y;
    pokemon.targetX = x;
    pokemon.targetY = y;
    pokemon.isMoving = false;

    this.broadcastPokemonUpdate(pokemon);
    
    console.log(`📍 [OverworldPokemonManager] ${pokemon.name} téléporté à (${x}, ${y})`);
  }

  /**
   * Change l'animation de tous les Pokémon d'une zone
   */
  changeZoneAnimation(areaId: string, newAnimation: string): void {
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
