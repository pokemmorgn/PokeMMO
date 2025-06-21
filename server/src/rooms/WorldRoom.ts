// server/src/rooms/WorldRoom.ts - VERSION COMPLÈTE AVEC SHOP

import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { ZoneManager } from "../managers/ZoneManager";

export class WorldRoom extends Room<PokeWorldState> {
  private zoneManager!: ZoneManager;
  private npcManagers: Map<string, any> = new Map();

  onCreate(options: any) {
    this.setState(new PokeWorldState());
    console.log("🌍 WorldRoom créée avec les options:", options);

    // Initialiser le ZoneManager (qui contient maintenant ShopManager)
    this.zoneManager = new ZoneManager(this);

    this.setupMessageHandlers();
  }

  setupMessageHandlers() {
    // ✅ === MESSAGES BASIQUES DE MOUVEMENT ===
    
    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = data.x;
        player.y = data.y;
        player.direction = data.direction;
        if (data.animation) player.animation = data.animation;
        if (data.isMoving !== undefined) player.isMoving = data.isMoving;
      }
    });

    this.onMessage("zoneTransition", (client, data) => {
      this.zoneManager.handleZoneTransition(client, data);
    });

    this.onMessage("npcInteraction", (client, data) => {
      this.zoneManager.handleNpcInteraction(client, data.npcId);
    });

    // ✅ === MESSAGES DE QUÊTES ===
    
    this.onMessage("startQuest", async (client, data) => {
      console.log(`🎯 [WorldRoom] Démarrage de quête ${data.questId} pour ${client.sessionId}`);
      const result = await this.zoneManager.handleQuestStart(client, data.questId);
      client.send("questStartResult", result);
      
      if (result.success) {
        await this.updateQuestStatusesForPlayer(client);
        this.broadcastQuestUpdate(client, "started", data.questId);
      }
    });

    this.onMessage("getActiveQuests", async (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        console.log(`📋 Récupération des quêtes actives pour ${client.sessionId}`);
        const activeQuests = await this.zoneManager.getActiveQuests(player.name);
        client.send("activeQuestsList", { quests: activeQuests });
        console.log(`📤 Envoi de ${activeQuests.length} quêtes actives`);
      }
    });

    this.onMessage("getAvailableQuests", async (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        const availableQuests = await this.zoneManager.getAvailableQuests(player.name);
        client.send("availableQuestsList", { quests: availableQuests });
      }
    });

    // ✅ === NOUVEAUX MESSAGES SHOP ===

    this.onMessage("shopTransaction", (client, data) => {
      console.log(`🛒 [WorldRoom] Transaction shop reçue:`, data);
      this.zoneManager.handleShopTransaction(client, data);
    });

    this.onMessage("getShopCatalog", (client, data) => {
      console.log(`🏪 [WorldRoom] Demande de catalogue shop: ${data.shopId}`);
      this.handleGetShopCatalog(client, data.shopId);
    });

    this.onMessage("refreshShop", (client, data) => {
      console.log(`🔄 [WorldRoom] Rafraîchissement shop: ${data.shopId}`);
      this.handleRefreshShop(client, data.shopId);
    });

    // ✅ === MESSAGES INVENTAIRE (pour intégration future) ===

    this.onMessage("getInventory", (client) => {
      console.log(`🎒 [WorldRoom] Demande d'inventaire pour ${client.sessionId}`);
      this.handleGetInventory(client);
    });

    this.onMessage("useItem", (client, data) => {
      console.log(`📦 [WorldRoom] Utilisation d'objet:`, data);
      this.handleUseItem(client, data);
    });

    // ✅ === MESSAGES JOUEUR ===

    this.onMessage("updatePlayerInfo", (client, data) => {
      console.log(`👤 [WorldRoom] Mise à jour info joueur:`, data);
      this.handleUpdatePlayerInfo(client, data);
    });

    this.onMessage("ping", (client) => {
      client.send("pong", { serverTime: Date.now() });
    });
  }

  // ✅ === HANDLERS SHOP ===

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

  // ✅ === HANDLERS INVENTAIRE (stubs pour intégration future) ===

  private handleGetInventory(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // TODO: Récupérer l'inventaire depuis la base de données
    const mockInventory = {
      items: [
        { itemId: "potion", quantity: 5, data: { type: "medicine" } },
        { itemId: "poke_ball", quantity: 10, data: { type: "ball" } }
      ],
      medicine: [
        { itemId: "potion", quantity: 5, data: { type: "medicine" } },
        { itemId: "super_potion", quantity: 2, data: { type: "medicine" } }
      ],
      balls: [
        { itemId: "poke_ball", quantity: 10, data: { type: "ball" } },
        { itemId: "great_ball", quantity: 3, data: { type: "ball" } }
      ],
      berries: [] as any[],
      key_items: [
        { itemId: "fishing_line", quantity: 1, data: { type: "key_item" } }
      ],
      tms: [] as any[],
      battle_items: [] as any[],
      valuables: [] as any[],
      held_items: [] as any[]
    };

    client.send("inventoryData", mockInventory);
    console.log(`🎒 Inventaire envoyé à ${player.name}`);
  }

  private handleUseItem(client: Client, data: { itemId: string; context: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // TODO: Implémenter la logique d'utilisation d'objet
    console.log(`📦 ${player.name} utilise ${data.itemId} dans le contexte ${data.context}`);

    // Mock response
    client.send("itemUseResult", {
      success: true,
      message: `Vous avez utilisé ${data.itemId}`,
      effects: []
    });
  }

  // ✅ === HANDLERS JOUEUR ===

  private handleUpdatePlayerInfo(client: Client, data: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Mettre à jour les informations autorisées
    if (data.title !== undefined && typeof data.title === 'string') {
      player.title = data.title;
    }
    
    if (data.experience !== undefined && typeof data.experience === 'number') {
      player.experience = Math.max(0, data.experience);
    }

    console.log(`👤 Informations mises à jour pour ${player.name}`);
    
    // Confirmer la mise à jour
    client.send("playerInfoUpdated", {
      success: true,
      message: "Informations mises à jour"
    });
  }

  // ✅ === MÉTHODES EXISTANTES ===

  async onPlayerJoinZone(client: Client, zoneName: string) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`🌍 ${player.name}: Zone: ${zoneName}`);
    await this.updateQuestStatusesForPlayer(client);
  }

  private async updateQuestStatusesForPlayer(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    try {
      console.log(`📊 [WorldRoom] === UPDATE QUEST STATUSES ===`);
      console.log(`👤 Username: ${player.name}`);
      console.log(`✅ [WorldRoom] Managers OK, récupération quest statuses...`);

      const questStatuses = await this.zoneManager.getQuestStatuses(player.name);
      
      console.log(`📊 [WorldRoom] Total quest statuses: ${questStatuses.length}`, questStatuses);
      client.send("questStatuses", { questStatuses });
      console.log(`📤 [WorldRoom] Quest statuses envoyés à ${client.sessionId}`);
      
    } catch (error) {
      console.error(`❌ Erreur updateQuestStatusesForPlayer:`, error);
    }
  }

  private broadcastQuestUpdate(client: Client, action: string, questId: string) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`📡 [WorldRoom] Broadcasting to zone ${player.currentZone}: questUpdate`);
    this.zoneManager.broadcastToZone(player.currentZone, "questUpdate", {
      player: player.name,
      action: action,
      questId: questId
    });
  }

  async onJoin(client: Client, options: any) {
    console.log(`🎮 Client ${client.sessionId} rejoint avec:`, options);

    const player = new Player();
    player.id = client.sessionId;
    player.name = options.username || `Player_${client.sessionId.slice(0, 6)}`;
    player.x = options.spawnX || 300;
    player.y = options.spawnY || 300;
    player.currentZone = options.spawnZone || 'beach';
    player.map = player.currentZone;
    player.direction = options.direction || 'down';
    player.animation = 'idle';
    player.isMoving = false;
    
    // ✅ NOUVELLES PROPRIÉTÉS INITIALISÉES
    player.level = options.level || 1;
    player.gold = options.gold || 1000;
    player.experience = options.experience || 0;
    player.title = options.title || "Dresseur Débutant";

    this.state.players.set(client.sessionId, player);

    // ✅ METTRE À JOUR LES STATISTIQUES DU SERVEUR
    this.state.onlineCount = this.state.players.size;
    this.state.totalPlayers++;
    this.state.serverTime = Date.now();

    console.log(`🎉 ${player.name} a rejoint le monde ! (Level ${player.level}, ${player.gold} gold)`);
    console.log(`📊 Joueurs en ligne: ${this.state.onlineCount}`);

    // Envoyer les informations initiales au client
    client.send("playerJoined", {
      playerId: player.id,
      playerName: player.name,
      currentZone: player.currentZone,
      position: { x: player.x, y: player.y },
      level: player.level,
      gold: player.gold,
      onlineCount: this.state.onlineCount
    });

    setTimeout(async () => {
      await this.zoneManager.onPlayerJoinZone(client, player.currentZone);
    }, 1000);
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`👋 ${player.name} a quitté le jeu (Level ${player.level}, ${player.gold} gold)`);
      
      // Notification de départ aux autres joueurs de la zone
      this.zoneManager.broadcastToZone(player.currentZone, "playerLeft", {
        playerId: player.id,
        playerName: player.name
      });
      
      this.zoneManager.onPlayerLeaveZone(client, player.currentZone);
      this.state.players.delete(client.sessionId);
      
      // ✅ METTRE À JOUR LES STATISTIQUES DU SERVEUR
      this.state.onlineCount = this.state.players.size;
      this.state.serverTime = Date.now();
      
      console.log(`📊 Joueurs en ligne: ${this.state.onlineCount}`);
    }
  }

  onDispose() {
    console.log("🗑️ WorldRoom supprimée");
    
    // Nettoyage des managers
    if (this.zoneManager) {
      // TODO: Implémenter cleanup des managers si nécessaire
    }
    
    // Nettoyage des NPCs
    this.npcManagers.clear();
  }

  // ✅ === MÉTHODES UTILITAIRES ===

  getNpcManager(zoneName: string) {
    return this.npcManagers.get(zoneName);
  }

  setNpcManager(zoneName: string, npcManager: any) {
    this.npcManagers.set(zoneName, npcManager);
    console.log(`📋 NPC Manager configuré pour ${zoneName}`);
  }

  // ✅ === MÉTHODES D'ACCÈS POUR LES MANAGERS ===

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

  // ✅ === MÉTHODES POUR LES STATISTIQUES ===

  getServerStats() {
    return {
      onlineCount: this.state.onlineCount,
      totalPlayers: this.state.totalPlayers,
      worldTime: this.state.worldTime,
      weather: this.state.weather,
      serverTime: this.state.serverTime,
      eventActive: this.state.eventActive,
      eventName: this.state.eventName
    };
  }

  updateWorldState(updates: {
    worldTime?: string;
    weather?: string;
    eventActive?: boolean;
    eventName?: string;
  }) {
    if (updates.worldTime) this.state.worldTime = updates.worldTime;
    if (updates.weather) this.state.weather = updates.weather;
    if (updates.eventActive !== undefined) this.state.eventActive = updates.eventActive;
    if (updates.eventName !== undefined) this.state.eventName = updates.eventName;
    
    this.state.serverTime = Date.now();
    
    console.log(`🌍 État du monde mis à jour:`, updates);
    
    // Broadcaster les changements à tous les clients
    this.broadcast("worldStateUpdate", {
      worldTime: this.state.worldTime,
      weather: this.state.weather,
      eventActive: this.state.eventActive,
      eventName: this.state.eventName
    });
  }
}
