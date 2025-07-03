// server/src/handlers/StarterHandlers.ts - Version corrigée pour villagelab
import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { OwnedPokemon } from "../models/OwnedPokemon";
import { giveStarterToPlayer } from "../services/PokemonService";
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import * as fs from 'fs';
import * as path from 'path'

// ✅ INTERFACE pour typer les données de carte Tiled
interface TiledMapData {
  layers: TiledLayer[];
  [key: string]: any;
}

interface TiledLayer {
  type: string;
  name: string;
  objects?: TiledObject[];
  [key: string]: any;
}

interface TiledObject {
  name?: string;
  type?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: any;
  [key: string]: any;
}

export class StarterHandlers {
  private room: WorldRoom;
  private enableLogs: boolean = true;
  private starterTablePositions: Map<string, { centerX: number, centerY: number, radius: number }> = new Map();

  constructor(room: WorldRoom) {
    this.room = room;
    this.loadStarterTablePositions();
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

  // ✅ Charger les positions des tables depuis les cartes Tiled
  private loadStarterTablePositions(): void {
    console.log(`🗺️ [StarterHandlers] Chargement des positions via cartes déjà chargées...`);
    
    // ✅ FIX: Utiliser la bonne zone - villagelab au lieu de lavandiaresearchlab
    const zonesToCheck = ['villagelab'];
    
    zonesToCheck.forEach(zoneName => {
      try {
        // Utiliser EXACTEMENT la même logique que CollisionManager
        const fileName = `${zoneName}.tmj`;
        const resolvedPath = path.resolve(__dirname, "../../build/assets/maps", fileName);
        
        console.log(`📂 [StarterHandlers] Lecture: ${resolvedPath}`);
        
        if (!fs.existsSync(resolvedPath)) {
          console.warn(`⚠️ [StarterHandlers] Fichier inexistant: ${resolvedPath}`);
          // ✅ FIX: Ajouter une position par défaut pour villagelab si le fichier n'existe pas
          this.addDefaultStarterTablePosition(zoneName);
          return;
        }
        
        const mapData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
        const starterTable = this.findStarterTableInMap(mapData, zoneName);
        
        if (starterTable) {
          this.starterTablePositions.set(zoneName, starterTable);
          console.log(`✅ [StarterHandlers] Table starter trouvée dans ${zoneName}:`, starterTable);
        } else {
          console.log(`ℹ️ [StarterHandlers] Pas de table starter dans ${zoneName}, ajout position par défaut`);
          this.addDefaultStarterTablePosition(zoneName);
        }
        
      } catch (error) {
        console.warn(`⚠️ [StarterHandlers] Erreur traitement ${zoneName}:`, error instanceof Error ? error.message : String(error));
        // ✅ FIX: Ajouter une position par défaut en cas d'erreur
        this.addDefaultStarterTablePosition(zoneName);
      }
    });
    
    console.log(`📊 [StarterHandlers] Total zones avec tables: ${this.starterTablePositions.size}`);
  }

  // ✅ NOUVELLE MÉTHODE: Ajouter une position par défaut pour villagelab
  private addDefaultStarterTablePosition(zoneName: string): void {
    // Position par défaut basée sur la position typique d'un labo Pokémon
    const defaultPosition = {
      centerX: 200,
      centerY: 200,
      radius: 100
    };
    
    this.starterTablePositions.set(zoneName, defaultPosition);
    console.log(`🔧 [StarterHandlers] Position par défaut ajoutée pour ${zoneName}:`, defaultPosition);
  }
  
  // ✅ Chercher la table starter dans une carte Tiled - ADAPTÉ LOGIQUE CLIENT
  private findStarterTableInMap(mapData: TiledMapData, zoneName: string): { centerX: number, centerY: number, radius: number } | null {
    console.log(`🔍 [StarterHandlers] Recherche table starter dans ${zoneName}...`);
    
    if (!mapData.layers) {
      console.warn(`⚠️ [StarterHandlers] Pas de layers dans ${zoneName}`);
      return null;
    }
    
    // ✅ ADAPTATION: Chercher spécifiquement le layer "Worlds" comme côté client
    const worldsLayer = mapData.layers.find((layer: TiledLayer) => 
      layer.type === 'objectgroup' && layer.name === 'Worlds'
    );
    
    if (!worldsLayer) {
      console.warn(`⚠️ [StarterHandlers] Layer "Worlds" non trouvé dans ${zoneName}`);
      // Fallback: chercher dans tous les layers d'objets
      return this.findStarterTableInAllLayers(mapData, zoneName);
    }
    
    console.log(`🔍 [StarterHandlers] Layer "Worlds" trouvé avec ${worldsLayer.objects?.length || 0} objets`);
    
    if (!worldsLayer.objects) {
      console.warn(`⚠️ [StarterHandlers] Pas d'objets dans le layer "Worlds"`);
      return null;
    }
    
    // Parcourir les objets du layer "Worlds"
    for (const obj of worldsLayer.objects) {
      console.log(`🔍 [StarterHandlers] Objet trouvé:`, {
        name: obj.name,
        type: obj.type,
        properties: obj.properties,
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height
      });
      
      if (this.isStarterTableObject(obj)) {
        const centerX = obj.x + (obj.width || 32) / 2;
        const centerY = obj.y + (obj.height || 32) / 2;
        const radius = Math.max(obj.width || 32, obj.height || 32) + 60; // Rayon plus généreux
        
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
    
    console.log(`❌ [StarterHandlers] Aucune table starter trouvée dans le layer "Worlds" de ${zoneName}`);
    return null;
  }

  // ✅ NOUVEAU: Méthode fallback pour chercher dans tous les layers
  private findStarterTableInAllLayers(mapData: TiledMapData, zoneName: string): { centerX: number, centerY: number, radius: number } | null {
    console.log(`🔍 [StarterHandlers] Fallback: recherche dans tous les layers de ${zoneName}...`);
    
    // Parcourir tous les layers d'objets
    for (const layer of mapData.layers) {
      if (layer.type === 'objectgroup' && layer.objects) {
        console.log(`🔍 [StarterHandlers] Vérification layer "${layer.name}" (${layer.objects.length} objets)`);
        
        for (const obj of layer.objects) {
          if (this.isStarterTableObject(obj)) {
            const centerX = obj.x + (obj.width || 32) / 2;
            const centerY = obj.y + (obj.height || 32) / 2;
            const radius = Math.max(obj.width || 32, obj.height || 32) + 60; // Rayon plus généreux
            
            console.log(`🎯 [StarterHandlers] Table starter trouvée dans ${zoneName} (layer ${layer.name}):`, {
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

  // ✅ Vérifier si un objet est une table starter
  private isStarterTableObject(obj: TiledObject): boolean {
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

  // ✅ Configuration des handlers AVEC LOGS DÉTAILLÉS
  setupHandlers(): void {
    this.log(`📨 Configuration des handlers de starter...`);

    // Handler principal pour la sélection de starter
    this.room.onMessage("giveStarterChoice", async (client, data) => {
      console.log("📥 [StarterHandlers] === MESSAGE REÇU: giveStarterChoice ===");
      console.log("👤 Client:", client.sessionId);
      console.log("📊 Data:", data);
      await this.handleStarterChoice(client, data);
    });

    // ✅ Handler pour vérifier l'éligibilité AVEC LOGS DÉTAILLÉS
    this.room.onMessage("checkStarterEligibility", async (client) => {
      console.log("📥 [StarterHandlers] === MESSAGE REÇU: checkStarterEligibility ===");
      console.log("👤 Client:", client.sessionId);
      console.log("⏰ Timestamp:", new Date().toISOString());
      
      const player = this.room.state.players.get(client.sessionId);
      if (player) {
        console.log("🎯 Joueur trouvé:", player.name);
        console.log("📍 Position:", `(${player.x}, ${player.y})`);
        console.log("🌍 Zone:", player.currentZone);
      } else {
        console.log("❌ Joueur non trouvé dans le state");
      }
      
      await this.handleCheckEligibility(client);
    });

    // Handler pour forcer un starter (admin/debug)
    this.room.onMessage("forceGiveStarter", async (client, data) => {
      console.log("📥 [StarterHandlers] === MESSAGE REÇU: forceGiveStarter ===");
      console.log("👤 Client:", client.sessionId);
      console.log("📊 Data:", data);
      await this.handleForceStarter(client, data);
    });

    // ✅ NOUVEAUX HANDLERS POUR DEBUG
    this.room.onMessage("debugStarterTables", (client) => {
      console.log(`🔍 [StarterHandlers] Debug tables demandé par ${client.sessionId}`);
      this.debugStarterTablePositions();
      
      client.send("starterTablesDebug", {
        message: "Debug affiché dans la console serveur",
        tablesCount: this.starterTablePositions.size,
        tables: Array.from(this.starterTablePositions.entries())
      });
    });

    // ✅ NOUVEAU HANDLER: Recevoir les positions depuis le client
    this.room.onMessage("syncStarterTablePosition", (client, data) => {
      console.log(`📡 [StarterHandlers] === SYNC POSITION DEPUIS CLIENT ===`);
      console.log(`👤 Client: ${client.sessionId}`);
      console.log(`📊 Data:`, data);
      
      // Vérifier que le client est dans la bonne zone
      const player = this.room.state.players.get(client.sessionId);
      if (player && player.currentZone === data.zone) {
        console.log(`✅ [StarterHandlers] Position synchronisée pour ${data.zone}`);
        
        // Mettre à jour la position
        this.starterTablePositions.set(data.zone, {
          centerX: data.centerX,
          centerY: data.centerY,
          radius: data.radius
        });
        
        // Confirmer au client
        client.send("starterTablePositionSynced", {
          success: true,
          zone: data.zone,
          position: { centerX: data.centerX, centerY: data.centerY, radius: data.radius },
          message: `Position de table mise à jour pour ${data.zone}`
        });
        
        console.log(`🎯 [StarterHandlers] Table ${data.zone} mise à jour: (${data.centerX}, ${data.centerY}) r=${data.radius}`);
      } else {
        console.warn(`⚠️ [StarterHandlers] Client pas dans la bonne zone: ${player?.currentZone} vs ${data.zone}`);
      }
    });

    this.room.onMessage("testStarterProximity", (client) => {
      console.log(`🧪 [StarterHandlers] Test proximité demandé par ${client.sessionId}`);
      
      const player = this.room.state.players.get(client.sessionId);
      if (player) {
        const result = this.isPlayerNearStarterTable(player);
        
        client.send("starterProximityResult", {
          near: result,
          playerName: player.name,
          position: { x: player.x, y: player.y },
          zone: player.currentZone,
          tablePosition: this.starterTablePositions.get(player.currentZone) || null,
          allTables: Array.from(this.starterTablePositions.entries())
        });
      } else {
        client.send("starterProximityResult", {
          near: false,
          error: "Joueur non trouvé"
        });
      }
    });

    console.log(`✅ [StarterHandlers] Handlers configurés (${this.starterTablePositions.size} tables chargées)`);
  }

  // ================================================================================================
  // HANDLER PRINCIPAL - SÉLECTION SÉCURISÉE
  // ================================================================================================

  private async handleStarterChoice(client: Client, data: { pokemonId: number }): Promise<void> {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        console.log("❌ [StarterHandlers] Joueur non trouvé:", client.sessionId);
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
          message: validation.message,
          reason: validation.reason
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
        // Créer le starter avec le service existant
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
  // VALIDATION SÉCURISÉE AVEC LOGS DÉTAILLÉS
  // ================================================================================================

  private async validateStarterRequest(player: any, pokemonId: number): Promise<{
    valid: boolean;
    reason?: string;
    message: string;
  }> {
    console.log(`🔍 [StarterHandlers] === VALIDATION STARTER REQUEST ===`);
    console.log(`👤 Joueur: ${player.name}`);
    console.log(`📍 Position: (${player.x}, ${player.y})`);
    console.log(`🌍 Zone: ${player.currentZone}`);
    console.log(`🎯 Pokémon demandé: #${pokemonId}`);

    // 🔒 SÉCURITÉ 1: Vérifier la zone
    if (player.currentZone !== "villagelab") {
      console.log(`❌ [Validation] Zone incorrecte: ${player.currentZone} (requis: villagelab)`);
      return {
        valid: false,
        reason: "wrong_zone",
        message: "Vous devez être dans le laboratoire du professeur !"
      };
    }
    console.log(`✅ [Validation] Zone OK: ${player.currentZone}`);

    // 🔒 SÉCURITÉ 2: Vérifier la proximité
    const proximityResult = this.isPlayerNearStarterTable(player);
    if (!proximityResult) {
      const tablePosition = this.starterTablePositions.get(player.currentZone);
      const debugInfo = tablePosition 
        ? `Table à (${tablePosition.centerX}, ${tablePosition.centerY}) rayon=${tablePosition.radius}px` 
        : 'Aucune table configurée';
        
      console.log(`❌ [Validation] Proximité échouée: ${debugInfo}`);
      return {
        valid: false,
        reason: "not_near_starter_table",
        message: `Approchez-vous de la table du professeur ! (${debugInfo})`
      };
    }
    console.log(`✅ [Validation] Proximité OK`);

    // 🔒 SÉCURITÉ 3: Vérifier qu'il n'a pas déjà de Pokémon
    const existingCount = await OwnedPokemon.countDocuments({ owner: player.name });
    console.log(`🔍 [Validation] Pokémon existants: ${existingCount}`);
    
    if (existingCount > 0) {
      console.log(`❌ [Validation] Joueur a déjà ${existingCount} Pokémon`);
      return {
        valid: false,
        reason: "already_has_pokemon",
        message: "Vous avez déjà un Pokémon ! Un seul starter par dresseur."
      };
    }
    console.log(`✅ [Validation] Pas de Pokémon existant`);

    // 🔒 SÉCURITÉ 4: Valider l'ID du starter
    if (![1, 4, 7].includes(pokemonId)) {
      console.log(`❌ [Validation] ID starter invalide: ${pokemonId}`);
      return {
        valid: false,
        reason: "invalid_starter",
        message: "Starter invalide ! Choisissez parmi les Pokémon proposés."
      };
    }
    console.log(`✅ [Validation] ID starter valide: ${pokemonId}`);

    // 🔒 SÉCURITÉ 5: Vérifier que le joueur n'est pas déjà occupé
    if (this.room.isPlayerMovementBlocked(player.id)) {
      console.log(`❌ [Validation] Joueur déjà occupé`);
      return {
        valid: false,
        reason: "player_busy",
        message: "Vous êtes déjà en train de faire quelque chose. Attendez un moment."
      };
    }
    console.log(`✅ [Validation] Joueur disponible`);

    console.log(`🎉 [Validation] TOUTES LES VALIDATIONS RÉUSSIES !`);
    return {
      valid: true,
      message: "Validation réussie"
    };
  }

  // ✅ Vérifier la proximité avec logs détaillés
  private isPlayerNearStarterTable(player: any): boolean {
    console.log(`🔍 [StarterHandlers] === VÉRIFICATION PROXIMITÉ ===`);
    console.log(`👤 Joueur: ${player.name}`);
    console.log(`📍 Position: (${player.x}, ${player.y})`);
    console.log(`🌍 Zone: ${player.currentZone}`);
    
    // Récupérer la position de la table pour cette zone
    const tablePosition = this.starterTablePositions.get(player.currentZone);
    
    if (!tablePosition) {
      console.log(`❌ [Proximité] Aucune table starter configurée pour: ${player.currentZone}`);
      console.log(`📋 [Proximité] Zones disponibles:`, Array.from(this.starterTablePositions.keys()));
      return false;
    }
    
    console.log(`🏢 [Proximité] Table trouvée:`, tablePosition);
    
    const distance = Math.sqrt(
      Math.pow(player.x - tablePosition.centerX, 2) + 
      Math.pow(player.y - tablePosition.centerY, 2)
    );
    
    const isNear = distance <= tablePosition.radius;
    
    console.log(`📏 [Proximité] Distance calculée: ${Math.round(distance)}px`);
    console.log(`🎯 [Proximité] Seuil autorisé: ${tablePosition.radius}px`);
    console.log(`✅ [Proximité] Résultat: ${isNear ? 'PROCHE' : 'TROP LOIN'}`);
    
    return isNear;
  }

  // ================================================================================================
  // HANDLER VÉRIFICATION D'ÉLIGIBILITÉ AVEC LOGS DÉTAILLÉS
  // ================================================================================================

  private async handleCheckEligibility(client: Client): Promise<void> {
    try {
      console.log(`🔍 [StarterHandlers] === VÉRIFICATION ÉLIGIBILITÉ ===`);
      
      const player = this.room.state.players.get(client.sessionId);
      if (!player) {
        console.log(`❌ [Éligibilité] Joueur non trouvé: ${client.sessionId}`);
        client.send("starterEligibility", {
          eligible: false,
          reason: "player_not_found",
          message: "Joueur non trouvé"
        });
        return;
      }

      console.log(`🎯 [Éligibilité] Vérification pour: ${player.name}`);

      // Vérifier l'éligibilité sans créer de Pokémon
      const validation = await this.validateStarterRequest(player, 1); // Test avec Bulbasaur

      const tablePosition = this.starterTablePositions.get(player.currentZone);
      const response = {
        eligible: validation.valid,
        reason: validation.reason,
        message: validation.message,
        currentZone: player.currentZone,
        requiredZone: "villagelab",
        playerPosition: { x: player.x, y: player.y },
        nearStarterTable: this.isPlayerNearStarterTable(player),
        tablePosition: tablePosition || null,
        debugInfo: {
          timestamp: Date.now(),
          sessionId: client.sessionId,
          tablesConfigured: this.starterTablePositions.size,
          allTables: Array.from(this.starterTablePositions.entries())
        }
      };

      console.log(`📤 [Éligibilité] Envoi réponse:`, {
        eligible: response.eligible,
        reason: response.reason,
        message: response.message,
        playerPos: response.playerPosition,
        tablePos: response.tablePosition
      });

      client.send("starterEligibility", response);
      
      console.log(`📊 [Éligibilité] Résultat pour ${player.name}: ${validation.valid ? 'ÉLIGIBLE' : 'NON ÉLIGIBLE'}`);
      if (!validation.valid) {
        console.log(`📋 [Éligibilité] Raison: ${validation.reason}`);
        console.log(`💬 [Éligibilité] Message: ${validation.message}`);
      }

    } catch (error) {
      this.logError(`Erreur vérification éligibilité pour ${client.sessionId}:`, error);
      client.send("starterEligibility", {
        eligible: false,
        reason: "server_error",
        message: "Erreur serveur",
        error: error instanceof Error ? error.message : String(error)
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
      console.log(`🔧 [StarterHandlers] === FORCE STARTER (ADMIN) ===`);
      
      // Vérification basique d'admin
      if (data.adminKey !== "dev_mode_2024") {
        console.log(`❌ [Force] Clé admin incorrecte de ${client.sessionId}`);
        client.send("forceStarterResult", {
          success: false,
          message: "Accès refusé"
        });
        return;
      }

      const targetName = data.targetPlayer || this.room.state.players.get(client.sessionId)?.name;
      if (!targetName) {
        console.log(`❌ [Force] Joueur cible non trouvé`);
        client.send("forceStarterResult", {
          success: false,
          message: "Joueur cible non trouvé"
        });
        return;
      }

      console.log(`🔧 [Force] Création forcée starter ${data.pokemonId} pour ${targetName}`);

      // Supprimer les Pokémon existants pour les tests
      const deletedCount = await OwnedPokemon.deleteMany({ owner: targetName });
      console.log(`🗑️ [Force] ${deletedCount.deletedCount} Pokémon supprimés pour ${targetName}`);

      // Créer le starter forcé
      const starter = await giveStarterToPlayer(targetName, data.pokemonId as 1 | 4 | 7);

      console.log(`✅ [Force] Starter créé:`, {
        id: starter._id,
        pokemonId: starter.pokemonId,
        name: this.getPokemonName(starter.pokemonId),
        level: starter.level
      });

      client.send("forceStarterResult", {
        success: true,
        pokemon: {
          id: starter._id,
          pokemonId: starter.pokemonId,
          name: this.getPokemonName(starter.pokemonId),
          level: starter.level
        },
        message: `Starter forcé créé pour ${targetName}`,
        deletedPrevious: deletedCount.deletedCount
      });

      // Log d'audit admin
      console.log(`🔧 [ADMIN AUDIT] Force starter par ${client.sessionId} → ${targetName} (Pokémon #${data.pokemonId})`);

    } catch (error) {
      this.logError(`Erreur force starter:`, error);
      client.send("forceStarterResult", {
        success: false,
        message: "Erreur lors de la création forcée",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // ================================================================================================
  // MÉTHODES DEBUG
  // ================================================================================================

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

  public reloadStarterTablePositions(): void {
    console.log(`🔄 [StarterHandlers] Rechargement des positions...`);
    this.starterTablePositions.clear();
    this.loadStarterTablePositions();
  }

  public addStarterTablePosition(zoneName: string, centerX: number, centerY: number, radius: number = 80): void {
    this.starterTablePositions.set(zoneName, { centerX, centerY, radius });
    console.log(`🎯 [StarterHandlers] Position manuelle ajoutée pour ${zoneName}: (${centerX}, ${centerY}) r=${radius}`);
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

  public toggleLogs(enabled: boolean): void {
    this.setLogging(enabled);
  }

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

  public getConfiguredPositions(): Map<string, { centerX: number, centerY: number, radius: number }> {
    return new Map(this.starterTablePositions);
  }

  public forceTablePosition(zoneName: string, centerX: number, centerY: number, radius: number = 80): void {
    this.addStarterTablePosition(zoneName, centerX, centerY, radius);
    console.log(`🔧 [StarterHandlers] Position forcée pour ${zoneName}: (${centerX}, ${centerY}) r=${radius}`);
  }

  // ✅ NOUVELLE MÉTHODE: Ajuster la position pour une zone spécifique
  public adjustTablePositionForPlayer(client: Client, offsetX: number = 0, offsetY: number = 0): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.log(`❌ [StarterHandlers] Joueur non trouvé pour ajustement: ${client.sessionId}`);
      return;
    }

    const zoneName = player.currentZone;
    const newCenterX = player.x + offsetX;
    const newCenterY = player.y + offsetY;
    const radius = 100;

    this.starterTablePositions.set(zoneName, {
      centerX: newCenterX,
      centerY: newCenterY,
      radius
    });

    console.log(`🎯 [StarterHandlers] Position ajustée pour ${zoneName} basée sur ${player.name}:`);
    console.log(`  📍 Joueur: (${player.x}, ${player.y})`);
    console.log(`  🎯 Table: (${newCenterX}, ${newCenterY}) r=${radius}`);
    console.log(`  🔧 Offset: (${offsetX}, ${offsetY})`);

    // Confirmer à l'utilisateur
    client.send("tablePositionAdjusted", {
      success: true,
      zone: zoneName,
      oldPosition: player,
      newTablePosition: { centerX: newCenterX, centerY: newCenterY, radius },
      message: `Position de la table ajustée pour ${zoneName}`
    });
  }

  // ✅ NOUVELLE MÉTHODE: Test de proximité en temps réel
  public startProximityTest(client: Client): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    const testInterval = setInterval(() => {
      const isNear = this.isPlayerNearStarterTable(player);
      const tablePosition = this.starterTablePositions.get(player.currentZone);
      
      client.send("proximityTestUpdate", {
        playerName: player.name,
        position: { x: player.x, y: player.y },
        zone: player.currentZone,
        isNear,
        tablePosition,
        timestamp: Date.now()
      });
    }, 1000);

    // Arrêter le test après 30 secondes
    setTimeout(() => {
      clearInterval(testInterval);
      client.send("proximityTestStopped", {
        message: "Test de proximité terminé"
      });
    }, 30000);

    console.log(`🧪 [StarterHandlers] Test de proximité démarré pour ${player.name}`);
  }

  public cleanup(): void {
    this.log(`🧹 Nettoyage des handlers de starter`);
    this.starterTablePositions.clear();
  }
}