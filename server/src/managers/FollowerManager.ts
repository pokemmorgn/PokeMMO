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

  async updatePlayerFollower(playerId: string): Promise<void> {
    try {
      const player = this.room.state.players.get(playerId);
      if (!player) return;

      const teamManager = new TeamManager(player.name);
      await teamManager.load();
      
      const firstPokemon = await teamManager.getTeamPokemon(0);
      
      if (firstPokemon && firstPokemon.currentHp > 0) {
        await this.createFollowerFromPokemon(player, firstPokemon);
      } else {
        this.removePlayerFollower(playerId);
      }
    } catch (error) {
      console.error(`❌ [FollowerManager] Erreur updatePlayerFollower:`, error);
    }
  }

  private async createFollowerFromPokemon(player: any, pokemon: IOwnedPokemon): Promise<void> {
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
  }

  // ✅ SIMPLE : Le follower suit à 2 cases de distance
  updateFollowerPosition(playerId: string, playerX: number, playerY: number, direction: string, isMoving: boolean): void {
    const player = this.room.state.players.get(playerId);
    if (!player || !player.follower) return;

    // Initialiser le trail si nécessaire
    if (!this.playerTrail.has(playerId)) {
      this.playerTrail.set(playerId, []);
    }

    const trail = this.playerTrail.get(playerId)!;
    
    // Ajouter la position actuelle au trail
    trail.push({ x: playerX, y: playerY, direction });
    
    // Garder seulement les 5 dernières positions (pour la distance)
    if (trail.length > 5) {
      trail.shift();
    }

    // Le follower prend la position d'il y a 2 cases
    if (trail.length >= this.trailDistance) {
      const followerPos = trail[trail.length - this.trailDistance];
      player.follower.x = followerPos.x;
      player.follower.y = followerPos.y;
      player.follower.direction = followerPos.direction;
      player.follower.isMoving = isMoving;
    } else {
      // Pas assez de positions, rester à la position actuelle
      player.follower.x = playerX;
      player.follower.y = playerY;
      player.follower.direction = direction;
      player.follower.isMoving = false;
    }
  }

  removePlayerFollower(playerId: string): void {
    const player = this.room.state.players.get(playerId);
    if (player && player.follower) {
      player.follower = undefined;
    }
    this.playerTrail.delete(playerId);
  }

  cleanup(): void {
    this.room.state.players.forEach((player: any) => {
      if (player.follower) {
        player.follower = undefined;
      }
    });
    this.playerTrail.clear();
  }

  // ✅ NOUVEAU: Permet de changer la distance dynamiquement
  setTrailDistance(distance: number): void {
    this.trailDistance = Math.max(1, Math.min(distance, 5)); // Entre 1 et 5
    console.log(`🐾 [FollowerManager] Distance changée à: ${this.trailDistance} cases`);
  }

  debugFollowers(): void {
    console.log(`🔍 [FollowerManager] === DEBUG SIMPLE (Distance: ${this.trailDistance}) ===`);
    let count = 0;
    this.room.state.players.forEach((player: any, playerId: string) => {
      if (player.follower) {
        count++;
        const trail = this.playerTrail.get(playerId);
        const trailLength = trail ? trail.length : 0;
        console.log(`🐾 ${player.name}: (${player.follower.x}, ${player.follower.y}) | Trail: ${trailLength} positions`);
        
        if (trail && trail.length > 0) {
          console.log(`  📍 Positions: ${trail.map(p => `(${p.x},${p.y})`).join(' → ')}`);
        }
      }
    });
    console.log(`📊 Total followers: ${count}`);
  }

  async refreshAllFollowers(): Promise<void> {
    const promises: Promise<void>[] = [];
    this.room.state.players.forEach((player: any, playerId: string) => {
      promises.push(this.updatePlayerFollower(playerId));
    });
    await Promise.all(promises);
  }
}
