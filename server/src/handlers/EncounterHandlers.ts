// server/src/handlers/EncounterHandlers.ts - VERSION CORRIGÉE AVEC NOTIFICATIONS
import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { ServerEncounterManager } from "../managers/EncounterManager";

export class EncounterHandlers {
  private room: WorldRoom;
  private encounterManager: ServerEncounterManager;

  constructor(room: WorldRoom) {
    this.room = room;
    this.encounterManager = new ServerEncounterManager();
    
    // ✅ NETTOYAGE PÉRIODIQUE DES COOLDOWNS (toutes les 5 minutes)
    room.clock.setInterval(() => {
      this.encounterManager.cleanupCooldowns();
    }, 300000);
    
    console.log(`✅ [EncounterHandlers] Initialisé pour ${room.constructor.name}`);
  }

  // ✅ CONFIGURATION DES HANDLERS
  setupHandlers(): void {
    console.log(`📨 [EncounterHandlers] Configuration des handlers...`);

    // ✅ HANDLER PRINCIPAL: Déclenchement d'encounter depuis le client
    this.room.onMessage("triggerEncounter", async (client, data: {
      x: number;
      y: number;
      zoneId: string;
      method: 'grass' | 'fishing';
      encounterRate?: number;
      forced?: boolean;
      fromNotification?: boolean;
      timestamp?: number;
    }) => {
      await this.handleTriggerEncounter(client, data);
    });

    // ✅ HANDLER VALIDATION: Vérification d'encounter (ancien système)
    this.room.onMessage("checkEncounter", async (client, data: {
      zone: string;
      method: 'grass' | 'fishing';
      x: number;
      y: number;
      zoneId?: string;
    }) => {
      // Rediriger vers le nouveau handler
      await this.handleTriggerEncounter(client, {
        x: data.x,
        y: data.y,
        zoneId: data.zoneId || `${data.zone}_default`,
        method: data.method,
        encounterRate: 0.1
      });
    });

    // ✅ HANDLER COMBAT SAUVAGE (pour plus tard)
    this.room.onMessage("startWildBattle", async (client, data: {
      playerPokemonId: number;
      wildPokemonData: any;
    }) => {
      await this.handleStartWildBattle(client, data);
    });

    // ✅ HANDLERS DEBUG ET DÉVELOPPEMENT
    this.room.onMessage("debugEncounters", (client, data: { zone: string }) => {
      this.handleDebugEncounters(client, data.zone);
    });

    this.room.onMessage("forceEncounter", async (client, data: {
      zone: string;
      zoneId?: string;
      method?: 'grass' | 'fishing';
    }) => {
      await this.handleForceEncounter(client, data);
    });

    // ✅ HANDLER INFO POSITION
    this.room.onMessage("getEncounterInfo", (client, data: {
      x: number;
      y: number;
      zone: string;
    }) => {
      this.handleGetEncounterInfo(client, data);
    });

    console.log(`✅ [EncounterHandlers] Tous les handlers configurés`);
  }

  // ✅ HANDLER PRINCIPAL : DÉCLENCHEMENT D'ENCOUNTER
  private async handleTriggerEncounter(client: Client, data: {
    x: number;
    y: number;
    zoneId: string;
    method: 'grass' | 'fishing';
    encounterRate?: number;
    forced?: boolean;
    fromNotification?: boolean;
    timestamp?: number;
  }): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.warn(`⚠️ [EncounterHandlers] Joueur ${client.sessionId} non trouvé`);
      return;
    }

    console.log(`🎲 [EncounterHandlers] === TRIGGER ENCOUNTER ===`);
    console.log(`👤 Joueur: ${player.name}`);
    console.log(`📍 Position: (${data.x}, ${data.y})`);
    console.log(`🎯 Zone ID: ${data.zoneId}`);
    console.log(`🌿 Méthode: ${data.method}`);
    console.log(`🔧 Forcé: ${data.forced || false}`);
    console.log(`🔔 Depuis notification: ${data.fromNotification || false}`);

    try {
      // ✅ OBTENIR LES CONDITIONS ACTUELLES
      const conditions = this.room.getCurrentTimeInfo();
      const timeOfDay = conditions.isDayTime ? 'day' : 'night';
      const weather = conditions.weather === 'rain' ? 'rain' : 'clear';

      console.log(`⏰ Conditions: ${timeOfDay}, ${weather}`);

      // ✅ VALIDATION CÔTÉ SERVEUR
      const wildPokemon = await this.encounterManager.validateAndGenerateEncounter(
        client.sessionId,
        player.currentZone, // Utiliser la zone du joueur
        data.x,
        data.y,
        timeOfDay as 'day' | 'night',
        weather as 'clear' | 'rain',
        data.zoneId,
        data.method
      );

      if (wildPokemon) {
        console.log(`⚔️ [EncounterHandlers] Rencontre générée !`);
        console.log(`🐾 Pokémon: ${wildPokemon.pokemonId} niveau ${wildPokemon.level}`);
        console.log(`✨ Spécial: Shiny=${wildPokemon.shiny}, Nature=${wildPokemon.nature}`);
        
        // ✅ ENVOYER LA NOTIFICATION D'ENCOUNTER AU CLIENT
        client.send("wildEncounter", {
          success: true,
          pokemon: {
            pokemonId: wildPokemon.pokemonId,
            name: this.getPokemonName(wildPokemon.pokemonId), // Helper pour le nom
            level: wildPokemon.level,
            shiny: wildPokemon.shiny,
            gender: wildPokemon.gender,
            nature: wildPokemon.nature,
            moves: wildPokemon.moves,
            ivs: wildPokemon.ivs
          },
          location: {
            zone: player.currentZone,
            zoneId: data.zoneId,
            x: data.x,
            y: data.y
          },
          method: data.method,
          conditions: {
            timeOfDay,
            weather
          },
          forced: data.forced || false,
          fromNotification: data.fromNotification || false,
          timestamp: Date.now()
        });

        console.log(`📤 [EncounterHandlers] Wild encounter envoyé à ${client.sessionId}`);
        
        // ✅ BROADCASTER AUX AUTRES JOUEURS DE LA ZONE (optionnel et discret)
        this.broadcastToZone(player.currentZone, "playerEncounter", {
          playerName: player.name,
          pokemonId: wildPokemon.pokemonId,
          pokemonName: this.getPokemonName(wildPokemon.pokemonId),
          level: wildPokemon.level,
          shiny: wildPokemon.shiny,
          method: data.method
        }, client.sessionId);

      } else {
        console.log(`❌ [EncounterHandlers] Aucune rencontre pour ${player.name}`);
        
        // ✅ INFORMER LE CLIENT QU'IL N'Y A PAS DE RENCONTRE
        client.send("encounterFailed", {
          success: false,
          reason: "no_encounter_generated",
          message: "No wild Pokémon appeared",
          conditions: { timeOfDay, weather },
          location: {
            zone: player.currentZone,
            zoneId: data.zoneId,
            x: data.x,
            y: data.y
          },
          method: data.method
        });
      }

    } catch (error) {
      console.error(`❌ [EncounterHandlers] Erreur lors de la génération:`, error);
      client.send("encounterError", {
        success: false,
        message: "Error generating encounter",
        error: error instanceof Error ? error.message : 'Unknown error',
        location: {
          zone: player.currentZone,
          zoneId: data.zoneId,
          x: data.x,
          y: data.y
        }
      });
    }
  }

  // ✅ HANDLER : DÉMARRAGE COMBAT SAUVAGE (pour plus tard)
  private async handleStartWildBattle(client: Client, data: {
    playerPokemonId: number;
    wildPokemonData: any;
  }): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      client.send("battleError", { message: "Joueur non trouvé" });
      return;
    }

    console.log(`🎮 [EncounterHandlers] === DÉMARRAGE COMBAT SAUVAGE ===`);
    console.log(`👤 Joueur: ${player.name}`);
    console.log(`🐾 Pokémon sauvage:`, data.wildPokemonData);

    // ✅ POUR L'INSTANT: Juste une notification que le combat n'est pas implémenté
    client.send("battleNotImplemented", {
      message: "Wild battles not yet implemented",
      wildPokemon: data.wildPokemonData,
      playerPokemon: data.playerPokemonId
    });

    console.log(`ℹ️ [EncounterHandlers] Combat non implémenté - notification envoyée`);
  }

  // ✅ HANDLER DEBUG
  private handleDebugEncounters(client: Client, zone: string): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`🔍 [EncounterHandlers] === DEBUG RENCONTRES ===`);
    console.log(`👤 Demandé par: ${player.name}`);
    console.log(`🌍 Zone: ${zone}`);

    // ✅ DEBUG DE LA TABLE D'ENCOUNTER
    this.encounterManager.debugEncounterTable(zone);

    // ✅ STATISTIQUES DU MANAGER
    const stats = {
      zone: zone,
      playerZone: player.currentZone,
      currentConditions: this.room.getCurrentTimeInfo(),
      encounterManagerStats: 'Visible en console serveur'
    };

    client.send("encounterDebugResult", {
      success: true,
      stats: stats,
      message: "Vérifiez la console serveur pour les détails complets"
    });
  }

  // ✅ HANDLER FORCE RENCONTRE (DÉVELOPPEMENT)
  private async handleForceEncounter(client: Client, data: {
    zone: string;
    zoneId?: string;
    method?: 'grass' | 'fishing';
  }): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`🔧 [EncounterHandlers] === FORCE RENCONTRE ===`);
    console.log(`👤 Joueur: ${player.name}`);
    console.log(`🌍 Zone: ${data.zone} - ZoneID: ${data.zoneId || 'default'}`);

    try {
      // ✅ FORCER UNE RENCONTRE (100% de chance)
      const conditions = this.room.getCurrentTimeInfo();
      
      const wildPokemon = await this.encounterManager.checkForEncounter(
        data.zone,
        data.method || 'grass',
        1.0, // 100% de chance
        conditions.isDayTime ? 'day' : 'night',
        conditions.weather === 'rain' ? 'rain' : 'clear',
        data.zoneId
      );

      if (wildPokemon) {
        client.send("wildEncounter", {
          success: true,
          pokemon: {
            pokemonId: wildPokemon.pokemonId,
            name: this.getPokemonName(wildPokemon.pokemonId),
            level: wildPokemon.level,
            shiny: wildPokemon.shiny,
            gender: wildPokemon.gender,
            nature: wildPokemon.nature,
            moves: wildPokemon.moves,
            ivs: wildPokemon.ivs
          },
          location: {
            zone: data.zone,
            zoneId: data.zoneId || 'default',
            x: player.x,
            y: player.y
          },
          method: data.method || 'grass',
          conditions: {
            timeOfDay: conditions.isDayTime ? 'day' : 'night',
            weather: conditions.weather
          },
          forced: true,
          timestamp: Date.now()
        });

        console.log(`✅ [EncounterHandlers] Rencontre forcée envoyée`);
      } else {
        client.send("encounterFailed", {
          success: false,
          message: "Impossible de générer une rencontre même en mode forcé",
          reason: "force_generation_failed",
          zone: data.zone,
          zoneId: data.zoneId
        });
      }

    } catch (error) {
      console.error('❌ [EncounterHandlers] Erreur force rencontre:', error);
      client.send("encounterError", {
        success: false,
        message: "Erreur lors de la génération forcée",
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  // ✅ HANDLER INFO POSITION
  private handleGetEncounterInfo(client: Client, data: {
    x: number;
    y: number;
    zone: string;
  }): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    // ✅ INFORMATIONS SUR LA POSITION ACTUELLE
    const conditions = this.room.getCurrentTimeInfo();
    
    client.send("encounterZoneInfo", {
      success: true,
      position: { x: data.x, y: data.y },
      zone: data.zone,
      conditions: {
        timeOfDay: conditions.isDayTime ? 'day' : 'night',
        weather: conditions.weather,
        hour: conditions.hour
      },
      canEncounter: true, // TODO: Vérifier selon les tiles
      possibleMethods: ['grass', 'fishing'], // TODO: Détecter selon la position
      message: "Informations de position récupérées"
    });
  }

  // ✅ MÉTHODES UTILITAIRES

  private getPokemonName(pokemonId: number): string {
    // Mapping simple des ID vers les noms (à améliorer)
    const pokemonNames: { [key: number]: string } = {
      16: "Pidgey",
      19: "Rattata", 
      10: "Caterpie",
      13: "Weedle",
      43: "Oddish",
      69: "Bellsprout",
      41: "Zubat",
      92: "Gastly",
      25: "Pikachu",
      194: "Wooper",
      129: "Magikarp",
      170: "Chinchou",
      116: "Horsea"
    };
    
    return pokemonNames[pokemonId] || `Pokemon #${pokemonId}`;
  }

  private broadcastToZone(zoneName: string, message: string, data: any, excludeSessionId?: string): void {
    console.log(`📡 [EncounterHandlers] Broadcasting to zone ${zoneName}: ${message}`);
    
    const clientsInZone = this.room.clients.filter(client => {
      if (excludeSessionId && client.sessionId === excludeSessionId) return false;
      
      const player = this.room.state.players.get(client.sessionId);
      return player && player.currentZone === zoneName;
    });
    
    clientsInZone.forEach(client => {
      client.send(message, data);
    });
    
    console.log(`📤 [EncounterHandlers] Message envoyé à ${clientsInZone.length} clients dans ${zoneName}`);
  }

  // ✅ MÉTHODES PUBLIQUES POUR ACCÈS EXTERNE

  public getEncounterManager(): ServerEncounterManager {
    return this.encounterManager;
  }

  public async testEncounter(
    playerId: string, 
    zone: string, 
    zoneId?: string, 
    method: 'grass' | 'fishing' = 'grass'
  ): Promise<any> {
    console.log(`🧪 [EncounterHandlers] Test rencontre: ${zone}/${zoneId || 'default'}`);
    
    const conditions = this.room.getCurrentTimeInfo();
    
    return await this.encounterManager.validateAndGenerateEncounter(
      playerId,
      zone,
      100, // Position test
      100,
      conditions.isDayTime ? 'day' : 'night',
      conditions.weather === 'rain' ? 'rain' : 'clear',
      zoneId,
      method
    );
  }

  public cleanup(): void {
    console.log(`🧹 [EncounterHandlers] Nettoyage final...`);
    this.encounterManager.cleanupCooldowns();
  }
}
