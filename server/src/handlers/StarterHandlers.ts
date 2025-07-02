// server/src/handlers/StarterHandlers.ts - Version corrigée
import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { OwnedPokemon } from "../models/OwnedPokemon";
import { giveStarterToPlayer } from "../services/PokemonService";

interface StarterTableZone {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  name: string;
}

export class StarterHandlers {
  private room: WorldRoom;
  private enableLogs: boolean = true;

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
      console.log("[StarterHandlers] Reçu giveStarterChoice", data, "de", client.sessionId);
      await this.handleStarterChoice(client, data);
    });

    // Handler pour vérifier l'éligibilité
    this.room.onMessage("checkStarterEligibility", async (client) => {
      await this.handleCheckEligibility(client);
    });

    // Handler pour forcer un starter (admin/debug)
    this.room.onMessage("forceGiveStarter", async (client, data) => {
      await this.handleForceStarter(client, data);
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
      this.room.blockPlayerMovement(client.sessionId, 'dialog', 10000, {
        type: 'starter_selection',
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
        this.room.unblockPlayerMovement(client.sessionId, 'dialog');

        // Log d'audit (toujours actif pour la sécurité)
        console.log(`🏆 [AUDIT] ${player.name} a reçu ${this.getPokemonName(starter.pokemonId)} (ID: ${starter._id})`);

      } catch (creationError) {
        this.logError(`Erreur création starter pour ${player.name}:`, creationError);
        
        // Débloquer en cas d'erreur
        this.room.unblockPlayerMovement(client.sessionId, 'dialog');
        
        client.send("starterReceived", {
          success: false,
          message: "Erreur lors de la création du starter. Réessayez."
        });
      }
      
    } catch (error) {
      // Débloquer même en cas d'erreur générale
      this.room.unblockPlayerMovement(client.sessionId, 'dialog');
      
      this.logError(`Erreur générale starter pour ${client.sessionId}:`, error);
      client.send("starterReceived", {
        success: false,
        message: "Erreur serveur. Contactez un administrateur."
      });
    }
  }

  // ================================================================================================
  // VALIDATION SÉCURISÉE AVEC PROXIMITÉ
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

    // 🔒 SÉCURITÉ 2: NOUVEAU - Vérifier la proximité de la starter table
    if (!this.isPlayerNearStarterTable(player)) {
      return {
        valid: false,
        reason: "not_near_starter_table",
        message: "Approchez-vous de la table du professeur pour choisir votre starter !"
      };
    }

    // 🔒 SÉCURITÉ 3: Vérifier qu'il n'a pas déjà de Pokémon
    const existingCount = await OwnedPokemon.countDocuments({ owner: player.name });
    if (existingCount > 0) {
      return {
        valid: false,
        reason: "already_has_pokemon",
        message: "Vous avez déjà un Pokémon ! Un seul starter par dresseur."
      };
    }

    // 🔒 SÉCURITÉ 4: Valider l'ID du starter
    if (![1, 4, 7].includes(pokemonId)) {
      return {
        valid: false,
        reason: "invalid_starter",
        message: "Starter invalide ! Choisissez parmi les Pokémon proposés."
      };
    }

    // 🔒 SÉCURITÉ 5: Vérifier que le joueur n'est pas déjà en train de faire quelque chose
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

  // ✅ MÉTHODE UNIQUE: Vérifier la proximité côté serveur
  private isPlayerNearStarterTable(player: any): boolean {
    console.log(`🔍 [StarterHandlers] Vérification proximité pour ${player.name}`);
    console.log(`📍 [StarterHandlers] Position: (${player.x}, ${player.y}) dans ${player.currentZone}`);
    
    if (player.currentZone !== "villagelab") {
      console.log(`❌ [StarterHandlers] Mauvaise zone: ${player.currentZone}`);
      return false;
    }
    
    // Zone approximative où devrait être la table du professeur dans villagelab
    // Ajustez ces coordonnées selon votre carte
    const starterTableArea = {
      centerX: 200,  // Centre X de votre table - AJUSTEZ SELON VOTRE CARTE
      centerY: 150,  // Centre Y de votre table - AJUSTEZ SELON VOTRE CARTE
      radius: 60     // Rayon de détection
    };
    
    const distance = Math.sqrt(
      Math.pow(player.x - starterTableArea.centerX, 2) + 
      Math.pow(player.y - starterTableArea.centerY, 2)
    );
    
    const isNear = distance <= starterTableArea.radius;
    
    console.log(`🎯 [StarterHandlers] Distance à la table: ${Math.round(distance)}px`);
    console.log(`📊 [StarterHandlers] Zone table: centre(${starterTableArea.centerX}, ${starterTableArea.centerY}) rayon=${starterTableArea.radius}`);
    console.log(`✅ [StarterHandlers] Résultat proximité: ${isNear}`);
    
    return isNear;
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

      const response = {
        eligible: validation.valid,
        reason: validation.reason,
        message: validation.message,
        currentZone: player.currentZone,
        requiredZone: "villagelab",
        playerPosition: { x: player.x, y: player.y },
        nearStarterTable: this.isPlayerNearStarterTable(player),
        debugInfo: {
          timestamp: Date.now(),
          sessionId: client.sessionId
        }
      };

      client.send("starterEligibility", response);
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
  // HANDLER FORCE STARTER (ADMIN/DEBUG)
  // ================================================================================================

  private async handleForceStarter(client: Client, data: { 
    pokemonId: number; 
    targetPlayer?: string;
    adminKey?: string;
  }): Promise<void> {
    try {
      // Vérification basique d'admin (tu peux améliorer ça)
      if (data.adminKey !== "dev_mode_2024") {
        client.send("forceStarterResult", {
          success: false,
          message: "Accès refusé"
        });
        return;
      }

      const targetName = data.targetPlayer || this.room.state.players.get(client.sessionId)?.name;
      if (!targetName) {
        client.send("forceStarterResult", {
          success: false,
          message: "Joueur cible non trouvé"
        });
        return;
      }

      this.log(`🔧 [ADMIN] Force starter ${data.pokemonId} pour ${targetName}`);

      // Supprimer les Pokémon existants pour les tests
      await OwnedPokemon.deleteMany({ owner: targetName });
      this.log(`🗑️ [ADMIN] Pokémon existants supprimés pour ${targetName}`);

      // Créer le starter forcé
      const starter = await giveStarterToPlayer(targetName, data.pokemonId as 1 | 4 | 7);

      client.send("forceStarterResult", {
        success: true,
        pokemon: {
          id: starter._id,
          pokemonId: starter.pokemonId,
          name: this.getPokemonName(starter.pokemonId),
          level: starter.level
        },
        message: `Starter forcé créé pour ${targetName}`
      });

      // Log d'audit admin
      console.log(`🔧 [ADMIN AUDIT] Force starter par ${client.sessionId} → ${targetName} (Pokémon #${data.pokemonId})`);

    } catch (error) {
      this.logError(`Erreur force starter:`, error);
      client.send("forceStarterResult", {
        success: false,
        message: "Erreur lors de la création forcée"
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
   * Obtenir les statistiques des starters
   */
  public async getStats(): Promise<any> {
    try {
      const totalStarters = await OwnedPokemon.countDocuments({
        pokemonId: { $in: [1, 4, 7] },
        level: { $lte: 10 }
      });

      const startersByType = await OwnedPokemon.aggregate([
        { $match: { pokemonId: { $in: [1, 4, 7] }, level: { $lte: 10 } } },
        { $group: { _id: "$pokemonId", count: { $sum: 1 } } }
      ]);

      return {
        totalStarters,
        distribution: startersByType,
        logsEnabled: this.enableLogs
      };
    } catch (error) {
      this.logError(`Erreur getStats:`, error);
      return { error: "Impossible de récupérer les stats" };
    }
  }

  /**
   * Nettoyer tous les starters (admin/dev)
   */
  public async cleanupAllStarters(): Promise<number> {
    try {
      const result = await OwnedPokemon.deleteMany({
        pokemonId: { $in: [1, 4, 7] },
        level: { $lte: 10 }
      });

      this.log(`🗑️ ${result.deletedCount || 0} starters supprimés`);
      return result.deletedCount || 0;
    } catch (error) {
      this.logError(`Erreur cleanup:`, error);
      return 0;
    }
  }

  /**
   * Nettoyage à la destruction
   */
  public cleanup(): void {
    this.log(`🧹 Nettoyage des handlers de starter`);
    // Nettoyage si nécessaire
  }
}
