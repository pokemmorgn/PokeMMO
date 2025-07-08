import { TeamManager } from "./TeamManager";
import { IOwnedPokemon } from "../models/OwnedPokemon";
import { PokemonFollower } from "../schema/PokemonFollowerSchema";

export class FollowerManager {
  private room: any;
  
  constructor(room: any) {
    this.room = room;
    console.log("🐾 [FollowerManager] Initialisé");
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

      // Calculer la position derrière le joueur
      const followerPosition = this.calculateFollowerPosition(
        player.x, 
        player.y, 
        player.direction || 'down'
      );

      // Créer ou mettre à jour l'objet follower
      if (!player.follower) {
        player.follower = new PokemonFollower();
      }

      player.follower.pokemonId = pokemon.pokemonId;
      player.follower.nickname = pokemon.nickname || "";
      player.follower.x = followerPosition.x;
      player.follower.y = followerPosition.y;
      player.follower.direction = player.direction || 'down';
      player.follower.isMoving = player.isMoving || false;
      player.follower.isShiny = pokemon.shiny || false;
      player.follower.level = pokemon.level;

      console.log(`✅ [FollowerManager] Follower créé à (${followerPosition.x}, ${followerPosition.y})`);

    } catch (error) {
      console.error(`❌ [FollowerManager] Erreur createFollowerFromPokemon:`, error);
    }
  }

  /**
   * Calcule la position du follower derrière le joueur
   */
  private calculateFollowerPosition(playerX: number, playerY: number, direction: string): { x: number, y: number } {
    const offset = 32; // Distance derrière le joueur
    
    switch (direction) {
      case 'up':
        return { x: playerX, y: playerY + offset };
      case 'down':
        return { x: playerX, y: playerY - offset };
      case 'left':
        return { x: playerX + offset, y: playerY };
      case 'right':
        return { x: playerX - offset, y: playerY };
      default:
        return { x: playerX, y: playerY + offset }; // Défaut: derrière vers le bas
    }
  }

  /**
   * Met à jour la position du follower lors du mouvement du joueur
   */
  updateFollowerPosition(playerId: string, playerX: number, playerY: number, direction: string, isMoving: boolean): void {
    try {
      const player = this.room.state.players.get(playerId);
      if (!player || !player.follower) {
        return;
      }

      // Calculer la nouvelle position du follower
      const followerPosition = this.calculateFollowerPosition(playerX, playerY, direction);
      
      // Mettre à jour les propriétés du follower
      player.follower.x = followerPosition.x;
      player.follower.y = followerPosition.y;
      player.follower.direction = direction;
      player.follower.isMoving = isMoving;

      // Log occasionnel pour debug
      if (Math.random() < 0.05) { // 5% des mouvements
        console.log(`🐾 [FollowerManager] ${player.name} follower: (${followerPosition.x}, ${followerPosition.y}) ${direction}`);
      }

    } catch (error) {
      console.error(`❌ [FollowerManager] Erreur updateFollowerPosition:`, error);
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
  }

  /**
   * Debug - affiche l'état de tous les followers
   */
  debugFollowers(): void {
    console.log(`🔍 [FollowerManager] === DEBUG FOLLOWERS ===`);
    
    let followerCount = 0;
    this.room.state.players.forEach((player: any, playerId: string) => {
      if (player.follower) {
        followerCount++;
        console.log(`🐾 ${player.name}:`, {
          pokemonId: player.follower.pokemonId,
          nickname: player.follower.nickname,
          position: `(${player.follower.x}, ${player.follower.y})`,
          direction: player.follower.direction,
          isMoving: player.follower.isMoving,
          isShiny: player.follower.isShiny,
          level: player.follower.level
        });
      }
    });
    
    console.log(`📊 Total followers actifs: ${followerCount}`);
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
}
