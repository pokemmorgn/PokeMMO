// server/src/services/ZoneSyncService.ts
import { Client } from "@colyseus/core";
import { Player } from "../schema/PokeWorldState";
import { getDbZoneName } from "../config/ZoneMapping";

interface ZoneSyncDependencies {
  getNpcManager: (zoneName: string) => any;
  getObjectInteractionHandlers: () => any;
  getQuestManager: () => any;
  getTimeWeatherService: () => any;
  getOverworldPokemonManager?: () => any;
}

interface SyncOptions {
  includeNpcs?: boolean;
  includeObjects?: boolean;
  includeQuests?: boolean;
  includeTimeWeather?: boolean;
  includeOverworldPokemon?: boolean;
  includeAll?: boolean;
}

interface SyncResult {
  success: boolean;
  npcs?: number;
  objects?: number;
  questStatuses?: number;
  errors?: string[];
}

export class ZoneSyncService {
  private deps: ZoneSyncDependencies;

  constructor(dependencies: ZoneSyncDependencies) {
    this.deps = dependencies;
  }

  /**
   * 🎯 MÉTHODE PRINCIPALE : Synchroniser tout pour un joueur dans une zone
   */
  async syncPlayerToZone(
    client: Client, 
    player: Player, 
    zoneName: string, 
    options: SyncOptions = { includeAll: true }
  ): Promise<SyncResult> {
    
    const mappedZone = getDbZoneName(zoneName);
    const startTime = Date.now();
    
    console.log(`🔄 [ZoneSyncService] Sync ${client.sessionId} → ${mappedZone}`);

    const opts = options.includeAll ? {
      includeNpcs: true,
      includeObjects: true,
      includeQuests: true,
      includeTimeWeather: true,
      includeOverworldPokemon: true
    } : options;

    const result: SyncResult = { success: true, errors: [] };

    try {
      // Synchronisation séquentielle pour éviter spam
      if (opts.includeNpcs) {
        result.npcs = await this.syncNpcsToClient(client, mappedZone);
      }

      if (opts.includeObjects) {
        result.objects = await this.syncObjectsToClient(client, mappedZone);
      }

      if (opts.includeQuests) {
        result.questStatuses = await this.syncQuestStatusesToClient(client, player.name);
      }

      if (opts.includeTimeWeather) {
        await this.syncTimeWeatherToClient(client, zoneName);
      }

      if (opts.includeOverworldPokemon) {
        await this.syncOverworldPokemonToClient(client);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [ZoneSyncService] Sync terminé en ${duration}ms:`, {
        npcs: result.npcs || 0,
        objects: result.objects || 0,
        quests: result.questStatuses || 0
      });

    } catch (error) {
      result.success = false;
      result.errors = [error instanceof Error ? error.message : 'Erreur inconnue'];
      console.error(`❌ [ZoneSyncService] Erreur sync:`, error);
    }

    return result;
  }

  /**
   * 🤖 Synchroniser les NPCs d'une zone
   */
  async syncNpcsToClient(client: Client, mappedZoneName: string): Promise<number> {
    try {
      const npcManager = this.deps.getNpcManager(mappedZoneName);
      if (!npcManager) {
        console.warn(`⚠️ [ZoneSyncService] NPCManager non trouvé pour ${mappedZoneName}`);
        return 0;
      }

      const npcs = npcManager.getNpcsByZone(mappedZoneName);
      
      if (npcs.length === 0) {
        console.warn(`⚠️ [ZoneSyncService] Aucun NPC trouvé pour ${mappedZoneName}`);
      }

      client.send("npcList", npcs);
      console.log(`📤 [ZoneSyncService] ${npcs.length} NPCs envoyés`);
      
      return npcs.length;

    } catch (error) {
      console.error(`❌ [ZoneSyncService] Erreur sync NPCs:`, error);
      throw error;
    }
  }

  /**
   * 🏺 Synchroniser les objets de zone
   */
  async syncObjectsToClient(client: Client, mappedZoneName: string): Promise<number> {
    try {
      const objectHandlers = this.deps.getObjectInteractionHandlers();
      if (!objectHandlers) {
        console.warn(`⚠️ [ZoneSyncService] ObjectHandlers non disponible`);
        return 0;
      }

      // Déléguer à la méthode existante
      await objectHandlers.sendZoneObjectsToClient(client, mappedZoneName);
      console.log(`🏺 [ZoneSyncService] Objets de zone envoyés`);
      
      return 1; // Pas de count précis, mais sync effectué
      
    } catch (error) {
      console.error(`❌ [ZoneSyncService] Erreur sync objets:`, error);
      throw error;
    }
  }

  /**
   * 📋 Synchroniser les statuts de quête
   */
  async syncQuestStatusesToClient(client: Client, playerName: string): Promise<number> {
    try {
      const questManager = this.deps.getQuestManager();
      if (!questManager) {
        console.warn(`⚠️ [ZoneSyncService] QuestManager non disponible`);
        return 0;
      }

      const availableQuests = await questManager.getAvailableQuests(playerName);
      const activeQuests = await questManager.getActiveQuests(playerName);

      const questStatuses: any[] = [];

      // Quêtes disponibles
      for (const quest of availableQuests) {
        if (quest.startNpcId) {
          questStatuses.push({
            npcId: quest.startNpcId,
            type: 'questAvailable'
          });
        }
      }

      // Quêtes actives/prêtes
      for (const quest of activeQuests) {
        if (quest.status === 'readyToComplete' && quest.endNpcId) {
          questStatuses.push({
            npcId: quest.endNpcId,
            type: 'questReadyToComplete'
          });
        } else if (quest.endNpcId) {
          questStatuses.push({
            npcId: quest.endNpcId,
            type: 'questInProgress'
          });
        }
      }

      if (questStatuses.length > 0) {
        client.send("questStatuses", { questStatuses });
        console.log(`📋 [ZoneSyncService] ${questStatuses.length} quest statuses envoyés`);
      }

      return questStatuses.length;

    } catch (error) {
      console.error(`❌ [ZoneSyncService] Erreur sync quêtes:`, error);
      throw error;
    }
  }

  /**
   * 🌤️ Synchroniser temps/météo
   */
  async syncTimeWeatherToClient(client: Client, zoneName: string): Promise<void> {
    try {
      const timeWeatherService = this.deps.getTimeWeatherService();
      if (!timeWeatherService) {
        console.warn(`⚠️ [ZoneSyncService] TimeWeatherService non disponible`);
        return;
      }

      timeWeatherService.updateClientZone(client, zoneName);
      
      // Envoyer l'état actuel après un court délai
      setTimeout(() => {
        if (timeWeatherService) {
          timeWeatherService.sendCurrentStateToAllClients();
        }
      }, 50);

      console.log(`🌤️ [ZoneSyncService] Temps/météo synchronisé`);

    } catch (error) {
      console.error(`❌ [ZoneSyncService] Erreur sync temps/météo:`, error);
      throw error;
    }
  }

  /**
   * 🐾 Synchroniser Pokémon overworld
   */
  async syncOverworldPokemonToClient(client: Client): Promise<void> {
    try {
      const overworldManager = this.deps.getOverworldPokemonManager?.();
      if (!overworldManager) {
        console.warn(`⚠️ [ZoneSyncService] OverworldPokemonManager non disponible`);
        return;
      }

      // Délai pour laisser le client se stabiliser
      setTimeout(() => {
        overworldManager.syncPokemonForClient(client);
      }, 2000);

      console.log(`🐾 [ZoneSyncService] Pokémon overworld synchronisés`);

    } catch (error) {
      console.error(`❌ [ZoneSyncService] Erreur sync Pokémon:`, error);
      throw error;
    }
  }

  /**
   * 🔄 MÉTHODES SPÉCIFIQUES pour updates ciblées
   */

  /**
   * Mettre à jour un NPC spécifique pour tous les clients d'une zone
   */
  async updateNpcForZone(zoneName: string, npcId: number, npcData: any, broadcastFn: (message: string, data: any) => void): Promise<void> {
    const mappedZone = getDbZoneName(zoneName);
    
    console.log(`🤖 [ZoneSyncService] Update NPC ${npcId} pour zone ${mappedZone}`);
    
    broadcastFn("npcUpdate", {
      npcId: npcId,
      npcData: npcData,
      zone: mappedZone,
      timestamp: Date.now()
    });
  }

  /**
   * Mettre à jour un objet spécifique pour tous les clients d'une zone
   */
  async updateObjectForZone(zoneName: string, objectId: string, objectData: any, broadcastFn: (message: string, data: any) => void): Promise<void> {
    const mappedZone = getDbZoneName(zoneName);
    
    console.log(`🏺 [ZoneSyncService] Update objet ${objectId} pour zone ${mappedZone}`);
    
    broadcastFn("objectUpdate", {
      objectId: objectId,
      objectData: objectData,
      zone: mappedZone,
      timestamp: Date.now()
    });
  }

  /**
   * Resynchroniser un client spécifique (reconnexion, bug, etc.)
   */
  async resyncClient(client: Client, player: Player, zoneName: string): Promise<SyncResult> {
    console.log(`🔄 [ZoneSyncService] Resync client ${client.sessionId}`);
    
    return await this.syncPlayerToZone(client, player, zoneName, {
      includeAll: true
    });
  }

  /**
   * Synchronisation partielle (ex: seulement quêtes)
   */
  async syncQuestsOnly(client: Client, playerName: string): Promise<number> {
    console.log(`📋 [ZoneSyncService] Sync quêtes uniquement pour ${client.sessionId}`);
    
    return await this.syncQuestStatusesToClient(client, playerName);
  }

  /**
   * Synchronisation partielle (ex: seulement NPCs)
   */
  async syncNpcsOnly(client: Client, zoneName: string): Promise<number> {
    const mappedZone = getDbZoneName(zoneName);
    console.log(`🤖 [ZoneSyncService] Sync NPCs uniquement pour ${client.sessionId}`);
    
    return await this.syncNpcsToClient(client, mappedZone);
  }

  /**
   * 📊 Statistiques du service
   */
  getStats(): any {
    return {
      serviceName: 'ZoneSyncService',
      version: '1.0.0',
      dependencies: {
        npcManager: !!this.deps.getNpcManager,
        objectHandlers: !!this.deps.getObjectInteractionHandlers,
        questManager: !!this.deps.getQuestManager,
        timeWeatherService: !!this.deps.getTimeWeatherService,
        overworldPokemonManager: !!this.deps.getOverworldPokemonManager
      }
    };
  }
}
