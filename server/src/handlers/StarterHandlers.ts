// server/src/handlers/StarterHandlers.ts
import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { OwnedPokemon } from "../models/OwnedPokemon";
import { giveStarterToPlayer } from "../services/PokemonService";

export class StarterHandlers {
  private room: WorldRoom;
  private enableLogs: boolean = true; // 🔧 Variable pour activer/désactiver les logs

  constructor(room: WorldRoom) {
    this.room = room;
  }

  // ✅ Configuration des logs
  setLogging(enabled: boolean): void {
    this.enableLogs = enabled;
    this.log(`📝 Logs ${enabled ? 'ACTIVÉS' : 'DÉSACTIVÉS'}`);
  }

  // ✅ Helper pour les logs conditionnels
  private log(message: string, ...args: any[]): void {
    if (this.enableLogs) {
      console.log(`[StarterHandlers] ${message}`, ...args);
    }
  }

  private logError(message: string, ...args: any[]): void {
    // Les erreurs sont toujours loggées pour la sécurité
    console.error(`❌ [StarterHandlers] ${message}`, ...args);
  }

  // ✅ Configuration des handlers
  setupHandlers(): void {
    this.log(`📨 Configuration des handlers de starter...`);

    // Handler principal pour la sélection de starter
    this.room.onMessage("giveStarterChoice", async (client, data) => {
      await this.handleStarterChoice(client, data);
    });

    // Handler pour vérifier l'éligibilité
    this.room.onMessage("checkStarterEligibility", async (client) => {
      await this.handleCheckEligibility(client);
    });

    this.log(`✅ Handlers de starter configurés`);
  }

  // ================================================================================================
  // HANDLER PRINCIPAL - SÉLECTION SÉCURISÉE
  // ================================================================================================

  private async handleStarterChoice(client: Client, data: { pokemonId: number }): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("starterReceived", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      this.log(`🔍 Demande starter de ${player.name}: Pokémon #${data.pokemonId}`);

      // 🔒 VALIDATION COMPLÈTE
      const validation = await this.validateStarterRequest(player, data.pokemonId);
      if (!validation.valid) {
        this.log(`❌ Validation échouée pour ${player.name}: ${validation.reason}`);
        client.send("starterReceived", {
          success: false,
          message: validation.message
        });
        return;
      }

      // 🔒 SÉCURITÉ: Bloquer temporairement pour éviter le spam
      this.room.blockPlayerMovement(client.sessionId, 'starter_selection', 10000, {
        pokemonId: data.pokemonId,
        timestamp: Date.now()
      });

      this.log(`🎁 Création starter ${data.pokemonId} pour ${player.name}`);

      try {
        // Créer le starter avec ton service existant
        const starter = await giveStarterToPlayer(player.name, data.pokemonId as 1 | 4 | 7);
        
        this.log(`✅ Starter créé et ajouté à l'équipe de ${player.name}`, {
          starterId: starter._id,
          pokemonId: starter.pokemonId,
          level: starter.level,
          shiny: starter.shiny
        });
        
        // Envoyer la confirmation au client
        client.send("starterReceived", {
          success: true,
          pokemon: {
            id: starter._id,
            pokemonId: starter.pokemonId,
            name: starter.nickname || this.getPokemonName(starter.pokemonId),
            level: starter.level,
            shiny: starter.shiny,
            nature: starter.nature
          },
          message: `${starter.nickname || this.getPokemonName(starter.pokemonId)} a été ajouté à votre équipe !`
        });

        // Débloquer le mouvement
        this.room.unblockPlayerMovement(client.sessionId, 'starter_selection');

        // Log d'audit (toujours actif pour la sécurité)
        console.log(`🏆 [AUDIT] ${player.name} a reçu ${this.getPokemonName(starter.pokemonId)} (ID: ${starter._id})`);

      } catch (creationError) {
        this.logError(`Erreur création starter pour ${player.name}:`, creationError);
        
        // Débloquer en cas d'erreur
        this.room.unblockPlayerMovement(client.sessionId, 'starter_selection');
        
        client.send("starterReceived", {
          success: false,
          message: "Erreur lors de la création du starter. Réessayez."
        });
      }
      
    } catch (error) {
      // Débloquer même en cas d'erreur générale
      this.room.unblockPlayerMovement(client.sessionId, 'starter_selection');
      
      this.logError(`Erreur générale starter pour ${client.sessionId}:`, error);
      client.send("starterReceived", {
        success: false,
        message: "Erreur serveur. Contactez un administrateur."
      });
    }
  }

  // ================================================================================================
  // VALIDATION SÉCURISÉE
  // ================================================================================================

  private async validateStarterRequest(player: any, pokemonId: number): Promise<{
    valid: boolean;
    reason?: string;
    message: string;
  }> {
    // 🔒 SÉCURITÉ 1: Vérifier la zone
    if (player.currentZone !== "villagelab") {
      return {
        valid: false,
        reason: "wrong_zone",
        message: "Vous devez être dans le laboratoire du professeur !"
      };
    }

    // 🔒 SÉCURITÉ 2: Vérifier qu'il n'a pas déjà de Pokémon
    const existingCount = await OwnedPokemon.countDocuments({ owner: player.name });
    if (existingCount > 0) {
      return {
        valid: false,
        reason: "already_has_pokemon",
        message: "Vous avez déjà un Pokémon ! Un seul starter par dresseur."
      };
    }

    // 🔒 SÉCURITÉ 3: Valider l'ID du starter
    if (![1, 4, 7].includes(pokemonId)) {
      return {
        valid: false,
        reason: "invalid_starter",
        message: "Starter invalide ! Choisissez parmi les Pokémon proposés."
      };
    }

    // 🔒 SÉCURITÉ 4: Vérifier que le joueur n'est pas déjà en train de faire quelque chose
    if (this.room.isPlayerMovementBlocked(player.id)) {
      return {
        valid: false,
        reason: "player_busy",
        message: "Vous êtes déjà en train de faire quelque chose. Attendez un moment."
      };
    }

    return {
      valid: true,
      message: "Validation réussie"
    };
  }

  // ================================================================================================
  // HANDLER VÉRIFICATION D'ÉLIGIBILITÉ
  // ================================================================================================

  private async handleCheckEligibility(client: Client): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("starterEligibility", {
          eligible: false,
          reason: "Joueur non trouvé"
        });
        return;
      }

      this.log(`🔍 Vérification éligibilité starter pour ${player.name}`);

      // Vérifier l'éligibilité sans créer de Pokémon
      const validation = await this.validateStarterRequest(player, 1); // Test avec Bulbasaur

      client.send("starterEligibility", {
        eligible: validation.valid,
        reason: validation.reason,
        message: validation.message,
        currentZone: player.currentZone,
        requiredZone: "villagelab"
      });

      this.log(`📊 Éligibilité ${player.name}: ${validation.valid ? 'ÉLIGIBLE' : 'NON ÉLIGIBLE'} (${validation.reason || 'OK'})`);

    } catch (error) {
      this.logError(`Erreur vérification éligibilité pour ${client.sessionId}:`, error);
      client.send("starterEligibility", {
        eligible: false,
        reason: "server_error",
        message: "Erreur serveur"
      });
    }
  }

  // ================================================================================================
  // UTILITAIRES
  // ================================================================================================

  private getPokemonName(pokemonId: number): string {
    const names: { [key: number]: string } = {
      1: "Bulbizarre",
      4: "Salamèche", 
      7: "Carapuce"
    };
    return names[pokemonId] || `Pokémon #${pokemonId}`;
  }

  // ================================================================================================
  // MÉTHODES PUBLIQUES
  // ================================================================================================

  /**
   * Active/désactive les logs depuis l'extérieur
   */
  public toggleLogs(enabled: boolean): void {
    this.setLogging(enabled);
  }

  /**
   * Nettoyage à la destruction
   */
  public cleanup(): void {
    this.log(`🧹 Nettoyage des handlers de starter`);
  }
}
