// ================================================================================================
// AMÉLIORATIONS SÉCURITÉ POUR LE SYSTÈME FOLLOWER
// ================================================================================================

export class FollowerManager {
  private room: any;
  private playerTrail: Map<string, Array<{ x: number, y: number, direction: string, timestamp: number }>> = new Map();
  private trailDistance = 3;
  
  // ✅ SÉCURITÉ: Rate limiting pour éviter le spam
  private lastDistanceChange: Map<string, number> = new Map();
  private distanceChangeInterval = 5000; // 5 secondes minimum entre changements
  
  // ✅ SÉCURITÉ: Limites de validation
  private readonly MAX_DISTANCE = 10;
  private readonly MIN_DISTANCE = 1;
  private readonly MAX_TRAIL_SIZE = 15;
  private readonly MAX_POSITION_DIFF = 100; // Pixels max de différence entre positions
  
  constructor(room: any) {
    this.room = room;
    console.log("🐾 [FollowerManager] Initialisé avec sécurité renforcée");
  }

  // ✅ SÉCURITÉ: Validation stricte des positions
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
    
    // Vérifier la différence avec la dernière position connue
    const trail = this.playerTrail.get(playerId);
    if (trail && trail.length > 0) {
      const lastPos = trail[trail.length - 1];
      const distance = Math.sqrt(Math.pow(x - lastPos.x, 2) + Math.pow(y - lastPos.y, 2));
      
      if (distance > this.MAX_POSITION_DIFF) {
        console.warn(`⚠️ [FollowerManager] Téléportation détectée pour ${playerId}: ${distance}px`);
        return false;
      }
    }
    
    return true;
  }

  // ✅ SÉCURITÉ: Validation stricte de la direction
  private validateDirection(direction: string): boolean {
    const validDirections = ['up', 'down', 'left', 'right'];
    return validDirections.includes(direction);
  }

  // ✅ SÉCURITÉ: Rate limiting pour changement de distance
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

  // ✅ SÉCURITÉ: Mise à jour sécurisée des positions
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
    
    // ✅ SÉCURITÉ: Ajouter timestamp et limiter la taille
    if (isMoving) {
      const lastEntry = trail[trail.length - 1];
      if (!lastEntry || lastEntry.x !== playerX || lastEntry.y !== playerY) {
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

    // Mise à jour normale du follower
    if (trail.length > this.trailDistance) {
      const followerIndex = trail.length - this.trailDistance - 1;
      const followerPos = trail[followerIndex];
      
      if (isMoving && (player.follower.x !== followerPos.x || player.follower.y !== followerPos.y)) {
        player.follower.x = followerPos.x;
        player.follower.y = followerPos.y;
        player.follower.direction = followerPos.direction;
        player.follower.isMoving = true;
      } else {
        player.follower.isMoving = false;
      }
    } else {
      player.follower.isMoving = false;
    }
    
    if (direction) {
      player.follower.direction = direction;
    }
  }

  // ✅ SÉCURITÉ: Nettoyage automatique avec timestamps
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
  }

  // ✅ SÉCURITÉ: Méthode pour obtenir les limites de la carte
  private getMapBounds(): { width: number, height: number } {
    // À adapter selon votre système de carte
    // Exemple pour une carte 1000x1000
    return { width: 1000, height: 1000 };
  }

  // ✅ SÉCURITÉ: Validation lors de la création
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

      const teamManager = new TeamManager(player.name);
      await teamManager.load();
      
      const firstPokemon = await teamManager.getTeamPokemon(0);
      
      if (firstPokemon && firstPokemon.currentHp > 0) {
        await this.createFollowerFromPokemon(player, firstPokemon);
        
        if (!this.playerTrail.has(playerId)) {
          this.playerTrail.set(playerId, []);
        }
        
        const trail = this.playerTrail.get(playerId)!;
        for (let i = 0; i < this.trailDistance + 1; i++) {
          trail.push({ 
            x: player.x, 
            y: player.y, 
            direction: player.direction || 'down',
            timestamp: Date.now()
          });
        }
      } else {
        this.removePlayerFollower(playerId);
      }

    } catch (error) {
      console.error(`❌ [FollowerManager] Erreur updatePlayerFollower:`, error);
      // Ne pas exposer l'erreur détaillée au client
    }
  }

  // ✅ SÉCURITÉ: Vérifier si le joueur peut avoir un follower
  private canPlayerHaveFollower(playerId: string): boolean {
    const player = this.room.state.players.get(playerId);
    if (!player) return false;
    
    // Ajouter vos règles métier ici
    // Par exemple: niveau minimum, quête accomplie, etc.
    return true;
  }

  // ✅ SÉCURITÉ: Statistiques sécurisées (pas de données sensibles)
  getSecureStats(): any {
    return {
      activeFollowers: this.playerTrail.size,
      totalTrailEntries: Array.from(this.playerTrail.values()).reduce((sum, trail) => sum + trail.length, 0),
      currentDistance: this.trailDistance,
      maxDistance: this.MAX_DISTANCE,
      timestamp: Date.now()
    };
  }

  // ✅ SÉCURITÉ: Fonction de debug sécurisée (production)
  debugFollowersSecure(): void {
    if (process.env.NODE_ENV === 'production') {
      console.log("🔒 Debug désactivé en production");
      return;
    }
    
    console.log(`🔍 [FollowerManager] === DEBUG SÉCURISÉ ===`);
    console.log(`📊 Followers actifs: ${this.playerTrail.size}`);
    console.log(`📏 Distance: ${this.trailDistance}`);
    console.log(`⏰ Rate limits actifs: ${this.lastDistanceChange.size}`);
    
    // Pas de données sensibles dans les logs
    this.playerTrail.forEach((trail, playerId) => {
      console.log(`🐾 ${playerId}: ${trail.length} positions (last: ${trail[trail.length - 1]?.timestamp})`);
    });
  }
}
