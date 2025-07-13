// server/src/handlers/EncounterHandlers.ts - VERSION SÉCURISÉE AVEC CONFIG
import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { ServerEncounterManager } from "../managers/EncounterManager";
import { getServerConfig } from '../config/serverConfig';

export class EncounterHandlers {
  private room: WorldRoom;
  private encounterManager: ServerEncounterManager;

  constructor(room: WorldRoom) {
    this.room = room;
    this.encounterManager = new ServerEncounterManager();
    
    // ✅ NETTOYAGE PÉRIODIQUE DES COOLDOWNS (intervalle basé sur config)
    const config = getServerConfig().encounterSystem;
    room.clock.setInterval(() => {
      this.encounterManager.cleanupCooldowns();
    }, config.playerCooldownMs * 100); // Nettoyer toutes les 100x le cooldown
    
    console.log(`✅ [EncounterHandlers] Initialisé avec config:`);
    console.log(`   🔒 Server-side only: ${config.serverSideOnly}`);
    console.log(`   ⏱️ Cooldown: ${config.playerCooldownMs}ms`);
    console.log(`   📊 Max encounters/min: ${config.maxEncountersPerMinute}`);
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
      fromServerCheck?: boolean; // ✅ NOUVEAU: Flag de sécurité
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

  // ✅ HANDLER PRINCIPAL : DÉCLENCHEMENT D'ENCOUNTER AVEC SÉCURITÉ
  public async handleTriggerEncounter(client: Client, data: {
    x: number;
    y: number;
    zoneId: string;
    method: 'grass' | 'fishing';
    encounterRate?: number;
    forced?: boolean;
    fromNotification?: boolean;
    fromServerCheck?: boolean; // ✅ NOUVEAU: Flag de sécurité
    timestamp?: number;
    zone?: string; 
  }): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.warn(`⚠️ [EncounterHandlers] Joueur ${client.sessionId} non trouvé`);
      return;
    }

    console.log(`🎲 [EncounterHandlers] === TRIGGER ENCOUNTER ===`);
    
    // ✅ SÉCURITÉ: Vérifier si le système est configuré pour être server-side only
    const encounterConfig = getServerConfig().encounterSystem;
    if (encounterConfig.serverSideOnly && !data.fromServerCheck) {
      console.warn(`🚫 [EncounterHandlers] Tentative client non autorisée de ${client.sessionId}`);
      
      client.send("encounterError", {
        success: false,
        message: "Les rencontres sont gérées automatiquement par le serveur",
        reason: "client_trigger_not_allowed",
        serverSideOnly: true
      });
      return;
    }

    const zoneName = data.zone || player.currentZone || "unknown";
    console.log(`👤 Joueur: ${player.name}`);
    console.log(`📍 Position: (${data.x}, ${data.y})`);
    console.log(`🎯 Zone ID: ${data.zoneId}`);
    console.log(`🌿 Méthode: ${data.method}`);
    console.log(`🔧 Forcé: ${data.forced || false}`);
    console.log(`🔒 Server check: ${data.fromServerCheck || false}`);

    try {
      // ✅ OBTENIR LES CONDITIONS ACTUELLES
      const conditions = this.room.getCurrentTimeInfo();
      const timeOfDay = conditions.isDayTime ? 'day' : 'night';
      const weather = conditions.weather === 'rain' ? 'rain' : 'clear';

      console.log(`⏰ Conditions: ${timeOfDay}, ${weather}`);

      // ✅ VALIDATION CÔTÉ SERVEUR
      const wildPokemon = await this.encounterManager.validateAndGenerateEncounter(
        client.sessionId,
        player.currentZone,
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
        
        // ✅ DÉMARRER LE COMBAT AUTOMATIQUEMENT
        await this.startWildBattleImmediate(client, wildPokemon, data);

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

  // ✅ DÉMARRAGE IMMÉDIAT DU COMBAT (STYLE POKÉMON AUTHENTIQUE)
  private async startWildBattleImmediate(client: Client, wildPokemon: any, encounterData: any): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    try {
      console.log(`🎮 [EncounterHandlers] === DÉMARRAGE COMBAT IMMÉDIAT ===`);
      console.log(`👤 Joueur: ${player.name}`);
      console.log(`🐾 Contre: ${this.getPokemonName(wildPokemon.pokemonId)} Niv.${wildPokemon.level}`);

      // ✅ ENVOYER LA NOTIFICATION DE RENCONTRE IMMÉDIATE
      client.send("wildEncounterStart", {
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
          zone: player.currentZone,
          zoneId: encounterData.zoneId,
          x: encounterData.x,
          y: encounterData.y
        },
        method: encounterData.method,
        forced: encounterData.forced || false,
        serverGenerated: true, // ✅ NOUVEAU: Marquer comme généré par le serveur
        message: `Un ${this.getPokemonName(wildPokemon.pokemonId)} sauvage apparaît !`,
        timestamp: Date.now()
      });

      // ✅ BROADCASTER DISCRÈTEMENT AUX AUTRES JOUEURS
      this.broadcastToZone(player.currentZone, "playerEncounter", {
        playerName: player.name,
        pokemonId: wildPokemon.pokemonId,
        pokemonName: this.getPokemonName(wildPokemon.pokemonId),
        level: wildPokemon.level,
        shiny: wildPokemon.shiny,
        method: encounterData.method,
        startedBattle: true
      }, client.sessionId);

      // ✅ DÉLÉGUER AU BATTLEHANDLERS POUR CRÉER LA BATTLEROOM
      const battleHandlers = this.room.getBattleHandlers();
      if (!battleHandlers) {
        console.error(`❌ [EncounterHandlers] BattleHandlers non disponible !`);
        client.send("battleError", {
          message: "Système de combat non disponible",
          fallbackToOldSystem: true
        });
        return;
      }

      // ✅ DÉMARRER LE COMBAT VIA BATTLEHANDLERS
      await battleHandlers.handleStartWildBattle(client, {
        wildPokemon: wildPokemon,
        location: `${player.currentZone} (${encounterData.zoneId})`,
        method: encounterData.method,
        currentZone: player.currentZone,
        zoneId: encounterData.zoneId
      });

      console.log(`✅ [EncounterHandlers] Combat démarré via BattleHandlers`);

    } catch (error) {
      console.error(`❌ [EncounterHandlers] Erreur démarrage combat:`, error);
      
      // ✅ FALLBACK: Envoyer l'ancienne notification en cas d'erreur
      client.send("wildEncounterFallback", {
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
        message: "Combat en cours de développement",
        error: "Erreur système de combat"
      });
    }
  }

  // ✅ HANDLER DEBUG - MAINTENANT PUBLIC
  public handleDebugEncounters(client: Client, zone: string): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`🔍 [EncounterHandlers] === DEBUG RENCONTRES ===`);
    console.log(`👤 Demandé par: ${player.name}`);
    console.log(`🌍 Zone: ${zone}`);

    // ✅ DEBUG DE LA TABLE D'ENCOUNTER
    this.encounterManager.debugEncounterTable(zone);

    // ✅ STATISTIQUES DU MANAGER
    const encounterConfig = getServerConfig().encounterSystem;
    const stats = {
      zone: zone,
      playerZone: player.currentZone,
      currentConditions: this.room.getCurrentTimeInfo(),
      encounterConfig: {
        enabled: encounterConfig.enabled,
        serverSideOnly: encounterConfig.serverSideOnly,
        cooldownMs: encounterConfig.playerCooldownMs,
        maxPerMinute: encounterConfig.maxEncountersPerMinute,
        baseRates: encounterConfig.baseRates
      },
      battleSystem: 'Connecté avec BattleHandlers'
    };

    client.send("encounterDebugResult", {
      success: true,
      stats: stats,
      message: "Vérifiez la console serveur pour les détails complets"
    });
  }

  // ✅ HANDLER FORCE RENCONTRE AVEC COMBAT AUTOMATIQUE
  public async handleForceEncounter(client: Client, data: {
    zone: string;
    zoneId?: string;
    method?: 'grass' | 'fishing';
  }): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`🔧 [EncounterHandlers] === FORCE RENCONTRE AVEC COMBAT ===`);
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
        console.log(`✅ [EncounterHandlers] Rencontre forcée générée`);
        
        // ✅ DÉMARRER LE COMBAT IMMÉDIATEMENT
        await this.startWildBattleImmediate(client, wildPokemon, {
          zoneId: data.zoneId || 'default',
          x: player.x,
          y: player.y,
          method: data.method || 'grass',
          forced: true,
          fromServerCheck: true // ✅ MARQUER COMME VÉRIFICATION SERVEUR
        });

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

  // ✅ HANDLER INFO POSITION - MAINTENANT PUBLIC
  public handleGetEncounterInfo(client: Client, data: {
    x: number;
    y: number;
    zone: string;
  }): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    // ✅ INFORMATIONS SUR LA POSITION ACTUELLE
    const conditions = this.room.getCurrentTimeInfo();
    const encounterConfig = getServerConfig().encounterSystem;
    
    client.send("encounterZoneInfo", {
      success: true,
      position: { x: data.x, y: data.y },
      zone: data.zone,
      conditions: {
        timeOfDay: conditions.isDayTime ? 'day' : 'night',
        weather: conditions.weather,
        hour: conditions.hour
      },
      canEncounter: encounterConfig.enabled,
      serverSideOnly: encounterConfig.serverSideOnly,
      possibleMethods: ['grass', 'fishing'],
      battleSystemActive: true,
      encounterRates: encounterConfig.baseRates,
      message: "Informations de position récupérées"
    });
  }

  // ✅ NOUVELLE MÉTHODE: DÉCLENCHEMENT SERVEUR SÉCURISÉ
  public async triggerServerEncounter(sessionId: string, x: number, y: number, method: 'grass' | 'fishing' = 'grass'): Promise<boolean> {
    const client = [...this.room.clients].find(c => c.sessionId === sessionId);
    if (!client) return false;

    const player = this.room.state.players.get(sessionId);
    if (!player) return false;

    console.log(`🔒 [EncounterHandlers] Déclenchement serveur pour ${player.name}`);

    try {
      await this.handleTriggerEncounter(client, {
        x: x,
        y: y,
        zoneId: `${player.currentZone}_default`,
        method: method,
        zone: player.currentZone,
        fromServerCheck: true // ✅ MARQUER COMME VÉRIFICATION SERVEUR AUTORISÉE
      });
      return true;
    } catch (error) {
      console.error(`❌ [EncounterHandlers] Erreur déclenchement serveur:`, error);
      return false;
    }
  }

  // ✅ MÉTHODES UTILITAIRES

  private getPokemonName(pokemonId: number): string {
    const pokemonNames: { [key: number]: string } = {
      1: "Bulbasaur", 4: "Charmander", 7: "Squirtle",
      10: "Caterpie", 16: "Pidgey", 19: "Rattata", 
      25: "Pikachu", 41: "Zubat", 43: "Oddish",
      69: "Bellsprout", 92: "Gastly", 129: "Magikarp", 
      170: "Chinchou", 116: "Horsea", 194: "Wooper",
      13: "Weedle"
    };
    
    return pokemonNames[pokemonId] || `Pokémon #${pokemonId}`;
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
      100,
      100,
      conditions.isDayTime ? 'day' : 'night',
      conditions.weather === 'rain' ? 'rain' : 'clear',
      zoneId,
      method
    );
  }

  // ✅ MÉTHODE PUBLIQUE POUR FORCER UNE RENCONTRE DE COMBAT (POUR DÉVELOPPEMENT)
  public async forceWildBattle(client: Client, pokemonId: number, level: number = 5): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`🔥 [EncounterHandlers] Force combat: ${this.getPokemonName(pokemonId)} Niv.${level}`);

    const testWildPokemon = {
      pokemonId: pokemonId,
      level: level,
      gender: Math.random() < 0.5 ? "Male" : "Female",
      nature: "Hardy",
      shiny: Math.random() < 0.001,
      moves: ["tackle", "growl"],
      ivs: {
        hp: Math.floor(Math.random() * 32),
        attack: Math.floor(Math.random() * 32),
        defense: Math.floor(Math.random() * 32),
        spAttack: Math.floor(Math.random() * 32),
        spDefense: Math.floor(Math.random() * 32),
        speed: Math.floor(Math.random() * 32)
      }
    };

    await this.startWildBattleImmediate(client, testWildPokemon, {
      zoneId: `${player.currentZone}_test`,
      x: player.x,
      y: player.y,
      method: 'grass',
      forced: true,
      fromServerCheck: true // ✅ MARQUER COMME AUTORISÉ
    });
  }

  public cleanup(): void {
    console.log(`🧹 [EncounterHandlers] Nettoyage final...`);
    this.encounterManager.cleanupCooldowns();
  }
}
