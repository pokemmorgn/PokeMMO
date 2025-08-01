// server/src/rooms/WorldRoom.ts - VERSION COMPLÈTE AVEC MovementBlockManager
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
// Après tes imports existants, ajoute :
import { ObjectInteractionHandlers } from "../handlers/ObjectInteractionHandlers";
import { ObjectInteractionModule } from "../interactions/modules/ObjectInteractionModule";
import { SpectatorManager } from "../battle/modules/broadcast/SpectatorManager";
// ✅ NOUVEAU : Imports pour le système shops intégré
import { NpcInteractionModule } from "../interactions/modules/NpcInteractionModule";
import { InteractionManager } from "../managers/InteractionManager";
import { 
  InteractionRequest, 
  InteractionContext,
  InteractionResult 
} from "../interactions/types/BaseInteractionTypes";
// Interfaces pour typer les réponses des quêtes
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
  
  // Limite pour auto-scaling
  maxClients = 50;
  private lastStateUpdate = 0;
  private stateUpdateInterval = 100;

  onCreate(options: any) {
    console.log(`🌍 === WORLDROOM CRÉATION ===`);
    console.log(`📊 Options:`, options);

    // Initialiser le state
    this.setState(new PokeWorldState());
    console.log(`✅ State initialisé`);
    // ✅ NOUVEAU: Initialiser l'OverworldPokemonManager
    this.overworldPokemonManager = new OverworldPokemonManager(this);
    console.log(`✅ OverworldPokemonManager initialisé`);
    
    // ✅ NOUVEAU: Configurer le MovementBlockManager
    movementBlockManager.setRoomReference(this);
    console.log(`✅ MovementBlockManager configuré`);

    // ✅ NOUVEAU: Timer de nettoyage des blocages expirés (toutes les 30s)
    setInterval(() => {
      movementBlockManager.cleanup();
    }, 30000);

      // ✅ NOUVEAU: Initialiser les StarterHandlers
      this.starterHandlers = new StarterHandlers(this);
      console.log(`✅ StarterHandlers initialisé`);
    
    // Initialiser le ZoneManager
    this.zoneManager = new ZoneManager(this);
    console.log(`✅ ZoneManager initialisé`);

   // ✅ Enregistrer dans ServiceRegistry
    const ServiceRegistry = require('../services/ServiceRegistry').ServiceRegistry;
    const registry = ServiceRegistry.getInstance();

    this.pokedexHandler = new PokedexMessageHandler(this);
    console.log(`✅ PokedexMessageHandler initialisé`);
    
    // Enregistrer WorldRoom
    registry.registerWorldRoom(this);
    
    // Enregistrer QuestManager
    const questManager = this.zoneManager.getQuestManager();
    if (questManager) {
      registry.registerQuestManager(questManager);
      console.log(`✅ Services enregistrés dans ServiceRegistry`);
    }
    
      
      // ✅ ÉTAPE 1: Initialiser NPCManagers en ARRIÈRE-PLAN (non-bloquant)
      console.log(`🔄 [WorldRoom] Lancement NPCManager en arrière-plan...`);
      this.initializeNpcManagers()
        .then(() => {
          console.log(`✅ [WorldRoom] NPCs chargés en arrière-plan !`);
          
          // ✅ BROADCAST AUTOMATIQUE : Envoyer les NPCs à tous les clients déjà connectés
          console.log(`📡 [WorldRoom] Notification des ${this.clients.length} clients connectés...`);
          this.clients.forEach(client => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
              console.log(`📤 [WorldRoom] Envoi NPCs à ${player.name} dans ${player.currentZone}`);
              this.onPlayerJoinZone(client, player.currentZone);
            }
          });
          
          console.log(`🎉 [WorldRoom] Tous les clients notifiés des NPCs !`);
        })
        .catch(error => {
          console.error(`❌ [WorldRoom] Erreur chargement NPCs en arrière-plan:`, error);
          
          // ✅ MÊME EN CAS D'ERREUR : Notifier que le système est prêt (sans NPCs)
          console.log(`⚠️ [WorldRoom] Notification clients : système prêt sans NPCs`);
        });
      
      // ✅ CONTINUER IMMÉDIATEMENT : TransitionService et reste du code
      this.transitionService = new TransitionService();
      console.log(`✅ TransitionService initialisé`);

    // ✅ ÉTAPE 2: Initialiser TeamHandlers
    this.teamHandlers = new TeamHandlers(this);
    console.log(`✅ TeamHandlers initialisé`);

    // ✅ ÉTAPE 3: Initialiser FollowerHandlers et l'enregistrer immédiatement
    this.followerHandlers = new FollowerHandlers(this);
    this.transitionService.setFollowerHandlers(this.followerHandlers);
    console.log(`✅ FollowerHandlers initialisé et enregistré dans TransitionService`);
    
    // ✅ ÉTAPE 4: Initialiser les autres handlers
    this.questHandlers = new QuestHandlers(this);
    console.log(`✅ QuestHandlers initialisé`);
    
    this.battleHandlers = new BattleHandlers(this);
    console.log(`✅ BattleHandlers initialisé`);
    
    this.encounterHandlers = new EncounterHandlers(this);
    console.log(`✅ EncounterHandlers initialisé`);

    // ✅ ÉTAPE 5: Initialiser TimeWeatherService
    this.initializeTimeWeatherService();

    // ✅ ÉTAPE 6: Initialiser les handlers de mouvement et objets
    this.movementHandlers = new MovementHandlers(this);
    console.log(`✅ MovementHandlers initialisé`);

    this.objectInteractionHandlers = new ObjectInteractionHandlers(this);
    console.log(`✅ ObjectInteractionHandlers initialisé`);
    
    // ✅ ÉTAPE 7: Créer et configurer ObjectInteractionModule  
    this.objectInteractionModule = new ObjectInteractionModule();
    this.objectInteractionHandlers.setObjectModule(this.objectInteractionModule);
    console.log(`✅ ObjectInteractionModule créé et configuré`);
    
    // Initialiser le module d'objets (en arrière-plan)
    this.objectInteractionModule.initialize().then(() => {
      console.log(`✅ ObjectInteractionModule initialisé`);
    }).catch((error) => {
      console.error(`❌ Erreur initialisation ObjectInteractionModule:`, error);
    });
    
    // ✅ ÉTAPE 8: Configurer les message handlers
    this.setupMessageHandlers();
    console.log(`✅ Message handlers configurés`);
    
    // Initialiser InteractionManager
// ✅ ÉTAPE 8.5: Initialiser ShopManager D'ABORD
    this.shopManager = new ShopManager();
    console.log(`✅ ShopManager initialisé`);
    
    // ✅ ÉTAPE 8.6: Maintenant InteractionManager (avec ShopManager prêt)
    this.interactionManager = new InteractionManager(
      (zoneName: string) => this.getNpcManager(zoneName),
      this.zoneManager.getQuestManager(),
      this.shopManager,
      this.starterHandlers,
      this.spectatorManager
    );
    console.log(`✅ InteractionManager initialisé`);
    
    // ✅ ÉTAPE 8.7: NpcInteractionModule (avec ShopManager prêt)
    this.npcInteractionModule = new NpcInteractionModule(
      (zoneName: string) => this.getNpcManager(zoneName),
      this.zoneManager.getQuestManager(),
      this.shopManager,
      this.starterHandlers,
      this.spectatorManager
    );
    console.log(`✅ NpcInteractionModule initialisé`);
    
    // ✅ ÉTAPE 10: Auto-save des positions
    this.autoSaveTimer = setInterval(() => {
      this.autoSaveAllPositions();
    }, 30000);
    console.log(`💾 Auto-save des positions activé (30s)`);
  }

  private async autoSaveAllPositions() {
    const positions = Array.from(this.state.players.values())
      .map(player => this.positionSaver.extractPosition(player));
    
    if (positions.length > 0) {
      await this.positionSaver.saveMultiplePositions(positions);
    }
  }

  private initializeTimeWeatherService() {
    console.log(`🌍 [WorldRoom] Initialisation TimeWeatherService...`);
    
    this.timeWeatherService = new TimeWeatherService(this.state, this.clock);
    
    // Callbacks pour broadcaster les changements
    this.timeWeatherService.setTimeChangeCallback((hour, isDayTime) => {
      console.log(`📡 [WorldRoom] Broadcast temps: ${hour}h ${isDayTime ? 'JOUR' : 'NUIT'} → ${this.clients.length} clients`);
      
      const timeData = {
        gameHour: hour,
        isDayTime: isDayTime,
        displayTime: this.timeWeatherService.formatTime(),
        timestamp: Date.now()
      };
      
      this.broadcast("timeUpdate", timeData);
    });
    
    this.timeWeatherService.setWeatherChangeCallback((weather) => {
      console.log(`📡 [WorldRoom] Broadcast météo: ${weather.displayName} → ${this.clients.length} clients`);
      
      const weatherData = {
        weather: weather.name,
        displayName: weather.displayName,
        timestamp: Date.now()
      };
      
      this.broadcast("weatherUpdate", weatherData);
    });

    // Commandes admin pour tester
    this.setupTimeWeatherCommands();
    
    console.log(`✅ [WorldRoom] TimeWeatherService initialisé avec callbacks`);
  }

  private setupTimeWeatherCommands() {
    // Forcer l'heure (pour les tests)
    this.onMessage("setTime", (client, data: { hour: number, minute?: number }) => {
      console.log(`🕐 [ADMIN] ${client.sessionId} force l'heure: ${data.hour}:${data.minute || 0}`);
      
      if (this.timeWeatherService) {
        this.timeWeatherService.forceTime(data.hour, data.minute || 0);
      }
    });

    this.onMessage("setWeather", (client, data: { weather: string }) => {
      console.log(`🌦️ [ADMIN] ${client.sessionId} force la météo: ${data.weather}`);
      
      if (this.timeWeatherService) {
        this.timeWeatherService.forceWeather(data.weather);
      }
    });

    this.onMessage("debugTimeWeather", (client) => {
      console.log(`🔍 [ADMIN] ${client.sessionId} demande debug temps/météo`);
      
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

    // Forcer la synchronisation de tous les clients
    this.onMessage("forceSyncTimeWeather", (client) => {
      console.log(`🔄 [ADMIN] ${client.sessionId} force sync de tous les clients`);
      
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
  console.log(`📂 [WorldRoom] === DÉBUT INITIALISATION NPC MANAGERS (DEBUG COMPLET) ===`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`🏠 Room ID: ${this.roomId}`);
  console.log(`👥 Clients connectés: ${this.clients.length}`);
  
  try {
    // ✅ ÉTAPE 1: Vérification de l'environnement
    console.log(`🔍 [ÉTAPE 1] Vérification environnement...`);
    
    const mongoose = require('mongoose');
    console.log(`🔗 État connexion MongoDB: ${mongoose.connection.readyState}`);
    console.log(`🔗 Détail: ${mongoose.connection.readyState === 1 ? 'CONNECTÉ' : 'NON CONNECTÉ'}`);
    
    if (mongoose.connection.readyState !== 1) {
      console.error(`❌ [CRITIQUE] MongoDB non connecté ! ReadyState: ${mongoose.connection.readyState}`);
      console.error(`📊 États possibles: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting`);
    }
    
    // ✅ ÉTAPE 2: Test de la base de données
    console.log(`🔍 [ÉTAPE 2] Test base de données...`);
    
    try {
      const { NpcData } = await import('../models/NpcData');
      console.log(`✅ Import NpcData réussi`);
      
      const totalCount = await NpcData.countDocuments();
      console.log(`📊 Total documents NPCs en base: ${totalCount}`);
      
      if (totalCount === 0) {
        console.error(`❌ [CRITIQUE] Aucun NPC trouvé en base de données !`);
      }
      
      const zones = await NpcData.distinct('zone');
      console.log(`🗺️ Zones disponibles (${zones.length}):`, zones);
      
      // Test sur une zone spécifique
      if (zones.length > 0) {
        const testZone = zones[0];
        const testNpcs = await NpcData.find({ zone: testZone }).limit(3);
        console.log(`🧪 Test ${testZone}: ${testNpcs.length} NPCs trouvés`);
        console.log(`🧪 Exemple NPCs:`, testNpcs.map(npc => ({
          id: npc.npcId,
          name: npc.name,
          zone: npc.zone,
          sprite: npc.sprite
        })));
      }
      
    } catch (dbError) {
      console.error(`❌ [CRITIQUE] Erreur test base de données:`, dbError);
      const errorMsg = dbError instanceof Error ? dbError.message : String(dbError);
      throw new Error(`Database test failed: ${errorMsg}`);
    }
    
    // ✅ ÉTAPE 3: Création du NPCManager
    console.log(`🔍 [ÉTAPE 3] Création NPCManager global...`);
    console.log(`⏰ Début création: ${new Date().toISOString()}`);
    
    const globalNpcManager = new NpcManager();
    console.log(`✅ NpcManager instance créée`);
    console.log(`📊 Config manager:`, {
      useCache: globalNpcManager['config']?.useCache,
      debugMode: globalNpcManager['config']?.debugMode,
      hotReloadEnabled: globalNpcManager['config']?.hotReloadEnabled
    });
    
    // ✅ ÉTAPE 4: Initialisation avec timeout personnalisé
    console.log(`🔍 [ÉTAPE 4] Lancement initialisation asynchrone...`);
    console.log(`⏰ Début init: ${new Date().toISOString()}`);
    
    const initPromise = globalNpcManager.initialize();
    const initTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout initialisation NPC Manager (10s)')), 10000);
    });
    
    try {
      await Promise.race([initPromise, initTimeout]);
      console.log(`✅ Initialize() terminé avec succès`);
      console.log(`⏰ Fin init: ${new Date().toISOString()}`);
    } catch (initError) {
      console.error(`❌ [CRITIQUE] Erreur lors de initialize():`, initError);
      throw initError;
    }
    
    // ✅ ÉTAPE 5: Attente du chargement complet
    console.log(`🔍 [ÉTAPE 5] Attente chargement complet (timeout 20s)...`);
    console.log(`⏰ Début waitForLoad: ${new Date().toISOString()}`);
    
    const loaded = await globalNpcManager.waitForLoad(20000); // 20s timeout
    console.log(`📊 Résultat waitForLoad: ${loaded}`);
    console.log(`⏰ Fin waitForLoad: ${new Date().toISOString()}`);

    if (!loaded) {
      console.error(`❌ [CRITIQUE] TIMEOUT lors du chargement des NPCs après 20s !`);
      
      // ✅ DIAGNOSTIC COMPLET EN CAS D'ÉCHEC
      console.log(`🔍 [DIAGNOSTIC] Analyse de l'état du manager...`);
      
      const stats = globalNpcManager.getSystemStats();
      console.log(`📊 [DIAGNOSTIC] Stats complètes:`, JSON.stringify(stats, null, 2));
      
      console.log(`📊 [DIAGNOSTIC] État détaillé:`, {
        initialized: stats.initialized,
        initializing: stats.initializing,
        totalNpcs: stats.totalNpcs,
        sources: stats.sources,
        zones: stats.zones,
        lastLoadTime: stats.lastLoadTime ? new Date(stats.lastLoadTime).toISOString() : 'jamais'
      });
      
      // ✅ Continuer quand même mais avec un manager vide
      console.warn(`⚠️ [FALLBACK] Utilisation du manager avec ${stats.totalNpcs} NPCs chargés`);
    }
    
    // ✅ ÉTAPE 6: Validation du contenu chargé
    console.log(`🔍 [ÉTAPE 6] Validation du contenu chargé...`);
    
    const allNpcs = globalNpcManager.getAllNpcs();
    console.log(`📊 NPCs chargés en mémoire: ${allNpcs.length}`);
    
    if (allNpcs.length > 0) {
      // Grouper par zone pour debug
      const npcsByZone: { [key: string]: any[] } = {};
      allNpcs.forEach(npc => {
        if (!npcsByZone[npc.zone]) npcsByZone[npc.zone] = [];
        npcsByZone[npc.zone].push(npc);
      });
      
      console.log(`🗺️ NPCs par zone:`, Object.keys(npcsByZone).map(zone => ({
        zone: zone,
        count: npcsByZone[zone].length,
        examples: npcsByZone[zone].slice(0, 2).map((npc: any) => ({ id: npc.id, name: npc.name }))
      })));
    } else {
      console.error(`❌ [CRITIQUE] Aucun NPC chargé en mémoire !`);
    }
    
    // ✅ ÉTAPE 7: Stockage du manager validé
    console.log(`🔍 [ÉTAPE 7] Stockage du manager...`);
    this.npcManagers.set('global', globalNpcManager);
    console.log(`✅ Manager stocké sous clé 'global'`);
    console.log(`📊 Total managers: ${this.npcManagers.size}`);
    
    // ✅ ÉTAPE 8: Configuration Hot Reload
    console.log(`🔍 [ÉTAPE 8] Configuration Hot Reload...`);
    
    const hotReloadStatus = globalNpcManager.getHotReloadStatus();
    console.log(`🔥 Hot Reload Status:`, hotReloadStatus);
    
    if (hotReloadStatus && hotReloadStatus.active) {
      console.log(`📡 [BROADCAST] Configuration du Hot Reload broadcast...`);
      
      globalNpcManager.onNpcChange((event, npcData) => {
        console.log(`🔥 [HOT RELOAD] Changement détecté: ${event}`, npcData ? {
          id: npcData.id,
          name: npcData.name,
          zone: this.extractZoneFromNpc(npcData)
        } : 'Pas de données');
        
        // Broadcast aux clients
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
        
        console.log(`📡 [HOT RELOAD] Broadcasté à ${this.clients.length} clients`);
      });
      
      console.log(`✅ Hot Reload broadcast configuré !`);
    } else {
      console.log(`⚠️ Hot Reload non actif - pas de broadcast configuré`);
    }
    
    // ✅ ÉTAPE 9: Test final et debug système
    console.log(`🔍 [ÉTAPE 9] Test final et validation...`);
    
    // Debug système complet
    globalNpcManager.debugSystem();
    
    const finalStats = globalNpcManager.getSystemStats();
    console.log(`📊 [FINAL] Statistiques finales:`, {
      success: true,
      totalNpcs: finalStats.totalNpcs,
      initialized: finalStats.initialized,
      sources: finalStats.sources,
      zones: finalStats.zones.loaded,
      zoneCount: finalStats.zones.count,
      hotReload: finalStats.hotReload,
      duration: Date.now() - (finalStats.lastLoadTime || Date.now())
    });
    
    // ✅ ÉTAPE 10: Notification de fin
    console.log(`🎉 [SUCCESS] === INITIALISATION NPC MANAGERS TERMINÉE AVEC SUCCÈS ===`);
    console.log(`📊 Résumé: ${finalStats.totalNpcs} NPCs chargés depuis MongoDB`);
    console.log(`🗺️ Zones: ${finalStats.zones.loaded.join(', ')}`);
    console.log(`⏰ Fin complète: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error(`❌ [CRITICAL ERROR] === ERREUR CRITIQUE INITIALISATION NPC MANAGERS ===`);
    console.error(`⏰ Timestamp erreur: ${new Date().toISOString()}`);
    console.error(`📝 Message:`, error instanceof Error ? error.message : String(error));
    console.error(`📚 Stack:`, error instanceof Error ? error.stack : 'N/A');
    
    // ✅ FALLBACK: Créer un manager vide pour éviter les crashes
    console.log(`🆘 [FALLBACK] Création manager de secours...`);
    
    try {
      const fallbackManager = new NpcManager();
      this.npcManagers.set('global', fallbackManager);
      console.warn(`⚠️ Manager NPCs en mode fallback (0 NPCs) pour éviter les crashes`);
      console.warn(`📊 État fallback: Manager créé mais vide`);
    } catch (fallbackError) {
      console.error(`💀 [FATAL] Impossible de créer le manager fallback:`, fallbackError);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`NPC Manager initialization completely failed: ${errorMsg}`);
    }
    
    // Re-throw l'erreur originale pour information
    throw error;
  }
}

// ✅ MÉTHODE UTILITAIRE : Extraire zone depuis NPC (à ajouter dans WorldRoom)
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
  console.log(`📥 === WORLDROOM: PLAYER JOIN ZONE (DEBUG COMPLET) ===`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`👤 Client: ${client.sessionId}`);
  console.log(`🌍 Zone demandée: "${zoneName}"`);
  console.log(`🏠 Room ID: ${this.roomId}`);
  
  // ✅ ÉTAPE 1: Vérification du client
  const player = this.state.players.get(client.sessionId);
  if (!player) {
    console.error(`❌ [CRITICAL] Joueur non trouvé pour session: ${client.sessionId}`);
    console.error(`📊 Total joueurs dans state: ${this.state.players.size}`);
    return;
  }
  
  console.log(`✅ [PLAYER] Joueur trouvé: ${player.name}`);
  console.log(`📍 [PLAYER] Position actuelle: (${player.x}, ${player.y}) dans ${player.currentZone}`);
  
  // ✅ ÉTAPE 2: Sauvegarde position
  console.log(`💾 [SAVE] Sauvegarde position lors de transition...`);
  try {
    const position = this.positionSaver.extractPosition(player);
    await this.positionSaver.savePosition(position, "transition");
    console.log(`✅ [SAVE] Position sauvegardée: (${position.x}, ${position.y}) dans ${position.zone}`);
  } catch (saveError) {
    console.error(`❌ [SAVE] Erreur sauvegarde:`, saveError);
  }

  // ✅ ÉTAPE 3: Récupération du NPC Manager
  console.log(`📂 [NPC MANAGER] Récupération du manager global...`);
  console.log(`📂 [NPC MANAGER] Managers disponibles: ${Array.from(this.npcManagers.keys())}`);
  
  const npcManager = this.npcManagers.get('global');
  
  if (!npcManager) {
    console.error(`❌ [CRITICAL] Aucun NPC Manager global trouvé !`);
    console.error(`📊 Managers dans cache: ${this.npcManagers.size}`);
    console.error(`📋 Clés disponibles:`, Array.from(this.npcManagers.keys()));
    return;
  }
  
  console.log(`✅ [NPC MANAGER] Manager global trouvé`);
  
  // ✅ ÉTAPE 4: Test de l'état du manager
  console.log(`🔍 [NPC MANAGER] Test état du manager...`);
  
  const allNpcs = npcManager.getAllNpcs();
  console.log(`📊 [NPC MANAGER] Total NPCs en mémoire: ${allNpcs.length}`);
  
  const zones = npcManager.getLoadedZones();
  console.log(`🗺️ [NPC MANAGER] Zones chargées (${zones.length}):`, zones);
  console.log(`🔍 [NPC MANAGER] Zone "${zoneName}" chargée: ${npcManager.isZoneLoaded(zoneName)}`);
  
  // ✅ ÉTAPE 5: Récupération des NPCs pour la zone
  console.log(`🤖 [NPCS] Récupération NPCs pour zone "${zoneName}"...`);
  
  const npcs = npcManager.getNpcsByZone(zoneName);
  console.log(`📊 [NPCS] NPCs trouvés pour zone "${zoneName}": ${npcs.length}`);
  
  if (npcs.length === 0) {
    console.error(`❌ [NPCS] Aucun NPC trouvé pour zone "${zoneName}" !`);
    console.error(`🔍 [NPCS] Debug: vérification autres zones...`);
    
    // Debug: voir les NPCs dans d'autres zones
    const npcsByZone: { [key: string]: any[] } = {};
    allNpcs.forEach(npc => {
      if (!npcsByZone[npc.zone]) npcsByZone[npc.zone] = [];
      npcsByZone[npc.zone].push(npc);
    });
    
    console.error(`🔍 [DEBUG] NPCs par zone:`, Object.keys(npcsByZone).map(zone => ({
      zone: zone,
      count: npcsByZone[zone].length,
      isRequestedZone: zone === zoneName
    })));
    
    return;
  }
  
  // ✅ ÉTAPE 6: Debug des NPCs trouvés
  console.log(`🤖 [NPCS] Détail des ${npcs.length} NPCs trouvés:`);
  npcs.forEach((npc, index) => {
    console.log(`  ${index + 1}. ID:${npc.id} "${npc.name}" à (${npc.x}, ${npc.y}) sprite:"${npc.sprite}"`);
  });
  
  // ✅ ÉTAPE 7: Vérification de la connexion client
  console.log(`📡 [CLIENT] Vérification connexion client...`);
  console.log(`📡 [CLIENT] Session ID: ${client.sessionId}`);
  console.log(`📡 [CLIENT] Client connecté: ${!!client}`);
  console.log(`📡 [CLIENT] Client dans room: ${this.clients.includes(client)}`);
  
  if (!this.clients.includes(client)) {
    console.error(`❌ [CLIENT] Client non trouvé dans la room !`);
    console.error(`📊 Clients actuels: ${this.clients.length}`);
    return;
  }
  
  // ✅ ÉTAPE 8: ENVOI CRITIQUE des NPCs
  console.log(`📤 [SEND] === ENVOI DES NPCS AU CLIENT ===`);
  console.log(`📤 [SEND] Destination: ${client.sessionId}`);
  console.log(`📤 [SEND] Message: "npcList"`);
  console.log(`📤 [SEND] Payload: ${npcs.length} NPCs`);
  console.log(`📤 [SEND] Premier NPC:`, npcs[0] ? {
    id: npcs[0].id,
    name: npcs[0].name,
    x: npcs[0].x,
    y: npcs[0].y,
    zone: npcs[0].zone,
    sprite: npcs[0].sprite
  } : 'AUCUN');
  
  try {
    client.send("npcList", npcs);
    console.log(`✅ [SEND] Message "npcList" envoyé avec succès !`);
    console.log(`✅ [SEND] ${npcs.length} NPCs envoyés à ${client.sessionId}`);
  } catch (sendError) {
    console.error(`❌ [SEND] Erreur lors de l'envoi:`, sendError);
    return;
  }
  
  // ✅ ÉTAPE 9: Envoi des objets de zone
  console.log(`📦 [OBJECTS] Envoi des objets de zone...`);
  try {
    this.objectInteractionHandlers.sendZoneObjectsToClient(client, zoneName);
    console.log(`✅ [OBJECTS] Objets de zone envoyés`);
  } catch (objectError) {
    console.error(`❌ [OBJECTS] Erreur envoi objets:`, objectError);
  }
  
  // ✅ ÉTAPE 10: Mise à jour TimeWeatherService
  console.log(`🌍 [TIME WEATHER] Mise à jour client zone...`);
  if (this.timeWeatherService) {
    this.timeWeatherService.updateClientZone(client, zoneName);
    console.log(`✅ [TIME WEATHER] Client mis à jour pour zone: ${zoneName}`);
    
    // Envoi immédiat état temps/météo
    setTimeout(() => {
      if (this.timeWeatherService) {
        this.timeWeatherService.sendCurrentStateToAllClients();
        console.log(`✅ [TIME WEATHER] État temps/météo envoyé`);
      }
    }, 50);
  } else {
    console.warn(`⚠️ [TIME WEATHER] Service non disponible`);
  }

  // ✅ ÉTAPE 11: Quest statuses
  console.log(`🎯 [QUESTS] Programmation quest statuses...`);
  if (player) {
    console.log(`🎯 [QUESTS] Joueur: ${player.name}, délai: 500ms`);
    
    this.clock.setTimeout(async () => {
      console.log(`⏰ [QUESTS] Exécution quest statuses pour ${player.name}`);
      try {
        await this.updateQuestStatusesFixed(player.name, client);
        console.log(`✅ [QUESTS] Quest statuses traités pour ${player.name}`);
      } catch (questError) {
        console.error(`❌ [QUESTS] Erreur quest statuses:`, questError);
      }
    }, 500);
  }
  
  console.log(`🎉 [SUCCESS] === PLAYER JOIN ZONE TERMINÉ ===`);
  console.log(`📊 Résumé: ${npcs.length} NPCs envoyés à ${player.name} pour zone "${zoneName}"`);
}

  // Mise à jour quest statuses avec debug
  private async updateQuestStatusesFixed(username: string, client?: Client) {
    try {
      console.log(`📊 [WorldRoom] === UPDATE QUEST STATUSES ===`);
      console.log(`👤 Username: ${username}`);
      
      // Vérifier que le ZoneManager est initialisé
      if (!this.zoneManager) {
        console.error(`❌ [WorldRoom] ZoneManager non initialisé !`);
        return;
      }
      
      // Vérifier que le QuestManager est accessible
      const questManager = this.zoneManager.getQuestManager();
      if (!questManager) {
        console.error(`❌ [WorldRoom] QuestManager non accessible !`);
        return;
      }
      
      console.log(`✅ [WorldRoom] Managers OK, récupération quest statuses...`);
      
      // Appeler directement le QuestManager pour debug
      const availableQuests = await questManager.getAvailableQuests(username);
      const activeQuests = await questManager.getActiveQuests(username);
      
      console.log(`📋 [WorldRoom] Quêtes disponibles: ${availableQuests.length}`);
      console.log(`📈 [WorldRoom] Quêtes actives: ${activeQuests.length}`);
      
      // Calculer manuellement les statuts pour debug
      const questStatuses: any[] = [];
      
      // Statuts pour les quêtes disponibles
      for (const quest of availableQuests) {
        if (quest.startNpcId) {
          questStatuses.push({
            npcId: quest.startNpcId,
            type: 'questAvailable'
          });
          console.log(`➕ [WorldRoom] Quête disponible: ${quest.name} pour NPC ${quest.startNpcId}`);
        }
      }
      
      // Statuts pour les quêtes actives
      for (const quest of activeQuests) {
        if (quest.status === 'readyToComplete' && quest.endNpcId) {
          questStatuses.push({
            npcId: quest.endNpcId,
            type: 'questReadyToComplete'
          });
          console.log(`🎉 [WorldRoom] Quête prête: ${quest.name} pour NPC ${quest.endNpcId}`);
        } else if (quest.endNpcId) {
          questStatuses.push({
            npcId: quest.endNpcId,
            type: 'questInProgress'
          });
          console.log(`📈 [WorldRoom] Quête en cours: ${quest.name} pour NPC ${quest.endNpcId}`);
        }
      }
      
      console.log(`📊 [WorldRoom] Total quest statuses: ${questStatuses.length}`, questStatuses);
      
      if (questStatuses.length > 0) {
        // Envoyer à tous les clients ou juste celui spécifié
        if (client) {
          client.send("questStatuses", { questStatuses });
          console.log(`📤 [WorldRoom] Quest statuses envoyés à ${client.sessionId}`);
        } else {
          this.broadcast("questStatuses", { questStatuses });
          console.log(`📡 [WorldRoom] Quest statuses broadcastés`);
        }
      } else {
        console.log(`ℹ️ [WorldRoom] Aucun quest status à envoyer pour ${username}`);
      }
      
    } catch (error) {
      console.error(`❌ [WorldRoom] Erreur updateQuestStatusesFixed:`, error);
    }
  }

  // Méthodes publiques
  public getNpcManager(zoneName: string): NpcManager | undefined {
    // Utiliser le manager global
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
    console.log(`🔍 [WorldRoom] === DEBUG NPC MANAGERS ===`);
    this.npcManagers.forEach((npcManager, zoneName) => {
      const npcs = npcManager.getAllNpcs();
      console.log(`🌍 Zone: ${zoneName} - ${npcs.length} NPCs`);
      npcs.forEach(npc => {
        console.log(`  🤖 NPC ${npc.id}: ${npc.name} at (${npc.x}, ${npc.y})`);
      });
    });
    console.log(`=======================================`);
  }
  
  private setupMessageHandlers() {
    console.log(`📨 === SETUP MESSAGE HANDLERS ===`);

    // Configurer les handlers d'équipe
    this.teamHandlers.setupHandlers();
        this.followerHandlers.setupHandlers();

    // Configurer les handlers d'encounter
    this.encounterHandlers.setupHandlers();

    this.questHandlers.setupHandlers();
    this.battleHandlers.setupHandlers();
    this.movementHandlers.setupHandlers();
    this.objectInteractionHandlers.setupHandlers();
    console.log(`✅ PokédxMessageHandler initialisé`);
        // Nouveau handler dans setupMessageHandlers()
    
// ✅ DANS WorldRoom.ts - Remplacez le handler battleFinished existant

this.onMessage("battleFinished", async (client, data) => {
  console.log(`🏁 [WorldRoom] battleFinished reçu de ${client.sessionId}`);
  
  const player = this.state.players.get(client.sessionId);
  const playerName = player?.name;
  
  // ✅ VALIDATION UNIVERSELLE EN UNE LIGNE !
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
  console.log(`✅ [WorldRoom] battleFinished validé pour userId: ${userId}`);
  
  // ✅ RESTE DU CODE IDENTIQUE
  this.battleHandlers.onBattleFinished(userId, data.battleResult);
  this.unblockPlayerMovement(client.sessionId, 'battle');
  this.jwtManager.clearBattleState(userId);
  
  client.send("battleFinishedAck", { success: true });
});

// ✅ BONUS: Ajouter debug handler pour diagnostiquer
this.onMessage("debugJWTSession", (client) => {
  const userId = this.jwtManager.getUserId(client.sessionId);
  const jwtData = this.jwtManager.getJWTDataBySession(client.sessionId);
  
  console.log(`🔍 [DEBUG JWT] Session: ${client.sessionId}`);
  console.log(`🔍 [DEBUG JWT] UserId from mapping: ${userId}`);
  console.log(`🔍 [DEBUG JWT] JWT Data exists: ${!!jwtData}`);
  console.log(`🔍 [DEBUG JWT] JWT UserId: ${jwtData?.userId}`);
  
  client.send("debugJWTResult", {
    sessionId: client.sessionId,
    userIdFromMapping: userId,
    hasJWTData: !!jwtData,
    userIdFromJWT: jwtData?.userId,
    username: jwtData?.username
  });
  
  this.jwtManager.debugMappings();
});
    // === HANDLERS EXISTANTS ===

 // ✅ NOUVEAU: Configurer les handlers de starter
this.starterHandlers.setupHandlers();

// ✅ HANDLER STARTER CORRIGÉ - Remplace le handler temporaire
console.log('🔧 [FIX] Configuration handler starter RÉEL...')

this.onMessage("giveStarterChoice", async (client, data: { pokemonId: number }) => {
    console.log('📥 [FIX] STARTER REQUEST reçu:', data)
    
    const player = this.state.players.get(client.sessionId)
    if (!player) {
        console.log('❌ [FIX] Joueur non trouvé:', client.sessionId)
        client.send("starterReceived", {
            success: false,
            message: "Joueur non trouvé"
        })
        return
    }
    
    console.log('🎯 [FIX] Création RÉELLE starter pour:', player.name)
    
    try {
        // ✅ CORRECTION: Appeler le vrai service pour créer le Pokémon
        const { giveStarterToPlayer } = await import('../services/PokemonService');
        const { getPokemonById } = await import('../data/PokemonData');
        
        // Créer le vrai Pokémon en base de données
        let pokemonDoc;
        if ([1, 4, 7].includes(data.pokemonId)) {
            pokemonDoc = await giveStarterToPlayer(player.name, data.pokemonId as 1 | 4 | 7);
        }
        
        console.log('✅ [FIX] Pokémon créé en base:', pokemonDoc._id);
        
        // ✅ Utiliser les données officielles du système
        const pokemonData = await getPokemonById(data.pokemonId);
        const starterName = pokemonData?.name || `Pokémon #${data.pokemonId}`;
        
        // Envoyer la réponse avec les vraies données
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
        
        console.log('✅ [FIX] Réponse starter RÉELLE envoyée pour:', starterName)
        
// ✅ BONUS: Envoyer automatiquement l'équipe mise à jour
setTimeout(() => {
    console.log('📤 [FIX] Demande équipe automatique...');
    // Le client va automatiquement demander l'équipe
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

console.log('🚀 [FIX] Handler starter RÉEL configuré !')

        // ✅ ============= AJOUTER ICI LES HANDLERS OVERWORLD POKEMON =============
    
    // Handler pour synchronisation des Pokémon overworld
    this.onMessage("requestOverworldSync", (client) => {
      console.log(`🔄 [WorldRoom] Demande sync Pokémon overworld de ${client.sessionId}`);
      if (this.overworldPokemonManager) {
        this.overworldPokemonManager.syncPokemonForClient(client);
      }
    });

    // Handler pour debug des Pokémon overworld
// Handler pour debug des Pokémon overworld
this.onMessage("debugOverworldPokemon", (client) => {
  console.log(`🔍 [WorldRoom] Debug Pokémon overworld demandé par ${client.sessionId}`);
  if (this.overworldPokemonManager) {
    this.overworldPokemonManager.debug();
    const stats = this.overworldPokemonManager.getStats();
    client.send("overworldPokemonStats", stats);
  }
});

// ✅ AJOUTE CE HANDLER ICI
this.onMessage("overworldPokemonSpawnResponse", (client, message) => {
  console.log(`📍 [WorldRoom] Réponse spawn reçue de ${client.sessionId}:`, message);
  if (this.overworldPokemonManager) {
    this.overworldPokemonManager.handleClientSpawnResponse(client, message);
  }
});
    
// 🔥 AJOUTER CE HANDLER MANQUANT JUSTE APRÈS :
this.onMessage("overworldPokemonMoveResponse", (client, message) => {
//  console.log(`📍 [WorldRoom] Réponse mouvement reçue de ${client.sessionId}:`, message);
  if (this.overworldPokemonManager) {
    this.overworldPokemonManager.handleClientMoveResponse(client, message);
  }
});
    // Handler pour nettoyer une zone overworld
    this.onMessage("clearOverworldArea", (client, data: { areaId: string }) => {
      console.log(`🧹 [WorldRoom] Nettoyage zone overworld ${data.areaId} par ${client.sessionId}`);
      if (this.overworldPokemonManager) {
        this.overworldPokemonManager.clearArea(data.areaId);
      }
    });

    // Handler PING pour garder la connexion active (heartbeat)
    this.onMessage("ping", async (client, data) => {
  // ✅ NOUVEAU: Mettre à jour le playtime via ping
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
          console.log(`⏰ Playtime mis à jour: ${player.name} +${sessionTime}min (total: ${user.totalPlaytime}min)`);
        }
      }
    } catch (error) {
      console.error('❌ Erreur update playtime via ping:', error);
    }
  }
  
  // Répondre au ping
  client.send("pong", { serverTime: Date.now() });
});
    
    // Transition entre zones (ancien système)
    this.onMessage("moveToZone", async (client, data) => {
      console.log(`🌀 === MOVE TO ZONE REQUEST (ANCIEN SYSTÈME) ===`);
      console.log(`👤 Client: ${client.sessionId}`);
      console.log(`📍 Data:`, data);
      
      // Déléguer au ZoneManager
      await this.zoneManager.handleZoneTransition(client, data);
    });

    // ✅ NOUVEAUX HANDLERS POUR LE BLOCAGE DE MOUVEMENT
    
    // Debug des blocages (admin/dev seulement)
    this.onMessage("debugMovementBlocks", (client) => {
      console.log(`🔍 [WorldRoom] Debug blocages demandé par ${client.sessionId}`);
      movementBlockManager.debugAllBlocks();
      
      const stats = movementBlockManager.getStats();
      client.send("movementBlockStats", stats);
    });

    // Forcer le déblocage (admin/urgence)
    this.onMessage("forceUnblockMovement", (client, data: { targetPlayerId?: string }) => {
      const targetId = data.targetPlayerId || client.sessionId;
      const success = movementBlockManager.forceUnblockAll(targetId);
      
      client.send("forceUnblockResult", {
        success,
        targetPlayerId: targetId,
        message: success ? "Déblocage forcé réussi" : "Erreur lors du déblocage"
      });
      
      console.log(`🔥 [WorldRoom] Déblocage forcé ${targetId} par ${client.sessionId}: ${success}`);
    });

    // Vérifier l'état de blocage
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
    
    // Validation de transition (nouveau système sécurisé)
    this.onMessage("validateTransition", async (client, data: TransitionRequest) => {
      console.log(`🔍 === VALIDATION TRANSITION REQUEST ===`);
      console.log(`👤 From: ${client.sessionId}`);
      console.log(`📍 Data:`, data);
      
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
          // Mettre à jour la position du joueur sur le serveur
          if (result.position) {
            const oldZone = player.currentZone;
            player.currentZone = result.currentZone!;
            player.x = result.position.x;
            player.y = result.position.y;
            console.log(`🔧 [WorldRoom] IMMÉDIATEMENT APRÈS UPDATE:`);
            console.log(`  - player.currentZone: ${player.currentZone}`);
            console.log(`  - result.currentZone: ${result.currentZone}`);
            console.log(`  - player position: (${player.x}, ${player.y})`);
            console.log(`✅ Transition validée: ${player.name} ${oldZone} → ${player.currentZone}`);
            
            // Notifier le changement de zone
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

    // Répondre aux demandes de zone
    this.onMessage("requestCurrentZone", (client, data) => {
      console.log(`📍 [WorldRoom] === DEMANDE ZONE ACTUELLE ===`);
      console.log(`👤 Client: ${client.sessionId}`);
      console.log(`📊 Data:`, data);
      
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        console.error(`❌ [WorldRoom] Joueur introuvable: ${client.sessionId}`);
        client.send("currentZone", {
          zone: "beach", // Zone par défaut
          x: 360,
          y: 120,
          error: "Joueur non trouvé, zone par défaut",
          sceneKey: data.sceneKey,
          timestamp: Date.now()
        });
        return;
      }
      
      // Envoyer la vérité du serveur
      const response = {
        zone: player.currentZone,
        x: player.x,
        y: player.y,
        timestamp: Date.now(),
        sceneKey: data.sceneKey
      };
      
      console.log(`📤 [WorldRoom] === ENVOI ZONE OFFICIELLE ===`);
      console.log(`🎯 Zone serveur: ${response.zone}`);
      console.log(`📍 Position: (${response.x}, ${response.y})`);
      console.log(`📺 Scène demandée: ${response.sceneKey}`);
      
      client.send("currentZone", response);
    });
    
    // Notification de changement de zone
    this.onMessage("notifyZoneChange", (client, data: { newZone: string, x: number, y: number }) => {
      console.log(`🔄 === ZONE CHANGE NOTIFICATION ===`);
      console.log(`👤 Client: ${client.sessionId}`);
      console.log(`📍 Nouvelle zone: ${data.newZone} à (${data.x}, ${data.y})`);
      
      const player = this.state.players.get(client.sessionId);
      if (player) {
        const oldZone = player.currentZone;
        
        // Mettre à jour la zone et position du joueur
        player.currentZone = data.newZone;
        player.x = data.x;
        player.y = data.y;
        
        console.log(`✅ ${player.name}: ${oldZone} → ${data.newZone}`);
        
        // Envoyer les NPCs de la nouvelle zone
        this.onPlayerJoinZone(client, data.newZone);
        
        // Déclencher une mise à jour du state filtré
        this.scheduleFilteredStateUpdate();
      }
    });

    // Interaction avec NPC
this.onMessage("npcInteract", async (client, data) => {
  console.log(`💬 === NPC INTERACTION REQUEST (SYSTÈME INTÉGRÉ) ===`);
  console.log(`👤 Client: ${client.sessionId}, NPC: ${data.npcId}`);
  console.log(`🌐 Langue: ${data.playerLanguage}`); // ✅ Debug langue
  
  const player = this.state.players.get(client.sessionId);
  if (!player) {
    console.error(`❌ Joueur non trouvé: ${client.sessionId}`);
    client.send("npcInteractionResult", {
      success: false,
      type: "error",
      message: "Joueur non trouvé"
    });
    return;
  }

  try {
    // ✅ CORRECTION : Passer toutes les données, pas seulement npcId
    const result = await this.interactionManager.handleNpcInteraction(player, data.npcId, data);
    //                                                                                     ^^^^
    //                                                                                     AJOUT !
    
    console.log(`📤 Envoi résultat: ${result.type}`);
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
      console.log(`📡 [WorldRoom] Demande état initial de ${client.sessionId} pour zone: ${data.zone}`);
      
      // Envoyer immédiatement l'état filtré pour cette zone
      const player = this.state.players.get(client.sessionId);
      if (player && player.currentZone === data.zone) {
        const filteredState = this.getFilteredStateForClient(client);
        if (filteredState) {
          client.send("filteredState", filteredState);
          console.log(`✅ [WorldRoom] État initial envoyé à ${client.sessionId}`);
        }
}
    });

    // ✅ NOUVEAU : Actions spécifiques NPCs (achats directs depuis interface unifiée)
    this.onMessage("npcSpecificAction", async (client, data) => {
      console.log(`🎯 === NPC SPECIFIC ACTION ===`);
      console.log(`👤 Client: ${client.sessionId}, Action: ${data.actionType} pour NPC: ${data.npcId}`);
      
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        console.error(`❌ Joueur non trouvé: ${client.sessionId}`);
        client.send("npcSpecificActionResult", {
          success: false,
          type: "error",
          message: "Joueur non trouvé"
        });
        return;
      }

      try {
        // ✅ DÉLÉGUER AU MODULE NPC POUR ACTIONS SPÉCIFIQUES
        const result = await this.npcInteractionModule.handleSpecificAction(player, data);
        
        console.log(`📤 Envoi résultat action spécifique: ${result.actionType}`);
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

    // === HANDLERS POUR PREMIER JOUEUR ===

    // Demande de resynchronisation forcée
    this.onMessage("requestPlayerState", (client) => {
      console.log(`🔄 [WorldRoom] Demande de resync de ${client.sessionId}`);
      
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Renvoyer les données du joueur
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
        
        // Et renvoyer le state complet
        const filteredState = this.getFilteredStateForClient(client);
        client.send("forcedStateSync", {
          players: filteredState.players,
          mySessionId: client.sessionId,
          timestamp: Date.now()
        });
        
        console.log(`✅ [WorldRoom] Resync envoyé à ${client.sessionId}`);
      } else {
        client.send("playerStateResponse", {
          exists: false,
          error: "Joueur non trouvé dans le state"
        });
      }
    });

    // Handler pour vérification de présence
    this.onMessage("checkMyPresence", (client) => {
      const exists = this.state.players.has(client.sessionId);
      client.send("presenceCheck", {
        exists: exists,
        sessionId: client.sessionId,
        totalPlayers: this.state.players.size
      });
      
      console.log(`👻 [WorldRoom] Vérification présence ${client.sessionId}: ${exists}`);
    });
    
    // === HANDLERS POUR LES SHOPS ===

    // Transaction shop (achat/vente)
// ✅ MODIFIÉ : Transaction shop via système intégré
    this.onMessage("shopTransaction", async (client, data) => {
      console.log(`🛒 [WorldRoom] Transaction shop via système intégré:`, data);
      
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("shopTransactionResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      try {
        // ✅ UTILISER LE NOUVEAU SYSTÈME INTÉGRÉ
        const result = await this.interactionManager.handleShopTransaction(
          player,
          data.shopId,
          data.action,
          data.itemId,
          data.quantity
        );

        // Mettre à jour l'or du joueur si transaction réussie
        if (result.success && result.newGold !== undefined) {
          if (data.action === 'buy') {
            player.gold = result.newGold;  // Pour achat : newGold = nouvel or total
          } else if (data.action === 'sell') {
            player.gold += result.newGold; // ✅ Pour vente : newGold = montant gagné à AJOUTER
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
// Récupérer le catalogue d'un shop via système intégré
 // ✅ MODIFIÉ : Récupérer le catalogue d'un shop avec logique Buy/Sell correcte
    this.onMessage("getShopCatalog", async (client, data) => {
      console.log(`🏪 [WorldRoom] Demande catalogue shop via système intégré: ${data.shopId}`);
      
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("shopCatalogResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      try {
        // ✅ ITEMS À ACHETER (du shop)
        const catalog = this.shopManager.getShopCatalog(data.shopId, player.level || 1);
        
        if (!catalog) {
          client.send("shopCatalogResult", {
            success: false,
            message: "Shop introuvable"
          });
          return;
        }

        // ✅ ITEMS À VENDRE (de l'inventaire du joueur)
        const playerInventory = await InventoryManager.getAllItemsGroupedByPocket(player.name);
        // ✅ DEBUG : Voir la structure exacte
        console.log(`🔍 [DEBUG] Structure playerInventory pour ${player.name}:`, JSON.stringify(playerInventory, null, 2));
        const sellableItems: any[] = [];

// ✅ CORRIGÉ : Convertir l'inventaire (items = TABLEAU)
        for (const [pocket, items] of Object.entries(playerInventory)) {
          if (Array.isArray(items)) {
            for (const item of items) {  // ✅ BOUCLE FOR...OF sur le tableau
              const sellPrice = this.shopManager.getItemSellPrice(data.shopId, item.itemId);
              if (sellPrice > 0 && item.quantity > 0) {
                sellableItems.push({
                  itemId: item.itemId,  // ✅ MAINTENANT c'est "potion", "poke_ball"
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
            // ✅ SÉPARATION BUY/SELL
            buyItems: catalog.availableItems,  // Items du shop
            sellItems: sellableItems           // Items du joueur
          },
          playerGold: player.gold || 1000
        };

        client.send("shopCatalogResult", response);
        console.log(`✅ Catalogue shop ${data.shopId} envoyé avec ${catalog.availableItems.length} buy items et ${sellableItems.length} sell items`);

      } catch (error) {
        console.error(`❌ Erreur catalogue shop:`, error);
        client.send("shopCatalogResult", {
          success: false,
          message: "Erreur lors de la récupération du catalogue"
        });
      }
    });
    
    // Rafraîchir un shop (restock)
    this.onMessage("refreshShop", (client, data) => {
      console.log(`🔄 [WorldRoom] Rafraîchissement shop: ${data.shopId}`);
      this.handleRefreshShop(client, data.shopId);
    });
    
    // === HANDLERS POUR L'INVENTAIRE ===

    // Récupérer l'inventaire complet du joueur
    this.onMessage("getInventory", async (client) => {
      try {
        const player = this.state.players.get(client.sessionId);
        if (!player) {
          client.send("inventoryError", { message: "Joueur non trouvé" });
          return;
        }

        console.log(`🎒 Récupération inventaire pour ${player.name}`);
        
        // Récupérer les données d'inventaire groupées par poche
        const inventoryData = await InventoryManager.getAllItemsGroupedByPocket(player.name);
        
        client.send("inventoryData", inventoryData);
        console.log(`✅ Inventaire envoyé à ${player.name}:`, Object.keys(inventoryData));
        
      } catch (error) {
        console.error("❌ Erreur getInventory:", error);
        client.send("inventoryError", { 
          message: "Impossible de charger l'inventaire" 
        });
      }
    });

    // Utiliser un objet
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

        console.log(`🎒 ${player.name} utilise ${data.itemId} (contexte: ${data.context})`);

        // Vérifier si l'objet peut être utilisé
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

        // Vérifier que le joueur possède l'objet
        const itemCount = await InventoryManager.getItemCount(player.name, data.itemId);
        if (itemCount <= 0) {
          client.send("itemUseResult", { 
            success: false, 
            message: "Vous n'avez pas cet objet" 
          });
          return;
        }

        // Retirer l'objet de l'inventaire
        const success = await InventoryManager.removeItem(player.name, data.itemId, 1);
        if (!success) {
          client.send("itemUseResult", { 
            success: false, 
            message: "Erreur lors de la suppression de l'objet" 
          });
          return;
        }

        // Appliquer l'effet de l'objet
        const effectResult = await this.applyItemEffect(player, data.itemId, data.context);
        
        client.send("itemUseResult", { 
          success: true, 
          message: effectResult.message || `${data.itemId} utilisé avec succès` 
        });

        // Notifier la mise à jour d'inventaire
        client.send("inventoryUpdate", {
          type: "remove",
          itemId: data.itemId,
          quantity: 1,
          pocket: getItemPocket(data.itemId)
        });

        console.log(`✅ ${player.name} a utilisé ${data.itemId}`);
        
      } catch (error) {
        console.error("❌ Erreur useItem:", error);
        client.send("itemUseResult", { 
          success: false, 
          message: "Erreur lors de l'utilisation" 
        });
      }
    });

    // Ramasser un objet au sol
    this.onMessage("pickupItem", async (client, data) => {
      try {
        const player = this.state.players.get(client.sessionId);
        if (!player) {
          client.send("inventoryError", { message: "Joueur non trouvé" });
          return;
        }

        console.log(`🎒 ${player.name} ramasse ${data.itemId} à (${data.x}, ${data.y})`);

        // Vérifier la proximité (distance maximale de 2 tiles)
        const distance = Math.sqrt(
          Math.pow(player.x - data.x, 2) + Math.pow(player.y - data.y, 2)
        );
        
        if (distance > 2) {
          client.send("inventoryError", { message: "Objet trop éloigné" });
          return;
        }

        // Ajouter l'objet à l'inventaire
        await InventoryManager.addItem(player.name, data.itemId, 1);
        
        // Notifier le client
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

        console.log(`✅ ${player.name} a ramassé ${data.itemId}`);

      } catch (error) {
        console.error("❌ Erreur pickupItem:", error);
        client.send("inventoryError", { 
          message: "Impossible de ramasser l'objet" 
        });
      }
    });

    // === HANDLERS TEMPS/MÉTÉO ===
    this.onMessage("getTime", (client) => {
      console.log(`🕐 [WorldRoom] ${client.sessionId} demande l'heure actuelle`);
      
      if (this.timeWeatherService) {
        const time = this.timeWeatherService.getCurrentTime();
        
        const response = {
          gameHour: time.hour,
          isDayTime: time.isDayTime,
          displayTime: this.timeWeatherService.formatTime(),
          timestamp: Date.now()
        };
        
        client.send("currentTime", response);
        console.log(`📤 [WorldRoom] Heure envoyée: ${response.displayTime}`);
        
        // S'assurer que le client est dans le service de sync
        this.timeWeatherService.addClient(client);
      } else {
        console.warn(`⚠️ [WorldRoom] TimeWeatherService non disponible`);
        client.send("currentTime", {
          gameHour: 12,
          isDayTime: true,
          displayTime: "12:00 PM",
          error: "Service temps non disponible"
        });
      }
    });

    this.onMessage("getWeather", (client) => {
      console.log(`🌤️ [WorldRoom] ${client.sessionId} demande la météo actuelle`);
      
      if (this.timeWeatherService) {
        const weather = this.timeWeatherService.getCurrentWeather();
        
        const response = {
          weather: weather.name,
          displayName: weather.displayName,
          timestamp: Date.now()
        };
        
        client.send("currentWeather", response);
        console.log(`📤 [WorldRoom] Météo envoyée: ${response.displayName}`);
        
        // S'assurer que le client est dans le service de sync
        this.timeWeatherService.addClient(client);
      } else {
        console.warn(`⚠️ [WorldRoom] TimeWeatherService non disponible`);
        client.send("currentWeather", {
          weather: "clear",
          displayName: "Ciel dégagé",
          error: "Service météo non disponible"
        });
      }
    });

    // Handler pour vérifier la synchronisation
    this.onMessage("checkTimeWeatherSync", (client) => {
      console.log(`🔍 [WorldRoom] ${client.sessionId} vérifie la synchronisation temps/météo`);
      
      if (this.timeWeatherService) {
        const health = this.timeWeatherService.healthCheck();
        
        client.send("timeWeatherSyncStatus", {
          synchronized: health.healthy,
          issues: health.issues,
          currentTime: this.timeWeatherService.getCurrentTime(),
          currentWeather: this.timeWeatherService.getCurrentWeather(),
          serverTimestamp: Date.now()
        });
        
        // Si pas synchronisé, forcer l'envoi de l'état
        if (!health.healthy) {
          console.log(`🔄 [WorldRoom] Client ${client.sessionId} pas sync, envoi forcé`);
          setTimeout(() => {
            this.timeWeatherService!.sendCurrentStateToAllClients();
          }, 1000);
        }
      }
    });

    // Handler pour les tests (développement uniquement)
    this.onMessage("testAddItem", async (client, data) => {
      try {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        console.log(`🧪 Test: ajout de ${data.quantity || 1} ${data.itemId} à ${player.name}`);

        // Ajouter l'objet
        await InventoryManager.addItem(player.name, data.itemId, data.quantity || 1);
        
        // Notifier le client
        client.send("inventoryUpdate", {
          type: "add",
          itemId: data.itemId,
          quantity: data.quantity || 1,
          pocket: getItemPocket(data.itemId)
        });

        console.log(`✅ Test réussi: ${data.itemId} ajouté`);
        
      } catch (error) {
        console.error("❌ Erreur testAddItem:", error);
        client.send("inventoryError", { 
          message: `Erreur lors de l'ajout de ${data.itemId}` 
        });
      }
    });

    console.log(`✅ Tous les handlers configurés (y compris équipe et encounters)`);
  }

  // === HANDLERS POUR LES QUÊTES ===
private getPlayerNameBySession(sessionId: string): string | null {
  const player = this.state.players.get(sessionId);
  return player?.name || null;
}
  private async handleStartQuest(client: Client, data: { questId: string }) {
    try {
      console.log(`🎯 [WorldRoom] Démarrage de quête ${data.questId} pour ${client.sessionId}`);
      
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("questStartResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      // ✅ EXEMPLE D'USAGE: Bloquer pendant le démarrage de quête
      this.blockPlayerMovement(client.sessionId, 'dialog', 3000, { questId: data.questId });

      try {
        // Utiliser directement le QuestManager pour debug
        const questManager = this.zoneManager.getQuestManager();
        if (!questManager) {
          console.error(`❌ [WorldRoom] QuestManager non accessible`);
          client.send("questStartResult", {
            success: false,
            message: "Système de quêtes non disponible"
          });
          return;
        }

        // Démarrer la quête directement
        const quest = await questManager.startQuest(player.name, data.questId);
        
        if (quest) {
          console.log(`✅ [WorldRoom] Quête ${data.questId} démarrée pour ${player.name}`);
          
          const result = {
            success: true,
            quest: quest,
            message: `Quête "${quest.name}" démarrée !`
          };
          
          client.send("questStartResult", result);
          
          // Mettre à jour les statuts immédiatement
          await this.updateQuestStatusesFixed(player.name);
          
          // Broadcaster aux autres joueurs de la zone
          this.broadcastToZone(player.currentZone, "questUpdate", {
            player: player.name,
            action: "started",
            questId: data.questId
          });
          
        } else {
          console.log(`❌ [WorldRoom] Impossible de démarrer ${data.questId} pour ${player.name}`);
          client.send("questStartResult", {
            success: false,
            message: "Impossible de démarrer cette quête"
          });
        }

        // ✅ Débloquer à la fin
        this.unblockPlayerMovement(client.sessionId, 'dialog');
        
      } catch (error) {
        // ✅ Débloquer même en cas d'erreur
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
      console.log(`📋 Récupération des quêtes actives pour ${client.sessionId}`);
      
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("activeQuestsList", { quests: [] });
        return;
      }

      // Utiliser directement la méthode de délégation du ZoneManager
      const activeQuests = await this.zoneManager.getActiveQuests(player.name);
      
      console.log(`📤 Envoi de ${activeQuests.length} quêtes actives`);
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
      console.log(`📋 Récupération des quêtes disponibles pour ${client.sessionId}`);
      
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("availableQuestsList", { quests: [] });
        return;
      }

      // Utiliser directement la méthode de délégation du ZoneManager
      const availableQuests = await this.zoneManager.getAvailableQuests(player.name);
      
      console.log(`📤 Envoi de ${availableQuests.length} quêtes disponibles`);
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
      console.log(`📈 Progression de quête pour ${client.sessionId}:`, data);
      
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        return;
      }

      // Utiliser directement la méthode de délégation du ZoneManager
      const results = await this.zoneManager.updateQuestProgress(player.name, data);
      
      if (results && results.length > 0) {
        console.log(`📤 Envoi questProgressUpdate:`, results);
        client.send("questProgressUpdate", results);
        
        // Mettre à jour les statuts de quête
        await this.updateQuestStatusesFixed(player.name);
      }
      
    } catch (error) {
      console.error("❌ Erreur handleQuestProgress:", error);
    }
  }

  // Méthode de debug pour les quêtes
  private async debugQuests(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    console.log(`🐛 [DEBUG QUETES] Joueur: ${player.name}`);
    
    try {
      // Debug avec les méthodes de délégation du ZoneManager
      const activeQuests = await this.zoneManager.getActiveQuests(player.name);
      const availableQuests = await this.zoneManager.getAvailableQuests(player.name);
      
      console.log(`🐛 [DEBUG] Quêtes actives (${activeQuests.length}):`, 
        activeQuests.map((q: Quest) => ({ id: q.id, name: q.name, step: q.currentStepIndex })));
      
      console.log(`🐛 [DEBUG] Quêtes disponibles (${availableQuests.length}):`, 
        availableQuests.map((q: Quest) => ({ id: q.id, name: q.name })));
        
    } catch (error) {
      console.error(`🐛 [DEBUG] Erreur debug quêtes:`, error);
    }
  }

  // === HANDLERS POUR LES SHOPS ===

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

      console.log(`🛒 ${player.name} ${data.action} ${data.quantity}x ${data.itemId} dans shop ${data.shopId}`);

      // ✅ EXEMPLE D'USAGE: Bloquer pendant transaction shop
      this.blockPlayerMovement(client.sessionId, 'shop', 2000);

      try {
        // Utiliser directement this.shopManager au lieu du ZoneManager
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
            // Mettre à jour l'or du joueur
            if (result.newGold !== undefined) {
              player.gold = result.newGold;
              
              client.send("goldUpdate", {
                oldGold: player.gold + (result.newGold - player.gold),
                newGold: result.newGold
              });
            }

            // Notifier le changement d'inventaire
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

        // ✅ Débloquer après transaction
        this.unblockPlayerMovement(client.sessionId, 'shop');

      } catch (error) {
        // ✅ Débloquer même en cas d'erreur
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

      console.log(`🏪 Génération catalogue pour shop ${shopId} et joueur ${player.name}`);

      // Utiliser directement this.shopManager
      const catalog = this.shopManager.getShopCatalog(shopId, player.level || 1);

      if (catalog) {
        // Envoyer une seule fois avec toutes les données
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
        console.log(`✅ Catalogue shop ${shopId} envoyé à ${client.sessionId} avec ${catalog.availableItems.length} objets`);
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
        // Renvoyer le catalogue mis à jour
        await this.handleGetShopCatalog(client, shopId);
        
        client.send("shopRefreshResult", {
          success: true,
          message: "Magasin restocké !",
          restocked: true
        });
        
        console.log(`🔄 Shop ${shopId} restocké pour ${client.sessionId}`);
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
  
  // Helper pour broadcaster à une zone
  private broadcastToZone(zoneName: string, message: string, data: any) {
    console.log(`📡 [WorldRoom] Broadcasting to zone ${zoneName}: ${message}`);
    
    const clientsInZone = this.clients.filter(client => {
      const player = this.state.players.get(client.sessionId);
      return player && player.currentZone === zoneName;
    });
    
    clientsInZone.forEach(client => {
      client.send(message, data);
    });
    
    console.log(`📤 [WorldRoom] Message envoyé à ${clientsInZone.length} clients dans ${zoneName}`);
  }

  // === MÉTHODE POUR PREMIER JOUEUR ===
async onJoin(client: Client, options: any = {}) {
  console.log(`👤 === PLAYER JOIN ===`);
  console.log(`🔑 Session: ${client.sessionId}`);
  console.log(`📊 Options:`, { 
    ...options, 
    sessionToken: options.sessionToken ? '***TOKEN***' : 'MISSING' 
  });

  let decodedToken: any = null;

  // ✅ VÉRIFICATION JWT OBLIGATOIRE
  if (options.sessionToken) {
    try {
      const jwtLib = require('jsonwebtoken');
      decodedToken = jwtLib.verify(options.sessionToken, process.env.JWT_SECRET!) as any;
      console.log(`✅ [WorldRoom] Token JWT valide pour ${decodedToken.username}`);

      // Tentative d'enregistrement JWTManager, gestion double connexion
      try {
        await this.jwtManager.registerUser(client.sessionId, decodedToken);
      } catch (err) {
        const errorMessage =
          (err && typeof err === "object" && "message" in err)
            ? (err as any).message
            : "Erreur inconnue";
        console.error(`⛔ [WorldRoom] Refus connexion multiple pour ${decodedToken.username}: ${errorMessage}`);
        client.send("login_error", { message: errorMessage });
        client.leave(4001, "Vous êtes déjà connecté sur un autre onglet ou appareil.");
        return;
      }

      // Vérifier cohérence username
      if (decodedToken.username !== options.name) {
        console.error(`❌ [WorldRoom] Username incohérent: token=${decodedToken.username}, options=${options.name}`);
        client.leave(4000, "Token/username mismatch");
        return;
      }

      console.log(`🔧 [WorldRoom] Token décodé isDev:`, decodedToken?.isDev);
      
      // Permissions obligatoires
      if (!decodedToken.permissions || !decodedToken.permissions.includes('play')) {
        console.error(`❌ [WorldRoom] Permissions insuffisantes:`, decodedToken.permissions);
        client.leave(4000, "Insufficient permissions");
        return;
      }
      console.log(`🎮 [WorldRoom] Permissions validées:`, decodedToken.permissions);

    } catch (error) {
      console.error(`❌ [WorldRoom] Token JWT invalide:`, error);
      client.leave(4000, "Invalid session token");
      return;
    }
  } else {
    console.error(`❌ [WorldRoom] Aucun token JWT fourni`);
    client.leave(4000, "Session token required");
    return;
  }

  try {
    // Créer le joueur
    const player = new Player();

    // Données de base
    player.id = client.sessionId;
    player.name = options.name || `Player_${client.sessionId.substring(0, 6)}`;
    player.isDev = decodedToken?.isDev || false;
    console.log(`🔧 [WorldRoom] Joueur ${player.name} créé avec isDev:`, player.isDev);

    // Debug d'abord
    await this.positionSaver.debugPlayerPosition(player.name);

    console.log(`🔍 [WorldRoom] === CHARGEMENT POSITION JOUEUR (DB AUTHORITY ONLY) ===`);
    console.log(`👤 Joueur: ${player.name}`);

    // ✅ MODIFICATION CRITIQUE: DB = AUTORITÉ ABSOLUE
    const savedData = await PlayerData.findOne({ username: player.name });
    console.log(`💾 Données DB trouvées:`, savedData ? {
      lastX: savedData.lastX,
      lastY: savedData.lastY,
      lastMap: savedData.lastMap,
      types: {
        lastX: typeof savedData.lastX,
        lastY: typeof savedData.lastY,
        lastMap: typeof savedData.lastMap
      }
    } : 'Aucune donnée');

    // ✅ NOUVEAU: DB = AUTORITÉ ABSOLUE, PAS DE FALLBACK CLIENT
    if (
      savedData &&
      typeof savedData.lastX === 'number' &&
      typeof savedData.lastY === 'number' &&
      savedData.lastMap
    ) {
      // DB COMPLÈTE = UTILISER SANS CONDITION
      player.x = Math.round(savedData.lastX);
      player.y = Math.round(savedData.lastY);
      player.currentZone = savedData.lastMap;

      // NOUVEAU: Récupérer aussi le nom d'utilisateur
      if (savedData.username) {
        player.name = savedData.username;
        console.log(`📝 [WorldRoom] Nom utilisateur récupéré depuis DB: ${player.name}`);
      }

      console.log(`💾 [AUTORITÉ DB] Position restaurée: ${player.name}`);
      console.log(`📍 Position: (${player.x}, ${player.y}) dans ${player.currentZone}`);
      console.log(`🔥 TOUTES les options client IGNORÉES (comme il faut)`);

    } else {
      // ✅ NOUVEAU: DB INCOMPLÈTE = VALEURS PAR DÉFAUT SERVEUR PURES
      player.x = 360;
      player.y = 120;
      player.currentZone = "beach";
      
      console.log(`🆕 [NOUVEAU JOUEUR] ${player.name}: position par défaut SERVEUR`);
      console.log(`📍 Position par défaut: (${player.x}, ${player.y}) dans ${player.currentZone}`);
      console.log(`🚫 Options client COMPLÈTEMENT IGNORÉES`);
      
      if (savedData) {
        console.log(`🔍 Détail des données incomplètes:`, {
          hasLastX: savedData.lastX !== undefined && savedData.lastX !== null,
          hasLastY: savedData.lastY !== undefined && savedData.lastY !== null,
          hasLastMap: !!savedData.lastMap,
          actualValues: {
            lastX: savedData.lastX,
            lastY: savedData.lastY,
            lastMap: savedData.lastMap
          }
        });
      }
    }

    player.characterId = options.characterId || "brendan";
    console.log(`🎭 Personnage: ${player.characterId}`);
    console.log(`🌍 Zone SERVEUR: ${player.currentZone}`);

    // Ajouter le client au TimeWeatherService
    if (this.timeWeatherService) {
      this.timeWeatherService.addClient(client, player.currentZone);
      console.log(`🌍 [WorldRoom] Client ${client.sessionId} ajouté au TimeWeatherService avec zone: ${player.currentZone}`);
    }

    // Nouvelles propriétés shop
    player.level = options.level || 1;
    player.gold = options.gold || 1000;
    player.experience = options.experience || 0;
    player.title = options.title || "Dresseur Débutant";

    // Étape 1: Ajouter au state immédiatement
    this.state.players.set(client.sessionId, player);
    console.log("🧪 onJoin - client.sessionId =", client.sessionId);
    console.log(`✅ Joueur ${player.name} ajouté au state`);
    console.log(`📊 Total joueurs dans le state: ${this.state.players.size}`);

    // Étape 2: Confirmer immédiatement au client avec DONNÉES SERVEUR
    client.send("playerSpawned", {
      id: client.sessionId,
      name: player.name,
      x: player.x,                    // ✅ POSITION SERVEUR
      y: player.y,                    // ✅ POSITION SERVEUR  
      currentZone: player.currentZone, // ✅ ZONE SERVEUR
      characterId: player.characterId,
      level: player.level,
      gold: player.gold,
      isDev: player.isDev,
      isMyPlayer: true,
      totalPlayersInRoom: this.state.players.size
    });

    console.log(`📍 Position FINALE: (${player.x}, ${player.y}) dans ${player.currentZone}`);
    console.log(`💰 Level: ${player.level}, Gold: ${player.gold}`);
    console.log(`✅ Joueur ${player.name} créé et confirmé avec AUTORITÉ SERVEUR`);

    // Démarrer le système de Pokémon overworld si premier joueur
    if (this.state.players.size === 1) {
      console.log(`🚀 [WorldRoom] Premier joueur - démarrage système Pokémon overworld`);
      this.overworldPokemonManager.start();
    }

    // Synchroniser les Pokémon overworld existants pour le nouveau client
    this.clock.setTimeout(() => {
      console.log(`🔄 [WorldRoom] Synchronisation Pokémon overworld pour ${client.sessionId}`);
      this.overworldPokemonManager.syncPokemonForClient(client);
    }, 2000);

    // Forcer une synchronisation du state après un très court délai
    this.clock.setTimeout(() => {
      console.log(`🔄 [WorldRoom] Force sync state pour ${client.sessionId}`);
      const playerInState = this.state.players.get(client.sessionId);
      if (playerInState) {
        const filteredState = this.getFilteredStateForClient(client);
        client.send("forcedStateSync", {
          players: filteredState.players,
          mySessionId: client.sessionId,
          timestamp: Date.now()
        });
        console.log(`✅ [WorldRoom] État forcé envoyé à ${client.sessionId}`);
      } else {
        console.error(`❌ [WorldRoom] Joueur ${client.sessionId} disparu du state !`);
      }
    }, 200);

    // === CONFIGURATION INVENTAIRE DE DÉPART ===
    try {
      console.log(`🎒 Configuration inventaire de départ pour ${player.name}`);
      await InventoryManager.addItem(player.name, "poke_ball", 5);
      await InventoryManager.addItem(player.name, "potion", 3);
      const hasMap = await InventoryManager.getItemCount(player.name, "town_map");
      if (hasMap === 0) {
        await InventoryManager.addItem(player.name, "town_map", 1);
      }
      const grouped = await InventoryManager.getAllItemsGroupedByPocket(player.name);
      console.log(`🎒 [INVENTAIRE groupé par poche] ${player.name}:`, grouped);
      console.log(`✅ Objets de départ ajoutés pour ${player.name}`);
    } catch (err) {
      console.error(`❌ [INVENTAIRE] Erreur lors de l'ajout d'objets de départ pour ${player.name}:`, err);
    }

    // Faire entrer le joueur dans sa zone initiale
    await this.zoneManager.onPlayerJoinZone(client, player.currentZone);
    this.scheduleFilteredStateUpdate();

    // Setup des quêtes avec délai
    this.clock.setTimeout(async () => {
      await this.updateQuestStatusesFixed(player.name, client);
    }, 2000);

    // Initialiser le follower si le joueur a une équipe
    this.clock.setTimeout(async () => {
      console.log(`🐾 [WorldRoom] Initialisation follower pour ${player.name}`);
      await this.followerHandlers.onTeamChanged(client.sessionId);
    }, 4000);

    console.log(`🎉 ${player.name} a rejoint le monde avec AUTORITÉ SERVEUR !`);
  } catch (error) {
    console.error(`❌ Erreur lors du join:`, error);
    client.leave(1000, "Erreur lors de la connexion");
  }
}

async onLeave(client: Client, consented: boolean) {
  console.log(`👋 === PLAYER LEAVE ===`);
  console.log(`🔑 Session: ${client.sessionId}`);
  console.log(`✅ Consenti: ${consented}`);
  
  const player = this.state.players.get(client.sessionId);
  if (player) {
    console.log(`📍 Position finale: (${player.x}, ${player.y}) dans ${player.currentZone}`);
    console.log(`💰 Stats finales: Level ${player.level}, ${player.gold} gold`);
    
    // ✅ NOUVEAU: Vérifier combat actif AVANT nettoyage JWT
    const userId = this.jwtManager.getUserId(client.sessionId);
    const hasActiveBattle = userId ? this.jwtManager.hasActiveBattle(userId) : false;
    
    if (hasActiveBattle) {
      console.log(`⚔️ [WorldRoom] Combat actif détecté, préservation JWT pour ${player.name}`);
    } else {
      console.log(`✅ [WorldRoom] Pas de combat actif, nettoyage JWT normal pour ${player.name}`);
    }
    
    // Sauvegarder position
    const position = this.positionSaver.extractPosition(player);
    await this.positionSaver.savePosition(position, "disconnect");
    
    // Nettoyer follower
    this.followerHandlers.getFollowerManager().removePlayerFollower(client.sessionId);
    
    // Supprimer du state
    this.state.players.delete(client.sessionId);
    console.log(`🗑️ Joueur ${player.name} supprimé du state`);
  }
  
  // ✅ DÉPLACER ICI: Nettoyage JWT intelligent APRÈS récupération player
  this.jwtManager.removeUser(client.sessionId);
  
  if (this.timeWeatherService) {
    this.timeWeatherService.removeClient(client);
    console.log(`🌍 [WorldRoom] Client ${client.sessionId} retiré du TimeWeatherService`);
  }
  
  // ✅ NOUVEAU: Arrêter le système si plus de joueurs
  if (this.state.players.size === 0) {
    console.log(`🛑 [WorldRoom] Plus de joueurs - arrêt système Pokémon overworld`);
    this.overworldPokemonManager.stop();
  }
  
  // ✅ NOUVEAU: Nettoyer tous les blocages du joueur qui part
  movementBlockManager.forceUnblockAll(client.sessionId);
  await this.battleHandlers.onPlayerLeave(client.sessionId);
  console.log(`🧹 [WorldRoom] Blocages nettoyés pour ${client.sessionId}`);
  
  // Nettoyer le TeamManager du cache
  if (player && this.teamManagers.has(player.name)) {
    this.teamManagers.delete(player.name);
    console.log(`🗑️ [WorldRoom] TeamManager supprimé du cache pour ${player.name}`);
  }
  
  console.log(`👋 Client ${client.sessionId} déconnecté`);
}

  onDispose() {
    console.log(`💀 === WORLDROOM DISPOSE ===`);
    console.log(`👥 Joueurs restants: ${this.state.players.size}`);
        // ✅ NOUVEAU: Nettoyer l'OverworldPokemonManager
    if (this.overworldPokemonManager) {
      this.overworldPokemonManager.stop();
      console.log(`🧹 [WorldRoom] OverworldPokemonManager nettoyé`);
    }
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log(`⏰ Auto-save timer nettoyé`);
    }
    
    // Sauvegarder les données des joueurs restants
    this.state.players.forEach((player, sessionId) => {
      console.log(`💾 Sauvegarde joueur: ${player.name} à (${player.x}, ${player.y}) dans ${player.currentZone}`);
      // Nettoyer les blocages
      movementBlockManager.forceUnblockAll(sessionId);
    });

    // Nettoyer le TimeWeatherService
    if (this.timeWeatherService) {
      console.log(`🌍 [WorldRoom] Destruction du TimeWeatherService...`);
      this.timeWeatherService.destroy();
      this.timeWeatherService = null;
      // ✅ NOUVEAU: Nettoyer tous les TeamManager du cache
    this.teamManagers.clear();
    console.log(`🧹 [WorldRoom] Cache TeamManager vidé (${this.teamManagers.size} entrées supprimées)`);
    }

      // ✅ NOUVEAU: Nettoyer les StarterHandlers
    if (this.starterHandlers) {
      this.starterHandlers.cleanup();
      console.log(`🧹 StarterHandlers nettoyés`);
    }
      
    if (this.pokedexHandler) {
      this.pokedexHandler.cleanup(); 
      console.log(`🧹 PokedexMessageHandler nettoyé`);
    }
        if (this.followerHandlers) {
      this.followerHandlers.cleanup();
      console.log(`🧹 FollowerHandlers nettoyés`);
    }
    // Nettoyer les EncounterHandlers
    if (this.encounterHandlers) {
      this.encounterHandlers.cleanup();
      console.log(`🧹 EncounterHandlers nettoyés`);
    }
    if (this.battleHandlers) {
      this.battleHandlers.cleanup();
      console.log(`🧹 BattleHandlers nettoyés`);
    }
    // ✅ NOUVEAU: Nettoyer ObjectInteractionHandlers
    if (this.objectInteractionHandlers) {
      this.objectInteractionHandlers.cleanup().catch((error) => {
        console.error(`❌ Erreur nettoyage ObjectInteractionHandlers:`, error);
      });
      console.log(`🧹 ObjectInteractionHandlers nettoyés`);
    }
    console.log(`✅ WorldRoom fermée`);
  }

  // ✅ MÉTHODE DE MOUVEMENT AVEC MovementBlockManager
  private handlePlayerMove(client: Client, data: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // ✅ ÉTAPE 1: Validation des mouvements via MovementBlockManager
    const validation = movementBlockManager.validateMovement(client.sessionId, data);
    if (!validation.allowed) {
 //     console.log(`🚫 [WorldRoom] Mouvement refusé pour ${player.name}: ${validation.reason}`);
      
      // Renvoyer la position serveur pour rollback avec info de blocage
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

    // ✅ ÉTAPE 2: Vérification collision (code existant)
    const collisionManager = this.zoneManager.getCollisionManager(player.currentZone);
    if (collisionManager && collisionManager.isBlocked(data.x, data.y)) {
      // Mouvement interdit par collision : rollback normal
      client.send("forcePlayerPosition", {
        x: player.x,
        y: player.y,
        direction: player.direction,
        currentZone: player.currentZone,
        blocked: false, // Ce n'est pas un blocage système, juste une collision
        collision: true
      });
      return;
    }

    // ✅ ÉTAPE 3: Si tout est OK, appliquer le mouvement (code existant)
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

    // Notification de changement de zone au TimeWeatherService (code existant)
    if (data.currentZone && data.currentZone !== player.currentZone) {
      if (this.timeWeatherService) {
        this.timeWeatherService.updateClientZone(client, data.currentZone);
      }
    }

    // Mise à jour de la zone (code existant)
    if (data.currentZone) {
      player.currentZone = data.currentZone;
    }

    // Log occasionnel pour debug (code existant)
    if (Math.random() < 0.1) {
      console.log(`🌍 ${player.name}: Zone: ${player.currentZone}`);
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

  // === MÉTHODES POUR LES EFFETS D'OBJETS ===

  private async applyItemEffect(player: any, itemId: string, context: string): Promise<{ message?: string }> {
    const itemData = getItemData(itemId);
    
    console.log(`🎯 Application effet ${itemId} pour ${player.name}`);
    
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
    // TODO: Implémenter la logique de soin des Pokémon
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

  // === MÉTHODES UTILITAIRES POUR L'INVENTAIRE ===

  async giveItemToPlayer(playerName: string, itemId: string, quantity: number = 1): Promise<boolean> {
    try {
      await InventoryManager.addItem(playerName, itemId, quantity);
      
      // Trouver le client pour la notification
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
      
      console.log(`✅ Donné ${quantity} ${itemId} à ${playerName}`);
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
        // Trouver le client pour la notification
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
        
        console.log(`✅ Retiré ${quantity} ${itemId} à ${playerName}`);
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

  // === MÉTHODES UTILITAIRES POUR LES SHOPS ===

  async updatePlayerGold(playerName: string, newGold: number): Promise<boolean> {
    try {
      // Trouver le joueur dans le state
      for (const [sessionId, player] of this.state.players.entries()) {
        if (player.name === playerName) {
          player.gold = Math.max(0, newGold); // Pas d'or négatif
          
          // Notifier le client
          const client = this.clients.find(c => c.sessionId === sessionId);
          if (client) {
            client.send("goldUpdate", {
              newGold: player.gold
            });
          }
          
          console.log(`💰 Or mis à jour pour ${playerName}: ${player.gold} gold`);
          return true;
        }
      }
      
      console.warn(`⚠️ Joueur ${playerName} non trouvé pour mise à jour de l'or`);
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
  
  // Méthode pour getFilteredStateForClient
  private getFilteredStateForClient(client: Client): any {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
        console.warn(`⚠️ [WorldRoom] Client ${client.sessionId} sans joueur pour filtered state`);
        return null;
    }

    const playerZone = player.currentZone;
    
    // Correction critique: Utiliser un Object simple au lieu d'un Map
    const filteredPlayersObject: { [key: string]: any } = {};
    
    this.state.players.forEach((otherPlayer, sessionId) => {
        // Toujours inclure le joueur du client en premier
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
        
        // Inclure les autres joueurs de la même zone
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
                // NE PAS inclure l'or des autres joueurs pour la sécurité
            };
        }
    });

    console.log(`📊 [WorldRoom] Filtered state pour ${client.sessionId}: ${Object.keys(filteredPlayersObject).length} joueurs (zone: ${playerZone})`);
    
    return {
        players: filteredPlayersObject  // Object simple, pas Map
    };
  }

  private sendFilteredState() {
    const now = Date.now();
    
    // Throttle : max 1 update toutes les 100ms
    if (now - this.lastStateUpdate < this.stateUpdateInterval) {
      return;
    }
    
    this.lastStateUpdate = now;
    
    // Envoyer un state filtré à chaque client selon sa zone
    this.clients.forEach(client => {
      const filteredState = this.getFilteredStateForClient(client);
      if (filteredState) {
        client.send("filteredState", filteredState);
      }
    });
    
    console.log(`📤 States filtrés envoyés à ${this.clients.length} clients`);
  }

  // === MÉTHODES UTILITAIRES TEMPS/MÉTÉO ===

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
    console.log(`🔍 [WorldRoom] === DEBUG SYSTÈME TEMPS/MÉTÉO ===`);
    
    if (this.timeWeatherService) {
      this.timeWeatherService.debugSyncStatus();
      
      const health = this.timeWeatherService.healthCheck();
      console.log(`🏥 Santé du système: ${health.healthy ? 'OK' : 'PROBLÈME'}`);
      if (!health.healthy) {
        console.log(`❌ Problèmes détectés:`, health.issues);
      }
    } else {
      console.error(`❌ [WorldRoom] TimeWeatherService non initialisé !`);
    }
    
    console.log(`👥 Clients connectés à la room: ${this.clients.length}`);
    console.log(`📊 Total joueurs dans le state: ${this.state.players.size}`);
  }

  private scheduleFilteredStateUpdate() {
    // Programmer une mise à jour dans 50ms (pour regrouper les changements)
    this.clock.setTimeout(() => {
      this.sendFilteredState();
    }, 50);
  }

  // ✅ === MÉTHODES PUBLIQUES POUR LE BLOCAGE DE MOUVEMENT ===

  /**
   * Bloque les mouvements d'un joueur (utilisable depuis n'importe où)
   */
  public blockPlayerMovement(
    playerId: string, 
    reason: BlockReason, 
    duration?: number,
    metadata?: any
  ): boolean {
    return movementBlockManager.blockMovement(playerId, reason, duration, metadata);
  }

  /**
   * Débloque les mouvements d'un joueur
   */
  public unblockPlayerMovement(playerId: string, reason?: BlockReason): boolean {
    return movementBlockManager.unblockMovement(playerId, reason);
  }

  /**
   * Vérifie si un joueur est bloqué
   */
  public isPlayerMovementBlocked(playerId: string): boolean {
    return movementBlockManager.isMovementBlocked(playerId);
  }
  
  // === MÉTHODES D'ACCÈS AUX MANAGERS ===

  getZoneManager(): ZoneManager {
    return this.zoneManager;
  }

  getShopManager() {
    return this.shopManager;
  }

  getQuestManager() {
    return this.zoneManager.getQuestManager();
  }

      // ✅ NOUVEAU: Accès au système d'objets
    getObjectInteractionHandlers(): ObjectInteractionHandlers {
      return this.objectInteractionHandlers;
    }
    
    getObjectInteractionModule(): ObjectInteractionModule {
      return this.objectInteractionModule;
    }
  getInteractionManager() {
    return this.zoneManager.getInteractionManager();
  }

  // Méthode d'accès aux TeamHandlers
  getTeamHandlers(): TeamHandlers {
    return this.teamHandlers;
  }
  
  // ✅ NOUVEAU: Gestionnaire global des TeamManager (cache sécurisé)
  async getTeamManager(playerName: string): Promise<TeamManager> {
    if (!this.teamManagers.has(playerName)) {
      console.log(`🆕 [WorldRoom] Création TeamManager pour ${playerName}`);
      const teamManager = new TeamManager(playerName);
      await teamManager.load();
      this.teamManagers.set(playerName, teamManager);
    } else {
      console.log(`♻️ [WorldRoom] Réutilisation TeamManager pour ${playerName}`);
    }
    return this.teamManagers.get(playerName)!;
  }
  
  getFollowerHandlers(): FollowerHandlers {
    return this.followerHandlers;
  }
  // Méthodes d'accès aux EncounterHandlers
  getEncounterHandlers(): EncounterHandlers {
    return this.encounterHandlers;
  }
  // Méthode d'accès aux BattleHandlers
  getBattleHandlers(): BattleHandlers {
    return this.battleHandlers;
  }
  getMovementHandlers(): MovementHandlers {
  return this.movementHandlers;
}
  
  public getEncounterManager() {
    return this.encounterHandlers.getEncounterManager();
  }

  // Méthode de test public pour les encounters
  public async testEncounter(
    playerId: string, 
    zone: string, 
    zoneId?: string, 
    method: 'grass' | 'fishing' = 'grass'
  ): Promise<any> {
    return await this.encounterHandlers.testEncounter(playerId, zone, zoneId, method);
  }
  // ✅ NOUVEAU: Méthodes utilitaires pour OverworldPokemonManager
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
}
