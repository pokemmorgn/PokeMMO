// server/src/services/StarterPokemonService.ts
import { OwnedPokemon } from "../models/OwnedPokemon";
import { PlayerData } from "../models/PlayerData";
import { createCompletePokemon, giveStarterToPlayer } from "./PokemonService";

export interface StarterServiceConfig {
  enabled: boolean;
  pokemonId: number;
  level: number;
  nickname?: string;
  logActivity: boolean;
}

/**
 * Harmonise le format du genre selon le modèle Mongoose :
 * - "Male", "Female", "Genderless"
 * @param gender
 */
function toModelGender(gender: string | undefined): "Male" | "Female" | "Genderless" {
  if (!gender) return "Genderless";
  switch (gender.toLowerCase()) {
    case "male":
    case "m":
      return "Male";
    case "female":
    case "f":
      return "Female";
    case "genderless":
    case "none":
    case "n":
      return "Genderless";
    default:
      return "Genderless";
  }
}

export class StarterPokemonService {
  private static instance: StarterPokemonService;
  private config: StarterServiceConfig;

  private constructor() {
    // Configuration par défaut
    this.config = {
      enabled: true,              // ✅ Facile à désactiver
      pokemonId: 1,               // Bulbasaur par défaut
      level: 5,                   // Niveau 5 comme un vrai starter
      nickname: "Starter",        // Surnom optionnel
      logActivity: true           // Log pour debug
    };
  }

  public static getInstance(): StarterPokemonService {
    if (!StarterPokemonService.instance) {
      StarterPokemonService.instance = new StarterPokemonService();
    }
    return StarterPokemonService.instance;
  }

  // ================================================================================================
  // CONFIGURATION
  // ================================================================================================

  public configure(config: Partial<StarterServiceConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.config.logActivity) {
      console.log(`🔧 [StarterService] Configuration mise à jour:`, this.config);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;

    if (this.config.logActivity) {
      console.log(`🔧 [StarterService] Service ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
    }
  }

  public setStarterPokemon(pokemonId: number, level: number = 5): void {
    this.config.pokemonId = pokemonId;
    this.config.level = level;

    if (this.config.logActivity) {
      console.log(`🔧 [StarterService] Nouveau starter: Pokémon #${pokemonId} niveau ${level}`);
    }
  }

  public getConfig(): StarterServiceConfig {
    return { ...this.config };
  }

  // ================================================================================================
  // LOGIQUE PRINCIPALE
  // ================================================================================================

  public async ensurePlayerHasStarter(username: string): Promise<{
    needed: boolean;
    given: boolean;
    pokemonName?: string;
    error?: string;
  }> {
    if (!this.config.enabled) {
      return { needed: false, given: false };
    }

    try {
      if (this.config.logActivity) {
        console.log(`🔍 [StarterService] Vérification starter pour ${username}...`);
      }

      const playerData = await PlayerData.findOne({ username });
      if (!playerData) {
        if (this.config.logActivity) {
          console.log(`⚠️ [StarterService] PlayerData introuvable pour ${username}`);
        }
        return { needed: false, given: false, error: "PlayerData introuvable" };
      }

      const pokemonCount = await OwnedPokemon.countDocuments({ owner: username });

      if (pokemonCount > 0) {
        if (this.config.logActivity) {
          console.log(`ℹ️ [StarterService] ${username} a déjà ${pokemonCount} Pokémon`);
        }
        return { needed: false, given: false };
      }

      if (this.config.logActivity) {
        console.log(`🎁 [StarterService] ${username} a besoin d'un starter ! Création en cours...`);
      }

      const starter = await this.giveStarterToPlayer(username);

      if (this.config.logActivity) {
        console.log(`✅ [StarterService] Starter donné à ${username}: ${starter.nickname || 'Pokémon'} #${starter.pokemonId} niveau ${starter.level}`);
      }

      return {
        needed: true,
        given: true,
        pokemonName: starter.nickname || `Pokémon #${starter.pokemonId}`
      };

    } catch (error) {
      console.error(`❌ [StarterService] Erreur pour ${username}:`, error);
      return {
        needed: true,
        given: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"
      };
    }
  }

  public async forceGiveStarter(username: string): Promise<{
    success: boolean;
    pokemonName?: string;
    error?: string;
  }> {
    if (!this.config.enabled) {
      return { success: false, error: "Service désactivé" };
    }

    try {
      if (this.config.logActivity) {
        console.log(`🎁 [StarterService] Force starter pour ${username}...`);
      }

      const starter = await this.giveStarterToPlayer(username);

      if (this.config.logActivity) {
        console.log(`✅ [StarterService] Starter forcé donné à ${username}: ${starter.nickname || 'Pokémon'} #${starter.pokemonId}`);
      }

      return {
        success: true,
        pokemonName: starter.nickname || `Pokémon #${starter.pokemonId}`
      };

    } catch (error) {
      console.error(`❌ [StarterService] Erreur force starter pour ${username}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"
      };
    }
  }

  // ================================================================================================
  // MÉTHODES PRIVÉES
  // ================================================================================================

private async giveStarterToPlayer(username: string) {
  // Utiliser giveStarterToPlayer si c'est un starter officiel (1, 4, 7)
  const officialStarters = [1, 4, 7]; // Bulbasaur, Charmander, Squirtle

  if (officialStarters.includes(this.config.pokemonId)) {
    return await giveStarterToPlayer(username, this.config.pokemonId as 1 | 4 | 7);
  } else {
    // Utiliser createCompletePokemon pour n'importe quel Pokémon (genre géré en interne)
    return await createCompletePokemon(username, {
      pokemonId: this.config.pokemonId,
      level: this.config.level,
      nickname: this.config.nickname,
      inTeam: true,
      shiny: Math.random() < 0.001 // 0.1% de chance de shiny pour les starters de test
      // PAS de "gender" ici
    });
  }
}


  // ================================================================================================
  // MÉTHODES UTILITAIRES
  // ================================================================================================

  public async getStats(): Promise<{
    totalPlayersWithPokemon: number;
    totalPlayersWithoutPokemon: number;
    totalStarters: number;
  }> {
    try {
      const totalPlayers = await PlayerData.countDocuments();
      const playersWithPokemon = await OwnedPokemon.distinct('owner').then(owners => owners.length);
      const totalStarters = await OwnedPokemon.countDocuments({
        pokemonId: { $in: [1, 4, 7] }, // Starters officiels
        level: { $lte: 10 } // Probablement des starters
      });

      return {
        totalPlayersWithPokemon: playersWithPokemon,
        totalPlayersWithoutPokemon: totalPlayers - playersWithPokemon,
        totalStarters: totalStarters
      };
    } catch (error) {
      console.error(`❌ [StarterService] Erreur getStats:`, error);
      return {
        totalPlayersWithPokemon: 0,
        totalPlayersWithoutPokemon: 0,
        totalStarters: 0
      };
    }
  }

  public debug(): void {
    console.log(`🔍 [StarterService] === DEBUG ===`);
    console.log(`Configuration:`, this.config);

    this.getStats().then(stats => {
      console.log(`Statistiques:`, stats);
      console.log(`===============================`);
    });
  }

  public async cleanupAllStarters(): Promise<number> {
    if (!this.config.enabled) {
      console.warn(`⚠️ [StarterService] Cleanup refusé: service désactivé`);
      return 0;
    }

    try {
      const result = await OwnedPokemon.deleteMany({
        pokemonId: { $in: [1, 4, 7] },
        level: { $lte: 10 }
      });

      if (this.config.logActivity) {
        console.log(`🗑️ [StarterService] ${result.deletedCount} starters supprimés`);
      }

      return result.deletedCount || 0;
    } catch (error) {
      console.error(`❌ [StarterService] Erreur cleanup:`, error);
      return 0;
    }
  }
}

// ================================================================================================
// EXPORT DE CONVENANCE
// ================================================================================================

export const starterService = StarterPokemonService.getInstance();

export async function ensurePlayerHasStarter(username: string) {
  return await starterService.ensurePlayerHasStarter(username);
}

export function enableStarterService(enabled: boolean = true) {
  starterService.setEnabled(enabled);
}

export function setStarterPokemon(pokemonId: number, level: number = 5) {
  starterService.setStarterPokemon(pokemonId, level);
}

export default StarterPokemonService;
