import { Room, Client } from "@colyseus/core";
import mongoose from "mongoose";
import jwt from 'jsonwebtoken';

import { JWTManager } from '../managers/JWTManager';
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { ZoneManager } from "../managers/ZoneManager";
import { NpcManager } from "../managers/NPCManager";
import { InventoryManager } from "../managers/InventoryManager"; 
import { ShopManager } from "../managers/ShopManager";
import { getItemData, getItemPocket } from "../utils/ItemDB";
import { TransitionService, TransitionRequest } from "../services/TransitionService";
import { CollisionManager } from "../managers/CollisionManager";
import { TimeWeatherService } from "../services/TimeWeatherService";
import { getServerConfig } from "../config/serverConfig";
import { serverZoneEnvironmentManager } from "../config/zoneEnvironments";
import { PositionSaverService } from "../services/PositionSaverService";
import { PlayerData } from "../models/PlayerData";
import { getDbZoneName } from '../config/ZoneMapping';
import { ZoneSyncService } from "../services/ZoneSyncService";
import { FollowerHandlers } from "../handlers/FollowerHandlers";
import { TeamManager } from "../managers/TeamManager";
import { TeamHandlers } from "../handlers/TeamHandlers";
import { EncounterHandlers } from "../handlers/EncounterHandlers";
import { OverworldPokemonManager } from "../managers/OverworldPokemonManager";
import { QuestHandlers } from "../handlers/QuestHandlers";
import { starterService } from "../services/StarterPokemonService";
import { movementBlockManager, BlockReason } from "../managers/MovementBlockManager";
import { BattleHandlers } from "../handlers/BattleHandlers";
import { StarterHandlers } from "../handlers/StarterHandlers";
import PokedexMessageHandler from '../handlers/PokedexMessageHandler';
import { MovementHandlers } from "../handlers/MovementHandlers";
import { ObjectInteractionHandlers } from "../handlers/ObjectInteractionHandlers";
import { ObjectInteractionModule } from "../interactions/modules/ObjectInteractionModule";
import { SpectatorManager } from "../battle/modules/broadcast/SpectatorManager";
import { NpcInteractionModule } from "../interactions/modules/NpcInteractionModule";
import { InteractionManager } from "../managers/InteractionManager";
import { 
  InteractionRequest, 
  InteractionContext,
  InteractionResult 
} from "../interactions/types/BaseInteractionTypes";

interface QuestStartResult {
  success: boolean;
  message: string;
  quest?: any;
}

interface Quest {
  id: string;
  name: string;
  currentStepIndex?: number;
}

export class WorldRoom extends Room<PokeWorldState> {
  private zoneManager!: ZoneManager;
  private npcManagers: Map<string, NpcManager> = new Map();
  private transitionService!: TransitionService;
  private timeWeatherService!: TimeWeatherService;
  private encounterHandlers!: EncounterHandlers;
  private shopManager!: ShopManager;
  private positionSaver = PositionSaverService.getInstance();
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private teamHandlers!: TeamHandlers;
  private questHandlers!: QuestHandlers;
  private battleHandlers!: BattleHandlers;
  public starterHandlers!: StarterHandlers;
  private followerHandlers!: FollowerHandlers;
  private pokedexHandler!: PokedexMessageHandler;
  private teamManagers: Map<string, TeamManager> = new Map();
  private overworldPokemonManager!: OverworldPokemonManager;
  private movementHandlers!: MovementHandlers;
  private objectInteractionHandlers!: ObjectInteractionHandlers;
  private objectInteractionModule!: ObjectInteractionModule;
  private spectatorManager = new SpectatorManager();
  private jwtManager = JWTManager.getInstance();
  private npcInteractionModule!: NpcInteractionModule;
  private interactionManager!: InteractionManager;
  private zoneSyncService!: ZoneSyncService; 
  
  maxClients = 50;
  private lastStateUpdate = 0;
  private stateUpdateInterval = 100;

  async onCreate(options: any) {
    this.setState(new PokeWorldState());
    
    this.overworldPokemonManager = new OverworldPokemonManager(this);
    movementBlockManager.setRoomReference(this);
    
    setInterval(() => {
      movementBlockManager.cleanup();
    }, 30000);

    this.starterHandlers = new StarterHandlers(this);
    this.zoneManager = new ZoneManager(this);

    const ServiceRegistry = require('../services/ServiceRegistry').ServiceRegistry;
    const registry = ServiceRegistry.getInstance();

    this.pokedexHandler = new PokedexMessageHandler(this);
    registry.registerWorldRoom(this);
    
    const questManager = this.zoneManager.getQuestManager();
    console.log(`🔍 [DEBUG] QuestManager récupéré:`, !!questManager);
    
    if (questManager) {
      registry.registerQuestManager(questManager);
      console.log(`✅ [DEBUG] QuestManager enregistré dans ServiceRegistry`);
      
      // Test immédiat
      const testRetrieve = registry.getQuestManager();
      console.log(`🧪 [DEBUG] Test récupération QuestManager:`, !!testRetrieve);
      
      if (testRetrieve) {
        console.log(`🎯 [DEBUG] QuestManager accessible - test asPlayerQuestWith disponible`);
      } else {
        console.error(`❌ [DEBUG] PROBLÈME: QuestManager non récupérable après enregistrement !`);
      }
    } else {
      console.error(`❌ [DEBUG] PROBLÈME: QuestManager non disponible depuis ZoneManager !`);
      
      // Debug ZoneManager
      console.log(`🔍 [DEBUG] ZoneManager état:`, {
        exists: !!this.zoneManager,
        questManagerMethod: typeof this.zoneManager?.getQuestManager
      });
    }
      
    this.transitionService = new TransitionService();
    this.teamHandlers = new TeamHandlers(this);
    this.followerHandlers = new FollowerHandlers(this);
    this.transitionService.setFollowerHandlers(this.followerHandlers);
    this.questHandlers = new QuestHandlers(this);
    this.battleHandlers = new BattleHandlers(this);
    this.encounterHandlers = new EncounterHandlers(this);

    this.initializeTimeWeatherService();

    this.movementHandlers = new MovementHandlers(this);
    this.objectInteractionHandlers = new ObjectInteractionHandlers(this);
    
    this.objectInteractionModule = new ObjectInteractionModule();
    this.objectInteractionHandlers.setObjectModule(this.objectInteractionModule);
    
    this.objectInteractionModule.initialize().then(() => {
      console.log(`✅ ObjectInteractionModule initialisé`);
    }).catch((error) => {
      console.error(`❌ Erreur initialisation ObjectInteractionModule:`, error);
    });
    
    this.setupMessageHandlers();

    this.shopManager = new ShopManager();
    
    this.interactionManager = new InteractionManager(
      (zoneName: string) => this.getNpcManager(zoneName),
      this.zoneManager.getQuestManager(),
      this.shopManager,
      this.starterHandlers,
      this.spectatorManager
    );
    
    this.npcInteractionModule = new NpcInteractionModule(
      (zoneName: string) => this.getNpcManager(zoneName),
      this.zoneManager.getQuestManager(),
      this.shopManager,
      this.starterHandlers,
      this.spectatorManager
    );

    this.initializeZoneSyncService();
    
    try {
      await this.initializeNpcManagers();
      this.configureWorldTimer();
      
      this.clients.forEach(client => {
        const player = this.state.players.get(client.sessionId);
        if (player) {
          this.onPlayerJoinZone(client, player.currentZone);
        }
      });
      
    } catch (error) {
      console.error(`❌ [WorldRoom] Erreur critique chargement NPCs:`, error);
      this.configureWorldTimerFallback();
    }
    
    this.autoSaveTimer = setInterval(() => {
      this.autoSaveAllPositions();
    }, 30000);
  }

  private configureWorldTimer(): void {
    this.interactionManager.setAdditionalManagers({
      objectManager: this.objectInteractionHandlers,
      npcManagers: this.npcManagers,
      room: this
    });
  }

  private configureWorldTimerFallback(): void {
    this.interactionManager.setAdditionalManagers({
      objectManager: this.objectInteractionHandlers,
      npcManagers: new Map(),
      room: this
    });
  }

  private async autoSaveAllPositions() {
    const positions = Array.from(this.state.players.values())
      .map(player => this.positionSaver.extractPosition(player));
    
    if (positions.length > 0) {
      await this.positionSaver.saveMultiplePositions(positions);
    }
  }

  private initializeZoneSyncService(): void {
    this.zoneSyncService = new ZoneSyncService({
      getNpcManager: (zoneName: string) => this.getNpcManager(zoneName),
      getObjectInteractionHandlers: () => this.objectInteractionHandlers,
      getQuestManager: () => this.zoneManager.getQuestManager(),
      getTimeWeatherService: () => this.timeWeatherService,
      getOverworldPokemonManager: () => this.overworldPokemonManager
    });
  }

  private initializeTimeWeatherService() {
    this.timeWeatherService = new TimeWeatherService(this.state, this.clock);
    
    this.timeWeatherService.setTimeChangeCallback((hour, isDayTime) => {
      const timeData = {
        gameHour: hour,
        isDayTime: isDayTime,
        displayTime: this.timeWeatherService.formatTime(),
        timestamp: Date.now()
      };
      
      this.broadcast("timeUpdate", timeData);
    });
    
    this.timeWeatherService.setWeatherChangeCallback((weather) => {
      const weatherData = {
        weather: weather.name,
        displayName: weather.displayName,
        timestamp: Date.now()
      };
      
      this.broadcast("weatherUpdate", weatherData);
    });

    this.setupTimeWeatherCommands();
  }

  private setupTimeWeatherCommands() {
    this.onMessage("setTime", (client, data: { hour: number, minute?: number }) => {
      if (this.timeWeatherService) {
        this.timeWeatherService.forceTime(data.hour, data.minute || 0);
      }
    });

    this.onMessage("setWeather", (client, data: { weather: string }) => {
      if (this.timeWeatherService) {
        this.timeWeatherService.forceWeather(data.weather);
      }
    });

    this.onMessage("debugTimeWeather", (client) => {
      if (this.timeWeatherService) {
        this.timeWeatherService.debugSyncStatus();
        
        const health = this.timeWeatherService.healthCheck();
        client.send("timeWeatherDebug", {
          currentTime: this.timeWeatherService.getCurrentTime(),
          currentWeather: this.timeWeatherService.getCurrentWeather(),
          connectedClients: this.timeWeatherService.getConnectedClientsCount(),
          health: health
        });
      }
    });

    this.onMessage("forceSyncTimeWeather", (client) => {
      if (this.timeWeatherService) {
        this.timeWeatherService.forceSyncAll();
        client.send("syncForced", { 
          message: "Synchronisation forcée de tous les clients",
          clientCount: this.timeWeatherService.getConnectedClientsCount()
        });
      }
    });
  }

  private async initializeNpcManagers() {
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        console.error(`❌ [CRITIQUE] MongoDB non connecté ! ReadyState: ${mongoose.connection.readyState}`);
      }
      
      const { NpcData } = await import('../models/NpcData');
      const totalCount = await NpcData.countDocuments();
      
      if (totalCount === 0) {
        console.error(`❌ [CRITIQUE] Aucun NPC trouvé en base de données !`);
      }
      
      const zones = await NpcData.distinct('zone');
      
      if (zones.length > 0) {
        const testZone = zones[0];
        const testNpcs = await NpcData.find({ zone: testZone }).limit(3);
      }
      
      const globalNpcManager = new NpcManager();
      
      const initPromise = globalNpcManager.initialize();
      const initTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout initialisation NPC Manager (10s)')), 10000);
      });
      
      try {
        await Promise.race([initPromise, initTimeout]);
      } catch (initError) {
        console.error(`❌ [CRITIQUE] Erreur lors de initialize():`, initError);
        throw initError;
      }
      
      const loaded = await globalNpcManager.waitForLoad(20000);

      if (!loaded) {
        console.error(`❌ [CRITIQUE] TIMEOUT lors du chargement des NPCs après 20s !`);
        const stats = globalNpcManager.getSystemStats();
        console.warn(`⚠️ [FALLBACK] Utilisation du manager avec ${stats.totalNpcs} NPCs chargés`);
      }
      
      const allNpcs = globalNpcManager.getAllNpcs();
      
      if (allNpcs.length > 0) {
        const npcsByZone: { [key: string]: any[] } = {};
        allNpcs.forEach(npc => {
          if (!npcsByZone[npc.zone]) npcsByZone[npc.zone] = [];
          npcsByZone[npc.zone].push(npc);
        });
      } else {
        console.error(`❌ [CRITIQUE] Aucun NPC chargé en mémoire !`);
      }
      
      this.npcManagers.set('global', globalNpcManager);
      
      const hotReloadStatus = globalNpcManager.getHotReloadStatus();
      
      if (hotReloadStatus && hotReloadStatus.active) {
        globalNpcManager.onNpcChange((event, npcData) => {
          this.broadcast("npcHotReload", {
            event: event,
            npcData: npcData ? {
              id: npcData.id,
              name: npcData.name,
              x: npcData.x,
              y: npcData.y,
              type: npcData.type,
              zone: this.extractZoneFromNpc(npcData)
            } : null,
            timestamp: Date.now()
          });
        });
      }
      
      globalNpcManager.debugSystem();
      
    } catch (error) {
      console.error(`❌ [CRITICAL ERROR] === ERREUR CRITIQUE INITIALISATION NPC MANAGERS ===`);
      
      try {
        const fallbackManager = new NpcManager();
        this.npcManagers.set('global', fallbackManager);
        console.warn(`⚠️ Manager NPCs en mode fallback (0 NPCs) pour éviter les crashes`);
      } catch (fallbackError) {
        console.error(`💀 [FATAL] Impossible de créer le manager fallback:`, fallbackError);
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`NPC Manager initialization completely failed: ${errorMsg}`);
      }
      
      throw error;
    }
  }

  private extractZoneFromNpc(npc: any): string {
    if (npc.sourceFile) {
      const match = npc.sourceFile.match(/([^\/\\]+)\.json$/);
      return match ? match[1] : 'unknown';
    }
    if (npc.mongoDoc && npc.mongoDoc.zone) {
      return npc.mongoDoc.zone;
    }
    return 'unknown';
  }

  async onPlayerJoinZone(client: Client, zoneName: string) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Joueur non trouvé pour session: ${client.sessionId}`);
      return;
    }
    
    try {
      const position = this.positionSaver.extractPosition(player);
      await this.positionSaver.savePosition(position, "transition");
    } catch (saveError) {
      console.error(`❌ Erreur sauvegarde position:`, saveError);
    }

    try {
      const syncResult = await this.zoneSyncService.syncPlayerToZone(client, player, zoneName);
      
      if (!syncResult.success) {
        console.error(`❌ [onPlayerJoinZone] Erreurs de synchronisation:`, syncResult.errors);
      }
    } catch (error) {
      console.error(`❌ [onPlayerJoinZone] Erreur critique:`, error);
      
      try {
        await this.zoneSyncService.syncNpcsOnly(client, zoneName);
        await this.zoneSyncService.syncQuestsOnly(client, player.name);
      } catch (fallbackError) {
        console.error(`💀 [onPlayerJoinZone] Fallback échoué:`, fallbackError);
      }
    }

    this.clock.setTimeout(async () => {
      await this.updateQuestStatusesFixed(player.name, client);
    }, 500);
  }

  private async updateQuestStatusesFixed(username: string, client?: Client) {
    try {
      if (!this.zoneManager) {
        console.error(`❌ [WorldRoom] ZoneManager non initialisé !`);
        return;
      }
      
      const questManager = this.zoneManager.getQuestManager();
      if (!questManager) {
        console.error(`❌ [WorldRoom] QuestManager non accessible !`);
        return;
      }
      
      const availableQuests = await questManager.getAvailableQuests(username);
      const activeQuests = await questManager.getActiveQuests(username);
      
      const npcQuestMap = new Map<number, any>();

      for (const quest of availableQuests) {
        if (quest.startNpcId) {
          if (!npcQuestMap.has(quest.startNpcId)) {
            npcQuestMap.set(quest.startNpcId, {
              npcId: quest.startNpcId,
              availableQuestIds: [],
              inProgressQuestIds: [],
              readyToCompleteQuestIds: []
            });
          }
          
          npcQuestMap.get(quest.startNpcId).availableQuestIds.push(quest.id);
        }
      }

      for (const quest of activeQuests) {
        if (quest.endNpcId) {
          if (!npcQuestMap.has(quest.endNpcId)) {
            npcQuestMap.set(quest.endNpcId, {
              npcId: quest.endNpcId,
              availableQuestIds: [],
              inProgressQuestIds: [],
              readyToCompleteQuestIds: []
            });
          }
          
          if (quest.status === 'readyToComplete') {
            npcQuestMap.get(quest.endNpcId).readyToCompleteQuestIds.push(quest.id);
          } else {
            npcQuestMap.get(quest.endNpcId).inProgressQuestIds.push(quest.id);
          }
        }
      }

      const questStatuses: any[] = [];

      npcQuestMap.forEach((npcData) => {
        let finalType = null;
        
        if (npcData.readyToCompleteQuestIds.length > 0) {
          finalType = 'questReadyToComplete';
        } else if (npcData.availableQuestIds.length > 0) {
          finalType = 'questAvailable';
        } else if (npcData.inProgressQuestIds.length > 0) {
          finalType = 'questInProgress';
        }
        
        if (finalType) {
          questStatuses.push({
            npcId: npcData.npcId,
            type: finalType,
            availableQuestIds: npcData.availableQuestIds,
            inProgressQuestIds: npcData.inProgressQuestIds,
            readyToCompleteQuestIds: npcData.readyToCompleteQuestIds
          });
        }
      });
      
      if (questStatuses.length > 0) {
        if (client) {
          client.send("questStatuses", { questStatuses });
        } else {
          this.broadcast("questStatuses", { questStatuses });
        }
      }
      
    } catch (error) {
      console.error(`❌ [WorldRoom] Erreur updateQuestStatusesFixed:`, error);
    }
  }

  public getNpcManager(zoneName: string): NpcManager | undefined {
    const globalManager = this.npcManagers.get('global');
    if (!globalManager) {
      console.warn(`⚠️ [WorldRoom] NPCManager global non trouvé`);
      return undefined;
    }
    return globalManager;
  }

  public getAvailableNpcZones(): string[] {
    return Array.from(this.npcManagers.keys());
  }

  public debugNpcManagers(): void {
    this.npcManagers.forEach((npcManager, zoneName) => {
      const npcs = npcManager.getAllNpcs();
      console.log(`🌍 Zone: ${zoneName} - ${npcs.length} NPCs`);
      npcs.forEach(npc => {
        console.log(`  🤖 NPC ${npc.id}: ${npc.name} at (${npc.x}, ${npc.y})`);
      });
    });
  }
  
  private setupMessageHandlers() {
    this.teamHandlers.setupHandlers();
    this.followerHandlers.setupHandlers();
    this.encounterHandlers.setupHandlers();
    this.questHandlers.setupHandlers();
    this.battleHandlers.setupHandlers();
    this.movementHandlers.setupHandlers();
    this.objectInteractionHandlers.setupHandlers();
    
    this.onMessage("battleFinished", async (client, data) => {
      const player = this.state.players.get(client.sessionId);
      const playerName = player?.name;
      
      const sessionValidation = await this.jwtManager.validateSessionRobust(
        client.sessionId, 
        playerName, 
        'battleFinished'
      );
      
      if (!sessionValidation.valid) {
        console.error(`❌ [WorldRoom] ${sessionValidation.reason}`);
        client.send("battleFinishedError", { 
          reason: "Session invalide - reconnexion requise",
          details: sessionValidation.reason
        });
        return;
      }
      
      const { userId } = sessionValidation;
      
      this.battleHandlers.onBattleFinished(userId, data.battleResult);
      this.unblockPlayerMovement(client.sessionId, 'battle');
      this.jwtManager.clearBattleState(userId);
      
      client.send("battleFinishedAck", { success: true });
    });

    this.onMessage("debugJWTSession", (client) => {
      const userId = this.jwtManager.getUserId(client.sessionId);
      const jwtData = this.jwtManager.getJWTDataBySession(client.sessionId);
      
      client.send("debugJWTResult", {
        sessionId: client.sessionId,
        userIdFromMapping: userId,
        hasJWTData: !!jwtData,
        userIdFromJWT: jwtData?.userId,
        username: jwtData?.username
      });
      
      this.jwtManager.debugMappings();
    });

    this.starterHandlers.setupHandlers();

    this.onMessage("giveStarterChoice", async (client, data: { pokemonId: number }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) {
        client.send("starterReceived", {
          success: false,
          message: "Joueur non trouvé"
        })
        return
      }
      
      try {
        const { giveStarterToPlayer } = await import('../services/PokemonService');
        const { getPokemonById } = await import('../data/PokemonData');
        
        let pokemonDoc;
        if ([1, 4, 7].includes(data.pokemonId)) {
          pokemonDoc = await giveStarterToPlayer(player.name, data.pokemonId as 1 | 4 | 7);
        }
        
        const pokemonData = await getPokemonById(data.pokemonId);
        const starterName = pokemonData?.name || `Pokémon #${data.pokemonId}`;
        
        client.send("starterReceived", {
          success: true,
          pokemon: {
            id: pokemonDoc._id.toString(),
            pokemonId: pokemonDoc.pokemonId,
            name: pokemonDoc.nickname || starterName,
            level: pokemonDoc.level,
            shiny: pokemonDoc.shiny,
            nature: pokemonDoc.nature,
            currentHp: pokemonDoc.currentHp,
            maxHp: pokemonDoc.maxHp
          },
          message: `${starterName} ajouté à votre équipe !`
        })
        
        setTimeout(() => {
          client.send("starterSuccess", { shouldRefreshTeam: true });
        }, 500);
        
      } catch (error) {
        console.error('❌ [FIX] Erreur création starter:', error);
        
        client.send("starterReceived", {
          success: false,
          message: "Erreur lors de la création du starter"
        });
      }
    })

    this.onMessage("requestOverworldSync", (client) => {
      if (this.overworldPokemonManager) {
        this.overworldPokemonManager.syncPokemonForClient(client);
      }
    });

    this.onMessage("debugOverworldPokemon", (client) => {
      if (this.overworldPokemonManager) {
        this.overworldPokemonManager.debug();
        const stats = this.overworldPokemonManager.getStats();
        client.send("overworldPokemonStats", stats);
      }
    });

    this.onMessage("overworldPokemonSpawnResponse", (client, message) => {
      if (this.overworldPokemonManager) {
        this.overworldPokemonManager.handleClientSpawnResponse(client, message);
      }
    });

    this.onMessage("overworldPokemonMoveResponse", (client, message) => {
      if (this.overworldPokemonManager) {
        this.overworldPokemonManager.handleClientMoveResponse(client, message);
      }
    });

    this.onMessage("clearOverworldArea", (client, data: { areaId: string }) => {
      if (this.overworldPokemonManager) {
        this.overworldPokemonManager.clearArea(data.areaId);
      }
    });

    this.onMessage("ping", async (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        try {
          const user = await PlayerData.findOne({ username: player.name });
          if (user && user.currentSessionStart) {
            const sessionTime = Math.floor((Date.now() - user.currentSessionStart.getTime()) / (1000 * 60));
            if (sessionTime > 0) {
              user.totalPlaytime = (user.totalPlaytime || 0) + sessionTime;
              user.currentSessionStart = new Date();
              await user.save();
            }
          }
        } catch (error) {
          console.error('❌ Erreur update playtime via ping:', error);
        }
      }
      
      client.send("pong", { serverTime: Date.now() });
    });
    
    this.onMessage("moveToZone", async (client, data) => {
      await this.zoneManager.handleZoneTransition(client, data);
    });

    this.onMessage("debugMovementBlocks", (client) => {
      movementBlockManager.debugAllBlocks();
      
      const stats = movementBlockManager.getStats();
      client.send("movementBlockStats", stats);
    });

    this.onMessage("forceUnblockMovement", (client, data: { targetPlayerId?: string }) => {
      const targetId = data.targetPlayerId || client.sessionId;
      const success = movementBlockManager.forceUnblockAll(targetId);
      
      client.send("forceUnblockResult", {
        success,
        targetPlayerId: targetId,
        message: success ? "Déblocage forcé réussi" : "Erreur lors du déblocage"
      });
    });

    this.onMessage("checkMovementBlock", (client) => {
      const isBlocked = movementBlockManager.isMovementBlocked(client.sessionId);
      const blocks = movementBlockManager.getPlayerBlocks(client.sessionId);
      
      client.send("movementBlockStatus", {
        isBlocked,
        blocks: blocks.map(b => ({
          reason: b.reason,
          timestamp: b.timestamp,
          duration: b.duration,
          metadata: b.metadata
        }))
      });
    });
    
    this.onMessage("validateTransition", async (client, data: TransitionRequest) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("transitionResult", {
          success: false,
          reason: "Joueur non trouvé",
          rollback: true
        });
        return;
      }

      try {
        const result = await this.transitionService.validateTransition(client, player, data);
        
        if (result.success) {
          if (result.position) {
            const oldZone = player.currentZone;
            player.currentZone = result.currentZone!;
            player.x = result.position.x;
            player.y = result.position.y;
            
            this.onPlayerJoinZone(client, player.currentZone);
            this.scheduleFilteredStateUpdate();
          }
        }
        
        client.send("transitionResult", result);
        
      } catch (error) {
        console.error(`❌ Erreur validation transition:`, error);
        client.send("transitionResult", {
          success: false,
          reason: "Erreur serveur lors de la validation",
          rollback: true
        });
      }
    });

    this.onMessage("requestCurrentZone", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("currentZone", {
          zone: "beach",
          x: 360,
          y: 120,
          error: "Joueur non trouvé, zone par défaut",
          sceneKey: data.sceneKey,
          timestamp: Date.now()
        });
        return;
      }
      
      const response = {
        zone: player.currentZone,
        x: player.x,
        y: player.y,
        timestamp: Date.now(),
        sceneKey: data.sceneKey
      };
      
      client.send("currentZone", response);
    });
    
    this.onMessage("notifyZoneChange", (client, data: { newZone: string, x: number, y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        const oldZone = player.currentZone;
        
        player.currentZone = data.newZone;
        player.x = data.x;
        player.y = data.y;
        
        this.onPlayerJoinZone(client, data.newZone);
        this.scheduleFilteredStateUpdate();
      }
    });

    this.onMessage("npcInteract", async (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("npcInteractionResult", {
          success: false,
          type: "error",
          message: "Joueur non trouvé"
        });
        return;
      }

      try {
        const result = await this.interactionManager.handleNpcInteraction(player, data.npcId, data);
        client.send("npcInteractionResult", result);
        
      } catch (error) {
        console.error(`❌ Erreur interaction NPC:`, error);
        client.send("npcInteractionResult", {
          success: false,
          type: "error",
          message: "Erreur lors de l'interaction"
        });
      }
    });

    this.onMessage("requestInitialState", (client, data: { zone: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.currentZone === data.zone) {
        const filteredState = this.getFilteredStateForClient(client);
        if (filteredState) {
          client.send("filteredState", filteredState);
        }
      }
    });

    this.onMessage("npcSpecificAction", async (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("npcSpecificActionResult", {
          success: false,
          type: "error",
          message: "Joueur non trouvé"
        });
        return;
      }

      try {
        const result = await this.npcInteractionModule.handleSpecificAction(player, data);
        client.send("npcSpecificActionResult", result);
        
      } catch (error) {
        console.error(`❌ Erreur action spécifique NPC:`, error);
        client.send("npcSpecificActionResult", {
          success: false,
          type: "error",
          message: "Erreur lors de l'action spécifique",
          actionType: data.actionType,
          npcId: data.npcId
        });
      }
    });

    this.onMessage("requestPlayerState", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        client.send("playerStateResponse", {
          id: client.sessionId,
          name: player.name,
          x: player.x,
          y: player.y,
          currentZone: player.currentZone,
          level: player.level,
          gold: player.gold,
          isMyPlayer: true,
          exists: true
        });
        
        const filteredState = this.getFilteredStateForClient(client);
        client.send("forcedStateSync", {
          players: filteredState.players,
          mySessionId: client.sessionId,
          timestamp: Date.now()
        });
      } else {
        client.send("playerStateResponse", {
          exists: false,
          error: "Joueur non trouvé dans le state"
        });
      }
    });

    this.onMessage("checkMyPresence", (client) => {
      const exists = this.state.players.has(client.sessionId);
      client.send("presenceCheck", {
        exists: exists,
        sessionId: client.sessionId,
        totalPlayers: this.state.players.size
      });
    });

    this.onMessage("shopTransaction", async (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("shopTransactionResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      try {
        const result = await this.interactionManager.handleShopTransaction(
          player,
          data.shopId,
          data.action,
          data.itemId,
          data.quantity
        );

        if (result.success && result.newGold !== undefined) {
          if (data.action === 'buy') {
            player.gold = result.newGold;
          } else if (data.action === 'sell') {
            player.gold += result.newGold;
          }
        }

        client.send("shopTransactionResult", result);
        
      } catch (error) {
        console.error(`❌ Erreur transaction shop intégrée:`, error);
        client.send("shopTransactionResult", {
          success: false,
          message: "Erreur lors de la transaction"
        });
      }
    });

    this.onMessage("getShopCatalog", async (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("shopCatalogResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      try {
        const catalog = this.shopManager.getShopCatalog(data.shopId, player.level || 1);
        
        if (!catalog) {
          client.send("shopCatalogResult", {
            success: false,
            message: "Shop introuvable"
          });
          return;
        }

        const playerInventory = await InventoryManager.getAllItemsGroupedByPocket(player.name);
        const sellableItems: any[] = [];

        for (const [pocket, items] of Object.entries(playerInventory)) {
          if (Array.isArray(items)) {
            for (const item of items) {
              const sellPrice = this.shopManager.getItemSellPrice(data.shopId, item.itemId);
              if (sellPrice > 0 && item.quantity > 0) {
                sellableItems.push({
                  itemId: item.itemId,
                  quantity: item.quantity,
                  sellPrice: sellPrice,
                  canSell: true,
                  pocket: pocket
                });
              }
            }
          }
        }

        const response = {
          success: true,
          shopId: data.shopId,
          catalog: {
            shopInfo: catalog.shopInfo,
            buyItems: catalog.availableItems,
            sellItems: sellableItems
          },
          playerGold: player.gold || 1000
        };

        client.send("shopCatalogResult", response);

      } catch (error) {
        console.error(`❌ Erreur catalogue shop:`, error);
        client.send("shopCatalogResult", {
          success: false,
          message: "Erreur lors de la récupération du catalogue"
        });
      }
    });
    
    this.onMessage("refreshShop", (client, data) => {
      this.handleRefreshShop(client, data.shopId);
    });

    this.onMessage("getInventory", async (client) => {
      try {
        const player = this.state.players.get(client.sessionId);
        if (!player) {
          client.send("inventoryError", { message: "Joueur non trouvé" });
          return;
        }

        const inventoryData = await InventoryManager.getAllItemsGroupedByPocket(player.name);
        client.send("inventoryData", inventoryData);
        
      } catch (error) {
        console.error("❌ Erreur getInventory:", error);
        client.send("inventoryError", { 
          message: "Impossible de charger l'inventaire" 
        });
      }
    });

    this.onMessage("useItem", async (client, data) => {
      try {
        const player = this.state.players.get(client.sessionId);
        if (!player) {
          client.send("itemUseResult", { 
            success: false, 
            message: "Joueur non trouvé" 
          });
          return;
        }

        const canUse = await InventoryManager.canUseItem(
          player.name, 
          data.itemId, 
          data.context
        );
        
        if (!canUse) {
          client.send("itemUseResult", { 
            success: false, 
            message: "Impossible d'utiliser cet objet maintenant" 
          });
          return;
        }

        const itemCount = await InventoryManager.getItemCount(player.name, data.itemId);
        if (itemCount <= 0) {
          client.send("itemUseResult", { 
            success: false, 
            message: "Vous n'avez pas cet objet" 
          });
          return;
        }

        const success = await InventoryManager.removeItem(player.name, data.itemId, 1);
        if (!success) {
          client.send("itemUseResult", { 
            success: false, 
            message: "Erreur lors de la suppression de l'objet" 
          });
          return;
        }

        const effectResult = await this.applyItemEffect(player, data.itemId, data.context);
        
        client.send("itemUseResult", { 
          success: true, 
          message: effectResult.message || `${data.itemId} utilisé avec succès` 
        });

        client.send("inventoryUpdate", {
          type: "remove",
          itemId: data.itemId,
          quantity: 1,
          pocket: getItemPocket(data.itemId)
        });
        
      } catch (error) {
        console.error("❌ Erreur useItem:", error);
        client.send("itemUseResult", { 
          success: false, 
          message: "Erreur lors de l'utilisation" 
        });
      }
    });

    this.onMessage("pickupItem", async (client, data) => {
      try {
        const player = this.state.players.get(client.sessionId);
        if (!player) {
          client.send("inventoryError", { message: "Joueur non trouvé" });
          return;
        }

        const distance = Math.sqrt(
          Math.pow(player.x - data.x, 2) + Math.pow(player.y - data.y, 2)
        );
        
        if (distance > 2) {
          client.send("inventoryError", { message: "Objet trop éloigné" });
          return;
        }

        await InventoryManager.addItem(player.name, data.itemId, 1);
        
        client.send("inventoryUpdate", {
          type: "add",
          itemId: data.itemId,
          quantity: 1,
          pocket: getItemPocket(data.itemId)
        });

        client.send("itemPickup", {
          itemId: data.itemId,
          quantity: 1
        });

      } catch (error) {
        console.error("❌ Erreur pickupItem:", error);
        client.send("inventoryError", { 
          message: "Impossible de ramasser l'objet" 
        });
      }
    });

    this.onMessage("getTime", (client) => {
      if (this.timeWeatherService) {
        const time = this.timeWeatherService.getCurrentTime();
        
        const response = {
          gameHour: time.hour,
          isDayTime: time.isDayTime,
          displayTime: this.timeWeatherService.formatTime(),
          timestamp: Date.now()
        };
        
        client.send("currentTime", response);
        this.timeWeatherService.addClient(client);
      } else {
        client.send("currentTime", {
          gameHour: 12,
          isDayTime: true,
          displayTime: "12:00 PM",
          error: "Service temps non disponible"
        });
      }
    });

    this.onMessage("getWeather", (client) => {
      if (this.timeWeatherService) {
        const weather = this.timeWeatherService.getCurrentWeather();
        
        const response = {
          weather: weather.name,
          displayName: weather.displayName,
          timestamp: Date.now()
        };
        
        client.send("currentWeather", response);
        this.timeWeatherService.addClient(client);
      } else {
        client.send("currentWeather", {
          weather: "clear",
          displayName: "Ciel dégagé",
          error: "Service météo non disponible"
        });
      }
    });

    this.onMessage("checkTimeWeatherSync", (client) => {
      if (this.timeWeatherService) {
        const health = this.timeWeatherService.healthCheck();
        
        client.send("timeWeatherSyncStatus", {
          synchronized: health.healthy,
          issues: health.issues,
          currentTime: this.timeWeatherService.getCurrentTime(),
          currentWeather: this.timeWeatherService.getCurrentWeather(),
          serverTimestamp: Date.now()
        });
        
        if (!health.healthy) {
          setTimeout(() => {
            this.timeWeatherService!.sendCurrentStateToAllClients();
          }, 1000);
        }
      }
    });

    this.onMessage("testAddItem", async (client, data) => {
      try {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        await InventoryManager.addItem(player.name, data.itemId, data.quantity || 1);
        
        client.send("inventoryUpdate", {
          type: "add",
          itemId: data.itemId,
          quantity: data.quantity || 1,
          pocket: getItemPocket(data.itemId)
        });
        
      } catch (error) {
        console.error("❌ Erreur testAddItem:", error);
        client.send("inventoryError", { 
          message: `Erreur lors de l'ajout de ${data.itemId}` 
        });
      }
    });
  }

  private getPlayerNameBySession(sessionId: string): string | null {
    const player = this.state.players.get(sessionId);
    return player?.name || null;
  }

  private async handleStartQuest(client: Client, data: { questId: string }) {
    try {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("questStartResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      this.blockPlayerMovement(client.sessionId, 'dialog', 3000, { questId: data.questId });

      try {
        const questManager = this.zoneManager.getQuestManager();
        if (!questManager) {
          client.send("questStartResult", {
            success: false,
            message: "Système de quêtes non disponible"
          });
          return;
        }

        const quest = await questManager.startQuest(player.name, data.questId);
        
        if (quest) {
          const result = {
            success: true,
            quest: quest,
            message: `Quête "${quest.name}" démarrée !`
          };
          
          client.send("questStartResult", result);
          await this.updateQuestStatusesFixed(player.name);
          
          this.broadcastToZone(player.currentZone, "questUpdate", {
            player: player.name,
            action: "started",
            questId: data.questId
          });
          
        } else {
          client.send("questStartResult", {
            success: false,
            message: "Impossible de démarrer cette quête"
          });
        }

        this.unblockPlayerMovement(client.sessionId, 'dialog');
        
      } catch (error) {
        this.unblockPlayerMovement(client.sessionId, 'dialog');
        throw error;
      }
      
    } catch (error) {
      console.error("❌ [WorldRoom] Erreur handleStartQuest:", error);
      client.send("questStartResult", {
        success: false,
        message: "Erreur serveur lors du démarrage de la quête"
      });
    }
  }

  private async handleGetActiveQuests(client: Client) {
    try {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("activeQuestsList", { quests: [] });
        return;
      }

      const activeQuests = await this.zoneManager.getActiveQuests(player.name);
      
      client.send("activeQuestsList", {
        quests: activeQuests
      });
      
    } catch (error) {
      console.error("❌ Erreur handleGetActiveQuests:", error);
      client.send("activeQuestsList", { quests: [] });
    }
  }

  private async handleGetAvailableQuests(client: Client) {
    try {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("availableQuestsList", { quests: [] });
        return;
      }

      const availableQuests = await this.zoneManager.getAvailableQuests(player.name);
      
      client.send("availableQuestsList", {
        quests: availableQuests
      });
      
    } catch (error) {
      console.error("❌ Erreur handleGetAvailableQuests:", error);
      client.send("availableQuestsList", { quests: [] });
    }
  }

  private async handleQuestProgress(client: Client, data: any) {
    try {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        return;
      }

      const results = await this.zoneManager.updateQuestProgress(player.name, data);
      
      if (results && results.length > 0) {
        client.send("questProgressUpdate", results);
        await this.updateQuestStatusesFixed(player.name);
      }
      
    } catch (error) {
      console.error("❌ Erreur handleQuestProgress:", error);
    }
  }

  private async debugQuests(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    try {
      const activeQuests = await this.zoneManager.getActiveQuests(player.name);
      const availableQuests = await this.zoneManager.getAvailableQuests(player.name);
    } catch (error) {
      console.error(`🐛 [DEBUG] Erreur debug quêtes:`, error);
    }
  }

  private async handleShopTransaction(client: Client, data: {
    shopId: string;
    action: 'buy' | 'sell';
    itemId: string;
    quantity: number;
  }) {
    try {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("shopTransactionResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      this.blockPlayerMovement(client.sessionId, 'shop', 2000);

      try {
        if (data.action === 'buy') {
          const result = await this.shopManager.buyItem(
            player.name,
            data.shopId,
            data.itemId,
            data.quantity,
            player.gold,
            player.level
          );

          if (result.success) {
            if (result.newGold !== undefined) {
              player.gold = result.newGold;
              
              client.send("goldUpdate", {
                oldGold: player.gold + (result.newGold - player.gold),
                newGold: result.newGold
              });
            }

            if (result.itemsChanged && result.itemsChanged.length > 0) {
              const itemChange = result.itemsChanged[0];
              client.send("inventoryUpdate", {
                type: "add",
                itemId: itemChange.itemId,
                quantity: itemChange.quantityChanged,
                newQuantity: itemChange.newQuantity,
                pocket: getItemPocket(itemChange.itemId)
              });
            }
          }

          client.send("shopTransactionResult", result);

        } else if (data.action === 'sell') {
          const result = await this.shopManager.sellItem(
            player.name,
            data.shopId,
            data.itemId,
            data.quantity
          );

          if (result.success) {
            const newGold = player.gold + (result.newGold || 0);
            player.gold = newGold;
            
            client.send("goldUpdate", {
              oldGold: player.gold - (result.newGold || 0),
              newGold: newGold
            });

            if (result.itemsChanged && result.itemsChanged.length > 0) {
              const itemChange = result.itemsChanged[0];
              client.send("inventoryUpdate", {
                type: "remove",
                itemId: itemChange.itemId,
                quantity: Math.abs(itemChange.quantityChanged),
                newQuantity: itemChange.newQuantity,
                pocket: getItemPocket(itemChange.itemId)
              });
            }
          }

          client.send("shopTransactionResult", result);
        }

        this.unblockPlayerMovement(client.sessionId, 'shop');

      } catch (error) {
        this.unblockPlayerMovement(client.sessionId, 'shop');
        throw error;
      }

    } catch (error) {
      console.error("❌ Erreur transaction shop:", error);
      client.send("shopTransactionResult", {
        success: false,
        message: "Erreur serveur lors de la transaction"
      });
    }
  }

  private async handleGetShopCatalog(client: Client, shopId: string) {
    try {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("shopCatalogResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      const catalog = this.shopManager.getShopCatalog(shopId, player.level || 1);

      if (catalog) {
        const response = {
          success: true,
          shopId: shopId,
          catalog: {
            shopInfo: catalog.shopInfo,
            availableItems: catalog.availableItems
          },
          playerGold: player.gold || 1000
        };

        client.send("shopCatalogResult", response);
      } else {
        client.send("shopCatalogResult", {
          success: false,
          message: "Shop introuvable"
        });
      }

    } catch (error) {
      console.error(`❌ Erreur getShopCatalog:`, error);
      client.send("shopCatalogResult", {
        success: false,
        message: "Erreur lors de la récupération du catalogue"
      });
    }
  }

  private async handleRefreshShop(client: Client, shopId: string) {
    try {
      const wasRestocked = this.shopManager.restockShop(shopId);

      if (wasRestocked) {
        await this.handleGetShopCatalog(client, shopId);
        
        client.send("shopRefreshResult", {
          success: true,
          message: "Magasin restocké !",
          restocked: true
        });
      } else {
        client.send("shopRefreshResult", {
          success: true,
          message: "Pas de restock nécessaire",
          restocked: false
        });
      }

    } catch (error) {
      console.error(`❌ Erreur refreshShop:`, error);
      client.send("shopRefreshResult", {
        success: false,
        message: "Erreur lors du rafraîchissement"
      });
    }
  }
  
  private broadcastToZone(zoneName: string, message: string, data: any): void {
    const clientsInZone = this.clients.filter(client => {
      const player = this.state.players.get(client.sessionId);
      return player && player.currentZone === zoneName;
    });
    
    clientsInZone.forEach(client => {
      client.send(message, data);
    });
  }

  async onJoin(client: Client, options: any = {}) {
    let decodedToken: any = null;

    if (options.sessionToken) {
      try {
        const jwtLib = require('jsonwebtoken');
        decodedToken = jwtLib.verify(options.sessionToken, process.env.JWT_SECRET!) as any;

        try {
          await this.jwtManager.registerUser(client.sessionId, decodedToken);
        } catch (err) {
          const errorMessage =
            (err && typeof err === "object" && "message" in err)
              ? (err as any).message
              : "Erreur inconnue";
          client.send("login_error", { message: errorMessage });
          client.leave(4001, "Vous êtes déjà connecté sur un autre onglet ou appareil.");
          return;
        }

        if (decodedToken.username !== options.name) {
          client.leave(4000, "Token/username mismatch");
          return;
        }
        
        if (!decodedToken.permissions || !decodedToken.permissions.includes('play')) {
          client.leave(4000, "Insufficient permissions");
          return;
        }

      } catch (error) {
        console.error(`❌ [WorldRoom] Token JWT invalide:`, error);
        client.leave(4000, "Invalid session token");
        return;
      }
    } else {
      client.leave(4000, "Session token required");
      return;
    }

    try {
      const player = new Player();

      player.id = client.sessionId;
      player.name = options.name || `Player_${client.sessionId.substring(0, 6)}`;
      player.isDev = decodedToken?.isDev || false;

      await this.positionSaver.debugPlayerPosition(player.name);

      const savedData = await PlayerData.findOne({ username: player.name });

      if (
        savedData &&
        typeof savedData.lastX === 'number' &&
        typeof savedData.lastY === 'number' &&
        savedData.lastMap
      ) {
        player.x = Math.round(savedData.lastX);
        player.y = Math.round(savedData.lastY);
        player.currentZone = savedData.lastMap;

        if (savedData.username) {
          player.name = savedData.username;
        }

      } else {
        player.x = 360;
        player.y = 120;
        player.currentZone = "beach";
      }

      player.characterId = options.characterId || "brendan";

      if (this.timeWeatherService) {
        this.timeWeatherService.addClient(client, player.currentZone);
      }

      player.level = options.level || 1;
      player.gold = options.gold || 1000;
      player.experience = options.experience || 0;
      player.title = options.title || "Dresseur Débutant";

      this.state.players.set(client.sessionId, player);

      client.send("playerSpawned", {
        id: client.sessionId,
        name: player.name,
        x: player.x,
        y: player.y,
        currentZone: player.currentZone,
        characterId: player.characterId,
        level: player.level,
        gold: player.gold,
        isDev: player.isDev,
        isMyPlayer: true,
        totalPlayersInRoom: this.state.players.size
      });

      if (this.state.players.size === 1) {
        this.overworldPokemonManager.start();
      }

      this.clock.setTimeout(() => {
        this.overworldPokemonManager.syncPokemonForClient(client);
      }, 2000);

      this.clock.setTimeout(() => {
        const playerInState = this.state.players.get(client.sessionId);
        if (playerInState) {
          const filteredState = this.getFilteredStateForClient(client);
          client.send("forcedStateSync", {
            players: filteredState.players,
            mySessionId: client.sessionId,
            timestamp: Date.now()
          });
        }
      }, 200);

      try {
        await InventoryManager.addItem(player.name, "poke_ball", 5);
        await InventoryManager.addItem(player.name, "potion", 3);
        const hasMap = await InventoryManager.getItemCount(player.name, "town_map");
        if (hasMap === 0) {
          await InventoryManager.addItem(player.name, "town_map", 1);
        }
        const grouped = await InventoryManager.getAllItemsGroupedByPocket(player.name);
      } catch (err) {
        console.error(`❌ [INVENTAIRE] Erreur lors de l'ajout d'objets de départ pour ${player.name}:`, err);
      }

      await this.zoneManager.onPlayerJoinZone(client, player.currentZone);
      await this.onPlayerJoinZone(client, player.currentZone);
      this.scheduleFilteredStateUpdate();

      this.clock.setTimeout(async () => {
        await this.updateQuestStatusesFixed(player.name, client);
      }, 2000);

      this.clock.setTimeout(async () => {
        await this.followerHandlers.onTeamChanged(client.sessionId);
      }, 4000);

    } catch (error) {
      console.error(`❌ Erreur lors du join:`, error);
      client.leave(1000, "Erreur lors de la connexion");
    }
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      const userId = this.jwtManager.getUserId(client.sessionId);
      const hasActiveBattle = userId ? this.jwtManager.hasActiveBattle(userId) : false;
      
      const position = this.positionSaver.extractPosition(player);
      await this.positionSaver.savePosition(position, "disconnect");
      
      this.followerHandlers.getFollowerManager().removePlayerFollower(client.sessionId);
      this.state.players.delete(client.sessionId);
    }
    
    this.jwtManager.removeUser(client.sessionId);
    
    if (this.timeWeatherService) {
      this.timeWeatherService.removeClient(client);
    }
    
    if (this.state.players.size === 0) {
      this.overworldPokemonManager.stop();
    }
    
    movementBlockManager.forceUnblockAll(client.sessionId);
    await this.battleHandlers.onPlayerLeave(client.sessionId);
    
    if (player && this.teamManagers.has(player.name)) {
      this.teamManagers.delete(player.name);
    }
  }

  onDispose() {
    if (this.overworldPokemonManager) {
      this.overworldPokemonManager.stop();
    }
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    
    this.state.players.forEach((player, sessionId) => {
      movementBlockManager.forceUnblockAll(sessionId);
    });

    if (this.timeWeatherService) {
      this.timeWeatherService.destroy();
      this.timeWeatherService = null;
    }

    this.teamManagers.clear();

    if (this.starterHandlers) {
      this.starterHandlers.cleanup();
    }
      
    if (this.pokedexHandler) {
      this.pokedexHandler.cleanup(); 
    }

    if (this.followerHandlers) {
      this.followerHandlers.cleanup();
    }

    if (this.encounterHandlers) {
      this.encounterHandlers.cleanup();
    }

    if (this.battleHandlers) {
      this.battleHandlers.cleanup();
    }

    if (this.objectInteractionHandlers) {
      this.objectInteractionHandlers.cleanup().catch((error) => {
        console.error(`❌ Erreur nettoyage ObjectInteractionHandlers:`, error);
      });
    }
  }

  private handlePlayerMove(client: Client, data: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const validation = movementBlockManager.validateMovement(client.sessionId, data);
    if (!validation.allowed) {
      client.send("forcePlayerPosition", {
        x: player.x,
        y: player.y,
        direction: player.direction,
        currentZone: player.currentZone,
        blocked: true,
        reason: validation.reason,
        message: validation.message
      });
      return;
    }

    const collisionManager = this.zoneManager.getCollisionManager(player.currentZone);
    if (collisionManager && collisionManager.isBlocked(data.x, data.y)) {
      client.send("forcePlayerPosition", {
        x: player.x,
        y: player.y,
        direction: player.direction,
        currentZone: player.currentZone,
        blocked: false,
        collision: true
      });
      return;
    }

    player.x = data.x;
    player.y = data.y;
    player.direction = data.direction;
    player.isMoving = data.isMoving;

    this.followerHandlers.onPlayerMove(
      client.sessionId, 
      data.x, 
      data.y, 
      data.direction, 
      data.isMoving
    );

    if (data.currentZone && data.currentZone !== player.currentZone) {
      if (this.timeWeatherService) {
        this.timeWeatherService.updateClientZone(client, data.currentZone);
      }
    }

    if (data.currentZone) {
      player.currentZone = data.currentZone;
    }
  }

  public getEncounterConditions(): { timeOfDay: 'day' | 'night', weather: 'clear' | 'rain' } {
    return this.timeWeatherService?.getEncounterConditions() || { timeOfDay: 'day', weather: 'clear' };
  }

  public getCurrentTimeInfo(): { hour: number; isDayTime: boolean; weather: string } {
    const time = this.timeWeatherService?.getCurrentTime() || { hour: 12, isDayTime: true };
    const weather = this.timeWeatherService?.getCurrentWeather()?.name || "clear";
    
    return {
      hour: time.hour,
      isDayTime: time.isDayTime,
      weather: weather
    };
  }

  private async applyItemEffect(player: any, itemId: string, context: string): Promise<{ message?: string }> {
    const itemData = getItemData(itemId);
    
    switch (itemData.type) {
      case 'medicine':
        return await this.applyMedicineEffect(player, itemData);
        
      case 'item':
        return await this.applyUtilityItemEffect(player, itemData, itemId);
        
      case 'ball':
        return { message: `${itemId} utilisé (effet Poké Ball non implémenté)` };
        
      default:
        return { message: `${itemId} utilisé (effet générique)` };
    }
  }

  private async applyMedicineEffect(player: any, itemData: any): Promise<{ message?: string }> {
    if (itemData.heal_amount) {
      const healAmount = itemData.heal_amount === 'full' ? 'tous les' : itemData.heal_amount;
      return { message: `Pokémon soigné de ${healAmount} PV !` };
    }
    
    if (itemData.status_cure) {
      const curedStatus = Array.isArray(itemData.status_cure) ? itemData.status_cure.join(', ') : itemData.status_cure;
      return { message: `Statut ${curedStatus} guéri !` };
    }
    
    return { message: "Pokémon soigné !" };
  }

  private async applyUtilityItemEffect(player: any, itemData: any, itemId: string): Promise<{ message?: string }> {
    switch (itemId) {
      case 'escape_rope':
        return { message: "Vous êtes retourné au dernier Centre Pokémon !" };
        
      case 'repel':
      case 'super_repel':
      case 'max_repel':
        const steps = itemData.effect_steps || 100;
        return { message: `Repousse activé pour ${steps} pas !` };
        
      default:
        return { message: `${itemId} utilisé !` };
    }
  }

  async giveItemToPlayer(playerName: string, itemId: string, quantity: number = 1): Promise<boolean> {
    try {
      await InventoryManager.addItem(playerName, itemId, quantity);
      
      for (const [sessionId, player] of this.state.players.entries()) {
        if (player.name === playerName) {
          const client = this.clients.find(c => c.sessionId === sessionId);
          if (client) {
            client.send("inventoryUpdate", {
              type: "add",
              itemId: itemId,
              quantity: quantity,
              pocket: getItemPocket(itemId)
            });
          }
          break;
        }
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Erreur lors du don d'objet:`, error);
      return false;
    }
  }

  async takeItemFromPlayer(playerName: string, itemId: string, quantity: number = 1): Promise<boolean> {
    try {
      const success = await InventoryManager.removeItem(playerName, itemId, quantity);
      
      if (success) {
        for (const [sessionId, player] of this.state.players.entries()) {
          if (player.name === playerName) {
            const client = this.clients.find(c => c.sessionId === sessionId);
            if (client) {
              client.send("inventoryUpdate", {
                type: "remove",
                itemId: itemId,
                quantity: quantity,
                pocket: getItemPocket(itemId)
              });
            }
            break;
          }
        }
      }
      
      return success;
    } catch (error) {
      console.error(`❌ Erreur lors du retrait d'objet:`, error);
      return false;
    }
  }

  async playerHasItem(playerName: string, itemId: string, quantity: number = 1): Promise<boolean> {
    try {
      const count = await InventoryManager.getItemCount(playerName, itemId);
      return count >= quantity;
    } catch (error) {
      console.error(`❌ Erreur lors de la vérification d'objet:`, error);
      return false;
    }
  }

  async updatePlayerGold(playerName: string, newGold: number): Promise<boolean> {
    try {
      for (const [sessionId, player] of this.state.players.entries()) {
        if (player.name === playerName) {
          player.gold = Math.max(0, newGold);
          
          const client = this.clients.find(c => c.sessionId === sessionId);
          if (client) {
            client.send("goldUpdate", {
              newGold: player.gold
            });
          }
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Erreur updatePlayerGold:`, error);
      return false;
    }
  }

  async getPlayerGold(playerName: string): Promise<number> {
    try {
      for (const [sessionId, player] of this.state.players.entries()) {
        if (player.name === playerName) {
          return player.gold || 0;
        }
      }
      return 0;
    } catch (error) {
      console.error(`❌ Erreur getPlayerGold:`, error);
      return 0;
    }
  }

  async getPlayerLevel(playerName: string): Promise<number> {
    try {
      for (const [sessionId, player] of this.state.players.entries()) {
        if (player.name === playerName) {
          return player.level || 1;
        }
      }
      return 1;
    } catch (error) {
      console.error(`❌ Erreur getPlayerLevel:`, error);
      return 1;
    }
  }
  
  private getFilteredStateForClient(client: Client): any {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return null;
    }

    const playerZone = player.currentZone;
    const filteredPlayersObject: { [key: string]: any } = {};
    
    this.state.players.forEach((otherPlayer, sessionId) => {
      if (sessionId === client.sessionId) {
        filteredPlayersObject[sessionId] = {
          id: otherPlayer.id,
          name: otherPlayer.name,
          x: otherPlayer.x,
          y: otherPlayer.y,
          currentZone: otherPlayer.currentZone,
          direction: otherPlayer.direction,
          isMoving: otherPlayer.isMoving,
          level: otherPlayer.level,
          gold: otherPlayer.gold,
          characterId: otherPlayer.characterId
        };
        return;
      }
      
      if (otherPlayer.currentZone === playerZone) {
        filteredPlayersObject[sessionId] = {
          id: otherPlayer.id,
          name: otherPlayer.name,
          x: otherPlayer.x,
          y: otherPlayer.y,
          currentZone: otherPlayer.currentZone,
          direction: otherPlayer.direction,
          isMoving: otherPlayer.isMoving,
          level: otherPlayer.level,
          characterId: otherPlayer.characterId
        };
      }
    });
    
    return {
      players: filteredPlayersObject
    };
  }

  private sendFilteredState() {
    const now = Date.now();
    
    if (now - this.lastStateUpdate < this.stateUpdateInterval) {
      return;
    }
    
    this.lastStateUpdate = now;
    
    this.clients.forEach(client => {
      const filteredState = this.getFilteredStateForClient(client);
      if (filteredState) {
        client.send("filteredState", filteredState);
      }
    });
  }

  public getCurrentTimeWeatherInfo(): { 
    time: { hour: number; isDayTime: boolean; displayTime: string },
    weather: { name: string; displayName: string },
    synchronized: boolean
  } {
    if (!this.timeWeatherService) {
      return {
        time: { hour: 12, isDayTime: true, displayTime: "12:00 PM" },
        weather: { name: "clear", displayName: "Ciel dégagé" },
        synchronized: false
      };
    }

    const time = this.timeWeatherService.getCurrentTime();
    const weather = this.timeWeatherService.getCurrentWeather();
    const health = this.timeWeatherService.healthCheck();

    return {
      time: {
        hour: time.hour,
        isDayTime: time.isDayTime,
        displayTime: this.timeWeatherService.formatTime()
      },
      weather: {
        name: weather.name,
        displayName: weather.displayName
      },
      synchronized: health.healthy
    };
  }

  public debugTimeWeatherSystem(): void {
    if (this.timeWeatherService) {
      this.timeWeatherService.debugSyncStatus();
      
      const health = this.timeWeatherService.healthCheck();
      if (!health.healthy) {
        console.log(`❌ Problèmes détectés:`, health.issues);
      }
    }
  }

  private scheduleFilteredStateUpdate() {
    this.clock.setTimeout(() => {
      this.sendFilteredState();
    }, 50);
  }

  public blockPlayerMovement(
    playerId: string, 
    reason: BlockReason, 
    duration?: number,
    metadata?: any
  ): boolean {
    return movementBlockManager.blockMovement(playerId, reason, duration, metadata);
  }

  public unblockPlayerMovement(playerId: string, reason?: BlockReason): boolean {
    return movementBlockManager.unblockMovement(playerId, reason);
  }

  public isPlayerMovementBlocked(playerId: string): boolean {
    return movementBlockManager.isMovementBlocked(playerId);
  }
  
  getZoneManager(): ZoneManager {
    return this.zoneManager;
  }

  getShopManager() {
    return this.shopManager;
  }

  getQuestManager() {
    return this.zoneManager.getQuestManager();
  }

  getObjectInteractionHandlers(): ObjectInteractionHandlers {
    return this.objectInteractionHandlers;
  }
  
  getObjectInteractionModule(): ObjectInteractionModule {
    return this.objectInteractionModule;
  }

  getInteractionManager() {
    return this.zoneManager.getInteractionManager();
  }

  getTeamHandlers(): TeamHandlers {
    return this.teamHandlers;
  }
  
  async getTeamManager(playerName: string): Promise<TeamManager> {
    if (!this.teamManagers.has(playerName)) {
      const teamManager = new TeamManager(playerName);
      await teamManager.load();
      this.teamManagers.set(playerName, teamManager);
    }
    return this.teamManagers.get(playerName)!;
  }
  
  getFollowerHandlers(): FollowerHandlers {
    return this.followerHandlers;
  }

  getEncounterHandlers(): EncounterHandlers {
    return this.encounterHandlers;
  }

  getBattleHandlers(): BattleHandlers {
    return this.battleHandlers;
  }

  getMovementHandlers(): MovementHandlers {
    return this.movementHandlers;
  }
  
  public getEncounterManager() {
    return this.encounterHandlers.getEncounterManager();
  }

  public async testEncounter(
    playerId: string, 
    zone: string, 
    zoneId?: string, 
    method: 'grass' | 'fishing' = 'grass'
  ): Promise<any> {
    return await this.encounterHandlers.testEncounter(playerId, zone, zoneId, method);
  }

  public getOverworldPokemonManager(): OverworldPokemonManager {
    return this.overworldPokemonManager;
  }

  public debugOverworldPokemon(): void {
    if (this.overworldPokemonManager) {
      this.overworldPokemonManager.debug();
    }
  }

  public getOverworldPokemonStats(): any {
    return this.overworldPokemonManager ? this.overworldPokemonManager.getStats() : {};
  }

  public getPokedexHandler(): PokedexMessageHandler {
    return this.pokedexHandler;
  }

  public clearOverworldArea(areaId: string): void {
    if (this.overworldPokemonManager) {
      this.overworldPokemonManager.clearArea(areaId);
    }
  }

  public async resyncClient(client: Client): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    await this.zoneSyncService.resyncClient(client, player, player.currentZone);
  }

  public async updateNpcForZone(zoneName: string, npcId: number, npcData: any): Promise<void> {
    await this.zoneSyncService.updateNpcForZone(
      zoneName, 
      npcId, 
      npcData, 
      (message, data) => this.broadcastToZone(zoneName, message, data)
    );
  }

  public async updateObjectForZone(zoneName: string, objectId: string, objectData: any): Promise<void> {
    await this.zoneSyncService.updateObjectForZone(
      zoneName, 
      objectId, 
      objectData, 
      (message, data) => this.broadcastToZone(zoneName, message, data)
    );
  }

  public async resyncPlayerQuests(client: Client): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    await this.zoneSyncService.syncQuestsOnly(client, player.name);
  }

  public getZoneSyncService(): ZoneSyncService {
    return this.zoneSyncService;
  }
}
