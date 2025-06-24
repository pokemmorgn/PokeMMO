// server/src/rooms/WorldRoom.ts - VERSION COMPLÈTE AVEC CORRECTIONS PREMIER JOUEUR
import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { ZoneManager } from "../managers/ZoneManager";
import { NpcManager } from "../managers/NPCManager";
import { InventoryManager } from "../managers/InventoryManager"; 
import { getItemData, getItemPocket } from "../utils/ItemDB";
import { TransitionService, TransitionRequest } from "../services/TransitionService";
import { CollisionManager } from "../managers/CollisionManager";
import { TimeWeatherService } from "../services/TimeWeatherService";
import { getServerConfig } from "../config/serverConfig";

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

    // Initialiser le ZoneManager
    this.zoneManager = new ZoneManager(this);
    console.log(`✅ ZoneManager initialisé`);

    this.initializeNpcManagers();
    this.transitionService = new TransitionService(this.npcManagers);
    console.log(`✅ TransitionService initialisé`);

    this.initializeTimeWeatherService();
    
    // Messages handlers
    this.setupMessageHandlers();
    console.log(`✅ Message handlers configurés`);

    console.log(`🚀 WorldRoom prête ! MaxClients: ${this.maxClients}`);
  }
private initializeTimeWeatherService() {
  console.log(`🌍 [WorldRoom] Initialisation TimeWeatherService...`);
  
  this.timeWeatherService = new TimeWeatherService(this.state, this.clock);
  
  // ✅ CALLBACKS AMÉLIORÉS pour broadcaster les changements
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

  // ✅ NOUVEAU: Commandes admin pour tester
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
  // === COMMANDES DE TEST === (ajoute ça avec les autres handlers)

// Forcer l'heure
this.onMessage("setTime", (client, data: { hour: number, minute?: number }) => {
  console.log(`🕐 [TEST] ${client.sessionId} force l'heure: ${data.hour}:${data.minute || 0}`);
  
  if (this.timeWeatherService) {
    this.timeWeatherService.forceTime(data.hour, data.minute || 0);
  }
});

// Forcer la météo
this.onMessage("setWeather", (client, data: { weather: string }) => {
  console.log(`🌦️ [TEST] ${client.sessionId} force la météo: ${data.weather}`);
  
  if (this.timeWeatherService) {
    this.timeWeatherService.forceWeather(data.weather);
  }
});
  console.log(`✅ [WorldRoom] TimeWeatherService initialisé`);
}

  private initializeNpcManagers() {
    const zones = ['beach', 'village', 'villagelab', 'villagehouse1', 'road1', 'lavandia'];
    
    zones.forEach(zoneName => {
      try {
        const mapPath = `../assets/maps/${zoneName}.tmj`;
        const npcManager = new NpcManager(mapPath);
        this.npcManagers.set(zoneName, npcManager);
        console.log(`✅ NPCs chargés pour ${zoneName}: ${npcManager.getAllNpcs().length}`);
      } catch (error) {
        console.warn(`⚠️ Impossible de charger les NPCs pour ${zoneName}:`, error);
      }
    });
  }

  // ✅ MÉTHODE CORRIGÉE AVEC DEBUG ET DÉLAI
  async onPlayerJoinZone(client: Client, zoneName: string) {
    console.log(`📥 === WORLDROOM: PLAYER JOIN ZONE ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`🌍 Zone: ${zoneName}`);

    // ✅ ENVOYER LES NPCS DEPUIS LE FICHIER .TMJ
    const npcManager = this.npcManagers.get(zoneName);
    if (npcManager) {
      const npcs = npcManager.getAllNpcs();
      client.send("npcList", npcs);
      console.log(`📤 ${npcs.length} NPCs envoyés pour ${zoneName}`);
    } else {
      console.warn(`⚠️ [WorldRoom] Aucun NPCManager trouvé pour ${zoneName}`);
    }

    // ✅ CORRECTION CRITIQUE: DÉLAI POUR LES STATUTS DE QUÊTE
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`🎯 [WorldRoom] Programmation mise à jour quest statuses pour ${player.name}`);
      
      // ✅ DÉLAI PLUS LONG pour s'assurer que tout est initialisé
      this.clock.setTimeout(async () => {
        console.log(`⏰ [WorldRoom] Exécution différée des quest statuses pour ${player.name}`);
        await this.updateQuestStatusesFixed(player.name, client);
      }, 2000); // 2 secondes au lieu de 1
    }
  }

  // ✅ NOUVELLE MÉTHODE : Mise à jour quest statuses avec debug
  private async updateQuestStatusesFixed(username: string, client?: Client) {
    try {
      console.log(`📊 [WorldRoom] === UPDATE QUEST STATUSES ===`);
      console.log(`👤 Username: ${username}`);
      
      // ✅ VÉRIFIER QUE LE ZONE MANAGER EST INITIALISÉ
      if (!this.zoneManager) {
        console.error(`❌ [WorldRoom] ZoneManager non initialisé !`);
        return;
      }
      
      // ✅ VÉRIFIER QUE LE QUEST MANAGER EST ACCESSIBLE
      const questManager = this.zoneManager.getQuestManager();
      if (!questManager) {
        console.error(`❌ [WorldRoom] QuestManager non accessible !`);
        return;
      }
      
      console.log(`✅ [WorldRoom] Managers OK, récupération quest statuses...`);
      
      // ✅ APPELER DIRECTEMENT LE QUEST MANAGER POUR DEBUG
      const availableQuests = await questManager.getAvailableQuests(username);
      const activeQuests = await questManager.getActiveQuests(username);
      
      console.log(`📋 [WorldRoom] Quêtes disponibles: ${availableQuests.length}`);
      console.log(`📈 [WorldRoom] Quêtes actives: ${activeQuests.length}`);
      
      // ✅ CALCULER MANUELLEMENT LES STATUTS POUR DEBUG
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
        // ✅ ENVOYER À TOUS LES CLIENTS OU JUSTE CELUI SPÉCIFIÉ
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

  // ✅ MÉTHODES PUBLIQUES - CORRECTEMENT PLACÉES
  public getNpcManager(zoneName: string): NpcManager | undefined {
    const npcManager = this.npcManagers.get(zoneName);
    if (!npcManager) {
      console.warn(`⚠️ [WorldRoom] NpcManager non trouvé pour la zone: ${zoneName}`);
      console.log(`📋 [WorldRoom] Zones disponibles:`, Array.from(this.npcManagers.keys()));
    }
    return npcManager;
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

    // === HANDLERS EXISTANTS ===
    
    // Mouvement du joueur
    this.onMessage("playerMove", (client, data) => {
      this.handlePlayerMove(client, data);
    });

    // ✅ HANDLER MANQUANT - Transition entre zones (ancien système)
    this.onMessage("moveToZone", async (client, data) => {
      console.log(`🌀 === MOVE TO ZONE REQUEST (ANCIEN SYSTÈME) ===`);
      console.log(`👤 Client: ${client.sessionId}`);
      console.log(`📍 Data:`, data);
      
      // Déléguer au ZoneManager
      await this.zoneManager.handleZoneTransition(client, data);
    });

    // ✅ VALIDATION de transition (nouveau système sécurisé)
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

    // ✅ NOUVEAU HANDLER : Répondre aux demandes de zone
    this.onMessage("requestCurrentZone", (client, data) => {
      console.log(`📍 [WorldRoom] === DEMANDE ZONE ACTUELLE ===`);
      console.log(`👤 Client: ${client.sessionId}`);
      console.log(`📊 Data:`, data);
      
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        console.error(`❌ [WorldRoom] Joueur introuvable: ${client.sessionId}`);
        client.send("currentZone", {
          zone: "beach", // Zone par défaut
          x: 52,
          y: 48,
          error: "Joueur non trouvé, zone par défaut",
          sceneKey: data.sceneKey,
          timestamp: Date.now()
        });
        return;
      }
      
      // ✅ ENVOYER LA VÉRITÉ DU SERVEUR
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
    
    // ✅ HANDLER MANQUANT - Notification de changement de zone
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
    this.onMessage("npcInteract", (client, data) => {
      console.log(`💬 === NPC INTERACTION REQUEST ===`);
      this.zoneManager.handleNpcInteraction(client, data.npcId);
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

    // ✅ === NOUVEAUX HANDLERS POUR PREMIER JOUEUR ===

    // ✅ NOUVEAU: Demande de resynchronisation forcée
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

    // ✅ NOUVEAU: Handler pour vérification de présence
    this.onMessage("checkMyPresence", (client) => {
      const exists = this.state.players.has(client.sessionId);
      client.send("presenceCheck", {
        exists: exists,
        sessionId: client.sessionId,
        totalPlayers: this.state.players.size
      });
      
      console.log(`👻 [WorldRoom] Vérification présence ${client.sessionId}: ${exists}`);
    });
    
    // ✅ === NOUVEAUX HANDLERS POUR LES QUÊTES ===

    // Démarrage de quête
    this.onMessage("startQuest", (client, data) => {
      console.log(`🎯 === QUEST START REQUEST ===`);
      this.handleStartQuest(client, data);
    });

    // Récupérer les quêtes actives
    this.onMessage("getActiveQuests", (client) => {
      this.handleGetActiveQuests(client);
    });

    // Récupérer les quêtes disponibles
    this.onMessage("getAvailableQuests", (client) => {
      this.handleGetAvailableQuests(client);
    });

    // Progression de quête
    this.onMessage("questProgress", (client, data) => {
      this.handleQuestProgress(client, data);
    });

    // Debug des quêtes
    this.onMessage("debugQuests", (client) => {
      this.debugQuests(client);
    });

    // ✅ === NOUVEAUX HANDLERS POUR LES SHOPS ===

    // Transaction shop (achat/vente)
    this.onMessage("shopTransaction", (client, data) => {
      console.log(`🛒 [WorldRoom] Transaction shop reçue:`, data);
      this.handleShopTransaction(client, data);
    });

    // Récupérer le catalogue d'un shop
    this.onMessage("getShopCatalog", (client, data) => {
      console.log(`🏪 [WorldRoom] Demande de catalogue shop: ${data.shopId}`);
      this.handleGetShopCatalog(client, data.shopId);
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
// ✅ HANDLERS TEMPS/MÉTÉO AMÉLIORÉS
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
    
    // ✅ S'assurer que le client est dans le service de sync
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
    
    // ✅ S'assurer que le client est dans le service de sync
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

// ✅ NOUVEAU: Handler pour vérifier la synchronisation
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
    
    // ✅ Si pas synchronisé, forcer l'envoi de l'état
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

    console.log(`✅ Tous les handlers configurés (y compris inventaire et quêtes)`);
  }

  // ✅ === NOUVEAUX HANDLERS POUR LES QUÊTES ===

  // ✅ CORRECTION DANS handleStartQuest 
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

      // ✅ UTILISER DIRECTEMENT LE QUEST MANAGER POUR DEBUG
      const questManager = this.zoneManager.getQuestManager();
      if (!questManager) {
        console.error(`❌ [WorldRoom] QuestManager non accessible`);
        client.send("questStartResult", {
          success: false,
          message: "Système de quêtes non disponible"
        });
        return;
      }

      // ✅ DÉMARRER LA QUÊTE DIRECTEMENT
      const quest = await questManager.startQuest(player.name, data.questId);
      
      if (quest) {
        console.log(`✅ [WorldRoom] Quête ${data.questId} démarrée pour ${player.name}`);
        
        const result = {
          success: true,
          quest: quest,
          message: `Quête "${quest.name}" démarrée !`
        };
        
        client.send("questStartResult", result);
        
        // ✅ METTRE À JOUR LES STATUTS IMMÉDIATEMENT
        await this.updateQuestStatusesFixed(player.name);
        
        // ✅ BROADCASTER AUX AUTRES JOUEURS DE LA ZONE
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

      // ✅ FIX: Utiliser directement la méthode de délégation du ZoneManager
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

      // ✅ FIX: Utiliser directement la méthode de délégation du ZoneManager
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

      // ✅ FIX: Utiliser directement la méthode de délégation du ZoneManager
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

  // ✅ MÉTHODE DE DEBUG POUR LES QUÊTES
  private async debugQuests(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    console.log(`🐛 [DEBUG QUETES] Joueur: ${player.name}`);
    
    try {
      // ✅ FIX: Debug avec les méthodes de délégation du ZoneManager
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

  // ✅ === NOUVEAUX HANDLERS POUR LES SHOPS ===

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

      // Déléguer au ZoneManager
      await this.zoneManager.handleShopTransaction(client, data);

    } catch (error) {
      console.error(`❌ Erreur handleShopTransaction:`, error);
      client.send("shopTransactionResult", {
        success: false,
        message: "Erreur lors de la transaction"
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

      const shopManager = this.zoneManager.getShopManager();
      const catalog = shopManager.getShopCatalog(shopId, player.level || 1);

      if (catalog) {
        client.send("shopCatalogResult", {
          success: true,
          shopId: shopId,
          catalog: catalog,
          playerGold: player.gold || 1000
        });
        console.log(`✅ Catalogue shop ${shopId} envoyé à ${client.sessionId}`);
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
      const shopManager = this.zoneManager.getShopManager();
      const wasRestocked = shopManager.restockShop(shopId);

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
  
  // ✅ HELPER POUR BROADCASTER À UNE ZONE
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

  // ✅ === MÉTHODE CORRIGÉE POUR PREMIER JOUEUR ===
  async onJoin(client: Client, options: any = {}) {
    console.log(`👤 === PLAYER JOIN ===`);
    console.log(`🔑 Session: ${client.sessionId}`);
    console.log(`📊 Options:`, options);

    try {
      // Créer le joueur
      const player = new Player();
      
      // Données de base
      player.id = client.sessionId;
      player.name = options.name || `Player_${client.sessionId.substring(0, 6)}`;
      player.x = options.spawnX || 52;
      player.y = options.spawnY || 48;
      
      // Zone de spawn
      player.currentZone = options.spawnZone || "beach";
      console.log(`🌍 Zone de spawn: ${player.currentZone}`);
      // ✅ NOUVEAU: Ajouter le client au TimeWeatherService
if (this.timeWeatherService) {
  this.timeWeatherService.addClient(client);
  console.log(`🌍 [WorldRoom] Client ${client.sessionId} ajouté au TimeWeatherService`);
}
      
      
      // ✅ NOUVELLES PROPRIÉTÉS SHOP
      player.level = options.level || 1;
      player.gold = options.gold || 1000;
      player.experience = options.experience || 0;
      player.title = options.title || "Dresseur Débutant";
      
      // ✅ ÉTAPE 1: Ajouter au state IMMÉDIATEMENT
      this.state.players.set(client.sessionId, player);
      console.log("🧪 onJoin - client.sessionId =", client.sessionId);
      console.log(`✅ Joueur ${player.name} ajouté au state`);
      console.log(`📊 Total joueurs dans le state: ${this.state.players.size}`);

      // ✅ ÉTAPE 2: CONFIRMER IMMÉDIATEMENT au client avec ses données
      client.send("playerSpawned", {
        id: client.sessionId,
        name: player.name,
        x: player.x,
        y: player.y,
        currentZone: player.currentZone,
        level: player.level,
        gold: player.gold,
        // ✅ IMPORTANT: Flag que c'est son propre joueur
        isMyPlayer: true,
        totalPlayersInRoom: this.state.players.size
      });
      
      console.log(`📍 Position: (${player.x}, ${player.y}) dans ${player.currentZone}`);
      console.log(`💰 Level: ${player.level}, Gold: ${player.gold}`);
      console.log(`✅ Joueur ${player.name} créé et confirmé`);

      // ✅ ÉTAPE 3: FORCER une synchronisation du state après un très court délai
      this.clock.setTimeout(() => {
        console.log(`🔄 [WorldRoom] Force sync state pour ${client.sessionId}`);
        
        // Vérifier que le joueur est toujours dans le state
        const playerInState = this.state.players.get(client.sessionId);
        if (playerInState) {
          // Envoyer un state complet et filtré
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
      }, 200); // 200ms de délai

      // === CONFIGURATION INVENTAIRE DE DÉPART ===
      try {
        console.log(`🎒 Configuration inventaire de départ pour ${player.name}`);
        
        // Donne les objets de départ
        await InventoryManager.addItem(player.name, "poke_ball", 5);
        await InventoryManager.addItem(player.name, "potion", 3);
        
        // Ne donne la town_map que si le joueur ne l'a pas déjà
        const hasMap = await InventoryManager.getItemCount(player.name, "town_map");
        if (hasMap === 0) {
          await InventoryManager.addItem(player.name, "town_map", 1);
        }

        // Afficher l'inventaire groupé par poche
        const grouped = await InventoryManager.getAllItemsGroupedByPocket(player.name);
        console.log(`🎒 [INVENTAIRE groupé par poche] ${player.name}:`, grouped);
        
        console.log(`✅ Objets de départ ajoutés pour ${player.name}`);
      } catch (err) {
        console.error(`❌ [INVENTAIRE] Erreur lors de l'ajout d'objets de départ pour ${player.name}:`, err);
      }
      
      // ✅ ÉTAPE 4: Faire entrer le joueur dans sa zone initiale
      await this.zoneManager.onPlayerJoinZone(client, player.currentZone);
      this.scheduleFilteredStateUpdate();

      // ✅ ÉTAPE 5: Setup des quêtes avec délai
      this.clock.setTimeout(async () => {
        await this.updateQuestStatusesFixed(player.name, client);
      }, 2000);
      
      console.log(`🎉 ${player.name} a rejoint le monde !`);

    } catch (error) {
      console.error(`❌ Erreur lors du join:`, error);
      
      // En cas d'erreur, faire quitter le client
      client.leave(1000, "Erreur lors de la connexion");
    }
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`👋 === PLAYER LEAVE ===`);
    console.log(`🔑 Session: ${client.sessionId}`);
    console.log(`✅ Consenti: ${consented}`);

    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`📍 Position finale: (${player.x}, ${player.y}) dans ${player.currentZone}`);
      console.log(`💰 Stats finales: Level ${player.level}, ${player.gold} gold`);
      
      // Supprimer du state
      this.state.players.delete(client.sessionId);
      console.log(`🗑️ Joueur ${player.name} supprimé du state`);
    }
if (this.timeWeatherService) {
  this.timeWeatherService.removeClient(client);
  console.log(`🌍 [WorldRoom] Client ${client.sessionId} retiré du TimeWeatherService`);
}
    console.log(`👋 Client ${client.sessionId} déconnecté`);
  }

  onDispose() {
    console.log(`💀 === WORLDROOM DISPOSE ===`);
    console.log(`👥 Joueurs restants: ${this.state.players.size}`);
    
    // Sauvegarder les données des joueurs restants
    this.state.players.forEach((player, sessionId) => {
      console.log(`💾 Sauvegarde joueur: ${player.name} à (${player.x}, ${player.y}) dans ${player.currentZone}`);
    });
if (this.timeWeatherService) {
    this.timeWeatherService.destroy();
  }
    // ✅ NOUVEAU: Nettoyer le TimeWeatherService
if (this.timeWeatherService) {
  console.log(`🌍 [WorldRoom] Destruction du TimeWeatherService...`);
  this.timeWeatherService.destroy();
  this.timeWeatherService = null;
}
    console.log(`✅ WorldRoom fermée`);
  }

private handlePlayerMove(client: Client, data: any) {
  const player = this.state.players.get(client.sessionId);
  if (!player) return;

  // Collision manager pour la zone actuelle
  const collisionManager = this.zoneManager.getCollisionManager(player.currentZone);

  // Vérification collision AVANT de bouger
  if (collisionManager && collisionManager.isBlocked(data.x, data.y)) {
    // Mouvement interdit : on renvoie la position serveur pour rollback client
    client.send("forcePlayerPosition", {
      x: player.x,
      y: player.y,
      direction: player.direction,
      currentZone: player.currentZone
    });
    return;
  }

  // Si pas de collision, appliquer le mouvement
  player.x = data.x;
  player.y = data.y;
  player.direction = data.direction;

  if (data.currentZone) {
    player.currentZone = data.currentZone;
  }

  // Log occasionnel pour debug
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

  // ✅ === NOUVELLES MÉTHODES UTILITAIRES POUR LES SHOPS ===

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
  
  // ✅ MÉTHODE CORRIGÉE: getFilteredStateForClient
  private getFilteredStateForClient(client: Client): any {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
        console.warn(`⚠️ [WorldRoom] Client ${client.sessionId} sans joueur pour filtered state`);
        return null;
    }

    const playerZone = player.currentZone;
    
    // ✅ CORRECTION CRITIQUE: Utiliser un Object simple au lieu d'un Map
    const filteredPlayersObject: { [key: string]: any } = {};
    
    this.state.players.forEach((otherPlayer, sessionId) => {
        // ✅ Toujours inclure le joueur du client EN PREMIER
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
                gold: otherPlayer.gold
            };
            return;
        }
        
        // ✅ Inclure les autres joueurs de la même zone
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
                // ✅ NE PAS inclure l'or des autres joueurs pour la sécurité
                // gold: otherPlayer.gold  
            };
        }
    });

    console.log(`📊 [WorldRoom] Filtered state pour ${client.sessionId}: ${Object.keys(filteredPlayersObject).length} joueurs (zone: ${playerZone})`);
    
    return {
        players: filteredPlayersObject  // ✅ Object simple, pas Map
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

// ✅ NOUVELLES MÉTHODES UTILITAIRES TEMPS/MÉTÉO

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

  // ✅ === MÉTHODES D'ACCÈS AUX MANAGERS ===

  getZoneManager(): ZoneManager {
    return this.zoneManager;
  }

  getShopManager() {
    return this.zoneManager.getShopManager();
  }

  getQuestManager() {
    return this.zoneManager.getQuestManager();
  }

  getInteractionManager() {
    return this.zoneManager.getInteractionManager();
  }
}
