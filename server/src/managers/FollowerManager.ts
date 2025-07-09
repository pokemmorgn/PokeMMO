import { TeamManager } from "./TeamManager";
import { IOwnedPokemon } from "../models/OwnedPokemon";
import { PokemonFollower } from "../schema/PokemonFollowerSchema";

export class FollowerManager {
  private room: any;
  private lastPlayerPositions: Map<string, { x: number, y: number, direction: string }> = new Map();
  
  constructor(room: any) {
    this.room = room;
    console.log("🐾 [FollowerManager] Version simple initialisée");
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

  // ✅ ULTRA SIMPLE : Le follower prend la position précédente du joueur
  updateFollowerPosition(playerId: string, playerX: number, playerY: number, direction: string, isMoving: boolean): void {
    const player = this.room.state.players.get(playerId);
    if (!player || !player.follower) return;

    // Le follower va à l'ancienne position du joueur
    const lastPos = this.lastPlayerPositions.get(playerId);
    if (lastPos) {
      player.follower.x = lastPos.x;
      player.follower.y = lastPos.y;
      player.follower.direction = lastPos.direction;
      player.follower.isMoving = isMoving;
    }

    // Sauvegarder la position actuelle du joueur pour le prochain mouvement
    this.lastPlayerPositions.set(playerId, { x: playerX, y: playerY, direction });
  }

  removePlayerFollower(playerId: string): void {
    const player = this.room.state.players.get(playerId);
    if (player && player.follower) {
      player.follower = undefined;
    }
    this.lastPlayerPositions.delete(playerId);
  }

  cleanup(): void {
    this.room.state.players.forEach((player: any) => {
      if (player.follower) {
        player.follower = undefined;
      }
    });
    this.lastPlayerPositions.clear();
  }

  debugFollowers(): void {
    console.log(`🔍 [FollowerManager] === DEBUG SIMPLE ===`);
    let count = 0;
    this.room.state.players.forEach((player: any, playerId: string) => {
      if (player.follower) {
        count++;
        const lastPos = this.lastPlayerPositions.get(playerId);
        console.log(`🐾 ${player.name}: (${player.follower.x}, ${player.follower.y}) | LastPos: (${lastPos?.x}, ${lastPos?.y})`);
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
