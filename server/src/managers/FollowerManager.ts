import { TeamManager } from "./TeamManager";
import { IOwnedPokemon } from "../models/OwnedPokemon";
import { PokemonFollower } from "../schema/PokemonFollowerSchema";

export class FollowerManager {
  private room: any;
  private playerTrail: Map<string, Array<{ x: number, y: number, direction: string, timestamp: number }>> = new Map();
  private trailDistance = 3; // Distance par défaut
  
  // ✅ SÉCURITÉ: Rate limiting pour éviter le spam
  private lastDistanceChange: Map<string, number> = new Map();
  private distanceChangeInterval = 5000; // 5 secondes minimum entre changements
  
  // ✅ NOUVEAU: Gestion des transitions
  private playerTransitioning: Map<string, number> = new Map(); // Timestamp de début de transition
  private transitionGracePeriod = 5000; // 5 secondes de grâce après une transition
  
  // ✅ SÉCURITÉ: Limites de validation
  private readonly MAX_DISTANCE = 10;
  private readonly MIN_DISTANCE = 1;
  private readonly MAX_TRAIL_SIZE = 15;
  private readonly MAX_POSITION_DIFF = 100; // Pixels max de différence entre positions
  private readonly TELEPORT_THRESHOLD = 200; // Seuil pour détecter une téléportation légitime
  
  constructor(room: any) {
    this.room = room;
    console.log("🐾 [FollowerManager] Initialisé avec sécurité renforcée - Distance: 3 cases");
  }

  /**
   * ✅ NOUVEAU: Marquer un joueur comme en transition
   */
  markPlayerTransitioning(playerId: string): void {
    console.log(`🚪 [FollowerManager] Joueur ${playerId} en transition`);
    this.playerTransitioning.set(playerId, Date.now());
    
    // Nettoyer le trail existant car on change de carte
    this.playerTrail.delete(playerId);
  }

  /**
   * ✅ NOUVEAU: Vérifier si un joueur est en transition
   */
  private isPlayerTransitioning(playerId: string): boolean {
    const transitionStart = this.playerTransitioning.get(playerId);
    if (!transitionStart) return false;
    
    const elapsed = Date.now() - transitionStart;
    
    // Si la période de grâce est écoulée, nettoyer
    if (elapsed > this.transitionGracePeriod) {
      this.playerTransitioning.delete(playerId);
      return false;
    }
    
    return true;
  }

  /**
   * ✅ SÉCURITÉ: Validation stricte des positions avec gestion des transitions
   */
  private validatePosition(x: number, y: number, playerId: string): boolean {
    // Vérifier que les coordonnées sont des nombres valides
    if (typeof x !== 'number' || typeof y !== 'number' || 
        !isFinite(x) || !isFinite(y) || 
        isNaN(x) || isNaN(y)) {
      console.warn(`⚠️ [FollowerManager] Position invalide pour ${playerId}: (${x}, ${y})`);
      return false;
    }
    
    // Vérifier les limites de la carte (ajustez selon votre carte)
    const mapBounds = this.getMapBounds();
    if (x < 0 || y < 0 || x > mapBounds.width || y > mapBounds.height) {
      console.warn(`⚠️ [FollowerManager] Position hors limites pour ${playerId}: (${x}, ${y})`);
      return false;
    }
    
    // ✅ NOUVEAU: Ignorer la validation de téléportation si en transition
    if (this.isPlayerTransitioning(playerId)) {
      console.log(`🚪 [FollowerManager] Position acceptée (transition en cours) pour ${playerId}: (${x}, ${y})`);
      return true;
    }
    
    // Vérifier la différence avec la dernière position connue
    const trail = this.playerTrail.get(playerId);
    if (trail && trail.length > 0) {
      const lastPos = trail[trail.length - 1];
      const distance = Math.sqrt(Math.pow(x - lastPos.x, 2) + Math.pow(y - lastPos.y, 2));
      
      if (distance > this.MAX_POSITION_DIFF) {
        // ✅ AMÉLIORATION: Détecter si c'est une téléportation légitime (transition de carte)
        if (distance > this.TELEPORT_THRESHOLD) {
          console.log(`🚪 [FollowerManager] Téléportation importante détectée (${distance}px), marquage en transition pour ${playerId}`);
          this.markPlayerTransitioning(playerId);
          return true;
        }
        
        console.warn(`⚠️ [FollowerManager] Téléportation détectée pour ${playerId}: ${distance}px`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * ✅ SÉCURITÉ: Validation stricte de la direction
   */
  private validateDirection(direction: string): boolean {
    const validDirections = ['up', 'down', 'left', 'right'];
    return validDirections.includes(direction);
  }

  /**
   * ✅ SÉCURITÉ: Méthode pour obtenir les limites de la carte
   */
  private getMapBounds(): { width: number, height: number } {
    // À adapter selon votre système de carte
    // Exemple pour une carte 2000x2000 (ajustez selon vos cartes)
    return { width: 2000, height: 2000 };
  }

  /**
   * ✅ SÉCURITÉ: Vérifier si le joueur peut avoir un follower
   */
  private canPlayerHaveFollower(playerId: string): boolean {
    const player = this.room.state.players.get(playerId);
    if (!player) return false;
    
    // Ajouter vos règles métier ici
    // Par exemple: niveau minimum, quête accomplie, etc.
    return true;
  }

  /**
   * Met à jour le follower d'un joueur basé sur son équipe
   */
  async updatePlayerFollower(playerId: string): Promise<void> {
    try {
      const player = this.room.state.players.get(playerId);
      if (!player) {
        console.warn(`⚠️ [FollowerManager] Joueur ${playerId} non trouvé`);
        return;
      }

      // ✅ VALIDATION: Vérifier que le joueur a le droit d'avoir un follower
      if (!this.canPlayerHaveFollower(playerId)) {
        console.warn(`⚠️ [FollowerManager] Joueur ${playerId} non autorisé à avoir un follower`);
        return;
      }

      console.log(`🔄 [FollowerManager] Mise à jour follower pour ${player.name}`);

      // Récupérer le Pokémon au slot 0
      const teamManager = new TeamManager(player.name);
      await teamManager.load();
      
      const firstPokemon = await teamManager.getTeamPokemon(0);
      
      if (firstPokemon && firstPokemon.currentHp > 0) {
        // Créer ou mettre à jour le follower
        await this.createFollowerFromPokemon(player, firstPokemon);
        
        // ✅ NOUVEAU: Initialiser le trail avec la position actuelle du joueur
        if (!this.playerTrail.has(playerId)) {
          this.playerTrail.set(playerId, []);
        }
        
        // ✅ AJOUTER: Pré-remplir le trail pour que le follower réagisse immédiatement
        const trail = this.playerTrail.get(playerId)!;
        // Ajouter quelques positions fictives pour que le système fonctionne tout de suite
        for (let i = 0; i < this.trailDistance + 1; i++) {
          trail.push({ 
            x: player.x, 
            y: player.y, 
            direction: player.direction || 'down',
            timestamp: Date.now()
          });
        }
        
        console.log(`🐾 [FollowerManager] Trail initialisé avec ${trail.length} positions pour ${player.name}`);
      } else {
        // Supprimer le follower s'il n'y a pas de Pokémon valide
        this.removePlayerFollower(playerId);
      }

    } catch (error) {
      console.error(`❌ [FollowerManager] Erreur updatePlayerFollower:`, error);
      // Ne pas exposer l'erreur détaillée au client
    }
  }

  /**
   * Crée un follower à partir d'un Pokémon
   */
  private async createFollowerFromPokemon(player: any, pokemon: IOwnedPokemon): Promise<void> {
    try {
      console.log(`🐾 [FollowerManager] Création follower: ${pokemon.nickname || `Pokémon #${pokemon.pokemonId}`} pour ${player.name}`);

      // ✅ CALCUL POSITION INITIALE DERRIÈRE LE JOUEUR
      const behindPosition = this.calculateBehindPosition(player.x, player.y, player.direction || 'down');

      // Créer ou mettre à jour l'objet follower
      if (!player.follower) {
        player.follower = new PokemonFollower();
      }

      player.follower.pokemonId = pokemon.pokemonId;
      player.follower.nickname = pokemon.nickname || "";
      player.follower.x = behindPosition.x;
      player.follower.y = behindPosition.y;
      player.follower.direction = player.direction || 'down';
      player.follower.isMoving = false;
      player.follower.isShiny = pokemon.shiny || false;
      player.follower.level = pokemon.level;

      console.log(`✅ [FollowerManager] Follower créé DERRIÈRE le joueur à (${behindPosition.x}, ${behindPosition.y})`);

    } catch (error) {
      console.error(`❌ [FollowerManager] Erreur createFollowerFromPokemon:`, error);
    }
  }

  /**
   * ✅ CALCULE la position derrière le joueur au spawn
   */
  private calculateBehindPosition(playerX: number, playerY: number, direction: string): { x: number, y: number } {
    const distance = 24; // Distance réduite (moins d'une case)
    
    switch (direction) {
      case 'up':
        return { x: playerX, y: playerY + distance };
      case 'down':
        return { x: playerX, y: playerY - distance };
      case 'left':
        return { x: playerX + distance, y: playerY };
      case 'right':
        return { x: playerX - distance, y: playerY };
      default:
        return { x: playerX, y: playerY + distance }; // Défaut: derrière vers le bas
    }
  }

  /**
   * ✅ SÉCURITÉ: Mise à jour sécurisée des positions avec validation
   */
  updateFollowerPosition(playerId: string, playerX: number, playerY: number, direction: string, isMoving: boolean): void {
    const player = this.room.state.players.get(playerId);
    if (!player || !player.follower) return;

    // ✅ VALIDATION: Position et direction
    if (!this.validatePosition(playerX, playerY, playerId)) {
      console.error(`❌ [FollowerManager] Position rejetée pour ${playerId}`);
      return;
    }
    
    if (!this.validateDirection(direction)) {
      console.error(`❌ [FollowerManager] Direction invalide pour ${playerId}: ${direction}`);
      return;
    }

    // Initialiser le trail si nécessaire
    if (!this.playerTrail.has(playerId)) {
      this.playerTrail.set(playerId, []);
    }

    const trail = this.playerTrail.get(playerId)!;
    
    // ✅ SEULEMENT ajouter au trail si le joueur BOUGE
    if (isMoving) {
      // Éviter les doublons dans le trail
      const lastEntry = trail[trail.length - 1];
      if (!lastEntry || lastEntry.x !== playerX || lastEntry.y !== playerY) {
        // ✅ SÉCURITÉ: Ajouter timestamp et limiter la taille
        trail.push({ 
          x: playerX, 
          y: playerY, 
          direction, 
          timestamp: Date.now() 
        });
        
        // ✅ SÉCURITÉ: Limiter la taille du trail
        if (trail.length > this.MAX_TRAIL_SIZE) {
          trail.shift();
        }
      }
    }

    // ✅ NOUVEAU : Le follower suit ET s'arrête exactement où il doit
    if (trail.length > this.trailDistance) {
      const followerIndex = trail.length - this.trailDistance - 1;
      const followerPos = trail[followerIndex];
      
      // ✅ SEULEMENT bouger si le joueur bouge ET si on a une nouvelle position
      if (isMoving && (player.follower.x !== followerPos.x || player.follower.y !== followerPos.y)) {
        player.follower.x = followerPos.x;
        player.follower.y = followerPos.y;
        player.follower.direction = followerPos.direction;
        player.follower.isMoving = true;
      } else {
        // ✅ ARRÊT : Le follower reste exactement où il est
        player.follower.isMoving = false;
      }
    } else {
      // ✅ Pas assez de trail, le follower ne bouge pas
      player.follower.isMoving = false;
    }
    
    // ✅ Toujours mettre à jour la direction (même à l'arrêt)
    if (direction) {
      player.follower.direction = direction;
    }
    
    // Log occasionnel pour debug
    if (Math.random() < 0.05) { // Réduit à 5% pour moins de spam
      console.log(`🐾 [FollowerManager] ${player.name} - Joueur: (${playerX}, ${playerY}) moving: ${isMoving} → Follower: (${player.follower.x}, ${player.follower.y}) moving: ${player.follower.isMoving} | Trail: ${trail.length}`);
    }
  }

  /**
   * ✅ NOUVEAU: Méthode appelée lors d'une transition de carte
   */
  onPlayerMapTransition(playerId: string, newX: number, newY: number): void {
    console.log(`🗺️ [FollowerManager] Transition de carte pour ${playerId} vers (${newX}, ${newY})`);
    
    // Marquer le joueur en transition
    this.markPlayerTransitioning(playerId);
    
    const player = this.room.state.players.get(playerId);
    if (player && player.follower) {
      // Téléporter le follower derrière le joueur dans la nouvelle position
      const behindPosition = this.calculateBehindPosition(newX, newY, player.direction || 'down');
      
      player.follower.x = behindPosition.x;
      player.follower.y = behindPosition.y;
      player.follower.direction = player.direction || 'down';
      player.follower.isMoving = false;
      
      console.log(`🐾 [FollowerManager] Follower téléporté à (${behindPosition.x}, ${behindPosition.y}) après transition`);
    }
  }

  /**
   * ✅ SÉCURITÉ: Rate limiting pour changement de distance
   */
  setTrailDistance(distance: number, playerId?: string): boolean {
    // Validation de la distance
    if (distance < this.MIN_DISTANCE || distance > this.MAX_DISTANCE) {
      console.warn(`⚠️ [FollowerManager] Distance invalide: ${distance} (min: ${this.MIN_DISTANCE}, max: ${this.MAX_DISTANCE})`);
      return false;
    }
    
    // Rate limiting si playerId fourni
    if (playerId) {
      const now = Date.now();
      const lastChange = this.lastDistanceChange.get(playerId);
      
      if (lastChange && now - lastChange < this.distanceChangeInterval) {
        console.warn(`⚠️ [FollowerManager] Rate limit dépassé pour ${playerId}`);
        return false;
      }
      
      this.lastDistanceChange.set(playerId, now);
    }
    
    this.trailDistance = distance;
    console.log(`🐾 [FollowerManager] Distance changée à: ${this.trailDistance} cases`);
    return true;
  }

  /**
   * Supprime le follower d'un joueur
   */
  removePlayerFollower(playerId: string): void {
    try {
      const player = this.room.state.players.get(playerId);
      if (!player) {
        return;
      }

      if (player.follower) {
        console.log(`🗑️ [FollowerManager] Suppression follower pour ${player.name}`);
        player.follower = undefined;
      }

      // Nettoyer le trail
      this.playerTrail.delete(playerId);
      // Nettoyer le rate limiting
      this.lastDistanceChange.delete(playerId);
      // ✅ NOUVEAU: Nettoyer la transition
      this.playerTransitioning.delete(playerId);

    } catch (error) {
      console.error(`❌ [FollowerManager] Erreur removePlayerFollower:`, error);
    }
  }

  /**
   * Supprime tous les followers de la room
   */
  cleanup(): void {
    console.log(`🧹 [FollowerManager] Nettoyage de tous les followers`);
    
    this.room.state.players.forEach((player: any, playerId: string) => {
      if (player.follower) {
        player.follower = undefined;
      }
    });

    // Nettoyer tous les trails, rate limiting et transitions
    this.playerTrail.clear();
    this.lastDistanceChange.clear();
    this.playerTransitioning.clear();
  }

  /**
   * ✅ SÉCURITÉ: Nettoyage automatique avec timestamps
   */
  cleanupOldTrails(): void {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes
    
    this.playerTrail.forEach((trail, playerId) => {
      const filteredTrail = trail.filter(pos => now - pos.timestamp < maxAge);
      
      if (filteredTrail.length !== trail.length) {
        console.log(`🧹 [FollowerManager] Trail nettoyé pour ${playerId}: ${trail.length} → ${filteredTrail.length}`);
        this.playerTrail.set(playerId, filteredTrail);
      }
    });
    
    // Nettoyer aussi le rate limiting
    this.lastDistanceChange.forEach((timestamp, playerId) => {
      if (now - timestamp > this.distanceChangeInterval * 2) {
        this.lastDistanceChange.delete(playerId);
      }
    });
    
    // ✅ NOUVEAU: Nettoyer les transitions expirées
    this.playerTransitioning.forEach((timestamp, playerId) => {
      if (now - timestamp > this.transitionGracePeriod) {
        this.playerTransitioning.delete(playerId);
      }
    });
  }

  /**
   * ✅ SÉCURITÉ: Statistiques sécurisées (pas de données sensibles)
   */
  getSecureStats(): any {
    return {
      activeFollowers: this.playerTrail.size,
      totalTrailEntries: Array.from(this.playerTrail.values()).reduce((sum, trail) => sum + trail.length, 0),
      currentDistance: this.trailDistance,
      maxDistance: this.MAX_DISTANCE,
      rateLimitedPlayers: this.lastDistanceChange.size,
      playersInTransition: this.playerTransitioning.size,
      timestamp: Date.now()
    };
  }

  /**
   * ✅ SÉCURITÉ: Debug sécurisé (production)
   */
  debugFollowers(): void {
    // Désactiver en production
    if (process.env.NODE_ENV === 'production') {
      console.log("🔒 [FollowerManager] Debug désactivé en production");
      return;
    }
    
    console.log(`🔍 [FollowerManager] === DEBUG SÉCURISÉ (Distance: ${this.trailDistance}) ===`);
    console.log(`📊 Followers actifs: ${this.playerTrail.size}`);
    console.log(`📏 Distance actuelle: ${this.trailDistance}`);
    console.log(`⏰ Rate limits actifs: ${this.lastDistanceChange.size}`);
    console.log(`🚪 Joueurs en transition: ${this.playerTransitioning.size}`);
    
    let count = 0;
    this.room.state.players.forEach((player: any, playerId: string) => {
      if (player.follower) {
        count++;
        const trail = this.playerTrail.get(playerId);
        const trailLength = trail ? trail.length : 0;
        const lastTimestamp = trail && trail.length > 0 ? trail[trail.length - 1].timestamp : 0;
        const isTransitioning = this.isPlayerTransitioning(playerId);
        
        console.log(`🐾 ${player.name}:`, {
          pokemonId: player.follower.pokemonId,
          nickname: player.follower.nickname,
          position: `(${player.follower.x}, ${player.follower.y})`,
          direction: player.follower.direction,
          isMoving: player.follower.isMoving,
          trailLength: trailLength,
          isTransitioning: isTransitioning,
          lastUpdate: lastTimestamp ? new Date(lastTimestamp).toLocaleTimeString() : 'N/A'
        });
      }
    });
    
    console.log(`📊 Total followers: ${count}`);
    console.log(`🔒 Sécurité: Rate limiting activé, validation stricte, gestion transitions`);
  }

  /**
   * Force la mise à jour de tous les followers
   */
  async refreshAllFollowers(): Promise<void> {
    console.log(`🔄 [FollowerManager] Rafraîchissement de tous les followers`);
    
    const updatePromises: Promise<void>[] = [];
    
    this.room.state.players.forEach((player: any, playerId: string) => {
      updatePromises.push(this.updatePlayerFollower(playerId));
    });
    
    await Promise.all(updatePromises);
    console.log(`✅ [FollowerManager] Tous les followers rafraîchis`);
  }

  /**
   * Getters pour les trails (pour debug seulement)
   */
  getPlayerTrail(playerId: string): Array<{ x: number, y: number, direction: string, timestamp: number }> | undefined {
    if (process.env.NODE_ENV === 'production') {
      return undefined; // Pas de debug en production
    }
    return this.playerTrail.get(playerId);
  }

  getAllTrails(): Map<string, Array<{ x: number, y: number, direction: string, timestamp: number }>> {
    if (process.env.NODE_ENV === 'production') {
      return new Map(); // Pas de debug en production
    }
    return new Map(this.playerTrail);
  }

  /**
   * Getter pour la distance actuelle
   */
  getTrailDistance(): number {
    return this.trailDistance;
  }

  /**
   * Getter pour les limites de sécurité
   */
  getSecurityLimits(): { maxDistance: number, minDistance: number, maxTrailSize: number } {
    return {
      maxDistance: this.MAX_DISTANCE,
      minDistance: this.MIN_DISTANCE,
      maxTrailSize: this.MAX_TRAIL_SIZE
    };
  }
}
