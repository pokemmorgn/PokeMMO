// server/src/handlers/EncounterHandlers.ts
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

    // ✅ HANDLER RENCONTRES AVEC ZONES
    this.room.onMessage("checkEncounter", async (client, data: {
      zone: string;
      method: 'grass' | 'fishing';
      x: number;
      y: number;
      zoneId?: string;
    }) => {
      await this.handleEncounterCheck(client, data);
    });

    // ✅ HANDLER COMBAT SAUVAGE
    this.room.onMessage("triggerWildBattle", async (client, data: {
      playerPokemonId: number;
      zone: string;
      method?: string;
      x: number;
      y: number;
      zoneId?: string;
    }) => {
      await this.handleTriggerWildBattle(client, data);
    });

    // ✅ HANDLER RÉSULTAT DE COMBAT
    this.room.onMessage("battleResult", (client, data: {
      result: 'victory' | 'defeat' | 'fled' | 'caught';
      expGained?: number;
      pokemonCaught?: boolean;
      capturedPokemon?: any;
    }) => {
      this.handleBattleResult(client, data);
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

  // ✅ HANDLER PRINCIPAL : VÉRIFICATION DE RENCONTRE
  private async handleEncounterCheck(client: Client, data: {
    zone: string;
    method: 'grass' | 'fishing';
    x: number;
    y: number;
    zoneId?: string;
  }): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.warn(`⚠️ [EncounterHandlers] Joueur ${client.sessionId} non trouvé`);
      return;
    }

    console.log(`🌿 [EncounterHandlers] === VÉRIFICATION RENCONTRE ===`);
    console.log(`👤 Joueur: ${player.name}`);
    console.log(`📍 Position: (${data.x}, ${data.y}) dans ${data.zone}`);
    console.log(`🎯 Zone ID: ${data.zoneId || 'default'}`);
    console.log(`🌿 Méthode: ${data.method}`);

    try {
      // ✅ OBTENIR LES CONDITIONS ACTUELLES
      const conditions = this.room.getCurrentTimeInfo();
      const timeOfDay = conditions.isDayTime ? 'day' : 'night';
      const weather = conditions.weather === 'rain' ? 'rain' : 'clear';

      console.log(`⏰ Conditions: ${timeOfDay}, ${weather}`);

      // ✅ VALIDATION CÔTÉ SERVEUR avec zones
      const wildPokemon = await this.encounterManager.validateAndGenerateEncounter(
        client.sessionId,
        data.zone,
        data.x,
        data.y,
        timeOfDay as 'day' | 'night',
        weather as 'clear' | 'rain',
        data.zoneId,
        data.method
      );

      if (wildPokemon) {
        console.log(`⚔️ [EncounterHandlers] Rencontre déclenchée !`);
        console.log(`🐾 Pokémon: ${wildPokemon.pokemonId} niveau ${wildPokemon.level}`);
        console.log(`✨ Spécial: Shiny=${wildPokemon.shiny}, Nature=${wildPokemon.nature}`);
        
        // ✅ ENVOYER L'ÉVÉNEMENT DE RENCONTRE AU CLIENT
        client.send("encounterTriggered", {
          wildPokemon: {
            pokemonId: wildPokemon.pokemonId,
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
            x: data.x,
            y: data.y
          },
          method: data.method,
          conditions: {
            timeOfDay,
            weather
          },
          timestamp: Date.now()
        });

        console.log(`📤 [EncounterHandlers] Rencontre envoyée à ${client.sessionId}`);
        
        // ✅ BROADCASTER AUX AUTRES JOUEURS DE LA ZONE (optionnel)
        this.broadcastToZone(player.currentZone, "playerEncounter", {
          playerName: player.name,
          pokemonId: wildPokemon.pokemonId,
          level: wildPokemon.level,
          shiny: wildPokemon.shiny
        }, client.sessionId);

      } else {
        console.log(`❌ [EncounterHandlers] Aucune rencontre pour ${player.name}`);
        
        // ✅ INFORMER LE CLIENT QU'IL N'Y A PAS DE RENCONTRE
        client.send("encounterResult", {
          success: false,
          reason: "no_encounter",
          conditions: { timeOfDay, weather },
          cooldownActive: false
        });
      }

    } catch (error) {
      console.error(`❌ [EncounterHandlers] Erreur lors de la vérification:`, error);
      client.send("encounterError", {
        message: "Erreur lors de la vérification de rencontre",
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  // ✅ HANDLER : DÉCLENCHEMENT COMBAT SAUVAGE
  private async handleTriggerWildBattle(client: Client, data: {
    playerPokemonId: number;
    zone: string;
    method?: string;
    x: number;
    y: number;
    zoneId?: string;
  }): Promise<void> {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      client.send("battleError", { message: "Joueur non trouvé" });
      return;
    }

    console.log(`🎮 [EncounterHandlers] === DÉCLENCHEMENT COMBAT SAUVAGE ===`);
    console.log(`👤 Joueur: ${player.name}`);
    console.log(`📍 Position: (${data.x}, ${data.y})`);
    console.log(`🌍 Zone: ${data.zone} - ZoneID: ${data.zoneId || 'default'}`);

    try {
      // ✅ OBTENIR LES CONDITIONS ACTUELLES
      const conditions = this.room.getCurrentTimeInfo();
      
      // ✅ CRÉER LE COMBAT VIA L'API INTERNE
      const response = await fetch('http://localhost:2567/api/battle/wild', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: client.sessionId,
          playerName: player.name,
          playerPokemonId: data.playerPokemonId,
          zone: data.zone,
          zoneId: data.zoneId,
          method: data.method || 'grass',
          timeOfDay: conditions.isDayTime ? 'day' : 'night',
          weather: conditions.weather,
          x: data.x,
          y: data.y
        })
      });

      if (response.ok) {
        const battleData = await response.json();
        
        console.log(`✅ [EncounterHandlers] Combat créé: ${battleData.roomId}`);
        
        client.send("battleCreated", {
          success: true,
          roomId: battleData.roomId,
          wildPokemon: battleData.wildPokemon,
          encounter: battleData.encounter
        });

        // ✅ BROADCASTER QUE LE JOUEUR ENTRE EN COMBAT
        this.broadcastToZone(player.currentZone, "playerEnteredBattle", {
          playerName: player.name,
          battleType: "wild",
          wildPokemon: battleData.wildPokemon
        }, client.sessionId);

      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur API battle');
      }

    } catch (error) {
      console.error('❌ [EncounterHandlers] Erreur création combat:', error);
      client.send("battleError", { 
        message: "Impossible de créer le combat",
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  // ✅ HANDLER : RÉSULTAT DE COMBAT
  private handleBattleResult(client: Client, data: {
    result: 'victory' | 'defeat' | 'fled' | 'caught';
    expGained?: number;
    pokemonCaught?: boolean;
    capturedPokemon?: any;
  }): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`🏆 [EncounterHandlers] Résultat de combat pour ${player.name}:`, data.result);

    // ✅ METTRE À JOUR L'ÉTAT DU JOUEUR SELON LE RÉSULTAT
    switch (data.result) {
      case 'victory':
        console.log(`${player.name} remporte le combat !`);
        if (data.expGained) {
          console.log(`${player.name} gagne ${data.expGained} XP !`);
          // TODO: Mettre à jour l'XP du joueur
        }
        break;

      case 'caught':
        console.log(`${player.name} a capturé un Pokémon !`);
        if (data.capturedPokemon) {
          console.log(`Pokémon capturé:`, data.capturedPokemon);
          // TODO: Ajouter le Pokémon à l'équipe du joueur
        }
        break;

      case 'defeat':
        console.log(`${player.name} a été battu...`);
        // TODO: Logique de défaite (téléportation au Centre Pokémon, etc.)
        break;

      case 'fled':
        console.log(`${player.name} a pris la fuite !`);
        break;
    }

    // ✅ BROADCASTER LE RÉSULTAT AUX AUTRES JOUEURS DE LA ZONE
    this.broadcastToZone(player.currentZone, "playerBattleResult", {
      playerName: player.name,
      result: data.result,
      expGained: data.expGained,
      pokemonCaught: data.pokemonCaught
    }, client.sessionId);

    // ✅ CONFIRMER AU CLIENT
    client.send("battleResultProcessed", {
      success: true,
      result: data.result,
      message: this.getBattleResultMessage(data.result)
    });
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
      encounterManagerStats: 'visible en console serveur'
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
        client.send("encounterTriggered", {
          wildPokemon: {
            pokemonId: wildPokemon.pokemonId,
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
        client.send("encounterDebugResult", {
          success: false,
          message: "Impossible de générer une rencontre même en mode forcé",
          zone: data.zone,
          zoneId: data.zoneId
        });
      }

    } catch (error) {
      console.error('❌ [EncounterHandlers] Erreur force rencontre:', error);
      client.send("encounterDebugResult", {
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
    
    client.send("encounterPositionInfo", {
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

  private getBattleResultMessage(result: string): string {
    switch (result) {
      case 'victory': return 'Victoire ! Votre Pokémon a gagné de l\'expérience !';
      case 'defeat': return 'Défaite... Votre Pokémon a besoin de soins.';
      case 'caught': return 'Pokémon capturé avec succès !';
      case 'fled': return 'Vous avez fui le combat.';
      default: return 'Combat terminé.';
    }
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
