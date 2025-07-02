// server/src/handlers/StarterHandlers.ts - Version complète avec auto-détection
import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { OwnedPokemon } from "../models/OwnedPokemon";
import { giveStarterToPlayer } from "../services/PokemonService";
import { readFileSync } from 'fs';
import { join } from 'path';

export class StarterHandlers {
  private room: WorldRoom;
  private enableLogs: boolean = true;
  private starterTablePositions: Map<string, { centerX: number, centerY: number, radius: number }> = new Map();

  constructor(room: WorldRoom) {
    this.room = room;
    this.loadStarterTablePositions(); // ✅ AUTO-CHARGEMENT
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

  // ✅ NOUVELLE MÉTHODE: Charger les positions des tables depuis les cartes Tiled
  private loadStarterTablePositions(): void {
    console.log(`🗺️ [StarterHandlers] Chargement des positions de tables starter...`);
    
    // Liste des zones qui peuvent avoir des tables starter
    const zonesToCheck = ['villagelab', 'village', 'lavandia', 'lavandiaresearchlab'];
    
    zonesToCheck.forEach(zoneName => {
      try {
        const mapPath = join(__dirname, `../../assets/maps/${zoneName}.tmj`);
        console.log(`📂 [StarterHandlers] Lecture carte: ${mapPath}`);
        
        const mapData = JSON.parse(readFileSync(mapPath, 'utf8'));
        const starterTable = this.findStarterTableInMap(mapData, zoneName);
        
        if (starterTable) {
          this.starterTablePositions.set(zoneName, starterTable);
          console.log(`✅ [StarterHandlers] Table starter trouvée dans ${zoneName}:`, starterTable);
        } else {
          console.log(`ℹ️ [StarterHandlers] Pas de table starter dans ${zoneName}`);
        }
        
      } catch (error) {
        console.warn(`⚠️ [StarterHandlers] Impossible de charger ${zoneName}:`, error instanceof Error ? error.message : String(error));
        
        // Fallback pour villagelab si le fichier n'existe pas
        if (zoneName === 'villagelab') {
          this.starterTablePositions.set(zoneName, {
            centerX: 210,
            centerY: 160,
            radius: 80
          });
          console.log(`🔄 [StarterHandlers] Fallback villagelab activé`);
        }
      }
    });
    
    console.log(`📊 [StarterHandlers] Total zones avec tables: ${this.starterTablePositions.size}`);
  }

  // ✅ NOUVELLE MÉTHODE: Chercher la table starter dans une carte Tiled
  private findStarterTableInMap(mapData: any, zoneName: string): { centerX: number, centerY: number, radius: number } | null {
    console.log(`🔍 [StarterHandlers] Recherche table starter dans ${zoneName}...`);
    
    if (!mapData.layers) {
      console.warn(`⚠️ [StarterHandlers] Pas de layers dans ${zoneName}`);
      return null;
    }
    
    // Parcourir tous les layers d'objets
    for (const layer of mapData.layers) {
      if (layer.type === 'objectgroup' && layer.objects) {
        console.log(`🔍 [StarterHandlers] Vérification layer "${layer.name}" (${layer.objects.length} objets)`);
        
        for (const obj of layer.objects) {
          if (this.isStarterTableObject(obj)) {
            const centerX = obj.x + (obj.width || 32) / 2;
            const centerY = obj.y + (obj.height || 32) / 2;
            const radius = Math.max(obj.width || 32, obj.height || 32) + 40; // Rayon généreux
            
            console.log(`🎯 [StarterHandlers] Table starter trouvée dans ${zoneName}:`, {
              objectName: obj.name,
              objectType: obj.type,
              originalPos: `(${obj.x}, ${obj.y})`,
              size: `${obj.width || 32}x${obj.height || 32}`,
              calculatedCenter: `(${centerX}, ${centerY})`,
              detectionRadius: radius
            });
            
            return { centerX, centerY, radius };
          }
        }
      }
    }
    
    console.log(`❌ [StarterHandlers] Aucune table starter trouvée dans ${zoneName}`);
    return null;
  }

  // ✅ NOUVELLE MÉTHODE: Vérifier si un objet est une table starter
  private isStarterTableObject(obj: any): boolean {
    // Vérifier les propriétés custom de Tiled
    if (obj.properties) {
      // Format tableau (Tiled récent)
      if (Array.isArray(obj.properties)) {
        const starterProp = obj.properties.find((prop: any) => 
          prop.name === 'startertable' || prop.name === 'starterTable'
        );
        if (starterProp && (starterProp.value === true || starterProp.value === 'true')) {
          return true;
        }
      } 
      // Format objet (Tiled ancien)
      else if (typeof obj.properties === 'object') {
        if (obj.properties.startertable === true || 
            obj.properties.startertable === 'true' ||
            obj.properties.starterTable === true || 
            obj.properties.starterTable === 'true') {
          return true;
        }
      }
    }
    
    // Fallback: Vérifier le nom ou type
    if (obj.name && (
        obj.name.toLowerCase().includes('starter') ||
        obj.name.toLowerCase().includes('professor') ||
        obj.name.toLowerCase().includes('table')
    )) {
      console.log(`🎯 [StarterHandlers] Objet détecté par nom: ${obj.name}`);
      return true;
    }
    
    if (obj.type && (
        obj.type.toLowerCase().includes('starter') ||
        obj.type.toLowerCase().includes('professor')
    )) {
      console.log(`🎯 [StarterHandlers] Objet détecté par type: ${obj.type}`);
      return true;
    }
    
    return false;
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

    // ✅ NOUVEAUX HANDLERS POUR DEBUG AUTO-DÉTECTION
    this.room.onMessage("debugStarterTables", (client) => {
      console.log(`🔍 [StarterHandlers] Debug tables demandé par ${client.sessionId}`);
      this.debugStarterTablePositions();
      
      client.send("starterTablesDebug", {
        message: "Debug affiché dans la console serveur",
        tablesCount: this.starterTablePositions.size
      });
    });

    this.room.onMessage("testStarterProximity", (client) => {
      const player = this.room.state.players.get(client.sessionId);
      if (player) {
        const result = this.testPlayerProximity(player.name);
        
        client.send("starterProximityResult", {
          near: result,
          playerName: player.name,
          position: { x: player.x, y: player.y },
          zone: player.currentZone,
          tablePosition: this.starterTablePositions.get(player.currentZone) || null
        });
      } else {
        client.send("starterProximityResult", {
          near: false,
          error: "Joueur non trouvé"
        });
      }
    });

    this.room.onMessage("reloadStarterTables", (client) => {
      console.log(`🔄 [StarterHandlers] Rechargement tables demandé par ${client.sessionId}`);
      this.reloadStarterTablePositions();
      
      client.send("starterTablesReloaded", {
        message: "Tables starter rechargées depuis les cartes Tiled",
        tablesCount: this.starterTablePositions.size
      });
    });

    this.room.onMessage("setStarterTablePosition", (client, data: {
      zone: string;
      centerX: number;
      centerY: number;
      radius?: number;
    }) => {
      console.log(`🔧 [StarterHandlers] Position manuelle reçue de ${client.sessionId}:`, data);
      
      this.addStarterTablePosition(data.zone, data.centerX, data.centerY, data.radius || 80);
      
      client.send("starterTablePositionSet", {
        success: true,
        zone: data.zone,
        position: { centerX: data.centerX, centerY: data.centerY, radius: data.radius || 80 }
      });
    });

    this.log(`✅ Handlers de starter configurés (y compris debug auto-détection)`);
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

      // 🔒 VALIDATION COMPLÈTE AVEC AUTO-DÉTECTION
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
  // VALIDATION SÉCURISÉE AVEC AUTO-DÉTECTION
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

    // 🔒 SÉCURITÉ 2: Vérifier la proximité avec AUTO-DÉTECTION
    if (!this.isPlayerNearStarterTable(player)) {
      const tablePosition = this.starterTablePositions.get(player.currentZone);
      const debugInfo = tablePosition 
        ? `Table détectée à (${tablePosition.centerX}, ${tablePosition.centerY}) dans un rayon de ${tablePosition.radius}px` 
        : 'Aucune table configurée pour cette zone';
        
      return {
        valid: false,
        reason: "not_near_starter_table",
        message: `Approchez-vous de la table du professeur ! ${debugInfo}`
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

  // ✅ MÉTHODE MISE À JOUR: Vérifier la proximité avec auto-détection
  private isPlayerNearStarterTable(player: any): boolean {
    console.log(`🔍 [StarterHandlers] Vérification proximité pour ${player.name}`);
    console.log(`📍 [StarterHandlers] Position: (${player.x}, ${player.y}) dans ${player.currentZone}`);
    
    // Récupérer la position de la table pour cette zone
    const tablePosition = this.starterTablePositions.get(player.currentZone);
    
    if (!tablePosition) {
      console.warn(`⚠️ [StarterHandlers] Aucune table starter configurée pour la zone: ${player.currentZone}`);
      console.log(`📋 [StarterHandlers] Zones disponibles:`, Array.from(this.starterTablePositions.keys()));
      return false;
    }
    
    const distance = Math.sqrt(
      Math.pow(player.x - tablePosition.centerX, 2) + 
      Math.pow(player.y - tablePosition.centerY, 2)
    );
    
    const isNear = distance <= tablePosition.radius;
    
    console.log(`🎯 [StarterHandlers] Table ${player.currentZone}: centre(${tablePosition.centerX}, ${tablePosition.centerY}) rayon=${tablePosition.radius}`);
    console.log(`📏 [StarterHandlers] Distance calculée: ${Math.round(distance)}px`);
    console.log(`✅ [StarterHandlers] Résultat proximité: ${isNear ? 'PROCHE' : 'TROP LOIN'}`);
    
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
        tablePosition: this.starterTablePositions.get(player.currentZone) || null,
        debugInfo: {
          timestamp: Date.now(),
          sessionId: client.sessionId,
          tablesConfigured: this.starterTablePositions.size
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
  // MÉTHODES DEBUG AUTO-DÉTECTION
  // ================================================================================================

  // ✅ NOUVELLE MÉTHODE: Debug des positions détectées
  public debugStarterTablePositions(): void {
    console.log(`🔍 === DEBUG POSITIONS TABLES STARTER ===`);
    console.log(`📊 Nombre de zones configurées: ${this.starterTablePositions.size}`);
    
    this.starterTablePositions.forEach((position, zoneName) => {
      console.log(`🌍 Zone: ${zoneName}`);
      console.log(`  📍 Centre: (${position.centerX}, ${position.centerY})`);
      console.log(`  🎯 Rayon: ${position.radius}px`);
    });
    
    if (this.starterTablePositions.size === 0) {
      console.warn(`❌ Aucune table starter détectée !`);
      console.log(`💡 Vérifiez que vos cartes Tiled contiennent des objets avec la propriété 'startertable'`);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Recharger les positions (pour les tests)
  public reloadStarterTablePositions(): void {
    console.log(`🔄 [StarterHandlers] Rechargement des positions...`);
    this.starterTablePositions.clear();
    this.loadStarterTablePositions();
  }

  // ✅ NOUVELLE MÉTHODE: Ajouter manuellement une position (pour les tests)
  public addStarterTablePosition(zoneName: string, centerX: number, centerY: number, radius: number = 80): void {
    this.starterTablePositions.set(zoneName, { centerX, centerY, radius });
    console.log(`🎯 [StarterHandlers] Position manuelle ajoutée pour ${zoneName}: (${centerX}, ${centerY}) r=${radius}`);
  }

  // ✅ NOUVELLE MÉTHODE: Test de proximité pour un joueur spécifique
  public testPlayerProximity(playerName: string): boolean {
    console.log(`🧪 [StarterHandlers] Test proximité pour ${playerName}...`);
    
    // Trouver le joueur
    const player = Array.from(this.room.state.players.values())
      .find(p => p.name === playerName);
    
    if (!player) {
      console.error(`❌ [StarterHandlers] Joueur ${playerName} non trouvé`);
      return false;
    }
    
    const result = this.isPlayerNearStarterTable(player);
    console.log(`🎯 [StarterHandlers] Test proximité ${playerName}: ${result ? 'SUCCÈS' : 'ÉCHEC'}`);
    
    return result;
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
        logsEnabled: this.enableLogs,
        tablesConfigured: this.starterTablePositions.size,
        configuredZones: Array.from(this.starterTablePositions.keys())
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
   * Obtenir les positions configurées (pour debug)
   */
  public getConfiguredPositions(): Map<string, { centerX: number, centerY: number, radius: number }> {
    return new Map(this.starterTablePositions);
  }

  /**
   * Forcer une position (pour les tests en live)
   */
  public forceTablePosition(zoneName: string, centerX: number, centerY: number, radius: number = 80): void {
    this.addStarterTablePosition(zoneName, centerX, centerY, radius);
    console.log(`🔧 [StarterHandlers] Position forcée pour ${zoneName}: (${centerX}, ${centerY}) r=${radius}`);
  }

  /**
   * Nettoyage à la destruction
   */
  public cleanup(): void {
    this.log(`🧹 Nettoyage des handlers de starter`);
    this.starterTablePositions.clear();
  }
}
