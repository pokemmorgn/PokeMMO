// ================================================================================================
// CORRECTION MOUVEMENT FLUIDE - SERVER/SRC/MANAGERS/OVERWORLDPOKEMONMANAGER.TS
// ================================================================================================

// ✅ NOUVELLES PROPRIÉTÉS À AJOUTER À L'INTERFACE OverworldPokemonData
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
  lastDirectionFrame?: string; // Pour mémoriser la dernière frame de direction
}

// ✅ MÉTHODES MODIFIÉES DANS LA CLASSE OverworldPokemonManager

/**
 * ✅ NOUVELLE MÉTHODE: Calcule une position cible pour mouvement fluide
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
      // ✅ MOUVEMENT EN COURS - INTERPOLATION CÔTÉ SERVEUR POUR VALIDATION
      if (pokemon.targetX !== undefined && pokemon.targetY !== undefined) {
        const startX = pokemon.x - (pokemon.targetX - pokemon.x) * moveProgress / (1 - moveProgress);
        const startY = pokemon.y - (pokemon.targetY - pokemon.y) * moveProgress / (1 - moveProgress);
        
        pokemon.x = startX + (pokemon.targetX - startX) * moveProgress;
        pokemon.y = startY + (pokemon.targetY - startY) * moveProgress;
      }
      
      // ✅ ENVOYER UPDATE PÉRIODIQUE (MOINS FRÉQUENT)
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
 * ✅ MÉTHODE MODIFIÉE: Diffuse la mise à jour avec informations de mouvement fluide
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
    console.log(`📤 [OverworldPokemonManager] Update ${pokemon.name} envoyé à ${clientsInZone.length} clients`);
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
 * ✅ MÉTHODE MODIFIÉE: Spawn avec nouvelles propriétés
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
