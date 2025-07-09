import { TeamManager } from "./TeamManager";
import { IOwnedPokemon } from "../models/OwnedPokemon";
import { PokemonFollower } from "../schema/PokemonFollowerSchema";

export class FollowerManager {
  private room: any;
  private playerTrail: Map<string, Array<{ x: number, y: number, direction: string }>> = new Map();
  private trailDistance = 2; // Le follower suit à 2 cases de distance
  
  constructor(room: any) {
    this.room = room;
    console.log("🐾 [FollowerManager] Version simple initialisée - Distance: 2 cases");
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

      console.log(`🔄 [FollowerManager] Mise à jour follower pour ${player.name}`);

      // Récupérer le Pokémon au slot 0
      const teamManager = new TeamManager(player.name);
      await teamManager.load();
      
      const firstPokemon = await teamManager.getTeamPokemon(0);
      
      if (firstPokemon && firstPokemon.currentHp > 0) {
        // Créer ou mettre à jour le follower
        await this.createFollowerFromPokemon(player, firstPokemon);
        
        // Initialiser le trail si nécessaire
        if (!this.playerTrail.has(playerId)) {
          this.playerTrail.set(playerId, []);
        }
      } else {
        // Supprimer le follower s'il n'y a pas de Pokémon valide
        this.removePlayerFollower(playerId);
      }

    } catch (error) {
      console.error(`❌ [FollowerManager] Erreur updatePlayerFollower:`, error);
    }
  }

  /**
   * Crée un follower à partir d'un Pokémon
   */
  private async createFollowerFromPokemon(player: any, pokemon: IOwnedPokemon): Promise<void> {
    try {
      console.log(`🐾 [FollowerManager] Création follower: ${pokemon.nickname || `Pokémon #${pokemon.pokemonId}`} pour ${player.name}`);

      // Créer ou mettre à jour l'objet follower
      if (!player.follower) {
        player.follower = new PokemonFollower();
      }

      player.follower.pokemonId = pokemon.pokemonId;
      player.follower.nickname = pokemon.nickname || "";
      player.follower.x = player.x;
      player.follower.y = player.y;
      player.follower.direction = player.direction || 'down';
      player.follower.isMoving = false;
      player.follower.isShiny = pokemon.shiny || false;
      player.follower.level = pokemon.level;

      console.log(`✅ [FollowerManager] Follower créé à (${player.x}, ${player.y})`);

    } catch (error) {
      console.error(`❌ [FollowerManager] Erreur createFollowerFromPokemon:`, error);
    }
  }

  /**
   * ✅ CORRIGÉ : Le follower suit à 2 cases de distance ET reste en place à l'arrêt
   */
  updateFollowerPosition(playerId: string, playerX: number, playerY: number, direction: string, isMoving: boolean): void {
    const player = this.room.state.players.get(playerId);
    if (!player || !player.follower) return;

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
        // Ajouter la position actuelle au trail
        trail.push({ x: playerX, y: playerY, direction });
        
        // Garder seulement les positions nécessaires
        const maxTrailLength = this.trailDistance + 2;
        if (trail.length > maxTrailLength) {
          trail.shift();
        }
      }
    }

    // ✅ CORRIGÉ: Le follower prend la position d'il y a X mouvements
    if (trail.length > this.trailDistance) {
      const followerIndex = trail.length - this.trailDistance - 1;
      const followerPos = trail[followerIndex];
      
      player.follower.x = followerPos.x;
      player.follower.y = followerPos.y;
      player.follower.direction = followerPos.direction;
    } else {
      // Pas assez de trail, le follower reste à sa position actuelle
      // (ne bouge pas tant qu'il n'y a pas assez d'historique)
      player.follower.isMoving = false;
    }
    
    // ✅ IMPORTANT: État de mouvement du follower
    player.follower.isMoving = isMoving && trail.length > this.trailDistance;
    
    // Log occasionnel pour debug
    if (Math.random() < 0.1) {
      console.log(`🐾 [FollowerManager] ${player.name} - Joueur: (${playerX}, ${playerY}) moving: ${isMoving} → Follower: (${player.follower.x}, ${player.follower.y}) moving: ${player.follower.isMoving} | Trail: ${trail.length}`);
    }
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

    // Nettoyer tous les trails
    this.playerTrail.clear();
  }

  /**
   * Permet de changer la distance dynamiquement
   */
  setTrailDistance(distance: number): void {
    this.trailDistance = Math.max(1, Math.min(distance, 5)); // Entre 1 et 5
    console.log(`🐾 [FollowerManager] Distance changée à: ${this.trailDistance} cases`);
  }

  /**
   * Debug - affiche l'état de tous les followers
   */
  debugFollowers(): void {
    console.log(`🔍 [FollowerManager] === DEBUG SIMPLE (Distance: ${this.trailDistance}) ===`);
    let count = 0;
    this.room.state.players.forEach((player: any, playerId: string) => {
      if (player.follower) {
        count++;
        const trail = this.playerTrail.get(playerId);
        const trailLength = trail ? trail.length : 0;
        console.log(`🐾 ${player.name}:`, {
          pokemonId: player.follower.pokemonId,
          nickname: player.follower.nickname,
          position: `(${player.follower.x}, ${player.follower.y})`,
          direction: player.follower.direction,
          isMoving: player.follower.isMoving,
          isShiny: player.follower.isShiny,
          level: player.follower.level,
          trailLength: trailLength
        });
        
        if (trail && trail.length > 0) {
          console.log(`  📍 Trail: ${trail.map(p => `(${p.x},${p.y})`).join(' → ')}`);
        }
      }
    });
    console.log(`📊 Total followers: ${count}`);
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
   * Nettoie les trails anciens (appelé périodiquement)
   */
  cleanupOldTrails(): void {
    const now = Date.now();
    const maxAge = 60000; // 1 minute - pas utilisé dans cette version simple
    
    // Dans cette version simple, on nettoie juste les trails trop longs
    this.playerTrail.forEach((trail, playerId) => {
      if (trail.length > 10) {
        // Garder seulement les 5 dernières positions
        this.playerTrail.set(playerId, trail.slice(-5));
        console.log(`🧹 [FollowerManager] Nettoyage trail ${playerId}: ${trail.length} → 5`);
      }
    });
  }

  /**
   * Getters pour les trails (pour debug)
   */
  getPlayerTrail(playerId: string): Array<{ x: number, y: number, direction: string }> | undefined {
    return this.playerTrail.get(playerId);
  }

  getAllTrails(): Map<string, Array<{ x: number, y: number, direction: string }>> {
    return new Map(this.playerTrail);
  }

  /**
   * Getter pour la distance actuelle
   */
  getTrailDistance(): number {
    return this.trailDistance;
  }
}
