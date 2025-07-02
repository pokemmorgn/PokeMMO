// server/src/handlers/StarterHandlers.ts - Version avec vérification de proximité
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
  private starterTableZones: Map<string, StarterTableZone[]> = new Map(); // Par zone

  constructor(room: WorldRoom) {
    this.room = room;
    this.loadStarterTableZonesFromMaps();
  }

  // ✅ NOUVEAU: Charger les zones depuis les cartes Tiled
  private async loadStarterTableZonesFromMaps(): Promise<void> {
    this.log("🗺️ Chargement des zones starter depuis les cartes Tiled...");
    
    try {
      // Charger la carte du laboratoire
      await this.loadStarterZonesFromMap("villagelab");
      
      // Ajouter d'autres cartes si nécessaire
      // await this.loadStarterZonesFromMap("other_lab");
      
      this.log(`✅ ${this.starterTableZones.size} cartes chargées avec starter tables`);
    } catch (error) {
      this.logError("Erreur lors du chargement des cartes:", error);
      // Fallback vers une configuration minimale
      this.createFallbackZones();
    }
  }

  // ✅ MÉTHODE: Charger les zones depuis une carte spécifique
  private async loadStarterZonesFromMap(zoneName: string): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Chemin vers la carte Tiled
      const mapFile = path.join(__dirname, '../../assets/maps', `${zoneName}.tmj`);
      
      // Lire le fichier JSON
      const mapData = JSON.parse(await fs.readFile(mapFile, 'utf8'));
      
      const zones: StarterTableZone[] = [];
      
      // Parcourir tous les layers pour trouver les objets
      for (const layer of mapData.layers || []) {
        if (layer.type === 'objectgroup' && layer.objects) {
          for (const obj of layer.objects) {
            // Vérifier si l'objet a la propriété startertable
            if (this.hasStarterTableProperty(obj)) {
              const zone: StarterTableZone = {
                x: obj.x,
                y: obj.y,
                width: obj.width || 32,
                height: obj.height || 32,
                centerX: obj.x + (obj.width || 32) / 2,
                centerY: obj.y + (obj.height || 32) / 2,
                name: obj.name || 'StarterTable'
              };
              
              zones.push(zone);
              this.log(`📍 Zone starter trouvée: ${zone.name} à (${zone.centerX}, ${zone.centerY})`);
            }
          }
        }
      }
      
      if (zones.length > 0) {
        this.starterTableZones.set(zoneName, zones);
        this.log(`✅ ${zones.length} zone(s) starter chargée(s) pour ${zoneName}`);
      } else {
        this.log(`⚠️ Aucune zone starter trouvée dans ${zoneName}`);
      }
      
    } catch (error) {
      this.logError(`Erreur chargement carte ${zoneName}:`, error);
    }
  }

  // ✅ MÉTHODE: Vérifier si un objet a la propriété startertable
  private hasStarterTableProperty(obj: any): boolean {
    if (!obj.properties) return false;
    
    // Tiled peut stocker les propriétés de différentes façons
    if (Array.isArray(obj.properties)) {
      // Format tableau
      const starterProp = obj.properties.find((prop: any) => 
        prop.name === 'startertable' || prop.name === 'starterTable'
      );
      return starterProp && (starterProp.value === true || starterProp.value === 'true');
    } else if (typeof obj.properties === 'object') {
      // Format objet
      return obj.properties.startertable === true || 
             obj.properties.startertable === 'true' ||
             obj.properties.starterTable === true || 
             obj.properties.starterTable === 'true';
    }
    
    return false;
  }

  // ✅ MÉTHODE: Fallback si impossible de charger depuis les cartes
  private createFallbackZones(): void {
    this.log("🔄 Création des zones fallback...");
    
    const fallbackZones: StarterTableZone[] = [{
      x: 200,
      y: 150,
      width: 60,
      height: 40,
      centerX: 230,
      centerY: 170,
      name: "DefaultStarterTable"
    }];
    
    this.starterTableZones.set("villagelab", fallbackZones);
    this.log("✅ Zone fallback créée pour villagelab");
  }

  // ✅ NOUVEAU: Vérifier si le joueur est près d'une starter table
  private isPlayerNearStarterTable(player: any): boolean {
    const playerZone = player.currentZone;
    const starterZones = this.starterTableZones.get(playerZone);
    
    if (!starterZones || starterZones.length === 0) {
      this.log(`⚠️ Aucune starter table configurée pour la zone: ${playerZone}`);
      return false;
    }

    const playerX = player.x;
    const playerY = player.y;
    const maxDistance = 50; // Distance maximale en pixels

    for (const zone of starterZones) {
      // Calculer la distance entre le joueur et le centre de la zone
      const distance = Math.sqrt(
        Math.pow(playerX - zone.centerX, 2) + 
        Math.pow(playerY - zone.centerY, 2)
      );

      if (distance <= maxDistance) {
        this.log(`🎯 Joueur ${player.name} près de ${zone.name}: distance ${Math.round(distance)}px`);
        return true;
      }
    }

    this.log(`❌ Joueur ${player.name} trop loin des starter tables dans ${playerZone}`);
    this.log(`📍 Position joueur: (${playerX}, ${playerY})`);
    
    // Debug: afficher les zones disponibles
    starterZones.forEach((zone, index) => {
      const dist = Math.sqrt(
        Math.pow(playerX - zone.centerX, 2) + 
        Math.pow(playerY - zone.centerY, 2)
      );
      this.log(`  📏 ${zone.name}: centre(${zone.centerX}, ${zone.centerY}) - distance: ${Math.round(dist)}px`);
    });

    return false;
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

    // ✅ NOUVEAU: Handler pour vérifier la proximité
    this.room.onMessage("checkStarterProximity", async (client) => {
      await this.handleCheckProximity(client);
    });

    // Handler pour forcer un starter (admin/debug)
    this.room.onMessage("forceGiveStarter", async (client, data) => {
      await this.handleForceStarter(client, data);
    });

    // ✅ NOUVEAU: Handler pour debug des zones
    this.room.onMessage("debugStarterZones", async (client) => {
      await this.handleDebugZones(client);
    });

    this.log(`✅ Handlers de starter configurés`);
  }

  // ================================================================================================
  // HANDLER PRINCIPAL - SÉLECTION SÉCURISÉE AVEC PROXIMITÉ
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

      // 🔒 VALIDATION COMPLÈTE (incluant proximité)
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

  // ✅ NOUVELLE MÉTHODE: Vérifier la proximité côté serveur
  private isPlayerNearStarterTable(player: any): boolean {
    console.log(`🔍 [StarterHandlers] Vérification proximité pour ${player.name}`);
    console.log(`📍 [StarterHandlers] Position: (${player.x}, ${player.y}) dans ${player.currentZone}`);
    
    // Pour l'instant, utiliser une zone approximative
    // TODO: Plus tard, on pourra lire la carte Tiled côté serveur aussi
    
    if (player.currentZone !== "villagelab") {
      console.log(`❌ [StarterHandlers] Mauvaise zone: ${player.currentZone}`);
      return false;
    }
    
    // Zone approximative où devrait être la table du professeur dans villagelab
    // Ajustez ces coordonnées selon votre carte
    const starterTableArea = {
      centerX: 200,  // Centre X de votre table
      centerY: 150,  // Centre Y de votre table
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
  // HANDLER VÉRIFICATION D'ÉLIGIBILITÉ AVEC PROXIMITÉ
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

      // ✅ NOUVEAU: Informations détaillées pour le debug
      const detailedResponse = {
        eligible: validation.valid,
        reason: validation.reason,
        message: validation.message,
        currentZone: player.currentZone,
        requiredZone: "villagelab",
        playerPosition: { x: player.x, y: player.y },
        nearStarterTable: this.isPlayerNearStarterTable(player),
        debugInfo: {
          zonesAvailable: this.starterTableZones.has(player.currentZone),
          totalZones: this.starterTableZones.size
        }
      };

      client.send("starterEligibility", detailedResponse);

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
  // NOUVEAU: HANDLER VÉRIFICATION DE PROXIMITÉ
  // ================================================================================================

  private async handleCheckProximity(client: Client): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("starterProximity", {
          near: false,
          reason: "Joueur non trouvé"
        });
        return;
      }

      const isNear = this.isPlayerNearStarterTable(player);
      const starterZones = this.starterTableZones.get(player.currentZone);

      client.send("starterProximity", {
        near: isNear,
        playerPosition: { x: player.x, y: player.y },
        currentZone: player.currentZone,
        availableZones: starterZones ? starterZones.map(z => ({
          name: z.name,
          center: { x: z.centerX, y: z.centerY },
          distance: Math.sqrt(
            Math.pow(player.x - z.centerX, 2) + 
            Math.pow(player.y - z.centerY, 2)
          )
        })) : []
      });

      this.log(`📍 Proximité ${player.name}: ${isNear ? 'PROCHE' : 'ÉLOIGNÉ'}`);

    } catch (error) {
      this.logError(`Erreur vérification proximité pour ${client.sessionId}:`, error);
      client.send("starterProximity", {
        near: false,
        reason: "Erreur serveur"
      });
    }
  }

  // ================================================================================================
  // NOUVEAU: HANDLER DEBUG DES ZONES
  // ================================================================================================

  private async handleDebugZones(client: Client): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        client.send("starterZonesDebug", { error: "Joueur non trouvé" });
        return;
      }

      const debugInfo = {
        playerInfo: {
          name: player.name,
          position: { x: player.x, y: player.y },
          currentZone: player.currentZone
        },
        configuredZones: {},
        currentZoneInfo: null
      };

      // Toutes les zones configurées
      this.starterTableZones.forEach((zones, zoneName) => {
        debugInfo.configuredZones[zoneName] = zones.map(zone => ({
          name: zone.name,
          center: { x: zone.centerX, y: zone.centerY },
          size: { width: zone.width, height: zone.height },
          distance: player.currentZone === zoneName ? Math.sqrt(
            Math.pow(player.x - zone.centerX, 2) + 
            Math.pow(player.y - zone.centerY, 2)
          ) : null
        }));
      });

      // Info de la zone actuelle
      const currentZones = this.starterTableZones.get(player.currentZone);
      if (currentZones) {
        debugInfo.currentZoneInfo = {
          zoneName: player.currentZone,
          tablesCount: currentZones.length,
          nearestTable: currentZones.reduce((nearest, zone) => {
            const distance = Math.sqrt(
              Math.pow(player.x - zone.centerX, 2) + 
              Math.pow(player.y - zone.centerY, 2)
            );
            
            if (!nearest || distance < nearest.distance) {
              return {
                name: zone.name,
                distance: distance,
                center: { x: zone.centerX, y: zone.centerY }
              };
            }
            return nearest;
          }, null)
        };
      }

      client.send("starterZonesDebug", debugInfo);
      this.log(`🔍 Debug zones envoyé à ${player.name}`);

    } catch (error) {
      this.logError(`Erreur debug zones pour ${client.sessionId}:`, error);
      client.send("starterZonesDebug", { error: "Erreur serveur" });
    }
  }

  // ================================================================================================
  // HANDLER FORCE STARTER (ADMIN/DEBUG) - INCHANGÉ
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

  // ✅ NOUVEAU: Méthodes pour gérer les zones de starter table
  public addStarterTableZone(zoneName: string, zone: StarterTableZone): void {
    const zones = this.starterTableZones.get(zoneName) || [];
    zones.push(zone);
    this.starterTableZones.set(zoneName, zones);
    this.log(`➕ Zone starter ajoutée: ${zone.name} dans ${zoneName}`);
  }

  public removeStarterTableZone(zoneName: string, zoneName2: string): void {
    const zones = this.starterTableZones.get(zoneName);
    if (zones) {
      const filtered = zones.filter(z => z.name !== zoneName2);
      this.starterTableZones.set(zoneName, filtered);
      this.log(`➖ Zone starter supprimée: ${zoneName2} de ${zoneName}`);
    }
  }

  public getStarterTableZones(zoneName: string): StarterTableZone[] {
    return this.starterTableZones.get(zoneName) || [];
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
        logsEnabled: this.enableLogs,
        configuredZones: Array.from(this.starterTableZones.keys()),
        totalZones: this.starterTableZones.size
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
    this.starterTableZones.clear();
  }
}
